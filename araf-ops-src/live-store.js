/* Existing backend plus optional, authenticated v2 RPCs on the same database. */
(function (root) {
  'use strict';
  class LiveStore {
    constructor(db, auth, api) { this.db = db; this.auth = auth; this.api = api; this.user = null; this.rows = {}; }
    async verify() {
      const profile = await this.api('ops-business-session');
      if (!profile.ok || !profile.admin?.active || !profile.user?.id) throw new Error('تعذر التحقق من صلاحية الحساب');
      this.user = { id: profile.admin.employee_id || profile.user.id, auth_user_id: profile.user.id,
        name: profile.admin.display_name, email: profile.user.email, role: profile.admin.role };
      return this.user;
    }
    requireUser(admin = false) {
      if (!this.user) throw new Error('سجّل الدخول أولًا');
      if (admin && !['admin', 'manager'].includes(this.user.role)) throw new Error('هذا الإجراء متاح للإدارة');
    }
    async all(table, filters = {}) {
      this.requireUser(); const rows = [], size = 500;
      for (let start = 0; ; start += size) {
        let q = this.db.from(table).select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
        for (const [key, val] of Object.entries(filters)) q = q.eq(key, val);
        const { data, error } = await q.range(start, start + size - 1);
        if (error) throw new Error(error.message || 'تعذر تحميل البيانات');
        if (!Array.isArray(data)) throw new Error('استجابة بيانات غير صالحة');
        rows.push(...data); if (data.length < size) break;
      }
      return rows;
    }
    async requests() {
      const filter = ['admin', 'manager'].includes(this.user.role) ? {} : { assigned_to: this.user.id };
      return this.all('service_requests', filter);
    }
    async audit(id, action, description) {
      const { error } = await this.db.from('request_activity_log').insert({ request_id: id, action,
        title: description, description, created_by: this.user.id, created_by_name: this.user.name, created_at: new Date().toISOString() });
      return error ? 'حُفظ التغيير، لكن تعذر تسجيل النشاط' : '';
    }
    async patchRequest(id, changes, action = 'status_change', description = 'تحديث الطلب', options = {}) {
      this.requireUser(); const row = this.rows[id];
      if (!row) throw new Error('حدّث القائمة ثم أعد المحاولة');
      if (!['admin', 'manager'].includes(this.user.role) && row.assigned_to !== this.user.id) throw new Error('الطلب غير مسند إليك');
      if (['assigned_to','assigned_by','assigned_at'].some(key => Object.hasOwn(changes, key))) this.requireUser(true);
      const allowed = new Set(['status','priority','price','payment_status','assigned_to','assigned_by','assigned_at',
        'service_type','service_name','service_category','contacted_at','closed_at','closed_by','closing_note','notes','case_current_stage','case_last_session_summary',
        'case_sessions_count','case_next_action','case_next_session_at','case_followup_updated_at','case_followup_updated_by','case_followup_updated_by_name']);
      for (const key of Object.keys(changes)) if (!allowed.has(key)) throw new Error('حقل غير مسموح');
      let q = this.db.from('service_requests').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
      // Compare the version read by the editor. Never overwrite a concurrent update silently.
      q = row.updated_at ? q.eq('updated_at', row.updated_at) : q.is('updated_at', null);
      const { data, error } = await q.select('*').maybeSingle();
      if (error) throw new Error(error.message || 'تعذر حفظ التغيير');
      if (!data) { const conflict = new Error('تغيّر الطلب أو لم تُمنح صلاحية الحفظ. حدّث القائمة ثم أعد المحاولة.'); conflict.code = 'REQUEST_CONFLICT'; throw conflict; }
      this.rows[id] = data;
      const audit = this.audit(id, action, description).catch(() => 'حُفظ التغيير، لكن تعذر تسجيل النشاط');
      return options.deferAudit ? { data, audit } : { data, warning: await audit };
    }
    async changeService(id, service, reason) {
      this.requireUser();
      const row = this.rows[id];
      if (!row) throw new Error('حدّث الطلب ثم أعد المحاولة');
      if (!service || typeof service.type !== 'string' || !service.type.trim() || service.type.length>120 ||
        typeof service.name !== 'string' || !service.name.trim() || service.name.length>160 ||
        !['الخدمات المباشرة','التوكيل في القضايا'].includes(service.category) || !reason?.trim() || reason.length>1000)
        throw new Error('اختر نوع الطلب واكتب سبب التغيير');
      return this.patchRequest(id, {service_type:service.type,service_name:service.name.trim(),service_category:service.category},
        'status_change', 'تغيير نوع الطلب من «'+(row.service_name || row.service_type || '')+'» إلى «'+service.name.trim()+'» — '+reason.trim(), {deferAudit:true});
    }
    async closeRequest(id, status, note) {
      this.requireUser();
      if (!['done','closed','cancelled'].includes(status) || !note.trim()) throw new Error('اختر نتيجة الإغلاق واكتب ملاحظة');
      const original = this.rows[id];
      if (!original) throw new Error('حدّث القائمة ثم أعد المحاولة');
      const save = () => this.patchRequest(id, {status, closing_note: note.trim(),
        closed_at: new Date().toISOString(), closed_by: this.user.id}, 'close', 'إغلاق الطلب', {deferAudit:true});
      try { return await save(); }
      catch (error) {
        if (error.code !== 'REQUEST_CONFLICT') throw error;
        const {data:latest,error:readError} = await this.db.from('service_requests').select('*').eq('id',id).maybeSingle();
        if (readError || !latest) throw error;
        // Keep notes and other unrelated updates, but never close over a change
        // to the outcome, assigned employee, price, payment or closure itself.
        const protectedFields = ['status','assigned_to','assigned_by','assigned_at','price','payment_status','closed_at','closed_by','closing_note'];
        if (protectedFields.some(key => (latest[key] ?? null) !== (original[key] ?? null))) {
          throw new Error('تغيّرت حالة الطلب أو قيمته أو إسناده؛ حدّث الطلب وراجعه قبل الإقفال');
        }
        this.rows[id] = latest;
        return save();
      }
    }
    async assignRequest(id, employeeId) {
      this.requireUser(true);
      const original = this.rows[id];
      if (!original || !employeeId) throw new Error('تعذر العثور على الطلب أو الموظف؛ حدّث القائمة');
      const save = () => this.patchRequest(id, {
        assigned_to: employeeId, assigned_by: this.user.id, assigned_at: new Date().toISOString(),
        ...(['new','pending'].includes(this.rows[id].status) ? { status: 'assigned' } : {})
      }, 'assign', 'إسناد الطلب', { deferAudit: true });
      try { return await save(); }
      catch (error) {
        if (error.code !== 'REQUEST_CONFLICT') throw error;
        const { data: latest, error: readError } = await this.db.from('service_requests').select('*').eq('id', id).maybeSingle();
        if (readError || !latest) throw error;
        // Retry once only when unrelated fields changed. A competing assignment
        // or status change must be reviewed, never silently overwritten.
        if (['assigned_to','assigned_by','assigned_at','status'].some(key => (latest[key] ?? null) !== (original[key] ?? null))) {
          throw new Error('تغيّر إسناد الطلب أو حالته لدى مستخدم آخر. حدّث القائمة وراجع الطلب قبل الإسناد.');
        }
        this.rows[id] = latest;
        return save();
      }
    }
    async addNote(id, text) {
      if (!text.trim()) throw new Error('اكتب الملاحظة');
      const row = this.rows[id];
      return this.patchRequest(id, { notes: [...(Array.isArray(row?.notes) ? row.notes : []),
        { by: this.user.name, by_id: this.user.id, at: new Date().toISOString(), text: text.trim() }] }, 'note', 'إضافة ملاحظة');
    }
    async insert(table, payload, admin = false) {
      this.requireUser(admin);
      if (!['service_requests','employees','support_tickets','request_delete_requests','ops_reset_requests'].includes(table)) throw new Error('جدول غير مسموح');
      const { data, error } = await this.db.from(table).insert(payload).select('*').single();
      if (error || !data) throw new Error(error?.message || 'لم يؤكد الخادم الحفظ');
      return data;
    }
    async convertTicket(id, service, name, price, payment) {
      this.requireUser();
      if (!Number.isFinite(price) || price < 0) throw new Error('السعر غير صالح');
      const { data, error } = await this.db.rpc('convert_support_ticket_to_request', {
        p_ticket_id: id, p_service_type: service, p_service_name: name, p_price: price,
        p_payment_status: payment, p_converted_by: this.user.id, p_converted_by_name: this.user.name });
      if (error) throw new Error(error.message || 'تعذر التحويل'); return data;
    }
    async approveDelete(request) {
      this.requireUser(true);
      if (!request || request.status !== 'pending' || request.requested_by === this.user.id) throw new Error('يلزم اعتماد طلب الحذف من مستخدم آخر');
      const { data, error } = await this.db.rpc('approve_and_delete_service_request', {
        p_request_id: request.request_id, p_approved_by: this.user.id, p_approved_by_name: this.user.name });
      if (error) throw new Error(error.message || 'تعذر اعتماد الحذف'); return data;
    }
    async v2Rpc(name, payload = {}) {
      this.requireUser();
      const { data, error } = await this.auth.rpc(name, payload);
      if (error) {
        if (['PGRST202','42P01','42883'].includes(error.code)) throw new Error('هذه الميزة بانتظار تفعيل إضافة الإصدار الجديد في قاعدة البيانات');
        throw new Error(error.message || 'تعذر إتمام الإجراء');
      }
      if (data == null) throw new Error('لم يؤكد الخادم الإجراء');
      return data;
    }
    async messages() {
      const rows = []; let before = null;
      for (;;) {
        const page = await this.v2Rpc('ops_v2_list_messages', { p_before: before });
        if (!Array.isArray(page)) throw new Error('استجابة رسائل غير صالحة');
        rows.push(...page); if (page.length < 200) return rows;
        before = page[page.length - 1].id;
      }
    }
    sendMessage(to, subject, body, urgent, nonce) {
      if (!to || to === this.user.id) throw new Error('اختر موظفًا آخر');
      if (!body.trim() || body.trim().length > 4000 || subject.trim().length > 120) throw new Error('اكتب رسالة حتى ٤٠٠٠ حرف وموضوعًا حتى ١٢٠ حرفًا');
      return this.v2Rpc('ops_v2_send_message', { p_recipient: to, p_subject: subject.trim() || 'رسالة', p_body: body.trim(), p_urgent: !!urgent, p_nonce: nonce });
    }
    async deleteMessage(id) {
      this.requireUser();
      const result = await this.api('ops-delete-message', {id:String(id)});
      if (!result?.ok || String(result.id) !== String(id)) throw new Error('لم يؤكد الخادم حذف الرسالة');
      return result;
    }
    readMessage(id) { return this.v2Rpc('ops_v2_read_message', { p_id: id }); }
    deleteEntity(entity, confirmation) {
      this.requireUser(true);
      if (!entity?.id || !entity.code || confirmation.trim() !== entity.code) throw new Error('اكتب رمز المنشأة كما يظهر لتأكيد الحذف');
      return this.v2Rpc('ops_v2_delete_entity', { p_entity_id: entity.id, p_confirm_code: confirmation.trim(), p_expected_updated_at: entity.updated_at || null });
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { LiveStore };
  else root.ArafLiveStore = LiveStore;
})(typeof window !== 'undefined' ? window : globalThis);

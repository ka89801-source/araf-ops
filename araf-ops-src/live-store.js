/* Existing Supabase tables and existing operations API. No migrations or clone. */
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
      const filter = this.user.role === 'admin' ? {} : { assigned_to: this.user.id };
      return this.all('service_requests', filter);
    }
    async audit(id, action, description) {
      const { error } = await this.db.from('request_activity_log').insert({ request_id: id, action,
        title: description, description, created_by: this.user.id, created_by_name: this.user.name, created_at: new Date().toISOString() });
      return error ? 'حُفظ التغيير، لكن تعذر تسجيل النشاط' : '';
    }
    async patchRequest(id, changes, action = 'status_change', description = 'تحديث الطلب') {
      this.requireUser(); const row = this.rows[id];
      if (!row) throw new Error('حدّث القائمة ثم أعد المحاولة');
      if (this.user.role !== 'admin' && row.assigned_to !== this.user.id) throw new Error('الطلب غير مسند إليك');
      const allowed = new Set(['status','priority','price','payment_status','assigned_to','assigned_by','assigned_at',
        'contacted_at','closed_at','closed_by','closing_note','notes','case_current_stage','case_last_session_summary',
        'case_sessions_count','case_next_action','case_next_session_at','case_followup_updated_at','case_followup_updated_by','case_followup_updated_by_name']);
      for (const key of Object.keys(changes)) if (!allowed.has(key)) throw new Error('حقل غير مسموح');
      let q = this.db.from('service_requests').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id);
      // Compare the version read by the editor. Never overwrite a concurrent update silently.
      q = row.updated_at ? q.eq('updated_at', row.updated_at) : q.is('updated_at', null);
      const { data, error } = await q.select('*').maybeSingle();
      if (error) throw new Error(error.message || 'تعذر حفظ التغيير');
      if (!data) throw new Error('تغيّر الطلب أو لم تُمنح صلاحية الحفظ. حدّث القائمة ثم أعد المحاولة.');
      this.rows[id] = data;
      return { data, warning: await this.audit(id, action, description).catch(() => 'حُفظ التغيير، لكن تعذر تسجيل النشاط') };
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
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { LiveStore };
  else root.ArafLiveStore = LiveStore;
})(typeof window !== 'undefined' ? window : globalThis);

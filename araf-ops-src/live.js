/* Shared backend bootstrap: never show demo data or report a failed load as zero. */
const LIVE = { ready: false, pending: new Set(), errors: {}, deletes: [], refreshPromise: null, requestVersion: 0, deleteVersion: 0, businessVersion: 0, messageVersion: 0, messagesPromise: null };
const liveDate = (v) => v && Number.isFinite(new Date(v).getTime()) ? new Date(v) : null;
const replaceRows = (target, rows) => target.splice(0, target.length, ...rows);
const val = (id) => $('#' + id)?.value?.trim() || '';
async function liveApi(route, body) {
  const { data, error } = await window.opsAuth.auth.getSession();
  if (error || !data.session?.access_token) { const e = new Error('انتهت الجلسة. سجّل الدخول مجددًا'); e.status = 401; throw e; }
  const response = await fetch('api/ops/' + route, { method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && LIVE.ready) { LIVE.ready=false; window.ARAF_READY=false; location.replace('login.html'); } const e = new Error(payload.error || 'تعذر الاتصال بالمنصة الأصلية'); e.status = response.status; throw e; }
  return payload;
}
function mapEmployee(row) {
  const name = row.full_name || row.name || row.email || 'عضو';
  return { ...row, name, short: name.split(' ')[0], ini: name[0], c: '#1B3A4B',
    roleKey: row.role || 'employee', role: row.role === 'admin' ? 'مدير' : 'موظف',
    cap: 12, skills: [], last: liveDate(row.last_login_at), joined: liveDate(row.created_at) };
}
function mapRequest(row) {
  let service = row.service_type === 'أعراف تحقّق' ? row.service_name : row.service_type;
  service = SERVICES.find(s => s.name === service)?.key || service || 'general';
  const cases = ['case_representation','التوكيل في القضايا'].includes(row.service_type) ||
    ['التوكيل في القضايا','case_representation'].includes(row.service_category) || ['cases','custom_case'].includes(row.source);
  return { ...row, id: String(row.id), customer: row.customer_name || '', phone: row.customer_phone || '',
    service, service_name: row.service_name || SV(service).name || 'خدمة', kind: cases ? 'cases' : 'direct',
    status: Object.hasOwn(ST, row.status) ? row.status : 'unknown',
    payment: Object.hasOwn(PAY, row.payment_status) ? row.payment_status : 'unknown',
    priority: Object.hasOwn(PRI, row.priority) ? row.priority : 'normal',
    source: row.source || 'direct_services', price: Number(row.price) || 0, details: row.details || '',
    org: /^(شركة|مؤسسة|مجموعة|جمعية|مصنع)/.test(row.customer_name || ''),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    notes: (Array.isArray(row.notes) ? row.notes : []).map(n => ({ ...n, by: n.by_id || n.by, name: n.by, at: liveDate(n.at) })),
    created_at: liveDate(row.created_at), updated_at: liveDate(row.updated_at || row.created_at),
    assigned_at: liveDate(row.assigned_at), contacted_at: liveDate(row.contacted_at), closed_at: liveDate(row.closed_at),
    close_note: row.closing_note || '', stage: row.case_current_stage || '', last_session: row.case_last_session_summary || '',
    next_action: row.case_next_action || '', sessions: Number(row.case_sessions_count) || 0,
    next_session: liveDate(row.case_next_session_at), followup_by: row.case_followup_updated_by,
    followup_at: liveDate(row.case_followup_updated_at) };
}
BIZ_ST.unknown = {l:'حالة غير معروفة',c:'#A3ADB3',b:'b-ghost'};
ST.unknown = {l:'حالة غير معروفة',c:'#A3ADB3',b:'b-ghost'};
PAY.unknown = {l:'غير محدد',b:'b-ghost'};
SUB_ST.unknown = {l:'غير محدد',b:'b-ghost'};
PLANS.unknown = {key:'unknown',name:'باقة غير محددة',price:0,c:'#A3ADB3',quota:{}};
const knownPlan = (key) => Object.hasOwn(PLANS, key) ? key : 'unknown';
function applyBusiness(snapshot) {
  const usage = {};
  for (const e of snapshot.entities || []) {
    usage[e.id] = {};
    for (const row of snapshot.usage || []) {
      if (row.entity_id !== e.id || row.reversed_at) continue;
      if (e.current_cycle_start && row.cycle_start && String(row.cycle_start).slice(0,10) !== String(e.current_cycle_start).slice(0,10)) continue;
      if (e.current_cycle_end && row.cycle_end && String(row.cycle_end).slice(0,10) !== String(e.current_cycle_end).slice(0,10)) continue;
      usage[e.id][row.service_key] = (usage[e.id][row.service_key] || 0) + Number(row.units || 0);
    }
  }
  replaceRows(ENTITIES, (snapshot.entities || []).map(e => ({ ...e, name:e.name || '', plan:knownPlan(e.plan_key),
    sub:Object.hasOwn(SUB_ST,e.subscription_status) ? e.subscription_status : 'unknown', manager:e.manager_id || e.assigned_to,
    contact:e.contact_name || '', phone:e.contact_phone || '', type:e.entity_type || '', city:e.city || '', cr:e.commercial_registration || '',
    start:liveDate(e.current_cycle_start || e.subscription_start), cycle_end:liveDate(e.current_cycle_end), usage:usage[e.id] || {} })));
  replaceRows(BIZ_REQUESTS, (snapshot.requests || []).map(b => ({ ...b, entity:b.entity_id,
    service:Object.hasOwn(BIZ_SERVICES,b.service_key)?b.service_key:'general', subject:b.subject || b.service_name_snapshot || 'طلب',
    priority:Object.hasOwn(PRI,b.priority) ? b.priority : 'normal',
    status:Object.hasOwn(BIZ_ST,b.status) ? b.status : 'unknown',
    no:b.request_number || b.id, units:Number(b.quota_units || 1), counted:!!b.quota_counted,
    billing:b.billing_status || 'included', client_note:b.client_visible_note || '', internal_note:b.internal_note || '', details:b.details || '',
    created_at:liveDate(b.created_at),updated_at:liveDate(b.updated_at || b.created_at) })));
}
function rebuildMetrics() {
  const days = last7(); replaceRows(DAY_LABELS, days.map(wd));
  replaceRows(TREND_IN, days.map(d => REQUESTS.filter(r => r.created_at && sameDay(r.created_at,d)).length));
  replaceRows(TREND_CLOSED, days.map(d => REQUESTS.filter(r => r.closed_at && sameDay(r.closed_at,d)).length));
  replaceRows(MONTHS, MONTH_AR.slice(0, TODAY.getMonth()+1));
  replaceRows(REV_MONTH, MONTHS.map((_,m) => REQUESTS.filter(r => r.status === 'done' && r.closed_at?.getFullYear() === TODAY.getFullYear() && r.closed_at.getMonth() === m).reduce((n,r)=>n+r.price,0)/1000));
  const read = new Set(NOTIFS.filter(n=>!n.unread).map(n=>n.id));
  replaceRows(NOTIFS, REQUESTS.filter(r=>isOpen(r) && (!r.assigned_to || isLate(r))).map(r=>({id:'req:'+r.id,g:'urgent',ic:'file',t:esc(r.customer)+' — '+esc(svName(r)),at:r.created_at,unread:!read.has('req:'+r.id),acts:[['فتح الطلب','req:'+r.id]]})));
}
LIVE.refresh = async function () {
  if (LIVE.refreshPromise) return LIVE.refreshPromise;
  LIVE.refreshPromise = (async () => {
    const jobs = {
      team: async()=>{ const rows=await LIVE.store.all('employees'); replaceRows(TEAM, rows.map(mapEmployee)); if(!TEAM.some(t=>t.id===ME)) TEAM.push(mapEmployee({...LIVE.store.user,full_name:LIVE.store.user.name,status:'active'})); },
      requests: async()=>{ const version=LIVE.requestVersion; const rows=await LIVE.store.requests(); if(version!==LIVE.requestVersion || [...LIVE.pending].some(k=>k.startsWith('request:')))return; LIVE.store.rows=Object.fromEntries(rows.map(r=>[String(r.id),r])); replaceRows(REQUESTS,rows.map(mapRequest)); },
      support: async()=>replaceRows(TICKETS,(await LIVE.store.all('support_tickets')).map(t=>({...t,customer:t.name || t.customer_name || '',phone:t.phone || t.customer_phone || '',body:t.problem || t.message || t.details || '',subject:t.subject || 'رسالة دعم',channel:t.channel || 'نموذج الموقع',at:liveDate(t.created_at),status:t.status === 'new' ? 'open' : Object.hasOwn(TK_ST,t.status) ? t.status : 'open'}))),
      activity: async()=>replaceRows(LOG,(await LIVE.store.all('request_activity_log')).map(l=>({...l,at:liveDate(l.created_at),by:l.created_by,text:l.description || l.title || '',type:({assign:'assigned',close:'closed',status_change:'status',case_followup:'case'})[l.action] || l.action}))),
      deletes: async()=>{ const version=LIVE.deleteVersion,rows=await LIVE.store.all('request_delete_requests',{status:'pending'});if(version===LIVE.deleteVersion)LIVE.deletes=rows; },
      business: async()=>{const version=LIVE.businessVersion,snapshot=await liveApi('ops-business-snapshot');if(version===LIVE.businessVersion)applyBusiness(snapshot);},
      messages: async()=>{await LIVE.refreshMessages();if(LIVE.errors.messages)throw new Error(LIVE.errors.messages);},
      activation: async()=>{ const version=LIVE.businessVersion,data=await liveApi('ops-business-activation-requests');if(version!==LIVE.businessVersion)return; replaceRows(ACTIVATIONS,(data.requests || []).map(a=>({...a,name:a.entity_name || '',type:a.entity_type || '',contact:a.contact_name || a.contact_details || '',phone:a.contact_phone || '',plan:knownPlan(a.requested_plan),at:liveDate(a.created_at),note:a.metadata?.closed_note || a.metadata?.contacted_note || '',cr:a.metadata?.commercial_registration || '',city:a.metadata?.city || '',email:a.metadata?.email || ''}))); }
    };
    await Promise.allSettled(Object.entries(jobs).map(async([key,fn])=>{ try {await fn();delete LIVE.errors[key];}catch(e){LIVE.errors[key]=e.message;} }));
    rebuildMetrics();
    if(LIVE.ready){ livePaintStatus(); if(!$('#modal')?.classList.contains('show') && !$('#drawer')?.classList.contains('show') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) rerender(); }
  })().finally(()=>LIVE.refreshPromise=null);
  return LIVE.refreshPromise;
};
LIVE.refreshMessages=async function(){
  if(LIVE.messagesPromise)return LIVE.messagesPromise;
  LIVE.messagesPromise=(async()=>{
    const version=LIVE.messageVersion;
    try{
      const rows=await LIVE.store.messages();
      if(version===LIVE.messageVersion)replaceRows(LETTERS,rows.map(mapLetter));
      delete LIVE.errors.messages;
    }catch(e){LIVE.errors.messages=e.message;}
    if(LIVE.ready){refreshLettersQuiet();livePaintStatus();}
  })().finally(()=>LIVE.messagesPromise=null);
  return LIVE.messagesPromise;
};
function livePaintStatus() {
  const banner=$('#liveStatus'); if(!banner) return;
  const names={team:'الفريق',requests:'الطلبات',support:'الدعم',activity:'النشاط',deletes:'طلبات الحذف',business:'المنشآت',activation:'التفعيل',messages:'رسائل الفريق'};
  const failed=Object.keys(LIVE.errors);
  banner.innerHTML=`<span>${failed.length ? 'تعذر تحديث: '+failed.map(k=>names[k]).join('، ')+' — آخر بيانات متاحة قد تكون قديمة' : 'متصل ببيانات المنصة الحالية'}</span><button class="btn btn-sm btn-s" data-a="refreshLive">تحديث</button>`;
}
async function bootLive() {
  try {
    if(!window.sb || !window.opsAuth) throw new Error('تعذر تحميل اتصال Supabase');
    LIVE.store=new window.ArafLiveStore(window.sb,window.opsAuth,liveApi);
    const user=await LIVE.store.verify(); ME=user.id;
    await LIVE.refresh();
    if(LIVE.errors.requests || LIVE.errors.team) throw new Error('تعذر تحميل الطلبات أو الفريق: '+(LIVE.errors.requests || LIVE.errors.team));
    shell(); try {setTheme(localStorage.getItem('araf-ops-theme') || 'light');}catch(_){setTheme('light');}
    $('#scroll').insertAdjacentHTML('afterbegin','<div id="liveStatus" class="row gap12" style="padding:10px 24px;font-size:12px"></div>');
    LIVE.ready=true; window.ARAF_READY=true; parseHash(); render(false); livePaintStatus();
    setInterval(()=>{if(!document.hidden)LIVE.refreshMessages();},15000);
    setInterval(()=>{ if(!document.hidden && !LIVE.pending.size && !$('#modal')?.classList.contains('show') && !$('#drawer')?.classList.contains('show')) LIVE.refresh(); },30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && !LIVE.pending.size && !$('#modal')?.classList.contains('show') && !$('#drawer')?.classList.contains('show'))LIVE.refresh();});
    window.opsAuth.auth.onAuthStateChange((event)=>{ if(event==='SIGNED_OUT'){LIVE.ready=false;window.ARAF_READY=false;location.replace('login.html');} });
  } catch(e) {
    if(e.status===401 || e.status===403){location.replace('login.html');return;}
    document.body.innerHTML=`<main class="welcome-screen" dir="rtl" aria-labelledby="welcomeTitle"><div class="welcome-content">
      <img class="welcome-logo" src="${EMBLEM}" width="72" height="72" alt="أعراف">
      <h1 id="welcomeTitle">تعذر تجهيز المنصة</h1><p class="welcome-status" role="alert">${esc(e.message)}</p>
      <div class="welcome-actions"><button class="btn btn-p" onclick="location.reload()">إعادة المحاولة</button><a class="btn btn-s" href="login.html">تسجيل الدخول</a></div>
    </div></main>`;
  }
}
A.refreshLive=()=>LIVE.refresh();

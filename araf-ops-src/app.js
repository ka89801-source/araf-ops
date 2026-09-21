/* ==========================================================
   الهيكل والراوتر ولوحة العمليات
   ========================================================== */
const S = {
  route: 'home', kind: 'direct', view: 'list', saved: 'all', q: '', f: {}, sort: 'new',
  entId: 'ENT-001', bizTab: 'requests', bizF: 'all', empId: null, logF: 'all', tkF: 'open',
  scope: 'office', attAll: false, dismissed: new Set(), visited: new Set(), resetPending: true,
};
const A = {};

const NAV = [
  { r: 'home', l: 'اليوم', ic: 'home' },
  { r: 'requests', l: 'الخدمات المباشرة', ic: 'file', cnt: () => openList('direct').length },
  { r: 'cases', l: 'طلبات التوكيل', ic: 'gavel', cnt: () => openList('cases').length },
  { r: 'flow', l: 'خريطة التدفق', ic: 'droplet' },
  { r: 'business', l: 'المنشآت', ic: 'building', cnt: () => ({ n: BIZ_REQUESTS.filter((b) => !['completed', 'cancelled'].includes(b.status)).length + ACTIVATIONS.filter((a) => a.status === 'new').length, hot: true }) },
  '-',
  { r: 'team', l: 'الفريق', ic: 'team' },
  { r: 'activity', l: 'سجل النشاط', ic: 'activity' },
  { r: 'support', l: 'الدعم الفني', ic: 'msg', cnt: () => TICKETS.filter((t) => t.status === 'open').length },
];
const TITLES = { home: 'اليوم', flow: 'خريطة التدفق', requests: 'الخدمات المباشرة', cases: 'طلبات التوكيل', business: 'المنشآت', team: 'الفريق', activity: 'سجل النشاط', support: 'الدعم الفني' };

/* ---------- مشتقات ---------- */
const isOpen = (r) => OPEN_ST.includes(r.status);
const hoursSince = (d) => (nowDate() - d) / 36e5;
const reqList = (kind) => REQUESTS.filter((r) => r.kind === kind);
const openList = (kind) => reqList(kind).filter(isOpen);
const empOpen = (id) => REQUESTS.filter((r) => r.assigned_to === id && isOpen(r));
const empClosed = (id) => REQUESTS.filter((r) => r.closed_by === id);
const load = (id) => { const u = U(id); return Math.round((empOpen(id).length / u.cap) * 100); };
function sla(r) {
  if (!isOpen(r)) return null;
  const mk = (k, from, win, l, tag, act) => ({ k, l, tag, act, win, h: hoursSince(from), over: hoursSince(from) > win, due: new Date(+from + win * 36e5) });
  if (!r.assigned_to) return mk('assign', r.created_at, SLA.assign, `إسناده لموظف خلال ${SLA.assign} ساعات من وروده`, 'إسناد', 'إسناد');
  if (!r.contacted_at) return mk('contact', r.assigned_at || r.created_at, SLA.contact, `التواصل مع العميل خلال ${SLA.contact} ساعة من إسناده`, 'تواصل', 'فتح');
  if (r.status === 'waiting') return mk('remind', r.updated_at, SLA.remind, `تذكير العميل بالمستندات كل ${SLA.remind} ساعة`, 'متابعة', 'تذكير');
  return mk('move', r.updated_at, SLA.close, `تحريك الطلب خلال ${SLA.close} ساعة من آخر تحديث`, 'تحديث', 'فتح');
}
const slaShort = (s) => ({ 'إسناد': 'إسناد الطلب', 'تواصل': 'التواصل مع العميل', 'متابعة': 'تذكير العميل', 'تحديث': 'تحديث الطلب' }[s.tag] || s.l);
const hHuman = (h) => {
  const d = Math.floor(h / 24), r = Math.round(h % 24);
  const dd = plural(d, 'يوم واحد', 'يومين', 'أيام', 'يومًا'), hh = plural(r, 'ساعة واحدة', 'ساعتين', 'ساعات', 'ساعة');
  if (d) return r ? `${dd} و${hh}` : dd;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} دقيقة`;
  return plural(Math.round(h), 'ساعة واحدة', 'ساعتين', 'ساعات', 'ساعة');
};
const isLate = (r) => { const s = sla(r); return !!(s && s.over); };
const payWaiting = (r) => ['pending', 'manual_pending', 'unpaid'].includes(r.payment) && isOpen(r);
const earned = (kind) => reqList(kind).filter((r) => r.status === 'done').reduce((a, b) => a + (+b.price || 0), 0);
const REQ = (id) => REQUESTS.find((r) => r.id === id);
const ENT = (id) => ENTITIES.find((e) => e.id === id);
const custAv = (r, cls = '') => orgAv(r.customer, cls, !!r.org);
const payBadge = (r) => `<span class="badge ${PAY[r.payment].b}">${PAY[r.payment].l}</span>`;
const svName = (r) => SV(r.service).name;

/* ---------- الهيكل ---------- */
function shell() {
  const unread = NOTIFS.filter((n) => n.unread).length;
  document.body.innerHTML = `
  <div class="app" id="app">
    <aside class="side">
      <div class="brand"><span class="emb brand-emb" role="img" aria-label="شعار أعراف"></span><div class="brand-txt"><b>أعراف</b><small>مركز العمليات</small></div></div>
      <nav class="nav-group" id="nav"></nav>
      <div class="side-foot">
        <button class="nav-i" data-a="notifs">${ic('bell')}<span>الإشعارات</span><span class="cnt hot" id="navNotif">${unread}</span></button>
        <button class="nav-i" data-a="settings">${ic('sliders')}<span>الإعدادات</span></button>
        <button class="me" data-a="meMenu">${av(ME, '', true)}<div class="who"><b>${U(ME).name}</b><small>${U(ME).role}</small></div></button>
      </div>
    </aside>
    <main class="main"><div class="sheet">
      <header class="topbar">
        <button class="icon-btn" data-a="toggleSide" data-tip="طي القائمة">${ic('menu')}</button>
        <span class="emb top-emb" role="img" aria-label="أعراف"></span>
        <div class="crumbs" id="crumbs"></div>
        <button class="searchbtn" data-a="cmd">${ic('search')}<span>ابحث برقم الطلب أو اسم العميل، أو نفّذ أمرًا</span><span class="kbd">Ctrl K</span></button>
        <div class="today-chip"><b>${wd(TODAY)}، ${dm(TODAY)}</b><span>${hijri(TODAY)}</span></div>
        <button class="icon-btn lex-top" id="lexTop" data-a="lexPanel" data-tip="الفاحص القانوني">${ic('shieldCheck')}<span class="dot" style="display:none;background:var(--navy)"></span></button>
        <button class="icon-btn" data-a="inbox" data-tip="المراسلات">${ic('mail')}<span class="dot" id="mailDot"></span></button>
        <button class="icon-btn theme-btn" data-a="theme" data-tip="الوضع الليلي / النهاري" id="themeBtn">${ic('moon')}</button>
        <button class="icon-btn" data-a="notifs" data-tip="الإشعارات">${ic('bell')}<span class="dot" id="bellDot">${unread}</span></button>
      </header>
      <div class="scroll" id="scroll"><div class="view" id="view"></div></div>
    </div></main>
  </div>
  <nav class="mobile-nav" id="mnav"></nav>
  <div class="fab" id="fab"><div class="fab-menu" id="fabMenu"></div><button class="fab-btn" data-a="fab" aria-label="إضافة سريعة">${ic('plus')}</button></div>
  <div class="scrim" id="scrim" data-a="drClose"></div><aside class="drawer wide" id="drawer"></aside>
  <div class="modal-wrap" id="modal"></div>
  <div class="cmd-wrap" id="cmd"></div>
  <div class="toasts" id="toasts"></div>
  <div class="tip" id="tip"></div>`;
  tipEl = $('#tip');
  document.documentElement.style.setProperty('--emblem', `url(${EMBLEM})`);
  paintNav();
}
function paintNav() {
  $('#nav').innerHTML = NAV.map((n) => {
    if (n === '-') return '<div class="nav-sep"></div>';
    const c = n.cnt ? n.cnt() : ''; const on = S.route === n.r;
    const cnt = c ? (typeof c === 'object' ? (c.n ? `<span class="cnt hot">${c.n}</span>` : '') : `<span class="cnt">${c}</span>`) : '';
    return `<button class="nav-i ${on ? 'on' : ''}" data-a="nav" data-to="${n.r}">${ic(n.ic)}<span>${n.l}</span>${cnt}</button>`;
  }).join('');
  const mob = [['home', 'اليوم', 'home'], ['requests', 'الخدمات', 'file'], ['cases', 'التوكيل', 'gavel'], ['business', 'المنشآت', 'building'], ['more', 'المزيد', 'menu']];
  const hot = attention().filter((a) => a.sev === 'crit').length;
  $('#mnav').innerHTML = mob.map(([r, l, i]) => `<button class="${S.route === r ? 'on' : ''}" data-a="${r === 'more' ? 'mobMore' : 'nav'}" data-to="${r}">${ic(i)}${l}${r === 'home' && hot ? `<span class="cnt">${hot}</span>` : ''}</button>`).join('');
  const un = NOTIFS.filter((n) => n.unread).length;
  ['#bellDot', '#navNotif'].forEach((s) => { const el = $(s); el.textContent = un; el.style.display = un ? '' : 'none'; });
  const md = $('#mailDot'); if (md && typeof unreadLetters === 'function') { const n = unreadLetters(); md.textContent = n; md.style.display = n ? '' : 'none'; }
}
function crumbs() { $('#crumbs').innerHTML = `<b>${TITLES[S.route]}</b>`; }

/* ---------- الراوتر ---------- */
const VIEWS = {}; const HOOKS = [];
function parseHash() { const r = location.hash.replace(/^#\/?/, '').split('/')[0]; S.route = VIEWS[r] ? r : 'home'; if (S.route === 'requests') S.kind = 'direct'; if (S.route === 'cases') S.kind = 'cases'; }
function go(route) { const h = '#/' + route; if (location.hash === h) render(true); else location.hash = h; }
function render(anim = true) {
  closePop(); $('#peek')?.remove(); tipEl?.classList.remove('show');
  const v = $('#view'); const first = !S.visited.has(S.route) && S.route !== 'home'; S.visited.add(S.route);
  const paint = () => { v.innerHTML = VIEWS[S.route](); if (anim) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); } after(v); };
  if (first) { v.innerHTML = skeleton(); v.classList.remove('enter'); setTimeout(paint, 240); } else paint();
  paintNav(); crumbs(); if (anim) $('#scroll').scrollTop = 0;
}
function rerender() { const sc = $('#scroll').scrollTop; $('#view').innerHTML = VIEWS[S.route](); after($('#view')); $('#scroll').scrollTop = sc; paintNav(); }
function after(root) { runCounters(root); runRings(root); syncIndicators(root); HOOKS.forEach((f) => f(root)); }
function skeleton() {
  return `<div style="display:flex;flex-direction:column;gap:18px"><div class="sk" style="height:38px;width:240px"></div><div class="sk" style="height:30px;width:55%"></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">${'<div class="sk" style="height:96px"></div>'.repeat(4)}</div>
  ${'<div class="sk" style="height:52px"></div>'.repeat(6)}</div>`;
}
window.addEventListener('hashchange', () => { parseHash(); render(true); });

/* ---------- الأحداث ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!$('#pop')?.contains(e.target) && !e.target.closest('[data-a="fab"]')) closePop();
  if (!el) { if (!e.target.closest('#fab')) closeFab(); return; }
  const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el, e); }
  if (el.dataset.a !== 'fab' && !el.closest('#fabMenu')) closeFab();
});
document.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('[data-ctx]'); if (!row) return; e.preventDefault();
  const [kind, id] = row.dataset.ctx.split(':'); CTX[kind] && openPop({ x: e.clientX + 210, y: e.clientY }, CTX[kind](id));
});
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); return openCmd(); }
  if (e.key === 'Escape') {
    if ($('#cmd').classList.contains('show')) return closeCmd();
    if ($('#modal').classList.contains('show')) return closeModal();
    if ($('#pop')) return closePop();
    if ($('#fab').classList.contains('open')) return closeFab();
    return closeDrawer();
  }
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === '/') { e.preventDefault(); openCmd(); }
  if (k === 'n' || e.key === 'ى') { e.preventDefault(); A.fab(); }
  if (e.shiftKey && e.key === 'A' && DR.stack.length) { const id = DR.reqId; id && A.assign({ dataset: { id } }); }
});
A.nav = (el) => go(el.dataset.to);
A.drClose = closeDrawer; A.drBack = drawerBack; A.mClose = closeModal;
A.toggleSide = () => { const a = $('#app'); if (innerWidth <= 1280) a.classList.toggle('expanded'); else a.classList.toggle('collapsed'); setTimeout(syncIndicators, 360); };
A.seg = (el) => { S[el.dataset.k] = el.dataset.v; rerender(); };
A.stop = (el, e) => e.stopPropagation();
A.copy = (el, e) => { e.stopPropagation(); navigator.clipboard?.writeText(el.dataset.v); toast('نُسخ ' + (el.dataset.l || 'النص')); };
A.stub = (el) => toast(el.dataset.m, { info: true });
A.theme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
function setTheme(t, save) {
  document.documentElement.dataset.theme = t;
  const b = $('#themeBtn'); if (b) { b.innerHTML = ic(t === 'dark' ? 'sun' : 'moon'); b.dataset.tip = t === 'dark' ? 'التبديل إلى النهاري' : 'التبديل إلى الليلي'; }
  if ($('#view') && $('#view').innerHTML) rerender();
  if (save) { try { localStorage.setItem('araf-ops-theme', t); } catch (e) {} toast(t === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري', { info: true }); }
}
A.settings = () => toast('الإعدادات خارج نطاق هذه النسخة التجريبية', { info: true });
A.meMenu = (el) => openPop(el, [{ h: `${U(ME).name} — ${U(ME).role}` }, { l: 'صفحتي في الفريق', ic: 'user', f: () => openMember(ME) }, { l: 'اختصارات لوحة المفاتيح', ic: 'keyboard', f: shortcuts }, { l: 'طلب تصفير عداد الطلبات', ic: 'refresh', f: resetRequests }, '-', { l: 'تسجيل الخروج', ic: 'logout', red: true, f: () => toast('هذه نسخة تجريبية؛ تسجيل الخروج غير مفعّل', { info: true }) }], { alignStart: true });
A.mobMore = (el) => openPop(el, [['flow', 'خريطة التدفق', 'droplet'], ['team', 'الفريق', 'team'], ['activity', 'سجل النشاط', 'activity'], ['support', 'الدعم الفني', 'msg']].map(([r, l, i]) => ({ l, ic: i, f: () => go(r) })).concat(['-', { l: 'الإشعارات', ic: 'bell', f: openNotifs }]));
window.addEventListener('resize', () => syncIndicators());

/* ==========================================================
   اليوم — مركز العمليات
   ========================================================== */
function attention() {
  const L = [];
  const unassigned = REQUESTS.filter((r) => !r.assigned_to && isOpen(r)).sort((a, b) => a.created_at - b.created_at);
  const over = unassigned.filter((r) => hoursSince(r.created_at) > SLA.assign);
  if (over.length) L.push({ id: 'x1', sev: 'crit', ic: 'alert', t: `${over.length === 1 ? 'طلب واحد تجاوز' : over.length + ' طلبات تجاوزت'} مهلة الإسناد (${SLA.assign} ساعات)`, m: `الأقدم: ${over[0].customer} — ${svName(over[0])} منذ ${Math.round(hoursSince(over[0].created_at))} ساعة`, acts: [['توزيع تلقائي', 'autoAll', '', 'p'], ['عرضها', 'goFilter', 'unassigned']] });
  const noContact = REQUESTS.filter((r) => isOpen(r) && r.assigned_to && !r.contacted_at && hoursSince(r.assigned_at || r.created_at) > SLA.contact);
  if (noContact.length) L.push({ id: 'x2', sev: 'crit', ic: 'phone', t: `${noContact.length} طلبات مسندة دون تواصل مع العميل خلال ${SLA.contact} ساعة`, m: noContact.slice(0, 2).map((r) => `${r.id.slice(-4)} لدى ${U(r.assigned_to).short}`).join('، '), acts: [['فتح الأقدم', 'openReq', noContact[0].id, 'p'], ['تذكير المسؤولين', 'remindTeam', '']] });
  const stuck = REQUESTS.filter((r) => r.status === 'waiting' && hoursSince(r.updated_at) > 96);
  if (stuck.length) L.push({ id: 'x3', sev: 'high', ic: 'clock', t: `${stuck.length} طلبات متوقفة بانتظار مستندات العميل منذ أكثر من 4 أيام`, m: stuck.map((r) => r.customer).join('، '), acts: [['تذكير العملاء', 'remindClients', '', 'p'], ['فتح الأقدم', 'openReq', stuck[0].id]] });
  const quote = REQUESTS.filter((r) => r.payment === 'pending_quote' && isOpen(r));
  if (quote.length) L.push({ id: 'x4', sev: 'high', ic: 'receipt', t: `${quote.length} طلبات توكيل بانتظار التسعير`, m: 'لا يبدأ العمل قبل إرسال عرض الأتعاب واعتماده', acts: [['تسعير الأول', 'quote', quote[0].id, 'p'], ['عرض التوكيل', 'nav', 'cases']] });
  const hi = REQUESTS.filter((r) => isOpen(r) && REPORTS['req:' + r.id]?.data.risk === 'مرتفع');
  if (hi.length) L.push({ id: 'x9', sev: 'high', ic: 'shieldCheck', t: `الفاحص القانوني: ${hi.length === 1 ? 'طلب واحد بمخاطر مرتفعة' : hi.length + ' طلبات بمخاطر مرتفعة'}`, m: hi.slice(0, 2).map((r) => `${r.customer} — ${REPORTS['req:' + r.id].data.area}`).join('، '), acts: [['التقرير', 'lexOpenK', 'req:' + hi[0].id, 'p'], ['الطلب', 'openReq', hi[0].id]] });
  const act = ACTIVATIONS.filter((a) => a.status === 'new');
  if (act.length) L.push({ id: 'x5', sev: 'med', ic: 'building', t: `${act.length === 1 ? 'طلب تفعيل منشأة جديد' : act.length + ' طلبات تفعيل منشآت جديدة'}`, m: act.map((a) => a.name).join('، '), acts: [['فتح التفعيل', 'goAct', '', 'p']] });
  const tk = TICKETS.filter((t) => t.status === 'open');
  if (tk.length) L.push({ id: 'x6', sev: 'med', ic: 'msg', t: `${tk.length} تذاكر دعم مفتوحة`, m: `الأحدث: ${tk[0].subject} — ${tk[0].customer}`, acts: [['فتح التذكرة', 'openTicket', tk[0].id, 'p'], ['كل التذاكر', 'nav', 'support']] });
  const pay = REQUESTS.filter((r) => r.payment === 'pending' && isOpen(r));
  if (pay.length) L.push({ id: 'x7', sev: 'low', ic: 'wallet', t: `${pay.length} طلبات بانتظار التحقق من الدفع`, m: 'تحقق من التحويل قبل بدء التنفيذ', acts: [['عرضها', 'goFilter', 'pay']] });
  if (S.resetPending) L.push({ id: 'x8', sev: 'low', ic: 'refresh', t: 'طلب تصفير عداد الطلبات بانتظار موافقة مدير آخر', m: 'تقدّم به خالد العتيبي في 14 سبتمبر', acts: [['مراجعة', 'resetReview', '', 'p']] });
  return L.filter((x) => !S.dismissed.has(x.id));
}
function slaQueue() {
  return REQUESTS.filter((r) => isOpen(r)).map((r) => ({ r, s: sla(r) })).filter((x) => x.s).sort((a, b) => a.s.due - b.s.due).slice(0, 5);
}
VIEWS.home = () => {
  const hr = nowDate().getHours(); const greet = hr < 12 ? 'صباح الخير' : 'مساء الخير';
  const att = attention(); const q = slaQueue(); const top = q[0];
  const openAll = REQUESTS.filter(isOpen);
  const unassigned = openAll.filter((r) => !r.assigned_to).length;
  const lateN = openAll.filter(isLate).length;
  const doneToday = REQUESTS.filter((r) => r.closed_at && sameDay(r.closed_at, TODAY)).length;
  const todayIn = REQUESTS.filter((r) => sameDay(r.created_at, TODAY)).length;
  const shown = S.attAll ? att : att.slice(0, 4);
  return `
  <section class="hello" style="grid-template-columns:1fr auto;align-items:center">
    <div class="hello-id"><div class="hello-emb"><span class="emb shine" role="img" aria-label="شعار أعراف"></span><i class="orbit"></i></div>
      <div><h1 class="h-disp">${greet}، ${U(ME).short}</h1>
      <p class="line">وصل اليوم <b>${todayIn} طلبات</b>، و<b>${unassigned}</b> منها بلا مسؤول${lateN ? `، و<b style="color:var(--red)">${lateN}</b> تجاوز مهلته الداخلية` : ''}. أغلق الفريق ${doneToday} طلبات حتى الآن.</p><div id="lexLive">${lexLive()}</div></div></div>
    <div class="row gap8"><button class="btn btn-s" data-a="tour">${ic('sparkle')}جولة سريعة</button><button class="btn btn-p" data-a="brief">${ic('sun')}موجز التشغيل</button></div>
  </section>

  ${earnHero()}
  ${kpiStrip(todayIn, unassigned, lateN, doneToday)}
  <section class="letters" id="lettersSec">${lettersSec()}</section>

  <div class="grid g12" id="pipeSec" style="margin-bottom:30px">${pipeSecInner()}</div>

  <div class="grid g12" style="margin-bottom:30px">
    <section class="s7">
      <div class="sec-h"><div class="sec-t">يتطلب تدخلك<small id="attCount">${att.length} ${att.length > 10 ? 'بندًا' : 'بنود'}</small></div>
      <div class="act">${att.length > 4 ? `<button class="btn btn-sm btn-q" data-a="attAll">${S.attAll ? 'عرض الأهم فقط' : `عرض الكل (${att.length})`}</button>` : ''}</div></div>
      <div class="att-list" id="attList">${att.length ? shown.map(attRow).join('') : empty('لا شيء عالق', 'كل الطلبات مسندة وضمن مهلها. سيظهر هنا أي طلب يتجاوز مهلة الإسناد أو التواصل.')}</div>
    </section>
    <section class="s5" id="slaWrap">${slaPanel()}</section>
  </div>

  <div class="grid g12" style="margin-bottom:30px">
    <section class="s7">
      <div class="sec-h"><div class="sec-t">حركة الطلبات<small>آخر 7 أيام</small></div><div class="act legend"><span><i style="--c:var(--navy)"></i>واردة</span><span><i style="--c:var(--gold)"></i>مغلقة</span></div></div>
      ${groupBars({ groups: [TREND_IN, TREND_CLOSED], labels: last7().map((d) => `${wd(d).replace('ال', '')} ${dNum(d)}`), colors: ['var(--navy)', 'var(--gold)'], w: 660, h: 220 })}
    </section>
    <section class="s5">
      <div class="sec-h"><div class="sec-t">حِمل الفريق<small>الطلبات المفتوحة مقابل طاقة كل عضو</small></div><div class="act"><button class="btn btn-sm btn-q" data-a="nav" data-to="team">التفاصيل</button></div></div>
      ${TEAM.filter((t) => t.status === 'active').map((t) => { const l = load(t.id); return `<div class="li" data-a="member" data-id="${t.id}" style="padding:8px 6px">${av(t.id, 'sm', true)}<div class="grow"><div class="row" style="font-size:12.5px"><span class="grow">${t.short}</span><b class="num">${empOpen(t.id).length}</b></div><div class="hbar" style="height:6px;margin-top:5px"><i class="growX" style="width:${Math.min(100, l)}%;background:${l > 95 ? 'var(--red)' : l > 70 ? 'var(--gold)' : 'var(--green)'}"></i></div></div></div>`; }).join('')}
      <div class="ins" style="border-top:1px solid var(--line);margin-top:8px"><div class="ic">${ic('bulb')}</div><div><p>يمكن موازنة الفريق بنقل طلبين عاديين من الأكثر ضغطًا إلى الأقل.</p><button class="btn-link" data-a="rebalance">اقتراح إعادة توزيع${ic('chevL')}</button></div></div>
    </section>
  </div>

  <div class="grid g12">
    <section class="s7">
      <div class="sec-h"><div class="sec-t">النشاط <span class="live"><i></i>مباشر</span></div><div class="act">${TEAM.filter((t) => t.status === 'active').map((t) => av(t.id, 'sm', true)).join('')}</div></div>
      <div class="feed" id="feed">${LOG.slice(0, 6).map((f) => logItem(f)).join('')}</div>
      <button class="btn-link" data-a="nav" data-to="activity" style="margin-top:10px">السجل الكامل${ic('chevL')}</button>
    </section>
    <section class="s5">
      <div class="sec-h"><div class="sec-t">الأكثر طلبًا<small>اضغط لعرض طلبات الخدمة</small></div></div>
      ${topServices()}
    </section>
  </div>`;
};
/* وصول طلب جديد: التقرير والقُمع والمؤشرات تتحدث فورًا */
let arrI = 0;
function liveArrive() {
  if (arrI >= INCOMING.length || S.route !== 'home') return;
  const o = INCOMING[arrI++];
  const r = R(Object.assign({ kind: 'direct', status: 'new', created_at: nowDate(), source: 'direct_services' }, o));
  REQUESTS.unshift(r); S.lastArrival = r; log('created', `وصل طلب جديد من ${r.customer} — ${svName(r)}`); lexNew('req:' + r.id);
  const sec = $('#pipeSec'); if (sec) { sec.innerHTML = pipeSecInner(); after(sec); $('.report')?.classList.add('flash-in'); }
  const openAll = REQUESTS.filter(isOpen);
  const k = $('.kpis');
  if (k) { const nk = document.createElement('div'); nk.innerHTML = kpiStrip(REQUESTS.filter((x) => sameDay(x.created_at, TODAY)).length, openAll.filter((x) => !x.assigned_to).length, openAll.filter(isLate).length, REQUESTS.filter((x) => x.closed_at && sameDay(x.closed_at, TODAY)).length); k.replaceWith(nk.firstElementChild); after($('.kpis')); }
  const sw = $('#slaWrap'); if (sw) { sw.innerHTML = slaPanel(); after(sw); }
  const f = $('#feed'); if (f) { f.insertAdjacentHTML('afterbegin', logItem(LOG[0], true)); if (f.children.length > 6) f.lastElementChild.remove(); }
  paintNav();
  toast(`طلب جديد من ${r.customer} — ${svName(r)}`, { info: true, action: ['فتح', () => openReq(r.id)] });
}
A.attAll = () => { S.attAll = !S.attAll; rerender(); };

const last7 = () => [...Array(7)].map((_, i) => new Date(+TODAY - (6 - i) * DAY));

/* ---------- الأداء المالي ---------- */
function donut(segs, size = 150, sw = 16, inner = '') {
  const total = segs.reduce((a, b) => a + b.v, 0) || 1; const r = (size - sw) / 2, C = 2 * Math.PI * r;
  let off = 0;
  const arcs = segs.map((s, i) => {
    const len = C * (s.v / total); const rot = (off / C) * 360; off += len;
    return `<circle class="ring-arc dseg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.c}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C - len}"
      style="transform:rotate(${rot}deg);transform-origin:center;transition-delay:${i * 220}ms" data-tip="${esc(s.l + ': ' + fmt(s.v) + ' ر.س (' + Math.round((s.v / total) * 100) + '%)')}"/>`;
  }).join('');
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" style="transform:rotate(-90deg)">${arcs}</svg><div class="donut-c">${inner}</div></div>`;
}
function miniArea(vals, labels, w = 420, h = 116) {
  const padB = 20, padT = 10; const mx = Math.max(...vals) * 1.15, mn = 0;
  const pts = vals.map((v, i) => [xRTL(i, vals.length, w, 8, 8), padT + (h - padT - padB) * (1 - (v - mn) / (mx - mn))]);
  const d = smooth(pts);
  let hits = ''; const step = (w - 16) / Math.max(1, vals.length - 1);
  labels.forEach((l, i) => { hits += `<rect class="hit" x="${pts[i][0] - step / 2}" y="0" width="${step}" height="${h - padB}" data-tip="${esc(l + ': ' + fmt(vals[i] * 1000) + ' ر.س')}"/><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="2.6" fill="rgba(201,169,110,.55)"/>`; });
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;overflow:visible">
    <defs><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C9A96E" stop-opacity=".32"/><stop offset="1" stop-color="#C9A96E" stop-opacity="0"/></linearGradient></defs>
    <path class="fade-area" d="${d} L${last[0]} ${h - padB} L${pts[0][0]} ${h - padB}Z" fill="url(#gArea)"/>
    <path class="draw" pathLength="1" d="${d}" fill="none" stroke="#C9A96E" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="#C9A96E" stroke="#132C39" stroke-width="2"/>
    ${labels.map((l, i) => `<text x="${pts[i][0]}" y="${h - 4}" text-anchor="middle" style="font-size:9.5px;fill:rgba(233,230,221,${i % 2 ? '.34' : '.55'});font-family:var(--f-ui)">${i % 2 ? i + 1 : l + ' ' + (i + 1)}</text>`).join('')}
    ${hits}</svg>`;
}
function earnHero() {
  const d = earned('direct'), c = earned('cases');
  const subs = ENTITIES.filter((e) => e.sub === 'active').reduce((a, b) => a + PLANS[b.plan].price, 0);
  const t = d + c + subs;
  const dn = reqList('direct').filter((r) => r.status === 'done').length, cn = reqList('cases').filter((r) => r.status === 'done').length;
  const prevMonth = REV_MONTH[REV_MONTH.length - 2] * 1000;
  const pend = REQUESTS.filter((r) => payWaiting(r)).reduce((a, b) => a + (+b.price || 0), 0);
  const segs = [{ v: d, c: '#C9A96E', l: 'الخدمات المباشرة' }, { v: c, c: '#7FA3B8', l: 'توكيل القضايا' }, { v: subs, c: '#4D8A6A', l: 'اشتراكات المنشآت' }];
  return `<section class="earn">
    <div class="earn-glow"></div><div class="earn-mark"></div>
    <div class="earn-main">
      <div class="earn-eyebrow">${ic('wallet', 'width="15" height="15"')}الأداء المالي — سبتمبر 2026</div>
      <div class="earn-label">الإجمالي المكتسب</div>
      <div class="earn-value">${counter(t)}<small>ر.س</small></div>
      <div class="row gap8" style="margin-top:2px">${delta(t, prevMonth)}<span style="font-size:12.5px;color:rgba(233,230,221,.6)">مقارنة بأغسطس</span></div>
      <div class="earn-mini">
        <div><span>محصّل فعليًا</span><b class="num">${fmt(d + c)}</b></div>
        <div><span>طلبات بانتظار الدفع</span><b class="num" style="color:#E9C98B">${fmt(pend)}</b></div>
        <div><span>متكرر شهريًا</span><b class="num">${fmt(subs)}</b></div>
      </div>
    </div>
    <div class="earn-split">
      ${donut(segs, 138, 14, `<b class="num">${Math.round((subs / t) * 100)}%</b><span>من الإيراد<br>متكرر</span>`)}
      <div class="earn-legend">${segs.map((s, i) => `<div><i style="background:${s.c}"></i><div><b>${s.l}</b><span class="num">${fmt(s.v)} ر.س${i === 0 ? ` — ${dn} طلبات` : i === 1 ? ` — ${cn} طلبات` : ` — ${ENTITIES.filter((e) => e.sub === 'active').length} منشآت`}</span></div></div>`).join('')}</div>
    </div>
    <div class="earn-chart">
      <div class="earn-eyebrow" style="margin-bottom:6px">الإيراد الشهري منذ يناير</div>
      ${miniArea(REV_MONTH, MONTHS, 430, 132)}
      <div class="earn-note">${ic('alert', 'width="13" height="13"')}<span>تُحتسب الطلبات بحالة «مكتمل» فقط، ولا تدخل الطلبات المشمولة بباقات المنشآت.</span></div>
    </div>
  </section>`;
}
function kpiStrip(todayIn, unassigned, lateN, doneToday) {
  const K = [
    ['وارد اليوم', todayIn, 'inbox', 'var(--blue)', 'goToday', ''],
    ['بلا مسؤول', unassigned, 'user', 'var(--amber)', 'goFilter', 'unassigned'],
    ['تجاوز المهلة', lateN, 'alert', 'var(--red)', 'goLate', ''],
    ['أُغلق اليوم', doneToday, 'check', 'var(--green)', 'goDone', ''],
  ];
  return `<div class="kpis">${K.map(([l, n, i, c, a, v], k) => `<button class="kpi-c" style="--c:${c};animation-delay:${k * 70}ms" data-a="${a}" data-v="${v}">
    <span class="ic">${ic(i)}</span><span class="grow"><b>${counter(n)}</b><span>${l}</span></span><span class="go">${ic('chevL')}</span></button>`).join('')}</div>`;
}
A.goToday = () => { S.saved = 'all'; S.f = {}; S.sort = 'new'; go('requests'); };
A.goLate = () => { S.saved = 'late'; S.f = {}; go('requests'); };
A.goDone = () => { S.saved = 'all'; S.f = { status: 'done' }; go('requests'); };

/* ---------- مسار الطلبات: تقرير + قُمع ---------- */
function pipeSecInner() {
  return `<section class="s7">
      <div class="sec-h"><div class="sec-t">مسار الطلبات<small>تقرير يُحدَّث لحظة وصول أي طلب جديد</small></div>
        <div class="act"><span class="live"><i></i>يتحدث تلقائيًا</span></div></div>
      ${pipeReport()}
    </section>
    <section class="s5">
      <div class="sec-h"><div class="sec-t">القُمع<small>من الوصول حتى الإغلاق</small></div></div>
      ${funnel()}
    </section>`;
}
const isDark = () => document.documentElement.dataset.theme === 'dark';
const PIPE = [
  { k: 'in', l: 'وصل الطلب', c: '#3B6C8C', d: '#6FB4D6', f: () => REQUESTS.length, nav: '' },
  { k: 'assigned', l: 'أُسند لموظف', c: '#6A5A8C', d: '#A995DA', f: () => REQUESTS.filter((r) => r.assigned_at).length, nav: 'assigned' },
  { k: 'contacted', l: 'تم التواصل', c: '#C9A96E', d: '#E8CE96', f: () => REQUESTS.filter((r) => r.contacted_at).length, nav: 'contacted' },
  { k: 'progress', l: 'دخل التنفيذ', c: '#1B3A4B', d: '#4E93B5', f: () => REQUESTS.filter((r) => ['progress', 'review', 'done', 'closed'].includes(r.status)).length, nav: 'progress,review' },
  { k: 'done', l: 'أُغلق مكتملًا', c: '#3D7759', d: '#63C79C', f: () => REQUESTS.filter((r) => r.status === 'done').length, nav: 'done' },
];
function pipeStats() {
  const v = PIPE.map((p) => p.f());
  const open = REQUESTS.filter(isOpen);
  const groups = [['new', 'pending'], ['assigned'], ['contacted', 'waiting'], ['progress', 'review']];
  const names = ['بانتظار الإسناد', 'مسندة دون تواصل', 'بانتظار العميل والمستندات', 'قيد التنفيذ والمراجعة'];
  const stalls = groups.map((g, i) => { const rs = open.filter((r) => g.includes(r.status)); const age = rs.length ? rs.reduce((a, r) => a + (nowDate() - r.updated_at) / DAY, 0) / rs.length : 0; return { l: names[i], n: rs.length, days: age, st: g.join(',') }; });
  const worst = stalls.slice().sort((a, b) => b.days * b.n - a.days * a.n)[0];
  const closed = REQUESTS.filter((r) => r.closed_at);
  const avgClose = closed.length ? Math.round(closed.reduce((a, r) => a + (r.closed_at - r.created_at) / 36e5, 0) / closed.length) : 0;
  const fastest = (() => { const m = {}; closed.filter((r) => r.status === 'done').forEach((r) => { const h = (r.closed_at - r.created_at) / 36e5; (m[r.service] = m[r.service] || []).push(h); });
    const rows = Object.entries(m).map(([k, a]) => [k, a.reduce((x, y) => x + y, 0) / a.length]).sort((a, b) => a[1] - b[1]); return rows[0]; })();
  return { v, stalls, worst, avgClose, fastest, conv: Math.round((v[4] / v[0]) * 100), drop: Math.round(((v[0] - v[1]) / v[0]) * 100) };
}
function pipeReport() {
  const s = pipeStats(); const [t, a, c, p, d] = s.v;
  const chip = (k, txt) => `<b class="rp" data-st="${k}">${txt}</b>`;
  const nw = S.lastArrival;
  return `<div class="report">
    ${nw ? `<div class="rp-live"><span class="dot"></span><b>وصل قبل ${hHuman(hoursSince(nw.created_at))}:</b> ${nw.customer} — ${svName(nw)}${nw.kind === 'cases' ? ' (توكيل)' : ''}<button class="btn btn-sm btn-p" data-a="openReq" data-id="${nw.id}">${nw.assigned_to ? 'عرض' : 'إسناد الآن'}</button></div>` : ''}
    <p class="rp-lead">من أصل ${chip('in', t + ' طلبًا')} وصلت هذا الشهر، وصل ${chip('done', d + ' طلبًا')} إلى الإغلاق مكتملًا — أي نسبة إتمام ${s.conv}%.</p>
    <p>أُسند ${chip('assigned', a + ' طلبًا')} إلى الفريق، وتم التواصل مع العميل في ${chip('contacted', c + ' منها')}، ودخل ${chip('progress', p + ' طلبًا')} مرحلة التنفيذ. أكبر تسرّب يحدث عند الباب الأول: ${s.drop}% من الطلبات لم تُسنَد بعد، وهي الخطوة التي تستغرق أقل من دقيقة لو فُتحت اليوم.</p>
    <p>أطول توقف في المسار عند <button class="rp-link" data-a="goStage" data-v="${s.worst.st}">«${s.worst.l}»</button>: ${s.worst.n} طلبات متوقفة منذ ${s.worst.days.toFixed(1)} يوم وسطيًا. تحريكها وحدها يرفع نسبة الإتمام أكثر من أي إجراء آخر هذا الأسبوع.</p>
    <p class="muted" style="font-size:13px">متوسط زمن الإغلاق ${s.avgClose} ساعة لكل طلب مغلق، وأسرع مسار يمر عبر ${s.fastest ? `«${SV(s.fastest[0]).name}» بمتوسط ${Math.round(s.fastest[1])} ساعة` : 'خدمات أعراف تحقّق'}.</p>
    <div class="rp-stats">
      <div><b>${counter(s.conv, '', '%')}</b><span>نسبة الإتمام</span></div>
      <div><b>${counter(s.avgClose)}<small> س</small></b><span>متوسط الإغلاق</span></div>
      <div><b>${counter(Math.round(TREND_IN.reduce((x, y) => x + y, 0) / 7 * 10) / 10, '', '', 1)}</b><span>وصول يومي وسطيًا</span></div>
      <div><b>${counter(REQUESTS.filter(isOpen).length)}</b><span>مفتوح الآن</span></div>
    </div>
  </div>`;
}
function funnel() {
  const s = pipeStats(); const v = s.v; const W = 360, BH = 52, GAP = 8, maxW = 300, minW = 96;
  const w = (n) => minW + (maxW - minW) * (n / v[0]);
  const H = PIPE.length * (BH + GAP);
  const bands = PIPE.map((p, i) => {
    const y = i * (BH + GAP); const w1 = w(v[i]), w2 = w(v[i + 1] != null ? v[i + 1] : v[i] * 0.94);
    const pts = `${W / 2 - w1 / 2},${y} ${W / 2 + w1 / 2},${y} ${W / 2 + w2 / 2},${y + BH} ${W / 2 - w2 / 2},${y + BH}`;
    const pct = Math.round((v[i] / v[0]) * 100);
    const drop = i ? Math.round((v[i] / v[i - 1]) * 100) : 100;
    return `<g class="fn-band" data-st="${p.k}" data-a="goStage" data-v="${p.nav || 'new,pending'}" style="animation-delay:${i * 110}ms"
      data-tip="${esc(p.l + ': ' + v[i] + ' طلبًا (' + pct + '% من الوارد' + (i ? ' — ' + drop + '% انتقلت من المرحلة السابقة' : '') + ')')}">
      <polygon points="${pts}" fill="${isDark() ? p.d : p.c}" />
      <text x="${W / 2}" y="${y + BH / 2 - 3}" text-anchor="middle" class="fn-n">${v[i]}</text>
      <text x="${W / 2}" y="${y + BH / 2 + 13}" text-anchor="middle" class="fn-l">${p.l}</text>
      ${i ? `<text x="${W / 2 + w1 / 2 + 12}" y="${y + BH / 2 + 4}" text-anchor="start" class="fn-p">${drop}%</text>` : ''}
    </g>`;
  }).join('');
  return `<div class="funnel-wrap"><svg viewBox="0 0 ${W} ${H}" class="funnel">${bands}</svg>
    <div class="fn-foot">${ic('bulb', 'width="14" height="14"')}<span>مرّر على أي مرحلة لمعرفة نسبة انتقالها، واضغطها لفتح طلباتها.</span></div></div>`;
}
function topServices() {
  const m = {}; REQUESTS.forEach((r) => { m[r.service] = (m[r.service] || 0) + 1; });
  const rows = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7); const mx = rows[0][1];
  return rows.map(([k, n], i) => `<div class="srv-row" data-a="goService" data-v="${k}"><span class="ell" style="width:150px">${SV(k).name}</span><div class="hbar grow" style="height:10px"><i class="growX" style="width:${(n / mx) * 100}%;animation-delay:${i * 60}ms;background:${SV(k).c}"></i></div><b class="num" style="width:26px;text-align:end">${n}</b></div>`).join('');
}

/* ---------- جولة تعريفية ---------- */
const TOUR = [
  { sel: '.earn', t: 'أين يقف المكتب ماليًا', p: 'الإجمالي المكتسب هذا الشهر، موزعًا على الخدمات المباشرة وتوكيل القضايا واشتراكات المنشآت. تُحتسب الطلبات المكتملة فقط.' },
  { sel: '.kpis', t: 'أربعة أرقام تكفي لبداية اليوم', p: 'كل رقم زر: اضغطه لتصل مباشرة إلى الطلبات التي يمثلها بدل البحث في الجداول.' },
  { sel: '#lettersSec', t: 'رسائل داخلية لفريقك', p: 'أرسل رسالة لأي عضو فتصله داخل المنصة. ترى متى وصلت ومتى قُرئت، ويرد عليك في المحادثة نفسها.' },
  { sel: '#pipeSec', t: 'مسار الطلبات مقروءًا ومرسومًا', p: 'التقرير يخبرك أين يتوقف العمل، والقُمع يريك كم طلبًا ينتقل من مرحلة لأخرى. اضغط أي مرحلة لفتح طلباتها.' },
  { sel: '#attList', t: 'ما يحتاج قرارك الآن', p: 'كل بند هنا له زر إجراء مباشر: توزيع، تذكير، تسعير، تفعيل. الإخفاء لا يحذف شيئًا ويمكن التراجع عنه.' },
  { sel: '.dl-panel', t: 'المهل الداخلية', p: 'إسناد خلال 4 ساعات، وتواصل خلال 24 ساعة. ما يتجاوزها يظهر هنا بالعدّاد وباللون الأحمر في الجداول.' },
  { sel: '.searchbtn', t: 'كل شيء من مكان واحد', p: 'اضغط Ctrl K وابحث برقم الطلب أو اسم العميل أو المنشأة، أو نفّذ أمرًا مثل «توزيع الطلبات غير المسندة».' },
];
let tourI = 0;
function tour(i = 0) {
  tourI = i; endTour(true);
  const step = TOUR[i]; const el = $(step.sel); if (!el) return endTour();
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const box = document.createElement('div'); box.className = 'tour-hole'; box.id = 'tourHole';
    box.style.cssText = `top:${r.top - 8}px;left:${r.left - 8}px;width:${r.width + 16}px;height:${r.height + 16}px`;
    const card = document.createElement('div'); card.className = 'tour-card'; card.id = 'tourCard';
    const below = r.bottom + 220 < innerHeight;
    card.style.top = (below ? r.bottom + 18 : Math.max(16, r.top - 210)) + 'px';
    card.style.left = Math.max(16, Math.min(r.left + r.width / 2 - 190, innerWidth - 396)) + 'px';
    card.innerHTML = `<div class="tour-n">${i + 1} من ${TOUR.length}</div><b>${step.t}</b><p>${step.p}</p>
      <div class="row gap8" style="margin-top:14px"><button class="btn btn-sm btn-q" data-a="tourEnd">تخطي</button><span class="grow"></span>
      ${i ? `<button class="btn btn-sm btn-s" data-a="tourGo" data-i="${i - 1}">السابق</button>` : ''}
      <button class="btn btn-sm btn-p" data-a="${i === TOUR.length - 1 ? 'tourEnd' : 'tourGo'}" data-i="${i + 1}">${i === TOUR.length - 1 ? 'تم' : 'التالي'}</button></div>`;
    document.body.append(box, card);
  }, 260);
}
function endTour(quiet) { $('#tourHole')?.remove(); $('#tourCard')?.remove(); if (!quiet) try { localStorage.setItem('araf-ops-tour', '1'); } catch (e) {} }
A.tour = () => tour(0);
/* تُعرض الجولة مرة واحدة لكل متصفح */
setTimeout(() => { try { if (!localStorage.getItem('araf-ops-tour') && S.route === 'home') { localStorage.setItem('araf-ops-tour', '1'); tour(0); } } catch (e) {} }, 1800);
A.tourGo = (el) => tour(+el.dataset.i);
A.tourEnd = () => { endTour(); toast('يمكنك إعادة الجولة في أي وقت من زر «جولة سريعة»', { info: true }); };

function attRow(a) {
  return `<div class="att sev-${a.sev}"><div class="ic">${ic(a.ic)}</div><div><div class="t">${a.t}</div><div class="m">${a.m}</div></div>
   <div class="acts">${a.acts.map(([l, f, id, p]) => `<button class="btn btn-sm ${p ? 'btn-p' : 'btn-s'}" data-a="${f}" data-id="${id}" data-v="${id}" data-to="${id}">${l}</button>`).join('')}<button class="btn btn-sm btn-q" data-a="dismissAtt" data-id="${a.id}" data-tip="تم — إخفاء">${ic('check')}</button></div></div>`;
}
function slaPanel() {
  const L = REQUESTS.filter(isOpen).map((r) => ({ r, s: sla(r) })).filter((x) => x.s).sort((a, b) => a.s.due - b.s.due);
  const over = L.filter((x) => x.s.over), soon = L.filter((x) => !x.s.over && (x.s.due - nowDate()) / 36e5 <= 6);
  const okN = L.length - over.length - soon.length;
  const rows = over.concat(soon, L.filter((x) => !x.s.over && !soon.includes(x))).slice(0, 4);
  return `<div class="dl-panel" id="slaPanel">
    <div class="sec-h" style="margin-bottom:12px"><div class="sec-t">المهل الداخلية</div>
      <div class="act"><button class="btn btn-sm btn-q" style="color:rgba(233,230,221,.72)" data-a="slaRules">${ic('bulb')}القواعد</button></div></div>
    <div class="sla-sum">
      <button class="s-ok" data-a="goStage" data-v="assigned,contacted,progress,review"><b>${okN}</b><span>ضمن المهلة</span></button>
      <button class="s-soon" data-a="goLate"><b>${soon.length}</b><span>تقترب من الانتهاء</span></button>
      <button class="s-over" data-a="goLate"><b>${over.length}</b><span>تجاوزت المهلة</span></button>
    </div>
    <div class="sla-list">${rows.map(slaRow).join('') || '<p style="color:rgba(233,230,221,.6);font-size:13px;padding:10px 2px">لا طلبات مفتوحة الآن.</p>'}</div>
    <button class="sla-more" data-a="goLate">عرض كل المتأخرات (${over.length})${ic('chevL')}</button>
  </div>`;
}
function slaRow(x) {
  const over = x.s.over; const left = (x.s.due - nowDate()) / 36e5;
  const pct = Math.max(3, Math.min(100, (x.s.h / x.s.win) * 100));
  const act = x.s.k === 'assign' ? ['إسناد الآن', 'assign'] : x.s.k === 'remind' ? ['تذكير العميل', 'remindOne'] : ['فتح الطلب', 'openReq'];
  return `<div class="sla-row ${over ? 'over' : left <= 6 ? 'soon' : ''}" data-a="openReq" data-id="${x.r.id}">
    <span class="tag">${x.s.tag}</span>
    <div class="grow" style="min-width:0">
      <b class="ell">${x.r.customer} — ${svName(x.r)}</b>
      <small>${x.r.assigned_to ? U(x.r.assigned_to).short : 'بلا مسؤول'} · مضى ${hHuman(x.s.h)} · المهلة ${x.s.win} ساعة</small>
      <div class="sla-bar"><i style="width:${pct}%"></i></div>
    </div>
    <div class="sla-left">${over ? `<b>متأخر ${hHuman(x.s.h - x.s.win)}</b>` : `<b>يتبقى ${hHuman(left)}</b>`}
      <button class="btn btn-sm ${over ? 'btn-g' : 'btn-s'}" data-a="${act[1]}" data-id="${x.r.id}">${act[0]}</button></div></div>`;
}
A.remindOne = (el, e) => { e.stopPropagation(); const r = REQ(el.dataset.id); r.updated_at = nowDate(); r.notes.push({ by: ME, at: nowDate(), text: 'أُرسل تذكير للعميل بالمستندات الناقصة.' }); rerender(); toast(`أُرسل تذكير إلى ${r.customer}`); };
A.slaRules = (el, e) => { e.stopPropagation(); openPop(el, [{ h: 'قواعد المهل الداخلية' },
  { l: `إسناد الطلب خلال ${SLA.assign} ساعات من وروده`, ic: 'user' },
  { l: `التواصل مع العميل خلال ${SLA.contact} ساعة من الإسناد`, ic: 'phone' },
  { l: `تحريك الطلب خلال ${SLA.close} ساعة من آخر تحديث`, ic: 'refresh' },
  { l: `تذكير العميل كل ${SLA.remind} ساعة إذا كان الطلب بانتظار مستنداته`, ic: 'clock' },
  '-', { h: 'لا تُحتسب المهل على الطلبات المغلقة أو الملغاة' }]); };

const LOG_IC = { created: 'inbox', assigned: 'user', status: 'refresh', note: 'pen', closed: 'check', contacted: 'phone', case: 'gavel', employee: 'building' };
function logItem(f, isNew) {
  const u = f.by ? U(f.by) : null;
  const avh = u ? av(f.by) : `<span class="av" style="--c:var(--gold-dk)">${ic(LOG_IC[f.type] || 'activity', 'width="14" height="14"')}</span>`;
  return `<div class="fi ${isNew ? 'new' : ''}">${avh}<div><p>${u ? `<b>${u.short}</b> ` : ''}${f.text}</p><time>${ago(f.at)}</time></div></div>`;
}

/* الديناميكيات الحية */
let timers = [];
HOOKS.push((root) => {
  timers.forEach(clearInterval); timers = [];
  const hero = $('#cdHero', root);
  if (hero) {
    const at = +hero.dataset.at; const over = hero.dataset.over === '1';
    const tick = () => { const ms = Math.abs(at - nowDate()); const s = Math.floor(ms / 1000);
      const p = [[Math.floor(s / 86400), 'يوم'], [Math.floor((s % 86400) / 3600), 'ساعة'], [Math.floor((s % 3600) / 60), 'دقيقة'], [s % 60, 'ثانية']];
      hero.innerHTML = p.map(([v, l]) => `<div><b style="${over ? 'color:#F0A08C' : ''}">${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join(''); };
    tick(); timers.push(setInterval(tick, 1000));
  }
  // ربط القُمع بالتقرير
  $$('.fn-band', root).forEach((b) => {
    b.onmouseenter = () => { $('.funnel')?.classList.add('dim'); b.classList.add('hl'); $$(`.rp[data-st="${b.dataset.st}"]`).forEach((x) => x.classList.add('hl')); };
    b.onmouseleave = () => { $('.funnel')?.classList.remove('dim'); b.classList.remove('hl'); $$('.rp.hl').forEach((x) => x.classList.remove('hl')); };
  });
  $$('.rp', root).forEach((x) => {
    x.onmouseenter = () => { const b = $(`.fn-band[data-st="${x.dataset.st}"]`); if (!b) return; $('.funnel').classList.add('dim'); b.classList.add('hl'); };
    x.onmouseleave = () => { $('.funnel')?.classList.remove('dim'); $$('.fn-band.hl').forEach((b) => b.classList.remove('hl')); };
  });
  if ($('#pipeSec', root)) { clearInterval(window._arr); window._arr = setInterval(liveArrive, 24000); timers.push(window._arr); }
  if ($('#feed', root) && S.route === 'home') {
    let i = 0;
    timers.push(setInterval(() => {
      const f = $('#feed'); if (!f || i >= LIVE_EVENTS.length) return;
      const ev = { ...LIVE_EVENTS[i++], at: nowDate() }; LOG.unshift(ev);
      f.insertAdjacentHTML('afterbegin', logItem(ev, true)); if (f.children.length > 6) f.lastElementChild.remove();
    }, 34000));
  }
});
A.dismissAtt = (el, e) => { e.stopPropagation(); const id = el.dataset.id; S.dismissed.add(id); const row = el.closest('.att'); row.classList.add('collapse-out'); setTimeout(() => { row.remove(); const n = attention().length; $('#attCount') && ($('#attCount').textContent = `${n} ${n > 10 ? 'بندًا' : 'بنود'}`); if (!n) $('#attList').innerHTML = empty('لا شيء عالق', 'كل الطلبات مسندة وضمن مهلها.'); }, 450); toast('أُخفي من قائمة التدخل', { undo: () => { S.dismissed.delete(id); rerender(); } }); };
A.goStage = (el) => { const v = el.dataset.v; S.f = { status: v }; S.saved = 'all'; S.kind = 'direct'; go('requests'); };
A.goService = (el) => { S.f = { service: el.dataset.v }; S.saved = 'all'; go(SERVICES.some((s) => s.key === el.dataset.v) ? 'requests' : 'cases'); };
A.goFilter = (el) => { const v = el.dataset.id || el.dataset.v; S.saved = v === 'unassigned' ? 'unassigned' : 'all'; S.f = v === 'pay' ? { payment: 'pending' } : {}; go('requests'); };
A.goAct = () => { S.bizTab = 'activation'; go('business'); };
A.openReq = (el) => openReq(el.dataset.id || el.dataset.v);
A.brief = () => openDrawer(() => {
  const att = attention(); const q = slaQueue();
  const byEmp = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, n: empOpen(t.id).length, late: empOpen(t.id).filter(isLate).length }));
  return { head: `<div class="muted" style="font-size:12px">${wd(TODAY)}، ${dmy(TODAY)} — ${hijri(TODAY)}</div><h2 class="h-disp h2">موجز التشغيل</h2>`,
    body: `<div class="next-step" style="margin-bottom:18px"><div class="ic">${ic('alert')}</div><div><div class="lbl">أهم ما في اليوم</div><div class="t">${att[0] ? att[0].t : 'لا شيء عالق'}</div><div class="m">${att[0] ? att[0].m : ''}</div></div></div>
    <div class="dsec" style="margin-top:0"><h4>${ic('clock', 'width="15" height="15"')}أقرب المهل</h4>${q.map((x) => `<div class="li" data-a="openReq" data-id="${x.r.id}"><div class="ic">${ic(x.s.k === 'assign' ? 'user' : x.s.k === 'contact' ? 'phone' : 'refresh')}</div><div class="grow"><div class="t">${x.r.customer} — ${svName(x.r)}</div><div class="m">${x.s.l}</div></div><span class="badge ${x.s.over ? 'b-red' : 'b-gold'}">${x.s.over ? 'متأخر' : rel(x.s.due)}</span></div>`).join('')}</div>
    <div class="dsec"><h4>${ic('team', 'width="15" height="15"')}الفريق اليوم</h4>${byEmp.map(({ t, n, late }) => `<div class="li" data-a="member" data-id="${t.id}">${av(t.id, '', true)}<div class="grow"><div class="t">${t.name}</div><div class="m">${n} طلبات مفتوحة${late ? ` — ${late} تجاوزت المهلة` : ''}</div></div></div>`).join('')}</div>
    <div class="dsec"><h4>${ic('building', 'width="15" height="15"')}المنشآت</h4><p style="font-size:13px;line-height:1.8;color:var(--ink-2)">${BIZ_REQUESTS.filter((b) => b.status === 'new').length} طلبات منشآت جديدة، و${ACTIVATIONS.filter((a) => a.status !== 'activated' && a.status !== 'closed').length} طلبات تفعيل قيد المعالجة. اشتراك شركة طيف اللوجستية في مهلة سداد.</p></div>`,
    foot: `<button class="btn btn-p" data-a="drClose">ابدأ اليوم</button><span class="muted" style="font-size:12px;margin-inline-start:auto">يُحدَّث الموجز كل صباح 7:00</span>` };
});

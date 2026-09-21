/* ==========================================================
   الطلبات — الخدمات المباشرة وطلبات التوكيل
   ========================================================== */
const SAVED = {
  direct: [
    ['all', 'كل الطلبات', () => reqList('direct')],
    ['open', 'المفتوحة', () => openList('direct')],
    ['unassigned', 'بلا مسؤول', () => openList('direct').filter((r) => !r.assigned_to)],
    ['late', 'تجاوزت المهلة', () => openList('direct').filter(isLate)],
    ['mine', 'المسندة إليّ', () => reqList('direct').filter((r) => r.assigned_to === ME && isOpen(r))],
    ['pay', 'بانتظار الدفع', () => reqList('direct').filter(payWaiting)],
  ],
  cases: [
    ['all', 'كل القضايا', () => reqList('cases')],
    ['open', 'الجارية', () => openList('cases')],
    ['unassigned', 'بلا محامٍ', () => openList('cases').filter((r) => !r.assigned_to)],
    ['quote', 'بانتظار التسعير', () => reqList('cases').filter((r) => r.payment === 'pending_quote')],
    ['session', 'لها جلسة قادمة', () => reqList('cases').filter((r) => r.next_session && r.next_session >= TODAY)],
    ['late', 'تجاوزت المهلة', () => openList('cases').filter(isLate)],
  ],
};
const FDEF = {
  service: { l: 'النوع', opts: (k) => (k === 'cases' ? CASE_TYPES : SERVICES).map((s) => [s.key, s.name]) },
  status: { l: 'الحالة', opts: () => Object.entries(ST).map(([k, v]) => [k, v.l]) },
  assigned_to: { l: 'المسؤول', opts: () => [['', 'بلا مسؤول']].concat(TEAM.map((t) => [t.id, t.name])) },
  payment: { l: 'الدفع', opts: () => Object.entries(PAY).map(([k, v]) => [k, v.l]) },
  priority: { l: 'الأولوية', opts: () => Object.entries(PRI).map(([k, v]) => [k, v.l]) },
  source: { l: 'المصدر', opts: () => [...new Set(REQUESTS.map((r) => r.source))].map((s) => [s, SRC[s] || s]) },
};
function fLabel(k, kind) { const v = S.f[k]; if (v === undefined) return FDEF[k].l; const o = FDEF[k].opts(kind).find((x) => x[0] === v); return o ? o[1] : v; }
function filtered(kind) {
  let L = (SAVED[kind].find((s) => s[0] === S.saved) || SAVED[kind][0])[2]().slice();
  Object.entries(S.f).forEach(([k, v]) => {
    if (v === undefined) return;
    if (k === 'status' && v.includes(',')) { const set = v.split(','); L = L.filter((r) => set.includes(r.status)); return; }
    if (k === 'assigned_to' && v === '') { L = L.filter((r) => !r.assigned_to); return; }
    L = L.filter((r) => r[k] === v);
  });
  if (S.q) { const q = norm(S.q); L = L.filter((r) => norm([r.id, r.customer, r.phone, svName(r), r.details, r.stage || ''].join(' ')).includes(q)); }
  const srt = { new: (a, b) => b.created_at - a.created_at, old: (a, b) => a.created_at - b.created_at, pri: (a, b) => PRI[a.priority].o - PRI[b.priority].o || b.created_at - a.created_at, price: (a, b) => b.price - a.price, sla: (a, b) => (sla(a)?.due || 9e15) - (sla(b)?.due || 9e15) };
  return L.sort(srt[S.sort]);
}
const SORT_L = { new: 'الأحدث', old: 'الأقدم', pri: 'الأولوية', price: 'القيمة', sla: 'أقرب مهلة' };

VIEWS.requests = () => requestsPage('direct');
VIEWS.cases = () => requestsPage('cases');
function requestsPage(kind) {
  const cases = kind === 'cases';
  const L = kind === 'direct' ? reqList('direct') : reqList('cases');
  const lateN = L.filter((r) => isOpen(r) && isLate(r)).length;
  const views = cases ? [['list', 'قائمة', 'list'], ['board', 'مراحل', 'kanban'], ['cards', 'بطاقات', 'grid']] : [['list', 'قائمة', 'list'], ['board', 'مراحل', 'kanban']];
  return `<div class="page-h"><div><h1 class="h-disp h1">${cases ? 'طلبات توكيل القضايا' : 'الخدمات المباشرة'}</h1>
    <div class="sub">${L.length} طلبًا، منها ${L.filter(isOpen).length} مفتوح${lateN ? ` و<b style="color:var(--red)">${lateN}</b> تجاوز المهلة الداخلية` : ''}${cases ? '. تظهر بمسمى القضية الفعلي' : ''}</div></div>
    <div class="tools"><div class="seg">${views.map(([v, l, i]) => `<button class="${S.view === v ? 'on' : ''}" data-a="seg" data-k="view" data-v="${v}">${ic(i)}${l}</button>`).join('')}</div>
    <button class="btn btn-s" data-a="stub" data-m="جُهّز ملف CSV بالطلبات المعروضة">${ic('download')}تصدير</button>
    <button class="btn btn-p" data-a="quick" data-k="ext" data-kind="${kind}">${ic('plus')}طلب خارجي</button></div></div>
  <div class="saved">${SAVED[kind].map(([k, l, f]) => `<button class="${S.saved === k ? 'on' : ''}" data-a="savedPick" data-v="${k}">${l}<span class="n" ${k === 'late' && f().length ? 'style="color:var(--red);font-weight:600"' : ''}>${f().length}</span></button>`).join('')}</div>
  <div class="toolbar">
    <div class="inp-ico">${ic('search')}<input class="inp" id="reqQ" placeholder="رقم الطلب أو الاسم أو الجوال" value="${esc(S.q)}"></div>
    ${['status', 'assigned_to', 'service'].concat(Object.keys(FDEF).filter((k) => !['status', 'assigned_to', 'service'].includes(k) && S.f[k] !== undefined)).map((k) => `<button class="chip ${S.f[k] !== undefined ? 'on' : ''}" data-a="fPick" data-k="${k}">${fLabel(k, kind)}${S.f[k] !== undefined ? `<span class="x" data-a="fClear" data-k="${k}">${ic('x')}</span>` : ic('chevD')}</button>`).join('')}
    <button class="chip" data-a="fMore">${ic('filter')}مرشحات أخرى</button>
    ${Object.keys(S.f).length ? `<button class="btn btn-sm btn-q" data-a="fReset">مسح الكل</button>` : ''}
    <div class="end"><button class="btn btn-sm btn-q" data-a="sortPick">${ic('filter')}الترتيب: ${SORT_L[S.sort]}</button></div>
  </div>
  <div id="reqBody">${reqBody(kind)}</div>`;
}
function reqBody(kind) {
  const L = filtered(kind);
  if (!L.length) return empty('لا طلبات مطابقة', 'جرّب إزالة أحد الفلاتر أو تغيير كلمات البحث. البحث يشمل رقم الطلب والجوال ونص التفاصيل.', 'مسح الفلاتر', 'fReset');
  if (S.view === 'board') return reqBoard(L, kind);
  if (S.view === 'cards') return caseCards(L);
  return kind === 'cases' ? caseTable(L) : reqTable(L);
}
function slaCell(r) {
  const s = sla(r); if (!s) return `<div class="cell c-sla"><span class="muted">—</span></div>`;
  const mins = (s.due - nowDate()) / 6e4;
  return `<div class="cell c-sla"><b style="font-weight:600;${s.over ? 'color:var(--red)' : mins < 120 ? 'color:var(--amber)' : ''}">${s.over ? 'متأخر' : mins < 60 ? `${Math.round(mins)} د` : mins < 1440 ? `${Math.round(mins / 60)} س` : `${Math.round(mins / 1440)} ي`}</b><small>${slaShort(s)}</small></div>`;
}
function reqTable(L) {
  return `<div class="clist"><div class="chead rq"><span></span><span>الطلب والعميل</span><span>الخدمة</span><span>القيمة والدفع</span><span>الحالة</span><span class="c-sla">المهلة</span><span>المسؤول</span><span class="c-date">تاريخ الوصول</span><span></span></div>
  ${L.map((r) => `<div class="crow rq" data-a="openReq" data-id="${r.id}" data-ctx="req:${r.id}" data-peek="${r.id}">
    <span class="pri" style="background:${PRI[r.priority].c};${r.priority === 'normal' ? 'opacity:.35' : ''}" data-tip="أولوية ${PRI[r.priority].l}"></span>
    <div style="min-width:0" class="row gap8">${custAv(r)}<div style="min-width:0"><div class="ttl ell">${r.customer}${lexBadge(r.id)}${isLate(r) ? `<span class="flagi" data-tip="تجاوز المهلة الداخلية">${ic('alert')}</span>` : ''}</div><div class="par ell"><span class="ltr num">${r.id}</span>${["direct_services","cases"].includes(r.source) ? "" : " — " + (SRC[r.source] || r.source)}</div></div></div>
    <div class="cell"><span class="st" style="--c:${SV(r.service).c}">${svName(r)}</span></div>
    <div class="cell">${r.price ? `<b class="num" style="font-weight:600">${fmt(r.price)}</b> <small style="display:inline">ر.س</small>` : '<span class="muted">غير مسعّر</span>'}<small>${PAY[r.payment].l}</small></div>
    <div class="cell">${stBadge(r.status)}</div>
    ${slaCell(r)}
    <div class="cell">${r.assigned_to ? `<div class="row gap6">${av(r.assigned_to, 'sm')}<span>${U(r.assigned_to).short}</span></div>` : `<button class="btn btn-sm btn-s" data-a="assign" data-id="${r.id}">${ic('user')}إسناد</button>`}</div>
    <div class="cell c-date">${rel(r.created_at)}<small>${hm(r.created_at)}</small></div>
    <button class="icon-btn more" data-a="reqMenu" data-id="${r.id}">${ic('more')}</button></div>`).join('')}</div>`;
}
function caseTable(L) {
  return `<div class="clist"><div class="chead cs"><span></span><span>العميل والقضية</span><span>نوع القضية</span><span>الأتعاب</span><span>المرحلة</span><span class="c-sess">الجلسة القادمة</span><span>المحامي</span><span></span></div>
  ${L.map((r) => `<div class="crow cs" data-a="openReq" data-id="${r.id}" data-ctx="req:${r.id}" data-peek="${r.id}">
    <span class="pri" style="background:${PRI[r.priority].c};${r.priority === 'normal' ? 'opacity:.35' : ''}"></span>
    <div style="min-width:0" class="row gap8">${custAv(r)}<div style="min-width:0"><div class="ttl ell">${r.customer}${lexBadge(r.id)}</div><div class="par ell"><span class="ltr num">${r.id}</span> — ${r.details.slice(0, 46)}…</div></div></div>
    <div class="cell"><span class="st" style="--c:${SV(r.service).c}">${svName(r)}</span></div>
    <div class="cell">${r.price ? `<b class="num" style="font-weight:600">${fmt(r.price)}</b>` : `<span class="badge b-gold">بانتظار التسعير</span>`}<small>${r.price ? PAY[r.payment].l : ''}</small></div>
    <div class="cell"><b style="font-weight:500">${r.stage || ST[r.status].l}</b><small>${r.sessions ? `${r.sessions} جلسات محضورة` : 'لم تبدأ الجلسات'}</small></div>
    <div class="cell c-sess">${r.next_session ? `<b style="font-weight:600;${dayDiff(r.next_session) <= 3 ? 'color:var(--red)' : ''}">${rel(r.next_session)}</b><small>${dm(r.next_session)} — ${hm(r.next_session)}</small>` : '<span class="muted">لا يوجد موعد</span>'}</div>
    <div class="cell">${r.assigned_to ? `<div class="row gap6">${av(r.assigned_to, 'sm')}<span>${U(r.assigned_to).short}</span></div>` : `<button class="btn btn-sm btn-s" data-a="assign" data-id="${r.id}">${ic('user')}إحالة</button>`}</div>
    <button class="icon-btn more" data-a="reqMenu" data-id="${r.id}">${ic('more')}</button></div>`).join('')}</div>`;
}
function caseCards(L) {
  return `<div class="cards">${L.map((r, i) => `<div class="ccard" style="animation:rbIn .5s var(--ease-out) ${i * 30}ms both" data-a="openReq" data-id="${r.id}" data-ctx="req:${r.id}">
    <div class="row"><span class="st" style="--c:${SV(r.service).c}">${svName(r)}</span><span style="margin-inline-start:auto">${stBadge(r.status)}</span></div>
    <div class="row gap8">${custAv(r, 'lg')}<div style="min-width:0"><div class="ttl ell">${r.customer}</div><div class="muted" style="font-size:12px">${r.id}</div></div></div>
    <div class="muted" style="font-size:12.5px;line-height:1.6">${r.stage || 'لم تُحدد المرحلة بعد'}</div>
    <div class="foot">${ic('cal', 'width="14" height="14"')}<span class="grow">${r.next_session ? `${rel(r.next_session)} — ${hm(r.next_session)}` : 'لا جلسة محددة'}</span>${r.assigned_to ? av(r.assigned_to, 'sm') : '<span class="badge b-amber">بلا محامٍ</span>'}</div></div>`).join('')}</div>`;
}
function reqBoard(L, kind) {
  const cols = kind === 'cases' ? ['new', 'assigned', 'contacted', 'waiting', 'progress', 'review', 'done'] : ['new', 'assigned', 'contacted', 'waiting', 'progress', 'review', 'done'];
  return `<div class="kanban">${cols.map((k) => { const rs = L.filter((r) => r.status === k);
    return `<div class="kcol" data-drop="req" data-v="${k}"><div class="kcol-h"><i style="background:${ST[k].c}"></i>${ST[k].l}<span class="n">${rs.length}</span></div><div class="kcards">${rs.map((r) => `<div class="kcard" draggable="true" data-drag="${r.id}" data-a="openReq" data-id="${r.id}" data-ctx="req:${r.id}">
      <div class="row" style="margin-bottom:6px"><span class="pri-dot" style="background:${PRI[r.priority].c}"></span><span class="m grow ell">${svName(r)}</span>${isLate(r) ? `<span style="color:var(--red)" data-tip="تجاوز المهلة">${ic('alert', 'width="13" height="13"')}</span>` : ''}</div>
      <div class="ttl">${r.customer}</div>
      <div class="row" style="margin-top:10px"><span class="m grow">${r.price ? fmt(r.price) + ' ر.س' : 'غير مسعّر'} — ${rel(r.created_at)}</span>${r.assigned_to ? av(r.assigned_to, 'sm') : `<span class="badge b-amber" style="height:20px">بلا مسؤول</span>`}</div></div>`).join('') || '<div class="muted" style="font-size:12px;text-align:center;padding:20px 0">اسحب طلبًا إلى هنا</div>'}</div></div>`; }).join('')}</div>`;
}
window.PEEK = (el) => {
  const r = REQ(el.dataset.peek); if (!r) return '';
  const s = sla(r);
  return `<div class="row" style="margin-bottom:8px"><span class="st" style="--c:${SV(r.service).c}">${svName(r)}</span><span style="margin-inline-start:auto">${stBadge(r.status)}</span></div>
  <div style="font-weight:600;font-size:14px">${r.customer}</div><div class="muted" style="font-size:12px;margin-bottom:10px;line-height:1.6">${esc(r.details.slice(0, 110))}…</div>
  <dl class="kv" style="grid-template-columns:86px 1fr;font-size:12px;gap:6px"><dt>رقم الطلب</dt><dd class="ltr num">${r.id}</dd><dt>الجوال</dt><dd class="ltr num">${r.phone}</dd><dt>المسؤول</dt><dd>${r.assigned_to ? U(r.assigned_to).name : 'بلا مسؤول'}</dd>${s ? `<dt>المهلة</dt><dd style="${s.over ? 'color:var(--red)' : ''}">${slaShort(s)} — ${s.over ? 'متأخر' : rel(s.due)}</dd>` : ''}${r.attachments.length ? `<dt>المرفقات</dt><dd>${r.attachments.length} ملفات</dd>` : ''}</dl>`;
};
A.savedPick = (el) => { S.saved = el.dataset.v; rerender(); };
A.sortPick = (el) => openPop(el, Object.entries(SORT_L).map(([v, l]) => ({ l, on: S.sort === v, f: () => { S.sort = v; rerender(); } })));
A.fPick = (el) => { const k = el.dataset.k; openPop(el, [{ h: FDEF[k].l }, ...FDEF[k].opts(S.kind).map(([v, l]) => ({ l, on: S.f[k] === v, f: () => { S.f[k] = v; rerender(); } }))], { alignStart: true }); };
A.fClear = (el, e) => { e.stopPropagation(); delete S.f[el.dataset.k]; rerender(); };
A.fMore = (el) => openPop(el, [{ h: 'مرشحات أخرى' }, ...['payment', 'priority', 'source'].map((k) => ({ l: FDEF[k].l + (S.f[k] !== undefined ? ` — ${fLabel(k, S.kind)}` : ''), ic: k === 'payment' ? 'receipt' : k === 'priority' ? 'flag' : 'inbox', on: S.f[k] !== undefined, f: () => setTimeout(() => A.fPick({ dataset: { k } }), 10) }))]);
A.fReset = () => { S.f = {}; S.q = ''; S.saved = 'all'; rerender(); };
A.reqMenu = (el, e) => { e.stopPropagation(); openPop(el, CTX.req(el.dataset.id)); };
HOOKS.push((root) => { const q = $('#reqQ', root); if (!q) return; q.oninput = () => { S.q = q.value; const b = $('#reqBody'); b.innerHTML = reqBody(S.kind); after(b); }; });
HOOKS.push((root) => {
  let id = null;
  $$('[data-drag]', root).forEach((c) => { c.ondragstart = (e) => { id = c.dataset.drag; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); }; c.ondragend = () => { c.classList.remove('dragging'); $$('.kcol.over').forEach((k) => k.classList.remove('over')); }; });
  $$('[data-drop]', root).forEach((col) => {
    col.ondragover = (e) => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); };
    col.ondrop = (e) => { e.preventDefault(); col.classList.remove('over'); const rid = e.dataTransfer.getData('text/plain') || id; if (rid) setStatus(rid, col.dataset.v, true); };
  });
});
function setStatus(id, st, drag) {
  const r = REQ(id); if (r.status === st) return; const prev = r.status;
  if (st !== 'new' && !r.assigned_to && st !== 'cancelled') { toast('لا يمكن نقل طلب بلا مسؤول — أسنده أولًا', { info: true, action: ['إسناد', () => A.assign({ dataset: { id } })] }); return rerender(); }
  r.status = st; r.updated_at = nowDate();
  if (st === 'contacted' && !r.contacted_at) r.contacted_at = nowDate();
  if (st === 'done' || st === 'closed') { r.closed_at = nowDate(); r.closed_by = ME; }
  log('status', `غيّر حالة ${r.id} إلى ${ST[st].l}`);
  rerender(); if (drag) $(`[data-drag="${id}"]`)?.classList.add('landed');
  toast(`${r.customer} — أصبح الطلب «${ST[st].l}»`, { undo: () => { r.status = prev; if (st === 'done' || st === 'closed') { r.closed_at = null; r.closed_by = null; } rerender(); } });
}
function log(type, text) { LOG.unshift({ at: nowDate(), by: ME, type, text }); }

/* ==========================================================
   لوحة الطلب
   ========================================================== */
function reqPanel(id) {
  const r = REQ(id); const s = sla(r); const cases = r.kind === 'cases';
  const emp = r.assigned_to && U(r.assigned_to);
  const steps = ['new', 'assigned', 'contacted', 'progress', 'done'];
  const si = Math.max(0, steps.indexOf(['pending'].includes(r.status) ? 'new' : ['waiting', 'review'].includes(r.status) ? 'progress' : r.status === 'closed' ? 'done' : r.status));
  return {
    head: `<div class="row gap8" style="margin-bottom:6px"><span class="ltr num badge b-ghost">${r.id}</span>${stBadge(r.status)}${r.priority !== 'normal' ? priBadge(r.priority) : ''}${payBadge(r)}${r.source !== 'direct_services' && r.source !== 'cases' ? `<span class="badge b-gold">${SRC[r.source]}</span>` : ''}</div>
      <h2 class="h2" style="font-weight:600;line-height:1.4">${r.customer}</h2><div class="muted" style="font-size:13px">${svName(r)} — وصل ${rel(r.created_at)} ${hm(r.created_at)}</div>`,
    body: `${s && s.over ? `<div class="alert-bar" style="background:var(--red-bg);color:#7a2c1b;margin-bottom:16px">${ic('alert', 'style="color:var(--red)"')}<span>تجاوز الطلب مهلة <b>${slaShort(s)}</b> بـ ${Math.round(s.h - (s.k === 'assign' ? SLA.assign : s.k === 'contact' ? SLA.contact : SLA.close))} ساعة.</span></div>` : ''}
    <div class="steps" style="margin:0 0 18px">${['وارد', 'مسند', 'تواصل', 'تنفيذ', 'مكتمل'].map((l, i) => `${i ? '<em></em>' : ''}<span class="${i < si ? 'd' : i === si ? 'c' : ''}"><i>${i < si ? ic('check') : ''}</i>${l}</span>`).join('')}</div>
    <div class="meta-strip" style="grid-template-columns:repeat(3,1fr);row-gap:14px;margin:0 0 18px">
      <div><span>الجوال</span><b><span class="ltr num">${r.phone}</span><button class="copy" data-a="copy" data-v="${r.phone}" data-l="رقم الجوال" data-tip="نسخ">${ic('copy')}</button></b></div>
      <div><span>القيمة</span><b>${r.price ? fmt(r.price) + ' ر.س' : 'غير مسعّر'}</b></div>
      <div><span>حالة الدفع</span><b>${PAY[r.payment].l}</b></div>
      <div style="border-inline-start:0"><span>المسؤول</span><b>${emp ? av(r.assigned_to, 'sm') + emp.short : '<span style="color:var(--amber)">بلا مسؤول</span>'}</b></div>
      <div><span>${cases ? 'الجلسات' : 'آخر تحديث'}</span><b>${cases ? (r.sessions || 0) + ' جلسات' : rel(r.updated_at)}</b></div>
      <div><span>المهلة القادمة</span><b style="${s && s.over ? 'color:var(--red)' : ''}">${s ? (s.over ? 'متأخر — ' + slaShort(s) : rel(s.due) + ' — ' + slaShort(s)) : 'مغلق'}</b></div>
    </div>
    ${lexSection('req:' + r.id)}
    <div class="dsec"><h4>${ic('note', 'width="15" height="15"')}تفاصيل الطلب</h4><div class="note" style="margin:0"><p>${esc(r.details)}</p></div></div>
    ${cases ? caseFollowup(r) : ''}
    <div class="dsec"><h4>${ic('file', 'width="15" height="15"')}المرفقات<span class="badge b-ghost">${r.attachments.length}</span></h4>
      ${r.attachments.length ? r.attachments.map((f) => `<div class="li" data-a="stub" data-m="بدأ تنزيل ${esc(f)}"><div class="ic">${ic('file')}</div><div class="grow"><div class="t">${f}</div></div><span class="btn btn-sm btn-s">تنزيل</span></div>`).join('') : `<div class="dropzone" style="padding:16px">${ic('upload')}لا مرفقات — اسحب ملفًا هنا أو <button class="btn-link" data-a="stub" data-m="في النسخة المرتبطة يُرفع الملف إلى ملف الطلب">اختر من جهازك</button></div>`}</div>
    <div class="dsec"><h4>${ic('msg', 'width="15" height="15"')}الملاحظات الداخلية<span class="badge b-ghost">${r.notes.length}</span></h4>
      <div id="noteList">${r.notes.length ? r.notes.slice().reverse().map(noteHtml).join('') : '<p class="muted" style="font-size:13px;padding:4px 2px">لا ملاحظات بعد. اكتب أول ملاحظة ليعرف بقية الفريق أين وصل الطلب.</p>'}</div>
      <div style="margin-top:10px"><textarea class="inp" id="noteBox" placeholder="أضف ملاحظة داخلية لا تظهر للعميل…" style="min-height:70px"></textarea>
      <div class="row" style="margin-top:8px"><span class="muted" style="font-size:12px">تُسجَّل باسمك وتُضاف إلى سجل النشاط</span><button class="btn btn-sm btn-p" data-a="addNote" data-id="${r.id}" style="margin-inline-start:auto">إضافة ملاحظة</button></div></div></div>
    <div class="dsec"><h4>${ic('activity', 'width="15" height="15"')}مسار الطلب</h4><div class="tl" style="--prog:${(si / 4) * 100}%">${reqTimeline(r).map((e) => `<div class="tl-i ${e.st}"><div class="top"><b>${e.t}</b><time>${e.d ? dm(e.d) + ' — ' + hm(e.d) : 'لم يحدث بعد'}</time></div>${e.p ? `<p>${e.p}</p>` : ''}</div>`).join('')}</div></div>
    ${r.close_note ? `<div class="dsec"><h4>${ic('check', 'width="15" height="15"')}ملاحظة الإغلاق</h4><div class="note pin"><p>${esc(r.close_note)}</p><div class="by" style="margin:8px 0 0">${r.closed_by ? av(r.closed_by, 'sm') + U(r.closed_by).short : ''}<span>${r.closed_at ? dmy(r.closed_at) : ''}</span></div></div></div>` : ''}`,
    foot: isOpen(r)
      ? `${!r.assigned_to ? `<button class="btn btn-p" data-a="assign" data-id="${r.id}">${ic('user')}إسناد الطلب</button>` : `<button class="btn btn-p" data-a="statusModal" data-id="${r.id}">${ic('refresh')}تغيير الحالة</button><button class="btn btn-s" data-a="assign" data-id="${r.id}">${ic('users')}تغيير المسؤول</button>`}
         ${r.payment === 'pending_quote' ? `<button class="btn btn-g" data-a="quote" data-id="${r.id}">${ic('receipt')}تسعير</button>` : ''}
         <button class="btn ok" data-a="closeReq" data-id="${r.id}" style="margin-inline-start:auto">${ic('check')}إغلاق الطلب</button>`
      : `<span class="badge ${ST[r.status].b}">${ST[r.status].l}</span><span class="muted" style="font-size:12.5px">${r.closed_at ? 'أُغلق ' + rel(r.closed_at) : ''}</span><button class="btn btn-s" data-a="reopen" data-id="${r.id}" style="margin-inline-start:auto">${ic('refresh')}إعادة فتح</button>`,
  };
}
function reqTimeline(r) {
  const L = [{ t: 'وصل الطلب', d: r.created_at, p: `عبر ${SRC[r.source] || r.source}`, st: 'done' }];
  L.push(r.assigned_at ? { t: 'أُسند إلى ' + U(r.assigned_to).name, d: r.assigned_at, p: r.assigned_by ? 'بواسطة ' + U(r.assigned_by).short : '', st: 'done' } : { t: 'بانتظار الإسناد', d: null, st: 'now' });
  if (r.assigned_at) L.push(r.contacted_at ? { t: 'تم التواصل مع العميل', d: r.contacted_at, st: 'done' } : { t: 'بانتظار التواصل مع العميل', d: null, st: 'now' });
  if (r.contacted_at && isOpen(r)) L.push({ t: ST[r.status].l, d: r.updated_at, p: r.stage || '', st: 'now' });
  if (r.closed_at) L.push({ t: r.status === 'cancelled' ? 'أُلغي الطلب' : 'أُغلق الطلب', d: r.closed_at, p: r.closed_by ? 'بواسطة ' + U(r.closed_by).short : '', st: 'done' });
  else L.push({ t: 'الإغلاق', d: null, st: 'future' });
  return L;
}
function caseFollowup(r) {
  return `<div class="dsec"><h4>${ic('gavel', 'width="15" height="15"')}متابعة القضية<span class="muted" style="font-weight:400;font-size:11.5px">داخلية — لا تظهر للعميل</span></h4>
  <div class="kv" style="background:var(--sunk);padding:14px 16px;border-radius:12px;grid-template-columns:118px 1fr;margin-bottom:12px">
    <dt>المرحلة</dt><dd>${r.stage || 'لم تُحدد'}</dd>
    <dt>آخر جلسة</dt><dd>${r.last_session || '—'}</dd>
    <dt>الإجراء القادم</dt><dd>${r.next_action || 'لم يُحدد'}</dd>
    <dt>الجلسة القادمة</dt><dd>${r.next_session ? `${dmy(r.next_session)} — ${hm(r.next_session)} (${rel(r.next_session)})` : 'لا يوجد موعد'}</dd>
    <dt>آخر تحديث</dt><dd>${r.followup_by ? U(r.followup_by).name + ' — ' + ago(r.followup_at) : 'لم يُحدّث بعد'}</dd>
  </div>
  <button class="btn btn-s" data-a="caseEdit" data-id="${r.id}">${ic('pen')}تحديث متابعة القضية</button></div>`;
}
const noteHtml = (n) => `<div class="note ${n._new ? 'flash-in' : ''}" style="margin-bottom:8px"><div class="by">${av(n.by, 'sm')}<b style="color:var(--ink)">${U(n.by).short}</b><span>${ago(n.at)}</span></div><p style="font-size:13px">${esc(n.text)}</p></div>`;
function openReq(id, push) { DR.reqId = id; openDrawer(() => reqPanel(id), { wide: true, push: push && $('#drawer').classList.contains('show') }); lexAuto('req:' + id); }
A.addNote = (el) => {
  const r = REQ(el.dataset.id); const box = $('#noteBox'); const v = box.value.trim(); if (!v) return box.focus();
  const n = { by: ME, at: nowDate(), text: v, _new: true }; r.notes.push(n); r.updated_at = nowDate();
  log('note', `أضاف ملاحظة على ${r.id}`); refreshDrawer(); setTimeout(() => { n._new = false; }, 1500);
  toast('حُفظت الملاحظة', { undo: () => { r.notes.splice(r.notes.indexOf(n), 1); refreshDrawer(); } });
};
A.reopen = (el) => { const r = REQ(el.dataset.id); r.status = r.assigned_to ? 'progress' : 'new'; r.closed_at = null; r.closed_by = null; r.updated_at = nowDate(); log('status', `أعاد فتح ${r.id}`); refreshDrawer(); rerender(); toast('أُعيد فتح الطلب'); };

/* ---------- الإسناد ---------- */
A.assign = (el, e) => {
  e?.stopPropagation(); const r = REQ(el.dataset.id); let pick = r.assigned_to;
  const emps = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, n: empOpen(t.id).length, l: load(t.id) })).sort((a, b) => a.l - b.l);
  const body = () => `<p style="font-size:13px;color:var(--ink-2);margin-bottom:14px">مرتبة من الأقل ضغطًا إلى الأكثر. النسبة تقارن الطلبات المفتوحة بطاقة كل موظف.</p>
    <div class="assign-list">${emps.map(({ t, n, l }) => `<button class="assign-i ${pick === t.id ? 'on' : ''}" data-a="pickEmp" data-id="${t.id}">${av(t.id, 'lg', true)}
      <div class="grow"><b>${t.name}</b><div class="muted" style="font-size:12px">${t.role} — ${t.skills.join('، ')}</div>
      <div class="hbar" style="margin-top:7px"><i style="width:${Math.min(100, l)}%;background:${l > 95 ? 'var(--red)' : l > 70 ? 'var(--gold)' : 'var(--green)'}"></i></div></div>
      <div style="text-align:center;min-width:52px"><b style="font-size:18px;font-weight:600" class="num">${n}</b><div class="muted" style="font-size:11px">مفتوح</div></div>
      ${pick === t.id ? `<span style="color:var(--green)">${ic('check')}</span>` : ''}</button>`).join('')}</div>`;
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">إسناد الطلب</h3><div class="muted" style="font-size:13px">${r.customer} — ${svName(r)}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
    <div class="m-b" id="assignBody">${body()}</div>
    <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-g" data-a="autoAssign" data-id="${r.id}">${ic('sparkle')}توزيع تلقائي</button><button class="btn btn-p" data-a="doAssign" data-id="${r.id}">تأكيد الإسناد</button></div>`, 'lg');
  A.pickEmp = (b) => { pick = b.dataset.id; $('#assignBody').innerHTML = body(); };
  A.doAssign = (b) => { if (!pick) return toast('اختر موظفًا أولًا', { info: true }); assignTo(b.dataset.id, pick); };
};
function assignTo(id, emp) {
  const r = REQ(id); const prev = r.assigned_to;
  r.assigned_to = emp; r.assigned_by = ME; r.assigned_at = nowDate(); r.updated_at = nowDate();
  if (['new', 'pending'].includes(r.status)) r.status = 'assigned';
  log('assigned', `أسند ${r.id} إلى ${U(emp).name}`);
  closeModal(); refreshDrawer(); rerender();
  toast(`أُسند إلى ${U(emp).name}`, { undo: () => { r.assigned_to = prev; r.assigned_at = null; if (!prev) r.status = 'new'; refreshDrawer(); rerender(); } });
}
A.autoAssign = (el) => {
  const r = REQ(el.dataset.id);
  const best = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, l: load(t.id) })).sort((a, b) => a.l - b.l)[0];
  assignTo(r.id, best.t.id);
  toast(`وزّع النظام الطلب على ${best.t.short} — الأقل ضغطًا في الفريق`, { info: true });
};
A.autoAll = () => {
  const un = REQUESTS.filter((r) => !r.assigned_to && isOpen(r));
  const done = un.map((r) => { const best = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, l: load(t.id) })).sort((a, b) => a.l - b.l)[0];
    r.assigned_to = best.t.id; r.assigned_by = ME; r.assigned_at = nowDate(); r.updated_at = nowDate(); r.status = 'assigned'; return r; });
  log('assigned', `وزّع ${done.length} طلبات تلقائيًا على الفريق`);
  rerender(); toast(`وُزّع ${done.length} طلبات على الفريق حسب الحِمل`, { undo: () => { done.forEach((r) => { r.assigned_to = null; r.assigned_at = null; r.status = 'new'; }); rerender(); } });
};
A.remindTeam = () => toast('أُرسل تذكير للمسؤولين عن الطلبات غير المتواصل بشأنها');
A.remindClients = () => { REQUESTS.filter((r) => r.status === 'waiting').forEach((r) => { r.updated_at = nowDate(); }); rerender(); toast('أُرسلت رسائل تذكير للعملاء بالمستندات الناقصة'); };
A.rebalance = () => {
  const from = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, l: load(t.id) })).sort((a, b) => b.l - a.l)[0];
  const to = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, l: load(t.id) })).sort((a, b) => a.l - b.l)[0];
  const move = empOpen(from.t.id).filter((r) => r.priority === 'normal').slice(0, 2);
  if (!move.length) return toast('لا توجد طلبات عادية قابلة للنقل الآن', { info: true });
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">اقتراح إعادة توزيع</h3><div class="muted" style="font-size:13px">لموازنة الحِمل بين ${from.t.short} و${to.t.short}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="row gap16" style="margin-bottom:16px">${[[from.t, from.l], [to.t, to.l]].map(([t, l], i) => `<div class="sunk pad grow" style="text-align:center">${av(t.id, 'lg')}<div style="font-weight:600;margin-top:6px">${t.name}</div><div class="muted" style="font-size:12px">${empOpen(t.id).length} طلبات — حِمل ${l}%</div></div>${i === 0 ? `<div style="align-self:center;color:var(--gold)">${ic('arrowL', 'width="22" height="22"')}</div>` : ''}`).join('')}</div>
  <div class="sec-t" style="margin-bottom:8px">الطلبات المقترح نقلها</div>${move.map((r) => `<div class="li"><div class="ic">${ic('file')}</div><div class="grow"><div class="t">${r.customer} — ${svName(r)}</div><div class="m">${ST[r.status].l} — ${rel(r.created_at)}</div></div></div>`).join('')}</div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">ليس الآن</button><button class="btn btn-p" data-a="doRebalance" data-from="${from.t.id}" data-to="${to.t.id}">نقل الطلبين</button></div>`, 'lg');
  A.doRebalance = (el) => { move.forEach((r) => { r.assigned_to = el.dataset.to; r.assigned_at = nowDate(); r.updated_at = nowDate(); }); log('assigned', `نقل ${move.length} طلبات من ${U(el.dataset.from).short} إلى ${U(el.dataset.to).short}`); closeModal(); rerender(); toast(`نُقل ${move.length} طلبات إلى ${U(el.dataset.to).short}`); };
};

/* ---------- تغيير الحالة والإغلاق والتسعير ---------- */
A.statusModal = (el) => {
  const r = REQ(el.dataset.id);
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">تغيير حالة الطلب</h3><div class="muted" style="font-size:13px">${r.customer} — ${r.id}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="field" style="margin-bottom:14px"><label>الحالة الجديدة</label><div class="toggle-chips" id="stPick">${Object.entries(ST).filter(([k]) => k !== 'closed').map(([k, v]) => `<button class="chip ${r.status === k ? 'on' : ''}" data-a="stPick" data-v="${k}">${v.l}</button>`).join('')}</div></div>
  <div class="field"><label>تعليق على التغيير</label><textarea class="inp" id="stNote" placeholder="سبب التغيير أو آخر مستجدات الطلب — يُحفظ كملاحظة داخلية"></textarea></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="doStatus" data-id="${r.id}">حفظ التغيير</button></div>`);
  let pick = r.status;
  A.stPick = (b) => { pick = b.dataset.v; $$('#stPick .chip').forEach((c) => c.classList.toggle('on', c === b)); };
  A.doStatus = (b) => { const note = $('#stNote').value.trim(); const rr = REQ(b.dataset.id);
    if (note) rr.notes.push({ by: ME, at: nowDate(), text: note });
    closeModal(); setStatus(rr.id, pick); refreshDrawer(); };
};
A.closeReq = (el) => {
  const r = REQ(el.dataset.id);
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">إغلاق الطلب</h3><div class="muted" style="font-size:13px">${r.customer} — ${svName(r)}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="field" style="margin-bottom:14px"><label>نتيجة الطلب</label><div class="toggle-chips" id="resPick"><button class="chip on" data-a="resPick" data-v="done">مكتمل بنجاح</button><button class="chip" data-a="resPick" data-v="closed">مغلق دون اكتمال</button><button class="chip" data-a="resPick" data-v="cancelled">ملغي</button></div></div>
  <div class="field"><label>ملاحظة الإغلاق <span style="color:var(--red)">*</span></label><textarea class="inp" id="clNote" placeholder="ملخص ما أُنجز في الطلب — يظهر في ملف الطلب وسجل النشاط" autofocus></textarea></div>
  <div class="sunk" style="padding:12px 14px;margin-top:14px;font-size:12.5px;color:var(--ink-2);line-height:1.8">${ic('sparkle', 'width="14" height="14" style="display:inline;vertical-align:-2px;color:var(--gold-dk)"')} عند الإغلاق بنتيجة «مكتمل» تدخل قيمة الطلب (${r.price ? fmt(r.price) + ' ر.س' : 'غير مسعّر'}) في المبالغ المكتسبة.</div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn ok" data-a="doClose" data-id="${r.id}">${ic('check')}تأكيد الإغلاق</button></div>`);
  let res = 'done';
  A.resPick = (b) => { res = b.dataset.v; $$('#resPick .chip').forEach((c) => c.classList.toggle('on', c === b)); };
  A.doClose = (b) => {
    const note = $('#clNote').value.trim(); if (!note) { toast('اكتب ملاحظة الإغلاق قبل التأكيد', { info: true }); return $('#clNote').focus(); }
    const rr = REQ(b.dataset.id); const prev = { st: rr.status, at: rr.closed_at }; rr.status = res; rr.close_note = note; rr.closed_at = nowDate(); rr.closed_by = ME; rr.updated_at = nowDate();
    log('closed', `أغلق ${rr.id} بنتيجة ${ST[res].l}`); closeModal(); refreshDrawer(); rerender();
    toast(`أُغلق الطلب — ${ST[res].l}`, { undo: () => { rr.status = prev.st; rr.closed_at = prev.at; rr.close_note = null; refreshDrawer(); rerender(); } });
  };
};
A.quote = (el) => {
  const r = REQ(el.dataset.id || el.dataset.v);
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">تسعير الطلب</h3><div class="muted" style="font-size:13px">${r.customer} — ${svName(r)}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="note" style="margin-bottom:14px"><p style="font-size:13px">${esc(r.details)}</p></div>
  <div class="form-grid"><div class="field"><label>الأتعاب قبل الضريبة</label><input class="inp num" id="qA" value="18000" inputmode="numeric"></div><div class="field"><label>طريقة السداد</label><select class="inp"><option>دفعة واحدة</option><option selected>دفعتان</option><option>على مراحل القضية</option></select></div>
  <div class="field full sunk" style="padding:12px 14px" id="qVat"></div></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="doQuote" data-id="${r.id}">إرسال عرض الأتعاب</button></div>`);
  const a = $('#qA'), v = $('#qVat');
  const p = () => { const n = +a.value.replace(/\D/g, '') || 0; v.innerHTML = `<div class="row" style="font-size:13px"><span class="grow muted">ضريبة القيمة المضافة 15%</span><b class="num">${fmt(n * 0.15)}</b></div><div class="row" style="font-size:13px;margin-top:4px"><span class="grow">الإجمالي</span><b class="num">${fmt(n * 1.15)} ر.س</b></div>`; };
  p(); a.oninput = p;
  A.doQuote = (b) => { const rr = REQ(b.dataset.id); rr.price = Math.round((+$('#qA').value.replace(/\D/g, '') || 0) * 1.15); rr.payment = 'manual_pending'; rr.stage = 'بانتظار اعتماد العميل لعرض الأتعاب'; rr.updated_at = nowDate();
    log('status', `أرسل عرض أتعاب لـ ${rr.id} بقيمة ${fmt(rr.price)} ر.س`); closeModal(); refreshDrawer(); rerender(); toast(`أُرسل عرض الأتعاب — ${fmt(rr.price)} ر.س شامل الضريبة`); };
};
A.caseEdit = (el) => {
  const r = REQ(el.dataset.id);
  openDrawer(() => ({ head: `<div class="muted" style="font-size:12px">تحديث متابعة القضية</div><h2 class="h2" style="font-weight:600">${r.customer} — ${svName(r)}</h2>`,
    body: `<div class="prep-sec"><label><i></i>المرحلة التي وصلت لها القضية</label><input class="inp" id="cStage" value="${esc(r.stage || '')}" placeholder="مثال: تم قيد الدعوى / بانتظار الجلسة الأولى / صدر حكم ابتدائي"></div>
    <div class="prep-sec"><label><i></i>أبرز ما حصل في آخر جلسة</label><textarea class="inp" id="cLast" placeholder="مثال: حضرنا الجلسة وطلبت الدائرة إرفاق مستندات خلال 5 أيام…">${esc(r.last_session || '')}</textarea></div>
    <div class="form-grid"><div class="field"><label>عدد الجلسات المحضورة</label><input class="inp num" id="cSess" type="number" min="0" value="${r.sessions || 0}"></div>
    <div class="field"><label>موعد الجلسة القادمة</label><input class="inp" id="cNext" type="date" value="${r.next_session ? r.next_session.toISOString().slice(0, 10) : ''}"></div>
    <div class="field full"><label>الإجراء القادم</label><input class="inp" id="cAct" value="${esc(r.next_action || '')}" placeholder="مثال: إعداد مذكرة رد / رفع مستند / انتظار موعد الجلسة"></div></div>
    <div class="sunk" style="padding:12px 14px;margin-top:16px;font-size:12.5px;color:var(--ink-2);line-height:1.8">${ic('lock', 'width="14" height="14" style="display:inline;vertical-align:-2px"')} هذه البيانات داخلية لفريق أعراف ولا تظهر للعميل في حسابه.</div>`,
    foot: `<button class="btn btn-q" data-a="drBack">إلغاء</button><button class="btn btn-p" data-a="saveCase" data-id="${r.id}" style="margin-inline-start:auto">حفظ المتابعة</button>` }), { wide: true, push: true });
};
A.saveCase = (el) => {
  const r = REQ(el.dataset.id);
  r.stage = $('#cStage').value.trim(); r.last_session = $('#cLast').value.trim(); r.sessions = +$('#cSess').value || 0;
  r.next_action = $('#cAct').value.trim(); const d = $('#cNext').value;
  r.next_session = d ? new Date(d + 'T10:00') : null; r.followup_by = ME; r.followup_at = nowDate(); r.updated_at = nowDate();
  log('case', `حدّث متابعة قضية ${r.customer}`); drawerBack(); rerender(); toast('حُفظت متابعة القضية');
};

/* ==========================================================
   المنشآت — الاشتراكات والطلبات وطلبات التفعيل
   ========================================================== */
const quotaTotal = (e, k) => PLANS[e.plan].quota[k] ?? 0;
const quotaUsed = (e, k) => e.usage[k] || 0;
function quotaState(e, k) {
  const t = quotaTotal(e, k), u = quotaUsed(e, k);
  if (t === -1) return { l: 'بلا حدود', pct: 18, c: 'var(--green)', free: true };
  if (t === 0) return { l: 'غير مشمولة', pct: 0, c: 'var(--faint)', off: true };
  const pct = Math.min(100, Math.round((u / t) * 100));
  return { l: `${u} من ${t}`, pct, c: pct >= 100 ? 'var(--red)' : pct >= 75 ? 'var(--gold)' : 'var(--green)', full: u >= t };
}
const entReqs = (id) => BIZ_REQUESTS.filter((b) => b.entity === id);
const SUB_ST = { active: { l: 'اشتراك نشط', b: 'b-green' }, grace: { l: 'مهلة سداد', b: 'b-amber' }, paused: { l: 'موقوف', b: 'b-red' } };

VIEWS.business = () => {
  const tabs = [['requests', 'طلبات المنشآت', BIZ_REQUESTS.filter((b) => !['completed', 'cancelled'].includes(b.status)).length],
    ['entities', 'المنشآت والاشتراكات', ENTITIES.length],
    ['activation', 'طلبات التفعيل', ACTIVATIONS.filter((a) => a.status === 'new' || a.status === 'contacted').length]];
  const mrr = ENTITIES.filter((e) => e.sub === 'active').reduce((a, b) => a + PLANS[b.plan].price, 0);
  return `<div class="page-h"><div><h1 class="h-disp h1">المنشآت</h1><div class="sub">${ENTITIES.length} منشآت مشتركة في أعراف للأعمال، وإيراد شهري متكرر ${sar(mrr)}</div></div>
    <div class="tools"><button class="btn btn-s" data-a="stub" data-m="جُهّز تقرير استهلاك الباقات">${ic('download')}تقرير الاستهلاك</button><button class="btn btn-p" data-a="quick" data-k="ent">${ic('plus')}تفعيل منشأة</button></div></div>
  <div class="seg" style="margin-bottom:20px">${tabs.map(([k, l, n]) => `<button class="${S.bizTab === k ? 'on' : ''}" data-a="seg" data-k="bizTab" data-v="${k}">${l}<span class="muted" style="font-size:11px;margin-inline-start:4px">${n}</span></button>`).join('')}</div>
  ${{ requests: bizRequests, entities: bizEntities, activation: bizActivation }[S.bizTab]()}`;
};
function bizRequests() {
  const L = BIZ_REQUESTS.filter((b) => S.bizF === 'all' || (S.bizF === 'open' ? !['completed', 'cancelled'].includes(b.status) : S.bizF === 'extra' ? b.quota_type === 'extra' : b.status === S.bizF)).sort((a, b) => b.created_at - a.created_at);
  const groups = ['new', 'under_review', 'in_progress', 'awaiting_client', 'completed'];
  return `<div class="saved">${[['all', 'الكل'], ['open', 'الجارية'], ['new', 'الجديدة'], ['awaiting_client', 'بانتظار المنشأة'], ['extra', 'خارج الحصة']].map(([k, l]) => `<button class="${S.bizF === k ? 'on' : ''}" data-a="seg" data-k="bizF" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="kanban" style="margin-bottom:26px">${groups.map((g) => { const rs = L.filter((b) => b.status === g);
    return `<div class="kcol"><div class="kcol-h"><i style="background:${BIZ_ST[g].c}"></i>${BIZ_ST[g].l}<span class="n">${rs.length}</span></div><div class="kcards">${rs.map((b) => { const e = ENT(b.entity);
      return `<div class="kcard" data-a="openBiz" data-id="${b.id}" data-ctx="biz:${b.id}"><div class="row" style="margin-bottom:6px"><span class="pri-dot" style="background:${PRI[b.priority].c}"></span><span class="m grow ell">${BIZ_SERVICES[b.service]}</span>${b.quota_type === 'extra' ? '<span class="badge b-gold" style="height:19px">خارج الحصة</span>' : ''}</div>
      <div class="ttl">${b.subject}</div><div class="row" style="margin-top:9px"><span class="m grow ell">${e.name}</span>${b.assigned_to ? av(b.assigned_to, 'sm') : '<span class="badge b-amber" style="height:20px">بلا مسؤول</span>'}</div></div>`; }).join('') || '<div class="muted" style="font-size:12px;text-align:center;padding:18px 0">لا طلبات</div>'}</div></div>`; }).join('')}</div>`;
}
function bizEntities() {
  return `<div class="ent-grid">${ENTITIES.map((e) => { const p = PLANS[e.plan]; const rs = entReqs(e.id); const open = rs.filter((r) => !['completed', 'cancelled'].includes(r.status)).length;
    const keys = Object.keys(p.quota).filter((k) => p.quota[k] !== 0).slice(0, 6);
    const days = dayDiff(e.cycle_end);
    return `<article class="ent" data-a="openEnt" data-id="${e.id}" data-ctx="ent:${e.id}">
      <div class="row gap12" style="align-items:flex-start">${orgAv(e.name, 'lg')}<div class="grow" style="min-width:0"><div class="row gap6"><b style="font-size:15px">${e.name}</b>${e.sub !== 'active' ? `<span class="badge ${SUB_ST[e.sub].b}">${SUB_ST[e.sub].l}</span>` : ''}</div>
      <div class="muted" style="font-size:12px">${e.type} — <span class="ltr num">${e.code}</span> — ${e.city}</div></div>
      <span class="badge" style="background:color-mix(in srgb,${p.c} 14%,#fff);color:${p.c}">${p.name}</span></div>
      <div class="q-grid">${keys.map((k) => { const q = quotaState(e, k);
        return `<div data-tip="${esc(BIZ_SERVICES[k] + ': ' + q.l)}"><div class="row" style="font-size:11.5px"><span class="grow ell muted">${BIZ_SERVICES[k].replace('صياغة أو مراجعة ', '').replace('إعداد أو مراجعة ', '')}</span><b style="font-weight:600;${q.full ? 'color:var(--red)' : ''}">${q.free ? '∞' : quotaUsed(e, k)}</b></div>
        <div class="hbar" style="height:5px;margin-top:4px"><i class="growX" style="width:${q.pct}%;background:${q.c}"></i></div></div>`; }).join('')}</div>
      <div class="foot"><span class="row gap6">${av(e.manager, 'sm')}<span class="muted" style="font-size:12px">${U(e.manager).short}</span></span>
      <span class="muted" style="font-size:12px;margin-inline-start:auto">${open} طلبات جارية</span>
      <span class="badge ${days <= 5 ? 'b-amber' : 'b-ghost'}">تجديد ${rel(e.cycle_end)}</span></div></article>`; }).join('')}</div>`;
}
function bizActivation() {
  const L = ACTIVATIONS.filter((a) => S.bizF === 'all' ? true : S.bizF === 'pending' ? ['new', 'contacted'].includes(a.status) : a.status === S.bizF);
  return `<div class="saved">${[['pending', 'قيد المعالجة'], ['new', 'جديدة'], ['activated', 'مفعّلة'], ['closed', 'مغلقة'], ['all', 'الكل']].map(([k, l]) => `<button class="${(S.bizF === k || (S.bizF === 'all' && k === 'all')) ? 'on' : ''}" data-a="seg" data-k="bizF" data-v="${k}">${l}<span class="n">${ACTIVATIONS.filter((a) => k === 'all' ? true : k === 'pending' ? ['new', 'contacted'].includes(a.status) : a.status === k).length}</span></button>`).join('')}</div>
  ${L.length ? L.map((a) => `<div class="req act-row" data-ctx="act:${a.id}"><div class="row gap12" style="min-width:0">${orgAv(a.name)}<div style="min-width:0"><div class="row gap6"><b>${a.name}</b><span class="badge ${ACT_ST[a.status].b}">${ACT_ST[a.status].l}</span></div>
    <div class="muted" style="font-size:12px">${a.type} — سجل <span class="ltr num">${a.cr}</span> — ${a.contact} — <span class="ltr num">${a.phone}</span></div>
    <div class="muted" style="font-size:12px;margin-top:2px">${a.note}</div></div></div>
    <div class="rstep">${['طلب جديد', 'تم التواصل', 'مفعّل'].map((l, i) => { const idx = { new: 0, contacted: 1, activated: 2, closed: 1 }[a.status]; return `<span class="${i < idx ? 'd' : i === idx ? (a.status === 'closed' ? 'w' : 'c') : ''}"><i></i>${l}</span>`; }).join('')}</div>
    <div class="row gap6">${a.status === 'new' ? `<button class="btn btn-sm btn-s" data-a="actContact" data-id="${a.id}">${ic('phone')}تم التواصل</button>` : ''}
      ${['new', 'contacted'].includes(a.status) ? `<button class="btn btn-sm btn-p" data-a="actActivate" data-id="${a.id}">${ic('check')}تفعيل</button><button class="btn btn-sm btn-q btn-danger" data-a="actClose" data-id="${a.id}">رفض</button>` : `<span class="muted" style="font-size:12px">${dm(a.at)}</span>`}</div></div>`).join('')
    : empty('لا طلبات تفعيل هنا', 'ستظهر هنا طلبات المنشآت الراغبة في الاشتراك فور وصولها من الموقع.')}`;
}
A.openEnt = (el) => {
  const e = ENT(el.dataset.id); const p = PLANS[e.plan]; const rs = entReqs(e.id);
  openDrawer(() => ({ head: `<div class="row gap12">${orgAv(e.name, 'lg')}<div><h2 class="h2" style="font-weight:600">${e.name}</h2><div class="muted" style="font-size:13px">${p.name} — ${SUB_ST[e.sub].l} — <span class="ltr num">${e.code}</span></div></div></div>`,
    body: `<div class="kpi-strip" style="grid-template-columns:repeat(3,1fr)"><div><span>الاشتراك الشهري</span><b>${fmt(p.price)}</b></div><div><span>طلبات هذه الدورة</span><b>${rs.length}</b></div><div><span>تجديد الدورة</span><b style="font-size:15px">${dm(e.cycle_end)}</b></div></div>
    <div class="dsec" style="margin-top:0"><h4>استهلاك الباقة</h4>${Object.keys(p.quota).map((k) => { const q = quotaState(e, k); if (q.off) return '';
      return `<div style="margin-bottom:10px"><div class="row" style="font-size:12.5px"><span class="grow">${BIZ_SERVICES[k]}</span><b style="${q.full ? 'color:var(--red)' : ''}">${q.l}</b></div><div class="hbar" style="margin-top:5px"><i style="width:${q.pct}%;background:${q.c}"></i></div></div>`; }).join('')}
      <p class="muted" style="font-size:12px;line-height:1.7;margin-top:10px">الخدمات غير المشمولة في الباقة تُسعَّر خارج الحصة، ولا يبدأ تنفيذها قبل موافقة المنشأة.</p></div>
    <div class="dsec"><h4>بيانات التواصل</h4><dl class="kv"><dt>جهة الاتصال</dt><dd>${e.contact}</dd><dt>الجوال</dt><dd class="ltr num">${e.phone}</dd><dt>السجل التجاري</dt><dd class="ltr num">${e.cr}</dd><dt>مدير الحساب</dt><dd class="row gap6">${av(e.manager, 'sm')}${U(e.manager).name}</dd><dt>بداية الاشتراك</dt><dd>${dmy(e.start)}</dd></dl></div>
    <div class="dsec"><h4>طلبات المنشأة</h4>${rs.map((b) => `<div class="li" data-a="openBiz" data-id="${b.id}"><div class="ic">${ic('file')}</div><div class="grow"><div class="t">${b.subject}</div><div class="m">${BIZ_SERVICES[b.service]} — ${rel(b.created_at)}</div></div><span class="badge ${BIZ_ST[b.status].b}">${BIZ_ST[b.status].l}</span></div>`).join('') || '<p class="muted" style="font-size:13px">لا طلبات في هذه الدورة.</p>'}</div>`,
    foot: `<button class="btn btn-p" data-a="stub" data-m="فُتحت محادثة مع ${esc(e.contact)}">${ic('msg')}مراسلة المنشأة</button>${e.sub === 'grace' ? `<button class="btn btn-g" data-a="stub" data-m="أُرسل تذكير سداد إلى ${esc(e.name)}">${ic('receipt')}تذكير سداد</button>` : ''}<button class="btn btn-q" data-a="stub" data-m="ستُتاح إدارة الباقة بعد الربط" style="margin-inline-start:auto">تغيير الباقة</button>` }), { wide: true });
};
A.openBiz = (el) => {
  const b = BIZ_REQUESTS.find((x) => x.id === el.dataset.id); const e = ENT(b.entity); const q = quotaState(e, b.service);
  openDrawer(() => ({ head: `<div class="row gap8" style="margin-bottom:6px"><span class="ltr num badge b-ghost">${b.no}</span><span class="badge ${BIZ_ST[b.status].b}">${BIZ_ST[b.status].l}</span>${b.quota_type === 'extra' ? '<span class="badge b-gold">خارج الحصة</span>' : '<span class="badge b-green">ضمن الباقة</span>'}</div>
    <h2 class="h2" style="font-weight:600">${b.subject}</h2><div class="muted" style="font-size:13px">${e.name} — ${BIZ_SERVICES[b.service]}</div>`,
    body: `<div class="note" style="margin-bottom:16px"><p style="font-size:13.5px">${esc(b.details)}</p></div>${lexSection('biz:' + b.id)}
    <div class="dsec" style="margin-top:0"><h4>أثر الطلب على الحصة</h4>
      <div class="sunk pad row gap16">${ring(q.pct, 86, 8, q.c, 'var(--sunk-2)', `<b style="font-size:16px">${q.free ? '∞' : q.pct + '%'}</b>`)}
      <div style="font-size:13px;line-height:1.8"><div><b>${BIZ_SERVICES[b.service]}</b></div><div class="muted">المستهلك هذه الدورة: ${q.l}</div>
      <div style="margin-top:4px">${b.counted ? '<span class="badge b-green">خُصمت وحدة من الحصة</span>' : q.full || b.quota_type === 'extra' ? '<span class="badge b-red">تجاوز الحصة — يحتاج تسعيرًا</span>' : '<span class="badge b-amber">لم تُخصم بعد</span>'}</div></div></div></div>
    <div class="dsec"><h4>البيانات</h4><dl class="kv"><dt>المنشأة</dt><dd>${e.name} (${PLANS[e.plan].name})</dd><dt>المسؤول</dt><dd>${b.assigned_to ? U(b.assigned_to).name : 'بلا مسؤول'}</dd><dt>وصل</dt><dd>${dmy(b.created_at)} — ${hm(b.created_at)}</dd><dt>الأولوية</dt><dd>${PRI[b.priority].l}</dd></dl></div>
    ${b.internal_note ? `<div class="dsec"><h4>ملاحظة داخلية</h4><div class="note pin"><p style="font-size:13px">${esc(b.internal_note)}</p></div></div>` : ''}
    <div class="dsec"><h4>ملاحظة تظهر للمنشأة</h4><textarea class="inp" id="bizNote" placeholder="تُعرض في حساب المنشأة عند متابعتها للطلب…">${esc(b.client_note)}</textarea></div>`,
    foot: `${!b.assigned_to ? `<button class="btn btn-p" data-a="bizAssign" data-id="${b.id}">${ic('user')}إسناد</button>` : `<button class="btn btn-p" data-a="bizStatus" data-id="${b.id}">${ic('refresh')}تغيير الحالة</button>`}
      ${b.quota_type === 'extra' ? `<button class="btn btn-g" data-a="stub" data-m="أُرسل عرض السعر للمنشأة">${ic('receipt')}تسعير إضافي</button>` : ''}
      <button class="btn btn-s" data-a="saveBizNote" data-id="${b.id}" style="margin-inline-start:auto">حفظ الملاحظة</button>` }), { wide: true }); lexAuto('biz:' + b.id);
};
A.saveBizNote = (el) => { const b = BIZ_REQUESTS.find((x) => x.id === el.dataset.id); b.client_note = $('#bizNote').value.trim(); toast('حُفظت الملاحظة وستظهر للمنشأة'); };
A.bizAssign = (el) => { const b = BIZ_REQUESTS.find((x) => x.id === el.dataset.id); openPop(el, TEAM.filter((t) => t.status === 'active').map((t) => ({ l: `${t.name} — ${empOpen(t.id).length} مفتوح`, ic: 'user', f: () => { b.assigned_to = t.id; b.status = 'under_review'; refreshDrawer(); rerender(); toast(`أُسند طلب المنشأة إلى ${t.name}`); } })), { alignStart: true }); };
A.bizStatus = (el) => { const b = BIZ_REQUESTS.find((x) => x.id === el.dataset.id); openPop(el, Object.entries(BIZ_ST).filter(([k]) => k !== b.status).map(([k, v]) => ({ l: v.l, f: () => { const prev = b.status; b.status = k; b.updated_at = nowDate(); if (k === 'in_progress') b.counted = true; refreshDrawer(); rerender(); toast(`أصبح الطلب «${v.l}»`, { undo: () => { b.status = prev; refreshDrawer(); rerender(); } }); } })), { alignStart: true }); };
A.actContact = (el) => { const a = ACTIVATIONS.find((x) => x.id === el.dataset.id); a.status = 'contacted'; a.note = 'تم التواصل وطُلبت المستندات.'; rerender(); toast(`سُجل التواصل مع ${a.name}`); };
A.actClose = (el) => { const a = ACTIVATIONS.find((x) => x.id === el.dataset.id); const prev = a.status; a.status = 'closed'; rerender(); toast('أُغلق طلب التفعيل', { undo: () => { a.status = prev; rerender(); } }); };
A.actActivate = (el) => {
  const a = ACTIVATIONS.find((x) => x.id === el.dataset.id);
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">تفعيل ${a.name}</h3><div class="muted" style="font-size:13px">سجل تجاري <span class="ltr num">${a.cr}</span> — ${a.contact}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="form-grid"><div class="field"><label>الباقة</label><select class="inp" id="aPlan">${Object.values(PLANS).map((p) => `<option value="${p.key}" ${a.plan === p.key ? 'selected' : ''}>${p.name} — ${fmt(p.price)} ر.س</option>`).join('')}</select></div>
  <div class="field"><label>مدير الحساب</label><select class="inp" id="aMgr">${TEAM.filter((t) => t.status === 'active').map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
  <div class="field"><label>بداية الدورة</label><input class="inp" type="date" id="aStart" value="2026-09-16"></div>
  <div class="field"><label>البريد للدخول</label><input class="inp ltr" dir="ltr" style="text-align:left" value="${esc(a.email)}"></div></div>
  <div class="ops-note">${ic('lock', 'width="14" height="14"')}<span>سيُنشأ حساب المنشأة وتُولَّد كلمة مرور مؤقتة تُعرض لك مرة واحدة فقط لتسليمها لجهة الاتصال.</span></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="doActivate" data-id="${a.id}">تفعيل الحساب</button></div>`, 'lg');
};
A.doActivate = (el) => {
  const a = ACTIVATIONS.find((x) => x.id === el.dataset.id); const plan = $('#aPlan').value; const mgr = $('#aMgr').value;
  a.status = 'activated'; a.plan = plan; a.note = 'فُعّل الحساب وسُلّمت بيانات الدخول.';
  const id = 'ENT-00' + (ENTITIES.length + 1);
  ENTITIES.push({ id, code: 'ARF-10' + (ENTITIES.length + 1), name: a.name, type: a.type, plan, sub: 'active', manager: mgr, phone: a.phone, contact: a.contact, start: TODAY, cycle_end: new Date(2026, 9, 16), city: a.city, cr: a.cr, usage: {} });
  const pw = 'Araf' + Math.floor(1000 + Math.random() * 9000) + '!';
  log('employee', `فعّل حساب المنشأة ${a.name}`);
  openModal(`<div class="m-b" style="padding-top:26px"><div class="ops-success">${ic('check', 'width="26" height="26"')}</div>
    <h3 class="h2" style="font-weight:600;text-align:center;margin-bottom:4px">فُعّل حساب ${a.name}</h3>
    <p class="muted" style="text-align:center;font-size:13px;margin-bottom:18px">هذه البيانات تُعرض مرة واحدة فقط — انسخها وسلّمها لجهة الاتصال.</p>
    <div class="cred"><span>البريد</span><strong class="ltr">${esc(a.email)}</strong><button class="btn btn-sm btn-s" data-a="copy" data-v="${esc(a.email)}" data-l="البريد">نسخ</button></div>
    <div class="cred"><span>كلمة المرور المؤقتة</span><strong class="ltr">${pw}</strong><button class="btn btn-sm btn-s" data-a="copy" data-v="${pw}" data-l="كلمة المرور">نسخ</button></div>
    <div class="ops-note" style="margin-top:14px">${ic('alert', 'width="14" height="14"')}<span>يُطلب من المنشأة تغيير كلمة المرور عند أول دخول.</span></div></div>
  <div class="m-f"><button class="btn btn-p" data-a="afterActivate" data-id="${id}">تم — فتح ملف المنشأة</button></div>`);
};
A.afterActivate = (el) => { closeModal(); S.bizTab = 'entities'; rerender(); setTimeout(() => A.openEnt({ dataset: { id: el.dataset.id } }), 200); toast('أُضيفت المنشأة إلى قائمة الاشتراكات'); };

/* ==========================================================
   الفريق
   ========================================================== */
VIEWS.team = () => {
  const rows = TEAM.map((u) => ({ u, open: empOpen(u.id), closed: empClosed(u.id), late: empOpen(u.id).filter(isLate).length, l: load(u.id) }));
  const tot = REQUESTS.filter((r) => r.closed_at).length;
  return `<div class="page-h"><div><h1 class="h-disp h1">الفريق</h1><div class="sub">${TEAM.filter((t) => t.status === 'active').length} أعضاء نشطين، و${tot} طلبًا مغلقًا هذا الشهر. الحِمل يقارن الطلبات المفتوحة بطاقة كل عضو</div></div>
    <div class="tools"><button class="btn btn-p" data-a="quick" data-k="emp">${ic('plus')}إضافة موظف</button></div></div>
  <div class="panel" style="padding:8px">${rows.map(({ u, open, closed, late, l }) => `<div class="team-row" data-a="member" data-id="${u.id}" data-ctx="emp:${u.id}">
    ${av(u.id, 'lg', true)}
    <div><div class="row gap6"><b style="font-size:14px">${u.name}</b>${u.roleKey === 'admin' ? '<span class="badge b-navy">مدير</span>' : ''}${u.status === 'inactive' ? '<span class="badge b-ghost">موقوف</span>' : ''}</div><div class="muted" style="font-size:12px">${u.role} — ${u.skills.join('، ')}</div></div>
    <div><div class="row" style="font-size:12px;margin-bottom:5px"><span class="muted grow">الحِمل</span><b style="color:${l > 95 ? 'var(--red)' : l > 70 ? 'var(--amber)' : 'var(--green)'}">${l}%</b></div><div class="hbar"><i style="width:${Math.min(100, l)}%;background:${l > 95 ? 'var(--red)' : l > 70 ? 'var(--gold)' : 'var(--green)'};transition:width 1s var(--ease-out)"></i></div></div>
    <div style="text-align:center"><b style="font-size:18px" class="num">${open.length}</b><div class="muted" style="font-size:11.5px">مفتوح</div></div>
    <div style="text-align:center"><b style="font-size:18px;${late ? 'color:var(--red)' : ''}" class="num">${late}</b><div class="muted" style="font-size:11.5px">متأخر</div></div>
    <div style="text-align:center"><b style="font-size:18px" class="num">${closed.length}</b><div class="muted" style="font-size:11.5px">مغلق</div></div></div>`).join('')}</div>
  <div class="grid g12" style="margin-top:28px">
    <section class="s7"><div class="sec-h"><div class="sec-t">توزيع الطلبات المفتوحة حسب الحالة</div></div>
      ${TEAM.filter((t) => t.status === 'active').map((u) => { const o = empOpen(u.id); return `<div class="stack-row"><span class="row gap6">${av(u.id, 'sm')}${u.short}</span><div class="stack">${OPEN_ST.map((s, i) => { const n = o.filter((r) => r.status === s).length; return n ? `<div style="flex:${n};background:${ST[s].c};animation-delay:${i * 40}ms" data-tip="${ST[s].l}: ${n}"></div>` : ''; }).join('')}<div style="flex:${Math.max(0, 8 - o.length)};background:transparent"></div></div><b class="num">${o.length}</b></div>`; }).join('')}
      <div class="legend" style="margin-top:10px">${OPEN_ST.map((s) => `<span><i style="--c:${ST[s].c}"></i>${ST[s].l}</span>`).join('')}</div></section>
    <section class="s5"><div class="sunk pad"><div class="sec-t" style="margin-bottom:6px">${ic('bulb', 'width="16" height="16"')}ملاحظة توزيع</div>
      <p style="font-size:13.5px;line-height:1.8">${(() => { const s = TEAM.filter((t) => t.status === 'active').map((t) => ({ t, l: load(t.id) })).sort((a, b) => b.l - a.l); return `<b>${s[0].t.name}</b> يحمل ${empOpen(s[0].t.id).length} طلبات مفتوحة مقابل ${empOpen(s[s.length - 1].t.id).length} لدى <b>${s[s.length - 1].t.name}</b>. نقل طلبين عاديين يوازن الفريق دون تغيير المسؤولية عن الطلبات الحساسة.`; })()}</p>
      <button class="btn btn-sm btn-p" style="margin-top:12px" data-a="rebalance">${ic('shuffle')}اقتراح إعادة توزيع</button></div></section></div>`;
};
function openMember(id) {
  const u = U(id); const open = empOpen(id); const closed = empClosed(id);
  const avgH = closed.length ? Math.round(closed.reduce((a, r) => a + (r.closed_at - r.created_at) / 36e5, 0) / closed.length) : 0;
  openDrawer(() => ({ head: `<div class="row gap12">${av(id, 'xl', true)}<div><h2 class="h2" style="font-weight:600">${u.name}</h2><div class="muted" style="font-size:13px">${u.role} — ${u.status === 'active' ? 'نشط' : 'موقوف'}</div></div></div>`,
    body: `<div class="kpi-strip" style="grid-template-columns:repeat(4,1fr)"><div><span>مفتوح</span><b>${open.length}</b></div><div><span>متأخر</span><b style="${open.filter(isLate).length ? 'color:var(--red)' : ''}">${open.filter(isLate).length}</b></div><div><span>مغلق</span><b>${closed.length}</b></div><div><span>متوسط الإغلاق</span><b>${avgH}<small style="font-size:12px"> س</small></b></div></div>
    <div class="dsec" style="margin-top:0"><h4>الطلبات المفتوحة</h4>${open.length ? open.map((r) => `<div class="li" data-a="openReq" data-id="${r.id}"><div class="ic">${ic(r.kind === 'cases' ? 'gavel' : 'file')}</div><div class="grow"><div class="t">${r.customer} — ${svName(r)}</div><div class="m">${ST[r.status].l} — ${rel(r.created_at)}</div></div>${isLate(r) ? '<span class="badge b-red">متأخر</span>' : ''}</div>`).join('') : '<p class="muted" style="font-size:13px">لا طلبات مفتوحة.</p>'}</div>
    <div class="dsec"><h4>البيانات</h4><dl class="kv"><dt>البريد</dt><dd class="ltr">${u.email}</dd><dt>الجوال</dt><dd class="ltr num">${u.phone}</dd><dt>التخصص</dt><dd>${u.skills.join('، ')}</dd><dt>الطاقة الاستيعابية</dt><dd>${u.cap} طلبًا</dd><dt>آخر دخول</dt><dd>${ago(u.last)}</dd><dt>انضم في</dt><dd>${dmy(u.joined)}</dd></dl></div>`,
    foot: `<button class="btn btn-p" data-a="stub" data-m="فُتحت محادثة مع ${esc(u.short)}">${ic('msg')}رسالة</button>${id !== ME ? `<button class="btn btn-s" data-a="stub" data-m="ستتاح إدارة الصلاحيات بعد الربط">${ic('lock')}الصلاحيات</button>` : ''}<span class="muted" style="font-size:12px;margin-inline-start:auto">${u.email}</span>` }), { wide: true });
}
A.member = (el) => openMember(el.dataset.id);

/* ==========================================================
   سجل النشاط
   ========================================================== */
VIEWS.activity = () => {
  const types = [['all', 'الكل'], ['created', 'طلبات واردة'], ['assigned', 'إسناد'], ['status', 'تغيير حالة'], ['closed', 'إغلاق'], ['note', 'ملاحظات']];
  const L = LOG.filter((l) => S.logF === 'all' || l.type === S.logF);
  const groups = {}; L.forEach((l) => { const k = sod(l.at).getTime(); (groups[k] = groups[k] || []).push(l); });
  return `<div class="page-h"><div><h1 class="h-disp h1">سجل النشاط</h1><div class="sub">كل عملية في النظام مسجَّلة باسم منفّذها ووقتها، ولا يمكن تعديلها أو حذفها</div></div>
    <div class="tools"><button class="btn btn-s" data-a="stub" data-m="جُهّز ملف CSV بسجل النشاط">${ic('download')}تصدير</button></div></div>
  <div class="saved">${types.map(([k, l]) => `<button class="${S.logF === k ? 'on' : ''}" data-a="seg" data-k="logF" data-v="${k}">${l}<span class="n">${LOG.filter((x) => k === 'all' || x.type === k).length}</span></button>`).join('')}</div>
  ${Object.entries(groups).map(([k, items]) => `<div class="agenda-d"><h5>${rel(new Date(+k))} — ${wd(new Date(+k))} ${dm(new Date(+k))}</h5><div class="feed">${items.map((f) => logItem(f)).join('')}</div></div>`).join('') || empty('لا نشاط بهذا التصنيف', 'غيّر التصنيف لعرض بقية العمليات.')}`;
};

/* ==========================================================
   الدعم الفني
   ========================================================== */
const TK_ST = { open: { l: 'مفتوحة', b: 'b-amber' }, converted: { l: 'حُوّلت إلى طلب', b: 'b-blue' }, closed: { l: 'مغلقة', b: 'b-ghost' } };
VIEWS.support = () => {
  const L = TICKETS.filter((t) => S.tkF === 'all' || t.status === S.tkF);
  return `<div class="page-h"><div><h1 class="h-disp h1">الدعم الفني</h1><div class="sub">${TICKETS.filter((t) => t.status === 'open').length} تذاكر مفتوحة. التذكرة التي تحتاج عملًا قانونيًا تُحوَّل إلى طلب مسعّر</div></div></div>
  <div class="saved">${[['open', 'مفتوحة'], ['converted', 'محوّلة'], ['closed', 'مغلقة'], ['all', 'الكل']].map(([k, l]) => `<button class="${S.tkF === k ? 'on' : ''}" data-a="seg" data-k="tkF" data-v="${k}">${l}<span class="n">${TICKETS.filter((t) => k === 'all' || t.status === k).length}</span></button>`).join('')}</div>
  ${L.length ? `<div class="tk-grid">${L.map((t) => `<article class="tk" data-a="openTicket" data-id="${t.id}"><div class="row gap8"><span class="ltr num muted" style="font-size:11.5px">${t.id}</span><span class="badge ${TK_ST[t.status].b}">${TK_ST[t.status].l}</span><span class="muted" style="font-size:11.5px;margin-inline-start:auto">${ago(t.at)}</span></div>
    <b style="font-size:14.5px;line-height:1.5">${t.subject}</b><p class="muted" style="font-size:13px;line-height:1.7">${esc(t.body)}</p>
    <div class="foot">${orgAv(t.customer, 'sm', false)}<span style="font-size:12.5px">${t.customer}</span><span class="muted ltr num" style="font-size:12px">${t.phone}</span><span class="badge b-ghost" style="margin-inline-start:auto">${t.channel}</span></div></article>`).join('')}</div>`
    : empty('لا تذاكر هنا', 'ستظهر هنا تذاكر الدعم الواردة من نموذج الموقع وواتساب فور وصولها.')}`;
};
function openTicket(id) {
  const t = TICKETS.find((x) => x.id === id);
  openDrawer(() => ({ head: `<div class="row gap8" style="margin-bottom:6px"><span class="ltr num badge b-ghost">${t.id}</span><span class="badge ${TK_ST[t.status].b}">${TK_ST[t.status].l}</span><span class="badge b-ghost">${t.channel}</span></div><h2 class="h2" style="font-weight:600">${t.subject}</h2><div class="muted" style="font-size:13px">${t.customer} — ${ago(t.at)}</div>`,
    body: `<div class="note" style="margin-bottom:16px"><p style="font-size:13.5px">${esc(t.body)}</p></div>${lexSection('tk:' + t.id)}
    <dl class="kv"><dt>العميل</dt><dd>${t.customer}</dd><dt>الجوال</dt><dd class="ltr num">${t.phone}</dd><dt>القناة</dt><dd>${t.channel}</dd><dt>وصلت</dt><dd>${dmy(t.at)} — ${hm(t.at)}</dd></dl>
    <div class="dsec"><h4>الرد على العميل</h4><textarea class="inp" placeholder="اكتب ردًا يُرسل للعميل عبر ${t.channel}…" style="min-height:90px"></textarea></div>
    <div class="ops-note" style="margin-top:16px">${ic('bulb', 'width="14" height="14"')}<span>إن كانت التذكرة تحتاج عملًا قانونيًا مدفوعًا، حوّلها إلى طلب خدمة ليدخل في مسار الإسناد والمتابعة والفوترة.</span></div>`,
    foot: `${t.status === 'open' ? `<button class="btn btn-p" data-a="convert" data-id="${t.id}">${ic('shuffle')}تحويل إلى طلب</button><button class="btn btn-s" data-a="tkClose" data-id="${t.id}">${ic('check')}رد وإغلاق</button>` : `<span class="badge ${TK_ST[t.status].b}">${TK_ST[t.status].l}</span>`}<button class="btn btn-q" data-a="stub" data-m="سيُفتح واتساب برقم العميل" style="margin-inline-start:auto">${ic('phone')}اتصال</button>` }), { wide: true }); lexAuto('tk:' + id);
}
A.openTicket = (el) => openTicket(el.dataset.id || el.dataset.v);
A.tkClose = (el) => { const t = TICKETS.find((x) => x.id === el.dataset.id); t.status = 'closed'; closeDrawer(); rerender(); toast('أُرسل الرد وأُغلقت التذكرة'); };
A.convert = (el) => {
  const t = TICKETS.find((x) => x.id === el.dataset.id);
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">تحويل التذكرة إلى طلب</h3><div class="muted" style="font-size:13px">${t.customer} — ${t.phone}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="note" style="margin-bottom:16px"><p style="font-size:13px">${esc(t.body)}</p></div>
  <div class="form-grid"><div class="field full"><label>تصنيف الخدمة</label><select class="inp" id="cvSv">${SERVICES.map((s) => `<option value="${s.key}">${s.name} — ${fmt(s.price)} ر.س</option>`).join('')}</select></div>
  <div class="field"><label>السعر</label><input class="inp num" id="cvPrice" value="100"></div>
  <div class="field"><label>حالة الدفع</label><select class="inp" id="cvPay"><option value="pending">بانتظار التحقق</option><option value="manual_pending">بانتظار الدفع</option><option value="paid">مدفوع</option></select></div></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="doConvert" data-id="${t.id}">تحويل إلى طلب</button></div>`, 'lg');
  setTimeout(() => { const sv = $('#cvSv'); sv.onchange = () => { $('#cvPrice').value = SV(sv.value).price; }; }, 30);
  A.doConvert = (b) => {
    const tk = TICKETS.find((x) => x.id === b.dataset.id); tk.status = 'converted';
    const r = R({ customer: tk.customer, phone: tk.phone, service: $('#cvSv').value, status: 'new', created_at: nowDate(), source: 'support_ticket', payment: $('#cvPay').value, price: +$('#cvPrice').value || 0, details: tk.body });
    REQUESTS.unshift(r); log('created', `حوّل تذكرة ${tk.id} إلى طلب ${r.id}`); lexNew('req:' + r.id);
    closeModal(); closeDrawer(); rerender();
    toast(`أُنشئ الطلب ${r.id}`, { action: ['فتح الطلب', () => openReq(r.id)] });
  };
};

/* ==========================================================
   مركز الإشعارات
   ========================================================== */
let ntab = 'urgent';
const NG = [['urgent', 'عاجل'], ['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['team', 'الفريق'], ['system', 'النظام']];
function notifPanel() {
  const L = NOTIFS.filter((n) => n.g === ntab);
  return { head: `<div class="row"><h2 class="h2 grow" style="font-weight:600">الإشعارات</h2><button class="btn btn-sm btn-q" data-a="readAll">تعليم الكل كمقروء</button></div>`,
    body: `<div class="ntabs" style="margin:-18px -22px 10px">${NG.map(([k, l]) => { const n = NOTIFS.filter((x) => x.g === k && x.unread).length; return `<button class="${ntab === k ? 'on' : ''}" data-a="ntab" data-v="${k}">${l}${n ? `<span class="n ${k === 'urgent' ? 'hot' : ''}">${n}</span>` : ''}</button>`; }).join('')}</div>
    ${L.length ? L.map((n) => `<div class="nt ${n.unread ? 'unread' : ''} ${n.done ? 'done-state' : ''}"><div class="ic">${n.from ? av(n.from) : ic(n.ic)}</div><div><p>${n.t}</p><time>${ago(n.at)}</time>
      ${n.acts ? `<div class="acts">${n.acts.map(([l, a, p]) => `<button class="btn btn-sm ${p ? 'btn-p' : 'btn-s'}" data-a="nAct" data-v="${a}" data-nid="${n.id}">${l}</button>`).join('')}</div>` : ''}<div class="res">${ic('check')}${n.done || ''}</div></div></div>`).join('')
      : empty(ntab === 'urgent' ? 'لا شيء عاجل' : 'لا إشعارات هنا', ntab === 'urgent' ? 'كل الطلبات ضمن مهلها الداخلية الآن.' : 'ستظهر هنا التحديثات فور حدوثها.')}` };
}
function openNotifs() { openDrawer(notifPanel); }
function refreshNotifs() { if (DR.stack.length && DR.stack[DR.stack.length - 1].render === notifPanel) refreshDrawer(); paintNav(); }
A.notifs = openNotifs;
A.ntab = (el) => { ntab = el.dataset.v; refreshDrawer(); };
A.readAll = () => { NOTIFS.forEach((n) => (n.unread = false)); refreshNotifs(); toast('عُلّمت كل الإشعارات كمقروءة'); };
A.nAct = (el) => {
  const [k, v] = el.dataset.v.split(':'); const n = NOTIFS.find((x) => x.id === el.dataset.nid); n.unread = false; paintNav();
  if (k === 'approve') { n.done = 'اعتُمد'; refreshNotifs(); return toast('اعتُمدت المذكرة وأُبلغت سارة'); }
  closeDrawer();
  if (k === 'req') openReq(v);
  if (k === 'ticket') openTicket(v);
  if (k === 'ent') { S.bizTab = 'entities'; go('business'); setTimeout(() => A.openEnt({ dataset: { id: v } }), 250); }
  if (k === 'nav') { if (v === 'business') S.bizTab = 'activation'; go(v); }
  if (k === 'pay') { S.f = { payment: 'pending' }; go('requests'); }
  if (k === 'reset') resetRequests();
};

/* ==========================================================
   لوحة الأوامر
   ========================================================== */
const CMDS = [
  ['رسالة جديدة لعضو في الفريق', 'mail', () => composeLetter()], ['صندوق الرسائل', 'inbox', () => A.inbox()],
  ['إضافة طلب خارجي', 'plus', () => quickAdd('ext')], ['إضافة موظف', 'users', () => quickAdd('emp')], ['تفعيل منشأة', 'building', () => quickAdd('ent')],
  ['توزيع الطلبات غير المسندة تلقائيًا', 'sparkle', () => A.autoAll()], ['موجز التشغيل', 'sun', () => A.brief()], ['الإشعارات', 'bell', openNotifs],
  ...NAV.filter((n) => n !== '-').map((n) => [`الانتقال إلى ${n.l}`, n.ic, () => go(n.r)]),
  ['طلب تصفير عداد الطلبات', 'refresh', () => resetRequests()], ['اختصارات لوحة المفاتيح', 'keyboard', () => shortcuts()],
];
let cmdIdx = 0, cmdItems = [];
function openCmd() {
  const w = $('#cmd');
  w.innerHTML = `<div class="cmd"><div class="cmd-in">${ic('search')}<input id="cmdQ" placeholder="ابحث في الطلبات والعملاء والمنشآت والتذاكر، أو اكتب أمرًا" autocomplete="off"><span class="kbd">Esc</span></div><div class="cmd-res" id="cmdRes"></div>
  <div class="cmd-foot"><span><span class="kbd">↑↓</span>تنقل</span><span><span class="kbd">Enter</span>فتح</span><span><span class="kbd">Esc</span>إغلاق</span><span style="margin-inline-start:auto">جرّب: «0189» أو «الغامدي» أو «رواسي»</span></div></div>`;
  w.classList.add('show'); w.onclick = (e) => { if (e.target === w) closeCmd(); };
  const q = $('#cmdQ'); q.focus(); q.oninput = () => cmdSearch(q.value);
  q.onkeydown = (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); cmdIdx = Math.min(cmdItems.length - 1, cmdIdx + 1); cmdPaint(); } if (e.key === 'ArrowUp') { e.preventDefault(); cmdIdx = Math.max(0, cmdIdx - 1); cmdPaint(); } if (e.key === 'Enter') { e.preventDefault(); cmdRun(cmdIdx); } };
  cmdSearch('');
}
function closeCmd() { $('#cmd').classList.remove('show'); }
A.cmd = openCmd;
const hl = (t, q) => { if (!q) return esc(t); const i = norm(t).indexOf(norm(q)); if (i < 0) return esc(t); return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
function cmdSearch(qq) {
  const nq = norm(qq.trim()); const m = (s) => !nq || norm(s).includes(nq); const G = [];
  if (!nq) {
    const un = REQUESTS.filter((r) => !r.assigned_to && isOpen(r)).sort((a, b) => a.created_at - b.created_at)[0];
    G.push(['مقترحات الآن', [
      un ? { t: `${un.customer} — ${svName(un)}`, m: `بلا مسؤول منذ ${Math.round(hoursSince(un.created_at))} ساعة`, ic: 'alert', f: () => openReq(un.id) } : null,
      { t: 'توزيع كل الطلبات غير المسندة', m: `${REQUESTS.filter((r) => !r.assigned_to && isOpen(r)).length} طلبات`, ic: 'sparkle', f: () => A.autoAll() },
      { t: 'طلبات التفعيل الجديدة', m: `${ACTIVATIONS.filter((a) => a.status === 'new').length} منشآت بانتظار المعالجة`, ic: 'building', f: () => { S.bizTab = 'activation'; go('business'); } },
    ].filter(Boolean)]);
    G.push(['أوامر', CMDS.slice(0, 5).map(([t, i, f]) => ({ t, ic: i, f }))]);
  } else {
    const rs = REQUESTS.filter((r) => m(r.id + ' ' + r.customer + ' ' + r.phone + ' ' + svName(r) + ' ' + r.details)).slice(0, 6).map((r) => ({ t: `${r.customer} — ${svName(r)}`, m: `${r.id} — ${ST[r.status].l}${r.assigned_to ? ' — ' + U(r.assigned_to).short : ' — بلا مسؤول'}`, ic: r.kind === 'cases' ? 'gavel' : 'file', f: () => openReq(r.id) }));
    const es = ENTITIES.filter((e) => m(e.name + ' ' + e.code + ' ' + e.contact)).slice(0, 4).map((e) => ({ t: e.name, m: `${PLANS[e.plan].name} — ${e.code}`, ic: 'building', f: () => { S.bizTab = 'entities'; go('business'); setTimeout(() => A.openEnt({ dataset: { id: e.id } }), 220); } }));
    const ts = TEAM.filter((t) => m(t.name + ' ' + t.role)).slice(0, 3).map((t) => ({ t: t.name, m: `${t.role} — ${empOpen(t.id).length} طلبات مفتوحة`, ic: 'user', f: () => openMember(t.id) }));
    const tk = TICKETS.filter((t) => m(t.subject + ' ' + t.customer + ' ' + t.body)).slice(0, 3).map((t) => ({ t: t.subject, m: `${t.id} — ${t.customer}`, ic: 'msg', f: () => openTicket(t.id) }));
    const cm = CMDS.filter(([t]) => m(t)).slice(0, 4).map(([t, i, f]) => ({ t, ic: i, f }));
    [['الطلبات', rs], ['المنشآت', es], ['الفريق', ts], ['الدعم', tk], ['أوامر', cm]].forEach((g) => g[1].length && G.push(g));
  }
  cmdItems = G.flatMap((g) => g[1]); cmdIdx = 0; let i = 0;
  $('#cmdRes').innerHTML = cmdItems.length ? G.map(([l, items]) => `<div class="cmd-g">${l}</div>` + items.map((it) => `<div class="cmd-i" data-ci="${i++}"><div class="ic">${ic(it.ic)}</div><div class="grow" style="min-width:0"><div class="t ell">${hl(it.t, qq.trim())}</div>${it.m ? `<div class="m ell">${it.m}</div>` : ''}</div><span class="go">فتح ${ic('chevL', 'width="12" height="12"')}</span></div>`).join('')).join('')
    : `<div class="empty" style="padding:34px">${emptyArt()}<b>لا نتائج لـ «${esc(qq)}»</b><p>جرّب رقم الطلب أو جزءًا من اسم العميل أو رقم الجوال. البحث يتجاهل الهمزات والتاء المربوطة.</p></div>`;
  $$('#cmdRes .cmd-i').forEach((el) => { el.onmouseenter = () => { cmdIdx = +el.dataset.ci; cmdPaint(false); }; el.onclick = () => cmdRun(+el.dataset.ci); });
  cmdPaint();
}
function cmdPaint(scroll = true) { $$('#cmdRes .cmd-i').forEach((el) => el.classList.toggle('act', +el.dataset.ci === cmdIdx)); if (scroll) $('#cmdRes .cmd-i.act')?.scrollIntoView({ block: 'nearest' }); }
function cmdRun(i) { const it = cmdItems[i]; if (!it) return; closeCmd(); closeDrawer(); setTimeout(it.f, 60); }

/* ==========================================================
   الإضافة السريعة
   ========================================================== */
const QA = [['letter', 'رسالة لعضو', 'mail'], ['ext', 'طلب خارجي', 'plus'], ['case', 'طلب توكيل', 'gavel'], ['ent', 'تفعيل منشأة', 'building'], ['emp', 'موظف', 'users'], ['ticket', 'تذكرة دعم', 'msg']];
A.fab = () => {
  const f = $('#fab');
  if (!f.classList.contains('open')) { $('#fabMenu').innerHTML = QA.map(([k, l, i], j) => `<button data-a="quick" data-k="${k}" style="transition-delay:${(QA.length - j) * 25}ms"><span class="ic">${ic(i)}</span>${l}</button>`).join(''); requestAnimationFrame(() => f.classList.add('open')); }
  else closeFab();
};
function closeFab() { $('#fab')?.classList.remove('open'); }
A.quick = (el) => { closeFab(); if (el.dataset.k === 'letter') return composeLetter(); quickAdd(el.dataset.k, el.dataset); };
const teamOpts = (sel = ME) => TEAM.filter((t) => t.status === 'active').map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.name}</option>`).join('');
function quickAdd(kind, ds = {}) {
  closeDrawer();
  const svOpts = (list) => list.map((s) => `<option value="${s.key}">${s.name} — ${fmt(s.price)} ر.س</option>`).join('');
  const F = {
    ext: ['إضافة طلب خارجي', `<div class="field"><label>مكان الأرشفة</label><select class="inp" id="qKind"><option value="direct" ${ds.kind === 'cases' ? '' : 'selected'}>الخدمات المباشرة</option><option value="cases" ${ds.kind === 'cases' ? 'selected' : ''}>طلبات التوكيل</option></select></div>
      <div class="field"><label>مصدر الطلب</label><select class="inp" id="qSrc">${EXT_SRC.map((s) => `<option value="${s}">${SRC[s]}</option>`).join('')}</select></div>
      <div class="field"><label>اسم العميل</label><input class="inp" id="qName" autofocus placeholder="اكتب اسم العميل أو المنشأة"></div>
      <div class="field"><label>رقم الجوال</label><input class="inp ltr num" id="qPhone" dir="ltr" style="text-align:left" placeholder="05XXXXXXXX"></div>
      <div class="field"><label>التصنيف</label><select class="inp" id="qSv">${svOpts(ds.kind === 'cases' ? CASE_TYPES : SERVICES)}</select></div>
      <div class="field"><label>السعر</label><input class="inp num" id="qPrice" value="100" inputmode="numeric"></div>
      <div class="field"><label>حالة الدفع</label><select class="inp" id="qPay"><option value="manual_pending">بانتظار الدفع</option><option value="paid">مدفوع</option><option value="pending_quote">بانتظار التسعير</option></select></div>
      <div class="field"><label>الأولوية</label><select class="inp" id="qPri">${Object.entries(PRI).reverse().map(([k, v]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${v.l}</option>`).join('')}</select></div>
      <div class="field full"><label>تفاصيل الطلب</label><textarea class="inp" id="qDet" placeholder="وصف مختصر لما يطلبه العميل"></textarea></div>`],
    case: ['طلب توكيل جديد', `<div class="field"><label>اسم العميل</label><input class="inp" id="qName" autofocus></div>
      <div class="field"><label>رقم الجوال</label><input class="inp ltr num" id="qPhone" dir="ltr" style="text-align:left"></div>
      <div class="field"><label>نوع القضية</label><select class="inp" id="qSv">${svOpts(CASE_TYPES)}</select></div>
      <div class="field"><label>المحامي</label><select class="inp" id="qEmp"><option value="">لاحقًا</option>${teamOpts('')}</select></div>
      <div class="field full"><label>ملخص القضية</label><textarea class="inp" id="qDet"></textarea></div>`],
    ent: ['تفعيل منشأة', `<div class="field"><label>اسم المنشأة</label><input class="inp" id="qName" autofocus></div>
      <div class="field"><label>نوع المنشأة</label><select class="inp" id="qType"><option>شركة</option><option>مؤسسة</option><option>جمعية</option></select></div>
      <div class="field"><label>السجل التجاري</label><input class="inp ltr num" id="qCr" dir="ltr" style="text-align:left"></div>
      <div class="field"><label>جهة الاتصال</label><input class="inp" id="qContact"></div>
      <div class="field"><label>الجوال</label><input class="inp ltr num" id="qPhone" dir="ltr" style="text-align:left"></div>
      <div class="field"><label>الباقة</label><select class="inp" id="qPlan">${Object.values(PLANS).map((p) => `<option value="${p.key}">${p.name} — ${fmt(p.price)} ر.س</option>`).join('')}</select></div>`],
    emp: ['إضافة موظف', `<div class="field"><label>الاسم الكامل</label><input class="inp" id="qName" autofocus placeholder="مثال: سارة الزهراني"></div>
      <div class="field"><label>البريد الإلكتروني</label><input class="inp ltr" id="qEmail" dir="ltr" style="text-align:left" placeholder="name@araf.sa"></div>
      <div class="field"><label>رقم الجوال</label><input class="inp ltr num" id="qPhone" dir="ltr" style="text-align:left"></div>
      <div class="field"><label>الدور</label><select class="inp" id="qRole"><option value="employee">موظف</option><option value="admin">مدير</option></select></div>
      <div class="field full ops-note">${ic('lock', 'width="14" height="14"')}<span>تُنشأ كلمة مرور مؤقتة وتُرسل إلى بريد الموظف، ويُطلب تغييرها عند أول دخول.</span></div>`],
    ticket: ['تذكرة دعم', `<div class="field"><label>اسم العميل</label><input class="inp" id="qName" autofocus></div>
      <div class="field"><label>الجوال</label><input class="inp ltr num" id="qPhone" dir="ltr" style="text-align:left"></div>
      <div class="field"><label>القناة</label><select class="inp" id="qCh"><option>واتساب</option><option>اتصال</option><option>بريد</option></select></div>
      <div class="field"><label>الموضوع</label><input class="inp" id="qSubject"></div>
      <div class="field full"><label>نص المشكلة</label><textarea class="inp" id="qDet"></textarea></div>`],
  }[kind];
  openModal(`<div class="m-h"><h3 class="h2 grow" style="font-weight:600">${F[0]}</h3><button class="icon-btn" data-a="mClose">${ic('x')}</button></div><div class="m-b"><div class="form-grid">${F[1]}</div></div>
  <div class="m-f"><span class="muted" style="font-size:12px;margin-inline-end:auto"><span class="kbd">Ctrl Enter</span> للحفظ</span><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="qaSave" data-k="${kind}">حفظ</button></div>`, 'lg');
  setTimeout(() => {
    const kd = $('#qKind'), sv = $('#qSv'), pr = $('#qPrice');
    if (kd && sv) kd.onchange = () => { sv.innerHTML = svOpts(kd.value === 'cases' ? CASE_TYPES : SERVICES); if (pr) pr.value = SV(sv.value).price; };
    if (sv && pr) sv.onchange = () => { pr.value = SV(sv.value).price; };
    if (sv && pr) pr.value = SV(sv.value).price;
  }, 30);
  $('#modal').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) A.qaSave({ dataset: { k: kind } }); };
}
A.qaSave = (el) => {
  const k = el.dataset.k; const v = (id) => $('#' + id)?.value?.trim?.() ?? '';
  if (k === 'ext' || k === 'case') {
    if (!v('qName')) return $('#qName').focus();
    const kind = k === 'case' ? 'cases' : v('qKind');
    const r = R({ kind, customer: v('qName'), phone: v('qPhone') || '—', service: v('qSv'), status: 'new', created_at: nowDate(),
      source: k === 'case' ? 'cases' : v('qSrc'), payment: k === 'case' ? 'pending_quote' : v('qPay'), price: k === 'case' ? 0 : (+v('qPrice') || 0),
      priority: k === 'case' ? 'normal' : v('qPri'), details: v('qDet') || 'طلب مضاف يدويًا من مركز العمليات.', org: /^(شركة|مؤسسة|مجموعة|جمعية|مصنع)/.test(v('qName')) });
    if (k === 'case' && v('qEmp')) { r.assigned_to = v('qEmp'); r.assigned_by = ME; r.assigned_at = nowDate(); r.status = 'assigned'; }
    REQUESTS.unshift(r); log('created', `أضاف طلبًا خارجيًا ${r.id} — ${r.customer}`); lexNew('req:' + r.id);
    closeModal(); S.kind = kind; go(kind === 'cases' ? 'cases' : 'requests');
    toast(`أُضيف الطلب ${r.id}`, { action: ['فتح', () => openReq(r.id)] });
  }
  if (k === 'ent') {
    if (!v('qName')) return $('#qName').focus();
    const a = { id: 'ACT-' + (1042 + ACTIVATIONS.length), name: v('qName'), type: v('qType'), cr: v('qCr') || '—', contact: v('qContact') || '—', phone: v('qPhone') || '—', email: 'info@example.sa', plan: v('qPlan'), status: 'new', at: nowDate(), city: 'الرياض', note: 'أُضيف يدويًا من مركز العمليات.' };
    ACTIVATIONS.unshift(a); closeModal(); S.bizTab = 'activation'; S.bizF = 'pending'; go('business');
    toast('أُضيف طلب التفعيل — أكمل التفعيل لإنشاء الحساب');
  }
  if (k === 'emp') {
    if (!v('qName')) return $('#qName').focus();
    const id = 'EMP-0' + (10 + TEAM.length);
    TEAM.push({ id, name: v('qName'), short: v('qName').split(' ')[0], ini: v('qName')[0], role: v('qRole') === 'admin' ? 'مدير' : 'موظف', roleKey: v('qRole'), c: '#4D8A6A', cap: 10, status: 'active', email: v('qEmail') || '—', phone: v('qPhone') || '—', skills: ['عام'], last: nowDate(), joined: TODAY });
    log('employee', `أضاف الموظف ${v('qName')}`); closeModal(); go('team'); toast(`أُضيف ${v('qName')} وأُرسلت بيانات الدخول إلى بريده`);
  }
  if (k === 'ticket') {
    if (!v('qName')) return $('#qName').focus();
    const tkId = 'TKT-' + (319 + TICKETS.length); setTimeout(() => lexNew('tk:' + tkId), 0);
    TICKETS.unshift({ id: tkId, customer: v('qName'), phone: v('qPhone') || '—', at: nowDate(), status: 'open', channel: v('qCh'), subject: v('qSubject') || 'تذكرة دعم', body: v('qDet') || '' });
    closeModal(); S.tkF = 'open'; go('support'); toast('أُضيفت التذكرة');
  }
};

/* ==========================================================
   قوائم السياق وأدوات إدارية
   ========================================================== */
const CTX = {
  req: (id) => { const r = REQ(id); return [{ h: `${r.id} — ${r.customer}` }, { l: 'فتح الطلب', ic: 'expand', k: 'Enter', f: () => openReq(id) },
    ...(isOpen(r) ? [{ l: r.assigned_to ? 'تغيير المسؤول' : 'إسناد', ic: 'user', k: 'Shift A', f: () => A.assign({ dataset: { id } }) }, { l: 'تغيير الحالة', ic: 'refresh', f: () => A.statusModal({ dataset: { id } }) }, { l: 'إغلاق الطلب', ic: 'check', f: () => A.closeReq({ dataset: { id } }) }] : [{ l: 'إعادة فتح', ic: 'refresh', f: () => A.reopen({ dataset: { id } }) }]),
    '-', { l: 'نسخ رقم الجوال', ic: 'copy', f: () => { navigator.clipboard?.writeText(r.phone); toast('نُسخ رقم الجوال'); } },
    { l: 'طلب حذف الطلب', ic: 'x', red: true, f: () => askDelete(r) }]; },
  emp: (id) => [{ l: 'فتح الملف', ic: 'user', f: () => openMember(id) }, { l: 'إسناد طلب له', ic: 'plus', f: () => toast('اختر طلبًا من القائمة ثم «إسناد»', { info: true }) }],
  ent: (id) => [{ l: 'فتح المنشأة', ic: 'building', f: () => A.openEnt({ dataset: { id } }) }, { l: 'تذكير سداد', ic: 'receipt', f: () => toast('أُرسل تذكير السداد') }],
  biz: (id) => [{ l: 'فتح الطلب', ic: 'expand', f: () => A.openBiz({ dataset: { id } }) }],
  act: (id) => [{ l: 'تفعيل', ic: 'check', f: () => A.actActivate({ dataset: { id } }) }, { l: 'رفض', ic: 'x', red: true, f: () => A.actClose({ dataset: { id } }) }],
};
function askDelete(r) {
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">طلب حذف ${r.id}</h3><div class="muted" style="font-size:13px">${r.customer} — ${svName(r)}</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><div class="ops-note" style="background:var(--red-bg);color:#7a2c1b">${ic('alert', 'width="14" height="14"')}<span>الحذف لا يتم مباشرة. يُسجَّل الطلب ويحتاج موافقة مدير آخر، ويبقى أثره في سجل النشاط.</span></div>
  <div class="field" style="margin-top:14px"><label>سبب الحذف <span style="color:var(--red)">*</span></label><textarea class="inp" id="delWhy" placeholder="مثال: طلب مكرر، أو أُنشئ بالخطأ" autofocus></textarea></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-danger btn-s" data-a="doDelete" data-id="${r.id}">إرسال طلب الحذف</button></div>`);
  A.doDelete = (el) => { const why = $('#delWhy').value.trim(); if (!why) { toast('اكتب سبب الحذف', { info: true }); return $('#delWhy').focus(); }
    const rr = REQ(el.dataset.id); rr.delete_req = { by: ME, why, at: nowDate() }; log('status', `طلب حذف ${rr.id} — ${why}`);
    closeModal(); rerender(); toast('أُرسل طلب الحذف وينتظر موافقة مدير آخر', { info: true }); };
}
function resetRequests() {
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">تصفير عداد الطلبات</h3><div class="muted" style="font-size:13px">إجراء إداري يتطلب موافقة مدير آخر</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b"><p style="font-size:13.5px;line-height:1.9;color:var(--ink-2)">بعد اعتماد الطلب يبدأ ترقيم الطلبات الجديدة من جديد، وتبقى الطلبات الحالية وأرقامها كما هي في السجل.</p>
  <div class="ops-note" style="margin-top:14px">${ic('user', 'width="14" height="14"')}<span>الطلب الحالي مقدَّم من <b>خالد العتيبي</b> في 14 سبتمبر، وينتظر موافقة مدير آخر. لا يستطيع المدير اعتماد طلبه بنفسه.</span></div></div>
  <div class="m-f"><button class="btn btn-q" data-a="mClose">إغلاق</button><button class="btn btn-s" data-a="stub" data-m="سيُرسل تذكير لبقية المديرين">${ic('bell')}تذكير المديرين</button></div>`);
}
A.resetReview = resetRequests;
function shortcuts() {
  const K_ = [['Ctrl K أو /', 'البحث والأوامر'], ['N', 'الإضافة السريعة'], ['Shift A', 'إسناد الطلب المفتوح'], ['Esc', 'إغلاق اللوحة أو النافذة'], ['↑ ↓ ثم Enter', 'التنقل في نتائج البحث'], ['زر الفأرة الأيمن', 'قائمة إجراءات على الطلبات والمنشآت والموظفين'], ['السحب والإفلات', 'نقل الطلبات بين المراحل في عرض «مراحل»']];
  openModal(`<div class="m-h"><h3 class="h2 grow" style="font-weight:600">اختصارات لوحة المفاتيح</h3><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b">${K_.map(([k, l]) => `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><span class="grow">${l}</span><span class="kbd" style="margin:0;font-size:12px">${k}</span></div>`).join('')}</div>`);
}

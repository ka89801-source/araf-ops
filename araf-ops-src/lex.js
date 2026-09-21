/* ==========================================================
   الفاحص القانوني — تقرير قانوني ذكي لكل طلب قبل الرد على العميل
   يعمل عبر قدرة sample في المنصة المنشورة (يستخدم حساب Claude للمستخدم)
   ========================================================== */
let SAMPLE = null, SAMPLE_STATE = 'checking';
(function initSample() {
  if (!window.claude || typeof window.claude.use !== 'function') { SAMPLE_STATE = 'absent'; return; }
  window.claude.use('sample').then((s) => { SAMPLE = s; SAMPLE_STATE = s ? 'ready' : 'absent'; lexRepaint(); lexStatusPaint(); if (s) { lexEnqueueAll(); lexPump(); } })
    .catch(() => { SAMPLE_STATE = 'absent'; lexRepaint(); });
})();
let REPORTS = {};
try { REPORTS = JSON.parse(localStorage.getItem('araf-ops-lex') || '{}'); } catch (e) { REPORTS = {}; }
const saveReports = () => { try { localStorage.setItem('araf-ops-lex', JSON.stringify(REPORTS)); } catch (e) {} };
const LEX = {};              // حالة كل فحص جارٍ: {state, ctl, stage, err}
const LEX_ERR = {
  not_granted: 'لم يُسمح للمنصة باستخدام Claude في هذه الجلسة.', sampling_disabled: 'Claude غير متاح لهذا الحساب.',
  not_declared: 'الفحص الذكي غير مفعّل في هذه النسخة.', capability_disabled: 'الفحص الذكي غير متاح في هذا العرض.', capability_removed: 'الفحص الذكي غير متاح في هذا العرض.',
  rate_limited: 'تجاوزت حد الاستخدام مؤقتًا. أعد المحاولة بعد قليل.', session_expired: 'انتهت جلستك في Claude. سجّل الدخول ثم أعد المحاولة.',
  refused: 'تعذّر فحص هذا المحتوى. عدّل نص الطلب ثم أعد المحاولة.', empty_completion: 'لم يصل تقرير. أعد المحاولة.',
  invalid_json: 'وصل التقرير بصيغة غير مكتملة. أعد المحاولة.', prompt_too_large: 'نص الطلب أطول من المسموح.', upstream_error: 'انقطع الاتصال أثناء الفحص. أعد المحاولة.',
};
const HARD = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

/* ---------- مصادر الفحص: طلب، طلب منشأة، تذكرة ---------- */
function lexSrc(key) {
  const [k, id] = key.split(':');
  if (k === 'req') { const r = REQ(id); if (!r) return null;
    return { key, kind: r.kind === 'cases' ? 'طلب توكيل في قضية' : 'طلب خدمة قانونية مباشرة', service: svName(r), customer: r.customer, party: r.org ? 'منشأة' : 'فرد',
      details: r.details, attachments: r.attachments, notes: r.notes.map((n) => n.text), stage: r.stage || '', at: r.created_at }; }
  if (k === 'biz') { const b = BIZ_REQUESTS.find((x) => x.id === id); if (!b) return null; const e = ENT(b.entity);
    return { key, kind: `طلب منشأة مشتركة في باقة ${PLANS[e.plan].name}`, service: BIZ_SERVICES[b.service], customer: e.name, party: 'منشأة', details: `${b.subject}. ${b.details}`, attachments: [], notes: b.internal_note ? [b.internal_note] : [], stage: '', at: b.created_at }; }
  if (k === 'tk') { const t = TICKETS.find((x) => x.id === id); if (!t) return null;
    return { key, kind: `تذكرة دعم فني عبر ${t.channel}`, service: t.subject, customer: t.customer, party: 'فرد', details: t.body, attachments: [], notes: [], stage: '', at: t.at }; }
  return null;
}
function lexPrompt(s) {
  return `أنت مستشار قانوني سعودي أول في مكتب «أعراف للمحاماة والاستشارات القانونية». وصل للمكتب الطلب التالي، ومهمتك فحصه وإعداد تقرير قانوني داخلي يستفيد منه المحامي قبل الرد على العميل.

تاريخ اليوم: ${dmy(TODAY)} الموافق ${hijri(TODAY)}.

بيانات الطلب:
- النوع: ${s.kind}
- الخدمة المطلوبة: ${s.service}
- العميل: ${s.customer} (${s.party})
- تاريخ الوصول: ${dmy(s.at)}
- نص الطلب: ${s.details}
${s.attachments.length ? `- المرفقات المذكورة (أسماء فقط، لم تُقرأ): ${s.attachments.join('، ')}` : '- لا مرفقات'}
${s.notes.length ? `- ملاحظات الفريق الداخلية: ${s.notes.join(' | ')}` : ''}
${s.stage ? `- المرحلة الحالية: ${s.stage}` : ''}

قواعد إلزامية:
1. اعتمد على الأنظمة السعودية السارية (مثل: نظام العمل، نظام المعاملات المدنية، نظام الإثبات، نظام المرافعات الشرعية، نظام المحاكم التجارية، نظام التنفيذ، نظام الأحوال الشخصية، نظام الشركات، نظام الإيجار ولوائحه، نظام ديوان المظالم) بحسب ما ينطبق فعلًا.
2. لا تذكر رقم مادة إلا إذا كنت متيقنًا منه. عند أي شك اترك "article" فارغًا واجعل "verify": true.
3. لا تفترض وقائع لم يذكرها العميل. كل ما يلزم ولم يُذكر ضعه في "missing".
4. المهل: اذكر المهل النظامية المحتملة وحدد إن كانت قريبة، دون اختلاق تواريخ لم تُذكر.
5. مسودة الرد موجهة للعميل: مهنية وودودة وموجزة، لا تعِد بنتيجة، وتطلب المعلومات الناقصة، وتوضح الخطوة التالية.
6. اكتب بالعربية الفصحى المختصرة، وكل عنصر في جملة أو جملتين.

أعد JSON فقط بهذا الشكل تمامًا:
{"summary":"خلاصة الطلب في جملتين","area":"مجال النزاع","complexity":"منخفض|متوسط|مرتفع","risk":"منخفض|متوسط|مرتفع","urgency":"وصف قصير لمدى الاستعجال","service_fit":{"fits":true,"note":"هل الخدمة المطلوبة مناسبة أم يُقترح غيرها ولماذا"},"legal_basis":[{"law":"اسم النظام","article":"رقم المادة أو فارغ","point":"وجه الانطباق","verify":false}],"analysis":"تحليل قانوني موجز في 3 إلى 5 جمل","risks":[{"level":"مرتفع|متوسط|منخفض","text":"الخطر"}],"deadlines":[{"text":"المهلة","urgent":true}],"missing":["معلومة ناقصة"],"steps":["خطوة عمل"],"draft_reply":"مسودة الرد على العميل","confidence":"مرتفعة|متوسطة|منخفضة"}`;
}

/* ---------- تشغيل الفحص ---------- */
async function lexRun(key, force) {
  if (!SAMPLE) return;
  const s = lexSrc(key); if (!s) return;
  if (LEX[key]?.state === 'loading') return;
  const ctl = new AbortController();
  LEX[key] = { state: 'loading', ctl, stage: 'think', t0: Date.now() }; lexRepaint(key); lexStatusPaint();
  try {
    const data = await SAMPLE.json(lexPrompt(s), {
      modelTier: 'default', signal: ctl.signal, cache: force ? { gcTime: 300000, refresh: true } : { gcTime: 300000 },
      onText: () => { if (LEX[key] && LEX[key].stage !== 'write') { LEX[key].stage = 'write'; lexRepaint(key); } },
    });
    if (!data || typeof data !== 'object' || !data.summary) throw { code: 'invalid_json' };
    REPORTS[key] = { data: lexClean(data), at: new Date().toISOString() }; saveReports();
    LEX[key] = { state: 'done' };
    lexRepaint(key); lexRefreshLists();
    if (REPORTS[key].data.risk === 'مرتفع' && !lexVisible(key)) toast(`الفاحص: مخاطر مرتفعة في طلب ${s.customer}`, { info: true, action: ['التقرير', () => lexOpenKey(key)] });
  } catch (e) {
    const code = e && e.code ? e.code : 'upstream_error';
    LEX[key] = code === 'cancelled' ? { state: 'idle' } : { state: 'error', code };
    if (HARD.includes(code)) { SAMPLE_STATE = 'denied'; Q.stopped = true; }
    if (code === 'rate_limited') { Q.paused = 'limit'; Q.list = [key].concat(Q.list.filter((k) => k !== key)); LEX[key] = { state: 'queued' }; }
    lexRepaint(key);
  }
  lexStatusPaint();
}
/* ---------- طابور الفحص التلقائي ---------- */
const Q = { list: [], running: new Set(), paused: false, stopped: false, max: 2 };
let LEX_AUTO = true;
try { LEX_AUTO = localStorage.getItem('araf-ops-lex-auto') !== 'off'; } catch (e) {}
function lexScope() {
  const reqs = REQUESTS.filter(isOpen).sort((a, b) => (['new', 'pending'].includes(b.status) - ['new', 'pending'].includes(a.status)) || (b.created_at - a.created_at)).map((r) => 'req:' + r.id);
  const biz = BIZ_REQUESTS.filter((b) => !['completed', 'cancelled'].includes(b.status)).map((b) => 'biz:' + b.id);
  const tk = TICKETS.filter((t) => t.status === 'open').map((t) => 'tk:' + t.id);
  return reqs.concat(biz, tk);
}
function lexEnqueue(key, front) {
  if (REPORTS[key] || Q.running.has(key)) return;
  Q.list = Q.list.filter((k) => k !== key);
  front ? Q.list.unshift(key) : Q.list.push(key);
  if (!LEX[key] || LEX[key].state !== 'loading') LEX[key] = { state: 'queued' };
}
function lexEnqueueAll() { lexScope().forEach((k) => { if (!REPORTS[k] && !Q.running.has(k) && !Q.list.includes(k)) lexEnqueue(k); }); }
/* يعمل طلبان في الوقت نفسه كحد أقصى، والتالي يبدأ فور انتهاء السابق */
function lexPump() {
  if (!LEX_AUTO || Q.paused || Q.stopped || !SAMPLE || SAMPLE_STATE !== 'ready') { lexStatusPaint(); return; }
  while (Q.running.size < Q.max && Q.list.length) {
    const k = Q.list.shift(); if (REPORTS[k] || !lexSrc(k)) continue;
    Q.running.add(k);
    lexRun(k).finally(() => { Q.running.delete(k); setTimeout(lexPump, 300); });
  }
  lexStatusPaint();
}
function lexNew(key) { lexEnqueue(key, true); lexPump(); }
function lexStats() {
  const sc = lexScope(); const done = sc.filter((k) => REPORTS[k]).length;
  const high = sc.filter((k) => REPORTS[k]?.data.risk === 'مرتفع');
  return { total: sc.length, done, left: sc.length - done, running: [...Q.running], high };
}
function lexClean(d) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const lv = (x) => (['منخفض', 'متوسط', 'مرتفع'].includes(x) ? x : 'متوسط');
  return {
    summary: String(d.summary || ''), area: String(d.area || '—'), complexity: lv(d.complexity), risk: lv(d.risk), urgency: String(d.urgency || ''),
    service_fit: { fits: d.service_fit ? d.service_fit.fits !== false : true, note: String(d.service_fit?.note || '') },
    legal_basis: arr(d.legal_basis).slice(0, 8).map((x) => ({ law: String(x.law || ''), article: String(x.article || ''), point: String(x.point || ''), verify: !!x.verify || !x.article })),
    analysis: String(d.analysis || ''), risks: arr(d.risks).slice(0, 6).map((x) => ({ level: lv(x.level), text: String(x.text || x) })),
    deadlines: arr(d.deadlines).slice(0, 5).map((x) => ({ text: String(x.text || x), urgent: !!x.urgent })),
    missing: arr(d.missing).slice(0, 8).map(String), steps: arr(d.steps).slice(0, 8).map(String),
    draft_reply: String(d.draft_reply || ''), confidence: ['مرتفعة', 'متوسطة', 'منخفضة'].includes(d.confidence) ? d.confidence : 'متوسطة',
  };
}
const lexVisible = (key) => !!$(`[data-lex="${key}"]`) || (DR.stack.length && DR.stack[DR.stack.length - 1].render._lex === key);
function lexRepaint(key) {
  $$('[data-lex]').forEach((el) => { if (!key || el.dataset.lex === key) { el.innerHTML = lexCard(el.dataset.lex); } });
  const top = DR.stack[DR.stack.length - 1]; if (top && top.render._lex && (!key || top.render._lex === key)) refreshDrawer();
}
function lexRefreshLists() {
  if (['requests', 'cases'].includes(S.route)) { const b = $('#reqBody'); if (b) { b.innerHTML = reqBody(S.kind); after(b); } }
  if (S.route === 'home') { const a = $('#attList'); if (a) { const att = attention(); a.innerHTML = (S.attAll ? att : att.slice(0, 4)).map(attRow).join(''); } }
  lexStatusPaint();
}
/* يبدأ الفحص تلقائيًا عند فتح طلب لم يُفحص بعد (بفعل المستخدم، مرة واحدة لكل طلب) */
function lexAuto(key) { if (SAMPLE && !REPORTS[key] && !Q.running.has(key) && !Q.stopped) { lexEnqueue(key, true); lexRepaint(key); lexPump(); } }

/* ---------- بطاقة الفحص داخل لوحة الطلب ---------- */
const RISK_C = { 'مرتفع': 'var(--red)', 'متوسط': 'var(--amber)', 'منخفض': 'var(--green)' };
const RISK_B = { 'مرتفع': 'b-red', 'متوسط': 'b-amber', 'منخفض': 'b-green' };
function lexSection(key) { return `<div class="lex" data-lex="${key}">${lexCard(key)}</div>`; }
function lexCard(key) {
  const rep = REPORTS[key], st = LEX[key] || { state: rep ? 'done' : 'idle' };
  const head = (sub) => `<div class="lex-h"><span class="lex-ic">${ic('shieldCheck')}</span><div class="grow"><b>الفاحص القانوني</b><small>${sub}</small></div>`;
  if (st.state === 'loading') {
    return `${head(st.stage === 'write' ? 'يكتب التقرير الآن…' : 'يقرأ الطلب ويكيّفه نظاميًا…')}<button class="btn btn-sm btn-q" data-a="lexStop" data-k="${key}">إيقاف</button></div>
      <div class="lex-scan"><div class="scan-doc"><i></i><i></i><i></i><i></i><i></i><span class="scan-line"></span></div>
      <div class="scan-steps"><span class="on">قراءة نص الطلب</span><span class="${st.stage === 'write' ? 'on' : 'pulse'}">تكييف النزاع والأنظمة المنطبقة</span><span class="${st.stage === 'write' ? 'pulse' : ''}">المخاطر والمهل ومسودة الرد</span></div></div>`;
  }
  if (st.state === 'queued' && !rep) {
    const pos = Q.list.indexOf(key) + 1;
    return `${head(Q.paused ? 'الطابور متوقف مؤقتًا' : pos ? `في طابور الفحص التلقائي — الترتيب ${pos}` : 'في طابور الفحص التلقائي')}${pos > 1 && !Q.paused ? `<button class="btn btn-sm btn-s" data-a="lexFront" data-k="${key}">${ic('up')}افحصه الآن</button>` : ''}</div>
      <div class="lex-msg">${ic('clock', 'width="16" height="16"')}<span>${Q.paused ? 'توقف الفحص التلقائي بسبب حد الاستخدام. استأنفه من لوحة الفاحص.' : !LEX_AUTO ? 'الفحص التلقائي موقوف. شغّله من لوحة الفاحص أو افحص هذا الطلب يدويًا.' : 'سيُفحص تلقائيًا دون أي إجراء منك، ويظهر التقرير هنا فور اكتماله.'}</span>${!LEX_AUTO || Q.paused ? `<button class="btn btn-sm btn-p" data-a="lexGo" data-k="${key}">افحص الآن</button>` : ''}</div>`;
  }
  if (st.state === 'error') {
    const hard = HARD.includes(st.code);
    return `${head('تعذّر إكمال الفحص')}</div><div class="lex-msg err">${ic('alert', 'width="16" height="16"')}<span>${LEX_ERR[st.code] || LEX_ERR.upstream_error}</span>${hard ? '' : `<button class="btn btn-sm btn-s" data-a="lexGo" data-k="${key}">إعادة المحاولة</button>`}</div>`;
  }
  if (!rep) {
    if (SAMPLE_STATE === 'checking') return `${head('يجري الاتصال بخدمة الفحص…')}</div>`;
    if (!SAMPLE || SAMPLE_STATE !== 'ready') return `${head('غير متاح في هذا العرض')}</div><div class="lex-msg">${ic('lock', 'width="16" height="16"')}<span>الفحص الذكي يعمل عند فتح المنصة من رابطها داخل Claude، ويستخدم حساب Claude الخاص بك.</span></div>`;
    return `${head('تقرير قانوني داخلي قبل الرد على العميل')}<button class="btn btn-sm btn-p" data-a="lexGo" data-k="${key}">${ic('sparkle')}افحص الطلب</button></div>`;
  }
  const d = rep.data;
  return `${head(`فُحص ${ago(new Date(rep.at))} · ثقة ${d.confidence}`)}<button class="btn btn-sm btn-q" data-a="lexGo" data-k="${key}" data-f="1" data-tip="إعادة الفحص">${ic('refresh')}</button></div>
    <div class="lex-pills"><span class="badge b-ghost">${esc(d.area)}</span><span class="badge ${RISK_B[d.risk]}">المخاطر: ${d.risk}</span><span class="badge b-ghost">التعقيد: ${d.complexity}</span>${d.deadlines.some((x) => x.urgent) ? '<span class="badge b-red">مهلة قريبة</span>' : ''}${!d.service_fit.fits ? '<span class="badge b-gold">الخدمة تحتاج مراجعة</span>' : ''}</div>
    <p class="lex-sum">${esc(d.summary)}</p>
    ${d.risks.slice(0, 2).map((x) => `<div class="lex-risk"><i style="background:${RISK_C[x.level]}"></i><span>${esc(x.text)}</span></div>`).join('')}
    <div class="lex-foot"><button class="btn btn-sm btn-p" data-a="lexOpen" data-k="${key}">${ic('file')}التقرير الكامل</button><button class="btn btn-sm btn-s" data-a="lexCopy" data-k="${key}">${ic('copy')}نسخ مسودة الرد</button>${d.missing.length ? `<span class="muted" style="font-size:12px;margin-inline-start:auto">${d.missing.length} معلومات ناقصة من العميل</span>` : ''}</div>`;
}
A.lexGo = (el) => { const k = el.dataset.k; Q.list = Q.list.filter((x) => x !== k); Q.running.add(k); lexRun(k, !!el.dataset.f).finally(() => { Q.running.delete(k); lexPump(); }); };
A.lexFront = (el) => { lexEnqueue(el.dataset.k, true); lexRepaint(el.dataset.k); lexPump(); toast('نُقل الطلب إلى مقدمة طابور الفحص', { info: true }); };
A.lexStop = (el) => { LEX[el.dataset.k]?.ctl?.abort(); };
A.lexCopy = (el) => { const d = REPORTS[el.dataset.k]?.data; if (!d) return; navigator.clipboard?.writeText(d.draft_reply); toast('نُسخت مسودة الرد — راجعها قبل إرسالها للعميل'); };

/* ---------- التقرير الكامل ---------- */
function lexReport(key) {
  const fn = () => {
    const rep = REPORTS[key]; const s = lexSrc(key);
    if (!rep) return { head: `<h2 class="h2" style="font-weight:600">التقرير القانوني</h2>`, body: lexSection(key) };
    const d = rep.data;
    return {
      head: `<div class="row gap12"><span class="lex-ic lg">${ic('shieldCheck')}</span><div class="grow" style="min-width:0"><div class="muted" style="font-size:12px">تقرير قانوني داخلي — ${s ? esc(s.customer) : ''}</div><h2 class="h2" style="font-weight:600">${esc(d.area)}</h2></div></div>`,
      body: `<div class="lex-grid">
          <div><span>المخاطر</span><b style="color:${RISK_C[d.risk]}">${d.risk}</b></div><div><span>التعقيد</span><b>${d.complexity}</b></div><div><span>ثقة التحليل</span><b>${d.confidence}</b></div>
        </div>
        ${d.urgency ? `<div class="lex-msg ${d.deadlines.some((x) => x.urgent) ? 'err' : ''}" style="margin-bottom:16px">${ic('clock', 'width="16" height="16"')}<span>${esc(d.urgency)}</span></div>` : ''}
        <div class="dsec" style="margin-top:0"><h4>الخلاصة</h4><p class="lex-p">${esc(d.summary)}</p></div>
        <div class="dsec"><h4>ملاءمة الخدمة المطلوبة</h4><div class="lex-msg ${d.service_fit.fits ? 'ok' : ''}">${ic(d.service_fit.fits ? 'check' : 'alert', 'width="16" height="16"')}<span>${esc(d.service_fit.note || (d.service_fit.fits ? 'الخدمة المطلوبة مناسبة.' : ''))}</span></div></div>
        <div class="dsec"><h4>السند النظامي</h4>${d.legal_basis.map((x) => `<div class="lex-law"><div class="row gap6" style="flex-wrap:wrap"><b>${esc(x.law)}</b>${x.article ? `<span class="badge b-blue">${esc(x.article)}</span>` : ''}${x.verify ? '<span class="badge b-amber" data-tip="تُراجع المادة من مصدرها الرسمي قبل الاستناد إليها">يُتحقق منها</span>' : ''}</div><p>${esc(x.point)}</p></div>`).join('') || '<p class="muted" style="font-size:13px">لم يُحدد سند نظامي.</p>'}</div>
        <div class="dsec"><h4>التحليل</h4><p class="lex-p">${esc(d.analysis)}</p></div>
        ${d.risks.length ? `<div class="dsec"><h4>المخاطر</h4>${d.risks.map((x) => `<div class="lex-risk"><i style="background:${RISK_C[x.level]}"></i><span><b style="color:${RISK_C[x.level]};font-weight:600">${x.level}:</b> ${esc(x.text)}</span></div>`).join('')}</div>` : ''}
        ${d.deadlines.length ? `<div class="dsec"><h4>المهل</h4>${d.deadlines.map((x) => `<div class="lex-risk"><i style="background:${x.urgent ? 'var(--red)' : 'var(--faint)'}"></i><span>${esc(x.text)}${x.urgent ? ' <span class="badge b-red">قريبة</span>' : ''}</span></div>`).join('')}</div>` : ''}
        ${d.missing.length ? `<div class="dsec"><h4>معلومات ناقصة نطلبها من العميل</h4>${d.missing.map((x, i) => `<div class="check-row"><button class="chk" data-a="lexTick">${ic('check')}</button><span>${esc(x)}</span></div>`).join('')}</div>` : ''}
        ${d.steps.length ? `<div class="dsec"><h4>المسار المقترح</h4><ol class="lex-steps">${d.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
        <div class="dsec"><h4>مسودة الرد على العميل</h4><textarea class="inp lex-draft" id="lexDraft" rows="7">${esc(d.draft_reply)}</textarea></div>
        <p class="lex-note">${ic('alert', 'width="14" height="14"')}<span>تحليل مساعد يعدّه الذكاء الاصطناعي من نص الطلب فقط. يراجعه المحامي قبل الاعتماد عليه، وتُتحقق الإحالات النظامية من مصادرها الرسمية.</span></p>`,
      foot: `<button class="btn btn-p" data-a="lexCopyDraft">${ic('copy')}نسخ المسودة</button>${key.startsWith('req:') ? `<button class="btn btn-s" data-a="lexToNote" data-k="${key}">${ic('pen')}حفظ التقرير كملاحظة</button>` : ''}<button class="btn btn-q" data-a="lexGo" data-k="${key}" data-f="1" style="margin-inline-start:auto">${ic('refresh')}إعادة الفحص</button>`,
    };
  };
  fn._lex = key; return fn;
}
A.lexOpen = (el) => openDrawer(lexReport(el.dataset.k), { wide: true, push: $('#drawer').classList.contains('show') });
A.lexCopyDraft = () => { navigator.clipboard?.writeText($('#lexDraft').value); toast('نُسخت المسودة — راجعها قبل إرسالها للعميل'); };
A.lexTick = (el) => { el.classList.toggle('on'); el.classList.add('pop'); el.nextElementSibling.classList.toggle('done-t'); };
A.lexToNote = (el) => {
  const key = el.dataset.k; const r = REQ(key.split(':')[1]); const d = REPORTS[key].data;
  r.notes.push({ by: ME, at: nowDate(), text: `فحص قانوني: ${d.summary} — المخاطر: ${d.risk}. الناقص من العميل: ${d.missing.join('، ') || 'لا شيء'}.` });
  r.updated_at = nowDate(); toast('حُفظت خلاصة التقرير كملاحظة داخلية في الطلب');
};
/* شارة صغيرة في الجداول */
function lexBadge(id) { const r = REPORTS['req:' + id]; if (!r) return ''; const k = r.data.risk; return `<span class="lex-dot" style="--c:${RISK_C[k]}" data-tip="${esc('فُحص قانونيًا — المخاطر: ' + k)}">${ic('shieldCheck')}</span>`; }

/* ---------- مؤشر الفاحص ولوحته ---------- */
function lexLive() {
  if (SAMPLE_STATE === 'checking') return '';
  if (!SAMPLE || SAMPLE_STATE !== 'ready') return `<button class="lex-live off" data-a="lexPanel">${ic('shieldCheck')}<span>الفاحص القانوني متاح عند فتح المنصة من رابطها داخل Claude</span></button>`;
  const st = lexStats();
  const state = Q.stopped ? 'stop' : Q.paused ? 'pause' : !LEX_AUTO ? 'off' : st.running.length ? 'run' : 'idle';
  const txt = { run: `يفحص الآن ${st.running.map((k) => lexSrc(k)?.customer).filter(Boolean).join(' و')}`, idle: st.left ? 'بانتظار الطلب التالي' : 'كل الطلبات المفتوحة مفحوصة', pause: 'متوقف مؤقتًا — حد الاستخدام', off: 'الفحص التلقائي موقوف', stop: 'متوقف — لم يُسمح باستخدام Claude' }[state];
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 100;
  return `<button class="lex-live ${state}" data-a="lexPanel"><span class="ll-ring" style="--p:${pct}">${ic('shieldCheck')}</span>
    <span><b>الفاحص القانوني: فُحص ${st.done} من ${st.total}</b><small>${txt}${st.high.length ? ` · <em>${st.high.length} بمخاطر مرتفعة</em>` : ''}</small></span></button>`;
}
function lexStatusPaint() {
  const l = $('#lexLive'); if (l) l.innerHTML = lexLive();
  const b = $('#lexTop'); if (b) { const st = SAMPLE_STATE === 'ready' ? lexStats() : null; b.classList.toggle('run', !!(st && st.running.length)); const d = b.querySelector('.dot'); if (d) { d.textContent = st ? st.left : ''; d.style.display = st && st.left ? '' : 'none'; } }
  const top = DR.stack[DR.stack.length - 1]; if (top && top.render === lexPanel) { const bd = $('#drawer .dr-b'); const sc = bd ? bd.scrollTop : 0; refreshDrawer(); const nb = $('#drawer .dr-b'); if (nb) nb.scrollTop = sc; }
}
function lexPanel() {
  const ok = SAMPLE && SAMPLE_STATE === 'ready';
  const st = ok ? lexStats() : { total: 0, done: 0, left: 0, running: [], high: [] };
  const row = (k, extra) => { const s = lexSrc(k); if (!s) return ''; const r = REPORTS[k];
    return `<div class="li" data-a="lexOpenK" data-k="${k}"><div class="ic">${ic(k.startsWith('tk') ? 'msg' : k.startsWith('biz') ? 'building' : 'file')}</div><div class="grow" style="min-width:0"><div class="t ell">${esc(s.customer)} — ${esc(s.service)}</div><div class="m">${r ? esc(r.data.area) + ' · ' + ago(new Date(r.at)) : extra}</div></div>${r ? `<span class="badge ${RISK_B[r.data.risk]}">${r.data.risk}</span>` : ''}</div>`; };
  const done = lexScope().filter((k) => REPORTS[k]).sort((a, b) => new Date(REPORTS[b].at) - new Date(REPORTS[a].at));
  return {
    head: `<div class="row gap12"><span class="lex-ic lg">${ic('shieldCheck')}</span><div class="grow"><h2 class="h2" style="font-weight:600">الفاحص القانوني</h2><div class="muted" style="font-size:12.5px">يفحص كل طلب تلقائيًا فور وصوله، دون أي إجراء منك</div></div></div>`,
    body: ok ? `<label class="switch-row" style="justify-content:space-between;height:auto;padding:12px 14px;border-radius:12px;background:var(--sunk);margin-bottom:14px"><span><b style="display:block;font-size:13.5px">الفحص التلقائي</b><small class="muted" style="font-size:12px">${LEX_AUTO ? 'يعمل على كل طلب مفتوح وكل طلب جديد' : 'موقوف — تُفحص الطلبات يدويًا فقط'}</small></span><input type="checkbox" id="lexAutoSw" ${LEX_AUTO ? 'checked' : ''} data-a="lexAutoT"><span class="switch on-green"></span></label>
      <div class="lex-grid"><div><span>مفحوص</span><b>${st.done}</b></div><div><span>متبقٍ</span><b>${st.left}</b></div><div><span>مخاطر مرتفعة</span><b style="color:var(--red)">${st.high.length}</b></div></div>
      <div class="hbar" style="height:8px;margin:-4px 0 18px"><i style="width:${st.total ? (st.done / st.total) * 100 : 100}%;background:var(--green);transition:width .6s var(--ease-out)"></i></div>
      ${Q.paused ? `<div class="lex-msg err" style="margin:0 0 14px">${ic('alert', 'width="16" height="16"')}<span>توقف الطابور لأن حد الاستخدام في حسابك وصل مؤقتًا.</span><button class="btn btn-sm btn-s" data-a="lexResume">استئناف</button></div>` : ''}
      ${Q.stopped ? `<div class="lex-msg err" style="margin:0 0 14px">${ic('lock', 'width="16" height="16"')}<span>لم يُسمح للمنصة باستخدام Claude، فتوقف الفحص التلقائي.</span></div>` : ''}
      ${st.running.length ? `<div class="dsec" style="margin-top:0"><h4><span class="live"><i></i></span>يُفحص الآن</h4>${st.running.map((k) => row(k, 'جارٍ إعداد التقرير…')).join('')}</div>` : ''}
      ${Q.list.length ? `<div class="dsec"><h4>في الطابور (${Q.list.length})</h4>${Q.list.slice(0, 6).map((k, i) => row(k, `الترتيب ${i + 1}`)).join('')}${Q.list.length > 6 ? `<p class="muted" style="font-size:12px;padding:6px 8px">و${Q.list.length - 6} طلبات أخرى</p>` : ''}</div>` : ''}
      ${done.length ? `<div class="dsec"><h4>اكتمل فحصه</h4>${done.slice(0, 12).map((k) => row(k)).join('')}</div>` : ''}
      <p class="lex-note">${ic('alert', 'width="14" height="14"')}<span>يفحص طلبين في الوقت نفسه كحد أقصى، ويستخدم حساب Claude لمن يفتح المنصة. التقارير تحليل مساعد يراجعه المحامي.</span></p>`
      : `<div class="lex-msg">${ic('lock', 'width="16" height="16"')}<span>الفحص التلقائي يعمل عند فتح المنصة من رابطها داخل Claude.</span></div>`,
  };
}
function lexOpenKey(key) { openDrawer(lexReport(key), { wide: true, push: $('#drawer').classList.contains('show') }); }
A.lexPanel = () => openDrawer(lexPanel, { wide: false });
A.lexOpenK = (el) => { const k = el.dataset.k || el.dataset.id; if (REPORTS[k]) return lexOpenKey(k); const [t, id] = k.split(':'); if (t === 'req') openReq(id, true); else if (t === 'biz') A.openBiz({ dataset: { id } }); else openTicket(id); };
A.lexAutoT = (el, e) => { e.preventDefault(); LEX_AUTO = !LEX_AUTO; try { localStorage.setItem('araf-ops-lex-auto', LEX_AUTO ? 'on' : 'off'); } catch (x) {} if (LEX_AUTO) { lexEnqueueAll(); lexPump(); } lexStatusPaint(); toast(LEX_AUTO ? 'شُغّل الفحص التلقائي' : 'أُوقف الفحص التلقائي', { info: true }); };
A.lexResume = () => { Q.paused = false; lexPump(); };

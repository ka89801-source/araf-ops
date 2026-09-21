/* ==========================================================
   الرسائل الداخلية — بين أعضاء الفريق
   ========================================================== */
const NAMA = () => (REQUESTS.find((r) => r.customer === 'شركة نماء للمقاولات') || {}).id;
let LETTERS = [
  { id: 'L3', from: 'EMP-002', to: ME, at: D(9, 16, 8, 40), subj: 'لائحة الاعتراض في قضية نماء', urgent: true, read: false, delivered: true, reqRef: 'nama',
    body: 'أستاذ خالد، أتممت لائحة الاعتراض في قضية شركة نماء للمقاولات وهي في الإصدار الثالث بانتظار اعتمادك. المهلة النظامية تنتهي الثلاثاء القادم، فأرجو مراجعتها قبل نهاية الدوام.', replies: [] },
  { id: 'L2', from: 'EMP-004', to: ME, at: D(9, 15, 16, 10), subj: 'توقيع وكالة العنزي', read: false, delivered: true,
    body: 'قُيد طلب عبدالرحمن العنزي في ناجز، وبقي توقيعك على الوكالة لإكمال المطالبة المالية. الوكالة في ملف الطلب ويكفي اعتمادها إلكترونيًا.', replies: [] },
  { id: 'L1', from: ME, to: 'EMP-003', at: D(9, 14, 11, 0), subj: 'مذكرة الاستئناف', read: true, delivered: true, readAt: D(9, 14, 11, 32),
    body: 'محمد، أرجو أن تمنح مذكرة الاستئناف في قضية يوسف الشمري أولوية هذا الأسبوع؛ مهلة الاعتراض تنتهي في 22 سبتمبر. أطلعني على المسودة حين تجهز.',
    replies: [{ by: 'EMP-003', at: D(9, 14, 12, 5), text: 'أبشر، المسودة في المراجعة الأخيرة وأرسلها لك خلال يومين.' }] },
];
(function loadLetters() {
  try {
    const raw = localStorage.getItem('araf-ops-msgs'); if (!raw) return;
    const rev = (v) => (v ? new Date(v) : v);
    LETTERS = JSON.parse(raw).map((l) => Object.assign(l, { at: rev(l.at), readAt: rev(l.readAt), typing: false, replies: (l.replies || []).map((r) => Object.assign(r, { at: rev(r.at) })) }));
  } catch (e) {}
})();
const saveLetters = () => { try { localStorage.setItem('araf-ops-msgs', JSON.stringify(LETTERS)); } catch (e) {} };
const LT = (id) => LETTERS.find((l) => l.id === id);
const isUnread = (l) => (l.to === ME && !l.read) || (l.from === ME && !!l.unreadReply);
const unreadLetters = () => LETTERS.filter(isUnread).length;
const lastAt = (l) => (l.replies.length ? l.replies[l.replies.length - 1].at : l.at);
const CANNED = ['تم، أبدأ عليه الآن وأطلعك على النتيجة قبل نهاية اليوم.', 'وصلت، سأنجزه وأحدّث الطلب فور الانتهاء.', 'واضح، أتواصل مع العميل اليوم وأعود لك بالتحديث.'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const receipt = (l) => !l.delivered ? `<span class="rc">${ic('clock', 'width="13" height="13"')}يُرسل…</span>`
  : l.read ? `<span class="rc read">${ic('checks', 'width="15" height="15"')}قُرئت</span>` : `<span class="rc">${ic('check', 'width="13" height="13"')}وصلت</span>`;

/* ---------- قسم الصفحة الرئيسية ---------- */
function lettersSec() {
  const n = unreadLetters();
  const L = LETTERS.slice().sort((a, b) => (isUnread(b) - isUnread(a)) || (lastAt(b) - lastAt(a))).slice(0, 3);
  return `<div class="sec-h"><div class="sec-t">الرسائل${n ? `<span class="badge b-red">${n} غير مقروءة</span>` : '<small>رسائل داخلية بينك وبين فريقك</small>'}</div>
    <div class="act"><button class="btn btn-sm btn-q" data-a="inbox">كل الرسائل</button><button class="btn btn-sm btn-p" data-a="compose">${ic('pen')}رسالة جديدة</button></div></div>
    <div class="msg-grid">${L.map(msgCard).join('')}
      <button class="msg-card msg-new" data-a="compose"><span class="mn-ic">${ic('send')}</span><b>رسالة جديدة</b><small>لأي عضو في الفريق</small></button></div>`;
}
function msgCard(l, i = 0) {
  const mine = l.from === ME; const other = mine ? l.to : l.from; const u = U(other);
  const un = isUnread(l); const last = l.replies[l.replies.length - 1];
  const preview = last ? `${last.by === ME ? 'أنت: ' : ''}${last.text}` : l.body;
  return `<button class="msg-card ${un ? 'unread' : ''} ${l._new ? 'flash-in' : ''}" data-a="openLetter" data-id="${l.id}" style="animation-delay:${i * 60}ms">
    <div class="mc-top">${av(other, '', true)}<div class="grow" style="min-width:0"><div class="mc-who"><span class="dir ${mine ? 'out' : 'in'}">${ic(mine ? 'send' : 'inbox', 'width="12" height="12"')}${mine ? 'إلى' : 'من'}</span><b class="ell">${u.name}</b></div><small>${u.role}</small></div>
      <time>${ago(lastAt(l))}</time></div>
    <div class="mc-subj">${un ? '<i class="udot"></i>' : ''}<span class="ell">${esc(l.subj)}</span></div>
    <p class="mc-prev">${l.typing ? `<span class="typing-inline"><i></i><i></i><i></i></span>${u.short} يكتب الآن…` : esc(preview)}</p>
    <div class="mc-foot">${l.urgent ? '<span class="badge b-red">عاجل</span>' : ''}${l.reqId || l.reqRef ? `<span class="badge b-ghost">${ic('link', 'width="11" height="11"')}طلب مرفق</span>` : ''}
      ${l.replies.length ? `<span class="badge b-ghost">${ic('msg', 'width="11" height="11"')}${l.replies.length}</span>` : ''}
      ${mine ? `<span style="margin-inline-start:auto">${receipt(l)}</span>` : un ? '<span class="mc-new" style="margin-inline-start:auto">جديدة</span>' : ''}</div></button>`;
}
function refreshLettersQuiet() {
  const s = $('#lettersSec'); if (s) { s.innerHTML = lettersSec(); after(s); }
  const d = $('#mailDot'); if (d) { const n = unreadLetters(); d.textContent = n; d.style.display = n ? '' : 'none'; }
}
function refreshLetters() {
  refreshLettersQuiet();
  const top = DR.stack[DR.stack.length - 1];
  if (top && (top.render === inboxPanel || top.render._letter)) {
    const typed = $('#replyBox')?.value || '';
    const b = $('#drawer .dr-b'); const sc = b ? b.scrollTop : 0; refreshDrawer();
    const nb = $('#drawer .dr-b'); if (nb) nb.scrollTop = top.render._letter ? nb.scrollHeight : sc;
    const rb = $('#replyBox'); if (rb && typed) rb.value = typed; bindComposer();
  }
}

/* ---------- المحادثة ---------- */
function bubble(by, text, at, extra = '') {
  const mine = by === ME;
  return `<div class="bub ${mine ? 'me' : 'them'} ${extra}">${mine ? '' : av(by, 'sm')}<div class="bub-b"><p>${esc(text).replace(/\n/g, '<br>')}</p><time>${hm(at)}</time></div></div>`;
}
function threadPanel(id) {
  const fn = () => {
    const l = LT(id); const mine = l.from === ME; const other = mine ? l.to : l.from; const u = U(other);
    const req = l.reqRef === 'nama' ? NAMA() : l.reqId;
    const steps = [['أُرسلت', l.at, true], ['وصلت', l.at, l.delivered], ['قُرئت', l.readAt, l.read]];
    return {
      head: `<div class="row gap12">${av(other, 'lg', true)}<div class="grow" style="min-width:0"><div class="row gap6" style="flex-wrap:wrap"><h2 class="h2 ell" style="font-weight:600">${esc(l.subj)}</h2>${l.urgent ? '<span class="badge b-red">عاجل</span>' : ''}</div>
        <div class="muted" style="font-size:12.5px">${mine ? `إلى ${u.name}` : `من ${u.name}`} — ${u.role}</div></div></div>`,
      body: `${mine ? `<div class="dlv">${steps.map(([t, at, on], i) => `${i ? `<em class="${on ? 'on' : ''}"></em>` : ''}<span class="${on ? 'on' : ''}"><i>${on ? ic('check') : ''}</i>${t}${on && at ? `<small>${hm(at)}</small>` : ''}</span>`).join('')}</div>` : ''}
        ${req && REQ(req) ? `<button class="msg-ref" data-a="ltReq" data-id="${req}">${ic('file', 'width="15" height="15"')}<span class="grow"><b>${REQ(req).customer}</b><small>${svName(REQ(req))} — ${REQ(req).id}</small></span>${ic('chevL', 'width="14" height="14"')}</button>` : ''}
        <div class="thread" id="thread">
          <div class="day-sep"><span>${rel(l.at)} — ${dm(l.at)}</span></div>
          ${bubble(l.from, l.body, l.at)}
          ${l.replies.map((r) => bubble(r.by, r.text, r.at, r._new ? 'pop-in' : '')).join('')}
          ${l.typing ? `<div class="bub them pop-in">${av(other, 'sm')}<div class="bub-b typing"><i></i><i></i><i></i></div></div>` : ''}
          ${mine && l.read && !l.replies.length && !l.typing ? `<div class="seen">${ic('checks', 'width="14" height="14"')}قرأ ${u.short} الرسالة ${ago(l.readAt)}</div>` : ''}
        </div>`,
      foot: `<div class="composer-bar"><textarea id="replyBox" rows="1" placeholder="اكتب ردًا… Enter للإرسال"></textarea><button class="send-btn" data-a="sendReply" data-id="${l.id}" aria-label="إرسال">${ic('send')}</button></div>`,
    };
  };
  fn._letter = id; return fn;
}
function bindComposer() {
  const b = $('#replyBox'); if (!b || b._bound) return; b._bound = true;
  const grow = () => { b.style.height = 'auto'; b.style.height = Math.min(140, b.scrollHeight) + 'px'; };
  b.oninput = grow;
  b.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('[data-a=sendReply]')?.click(); } };
}
function openLetter(id) {
  const l = LT(id); if (!l) return;
  if (l.to === ME && !l.read) { l.read = true; l.readAt = nowDate(); }
  if (l.from === ME) l.unreadReply = false;
  saveLetters(); closeModal();
  openDrawer(threadPanel(id), { wide: true });
  setTimeout(() => { const b = $('#drawer .dr-b'); if (b) b.scrollTop = b.scrollHeight; bindComposer(); $('#replyBox')?.focus(); refreshLettersQuiet(); }, 80);
}
A.openLetter = (el) => openLetter(el.dataset.id);
A.sendReply = (el) => {
  const l = LT(el.dataset.id); const box = $('#replyBox'); const v = box.value.trim();
  if (!v) { box.focus(); box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 400); return; }
  const r = { by: ME, at: nowDate(), text: v, _new: true }; l.replies.push(r); saveLetters(); box.value = '';
  refreshLetters(); setTimeout(() => { r._new = false; }, 800);
  simulate(l, l.from === ME ? l.to : l.from, true);
};
A.ltReq = (el) => { closeDrawer(); setTimeout(() => openReq(el.dataset.id), 250); };

/* محاكاة: يستلم العضو الرسالة ثم يقرؤها ثم يكتب ثم يرد */
function simulate(l, who, isReply) {
  if (l._sim) return; l._sim = true;
  if (!isReply) setTimeout(() => { l.delivered = true; saveLetters(); refreshLetters(); }, 1400);
  if (!isReply) setTimeout(() => { l.read = true; l.readAt = nowDate(); saveLetters(); refreshLetters(); toast(`قرأ ${U(who).short} رسالتك`, { info: true }); }, 7000);
  setTimeout(() => { l.typing = true; refreshLetters(); }, isReply ? 4000 : 12000);
  setTimeout(() => {
    l.typing = false; l._sim = false;
    l.replies.push({ by: who, at: nowDate(), text: CANNED[(LETTERS.length + l.replies.length) % CANNED.length], _new: true });
    const viewing = DR.stack.length && DR.stack[DR.stack.length - 1].render._letter === l.id && $('#drawer').classList.contains('show');
    l.unreadReply = !viewing; saveLetters(); refreshLetters();
    setTimeout(() => l.replies.forEach((r) => { r._new = false; }), 900);
    if (!viewing) toast(`رد جديد من ${U(who).short}`, { info: true, action: ['فتح', () => openLetter(l.id)] });
  }, isReply ? 8500 : 18000);
}

/* ---------- رسالة جديدة ---------- */
function composeLetter(to) {
  closeDrawer(); let pick = to || '';
  const people = () => TEAM.filter((t) => t.id !== ME && t.status === 'active').map((t) => `<button type="button" class="to-chip ${pick === t.id ? 'on' : ''}" data-a="pickTo" data-id="${t.id}">${av(t.id, 'sm', true)}<span><b>${t.short}</b><small>${t.role}</small></span>${pick === t.id ? `<i class="tick">${ic('check')}</i>` : ''}</button>`).join('');
  const reqs = REQUESTS.filter(isOpen).slice(0, 14).map((r) => `<option value="${r.id}">${r.customer} — ${svName(r)}</option>`).join('');
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2" style="font-weight:600">رسالة جديدة</h3><div class="muted" style="font-size:13px">تصل داخل المنصة، وترى متى وصلت ومتى قُرئت</div></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div>
  <div class="m-b">
    <div class="field" style="margin-bottom:14px"><label>إلى</label><div class="to-row" id="toRow">${people()}</div></div>
    <div class="field" style="margin-bottom:12px"><label>الموضوع</label><input class="inp" id="ltSubj" maxlength="60" placeholder="مثال: متابعة طلبات الأسبوع"></div>
    <div class="field"><label>الرسالة</label><textarea class="inp" id="ltBody" rows="5" placeholder="اكتب رسالتك…"></textarea></div>
    <div class="form-grid" style="margin-top:12px;align-items:end">
      <div class="field"><label>إرفاق طلب (اختياري)</label><select class="inp" id="ltReq"><option value="">دون إرفاق</option>${reqs}</select></div>
      <label class="switch-row"><input type="checkbox" id="ltUrgent"><span class="switch"></span><span>تمييزها كعاجلة</span></label>
    </div>
    <div class="lt-err" id="ltErr"></div>
  </div>
  <div class="m-f"><span class="muted" style="font-size:12px;margin-inline-end:auto"><span class="kbd">Ctrl Enter</span> للإرسال</span><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p send-main" data-a="sendLetter">${ic('send')}<span>إرسال</span></button></div>`, 'lg');
  A.pickTo = (b) => { pick = b.dataset.id; $('#toRow').innerHTML = people(); $('#ltErr').textContent = ''; $('#ltSubj').focus(); };
  A.sendLetter = async (b) => {
    const subj = $('#ltSubj').value.trim(), body = $('#ltBody').value.trim();
    const err = !pick ? 'اختر من ترسل إليه' : !body ? 'اكتب نص الرسالة' : '';
    if (err) { $('#ltErr').textContent = err; if (pick) $('#ltBody').focus(); return; }
    if (b.classList.contains('sending')) return;
    b.classList.add('sending'); b.querySelector('span').textContent = 'يُرسل…'; await wait(650);
    b.classList.remove('sending'); b.classList.add('done'); b.innerHTML = `${ic('check')}<span>أُرسلت</span>`; await wait(420);
    const l = { id: 'L' + (Date.now() % 1e7), from: ME, to: pick, at: nowDate(), subj: subj || 'رسالة', body, urgent: $('#ltUrgent').checked, reqId: $('#ltReq').value || null, read: false, delivered: false, replies: [], _new: true };
    LETTERS.unshift(l); saveLetters(); closeModal(); refreshLetters(); setTimeout(() => { l._new = false; }, 1500);
    toast(`أُرسلت الرسالة إلى ${U(pick).name}`, { action: ['فتح', () => openLetter(l.id)] });
    simulate(l, pick, false);
  };
  $('#modal').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('[data-a=sendLetter]')?.click(); };
}
A.compose = () => composeLetter();

/* ---------- صندوق الرسائل ---------- */
let boxTab = 'all';
function inboxPanel() {
  const L = LETTERS.filter((l) => boxTab === 'all' ? true : boxTab === 'in' ? l.to === ME : boxTab === 'out' ? l.from === ME : isUnread(l)).sort((a, b) => lastAt(b) - lastAt(a));
  const tabs = [['all', 'الكل', LETTERS.length], ['unread', 'غير مقروءة', unreadLetters()], ['in', 'الواردة', LETTERS.filter((l) => l.to === ME).length], ['out', 'المرسلة', LETTERS.filter((l) => l.from === ME).length]];
  return { head: `<div class="row"><h2 class="h2 grow" style="font-weight:600">الرسائل</h2><button class="btn btn-sm btn-p" data-a="compose">${ic('pen')}رسالة جديدة</button></div>`,
    body: `<div class="ntabs" style="margin:-18px -22px 14px">${tabs.map(([k, l, n]) => `<button class="${boxTab === k ? 'on' : ''}" data-a="boxTab" data-v="${k}">${l}${n ? `<span class="n ${k === 'unread' ? 'hot' : ''}">${n}</span>` : ''}</button>`).join('')}</div>
    ${L.length ? `<div class="msg-list">${L.map((l, i) => msgCard(l, i)).join('')}</div>` : empty(boxTab === 'unread' ? 'لا رسائل غير مقروءة' : 'لا رسائل هنا', 'الرسائل الداخلية تظهر هنا مع حالة وصولها وقراءتها.', 'رسالة جديدة', 'compose')}` };
}
A.inbox = () => openDrawer(inboxPanel);
A.boxTab = (el) => { boxTab = el.dataset.v; refreshDrawer(); };

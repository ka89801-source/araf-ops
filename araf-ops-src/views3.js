const pReq = (n) => n === 0 ? 'لا طلبات' : plural(n, 'طلب واحد', 'طلبان', 'طلبات', 'طلبًا');
/* ==========================================================
   خريطة التدفق — من أين تأتي الطلبات وإلى أين تنتهي
   ========================================================== */
const SRC_G = {
  direct_services: 'الموقع — خدمات', cases: 'الموقع — توكيل', whatsapp: 'واتساب', call: 'اتصال', instagram: 'إنستغرام', linkedin: 'لينكدإن',
  referral: 'إحالة', old_customer: 'عميل سابق', custom_case: 'قضية غير مدرجة', custom_service: 'خدمة غير مدرجة',
  support_ticket: 'الدعم الفني', subscription: 'باقة منشأة', ai_assistant: 'المساعد القانوني', biz: 'بوابة المنشآت',
};
/* أعمدة المجرى: وصل ← القناة ← الإسناد ← النتيجة */
const FL = [
  { h: 'وصل', nodes: { all: { l: 'كل الطلبات', c: '#1B3A4B', d: '#4E93B5' } } },
  { h: 'القناة', nodes: {
    direct: { l: 'خدمات مباشرة', c: '#3B6C8C', d: '#6FB4D6', go: 'requests' },
    cases: { l: 'توكيل قضايا', c: '#97773C', d: '#D9B77A', go: 'cases' },
    support: { l: 'دعم فني', c: '#7A5F99', d: '#A995DA', go: 'support' },
    biz: { l: 'طلبات منشآت', c: '#4D8A6A', d: '#6FCBA1', go: 'business' } } },
  { h: 'الإسناد', nodes: { yes: { l: 'أُسند', c: '#2A5063', d: '#5AA6C7' }, no: { l: 'لم يُسند', c: '#8A969D', d: '#9FB0BA' } } },
  { h: 'النتيجة', nodes: {
    done: { l: 'مكتمل', c: '#B8914B', d: '#E6C88E', st: 'done' },
    working: { l: 'قيد العمل', c: '#1B3A4B', d: '#4E93B5', st: 'assigned,contacted,progress,review' },
    waiting: { l: 'بانتظار العميل', c: '#C9A96E', d: '#D9B77A', st: 'waiting' },
    idle: { l: 'لم يبدأ بعد', c: '#8A969D', d: '#9FB0BA', st: 'new,pending' },
    lost: { l: 'مغلق أو ملغي', c: '#A08A86', d: '#9E8F8B', st: 'closed,cancelled' } } },
];
const FKEYS = FL.map((c) => Object.keys(c.nodes));
const RANGES = [['today', 'اليوم'], ['week', 'آخر 7 أيام'], ['month', 'هذا الشهر'], ['all', 'الكل']];
S.flowRange = 'all';
function flowItems() {
  const from = { today: sod(TODAY), week: new Date(+TODAY - 6 * DAY), month: new Date(2026, 8, 1), all: new Date(2000, 0, 1) }[S.flowRange];
  const it = [];
  REQUESTS.forEach((r) => {
    if (r.created_at < from) return;
    const ch = r.source === 'subscription' ? 'biz' : r.kind === 'cases' ? 'cases' : 'direct';
    const o = r.status === 'done' ? 'done' : ['closed', 'cancelled'].includes(r.status) ? 'lost' : r.status === 'waiting' ? 'waiting' : !r.assigned_to ? 'idle' : 'working';
    it.push({ k: ['all', ch, r.assigned_to ? 'yes' : 'no', o], at: r.created_at, end: r.closed_at, src: r.source, over: !r.assigned_to && isOpen(r) && hoursSince(r.created_at) > SLA.assign });
  });
  BIZ_REQUESTS.forEach((b) => {
    if (b.created_at < from) return;
    const o = b.status === 'completed' ? 'done' : b.status === 'cancelled' ? 'lost' : b.status === 'awaiting_client' ? 'waiting' : !b.assigned_to ? 'idle' : 'working';
    it.push({ k: ['all', 'biz', b.assigned_to ? 'yes' : 'no', o], at: b.created_at, end: b.status === 'completed' ? b.updated_at : null, src: 'biz', over: !b.assigned_to && hoursSince(b.created_at) > SLA.assign && o === 'idle' });
  });
  TICKETS.forEach((t) => {
    if (t.at < from) return;
    const open = t.status === 'open';
    it.push({ k: ['all', 'support', open ? 'no' : 'yes', open ? 'idle' : 'done'], at: t.at, end: open ? null : new Date(+t.at + 5 * 36e5), src: 'support_ticket', over: open && hoursSince(t.at) > SLA.assign });
  });
  return it;
}
const avgH = (arr) => arr.length ? Math.round(arr.reduce((a, x) => a + ((x.end || nowDate()) - x.at) / 36e5, 0) / arr.length) : 0;
function sankey(items) {
  const total = items.length;
  const W = 1000, H = 440, NW = 14, GAP = 22;
  const X = [826, 596, 380, 196];
  const dk = isDark();
  const col = (ci, k) => { const n = FL[ci].nodes[k]; return dk ? n.d : n.c; };
  const present = FKEYS.map((keys, ci) => keys.filter((k) => items.some((x) => x.k[ci] === k)));
  const maxNodes = Math.max(...present.map((c) => c.length));
  const scale = (H - (maxNodes - 1) * GAP) / total;                   /* المقياس نفسه لكل الأعمدة: كل طلب = نفس السُمك */
  const nodes = present.map((keys, ci) => {
    const list = keys.map((k) => { const its = items.filter((x) => x.k[ci] === k); return { ci, k, n: its.length, h: its.length * scale, its }; });
    const tot = list.reduce((a, n) => a + n.h, 0) + (list.length - 1) * GAP; let y = (H - tot) / 2;
    list.forEach((n) => { n.y = y; y += n.h + GAP; }); return list;
  });
  const node = (ci, k) => nodes[ci].find((n) => n.k === k);
  /* كل مسار متصل من النبع حتى النتيجة، بسُمك ثابت = عدد طلباته × المقياس */
  const routes = {};
  items.forEach((x) => { const key = x.k.join('|'); (routes[key] = routes[key] || []).push(x); });
  const ord = (ci, k) => FKEYS[ci].indexOf(k);
  const R = Object.entries(routes).map(([key, its]) => ({ k: key.split('|'), its, t: its.length * scale }));
  const orders = [
    (a, b) => ord(1, a.k[1]) - ord(1, b.k[1]) || ord(2, a.k[2]) - ord(2, b.k[2]) || ord(3, a.k[3]) - ord(3, b.k[3]),
    (a, b) => ord(2, a.k[2]) - ord(2, b.k[2]) || ord(3, a.k[3]) - ord(3, b.k[3]),
    (a, b) => ord(1, a.k[1]) - ord(1, b.k[1]) || ord(3, a.k[3]) - ord(3, b.k[3]),
    (a, b) => ord(2, a.k[2]) - ord(2, b.k[2]) || ord(1, a.k[1]) - ord(1, b.k[1]),
  ];
  const ys = R.map(() => []);
  [0, 1, 2, 3].forEach((ci) => {
    const groups = {}; R.forEach((r, i) => { (groups[r.k[ci]] = groups[r.k[ci]] || []).push(i); });
    Object.entries(groups).forEach(([k, idx]) => { let y = node(ci, k).y; idx.sort((a, b) => orders[ci](R[a], R[b])).forEach((i) => { ys[i][ci] = y; y += R[i].t; }); });
  });
  const edge = (y, t) => {
    const pts = [[X[0], y[0]], [X[1] + NW, y[1]], [X[1], y[1]], [X[2] + NW, y[2]], [X[2], y[2]], [X[3] + NW, y[3]]];
    const seg = (p, q, dy) => { const cx = (p[0] + q[0]) / 2; return ` C${cx} ${p[1] + dy} ${cx} ${q[1] + dy} ${q[0]} ${q[1] + dy}`; };
    let top = `M${pts[0][0]} ${pts[0][1]}` + seg(pts[0], pts[1], 0) + ` L${pts[2][0]} ${pts[2][1]}` + seg(pts[2], pts[3], 0) + ` L${pts[4][0]} ${pts[4][1]}` + seg(pts[4], pts[5], 0);
    const rp = pts.slice().reverse();
    let bot = ` L${rp[0][0]} ${rp[0][1] + t}` + seg(rp[0], rp[1], t) + ` L${rp[2][0]} ${rp[2][1] + t}` + seg(rp[2], rp[3], t) + ` L${rp[4][0]} ${rp[4][1] + t}` + seg(rp[4], rp[5], t) + ' Z';
    let mid = `M${pts[0][0]} ${pts[0][1] + t / 2}` + seg(pts[0], pts[1], t / 2) + ` L${pts[2][0]} ${pts[2][1] + t / 2}` + seg(pts[2], pts[3], t / 2) + ` L${pts[4][0]} ${pts[4][1] + t / 2}` + seg(pts[4], pts[5], t / 2);
    return { area: top + bot, top, mid };
  };
  let defs = `<linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="0" x2="260" y1="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF6DF" stop-opacity="${dk ? '.5' : '.75'}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" from="1000 0" to="-300 0" dur="3.6s" repeatCount="indefinite"/></linearGradient>
    <linearGradient id="goldEdge" x1="0" x2="1"><stop offset="0" stop-color="#E9D3A2"/><stop offset=".5" stop-color="#C9A96E"/><stop offset="1" stop-color="#F3E3BC"/></linearGradient>`;
  let bands = '';
  const pct = (n) => Math.round((n / total) * 100);
  R.forEach((r, i) => {
    const e = edge(ys[i], r.t); const done = r.k[3] === 'done', lost = r.k[3] === 'lost', moving = r.k[3] === 'working';
    const over = r.k[2] === 'no' && r.its.some((x) => x.over);
    const c1 = col(1, r.k[1]), c3 = over ? '#C4643F' : col(3, r.k[3]);
    const x0 = X[0], x3 = X[3] + NW, f = (x) => ((x0 - x) / (x0 - x3)).toFixed(3);
    defs += done
      ? `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="${x0}" x2="${x3}" y1="0" y2="0"><stop offset="0" stop-color="${col(0, 'all')}" stop-opacity=".55"/><stop offset="${f(X[1])}" stop-color="${c1}" stop-opacity=".6"/><stop offset="${f(X[2])}" stop-color="#C9A96E" stop-opacity=".72"/><stop offset="1" stop-color="#E6C88E" stop-opacity=".95"/></linearGradient>`
      : `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="${x0}" x2="${x3}" y1="0" y2="0"><stop offset="0" stop-color="${col(0, 'all')}" stop-opacity=".5"/><stop offset="${f(X[1])}" stop-color="${c1}" stop-opacity=".5"/><stop offset="1" stop-color="${c3}" stop-opacity="${lost ? '.32' : '.55'}"/></linearGradient>`;
    const avg = avgH(r.its);
    const tip = `${FL[1].nodes[r.k[1]].l} ← ${FL[2].nodes[r.k[2]].l} ← ${FL[3].nodes[r.k[3]].l}<br><b>${pReq(r.its.length)} · ${pct(r.its.length)}% من الإجمالي</b><br>${done ? 'متوسط زمن الإكمال' : 'متوسط عمر الطلب'}: ${hHuman(avg)}${over ? '<br><b>فيه طلبات تجاوزت مهلة الإسناد</b>' : ''}`;
    bands += `<g class="sk-g ${done ? 'is-done' : ''}" data-r="${r.k.join(' ')}" data-a="flowGo" data-ch="${r.k[1]}" data-o="${r.k[3]}" data-as="${r.k[2]}" data-tip="${esc(tip)}">
      <path class="sk-link" d="${e.area}" fill="url(#g${i})" style="animation-delay:${i * 55}ms"/>
      ${done ? `<path class="sk-shine" d="${e.area}" fill="url(#shine)"/><path class="sk-edge" d="${e.top}" stroke="url(#goldEdge)" fill="none"/>` : ''}
      ${moving || done ? `<path class="sk-stream ${done ? 'gold' : ''}" d="${e.mid}" stroke="${done ? '#FFF1CF' : c1}" stroke-width="${Math.min(8, Math.max(1.4, r.t / 6))}" fill="none" style="animation-delay:${(i % 5) * .7}s"/>` : ''}
    </g>`;
  });
  const heads = FL.map((c, ci) => `<text x="${X[ci] + NW / 2}" y="-30" class="sk-head" text-anchor="middle">${c.h}</text>`).join('');
  const nodeEls = nodes.map((list, ci) => list.map((n) => {
    const d = FL[ci].nodes[n.k]; const over = n.its.filter((x) => x.over).length; const done = n.k === 'done';
    const fill = done ? 'url(#goldEdge)' : (n.k === 'no' || n.k === 'idle') && over ? '#C4643F' : col(ci, n.k);
    const sub = `${pReq(n.n)} · ${pct(n.n)}%`; const warn = over && (n.k === 'no' || n.k === 'idle') ? `${over} تجاوز مهلة الإسناد` : '';
    const tip = `${d.l}: ${pReq(n.n)} (${pct(n.n)}%)<br>${done ? 'متوسط زمن الإكمال' : 'متوسط عمر الطلب'}: ${hHuman(avgH(n.its))}${ci === 0 ? '<br><b>اضغط لمعرفة مصادر الطلبات</b>' : ''}`;
    const cy = n.y + n.h / 2;
    const lab = ci === 0
      ? `<g class="sk-lab"><text x="${X[0] + NW + 14}" y="${cy - 4}" class="sk-l big" text-anchor="end">${d.l}</text><text x="${X[0] + NW + 14}" y="${cy + 18}" class="sk-num" text-anchor="end">${n.n}</text></g>`
      : ci === 3
      ? `<g class="sk-lab"><text x="${X[3] - 14}" y="${cy - 2}" class="sk-l ${done ? 'gold' : ''}" text-anchor="start">${d.l}</text><text x="${X[3] - 14}" y="${cy + 15}" class="sk-n" text-anchor="start">${sub}</text>${warn ? `<text x="${X[3] - 14}" y="${cy + 31}" class="sk-warn" text-anchor="start">${warn}</text>` : ''}</g>`
      : `<g class="sk-lab pill"><rect/><text x="${X[ci] + NW + 10}" y="${cy - 2}" class="sk-l" text-anchor="end">${d.l}</text><text x="${X[ci] + NW + 10}" y="${cy + 14}" class="sk-n" text-anchor="end">${sub}</text>${warn ? `<text x="${X[ci] + NW + 10}" y="${cy + 29}" class="sk-warn" text-anchor="end">${warn}</text>` : ''}</g>`;
    return `<g class="sk-node ${done ? 'done' : ''}" data-ci="${ci}" data-k="${n.k}" data-a="flowNode" data-tip="${esc(tip)}"><rect x="${X[ci]}" y="${n.y}" width="${NW}" height="${Math.max(3, n.h)}" rx="7" fill="${fill}"/>${lab}</g>`;
  }).join('')).join('');
  return `<div class="sk-wrap"><svg viewBox="-4 -52 ${W + 8} ${H + 80}" class="sankey" id="sankey"><defs>${defs}</defs>${heads}${bands}${nodeEls}</svg></div>`;
}
/* تفاعل المجرى */
HOOKS.push((root) => {
  const svg = $('#sankey', root); if (!svg) return;
  $$('.sk-lab.pill', svg).forEach((g) => { const bb = [...g.querySelectorAll('text')].map((t) => t.getBBox()); const x = Math.min(...bb.map((b) => b.x)) - 7, y = Math.min(...bb.map((b) => b.y)) - 4, x2 = Math.max(...bb.map((b) => b.x + b.width)) + 7, y2 = Math.max(...bb.map((b) => b.y + b.height)) + 4; const r = g.querySelector('rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', x2 - x); r.setAttribute('height', y2 - y); r.setAttribute('rx', 8); });
  $$('.sk-node', svg).forEach((nd) => {
    nd.onmouseenter = () => { svg.classList.add('focus'); const ci = +nd.dataset.ci, k = nd.dataset.k; $$('.sk-g', svg).forEach((g) => g.classList.toggle('on', g.dataset.r.split(' ')[ci] === k)); };
    nd.onmouseleave = () => { svg.classList.remove('focus'); $$('.sk-g.on', svg).forEach((g) => g.classList.remove('on')); };
  });
});
A.flowRange = (el) => { S.flowRange = el.dataset.v; rerender(); };
A.flowGo = (el) => {
  const ch = el.dataset.ch, o = el.dataset.o, as = el.dataset.as;
  const go_ = FL[1].nodes[ch].go;
  if (go_ === 'support') { S.tkF = o === 'idle' ? 'open' : 'all'; return go('support'); }
  if (go_ === 'business') { S.bizTab = 'requests'; S.bizF = o === 'waiting' ? 'awaiting_client' : o === 'done' ? 'all' : 'open'; return go('business'); }
  S.kind = ch === 'cases' ? 'cases' : 'direct'; S.view = 'list'; S.q = '';
  S.saved = as === 'no' && o === 'idle' ? 'unassigned' : 'all'; S.f = S.saved === 'unassigned' ? {} : { status: FL[3].nodes[o].st };
  go(go_);
};
A.flowNode = (el, e) => {
  const ci = +el.dataset.ci, k = el.dataset.k; const items = flowItems();
  if (ci === 0) {
    const m = {}; items.forEach((x) => { const l = SRC_G[x.src] || x.src; m[l] = (m[l] || 0) + 1; });
    return openPop(el, [{ h: 'من أين وصلت الطلبات' }, ...Object.entries(m).sort((a, b) => b[1] - a[1]).map(([l, n]) => ({ l: `${l} — ${pReq(n)}`, ic: 'inbox' }))]);
  }
  if (ci === 1) { const go_ = FL[1].nodes[k].go; if (go_ === 'business') S.bizTab = 'requests'; if (go_ === 'support') S.tkF = 'all'; if (go_ === 'requests' || go_ === 'cases') { S.saved = 'all'; S.f = {}; } return go(go_); }
  if (ci === 2) { S.kind = 'direct'; S.f = {}; S.saved = k === 'no' ? 'unassigned' : 'open'; return go('requests'); }
  S.kind = 'direct'; S.saved = 'all'; S.f = k === 'idle' ? {} : { status: FL[3].nodes[k].st }; if (k === 'idle') S.saved = 'unassigned'; go('requests');
};
function pulseHeat() {
  const buckets = ['صباح 8–11', 'ظهر 11–14', 'عصر 14–17', 'مساء 17–22'];
  const bi = (h) => h < 11 ? 0 : h < 14 ? 1 : h < 17 ? 2 : 3;
  const g = [...Array(7)].map(() => [0, 0, 0, 0]);
  REQUESTS.forEach((r) => { const d = r.created_at; g[d.getDay()][bi(d.getHours())]++; });
  const mx = Math.max(1, ...g.flat());
  return `<div class="pulse"><div class="pulse-y">${buckets.map((b) => `<span>${b}</span>`).join('')}</div>
    <div class="pulse-g">${[...Array(7)].map((_, d) => `<div class="pulse-col">${[0, 1, 2, 3].map((b) => { const v = g[d][b]; return `<i style="background:${v ? `color-mix(in srgb,var(--navy) ${18 + (v / mx) * 78}%,var(--sunk))` : 'var(--sunk-2)'}" data-tip="${esc(WEEK_AR[d] + ' — ' + buckets[b] + ': ' + pReq(v))}"></i>`; }).join('')}<span>${WEEK_AR[d].replace('ال', '')}</span></div>`).join('')}</div></div>`;
}
function flowWaffle() {
  const counts = {}; REQUESTS.forEach((r) => { counts[r.service] = (counts[r.service] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => x[0]);
  const sorted = REQUESTS.slice().sort((a, b) => (top.indexOf(a.service) + 99) % 99 - (top.indexOf(b.service) + 99) % 99);
  return `<div><div class="waffle" style="grid-template-columns:repeat(10,1fr)">${sorted.map((r, i) => `<i style="background:${top.includes(r.service) ? SV(r.service).c : 'var(--faint)'};animation-delay:${i * 14}ms" data-a="openReq" data-id="${r.id}" data-tip="${esc(r.customer + ' — ' + svName(r))}"></i>`).join('')}</div>
    <div class="legend" style="margin-top:14px">${top.map((k) => `<span><i style="--c:${SV(k).c}"></i>${SV(k).name} (${counts[k]})</span>`).join('')}<span><i style="--c:var(--faint)"></i>خدمات أخرى</span></div></div>`;
}
function flowSpeed() {
  const closed = REQUESTS.filter((r) => r.closed_at && r.assigned_at && r.contacted_at);
  const avg = (f) => closed.length ? closed.reduce((a, r) => a + f(r), 0) / closed.length : 0;
  const a1 = avg((r) => (r.assigned_at - r.created_at) / 36e5), a2 = avg((r) => (r.contacted_at - r.assigned_at) / 36e5), a3 = avg((r) => (r.closed_at - r.contacted_at) / 36e5);
  const tot = a1 + a2 + a3 || 1;
  const segs = [['من الوصول إلى الإسناد', a1, '#3B6C8C', SLA.assign], ['من الإسناد إلى التواصل', a2, '#C9A96E', SLA.contact], ['من التواصل إلى الإغلاق', a3, '#3D7759', null]];
  return `<div class="speed"><div class="speed-bar">${segs.map(([l, v, c], i) => `<div style="flex:${Math.max(0.6, v)};min-width:64px;background:${c};animation-delay:${i * 120}ms" data-tip="${esc(l + ': ' + Math.round(v) + ' ساعة')}"><b>${Math.round(v)} س</b></div>`).join('')}</div>
    <div class="speed-leg">${segs.map(([l, v, c, lim]) => `<div><i style="background:${c}"></i><div><b>${l}</b><span>${Math.round(v)} ساعة${lim ? ` — المهلة ${lim} ساعة${v > lim ? ' (تجاوز)' : ' (ضمن الحد)'}` : ''}</span></div></div>`).join('')}</div>
    <p class="muted" style="font-size:12.5px;line-height:1.8;margin-top:12px">متوسط رحلة الطلب المكتمل ${Math.round(tot)} ساعة من وروده حتى إغلاقه، محسوبة من ${closed.length} طلبًا مغلقًا.</p></div>`;
}
VIEWS.flow = () => {
  const items = flowItems(); const total = items.length;
  const cnt = (ci, k) => items.filter((x) => x.k[ci] === k).length;
  const assigned = cnt(2, 'yes'), done = cnt(3, 'done'), stuck = cnt(3, 'waiting') + cnt(3, 'idle');
  const chs = FKEYS[1].map((k) => [k, cnt(1, k)]).sort((a, b) => b[1] - a[1]);
  const pc = (n) => total ? Math.round((n / total) * 100) : 0;
  const over = items.filter((x) => x.over).length;
  return `<div class="page-h"><div><h1 class="h-disp h1">خريطة التدفق</h1>
    <div class="sub">مجرى واحد يبدأ بكل ما وصل، ويتفرع حسب القناة ثم الإسناد ثم النتيجة. سُمك كل مجرى يساوي عدد طلباته بدقة.</div></div>
    <div class="tools"><div class="seg">${RANGES.map(([v, l]) => `<button class="${S.flowRange === v ? 'on' : ''}" data-a="flowRange" data-v="${v}">${l}</button>`).join('')}</div></div></div>
  ${total ? `
  <div class="flow-stats">
    <div class="fs"><span class="ic" style="--c:var(--blue)">${ic('inbox')}</span><div><b>${counter(total)}</b><span>وصل</span></div></div>
    <div class="fs"><span class="ic" style="--c:var(--navy)">${ic('user')}</span><div><b>${counter(assigned)}</b><span>أُسند — ${pc(assigned)}%</span></div></div>
    <div class="fs gold"><span class="ic" style="--c:var(--gold-dk)">${ic('check')}</span><div><b>${counter(done)}</b><span>اكتمل — ${pc(done)}%</span></div></div>
    <div class="fs"><span class="ic" style="--c:var(--red)">${ic('clock')}</span><div><b>${counter(stuck)}</b><span>ينتظر تدخلًا</span></div></div>
  </div>
  <section class="flow-card" style="margin-bottom:26px">
    <div class="sk-hint">${ic('arrowL', 'width="14" height="14"')}اسحب أفقيًا لمتابعة المجرى حتى النتيجة</div>
    ${sankey(items)}
    <div class="sk-legend"><span><i class="lg-gold"></i>مجرى أكمل مساره</span><span><i class="lg-move"></i>يتحرك: قيد العمل</span><span><i class="lg-still"></i>ساكن: متوقف ينتظر</span>${over ? `<span><i class="lg-red"></i>تجاوز مهلة الإسناد</span>` : ''}<span class="muted" style="margin-inline-start:auto">مرّر على أي مجرى لتفاصيله، واضغطه لفتح طلباته</span></div>
    <p class="flow-read">${ic('bulb', 'width="15" height="15"')}<span>وصل <b>${pReq(total)}</b>؛ ذهب ${chs.filter((c) => c[1]).map(([k, n]) => `${pc(n)}% إلى ${FL[1].nodes[k].l}`).join('، ')}. أُسند منها ${pc(assigned)}%، واكتمل <b>${pReq(done)}</b>، بينما ينتظر ${pReq(stuck)} تدخلًا${over ? `، منها ${over} تجاوز مهلة الإسناد` : ''}.</span></p>
  </section>` : `<div class="flow-card">${empty('لا طلبات في هذه الفترة', 'غيّر الفترة الزمنية أعلاه لعرض المجرى.')}</div>`}
  <div class="grid g12" style="margin-bottom:26px">
    <section class="s7 flow-card"><div class="sec-h"><div class="sec-t">أوقات وصول الطلبات<small>متى تصل خلال أيام الأسبوع</small></div></div>${pulseHeat()}</section>
    <section class="s5 flow-card"><div class="sec-h"><div class="sec-t">سرعة المرور<small>كم يقضي الطلب في كل مرحلة</small></div></div>${flowSpeed()}</section>
  </div>

  <section class="flow-card"><div class="sec-h"><div class="sec-t">توزيع الطلبات<small>كل مربع طلب — اضغطه لفتحه</small></div></div>${flowWaffle()}</section>`;
};

/* ==========================================================
   Core — utilities, icons, UI primitives, charts
   ========================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const sar = (n) => `<span class="ltr num">SAR ${fmt(n)}</span>`;
const sarK = (n) => `<span class="ltr num">SAR ${n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : n}</span>`;
const byId = (arr, id) => arr.find((x) => x.id === id);
const U = (id) => byId(TEAM, id) || { id: 'sys', name: 'النظام', short: 'النظام', ini: 'ن', c: '#97773C', role: '' };
const norm = (s) => String(s || '').replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();

/* ---------- Dates ---------- */
const DAY = 864e5;
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a, b = TODAY) => Math.round((sod(a) - sod(b)) / DAY);
const sameDay = (a, b) => sod(a).getTime() === sod(b).getTime();
const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const WEEK_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const fH = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
/* كل تاريخ مكتوب يُتبع برقم الشهر بين قوسين */
const dm = (d) => `${d.getDate()} ${MONTH_AR[d.getMonth()]} (${d.getMonth() + 1})`;
const dmy = (d) => `${d.getDate()} ${MONTH_AR[d.getMonth()]} ${d.getFullYear()} (${d.getDate()}/${d.getMonth() + 1})`;
const dNum = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
const wd = (d) => WEEK_AR[d.getDay()];
const hijri = (d) => fH.format(d).replace(' هـ', '') + ' هـ';
const hm = (d) => { let h = d.getHours(), m = d.getMinutes(); const p = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return `<span class="ltr num">${h}:${String(m).padStart(2, '0')}</span> ${p}`; };
const hm24 = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const hasTime = (d) => d && (d.getHours() || d.getMinutes());
function plural(n, one, two, few, many) {
  if (n === 1) return one; if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`; return `${n} ${many}`;
}
const pDays = (n) => plural(n, 'يوم', 'يومين', 'أيام', 'يومًا');
const pHours = (n) => plural(n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
function rel(d) {
  const n = dayDiff(d);
  if (n === 0) return 'اليوم'; if (n === 1) return 'غدًا'; if (n === -1) return 'أمس';
  if (n === 2) return 'بعد غد';
  if (n > 0) return n <= 13 ? `بعد ${pDays(n)}` : dm(d);
  return -n <= 30 ? `منذ ${pDays(-n)}` : dm(d);
}
function ago(d) {
  const now = nowDate(); const mins = Math.round((now - d) / 6e4);
  if (mins < 1) return 'الآن'; if (mins < 60) return mins <= 2 ? 'قبل دقيقة' : `قبل ${mins} دقيقة`;
  const h = Math.round(mins / 60); if (h < 24 && sameDay(d, now)) return `قبل ${pHours(h)}`;
  if (dayDiff(d) === -1) return 'أمس ' + hm(d);
  return rel(d);
}
/* The demo is anchored to 16 Sep 2026; the time-of-day follows the real clock during working hours. */
function nowDate() {
  const r = new Date(); let h = r.getHours(), m = r.getMinutes();
  if (h < 8 || h >= 18) { h = 11; m = 24; }
  return new Date(2026, 8, 16, h, m, r.getSeconds());
}

/* ---------- Icons ---------- */
const IC = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  cases: 'M3 7.5h18V20H3z M8.5 7.5V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6a1.7 1.7 0 0 1 1.7 1.7v2.3 M3 12.5h18',
  cal: 'M4 5.5h16V20H4z M4 10h16 M8.5 3v4 M15.5 3v4',
  tasks: 'M9 11.5l2.5 2.5L20 5.5 M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10',
  users: 'M16 20v-1.2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 20v-1.2a4 4 0 0 0-3-3.8 M16 3.2a4 4 0 0 1 0 7.6',
  user: 'M20 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 19.5V21 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  file: 'M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z M14 3v5h5 M8.5 13h7 M8.5 17h5',
  team: 'M12 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4 M5.5 20a6.5 6.5 0 0 1 13 0 M18.5 10.5a2.4 2.4 0 1 0 0-4.8 M5.5 10.5a2.4 2.4 0 1 1 0-4.8 M21.5 18a4.5 4.5 0 0 0-3-4 M2.5 18a4.5 4.5 0 0 1 3-4',
  wallet: 'M3 7.5h15.5a2.5 2.5 0 0 1 2.5 2.5v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 7.5l11.5-4v4 M16.5 14h.01',
  chart: 'M4 20V11 M10 20V4 M16 20v-6 M21.5 20h-19',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  bell: 'M6 8.5a6 6 0 1 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5 M10.3 20.5a2 2 0 0 0 3.4 0',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1.5 14h5 M9.5 8h5 M17.5 16h5',
  search: 'M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15 M20.5 20.5l-4.2-4.2',
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6 6 18 M6 6l12 12',
  chevL: 'M15 18l-6-6 6-6', chevR: 'M9 18l6-6-6-6', chevD: 'M6 9l6 6 6-6', chevU: 'M18 15l-6-6-6 6',
  arrowL: 'M19 12H5 M11 18l-6-6 6-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7.5V12l3 2',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0 M12 9v4 M12 17h.01',
  check: 'M20 6 9 17l-5-5',
  pen: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  phone: 'M21.5 16.4v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 3.7 2 2 0 0 1 3.6 1.5h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.5 9.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2.1z',
  mail: 'M4 4.5h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z M22 6.5l-10 7-10-7',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  grid: 'M3.5 3.5h7v7h-7z M13.5 3.5h7v7h-7z M13.5 13.5h7v7h-7z M3.5 13.5h7v7h-7z',
  kanban: 'M4 4h4.5v16H4z M10 4h4.5v10H10z M16 4h4v13h-4z',
  gantt: 'M3 5.5h9 M8 12h13 M5 18.5h9',
  more: 'M12 12h.01 M19 12h.01 M5 12h.01',
  video: 'M22.5 7.5l-6 4.5 6 4.5z M2 5.5h14v13H2z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9 M12 1.5v2 M12 20.5v2 M4.6 4.6 6 6 M18 18l1.4 1.4 M1.5 12h2 M20.5 12h2 M4.6 19.4 6 18 M18 6l1.4-1.4',
  up: 'M7 17 17 7 M8 7h9v9', down: 'M7 7l10 10 M17 8v9H8',
  trend: 'M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6',
  flag: 'M4.5 22V4 M4.5 4h13l-2.2 4 2.2 4h-13',
  eye: 'M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  filter: 'M21.5 4H2.5l7.6 9v6l3.8 2v-8z',
  megaphone: 'M3 10.5v3a1 1 0 0 0 1 1h2.5L12 19V5L6.5 9.5H4a1 1 0 0 0-1 1z M15.5 8.5a4.5 4.5 0 0 1 0 7 M18.5 5.5a8.5 8.5 0 0 1 0 13',
  headset: 'M3.5 14v-2a8.5 8.5 0 0 1 17 0v2 M20.5 15a2 2 0 0 1-2 2h-1v-5h3z M3.5 15a2 2 0 0 0 2 2h1v-5h-3z M18.5 17v1a3 3 0 0 1-3 3H12',
  code: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
  type: 'M4 7V4.5h16V7 M9 20h6 M12 4.5V20',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z',
  receipt: 'M5 2.5v19l2.3-1.5 2.4 1.5 2.3-1.5 2.3 1.5 2.4-1.5 2.3 1.5v-19l-2.3 1.5-2.4-1.5L12 4 9.7 2.5 7.3 4z M8.5 8h7 M8.5 12h7 M8.5 16h4',
  coins: 'M9 14.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M18.1 10.4A6 6 0 1 1 10.4 18.1 M7.5 6.5h1.5v4',
  activity: 'M22 12h-4l-3 8.5L9 3.5 6 12H2',
  bulb: 'M9 18h6 M10 21.5h4 M12 2.5a6.5 6.5 0 0 0-3.8 11.8V16h7.6v-1.7A6.5 6.5 0 0 0 12 2.5z',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  msg: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.4-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z',
  scale: 'M12 3v18 M7.5 21h9 M5 7h14 M12 5.2l.01 0 M5 7l-3 7a3.5 3.5 0 0 0 6 0z M19 7l-3 7a3.5 3.5 0 0 0 6 0z',
  note: 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z M15 3v6h6',
  drag: 'M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  refresh: 'M21 12a9 9 0 0 1-15.4 6.4L3 16 M3 12a9 9 0 0 1 15.4-6.4L21 8 M21 3v5h-5 M3 21v-5h5',
  folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4.8l2 2.5h8.2A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  keyboard: 'M2.5 6h19v12h-19z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M7 14h10',
  expand: 'M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7',
  shieldCheck: 'M12 2.5 4.5 5.5v6c0 4.9 3.2 8.5 7.5 10 4.3-1.5 7.5-5.1 7.5-10v-6z M8.8 12.2l2.3 2.3 4.2-4.6',
  send: 'M21.5 2.5 10.5 13.5 M21.5 2.5l-7 19-4-8.5-8.5-4z',
  checks: 'M1.5 12.5l4.5 4.5L15 8 M10.5 16l1 1L20.5 8',
  moon: 'M21 13.2A8.7 8.7 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2z',
  droplet: 'M12 2.7 6.9 8.2a7.2 7.2 0 1 0 10.2 0z',
  building: 'M3 21h18 M5 21V6.5l7-3.5 7 3.5V21 M9.5 21v-5h5v5 M9.5 9h.01 M14.5 9h.01 M9.5 12.5h.01 M14.5 12.5h.01',
  shuffle: 'M16 3h5v5 M4 20 21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
  quote: 'M7 21a4 4 0 0 0 4-4V9H3v8h4z M19 21a4 4 0 0 0 4-4V9h-8v8h4z',
  gavel: 'M14.5 3.5l6 6 M12 6l6 6 M9.5 8.5l6 6 M13 7.5 5.5 15 M3 21l6-6 M2 22h9',
};
const EMBLEM = 'data:image/png;base64,/*EMBLEM*/';
const ic = (n, s = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${s}><path d="${IC[n] || IC.file}"/></svg>`;
const LOGO = `<svg viewBox="0 0 40 40" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v28M13 34h14M8 11h24M20 8.5v.01"/><path d="M8 11 4 21a5 5 0 0 0 8 0z M32 11l-4 10a5 5 0 0 0 8 0z"/></svg>`;

/* ---------- Small components ---------- */
const av = (uid, cls = '', pres = false) => { const u = U(uid); return `<span class="av ${cls}" style="--c:${u.c}" data-tip="${esc(u.name)}${u.role ? '<br><b>' + esc(u.role) + '</b>' : ''}">${u.ini}${pres && u.pres !== undefined ? `<span class="pres ${u.pres}"></span>` : ''}</span>`; };
const avs = (ids, cls = 'sm') => `<span class="avs">${ids.map((i) => av(i, cls)).join('')}</span>`;
const stBadge = (s) => `<span class="st" style="--c:${ST[s] ? ST[s].c : 'var(--faint)'}">${ST[s] ? ST[s].l : s}</span>`;
const priBadge = (p) => `<span class="badge ${PRI[p].b}">${PRI[p].l}</span>`;
const orgAv = (name, cls = '', org = true) => `<span class="av ${cls}" style="--c:${org ? '#1B3A4B' : '#97773C'};border-radius:${org ? '10px' : '50%'}">${String(name || '?').replace(/^(شركة|مؤسسة|مجموعة|جمعية)\s+/, '').trim()[0]}</span>`;
const delta = (cur, prev, invert = false) => { if (!prev) return ''; const p = Math.round(((cur - prev) / prev) * 100); const good = invert ? p < 0 : p > 0; const cls = p === 0 ? 'flat' : good ? 'up' : 'dn'; return `<span class="delta ${cls}">${p > 0 ? ic('up') : p < 0 ? ic('down') : ''}${Math.abs(p)}%</span>`; };
const counter = (n, pre = '', suf = '', dec = 0) => `<span class="num" data-count="${n}" data-dec="${dec}" data-pre="${esc(pre)}" data-suf="${esc(suf)}">${pre}${dec ? (0).toFixed(dec) : 0}${suf}</span>`;
const emptyArt = (kind = 'folder') => `<svg class="art" width="96" height="72" viewBox="0 0 96 72" fill="none"><rect x="18" y="14" width="60" height="46" rx="8" fill="#F6EFE1"/><rect x="26" y="8" width="44" height="46" rx="6" fill="#fff" stroke="#EAD9B6"/><path d="M34 20h28M34 28h20M34 36h24" stroke="#C9A96E" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><circle cx="70" cy="52" r="11" fill="#1B3A4B"/><path d="M66 52h8M70 48v8" stroke="#C9A96E" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const empty = (title, text, btn = '', act = '') => `<div class="empty">${emptyArt()}<b>${title}</b><p>${text}</p>${btn ? `<button class="btn btn-p" data-a="${act}">${ic('plus')}${btn}</button>` : ''}</div>`;

/* ---------- Toast ---------- */
function toast(msg, { undo, action, info } = {}) {
  const box = $('#toasts'); const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="ic ${info ? 'info' : ''}">${ic(info ? 'bell' : 'check')}</span><span>${msg}</span>${undo ? '<button data-u>تراجع</button>' : ''}${action ? `<button data-x>${action[0]}</button>` : ''}`;
  box.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  const t = setTimeout(kill, 4200);
  if (undo) el.querySelector('[data-u]').onclick = () => { clearTimeout(t); undo(); kill(); };
  if (action) el.querySelector('[data-x]').onclick = () => { clearTimeout(t); action[1](); kill(); };
  if (box.children.length > 3) box.firstChild.remove();
}

/* ---------- Drawer (with back-stack) ---------- */
const DR = { stack: [] };
function openDrawer(render, { wide = false, push = false } = {}) {
  if (!push) DR.stack = [];
  DR.stack.push({ render, wide });
  paintDrawer(push);
  $('#drawer').classList.add('show'); $('#scrim').classList.add('show');
}
function paintDrawer(anim = false) {
  const top = DR.stack[DR.stack.length - 1]; if (!top) return;
  const { head, body, foot } = top.render();
  const dr = $('#drawer'); dr.classList.toggle('wide', !!top.wide);
  const back = DR.stack.length > 1 ? `<button class="icon-btn" data-a="drBack" data-tip="رجوع">${ic('chevR')}</button>` : '';
  dr.innerHTML = `<div class="dr-h">${back}<div class="ttl">${head}</div><button class="icon-btn" data-a="drClose" data-tip="إغلاق (Esc)">${ic('x')}</button></div><div class="dr-b ${anim ? 'swap' : ''}">${body}</div>${foot ? `<div class="dr-f">${foot}</div>` : ''}`;
  runCounters(dr);
}
function refreshDrawer() { if ($('#drawer').classList.contains('show')) paintDrawer(false); }
function closeDrawer() { $('#drawer').classList.remove('show'); $('#scrim').classList.remove('show'); DR.stack = []; }
function drawerBack() { DR.stack.pop(); if (!DR.stack.length) return closeDrawer(); paintDrawer(true); }

/* ---------- Modal ---------- */
function openModal(html, size = '') {
  const w = $('#modal'); w.innerHTML = `<div class="modal ${size}">${html}</div>`;
  requestAnimationFrame(() => w.classList.add('show'));
  setTimeout(() => { const f = w.querySelector('[autofocus], .inp'); f && f.focus(); }, 60);
}
function closeModal() { const w = $('#modal'); w.classList.remove('show'); setTimeout(() => { if (!w.classList.contains('show')) w.innerHTML = ''; }, 220); }

/* ---------- Popover / context menu ---------- */
function openPop(anchorOrXY, items, opts = {}) {
  closePop();
  const p = document.createElement('div'); p.className = 'pop'; p.id = 'pop';
  p.innerHTML = items.map((it) => it === '-' ? '<div class="msep"></div>' : it.h ? `<div class="mh">${it.h}</div>` :
    `<button class="mi ${it.red ? 'red' : ''}" data-i="${items.indexOf(it)}">${it.ic ? ic(it.ic) : ''}<span>${it.l}</span>${it.k ? `<span class="k">${it.k}</span>` : ''}${it.on ? `<span class="k" style="color:var(--green)">${ic('check', 'width="14" height="14"')}</span>` : ''}</button>`).join('');
  document.body.appendChild(p);
  let x, y;
  if (anchorOrXY.nodeType) { const r = anchorOrXY.getBoundingClientRect(); x = r.right - p.offsetWidth; y = r.bottom + 6; if (opts.alignStart) x = r.left; }
  else { x = anchorOrXY.x - p.offsetWidth; y = anchorOrXY.y; }
  x = Math.max(8, Math.min(x, innerWidth - p.offsetWidth - 8)); if (y + p.offsetHeight > innerHeight - 8) y = Math.max(8, y - p.offsetHeight - 40);
  p.style.left = x + 'px'; p.style.top = y + 'px';
  p.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; closePop(); it.f && it.f(); };
}
function closePop() { $('#pop')?.remove(); }

/* ---------- Tooltip & peek ---------- */
let tipEl, tipT, peekT;
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest('[data-tip]');
  if (t) {
    clearTimeout(tipT);
    tipT = setTimeout(() => {
      tipEl.innerHTML = t.dataset.tip; tipEl.classList.add('show');
      const r = t.getBoundingClientRect(); const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      let x = r.left + r.width / 2 - w / 2, y = r.top - h - 8; if (y < 6) y = r.bottom + 8;
      tipEl.style.left = Math.max(6, Math.min(x, innerWidth - w - 6)) + 'px'; tipEl.style.top = y + 'px';
    }, 280);
  }
  const pk = e.target.closest('[data-peek]');
  if (pk && !pk._peek && window.PEEK) {
    pk._peek = true; clearTimeout(peekT);
    peekT = setTimeout(() => showPeek(pk), 600);
    pk.addEventListener('mouseleave', () => { pk._peek = false; clearTimeout(peekT); $('#peek')?.remove(); }, { once: true });
  }
});
document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) { clearTimeout(tipT); tipEl?.classList.remove('show'); } });
/* ---------- Animated counters ---------- */
function runCounters(root = document) {
  $$('[data-count]', root).forEach((el) => {
    if (el._done) return; el._done = true;
    const to = +el.dataset.count, dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    const from = +(el._from || 0); const t0 = performance.now(); const dur = 900;
    const f = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); const v = from + (to - from) * e;
      el.textContent = pre + (dec ? v.toFixed(dec) : fmt(v)) + suf; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}

/* ---------- Segmented & tabs indicator ---------- */
function syncIndicators(root = document) {
  $$('.seg', root).forEach((s) => { const on = s.querySelector('button.on'); let pill = s.querySelector('.pill'); if (!pill) { pill = document.createElement('span'); pill.className = 'pill'; s.prepend(pill); } if (on) { pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px'; } });
  $$('.tabs', root).forEach((s) => { const on = s.querySelector('button.on'); let ink = s.querySelector('.ink'); if (!ink) { ink = document.createElement('span'); ink.className = 'ink'; s.appendChild(ink); } if (on) { ink.style.left = on.offsetLeft + 'px'; ink.style.width = on.offsetWidth + 'px'; } });
}

/* ==========================================================
   Charts (SVG). Time flows right → left, RTL-native.
   ========================================================== */
function xRTL(i, n, w, padL, padR) { const inner = w - padL - padR; return n <= 1 ? w - padR - inner / 2 : w - padR - (inner * i) / (n - 1); }
function spark(vals, w = 120, h = 34, color = 'var(--navy)', area = true) {
  const mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => [xRTL(i, vals.length, w, 2, 2), h - 3 - ((v - mn) / r) * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${area ? `<path class="fade-area" d="${d} L${last[0]} ${h} L${pts[0][0]} ${h}Z" fill="${color}" opacity=".08"/>` : ''}<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.8" fill="${color}"/></svg>`;
}
function smooth(pts) {
  if (pts.length < 2) return ''; let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
  return d;
}
function lineChart({ series, labels, w = 640, h = 220, yFmt = (v) => v, max, bars }) {
  const padL = 36, padR = 8, padT = 14, padB = 26; const n = labels.length;
  const all = series.flatMap((s) => s.values).concat(bars ? bars.values : []);
  const mx = max || Math.ceil(Math.max(...all) * 1.12 / 10) * 10; const ih = h - padT - padB;
  const y = (v) => padT + ih - (v / mx) * ih;
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = (mx / 4) * k; g += `<line class="gridl" x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end" direction="ltr">${yFmt(v)}</text>`; }
  labels.forEach((l, i) => { g += `<text class="axis" x="${xRTL(i, n, w, padL + 14, padR + 14)}" y="${h - 6}" text-anchor="middle">${l}</text>`; });
  let bar = '';
  if (bars) { const bw = Math.min(22, ((w - padL - padR) / n) * 0.45); bars.values.forEach((v, i) => { if (v == null) return; const x = xRTL(i, n, w, padL + 14, padR + 14); bar += `<rect class="growY" style="animation-delay:${i * 40}ms" x="${x - bw / 2}" y="${y(v)}" width="${bw}" height="${padT + ih - y(v)}" rx="4" fill="${bars.color}" ${bars.op ? `opacity="${bars.op}"` : ''}/>`; }); }
  let lines = '';
  series.forEach((s) => {
    const pts = s.values.map((v, i) => v == null ? null : [xRTL(i, n, w, padL + 14, padR + 14), y(v)]).filter(Boolean);
    const d = smooth(pts);
    if (s.area) lines += `<path class="fade-area" d="${d} L${pts[pts.length - 1][0]} ${padT + ih} L${pts[0][0]} ${padT + ih}Z" fill="${s.color}" opacity=".07"/>`;
    lines += `<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" ${s.dash ? 'stroke-dasharray="4 4" style="animation:none;stroke-dashoffset:0"' : ''} stroke-linecap="round"/>`;
    if (!s.dash) pts.forEach((p, i) => { lines += `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 4 : 0}" fill="#fff" stroke="${s.color}" stroke-width="2"/>`; });
  });
  let hits = ''; const step = (w - padL - padR - 28) / Math.max(1, n - 1);
  labels.forEach((l, i) => { const x = xRTL(i, n, w, padL + 14, padR + 14); const tip = `<b>${l}</b><br>` + series.map((s) => s.values[i] != null ? `${s.name}: ${yFmt(s.values[i], true)}` : '').filter(Boolean).join('<br>') + (bars && bars.values[i] != null ? `<br>${bars.name}: ${yFmt(bars.values[i], true)}` : ''); hits += `<rect class="hit" x="${x - step / 2}" y="${padT}" width="${step}" height="${ih}" data-tip="${esc(tip)}"/>`; });
  return `<div class="chart-box"><svg viewBox="0 0 ${w} ${h}">${g}${bar}${lines}${hits}</svg></div>`;
}
function groupBars({ groups, labels, w = 640, h = 200, colors }) {
  const padL = 28, padR = 6, padT = 10, padB = 26; const n = labels.length; const mx = Math.ceil(Math.max(...groups.flat()) * 1.15);
  const ih = h - padT - padB; const y = (v) => padT + ih - (v / mx) * ih; const slot = (w - padL - padR) / n; const bw = Math.min(14, slot / (groups.length + 1.4));
  let s = '';
  for (let k = 0; k <= 3; k++) { const v = Math.round((mx / 3) * k); s += `<line class="gridl" x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`; }
  labels.forEach((l, i) => {
    const cx = w - padR - slot * i - slot / 2;
    groups.forEach((g, j) => { const x = cx + (j - (groups.length - 1) / 2) * (bw + 3) * -1 - bw / 2; s += `<rect class="growY" style="animation-delay:${i * 35 + j * 60}ms" x="${x}" y="${y(g[i])}" width="${bw}" height="${padT + ih - y(g[i])}" rx="3.5" fill="${colors[j]}"/>`; });
    s += `<text class="axis" x="${cx}" y="${h - 7}" text-anchor="middle">${l}</text><rect class="hit" x="${cx - slot / 2}" y="${padT}" width="${slot}" height="${ih}" data-tip="<b>${l}</b><br>جديدة: ${groups[0][i]}<br>مغلقة: ${groups[1][i]}"/>`;
  });
  return `<div class="chart-box"><svg viewBox="0 0 ${w} ${h}">${s}</svg></div>`;
}
function ring(pct, size = 120, sw = 10, color = 'var(--navy)', track = 'var(--sunk-2)', inner = '') {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0"><svg width="${size}" height="${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track}" stroke-width="${sw}" fill="none"/><circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - pct / 100)}"/></svg><div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1.2">${inner}</div></div>`;
}
function runRings(root = document) { requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring-arc', root).forEach((a) => a.setAttribute('stroke-dashoffset', a.dataset.off)))); }
function gauge(score, size = 132) {
  const r = 52, cx = 66, cy = 66, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2; const L = r * (a1 - a0);
  const pt = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  const col = score >= 75 ? 'var(--green)' : score >= 55 ? 'var(--gold)' : 'var(--red)';
  const lbl = score >= 75 ? 'مستقرة' : score >= 55 ? 'تحتاج متابعة' : 'حرجة';
  const d = `M${x0} ${y0} A${r} ${r} 0 1 1 ${x1} ${y1}`;
  return `<div style="position:relative;width:${size}px;height:${size * 0.86}px;flex-shrink:0"><svg width="${size}" height="${size}" viewBox="0 0 132 132"><path d="${d}" stroke="var(--sunk-2)" stroke-width="10" fill="none" stroke-linecap="round"/><path class="ring-arc" d="${d}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L}" data-off="${L * (1 - score / 100)}"/></svg><div style="position:absolute;top:36px;left:0;right:0;text-align:center;line-height:1.2"><b style="font-size:30px;font-weight:600;color:var(--navy-xdk)">${counter(score)}</b><div style="font-size:12px;color:${col};font-weight:600">${lbl}</div></div></div>`;
}

function showPeek(el) {
  const html = window.PEEK && window.PEEK(el); if (!html) return; $('#peek')?.remove();
  const p = document.createElement('div'); p.className = 'peek'; p.id = 'peek'; p.innerHTML = html;
  document.body.appendChild(p);
  const r = el.getBoundingClientRect(); let x = r.left, y = r.bottom + 8;
  if (y + p.offsetHeight > innerHeight) y = Math.max(8, r.top - p.offsetHeight - 8);
  p.style.left = Math.max(8, Math.min(x, innerWidth - 348)) + 'px'; p.style.top = y + 'px';
}

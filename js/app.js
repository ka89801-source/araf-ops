// ─── APP STATE ─── //
let currentPage   = 'dashboard';
let currentRequest = null;
let filterStatus  = 'all';
let filterService = 'all';
let searchQuery   = '';

// ─── ICONS SVG ─── //
const ICONS = {
  home:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  requests: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  employees:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  notif:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  plus:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  filter:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  clock:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  user:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  assign:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
  msg:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  attach:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  star:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  chart:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  refresh:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  eye:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  close:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  menu:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`,
  back:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`,
  spark:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
};

// ─── NAVIGATION ─── //
function navigate(page, extra = null) {
  currentPage = page;
  if (extra) currentRequest = extra;

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Update nav
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Show page
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    renderPage(page);
  }

  // Update breadcrumb
  const titles = { dashboard: 'لوحة التحكم', requests: 'إدارة الطلبات', detail: 'تفاصيل الطلب', employees: 'الموظفون', notifications: 'التنبيهات', settings: 'الإعدادات' };
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = titles[page] || page;

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');
}

function renderPage(page) {
  switch(page) {
    case 'dashboard':   renderDashboard();    break;
    case 'requests':    renderRequests();     break;
    case 'detail':      renderDetail();       break;
    case 'employees':   renderEmployees();    break;
    case 'notifications': renderNotifications(); break;
    case 'settings':    renderSettings();     break;
  }
}

// ─── DASHBOARD ─── //
function renderDashboard() {
  const stats = getStats();

  const el = document.getElementById('page-dashboard');
  el.innerHTML = `
    <!-- Stats Row -->
    <div class="stats-grid">
      ${statCard('blue',   ICONS.spark,   stats.new,     'طلبات جديدة',           '+3 اليوم',  'up')}
      ${statCard('urgent', ICONS.alert,   stats.urgent,  'طلبات عاجلة',           '+2 الآن',   'down')}
      ${statCard('purple', ICONS.clock,   stats.review,  'قيد المراجعة',          '',          '')}
      ${statCard('amber',  ICONS.refresh, stats.waiting, 'بانتظار العميل',        '',          '')}
      ${statCard('teal',   ICONS.assign,  stats.assigned,'مسندة لموظفين',         '',          '')}
      ${statCard('green',  ICONS.check,   stats.done,    'مكتملة',                '+5 هذا الأسبوع', 'up')}
      ${statCard('navy',   ICONS.closed,  stats.closed,  'مغلقة',                 '',          '')}
      ${statCard('gold',   ICONS.chart,   stats.total,   'إجمالي الطلبات',        '',          '')}
    </div>

    <!-- Charts + Recent -->
    <div class="grid-3" style="margin-bottom:20px">
      <!-- Latest Requests -->
      <div class="section">
        <div class="section-head">
          <span class="section-title">أحدث الطلبات الواردة</span>
          <button class="btn btn-ghost btn-sm" onclick="navigate('requests')">${ICONS.eye} عرض الكل</button>
        </div>
        <div style="overflow:hidden">
          ${REQUESTS.slice(0,5).map(r => miniRequestRow(r)).join('')}
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Work Distribution -->
        <div class="section">
          <div class="section-head">
            <span class="section-title">توزيع العمل</span>
          </div>
          <div class="section-body">
            <div class="chart-bar-wrap">
              ${EMPLOYEES.filter(e=>e.active).map(e => `
                <div class="chart-bar-item">
                  <span class="chart-bar-label">${e.name.split(' ')[0]}</span>
                  <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${Math.round(e.open/12*100)}%;background:${e.color}"></div>
                  </div>
                  <span class="chart-bar-val">${e.open}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Notifications preview -->
        <div class="section">
          <div class="section-head">
            <span class="section-title">تنبيهات</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('notifications')">${ICONS.eye}</button>
          </div>
          <div>
            ${NOTIFICATIONS.filter(n=>!n.read).slice(0,3).map(n => miniNotif(n)).join('')}
            ${NOTIFICATIONS.filter(n=>!n.read).length === 0 ? '<div class="empty-state" style="padding:20px"><p style="color:var(--muted);font-size:13px">لا توجد تنبيهات جديدة</p></div>' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Employee quick view -->
    <div class="section">
      <div class="section-head">
        <span class="section-title">نظرة سريعة — الموظفون</span>
        <button class="btn btn-ghost btn-sm" onclick="navigate('employees')">${ICONS.eye} عرض الكل</button>
      </div>
      <div class="section-body">
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px">
          ${EMPLOYEES.map(e => empMiniCard(e)).join('')}
        </div>
      </div>
    </div>
  `;

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.chart-bar-fill').forEach(b => {
      const w = b.style.width; b.style.width = '0';
      setTimeout(() => b.style.width = w, 50);
    });
  }, 100);
}

function statCard(color, icon, num, label, delta, dir) {
  return `
    <div class="stat-card ${color}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-num">${num}</div>
      <div class="stat-label">${label}</div>
      ${delta ? `<div class="stat-delta ${dir}">${dir==='up'?'↑':'↓'} ${delta}</div>` : ''}
    </div>
  `;
}

function miniRequestRow(r) {
  const sm = statusMeta(r.status);
  const emp = getEmployee(r.assignedTo);
  return `
    <div onclick="navigate('detail','${r.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s" onmouseenter="this.style.background='var(--bg)'" onmouseleave="this.style.background=''">
      <div style="flex:1;overflow:hidden">
        <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.client}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${serviceLabel(r.service)} · ${r.id}</div>
      </div>
      <span class="badge ${sm.cls}">${sm.label}</span>
    </div>
  `;
}

function miniNotif(n) {
  const colors = { urgent: 'var(--urgent)', new: 'var(--new)', assign: 'var(--gold)', done: 'var(--done)', remind: 'var(--waiting)' };
  return `
    <div class="notif-item unread" onclick="navigate('notifications')">
      <div class="notif-icon" style="background:${colors[n.type]}15;color:${colors[n.type]}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${n.type==='urgent'?'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>':n.type==='done'?'<polyline points="20 6 9 17 4 12"/>':'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'}</svg>
      </div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `;
}

function empMiniCard(e) {
  return `
    <div onclick="navigate('employees')" style="text-align:center;padding:16px 8px;border-radius:12px;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:var(--card)" onmouseenter="this.style.borderColor='var(--gold)'" onmouseleave="this.style.borderColor='var(--border)'">
      <div style="width:44px;height:44px;border-radius:11px;background:${e.bg};color:${e.color};display:flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;font-size:15px;font-weight:900;margin:0 auto 10px;position:relative">
        ${e.initials}
        <span style="position:absolute;bottom:-3px;left:-3px;width:10px;height:10px;border-radius:50%;background:${e.active?'#22C55E':'var(--muted)'};border:2px solid #fff"></span>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name.split(' ').slice(0,2).join(' ')}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">${e.open} طلب مفتوح</div>
    </div>
  `;
}

// ─── REQUESTS ─── //
function renderRequests() {
  const el = document.getElementById('page-requests');
  const stats = getStats();

  const filtered = REQUESTS.filter(r => {
    const matchStatus  = filterStatus  === 'all' || r.status  === filterStatus;
    const matchService = filterService === 'all' || r.service === filterService;
    const matchSearch  = !searchQuery  || r.client.includes(searchQuery) || r.id.includes(searchQuery) || r.subject.includes(searchQuery);
    return matchStatus && matchService && matchSearch;
  });

  el.innerHTML = `
    <div class="section" style="margin-bottom:24px">
      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-search">
          ${ICONS.search}
          <input type="text" placeholder="ابحث بالاسم أو رقم الطلب..." value="${searchQuery}" oninput="searchQuery=this.value;renderRequests()" id="reqSearch">
        </div>

        <select class="filter-select" onchange="filterService=this.value;renderRequests()">
          <option value="all">جميع الخدمات</option>
          ${Object.entries(SERVICE_TYPES).map(([k,v])=>`<option value="${k}" ${filterService===k?'selected':''}>${v}</option>`).join('')}
        </select>

        <div class="filter-tabs">
          ${[['all','الكل',stats.total],['new','جديد',stats.new],['urgent','عاجل',stats.urgent],['review','مراجعة',stats.review],['assigned','مسند',stats.assigned],['done','مكتمل',stats.done],['closed','مغلق',stats.closed]].map(([k,l,c])=>`
            <button class="filter-tab ${filterStatus===k?'active':''}" onclick="filterStatus='${k}';renderRequests()">${l} <span style="font-size:10px;opacity:.7">${c}</span></button>
          `).join('')}
        </div>

        <div style="margin-right:auto;display:flex;gap:8px">
          <button class="btn btn-outline btn-sm">${ICONS.filter} فرز</button>
          <button class="btn btn-primary btn-sm" onclick="showAddRequestModal()">${ICONS.plus} طلب جديد</button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>العميل</th>
              <th>نوع الخدمة</th>
              <th>الموضوع</th>
              <th>الأولوية</th>
              <th>الحالة</th>
              <th>الموظف المسؤول</th>
              <th>آخر تحديث</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(r => requestRow(r)).join('') : `<tr><td colspan="9"><div class="empty-state">${ICONS.search.replace('viewBox','style="width:28px;height:28px;color:var(--muted)" viewBox')}<p style="color:var(--muted);margin-top:12px">لا توجد طلبات مطابقة</p></div></td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:12px;color:var(--muted)">إجمالي: <b style="color:var(--text)">${filtered.length}</b> طلب</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm">السابق</button>
          <button class="btn btn-primary btn-sm">التالي</button>
        </div>
      </div>
    </div>
  `;
}

function requestRow(r) {
  const sm  = statusMeta(r.status);
  const pm  = priorityMeta(r.priority);
  const emp = getEmployee(r.assignedTo);
  return `
    <tr onclick="navigate('detail','${r.id}')">
      <td><span class="td-id">${r.id}</span></td>
      <td>
        <div class="td-user">
          <div class="td-av" style="background:var(--bg2);color:var(--muted)">${r.client[0]}</div>
          <div>
            <div style="font-weight:700;color:var(--text);font-size:13px">${r.client}</div>
            <div style="font-size:11px;color:var(--muted)">${r.phone}</div>
          </div>
        </div>
      </td>
      <td><span class="svc-tag">${serviceLabel(r.service)}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.subject}</td>
      <td><span style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--text-2)"><span class="priority-dot ${pm.cls}"></span>${pm.label}</span></td>
      <td><span class="badge ${sm.cls}">${sm.label}</span></td>
      <td>
        ${emp ? `<div class="td-user"><div class="td-av" style="background:${emp.bg};color:${emp.color};font-size:11px;font-weight:900">${emp.initials}</div><span style="font-size:12px;font-weight:600">${emp.name.split(' ').slice(0,2).join(' ')}</span></div>` : '<span style="color:var(--muted);font-size:12px">— غير مسند</span>'}
      </td>
      <td style="font-size:12px;color:var(--muted)">${formatDate(r.updated)}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="navigate('detail','${r.id}')" title="عرض">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-sm" onclick="showAssignModal('${r.id}')" title="إسناد">${ICONS.assign}</button>
        </div>
      </td>
    </tr>
  `;
}

// ─── DETAIL ─── //
function renderDetail() {
  const r = REQUESTS.find(x => x.id === currentRequest);
  if (!r) { navigate('requests'); return; }

  const sm  = statusMeta(r.status);
  const pm  = priorityMeta(r.priority);
  const emp = getEmployee(r.assignedTo);
  const el  = document.getElementById('page-detail');

  el.innerHTML = `
    <!-- Back + header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <button class="btn btn-outline btn-sm" onclick="navigate('requests')">${ICONS.back} العودة</button>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="font-family:'Cairo',sans-serif;font-size:20px;font-weight:900">${r.subject}</h2>
          <span class="badge ${sm.cls}">${sm.label}</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);font-weight:600"><span class="priority-dot ${pm.cls}"></span>أولوية ${pm.label}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${r.id} · وصل ${formatDate(r.created)}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="showStatusModal('${r.id}')">${ICONS.edit} تغيير الحالة</button>
        <button class="btn btn-primary btn-sm" onclick="showAssignModal('${r.id}')">${ICONS.assign} إسناد</button>
      </div>
    </div>

    <div class="detail-grid">
      <!-- Main -->
      <div class="detail-main">

        <!-- Client + Request Info -->
        <div class="section">
          <div class="section-head"><span class="section-title">${ICONS.user} بيانات العميل والطلب</span></div>
          <div class="section-body">
            <div class="info-group">
              <div class="info-row"><span class="info-key">اسم العميل</span><span class="info-val" style="font-weight:800;font-size:16px">${r.client}</span></div>
              <div class="info-row"><span class="info-key">رقم الجوال</span><span class="info-val"><a href="tel:${r.phone}" style="color:var(--navy);font-weight:700">${r.phone}</a></span></div>
              <div class="info-row"><span class="info-key">نوع الخدمة</span><span class="info-val"><span class="svc-tag">${serviceLabel(r.service)}</span></span></div>
              <div class="info-row"><span class="info-key">تاريخ الطلب</span><span class="info-val">${new Date(r.created).toLocaleDateString('ar-SA', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
            </div>
            <div class="divider"></div>
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px">تفاصيل الطلب</div>
              <div style="font-size:14px;color:var(--text);line-height:1.9;padding:16px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">${r.details}</div>
            </div>
          </div>
        </div>

        <!-- Attachments -->
        ${r.attachments.length ? `
        <div class="section">
          <div class="section-head"><span class="section-title">${ICONS.attach} المرفقات (${r.attachments.length})</span></div>
          <div class="section-body">
            <div class="attachments">
              ${r.attachments.map(a => `
                <div class="attach-item">
                  <div class="attach-icon">${ICONS.attach}</div>
                  <span class="attach-name">${a.name}</span>
                  <span class="attach-size">${a.size}</span>
                  <span class="attach-dl">${ICONS.download}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Timeline -->
        <div class="section">
          <div class="section-head"><span class="section-title">${ICONS.clock} السجل الزمني</span></div>
          <div class="section-body">
            <div class="timeline">
              ${r.timeline.map((t,i) => `
                <div class="tl-item">
                  <div class="tl-line">
                    <div class="tl-dot ${t.color}"></div>
                    ${i < r.timeline.length-1 ? '<div class="tl-bar"></div>' : ''}
                  </div>
                  <div class="tl-content">
                    <div class="tl-action">${t.action}</div>
                    <div class="tl-meta">${t.meta}</div>
                    ${t.note ? `<div class="tl-note">${t.note}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="section">
          <div class="section-head"><span class="section-title">${ICONS.msg} الملاحظات الداخلية</span></div>
          <div class="section-body">
            ${r.comments.map(c => `
              <div style="display:flex;gap:12px;margin-bottom:16px">
                <div class="td-av" style="width:36px;height:36px;border-radius:9px;background:var(--navy);color:var(--gold);font-size:12px;font-weight:900;flex-shrink:0">${c.initials}</div>
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                    <span style="font-size:13px;font-weight:800">${c.author}</span>
                    <span style="font-size:11px;color:var(--muted)">${c.time}</span>
                  </div>
                  <div style="font-size:13px;color:var(--text-2);line-height:1.8;padding:10px 12px;background:var(--bg);border-radius:8px">${c.text}</div>
                </div>
              </div>
            `).join('') || '<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px">لا توجد ملاحظات بعد</div>'}
            <div class="comment-box" style="margin-top:16px">
              <textarea id="commentInput" placeholder="اكتب ملاحظة داخلية..." dir="rtl"></textarea>
              <div style="display:flex;justify-content:flex-end">
                <button class="btn btn-primary btn-sm" onclick="addComment('${r.id}')">${ICONS.msg} إضافة ملاحظة</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="detail-side">
        <!-- Assigned -->
        <div class="section">
          <div class="section-head"><span class="section-title">الموظف المسؤول</span></div>
          <div class="section-body" style="padding:16px">
            ${emp ? `
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                <div style="width:48px;height:48px;border-radius:12px;background:${emp.bg};color:${emp.color};display:flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;font-size:17px;font-weight:900">${emp.initials}</div>
                <div>
                  <div style="font-weight:800;font-size:15px">${emp.name}</div>
                  <div style="font-size:12px;color:var(--muted)">${emp.role}</div>
                </div>
              </div>
              <button class="btn btn-outline btn-sm" style="width:100%" onclick="showAssignModal('${r.id}')">${ICONS.assign} إعادة إسناد</button>
            ` : `
              <div style="text-align:center;padding:8px 0">
                <div style="color:var(--muted);font-size:13px;margin-bottom:12px">غير مسند بعد</div>
                <button class="btn btn-primary" style="width:100%" onclick="showAssignModal('${r.id}')">${ICONS.assign} إسناد لموظف</button>
              </div>
            `}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section">
          <div class="section-head"><span class="section-title">إجراءات سريعة</span></div>
          <div class="section-body" style="padding:14px">
            <div class="qa-grid">
              <div class="qa-item" onclick="showStatusModal('${r.id}')">
                ${ICONS.edit.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>تغيير الحالة</span>
              </div>
              <div class="qa-item" onclick="showMsg()">
                ${ICONS.msg.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>رسالة للعميل</span>
              </div>
              <div class="qa-item" onclick="toast('info','تم تعيين تذكير للمتابعة')">
                ${ICONS.clock.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>تذكير</span>
              </div>
              <div class="qa-item" onclick="toast('info','تم نسخ رقم الجوال')">
                ${ICONS.user.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>اتصال</span>
              </div>
              <div class="qa-item" onclick="toast('success','تم نسخ رابط الطلب')">
                ${ICONS.attach.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>مشاركة</span>
              </div>
              <div class="qa-item" onclick="closeRequest('${r.id}')">
                ${ICONS.close.replace('viewBox','style="display:block;margin:0 auto 6px" viewBox')}
                <span>إغلاق</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Change -->
        <div class="section">
          <div class="section-head"><span class="section-title">تغيير الحالة</span></div>
          <div class="section-body" style="padding:14px">
            <div style="display:flex;flex-direction:column;gap:6px">
              ${Object.entries(STATUS_META).map(([k,v]) => `
                <button class="btn ${r.status===k?'btn-primary':'btn-outline'} btn-sm" style="justify-content:flex-start;gap:8px;width:100%" onclick="changeStatus('${r.id}','${k}')">
                  <span class="badge ${v.cls}" style="transform:none">${v.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── EMPLOYEES ─── //
function renderEmployees() {
  const el = document.getElementById('page-employees');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <div class="filter-search" style="max-width:280px">
        ${ICONS.search}
        <input type="text" placeholder="ابحث عن موظف...">
      </div>
      <select class="filter-select">
        <option>جميع الأدوار</option>
        <option>محامٍ</option>
        <option>مستشار قانوني</option>
        <option>مساعد قانوني</option>
      </select>
      <select class="filter-select">
        <option>الكل</option>
        <option>نشط</option>
        <option>غير نشط</option>
      </select>
      <button class="btn btn-primary btn-sm" style="margin-right:auto">${ICONS.plus} إضافة موظف</button>
    </div>

    <!-- Stats strip -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
      ${statCard('navy', ICONS.employees, EMPLOYEES.length, 'إجمالي الموظفين', '', '')}
      ${statCard('green', ICONS.check, EMPLOYEES.filter(e=>e.active).length, 'نشطون', '', '')}
      ${statCard('teal', ICONS.requests, EMPLOYEES.reduce((s,e)=>s+e.open,0), 'طلبات مفتوحة', '', '')}
      ${statCard('gold', ICONS.star, EMPLOYEES.reduce((s,e)=>s+e.done,0), 'طلبات منجزة', '', '')}
    </div>

    <div class="emp-grid">
      ${EMPLOYEES.map(e => empCard(e)).join('')}
    </div>
  `;
}

function empCard(e) {
  const colors = ['#0F2233','#7C3AED','#0891B2','#C9A96E','#16A34A','#DC2626'];
  return `
    <div class="emp-card">
      <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:16px">
        <div class="emp-av" style="background:${e.bg};color:${e.color}">
          ${e.initials}
          <span class="emp-status-dot ${e.active?'active':'inactive'}"></span>
        </div>
        <div style="flex:1">
          <div class="emp-name">${e.name}</div>
          <div class="emp-role">${e.role}</div>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:${e.active?'#16A34A':'var(--muted)'}">
            <span style="width:6px;height:6px;border-radius:50%;background:${e.active?'#22C55E':'var(--muted)'}"></span>
            ${e.active ? 'نشط' : 'غير نشط'}
          </span>
        </div>
        <button class="btn btn-ghost btn-sm">${ICONS.edit}</button>
      </div>
      <div class="emp-stats">
        <div class="emp-stat">
          <div class="emp-stat-num" style="color:var(--urgent)">${e.open}</div>
          <div class="emp-stat-label">مفتوحة</div>
        </div>
        <div class="emp-stat">
          <div class="emp-stat-num" style="color:var(--done)">${e.done}</div>
          <div class="emp-stat-label">منجزة</div>
        </div>
        <div class="emp-stat">
          <div class="emp-stat-num" style="font-size:13px">${e.avgTime}</div>
          <div class="emp-stat-label">متوسط</div>
        </div>
      </div>
      <div class="divider" style="margin:16px 0"></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="toast('info','عرض طلبات ${e.name}')">${ICONS.eye} الطلبات</button>
        <button class="btn btn-ghost btn-sm" onclick="toast('info','إرسال رسالة لـ ${e.name}')">${ICONS.msg}</button>
      </div>
    </div>
  `;
}

// ─── NOTIFICATIONS ─── //
function renderNotifications() {
  const el = document.getElementById('page-notifications');
  const unread = NOTIFICATIONS.filter(n => !n.read);
  const read   = NOTIFICATIONS.filter(n => n.read);

  const colors = { urgent: 'var(--urgent)', new: 'var(--new)', assign: 'var(--gold)', done: 'var(--done)', remind: 'var(--waiting)' };
  const icons  = {
    urgent: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    new:    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    assign: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    done:   '<polyline points="20 6 9 17 4 12"/>',
    remind: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  };

  const notifHTML = (n) => `
    <div class="notif-item ${n.read?'':'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-icon" style="background:${colors[n.type]}15;color:${colors[n.type]}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${icons[n.type]||''}</svg>
      </div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:4px"></div>' : ''}
    </div>
  `;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div>
        <h2 style="font-family:'Cairo',sans-serif;font-size:20px;font-weight:900">التنبيهات والإشعارات</h2>
        <p style="font-size:13px;color:var(--muted);margin-top:3px">${unread.length} إشعار غير مقروء</p>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-right:auto" onclick="markAllRead()">تحديد الكل كمقروء</button>
    </div>

    ${unread.length ? `
    <div class="section" style="margin-bottom:20px">
      <div class="section-head"><span class="section-title">غير مقروءة (${unread.length})</span></div>
      <div class="notif-list">${unread.map(notifHTML).join('')}</div>
    </div>` : ''}

    <div class="section">
      <div class="section-head"><span class="section-title">السابقة</span></div>
      <div class="notif-list">${read.map(notifHTML).join('')}</div>
    </div>
  `;
}

function markRead(id) {
  const n = NOTIFICATIONS.find(x => x.id === id);
  if (n) { n.read = true; renderNotifications(); updateNotifBadge(); }
}

function markAllRead() {
  NOTIFICATIONS.forEach(n => n.read = true);
  renderNotifications(); updateNotifBadge();
  toast('success', 'تم تحديد جميع الإشعارات كمقروءة');
}

function updateNotifBadge() {
  const count = NOTIFICATIONS.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = count; badge.style.display = count ? '' : 'none'; }
}

// ─── SETTINGS ─── //
function renderSettings() {
  const el = document.getElementById('page-settings');
  el.innerHTML = `
    <div style="margin-bottom:24px">
      <h2 style="font-family:'Cairo',sans-serif;font-size:20px;font-weight:900">الإعدادات</h2>
      <p style="font-size:13px;color:var(--muted);margin-top:3px">إدارة إعدادات النظام والحساب</p>
    </div>
    <div class="settings-grid">
      <div class="settings-nav">
        ${[['profile','الملف الشخصي',ICONS.user],['notif','الإشعارات',ICONS.notif],['security','الأمان',ICONS.shield],['team','إدارة الفريق',ICONS.employees],['services','الخدمات',ICONS.requests]].map(([k,l,i],idx)=>`
          <button class="settings-nav-item ${idx===0?'active':''}" onclick="switchSettingsTab(this)">${i} ${l}</button>
        `).join('')}
      </div>
      <div class="settings-panel">
        <div class="section-head"><span class="section-title">الملف الشخصي</span></div>
        <div class="section-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:16px;background:var(--bg);border-radius:12px">
            <div style="width:60px;height:60px;border-radius:14px;background:var(--navy);color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;font-size:22px;font-weight:900">مأ</div>
            <div>
              <div style="font-family:'Cairo',sans-serif;font-size:17px;font-weight:900">مدير النظام</div>
              <div style="font-size:13px;color:var(--muted)">admin@araf.sa</div>
              <div style="font-size:11px;color:var(--gold);font-weight:700;margin-top:3px">مدير رئيسي</div>
            </div>
            <button class="btn btn-outline btn-sm" style="margin-right:auto">تعديل</button>
          </div>
          ${['الاسم الكامل:مدير أعراف','البريد الإلكتروني:admin@araf.sa','رقم الجوال:0500000000','الدور:مدير رئيسي'].map(f=>{const[l,v]=f.split(':');return`
          <div class="form-group">
            <label class="form-label">${l}</label>
            <input class="form-input" value="${v}" dir="rtl">
          </div>
          `}).join('')}
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button class="btn btn-primary" onclick="toast('success','تم حفظ التغييرات')">حفظ التغييرات</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function switchSettingsTab(btn) {
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  toast('info', `تم الانتقال إلى: ${btn.textContent.trim()}`);
}

// ─── MODALS ─── //
function showAssignModal(reqId) {
  const r = REQUESTS.find(x => x.id === reqId);
  showModal('إسناد الطلب', `
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px">اختر الموظف المسؤول عن الطلب <b style="color:var(--text)">${reqId}</b></p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${EMPLOYEES.filter(e=>e.active).map(e=>`
        <div class="assign-select ${r?.assignedTo===e.id?'border-gold':''}" style="${r?.assignedTo===e.id?'border-color:var(--gold);background:#fff':''}" onclick="assignRequest('${reqId}','${e.id}')">
          <div class="assign-av" style="background:${e.bg};color:${e.color}">${e.initials}</div>
          <div style="flex:1"><div class="assign-name">${e.name}</div><div class="assign-role">${e.role} · ${e.open} طلبات مفتوحة</div></div>
          ${r?.assignedTo===e.id?'<span style="color:var(--done);font-size:12px;font-weight:700">مسند حالياً</span>':''}
        </div>
      `).join('')}
    </div>
  `, null, false);
}

function showStatusModal(reqId) {
  const r = REQUESTS.find(x => x.id === reqId);
  showModal('تغيير حالة الطلب', `
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px">اختر الحالة الجديدة للطلب <b style="color:var(--text)">${reqId}</b></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${Object.entries(STATUS_META).map(([k,v])=>`
        <button class="btn ${r?.status===k?'btn-primary':'btn-outline'} btn-sm" style="justify-content:flex-start" onclick="changeStatus('${reqId}','${k}');closeModal()">
          <span class="badge ${v.cls}">${v.label}</span>
        </button>
      `).join('')}
    </div>
  `, null, false);
}

function showAddRequestModal() {
  showModal('إضافة طلب جديد', `
    <div class="form-group"><label class="form-label">اسم العميل</label><input class="form-input" placeholder="الاسم الكامل" dir="rtl"></div>
    <div class="form-group"><label class="form-label">رقم الجوال</label><input class="form-input" placeholder="05xxxxxxxx" dir="rtl"></div>
    <div class="form-group"><label class="form-label">نوع الخدمة</label>
      <select class="form-input form-select" dir="rtl">
        ${Object.entries(SERVICE_TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">موضوع الطلب</label><input class="form-input" placeholder="اكتب موضوع الطلب..." dir="rtl"></div>
    <div class="form-group"><label class="form-label">تفاصيل الطلب</label><textarea class="form-textarea form-input" placeholder="اكتب تفاصيل الطلب..." dir="rtl"></textarea></div>
    <div class="form-group"><label class="form-label">الأولوية</label>
      <select class="form-input form-select" dir="rtl">
        <option value="low">منخفضة</option>
        <option value="med">متوسطة</option>
        <option value="high">عالية</option>
      </select>
    </div>
  `, () => { toast('success', 'تم إضافة الطلب بنجاح'); closeModal(); });
}

function showMsg() {
  showModal('رسالة للعميل', `
    <div class="form-group"><label class="form-label">نوع الرسالة</label>
      <select class="form-input form-select" dir="rtl">
        <option>رسالة متابعة</option>
        <option>طلب مستندات إضافية</option>
        <option>تأكيد استلام الطلب</option>
        <option>إشعار بالاكتمال</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">نص الرسالة</label>
      <textarea class="form-input form-textarea" style="height:120px" dir="rtl" placeholder="اكتب نص الرسالة للعميل...">السلام عليكم ورحمة الله وبركاته،\nتم استلام طلبكم وجاري العمل عليه من قِبل فريقنا القانوني. سنتواصل معكم قريباً.\n\nفريق أعراف للمحاماة</textarea>
    </div>
  `, () => { toast('success', 'تم إرسال الرسالة للعميل'); closeModal(); });
}

function showModal(title, body, onConfirm, showFooter = true) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('show');
  const confirmBtn = document.getElementById('modalConfirm');
  if (onConfirm && showFooter !== false) {
    document.getElementById('modalFooter').style.display = 'flex';
    confirmBtn.onclick = onConfirm;
  } else if (showFooter === false) {
    document.getElementById('modalFooter').style.display = 'none';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// ─── ACTIONS ─── //
function assignRequest(reqId, empId) {
  const r = REQUESTS.find(x => x.id === reqId);
  const e = getEmployee(empId);
  if (r && e) {
    r.assignedTo = empId;
    r.status = 'assigned';
    r.updated = new Date().toISOString();
    r.timeline.push({ action: `أُسند إلى ${e.name}`, meta: 'الآن', color: 'gold', note: null });
    closeModal();
    toast('success', `تم إسناد الطلب إلى ${e.name}`);
    if (currentPage === 'detail') renderDetail();
    if (currentPage === 'requests') renderRequests();
  }
}

function changeStatus(reqId, status) {
  const r = REQUESTS.find(x => x.id === reqId);
  const sm = statusMeta(status);
  if (r) {
    r.status = status;
    r.updated = new Date().toISOString();
    r.timeline.push({ action: `تغيرت الحالة إلى: ${sm.label}`, meta: 'الآن', color: 'blue', note: null });
    toast('success', `تم تغيير الحالة إلى: ${sm.label}`);
    if (currentPage === 'detail') renderDetail();
    if (currentPage === 'requests') renderRequests();
  }
}

function closeRequest(reqId) {
  changeStatus(reqId, 'closed');
  navigate('requests');
}

function addComment(reqId) {
  const input = document.getElementById('commentInput');
  const text = input?.value?.trim();
  if (!text) { toast('error', 'الرجاء كتابة ملاحظة أولاً'); return; }
  const r = REQUESTS.find(x => x.id === reqId);
  if (r) {
    r.comments.push({ author: 'مدير النظام', initials: 'مأ', time: 'الآن', text });
    r.timeline.push({ action: 'تمت إضافة ملاحظة داخلية', meta: 'الآن', color: 'gray', note: text.substring(0,60) });
    r.updated = new Date().toISOString();
    toast('success', 'تمت إضافة الملاحظة');
    renderDetail();
  }
}

// ─── TOAST ─── //
function toast(type, msg) {
  const wrap = document.getElementById('toastWrap');
  const icons = { success: ICONS.check, error: ICONS.alert, info: ICONS.notif };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-20px)'; setTimeout(()=>t.remove(),300); }, 3500);
}

// ─── INIT ─── //
function initApp() {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Mobile menu
  document.getElementById('mobileMenu')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Modal close on overlay
  document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      window.location.href = 'login.html';
    }
  });

  updateNotifBadge();
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);

/* =============================================================
   منصة أعراف لإدارة الطلبات | منطق التطبيق الرئيسي
   ============================================================= */

// ===== الحالة العامة للتطبيق =====
const APP = {
  currentUser: null,
  currentPage: 'dashboard',
  filters: {
    search: '',
    service: 'all',
    status: 'all',
    employee: 'all',
    payment: 'all',
    priority: 'all'
  },
  selectedRequestId: null,
  pendingAssignEmpId: null,
  supportTickets: [],
  activityLog: [] 
};

// ===== التحقق من الجلسة =====
// TODO Supabase: استبدال بـ supabase.auth.getSession()
function checkSession() {
  const session = localStorage.getItem('araf_session');
  if (!session) {
    window.location.href = 'login.html';
    return false;
  }
  APP.currentUser = JSON.parse(session);
  return true;
}

function logout() {
  // TODO Supabase: supabase.auth.signOut()
  localStorage.removeItem('araf_session');
  window.location.href = 'login.html';
}

// ===== Toast Notifications =====
function showToast(message, type = 'default') {
  const wrap = document.getElementById('toastWrap');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${message}</span>
  `;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// =============================================================
// التنقل بين الصفحات
// =============================================================
function navigateTo(page) {
  APP.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');

  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  const titles = {
    dashboard: 'لوحة التحكم',
    requests: 'الطلبات',
    employees: 'الموظفون',
    activity: 'سجل النشاط',
    support: 'الدعم الفني'
  };
  document.getElementById('topbarTitle').textContent = titles[page] || '';

  // أغلق القائمة الجانبية في الموبايل
  document.getElementById('sidebar').classList.remove('open');

  // تحديث المحتوى حسب الصفحة
  if (page === 'dashboard') renderDashboard();
if (page === 'requests') renderRequestsPage();
if (page === 'employees') renderEmployeesPage();
if (page === 'activity') renderActivityPage();
if (page === 'support') renderSupportPage();
}

// =============================================================
// لوحة التحكم (Dashboard)
// =============================================================
function renderDashboard() {
  const reqs = MOCK_DATA.service_requests;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // الإحصائيات
  const total = reqs.length;
  const newReqs = reqs.filter(r => r.status === 'new' || r.status === 'pending').length;
  const inProgress = reqs.filter(r => ['assigned', 'review', 'contacted', 'waiting', 'progress'].includes(r.status)).length;
  const completed = reqs.filter(r => ['done', 'closed'].includes(r.status)).length;
  const late = reqs.filter(r => r.status === 'late').length;
  const todayCount = reqs.filter(r => r.created_at.slice(0, 10) === today).length;
  const weekCount = reqs.filter(r => r.created_at.slice(0, 10) >= weekAgo).length;

  // متوسط وقت الإغلاق (بالساعات)
  const closedReqs = reqs.filter(r => r.closed_at);
  let avgClose = 0;
  if (closedReqs.length > 0) {
    const totalHours = closedReqs.reduce((sum, r) => {
      return sum + (new Date(r.closed_at) - new Date(r.created_at)) / 3600000;
    }, 0);
    avgClose = (totalHours / closedReqs.length).toFixed(1);
  }

  // الخدمة الأكثر طلباً
  const serviceCounts = {};
  reqs.forEach(r => serviceCounts[r.service_type] = (serviceCounts[r.service_type] || 0) + 1);
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

  // الموظف الأكثر انشغالاً
  const empOpen = MOCK_DATA.employees
    .filter(e => e.role === 'employee' && e.status === 'active')
    .map(e => ({ ...e, openCount: HELPERS.openRequestsByEmployee(e.id) }))
    .sort((a, b) => b.openCount - a.openCount);
  const busiestEmp = empOpen[0];

  // نسبة الإغلاق
  const closeRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // تعبئة البطاقات
  const kpiHTML = `
    <div class="kpi-card c-nv">
      <div class="kpi-header">
        <span class="kpi-label">إجمالي الطلبات</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/><polyline points="9 11 9 5 15 5 15 11"/></svg></div>
      </div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-trend up">↑ ${weekCount} طلب هذا الأسبوع</div>
    </div>

    <div class="kpi-card c-blue">
      <div class="kpi-header">
        <span class="kpi-label">طلبات جديدة</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
      </div>
      <div class="kpi-value">${newReqs}</div>
      <div class="kpi-trend">بانتظار التوزيع</div>
    </div>

    <div class="kpi-card c-tl">
      <div class="kpi-header">
        <span class="kpi-label">قيد المعالجة</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      </div>
      <div class="kpi-value">${inProgress}</div>
      <div class="kpi-trend">طلب نشط حالياً</div>
    </div>

    <div class="kpi-card c-green">
      <div class="kpi-header">
        <span class="kpi-label">مكتملة / مغلقة</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      </div>
      <div class="kpi-value">${completed}</div>
      <div class="kpi-trend up">نسبة الإغلاق ${closeRate}%</div>
    </div>

    <div class="kpi-card c-red">
      <div class="kpi-header">
        <span class="kpi-label">طلبات متأخرة</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      </div>
      <div class="kpi-value">${late}</div>
      <div class="kpi-trend down">تحتاج تدخلاً عاجلاً</div>
    </div>

    <div class="kpi-card c-gd">
      <div class="kpi-header">
        <span class="kpi-label">طلبات اليوم</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      </div>
      <div class="kpi-value">${todayCount}</div>
      <div class="kpi-trend">طلب جديد اليوم</div>
    </div>

    <div class="kpi-card c-purple">
      <div class="kpi-header">
        <span class="kpi-label">متوسط وقت الإغلاق</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      </div>
      <div class="kpi-value">${avgClose}<small style="font-size:14px;font-weight:600;color:var(--t2);margin-right:4px;">ساعة</small></div>
      <div class="kpi-trend">لكل طلب مغلق</div>
    </div>

    <div class="kpi-card c-orange">
      <div class="kpi-header">
        <span class="kpi-label">الأكثر انشغالاً</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      </div>
      <div class="kpi-value" style="font-size:18px;line-height:1.4;">${busiestEmp ? busiestEmp.full_name : '—'}</div>
      <div class="kpi-trend">${busiestEmp ? busiestEmp.openCount + ' طلب مفتوح' : ''}</div>
    </div>
  `;
  document.getElementById('kpiGrid').innerHTML = kpiHTML;

  // الرسم البياني الخطي (آخر 7 أيام)
  drawTrendChart();

  // الخدمات الأكثر طلباً
  renderServicesChart(serviceCounts, total);

  // آخر الطلبات
  renderRecentRequests();

  // الطلبات العاجلة
  renderUrgentRequests();
}

// ===== الرسم البياني للاتجاه =====
function drawTrendChart() {
  const days = 7;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStr = d.toISOString().slice(0, 10);
    const count = MOCK_DATA.service_requests.filter(r => r.created_at.slice(0, 10) === dayStr).length;
    buckets.push({
      day: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
      count
    });
  }

  const max = Math.max(...buckets.map(b => b.count), 4);
  const w = 700, h = 220, pad = 30;
  const stepX = (w - pad * 2) / (buckets.length - 1);

  let pathD = '';
  let areaD = '';
  const points = buckets.map((b, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (b.count / max) * (h - pad * 2);
    return { x, y, ...b };
  });

  points.forEach((p, i) => {
    pathD += (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y} `;
  });

  areaD = pathD + ` L ${points[points.length-1].x} ${h-pad} L ${points[0].x} ${h-pad} Z`;

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%;" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3D7B8A" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#3D7B8A" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0,1,2,3].map(i => {
        const y = pad + i * ((h - pad*2) / 3);
        return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="rgba(27,58,75,0.06)" stroke-dasharray="3,4"/>`;
      }).join('')}
      <path d="${areaD}" fill="url(#areaGrad)"/>
      <path d="${pathD}" fill="none" stroke="#3D7B8A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="#3D7B8A" stroke-width="2.5"/>
        <text x="${p.x}" y="${h-8}" text-anchor="middle" font-size="11" fill="#8A9DAB" font-family="Tajawal">${p.day}</text>
        <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#1B3A4B" font-family="Cairo">${p.count}</text>
      `).join('')}
    </svg>
  `;
  document.getElementById('trendChart').innerHTML = svg;
}

// ===== مخطط الخدمات الأكثر طلباً =====
function renderServicesChart(counts, total) {
  const colors = {
    tl: ['#3D7B8A', '#4F9BAD'],
    nv: ['#1B3A4B', '#234D63'],
    gd: ['#C9A96E', '#D9BF8E'],
    purple: ['#8B5CF6', '#A78BFA'],
    green: ['#10B981', '#34D399'],
    orange: ['#F59E0B', '#FBBF24']
  };

  const html = MOCK_DATA.services
    .map(s => ({ ...s, count: counts[s.key] || 0 }))
    .sort((a, b) => b.count - a.count)
    .map(s => {
      const pct = total > 0 ? (s.count / total) * 100 : 0;
      const [c1, c2] = colors[s.color] || colors.tl;
      return `
        <div class="service-bar">
          <div class="service-bar-row">
            <span class="service-bar-label">${s.name}</span>
            <span class="service-bar-value">${s.count} طلب</span>
          </div>
          <div class="service-bar-track">
            <div class="service-bar-fill" style="width:${pct}%;--bar-color:${c1};--bar-color-l:${c2};"></div>
          </div>
        </div>
      `;
    }).join('');

  document.getElementById('servicesChart').innerHTML = html;
}

// ===== آخر الطلبات =====
function renderRecentRequests() {
  const recent = [...MOCK_DATA.service_requests]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const html = recent.map(r => {
    const emp = HELPERS.getEmployee(r.assigned_to);
    return `
      <div class="recent-item" onclick="openRequestDrawer('${r.id}')">
        <div class="recent-item-left">
          <div class="cell-customer-avatar">${HELPERS.initials(r.customer_name)}</div>
          <div>
            <div style="font-weight:600;font-size:13.5px;color:var(--t1);">${r.customer_name}</div>
            <div style="font-size:12px;color:var(--t2);margin-top:2px;">${HELPERS.getServiceName(r.service_type)}</div>
          </div>
        </div>
        <div class="recent-item-right">
          <span class="badge s-${r.status}">${HELPERS.statusLabel(r.status)}</span>
          <div style="font-size:11px;color:var(--tm);margin-top:4px;text-align:left;">${HELPERS.timeAgo(r.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('recentList').innerHTML = html;
}

// ===== الطلبات العاجلة =====
function renderUrgentRequests() {
  const urgent = MOCK_DATA.service_requests
    .filter(r => (r.priority === 'urgent' || r.priority === 'high' || r.status === 'late')
                  && !['done', 'closed', 'cancelled'].includes(r.status))
    .slice(0, 5);

  if (urgent.length === 0) {
    document.getElementById('urgentList').innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--tm);font-size:13px;">
        لا توجد طلبات عاجلة حالياً ✓
      </div>
    `;
    return;
  }

  const html = urgent.map(r => {
    return `
      <div class="recent-item" onclick="openRequestDrawer('${r.id}')">
        <div class="recent-item-left">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--red-l);color:#991B1B;display:grid;place-items:center;font-weight:700;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div style="font-weight:600;font-size:13.5px;color:var(--t1);">${r.id}</div>
            <div style="font-size:12px;color:var(--t2);margin-top:2px;">${r.customer_name}</div>
          </div>
        </div>
        <div class="recent-item-right">
          <span class="badge p-${r.priority}">${HELPERS.priorityLabel(r.priority)}</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('urgentList').innerHTML = html;
}

// =============================================================
// صفحة الطلبات
// =============================================================
function renderRequestsPage() {
  // املأ الفلاتر
  const empOptions = MOCK_DATA.employees
    .filter(e => e.status === 'active')
    .map(e => `<option value="${e.id}">${e.full_name}</option>`).join('');
  document.getElementById('filterEmployee').innerHTML = `<option value="all">كل الموظفين</option><option value="unassigned">غير مسند</option>${empOptions}`;

  const svcOptions = MOCK_DATA.services.map(s => `<option value="${s.key}">${s.name}</option>`).join('');
  document.getElementById('filterService').innerHTML = `<option value="all">كل الخدمات</option>${svcOptions}`;

  renderRequestsTable();
}

function renderRequestsTable() {
  const f = APP.filters;
  let reqs = [...MOCK_DATA.service_requests];

  // تطبيق الفلاتر
  if (f.search) {
    const q = f.search.toLowerCase();
    reqs = reqs.filter(r =>
      r.customer_name.toLowerCase().includes(q) ||
      r.customer_phone.includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }
  if (f.service !== 'all') reqs = reqs.filter(r => r.service_type === f.service);
  if (f.status !== 'all') reqs = reqs.filter(r => r.status === f.status);
  if (f.employee !== 'all') {
    if (f.employee === 'unassigned') reqs = reqs.filter(r => !r.assigned_to);
    else reqs = reqs.filter(r => r.assigned_to === f.employee);
  }
  if (f.payment !== 'all') reqs = reqs.filter(r => r.payment_status === f.payment);
  if (f.priority !== 'all') reqs = reqs.filter(r => r.priority === f.priority);

  // ترتيب
  reqs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  document.getElementById('requestsCount').textContent = `${reqs.length} طلب`;

  if (reqs.length === 0) {
    document.getElementById('requestsTableBody').innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3>لا توجد طلبات مطابقة</h3>
          <p>جرّب تعديل الفلاتر أو إعادة ضبطها</p>
        </div>
      </td></tr>
    `;
    return;
  }

  const html = reqs.map(r => {
    const emp = HELPERS.getEmployee(r.assigned_to);
    return `
      <tr onclick="openRequestDrawer('${r.id}')">
        <td><span class="cell-id">${r.id}</span></td>
        <td>
          <div class="cell-customer">
            <div class="cell-customer-avatar">${HELPERS.initials(r.customer_name)}</div>
            <div>
              <div class="cell-customer-name">${r.customer_name}</div>
              <div class="cell-customer-phone">${r.customer_phone}</div>
            </div>
          </div>
        </td>
        <td>${HELPERS.getServiceName(r.service_type)}</td>
        <td><span class="cell-price">${HELPERS.formatPrice(r.price)}<small>ر.س</small></span></td>
        <td><span class="badge pay-${r.payment_status}">${HELPERS.paymentLabel(r.payment_status)}</span></td>
        <td><span class="badge s-${r.status}">${HELPERS.statusLabel(r.status)}</span></td>
        <td><span class="badge p-${r.priority}">${HELPERS.priorityLabel(r.priority)}</span></td>
        <td>
          ${emp
            ? `<span class="cell-employee"><span class="cell-employee-avatar">${HELPERS.initials(emp.full_name)}</span>${emp.full_name.split(' ')[0]}</span>`
            : `<span class="cell-unassigned">— غير مسند —</span>`
          }
        </td>
        <td class="cell-date">
          ${HELPERS.formatDate(r.created_at)}
          <small>${HELPERS.formatTime(r.created_at)}</small>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('requestsTableBody').innerHTML = html;
}

// إعادة ضبط الفلاتر
function resetFilters() {
  APP.filters = { search: '', service: 'all', status: 'all', employee: 'all', payment: 'all', priority: 'all' };
  document.getElementById('searchInput').value = '';
  document.getElementById('filterService').value = 'all';
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterEmployee').value = 'all';
  document.getElementById('filterPayment').value = 'all';
  document.getElementById('filterPriority').value = 'all';
  renderRequestsTable();
  showToast('تمت إعادة ضبط الفلاتر', 'success');
}

// =============================================================
// Drawer تفاصيل الطلب
// =============================================================
function openRequestDrawer(reqId) {
  const r = MOCK_DATA.service_requests.find(x => x.id === reqId);
  if (!r) return;

  APP.selectedRequestId = reqId;
  const emp = HELPERS.getEmployee(r.assigned_to);
  const closedByEmp = HELPERS.getEmployee(r.closed_by);
  const assignedByEmp = HELPERS.getEmployee(r.assigned_by);

  // الهيدر
  document.getElementById('drawerId').textContent = r.id;
  document.getElementById('drawerTitle').textContent = `${HELPERS.getServiceName(r.service_type)} — ${r.customer_name}`;
  document.getElementById('drawerMeta').innerHTML = `
    <span class="badge s-${r.status}">${HELPERS.statusLabel(r.status)}</span>
    <span class="badge p-${r.priority}">${HELPERS.priorityLabel(r.priority)}</span>
    <span class="badge pay-${r.payment_status}">${HELPERS.paymentLabel(r.payment_status)}</span>
  `;

  // المرفقات
  const attachmentsHTML = r.attachments && r.attachments.length > 0
    ? r.attachments.map(f => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border:var(--border);border-radius:8px;font-size:13px;margin-bottom:6px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="var(--tl)" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style="flex:1;">${f}</span>
          <button class="btn btn-sm">تنزيل</button>
        </div>
      `).join('')
    : '<div style="color:var(--tm);font-size:13px;padding:8px;">لا توجد مرفقات</div>';

  // محتوى الـ body
  document.getElementById('drawerBody').innerHTML = `
    <div class="drawer-section">
      <h4>بيانات العميل والطلب</h4>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-item-label">اسم العميل</div>
          <div class="info-item-value">${r.customer_name}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">رقم الجوال</div>
          <div class="info-item-value" style="font-family:monospace;">${r.customer_phone}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">نوع الخدمة</div>
          <div class="info-item-value">${HELPERS.getServiceName(r.service_type)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">السعر</div>
          <div class="info-item-value">${HELPERS.formatPrice(r.price)} ر.س</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">مصدر الطلب</div>
          <div class="info-item-value">${HELPERS.sourceLabel(r.source)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">تاريخ الإنشاء</div>
          <div class="info-item-value">${HELPERS.formatDateTime(r.created_at)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">الموظف المسؤول</div>
          <div class="info-item-value">${emp ? emp.full_name : '— غير مسند —'}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">آخر تحديث</div>
          <div class="info-item-value">${HELPERS.timeAgo(r.updated_at)}</div>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <h4>تفاصيل الطلب</h4>
      <div class="details-box">${r.details}</div>
    </div>

    <div class="drawer-section">
      <h4>المرفقات (${r.attachments?.length || 0})</h4>
      ${attachmentsHTML}
    </div>

    ${r.closed_at ? `
    <div class="drawer-section">
      <h4>معلومات الإغلاق</h4>
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02));border:1px solid rgba(16,185,129,0.2);padding:16px;border-radius:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;color:var(--green);font-weight:700;font-size:13px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          تم إغلاق الطلب
        </div>
        <div style="font-size:13px;line-height:1.9;">
          <strong>المُغلِق:</strong> ${closedByEmp ? closedByEmp.full_name : '—'}<br>
          <strong>الوقت:</strong> ${HELPERS.formatDateTime(r.closed_at)}<br>
          ${r.close_note ? `<strong>الملاحظة:</strong> ${r.close_note}` : ''}
        </div>
      </div>
    </div>
    ` : ''}

    <div class="drawer-section">
      <h4>السجل الزمني</h4>
      <div class="timeline">
        ${renderRequestTimeline(r)}
      </div>
    </div>

    <div class="drawer-section">
      <h4>الملاحظات الداخلية</h4>
      <div class="notes-list">
        ${renderRequestNotes(r.id)}
      </div>
      <div class="note-input-wrap">
        <input id="newNoteInput" type="text" placeholder="أضف ملاحظة داخلية..." />
        <button class="btn btn-primary" onclick="addNote()">إضافة</button>
      </div>
    </div>
  `;

  // أزرار الإجراءات
  const isClosed = ['closed', 'cancelled'].includes(r.status);
  document.getElementById('drawerActions').innerHTML = `
    <button class="btn" onclick="openAssignModal('${r.id}')" ${isClosed ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
      ${emp ? 'إعادة الإسناد' : 'إسناد لموظف'}
    </button>
    <button class="btn" onclick="openStatusModal('${r.id}')" ${isClosed ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
      تغيير الحالة
    </button>
    <button class="btn" onclick="quickAction('${r.id}','contacted')" ${isClosed ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      تم التواصل
    </button>
    <button class="btn" onclick="quickAction('${r.id}','waiting')" ${isClosed ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      بانتظار مستندات
    </button>
    <button class="btn btn-primary" onclick="openCloseModal('${r.id}')" ${isClosed ? 'disabled' : ''} style="flex:2;">
      <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      إغلاق الطلب
    </button>
  `;

  // افتح الـ drawer
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  APP.selectedRequestId = null;
}

// السجل الزمني للطلب
function renderRequestTimeline(r) {
  const events = [];

  events.push({
    type: 'created',
    text: `تم استلام الطلب من <strong>${r.customer_name}</strong>`,
    time: r.created_at
  });

  if (r.assigned_at) {
    const emp = HELPERS.getEmployee(r.assigned_to);
    const by = HELPERS.getEmployee(r.assigned_by);
    events.push({
      type: 'assigned',
      text: `أسند ${by ? by.full_name : ''} الطلب إلى <strong>${emp ? emp.full_name : ''}</strong>`,
      time: r.assigned_at
    });
  }

  if (r.contacted_at) {
    events.push({
      type: 'contact',
      text: 'تم التواصل مع العميل',
      time: r.contacted_at
    });
  }

  // ملاحظات
  const notes = MOCK_DATA.request_notes.filter(n => n.request_id === r.id);
  notes.forEach(n => {
    const emp = HELPERS.getEmployee(n.employee_id);
    events.push({
      type: 'note',
      text: `أضاف <strong>${emp ? emp.full_name : ''}</strong> ملاحظة`,
      time: n.created_at
    });
  });

  if (r.closed_at) {
    const emp = HELPERS.getEmployee(r.closed_by);
    events.push({
      type: 'closed',
      text: `أغلق <strong>${emp ? emp.full_name : ''}</strong> الطلب`,
      time: r.closed_at
    });
  }

  events.sort((a, b) => new Date(b.time) - new Date(a.time));

  const icons = {
    created:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    assigned: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    status:   '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6"/></svg>',
    note:     '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    contact:  '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    closed:   '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  };

  return events.map(e => `
    <div class="timeline-item">
      <div class="timeline-icon t-${e.type}">${icons[e.type] || icons.status}</div>
      <div class="timeline-content">
        <div class="timeline-text">${e.text}</div>
        <div class="timeline-time">${HELPERS.formatDateTime(e.time)} · ${HELPERS.timeAgo(e.time)}</div>
      </div>
    </div>
  `).join('');
}

function renderRequestNotes(reqId) {
  const notes = MOCK_DATA.request_notes.filter(n => n.request_id === reqId);
  if (notes.length === 0) {
    return '<div style="color:var(--tm);font-size:13px;padding:8px;text-align:center;">لا توجد ملاحظات بعد</div>';
  }
  return notes.map(n => {
    const emp = HELPERS.getEmployee(n.employee_id);
    return `
      <div class="note-item">
        <div class="note-header">
          <span class="note-author">${emp ? emp.full_name : '—'}</span>
          <span class="note-time">${HELPERS.timeAgo(n.created_at)}</span>
        </div>
        <div class="note-body">${n.note}</div>
      </div>
    `;
  }).join('');
}

// إضافة ملاحظة
function addNote() {
  const input = document.getElementById('newNoteInput');
  const text = input.value.trim();
  if (!text) {
    showToast('الرجاء كتابة ملاحظة', 'warn');
    return;
  }

  // TODO Supabase: insert into request_notes
  MOCK_DATA.request_notes.push({
    id: 'N-' + Date.now(),
    request_id: APP.selectedRequestId,
    employee_id: APP.currentUser.id,
    note: text,
    created_at: new Date().toISOString()
  });

  MOCK_DATA.activity_log.unshift({
    id: 'A-' + Date.now(),
    request_id: APP.selectedRequestId,
    actor_id: APP.currentUser.id,
    action_type: 'note_added',
    description: 'أضاف ملاحظة على الطلب',
    created_at: new Date().toISOString()
  });

  showToast('تمت إضافة الملاحظة', 'success');
  openRequestDrawer(APP.selectedRequestId);
}

// إجراء سريع (تواصل / انتظار مستندات)
function quickAction(reqId, action) {
  const r = MOCK_DATA.service_requests.find(x => x.id === reqId);
  if (!r) return;

  if (action === 'contacted') {
    r.contacted_at = new Date().toISOString();
    r.status = 'contacted';
    MOCK_DATA.activity_log.unshift({
      id: 'A-' + Date.now(),
      request_id: reqId,
      actor_id: APP.currentUser.id,
      action_type: 'contacted',
      description: 'سجّل التواصل مع العميل',
      created_at: new Date().toISOString()
    });
    showToast('تم تسجيل التواصل مع العميل', 'success');
  }

  if (action === 'waiting') {
    r.status = 'waiting';
    MOCK_DATA.activity_log.unshift({
      id: 'A-' + Date.now(),
      request_id: reqId,
      actor_id: APP.currentUser.id,
      action_type: 'status_changed',
      description: 'غيّر الحالة إلى "بانتظار مستندات"',
      created_at: new Date().toISOString()
    });
    showToast('تم تحديث الحالة إلى "بانتظار مستندات"', 'success');
  }

  r.updated_at = new Date().toISOString();
  openRequestDrawer(reqId);
  if (APP.currentPage === 'requests') renderRequestsTable();
  if (APP.currentPage === 'dashboard') renderDashboard();
}

// =============================================================
// Modals
// =============================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ===== Modal الإسناد =====
function openAssignModal(reqId) {
  APP.selectedRequestId = reqId;
  APP.pendingAssignEmpId = null;

  const employees = MOCK_DATA.employees
    .filter(e => e.role === 'employee' && e.status === 'active')
    .map(e => ({ ...e, openCount: HELPERS.openRequestsByEmployee(e.id) }))
    .sort((a, b) => a.openCount - b.openCount);

  const minLoad = employees[0]?.openCount;

  const html = employees.map(e => {
    const load = e.openCount;
    let loadClass = 'low';
    if (load >= 4) loadClass = 'high';
    else if (load >= 2) loadClass = 'medium';

    const isLightest = load === minLoad;

    return `
      <div class="assign-employee" data-emp-id="${e.id}" onclick="selectAssignEmployee('${e.id}')">
        <div class="cell-customer-avatar" style="width:38px;height:38px;font-size:13px;background:linear-gradient(135deg,var(--tl),var(--nvl));">${HELPERS.initials(e.full_name)}</div>
        <div class="assign-info">
          <div class="assign-name">${e.full_name} ${isLightest ? '<span style="color:var(--green);font-size:11px;margin-right:6px;">★ الأقل ضغطاً</span>' : ''}</div>
          <div class="assign-load">${load} طلب مفتوح حالياً</div>
        </div>
        <span class="assign-badge ${loadClass}">${load}</span>
      </div>
    `;
  }).join('');

  document.getElementById('assignList').innerHTML = html;
  openModal('assignModal');
}

function selectAssignEmployee(empId) {
  APP.pendingAssignEmpId = empId;
  document.querySelectorAll('.assign-employee').forEach(el => {
    el.classList.toggle('selected', el.dataset.empId === empId);
  });
}

function autoAssign() {
  const employees = MOCK_DATA.employees
    .filter(e => e.role === 'employee' && e.status === 'active')
    .map(e => ({ ...e, openCount: HELPERS.openRequestsByEmployee(e.id) }))
    .sort((a, b) => a.openCount - b.openCount);

  if (employees.length === 0) {
    showToast('لا يوجد موظفون نشطون', 'error');
    return;
  }

  APP.pendingAssignEmpId = employees[0].id;
  selectAssignEmployee(employees[0].id);
  showToast(`اقتراح: ${employees[0].full_name} (الأقل ضغطاً)`, 'success');
}

function confirmAssign() {
  if (!APP.pendingAssignEmpId) {
    showToast('الرجاء اختيار موظف', 'warn');
    return;
  }

  const r = MOCK_DATA.service_requests.find(x => x.id === APP.selectedRequestId);
  const emp = HELPERS.getEmployee(APP.pendingAssignEmpId);
  // TODO Supabase: update service_requests SET assigned_to=...

  r.assigned_to = APP.pendingAssignEmpId;
  r.assigned_by = APP.currentUser.id;
  r.assigned_at = new Date().toISOString();
  r.status = 'assigned';
  r.updated_at = new Date().toISOString();

  MOCK_DATA.activity_log.unshift({
    id: 'A-' + Date.now(),
    request_id: r.id,
    actor_id: APP.currentUser.id,
    action_type: 'assigned',
    description: `أسند الطلب إلى ${emp.full_name}`,
    created_at: new Date().toISOString()
  });

  showToast(`تم إسناد الطلب إلى ${emp.full_name}`, 'success');
  closeModal('assignModal');
  openRequestDrawer(r.id);
  if (APP.currentPage === 'requests') renderRequestsTable();
}

// ===== Modal تغيير الحالة =====
function openStatusModal(reqId) {
  APP.selectedRequestId = reqId;
  const r = MOCK_DATA.service_requests.find(x => x.id === reqId);
  document.getElementById('newStatusSelect').value = r.status;
  openModal('statusModal');
}

function confirmStatusChange() {
  const newStatus = document.getElementById('newStatusSelect').value;
  const r = MOCK_DATA.service_requests.find(x => x.id === APP.selectedRequestId);
  const oldStatus = r.status;

  // TODO Supabase: update service_requests
  r.status = newStatus;
  r.updated_at = new Date().toISOString();

  MOCK_DATA.activity_log.unshift({
    id: 'A-' + Date.now(),
    request_id: r.id,
    actor_id: APP.currentUser.id,
    action_type: 'status_changed',
    description: `غيّر الحالة من "${HELPERS.statusLabel(oldStatus)}" إلى "${HELPERS.statusLabel(newStatus)}"`,
    created_at: new Date().toISOString()
  });

  showToast(`تم تغيير الحالة إلى "${HELPERS.statusLabel(newStatus)}"`, 'success');
  closeModal('statusModal');
  openRequestDrawer(r.id);
  if (APP.currentPage === 'requests') renderRequestsTable();
}

// ===== Modal إغلاق الطلب =====
function openCloseModal(reqId) {
  APP.selectedRequestId = reqId;
  document.getElementById('closeNoteInput').value = '';
  document.getElementById('closeResultSelect').value = 'success';
  openModal('closeModal');
}

function confirmClose() {
  const note = document.getElementById('closeNoteInput').value.trim();
  const result = document.getElementById('closeResultSelect').value;
  if (!note) {
    showToast('الرجاء كتابة ملاحظة الإغلاق', 'warn');
    return;
  }

  const r = MOCK_DATA.service_requests.find(x => x.id === APP.selectedRequestId);
  // TODO Supabase: update service_requests
  r.status = result === 'cancelled' ? 'cancelled' : 'closed';
  r.closed_by = APP.currentUser.id;
  r.closed_at = new Date().toISOString();
  r.close_note = note;
  r.updated_at = new Date().toISOString();

  MOCK_DATA.activity_log.unshift({
    id: 'A-' + Date.now(),
    request_id: r.id,
    actor_id: APP.currentUser.id,
    action_type: 'closed',
    description: 'أغلق الطلب',
    created_at: new Date().toISOString()
  });

  showToast('تم إغلاق الطلب بنجاح', 'success');
  closeModal('closeModal');
  openRequestDrawer(r.id);
  if (APP.currentPage === 'requests') renderRequestsTable();
  if (APP.currentPage === 'dashboard') renderDashboard();
}

// =============================================================
// صفحة الموظفين
// =============================================================
function renderEmployeesPage() {
  const html = MOCK_DATA.employees.map(e => {
    const open = HELPERS.openRequestsByEmployee(e.id);
    const closed = HELPERS.closedRequestsByEmployee(e.id);
    const isAdmin = e.role === 'admin';

    return `
      <div class="employee-card">
        <div class="emp-header">
          <div class="emp-avatar">${HELPERS.initials(e.full_name)}</div>
          <div class="emp-info">
            <div class="emp-name">${e.full_name}</div>
            <div class="emp-role">${isAdmin ? 'مدير النظام' : 'موظف'} · ${e.email}</div>
          </div>
          <div class="emp-status ${e.status === 'inactive' ? 'inactive' : ''}" title="${e.status === 'active' ? 'فعّال' : 'غير فعّال'}"></div>
        </div>

        <div class="emp-meta">
          <div class="emp-meta-item">
            <div class="emp-meta-label">الجوال</div>
            <div class="emp-meta-value" style="font-family:monospace;font-size:13px;">${e.phone}</div>
          </div>
          <div class="emp-meta-item">
            <div class="emp-meta-label">آخر دخول</div>
            <div class="emp-meta-value" style="font-size:13px;">${HELPERS.timeAgo(e.last_login_at)}</div>
          </div>
        </div>

        <div class="emp-stats">
          <div class="emp-stat c-orange">
            <div class="emp-stat-label">مفتوحة</div>
            <div class="emp-stat-value">${open}</div>
          </div>
          <div class="emp-stat c-green">
            <div class="emp-stat-label">مغلقة</div>
            <div class="emp-stat-value">${closed}</div>
          </div>
          <div class="emp-stat">
            <div class="emp-stat-label">الإجمالي</div>
            <div class="emp-stat-value">${open + closed}</div>
          </div>
        </div>

        <div class="emp-actions">
  <button class="btn btn-sm ${e.status === 'active' ? 'btn-danger' : ''}" onclick="toggleEmployeeStatus('${e.id}')">
    ${e.status === 'active' ? 'تعطيل' : 'تفعيل'}
  </button>
</div>
      </div>
    `;
  }).join('');

  document.getElementById('employeesGrid').innerHTML = html;
}

function toggleEmployeeStatus(empId) {
  const emp = MOCK_DATA.employees.find(e => e.id === empId);
  emp.status = emp.status === 'active' ? 'inactive' : 'active';
  // TODO Supabase: update employees
  showToast(`تم ${emp.status === 'active' ? 'تفعيل' : 'تعطيل'} الموظف`, 'success');
  renderEmployeesPage();
}

// نموذج إضافة موظف
function openAddEmployeeModal() {
  document.getElementById('newEmpName').value = '';
  document.getElementById('newEmpEmail').value = '';
  document.getElementById('newEmpPhone').value = '';
  document.getElementById('newEmpRole').value = 'employee';
  openModal('addEmpModal');
}

function confirmAddEmployee() {
  const name = document.getElementById('newEmpName').value.trim();
  const email = document.getElementById('newEmpEmail').value.trim();
  const phone = document.getElementById('newEmpPhone').value.trim();
  const role = document.getElementById('newEmpRole').value;

  if (!name || !email) {
    showToast('الاسم والبريد مطلوبان', 'warn');
    return;
  }

  // TODO Supabase: insert into employees + signup user
  MOCK_DATA.employees.push({
    id: 'EMP-' + String(MOCK_DATA.employees.length + 1).padStart(3, '0'),
    full_name: name,
    email: email,
    phone: phone,
    password: 'temp123',
    role: role,
    status: 'active',
    created_at: new Date().toISOString(),
    last_login_at: null
  });

  showToast('تمت إضافة الموظف بنجاح', 'success');
  closeModal('addEmpModal');
  renderEmployeesPage();
}

// =============================================================
// صفحة سجل النشاط
// =============================================================
function renderActivityPage() {
  const sorted = [...MOCK_DATA.activity_log].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const icons = {
    created:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    assigned: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    status_changed: '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6"/></svg>',
    note_added: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    contacted: '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2"/></svg>',
    closed: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  };

  const typeMap = {
    created: 'created', assigned: 'assigned', status_changed: 'status',
    note_added: 'note', contacted: 'contact', closed: 'closed'
  };

  const html = sorted.map(a => {
    const emp = HELPERS.getEmployee(a.actor_id);
    return `
      <div class="timeline-item">
        <div class="timeline-icon t-${typeMap[a.action_type] || 'status'}">${icons[a.action_type] || icons.status_changed}</div>
        <div class="timeline-content">
          <div class="timeline-text">
            <strong>${emp ? emp.full_name : 'النظام'}</strong> ${a.description}
            <a onclick="openRequestDrawer('${a.request_id}')" style="color:var(--tl);cursor:pointer;font-weight:600;margin-right:4px;">${a.request_id}</a>
          </div>
          <div class="timeline-time">${HELPERS.formatDateTime(a.created_at)} · ${HELPERS.timeAgo(a.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('activityFeed').innerHTML = html;
}

// =============================================================
// لوحة الإشعارات
// =============================================================
function toggleNotifPanel() {
  document.getElementById('notifPanel').classList.toggle('open');
}

function renderNotifications() {
  var items = [];

  MOCK_DATA.service_requests
    .filter(function(r){ return r.status === 'new' || r.status === 'pending'; })
    .slice(0, 5)
    .forEach(function(r){
      items.push({
        type:'new',
        text:'طلب جديد: ' + (r.service_name || HELPERS.getServiceName(r.service_type)) + ' — ' + r.customer_name,
        time: HELPERS.timeAgo(r.created_at)
      });
    });

  MOCK_DATA.service_requests
    .filter(function(r){ return r.status === 'late' || r.priority === 'urgent' || r.priority === 'high'; })
    .slice(0, 5)
    .forEach(function(r){
      items.push({
        type:'late',
        text:'طلب يحتاج اهتمام: ' + r.customer_name,
        time: HELPERS.timeAgo(r.updated_at || r.created_at)
      });
    });

  APP.supportTickets
    .filter(function(t){ return t.status === 'new'; })
    .slice(0, 5)
    .forEach(function(t){
      items.push({
        type:'supp',
        text:'رسالة دعم فني جديدة من ' + t.name,
        time: HELPERS.timeAgo(t.created_at)
      });
    });

  var countEl = document.querySelector('.notif-header .count');
  if(countEl){
    countEl.textContent = items.length + ' جديدة';
  }

  if(items.length === 0){
    document.getElementById('notifList').innerHTML =
      '<div style="padding:18px;text-align:center;color:var(--tm);font-size:13px;">لا توجد إشعارات جديدة</div>';
    return;
  }

  const icons = {
    new:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    late: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    supp: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>'
  };

  const html = items.map(function(n){
    return `
      <div class="notif-item">
        <div class="notif-icon n-${n.type}">${icons[n.type] || icons.new}</div>
        <div>
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('notifList').innerHTML = html;
}
async function loadSupabaseEmployees(){
  if(!window.sb){
    console.warn('Supabase client غير موجود، سيتم استخدام الموظفين التجريبيين');
    return;
  }

  try{
    const { data, error } = await window.sb
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending:false });

    if(error){
      console.error('Supabase employees load error:', error);
      showToast('تعذر تحميل الموظفين الحقيقيين', 'warn');
      return;
    }

    MOCK_DATA.employees = (data || []).map(function(e){
      return {
        id: e.id,
        full_name: e.full_name || '',
        email: e.email || '',
        phone: e.phone || '',
        password: '',
        role: e.role || 'employee',
        status: e.status || 'active',
        created_at: e.created_at,
        last_login_at: e.last_login_at
      };
    });

  }catch(e){
    console.error(e);
    showToast('حدث خطأ أثناء تحميل الموظفين', 'error');
  }
}
function normalizeServiceType(value){
  var v = String(value || '').trim();

  var map = {
    'استشارة قانونية': 'consultation',
    'طلب دراسة قضية والتوكيل فيها': 'case_study',
    'دراسة قضية والتوكيل': 'case_study',
    'مراجعة عقد': 'contract_review',
    'صياغة عقد': 'contract_draft',
    'خدمات ناجز': 'najiz',
    'خدمات منصة ناجز': 'najiz',
    'إعداد مذكرة قانونية': 'memo',
    'المساعد القانوني AI': 'ai_assistant'
  };

  return map[v] || v;
}
async function loadSupabaseRequests(){
  if(!window.sb){
    console.warn('Supabase client غير موجود، سيتم استخدام البيانات التجريبية');
    return;
  }

  try{
    const { data, error } = await window.sb
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending:false });

    if(error){
      console.error('Supabase load error:', error);
      showToast('تعذر تحميل الطلبات الحقيقية، تم عرض البيانات التجريبية', 'warn');
      return;
    }

    MOCK_DATA.service_requests = (data || []).map(function(r){
      return {
        id: r.id,
        customer_name: r.customer_name || '',
        customer_phone: r.customer_phone || '',
        service_type: normalizeServiceType(r.service_type || r.service_name || ''),
        service_name: r.service_name || r.service_type || '',
        price: Number(r.price || 0),
        payment_status: r.payment_status || 'manual_pending',
        source: r.source || 'direct_services',
        details: r.details || '',
        attachments: Array.isArray(r.attachments) ? r.attachments : [],
        status: r.status || 'new',
        priority: r.priority || 'normal',
        assigned_to: r.assigned_to,
        assigned_by: r.assigned_by,
        assigned_at: r.assigned_at,
        contacted_at: r.contacted_at,
        closed_by: r.closed_by,
        closed_at: r.closed_at,
        close_note: r.close_note,
        created_at: r.created_at,
        updated_at: r.updated_at || r.created_at
      };
    });

  }catch(e){
    console.error(e);
    showToast('حدث خطأ أثناء الاتصال بقاعدة البيانات', 'error');
  }
}
function updateSidebarCounts(){
  var openCount = MOCK_DATA.service_requests.filter(function(r){
    return !['done','closed','cancelled'].includes(r.status);
  }).length;

  var badge = document.querySelector('.nav-item[data-page="requests"] .nav-badge');
  if(badge){
    badge.textContent = openCount;
  }

  var notifDot = document.querySelector('#notifBtn .dot');
  if(notifDot){
    notifDot.style.display = openCount > 0 ? 'block' : 'none';
  }
}
async function loadSupabaseActivity(){
  if(!window.sb) return;

  try{
    const { data, error } = await window.sb
      .from('request_activity_log')
      .select('*')
      .order('created_at', { ascending:false });

    if(error){
      console.error('Activity load error:', error);
      return;
    }

    APP.activityLog = data || [];
    MOCK_DATA.activity_log = APP.activityLog;

  }catch(e){
    console.error(e);
  }
}
async function loadSupabaseSupportTickets(){
  if(!window.sb) return;

  try{
    const { data, error } = await window.sb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending:false });

    if(error){
      console.error('Support tickets load error:', error);
      return;
    }

    APP.supportTickets = data || [];

  }catch(e){
    console.error(e);
  }
}
function renderSupportPage(){
  var page = document.getElementById('page-support');
  if(!page) return;

  var tickets = APP.supportTickets || [];

  var body = '';

  if(tickets.length === 0){
    body = `
      <div class="empty-state" style="background:#fff;border-radius:16px;border:var(--border);">
        <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        <h3>لا توجد رسائل دعم حالياً</h3>
        <p>ستظهر هنا رسائل الدعم الفني القادمة من منصة أعراف.</p>
      </div>
    `;
  }else{
    body = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>المشكلة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${tickets.map(function(t){
              return `
                <tr>
                  <td>${t.name || '—'}</td>
                  <td>${t.phone || '—'}</td>
                  <td>${t.problem || '—'}</td>
                  <td><span class="badge s-${t.status || 'new'}">${t.status === 'closed' ? 'مغلقة' : 'جديدة'}</span></td>
                  <td class="cell-date">${HELPERS.formatDate(t.created_at)}<small>${HELPERS.formatTime(t.created_at)}</small></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">الدعم الفني</h1>
        <p class="page-subtitle">رسائل وشكاوى المستخدمين الواردة من منصة أعراف</p>
      </div>
    </div>
    ${body}
  `;
}
// =============================================================
// التهيئة
// =============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkSession()) return;

  // ملء معلومات المستخدم
  document.getElementById('sidebarUserName').textContent = APP.currentUser.name;
  document.getElementById('sidebarUserRole').textContent = APP.currentUser.role === 'admin' ? 'مدير النظام' : 'موظف';
  document.getElementById('sidebarUserAvatar').textContent = HELPERS.initials(APP.currentUser.name);
  document.getElementById('topbarUserName').textContent = APP.currentUser.name.split(' ')[0];
  document.getElementById('topbarUserAvatar').textContent = HELPERS.initials(APP.currentUser.name);

  // إخفاء الأقسام التي تخص المدير فقط
  if (APP.currentUser.role !== 'admin') {
    document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
  }

  // عناصر التنقل
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // الفلاتر
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', e => {
    APP.filters.search = e.target.value;
    renderRequestsTable();
  });
  document.getElementById('filterService')?.addEventListener('change', e => { APP.filters.service = e.target.value; renderRequestsTable(); });
  document.getElementById('filterStatus')?.addEventListener('change', e => { APP.filters.status = e.target.value; renderRequestsTable(); });
  document.getElementById('filterEmployee')?.addEventListener('change', e => { APP.filters.employee = e.target.value; renderRequestsTable(); });
  document.getElementById('filterPayment')?.addEventListener('change', e => { APP.filters.payment = e.target.value; renderRequestsTable(); });
  document.getElementById('filterPriority')?.addEventListener('change', e => { APP.filters.priority = e.target.value; renderRequestsTable(); });

  // إشعارات
  renderNotifications();

  // إغلاق لوحة الإشعارات عند الضغط خارجها
  document.addEventListener('click', e => {
    const panel = document.getElementById('notifPanel');
    const btn = document.getElementById('notifBtn');
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // البحث العلوي يفلتر الطلبات
  document.getElementById('topbarSearch')?.addEventListener('input', e => {
    APP.filters.search = e.target.value;
    if (APP.currentPage !== 'requests') {
      navigateTo('requests');
      document.getElementById('searchInput').value = e.target.value;
    }
    renderRequestsTable();
  });
await loadSupabaseEmployees();
await loadSupabaseRequests();
await loadSupabaseActivity();
await loadSupabaseSupportTickets();

updateSidebarCounts();
renderNotifications();

navigateTo('dashboard');
var loader = document.getElementById('appLoader');
if(loader){
  loader.classList.add('hide');
}   
});

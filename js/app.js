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
  caseFilters: {
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
selectedSupportTicketId: null,
activityLog: [],
deleteRequests: [] 
};

// ===== تصنيف الطلبات وعرضها =====
function isCaseRequest(request) {
  if (!request) return false;

  const rawType = String(
    request.raw_service_type ||
    request.service_category ||
    request.service_type ||
    ''
  ).trim();

  const source = String(request.source || '').trim();

  return (
    rawType === 'التوكيل في القضايا' ||
    rawType === 'case_representation' ||
    source === 'cases' ||
    source === 'custom_case'
  );
}

function getRequestDisplayName(request) {
  if (!request) return '—';

  const explicitName = String(request.service_name || '').trim();
  if (explicitName) return explicitName;

  return HELPERS.getServiceName(request.service_type);
}

function getRequestCategoryLabel(request) {
  return isCaseRequest(request) ? 'توكيل في قضية' : 'خدمة مباشرة';
}
function getCaseStageLabel(request) {
  const status = typeof request === 'string' ? request : (request && request.status);

  const labels = {
    new: 'قضية جديدة',
    pending: 'بانتظار الإحالة',
    assigned: 'أحيلت للمسؤول',
    review: 'قيد دراسة القضية',
    contacted: 'تم التواصل مع العميل',
    waiting: 'بانتظار مستندات القضية',
    progress: 'قيد العمل القانوني',
    done: 'اكتملت المعالجة',
    closed: 'مغلقة',
    cancelled: 'ملغاة',
    late: 'متأخرة'
  };

  return labels[status] || HELPERS.statusLabel(status);
}

function renderCaseResponsibleCell(request, employee) {
  if (!employee) {
    return `
      <div class="case-responsible-cell">
        <strong>لم تُحل بعد</strong>
        <span>بانتظار الإسناد لمحامٍ أو مسؤول</span>
      </div>
    `;
  }

  return `
    <div class="case-responsible-cell">
      <strong>${employee.full_name}</strong>
      <span>أُحيلت إليه ${request.assigned_at ? HELPERS.timeAgo(request.assigned_at) : ''}</span>
    </div>
  `;
}

function renderCaseFollowupSection(request, employee) {
  return `
    <div class="drawer-section">
      <h4>متابعة القضية</h4>

      <div class="case-followup-grid">
        <div class="case-followup-item">
          <div class="case-followup-label">مرحلة القضية</div>
          <div class="case-followup-value">${getCaseStageLabel(request)}</div>
        </div>

        <div class="case-followup-item">
          <div class="case-followup-label">المحامي / المسؤول</div>
          <div class="case-followup-value">${employee ? employee.full_name : 'لم تُحل بعد'}</div>
        </div>

        <div class="case-followup-item">
          <div class="case-followup-label">تاريخ الإحالة</div>
          <div class="case-followup-value">${request.assigned_at ? HELPERS.formatDateTime(request.assigned_at) : 'لم تُحل بعد'}</div>
        </div>

        <div class="case-followup-item">
          <div class="case-followup-label">آخر تحديث</div>
          <div class="case-followup-value">${HELPERS.formatDateTime(request.updated_at || request.created_at)}</div>
        </div>

        <div class="case-followup-item">
          <div class="case-followup-label">نوع القضية</div>
          <div class="case-followup-value">${getRequestDisplayName(request)}</div>
        </div>

        <div class="case-followup-item">
          <div class="case-followup-label">الأهمية</div>
          <div class="case-followup-value">${HELPERS.priorityLabel(request.priority)}</div>
        </div>
      </div>
    </div>
  `;
}
function getRequestKindForPage(page) {
  return page === 'cases' ? 'cases' : 'direct';
}

function isRequestListPage(page = APP.currentPage) {
  return page === 'requests' || page === 'cases';
}

function getRequestPageConfig(kind = 'direct') {
  const isCases = kind === 'cases';

  return {
    kind,
    filters: isCases ? APP.caseFilters : APP.filters,
    countId: isCases ? 'caseRequestsCount' : 'requestsCount',
    bodyId: isCases ? 'caseRequestsTableBody' : 'requestsTableBody',
    searchId: isCases ? 'caseSearchInput' : 'searchInput',
    serviceId: isCases ? 'caseFilterService' : 'filterService',
    statusId: isCases ? 'caseFilterStatus' : 'filterStatus',
    employeeId: isCases ? 'caseFilterEmployee' : 'filterEmployee',
    paymentId: isCases ? 'caseFilterPayment' : 'filterPayment',
    priorityId: isCases ? 'caseFilterPriority' : 'filterPriority'
  };
}

function getRequestsByKind(kind, requests = MOCK_DATA.service_requests) {
  return (requests || []).filter(function(request) {
    return kind === 'cases' ? isCaseRequest(request) : !isCaseRequest(request);
  });
}

function renderActiveRequestsPage() {
  if (APP.currentPage === 'cases') {
    renderCaseRequestsPage();
    return;
  }

  renderRequestsPage();
}

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
if(APP.currentUser && APP.currentUser.role !== 'admin'){
  if(page === 'employees' || page === 'activity'){
    showToast('هذه الصفحة مخصصة للمدير فقط', 'warn');
    page = 'requests';
  }
}   
  APP.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');

  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  const titles = {
    dashboard: 'لوحة التحكم',
    requests: 'الخدمات المباشرة',
    cases: 'طلبات توكيل القضايا',
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
if (page === 'cases') renderCaseRequestsPage();
if (page === 'employees') renderEmployeesPage();
if (page === 'activity') renderActivityPage();
if (page === 'support') renderSupportPage();
}

// =============================================================
// لوحة التحكم (Dashboard)
// =============================================================
function renderDashboard() {
  const isEmployeeView = APP.currentUser && APP.currentUser.role !== 'admin';

  const reqs = isEmployeeView
    ? MOCK_DATA.service_requests.filter(function(request) {
        return request.assigned_to === APP.currentUser.id;
      })
    : MOCK_DATA.service_requests;

  const directReqs = getRequestsByKind('direct', reqs);
  const caseReqs = getRequestsByKind('cases', reqs);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const total = reqs.length;
  const directCount = directReqs.length;
  const caseCount = caseReqs.length;
  const newReqs = reqs.filter(request => request.status === 'new' || request.status === 'pending').length;
  const inProgress = reqs.filter(request => ['assigned', 'review', 'contacted', 'waiting', 'progress'].includes(request.status)).length;
  const completed = reqs.filter(request => ['done', 'closed'].includes(request.status)).length;
  const late = reqs.filter(request => request.status === 'late').length;
  const todayCount = reqs.filter(request => String(request.created_at || '').slice(0, 10) === today).length;
  const weekCount = reqs.filter(request => String(request.created_at || '').slice(0, 10) >= weekAgo).length;

  const closedReqs = reqs.filter(request => request.closed_at);
  let avgClose = 0;

  if (closedReqs.length > 0) {
    const totalHours = closedReqs.reduce(function(sum, request) {
      return sum + (new Date(request.closed_at) - new Date(request.created_at)) / 3600000;
    }, 0);

    avgClose = (totalHours / closedReqs.length).toFixed(1);
  }

  const empOpen = MOCK_DATA.employees
    .filter(employee => employee.role === 'employee' && employee.status === 'active')
    .map(employee => ({ ...employee, openCount: HELPERS.openRequestsByEmployee(employee.id) }))
    .sort((a, b) => b.openCount - a.openCount);

  const busiestEmp = empOpen[0];
  const closeRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const paymentPending = reqs.filter(function(request) {
    return ['manual_pending', 'pending', 'unpaid', 'waiting_payment', 'pending_quote'].includes(request.payment_status);
  }).length;

  // المبالغ المكتسبة: الطلبات ذات الحالة «مكتمل» فقط
  const completedDirectForRevenue = directReqs.filter(request => request.status === 'done');
  const completedCasesForRevenue = caseReqs.filter(request => request.status === 'done');

  const directEarned = completedDirectForRevenue.reduce(function(totalValue, request) {
    return totalValue + (Number(request.price) || 0);
  }, 0);

  const casesEarned = completedCasesForRevenue.reduce(function(totalValue, request) {
    return totalValue + (Number(request.price) || 0);
  }, 0);

  const totalEarned = directEarned + casesEarned;

  const kpiHTML = `
    <section class="earnings-card" aria-label="مجموع المبالغ المكتسبة">
      <div class="earnings-card-head">
        <div class="earnings-heading">
          <div class="earnings-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="3"/>
              <path d="M2 10h20"/>
              <path d="M16 15h2"/>
            </svg>
          </div>
          <div>
            <div class="earnings-eyebrow">الأداء المالي</div>
            <h2 class="earnings-title">مجموع المبالغ المكتسبة</h2>
          </div>
        </div>

        <div class="earnings-total-wrap">
          <span class="earnings-total-label">الإجمالي</span>
          <div class="earnings-total-value">
            ${HELPERS.formatPrice(totalEarned)}
            <small>ر.س</small>
          </div>
        </div>
      </div>

      <div class="earnings-breakdown">
        <article class="earnings-part earnings-part-direct">
          <div class="earnings-part-top">
            <span class="earnings-dot"></span>
            <span class="earnings-part-label">الخدمات المباشرة</span>
          </div>
          <div class="earnings-part-value">${HELPERS.formatPrice(directEarned)} <small>ر.س</small></div>
          <div class="earnings-part-meta">${completedDirectForRevenue.length} طلب مكتمل</div>
        </article>

        <div class="earnings-divider" aria-hidden="true"></div>

        <article class="earnings-part earnings-part-cases">
          <div class="earnings-part-top">
            <span class="earnings-dot"></span>
            <span class="earnings-part-label">توكيل القضايا</span>
          </div>
          <div class="earnings-part-value">${HELPERS.formatPrice(casesEarned)} <small>ر.س</small></div>
          <div class="earnings-part-meta">${completedCasesForRevenue.length} طلب مكتمل</div>
        </article>
      </div>

      <div class="earnings-note">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>
        تُحتسب المبالغ للطلبات التي تحمل الحالة «مكتمل» فقط، ولا تدخل الطلبات المغلقة أو الملغاة أو غير المسعّرة في الإجمالي.
      </div>
    </section>

    <div class="kpi-card c-nv">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'إجمالي الطلبات المسندة لك' : 'إجمالي الطلبات'}</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/><polyline points="9 11 9 5 15 5 15 11"/></svg></div>
      </div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-trend up">↑ ${weekCount} طلب هذا الأسبوع</div>
    </div>

    <div class="kpi-card c-tl">
      <div class="kpi-header">
        <span class="kpi-label">الخدمات المباشرة</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      </div>
      <div class="kpi-value">${directCount}</div>
      <div class="kpi-trend">من إجمالي الطلبات</div>
    </div>

    <div class="kpi-card c-gd">
      <div class="kpi-header">
        <span class="kpi-label">طلبات توكيل القضايا</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 6h6L5 7z"/><path d="M19 7l-3 6h6l-3-6z"/><path d="M8 21h8"/></svg></div>
      </div>
      <div class="kpi-value">${caseCount}</div>
      <div class="kpi-trend">تظهر بمسمى القضية الفعلي</div>
    </div>

    <div class="kpi-card c-blue">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'طلبات جديدة مسندة لك' : 'طلبات جديدة'}</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
      </div>
      <div class="kpi-value">${newReqs}</div>
      <div class="kpi-trend">بانتظار التوزيع</div>
    </div>

    <div class="kpi-card c-purple">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'طلباتك قيد المعالجة' : 'قيد المعالجة'}</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      </div>
      <div class="kpi-value">${inProgress}</div>
      <div class="kpi-trend">طلب نشط حالياً</div>
    </div>

    <div class="kpi-card c-green">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'طلباتك المكتملة' : 'مكتملة / مغلقة'}</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      </div>
      <div class="kpi-value">${completed}</div>
      <div class="kpi-trend up">نسبة الإغلاق ${closeRate}%</div>
    </div>

    <div class="kpi-card c-red">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'طلباتك المتأخرة' : 'طلبات متأخرة'}</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      </div>
      <div class="kpi-value">${late}</div>
      <div class="kpi-trend down">تحتاج تدخلاً عاجلاً</div>
    </div>

    <div class="kpi-card c-orange">
      <div class="kpi-header">
        <span class="kpi-label">بانتظار الدفع</span>
        <div class="kpi-icon"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
      </div>
      <div class="kpi-value">${paymentPending}</div>
      <div class="kpi-trend">طلبات تحتاج تحققاً من الدفع</div>
    </div>

    <div class="kpi-card c-gd">
      <div class="kpi-header">
        <span class="kpi-label">${isEmployeeView ? 'طلباتك اليوم' : 'طلبات اليوم'}</span>
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
      <div class="kpi-value">${avgClose}<small class="kpi-unit">ساعة</small></div>
      <div class="kpi-trend">لكل طلب مغلق</div>
    </div>

    ${!isEmployeeView ? `
      <div class="kpi-card c-nv">
        <div class="kpi-header">
          <span class="kpi-label">الأكثر انشغالاً</span>
          <div class="kpi-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        </div>
        <div class="kpi-value kpi-person">${busiestEmp ? busiestEmp.full_name : '—'}</div>
        <div class="kpi-trend">${busiestEmp ? busiestEmp.openCount + ' طلب مفتوح' : ''}</div>
      </div>
    ` : ''}
  `;

  document.getElementById('kpiGrid').innerHTML = kpiHTML;

  drawTrendChart(reqs);
  renderServicesChart(reqs);
  renderRecentRequests(reqs);
  renderUrgentRequests(reqs);
}
async function refreshDashboardData(){
  var btn = document.getElementById('refreshDashboardBtn');
  var oldHTML = btn ? btn.innerHTML : '';

  try{
    if(btn){
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
        </svg>
        جاري التحديث...
      `;
    }

    if(typeof loadSupabaseEmployees === 'function'){
      await loadSupabaseEmployees();
    }

    if(typeof loadSupabaseRequests === 'function'){
      await loadSupabaseRequests();
    }

    if(typeof loadSupabaseActivity === 'function'){
      await loadSupabaseActivity();
    }

if(typeof loadDeleteRequests === 'function'){
  await loadDeleteRequests();
}
     
    if(typeof loadSupabaseSupportTickets === 'function'){
      await loadSupabaseSupportTickets();
    }

    if(typeof updateSidebarCounts === 'function'){
      updateSidebarCounts();
    }

    if(typeof renderNotifications === 'function'){
      renderNotifications();
    }

    if(APP.currentPage === 'dashboard'){
      renderDashboard();
    }

    if(APP.currentPage === 'requests'){
      renderActiveRequestsPage();
    }

    if(APP.currentPage === 'cases'){
      renderCaseRequestsPage();
    }

    if(APP.currentPage === 'employees'){
      renderEmployeesPage();
    }

    if(APP.currentPage === 'activity'){
      renderActivityPage();
    }

    if(APP.currentPage === 'support'){
      renderSupportPage();
    }

    showToast('تم تحديث البيانات بنجاح', 'success');

  }catch(err){
    console.error(err);
    showToast('تعذر تحديث البيانات، حاول مرة أخرى', 'error');
  }finally{
    if(btn){
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.innerHTML = oldHTML;
    }
  }
}

// ===== الرسم البياني للاتجاه =====
function drawTrendChart(requests = MOCK_DATA.service_requests) {
  const days = 7;
  const buckets = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dayString = date.toISOString().slice(0, 10);
    const dayRequests = (requests || []).filter(request => String(request.created_at || '').slice(0, 10) === dayString);

    buckets.push({
      day: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
      direct: dayRequests.filter(request => !isCaseRequest(request)).length,
      cases: dayRequests.filter(request => isCaseRequest(request)).length
    });
  }

  const maxValue = Math.max(
    ...buckets.flatMap(bucket => [bucket.direct, bucket.cases]),
    4
  );

  const width = 700;
  const height = 205;
  const padding = 30;
  const stepX = (width - padding * 2) / Math.max(buckets.length - 1, 1);

  function createPoints(key) {
    return buckets.map(function(bucket, index) {
      return {
        x: padding + index * stepX,
        y: height - padding - (bucket[key] / maxValue) * (height - padding * 2),
        value: bucket[key],
        day: bucket.day
      };
    });
  }

  function createPath(points) {
    return points.map(function(point, index) {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');
  }

  const directPoints = createPoints('direct');
  const casePoints = createPoints('cases');
  const directPath = createPath(directPoints);
  const casePath = createPath(casePoints);

  document.getElementById('trendChart').innerHTML = `
    <div class="trend-legend">
      <span><i class="trend-key trend-key-direct"></i>الخدمات المباشرة</span>
      <span><i class="trend-key trend-key-cases"></i>توكيل القضايا</span>
    </div>

    <svg viewBox="0 0 ${width} ${height}" class="trend-svg" preserveAspectRatio="none" aria-label="حركة الخدمات المباشرة وطلبات توكيل القضايا خلال آخر سبعة أيام">
      ${[0, 1, 2, 3].map(function(index) {
        const y = padding + index * ((height - padding * 2) / 3);
        return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(27,58,75,0.07)" stroke-dasharray="3,4"/>`;
      }).join('')}

      <path d="${directPath}" fill="none" stroke="#3D7B8A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${casePath}" fill="none" stroke="#C9A96E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

      ${directPoints.map(function(point) {
        return `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="#fff" stroke="#3D7B8A" stroke-width="2.5"/>`;
      }).join('')}

      ${casePoints.map(function(point) {
        return `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="#fff" stroke="#C9A96E" stroke-width="2.5"/>`;
      }).join('')}

      ${buckets.map(function(bucket, index) {
        const x = padding + index * stepX;
        return `<text x="${x}" y="${height - 7}" text-anchor="middle" font-size="11" fill="#8A9DAB" font-family="Tajawal">${bucket.day}</text>`;
      }).join('')}
    </svg>
  `;
}

// ===== مخطط الخدمات والقضايا الأكثر طلباً =====
function renderServicesChart(requests = MOCK_DATA.service_requests) {
  const counts = {};

  (requests || []).forEach(function(request) {
    const name = getRequestDisplayName(request);
    counts[name] = (counts[name] || 0) + 1;
  });

  const items = Object.entries(counts)
    .map(function(entry) {
      return { name: entry[0], count: entry[1] };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const total = Math.max((requests || []).length, 1);
  const palette = [
    ['#3D7B8A', '#4F9BAD'],
    ['#C9A96E', '#D9BF8E'],
    ['#1B3A4B', '#234D63'],
    ['#8B5CF6', '#A78BFA'],
    ['#10B981', '#34D399'],
    ['#F59E0B', '#FBBF24'],
    ['#0EA5E9', '#38BDF8'],
    ['#EC4899', '#F472B6']
  ];

  if (!items.length) {
    document.getElementById('servicesChart').innerHTML = '<div class="empty-mini">لا توجد بيانات كافية بعد</div>';
    return;
  }

  document.getElementById('servicesChart').innerHTML = items.map(function(item, index) {
    const percentage = (item.count / total) * 100;
    const colors = palette[index % palette.length];

    return `
      <div class="service-bar">
        <div class="service-bar-row">
          <span class="service-bar-label">${item.name}</span>
          <span class="service-bar-value">${item.count} طلب</span>
        </div>
        <div class="service-bar-track">
          <div class="service-bar-fill" style="width:${percentage}%;--bar-color:${colors[0]};--bar-color-l:${colors[1]};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== آخر الطلبات =====
function renderRecentRequests(requests = MOCK_DATA.service_requests) {
  const recent = [...(requests || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (!recent.length) {
    document.getElementById('recentList').innerHTML = '<div class="empty-mini">لا توجد طلبات حتى الآن</div>';
    return;
  }

  document.getElementById('recentList').innerHTML = recent.map(function(request) {
    return `
      <div class="recent-item" onclick="openRequestDrawer('${request.id}')">
        <div class="recent-item-left">
          <div class="cell-customer-avatar">${HELPERS.initials(request.customer_name)}</div>
          <div>
            <div class="recent-customer-name">${request.customer_name}</div>
            <div class="recent-service-name">${getRequestDisplayName(request)}</div>
            <span class="request-category-chip ${isCaseRequest(request) ? 'case' : 'direct'}">${getRequestCategoryLabel(request)}</span>
          </div>
        </div>
        <div class="recent-item-right">
          <span class="badge s-${request.status}">${HELPERS.statusLabel(request.status)}</span>
          <div class="recent-time">${HELPERS.timeAgo(request.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== الطلبات العاجلة =====
function renderUrgentRequests(requests = MOCK_DATA.service_requests) {
  const urgent = (requests || [])
    .filter(request => (
      request.priority === 'urgent' ||
      request.priority === 'high' ||
      request.status === 'late'
    ) && !['done', 'closed', 'cancelled'].includes(request.status))
    .slice(0, 5);

  if (!urgent.length) {
    document.getElementById('urgentList').innerHTML = '<div class="empty-mini">لا توجد طلبات عاجلة حالياً ✓</div>';
    return;
  }

  document.getElementById('urgentList').innerHTML = urgent.map(function(request) {
    return `
      <div class="recent-item" onclick="openRequestDrawer('${request.id}')">
        <div class="recent-item-left">
          <div class="urgent-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="recent-customer-name">${request.id}</div>
            <div class="recent-service-name">${request.customer_name} · ${getRequestDisplayName(request)}</div>
          </div>
        </div>
        <div class="recent-item-right">
          <span class="badge p-${request.priority}">${HELPERS.priorityLabel(request.priority)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================
// صفحات الخدمات المباشرة وطلبات توكيل القضايا
// =============================================================
function renderRequestsPage() {
  renderRequestCollectionPage('direct');
}

function renderCaseRequestsPage() {
  renderRequestCollectionPage('cases');
}

function buildRequestServiceOptions(kind) {
  if (kind === 'direct') {
    const known = MOCK_DATA.services.map(function(service) {
      return { value: service.key, label: service.name };
    });

    const extras = getRequestsByKind('direct')
      .filter(function(request) {
        return !MOCK_DATA.services.some(service => service.key === request.service_type);
      })
      .map(function(request) {
        return { value: request.service_type, label: getRequestDisplayName(request) };
      });

    const combined = [...known, ...extras];
    const seen = new Set();

    return combined.filter(function(item) {
      const key = `${item.value}::${item.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const names = getRequestsByKind('cases')
    .map(getRequestDisplayName)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'ar'));

  return [...new Set(names)].map(function(name) {
    return { value: name, label: name };
  });
}

function renderRequestCollectionPage(kind) {
  const config = getRequestPageConfig(kind);

  const employeeOptions = MOCK_DATA.employees
    .filter(employee => employee.status === 'active')
    .map(employee => `<option value="${employee.id}">${employee.full_name}</option>`)
    .join('');

  const serviceOptions = buildRequestServiceOptions(kind)
    .map(item => `<option value="${item.value}">${item.label}</option>`)
    .join('');

  const employeeSelect = document.getElementById(config.employeeId);
  const serviceSelect = document.getElementById(config.serviceId);

  if (employeeSelect) {
    employeeSelect.innerHTML = `<option value="all">كل الموظفين</option><option value="unassigned">غير مسند</option>${employeeOptions}`;
    employeeSelect.value = config.filters.employee;
  }

  if (serviceSelect) {
    serviceSelect.innerHTML = `<option value="all">${kind === 'cases' ? 'كل أنواع القضايا' : 'كل الخدمات'}</option>${serviceOptions}`;
    serviceSelect.value = config.filters.service;
  }

  renderRequestsTable(kind);
}

function renderPaymentStatus(request) {
  if (request.status === 'cancelled') {
    return '<span style="color:var(--tm);">—</span>';
  }

  if (request.status === 'done' || request.status === 'closed') {
    return '<span class="badge pay-paid">حوالة</span>';
  }

  if (request.payment_status === 'pending_quote') {
    return '<span class="badge pay-pending">بانتظار التسعير</span>';
  }

  return '<span class="badge pay-pending">بانتظار الدفع</span>';
}

function renderRequestsTable(kind = 'direct') {
  const config = getRequestPageConfig(kind);
  const filters = config.filters;
  let requests = getRequestsByKind(kind);

  if (filters.search) {
    const query = filters.search.toLowerCase();

    requests = requests.filter(function(request) {
      return (
        String(request.customer_name || '').toLowerCase().includes(query) ||
        String(request.customer_phone || '').includes(query) ||
        String(request.id || '').toLowerCase().includes(query) ||
        getRequestDisplayName(request).toLowerCase().includes(query) ||
        String(request.details || '').toLowerCase().includes(query)
      );
    });
  }

  if (filters.service !== 'all') {
    requests = requests.filter(function(request) {
      return kind === 'cases'
        ? getRequestDisplayName(request) === filters.service
        : request.service_type === filters.service;
    });
  }

  if (filters.status !== 'all') {
    requests = requests.filter(request => request.status === filters.status);
  }

  if (filters.employee !== 'all') {
    if (filters.employee === 'unassigned') {
      requests = requests.filter(request => !request.assigned_to);
    } else {
      requests = requests.filter(request => request.assigned_to === filters.employee);
    }
  }

  if (filters.payment !== 'all') {
    requests = requests.filter(request => request.payment_status === filters.payment);
  }

  if (filters.priority !== 'all') {
    requests = requests.filter(request => request.priority === filters.priority);
  }

  requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const countElement = document.getElementById(config.countId);
  const tableBody = document.getElementById(config.bodyId);

  if (countElement) {
    countElement.textContent = `${requests.length} طلب`;
  }

  if (!tableBody) return;

  if (!requests.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <h3>${kind === 'cases' ? 'لا توجد طلبات توكيل مطابقة' : 'لا توجد خدمات مباشرة مطابقة'}</h3>
            <p>جرّب تعديل الفلاتر أو إعادة ضبطها</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = requests.map(function(request) {
    const employee = HELPERS.getEmployee(request.assigned_to);

    return `
      <tr onclick="openRequestDrawer('${request.id}')">
        <td><span class="cell-id">${request.id}</span></td>
        <td>
          <div class="cell-customer">
            <div class="cell-customer-avatar">${HELPERS.initials(request.customer_name)}</div>
            <div>
              <div class="cell-customer-name">${request.customer_name}</div>
              <div class="cell-customer-phone">${request.customer_phone}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="request-name-cell">${getRequestDisplayName(request)}</div>
          <div class="request-kind-cell">${getRequestCategoryLabel(request)}</div>
        </td>
        <td><span class="cell-price">${HELPERS.formatPrice(request.price)}<small>ر.س</small></span></td>
       <td>${renderPaymentStatus(request)}</td>

<td>
  <span class="badge ${kind === 'cases' ? 'case-stage' : 's-' + request.status}">
    ${kind === 'cases' ? getCaseStageLabel(request) : HELPERS.statusLabel(request.status)}
  </span>
</td>

<td><span class="badge p-${request.priority}">${HELPERS.priorityLabel(request.priority)}</span></td>

<td>
  ${
    kind === 'cases'
      ? renderCaseResponsibleCell(request, employee)
      : employee
        ? `<span class="cell-employee"><span class="cell-employee-avatar">${HELPERS.initials(employee.full_name)}</span>${employee.full_name.split(' ')[0]}</span>`
        : '<span class="cell-unassigned">— غير مسند —</span>'
  }
</td>

<td class="cell-date">
  ${HELPERS.formatDate(kind === 'cases' ? (request.updated_at || request.created_at) : request.created_at)}
  <small>${HELPERS.formatTime(kind === 'cases' ? (request.updated_at || request.created_at) : request.created_at)}</small>
</td>
        <td class="cell-date">
          ${HELPERS.formatDate(request.created_at)}
          <small>${HELPERS.formatTime(request.created_at)}</small>
        </td>
        <td onclick="event.stopPropagation()">${renderDeleteRequestAction(request)}</td>
      </tr>
    `;
  }).join('');
}

// ===== أزرار حذف الطلب بموافقة مستخدمين =====
function getPendingDeleteRequestFor(requestId) {
  return (APP.deleteRequests || []).find(function(item) {
    return item.request_id === requestId && item.status === 'pending';
  }) || null;
}

function renderDeleteRequestAction(request) {  
  const pending = getPendingDeleteRequestFor(request.id);

  // لا يوجد طلب حذف معلق
  if (!pending) {
    return `
      <button class="btn btn-danger btn-sm"
              onclick="requestServiceRequestDeletion(event, '${request.id}')"
              title="طلب حذف الطلب">
        حذف
      </button>
    `;
  }

  // المستخدم الحالي هو من طلب الحذف
  if (pending.requested_by === APP.currentUser.id) {
    return `
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge" style="background:var(--orange-l);color:#92400E;">
          بانتظار الاعتماد
        </span>

        <button class="btn btn-sm"
                onclick="cancelServiceRequestDeletion(event, '${pending.id}')">
          إلغاء
        </button>
      </div>
    `;
  }

  // المستخدم الآخر يستطيع اعتماد الحذف
  return `
    <button class="btn btn-danger btn-sm"
            onclick="approveServiceRequestDeletion(event, '${request.id}')">
      اعتماد الحذف
    </button>
  `;
}

async function requestServiceRequestDeletion(event, requestId) {
  if (event) {
    event.stopPropagation();
  }

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === requestId;
  });

  if (!request) {
    showToast('تعذر العثور على الطلب', 'error');
    return;
  }

  const confirmed = window.confirm(
    `هل تريد إرسال طلب حذف للطلب الخاص بالعميل "${request.customer_name}"؟\n\nلن يُحذف الطلب حتى يوافق المستخدم الآخر.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const existingRequest = getPendingDeleteRequestFor(requestId);

    if (existingRequest) {
      showToast('يوجد طلب حذف معلق لهذا الطلب بالفعل', 'warn');
      return;
    }

    const { error } = await window.sb
      .from('request_delete_requests')
      .insert({
        request_id: requestId,
        requested_by: APP.currentUser.id,
        requested_by_name:
          APP.currentUser.full_name ||
          APP.currentUser.name ||
          'مستخدم',
        status: 'pending'
      });

    if (error) {
      throw error;
    }

    await loadDeleteRequests();
    renderActiveRequestsPage();

    showToast(
      'تم إرسال طلب الحذف وبانتظار موافقة المستخدم الآخر',
      'success'
    );

  } catch (error) {
    console.error('Delete request error:', error);
    showToast('تعذر إرسال طلب الحذف', 'error');
  }
}

async function cancelServiceRequestDeletion(event, deleteRequestId) {
  if (event) {
    event.stopPropagation();
  }

  const confirmed = window.confirm(
    'هل تريد إلغاء طلب الحذف؟'
  );

  if (!confirmed) {
    return;
  }

  try {
    const { error } = await window.sb
      .from('request_delete_requests')
      .delete()
      .eq('id', deleteRequestId);

    if (error) {
      throw error;
    }

    await loadDeleteRequests();
    renderActiveRequestsPage();

    showToast('تم إلغاء طلب الحذف', 'success');

  } catch (error) {
    console.error('Cancel deletion error:', error);
    showToast('تعذر إلغاء طلب الحذف', 'error');
  }
}

async function approveServiceRequestDeletion(event, requestId) {
  if (event) {
    event.stopPropagation();
  }

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === requestId;
  });

  if (!request) {
    showToast('تعذر العثور على الطلب', 'error');
    return;
  }

  const confirmed = window.confirm(
    `هل توافق على حذف طلب العميل "${request.customer_name}" نهائيًا؟\n\nلا يمكن التراجع عن الحذف بعد تنفيذه.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const { data, error } = await window.sb.rpc(
      'approve_and_delete_service_request',
      {
        p_request_id: requestId,
        p_approved_by: APP.currentUser.id,
        p_approved_by_name:
          APP.currentUser.full_name ||
          APP.currentUser.name ||
          'مستخدم'
      }
    );

    if (error) {
      throw error;
    }

    await loadSupabaseRequests();
    await loadDeleteRequests();

    updateSidebarCounts();
    renderActiveRequestsPage();

    if (APP.currentPage === 'dashboard') {
      renderDashboard();
    }

    showToast('تم حذف الطلب نهائيًا', 'success');

  } catch (error) {
    console.error('Approve deletion error:', error);

    const message =
      error && error.message
        ? error.message
        : 'تعذر حذف الطلب';

    showToast(message, 'error');
  }
}

// إعادة ضبط الفلاتر
function resetFilters(kind) {
  const activeKind = kind || getRequestKindForPage(APP.currentPage);
  const config = getRequestPageConfig(activeKind);

  Object.assign(config.filters, {
    search: '',
    service: 'all',
    status: 'all',
    employee: 'all',
    payment: 'all',
    priority: 'all'
  });

  [
    [config.searchId, ''],
    [config.serviceId, 'all'],
    [config.statusId, 'all'],
    [config.employeeId, 'all'],
    [config.paymentId, 'all'],
    [config.priorityId, 'all']
  ].forEach(function(item) {
    const element = document.getElementById(item[0]);
    if (element) element.value = item[1];
  });

  renderRequestsTable(activeKind);
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
  document.getElementById('drawerTitle').textContent = `${getRequestDisplayName(r)} — ${r.customer_name}`;
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
          <div class="info-item-label">${isCaseRequest(r) ? 'نوع القضية' : 'نوع الخدمة'}</div>
          <div class="info-item-value">${getRequestDisplayName(r)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">السعر</div>
          <div class="info-item-value">${HELPERS.formatPrice(r.price)} ر.س</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">التصنيف</div>
          <div class="info-item-value">${getRequestCategoryLabel(r)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">حالة الدفع</div>
          <div class="info-item-value">${HELPERS.paymentLabel(r.payment_status)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">تاريخ الطلب</div>
          <div class="info-item-value">${HELPERS.formatDate(r.created_at)} ${HELPERS.formatTime(r.created_at)}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">آخر تحديث</div>
          <div class="info-item-value">${HELPERS.timeAgo(r.updated_at || r.created_at)}</div>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <h4>تفاصيل الطلب</h4>
      <div class="note-box">${r.details || 'لا توجد تفاصيل إضافية'}</div>
    </div>

    <div class="drawer-section">
      <h4>الإسناد والمتابعة</h4>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-item-label">الموظف المسؤول</div>
          <div class="info-item-value">${emp ? emp.full_name : 'غير مسند'}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">أُسند بواسطة</div>
          <div class="info-item-value">${assignedByEmp ? assignedByEmp.full_name : '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">تاريخ الإسناد</div>
          <div class="info-item-value">${r.assigned_at ? HELPERS.formatDate(r.assigned_at) : '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">تاريخ الإغلاق</div>
          <div class="info-item-value">${r.closed_at ? HELPERS.formatDate(r.closed_at) : '—'}</div>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <h4>المرفقات</h4>
      ${attachmentsHTML}
    </div>

    <div class="drawer-section">
      <h4>الملاحظات الداخلية</h4>
      <div class="notes-list">
        ${(r.notes || []).map(note => `
          <div class="note-item">
            <div class="note-item-head">
              <strong>${note.by}</strong>
              <span>${HELPERS.timeAgo(note.at)}</span>
            </div>
            <p>${note.text}</p>
          </div>
        `).join('') || '<div style="color:var(--tm);font-size:13px;">لا توجد ملاحظات بعد</div>'}
      </div>
      <div class="add-note">
        <textarea id="newNoteText" placeholder="أضف ملاحظة داخلية..."></textarea>
        <button class="btn btn-primary btn-sm" onclick="addNote()">إضافة ملاحظة</button>
      </div>
    </div>

    ${r.closing_note ? `
      <div class="drawer-section">
        <h4>ملاحظة الإغلاق</h4>
        <div class="note-box">${r.closing_note}</div>
        <div style="font-size:12px;color:var(--t2);margin-top:8px;">
          بواسطة: ${closedByEmp ? closedByEmp.full_name : '—'}
        </div>
      </div>
    ` : ''}
  `;

  // أزرار الإجراءات
  const canManage = APP.currentUser.role === 'admin' || r.assigned_to === APP.currentUser.id;
  const isClosed = ['done', 'closed', 'cancelled'].includes(r.status);

  document.getElementById('drawerActions').innerHTML = `
    ${!r.assigned_to ? `
      <button class="btn btn-primary" onclick="openAssignModal('${r.id}')">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        إسناد الطلب
      </button>
    ` : ''}

    ${canManage ? `
      <button class="btn btn-primary" onclick="openStatusModal('${r.id}')">
        <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        تغيير الحالة
      </button>

      <button class="btn" onclick="openAssignModal('${r.id}')">
        <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        تغيير الموظف
      </button>

      ${!isClosed ? `
        <button class="btn btn-success" onclick="openCloseModal('${r.id}')">
          <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          إغلاق الطلب
        </button>
      ` : ''}
    ` : ''}
  `;

  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
  APP.selectedRequestId = null;
}

// =============================================================
// الإسناد
// =============================================================
function openAssignModal(reqId) {
  APP.selectedRequestId = reqId;
  APP.pendingAssignEmpId = null;

  const employees = MOCK_DATA.employees
    .filter(e => e.role === 'employee' && e.status === 'active')
    .map(e => ({
      ...e,
      openCount: HELPERS.openRequestsByEmployee(e.id)
    }))
    .sort((a, b) => a.openCount - b.openCount);

  document.getElementById('assignList').innerHTML = employees.map(e => `
    <div class="assign-card" data-emp-id="${e.id}" onclick="selectAssignEmp('${e.id}')">
      <div class="assign-avatar">${HELPERS.initials(e.full_name)}</div>
      <div class="assign-info">
        <h4>${e.full_name}</h4>
        <div class="assign-meta">${e.email}</div>
      </div>
      <div class="assign-stats">
        <div class="num">${e.openCount}</div>
        <div class="label">طلب مفتوح</div>
      </div>
    </div>
  `).join('');

  openModal('assignModal');
}   
function selectAssignEmp(empId) {
  APP.pendingAssignEmpId = empId;

  document.querySelectorAll('.assign-card').forEach(function(card) {
    card.classList.toggle('selected', card.dataset.empId === empId);
  });
}

function autoAssign() {
  const employees = MOCK_DATA.employees
    .filter(function(employee) {
      return employee.role === 'employee' && employee.status === 'active';
    })
    .map(function(employee) {
      return {
        ...employee,
        openCount: HELPERS.openRequestsByEmployee(employee.id)
      };
    })
    .sort(function(a, b) {
      return a.openCount - b.openCount;
    });

  if (!employees.length) {
    showToast('لا يوجد موظفون متاحون للإسناد', 'warn');
    return;
  }

  selectAssignEmp(employees[0].id);
  showToast(`تم اختيار ${employees[0].full_name} تلقائيًا`, 'success');
}

async function confirmAssign() {
  if (!APP.selectedRequestId) {
    showToast('لم يتم تحديد الطلب', 'error');
    return;
  }

  if (!APP.pendingAssignEmpId) {
    showToast('اختر الموظف أولًا', 'warn');
    return;
  }

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === APP.selectedRequestId;
  });

  const employee = HELPERS.getEmployee(APP.pendingAssignEmpId);

  if (!request || !employee) {
    showToast('تعذر العثور على الطلب أو الموظف', 'error');
    return;
  }

  const updates = {
    assigned_to: employee.id,
    assigned_by: APP.currentUser.id,
    assigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (request.status === 'new' || request.status === 'pending') {
    updates.status = 'assigned';
  }

  try {
    await updateRequestInStore(request.id, updates);

    await addActivityLog({
      request_id: request.id,
      action: 'assign',
      title: 'إسناد طلب',
      description: `تم إسناد الطلب إلى ${employee.full_name}`,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    closeModal('assignModal');
    closeDrawer();

    renderDashboard();
    renderActiveRequestsPage();
    updateSidebarCounts();

    showToast('تم إسناد الطلب بنجاح', 'success');

  } catch (error) {
    console.error('Assign error:', error);
    showToast('تعذر إسناد الطلب', 'error');
  }
}

// =============================================================
// تغيير الحالة
// =============================================================
function openStatusModal(reqId) {
  APP.selectedRequestId = reqId;

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === reqId;
  });

  if (!request) {
    showToast('تعذر العثور على الطلب', 'error');
    return;
  }

  document.getElementById('newStatusSelect').value = request.status || 'new';
  document.getElementById('statusCommentInput').value = '';

  openModal('statusModal');
}

async function confirmStatusChange() {
  if (!APP.selectedRequestId) {
    showToast('لم يتم تحديد الطلب', 'error');
    return;
  }

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === APP.selectedRequestId;
  });

  if (!request) {
    showToast('تعذر العثور على الطلب', 'error');
    return;
  }

  const newStatus = document.getElementById('newStatusSelect').value;
  const comment = document.getElementById('statusCommentInput').value.trim();

  const updates = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  if (newStatus === 'done' || newStatus === 'closed' || newStatus === 'cancelled') {
    updates.closed_at = new Date().toISOString();
    updates.closed_by = APP.currentUser.id;
  }

  try {
    await updateRequestInStore(request.id, updates);

    if (comment) {
      await appendRequestNote(request.id, {
        by: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم',
        by_id: APP.currentUser.id,
        at: new Date().toISOString(),
        text: comment
      });
    }

    await addActivityLog({
      request_id: request.id,
      action: 'status_change',
      title: 'تغيير حالة الطلب',
      description: `تم تغيير الحالة إلى: ${HELPERS.statusLabel(newStatus)}${comment ? ' — ' + comment : ''}`,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    closeModal('statusModal');
    closeDrawer();

    renderDashboard();
    renderActiveRequestsPage();
    updateSidebarCounts();

    showToast('تم تحديث حالة الطلب', 'success');

  } catch (error) {
    console.error('Status update error:', error);
    showToast('تعذر تحديث حالة الطلب', 'error');
  }
}

// =============================================================
// إغلاق الطلب
// =============================================================
function openCloseModal(reqId) {
  APP.selectedRequestId = reqId;

  document.getElementById('closeResultSelect').value = 'success';
  document.getElementById('closeNoteInput').value = '';

  openModal('closeModal');
}

async function confirmClose() {
  if (!APP.selectedRequestId) {
    showToast('لم يتم تحديد الطلب', 'error');
    return;
  }

  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === APP.selectedRequestId;
  });

  if (!request) {
    showToast('تعذر العثور على الطلب', 'error');
    return;
  }

  const result = document.getElementById('closeResultSelect').value;
  const note = document.getElementById('closeNoteInput').value.trim();

  if (!note) {
    showToast('اكتب ملاحظة الإغلاق أولًا', 'warn');
    return;
  }

  let status = 'done';

  if (result === 'partial') {
    status = 'closed';
  }

  if (result === 'cancelled') {
    status = 'cancelled';
  }

  const updates = {
    status,
    closing_note: note,
    closed_at: new Date().toISOString(),
    closed_by: APP.currentUser.id,
    updated_at: new Date().toISOString()
  };

  try {
    await updateRequestInStore(request.id, updates);

    await addActivityLog({
      request_id: request.id,
      action: 'close',
      title: 'إغلاق الطلب',
      description: `تم إغلاق الطلب بنتيجة: ${HELPERS.statusLabel(status)} — ${note}`,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    closeModal('closeModal');
    closeDrawer();

    renderDashboard();
    renderActiveRequestsPage();
    updateSidebarCounts();

    showToast('تم إغلاق الطلب بنجاح', 'success');

  } catch (error) {
    console.error('Close request error:', error);
    showToast('تعذر إغلاق الطلب', 'error');
  }
}

// =============================================================
// الملاحظات
// =============================================================
async function addNote() {
  if (!APP.selectedRequestId) {
    showToast('لم يتم تحديد الطلب', 'error');
    return;
  }

  const textarea = document.getElementById('newNoteText');
  const text = textarea ? textarea.value.trim() : '';

  if (!text) {
    showToast('اكتب الملاحظة أولًا', 'warn');
    return;
  }

  const note = {
    by: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم',
    by_id: APP.currentUser.id,
    at: new Date().toISOString(),
    text
  };

  try {
    await appendRequestNote(APP.selectedRequestId, note);

    await addActivityLog({
      request_id: APP.selectedRequestId,
      action: 'note',
      title: 'إضافة ملاحظة',
      description: text,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    openRequestDrawer(APP.selectedRequestId);
    renderActiveRequestsPage();

    showToast('تمت إضافة الملاحظة', 'success');

  } catch (error) {
    console.error('Add note error:', error);
    showToast('تعذر إضافة الملاحظة', 'error');
  }
}

// =============================================================
// تحديث الطلب محليًا وفي Supabase
// =============================================================
async function updateRequestInStore(requestId, updates) {
  const localIndex = MOCK_DATA.service_requests.findIndex(function(item) {
    return item.id === requestId;
  });

  if (localIndex === -1) {
    throw new Error('الطلب غير موجود');
  }

  if (window.sb) {
    const { error } = await window.sb
      .from('service_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      throw error;
    }
  }

  MOCK_DATA.service_requests[localIndex] = {
    ...MOCK_DATA.service_requests[localIndex],
    ...updates
  };

  return MOCK_DATA.service_requests[localIndex];
}

async function appendRequestNote(requestId, note) {
  const request = MOCK_DATA.service_requests.find(function(item) {
    return item.id === requestId;
  });

  if (!request) {
    throw new Error('الطلب غير موجود');
  }

  const notes = Array.isArray(request.notes) ? [...request.notes] : [];
  notes.push(note);

  await updateRequestInStore(requestId, {
    notes,
    updated_at: new Date().toISOString()
  });
}

// =============================================================
// صفحة الموظفين
// =============================================================
function renderEmployeesPage() {
  const grid = document.getElementById('employeesGrid');

  if (!grid) {
    return;
  }

  const employees = MOCK_DATA.employees || [];

  if (!employees.length) {
    grid.innerHTML = `
      <div class="empty-state" style="background:#fff;border-radius:16px;border:var(--border);">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <h3>لا يوجد موظفون بعد</h3>
        <p>ابدأ بإضافة موظف جديد</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = employees.map(function(employee) {
    const openCount = HELPERS.openRequestsByEmployee(employee.id);
    const completedCount = MOCK_DATA.service_requests.filter(function(request) {
      return request.assigned_to === employee.id && ['done', 'closed'].includes(request.status);
    }).length;

    const assignedDirect = MOCK_DATA.service_requests.filter(function(request) {
      return request.assigned_to === employee.id && !isCaseRequest(request);
    }).length;

    const assignedCases = MOCK_DATA.service_requests.filter(function(request) {
      return request.assigned_to === employee.id && isCaseRequest(request);
    }).length;

    return `
      <div class="employee-card">
        <div class="employee-card-head">
          <div class="employee-avatar">${HELPERS.initials(employee.full_name)}</div>
          <div>
            <h3>${employee.full_name}</h3>
            <p>${employee.email || '—'}</p>
          </div>
        </div>

        <div class="employee-meta">
          <span class="badge ${employee.role === 'admin' ? 's-done' : 's-assigned'}">${employee.role === 'admin' ? 'مدير' : 'موظف'}</span>
          <span class="badge ${employee.status === 'active' ? 's-done' : 's-cancelled'}">${employee.status === 'active' ? 'نشط' : 'غير نشط'}</span>
        </div>

        <div class="employee-stats">
          <div>
            <strong>${openCount}</strong>
            <span>مفتوح</span>
          </div>
          <div>
            <strong>${completedCount}</strong>
            <span>مكتمل</span>
          </div>
          <div>
            <strong>${assignedDirect}</strong>
            <span>خدمات</span>
          </div>
          <div>
            <strong>${assignedCases}</strong>
            <span>قضايا</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddEmployeeModal() {
  document.getElementById('newEmpName').value = '';
  document.getElementById('newEmpEmail').value = '';
  document.getElementById('newEmpPhone').value = '';
  document.getElementById('newEmpRole').value = 'employee';

  openModal('addEmpModal');
}

async function confirmAddEmployee() {
  const fullName = document.getElementById('newEmpName').value.trim();
  const email = document.getElementById('newEmpEmail').value.trim();
  const phone = document.getElementById('newEmpPhone').value.trim();
  const role = document.getElementById('newEmpRole').value;

  if (!fullName || !email || !phone) {
    showToast('أدخل اسم الموظف والبريد ورقم الجوال', 'warn');
    return;
  }

  const employee = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    full_name: fullName,
    name: fullName,
    email,
    phone,
    role,
    status: 'active',
    created_at: new Date().toISOString()
  };

  try {
    if (window.sb) {
      const { data, error } = await window.sb
        .from('employees')
        .insert(employee)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        Object.assign(employee, data);
      }
    }

    MOCK_DATA.employees.push(employee);

    await addActivityLog({
      action: 'employee_create',
      title: 'إضافة موظف',
      description: `تمت إضافة الموظف ${fullName}`,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    closeModal('addEmpModal');
    renderEmployeesPage();
    renderActiveRequestsPage();

    showToast('تمت إضافة الموظف بنجاح', 'success');

  } catch (error) {
    console.error('Add employee error:', error);
    showToast('تعذر إضافة الموظف', 'error');
  }
}
// =============================================================
// صفحة سجل النشاط
// =============================================================
function renderActivityPage() {
  const logSource = APP.activityLog && APP.activityLog.length
    ? APP.activityLog
    : (MOCK_DATA.activity_log || []);

  const sorted = [...logSource].sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const icons = {
    created: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    assign: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    assigned: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    status_change: '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6"/></svg>',
    status_changed: '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    note_added: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    closed: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    employee_create: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    support_convert: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>'
  };

  const typeMap = {
    created: 'created',
    assign: 'assigned',
    assigned: 'assigned',
    status_change: 'status',
    status_changed: 'status',
    note: 'note',
    note_added: 'note',
    close: 'closed',
    closed: 'closed',
    employee_create: 'assigned',
    support_convert: 'contact'
  };

  if (!sorted.length) {
    document.getElementById('activityFeed').innerHTML = `
      <div class="empty-state" style="background:#fff;border-radius:16px;border:var(--border);">
        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <h3>لا يوجد نشاط مسجل بعد</h3>
        <p>ستظهر هنا عمليات الإسناد وتغيير الحالة والملاحظات</p>
      </div>
    `;
    return;
  }

  document.getElementById('activityFeed').innerHTML = sorted.map(function(activity) {
    const action = activity.action || activity.action_type || 'status_change';
    const requestId = activity.request_id || '';
    const createdBy =
      activity.created_by_name ||
      activity.actor_name ||
      (HELPERS.getEmployee(activity.created_by || activity.actor_id) || {}).full_name ||
      'النظام';

    const description =
      activity.description ||
      activity.title ||
      'تم تسجيل نشاط على الطلب';

    return `
      <div class="timeline-item">
        <div class="timeline-icon t-${typeMap[action] || 'status'}">
          ${icons[action] || icons.status_change}
        </div>
        <div class="timeline-content">
          <div class="timeline-text">
            <strong>${createdBy}</strong>
            ${description}
            ${
              requestId
                ? `<a onclick="openRequestDrawer('${requestId}')" style="color:var(--tl);cursor:pointer;font-weight:600;margin-right:4px;">${requestId}</a>`
                : ''
            }
          </div>
          <div class="timeline-time">
            ${HELPERS.formatDateTime(activity.created_at)} · ${HELPERS.timeAgo(activity.created_at)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================
// لوحة الإشعارات
// =============================================================
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) {
    panel.classList.toggle('open');
  }
}

function renderNotifications() {
  const items = [];

  (MOCK_DATA.service_requests || [])
    .filter(function(request) {
      return request.status === 'new' || request.status === 'pending';
    })
    .slice(0, 5)
    .forEach(function(request) {
      items.push({
        type: 'new',
        text: 'طلب جديد: ' + getRequestDisplayName(request) + ' — ' + request.customer_name,
        time: HELPERS.timeAgo(request.created_at)
      });
    });

  (MOCK_DATA.service_requests || [])
    .filter(function(request) {
      return request.status === 'late' || request.priority === 'urgent' || request.priority === 'high';
    })
    .slice(0, 5)
    .forEach(function(request) {
      items.push({
        type: 'late',
        text: 'طلب يحتاج اهتمام: ' + request.customer_name,
        time: HELPERS.timeAgo(request.updated_at || request.created_at)
      });
    });

  (APP.supportTickets || [])
    .filter(function(ticket) {
      return ticket.status === 'new' || ticket.status === 'open';
    })
    .slice(0, 5)
    .forEach(function(ticket) {
      items.push({
        type: 'supp',
        text: 'رسالة دعم فني جديدة من ' + (ticket.name || ticket.customer_name || 'عميل'),
        time: HELPERS.timeAgo(ticket.created_at)
      });
    });

  const countEl = document.querySelector('.notif-header .count');

  if (countEl) {
    countEl.textContent = items.length + ' جديدة';
  }

  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  if (!items.length) {
    notifList.innerHTML =
      '<div style="padding:18px;text-align:center;color:var(--tm);font-size:13px;">لا توجد إشعارات جديدة</div>';
    return;
  }

  const icons = {
    new: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    late: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    supp: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>'
  };

  notifList.innerHTML = items.map(function(item) {
    return `
      <div class="notif-item">
        <div class="notif-icon n-${item.type}">
          ${icons[item.type] || icons.new}
        </div>
        <div>
          <div class="notif-text">${item.text}</div>
          <div class="notif-time">${item.time}</div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================
// التحميل من Supabase
// =============================================================
async function loadSupabaseEmployees() {
  if (!window.sb) {
    console.warn('Supabase client غير موجود، سيتم استخدام الموظفين التجريبيين');
    return;
  }

  try {
    const { data, error } = await window.sb
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase employees load error:', error);
      showToast('تعذر تحميل الموظفين الحقيقيين', 'warn');
      return;
    }

    MOCK_DATA.employees = (data || []).map(function(employee) {
      return {
        id: employee.id,
        full_name: employee.full_name || employee.name || '',
        name: employee.full_name || employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        password: '',
        role: employee.role || 'employee',
        status: employee.status || 'active',
        created_at: employee.created_at,
        last_login_at: employee.last_login_at
      };
    });

  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء تحميل الموظفين', 'error');
  }
}

function normalizeServiceType(value) {
  const v = String(value || '').trim();

  const map = {
    'استشارة قانونية': 'consultation',
    'استشارة قانونية هاتفية': 'consultation',
    'طلب دراسة قضية والتوكيل فيها': 'case_study',
    'دراسة قضية والتوكيل': 'case_study',
    'مراجعة عقد': 'contract_review',
    'صياغة عقد': 'contract_draft',
    'خدمات ناجز': 'najiz',
    'خدمات منصة ناجز': 'najiz',
    'إعداد مذكرة قانونية': 'memo',
    'صياغة خطاب رسمي': 'official_letter',
    'الاعتراض على مخالفة حكومية': 'gov_violation',
    'اعتراض على مخالفة حكومية': 'gov_violation',
    'تجهيز صحيفة دعوى': 'lawsuit_draft',
    'رفع دعوى': 'lawsuit_draft',
    'حضور جلسة قضائية نيابة عن العميل': 'court_session',
    'حضور جلسة قضائية': 'court_session',
    'تقديم طلب تنفيذ عبر ناجز': 'execution_request',
    'طلب تنفيذ عبر ناجز': 'execution_request',
    'المساعد القانوني AI': 'ai_assistant',
    'التوكيل في القضايا': 'case_representation',
    'case_representation': 'case_representation'
  };

  return map[v] || v;
}

async function loadSupabaseRequests() {
  if (!window.sb) {
    console.warn('Supabase client غير موجود، سيتم استخدام البيانات التجريبية');
    return;
  }

  try {
    let query = window.sb
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (APP.currentUser && APP.currentUser.role !== 'admin') {
      query = query.eq('assigned_to', APP.currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase requests load error:', error);
      showToast('تعذر تحميل الطلبات الحقيقية، تم عرض البيانات التجريبية', 'warn');
      return;
    }

    MOCK_DATA.service_requests = (data || []).map(function(request) {
      const rawType = request.service_type || '';
      const rawSource = request.source || 'direct_services';

      return {
        id: request.id,
        customer_name: request.customer_name || '',
        customer_phone: request.customer_phone || '',
        raw_service_type: rawType,
        service_type: normalizeServiceType(rawType || request.service_name || ''),
        service_category: request.service_category || '',
        service_name: request.service_name || rawType || '',
        price: Number(request.price || 0),
        payment_status: request.payment_status || 'manual_pending',
        source: rawSource,
        details: request.details || '',
        attachments: Array.isArray(request.attachments) ? request.attachments : [],
        status: request.status || 'new',
        priority: request.priority || 'normal',
        assigned_to: request.assigned_to,
        assigned_by: request.assigned_by,
        assigned_at: request.assigned_at,
        closed_at: request.closed_at,
        closed_by: request.closed_by,
        closing_note: request.closing_note || '',
        notes: Array.isArray(request.notes) ? request.notes : [],
        created_at: request.created_at,
        updated_at: request.updated_at || request.created_at
      };
    });

  } catch (error) {
    console.error(error);
    showToast('حدث خطأ أثناء تحميل الطلبات', 'error');
  }
}

async function loadSupabaseActivity() {
  if (!window.sb) {
    return;
  }

  try {
    const { data, error } = await window.sb
      .from('request_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      console.warn('Activity load error:', error);
      return;
    }

    APP.activityLog = data || [];

  } catch (error) {
    console.warn('Activity load exception:', error);
  }
}

async function loadDeleteRequests() {
  if (!window.sb) {
    APP.deleteRequests = [];
    return;
  }

  try {
    const { data, error } = await window.sb
      .from('request_delete_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Delete requests load error:', error);
      APP.deleteRequests = [];
      return;
    }

    APP.deleteRequests = data || [];

  } catch (error) {
    console.warn('Delete requests exception:', error);
    APP.deleteRequests = [];
  }
}

async function loadSupabaseSupportTickets() {
  if (!window.sb) {
    return;
  }

  try {
    const { data, error } = await window.sb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Support tickets load error:', error);
      return;
    }

    APP.supportTickets = (data || []).map(function(ticket) {
      return {
        id: ticket.id,
        name: ticket.name || ticket.customer_name || '',
        phone: ticket.phone || ticket.customer_phone || '',
        email: ticket.email || '',
        problem: ticket.problem || ticket.message || ticket.details || '',
        status: ticket.status || 'new',
        created_at: ticket.created_at,
        updated_at: ticket.updated_at || ticket.created_at
      };
    });

  } catch (error) {
    console.warn('Support tickets exception:', error);
  }
}

async function addActivityLog(payload) {
  const activity = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    request_id: payload.request_id || null,
    action: payload.action || 'status_change',
    title: payload.title || '',
    description: payload.description || '',
    created_by: payload.created_by || (APP.currentUser && APP.currentUser.id) || null,
    created_by_name:
      payload.created_by_name ||
      (APP.currentUser && (APP.currentUser.full_name || APP.currentUser.name)) ||
      'مستخدم',
    created_at: new Date().toISOString()
  };

  APP.activityLog.unshift(activity);

  if (window.sb) {
    try {
      const { error } = await window.sb
        .from('request_activity_log')
        .insert(activity);

      if (error) {
        console.warn('Activity insert error:', error);
      }
    } catch (error) {
      console.warn('Activity insert exception:', error);
    }
  }
}

// =============================================================
// الدعم الفني
// =============================================================
function renderSupportPage() {
  const page = document.getElementById('page-support');

  if (!page) return;

  const body = APP.supportTickets || [];

  const content = page.querySelector('.empty-state');

  if (!body.length) {
    if (content) {
      content.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7"/></svg>
        <h3>لا توجد تذاكر دعم حالياً</h3>
        <p>ستظهر هنا الرسائل القادمة من نموذج الدعم الفني</p>
      `;
    }
    return;
  }

  if (content) {
    content.outerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>العميل</th>
              <th>رقم الجوال</th>
              <th>الرسالة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody id="supportTableBody"></tbody>
        </table>
      </div>
    `;
  }

  const tableBody = document.getElementById('supportTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = body.map(function(ticket) {
    return `
      <tr>
        <td>${ticket.name || '—'}</td>
        <td>${ticket.phone || '—'}</td>
        <td style="max-width:330px;white-space:normal;line-height:1.7;">${ticket.problem || '—'}</td>
        <td><span class="badge s-${ticket.status === 'new' ? 'new' : 'assigned'}">${ticket.status === 'new' ? 'جديد' : ticket.status}</span></td>
        <td class="cell-date">${HELPERS.formatDate(ticket.created_at)}<small>${HELPERS.formatTime(ticket.created_at)}</small></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openConvertSupportModal('${ticket.id}')">
            تحويل إلى طلب
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openConvertSupportModal(ticketId) {
  const ticket = (APP.supportTickets || []).find(function(item) {
    return item.id === ticketId;
  });

  if (!ticket) {
    showToast('تعذر العثور على رسالة الدعم', 'error');
    return;
  }

  APP.selectedSupportTicketId = ticketId;

  document.getElementById('convertSupportCustomerName').textContent = ticket.name || '—';
  document.getElementById('convertSupportCustomerPhone').textContent = ticket.phone || '—';
  document.getElementById('convertSupportProblem').textContent = ticket.problem || '—';

  const serviceSelect = document.getElementById('convertSupportService');

  if (serviceSelect) {
    serviceSelect.innerHTML = `
      <option value="">اختر الخدمة المناسبة</option>
      ${MOCK_DATA.services.map(function(service) {
        return `<option value="${service.key}" data-price="${service.price}">${service.name}</option>`;
      }).join('')}
      <option value="case_representation" data-price="0">التوكيل في القضايا</option>
      <option value="custom_service" data-price="0">خدمة غير مدرجة</option>
    `;

    serviceSelect.onchange = function() {
      const selected = serviceSelect.options[serviceSelect.selectedIndex];
      const price = selected ? selected.getAttribute('data-price') : '';
      document.getElementById('convertSupportPrice').value = price || '';
    };
  }

  document.getElementById('convertSupportPrice').value = '';
  document.getElementById('convertSupportPaymentStatus').value = 'pending';

  openModal('convertSupportModal');
}

async function confirmConvertSupportTicket() {
  const ticket = (APP.supportTickets || []).find(function(item) {
    return item.id === APP.selectedSupportTicketId;
  });

  if (!ticket) {
    showToast('تعذر العثور على رسالة الدعم', 'error');
    return;
  }

  const serviceValue = document.getElementById('convertSupportService').value;
  const price = Number(document.getElementById('convertSupportPrice').value || 0);
  const paymentStatus = document.getElementById('convertSupportPaymentStatus').value;

  if (!serviceValue) {
    showToast('اختر تصنيف الخدمة أولًا', 'warn');
    return;
  }

  const selectedService = MOCK_DATA.services.find(function(service) {
    return service.key === serviceValue;
  });

  const serviceName =
    serviceValue === 'case_representation'
      ? 'طلب توكيل في قضية'
      : serviceValue === 'custom_service'
        ? 'خدمة غير مدرجة'
        : selectedService
          ? selectedService.name
          : serviceValue;

  try {
    if (window.sb) {
      const { error } = await window.sb.rpc('convert_support_ticket_to_request', {
        p_ticket_id: ticket.id,
        p_service_type: serviceValue === 'case_representation' ? 'التوكيل في القضايا' : serviceValue,
        p_service_name: serviceName,
        p_price: price,
        p_payment_status: paymentStatus,
        p_converted_by: APP.currentUser.id,
        p_converted_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
      });

      if (error) {
        throw error;
      }

      await loadSupabaseRequests();
      await loadSupabaseSupportTickets();

    } else {
      MOCK_DATA.service_requests.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        customer_name: ticket.name,
        customer_phone: ticket.phone,
        service_type: serviceValue,
        service_name: serviceName,
        price,
        payment_status: paymentStatus,
        source: serviceValue === 'case_representation' ? 'cases' : 'direct_services',
        details: ticket.problem,
        attachments: [],
        status: 'new',
        priority: 'normal',
        notes: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    await addActivityLog({
      action: 'support_convert',
      title: 'تحويل رسالة دعم',
      description: `تم تحويل رسالة دعم من ${ticket.name} إلى طلب`,
      created_by: APP.currentUser.id,
      created_by_name: APP.currentUser.full_name || APP.currentUser.name || 'مستخدم'
    });

    closeModal('convertSupportModal');
    renderSupportPage();
    renderDashboard();
    renderActiveRequestsPage();
    updateSidebarCounts();

    showToast('تم تحويل رسالة الدعم إلى طلب بنجاح', 'success');

  } catch (error) {
    console.error('Convert support error:', error);
    showToast('تعذر تحويل رسالة الدعم إلى طلب', 'error');
  }
}
// =============================================================
// تصفير الطلبات
// =============================================================
async function openResetRequestsModal() {
  const statusBox = document.getElementById('resetRequestsStatus');
  const actionsBox = document.getElementById('resetRequestsActions');

  if (!statusBox || !actionsBox) {
    return;
  }

  statusBox.innerHTML = `
    <div style="background:var(--bg);border:var(--border);border-radius:12px;padding:14px;font-size:13px;color:var(--t2);line-height:1.8;">
      تصفير الطلبات إجراء حساس، ويُفضّل تنفيذه فقط عند بداية مرحلة تشغيل جديدة وبعد التأكد من حفظ البيانات المطلوبة.
    </div>
  `;

  actionsBox.innerHTML = `
    <button class="btn" onclick="closeModal('resetRequestsModal')">إغلاق</button>
    <button class="btn btn-danger" onclick="requestResetRequests()">
      طلب تصفير الطلبات
    </button>
  `;

  openModal('resetRequestsModal');
}

async function requestResetRequests() {
  const confirmed = window.confirm(
    'هل تريد إرسال طلب تصفير الطلبات؟\n\nلن يتم التصفير إلا بعد اعتماد مدير آخر.'
  );

  if (!confirmed) {
    return;
  }

  try {
    if (window.sb) {
      const { error } = await window.sb
        .from('ops_reset_requests')
        .insert({
          requested_by: APP.currentUser.id,
          requested_by_name:
            APP.currentUser.full_name ||
            APP.currentUser.name ||
            'مستخدم',
          status: 'pending'
        });

      if (error) {
        throw error;
      }
    }

    await addActivityLog({
      action: 'reset_request',
      title: 'طلب تصفير الطلبات',
      description: 'تم إنشاء طلب تصفير للطلبات بانتظار الاعتماد',
      created_by: APP.currentUser.id,
      created_by_name:
        APP.currentUser.full_name ||
        APP.currentUser.name ||
        'مستخدم'
    });

    closeModal('resetRequestsModal');
    showToast('تم إرسال طلب التصفير', 'success');

  } catch (error) {
    console.error('Reset request error:', error);
    showToast('تعذر إرسال طلب التصفير', 'error');
  }
}

// =============================================================
// تحديث العدادات الجانبية
// =============================================================
function updateSidebarCounts() {
  const directCount = getRequestsByKind('direct').filter(function(request) {
    return !['done', 'closed', 'cancelled'].includes(request.status);
  }).length;

  const caseCount = getRequestsByKind('cases').filter(function(request) {
    return !['done', 'closed', 'cancelled'].includes(request.status);
  }).length;

  const directBadge = document.getElementById('directRequestsBadge');
  const caseBadge = document.getElementById('caseRequestsBadge');

  if (directBadge) {
    directBadge.textContent = directCount;
  }

  if (caseBadge) {
    caseBadge.textContent = caseCount;
  }
}

// =============================================================
// إظهار وإخفاء المودالات
// =============================================================
function openModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add('open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove('open');
  }
}

// =============================================================
// صلاحيات الواجهة حسب الدور
// =============================================================
function applyRoleVisibility() {
  const isAdmin = APP.currentUser && APP.currentUser.role === 'admin';

  document.querySelectorAll('[data-admin-only]').forEach(function(element) {
    element.style.display = isAdmin ? '' : 'none';
  });
}

// =============================================================
// ربط الفلاتر
// =============================================================
function bindRequestFilters(kind) {
  const config = getRequestPageConfig(kind);

  const searchInput = document.getElementById(config.searchId);
  const serviceSelect = document.getElementById(config.serviceId);
  const statusSelect = document.getElementById(config.statusId);
  const employeeSelect = document.getElementById(config.employeeId);
  const paymentSelect = document.getElementById(config.paymentId);
  const prioritySelect = document.getElementById(config.priorityId);

  if (searchInput) {
    searchInput.addEventListener('input', function(event) {
      config.filters.search = event.target.value.trim();
      renderRequestsTable(kind);
    });
  }

  if (serviceSelect) {
    serviceSelect.addEventListener('change', function(event) {
      config.filters.service = event.target.value;
      renderRequestsTable(kind);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', function(event) {
      config.filters.status = event.target.value;
      renderRequestsTable(kind);
    });
  }

  if (employeeSelect) {
    employeeSelect.addEventListener('change', function(event) {
      config.filters.employee = event.target.value;
      renderRequestsTable(kind);
    });
  }

  if (paymentSelect) {
    paymentSelect.addEventListener('change', function(event) {
      config.filters.payment = event.target.value;
      renderRequestsTable(kind);
    });
  }

  if (prioritySelect) {
    prioritySelect.addEventListener('change', function(event) {
      config.filters.priority = event.target.value;
      renderRequestsTable(kind);
    });
  }
}

function bindTopbarSearch() {
  const input = document.getElementById('topbarSearch');

  if (!input) {
    return;
  }

  input.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter') {
      return;
    }

    const value = input.value.trim();

    if (!value) {
      return;
    }

    if (APP.currentPage === 'cases') {
      APP.caseFilters.search = value;

      const caseSearch = document.getElementById('caseSearchInput');
      if (caseSearch) {
        caseSearch.value = value;
      }

      renderRequestsTable('cases');
      return;
    }

    APP.filters.search = value;

    const directSearch = document.getElementById('searchInput');
    if (directSearch) {
      directSearch.value = value;
    }

    navigateTo('requests');
    renderRequestsTable('direct');
  });
}

function bindNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(function(button) {
    button.addEventListener('click', function() {
      navigateTo(button.dataset.page);
    });
  });
}

function bindGlobalClicks() {
  document.addEventListener('click', function(event) {
    const notifPanel = document.getElementById('notifPanel');
    const notifBtn = document.getElementById('notifBtn');

    if (
      notifPanel &&
      notifBtn &&
      notifPanel.classList.contains('open') &&
      !notifPanel.contains(event.target) &&
      !notifBtn.contains(event.target)
    ) {
      notifPanel.classList.remove('open');
    }
  });
}

// =============================================================
// تجهيز بيانات المستخدم في الواجهة
// =============================================================
function renderCurrentUser() {
  if (!APP.currentUser) {
    return;
  }

  const name =
    APP.currentUser.full_name ||
    APP.currentUser.name ||
    'مستخدم';

  const role = APP.currentUser.role === 'admin'
    ? 'مدير'
    : 'موظف';

  const initials = HELPERS.initials(name);

  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarRole = document.getElementById('sidebarUserRole');
  const sidebarAvatar = document.getElementById('sidebarUserAvatar');
  const topbarName = document.getElementById('topbarUserName');
  const topbarAvatar = document.getElementById('topbarUserAvatar');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarRole) sidebarRole.textContent = role;
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (topbarName) topbarName.textContent = name;
  if (topbarAvatar) topbarAvatar.textContent = initials;
}

// =============================================================
// تحسينات مساعدة للبيانات
// =============================================================
function ensureRequestDefaults() {
  MOCK_DATA.service_requests = (MOCK_DATA.service_requests || []).map(function(request) {
    return {
      ...request,
      service_name: request.service_name || request.service_type || '',
      price: Number(request.price || 0),
      payment_status: request.payment_status || 'manual_pending',
      source: request.source || 'direct_services',
      status: request.status || 'new',
      priority: request.priority || 'normal',
      notes: Array.isArray(request.notes) ? request.notes : [],
      attachments: Array.isArray(request.attachments) ? request.attachments : [],
      created_at: request.created_at || new Date().toISOString(),
      updated_at: request.updated_at || request.created_at || new Date().toISOString()
    };
  });
}

// =============================================================
// شاشة التحميل
// =============================================================
function hideAppLoader() {
  const loader = document.getElementById('appLoader');

  if (!loader) {
    return;
  }

  setTimeout(function() {
    loader.classList.add('hide');

    setTimeout(function() {
      loader.style.display = 'none';
    }, 350);
  }, 350);
}

// =============================================================
// التشغيل الأولي
// =============================================================
async function initApp() {
  if (!checkSession()) {
    return;
  }

  renderCurrentUser();
  applyRoleVisibility();

  bindNavigation();
  bindRequestFilters('direct');
  bindRequestFilters('cases');
  bindTopbarSearch();
  bindGlobalClicks();

  try {
    if (typeof loadSupabaseEmployees === 'function') {
      await loadSupabaseEmployees();
    }

    if (typeof loadSupabaseRequests === 'function') {
      await loadSupabaseRequests();
    }

    if (typeof loadSupabaseActivity === 'function') {
      await loadSupabaseActivity();
    }

    if (typeof loadDeleteRequests === 'function') {
      await loadDeleteRequests();
    }

    if (typeof loadSupabaseSupportTickets === 'function') {
      await loadSupabaseSupportTickets();
    }

  } catch (error) {
    console.error('Initial load error:', error);
    showToast('حدث خطأ أثناء تحميل البيانات', 'warn');
  }

  ensureRequestDefaults();

  updateSidebarCounts();
  renderNotifications();
  renderDashboard();
  renderRequestsPage();
  renderCaseRequestsPage();

  if (APP.currentUser && APP.currentUser.role === 'admin') {
    renderEmployeesPage();
  }

  renderActivityPage();
  renderSupportPage();

  hideAppLoader();
}

// =============================================================
// تشغيل التطبيق بعد تحميل الصفحة
// =============================================================
document.addEventListener('DOMContentLoaded', initApp);

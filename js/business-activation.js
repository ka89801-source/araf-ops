/* =============================================================
   أعراف لإدارة الطلبات | طلبات تفعيل المنشآت
   ============================================================= */

(function () {
  'use strict';

  const previousRender = window.renderBusinessPage;
  const API_BASE = window.ARAF_OPS_API_BASE || 'https://araf.company/api';
  const state = {
    requests: [],
    canDecide: false,
    filter: 'pending',
    tab: 'activation',
    loading: false,
    error: ''
  };

  const PLAN_LABELS = {
    asas: 'أعراف أساس',
    numu: 'أعراف نمو',
    plus: 'أعراف بلس',
    undecided: 'لم يحدد الباقة'
  };
  const STATUS_LABELS = {
    new: 'جديد',
    contacted: 'تم التواصل',
    activated: 'مفعّل',
    closed: 'مرفوض / مغلق'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function pendingCount() {
    return state.requests.filter(function (request) {
      return request.status === 'new' || request.status === 'contacted';
    }).length;
  }

  async function accessToken() {
    if (!window.opsAuth || !window.opsAuth.auth) throw new Error('Supabase غير متصل.');
    const result = await window.opsAuth.auth.getSession();
    const session = result.data && result.data.session;
    if (!session) {
      const error = new Error('انتهت جلسة الإدارة. يرجى تسجيل الدخول مجددًا.');
      error.status = 401;
      throw error;
    }
    return session.access_token;
  }

  async function api(path, options) {
    const token = await accessToken();
    const config = Object.assign({}, options || {});
    config.headers = Object.assign({}, config.headers || {}, {
      Authorization: 'Bearer ' + token
    });
    if (config.body && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(API_BASE + path, config);
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const error = new Error(data.error || 'تعذر تنفيذ الإجراء.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function loadRequests() {
    state.loading = true;
    state.error = '';
    try {
      const data = await api('/ops-business-activation-requests', { method: 'GET' });
      state.requests = Array.isArray(data.requests) ? data.requests : [];
      state.canDecide = Boolean(data.can_decide);
    } catch (error) {
      console.error('activation-requests-load', error);
      state.requests = [];
      state.error = error.message;
      if (error.status === 401) {
        localStorage.removeItem('araf_session');
      }
    } finally {
      state.loading = false;
    }
  }

  function filteredRequests() {
    if (state.filter === 'all') return state.requests;
    if (state.filter === 'pending') {
      return state.requests.filter(function (request) {
        return request.status === 'new' || request.status === 'contacted';
      });
    }
    return state.requests.filter(function (request) {
      return request.status === state.filter;
    });
  }

  function actionButtons(request) {
    if (!state.canDecide || request.status === 'activated' || request.status === 'closed') {
      return '';
    }

    const contacted = request.status === 'new'
      ? '<button class="ops-activation-btn secondary" data-action="contacted" data-id="' +
        escapeHtml(request.id) + '">تم التواصل</button>'
      : '';
    const activate = request.request_kind === 'activation'
      ? '<button class="ops-activation-btn primary" data-action="activate" data-id="' +
        escapeHtml(request.id) + '">تفعيل المنشأة</button>'
      : '';
    const close = '<button class="ops-activation-btn danger" data-action="closed" data-id="' +
      escapeHtml(request.id) + '">رفض / إغلاق</button>';

    return '<div class="ops-activation-actions">' + contacted + activate + close + '</div>';
  }

  function requestRow(request) {
    const kind = request.request_kind === 'upgrade' ? 'ترقية باقة' : 'تفعيل منشأة';
    const code = request.entity_code
      ? '<div class="ops-activation-code">' + escapeHtml(request.entity_code) + '</div>'
      : '';
    return [
      '<tr>',
      '<td><strong>', escapeHtml(request.entity_name || '—'), '</strong>',
      '<small>', escapeHtml(request.entity_type || 'غير محدد'), '</small>', code, '</td>',
      '<td><strong>', escapeHtml(request.contact_name || '—'), '</strong>',
      '<small dir="ltr">', escapeHtml(request.contact_phone || '—'), '</small></td>',
      '<td><span class="ops-kind-badge">', kind, '</span><small>',
      escapeHtml(PLAN_LABELS[request.requested_plan] || request.requested_plan || '—'),
      '</small></td>',
      '<td><span class="ops-status-badge status-', escapeHtml(request.status),
      '">', escapeHtml(STATUS_LABELS[request.status] || request.status), '</span></td>',
      '<td>', escapeHtml(formatDate(request.created_at)), '</td>',
      '<td>', actionButtons(request), '</td>',
      '</tr>'
    ].join('');
  }

  function activationContent() {
    if (state.loading) {
      return '<div class="ops-activation-empty">جارٍ تحميل طلبات التفعيل...</div>';
    }
    if (state.error) {
      return '<div class="ops-activation-error"><strong>تعذر تحميل طلبات التفعيل</strong><span>' +
        escapeHtml(state.error) + '</span><button data-action="refresh">إعادة المحاولة</button></div>';
    }

    const rows = filteredRequests();
    if (!rows.length) {
      return '<div class="ops-activation-empty">لا توجد طلبات ضمن هذا التصنيف.</div>';
    }

    return [
      '<div class="ops-activation-table-wrap"><table class="ops-activation-table">',
      '<thead><tr><th>المنشأة</th><th>المسؤول</th><th>نوع الطلب والباقة</th>',
      '<th>الحالة</th><th>تاريخ الطلب</th><th>الإجراء</th></tr></thead>',
      '<tbody>', rows.map(requestRow).join(''), '</tbody></table></div>'
    ].join('');
  }

  function shellHtml() {
    return [
      '<div class="ops-business-switcher">',
      '<button class="ops-business-tab', state.tab === 'activation' ? ' active' : '',
      '" data-tab="activation">طلبات التفعيل <span>', pendingCount(), '</span></button>',
      '<button class="ops-business-tab', state.tab === 'services' ? ' active' : '',
      '" data-tab="services">طلبات الخدمات</button>',
      '</div>',
      '<section class="ops-activation-panel" id="opsActivationPanel"',
      state.tab === 'activation' ? '' : ' hidden', '>',
      '<div class="ops-activation-heading"><div><h2>طلبات تفعيل المنشآت</h2>',
      '<p>مراجعة طلبات الانضمام وتفعيل حساب المنشأة مباشرة.</p></div>',
      '<div class="ops-activation-tools">',
      '<select id="opsActivationFilter" aria-label="تصفية طلبات التفعيل">',
      '<option value="pending"', state.filter === 'pending' ? ' selected' : '', '>بانتظار القرار</option>',
      '<option value="all"', state.filter === 'all' ? ' selected' : '', '>كل الطلبات</option>',
      '<option value="new"', state.filter === 'new' ? ' selected' : '', '>جديد</option>',
      '<option value="contacted"', state.filter === 'contacted' ? ' selected' : '', '>تم التواصل</option>',
      '<option value="activated"', state.filter === 'activated' ? ' selected' : '', '>مفعّل</option>',
      '<option value="closed"', state.filter === 'closed' ? ' selected' : '', '>مرفوض / مغلق</option>',
      '</select><button class="ops-refresh-btn" data-action="refresh">تحديث</button>',
      '</div></div><div id="opsActivationContent">', activationContent(), '</div></section>',
      '<div class="ops-activation-modal" id="opsActivationModal" hidden></div>'
    ].join('');
  }

  function updateSidebarCount() {
    const badge = document.getElementById('businessRequestsBadge');
    if (!badge) return;
    const serviceCount = window.ArafBusiness && window.ArafBusiness.data
      ? (window.ArafBusiness.data.requests || []).filter(function (request) {
          return !['completed', 'cancelled'].includes(request.status);
        }).length
      : 0;
    badge.textContent = String(serviceCount + pendingCount());
  }

  function mount() {
    const page = document.getElementById('page-business');
    if (!page) return;

    const previousShell = page.querySelector(':scope > #opsBusinessActivationShell');
    if (previousShell) previousShell.remove();
    const serviceNodes = Array.from(page.children).map(function (node) {
      return { node: node, wasHidden: node.hidden };
    });

    const shell = document.createElement('div');
    shell.id = 'opsBusinessActivationShell';
    shell.innerHTML = shellHtml();
    page.prepend(shell);
    setServiceVisibility(serviceNodes, state.tab === 'services');
    bindEvents(shell, serviceNodes);
    updateSidebarCount();
  }

  function rerenderActivationContent() {
    const content = document.getElementById('opsActivationContent');
    if (content) content.innerHTML = activationContent();
    updateSidebarCount();
  }

  function findRequest(id) {
    return state.requests.find(function (request) {
      return request.id === id;
    });
  }

  async function updateRequest(id, action) {
    let note = '';
    if (action === 'closed') {
      const value = window.prompt('اكتب سبب الرفض أو الإغلاق (اختياري):', '');
      if (value === null) return;
      note = value.trim();
      if (!window.confirm('هل تريد إغلاق طلب التفعيل؟')) return;
    }

    try {
      const data = await api('/ops-update-activation-request', {
        method: 'POST',
        body: JSON.stringify({ id, action, note })
      });
      const index = state.requests.findIndex(function (request) {
        return request.id === id;
      });
      if (index >= 0 && data.request) state.requests[index] = data.request;
      rerenderActivationContent();
      if (typeof window.showToast === 'function') {
        window.showToast(action === 'contacted' ? 'تم تسجيل التواصل مع المنشأة' : 'تم إغلاق الطلب', 'success');
      }
    } catch (error) {
      console.error('activation-request-update', error);
      if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
    }
  }

  function openActivationModal(request) {
    const modal = document.getElementById('opsActivationModal');
    if (!modal || !request) return;
    const suggestedPlan = ['asas', 'numu', 'plus'].includes(request.requested_plan)
      ? request.requested_plan
      : '';
    const today = new Date().toISOString().slice(0, 10);

    modal.innerHTML = [
      '<div class="ops-activation-dialog" role="dialog" aria-modal="true">',
      '<button class="ops-modal-close" data-action="close-modal" aria-label="إغلاق">×</button>',
      '<h3>تفعيل منشأة ', escapeHtml(request.entity_name), '</h3>',
      '<p>سيُنشأ حساب Supabase Auth ورمز منشأة تلقائيًا، ثم يرتبطان بالمنشأة.</p>',
      '<label>الباقة المعتمدة<select id="opsActivationPlan">',
      '<option value="">اختر الباقة</option>',
      '<option value="asas"', suggestedPlan === 'asas' ? ' selected' : '', '>أعراف أساس</option>',
      '<option value="numu"', suggestedPlan === 'numu' ? ' selected' : '', '>أعراف نمو</option>',
      '<option value="plus"', suggestedPlan === 'plus' ? ' selected' : '', '>أعراف بلس</option>',
      '</select></label>',
      '<label>بداية الاشتراك<input id="opsActivationStart" type="date" value="', today, '"></label>',
      '<div class="ops-activation-dialog-note">سيظهر رمز المنشأة والرقم السري مرة واحدة بعد نجاح التفعيل.</div>',
      '<div class="ops-dialog-actions"><button class="ops-activation-btn secondary" data-action="close-modal">إلغاء</button>',
      '<button class="ops-activation-btn primary" data-action="confirm-activate" data-id="',
      escapeHtml(request.id), '">تأكيد التفعيل</button></div></div>'
    ].join('');
    modal.hidden = false;
  }

  function showCredentials(data) {
    const modal = document.getElementById('opsActivationModal');
    if (!modal) return;
    const credentials = data.credentials || {};
    modal.innerHTML = [
      '<div class="ops-activation-dialog credentials" role="dialog" aria-modal="true">',
      '<button class="ops-modal-close" data-action="close-modal" aria-label="إغلاق">×</button>',
      '<div class="ops-success-mark">✓</div><h3>تم تفعيل المنشأة بنجاح</h3>',
      '<p>انسخ بيانات الدخول وسلّمها لمسؤول المنشأة. الرقم السري لا يُحفظ في منصة الإدارة.</p>',
      '<div class="ops-credential-row"><span>رمز المنشأة</span><strong id="opsEntityCode">',
      escapeHtml(credentials.code || '—'), '</strong>',
      '<button data-copy="', escapeHtml(credentials.code || ''), '">نسخ</button></div>',
      '<div class="ops-credential-row"><span>الرقم السري</span><strong id="opsEntityPin">',
      escapeHtml(credentials.pin || '—'), '</strong>',
      '<button data-copy="', escapeHtml(credentials.pin || ''), '">نسخ</button></div>',
      '<button class="ops-activation-btn primary full" data-action="close-modal">تم الحفظ</button>',
      '</div>'
    ].join('');
  }

  async function confirmActivation(id, button) {
    const plan = document.getElementById('opsActivationPlan');
    const start = document.getElementById('opsActivationStart');
    if (!plan || !plan.value) {
      if (typeof window.showToast === 'function') window.showToast('اختر الباقة أولًا', 'warn');
      return;
    }
    if (!window.confirm('هل أنت متأكد من تفعيل حساب هذه المنشأة؟')) return;

    button.disabled = true;
    button.textContent = 'جارٍ التفعيل...';
    try {
      const data = await api('/ops-activate-business', {
        method: 'POST',
        body: JSON.stringify({
          id,
          plan_key: plan.value,
          subscription_start: start && start.value
        })
      });
      showCredentials(data);
      await loadRequests();
      updateSidebarCount();
    } catch (error) {
      console.error('business-activation', error);
      button.disabled = false;
      button.textContent = 'تأكيد التفعيل';
      if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
    }
  }

  async function copyValue(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (typeof window.showToast === 'function') window.showToast('تم النسخ', 'success');
    } catch (_) {
      window.prompt('انسخ القيمة التالية:', value);
    }
  }

  function setServiceVisibility(serviceNodes, visible) {
    serviceNodes.forEach(function (entry) {
      entry.node.hidden = visible ? entry.wasHidden : true;
    });
  }

  function bindEvents(shell, serviceNodes) {
    shell.addEventListener('click', function (event) {
      const tab = event.target.closest('[data-tab]');
      if (tab) {
        state.tab = tab.dataset.tab;
        shell.querySelectorAll('[data-tab]').forEach(function (item) {
          item.classList.toggle('active', item.dataset.tab === state.tab);
        });
        const panel = document.getElementById('opsActivationPanel');
        if (panel) panel.hidden = state.tab !== 'activation';
        setServiceVisibility(serviceNodes, state.tab === 'services');
        return;
      }

      const copy = event.target.closest('[data-copy]');
      if (copy) {
        copyValue(copy.dataset.copy);
        return;
      }

      const actionElement = event.target.closest('[data-action]');
      if (!actionElement) return;
      const action = actionElement.dataset.action;
      const id = actionElement.dataset.id;

      if (action === 'refresh') {
        loadRequests().then(rerenderActivationContent);
      } else if (action === 'contacted' || action === 'closed') {
        updateRequest(id, action);
      } else if (action === 'activate') {
        openActivationModal(findRequest(id));
      } else if (action === 'close-modal') {
        const modal = document.getElementById('opsActivationModal');
        if (modal) {
          modal.hidden = true;
          modal.innerHTML = '';
        }
        rerenderActivationContent();
      } else if (action === 'confirm-activate') {
        confirmActivation(id, actionElement);
      }
    });

    const filter = shell.querySelector('#opsActivationFilter');
    if (filter) {
      filter.addEventListener('change', function () {
        state.filter = filter.value;
        rerenderActivationContent();
      });
    }
  }

  async function renderBusinessWithActivation() {
    const activationLoad = loadRequests();
    if (typeof previousRender === 'function') await previousRender();
    mount();
    activationLoad.then(rerenderActivationContent);
  }

  window.renderBusinessPage = renderBusinessWithActivation;
  if (window.ArafBusiness) {
    window.ArafBusiness.reloadActivations = async function () {
      await loadRequests();
      rerenderActivationContent();
    };
  }
})();

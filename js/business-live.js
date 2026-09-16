/* =============================================================
   أعراف لإدارة الطلبات
   الربط الحي لطلبات المنشآت عبر API الإدارة الآمن
   ============================================================= */

(function () {
  'use strict';

  if (!window.ArafBusiness) {
    console.error('ArafBusiness غير موجود');
    return;
  }

  const BIZ = window.ArafBusiness;
  const API_BASE = window.ARAF_OPS_API_BASE || 'https://araf.company/api';
  const CACHE_KEY = 'araf-business-snapshot-v3';
  const CACHE_TTL = 30000;
  const REQUEST_TIMEOUT = 12000;

  let loadPromise = null;
  let hasLiveData = false;
  let lastLoadedAt = 0;

  const LIVE_SERVICES = {
    consult: { key: 'consult', name: 'استشارة قانونية' },
    contracts: { key: 'contracts', name: 'صياغة أو مراجعة عقد' },
    letters: { key: 'letters', name: 'صياغة أو مراجعة خطاب أو إنذار' },
    najiz: { key: 'najiz', name: 'رفع طلب عبر ناجز' },
    violations: { key: 'violations', name: 'اعتراض على مخالفة حكومية' },
    governance: { key: 'governance', name: 'إعداد أو مراجعة عمل حوكمة' },
    memos: { key: 'memos', name: 'إعداد مذكرة قانونية' },
    risk_review: { key: 'risk_review', name: 'مراجعة قانونية شهرية' },
    negotiation: { key: 'negotiation', name: 'حضور اجتماع تفاوضي عن بُعد' },
    general: { key: 'general', name: 'طلب قانوني آخر' }
  };

  const LIVE_PLANS = {
    asas: {
      key: 'asas', name: 'أعراف أساس', price: 500,
      quota: {
        consult: 3, contracts: 2, letters: 2, najiz: 2, violations: 1,
        governance: 0, memos: 0, risk_review: 0, negotiation: 0, general: 0
      }
    },
    numu: {
      key: 'numu', name: 'أعراف نمو', price: 2500,
      quota: {
        consult: 10, contracts: 5, letters: 5, najiz: 5, violations: 3,
        governance: 3, memos: 0, risk_review: 0, negotiation: 0, general: 0
      }
    },
    plus: {
      key: 'plus', name: 'أعراف بلس', price: 5000,
      quota: {
        consult: -1, contracts: 10, letters: 10, najiz: 10, violations: 6,
        governance: 6, memos: 3, risk_review: 1, negotiation: 1, general: 0
      }
    }
  };

  Object.keys(BIZ.services).forEach(function (key) { delete BIZ.services[key]; });
  Object.assign(BIZ.services, LIVE_SERVICES);
  Object.keys(BIZ.plans).forEach(function (key) { delete BIZ.plans[key]; });
  Object.assign(BIZ.plans, LIVE_PLANS);

  function simpleDate(value) {
    return value ? String(value).slice(0, 10) : '';
  }

  function buildUsageMap(entities, usageRows) {
    const result = {};
    const entityMap = new Map();

    entities.forEach(function (entity) {
      const id = String(entity.id || '');
      if (!id) return;
      entityMap.set(id, entity);
      result[id] = {};
    });

    usageRows.forEach(function (row) {
      const entityId = String(row.entity_id || '');
      const entity = entityMap.get(entityId);
      if (!entity || row.reversed_at) return;

      const entityStart = simpleDate(entity.current_cycle_start);
      const entityEnd = simpleDate(entity.current_cycle_end);
      const usageStart = simpleDate(row.cycle_start);
      const usageEnd = simpleDate(row.cycle_end);
      if (entityStart && usageStart && entityStart !== usageStart) return;
      if (entityEnd && usageEnd && entityEnd !== usageEnd) return;

      const serviceKey = String(row.service_key || '');
      if (!serviceKey) return;
      result[entityId][serviceKey] =
        Number(result[entityId][serviceKey] || 0) + Number(row.units || 0);
    });

    return result;
  }

  function applySnapshot(snapshot, loadedAt) {
    const entities = Array.isArray(snapshot && snapshot.entities) ? snapshot.entities : [];
    const requests = Array.isArray(snapshot && snapshot.requests) ? snapshot.requests : [];
    const usageRows = Array.isArray(snapshot && snapshot.usage) ? snapshot.usage : [];
    const history = Array.isArray(snapshot && snapshot.history) ? snapshot.history : [];
    const employees = Array.isArray(snapshot && snapshot.employees) ? snapshot.employees : [];
    const usageMap = buildUsageMap(entities, usageRows);

    BIZ.data.entities = entities.map(function (entity) {
      return Object.assign({}, entity, {
        plan_key: entity.plan_key || 'asas',
        subscription_status: entity.subscription_status || 'active',
        manager_name: entity.manager_name || 'لم يُعيّن بعد',
        manager_title: entity.manager_title || 'مدير حساب قانوني',
        manager_phone: entity.manager_phone || '',
        manager_hours: entity.manager_hours || '',
        usage: usageMap[String(entity.id)] || {}
      });
    });

    BIZ.data.requests = requests.map(function (request) {
      return Object.assign({}, request, {
        service_key: request.service_key || 'general',
        subject: request.subject || request.service_name_snapshot || 'طلب قانوني',
        details: request.details || '',
        status: request.status || 'new',
        priority: request.priority || 'normal',
        assigned_to: request.assigned_to || null,
        quota_type: request.quota_type || 'included',
        quota_units: Number(request.quota_units || 1),
        quota_counted: Boolean(request.quota_counted),
        billing_status: request.billing_status || 'included',
        client_visible_note: request.client_visible_note || '',
        internal_note: request.internal_note || '',
        updated_at: request.updated_at || request.created_at
      });
    });

    BIZ.data.history = history;

    if (Array.isArray(BIZ.employees)) {
      BIZ.employees.splice(
        0,
        BIZ.employees.length,
        ...employees.map(function (employee) {
          return { id: employee.id, name: employee.full_name || '' };
        })
      );
    }

    hasLiveData = true;
    lastLoadedAt = Number(loadedAt) || Date.now();
  }

  function clearBusinessData() {
    BIZ.data.entities = [];
    BIZ.data.requests = [];
    BIZ.data.history = [];
    if (Array.isArray(BIZ.employees)) BIZ.employees.splice(0, BIZ.employees.length);
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const savedAt = Number(parsed && parsed.saved_at);
      if (!parsed || !parsed.snapshot || !savedAt) return null;
      if (Date.now() - savedAt > CACHE_TTL) return null;
      return { snapshot: parsed.snapshot, savedAt: savedAt };
    } catch (_) {
      return null;
    }
  }

  function saveCache(snapshot) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ saved_at: Date.now(), snapshot: snapshot })
      );
    } catch (_) {
      // التخزين المؤقت اختياري ولا يؤثر على التشغيل.
    }
  }

  async function getAccessToken() {
    if (!window.opsAuth || !window.opsAuth.auth) {
      const error = new Error('جلسة إدارة أعراف غير متاحة');
      error.status = 401;
      throw error;
    }

    const result = await window.opsAuth.auth.getSession();
    const session = result && result.data && result.data.session;
    if (!session || !session.access_token) {
      const error = new Error('انتهت جلسة الإدارة. سجّل الدخول مجددًا.');
      error.status = 401;
      throw error;
    }
    return session.access_token;
  }

  async function fetchWithTimeout(url, options) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT)
      : null;
    const config = Object.assign({}, options || {});
    if (controller) config.signal = controller.signal;

    try {
      return await fetch(url, config);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        const timeoutError = new Error('استغرق تحميل بيانات المنشآت وقتًا أطول من المتوقع. حاول التحديث مرة أخرى.');
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchSnapshot() {
    if (loadPromise) return loadPromise;

    loadPromise = (async function () {
      const token = await getAccessToken();
      const response = await fetchWithTimeout(API_BASE + '/ops-business-snapshot', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        },
        cache: 'no-store'
      });
      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        const error = new Error(payload.error || 'تعذر تحميل بيانات المنشآت');
        error.status = response.status;
        throw error;
      }
      saveCache(payload);
      return payload;
    })();

    try {
      return await loadPromise;
    } finally {
      loadPromise = null;
    }
  }

  function updateLiveInterface(state) {
    const liveBadge = document.querySelector('#page-business .biz-demo-badge');
    if (liveBadge) {
      liveBadge.textContent = state === 'loading' ? 'جاري التحديث...' : 'بيانات مباشرة';
      liveBadge.style.background = state === 'loading' ? '#fff5dc' : '#e8f7ef';
      liveBadge.style.color = state === 'loading' ? '#9b6d18' : '#24805a';
      liveBadge.style.borderColor = state === 'loading' ? '#ead8a7' : '#ccebdc';
    }

    const planFilter = document.getElementById('bizFilterPlan');
    if (planFilter) {
      const currentValue = planFilter.value || 'all';
      planFilter.innerHTML =
        '<option value="all">كل الباقات</option>' +
        '<option value="asas">أعراف أساس</option>' +
        '<option value="numu">أعراف نمو</option>' +
        '<option value="plus">أعراف بلس</option>';
      planFilter.value = ['all', 'asas', 'numu', 'plus'].includes(currentValue)
        ? currentValue
        : 'all';
    }

    const sidebarBadge = document.getElementById('businessRequestsBadge');
    if (sidebarBadge) {
      const activeCount = BIZ.data.requests.filter(function (request) {
        return !['completed', 'cancelled'].includes(request.status);
      }).length;
      sidebarBadge.textContent = String(activeCount);
    }
  }

  const originalRender = window.renderBusinessPage;

  function renderCurrentBusinessData(state) {
    if (typeof originalRender === 'function') originalRender();
    updateLiveInterface(state || 'ready');
  }

  async function renderLiveBusinessPage(force) {
    if (!hasLiveData) {
      const cached = readCache();
      if (cached) {
        applySnapshot(cached.snapshot, cached.savedAt);
      } else {
        clearBusinessData();
      }
    }

    renderCurrentBusinessData(hasLiveData && !force ? 'ready' : 'loading');

    if (!force && hasLiveData && Date.now() - lastLoadedAt < CACHE_TTL) return;

    try {
      const snapshot = await fetchSnapshot();
      applySnapshot(snapshot, Date.now());
      renderCurrentBusinessData('ready');
    } catch (error) {
      console.error('تعذر تحميل بيانات المنشآت:', error);

      if (!hasLiveData) {
        clearBusinessData();
        renderCurrentBusinessData('ready');
      } else {
        updateLiveInterface('ready');
      }

      if (error && error.status === 401) {
        localStorage.removeItem('araf_session');
      }

      if (typeof window.showToast === 'function') {
        window.showToast(
          error && error.message ? error.message : 'تعذر تحميل بيانات المنشآت',
          'error'
        );
      }
    }
  }

  window.renderBusinessPage = renderLiveBusinessPage;
  BIZ.render = renderLiveBusinessPage;
  BIZ.reload = function () { return renderLiveBusinessPage(true); };
  BIZ.loadLive = fetchSnapshot;
})();

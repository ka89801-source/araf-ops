/* =============================================================
   أعراف لإدارة الطلبات
   الربط الحي لطلبات المنشآت مع Supabase
   ============================================================= */

(function () {
  'use strict';

  if (!window.ArafBusiness) {
    console.error('ArafBusiness غير موجود');
    return;
  }

  const BIZ = window.ArafBusiness;

  /* =========================================================
     الخدمات الفعلية في منصة أعراف للأعمال
     ========================================================= */

  const LIVE_SERVICES = {
    consult: {
      key: 'consult',
      name: 'استشارة قانونية'
    },

    contracts: {
      key: 'contracts',
      name: 'صياغة أو مراجعة عقد'
    },

    letters: {
      key: 'letters',
      name: 'صياغة أو مراجعة خطاب أو إنذار'
    },

    najiz: {
      key: 'najiz',
      name: 'رفع طلب عبر ناجز'
    },

    violations: {
      key: 'violations',
      name: 'اعتراض على مخالفة حكومية'
    },

    governance: {
      key: 'governance',
      name: 'إعداد أو مراجعة عمل حوكمة'
    },

    memos: {
      key: 'memos',
      name: 'إعداد مذكرة قانونية'
    },

    risk_review: {
      key: 'risk_review',
      name: 'مراجعة قانونية شهرية'
    },

    negotiation: {
      key: 'negotiation',
      name: 'حضور اجتماع تفاوضي عن بُعد'
    },

    general: {
      key: 'general',
      name: 'طلب قانوني آخر'
    }
  };


  /* =========================================================
     الباقات الفعلية
     -1 = بلا حدود
      0 = غير مشمولة
     ========================================================= */

  const LIVE_PLANS = {
    asas: {
      key: 'asas',
      name: 'أعراف أساس',
      price: 500,

      quota: {
        consult: 3,
        contracts: 2,
        letters: 2,
        najiz: 2,
        violations: 1,
        governance: 0,
        memos: 0,
        risk_review: 0,
        negotiation: 0,
        general: 0
      }
    },

    numu: {
      key: 'numu',
      name: 'أعراف نمو',
      price: 2500,

      quota: {
        consult: 10,
        contracts: 5,
        letters: 5,
        najiz: 5,
        violations: 3,
        governance: 3,
        memos: 0,
        risk_review: 0,
        negotiation: 0,
        general: 0
      }
    },

    plus: {
      key: 'plus',
      name: 'أعراف بلس',
      price: 5000,

      quota: {
        consult: -1,
        contracts: 10,
        letters: 10,
        najiz: 10,
        violations: 6,
        governance: 6,
        memos: 3,
        risk_review: 1,
        negotiation: 1,
        general: 0
      }
    }
  };


  /* =========================================================
     استبدال تعريفات النسخة التجريبية بالتعريفات الحقيقية
     ========================================================= */

  Object.keys(BIZ.services).forEach(function (key) {
    delete BIZ.services[key];
  });

  Object.assign(
    BIZ.services,
    LIVE_SERVICES
  );


  Object.keys(BIZ.plans).forEach(function (key) {
    delete BIZ.plans[key];
  });

  Object.assign(
    BIZ.plans,
    LIVE_PLANS
  );


  /* =========================================================
     قراءة جلسة موظف لوحة الإدارة
     ========================================================= */

  function getOpsSession() {
    try {
      const raw =
        localStorage.getItem(
          'araf_session'
        );

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error(
        'تعذر قراءة جلسة الموظف',
        error
      );

      return null;
    }
  }


  /* =========================================================
     توحيد التاريخ
     ========================================================= */

  function simpleDate(value) {
    if (!value) {
      return '';
    }

    return String(value).slice(0, 10);
  }


  /* =========================================================
     حساب استهلاك كل منشأة في دورتها الحالية
     ========================================================= */

  function buildUsageMap(
    entities,
    usageRows
  ) {
    const result = {};

    const entityMap =
      new Map();

    entities.forEach(function (entity) {
      entityMap.set(
        String(entity.id),
        entity
      );

      result[String(entity.id)] = {};
    });


    usageRows.forEach(function (row) {
      const entityId =
        String(row.entity_id || '');

      const entity =
        entityMap.get(entityId);

      if (!entity) {
        return;
      }


      if (row.reversed_at) {
        return;
      }


      const entityStart =
        simpleDate(
          entity.current_cycle_start
        );

      const entityEnd =
        simpleDate(
          entity.current_cycle_end
        );

      const usageStart =
        simpleDate(
          row.cycle_start
        );

      const usageEnd =
        simpleDate(
          row.cycle_end
        );


      if (
        entityStart &&
        usageStart &&
        entityStart !== usageStart
      ) {
        return;
      }


      if (
        entityEnd &&
        usageEnd &&
        entityEnd !== usageEnd
      ) {
        return;
      }


      const serviceKey =
        String(
          row.service_key || ''
        );

      if (!serviceKey) {
        return;
      }


      if (!result[entityId]) {
        result[entityId] = {};
      }


      result[entityId][serviceKey] =
        Number(
          result[entityId][serviceKey] ||
          0
        ) +
        Number(
          row.units || 0
        );
    });


    return result;
  }


  /* =========================================================
     تحميل البيانات الحقيقية
     ========================================================= */

  async function loadLiveBusinessData() {
    if (!window.sb) {
      throw new Error(
        'Supabase غير متصل'
      );
    }


    const session =
      getOpsSession();

    if (
      !session ||
      !session.id ||
      !session.phone ||
      !(session.name || session.full_name)
    ) {
      throw new Error(
        'جلسة موظف منصة الإدارة غير مكتملة'
      );
    }


    const employeeName =
      session.name ||
      session.full_name;


    const {
      data,
      error
    } =
      await window.sb.rpc(
        'ops_business_snapshot',
        {
          p_employee_id:
            String(session.id),

          p_employee_name:
            String(employeeName),

          p_employee_phone:
            String(session.phone)
        }
      );


    if (error) {
      console.error(
        'ops_business_snapshot error:',
        error
      );

      throw error;
    }


    const snapshot =
      data || {};


    const entities =
      Array.isArray(
        snapshot.entities
      )
        ? snapshot.entities
        : [];


    const requests =
      Array.isArray(
        snapshot.requests
      )
        ? snapshot.requests
        : [];


    const usageRows =
      Array.isArray(
        snapshot.usage
      )
        ? snapshot.usage
        : [];


    const history =
      Array.isArray(
        snapshot.history
      )
        ? snapshot.history
        : [];


    const employees =
      Array.isArray(
        snapshot.employees
      )
        ? snapshot.employees
        : [];


    const usageMap =
      buildUsageMap(
        entities,
        usageRows
      );


    /* -------------------------
       المنشآت
       ------------------------- */

    BIZ.data.entities =
      entities.map(
        function (entity) {
          return {
            ...entity,

            usage:
              usageMap[
                String(entity.id)
              ] || {}
          };
        }
      );


    /* -------------------------
       الطلبات
       ------------------------- */

    BIZ.data.requests =
      requests.map(
        function (request) {
          return {
            ...request,

            service_key:
              request.service_key ||
              'general',

            subject:
              request.subject ||
              request.service_name_snapshot ||
              'طلب قانوني',

            details:
              request.details || '',

            status:
              request.status ||
              'new',

            priority:
              request.priority ||
              'normal',

            assigned_to:
              request.assigned_to ||
              null,

            quota_type:
              request.quota_type ||
              'included',

            quota_units:
              Number(
                request.quota_units ||
                1
              ),

            quota_counted:
              Boolean(
                request.quota_counted
              ),

            billing_status:
              request.billing_status ||
              'included',

            client_visible_note:
              request.client_visible_note ||
              '',

            internal_note:
              request.internal_note ||
              '',

            created_at:
              request.created_at,

            updated_at:
              request.updated_at ||
              request.created_at
          };
        }
      );


    /* -------------------------
       سجل الحالات
       ------------------------- */

    BIZ.data.history =
      history;


    /* -------------------------
       الموظفون الحقيقيون
       ------------------------- */

    if (
      Array.isArray(
        BIZ.employees
      )
    ) {
      BIZ.employees.splice(
        0,
        BIZ.employees.length,
        ...employees.map(
          function (employee) {
            return {
              id:
                employee.id,

              name:
                employee.full_name ||
                ''
            };
          }
        )
      );
    }


    return snapshot;
  }


  /* =========================================================
     تعديل عناصر الواجهة بعد الربط
     ========================================================= */

  function updateLiveInterface() {
    const liveBadge =
      document.querySelector(
        '#page-business .biz-demo-badge'
      );

    if (liveBadge) {
      liveBadge.textContent =
        'بيانات مباشرة';

      liveBadge.style.background =
        '#e8f7ef';

      liveBadge.style.color =
        '#24805a';

      liveBadge.style.borderColor =
        '#ccebdc';
    }


    /* -------------------------
       فلتر الباقات
       ------------------------- */

    const planFilter =
      document.getElementById(
        'bizFilterPlan'
      );

    if (planFilter) {
      planFilter.innerHTML = `
        <option value="all">
          كل الباقات
        </option>

        <option value="asas">
          أعراف أساس
        </option>

        <option value="numu">
          أعراف نمو
        </option>

        <option value="plus">
          أعراف بلس
        </option>
      `;
    }


    /* -------------------------
       عداد القائمة الجانبية
       ------------------------- */

    const sidebarBadge =
      document.getElementById(
        'businessRequestsBadge'
      );


    if (sidebarBadge) {
      const activeCount =
        BIZ.data.requests.filter(
          function (request) {
            return ![
              'completed',
              'cancelled'
            ].includes(
              request.status
            );
          }
        ).length;


      sidebarBadge.textContent =
        String(activeCount);
    }
  }


  /* =========================================================
     إلغاء البيانات الوهمية عند حدوث خطأ
     ========================================================= */

  function clearBusinessData() {
    BIZ.data.entities = [];
    BIZ.data.requests = [];
    BIZ.data.history = [];

    if (
      Array.isArray(
        BIZ.employees
      )
    ) {
      BIZ.employees.splice(
        0,
        BIZ.employees.length
      );
    }
  }


  /* =========================================================
     اعتراض دالة العرض القديمة وربطها بالبيانات الحقيقية
     ========================================================= */

  const originalRender =
    window.renderBusinessPage;


  async function renderLiveBusinessPage() {
    try {
      await loadLiveBusinessData();

    } catch (error) {
      console.error(
        'تعذر تحميل بيانات المنشآت:',
        error
      );

      clearBusinessData();


      if (
        typeof window.showToast ===
        'function'
      ) {
        window.showToast(
          'تعذر تحميل بيانات المنشآت من قاعدة البيانات',
          'error'
        );
      }
    }


    if (
      typeof originalRender ===
      'function'
    ) {
      originalRender();
    }


    updateLiveInterface();
  }


  window.renderBusinessPage =
    renderLiveBusinessPage;


  BIZ.render =
    renderLiveBusinessPage;


  BIZ.reload =
    renderLiveBusinessPage;


  BIZ.loadLive =
    loadLiveBusinessData;

})();

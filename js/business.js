/* =============================================================
   منصة أعراف لإدارة الطلبات
   وحدة: طلبات المنشآت
   نسخة تجريبية مستقلة قبل الربط بـ Supabase
   ============================================================= */

(function () {
  'use strict';

  /* =========================================================
     الخدمات المعتمدة
     ========================================================= */
  const BUSINESS_SERVICES = {
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
      name: 'خطاب أو إنذار رسمي'
    },

    memos: {
      key: 'memos',
      name: 'مذكرة قانونية'
    },

    najiz: {
      key: 'najiz',
      name: 'خدمات ناجز'
    },

    general: {
      key: 'general',
      name: 'طلب قانوني آخر'
    }
  };


  /* =========================================================
     الباقات المعتمدة
     -1 = بلا حدود
      0 = غير مشمولة
     ========================================================= */
  const BUSINESS_PLANS = {
    sanad: {
      key: 'sanad',
      name: 'سند',
      price: 1500,

      quota: {
        consult: 5,
        contracts: 2,
        letters: 2,
        memos: 0,
        najiz: 2,
        general: 0
      }
    },

    imad: {
      key: 'imad',
      name: 'عماد',
      price: 3500,

      quota: {
        consult: 12,
        contracts: 5,
        letters: 5,
        memos: 1,
        najiz: 5,
        general: 0
      }
    },

    diwan: {
      key: 'diwan',
      name: 'ديوان',
      price: 7500,

      quota: {
        consult: -1,
        contracts: 12,
        letters: -1,
        memos: 3,
        najiz: 10,
        general: 0
      }
    }
  };


  /* =========================================================
     الحالات المعتمدة
     ========================================================= */
  const BUSINESS_STATUSES = {
    new: 'جديد',
    under_review: 'قيد المراجعة',
    in_progress: 'قيد التنفيذ',
    awaiting_client: 'بانتظار رد المنشأة',
    completed: 'مكتمل',
    cancelled: 'ملغي'
  };


  /* =========================================================
     الموظفون التجريبيون
     ========================================================= */
  const BUSINESS_EMPLOYEES = [
    {
      id: 'EMP-001',
      name: 'سارة الزهراني'
    },

    {
      id: 'EMP-002',
      name: 'محمد القحطاني'
    },

    {
      id: 'EMP-003',
      name: 'نورة الشهري'
    }
  ];


  /* =========================================================
     بيانات تجريبية للمنشآت
     ========================================================= */
  const BUSINESS_DATA = {
    entities: [
      {
        id: 'ENT-001',
        code: 'ARF-1001',
        name: 'شركة رواسي الأعمال',
        entity_type: 'شركة',

        plan_key: 'imad',

        subscription_status: 'active',
        account_status: 'active',

        manager_name: 'سارة الزهراني',
        manager_title: 'مدير حساب قانوني',
        manager_phone: '0500000001',
        manager_hours: 'الأحد - الخميس، 9ص - 5م',

        subscription_start: '2026-08-01',

        usage: {
          consult: 5,
          contracts: 2,
          letters: 1,
          memos: 1,
          najiz: 2
        }
      },

      {
        id: 'ENT-002',
        code: 'ARF-1002',
        name: 'مؤسسة مدار التجارية',
        entity_type: 'مؤسسة',

        plan_key: 'sanad',

        subscription_status: 'active',
        account_status: 'active',

        manager_name: 'محمد القحطاني',
        manager_title: 'مدير الحساب',
        manager_phone: '0500000002',
        manager_hours: 'الأحد - الخميس، 9ص - 5م',

        subscription_start: '2026-08-05',

        usage: {
          consult: 3,
          contracts: 1,
          letters: 2,
          memos: 0,
          najiz: 1
        }
      },

      {
        id: 'ENT-003',
        code: 'ARF-1003',
        name: 'جمعية أفق للتنمية',
        entity_type: 'جمعية',

        plan_key: 'diwan',

        subscription_status: 'active',
        account_status: 'active',

        manager_name: 'نورة الشهري',
        manager_title: 'محامية مخصصة',
        manager_phone: '0500000003',
        manager_hours: 'الأحد - الخميس، 8ص - 4م',

        subscription_start: '2026-07-15',

        usage: {
          consult: 8,
          contracts: 4,
          letters: 6,
          memos: 1,
          najiz: 3
        }
      }
    ],


    requests: [
      {
        id: 'BIZ-REQ-001',
        request_number: 'ARB-2026-0012',

        entity_id: 'ENT-001',

        service_key: 'contracts',
        subject: 'مراجعة عقد توريد سنوي',

        details:
          'مراجعة عقد توريد سنوي وتحديد البنود ذات المخاطر القانونية قبل التوقيع.',

        status: 'new',
        priority: 'urgent',

        assigned_to: null,

        quota_type: 'included',
        quota_units: 1,
        quota_counted: false,

        billing_status: 'included',

        client_visible_note: '',
        internal_note: '',

        created_at: '2026-08-24T12:00:00',
        updated_at: '2026-08-24T12:00:00'
      },

      {
        id: 'BIZ-REQ-002',
        request_number: 'ARB-2026-0011',

        entity_id: 'ENT-003',

        service_key: 'letters',
        subject: 'إنذار رسمي لمورد متأخر',

        details:
          'إعداد إنذار رسمي للمورد بسبب التأخر في تنفيذ التزاماته التعاقدية.',

        status: 'under_review',
        priority: 'normal',

        assigned_to: 'EMP-003',

        quota_type: 'unlimited',
        quota_units: 1,
        quota_counted: false,

        billing_status: 'included',

        client_visible_note:
          'تم استلام الطلب وجارٍ مراجعة المستندات.',

        internal_note:
          'مراجعة العقد والمراسلات قبل إعداد الإنذار.',

        created_at: '2026-08-24T08:30:00',
        updated_at: '2026-08-24T11:00:00'
      },

      {
        id: 'BIZ-REQ-003',
        request_number: 'ARB-2026-0010',

        entity_id: 'ENT-002',

        service_key: 'consult',
        subject: 'استشارة في عقد مقاولة',

        details:
          'استشارة قانونية بشأن غرامات التأخير وآلية تطبيقها في عقد مقاولة قائم.',

        status: 'in_progress',
        priority: 'urgent',

        assigned_to: 'EMP-002',

        quota_type: 'included',
        quota_units: 1,
        quota_counted: true,

        billing_status: 'included',

        client_visible_note:
          'تم إسناد الطلب للمستشار المختص.',

        internal_note: '',

        created_at: '2026-08-23T10:00:00',
        updated_at: '2026-08-24T09:00:00'
      },

      {
        id: 'BIZ-REQ-004',
        request_number: 'ARB-2026-0009',

        entity_id: 'ENT-001',

        service_key: 'najiz',
        subject: 'إجراء وكالة عبر ناجز',

        details:
          'مساعدة المنشأة في استكمال إجراء وكالة إلكترونية عبر منصة ناجز.',

        status: 'awaiting_client',
        priority: 'normal',

        assigned_to: 'EMP-001',

        quota_type: 'included',
        quota_units: 1,
        quota_counted: false,

        billing_status: 'included',

        client_visible_note:
          'بانتظار تزويدنا ببيانات المفوض.',

        internal_note:
          'لا يستكمل الإجراء دون بيانات المفوض.',

        created_at: '2026-08-22T13:00:00',
        updated_at: '2026-08-24T08:00:00'
      },

      {
        id: 'BIZ-REQ-005',
        request_number: 'ARB-2026-0008',

        entity_id: 'ENT-003',

        service_key: 'memos',
        subject: 'مذكرة مطالبة تعاقدية',

        details:
          'إعداد مذكرة قانونية تتضمن أسانيد مطالبة مالية ناشئة عن إخلال تعاقدي.',

        status: 'in_progress',
        priority: 'urgent',

        assigned_to: 'EMP-003',

        quota_type: 'included',
        quota_units: 1,
        quota_counted: true,

        billing_status: 'included',

        client_visible_note:
          'جارٍ إعداد المسودة الأولى.',

        internal_note:
          'يجب مطابقة المبالغ مع المستندات المالية.',

        created_at: '2026-08-21T10:00:00',
        updated_at: '2026-08-24T07:00:00'
      },

      {
        id: 'BIZ-REQ-006',
        request_number: 'ARB-2026-0007',

        entity_id: 'ENT-002',

        service_key: 'contracts',
        subject: 'مراجعة ملحق عقد إيجار',

        details:
          'مراجعة ملحق تمديد عقد إيجار تجاري قبل اعتماده.',

        status: 'completed',
        priority: 'normal',

        assigned_to: 'EMP-002',

        quota_type: 'included',
        quota_units: 1,
        quota_counted: true,

        billing_status: 'included',

        client_visible_note:
          'تمت المراجعة ورفع النسخة النهائية.',

        internal_note: '',

        created_at: '2026-08-18T11:00:00',
        updated_at: '2026-08-20T14:00:00',
        completed_at: '2026-08-20T14:00:00'
      },

      {
        id: 'BIZ-REQ-007',
        request_number: 'ARB-2026-0006',

        entity_id: 'ENT-001',

        service_key: 'general',
        subject: 'إعداد لائحة داخلية خاصة',

        details:
          'طلب قانوني آخر يحتاج إلى مراجعة نطاق العمل وتسعيره قبل التنفيذ.',

        status: 'under_review',
        priority: 'normal',

        assigned_to: 'EMP-001',

        quota_type: 'extra',
        quota_units: 1,
        quota_counted: false,

        billing_status: 'extra_pending',

        client_visible_note:
          'الطلب تحت المراجعة لتحديد نطاق العمل والتكلفة.',

        internal_note:
          'هذه الخدمة لا تخصم من رصيد الباقة.',

        created_at: '2026-08-17T09:00:00',
        updated_at: '2026-08-19T12:00:00'
      },

      {
        id: 'BIZ-REQ-008',
        request_number: 'ARB-2026-0005',

        entity_id: 'ENT-003',

        service_key: 'consult',
        subject: 'استشارة في الحوكمة',

        details:
          'استشارة قانونية حول صلاحيات مجلس الإدارة واللجان التابعة له.',

        status: 'completed',
        priority: 'normal',

        assigned_to: 'EMP-003',

        quota_type: 'unlimited',
        quota_units: 1,
        quota_counted: true,

        billing_status: 'included',

        client_visible_note:
          'تمت الاستشارة وإغلاق الطلب.',

        internal_note: '',

        created_at: '2026-08-12T10:00:00',
        updated_at: '2026-08-13T15:00:00',
        completed_at: '2026-08-13T15:00:00'
      }
    ],


    history: [
      {
        request_id: 'BIZ-REQ-002',
        old_status: 'new',
        new_status: 'under_review',
        note: 'بدأت مراجعة المستندات.',
        visible_to_client: true,
        changed_by: 'نورة الشهري',
        created_at: '2026-08-24T11:00:00'
      },

      {
        request_id: 'BIZ-REQ-003',
        old_status: 'under_review',
        new_status: 'in_progress',
        note: 'تم بدء العمل على الاستشارة.',
        visible_to_client: true,
        changed_by: 'محمد القحطاني',
        created_at: '2026-08-24T09:00:00'
      },

      {
        request_id: 'BIZ-REQ-004',
        old_status: 'in_progress',
        new_status: 'awaiting_client',
        note: 'بانتظار بيانات المفوض.',
        visible_to_client: true,
        changed_by: 'سارة الزهراني',
        created_at: '2026-08-24T08:00:00'
      }
    ]
  };


  /* =========================================================
     حالة الصفحة
     ========================================================= */
  const BUSINESS_STATE = {
    mounted: false,

    filters: {
      search: '',
      status: 'all',
      service: 'all',
      plan: 'all',
      employee: 'all',
      priority: 'all',
      dateFrom: '',
      dateTo: ''
    }
  };


  /* =========================================================
     أدوات مساعدة
     ========================================================= */
  function businessEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  function businessEntity(id) {
    return BUSINESS_DATA.entities.find(function (item) {
      return item.id === id;
    }) || null;
  }


  function businessRequest(id) {
    return BUSINESS_DATA.requests.find(function (item) {
      return item.id === id;
    }) || null;
  }


  function businessEmployee(id) {
    return BUSINESS_EMPLOYEES.find(function (item) {
      return item.id === id;
    }) || null;
  }


  function businessService(key) {
    return BUSINESS_SERVICES[key] || {
      key: key,
      name: key
    };
  }


  function businessPlan(key) {
    return BUSINESS_PLANS[key] || {
      key: key,
      name: key,
      price: 0,
      quota: {}
    };
  }


  function businessStatusLabel(status) {
    return BUSINESS_STATUSES[status] || status;
  }


  function businessPriorityLabel(priority) {
    return priority === 'urgent'
      ? 'عاجل'
      : 'عادي';
  }


  function businessFormatDate(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }


  function businessFormatDateTime(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }


  function businessTimeAgo(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    const diff =
      Date.now() -
      date.getTime();

    const minutes =
      Math.floor(diff / 60000);

    const hours =
      Math.floor(diff / 3600000);

    const days =
      Math.floor(diff / 86400000);

    if (minutes < 1) {
      return 'الآن';
    }

    if (minutes < 60) {
      return `قبل ${minutes} دقيقة`;
    }

    if (hours < 24) {
      return `قبل ${hours} ساعة`;
    }

    if (days < 7) {
      return `قبل ${days} يوم`;
    }

    return businessFormatDate(value);
  }


  function businessQuotaTotal(entity, serviceKey) {
    if (!entity) {
      return 0;
    }

    const plan =
      businessPlan(entity.plan_key);

    return Number(
      plan.quota[serviceKey] ?? 0
    );
  }


  function businessQuotaUsed(entity, serviceKey) {
    if (!entity) {
      return 0;
    }

    return Number(
      entity.usage &&
      entity.usage[serviceKey]
        ? entity.usage[serviceKey]
        : 0
    );
  }


  function businessQuotaLabel(entity, serviceKey) {
    const total =
      businessQuotaTotal(
        entity,
        serviceKey
      );

    const used =
      businessQuotaUsed(
        entity,
        serviceKey
      );

    if (total === -1) {
      return 'بلا حدود';
    }

    if (total === 0) {
      return 'غير مشمولة';
    }

    const remaining =
      Math.max(
        0,
        total - used
      );

    return `${remaining} / ${total}`;
  }


  function businessQuotaPercentage(entity, serviceKey) {
    const total =
      businessQuotaTotal(
        entity,
        serviceKey
      );

    const used =
      businessQuotaUsed(
        entity,
        serviceKey
      );

    if (total === -1) {
      return 100;
    }

    if (total <= 0) {
      return 0;
    }

    const remaining =
      Math.max(
        0,
        total - used
      );

    return Math.min(
      100,
      Math.max(
        0,
        (remaining / total) * 100
      )
    );
  }


  function businessLatestRequest(entityId) {
    return BUSINESS_DATA.requests
      .filter(function (request) {
        return request.entity_id === entityId;
      })
      .sort(function (a, b) {
        return (
          new Date(b.created_at) -
          new Date(a.created_at)
        );
      })[0] || null;
  }


  function businessEntityRequests(entityId) {
    return BUSINESS_DATA.requests
      .filter(function (request) {
        return (
          request.entity_id === entityId &&
          !request.archived_at
        );
      })
      .sort(function (a, b) {
        return (
          new Date(b.created_at) -
          new Date(a.created_at)
        );
      });
  }


  function businessIsThisMonth(value) {
    if (!value) {
      return false;
    }

    const date =
      new Date(value);

    const now =
      new Date();

    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth()
    );
  }


  /* =========================================================
     تركيب الصفحة
     ========================================================= */
  function mountBusinessPage() {
    const page =
      document.getElementById(
        'page-business'
      );

    if (!page) {
      console.error(
        'تعذر العثور على page-business'
      );

      return false;
    }


    if (BUSINESS_STATE.mounted) {
      return true;
    }


    page.innerHTML = `
      <div class="biz-scope">

        <!-- رأس الصفحة -->
        <div class="biz-head">

          <div>
            <h1 class="biz-head-title">
              طلبات المنشآت
            </h1>

            <p class="biz-head-sub">
              إدارة منشآت أعراف للأعمال واشتراكاتها وأرصدة خدماتها وطلباتها القانونية
            </p>
          </div>

          <div class="biz-head-tools">
            <span class="biz-badge biz-demo-badge">
              بيانات تجريبية
            </span>
          </div>

        </div>


        <!-- الإحصائيات -->
        <div
          class="biz-kpis"
          id="bizKpis"
        ></div>


        <!-- أحدث الطلبات -->
        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>
              <div class="biz-panel-title">
                أحدث طلبات المنشآت
              </div>

              <div class="biz-panel-hint">
                آخر الطلبات القانونية الواردة من بوابات المنشآت
              </div>
            </div>

          </div>

          <div
            class="biz-recent"
            id="bizRecent"
          ></div>

        </section>


        <!-- بطاقات المنشآت -->
        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>
              <div class="biz-panel-title">
                المنشآت
              </div>

              <div
                class="biz-panel-hint"
                id="bizEntitiesHint"
              ></div>
            </div>

          </div>

          <div
            class="biz-cards"
            id="bizCards"
          ></div>

        </section>


        <!-- جدول الطلبات -->
        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>
              <div class="biz-panel-title">
                جميع طلبات المنشآت
              </div>

              <div
                class="biz-panel-hint"
                id="bizRequestsCount"
              ></div>
            </div>

          </div>


          <!-- الفلاتر -->
          <div class="biz-filters">

            <div class="biz-search">

              <input
                type="search"
                id="bizSearch"
                placeholder="ابحث برقم الطلب أو اسم المنشأة أو رمزها..."
              />

            </div>


            <select
              class="biz-select"
              id="bizFilterStatus"
            >
              <option value="all">
                كل الحالات
              </option>

              <option value="new">
                جديد
              </option>

              <option value="under_review">
                قيد المراجعة
              </option>

              <option value="in_progress">
                قيد التنفيذ
              </option>

              <option value="awaiting_client">
                بانتظار رد المنشأة
              </option>

              <option value="completed">
                مكتمل
              </option>

              <option value="cancelled">
                ملغي
              </option>
            </select>


            <select
              class="biz-select"
              id="bizFilterService"
            >
              <option value="all">
                كل الخدمات
              </option>
            </select>


            <select
              class="biz-select"
              id="bizFilterPlan"
            >
              <option value="all">
                كل الباقات
              </option>

              <option value="sanad">
                باقة سند
              </option>

              <option value="imad">
                باقة عماد
              </option>

              <option value="diwan">
                باقة ديوان
              </option>
            </select>


            <select
              class="biz-select"
              id="bizFilterEmployee"
            >
              <option value="all">
                كل الموظفين
              </option>

              <option value="unassigned">
                غير مسند
              </option>
            </select>


            <select
              class="biz-select"
              id="bizFilterPriority"
            >
              <option value="all">
                كل الأولويات
              </option>

              <option value="normal">
                عادي
              </option>

              <option value="urgent">
                عاجل
              </option>
            </select>


            <input
              class="biz-select"
              id="bizDateFrom"
              type="date"
              title="من تاريخ"
            />


            <input
              class="biz-select"
              id="bizDateTo"
              type="date"
              title="إلى تاريخ"
            />


            <button
              type="button"
              class="biz-btn"
              id="bizResetFilters"
            >
              إعادة الضبط
            </button>

          </div>


          <!-- الجدول -->
          <div class="biz-table-wrap">

            <div class="biz-table-scroll">

              <table class="biz-table">

                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>المنشأة</th>
                    <th>رمز المنشأة</th>
                    <th>الباقة</th>
                    <th>الخدمة</th>
                    <th>عنوان الطلب</th>
                    <th>تاريخ الإرسال</th>
                    <th>الحالة</th>
                    <th>الموظف</th>
                    <th>الأولوية</th>
                  </tr>
                </thead>

                <tbody
                  id="bizRequestsTableBody"
                ></tbody>

              </table>

            </div>

          </div>

        </section>


        <!-- صفحة المنشأة -->
        <section
          id="bizEntityPage"
          class="biz-entity-page"
          style="display:none;"
        ></section>

      </div>


      <!-- تفاصيل الطلب -->
      <div
        class="biz-request-overlay"
        id="bizRequestOverlay"
      >

        <aside
          class="biz-request-drawer"
          id="bizRequestDrawer"
        ></aside>

      </div>
    `;


    BUSINESS_STATE.mounted = true;


    bindBusinessEvents();


    return true;
  }


  /* =========================================================
     الإحصائيات
     ========================================================= */
  function renderBusinessKpis() {
    const requests =
      BUSINESS_DATA.requests.filter(
        function (request) {
          return !request.archived_at;
        }
      );


    const newCount =
      requests.filter(
        function (request) {
          return request.status === 'new';
        }
      ).length;


    const reviewCount =
      requests.filter(
        function (request) {
          return request.status ===
            'under_review';
        }
      ).length;


    const progressCount =
      requests.filter(
        function (request) {
          return request.status ===
            'in_progress';
        }
      ).length;


    const awaitingCount =
      requests.filter(
        function (request) {
          return request.status ===
            'awaiting_client';
        }
      ).length;


    const completedMonth =
      requests.filter(
        function (request) {
          return (
            request.status ===
              'completed' &&
            businessIsThisMonth(
              request.completed_at ||
              request.updated_at
            )
          );
        }
      ).length;


    const container =
      document.getElementById(
        'bizKpis'
      );


    if (!container) {
      return;
    }


    container.innerHTML = `

      <div class="biz-kpi">
        <div class="biz-kpi-label">
          الطلبات الجديدة
        </div>

        <div class="biz-kpi-value">
          ${newCount}
        </div>

        <div class="biz-kpi-meta">
          بانتظار المراجعة
        </div>
      </div>


      <div class="biz-kpi">
        <div class="biz-kpi-label">
          قيد المراجعة
        </div>

        <div class="biz-kpi-value">
          ${reviewCount}
        </div>

        <div class="biz-kpi-meta">
          يتم فحص الطلب
        </div>
      </div>


      <div class="biz-kpi">
        <div class="biz-kpi-label">
          قيد التنفيذ
        </div>

        <div class="biz-kpi-value">
          ${progressCount}
        </div>

        <div class="biz-kpi-meta">
          طلب نشط
        </div>
      </div>


      <div class="biz-kpi">
        <div class="biz-kpi-label">
          بانتظار المنشأة
        </div>

        <div class="biz-kpi-value">
          ${awaitingCount}
        </div>

        <div class="biz-kpi-meta">
          يحتاج رد العميل
        </div>
      </div>


      <div class="biz-kpi">
        <div class="biz-kpi-label">
          مكتملة هذا الشهر
        </div>

        <div class="biz-kpi-value">
          ${completedMonth}
        </div>

        <div class="biz-kpi-meta">
          طلب مكتمل
        </div>
      </div>

    `;
  }


  /* =========================================================
     أحدث الطلبات
     ========================================================= */
  function renderBusinessRecent() {
    const container =
      document.getElementById(
        'bizRecent'
      );


    if (!container) {
      return;
    }


    const recent =
      [...BUSINESS_DATA.requests]
        .filter(
          function (request) {
            return !request.archived_at;
          }
        )
        .sort(
          function (a, b) {
            return (
              new Date(b.created_at) -
              new Date(a.created_at)
            );
          }
        )
        .slice(0, 5);


    if (!recent.length) {
      container.innerHTML = `
        <div class="biz-empty">
          لا توجد طلبات منشآت حتى الآن
        </div>
      `;

      return;
    }


    container.innerHTML =
      recent
        .map(
          function (request) {
            const entity =
              businessEntity(
                request.entity_id
              );

            const service =
              businessService(
                request.service_key
              );


            return `
              <button
                type="button"
                class="biz-recent-item"
                data-business-request="${request.id}"
              >

                <div class="biz-recent-main">

                  <strong>
                    ${businessEscape(
                      request.subject
                    )}
                  </strong>

                  <span>
                    ${
                      entity
                        ? businessEscape(
                            entity.name
                          )
                        : '—'
                    }
                    ·
                    ${businessEscape(
                      service.name
                    )}
                  </span>

                </div>


                <div class="biz-recent-side">

                  <span
                    class="biz-badge biz-status-${request.status}"
                  >
                    ${businessStatusLabel(
                      request.status
                    )}
                  </span>

                  <small>
                    ${businessTimeAgo(
                      request.created_at
                    )}
                  </small>

                </div>

              </button>
            `;
          }
        )
        .join('');
  }


  /* =========================================================
     بطاقات المنشآت
     ========================================================= */
  function renderBusinessCards() {
    const container =
      document.getElementById(
        'bizCards'
      );


    const hint =
      document.getElementById(
        'bizEntitiesHint'
      );


    if (!container) {
      return;
    }


    if (hint) {
      hint.textContent =
        `${BUSINESS_DATA.entities.length} منشآت مفعلة`;
    }


    container.innerHTML =
      BUSINESS_DATA.entities
        .map(
          function (entity) {
            const plan =
              businessPlan(
                entity.plan_key
              );


            const latest =
              businessLatestRequest(
                entity.id
              );


            const services =
              Object.keys(
                BUSINESS_SERVICES
              )
                .filter(
                  function (serviceKey) {
                    return serviceKey !==
                      'general';
                  }
                )
                .map(
                  function (serviceKey) {
                    const service =
                      businessService(
                        serviceKey
                      );


                    return `
                      <div class="biz-mini-quota">

                        <span>
                          ${businessEscape(
                            service.name
                          )}
                        </span>

                        <strong>
                          ${businessQuotaLabel(
                            entity,
                            serviceKey
                          )}
                        </strong>

                      </div>
                    `;
                  }
                )
                .join('');


            return `
              <article
                class="biz-entity-card"
              >

                <div class="biz-entity-card-head">

                  <div>

                    <span class="biz-entity-code">
                      ${businessEscape(
                        entity.code
                      )}
                    </span>

                    <h3>
                      ${businessEscape(
                        entity.name
                      )}
                    </h3>

                    <p>
                      ${businessEscape(
                        entity.entity_type
                      )}
                    </p>

                  </div>


                  <span
                    class="biz-plan-badge biz-plan-${entity.plan_key}"
                  >
                    باقة
                    ${businessEscape(
                      plan.name
                    )}
                  </span>

                </div>


                <div class="biz-entity-manager">

                  <span>
                    مدير الحساب
                  </span>

                  <strong>
                    ${businessEscape(
                      entity.manager_name
                    )}
                  </strong>

                  <small>
                    ${businessEscape(
                      entity.manager_title
                    )}
                  </small>

                </div>


                <div class="biz-mini-quotas">
                  ${services}
                </div>


                <div class="biz-last-request">

                  <span>
                    آخر طلب
                  </span>

                  ${
                    latest
                      ? `
                        <strong>
                          ${businessEscape(
                            latest.subject
                          )}
                        </strong>

                        <small>
                          ${businessTimeAgo(
                            latest.created_at
                          )}
                        </small>
                      `
                      : `
                        <strong>
                          لا توجد طلبات
                        </strong>
                      `
                  }

                </div>


                <button
                  type="button"
                  class="biz-btn biz-btn-primary biz-open-entity"
                  data-business-entity="${entity.id}"
                >
                  فتح ملف المنشأة
                </button>

              </article>
            `;
          }
        )
        .join('');
  }


  /* =========================================================
     الفلاتر
     ========================================================= */
  function fillBusinessFilterOptions() {
    const serviceSelect =
      document.getElementById(
        'bizFilterService'
      );


    const employeeSelect =
      document.getElementById(
        'bizFilterEmployee'
      );


    if (serviceSelect) {
      serviceSelect.innerHTML = `
        <option value="all">
          كل الخدمات
        </option>

        ${
          Object.values(
            BUSINESS_SERVICES
          )
            .map(
              function (service) {
                return `
                  <option
                    value="${service.key}"
                  >
                    ${businessEscape(
                      service.name
                    )}
                  </option>
                `;
              }
            )
            .join('')
        }
      `;
    }


    if (employeeSelect) {
      employeeSelect.innerHTML = `
        <option value="all">
          كل الموظفين
        </option>

        <option value="unassigned">
          غير مسند
        </option>

        ${
          BUSINESS_EMPLOYEES
            .map(
              function (employee) {
                return `
                  <option
                    value="${employee.id}"
                  >
                    ${businessEscape(
                      employee.name
                    )}
                  </option>
                `;
              }
            )
            .join('')
        }
      `;
    }
  }


  function getFilteredBusinessRequests() {
    let requests =
      BUSINESS_DATA.requests
        .filter(
          function (request) {
            return !request.archived_at;
          }
        );


    const filters =
      BUSINESS_STATE.filters;


    if (filters.search) {
      const query =
        filters.search.toLowerCase();


      requests =
        requests.filter(
          function (request) {
            const entity =
              businessEntity(
                request.entity_id
              );


            return (
              String(
                request.request_number ||
                ''
              )
                .toLowerCase()
                .includes(query) ||

              String(
                request.subject ||
                ''
              )
                .toLowerCase()
                .includes(query) ||

              String(
                entity
                  ? entity.name
                  : ''
              )
                .toLowerCase()
                .includes(query) ||

              String(
                entity
                  ? entity.code
                  : ''
              )
                .toLowerCase()
                .includes(query)
            );
          }
        );
    }


    if (filters.status !== 'all') {
      requests =
        requests.filter(
          function (request) {
            return (
              request.status ===
              filters.status
            );
          }
        );
    }


    if (filters.service !== 'all') {
      requests =
        requests.filter(
          function (request) {
            return (
              request.service_key ===
              filters.service
            );
          }
        );
    }


    if (filters.plan !== 'all') {
      requests =
        requests.filter(
          function (request) {
            const entity =
              businessEntity(
                request.entity_id
              );


            return (
              entity &&
              entity.plan_key ===
                filters.plan
            );
          }
        );
    }


    if (
      filters.employee !==
      'all'
    ) {
      if (
        filters.employee ===
        'unassigned'
      ) {
        requests =
          requests.filter(
            function (request) {
              return !request.assigned_to;
            }
          );
      } else {
        requests =
          requests.filter(
            function (request) {
              return (
                request.assigned_to ===
                filters.employee
              );
            }
          );
      }
    }


    if (
      filters.priority !==
      'all'
    ) {
      requests =
        requests.filter(
          function (request) {
            return (
              request.priority ===
              filters.priority
            );
          }
        );
    }


    if (filters.dateFrom) {
      const from =
        new Date(
          `${filters.dateFrom}T00:00:00`
        );


      requests =
        requests.filter(
          function (request) {
            return (
              new Date(
                request.created_at
              ) >= from
            );
          }
        );
    }


    if (filters.dateTo) {
      const to =
        new Date(
          `${filters.dateTo}T23:59:59`
        );


      requests =
        requests.filter(
          function (request) {
            return (
              new Date(
                request.created_at
              ) <= to
            );
          }
        );
    }


    return requests.sort(
      function (a, b) {
        return (
          new Date(b.created_at) -
          new Date(a.created_at)
        );
      }
    );
  }


  /* =========================================================
     جدول الطلبات
     ========================================================= */
  function renderBusinessTable() {
    const body =
      document.getElementById(
        'bizRequestsTableBody'
      );


    const count =
      document.getElementById(
        'bizRequestsCount'
      );


    if (!body) {
      return;
    }


    const requests =
      getFilteredBusinessRequests();


    if (count) {
      count.textContent =
        `${requests.length} طلب`;
    }


    if (!requests.length) {
      body.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="biz-empty">
              لا توجد طلبات مطابقة للفلاتر
            </div>
          </td>
        </tr>
      `;

      return;
    }


    body.innerHTML =
      requests
        .map(
          function (request) {
            const entity =
              businessEntity(
                request.entity_id
              );


            const service =
              businessService(
                request.service_key
              );


            const employee =
              businessEmployee(
                request.assigned_to
              );


            const plan =
              entity
                ? businessPlan(
                    entity.plan_key
                  )
                : null;


            return `
              <tr
                data-business-request="${request.id}"
              >

                <td>
                  <span class="biz-request-number">
                    ${businessEscape(
                      request.request_number
                    )}
                  </span>
                </td>


                <td>
                  <strong>
                    ${
                      entity
                        ? businessEscape(
                            entity.name
                          )
                        : '—'
                    }
                  </strong>
                </td>


                <td>
                  ${
                    entity
                      ? businessEscape(
                          entity.code
                        )
                      : '—'
                  }
                </td>


                <td>
                  ${
                    plan
                      ? `
                        <span
                          class="biz-plan-badge biz-plan-${entity.plan_key}"
                        >
                          ${businessEscape(
                            plan.name
                          )}
                        </span>
                      `
                      : '—'
                  }
                </td>


                <td>
                  ${businessEscape(
                    service.name
                  )}
                </td>


                <td>
                  ${businessEscape(
                    request.subject
                  )}
                </td>


                <td>
                  ${businessFormatDate(
                    request.created_at
                  )}
                </td>


                <td>
                  <span
                    class="biz-badge biz-status-${request.status}"
                  >
                    ${businessStatusLabel(
                      request.status
                    )}
                  </span>
                </td>


                <td>
                  ${
                    employee
                      ? businessEscape(
                          employee.name
                        )
                      : 'غير مسند'
                  }
                </td>


                <td>
                  <span
                    class="biz-badge biz-priority-${request.priority}"
                  >
                    ${businessPriorityLabel(
                      request.priority
                    )}
                  </span>
                </td>

              </tr>
            `;
          }
        )
        .join('');
  }


  /* =========================================================
     صفحة المنشأة
     ========================================================= */
  function openBusinessEntity(entityId) {
    const entity =
      businessEntity(
        entityId
      );


    if (!entity) {
      return;
    }


    const container =
      document.getElementById(
        'bizEntityPage'
      );


    if (!container) {
      return;
    }


    const plan =
      businessPlan(
        entity.plan_key
      );


    const requests =
      businessEntityRequests(
        entity.id
      );


    const latest =
      requests[0] || null;


    const quotaCards =
      Object.values(
        BUSINESS_SERVICES
      )
        .filter(
          function (service) {
            return service.key !==
              'general';
          }
        )
        .map(
          function (service) {
            const percentage =
              businessQuotaPercentage(
                entity,
                service.key
              );


            return `
              <div class="biz-quota-card">

                <div class="biz-quota-head">

                  <span>
                    ${businessEscape(
                      service.name
                    )}
                  </span>

                  <strong>
                    ${businessQuotaLabel(
                      entity,
                      service.key
                    )}
                  </strong>

                </div>


                <div class="biz-quota-track">

                  <div
                    class="biz-quota-fill"
                    style="width:${percentage}%"
                  ></div>

                </div>

              </div>
            `;
          }
        )
        .join('');


    const requestsHtml =
      requests.length
        ? requests
            .map(
              function (request) {
                return `
                  <button
                    type="button"
                    class="biz-entity-request"
                    data-business-request="${request.id}"
                  >

                    <div>

                      <strong>
                        ${businessEscape(
                          request.subject
                        )}
                      </strong>

                      <span>
                        ${businessEscape(
                          request.request_number
                        )}
                        ·
                        ${businessFormatDate(
                          request.created_at
                        )}
                      </span>

                    </div>


                    <span
                      class="biz-badge biz-status-${request.status}"
                    >
                      ${businessStatusLabel(
                        request.status
                      )}
                    </span>

                  </button>
                `;
              }
            )
            .join('')
        : `
            <div class="biz-empty">
              لا توجد طلبات لهذه المنشأة
            </div>
          `;


    container.innerHTML = `

      <div class="biz-entity-detail">

        <button
          type="button"
          class="biz-btn"
          id="bizBackToMain"
        >
          ← العودة إلى طلبات المنشآت
        </button>


        <div class="biz-entity-detail-head">

          <div>

            <span class="biz-entity-code">
              ${businessEscape(
                entity.code
              )}
            </span>

            <h2>
              ${businessEscape(
                entity.name
              )}
            </h2>

            <p>
              ${businessEscape(
                entity.entity_type
              )}
            </p>

          </div>


          <span
            class="biz-plan-badge biz-plan-${entity.plan_key}"
          >
            باقة
            ${businessEscape(
              plan.name
            )}
          </span>

        </div>


        <div class="biz-entity-info-grid">

          <div class="biz-info-box">

            <span>
              حالة الاشتراك
            </span>

            <strong>
              ${
                entity.subscription_status ===
                'active'
                  ? 'نشط'
                  : entity.subscription_status
              }
            </strong>

          </div>


          <div class="biz-info-box">

            <span>
              قيمة الباقة
            </span>

            <strong>
              ${plan.price.toLocaleString(
                'ar-SA'
              )}
              ر.س شهريًا
            </strong>

          </div>


          <div class="biz-info-box">

            <span>
              مدير الحساب
            </span>

            <strong>
              ${businessEscape(
                entity.manager_name
              )}
            </strong>

            <small>
              ${businessEscape(
                entity.manager_title
              )}
            </small>

          </div>


          <div class="biz-info-box">

            <span>
              التواصل
            </span>

            <strong>
              ${businessEscape(
                entity.manager_phone
              )}
            </strong>

            <small>
              ${businessEscape(
                entity.manager_hours
              )}
            </small>

          </div>

        </div>


        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>

              <div class="biz-panel-title">
                رصيد الباقة
              </div>

              <div class="biz-panel-hint">
                الرصيد الحالي للخدمات المشمولة في الاشتراك
              </div>

            </div>

          </div>


          <div class="biz-quota-grid">
            ${quotaCards}
          </div>

        </section>


        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>

              <div class="biz-panel-title">
                آخر نشاط
              </div>

            </div>

          </div>


          <div class="biz-last-activity">

            ${
              latest
                ? `
                  <strong>
                    ${businessEscape(
                      latest.subject
                    )}
                  </strong>

                  <span>
                    ${businessStatusLabel(
                      latest.status
                    )}
                    ·
                    ${businessTimeAgo(
                      latest.updated_at
                    )}
                  </span>
                `
                : `
                  لا يوجد نشاط
                `
            }

          </div>

        </section>


        <section class="biz-panel">

          <div class="biz-panel-head">

            <div>

              <div class="biz-panel-title">
                طلبات المنشأة
              </div>

              <div class="biz-panel-hint">
                ${requests.length} طلب
              </div>

            </div>

          </div>


          <div class="biz-entity-requests">
            ${requestsHtml}
          </div>

        </section>

      </div>
    `;


    const mainSections =
      document.querySelectorAll(
        '#page-business .biz-scope > .biz-head, #page-business .biz-scope > .biz-kpis, #page-business .biz-scope > .biz-panel'
      );


    mainSections.forEach(
      function (element) {
        element.style.display =
          'none';
      }
    );


    container.style.display =
      'block';


    const backButton =
      document.getElementById(
        'bizBackToMain'
      );


    if (backButton) {
      backButton.onclick =
        closeBusinessEntity;
    }


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  function closeBusinessEntity() {
    const container =
      document.getElementById(
        'bizEntityPage'
      );


    if (container) {
      container.style.display =
        'none';

      container.innerHTML = '';
    }


    const mainSections =
      document.querySelectorAll(
        '#page-business .biz-scope > .biz-head, #page-business .biz-scope > .biz-kpis, #page-business .biz-scope > .biz-panel'
      );


    mainSections.forEach(
      function (element) {
        element.style.display = '';
      }
    );


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  /* =========================================================
     تفاصيل الطلب
     ========================================================= */
  function openBusinessRequest(requestId) {
    const request =
      businessRequest(
        requestId
      );


    if (!request) {
      return;
    }


    const entity =
      businessEntity(
        request.entity_id
      );


    const service =
      businessService(
        request.service_key
      );


    const employee =
      businessEmployee(
        request.assigned_to
      );


    const plan =
      entity
        ? businessPlan(
            entity.plan_key
          )
        : null;


    const history =
      BUSINESS_DATA.history
        .filter(
          function (item) {
            return (
              item.request_id ===
              request.id
            );
          }
        )
        .sort(
          function (a, b) {
            return (
              new Date(
                b.created_at
              ) -
              new Date(
                a.created_at
              )
            );
          }
        );


    const overlay =
      document.getElementById(
        'bizRequestOverlay'
      );


    const drawer =
      document.getElementById(
        'bizRequestDrawer'
      );


    if (
      !overlay ||
      !drawer
    ) {
      return;
    }


    drawer.innerHTML = `

      <div class="biz-request-head">

        <div>

          <span class="biz-request-number">
            ${businessEscape(
              request.request_number
            )}
          </span>

          <h2>
            ${businessEscape(
              request.subject
            )}
          </h2>

          <div class="biz-request-head-badges">

            <span
              class="biz-badge biz-status-${request.status}"
            >
              ${businessStatusLabel(
                request.status
              )}
            </span>


            <span
              class="biz-badge biz-priority-${request.priority}"
            >
              ${businessPriorityLabel(
                request.priority
              )}
            </span>

          </div>

        </div>


        <button
          type="button"
          class="biz-request-close"
          id="bizCloseRequestDrawer"
        >
          ×
        </button>

      </div>


      <div class="biz-request-body">

        <div class="biz-request-grid">

          <div>
            <span>المنشأة</span>

            <strong>
              ${
                entity
                  ? businessEscape(
                      entity.name
                    )
                  : '—'
              }
            </strong>

            <small>
              ${
                entity
                  ? businessEscape(
                      entity.code
                    )
                  : ''
              }
            </small>
          </div>


          <div>
            <span>
              نوع المنشأة
            </span>

            <strong>
              ${
                entity
                  ? businessEscape(
                      entity.entity_type
                    )
                  : '—'
              }
            </strong>
          </div>


          <div>
            <span>
              الباقة
            </span>

            <strong>
              ${
                plan
                  ? businessEscape(
                      plan.name
                    )
                  : '—'
              }
            </strong>
          </div>


          <div>
            <span>
              الخدمة
            </span>

            <strong>
              ${businessEscape(
                service.name
              )}
            </strong>
          </div>


          <div>
            <span>
              تاريخ الإرسال
            </span>

            <strong>
              ${businessFormatDateTime(
                request.created_at
              )}
            </strong>
          </div>


          <div>
            <span>
              الموظف المسند إليه
            </span>

            <strong>
              ${
                employee
                  ? businessEscape(
                      employee.name
                    )
                  : 'غير مسند'
              }
            </strong>
          </div>


          <div>
            <span>
              رصيد الخدمة
            </span>

            <strong>
              ${
                entity
                  ? businessQuotaLabel(
                      entity,
                      request.service_key
                    )
                  : '—'
              }
            </strong>
          </div>


          <div>
            <span>
              نوع الاحتساب
            </span>

            <strong>
              ${
                request.quota_type ===
                'unlimited'
                  ? 'ضمن الباقة — بلا حدود'
                  : request.quota_type ===
                    'extra'
                  ? 'خدمة إضافية'
                  : 'ضمن الباقة'
              }
            </strong>

            <small>
              ${
                request.quota_counted
                  ? 'تم احتساب الخدمة'
                  : 'لم يتم الخصم بعد'
              }
            </small>
          </div>

        </div>


        <section class="biz-request-section">

          <h3>
            تفاصيل الطلب
          </h3>

          <div class="biz-request-note">
            ${businessEscape(
              request.details ||
              'لا توجد تفاصيل'
            )}
          </div>

        </section>


        <section class="biz-request-section">

          <h3>
            تحديث ظاهر للمنشأة
          </h3>

          <div class="biz-request-note">
            ${businessEscape(
              request.client_visible_note ||
              'لا يوجد تحديث ظاهر للمنشأة'
            )}
          </div>

        </section>


        <section class="biz-request-section">

          <h3>
            ملاحظة داخلية
          </h3>

          <div class="biz-request-note biz-internal">
            ${businessEscape(
              request.internal_note ||
              'لا توجد ملاحظة داخلية'
            )}
          </div>

        </section>


        <section class="biz-request-section">

          <h3>
            سجل تغييرات الحالة
          </h3>

          <div class="biz-history">

            ${
              history.length
                ? history
                    .map(
                      function (item) {
                        return `
                          <div class="biz-history-item">

                            <span>
                              ${businessFormatDateTime(
                                item.created_at
                              )}
                            </span>

                            <strong>
                              ${businessStatusLabel(
                                item.old_status
                              )}
                              ←
                              ${businessStatusLabel(
                                item.new_status
                              )}
                            </strong>

                            <p>
                              ${businessEscape(
                                item.note ||
                                ''
                              )}
                            </p>

                            <small>
                              ${businessEscape(
                                item.changed_by ||
                                '—'
                              )}
                            </small>

                          </div>
                        `;
                      }
                    )
                    .join('')
                : `
                    <div class="biz-empty">
                      لا توجد تغييرات مسجلة بعد
                    </div>
                  `
            }

          </div>

        </section>

      </div>
    `;


    overlay.classList.add(
      'biz-open'
    );


    document.body.style.overflow =
      'hidden';


    const closeButton =
      document.getElementById(
        'bizCloseRequestDrawer'
      );


    if (closeButton) {
      closeButton.onclick =
        closeBusinessRequest;
    }
  }


  function closeBusinessRequest() {
    const overlay =
      document.getElementById(
        'bizRequestOverlay'
      );


    if (overlay) {
      overlay.classList.remove(
        'biz-open'
      );
    }


    document.body.style.overflow =
      '';
  }


  /* =========================================================
     الأحداث
     ========================================================= */
  function bindBusinessEvents() {
    const page =
      document.getElementById(
        'page-business'
      );


    if (!page) {
      return;
    }


    page.addEventListener(
      'click',
      function (event) {
        const requestElement =
          event.target.closest(
            '[data-business-request]'
          );


        if (requestElement) {
          openBusinessRequest(
            requestElement.dataset
              .businessRequest
          );

          return;
        }


        const entityElement =
          event.target.closest(
            '[data-business-entity]'
          );


        if (entityElement) {
          openBusinessEntity(
            entityElement.dataset
              .businessEntity
          );
        }
      }
    );


    const overlay =
      document.getElementById(
        'bizRequestOverlay'
      );


    if (overlay) {
      overlay.addEventListener(
        'click',
        function (event) {
          if (
            event.target ===
            overlay
          ) {
            closeBusinessRequest();
          }
        }
      );
    }


    const search =
      document.getElementById(
        'bizSearch'
      );


    const status =
      document.getElementById(
        'bizFilterStatus'
      );


    const service =
      document.getElementById(
        'bizFilterService'
      );


    const plan =
      document.getElementById(
        'bizFilterPlan'
      );


    const employee =
      document.getElementById(
        'bizFilterEmployee'
      );


    const priority =
      document.getElementById(
        'bizFilterPriority'
      );


    const dateFrom =
      document.getElementById(
        'bizDateFrom'
      );


    const dateTo =
      document.getElementById(
        'bizDateTo'
      );


    const reset =
      document.getElementById(
        'bizResetFilters'
      );


    if (search) {
      search.addEventListener(
        'input',
        function () {
          BUSINESS_STATE.filters.search =
            this.value.trim();

          renderBusinessTable();
        }
      );
    }


    if (status) {
      status.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.status =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (service) {
      service.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.service =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (plan) {
      plan.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.plan =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (employee) {
      employee.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.employee =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (priority) {
      priority.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.priority =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (dateFrom) {
      dateFrom.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.dateFrom =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (dateTo) {
      dateTo.addEventListener(
        'change',
        function () {
          BUSINESS_STATE.filters.dateTo =
            this.value;

          renderBusinessTable();
        }
      );
    }


    if (reset) {
      reset.addEventListener(
        'click',
        resetBusinessFilters
      );
    }
  }


  function resetBusinessFilters() {
    BUSINESS_STATE.filters = {
      search: '',
      status: 'all',
      service: 'all',
      plan: 'all',
      employee: 'all',
      priority: 'all',
      dateFrom: '',
      dateTo: ''
    };


    const fields = {
      bizSearch: '',
      bizFilterStatus: 'all',
      bizFilterService: 'all',
      bizFilterPlan: 'all',
      bizFilterEmployee: 'all',
      bizFilterPriority: 'all',
      bizDateFrom: '',
      bizDateTo: ''
    };


    Object.keys(fields).forEach(
      function (id) {
        const element =
          document.getElementById(
            id
          );

        if (element) {
          element.value =
            fields[id];
        }
      }
    );


    renderBusinessTable();
  }


  /* =========================================================
     تحديث الصفحة
     ========================================================= */
  function renderBusinessPage() {
    if (!mountBusinessPage()) {
      return;
    }


    fillBusinessFilterOptions();

    renderBusinessKpis();

    renderBusinessRecent();

    renderBusinessCards();

    renderBusinessTable();
  }


  /* =========================================================
     إتاحة الدالة لـ app.js
     ========================================================= */
  window.renderBusinessPage =
    renderBusinessPage;


  window.ArafBusiness = {
  render: renderBusinessPage,

  openEntity:
    openBusinessEntity,

  openRequest:
    openBusinessRequest,

  data:
    BUSINESS_DATA,

  plans:
    BUSINESS_PLANS,

  services:
    BUSINESS_SERVICES,

  employees:
    BUSINESS_EMPLOYEES
};

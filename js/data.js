/* =============================================================
   منصة أعراف لإدارة الطلبات | البيانات التجريبية (Mock Data)
   -------------------------------------------------------------
   TODO Supabase: استبدال هذا الملف بـ services تتصل بقاعدة البيانات
   كل كائن هنا يقابل جدولاً في Supabase حسب المخطط المقترح:
     - employees
     - service_requests
     - request_notes
     - request_activity_log
     - support_tickets
   ============================================================= */

const MOCK_DATA = {
  // ===== الموظفون =====
  employees: [
    {
      id: 'EMP-001',
      full_name: 'خالد العتيبي',
      email: 'admin@araf.sa',
      phone: '0501234567',
      password: 'admin123', // TODO: نقل لـ Supabase Auth (لا تُخزّن كلمات المرور بصيغة plain)
      role: 'admin',
      status: 'active',
      created_at: '2025-12-01T08:00:00',
      last_login_at: '2026-05-13T07:45:00'
    },
    {
      id: 'EMP-002',
      full_name: 'سارة الزهراني',
      email: 'sara@araf.sa',
      phone: '0509876543',
      password: 'emp123',
      role: 'employee',
      status: 'active',
      created_at: '2026-01-15T10:30:00',
      last_login_at: '2026-05-13T09:12:00'
    },
    {
      id: 'EMP-003',
      full_name: 'محمد القحطاني',
      email: 'mohammed@araf.sa',
      phone: '0533445566',
      password: 'emp123',
      role: 'employee',
      status: 'active',
      created_at: '2026-02-01T11:00:00',
      last_login_at: '2026-05-12T16:40:00'
    },
    {
      id: 'EMP-004',
      full_name: 'نورة الشهري',
      email: 'noura@araf.sa',
      phone: '0541112233',
      password: 'emp123',
      role: 'employee',
      status: 'active',
      created_at: '2026-02-20T09:15:00',
      last_login_at: '2026-05-13T08:55:00'
    },
    {
      id: 'EMP-005',
      full_name: 'عبدالله الحربي',
      email: 'abdullah@araf.sa',
      phone: '0556677889',
      password: 'emp123',
      role: 'employee',
      status: 'inactive',
      created_at: '2026-03-10T13:20:00',
      last_login_at: '2026-04-20T11:30:00'
    },
    {
      id: 'EMP-006',
      full_name: 'لمى الدوسري',
      email: 'lama@araf.sa',
      phone: '0567778899',
      password: 'emp123',
      role: 'employee',
      status: 'active',
      created_at: '2026-03-25T14:00:00',
      last_login_at: '2026-05-13T07:20:00'
    }
  ],

  // ===== الخدمات (أسعار من منصة أعراف) =====
 services: [
    { key: 'consultation',       name: 'استشارة قانونية',              price: 100, color: 'tl' },
    { key: 'case_study',         name: 'دراسة قضية والتوكيل',          price: 400, color: 'nv' },
    { key: 'contract_review',    name: 'مراجعة عقد',                  price: 150, color: 'gd' },
    { key: 'contract_draft',     name: 'صياغة عقد',                   price: 250, color: 'purple' },
    { key: 'najiz',              name: 'خدمات منصة ناجز',              price: 200, color: 'green' },
    { key: 'memo',               name: 'إعداد مذكرة قانونية',          price: 300, color: 'orange' },

    { key: 'official_letter',    name: 'صياغة خطاب رسمي',              price: 150, color: 'tl' },
    { key: 'gov_violation',      name: 'اعتراض على مخالفة حكومية',      price: 250, color: 'purple' },
    { key: 'lawsuit_draft',      name: 'تجهيز صحيفة دعوى',             price: 200, color: 'green' },
    { key: 'court_session',      name: 'حضور جلسة قضائية',             price: 300, color: 'gd' },
    { key: 'execution_request',  name: 'تقديم طلب تنفيذ عبر ناجز',      price: 300, color: 'orange' }
  ],

  // ===== الطلبات =====
  service_requests: [
    {
      id: 'REQ-2026-0142',
      customer_name: 'فهد المطيري',
      customer_phone: '0551234567',
      service_type: 'consultation',
      price: 250,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'استشارة بخصوص نزاع عمالي مع جهة عمل سابقة. العميل تم فصله بدون إنذار ويرغب بمعرفة حقوقه النظامية ومدى إمكانية رفع دعوى أمام المحكمة العمالية.',
      attachments: ['نسخة العقد.pdf', 'خطاب الفصل.pdf'],
      status: 'new',
      priority: 'normal',
      assigned_to: null,
      assigned_by: null,
      assigned_at: null,
      contacted_at: null,
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-13T09:32:00',
      updated_at: '2026-05-13T09:32:00'
    },
    {
      id: 'REQ-2026-0141',
      customer_name: 'منى السبيعي',
      customer_phone: '0556677443',
      service_type: 'contract_review',
      price: 500,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'طلب مراجعة عقد إيجار تجاري لمحل بمدينة الرياض، المدة 5 سنوات بقيمة سنوية 180,000 ريال.',
      attachments: ['عقد الإيجار.pdf'],
      status: 'assigned',
      priority: 'imp',
      assigned_to: 'EMP-002',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-13T08:15:00',
      contacted_at: null,
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-13T07:48:00',
      updated_at: '2026-05-13T08:15:00'
    },
    {
      id: 'REQ-2026-0140',
      customer_name: 'شركة الخليج للتجارة',
      customer_phone: '0114567890',
      service_type: 'case_study',
      price: 1500,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'قضية تجارية كبرى ضد مورد لم يلتزم بشروط التوريد. قيمة المطالبة 2.4 مليون ريال. يحتاج العميل دراسة شاملة والتمثيل أمام المحكمة التجارية.',
      attachments: ['عقد التوريد.pdf', 'المراسلات.pdf', 'الفواتير.pdf'],
      status: 'progress',
      priority: 'urgent',
      assigned_to: 'EMP-001',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-12T11:00:00',
      contacted_at: '2026-05-12T13:30:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-12T10:25:00',
      updated_at: '2026-05-13T08:00:00'
    },
    {
      id: 'REQ-2026-0139',
      customer_name: 'عبدالرحمن العنزي',
      customer_phone: '0531122334',
      service_type: 'najiz',
      price: 350,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'طلب رفع دعوى مطالبة مالية عبر منصة ناجز بقيمة 45,000 ريال ضد مستأجر متعثر.',
      attachments: ['عقد الإيجار.pdf', 'الإيصالات.pdf'],
      status: 'contacted',
      priority: 'normal',
      assigned_to: 'EMP-004',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-12T09:00:00',
      contacted_at: '2026-05-12T10:15:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-12T08:30:00',
      updated_at: '2026-05-12T10:15:00'
    },
    {
      id: 'REQ-2026-0138',
      customer_name: 'هيا الراشد',
      customer_phone: '0507788990',
      service_type: 'contract_draft',
      price: 800,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'صياغة عقد عمل لموظفة جديدة بشركة استشارات صغيرة. شامل بنود السرية وعدم المنافسة.',
      attachments: [],
      status: 'waiting',
      priority: 'normal',
      assigned_to: 'EMP-003',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-11T14:00:00',
      contacted_at: '2026-05-11T15:30:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-11T13:45:00',
      updated_at: '2026-05-12T10:00:00'
    },
    {
      id: 'REQ-2026-0137',
      customer_name: 'سلطان الدوسري',
      customer_phone: '0541239876',
      service_type: 'memo',
      price: 1200,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'إعداد مذكرة دفاع في قضية مالية منظورة أمام المحكمة التجارية، الجلسة بعد أسبوعين.',
      attachments: ['ملف القضية.pdf', 'لائحة الادعاء.pdf'],
      status: 'review',
      priority: 'urgent',
      assigned_to: 'EMP-002',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-11T10:00:00',
      contacted_at: '2026-05-11T11:00:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-11T09:20:00',
      updated_at: '2026-05-13T08:30:00'
    },
    {
      id: 'REQ-2026-0136',
      customer_name: 'ريم القرني',
      customer_phone: '0561234567',
      service_type: 'consultation',
      price: 250,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'استشارة في قضية أحوال شخصية تتعلق بالنفقة والحضانة.',
      attachments: [],
      status: 'done',
      priority: 'normal',
      assigned_to: 'EMP-004',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-10T11:00:00',
      contacted_at: '2026-05-10T12:30:00',
      closed_by: 'EMP-004',
      closed_at: '2026-05-10T16:00:00',
      close_note: 'تم تقديم الاستشارة عبر مكالمة مرئية 45 دقيقة. العميلة راضية وستعود لاحقاً للتوكيل.',
      created_at: '2026-05-10T10:45:00',
      updated_at: '2026-05-10T16:00:00'
    },
    {
      id: 'REQ-2026-0135',
      customer_name: 'مؤسسة النور للمقاولات',
      customer_phone: '0114988776',
      service_type: 'contract_review',
      price: 500,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'مراجعة عقد مقاولة لمشروع حكومي بقيمة 1.2 مليون ريال.',
      attachments: ['عقد المقاولة.pdf', 'الكراسة الفنية.pdf'],
      status: 'closed',
      priority: 'imp',
      assigned_to: 'EMP-003',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-08T09:00:00',
      contacted_at: '2026-05-08T10:00:00',
      closed_by: 'EMP-003',
      closed_at: '2026-05-09T15:30:00',
      close_note: 'تم تسليم تقرير المراجعة مع 12 ملاحظة. العميل اعتمد التعديلات.',
      created_at: '2026-05-08T08:45:00',
      updated_at: '2026-05-09T15:30:00'
    },
    {
      id: 'REQ-2026-0134',
      customer_name: 'أحمد الزهراني',
      customer_phone: '0509871234',
      service_type: 'consultation',
      price: 250,
      payment_status: 'pending',
      source: 'direct_services',
      details: 'استشارة بخصوص شراكة تجارية مع مستثمر أجنبي.',
      attachments: [],
      status: 'pending',
      priority: 'normal',
      assigned_to: null,
      assigned_by: null,
      assigned_at: null,
      contacted_at: null,
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-13T08:50:00',
      updated_at: '2026-05-13T08:50:00'
    },
    {
      id: 'REQ-2026-0133',
      customer_name: 'فاطمة الغامدي',
      customer_phone: '0533221100',
      service_type: 'najiz',
      price: 350,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'استخراج صك حصر إرث ومتابعته في ناجز.',
      attachments: ['الوثائق المطلوبة.zip'],
      status: 'late',
      priority: 'high',
      assigned_to: 'EMP-006',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-05T10:00:00',
      contacted_at: '2026-05-05T11:30:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-05T09:45:00',
      updated_at: '2026-05-07T14:00:00'
    },
    {
      id: 'REQ-2026-0132',
      customer_name: 'بدر القحطاني',
      customer_phone: '0501122334',
      service_type: 'contract_draft',
      price: 800,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'صياغة عقد شراكة بين مستثمرين سعوديين لإنشاء شركة تقنية.',
      attachments: ['الشروط المتفق عليها.pdf'],
      status: 'done',
      priority: 'imp',
      assigned_to: 'EMP-002',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-09T11:00:00',
      contacted_at: '2026-05-09T12:00:00',
      closed_by: 'EMP-002',
      closed_at: '2026-05-11T14:00:00',
      close_note: 'تم تسليم العقد بنسخته النهائية بعد 3 مراجعات.',
      created_at: '2026-05-09T10:30:00',
      updated_at: '2026-05-11T14:00:00'
    },
    {
      id: 'REQ-2026-0131',
      customer_name: 'وفاء الحارثي',
      customer_phone: '0567890123',
      service_type: 'consultation',
      price: 250,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'استشارة عمالية بخصوص نهاية خدمة.',
      attachments: [],
      status: 'closed',
      priority: 'normal',
      assigned_to: 'EMP-004',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-07T13:00:00',
      contacted_at: '2026-05-07T14:30:00',
      closed_by: 'EMP-004',
      closed_at: '2026-05-07T18:00:00',
      close_note: 'تم الرد عبر مكالمة هاتفية ومذكرة مكتوبة.',
      created_at: '2026-05-07T12:45:00',
      updated_at: '2026-05-07T18:00:00'
    },
    {
      id: 'REQ-2026-0130',
      customer_name: 'يوسف الشمري',
      customer_phone: '0533445599',
      service_type: 'memo',
      price: 1200,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'مذكرة استئناف على حكم محكمة عمالية ابتدائية.',
      attachments: ['الحكم الابتدائي.pdf'],
      status: 'progress',
      priority: 'urgent',
      assigned_to: 'EMP-003',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-10T10:00:00',
      contacted_at: '2026-05-10T11:00:00',
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-10T09:30:00',
      updated_at: '2026-05-12T16:00:00'
    },
    {
      id: 'REQ-2026-0129',
      customer_name: 'دانة الفهد',
      customer_phone: '0541112299',
      service_type: 'contract_review',
      price: 500,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'مراجعة عقد عمل قبل التوقيع.',
      attachments: ['العقد المقترح.pdf'],
      status: 'assigned',
      priority: 'normal',
      assigned_to: 'EMP-006',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-13T07:30:00',
      contacted_at: null,
      closed_by: null,
      closed_at: null,
      close_note: null,
      created_at: '2026-05-13T07:00:00',
      updated_at: '2026-05-13T07:30:00'
    },
    {
      id: 'REQ-2026-0128',
      customer_name: 'تركي العمري',
      customer_phone: '0501234890',
      service_type: 'najiz',
      price: 350,
      payment_status: 'paid',
      source: 'direct_services',
      details: 'تقديم اعتراض على قرار إداري عبر منصة ناجز.',
      attachments: ['القرار الإداري.pdf'],
      status: 'closed',
      priority: 'imp',
      assigned_to: 'EMP-002',
      assigned_by: 'EMP-001',
      assigned_at: '2026-05-06T09:00:00',
      contacted_at: '2026-05-06T10:30:00',
      closed_by: 'EMP-002',
      closed_at: '2026-05-08T13:00:00',
      close_note: 'تم تقديم الاعتراض وحفظ رقم القيد.',
      created_at: '2026-05-06T08:30:00',
      updated_at: '2026-05-08T13:00:00'
    }
  ],

  // ===== ملاحظات الطلبات =====
  request_notes: [
    {
      id: 'N-001',
      request_id: 'REQ-2026-0140',
      employee_id: 'EMP-001',
      note: 'اجتماع تمهيدي تم مع العميل. المستندات كافية لبدء الدراسة. الجلسة الأولى متوقعة خلال 3 أسابيع.',
      created_at: '2026-05-12T13:30:00'
    },
    {
      id: 'N-002',
      request_id: 'REQ-2026-0140',
      employee_id: 'EMP-001',
      note: 'تم رفع لائحة الدعوى أمام المحكمة التجارية بالرياض. رقم القيد: 2026-TC-0892.',
      created_at: '2026-05-13T08:00:00'
    },
    {
      id: 'N-003',
      request_id: 'REQ-2026-0138',
      employee_id: 'EMP-003',
      note: 'العميلة لم ترسل المعلومات الكاملة للموظفة (الراتب، تاريخ التعيين، المسمى الوظيفي). تم طلبها مرة أخرى.',
      created_at: '2026-05-12T10:00:00'
    },
    {
      id: 'N-004',
      request_id: 'REQ-2026-0137',
      employee_id: 'EMP-002',
      note: 'المذكرة في مرحلة المراجعة النهائية. سيتم إرسالها للعميل خلال يومين.',
      created_at: '2026-05-13T08:30:00'
    }
  ],

  // ===== سجل النشاط =====
  activity_log: [
    { id: 'A-001', request_id: 'REQ-2026-0142', actor_id: null, action_type: 'created', description: 'تم استلام طلب جديد من العميل فهد المطيري', created_at: '2026-05-13T09:32:00' },
    { id: 'A-002', request_id: 'REQ-2026-0141', actor_id: 'EMP-001', action_type: 'assigned', description: 'أسند الطلب إلى سارة الزهراني', created_at: '2026-05-13T08:15:00' },
    { id: 'A-003', request_id: 'REQ-2026-0140', actor_id: 'EMP-001', action_type: 'status_changed', description: 'غيّر الحالة من "مسند" إلى "قيد التنفيذ"', created_at: '2026-05-13T08:00:00' },
    { id: 'A-004', request_id: 'REQ-2026-0140', actor_id: 'EMP-001', action_type: 'note_added', description: 'أضاف ملاحظة على الطلب', created_at: '2026-05-13T08:00:00' },
    { id: 'A-005', request_id: 'REQ-2026-0129', actor_id: 'EMP-001', action_type: 'assigned', description: 'أسند الطلب إلى لمى الدوسري', created_at: '2026-05-13T07:30:00' },
    { id: 'A-006', request_id: 'REQ-2026-0131', actor_id: 'EMP-004', action_type: 'closed', description: 'أغلق الطلب', created_at: '2026-05-07T18:00:00' },
    { id: 'A-007', request_id: 'REQ-2026-0135', actor_id: 'EMP-003', action_type: 'closed', description: 'أغلق الطلب', created_at: '2026-05-09T15:30:00' },
    { id: 'A-008', request_id: 'REQ-2026-0140', actor_id: 'EMP-001', action_type: 'contacted', description: 'سجّل التواصل مع العميل', created_at: '2026-05-12T13:30:00' },
    { id: 'A-009', request_id: 'REQ-2026-0139', actor_id: 'EMP-004', action_type: 'contacted', description: 'سجّل التواصل مع العميل', created_at: '2026-05-12T10:15:00' },
    { id: 'A-010', request_id: 'REQ-2026-0138', actor_id: 'EMP-003', action_type: 'status_changed', description: 'غيّر الحالة إلى "بانتظار مستندات"', created_at: '2026-05-12T10:00:00' }
  ],

  // ===== الإشعارات =====
  notifications: [
    { id: 'NT-001', type: 'new',  text: 'طلب جديد من فهد المطيري — استشارة قانونية', time: 'قبل 12 دقيقة' },
    { id: 'NT-002', type: 'late', text: 'طلب REQ-2026-0133 تأخر — لدى لمى الدوسري', time: 'قبل ساعة' },
    { id: 'NT-003', type: 'done', text: 'محمد القحطاني أغلق طلب REQ-2026-0135', time: 'قبل 4 ساعات' },
    { id: 'NT-004', type: 'supp', text: 'تذكرة دعم فني جديدة من العميل أحمد الزهراني', time: 'قبل 5 ساعات' },
    { id: 'NT-005', type: 'new',  text: 'طلب جديد من مؤسسة الخليج — دراسة قضية', time: 'أمس' }
  ]
};

// ===== دوال مساعدة =====
const HELPERS = {
  /** الحصول على اسم الخدمة */
  getServiceName(key) {
    const s = MOCK_DATA.services.find(s => s.key === key);
    return s ? s.name : key;
  },

  /** الحصول على بيانات الموظف */
  getEmployee(id) {
    if (!id) return null;
    return MOCK_DATA.employees.find(e => e.id === id);
  },

  /** أحرف الاسم (أول حرفين) */
  initials(name) {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
  },

  /** ترجمة الحالة */
  statusLabel(s) {
    const map = {
      new: 'جديد',
      pending: 'بانتظار التوزيع',
      assigned: 'مسند لموظف',
      review: 'قيد المراجعة',
      contacted: 'تم التواصل',
      waiting: 'بانتظار مستندات',
      progress: 'قيد التنفيذ',
      done: 'مكتمل',
      closed: 'مغلق',
      cancelled: 'ملغي',
      late: 'متأخر'
    };
    return map[s] || s;
  },

  /** ترجمة الأولوية */
  priorityLabel(p) {
    return { normal: 'عادي', imp: 'مهم', urgent: 'عاجل', high: 'عالي الخطورة' }[p] || p;
  },

  /** ترجمة حالة الدفع */
  paymentLabel(p) {
    return { paid: 'مدفوع', unpaid: 'غير مدفوع', pending: 'بانتظار التحقق' }[p] || p;
  },

  /** ترجمة المصدر */
  sourceLabel(s) {
  return {
    direct_services: 'الخدمات المباشرة',
    cases: 'طلبات توكيل القضايا',
    custom_case: 'قضية غير مدرجة',
    custom_service: 'خدمة غير مدرجة',
    support: 'الدعم الفني',
    support_ticket: 'محوّل من الدعم الفني',
    subscription: 'الباقة الشهرية',
    ai_assistant: 'المساعد القانوني'
  }[s] || s;
},

  /** تنسيق التاريخ */
  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  },

  formatDateTime(iso) {
    if (!iso) return '—';
    return this.formatDate(iso) + ' · ' + this.formatTime(iso);
  },

  /** الوقت النسبي */
  timeAgo(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff/3600)} ساعة`;
    if (diff < 604800) return `قبل ${Math.floor(diff/86400)} يوم`;
    return this.formatDate(iso);
  },

  /** تنسيق السعر */
  formatPrice(p) {
    return new Intl.NumberFormat('ar-SA').format(p);
  },

  /** عدد الطلبات المفتوحة لكل موظف */
  openRequestsByEmployee(empId) {
    return MOCK_DATA.service_requests.filter(r =>
      r.assigned_to === empId &&
      !['done', 'closed', 'cancelled'].includes(r.status)
    ).length;
  },

  /** عدد الطلبات المغلقة لكل موظف */
  closedRequestsByEmployee(empId) {
    return MOCK_DATA.service_requests.filter(r =>
      r.closed_by === empId
    ).length;
  }
};

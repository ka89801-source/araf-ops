// ─── MOCK DATA ─── //
const EMPLOYEES = [
  { id: 'E001', name: 'محمد الزهراني', initials: 'مز', role: 'محامٍ أول', color: '#1E3D56', bg: 'rgba(30,61,86,.12)', active: true, open: 8, done: 142, avgTime: '2.4 يوم' },
  { id: 'E002', name: 'سارة العتيبي',  initials: 'سع', role: 'مستشارة قانونية', color: '#7C3AED', bg: 'rgba(124,58,237,.1)', active: true, open: 5, done: 98, avgTime: '1.8 يوم' },
  { id: 'E003', name: 'خالد الدوسري',  initials: 'خد', role: 'محامٍ', color: '#0891B2', bg: 'rgba(8,145,178,.1)', active: true, open: 11, done: 74, avgTime: '3.1 يوم' },
  { id: 'E004', name: 'نورة القحطاني', initials: 'نق', role: 'مساعدة قانونية', color: '#C9A96E', bg: 'rgba(201,169,110,.15)', active: true, open: 3, done: 55, avgTime: '1.2 يوم' },
  { id: 'E005', name: 'عبدالله المطيري', initials: 'عم', role: 'محامٍ', color: '#16A34A', bg: 'rgba(22,163,74,.1)', active: false, open: 0, done: 31, avgTime: '2.9 يوم' },
  { id: 'E006', name: 'ريم الشمري',    initials: 'رش', role: 'مستشارة', color: '#DC2626', bg: 'rgba(220,38,38,.1)', active: true, open: 7, done: 88, avgTime: '2.2 يوم' },
];

const SERVICE_TYPES = {
  consultation: 'استشارة محامٍ',
  contract_gen:  'توليد عقد',
  contract_rev:  'فحص عقد',
  memo:          'مذكرة قانونية',
  najiz:         'خدمات ناجز',
  power_atty:    'توكيل قضائي',
};

const STATUS_META = {
  new:      { label: 'جديد',           cls: 'badge-new',      icon: '✦' },
  review:   { label: 'قيد المراجعة',   cls: 'badge-review',   icon: '◎' },
  waiting:  { label: 'بانتظار العميل', cls: 'badge-waiting',  icon: '◷' },
  assigned: { label: 'مسند لموظف',     cls: 'badge-assigned', icon: '◉' },
  done:     { label: 'مكتمل',          cls: 'badge-done',     icon: '✔' },
  closed:   { label: 'مغلق',           cls: 'badge-closed',   icon: '✕' },
  urgent:   { label: 'عاجل',           cls: 'badge-urgent',   icon: '⚡' },
};

const PRIORITY_META = {
  high: { label: 'عالية', cls: 'p-high' },
  med:  { label: 'متوسطة', cls: 'p-med' },
  low:  { label: 'منخفضة', cls: 'p-low' },
};

const REQUESTS = [
  {
    id: 'REQ-2401', client: 'أحمد بن سعد العمري', phone: '0501234567',
    service: 'consultation', status: 'urgent', priority: 'high',
    subject: 'نزاع عقاري مع مطور عقاري',
    details: 'العميل يطلب استشارة عاجلة بخصوص نزاع مع شركة تطوير عقاري رفضت تسليم الوحدة السكنية في الموعد المتفق عليه وفق العقد.',
    assignedTo: 'E001',
    created: '2026-04-07T08:22:00',
    updated: '2026-04-07T10:15:00',
    attachments: [{ name: 'عقد_البيع.pdf', size: '2.4 ميغابايت' }, { name: 'صورة_الهوية.jpg', size: '840 كيلوبايت' }],
    timeline: [
      { action: 'وصل الطلب', meta: 'اليوم، 8:22 ص', color: 'blue', note: null },
      { action: 'تم تصنيفه عاجل', meta: 'اليوم، 8:30 ص', color: 'gold', note: 'قضية ذات حساسية زمنية عالية' },
      { action: 'أُسند إلى محمد الزهراني', meta: 'اليوم، 8:45 ص', color: 'gold', note: null },
      { action: 'بدأ المراجعة', meta: 'اليوم، 9:00 ص', color: 'green', note: null },
    ],
    comments: [
      { author: 'محمد الزهراني', initials: 'مز', time: 'اليوم، 9:05 ص', text: 'تم مراجعة العقد المرفق، يبدو أن هناك بند فاصل في المادة السادسة يصب في مصلحة العميل.' }
    ]
  },
  {
    id: 'REQ-2400', client: 'شركة الأمل للتجارة',  phone: '0557654321',
    service: 'contract_gen', status: 'review', priority: 'med',
    subject: 'طلب صياغة عقد توزيع حصري',
    details: 'الشركة تحتاج إلى عقد توزيع حصري لمنتجاتها في منطقة الرياض مع وكيل جديد.',
    assignedTo: 'E002',
    created: '2026-04-06T14:00:00',
    updated: '2026-04-07T09:30:00',
    attachments: [{ name: 'شروط_الاتفاقية.docx', size: '156 كيلوبايت' }],
    timeline: [
      { action: 'وصل الطلب', meta: 'أمس، 2:00 م', color: 'blue', note: null },
      { action: 'أُسند إلى سارة العتيبي', meta: 'أمس، 2:30 م', color: 'gold', note: null },
      { action: 'قيد المراجعة', meta: 'اليوم، 9:30 ص', color: 'green', note: 'بدأت مراجعة المتطلبات' },
    ],
    comments: []
  },
  {
    id: 'REQ-2399', client: 'فيصل الغامدي',       phone: '0533344455',
    service: 'contract_rev', status: 'waiting', priority: 'med',
    subject: 'فحص عقد شراكة تجارية',
    details: 'العميل يريد مراجعة عقد شراكة تجارية قبل التوقيع عليه مع شريك أجنبي.',
    assignedTo: 'E001',
    created: '2026-04-06T10:00:00',
    updated: '2026-04-06T16:00:00',
    attachments: [{ name: 'عقد_الشراكة.pdf', size: '3.1 ميغابايت' }],
    timeline: [
      { action: 'وصل الطلب', meta: '6 أبريل، 10:00 ص', color: 'blue', note: null },
      { action: 'أُسند إلى محمد الزهراني', meta: '6 أبريل، 10:20 ص', color: 'gold', note: null },
      { action: 'بانتظار مستندات إضافية', meta: '6 أبريل، 4:00 م', color: 'gray', note: 'طُلب من العميل تزويدنا بالنسخة الإنجليزية من العقد' },
    ],
    comments: [{ author: 'محمد الزهراني', initials: 'مز', time: '6 أبريل، 4:00 م', text: 'بانتظار النسخة الإنجليزية للمقارنة.' }]
  },
  {
    id: 'REQ-2398', client: 'منى السلمي',          phone: '0509988776',
    service: 'power_atty', status: 'assigned', priority: 'low',
    subject: 'طلب توكيل في قضية ميراث',
    details: 'العميلة تطلب تقديم توكيل لتمثيلها في قضية ميراث أمام المحكمة العامة.',
    assignedTo: 'E003',
    created: '2026-04-05T09:00:00',
    updated: '2026-04-06T11:00:00',
    attachments: [],
    timeline: [
      { action: 'وصل الطلب', meta: '5 أبريل', color: 'blue', note: null },
      { action: 'أُسند إلى خالد الدوسري', meta: '5 أبريل', color: 'gold', note: null },
    ],
    comments: []
  },
  {
    id: 'REQ-2397', client: 'مجموعة الوطن',        phone: '0555667788',
    service: 'memo', status: 'done', priority: 'high',
    subject: 'إعداد مذكرة قانونية لقضية عمالية',
    details: 'المجموعة تحتاج إلى مذكرة قانونية احترافية في قضية نزاع عمالي.',
    assignedTo: 'E002',
    created: '2026-04-04T08:00:00',
    updated: '2026-04-06T14:00:00',
    attachments: [{ name: 'القضية_العمالية.pdf', size: '1.8 ميغابايت' }],
    timeline: [
      { action: 'وصل الطلب', meta: '4 أبريل', color: 'blue', note: null },
      { action: 'أُسند إلى سارة العتيبي', meta: '4 أبريل', color: 'gold', note: null },
      { action: 'اكتمل الطلب', meta: '6 أبريل', color: 'green', note: 'تم إرسال المذكرة للعميل بنجاح' },
    ],
    comments: [{ author: 'سارة العتيبي', initials: 'سع', time: '6 أبريل', text: 'تم الانتهاء من إعداد المذكرة وإرسالها.' }]
  },
  {
    id: 'REQ-2396', client: 'ناصر الشريف',         phone: '0544332211',
    service: 'najiz', status: 'new', priority: 'med',
    subject: 'طلب خدمات ناجز - تسجيل عقار',
    details: 'العميل يريد المساعدة في تسجيل عقار في منصة ناجز الإلكترونية.',
    assignedTo: null,
    created: '2026-04-07T11:00:00',
    updated: '2026-04-07T11:00:00',
    attachments: [{ name: 'وثيقة_الملكية.pdf', size: '990 كيلوبايت' }],
    timeline: [
      { action: 'وصل الطلب', meta: 'اليوم، 11:00 ص', color: 'blue', note: null },
    ],
    comments: []
  },
  {
    id: 'REQ-2395', client: 'لمياء الرشيدي',       phone: '0521122334',
    service: 'consultation', status: 'closed', priority: 'low',
    subject: 'استشارة في قانون الأحوال الشخصية',
    details: 'العميلة طلبت استشارة قانونية حول إجراءات قانون الأحوال الشخصية.',
    assignedTo: 'E004',
    created: '2026-04-03T13:00:00',
    updated: '2026-04-05T10:00:00',
    attachments: [],
    timeline: [
      { action: 'وصل الطلب', meta: '3 أبريل', color: 'blue', note: null },
      { action: 'أُسند إلى نورة القحطاني', meta: '3 أبريل', color: 'gold', note: null },
      { action: 'تم إغلاق الطلب', meta: '5 أبريل', color: 'gray', note: 'تم تقديم الاستشارة وأكدت العميلة الرضا التام' },
    ],
    comments: []
  },
  {
    id: 'REQ-2394', client: 'عبدالرحمن الحربي',    phone: '0566778899',
    service: 'contract_gen', status: 'urgent', priority: 'high',
    subject: 'صياغة عقد عمل عاجل',
    details: 'صاحب العمل يحتاج لعقد عمل لموظف جديد يبدأ غداً.',
    assignedTo: 'E006',
    created: '2026-04-07T12:00:00',
    updated: '2026-04-07T12:30:00',
    attachments: [],
    timeline: [
      { action: 'وصل الطلب', meta: 'اليوم، 12:00 م', color: 'blue', note: null },
      { action: 'تصنيف عاجل', meta: 'اليوم، 12:05 م', color: 'gold', note: null },
      { action: 'أُسند إلى ريم الشمري', meta: 'اليوم، 12:10 م', color: 'gold', note: null },
    ],
    comments: []
  },
];

const NOTIFICATIONS = [
  { id: 'N1', type: 'urgent', title: 'طلب عاجل جديد', body: 'وصل طلب عاجل من العميل أحمد العمري يتعلق بنزاع عقاري', time: 'منذ 5 دقائق', read: false, icon: '⚡' },
  { id: 'N2', type: 'new',    title: 'طلب جديد', body: 'طلب خدمات ناجز من ناصر الشريف', time: 'منذ 32 دقيقة', read: false, icon: '✦' },
  { id: 'N3', type: 'assign', title: 'تحويل طلب', body: 'تم تحويل الطلب REQ-2394 إلى ريم الشمري', time: 'منذ ساعة', read: false, icon: '↗' },
  { id: 'N4', type: 'done',   title: 'اكتمل طلب', body: 'تم إكمال الطلب REQ-2397 من سارة العتيبي', time: 'منذ ساعتين', read: true, icon: '✔' },
  { id: 'N5', type: 'remind', title: 'تذكير بموعد متابعة', body: 'الطلب REQ-2399 لم يُحدّث منذ أكثر من يوم', time: 'منذ 3 ساعات', read: true, icon: '◷' },
  { id: 'N6', type: 'new',    title: 'طلب جديد', body: 'طلب عقد توزيع حصري من شركة الأمل', time: 'أمس', read: true, icon: '✦' },
  { id: 'N7', type: 'assign', title: 'إسناد طلب', body: 'تم إسناد الطلب REQ-2398 إلى خالد الدوسري', time: 'أمس', read: true, icon: '↗' },
];

// ─── HELPERS ─── //
function getEmployee(id) { return EMPLOYEES.find(e => e.id === id) || null; }

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function serviceLabel(key) { return SERVICE_TYPES[key] || key; }
function statusMeta(key) { return STATUS_META[key] || { label: key, cls: '', icon: '' }; }
function priorityMeta(key) { return PRIORITY_META[key] || { label: key, cls: '' }; }

// Computed stats
function getStats() {
  const all = REQUESTS;
  return {
    new:      all.filter(r => r.status === 'new').length,
    review:   all.filter(r => r.status === 'review').length,
    waiting:  all.filter(r => r.status === 'waiting').length,
    assigned: all.filter(r => r.status === 'assigned').length,
    done:     all.filter(r => r.status === 'done').length,
    urgent:   all.filter(r => r.status === 'urgent').length,
    closed:   all.filter(r => r.status === 'closed').length,
    total:    all.length,
    unread:   NOTIFICATIONS.filter(n => !n.read).length,
  };
}

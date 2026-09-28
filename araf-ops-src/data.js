/* ==========================================================
   أعراف — مركز العمليات | بيانات حية من المنصة الأصلية
   تُحمّل السجلات بعد التحقق من جلسة الإدارة
   ========================================================== */
const TODAY = new Date();

/* ---------- الفريق ---------- */
const TEAM = [];
let ME = null;

/* ---------- الحالات والأولويات والدفع ---------- */
const ST = {
  new: { l: 'جديد', c: '#3B6C8C', b: 'b-blue' },
  pending: { l: 'بانتظار التوزيع', c: '#AE7B22', b: 'b-amber' },
  assigned: { l: 'مسند لموظف', c: '#6A5A8C', b: 'b-ghost' },
  contacted: { l: 'تم التواصل', c: '#3D7759', b: 'b-green' },
  waiting: { l: 'بانتظار مستندات', c: '#C9A96E', b: 'b-gold' },
  progress: { l: 'قيد التنفيذ', c: '#1B3A4B', b: 'b-navy' },
  review: { l: 'قيد المراجعة', c: '#7FA3B8', b: 'b-blue' },
  done: { l: 'مكتمل', c: '#3D7759', b: 'b-green' },
  closed: { l: 'مغلق', c: '#A3ADB3', b: 'b-ghost' },
  cancelled: { l: 'ملغي', c: '#B3452D', b: 'b-red' },
};
const OPEN_ST = ['new', 'pending', 'assigned', 'contacted', 'waiting', 'progress', 'review'];
const PRI = {
  high: { l: 'عالي الخطورة', c: '#B3452D', b: 'b-red', o: 0 },
  urgent: { l: 'عاجل', c: '#C4643F', b: 'b-red', o: 1 },
  imp: { l: 'مهم', c: '#AE7B22', b: 'b-amber', o: 2 },
  normal: { l: 'عادي', c: '#A3ADB3', b: 'b-ghost', o: 3 },
};
const PAY = {
  paid: { l: 'مدفوع', b: 'b-green' },
  pending: { l: 'بانتظار التحقق', b: 'b-amber' },
  manual_pending: { l: 'بانتظار الدفع', b: 'b-amber' },
  pending_quote: { l: 'بانتظار التسعير', b: 'b-gold' },
  unpaid: { l: 'غير مدفوع', b: 'b-red' },
};
const SRC = {
  direct_services: 'الخدمات المباشرة', cases: 'طلبات التوكيل', custom_case: 'قضية غير مدرجة', custom_service: 'خدمة غير مدرجة',
  support_ticket: 'محوّل من الدعم', subscription: 'باقة منشأة', ai_assistant: 'المساعد القانوني',
  whatsapp: 'واتساب', call: 'اتصال', instagram: 'إنستغرام', linkedin: 'لينكدإن', referral: 'إحالة', old_customer: 'عميل سابق',
};
const EXT_SRC = ['whatsapp', 'call', 'instagram', 'linkedin', 'referral', 'old_customer'];

/* ---------- الخدمات المباشرة ---------- */
const SERVICES = [
  { key: 'consultation', name: 'استشارة قانونية', price: 100, c: '#3B6C8C' },
  { key: 'contract_review', name: 'مراجعة عقد', price: 150, c: '#C9A96E' },
  { key: 'contract_draft', name: 'صياغة عقد', price: 250, c: '#6A5A8C' },
  { key: 'najiz', name: 'خدمات منصة ناجز', price: 200, c: '#3D7759' },
  { key: 'memo', name: 'إعداد مذكرة قانونية', price: 300, c: '#C4643F' },
  { key: 'official_letter', name: 'صياغة خطاب رسمي', price: 150, c: '#7FA3B8' },
  { key: 'gov_violation', name: 'اعتراض على مخالفة حكومية', price: 250, c: '#8A6AA0' },
  { key: 'lawsuit_draft', name: 'تجهيز صحيفة دعوى', price: 200, c: '#4D8A6A' },
  { key: 'court_session', name: 'حضور جلسة قضائية', price: 300, c: '#97773C' },
  { key: 'execution_request', name: 'تقديم طلب تنفيذ عبر ناجز', price: 300, c: '#AE7B22' },
  { key: 'tahaqaq_answer', name: 'أعراف تحقّق — إجابة قانونية', price: 49, c: '#C9A96E' },
  { key: 'tahaqaq_document', name: 'أعراف تحقّق — صحيفة أو مذكرة', price: 99, c: '#3B6C8C' },
  { key: 'tahaqaq_path', name: 'أعراف تحقّق — مسار القضية', price: 99, c: '#1B3A4B' },
  { key: 'tahaqaq_contract', name: 'أعراف تحقّق — عقد أو اتفاقية', price: 99, c: '#6A5A8C' },
  { key: 'tahaqaq_full', name: 'أعراف تحقّق — ملف القضية كاملًا', price: 299, c: '#3D7759' },
];
const CASE_TYPES = [
  { key: 'labor', name: 'قضية عمالية', price: 400, c: '#3B6C8C' },
  { key: 'commercial', name: 'قضية تجارية', price: 400, c: '#1B3A4B' },
  { key: 'family', name: 'قضية أحوال شخصية', price: 400, c: '#C9A96E' },
  { key: 'realestate', name: 'قضية عقارية', price: 400, c: '#7FA3B8' },
  { key: 'execution', name: 'قضية تنفيذ', price: 400, c: '#97773C' },
  { key: 'admin', name: 'قضية إدارية', price: 400, c: '#6A5A8C' },
  { key: 'financial', name: 'مطالبة مالية', price: 400, c: '#3D7759' },
];
const SV = (k) => SERVICES.find((s) => s.key === k) || CASE_TYPES.find((s) => s.key === k) || { name: k, price: 0, c: '#A3ADB3' };

/* اتفاقية مستوى الخدمة الداخلية (مقترحة في هذا النموذج) */
const SLA = { assign: 4, contact: 24, close: 72, remind: 48 };


/* ---------- الطلبات ---------- */
const REQUESTS = [];

/* ---------- المنشآت (أعراف للأعمال) ---------- */
const BIZ_SERVICES = {
  consult: 'استشارة قانونية', contracts: 'صياغة أو مراجعة عقد', letters: 'صياغة أو مراجعة خطاب أو إنذار', najiz: 'رفع طلب عبر ناجز',
  violations: 'اعتراض على مخالفة حكومية', governance: 'إعداد أو مراجعة عمل حوكمة', memos: 'إعداد مذكرة قانونية',
  risk_review: 'مراجعة قانونية شهرية', negotiation: 'حضور اجتماع تفاوضي عن بُعد', general: 'طلب قانوني آخر',
};
const PLANS = {
  asas: { key: 'asas', name: 'أعراف أساس', price: 500, c: '#3B6C8C', quota: { consult: 3, contracts: 2, letters: 2, najiz: 2, violations: 1, governance: 0, memos: 0, risk_review: 0, negotiation: 0, general: 0 } },
  numu: { key: 'numu', name: 'أعراف نمو', price: 2500, c: '#C9A96E', quota: { consult: 10, contracts: 5, letters: 5, najiz: 5, violations: 3, governance: 3, memos: 0, risk_review: 0, negotiation: 0, general: 0 } },
  plus: { key: 'plus', name: 'أعراف بلس', price: 5000, c: '#1B3A4B', quota: { consult: -1, contracts: 10, letters: 10, najiz: 10, violations: 6, governance: 6, memos: 3, risk_review: 1, negotiation: 1, general: 0 } },
};
const BIZ_ST = {
  new: { l: 'جديد', c: '#3B6C8C', b: 'b-blue' }, under_review: { l: 'قيد المراجعة', c: '#7FA3B8', b: 'b-blue' },
  in_progress: { l: 'قيد التنفيذ', c: '#1B3A4B', b: 'b-navy' }, awaiting_client: { l: 'بانتظار رد المنشأة', c: '#AE7B22', b: 'b-amber' },
  completed: { l: 'مكتمل', c: '#3D7759', b: 'b-green' }, cancelled: { l: 'ملغي', c: '#B3452D', b: 'b-red' },
};
const ENTITIES = [];
const BIZ_REQUESTS = [];

/* طلبات تفعيل المنشآت */
const ACT_ST = { new: { l: 'جديد', b: 'b-blue' }, contacted: { l: 'تم التواصل', b: 'b-amber' }, activated: { l: 'مفعّل', b: 'b-green' }, closed: { l: 'مرفوض / مغلق', b: 'b-ghost' } };
const ACTIVATIONS = [];

/* ---------- الدعم الفني ---------- */
const TICKETS = [];

/* ---------- سجل النشاط والإشعارات ---------- */
const LOG = [];
const NOTIFS = [];

/* سلاسل للرسوم */
const DAY_LABELS = [];
const TREND_IN = [];
const TREND_CLOSED = [];
const MONTHS = [];
const REV_MONTH = [];

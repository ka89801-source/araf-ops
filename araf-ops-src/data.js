/* ==========================================================
   أعراف — مركز العمليات | بيانات تجريبية
   التاريخ المرجعي: الأربعاء 16 سبتمبر 2026
   ========================================================== */
const TODAY = new Date(2026, 8, 16);
const D = (m, d, hh = 0, mm = 0, y = 2026) => new Date(y, m - 1, d, hh, mm);

/* ---------- الفريق ---------- */
const TEAM = [
  { id: 'EMP-001', name: 'خالد العتيبي', short: 'خالد', ini: 'خ', role: 'مدير العمليات', roleKey: 'admin', c: '#1B3A4B', cap: 14, status: 'active', email: 'khalid@araf.sa', phone: '0501234567', skills: ['تجاري', 'تنفيذ'], last: D(9, 16, 7, 40), joined: D(12, 1, 0, 0, 2025) },
  { id: 'EMP-002', name: 'سارة الزهراني', short: 'سارة', ini: 'س', role: 'محامية أولى', roleKey: 'employee', c: '#97773C', cap: 12, status: 'active', email: 'sara@araf.sa', phone: '0509876543', skills: ['عقود', 'عمالي'], last: D(9, 16, 8, 12), joined: D(1, 15) },
  { id: 'EMP-003', name: 'محمد القحطاني', short: 'محمد', ini: 'م', role: 'محامٍ', roleKey: 'employee', c: '#3B6C8C', cap: 12, status: 'active', email: 'mohammed@araf.sa', phone: '0533445566', skills: ['مذكرات', 'استئناف'], last: D(9, 15, 16, 40), joined: D(2, 1) },
  { id: 'EMP-004', name: 'نورة الشهري', short: 'نورة', ini: 'ن', role: 'أخصائية طلبات', roleKey: 'employee', c: '#3D7759', cap: 12, status: 'active', email: 'noura@araf.sa', phone: '0541112233', skills: ['ناجز', 'تنفيذ'], last: D(9, 16, 8, 55), joined: D(2, 20) },
  { id: 'EMP-006', name: 'لمى الدوسري', short: 'لمى', ini: 'ل', role: 'أخصائية طلبات', roleKey: 'employee', c: '#6A5A8C', cap: 10, status: 'active', email: 'lama@araf.sa', phone: '0567778899', skills: ['استشارات', 'خطابات'], last: D(9, 16, 7, 20), joined: D(3, 25) },
  { id: 'EMP-005', name: 'عبدالله الحربي', short: 'عبدالله', ini: 'ع', role: 'محامٍ', roleKey: 'employee', c: '#A0553E', cap: 10, status: 'inactive', email: 'abdullah@araf.sa', phone: '0556677889', skills: ['عقاري'], last: D(8, 20, 11, 30), joined: D(3, 10) },
];
const ME = 'EMP-001';

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

let _rn = 0;
function R(o) {
  _rn++;
  return Object.assign({
    id: 'REQ-2026-0' + (200 - _rn), kind: 'direct', attachments: [], notes: [], priority: 'normal',
    assigned_to: null, assigned_by: null, assigned_at: null, contacted_at: null, closed_at: null, closed_by: null, close_note: null,
    source: o.kind === 'cases' ? 'cases' : 'direct_services', payment: 'paid', details: 'لا توجد تفاصيل إضافية.',
  }, o, { price: o.price != null ? o.price : SV(o.service).price, updated_at: o.updated_at || o.created_at });
}
const N = (by, at, text) => ({ by, at, text });

/* ---------- الطلبات ---------- */
const REQUESTS = [
  R({ customer: 'فهد المطيري', phone: '0551234567', service: 'consultation', status: 'new', created_at: D(9, 16, 9, 32), priority: 'normal',
    details: 'استشارة بخصوص نزاع عمالي مع جهة عمل سابقة. العميل فُصل دون إنذار ويرغب بمعرفة حقوقه النظامية ومدى إمكانية رفع دعوى أمام المحكمة العمالية.', attachments: ['نسخة العقد.pdf', 'خطاب الفصل.pdf'] }),
  R({ customer: 'منى السبيعي', phone: '0556677443', service: 'contract_review', status: 'new', created_at: D(9, 16, 8, 5), priority: 'imp',
    details: 'مراجعة عقد إيجار تجاري لمحل بالرياض، المدة 5 سنوات بقيمة سنوية 180,000 ريال.', attachments: ['عقد الإيجار.pdf'] }),
  R({ customer: 'شركة الخليج للتجارة', phone: '0114567890', service: 'memo', status: 'progress', priority: 'urgent', created_at: D(9, 14, 10, 25),
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 14, 11, 0), contacted_at: D(9, 14, 13, 30), updated_at: D(9, 16, 8, 0), org: true,
    details: 'مذكرة دفاع في نزاع توريد مع مورد لم يلتزم بالكميات المتفق عليها. قيمة المطالبة 2.4 مليون ريال.', attachments: ['عقد التوريد.pdf', 'المراسلات.pdf', 'الفواتير.pdf'],
    notes: [N('EMP-003', D(9, 15, 13, 30), 'اجتماع تمهيدي تم مع ممثل الشركة. المستندات كافية لبدء الصياغة.'), N('EMP-003', D(9, 16, 8, 0), 'المسودة الأولى جاهزة، تحتاج مراجعة خالد قبل الإرسال.')] }),
  R({ customer: 'عبدالرحمن العنزي', phone: '0531122334', service: 'najiz', status: 'contacted', created_at: D(9, 15, 8, 30),
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 15, 9, 0), contacted_at: D(9, 15, 10, 15), updated_at: D(9, 15, 10, 15),
    details: 'رفع دعوى مطالبة مالية عبر ناجز بقيمة 45,000 ريال ضد مستأجر متعثر.', attachments: ['عقد الإيجار.pdf', 'الإيصالات.pdf'] }),
  R({ customer: 'هيا الراشد', phone: '0507788990', service: 'contract_draft', status: 'waiting', created_at: D(9, 11, 14, 0),
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 11, 14, 30), contacted_at: D(9, 11, 16, 0), updated_at: D(9, 12, 10, 0),
    details: 'صياغة عقد عمل لموظفة جديدة بشركة استشارات صغيرة، شامل بنود السرية وعدم المنافسة.',
    notes: [N('EMP-002', D(9, 12, 10, 0), 'العميلة لم ترسل بيانات الموظفة كاملة (الراتب، تاريخ التعيين، المسمى). طُلبت مرة أخرى.')] }),
  R({ customer: 'بندر الشهراني', phone: '0559900112', service: 'official_letter', status: 'assigned', priority: 'imp', created_at: D(9, 15, 12, 10),
    assigned_to: 'EMP-006', assigned_by: 'EMP-001', assigned_at: D(9, 15, 13, 0), updated_at: D(9, 15, 13, 0),
    details: 'خطاب إنذار رسمي لشريك في مؤسسة قبل اللجوء للقضاء.' }),
  R({ customer: 'مؤسسة نسيج للأزياء', phone: '0112233445', service: 'gov_violation', status: 'progress', priority: 'urgent', created_at: D(9, 13, 9, 15), org: true,
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 13, 10, 0), contacted_at: D(9, 13, 12, 0), updated_at: D(9, 15, 15, 0),
    details: 'اعتراض على مخالفة بلدية بقيمة 20,000 ريال على فرع بحي الملقا.', attachments: ['محضر المخالفة.pdf'] }),
  R({ customer: 'سلطان الغامدي', phone: '0502244668', service: 'tahaqaq_answer', status: 'done', created_at: D(9, 15, 19, 40),
    assigned_to: 'EMP-006', assigned_by: 'EMP-001', assigned_at: D(9, 15, 19, 55), contacted_at: D(9, 15, 20, 10), closed_at: D(9, 16, 9, 30), closed_by: 'EMP-006', updated_at: D(9, 16, 9, 30),
    close_note: 'أُرسلت الإجابة القانونية مع الإحالة النظامية للمادة 74 من نظام العمل.', details: 'سؤال عن مدة الإشعار النظامية قبل إنهاء عقد غير محدد المدة.' }),
  R({ customer: 'ريم العتيبي', phone: '0544433221', service: 'consultation', status: 'assigned', created_at: D(9, 16, 7, 50),
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 16, 8, 20), updated_at: D(9, 16, 8, 20),
    details: 'استشارة بخصوص حقوقها في شركة عائلية بعد وفاة المورّث.' }),
  R({ customer: 'مصنع الروابي للبلاستيك', phone: '0113344556', service: 'contract_review', status: 'review', created_at: D(9, 12, 11, 0), org: true, priority: 'imp',
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 12, 11, 40), contacted_at: D(9, 12, 14, 0), updated_at: D(9, 15, 9, 0),
    details: 'مراجعة عقد توزيع حصري لمنتجات المصنع في المنطقة الشرقية.', attachments: ['مسودة العقد.docx'] }),
  R({ customer: 'ماجد الحربي', phone: '0506671290', service: 'lawsuit_draft', status: 'waiting', created_at: D(9, 9, 10, 0),
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 9, 11, 0), contacted_at: D(9, 9, 13, 0), updated_at: D(9, 10, 9, 0),
    details: 'تجهيز صحيفة دعوى مطالبة بقيمة 96,000 ريال ضد شركة توظيف.',
    notes: [N('EMP-003', D(9, 10, 9, 0), 'بانتظار صورة الهوية وصك الوكالة من العميل منذ يومين.')] }),
  R({ customer: 'نوف الدوسري', phone: '0565544332', service: 'tahaqaq_document', status: 'new', created_at: D(9, 16, 10, 5), payment: 'pending',
    details: 'طلب مراجعة صحيفة دعوى كتبتها بنفسها قبل تقديمها عبر ناجز.', attachments: ['صحيفة الدعوى.docx'] }),
  R({ customer: 'شركة أفنان الطبية', phone: '0114455667', service: 'execution_request', status: 'progress', created_at: D(9, 8, 9, 30), org: true,
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 8, 10, 0), contacted_at: D(9, 8, 11, 30), updated_at: D(9, 14, 12, 0),
    details: 'طلب تنفيذ حكم تجاري نهائي بقيمة 540,000 ريال.', attachments: ['صك الحكم.pdf'] }),
  R({ customer: 'تركي العمري', phone: '0501234890', service: 'najiz', status: 'closed', priority: 'imp', created_at: D(9, 6, 8, 30),
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 6, 9, 0), contacted_at: D(9, 6, 10, 30), closed_at: D(9, 8, 13, 0), closed_by: 'EMP-002', updated_at: D(9, 8, 13, 0),
    close_note: 'قُدّم الاعتراض وحُفظ رقم القيد 2026-EX-1187.', details: 'اعتراض على قرار إداري عبر ناجز.' }),
  R({ customer: 'دانة الفهد', phone: '0541112299', service: 'contract_review', status: 'done', created_at: D(9, 13, 7, 0),
    assigned_to: 'EMP-006', assigned_by: 'EMP-001', assigned_at: D(9, 13, 7, 30), contacted_at: D(9, 13, 9, 0), closed_at: D(9, 16, 8, 45), closed_by: 'EMP-006', updated_at: D(9, 16, 8, 45),
    close_note: 'رُوجع عقد العمل وأُرسلت 6 ملاحظات تعديل للعميلة.', details: 'مراجعة عقد عمل قبل التوقيع.' }),
  R({ customer: 'يوسف الشمري', phone: '0533445599', service: 'memo', status: 'progress', priority: 'urgent', created_at: D(9, 10, 9, 30),
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 10, 10, 0), contacted_at: D(9, 10, 11, 0), updated_at: D(9, 14, 16, 0),
    details: 'مذكرة استئناف على حكم محكمة عمالية ابتدائية، مهلة الاعتراض تنتهي 22 سبتمبر.', attachments: ['الحكم الابتدائي.pdf'],
    notes: [N('EMP-003', D(9, 14, 16, 0), 'المذكرة في المراجعة النهائية. ترسل للعميل خلال يومين.')] }),
  R({ customer: 'شركة مسار اللوجستية', phone: '0115107744', service: 'contract_draft', status: 'contacted', created_at: D(9, 15, 14, 20), org: true,
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 15, 15, 0), contacted_at: D(9, 15, 16, 30), updated_at: D(9, 15, 16, 30),
    details: 'صياغة اتفاقية عدم منافسة لموظفي الإدارة التنفيذية.' }),
  R({ customer: 'خلود المالكي', phone: '0598877665', service: 'consultation', status: 'done', created_at: D(9, 14, 12, 0),
    assigned_to: 'EMP-006', assigned_by: 'EMP-001', assigned_at: D(9, 14, 12, 20), contacted_at: D(9, 14, 13, 0), closed_at: D(9, 14, 15, 0), closed_by: 'EMP-006', updated_at: D(9, 14, 15, 0),
    close_note: 'أُجريت الاستشارة هاتفيًا لمدة 40 دقيقة وأُرسل ملخص مكتوب.', details: 'استشارة عن حقوق المستأجر عند إخلاء مبكر.' }),
  R({ customer: 'عمر باجابر', phone: '0555566778', service: 'court_session', status: 'assigned', priority: 'imp', created_at: D(9, 15, 17, 30),
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 15, 18, 0), updated_at: D(9, 15, 18, 0),
    details: 'حضور جلسة نيابة عن العميل في المحكمة العمالية يوم 24 سبتمبر.' }),
  R({ customer: 'مؤسسة الضياء التجارية', phone: '0118899001', service: 'tahaqaq_contract', status: 'new', created_at: D(9, 16, 6, 45), org: true, payment: 'pending',
    details: 'فحص عقد امتياز تجاري قبل التوقيع مع طرف سعودي.' }),
  R({ customer: 'أحلام القرني', phone: '0503322110', service: 'official_letter', status: 'done', created_at: D(9, 12, 8, 0),
    assigned_to: 'EMP-006', assigned_by: 'EMP-001', assigned_at: D(9, 12, 8, 30), contacted_at: D(9, 12, 9, 30), closed_at: D(9, 12, 14, 0), closed_by: 'EMP-006', updated_at: D(9, 12, 14, 0),
    close_note: 'أُرسل الخطاب بصيغته النهائية.', details: 'خطاب مطالبة ودية قبل التقاضي.' }),
  R({ customer: 'راكان السديري', phone: '0577889900', service: 'tahaqaq_path', status: 'cancelled', created_at: D(9, 11, 20, 0), payment: 'unpaid',
    closed_at: D(9, 12, 9, 0), closed_by: 'EMP-001', close_note: 'العميل ألغى الطلب قبل بدء العمل، ولم يُخصم أي مبلغ.', details: 'طلب تحديد مسار قضية ميراث.' }),
  R({ customer: 'لينا الحمد', phone: '0522334455', service: 'contract_review', status: 'new', created_at: D(9, 15, 22, 10), source: 'ai_assistant',
    details: 'وصل الطلب من المساعد القانوني بعد محادثة عن عقد شراكة.' }),
  R({ customer: 'صالح البقمي', phone: '0512345678', service: 'consultation', status: 'assigned', created_at: D(9, 16, 6, 15),
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 16, 6, 40), updated_at: D(9, 16, 6, 40),
    details: 'استشارة عن غرامة تأخير في عقد مقاولة.' }),
  R({ customer: 'شركة البيان للاتصالات', phone: '0113456789', service: 'memo', status: 'review', created_at: D(9, 9, 13, 0), org: true, priority: 'imp',
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 9, 14, 0), contacted_at: D(9, 9, 15, 0), updated_at: D(9, 13, 10, 0),
    details: 'مذكرة رد على دعوى عمالية مقامة ضد الشركة.' }),
  R({ customer: 'غادة الفيصل', phone: '0534455667', service: 'najiz', status: 'progress', created_at: D(9, 13, 16, 0),
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 13, 16, 30), contacted_at: D(9, 13, 18, 0), updated_at: D(9, 16, 7, 30),
    details: 'طلب إيقاف خدمات على مدين متعثر.' }),
  R({ customer: 'زياد العمودي', phone: '0566778899', service: 'consultation', status: 'new', created_at: D(9, 16, 10, 48), source: 'whatsapp', payment: 'manual_pending',
    details: 'طلب خارجي عبر واتساب: استشارة عن فسخ عقد إيجار سكني.' }),
  R({ customer: 'شركة رواسي الأعمال', phone: '0114001100', service: 'contract_review', status: 'progress', created_at: D(9, 14, 8, 0), org: true, source: 'subscription', payment: 'paid', price: 0,
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 14, 8, 30), contacted_at: D(9, 14, 10, 0), updated_at: D(9, 15, 11, 0),
    details: 'ضمن باقة أعراف نمو — مراجعة عقد توريد سنوي.' }),

  /* طلبات توكيل القضايا */
  R({ kind: 'cases', customer: 'مشعل الرشيدي', phone: '0551119988', service: 'labor', status: 'new', priority: 'imp', created_at: D(9, 16, 8, 40), payment: 'pending_quote', price: 0,
    details: 'فُصل من العمل بعد 6 سنوات دون مستحقات. يطلب التوكيل لرفع دعوى عمالية.', attachments: ['عقد العمل.pdf'] }),
  R({ kind: 'cases', customer: 'شركة نماء للمقاولات', phone: '0553008841', service: 'commercial', status: 'progress', priority: 'high', created_at: D(9, 2, 9, 0), org: true, price: 140000, payment: 'paid',
    assigned_to: 'EMP-001', assigned_by: 'EMP-001', assigned_at: D(9, 2, 10, 0), contacted_at: D(9, 2, 12, 0), updated_at: D(9, 15, 17, 0),
    details: 'مطالبة بمستخلصات مشروع مجمع سكني بقيمة 2.3 مليون ريال.',
    stage: 'صدر حكم ابتدائي — مهلة الاستئناف', sessions: 4, next_session: D(9, 22, 10, 0), next_action: 'تقديم لائحة الاعتراض قبل 22 سبتمبر', last_session: 'صدر حكم ابتدائي برفض جزء من الطلبات، وبدأت مهلة الاعتراض 30 يومًا.',
    followup_by: 'EMP-001', followup_at: D(9, 15, 17, 0), notes: [N('EMP-001', D(9, 15, 17, 0), 'اللائحة في الإصدار الثالث لدى سارة وتنتظر الاعتماد.')] }),
  R({ kind: 'cases', customer: 'هند السبيعي', phone: '0567803319', service: 'family', status: 'contacted', created_at: D(9, 12, 11, 0), price: 18000, payment: 'manual_pending',
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(9, 12, 12, 0), contacted_at: D(9, 12, 14, 0), updated_at: D(9, 14, 9, 0),
    details: 'طلب حضانة ونفقة لطفلين بعد الطلاق.', stage: 'بانتظار سداد الأتعاب قبل القيد', sessions: 0, next_action: 'متابعة سداد الدفعة الأولى' }),
  R({ kind: 'cases', customer: 'عبدالله المطيري', phone: '0541187702', service: 'realestate', status: 'waiting', priority: 'imp', created_at: D(8, 28, 10, 0), price: 45000, payment: 'paid',
    assigned_to: 'EMP-002', assigned_by: 'EMP-001', assigned_at: D(8, 28, 11, 0), contacted_at: D(8, 28, 13, 0), updated_at: D(9, 1, 10, 0),
    details: 'إلزام شركة تطوير بتسليم وحدة سكنية والتعويض عن التأخير.',
    stage: 'بانتظار مستندات القضية من العميل', sessions: 0, next_action: 'استلام عقد البيع الأصلي', followup_by: 'EMP-002', followup_at: D(9, 1, 10, 0),
    notes: [N('EMP-002', D(9, 1, 10, 0), 'طُلب عقد البيع الأصلي ثلاث مرات دون رد. يحتاج اتصالًا من الإدارة.')] }),
  R({ kind: 'cases', customer: 'مؤسسة سدير الغذائية', phone: '0114602200', service: 'execution', status: 'progress', created_at: D(8, 20, 9, 0), org: true, price: 60000, payment: 'paid',
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(8, 20, 10, 0), contacted_at: D(8, 20, 11, 0), updated_at: D(9, 13, 12, 0),
    details: 'تنفيذ سند لأمر بقيمة 1.24 مليون ريال.', stage: 'إيقاف خدمات المنفذ ضده', sessions: 2, next_session: D(9, 29, 11, 0), next_action: 'متابعة إفصاح البنوك', followup_by: 'EMP-004', followup_at: D(9, 13, 12, 0) }),
  R({ kind: 'cases', customer: 'فيصل الزامل', phone: '0509988776', service: 'financial', status: 'assigned', created_at: D(9, 15, 11, 20), payment: 'pending_quote', price: 0,
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(9, 15, 12, 0), updated_at: D(9, 15, 12, 0),
    details: 'مطالبة مالية بقيمة 180,000 ريال بموجب شيكات مرتجعة.', stage: 'قيد دراسة القضية وتسعيرها', sessions: 0, next_action: 'إرسال عرض الأتعاب' }),
  R({ kind: 'cases', customer: 'مجموعة الواحة الطبية', phone: '0112889090', service: 'admin', status: 'review', created_at: D(9, 7, 13, 0), org: true, price: 38000, payment: 'paid',
    assigned_to: 'EMP-001', assigned_by: 'EMP-001', assigned_at: D(9, 7, 14, 0), contacted_at: D(9, 7, 16, 0), updated_at: D(9, 12, 10, 0),
    details: 'إلغاء قرار إداري بفرض غرامة على أحد الفروع.', stage: 'قيد إعداد صحيفة الدعوى الإدارية', sessions: 0, next_action: 'مراجعة الصحيفة قبل القيد' }),
  R({ kind: 'cases', customer: 'نايف الخالدي', phone: '0523344556', service: 'labor', status: 'done', created_at: D(8, 15, 9, 0), price: 16000, payment: 'paid',
    assigned_to: 'EMP-003', assigned_by: 'EMP-001', assigned_at: D(8, 15, 10, 0), contacted_at: D(8, 15, 12, 0), closed_at: D(9, 11, 14, 0), closed_by: 'EMP-003', updated_at: D(9, 11, 14, 0),
    close_note: 'صدر حكم لصالح الموكل بمبلغ 74,000 ريال، وسُلّم الصك للعميل.', stage: 'اكتملت المعالجة — صدر حكم نهائي', sessions: 3 }),
  R({ kind: 'cases', customer: 'ليلى العمري', phone: '0594412208', service: 'family', status: 'new', created_at: D(9, 15, 20, 30), payment: 'pending_quote', price: 0, source: 'custom_case',
    details: 'قضية غير مدرجة: طلب تنظيم زيارة محضون خارج المدينة.' }),
  R({ kind: 'cases', customer: 'شركة الأفق للتجارة', phone: '0504127780', service: 'commercial', status: 'progress', priority: 'urgent', created_at: D(8, 10, 10, 0), org: true, price: 95000, payment: 'paid',
    assigned_to: 'EMP-001', assigned_by: 'EMP-001', assigned_at: D(8, 10, 11, 0), contacted_at: D(8, 10, 13, 0), updated_at: D(9, 16, 9, 10),
    details: 'مطالبة مالية عن توريدات غير مسددة بقيمة 850,000 ريال.',
    stage: 'قيد المرافعة — تقديم مذكرة التعقيب', sessions: 3, next_session: D(9, 21, 10, 0), next_action: 'تقديم مذكرة التعقيب قبل الجلسة', last_session: 'طلبت الدائرة تعقيب المدعية على دفع التقادم.', followup_by: 'EMP-001', followup_at: D(9, 16, 9, 10) }),
  R({ kind: 'cases', customer: 'وليد الحارثي', phone: '0538877665', service: 'realestate', status: 'cancelled', created_at: D(9, 3, 15, 0), payment: 'unpaid', price: 0,
    closed_at: D(9, 5, 10, 0), closed_by: 'EMP-001', close_note: 'العميل فضّل التسوية الودية ولم يكمل التوكيل.', details: 'نزاع حدود أرض مع الجيران.' }),
  R({ kind: 'cases', customer: 'شركة ركائز العقارية', phone: '0532210456', service: 'execution', status: 'contacted', created_at: D(9, 14, 9, 45), org: true, price: 9000, payment: 'manual_pending',
    assigned_to: 'EMP-004', assigned_by: 'EMP-001', assigned_at: D(9, 14, 10, 30), contacted_at: D(9, 14, 12, 0), updated_at: D(9, 14, 12, 0),
    details: 'تنفيذ حكم إخلاء محل تجاري.', stage: 'بانتظار توقيع الوكالة', sessions: 0, next_action: 'استلام الوكالة الإلكترونية' }),
];

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
const ENTITIES = [
  { id: 'ENT-001', code: 'ARF-1001', name: 'شركة رواسي الأعمال', type: 'شركة', plan: 'numu', sub: 'active', manager: 'EMP-002', phone: '0114001100', contact: 'أ. طارق السالم', start: D(8, 1), cycle_end: D(9, 30), city: 'الرياض', cr: '1010455778',
    usage: { consult: 8, contracts: 5, letters: 2, najiz: 1, violations: 0, governance: 1 } },
  { id: 'ENT-002', code: 'ARF-1002', name: 'مؤسسة مدار التجارية', type: 'مؤسسة', plan: 'asas', sub: 'active', manager: 'EMP-003', phone: '0112233990', contact: 'م. سلطان الفيفي', start: D(8, 5), cycle_end: D(10, 4), city: 'الرياض', cr: '4030118822',
    usage: { consult: 3, contracts: 2, letters: 1, najiz: 0, violations: 0 } },
  { id: 'ENT-003', code: 'ARF-1003', name: 'جمعية أفق للتنمية', type: 'جمعية', plan: 'plus', sub: 'active', manager: 'EMP-004', phone: '0115566778', contact: 'د. ريان الشمري', start: D(7, 15), cycle_end: D(10, 14), city: 'الرياض', cr: '7001223344',
    usage: { consult: 14, contracts: 4, letters: 3, najiz: 2, violations: 1, governance: 2, memos: 1, risk_review: 1 } },
  { id: 'ENT-004', code: 'ARF-1004', name: 'شركة طيف اللوجستية', type: 'شركة', plan: 'numu', sub: 'grace', manager: 'EMP-002', phone: '0118877665', contact: 'أ. هيفاء الدخيل', start: D(6, 20), cycle_end: D(9, 19), city: 'الدمام', cr: '2050998877',
    usage: { consult: 10, contracts: 5, letters: 4, najiz: 5, violations: 2, governance: 0 } },
  { id: 'ENT-005', code: 'ARF-1005', name: 'مؤسسة سناد للتقنية', type: 'مؤسسة', plan: 'asas', sub: 'paused', manager: 'EMP-006', phone: '0119900112', contact: 'م. بندر القرني', start: D(5, 10), cycle_end: D(9, 9), city: 'جدة', cr: '4030556677',
    usage: { consult: 1, contracts: 0, letters: 0, najiz: 0, violations: 0 } },
];
let _bn = 0;
const B = (o) => Object.assign({ id: 'BIZ-' + (++_bn), no: 'ARB-2026-00' + (10 + _bn), quota_type: 'included', units: 1, counted: true, billing: 'included', assigned_to: null, client_note: '', internal_note: '', priority: 'normal' }, o, { updated_at: o.updated_at || o.created_at });
const BIZ_REQUESTS = [
  B({ entity: 'ENT-001', service: 'contracts', subject: 'مراجعة عقد توريد سنوي', status: 'new', priority: 'urgent', created_at: D(9, 16, 9, 0), counted: false,
    details: 'مراجعة عقد توريد سنوي وتحديد البنود ذات المخاطر قبل التوقيع، والعقد مطلوب توقيعه يوم الأحد.' }),
  B({ entity: 'ENT-003', service: 'memos', subject: 'مذكرة قانونية لمجلس الإدارة', status: 'in_progress', created_at: D(9, 14, 10, 30), assigned_to: 'EMP-003',
    details: 'مذكرة عن حدود مسؤولية أعضاء مجلس إدارة الجمعية في القرارات المالية.' }),
  B({ entity: 'ENT-002', service: 'letters', subject: 'إنذار لمورد متأخر', status: 'awaiting_client', created_at: D(9, 11, 12, 0), assigned_to: 'EMP-006',
    details: 'خطاب إنذار قبل فسخ العقد مع مورد تأخر 45 يومًا.', internal_note: 'بانتظار نسخة أمر الشراء من المنشأة.' }),
  B({ entity: 'ENT-001', service: 'consult', subject: 'استشارة عن إنهاء عقد موظف', status: 'completed', created_at: D(9, 9, 9, 0), assigned_to: 'EMP-002', updated_at: D(9, 9, 15, 0),
    details: 'استشارة عن الإجراء النظامي لإنهاء عقد موظف في فترة التجربة.' }),
  B({ entity: 'ENT-003', service: 'najiz', subject: 'رفع طلب تنفيذ عبر ناجز', status: 'under_review', created_at: D(9, 15, 13, 40), assigned_to: 'EMP-004',
    details: 'تنفيذ سند لأمر بقيمة 120,000 ريال.' }),
  B({ entity: 'ENT-004', service: 'contracts', subject: 'صياغة عقد نقل بضائع', status: 'new', priority: 'imp', created_at: D(9, 16, 7, 30), counted: false, quota_type: 'extra', billing: 'extra_billable',
    details: 'العقد خارج حصة الباقة لهذا الشهر — يحتاج تسعيرًا إضافيًا قبل البدء.' }),
  B({ entity: 'ENT-001', service: 'violations', subject: 'اعتراض على مخالفة بلدية', status: 'in_progress', created_at: D(9, 13, 8, 0), assigned_to: 'EMP-004',
    details: 'مخالفة لافتة تجارية بقيمة 5,000 ريال.' }),
  B({ entity: 'ENT-003', service: 'governance', subject: 'مراجعة لائحة الحوكمة', status: 'in_progress', created_at: D(9, 8, 11, 0), assigned_to: 'EMP-002',
    details: 'مواءمة لائحة الحوكمة مع اشتراطات المركز الوطني لتنمية القطاع غير الربحي.' }),
  B({ entity: 'ENT-002', service: 'consult', subject: 'استشارة عن الزكاة والضريبة', status: 'completed', created_at: D(9, 6, 10, 0), assigned_to: 'EMP-006', updated_at: D(9, 6, 16, 0),
    details: 'سؤال عن أثر تغيير النشاط التجاري على الإقرار الضريبي.' }),
  B({ entity: 'ENT-004', service: 'consult', subject: 'استشارة عاجلة قبل جلسة', status: 'awaiting_client', priority: 'urgent', created_at: D(9, 15, 16, 0), assigned_to: 'EMP-003',
    details: 'استشارة قبل جلسة عمالية يوم الأحد.', internal_note: 'المنشأة في مهلة سداد — يحتاج قرار من الإدارة قبل التنفيذ.' }),
];

/* طلبات تفعيل المنشآت */
const ACT_ST = { new: { l: 'جديد', b: 'b-blue' }, contacted: { l: 'تم التواصل', b: 'b-amber' }, activated: { l: 'مفعّل', b: 'b-green' }, closed: { l: 'مرفوض / مغلق', b: 'b-ghost' } };
const ACTIVATIONS = [
  { id: 'ACT-1041', name: 'شركة البيان القابضة', type: 'شركة', cr: '1010778899', contact: 'أ. مشاري العنزي', phone: '0551002030', email: 'legal@albayan.sa', plan: 'numu', status: 'new', at: D(9, 16, 8, 20), city: 'الرياض', note: 'يسأل عن إمكانية إضافة فرعين تحت نفس الاشتراك.' },
  { id: 'ACT-1040', name: 'مؤسسة درب الشرق', type: 'مؤسسة', cr: '4030221133', contact: 'م. عهود الزهراني', phone: '0553004050', email: 'info@darb.sa', plan: 'asas', status: 'contacted', at: D(9, 15, 11, 0), city: 'الدمام', note: 'طُلب السجل التجاري وصورة الهوية.' },
  { id: 'ACT-1039', name: 'شركة أثر للاستشارات', type: 'شركة', cr: '1010334455', contact: 'أ. ندى الحربي', phone: '0556007080', email: 'nada@athar.sa', plan: 'plus', status: 'contacted', at: D(9, 14, 14, 30), city: 'الرياض', note: 'بانتظار تحويل الدفعة الأولى.' },
  { id: 'ACT-1038', name: 'جمعية بناء الخيرية', type: 'جمعية', cr: '7001445566', contact: 'أ. سعود المالكي', phone: '0559008090', email: 'saud@benaa.org', plan: 'numu', status: 'activated', at: D(9, 11, 9, 0), city: 'الرياض', note: 'فُعّل الحساب وسُلّمت بيانات الدخول.' },
  { id: 'ACT-1037', name: 'مؤسسة ضوء التجارية', type: 'مؤسسة', cr: '4030667788', contact: 'أ. هتان الشمري', phone: '0552003040', email: 'hatan@dawa.sa', plan: 'undecided', status: 'closed', at: D(9, 8, 10, 0), city: 'أبها', note: 'رأى أن الباقة أعلى من احتياجه الحالي.' },
];

/* ---------- الدعم الفني ---------- */
const TICKETS = [
  { id: 'TKT-318', customer: 'أحمد الزهراني', phone: '0551239876', at: D(9, 16, 9, 55), status: 'open', channel: 'نموذج الموقع', subject: 'لم يصلني ملف الاستشارة', body: 'دفعت قيمة الاستشارة أمس ووصلني إشعار الدفع، لكن لم يصلني ملف الإجابة على البريد.' },
  { id: 'TKT-317', customer: 'مها العتيبي', phone: '0544556677', at: D(9, 15, 18, 20), status: 'open', channel: 'واتساب', subject: 'أريد تعديل بيانات الطلب', body: 'كتبت رقم جوال خاطئ عند إرسال الطلب وأريد تصحيحه.' },
  { id: 'TKT-316', customer: 'فيصل الدوسري', phone: '0500112233', at: D(9, 15, 12, 0), status: 'converted', channel: 'نموذج الموقع', subject: 'استفسار تحول إلى طلب', body: 'سؤال عن صياغة عقد شراكة تحول إلى طلب خدمة.' },
  { id: 'TKT-315', customer: 'شركة نسيج', phone: '0112233445', at: D(9, 14, 10, 30), status: 'closed', channel: 'بريد', subject: 'مشكلة في الفاتورة الضريبية', body: 'الرقم الضريبي في الفاتورة غير صحيح.' },
];

/* ---------- سجل النشاط والإشعارات ---------- */
const LOG = [
  { at: D(9, 16, 10, 12), by: 'EMP-002', type: 'note', req: null, text: 'أضافت ملاحظة على طلب REQ-2026-0189' },
  { at: D(9, 16, 9, 32), by: null, type: 'created', text: 'وصل طلب جديد من فهد المطيري — استشارة قانونية' },
  { at: D(9, 16, 8, 20), by: 'EMP-001', type: 'assigned', text: 'أسند REQ-2026-0192 إلى سارة الزهراني' },
  { at: D(9, 16, 8, 0), by: 'EMP-003', type: 'status', text: 'غيّر حالة REQ-2026-0198 إلى قيد التنفيذ' },
  { at: D(9, 16, 9, 30), by: 'EMP-006', type: 'closed', text: 'أغلقت REQ-2026-0193 بنتيجة مكتمل' },
  { at: D(9, 15, 17, 0), by: 'EMP-001', type: 'case', text: 'حدّث متابعة قضية شركة نماء للمقاولات' },
  { at: D(9, 15, 13, 0), by: 'EMP-001', type: 'assigned', text: 'أسند REQ-2026-0195 إلى لمى الدوسري' },
  { at: D(9, 15, 10, 15), by: 'EMP-004', type: 'contacted', text: 'سجّلت التواصل مع عبدالرحمن العنزي' },
  { at: D(9, 14, 16, 0), by: 'EMP-003', type: 'note', text: 'أضاف ملاحظة على مذكرة الاستئناف' },
  { at: D(9, 14, 11, 0), by: 'EMP-006', type: 'closed', text: 'أغلقت REQ-2026-0186 بنتيجة مكتمل' },
  { at: D(9, 13, 10, 0), by: 'EMP-001', type: 'employee', text: 'فعّل حساب المنشأة جمعية بناء الخيرية' },
  { at: D(9, 12, 9, 0), by: 'EMP-001', type: 'status', text: 'ألغى REQ-2026-0178 بطلب من العميل' },
];
const NOTIFS = [
  { id: 'n1', g: 'urgent', ic: 'alert', t: '<b>3 طلبات جديدة</b> تجاوزت مهلة الإسناد (4 ساعات)', at: D(9, 16, 10, 0), unread: true, acts: [['عرض الطلبات', 'nav:requests']] },
  { id: 'n2', g: 'urgent', ic: 'clock', t: 'طلب <b>REQ-2026-0189</b> بانتظار مستندات العميل منذ 7 أيام', at: D(9, 16, 8, 0), unread: true, acts: [['فتح الطلب', 'req:REQ-2026-0189']] },
  { id: 'n3', g: 'today', ic: 'user', from: 'EMP-002', t: '<b>سارة</b> طلبت اعتماد مذكرة قبل إرسالها للعميل', at: D(9, 16, 10, 12), unread: true, acts: [['فتح الطلب', 'req:REQ-2026-0198'], ['اعتماد', 'approve:REQ-2026-0198', 'p']] },
  { id: 'n4', g: 'today', ic: 'inbox', t: 'طلب تفعيل منشأة جديد من <b>شركة البيان القابضة</b>', at: D(9, 16, 8, 20), unread: true, acts: [['فتح طلبات التفعيل', 'nav:business']] },
  { id: 'n5', g: 'today', ic: 'msg', t: 'تذكرة دعم جديدة من <b>أحمد الزهراني</b> عن ملف استشارة لم يصل', at: D(9, 16, 9, 55), unread: true, acts: [['فتح التذكرة', 'ticket:TKT-318']] },
  { id: 'n6', g: 'week', ic: 'receipt', t: '<b>طلبان</b> بانتظار التحقق من الدفع منذ أكثر من يوم', at: D(9, 15, 9, 0), acts: [['عرض', 'pay:pending']] },
  { id: 'n7', g: 'week', ic: 'wallet', t: 'اشتراك <b>شركة طيف اللوجستية</b> في مهلة سداد تنتهي خلال 3 أيام', at: D(9, 15, 8, 0), acts: [['فتح المنشأة', 'ent:ENT-004']] },
  { id: 'n8', g: 'team', ic: 'check', from: 'EMP-006', t: '<b>لمى</b> أغلقت طلبين أمس بمتوسط 3 ساعات', at: D(9, 15, 21, 30) },
  { id: 'n9', g: 'team', ic: 'user', from: 'EMP-003', t: '<b>محمد</b> لديه 6 طلبات مفتوحة — الأعلى في الفريق', at: D(9, 16, 7, 0), acts: [['إعادة توزيع', 'nav:team']] },
  { id: 'n10', g: 'system', ic: 'sliders', t: 'طلب <b>تصفير عداد الطلبات</b> بانتظار موافقة مدير آخر', at: D(9, 14, 12, 0), acts: [['مراجعة', 'reset:1']] },
  { id: 'n11', g: 'system', ic: 'refresh', t: 'تمت مزامنة الطلبات الواردة من الموقع بنجاح', at: D(9, 16, 6, 0) },
];

/* سلاسل للرسوم */
const DAY_LABELS = ['الخميس', 'الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'];
const TREND_IN = [7, 3, 5, 9, 11, 8, 6];
const TREND_CLOSED = [5, 2, 4, 7, 8, 9, 4];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];
const REV_MONTH = [17.4, 19.2, 22.6, 20.1, 24.8, 23.3, 26.4, 21, 24.4];
const INCOMING = [
  { customer: 'وليد الشثري', phone: '0556612340', service: 'contract_review', details: 'مراجعة عقد شراكة بين شريكين قبل التوثيق.', payment: 'paid' },
  { customer: 'شركة ميادين للتجارة', phone: '0114778899', service: 'memo', details: 'مذكرة رد على مطالبة مالية من مورد.', org: true, payment: 'pending' },
  { customer: 'أمل الرشود', phone: '0503344556', service: 'consultation', details: 'استشارة عن حقوقها بعد إنهاء عقد عمل مؤقت.', payment: 'paid' },
  { customer: 'فواز الدعجاني', phone: '0577001122', service: 'najiz', kind: 'direct', details: 'رفع طلب تنفيذ حكم عبر ناجز.', payment: 'manual_pending' },
  { customer: 'مؤسسة برق اللوجستية', phone: '0115544332', service: 'commercial', kind: 'cases', details: 'توكيل في نزاع تجاري على عقد نقل.', org: true, payment: 'pending_quote', price: 0 },
];
const LIVE_EVENTS = [
  { by: 'EMP-004', type: 'contacted', text: 'سجّلت التواصل مع غادة الفيصل' },
  { by: null, type: 'created', text: 'وصل طلب جديد من زياد العمودي — استشارة قانونية' },
  { by: 'EMP-006', type: 'status', text: 'غيّرت حالة REQ-2026-0195 إلى قيد التنفيذ' },
  { by: 'EMP-002', type: 'note', text: 'أضافت ملاحظة على طلب مصنع الروابي' },
];

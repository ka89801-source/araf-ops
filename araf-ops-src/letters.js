/* No messaging table/API exists in the original operations integration. */
const unreadLetters=()=>0;
function lettersSec(){return `<div class="sec-h"><div class="sec-t">الملاحظات الداخلية</div></div><p class="muted">اكتب ملاحظات الفريق داخل الطلب؛ تُحفظ في سجله المشترك.</p>`;}
function composeLetter(){toast('المراسلات المستقلة غير مرتبطة بخدمة في المنصة الحالية. استخدم الملاحظات داخل الطلب',{info:true});}
A.compose=A.inbox=composeLetter;

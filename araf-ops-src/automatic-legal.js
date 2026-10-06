/* Reports are persisted by the background worker; the UI also wakes a stalled queue. */
const LEGAL={rows:{},full:{},error:'',poll:null,timer:null,queueing:new Set(),autoAttempts:{},wake:null,lastWake:0,wakeError:''};
const LEGAL_STATES={queued:'بانتظار الفحص',processing:'جارٍ إعداد التقرير',ready:'التقرير جاهز',failed:'يحتاج إعادة المحاولة',outdated:'تغيّرت بيانات الطلب',not_queued:'بانتظار الإدراج التلقائي'};
function legalKey(key){const at=key.indexOf(':');return {kind:key.slice(0,at),id:key.slice(at+1)};}
function lexNew(){}
function lexLive(){return `<button class="btn btn-sm btn-s" data-a="lexPanel">${ic('shieldCheck')}الفاحص القانوني التلقائي</button>`;}
function lexBadge(id){const key='req:'+id,state=LEGAL.rows[key]?.status;return `<span class="legal-request-marker" data-legal-key="${esc(key)}" data-tip="${esc(LEGAL_STATES[state] || 'الفحص القانوني')}">${state==='ready'?ic('shieldCheck'):['queued','processing'].includes(state)?ic('clock'):state==='failed'?ic('alert'):''}</span>`;}
function lexSection(key){
  if(key.startsWith('tk:'))return `<div class="lex"><b>المساعد القانوني</b><button class="btn btn-sm btn-s" data-a="lexManual" data-k="${esc(key)}">طرح سؤال</button></div>`;
  const row=LEGAL.rows[key],state=row?.status;
  const waiting=['queued','processing'].includes(state);
  return `<section class="lex legal-auto" data-lex="${esc(key)}"><div class="row gap8">${ic('shieldCheck')}<b class="grow">التقرير القانوني التحضيري</b><span class="badge ${state==='ready'?'b-green':state==='failed'?'b-red':'b-gold'}">${esc(LEGAL.error?'تعذر تحديث الفحص':LEGAL_STATES[state] || 'التحقق من الفحص…')}</span></div>
    <p class="muted legal-caption">${esc(LEGAL.error || (waiting && LEGAL.wakeError) || (waiting?'يُجهّز في الخلفية ويظهر هنا تلقائيًا؛ يمكنك متابعة العمل على الطلب.':state==='ready'?'تقرير محفوظ يساعدك في تجهيز الأسئلة والمستندات قبل التواصل مع العميل.':state==='outdated'?'التقرير السابق لا يطابق الوصف الحالي؛ يجري تجهيز نسخة محدثة.':row?.error || 'يُدرج الطلب تلقائيًا ويظهر تقريره هنا عند اكتماله، دون الحاجة إلى طلب الفحص.'))}</p>
    <div class="row gap8 wrap">${state==='ready'?`<button class="btn btn-sm btn-p" data-a="lexOpenK" data-k="${esc(key)}">${ic('file')}عرض التقرير</button>`:state==='failed'?`<button class="btn btn-sm btn-s" data-a="lexQueue" data-k="${esc(key)}">${ic('refresh')}${state==='failed'?'إعادة المحاولة':'طلب فحص'}</button>`:''}<button class="btn btn-sm btn-q" data-a="lexManual" data-k="${esc(key)}">سؤال إضافي للمساعد</button></div></section>`;
}
function legalPaint(){
  $$('[data-lex]').forEach(el=>{el.outerHTML=lexSection(el.dataset.lex);});
  $$('[data-legal-key].legal-request-marker').forEach(el=>{const {id}=legalKey(el.dataset.legalKey);el.outerHTML=lexBadge(id);});
}
async function legalRefresh(keys){
  if(!LIVE.ready || !LIVE.store?.v2Rpc)return;
  if(LEGAL.poll)return LEGAL.poll;
  const requested=[...new Set(keys || [...$$('[data-lex]'),...$$('[data-legal-key]')].map(el=>el.dataset.lex || el.dataset.legalKey))].filter(k=>/^(req|biz):/.test(k));
  if(!requested.length)return;
  LEGAL.poll=(async()=>{
    try{
      for(let i=0;i<requested.length;i+=100){
        const batch=requested.slice(i,i+100),rows=await LIVE.store.v2Rpc('ops_v2_legal_status',{p_keys:batch.map(legalKey)});
        if(!Array.isArray(rows))throw new Error('تعذر قراءة حالات الفحص');
        for(const key of batch){const row=rows.find(r=>r.key===key);if(!row || row.status!=='ready' || LEGAL.full[key]?.revision!==row.revision)delete LEGAL.full[key];if(row)LEGAL.rows[key]=row;else delete LEGAL.rows[key];}
      }
      LEGAL.error='';
      await legalEnsureQueued(requested);
      void legalWake();
      const top=DR.stack.at(-1)?.render,key=top?._legalKey;
      if(key && requested.includes(key)){
        if(LEGAL.rows[key]?.status==='ready')await legalLoadReport(key);
        if(DR.stack.at(-1)?.render===top)refreshDrawer();
      }
    }catch(e){LEGAL.error=e.message.includes('بانتظار تفعيل')?'الفاحص التلقائي بانتظار إعداد خدمة الخلفية في Supabase.':e.message;}
    legalPaint();
  })().finally(()=>LEGAL.poll=null);
  return LEGAL.poll;
}
async function legalEnsureQueued(keys){
  let count=0;
  for(const key of keys){
    if(!['not_queued','outdated'].includes(LEGAL.rows[key]?.status) || LEGAL.queueing.has(key))continue;
    if(Date.now()-(LEGAL.autoAttempts[key] || 0)<60000 || count>=5)continue;
    count++;LEGAL.autoAttempts[key]=Date.now();LEGAL.queueing.add(key);
    try{const {kind,id}=legalKey(key);LEGAL.rows[key]=await LIVE.store.v2Rpc('ops_v2_legal_retry',{p_kind:kind,p_request_id:id});}
    catch(e){LEGAL.error=e.message;}
    finally{LEGAL.queueing.delete(key);}
  }
}
async function legalWake(){
  if(!LIVE.ready || !window.opsAuth?.auth || document.hidden || LEGAL.wake)return;
  const pending=Object.values(LEGAL.rows).some(r=>['queued','processing'].includes(r.status));
  if(Date.now()-LEGAL.lastWake<(LEGAL.wakeError || !pending?60000:15000))return;
  LEGAL.lastWake=Date.now();
  LEGAL.wake=(async()=>{
    try{
      const {data,error}=await window.opsAuth.auth.getSession();
      if(error || !data.session?.access_token)throw new Error('انتهت جلسة الدخول؛ سجّل الدخول لاستكمال متابعة الفحص');
      const response=await fetch('api/legal-wake',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(125000),
        headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:'{}'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error || 'تعذر تشغيل الفاحص');
      LEGAL.wakeError='';
    }catch(e){LEGAL.wakeError=e.name==='TimeoutError'?'استغرقت خدمة الفحص وقتًا أطول؛ ستُستكمل المحاولة تلقائيًا':e.message;}
    finally{legalPaint();}
  })().finally(()=>{LEGAL.wake=null;if(!document.hidden)void legalRefresh();});
  return LEGAL.wake;
}
function lexAuto(key){return legalRefresh([key]);}
async function legalLoadReport(key){
  const {kind,id}=legalKey(key),row=await LIVE.store.v2Rpc('ops_v2_legal_report',{p_kind:kind,p_request_id:id,p_full:true});
  LEGAL.rows[key]=row;
  if(row.status==='ready' && row.report)LEGAL.full[key]={...row,text:assistantText(row.report.content),html:legalMarkup(row.report.content)};
  else delete LEGAL.full[key];
  return row;
}
function legalMarkup(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const tags={H1:'h3',H2:'h3',H3:'h4',H4:'h4',P:'p',UL:'ul',OL:'ol',LI:'li',STRONG:'strong',B:'strong',EM:'em',BLOCKQUOTE:'blockquote'};
  const walk=node=>{
    if(node.nodeType===3)return esc(node.textContent);
    if(node.nodeType!==1 || ['SCRIPT','STYLE','IFRAME','OBJECT','IMG','LINK','SVG','FORM','INPUT','BUTTON'].includes(node.tagName))return '';
    if(node.tagName==='BR')return '<br>';
    if(node.tagName==='A'){
      const href=node.getAttribute('href') || '',content=[...node.childNodes].map(walk).join('');
      return /^https?:\/\//i.test(href)?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`:content;
    }
    const content=[...node.childNodes].map(walk).join(''),tag=tags[node.tagName];
    return tag?`<${tag}>${content}</${tag}>`:content;
  };
  return [...doc.body.childNodes].map(walk).join('');
}
function legalPanel(key){
  const row=LEGAL.full[key],state=LEGAL.rows[key]?.status,src=lexSrc(key);
  if(!row)return {head:'<h2 class="h2">التقرير القانوني التحضيري</h2>',body:`<div data-legal-key="${esc(key)}">${lexSection(key)}</div>`};
  const sources=(row.report.sources || []).filter(s=>/^https?:\/\//i.test(s.url || ''));
  return {head:`<div class="row gap8"><span class="badge b-green">تقرير تلقائي محفوظ</span><span class="muted">${esc(dmy(liveDate(row.completed_at)))}</span></div><h2 class="h2">التقرير القانوني التحضيري</h2><p class="muted">${esc(src?.service || '')}</p>`,
    body:`<article data-legal-key="${esc(key)}"><div class="legal-review-note">للمراجعة الداخلية قبل التواصل مع العميل. راجع الاستنتاجات والمصادر؛ لم تُقرأ المرفقات${row.attachments_count?' ('+Number(row.attachments_count)+')':''}.</div>
      <div class="legal-report-text">${row.html || esc(row.text)}</div><div class="dsec"><h4>المصادر القانونية</h4>${sources.length?sources.map(s=>`<a class="li legal-source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${ic('link','width="16" height="16"')}<span>${esc(s.title || s.url)}</span></a>`).join(''):'<p class="muted">لم يُرفق المساعد مصادر؛ تحقق من الأساس النظامي قبل الاعتماد.</p>'}</div>
      <details class="legal-query"><summary>ملخص الطلب ${row.report.input_mode==='full_text'?'— شمل البحث الوصف النصي الكامل':'الذي بُني عليه التقرير'}</summary><p>${esc(row.query)}</p></details></article>`,
    foot:`<button class="btn btn-p" data-a="lexAutoCopy" data-k="${esc(key)}">${ic('copy')}نسخ التقرير</button><button class="btn btn-s" data-a="lexQueue" data-k="${esc(key)}">فحص جديد</button><button class="btn btn-q" data-a="lexManual" data-k="${esc(key)}">سؤال إضافي</button>`};
}
async function lexOpenKey(key){
  if(key.startsWith('tk:'))return lexManualOpenKey(key);
  const render=()=>legalPanel(key);render._legalKey=key;
  // Reauthorize on every open, even when a previous report is in memory.
  delete LEGAL.full[key];openDrawer(render,{wide:true,push:$('#drawer').classList.contains('show')});
  try{await legalLoadReport(key);LEGAL.error='';if(DR.stack.at(-1)?.render===render)refreshDrawer();}
  catch(e){LEGAL.error=e.message;toast(e.message,{info:true});legalPaint();}
}
A.lexOpenK=el=>lexOpenKey(el.dataset.k || el.dataset.id);
A.lexManual=el=>lexManualOpenKey(el.dataset.k);
A.lexPanel=()=>openDrawer(()=>({head:'<h2 class="h2">الفاحص القانوني التلقائي</h2>',body:'<p>تدخل طلبات الخدمات والقضايا وطلبات المنشآت الجديدة طابور الفحص في الخلفية. يحضّر مساعد أعراف تقريرًا محفوظًا مع المصادر والأسئلة والمستندات المقترحة، ويظهر داخل الطلب عند اكتماله.</p><p class="muted" style="margin-top:12px">التقرير لمراجعة المحامي. الفحص يشمل النص المتاح وملخصه؛ المرفقات تحتاج مراجعة منفصلة. لا تُرسل النتيجة إلى العميل تلقائيًا.</p>'}));
A.lexQueue=async el=>{
  const key=el.dataset.k;if(LEGAL.queueing.has(key))return;
  LEGAL.queueing.add(key);el.disabled=true;
  try{const {kind,id}=legalKey(key);LEGAL.rows[key]=await LIVE.store.v2Rpc('ops_v2_legal_retry',{p_kind:kind,p_request_id:id});delete LEGAL.full[key];LEGAL.error='';legalPaint();if(DR.stack.at(-1)?.render?._legalKey===key)refreshDrawer();toast('أُضيف الطلب إلى طابور الفحص');void legalWake();}
  catch(e){toast(e.message,{info:true});}
  finally{LEGAL.queueing.delete(key);el.disabled=false;}
};
A.lexAutoCopy=async el=>{await legalLoadReport(el.dataset.k);const row=LEGAL.full[el.dataset.k];if(!row)return toast('التقرير تغيّر؛ حدّث الطلب',{info:true});await navigator.clipboard.writeText('تقرير تحضيري آلي — لمراجعة المحامي\n\n'+row.text+'\n\nالمصادر:\n'+row.report.sources.map(s=>s.title+' — '+s.url).join('\n'));toast('نُسخ التقرير ومصادره');};
HOOKS.push(()=>{clearTimeout(LEGAL.timer);LEGAL.timer=setTimeout(()=>legalRefresh(),150);});

/* Existing Araf assistant, explicit per-request checks; reports stay in memory. */
const REPORTS = {};
function lexSrc(key) {
  const [k, id] = key.split(':');
  if (k === 'req') { const r = REQ(id); if (!r) return null;
    return { key, kind: r.kind === 'cases' ? 'طلب توكيل في قضية' : 'طلب خدمة قانونية مباشرة', service: svName(r), customer: r.customer, party: r.org ? 'منشأة' : 'فرد',
      details: r.details, attachments: r.attachments, notes: r.notes.map((n) => n.text), stage: r.stage || '', at: r.created_at }; }
  if (k === 'biz') { const b = BIZ_REQUESTS.find((x) => x.id === id); if (!b) return null; const e = ENT(b.entity);
    return { key, kind: `طلب منشأة مشتركة في باقة ${PLANS[e.plan].name}`, service: BIZ_SERVICES[b.service], customer: e.name, party: 'منشأة', details: `${b.subject}. ${b.details}`, attachments: [], notes: b.internal_note ? [b.internal_note] : [], stage: '', at: b.created_at }; }
  if (k === 'tk') { const t = TICKETS.find((x) => x.id === id); if (!t) return null;
    return { key, kind: `تذكرة دعم فني عبر ${t.channel}`, service: t.subject, customer: t.customer, party: 'فرد', details: t.body, attachments: [], notes: [], stage: '', at: t.at }; }
  return null;
}
const lexBusy = new Set();
function lexAuto() {} // Opening a record does not send its data to the assistant.
function lexNew() {}
function lexLive(){return `<button class="btn btn-sm btn-s" data-a="lexPanel">${ic('shieldCheck')}المساعد القانوني للمنصة الحالية</button>`;}
function lexBadge(id){return REPORTS['req:'+id]?`<span class="lex-dot" data-tip="يتوفر رد من المساعد الأصلي">${ic('shieldCheck')}</span>`:'';}
function lexSection(key){const report=REPORTS[key];return `<div class="lex" data-lex="${esc(key)}"><div class="row gap8">${ic('shieldCheck')}<b class="grow">الفاحص القانوني</b><button class="btn btn-sm btn-s" data-a="lexOpenK" data-k="${esc(key)}">${report?'عرض الرد':'فحص بالمساعد الأصلي'}</button></div><p class="muted" style="font-size:12px;margin-top:8px">يراجع الطلب عبر مساعد أعراف الحالي. راجع النتيجة ومصادرها قبل استخدامها.</p></div>`;}
function assistantText(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,iframe,object').forEach(n=>n.remove());
  doc.querySelectorAll('p,li,h1,h2,h3,h4,div,br').forEach(n=>n.append(doc.createTextNode('\n')));
  return doc.body.textContent.trim();
}
function lexOpenKey(key){
  const src=lexSrc(key);if(!src)return;
  const report=REPORTS[key];
  if(report){openDrawer(()=>({head:`<h2 class="h2">رد المساعد القانوني</h2><p>${esc(src.customer)}</p>`,body:`<div class="note" style="white-space:pre-wrap">${esc(report.text)}</div><div class="dsec"><h4>المصادر</h4>${report.sources.filter(s=>/^https?:\/\//i.test(s.url || '')).map(s=>`<a class="li" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title || s.url)}</a>`).join('')}</div><p class="muted">${esc(report.confidence || '')} — ${esc(report.at)}</p>`,foot:`<button class="btn btn-s" data-a="lexCopy" data-k="${esc(key)}">نسخ الرد</button>${key.startsWith('req:')?`<button class="btn btn-p" data-a="lexToNote" data-k="${esc(key)}">حفظ كملاحظة داخلية</button>`:''}<button class="btn btn-q" data-a="lexAgain" data-k="${esc(key)}">فحص جديد</button>`}),{wide:true,push:$('#drawer').classList.contains('show')});return;}
  const query=(src.kind+' — '+src.service+'\n'+src.details).slice(0,1000);
  liveForm('الفحص عبر مساعد أعراف',`<p class="muted">راجع الملخص الذي سيُرسل للمساعد (حتى 1000 حرف). المرفقات لا تُرسل تلقائيًا.</p><textarea class="inp" id="lexQuery" maxlength="1000" style="min-height:180px">${esc(query)}</textarea><p id="lexProgress" role="status"></p>`,async()=>{
    if(lexBusy.has(key))return; const text=val('lexQuery');if(text.length<5)return toast('اكتب ملخصًا أو سؤالًا أوضح',{info:true});
    lexBusy.add(key);$('#lexProgress').textContent='جارٍ فحص الملخص…';const button=$('[data-a="liveSave"]');button.disabled=true;
    try{
      const {data}=await window.opsAuth.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error('انتهت الجلسة');
      const response=await fetch('api/legal-check',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query:text})});
      const result=await response.json();if(!response.ok)throw new Error(result.error || 'تعذر إتمام الفحص');
      REPORTS[key]={text:assistantText(result.content),sources:result.sources || [],confidence:result.confidenceLevel,at:new Date().toLocaleString('ar-SA'),data:{}};
      closeModal();lexOpenKey(key);
    }catch(e){toast(e.message || 'تعذر الاتصال بالمساعد',{info:true});if($('#lexProgress'))$('#lexProgress').textContent='لم يكتمل الفحص';}
    finally{lexBusy.delete(key);if(button.isConnected)button.disabled=false;}
  },'إرسال الملخص للفحص');
}
A.lexOpenK=el=>lexOpenKey(el.dataset.k || el.dataset.id);
A.lexPanel=()=>openDrawer(()=>({head:'<h2 class="h2">الفاحص القانوني</h2>',body:'<p>افتح طلبًا أو قضية أو طلب منشأة، ثم اضغط «فحص بالمساعد الأصلي». الرد والمصادر من مساعد أعراف الحالي.</p>'}));
A.lexAgain=el=>{delete REPORTS[el.dataset.k];lexOpenKey(el.dataset.k);};
A.lexCopy=async el=>{await navigator.clipboard.writeText(REPORTS[el.dataset.k].text);toast('نُسخ رد المساعد');};
A.lexToNote=el=>{const key=el.dataset.k;return LIVE.run('request:'+key.slice(4),()=>LIVE.store.addNote(key.slice(4),'رد المساعد القانوني:\n'+REPORTS[key].text),'حُفظ الرد كملاحظة داخلية');};

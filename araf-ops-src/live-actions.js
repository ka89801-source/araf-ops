/* All mutations are confirmed by the existing backend before UI success. */
LIVE.run = async function(key, task, message='حُفظ التغيير') {
  if(LIVE.pending.has(key)) return;
  LIVE.pending.add(key);
  try {
    await LIVE.store.verify();
    if (LIVE.store.user.id !== ME) throw new Error('تغير الحساب؛ أعد تحميل الصفحة');
    const result=await task();
    await LIVE.refresh();
    closeModal(); if(DR.stack.length) refreshDrawer(); rerender(); livePaintStatus();
    toast(result?.warning || message,{info:!!result?.warning}); return result;
  } catch(e) { toast(e.message || 'تعذر الحفظ. حدّث البيانات للتحقق قبل تكرار الإجراء',{info:true}); }
  finally {LIVE.pending.delete(key);}
};
function liveForm(title,body,save,label='حفظ') {
  openModal(`<div class="m-h"><h3 class="h2 grow">${esc(title)}</h3><button class="icon-btn" data-a="mClose">${ic('x')}</button></div><div class="m-b">${body}</div><div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p" data-a="liveSave">${esc(label)}</button></div>`);
  A.liveSave=save;
}
const liveField=(label,id,value='',type='text')=>`<div class="field" style="margin-bottom:14px"><label>${esc(label)}</label><input class="inp" id="${id}" type="${type}" value="${esc(value)}"></div>`;
const liveSelect=(label,id,options,value)=>`<div class="field" style="margin-bottom:14px"><label>${esc(label)}</label><select class="inp" id="${id}">${options.map(([k,l])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;
const liveNote=(label,id,value='')=>`<div class="field"><label>${esc(label)}</label><textarea class="inp" id="${id}">${esc(value)}</textarea></div>`;
function statusChanges(row,status) {
  const now=new Date().toISOString(); const changes={status};
  if(['done','closed','cancelled'].includes(status)) Object.assign(changes,{closed_at:now,closed_by:ME});
  else Object.assign(changes,{closed_at:null,closed_by:null});
  if(status==='contacted' && !row.contacted_at) changes.contacted_at=now;
  return changes;
}
function setStatus(id,status) {
  return LIVE.run('request:'+id,()=>LIVE.store.patchRequest(id,statusChanges(LIVE.store.rows[id],status)));
};
function assignTo(id,emp) {
  return LIVE.run('request:'+id,()=>{
    LIVE.store.requireUser(true);
    if(!TEAM.some(t=>t.id===emp && t.status==='active'))throw new Error('اختر موظفًا نشطًا');
    const row=LIVE.store.rows[id],now=new Date().toISOString();
    return LIVE.store.patchRequest(id,{assigned_to:emp,assigned_by:ME,assigned_at:now,
      ...(['new','pending'].includes(row.status)?{status:'assigned'}:{})},'assign','إسناد الطلب');
  },'حُفظ إسناد الطلب');
};
A.autoAssign=el=>{
  const best=TEAM.filter(t=>t.status==='active').sort((a,b)=>load(a.id)-load(b.id))[0];
  if(!best)return toast('لا يوجد موظف نشط',{info:true}); return assignTo(el.dataset.id,best.id);
};
A.autoAll=()=>{
  const list=REQUESTS.filter(r=>!r.assigned_to && isOpen(r));
  liveForm('توزيع الطلبات غير المسندة',`<p>سيُسند ${list.length} طلبًا إلى الفريق في المنصة الحالية.</p>`,()=>LIVE.run('assign-all',async()=>{
    LIVE.store.requireUser(true); const active=TEAM.filter(t=>t.status==='active');
    if(!active.length)throw new Error('لا يوجد موظف نشط');
    const loads=Object.fromEntries(active.map(t=>[t.id,empOpen(t.id).length]));let saved=0;
    for(const r of list){const emp=active.slice().sort((a,b)=>loads[a.id]-loads[b.id])[0];
      try{await LIVE.store.patchRequest(r.id,{assigned_to:emp.id,assigned_by:ME,assigned_at:new Date().toISOString(),status:'assigned'},'assign','إسناد تلقائي');saved++;loads[emp.id]++;}
      catch(e){await LIVE.refresh();throw new Error(`حُفظ ${saved} طلبًا وتوقف التوزيع: ${e.message}`);}}
  },'اكتمل حفظ توزيع الطلبات'));
};
A.rebalance=()=>toast('اختر الطلب المطلوب ثم غيّر المسؤول عنه من نافذة الإسناد',{info:true});
A.addNote=el=>{const text=val('noteBox');if(!text)return;return LIVE.run('request:'+el.dataset.id,()=>LIVE.store.addNote(el.dataset.id,text),'حُفظت الملاحظة');};
A.reopen=el=>setStatus(el.dataset.id,REQ(el.dataset.id).assigned_to?'progress':'new');
A.statusModal=el=>{
  const id=el.dataset.id,row=LIVE.store.rows[id];
  liveForm('تغيير حالة الطلب',liveSelect('الحالة','liveState',Object.entries(ST).filter(([k])=>k!=='unknown').map(([k,v])=>[k,v.l]),row.status)+liveNote('تعليق داخلي','liveComment'),()=>LIVE.run('request:'+id,()=>{
    const changes=statusChanges(row,val('liveState')),text=val('liveComment');
    if(text)changes.notes=[...(Array.isArray(row.notes)?row.notes:[]),{by:LIVE.store.user.name,by_id:ME,at:new Date().toISOString(),text}];
    return LIVE.store.patchRequest(id,changes);
  }));
};
A.closeReq=el=>{
  const id=el.dataset.id;
  liveForm('إغلاق الطلب',liveSelect('النتيجة','liveState',[['done','مكتمل'],['closed','مغلق'],['cancelled','ملغي']],'done')+liveNote('ملاحظة الإغلاق','liveComment'),()=>LIVE.run('request:'+id,()=>{
    const note=val('liveComment');if(!note)throw new Error('اكتب ملاحظة الإغلاق');
    return LIVE.store.patchRequest(id,{...statusChanges(LIVE.store.rows[id],val('liveState')),closing_note:note},'close','إغلاق الطلب');
  }));
};
A.quote=el=>{
  const id=el.dataset.id || el.dataset.v;
  liveForm('حفظ قيمة الطلب',liveField('القيمة النهائية بالريال','livePrice',REQ(id).price,'number')+'<p class="muted">تُحفظ القيمة في الطلب. إرسال عرض للعميل إجراء مستقل.</p>',()=>LIVE.run('request:'+id,()=>{
    const price=Number(val('livePrice'));if(!val('livePrice') || !Number.isFinite(price)||price<0)throw new Error('أدخل قيمة صحيحة');
    return LIVE.store.patchRequest(id,{price,payment_status:'manual_pending'});
  }));
};
A.saveCase=el=>LIVE.run('request:'+el.dataset.id,async()=>{
  const count=Number(val('cSess'));if(!Number.isInteger(count)||count<0)throw new Error('عدد الجلسات غير صالح');
  const next=val('cNext');
  const result=await LIVE.store.patchRequest(el.dataset.id,{case_current_stage:val('cStage'),case_last_session_summary:val('cLast'),case_sessions_count:count,
    case_next_action:val('cAct'),case_next_session_at:next?new Date(next+'T10:00:00+03:00').toISOString():null,
    case_followup_updated_at:new Date().toISOString(),case_followup_updated_by:ME,case_followup_updated_by_name:LIVE.store.user.name},'case_followup','تحديث متابعة القضية');
  drawerBack();return result;
},'حُفظت متابعة القضية');
A.qaSave=el=>LIVE.run('create:'+el.dataset.k,async()=>{
  const k=el.dataset.k,now=new Date().toISOString();
  if(!val('qName'))throw new Error('أدخل الاسم');
  if(k==='ext'||k==='case'){
    if(!val('qPhone'))throw new Error('أدخل رقم الجوال');
    const cases=k==='case'||val('qKind')==='cases';const price=k==='case'?0:Number(val('qPrice'));
    if(!Number.isFinite(price)||price<0)throw new Error('السعر غير صالح');
    const assigned=k==='case'?val('qEmp'):'';
    return LIVE.store.insert('service_requests',{customer_name:val('qName'),customer_phone:val('qPhone'),
      service_type:cases?'case_representation':val('qSv'),service_name:SV(val('qSv')).name,
      source:cases?'custom_case':'external_direct',price,payment_status:k==='case'?'pending_quote':val('qPay'),
      details:(k==='ext'?'طلب خارجي — المصدر: '+(SRC[val('qSrc')]||val('qSrc'))+'\n\n':'')+val('qDet'),attachments:[],
      status:assigned?'assigned':'new',priority:k==='case'?'normal':val('qPri'),
      ...(assigned?{assigned_to:assigned,assigned_by:ME,assigned_at:now}:{}),created_at:now,updated_at:now});
  }
  if(k==='emp'){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('qEmail')))throw new Error('أدخل بريدًا صحيحًا');
    return LIVE.store.insert('employees',{id:crypto.randomUUID(),full_name:val('qName'),name:val('qName'),email:val('qEmail'),phone:val('qPhone'),role:val('qRole'),status:'active',created_at:now},true);
  }
  if(k==='ticket'){
    if(!val('qPhone') || !val('qDet'))throw new Error('أدخل الجوال ونص الرسالة');
    return LIVE.store.insert('support_tickets',{name:val('qName'),phone:val('qPhone'),problem:[val('qSubject'),val('qDet')].filter(Boolean).join('\n'),status:'new',created_at:now,updated_at:now});
  }
  if(k==='ent') {
    LIVE.store.requireUser(true);
    const data=await liveApi('create-business-lead',{request_kind:'activation',entity_name:val('qName'),entity_type:val('qType'),contact_name:val('qContact'),phone:val('qPhone'),requested_plan:val('qPlan')});
    if(!data.ok || !data.id)throw new Error('لم يؤكد الخادم إنشاء طلب التفعيل');
    return {data,warning:data.email_sent?'':'حُفظ طلب التفعيل، لكن تعذر إرسال تنبيهه البريدي'};
  }
  throw new Error('نوع السجل غير مدعوم');
},'حُفظ السجل في المنصة الحالية');
// Keep the supplied conversion form; replace its demo callback each time it opens.
const originalConvert=A.convert;
A.convert=el=>{originalConvert(el); A.doConvert=b=>LIVE.run('ticket:'+b.dataset.id,async()=>{const result=await LIVE.store.convertTicket(b.dataset.id,val('cvSv'),SV(val('cvSv')).name,Number(val('cvPrice')),val('cvPay'));closeDrawer();return result;},'حُوّلت التذكرة إلى طلب');};
A.tkClose=el=>LIVE.run('ticket:'+el.dataset.id,async()=>{
  const {data,error}=await window.sb.from('support_tickets').update({status:'closed',updated_at:new Date().toISOString()}).eq('id',el.dataset.id).select('id').single();
  if(error||!data)throw new Error(error?.message||'تعذر إغلاق التذكرة');closeDrawer();
},'أُغلقت التذكرة. لم تُرسل رسالة للعميل');
function askDelete(r){
  const pending=LIVE.deletes.find(d=>d.request_id===r.id);
  if(pending){
    liveForm('طلب حذف بانتظار الاعتماد',`<p>طلبه: ${esc(pending.requested_by_name || '')}</p>`,()=>LIVE.run('delete:'+r.id,async()=>{
      await LIVE.store.approveDelete(pending); closeDrawer();
    },'اعتُمد الحذف'),'اعتماد الحذف');return;
  }
  liveForm('طلب حذف '+r.id,liveNote('سبب الحذف','liveDeleteReason'),()=>LIVE.run('delete:'+r.id,async()=>{
    LIVE.store.requireUser(true); const reason=val('liveDeleteReason');if(!reason)throw new Error('اكتب سبب الحذف');
    await LIVE.store.insert('request_delete_requests',{request_id:r.id,requested_by:ME,requested_by_name:LIVE.store.user.name,status:'pending'},true);
    return {warning:await LIVE.store.audit(r.id,'delete_request','طلب حذف: '+reason)};
  },'سُجّل طلب الحذف وينتظر اعتماد مستخدم آخر'),'إرسال طلب الحذف');
};
function resetRequests(){liveForm('طلب تصفير العداد','<p>يسجل هذا الإجراء طلبًا للإدارة وفق الآلية الحالية.</p>',()=>LIVE.run('reset-request',()=>LIVE.store.insert('ops_reset_requests',{requested_by:ME,requested_by_name:LIVE.store.user.name,status:'pending'},true),'سُجّل طلب التصفير'),'إرسال الطلب');};
A.resetReview=resetRequests;
A.actContact=el=>LIVE.run('activation:'+el.dataset.id,()=>liveApi('ops-update-activation-request',{id:el.dataset.id,action:'contacted',note:'تم التواصل'}),'سُجل التواصل');
A.actClose=el=>liveForm('إغلاق طلب التفعيل',liveNote('ملاحظة','liveActNote'),()=>LIVE.run('activation:'+el.dataset.id,()=>liveApi('ops-update-activation-request',{id:el.dataset.id,action:'closed',note:val('liveActNote')}),'أُغلق طلب التفعيل'));
A.actActivate=el=>{
  const a=ACTIVATIONS.find(x=>x.id===el.dataset.id);
  liveForm('تفعيل '+a.name,liveSelect('الباقة','livePlan',Object.values(PLANS).filter(p=>p.key!=='unknown').map(p=>[p.key,p.name]),a.plan)+liveField('بداية الاشتراك','liveStart',new Date().toISOString().slice(0,10),'date'),async()=>{
    if(LIVE.pending.has('activate'))return;LIVE.pending.add('activate');
    try{
      await LIVE.store.verify();LIVE.store.requireUser(true);
      const data=await liveApi('ops-activate-business',{id:a.id,plan_key:val('livePlan'),subscription_start:val('liveStart')});
      const c=data.credentials;if(!c?.code || !c?.pin)throw new Error('لم يُرجع الخادم بيانات الدخول؛ حدّث الطلب للتحقق من التفعيل');
      openModal(`<div class="m-h"><h3 class="h2">تم التفعيل</h3></div><div class="m-b"><p>احفظ البيانات قبل إغلاق النافذة؛ تُعرض مرة واحدة.</p>${liveField('رمز المنشأة','entityCode',c.code)}${liveField('الرقم السري','entityPin',c.pin)}</div><div class="m-f"><button class="btn btn-p" data-a="mClose">تم الحفظ</button></div>`);
      await LIVE.refresh();rerender();
    }catch(e){toast(e.message,{info:true});}finally{LIVE.pending.delete('activate');}
  },'تفعيل الحساب');
};
A.meMenu=el=>openPop(el,[{h:LIVE.store.user.name},{l:'تسجيل الخروج',f:async()=>{await window.opsAuth.auth.signOut();localStorage.removeItem('araf_session');location.replace('login.html');}}]);
A.settings=()=>toast('الصلاحيات والحسابات هي إعدادات المنصة الحالية',{info:true});
const unavailable=()=>toast('لا توجد خدمة حفظ مرتبطة بهذا الإجراء في المنصة الأصلية؛ لم يُنفذ أي تغيير',{info:true});
A.saveBizNote=A.bizAssign=A.bizStatus=unavailable;
A.remindClients=A.remindTeam=()=>toast('الإرسال الجماعي غير متاح. افتح الطلب للتواصل مع العميل',{info:true});
A.remindOne=el=>{
  const r=REQ(el.dataset.id);let phone=r.phone.replace(/\D/g,'');if(phone.startsWith('05'))phone='966'+phone.slice(1);
  if(!phone)return;window.open('https://wa.me/'+phone,'_blank','noopener,noreferrer');
};
CTX.ent=id=>[{l:'فتح المنشأة',f:()=>A.openEnt({dataset:{id}})}];
A.stub=unavailable;
function downloadCsv(name,rows){
  const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
A.exportRequests=()=>downloadCsv('requests',[['رقم الطلب','العميل','الجوال','الخدمة','الحالة','القيمة'],...filtered(S.kind).map(r=>[r.id,r.customer,r.phone,svName(r),ST[r.status].l,r.price])]);
A.exportActivity=()=>downloadCsv('activity',[['الوقت','المستخدم','النشاط'],...LOG.map(l=>[l.at?.toISOString(),U(l.by).name,l.text])]);
A.exportUsage=()=>downloadCsv('usage',[['المنشأة','الباقة','الخدمة','المستهلك'],...ENTITIES.flatMap(e=>Object.entries(e.usage).map(([key,n])=>[e.name,PLANS[e.plan].name,BIZ_SERVICES[key]||key,n]))]);
const panelWithAttachments=reqPanel;
reqPanel=function(id){const panel=panelWithAttachments(id),r=REQ(id);const label='المرفقات';
  const start=panel.body.indexOf('<div class="dsec"><h4>'+ic('file','width="15" height="15"')+label);
  const end=panel.body.indexOf('<div class="dsec"><h4>'+ic('msg','width="15" height="15"'),start);
  if(start>=0&&end>start)panel.body=panel.body.slice(0,start)+`<div class="dsec"><h4>المرفقات</h4>${r.attachments.map(f=>{
    const url=typeof f==='string'?f:f.url || f.publicUrl || f.file_url || '';const name=typeof f==='string'?f:f.name || f.file_name || 'مرفق';
    return /^https:\/\//i.test(url)?`<a class="li" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${ic('file')}${esc(name)}</a>`:`<div class="li">${esc(name)} — رابط التنزيل غير متاح</div>`;
  }).join('')||'<p class="muted">لا مرفقات</p>'}</div>`+panel.body.slice(end);
  panel.foot+=`<button class="btn btn-s" data-a="payment" data-id="${esc(id)}">حالة الدفع</button>`;
  const pending=LIVE.deletes.find(d=>d.request_id===id);if(pending)panel.foot+=`<button class="btn btn-s" data-a="reviewDelete" data-id="${esc(id)}">مراجعة طلب الحذف</button>`;
  return panel;
};
A.reviewDelete=el=>askDelete(REQ(el.dataset.id));

A.payment=el=>{const id=el.dataset.id;liveForm('تحديث حالة الدفع',liveSelect('الحالة','livePayment',Object.entries(PAY).filter(([key])=>key!=='unknown').map(([key,v])=>[key,v.l]),REQ(id).payment),()=>LIVE.run('request:'+id,()=>{LIVE.store.requireUser(true);return LIVE.store.patchRequest(id,{payment_status:val('livePayment')},'payment','تحديث حالة الدفع');}));};
// The snapshot API supports business reads and activation, but exposes no
// contract for request mutation/quota accounting. Never fake these saves.
HOOKS.push(root=>{
  $$('[data-a="bizAssign"],[data-a="bizStatus"],[data-a="saveBizNote"]',root).forEach(el=>{el.disabled=true;el.title='حفظ تعديلات طلبات المنشآت غير متاح عبر الربط الحالي';});
});

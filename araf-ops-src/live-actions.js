/* All mutations are confirmed by the existing backend before UI success. */
function liveBusy(button, label='جارٍ الحفظ…') {
  const controls=$$('#modal.show button, #modal.show input, #modal.show textarea, #modal.show select');
  if(button && !controls.includes(button)) controls.push(button);
  const saved=controls.map(el=>[el,el.disabled]); const html=button?.innerHTML;
  controls.forEach(el=>el.disabled=true);
  if(button){button.setAttribute('aria-busy','true');button.innerHTML=ic('clock')+esc(label);}
  return ()=>{saved.forEach(([el,disabled])=>el.disabled=disabled);if(button){button.removeAttribute('aria-busy');button.innerHTML=html;}};
}
function livePrepareVerification() {
  const verification={startedAt:Date.now(),promise:LIVE.store.verify()};
  // Opening a modal starts verification; a failure is shown when saving.
  verification.promise.catch(()=>{});
  return verification;
}
LIVE.run = async function(key, task, message='حُفظ التغيير', options={}) {
  if(LIVE.pending.has(key)) return;
  LIVE.pending.add(key);
  const resetBusy=liveBusy(options.button || $('#modal.show [data-a="liveSave"]') || $('#modal.show [data-a="doAssign"]'),options.busyLabel);
  try {
    const verification=options.verification;
    if(verification && Date.now()-verification.startedAt<15000) await verification.promise;
    else await LIVE.store.verify();
    if (LIVE.store.user.id !== ME) throw new Error('تغير الحساب؛ أعد تحميل الصفحة');
    const result=await task();
    const requestSaved=key.startsWith('request:') && result?.data?.id;
    if(requestSaved){
      LIVE.requestVersion++;
      const row=mapRequest(result.data),i=REQUESTS.findIndex(r=>r.id===row.id);
      if(i<0) REQUESTS.push(row); else REQUESTS.splice(i,1,row);
      rebuildMetrics();
    } else if(!options.local) await LIVE.refresh();
    closeModal(); if(DR.stack.length) refreshDrawer(); rerender(); livePaintStatus();
    toast(result?.warning || message,{info:!!result?.warning});
    if(result?.audit) result.audit.then(warning=>{if(warning)toast(warning,{info:true});});
    return result;
  } catch(e) { toast(e.message || 'تعذر الحفظ. حدّث البيانات للتحقق قبل تكرار الإجراء',{info:true}); }
  finally {LIVE.pending.delete(key);resetBusy();}
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
function assignTo(id,emp,verification) {
  return LIVE.run('request:'+id,()=>{
    LIVE.store.requireUser(true);
    if(!TEAM.some(t=>t.id===emp && t.status==='active'))throw new Error('اختر موظفًا نشطًا');
    return LIVE.store.assignRequest(id,emp);
  },'حُفظ إسناد الطلب',{verification});
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
    return LIVE.store.closeRequest(id,val('liveState'),note);
  }));
};
A.quote=el=>{
  const id=el.dataset.id || el.dataset.v;
  liveForm('حفظ قيمة الطلب',liveField('القيمة النهائية بالريال','livePrice',REQ(id).price,'number')+'<p class="muted">تُحفظ القيمة في الطلب. إرسال عرض للعميل إجراء مستقل.</p>',()=>LIVE.run('request:'+id,()=>{
    const price=Number(val('livePrice'));if(!val('livePrice') || !Number.isFinite(price)||price<0)throw new Error('أدخل قيمة صحيحة');
    return LIVE.store.patchRequest(id,{price,...(LIVE.store.rows[id].payment_status==='pending_quote'?{payment_status:'manual_pending'}:{})},'status_change','تسعير الطلب',{deferAudit:true});
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
    return LIVE.store.insert('employees',{id:crypto.randomUUID(),full_name:val('qName'),email:val('qEmail'),phone:val('qPhone'),role:val('qRole'),status:'active',created_at:now},true);
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
const canManage=()=>['admin','manager'].includes(LIVE.store?.user?.role);
const pendingDelete=id=>LIVE.deletes.find(d=>String(d.request_id)===String(id));
function deleteActionLabel(id){const p=pendingDelete(id);return !p?'حذف الطلب':String(p.requested_by)===String(ME)?'بانتظار اعتماد الحذف':canManage()?'اعتماد الحذف':'طلب حذف معلّق';}
function deleteMarker(id){
  const p=pendingDelete(id);if(!p)return '';
  return `<button class="delete-marker" data-a="reviewDelete" data-id="${esc(id)}" aria-label="${esc(deleteActionLabel(id))}">${ic('alert','width="14" height="14"')}<span>${deleteActionLabel(id)}</span></button>`;
}
function askDelete(r){
  const pending=pendingDelete(r.id);
  if(pending){
    const own=String(pending.requested_by)===String(ME);
    if(own || !canManage()){
      openModal(`<div class="m-h"><h3 class="h2">بانتظار اعتماد الحذف</h3></div><div class="m-b"><p>طلبه: ${esc(pending.requested_by_name || '')}</p><p>يلزم اعتماد الحذف من مستخدم إداري آخر. لم يُحذف الطلب بعد.</p></div><div class="m-f"><button class="btn btn-s" data-a="mClose">إغلاق</button></div>`);return;
    }
    liveForm('اعتماد الحذف',`<p>طلبه: ${esc(pending.requested_by_name || '')}</p><p class="danger-note">سيُحذف طلب ${esc(r.customer)} نهائيًا من قاعدة البيانات المشتركة. لا يمكن التراجع عن الحذف.</p>`,()=>LIVE.run('delete:'+r.id,async()=>{
      await LIVE.store.approveDelete(pending);
      LIVE.requestVersion++;LIVE.deleteVersion++;delete LIVE.store.rows[r.id];
      replaceRows(REQUESTS,REQUESTS.filter(x=>x.id!==r.id));
      LIVE.deletes=LIVE.deletes.filter(d=>String(d.request_id)!==String(r.id));
      closeDrawer();rebuildMetrics();
    },'اعتُمد الحذف',{local:true}),'اعتماد الحذف');
  }else{
    if(!canManage())return toast('هذا الإجراء متاح للإدارة',{info:true});
    liveForm('حذف الطلب',`<p>سيُرسل طلب الحذف للاعتماد من مستخدم إداري آخر.</p>`+liveNote('سبب الحذف','liveDeleteReason'),()=>LIVE.run('delete:'+r.id,async()=>{
      LIVE.store.requireUser(true); const reason=val('liveDeleteReason');if(!reason)throw new Error('اكتب سبب الحذف');
      const row=await LIVE.store.insert('request_delete_requests',{request_id:r.id,requested_by:ME,requested_by_name:LIVE.store.user.name,status:'pending'},true);
      LIVE.deleteVersion++;LIVE.deletes.push(row);
      return {warning:await LIVE.store.audit(r.id,'delete_request','طلب حذف: '+reason)};
    },'سُجّل طلب الحذف وينتظر اعتماد مستخدم آخر'),'حذف الطلب');
  }
  $('#modal [data-a="liveSave"]')?.classList.add('btn-destructive');
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
CTX.ent=id=>[{l:'فتح المنشأة',f:()=>A.openEnt({dataset:{id}})},...(canManage()?[{l:'إلغاء الاشتراك وحذف المنشأة',red:true,f:()=>A.deleteEntity({dataset:{id}})}]:[])];
A.deleteEntity=el=>{
  const entity=ENTITIES.find(e=>e.id===el.dataset.id);if(!entity)return;
  if(!canManage())return toast('هذا الإجراء متاح للإدارة',{info:true});
  liveForm('إلغاء الاشتراك وحذف المنشأة',`<p><b>${esc(entity.name)}</b> — <span dir="ltr">${esc(entity.code)}</span></p><p class="danger-note">سيُحذف اشتراك المنشأة وطلباتها وسجلات استهلاكها نهائيًا من قاعدة البيانات المشتركة، ويظهر الحذف في المنصة الأصلية أيضًا. لا يمكن التراجع عن هذا الإجراء.</p><p>ستُزال قيمة اشتراكها من الإيراد الشهري المتكرر.</p>`+liveField('اكتب رمز المنشأة لتأكيد الحذف','deleteEntityCode')+`<label class="row gap8"><input type="checkbox" id="deleteEntityAgree">أؤكد حذف هذه المنشأة وبياناتها المرتبطة.</label>`,()=>{
    const confirmation=val('deleteEntityCode'),agree=$('#deleteEntityAgree')?.checked;
    if(!agree)return toast('أكد موافقتك على الحذف',{info:true});
    return LIVE.run('entity-delete:'+entity.id,async()=>{
      const result=await LIVE.store.deleteEntity(entity,confirmation);
      if(!result.ok || String(result.entity_id)!==String(entity.id))throw new Error('لم يؤكد الخادم حذف المنشأة');
      LIVE.businessVersion++;
      replaceRows(ENTITIES,ENTITIES.filter(e=>e.id!==entity.id));
      replaceRows(BIZ_REQUESTS,BIZ_REQUESTS.filter(r=>r.entity!==entity.id));
      replaceRows(ACTIVATIONS,ACTIVATIONS.filter(a=>a.entity_code!==entity.code && a.metadata?.activated_entity_id!==entity.id));
      closeDrawer();rebuildMetrics();return result;
    },'حُذفت المنشأة وبيانات اشتراكها، وحُدّث الإيراد',{local:true});
  },'إلغاء الاشتراك وحذف المنشأة');
  $('#modal [data-a="liveSave"]')?.classList.add('btn-destructive');
};
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
  if(canManage() || pendingDelete(id))panel.foot+=`<button class="btn btn-s btn-danger" data-a="reviewDelete" data-id="${esc(id)}">${deleteActionLabel(id)}</button>`;
  return panel;
};
A.reviewDelete=el=>askDelete(REQ(el.dataset.id));

A.payment=el=>{const id=el.dataset.id;liveForm('تحديث حالة الدفع',liveSelect('الحالة','livePayment',Object.entries(PAY).filter(([key])=>key!=='unknown').map(([key,v])=>[key,v.l]),REQ(id).payment),()=>LIVE.run('request:'+id,()=>{LIVE.store.requireUser(true);return LIVE.store.patchRequest(id,{payment_status:val('livePayment')},'payment','تحديث حالة الدفع');}));};
// The snapshot API supports business reads and activation, but exposes no
// contract for request mutation/quota accounting. Never fake these saves.
HOOKS.push(root=>{
  $$('[data-a="bizAssign"],[data-a="bizStatus"],[data-a="saveBizNote"]',root).forEach(el=>{el.disabled=true;el.title='حفظ تعديلات طلبات المنشآت غير متاح عبر الربط الحالي';});
});

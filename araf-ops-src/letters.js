/* Private employee messages persisted by authenticated v2 RPCs. */
const LETTERS=[];
let letterTab='in';
const mapLetter=row=>({...row,id:String(row.id),at:liveDate(row.created_at),readAt:liveDate(row.read_at)});
const isUnread=l=>l.to_id===String(ME) && !l.read_at;
const unreadLetters=()=>LETTERS.filter(isUnread).length;
const letterOther=l=>l.from_id===String(ME)?l.to_id:l.from_id;
const letterName=l=>l.from_id===String(ME)?l.to_name:l.from_name;
function messageIssue(){return LIVE.errors.messages?`<div class="letters-error" role="status">${esc(LIVE.errors.messages)}${LETTERS.length?' — تظهر آخر الرسائل المحمّلة.':''}<button class="btn btn-sm btn-q" data-a="refreshLetters">إعادة المحاولة</button></div>`:'';}
function lettersSec(){
  const count=unreadLetters(),rows=LETTERS.slice().sort((a,b)=>Number(isUnread(b))-Number(isUnread(a)) || b.at-a.at).slice(0,3);
  return `<div class="sec-h"><div class="sec-t">رسائل الفريق${count?`<span class="badge b-red">${count} غير مقروءة</span>`:'<small>اترك رسالة لأي موظف</small>'}</div><div class="act"><button class="btn btn-sm btn-q" data-a="inbox">كل الرسائل</button><button class="btn btn-sm btn-p" data-a="compose">${ic('pen')}رسالة جديدة</button></div></div>
  ${messageIssue()}<div class="msg-grid">${rows.map(msgCard).join('')}<button class="msg-card msg-new" data-a="compose"><span class="mn-ic">${ic('send')}</span><b>رسالة جديدة</b><small>لأي عضو في الفريق</small></button></div>`;
}
function msgCard(l){
  const mine=l.from_id===String(ME),unread=isUnread(l);
  return `<button class="msg-card ${unread?'unread':''}" data-a="openLetter" data-id="${esc(l.id)}"><div class="mc-top">${av(letterOther(l),'',true)}<div class="grow" style="min-width:0"><div class="mc-who"><span class="dir ${mine?'out':'in'}">${ic(mine?'send':'inbox','width="12" height="12"')}${mine?'إلى':'من'}</span><b class="ell">${esc(letterName(l))}</b></div></div><time>${ago(l.at)}</time></div><div class="mc-subj">${unread?'<i class="udot"></i>':''}<span class="ell">${esc(l.subject)}</span></div><p class="mc-prev">${esc(l.body)}</p><div class="mc-foot">${l.urgent?'<span class="badge b-red">عاجلة</span>':''}${mine?`<span class="rc ${l.read_at?'read':''}" style="margin-inline-start:auto">${ic(l.read_at?'checks':'check','width="14" height="14"')}${l.read_at?'قُرئت':'أُرسلت'}</span>`:unread?'<span class="mc-new">جديدة</span>':''}</div></button>`;
}
function refreshLettersQuiet(){
  const section=$('#lettersSec');if(section){section.innerHTML=lettersSec();after(section);}
  const dot=$('#mailDot');if(dot){dot.textContent=unreadLetters();dot.style.display=unreadLetters()?'':'none';}
  const top=DR.stack[DR.stack.length-1];
  if(top?.render===inboxPanel || top?.render?._message)refreshDrawer();
}
function upsertLetter(row){
  const l=mapLetter(row),index=LETTERS.findIndex(x=>x.id===l.id);
  if(index<0)LETTERS.unshift(l);else LETTERS.splice(index,1,l);
  LIVE.messageVersion++;return l;
}
function inboxPanel(){
  const rows=LETTERS.filter(l=>letterTab==='all'||(letterTab==='in'?l.to_id===String(ME):letterTab==='out'?l.from_id===String(ME):isUnread(l))).slice().sort((a,b)=>b.at-a.at);
  return {head:`<div class="row gap8"><h2 class="h2 grow">رسائل الفريق</h2><button class="btn btn-sm btn-p" data-a="compose">${ic('pen')}رسالة جديدة</button></div>`,body:`${messageIssue()}<div class="ntabs">${[['in','الواردة'],['out','المرسلة'],['unread','غير المقروءة'],['all','الكل']].map(([key,label])=>`<button class="${letterTab===key?'on':''}" data-a="letterTab" data-v="${key}">${label}${key==='unread'&&unreadLetters()?`<span class="n hot">${unreadLetters()}</span>`:''}</button>`).join('')}</div>${rows.length?`<div class="msg-list">${rows.map(msgCard).join('')}</div>`:empty('لا توجد رسائل هنا','أرسل رسالة إلى أحد أعضاء الفريق.','رسالة جديدة','compose')}`};
}
function letterPanel(id){
  const fn=()=>{
    const l=LETTERS.find(x=>x.id===id);if(!l)return {head:'الرسالة',body:'هذه الرسالة لم تعد متاحة؛ ربما حذفها المرسل.'};
    const mine=l.from_id===String(ME);
    return {head:`<div class="row gap12">${av(letterOther(l),'lg',true)}<div><h2 class="h2">${esc(l.subject)}</h2><div class="muted">${mine?'إلى':'من'} ${esc(letterName(l))}</div></div>`,body:`<div class="row gap8" style="margin-bottom:18px"><time class="muted">${dmy(l.at)} — ${hm(l.at)}</time>${l.urgent?'<span class="badge b-red">عاجلة</span>':''}${mine?`<span class="badge ${l.read_at?'b-green':'b-ghost'}">${l.read_at?'قُرئت '+ago(l.readAt):'أُرسلت'}</span>`:''}</div><div class="note letter-body">${esc(l.body)}</div>`,foot:`${mine?`<button class="btn btn-s btn-danger" data-a="deleteLetter" data-id="${esc(l.id)}">${ic('trash')}حذف الرسالة</button>`:''}<button class="btn btn-p" data-a="replyLetter" data-id="${esc(l.id)}">${ic('send')}${mine?'رسالة أخرى':'رد على الرسالة'}</button><button class="btn btn-q" data-a="inbox">صندوق الرسائل</button>`};
  };fn._message=id;return fn;
}
A.openLetter=async el=>{
  const l=LETTERS.find(x=>x.id===el.dataset.id);if(!l)return;
  openDrawer(letterPanel(l.id),{wide:true});
  if(isUnread(l)){
    try{const version=LIVE.messageVersion,row=await LIVE.store.readMessage(l.id);if(version===LIVE.messageVersion&&LETTERS.some(x=>x.id===l.id))upsertLetter(row);refreshLettersQuiet();}
    catch(e){toast('تعذر تسجيل قراءة الرسالة: '+e.message,{info:true});}
  }
};
function composeLetter(to='',subject=''){
  closeDrawer();let pick=to,nonce=crypto.randomUUID(),lastPayload='';
  const people=()=>TEAM.filter(t=>String(t.id)!==String(ME)&&t.status==='active').map(t=>`<button type="button" class="to-chip ${pick===t.id?'on':''}" data-a="pickTo" data-id="${esc(t.id)}">${av(t.id,'sm',true)}<span><b>${esc(t.name)}</b><small>${esc(t.role)}</small></span>${pick===t.id?`<i class="tick">${ic('check')}</i>`:''}</button>`).join('')||'<p class="muted">لا يوجد موظف آخر نشط.</p>';
  openModal(`<div class="m-h"><div class="grow"><h3 class="h2">رسالة جديدة</h3><p class="muted" style="font-size:13px">تظهر في صندوق الموظف داخل المنصة.</p></div><button class="icon-btn" data-a="mClose">${ic('x')}</button></div><div class="m-b">${messageIssue()}<div class="field" style="margin-bottom:14px"><label>إلى الموظف</label><div class="to-row" id="toRow">${people()}</div></div><div class="field" style="margin-bottom:12px"><label>الموضوع</label><input class="inp" id="ltSubject" maxlength="120" value="${esc(subject)}" placeholder="مثال: متابعة طلبات اليوم"></div><div class="field"><label>الرسالة</label><textarea class="inp" id="ltBody" rows="5" maxlength="4000" placeholder="اكتب رسالتك…"></textarea></div><label class="switch-row" style="margin-top:14px"><input type="checkbox" id="ltUrgent"><span class="switch"></span><span>تمييزها كعاجلة</span></label><div class="lt-err" id="ltError" role="alert"></div></div><div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-p send-main" data-a="sendLetter">${ic('send')}إرسال الرسالة</button></div>`,'lg');
  A.pickTo=el=>{pick=el.dataset.id;$('#toRow').innerHTML=people();};
  A.sendLetter=async button=>{
    if(LIVE.pending.has('send-letter'))return;
    const body=val('ltBody'),subject=val('ltSubject'),urgent=$('#ltUrgent').checked,errorBox=$('#ltError');
    if(!pick||!body){errorBox.textContent=!pick?'اختر موظفًا':'اكتب نص الرسالة';return;}
    const payload=JSON.stringify([pick,subject,body,urgent]);if(lastPayload&&payload!==lastPayload)nonce=crypto.randomUUID();lastPayload=payload;
    LIVE.pending.add('send-letter');const restore=liveBusy(button,'جارٍ الإرسال…');errorBox.textContent='';
    try{
      const row=await LIVE.store.sendMessage(pick,subject,body,urgent,nonce);
      upsertLetter(row);closeModal();refreshLettersQuiet();toast('أُرسلت الرسالة إلى '+U(pick).name);
    }catch(e){errorBox.textContent=e.message;}finally{LIVE.pending.delete('send-letter');restore();}
  };
  $('#modal').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#modal [data-a="sendLetter"]')?.click();}};
}
A.compose=()=>composeLetter();
A.inbox=()=>{openDrawer(inboxPanel);LIVE.refreshMessages();};
A.letterTab=el=>{letterTab=el.dataset.v;refreshDrawer();};
A.refreshLetters=()=>LIVE.refreshMessages();
A.replyLetter=el=>{const l=LETTERS.find(x=>x.id===el.dataset.id);if(l)composeLetter(letterOther(l),('رد: '+l.subject).slice(0,120));};

A.messageEmployee=el=>composeLetter(el.dataset.id);

A.deleteLetter=el=>{
  const id=el.dataset.id,l=LETTERS.find(x=>x.id===id);
  if(!l || l.from_id!==String(ME))return;
  openModal(`<div class="m-h"><h3 class="h2">حذف الرسالة</h3></div><div class="m-b"><p>هل تريد حذف رسالة «${esc(l.subject)}»؟</p><p class="muted">ستُحذف نهائيًا من صندوقك وصندوق المستلم، ولا يمكن التراجع عن الحذف.</p><p id="deleteLetterError" role="alert" class="lt-err"></p></div><div class="m-f"><button class="btn btn-q" data-a="mClose">إلغاء</button><button class="btn btn-s btn-danger" data-a="confirmDeleteLetter">حذف الرسالة</button></div>`);
  A.confirmDeleteLetter=async button=>{
    const key='delete-letter:'+id;if(LIVE.pending.has(key))return;
    LIVE.pending.add(key);const restore=liveBusy(button,'جارٍ الحذف…');
    try{
      await LIVE.store.deleteMessage(id);
      const index=LETTERS.findIndex(x=>x.id===id);if(index>=0)LETTERS.splice(index,1);
      LIVE.messageVersion++;closeModal();closeDrawer();refreshLettersQuiet();toast('حُذفت الرسالة');
    }catch(e){$('#deleteLetterError').textContent=e.message;}
    finally{LIVE.pending.delete(key);restore();}
  };
};

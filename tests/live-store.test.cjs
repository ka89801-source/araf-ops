const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LiveStore } = require('../araf-ops-src/live-store.js');
function mockDB(handler){
 const calls=[];return {calls,from(table){const op={table,filters:[]};calls.push(op);const q={};
  for(const name of ['select','order','range','eq','is','update','insert','maybeSingle','single'])q[name]=(...args)=>{if(['eq','is'].includes(name))op.filters.push([name,...args]);else op[name]=args;return q;};
  q.then=(resolve,reject)=>Promise.resolve().then(()=>handler(op)).then(resolve,reject);return q;
 },rpc:async(name,payload)=>{calls.push({rpc:name,payload});return handler({rpc:name,payload});}};
}
const admin={id:'e1',name:'Operator',role:'admin'};
function store(db){const s=new LiveStore(db,null,async()=>({ok:true,user:{id:'auth1'},admin:{active:true,employee_id:'e1',display_name:'Operator',role:'admin'}}));s.user=admin;return s;}
test('session is verified by existing API, not editable local storage',async()=>{const s=store(mockDB(()=>({})));assert.equal((await s.verify()).id,'e1');s.api=async()=>({ok:true,admin:{active:false},user:{id:'a'}});await assert.rejects(s.verify());});
test('loads every page beyond Supabase default cap',async()=>{const db=mockDB(op=>({data:Array.from({length:op.range[0]<1000?500:201},(_,i)=>({id:op.range[0]+i}))}));const rows=await store(db).all('service_requests');assert.equal(rows.length,1201);assert.deepEqual(db.calls.map(c=>c.range),[[0,499],[500,999],[1000,1499]]);});
test('employee scope uses the original assigned_to filter',async()=>{const db=mockDB(()=>({data:[]})),s=store(db);s.user={id:'e2',role:'employee'};await s.requests();assert.deepEqual(db.calls[0].filters,[['eq','assigned_to','e2']]);});
test('manager can see and assign unassigned requests with the verified role',async()=>{
 const db=mockDB(op=>op.update?{data:{id:'r1',...op.update[0]}}:{data:[]}),s=store(db);
 s.user={id:'e3',role:'manager'};await s.requests();assert.deepEqual(db.calls[0].filters,[]);
 s.rows.r1={id:'r1',status:'new',assigned_to:null,updated_at:'old'};
 const result=await s.assignRequest('r1','e2');assert.equal(result.data.assigned_to,'e2');assert.equal(result.data.assigned_by,'e3');assert.equal(result.data.status,'assigned');
});
test('employee cannot reassign their own request or access another employee request',async()=>{
 const db=mockDB(()=>({})),s=store(db);s.user={id:'e2',role:'employee'};s.rows.r1={id:'r1',assigned_to:'e2'};
 await assert.rejects(s.assignRequest('r1','e3'),/للإدارة/);
 await assert.rejects(s.patchRequest('r1',{assigned_to:'e3'}),/للإدارة/);
 s.rows.r1.assigned_to='e3';await assert.rejects(s.patchRequest('r1',{status:'done'}),/غير مسند/);assert.equal(db.calls.length,0);
});
test('assignment tolerates an unrelated concurrent edit, preserving the newer notes',async()=>{
 let writes=0;const latest={id:'r1',status:'new',assigned_to:null,updated_at:'newer',notes:[{text:'Concurrent note'}]};
 const db=mockDB(op=>op.table==='request_activity_log'?{}:!op.update?{data:latest}:++writes===1?{data:null}:{data:{...latest,...op.update[0]}}),s=store(db);
 s.rows.r1={id:'r1',status:'new',assigned_to:null,updated_at:'old',notes:[]};const result=await s.assignRequest('r1','e2');
 assert.equal(writes,2);assert.equal(result.data.notes[0].text,'Concurrent note');assert.equal(result.data.assigned_to,'e2');
 assert.deepEqual(db.calls[2].filters,[['eq','id','r1'],['eq','updated_at','newer']]);assert.equal(db.calls[2].update[0].notes,undefined);
});
test('assignment does not overwrite a competing assignment or state change',async()=>{
 for(const latest of [{assigned_to:'e3'},{status:'done'},{assigned_at:'new-assignment'}]){
  const db=mockDB(op=>op.update?{data:null}:{data:{id:'r1',status:'new',assigned_to:null,updated_at:'newer',...latest}}),s=store(db);
  s.rows.r1={id:'r1',status:'new',assigned_to:null,updated_at:'old'};
  await assert.rejects(s.assignRequest('r1','e2'),/تغيّر إسناد الطلب أو حالته/);assert.equal(db.calls.filter(c=>c.update).length,1);
 }
});
test('assignment does not retry denied writes, and retries version conflicts at most once',async()=>{
 const denied=mockDB(()=>({error:{message:'denied'}})),s=store(denied);s.rows.r1={id:'r1',status:'new'};
 await assert.rejects(s.assignRequest('r1','e2'),/denied/);assert.equal(denied.calls.length,1);
 const conflict=mockDB(op=>op.update?{data:null}:{data:{id:'r1',status:'new',updated_at:'newer'}});s.db=conflict;
 await assert.rejects(s.assignRequest('r1','e2'),/تغيّر الطلب/);assert.equal(conflict.calls.filter(c=>c.update).length,2);
});
test('successful write uses original fields, existing version, then audit',async()=>{const db=mockDB(op=>op.table==='request_activity_log'?{}:{data:{id:'r1',updated_at:'new',status:'done'}}),s=store(db);s.rows.r1={id:'r1',updated_at:'old'};await s.patchRequest('r1',{status:'done',closed_by:'e1'});assert.deepEqual(db.calls[0].filters,[['eq','id','r1'],['eq','updated_at','old']]);assert.equal(s.rows.r1.status,'done');assert.equal(db.calls[1].table,'request_activity_log');});
test('RLS/permission error never updates the displayed store',async()=>{const db=mockDB(()=>({error:{message:'denied'}})),s=store(db);s.rows.r1={id:'r1',status:'new',updated_at:'old'};await assert.rejects(s.patchRequest('r1',{status:'done'}),/denied/);assert.equal(s.rows.r1.status,'new');assert.equal(db.calls.length,1);});
test('concurrent update returns conflict instead of overwriting notes',async()=>{const s=store(mockDB(()=>({data:null})));s.rows.r1={id:'r1',notes:[{text:'first'}],updated_at:'old'};await assert.rejects(s.addNote('r1','second'),/تغيّر/);assert.equal(s.rows.r1.notes.length,1);});
test('note preserves existing metadata and original notes contract',async()=>{const db=mockDB(op=>({data:{id:'r1',...op.update?.[0]}})),s=store(db);s.rows.r1={id:'r1',notes:[{by:'Old',text:'first',extra:true}],updated_at:'old'};await s.addNote('r1','second');const notes=db.calls[0].update[0].notes;assert.equal(notes[0].extra,true);assert.equal(notes[1].by_id,'e1');assert.equal(notes[1].by,'Operator');});
test('audit failure is reported separately after a successful save',async()=>{const s=store(mockDB(op=>op.table==='request_activity_log'?{error:{message:'audit failure'}}:{data:{id:'r1',status:'done'}}));s.rows.r1={updated_at:'old'};const r=await s.patchRequest('r1',{status:'done'});assert.ok(r.warning);assert.equal(s.rows.r1.status,'done');});
test('deletion uses the existing approval RPC and forbids self approval',async()=>{const db=mockDB(()=>({data:true})),s=store(db);await assert.rejects(s.approveDelete({request_id:'r1',status:'pending',requested_by:'e1'}));assert.equal(db.calls.length,0);await s.approveDelete({request_id:'r1',status:'pending',requested_by:'e2'});assert.equal(db.calls[0].rpc,'approve_and_delete_service_request');});
test('support conversion calls existing RPC and validates price',async()=>{const db=mockDB(()=>({data:'r1'})),s=store(db);await assert.rejects(s.convertTicket('t1','consultation','Consult',-1,'paid'));await s.convertTicket('t1','consultation','Consult',100,'paid');assert.equal(db.calls[0].rpc,'convert_support_ticket_to_request');assert.equal(db.calls[0].payload.p_converted_by,'e1');});
test('new rows keep database-generated request IDs',async()=>{const db=mockDB(op=>({data:{...op.insert[0],id:'server-id'}})),s=store(db);const row=await s.insert('service_requests',{customer_name:'Test'});assert.equal(row.id,'server-id');assert.equal(db.calls[0].insert[0].id,undefined);});
test('assignment returns the saved row without waiting for audit; audit errors still surface',async()=>{
 let finishAudit;const waiting=new Promise(resolve=>finishAudit=resolve);
 const db=mockDB(op=>op.table==='request_activity_log'?waiting:{data:{id:'r1',assigned_to:'e2',updated_at:'new'}}),s=store(db);s.rows.r1={id:'r1',updated_at:'old'};
 const result=await s.patchRequest('r1',{assigned_to:'e2'},'assign','Assign',{deferAudit:true});
 assert.equal(result.data.assigned_to,'e2');assert.ok(result.audit instanceof Promise);
 finishAudit({error:{message:'audit unavailable'}});assert.match(await result.audit,/تعذر تسجيل النشاط/);
});
test('v2 messages use authenticated RPC and page through the private inbox',async()=>{
 const calls=[],s=store(mockDB(()=>{throw new Error('anonymous client must not be used')}));
 s.auth={rpc:async(name,payload)=>{calls.push({name,payload});return {data:payload.p_before?[]:Array.from({length:200},(_,i)=>({id:String(300-i)}))};}};
 assert.equal((await s.messages()).length,200);assert.equal(calls[1].payload.p_before,'101');
 s.auth.rpc=async(name,payload)=>({data:{id:'server-id',...payload}});
 assert.equal((await s.sendMessage('e2',' Subject ',' Message ',true,'nonce')).p_body,'Message');
 await assert.rejects(async()=>s.sendMessage('e1','x','x',false,'n'),/موظفًا آخر/);
});
test('v2 unavailable schema is explicit and message failures never look successful',async()=>{
 const s=store(mockDB(()=>({})));s.auth={rpc:async()=>({error:{code:'PGRST202',message:'missing function'}})};
 await assert.rejects(s.messages(),/بانتظار تفعيل/);
 await assert.rejects(s.sendMessage('e2','Subject','Body',false,'nonce'),/بانتظار تفعيل/);
});
test('entity deletion requires admin role, exact confirmation and server response',async()=>{
 const calls=[],s=store(mockDB(()=>{throw new Error('anonymous client must not be used')}));s.auth={rpc:async(name,payload)=>{calls.push({name,payload});return {data:{ok:true,entity_id:'org'}};}};
 await assert.rejects(async()=>s.deleteEntity({id:'org',code:'TEST'},'WRONG'),/رمز المنشأة/);assert.equal(calls.length,0);
 s.user={id:'e2',role:'employee'};await assert.rejects(async()=>s.deleteEntity({id:'org',code:'TEST'},'TEST'),/للإدارة/);
 s.user=admin;await s.deleteEntity({id:'org',code:'TEST',updated_at:'version'},'TEST');
 assert.equal(calls[0].name,'ops_v2_delete_entity');assert.equal(calls[0].payload.p_expected_updated_at,'version');
});

test('priced request closes without waiting for audit and preserves price/payment',async()=>{
 const row={id:'r1',status:'progress',price:875,payment_status:'manual_pending',updated_at:'priced'};
 const db=mockDB(op=>op.table==='request_activity_log'?new Promise(()=>{}):{data:{...row,...op.update[0]}}),s=store(db);s.rows.r1={...row};
 const result=await s.closeRequest('r1','done','تم تنفيذ الخدمة');
 assert.equal(result.data.status,'done');assert.equal(result.data.price,875);assert.equal(result.data.payment_status,'manual_pending');
 assert.equal(result.data.closed_by,'e1');assert.equal(result.data.closing_note,'تم تنفيذ الخدمة');assert.ok(result.audit instanceof Promise);
 assert.deepEqual(db.calls[0].filters,[['eq','id','r1'],['eq','updated_at','priced']]);
});
test('closing retries only an unrelated concurrent edit with current version and notes',async()=>{
 let writes=0;const row={id:'r1',status:'progress',price:875,payment_status:'manual_pending',updated_at:'old'};
 const latest={...row,updated_at:'new',notes:[{text:'new note'}]};
 const db=mockDB(op=>op.table==='request_activity_log'?{}:!op.update?{data:latest}:++writes===1?{data:null}:{data:{...latest,...op.update[0]}}),s=store(db);s.rows.r1=row;
 const result=await s.closeRequest('r1','closed','تم الإغلاق');assert.equal(writes,2);assert.equal(result.data.notes[0].text,'new note');
 assert.deepEqual(db.calls[2].filters,[['eq','id','r1'],['eq','updated_at','new']]);
});
test('closing never overwrites another price, payment, assignment or outcome',async()=>{
 for(const changes of [{price:999},{payment_status:'paid'},{assigned_to:'e2'},{status:'cancelled'},{closing_note:'another closure'}]){
  const row={id:'r1',status:'progress',price:875,payment_status:'manual_pending',updated_at:'old'};
  const db=mockDB(op=>op.update?{data:null}:{data:{...row,...changes,updated_at:'new'}}),s=store(db);s.rows.r1=row;
  await assert.rejects(s.closeRequest('r1','done','تم'),/تغيّرت حالة/);assert.equal(db.calls.filter(c=>c.update).length,1);
 }
 const db=mockDB(()=>({error:{message:'denied'}})),s=store(db);s.rows.r1={id:'r1'};
 await assert.rejects(s.closeRequest('r1','done','تم'),/denied/);assert.equal(db.calls.length,1);
});
test('message deletion requires explicit server confirmation and keeps bigint IDs as strings',async()=>{
 const s=store(mockDB(()=>{throw Error('no anonymous DB deletion')}));let called;
 s.api=async(route,body)=>{called={route,body};return {ok:true,id:body.id}};
 await s.deleteMessage('9223372036854775807');assert.deepEqual(called,{route:'ops-delete-message',body:{id:'9223372036854775807'}});
 s.api=async()=>({ok:false});await assert.rejects(s.deleteMessage('1'),/لم يؤكد/);
});
test('service correction uses existing columns only, replaces the price atomically and keeps payment/source',async()=>{
 const original={id:'r1',service_type:'consultation',service_name:'استشارة',source:'custom_case',price:450,payment_status:'paid',updated_at:'version'};
 const db=mockDB(op=>{if(op.table==='request_activity_log')return {};assert.equal(Object.hasOwn(op.update[0],'service_category'),false);assert.deepEqual(Object.keys(op.update[0]).sort(),['price','service_name','service_type','updated_at']);return {data:{...original,...op.update[0]}}}),s=store(db);s.rows.r1=original;
 const result=await s.changeService('r1',{type:'official_letter',name:'صياغة خطاب رسمي',price:150},'الخدمة المناسبة بعد التواصل');
 assert.equal(result.data.service_type,'official_letter');assert.equal(result.data.service_name,'صياغة خطاب رسمي');
 assert.equal(result.data.price,150);assert.equal(result.data.payment_status,'paid');assert.equal(result.data.source,'custom_case');
 await result.audit;assert.match(db.calls[1].insert[0].description,/استشارة.*صياغة خطاب رسمي.*بعد التواصل/);
 assert.deepEqual(db.calls[0].filters,[['eq','id','r1'],['eq','updated_at','version']]);
});
test('service correction validates input, respects assignment and does not overwrite a concurrent edit',async()=>{
 const db=mockDB(()=>({data:null})),s=store(db);s.rows.r1={id:'r1',assigned_to:'e2',updated_at:'version'};
 await assert.rejects(s.changeService('r1',{type:'',name:'',category:'bad'},''));assert.equal(db.calls.length,0);
 const service={type:'memo',name:'مذكرة',price:300};
 s.user={id:'e3',role:'employee'};await assert.rejects(s.changeService('r1',service,'تصحيح'),/غير مسند/);assert.equal(db.calls.length,0);
 s.user=admin;await assert.rejects(s.changeService('r1',service,'تصحيح'),/تغيّر/);assert.equal(db.calls.length,1);
});

test('service repricing resolves pending quotation and rejects missing/negative prices',async()=>{
 const db=mockDB(op=>op.table==='request_activity_log'?{}:{data:{id:'r',...op.update[0]}}),s=store(db);s.rows.r={id:'r',payment_status:'pending_quote',updated_at:'old'};
 for(const price of [undefined,NaN,-1])await assert.rejects(s.changeService('r',{type:'official_letter',name:'خطاب',price},'تصحيح'));
 assert.equal(db.calls.length,0);
 const r=await s.changeService('r',{type:'official_letter',name:'خطاب',price:150},'تصحيح');assert.equal(r.data.price,150);assert.equal(r.data.payment_status,'manual_pending');
});
test('sent-message management uses the authenticated endpoint and retains server ownership',async()=>{
 const s=store(mockDB(()=>{throw Error('no anon messages')}));const calls=[];
 s.api=async(route,payload)=>{calls.push({route,payload});return {messages:[{id:'9223372036854775807',from_id:'old-employee',is_mine:true}]}};
 const rows=await s.sentMessages();assert.equal(rows[0].is_mine,true);assert.equal(rows[0].id,'9223372036854775807');assert.equal(calls[0].route,'ops-sent-messages');
});

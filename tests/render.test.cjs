const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const files=['data','core','app','views','views2','views3','letters','lex','live-store','live','live-actions'];
function context(){const c=vm.createContext({console,URL,URLSearchParams,Intl,Date,Set,Map,AbortController,Blob,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},localStorage:{getItem:()=>null,setItem(){}},document:{addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],documentElement:{dataset:{theme:'light'}}},window:{addEventListener(){}},location:{hash:''},navigator:{}});vm.runInContext(files.map(f=>fs.readFileSync(path.join(__dirname,'../araf-ops-src',f+'.js'),'utf8')).join('\n'),c);return c;}
test('empty real database renders every view without mock rows',()=>{const c=context();vm.runInContext('rebuildMetrics()',c);assert.equal(vm.runInContext('REQUESTS.length+TEAM.length+ENTITIES.length+ACTIVATIONS.length+TICKETS.length',c),0);for(const name of ['home','requests','cases','team','activity','support','business','flow']){const html=vm.runInContext(`VIEWS.${name}()`,c);assert.equal(typeof html,'string');const bad=html.match(/.{0,60}(?:NaN|undefined|EMP-00|فهد المطيري).{0,60}/);assert.equal(bad?.[0],undefined,name+': '+bad?.[0]);}});
test('live mappings preserve actual case classification and supplied service name',()=>{const c=context();const r=vm.runInContext(`mapRequest({id:'r',service_type:'case_representation',service_name:'نزاع عمالي فعلي',customer_name:'العميل',status:'new',payment_status:'paid',created_at:'2026-09-22T09:00:00Z',notes:[]})`,c);assert.equal(r.kind,'cases');assert.equal(r.service_name,'نزاع عمالي فعلي');assert.equal(r.customer,'العميل');});
test('nonempty request detail and lists render real values safely',()=>{const c=context();vm.runInContext(`TEAM.push(mapEmployee({id:'e',full_name:'Test',status:'active',created_at:'2026-01-01'}));ME='e';REQUESTS.push(mapRequest({id:'r',customer_name:'<img src=x onerror=alert(1)>',customer_phone:'0500',details:'Real details',service_type:'consultation',status:'new',payment_status:'paid',created_at:'2026-09-21',notes:[],attachments:[{name:'file.pdf',url:'https://example.com/file.pdf'}]}));rebuildMetrics()`,c);const html=vm.runInContext('reqTable(REQUESTS)+reqPanel("r").body+reqPanel("r").head',c);assert.match(html,/Real details/);assert.match(html,/https:\/\/example.com\/file.pdf/);assert.doesNotMatch(html,/<img src=x/);});
test('business snapshot preserves cycle usage, real rows, and cancelled requests',()=>{const c=context();vm.runInContext(`applyBusiness({entities:[{id:'org1',name:'Actual Org',plan_key:'asas',subscription_status:'active',current_cycle_start:'2026-09-01',current_cycle_end:'2026-09-30'}],requests:[{id:'br1',entity_id:'org1',subject:'Actual Request',service_key:'consult',status:'cancelled',created_at:'2026-09-01'}],usage:[{entity_id:'org1',service_key:'consult',cycle_start:'2026-09-01',cycle_end:'2026-09-30',units:2},{entity_id:'org1',service_key:'consult',cycle_start:'2026-08-01',cycle_end:'2026-08-31',units:9}]});rebuildMetrics()`,c);assert.equal(vm.runInContext('ENTITIES[0].usage.consult',c),2);assert.match(vm.runInContext('VIEWS.business()',c),/Actual Request/);const html=vm.runInContext("S.bizTab='entities';VIEWS.business()",c);assert.match(html,/Actual Org/);assert.equal(/NaN|undefined/.test(html),false);});
test('deletion is red and directly visible in every request presentation, with different labels by actor',()=>{
 const c=context();vm.runInContext(`ME='e1';LIVE.store={user:{id:'e1',role:'admin'}};REQUESTS.push(mapRequest({id:'r',customer_name:'Client',status:'new',payment_status:'paid',created_at:'2026-10-01'}));`,c);
 assert.equal(vm.runInContext('CTX.req("r").at(-1).l',c),'حذف الطلب');
 vm.runInContext(`LIVE.deletes=[{id:'d',request_id:'r',status:'pending',requested_by:'e1'}]`,c);
 for(const expr of ['reqTable(REQUESTS)','caseTable(REQUESTS)','caseCards(REQUESTS)','reqBoard(REQUESTS,"direct")']){
  const html=vm.runInContext(expr,c);assert.match(html,/delete-pending/);assert.match(html,/بانتظار اعتماد الحذف/);assert.match(html,/class="delete-marker"/);
 }
 vm.runInContext(`ME='e2';LIVE.store.user.id='e2'`,c);assert.equal(vm.runInContext('CTX.req("r").at(-1).l',c),'اعتماد الحذف');assert.match(vm.runInContext('reqTable(REQUESTS)',c),/اعتماد الحذف/);
 vm.runInContext(`LIVE.store.user.role='employee'`,c);assert.doesNotMatch(vm.runInContext('deleteMarker("r")',c),/>اعتماد الحذف</);
});
test('home messages render persisted data safely with unread and sender/recipient names',()=>{
 const c=context();vm.runInContext(`ME='e2';LETTERS.push(mapLetter({id:'99',from_id:'e1',to_id:'e2',from_name:'<script>x</script>',to_name:'Recipient',subject:'Actual subject',body:'<img src=x onerror=x>',urgent:true,created_at:'2026-10-01'}))`,c);
 assert.equal(vm.runInContext('unreadLetters()',c),1);const html=vm.runInContext('lettersSec()+letterPanel("99")().body',c);
 assert.match(html,/Actual subject/);assert.match(html,/غير مقروءة/);assert.doesNotMatch(html,/<script>x|<img src=x/);
 vm.runInContext(`upsertLetter({...LETTERS[0],read_at:'2026-10-02'})`,c);assert.equal(vm.runInContext('unreadLetters()',c),0);
});
test('administrator employee panel has a working message action without entity actions',()=>{
 const c=context();vm.runInContext(`ME='e1';TEAM.push(mapEmployee({id:'e2',full_name:'Employee',status:'active'}));LIVE.store={user:{role:'admin'}};openDrawer=render=>{globalThis.memberPanel=render()};openMember('e2')`,c);
 assert.match(c.memberPanel.foot,/data-a="messageEmployee"/);assert.doesNotMatch(c.memberPanel.foot,/deleteEntity/);
});
function actionContext(){const c=context();c.toasts=[];vm.runInContext(`ME='e1';closeModal=()=>{};rerender=()=>{};refreshDrawer=()=>{};livePaintStatus=()=>{};toast=m=>toasts.push(m);LIVE.store={user:{id:'e1'},verify:async()=>({id:'e1'})};`,c);return c;}
function fakeButton(){return {innerHTML:'تأكيد الإسناد',disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}};}
test('assignment UI responds immediately, waits for persistence, and skips whole-platform reload',async()=>{
 const c=actionContext();c.button=fakeButton();let confirmSave;c.saved=new Promise(resolve=>confirmSave=resolve);c.refreshes=0;
 vm.runInContext(`LIVE.refresh=async()=>{refreshes++;return new Promise(()=>{})};REQUESTS.push(mapRequest({id:'r',status:'new'}));`,c);
 const done=vm.runInContext(`LIVE.run('request:r',()=>saved,'حُفظ الإسناد',{button})`,c);
 assert.equal(c.button.disabled,true);assert.equal(c.button.attrs['aria-busy'],'true');assert.match(c.button.innerHTML,/جارٍ الحفظ/);assert.equal(c.toasts.length,0);
 confirmSave({data:{id:'r',status:'assigned',assigned_to:'e2'}});await done;
 assert.equal(c.refreshes,0);assert.equal(vm.runInContext('REQ("r").assigned_to',c),'e2');assert.equal(c.button.disabled,false);assert.equal(c.toasts[0],'حُفظ الإسناد');
});
test('failed save restores controls and leaves the request unchanged',async()=>{
 const c=actionContext();c.button=fakeButton();vm.runInContext(`REQUESTS.push(mapRequest({id:'r',status:'new'}))`,c);
 await vm.runInContext(`LIVE.run('request:r',async()=>{throw new Error('denied')},'saved',{button})`,c);
 assert.equal(c.button.disabled,false);assert.equal(vm.runInContext('REQ("r").status',c),'new');assert.deepEqual(c.toasts,['denied']);
});
test('refresh started before a saved mutation cannot replace its confirmed row',async()=>{
 const c=actionContext();let finish;c.oldRows=new Promise(resolve=>finish=resolve);
 vm.runInContext(`LIVE.store={user:{id:'e1'},all:async()=>[],requests:()=>oldRows,messages:async()=>[]};liveApi=async()=>({entities:[],requests:[]});REQUESTS.push(mapRequest({id:'r',status:'new'}));`,c);
 const refreshing=vm.runInContext('LIVE.refresh()',c);
 vm.runInContext(`LIVE.requestVersion++;REQUESTS.splice(0,1,mapRequest({id:'r',status:'assigned',assigned_to:'e2'}));`,c);
 finish([{id:'r',status:'new'}]);await refreshing;assert.equal(vm.runInContext('REQ("r").status',c),'assigned');
});

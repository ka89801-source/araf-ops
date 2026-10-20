const {test}=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/ops/[route]');
const UID='11111111-1111-4111-8111-111111111111',TO='22222222-2222-4222-8222-222222222222';
const auth={id:UID},member=[{admin_role:'employee'}];
const message=overrides=>({id:'9223372036854775807',to_id:TO,from_name:'مرسل <script>x</script>',subject:'موضوع <img src=x onerror=x>',urgent:true,created_at:new Date().toISOString(),...overrides});
const recipient=[{email:'member@example.com',status:'active'}];
async function fixture(request,replies,check,env={}){
 const original=global.fetch,vars=['SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','OPS_MESSAGE_FROM','BUSINESS_ALERT_FROM'];
 const old=Object.fromEntries(vars.map(k=>[k,process.env[k]])),calls=[];
 Object.assign(process.env,{SUPABASE_SERVICE_ROLE_KEY:'test-service-key',RESEND_API_KEY:'test-email-key',OPS_MESSAGE_FROM:'أعراف <alerts@example.com>',BUSINESS_ALERT_FROM:''},env);
 global.fetch=async(url,options)=>{
   calls.push({url,options});const reply=replies.shift();assert.notEqual(reply,undefined,'unexpected fetch');
   if(reply instanceof Error)throw reply;
   return {ok:true,json:async()=>reply,...reply.response};
 };
 try{
  const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
  await handler({method:'POST',query:{route:'ops-notify-urgent-message'},headers:{authorization:'Bearer caller'},body:{id:'9223372036854775807'},...request},res);
  await check(res,calls);assert.equal(replies.length,0,'unused mock responses');
 }finally{global.fetch=original;for(const k of vars)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
}
test('urgent email denies invalid sessions, input and membership without mailing',async()=>{
 for(const [request,status] of [[{method:'GET'},405],[{headers:{}},401],[{body:{id:'1&sender_auth_id=neq.x'}},400],[{body:{id:'9223372036854775808'}},400],[{body:'{'},400]])
   await fixture(request,[],(r,c)=>{assert.equal(r.code,status);assert.equal(c.length,0)});
 await fixture({},[{response:{ok:false}}],r=>assert.equal(r.code,401));
 for(const actors of [[],[{admin_role:'visitor'}],[...member,...member]])
   await fixture({},[auth,actors],r=>assert.equal(r.code,403));
 await fixture({},[auth,member,[]],(r,c)=>{assert.equal(r.code,404);assert.equal(c.length,3)});
});
test('urgent email uses only saved urgency, owner, recipient and content; sends one escaped Arabic alert',async()=>{
 await fixture({body:{id:'9223372036854775807',email:'attacker@example.com',to_id:UID,urgent:true,subject:'injected'}},[auth,member,[message()],recipient,{id:'provider-email-id'}],(r,c)=>{
   assert.equal(r.code,200);assert.equal(r.body.email_status,'accepted');assert.equal(r.body.id,'9223372036854775807');
   assert.equal(c[0].options.headers.Authorization,'Bearer caller');
   const saved=new URL(c[2].url).searchParams;assert.equal(saved.get('sender_auth_id'),'eq.'+UID);assert.equal(saved.get('id'),'eq.9223372036854775807');assert.match(saved.get('select'),/^id::text,/);assert.doesNotMatch(saved.get('select'),/body/);
   const employee=new URL(c[3].url).searchParams;assert.equal(employee.get('id'),'eq.'+TO);assert.equal(employee.get('select'),'email,status');
   const mail=c[4];assert.equal(mail.url,'https://api.resend.com/emails');assert.equal(mail.options.method,'POST');
   assert.equal(mail.options.headers['Idempotency-Key'],'araf-ops/yuoforvbxpwislmdrvvb/urgent-message/9223372036854775807');
   const payload=JSON.parse(mail.options.body);assert.deepEqual(payload.to,['member@example.com']);assert.match(payload.subject,/رسالة عاجلة/);
   assert.match(payload.html,/dir="rtl"/);assert.match(payload.html,/&lt;img/);assert.doesNotMatch(payload.html,/<script>|<img|injected|attacker/);
   assert.match(payload.html,/https:\/\/araf-ops\.vercel\.app\/home\.html/);assert.match(payload.text,/الموضوع:/);
   assert.doesNotMatch(JSON.stringify(r.body),/member@example|test-service|test-email|provider-email/);
   assert.ok(c.slice(0,4).every(call=>!call.options.method));
 });
});
test('normal, stale and invalid-date messages never send email even with forged urgency',async()=>{
 for(const row of [message({urgent:false}),message({urgent:'true'}),message({created_at:'bad'}),message({created_at:new Date(Date.now()-23*3600000).toISOString()}),message({created_at:new Date(Date.now()+120000).toISOString()})])
  await fixture({body:{id:row.id,urgent:true}},[auth,member,[row]],(r,c)=>{assert.equal(r.code,409);assert.equal(c.length,3)});
});
test('missing config or invalid/inactive recipient returns explicit failure and does not alter messages',async()=>{
 for(const env of [{RESEND_API_KEY:''},{OPS_MESSAGE_FROM:''},{OPS_MESSAGE_FROM:'evil\r\nBcc: attacker@example.com'}])
  await fixture({},[auth,member,[message()]],(r,c)=>{assert.equal(r.code,503);assert.equal(c.length,3)},env);
 for(const rows of [[{email:'invalid',status:'active'}],[{email:'member@example.com',status:'inactive'}],[{email:'one@example.com,two@example.com',status:'active'}]])
  await fixture({},[auth,member,[message()],rows],(r,c)=>{assert.equal(r.code,422);assert.equal(c.length,4)});
 await fixture({},[auth,member,[message({to_id:'x),active.eq.true'})]],r=>assert.equal(r.code,422));
});
test('recipient without employee row resolves exact active membership then Auth email, never user_metadata',async()=>{
 await fixture({},[auth,member,[message()],[],[{auth_user_id:TO}],{email:'auth-member@example.com',user_metadata:{email:'attacker@example.com'}},{id:'sent'}],(r,c)=>{
  assert.equal(r.code,200);const q=new URL(c[4].url).searchParams;
  assert.equal(q.get('active'),'eq.true');assert.equal(q.get('or'),`(employee_external_id.eq.${TO},and(employee_external_id.is.null,auth_user_id.eq.${TO}))`);
  assert.equal(c[5].url,'https://yuoforvbxpwislmdrvvb.supabase.co/auth/v1/admin/users/'+TO);
  assert.deepEqual(JSON.parse(c[6].options.body).to,['auth-member@example.com']);
 });
 for(const rows of [[],[{auth_user_id:TO},{auth_user_id:UID}]])
  await fixture({},[auth,member,[message()],[],rows],r=>assert.equal(r.code,422));
});
test('provider failures and timeouts stay errors; retries have identical keys and bodies',async()=>{
 const attempts=[],row=message();
 for(const reply of [new Error('test-email-key confidential'),{response:{ok:false},message:'private provider diagnostics'},{},{id:'sent'},{id:'sent'}])
  await fixture({},[auth,member,[row],recipient,reply],(r,c)=>{
   assert.equal(r.code,reply.id?200:502);assert.doesNotMatch(JSON.stringify(r.body),/test-email-key|confidential|diagnostics/);
   attempts.push(c[4].options);
  });
 assert.equal(new Set(attempts.map(c=>c.headers['Idempotency-Key'])).size,1);
 assert.equal(new Set(attempts.map(c=>c.body)).size,1);
});
test('existing BUSINESS_ALERT_FROM may supply the verified sender',async()=>{
 await fixture({},[auth,member,[message()],recipient,{id:'sent'}],(r,c)=>{
  assert.equal(r.code,200);assert.equal(JSON.parse(c[4].options.body).from,'Araf Business <alerts@example.com>');
 },{OPS_MESSAGE_FROM:'',BUSINESS_ALERT_FROM:'Araf Business <alerts@example.com>'});
});

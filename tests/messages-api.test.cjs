const {test}=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/ops/[route]');
const UID='11111111-1111-4111-8111-111111111111';
function response(){return {setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}}}
async function fixture(request,replies,check){
 const original=global.fetch,key=process.env.SUPABASE_SERVICE_ROLE_KEY,calls=[];
 process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-key';
 global.fetch=async(url,options)=>{calls.push({url,options});const next=replies.shift();if(next instanceof Error)throw next;assert.ok(next,'unexpected fetch');return {ok:true,json:async()=>next,...(next.response||{})}};
 try{const res=response();await handler({method:'POST',query:{route:'ops-delete-message'},headers:{authorization:'Bearer caller'},body:{id:'1'},...request},res);await check(res,calls)}
 finally{global.fetch=original;if(key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=key;}
}
test('delete endpoint rejects absent sessions, wrong methods, malformed IDs before DB access',async()=>{
 for(const [req,code] of [[{headers:{}},401],[{method:'GET'},405],[{body:{id:'1&sender_auth_id=neq.x'}},400],[{body:{id:'9223372036854775808'}},400],[{body:'{'},400]])
  await fixture(req,[],(r,c)=>{assert.equal(r.code,code);assert.equal(c.length,0)});
});
test('delete endpoint denies invalid auth and inactive or unsupported members',async()=>{
 await fixture({},[{response:{ok:false}}],(r,c)=>{assert.equal(r.code,401);assert.equal(c.length,1)});
 for(const actors of [[],[{admin_role:'visitor'}],[{admin_role:'admin'},{admin_role:'employee'}]])
  await fixture({},[{id:UID},actors],(r,c)=>{assert.equal(r.code,403);assert.equal(c.length,2)});
});
test('delete endpoint uses verified auth identity for sender ownership even for administrators',async()=>{
 for(const role of ['admin','manager','employee'])await fixture({body:{id:'9223372036854775807',sender_auth_id:'attacker',from_id:'other'}},[{id:UID},[{admin_role:role}],[{sender_auth_id:UID}]],(r,c)=>{
  assert.equal(r.code,200);assert.equal(r.body.id,'9223372036854775807');
  assert.equal(c[0].options.headers.Authorization,'Bearer caller');
  const membership=new URL(c[1].url);assert.equal(membership.searchParams.get('active'),'eq.true');assert.equal(membership.searchParams.get('auth_user_id'),'eq.'+UID);
  const deletion=new URL(c[2].url);assert.equal(deletion.pathname,'/rest/v1/ops_v2_messages');assert.equal(deletion.searchParams.get('sender_auth_id'),'eq.'+UID);assert.equal(deletion.searchParams.get('id'),'eq.9223372036854775807');assert.equal(c[2].options.method,'DELETE');
 });
});
test('another sender or missing message returns no success, and network failures stay errors',async()=>{
 await fixture({},[{id:UID},[{admin_role:'admin'}],[]],r=>assert.equal(r.code,404));
 await fixture({},[{id:UID},[{admin_role:'admin'}],new Error('private upstream error')],r=>{assert.equal(r.code,502);assert.doesNotMatch(JSON.stringify(r.body),/private|server-test/)});
});

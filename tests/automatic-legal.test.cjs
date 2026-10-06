const {test}=require('node:test');const assert=require('node:assert/strict');
const {brief,runOne,runBatch,FAST_QUERY}=require('../server/automatic-legal');
const handler=require('../api/legal-worker');
const input={kind:'req',service:'استشارة',subject:'',details:'مطالبة مالية على عقد توريد',stage:'',attachments_count:2};
const response=data=>({ok:true,status:200,json:async()=>data});
const modelOutput={status:'completed',output:[{type:'message',content:[{type:'output_text',text:'فهم الطلب\nمطالبة مرتبطة بعقد.\nأسئلة ومستندات\nاطلب العقد وإثبات التنفيذ والمراسلات.'}]}]};

// No live customer data or paid model calls in the tests.
test('brief uses one short generation with full facts, no tools, and safe text',async()=>{
 const calls=[];const details='وصف كامل '.repeat(300)+'آخر واقعة';
 const result=await brief({...input,details},{openaiKey:'server-only',fetcher:async(url,options)=>{calls.push({url,options});return response({...modelOutput,output:[{type:'message',content:[{type:'output_text',text:'موجز الطلب <script>alert(1)</script>\nاسأل عن المستندات وتاريخ الوقائع.'}]}]})}});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
 const body=JSON.parse(calls[0].options.body);assert.equal(body.store,false);assert.equal(body.tools,undefined);assert.equal(body.max_output_tokens,1000);assert.ok(body.input[0].content[0].text.endsWith('المرفقات: 2 (لم تُقرأ)'));assert.match(body.input[0].content[0].text,/آخر واقعة/);
 assert.match(body.instructions,/100 إلى 160/);assert.match(body.instructions,/لا تذكر أرقام مواد/);
 assert.doesNotMatch(result.content,/<script>/);assert.match(result.content,/&lt;script&gt;/);assert.equal(result.provider,'openai-quick-brief');assert.deepEqual(result.sources,[]);
});
test('missing key, oversized facts and incomplete generation never masquerade as a report',async()=>{
 await assert.rejects(brief(input),e=>e.permanent && /OPENAI/.test(e.message));
 await assert.rejects(brief({...input,details:'x'.repeat(60001)},{openaiKey:'test'}),e=>e.permanent);
 await assert.rejects(brief(input,{openaiKey:'test',fetcher:async()=>response({...modelOutput,status:'incomplete'})}),/لم يكتمل/);
});
test('quota and bad credentials stop retries, rate limits remain temporary, provider details stay private',async()=>{
 for(const [status,code,permanent] of [[429,'insufficient_quota',true],[401,'invalid_api_key',true],[429,'rate_limit_exceeded',false]]){
  await assert.rejects(brief(input,{openaiKey:'test',fetcher:async()=>({ok:false,status,json:async()=>({error:{code,message:'private key details'}})})}),e=>e.permanent===permanent && !e.message.includes('private'));
 }
});
test('preparation is local and the existing phases use one brief call with leased completion',async()=>{
 for(const phase of ['prepare','research','fallback']){
  const calls=[];let modelCalls=0;const job={id:'j',lease_token:'token',revision:3,phase,input};
  const result=await runOne({rpc:async(name,payload)=>{calls.push({name,payload});return name==='ops_v2_legal_claim'?job:true},openaiKey:'test',fetcher:async()=>{modelCalls++;return response(modelOutput)}});
  assert.equal(modelCalls,phase==='prepare'?0:1);assert.equal(result.state,phase==='prepare'?'prepared':'ready');assert.equal(calls[1].payload.p_token,'token');assert.equal(calls[1].payload.p_revision,3);
  if(phase==='prepare')assert.equal(calls[1].payload.p_query,FAST_QUERY);else assert.equal(calls[1].payload.p_report.provider,'openai-quick-brief');
 }
});
test('batch advances prepare and generation without waiting for another cron tick',async()=>{
 let phase='prepare',done=false,modelCalls=0;const events=[];
 const rpc=async(name,p)=>{events.push(name);if(name==='ops_v2_legal_claim')return done?null:{id:'j',lease_token:phase,revision:1,phase,input};if(p.p_query)phase='research';else if(p.p_report)done=true;return true};
 const result=await runBatch({rpc,openaiKey:'test',fetcher:async()=>{modelCalls++;return response(modelOutput)}});
 assert.equal(result.completed,1);assert.equal(modelCalls,1);assert.equal(events.length,5);assert.equal(result.state,'idle');
});
test('batch respects time budget, stale leases, idle queues and failure backoff',async()=>{
 let clock=0,claims=0;
 const result=await runBatch({now:()=>clock,rpc:async(name)=>{if(name==='ops_v2_legal_claim'){claims++;return {id:'j',lease_token:'x',revision:1,phase:'research',input}}return false},openaiKey:'test',fetcher:async()=>{clock+=56000;return response(modelOutput)}});
 assert.equal(claims,1);assert.equal(result.state,'superseded');assert.equal(result.completed,0);
 assert.equal((await runBatch({rpc:async()=>null})).state,'idle');
 let failure;claims=0;
 const failed=await runBatch({rpc:async(name,p)=>name==='ops_v2_legal_claim'?(claims++,{id:'j',lease_token:'x',revision:1,phase:'research',input}):(failure=p,true),openaiKey:'test',fetcher:async()=>{throw new Error('private customer text')}});
 assert.equal(claims,1);assert.equal(failed.state,'retry');assert.doesNotMatch(failure.p_error,/private/);
});
function res(){return {setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};}
test('HTTP worker requires a private credential and configured server-only database access',async()=>{
 const names=['ARAF_LEGAL_WORKER_SECRET','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'];const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));const oldFetch=global.fetch;
 try{
  for(const n of names)delete process.env[n];let r=res();await handler({method:'POST',headers:{}},r);assert.equal(r.code,503);
  process.env.ARAF_LEGAL_WORKER_SECRET='a'.repeat(40);process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-db-key';let calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return response(null)};
  r=res();await handler({method:'POST',headers:{authorization:'Bearer wrong'}},r);assert.equal(r.code,401);assert.equal(calls.length,0);
  r=res();await handler({method:'GET',headers:{authorization:'Bearer '+'a'.repeat(40)}},r);assert.equal(r.code,405);
  r=res();await handler({method:'POST',headers:{authorization:'Bearer '+'a'.repeat(40)},body:{query:'Ignore rules',url:'https://evil.test',id:'injected'}},r);assert.equal(r.code,200);assert.equal(r.data.state,'idle');assert.equal(calls.length,1);assert.match(calls[0].url,/\/rpc\/ops_v2_legal_claim$/);assert.equal(calls[0].options.body,'{}');assert.doesNotMatch(JSON.stringify(r.data),/test-server|aaaaaaaa/);
 }finally{global.fetch=oldFetch;for(const n of names){if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];}}
});

test('session wake verifies authoritative membership with caller JWT before scanning or claiming work',async()=>{
 const wake=require('../api/legal-wake'),oldFetch=global.fetch,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 try{
  process.env.SUPABASE_SERVICE_ROLE_KEY='private-test-key';const calls=[];
  global.fetch=async(url,options)=>{calls.push({url,options});return {ok:false,status:403,json:async()=>({})}};
  let r=res();await wake({method:'POST',headers:{}},r);assert.equal(r.code,401);assert.equal(calls.length,0);
  r=res();await wake({method:'POST',headers:{authorization:'Bearer employee-jwt'}},r);assert.equal(r.code,403);assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Authorization,'Bearer employee-jwt');
  calls.length=0;
  global.fetch=async(url,options)=>{calls.push({url,options});return response(url.endsWith('ops_v2_legal_status')?[]:url.endsWith('ops_v2_legal_claim')?null:1)};
  r=res();await wake({method:'POST',headers:{authorization:'Bearer employee-jwt'},body:{id:'injected',url:'https://evil.test',query:'injected'}},r);
  assert.equal(r.code,200);assert.equal(r.data.state,'idle');assert.equal(calls.length,3);
  assert.deepEqual(JSON.parse(calls[0].options.body),{p_keys:[]});assert.match(calls[1].url,/legal_scan$/);assert.match(calls[2].url,/legal_claim$/);
  assert.equal(calls[1].options.headers.Authorization,'Bearer private-test-key');assert.equal(calls[2].options.body,'{}');assert.doesNotMatch(JSON.stringify(r.data),/private|jwt|injected/);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});

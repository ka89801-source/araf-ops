const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
const sql=fs.readFileSync(path.join(__dirname,'../../supabase/ops-v2-legal.sql'),'utf8');
const features=fs.readFileSync(path.join(__dirname,'../../supabase/ops-v2-features.sql'),'utf8');
const actor=features.slice(features.indexOf('create or replace function public.ops_v2_actor()'),features.indexOf('create table if not exists public.ops_v2_messages'));
const admin='00000000-0000-4000-8000-000000000001',employee='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const biz='10000000-0000-4000-8000-000000000001';
const report={content:'<h2>تقرير تحضيري</h2><p>اسأل عن الوقائع والمستندات.</p>',sources:[{url:'https://laws.boe.gov.sa',title:'المصدر'}]};
test('automatic legal queue on isolated PostgreSQL',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.business_admins(auth_user_id uuid primary key,employee_external_id text,display_name text,admin_role text,active boolean);
 insert into public.business_admins values('${admin}','a','Admin','admin',true),('${employee}','e','Employee','employee',true),('${other}','o','Other','employee',true);
 create table public.service_requests(id text primary key,service_type text,details text,assigned_to text,status text,created_at timestamptz,customer_phone text,attachments jsonb);
 create table public.business_requests(id uuid primary key,service_key text,subject text,details text,created_at timestamptz);
 insert into public.service_requests values('new','consultation','وصف الطلب الكامل','e','new',now(),'0500000000','[{"url":"https://private.test/attachment"}]'),('old','consultation','طلب قديم','e','new',now()-interval '1 month',null,'[]');
 insert into public.business_requests values('${biz}','contracts','مراجعة عقد','تفاصيل عقد',now());`);
 await db.exec(actor);
 const asRole=(role,uid,query,params=[])=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid || '']);return (await tx.query(query,params)).rows[0]?.result;});
 const worker=(name,params=[])=>asRole('service_role',null,`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as result`,params);
 const read=(uid,kind='req',id='new',full=true)=>asRole('authenticated',uid,'select public.ops_v2_legal_report($1,$2,$3) as result',[kind,id,full]);
 const retry=(uid,kind='req',id='new')=>asRole('authenticated',uid,'select public.ops_v2_legal_retry($1,$2) as result',[kind,id]);
 const finish=(j,{query=null,result=null,error=null,permanent=false}={})=>worker('ops_v2_legal_finish',[j.id,j.lease_token,j.revision,query,result,error,permanent]);
 const claim=()=>worker('ops_v2_legal_claim');
 const reset=async()=>{await db.exec(`delete from public.ops_v2_legal_jobs;update public.ops_v2_legal_config set enabled=true,starts_at=now()-interval '1 day';update public.service_requests set details='وصف الطلب الكامل',assigned_to='e' where id='new';`);};
 await t.test('installation is repeatable and writes no source rows',async()=>{
  const before=(await db.query('select to_jsonb(r) as row from public.service_requests r order by id')).rows;
  await db.exec(sql);await db.exec(sql);assert.deepEqual((await db.query('select to_jsonb(r) as row from public.service_requests r order by id')).rows,before);
  assert.equal((await db.query('select count(*)::int as n from public.ops_v2_legal_jobs')).rows[0].n,0);
 });
 await t.test('fast batch completes and persists a brief with the installed SQL in one invocation',async()=>{
  await reset();await retry(employee);
  const {runBatch}=require('../../server/automatic-legal');let calls=0;
  const rpc=(name,payload={})=>asRole('service_role',null,`select public.${name}(${Object.keys(payload).map((k,i)=>k+'=> $'+(i+1)).join(',')}) as result`,Object.values(payload));
  const result=await runBatch({rpc,openaiKey:'test',fetcher:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'فهم الطلب: مطالبة مالية. أسئلة ومستندات: اطلب العقد وإثبات التنفيذ.'}]}]})}}});
  assert.equal(calls,1);assert.equal(result.completed,1);assert.equal((await read(employee)).report.provider,'openai-quick-brief');
  assert.equal((await read(employee)).status,'ready');await reset();
 });
 await t.test('private helpers and queue cannot be accessed directly by callers',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   await assert.rejects(asRole(role,admin,'select * from public.ops_v2_legal_jobs'),/permission denied/);
   await assert.rejects(asRole(role,admin,"select public.ops_v2_legal_source('req','new')"),/permission denied/);
  }
  await assert.rejects(asRole('authenticated',admin,'select public.ops_v2_legal_claim()'),/permission denied/);
  await assert.rejects(asRole('anon',null,"select public.ops_v2_legal_report('req','new',true)"),/permission denied/);
 });
 await t.test('scans new service and business requests once; excludes old requests and contact fields',async()=>{
  await reset();await worker('ops_v2_legal_scan');await worker('ops_v2_legal_scan');
  const rows=(await db.query('select * from public.ops_v2_legal_jobs')).rows;assert.equal(rows.length,2);
  assert.ok(rows.some(r=>r.request_kind==='biz'));assert.ok(!rows.some(r=>r.request_id==='old'));
  assert.ok(rows.every(r=>r.revision===1));assert.doesNotMatch(JSON.stringify(rows),/0500000000|private.test/);
 });
 await t.test('single lease, two stages and durable reports; read scope follows current assignment',async()=>{
  await reset();await retry(employee);let j=await claim();assert.equal(j.phase,'prepare');assert.equal(await claim(),null);
  assert.equal(await finish({...j,lease_token:'00000000-0000-4000-8000-000000000099'},{query:'ملخص خاطئ'}),false);
  assert.equal(await finish(j,{query:'ملخص الطلب للفاحص'}),true);j=await claim();assert.equal(j.phase,'research');
  assert.equal(await finish(j,{result:report}),true);assert.equal(await finish(j,{result:report}),false);
  assert.equal((await read(employee)).report.content,report.content);assert.equal((await read(admin)).status,'ready');
  assert.equal((await read(admin,'req','new',false)).report,undefined);
  await assert.rejects(read(other),/غير متاح/);
  await db.exec("update public.service_requests set assigned_to='o' where id='new'");
  await assert.rejects(read(employee),/غير متاح/);assert.equal((await read(other)).report.content,report.content);
 });
 await t.test('a changed request invalidates report immediately and discards an in-flight old result',async()=>{
  await reset();await retry(employee);const old=await claim();
  await db.exec("update public.service_requests set details='وقائع مختلفة' where id='new'");
  assert.equal((await read(employee)).status,'outdated');assert.equal(await finish(old,{query:'ملخص قديم'}),false);
  const current=await claim();assert.equal(current.revision,old.revision+1);assert.match(current.input.details,/مختلفة/);
  await finish(current,{query:'ملخص جديد'});const research=await claim();await finish(research,{result:report});
  await db.exec("update public.service_requests set details='وقائع تغيرت ثانية' where id='new'");
  const stale=await read(employee);assert.equal(stale.status,'outdated');assert.equal(stale.report,undefined);
 });
 await t.test('fallback gets a new durable lease and source changes are checked before sending a job',async()=>{
  await reset();await retry(employee);const initial=await claim();await finish(initial,{query:'ملخص واقعة'});const original=await claim();
  assert.equal(await worker('ops_v2_legal_finish',[original.id,original.lease_token,original.revision,null,null,null,false,true]),true);
  const fallback=await claim();assert.equal(fallback.phase,'fallback');assert.notEqual(fallback.lease_token,original.lease_token);assert.equal(fallback.attempts,1);await finish(fallback,{result:report});assert.equal((await read(employee)).status,'ready');
  await reset();await retry(employee);await db.exec("update public.service_requests set details='وقائع قبل المطالبة بالمهمة' where id='new'");assert.equal(await claim(),null);assert.match((await claim()).input.details,/قبل المطالبة/);
 });
 await t.test('expired workers cannot finish; stalled jobs stop after three leases',async()=>{
  await reset();await retry(employee);let last;
  for(let i=0;i<3;i++){last=await claim();assert.equal(last.attempts,i+1);await db.exec("update public.ops_v2_legal_jobs set lease_until=now()-interval '1 second'");}
  assert.equal(await finish(last,{query:'نتيجة متأخرة'}),false);assert.equal(await claim(),null);assert.equal((await read(employee)).status,'failed');
 });
 await t.test('transient errors retry with delay; permanent errors remain visible without an AI retry loop',async()=>{
  await reset();await retry(employee);const j=await claim();await finish(j,{error:'المساعد مشغول'});
  assert.equal(await claim(),null);assert.equal((await read(employee)).status,'queued');
  await db.exec("update public.ops_v2_legal_jobs set available_at=now()-interval '1 second'");
  await finish(await claim(),{error:'إعداد التلخيص مطلوب',permanent:true});assert.equal((await read(employee)).status,'failed');assert.equal(await claim(),null);
 });
 await t.test('batch status does not leak other employees requests and never includes reports',async()=>{
  await reset();await retry(employee);const keys=[{kind:'req',id:'new'},{kind:'biz',id:biz}];
  const rows=await asRole('authenticated',employee,'select public.ops_v2_legal_status($1) as result',[keys]);assert.equal(rows.length,1);assert.equal(rows[0].key,'req:new');assert.equal(rows[0].input,undefined);
  assert.deepEqual(await asRole('authenticated',other,'select public.ops_v2_legal_status($1) as result',[keys]),[]);
  assert.equal((await asRole('authenticated',admin,'select public.ops_v2_legal_status($1) as result',[keys])).length,2);
 });
 await t.test('old requests require an explicit authorized enqueue; revoked membership cannot access reports',async()=>{
  await reset();assert.equal((await read(employee,'req','old')).status,'not_queued');await retry(employee,'req','old');
  await assert.rejects(retry(other,'req','old'),/غير متاح/);
  await db.exec(`update public.business_admins set active=false where auth_user_id='${employee}'`);
  await assert.rejects(read(employee),/غير مفعّل/);await db.exec(`update public.business_admins set active=true where auth_user_id='${employee}'`);
 });
 await t.test('deleted sources cannot expose or complete reports; scan removes their copied text',async()=>{
  await reset();await retry(employee,'req','old');const j=await claim();await db.exec("delete from public.service_requests where id='old'");
  await assert.rejects(read(employee,'req','old'),/غير متاح/);assert.equal(await finish(j,{query:'ملخص طلب محذوف'}),false);
  assert.equal((await db.query("select count(*)::int as n from public.ops_v2_legal_jobs where request_id='old'")).rows[0].n,0);
 });
 await t.test('pausing stops claims and enqueue scans without changing source records',async()=>{
  await reset();await retry(employee);await db.exec('update public.ops_v2_legal_config set enabled=false');assert.equal(await claim(),null);assert.equal(await worker('ops_v2_legal_scan'),0);await assert.rejects(retry(employee),/متوقف/);
 });
 await t.test('scheduler posts only queued work, uses the Vault credential and is repeatable',async()=>{
  await reset();await db.exec(`create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);insert into vault.decrypted_secrets values('araf_ops_legal_worker_secret','test-only-secret-that-is-at-least-32-characters');
  create schema net;create table net.calls(url text,headers jsonb,body jsonb,timeout int);
  create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language plpgsql as $$begin insert into net.calls values(url,headers,body,timeout_milliseconds);return 1;end$$;
  create schema cron;create table cron.jobs(name text primary key,schedule text,command text);
  create function cron.schedule(n text,s text,c text) returns bigint language plpgsql as $$begin insert into cron.jobs values(n,s,c) on conflict(name) do update set schedule=s,command=c;return 1;end$$;`);
  const schedule=fs.readFileSync(path.join(__dirname,'../../supabase/ops-v2-legal-schedule.sql'),'utf8').replace(/^create extension.*;$/gm,'');
  await db.exec(schedule);await db.exec(schedule);assert.equal((await db.query('select count(*)::int as n from cron.jobs')).rows[0].n,1);
  await db.exec('select public.ops_v2_legal_tick()');const call=(await db.query('select * from net.calls')).rows[0];assert.equal(call.url,'https://araf-ops.vercel.app/api/legal-worker');assert.match(call.headers.Authorization,/^Bearer test-only/);assert.deepEqual(call.body,{});
  await claim();await db.exec('select public.ops_v2_legal_tick()');assert.equal((await db.query('select count(*)::int as n from net.calls')).rows[0].n,1);
  await assert.rejects(asRole('authenticated',admin,'select public.ops_v2_legal_tick()'),/permission denied/);
 });
});

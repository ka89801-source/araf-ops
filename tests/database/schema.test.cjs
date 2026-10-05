const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const A='00000000-0000-4000-8000-000000000001';
const B='00000000-0000-4000-8000-000000000002';
const C='00000000-0000-4000-8000-000000000003';
const E='10000000-0000-4000-8000-000000000001';
const F='10000000-0000-4000-8000-000000000002';
const R='20000000-0000-4000-8000-000000000001';
const AR='20000000-0000-4000-8000-000000000002';
const stamp='2026-10-01T00:00:00Z';
const repair=fs.readFileSync(path.join(__dirname,'../../supabase/ops-v2-fix-messages-20261005.sql'),'utf8');
const migration=fs.readFileSync(path.join(__dirname,'../../supabase/ops-v2-features.sql'),'utf8');
test('v2 SQL against local PostgreSQL only',async t=>{
  const db=new PGlite();
  t.after(()=>db.close());
  await db.exec(`
    create role anon;create role authenticated;create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.business_admins(auth_user_id uuid primary key,employee_external_id text,display_name text,admin_role text,active boolean);
    create table public.employees(id text primary key,full_name text,email text,status text);
    create table public.business_entities(id uuid primary key,code text unique,updated_at timestamptz,subscription_status text);
    create table public.business_requests(id uuid primary key,entity_id uuid references public.business_entities(id),archived_at timestamptz);
    create table public.business_usage(id uuid primary key,entity_id uuid references public.business_entities(id),request_id uuid references public.business_requests(id));
    create table public.business_request_history(id uuid primary key,request_id uuid references public.business_requests(id));
    create table public.business_activation_requests(id uuid primary key,entity_code text,metadata jsonb);
    create table public.business_email_notifications(id uuid primary key,event_type text,reference_id uuid);
    insert into public.business_admins values('${A}','e1','Admin','admin',true),('${B}','e2','Employee','employee',true),('${C}','e3','Manager','manager',true);
    insert into public.employees values('e1','Admin','a@example.test','active'),('e2','Employee','b@example.test','active'),('e3','Manager','c@example.test','active');
    insert into public.business_entities values('${E}','TEST-1','${stamp}','active'),('${F}','TEST-2','${stamp}','active');
    insert into public.business_requests values('${R}','${E}',null),('${AR}','${E}','${stamp}'),('20000000-0000-4000-8000-000000000003','${F}',null);
    insert into public.business_usage values(gen_random_uuid(),'${E}','${R}'),(gen_random_uuid(),'${E}','${AR}'),(gen_random_uuid(),'${F}','20000000-0000-4000-8000-000000000003');
    insert into public.business_request_history values(gen_random_uuid(),'${R}'),(gen_random_uuid(),'${AR}');
    insert into public.business_activation_requests values('30000000-0000-4000-8000-000000000001','TEST-1','{}'),('30000000-0000-4000-8000-000000000002','TEST-2','{}');
    insert into public.business_email_notifications values(gen_random_uuid(),'service_request','${R}'),(gen_random_uuid(),'activation','30000000-0000-4000-8000-000000000001'),(gen_random_uuid(),'activation','30000000-0000-4000-8000-000000000002');
  `);
  const originalCounts=async()=>{const out={};for(const table of ['business_entities','business_requests','business_usage','business_request_history','business_activation_requests','business_email_notifications'])out[table]=(await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n;return out;};
  const before=await originalCounts();
  const call=(uid,sql,params=[],role='authenticated')=>db.transaction(async tx=>{
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||'']);
    return (await tx.query(sql,params)).rows[0]?.result;
  });
  const send=(uid,nonce='40000000-0000-4000-8000-000000000001',body='Private message')=>call(uid,'select public.ops_v2_send_message($1,$2,$3,$4,$5) as result',['e2','Subject',body,true,nonce]);
  const remove=(uid,code='TEST-1',expected=stamp)=>call(uid,'select public.ops_v2_delete_entity($1,$2,$3) as result',[E,code,expected]);
  await t.test('installation is repeatable and does not modify original business records',async()=>{
    await db.exec(migration);await db.exec(migration);assert.deepEqual(await originalCounts(),before);
  });
  await t.test('anonymous/direct table/internal helper access is denied',async()=>{
    for(const sql of ['select public.ops_v2_list_messages() as result','select * from public.ops_v2_messages','select public.ops_v2_actor() as result'])await assert.rejects(call(null,sql,[],'anon'),/permission denied/);
    await assert.rejects(call(A,'select * from public.ops_v2_messages'),/permission denied/);
    await assert.rejects(call(A,'select public.ops_v2_actor() as result'),/permission denied/);
  });
  let message;
  await t.test('send is persistent, private and retry-safe; sender identity comes from auth',async()=>{
    message=await send(A);assert.equal(message.from_id,'e1');assert.equal(message.to_id,'e2');assert.equal(message.body,'Private message');assert.equal(message.sender_auth_id,undefined);assert.equal(typeof message.id,'string');
    assert.equal((await send(A)).id,message.id);
    await assert.rejects(send(A,undefined,'Changed body'),/تغيّر محتوى/);
    const list=uid=>call(uid,'select public.ops_v2_list_messages() as result');
    assert.equal((await list(A)).length,1);assert.equal((await list(B)).length,1);assert.equal((await list(C)).length,0);
  });
  await t.test('repair fixes the reported missing column on an installed database without losing messages',async()=>{
    const fn=migration.slice(migration.indexOf('create or replace function public.ops_v2_send_message('),migration.indexOf('create or replace function public.ops_v2_read_message'));
    await db.exec(fn.replace("coalesce(nullif(e.full_name,''),e.email)","coalesce(nullif(e.full_name,''),nullif(e.name,''),e.email)"));
    await assert.rejects(send(A),/column e.name does not exist/);
    await db.exec(repair);await db.exec(repair);
    assert.equal((await send(A)).id,message.id);
    assert.equal((await send(A)).to_name,'Employee');
    assert.equal((await call(B,'select public.ops_v2_list_messages() as result'))[0].body,'Private message');
    assert.deepEqual(await originalCounts(),before);
    await assert.rejects(call(null,'select public.ops_v2_send_message(null,null,null,false,null)',[],'anon'),/permission denied/);
  });
  await t.test('only the recipient can acknowledge a message',async()=>{
    await assert.rejects(call(C,'select public.ops_v2_read_message($1) as result',[message.id]),/غير متاحة/);
    await assert.rejects(call(A,'select public.ops_v2_read_message($1) as result',[message.id]),/غير متاحة/);
    const read=await call(B,'select public.ops_v2_read_message($1) as result',[message.id]);assert.ok(read.read_at);
    const again=await call(B,'select public.ops_v2_read_message($1) as result',[message.id]);assert.equal(again.read_at,read.read_at);
  });
  await t.test('revoked operations memberships cannot read or send',async()=>{
    await db.exec(`update public.business_admins set active=false where auth_user_id='${B}'`);
    await assert.rejects(call(B,'select public.ops_v2_list_messages() as result'),/غير مفعّل/);
    await assert.rejects(send(B),/غير مفعّل/);
    await db.exec(`update public.business_admins set active=true where auth_user_id='${B}'`);
  });
  await t.test('employee, incorrect confirmation and stale snapshot cannot delete',async()=>{
    await assert.rejects(remove(B),/للإدارة/);
    await assert.rejects(remove(A,'TEST-2'),/غير مطابق/);
    await assert.rejects(remove(A,'TEST-1','2026-09-01'),/تغيّرت/);
    assert.deepEqual(await originalCounts(),before);
  });
  await t.test('an unknown dependent FK rolls back every partial delete',async()=>{
    await db.exec(`create table public.unexpected_dependency(id int,entity_id uuid references public.business_entities(id));insert into public.unexpected_dependency values(1,'${E}')`);
    await assert.rejects(remove(A),/foreign key constraint/);
    assert.deepEqual(await originalCounts(),before);
    assert.equal((await db.query('select count(*)::int as n from public.ops_v2_entity_deletions')).rows[0].n,0);
    await db.exec('drop table public.unexpected_dependency');
  });
  await t.test('manager can atomically delete only the confirmed entity, including archived requests',async()=>{
    const result=await remove(C);assert.equal(result.ok,true);assert.equal(result.deleted_requests,2);
    assert.deepEqual(await originalCounts(),{business_entities:1,business_requests:1,business_usage:1,business_request_history:0,business_activation_requests:1,business_email_notifications:1});
    assert.equal((await db.query('select id from public.business_entities')).rows[0].id,F);
    assert.equal((await remove(C)).already_deleted,true);
    assert.equal((await db.query('select count(*)::int as n from public.ops_v2_entity_deletions')).rows[0].n,1);
  });
  await t.test('message pagination has no overlaps and excludes nonparticipants',async()=>{
    await db.exec(`insert into public.ops_v2_messages(sender_auth_id,from_id,to_id,from_name,to_name,subject,body,nonce) select '${A}','e1','e2','Admin','Employee','Bulk','Message',gen_random_uuid() from generate_series(1,205)`);
    const first=await call(B,'select public.ops_v2_list_messages() as result');assert.equal(first.length,200);
    const second=await call(B,'select public.ops_v2_list_messages($1) as result',[first.at(-1).id]);assert.equal(second.length,6);
    assert.equal(new Set([...first,...second].map(x=>x.id)).size,206);
    assert.deepEqual(await call(C,'select public.ops_v2_list_messages() as result'),[]);
  });
});

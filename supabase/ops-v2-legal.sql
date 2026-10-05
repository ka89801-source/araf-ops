-- الفاحص التلقائي: إضافات مستقلة داخل مشروع Supabase الحالي.
-- شغّل ops-v2-features.sql أولًا. لا تغيّر هذه الإضافة سجلات الطلبات أو سياساتها.
-- لا توجد triggers على الجداول الأصلية؛ الجدولة تُثبّت بملف منفصل بعد إعداد الخادم.
begin;
do $$ begin
  if to_regprocedure('public.ops_v2_actor()') is null then
    raise exception 'شغّل ops-v2-features.sql أولًا';
  end if;
end $$;

create table if not exists public.ops_v2_legal_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default true,
  starts_at timestamptz not null default now()
);
insert into public.ops_v2_legal_config(singleton) values(true) on conflict do nothing;
create table if not exists public.ops_v2_legal_jobs (
  id uuid primary key default gen_random_uuid(),
  request_kind text not null check(request_kind in ('req','biz')),
  request_id text not null,
  input jsonb not null,
  input_hash text not null,
  revision integer not null default 1,
  phase text not null default 'prepare' check(phase in ('prepare','research','fallback')),
  status text not null default 'queued' check(status in ('queued','processing','ready','failed')),
  prepared_query text,
  report jsonb,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(request_kind,request_id)
);
create index if not exists ops_v2_legal_queue on public.ops_v2_legal_jobs(status,available_at);
alter table public.ops_v2_legal_jobs enable row level security;
alter table public.ops_v2_legal_config enable row level security;
revoke all on public.ops_v2_legal_jobs,public.ops_v2_legal_config from public,anon,authenticated,service_role;

create or replace function public.ops_v2_legal_source(p_kind text,p_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_kind='req' then select to_jsonb(r) into result from public.service_requests r where r.id::text=p_id;
  elsif p_kind='biz' then select to_jsonb(r) into result from public.business_requests r where r.id::text=p_id;
  end if;
  return result;
end $$;

create or replace function public.ops_v2_legal_input(p_kind text,p_row jsonb)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('kind',p_kind,
    'service',coalesce(nullif(p_row->>'service_name',''),nullif(p_row->>'service_type',''),p_row->>'service_key','خدمة قانونية'),
    'subject',coalesce(p_row->>'subject',''),'details',coalesce(p_row->>'details',''),
    'stage',coalesce(p_row->>'case_current_stage',''),
    'attachments_count',case when jsonb_typeof(p_row->'attachments')='array' then jsonb_array_length(p_row->'attachments') else 0 end);
$$;

create or replace function public.ops_v2_legal_allowed(p_actor jsonb,p_kind text,p_row jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if p_row is null then return false; end if;
  if p_actor->>'role' in ('admin','manager') then return true; end if;
  -- Match current assignment, not the assignment at report creation time.
  return coalesce(p_row->>'assigned_to'=p_actor->>'id',false);
end $$;

create or replace function public.ops_v2_legal_enqueue(p_kind text,p_id text,p_force boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare source jsonb:=public.ops_v2_legal_source(p_kind,p_id); payload jsonb; result uuid;
begin
  if source is null then return null; end if;
  payload:=public.ops_v2_legal_input(p_kind,source);
  insert into public.ops_v2_legal_jobs as j(request_kind,request_id,input,input_hash)
  values(p_kind,p_id,payload,md5(payload::text))
  on conflict(request_kind,request_id) do update set input=excluded.input,input_hash=excluded.input_hash,
    revision=j.revision+1,phase='prepare',status='queued',prepared_query=null,report=null,
    attempts=0,available_at=now(),lease_token=null,lease_until=null,last_error=null,completed_at=null,updated_at=now()
  where j.input_hash is distinct from excluded.input_hash or p_force
  returning id into result;
  if result is null then select id into result from public.ops_v2_legal_jobs where request_kind=p_kind and request_id=p_id; end if;
  return result;
end $$;

create or replace function public.ops_v2_legal_scan()
returns integer language plpgsql security definer set search_path='' as $$
declare since timestamptz; source record; count_rows integer:=0;
begin
  select starts_at into since from public.ops_v2_legal_config where singleton and enabled;
  if since is null then return 0; end if;
  -- The original request path never waits for the assistant or this queue.
  for source in
    select 'req'::text as kind,r.id::text as id from public.service_requests r where r.created_at>=since
    union select 'biz',r.id::text from public.business_requests r where r.created_at>=since
    union select request_kind,request_id from public.ops_v2_legal_jobs
  loop
    if public.ops_v2_legal_source(source.kind,source.id) is null then
      delete from public.ops_v2_legal_jobs where request_kind=source.kind and request_id=source.id;
    else perform public.ops_v2_legal_enqueue(source.kind,source.id); count_rows:=count_rows+1;
    end if;
  end loop;
  return count_rows;
end $$;

create or replace function public.ops_v2_legal_claim()
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.ops_v2_legal_jobs%rowtype; source jsonb;
begin
  if not exists(select 1 from public.ops_v2_legal_config where enabled) then return null; end if;
  -- A single global lease limits load on the original assistant, even with overlapping ticks.
  if not pg_try_advisory_xact_lock(17431005) then return null; end if;
  if exists(select 1 from public.ops_v2_legal_jobs where status='processing' and lease_until>now()) then return null; end if;
  update public.ops_v2_legal_jobs set status='failed',last_error='انتهت مهلة الفحص بعد تكرار المحاولة',lease_token=null,lease_until=null,updated_at=now()
    where status='processing' and lease_until<=now() and attempts>=3;
  select * into job from public.ops_v2_legal_jobs
    where (status='queued' and available_at<=now()) or (status='processing' and lease_until<=now())
    order by case when phase in ('research','fallback') then 0 else 1 end,available_at,id for update skip locked limit 1;
  if not found then return null; end if;
  source:=public.ops_v2_legal_source(job.request_kind,job.request_id);
  if source is null then delete from public.ops_v2_legal_jobs where id=job.id; return null; end if;
  if md5(public.ops_v2_legal_input(job.request_kind,source)::text)<>job.input_hash then
    perform public.ops_v2_legal_enqueue(job.request_kind,job.request_id); return null;
  end if;
  update public.ops_v2_legal_jobs set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),
    lease_until=now()+interval '3 minutes',updated_at=now() where id=job.id returning * into job;
  return to_jsonb(job)-'report';
end $$;

create or replace function public.ops_v2_legal_finish(
  p_id uuid,p_token uuid,p_revision integer,p_query text default null,p_report jsonb default null,
  p_error text default null,p_permanent boolean default false,p_fallback boolean default false
) returns boolean language plpgsql security definer set search_path='' as $$
declare job public.ops_v2_legal_jobs%rowtype; source jsonb;
begin
  select * into job from public.ops_v2_legal_jobs where id=p_id and status='processing'
    and lease_token=p_token and revision=p_revision and lease_until>now() for update;
  if not found then return false; end if;
  source:=public.ops_v2_legal_source(job.request_kind,job.request_id);
  if source is null then delete from public.ops_v2_legal_jobs where id=p_id; return false; end if;
  if md5(public.ops_v2_legal_input(job.request_kind,source)::text)<>job.input_hash then
    perform public.ops_v2_legal_enqueue(job.request_kind,job.request_id); return false;
  end if;
  if p_fallback and job.phase='research' then
    update public.ops_v2_legal_jobs set phase='fallback',status='queued',attempts=0,available_at=now(),
      lease_token=null,lease_until=null,last_error=null,updated_at=now() where id=p_id;
  elsif p_error is not null then
    update public.ops_v2_legal_jobs set status=case when attempts>=3 or p_permanent then 'failed' else 'queued' end,
      available_at=now()+make_interval(secs=>attempts*60),last_error=left(p_error,200),lease_token=null,lease_until=null,updated_at=now() where id=p_id;
  elsif p_query is not null and job.phase='prepare' then
    if char_length(btrim(p_query)) not between 5 and 1000 then raise exception 'ملخص الفحص غير صالح'; end if;
    update public.ops_v2_legal_jobs set prepared_query=p_query,phase='research',status='queued',attempts=0,
      available_at=now(),lease_token=null,lease_until=null,last_error=null,updated_at=now() where id=p_id;
  elsif p_report is not null and job.phase in ('research','fallback') then
    if jsonb_typeof(p_report->'content') is distinct from 'string' or char_length(btrim(p_report->>'content')) not between 5 and 120000
      or jsonb_typeof(p_report->'sources') is distinct from 'array' then raise exception 'تقرير الفحص غير صالح'; end if;
    update public.ops_v2_legal_jobs set report=p_report,status='ready',completed_at=now(),updated_at=now(),
      lease_token=null,lease_until=null,last_error=null where id=p_id;
  else raise exception 'نتيجة غير صالحة لمرحلة الفحص';
  end if;
  return true;
end $$;

create or replace function public.ops_v2_legal_report(p_kind text,p_request_id text,p_full boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor jsonb:=public.ops_v2_actor(); source jsonb:=public.ops_v2_legal_source(p_kind,p_request_id);
  job public.ops_v2_legal_jobs%rowtype; state text; result jsonb;
begin
  if not public.ops_v2_legal_allowed(actor,p_kind,source) then raise exception 'التقرير غير متاح لهذا الحساب' using errcode='42501'; end if;
  select * into job from public.ops_v2_legal_jobs where request_kind=p_kind and request_id=p_request_id;
  if not found then return jsonb_build_object('key',p_kind||':'||p_request_id,'status','not_queued'); end if;
  state:=case when md5(public.ops_v2_legal_input(p_kind,source)::text)<>job.input_hash then 'outdated' else job.status end;
  result:=jsonb_build_object('key',p_kind||':'||p_request_id,'status',state,'phase',job.phase,'revision',job.revision,
    'updated_at',job.updated_at,'completed_at',job.completed_at,'error',job.last_error);
  if p_full and state='ready' then result:=result||jsonb_build_object('report',job.report,'query',job.prepared_query,
    'attachments_count',job.input->'attachments_count'); end if;
  return result;
end $$;

create or replace function public.ops_v2_legal_status(p_keys jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor jsonb:=public.ops_v2_actor(); item jsonb; source jsonb; result jsonb:='[]';
begin
  if jsonb_typeof(p_keys) is distinct from 'array' or jsonb_array_length(p_keys)>100 then raise exception 'دفعة غير صالحة'; end if;
  for item in select * from jsonb_array_elements(p_keys) loop
    source:=public.ops_v2_legal_source(item->>'kind',item->>'id');
    if public.ops_v2_legal_allowed(actor,item->>'kind',source) then
      result:=result||jsonb_build_array(public.ops_v2_legal_report(item->>'kind',item->>'id',false));
    end if;
  end loop;
  return result;
end $$;

create or replace function public.ops_v2_legal_retry(p_kind text,p_request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor jsonb:=public.ops_v2_actor(); source jsonb:=public.ops_v2_legal_source(p_kind,p_request_id);
  job public.ops_v2_legal_jobs%rowtype;
begin
  if not public.ops_v2_legal_allowed(actor,p_kind,source) then raise exception 'الطلب غير متاح لهذا الحساب' using errcode='42501'; end if;
  if not exists(select 1 from public.ops_v2_legal_config where enabled) then raise exception 'الفاحص متوقف مؤقتًا'; end if;
  perform pg_advisory_xact_lock(hashtext(p_kind||':'||p_request_id));
  select * into job from public.ops_v2_legal_jobs where request_kind=p_kind and request_id=p_request_id for update;
  if found then
    if job.status in ('queued','processing') then return public.ops_v2_legal_report(p_kind,p_request_id,false); end if;
    if job.updated_at>now()-interval '1 minute' then raise exception 'انتظر دقيقة قبل طلب فحص جديد'; end if;
  end if;
  perform public.ops_v2_legal_enqueue(p_kind,p_request_id,true);
  return public.ops_v2_legal_report(p_kind,p_request_id,false);
end $$;

-- All helpers stay private; only narrowly scoped RPCs are executable.
revoke all on function public.ops_v2_legal_source(text,text),public.ops_v2_legal_input(text,jsonb),public.ops_v2_legal_allowed(jsonb,text,jsonb),
  public.ops_v2_legal_enqueue(text,text,boolean),public.ops_v2_legal_scan(),public.ops_v2_legal_claim(),
  public.ops_v2_legal_finish(uuid,uuid,integer,text,jsonb,text,boolean,boolean),public.ops_v2_legal_report(text,text,boolean),
  public.ops_v2_legal_status(jsonb),public.ops_v2_legal_retry(text,text) from public,anon,authenticated,service_role;
grant execute on function public.ops_v2_legal_scan(),public.ops_v2_legal_claim(),public.ops_v2_legal_finish(uuid,uuid,integer,text,jsonb,text,boolean,boolean) to service_role;
grant execute on function public.ops_v2_legal_report(text,text,boolean),public.ops_v2_legal_status(jsonb),public.ops_v2_legal_retry(text,text) to authenticated;
notify pgrst,'reload schema';
commit;

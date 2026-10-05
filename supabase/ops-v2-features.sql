-- إضافات البرنش الجديد إلى نفس مشروع Supabase. لا ينشئ قاعدة بيانات أخرى.
-- لا يُشغّل من البناء أو النشر تلقائيًا. راجع README قبل التشغيل اليدوي.
-- التثبيت يضيف جداول/دوال جديدة فقط؛ لا يحدّث أو يحذف سجلات الأعمال الحالية.
begin;

-- Use the authoritative operations membership, never client-supplied identities
-- or writable user_metadata. No changes to the original membership policies.
create or replace function public.ops_v2_actor()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare a public.business_admins%rowtype;
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولًا' using errcode='42501'; end if;
  select * into a from public.business_admins
    where auth_user_id=auth.uid() and active=true;
  if not found or a.admin_role not in ('admin','manager','employee') then
    raise exception 'حساب العمليات غير مفعّل في سجل الصلاحيات' using errcode='42501';
  end if;
  return jsonb_build_object('id',coalesce(a.employee_external_id::text,a.auth_user_id::text),
    'auth_id',a.auth_user_id,'name',a.display_name,'role',a.admin_role);
end;
$$;
revoke all on function public.ops_v2_actor() from public, anon, authenticated, service_role;

create table if not exists public.ops_v2_messages (
  id bigint generated always as identity primary key,
  sender_auth_id uuid not null,
  from_id text not null,
  to_id text not null,
  from_name text not null,
  to_name text not null,
  subject text not null check(char_length(subject) between 1 and 120),
  body text not null check(char_length(body) between 1 and 4000),
  urgent boolean not null default false,
  nonce uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(sender_auth_id,nonce),
  check(from_id<>to_id)
);
create index if not exists ops_v2_messages_inbox on public.ops_v2_messages(to_id,id desc);
create index if not exists ops_v2_messages_outbox on public.ops_v2_messages(from_id,id desc);
alter table public.ops_v2_messages enable row level security;
-- Table access is RPC-only; each RPC verifies current membership + participants.
revoke all on table public.ops_v2_messages from public, anon, authenticated;
revoke all on sequence public.ops_v2_messages_id_seq from public, anon, authenticated;

create or replace function public.ops_v2_list_messages(p_before bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor jsonb:=public.ops_v2_actor(); result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(m)-'sender_auth_id'-'nonce'||jsonb_build_object('id',m.id::text) order by m.id desc),'[]'::jsonb)
  into result from (
    select * from public.ops_v2_messages
    where (from_id=actor->>'id' or to_id=actor->>'id') and (p_before is null or id<p_before)
    order by id desc limit 200
  ) m;
  return result;
end;
$$;

create or replace function public.ops_v2_send_message(
  p_recipient text, p_subject text, p_body text, p_urgent boolean, p_nonce uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor jsonb:=public.ops_v2_actor(); recipient_name text; m public.ops_v2_messages%rowtype;
begin
  if p_recipient is null or p_recipient=actor->>'id' or p_nonce is null
    or p_subject is null or char_length(btrim(p_subject)) not between 1 and 120
    or p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'بيانات الرسالة غير صالحة';
  end if;
  select coalesce(nullif(e.full_name,''),e.email)
  into recipient_name from public.employees e
  where e.id::text=p_recipient and e.status='active';
  if recipient_name is null then
    select a.display_name into recipient_name from public.business_admins a
    where coalesce(a.employee_external_id::text,a.auth_user_id::text)=p_recipient and a.active=true
      and a.admin_role in ('admin','manager','employee') limit 1;
  end if;
  if recipient_name is null then raise exception 'الموظف غير موجود أو غير نشط'; end if;
  insert into public.ops_v2_messages(sender_auth_id,from_id,to_id,from_name,to_name,subject,body,urgent,nonce)
  values(auth.uid(),actor->>'id',p_recipient,coalesce(actor->>'name','موظف'),recipient_name,
    btrim(p_subject),btrim(p_body),coalesce(p_urgent,false),p_nonce)
  on conflict(sender_auth_id,nonce) do nothing;
  select * into m from public.ops_v2_messages where sender_auth_id=auth.uid() and nonce=p_nonce;
  if m.to_id<>p_recipient or m.subject<>btrim(p_subject) or m.body<>btrim(p_body)
    or m.urgent<>coalesce(p_urgent,false) then raise exception 'تغيّر محتوى محاولة الإرسال؛ افتح رسالة جديدة'; end if;
  return to_jsonb(m)-'sender_auth_id'-'nonce'||jsonb_build_object('id',m.id::text);
end;
$$;

create or replace function public.ops_v2_read_message(p_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor jsonb:=public.ops_v2_actor(); m public.ops_v2_messages%rowtype;
begin
  update public.ops_v2_messages set read_at=coalesce(read_at,now())
    where id=p_id and to_id=actor->>'id' returning * into m;
  if not found then raise exception 'الرسالة غير متاحة لهذا الحساب' using errcode='42501'; end if;
  return to_jsonb(m)-'sender_auth_id'-'nonce'||jsonb_build_object('id',m.id::text);
end;
$$;

-- Minimal deletion receipt makes retries safe; no customer content is retained.
create table if not exists public.ops_v2_entity_deletions (
  entity_id uuid primary key,
  entity_code text not null,
  deleted_by uuid not null,
  deleted_at timestamptz not null default now(),
  deleted_requests integer not null
);
alter table public.ops_v2_entity_deletions enable row level security;
revoke all on table public.ops_v2_entity_deletions from public, anon, authenticated;

create or replace function public.ops_v2_delete_entity(
  p_entity_id uuid, p_confirm_code text, p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor jsonb:=public.ops_v2_actor(); entity public.business_entities%rowtype;
  receipt public.ops_v2_entity_deletions%rowtype; request_ids uuid[]; activation_ids uuid[]; request_count integer;
begin
  if actor->>'role' not in ('admin','manager') then
    raise exception 'حذف المنشآت متاح للإدارة فقط' using errcode='42501';
  end if;
  if p_entity_id is null or nullif(btrim(p_confirm_code),'') is null then raise exception 'أكد رمز المنشأة'; end if;
  -- Parent lock also serializes FK-backed child inserts and concurrent deletion.
  select * into entity from public.business_entities where id=p_entity_id for update;
  if not found then
    select * into receipt from public.ops_v2_entity_deletions
      where entity_id=p_entity_id and entity_code=btrim(p_confirm_code);
    if found then return jsonb_build_object('ok',true,'entity_id',p_entity_id,'already_deleted',true); end if;
    raise exception 'المنشأة غير موجودة؛ حدّث القائمة';
  end if;
  if entity.code<>btrim(p_confirm_code) then raise exception 'رمز تأكيد الحذف غير مطابق'; end if;
  if (to_jsonb(entity)->>'updated_at')::timestamptz is distinct from p_expected_updated_at then
    raise exception 'تغيّرت المنشأة؛ حدّث القائمة وراجعها قبل الحذف';
  end if;
  select coalesce(array_agg(id),'{}'::uuid[]) into request_ids
    from public.business_requests where entity_id=p_entity_id;
  request_count:=cardinality(request_ids);
  select coalesce(array_agg(id),'{}'::uuid[]) into activation_ids
    from public.business_activation_requests
    where entity_code=entity.code or metadata->>'activated_entity_id'=p_entity_id::text;

  -- Only confirmed business tables/relationships are touched. Unknown FK
  -- dependencies fail the whole transaction rather than broad cascading deletes.
  delete from public.business_email_notifications
    where (event_type='service_request' and reference_id=any(request_ids))
      or (event_type in ('activation','upgrade') and reference_id=any(activation_ids));
  delete from public.business_request_history h
    where to_jsonb(h)->>'entity_id'=p_entity_id::text
      or to_jsonb(h)->>'request_id'=any(request_ids::text[]);
  delete from public.business_usage where entity_id=p_entity_id;
  delete from public.business_requests where id=any(request_ids);
  delete from public.business_activation_requests where id=any(activation_ids);
  delete from public.business_entities where id=p_entity_id;
  insert into public.ops_v2_entity_deletions(entity_id,entity_code,deleted_by,deleted_requests)
    values(p_entity_id,entity.code,auth.uid(),request_count);
  -- Auth identity is intentionally retained. Existing business API denies access
  -- without an active entity. Account deletion requires the Auth Admin API.
  return jsonb_build_object('ok',true,'entity_id',p_entity_id,'deleted_requests',request_count);
end;
$$;

revoke all on function public.ops_v2_list_messages(bigint) from public,anon,authenticated,service_role;
revoke all on function public.ops_v2_send_message(text,text,text,boolean,uuid) from public,anon,authenticated,service_role;
revoke all on function public.ops_v2_read_message(bigint) from public,anon,authenticated,service_role;
revoke all on function public.ops_v2_delete_entity(uuid,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.ops_v2_list_messages(bigint) to authenticated;
grant execute on function public.ops_v2_send_message(text,text,text,boolean,uuid) to authenticated;
grant execute on function public.ops_v2_read_message(bigint) to authenticated;
grant execute on function public.ops_v2_delete_entity(uuid,text,timestamptz) to authenticated;
notify pgrst, 'reload schema';
commit;

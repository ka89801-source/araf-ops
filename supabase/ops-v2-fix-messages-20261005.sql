-- إصلاح خطأ column e.name does not exist بعد تثبيت ops-v2-features.sql.
-- شغّله في SQL Editor بمشروع Supabase الحالي. يحدّث دالة إرسال الرسالة فقط.
-- لا يضيف عمودًا ولا يعدّل أو يحذف أي رسائل أو سجلات أعمال موجودة.
begin;

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

revoke all on function public.ops_v2_send_message(text,text,text,boolean,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ops_v2_send_message(text,text,text,boolean,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

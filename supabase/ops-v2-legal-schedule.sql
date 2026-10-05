-- شغّل بعد إعداد متغيرات Vercel وإضافة سر Vault الموضح في AUTO-LEGAL-SETUP.md.
-- يبدأ الفحص الآلي للطلبات الجديدة في قاعدة البيانات نفسها كل دقيقة.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='araf_ops_legal_worker_secret' and length(decrypted_secret)>=32) then
    raise exception 'أضف سر Vault باسم araf_ops_legal_worker_secret أولًا (32 حرفًا على الأقل)';
  end if;
end $$;

create or replace function public.ops_v2_legal_tick()
returns void language plpgsql security definer set search_path='' as $$
declare worker_secret text;
begin
  if not exists(select 1 from public.ops_v2_legal_config where enabled) then return; end if;
  perform public.ops_v2_legal_scan();
  if not exists(select 1 from public.ops_v2_legal_jobs where (status='queued' and available_at<=now()) or (status='processing' and lease_until<=now())) then return; end if;
  if exists(select 1 from public.ops_v2_legal_jobs where status='processing' and lease_until>now()) then return; end if;
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='araf_ops_legal_worker_secret';
  if worker_secret is null then raise exception 'لم يُضبط سر تشغيل الفاحص'; end if;
  perform net.http_post(url:='https://araf-ops.vercel.app/api/legal-worker',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret),
    body:='{}'::jsonb,timeout_milliseconds:=125000);
end $$;
revoke all on function public.ops_v2_legal_tick() from public,anon,authenticated,service_role;
select cron.schedule('araf-ops-legal-v2','* * * * *','select public.ops_v2_legal_tick();');
commit;

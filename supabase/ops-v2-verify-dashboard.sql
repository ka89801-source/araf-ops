-- قراءة فقط: مطابقة أرقام لوحة العمليات مع جميع سجلات قاعدة البيانات.
-- لا يعرض أسماء العملاء أو الجوالات، ولا يغيّر أي جدول أو سجل.
with bounds as (
  select date_trunc('month', now() at time zone 'Asia/Riyadh')
    at time zone 'Asia/Riyadh' as month_start
), totals as (
  select count(*) as requests_total,
    count(*) filter (where status = 'done') as completed_requests,
    coalesce(sum(price) filter (where status = 'done'), 0) as completed_value_total,
    coalesce(sum(price) filter (where status = 'done'
      and closed_at >= bounds.month_start and closed_at <= now()), 0) as completed_value_this_month,
    count(*) filter (where status = 'done' and closed_at is null) as completed_without_closure_date
  from public.service_requests cross join bounds
), services as (
  select service_type, service_name, source, count(*) as request_count,
    coalesce(sum(price) filter (where status = 'done'), 0) as completed_value
  from public.service_requests
  group by service_type, service_name, source
)
select jsonb_build_object(
  'totals', (select to_jsonb(totals) from totals),
  'services', (select coalesce(jsonb_agg(to_jsonb(services)
    order by request_count desc, service_type, service_name, source), '[]'::jsonb) from services)
) as dashboard_verification;

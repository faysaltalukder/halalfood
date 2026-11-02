alter function public.get_business_health_cost_snapshots(date,date) security invoker;

grant usage on schema private to authenticated;
grant select on table private.business_health_order_cost_snapshots to authenticated;
revoke all on schema private from public,anon;
revoke all on table private.business_health_order_cost_snapshots from public,anon;

drop policy if exists "Admin can read business health cost snapshots with MFA"
  on private.business_health_order_cost_snapshots;
create policy "Admin can read business health cost snapshots with MFA"
  on private.business_health_order_cost_snapshots
  for select
  to authenticated
  using (
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  );

comment on function public.get_business_health_cost_snapshots(date,date) is
  'MFA-gated SECURITY INVOKER read path for private order-item cost snapshots, bounded to a date range of at most 367 days.';

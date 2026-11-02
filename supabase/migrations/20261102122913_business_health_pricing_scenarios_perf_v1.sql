create index if not exists admin_bh_pricing_scenarios_product_idx
  on public.admin_business_health_pricing_scenarios (product_id);

drop policy if exists "Business Health pricing scenarios admin select with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin select with MFA"
  on public.admin_business_health_pricing_scenarios for select to authenticated
  using (
    lower(coalesce(((select auth.jwt()) ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(((select auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
  );

drop policy if exists "Business Health pricing scenarios admin insert with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin insert with MFA"
  on public.admin_business_health_pricing_scenarios for insert to authenticated
  with check (
    lower(coalesce(((select auth.jwt()) ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(((select auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    and lower(coalesce(updated_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
  );

drop policy if exists "Business Health pricing scenarios admin update with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin update with MFA"
  on public.admin_business_health_pricing_scenarios for update to authenticated
  using (
    lower(coalesce(((select auth.jwt()) ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(((select auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), '')))
  with check (
    lower(coalesce(((select auth.jwt()) ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(((select auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    and lower(coalesce(updated_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
  );

drop policy if exists "Business Health pricing scenarios admin delete with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin delete with MFA"
  on public.admin_business_health_pricing_scenarios for delete to authenticated
  using (
    lower(coalesce(((select auth.jwt()) ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce(((select auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
  );
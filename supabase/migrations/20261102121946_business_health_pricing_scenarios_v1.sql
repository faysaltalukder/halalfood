create table if not exists public.admin_business_health_pricing_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  inputs jsonb not null default '{}'::jsonb check (jsonb_typeof(inputs) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  created_by text not null default lower(coalesce(auth.jwt() ->> 'email','')),
  updated_by text not null default lower(coalesce(auth.jwt() ->> 'email','')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_bh_pricing_scenario_title_nonblank check (btrim(title) <> ''),
  constraint admin_bh_pricing_scenario_product_name_length check (product_name is null or char_length(product_name) <= 200)
);

create index if not exists admin_bh_pricing_scenarios_updated_idx
  on public.admin_business_health_pricing_scenarios (updated_at desc, id);

alter table public.admin_business_health_pricing_scenarios enable row level security;
revoke all on table public.admin_business_health_pricing_scenarios from public, anon;
grant select, insert, update, delete on table public.admin_business_health_pricing_scenarios to authenticated;

drop policy if exists "Business Health pricing scenarios admin select with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin select with MFA"
  on public.admin_business_health_pricing_scenarios for select to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');

drop policy if exists "Business Health pricing scenarios admin insert with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin insert with MFA"
  on public.admin_business_health_pricing_scenarios for insert to authenticated
  with check (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and lower(coalesce(updated_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "Business Health pricing scenarios admin update with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin update with MFA"
  on public.admin_business_health_pricing_scenarios for update to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  with check (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and lower(coalesce(updated_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "Business Health pricing scenarios admin delete with MFA" on public.admin_business_health_pricing_scenarios;
create policy "Business Health pricing scenarios admin delete with MFA"
  on public.admin_business_health_pricing_scenarios for delete to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and lower(coalesce(created_by, '')) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

comment on table public.admin_business_health_pricing_scenarios is
  'Saved pricing calculator inputs and result snapshots; admin-only with AAL2 MFA. These are planning scenarios, not posted finance or sales transactions.';
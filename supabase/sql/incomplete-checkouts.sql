-- Reference schema for the consent-based incomplete checkout feature.
-- The live migration create_incomplete_checkouts was applied on 2026-10-31.
create table public.incomplete_checkouts (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null unique,
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_address text,
  order_notes text,
  order_context text not null default 'single' check (order_context in ('single','cart')),
  delivery_zone text check (delivery_zone is null or delivery_zone in ('inside_dhaka','outside_dhaka')),
  item_summary jsonb not null default '[]'::jsonb check (jsonb_typeof(item_summary) = 'array'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  delivery_charge numeric(12,2) not null default 0 check (delivery_charge >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  last_step text,
  last_field text,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  recovery_consent boolean not null default true check (recovery_consent = true),
  recovery_consent_at timestamptz not null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  consent_version text not null default '2026-10-31-v1',
  status text not null default 'incomplete' check (status in ('incomplete','converted')),
  converted_order_id uuid references public.orders(id) on delete set null,
  converted_order_number text,
  converted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incomplete_checkouts_marketing_consent_consistent
    check ((marketing_consent and marketing_consent_at is not null) or (not marketing_consent and marketing_consent_at is null))
);
create index incomplete_checkouts_status_last_seen_idx on public.incomplete_checkouts (status, last_seen_at desc);
create index incomplete_checkouts_phone_idx on public.incomplete_checkouts (customer_phone) where customer_phone is not null;
create index incomplete_checkouts_expires_at_idx on public.incomplete_checkouts (expires_at);
alter table public.incomplete_checkouts enable row level security;
revoke all on table public.incomplete_checkouts from anon, authenticated;
grant select, update, delete on public.incomplete_checkouts to authenticated;
grant all on public.incomplete_checkouts to service_role;

create policy "Incomplete checkout admin MFA read"
  on public.incomplete_checkouts for select to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
create policy "Incomplete checkout admin MFA update"
  on public.incomplete_checkouts for update to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2')
  with check (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');
create policy "Incomplete checkout admin MFA delete"
  on public.incomplete_checkouts for delete to authenticated
  using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2');

-- The matching scheduled pg_cron job is also configured on the live database.

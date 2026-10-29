
create table if not exists public.tracking_runtime_settings (
  id integer primary key default 1 check (id = 1),
  meta_capi_mode text not null default 'test'
    check (meta_capi_mode in ('disabled','test','production')),
  live_purchase_tracking boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.tracking_runtime_settings enable row level security;
revoke all on public.tracking_runtime_settings from anon, authenticated;
grant select, insert, update, delete on public.tracking_runtime_settings to authenticated;
grant all on public.tracking_runtime_settings to service_role;

drop policy if exists "Only admin MFA can manage tracking runtime settings" on public.tracking_runtime_settings;
create policy "Only admin MFA can manage tracking runtime settings"
on public.tracking_runtime_settings
for all
to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
)
with check (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  and (updated_by is null or lower(updated_by) = 'halalfoodbd.official@gmail.com')
);

insert into public.tracking_runtime_settings (id, meta_capi_mode, live_purchase_tracking, updated_by)
values (1, 'test', false, 'halalfoodbd.official@gmail.com')
on conflict (id) do nothing;

comment on table public.tracking_runtime_settings is
  'Admin MFA-only runtime controls for Meta CAPI mode and live Purchase tracking. Read by server-side Edge Functions using service_role; never expose secrets here.';

create table if not exists public.admin_team_members (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (length(trim(full_name)) between 2 and 180),
 role_title text not null default '',
 department text not null default 'Operations' check (department in ('Operations','Packing','Customer service','Inventory','Finance','Marketing','Management')),
 email text not null default '',
 phone text not null default '',
 is_active boolean not null default true,
 notes text not null default '',
 created_by text not null default lower(coalesce(auth.jwt()->>'email','')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_team_members_active_name_idx on public.admin_team_members(is_active, full_name);
alter table public.admin_team_members enable row level security;
drop policy if exists "Admin operations access with MFA" on public.admin_team_members;
create policy "Admin operations access with MFA" on public.admin_team_members for all to authenticated
using (lower(coalesce(auth.jwt()->>'email',''))='halalfoodbd.official@gmail.com' and coalesce(auth.jwt()->>'aal','aal1')='aal2')
with check (lower(coalesce(auth.jwt()->>'email',''))='halalfoodbd.official@gmail.com' and coalesce(auth.jwt()->>'aal','aal1')='aal2');
comment on table public.admin_team_members is 'Admin-managed team directory. This is an internal contact directory, not an authentication or payroll system.';
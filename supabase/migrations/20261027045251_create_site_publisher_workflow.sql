create table if not exists public.site_change_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'draft'
    check (status in ('draft','validated','approved','publishing','published','failed','conflict','rolled_back')),
  base_commit_sha text,
  manifest_sha256 text,
  approval_signature text,
  approved_manifest_sha256 text,
  release_id uuid,
  created_by text not null default 'ai-agent',
  approved_by text,
  approved_at timestamptz,
  published_commit_sha text,
  deployment_status text not null default 'not_started'
    check (deployment_status in ('not_started','pending','deployed','failed','unknown')),
  deployment_url text,
  last_error text,
  rollback_of_change_set_id uuid references public.site_change_sets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_change_files (
  id uuid primary key default gen_random_uuid(),
  change_set_id uuid not null references public.site_change_sets(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 400),
  action text not null check (action in ('add','modify','delete')),
  content text,
  sha256 text,
  created_at timestamptz not null default now(),
  unique (change_set_id, path),
  check (
    (action = 'delete' and content is null)
    or (action in ('add','modify') and content is not null and octet_length(content) <= 204800)
  )
);

create table if not exists public.site_publish_log (
  id bigint generated always as identity primary key,
  change_set_id uuid references public.site_change_sets(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  actor_email text,
  commit_sha text,
  status text not null default 'info' check (status in ('info','success','warning','error')),
  message text not null default '' check (char_length(message) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_change_sets_status_created_idx on public.site_change_sets(status, created_at desc);
create index if not exists site_change_files_change_set_idx on public.site_change_files(change_set_id, path);
create index if not exists site_publish_log_created_idx on public.site_publish_log(created_at desc);
create index if not exists site_publish_log_change_set_idx on public.site_publish_log(change_set_id, created_at desc);

create or replace function public.set_site_publisher_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_change_sets_updated_at on public.site_change_sets;
create trigger set_site_change_sets_updated_at
before update on public.site_change_sets
for each row execute function public.set_site_publisher_updated_at();

alter table public.site_change_sets enable row level security;
alter table public.site_change_files enable row level security;
alter table public.site_publish_log enable row level security;

revoke all on table public.site_change_sets from anon;
revoke all on table public.site_change_files from anon;
revoke all on table public.site_publish_log from anon;
revoke insert, update, delete on table public.site_change_sets from authenticated;
revoke insert, update, delete on table public.site_change_files from authenticated;
revoke insert, update, delete on table public.site_publish_log from authenticated;
grant select on table public.site_change_sets to authenticated;
grant select on table public.site_change_files to authenticated;
grant select on table public.site_publish_log to authenticated;
grant all on table public.site_change_sets to service_role;
grant all on table public.site_change_files to service_role;
grant all on table public.site_publish_log to service_role;
grant usage, select on sequence public.site_publish_log_id_seq to service_role;

drop policy if exists site_change_sets_admin_select on public.site_change_sets;
create policy site_change_sets_admin_select
on public.site_change_sets for select to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);

drop policy if exists site_change_files_admin_select on public.site_change_files;
create policy site_change_files_admin_select
on public.site_change_files for select to authenticated
using (
  exists (
    select 1 from public.site_change_sets s
    where s.id = site_change_files.change_set_id
      and lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
      and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  )
);

drop policy if exists site_publish_log_admin_select on public.site_publish_log;
create policy site_publish_log_admin_select
on public.site_publish_log for select to authenticated
using (
  lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'halalfoodbd.official@gmail.com'
  and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
);
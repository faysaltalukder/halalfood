create table if not exists public.hf_permission_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text unique,
  source text not null default 'dashboard' check (source in ('dashboard','bridge','github')),
  requester text not null default 'ChatGPT Bridge',
  permission_key text not null,
  resource jsonb not null default '{}'::jsonb,
  reason text not null,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  requested_duration_seconds integer not null default 900 check (requested_duration_seconds between 60 and 2592000),
  status text not null default 'pending' check (status in ('pending','approved','denied','revoked','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_notes text,
  grant_id uuid
);

create table if not exists public.hf_permission_grants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.hf_permission_requests(id) on delete restrict,
  permission_key text not null,
  resource jsonb not null default '{}'::jsonb,
  grant_mode text not null check (grant_mode in ('once','temporary')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  max_uses integer not null default 1 check (max_uses between 1 and 100000),
  uses_count integer not null default 0 check (uses_count >= 0),
  last_used_at timestamptz
);

alter table public.hf_permission_requests
  drop constraint if exists hf_permission_requests_grant_id_fkey;
alter table public.hf_permission_requests
  add constraint hf_permission_requests_grant_id_fkey
  foreign key (grant_id) references public.hf_permission_grants(id) on delete set null;

create table if not exists public.hf_permission_audit (
  id bigint generated always as identity primary key,
  request_id uuid references public.hf_permission_requests(id) on delete set null,
  grant_id uuid references public.hf_permission_grants(id) on delete set null,
  actor_type text not null check (actor_type in ('admin','bridge','system')),
  actor_id uuid references auth.users(id) on delete set null,
  event text not null,
  permission_key text,
  resource jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hf_permission_requests_status_created_idx
  on public.hf_permission_requests(status, created_at desc);
create index if not exists hf_permission_grants_active_idx
  on public.hf_permission_grants(permission_key, expires_at)
  where revoked_at is null;
create index if not exists hf_permission_audit_created_idx
  on public.hf_permission_audit(created_at desc);

alter table public.hf_permission_requests enable row level security;
alter table public.hf_permission_grants enable row level security;
alter table public.hf_permission_audit enable row level security;

revoke all on public.hf_permission_requests from anon, authenticated;
revoke all on public.hf_permission_grants from anon, authenticated;
revoke all on public.hf_permission_audit from anon, authenticated;
grant all on public.hf_permission_requests to service_role;
grant all on public.hf_permission_grants to service_role;
grant all on public.hf_permission_audit to service_role;
grant usage, select on sequence public.hf_permission_audit_id_seq to service_role;

comment on table public.hf_permission_requests is 'Private approval queue for scoped AI/bridge permissions. Access only through the MFA-verified permission Edge Function.';
comment on table public.hf_permission_grants is 'Server-enforced permission grants. Direct Data API access is revoked; bridge checks grants before each action.';
comment on table public.hf_permission_audit is 'Append-only audit history for permission requests, approvals, revocations and bridge checks.';

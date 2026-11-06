create index if not exists hf_permission_requests_decided_by_idx on public.hf_permission_requests(decided_by) where decided_by is not null;
create index if not exists hf_permission_requests_grant_id_idx on public.hf_permission_requests(grant_id) where grant_id is not null;
create index if not exists hf_permission_grants_request_id_idx on public.hf_permission_grants(request_id);
create index if not exists hf_permission_grants_revoked_by_idx on public.hf_permission_grants(revoked_by) where revoked_by is not null;
create index if not exists hf_permission_audit_request_id_idx on public.hf_permission_audit(request_id) where request_id is not null;
create index if not exists hf_permission_audit_grant_id_idx on public.hf_permission_audit(grant_id) where grant_id is not null;
create index if not exists hf_permission_audit_actor_id_idx on public.hf_permission_audit(actor_id) where actor_id is not null;
-- Remove all inherited/direct table permissions from public and signed-in users.
revoke all privileges on table public.site_change_sets from anon, authenticated;
revoke all privileges on table public.site_change_files from anon, authenticated;
revoke all privileges on table public.site_publish_log from anon, authenticated;

grant select (
  id, title, description, status, base_commit_sha, manifest_sha256,
  approved_manifest_sha256, release_id, created_by, approved_by, approved_at,
  published_commit_sha, deployment_status, deployment_url, last_error,
  rollback_of_change_set_id, created_at, updated_at
) on public.site_change_sets to authenticated;

grant select (
  id, change_set_id, path, action, content, sha256, created_at
) on public.site_change_files to authenticated;

grant select (
  id, change_set_id, action, actor_email, commit_sha, status, message, metadata, created_at
) on public.site_publish_log to authenticated;

-- The server runtime needs these limited operations; it does not need TRUNCATE,
-- REFERENCES or TRIGGER rights on Publisher tables.
revoke truncate, references, trigger on table public.site_change_sets from service_role;
revoke truncate, references, trigger on table public.site_change_files from service_role;
revoke truncate, references, trigger, update, delete on table public.site_publish_log from service_role;

grant select, insert, update on public.site_change_sets to service_role;
grant select, insert, update, delete on public.site_change_files to service_role;
grant select, insert on public.site_publish_log to service_role;
grant usage, select on sequence public.site_publish_log_id_seq to service_role;

revoke all on sequence public.site_publish_log_id_seq from anon, authenticated;

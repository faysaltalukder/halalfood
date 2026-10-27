revoke select on table public.site_change_sets from authenticated;
grant select (
  id, title, description, status, base_commit_sha, manifest_sha256, approved_manifest_sha256,
  release_id, created_by, approved_by, approved_at, published_commit_sha, deployment_status,
  deployment_url, last_error, rollback_of_change_set_id, created_at, updated_at
) on public.site_change_sets to authenticated;

revoke select on table public.site_change_files from authenticated;
grant select (id, change_set_id, path, action, content, sha256, created_at)
  on public.site_change_files to authenticated;

revoke select on table public.site_publish_log from authenticated;
grant select (id, change_set_id, action, actor_email, commit_sha, status, message, metadata, created_at)
  on public.site_publish_log to authenticated;
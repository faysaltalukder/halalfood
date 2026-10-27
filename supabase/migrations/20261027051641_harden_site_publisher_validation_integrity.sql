alter table public.site_change_sets
  add column if not exists validation_signature text,
  add column if not exists validated_at timestamptz;

-- The publisher only appends audit events; the server never edits or deletes log rows.
revoke update, delete, truncate on table public.site_publish_log from service_role;
grant select, insert on table public.site_publish_log to service_role;
revoke update, delete, truncate on table public.site_publish_log from anon, authenticated;

-- Change sets are retained so they cannot be silently erased by the normal service role.
revoke delete on table public.site_change_sets from service_role;

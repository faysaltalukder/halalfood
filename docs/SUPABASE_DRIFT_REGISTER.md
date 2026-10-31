# Supabase / GitHub Drift Register

Snapshot date: 2026-10-31  
Project ref: `qfwvrcfkrsydycbfjsxf`

## Observed state

- Supabase project status reported as `ACTIVE_HEALTHY`.
- PostgreSQL 17.
- Public schema contains 48 tables (inspection snapshot).
- Production reports 77 applied migration records.
- Repository contains 34 SQL migration files.
- Comparing migration filename version + name found 57 remote entries without an exact matching repository filename and 14 repository filenames not represented in remote history.

These counts are a reconciliation signal, not proof that 71 unique schema changes are missing. Some migrations may have been renamed, squashed, applied manually or represented by equivalent later migrations. Do not blindly replay, delete or repair migration history.

## Required reconciliation

1. Export a complete schema-only snapshot from Production and securely retain a database backup.
2. Export the full remote migration history and repository migration filenames.
3. Compare migration versions, names, checksums, SQL content and resulting schema objects.
4. Identify renames, equivalent migrations, manual changes and truly missing source.
5. Produce a reviewed baseline/reconciliation map; do not rewrite history in place.
6. Validate the resulting migration chain against a disposable database before changing Production.
7. Record the exact production schema fingerprint and backup/restore procedure.

## Security advisor findings to review

- 9 RLS-enabled tables have no policies. This may be intentional for service-role-only/server-only tables. Confirm grants, exposed API behavior and service access before changing.
- 2 SECURITY DEFINER functions are executable by the authenticated role:
  - `public.admin_update_order_delivery_address(uuid,text)`
  - `public.sync_my_customer_identity()`
  Review function bodies, search_path, grants and intended callers before modifying.
- `pg_net` is installed in the public schema. Check extension dependencies and Supabase guidance before moving it.
- Leaked-password protection is disabled. Review Auth settings and enable only after considering existing login UX and supported project configuration.

## Performance advisor findings to review

- 2 RLS policies have per-row auth initialization warnings. Candidate optimization: wrap stable auth calls in scalar subqueries, but first inspect the exact policy definitions and verify semantics.
- 6 tables have multiple permissive SELECT policies. Combine only if the combined boolean expression preserves access for public users, admins and customers.
- 32 unused-index findings. Do not drop indexes based on this snapshot alone; statistics may be reset and low-traffic features may not have been exercised. Check constraints, query plans and workload first.


## Follow-up verification (2026-10-31)

### Server-only tables with RLS enabled and no policies

A direct privilege check was run for all nine tables listed by the Security Advisor. For every table:
- `anon`: no SELECT/INSERT/UPDATE/DELETE table privileges
- `authenticated`: no SELECT/INSERT/UPDATE/DELETE table privileges
- `service_role`: privileges present
- RLS: enabled

This confirms the no-policy state is currently a deliberate server-only access boundary for these tables, not an accidental public API exposure. Keep the policies absent unless a supported client access path is deliberately introduced.

### SECURITY DEFINER function call paths

The two Advisor findings were inspected:
- `admin_update_order_delivery_address(uuid,text)` checks the exact admin email and `aal2` MFA claim, locks the target order, restricts edits to pending/processing orders, and blocks edits when courier booking is successful or uncertain. Its `search_path` is empty and its ACL grants EXECUTE to authenticated and service_role, not PUBLIC.
- `sync_my_customer_identity()` requires a non-null authenticated user and a confirmed email, preserves an existing mapping, links only one unambiguous matching customer, and handles concurrent unique conflicts. It is intended to run for signed-in users. It remains SECURITY DEFINER and its search_path should be tightened to empty in a separately tested migration if all references are schema-qualified.

These are not generic unauthenticated execution paths. Keep their internal authorization checks even though the role has EXECUTE permission.

### Remaining configuration / performance warnings

- Leaked-password protection is still disabled in Supabase Auth. It needs to be enabled through the project's Auth security settings; no Auth configuration mutation was performed during this source-only refactor.
- `pg_net` remains installed in `public`. Moving an extension can invalidate dependent functions or jobs; inspect dependencies and schedule a controlled migration first.
- The two tracking RLS initplan warnings and six multiple-permissive-policy warnings remain. The latter overlap public/customer/admin access paths; policy consolidation must preserve exact OR semantics and should be done only with a test matrix for anon, ordinary authenticated customers and admin MFA.
- Unused-index warnings remain informational. Do not drop indexes based solely on current low-volume statistics.

## Deployment rule

No Production DDL, policy rewrite, function replacement, secret rotation or Auth setting change is authorized by this register alone. Each requires source review, a tested migration, backup evidence, a rollback plan and post-change verification.

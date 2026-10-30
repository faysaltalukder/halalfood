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

## Deployment rule

No Production DDL, policy rewrite, function replacement, secret rotation or Auth setting change is authorized by this register alone. Each requires source review, a tested migration, backup evidence, a rollback plan and post-change verification.


## Remediation completed in the 2026-10-31 engineering pass

- `public.admin_update_order_delivery_address(uuid,text)` was reviewed: it is intended for the authenticated admin flow and validates the admin identity/MFA in its function body. It was not revoked because the application calls it as part of the protected admin workflow.
- `public.sync_my_customer_identity()` was reviewed: it is a self-service identity synchronization function tied to the caller's authenticated identity. It was not revoked because it is required by the customer account flow.
- `order-security-admin` Production v2 had a runtime initialization bug: the `list_signals` action referenced the service-role client before its declaration. The client is now initialized after JWT/email/AAL2 validation and before action dispatch. Production v3 is active; JWT verification remains enabled.
- All 16 Edge Function entrypoints pass the repository-wide Deno type-check after the source/type corrections in the engineering pass.
- Leaked-password protection remains disabled because the available project connector does not expose the Auth security-setting mutation. This remains an explicit manual security-setting item, not silently ignored.
- The `pg_net` extension and the 9 server-only RLS/no-policy tables were not changed. Moving an extension or adding policies without validating every dependency/access path would risk breaking scheduled jobs and private integrations.

# Security Review — 2026-10-31

## Scope and method

Read-only review of the production Supabase project, public-schema metadata, RLS policies, function grants/definitions, active Edge Function inventory, repository public code, and Supabase Security/Performance Advisor findings.

No production schema, records, policies, keys, Auth settings, or Edge Functions were changed during this review. The repository branch contains source/tooling updates only.

## Positive controls observed

- Supabase project state: `ACTIVE_HEALTHY`, PostgreSQL 17.
- Row Level Security is enabled on all 48 public tables observed.
- A public-surface source scan found no recognised Supabase service-role JWT, provider token literal, GitHub token, or Supabase secret key pattern.
- Provider tokens and service-role keys are read from server-side environment variables in the inspected Edge Functions.
- Nine RLS-enabled tables without client policies were checked: table-level SELECT is denied to both `anon` and `authenticated`, while the server role has SELECT. These appear to be private server-only tables; do not add public policies to silence the advisor.
- Two SECURITY DEFINER functions flagged by the advisor are executable by `authenticated` but not by `anon`. Both contain explicit authorization/identity checks in their function bodies.

## Findings and disposition

| Finding | Evidence | Disposition |
|---|---|---|
| Leaked password protection disabled | Supabase Auth Security Advisor | Recommended Auth configuration change. Not changed because the available connected Supabase actions do not expose Auth password-policy mutation. Review in Supabase Dashboard and enable after checking current password reset UX. |
| Two SECURITY DEFINER RPCs executable by authenticated | `admin_update_order_delivery_address`, `sync_my_customer_identity` | Reviewed function bodies. Both perform explicit checks. Keep the current workflows; add focused allowed/denied tests and periodically review grants. Do not revoke blindly. |
| Nine RLS tables have no policy | Server-only tables confirmed with no anon/authenticated SELECT grant | Appears intentional and safely private at table grant level. Preserve unless a documented client use case is added. |
| `pg_net` extension in public schema | Security Advisor warning | Requires dependency review before moving. Do not relocate blindly; inspect jobs/functions that reference it first. |
| Two RLS function evaluation notices | `tracking_event_settings`, `tracking_runtime_settings` | Performance-only notice. Current policies already use scalar subqueries around JWT expressions. Review expression plan/shape before changing production policy. |
| Multiple permissive policies | Six public tables | Do not consolidate until the OR-combined allow semantics are mapped and tested for each role/action. |
| 32 unused-index notices; 171/294 indexes had zero scans in current statistics | Advisor + `pg_stat_user_indexes` | No bulk deletion. Statistics can reset and low-frequency queries may be critical. Compare index definitions with production query plans and workload first. |

## Additional code-integrity issue fixed on the refactoring branch

The `incomplete-checkout` Edge Function referenced `recovery_consent` when preserving an existing record but omitted that column from the SELECT list. The production table does contain the boolean column. The branch adds it to the query so the existing consent state is preserved on subsequent saves; it does not grant consent or change new-record defaults.

The `courier-fraud-check` response had a redundant duplicate `source` property where an object spread overwrote the same value. The branch removes the duplicate declaration while preserving the returned value.

Both fixes are subject to the new full Edge Function type-check CI.

## Required next security work

1. Enable leaked-password protection in the Supabase Auth configuration after an admin UX check.
2. Add integration tests for MFA-protected RPCs and server-only tables, including denied anon access.
3. Review all Edge Functions with `verify_jwt=false`; document whether each is a public ingress, signed webhook, or manually authenticated endpoint.
4. Verify webhook signatures and replay protection independently of CORS.
5. Review storage bucket policies and file upload type/size validation.
6. Create a reviewed production-schema/migration baseline before any security DDL change.
7. Review `pg_net` extension dependencies and relocate only if all consumers can be migrated safely.
8. Review RLS policy query plans and consolidate overlapping policies only with equivalence tests.

## Security acceptance rule

A finding is resolved only after both the configuration/code change and a test proving the intended allow/deny behaviour. A missing policy is not automatically a vulnerability; a function-level guard is not accepted without verifying the caller identity; and a successful CI run is not a substitute for production access testing.

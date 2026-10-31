# Halal Food — Architecture Map

Last reviewed: 2026-10-31  
Production project: `qfwvrcfkrsydycbfjsxf` (ap-southeast-1)  
Website: `https://faysaltalukder.github.io/halalfood/`

## Product invariants

This repository supports a live website and operational admin system. Refactoring must preserve:
- Existing public URLs, page layouts, styling, responsive behavior and customer journeys.
- Existing admin pages, roles, permissions, controls and bilingual behavior.
- Order creation, order identifiers, COD totals, inventory reservation/release and financial ledger behavior.
- Courier integrations, WhatsApp/Messenger, Facebook/YouTube publishing, analytics and conversion tracking.
- Current Supabase project, data, table contracts, Edge Function URLs and configured secrets.

Do not change a user-visible behavior or an API/data contract as part of a code-organization-only change.

## System boundaries

| Area | Current location | Responsibility |
|---|---|---|
| Public pages | Root HTML, `products/`, `categories/` | Render customer experience |
| Public browser logic | `js/` | Navigation, cart, catalog, checkout, analytics |
| Public styles | `css/` | Customer-facing visual system |
| Admin shell | `admin/index.html` | Admin markup and shell |
| Admin logic | `admin/app.js`, `admin/shared.js`, `admin/i18n.js`, `js/admin-cms.js` | Dashboard features, shared data access, language, CMS |
| Edge Functions | `supabase/functions/<function>/index.ts` | Server-side operations and external integrations |
| Database history | `supabase/migrations/` | Versioned schema and policy changes |
| Quality checks | `scripts/`, `.github/workflows/` | Automated validation |

## Current architecture constraints

- The project is static HTML/CSS/Vanilla JavaScript hosted on GitHub Pages. Keep that deployment model unless a separately approved migration plan proves a clear benefit.
- Supabase is the authoritative operational database. Google Sheets is a backup/intake integration, not the primary source of truth for orders.
- The live catalog bridge currently reads Supabase and reconciles it with legacy browser-side product data. Do not remove the legacy data files until every consumer, fallback, SEO page and search path has been mapped and tested.
- Admin behavior is spread across a large app module and shared services. Refactor by feature boundaries, not by rewriting the entire dashboard.
- Each Edge Function is an independent deployable unit. Shared utilities may be introduced only after tests establish unchanged request/response behavior.

For the current function-level ownership map, see [FEATURE_OWNERSHIP.md](./FEATURE_OWNERSHIP.md). For task-scoped AI/developer instructions, see [AI_WORKFLOW.md](./AI_WORKFLOW.md).

## Task-context index

Use `node scripts/feature-context.mjs <feature>` to get a bounded starting set of files, database tables, Edge Functions and guardrails. Keep the index current when a feature moves. CI validates every indexed path.

## Safe change protocol

1. Identify the feature owner and read only its entry point, service/repository, shared dependency and relevant tests.
2. Trace database tables, RPCs, RLS policies, Edge Functions and browser consumers used by that feature.
3. Record the existing behavior/API contract before editing.
4. Make the smallest cohesive change; do not mix unrelated refactors.
5. Run syntax/type checks and feature-specific tests.
6. Compare the user-facing DOM, screenshots or interaction flows before and after.
7. Verify the production data contract and RLS behavior without exposing secrets or customer data.
8. Deploy only the changed surface; verify it in production and retain a rollback commit.

## Target module boundaries (incremental)

### Public site
- `catalog`: product/category reads, normalization, filtering and rendering.
- `cart`: cart state and quantity behavior.
- `checkout`: validation and order submission.
- `orders`: order confirmation and tracking.
- `analytics`: first-party event collection.
- `integrations`: WhatsApp and external service adapters.
- `shared`: configuration, formatting, DOM helpers and error handling.

### Admin
- `features/orders`, `features/catalog`, `features/customers`, `features/analytics`, `features/operations`, `features/marketing`.
- `services`: Supabase client, typed query helpers, audit logging, pagination and authorization.
- `shared`: UI primitives, formatting, notifications and validation.

### Server
- Keep one folder per independently deployed Edge Function.
- Introduce a shared module only for truly common, stable concerns (CORS, response helpers, input validation, request IDs, safe logging).
- Keep authentication and authorization explicit at each entry point. Never assume CORS is authorization.
- Keep provider-specific OAuth, webhook verification, token encryption and idempotency rules in their owning integration.

## Database and migration rules

- Production schema and migration history must be reconciled before any migration is added, reordered or marked repaired.
- Never edit an already-applied migration to change production history.
- Never run destructive DDL or data backfills without a verified backup, row-count checks and rollback plan.
- Prefer additive, backwards-compatible changes and expand/contract migrations.
- Preserve RLS and least privilege. A table with RLS and no client policies can be an intentional server-only design; verify grants and access paths before changing it.
- Index removal requires workload evidence, not just an unused-index warning.

## Definition of done

A refactor is complete only when:
- The same customer/admin journeys still work.
- No existing integration or endpoint contract is unintentionally changed.
- Automated checks pass.
- Production deployment matches the reviewed Git commit.
- Rollback steps are known and the deployment is verified.

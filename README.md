# Halal Food — Engineering Handbook

Halal Food is a GitHub Pages storefront with a Supabase-backed catalog, order system, admin dashboard, and operational integrations.

## Non-negotiable product invariant

Engineering refactoring must not change the customer-facing website, page layouts, wording, prices, product ordering, navigation, checkout behaviour, admin facilities, or existing integration workflows unless a separately approved feature change explicitly requires it.

The purpose of this repository's engineering work is to make future changes smaller, safer, more local, and easier to verify.

## System of record

- **Supabase/PostgreSQL** is the authoritative live store for products, categories, orders, customer records, inventory, and operational data.
- **Google Sheets** is a backup/order-intake integration only. It is not the primary order database.
- **GitHub Pages** serves the static storefront and admin interface.
- **Supabase Edge Functions** own privileged server-side workflows and third-party integrations.
- Public browser code may use the Supabase publishable key. It must never contain the service-role key, secret API keys, GitHub write tokens, or provider access tokens.

## Start here

1. [Architecture map](docs/ARCHITECTURE.md) — system layers, boundaries, and source-of-truth rules.
2. [Codebase map](docs/CODEBASE_MAP.md) — where each current feature lives.
3. [Developer guide](docs/DEVELOPER_GUIDE.md) — how to make a focused, safe change.
4. [Data ownership](docs/DATA_OWNERSHIP.md) — data tables and responsible services.
5. [Refactoring plan](docs/REFACTORING_PLAN.md) — safe, staged engineering improvements.

## Repository layout

- `index.html`, other root HTML files, `categories/`, `products/`, and `blog/`: static page shells and SEO-friendly routes.
- `js/` and `css/`: public website runtime, catalog bridge, cart, and presentation.
- `admin/`: admin dashboard pages, shared runtime, feature scripts, and styles.
- `supabase/functions/`: server-side application and integration endpoints.
- `supabase/migrations/`: source-controlled database changes (must remain reconciled with the production migration history).
- `scripts/`: repeatable repository checks.
- `docs/`: maintained engineering documentation.

## Local checks

No package manager or build step is currently required for the static website.

~~~bash
node scripts/repo-health.mjs

# Syntax-check a JavaScript file
node --check js/main.js

# Type-check a Supabase Edge Function (Deno 2)
deno check supabase/functions/order-sync/index.ts
~~~

The GitHub Actions quality workflow runs repository health checks, JavaScript syntax checks, and Edge Function type checks.

## Change workflow

- Start from an issue/branch with a narrow feature scope; do not make broad edits on `main`.
- Read the feature's codebase-map entry and its direct dependencies first.
- Preserve current HTML structure, CSS output, event names, API contracts, database semantics, and admin controls.
- For database changes, add a reviewed migration and verify the exact production schema before deployment.
- For Edge Functions, preserve endpoint paths, request/response shapes, auth requirements, and provider behaviour.
- Run the relevant automated checks and inspect the resulting diff before merging.

## Production safety

Never commit secrets. Never run destructive schema or data changes without a restorable backup. Never remove an index, RLS policy, function, trigger, or historical migration merely because it appears unused. Confirm its purpose and workload first.

Production state can be more recent than this repository. The migration history and deployed Edge Function sources must be kept in sync with GitHub before any future clean-room deployment is considered reproducible.

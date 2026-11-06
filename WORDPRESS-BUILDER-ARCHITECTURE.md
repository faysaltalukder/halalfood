# Halal Food WordPress Builder — Architecture Contract

> **Mandatory context for every future agent/session touching WordPress, Website Builder, grocery templates, or commerce plugins. Read this file before editing.**

## System ownership (do not change casually)

- **GitHub source repository:** `faysaltalukder/halalfood`
- **GitHub default branch:** `main`; work on feature branches and submit PRs. Do not commit unfinished work directly to `main`.
- **Neon project:** `super-glade-83751859` (Halal Food Auxiliary)
- **Neon region:** `ap-southeast-1`
- **Neon database:** `halal_food_db`
- **Neon schema:** `builder`
- **Grocery template branch:** `grocery-template-builder-v1` (`br-muddy-lake-a1tcb0n1`)
- **Neon data tables:** `builder.template_catalog`, `builder.template_designs`, `builder.websites`, `builder.website_documents`, `builder.categories`, `builder.products`, `builder.assets`, `builder.website_plugins`, `builder.orders`, `builder.order_items`, `builder.audit_log`.

**Architecture rule:** GitHub stores all source code, renderer implementations, tests and SQL migrations. Neon stores durable template definitions, website/tenant configuration, product catalogue, categories, assets, plugin configuration, orders and audit history. Do not silently substitute Supabase, browser localStorage, static JSON, or another database for Neon as the durable WordPress commerce backend.

## Environment and safety

- WordPress Studio's current Live Website is a dashboard-only sandbox. It is **not** the public Halal Food storefront.
- Never connect template previews, test publishing, or editor drafts to production orders, payments, customer data, or the public storefront without a separately reviewed release design.
- Browser localStorage may be used only for temporary UI state/offline draft fallback. It is not durable storage, not cross-device, and not an audit trail.
- Never expose Neon connection strings, database passwords, service tokens, or admin secrets in browser code, GitHub files, HTML, JavaScript, logs, or PR descriptions.
- All writes must be owner-scoped and authenticated server-side. Validate template keys, schema versions, JSON payload size, asset ownership, and allowed origins. Use parameterized SQL.
- Do not run destructive SQL or alter/delete production data. Additive migrations must be versioned under `database/migrations/` and applied first to the grocery template branch.

## Four grocery template contracts

| Key | Design | Core commerce behavior |
|---|---|---|
| `general-supermarket` | General Supermarket | Advanced search, dense catalogue, promotions, scheduled delivery/pickup |
| `fresh-produce` | Fresh & Farm | Editorial produce, origin notes, seasonal collections, variable weight, substitutions |
| `express-grocery` | Express Grocery | Compact catalogue, quick add, sticky cart, reorder, delivery zone |
| `wholesale-bulk` | Wholesale & Bulk | Pack sizes, MOQ, tiered pricing, quick order sheet, quote requests |

Each template has its own visual language and layout. They share the commerce data model; do not fork product/order persistence per template.

## Current implementation status (2026-11-06)

- WordPress category navigation and four slots per category are in `main` (PR #97).
- Universal Website Builder foundation was merged in PR #92. The editor currently has a local-only sandbox draft flow.
- PR #93 contains an additional editor-engine iteration but is still an unmerged draft; inspect and reconcile before reusing.
- This feature branch implements four responsive, interactive grocery storefront previews in `admin/wordpress-templates.{html,css,js}`.
- Neon grocery branch contains four catalog rows in `builder.template_catalog` and four versioned design specs in `builder.template_designs`.
- **Neon Data API:** Active on the grocery branch at `https://ep-wild-lab-a1jqqu0p.apirest.ap-southeast-1.aws.neon.tech/halal_food_db/rest/v1`. It exposes only the `builder` schema, validates Supabase Auth JWTs through the project's public ES256 JWKS, expects audience `authenticated` and role claim `.role`, and allows CORS only from `https://faysaltalukder.github.io`.
- **Database security:** RLS is enabled on every `builder` table. Template catalog/design records are read-only to anonymous/authenticated clients. Merchant data is scoped to `auth.uid()` and owned website IDs. Website Builder documents persist in `builder.website_documents`.
- **Legacy Function:** Neon Function `groceryapi` still has its old failed deployment because its bundle is missing `pg`. It is intentionally not used by the new integration; Neon Data API replaces that route. Do not expose or rely on the failed Function.
- Current storefront preview products/prices are illustrative only. They are not merchant data and must never be treated as real inventory or checkout.

## Required workflow for future agents

1. Read this file and inspect the current GitHub branch/PR state before editing.
2. Use the Neon project and the dedicated grocery template branch for all schema/data work. Verify the branch ID; do not infer it from a branch name.
3. Add or update a migration in `database/migrations/`; apply it to the grocery branch with a transaction and verify the resulting schema/rows.
4. Implement renderer/editor changes in this repository on a feature branch. Keep the four template keys stable.
5. Use the secured Neon Data API for browser access. Keep Supabase Auth as the identity provider only; pass the user's short-lived signed JWT, never a database password or service key. Maintain RLS and owner checks for every tenant table. Do not use the legacy failed `groceryapi` Function.
6. Add automated contract checks for all four keys, required feature flags, mobile/desktop rendering, safe input handling and no production endpoints.
7. Run syntax checks and the repository quality gate. Test the admin-authenticated page in a real browser.
8. Open a PR to `main`, describe the Neon branch/migration and test evidence, and wait for review. Do not merge or deploy unless explicitly authorized.

## Backend integration acceptance criteria

- Neon Data API status is `active`, exposes only `builder`, and accepts signed Supabase Auth JWTs.
- Read API returns the four active template catalog/design rows from Neon.
- Anonymous writes are rejected; authenticated create/update operations persist website configuration and editor documents in Neon.
- Authenticated create/update operations persist website configuration and editor documents in Neon; anonymous writes are rejected.
- Product/category/asset/order queries are scoped by `website_id` and `owner_id`.
- A read-after-write test from a second browser/session confirms the data is durable and shared.
- Test publish remains sandbox-only until a separate production publishing design is approved.

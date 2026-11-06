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

**Architecture rule:** GitHub stores all source code, renderer implementations, tests and SQL migrations. The dedicated Neon project/branch owns WordPress authentication and all durable template definitions, website/tenant configuration, product catalogue, categories, assets, plugin configuration, orders and audit history. The only shared surface with Halal Food is the WordPress section embedded in the Halal Food admin dashboard; that dashboard shell is not an identity provider or data backend for WordPress. Never use Halal Food Supabase, its JWTs, Edge Functions, database, storage, or server settings for WordPress. Do not substitute browser localStorage or static JSON for Neon as durable storage.

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
- **Neon Data API:** Active on the grocery branch at `https://ep-wild-lab-a1jqqu0p.apirest.ap-southeast-1.aws.neon.tech/halal_food_db/rest/v1`. It exposes only the `builder` schema, validates JWTs from the branch's Neon Managed Better Auth (`auth_provider=neon_auth`), uses role claim `.role`, and allows CORS only from `https://faysaltalukder.github.io`.
- **Database security:** RLS is enabled on every `builder` table. Template catalog/design records are read-only to anonymous/authenticated clients. Merchant data is scoped to `auth.uid()` and owned website IDs. Website Builder documents persist in `builder.website_documents`.
- **Legacy Function:** Neon Function `groceryapi` still has its old failed deployment because its bundle is missing `pg`. It is intentionally not used by the new integration; Neon Data API replaces that route. Do not expose or rely on the failed Function.
- Current storefront preview products/prices are illustrative only. They are not merchant data and must never be treated as real inventory or checkout.

## Required workflow for future agents

1. Read this file and inspect the current GitHub branch/PR state before editing.
2. Use the Neon project and the dedicated grocery template branch for all schema/data work. Verify the branch ID; do not infer it from a branch name.
3. Add or update a migration in `database/migrations/`; apply it to the grocery branch with a transaction and verify the resulting schema/rows.
4. Implement renderer/editor changes in this repository on a feature branch. Keep the four template keys stable.
5. Use the secured Neon Data API and Neon Managed Better Auth for browser access. WordPress authentication must be provisioned and managed only on the dedicated Neon branch. Do not use Halal Food Supabase Auth, Supabase JWTs, Supabase Edge Functions, or Halal Food server settings for WordPress. The Neon SDK manages anonymous guest JWTs for public reads and signed-in WordPress sessions for owner-scoped writes. Never ship a database password or service key. Maintain RLS and owner checks for every tenant table. Do not use the legacy failed `groceryapi` Function.
6. Add automated contract checks for all four keys, required feature flags, mobile/desktop rendering, safe input handling and no production endpoints.
7. Run syntax checks and the repository quality gate. Test the admin-authenticated page in a real browser.
8. Open a PR to `main`, describe the Neon branch/migration and test evidence, and wait for review. Do not merge or deploy unless explicitly authorized.

## Backend integration acceptance criteria

- Neon Data API status is `active`, exposes only `builder`, and accepts JWTs from Neon Managed Better Auth; public guest reads use Neon's anonymous JWT flow.
- Read API returns the four active template catalog/design rows from Neon.
- Anonymous writes are rejected; authenticated create/update operations persist website configuration and editor documents in Neon.
- Authenticated create/update operations persist website configuration and editor documents in Neon; anonymous writes are rejected.
- Product/category/asset/order queries are scoped by `website_id` and `owner_id`.
- A read-after-write test from a second browser/session confirms the data is durable and shared.
- Test publish remains sandbox-only until a separate production publishing design is approved.


## Multi-page grocery storefronts (2026-11-07)

The four grocery templates each expose 25 active page definitions from `builder.template_pages`. The additional page set includes Special Offers, Brands, Recipes & Ideas, Recipe Details, Journal, Find a Store and Bulk & Business Enquiry. The admin Website Pages workspace seeds each page as its own owner-scoped `builder.website_documents` record, using one batched Neon upsert. The editor reads and writes the selected `page_key` only.

The shared storefront renderer is `storefront.html`, `storefront.css` and `storefront.js`. It provides theme-specific visual systems for General Supermarket, Fresh & Farm, Express Grocery and Wholesale & Bulk, plus mobile layouts. Product, category, search, product-detail, basket, COD checkout, order confirmation and order tracking pages are driven by the selected website's Neon catalogue and order RPCs. No illustrative inventory is inserted into a merchant's live catalogue. Preview remains private and disables order placement; public ordering requires a published website with at least one active category and product.

The page catalogue expansion is recorded in `database/migrations/20261107_grocery_page_expansion.sql` and was applied additively to the dedicated `grocery-template-builder-v1` branch. The GitHub quality gate now checks the page library, editor page scoping, storefront commerce calls, theme CSS and page expansion.

The private admin Website Orders workspace reads the selected site's Neon orders under owner-scoped RLS and permits only the supported fulfilment status transitions (pending, processing, shipped, delivered, cancelled). Customer checkout uses the public SECURITY DEFINER order RPC; order administration uses authenticated owner-scoped Data API requests.

Order status updates are handled by the SECURITY DEFINER `builder.update_storefront_order_status` RPC. It checks `auth.uid()` against the website owner, enforces valid fulfilment transitions, and restores reserved stock atomically when an eligible pending/processing order is cancelled. Delivered and cancelled orders are terminal.

## Non-negotiable project isolation contract (2026-11-07)

This section is a release-blocking architecture rule. It is more specific than the general statement that the two projects use different databases. Every future agent, developer, workflow and deployment must preserve the boundaries below.

### 1. Two independently operable products

There are exactly two separate products:

- **Halal Food:** the existing customer-facing Halal Food business website and its own administration, application code, GitHub repository, hosting/deployment, Supabase project, authentication, storage, Edge Functions, secrets, monitoring and operational processes.
- **WordPress / Grocery Builder:** the WordPress website-builder and grocery-commerce product, with its own source repository, hosting/deployment, Neon project/branch/database/schema, Neon Managed Better Auth, Data API, secrets, migrations, storage/assets, monitoring and operational processes.

Neither product is a module, environment, tenant, fallback backend or extension of the other's business system. Each must be capable of being built, deployed, operated, maintained, backed up and recovered independently.

### 2. The only permitted connection: an Admin Panel entry point

The sole shared surface is the navigation/presentation entry point in the Admin Panel:

- The Admin Panel may display a **WordPress** section or launch point.
- Selecting that section opens the independently hosted WordPress Builder/admin application and its own workflows.
- Halal Food sections continue to operate only on Halal Food systems.
- WordPress section actions operate only on WordPress/Neon systems.
- The shared shell may provide navigation and visual layout only. It must not become a shared business backend, shared database, shared authentication authority, shared API gateway, shared secrets store or shared deployment unit.
- Do not pass Halal Food Supabase sessions, access tokens, refresh tokens, service-role keys, user records or server credentials into WordPress. Do not pass Neon credentials, WordPress sessions or WordPress customer/order data into Halal Food.
- Do not silently introduce SSO or token exchange between the two products. Any future identity federation would be a separately designed, reviewed and explicitly approved project; it is not part of this contract.

### 3. Strict backend and data ownership

**Halal Food owns and uses only its own Supabase environment** for its production website and Halal Food features. WordPress must never use Halal Food Supabase as its database, authentication provider, storage, Edge Function host, API, queue or fallback.

**WordPress owns and uses only its dedicated Neon environment** for WordPress authentication, template catalogue, website/tenant configuration, page documents, products, categories, assets, plugins, orders and audit records. Halal Food must never use the WordPress Neon project/database/schema/API as its backend, storage, authentication provider or fallback.

A failure or unavailability of one backend must never trigger fallback reads or writes to the other backend. No cross-project replication, shared tables, shared credentials, cross-database joins or implicit data synchronization are permitted.

### 4. Repository, build and deployment isolation

- Each product must have its own authoritative GitHub source repository. WordPress application/business logic, renderer, editor, commerce API client, Neon migrations and WordPress deployment workflows belong in the WordPress repository—not in the Halal Food application repository.
- The Halal Food repository may contain only the minimal Admin Panel navigation/launch adapter needed to expose the WordPress section. That adapter must not contain WordPress business logic or Neon data-access implementation.
- WordPress changes must not require a Halal Food application build, release, GitHub Pages deployment or Supabase migration. Halal Food changes must not require a WordPress build, release, Neon migration or deployment.
- CI workflows, environment variables, deployment credentials, branch protections, release tags and rollback procedures must be project-specific.
- A commit, failed build, rollback, deleted branch, repository permission change or deployment outage in one project must not alter the source, build artifacts, configuration or live deployment of the other.
- Never use one repository's deployment workflow to publish or overwrite the other product's site. Shared visual conventions or documentation do not justify sharing runtime code or deployment ownership.

### 5. Runtime, configuration and secret isolation

- Use separate origins/domains or clearly isolated application origins for the two products. Do not make either product's runtime depend on the other product's JavaScript bundles, API availability, cookies, local storage, service worker, CDN assets or configuration endpoint.
- Keep environment variables, database URLs, signing keys, API keys, OAuth clients, cookies, session stores, storage buckets and backup credentials separate.
- Do not share browser storage keys, cookie names/scopes, auth refresh flows, service workers or global JavaScript state between the applications.
- The Admin Panel launch adapter must not proxy business data or retain credentials for either backend.
- If the WordPress application or Neon is unavailable, the WordPress section may show its own error/unavailable state; Halal Food pages, checkout, admin features and Supabase operations must continue unaffected. The reverse must also hold.

### 6. Database changes and production safety

- WordPress migrations may target only the explicitly verified WordPress Neon project and dedicated WordPress branch. Halal Food migrations may target only the explicitly verified Halal Food Supabase project.
- Before every migration or deployment, verify repository, project identifier, environment, branch/database and target schema. Stop if any identifier is ambiguous or points to the other product.
- Never copy credentials or connection strings between projects. Never use the other project's backend as a temporary test environment.
- Use additive, reversible changes where possible; take and verify backups before risky changes. No destructive migration, table drop, bulk deletion, production data rewrite or cross-project change without explicit authorization.
- Experimental WordPress features must use WordPress-only preview/test data and must not touch Halal Food production customers, orders, inventory, payments, analytics or public website.

### 7. Mandatory change-impact review and acceptance tests

Before approving or deploying any change, answer all of the following:

1. Which product owns this file, service, database, secret and deployment?
2. Does the change modify or import code from the other product beyond the Admin Panel navigation/launch adapter?
3. Does it require the other product's server, database, auth session, API, storage, repository or deployment to be available?
4. Could a failure, rollback, credential rotation, migration or release in this product interrupt or mutate the other product?
5. Are all URLs, origins, environment variables, credentials, database targets and CI workflows scoped to the correct product?

Release is blocked if any answer reveals an unintended dependency or cross-project write.

Required automated/manual checks:
- WordPress builds, authenticates, reads and writes using only its own Neon environment when Halal Food Supabase is unavailable or disconnected.
- Halal Food website and admin functions continue to work using only Halal Food Supabase when Neon and the WordPress application are unavailable.
- WordPress deployment does not modify Halal Food repository files, hosting configuration or Supabase resources.
- Halal Food deployment does not modify WordPress repository files, hosting configuration or Neon resources.
- The shared Admin Panel only exposes the WordPress entry point; each section uses its own application's authorization and backend.
- Verify separate rollback paths and confirm no shared secret, database, storage or runtime dependency was introduced.

**Default decision:** when a change could couple the two products, do not implement it. Keep the products separate and ask for explicit architecture review. Convenience, reuse, a common admin screen or a shared developer account is not permission to share infrastructure or data.

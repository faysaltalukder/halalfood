# Task-Scoped Engineering Workflow

This guide is for developers and AI coding assistants working on Halal Food.

## Start from the task, not the entire repository

Use the machine-readable feature map first:

```bash
node scripts/feature-context.mjs
node scripts/feature-context.mjs catalog
node scripts/feature-context.mjs courier
node scripts/feature-context.mjs --check
```

The command lists the owning entrypoints, direct dependencies, related database tables, Edge Functions and focused checks. It does not replace code review; inspect the current implementation and runtime contract before editing.


For each request, identify:
1. User-visible behavior or server operation being changed.
2. Owning page/feature module.
3. Direct imports/callers and shared dependencies.
4. Database tables, views, RPCs, policies and Edge Functions involved.
5. Tests that protect the existing behavior.

Read the relevant files and their direct dependencies first. Expand the inspection only when a dependency, test or runtime trace points to another area. Do not perform an A-to-Z reread for a localized change.

## Feature map

| Task | Start here | Also inspect |
|---|---|---|
| Product/category display | `js/live-catalog.js`, product/category page | `js/products-data.js`, `js/products-index.js`, catalog tables/policies |
| Cart/quantity | `js/cart.js` | product card markup, checkout payload |
| Checkout/order creation | `js/main.js` checkout/order section | `order-sync`, order schema, inventory and Sheets fallback |
| Admin product/category CRUD | `admin/app.js`, `admin/shared.js`, `js/admin-cms.js` | products/categories schema, RLS, live catalog |
| Admin orders | `admin/app.js`, shared order query helpers | orders/order_items, security review, courier functions |
| Analytics/tracking | `analytics-ingest`, tracking modules | analytics_events, tracking settings, Meta CAPI deduplication |
| Courier operations | `courier-integration` | courier credentials/secrets, orders, booking state |
| Facebook publishing | `facebook-publishing`, `post-dispatcher` | publishing tables, OAuth secrets, queue |
| YouTube publishing | `youtube-publishing` | YouTube tables, OAuth redirect/secrets, storage/upload contract |
| Site publishing | `site-publisher` | site change sets/files, GitHub token configuration |

This is a starting map, not permission to skip dependency checks.

## Required response to a code task

Before editing, record:
- Target files and why they own the behavior.
- Direct dependencies and contracts.
- What will not change (UX, endpoints, data shape, security).
- Tests to run.

After editing, report:
- Files changed.
- Checks run and their actual results.
- Any unverified behavior.
- Deployment state and rollback commit.

## Refactor rules

- Do not combine a feature refactor with a visual redesign.
- Do not rename public IDs, CSS classes, URL paths, event names or database fields without a compatibility layer.
- Do not duplicate business rules in page scripts and server functions.
- Do not add a generic abstraction until at least two real consumers need it.
- Prefer small pure functions and explicit service methods.
- Keep database access behind feature-owned repositories/services as modules are extracted.
- Preserve existing error messages and response shapes unless a separately tested compatibility change is intended.
- Avoid broad search-and-replace across unrelated files.

## Token and context efficiency

- Use this guide and the feature map as the entry point.
- Inspect git diff and affected dependency graph before reading whole files.
- Read only relevant line ranges for large files where possible.
- Use tests and static checks to validate unaffected areas.
- Maintain the architecture map whenever module ownership or contracts change.

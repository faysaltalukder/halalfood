# Feature Index and Context Commands

Use this index to start work at the owning feature instead of rereading the full repository.

## Fast context lookup

From the repository root:

```bash
node scripts/feature-context.mjs --list
node scripts/feature-context.mjs catalog
node scripts/feature-context.mjs checkout
node scripts/feature-context.mjs orders
node scripts/feature-context.mjs courier
node scripts/feature-context.mjs tracking
node scripts/feature-context.mjs facebook
node scripts/feature-context.mjs youtube
node scripts/feature-context.mjs messaging
node scripts/feature-context.mjs site_publishing
node scripts/feature-context.mjs overview
node scripts/feature-context.mjs customers
node scripts/feature-context.mjs finance
node scripts/feature-context.mjs reports
node scripts/feature-context.mjs settings
node scripts/feature-context.mjs incomplete_orders
node scripts/feature-context.mjs content
node scripts/feature-context.mjs --check
```

The command prints the feature purpose, first files to inspect, related files, live line-number anchors for important functions, database tables, Edge Functions, existing checks and behavior guardrails. It performs no network or database operations and never changes source files.

## Ownership map

| Feature key | Primary entry points | Server functions |
|---|---|---|
| `catalog` | `js/live-catalog.js`, `js/products-index.js` | — |
| `checkout` | `js/cart.js`, `js/main.js` | `order-sync`, `incomplete-checkout` |
| `orders` | `admin/orders.html`, `admin/app.js` | `order-sync`, `order-track`, `order-security-admin` |
| `courier` | `admin/operations.js`, `courier-integration` | `courier-integration`, `courier-fraud-check` |
| `tracking` | `admin/tracking.js`, `analytics-ingest` | `analytics-ingest` |
| `facebook` | `admin/facebook-publishing.js`, `admin/meta-ads-review.js` | `facebook-publishing`, `post-dispatcher`, `meta-ads-review` |
| `youtube` | `admin/youtube-publishing.js` | `youtube-publishing` |
| `messaging` | `admin/messages.js`, `admin/messenger.js` | WhatsApp and Messenger send/webhook functions |
| `site_publishing` | `admin/website-publisher.js`, `js/admin-cms.js` | `site-publisher` |
| `overview` | `admin/overview.html`, overview functions in `admin/app.js` | — |
| `customers` | customer directory functions in `admin/app.js` | — |
| `finance` | finance/reconciliation functions in `admin/app.js` | — |
| `reports` | report builder functions in `admin/app.js` | — |
| `settings` | settings/health functions in `admin/app.js` | `order-security-admin` |
| `incomplete_orders` | `admin/incomplete-orders.js` | `incomplete-checkout` |
| `content` | content/CMS functions in `admin/app.js` | `site-publisher` |

## How to use it

1. Run the command for the feature being changed.
2. Read the listed `READ FIRST` files and only their direct callers/dependencies.
3. Inspect the named database contracts and function endpoints before changing them.
4. Add a test or update the feature's existing guard when behavior changes.
5. Update this index when source ownership, table usage or server-function boundaries change.

The index is a guided starting point, not permission to skip dependency analysis. For cross-cutting changes, inspect each affected feature explicitly.

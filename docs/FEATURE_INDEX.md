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
node scripts/feature-context.mjs --check
```

The command prints the feature purpose, first files to inspect, related files, database tables, Edge Functions, existing checks and behavior guardrails. It performs no network or database operations and never changes source files.

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

## How to use it

1. Run the command for the feature being changed.
2. Read the listed `READ FIRST` files and only their direct callers/dependencies.
3. Inspect the named database contracts and function endpoints before changing them.
4. Add a test or update the feature's existing guard when behavior changes.
5. Update this index when source ownership, table usage or server-function boundaries change.

The index is a guided starting point, not permission to skip dependency analysis. For cross-cutting changes, inspect each affected feature explicitly.

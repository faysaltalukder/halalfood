# Data Ownership and Contracts

## Primary records

| Data | Owner | Notes |
|---|---|---|
| Products | `public.products` | Live product name, slug, price, image, active state, stock and category reference |
| Categories | `public.categories` | Live category name, slug, visibility and order |
| Orders | `public.orders` | Authoritative order header and status |
| Order lines | `public.order_items` | Snapshot of product details and quantities at purchase time |
| Customers | `public.customers` | Customer identity and verified Auth link |
| Customer profiles | `public.customer_profiles` | Profile presentation and customer-scoped data |
| Cart sync | `public.customer_cart_items` | Signed-in customer cart persistence |
| Stock history | `public.inventory_movements` | Audit trail of stock movements |
| Shipping/courier state | `public.admin_shipments` | Booking and provider identifiers/status |
| Activity log | `public.admin_activity_log` | Administrative audit events |
| Event history | `public.analytics_events` | First-party browser/server event store |
| Meta delivery state | `public.meta_event_delivery_log` | Server-side delivery and dedupe evidence |
| Scheduled posts | `public.post_queue` | Queue/lease state, not a media store |
| Provider accounts | Provider-specific private tables | Tokens and OAuth state must never be exposed to browser clients |

## Request/response ownership

- Storefront catalog: browser reads active categories/products through the live catalog layer using public-safe permissions.
- Admin catalog: admin session with required MFA manages products/categories through the admin feature service.
- Order creation: storefront -> `order-sync` -> PostgreSQL transaction/business rules -> confirmation. Google Sheets backup is secondary and must not turn a failed primary save into a false success.
- Order tracking: `order-track` only returns an order for a matching order number and customer phone.
- Courier booking: admin -> `courier-integration` -> provider; booking outcomes must preserve uncertain/unknown states to avoid duplicate bookings.
- Analytics: browser/server event -> `analytics-ingest` -> event store and server-side delivery pipeline.
- Social publishing: dashboard -> provider-specific function or dispatcher -> provider -> publish history.
- Website publishing: dashboard -> `site-publisher` -> validated change set -> GitHub -> publish log.

## Schema safety

The production database currently reports 48 public tables and 77 applied migrations. The GitHub repository currently contains 34 SQL files under `supabase/migrations/`. These histories are not currently reconciled by exact version/name matching.

Consequences:
- Do not assume the repository can recreate the current production schema from zero.
- Do not run a broad `db reset`, full migration replay, or generated baseline against production until a safe baseline/reconciliation is reviewed.
- Do not delete the 14 repository migration files that do not have an exact remote-history match; determine whether they are renamed/merged/applied out-of-band first.
- Recovered schema and data definitions must be reviewed for PII and secret material before they are committed.

## Access-control classification

Nine tables reported as RLS-enabled with no RLS policy were checked for table-level SELECT grants. The observed configuration denies both `anon` and `authenticated` SELECT and grants the server role SELECT. These appear to be private server-only tables, so do not add client policies merely to silence an advisor.

Two SECURITY DEFINER RPCs are executable by `authenticated` but not `anon`. Their bodies contain explicit checks:
- `admin_update_order_delivery_address`: requires the configured admin email and `aal2`, validates address length, order status, and courier booking state.
- `sync_my_customer_identity`: requires `auth.uid()`, a confirmed Auth email, and exactly one matching customer row before linking.

These functions still require periodic review, but revoking their current execute permission without replacing their intended callers would break existing customer/admin workflows.

## Index and policy hygiene

Current read-only statistics reported 294 indexes, with 171 at zero scans in the available statistics window. This is not sufficient evidence to drop indexes. Statistics can reset and low-frequency workloads can be critical.

Current performance advisor findings include:
- Two RLS function-evaluation notices on tracking settings policies.
- Multiple permissive policy notices on several customer/catalog/order tables.
- 32 unused-index notices.

Address each finding with the actual query plan, role access model, policy semantics and production workload. Prefer safe consolidation only when the resulting allow/deny behaviour is provably identical.

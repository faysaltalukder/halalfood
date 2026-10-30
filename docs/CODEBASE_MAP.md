# Codebase Map

Use this file as the first navigation step for a task. It is a map of current ownership, not a claim that every area is already fully modular.

## Public website

| Area | Primary files | Responsibilities |
|---|---|---|
| Home page | `index.html`, `js/main.js`, `js/live-catalog.js` | Home rendering, shared storefront interactions, live catalog integration |
| Shared storefront behaviour | `js/main.js` | Navigation, common widgets, page-level behaviours, and some checkout integrations |
| Product/cart | `product.html`, `js/product-page.js`, `js/product-viewer.js`, `js/cart.js` | Product detail, product interactions, cart state and quantity |
| Category | `category.html`, `categories/*.html`, `js/live-catalog.js` | Category routes and live category listings |
| Product catalog compatibility | `js/products-data.js`, `js/products-index.js` | Legacy/static lookup data; do not treat as the live authority |
| CMS product page | `cms-product.html`, `js/cms-product.js`, `js/admin-cms.js` | Admin-managed product detail/CMS behaviour |
| Checkout/order | `order.html`, `thank-you.html`, `track-order.html`, `js/incomplete-checkout.js`, `js/main.js` | Checkout, submit, completion, incomplete checkout, tracking handoff |
| Account | `account.html` | Authentication and customer account experience |
| Cart | `cart.html`, `js/cart.js` | Cart presentation and actions |
| Styling | `css/style.css`, `css/incomplete-checkout.css` | Shared storefront appearance and checkout-specific styling |
| Blog | `blog/`, `js/live-blog.js` | Blog routes and live blog content |

## Admin dashboard

| Area | Primary files | Responsibilities |
|---|---|---|
| Admin entry/auth shell | `admin/index.html` | Entry, login/MFA UI, root dashboard structure, bootstrapping |
| Shared admin runtime | `admin/shared.js` | Supabase client, shared query/pagination, formatting, auth helpers, navigation and shared components |
| Admin business logic | `admin/app.js` | Current central feature logic: overview, orders, product catalog, customers, finance, operations, reports, and related actions |
| Admin translations | `admin/i18n.js` | Bengali/English text catalogue and language switching |
| Products/CMS | `admin/products.html`, `js/admin-cms.js`, `admin/app.js` | Product/category management and content sync |
| Orders | `admin/orders.html`, `admin/orders.js` if present, `admin/app.js` | Orders, status transitions, security review, courier operations |
| Operations | `admin/operations.html`, `admin/operations.js` | Team, supplier, shipment, purchasing, returns and operational tasks |
| Publishing | `admin/facebook-publishing.*`, `admin/youtube-publishing.*`, `admin/website-publisher.*` | Channel publishing and site publishing UI |
| Messaging | `admin/messages.*`, `admin/messenger.*` | Messaging inbox and channel actions |
| Tracking | `admin/tracking.html`, `admin/tracking.js` | Analytics and tracking controls |
| Styles | `admin/shared.css` and page/feature CSS files | Shared admin shell and feature-specific design |

## Edge Function directory

| Function | Responsibility |
|---|---|
| `order-sync` | Validates and saves website orders to Supabase |
| `order-track` | Public order lookup using Order ID and verified phone match; recovered from deployed version 54 |
| `courier-integration` | Courier booking, tracking, and cancellation workflows |
| `courier-fraud-check` | Server-side courier/customer risk checks |
| `order-security-admin` | Admin order-security review and related protected operations |
| `incomplete-checkout` | Captures and manages incomplete checkout records |
| `analytics-ingest` | First-party event ingestion and server-side Meta delivery/deduplication |
| `facebook-publishing` | Facebook publishing connection and publishing actions |
| `youtube-publishing` | YouTube OAuth, upload, channel and publishing actions; recovered from deployed version 19 |
| `meta-ads-review` | Meta Ads review workspace integration; recovered from deployed version 12 |
| `post-dispatcher` | Queue-based social post dispatch |
| `site-publisher` | Validated website changes and GitHub publishing |
| `whatsapp-send` / `whatsapp-webhook` | WhatsApp outbound messages and inbound webhook |
| `messenger-send` / `messenger-webhook` | Messenger outbound messages and inbound webhook |

## Database table families

Generated schema reference: `supabase/database.types.ts`. This file is generated from the current production database and should be refreshed after a reviewed schema change. Do not hand-edit generated types.

The public schema contains 48 tables. The most relevant families are:

- Store/catalog: `products`, `categories`, `blog_posts`, `site_content_blocks`
- Orders/customers: `orders`, `order_items`, `customers`, `customer_profiles`, `customer_cart_items`, `order_status_history`
- Inventory/finance: `inventory_movements`, `admin_product_costs`, `admin_finance_entries`
- Courier/operations: `admin_shipments`, `courier_customer_history_cache`, `admin_operational_tasks`, `admin_suppliers`, `admin_purchase_orders`, `admin_purchase_order_items`, `admin_return_requests`, `admin_team_members`
- Security: `order_security_reviews`, `order_security_signals`, `admin_activity_log`
- Analytics/tracking: `analytics_events`, `tracking_event_settings`, `tracking_runtime_settings`, `meta_event_delivery_log`
- Social/messaging: `post_queue`, `platform_settings`, `facebook_page_accounts`, `facebook_publish_history`, `youtube_connected_accounts`, `youtube_publish_history`, `youtube_community_drafts`, `messaging_contacts`, `messaging_conversations`, `messaging_messages`

## Task routing: first files to inspect

| Request | Start here | Inspect next only when needed |
|---|---|---|
| Product appears incorrectly | `js/live-catalog.js` | Product page renderer, Catalog tables/policies, CMS save path |
| Product edit form broken | `admin/app.js` product section and `admin/shared.js` | `js/admin-cms.js`, products/categories schema |
| Cart quantity issue | `js/cart.js` | Product page and cart HTML |
| Checkout/order issue | `js/main.js` order-submit section | `order-sync`, Orders schema, inventory triggers |
| Customer login/profile issue | `account.html` | Auth/session helpers, customer identity function, customer policies |
| Courier issue | `admin/operations.js` or courier UI entry | `courier-integration`, provider-specific env config, shipment tables |
| Order fraud/security issue | `order-security-admin` / `courier-fraud-check` | Security signals/reviews, policies, audit logs |
| Analytics/Meta event issue | `admin/tracking.js` | `analytics-ingest`, tracking settings, Meta delivery log |
| Facebook publishing issue | `admin/facebook-publishing.js` | `facebook-publishing`, page-account records |
| YouTube publishing issue | `admin/youtube-publishing.js` | `youtube-publishing`, OAuth/encryption config, history |
| Post scheduler issue | `admin/facebook-publishing.js` or publishing UI | `post-dispatcher`, `post_queue` |
| Website publishing issue | `admin/website-publisher.js` | `site-publisher`, site change sets/files, GitHub permissions |
| Messaging issue | `admin/messages.js` / `admin/messenger.js` | Matching send/webhook function and message tables |

## Important caution

Large shared files are known navigation hotspots, but splitting them is a staged task. Do not move code just to make the file smaller. First identify its callers, state ownership, DOM dependencies, event listeners, and data contract; then extract a self-contained feature with parity tests.

# Halal Food — Feature Ownership Map

Reviewed: 2026-10-31  
This file is the fast entry point for localized changes. Function names are more stable than line numbers; use repository search for the current definition.

## Admin dashboard: `admin/app.js`

The file is one IIFE that waits for `window.HFAdminReady`, receives shared services from `admin/shared.js`, then dispatches by `document.body.dataset.page`. Do not assume every function runs on every admin page.

| Feature area | Main entry point | Related functions |
|---|---|---|
| Shared bootstrap | `doInit()` | `normalizeCourierMobile`, `selectedRange`, `showCustomDates`, `bindRangeControls`, `attachRefresh`, `renderRangeHint` |
| Business overview | `initOverview()` | `trendCounts`, `chartAxisOptions`, `orderStatusCounts`, `stageActors`, `topProducts`, `visitorSessionKey`, `formatSeconds`, `buildPageExperience`, `buildSessionJourneys`, `buildProductPerformance`, `renderTopProducts`, `renderFunnel`, `renderRecentOrders`, `fetchOverviewOrderSummary`, `renderActionCenter` |
| Website analytics | `initAnalytics()` | Page-level analytics refresh and chart rendering; shares event and chart helpers with overview |
| Orders and order security | `initOrders()` | `refreshSecuritySignals`, `refreshSecurityReviewQueue`, `render`, `refresh`, order detail/fulfilment handlers |
| Offline POS import | `window.HFPosInit()` in `admin/pos.js` | `parseCsv`, `buildGroups`, `validatePreview`, `runImport`; calls the atomic `create_offline_pos_sale` RPC |
| Single courier booking | Order action in `initOrders()` | `inferRedxDistrict`, `orderPackedWeightKg`, `updateConfirmBookProviderFields`, `loadConfirmBookRedxAreas`, `renderConfirmBookItems`, `refreshConfirmBookItems`, `openConfirmBook`, `normalizePhone`, `whatsappUrl`, `courierLookupPhone`, `courierHistoryPercent`, `courierHistoryHumanize`, `showCourierHistory` |
| Order print/export and bulk actions | Orders page | `printPackingSlip`, `orderCustomerAvatar`, `updateBulkSelectionUi`, `printSelectedOrders`, `exportSelectedOrders`, `openBulkStatusDialog`, `openBulkAssignDialog`, `deleteSelectedOrders`, `bulkCourierEligibleOrders`, `renderBulkCourierRows`, `openBulkCourierDialog`, `sendSelectedOrdersToCourier` |
| Product and category management | `initProducts()` | `uploadImage`, `stockState`, `fillCategories`, `render`, `refresh`, `inferShippingWeightFromUnit`, `openProduct`, `openCategory` |
| Site content and blog CMS | `initContent()` | `siteUrl`, `renderBlocks`, `renderPosts`, `render`, `refresh`, `openSiteBlock`, `openPost` |
| Customer directory | Customer page initializer | `normalizePhone`, `buildDirectory`, `render`, `refresh` |
| Finance and reconciliation | `initFinance()` | `linkedIncomeTotal`, `renderReconciliation`, `totals`, `render`, `refresh`, `openEntry` |
| Reports | `initReports()` | `buildReport` |
| Settings and health | `initSettings()` | `healthCheck`, `loadActivity`, `refresh` |
| Global table search | Shared bootstrap | `applyGlobalTableSearch` |

### Admin shared services: `admin/shared.js`

Start here when a change concerns common data access, authentication, audit logging or formatting.

- Authentication and MFA: `HFAdminReady`, session verification, Auth state listener.
- Authorization wrapper: `signedQuery`.
- Data access: `fetchOrders`, `fetchEvents`, `fetchProducts`, `fetchCategories`, `fetchPosts`, `fetchFinance`.
- Query helpers: pagination, date range and range query helpers.
- Shared UI: notifications, status labels, empty states, charts, table messages.
- Audit and export: `audit`, CSV and download helpers.

Do not bypass `signedQuery` or the MFA-verified session for admin-only reads/writes.

## Public website

### `js/main.js` — public page orchestration

This file currently contains multiple responsibilities. Use the relevant feature group as a starting point and inspect its callers before editing.

| Feature area | Main functions / identifiers |
|---|---|
| Order creation and customer flow | `makeOrderId`, `whatsappLink`, checkout/order submission handlers in the first ~1,200 lines |
| Location selector | `initLocationCombobox` |
| Checkout progression | `advance` |
| Tracking configuration and event transport | `createEventId`, `cookieValue`, `routeEnabled`, `hasEnabledRoutes`, `initPixelIfEnabled`, `safeItem`, `sendFirstPartyEvent`, `dispatchExternal` |
| Google Analytics 4 | `ensureDirectGa4Tag`, `sendGa4Event`, `flushGa4Queue`, `fireConfirmedGa4Purchase`, `flushConfirmedGa4Purchases`, `flushExternalQueue`, `loadTrackers` |
| Visible-time measurement | `pausePageVisibleClock` |
| Price display | `cleanVisiblePrices`, `initPriceDisplay` |
| Mobile navigation | `installMobileDock` |

The public checkout contract is sensitive: Supabase is the authoritative order store; Google Sheets is a backup. Preserve Order ID, totals, inventory and purchase-deduplication behavior.

### `js/live-catalog.js` — catalog bridge

Start here for live product/category rendering:
- Supabase reads: `readTable`.
- Route/product resolution: `pathInfo`, `productHref`.
- Product card/image/controls: `imageNeedsReplace`, `setPictureImage`, `setProductControls`, `updateProductCard`, `makeProductCard`, `patchExistingCards`.
- Category/home merchandising: `renderCategory`, `renderMerchandisingRails`, `renderHome`, `syncCategoryMenus`.
- Product detail: `renderProductDetail`.
- Catalog synchronization: `handleProductResult`, `syncProductData`, `start`.

Do not remove legacy static product files until every fallback, search, SEO and product URL consumer has been migrated and tested.

### `js/cart.js` — cart and cloud synchronization

- Guest cart state: `read`, `write`, `add`, `setQty`, `remove`, `clear`, `total`, `totalQty`.
- Cloud cart: `readStoredAuthUser`, `loadSupabaseSdk`, `getCloudCartClient`, `waitForLiveCatalog`, `scheduleCloudCartSave`, `saveCloudCartSnapshot`, `startCloudCartSync`.
- Rendering: `itemMarkup`, `checkoutItemMarkup`, `renderCounts`, `renderProductCartControls`, `renderQuantityStepper`, `renderDrawer`, `renderPage`, `renderOrderSummary`, `renderAll`.
- Navigation/theme: `applyThemeMode`, `ensureThemeToggle`, `initThemeMode`, `ensureCategoryFloatingCart`, `ensureHeaderButton`, `ensureDrawer`, `setDrawer`.
- DOM synchronization: `observeProductCartControls`, `commitProductQtyInput`.

### `js/admin-cms.js` — CMS integration

Product/category/blog CMS: `loadAll`, `renderProducts`, `renderCategories`, `renderPosts`, `editProduct`, `saveProduct`, `toggleProduct`, `editCategory`, `saveCategory`, `toggleCategory`, `editPost`, `savePost`, `togglePost`. Uses the existing MFA-verified admin session; do not create a second privileged client.

## Offline POS data contract

- The POS screen is intentionally a small two-panel workflow: choose one catalogue product, enter sale date/time, optional customer details, quantity, selling price and payment status, then save once.
- The browser generates a private POS reference; operators do not need to enter a receipt ID or product slug.
- The SECURITY INVOKER RPC writes one orders record and one order_items record, decrements tracked stock and records inventory_movements.pos_sale, then writes a linked admin_finance_entries income row in one transaction.
- Paid = confirmed finance income; unpaid = draft. Existing Finance totals and charts use the same central finance ledger, so only confirmed receipts increase received-income totals.
- The form supports fractional quantities for kg/liter products; packaged products and pieces use whole-number quantities.
- Offline POS never emits website Purchase tracking events.

## Backend ownership

| Function | Primary responsibility |
|---|---|
| `order-sync` | Order submission, authoritative order save and post-save dispatch |
| `order-track` | Customer order tracking lookup |
| `analytics-ingest` | First-party analytics event ingestion |
| `courier-integration` | Courier provider booking/management |
| `courier-fraud-check` | Courier history/risk review |
| `incomplete-checkout` | Incomplete checkout capture |
| `order-security-admin` | Admin order-security review operations |
| `whatsapp-send`, `whatsapp-webhook` | WhatsApp messaging |
| `messenger-send`, `messenger-webhook` | Messenger messaging |
| `facebook-publishing` | Facebook page publishing |
| `youtube-publishing` | YouTube OAuth, upload and channel operations |
| `meta-ads-review` | Read-only Meta Ads review |
| `post-dispatcher` | Scheduled post queue dispatch |
| `site-publisher` | Website publishing/change-set operations |

## Change-scoping checklist

For a localized change, read:
1. The named page/feature entry point above.
2. Its direct shared helper/service.
3. Its API/Edge Function caller if it crosses the browser/server boundary.
4. The relevant table columns, RLS policies and migration.
5. The focused automated checks.

Expand the inspection only when a direct dependency, test or runtime trace requires it.

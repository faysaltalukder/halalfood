import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const adminDir = join(root, "admin");
const sharedCssVersion = "20261102-reports-navigation-v3";
const workspaceThemeCssVersion = "20261101-merchant-fieldbook-v1";
const sharedJsVersion = "20261102-reports-navigation-v3";
const i18nVersion = "20261102-dashboard-speed-v2";
const appJsVersion = "20261102-dashboard-speed-v2";
const read = (path) => readFileSync(join(root, path), "utf8");
const performanceApp = read("admin/app.js");
const performanceShared = read("admin/shared.js");
const performanceI18n = read("admin/i18n.js");
assert.ok(performanceShared.includes("concurrency=3") && performanceShared.includes("await Promise.all(offsets.map"), "Database pagination must use bounded parallel batches.");
assert.ok(performanceShared.includes("const [products,costs]=await Promise.all"), "Products and product-cost records must load concurrently.");
assert.ok(performanceApp.includes("async function fetchOverviewPages") && performanceApp.includes("const bucketIndexes=new Map("), "Overview data loads must batch pages and aggregate metrics by bucket in one pass.");
assert.ok(performanceApp.includes("data:financeIncomeCounts") && performanceApp.includes("data:pageViewCounts") && performanceApp.includes("data:productViewCounts"), "Overview charts must reuse pre-aggregated data instead of refiltering all events for each bucket.");
assert.ok(performanceApp.includes("const byId=new Map(),bySlug=new Map(),byName=new Map()"), "Product performance must use indexed product lookups instead of scanning the full product list for each event.");
assert.ok(performanceApp.includes("const dhakaDateFormatter=new Intl.DateTimeFormat"), "Analytics must reuse one Dhaka date formatter instead of constructing one per event.");
assert.ok(performanceApp.includes("let visibleSeconds=0,cartAdds=0,checkouts=0,orderSubmits=0"), "Session journey summaries must aggregate event metrics in one pass.");

assert.ok(performanceApp.includes("const tableChanged=records.some") && performanceApp.includes("globalSearchFilteredRows"), "Global table search must ignore irrelevant DOM updates and avoid rescanning when search is empty.");
assert.ok(performanceI18n.includes("NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT") && performanceI18n.includes("const addedNodes = new Set()"), "Language updates must use a single batched DOM traversal.");

const languageEngine = read("admin/i18n.js");
assert.ok(languageEngine.includes("label.textContent !== labelText"), "Language picker label updates must be idempotent to prevent mutation-observer loops.");
assert.ok(languageEngine.includes('if (!document.querySelector(".hf-language-segment, .hf-language-picker")) ensurePicker();'), "The language picker must only be re-created when missing.");
assert.ok(languageEngine.includes("if (!isPickerOption(record.target)) translateText(record.target, lang);"), "Language picker DOM mutations must be excluded from recursive translation work.");

const themeRegistry = read("admin/shared.js");
const corporateThemeCss = read("admin/corporate-standard.css");
const goldenPrestigeCss = read("admin/golden-prestige.css");
const solarJourneyCss = read("admin/solar-journey.css");
const lunarJourneyCss = read("admin/lunar-journey.css");
const celestialEngine = read("admin/celestial-engine.js");
assert.ok(themeRegistry.includes('id:"corporate-standard"') && themeRegistry.includes('name:"Corporate Standard"'), "Corporate Standard theme must be registered.");
assert.ok(themeRegistry.includes('id:"standard",label:"Standard"') && themeRegistry.includes('themeIds:["corporate-standard"]'), "Corporate Standard must appear in its own Standard theme group.");
assert.ok(themeRegistry.includes('corporate-standard.css?v=20261102-corporate-standard-v1'), "Corporate Standard stylesheet must load dynamically with a cache-busted URL.");
assert.ok(corporateThemeCss.includes('html[data-hf-theme="corporate-standard"]') && corporateThemeCss.includes(".admin-sidebar") && corporateThemeCss.includes(".admin-topbar") && corporateThemeCss.includes(".hf-table"), "Corporate Standard CSS must cover the real shared admin shell and work tables.");
assert.ok(themeRegistry.includes('id:"golden-prestige"') && themeRegistry.includes('name:"Golden Prestige"'), "Golden Prestige must be registered.");
assert.ok(themeRegistry.includes('id:"premium",label:"Premium"') && themeRegistry.includes('themeIds:["golden-prestige"]'), "Golden Prestige must appear in the Premium group.");
assert.ok(themeRegistry.includes("golden-prestige.css?v=20261102-golden-prestige-v1"), "Golden Prestige stylesheet must load with a cache-busted URL.");
assert.ok(goldenPrestigeCss.includes('html[data-hf-theme="golden-prestige"]') && goldenPrestigeCss.includes(".admin-sidebar") && goldenPrestigeCss.includes(".admin-topbar") && goldenPrestigeCss.includes(".hf-table"), "Golden Prestige CSS must cover the shared shell and work tables.");

assert.ok(themeRegistry.includes('id:"solar-journey"') && themeRegistry.includes('name:"Solar Journey"'), "Solar Journey theme must be registered.");
assert.ok(themeRegistry.includes('id:"lunar-journey"') && themeRegistry.includes('name:"Lunar Journey"'), "Lunar Journey theme must be registered.");
assert.ok(themeRegistry.includes('id:"celestial",label:"Celestial"') && themeRegistry.includes('themeIds:["solar-journey","lunar-journey"]'), "Both dynamic themes must appear together in Celestial group.");
assert.ok(themeRegistry.includes("solar-journey.css?v=20261102-solar-lunar-v1") && themeRegistry.includes("lunar-journey.css?v=20261102-solar-lunar-v1"), "Both dynamic theme stylesheets must load with cache-busted URLs.");
assert.ok(solarJourneyCss.includes('html[data-hf-theme="solar-journey"]') && solarJourneyCss.includes(".hf-celestial-orb") && solarJourneyCss.includes(".hf-theme-mode-actions"), "Solar Journey CSS must style the daytime scene and controls.");
assert.ok(lunarJourneyCss.includes('html[data-hf-theme="lunar-journey"]') && lunarJourneyCss.includes(".hf-moon-shadow") && lunarJourneyCss.includes(".hf-celestial-stars"), "Lunar Journey CSS must style moon phases and stars.");
assert.ok(celestialEngine.includes("function solarTimes") && celestialEngine.includes("function moonData") && celestialEngine.includes("Asia/Dhaka"), "Dynamic engine must calculate local sunrise/sunset and lunar phase without an API.");
assert.ok(celestialEngine.includes('data-hf-time-mode') && celestialEngine.includes('latitude:21.99') && celestialEngine.includes('longitude:90.24'), "Engine must expose Auto/Day/Night controls and use the Kalapara area coordinates.");
assert.ok(themeRegistry.includes('id="hfCelestialScene"') && themeRegistry.includes('id="hfMoonShadow"'), "Shared shell must mount the non-interactive sun/moon scene.");
assert.ok(celestialEngine.includes("setInterval(update,60000)") && solarJourneyCss.includes("prefers-reduced-motion") && lunarJourneyCss.includes("prefers-reduced-motion"), "Theme updates must be throttled and respect reduced motion.");



const htmlFiles = readdirSync(adminDir).filter((file) => file.endsWith(".html"));
const unifiedPages = htmlFiles.filter((file) => /<body[^>]*\bdata-page=/.test(read(join("admin", file))));
assert.equal(unifiedPages.length, 44, `Expected 44 unified admin pages in the current admin workspace, found ${unifiedPages.length}.`);
assert.ok(unifiedPages.includes("ai-knowledge.html"), "AI Knowledge Center must use the unified admin shell.");
assert.ok(unifiedPages.includes("pos.html"), "POS import must use the unified admin shell.");
assert.ok(unifiedPages.includes("coupons.html"), "Coupon Promotions must use the unified admin shell.");
assert.ok(unifiedPages.includes("coupon-usage.html"), "Coupon Usage must use the unified admin shell.");
assert.ok(unifiedPages.includes("categories.html"), "The single Categories workspace must use the unified admin shell.");
assert.ok(unifiedPages.includes("wordpress-live.html") && !unifiedPages.includes("wordpress.html"), "The sandbox Live Website route must use the unified admin shell; the legacy production preview route must remain a redirect shim.");
const wordpressPage = read("admin/wordpress-live.html");
const wordpressNav = read("admin/shared.js");
const wordpressSandbox = read("admin/wordpress-sandbox.js");
const websiteBuilderPage = read("admin/website-builder.html");
const wordpressCss = read("admin/wordpress.css");
assert.ok(wordpressNav.includes('["wordpress","layout","WordPress"'), "WordPress must be the final System sidebar entry.");
assert.ok(wordpressNav.includes("./wordpress-live.html"), "The WordPress sidebar must open the dashboard-only Live Website partition.");
assert.ok(wordpressPage.includes("shared.js?v=20261105-wordpress-sidebar-submenu-v1") && wordpressPage.includes("wordpress-sandbox.js?v=20261105-sandbox-partitions-v1"), "Live Website must load the secure admin shell and isolated sandbox controller.");
assert.ok(wordpressPage.includes('data-page="wordpress"') && wordpressPage.includes('id="wpSandboxFrame"') && wordpressPage.includes('id="wpSandboxReviewFrame"'), "Live Website must render both the published test version and review draft.");
assert.ok(!wordpressPage.includes("github.io/halalfood") && !wordpressPage.includes("wordpress.js?") && !wordpressPage.includes("wordpress-review.js?"), "The sandbox Live Website must not load or link to the production storefront preview scripts.");
assert.ok(!/<iframe[^>]+\ssrc=/.test(wordpressPage) && (wordpressPage.match(/sandbox=""/g)||[]).length>=2, "Sandbox preview iframes must be script-disabled, opaque-origin frames without external iframe destinations.");
assert.ok(wordpressPage.includes("Publish Test Version") && wordpressPage.includes("public Halal Food website remains unchanged") && wordpressPage.includes("dashboard://sandbox/published-test-version"), "The Live Website partition must clearly identify dashboard-only Test Publish.");
assert.ok(websiteBuilderPage.includes('href="./wordpress-live.html"') && websiteBuilderPage.includes('aria-label="Back to WordPress Studio"') && websiteBuilderPage.includes("<h1>Edit Website"), "Edit Website must provide a clear return route to Live Website and identify its editor view.");
assert.ok(websiteBuilderPage.includes('id="builderSendPreview"') && websiteBuilderPage.includes("Send for test review"), "Edit Website must send drafts into the sandbox review workflow.");
assert.ok(websiteBuilderPage.includes("Test Publish never changes the public website") && websiteBuilderPage.includes("no production connection"), "Edit Website must disclose production isolation.");
assert.ok(wordpressSandbox.includes('const PUBLISHED_KEY = "hf-wp-sandbox-published-v1"') && wordpressSandbox.includes('const HISTORY_KEY = "hf-wp-sandbox-history-v1"') && wordpressSandbox.includes('const REVIEW_KEY = "hf-wp-review-package-v1"'), "Sandbox drafts, test-published versions and history must use separate browser-local keys.");
assert.ok(wordpressSandbox.includes("review.status !== \"approved\"") && wordpressSandbox.includes("Production unchanged") && wordpressSandbox.includes("Publish Test Version"), "Test Publish must require approval and remain dashboard-only.");
assert.ok(wordpressSandbox.includes("sandbox only") && wordpressSandbox.includes("validDoc") && wordpressSandbox.includes("renderDocument"), "Sandbox rendering must validate the document model and never execute arbitrary HTML.");
assert.ok(!/fetch\s*\(|XMLHttpRequest|supabase|github\.io\/halalfood/i.test(wordpressSandbox), "The sandbox controller must not call production APIs, Supabase or the live storefront.");
assert.ok(wordpressCss.includes(".hf-sandbox-safety") && wordpressCss.includes(".hf-sandbox-device iframe[hidden]") && wordpressCss.includes(".hf-sandbox-history"), "Sandbox safety notice, preview and version history must have responsive styles.");
for (const page of ["categories-tree.html","categories-sorting.html","categories-settings.html"]) {
  assert.ok(!unifiedPages.includes(page), "Categories must not expose a separate child route: " + page);
}
const categoriesNav = read("admin/shared.js");
const categoriesUi = read("admin/categories.js");
const categoriesPage = read("admin/categories.html");
const categoriesLive = read("js/live-catalog.js");
const categoriesMigration = read("supabase/migrations/20261031165140_add_reusable_three_level_catalog_management.sql");
assert.ok(categoriesNav.includes('["categories","layers","Categories"') && !categoriesNav.includes('"categories-tree"') && !categoriesNav.includes('"categories-sorting"') && !categoriesNav.includes('"categories-settings"'), "Admin sidebar must expose one Categories entry without child routes.");
assert.ok(categoriesPage.includes('id="categoryTree"') && categoriesPage.includes('id="productSortList"') && categoriesPage.includes('id="categoryDialog"') && categoriesPage.includes('id="quickProductDialog"'), "Category, product sorting and editing controls must be consolidated on the single Categories page.");
assert.ok(categoriesUi.includes("admin_reorder_categories") && categoriesUi.includes("admin_reorder_products") && categoriesUi.includes("admin_reorder_home_products"), "Categories workspace must use atomic server-side order operations.");
assert.ok(categoriesUi.includes("data-cat-add-child") && categoriesUi.includes("validateCategoryMove") && categoriesUi.includes("undoLastOrder"), "Category hierarchy, safe parent moves and one-step sorting undo must be present.");
assert.ok(categoriesUi.includes("quickProductForm") && categoriesUi.includes("quickProductCategory"), "Product sorting workspace must include quick product editing and category moves.");
assert.ok(categoriesLive.includes("effectiveCategoryActive") && categoriesLive.includes("home_sort_order") && categoriesLive.includes("live-category-children"), "The public storefront must render the active hierarchy and independent homepage position.");
assert.ok(categoriesMigration.includes("parent_id") && categoriesMigration.includes("admin_reorder_home_products") && categoriesMigration.includes("validate_category_hierarchy"), "Catalog migration must include the hierarchy constraint and reorder RPCs.");
const couponsPage = read("admin/coupons.html");
const couponsApp = read("admin/coupons.js");
const couponsMigration = read("supabase/migrations/20261031140000_add_coupon_management_system.sql");
assert.ok(couponsPage.includes('id="couponForm"') && couponsPage.includes('id="couponTableBody"'), "Coupon Management must include the Add Coupon form and Coupon List.");
assert.ok(couponsApp.includes('client.rpc("admin_save_coupon"') && couponsApp.includes('client.rpc("admin_set_coupon_status"'), "Coupon creation and status changes must use protected server RPCs.");
assert.ok(couponsApp.includes('coupon_redemptions') && couponsApp.includes('coupon_categories') && couponsApp.includes('coupon_products'), "Coupon management must read actual usage and product/category targeting records.");
assert.ok(couponsApp.includes('["reserved", "redeemed"].includes(r.status)'), "Coupon Promotions must count valid reserved and redeemed uses.");
const couponUsagePage = read("admin/coupon-usage.html");
const couponUsageApp = read("admin/coupon-usage.js");
assert.ok(couponUsagePage.includes('data-page="coupon-usage"') && couponUsagePage.includes('coupon-usage.js?v='), "Coupon Usage must be a cache-busted unified admin route.");
assert.ok(couponUsageApp.includes('client.from("coupon_redemptions")') && couponUsageApp.includes('client.from("orders")'), "Coupon Usage must read the order and redemption ledger from Supabase.");
assert.ok(couponUsageApp.includes('order_id') && couponUsageApp.includes('coupon_discount_amount'), "Coupon Usage must reconcile order IDs and report order-level discounts.");
assert.ok(couponUsageApp.includes('["pending","processing","shipped"]') && couponUsageApp.includes('status) === "delivered"'), "Coupon Usage must split pending lifecycle orders from delivered orders.");
assert.ok(couponUsageApp.includes("downloadFile(\"halal-food-coupon-usage.csv\""), "Coupon Usage must provide a filtered CSV export.");
assert.ok(read("admin/shared.js").includes('["coupons","coupons","Coupons"') && read("admin/shared.js").includes('"coupon-usage","analytics","Coupon Usage"'), "Coupon navigation must contain Promotions and Usage child sections.");
assert.ok(couponsMigration.includes("private.evaluate_coupon") && couponsMigration.includes("FOR UPDATE"), "Coupon use limits must be validated under an atomic coupon lock.");
assert.ok(couponsMigration.includes("coupon_discount_amount") && couponsMigration.includes("coupon_snapshot"), "Orders must preserve coupon discount and immutable campaign snapshots.");
assert.ok(couponsMigration.includes("sync_coupon_redemption_after_order_status"), "Coupon reservation must follow order cancellation/delivery lifecycle.");
assert.ok(couponsMigration.includes("aal2") && couponsMigration.includes("halalfoodbd.official@gmail.com"), "Coupon administration must remain limited to the MFA-protected admin account.");


for (const page of ["supplier-add.html","supplier-purchases.html","supplier-payments.html"]) {
  assert.ok(unifiedPages.includes(page), "Supplier Management route is missing: " + page);
}
const supplierAddPage=read("admin/supplier-add.html");
const supplierPurchasesPage=read("admin/supplier-purchases.html");
const supplierPaymentsPage=read("admin/supplier-payments.html");
const supplierUi=read("admin/supplier-management.js");
const supplierMigration=read("supabase/migrations/20261031160318_supplier_procurement_payables_v1.sql");
const supplierNav=read("admin/shared.js");
const supplierApp=read("admin/app.js");
assert.ok(supplierAddPage.includes('data-page="supplier-add"') && supplierAddPage.includes('supplier-management.js?v='), "Add Supplier must be a cache-busted unified admin page.");
assert.ok(supplierPurchasesPage.includes('data-page="supplier-purchases"') && supplierPurchasesPage.includes('id="purchaseForm"') && supplierPurchasesPage.includes('id="grnForm"'), "Purchase List must include the multi-item purchase and GRN workflows.");
assert.ok(supplierPurchasesPage.includes('id="billForm"') && supplierPurchasesPage.includes('id="creditNoteForm"'), "Purchase List must include supplier bill and credit note workflows.");
assert.ok(supplierPaymentsPage.includes('data-page="supplier-payments"') && supplierPaymentsPage.includes('id="supplierPaymentForm"') && supplierPaymentsPage.includes('id="supplierLedgerTableBody"'), "Payment History must include payment entry and supplier ledger.");
assert.ok(supplierNav.includes('["suppliers","layers","Suppliers"') && supplierNav.includes('"supplier-add","plus","Add Supplier"') && supplierNav.includes('"supplier-purchases","orders","Purchase List"') && supplierNav.includes('"supplier-payments","finance","Payment History"'), "Admin sidebar must expose all three Supplier child routes.");
assert.ok(supplierApp.includes('HFSupplierInit("add")') && supplierApp.includes('HFSupplierInit("purchases")') && supplierApp.includes('HFSupplierInit("payments")'), "Admin app must register all Supplier workspace routes.");
assert.ok(supplierUi.includes('rpc("create_supplier_with_opening_balance"') && supplierUi.includes('rpc("create_supplier_purchase_order"') && supplierUi.includes('rpc("record_supplier_purchase_receipt"') && supplierUi.includes('rpc("create_supplier_bill"') && supplierUi.includes('rpc("record_supplier_payment"'), "Supplier writes must use the protected server-side database RPCs.");
assert.ok(supplierUi.includes('admin_supplier_credit_notes') && supplierUi.includes('admin_supplier_ledger') && supplierUi.includes('admin_supplier_balances'), "Supplier pages must read supplier credits, ledger and balances.");
assert.ok(supplierUi.includes('product_id:l.product_id==="__manual__"||!l.product_id?null:l.product_id'), "Purchase orders must support non-catalogue items without adding them to the store catalogue.");
assert.ok(supplierMigration.includes("aal2") && supplierMigration.includes("admin_supplier_payment_allocations") && supplierMigration.includes("record_supplier_purchase_receipt"), "Supplier migration must preserve admin MFA, payment allocations and the GRN workflow.");
assert.ok(!read("admin/operations.html").includes('id="suppliersSection"') && read("admin/operations.html").includes("./supplier-add.html"), "Supplier and Purchase management must be routed through the dedicated workspace rather than duplicate Operations forms.");

for (const file of unifiedPages) {
  const source = read(join("admin", file));
  const expectedI18nVersion = i18nVersion;
  assert.ok(source.includes(`i18n.js?v=${expectedI18nVersion}`), `${file}: missing or stale shared language dictionary.`);
  assert.ok(source.includes(`shared.css?v=${sharedCssVersion}`), `${file}: stale shared UI cache version.`);
  const expectedSharedJsVersion = file === "ai-conversations.html" ? "20261104-aiconversations-v1" : (file === "wordpress-live.html" || file === "website-builder.html") ? "20261105-wordpress-sidebar-submenu-v1" : (file === "overview.html" || file === "wordpress.html") ? "20261105-wordpress-cache-route-v2" : sharedJsVersion;
  assert.ok(source.includes(`shared.js?v=${expectedSharedJsVersion}`), `${file}: missing or stale multi-theme shared JS version.`);
  assert.ok(source.includes(`workspace-global-theme.css?v=${workspaceThemeCssVersion}`), `${file}: missing or stale shared workspace theme stylesheet.`);

  if (source.includes("./app.js")) {
    assert.ok(source.includes("app.js?v="), `${file}: missing app.js cache-busting version.`);
  }

  const mainTag = (source.match(/<main\b[^>]*\bid=["']pageContent["'][^>]*>/i) || [])[0];
  assert.ok(mainTag, `${file}: missing main#pageContent landmark.`);
  assert.ok(/\btabindex=["']-1["']/.test(mainTag), `${file}: main content must be programmatically focusable for the skip link.`);
  assert.equal((source.match(/<main\b/gi) || []).length, 1, `${file}: expected one main landmark in the source page.`);

  const tableTags = [...source.matchAll(/<table\b([^>]*)>/gi)];
  const tableWrappers = [...source.matchAll(/class="[^"]*\bhf-table-wrap\b[^"]*"/gi)];
  for (const table of tableTags) {
    const tableClass = (table[1].match(/\bclass="([^"]+)"/i) || [])[1] || "";
    assert.ok(tableClass.split(/\s+/).includes("hf-table"), "Every admin data table must use the shared hf-table base class.");
  }
  assert.ok(tableWrappers.length >= tableTags.length, "Every admin data table must have a shared responsive hf-table-wrap container.");

  const ids = [...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  assert.equal(duplicates.size, 0, `${file}: duplicate static IDs: ${[...duplicates].join(", ")}`);

  for (const match of source.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)(?:\?[^"']*)?["']/g)) {
    const asset = match[1];
    if (/\.(?:js|css)$/i.test(asset)) {
      assert.ok(existsSync(join(adminDir, asset)), `${file}: local asset not found: ${asset}`);
    }
  }
}

// Parse every first-party admin JavaScript file without executing browser-side code.
for (const file of readdirSync(adminDir).filter((name) => name.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", join(adminDir, file)], { cwd: root, stdio: "pipe" });
}

// The shared admin shell now uses an account-scoped, registry-driven color theme picker.
const shared = read("admin/shared.js");
const reportNavTypes=["business","sales","product-sales","top-products","customer-wise-products","customer-products","purchase","product-purchase","top-customers","customers","receivable","payable","low-stock","alert-products","stock","stock-list","account-payments","collections","expenses","transactions","daily"];
assert.ok(shared.includes('["reports","reports","Reports"') && shared.includes('label:"Business & Sales"') && shared.includes('label:"Daily Reports"'), "Reports navigation must be grouped by the seven report categories.");
for(const type of reportNavTypes)assert.ok(shared.includes('["'+type+'"'), "Reports navigation is missing report type: "+type);
assert.ok(shared.includes("data-report-nav-type") && shared.includes("data-nav-report-group") && shared.includes("admin-nav-report-copy"), "Each report must have its own navigable, searchable sidebar link.");
assert.ok(performanceApp.includes('const reportGroup=page.startsWith("reports-")') && performanceApp.includes('new URLSearchParams(window.location.search).get("report")') && !performanceApp.includes('pageName.startsWith("reports-")'), "Report workspaces must safely initialize from the page dataset and selected report query.");
const reportsLanding=read("admin/reports.html");
assert.equal(new Set([...reportsLanding.matchAll(/data-report-type="([^"]+)"/g)].map(match=>match[1])).size,21,"Reports landing page must expose all 21 report types.");
assert.ok(performanceApp.includes('id="reportWorkspaceOverview"') && performanceApp.includes('id="reportWorkspaceAnalysis"') && performanceApp.includes('id="reportWorkspaceRecords"'), "Each individual report must expose independent Overview, Analysis and Records segments.");
assert.ok(performanceApp.includes("function kpisFor(type,rows,source)") && performanceApp.includes("function analysisFor(type,rows,source)") && performanceApp.includes("function renderRecordTable()"), "Individual reports must compute their own KPIs, breakdowns and detailed record lists.");
for(const type of reportNavTypes){const token=(type.includes("-")?'\"'+type+'\"':type)+":[";assert.ok(performanceApp.includes(token), "Individual report workspace definition is missing: "+type);}
assert.ok(performanceApp.includes("account_id,payment_method,party_name,financial_class") && performanceApp.includes("related_cod_settlement_id"), "Finance reports must fetch account, payment, party, financial class and linked settlement fields.");
assert.ok(performanceApp.includes("confirmed_expenses") && performanceApp.includes("cod_collected") && performanceApp.includes("cod_remitted"), "Daily Business Report must segment orders, confirmed expenses, COD collection and remittance by date.");
assert.ok(performanceApp.includes("source.transfers=transfers") && performanceApp.includes("source.budgets=budgets") && performanceApp.includes("financial_class"), "Account Payments, Expenses and Transactions must expose their dedicated supporting segments.");
assert.ok(shared.includes(`ADMIN_COLOR_THEMES["glass-studio"]`) && shared.includes(`name:"Glass Studio"`) && shared.includes(`profile:"Frosted · Airy · Refined"`), "Glass Studio must remain registered and Glyph Signal must be the thirteenth Signature theme.");
assert.ok(shared.includes('document.documentElement.dataset.hfTheme="warm-harvest";'), "Warm Harvest must remain the default theme.");
assert.ok(shared.includes("const ADMIN_COLOR_THEMES={") && shared.includes('"warm-harvest":') && shared.includes('"ocean-calm":') && shared.includes('"royal-indigo":') && shared.includes('"forest-sage":') && shared.includes('"berry-rose":') && shared.includes('"coastal-blue":') && shared.includes('id":"plum-amethyst"') && shared.includes('id":"copper-espresso"') && shared.includes('id":"olive-citrus"') && shared.includes('id":"coral-peach"') && shared.includes('ADMIN_COLOR_THEMES["merchant-fieldbook"]') && shared.includes('name:"The Merchant\'s Fieldbook"'), "The registry must contain all thirteen approved themes.");
assert.ok(shared.includes('profile":"Creative · Refined · Expressive"') && shared.includes('profile":"Warm · Refined · Business"') && shared.includes('profile":"Natural · Classic · Composed"') && shared.includes('profile":"Warm · Friendly · Expressive"'), "The four replacement themes need their approved business profiles.");
assert.ok(shared.includes("const ADMIN_THEME_GROUPS=[") && shared.includes('label:"Modern"') && shared.includes('label:"Balanced"') && shared.includes('label:"Classic Comfort"') && shared.includes('label:"Signature"') && shared.includes('themeIds:["merchant-fieldbook","glass-studio","glyph-signal"]'), "All four theme groups must remain, with three themes in Signature.");
const themeGroupMatches=[...shared.matchAll(/themeIds:\[([^\]]*)\]/g)];
const themeGroupCount=themeGroupMatches.reduce((total,match)=>total+(match[1].match(/"[^"]+"/g)||[]).length,0);
assert.equal(themeGroupCount,17,"The picker must expose all seventeen approved themes, including the two Celestial themes.");
assert.ok(shared.includes("All themes are available to every administrator") && !shared.includes("of 11 themes available"), "Theme count must be registry-driven and not hard-coded.");
assert.ok(shared.includes('aria-label="Select ') && shared.includes(' theme" aria-pressed="') && shared.includes('aria-pressed='), "Theme choices must expose accessible names and selected states.");
assert.ok(shared.includes("function makeExtendedAdminTheme") && shared.includes("EXTENDED_ADMIN_THEME_CONFIGS.forEach"), "The four added themes must be generated through the shared dynamic theme engine.");
assert.ok(shared.includes("hfThemePickerToggle") && shared.includes("hfThemeGrid") && shared.includes("renderThemePicker"), "The shared header must expose the accessible theme picker.");
assert.ok(shared.includes('hf_admin_color_theme:') && shared.includes("themeStorageKey()"), "Theme choice must persist per authenticated administrator.");
assert.ok(shared.includes('applyColorTheme(savedColorTheme,true)') && shared.includes('if(!ADMIN_COLOR_THEMES[savedColorTheme])savedColorTheme="warm-harvest";'), "The saved valid theme must load, while removed theme preferences reset to Warm Harvest.");
assert.ok(!shared.includes('id="themeToggle"') && !shared.includes('const themeBtn=document.getElementById("themeToggle")'), "The old standalone dark/light toggle must be replaced by the color theme picker.");

const glyphCss = read("admin/glyph-signal.css");
assert.ok(shared.includes('ADMIN_COLOR_THEMES["glyph-signal"]') && shared.includes('name:"Glyph Signal"') && shared.includes('profile:"Iconic · Minimal · Visual"'), "Glyph Signal must be registered as the thirteenth Signature theme.");
assert.ok(shared.includes("function syncGlyphSignalMode") && shared.includes("glyphSignalIconForLabel") && shared.includes("glyph-signal-control"), "Glyph Signal must provide accessible icon controls without changing action handlers.");
assert.ok(shared.includes("অর্ডারসমূহ") && shared.includes("গ্রাহক") && shared.includes("ক্যাটাগরি"), "Glyph Signal must map Bengali labels to their matching action icons.");
assert.ok(glyphCss.includes('html[data-hf-theme="glyph-signal"]') && glyphCss.includes("prefers-reduced-motion") && glyphCss.includes("focus-visible"), "Glyph Signal styles must be scoped and include keyboard focus and reduced-motion support.");
const glyphCssRules = glyphCss.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("@") && !line.startsWith("}") && !line.startsWith("/*") && !line.startsWith("*/"));
assert.ok(glyphCssRules.every(line => line.startsWith('html[data-hf-theme="glyph-signal"]')), "Every Glyph Signal CSS selector must be scoped to its theme.");


const app = read("admin/app.js");
assert.ok(app.includes('order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url,shipping_weight_kg)'), "Courier booking must load relational order_items.");
assert.ok(app.includes("normalizeCourierMobile(freshOrder.customer_phone)"), "Courier booking must match backend phone validation.");
assert.ok(app.includes("freshCustomerName.length<3||freshCustomerName.length>100"), "Courier booking must validate provider-compatible customer names.");
assert.ok(app.includes('providerAddressLimit=provider==="pathao"?220:250'), "Courier booking must use provider-specific address limits.");
const financeAppContract = app.slice(app.indexOf("async function initFinance"), app.indexOf("async function initReports", app.indexOf("async function initFinance")));
assert.ok(financeAppContract.includes('linkedOrder.status==="cancelled"'), "Confirmed manual income must reject cancelled orders.");
assert.ok(financeAppContract.includes('payload.status==="reconciled"') && financeAppContract.includes("remitted_amount") && financeAppContract.includes("remitted_account_id"), "COD reconciliation must require a verified remittance amount and destination account.");

const helperMatch = app.match(/function normalizeCourierMobile\(value\)\s*\{[\s\S]*?\n\}/);
assert.ok(helperMatch, "Could not find normalizeCourierMobile for behavior tests.");
const normalizeCourierMobile = vm.runInNewContext(`(${helperMatch[0]})`);
for (const [input, expected] of [
  ["01842031164", "01842031164"],
  ["+880 184-203-1164", "01842031164"],
  ["00880 184 203 1164", "01842031164"],
  ["8801842031164", "01842031164"],
  ["12345678", ""],
  ["1842031164", ""],
  ["0171234567", ""],
  ["+1 202 555 0100", ""],
]) {
  assert.equal(normalizeCourierMobile(input), expected, `Courier phone normalization failed for input: ${input}`);
}

// The courier edge function has the matching 11-digit Bangladesh mobile rule.
const courier = read("supabase/functions/courier-integration/index.ts");
assert.ok(courier.includes('digits.length !== 11 || !digits.startsWith("01")'), "Frontend and courier function phone rules must stay aligned.");
assert.ok(courier.includes('provider === "pathao" ? 220 : 250'), "Frontend address limits must align with courier provider limits.");


// Order workspace, bulk actions, verified customer identity links and status safety.
const ordersPage = read("admin/orders.html");
const ordersCss = read("admin/orders.css");
const ordersApp = read("admin/app.js");
const accountPage = read("account.html");
const customerIdentityMigration = read("supabase/migrations/20261030150000_link_verified_auth_users_to_unique_customer_records.sql");

for (const id of [
  "ordersPackagingBtn",
  "ordersInvoiceBtn",
  "toggleBulkOrdersBtn",
  "ordersBulkBar",
  "ordersSelectAll",
  "ordersSelectedCount",
  "ordersBulkExportBtn",
  "ordersBulkDeleteBtn",
  "ordersBulkStatusBtn",
  "ordersBulkCourierBtn",
  "ordersBulkAssignBtn",
  "ordersBulkClearBtn",
  "ordersDataBody",
]) {
  assert.ok(ordersPage.includes(`id="${id}"`), `Orders workspace is missing #${id}.`);
}
assert.ok(ordersPage.includes("orders.css?v=20261030-bulk-manager-v1"), "Orders workspace bulk-manager stylesheet must be cache-busted.");
assert.ok(ordersPage.includes("app.js?v=20261102-dashboard-speed-v2"), "Orders workspace must load the current application script with coupon discount details.");
assert.ok(ordersPage.includes("bulkStatusDialog") && ordersPage.includes("bulkAssignDialog") && ordersPage.includes("bulkCourierDialog"), "All bulk workflow dialogs must be present.");
for (const status of ["pending", "processing", "shipped", "delivered", "cancelled"]) {
  assert.ok(ordersCss.includes(`.hf-order-card[data-status="${status}"]`), `Order cards need a distinct ${status} color.`);
}
assert.ok(ordersApp.includes("function orderCustomerAvatar(order)"), "Orders need a customer avatar/initial renderer.");
assert.ok(ordersApp.includes('client.from("customers").select("id,auth_user_id")'), "Admin must load the customer-to-auth identity mapping.");
assert.ok(ordersApp.includes("profilesByUserId.get(customer.auth_user_id)"), "Avatar lookup must map customers.id through auth_user_id to customer_profiles.user_id.");
assert.ok(ordersApp.includes("function updateBulkSelectionUi(rows)"), "Bulk selection count and controls need a single UI updater.");
assert.ok(ordersApp.includes("function printSelectedOrders(kind)"), "Selected orders need packaging/invoice print support.");
assert.ok(ordersApp.includes("function exportSelectedOrders()"), "Selected orders need CSV export support.");
assert.ok(ordersApp.includes("function orderPackedWeightKg(order)"), "Courier weight must be calculated from saved product-unit weights and order quantities.");
assert.ok(ordersApp.includes('client.from("order_items").select("id,order_id,shipping_weight_kg")'), "Order page must load immutable order-item weight snapshots.");
assert.ok(ordersApp.includes("function inferShippingWeightFromUnit(value)"), "Product editor must prefill gram/kg shipping weights from an explicit unit label.");
assert.ok(ordersApp.includes("function sendSelectedOrdersToCourier"), "Bulk courier send action must be implemented.");
assert.ok(ordersApp.includes("for(let index=0;index<prepared.length;index++)"), "Bulk courier calls must be sequential, not parallel.");
assert.ok(ordersApp.includes('body:{action:"book",provider,shipment_id:shipmentId}'), "Bulk courier action must call the existing protected courier Edge Function.");
assert.ok(ordersApp.includes("async function deleteSelectedOrders"), "Bulk delete must use the protected database RPC.");
assert.ok(ordersApp.includes('client.rpc("admin_bulk_delete_orders"'), "Bulk delete must use the restricted server RPC.");
assert.ok(ordersApp.includes("function openBulkAssignDialog"), "Bulk assignment action must be implemented.");
assert.ok(ordersApp.includes("assigned_to_team_member_id:memberId"), "Bulk assignment must persist the team member on each order.");
assert.ok(ordersApp.includes("function openBulkStatusDialog"), "Bulk status update action must be implemented.");
assert.ok(ordersApp.includes("function orderPackedWeightKg(order)"), "Order parcel weights must have a tested calculation helper.");
assert.ok(ordersCss.includes(".hf-bulk-packaging") && ordersCss.includes(".hf-bulk-courier") && ordersCss.includes(".hf-bulk-assign"), "Distinct colors must exist for the seven bulk actions.");
assert.ok(ordersApp.includes('client.rpc("admin_update_order_status"'), "Status updates must continue to use the audited server RPC.");
assert.ok(ordersApp.includes('courierBookingLocked(shipment)'), "Order status changes must preserve courier booking safety checks.");
assert.ok(ordersApp.includes('["picked_up","in_transit","delivered"]'), "Shipped status must require a verified courier shipment state.");
assert.equal((ordersApp.match(/\$\("ordersDataBody"\)\?\.addEventListener\("change"/g) || []).length, 2, "Orders must have exactly one selection handler and one status handler.");
assert.ok(accountPage.includes('client.rpc("sync_my_customer_identity")'), "Signed-in accounts must request safe customer identity mapping.");
assert.ok(accountPage.includes("await syncCustomerAvatar(user)"), "Signed-in accounts must sync their optional provider avatar.");
assert.ok(customerIdentityMigration.includes("email_confirmed_at IS NOT NULL"), "Customer identity backfill must require a verified Auth email.");
assert.ok(customerIdentityMigration.includes("HAVING count(*) = 1"), "Customer identity backfill must refuse ambiguous email matches.");
assert.ok(customerIdentityMigration.includes("customers_auth_user_id_unique_idx"), "Customer identity mapping must be unique per Auth user.");
const productsPage = read("admin/products.html");
const productsCss = read("admin/products.css");
const shippingWeightMigration = read("supabase/migrations/20261030160000_add_shipping_weight_bulk_order_workflows.sql");
const financeDeleteMigration = read("supabase/migrations/20261030161000_protect_financially_referenced_bulk_deletions.sql");
assert.ok(productsPage.includes('products.css?v=20261031-products-workspace-v1'), "Product workspace stylesheet must be cache-busted.");
assert.ok(productsPage.includes('app.js?v=20261102-dashboard-speed-v2'), "Product workspace must load the current application script with SKU support.");
assert.ok(productsPage.includes('id="productShippingWeight"'), "Product editor needs a numeric shipping weight field.");
assert.ok(productsPage.includes("<th>Ship weight</th>"), "Product table must expose the shipping weight column.");
assert.ok(ordersApp.includes("shipping_weight_kg:shippingWeight"), "Product saves must persist shipping_weight_kg.");
assert.ok(ordersApp.includes("function inferShippingWeightFromUnit(value)"), "Product form needs explicit kg/gram unit auto-detection.");
assert.ok(ordersApp.includes("function orderPackedWeightKg(order)"), "Parcel weight must sum order-line weight × quantity.");
assert.ok(ordersApp.includes("shipping_weight_kg:weightsByItemId.get(item.id)"), "Orders must hydrate the saved order-line weight snapshot.");
assert.ok(ordersApp.includes("function sendSelectedOrdersToCourier"), "Selected orders must support a bulk courier booking flow.");
assert.ok(ordersApp.includes("for(let index=0;index<prepared.length;index++)"), "Courier bulk booking must be sequential.");
assert.ok(ordersApp.includes('body:{action:"book",provider,shipment_id:shipmentId}'), "Courier bulk booking must reuse the current protected Edge Function.");
assert.ok(ordersApp.includes('body:{action:"areas",provider:"redx",district_name:district}'), "REDX bulk booking must validate destination areas.");
assert.ok(ordersApp.includes("function deleteSelectedOrders"), "Selected orders need a bulk delete action.");
assert.ok(ordersApp.includes('client.rpc("admin_bulk_delete_orders"'), "Bulk delete must use the restricted MFA-protected RPC.");
assert.ok(ordersApp.includes("function openBulkStatusDialog"), "Selected orders need a bulk status action.");
assert.ok(ordersApp.includes("function openBulkAssignDialog"), "Selected orders need a bulk staff assignment action.");
assert.ok(ordersApp.includes("assigned_to_team_member_id:memberId"), "Bulk staff assignment must be persisted on orders.");
assert.ok(!ordersPage.includes('id="bulkAssignMember" class="hf-select" required'), "The Unassigned/Clear option must remain selectable.");
assert.ok(ordersPage.includes('<option value="pending">Pending · only if no live courier parcel</option>'), "Bulk status should allow a safe return to Pending after a failed/unbooked attempt.");
assert.ok(ordersApp.includes('next==="pending"&&!(order.status==="processing"&&!courierBookingLocked(shipment))'), "Bulk status must block Pending when a live/uncertain parcel exists.");
assert.ok(ordersApp.includes("estimate.weight.toFixed(3)"), "Bulk parcel weights must retain the 0.001 kg database precision.");
assert.ok(shippingWeightMigration.includes("v_product.shipping_weight_kg"), "Checkout migration must snapshot the product shipping weight.");
assert.ok(shippingWeightMigration.includes("assigned_to_team_member_id"), "Bulk assignment schema must be represented in migrations.");
assert.ok(financeDeleteMigration.includes("admin_finance_entries"), "Bulk delete migration must protect financial ledger references.");

const weightHelperMatch = ordersApp.match(/function inferShippingWeightFromUnit\(value\)\s*\{[\s\S]*?\n  \}/);
assert.ok(weightHelperMatch, "Shipping weight unit conversion helper is missing.");
const inferShippingWeightFromUnit = vm.runInNewContext('(' + weightHelperMatch[0] + ')');
assert.equal(inferShippingWeightFromUnit("kg"), "1.000", "The kg product unit should prefill one kilogram.");
assert.equal(inferShippingWeightFromUnit("500g"), "0.500", "The 500g product unit should prefill half a kilogram.");
assert.equal(inferShippingWeightFromUnit("1kg"), "1.000", "The 1kg product unit should prefill one kilogram.");
assert.equal(inferShippingWeightFromUnit("500ml"), "", "Volume must not be silently converted into mass.");

assert.ok(customerIdentityMigration.includes("sync_my_customer_identity"), "Customer identity migration must include the safe login sync function.");

const posWorkspace = read("admin/pos.html");
const couponUsageWorkspace = read("admin/coupon-usage.html");
const couponsWorkspace = read("admin/coupons.html");
assert.ok(posWorkspace.includes('class="hf-table-wrap pos-cart-table-wrap"') && posWorkspace.includes('class="hf-table-wrap pos-history-scroll"'), "POS cart and history tables must use the shared responsive table wrapper.");
assert.ok(couponUsageWorkspace.includes('class="hf-table-wrap cu-table-wrap"'), "Coupon Usage must use the shared responsive table wrapper.");
assert.ok((couponsWorkspace.match(/class="hf-table-wrap cp-table-wrap/g)||[]).length>=2, "Coupon list and redemption tables must use the shared responsive table wrapper.");
assert.ok(posWorkspace.includes('aria-label="Current POS cart items"') && posWorkspace.includes('class="hf-table-wrap pos-history-scroll" tabindex="0"'), "POS scrollable tables must have keyboard focus and accessible region labels.");
assert.ok(couponsWorkspace.includes('aria-label="Coupon redemption history"'), "Coupon redemption history must have an accessible scrollable region label.");
const marketingWorkspace = read("admin/marketing-center.html");
const trackingWorkspace = read("admin/tracking.html");
assert.ok(marketingWorkspace.includes('class="hf-table-wrap hf-marketing-table-wrap"') && marketingWorkspace.includes('class="hf-table hf-marketing-table"'), "Marketing Center tables must use the shared table wrapper and table base classes.");
assert.ok(trackingWorkspace.includes('class="hf-table-wrap hf-tracking-table-wrap"') && trackingWorkspace.includes('class="hf-table hf-tracking-table"'), "Tracking Controls must use the shared table wrapper and table base classes.");
const overview = read("admin/overview.html");
const overviewApp = read("admin/app.js");
const overviewCss = read("admin/overview.css");
const fieldbookCss = read("admin/merchant-fieldbook.css").replace(/\/\*[\s\S]*?\*\//g, "");
assert.ok(shared.includes("function syncThemeStyles(themeId)") && shared.includes("glass-studio.css?v=20261102-glass-studio-v1") && shared.includes("syncThemeStyles(theme.id)") && shared.includes("link.remove()"), "Fieldbook and Glass theme stylesheets must load only for the active theme.");
assert.ok(overview.includes("THE MERCHANT'S FIELDBOOK") && overview.includes("Today's Market") && overview.includes("A living market desk for the work that matters."), "Overview must use the Fieldbook editorial heading and description.");
for (const id of ["kpiOrders","kpiTodayItems","kpiPending","kpiCart","kpiOrderValue","kpiLowStock","overviewFinanceStrip","overviewActionList","overviewRangeSelect","overviewTrendType","overviewTopProducts"]) assert.ok(overview.includes(`id="${id}"`), "Fieldbook Overview must preserve live data/control hook #" + id + ".");
assert.ok(fieldbookCss.includes('html[data-hf-theme="merchant-fieldbook"]') && fieldbookCss.includes('body[data-page="overview"]') && fieldbookCss.includes("prefers-reduced-motion"), "Fieldbook styles must be uniquely scoped and include Overview and reduced-motion support.");
const splitFieldbookSelectorList = (source) => {
  const selectors = []; let depth = 0, start = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "(" || source[index] === "[") depth += 1;
    else if (source[index] === ")" || source[index] === "]") depth -= 1;
    else if (source[index] === "," && depth === 0) { selectors.push(source.slice(start, index).trim()); start = index + 1; }
  }
  selectors.push(source.slice(start).trim());
  return selectors;
};
const fieldbookSelectors = [];
let fieldbookSelectorStart = 0;
for (let index = 0; index < fieldbookCss.length; index += 1) {
  if (fieldbookCss[index] === "{") {
    const selectorText = fieldbookCss.slice(fieldbookSelectorStart, index).trim();
    if (selectorText && !selectorText.startsWith("@")) fieldbookSelectors.push(...splitFieldbookSelectorList(selectorText));
    fieldbookSelectorStart = index + 1;
  } else if (fieldbookCss[index] === "}") fieldbookSelectorStart = index + 1;
}
assert.ok(fieldbookSelectors.length > 100, "Fieldbook stylesheet should contain a complete responsive workspace style set.");
for (const selector of fieldbookSelectors) {
  assert.ok(selector.startsWith('html[data-hf-theme="merchant-fieldbook"]'), "Every Fieldbook CSS selector must be isolated: " + selector);
}

const glassCss = read("admin/glass-studio.css").replace(/\/\*[\s\S]*?\*\//g, "");
assert.ok(glassCss.includes('html[data-hf-theme="glass-studio"]') && glassCss.includes("@supports (backdrop-filter:blur(1px))") && glassCss.includes("prefers-reduced-motion"), "Glass stylesheet must be isolated and include browser fallback and reduced-motion support.");
const glassSelectors = [];
let glassSelectorStart = 0;
for (let index = 0; index < glassCss.length; index += 1) {
  if (glassCss[index] === "{") {
    const selectorText = glassCss.slice(glassSelectorStart, index).trim();
    if (selectorText && !selectorText.startsWith("@")) glassSelectors.push(...splitFieldbookSelectorList(selectorText));
    glassSelectorStart = index + 1;
  } else if (glassCss[index] === "}") glassSelectorStart = index + 1;
}
assert.ok(glassSelectors.length > 50, "Glass Studio must include a broad admin workspace stylesheet.");
for (const selector of glassSelectors) assert.ok(selector.startsWith('html[data-hf-theme="glass-studio"]'), "Glass CSS rule leaks into another theme: " + selector);
assert.ok(read("admin/i18n.js").includes('"Glass Studio": "গ্লাস স্টুডিও"') && read("admin/i18n.js").includes('"Frosted · Airy · Refined": "ফ্রস্টেড · হালকা · পরিশীলিত"'), "Glass theme labels and profile must be translated.");

const fieldbookTranslations = read("admin/i18n.js");
const retiredThemeId=["the","observatory"].join("-");
assert.ok(!shared.includes(retiredThemeId) && !overview.includes(retiredThemeId) && !overviewCss.includes(retiredThemeId) && !fieldbookTranslations.includes("The "+"Observatory"), "The retired theme must be absent from all active theme surfaces.");
assert.ok(!existsSync(join(root,"admin",retiredThemeId+".css")), "The retired theme stylesheet must be deleted.");
assert.ok(shared.includes('if(!ADMIN_COLOR_THEMES[savedColorTheme])savedColorTheme="warm-harvest";') && shared.includes("applyColorTheme(savedColorTheme,true)"), "A previously saved removed-theme preference must safely fall back to Warm Harvest.");
const sharedLayoutCss = read("admin/shared.css");
const desktopSidebarStart = sharedLayoutCss.indexOf(".admin-sidebar{");
const desktopSidebarRule = sharedLayoutCss.slice(desktopSidebarStart,sharedLayoutCss.indexOf("}",desktopSidebarStart));
assert.ok(desktopSidebarRule.includes("position:sticky") && desktopSidebarRule.includes("overflow:auto"), "Desktop Sidebar must remain sticky and independently scrollable.");
const mobileSidebarMedia = sharedLayoutCss.indexOf("@media(max-width:900px)");
const mobileSidebarStart = sharedLayoutCss.indexOf(".admin-sidebar{",mobileSidebarMedia);
const mobileSidebarRule = sharedLayoutCss.slice(mobileSidebarStart,sharedLayoutCss.indexOf("}",mobileSidebarStart));
assert.ok(mobileSidebarRule.includes("position:fixed") && mobileSidebarRule.includes("transform:translateX(-102%)"), "Mobile Sidebar must remain a fixed off-canvas drawer.");
assert.ok(fieldbookTranslations.includes('"Today\'s Market": "আজকের বাজার"') && fieldbookTranslations.includes('"THE MERCHANT\'S FIELDBOOK": "মার্চেন্টস ফিল্ডবুক"'), "Fieldbook Overview headings must have Bengali translations.");
assert.ok(overview.includes('id="overviewRangeSelect"') && overview.includes('id="overviewCustomRange"') && overview.includes('id="overviewApplyRange"'), "Overview must provide a selectable date range and custom date controls.");
assert.ok(overview.includes('id="overviewTrendType"') && overviewApp.includes("renderOverviewOperationsTrend") && overviewApp.includes('trendTypeSelect?.addEventListener("change",renderOverviewOperationsTrend)'), "Overview trend must support in-place Area, Line and Bar chart selection without refetching data.");
assert.ok(overviewCss.includes(".hf-overview-chart-controls"), "Overview chart type selector must use responsive chart controls.");
const analyticsRangePage=read("admin/analytics.html");
const reportsRangePage=read("admin/reports.html");
assert.ok(analyticsRangePage.includes('<option value="today">Today</option>') && analyticsRangePage.includes('<option value="last-year">Last year</option>'), "Analytics must expose consistent calendar date presets.");
assert.ok(reportsRangePage.includes('<option value="this-month">This month</option>') && reportsRangePage.includes('id="customRangeFields"'), "Reports must expose the same date presets and hide custom dates until selected.");
assert.ok(app.includes('timeZone:"Asia/Dhaka"') && app.includes("buildDhakaRange") && app.includes("const trendCountsByEvent=new Map()"), "Analytics and reports must use Bangladesh-local date boundaries and grouped trend aggregation.");
assert.ok(app.includes("Trend grouped by month.") && !app.includes("Daily trend shows the last 90 days"), "Analytics trend labels must match the selected reporting period.");
assert.ok(read("admin/i18n.js").includes('"Chart type": "চার্টের ধরন"') && read("admin/i18n.js").includes('"Line": "লাইন"') && read("admin/i18n.js").includes('"Bar": "বার"'), "Overview chart types must have Bengali translations.");
assert.ok(overviewApp.includes("const readOverviewRange=()=>") && overviewApp.includes('timeZone:"Asia/Dhaka"'), "Overview date filters must use explicit Bangladesh-local date handling.");
assert.ok(overviewApp.includes("fetchOverviewEvents(range,maxRows=15000)") && overviewApp.includes('.in("event_name",eventNames)'), "Overview event queries should load only the event types used by its charts.");
assert.ok(overviewApp.includes("fetchOverviewOrderLines(range,maxRows=5000)") && overviewApp.includes('order_items(id)') && overviewApp.includes('select("id,total,ordered_at,status,order_items(id)")'), "Overview should use one lightweight order query for summary and trend calculations.");
assert.ok(!overviewApp.includes("fetchOverviewOrderSummary(") && overviewApp.includes("const summaryOrders=chartOrders;"), "Overview must not refetch the same selected-period orders for its KPI summary.");
assert.ok(overviewApp.includes("rangeIncludesToday?Promise.resolve(null)") && overviewApp.includes("separateTodayEvents"), "Overview should reuse selected-range orders/events for Today metrics and fetch Today separately only when needed.");
assert.ok(overviewApp.includes("fetchFinance(null,3000)") && overviewApp.includes("fetchFinance(range,3000)") && overviewApp.includes('if(entry.status!=="confirmed")return;') && overviewApp.includes('const confirmedFinanceRange=financeRange.filter(entry=>entry.status==="confirmed");'), "Overview finance summary and selected-period chart must separately aggregate confirmed ledger entries.");
assert.ok(read("admin/shared.js").includes("const from=range.fromDay??") && read("admin/shared.js").includes("const to=range.toDay??"), "Date-only finance ledger filters must use Dhaka calendar dates rather than UTC ISO date slices.");
assert.ok(overviewApp.includes("Overview refresh failed.") && overviewApp.includes("last successful load"), "Overview must report refresh failures instead of silently leaving stale or loading figures.");
assert.ok(overviewApp.includes("All-time Finance Snapshot reached its 3,000-entry retrieval limit.") && overviewApp.includes("Stock alerts reached the 1,000-product retrieval limit."), "Overview must disclose when dashboard snapshots reach retrieval caps.");
const reportSource = read("admin/app.js");
assert.ok(reportSource.includes("5,000-order retrieval cap") && reportSource.includes("15,000-event retrieval cap") && reportSource.includes("10,000-product retrieval cap") && reportSource.includes("3,000-entry finance retrieval cap"), "Reports must disclose when the selected dataset reaches its retrieval cap.");
assert.ok(reportSource.includes('timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"') && reportSource.includes('timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"'), "Report filenames and print timestamps must use the Bangladesh business timezone.");
assert.ok(overviewCss.includes(".hf-overview-range-toolbar"), "Overview date-range controls must use the responsive shared visual style.");
assert.ok(overviewCss.includes("HF Overview restrained surface v1") && overviewCss.includes("background-image:none!important"), "Overview surfaces should use the restrained brand palette without decorative gradients.");
assert.ok(read("admin/shared.css").includes("HF ERP shared surfaces v1") && read("admin/shared.css").includes("--hf-table-head"), "Shared tables, forms and cards must use the common theme-aware surface tokens.");
assert.ok(!overview.includes("চতুর্থ ডিপ্লয়মেন্ট"), "Overview should not show the obsolete deployment marker.");
assert.ok(!overview.includes('class="hf-deployment-marker"'), "Obsolete deployment marker component should be removed.");
assert.ok(!overview.includes("Test project") && !overview.includes("Testing project"), "Overview should not show the removed testing notice.");
assert.ok(overview.includes("overview.css?v=20261101-overview-erp-polish-v1"), "Overview polish stylesheet must be cache-busted.");

const facebookPage = read("admin/facebook-publishing.html");
assert.ok(facebookPage.includes("facebook-publishing.js?v=20261026-phase3-automation-queue"), "Facebook publishing script cache key must include the queue UI update.");
assert.ok(facebookPage.includes("facebook-publishing.css?v=20261026-phase3-automation-queue"), "Facebook publishing stylesheet cache key must include the queue UI update.");
assert.ok(facebookPage.includes('id="fbQueueBtn"'), "Facebook composer needs the automated queue action.");
assert.ok(facebookPage.includes('id="fbQueueBody"'), "Facebook publishing workspace needs the queue history table.");
assert.ok(facebookPage.includes("Schedule with Meta"), "Meta-native scheduling must remain available alongside automated scheduling.");

const facebookUi = read("admin/facebook-publishing.js");
assert.ok(facebookUi.includes('invoke(queueMode ? "queue_post" : "publish"'), "Queue posts must use the server-side queue action, not publish immediately.");
assert.ok(facebookUi.includes('invoke("queue_history")'), "Queue view must read server-side queue history.");
assert.ok(facebookUi.includes('invoke("cancel_queued"'), "Pending queue items must support cancellation.");
assert.ok(facebookUi.includes('publishPost(true, "meta")'), "Meta-native schedule button must preserve direct Meta scheduling.");
assert.ok(facebookUi.includes('publishPost(true, "queue")'), "Automated queue button must use the queue path.");

const facebookEdge = read("supabase/functions/facebook-publishing/index.ts");
for (const action of ["queue_post", "queue_history", "cancel_queued"]) {
  assert.ok(facebookEdge.includes('action === "' + action + '"'), "Facebook Edge Function is missing " + action + ".");
}
assert.ok(facebookEdge.includes("claim") || facebookEdge.includes("post_queue"), "Facebook queue action must use the persistent server-side queue.");
assert.ok(facebookEdge.includes('timeZone: "Asia/Dhaka"'), "Queue daily-limit calculation must use Bangladesh's local day.");
assert.ok(facebookEdge.includes("createSignedUrl(mediaPath, 3600)"), "Queued private media must be verified without making the bucket public.");
assert.ok(facebookEdge.includes('postType === "text" && !message'), "Text queue items must have a caption.");
assert.ok(facebookEdge.includes('postType !== "link" && link'), "Only link posts may store a separate link.");

const dispatcher = read("supabase/functions/post-dispatcher/index.ts");
assert.ok(dispatcher.includes("check_dispatch_secret"), "Dispatcher must retain its independent secret check.");
assert.ok(dispatcher.includes("claim_due_posts_with_daily_limit"), "Dispatcher must use the atomic daily-quota claim function.");
assert.ok(dispatcher.includes('postType === "photo"'), "Dispatcher must support queued Facebook photo posts.");
assert.ok(dispatcher.includes('postType === "video"'), "Dispatcher must support queued Facebook video posts.");
assert.ok(dispatcher.includes("createSignedUrl(path, 3600)"), "Dispatcher must resolve private media with a time-limited signed URL.");
assert.ok(dispatcher.includes('status: "published"'), "Successful queue publishing must be recorded.");
assert.ok(dispatcher.includes("rather than mark it retryable"), "Ambiguous Meta acceptance must not be automatically retried.");

const quotaMigration = read("supabase/migrations/20261026152222_claim_due_posts_with_daily_limit.sql");
const leaseMigration = read("supabase/migrations/20261026152954_add_post_queue_processing_lease.sql");
assert.ok(leaseMigration.includes("processing_started_at"), "The queue needs a processing lease to recover timed-out workers.");
assert.ok(leaseMigration.includes("OUTCOME UNCERTAIN:"), "Interrupted posts must be marked for verification instead of retried.");
assert.ok(leaseMigration.includes("interval '20 minutes'"), "Worker leases need a bounded stale-recovery threshold.");
assert.ok(leaseMigration.includes("REVOKE ALL ON FUNCTION public.claim_due_posts_with_daily_limit"), "The quota function must not be publicly executable.");
assert.ok(quotaMigration.includes("pg_advisory_xact_lock"), "Daily quota claims must be serialized to reduce overlapping-worker overposting.");
assert.ok(quotaMigration.includes("Asia/Dhaka"), "Daily quota SQL must calculate Bangladesh-local dates.");
assert.ok(quotaMigration.includes("REVOKE ALL ON FUNCTION public.claim_due_posts_with_daily_limit"), "The definer quota function must not be executable by public roles.");
assert.ok(quotaMigration.includes("TO service_role"), "Only service_role should execute the queue claim helper.");

const sharedShell = read("admin/shared.js");
assert.ok(sharedShell.includes('class="admin-skip-link" href="#pageContent"'), "The shared shell must expose a skip-to-main link.");
assert.ok(sharedShell.includes('<div class="admin-main" id="adminMain">'), "The shared shell wrapper must not create a nested main landmark.");
assert.ok(!sharedShell.includes('<main class="admin-main" id="adminMain">'), "Avoid nested <main> landmarks.");
assert.ok(sharedShell.includes('sidebar.addEventListener("keydown"') && sharedShell.includes('if(event.key==="Tab"&&sidebar.classList.contains("open")'), "Mobile navigation must retain its keyboard handling and focus trap.");



function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground), b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function assertSidebarStops(themeName, foreground, backgrounds) {
  for (const background of backgrounds) {
    assert.ok(contrastRatio(foreground, background) >= 4.5,
      themeName + " sidebar text fails 4.5:1 contrast on " + background + ".");
  }
}
assertSidebarStops("Warm Harvest", "#FFF2D8", ["#7E2D26","#A94335","#A34A2F","#8F552F","#7E3D37"]);
assertSidebarStops("Ocean Calm", "#E9FAF5", ["#124F50","#176B68","#247D79","#2D7085","#1C566B"]);
assertSidebarStops("Royal Indigo", "#F4F5FF", ["#28336B","#3F4D8A","#4B5CA0","#5E66A3","#354278"]);
assertSidebarStops("Forest Sage", "#F2F7E9", ["#294B3A","#3F6B50","#456D51","#536F47","#365B45"]);
assertSidebarStops("Berry Rose", "#FFF2F6", ["#6F2D4B","#923E62","#A94D75","#995B70","#71384F"]);
assertSidebarStops("Coastal Blue", "#F0F7FC", ["#1F4B73","#265E8D","#3477A2","#3D708C","#244F70"]);
assertSidebarStops("Plum Amethyst", "#F8F4FB", ["#4B315D","#5A3B70","#674476","#76538A","#523763"]);
assertSidebarStops("Copper Espresso", "#FFF5EA", ["#633A29","#7A452E","#98542F","#91512F","#70442F"]);
assertSidebarStops("Olive Citrus", "#F9FAEE", ["#48522B","#596233","#66713B","#6B763E","#545B31"]);
assertSidebarStops("Coral Peach", "#FFF5F0", ["#8A3F39","#99463E","#A34A40","#A34A40","#92463F"]);

assert.ok(contrastRatio("#FFF2D8", "#7E2D26") >= 4.5, "Warm Harvest sidebar text must meet AA contrast.");
assert.ok(contrastRatio("#FFFFFF", "#A94335") >= 4.5, "Warm Harvest primary button must meet AA contrast.");
assert.ok(contrastRatio("#704536", "#F8E7D8") >= 4.5, "Warm Harvest menu text must meet AA contrast.");
assert.ok(contrastRatio("#573B26", "#F4C66F") >= 4.5, "Warm Harvest active menu text must meet AA contrast.");
assert.ok(contrastRatio("#E9FAF5", "#124F50") >= 4.5, "Ocean Calm sidebar text must meet AA contrast.");
assert.ok(contrastRatio("#FFFFFF", "#176B68") >= 4.5, "Ocean Calm primary button must meet AA contrast.");
assert.ok(contrastRatio("#245A56", "#DCEFE9") >= 4.5, "Ocean Calm menu text must meet AA contrast.");
assert.ok(contrastRatio("#164D4A", "#B9E0D4") >= 4.5, "Ocean Calm active menu text must meet AA contrast.");
assert.ok(contrastRatio("#B75A43", "#F0E1D5") >= 3, "Warm Harvest focus outline must remain visible.");
assert.ok(contrastRatio("#398F88", "#E2EFEC") >= 3, "Ocean Calm focus outline must remain visible.");
assert.ok(contrastRatio("#F4F5FF", "#28336B") >= 4.5 && contrastRatio("#FFFFFF", "#3F4D8A") >= 4.5 && contrastRatio("#364271", "#E6EAF8") >= 4.5 && contrastRatio("#3C3760", "#E8D49A") >= 4.5, "Royal Indigo sidebar, buttons and menu states must meet AA contrast.");
assert.ok(contrastRatio("#F2F7E9", "#294B3A") >= 4.5 && contrastRatio("#FFFFFF", "#3F6B50") >= 4.5 && contrastRatio("#355943", "#E4ECDD") >= 4.5 && contrastRatio("#38452F", "#E7D9A9") >= 4.5, "Forest Sage sidebar, buttons and menu states must meet AA contrast.");
assert.ok(contrastRatio("#FFF2F6", "#6F2D4B") >= 4.5 && contrastRatio("#FFFFFF", "#923E62") >= 4.5 && contrastRatio("#713D56", "#F4E0E8") >= 4.5 && contrastRatio("#5B3740", "#F0C8A7") >= 4.5, "Berry Rose sidebar, buttons and menu states must meet AA contrast.");
assert.ok(contrastRatio("#F0F7FC", "#1F4B73") >= 4.5 && contrastRatio("#FFFFFF", "#265E8D") >= 4.5 && contrastRatio("#2F5778", "#DFEBF5") >= 4.5 && contrastRatio("#29445C", "#E9D7A9") >= 4.5, "Coastal Blue sidebar, buttons and menu states must meet AA contrast.");
assert.ok(contrastRatio("#606C8B", "#FBFBFE") >= 4.5 && contrastRatio("#5F705D", "#FAFCF6") >= 4.5 && contrastRatio("#8B6B7A", "#FFFAFC") >= 4.5 && contrastRatio("#596F82", "#FAFCFD") >= 4.5, "New theme muted text must remain readable on its card surface.");
assertSidebarStops("The Merchant's Fieldbook", "#D9DFD2", ["#263B35"]);
assert.ok(contrastRatio("#263B35", "#D4A34E") >= 4.5 && contrastRatio("#596157", "#FFFDF7") >= 4.5 && contrastRatio("#596157", "#F0EBDD") >= 4.5 && contrastRatio("#596157", "#E9E3D4") >= 4.5, "Fieldbook sidebar selection and muted copy must retain accessible contrast.");
assertSidebarStops("Glass Studio", "#F4F7FA", ["#2B2A3D","#34455C","#40546D"]);
assert.ok(contrastRatio("#2B3A4D","#EAF0F4") >= 4.5 && contrastRatio("#58697C","#EAF0F4") >= 4.5 && contrastRatio("#FFFFFF","#385D80") >= 4.5 && contrastRatio("#FFFFFF","#2B4866") >= 4.5 && contrastRatio("#567FA4","#EAF0F4") >= 3, "Glass Studio text, buttons and focus indicator must meet contrast requirements.");
assert.ok(read("admin/merchant-fieldbook.css").includes("--hf-muted:#596157"), "Fieldbook theme must use the contrast-checked muted text token.");
assert.ok(contrastRatio("#4B3C55", "#F7F2FA") >= 4.5 && contrastRatio("#4B3C55", "#FCF7FB") >= 4.5 && contrastRatio("#4B3C55", "#F4F2F9") >= 4.5 && contrastRatio("#4B3C55", "#FBF6EC") >= 4.5 && contrastRatio("#403044", "#D6B584") >= 4.5 && contrastRatio("#FFFFFF", "#4D335B") >= 4.5 && contrastRatio("#4D3A61", "#E9E2F0") >= 4.5 && contrastRatio("#514260", "#E8E0EF") >= 4.5 && contrastRatio("#6B5B75", "#F1EBF6") >= 4.5 && contrastRatio("#80649A", "#ECE4F0") >= 3, "Plum Amethyst all menu, active, primary/hover, secondary, header, card and focus states must meet contrast targets.");
assert.ok(contrastRatio("#5B3D2C", "#FFF6EC") >= 4.5 && contrastRatio("#5B3D2C", "#FFF9F1") >= 4.5 && contrastRatio("#5B3D2C", "#FAF0E6") >= 4.5 && contrastRatio("#5B3D2C", "#FCF5EA") >= 4.5 && contrastRatio("#553722", "#D6AA62") >= 4.5 && contrastRatio("#FFFFFF", "#91512F") >= 4.5 && contrastRatio("#FFFFFF", "#783F25") >= 4.5 && contrastRatio("#74462F", "#F0DED1") >= 4.5 && contrastRatio("#75492F", "#F2E3D5") >= 4.5 && contrastRatio("#765F52", "#F6EBDD") >= 4.5 && contrastRatio("#A9663F", "#F1E1D1") >= 3, "Copper Espresso all menu, active, primary/hover, secondary, header, card and focus states must meet contrast targets.");
assert.ok(contrastRatio("#495236", "#F7F7EA") >= 4.5 && contrastRatio("#495236", "#FBF9EA") >= 4.5 && contrastRatio("#495236", "#F2F7ED") >= 4.5 && contrastRatio("#495236", "#FAF4E6") >= 4.5 && contrastRatio("#3D4228", "#D1BC66") >= 4.5 && contrastRatio("#FFFFFF", "#66713B") >= 4.5 && contrastRatio("#FFFFFF", "#4D582B") >= 4.5 && contrastRatio("#4A5630", "#E8E9D7") >= 4.5 && contrastRatio("#515B34", "#E4E5D1") >= 4.5 && contrastRatio("#68704F", "#F1F1E3") >= 4.5 && contrastRatio("#68743B", "#ECEBDD") >= 3, "Olive Citrus all menu, active, primary/hover, secondary, header, card and focus states must meet contrast targets.");
assert.ok(contrastRatio("#713F3A", "#FFF3EC") >= 4.5 && contrastRatio("#713F3A", "#FFF9F5") >= 4.5 && contrastRatio("#713F3A", "#FAF1EF") >= 4.5 && contrastRatio("#713F3A", "#FBF5ED") >= 4.5 && contrastRatio("#563833", "#E9AE67") >= 4.5 && contrastRatio("#FFFFFF", "#B95248") >= 4.5 && contrastRatio("#FFFFFF", "#963E37") >= 4.5 && contrastRatio("#6A3935", "#F3DBD3") >= 4.5 && contrastRatio("#71443D", "#F2DDD4") >= 4.5 && contrastRatio("#7F615B", "#F8ECE6") >= 4.5 && contrastRatio("#A54E43", "#F5E1D6") >= 3, "Coral Peach all menu, active, primary/hover, secondary, header, card and focus states must meet contrast targets.");
const readableTooltipPairs=[...shared.matchAll(/"chart-surface"\s*:\s*"(#[0-9A-Fa-f]{6})"\s*,\s*"tooltip-bg"\s*:\s*"\1"/g)];
assert.ok(readableTooltipPairs.length>=6 && shared.includes('"tooltip-bg":p.chartSurface'), "All registered themes must use readable light chart surfaces behind dark tooltip labels.");

for (const file of unifiedPages) {
  const source = read(join("admin", file));
  const labelPairs = [...source.matchAll(/<label\b([^>]*)>[\s\S]*?<\/label>/gi)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    html: match[0],
    attrs: match[1],
  }));
  const explicitFor = new Set(labelPairs.map((label) => (label.attrs.match(/\bfor=["']([^"']+)["']/i) || [])[1]).filter(Boolean));
  const unnamedControls = [];
  for (const match of source.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const attrs = match[2];
    const type = (attrs.match(/\btype=["']([^"']+)["']/i) || [])[1]?.toLowerCase() || "";
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    if (/\baria-label=["'][^"']+["']/i.test(attrs) || /\baria-labelledby=["'][^"']+["']/i.test(attrs)) continue;
    const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1];
    const wrapped = labelPairs.some((label) => match.index >= label.start && match.index < label.end);
    if (wrapped || (id && explicitFor.has(id))) continue;
    unnamedControls.push(id || type || match[1]);
  }
  assert.equal(unnamedControls.length, 0, `${file}: form controls without an accessible name: ${unnamedControls.join(", ")}`);
}

const css = read("admin/shared.css")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
let braceDepth = 0;
for (const char of css) {
  if (char === "{") braceDepth++;
  if (char === "}") braceDepth--;
  assert.ok(braceDepth >= 0, "admin/shared.css contains an unmatched closing brace.");
}
assert.equal(braceDepth, 0, "admin/shared.css contains unbalanced braces.");

console.log(`Admin Phase 1–4 quality gate passed: ${unifiedPages.length} pages, semantic main landmarks, skip navigation, named form controls, focus behavior, contrast, JS syntax, cache keys, IDs, assets, courier checks, finance guards, Facebook queue safety, quota safeguards, concise overview copy, visual polish, and CSS structure.`);

assert.ok(ordersApp.includes('class="hf-order-customer-panel"'), "Refined cards need a customer column.");
assert.ok(ordersApp.includes('class="hf-order-items-panel"'), "Refined cards need a product column.");
assert.ok(ordersApp.includes('class="hf-order-totals-panel"'), "Refined cards need an amount column.");
assert.ok(ordersApp.includes('data-order-details="'), "Card actions should keep a Details route.");
assert.ok(ordersCss.includes("Refined Orders v3"), "Refined Orders styling and separators must be present.");
for (const tone of ["pending","processing","shipped","delivered","cancelled"]) {
  assert.ok(ordersCss.includes('.hf-order-card[data-status="' + tone + '"] .order-status-select'), "Status control needs a distinct " + tone + " color.");
}

assert.ok(ordersApp.includes("whatsapp=whatsappUrl(o)"), "Order phone links must open WhatsApp.");
assert.ok(ordersApp.includes("href=\"'+esc(whatsapp)+'\" target=\"_blank\" rel=\"noopener noreferrer\""), "Customer phone click must open a protected WhatsApp chat tab.");
assert.ok(ordersApp.includes("hf-order-zone-badge"), "Delivery zone should be a secondary label, not the main address.");
assert.ok(ordersCss.includes(".hf-order-address{font-size:13px"), "Delivery address should be more prominent than delivery zone.");
assert.ok(ordersCss.includes(".hf-order-item-image{width:48px;height:48px"), "Product thumbnails should be visibly larger.");
assert.ok(ordersCss.includes(".hf-order-item-copy strong{font-size:13px"), "Product names should have readable emphasis.");
assert.ok(ordersCss.includes(".hf-order-reference small{font-size:11px"), "Order date/time should be more legible.");

assert.ok(ordersApp.includes("(whatsapp?'<a class=\"hf-order-phone\""), "Only valid WhatsApp-normalized phone numbers should be clickable.");
assert.ok(ordersApp.includes("cannot be opened in WhatsApp"), "Invalid customer phone values must not create empty chat links.");
const customerColumn = ordersApp.indexOf('class="hf-order-customer-panel"');
const productsColumn = ordersApp.indexOf('class="hf-order-items-panel"');
const deliveryColumn = ordersApp.indexOf('class="hf-order-location-panel"');
const totalsColumn = ordersApp.indexOf('class="hf-order-totals-panel"');
assert.ok(customerColumn >= 0 && customerColumn < productsColumn && productsColumn < deliveryColumn && deliveryColumn < totalsColumn, "Order cards must scan in customer, products, delivery, totals order.");
assert.ok(ordersApp.includes('class="hf-order-whatsapp-icon"') && ordersApp.includes('<svg viewBox="0 0 24 24"'), "Customer contact must include a visible WhatsApp SVG mark.");
assert.ok(ordersApp.includes('</div></div>\'+\n       (whatsapp?'), "WhatsApp phone must render below the customer name, not beside it.");
assert.ok(ordersCss.includes("margin:0 0 0 41px"), "WhatsApp phone line should align below the customer copy.");
assert.ok(ordersApp.includes('class="hf-order-actions"><button'), "Order actions must sit inside the final totals row.");
assert.ok(ordersCss.includes("Orders layout v6") && ordersCss.includes("Orders layout v7"), "Compact Orders layout and final visual corrections must be present.");
assert.ok(ordersCss.includes(".hf-order-totals-panel>.hf-order-totals-values"), "Totals content must not inherit the old card-row divider spacing.");
assert.ok(ordersCss.includes("minmax(220px,1.08fr)"), "Desktop totals/actions column must retain a readable minimum width.");
assert.ok(ordersCss.includes("border-bottom:1px solid #cbd5e1!important"), "Subtotal and delivery charge must have a visible separator.");
assert.ok(ordersCss.includes("border-top:1px solid #cbd5e1"), "Grand total must be separated from delivery charge.");
assert.ok(ordersApp.includes('class="hf-order-location-heading"') && ordersApp.includes('class="hf-order-location-meta"'), "Delivery heading, zone label and address must be distinct visual levels.");




// PR #38 — per-store configuration, hierarchical category workspace and live catalog synchronization.
const catalogStoreConfigSource = read("js/store-config.js");
const catalogSignInSource = read("admin/index.html");
const catalogWorkspaceSource = read("admin/categories.html");
const catalogWorkspaceScript = read("admin/categories.js");
const catalogLiveBridge = read("js/live-catalog.js");
const catalogMainScript = read("js/main.js");
assert.ok(catalogSignInSource.includes("../js/store-config.js?v=20261101-store-config-v1") &&
  catalogSignInSource.indexOf("../js/store-config.js") < catalogSignInSource.indexOf("const STORE_CONFIG"),
  "Admin sign-in must load the public store configuration before creating the Supabase client.");
assert.ok(catalogSignInSource.includes("STORE_CONFIG.supabase?.url") &&
  catalogSignInSource.includes("STORE_CONFIG.supabase?.publishableKey") &&
  catalogSignInSource.includes("if(email!==ADMIN_EMAIL)"),
  "Admin sign-in must use the configured store Supabase connection and authorized admin identity.");
assert.ok(catalogStoreConfigSource.includes("storeId:") && catalogStoreConfigSource.includes("siteRoot:") &&
  catalogStoreConfigSource.includes("publishableKey:") && catalogStoreConfigSource.includes("reorderCategoriesRpc") &&
  catalogStoreConfigSource.includes("reorderProductsRpc") && catalogStoreConfigSource.includes("reorderHomeProductsRpc"),
  "The public store config must define store identity, site root, publishable connection and catalog ordering RPCs.");
assert.ok(!/service[_-]?role|secret[_-]?key/i.test(catalogStoreConfigSource),
  "The browser-facing store configuration must not contain privileged credentials.");
for (const catalogPageFile of readdirSync(adminDir).filter(file => file.endsWith(".html") && file !== "index.html")) {
  const catalogPageSource = read(join("admin", catalogPageFile));
  if (catalogPageSource.includes("./shared.js")) {
    assert.ok(catalogPageSource.includes("../js/store-config.js?v=20261101-store-config-v1") &&
      catalogPageSource.indexOf("../js/store-config.js") < catalogPageSource.indexOf("./shared.js"),
      catalogPageFile + ": store configuration must load before the shared Admin shell.");
  }
}
assert.ok(catalogWorkspaceSource.includes('id="categoryExplorerSection"') &&
  catalogWorkspaceSource.includes('id="categoryBreadcrumb"') &&
  catalogWorkspaceSource.includes('id="productSortSection"'),
  "The Categories workspace must expose progressive drill-down, breadcrumbs and scoped product ordering.");
assert.ok(catalogWorkspaceScript.includes("CATEGORY_TABLE") && catalogWorkspaceScript.includes("PRODUCT_TABLE") &&
  catalogWorkspaceScript.includes("REORDER_CATEGORY_RPC") && catalogWorkspaceScript.includes("REORDER_PRODUCT_RPC") &&
  catalogWorkspaceScript.includes("REORDER_HOME_RPC"),
  "The Categories workspace must use the configured catalog tables and atomic ordering RPCs.");
assert.ok(catalogWorkspaceScript.includes("validateCategoryMove") && catalogWorkspaceScript.includes("descendantsOf") &&
  catalogWorkspaceScript.includes("maximum of three category levels"),
  "Category parent moves must prevent cycles and enforce the three-level hierarchy.");
assert.ok(catalogWorkspaceScript.includes('addEventListener("pointerdown"') &&
  catalogWorkspaceScript.includes("setPointerCapture") &&
  catalogWorkspaceScript.includes('addEventListener("pointerup"') &&
  catalogWorkspaceScript.includes("pointercancel"),
  "Category and product drag ordering must handle pointer capture, completion and cancellation.");
assert.ok(catalogWorkspaceScript.includes("data-cat-enter") && catalogWorkspaceScript.includes("categoryBreadcrumb") &&
  catalogWorkspaceScript.includes("quickProductForm") && catalogWorkspaceScript.includes("undoLastOrder"),
  "Category navigation, quick product editing and one-step ordering undo must be wired.");
const catalogMoveFunction = catalogWorkspaceScript.match(/function moveOrderedId\(ids,id,directionOrTarget\)\s*\{[\s\S]*?\n \}/);
assert.ok(catalogMoveFunction, "The shared category/product ordering helper must exist.");
const catalogMoveOrderedId = vm.runInNewContext("(" + catalogMoveFunction[0] + ")");
assert.deepEqual(Array.from(catalogMoveOrderedId(["a","b","c","d"],"a","d")), ["b","c","a","d"],
  "Dragging an earlier item onto a later item must insert immediately before the target.");
assert.deepEqual(Array.from(catalogMoveOrderedId(["a","b","c","d"],"d","a")), ["d","a","b","c"],
  "Dragging a later item onto an earlier item must insert before the target.");
assert.deepEqual(Array.from(catalogMoveOrderedId(["a","b","c","d"],"b",-1)), ["b","a","c","d"],
  "The Up control must move an item exactly one position up.");
assert.deepEqual(Array.from(catalogMoveOrderedId(["a","b","c","d"],"b",1)), ["a","c","b","d"],
  "The Down control must move an item exactly one position down.");
assert.deepEqual(Array.from(catalogMoveOrderedId(["a","b","c","d"],"a",-1)), ["a","b","c","d"],
  "Moving the first item up must not change its position.");
assert.ok(catalogLiveBridge.includes("halalstore:config-ready") &&
  catalogLiveBridge.includes("HALAL_STORE_CONFIG") &&
  catalogLiveBridge.includes("menu.replaceChildren") &&
  catalogLiveBridge.includes("mobileLinks.replaceChildren") &&
  catalogLiveBridge.includes("footerList.replaceChildren") &&
  catalogLiveBridge.includes("rail.replaceChildren"),
  "Desktop, mobile, footer and featured-category navigation must synchronize from the live category tree.");
assert.ok(catalogLiveBridge.includes("setPictureImage(img, product.image_url, product.name)") &&
  catalogLiveBridge.includes("effectiveCategoryActive") &&
  catalogLiveBridge.includes("home_sort_order"),
  "Live product cards must normalize image URLs and respect category visibility and independent home ordering.");
assert.ok(catalogMainScript.includes("store-config.js") && catalogMainScript.includes("HALAL_STORE_CONFIG"),
  "The storefront bootstrap must wait for and use its store configuration.");
const catalogHomepage = read("index.html");
const catalogHomeConfigVersion = catalogHomepage.match(/js\/store-config\.js\?v=([^"']+)/)?.[1];
const catalogHomeMainVersion = catalogHomepage.match(/js\/main\.js\?v=([^"']+)/)?.[1];
assert.ok(catalogHomeConfigVersion && catalogHomeMainVersion &&
  catalogHomepage.indexOf("store-config.js") < catalogHomepage.indexOf("js/main.js"),
  "The homepage must load the per-store configuration before the shared storefront bootstrap; each asset may use its own cache version.");

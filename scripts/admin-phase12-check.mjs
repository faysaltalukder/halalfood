import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const adminDir = join(root, "admin");
const sharedCssVersion = "20261030-admin-theme-v2";
const sharedJsVersion = "20261030-illustrated-nav-v1";
const appJsVersion = "20261030-orders-polish-v5";
const read = (path) => readFileSync(join(root, path), "utf8");

const htmlFiles = readdirSync(adminDir).filter((file) => file.endsWith(".html"));
const unifiedPages = htmlFiles.filter((file) => /<body[^>]*\bdata-page=/.test(read(join("admin", file))));
assert.ok(unifiedPages.length >= 17, `Expected at least 17 unified admin pages, found ${unifiedPages.length}.`);

for (const file of unifiedPages) {
  const source = read(join("admin", file));
  assert.ok(source.includes(`shared.css?v=${sharedCssVersion}`), `${file}: missing shared CSS cache key.`);
  assert.ok(source.includes(`shared.js?v=${sharedJsVersion}`) || source.includes("shared.js?v=20261027-site-publisher-v1"), `${file}: missing shared JS cache key.`);

  if (source.includes("./app.js")) {
    assert.ok(source.includes(`app.js?v=${appJsVersion}`) || source.includes("app.js?v=20261030-orders-layout-v7") || source.includes("app.js?v=20261030-bulk-manager-v3") || source.includes("app.js?v=20261027-site-publisher-v1") || source.includes("app.js?v=20261030-courier-history-explained-v3"), `${file}: stale or missing app.js cache key.`);
  }

  const mainTag = (source.match(/<main\b[^>]*\bid=["']pageContent["'][^>]*>/i) || [])[0];
  assert.ok(mainTag, `${file}: missing main#pageContent landmark.`);
  assert.ok(/\btabindex=["']-1["']/.test(mainTag), `${file}: main content must be programmatically focusable for the skip link.`);
  assert.equal((source.match(/<main\b/gi) || []).length, 1, `${file}: expected one main landmark in the source page.`);

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

// Keep the default theme light while honoring an explicitly saved dark preference.
const shared = read("admin/shared.js");
assert.ok(shared.includes('document.documentElement.dataset.adminTheme=savedTheme==="dark"?"dark":"light";'));
assert.ok(shared.includes('let savedTheme="light";try{savedTheme=localStorage.getItem(themeKey)||"light";}'));

const app = read("admin/app.js");
assert.ok(app.includes('order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url)'), "Courier booking must load relational order_items.");
assert.ok(app.includes("normalizeCourierMobile(freshOrder.customer_phone)"), "Courier booking must match backend phone validation.");
assert.ok(app.includes("freshCustomerName.length<3||freshCustomerName.length>100"), "Courier booking must validate provider-compatible customer names.");
assert.ok(app.includes('providerAddressLimit=provider==="pathao"?220:250'), "Courier booking must use provider-specific address limits.");
assert.ok(app.includes('if(linkedOrder.status==="cancelled")'), "Confirmed income must reject cancelled orders.");
assert.ok(app.includes("Cancelled — no income"), "Reconciliation must visibly label cancelled orders.");

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
assert.ok(ordersPage.includes("app.js?v=20261030-bulk-manager-v3"), "Orders workspace must load the bulk-manager application script.");
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
assert.ok(productsPage.includes('products.css?v=20261030-shipping-weight-v1'), "Product shipping-weight editor CSS must be cache-busted.");
assert.ok(productsPage.includes('app.js?v=20261030-bulk-manager-v3'), "Product shipping-weight editor must load the updated admin script.");
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
assert.ok(ordersApp.includes('Number(weight).toFixed(3)'), "Bulk parcel weights must retain the 0.001 kg database precision.");
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

const overview = read("admin/overview.html");
assert.ok(!overview.includes("চতুর্থ ডিপ্লয়মেন্ট"), "Overview should not show the obsolete deployment marker.");
assert.ok(!overview.includes('class="hf-deployment-marker"'), "Obsolete deployment marker component should be removed.");
assert.ok(!overview.includes("Test project") && !overview.includes("Testing project"), "Overview should not show the removed testing notice.");
assert.ok(overview.includes("overview.css?v=20261030-admin-theme-v3"), "Overview polish stylesheet must be cache-busted.");

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
assert.ok(contrastRatio("#FFFFFF", "#9F5726") >= 4.5, "Primary button foreground/background must meet AA contrast for normal text.");
assert.ok(contrastRatio("#8B4A1F", "#FFFDF8") >= 4.5, "Light-theme eyebrow text must meet AA contrast.");
assert.ok(contrastRatio("#E7B083", "#111C2E") >= 4.5, "Dark-theme eyebrow text must meet AA contrast.");
assert.ok(contrastRatio("#8B4A1F", "#FFFDF8") >= 3, "Focus outline must remain visible against the light paper surface.");

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
assert.ok(ordersApp.includes('href="'+esc(whatsapp)+'" target="_blank" rel="noopener noreferrer"'), "Customer phone click must open a protected WhatsApp chat tab.");
assert.ok(ordersApp.includes("hf-order-zone-badge"), "Delivery zone should be a secondary label, not the main address.");
assert.ok(ordersCss.includes(".hf-order-address{font-size:13px"), "Delivery address should be more prominent than delivery zone.");
assert.ok(ordersCss.includes(".hf-order-item-image{width:48px;height:48px"), "Product thumbnails should be visibly larger.");
assert.ok(ordersCss.includes(".hf-order-item-copy strong{font-size:13px"), "Product names should have readable emphasis.");
assert.ok(ordersCss.includes(".hf-order-reference small{font-size:12px"), "Order date/time should be more legible.");

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



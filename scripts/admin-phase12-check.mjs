import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const adminDir = join(root, "admin");
const sharedCssVersion = "20261026-phase4-a11y-performance";
const sharedJsVersion = "20261026-phase4-a11y-performance";
const appJsVersion = "20261027-save-integrity-v1";
const read = (path) => readFileSync(join(root, path), "utf8");

const htmlFiles = readdirSync(adminDir).filter((file) => file.endsWith(".html"));
const unifiedPages = htmlFiles.filter((file) => /<body[^>]*\bdata-page=/.test(read(join("admin", file))));
assert.equal(unifiedPages.length, 15, `Expected 15 unified admin pages, found ${unifiedPages.length}.`);

for (const file of unifiedPages) {
  const source = read(join("admin", file));
  assert.ok(source.includes(`shared.css?v=${sharedCssVersion}`), `${file}: missing shared CSS cache key.`);
  assert.ok(source.includes(`shared.js?v=${sharedJsVersion}`), `${file}: missing shared JS cache key.`);

  if (source.includes("./app.js")) {
    assert.ok(source.includes(`app.js?v=${appJsVersion}`), `${file}: stale or missing app.js cache key.`);
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
const liveCatalog = read("js/live-catalog.js");
const storefrontMain = read("js/main.js");
const cmsProduct = read("js/cms-product.js");
execFileSync(process.execPath, ["--check", join(root, "js/live-catalog.js")], { cwd: root, stdio: "pipe" });
execFileSync(process.execPath, ["--check", join(root, "js/main.js")], { cwd: root, stdio: "pipe" });
execFileSync(process.execPath, ["--check", join(root, "js/cms-product.js")], { cwd: root, stdio: "pipe" });
assert.ok(app.includes("verifyAdminCatalogRecord(\"products\",savedId,PRODUCT_READBACK_COLUMNS,payload,\"Product\")"), "Product save must read the persisted product record back and verify submitted fields.");
assert.ok(app.includes("verifyAdminCatalogRecord(\"categories\",savedCategoryId,CATEGORY_READBACK_COLUMNS,payload,\"Category\")"), "Category save must read the persisted category record back.");
assert.ok(app.includes('update(payload).eq("id",id).select("id").single()'), "Product edits must update and confirm the existing record by ID.");
assert.ok(app.includes('insert(payload).select("id").single()'), "New Product inserts must return the created record ID before follow-up writes.");
assert.ok(app.includes("costMismatches") && app.includes("low_stock_threshold"), "Private cost and stock-alert settings must be verified after save.");
assert.ok(app.includes("linked Product labels could not be synchronized"), "Partial Category rename failures must be reported as such.");
assert.ok(liveCatalog.includes('cache: "no-store"'), "Public catalog fetches must not reuse the browser HTTP cache.");
assert.ok(liveCatalog.includes("Promise.allSettled"), "Product and Category fetch failures must be collected and reported separately.");
assert.ok(liveCatalog.includes("Retry catalog"), "Catalog failure state must provide a retry action.");
assert.ok(liveCatalog.includes("preloaded and outdated"), "Catalog failures must not present preloaded HTML as verified live data.");
assert.ok(storefrontMain.includes("js/live-catalog.js?v=20261027-catalog-render-v1"), "Fallback catalog loader must use the current cache-busted asset.");
assert.ok(liveCatalog.includes('$(".mega-menu").forEach(syncLinks)'), "Desktop category navigation must update all menu containers.");
assert.ok(liveCatalog.includes('$("[data-mrow]").forEach(wrap =>'), "Every homepage merchandising rail must be rendered from live products.");
assert.equal(liveCatalog.split(/\r?\n/).filter((line) => /^\s*\$\("[^"]+"\)\.forEach/.test(line)).length, 0, "Single-element querySelector helper must never be used as a multi-element collection.");
assert.ok(liveCatalog.includes("products.filter(item => item.is_active && item.is_featured)"), "Featured Products must contain only explicitly featured active items.");
assert.ok(!liveCatalog.includes("[...featured, ...remaining]"), "Non-featured Products must not be forced into the Featured section.");
assert.ok(!liveCatalog.includes("slice(0, cardLimit)"), "Homepage category rails must not inherit the old static scaffold card limit.");
assert.ok(liveCatalog.includes('window.dispatchEvent(new CustomEvent("halalcatalog:rendered"'), "The completed live render must refresh carousel controls.");
assert.ok(liveCatalog.includes('const remainder = jfyOrdered.slice(10)'), "Load More must receive its data from the current catalog, not static template cards.");
assert.ok(storefrontMain.includes('window.addEventListener("halalcatalog:rendered", initMrow)'), "Merchandising carousel controls must reinitialize after live rendering.");
assert.ok(storefrontMain.includes("const cards = () => Array.from(track.children)"), "Carousel logic must read the current DOM card collection.");
assert.ok(cmsProduct.includes("getActiveCategory(item.category_slug)"), "CMS product details must verify that their category is active.");
assert.ok(cmsProduct.includes('encodeURIComponent(item.slug)'), "CMS product Order Now must use the stable product slug.");
const publicHtmlPaths = execFileSync("git", ["ls-files", "*.html"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/).filter((path) => path && !path.startsWith("admin/"));
for (const path of publicHtmlPaths) {
  const source = read(path);
  if (/<script\b[^>]*\bsrc=["'][^"']*(?:\.\.\/)*js\/main\.js(?:\?[^"']*)?["'][^>]*>/i.test(source)) {
    assert.ok(source.includes("js/main.js?v=20261027-catalog-render-v1"), `${path}: main.js cache key must be current.`);
  }
  const liveCatalogTags = [...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']*live-catalog\.js(?:\?[^"']*)?)["'][^>]*>/gi)];
  for (const match of liveCatalogTags) {
    assert.ok(match[1].includes("live-catalog.js?v=20261027-catalog-render-v1"), `${path}: live catalog script cache key must be current.`);
  }
}
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


const overview = read("admin/overview.html");
assert.ok(overview.includes("চতুর্থ ডিপ্লয়মেন্ট"), "Overview must show the requested temporary fourth-deployment marker.");
assert.ok(overview.includes('class="hf-deployment-marker"'), "Overview deployment marker must use the dedicated accessible component.");
assert.ok(overview.includes("overview.css?v=20261026-phase4-final-polish"), "Overview marker stylesheet must be cache-busted.");

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

console.log(`Admin Phase 1–4 quality gate passed: ${unifiedPages.length} pages, semantic main landmarks, skip navigation, named form controls, focus behavior, contrast, JS syntax, cache keys, IDs, assets, courier checks, finance guards, Facebook queue safety, quota safeguards, deployment marker, and CSS structure.`);

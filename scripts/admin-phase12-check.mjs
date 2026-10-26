import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const adminDir = join(root, "admin");
const sharedCssVersion = "20261026-full-dashboard-v2";
const sharedJsVersion = "20261026-phase1-light-default";
const appJsVersion = "20261026-phase12-audit-hardening";
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


const overview = read("admin/overview.html");
assert.ok(overview.includes("তৃতীয় ডিপ্লয়মেন্ট"), "Overview must show the requested temporary third-deployment marker.");
assert.ok(overview.includes('class="hf-deployment-marker"'), "Overview deployment marker must use the dedicated accessible component.");
assert.ok(overview.includes("overview.css?v=20261026-phase3-deployment-marker"), "Overview marker stylesheet must be cache-busted.");

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

const dispatcher = read("supabase/functions/post-dispatcher/index.ts");
assert.ok(dispatcher.includes("check_dispatch_secret"), "Dispatcher must retain its independent secret check.");
assert.ok(dispatcher.includes("claim_due_posts_with_daily_limit"), "Dispatcher must use the atomic daily-quota claim function.");
assert.ok(dispatcher.includes('postType === "photo"'), "Dispatcher must support queued Facebook photo posts.");
assert.ok(dispatcher.includes('postType === "video"'), "Dispatcher must support queued Facebook video posts.");
assert.ok(dispatcher.includes("createSignedUrl(path, 3600)"), "Dispatcher must resolve private media with a time-limited signed URL.");
assert.ok(dispatcher.includes('status: "published"'), "Successful queue publishing must be recorded.");
assert.ok(dispatcher.includes("rather than mark it retryable"), "Ambiguous Meta acceptance must not be automatically retried.");

const quotaMigration = read("supabase/migrations/20261026152222_claim_due_posts_with_daily_limit.sql");
assert.ok(quotaMigration.includes("pg_advisory_xact_lock"), "Daily quota claims must be serialized to reduce overlapping-worker overposting.");
assert.ok(quotaMigration.includes("Asia/Dhaka"), "Daily quota SQL must calculate Bangladesh-local dates.");
assert.ok(quotaMigration.includes("REVOKE ALL ON FUNCTION public.claim_due_posts_with_daily_limit"), "The definer quota function must not be executable by public roles.");
assert.ok(quotaMigration.includes("TO service_role"), "Only service_role should execute the queue claim helper.");

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

console.log(`Admin Phase 1–3 integrity passed: ${unifiedPages.length} pages, JavaScript syntax, cache keys, IDs, assets, theme defaults, courier checks, finance guards, Facebook queue wiring, quota safeguards, deployment marker, and CSS structure.`);

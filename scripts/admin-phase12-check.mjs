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

console.log(`Admin Phase 1–2 integrity passed: ${unifiedPages.length} pages, script syntax, cache keys, IDs, assets, theme defaults, courier validation cases, finance guards, and CSS structure.`);

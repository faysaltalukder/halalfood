import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];
const checked = [];
const ignoredDirs = new Set([".git", "node_modules", ".vercel"]);
const required = [
  "docs/ARCHITECTURE.md",
  "docs/AI_WORKFLOW.md",
  "docs/FEATURE_OWNERSHIP.md",
  "docs/EDGE_FUNCTIONS.md",
  "docs/SUPABASE_DRIFT_REGISTER.md",
  "CONTRIBUTING.md",
  "supabase/functions/order-track/index.ts",
  "supabase/functions/youtube-publishing/index.ts",
  "supabase/functions/meta-ads-review/index.ts",
  "admin/pos.html",
  "admin/pos.css",
  "admin/pos.js",
  "supabase/migrations/20261031044407_create_offline_pos_sales.sql",
  "supabase/migrations/20261031045058_harden_offline_pos_with_invoker_rls.sql",
  "supabase/migrations/20261031051527_interactive_pos_simple_sale_form.sql",
  "supabase/migrations/20261031055535_create_manual_delivery_order_from_pos.sql",
  "scripts/admin-pos-check.mjs",
  "admin/products-add.html",
  "admin/products-barcode.html",
  "admin/products-barcode.js",
  "admin/products-reviews.html",
  "admin/products-reviews.js",
  "admin/products-tools.css",
  "product-lookup.html",
  "js/product-lookup.js",
  "js/product-reviews.js",
  "supabase/migrations/20261031061456_add_product_catalog_sku_and_reviews.sql",
  "supabase/migrations/20261031062432_allow_admin_moderation_of_customer_reviews.sql",
  "supabase/migrations/20261031063731_allow_unlinked_customer_review_submissions.sql",
  "scripts/admin-product-tools-check.mjs",
  "admin/supplier-add.html",
  "admin/supplier-purchases.html",
  "admin/supplier-payments.html",
  "admin/supplier-management.js",
  "admin/supplier-workspace.css",
  "supabase/migrations/20261031160318_supplier_procurement_payables_v1.sql",
  "supabase/migrations/20261031160349_supplier_procurement_performance_hardening_v1.sql",
  "supabase/migrations/20261031162000_supplier_ledger_integrity_v1.sql",
];

for (const path of required) {
  try { statSync(join(root, path)); }
  catch { failures.push(`Missing required architecture/source file: ${path}`); }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const path = join(dir, name);
    const rel = path.slice(root.length + 1).replaceAll("\\", "/");
    const st = statSync(path);
    if (st.isDirectory()) { walk(path); continue; }
    if (extname(name) !== ".js" || rel.startsWith("vendor/")) continue;
    const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
    checked.push(rel);
    if (result.status !== 0) failures.push(`JavaScript syntax error in ${rel}: ${result.stderr || result.stdout}`);
  }
}
walk(root);

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:service_role|secret_access_key)\s*[:=]\s*["'][^"']{12,}["']/i,
];
for (const rel of ["supabase/functions", "js", "admin"]) {
  const base = join(root, rel);
  try {
    const scan = (dir) => {
      for (const name of readdirSync(dir)) {
        if (ignoredDirs.has(name)) continue;
        const path = join(dir, name), st = statSync(path);
        if (st.isDirectory()) { scan(path); continue; }
        if (!/\.(?:js|ts|html)$/.test(name)) continue;
        const content = readFileSync(path, "utf8");
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) failures.push(`Potential private credential pattern in ${path.slice(root.length + 1)}`);
        }
      }
    };
    scan(base);
  } catch {}
}

console.log(`Architecture guard: checked ${checked.length} JavaScript files.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Architecture guard passed.");
}

#!/usr/bin/env node
/**
 * Read-only repository inventory and safety checks.
 * This script does not modify project files or contact production services.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";

const root = resolve(process.cwd());
const ignored = new Set([".git", "node_modules", ".vercel", ".next"]);
const codeExtensions = new Set([".html", ".css", ".js", ".mjs", ".ts", ".sql"]);
const requiredPaths = [
  "index.html",
  "admin/index.html",
  "js/main.js",
  "js/cart.js",
  "js/live-catalog.js",
  "admin/shared.js",
  "admin/app.js",
  "supabase/functions/order-sync/index.ts",
  "supabase/functions/courier-integration/index.ts",
  "supabase/functions/analytics-ingest/index.ts",
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = walk(root);
const relativePaths = files.map((file) => relative(root, file).replaceAll("\\", "/"));
const missingRequired = requiredPaths.filter((path) => !existsSync(join(root, path)));
const extensionCounts = {};
for (const file of files) {
  const ext = extname(file).toLowerCase() || "[no extension]";
  extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
}

const hotspots = files
  .filter((file) => codeExtensions.has(extname(file).toLowerCase()))
  .map((file) => ({ path: relative(root, file).replaceAll("\\", "/"), bytes: statSync(file).size }))
  .filter((file) => file.bytes >= 50 * 1024)
  .sort((a, b) => b.bytes - a.bytes);

const functionDirs = relativePaths
  .filter((path) => path.startsWith("supabase/functions/") && path.endsWith("/index.ts"))
  .map((path) => path.split("/")[2])
  .sort();

const migrationFiles = relativePaths
  .filter((path) => path.startsWith("supabase/migrations/") && path.endsWith(".sql"))
  .sort();

const publicCode = files.filter((file) => {
  const path = relative(root, file).replaceAll("\\\\", "/");
  const publicPrefixes = ["admin/", "js/", "css/", "categories/", "products/", "blog/"];
  const publicPages = [
    "index.html", "product.html", "category.html", "cart.html", "order.html",
    "account.html", "thank-you.html", "track-order.html", "about.html",
    "contact.html", "faq.html", "privacy.html", "terms.html",
    "delivery-returns.html", "how-to-order.html",
  ];
  return publicPrefixes.some((prefix) => path.startsWith(prefix)) || publicPages.includes(path);
});
const secretPatterns = [
  { label: "Supabase service-role JWT", pattern: /eyJ[A-Za-z0-9_-]{20,}[.][A-Za-z0-9_-]{20,}[.][A-Za-z0-9_-]{10,}/ },
  { label: "Provider access token literal", pattern: /(?:EA[A-Za-z0-9]{35,}|ya29[.][A-Za-z0-9_-]{30,})/ },
  { label: "GitHub personal access token", pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { label: "Supabase secret API key", pattern: /sb_secret_[A-Za-z0-9_-]{20,}/ },
];
const secretFindings = [];
for (const file of publicCode) {
  const source = readFileSync(file, "utf8");
  for (const item of secretPatterns) {
    if (item.pattern.test(source)) secretFindings.push({ file: relative(root, file), type: item.label });
  }
}

const summary = {
  files: files.length,
  codeFileCounts: extensionCounts,
  edgeFunctions: functionDirs.length,
  edgeFunctionNames: functionDirs,
  migrationFiles: migrationFiles.length,
  largeSourceFiles: hotspots,
  missingRequired,
  possiblePublicSecretFindings: secretFindings,
};

console.log("Halal Food repository health (read-only)");
console.log(JSON.stringify(summary, null, 2));

if (missingRequired.length || secretFindings.length) {
  console.error("Repository health check failed.");
  process.exitCode = 1;
} else {
  console.log("Repository structure and public-secret scan passed.");
}

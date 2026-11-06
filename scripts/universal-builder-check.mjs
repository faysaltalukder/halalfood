import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const adapter = read("admin/wordpress.html");
const nav = read("admin/shared.js");
const contract = read("WORDPRESS-BUILDER-ARCHITECTURE.md");
const url = "https://wordpress-studio.shipstatic.com/admin/";

assert.ok(adapter.includes(url), "Legacy WordPress route must open the independent WordPress app.");
assert.ok(adapter.includes('target="_blank"') && adapter.includes('rel="noopener noreferrer"'), "External launch must use a safe new browsing context.");
assert.ok(!/supabase|neon|HFAdminReady|HFNeon|createClient|fetch\s*\(/i.test(adapter), "Halal Food launch adapter must not load backend SDKs or exchange credentials.");
assert.ok(nav.includes('["wordpress","layout","WordPress","open independent WordPress Studio"]'), "Halal Food admin must retain one WordPress navigation entry.");
assert.ok(nav.includes(url) && nav.includes('target="_blank" rel="noopener noreferrer"'), "WordPress navigation must open the separate app safely.");
assert.ok(!nav.includes("wordpressBusinessCategories") && !nav.includes("wordpress-templates.html") && !nav.includes("website-builder.html") && !nav.includes("wordpress-live.html"), "Halal Food navigation must not contain embedded WordPress routes or business logic.");
assert.ok(contract.includes("Only:") && contract.includes("minimal external-launch adapter") && contract.includes("must not add WordPress renderer/editor code"), "Halal Food repository contract must permit only the external launch adapter.");

for (const path of [
  "admin/wordpress-live.html","admin/wordpress-sandbox.js","admin/wordpress.css",
  "admin/wordpress-templates.html","admin/wordpress-templates.js","admin/wordpress-templates.css",
  "admin/website-builder.html","admin/website-builder.js","admin/website-builder.css",
  "admin/neon-builder-api.js","database/migrations/20261106_grocery_template_designs.sql",
  "database/migrations/20261106_neon_data_api_rls.sql",".github/workflows/grocery-template-check.yml",
  "scripts/grocery-template-suite-check.mjs"
]) assert.ok(!existsSync(path), "WordPress application code must live outside Halal Food: " + path);

console.log("WordPress isolation check passed: Halal Food contains only a safe external admin launch adapter; builder code, Neon client, migrations and workflows are absent.");

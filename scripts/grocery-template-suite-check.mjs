import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const js = read("../admin/wordpress-templates.js");
const html = read("../admin/wordpress-templates.html");
const builder = read("../admin/website-builder.js");
const css = read("../admin/wordpress-templates.css");
const migration = read("../database/migrations/20261106_grocery_template_designs.sql");
const apiMigration = read("../database/migrations/20261106_neon_data_api_rls.sql");
const apiClient = read("../admin/neon-builder-api.js");
const templatesHtml = html;
const architecture = read("../WORDPRESS-BUILDER-ARCHITECTURE.md");

const keys = ["general-supermarket", "fresh-produce", "express-grocery", "wholesale-bulk"];
for (const key of keys) {
  assert.ok(js.includes('key:"' + key + '"'), "missing storefront definition: " + key);
  assert.ok(builder.includes('"' + key + '"'), "missing editor seed: " + key);
  assert.ok(migration.includes("'" + key + "'"), "missing Neon design metadata seed: " + key);
}
for (const id of ["wpTemplateTabs", "wpTemplateViewport", "wpStorefront", "wpTemplateUse"]) {
  assert.ok(html.includes('id="' + id + '"'), "missing template studio mount: " + id);
}
for (const token of ["hf-shop-product-grid", "hf-fresh-grid", "hf-express-grid", "hf-b2b-table-wrap", "@media(max-width:720px)"]) {
  assert.ok(css.includes(token), "missing responsive design rule: " + token);
}
assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS builder.template_designs"));
assert.ok(architecture.includes("Neon stores durable template definitions"));
assert.ok(architecture.includes("Never expose Neon connection strings"));
assert.ok(js.includes("Product photos/prices remain sample-only"));
assert.ok(templatesHtml.includes("neon-builder-api.js"), "template page must load the Neon API client");
assert.ok(read("../admin/website-builder.html").includes("neon-builder-api.js"), "editor must load the Neon API client");
assert.ok(apiClient.includes("Authorization: \"Bearer \" + token"), "Neon requests must use the signed-in user JWT");
assert.ok(apiClient.includes("loadTemplateCatalog") && apiClient.includes("saveDocument"), "Neon API client must support template reads and document writes");
assert.ok(apiMigration.includes("ENABLE ROW LEVEL SECURITY") && apiMigration.includes("auth.uid()"), "Neon tenant tables must be protected by RLS");
assert.ok(apiMigration.includes("builder.website_documents"), "persistent builder documents must be stored in Neon");
assert.ok(architecture.includes("Neon Data API") && architecture.includes("builder.website_documents"));
console.log("Grocery template suite contract passed: 4 designs, editor seeds, Neon metadata migration, responsive layouts and architecture guardrails.");

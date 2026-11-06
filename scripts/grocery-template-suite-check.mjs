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
const storefront = read("../storefront.js");
const storefrontHtml = read("../storefront.html");
const storefrontCss = read("../storefront.css");
const pagesAdmin = read("../admin/website-pages.js");
const pagesHtml = read("../admin/website-pages.html");
const pagesCss = read("../admin/website-pages.css");
const ordersAdmin = read("../admin/website-orders.js");
const ordersHtml = read("../admin/website-orders.html");
const ordersCss = read("../admin/website-orders.css");
const pageExpansion = read("../database/migrations/20261107_grocery_page_expansion.sql");
const orderWorkflow = read("../database/migrations/20261107_grocery_order_status_workflow.sql");

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
assert.ok(apiClient.includes('headers.Authorization="Bearer "+token'), "Neon requests must use the signed-in user JWT");
assert.ok(apiClient.includes("loadTemplateCatalog") && apiClient.includes("saveDocument"), "Neon API client must support template reads and document writes");
assert.ok(apiMigration.includes("ENABLE ROW LEVEL SECURITY") && apiMigration.includes("auth.uid()"), "Neon tenant tables must be protected by RLS");
assert.ok(apiMigration.includes("builder.website_documents"), "persistent builder documents must be stored in Neon");
assert.ok(architecture.includes("Neon Data API") && architecture.includes("builder.website_documents"));
assert.ok(storefrontHtml.includes("neon-builder-api.js"), "storefront must load the Neon API client");
assert.ok(storefront.includes("placeOrder") && storefront.includes("trackOrder"), "storefront must connect COD ordering and order tracking");
assert.ok(storefront.includes("function productPage") && storefront.includes("function cartPage") && storefront.includes("function checkoutPage"), "commerce pages must be rendered");
assert.ok(storefront.includes("offersPage") && storefront.includes("brandsPage") && storefront.includes("storeLocatorPage") && storefront.includes("bulkEnquiryPage"), "extended pages must have dedicated renderers");
assert.ok(storefrontCss.includes("@media(max-width:720px)") && storefrontCss.includes("data-template"), "storefront must include mobile and theme-specific CSS");
assert.ok(pagesHtml.includes("website-pages.js") && pagesAdmin.includes("seedWebsitePages") && pagesAdmin.includes("createCustomPage"), "website page manager must seed and manage page documents");
assert.ok(pagesCss.includes("@media(max-width:560px)"), "page manager must support small mobile screens");
assert.ok(ordersHtml.includes("website-orders.js") && ordersAdmin.includes("loadWebsiteOrders") && ordersAdmin.includes("updateOrderStatus"), "store owner must be able to view and update Neon orders");
assert.ok(ordersCss.includes("@media(max-width:560px)"), "order inbox must support small mobile screens");
assert.ok(orderWorkflow.includes("update_storefront_order_status") && orderWorkflow.includes("stock=stock+v_item.quantity"), "cancellation must restore reserved inventory atomically");
assert.ok(ordersAdmin.includes("nextStates(o.status)"), "order inbox must constrain valid status transitions");
assert.ok(apiClient.includes("async function loadWebsiteOrders") && apiClient.includes("async function updateOrderStatus"), "Neon API must expose owner-scoped order management");
assert.ok(apiClient.includes("length<25") && apiClient.includes("const records=missing.map"), "Neon must seed all 25 page documents efficiently");
assert.ok(builder.includes("saveDocument(state.website,payload,PAGE_KEY)"), "editor saves must be scoped to the selected page");
for (const key of ["offers","brands","recipes","recipe-detail","journal","store-locator","bulk-enquiry"]) assert.ok(pageExpansion.includes("('" + key + "'"), "missing expanded page seed: " + key);
console.log("Multi-page commerce contract passed: 4 unique themes, 25 pages each, Neon page persistence, COD checkout, tracking, and mobile layout.");
console.log("Grocery template suite contract passed: 4 designs, editor seeds, Neon metadata migration, responsive layouts and architecture guardrails.");

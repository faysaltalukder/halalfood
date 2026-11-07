import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const legacyRoutes = ["admin/wordpress.html","admin/wordpress-live.html","admin/wordpress-templates.html","admin/website-builder.html"];
for (const route of legacyRoutes) {
  const page = read(route);
  assert.ok(page.includes("https://wordpress-studio.shipstatic.com/admin/index.html"), "Legacy route must point to the independent WordPress Studio: " + route);
  assert.ok(page.includes("window.location.replace"), "Legacy route must automatically redirect: " + route);
}
const shared = read("admin/shared.js");
assert.ok(!shared.includes('["wordpress","layout","WordPress"') && !shared.includes("wordpressBusinessCategories"), "Halal Food admin navigation must not include WordPress.");
console.log("WordPress separation and legacy redirect checks passed.");

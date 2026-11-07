import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const architecture = read("../WORDPRESS-BUILDER-ARCHITECTURE.md");
const shared = read("../admin/shared.js");
const studioUrl = "https://wordpress-studio.shipstatic.com/admin/index.html";

assert.ok(architecture.includes("The WordPress/Grocery Studio is not part of Halal Food."));
assert.ok(architecture.includes("faysaltalukder/grocery-storefronts/wordpress-app/"));
assert.ok(architecture.includes("dedicated Neon project"));
assert.ok(architecture.includes("Halal Food's Supabase database"));
assert.ok(architecture.includes("must not connect WordPress Studio"));
assert.ok(!architecture.includes("GitHub source repository:** `faysaltalukder/halalfood`"));
assert.ok(!shared.includes('["wordpress","layout","WordPress"'));
assert.ok(!shared.includes("wordpressBusinessCategories"));
assert.ok(!shared.includes("wordpress-templates.html"));

for (const route of [
  "../admin/wordpress.html",
  "../admin/wordpress-live.html",
  "../admin/wordpress-templates.html",
  "../admin/website-builder.html"
]) {
  const page = read(route);
  assert.ok(page.includes(studioUrl), "Legacy route must point to the independent Studio: " + route);
  assert.ok(page.includes("window.location.replace"), "Legacy route must use a full-page redirect: " + route);
}

console.log("WordPress isolation contract passed: Halal Food owns Supabase; the independent Studio owns Neon and its deployment; legacy routes only redirect.");

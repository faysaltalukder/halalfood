import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const orderHtml = read("order.html");
const mainJs = read("js/main.js");
const productsData = read("js/products-data.js");
const liveCatalog = read("js/live-catalog.js");
const incompleteCheckout = read("js/incomplete-checkout.js");

// Emulate the browser's script raw-text parsing: while a script is open,
// apparent nested <script> strings are text until the first matching </script>.
function readActualScriptTags(html) {
  const opening = /<script\b[^>]*>/ig;
  const closing = /<\/script\s*>/ig;
  const tags = [];
  let match;
  while ((match = opening.exec(html))) {
    closing.lastIndex = opening.lastIndex;
    const end = closing.exec(html);
    assert.ok(end, "An opening script tag must always have a closing </script> tag.");
    tags.push(match[0]);
    opening.lastIndex = end.index + end[0].length;
  }
  return tags;
}

const tags = readActualScriptTags(orderHtml);
const externalScripts = tags.map(tag => {
  const match = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : null;
}).filter(Boolean);

const requiredInOrder = [
  "js/cart.js",
  "js/products-data.js",
  "js/store-config.js",
  "js/main.js",
  "js/incomplete-checkout.js",
  "js/products-index.js",
  "js/live-catalog.js"
];
const actualIndexes = requiredInOrder.map(path => externalScripts.findIndex(src => {
  try { return new URL(src, "https://example.test/").pathname.endsWith("/" + path); }
  catch { return src.split("?")[0] === path; }
}));
for (let i = 0; i < requiredInOrder.length; i++) {
  assert.ok(actualIndexes[i] >= 0, "The browser must actually load " + requiredInOrder[i] + " on the order page.");
  if (i) assert.ok(actualIndexes[i] > actualIndexes[i - 1],
    "Checkout dependencies must load in order: " + requiredInOrder.join(" → "));
}

const mainScriptTag = tags.find(tag => /\bsrc\s*=\s*["'][^"']*js\/main\.js(?:\?|["'])/i.test(tag));
assert.ok(mainScriptTag, "The real main.js script element must not be swallowed as text inside another script.");
const mainScriptSrc = mainScriptTag.match(/\\bsrc\\s*=\\s*["']([^"']+)["']/i)?.[1] ?? "";
const mainScriptUrl = new URL(mainScriptSrc, "https://example.test/");
const mainScriptCacheKey = mainScriptUrl.searchParams.get("v");
assert.ok(mainScriptCacheKey && /^\\d{8}-[a-z0-9-]+$/i.test(mainScriptCacheKey),
  "Checkout main.js must have a dated, non-empty cache key so browsers stop reusing stale script responses.");

// The page must retain the complete product -> selection -> order submission path.
assert.ok(mainJs.includes('document.querySelector("#order-form")'), "main.js must initialize the order form.");
assert.ok(mainJs.includes('new URLSearchParams(window.location.search)'), "The selected product URL parameter must be read.");
assert.ok(mainJs.includes('params.get("product")'), "Single-product checkout must read the product parameter.");
assert.ok(mainJs.includes("source.find((item)"), "A selected product must resolve against the current product catalogue.");
assert.ok(mainJs.includes('functions/v1/order-sync'), "The final checkout submission must reach the authoritative Supabase order endpoint.");
assert.ok(mainJs.includes("singleProductUnavailable") && mainJs.includes("Price unavailable"),
  "Unavailable products must fail visibly instead of submitting a zero-value order.");
assert.ok(mainJs.includes('form.addEventListener("submit"'), "The order form must have an active submit handler.");
assert.ok(mainJs.includes("data.items = [{") && mainJs.includes("singleUnitPrice"),
  "Single-product order payload must include the selected product, quantity and unit price.");

assert.ok(productsData.includes('"slug": "black-seed-honey"') && productsData.includes('"name": "Black Seed Honey"'),
  "The known Black Seed Honey regression product must remain available in the static fallback catalogue.");
assert.ok(liveCatalog.includes("HALAL_LIVE_CATALOG_READY") && liveCatalog.includes("halalcatalog:updated"),
  "Live catalogue readiness and updates must remain integrated with checkout.");
assert.ok(incompleteCheckout.includes('document.getElementById("order-form")'),
  "Incomplete-checkout recovery must still bind to the order form.");

const formTag = orderHtml.match(/<form\b[^>]*\bid=["']order-form["'][^>]*>/i);
assert.ok(formTag, "Order page must retain the expected order form.");
assert.match(orderHtml, /id=["']order-submit["'][^>]*type=["']submit["']|type=["']submit["'][^>]*id=["']order-submit["']/i,
  "The Submit Order button must submit the form.");

console.log("Storefront checkout checks passed: all actual script tags close correctly, dependencies load in order, selected product resolves, and Supabase submission is wired.");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync("supabase/functions/order-track/index.ts", "utf8");
const page = readFileSync("track-order.html", "utf8");

// Tracking credentials must never be placed in a URL, browser history, or URL access logs.
assert.match(edge, /req\.method !== "POST"/);
assert.match(edge, /"Access-Control-Allow-Methods": "POST, OPTIONS"/);
assert.doesNotMatch(edge, /searchParams\.get\(["'](?:orderId|mobile)["']\)/);
assert.match(edge, /JSON\.parse\(rawBody\)/);
assert.match(edge, /rawBody\.length > 2048/);
assert.match(edge, /contentType\.toLowerCase\(\)\.includes\(["']application\/json["']\)/);

// The customer-facing page keeps its existing form and rendering contract, changing only transport.
assert.match(page, /fetch\(API,\{method:"POST"/);
assert.match(page, /JSON\.stringify\(\{orderId:id,mobile\}\)/);
assert.doesNotMatch(page, /API\s*\+\s*["']\?orderId=/);
for (const selector of ["#track-form", "#r-id", "#r-name", "#r-total", "#timeline", "#items"]) {
  assert.ok(page.includes(selector), `Missing existing tracking UI contract: ${selector}`);
}

console.log("Order tracking privacy contract checks passed.");

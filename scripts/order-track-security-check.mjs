import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edge = readFileSync("supabase/functions/order-track/index.ts", "utf8");
const page = readFileSync("track-order.html", "utf8");
const incomplete = readFileSync("supabase/functions/incomplete-checkout/index.ts", "utf8");
const analytics = readFileSync("supabase/functions/analytics-ingest/index.ts", "utf8");
const customerCare = readFileSync("supabase/functions/customer-care-chat/index.ts", "utf8");
const rateLimit = readFileSync("supabase/functions/_shared/rate-limit.ts", "utf8");
const rateLimitMigration = readFileSync("supabase/migrations/20261105100000_edge_rate_limit_foundation.sql", "utf8");
const idempotencyMigration = readFileSync("supabase/migrations/20261105103000_order_checkout_idempotency.sql", "utf8");
const orderSync = readFileSync("supabase/functions/order-sync/index.ts", "utf8");
const marketingEmail = readFileSync("supabase/functions/marketing-email/index.ts", "utf8");
const marketingUnsubscribe = readFileSync("supabase/functions/marketing-unsubscribe/index.ts", "utf8");

// Tracking credentials must never be placed in a URL, browser history, or URL access logs.
assert.match(edge, /req\.method !== "POST"/);
assert.match(edge, /"Access-Control-Allow-Methods": "POST, OPTIONS"/);
assert.doesNotMatch(edge, /searchParams\.get\(["'](?:orderId|mobile)["']\)/);
assert.match(edge, /JSON\.parse\(rawBody\)/);
assert.match(edge, /TextEncoder\(\)\.encode\(rawBody\)\.byteLength > 2048/);
assert.match(edge, /contentType\.toLowerCase\(\)\.includes\(["']application\/json["']\)/);

// The customer-facing page keeps its existing form and rendering contract, changing only transport.
assert.match(page, /fetch\(API,\{method:"POST"/);
assert.match(page, /JSON\.stringify\(\{orderId:id,mobile\}\)/);
assert.doesNotMatch(page, /API\s*\+\s*["']\?orderId=/);
for (const selector of ["#track-form", "#r-id", "#r-name", "#r-total", "#timeline", "#items"]) {
  assert.ok(page.includes(selector), `Missing existing tracking UI contract: ${selector}`);
}

// Public edge entrypoints use the shared private atomic limiter without storing raw identifiers.
assert.match(rateLimit, /HMAC/);
assert.match(rateLimit, /consume_edge_rate_limit/);
assert.match(rateLimitMigration, /SECURITY DEFINER/);
assert.match(rateLimitMigration, /SET search_path = ''/);
assert.ok(rateLimitMigration.includes("GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit"));
assert.ok(rateLimitMigration.includes("TO service_role"));
assert.ok(idempotencyMigration.includes("checkout_session_id"));
assert.ok(idempotencyMigration.includes("checkout_request_hash"));
assert.ok(idempotencyMigration.includes("FOR v_attempt IN 1..30 LOOP"));
assert.ok(idempotencyMigration.includes("If it collides with another order"));
assert.match(orderSync, /riskSignal\.order_number = data\.orderId/);
assert.match(orderSync, /CHECKOUT_SESSION_CONFLICT/);
assert.match(incomplete, /reserveEdgeRateLimit/);
assert.match(incomplete, /incomplete-checkout-session/);
assert.match(analytics, /reserveEdgeRateLimit/);
assert.match(analytics, /analytics-ingest-ip/);
assert.match(customerCare, /reserveEdgeRateLimitRest/);
assert.match(customerCare, /customer-care-visitor/);
assert.match(marketingEmail, /async function requireAdmin/);
assert.match(marketingEmail, /claims\.aal !== "aal2"/);
assert.match(marketingUnsubscribe, /unsubscribe_token_hash/);
assert.match(marketingUnsubscribe, /token.length < 80/);

console.log("Order tracking and backend rate-limit security contract checks passed.");

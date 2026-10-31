import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "admin/pos.html",
  "admin/pos.css",
  "admin/pos.js",
  "admin/shared.js",
  "admin/app.js",
  "supabase/migrations/20261031044407_create_offline_pos_sales.sql",
  "supabase/migrations/20261031045058_harden_offline_pos_with_invoker_rls.sql",
  "supabase/migrations/20261031051527_interactive_pos_simple_sale_form.sql",
  "supabase/migrations/20261031055535_create_manual_delivery_order_from_pos.sql",
  "supabase/functions/courier-integration/index.ts",
];
const failures = [];
for (const file of required) {
  if (!existsSync(resolve(root, file))) failures.push("Missing POS source: " + file);
}
const read = (file) => readFileSync(resolve(root, file), "utf8");
if (!failures.length) {
  const page = read("admin/pos.html");
  const js = read("admin/pos.js");
  const shared = read("admin/shared.js");
  const app = read("admin/app.js");
  const offline = read("supabase/migrations/20261031051527_interactive_pos_simple_sale_form.sql");
  const delivery = read("supabase/migrations/20261031055535_create_manual_delivery_order_from_pos.sql");
  const courier = read("supabase/functions/courier-integration/index.ts");
  const checks = [
    [page.includes('data-page="pos"'), "POS page must use data-page=pos."],
    [page.includes('id="posProductList"') && page.includes('id="posSaleForm"') && page.includes('id="posHistoryBody"'), "POS product, sale form and product history are required."],
    [page.includes('data-pos-mode="offline"') && page.includes('data-pos-mode="delivery"'), "POS must expose direct-sale and delivery-order modes."],
    [page.includes('id="posOrderCartBody"') && page.includes('id="posDeliveryAddress"') && page.includes('id="posOrderChannel"'), "Delivery mode must support multiple products, an address and an order channel."],
    [page.includes('id="posCourierProvider"') && page.includes('id="posBookCourierNow"') && page.includes('id="posRedxArea"'), "Delivery mode must support an optional courier and explicit booking."],
    [!page.includes('type="file"') && !page.toLowerCase().includes("csv import") && !page.includes("posImportSection"), "POS UI must not expose the old CSV import workflow."],
    [shared.includes('"pos","pos","POS Management"'), "POS Management must remain in admin navigation."],
    [app.includes("window.HFPosInit"), "Admin dispatcher must initialize the POS module."],
    [js.includes("async function saveOfflineSale") && js.includes('client.rpc("create_offline_pos_sale"'), "Offline sale must use its atomic database RPC."],
    [js.includes("async function saveDeliveryOrder") && js.includes('client.rpc("create_manual_delivery_order"'), "Manual delivery order must use its atomic database RPC."],
    [js.includes('client.functions.invoke("courier-integration"') && js.includes('action:"book"'), "Courier booking must use the existing courier integration function."],
    [js.includes('action:"areas"') && js.includes('provider:"redx"'), "REDX area selection must use the Production area lookup."],
    [js.includes("payment_received:paid") && js.includes("courier_provider:provider"), "Payment status and optional courier provider must be persisted."],
    [js.includes("order_reference:pendingReference") && js.includes("crypto.getRandomValues"), "Manual delivery order reference must be generated internally and be retry-safe."],
    [js.includes("fetchFinance(null,3000)") && js.includes('payment?.status==="confirmed"'), "POS history must read linked Finance status."],
    [!js.includes("fbq(") && !js.includes("gtag("), "Manual POS actions must not emit website pixel/GA events."],
    [offline.includes("SECURITY INVOKER") && offline.includes("aal2"), "Offline POS RPC must retain MFA and invoker security."],
    [delivery.includes("SECURITY INVOKER") && delivery.includes("aal2"), "Manual delivery RPC must require admin MFA and invoker security."],
    [delivery.includes("'order_reserve'") && delivery.includes("admin_shipments"), "Delivery RPC must reserve stock and atomically create an optional courier parcel."],
    [delivery.includes("admin_finance_entries") && delivery.includes("'Manual Delivery Order'"), "Delivery RPC must create one linked Finance entry."],
    [delivery.includes("'processing'") && delivery.includes("'manual_'"), "Manual confirmed orders must enter the normal Orders workflow."],
    [delivery.includes("redx_delivery_area_id") && delivery.includes("v_redx_area_id IS NULL"), "REDX courier parcel must require a selected Production area ID."],
    [courier.includes('action === "book"') && courier.includes("Only Cash on Delivery orders are enabled for courier booking."), "The POS must preserve the courier API's COD-only booking guard."],
  ];
  for (const [ok, message] of checks) if (!ok) failures.push(message);
}
if (failures.length) {
  for (const failure of failures) console.error("FAIL: " + failure);
  process.exitCode = 1;
} else {
  console.log("POS offline sale + manual delivery order contract checks passed.");
}

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
  const migration = read("supabase/migrations/20261031051527_interactive_pos_simple_sale_form.sql");
  const checks = [
    [page.includes('data-page="pos"'), "POS page must use data-page=pos."],
    [page.includes('id="posProductList"') && page.includes('id="posSaleForm"') && page.includes('id="posHistoryBody"'), "POS product, sale form and product history are required."],
    [!page.includes('type="file"') && !page.toLowerCase().includes("csv import") && !page.includes("posImportSection"), "POS UI must not expose the old CSV import workflow."],
    [shared.includes('"pos","pos","POS Management"'), "POS Management must remain in admin navigation."],
    [app.includes("window.HFPosInit"), "Admin dispatcher must initialize the POS module."],
    [js.includes("async function saveSale") && js.includes('client.rpc("create_offline_pos_sale"'), "Saving a sale must use the atomic database RPC."],
    [js.includes("sale_time:time") && js.includes("payment_received:paid"), "The sale date/time and payment status must be saved."],
    [js.includes("adjust_stock:adjustStock") && js.includes("const adjustStock=true"), "Tracked stock must be updated automatically."],
    [js.includes("referenceFor(date)") && js.includes("crypto.getRandomValues"), "POS reference must be generated internally."],
    [js.includes("fetchFinance(null,3000)") && js.includes('payment?.status==="confirmed"'), "POS history must read the central finance ledger and show confirmed payment status."],
    [js.includes("offline_pos") && !js.includes("fbq(") && !js.includes("gtag("), "Offline sales must not emit website pixel/GA events."],
    [migration.includes("SECURITY INVOKER") && migration.includes("aal2"), "POS RPC must retain MFA-gated caller privileges."],
    [migration.includes("inventory_movements") && migration.includes("'pos_sale'"), "POS RPC must record tracked inventory movement."],
    [migration.includes("admin_finance_entries") && migration.includes("'Offline POS Sale'"), "POS RPC must create a linked finance income entry."],
    [migration.includes("v_sale_time") && migration.includes("v_sale_date::timestamp + v_sale_time"), "POS RPC must persist the entered sale time."],
    [migration.includes("round(v_quantity, 3)") && migration.includes("Packaged products and pieces"), "POS RPC must support fractional kg/liter sales and whole packaged units."],
  ];
  for (const [ok, message] of checks) if (!ok) failures.push(message);
}
if (failures.length) {
  for (const failure of failures) console.error("FAIL: " + failure);
  process.exitCode = 1;
} else {
  console.log("Simple offline POS sale-entry contract checks passed.");
}

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
  const migration = read("supabase/migrations/20261031044407_create_offline_pos_sales.sql");
  const checks = [
    [page.includes('data-page="pos"'), "POS page must use data-page=pos."],
    [page.includes('id="posImportSection"') && page.includes('id="posRecentSection"'), "POS import and history sections are required."],
    [shared.includes('"pos","pos","POS Management"'), "POS Management must be in the admin navigation."],
    [app.includes('window.HFPosInit'), "Admin dispatcher must initialize the POS module."],
    [js.includes("const parseCsv") && js.includes("function buildGroups"), "CSV parsing and grouping must be implemented."],
    [js.includes('client.rpc("create_offline_pos_sale"'), "POS imports must use the atomic database RPC."],
    [js.includes("POS-") && js.toLowerCase().includes("already imported"), "The UI must communicate POS duplicate protection."],
    [migration.includes("SECURITY DEFINER") && migration.includes("aal2"), "The database RPC must enforce admin MFA."],
    [migration.includes("inventory_movements") && migration.includes("'pos_sale'"), "The database RPC must write POS stock movements."],
    [migration.includes("admin_finance_entries") && migration.includes("'Offline POS Sale'"), "The database RPC must create a linked finance entry."],
    [!js.includes("fbq('track', 'Purchase'") && !js.includes("gtag('event', 'purchase'"), "Offline POS must not emit website Purchase tracking."],
  ];
  for (const [ok, message] of checks) if (!ok) failures.push(message);
}
if (failures.length) {
  for (const failure of failures) console.error("FAIL: " + failure);
  process.exitCode = 1;
} else {
  console.log("Offline POS contract guard passed.");
}

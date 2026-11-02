import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const html = read("admin/finance.html");
const app = read("admin/app.js");
const css = read("admin/finance-cashflow-workspace.css");
const supplierSync = read("supabase/migrations/20261102053037_finance_supplier_account_link_v1.sql");
const supplierBackfill = read("supabase/migrations/20261102053526_finance_supplier_account_backfill_v1.sql");
const workspaceMigration = read("supabase/migrations/20261102052408_finance_cashflow_workspace_v1.sql");

const sections = [
  ["financeOverviewSection", "Overview"],
  ["financeTransactionsSection", "Transactions"],
  ["financeAccountsSection", "Cash & Accounts"],
  ["financeCodSection", "Order & COD"],
  ["financeReportsSection", "Reports & Insights"],
];
for (const [id, label] of sections) {
  assert.ok(html.includes('id="' + id + '"'), "Finance workspace is missing " + label + ".");
  assert.ok(html.includes('href="#' + id + '"'), "Finance navigation is missing " + label + ".");
}
assert.equal((html.match(/class="hf-workspace-nav-item"/g) || []).length, 5, "Finance must retain exactly five primary workspaces.");
assert.ok(html.includes('id="financeDateFrom"') && html.includes('id="financeDateTo"'), "Ledger date filters must be available.");
assert.ok(html.includes('finance-cashflow-workspace.css?v=20261102-finance-cashflow-v1'), "Finance CSS must load with a cache-busted URL.");
assert.ok(html.includes('shared.js?v=20261102-solar-lunar-v1'), "Shared Admin shell cache key must remain consistent with the rest of the dashboard.");
assert.ok(html.includes("manual records only") || html.includes("Manual records only"), "Finance must disclose its manual testing-mode data limits.");

const staticIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(staticIds).size, staticIds.length, "Finance page must not contain duplicate static IDs.");
const tableCount = (html.match(/<table\b/g) || []).length;
const wrappedTableCount = (html.match(/class="hf-table-wrap"/g) || []).length;
assert.equal(wrappedTableCount, tableCount, "Every Finance data table must have a responsive wrapper.");

const financeStart = app.indexOf("async function initFinance()");
const financeEnd = app.indexOf("\n async function initReports()", financeStart);
assert.ok(financeStart >= 0 && financeEnd > financeStart, "Finance route must have a separate initializer.");
const financeApp = app.slice(financeStart, financeEnd);
assert.ok(app.includes("finance:initFinance"), "Shared route registry must invoke the Finance initializer.");
for (const table of ["admin_finance_entries","admin_finance_accounts","admin_finance_transfers","admin_finance_budgets","admin_cod_settlements","admin_supplier_balances"]) {
  assert.ok(financeApp.includes(table), "Finance initializer must load " + table + ".");
}
for (const action of ["financeForm","financeAccountForm","financeTransferForm","financeCodForm","financeBudgetForm"]) {
  assert.ok(financeApp.includes(action), "Finance write workflow is missing " + action + ".");
}
assert.ok(financeApp.includes("filteredLedgerEntries") && financeApp.includes("financeDateFrom") && financeApp.includes("financeDateTo"), "Ledger filters and CSV export must share the selected date range.");
assert.ok(financeApp.includes("related_supplier_payment_id") && financeApp.includes("related_cod_settlement_id"), "Source-managed finance entries must be protected from generic ledger edits.");
assert.ok(financeApp.includes("financial_class") && html.includes('value="capital"') && html.includes('value="loan"') && html.includes('value="refund"') && html.includes('value="adjustment"'), "Capital, loans and refunds must remain distinguishable from ordinary operating activity.");
assert.ok(financeApp.includes('status==="reconciled"') && financeApp.includes("remitted_account_id") && financeApp.includes("remitted_at"), "COD reconciliation must require verified remittance fields.");
assert.ok(financeApp.includes("Confirm this transfer only after the money has actually moved"), "Transfers must require a human verification step before affecting balances.");
assert.ok(financeApp.includes("admin_supplier_balances"), "Supplier payables should reuse the Supplier workspace balance source.");
assert.ok(financeApp.includes("Account balances") || financeApp.includes("accountBalance"), "Balances must be derived from source movements, not hardcoded totals.");
assert.ok(!financeApp.includes("grossProfit") && !financeApp.includes("profitMargin"), "Do not present a profit figure without verified cost-of-goods data.");

for (const table of ["admin_finance_accounts","admin_finance_transfers","admin_finance_budgets","admin_cod_settlements"]) {
  assert.ok(workspaceMigration.includes("create table if not exists public." + table), "Migration must create " + table + ".");
  assert.ok(workspaceMigration.includes("alter table public." + table + " enable row level security"), table + " must have RLS enabled.");
}
assert.ok(workspaceMigration.includes("aal2") && workspaceMigration.includes("halalfoodbd.official@gmail.com"), "Finance data access must retain admin email and MFA protections.");
assert.ok(workspaceMigration.includes("admin_cod_settlement_sync") || workspaceMigration.includes("app.cod_settlement_sync"), "COD ledger sync must be guarded as a source-managed write.");
assert.ok(workspaceMigration.includes("related_cod_settlement_id") && workspaceMigration.includes("on conflict (related_cod_settlement_id)"), "COD remittance must be linked once without duplicate ledger rows.");
assert.ok(workspaceMigration.includes("status='reconciled'") && workspaceMigration.includes("status='void'"), "Only reconciled COD remittances may count as income; reversal must void its generated row.");
assert.ok(workspaceMigration.includes("admin_finance_transfer_distinct_accounts") && workspaceMigration.includes("status in ('draft','confirmed','void')"), "Transfers must have distinct accounts and controlled states.");
assert.ok(!/\b(drop table|truncate|delete from)\b/i.test(workspaceMigration + supplierSync), "Finance migrations must remain additive and non-destructive.");

assert.ok(supplierSync.includes("sync_supplier_payment_finance_entry") && supplierSync.includes("related_supplier_payment_id"), "Supplier payment sync must keep one source-linked finance row.");
assert.ok(supplierSync.includes("paid_from_account") && supplierSync.includes("account_reference"), "Supplier cash outflows must map to a Finance account only through an exact account-name/reference match.");
assert.ok(supplierSync.includes("set_admin_finance_accounts_updated_at") && supplierSync.includes("set_admin_cod_settlements_updated_at"), "Finance workspace records must keep updated_at timestamps current.");
assert.ok(supplierBackfill.includes("assign_existing_supplier_payment_finance_account") && supplierBackfill.includes("security invoker") && supplierBackfill.includes("paid_from_account"), "Adding a Finance account must map existing Supplier Payments only through an invoker-safe exact-match trigger.");

assert.ok(css.includes("@media(max-width:560px)") && css.includes(".hf-finance-accounts-grid") && css.includes(".hf-finance-budget-form"), "Finance workspace must adapt to mobile layouts.");
assert.ok(css.includes("html[data-admin-theme=\"light\"]") && css.includes("prefers-reduced-motion"), "Finance styling must support light theme and reduced motion.");
assert.ok(!/(?:#000000|#000)(?![0-9a-f])/i.test(css), "Finance UI should avoid pure-black panels and text.");

console.log("Finance & Cash Flow workspace checks passed: five workspaces, responsive tables, filters, transaction/account/transfer/COD/budget workflows, MFA/RLS guards, one-time COD sync, supplier integration, additive migrations and mobile styling.");

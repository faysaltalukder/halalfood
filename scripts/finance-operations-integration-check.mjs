import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = path => readFileSync(join(root, path), "utf8");
const html = read("admin/finance.html");
const app = read("admin/app.js");
const core = read("admin/finance-accounting-core.js");
const css = read("admin/finance-accounting-core.css");
const migration = read("supabase/migrations/20261103032700_finance_operations_accounting_integration_v1.sql");

assert.ok(html.includes('data-finance-accounting-tab="operations"'), "Operational Integration must be a tab inside Accounting.");
assert.equal((html.match(/class="hf-workspace-nav-item"/g) || []).length, 5, "Finance must keep exactly five existing primary workspaces.");
assert.ok(html.includes('id="financeOperationsIntegrity"'), "Operational source integrity notice is required.");
for (const id of [
  "financeOpsCashbookBody","financeOpsSalesBody","financeOpsCodBody","financeOpsSupplierBody",
  "financeOpsOpeningBody","financeOpsCogsBody","financeOpsCreditNotesBody","financeOpsRefundBody",
  "financeOpsProfitBody","financeOperationalPostDialog","financeOperationalCashAccount"
]) assert.ok(html.includes('id="' + id + '"'), "Missing Phase 2 operational UI: " + id);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, "Finance page must not have duplicate IDs.");
assert.ok(html.includes('finance-accounting-core.js?v=20261103-phase2-operations-v2'), "Phase 2 JS asset must be cache-busted.");
assert.ok(html.includes('finance-accounting-core.css?v=20261103-phase2-operations-v2'), "Phase 2 CSS asset must be cache-busted.");
assert.ok(html.includes("No historical transaction is automatically posted") || html.includes("No historical transaction is auto"), "The UI must disclose that historical entries are not auto-posted.");

for (const fn of [
  "admin_finance_post_cashbook_entry","admin_finance_reverse_cashbook_entry",
  "admin_finance_post_account_opening_balance","admin_finance_confirm_transfer","admin_finance_void_transfer",
  "admin_finance_recognize_delivered_order_sale","admin_finance_post_cod_settlement","admin_finance_reverse_cod_settlement",
  "admin_finance_post_supplier_bill","admin_finance_post_supplier_payment","admin_finance_post_supplier_credit_note",
  "admin_finance_post_customer_refund","admin_finance_reverse_customer_refund","admin_finance_post_order_cogs"
]) assert.ok(migration.includes("function public." + fn), "Phase 2 SQL function missing: " + fn);

for (const table of [
  "admin_finance_accounts","admin_finance_entries","admin_finance_transfers","admin_cod_settlements",
  "admin_supplier_bills","admin_supplier_payments","admin_supplier_credit_notes","admin_return_requests"
]) assert.ok(migration.includes("alter table public." + table), "Source accounting link missing for " + table + ".");

assert.ok(migration.includes("admin_inventory_cost_layers"), "GRN landed-cost layers must be stored.");
assert.ok(migration.includes("private.capture_admin_inventory_cost_layer"), "GRN landed-cost capture must run on the server.");
assert.ok(migration.includes("after insert on public.admin_purchase_receipt_items"), "Accepted GRN items must create an immutable landed-cost layer.");
assert.ok(migration.includes("grant select on public.admin_inventory_cost_layers to authenticated"), "Verified admin must be able to read cost layers.");
assert.ok(migration.includes("revoke all on public.admin_inventory_cost_layers from public,anon,authenticated"), "No direct public/authenticated writes to landed-cost layers.");
assert.ok(migration.includes("admin_finance_product_profitability"), "Delivered sales profitability view must exist.");
assert.ok(migration.includes("security_invoker=true"), "Operational accounting views must respect caller access and RLS.");

assert.ok(migration.includes("v_outstanding:=greatest(0,round(v_bill.total_amount-v_prior_payments-v_prior_credits,2))"), "Supplier payment allocations must net prior payments and supplier credit notes.");
assert.ok(migration.includes("v_advance_debit:=v_advance_debit+greatest(0,round(v_payment.amount-v_allocated,2))"), "Overpaid/unallocated supplier money must become an advance.");
assert.ok(migration.includes("Accepted GRN stock and its landed cost layer exist"), "Bill reversal must protect received stock valuation.");
assert.ok(migration.includes("supplier credit notes"), "Bill reversal must protect linked supplier credit notes.");
assert.ok(migration.includes("A cashbook transaction is posted") || migration.includes("This transaction is posted to accounting"), "Posted cashbook records must be immutable.");
assert.ok(migration.includes("Customer refund") && migration.includes("Actual refund paid"), "Customer refund journal must debit sales returns and credit the actual payment account.");
assert.ok(migration.includes("This COD settlement is posted to accounting") || migration.includes("COD remittance Journal"), "COD settlement must have controlled remittance reversal.");
assert.ok(migration.includes("manual") && migration.includes("weighted_average"), "Product costing must expose manual and landed-cost weighted-average sources.");
assert.ok(migration.includes("cl.created_at<=coalesce(v_order.updated_at,v_order.ordered_at)") && migration.includes("cl.created_at<=coalesce(o.updated_at,o.ordered_at)"), "Historical COGS and product margin must not use landed-cost layers created after the order's recorded delivery/update time.");
assert.ok(migration.includes("Purchase Order line gross total does not match its saved subtotal") && migration.includes("Purchase Order total does not reconcile"), "Supplier Bill posting must validate Purchase Order arithmetic before journal posting.");
assert.ok(migration.includes("Supplier Bill total does not reconcile to subtotal, discount, additional charges and tax"), "Supplier Bill totals must reconcile before posting.");
assert.ok(migration.includes("A landed-cost layer can be created only for an existing Confirmed Goods Received Note"), "Only confirmed GRNs may create inventory landed-cost layers.");
assert.ok(migration.includes("order_sale") && migration.includes("Courier Clearing"), "Delivered COD revenue and courier clearing must be distinct from remittance.");
assert.ok(!/insert\s+into\s+public\.admin_finance_journal_entries\s*\([^)]*select/i.test(migration), "No historical source rows may be automatically journalized.");
assert.ok(!/\b(drop table|truncate|delete from public\.(?:admin_finance_entries|orders|admin_supplier_bills|admin_supplier_payments))\b/i.test(migration), "Phase 2 migration must not delete or truncate operational data.");

assert.ok(core.includes("renderOperationalIntegration") && core.includes("submitOperationalPosting"), "Operational queues and posting handler must be wired.");
assert.ok(core.includes("financeOpsCreditNotesBody") && core.includes("financeOpsRefundBody"), "Supplier credits and customer refunds must have their own queues.");
assert.ok(core.includes("admin_finance_reverse_cod_settlement"), "COD reversal must be available from the operational queue.");
assert.ok(core.includes("admin_finance_post_supplier_payment"), "Supplier payment posting must be available from the operational queue.");
assert.ok(core.includes("financeAccountLedgerId"), "Cash/bank/wallet accounts must map to an Asset account.");
assert.ok(core.includes("financeOperationsRefresh"), "Operational queue must be refreshable.");
assert.ok(core.includes("Historical test records are not automatically posted"), "The queue must disclose that historical records are not auto-posted.");
assert.ok(app.includes("admin_finance_confirm_transfer") && app.includes("admin_finance_void_transfer"), "Transfers must confirm and reverse through server RPCs.");
assert.ok(app.includes("data-post-cod") && app.includes("data-reverse-cod"), "COD screen must expose post and reverse controls.");
assert.ok(app.includes("Reverse only the COD remittance journal"), "COD reversal UX must not imply that the delivered sale is also reversed.");
assert.ok(css.includes("@media(max-width:640px)") && css.includes("@media(max-width:900px)"), "Operational UI must be responsive.");

console.log("Finance Phase 2 checks passed: cashbook and account mapping, transfer journals, delivered sale/AR, COD clearing, supplier AP/payment/credit note, customer refund, GRN landed cost, COGS and profitability.");

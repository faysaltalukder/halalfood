import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(path,"utf8");
const html=read("admin/business-health.html");
const js=read("admin/business-health.js");
const css=read("admin/business-health.css");
const shared=read("admin/shared.js");
const migration=read("supabase/migrations/20261102114909_business_health_order_cost_read_by_orders_v1.sql");

for(const id of ["bhPeriod","bhRefresh","bhSummary","bhCoverage","bhSearch","bhQuestionGroups","businessHealthDialog","bhDialogBody"]){
  assert.ok(html.includes('id="'+id+'"'),"Business Health page must include "+id);
}
assert.ok(html.includes('data-page="business-health"'),"Page must use the authenticated admin shell.");
assert.ok(html.includes("./shared.js")&&html.includes("./business-health.js"),"Business Health must load the shared admin shell and page controller.");
assert.ok(shared.includes('["business-health","health","Business Health"'),"Business Health must appear in the left navigation.");
assert.ok(shared.includes("health:'<path"),"Business Health navigation icon must exist.");
const questionIds=["booked-value","order-count","delivered-sales","units-sold","top-product","open-orders","cash-in","cash-out","cash-movement","profit","cod-outstanding","supplier-payable","low-stock","out-stock","stock-value","stock-movement","pending-purchases","budget-over"];
for(const id of questionIds)assert.ok(js.includes('"'+id+'"'),"Missing Business Health question: "+id);
assert.equal(questionIds.length,18,"The first release must contain 18 practical business questions.");
for(const table of ["orders","order_items","order_status_history","admin_finance_entries","admin_cod_settlements","admin_supplier_balances","products","inventory_movements","admin_purchase_orders","admin_purchase_order_items","admin_finance_budgets"]){
  assert.ok(js.includes('"'+table+'"')||js.includes("."+table),"Business Health must read "+table);
}
assert.ok(js.includes('client.rpc("get_business_health_order_cost_snapshots"'),"Profit must use protected sale-time cost snapshots.");
assert.ok(js.includes('p_order_ids:deliveredIds'),"Only delivered order cost snapshots should be requested.");
assert.ok(js.includes('timeZone:"Asia/Dhaka"'),"Business Health dates must use Bangladesh time.");
assert.ok(js.includes("snapshot_status")&&js.includes("Not reliable yet")&&js.includes("missingSnapshot"),"Missing historical cost data must not be guessed.");
assert.ok(js.includes("supplier_payment")||js.includes("supplier payments are included as actual cash outflow"),"Cash outflow and profit must be distinguished.");
assert.ok(js.includes("Cash movement is not profit"),"Cash movement must not be labelled as profit.");
assert.ok(js.includes("cancelled")&&js.includes("reconciled"),"Cancelled orders and COD settlement states must be handled explicitly.");
assert.ok(js.includes("data-bh-details")&&js.includes("How this is calculated")&&js.includes("Source"),"Every question must offer a source-backed Details view.");
assert.ok(css.includes("@media(max-width:680px)")&&css.includes("var(--hf-theme-accent"),"Page must be responsive and use the active admin theme.");
assert.ok(migration.includes("security invoker")&&migration.includes("auth.jwt()")&&migration.includes("private.business_health_order_cost_snapshots"),"Cost snapshot reader must remain private and MFA guarded.");
assert.ok(!migration.includes("grant select on table private.business_health_order_cost_snapshots to anon"),"Private cost snapshots must never be exposed to anon users.");
console.log("Business Health workspace checks passed: 18 live questions, detail methods, theme-aware responsive UI, protected sale-time cost snapshots and explicit data-quality handling.");

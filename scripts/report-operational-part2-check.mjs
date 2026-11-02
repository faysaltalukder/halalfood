import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root=process.cwd();
const read=path=>readFileSync(join(root,path),"utf8");
const app=read("admin/app.js");
const css=read("admin/reports-settings.css");
const workflow=read(".github/workflows/architecture-quality.yml");

assert.doesNotThrow(()=>new Function(app),"Admin app JavaScript must parse.");
const start=app.indexOf("async function initReports()");
const end=app.indexOf("async function initSettings()",start);
assert.ok(start>=0&&end>start,"Reports must remain isolated inside initReports.");
const reports=app.slice(start,end);
const buildStart=reports.indexOf("async function buildReport()");
const buildEnd=reports.indexOf("const defaultColumns=",buildStart);
assert.ok(buildStart>=0&&buildEnd>buildStart,"Active report builder and default columns must exist.");
const builder=reports.slice(buildStart,buildEnd);
const insightsStart=reports.lastIndexOf("function insightsFor(type,rows,source){");
const insightsEnd=reports.indexOf("function renderBars(rows,key){",insightsStart);
assert.ok(insightsStart>=0&&insightsEnd>insightsStart,"Effective Business Insights function must exist.");
const insights=reports.slice(insightsStart,insightsEnd);
const workspaceStart=reports.lastIndexOf("function renderWorkspace(){");
const workspaceEnd=reports.indexOf("function initWorkspace()",workspaceStart);
assert.ok(workspaceStart>=0&&workspaceEnd>workspaceStart,"Effective report workspace renderer must exist.");
const renderer=reports.slice(workspaceStart,workspaceEnd);

assert.ok(renderer.includes('data-report-segment="overview"')&&renderer.includes('data-report-segment="analysis"')&&renderer.includes('data-report-segment="records"')&&renderer.includes('data-report-segment="insights"'),"Every report must expose Overview, Analysis, Records and Business Insights.");
assert.ok(renderer.includes("insightsFor(report.type,report.rows,report.source||{})"),"The Insights panel must render type-specific evidence.");
assert.ok(reports.includes('["overview","analysis","records","insights"]'),"All four segments must be switchable.");

assert.ok(builder.includes("fetchReportSettlements(null)"),"Daily report must read the full settlement snapshot and bucket by collection/remittance event dates.");
assert.ok(builder.includes("cod_remitted_recorded")&&builder.includes("cod_remitted_verified"),"Daily report must distinguish recorded and verified COD remittance.");
assert.ok(builder.includes('e.entry_type||"").toLowerCase()==="income"')&&builder.includes('e.status||"").toLowerCase()==="confirmed"&&e.related_cod_settlement_id'),"Only linked confirmed Finance income may count as verified daily COD remittance.");
assert.ok(insights.includes("রেকর্ডকৃত বনাম যাচাইকৃত COD রেমিট্যান্সে পার্থক্য"),"Daily insights must flag COD reconciliation mismatch.");

assert.ok(builder.includes("const products=await fetchProducts(10000);source.products=products;"),"Product sales must join the live catalogue for current SKU/category/stock context.");
assert.ok(builder.includes("catalogue_status")&&builder.includes("current_stock")&&builder.includes("minimum_stock"),"Product sales rows must expose catalogue match and current stock context.");
assert.ok(insights.includes("বিক্রি হওয়া পণ্য বর্তমানে Out of stock")&&insights.includes("বর্তমান ক্যাটালগে মেলেনি"),"Product sales insights must flag stockouts and unmatched product snapshots.");

for(const token of [
  'type==="business"||type==="sales"',
  'type==="customer-wise-products"',
  'type==="customer-products"||type==="top-customers"||type==="customers"',
  'type==="purchase"',
  'type==="product-purchase"',
  '["low-stock","alert-products","stock","stock-list"].includes(type)',
  'type==="daily"'
])assert.ok(insights.includes(token),"Missing operational insight branch: "+token);
assert.ok(insights.includes("returning")&&insights.includes("expected_date")&&insights.includes("pending_quantity")&&insights.includes("minimum_stock"),"Customer repeat orders, expected-date delays, receiving and stock warnings must be data based.");
assert.ok(css.includes("--hf-theme-card-bg")&&css.includes("--hf-theme-chart-bg")&&css.includes(".hf-report-insight-card"),"Insights must use theme-aware shared report styles.");
assert.ok(workflow.includes("Run Part 2 Operational Reports checks")&&workflow.includes("scripts/report-operational-part2-check.mjs"),"Part 2 regression checks must run in CI.");

console.log("Operational Reports Part 2 checks passed: universal four-segment workspaces, verified-vs-recorded COD reconciliation, current catalogue enrichment for product sales, and evidence-based business/customer/purchase/inventory insights.");

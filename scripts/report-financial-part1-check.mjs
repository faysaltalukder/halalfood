import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const app = read("admin/app.js");
const css = read("admin/reports-settings.css");
const shared = read("admin/shared.js");

const reportsStart = app.indexOf("async function initReports()");
const reportsEnd = app.indexOf("async function initSettings()", reportsStart);
assert.ok(reportsStart >= 0 && reportsEnd > reportsStart, "Report initializer must remain a separate admin route.");
const reports = app.slice(reportsStart, reportsEnd);
const buildStart = reports.indexOf("async function buildReport()");
const buildEnd = reports.indexOf("function renderRecordTable()", buildStart);
assert.ok(buildStart >= 0 && buildEnd > buildStart, "Active report builder must exist.");
const builder = reports.slice(buildStart, buildEnd);

assert.doesNotThrow(() => new Function(app), "Admin app JavaScript must parse.");
assert.ok(reports.includes("async function paginateQuery(buildQuery,limit=10000)"), "Reports must paginate large source tables.");
assert.ok(reports.includes("pageSize=1000") && reports.includes("concurrency=3"), "Pagination should use bounded pages and concurrency.");
assert.ok(reports.includes("order(\"id\",{ascending:true})"), "Report queries need deterministic pagination ordering.");

assert.ok(builder.includes("confirmedPaymentIds"), "Supplier bill payments must be restricted to confirmed supplier payments.");
assert.ok(builder.includes("admin_supplier_credit_notes"), "Supplier Payables must include confirmed supplier credit notes.");
assert.ok(builder.includes("source.supplierBalances=supplierBalances"), "Payables must read the supplier ledger's current balance view.");
assert.ok(builder.includes("confirmed_credit") && builder.includes("supplier_current_balance"), "Payables rows must disclose bill credits and current supplier balance.");

assert.ok(builder.includes("fetchReportSettlements(null)") && builder.includes("fetchReportFinance(null)"), "COD reports must compare the whole settlement snapshot with linked Finance receipts.");
assert.ok(builder.includes('e.entry_type==="income"&&e.status==="confirmed"&&e.related_cod_settlement_id'), "Only linked confirmed Finance income may count as verified COD remittance.");
assert.ok(builder.includes("expected=Math.max(0,collected-fee+adjustment)"), "COD expected net remittance must deduct courier fees and apply recorded adjustments.");
assert.ok(builder.includes("pending_collection") && builder.includes("pending_remittance") && builder.includes("remittance_variance"), "COD reports must separate collection, remittance and variance.");
assert.ok(builder.includes('"receivable"].includes(type)?"Current snapshot"') || builder.includes('"receivable"].includes(type)?"Current snapshot":range.label'), "COD receivables must be labelled as a current snapshot.");

assert.ok(builder.includes("current_balance:num(account.opening_balance)+ledger+transferIn-transferOut"), "Account balances must derive from opening balances, confirmed entries and internal transfers.");
assert.ok(builder.includes("period_net_movement") && builder.includes("period_transfer_in") && builder.includes("period_transfer_out"), "Account reporting must distinguish selected-period movement and transfers.");
assert.ok(builder.includes("record_kind:\"Internal transfer\""), "Internal transfers must be shown as their own record type.");
assert.ok(builder.includes("source.budgetFinance=budgetFinance"), "Budget comparisons must use full-month actual expense records.");
assert.ok(builder.includes('e.status==="confirmed"&&(e.financial_class||"operating")==="operating"'), "Budget utilization must exclude draft, void and non-operating entries.");
assert.ok(builder.includes("Financial Transactions Ledger") && builder.includes("internal_transfer"), "Transaction reporting must preserve separate transfer classification.");

const lastAnalysis = reports.lastIndexOf("function analysisFor(type,rows,source){");
const lastInsights = reports.lastIndexOf("function insightsFor(type,rows,source){");
const lastShow = reports.lastIndexOf("function showSegment(segment){");
const lastRender = reports.lastIndexOf("function renderWorkspace(){");
const workspaceInit = reports.indexOf("function initWorkspace()", lastRender);
assert.ok(lastAnalysis >= 0 && lastInsights > lastAnalysis, "The active report analysis and insight functions must exist.");
assert.ok(lastShow >= 0 && lastRender > lastShow && workspaceInit > lastRender, "The active report tabs and renderer must be wired.");
assert.ok(reports.slice(lastAnalysis, lastInsights).includes('if(type==="payable")') &&
  reports.slice(lastAnalysis, lastInsights).includes('if(type==="account-payments")') &&
  reports.slice(lastAnalysis, lastInsights).includes('if(type==="expenses")') &&
  reports.slice(lastAnalysis, lastInsights).includes('if(type==="transactions")'),
  "Each financial report must have its own analysis sections.");
assert.ok(reports.slice(lastRender, workspaceInit).includes("analysisBlocks.map"), "Workspace must render every analysis block.");
assert.ok(reports.slice(lastRender, workspaceInit).includes("reportWorkspaceInsights"), "Business Insights must render in the active workspace.");
assert.ok(reports.slice(lastShow, lastRender).includes('"overview","analysis","records","insights"'), "Workspace must switch all four report segments.");
assert.ok(reports.slice(workspaceInit).includes('id="reportWorkspaceInsights"'), "The Business Insights panel must exist in the active workspace template.");
assert.ok(reports.slice(workspaceInit).includes('if(first==="receivable")'), "Current COD receivable snapshots must not display a misleading date filter.");

for (const token of [
  "--hf-theme-hero-bg", "--hf-theme-card-bg", "--hf-theme-primary", "--hf-theme-accent",
  "--hf-theme-table-head", "--hf-theme-table-row", "--hf-theme-chart-bg", "--hf-theme-chart-grid"
]) {
  assert.ok(css.includes(token), "Report styling must consume " + token + ".");
}
assert.ok(css.includes("html[data-hf-theme] body[data-page]"), "Report styling must follow the selected Admin color theme.");
assert.ok(css.includes(".hf-report-insights-grid") && css.includes(".hf-report-insight-card"), "Business Insights cards need dedicated responsive styling.");
assert.ok(css.includes("@media(max-width:640px)"), "Report workspace must remain responsive on mobile.");
assert.ok(shared.includes("function applyColorTheme") && shared.includes("--hf-theme-"), "Report theme variables must come from the shared color-theme registry.");

const reportPages = [
  "admin/reports.html",
  "admin/reports-business.html",
  "admin/reports-purchase.html",
  "admin/reports-customers.html",
  "admin/reports-payables.html",
  "admin/reports-inventory.html",
  "admin/reports-finance.html",
  "admin/reports-daily.html",
];
for (const path of reportPages) {
  const html = read(path);
  assert.ok(html.includes("app.js?v=20261103-operational-reports-v1"), path + " must load the updated report app.");
  assert.ok(html.includes("reports-settings.css?v=20261103-financial-reports-v2"), path + " must load the theme-aware report CSS.");
}

console.log("Financial Reports Part 1 checks passed: paginated source loading, reconciled COD, supplier payables, account balances, monthly budget analysis, distinct transfers, six financial report views, Business Insights, four workspace tabs, responsive theme tokens and cache-busted report pages.");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = path => readFileSync(join(root, path), "utf8");
const html = read("admin/finance.html");
const js = read("admin/finance-accounting-core.js");
const css = read("admin/finance-accounting-core.css");
const migration = read("supabase/migrations/20261103024455_finance_accounting_foundation_v1.sql");

assert.ok(html.includes('finance-accounting-core.css?v=20261103-accounting-core-v1'), "Accounting CSS must be cache-busted.");
assert.ok(html.includes('finance-accounting-core.js?v=20261103-accounting-core-v1'), "Accounting JS must be cache-busted.");
assert.ok(html.includes('id="financeAccountingCore"'), "Accounting core must live inside the existing Finance page.");
assert.ok(html.includes('id="financeTransactionsSection"'), "The existing Transactions workspace must remain.");
assert.equal((html.match(/class="hf-workspace-nav-item"/g) || []).length, 5, "Finance must retain exactly five primary workspaces.");

const transactionStart = html.indexOf('<section id="financeTransactionsSection"');
const accountStart = html.indexOf('<section id="financeAccountsSection"', transactionStart);
assert.ok(transactionStart >= 0 && accountStart > transactionStart, "Finance Transactions section must precede Accounts.");
assert.ok(html.slice(transactionStart, accountStart).includes('id="financeAccountingCore"'), "Accounting core must be nested in Transactions, not added as a new primary workspace.");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, "Finance page must not have duplicate static IDs.");
const tableCount = (html.match(/<table\b/g) || []).length;
const wrappedTableCount = (html.match(/class="hf-table-wrap"/g) || []).length;
assert.equal(wrappedTableCount, tableCount, "Every accounting/Finance table must have a responsive wrapper.");

for (const id of [
  "financeAccountingTrust","financeAccCashbookCount","financeAccUnpostedCount","financeAccPostedCount",
  "financeAccDraftCount","financeAccCoaBody","financeAccJournalsBody","financeAccLedgerBody",
  "financeAccTrialBody","financeAccPeriodsBody","financeJournalDialog","financeJournalHistoryDialog"
]) assert.ok(html.includes('id="' + id + '"'), "Missing accounting UI element: " + id);

for (const token of [
  "admin_finance_chart_of_accounts","admin_finance_journal_entries","admin_finance_journal_lines",
  "admin_finance_journal_events","admin_finance_periods","admin_finance_general_ledger",
  "admin_finance_trial_balance","admin_finance_save_journal_entry","admin_finance_reverse_journal_entry",
  "admin_finance_set_period_status"
]) assert.ok(js.includes(token), "Accounting UI must use " + token + ".");

assert.ok(html.includes("Not yet journalized") && js.includes("No test record or unverified opening balance was imported"), "UI must disclose operational records excluded from the ledger.");
assert.ok(js.includes("Validate & Post") || html.includes("Validate & Post"), "Journal posting action must be present.");
assert.ok(js.includes("finance_journal_posted") && js.includes("finance_journal_reversed"), "Journal lifecycle must be audit logged.");
assert.ok(js.includes("The original journal remains in history") || js.includes("reversal journal"), "Corrections must use reversal, not destructive editing.");
assert.ok(js.includes("data-finance-period-next") && js.includes("cannot be reopened"), "Accounting period controls must disclose irreversible locking.");

for (const table of [
  "admin_finance_chart_of_accounts","admin_finance_periods","admin_finance_journal_entries",
  "admin_finance_journal_lines","admin_finance_journal_events"
]) {
  assert.ok(migration.includes("create table if not exists public." + table), "Migration is missing " + table + ".");
  assert.ok(migration.includes("alter table public." + table + " enable row level security"), table + " must enable RLS.");
}
assert.ok(migration.includes("as restrictive") && migration.includes("aal2"), "Accounting tables must enforce MFA using restrictive policies.");
assert.ok(migration.includes("security_invoker=true"), "Ledger and Trial Balance views must respect caller permissions.");
assert.ok(migration.includes("check (\n    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)"), "Every journal line must post to one side only.");
assert.ok(migration.includes("A journal needs at least two posting lines"), "Posting must require at least two lines.");
assert.ok(migration.includes("Journal is not balanced") && migration.includes("v_debit <> v_credit"), "Posting must reject unbalanced journals.");
assert.ok(migration.includes("Only a controlled Reversed status") || migration.includes("Only the controlled Reversed status"), "Posted journals must be immutable except for controlled reversal.");
assert.ok(migration.includes("admin_finance_journal_reversal_uidx"), "A posted journal may have only one linked reversal.");
assert.ok(migration.includes("open' and new.status='closed") && migration.includes("closed' and new.status='locked"), "Period close/lock sequence must be enforced.");
assert.ok(migration.includes("private.log_admin_finance_journal_event") && migration.includes("draft_line_added"), "Database-level journal and line audit events must be created.");
assert.ok(migration.includes("admin_finance_entries table remains the operational cashbook") || migration.includes("Existing rows are not automatically promoted"), "Operational cashbook must remain separate from accounting journals.");
assert.ok(!/insert\s+into\s+public\.admin_finance_journal_entries\s*\([^)]*select/i.test(migration), "Historical cashbook records must not be backfilled into journals.");
assert.ok(!/\b(drop table|truncate|delete from public\.admin_finance_entries|update public\.admin_finance_entries)\b/i.test(migration), "Accounting migration must not make destructive changes to existing finance records.");

assert.ok(css.includes("@media(max-width:640px)") && css.includes("@media(prefers-reduced-motion:reduce)"), "Accounting workspace must be mobile- and motion-accessible.");
assert.ok(!/(?:#000000|#000)(?![0-9a-f])/i.test(css), "Accounting UI must avoid pure-black styling.");

console.log("Finance Accounting Foundation checks passed: existing five workspaces preserved, private accounting UI, COA, balanced journals, reversal controls, period lock, append-only audit, RLS/MFA and additive migration.");

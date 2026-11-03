(() => {
"use strict";
if (document.body.dataset.page !== "finance" || !window.HFAdminReady) return;

window.HFAdminReady.then(async H => {
  if (!H || document.body.dataset.page !== "finance") return;

  const { client, ADMIN_EMAIL, esc, money, dateOnly, dateTime, toast, audit, signedQuery } = H;
  const $ = id => document.getElementById(id);
  const root = $("financeAccountingCore");
  if (!root) return;

  let accounts = [];
  let journals = [];
  let ledger = [];
  let trialBalance = [];
  let periods = [];
  let cashbookEntries = [];
  let financeAccounts = [];
  let codRows = [];
  let deliveredOrders = [];
  let supplierBills = [];
  let supplierPayments = [];
  let profitabilityRows = [];
  let busy = false;
  let operationalPostContext = null;

  const typeLabels = {
    asset: "Asset", liability: "Liability", equity: "Equity", revenue: "Revenue",
    contra_revenue: "Contra revenue", cost_of_sales: "Cost of sales",
    expense: "Expense", other_income: "Other income"
  };
  const statusLabels = { draft: "Draft", posted: "Posted", reversed: "Reversed", open: "Open", closed: "Closed", locked: "Locked", active: "Active", inactive: "Inactive" };
  const todayDhaka = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const sum = (rows, field) => rows.reduce((n, row) => n + Number(row[field] || 0), 0);
  const statusBadge = status => {
    const tone = status === "posted" || status === "active" || status === "locked" ? "success"
      : status === "draft" || status === "open" ? "pending"
      : status === "closed" ? "info" : "muted";
    return '<span class="hf-finance-status hf-finance-status-' + tone + '">' +
      esc(statusLabels[status] || status) + "</span>";
  };
  const journalNumber = value => "JE-" + String(value || "").padStart(6, "0");
  const accountMap = () => new Map(accounts.map(a => [a.id, a]));
  const showError = message => {
    const box = $("financeAccountingError");
    if (!box) return;
    box.textContent = message || "";
    box.hidden = !message;
  };

  function renderTrust() {
    const unposted = cashbookEntries.filter(e => e.status === "confirmed" && !e.accounting_journal_id
      && !e.related_cod_settlement_id && !e.related_supplier_payment_id).length;
    $("financeAccCashbookCount").textContent = cashbookEntries.length.toLocaleString("en-BD");
    $("financeAccUnpostedCount").textContent = unposted.toLocaleString("en-BD");
    $("financeAccPostedCount").textContent = journals.filter(j => j.status === "posted").length.toLocaleString("en-BD");
    $("financeAccDraftCount").textContent = journals.filter(j => j.status === "draft").length.toLocaleString("en-BD");
    const trust = $("financeAccountingTrust");
    if (trust) {
      trust.classList.toggle("is-clear", unposted === 0 && journals.some(j => j.status === "posted"));
      trust.innerHTML = unposted
        ? "<strong>Historical cashbook kept separate.</strong> " + unposted.toLocaleString("en-BD") +
          " existing operational record(s) have not been journalized and are excluded from the General Ledger and Trial Balance. No test record or unverified opening balance was imported."
        : "<strong>Accounting source check passed.</strong> No unjournalized cashbook record was detected. Opening balances are still manual and must be verified before entry.";
    }
  }

  function renderChartOfAccounts() {
    $("financeAccCoaCount").textContent = accounts.length.toLocaleString("en-BD") + " accounts";
    $("financeAccCoaBody").innerHTML = accounts.length ? accounts.map(a =>
      "<tr><td><strong>" + esc(a.account_code) + "</strong></td><td><strong>" + esc(a.name) + "</strong>" +
      (a.description ? "<small>" + esc(a.description) + "</small>" : "") + "</td><td>" +
      esc(typeLabels[a.account_type] || a.account_type) + "</td><td>" +
      esc(a.normal_balance === "debit" ? "Debit" : "Credit") + "</td><td>" +
      (a.is_postable ? '<span class="hf-finance-status hf-finance-status-success">Postable</span>' :
        '<span class="hf-finance-status hf-finance-status-muted">Group only</span>') +
      "</td><td>" + statusBadge(a.is_active ? "active" : "inactive") + "</td></tr>"
    ).join("") : '<tr><td colspan="6">No accounts configured.</td></tr>';

    const selector = $("financeAccLedgerAccount");
    const selected = selector.value;
    selector.innerHTML = '<option value="">All accounts</option>' + accounts
      .filter(a => a.is_postable)
      .map(a => '<option value="' + esc(a.id) + '">' + esc(a.account_code + " · " + a.name) + "</option>")
      .join("");
    selector.value = selected;

    const mapping = $("financeAccountLedgerId");
    if (mapping) {
      const mapped = mapping.value;
      mapping.innerHTML = '<option value="">Choose Asset account</option>' + accounts
        .filter(a => a.account_type === "asset" && a.is_postable && a.is_active)
        .map(a => '<option value="' + esc(a.id) + '">' + esc(a.account_code + " · " + a.name) + "</option>")
        .join("");
      mapping.value = mapped;
    }
  }

  function renderJournals() {
    $("financeAccJournalCount").textContent = journals.length.toLocaleString("en-BD") + " journals";
    $("financeAccJournalsBody").innerHTML = journals.length ? journals.map(j => {
      let actions = '<button class="hf-button hf-button-secondary hf-button-small" data-journal-history="' + esc(j.id) + '">History</button>';
      if (j.status === "draft") {
        actions = '<button class="hf-button hf-button-secondary hf-button-small" data-journal-edit="' + esc(j.id) + '">Review / post</button>' + actions;
      } else if (j.status === "posted" && ["manual","adjustment","reversal"].includes(j.source_type || "manual")) {
        actions = '<button class="hf-button hf-button-danger hf-button-small" data-journal-reverse="' + esc(j.id) + '">Reverse</button>' + actions;
      } else if (j.status === "posted") {
        actions = '<span class="hf-finance-status hf-finance-status-muted">Reverse at source</span>' + actions;
      }
      return "<tr><td><strong>" + journalNumber(j.journal_number) + "</strong></td><td>" +
        dateOnly(j.entry_date) + "</td><td><strong>" + esc(j.description) + "</strong><small>" +
        esc(j.source_type || "manual") + (j.source_key ? " · " + esc(j.source_key) : "") +
        "</small></td><td>" + money(j.total_debit) + "</td><td>" + money(j.total_credit) +
        "</td><td>" + statusBadge(j.status) + "</td><td><div class=\"hf-table-actions\">" +
        actions + "</div></td></tr>";
    }).join("") : '<tr><td colspan="7">No journal entries have been created yet. Start with a verified transaction; do not invent an opening balance.</td></tr>';
  }

  function ledgerBalance(row) {
    const value = Number(row.running_balance || 0);
    const normalSide = value >= 0 ? row.normal_balance : (row.normal_balance === "debit" ? "credit" : "debit");
    return money(Math.abs(value)) + (normalSide === "debit" ? " Dr" : " Cr");
  }

  function renderLedger() {
    const accountId = $("financeAccLedgerAccount").value;
    const from = $("financeAccLedgerFrom").value;
    const to = $("financeAccLedgerTo").value;
    const rows = ledger.filter(row =>
      (!accountId || row.account_id === accountId) &&
      (!from || String(row.entry_date) >= from) &&
      (!to || String(row.entry_date) <= to)
    );
    $("financeAccLedgerBody").innerHTML = rows.length ? rows.map(row =>
      "<tr><td>" + dateOnly(row.entry_date) + "</td><td><strong>" +
      journalNumber(row.journal_number) + "</strong></td><td><strong>" +
      esc(row.account_code) + "</strong><small>" + esc(row.account_name) +
      "</small></td><td>" + esc(row.line_description || row.journal_description || "—") +
      (row.party_name ? "<small>" + esc(row.party_name) + "</small>" : "") +
      "</td><td>" + money(row.debit) + "</td><td>" + money(row.credit) +
      "</td><td><strong>" + ledgerBalance(row) + "</strong></td></tr>"
    ).join("") : '<tr><td colspan="7">No posted activity matches these filters.</td></tr>';
  }

  function renderPeriods() {
    $("financeAccPeriodsBody").innerHTML = periods.length ? periods.map(period => {
      let action = "";
      if (period.status === "open") {
        action = '<button class="hf-button hf-button-secondary hf-button-small" data-finance-period="' +
          esc(period.period_start) + '" data-finance-period-next="closed">Close period</button>';
      } else if (period.status === "closed") {
        action = '<button class="hf-button hf-button-danger hf-button-small" data-finance-period="' +
          esc(period.period_start) + '" data-finance-period-next="locked">Lock period</button>';
      }
      const changedAt = period.locked_at || period.closed_at;
      return "<tr><td><strong>" + esc(String(period.period_start).slice(0, 7)) +
        "</strong></td><td>" + dateOnly(period.period_start) + " – " + dateOnly(period.period_end) +
        "</td><td>" + statusBadge(period.status) + "</td><td>" +
        (changedAt ? dateTime(changedAt) : "—") + "</td><td>" + action + "</td></tr>";
    }).join("") : '<tr><td colspan="5">No accounting period has been opened yet. The first posted journal will open its month automatically.</td></tr>';
  }

  function renderTrialBalance() {
    const rows = trialBalance.filter(row => row.is_postable);
    const debit = sum(rows, "debit_balance");
    const credit = sum(rows, "credit_balance");
    const difference = Math.abs(debit - credit);
    $("financeAccTrialDebit").textContent = money(debit);
    $("financeAccTrialCredit").textContent = money(credit);
    $("financeAccTrialDifference").textContent = money(difference);
    $("financeAccTrialDifference").classList.toggle("is-unbalanced", difference > 0.005);
    $("financeAccTrialStatus").textContent = journals.some(j => j.status === "posted" || j.status === "reversed")
      ? (difference <= 0.005 ? "Balanced" : "Review required")
      : "Awaiting first posted journal";
    $("financeAccTrialStatus").classList.toggle("is-unbalanced", difference > 0.005);
    $("financeAccTrialBody").innerHTML = rows.length ? rows.map(row =>
      "<tr><td><strong>" + esc(row.account_code) + "</strong></td><td>" +
      esc(row.account_name) + "</td><td>" + esc(typeLabels[row.account_type] || row.account_type) +
      "</td><td>" + money(row.debit_balance) + "</td><td>" + money(row.credit_balance) + "</td></tr>"
    ).join("") + '<tr class="hf-finance-accounting-total"><td colspan="3"><strong>Total</strong></td><td><strong>' +
      money(debit) + "</strong></td><td><strong>" + money(credit) + "</strong></td></tr>" :
      '<tr><td colspan="5">Chart of Accounts is empty.</td></tr>';
    renderPeriods();
  }

  function renderAll() {
    renderTrust();
    renderChartOfAccounts();
    renderJournals();
    renderLedger();
    renderTrialBalance();
    showError("");
  }

  async function refreshAll() {
    if (busy) return;
    busy = true;
    const button = $("financeAccountingRefresh");
    if (button) button.disabled = true;
    if ($("financeOperationsRefresh")) $("financeOperationsRefresh").disabled = true;
    try {
      const results = await Promise.all([
        signedQuery(client.from("admin_finance_chart_of_accounts").select("*").order("account_code", { ascending: true }).limit(300)),
        signedQuery(client.from("admin_finance_journal_entries").select("*").order("entry_date", { ascending: false }).order("journal_number", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_finance_general_ledger").select("*").order("entry_date", { ascending: false }).order("journal_number", { ascending: false }).order("line_no", { ascending: true }).limit(10000)),
        signedQuery(client.from("admin_finance_trial_balance").select("*").order("account_code", { ascending: true }).limit(300)),
        signedQuery(client.from("admin_finance_periods").select("*").order("period_start", { ascending: false }).limit(120)),
        signedQuery(client.from("admin_finance_entries").select("*").order("created_at", { ascending: false }).limit(5000)),
        signedQuery(client.from("admin_finance_accounts").select("*").order("name", { ascending: true }).limit(300)),
        signedQuery(client.from("admin_cod_settlements").select("*").order("updated_at", { ascending: false }).limit(2000)),
        signedQuery(client.from("orders").select("id,order_number,customer_name,subtotal,delivery_charge,coupon_discount_amount,total,payment_method,status,ordered_at").eq("status","delivered").order("ordered_at", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_supplier_bills").select("id,bill_number,supplier_id,purchase_order_id,supplier_invoice_number,invoice_date,due_date,total_amount,tax_amount,status,accounting_journal_id,reversal_journal_id").order("invoice_date", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_supplier_payments").select("id,payment_number,supplier_id,payment_date,amount,paid_from_account,status,accounting_journal_id,reversal_journal_id").order("payment_date", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_finance_product_profitability").select("*").order("gross_profit", { ascending: false, nullsFirst: false }).limit(1000))
      ]);
      [accounts, journals, ledger, trialBalance, periods, cashbookEntries, financeAccounts,
        codRows, deliveredOrders, supplierBills, supplierPayments, profitabilityRows] = results;
      renderAll();
      renderOperationalIntegration();
    } catch (error) {
      console.error("Accounting foundation could not be refreshed", error);
      showError(error.message || "Accounting data could not be loaded. Refresh the page or check the accounting migration.");
      if ($("financeOperationsError")) {
        $("financeOperationsError").textContent = error.message || "Operational integration data could not be loaded.";
        $("financeOperationsError").hidden = false;
      }
      toast(error.message || "Accounting data could not be loaded.", "error");
    } finally {
      busy = false;
      if (button) button.disabled = false;
      if ($("financeOperationsRefresh")) $("financeOperationsRefresh").disabled = false;
    }
  }

  function showTab(name) {
    root.querySelectorAll("[data-finance-accounting-tab]").forEach(button => {
      const active = button.dataset.financeAccountingTab === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    root.querySelectorAll("[data-finance-accounting-panel]").forEach(panel => {
      panel.hidden = panel.dataset.financeAccountingPanel !== name;
    });
    if (name === "ledger") renderLedger();
    if (name === "trial") renderTrialBalance();
    if (name === "operations") renderOperationalIntegration();
  }

  function accountOptions(selected) {
    return '<option value="">Choose account</option>' + accounts
      .filter(account => account.is_active && account.is_postable)
      .map(account => '<option value="' + esc(account.id) + '"' +
        (account.id === selected ? " selected" : "") + ">" +
        esc(account.account_code + " · " + account.name) + "</option>").join("");
  }

  function renderJournalLines(lines) {
    const host = $("financeJournalLines");
    host.innerHTML = lines.map(line =>
      '<div class="hf-finance-journal-line" data-journal-line>' +
      '<label>Account<select class="hf-select" data-line-account>' + accountOptions(line.account_id) + "</select></label>" +
      '<label>Line details<input class="hf-input" data-line-description maxlength="180" value="' +
      esc(line.description || "") + '" placeholder="Optional explanation"></label>' +
      '<label>Debit (৳)<input class="hf-input" data-line-debit type="number" min="0" step="0.01" value="' +
      (Number(line.debit || 0) ? Number(line.debit).toFixed(2) : "") + '" placeholder="0.00"></label>' +
      '<label>Credit (৳)<input class="hf-input" data-line-credit type="number" min="0" step="0.01" value="' +
      (Number(line.credit || 0) ? Number(line.credit).toFixed(2) : "") + '" placeholder="0.00"></label>' +
      '<label>Party<input class="hf-input" data-line-party maxlength="120" value="' +
      esc(line.party_name || "") + '" placeholder="Optional"></label>' +
      '<button class="hf-button hf-button-secondary hf-button-small" type="button" data-line-remove aria-label="Remove journal line">×</button>' +
      "</div>"
    ).join("");
    updateJournalTotals();
  }

  function updateJournalTotals() {
    const rows = [...$("financeJournalLines").querySelectorAll("[data-journal-line]")];
    let debit = 0, credit = 0;
    rows.forEach(row => {
      debit += Math.max(0, Number(row.querySelector("[data-line-debit]").value || 0));
      credit += Math.max(0, Number(row.querySelector("[data-line-credit]").value || 0));
    });
    const difference = Math.abs(debit - credit);
    $("financeJournalTotalDebit").textContent = money(debit);
    $("financeJournalTotalCredit").textContent = money(credit);
    $("financeJournalDifference").textContent = money(difference);
    const balanced = debit > 0 && Math.abs(debit - credit) <= 0.005;
    $("financeJournalBalanceState").textContent = balanced ? "Balanced · Ready to validate" : "Not balanced yet · Save as Draft or complete the lines";
    $("financeJournalBalanceState").classList.toggle("is-balanced", balanced);
    $("financeJournalBalanceState").classList.toggle("is-unbalanced", !balanced);
  }

  function collectJournalLines() {
    const rows = [...$("financeJournalLines").querySelectorAll("[data-journal-line]")];
    const lines = [];
    rows.forEach(row => {
      const accountId = row.querySelector("[data-line-account]").value;
      const debit = Number(row.querySelector("[data-line-debit]").value || 0);
      const credit = Number(row.querySelector("[data-line-credit]").value || 0);
      const description = row.querySelector("[data-line-description]").value.trim();
      const partyName = row.querySelector("[data-line-party]").value.trim();
      if (debit < 0 || credit < 0 || !Number.isFinite(debit) || !Number.isFinite(credit)) {
        throw new Error("Debit and Credit values cannot be negative or invalid.");
      }
      if (debit === 0 && credit === 0 && !accountId) return;
      if (!accountId) throw new Error("Choose an account for every non-empty journal line.");
      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error("Each journal line must contain either a Debit or a Credit amount, not both.");
      }
      lines.push({ account_id: accountId, description, party_name: partyName, debit, credit });
    });
    return lines;
  }

  async function openJournal(journal) {
    let lines = [];
    if (journal) {
      try {
        lines = await signedQuery(client.from("admin_finance_journal_lines")
          .select("line_no,account_id,description,party_name,debit,credit")
          .eq("journal_entry_id", journal.id).order("line_no", { ascending: true }));
      } catch (error) {
        toast(error.message || "Journal lines could not be loaded.", "error");
        return;
      }
    }
    $("financeJournalFormError").textContent = "";
    $("financeJournalId").value = journal?.id || "";
    $("financeJournalDate").value = journal?.entry_date || todayDhaka();
    $("financeJournalDescription").value = journal?.description || "";
    $("financeJournalSource").value = journal?.source_type || "manual";
    $("financeJournalDialogTitle").textContent = journal ? "Review Draft " + journalNumber(journal.journal_number) : "New journal entry";
    renderJournalLines(lines.length ? lines : [{}, {}]);
    $("financeJournalDialog").showModal();
  }

  async function saveJournal(post) {
    const saveButton = $("financeJournalSaveDraft");
    const postButton = $("financeJournalPost");
    saveButton.disabled = true;
    postButton.disabled = true;
    $("financeJournalFormError").textContent = "";
    try {
      const lines = collectJournalLines();
      const description = $("financeJournalDescription").value.trim();
      if (description.length < 3) throw new Error("Enter a clear journal description (at least 3 characters).");
      if (post) {
        const debit = sum(lines, "debit"), credit = sum(lines, "credit");
        if (lines.length < 2 || debit <= 0 || Math.abs(debit - credit) > 0.005) {
          throw new Error("Posting requires at least two lines with equal, positive Debit and Credit totals.");
        }
        if ($("financeJournalSource").value === "opening_balance" &&
          !confirm("Confirm that the opening balance was checked against actual cash, bank, wallet, supplier and customer records. No unverified test amount may be posted.")) {
          return;
        }
        if (!confirm("Post this balanced journal permanently? Posted entries cannot be edited or deleted. Corrections require a reversal journal.")) return;
      }
      const params = {
        p_entry_id: $("financeJournalId").value || null,
        p_entry_date: $("financeJournalDate").value,
        p_description: description,
        p_lines: lines,
        p_source_type: $("financeJournalSource").value,
        p_source_key: null,
        p_post: Boolean(post)
      };
      const { data, error } = await client.rpc("admin_finance_save_journal_entry", params);
      if (error) throw error;
      const id = data || params.p_entry_id;
      await audit(post ? "finance_journal_posted" : "finance_journal_draft_saved",
        "finance_journal", id, post ? "Balanced accounting journal posted" : "Accounting journal draft saved",
        { line_count: lines.length, source_type: params.p_source_type });
      $("financeJournalDialog").close();
      toast(post ? "Journal posted to the General Ledger." : "Journal saved as Draft.");
      await refreshAll();
    } catch (error) {
      $("financeJournalFormError").textContent = error.message || "Journal could not be saved.";
    } finally {
      saveButton.disabled = false;
      postButton.disabled = false;
    }
  }

  async function reverseJournal(id) {
    const journal = journals.find(item => item.id === id);
    if (!journal || journal.status !== "posted") return;
    const reason = window.prompt("Why is this posted journal being reversed? This reason will be kept in the audit history.");
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast("Enter a reversal reason of at least five characters.", "error");
      return;
    }
    if (!confirm("Create a new reversing journal for " + journalNumber(journal.journal_number) +
      "? The original journal remains in history and is marked Reversed.")) return;
    try {
      const { data, error } = await client.rpc("admin_finance_reverse_journal_entry", {
        p_journal_entry_id: id,
        p_reversal_date: todayDhaka(),
        p_reason: reason.trim()
      });
      if (error) throw error;
      await audit("finance_journal_reversed", "finance_journal", id,
        "Posted accounting journal reversed", { reversal_journal_id: data });
      toast("Reversal journal posted. Both entries remain in the audit trail.");
      await refreshAll();
    } catch (error) {
      toast(error.message || "Journal could not be reversed.", "error");
    }
  }

  async function showJournalHistory(id) {
    $("financeJournalHistoryBody").innerHTML = '<tr><td colspan="4" class="hf-loading">Loading history…</td></tr>';
    $("financeJournalHistorySubtitle").textContent = "Journal " + journalNumber(journals.find(j => j.id === id)?.journal_number);
    $("financeJournalHistoryDialog").showModal();
    try {
      const events = await signedQuery(client.from("admin_finance_journal_events")
        .select("action,actor_email,event_at,before_data,after_data")
        .eq("journal_entry_id", id).order("event_at", { ascending: false }).limit(300));
      $("financeJournalHistoryBody").innerHTML = events.length ? events.map(event => {
        const data = event.after_data || event.before_data || {};
        let detail = data.description || data.account_code || "";
        if (data.line_no) detail = "Line " + data.line_no + " · " + (Number(data.debit || 0) ? "Debit " + money(data.debit) : "Credit " + money(data.credit));
        if (!detail && data.status) detail = "Status: " + data.status;
        return "<tr><td>" + dateTime(event.event_at) + "</td><td><strong>" +
          esc(event.action.replaceAll("_", " ")) + "</strong></td><td>" +
          esc(event.actor_email) + "</td><td>" + esc(detail || "—") + "</td></tr>";
      }).join("") : '<tr><td colspan="4">No audit events found.</td></tr>';
    } catch (error) {
      $("financeJournalHistoryBody").innerHTML = '<tr><td colspan="4">' + esc(error.message || "History could not be loaded.") + "</td></tr>";
    }
  }

  async function changePeriod(button) {
    const periodStart = button.dataset.financePeriod;
    const nextStatus = button.dataset.financePeriodNext;
    if (!periodStart || !nextStatus) return;
    const action = nextStatus === "closed" ? "Close" : "Lock";
    const warning = nextStatus === "locked"
      ? "Lock this closed month permanently? A locked period cannot be reopened."
      : "Close this month? Draft journals must be cleared before the period can close.";
    if (!confirm(action + " " + periodStart.slice(0, 7) + "? " + warning)) return;
    try {
      const { error } = await client.rpc("admin_finance_set_period_status", {
        p_period_start: periodStart,
        p_status: nextStatus,
        p_notes: null
      });
      if (error) throw error;
      await audit("finance_period_" + nextStatus, "finance_period", periodStart,
        "Accounting period moved to " + nextStatus);
      toast("Accounting period " + nextStatus + ".");
      await refreshAll();
    } catch (error) {
      toast(error.message || "Accounting period could not be updated.", "error");
    }
  }

  root.addEventListener("click", async event => {
    const tab = event.target.closest("[data-finance-accounting-tab]");
    if (tab) { showTab(tab.dataset.financeAccountingTab); return; }

    const edit = event.target.closest("[data-journal-edit]");
    if (edit) {
      const journal = journals.find(j => j.id === edit.dataset.journalEdit);
      if (journal?.status === "draft") await openJournal(journal);
      return;
    }
    const history = event.target.closest("[data-journal-history]");
    if (history) { await showJournalHistory(history.dataset.journalHistory); return; }
    const reverse = event.target.closest("[data-journal-reverse]");
    if (reverse) { await reverseJournal(reverse.dataset.journalReverse); return; }
    const period = event.target.closest("[data-finance-period]");
    if (period) await changePeriod(period);

    const operation = event.target.closest("[data-finance-operation]");
    if (operation) {
      const kind = operation.dataset.financeOperation;
      const id = operation.dataset.financeOperationId;
      if (kind === "cashbook_post") {
        const source = cashbookEntries.find(e=>e.id===id);
        const defaultAccount = source?.entry_type === "income"
          ? accounts.find(a=>a.account_code==="4010")?.id
          : accounts.find(a=>a.account_code==="6095")?.id;
        openOperationalPosting(kind,id,{
          title:"Post cashbook transaction",
          description:"Select the counter-account that explains why this money was received or paid. For an order-linked receipt, Accounts Receivable (1100) is mandatory.",
          defaultAccount,
          warning:"Only Confirmed entries can be posted. Posting creates a permanent, balanced Journal linked to the cashbook source."
        });
      } else if (kind === "supplier_bill_post") {
        const bill=supplierBills.find(b=>b.id===id);
        const defaultAccount=accounts.find(a=>a.account_code==="1200")?.id;
        openOperationalPosting(kind,id,{
          title:"Post supplier bill",
          description:"Choose Inventory, Cost of Sales or an Expense account for the bill's base amount. Classify invoice tax separately.",
          defaultAccount,
          taxAmount:bill?.tax_amount||0,
          warning:"A Confirmed bill with a linked PO and accepted GRN is required. The Journal credits Accounts Payable."
        });
      } else if (kind === "opening_post") {
        const account=financeAccounts.find(a=>a.id===id);
        openOperationalPosting(kind,id,{
          title:"Post verified opening balance",
          description:"Choose the Equity or Liability account that explains the source of this opening balance.",
          warning:"Do not post a test amount. Opening balances are permanent accounting entries and must match actual statements."
        });
      } else if (kind.endsWith("_reverse")) {
        await reverseOperationalSource(kind,id);
      } else {
        await runOperationalAction(kind,id);
      }
    }
  });

  $("financeJournalNew")?.addEventListener("click", () => openJournal(null));
  $("financeAccountingRefresh")?.addEventListener("click", refreshAll);
  $("financeJournalAddLine")?.addEventListener("click", () => {
    const rows = [...$("financeJournalLines").querySelectorAll("[data-journal-line]")];
    const lines = rows.map(row => ({
      account_id: row.querySelector("[data-line-account]").value,
      description: row.querySelector("[data-line-description]").value,
      party_name: row.querySelector("[data-line-party]").value,
      debit: row.querySelector("[data-line-debit]").value,
      credit: row.querySelector("[data-line-credit]").value
    }));
    lines.push({});
    renderJournalLines(lines);
  });
  $("financeJournalLines")?.addEventListener("input", updateJournalTotals);
  $("financeJournalLines")?.addEventListener("change", updateJournalTotals);
  $("financeJournalLines")?.addEventListener("click", event => {
    const remove = event.target.closest("[data-line-remove]");
    if (!remove) return;
    const row = remove.closest("[data-journal-line]");
    row?.remove();
    updateJournalTotals();
  });
  $("financeJournalForm")?.addEventListener("submit", event => event.preventDefault());
  $("financeJournalSaveDraft")?.addEventListener("click", () => saveJournal(false));
  $("financeJournalPost")?.addEventListener("click", () => saveJournal(true));
  $("financeJournalClose")?.addEventListener("click", () => $("financeJournalDialog").close());
  $("financeJournalHistoryClose")?.addEventListener("click", () => $("financeJournalHistoryDialog").close());
  $("financeJournalHistoryDone")?.addEventListener("click", () => $("financeJournalHistoryDialog").close());
  $("financeOperationsRefresh")?.addEventListener("click", refreshAll);
  $("financeOperationalPostForm")?.addEventListener("submit", submitOperationalPosting);
  $("financeOperationalPostCancel")?.addEventListener("click", () => $("financeOperationalPostDialog").close());
  $("financeOperationalPostClose")?.addEventListener("click", () => $("financeOperationalPostDialog").close());
  $("financeAccLedgerAccount")?.addEventListener("change", renderLedger);
  $("financeAccLedgerFrom")?.addEventListener("change", renderLedger);
  $("financeAccLedgerTo")?.addEventListener("change", renderLedger);

  await refreshAll();
});
})();
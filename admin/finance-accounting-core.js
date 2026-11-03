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
  let supplierCreditNotes = [];
  let customerReturns = [];
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
        signedQuery(client.from("admin_supplier_credit_notes").select("id,credit_note_number,supplier_id,supplier_bill_id,purchase_order_id,credit_date,amount,reason,status,accounting_journal_id,reversal_journal_id").order("credit_date", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_return_requests").select("id,order_id,reason,refund_amount,status,item_condition,restock_approved,refund_account_id,accounting_journal_id,reversal_journal_id").order("created_at", { ascending: false }).limit(2000)),
        signedQuery(client.from("admin_finance_product_profitability").select("*").order("gross_profit", { ascending: false, nullsFirst: false }).limit(1000))
      ]);
      [accounts, journals, ledger, trialBalance, periods, cashbookEntries, financeAccounts,
        codRows, deliveredOrders, supplierBills, supplierPayments, supplierCreditNotes, customerReturns, profitabilityRows] = results;
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


  const accountById = id => financeAccounts.find(a => a.id === id);
  const operationButton = (kind,id,label,danger=false) =>
    '<button class="hf-button ' + (danger ? "hf-button-danger" : "hf-button-primary") +
    ' hf-button-small" data-finance-operation="' + esc(kind) + '" data-finance-operation-id="' + esc(id) + '">' +
    esc(label) + "</button>";
  const emptyOperationRow = (columns,message) => '<tr><td colspan="' + columns + '">' + esc(message) + "</td></tr>";
  const sourceJournal = (type,key) => journals.find(j => j.source_type===type && j.source_key===String(key));

  function renderOperationalIntegration() {
    const standaloneCashbook = cashbookEntries.filter(e => e.status==="confirmed"
      && !e.related_cod_settlement_id && !e.related_supplier_payment_id);
    const sales = deliveredOrders.map(o => ({order:o,journal:sourceJournal("order_sale",o.id)}));
    const cod = codRows.filter(s => s.status==="reconciled" && !s.reversal_journal_id);
    const bills = supplierBills.filter(b => (b.status==="confirmed" && !b.reversal_journal_id)
      || (b.accounting_journal_id && !b.reversal_journal_id));
    const payments = supplierPayments.filter(p => (p.status==="confirmed" && !p.reversal_journal_id)
      || (p.accounting_journal_id && !p.reversal_journal_id));
    const openings = financeAccounts.filter(a => a.is_active && Number(a.opening_balance||0)>0
      && !a.opening_balance_journal_id);
    const creditNotes = supplierCreditNotes.filter(n => (n.status==="confirmed" && !n.reversal_journal_id)
      || (n.accounting_journal_id && !n.reversal_journal_id));
    const refunds = customerReturns.filter(r => (r.status==="refunded" && !r.reversal_journal_id)
      || (r.accounting_journal_id && !r.reversal_journal_id));
    const cogs = deliveredOrders.filter(o => {
      const sale=sourceJournal("order_sale",o.id), cost=sourceJournal("order_cogs",o.id);
      return sale?.status==="posted" && !cost;
    });

    const cashPending=standaloneCashbook.filter(e=>!e.accounting_journal_id).length;
    const salePending=sales.filter(x=>!x.journal).length;
    const codPending=cod.filter(s=>!s.accounting_journal_id).length;
    const supplierPending=bills.filter(b=>!b.accounting_journal_id).length
      +payments.filter(p=>!p.accounting_journal_id).length;

    $("financeOpsCashbookCount").textContent=cashPending.toLocaleString("en-BD");
    $("financeOpsSalesCount").textContent=salePending.toLocaleString("en-BD");
    $("financeOpsCodCount").textContent=codPending.toLocaleString("en-BD");
    $("financeOpsSupplierCount").textContent=supplierPending.toLocaleString("en-BD");
    $("financeOpsOpeningCount").textContent=openings.length.toLocaleString("en-BD");
    $("financeOpsCogsCount").textContent=cogs.length.toLocaleString("en-BD");
    $("financeOpsRefundCount").textContent=refunds.filter(r=>!r.accounting_journal_id).length.toLocaleString("en-BD");

    $("financeOpsCashbookBody").innerHTML=standaloneCashbook.length?standaloneCashbook.map(e=>{
      const action=e.accounting_journal_id
        ?operationButton("cashbook_reverse",e.id,"Reverse",true)
        :e.account_id?operationButton("cashbook_post",e.id,"Post to GL")
        :'<span class="hf-finance-status hf-finance-status-warning">Assign a Finance account first</span>';
      return "<tr><td>"+dateOnly(e.entry_date)+"<small>"+esc(e.entry_type)+"</small></td><td><strong>"+
        esc(e.category)+"</strong><small>"+esc(e.party_name||e.description||"—")+"</small></td><td>"+
        esc(accountById(e.account_id)?.name||"Unassigned")+"</td><td><strong>"+money(e.amount)+
        "</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(5,"No Confirmed standalone cashbook entries require posting or reversal.");

    $("financeOpsSalesBody").innerHTML=sales.length?sales.map(({order,journal})=>{
      const action=journal
        ?(journal.status==="posted"?'<span class="hf-finance-status hf-finance-status-success">Recognized · '+esc("JE-"+String(journal.journal_number).padStart(6,"0"))+'</span>':'<span class="hf-finance-status hf-finance-status-warning">Sale journal reversed · review source</span>')
        :operationButton("order_sale",order.id,"Recognize sale");
      const settlementType=order.payment_method==="cash_on_delivery"?"COD → Courier Clearing":"Customer Receivable";
      return "<tr><td><strong>"+esc(order.order_number||String(order.id).slice(0,8))+"</strong><small>"+
        esc(order.customer_name||"Customer")+"</small></td><td>"+esc(settlementType)+"</td><td><strong>"+
        money(order.total)+"</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(4,"No Delivered orders are awaiting sales recognition.");

    $("financeOpsCodBody").innerHTML=cod.length?cod.map(s=>{
      const action=s.accounting_journal_id
        ?operationButton("cod_reverse",s.id,"Reverse",true)
        :operationButton("cod_post",s.id,"Post remittance");
      return "<tr><td><strong>"+esc(s.order_number||"Order")+"</strong><small>"+esc(s.courier_name||"Courier")+
        (s.tracking_reference?" · "+esc(s.tracking_reference):"")+"</small></td><td>"+money(s.collected_amount)+
        "</td><td>"+money(s.courier_fee)+"</td><td><strong>"+money(s.remitted_amount)+
        "</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(5,"No Reconciled COD remittance is waiting for accounting.");

    const supplierRows=[
      ...bills.map(b=>({
        id:b.id,kind:"supplier_bill",title:"Supplier bill · "+(b.bill_number||""),
        date:b.invoice_date,party:"Invoice "+(b.supplier_invoice_number||"—"),
        amount:b.total_amount,journal:b.accounting_journal_id
      })),
      ...payments.map(p=>({
        id:p.id,kind:"supplier_payment",title:"Supplier payment · "+(p.payment_number||""),
        date:p.payment_date,party:p.paid_from_account||"Payment account",
        amount:p.amount,journal:p.accounting_journal_id
      }))
    ];
    $("financeOpsSupplierBody").innerHTML=supplierRows.length?supplierRows.map(row=>{
      const action=row.journal?operationButton(row.kind+"_reverse",row.id,"Reverse",true):
        operationButton(row.kind+"_post",row.id,row.kind==="supplier_bill"?"Post bill":"Post payment");
      return "<tr><td><strong>"+esc(row.title)+"</strong></td><td>"+dateOnly(row.date)+
        "</td><td>"+esc(row.party)+"</td><td><strong>"+money(row.amount)+
        "</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(5,"No Confirmed Supplier Bills or Payments are waiting for accounting.");

    $("financeOpsOpeningBody").innerHTML=openings.length?openings.map(a=>
      "<tr><td><strong>"+esc(a.name)+"</strong><small>"+esc(a.account_type)+"</small></td><td>"+
      dateOnly(a.opening_date)+"</td><td><strong>"+money(a.opening_balance)+"</strong></td><td>"+
      esc(accountMap().get(a.ledger_account_id)?.account_code||"Not mapped")+"</td><td>"+
      (a.ledger_account_id?operationButton("opening_post",a.id,"Post verified"):
        '<span class="hf-finance-status hf-finance-status-warning">Map account</span>')+"</td></tr>"
    ).join(""):emptyOperationRow(5,"No positive, unjournalized Finance opening balance is waiting.");

    $("financeOpsCogsBody").innerHTML=cogs.length?cogs.map(o=>
      "<tr><td><strong>"+esc(o.order_number||String(o.id).slice(0,8))+"</strong></td><td>—</td><td>"+
      "Cost validated before posting</td><td>"+operationButton("order_cogs",o.id,"Post COGS")+"</td></tr>"
    ).join(""):emptyOperationRow(4,"No Delivered order with a posted sale is waiting for COGS.");

    $("financeOpsCreditNotesBody").innerHTML=creditNotes.length?creditNotes.map(n=>{
      const action=n.accounting_journal_id
        ?operationButton("supplier_credit_reverse",n.id,"Reverse",true)
        :operationButton("supplier_credit_post",n.id,"Post credit");
      return "<tr><td><strong>"+esc(n.credit_note_number)+"</strong><small>"+esc(n.reason)+"</small></td><td>"+
        dateOnly(n.credit_date)+"</td><td>"+esc(n.supplier_bill_id?"Linked bill":"Supplier account credit")+
        "</td><td><strong>"+money(n.amount)+"</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(5,"No Confirmed supplier credit notes are waiting for accounting.");

    $("financeOpsRefundBody").innerHTML=refunds.length?refunds.map(r=>{
      const action=r.accounting_journal_id
        ?operationButton("customer_refund_reverse",r.id,"Reverse",true)
        :operationButton("customer_refund_post",r.id,"Post refund");
      const order=deliveredOrders.find(o=>o.id===r.order_id);
      return "<tr><td><strong>"+esc(String(r.id).slice(0,8))+"</strong><small>"+esc(r.reason||"Return request")+"</small></td><td>"+
        esc(order?.order_number||String(r.order_id).slice(0,8))+"</td><td>"+esc(r.item_condition||"Not inspected")+
        (r.restock_approved?' <small>Restock flag set</small>':"")+"</td><td><strong>"+money(r.refund_amount)+
        "</strong></td><td>"+action+"</td></tr>";
    }).join(""):emptyOperationRow(5,"No processed customer refunds are waiting for accounting.");

    $("financeOpsProfitCount").textContent=profitabilityRows.length.toLocaleString("en-BD")+" products";
    $("financeOpsProfitBody").innerHTML=profitabilityRows.length?profitabilityRows.map(row=>
      "<tr><td><strong>"+esc(row.product_name||"Product")+"</strong><small>"+esc(row.unit||"")+
      "</small></td><td>"+Number(row.delivered_quantity||0).toLocaleString("en-BD")+
      "</td><td>"+money(row.net_product_sales)+"</td><td>"+(row.verified_cogs==null?"—":money(row.verified_cogs))+
      "</td><td><strong>"+(row.gross_profit==null?"—":money(row.gross_profit))+"</strong></td><td>"+
      (row.gross_margin_percent==null?"—":Number(row.gross_margin_percent).toFixed(2)+"%")+
      "</td><td>"+esc(row.cost_method||row.cost_coverage||"—")+
      (Number(row.missing_cost_lines||0)?'<small class="hf-finance-status hf-finance-status-warning">Cost missing</small>':"")+
      "</td></tr>"
    ).join(""):emptyOperationRow(7,"No Delivered product sales are available for margin analysis.");

    const integrity=$("financeOperationsIntegrity");
    if(integrity)integrity.textContent="Only Confirmed source events appear here. Delivered sales, customer receipts, COD remittances, supplier bills, supplier payments and COGS post as separate journal events. Historical test records are not automatically posted.";
  }

  function fillOperationalAccounts(kind,selectedId) {
    const select=$("financeOperationalAccount");
    const taxSelect=$("financeOperationalTaxAccount");
    const field=$("financeOperationalAccountField");
    const taxField=$("financeOperationalTaxField");
    const cashField=$("financeOperationalCashAccountField");
    const cashSelect=$("financeOperationalCashAccount");
    const refundAccounts=financeAccounts.filter(a=>a.is_active&&a.ledger_account_id);
    if(cashSelect){
      const oldCash=selectedId||cashSelect.value;
      cashSelect.innerHTML='<option value="">Choose cash, bank or wallet</option>'+refundAccounts.map(a=>
        '<option value="'+esc(a.id)+'"'+(a.id===oldCash?" selected":"")+">"+esc(a.name)+"</option>").join("");
    }
    if(cashField)cashField.hidden=kind!=="customer_refund_post";
    const allowed=accounts.filter(a=>a.is_active&&a.is_postable&&(
      kind==="cashbook_post"?true:
      kind==="supplier_bill_post"?["asset","expense","cost_of_sales"].includes(a.account_type):
      kind==="opening_post"?["equity","liability"].includes(a.account_type):false
    ));
    select.innerHTML='<option value="">Choose account</option>'+allowed.map(a=>
      '<option value="'+esc(a.id)+'"'+(a.id===selectedId?" selected":"")+">"+
      esc(a.account_code+" · "+a.name)+"</option>").join("");
    field.hidden=!(["cashbook_post","supplier_bill_post","opening_post"].includes(kind));
    select.required=!field.hidden;
    const tax=accounts.filter(a=>a.is_active&&a.is_postable&&["asset","expense"].includes(a.account_type));
    taxSelect.innerHTML='<option value="">Choose tax classification</option>'+tax.map(a=>
      '<option value="'+esc(a.id)+'"'+(a.account_code==="1210"?" selected":"")+">"+
      esc(a.account_code+" · "+a.name)+"</option>").join("");
    taxField.hidden=kind!=="supplier_bill_post";
  }

  function openOperationalPosting(kind,id,meta={}) {
    operationalPostContext={kind,id,meta};
    $("financeOperationalPostKind").value=kind;
    $("financeOperationalPostId").value=id;
    $("financeOperationalPostError").textContent="";
    $("financeOperationalPostTitle").textContent=meta.title||"Post source event";
    $("financeOperationalPostDescription").textContent=meta.description||"Choose the appropriate General Ledger account.";
    $("financeOperationalWarning").textContent=meta.warning||"Posting is permanent. Corrections must use a linked reversal journal.";
    fillOperationalAccounts(kind,meta.defaultAccount||"");
    $("financeOperationalTaxField").hidden=!(kind==="supplier_bill_post"&&Number(meta.taxAmount||0)>0);
    $("financeOperationalTaxAccount").required=kind==="supplier_bill_post"&&Number(meta.taxAmount||0)>0;
    $("financeOperationalCashAccountField").hidden=kind!=="customer_refund_post";
    $("financeOperationalCashAccount").required=kind==="customer_refund_post";
    $("financeOperationalPostDialog").showModal();
  }

  async function runOperationalAction(kind,id) {
    const config={
      order_sale:{
        message:"Recognize this Delivered sale? COD will debit Courier Clearing; other orders will debit Customer Receivable. This is not proof of cash received.",
        rpc:"admin_finance_recognize_delivered_order_sale",args:{p_order_id:id}
      },
      cod_post:{
        message:"Post the reconciled COD remittance and courier fee? Revenue will not be counted again.",
        rpc:"admin_finance_post_cod_settlement",args:{p_settlement_id:id}
      },
      supplier_payment_post:{
        message:"Post this Confirmed supplier payment? Allocations reduce Accounts Payable; unallocated money becomes Supplier Advances.",
        rpc:"admin_finance_post_supplier_payment",args:{p_payment_id:id}
      },
      supplier_credit_post:{
        message:"Post this Confirmed supplier credit note? It will reduce the supplier payable or create a Supplier Advance; it will not be counted as new income.",
        rpc:"admin_finance_post_supplier_credit_note",args:{p_credit_note_id:id}
      },
      order_cogs:{
        message:"Post COGS using verified manual product costs or weighted-average landed GRN costs? Missing costs will block posting.",
        rpc:"admin_finance_post_order_cogs",args:{p_order_id:id}
      }
    };
    const item=config[kind];
    if(!item||!confirm(item.message))return;
    try{
      const {data,error}=await client.rpc(item.rpc,item.args);
      if(error)throw error;
      await audit("finance_"+kind,"finance_source",id,"Operational source posted to accounting",{journal_id:data});
      toast("Source event posted to the General Ledger.");
      await refreshAll();
    }catch(error){toast(error.message||"Operational source could not be posted.","error");}
  }

  async function reverseOperationalSource(kind,id) {
    const reason=window.prompt("Reason for reversing this source transaction (at least five characters):");
    if(reason===null)return;
    if(reason.trim().length<5){toast("Enter a reversal reason of at least five characters.","error");return;}
    if(!confirm("Reverse this source transaction through its linked accounting Journal? The original record and reversal will remain in history."))return;
    const config={
      cashbook_reverse:["admin_finance_reverse_cashbook_entry",{p_entry_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}],
      cod_reverse:["admin_finance_reverse_cod_settlement",{p_settlement_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}],
      supplier_bill_reverse:["admin_finance_reverse_supplier_bill",{p_bill_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}],
      supplier_payment_reverse:["admin_finance_reverse_supplier_payment",{p_payment_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}],
      supplier_credit_reverse:["admin_finance_reverse_supplier_credit_note",{p_credit_note_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}],
      customer_refund_reverse:["admin_finance_reverse_customer_refund",{p_return_request_id:id,p_reversal_date:todayDhaka(),p_reason:reason.trim()}]
    };
    const [rpc,args]=config[kind]||[];
    if(!rpc)return;
    try{
      const {data,error}=await client.rpc(rpc,args);
      if(error)throw error;
      await audit("finance_"+kind,"finance_source",id,"Operational source reversed",{reversal_journal_id:data});
      toast("Source transaction reversed. Original and reversal Journals remain in history.");
      await refreshAll();
    }catch(error){toast(error.message||"Source transaction could not be reversed.","error");}
  }

  async function submitOperationalPosting(event) {
    event.preventDefault();
    if(!operationalPostContext)return;
    const {kind,id,meta}=operationalPostContext;
    const button=$("financeOperationalPostSubmit");
    button.disabled=true;
    $("financeOperationalPostError").textContent="";
    try{
      let rpc,args;
      if(kind==="cashbook_post"){
        const counter=$("financeOperationalAccount").value;
        if(!counter)throw new Error("Choose a General Ledger counter-account.");
        const source=cashbookEntries.find(e=>e.id===id);
        if(source?.related_order_id){
          const delivered=deliveredOrders.some(order=>order.id===source.related_order_id);
          const requiredCode=source.entry_type==="expense"?"2020":delivered?"1100":"2020";
          if(counter!==accounts.find(a=>a.account_code===requiredCode)?.id)
            throw new Error(source.entry_type==="expense"?"Pre-delivery advance refunds must debit Customer Advances (2020).":delivered?"Post-delivery receipts must credit Accounts Receivable (1100).":"Pre-delivery customer payments must credit Customer Advances (2020).");
        }
        rpc="admin_finance_post_cashbook_entry";
        args={p_entry_id:id,p_counter_account_id:counter};
      }else if(kind==="supplier_bill_post"){
        const debit=$("financeOperationalAccount").value;
        if(!debit)throw new Error("Choose Inventory, Cost of Sales or an Expense account.");
        const tax=Number(meta.taxAmount||0)>0?$("financeOperationalTaxAccount").value:null;
        if(Number(meta.taxAmount||0)>0&&!tax)throw new Error("Choose the supplier invoice tax classification.");
        rpc="admin_finance_post_supplier_bill";
        args={p_bill_id:id,p_debit_account_id:debit,p_tax_account_id:tax};
      }else if(kind==="opening_post"){
        const offset=$("financeOperationalAccount").value;
        if(!offset)throw new Error("Choose an Equity or Liability offset account.");
        if(!confirm("Confirm this opening balance matches a real statement and is not test data."))return;
        rpc="admin_finance_post_account_opening_balance";
        args={p_account_id:id,p_offset_account_id:offset};
      }else if(kind==="customer_refund_post"){
        const refundAccount=$("financeOperationalCashAccount").value;
        if(!refundAccount)throw new Error("Choose the cash, bank or wallet account from which the refund was actually paid.");
        if(!confirm("Confirm the customer refund has actually been paid from this account. The posting will debit Sales Returns and credit the selected cash/bank account."))return;
        rpc="admin_finance_post_customer_refund";
        args={p_return_request_id:id,p_refund_account_id:refundAccount};
      }else throw new Error("Unsupported operational posting action.");
      const {data,error}=await client.rpc(rpc,args);
      if(error)throw error;
      await audit("finance_"+kind,"finance_source",id,"Source event posted to double-entry accounting",{journal_id:data});
      $("financeOperationalPostDialog").close();
      operationalPostContext=null;
      toast("Source event posted to the General Ledger.");
      await refreshAll();
    }catch(error){$("financeOperationalPostError").textContent=error.message||"Source event could not be posted.";}
    finally{button.disabled=false;}
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
        const linkedOrderDelivered = source?.related_order_id && deliveredOrders.some(order=>order.id===source.related_order_id);
        const defaultAccount = source?.related_order_id
          ? accounts.find(a=>a.account_code===(source.entry_type==="expense"?"2020":linkedOrderDelivered?"1100":"2020"))?.id
          : source?.entry_type === "income"
            ? accounts.find(a=>a.account_code==="4010")?.id
            : accounts.find(a=>a.account_code==="6095")?.id;
        openOperationalPosting(kind,id,{
          title:"Post cashbook transaction",
          description:"Select why this money was received or paid. Before delivery, receipts credit Customer Advances (2020) and advance refunds debit it; after delivery, collections credit Accounts Receivable (1100). COD uses the courier settlement workflow.",
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
      } else if (kind === "customer_refund_post") {
        const item=customerReturns.find(r=>r.id===id);
        const refundAccount=financeAccounts.find(a=>a.id===item?.refund_account_id)?.id;
        openOperationalPosting(kind,id,{
          title:"Post customer refund",
          defaultAccount:refundAccount,
          description:"Choose the Finance account from which the refund was actually paid. The Journal debits Sales Returns and credits that cash, bank or wallet account.",
          warning:"This records the refund amount only. Inventory restocking and COGS reversal are not inferred because the return record has no verified item-level quantities."
        });
      } else if (kind === "supplier_credit_post") {
        await runOperationalAction(kind,id);
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
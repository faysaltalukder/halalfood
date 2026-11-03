(() => {
"use strict";
if (document.body.dataset.page !== "finance" || !window.HFAdminReady) return;
window.HFAdminReady.then(async H => {
  if (!H || document.body.dataset.page !== "finance") return;
  const { client, signedQuery, money, dateOnly, toast } = H;
  const $ = id => document.getElementById(id);
  const root = $("financeReportingIntelligence");
  if (!root) return;
  let receivables = [], payables = [], inventory = [];
  const today = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const dayDiff = (from,to) => Math.max(0,Math.floor((Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000));
  const esc = value => H.esc(String(value ?? ""));
  const csvCell = value => '"' + String(value ?? "").replace(/"/g,'""') + '"';
  const download = (name, rows) => {
    const csv = "\uFEFF" + rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
  };
  const bucket = days => days<=30?"0–30 days":days<=60?"31–60 days":days<=90?"61–90 days":"90+ days";
  function summarizeReceivables(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = row.activity_key || row.order_id || row.source_journal_id;
      if (!key) continue;
      const item = map.get(key) || {key,order_number:row.order_number,customer_name:row.customer_name||row.party_name||"Unidentified customer",order_date:row.order_date,firstDebit:null,balance:0};
      item.balance += Number(row.receivable_delta||0);
      if (Number(row.receivable_delta||0)>0 && (!item.firstDebit || String(row.entry_date)<item.firstDebit)) item.firstDebit=String(row.entry_date).slice(0,10);
      if (!item.order_number && row.order_number) item.order_number=row.order_number;
      if ((!item.customer_name || item.customer_name==="Unidentified customer") && (row.customer_name||row.party_name)) item.customer_name=row.customer_name||row.party_name;
      map.set(key,item);
    }
    return [...map.values()].filter(x=>x.balance>0.005).map(x=>{
      const since=x.firstDebit||x.order_date||today();
      const age=dayDiff(since,today());
      return {...x,age,bucket:bucket(age)};
    }).sort((a,b)=>b.balance-a.balance);
  }
  function summarizePayables(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!row.bill_id) continue;
      const item=map.get(row.bill_id)||{bill_id:row.bill_id,supplier_name:row.supplier_name,bill_number:row.bill_number,invoice_date:row.invoice_date,due_date:row.due_date,balance:0};
      item.balance+=Number(row.amount_delta||0);
      map.set(row.bill_id,item);
    }
    return [...map.values()].filter(x=>x.balance>0.005).map(x=>{
      const basis=x.due_date||x.invoice_date;
      const age=dayDiff(basis||today(),today());
      return {...x,age,bucket:x.due_date?(age===0?"Not overdue":bucket(age)):("No due date · invoice age "+age+"d")};
    }).sort((a,b)=>b.balance-a.balance);
  }
  function renderMetrics() {
    const ar=receivables.reduce((n,x)=>n+x.balance,0);
    const ap=payables.reduce((n,x)=>n+x.balance,0);
    const valued=inventory.filter(x=>x.estimated_stock_value!==null && x.estimated_stock_value!==undefined);
    const stockValue=valued.reduce((n,x)=>n+Number(x.estimated_stock_value||0),0);
    const unknown=inventory.filter(x=>["cost_missing","negative_stock"].includes(x.valuation_status)).length;
    $("financeRiReceivableTotal").textContent=money(ar);
    $("financeRiPayableTotal").textContent=money(ap);
    $("financeRiStockValue").textContent=money(stockValue);
    $("financeRiCostCoverage").textContent=inventory.length?((inventory.length-unknown)/inventory.length*100).toFixed(0)+"%":"—";
    $("financeRiReceivableCount").textContent=receivables.length+" open items";
    $("financeRiPayableCount").textContent=payables.length+" open bills";
    $("financeRiStockNote").textContent=valued.length+" of "+inventory.length+" products valued";
    $("financeRiCostNote").textContent=unknown+" products need cost/stock review";
  }
  function renderReceivables() {
    const body=$("financeRiReceivablesBody");
    body.innerHTML=receivables.length?receivables.map(x=>"<tr><td><strong>"+esc(x.order_number||"Journal-linked")+"</strong><small>"+esc(x.customer_name)+"</small></td><td>"+dateOnly(x.firstDebit||x.order_date||"")+"</td><td>"+esc(x.bucket)+"</td><td>"+x.age.toLocaleString("en-BD")+" days</td><td><strong>"+money(x.balance)+"</strong></td></tr>").join(""):'<tr><td colspan="5">No posted customer receivables are currently outstanding.</td></tr>';
  }
  function renderPayables() {
    const body=$("financeRiPayablesBody");
    body.innerHTML=payables.length?payables.map(x=>"<tr><td><strong>"+esc(x.bill_number||"Supplier bill")+"</strong><small>"+esc(x.supplier_name)+"</small></td><td>"+dateOnly(x.invoice_date||"")+"</td><td>"+dateOnly(x.due_date||"")+"</td><td>"+esc(x.bucket)+"</td><td><strong>"+money(x.balance)+"</strong></td></tr>").join(""):'<tr><td colspan="5">No posted supplier bills are currently outstanding.</td></tr>';
  }
  function renderInventory() {
    const rows=[...inventory].sort((a,b)=>{
      const av=a.estimated_stock_value==null?-1:Number(a.estimated_stock_value),bv=b.estimated_stock_value==null?-1:Number(b.estimated_stock_value);
      return bv-av;
    });
    $("financeRiInventoryBody").innerHTML=rows.length?rows.map(x=>"<tr><td><strong>"+esc(x.product_name)+"</strong><small>"+esc(x.sku||x.category||"")+"</small></td><td>"+Number(x.stock_quantity||0).toLocaleString("en-BD")+"</td><td>"+(x.valued_unit_cost==null?"—":money(x.valued_unit_cost))+"</td><td>"+(x.estimated_stock_value==null?"—":money(x.estimated_stock_value))+"</td><td><span class=\"hf-ri-status hf-ri-status-"+esc(x.valuation_status)+"\">"+esc(({manual_cost:"Manual cost",weighted_average_grn:"Weighted GRN",cost_missing:"Cost missing",negative_stock:"Negative stock",zero_stock:"Zero stock"})[x.valuation_status]||x.valuation_status)+"</span></td></tr>").join(""):'<tr><td colspan="5">No inventory valuation data is available.</td></tr>';
  }
  function renderAll(){renderMetrics();renderReceivables();renderPayables();renderInventory();}
  async function refresh(){
    const button=$("financeRiRefresh");if(button)button.disabled=true;
    $("financeRiStatus").textContent="Refreshing live accounting sources…";
    try{
      const [ar,ap,iv]=await Promise.all([
        signedQuery(client.from("admin_finance_receivable_activity").select("*").order("entry_date",{ascending:false}).limit(10000)),
        signedQuery(client.from("admin_finance_payable_activity").select("*").order("activity_date",{ascending:false}).limit(10000)),
        signedQuery(client.from("admin_finance_inventory_valuation").select("*").order("estimated_stock_value",{ascending:false,nullsFirst:false}).limit(2000))
      ]);
      receivables=summarizeReceivables(ar);payables=summarizePayables(ap);inventory=iv||[];
      renderAll();
      $("financeRiStatus").textContent="Live data refreshed · "+new Date().toLocaleTimeString("en-BD",{timeZone:"Asia/Dhaka"});
    }catch(error){
      $("financeRiStatus").textContent="Reporting data could not be loaded: "+(error.message||"Unknown error");
      toast(error.message||"Finance reports could not be loaded.","error");
    }finally{if(button)button.disabled=false;}
  }
  function exportAll(){
    const rows=[["Report","Reference","Name","Date","Age / status","Amount / value"]];
    receivables.forEach(x=>rows.push(["Customer receivable",x.order_number||x.key,x.customer_name,x.firstDebit||x.order_date,x.bucket,x.balance]));
    payables.forEach(x=>rows.push(["Supplier payable",x.bill_number||x.bill_id,x.supplier_name,x.due_date||x.invoice_date,x.bucket,x.balance]));
    inventory.forEach(x=>rows.push(["Inventory valuation",x.sku||x.product_id,x.product_name,"","",x.estimated_stock_value??"Cost unavailable"]));
    download("halal-food-finance-intelligence-"+today()+".csv",rows);
  }
  root.addEventListener("click",event=>{
    const tab=event.target.closest("[data-finance-ri-tab]");
    if(tab){
      root.querySelectorAll("[data-finance-ri-tab]").forEach(x=>x.setAttribute("aria-pressed",String(x===tab)));
      root.querySelectorAll("[data-finance-ri-panel]").forEach(x=>x.hidden=x.dataset.financeRiPanel!==tab.dataset.financeRiTab);
    }
  });
  $("financeRiRefresh")?.addEventListener("click",refresh);
  $("financeRiExport")?.addEventListener("click",exportAll);
  await refresh();
});
})();
(() => {
"use strict";
window.HFAdminReady.then(async H => {
  if(!H)return;
  const {client,signedQuery,fetchOrders,fetchProducts,money,esc,toast}=H;
  const $=id=>document.getElementById(id);
  const fmtCount=value=>Number(value||0).toLocaleString("en-BD",{maximumFractionDigits:2});
  const dayParts=value=>{
    const d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime()))return null;
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
    const get=t=>parts.find(x=>x.type===t)?.value||"";
    return {y:get("year"),m:get("month"),d:get("day")};
  };
  const dayKey=value=>{
    if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
    const p=dayParts(value);
    return p?p.y+"-"+p.m+"-"+p.d:"";
  };
  const addDays=(key,n)=>{
    const [y,m,d]=String(key).split("-").map(Number),date=new Date(Date.UTC(y,m-1,d+n));
    return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0");
  };
  const makeRange=()=>{
    const today=dayKey(new Date()),period=$("bhPeriod").value;
    let from=today,to=today,label="Today";
    if(period==="yesterday"){from=addDays(today,-1);to=from;label="Yesterday";}
    else if(period==="7"){from=addDays(today,-6);label="Last 7 days";}
    else if(period==="30"){from=addDays(today,-29);label="Last 30 days";}
    else if(period==="month"){from=today.slice(0,7)+"-01";label="This month";}
    return {from,to,label,start:from+"T00:00:00+06:00",end:to+"T23:59:59.999+06:00"};
  };
  const inRange=(value,r)=>{const d=dayKey(value);return Boolean(d&&d>=r.from&&d<=r.to);};
  const dateTime=value=>{
    const d=new Date(value);
    return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(d);
  };
  const sum=(rows,fn)=>rows.reduce((n,row)=>n+(Number(fn(row))||0),0);
  const link=(href,label)=>'<a class="hf-bh-inline-link" href="'+esc(href)+'">'+esc(label)+' ↗</a>';
  const badgeMap={ready:["Ready","is-ready"],attention:["Review","is-attention"],partial:["Partial","is-partial"],blocked:["Needs data","is-blocked"],unavailable:["Unavailable","is-unavailable"]};
  const badge=status=>{const b=badgeMap[status]||badgeMap.ready;return '<span class="hf-bh-status '+b[1]+'">'+b[0]+'</span>';};
  async function readPaged(makeQuery,cap){
    const pageSize=1000,rows=[];
    while(rows.length<cap){
      const page=await signedQuery(makeQuery().range(rows.length,Math.min(cap,rows.length+pageSize)-1));
      rows.push(...page);
      if(page.length<pageSize)break;
    }
    return rows;
  }
  const groups=[
    {id:"sales",title:"Sales & Orders",subtitle:"What was booked, delivered and still needs attention?",items:[
      ["booked-value","How much order value came in during this period?"],
      ["order-count","How many orders were placed?"],
      ["delivered-sales","How much product value was delivered?"],
      ["units-sold","How many product units were delivered?"],
      ["top-product","Which product sold the most units?"],
      ["open-orders","How many orders are still waiting?"]
    ]},
    {id:"money",title:"Money & Profit",subtitle:"Separate recorded money movement from product profit.",items:[
      ["cash-in","How much money was actually recorded as received?"],
      ["cash-out","How much money was recorded as paid out?"],
      ["cash-movement","Was recorded cash movement positive or negative?"],
      ["profit","What gross profit did delivered products generate?"],
      ["cod-outstanding","How much COD is still unsettled?"],
      ["supplier-payable","How much is currently owed to suppliers?"]
    ]},
    {id:"stock",title:"Stock & Inventory",subtitle:"Find products that need replenishment or stock review.",items:[
      ["low-stock","Which products are below their low-stock level?"],
      ["out-stock","Which products are out of stock?"],
      ["stock-value","How much stock value can be measured at cost?"],
      ["stock-movement","What changed in stock during this period?"]
    ]},
    {id:"control",title:"Purchasing & Control",subtitle:"Track incoming goods and spending limits.",items:[
      ["pending-purchases","Which purchase orders still have goods outstanding?"],
      ["budget-over","Did any expense category exceed its monthly budget?"]
    ]}
  ];
  let answers={},range=null,updatedAt=null,busy=false,errors={};
  function setAnswer(id,value,status,summary,formula,source,rows=[],note="",href=null){
    answers[id]={value,status,summary,formula,source,rows,note,href};
  }
  function detailsTable(rows){
    if(!rows.length)return '<div class="hf-bh-empty-detail">No individual records are available for this answer.</div>';
    return '<div class="hf-bh-detail-table-wrap"><table class="hf-bh-detail-table"><thead><tr><th>Record</th><th>Value</th><th>Note</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><td>'+(row.href?link(row.href,row.label):esc(row.label))+'</td><td>'+esc(row.value??"—")+'</td><td>'+esc(row.note||"—")+'</td></tr>').join("")+
      '</tbody></table></div>';
  }
  function openDetails(id){
    const q=groups.flatMap(g=>g.items).find(x=>x[0]===id),a=answers[id];
    if(!q||!a)return;
    $("bhDialogEyebrow").textContent=q[1];$("bhDialogTitle").textContent=a.value;$("bhDialogStatus").innerHTML=badge(a.status);
    $("bhDialogBody").innerHTML='<p class="hf-bh-detail-summary">'+esc(a.summary)+'</p>'+
      '<div class="hf-bh-detail-method"><strong>How this is calculated</strong><p>'+esc(a.formula)+'</p></div>'+
      (a.note?'<div class="hf-bh-detail-note">'+esc(a.note)+'</div>':"")+
      '<div class="hf-bh-detail-source"><strong>Source</strong><span>'+esc(a.source)+'</span></div>'+
      detailsTable(a.rows)+(a.href?'<div class="hf-bh-detail-action">'+link(a.href[0],a.href[1])+'</div>':"");
    $("businessHealthDialog").showModal();
  }
  function renderQuestions(){
    const search=String($("bhSearch").value||"").trim().toLowerCase();
    const content=groups.map(group=>{
      const items=group.items.filter(([id,title])=>{
        const a=answers[id]||{};
        return !search||(title+" "+group.title+" "+(a.value||"")+" "+(a.summary||"")).toLowerCase().includes(search);
      });
      if(!items.length)return "";
      return '<section class="hf-bh-question-group" id="bh-'+group.id+'"><div class="hf-bh-group-head"><div><h2>'+esc(group.title)+'</h2><p>'+esc(group.subtitle)+'</p></div><span>'+items.length+' questions</span></div><div class="hf-bh-question-list">'+
      items.map(([id,title],index)=>{
        const a=answers[id]||{value:"Calculating…",status:"unavailable",summary:"Refresh to load the latest records."};
        return '<article class="hf-bh-question-card">'+
          '<button class="hf-bh-question-trigger" type="button" data-bh-question="'+id+'" aria-expanded="false"><span class="hf-bh-question-number">'+String(index+1).padStart(2,"0")+'</span>'+
          '<span class="hf-bh-question-title"><strong>'+esc(title)+'</strong><small>'+badgeMap[a.status||"unavailable"][0]+'</small></span>'+
          '<span class="hf-bh-question-preview">'+esc(a.value)+'</span><span class="hf-bh-question-chevron" aria-hidden="true">⌄</span></button>'+
          '<div class="hf-bh-answer" id="bh-answer-'+id+'" hidden><div class="hf-bh-answer-main"><div><span class="hf-bh-answer-label">Answer</span><strong class="hf-bh-answer-value">'+esc(a.value)+'</strong></div>'+badge(a.status)+'</div>'+
          '<p>'+esc(a.summary||"")+'</p>'+(a.note?'<p class="hf-bh-answer-note">'+esc(a.note)+'</p>':"")+
          '<div class="hf-bh-answer-actions"><button class="hf-button hf-button-secondary hf-button-small" type="button" data-bh-details="'+id+'">Details →</button>'+(a.href?link(a.href[0],a.href[1]):"")+'</div></div></article>';
      }).join("")+'</div></section>';
    }).join("");
    $("bhQuestionGroups").innerHTML=content||'<div class="hf-bh-empty">No questions match this search.</div>';
  }
  function renderSummary(data){
    const orders=data.orders.filter(o=>o.status!=="cancelled"&&inRange(o.ordered_at,range));
    const booked=sum(orders,o=>o.total);
    const received=sum(data.finance.filter(e=>e.status==="confirmed"&&e.entry_type==="income"&&inRange(e.entry_date,range)),e=>e.amount);
    const open=data.orders.filter(o=>["pending","processing","shipped"].includes(o.status));
    const low=data.products.filter(p=>p.is_active!==false&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5));
    const zero=data.products.filter(p=>p.is_active!==false&&Number(p.stock_quantity)===0);
    const cards=[
      ["Booked order value",money(booked),orders.length+" non-cancelled orders"],
      ["Confirmed money in",money(received),"Confirmed Finance income"],
      ["Open orders",fmtCount(open.length),"Pending, processing or shipped"],
      ["Stock to review",fmtCount(low.length+zero.length),zero.length+" out · "+low.length+" low stock"]
    ];
    $("bhSummary").innerHTML=cards.map(c=>'<div class="hf-bh-summary-card"><span>'+esc(c[0])+'</span><strong>'+esc(c[1])+'</strong><small>'+esc(c[2])+'</small></div>').join("");
    $("bhRangeLabel").textContent=range.label+" · Bangladesh time";
    $("bhUpdatedAt").textContent="Updated "+dateTime(updatedAt);
    $("bhSummaryHint").textContent=(low.length+zero.length+open.length)?fmtCount(low.length+zero.length+open.length)+" current stock/order items may need review.":"No open order or low-stock counts detected.";
  }
  function buildAnswers(data){
    answers={};
    const r=range;
    const booked=data.orders.filter(o=>o.status!=="cancelled"&&inRange(o.ordered_at,r));
    const bookedValue=sum(booked,o=>o.total);
    setAnswer("booked-value",money(bookedValue),errors.orders?"partial":"ready",
      booked.length+" non-cancelled orders were created during "+r.label.toLowerCase()+". This is order value booked, not confirmed payment.",
      "Sum of orders.total by Bangladesh-local order date, excluding cancelled orders. Delivery charges remain included in booked order value.",
      "orders.total · orders.ordered_at · orders.status",
      booked.slice().sort((a,b)=>Number(b.total||0)-Number(a.total||0)).slice(0,40).map(o=>({label:o.order_number||String(o.id).slice(0,8),value:money(o.total),note:o.status+" · "+dateTime(o.ordered_at),href:"./orders.html"})),
      "Pending, processing and shipped orders are included. Do not treat this amount as cash received.",
      ["./orders.html","Review orders"]);

    setAnswer("order-count",fmtCount(booked.length)+" orders",errors.orders?"unavailable":"ready",
      "Non-cancelled orders created during "+r.label.toLowerCase()+".",
      "Count orders whose Asia/Dhaka order date falls within the selected reporting period; cancelled orders are excluded.",
      "orders.ordered_at · orders.status",
      booked.slice(0,50).map(o=>({label:o.order_number||String(o.id).slice(0,8),value:o.status,note:money(o.total)+" · "+dateTime(o.ordered_at),href:"./orders.html"})),
      "",["./orders.html","Open order management"]);

    const deliveryDate=new Map();
    data.history.filter(h=>h.to_status==="delivered").forEach(h=>{
      const previous=deliveryDate.get(h.order_id);
      if(!previous||Date.parse(h.changed_at)>Date.parse(previous))deliveryDate.set(h.order_id,h.changed_at);
    });
    const delivered=[],undated=[];
    data.orders.filter(o=>o.status==="delivered").forEach(o=>{
      const when=deliveryDate.get(o.id);
      if(when&&inRange(when,r))delivered.push({...o,deliveryAt:when,deliveryBasis:"Recorded delivery status"});
      else if(!when&&o.source==="offline_pos"&&inRange(o.ordered_at,r))delivered.push({...o,deliveryAt:o.ordered_at,deliveryBasis:"POS sale date"});
      else if(!when&&inRange(o.ordered_at,r))undated.push(o);
    });
    const itemRevenue=o=>{
      const itemTotal=sum(o.order_items||[],i=>i.line_total!=null?i.line_total:Number(i.unit_price||0)*Number(i.quantity||0));
      return Math.max(0,(itemTotal||Number(o.subtotal||0))-Number(o.coupon_discount_amount||0));
    };
    const deliveredRevenue=sum(delivered,itemRevenue);
    const deliveredItems=delivered.flatMap(o=>(o.order_items||[]).map(i=>({...i,order:o})));
    setAnswer("delivered-sales",money(deliveredRevenue),errors.orders||errors.history?"partial":"ready",
      delivered.length+" orders reached Delivered during "+r.label.toLowerCase()+". Product value is after recorded coupon discounts and excludes delivery charges.",
      "For each currently delivered order, sum order-item line totals and subtract recorded coupon discount. Delivery date comes from order_status_history; offline POS uses its sale date.",
      "orders · order_items · order_status_history · coupon_discount_amount",
      delivered.map(o=>({label:o.order_number||String(o.id).slice(0,8),value:money(itemRevenue(o)),note:o.deliveryBasis+" · "+dateTime(o.deliveryAt),href:"./orders.html"})),
      undated.length?undated.length+" older delivered orders had no delivery timestamp and were not assigned to this period.":"",
      ["./orders.html","Review delivered orders"]);

    const units=sum(deliveredItems,i=>i.quantity);
    setAnswer("units-sold",fmtCount(units)+" units",errors.orders||errors.history?"partial":"ready",
      deliveredItems.length+" product lines across "+delivered.length+" completed orders.",
      "Sum order_items.quantity for currently delivered orders with a delivery timestamp in the selected period. Pending stock reservations are not sales.",
      "orders · order_items · order_status_history",
      deliveredItems.slice(0,60).map(i=>({label:i.product_name,value:fmtCount(i.quantity)+" "+(i.unit||"units"),note:(i.order.order_number||"Order")+" · "+dateTime(i.order.deliveryAt),href:"./orders.html"})),
      undated.length?undated.length+" older delivered orders lack a reliable delivery timestamp.":"",
      ["./orders.html","Open orders"]);

    const topMap=new Map();
    deliveredItems.forEach(i=>{
      const key=String(i.product_id||i.product_name);
      const row=topMap.get(key)||{name:i.product_name,units:0,value:0};
      row.units+=Number(i.quantity)||0;row.value+=Number(i.line_total)||Number(i.unit_price||0)*Number(i.quantity||0);topMap.set(key,row);
    });
    const topRows=[...topMap.values()].sort((a,b)=>b.units-a.units||b.value-a.value);
    setAnswer("top-product",topRows[0]?topRows[0].name+" · "+fmtCount(topRows[0].units):"No delivered product yet",topRows.length?"ready":"attention",
      topRows.length?"Top product by delivered unit quantity during "+r.label.toLowerCase()+".":"No completed product lines were recorded during this period.",
      "Group delivered order_items by product ID (or saved product name); rank by total quantity, then by line value.",
      "order_items grouped by product · delivery status history",
      topRows.slice(0,25).map(x=>({label:x.name,value:fmtCount(x.units)+" units",note:money(x.value)+" recorded line value"})),
      "Only delivered sales are ranked; pending or cancelled orders are not included.",
      ["./products.html","Open product catalogue"]);

    const open=data.orders.filter(o=>["pending","processing","shipped"].includes(o.status));
    setAnswer("open-orders",fmtCount(open.length)+" open orders",open.length?"attention":"ready",
      "Current orders that are pending, being prepared or out for delivery.",
      "Live count of orders whose current status is pending, processing or shipped. This is a current backlog, independent of the selected date range.",
      "orders.status",
      open.slice(0,60).map(o=>({label:o.order_number||String(o.id).slice(0,8),value:money(o.total),note:o.status+" · "+dateTime(o.ordered_at),href:"./orders.html"})),
      "",["./orders.html","Work through open orders"]);

    const periodFinance=data.finance.filter(e=>e.status==="confirmed"&&inRange(e.entry_date,r));
    const income=periodFinance.filter(e=>e.entry_type==="income"),expense=periodFinance.filter(e=>e.entry_type==="expense");
    const cashIn=sum(income,e=>e.amount),cashOut=sum(expense,e=>e.amount);
    setAnswer("cash-in",money(cashIn),errors.finance?"unavailable":"ready",
      income.length+" confirmed Finance income entries in "+r.label.toLowerCase()+".",
      "Sum confirmed admin_finance_entries where entry_type is income and entry_date is in the selected period. Draft entries are excluded.",
      "admin_finance_entries · confirmed income",
      income.map(e=>({label:e.category||"Income",value:money(e.amount),note:e.entry_date+" · "+(e.reference||e.party_name||"No reference")})),
      "An order is not counted as received money unless a matching confirmed Finance income entry has been recorded.",
      ["./finance.html","Review Finance entries"]);
    setAnswer("cash-out",money(cashOut),errors.finance?"unavailable":"ready",
      expense.length+" confirmed Finance expense entries in "+r.label.toLowerCase()+".",
      "Sum confirmed admin_finance_entries where entry_type is expense and entry_date is in the selected period. Internal transfers are excluded.",
      "admin_finance_entries · confirmed expense",
      expense.map(e=>({label:e.category||"Expense",value:money(e.amount),note:e.entry_date+" · "+(e.reference||e.party_name||"No reference")})),
      "Supplier payments are included as actual cash outflow here. This is not the same as cost of goods sold.",
      ["./finance.html","Review expenses"]);
    const netCash=cashIn-cashOut;
    setAnswer("cash-movement",(netCash>0?"+":"")+money(netCash),errors.finance?"unavailable":netCash<0?"attention":"ready",
      netCash>0?"Recorded confirmed inflows exceeded recorded outflows.":netCash<0?"Recorded confirmed outflows exceeded recorded inflows.":"Recorded inflows and outflows were equal.",
      "Confirmed Finance income minus confirmed Finance expenses. Internal transfers between accounts are not counted as income or expense.",
      "admin_finance_entries · confirmed money movement",
      [{label:"Confirmed money in",value:money(cashIn),note:income.length+" income entries"},{label:"Confirmed money out",value:money(cashOut),note:expense.length+" expense entries"},{label:"Net cash movement",value:money(netCash),note:"Not profit"}],
      "Cash movement is not profit. Inventory purchases, loan principal, capital, refunds and timing differences can make these numbers differ.",
      ["./finance.html","Open Finance & Cash Flow"]);

    const snapshotMap=new Map(data.snapshots.map(s=>[s.order_item_id,s]));
    let captured=0,missingSnapshot=0,missingCost=0,totalCost=0;
    const costRows=[];
    deliveredItems.forEach(i=>{
      const snap=snapshotMap.get(i.id),qty=Number(i.quantity)||0;
      if(!snap){missingSnapshot++;costRows.push({label:i.product_name,value:"No snapshot",note:"Sale-time cost was not captured."});return;}
      if(snap.snapshot_status!=="captured"||snap.cost_price===null||snap.cost_price===undefined){missingCost++;costRows.push({label:i.product_name,value:"Cost missing",note:"No cost price was configured when sold."});return;}
      const unitCost=Number(snap.cost_price)+Number(snap.packaging_cost||0),lineCost=unitCost*qty;
      totalCost+=lineCost;captured++;costRows.push({label:i.product_name,value:money(lineCost),note:fmtCount(qty)+" × "+money(unitCost)+" including packaging"});
    });
    const completeCost=deliveredItems.length>0&&missingSnapshot===0&&missingCost===0;
    const grossProfit=deliveredRevenue-totalCost;
    if(errors.snapshots||errors.orders||errors.history){
      setAnswer("profit","Profit cannot be verified","unavailable","A required sales, delivery or private cost source could not be read.","Gross profit requires delivered product revenue and a saved sale-time cost snapshot for every delivered product line.","orders · order_items · private business health cost snapshots",[],errors.snapshots||errors.orders||errors.history,["./products.html","Review product costs"]);
    }else if(!deliveredItems.length){
      setAnswer("profit","No delivered sales", "attention","No delivery-confirmed product lines were recorded in this period.","Gross profit is calculated only after an order has been delivered and its sale-time cost is available.","orders · order_status_history",[], "Booked orders and pending COD are not treated as completed sales.",["./orders.html","Review orders"]);
    }else if(!completeCost){
      setAnswer("profit","Not reliable yet","blocked","Sale-time cost coverage is "+captured+" of "+deliveredItems.length+" delivered product lines. Missing cost data prevents a reliable gross-profit figure.","Gross profit = delivered product value after coupon discount − captured product cost − packaging cost. Missing historical costs are never guessed.","order_items · private cost snapshots · admin_product_costs",costRows,
        missingSnapshot+" line(s) have no historical snapshot; "+missingCost+" line(s) had no configured cost at sale time. Complete product cost settings for future sales.",
        ["./products.html","Complete product cost settings"]);
    }else{
      setAnswer("profit",money(grossProfit)+" gross profit",grossProfit<0?"attention":"ready",
        "Delivered product sales generated "+money(grossProfit)+" gross profit before rent, marketing, salaries, taxes and other operating overhead.",
        "Sum delivered product line values after coupon discounts, then subtract the immutable sale-time product cost and packaging cost for each delivered unit.",
        "orders · order_items · private business health cost snapshots",
        [{label:"Delivered product value",value:money(deliveredRevenue),note:delivered.length+" delivered orders"},
         {label:"Product and packaging cost",value:money(totalCost),note:captured+" of "+deliveredItems.length+" lines costed"},
         {label:"Gross profit",value:money(grossProfit),note:"Before overhead and other operating expenses"}].concat(costRows),
        "This is gross profit, not final net profit. Do not subtract supplier cash payments again: the sale-time item cost already accounts for stock consumed. Other operating costs, tax, refunds and returns need separate accounting before a final net-profit figure can be stated.",
        ["./finance.html","Review operating expenses"]);
    }

    const codActive=data.cod.filter(s=>s.status!=="cancelled"&&s.status!=="reconciled");
    const unsettled=sum(codActive,s=>Math.max(0,Number(s.cod_amount||0)-Number(s.remitted_amount||0)));
    setAnswer("cod-outstanding",money(unsettled),errors.cod?"unavailable":unsettled>0?"attention":"ready",
      codActive.length+" unreconciled COD settlement record(s) remain in the collection/remittance pipeline.",
      "Sum max(0, COD amount − remitted amount) for non-cancelled, unreconciled settlement records. This is unsettled COD exposure, not money already received.",
      "admin_cod_settlements",
      codActive.filter(s=>Number(s.cod_amount||0)>Number(s.remitted_amount||0)).map(s=>({label:s.order_number,value:money(Math.max(0,Number(s.cod_amount||0)-Number(s.remitted_amount||0))),note:(s.courier_name||"Courier not set")+" · "+s.status+" · remitted "+money(s.remitted_amount)})),
      "Pending collection, collected-but-not-remitted and exception records are shown together. Check the status before treating an amount as physically held by a courier.",
      ["./finance.html#financeCodSection","Review COD settlements"]);

    const payables=data.suppliers.filter(s=>Number(s.outstanding_balance||0)>0);
    const payable=sum(payables,s=>s.outstanding_balance);
    setAnswer("supplier-payable",money(payable),errors.suppliers?"unavailable":payable>0?"attention":"ready",
      payables.length+" suppliers currently have a positive outstanding balance.",
      "Sum positive outstanding_balance values from admin_supplier_balances. Confirmed bills, payments, credits and opening balances are reflected by the supplier ledger.",
      "admin_supplier_balances",
      payables.sort((a,b)=>Number(b.outstanding_balance||0)-Number(a.outstanding_balance||0)).map(s=>({label:s.supplier_name,value:money(s.outstanding_balance),note:"Last purchase "+(s.last_purchase_date||"—")+" · last payment "+(s.last_payment_date||"—")})),
      "This is a current balance, independent of the selected reporting period. Draft bills are not included in confirmed supplier balances.",
      ["./supplier-purchases.html","Review supplier balances"]);

    const unconfigured=data.products.filter(p=>p.stock_quantity===null||p.stock_quantity===undefined);
    const low=data.products.filter(p=>p.is_active!==false&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5));
    const out=data.products.filter(p=>p.is_active!==false&&Number(p.stock_quantity)===0);
    setAnswer("low-stock",fmtCount(low.length)+" products",errors.products?"unavailable":low.length?"attention":"ready",
      low.length?low.length+" active products are at or below their low-stock threshold.":"No configured active product stock is below its threshold.",
      "A product is low-stock when stock_quantity is above zero and less than or equal to its low_stock_threshold. Unconfigured stock is not treated as zero.",
      "products.stock_quantity · admin_product_costs.low_stock_threshold",
      low.sort((a,b)=>Number(a.stock_quantity)-Number(b.stock_quantity)).map(p=>({label:p.name,value:fmtCount(p.stock_quantity)+" "+p.unit_type,note:"Threshold "+fmtCount(p.low_stock_threshold??5)+" · "+(p.category||"Uncategorised")})),
      unconfigured.length+" products have no stock quantity configured and are excluded from this count.",
      ["./products.html","Open product inventory"]);
    setAnswer("out-stock",fmtCount(out.length)+" products",errors.products?"unavailable":out.length?"attention":"ready",
      out.length?"These active products have a configured stock balance of exactly zero.":"No active product with configured stock is currently at zero.",
      "Count active products where stock_quantity equals zero. Null stock means not configured, not out of stock.",
      "products.stock_quantity",
      out.map(p=>({label:p.name,value:"0 "+p.unit_type,note:p.category||"Uncategorised"})),
      unconfigured.length+" products have unconfigured stock and are excluded.",
      ["./products.html","Update product stock"]);

    const stockRows=data.products.filter(p=>p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.cost_price!==null&&p.cost_price!==undefined);
    const stockValue=sum(stockRows,p=>Number(p.stock_quantity||0)*Number(p.cost_price||0));
    const costConfigured=data.products.filter(p=>p.cost_price!==null&&p.cost_price!==undefined).length;
    setAnswer("stock-value",money(stockValue)+(stockRows.length<data.products.length?" · partial":""),
      errors.products?"unavailable":stockRows.length<data.products.length?"partial":"ready",
      "Cost basis is available for "+costConfigured+" of "+data.products.length+" products. Only configured product costs are included.",
      "For each product with configured stock and cost, multiply stock_quantity by current cost_price. This is a current estimated stock valuation, not a historical one.",
      "products.stock_quantity · admin_product_costs.cost_price",
      stockRows.map(p=>({label:p.name,value:money(Number(p.stock_quantity||0)*Number(p.cost_price||0)),note:fmtCount(p.stock_quantity)+" × "+money(p.cost_price)+" per unit"})),
      (data.products.length-costConfigured)+" products do not have a saved cost price; their stock value is not guessed.",
      ["./products.html","Complete product cost settings"]);

    const incoming=data.movements.filter(m=>Number(m.quantity_delta)>0),outgoing=data.movements.filter(m=>Number(m.quantity_delta)<0);
    setAnswer("stock-movement",fmtCount(data.movements.length)+" movements",errors.movements?"unavailable":"ready",
      fmtCount(sum(incoming,m=>m.quantity_delta))+" units were added and "+fmtCount(sum(outgoing,m=>-Number(m.quantity_delta)))+" units were removed during "+r.label.toLowerCase()+".",
      "Count inventory_movements by created_at in Asia/Dhaka. Positive quantity_delta is stock in; negative quantity_delta is stock out.",
      "inventory_movements",
      data.movements.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,60).map(m=>({label:data.productMap.get(m.product_id)?.name||"Product",value:(Number(m.quantity_delta)>0?"+":"")+fmtCount(m.quantity_delta)+" units",note:(m.movement_type||"movement")+" · "+dateTime(m.created_at)+" · "+(m.reason||"")})),
      "Website orders can reserve stock before delivery. Inventory movements are not the same as completed sales.",
      ["./products.html","Open inventory"]);

    const poMap=new Map(data.purchaseOrders.map(p=>[p.id,p]));
    const supplierMap=new Map(data.supplierDirectory.map(s=>[s.id,s.name]));
    const waitingItems=data.purchaseItems.filter(i=>{
      const po=poMap.get(i.purchase_order_id);
      return po&&["ordered","partially_received"].includes(po.status)&&Number(i.quantity||0)>Number(i.received_quantity||0);
    });
    const waitingQty=sum(waitingItems,i=>Math.max(0,Number(i.quantity||0)-Number(i.received_quantity||0)));
    setAnswer("pending-purchases",waitingItems.length+" lines · "+fmtCount(waitingQty)+" units",errors.purchaseOrders||errors.purchaseItems?"unavailable":waitingItems.length?"attention":"ready",
      new Set(waitingItems.map(i=>i.purchase_order_id)).size+" purchase orders have goods still outstanding.",
      "For ordered or partially received POs, sum max(0, ordered quantity − received quantity) for each item line.",
      "admin_purchase_orders · admin_purchase_order_items · admin_suppliers",
      waitingItems.map(i=>{const po=poMap.get(i.purchase_order_id);return {label:i.product_name,value:fmtCount(Number(i.quantity||0)-Number(i.received_quantity||0))+" outstanding",note:(po?.purchase_number||"PO")+" · "+(supplierMap.get(po?.supplier_id)||"Supplier")+" · expected "+(po?.expected_date||"not set")};}),
      "Draft and cancelled POs are excluded. A purchase order is not treated as a cash expense until payment is recorded.",
      ["./supplier-purchases.html","Review purchase orders"]);

    const month=dayKey(new Date()).slice(0,7);
    const budgets=data.budgets.filter(b=>String(b.period_start||"").slice(0,7)===month&&b.status==="active");
    const exceeded=budgets.map(b=>{
      const actual=sum(data.finance.filter(e=>e.status==="confirmed"&&e.entry_type==="expense"&&(e.financial_class||"operating")==="operating"&&String(e.entry_date||"").slice(0,7)===month&&String(e.category||"").trim().toLowerCase()===String(b.category||"").trim().toLowerCase()),e=>e.amount);
      return {category:b.category,limit:Number(b.budget_amount||0),actual,variance:actual-Number(b.budget_amount||0)};
    }).filter(b=>b.variance>0);
    setAnswer("budget-over",exceeded.length+" categories over budget",errors.budgets||errors.finance?"unavailable":exceeded.length?"attention":"ready",
      exceeded.length?"Confirmed spending exceeded the active monthly limit in "+exceeded.length+" categories.":"No active current-month budget category is above recorded spending.",
      "For each active budget in the current Bangladesh calendar month, sum confirmed operating-class expenses in the same category and compare with budget_amount.",
      "admin_finance_budgets · admin_finance_entries",
      exceeded.map(b=>({label:b.category,value:money(b.variance)+" over",note:"Budget "+money(b.limit)+" · recorded "+money(b.actual)})),
      "This check always covers the current calendar month, even when another reporting period is selected. Categories without an active budget are not assessed.",
      ["./finance.html#financeReportsSection","Review Finance budgets"]);
  }
  async function load(){
    if(busy)return;
    busy=true;
    const btn=$("bhRefresh");btn.disabled=true;btn.textContent="Refreshing…";
    range=makeRange();$("bhRangeLabel").textContent=range.label+" · Bangladesh time";
    $("bhQuestionGroups").innerHTML='<div class="hf-bh-loading">Loading live orders, finance, stock and supplier records…</div>';
    errors={};
    const tasks=[
      ["orders",()=>fetchOrders(null,5000)],
      ["products",()=>fetchProducts(10000)],
      ["finance",()=>readPaged(()=>client.from("admin_finance_entries").select("id,entry_type,category,amount,entry_date,description,reference,status,related_order_id,related_supplier_payment_id,financial_class,party_name").order("entry_date",{ascending:false}).order("id",{ascending:true}),5000)],
      ["history",()=>readPaged(()=>client.from("order_status_history").select("order_id,to_status,changed_at,reason").order("changed_at",{ascending:false}).order("id",{ascending:true}),10000)],
      ["cod",()=>readPaged(()=>client.from("admin_cod_settlements").select("id,order_id,order_number,courier_name,tracking_reference,cod_amount,collected_amount,courier_fee,adjustment_amount,remitted_amount,status,collected_at,remitted_at").order("updated_at",{ascending:false}),2000)],
      ["suppliers",()=>readPaged(()=>client.from("admin_supplier_balances").select("supplier_id,supplier_name,outstanding_balance,last_purchase_date,last_payment_date").order("supplier_name",{ascending:true}),2000)],
      ["supplierDirectory",()=>readPaged(()=>client.from("admin_suppliers").select("id,name").order("name",{ascending:true}),2000)],
      ["budgets",()=>readPaged(()=>client.from("admin_finance_budgets").select("id,category,period_start,budget_amount,status").order("period_start",{ascending:false}),2000)],
      ["movements",()=>readPaged(()=>client.from("inventory_movements").select("id,product_id,movement_type,quantity_delta,stock_before,stock_after,order_id,reason,created_at").gte("created_at",range.start).lte("created_at",range.end).order("created_at",{ascending:false}),5000)],
      ["purchaseOrders",()=>readPaged(()=>client.from("admin_purchase_orders").select("id,purchase_number,supplier_id,status,order_date,expected_date,total_amount").in("status",["ordered","partially_received"]).order("order_date",{ascending:false}),2000)],
      ["purchaseItems",()=>readPaged(()=>client.from("admin_purchase_order_items").select("id,purchase_order_id,product_id,product_name,quantity,received_quantity,unit,unit_cost").order("created_at",{ascending:false}),5000)]
    ];
    const results=await Promise.all(tasks.map(async([key,fn])=>{
      try{return {key,value:await fn()};}
      catch(error){errors[key]=error?.message||"Data source could not be loaded.";console.error("Business Health source failed:",key,error);return {key,value:[]};}
    }));
    const data={};
    results.forEach(result=>data[result.key]=Array.isArray(result.value)?result.value:[]);
    data.productMap=new Map(data.products.map(p=>[p.id,p]));
    const deliveredDate=new Map();
    data.history.filter(h=>h.to_status==="delivered").forEach(h=>{
      const prior=deliveredDate.get(h.order_id);
      if(!prior||Date.parse(h.changed_at)>Date.parse(prior))deliveredDate.set(h.order_id,h.changed_at);
    });
    const deliveredIds=data.orders.filter(o=>o.status==="delivered"&&
      ((deliveredDate.get(o.id)&&inRange(deliveredDate.get(o.id),range))||(!deliveredDate.has(o.id)&&o.source==="offline_pos"&&inRange(o.ordered_at,range)))).map(o=>o.id);
    data.snapshots=[];
    if(deliveredIds.length){
      try{data.snapshots=await signedQuery(client.rpc("get_business_health_order_cost_snapshots",{p_order_ids:deliveredIds}));}
      catch(error){errors.snapshots=error?.message||"Private product cost snapshots could not be loaded.";}
    }
    if(data.orders.length>=5000)errors.orders="The 5,000-order data limit was reached.";
    if(data.finance.length>=5000)errors.finance="The 5,000-entry Finance data limit was reached.";
    if(data.history.length>=10000)errors.history="The 10,000-row delivery history limit was reached.";
    if(data.movements.length>=5000)errors.movements="The 5,000-row inventory movement limit was reached.";
    buildAnswers(data);
    updatedAt=new Date().toISOString();
    renderSummary(data);renderQuestions();renderCoverage(data);
    busy=false;btn.disabled=false;btn.innerHTML="↻ Refresh";
  }
  function renderCoverage(data){
    const products=data.products||[];
    const costReady=products.filter(p=>p.cost_price!==null&&p.cost_price!==undefined).length;
    const stockReady=products.filter(p=>p.stock_quantity!==null&&p.stock_quantity!==undefined).length;
    const issues=[];
    if(costReady<products.length)issues.push(costReady+" of "+products.length+" products have a cost price.");
    if(stockReady<products.length)issues.push((products.length-stockReady)+" products have stock not configured.");
    Object.keys(errors).forEach(key=>issues.push(key+": "+errors[key]));
    const banner=$("bhCoverage");
    banner.classList.toggle("is-good",issues.length===0);
    banner.innerHTML='<div class="hf-bh-coverage-icon">'+(issues.length?"!":"✓")+'</div><div class="hf-bh-coverage-copy"><strong>'+(issues.length?"Some business figures need data setup":"Business data is ready")+'</strong><p>'+(issues.length?issues.map(x=>esc(x)).join(" "):"All required order, finance, stock and supplier data sources are available.")+'</p></div><div class="hf-bh-coverage-action">'+(costReady<products.length?link("./products.html","Complete cost prices"):link("./finance.html","Review finance"))+'</div>';
    $("bhSourceHealth").textContent=Object.keys(errors).length?Object.keys(errors).length+" data source(s) need review":"All requested data sources loaded";
    $("bhSourceHealth").classList.toggle("is-attention",Object.keys(errors).length>0);
  }

  $("bhQuestionGroups").addEventListener("click",event=>{
    const trigger=event.target.closest("[data-bh-question]");
    if(trigger){
      const id=trigger.dataset.bhQuestion,answer=$("bh-answer-"+id);
      const open=trigger.getAttribute("aria-expanded")!=="true";
      trigger.setAttribute("aria-expanded",String(open));answer.hidden=!open;
      trigger.closest(".hf-bh-question-card").classList.toggle("is-open",open);
      return;
    }
    const detail=event.target.closest("[data-bh-details]");
    if(detail)openDetails(detail.dataset.bhDetails);
  });
  $("bhSearch").addEventListener("input",renderQuestions);
  $("bhRefresh").addEventListener("click",()=>load().catch(error=>{console.error(error);toast(error.message||"Refresh failed.","error");}));
  $("bhPeriod").addEventListener("change",()=>load().catch(error=>{console.error(error);toast(error.message||"Could not change reporting period.","error");}));
  $("bhDialogClose").addEventListener("click",()=>$("businessHealthDialog").close());
  $("bhDialogCloseBottom").addEventListener("click",()=>$("businessHealthDialog").close());
  $("businessHealthDialog").addEventListener("click",event=>{if(event.target===$("businessHealthDialog"))$("businessHealthDialog").close();});
  try{await load();}
  catch(error){
    console.error("Business Health initialization failed:",error);busy=false;
    $("bhQuestionGroups").innerHTML='<div class="hf-bh-empty">Business Health could not load. Refresh after checking secure admin access.</div>';
    $("bhRefresh").disabled=false;$("bhRefresh").textContent="↻ Refresh";
    toast(error.message||"Business Health could not load.","error");
  }
});
})();
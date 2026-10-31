(() => {
"use strict";
function normalizeCourierMobile(value){
 let digits=String(value??"").replace(/\D/g,"");
 if(digits.startsWith("00880"))digits="0"+digits.slice(5);
 else if(digits.startsWith("880"))digits="0"+digits.slice(3);
 if(digits.length!==11||!digits.startsWith("01"))return "";
 return digits;
}
window.HFAdminReady.then(async H=>{
 if(!H)return;
 const {client,ADMIN_EMAIL,esc,money,shortNum,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,slugify,rangeQuery,fetchOrders,fetchEvents,fetchProducts,fetchCategories,fetchPosts,fetchFinance,palette,colorSet,chartTheme,drawChart,groupBy,lastDateKeys,makeStatus,makeEmpty,showTableMessage,statusClass,charts}=H;
 const $=id=>document.getElementById(id);
 const page=document.body.dataset.page||"overview";
 const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
 const fileBase=s=>String(s||"halal-food-report").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"")||"halal-food-report";
 const statusOptions=["pending","processing","shipped","delivered","cancelled"];
 function selectedRange(){
  const p=$("rangeSelect")?.value||"30";
  if(p==="custom"){
   const from=$("dateFrom")?.value,to=$("dateTo")?.value;
   if(!from||!to||from>to)throw new Error("Choose a valid start and end date.");
   const start=new Date(from+"T00:00:00"),end=new Date(to+"T23:59:59.999");
   return {from:start.toISOString(),to:end.toISOString(),days:Math.max(1,Math.ceil((end-start)/86400000)+1),label:from+" to "+to};
  }
  if(p==="all")return {from:null,to:null,days:null,label:"All available time"};
  const days=Number(p)||30;const d=new Date();d.setHours(23,59,59,999);
  return {from:new Date(Date.now()-Math.max(1,days)*86400000).toISOString(),to:d.toISOString(),days,label:"Last "+days+" days"};
 }
 function showCustomDates(){const box=$("customRangeFields");if(box)box.hidden=$("rangeSelect")?.value!=="custom";}
 function bindRangeControls(callback){
  $("rangeSelect")?.addEventListener("change",()=>{showCustomDates();if($("rangeSelect").value!=="custom")callback().catch(err=>toast(err.message||"Could not refresh this report.","error"));});
  $("dateFrom")?.addEventListener("change",()=>{if($("rangeSelect")?.value==="custom"&&$("dateFrom").value&&$("dateTo").value)callback().catch(err=>toast(err.message||"Invalid date range.","error"));});
  $("dateTo")?.addEventListener("change",()=>{if($("rangeSelect")?.value==="custom"&&$("dateFrom").value&&$("dateTo").value)callback().catch(err=>toast(err.message||"Invalid date range.","error"));});
  showCustomDates();
 }
 function attachRefresh(fn){
  document.querySelectorAll("[data-refresh-page]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;try{await fn();toast("Information refreshed.");}catch(err){console.error(err);toast(err.message||"Could not refresh. Please try again.","error");}finally{b.disabled=false;}}));
  window.HFAdminRefresh=fn;
 }
 function renderRangeHint(range,id){if($(id))$(id).textContent=range.label+" · refreshed "+new Date().toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"});}
 function trendCounts(events,days,evtNames){
  const keys=lastDateKeys(days);
  return {labels:keys.map(k=>dateOnly(k)),datasets:evtNames.map((name,i)=>({label:name.label,data:keys.map(k=>events.filter(e=>e.event_name===name.key&&String(e.occurred_at||"").slice(0,10)===k).length),borderColor:name.color||colorSet[i],backgroundColor:(name.color||colorSet[i])+"24",pointRadius:2,pointHoverRadius:5,borderWidth:2,tension:.32,fill:name.fill===true}))};
 }
 function chartAxisOptions(){
  return {scales:{x:{ticks:{color:chartTheme().muted,maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}},y:{beginAtZero:true,ticks:{color:chartTheme().muted,precision:0},grid:{color:chartTheme().grid}}}};
 }
 function orderStatusCounts(orders){
  const labels=["pending","processing","shipped","delivered","cancelled"];
  return {labels,datasets:[{data:labels.map(s=>orders.filter(o=>o.status===s).length),backgroundColor:[palette.yellow,palette.blue,palette.purple,palette.green,palette.red],borderColor:chartTheme().surface,borderWidth:3,hoverOffset:7}]};
 }
 function stageActors(events,name){
  const rows=events.filter(e=>e.event_name===name);
  return new Set(rows.map(e=>e.session_id||e.anonymous_id||("event-"+e.id))).size;
 }
 function topProducts(events,products,field="item_name",eventName="view_item"){
  const rows=events.filter(e=>e.event_name===eventName&&String(e[field]||"").trim());
  const by=new Map();rows.forEach(e=>{const name=String(e[field]).trim();by.set(name,(by.get(name)||0)+1);});
  return [...by.entries()].map(([name,count])=>({name,count,product:products.find(p=>p.name===name||p.slug===name)})).sort((a,b)=>b.count-a.count).slice(0,8);
 }

 function visitorSessionKey(event){return String(event.session_id||event.anonymous_id||"");}
 function formatSeconds(seconds){const value=Math.max(0,Math.round(Number(seconds)||0));if(value<60)return value+" sec";const minutes=Math.floor(value/60),remaining=value%60;return remaining?minutes+"m "+remaining+"s":minutes+"m";}
 function buildPageExperience(events){
  const pages=new Map();const getPage=path=>{const key=String(path||"/");if(!pages.has(key))pages.set(key,{path:key,views:0,visibleSeconds:0,timingCount:0,lastSeenSessions:0});return pages.get(key);};
  events.forEach(event=>{const row=getPage(event.page_path);if(event.event_name==="page_view")row.views++;if(event.event_name==="page_engagement"){const seconds=Number(event.value);if(Number.isFinite(seconds)&&seconds>=0){row.visibleSeconds+=seconds;row.timingCount++;}}});
  const latestBySession=new Map();events.forEach(event=>{const key=visitorSessionKey(event),stamp=Date.parse(event.occurred_at||"");if(!key||!Number.isFinite(stamp))return;const previous=latestBySession.get(key);if(!previous||stamp>Date.parse(previous.occurred_at||""))latestBySession.set(key,event);});
  latestBySession.forEach(event=>getPage(event.page_path).lastSeenSessions++);return [...pages.values()].sort((a,b)=>b.views-a.views||b.visibleSeconds-a.visibleSeconds);
 }
 function buildSessionJourneys(events){
  const groups=new Map();events.forEach(event=>{const key=visitorSessionKey(event);if(!key)return;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);});
  return [...groups.entries()].map(([sessionId,rows])=>{rows.sort((a,b)=>Date.parse(a.occurred_at||0)-Date.parse(b.occurred_at||0));const pageViews=rows.filter(e=>e.event_name==="page_view"),pathSteps=[];pageViews.forEach(e=>{const path=String(e.page_path||"/");if(pathSteps[pathSteps.length-1]!==path)pathSteps.push(path);});
   const last=rows[rows.length-1]||{},visibleSeconds=rows.filter(e=>e.event_name==="page_engagement").reduce((sum,e)=>sum+Math.max(0,Number(e.value)||0),0),count=name=>rows.filter(e=>e.event_name===name).length;
   return {sessionId,rows,pathSteps,steps:pageViews.length,lastSeen:last.occurred_at||"",lastPage:last.page_path||"/",visibleSeconds,cartAdds:count("add_to_cart"),checkouts:count("begin_checkout"),orderSubmits:count("order_submit")};
  }).sort((a,b)=>Date.parse(b.lastSeen||0)-Date.parse(a.lastSeen||0));
 }
 function buildProductPerformance(events,orders,products){
  const rows=products.map(product=>({product,views:0,cartAdds:0,viewSessions:new Set(),viewTimeBySession:new Map(),cartAfterViewSessions:new Set(),orderIds:new Set(),orderLines:0,units:0,orderValue:0}));
  const eventProduct=event=>{const id=String(event.item_id||"").toLowerCase(),name=String(event.item_name||"").trim().toLowerCase();return rows.find(row=>(id&&(String(row.product.slug||"").toLowerCase()===id||String(row.product.id||"").toLowerCase()===id))||(name&&String(row.product.name||"").trim().toLowerCase()===name));};
  events.filter(event=>event.event_name==="view_item"||event.event_name==="add_to_cart").slice().sort((a,b)=>Date.parse(a.occurred_at||0)-Date.parse(b.occurred_at||0)).forEach(event=>{
   const row=eventProduct(event);if(!row)return;
   const actor=visitorSessionKey(event),stamp=Date.parse(event.occurred_at||"");
   if(event.event_name==="view_item"){
    row.views++;
    if(actor){row.viewSessions.add(actor);if(!row.viewTimeBySession.has(actor))row.viewTimeBySession.set(actor,stamp);}
   }else{
    row.cartAdds++;
    if(actor&&row.viewTimeBySession.has(actor)&&stamp>row.viewTimeBySession.get(actor))row.cartAfterViewSessions.add(actor);
   }
  });
  orders.filter(order=>order.status!=="cancelled").forEach(order=>(order.order_items||[]).forEach(item=>{
   const id=String(item.product_id||"").toLowerCase(),name=String(item.product_name||"").trim().toLowerCase();
   const row=rows.find(candidate=>(id&&String(candidate.product.id||"").toLowerCase()===id)||(name&&String(candidate.product.name||"").trim().toLowerCase()===name));
   if(!row)return;
   row.orderIds.add(String(order.id));row.orderLines++;row.units+=Math.max(0,Number(item.quantity)||0);
   const value=item.line_total!=null?Number(item.line_total):Number(item.unit_price||0)*Number(item.quantity||0);
   row.orderValue+=Number.isFinite(value)?Math.max(0,value):0;
  }));
  return rows.map(row=>({...row,orderCount:row.orderIds.size,viewToCartRate:row.viewSessions.size?row.cartAfterViewSessions.size/row.viewSessions.size*100:null})).sort((a,b)=>b.orderCount-a.orderCount||b.units-a.units||b.views-a.views||b.cartAdds-a.cartAdds);
 }
 function renderTopProducts(list,rows){
  if(!list)return;
  if(!rows.length){list.innerHTML=makeEmpty("No product views yet","Once visitors browse products, their activity will appear here.");return;}
  list.innerHTML=rows.map((r,i)=>'<div class="hf-insight-row">'+(r.product?.image_url?'<img class="hf-thumb" loading="lazy" src="'+esc(r.product.image_url)+'" alt="">':'<span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span>')+'<div><strong>'+esc(r.name)+'</strong><small>'+esc(r.product?.category||"Recorded product view")+'</small></div><span class="hf-insight-number">'+shortNum(r.count)+'</span></div>').join("");
 }
 function renderFunnel(events){
  const body=$("funnelStages");if(!body)return;
  const view=Math.max(stageActors(events,"page_view"),stageActors(events,"view_item"),1);
  const product=stageActors(events,"view_item"),cart=stageActors(events,"add_to_cart"),checkout=stageActors(events,"begin_checkout");
  const completed=stageActors(events,"order_success"),submits=stageActors(events,"order_submit");
  const finalCount=completed||submits;
  const stages=[["Page activity",view,"People/sessions with page activity"],["Product viewed",product,"Viewed at least one product"],["Added to cart",cart,"Added a product to cart"],["Checkout started",checkout,"Started checkout"],[completed?"Order success event":"Order submitted event",finalCount,completed?"Recorded order-success events":"Submission is not proof of payment"]];
  const max=Math.max(...stages.map(s=>s[1]),1);
  body.innerHTML=stages.map(s=>'<div class="hf-funnel-row"><div class="hf-funnel-label"><span>'+esc(s[0])+'</span><strong>'+shortNum(s[1])+'</strong></div><div class="hf-funnel-track"><div class="hf-funnel-fill" style="width:'+Math.max(s[1]===0?0:3,s[1]/max*100)+'%"></div></div><div class="hf-progress-note">'+esc(s[2])+' · '+(max?Math.round(s[1]/max*100):0)+'% of highest step</div></div>').join("");
 }
 function renderRecentOrders(orders){
  const body=$("recentOrdersBody");if(!body)return;
  body.innerHTML=orders.length?orders.slice(0,7).map(o=>'<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+dateTime(o.ordered_at)+'</small></td><td>'+esc(o.customer_name||"Guest")+'</td><td>'+money(o.total)+'</td><td>'+makeStatus(o.status)+'</td><td><a class="hf-button hf-button-secondary hf-button-small" href="./orders.html">Open</a></td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No orders in this period","New order records will appear here.")+'</td></tr>';
 }
 async function initOverview(){
  const overviewDateLabel=$("overviewDateLabel");
  if(overviewDateLabel){
   try{overviewDateLabel.textContent=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",day:"numeric",month:"short",year:"numeric"}).format(new Date());}
   catch(_dateError){overviewDateLabel.textContent=new Date().toDateString();}
  }
  const financeStrip=$("overviewFinanceStrip");
  const financeToggle=$("overviewFinanceToggle");
  if(financeStrip&&financeToggle){
   const setFinanceMasked=masked=>{
    financeStrip.classList.toggle("is-masked",masked);
    financeStrip.dataset.masked=String(masked);
    financeToggle.setAttribute("aria-pressed",String(!masked));
    financeToggle.setAttribute("aria-label",masked?"Show finance amounts":"Hide finance amounts");
    const label=financeToggle.querySelector("[data-visibility-label]");
    if(label)label.textContent=masked?"Show amounts":"Hide amounts";
   };
   setFinanceMasked(true);
   financeToggle.addEventListener("click",()=>setFinanceMasked(!financeStrip.classList.contains("is-masked")));
  }
  const localDateKey=value=>{
   const d=value instanceof Date?value:new Date(value);
   if(Number.isNaN(d.getTime()))return "";
   return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  };
  const dateKeys=days=>{
   const keys=[],base=new Date();base.setHours(12,0,0,0);
   for(let i=Math.max(1,days)-1;i>=0;i--){const d=new Date(base);d.setDate(d.getDate()-i);keys.push(localDateKey(d));}
   return keys;
  };
  async function fetchOverviewOrderSummary(range,maxRows=5000){
   const rows=[],pageSize=1000;
   for(let offset=0;offset<maxRows;offset+=pageSize){
    const size=Math.min(pageSize,maxRows-offset);
    let query=client.from("orders").select("id,order_number,customer_name,customer_phone,total,status,ordered_at").order("ordered_at",{ascending:false}).order("id",{ascending:true});
    query=rangeQuery(query,"ordered_at",range);
    const page=await signedQuery(query.range(offset,offset+size-1));
    rows.push(...page);
    if(page.length<size)break;
   }
   return rows;
  }
  function renderActionCenter(products,pendingCount,pendingVerified){
   const list=$("overviewActionList");if(!list)return;
   const tracked=products.filter(p=>p.is_active&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.stock_quantity!==""&&Number.isFinite(Number(p.stock_quantity)));
   const outOfStock=tracked.filter(p=>Number(p.stock_quantity)<=0).length;
   const lowStock=tracked.filter(p=>Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5)).length;
   const catalogGaps=products.filter(p=>p.is_active&&(!String(p.image_url||"").trim()||!Number.isFinite(Number(p.price))||Number(p.price)<=0)).length;
   const actions=[];
   const add=(kind,title,count,detail,href,button)=>actions.push({kind,title,count,detail,href,button});
   if(!pendingVerified)add("warning","Pending order count needs review","!", "Pending-order count could not be confirmed. Open Orders to review the current list.","./orders.html?status=pending","Review orders");
   else if(pendingCount>0)add("urgent","Pending orders may need review",pendingCount, "Order records need review; an order is not proof of payment or delivery.","./orders.html?status=pending","Review orders");
   if(outOfStock>0)add("urgent","Active products are out of stock",outOfStock,"Tracked stock is at zero. Check availability before presenting these items as ready to sell.","./products.html","Open products");
   if(lowStock>0)add("warning","Products are at or below the stock-alert threshold",lowStock,"Review stock thresholds and replenish when appropriate.","./products.html","Open products");
   if(catalogGaps>0)add("warning","Active products need catalog details",catalogGaps,"Add a valid positive price and/or a product image where needed.","./products.html","Review catalog");
   const issueCount=actions.filter(a=>a.kind!=="info").length;
   const badge=$("overviewActionCount");
   if(badge){badge.innerHTML=issueCount?"<strong>"+issueCount.toLocaleString("en-BD")+"</strong> <span>"+esc("to review")+"</span>":esc("Clear");badge.className="hf-status "+(issueCount?"hf-status-pending":"hf-status-confirmed");}
   if(!actions.length){
    list.innerHTML='<div class="hf-action-clear"><span class="hf-action-clear-icon">✓</span><div><strong>'+esc("Everything looks clear")+'</strong><p>'+esc("No pending orders or tracked stock alerts were found in the loaded records.")+'</p></div></div>';
   }else{
    list.innerHTML=actions.map(a=>'<div class="hf-action-row '+(a.kind==="urgent"?"is-urgent":"is-warning")+'"><span class="hf-action-count '+(a.kind==="urgent"?"is-urgent":"is-warning")+'">'+esc(a.count)+'</span><div class="hf-action-copy"><strong>'+esc(a.title)+'</strong><p>'+esc(a.detail)+'</p></div><a class="hf-button hf-button-secondary hf-button-small hf-action-link" href="'+esc(a.href)+'">'+esc(a.button)+' <span aria-hidden="true">→</span></a></div>').join("");
   }
   $("overviewActionNote").textContent="Based on saved orders and stock.";
  }
  async function refresh(){
   const now=new Date();
   const range30={from:new Date(now.getTime()-30*86400000).toISOString(),to:now.toISOString(),days:30,label:"Last 30 days"};
   const range14={from:new Date(now.getTime()-14*86400000).toISOString(),to:now.toISOString(),days:14,label:"Last 14 days"};
   const [summaryOrders,chartOrders,events,products,pendingResult,recentOrders]=await Promise.all([
    fetchOverviewOrderSummary(range30,5000),
    fetchOrders(range14,1000),
    fetchEvents(range14,5000),
    fetchProducts(1000),
    client.from("orders").select("id",{count:"exact",head:true}).eq("status","pending"),
    signedQuery(client.from("orders").select("id,order_number,customer_name,total,status,ordered_at").order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(7))
   ]);
   const today=localDateKey(now);
   const ordersLast30=summaryOrders.filter(o=>o.ordered_at&&new Date(o.ordered_at)>=new Date(range30.from)&&new Date(o.ordered_at)<=now);
   const todayOrders=chartOrders.filter(o=>localDateKey(o.ordered_at)===today);
   const todayItemLines=todayOrders.filter(o=>o.status!=="cancelled").reduce((sum,o)=>sum+(o.order_items||[]).length,0);
   const todayCartEvents=events.filter(e=>e.event_name==="add_to_cart"&&localDateKey(e.occurred_at)===today).length;
   const pendingVerified=!pendingResult.error&&pendingResult.count!==null&&pendingResult.count!==undefined&&Number.isFinite(Number(pendingResult.count));
   const pendingCount=pendingVerified?Number(pendingResult.count):summaryOrders.filter(o=>o.status==="pending").length;
   const orderValue=ordersLast30.filter(o=>o.status!=="cancelled").reduce((sum,o)=>sum+Number(o.total||0),0);
   const lowStock=products.filter(p=>p.is_active&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.stock_quantity!==""&&Number.isFinite(Number(p.stock_quantity))&&Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5)).length;
   $("kpiOrders").textContent=shortNum(ordersLast30.length);
   $("kpiTodayItems").textContent=shortNum(todayItemLines);
   $("kpiPending").textContent=shortNum(pendingCount);
   $("kpiCart").textContent=shortNum(todayCartEvents);
   $("kpiOrderValue").textContent=money(orderValue);
   $("kpiNote").textContent=range30.label+" · recorded order value is not verified cash income.";
   $("kpiLowStock").textContent=shortNum(lowStock);
   renderActionCenter(products,pendingCount,pendingVerified);
   let finance=[],financeAvailable=true;
   try{finance=await fetchFinance(null,3000);}
   catch(err){financeAvailable=false;console.warn("Overview finance summary is unavailable for this session.",err);}
   const confirmedFinance=finance.filter(e=>e.status==="confirmed");
   const income=confirmedFinance.filter(e=>e.entry_type==="income").reduce((sum,e)=>sum+Number(e.amount||0),0);
   const expenses=confirmedFinance.filter(e=>e.entry_type==="expense").reduce((sum,e)=>sum+Number(e.amount||0),0);
   $("financeSummaryIncome").textContent=financeAvailable?money(income):"Unavailable";
   $("financeSummaryExpenses").textContent=financeAvailable?money(expenses):"Unavailable";
   $("financeSummaryNet").textContent=financeAvailable?money(income-expenses):"Unavailable";
   $("financeSummaryNote").textContent=financeAvailable
    ?"Confirmed manual entries only. COD settlement is not reconciled here."
    :"Finance unavailable. Refresh after signing in and completing MFA.";
   const labels=dateKeys(14);
   drawChart("overviewOperationsChart",{type:"line",data:{labels:labels.map(dateOnly),datasets:[
    {label:"Order item lines",data:labels.map(day=>chartOrders.filter(o=>localDateKey(o.ordered_at)===day&&o.status!=="cancelled").reduce((sum,o)=>sum+(o.order_items||[]).length,0)),borderColor:palette.orange,backgroundColor:"#F59E0B22",fill:true,tension:.32,pointRadius:2,borderWidth:2},
    {label:"Add-to-cart events",data:labels.map(day=>events.filter(e=>e.event_name==="add_to_cart"&&localDateKey(e.occurred_at)===day).length),borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:false,tension:.32,pointRadius:2,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href=items[0].datasetIndex===0?"./orders.html":"./analytics.html";}}});
   const financeCanvas=$("overviewFinanceChart");
   if(financeAvailable){
    if(financeCanvas)financeCanvas.hidden=false;
    $("overviewFinanceChartNote").textContent="Manual ledger entries only · not a bank/COD balance.";
    drawChart("overviewFinanceChart",{type:"bar",data:{labels:labels.map(dateOnly),datasets:[
     {label:"Recorded income",data:labels.map(day=>confirmedFinance.filter(e=>e.entry_type==="income"&&String(e.entry_date||"").slice(0,10)===day).reduce((sum,e)=>sum+Number(e.amount||0),0)),backgroundColor:palette.green,borderRadius:5,maxBarThickness:24},
     {label:"Recorded expenses",data:labels.map(day=>confirmedFinance.filter(e=>e.entry_type==="expense"&&String(e.entry_date||"").slice(0,10)===day).reduce((sum,e)=>sum+Number(e.amount||0),0)),backgroundColor:palette.orange,borderRadius:5,maxBarThickness:24}
    ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:()=>{location.href="./finance.html";}}});
   }else{
    if(financeCanvas)financeCanvas.hidden=true;
    $("overviewFinanceChartNote").textContent="Finance unavailable for this session.";
   }
   drawChart("overviewTrafficChart",{type:"line",data:{labels:labels.map(dateOnly),datasets:[
    {label:"Page views",data:labels.map(day=>events.filter(e=>e.event_name==="page_view"&&localDateKey(e.occurred_at)===day).length),borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:true,tension:.35,pointRadius:2,borderWidth:2},
    {label:"Product views",data:labels.map(day=>events.filter(e=>e.event_name==="view_item"&&localDateKey(e.occurred_at)===day).length),borderColor:palette.orange,backgroundColor:"#C97B3D18",fill:true,tension:.35,pointRadius:2,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}}}});
   drawChart("overviewStatusChart",{type:"doughnut",data:orderStatusCounts(summaryOrders),options:{cutout:"67%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   renderTopProducts($("overviewTopProducts"),topProducts(events,products).slice(0,5));
   renderRecentOrders(recentOrders);
   $("overviewUpdated").textContent="Updated "+new Date().toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"});
   const limits=[];
   if(summaryOrders.length>=5000)limits.push("Order totals may be incomplete (5,000-row limit).");
   if(chartOrders.length>=1000)limits.push("Daily chart reached its 1,000-order limit.");
   if(events.length>=5000)limits.push("Events reached the 5,000-row limit.");
   $("overviewDataNote").textContent=events.length+" events/14d · "+ordersLast30.length+" orders/30d. Order lines are product rows, not quantities; cart additions are events, not current cart. "+(pendingVerified?"Pending count verified.":"Pending count is an estimate.")+" Records do not confirm payment or delivery."+(limits.length?" "+limits.join(" "):"");
  }
  await refresh();attachRefresh(refresh);
 }
 async function initAnalytics(){
  async function refresh(){
   const range=selectedRange();const [events,orders,products]=await Promise.all([fetchEvents(range),fetchOrders(range,5000),fetchProducts()]);
   const chartDays=Math.min(range.days||90,90),keys=lastDateKeys(chartDays);
   drawChart("analyticsTrafficChart",{type:"line",data:{labels:keys.map(dateOnly),datasets:[
    {label:"Page views",data:keys.map(k=>events.filter(e=>e.event_name==="page_view"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:true,tension:.32,pointRadius:1.5,borderWidth:2},
    {label:"Product views",data:keys.map(k=>events.filter(e=>e.event_name==="view_item"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.orange,backgroundColor:"#C97B3D15",fill:true,tension:.32,pointRadius:1.5,borderWidth:2},
    {label:"Cart additions",data:keys.map(k=>events.filter(e=>e.event_name==="add_to_cart"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.green,backgroundColor:"#10B9811A",fill:false,tension:.32,pointRadius:1.5,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}}}});
   const top=topProducts(events,products);
   drawChart("analyticsProductChart",{type:"doughnut",data:{labels:top.slice(0,7).map(x=>x.name),datasets:[{data:top.slice(0,7).map(x=>x.count),backgroundColor:colorSet,borderColor:chartTheme().surface,borderWidth:3,hoverOffset:8}]},options:{cutout:"57%",plugins:{legend:{position:"bottom"}}}});
   const pageStats=buildPageExperience(events);
   const timedPages=pageStats.filter(p=>p.timingCount>0).sort((a,b)=>b.visibleSeconds-a.visibleSeconds).slice(0,8);
   drawChart("analyticsSourceChart",{type:"bar",data:{labels:timedPages.map(p=>p.path.length>24?p.path.slice(0,21)+"…":p.path),datasets:[{label:"Visible time",data:timedPages.map(p=>p.visibleSeconds),backgroundColor:colorSet,borderRadius:7,maxBarThickness:34}]},options:{indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>formatSeconds(context.raw)}}},scales:{x:{beginAtZero:true,ticks:{color:chartTheme().muted,callback:value=>value+"s"},grid:{color:chartTheme().grid}},y:{ticks:{color:palette.navy},grid:{display:false}}}}});
   const funnelEvents=events.map(e=>e);renderFunnel(funnelEvents);
   drawChart("analyticsOrdersChart",{type:"doughnut",data:orderStatusCounts(orders),options:{cutout:"60%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   const total=events.length,views=events.filter(e=>e.event_name==="page_view").length,pv=events.filter(e=>e.event_name==="view_item").length,carts=events.filter(e=>e.event_name==="add_to_cart").length,wa=events.filter(e=>e.event_name==="whatsapp_click").length;
   $("analyticsEventsCount").textContent=shortNum(total);$("analyticsPageViews").textContent=shortNum(views);$("analyticsProductViews").textContent=shortNum(pv);$("analyticsCartAdds").textContent=shortNum(carts);$("analyticsWhatsApp").textContent=shortNum(wa);
   const engagementEvents=events.filter(e=>e.event_name==="page_engagement");
   const totalVisibleSeconds=engagementEvents.reduce((sum,e)=>sum+Math.max(0,Number(e.value)||0),0);
   const measuredPages=pageStats.filter(p=>p.timingCount>0);
   $("analyticsPagesMeasured").textContent=shortNum(measuredPages.length);
   $("analyticsAvgVisibleTime").textContent=engagementEvents.length?formatSeconds(totalVisibleSeconds/engagementEvents.length):"—";
   $("analyticsTimedSessions").textContent=shortNum(new Set(engagementEvents.map(visitorSessionKey).filter(Boolean)).size);
   $("analyticsPageExperienceBody").innerHTML=pageStats.length?pageStats.slice(0,20).map(p=>'<tr><td><strong title="'+esc(p.path)+'">'+esc(p.path.length>52?p.path.slice(0,49)+"…":p.path)+'</strong></td><td>'+shortNum(p.views)+'</td><td>'+(p.timingCount?formatSeconds(p.visibleSeconds/p.timingCount):"—")+'</td><td>'+(p.timingCount?formatSeconds(p.visibleSeconds):"—")+'</td><td>'+shortNum(p.lastSeenSessions)+'</td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No page activity","Recorded page paths will appear when visitors browse the site.")+'</td></tr>';
   $("analyticsPageTimingNote").textContent=engagementEvents.length?"Timing data is available for "+engagementEvents.length.toLocaleString("en-BD")+" page-leave events. Visible seconds pause while the browser tab is hidden; this is an estimate of visible time, not proof of attention.":"No page-timing events in this range yet. New timing starts after the website tracking update goes live; older page views cannot be backfilled.";
   const journeys=buildSessionJourneys(events).slice(0,15);
   $("analyticsSessionJourneyBody").innerHTML=journeys.length?journeys.map(s=>'<tr><td><strong>'+esc(s.sessionId.slice(0,8))+'…</strong><small>Anonymous session ID</small></td><td title="'+esc(s.pathSteps.join(" → "))+'">'+esc(s.pathSteps.length?s.pathSteps.slice(-6).join(" → "):s.lastPage)+'</td><td>'+shortNum(s.steps)+'</td><td>'+(s.rows.some(e=>e.event_name==="page_engagement")?formatSeconds(s.visibleSeconds):"Not measured")+'</td><td>'+esc(dateTime(s.lastSeen))+'<small>'+esc(s.lastPage)+'</small></td><td>Cart '+s.cartAdds+' · Checkout '+s.checkouts+' · Submit '+s.orderSubmits+'</td></tr>').join(""):'<tr><td colspan="6">'+makeEmpty("No session journeys yet","Journeys require a recorded session ID. This table never displays customer names or contact details.")+'</td></tr>';
   const productRows=buildProductPerformance(events,orders,products);
   const listedProducts=productRows.filter(p=>p.views||p.cartAdds||p.orderCount).slice(0,20);
   $("analyticsProductPerformanceBody").innerHTML=listedProducts.length?listedProducts.map(p=>'<tr><td><strong>'+esc(p.product.name)+'</strong><small>'+esc(p.product.category||"Uncategorised")+'</small></td><td>'+shortNum(p.views)+'</td><td>'+shortNum(p.cartAdds)+'</td><td>'+(p.viewToCartRate==null?"—":Math.round(p.viewToCartRate)+"%")+'</td><td>'+shortNum(p.orderCount)+'<small>'+shortNum(p.orderLines)+' item lines</small></td><td>'+money(p.orderValue)+'</td><td>'+(p.product.stock_quantity==null?"Not set":esc(p.product.stock_quantity))+'</td></tr>').join(""):'<tr><td colspan="7">'+makeEmpty("No matched product activity","Product events or recorded test-order items will appear when matching product data is available.")+'</td></tr>';
   const insights=[];
   if(!engagementEvents.length)insights.push({title:"Page timing is awaiting new data",body:"The new visible-time tracker records the time when a page is left. Earlier page views cannot be assigned an estimated duration retroactively."});
   const noCartProducts=productRows.filter(p=>p.views>=3&&p.cartAdds===0).sort((a,b)=>b.views-a.views).slice(0,2);
   if(noCartProducts.length)insights.push({title:"Review product pages with views but no cart adds",body:noCartProducts.map(p=>p.product.name+" ("+p.views+" views)").join(", ")+". Consider checking the photo, price clarity and product description; this is a prompt to investigate, not proof of a defect."});
   const cartCount=events.filter(e=>e.event_name==="add_to_cart").length,submitCount=events.filter(e=>e.event_name==="order_submit").length;
   if(cartCount>0&&submitCount===0)insights.push({title:"Check the checkout path",body:"Cart-add activity exists, but no order-submit event was recorded in this date range. Verify the checkout experience and its event instrumentation."});
   const lowStockProducts=products.filter(p=>p.is_active&&p.stock_quantity!=null&&p.stock_quantity!==""&&Number.isFinite(Number(p.stock_quantity))&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5));
   if(lowStockProducts.length)insights.push({title:"Review low-stock products",body:lowStockProducts.slice(0,3).map(p=>p.name).join(", ")+(lowStockProducts.length>3?" and "+(lowStockProducts.length-3)+" more":"")+" are at or below their configured stock alert."});
   $("analyticsDecisionCenter").innerHTML=insights.length?insights.map((item,i)=>'<div class="hf-insight-row"><span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span><div><strong>'+esc(item.title)+'</strong><small>'+esc(item.body)+'</small></div><span class="hf-status hf-status-review">Review</span></div>').join(""):makeEmpty("No immediate checks suggested","Keep collecting on-site events and review this area again as more data arrives.");

   $("analyticsReportHint").textContent=range.label+" · "+total.toLocaleString("en-BD")+" recorded events · "+orders.length.toLocaleString("en-BD")+" orders. "+((!range.days||range.days>90)?"Daily trend shows the last 90 days; totals use the full selected range.":"");
   $("analyticsTopProducts").innerHTML=top.length?top.map((x,i)=>'<div class="hf-insight-row">'+(x.product?.image_url?'<img class="hf-thumb" src="'+esc(x.product.image_url)+'" alt="">':'<span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span>')+'<div><strong>'+esc(x.name)+'</strong><small>'+esc(x.product?.category||"No category match")+'</small></div><span class="hf-insight-number">'+shortNum(x.count)+'</span></div>').join(""):makeEmpty("No product-view data","Check again after the website has recorded product views.");
   $("analyticsEventBreakdown").innerHTML=groupBy(events,e=>e.event_name).slice(0,12).map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+shortNum(x.count)+'</td><td>'+(total?Math.round(x.count/total*100)+"%":"—")+'</td></tr>').join("")||'<tr><td colspan="3">'+makeEmpty("No events yet","No website events were recorded in this date range.")+'</td></tr>';
  }
  bindRangeControls(()=>refresh());await refresh();attachRefresh(refresh);
 }
 async function initOrders(){
  const ordersDateLabel=$("ordersDateLabel");
  if(ordersDateLabel){
   try{ordersDateLabel.textContent=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());}
   catch(_dateError){ordersDateLabel.textContent=new Date().toDateString();}
  }
  async function refreshSecuritySignals(){
   const body=$("securitySignalBody");
   if(!body)return;
   const count=$("securitySignalCount");
   const message=$("securitySignalMessage");
   try{
    const {data,error}=await client.functions.invoke("order-security-admin",{
     body:{action:"list_signals",limit:100}
    });
    if(error||data?.success!==true)throw new Error(data?.error||error?.message||"Security activity could not be loaded.");
    const rows=Array.isArray(data.signals)?data.signals:[];
    if(count)count.textContent=rows.length.toLocaleString("en-BD")+" recorded";
    if(!rows.length){
     body.innerHTML='<tr><td colspan="7">'+makeEmpty("No checkout security records yet","New orders placed after security monitoring was deployed will appear here. Existing orders are not backfilled.")+'</td></tr>';
     if(message)message.textContent="No new orders have been submitted since the IP/risk monitor was deployed. The next checkout request will create a record.";
     return;
    }
    const flagLabels={
     form_submitted_under_1_second:"Form under 1 second",
     form_submitted_under_2_5_seconds:"Form under 2.5 seconds",
     many_orders_from_same_ip_in_10_minutes:"Many from same network",
     repeated_orders_from_same_ip_in_10_minutes:"Repeated same network",
     many_orders_from_same_device_in_1_hour:"Many from same device",
     repeated_orders_from_same_device_in_1_hour:"Repeated same device",
     many_orders_from_same_phone_in_24_hours:"Many from same phone",
     repeated_orders_from_same_phone_in_24_hours:"Repeated same phone"
    };
    body.innerHTML=rows.map(row=>{
     const score=Math.max(0,Math.min(100,Number(row.riskScore)||0));
     const status=String(row.orderStatus||"recorded");
     const isHeld=status==="review_pending";
     const isReviewed=status==="approved"||status==="rejected";
     const level=isHeld?"Held for review":isReviewed?(status==="approved"?"Approved after review":"Rejected after review"):score>=40?"Elevated":score>=20?"Watch":"Low";
     const tone=isHeld||score>=40?"hf-status-review":score>=20?"hf-status-pending":"hf-status-active";
     const flags=(Array.isArray(row.riskFlags)?row.riskFlags:[]).map(flag=>flagLabels[flag]||String(flag).replace(/_/g," ")).join(" · ");
     const ip=[row.ipMasked||"IP unavailable",row.ipCountry||""].filter(Boolean).join(" · ");
     const elapsed=Number.isFinite(Number(row.formElapsedMs))&&row.formElapsedMs!==null?(Number(row.formElapsedMs)/1000).toFixed(1)+"s":"—";
     const device=row.deviceRef?"#"+row.deviceRef:"—";
     return '<tr>'+
      '<td><strong>'+esc(row.orderNumber||"—")+'</strong></td>'+
      '<td><strong>'+esc(row.customerName||"Customer")+'</strong><small style="display:block;color:var(--hf-muted)">'+esc(row.phone||"No phone")+'</small></td>'+
      '<td><strong>'+esc(score)+'/100</strong><small style="display:block;margin-top:4px"><span class="hf-status '+tone+'">'+esc(level)+'</span></small></td>'+
      '<td>'+esc(ip)+'</td>'+
      '<td><code>'+esc(device)+'</code></td>'+
      '<td style="white-space:normal;min-width:190px">'+esc(flags||"No elevated signal")+'<small style="display:block;color:var(--hf-muted)">Form time: '+esc(elapsed)+'</small></td>'+
      '<td>'+esc(dateTime(row.orderedAt))+'</td>'+
     '</tr>';
    }).join("");
    if(message)message.textContent="Risk score is a screening estimate, not proof of fraud. IPs are masked; repeat-device references are one-way hashes.";
   }catch(error){
    console.error("Checkout security activity could not be loaded.",error);
    if(count)count.textContent="Unavailable";
    body.innerHTML='<tr><td colspan="7">IP and risk activity could not be loaded. Verify MFA admin access and refresh.</td></tr>';
    if(message)message.textContent="Security signal records remain private on the server; raw IP and device identifiers are not exposed.";
   }
  }

  let all=[],activeOrderId=null,shipmentRows=[],shipmentRowsReady=false,shipmentLoadMessage="",redxAreaLookupError="",redxLoadedAreas=[],redxLoadedDistrict="",redxPreferredAreaId="",redxPreferredAreaName="";
  let customerProfilesById=new Map(),visibleOrders=[],selectedOrderIds=new Set(),teamMembers=[],orderWeightDataReady=false;

  async function refreshSecurityReviewQueue(){
   const body=$("securityReviewBody");
   if(!body)return;
   const count=$("securityReviewCount");
   const message=$("securityReviewMessage");
   try{
    const reviews=await signedQuery(client.from("order_security_reviews")
     .select("id,order_number,risk_score,risk_flags,form_elapsed_ms,ip_masked,ip_country,order_payload,created_at")
     .eq("status","pending_review")
     .order("created_at",{ascending:false})
     .limit(100));
    if(count)count.textContent=reviews.length.toLocaleString("en-BD")+" awaiting review";
    if(!reviews.length){
     body.innerHTML='<tr><td colspan="8">'+makeEmpty("No orders awaiting security review","Orders with multiple risk signals will appear here. Normal customers are not delayed.")+'</td></tr>';
     if(message)message.textContent="Queue clear. Only orders meeting the combined risk threshold are held here.";
     return;
    }
    const flagLabels={
     form_submitted_under_1_second:"Form submitted under 1 second",
     form_submitted_under_2_5_seconds:"Form submitted under 2.5 seconds",
     many_orders_from_same_ip_in_10_minutes:"Many orders from same network",
     repeated_orders_from_same_ip_in_10_minutes:"Repeated orders from same network",
     many_orders_from_same_device_in_1_hour:"Many orders from same device",
     repeated_orders_from_same_device_in_1_hour:"Repeated orders from same device",
     many_orders_from_same_phone_in_24_hours:"Many orders from same phone",
     repeated_orders_from_same_phone_in_24_hours:"Repeated orders from same phone"
    };
    body.innerHTML=reviews.map(review=>{
     const payload=review.order_payload&&typeof review.order_payload==="object"?review.order_payload:{};
     const phone=payload.phone||payload.mobile||"—";
     const address=payload.address||"";
     const items=Array.isArray(payload.items)?payload.items:[];
     const itemSummary=items.map(item=>String(item.product||item.name||"Product")+" × "+String(item.quantity||1)).join(", ");
     const flags=(Array.isArray(review.risk_flags)?review.risk_flags:[])
      .map(flag=>flagLabels[flag]||String(flag).replace(/_/g," "))
      .join(" · ");
     const elapsed=Number.isFinite(Number(review.form_elapsed_ms))&&review.form_elapsed_ms!==null
      ? (Number(review.form_elapsed_ms)/1000).toFixed(1)+"s":"Not recorded";
     const details=[itemSummary,address,"Form time: "+elapsed].filter(Boolean).join(" · ");
     return '<tr>'+
      '<td><strong>'+esc(review.order_number||"—")+'</strong><small style="display:block;color:var(--hf-muted)">'+esc(dateTime(review.created_at))+'</small></td>'+
      '<td><strong>'+esc(payload.name||"Customer")+'</strong><small style="display:block;white-space:normal;max-width:260px;color:var(--hf-muted)">'+esc(details)+'</small></td>'+
      '<td>'+esc(phone)+'</td>'+
      '<td>'+esc(review.ip_masked||"IP unavailable")+'<small style="display:block;color:var(--hf-muted)">'+esc(review.ip_country||"")+'</small></td>'+
      '<td><strong>'+esc(review.risk_score)+'/100</strong></td>'+
      '<td style="white-space:normal;min-width:220px">'+esc(flags||"Combined risk signals")+'</td>'+
      '<td>'+esc(dateTime(review.created_at))+'</td>'+
      '<td><div class="hf-table-actions" style="display:flex;gap:6px;flex-wrap:wrap">'+
       '<button class="hf-button hf-button-primary hf-button-small" type="button" data-security-decision="approve" data-review-id="'+esc(review.id)+'">Approve</button>'+
       '<button class="hf-button hf-button-secondary hf-button-small" type="button" data-security-decision="reject" data-review-id="'+esc(review.id)+'">Reject</button>'+
      '</div></td></tr>';
    }).join("");
    if(message)message.textContent="Held orders are not in the normal Orders list, have not reserved inventory and have not triggered Purchase tracking. Verify by phone before approving.";
   }catch(error){
    console.error("Security review queue could not be loaded.",error);
    if(count)count.textContent="Unavailable";
    body.innerHTML='<tr><td colspan="8">Security review queue could not be loaded. Verify admin MFA access and refresh.</td></tr>';
    if(message)message.textContent="The queue remains server-side; no held order is automatically approved.";
   }
  }

  function inferRedxDistrict(address){
   // Division names must not be mistaken for the destination district.
   const withoutDivision=String(address||"").replace(/\b[a-z]+\s+division\b/gi," ");
   const normalized=" "+withoutDivision.toLowerCase().replace(/[^a-z]+/g," ")+" ";
   const districts=["Bagerhat","Bandarban","Barguna","Barishal","Bhola","Bogura","Brahmanbaria","Chandpur","Chapainawabganj","Chuadanga","Cox's Bazar","Cumilla","Dhaka","Dinajpur","Faridpur","Feni","Gaibandha","Gazipur","Gopalganj","Habiganj","Jamalpur","Jashore","Jhalokathi","Jhenaidah","Joypurhat","Khagrachhari","Khulna","Kishoreganj","Kurigram","Kushtia","Lakshmipur","Lalmonirhat","Madaripur","Magura","Manikganj","Meherpur","Moulvibazar","Munshiganj","Mymensingh","Naogaon","Narail","Narayanganj","Narsingdi","Natore","Netrokona","Nilphamari","Noakhali","Pabna","Panchagarh","Patuakhali","Pirojpur","Rajbari","Rajshahi","Rangamati","Rangpur","Satkhira","Shariatpur","Sherpur","Sirajganj","Sunamganj","Sylhet","Tangail","Thakurgaon"];
   return districts.find(name=>normalized.includes(" "+name.toLowerCase().replace(/[^a-z]+/g," ")+" "))||"";
  }
  const courierCode=value=>{const v=String(value||"").toLowerCase();return v.includes("steadfast")?"steadfast":v.includes("pathao")?"pathao":v.includes("redx")?"redx":"";};
  const courierLabel=value=>value==="steadfast"?"Steadfast":value==="pathao"?"Pathao":"REDX";
  const shipmentFor=orderId=>shipmentRows.find(row=>row.order_id===orderId)||null;
  const courierBookingLocked=record=>!!record&&(record.integration_mode==="live_api"||["in_progress","succeeded","unknown"].includes(record.booking_state)||["booked","picked_up","in_transit","delivered","returned"].includes(record.shipment_status)||!!record.provider_order_id||!!String(record.tracking_id||"").trim());
  function orderPackedWeightKg(order){
   const items=Array.isArray(order?.order_items)?order.order_items:[];
   if(!items.length)return {weight:null,missing:["No saved product lines"]};
   let total=0;const missing=[];
   for(const item of items){
    const perUnit=Number(item.shipping_weight_kg),quantity=Number(item.quantity);
    if(!Number.isFinite(perUnit)||perUnit<=0){missing.push(String(item.product_name||"Product"));continue;}
    if(!Number.isFinite(quantity)||quantity<=0){missing.push(String(item.product_name||"Product")+" (invalid quantity)");continue;}
    total+=perUnit*quantity;
   }
   return missing.length?{weight:null,missing}:{weight:Number(total.toFixed(3)),missing:[]};
  }

  function updateConfirmBookProviderFields(){
   const provider=$("confirmBookProvider").value;
   $("confirmBookSteadfastFields").style.display=provider==="steadfast"?"grid":"none";
   $("confirmBookPathaoFields").style.display=provider==="pathao"?"grid":"none";
   $("confirmBookRedxFields").style.display=provider==="redx"?"grid":"none";
   $("confirmBookPathaoWeight").required=provider==="pathao";
   $("confirmBookRedxWeight").required=provider==="redx";
   $("confirmBookRedxDistrict").required=provider==="redx";
   $("confirmBookRedxArea").required=provider==="redx";
   $("confirmBookPathaoWeight").disabled=provider!=="pathao";
   $("confirmBookRedxWeight").disabled=provider!=="redx";
   $("confirmBookRedxDistrict").disabled=provider!=="redx";
   $("confirmBookRedxArea").disabled=provider!=="redx";
   $("confirmBookProviderHint").textContent=provider==="steadfast"
    ?"Steadfast uses the order invoice, customer name/phone, full address, COD and its current Home Delivery setting. You can add a courier note below. API credentials and merchant permissions must be active."
    :provider==="pathao"
      ?"Pathao uses the saved customer details, full address, automatically calculated item count, Normal Delivery and parcel type. Enter the packed weight in kg; add an optional special instruction."
      :provider==="redx"
        ?"REDX requires a Production delivery area from its own list and the actual packed weight. Choose the exact area; its ID is assigned automatically. The pickup store is configured on the server."
        :"Choose a courier to show its matching fields. Customer and product information stays linked to the saved order.";
   if(provider==="redx"){
    const district=$("confirmBookRedxDistrict").value.trim();
    if(district.length>=2&&redxLoadedDistrict.toLowerCase()!==district.toLowerCase())void loadConfirmBookRedxAreas();
   }
  }
  async function loadConfirmBookRedxAreas(){
   const button=$("confirmBookRedxLoadAreas"),select=$("confirmBookRedxArea"),priorId=String(select.value||redxPreferredAreaId||"");
   button.disabled=true;$("confirmBookFormError").textContent="";redxAreaLookupError="";
   select.disabled=true;
   try{
    let district=$("confirmBookRedxDistrict").value.trim();
    const districtFromAddress=inferRedxDistrict(district);
    if(districtFromAddress&&districtFromAddress.toLowerCase()!==district.toLowerCase()){
     district=districtFromAddress;
     $("confirmBookRedxDistrict").value=district;
    }
    if(district.length<2)throw new Error("Enter the customer’s destination district in English first (for example, Patuakhali).");
    const {data,error}=await client.functions.invoke("courier-integration",{body:{action:"areas",provider:"redx",district_name:district}});
    if(error){
     let message=error.message||"Could not load REDX delivery areas.";
     try{if(error.context&&typeof error.context.clone==="function"){const payload=await error.context.clone().json();message=payload?.error||payload?.message||message;}}catch(_){}
     throw new Error(message);
    }
    if(!data?.success)throw new Error(data?.error||"Could not load REDX delivery areas.");
    if(String(data.api_environment||"").toLowerCase()==="sandbox"||data.sandbox_test_mode===true)throw new Error("REDX is returning Sandbox data. Ask the administrator to verify REDX_BASE_URL and the Production API token before booking a real parcel.");
    redxLoadedAreas=(Array.isArray(data.areas)?data.areas:[]).map(a=>({id:String(a?.id??"").trim(),name:String(a?.name??"").trim(),sandbox_test_only:a?.sandbox_test_only===true})).filter(a=>a.id&&a.name&&!a.sandbox_test_only);
    if(!redxLoadedAreas.length)throw new Error(data.message||"REDX did not return any active areas for this district. Check the spelling or Production API access.");
    redxLoadedDistrict=district;
    select.innerHTML='<option value="">Select the customer’s delivery area</option>'+redxLoadedAreas.map(a=>'<option value="'+esc(a.id)+'" data-area-name="'+esc(a.name)+'">'+esc(a.name)+'</option>').join("");
    const currentOrder=all.find(row=>row.id===$("confirmBookOrderId").value);
    const addressText=String($("confirmBookAddress").value||currentOrder?.delivery_address||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const addressMatch=redxLoadedAreas.find(a=>{
     const normalizedName=a.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
     return normalizedName.length>=4&&(" "+addressText+" ").includes(" "+normalizedName+" ");
    });
    const preferred=redxLoadedAreas.find(a=>a.id===priorId)||redxLoadedAreas.find(a=>a.name.toLowerCase()===redxPreferredAreaName.toLowerCase());
    const chosen=preferred||addressMatch||(redxLoadedAreas.length===1?redxLoadedAreas[0]:null);
    if(chosen){
     select.value=chosen.id;redxPreferredAreaId=chosen.id;redxPreferredAreaName=chosen.name;
     $("confirmBookRedxAreaHint").textContent="Selected area: "+chosen.name+". Its REDX Area ID has been assigned automatically.";
    }else{
     select.value="";$("confirmBookRedxAreaHint").textContent=redxLoadedAreas.length+" areas found. Choose the one matching the customer’s actual destination.";
    }
   }catch(err){
    redxLoadedAreas=[];redxLoadedDistrict="";
    select.innerHTML='<option value="">Areas not loaded — try again</option>';select.value="";
    redxAreaLookupError=err.message||"REDX area lookup failed.";
    $("confirmBookFormError").textContent=redxAreaLookupError;
    $("confirmBookRedxAreaHint").textContent="Areas could not be loaded. Check the district and Production API connection in Operations Center.";
   }finally{
    button.disabled=false;select.disabled=false;
   }
  }
  $("confirmBookProvider")?.addEventListener("change",updateConfirmBookProviderFields);
  $("confirmBookRedxLoadAreas")?.addEventListener("click",loadConfirmBookRedxAreas);
  $("confirmBookRedxArea")?.addEventListener("change",()=>{
   const chosen=redxLoadedAreas.find(a=>a.id===String($("confirmBookRedxArea").value||""));
   redxPreferredAreaId=chosen?.id||"";redxPreferredAreaName=chosen?.name||"";
   $("confirmBookRedxAreaHint").textContent=chosen
    ?"Selected destination: "+chosen.name+". REDX Area ID is handled automatically."
    :"Select the delivery area matching the customer’s address.";
  });
  $("confirmBookAddress")?.addEventListener("change",()=>{
   if($("confirmBookProvider").value!=="redx")return;
   const inferred=inferRedxDistrict($("confirmBookAddress").value);
   if(inferred&&inferred.toLowerCase()!==$("confirmBookRedxDistrict").value.trim().toLowerCase()){
    $("confirmBookRedxDistrict").value=inferred;
    $("confirmBookRedxDistrict").dispatchEvent(new Event("change",{bubbles:true}));
   }
  });
  $("confirmBookRedxDistrict")?.addEventListener("change",()=>{
   const rawDistrict=$("confirmBookRedxDistrict").value.trim();
   const district=inferRedxDistrict(rawDistrict)||rawDistrict;
   if(district!==rawDistrict)$("confirmBookRedxDistrict").value=district;
   if(district.toLowerCase()!==redxLoadedDistrict.toLowerCase()){
    redxLoadedAreas=[];redxLoadedDistrict="";redxPreferredAreaId="";redxPreferredAreaName="";
    $("confirmBookRedxArea").innerHTML='<option value="">Loading areas for this district…</option>';
    $("confirmBookRedxArea").value="";
    $("confirmBookRedxAreaHint").textContent="Loading Production areas for "+district+"…";
    if(district.length>=2&&$("confirmBookProvider").value==="redx")void loadConfirmBookRedxAreas();
   }
  });
  function renderConfirmBookItems(items){
   const rows=Array.isArray(items)?items:[];
   const panel=$("confirmBookItemsPanel");
   const container=$("confirmBookItems");
   if(panel){
    const heading=panel.querySelector("strong");
    if(heading)heading.textContent=rows.length
     ?"Products and quantities · "+rows.length+" item line"+(rows.length===1?"":"s")
     :"Products and quantities · details unavailable";
   }
   const pathaoItemQuantity=Math.max(1,Math.min(999,rows.reduce((sum,item)=>{
    const unit=String(item?.unit||"").toLowerCase(),q=Number(item?.quantity||1);
    return sum+(["piece","pieces","pcs","pc"].includes(unit)?Math.max(1,Math.ceil(Number.isFinite(q)?q:1)):1);
   },0)));
   $("confirmBookPathaoItemQuantity").value=String(pathaoItemQuantity);
   $("confirmBookSteadfastItemSummary").value=rows.map(item=>String(item.product_name||"Item")+" × "+String(item.quantity??"—")+" "+String(item.unit||"")).join(", ").slice(0,250)||"No saved item details";
   container.innerHTML='<table class="hf-table"><thead><tr><th>Product</th><th>Quantity</th><th>Line total</th></tr></thead><tbody>'+
    (rows.map(item=>{
     const n=Number(item.quantity);
     const quantity=Number.isFinite(n)?String(n):String(item.quantity??"—");
     const unit=String(item.unit||"");
     const lineTotal=item.line_total!=null?item.line_total:(Number(item.unit_price||0)*Number(item.quantity||0));
     return '<tr><td>'+esc(item.product_name||"Item")+'</td><td><strong>'+esc(quantity)+(unit?' '+esc(unit):"")+'</strong></td><td>'+money(lineTotal)+'</td></tr>';
    }).join("")||'<tr><td colspan="3">No product quantity was returned for this order. Refresh the order list before booking.</td></tr>')+
    '</tbody></table>';
  }
  async function refreshConfirmBookItems(orderId,fallbackItems){
   try{
    const rows=await signedQuery(client.from("order_items")
     .select("id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url")
     .eq("order_id",orderId)
     .order("created_at",{ascending:true}));
    if(String($("confirmBookOrderId").value)!==String(orderId))return;
    renderConfirmBookItems(rows.length?rows:fallbackItems);
   }catch(_){
    if(String($("confirmBookOrderId").value)!==String(orderId))return;
    renderConfirmBookItems(fallbackItems);
    if(!fallbackItems.length){
     const panel=$("confirmBookItemsPanel");
     if(panel){
      const note=document.createElement("small");
      note.className="hf-data-note";
      note.textContent="Product quantities could not be loaded from the saved order. Refresh Orders and verify the order items before booking.";
      panel.appendChild(note);
     }
    }
   }
  }
  function openConfirmBook(orderId){
   redxAreaLookupError="";
   const order=all.find(row=>row.id===orderId);
   if(!order){toast("Order not found. Refresh and try again.","error");return;}
   if(!shipmentRowsReady){toast(shipmentLoadMessage||"Courier records could not be verified. Refresh the page before booking.","error");return;}
   if(!["pending","processing"].includes(order.status)){toast("Only pending or processing orders can be confirmed for courier booking.","error");return;}
   if(String(order.payment_method||"cash_on_delivery").toLowerCase()!=="cash_on_delivery"){toast("Only Cash on Delivery orders are enabled for courier booking.","error");return;}
   const existing=shipmentFor(order.id);
   if(courierBookingLocked(existing)){toast("This order already has a booked or uncertain courier record. Open Operations Center and verify the provider before doing anything else; duplicate booking is blocked.","error");return;}
   $("confirmBookOrderId").value=order.id;
   const orderItems=Array.isArray(order.order_items)?order.order_items:[];
   $("confirmBookOrderSummary").textContent="Order "+(order.order_number||String(order.id).slice(0,8))+" · "+(order.status==="pending"?"Pending confirmation":"Processing")+". Customer, product names and quantities load automatically from this saved order.";
   $("confirmBookCustomerName").value=order.customer_name||"";
   $("confirmBookCustomerPhone").value=order.customer_phone||"";
   $("confirmBookCustomerEmail").value=order.customer_email||"";
   $("confirmBookCodAmount").value=money(order.total);
   renderConfirmBookItems(orderItems);
   void refreshConfirmBookItems(order.id,orderItems);
   $("confirmBookAddress").value=order.delivery_address||"";
   $("confirmBookProvider").value=courierCode(existing?.courier_name)||"";
   const calculatedWeight=orderPackedWeightKg(order);
   $("confirmBookPathaoWeight").value=existing?.parcel_weight_kg??(calculatedWeight.weight??"");
   $("confirmBookRedxWeight").value=existing?.parcel_weight_kg??(calculatedWeight.weight??"");
   const weightHint=$("confirmBookWeightHint");
   if(weightHint)weightHint.textContent=calculatedWeight.weight!==null
    ?"Auto-calculated from saved product weights: "+calculatedWeight.weight.toFixed(3)+" kg per parcel. Review the packed parcel and adjust if packaging adds weight."
    :"A product shipping weight is missing for: "+calculatedWeight.missing.join(", ")+". Set it in Products or enter the packed parcel weight manually before booking.";
   $("confirmBookSteadfastNotes").value=existing?.parcel_notes||"";
   $("confirmBookPathaoInstruction").value=existing?.parcel_notes||"";
   $("confirmBookRedxInstruction").value=existing?.parcel_notes||"";
   const meta=existing?.provider_response&&typeof existing.provider_response==="object"?existing.provider_response:{};
   $("confirmBookRedxDistrict").value=meta.redx_delivery_district||inferRedxDistrict(order.delivery_address)||"";
   redxLoadedAreas=[];redxLoadedDistrict="";
   redxPreferredAreaId=String(meta.redx_delivery_area_id||"");redxPreferredAreaName=String(meta.redx_delivery_area||"");
   $("confirmBookRedxArea").innerHTML='<option value="">Load areas for the customer’s district first</option>';
   $("confirmBookRedxArea").value="";
   $("confirmBookRedxAreaHint").textContent=redxPreferredAreaName?"Saved delivery area: "+redxPreferredAreaName+". Load areas to verify it and assign its ID automatically.":"Enter the customer’s district and find areas, then select the correct destination.";
   $("confirmBookCustomerCheck").checked=false;
   $("confirmBookFormError").textContent="";
   updateConfirmBookProviderFields();
   $("confirmBookDialog").showModal();
  }
  $("confirmBookClose")?.addEventListener("click",()=>$("confirmBookDialog")?.close());
  $("confirmBookCancel")?.addEventListener("click",()=>$("confirmBookDialog")?.close());
  function normalizePhone(phone){
   let digits=String(phone||"").replace(/\D/g,"");
   if(digits.startsWith("00"))digits=digits.slice(2);
   if(digits.startsWith("0"))digits="880"+digits.slice(1);
   else if(digits.length===10&&digits.startsWith("1"))digits="880"+digits;
   return digits.length>=10?digits:"";
  }
  function whatsappUrl(order){
   const phone=normalizePhone(order.customer_phone);if(!phone)return "";
   const orderNo=order.order_number||String(order.id).slice(0,8),customer=order.customer_name||"Customer";
   const cancellation=order.status==="cancelled"&&order.cancellation_reason?" Cancellation reason: "+order.cancellation_reason+".":"";
   const message="Assalamu Alaikum "+customer+", this is an update for your Halal Food order "+orderNo+". Current recorded status: "+String(order.status||"pending").toUpperCase()+". Recorded order value: "+money(order.total)+"."+cancellation+" This is a learning/testing project and does not take online payments. A courier booking is created only when an admin explicitly confirms and books it; this message is not proof of payment or delivery.";
   return "https://wa.me/"+phone+"?text="+encodeURIComponent(message);
  }
  function courierLookupPhone(value){
   let digits=String(value||"").replace(/\D/g,"");
   if(digits.startsWith("00880"))digits="0"+digits.slice(5);
   else if(digits.startsWith("880"))digits="0"+digits.slice(3);
   return /^01\d{9}$/.test(digits)?digits:"";
  }
  function courierHistoryPercent(value){
   if(value===null||value===undefined||value==="")return "Not available";
   const number=Number(value);
   return Number.isFinite(number)?number.toFixed(1).replace(/\.0$/,"")+"%":"Not available";
  }
  function courierHistoryHumanize(value){
   return String(value||"").replace(/_/g," ").replace(/\b\w/g,char=>char.toUpperCase());
  }
  async function showCourierHistory(order){
   const phone=courierLookupPhone(order?.customer_phone);
   if(!phone){toast("This order does not contain a valid Bangladeshi mobile number.","error");return;}
   const dialog=$("courierHistoryDialog"),message=$("courierHistoryMessage"),summary=$("courierHistorySummary"),results=$("courierHistoryResults"),title=$("courierHistoryTitle"),phoneLabel=$("courierHistoryPhone"),footnote=$("courierHistoryFootnote");
   if(!dialog||!message||!summary||!results)return;
   if(title)title.textContent="Courier history · "+(order.order_number||"Order");
   if(phoneLabel)phoneLabel.textContent="Customer mobile: "+phone;
   message.className="hf-banner hf-banner-info";
   message.textContent="Checking directly with the connected courier providers. No third-party history service is used.";
   summary.innerHTML="";
   results.innerHTML='<p class="hf-loading">Checking Pathao and Steadfast directly; REDX API availability is shown separately…</p>';
   if(footnote)footnote.textContent="Only first-party courier API responses are used. Sources that do not provide history are excluded from the average, not counted as zero.";
   if(!dialog.open)dialog.showModal();
   try{
    const {data,error}=await client.functions.invoke("courier-fraud-check",{body:{phone}});
    if(error||data?.success!==true){
     message.className="hf-banner hf-banner-warning";
     message.textContent=data?.error||error?.message||"Courier history could not be checked.";
     results.innerHTML='<p class="hf-data-note">No verified direct-courier result was received. This does not mean the customer has zero delivery history.</p>';
     return;
    }
    const rows=Array.isArray(data.summaries)?data.summaries:[];
    const total=data.totalSummary||{};
    const available=rows.filter(item=>item.status==="available");
    const average=total.averageSuccessRate??total.successRate;
    const countValue=value=>value===null||value===undefined?"Not available":Number(value).toLocaleString("en-BD");
    const kpis=[];
    if(total.total!==null&&total.total!==undefined){
     kpis.push(["Reported parcels",countValue(total.total)]);
     if(total.success!==null&&total.success!==undefined)kpis.push(["Delivered",countValue(total.success)]);
     if(total.cancel!==null&&total.cancel!==undefined)kpis.push(["Cancelled / returned",countValue(total.cancel)]);
    }
    if(average!==null&&average!==undefined)kpis.push(["Average success rate",courierHistoryPercent(average)]);
    if(total.pooledSuccessRate!==null&&total.pooledSuccessRate!==undefined&&Number(total.rateSources)>1){
     kpis.push(["Weighted success rate",courierHistoryPercent(total.pooledSuccessRate)]);
    }
    if(available.length)kpis.push(["Courier sources with data",available.length+" / "+rows.length]);
    summary.innerHTML=kpis.length
     ?kpis.map(item=>'<div class="hf-card hf-kpi"><span class="hf-kpi-label">'+esc(item[0])+'</span><strong class="hf-kpi-value">'+esc(item[1])+'</strong></div>').join("")
     :'<div class="hf-card hf-card-pad" style="grid-column:1/-1"><strong>সমন্বিত ডেলিভারি পরিসংখ্যান পাওয়া যায়নি</strong><p class="hf-data-note">এটি গ্রাহকের success rate নয়। Pathao শুধু customer category দিয়েছে; parcel count বা success rate দেয়নি। Steadfast account inactive এবং REDX-এর history API এখনো পরীক্ষা করা যায়নি।</p></div>';

    const allNoHistory=rows.length>0&&rows.every(item=>item.status==="no_history"||item.status==="not_supported");
    const anyFailure=rows.some(item=>["error","not_connected"].includes(item.status));
    if(available.length){
     message.className="hf-banner hf-banner-info";
     message.textContent=(data.cached?"Cached courier lookup":"Fresh courier lookup")+" · "+available.length+" of "+rows.length+" courier sources returned information (this is not the customer success rate) · checked "+dateTime(data.checkedAt)+(data.expiresAt?" · refresh after "+dateTime(data.expiresAt):"");
    }else if(allNoHistory){
     message.className="hf-banner hf-banner-info";
     message.textContent="The connected courier lookup sources did not find a previous customer-history record. REDX does not currently expose this lookup in its public Merchant API.";
    }else{
     message.className="hf-banner "+(anyFailure?"hf-banner-warning":"hf-banner-info");
     message.textContent="No usable courier-history data was returned. See each provider's status below; unavailable data is not treated as zero.";
    }

    const statusInfo={
     available:{label:"Data received",tone:"hf-status-active"},
     no_history:{label:"No history found",tone:"hf-status"},
     not_connected:{label:"Credentials not connected",tone:"hf-status-review"},
     account_inactive:{label:"Account inactive",tone:"hf-status-review"},
     not_supported:{label:"API support not confirmed",tone:"hf-status"},
     not_checked:{label:"Not checked — API route unconfirmed",tone:"hf-status"},
     error:{label:"Lookup failed",tone:"hf-status-review"}
    };
    results.innerHTML=rows.length
     ?'<div class="hf-courier-history-list">'+rows.map(item=>{
      const status=statusInfo[item.status]||{label:"Status unknown",tone:"hf-status"};
      const type=String(item.dataType||"none").toLowerCase();
      const rate=item.successRate===null||item.successRate===undefined?"":courierHistoryPercent(item.successRate);
      let providerExplanation=item.message||"No courier data was returned.";
      const ratingKey=String(item.customerRating||"").toLowerCase().replace(/[ -]+/g,"_");
      if(item.courierName==="Pathao"&&type==="rating"&&ratingKey==="new_customer"){
       providerExplanation="Pathao এই ফোন নম্বরটিকে “New Customer” category-তে রেখেছে। এটি fraud verdict নয়। এই response-এ parcel count বা delivery success rate দেওয়া হয়নি।";
      }else if(item.courierName==="Steadfast"&&item.status==="account_inactive"){
       providerExplanation="Steadfast-এর server জানিয়েছে merchant account inactive। Account approval/activation এবং Fraud Check API permission চালু করতে Support-এর সাহায্য প্রয়োজন।";
      }else if(item.courierName==="REDX"&&item.status==="not_checked"){
       providerExplanation="এখানে REDX API-তে কোনো customer-history request পাঠানো হয়নি। Official lookup endpoint ও আপনার merchant account-এর Smart Return Pro/API access REDX Support বা account manager-এর কাছ থেকে নিশ্চিত করতে হবে।";
      }
      const metric=[];
      if(type==="delivery"){
       if(item.total!==null&&item.total!==undefined)metric.push(["Parcels",countValue(item.total)]);
       if(item.success!==null&&item.success!==undefined)metric.push(["Delivered",countValue(item.success)]);
       if(item.cancel!==null&&item.cancel!==undefined)metric.push(["Cancelled / returned",countValue(item.cancel)]);
       if(rate)metric.push(["Success rate",rate]);
      }else if(type==="rating"){
       metric.push([ratingKey==="new_customer"?"গ্রাহক শ্রেণি":"Customer rating",ratingKey==="new_customer"?"নতুন গ্রাহক (New Customer)":courierHistoryHumanize(item.customerRating||"Not provided")]);
       if(rate)metric.push(["Success rate",rate]);
       else metric.push(["Exact parcel counts","Not provided"]);
      }
      const metrics=metric.length
       ?'<div class="hf-courier-history-metrics">'+metric.map(pair=>'<span>'+esc(pair[0])+'<strong>'+esc(pair[1])+'</strong></span>').join("")+'</div>'
       :"";
      const risk=item.riskLevel?'<small class="hf-data-note">Courier rating / risk indicator: '+esc(courierHistoryHumanize(item.riskLevel))+'</small>':"";
      const typeLabel=type==="rating"?"Rating-only response":type==="delivery"?"Delivery statistics":"";
      return '<article class="hf-card hf-card-pad hf-courier-history-card"><div class="hf-section-head"><div><strong>'+esc(item.courierName||"Courier")+'</strong>'+(typeLabel?'<small class="hf-data-note" style="display:block">'+esc(typeLabel)+'</small>':"")+'</div><span class="hf-status '+status.tone+'">'+esc(status.label)+'</span></div><p>'+esc(providerExplanation)+'</p>'+metrics+risk+'</article>';
     }).join("")+'</div>'
     :'<p class="hf-data-note">No courier source returned a result.</p>';
    if(footnote)footnote.textContent="1 / 3 means one courier source returned information; it is not a customer success rate. Pathao returned a rating only. Steadfast is inactive, and REDX was not queried because an official customer-history API route has not been confirmed. Missing data is never counted as 0%.";
   }catch(error){
    console.error("Direct courier history lookup failed.",error);
    message.className="hf-banner hf-banner-warning";
    message.textContent=error?.message||"Courier history lookup failed. Please try again.";
    results.innerHTML='<p class="hf-data-note">No verified direct-courier result was received.</p>';
   }
  }

  function printPackingSlip(order){
   const win=window.open("","_blank");
   if(!win){toast("Printing window was blocked. Allow pop-ups for this admin page and try again.","error");return;}
   const orderNo=order.order_number||String(order.id).slice(0,8);
   const itemRows=(order.order_items||[]).map(item=>"<tr><td>"+esc(item.product_name)+"</td><td>"+esc(item.quantity)+" "+esc(item.unit||"")+"</td><td>"+money(item.unit_price)+"</td><td>"+money(item.line_total)+"</td></tr>").join("");
   const documentHtml="<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Halal Food · Test Order "+esc(orderNo)+"</title><style>*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#2b2a3d;margin:0;padding:28px;max-width:860px;margin:auto}header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #c97b3d;padding-bottom:16px;margin-bottom:20px;gap:16px}h1{margin:0;font-size:24px}h2{font-size:16px;margin:22px 0 8px}small,.muted{color:#686778}.tag{display:inline-block;background:#fff0df;padding:5px 9px;border-radius:99px;font-weight:700;font-size:11px}.notice{margin:18px 0;padding:12px;background:#fff4e7;border:1px solid #edd5b8;border-radius:8px;font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.meta div{padding:12px;background:#faf8f3;border-radius:8px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;border-bottom:1px solid #e8e4dc;padding:10px 8px;font-size:12px}th{background:#f5f1e9;text-transform:uppercase;font-size:10px;letter-spacing:.05em}.totals{margin:16px 0 0 auto;width:min(320px,100%)}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{border-top:1px solid #cfc8bc;margin-top:5px;padding-top:10px;font-size:17px;font-weight:800}@media print{body{padding:0}.notice{break-inside:avoid}}@media(max-width:600px){body{padding:14px}.meta{grid-template-columns:1fr}}</style></head><body><header><div><h1>Halal Food</h1><div class='muted'>Premium Products · Order packing summary</div></div><div style='text-align:right'><span class='tag'>TEST ORDER</span><p><strong>"+esc(orderNo)+"</strong><br><small>"+esc(dateTime(order.ordered_at))+"</small></p></div></header><div class='notice'><strong>Testing project:</strong> This document is not a receipt or proof of payment/delivery. Halal Food is currently a learning/testing storefront; real transactions and delivery are not enabled.</div><div class='meta'><div><strong>Customer</strong><br>"+esc(order.customer_name||"—")+"<br>"+esc(order.customer_phone||"—")+"<br>"+esc(order.customer_email||"")+"</div><div><strong>Delivery details</strong><br>"+esc(order.delivery_address||"—")+"<br><span class='muted'>Zone: "+esc(order.delivery_zone||"Not recorded")+" · Status: "+esc(order.status||"pending")+"</span></div></div><h2>Items</h2><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>"+(itemRows||"<tr><td colspan='4'>No item details recorded</td></tr>")+"</tbody></table><div class='totals'><div><span>Subtotal</span><strong>"+money(order.subtotal)+"</strong></div><div><span>Delivery</span><strong>"+money(order.delivery_charge)+"</strong></div><div class='grand'><span>Recorded total</span><strong>"+money(order.total)+"</strong></div></div><p class='muted' style='margin-top:28px;font-size:11px'>Printed from the Halal Food admin panel. Recorded amounts do not confirm collected payment.</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>";
   try{win.document.open();win.document.write(documentHtml);win.document.close();win.opener=null;}catch(err){win.close();toast("The packing summary could not be opened.","error");}
  }
  const orderStatusLabels={pending:"Pending",processing:"Processing",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled"};
  function orderCustomerAvatar(order){
   const profile=order.customer_id?customerProfilesById.get(order.customer_id):null;
   const photo=String(profile?.avatar_url||"").trim();
   const valid=/^https:\/\/[^"'<>\s]+$/i.test(photo)&&photo.length<=2048;
   const initial=Array.from(String(order.customer_name||"Customer").trim())[0]?.toLocaleUpperCase("en-US")||"C";
   return '<div class="hf-order-avatar">'+(valid?'<img src="'+esc(photo)+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="hf-order-avatar-fallback" hidden>'+esc(initial)+'</span>':'<span class="hf-order-avatar-fallback">'+esc(initial)+'</span>')+'</div>';
  }
  function updateBulkSelectionUi(rows){
   const selected=selectedOrderIds.size,visible=rows.filter(order=>selectedOrderIds.has(order.id)).length;
   const allBox=$("ordersSelectAll");
   if(allBox){allBox.checked=rows.length>0&&visible===rows.length;allBox.indeterminate=visible>0&&visible<rows.length;allBox.disabled=rows.length===0;}
   if($("ordersSelectedCount"))$("ordersSelectedCount").textContent=selected.toLocaleString("en-BD")+" selected";
   ["ordersPackagingBtn","ordersInvoiceBtn","ordersBulkExportBtn","ordersBulkDeleteBtn","ordersBulkStatusBtn","ordersBulkAssignBtn"].forEach(id=>{const button=$(id);if(button)button.disabled=selected===0;});
   const courierButton=$("ordersBulkCourierBtn");if(courierButton)courierButton.disabled=selected===0||!shipmentRowsReady;
   const clear=$("ordersBulkClearBtn");if(clear)clear.disabled=selected===0;
  }
  function printSelectedOrders(kind){
   const chosen=all.filter(order=>selectedOrderIds.has(order.id));
   if(!chosen.length){toast("Select at least one order first.","error");return;}
   const win=window.open("","_blank");
   if(!win){toast("The print window was blocked. Allow pop-ups for this admin page and try again.","error");return;}
   const invoice=kind==="invoice";
   const pages=chosen.map(order=>{
    const items=(order.order_items||[]).map(item=>'<tr><td>'+(invoice?"":'<span class="check"></span>')+esc(item.product_name||"Product")+'</td><td>'+esc(item.quantity)+' '+esc(item.unit||"")+'</td><td>'+money(item.unit_price)+'</td><td>'+money(item.line_total)+'</td></tr>').join("");
    return '<section class="sheet"><header><div><b>Halal Food</b><small>Order operations · '+(invoice?"Order invoice":"Packing slip")+'</small></div><div class="ref"><span>'+(invoice?"ORDER INVOICE · TEST":"PACKING SLIP")+'</span><strong>'+esc(order.order_number||String(order.id).slice(0,8))+'</strong><small>'+esc(dateTime(order.ordered_at))+'</small></div></header><p class="notice"><b>Testing project:</b> This is not a receipt or proof of payment, dispatch or delivery.</p><div class="people"><div><small>CUSTOMER</small><b>'+esc(order.customer_name||"Guest")+'</b><span>'+esc(order.customer_phone||"No phone")+'</span><span>'+esc(order.customer_email||"")+'</span></div><div><small>DELIVERY LOCATION</small><b>'+esc(order.delivery_zone||"Customer provided address")+'</b><span>'+esc(order.delivery_address||"No address recorded")+'</span></div></div><h3>Products & quantities</h3><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>'+(items||'<tr><td colspan="4">No items recorded</td></tr>')+'</tbody></table><div class="totals"><div><span>Products subtotal</span><b>'+money(order.subtotal)+'</b></div><div><span>Delivery charge</span><b>'+money(order.delivery_charge)+'</b></div><div class="grand"><span>Recorded total</span><b>'+money(order.total)+'</b></div></div>'+(invoice?'<p class="note">Cash on Delivery order · this document does not confirm receipt of payment.</p>':'<div class="packing"><b>Packing checklist</b><span>□ Products checked</span><span>□ Quantities checked</span><span>□ Address checked</span><span>□ Parcel packed</span></div>')+'<footer>Halal Food · '+esc(order.status||"pending")+'</footer></section>';
   }).join("");
   const css='*{box-sizing:border-box}body{margin:0;background:#e9eef5;color:#20334f;font:13px/1.5 Inter,Arial,sans-serif}.sheet{max-width:900px;margin:24px auto;padding:30px;background:#fff;box-shadow:0 8px 28px #1f314c1a;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}header{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #2869c7;padding-bottom:16px}header b{display:block;font-size:25px}.ref{text-align:right}.ref span{display:inline-block;padding:5px 10px;border-radius:99px;background:#e8f1ff;color:#245c9f;font-size:10px;font-weight:800}.ref strong,.ref small{display:block;margin-top:4px}.notice{margin:18px 0;padding:12px;border:1px solid #efcfac;background:#fff5e9;border-radius:10px;font-size:11px}.people{display:grid;grid-template-columns:1fr 1fr;gap:12px}.people>div{display:grid;gap:4px;padding:14px;border:1px solid #dbe4ee;background:#f6f9fd;border-radius:10px;overflow-wrap:anywhere}.people small{font-weight:800;letter-spacing:.1em}.people span,small,.note{color:#66778f}h3{margin:20px 0 8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #e2e9f1;font-size:11px}th{background:#eff4fa;text-transform:uppercase;font-size:9px}.totals{width:min(340px,100%);margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{border-top:2px solid #cdd9e7;margin-top:6px;padding-top:12px!important;font-size:16px}.check{display:inline-block;width:11px;height:11px;border:1px solid #8b9bb0;margin-right:7px}.packing{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:22px;padding:14px;border:1px solid #dbe4ee;background:#f7f9fc;border-radius:10px;font-size:10px}.packing b{grid-column:1/-1}.note{margin-top:20px;font-size:10px}footer{margin-top:28px;padding-top:10px;border-top:1px solid #dce4ee;color:#78889e;font-size:9px}@media print{body{background:#fff}.sheet{max-width:none;margin:0;padding:15mm;box-shadow:none;min-height:270mm}}@media(max-width:640px){.sheet{margin:0;padding:18px}.people{grid-template-columns:1fr}.packing{grid-template-columns:1fr 1fr}}';
   const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Halal Food · '+(invoice?"Order invoices":"Packing slips")+'</title><style>'+css+'</style></head><body>'+pages+'<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\/script></body></html>';
   try{win.document.open();win.document.write(doc);win.document.close();win.opener=null;}catch(err){win.close();toast("Could not prepare selected orders for printing.","error");}
  }
  function exportSelectedOrders(){
   const chosen=all.filter(order=>selectedOrderIds.has(order.id));
   if(!chosen.length){toast("Select at least one order first.","error");return;}
   const rows=chosen.map(order=>({order_number:order.order_number||String(order.id).slice(0,8),customer:order.customer_name||"",phone:order.customer_phone||"",delivery_address:order.delivery_address||"",delivery_zone:order.delivery_zone||"",products:(order.order_items||[]).map(item=>(item.product_name||"Product")+" × "+item.quantity+" "+(item.unit||"")+" @ "+(item.shipping_weight_kg??"weight not set")+" kg/unit").join(" | "),estimated_item_weight_kg:orderPackedWeightKg(order).weight??"incomplete",assigned_to:teamMembers.find(member=>member.id===order.assigned_to_team_member_id)?.full_name||"Unassigned",products_subtotal:Number(order.subtotal||0),delivery_charge:Number(order.delivery_charge||0),recorded_total:Number(order.total||0),status:order.status||"",ordered_at:order.ordered_at||""}));
   downloadFile("halal-food-selected-orders.csv",csvText(rows),"text/csv;charset=utf-8");toast(chosen.length+" selected order(s) exported.");
  }

  const bulkSelectedOrders=()=>all.filter(order=>selectedOrderIds.has(order.id));
  function openBulkStatusDialog(){
   const rows=bulkSelectedOrders();if(!rows.length){toast("Select at least one order first.","error");return;}
   $("bulkStatusCount").textContent=rows.length+" selected order(s)";
   $("bulkCancellationReason").value="";$("bulkCancellationReasonWrap").hidden=true;$("bulkStatusError").textContent="";
   $("bulkStatusDialog").showModal();
  }
  $("bulkNextStatus")?.addEventListener("change",()=>{
   const next=$("bulkNextStatus").value;$("bulkCancellationReasonWrap").hidden=next!=="cancelled";
   $("bulkStatusHint").textContent=next==="pending"?"Only a Processing order without a live or uncertain courier parcel can return to Pending.":next==="processing"?"Requires a successful existing courier booking. Use Send Courier for new bookings.":next==="shipped"?"Requires verified courier pickup/in-transit status.":next==="delivered"?"Requires a courier-confirmed Delivered status.":next==="cancelled"?"Live or uncertain courier parcels are protected; cancel with the courier first.":"Orders already in this status will be skipped. Rewinding to Pending is allowed only for a Processing order without a live/uncertain parcel.";
  });
  $("bulkStatusForm")?.addEventListener("submit",async event=>{
   event.preventDefault();
   const button=$("bulkStatusSubmit"),next=$("bulkNextStatus").value,rows=bulkSelectedOrders(),reason=$("bulkCancellationReason").value.trim();
   if(!rows.length||!["pending","processing","shipped","delivered","cancelled"].includes(next)){$("bulkStatusError").textContent="Choose a supported status and select orders. Bulk status cannot rewind an order to Pending.";return;}
   if(next==="cancelled"&&(reason.length<3||reason.length>500)){$("bulkStatusError").textContent="Enter a cancellation reason between 3 and 500 characters.";return;}
   if(next==="cancelled"&&!confirm("Cancel "+rows.length+" eligible order(s)? Orders with active or uncertain courier parcels will be skipped."))return;
   if(next==="delivered"&&!confirm("Only orders with a courier-confirmed Delivered status will be updated. Continue?"))return;
   button.disabled=true;button.textContent="Updating…";$("bulkStatusError").textContent="";
   let updated=0;const skipped=[];
   try{
    for(const order of rows){
     const shipment=shipmentFor(order.id);
     if(order.status===next){skipped.push((order.order_number||"Order")+" is already "+next);continue;}
     if(next==="pending"&&!(order.status==="processing"&&!courierBookingLocked(shipment))){skipped.push((order.order_number||"Order")+" cannot return to Pending while a live/uncertain courier parcel exists");continue;}
     if(next==="processing"&&!(shipment&&shipment.integration_mode==="live_api"&&shipment.booking_state==="succeeded")){skipped.push((order.order_number||"Order")+" requires a successful courier booking");continue;}
     if(next==="shipped"&&!(shipment&&shipment.integration_mode==="live_api"&&shipment.booking_state==="succeeded"&&["picked_up","in_transit","delivered"].includes(shipment.shipment_status))){skipped.push((order.order_number||"Order")+" pickup is not verified");continue;}
     if(next==="delivered"&&!(shipment&&shipment.integration_mode==="live_api"&&shipment.booking_state==="succeeded"&&shipment.shipment_status==="delivered")){skipped.push((order.order_number||"Order")+" delivery is not verified");continue;}
     if(next==="cancelled"&&courierBookingLocked(shipment)){skipped.push((order.order_number||"Order")+" has a live/uncertain courier parcel");continue;}
     try{
      const result=await client.rpc("admin_update_order_status",{p_order_id:order.id,p_next_status:next,p_cancellation_reason:next==="cancelled"?reason:null});
      if(result.error)throw result.error;
      await audit("order_status_changed","order",order.id,"Bulk status changed to "+next,{bulk:true,status:next,cancellation_reason:next==="cancelled"?reason:null});
      updated++;
     }catch(err){skipped.push((order.order_number||"Order")+": "+(err.message||"status update failed"));}
    }
    $("bulkStatusDialog").close();toast(updated+" order(s) updated; "+skipped.length+" skipped.",skipped.length?"warning":"success");
    if(skipped.length)console.warn("Bulk status update skipped rows:",skipped);
    await refresh();
   }catch(err){$("bulkStatusError").textContent=err.message||"Bulk status update failed.";}
   finally{button.disabled=false;button.textContent="Update eligible orders";}
  });
  function openBulkAssignDialog(){
   const rows=bulkSelectedOrders();if(!rows.length){toast("Select at least one order first.","error");return;}
   $("bulkAssignCount").textContent=rows.length+" selected order(s)";
   $("bulkAssignMember").innerHTML='<option value="">Clear assignment / Unassigned</option>'+teamMembers.map(member=>'<option value="'+esc(member.id)+'">'+esc(member.full_name)+(member.role_title?" · "+esc(member.role_title):"")+'</option>').join("");
   $("bulkAssignTeamHint").textContent=teamMembers.length?teamMembers.length+" active team member(s) available.":"No active team member is registered yet. Add staff under Operations Center → Team directory. You can still clear an assignment.";
   $("bulkAssignError").textContent="";$("bulkAssignDialog").showModal();
  }
  $("bulkAssignForm")?.addEventListener("submit",async event=>{
   event.preventDefault();
   const button=$("bulkAssignSubmit"),rows=bulkSelectedOrders(),memberId=$("bulkAssignMember").value||null,member=memberId?teamMembers.find(item=>item.id===memberId&&item.is_active):null;
   if(!rows.length){$("bulkAssignError").textContent="Select orders first.";return;}
   if(memberId&&!member){$("bulkAssignError").textContent="The chosen team member is inactive or unavailable. Refresh and select again.";return;}
   if(!memberId&&!confirm("Clear assignment for "+rows.length+" selected order(s)?"))return;
   button.disabled=true;button.textContent="Saving…";
   try{
    const now=new Date().toISOString(),payload={assigned_to_team_member_id:memberId,assigned_at:memberId?now:null,assigned_by:memberId?H.ADMIN_EMAIL:""};
    const result=await client.from("orders").update(payload).in("id",rows.map(order=>order.id)).select("id");
    if(result.error)throw result.error;
    if((result.data||[]).length!==rows.length)throw new Error("The database returned "+(result.data||[]).length+" updated orders; expected "+rows.length+". Refresh and verify.");
    for(const order of rows)await audit(memberId?"order_assigned":"order_assignment_cleared","order",order.id,memberId?"Assigned to "+member.full_name:"Assignment cleared",{team_member_id:memberId});
    $("bulkAssignDialog").close();toast(memberId?"Assigned "+rows.length+" orders to "+member.full_name+".":"Cleared "+rows.length+" order assignments.");
    await refresh();
   }catch(err){$("bulkAssignError").textContent=err.message||"Could not save the assignments.";}
   finally{button.disabled=false;button.textContent="Save assignment";}
  });
  async function deleteSelectedOrders(){
   const rows=bulkSelectedOrders();if(!rows.length){toast("Select orders first.","error");return;}
   const refs=rows.slice(0,5).map(order=>order.order_number||String(order.id).slice(0,8)).join(", ")+(rows.length>5?" and "+(rows.length-5)+" more":"");
   const message=["Permanently delete "+rows.length+" selected pending/cancelled order(s)?",refs,"Orders with courier parcels, stock movements or return/refund records are protected.","Order items and status history are removed by the database cascade. This cannot be undone."].join("\n\n");
   if(!confirm(message))return;
   const button=$("ordersBulkDeleteBtn");button.disabled=true;button.textContent="Deleting…";
   try{
    const result=await client.rpc("admin_bulk_delete_orders",{p_order_ids:rows.map(order=>order.id)});
    if(result.error)throw result.error;
    if(result.data?.success!==true||Number(result.data.deleted_count)!==rows.length)throw new Error(result.data?.error||"The database did not confirm all deletions.");
    for(const order of rows)await audit("order_deleted","order",order.id,"Order deleted via protected bulk action",{bulk:true});
    selectedOrderIds.clear();toast(rows.length+" order(s) deleted.");await refresh();
   }catch(err){toast(err.message||"Bulk deletion was blocked. No order was deleted.","error");}
   finally{button.disabled=false;button.textContent="⌫ Delete";}
  }

  function bulkCourierEligibleOrders(){
   return bulkSelectedOrders().filter(order=>["pending","processing"].includes(order.status)&&String(order.payment_method||"cash_on_delivery").toLowerCase()==="cash_on_delivery"&&!courierBookingLocked(shipmentFor(order.id)));
  }
  function renderBulkCourierRows(){
   const provider=$("bulkCourierProvider").value,rows=bulkCourierEligibleOrders();
   document.querySelectorAll(".hf-bulk-redx-column").forEach(cell=>{cell.hidden=provider!=="redx";});
   $("bulkCourierRows").innerHTML=rows.length?rows.map(order=>{
    const estimate=orderPackedWeightKg(order),shipment=shipmentFor(order.id),meta=shipment?.provider_response&&typeof shipment.provider_response==="object"?shipment.provider_response:{};
    const weight=shipment?.parcel_weight_kg??estimate.weight??"",district=meta.redx_delivery_district||inferRedxDistrict(order.delivery_address)||"";
    return '<tr data-bulk-order="'+esc(order.id)+'"><td><strong class="hf-bulk-order-ref">'+esc(order.order_number||String(order.id).slice(0,8))+'</strong><small>'+esc(order.customer_name||"Customer")+' · '+esc(order.customer_phone||"No phone")+'</small><small>'+esc(order.delivery_address||"No address")+'</small></td><td><strong>'+money(order.total)+'</strong></td><td class="hf-bulk-weight-cell"><input class="hf-input" data-bulk-weight="'+esc(order.id)+'" type="number" min="0.01" max="100" step="0.01" value="'+(weight===""?"":Number(weight).toFixed(2))+'" aria-label="Packed parcel weight in kilograms"><small class="hf-bulk-row-hint">'+(estimate.weight!==null?"Auto from item weights: "+estimate.weight.toFixed(3)+" kg":"Missing weight: "+esc(estimate.missing.join(", ")))+'</small></td><td class="hf-bulk-redx-column hf-bulk-area-cell" '+(provider==="redx"?"":"hidden")+'><div class="hf-bulk-area-stack"><input class="hf-input" data-bulk-redx-district="'+esc(order.id)+'" maxlength="80" value="'+esc(district)+'" placeholder="District in English"><button class="hf-button hf-button-secondary hf-button-small" data-bulk-redx-load="'+esc(order.id)+'" type="button">Load areas</button><select class="hf-select" data-bulk-redx-area="'+esc(order.id)+'" data-verified="false" disabled><option value="">Load Production areas first</option></select><small class="hf-bulk-row-hint" data-bulk-redx-hint="'+esc(order.id)+'">Choose the destination area matching the saved address.</small></div></td></tr>';
   }).join(""):'<tr><td colspan="4">No selected pending/processing COD order is eligible. Existing live or uncertain parcels are excluded.</td></tr>';
   $("bulkCourierWeightHint").textContent=provider==="steadfast"?"Steadfast's current API payload does not require weight; the estimate is saved to the parcel for operations.":"Weight is calculated from saved product weight × quantity. Review actual packing and adjust for packaging.";
  }
  function openBulkCourierDialog(){
   if(!shipmentRowsReady){toast(shipmentLoadMessage||"Courier records are unavailable. Refresh before booking.","error");return;}
   const selected=bulkSelectedOrders(),eligible=bulkCourierEligibleOrders();
   if(!selected.length){toast("Select orders first.","error");return;}
   if(!eligible.length){toast("None of the selected orders is eligible for live courier booking.","error");return;}
   $("bulkCourierCount").textContent=eligible.length+" eligible parcel(s) · "+(selected.length-eligible.length)+" excluded";
   $("bulkCourierProvider").value="";$("bulkCourierNotes").value="";$("bulkCourierConfirm").checked=false;
   $("bulkCourierProgress").textContent="Review each customer, COD, weight and destination. No courier request has been sent.";
   $("bulkCourierResults").innerHTML="";$("bulkCourierError").textContent="";renderBulkCourierRows();$("bulkCourierDialog").showModal();
  }
  $("bulkCourierProvider")?.addEventListener("change",renderBulkCourierRows);
  $("bulkCourierRows")?.addEventListener("input",event=>{
   const input=event.target.closest("[data-bulk-redx-district]");if(!input)return;
   const row=input.closest("[data-bulk-order]"),select=row?.querySelector("[data-bulk-redx-area]");
   if(select){select.dataset.verified="false";select.disabled=true;select.innerHTML='<option value="">District changed — reload areas</option>';}
  });
  $("bulkCourierRows")?.addEventListener("click",async event=>{
   const button=event.target.closest("[data-bulk-redx-load]");if(!button)return;
   const row=button.closest("[data-bulk-order]"),district=String(row?.querySelector("[data-bulk-redx-district]")?.value||"").trim(),select=row?.querySelector("[data-bulk-redx-area]"),hint=row?.querySelector("[data-bulk-redx-hint]");
   if(district.length<2){if(hint)hint.textContent="Enter the destination district in English.";return;}
   button.disabled=true;button.textContent="Loading…";
   try{
    const result=await client.functions.invoke("courier-integration",{body:{action:"areas",provider:"redx",district_name:district}});
    if(result.error){let message=result.error.message||"Could not load REDX areas.";try{if(result.error.context&&typeof result.error.context.clone==="function"){const body=await result.error.context.clone().json();message=body?.error||body?.message||message;}}catch(_){}throw new Error(message);}
    const data=result.data;if(!data?.success)throw new Error(data?.error||"REDX areas were not returned.");
    if(String(data.api_environment||"").toLowerCase()==="sandbox"||data.sandbox_test_mode===true)throw new Error("REDX returned Sandbox data. Live bulk booking is blocked until Production areas are available.");
    const areas=(Array.isArray(data.areas)?data.areas:[]).map(a=>({id:String(a?.id??"").trim(),name:String(a?.name??"").trim(),sandbox:a?.sandbox_test_only===true})).filter(a=>a.id&&a.name&&!a.sandbox);
    if(!areas.length)throw new Error("No active Production areas were returned for "+district+".");
    select.innerHTML='<option value="">Select exact delivery area</option>'+areas.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join("");
    select.disabled=false;select.dataset.verified="true";select.dataset.loadedDistrict=district;
    const order=all.find(item=>item.id===row.dataset.bulkOrder),address=String(order?.delivery_address||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const match=areas.find(a=>{const name=a.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();return name.length>=4&&(" "+address+" ").includes(" "+name+" ");});
    if(match)select.value=match.id;
    if(hint)hint.textContent=areas.length+" Production area(s) loaded. "+(match?"Address-name match suggested; confirm it.":"Choose the exact destination.");
   }catch(err){select.disabled=true;select.dataset.verified="false";select.innerHTML='<option value="">Areas unavailable — retry</option>';if(hint)hint.textContent=err.message||"REDX area lookup failed.";}
   finally{button.disabled=false;button.textContent="Load areas";}
  });
  async function sendSelectedOrdersToCourier(){
   const form=$("bulkCourierForm"),button=$("bulkCourierSubmit");if(form.dataset.submitting==="true")return;
   const provider=$("bulkCourierProvider").value,rowNodes=Array.from($("bulkCourierRows").querySelectorAll("[data-bulk-order]"));
   if(!["steadfast","pathao","redx"].includes(provider)){$("bulkCourierError").textContent="Choose Steadfast, Pathao or REDX.";return;}
   if(!rowNodes.length){$("bulkCourierError").textContent="No eligible parcels are available.";return;}
   if(!$("bulkCourierConfirm").checked){$("bulkCourierError").textContent="Confirm that each customer, address, COD and parcel detail has been reviewed.";return;}
   const prepared=[];
   for(const row of rowNodes){
    const order=all.find(item=>item.id===row.dataset.bulkOrder),raw=String(row.querySelector("[data-bulk-weight]")?.value||"").trim(),weight=raw===""?null:Number(raw);
    if(!order){$("bulkCourierError").textContent="A selected order is no longer available. Refresh before booking.";return;}
    if(provider==="pathao"&&(!Number.isFinite(weight)||weight<0.5||weight>10)){$("bulkCourierError").textContent=(order.order_number||"Order")+" needs 0.5–10 kg packed weight.";return;}
    if(provider==="redx"&&(!Number.isFinite(weight)||weight<0.1||weight>10)){$("bulkCourierError").textContent=(order.order_number||"Order")+" needs 0.1–10 kg packed weight.";return;}
    if(provider==="steadfast"&&weight!==null&&(!Number.isFinite(weight)||weight<=0||weight>100)){$("bulkCourierError").textContent=(order.order_number||"Order")+" has an invalid saved weight.";return;}
    let area=null;
    if(provider==="redx"){
     const select=row.querySelector("[data-bulk-redx-area]"),district=String(row.querySelector("[data-bulk-redx-district]")?.value||"").trim();
     if(!district||!select?.value||select.dataset.verified!=="true"||String(select.dataset.loadedDistrict||"").toLowerCase()!==district.toLowerCase()){$("bulkCourierError").textContent=(order.order_number||"Order")+" needs a freshly loaded Production area matching the district.";return;}
     area={id:Number(select.value),name:select.options[select.selectedIndex]?.textContent||"",district};
     if(!Number.isInteger(area.id)||area.id<=0){$("bulkCourierError").textContent="REDX area ID is invalid. Reload the area list.";return;}
    }
    prepared.push({order,weight,area});
   }
   const codTotal=prepared.reduce((sum,item)=>sum+Number(item.order.total||0),0);
   const confirmation=["CREATE "+prepared.length+" REAL "+provider.toUpperCase()+" COURIER BOOKING(S)","COD total: "+money(codTotal),prepared.map(item=>(item.order.order_number||String(item.order.id).slice(0,8))+" · "+item.order.customer_name+" · "+(item.weight===null?"No weight":item.weight.toFixed(2)+" kg")+(item.area?" · "+item.area.name:"")).join("\n"),"Requests run sequentially. Failed/uncertain results will not be retried automatically; verify the courier Merchant Dashboard before retrying."].join("\n\n");
   if(!confirm(confirmation))return;
   form.dataset.submitting="true";button.disabled=true;$("bulkCourierError").textContent="";$("bulkCourierResults").innerHTML="";
   const results=[];
   try{
    for(let index=0;index<prepared.length;index++){
     const item=prepared[index],order=item.order;
     $("bulkCourierProgress").textContent="Sending parcel "+(index+1)+" of "+prepared.length+" · "+(order.order_number||"Order");
     button.textContent="Sending "+(index+1)+"/"+prepared.length+"…";
     try{
      const freshResult=await client.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,total,status,payment_method,notes,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,shipping_weight_kg)").eq("id",order.id).maybeSingle();
      const fresh=freshResult.data;if(freshResult.error||!fresh)throw new Error("Latest saved order could not be verified.");
      if(!["pending","processing"].includes(fresh.status))throw new Error("Order status changed to "+fresh.status+".");
      if(String(fresh.payment_method||"cash_on_delivery").toLowerCase()!=="cash_on_delivery")throw new Error("Only Cash on Delivery orders can be booked.");
      if(String(fresh.customer_name||"").trim().length<3||String(fresh.customer_name||"").trim().length>100)throw new Error("Customer name is invalid.");
      if(!normalizeCourierMobile(fresh.customer_phone))throw new Error("Customer phone is not a valid Bangladesh mobile number.");
      const address=String(fresh.delivery_address||"").trim();if(address.length<10||address.length>(provider==="pathao"?220:250))throw new Error("Delivery address length is outside courier requirements.");
      const cod=Number(fresh.total);if(!Number.isFinite(cod)||cod<=0)throw new Error("Saved COD amount is invalid.");
      const items=Array.isArray(fresh.order_items)?fresh.order_items:[];if(!items.length||items.some(i=>!String(i.product_name||"").trim()||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0))throw new Error("Saved product details or quantities are invalid.");
      const existingResult=await client.from("admin_shipments").select("*").eq("order_id",order.id).maybeSingle();
      if(existingResult.error)throw new Error("Could not verify existing courier records.");
      const existing=existingResult.data;if(courierBookingLocked(existing))throw new Error("A live or uncertain courier parcel already exists. Duplicate booking is blocked.");
      if(fresh.status==="pending"){
       const statusResult=await client.rpc("admin_update_order_status",{p_order_id:order.id,p_next_status:"processing",p_cancellation_reason:null});
       if(statusResult.error)throw new Error("Could not confirm order: "+statusResult.error.message);
       await audit("order_status_changed","order",order.id,"Order confirmed before bulk courier booking",{bulk:true,status:"processing",provider:courierLabel(provider)});
      }
      const meta=provider==="redx"?{redx_delivery_area_id:item.area.id,redx_delivery_area:item.area.name,redx_delivery_district:item.area.district,redx_sandbox_test_area:false}:{};
      const parcel={order_id:order.id,courier_name:courierLabel(provider),tracking_id:null,shipment_status:"draft",integration_mode:"manual_placeholder",cod_amount:cod,courier_fee:0,settlement_status:"pending",settled_amount:0,parcel_weight_kg:item.weight,parcel_notes:String($("bulkCourierNotes").value||"").trim(),created_by:existing?.created_by||H.ADMIN_EMAIL,updated_by:H.ADMIN_EMAIL,booking_state:existing?.booking_state==="failed"?"failed":"not_started",booking_error:"",booking_requested_at:null,provider_order_id:null,provider_response:meta};
      let shipmentId="";
      if(existing){
       const saved=await client.from("admin_shipments").update(parcel).eq("id",existing.id).select("id").single();
       if(saved.error||!saved.data)throw new Error("Could not prepare existing parcel: "+(saved.error?.message||"no record returned"));shipmentId=saved.data.id;
      }else{
       const saved=await client.from("admin_shipments").insert(parcel).select("id").single();
       if(saved.error||!saved.data)throw new Error("Could not create parcel: "+(saved.error?.message||"no record returned"));shipmentId=saved.data.id;
      }
      await audit("courier_booking_requested","shipment",shipmentId,"Sequential bulk courier booking requested",{order_id:order.id,provider:courierLabel(provider),cod_amount:cod,parcel_weight_kg:item.weight});
      const booking=await client.functions.invoke("courier-integration",{body:{action:"book",provider,shipment_id:shipmentId}});
      if(booking.error){let message=booking.error.message||"Courier API request failed.";try{if(booking.error.context&&typeof booking.error.context.clone==="function"){const body=await booking.error.context.clone().json();message=body?.error||body?.message||message;}}catch(_){}throw new Error(message+" Verify the courier dashboard before retrying.");}
      if(!booking.data?.success)throw new Error((booking.data?.error||"Courier did not confirm the booking.")+" Verify before retrying.");
      await audit("courier_booking_succeeded","shipment",shipmentId,"Courier API accepted a bulk parcel",{order_id:order.id,provider:courierLabel(provider),tracking_id:booking.data.tracking_id||null,parcel_weight_kg:item.weight});
      results.push({success:true,order:order.order_number||String(order.id).slice(0,8),detail:"Tracking: "+(booking.data.tracking_id||"check courier dashboard")});
     }catch(err){results.push({success:false,order:order.order_number||String(order.id).slice(0,8),detail:err.message||"Booking result needs review. Verify with provider."});console.error("Bulk courier request failed or uncertain:",order.id,err);}
     $("bulkCourierResults").innerHTML=results.map(result=>'<div class="hf-bulk-result-row '+(result.success?"is-success":"is-failed")+'"><span><strong>'+esc(result.order)+'</strong><small>'+esc(result.detail)+'</small></span><span class="hf-status '+(result.success?"hf-status-confirmed":"hf-status-failed")+'">'+(result.success?"Booked":"Review")+'</span></div>').join("");
    }
    const succeeded=results.filter(result=>result.success).length,failed=results.length-succeeded;
    $("bulkCourierProgress").textContent="Finished "+results.length+" sequential attempt(s): "+succeeded+" booked, "+failed+" need review. No automatic retry was made.";
    $("bulkCourierConfirm").checked=false;toast(succeeded+" courier parcel(s) booked; "+failed+" need review.",failed?"warning":"success");
    await refresh();
   }catch(err){$("bulkCourierError").textContent=err.message||"Bulk courier booking was interrupted. Verify provider status before restarting.";}
   finally{form.dataset.submitting="false";button.disabled=false;button.textContent="Confirm & send courier bookings";}
  }
  $("ordersBulkCourierBtn")?.addEventListener("click",openBulkCourierDialog);
  $("bulkCourierForm")?.addEventListener("submit",sendSelectedOrdersToCourier);
  function render(){
   const search=String($("orderSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),status=$("orderStatusFilter")?.value||"";
   const countByStatus={"":all.length,pending:0,processing:0,shipped:0,delivered:0,cancelled:0};
   all.forEach(order=>{if(Object.prototype.hasOwnProperty.call(countByStatus,order.status))countByStatus[order.status]++;});
   document.querySelectorAll("[data-order-quick-filter]").forEach(button=>{
    const filter=button.dataset.orderQuickFilter||"",count=button.querySelector("[data-order-filter-count]");
    if(count)count.textContent=shortNum(countByStatus[filter]??0);
    const active=filter===status;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));
   });
   const rows=all.filter(o=>(!status||o.status===status)&&(!search||[o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.delivery_address,o.delivery_zone,o.id,...(o.order_items||[]).map(i=>i.product_name)].join(" ").toLowerCase().includes(search)));
   visibleOrders=rows;$("ordersFoundCount").textContent=rows.length.toLocaleString("en-BD")+" orders";
   $("ordersDataBody").innerHTML=rows.length?rows.map(o=>{
    const shipment=shipmentFor(o.id),locked=courierBookingLocked(shipment),eligible=["pending","processing"].includes(o.status);
    const legacyTest=!!shipment&&(shipment.provider_response?.redx_sandbox_test_area===true||shipment.provider_response?.redx_sandbox_quick_test===true);
    let courierAction="";
    if(eligible&&shipmentRowsReady&&!locked&&String(o.payment_method||"cash_on_delivery").toLowerCase()==="cash_on_delivery"){const label=shipment?.booking_state==="failed"?"Resolve issue & retry":o.status==="pending"?"Confirm & Book":"Book Courier";courierAction='<button class="hf-button hf-button-primary hf-button-small" data-confirm-book="'+esc(o.id)+'">'+label+'</button>';}
    else if(eligible&&!shipmentRowsReady)courierAction='<span class="hf-status hf-status-review">Courier state unavailable</span>';
    else if(locked){const label=legacyTest?"Legacy courier record — verify with REDX":shipment.booking_state==="unknown"?"Booking outcome uncertain — verify with courier":shipment.booking_state==="in_progress"?"Booking in progress":shipment.booking_state==="succeeded"?"Booking succeeded":shipment.booking_state==="failed"?"Booking failed":"Courier record locked";courierAction='<span class="hf-status hf-status-review">'+esc(label)+'</span>';}
    const stateText=shipment?(legacyTest?"Legacy record — verify in REDX dashboard":shipment.booking_error||(shipment.booking_state==="failed"?"Booking failed":shipment.booking_state==="succeeded"?"Booking succeeded":shipment.booking_state==="unknown"?"Verify with courier":shipment.booking_state==="in_progress"?"Booking in progress":"Not booked")):"";
    const shipmentInfo=shipment?'<span class="hf-order-shipment-note">'+esc(shipment.courier_name||"Courier")+': '+esc(stateText)+'</span>':"";
    const phone=String(o.customer_phone||"").trim(),whatsapp=whatsappUrl(o);
    const items=Array.isArray(o.order_items)?o.order_items:[];
    const itemHtml=items.slice(0,2).map(item=>{
     const image=String(item.product_image_url||"").trim(),ok=/^https:\/\/[^"'<>\s]+$/i.test(image)&&image.length<=2048;
     const art=ok?'<img class="hf-order-item-image" src="'+esc(image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="hf-order-item-image hf-order-item-placeholder" aria-hidden="true">▧</span>';
     return '<div class="hf-order-item">'+art+'<div class="hf-order-item-copy"><strong>'+esc(item.product_name||"Product")+'</strong><small>Qty '+esc(item.quantity)+' '+esc(item.unit||"")+' · '+money(item.unit_price)+' each</small></div><b>'+money(item.line_total)+'</b></div>';
    }).join("");
    const more=items.length>2?'<span class="hf-order-more-items">+'+(items.length-2)+' more product line(s)</span>':"";
    const select='<select class="hf-select order-status-select" data-order-id="'+esc(o.id)+'" data-status="'+esc(o.status||"pending")+'" aria-label="Change status for order '+esc(o.order_number||String(o.id).slice(0,8))+'">'+statusOptions.map(s=>'<option value="'+s+'" '+(s===o.status?"selected ":"")+(o.status==="cancelled"&&s!=="cancelled"?"disabled ":"")+'>'+esc(orderStatusLabels[s]||s)+'</option>').join("")+'</select>';
    const cancel=o.status==="cancelled"&&o.cancellation_reason?'<div class="hf-order-cancellation-note">Cancellation reason: '+esc(o.cancellation_reason)+'</div>':"";
    const statusText=orderStatusLabels[o.status]||o.status||"Pending";
    return '<article class="hf-order-card" data-status="'+esc(o.status||"pending")+'" data-order-card="'+esc(o.id)+'">'+
     '<header class="hf-order-card-top">'+
      '<label class="hf-order-select-label"><input type="checkbox" data-order-select="'+esc(o.id)+'" '+(selectedOrderIds.has(o.id)?"checked ":"")+'aria-label="Select order '+esc(o.order_number||String(o.id).slice(0,8))+'"></label>'+
      '<div class="hf-order-reference"><strong>Order '+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(dateTime(o.ordered_at))+'</small></div>'+
      '<div class="hf-order-status-control"><small>ORDER STATUS</small>'+select+'</div></header>'+
     '<div class="hf-order-card-main">'+
      '<section class="hf-order-customer-panel"><div class="hf-order-customer-head">'+orderCustomerAvatar(o)+'<div class="hf-order-customer-copy"><strong>'+esc(o.customer_name||"Guest customer")+'</strong><small>'+(o.customer_id?"Registered customer":"Guest checkout")+'</small></div></div>'+
       (whatsapp?'<a class="hf-order-phone" href="'+esc(whatsapp)+'" target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp chat with '+esc(phone)+'" title="Open WhatsApp chat"><span class="hf-order-whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M20.4 3.6A11.6 11.6 0 0 0 2.1 17.5L.6 23.2l5.9-1.5A11.6 11.6 0 0 0 23.2 11.6a11.5 11.5 0 0 0-2.8-8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 6.7c-.3-.4-.6-.4-.8-.4h-.7c-.2 0-.6.1-.9.4-.3.3-1 1-1 2.5s1.1 2.9 1.3 3.2c.2.2 2.2 3.5 5.4 4.8.8.3 1.4.5 1.9.6.8.2 1.5.1 2.1.1.7-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4l-2-.9c-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.3-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.7-1.7-2-.2-.3 0-.5.1-.7.2-.2.3-.4.5-.6.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5z" fill="currentColor"/></svg></span><span class="hf-order-phone-number">'+esc(phone)+'</span></a>':phone?'<span class="hf-order-phone is-missing" title="This phone number cannot be opened in WhatsApp">'+esc(phone)+'</span>':'<span class="hf-order-phone is-missing">No phone recorded</span>')+'</section>'+
      '<section class="hf-order-items-panel"><div class="hf-order-panel-heading"><strong>Products ordered</strong><span>'+items.length+' item line(s)</span></div>'+(itemHtml||'<div class="hf-order-no-items">No product details recorded.</div>')+more+'</section>'+
      '<section class="hf-order-location-panel"><div class="hf-order-location-heading"><span class="hf-order-location-icon" aria-hidden="true">⌖</span><strong>Delivery location</strong></div><div class="hf-order-location-meta"><span class="hf-order-zone-badge">'+esc(String(o.delivery_zone||"").replace(/_/g," ").replace(/\\b\\w/g,char=>char.toUpperCase())||"Delivery area")+'</span></div><p class="hf-order-address">'+esc(o.delivery_address||"No delivery address recorded")+'</p></section>'+
      '<section class="hf-order-totals-panel"><div class="hf-order-totals-values"><div><small>Products subtotal</small><strong>'+money(o.subtotal)+'</strong></div><div><small>Delivery charge</small><strong>'+money(o.delivery_charge)+'</strong></div><div class="hf-order-grand-total"><small>Order total · COD</small><strong>'+money(o.total)+'</strong></div></div><div class="hf-order-actions"><button class="hf-button hf-button-secondary hf-button-small" type="button" data-order-details="'+esc(o.id)+'">Details</button>'+courierAction+'</div></section>'+
     '</div>'+
     (cancel?'<div class="hf-order-cancellation-note">Cancellation reason: '+esc(o.cancellation_reason)+'</div>':"")+
     (shipmentInfo?'<footer class="hf-order-card-footer"><div class="hf-order-secondary-info">'+shipmentInfo+'</div></footer>':"")+'</article>';
   }).join(""):'<div class="hf-orders-empty">'+makeEmpty("No matching orders","Try another status or a shorter search term.")+'</div>';
   $("ordersDataBody").querySelectorAll(".hf-order-avatar img").forEach(img=>img.addEventListener("error",()=>{img.hidden=true;const fallback=img.nextElementSibling;if(fallback)fallback.hidden=false;},{once:true}));
   $("ordersDataBody").querySelectorAll(".hf-order-item-image[src]").forEach(img=>img.addEventListener("error",()=>{img.hidden=true;},{once:true}));
   updateBulkSelectionUi(rows);
  }
  async function refresh(){
   const [ordersResult,customersResult,profilesResult,itemWeightResult,assignmentResult,teamResult]=await Promise.all([
    fetchOrders(null,5000),
    signedQuery(client.from("customers").select("id,auth_user_id").not("auth_user_id","is",null).order("id",{ascending:true}).limit(1000)).catch(error=>{
     console.warn("Customer identity links could not be loaded; initials will be shown.",error);return [];
    }),
    signedQuery(client.from("customer_profiles").select("user_id,avatar_url").not("avatar_url","is",null).order("user_id",{ascending:true}).limit(1000)).catch(error=>{
     console.warn("Customer profile avatars could not be loaded; initials will be shown.",error);return [];
    }),
    signedQuery(client.from("order_items").select("id,order_id,shipping_weight_kg").order("created_at",{ascending:true}).limit(5000)).catch(error=>{
     console.warn("Order-line weight snapshots could not be loaded.",error);return null;
    }),
    signedQuery(client.from("orders").select("id,assigned_to_team_member_id").order("ordered_at",{ascending:false}).limit(5000)).catch(error=>{
     console.warn("Bulk order assignments could not be loaded.",error);return [];
    }),
    signedQuery(client.from("admin_team_members").select("id,full_name,role_title,department,is_active").eq("is_active",true).order("full_name").limit(200)).catch(error=>{
     console.warn("Team directory could not be loaded for order assignment.",error);return [];
    })
   ]);
   const weightsByItemId=new Map((itemWeightResult||[]).map(row=>[row.id,row.shipping_weight_kg]));
   const assigneeByOrderId=new Map((assignmentResult||[]).map(row=>[row.id,row.assigned_to_team_member_id]));
   orderWeightDataReady=Array.isArray(itemWeightResult);
   teamMembers=Array.isArray(teamResult)?teamResult:[];
   all=ordersResult.map(order=>({...order,
    assigned_to_team_member_id:assigneeByOrderId.get(order.id)||null,
    order_items:(order.order_items||[]).map(item=>({...item,shipping_weight_kg:weightsByItemId.get(item.id)??item.shipping_weight_kg??null}))
   }));
   const profilesByUserId=new Map((profilesResult||[]).filter(profile=>profile.avatar_url).map(profile=>[profile.user_id,profile]));
   customerProfilesById=new Map((customersResult||[]).flatMap(customer=>{
    const profile=profilesByUserId.get(customer.auth_user_id);
    return customer.auth_user_id&&profile?[[customer.id,profile]]:[];
   }));
   for(const id of [...selectedOrderIds])if(!all.some(order=>order.id===id))selectedOrderIds.delete(id);
   try{
    const {data,error}=await client.from("admin_shipments").select("id,order_id,courier_name,tracking_id,shipment_status,integration_mode,booking_state,booking_error,provider_order_id,parcel_weight_kg,parcel_notes,created_by,provider_response").order("updated_at",{ascending:false}).limit(5000);
    if(error)throw error;
    shipmentRows=data||[];shipmentRowsReady=true;shipmentLoadMessage="";
   }catch(err){
    shipmentRows=[];shipmentRowsReady=false;shipmentLoadMessage="Could not read courier records. Refresh and verify Admin/MFA access before booking.";
    console.error("Courier records could not be loaded.",err);
   }
   render();
   await Promise.all([refreshSecuritySignals(),refreshSecurityReviewQueue()]);
   $("ordersUpdated").textContent="Updated "+dateTime(new Date().toISOString());
  }
  $("securityReviewBody")?.addEventListener("click",async event=>{
   const button=event.target.closest("[data-security-decision]");
   if(!button||button.disabled)return;
   const reviewId=String(button.dataset.reviewId||"");
   const decision=String(button.dataset.securityDecision||"");
   if(!reviewId||!["approve","reject"].includes(decision))return;
   let notes="";
   if(decision==="approve"){
    const entered=window.prompt("Confirm that you have contacted the customer and verified this order. Enter a short note:","Customer confirmed by phone.");
    if(entered===null)return;
    notes=entered.trim();
    if(notes.length<3){toast("Enter a short customer-verification note before approval.","error");return;}
    if(!window.confirm("Approve this order? It will enter the normal Orders list, reserve stock and trigger the configured Purchase tracking."))return;
   }else{
    const entered=window.prompt("Why is this suspicious order being rejected?","Unable to verify customer / suspicious automated submission.");
    if(entered===null)return;
    notes=entered.trim();
    if(notes.length<3){toast("Enter a short rejection reason.","error");return;}
    if(!window.confirm("Reject this held order? No normal order or inventory reservation will be created."))return;
   }
   button.disabled=true;
   const row=button.closest("tr");
   row?.querySelectorAll("button[data-security-decision]").forEach(control=>control.disabled=true);
   try{
    const {data,error}=await client.functions.invoke("order-security-admin",{
     body:{reviewId,decision,notes}
    });
    if(error||data?.success!==true)throw new Error(data?.error||error?.message||"Security review action failed.");
    toast(decision==="approve"?"Order approved and added to Orders.":"Suspicious order rejected; no stock was reserved.","success");
    await refresh();
   }catch(error){
    console.error("Security review decision failed.",error);
    toast(error?.message||"Could not save the review decision. Refresh and check the queue.","error");
    row?.querySelectorAll("button[data-security-decision]").forEach(control=>control.disabled=false);
   }
  });
  $("toggleBulkOrdersBtn")?.addEventListener("click",()=>{
   const bar=$("ordersBulkBar");if(!bar)return;bar.hidden=!bar.hidden;
   $("toggleBulkOrdersBtn").setAttribute("aria-expanded",String(!bar.hidden));
  });
  $("ordersSelectAll")?.addEventListener("change",event=>{
   visibleOrders.forEach(order=>{if(event.currentTarget.checked)selectedOrderIds.add(order.id);else selectedOrderIds.delete(order.id);});
   render();
  });
  $("ordersBulkClearBtn")?.addEventListener("click",()=>{selectedOrderIds.clear();render();});
  $("ordersBulkDeleteBtn")?.addEventListener("click",deleteSelectedOrders);
  $("ordersBulkStatusBtn")?.addEventListener("click",openBulkStatusDialog);
  $("ordersBulkAssignBtn")?.addEventListener("click",openBulkAssignDialog);
  document.querySelectorAll("[data-bulk-close]").forEach(button=>button.addEventListener("click",()=>{
   const dialog=$(button.dataset.bulkClose);if(dialog)dialog.close();
  }));

  $("ordersBulkExportBtn")?.addEventListener("click",exportSelectedOrders);
  document.querySelectorAll("[data-bulk-print]").forEach(button=>button.addEventListener("click",()=>printSelectedOrders(button.dataset.bulkPrint)));
  $("ordersDataBody")?.addEventListener("change",e=>{
   const rowCheck=e.target.closest("[data-order-select]");
   if(!rowCheck)return;
   if(rowCheck.checked)selectedOrderIds.add(rowCheck.dataset.orderSelect);else selectedOrderIds.delete(rowCheck.dataset.orderSelect);
   const bar=$("ordersBulkBar");if(selectedOrderIds.size&&bar&&bar.hidden){bar.hidden=false;$("toggleBulkOrdersBtn")?.setAttribute("aria-expanded","true");}
   updateBulkSelectionUi(visibleOrders);
  });
  const qStatus=new URLSearchParams(location.search).get("status");if(qStatus&&statusOptions.includes(qStatus))$("orderStatusFilter").value=qStatus;
  $("ordersStatusOverview")?.addEventListener("click",e=>{
   const button=e.target.closest("[data-order-quick-filter]");
   if(!button)return;
   $("orderStatusFilter").value=button.dataset.orderQuickFilter||"";
   render();
  });
  $("ordersDataBody")?.addEventListener("change",async e=>{
   const select=e.target.closest(".order-status-select");if(!select)return;
   const order=all.find(o=>o.id===select.dataset.orderId);if(!order)return;
   const next=select.value,old=order.status;if(next===old)return;
   const shipment=shipmentFor(order.id);
   if(next==="processing"&&old!=="processing"&&!(shipment&&shipment.integration_mode==="live_api"&&shipment.booking_state==="succeeded")){select.value=old;openConfirmBook(order.id);return;}
   if(next==="cancelled"&&courierBookingLocked(shipment)){
    select.value=old;toast("Changing the order to Cancelled will not cancel its courier shipment. Verify/cancel the parcel with the courier first; the site does not yet provide a courier-cancel action.","error");return;
   }
   if(next==="shipped"&&!(shipment&&shipment.integration_mode==="live_api"&&shipment.booking_state==="succeeded"&&["picked_up","in_transit","delivered"].includes(shipment.shipment_status))){
    select.value=old;toast("A status change alone does not book or dispatch a courier. Use Confirm & Book first and verify courier pickup/status before marking Shipped.","error");return;
   }
   let reason=null;
   if(next==="cancelled"){reason=window.prompt("Why is this order being cancelled? This reason will be saved in the order and status history.","");if(reason===null){select.value=old;return;}reason=reason.trim();if(reason.length<3||reason.length>500){toast("Enter a cancellation reason between 3 and 500 characters.","error");select.value=old;return;}}
   if((next==="cancelled"||next==="delivered")&&!confirm("Change order "+(order.order_number||String(order.id).slice(0,8))+" to "+next+"?")){select.value=old;return;}
   select.dataset.status=next;
   const orderCard=select.closest("[data-order-card]");if(orderCard)orderCard.dataset.status=next;
   select.disabled=true;
   try{const {data,error}=await client.rpc("admin_update_order_status",{p_order_id:order.id,p_next_status:next,p_cancellation_reason:reason});if(error)throw error;await audit("order_status_changed","order",order.id,"Order status changed from "+old+" to "+next,{status:next,cancellation_reason:reason||null});toast("Order status and history updated.");await refresh();}
   catch(err){select.value=old;select.dataset.status=old;const orderCard=select.closest("[data-order-card]");if(orderCard)orderCard.dataset.status=old;toast("Status could not be saved: "+(err.message||"check admin access and database permissions"),"error");}
   finally{select.disabled=false;}
  });
  $("ordersDataBody")?.addEventListener("click",async e=>{
   const confirmButton=e.target.closest("[data-confirm-book]");
   if(confirmButton){openConfirmBook(confirmButton.dataset.confirmBook);return;}
   const button=e.target.closest("[data-order-details]");if(!button)return;
   const order=all.find(x=>x.id===button.dataset.orderDetails);if(!order)return;
   activeOrderId=order.id;$("orderDetailTitle").textContent="Order "+(order.order_number||String(order.id).slice(0,8));
   const cancellationHtml=order.cancellation_reason?'<div class="hf-span-2"><strong>Cancellation reason</strong><p>'+esc(order.cancellation_reason)+'</p></div>':"";
   $("orderDetailContent").innerHTML='<div class="hf-summary-strip"><div class="hf-summary-pill"><small>Order total</small><strong>'+money(order.total)+'</strong></div><div class="hf-summary-pill"><small>Products subtotal</small><strong>'+money(order.subtotal)+'</strong></div><div class="hf-summary-pill"><small>Delivery</small><strong>'+money(order.delivery_charge)+'</strong></div></div><div class="hf-field-grid"><div><strong>Customer</strong><p>'+esc(order.customer_name||"—")+'</p></div><div><strong>Phone</strong><p>'+esc(order.customer_phone||"—")+'</p></div><div><strong>Email</strong><p>'+esc(order.customer_email||"—")+'</p></div><div><strong>Status</strong><p>'+makeStatus(order.status)+'</p></div><div><strong>Delivery area</strong><p>'+esc(order.delivery_zone||"Not recorded")+'</p></div><div><strong>Payment method</strong><p>'+esc(order.payment_method==="cash_on_delivery"?"Cash on Delivery (COD)":(order.payment_method||"Not recorded"))+'</p></div><div class="hf-span-2"><strong>Delivery address</strong><p>'+esc(order.delivery_address||"—")+'</p></div>'+cancellationHtml+'</div><h3 style="margin:18px 0 8px">Products</h3><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>'+((order.order_items||[]).map(item=>'<tr><td>'+esc(item.product_name)+'</td><td>'+esc(item.quantity)+' '+esc(item.unit||"")+'</td><td>'+money(item.unit_price)+'</td><td>'+money(item.line_total)+'</td></tr>').join("")||'<tr><td colspan="4">No item details</td></tr>')+'</tbody></table></div><p class="hf-data-note">Recorded order value is not proof that payment has been collected. This is currently a testing project; no real payment or delivery is enabled.</p>';
   const wa=$("orderWhatsAppBtn"),waUrl=whatsappUrl(order);if(wa){wa.href=waUrl||"#";wa.hidden=!waUrl;wa.setAttribute("aria-disabled",waUrl?"false":"true");}
   const courierHistoryButton=$("orderCourierHistoryBtn");if(courierHistoryButton){courierHistoryButton.hidden=!courierLookupPhone(order.customer_phone);courierHistoryButton.dataset.orderId=order.id;}
   $("orderHistoryContent").innerHTML='<p class="hf-loading">Loading status history…</p>';$("orderDialog")?.showModal();
   try{const history=await signedQuery(client.from("order_status_history").select("id,from_status,to_status,reason,changed_by,changed_at").eq("order_id",order.id).order("changed_at",{ascending:false}).limit(30));$("orderHistoryContent").innerHTML=history.length?'<div class="hf-status-timeline">'+history.map(item=>'<div class="hf-status-timeline-row"><span class="hf-status-timeline-dot"></span><div><strong>'+esc((item.from_status||"Initial")+" → "+item.to_status)+'</strong><p>'+esc(item.reason||"No note recorded")+'</p><small>'+esc(dateTime(item.changed_at))+' · '+esc(item.changed_by||"Admin")+'</small></div></div>').join("")+'</div>':makeEmpty("No status changes recorded","Earlier transitions are not available; new changes will appear here.");}
   catch(err){$("orderHistoryContent").innerHTML=makeEmpty("History could not be loaded","Check the admin session and status-history table permissions.");}
  });
  $("confirmBookForm")?.addEventListener("submit",async e=>{
   e.preventDefault();
   const form=e.currentTarget,button=$("confirmBookSubmit");
   if(form.dataset.submitting==="true")return;
   form.dataset.submitting="true";button.disabled=true;button.textContent="Confirming & booking…";
   $("confirmBookFormError").textContent="";
   try{
    const orderId=$("confirmBookOrderId").value,order=all.find(row=>row.id===orderId);
    if(!order)throw new Error("Order not found. Refresh and retry.");
    if(!shipmentRowsReady)throw new Error(shipmentLoadMessage||"Courier records could not be verified. Refresh and retry.");
    if(!["pending","processing"].includes(order.status))throw new Error("Only pending or processing orders can be confirmed for courier booking.");
    const provider=$("confirmBookProvider").value;
    if(!["steadfast","pathao","redx"].includes(provider))throw new Error("Choose Steadfast, Pathao or REDX.");
    if(String(order.payment_method||"cash_on_delivery").toLowerCase()!=="cash_on_delivery")throw new Error("Only Cash on Delivery orders are enabled for courier booking.");
    if(!$("confirmBookCustomerCheck").checked)throw new Error("Confirm that you have contacted the customer and verified the order details.");
    const weightRaw=(provider==="pathao"?$("confirmBookPathaoWeight").value:provider==="redx"?$("confirmBookRedxWeight").value:"").trim(),weight=weightRaw===""?null:Number(weightRaw);
    if(provider==="pathao"&&(!Number.isFinite(weight)||weight<0.5||weight>10))throw new Error("For Pathao, enter a realistic packed weight between 0.5 kg and 10 kg.");
    if(provider==="redx"&&(!Number.isFinite(weight)||weight<0.1||weight>10))throw new Error("For REDX, enter a packed parcel weight between 0.1 kg and 10 kg.");
    const areaSelect=$("confirmBookRedxArea"),selectedRedxArea=redxLoadedAreas.find(a=>a.id===String(areaSelect.value||""));
    const redxAreaName=selectedRedxArea?.name||"",redxAreaId=Number(selectedRedxArea?.id||0);
    if(provider==="redx"&&(!selectedRedxArea||!Number.isInteger(redxAreaId)||redxAreaId<=0||selectedRedxArea.sandbox_test_only))throw new Error("Load the Production REDX delivery areas and select the correct area for the customer’s address. Area IDs are assigned automatically.");
    if(provider==="redx"&&redxLoadedDistrict.toLowerCase()!==String($("confirmBookRedxDistrict").value||"").trim().toLowerCase())throw new Error("The destination district changed. Reload the delivery areas before booking.");
    const recipientAddress=String($("confirmBookAddress").value||"").trim();
    if(recipientAddress.length<10)throw new Error("The saved address is too short. Enter the full house/road or village, area/upazila and district address (at least 10 characters).");
    const providerAddressLimit=provider==="pathao"?220:250;
    if(recipientAddress.length>providerAddressLimit)throw new Error(provider==="pathao"?"Pathao delivery addresses must be 220 characters or fewer. Shorten the address without removing essential location details.":"The delivery address must be 250 characters or fewer.");
    // Accept addresses written in normal local language; punctuation/component-count is not a courier requirement.
    // The admin must still confirm the address is real and sufficiently specific before live booking.
    const {data:freshOrder,error:orderReadError}=await client.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,total,status,payment_method,notes,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url,shipping_weight_kg)").eq("id",orderId).maybeSingle();
    if(orderReadError||!freshOrder)throw new Error("Could not verify the latest order record. Refresh and try again.");
    if(!["pending","processing"].includes(freshOrder.status))throw new Error("The order changed to "+freshOrder.status+" and can no longer be booked from this action.");
    if(String(freshOrder.payment_method||"cash_on_delivery").toLowerCase()!=="cash_on_delivery")throw new Error("The latest order is not marked Cash on Delivery.");
    const freshCustomerName=String(freshOrder.customer_name||"").trim();
    if(freshCustomerName.length<3||freshCustomerName.length>100)throw new Error("The saved customer name must be between 3 and 100 characters. Correct the order details before booking.");
    if(!normalizeCourierMobile(freshOrder.customer_phone))throw new Error("The saved phone number must be a valid Bangladeshi mobile number (11 digits beginning with 01; +880/00880 formats are accepted). Correct the order details before booking.");
    const freshTotal=Number(freshOrder.total);
    if(!Number.isFinite(freshTotal)||freshTotal<=0)throw new Error("The saved COD amount is invalid. Verify the order total before booking.");
    const freshItems=Array.isArray(freshOrder.order_items)?freshOrder.order_items:[];
    if(!freshItems.length||freshItems.some(item=>!String(item?.product_name||"").trim()||!Number.isFinite(Number(item?.quantity))||Number(item.quantity)<=0))throw new Error("Saved product names or quantities are missing/invalid. Refresh and verify the order items before booking.");
    const {data:existing,error:existingError}=await client.from("admin_shipments").select("*").eq("order_id",orderId).maybeSingle();
    if(existingError)throw new Error("Could not verify whether this order already has a courier parcel. Refresh and retry.");
    if(courierBookingLocked(existing))throw new Error("A courier booking already exists or its result is uncertain. Verify the courier dashboard before retrying; duplicate booking is blocked.");
    const providerName=courierLabel(provider);
    const confirmationItems=freshItems.map(item=>String(item.product_name)+" × "+String(item.quantity)+" "+String(item.unit||"")).join(", ");
    const confirmMessage="CREATE REAL COURIER BOOKING — "+providerName+"\n\nOrder: "+(freshOrder.order_number||String(freshOrder.id).slice(0,8))+"\nCustomer: "+(freshOrder.customer_name||"Customer")+"\nPhone: "+(freshOrder.customer_phone||"Not recorded")+"\nProducts: "+confirmationItems+"\nFull address: "+recipientAddress+"\nCOD to collect: "+money(freshOrder.total)+(["pathao","redx"].includes(provider)?"\nPacked weight: "+weight+" kg":"")+(provider==="redx"?"\nREDX delivery area: "+redxAreaName:"")+"\n\nThis sends the saved customer and order details to "+providerName+" and may create a real shipment. Check the details carefully. Courier cancellation is not available inside this page. Continue with the real booking?";
    if(!confirm(confirmMessage))return;
    if(String(freshOrder.delivery_address||"").trim()!==recipientAddress){
     const {error:addressError}=await client.rpc("admin_update_order_delivery_address",{p_order_id:orderId,p_delivery_address:recipientAddress});
     if(addressError)throw new Error("The delivery address could not be saved: "+(addressError.message||"check admin access and order state."));
     await audit("order_delivery_address_corrected","order",orderId,"Delivery address corrected before courier booking",{provider:providerName,address_length:recipientAddress.length});
     freshOrder.delivery_address=recipientAddress;
    }
    if(freshOrder.status!=="processing"){
     const {error:statusError}=await client.rpc("admin_update_order_status",{p_order_id:orderId,p_next_status:"processing",p_cancellation_reason:null});
     if(statusError)throw new Error("The order could not be confirmed: "+(statusError.message||"check admin access and status history."));
     await audit("order_status_changed","order",orderId,"Order confirmed before courier booking",{status:"processing",courier_provider:providerName});
    }
    const shipmentPayload={
     order_id:orderId,courier_name:providerName,tracking_id:null,shipment_status:"draft",integration_mode:"manual_placeholder",
     cod_amount:Number(freshOrder.total),courier_fee:0,settlement_status:"pending",settled_amount:0,
     parcel_weight_kg:["pathao","redx"].includes(provider)?weight:(orderPackedWeightKg(freshOrder).weight??null),parcel_notes:(provider==="steadfast"?$("confirmBookSteadfastNotes").value:provider==="pathao"?$("confirmBookPathaoInstruction").value:$("confirmBookRedxInstruction").value).trim(),
     created_by:existing?.created_by||H.ADMIN_EMAIL,updated_by:H.ADMIN_EMAIL,
     booking_state:existing?.booking_state==="failed"?"failed":"not_started",booking_error:"",booking_requested_at:null,
     provider_order_id:null,provider_response:provider==="redx"?{redx_delivery_area_id:redxAreaId,redx_delivery_area:redxAreaName,redx_delivery_district:$("confirmBookRedxDistrict").value.trim(),redx_sandbox_test_area:false}:{}
    };
    let shipmentId="";
    if(existing){
     const {data:saved,error:saveError}=await client.from("admin_shipments").update(shipmentPayload).eq("id",existing.id).select("id").single();
     if(saveError||!saved)throw new Error("Order is confirmed, but the parcel record could not be prepared. Reopen Operations Center and review this order before retrying.");
     shipmentId=saved.id;
    }else{
     const {data:saved,error:saveError}=await client.from("admin_shipments").insert(shipmentPayload).select("id").single();
     if(saveError||!saved)throw new Error("Order is confirmed, but the parcel record could not be prepared. Refresh and review this order before retrying.");
     shipmentId=saved.id;
    }
    await audit("courier_booking_requested","shipment",shipmentId,"Admin confirmed order and requested live courier booking",{order_id:orderId,provider:providerName,cod_amount:Number(freshOrder.total)});
    const {data:booking,error:bookingError}=await client.functions.invoke("courier-integration",{body:{action:"book",provider,shipment_id:shipmentId}});
    if(bookingError){
     let message=bookingError.message||"Courier API booking failed.";
     try{if(bookingError.context&&typeof bookingError.context.clone==="function"){const payload=await bookingError.context.clone().json();message=payload?.error||payload?.message||message;}}catch(_){}
     throw new Error(message);
    }
    if(!booking?.success)throw new Error(booking?.error||"The courier did not confirm the booking.");
    await audit("courier_booking_succeeded","shipment",shipmentId,"Courier API accepted the parcel booking",{order_id:orderId,provider:providerName,tracking_id:booking.tracking_id||null});
    $("confirmBookDialog").close();
    toast(providerName+" booking succeeded · Tracking: "+(booking.tracking_id||"check the courier dashboard"),"success");
    await refresh();
   }catch(err){
    const message=err?.message||"Could not confirm and book this order.";
    $("confirmBookFormError").textContent=message;toast(message,"error");
    try{await refresh();}catch(_){}
   }finally{
    form.dataset.submitting="false";button.disabled=false;button.textContent="Confirm & Book Courier";
   }
  });
  $("orderPrintBtn")?.addEventListener("click",()=>{const order=all.find(x=>x.id===activeOrderId);if(order)printPackingSlip(order);});
  $("orderCourierHistoryBtn")?.addEventListener("click",()=>{const order=all.find(x=>x.id===$("orderCourierHistoryBtn").dataset.orderId);if(!order)return;$("orderDialog")?.close();void showCourierHistory(order);});
  $("closeOrderDialog")?.addEventListener("click",()=>$("orderDialog")?.close());
  $("courierHistoryClose")?.addEventListener("click",()=>$("courierHistoryDialog")?.close());
  $("courierHistoryDone")?.addEventListener("click",()=>$("courierHistoryDialog")?.close());
  await refresh();attachRefresh(refresh);
 }
 async function uploadImage(file,folder,slug){
  if(!file)return null;
  if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type))throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
  if(file.size>5*1024*1024)throw new Error("Images must be 5 MB or smaller.");
  const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"}[file.type];
  const path=folder+"/"+slug+"-"+Date.now()+"."+ext;
  const {error}=await client.storage.from("store-content").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(error)throw error;
  return client.storage.from("store-content").getPublicUrl(path).data.publicUrl;
 }
 async function initProductAdd(){
  let categories=[];
  async function loadCategories(){
   categories=await fetchCategories();
   const active=categories.filter(category=>category.is_active);
   $("productCategorySelect").innerHTML='<option value="">Choose category</option>'+active.map(category=>'<option value="'+esc(category.slug)+'">'+esc(category.name)+'</option>').join("");
   if(!active.length)throw new Error("Add or restore a category in All Products before creating a product.");
  }
  const inferWeight=value=>{
   const raw=String(value||"").trim().toLowerCase();
   if(raw==="kg")return "1.000";
   const match=raw.match(/^([0-9]+(?:\\.[0-9]+)?)\\s*(kg|g|gram|grams)$/);
   if(!match)return "";
   const amount=Number(match[1]),kg=match[2]==="kg"?amount:amount/1000;
   return Number.isFinite(kg)&&kg>0&&kg<=100?kg.toFixed(3):"";
  };
  $("productName").addEventListener("input",()=>{if(!$("productSlug").dataset.edited)$("productSlug").value=slugify($("productName").value);});
  $("productSlug").addEventListener("input",()=>{$("productSlug").dataset.edited="1";});
  $("productUnit").addEventListener("input",()=>{const field=$("productShippingWeight");if(field.dataset.manual==="true")return;const guess=inferWeight($("productUnit").value);if(guess)field.value=guess;});
  $("productShippingWeight").addEventListener("input",event=>{event.currentTarget.dataset.manual=event.currentTarget.value.trim()?"true":"";});
  $("productImageUrl").addEventListener("input",()=>{const url=$("productImageUrl").value.trim();if(url){$("productImagePreview").src=url;$("productImagePreview").hidden=false;}});
  $("productImageFile").addEventListener("change",()=>{const file=$("productImageFile").files?.[0];if(file){$("productImagePreview").src=URL.createObjectURL(file);$("productImagePreview").hidden=false;}});
  $("productForm").addEventListener("submit",async event=>{
   event.preventDefault();
   const button=event.submitter||$("productForm").querySelector('[data-save-state="published"]');
   const state=button?.dataset.saveState==="draft"?"draft":"published";
   const buttons=[...$("productForm").querySelectorAll('button[type="submit"]')];
   buttons.forEach(item=>item.disabled=true);
   $("productFormError").textContent="";$("productSaveResult").hidden=true;
   try{
    const category=categories.find(item=>item.slug===$("productCategorySelect").value&&item.is_active);
    if(!category)throw new Error("Choose an active category.");
    const name=$("productName").value.trim(),slug=$("productSlug").value.trim();
    if(!name)throw new Error("Product name is required.");
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Use a valid English product URL slug.");
    const price=Number($("productPrice").value);
    if(!Number.isFinite(price)||price<0)throw new Error("Enter a valid non-negative price.");
    const rawWeight=$("productShippingWeight").value.trim(),shippingWeight=rawWeight===""?null:Number(rawWeight);
    if(shippingWeight!==null&&(!Number.isFinite(shippingWeight)||shippingWeight<=0||shippingWeight>100))throw new Error("Shipping weight must be greater than 0 and no more than 100 kg.");
    const rawStock=$("productStock").value.trim(),stock=rawStock===""?null:Number(rawStock);
    if(stock!==null&&(!Number.isFinite(stock)||stock<0))throw new Error("Stock quantity must be zero or greater.");
    const rawCost=$("productCostPrice").value.trim(),rawPackaging=$("productPackagingCost").value.trim(),rawThreshold=$("productLowStockThreshold").value.trim();
    const cost=rawCost===""?null:Number(rawCost),packaging=rawPackaging===""?0:Number(rawPackaging),threshold=rawThreshold===""?5:Number(rawThreshold);
    if(cost!==null&&(!Number.isFinite(cost)||cost<0))throw new Error("Purchase cost must be zero or greater.");
    if(!Number.isFinite(packaging)||packaging<0)throw new Error("Packaging cost must be zero or greater.");
    if(!Number.isFinite(threshold)||threshold<0)throw new Error("Low-stock threshold must be zero or greater.");
    if(state==="draft"&&$("productFeatured").checked)throw new Error("Save as Published before marking a product as Featured.");
    let imageUrl=$("productImageUrl").value.trim();
    const imageFile=$("productImageFile").files?.[0];
    if(imageFile)imageUrl=await uploadImage(imageFile,"products",slug);
    const unit=$("productUnit").value.trim()||"piece";
    const displayInput=$("productDisplayPrice").value.trim();
    const match=displayInput.match(/[0-9][0-9,]*(?:\\.[0-9]+)?/);
    const shownAmount=match?Number(match[0].replace(/,/g,"")):NaN;
    const displayPrice=displayInput&&shownAmount===price?displayInput:("৳"+price.toLocaleString("en-BD")+" / "+unit);
    const payload={
     name,slug,category:category.name,category_slug:category.slug,price,unit_type:unit,
     shipping_weight_kg:shippingWeight,display_price:displayPrice,image_url:imageUrl||null,
     short_description:$("productShortDescription").value.trim(),
     full_description:$("productFullDescription").value.trim(),
     stock_quantity:stock,is_active:state==="published",is_featured:$("productFeatured").checked,
     sort_order:parseInt($("productSortOrder").value||"0",10)||0,
     seo_title:$("productSeoTitle").value.trim()||null,
     seo_description:$("productSeoDescription").value.trim()||null,
     cms_managed:true,cms_created:true
    };
    const {data,error}=await client.from("products").insert(payload).select("id,sku").single();
    if(error)throw error;
    const costWrite=await client.from("admin_product_costs").upsert({
     product_id:data.id,cost_price:cost,packaging_cost:packaging,low_stock_threshold:threshold,
     updated_by:ADMIN_EMAIL,updated_at:new Date().toISOString()
    },{onConflict:"product_id"});
    await audit("product_created","product",data.id,"Product created in dedicated Add Product workspace",{slug,sku:data.sku,status:state,cost_recorded:cost!==null});
    $("productSaveResult").innerHTML='<strong>Product saved successfully</strong><p>Permanent product code: <code>'+esc(data.sku)+'</code></p><div class="hf-table-actions"><a class="hf-button hf-button-secondary hf-button-small" href="./products-barcode.html?sku='+encodeURIComponent(data.sku)+'">Generate label</a><a class="hf-button hf-button-primary hf-button-small" href="./products.html">Open All Products</a></div>';
    $("productSaveResult").hidden=false;
    if(costWrite.error){
     $("productFormError").textContent="Product saved, but private cost/stock alert settings need attention: "+costWrite.error.message;
     toast("Product saved; private cost settings need attention.","error");
    }else{
     toast(state==="published"?"Product published.":"Product saved as draft.");
    }
    $("productForm").reset();
    $("productUnit").value="piece";$("productPackagingCost").value="0";$("productLowStockThreshold").value="5";$("productSortOrder").value="0";
    $("productSlug").dataset.edited="";$("productShippingWeight").dataset.manual="";
    $("productImagePreview").hidden=true;$("productImagePreview").removeAttribute("src");
   }catch(error){$("productFormError").textContent=error.message||"Product could not be saved.";}
   finally{buttons.forEach(item=>item.disabled=false);}
  });
  await loadCategories();attachRefresh(loadCategories);
 }
 async function initProducts(){
  const productsDateLabel=$("productsDateLabel");
  if(productsDateLabel){
   try{productsDateLabel.textContent=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());}
   catch(_dateError){productsDateLabel.textContent=new Date().toDateString();}
  }
  let products=[],categories=[],stockFilter="all";
  function stockState(product){
   const raw=product.stock_quantity;
   if(raw===null||raw===undefined||raw==="")return "untracked";
   const stock=Number(raw);
   if(!Number.isFinite(stock))return "untracked";
   const rawThreshold=product.low_stock_threshold;
   const threshold=rawThreshold===null||rawThreshold===undefined||rawThreshold===""?5:(Number.isFinite(Number(rawThreshold))?Number(rawThreshold):5);
   if(stock<=0)return "out";
   return stock<=threshold?"low":"in";
  }
  function fillCategories(selected=""){
   $("productCategorySelect").innerHTML='<option value="">Choose category</option>'+categories.map(c=>'<option value="'+esc(c.slug)+'" '+(c.slug===selected?"selected":"")+'>'+esc(c.name)+(c.is_active?"":" (hidden)")+'</option>').join("");
   $("productCategoryFilter").innerHTML='<option value="">All categories</option>'+categories.map(c=>'<option value="'+esc(c.slug)+'">'+esc(c.name)+'</option>').join("");
  }
  function render(){
    const search=String($("productSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),cat=$("productCategoryFilter")?.value||"",state=$("productVisibilityFilter")?.value||"";
    const stockCounts={all:products.length,in:0,low:0,out:0,untracked:0};
    products.forEach(p=>{stockCounts[stockState(p)]++;});
    document.querySelectorAll("[data-product-stock-filter]").forEach(button=>{
     const filter=button.dataset.productStockFilter||"all";
     const count=button.querySelector("[data-product-stock-count]");
     if(count)count.textContent=shortNum(stockCounts[filter]??0);
     const active=filter===stockFilter;
     button.classList.toggle("is-active",active);
     button.setAttribute("aria-pressed",String(active));
    });
    const rows=products.filter(p=>(stockFilter==="all"||stockState(p)===stockFilter)&&(!search||[p.name,p.slug,p.sku,p.category,p.short_description].join(" ").toLowerCase().includes(search))&&(!cat||p.category_slug===cat)&&(!state||(state==="visible"?p.is_active:!p.is_active)));
    $("productTableBody").innerHTML=rows.length?rows.map(p=>{
     const tracked=p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.stock_quantity!=="";
     const stock=Number(p.stock_quantity),threshold=Number.isFinite(Number(p.low_stock_threshold))?Number(p.low_stock_threshold):5;
     const outOfStock=tracked&&Number.isFinite(stock)&&stock<=0,low=tracked&&Number.isFinite(stock)&&stock>0&&stock<=threshold,costKnown=p.cost_price!==null&&p.cost_price!==undefined&&p.cost_price!=="";
     const totalUnitCost=(costKnown?Number(p.cost_price):0)+Number(p.packaging_cost||0);
     const margin=costKnown&&Number(p.price)>0?((Number(p.price)-totalUnitCost)/Number(p.price))*100:null;
     const marginClass=margin===null?"":margin<0?"hf-status-failed":margin<15?"hf-status-pending":"hf-status-confirmed";
     const marginText=margin===null?"Add purchase cost to calculate margin":'Margin <span class="hf-status '+marginClass+'">'+margin.toLocaleString("en-BD",{maximumFractionDigits:1})+'%</span> · includes packaging';
     const shippingWeightCell=p.shipping_weight_kg!=null?'<strong>'+Number(p.shipping_weight_kg).toLocaleString("en-BD",{minimumFractionDigits:3,maximumFractionDigits:3})+' kg</strong><small>Per sale unit</small>':'<span class="hf-status hf-status-review">Set weight</span><small>Needed for courier auto-calc</small>';
     const stockLabel=!tracked?'<span class="hf-status">Not tracked</span>':outOfStock?'<span class="hf-status hf-status-out-of-stock">Out of stock</span>':low?'<span class="hf-status hf-status-low-stock">'+esc(p.stock_quantity)+' left</span>':'<span class="hf-status hf-status-confirmed">'+esc(p.stock_quantity)+' in stock</span>';
     return '<tr><td><div style="display:flex;align-items:center;gap:10px">'+(p.image_url?'<img class="hf-thumb" src="'+esc(p.image_url)+'" alt="" loading="lazy">':'<span class="hf-thumb hf-thumb-empty">◇</span>')+'<span><strong>'+esc(p.name)+'</strong><small>/'+esc(p.slug)+'</small></span></div></td><td><strong>'+esc(p.sku||"SKU pending")+'</strong><small>Code 128 · <a href="./products-barcode.html?sku='+encodeURIComponent(p.sku||"")+'">Print label</a></small></td><td>'+esc(p.category||"—")+'</td><td><strong>'+esc(p.display_price||money(p.price))+'</strong><small>'+esc(p.unit_type||"piece")+'</small></td><td>'+shippingWeightCell+'</td><td><strong>'+(costKnown?money(totalUnitCost):"Cost not set")+'</strong><small>'+marginText+'</small></td><td>'+stockLabel+'<small>'+(tracked?"Alert at "+esc(threshold)+" "+esc(p.unit_type||"unit"):"Set stock quantity to enable alerts")+'</small></td><td>'+makeStatus(p.is_active?"visible":"hidden")+(p.is_featured?' <span class="hf-status hf-status-review">Featured</span>':"")+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-product="'+esc(p.id)+'">Edit</button><button class="hf-button '+(p.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-product="'+esc(p.id)+'">'+(p.is_active?"Hide":"Restore")+'</button></div></td></tr>';
    }).join(""):'<tr><td colspan="9">'+makeEmpty("No products found","Try a different search or add a product.")+'</td></tr>';
    const lowCount=products.filter(p=>p.is_active&&stockState(p)==="low").length;
    const outCount=products.filter(p=>p.is_active&&stockState(p)==="out").length;
    $("productsCount").textContent=products.length.toLocaleString("en-BD");$("productsVisibleCount").textContent=products.filter(p=>p.is_active).length.toLocaleString("en-BD");$("productsHiddenCount").textContent=products.filter(p=>!p.is_active).length.toLocaleString("en-BD");$("categoriesCount").textContent=categories.length.toLocaleString("en-BD");$("productsLowStockCount").textContent=lowCount.toLocaleString("en-BD");$("productsOutOfStockCount").textContent=outCount.toLocaleString("en-BD");
    $("categoryTableBody").innerHTML=categories.length?categories.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><small>'+esc(c.slug)+'</small></td><td>'+products.filter(p=>p.category_slug===c.slug&&p.is_active).length+'</td><td>'+makeStatus(c.is_active?"visible":"hidden")+'</td><td>'+esc(c.sort_order??0)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-category="'+esc(c.id)+'">Edit</button><button class="hf-button '+(c.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-category="'+esc(c.id)+'">'+(c.is_active?"Hide":"Restore")+'</button></div></td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No categories","Add a category before creating products.")+'</td></tr>';
   }
async function refresh(){
   const [baseProducts,categoryRows,weightRows]=await Promise.all([
    fetchProducts(),fetchCategories(),
    signedQuery(client.from("products").select("id,shipping_weight_kg").order("id",{ascending:true}).limit(2000))
   ]);
   const weightById=new Map((weightRows||[]).map(row=>[row.id,row.shipping_weight_kg]));
   products=baseProducts.map(product=>({...product,shipping_weight_kg:weightById.get(product.id)??null}));
   categories=categoryRows;fillCategories();render();
  }
  function inferShippingWeightFromUnit(value){
   const raw=String(value||"").trim().toLowerCase();
   if(raw==="kg")return "1.000";
   const match=raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gram|grams)$/);
   if(!match)return "";
   const amount=Number(match[1]),kg=match[2]==="kg"?amount:amount/1000;
   return Number.isFinite(kg)&&kg>0&&kg<=100?kg.toFixed(3):"";
  }
  $("productUnit")?.addEventListener("input",()=>{
   const field=$("productShippingWeight");if(!field||field.dataset.manual==="true")return;
   const suggested=inferShippingWeightFromUnit($("productUnit").value);
   if(suggested)field.value=suggested;
  });
  $("productShippingWeight")?.addEventListener("input",event=>{
   event.currentTarget.dataset.manual=event.currentTarget.value.trim()?"true":"";
  });
  function openProduct(p=null){
   $("productForm").reset();$("productId").value=p?.id||"";$("productName").value=p?.name||"";$("productSlug").value=p?.slug||"";$("productSlug").readOnly=!!p;$("productSlug").dataset.edited=p?"1":"";$("productCategorySelect").value=p?.category_slug||"";$("productPrice").value=p?.price??"";$("productUnit").value=p?.unit_type||"piece";$("productShippingWeight").value=p?.shipping_weight_kg??inferShippingWeightFromUnit(p?.unit_type||"");$("productShippingWeight").dataset.manual=p?.shipping_weight_kg!=null?"true":"";$("productDisplayPrice").value=p?.display_price||"";$("productImageUrl").value=p?.image_url||"";$("productShortDescription").value=p?.short_description||"";$("productFullDescription").value=p?.full_description||p?.description||"";$("productStock").value=p?.stock_quantity??"";$("productCostPrice").value=p?.cost_price??"";$("productPackagingCost").value=p?.packaging_cost??0;$("productLowStockThreshold").value=p?.low_stock_threshold??5;$("productSortOrder").value=p?.sort_order??0;$("productSeoTitle").value=p?.seo_title||"";$("productSeoDescription").value=p?.seo_description||"";$("productActive").checked=p?.is_active??true;$("productFeatured").checked=p?.is_featured??false;$("productFormError").textContent="";$("productDialogTitle").textContent=p?"Edit product":"Add a new product";
   const preview=$("productImagePreview");if(p?.image_url){preview.src=p.image_url;preview.hidden=false;}else{preview.removeAttribute("src");preview.hidden=true;}
   $("productDialog").showModal();
  }
  $("addCategoryBtn")?.addEventListener("click",()=>openCategory());
  $("addCategoryQuickBtn")?.addEventListener("click",()=>openCategory());
  $("productImageUrl")?.addEventListener("input",()=>{if($("productImageUrl").value){$("productImagePreview").src=$("productImageUrl").value;$("productImagePreview").hidden=false;}});
  $("productImageFile")?.addEventListener("change",()=>{const f=$("productImageFile").files?.[0];if(f){$("productImagePreview").src=URL.createObjectURL(f);$("productImagePreview").hidden=false;}});
  $("productName")?.addEventListener("input",()=>{if(!$("productId").value&&!$("productSlug").dataset.edited)$("productSlug").value=slugify($("productName").value);});
  $("productSlug")?.addEventListener("input",()=>{$("productSlug").dataset.edited="1";});
  $("productForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("productId").value,button=$("saveProductBtn");button.disabled=true;$("productFormError").textContent="";
   try{
    const category=categories.find(c=>c.slug===$("productCategorySelect").value);if(!category)throw new Error("Choose a valid category.");
    const name=$("productName").value.trim(),slug=$("productSlug").value.trim();if(!slug||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug))throw new Error("Use an English URL slug, for example pure-cow-ghee.");
    const price=Number($("productPrice").value);if(!Number.isFinite(price)||price<0)throw new Error("Enter a valid non-negative price.");
    let imageUrl=$("productImageUrl").value.trim();const file=$("productImageFile").files?.[0];if(file)imageUrl=await uploadImage(file,"products",slug);
    const unit=$("productUnit").value.trim()||"piece";
    const rawShippingWeight=$("productShippingWeight").value.trim();
    const shippingWeight=rawShippingWeight===""?null:Number(rawShippingWeight);
    if(shippingWeight!==null&&(!Number.isFinite(shippingWeight)||shippingWeight<=0||shippingWeight>100))throw new Error("Packed shipping weight must be greater than 0 and no more than 100 kg per sale unit.");
    const displayPriceInput=$("productDisplayPrice").value.trim();
    const displayPriceMatch=displayPriceInput.match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
    const displayPriceAmount=displayPriceMatch?Number(displayPriceMatch[0].replace(/,/g,"")):NaN;
    const displayPrice=displayPriceInput&&displayPriceAmount===price?displayPriceInput:("৳"+price.toLocaleString("en-BD")+" / "+unit);
    const payload={name,slug,category:category.name,category_slug:category.slug,price,unit_type:unit,shipping_weight_kg:shippingWeight,display_price:displayPrice,image_url:imageUrl||null,short_description:$("productShortDescription").value.trim(),full_description:$("productFullDescription").value.trim(),stock_quantity:$("productStock").value===""?null:Number($("productStock").value),is_active:$("productActive").checked,is_featured:$("productFeatured").checked,sort_order:parseInt($("productSortOrder").value||"0",10)||0,seo_title:$("productSeoTitle").value.trim()||null,seo_description:$("productSeoDescription").value.trim()||null,cms_managed:true};
     const rawCost=$("productCostPrice").value,rawPackaging=$("productPackagingCost").value,rawThreshold=$("productLowStockThreshold").value;
     const costPrice=rawCost===""?null:Number(rawCost),packagingCost=rawPackaging===""?0:Number(rawPackaging),lowStockThreshold=rawThreshold===""?5:Number(rawThreshold);
     if(costPrice!==null&&(!Number.isFinite(costPrice)||costPrice<0))throw new Error("Enter a valid non-negative purchase cost, or leave it blank.");
     if(!Number.isFinite(packagingCost)||packagingCost<0)throw new Error("Enter a valid non-negative packaging cost.");
     if(!Number.isFinite(lowStockThreshold)||lowStockThreshold<0)throw new Error("Enter a valid non-negative low-stock threshold.");
    if(!name)throw new Error("Product name is required.");
    let savedId=id;
     if(id){const {error}=await client.from("products").update(payload).eq("id",id);if(error)throw error;savedId=id;}
     else{payload.cms_created=true;const {data,error}=await client.from("products").insert(payload).select("id").single();if(error)throw error;savedId=data.id;$("productId").value=savedId;$("productSlug").readOnly=true;}
     const {error:costError}=await client.from("admin_product_costs").upsert({product_id:savedId,cost_price:costPrice,packaging_cost:packagingCost,low_stock_threshold:lowStockThreshold,updated_by:ADMIN_EMAIL,updated_at:new Date().toISOString()},{onConflict:"product_id"});
     if(costError)throw new Error("Product details were saved, but private cost and stock-alert settings were not saved. Edit this product and retry. "+costError.message);
     await audit(id?"product_updated":"product_created","product",savedId,id?"Product details and private cost settings updated":"New product and private cost settings created",{slug,cost_recorded:costPrice!==null,low_stock_threshold:lowStockThreshold});
     $("productDialog").close();toast(id?"Product updated.":"Product added.");await refresh();
   }catch(err){$("productFormError").textContent=err.message||"Product could not be saved.";}
   finally{button.disabled=false;}
  });
  function openCategory(c=null){
   $("categoryForm").reset();$("categoryId").value=c?.id||"";$("categoryName").value=c?.name||"";$("categorySlug").value=c?.slug||"";$("categorySlug").readOnly=!!c;$("categorySlug").dataset.edited=c?"1":"";$("categoryDescription").value=c?.description||"";$("categoryImageUrl").value=c?.image_url||"";$("categorySortOrder").value=c?.sort_order??0;$("categoryActive").checked=c?.is_active??true;$("categoryFormError").textContent="";$("categoryDialogTitle").textContent=c?"Edit category":"Add category";$("categoryDialog").showModal();
  }
  $("categoryName")?.addEventListener("input",()=>{if(!$("categoryId").value&&!$("categorySlug").dataset.edited)$("categorySlug").value=slugify($("categoryName").value);});
  $("categorySlug")?.addEventListener("input",()=>{$("categorySlug").dataset.edited="1";});
  $("categoryForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("categoryId").value,button=$("saveCategoryBtn");button.disabled=true;$("categoryFormError").textContent="";
   try{
    const name=$("categoryName").value.trim(),slug=$("categorySlug").value.trim();if(!name)throw new Error("Category name is required.");if(!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug))throw new Error("Use an English category slug, e.g. nuts-seeds.");
    const payload={name,slug,description:$("categoryDescription").value.trim(),image_url:$("categoryImageUrl").value.trim()||null,sort_order:parseInt($("categorySortOrder").value||"0",10)||0,is_active:$("categoryActive").checked,cms_managed:true};
    if(id){
     const old=categories.find(c=>c.id===id);
     const {error}=await client.from("categories").update(payload).eq("id",id);if(error)throw error;
     if(old&&old.name!==name){const upd=await client.from("products").update({category:name}).eq("category_slug",old.slug);if(upd.error)throw upd.error;}
     await audit("category_updated","category",id,"Category updated",{slug});
    }else{payload.cms_created=true;const {data,error}=await client.from("categories").insert(payload).select("id").single();if(error)throw error;await audit("category_created","category",data.id,"New category created",{slug});}
    $("categoryDialog").close();toast(id?"Category updated.":"Category added.");await refresh();
   }catch(err){$("categoryFormError").textContent=err.message||"Category could not be saved.";}
   finally{button.disabled=false;}
  });
  $("productTableBody")?.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit-product]"),toggle=e.target.closest("[data-toggle-product]");
   if(edit){openProduct(products.find(p=>p.id===edit.dataset.editProduct));return;}
   if(toggle){const p=products.find(x=>x.id===toggle.dataset.toggleProduct);if(!p)return;const active=!p.is_active;if(!confirm((active?"Restore":"Hide")+" "+p.name+" "+(active?"on":"from")+" the public store?"))return;try{const {error}=await client.from("products").update({is_active:active,cms_managed:true}).eq("id",p.id);if(error)throw error;await audit(active?"product_restored":"product_hidden","product",p.id,p.name+(active?" restored":" hidden"));toast(active?"Product restored.":"Product hidden.");await refresh();}catch(err){toast(err.message||"Could not change product visibility.","error");}}
  });
  $("categoryTableBody")?.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit-category]"),toggle=e.target.closest("[data-toggle-category]");
   if(edit){openCategory(categories.find(c=>c.id===edit.dataset.editCategory));return;}
   if(toggle){const c=categories.find(x=>x.id===toggle.dataset.toggleCategory);if(!c)return;const active=!c.is_active;if(!confirm((active?"Restore":"Hide")+" category "+c.name+"? Products will not be deleted."))return;try{const {error}=await client.from("categories").update({is_active:active,cms_managed:true}).eq("id",c.id);if(error)throw error;await audit(active?"category_restored":"category_hidden","category",c.id,c.name+(active?" restored":" hidden"));toast(active?"Category restored.":"Category hidden.");await refresh();}catch(err){toast(err.message||"Could not change category visibility.","error");}}
  });
  document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.closeDialog)?.close()));
  $("productSearch")?.addEventListener("input",render);$("productCategoryFilter")?.addEventListener("change",render);$("productVisibilityFilter")?.addEventListener("change",render);
  document.querySelectorAll("[data-product-stock-filter]").forEach(button=>button.addEventListener("click",()=>{stockFilter=button.dataset.productStockFilter||"all";render();$("productTableBody")?.closest(".hf-table-wrap")?.scrollIntoView({behavior:"smooth",block:"nearest"});}));
  $("globalSearch")?.addEventListener("input",render);
  await refresh();attachRefresh(refresh);
 }
 async function initContent(){
  let posts=[],siteBlocks=[];
  const siteRoot="https://faysaltalukder.github.io/halalfood/";
  function siteUrl(value){
   try{const u=new URL(String(value||""),siteRoot);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch(_){return "";}
  }
  function renderBlocks(){
   const body=$("siteContentTableBody");if(!body)return;
   const rows=siteBlocks.slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
   body.innerHTML=rows.length?rows.map(block=>{
    const placement=block.block_type==="hero_slide"?"Hero carousel":block.block_type==="side_banner"?"Side banner":"Announcement popup";
    const linkText=String(block.link_url||"");const visibleStatus=block.block_type==="hero_slide"?"Always enabled for carousel":block.is_active?"Visible":"Hidden";
    return '<tr><td><strong>'+esc(placement)+'</strong><small>'+esc(block.title||block.block_key)+'</small></td><td><div style="display:flex;align-items:center;gap:9px">'+(siteUrl(block.image_url)?'<img class="hf-thumb" src="'+esc(siteUrl(block.image_url))+'" alt="" loading="lazy">':'<span class="hf-thumb hf-thumb-empty">▧</span>')+'<span>'+esc(block.alt_text||"No alternative text")+'</span></div></td><td><span style="display:inline-block;max-width:220px;overflow-wrap:anywhere">'+esc(linkText)+'</span></td><td>'+makeStatus(visibleStatus.toLowerCase().replace(/ /g,"-"))+'</td><td>'+dateTime(block.updated_at)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-site-block="'+esc(block.id)+'">Edit</button>'+(block.block_type!=="hero_slide"?'<button class="hf-button '+(block.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-site-block="'+esc(block.id)+'">'+(block.is_active?"Hide":"Show")+'</button>':"")+'</div></td></tr>';
   }).join(""):'<tr><td colspan="6">'+makeEmpty("No homepage content blocks","Refresh after the content table has been configured.")+'</td></tr>';
   $("siteContentTotalCount").textContent=siteBlocks.length.toLocaleString("en-BD");
   $("siteContentActiveCount").textContent=siteBlocks.filter(b=>b.block_type==="hero_slide"||b.is_active).length.toLocaleString("en-BD");
   $("siteContentUpdated").textContent="Homepage content settings checked at "+dateTime(new Date().toISOString())+". The public page uses these settings when available and falls back to static images if the database is unreachable.";
  }
  function renderPosts(){
   const search=String($("postSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),status=$("postStatusFilter")?.value||"";
   const rows=posts.filter(p=>(!status||p.status===status)&&(!search||[p.title,p.slug,p.category,p.excerpt].join(" ").toLowerCase().includes(search)));
   $("postsTableBody").innerHTML=rows.length?rows.map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><small>/blog/post.html?slug='+esc(p.slug)+'</small></td><td>'+esc(p.category||"Guides")+'</td><td>'+makeStatus(p.status)+'</td><td>'+dateOnly(p.updated_at||p.created_at)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-post="'+esc(p.id)+'">Edit</button><button class="hf-button '+(p.status==="published"?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-post="'+esc(p.id)+'">'+(p.status==="published"?"Unpublish":p.status==="archived"?"Restore":"Publish")+'</button></div></td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No content found","Create a blog post or adjust your search.")+'</td></tr>';
   $("postsCount").textContent=posts.length.toLocaleString("en-BD");$("publishedPostsCount").textContent=posts.filter(p=>p.status==="published").length.toLocaleString("en-BD");$("draftPostsCount").textContent=posts.filter(p=>p.status==="draft").length.toLocaleString("en-BD");
  }
  function render(){renderBlocks();renderPosts();}
  async function refresh(){
   const results=await Promise.all([
    fetchPosts(),
    signedQuery(client.from("site_content_blocks").select("id,block_key,block_type,title,image_url,link_url,alt_text,is_active,sort_order,updated_by,created_at,updated_at").order("sort_order",{ascending:true}).order("block_key",{ascending:true}))
   ]);
   posts=results[0];siteBlocks=results[1];render();
  }
  function openSiteBlock(block){
   if(!block)return;
   $("siteBlockForm").reset();$("siteBlockId").value=block.id;$("siteBlockKey").value=block.block_key;$("siteBlockType").value=block.block_type;
   $("siteBlockTitle").value=block.title||"";$("siteBlockImageUrl").value=block.image_url||"";$("siteBlockLinkUrl").value=block.link_url||"";$("siteBlockAltText").value=block.alt_text||"";$("siteBlockSortOrder").value=block.sort_order??0;
   $("siteBlockActive").checked=block.is_active;$("siteBlockActive").disabled=block.block_type==="hero_slide";
   $("siteBlockActiveHelp").textContent=block.block_type==="hero_slide"?"Hero slides stay enabled so the carousel keeps working correctly. You can still edit the image, destination and accessibility text.":"Turn this banner or popup on or off on the public homepage.";
   $("siteBlockFormError").textContent="";$("siteBlockDialogTitle").textContent="Edit "+(block.block_type==="hero_slide"?"hero slide":block.block_type==="side_banner"?"side banner":"announcement popup");
   const preview=$("siteBlockImagePreview"),src=siteUrl(block.image_url);
   if(src){preview.src=src;preview.hidden=false;}else{preview.removeAttribute("src");preview.hidden=true;}
   $("siteBlockDialog").showModal();
  }
  $("siteContentTableBody")?.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit-site-block]"),toggle=e.target.closest("[data-toggle-site-block]");
   if(edit){openSiteBlock(siteBlocks.find(x=>x.id===edit.dataset.editSiteBlock));return;}
   if(toggle){
    const block=siteBlocks.find(x=>x.id===toggle.dataset.toggleSiteBlock);if(!block)return;
    const active=!block.is_active;
    if(!confirm((active?"Show":"Hide")+" "+(block.title||block.block_key)+" on the public homepage?"))return;
    toggle.disabled=true;
    try{
     const {error}=await client.from("site_content_blocks").update({is_active:active,updated_by:H.ADMIN_EMAIL}).eq("id",block.id);if(error)throw error;
     await audit(active?"site_content_activated":"site_content_hidden","site_content_block",block.id,(block.title||block.block_key)+(active?" activated":" hidden"));
     toast(active?"Homepage content enabled.":"Homepage content hidden.");await refresh();
    }catch(err){toast(err.message||"Homepage content status could not be updated.","error");}
    finally{toggle.disabled=false;}
   }
  });
  $("siteBlockImageUrl")?.addEventListener("input",()=>{
   const src=siteUrl($("siteBlockImageUrl").value),preview=$("siteBlockImagePreview");
   if(src){preview.src=src;preview.hidden=false;}else{preview.removeAttribute("src");preview.hidden=true;}
  });
  $("siteBlockImageFile")?.addEventListener("change",()=>{
   const file=$("siteBlockImageFile").files?.[0];if(file){const preview=$("siteBlockImagePreview");preview.src=URL.createObjectURL(file);preview.hidden=false;}
  });
  $("siteBlockForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const button=$("saveSiteBlockBtn"),id=$("siteBlockId").value,block=siteBlocks.find(x=>x.id===id);
   if(!block)return;
   button.disabled=true;$("siteBlockFormError").textContent="";
   try{
    const title=$("siteBlockTitle").value.trim(),key=block.block_key;
    let imageUrl=$("siteBlockImageUrl").value.trim(),linkUrl=$("siteBlockLinkUrl").value.trim();
    const file=$("siteBlockImageFile").files?.[0];
    if(file)imageUrl=await uploadImage(file,"site-content",slugify(key));
    if(!title)throw new Error("Enter a clear internal name.");
    if(!imageUrl)throw new Error("An image URL or uploaded image is required.");
    if(!siteUrl(imageUrl))throw new Error("Use a valid HTTP/HTTPS image URL or a relative path inside the Halal Food website.");
    if(!linkUrl||!siteUrl(linkUrl))throw new Error("Use a valid HTTP/HTTPS destination URL or a relative page link.");
    const payload={title,image_url:imageUrl,link_url:linkUrl,alt_text:$("siteBlockAltText").value.trim(),sort_order:Math.max(0,parseInt($("siteBlockSortOrder").value||"0",10)||0),is_active:block.block_type==="hero_slide"?true:$("siteBlockActive").checked,updated_by:H.ADMIN_EMAIL};
    const {error}=await client.from("site_content_blocks").update(payload).eq("id",id);if(error)throw error;
    await audit("site_content_updated","site_content_block",id,"Homepage banner/popup settings updated",{block_key:key,is_active:payload.is_active});
    $("siteBlockDialog").close();toast("Homepage content saved. Reload the public homepage to see the change.");await refresh();
   }catch(err){$("siteBlockFormError").textContent=err.message||"Homepage content could not be saved. Check your permissions and image URL.";}
   finally{button.disabled=false;}
  });
  function openPost(p=null){
   $("postForm").reset();$("postId").value=p?.id||"";$("postTitle").value=p?.title||"";$("postSlug").value=p?.slug||"";$("postSlug").readOnly=!!p;$("postSlug").dataset.edited=p?"1":"";$("postCategory").value=p?.category||"Guides";$("postStatus").value=p?.status||"draft";$("postExcerpt").value=p?.excerpt||"";$("postContent").value=p?.content||"";$("postImageUrl").value=p?.featured_image_url||"";$("postSeoTitle").value=p?.seo_title||"";$("postSeoDescription").value=p?.seo_description||"";$("postFormError").textContent="";$("postDialogTitle").textContent=p?"Edit blog post":"Create blog post";$("postDialog").showModal();
  }
  $("addPostBtn")?.addEventListener("click",()=>openPost());
  $("postTitle")?.addEventListener("input",()=>{if(!$("postId").value&&!$("postSlug").dataset.edited)$("postSlug").value=slugify($("postTitle").value);});
  $("postSlug")?.addEventListener("input",()=>{$("postSlug").dataset.edited="1";});
  $("postForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("postId").value,button=$("savePostBtn");button.disabled=true;$("postFormError").textContent="";
   try{
    const title=$("postTitle").value.trim(),slug=$("postSlug").value.trim(),content=$("postContent").value.trim(),status=$("postStatus").value;
    if(!title||!content)throw new Error("Post title and article content are required.");
    if(!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug))throw new Error("Use an English URL slug, e.g. pure-cow-ghee-guide.");
    const old=posts.find(p=>p.id===id);
    const payload={title,slug,category:$("postCategory").value.trim()||"Guides",status,excerpt:$("postExcerpt").value.trim(),content,featured_image_url:$("postImageUrl").value.trim()||null,seo_title:$("postSeoTitle").value.trim()||null,seo_description:$("postSeoDescription").value.trim()||null,published_at:status==="published"?(old?.published_at||new Date().toISOString()):null,cms_managed:true};
    if(id){const {error}=await client.from("blog_posts").update(payload).eq("id",id);if(error)throw error;await audit("blog_post_updated","blog_post",id,"Blog post updated",{slug,status});}
    else{payload.cms_created=true;const {data,error}=await client.from("blog_posts").insert(payload).select("id").single();if(error)throw error;await audit("blog_post_created","blog_post",data.id,"Blog post created",{slug,status});}
    $("postDialog").close();toast(status==="published"?"Post published.":"Post saved.");await refresh();
   }catch(err){$("postFormError").textContent=err.message||"Post could not be saved.";}
   finally{button.disabled=false;}
  });
  $("postsTableBody")?.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit-post]"),toggle=e.target.closest("[data-toggle-post]");
   if(edit){openPost(posts.find(p=>p.id===edit.dataset.editPost));return;}
   if(toggle){const p=posts.find(x=>x.id===toggle.dataset.togglePost);if(!p)return;const status=p.status==="published"?"draft":"published";if(!confirm((status==="published"?"Publish":"Unpublish")+" “"+p.title+"”?"))return;try{const {error}=await client.from("blog_posts").update({status,published_at:status==="published"?(p.published_at||new Date().toISOString()):null,cms_managed:true}).eq("id",p.id);if(error)throw error;await audit("blog_status_changed","blog_post",p.id,"Blog post status changed",{status});toast(status==="published"?"Post published.":"Post moved to draft.");await refresh();}catch(err){toast(err.message||"Could not update post.","error");}}
  });
  document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.closeDialog)?.close()));
  $("postSearch")?.addEventListener("input",renderPosts);$("postStatusFilter")?.addEventListener("change",renderPosts);
  $("globalSearch")?.addEventListener("input",()=>{renderPosts();renderBlocks();});
  await refresh();attachRefresh(refresh);
 } async function initCustomers(){
  let profiles=[],orders=[],customers=[];
  function normalizePhone(value){
   let digits=String(value||"").replace(/\D/g,"");
   if(digits.startsWith("00"))digits=digits.slice(2);
   if(digits.length===11&&digits.startsWith("01"))digits="88"+digits;
   else if(digits.length===10&&digits.startsWith("1"))digits="880"+digits;
   return digits;
  }
  function buildDirectory(){
   const groups=new Map(),profileGroups=new Map(),profilesByPhone=new Map();
   profiles.forEach(p=>{
    const key="profile:"+p.user_id,phoneKey=normalizePhone(p.phone);
    const group={key,user_id:p.user_id,full_name:p.full_name||"Name not provided",phone:p.phone||"",isProfile:true,created_at:p.created_at,orders:[]};
    groups.set(key,group);profileGroups.set(p.user_id,group);
    if(phoneKey){const matches=profilesByPhone.get(phoneKey)||[];matches.push(p);profilesByPhone.set(phoneKey,matches);}
   });
   orders.forEach(o=>{
    const phoneKey=normalizePhone(o.customer_phone);
    let group=o.customer_id?profileGroups.get(o.customer_id):null;
    if(!group&&phoneKey&&!o.customer_id){
     const matches=profilesByPhone.get(phoneKey)||[];
     if(matches.length===1)group=profileGroups.get(matches[0].user_id)||null;
    }
    if(!group){
     const key=o.customer_id?"user:"+o.customer_id:phoneKey?"phone:"+phoneKey:"order:"+o.id;
     group=groups.get(key);
     if(!group){
      group={key,user_id:o.customer_id||null,full_name:o.customer_name||"Name not provided",phone:o.customer_phone||"",isProfile:false,created_at:null,orders:[]};
      groups.set(key,group);
     }
     if((!group.full_name||group.full_name==="Name not provided")&&o.customer_name)group.full_name=o.customer_name;
     if(!group.phone&&o.customer_phone)group.phone=o.customer_phone;
    }
    group.orders.push(o);
   });
   return Array.from(groups.values()).map(g=>{
    const sorted=[...g.orders].sort((a,b)=>new Date(b.ordered_at||0)-new Date(a.ordered_at||0));
    const active=sorted.filter(o=>o.status!=="cancelled");
    return {...g,orders:sorted,latestOrder:sorted[0]||null,orderCount:sorted.length,activeOrderCount:active.length,lifetimeValue:active.reduce((sum,o)=>sum+Number(o.total||0),0),isRepeat:active.length>=2};
   }).sort((a,b)=>new Date(b.latestOrder?.ordered_at||b.created_at||0)-new Date(a.latestOrder?.ordered_at||a.created_at||0));
  }
  function render(){
   customers=buildDirectory();
   const search=String($("customerSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim();
   const rows=customers.filter(c=>!search||[c.full_name,c.phone,c.user_id,c.key,...c.orders.map(o=>o.order_number||"")].join(" ").toLowerCase().includes(search));
   $("customersTableBody").innerHTML=rows.length?rows.map(c=>'<tr><td><strong>'+esc(c.full_name||"Name not provided")+'</strong><small>'+(c.isProfile?"Registered profile":"Order-only record")+(c.isRepeat?" · Repeat buyer":"")+'</small></td><td>'+esc(c.phone||"Not provided")+'</td><td>'+c.orderCount+'<small>'+c.activeOrderCount+' non-cancelled</small></td><td><strong>'+money(c.lifetimeValue)+'</strong><small>Recorded order value only</small></td><td>'+(c.latestOrder?dateOnly(c.latestOrder.ordered_at):"No orders")+'</td><td><button class="hf-button hf-button-secondary hf-button-small" data-customer-key="'+esc(c.key)+'">Order history</button></td></tr>').join(""):'<tr><td colspan="6">'+makeEmpty("No matching customer records","Try another name, phone number or order number.")+'</td></tr>';
   $("customerCount").textContent=customers.length.toLocaleString("en-BD");
   $("customerRepeatCount").textContent=customers.filter(c=>c.isRepeat).length.toLocaleString("en-BD");
   $("customerProfilesCount").textContent=profiles.length.toLocaleString("en-BD");
   $("customerOrdersCount").textContent=orders.length.toLocaleString("en-BD");
  }
  async function refresh(){
   const res=await Promise.all([
    signedQuery(client.from("customer_profiles").select("user_id,full_name,phone,created_at,updated_at").order("created_at",{ascending:false}).limit(1000)),
    fetchOrders(null,5000)
   ]);
   profiles=res[0];orders=res[1];render();
  }
  $("customerSearch")?.addEventListener("input",render);$("globalSearch")?.addEventListener("input",render);
  $("customersTableBody")?.addEventListener("click",e=>{
   const btn=e.target.closest("[data-customer-key]");if(!btn)return;
   const c=customers.find(x=>x.key===btn.dataset.customerKey);if(!c)return;
   const own=[...c.orders].sort((a,b)=>new Date(b.ordered_at||0)-new Date(a.ordered_at||0));
   $("customerDetailTitle").textContent=c.full_name||"Customer";
   const orderRows=own.length?own.map(o=>{
    const itemSummary=(o.order_items||[]).map(i=>(i.product_name||"Product")+" × "+String(i.quantity??"")+" "+String(i.unit||"")).join(", ");
    return '<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(itemSummary||"No item details recorded")+'</small></td><td>'+dateOnly(o.ordered_at)+'</td><td>'+money(o.total)+'</td><td>'+makeStatus(o.status)+'</td></tr>';
   }).join(""):'<tr><td colspan="4">No linked orders found.</td></tr>';
   $("customerDetailContent").innerHTML='<p><strong>Record type:</strong> '+(c.isProfile?"Registered profile":"Order-only customer record")+'</p><p><strong>Phone:</strong> '+esc(c.phone||"Not provided")+'</p>'+(c.isProfile?'<p><strong>Registered:</strong> '+dateTime(c.created_at)+'</p>':'')+'<p><strong>Orders in loaded history:</strong> '+c.orderCount+' · <strong>Non-cancelled:</strong> '+c.activeOrderCount+'</p><p><strong>Recorded lifetime order value:</strong> '+money(c.lifetimeValue)+'</p><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Order / items</th><th>Date</th><th>Recorded total</th><th>Status</th></tr></thead><tbody>'+orderRows+'</tbody></table></div><p class="hf-data-note">Records are grouped by matching profile ID or exact normalized phone number; a name alone is never treated as a match. Cancelled orders are excluded from the recorded lifetime value. These values are not proof of payment or actual collected revenue. The directory uses up to the latest 5,000 order records and 1,000 registered profiles.</p>';
   $("customerDialog").showModal();
  });
  $("closeCustomerDialog")?.addEventListener("click",()=>$("customerDialog").close());
  $("closeCustomerDialogBottom")?.addEventListener("click",()=>$("customerDialog").close());
  await refresh();attachRefresh(refresh);
 }
 async function initFinance(){
  let entries=[],orders=[];
  function linkedIncomeTotal(orderId){
   return entries.filter(e=>e.related_order_id===orderId&&e.entry_type==="income"&&e.status==="confirmed").reduce((sum,e)=>sum+Number(e.amount||0),0);
  }
  function renderReconciliation(){
   const body=$("orderReconciliationTableBody");if(!body)return;
   body.innerHTML=orders.length?orders.map(o=>{
    const linked=linkedIncomeTotal(o.id),cancelled=o.status==="cancelled",difference=Number(o.total||0)-linked,method=String(o.payment_method||"").toLowerCase()==="cash_on_delivery"?"Cash on Delivery (COD)":String(o.payment_method||"not recorded").replace(/[_-]+/g," ");
    return '<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(o.customer_name||"Customer not named")+' · '+esc(o.customer_phone||"No phone")+'</small></td><td>'+dateOnly(o.ordered_at)+'</td><td>'+esc(method)+'</td><td>'+makeStatus(o.status)+'</td><td><strong>'+money(o.total)+'</strong><small>Recorded order value</small></td><td>'+money(linked)+'<small>Confirmed linked income only</small></td><td>'+(cancelled?"Not compared":money(difference))+'</td><td>'+(cancelled?'<span class="hf-status hf-status-cancelled">Cancelled — no income</span>':'<button class="hf-button hf-button-secondary hf-button-small" data-record-income="'+esc(o.id)+'">Record income</button>')+'</td></tr>';
   }).join(""):'<tr><td colspan="8">'+makeEmpty("No order records available","Orders will appear here when they are loaded.")+'</td></tr>';
   $("financeReconcileNote").textContent="Showing "+orders.length.toLocaleString("en-BD")+" recent order records (up to the latest 1,000). The selected payment method is not proof of payment. Confirmed income is a manually verified ledger entry linked to the order; no payment gateway is connected. The difference is for review only—not profit, debt, or an amount due.";
  }
  function totals(){
   const active=entries.filter(e=>e.status==="confirmed"),income=active.filter(e=>e.entry_type==="income").reduce((s,e)=>s+Number(e.amount||0),0),expense=active.filter(e=>e.entry_type==="expense").reduce((s,e)=>s+Number(e.amount||0),0);
   $("financeIncomeTotal").textContent=money(income);$("financeExpenseTotal").textContent=money(expense);$("financeNetTotal").textContent=money(income-expense);$("financePendingCount").textContent=entries.filter(e=>e.status==="draft").length.toLocaleString("en-BD");
   const cats=groupBy(active.filter(e=>e.entry_type==="expense"),e=>e.category);
   drawChart("financeExpenseChart",{type:"doughnut",data:{labels:cats.map(x=>x.label),datasets:[{data:cats.map(x=>entries.filter(e=>e.status==="confirmed"&&e.entry_type==="expense"&&e.category===x.label).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:colorSet,borderColor:chartTheme().surface,borderWidth:3,hoverOffset:6}]},options:{cutout:"62%",plugins:{legend:{position:"bottom"}}}});
   const monthKeys=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);monthKeys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
   drawChart("financeTrendChart",{type:"bar",data:{labels:monthKeys.map(k=>{const [y,m]=k.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleDateString("en-BD",{month:"short",year:"2-digit"});}),datasets:[
    {label:"Confirmed income records",data:monthKeys.map(k=>active.filter(e=>e.entry_type==="income"&&String(e.entry_date).startsWith(k)).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:palette.green,borderRadius:6},
    {label:"Confirmed expense records",data:monthKeys.map(k=>active.filter(e=>e.entry_type==="expense"&&String(e.entry_date).startsWith(k)).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:palette.orange,borderRadius:6}
   ]},options:{scales:{x:{ticks:{color:chartTheme().muted},grid:{display:false}},y:{beginAtZero:true,ticks:{color:chartTheme().muted,callback:v=>"৳"+Number(v).toLocaleString("en-BD")},grid:{color:chartTheme().grid}}},plugins:{legend:{position:"bottom"}}}});
  }
  function render(){
   const search=String($("financeSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),type=$("financeTypeFilter")?.value||"",status=$("financeStatusFilter")?.value||"";
   const rows=entries.filter(e=>(!type||e.entry_type===type)&&(!status||e.status===status)&&(!search||[e.category,e.description,e.reference,e.status].join(" ").toLowerCase().includes(search)));
   $("financeTableBody").innerHTML=rows.length?rows.map(e=>'<tr><td>'+dateOnly(e.entry_date)+'</td><td>'+makeStatus(e.entry_type)+'</td><td><strong>'+esc(e.category)+'</strong><small>'+esc(e.description||"No description")+'</small></td><td><strong>'+money(e.amount)+'</strong></td><td>'+makeStatus(e.status)+'</td><td>'+esc(e.reference||"—")+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-finance="'+esc(e.id)+'">Edit</button>'+(e.status!=="void"?'<button class="hf-button hf-button-danger hf-button-small" data-void-finance="'+esc(e.id)+'">Void</button>':'')+'</div></td></tr>').join(""):'<tr><td colspan="7">'+makeEmpty("No matching entries","Add an income or expense record, or change your filters.")+'</td></tr>';
   totals();renderReconciliation();
  }
  async function refresh(){
   [entries,orders]=await Promise.all([fetchFinance(null,3000),signedQuery(client.from("orders").select("id,order_number,customer_name,customer_phone,total,status,ordered_at,payment_method").order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(1000))]);
   const sel=$("financeOrderId");if(sel)sel.innerHTML='<option value="">No linked order</option>'+orders.slice(0,300).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.order_number||String(o.id).slice(0,8))+' · '+money(o.total)+'</option>').join("");
   render();
  }
  function openEntry(e=null,order=null){
   $("financeForm").reset();$("financeId").value=e?.id||"";
   $("financeEntryType").value=order?"income":e?.entry_type||"expense";
   $("financeCategory").value=order?"Verified income":e?.category||"Supplies";
   $("financeAmount").value=e?.amount??"";
   $("financeDate").value=e?.entry_date||todayISO();
   $("financeDescription").value=e?.description||(order?"Manually verify any actual payment before confirming this entry.":"");
   $("financeReference").value=e?.reference||(order?(order.order_number||String(order.id).slice(0,8)):"");
   $("financeStatus").value=e?.status||"draft";$("financeOrderId").value=order?.id||e?.related_order_id||"";
   $("financeFormError").textContent="";$("financeDialogTitle").textContent=e?"Edit finance entry":order?"Record income linked to order":"Record an entry";$("financeDialog").showModal();
  }
  $("addFinanceEntryBtn")?.addEventListener("click",()=>openEntry());
  $("financeForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("financeId").value,button=$("saveFinanceBtn");button.disabled=true;$("financeFormError").textContent="";
   try{
    const amount=Number($("financeAmount").value),category=$("financeCategory").value.trim(),date=$("financeDate").value;
    if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter an amount greater than zero.");
    if(!category)throw new Error("Choose a category.");if(!date)throw new Error("Choose an entry date.");
    const payload={entry_type:$("financeEntryType").value,category,amount,entry_date:date,description:$("financeDescription").value.trim(),reference:$("financeReference").value.trim()||null,status:$("financeStatus").value,related_order_id:$("financeOrderId").value||null};
    if(payload.entry_type==="income"&&payload.status==="confirmed"&&payload.related_order_id){
     const {data:linkedOrder,error:linkedOrderError}=await client.from("orders").select("id,status").eq("id",payload.related_order_id).maybeSingle();
     if(linkedOrderError||!linkedOrder)throw new Error("Could not verify the linked order. Refresh and retry before confirming income.");
     if(linkedOrder.status==="cancelled")throw new Error("A cancelled order cannot be confirmed as income. Record any real receipt as a separate, documented adjustment instead.");
    }
    if(!id)payload.created_by=H.ADMIN_EMAIL;
    if(id){const {error}=await client.from("admin_finance_entries").update(payload).eq("id",id);if(error)throw error;await audit("finance_entry_updated","finance_entry",id,"Finance entry updated",{entry_type:payload.entry_type,status:payload.status});}
    else{const {data,error}=await client.from("admin_finance_entries").insert(payload).select("id").single();if(error)throw error;await audit("finance_entry_created","finance_entry",data.id,"Finance entry added",{entry_type:payload.entry_type,status:payload.status});}
    $("financeDialog").close();toast("Finance entry saved.");await refresh();
   }catch(err){$("financeFormError").textContent=err.message||"Entry could not be saved. Check admin permissions.";}
   finally{button.disabled=false;}
  });
  $("financeTableBody")?.addEventListener("click",async e=>{
   const edit=e.target.closest("[data-edit-finance]"),voidBtn=e.target.closest("[data-void-finance]");
   if(edit){openEntry(entries.find(x=>x.id===edit.dataset.editFinance));return;}
   if(voidBtn){const item=entries.find(x=>x.id===voidBtn.dataset.voidFinance);if(!item)return;if(!confirm("Mark this finance entry as void? It will remain in the history but no longer count in totals."))return;try{const {error}=await client.from("admin_finance_entries").update({status:"void"}).eq("id",item.id);if(error)throw error;await audit("finance_entry_voided","finance_entry",item.id,"Finance entry marked void",{entry_type:item.entry_type});toast("Entry marked as void.");await refresh();}catch(err){toast(err.message||"Entry could not be updated.","error");}}
  });
  $("orderReconciliationTableBody")?.addEventListener("click",e=>{
   const btn=e.target.closest("[data-record-income]");if(!btn)return;
   const order=orders.find(o=>o.id===btn.dataset.recordIncome);if(!order)return;if(order.status==="cancelled"){toast("Cancelled orders cannot be recorded as income. If money was actually received, reconcile it separately with a documented adjustment.","error");return;}openEntry(null,order);
  });
  document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.closeDialog)?.close()));
  $("financeSearch")?.addEventListener("input",render);$("financeTypeFilter")?.addEventListener("change",render);$("financeStatusFilter")?.addEventListener("change",render);$("globalSearch")?.addEventListener("input",render);
  await refresh();attachRefresh(refresh);
 }
 async function initReports(){
  let report={title:"",columns:[],rows:[],notes:"",rangeLabel:""};
  async function buildReport(){
   const range=selectedRange(),type=$("reportType").value;let rows=[],title="",notes="";
   if(type==="orders"){
    const orders=await fetchOrders(range,5000);
    rows=orders.map(o=>({order_number:o.order_number||String(o.id).slice(0,8),ordered_at:o.ordered_at,customer_name:$("includePersonalData").checked?o.customer_name:"",customer_phone:$("includePersonalData").checked?o.customer_phone:"",customer_email:$("includePersonalData").checked?o.customer_email:"",status:o.status,subtotal:Number(o.subtotal||0),delivery_charge:Number(o.delivery_charge||0),total:Number(o.total||0),payment_method:o.payment_method,items:(o.order_items||[]).map(i=>i.product_name+" x "+i.quantity+" "+(i.unit||"")).join("; ")}));
    if(!$("includePersonalData").checked)rows=rows.map(({customer_name,customer_phone,customer_email,...rest})=>rest);
    title="Orders Report";notes="Recorded order values are not proof of payment collection. Cancelled orders remain listed with their status.";
   }else if(type==="analytics"){
    const events=await fetchEvents(range,15000);
    rows=events.map(e=>({occurred_at:e.occurred_at,event_name:e.event_name,page_path:e.page_path,page_title:e.page_title,session_id:e.session_id,item_id:e.item_id,item_name:e.item_name,item_category:e.item_category,value:e.event_name==="page_engagement"?null:e.value,visible_seconds:e.event_name==="page_engagement"?Number(e.value||0):null,quantity:e.quantity}));
    title="Website Analytics Report";notes="Website events measure recorded interaction. They do not by themselves establish unique people, paid sales, or collected revenue.";
   }else if(type==="products"){
    const products=await fetchProducts();
    rows=products.map(p=>({name:p.name,slug:p.slug,category:p.category,price:Number(p.price||0),display_price:p.display_price,unit_type:p.unit_type,stock_quantity:p.stock_quantity,is_active:p.is_active?"visible":"hidden",is_featured:p.is_featured?"yes":"no",updated_at:p.updated_at||p.created_at}));
    title="Products & Inventory Snapshot";notes="This is the current catalog state; the selected time range does not apply to inventory.";
   }else if(type==="content"){
    const blocks=await signedQuery(client.from("site_content_blocks").select("block_key,block_type,title,image_url,link_url,alt_text,is_active,sort_order,updated_by,updated_at").order("sort_order",{ascending:true}));
    rows=blocks.map(b=>({placement:b.block_type,key:b.block_key,title:b.title,image_url:b.image_url,destination_url:b.link_url,alt_text:b.alt_text,active:b.is_active?"yes":"no",sort_order:b.sort_order,updated_by:b.updated_by,updated_at:b.updated_at}));
    title="Homepage Content Settings";notes="This report contains the banner and promotion configuration used by the public homepage. Hero slides remain enabled to preserve carousel behavior; side banner and popup active flags can be changed from Website Content.";
   }else{
    const entries=await fetchFinance(range);
    rows=entries.map(e=>({entry_date:e.entry_date,entry_type:e.entry_type,category:e.category,amount:Number(e.amount||0),status:e.status,description:e.description,reference:e.reference,related_order_id:e.related_order_id||""}));
    title="Finance Entries Report";notes="Only Confirmed entries contribute to recorded income/expense totals. Entries are manual records and are not independently verified by a payment provider.";
   }
   const displayRange=(type==="products"||type==="content")?"Current snapshot":range.label;
   report={title,columns:rows.length?Object.keys(rows[0]):(type==="orders"?["order_number","ordered_at","status","subtotal","delivery_charge","total"]:type==="analytics"?["occurred_at","event_name","page_path","item_name"]:type==="products"?["name","slug","category","price","stock_quantity","is_active"]:type==="content"?["placement","key","title","image_url","destination_url","active"]:["entry_date","entry_type","category","amount","status"]),rows,notes,rangeLabel:displayRange,type};
   $("reportTitle").textContent=title;$("reportRangeLabel").textContent=displayRange;$("reportRowsCount").textContent=rows.length.toLocaleString("en-BD");$("reportNote").textContent=notes;
   $("reportSummary").innerHTML='<div class="hf-summary-pill"><small>Records in report</small><strong>'+rows.length.toLocaleString("en-BD")+'</strong></div><div class="hf-summary-pill"><small>Report type</small><strong style="font-size:14px">'+esc(title)+'</strong></div><div class="hf-summary-pill"><small>Time filter</small><strong style="font-size:13px">'+esc(displayRange)+'</strong></div>';
   const sample=rows.slice(0,200);
   $("reportTableHead").innerHTML="<tr>"+report.columns.map(c=>"<th>"+esc(c.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportTableBody").innerHTML=sample.length?sample.map(row=>"<tr>"+report.columns.map(c=>"<td>"+esc(row[c]??"")+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'">'+makeEmpty("No report records","Try a longer time range or another report type.")+'</td></tr>';
   $("reportSampleNote").textContent=rows.length>sample.length?"Preview displays the first "+sample.length+" rows. Downloads include all "+rows.length+" rows.":"Preview contains all rows in this report.";
   $("reportCreatedAt").textContent="Generated "+dateTime(new Date().toISOString());
   return report;
  }
  $("buildReportBtn")?.addEventListener("click",async()=>{const b=$("buildReportBtn");b.disabled=true;try{await buildReport();toast("Report is ready.");}catch(err){toast(err.message||"Report could not be loaded.","error");}finally{b.disabled=false;}});
  $("downloadCsvBtn")?.addEventListener("click",async()=>{try{if(!report.rows.length)await buildReport();downloadFile(fileBase(report.title)+"-"+todayISO()+".csv",csvText(report.rows),"text/csv;charset=utf-8");await audit("report_downloaded","report",null,report.title+" CSV downloaded",{rows:report.rows.length,type:report.type});toast("CSV download started.");}catch(err){toast(err.message||"CSV export failed.","error");}});
  $("downloadXlsxBtn")?.addEventListener("click",async()=>{
   try{
    if(!report.rows.length)await buildReport();
    if(!window.XLSX)throw new Error("Excel export library did not load. Use CSV export instead.");
    const ws=window.XLSX.utils.json_to_sheet(report.rows);const wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,report.title.slice(0,31));window.XLSX.writeFile(wb,fileBase(report.title)+"-"+todayISO()+".xlsx");
    await audit("report_downloaded","report",null,report.title+" XLSX downloaded",{rows:report.rows.length,type:report.type});toast("Excel file is being downloaded.");
   }catch(err){toast(err.message||"Excel export failed.","error");}
  });
  $("downloadPdfBtn")?.addEventListener("click",async()=>{try{if(!report.rows.length)await buildReport();$("printReportTitle").textContent=report.title;$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records · "+new Date().toLocaleString("en-BD");await audit("report_printed","report",null,report.title+" opened for PDF/printing",{rows:report.rows.length,type:report.type});window.print();}catch(err){toast(err.message||"Could not prepare print report.","error");}});
  $("includePersonalData")?.addEventListener("change",()=>{if($("reportType")?.value==="orders")buildReport().catch(err=>toast(err.message||"Could not refresh the report preview.","error"));});
  bindRangeControls(()=>buildReport());await buildReport();attachRefresh(buildReport);
 }
 async function initSettings(){
  async function healthCheck(){
   const targets=[["Products","products"],["Categories","categories"],["Orders","orders"],["Order items","order_items"],["Courier bookings","admin_shipments"],["Tracking events","analytics_events"],["Homepage content","site_content_blocks"],["Finance entries","admin_finance_entries"],["Activity log","admin_activity_log"],["Messaging conversations","messaging_conversations"],["Messaging messages","messaging_messages"]];
   $("connectionStatus").textContent="Checking database access…";
   const result=await Promise.all(targets.map(async item=>{try{const r=await client.from(item[1]).select("id",{count:"exact",head:true});return {name:item[0],table:item[1],count:r.count,error:r.error?.message||null};}catch(err){return {name:item[0],table:item[1],error:err.message||"Connection error"};}}));
   $("systemHealthBody").innerHTML=result.map(r=>'<tr><td><strong>'+esc(r.name)+'</strong><small>'+esc(r.table)+'</small></td><td>'+(r.error?'<span class="hf-status hf-status-cancelled">Needs attention</span>':'<span class="hf-status hf-status-confirmed">Connected</span>')+'</td><td>'+(r.error?esc(r.error):Number(r.count||0).toLocaleString("en-BD")+" records")+'</td></tr>').join("");
   const fails=result.filter(x=>x.error);$("connectionStatus").textContent=fails.length?fails.length+" check(s) need attention":"All checked data connections are responding.";
   $("connectionStatus").className="hf-banner "+(fails.length?"":"hf-banner-success");
   return result;
  }
  async function loadActivity(){
   try{
    const rows=await signedQuery(client.from("admin_activity_log").select("id,actor_email,action,entity_type,entity_id,summary,created_at").order("created_at",{ascending:false}).limit(60));
    $("activityLogBody").innerHTML=rows.length?rows.map(r=>'<tr><td>'+dateTime(r.created_at)+'</td><td><strong>'+esc(r.action.replace(/_/g," "))+'</strong><small>'+esc(r.actor_email)+'</small></td><td>'+esc(r.entity_type)+(r.entity_id?'<small>'+esc(String(r.entity_id).slice(0,14))+'</small>':"")+'</td><td>'+esc(r.summary||"—")+'</td></tr>').join(""):'<tr><td colspan="4">'+makeEmpty("No activity has been recorded yet","Successful changes made from the new admin pages will be logged here.")+'</td></tr>';
   }catch(err){
    $("activityLogBody").innerHTML='<tr><td colspan="4">'+makeEmpty("Activity log unavailable",err?.message||"Check the activity-log table permissions and try again.")+'</td></tr>';
   }
  }
  async function refresh(){await Promise.all([healthCheck(),loadActivity()]);}
  $("healthRefreshBtn")?.addEventListener("click",async()=>{try{await refresh();toast("System checks complete.");}catch(err){toast(err.message||"System check failed.","error");}});
  const compactKey="hf_admin_compact_ui";const saved=localStorage.getItem(compactKey)==="true";$("compactModeToggle").checked=saved;document.getElementById("adminApp").classList.toggle("compact-ui",saved);
  $("compactModeToggle")?.addEventListener("change",()=>{const v=$("compactModeToggle").checked;localStorage.setItem(compactKey,String(v));document.getElementById("adminApp").classList.toggle("compact-ui",v);toast(v?"Compact tables enabled.":"Comfortable spacing enabled.");});
  $("downloadBackupBtn")?.addEventListener("click",async()=>{
   if(!confirm("Download an admin-only copy of current operational records? The file may contain customer contact details. Keep it private."))return;
   const b=$("downloadBackupBtn");b.disabled=true;
   try{
    const [products,categories,orders,posts,finance,events,siteBlocks]=await Promise.all([fetchProducts(),fetchCategories(),fetchOrders(null,5000),fetchPosts(),fetchFinance(),fetchEvents(null,15000),signedQuery(client.from("site_content_blocks").select("block_key,block_type,title,image_url,link_url,alt_text,is_active,sort_order,updated_by,created_at,updated_at").order("sort_order",{ascending:true}))]);
    const packageData={backup_type:"halal-food-operational-export",generated_at:new Date().toISOString(),generated_by:H.ADMIN_EMAIL,notice:"Manual export only; this file is not automatically restored. It contains sensitive operational data and must be kept private.",data:{products,categories,orders,blog_posts:posts,site_content_blocks:siteBlocks,admin_finance_entries:finance,analytics_events:events}};
    downloadFile("halal-food-admin-export-"+todayISO()+".json",JSON.stringify(packageData,null,2),"application/json;charset=utf-8");
    await audit("data_backup_downloaded","backup",null,"Operational data export downloaded",{products:products.length,categories:categories.length,orders:orders.length,blog_posts:posts.length,site_content_blocks:siteBlocks.length,finance_entries:finance.length,analytics_events:events.length});
    toast("Data export downloaded. Store it securely.");
   }catch(err){toast(err.message||"Backup export failed. Check data access.","error");}
   finally{b.disabled=false;}
  });
  await refresh();attachRefresh(refresh);
 }
 function doInit(){
  const actions={
   overview:initOverview,
   analytics:initAnalytics,
   orders:initOrders,
   pos:()=>{if(typeof window.HFPosInit==="function")return window.HFPosInit();throw new Error("POS module did not load.");},
   "incomplete-orders":async()=>{},
   operations:()=>{if(typeof window.HFOpsInit==="function")return window.HFOpsInit();throw new Error("Operations module did not load.");},
   products:initProducts,
   "products-add":initProductAdd,
   "products-barcode":()=>{if(typeof window.HFBarcodeInit==="function")return window.HFBarcodeInit();throw new Error("Barcode module did not load.");},
   "products-reviews":()=>{if(typeof window.HFReviewsInit==="function")return window.HFReviewsInit();throw new Error("Product Reviews module did not load.");},
   content:initContent,
   customers:initCustomers,
   finance:initFinance,
   reports:initReports,
   settings:initSettings,
   "website-publisher":()=>{if(typeof window.HFWebsitePublisherInit==="function")return window.HFWebsitePublisherInit();throw new Error("Website Publisher module did not load.");}
  };
  if(!actions[page]){toast("This section is not available yet.","error");return;}
  actions[page]().catch(err=>{console.error("Admin page failed",page,err);toast("The page could not load its data. "+(err?.message||"Please refresh and try again."),"error");});
 }
 const globalSearchInput=$("globalSearch");
 const adminMain=$("adminMain");
 let globalSearchFrame=0;
 function applyGlobalTableSearch(){
  if(!adminMain)return;
  const q=String(globalSearchInput?.value||"").toLowerCase().trim();
  adminMain.querySelectorAll(".hf-table tbody tr").forEach(row=>{
   row.hidden=!!q&&!row.textContent.toLowerCase().includes(q);
  });
 }
 globalSearchInput?.addEventListener("input",applyGlobalTableSearch);
 if(adminMain&&window.MutationObserver){
  const globalSearchObserver=new MutationObserver(()=>{
   if(globalSearchFrame)return;
   globalSearchFrame=window.requestAnimationFrame(()=>{globalSearchFrame=0;applyGlobalTableSearch();});
  });
  globalSearchObserver.observe(adminMain,{subtree:true,childList:true,characterData:true});
 }
 doInit();
});
})();
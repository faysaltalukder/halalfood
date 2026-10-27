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
   try{overviewDateLabel.textContent=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());}
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
   $("overviewActionNote").textContent="Checks use saved catalog and order records. This testing project does not process real payments or deliveries.";
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
    ?"All-time totals use confirmed manual ledger entries only. Net recorded ledger is not cash on hand. Courier COD entries remain manual placeholders in Operations and are not yet reconciled into this finance ledger."
    :"Finance summary could not be loaded. Refresh after signing in to the authorized admin account and completing MFA. Courier entries are manual placeholders and are not verified cash receipts.";
   const labels=dateKeys(14);
   drawChart("overviewOperationsChart",{type:"line",data:{labels:labels.map(dateOnly),datasets:[
    {label:"Order item lines",data:labels.map(day=>chartOrders.filter(o=>localDateKey(o.ordered_at)===day&&o.status!=="cancelled").reduce((sum,o)=>sum+(o.order_items||[]).length,0)),borderColor:palette.orange,backgroundColor:"#F59E0B22",fill:true,tension:.32,pointRadius:2,borderWidth:2},
    {label:"Add-to-cart events",data:labels.map(day=>events.filter(e=>e.event_name==="add_to_cart"&&localDateKey(e.occurred_at)===day).length),borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:false,tension:.32,pointRadius:2,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href=items[0].datasetIndex===0?"./orders.html":"./analytics.html";}}});
   const financeCanvas=$("overviewFinanceChart");
   if(financeAvailable){
    if(financeCanvas)financeCanvas.hidden=false;
    $("overviewFinanceChartNote").textContent="Confirmed manual entries only. This chart is not a bank balance or COD settlement report.";
    drawChart("overviewFinanceChart",{type:"bar",data:{labels:labels.map(dateOnly),datasets:[
     {label:"Recorded income",data:labels.map(day=>confirmedFinance.filter(e=>e.entry_type==="income"&&String(e.entry_date||"").slice(0,10)===day).reduce((sum,e)=>sum+Number(e.amount||0),0)),backgroundColor:palette.green,borderRadius:5,maxBarThickness:24},
     {label:"Recorded expenses",data:labels.map(day=>confirmedFinance.filter(e=>e.entry_type==="expense"&&String(e.entry_date||"").slice(0,10)===day).reduce((sum,e)=>sum+Number(e.amount||0),0)),backgroundColor:palette.orange,borderRadius:5,maxBarThickness:24}
    ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:()=>{location.href="./finance.html";}}});
   }else{
    if(financeCanvas)financeCanvas.hidden=true;
    $("overviewFinanceChartNote").textContent="Finance data is unavailable for this session. Complete admin MFA to view confirmed ledger entries.";
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
   if(summaryOrders.length>=5000)limits.push("The order summary reached its 5,000-record limit, so totals/status counts may be incomplete.");
   if(chartOrders.length>=1000)limits.push("The daily order-item chart reached its 1,000-order limit.");
   if(events.length>=5000)limits.push("Website events reached the 5,000-event limit.");
   $("overviewDataNote").textContent=events.length+" website events were returned for the last 14 days; "+ordersLast30.length+" order records were loaded for the last 30 days"+(pendingVerified?"; the pending-order KPI uses an exact database count.":"; pending-order count could not be verified, so the KPI uses loaded recent records.")+". Order item lines count saved product rows, not quantities. Cart additions are event counts, not current cart contents. Records do not prove payment or delivery."+(limits.length?" "+limits.join(" "):"");
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
  let all=[],activeOrderId=null,shipmentRows=[],shipmentRowsReady=false,shipmentLoadMessage="",redxAreaLookupError="",redxLoadedAreas=[],redxLoadedDistrict="",redxPreferredAreaId="",redxPreferredAreaName="";
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
   $("confirmBookPathaoWeight").value=existing?.parcel_weight_kg||"";
   $("confirmBookRedxWeight").value=existing?.parcel_weight_kg||"";
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
  function printPackingSlip(order){
   const win=window.open("","_blank");
   if(!win){toast("Printing window was blocked. Allow pop-ups for this admin page and try again.","error");return;}
   const orderNo=order.order_number||String(order.id).slice(0,8);
   const itemRows=(order.order_items||[]).map(item=>"<tr><td>"+esc(item.product_name)+"</td><td>"+esc(item.quantity)+" "+esc(item.unit||"")+"</td><td>"+money(item.unit_price)+"</td><td>"+money(item.line_total)+"</td></tr>").join("");
   const documentHtml="<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Halal Food · Test Order "+esc(orderNo)+"</title><style>*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#2b2a3d;margin:0;padding:28px;max-width:860px;margin:auto}header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #c97b3d;padding-bottom:16px;margin-bottom:20px;gap:16px}h1{margin:0;font-size:24px}h2{font-size:16px;margin:22px 0 8px}small,.muted{color:#686778}.tag{display:inline-block;background:#fff0df;padding:5px 9px;border-radius:99px;font-weight:700;font-size:11px}.notice{margin:18px 0;padding:12px;background:#fff4e7;border:1px solid #edd5b8;border-radius:8px;font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.meta div{padding:12px;background:#faf8f3;border-radius:8px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;border-bottom:1px solid #e8e4dc;padding:10px 8px;font-size:12px}th{background:#f5f1e9;text-transform:uppercase;font-size:10px;letter-spacing:.05em}.totals{margin:16px 0 0 auto;width:min(320px,100%)}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{border-top:1px solid #cfc8bc;margin-top:5px;padding-top:10px;font-size:17px;font-weight:800}@media print{body{padding:0}.notice{break-inside:avoid}}@media(max-width:600px){body{padding:14px}.meta{grid-template-columns:1fr}}</style></head><body><header><div><h1>Halal Food</h1><div class='muted'>Premium Products · Order packing summary</div></div><div style='text-align:right'><span class='tag'>TEST ORDER</span><p><strong>"+esc(orderNo)+"</strong><br><small>"+esc(dateTime(order.ordered_at))+"</small></p></div></header><div class='notice'><strong>Testing project:</strong> This document is not a receipt or proof of payment/delivery. Halal Food is currently a learning/testing storefront; real transactions and delivery are not enabled.</div><div class='meta'><div><strong>Customer</strong><br>"+esc(order.customer_name||"—")+"<br>"+esc(order.customer_phone||"—")+"<br>"+esc(order.customer_email||"")+"</div><div><strong>Delivery details</strong><br>"+esc(order.delivery_address||"—")+"<br><span class='muted'>Zone: "+esc(order.delivery_zone||"Not recorded")+" · Status: "+esc(order.status||"pending")+"</span></div></div><h2>Items</h2><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>"+(itemRows||"<tr><td colspan='4'>No item details recorded</td></tr>")+"</tbody></table><div class='totals'><div><span>Subtotal</span><strong>"+money(order.subtotal)+"</strong></div><div><span>Delivery</span><strong>"+money(order.delivery_charge)+"</strong></div><div class='grand'><span>Recorded total</span><strong>"+money(order.total)+"</strong></div></div><p class='muted' style='margin-top:28px;font-size:11px'>Printed from the Halal Food admin panel. Recorded amounts do not confirm collected payment.</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>";
   try{win.document.open();win.document.write(documentHtml);win.document.close();win.opener=null;}catch(err){win.close();toast("The packing summary could not be opened.","error");}
  }
  function render(){
   const search=String($("orderSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),status=$("orderStatusFilter")?.value||"";
   const countByStatus={"":all.length,pending:0,processing:0,shipped:0,delivered:0,cancelled:0};
   all.forEach(order=>{if(Object.prototype.hasOwnProperty.call(countByStatus,order.status))countByStatus[order.status]++;});
   document.querySelectorAll("[data-order-quick-filter]").forEach(button=>{
    const filter=button.dataset.orderQuickFilter||"";
    const count=button.querySelector("[data-order-filter-count]");
    if(count)count.textContent=shortNum(countByStatus[filter]??0);
    const active=filter===status;
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
   });
   const rows=all.filter(o=>(!status||o.status===status)&&(!search||[o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.id,...(o.order_items||[]).map(i=>i.product_name)].join(" ").toLowerCase().includes(search)));
   $("ordersFoundCount").textContent=rows.length.toLocaleString("en-BD")+" orders";
   $("ordersDataBody").innerHTML=rows.length?rows.map(o=>{
    const shipment=shipmentFor(o.id),locked=courierBookingLocked(shipment),eligible=["pending","processing"].includes(o.status);
    const legacyTest=!!shipment&&(shipment.provider_response?.redx_sandbox_test_area===true||shipment.provider_response?.redx_sandbox_quick_test===true);
    let courierAction="";
    if(eligible&&shipmentRowsReady&&!locked&&String(o.payment_method||"cash_on_delivery").toLowerCase()==="cash_on_delivery"){
     const label=shipment?.booking_state==="failed"?"Resolve issue & retry":o.status==="pending"?"Confirm & Book":"Book Courier";
     courierAction='<button class="hf-button hf-button-primary hf-button-small" data-confirm-book="'+esc(o.id)+'">'+label+'</button>';
    }else if(eligible&&!shipmentRowsReady){
     courierAction='<span class="hf-status hf-status-review">Courier state unavailable</span>';
    }else if(locked){
     const state=legacyTest?"Legacy courier record — verify with REDX":shipment.booking_state==="unknown"?"Booking outcome uncertain — verify with courier":shipment.booking_state==="in_progress"?"Booking in progress":shipment.booking_state==="succeeded"?"Booking succeeded":shipment.booking_state==="failed"?"Booking failed":"Courier record locked";
     courierAction='<span class="hf-status hf-status-review">'+esc(state)+'</span>';
    }
    const stateText=shipment?(legacyTest?"Legacy record — verify in REDX dashboard":shipment.booking_error||(shipment.booking_state==="failed"?"Booking failed":shipment.booking_state==="succeeded"?"Booking succeeded":shipment.booking_state==="unknown"?"Verify with courier":shipment.booking_state==="in_progress"?"Booking in progress":"Not booked")):"";
    const shipmentInfo=shipment?'<small style="display:block;white-space:normal;min-width:150px">'+esc(shipment.courier_name||"Courier")+': '+esc(stateText)+'</small>':"";
    return '<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(String(o.id).slice(0,8))+'</small></td><td><strong>'+esc(o.customer_name||"Guest")+'</strong><small>'+esc(o.customer_phone||"No phone")+'</small></td><td>'+esc((o.order_items||[]).slice(0,2).map(x=>x.product_name+" × "+x.quantity+" "+(x.unit||"")).join(", ")||"No item detail")+'</td><td>'+money(o.subtotal)+'</td><td>'+money(o.delivery_charge)+'</td><td><strong>'+money(o.total)+'</strong></td><td><select class="hf-select order-status-select" data-order-id="'+esc(o.id)+'" style="min-width:120px;padding:7px;font-size:11px">'+statusOptions.map(s=>'<option value="'+s+'" '+(s===o.status?"selected ":"")+(o.status==="cancelled"&&s!=="cancelled"?"disabled ":"")+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>').join("")+'</select>'+(o.status==="cancelled"&&o.cancellation_reason?'<small>'+esc(o.cancellation_reason)+'</small>':"")+'</td><td>'+dateTime(o.ordered_at)+'</td><td><div class="hf-table-actions" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">'+courierAction+'<button class="hf-button hf-button-secondary hf-button-small" data-order-details="'+esc(o.id)+'">Details</button>'+shipmentInfo+'</div></td></tr>';
   }).join(""):'<tr><td colspan="9">'+makeEmpty("No matching orders","Try another status or a shorter search term.")+'</td></tr>';
  }
  async function refresh(){
   all=await fetchOrders(null,5000);
   try{
    const {data,error}=await client.from("admin_shipments").select("id,order_id,courier_name,tracking_id,shipment_status,integration_mode,booking_state,booking_error,provider_order_id,parcel_weight_kg,parcel_notes,created_by,provider_response").order("updated_at",{ascending:false}).limit(5000);
    if(error)throw error;
    shipmentRows=data||[];shipmentRowsReady=true;shipmentLoadMessage="";
   }catch(err){
    shipmentRows=[];shipmentRowsReady=false;shipmentLoadMessage="Could not read courier records. Refresh and verify Admin/MFA access before booking.";
    console.error("Courier records could not be loaded.",err);
   }
   render();$("ordersUpdated").textContent="Updated "+dateTime(new Date().toISOString());
  }
  $("orderSearch")?.addEventListener("input",render);$("orderStatusFilter")?.addEventListener("change",render);
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
   select.disabled=true;
   try{const {data,error}=await client.rpc("admin_update_order_status",{p_order_id:order.id,p_next_status:next,p_cancellation_reason:reason});if(error)throw error;await audit("order_status_changed","order",order.id,"Order status changed from "+old+" to "+next,{status:next,cancellation_reason:reason||null});toast("Order status and history updated.");await refresh();}
   catch(err){select.value=old;toast("Status could not be saved: "+(err.message||"check admin access and database permissions"),"error");}
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
    const {data:freshOrder,error:orderReadError}=await client.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,total,status,payment_method,notes,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url)").eq("id",orderId).maybeSingle();
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
     parcel_weight_kg:["pathao","redx"].includes(provider)?weight:null,parcel_notes:(provider==="steadfast"?$("confirmBookSteadfastNotes").value:provider==="pathao"?$("confirmBookPathaoInstruction").value:$("confirmBookRedxInstruction").value).trim(),
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
  $("closeOrderDialog")?.addEventListener("click",()=>$("orderDialog")?.close());
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
    const rows=products.filter(p=>(stockFilter==="all"||stockState(p)===stockFilter)&&(!search||[p.name,p.slug,p.category,p.short_description].join(" ").toLowerCase().includes(search))&&(!cat||p.category_slug===cat)&&(!state||(state==="visible"?p.is_active:!p.is_active)));
    $("productTableBody").innerHTML=rows.length?rows.map(p=>{
     const tracked=p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.stock_quantity!=="";
     const stock=Number(p.stock_quantity),threshold=Number.isFinite(Number(p.low_stock_threshold))?Number(p.low_stock_threshold):5;
     const outOfStock=tracked&&Number.isFinite(stock)&&stock<=0,low=tracked&&Number.isFinite(stock)&&stock>0&&stock<=threshold,costKnown=p.cost_price!==null&&p.cost_price!==undefined&&p.cost_price!=="";
     const totalUnitCost=(costKnown?Number(p.cost_price):0)+Number(p.packaging_cost||0);
     const margin=costKnown&&Number(p.price)>0?((Number(p.price)-totalUnitCost)/Number(p.price))*100:null;
     const marginClass=margin===null?"":margin<0?"hf-status-failed":margin<15?"hf-status-pending":"hf-status-confirmed";
     const marginText=margin===null?"Add purchase cost to calculate margin":'Margin <span class="hf-status '+marginClass+'">'+margin.toLocaleString("en-BD",{maximumFractionDigits:1})+'%</span> · includes packaging';
     const stockLabel=!tracked?'<span class="hf-status">Not tracked</span>':outOfStock?'<span class="hf-status hf-status-out-of-stock">Out of stock</span>':low?'<span class="hf-status hf-status-low-stock">'+esc(p.stock_quantity)+' left</span>':'<span class="hf-status hf-status-confirmed">'+esc(p.stock_quantity)+' in stock</span>';
     return '<tr><td><div style="display:flex;align-items:center;gap:10px">'+(p.image_url?'<img class="hf-thumb" src="'+esc(p.image_url)+'" alt="" loading="lazy">':'<span class="hf-thumb hf-thumb-empty">◇</span>')+'<span><strong>'+esc(p.name)+'</strong><small>/'+esc(p.slug)+'</small></span></div></td><td>'+esc(p.category||"—")+'</td><td><strong>'+esc(p.display_price||money(p.price))+'</strong><small>'+esc(p.unit_type||"piece")+'</small></td><td><strong>'+(costKnown?money(totalUnitCost):"Cost not set")+'</strong><small>'+marginText+'</small></td><td>'+stockLabel+'<small>'+(tracked?"Alert at "+esc(threshold)+" "+esc(p.unit_type||"unit"):"Set stock quantity to enable alerts")+'</small></td><td>'+makeStatus(p.is_active?"visible":"hidden")+(p.is_featured?' <span class="hf-status hf-status-review">Featured</span>':"")+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-product="'+esc(p.id)+'">Edit</button><button class="hf-button '+(p.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-product="'+esc(p.id)+'">'+(p.is_active?"Hide":"Restore")+'</button></div></td></tr>';
    }).join(""):'<tr><td colspan="7">'+makeEmpty("No products found","Try a different search or add a product.")+'</td></tr>';
    const lowCount=products.filter(p=>p.is_active&&stockState(p)==="low").length;
    const outCount=products.filter(p=>p.is_active&&stockState(p)==="out").length;
    $("productsCount").textContent=products.length.toLocaleString("en-BD");$("productsVisibleCount").textContent=products.filter(p=>p.is_active).length.toLocaleString("en-BD");$("productsHiddenCount").textContent=products.filter(p=>!p.is_active).length.toLocaleString("en-BD");$("categoriesCount").textContent=categories.length.toLocaleString("en-BD");$("productsLowStockCount").textContent=lowCount.toLocaleString("en-BD");$("productsOutOfStockCount").textContent=outCount.toLocaleString("en-BD");
    $("categoryTableBody").innerHTML=categories.length?categories.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><small>'+esc(c.slug)+'</small></td><td>'+products.filter(p=>p.category_slug===c.slug&&p.is_active).length+'</td><td>'+makeStatus(c.is_active?"visible":"hidden")+'</td><td>'+esc(c.sort_order??0)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-category="'+esc(c.id)+'">Edit</button><button class="hf-button '+(c.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-category="'+esc(c.id)+'">'+(c.is_active?"Hide":"Restore")+'</button></div></td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No categories","Add a category before creating products.")+'</td></tr>';
   }
async function refresh(){[products,categories]=await Promise.all([fetchProducts(),fetchCategories()]);fillCategories();render();}
  function openProduct(p=null){
   $("productForm").reset();$("productId").value=p?.id||"";$("productName").value=p?.name||"";$("productSlug").value=p?.slug||"";$("productSlug").readOnly=!!p;$("productSlug").dataset.edited=p?"1":"";$("productCategorySelect").value=p?.category_slug||"";$("productPrice").value=p?.price??"";$("productUnit").value=p?.unit_type||"piece";$("productDisplayPrice").value=p?.display_price||"";$("productImageUrl").value=p?.image_url||"";$("productShortDescription").value=p?.short_description||"";$("productFullDescription").value=p?.full_description||p?.description||"";$("productStock").value=p?.stock_quantity??"";$("productCostPrice").value=p?.cost_price??"";$("productPackagingCost").value=p?.packaging_cost??0;$("productLowStockThreshold").value=p?.low_stock_threshold??5;$("productSortOrder").value=p?.sort_order??0;$("productSeoTitle").value=p?.seo_title||"";$("productSeoDescription").value=p?.seo_description||"";$("productActive").checked=p?.is_active??true;$("productFeatured").checked=p?.is_featured??false;$("productFormError").textContent="";$("productDialogTitle").textContent=p?"Edit product":"Add a new product";
   const preview=$("productImagePreview");if(p?.image_url){preview.src=p.image_url;preview.hidden=false;}else{preview.removeAttribute("src");preview.hidden=true;}
   $("productDialog").showModal();
  }
  $("addProductBtn")?.addEventListener("click",()=>openProduct());
  $("addCategoryBtn")?.addEventListener("click",()=>openCategory());
  $("addCategoryQuickBtn")?.addEventListener("click",()=>openCategory());
  $("productImageUrl")?.addEventListener("input",()=>{if($("productImageUrl").value){$("productImagePreview").src=$("productImageUrl").value;$("productImagePreview").hidden=false;}});
  $("productImageFile")?.addEventListener("change",()=>{const f=$("productImageFile").files?.[0];if(f){$("productImagePreview").src=URL.createObjectURL(f);$("productImagePreview").hidden=false;}});
  $("productName")?.addEventListener("input",()=>{if(!$("productId").value&&!$("productSlug").dataset.edited)$("productSlug").value=slugify($("productName").value);});
  $("productSlug")?.addEventListener("input",()=>{$("productSlug").dataset.edited="1";});

  const PRODUCT_READBACK_COLUMNS="id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,stock_quantity,is_active,is_featured,sort_order,seo_title,seo_description,cms_managed,cms_created";
  const CATEGORY_READBACK_COLUMNS="id,name,slug,description,image_url,sort_order,is_active,cms_managed,cms_created";
  function sameSavedValue(actual,expected){
   if(actual===null||actual===undefined||expected===null||expected===undefined)return (actual===null||actual===undefined)&&(expected===null||expected===undefined);
   if(typeof expected==="number")return Number.isFinite(Number(actual))&&Number(actual)===expected;
   if(typeof expected==="boolean")return actual===expected;
   return String(actual)===String(expected);
  }
  async function verifyAdminCatalogRecord(table,id,columns,expected,label){
   const {data,error}=await client.from(table).select(columns).eq("id",id).maybeSingle();
   if(error)throw new Error(label+" was written, but database read-back verification failed: "+error.message);
   if(!data)throw new Error(label+" was written, but the saved record could not be found during database read-back verification.");
   const selected=new Set(columns.split(","));
   const mismatches=Object.entries(expected).filter(([key,value])=>selected.has(key)&&!sameSavedValue(data[key],value)).map(([key])=>key);
   if(mismatches.length)throw new Error(label+" was written, but these saved fields did not match the submitted values: "+mismatches.join(", ")+". No success confirmation was shown; refresh and inspect the record before retrying.");
   return data;
  }
  async function refreshCatalogAfterSave(successMessage,entityLabel){
   try{
    await refresh();
    toast(successMessage);
   }catch(refreshError){
    console.error(entityLabel+" was saved and verified, but the Admin list could not refresh.",refreshError);
    toast(entityLabel+" was saved and verified, but this dashboard could not refresh. Reload the Products page.", "error");
   }
  }

  $("productForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("productId").value,button=$("saveProductBtn");button.disabled=true;$("productFormError").textContent="";
   try{
    const category=categories.find(c=>c.slug===$("productCategorySelect").value);if(!category)throw new Error("Choose a valid category.");
    const name=$("productName").value.trim(),slug=$("productSlug").value.trim();if(!slug||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug))throw new Error("Use an English URL slug, for example pure-cow-ghee.");
    const price=Number($("productPrice").value);if(!Number.isFinite(price)||price<0)throw new Error("Enter a valid non-negative price.");
    let imageUrl=$("productImageUrl").value.trim();const file=$("productImageFile").files?.[0];if(file)imageUrl=await uploadImage(file,"products",slug);
    const unit=$("productUnit").value.trim()||"piece";
    const displayPriceInput=$("productDisplayPrice").value.trim();
    const displayPriceMatch=displayPriceInput.match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
    const displayPriceAmount=displayPriceMatch?Number(displayPriceMatch[0].replace(/,/g,"")):NaN;
    const displayPrice=displayPriceInput&&displayPriceAmount===price?displayPriceInput:("৳"+price.toLocaleString("en-BD")+" / "+unit);
    const payload={name,slug,category:category.name,category_slug:category.slug,price,unit_type:unit,display_price:displayPrice,image_url:imageUrl||null,short_description:$("productShortDescription").value.trim(),full_description:$("productFullDescription").value.trim(),stock_quantity:$("productStock").value===""?null:Number($("productStock").value),is_active:$("productActive").checked,is_featured:$("productFeatured").checked,sort_order:parseInt($("productSortOrder").value||"0",10)||0,seo_title:$("productSeoTitle").value.trim()||null,seo_description:$("productSeoDescription").value.trim()||null,cms_managed:true};
    const rawCost=$("productCostPrice").value,rawPackaging=$("productPackagingCost").value,rawThreshold=$("productLowStockThreshold").value;
    const costPrice=rawCost===""?null:Number(rawCost),packagingCost=rawPackaging===""?0:Number(rawPackaging),lowStockThreshold=rawThreshold===""?5:Number(rawThreshold);
    if(costPrice!==null&&(!Number.isFinite(costPrice)||costPrice<0))throw new Error("Enter a valid non-negative purchase cost, or leave it blank.");
    if(!Number.isFinite(packagingCost)||packagingCost<0)throw new Error("Enter a valid non-negative packaging cost.");
    if(!Number.isFinite(lowStockThreshold)||lowStockThreshold<0)throw new Error("Enter a valid non-negative low-stock threshold.");
    if(!name)throw new Error("Product name is required.");
    let savedId=id;
    if(!id)payload.cms_created=true;
    const writeResult=id
      ? await client.from("products").update(payload).eq("id",id).select("id").single()
      : await client.from("products").insert(payload).select("id").single();
    if(writeResult.error)throw writeResult.error;
    if(!writeResult.data?.id)throw new Error("The database did not return a saved Product record. Refresh and inspect the catalog before retrying.");
    savedId=writeResult.data.id;
    $("productId").value=savedId;$("productSlug").readOnly=true;
    const {error:costError}=await client.from("admin_product_costs").upsert({product_id:savedId,cost_price:costPrice,packaging_cost:packagingCost,low_stock_threshold:lowStockThreshold,updated_by:ADMIN_EMAIL,updated_at:new Date().toISOString()},{onConflict:"product_id"});
    if(costError)throw new Error("Product details were saved, but private cost and stock-alert settings were not saved. Edit this product and retry. "+costError.message);
    await verifyAdminCatalogRecord("products",savedId,PRODUCT_READBACK_COLUMNS,payload,"Product");
    const {data:verifiedCost,error:costVerifyError}=await client.from("admin_product_costs").select("product_id,cost_price,packaging_cost,low_stock_threshold").eq("product_id",savedId).maybeSingle();
    if(costVerifyError||!verifiedCost)throw new Error("Product details were saved, but private cost and stock-alert settings could not be verified from the database. "+(costVerifyError?.message||"No matching cost record was returned.")+" Reopen this product and inspect its private settings before retrying.");
    const costMismatches=[["cost_price",costPrice],["packaging_cost",packagingCost],["low_stock_threshold",lowStockThreshold]].filter(([field,value])=>!sameSavedValue(verifiedCost[field],value)).map(([field])=>field);
    if(costMismatches.length)throw new Error("Product details were saved, but saved private settings did not match: "+costMismatches.join(", ")+". Reopen this product and inspect its settings before retrying.");
    await audit(id?"product_updated":"product_created","product",savedId,id?"Product details and private cost settings updated":"New product and private cost settings created",{slug,cost_recorded:costPrice!==null,low_stock_threshold:lowStockThreshold});
    $("productDialog").close();
    await refreshCatalogAfterSave(id?"Product updated and database-verified.":"Product added and database-verified.","Product");
   }catch(err){$("productFormError").textContent=err.message||"Product could not be saved or verified.";}
   finally{button.disabled=false;}
  });

  function openCategory(c=null){
   $("categoryForm").reset();$("categoryId").value=c?.id||"";$("categoryName").value=c?.name||"";$("categorySlug").value=c?.slug||"";$("categorySlug").readOnly=!!c;$("categorySlug").dataset.edited=c?"1":"";$("categoryDescription").value=c?.description||"";$("categoryImageUrl").value=c?.image_url||"";$("categorySortOrder").value=c?.sort_order??0;$("categoryActive").checked=c?.is_active??true;$("categoryFormError").textContent="";$("categoryDialogTitle").textContent=c?"Edit category":"Add category";$("categoryDialog").showModal();
  }
  $("categoryName")?.addEventListener("input",()=>{if(!$("categoryId").value&&!$("categorySlug").dataset.edited)$("categorySlug").value=slugify($("categoryName").value);});
  $("categorySlug")?.addEventListener("input",()=>{$("categorySlug").dataset.edited="1";});
  $("categoryForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("categoryId").value,button=$("saveCategoryBtn");button.disabled=true;$("categoryFormError").textContent="";
   let categoryWasWritten=false;
   try{
    const name=$("categoryName").value.trim(),slug=$("categorySlug").value.trim();if(!name)throw new Error("Category name is required.");if(!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug))throw new Error("Use an English category slug, e.g. nuts-seeds.");
    const payload={name,slug,description:$("categoryDescription").value.trim(),image_url:$("categoryImageUrl").value.trim()||null,sort_order:parseInt($("categorySortOrder").value||"0",10)||0,is_active:$("categoryActive").checked,cms_managed:true};
    let savedCategoryId=id;
    if(id){
     const old=categories.find(c=>c.id===id);
     const {data:savedCategory,error}=await client.from("categories").update(payload).eq("id",id).select("id").single();
     if(error)throw error;
     if(!savedCategory?.id)throw new Error("The database did not return the updated Category record.");
     savedCategoryId=savedCategory.id;categoryWasWritten=true;
     if(old&&old.name!==name){
      const {data:linkedProducts,error:linkedProductsError}=await client.from("products").update({category:name}).eq("category_slug",old.slug).select("id,category,category_slug");
      if(linkedProductsError)throw new Error("The Category name was saved, but linked Product labels could not be synchronized. "+linkedProductsError.message);
      const mismatch=(linkedProducts||[]).filter(product=>product.category!==name||product.category_slug!==old.slug);
      if(mismatch.length)throw new Error("The Category name was saved, but "+mismatch.length+" linked Product label(s) failed read-back verification.");
     }
     await audit("category_updated","category",savedCategoryId,"Category updated",{slug,linked_product_labels_updated:!!(old&&old.name!==name)});
    }else{
     payload.cms_created=true;
     const {data:savedCategory,error}=await client.from("categories").insert(payload).select("id").single();
     if(error)throw error;
     if(!savedCategory?.id)throw new Error("The database did not return the created Category record.");
     savedCategoryId=savedCategory.id;categoryWasWritten=true;
     $("categoryId").value=savedCategoryId;$("categorySlug").readOnly=true;
     await audit("category_created","category",savedCategoryId,"New category created",{slug});
    }
    await verifyAdminCatalogRecord("categories",savedCategoryId,CATEGORY_READBACK_COLUMNS,payload,"Category");
    $("categoryDialog").close();
    await refreshCatalogAfterSave(id?"Category updated and database-verified.":"Category added and database-verified.","Category");
   }catch(err){
    const message=err.message||"Category could not be saved or verified.";
    $("categoryFormError").textContent=categoryWasWritten?"The Category was saved, but a linked-Product synchronization or read-back step failed. "+message:message;
   }finally{button.disabled=false;}
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
   operations:()=>{if(typeof window.HFOpsInit==="function")return window.HFOpsInit();throw new Error("Operations module did not load.");},
   products:initProducts,
   content:initContent,
   customers:initCustomers,
   finance:initFinance,
   reports:initReports,
   settings:initSettings
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
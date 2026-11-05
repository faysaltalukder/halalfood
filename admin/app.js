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
 const todayISO=()=>{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const part=type=>parts.find(item=>item.type===type)?.value||"";return part("year")+"-"+part("month")+"-"+part("day")};
 const fileBase=s=>String(s||"halal-food-report").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"")||"halal-food-report";
 const statusOptions=["pending","processing","shipped","delivered","cancelled"];
 const dhakaDateFormatter=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"});
 const dhakaDateKey=value=>{
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  const parts=dhakaDateFormatter.formatToParts(date);
  let year="",month="",day="";
  for(const part of parts){
   if(part.type==="year")year=part.value;
   else if(part.type==="month")month=part.value;
   else if(part.type==="day")day=part.value;
  }
  return year+"-"+month+"-"+day;
 };
 const addDhakaDays=(key,amount)=>{
  const [year,month,day]=String(key).split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day+amount));
  return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0");
 };
 const buildDhakaRange=(fromDay,toDay,label)=>{
  if(!fromDay||!toDay||fromDay>toDay)throw new Error("Choose a valid start and end date.");
  const days=Math.max(1,Math.round((Date.parse(toDay+"T00:00:00Z")-Date.parse(fromDay+"T00:00:00Z"))/86400000)+1);
  return {from:new Date(fromDay+"T00:00:00+06:00").toISOString(),to:new Date(toDay+"T23:59:59.999+06:00").toISOString(),fromDay,toDay,days,label};
 };
 function selectedRange(){
  const p=$("rangeSelect")?.value||"30";
  const today=dhakaDateKey(new Date());
  const monthStart=today.slice(0,7)+"-01";
  const weekday=new Date(today+"T12:00:00+06:00").getUTCDay();
  const weekStart=addDhakaDays(today,-((weekday+1)%7));
  if(p==="custom"){
   const from=$("dateFrom")?.value,to=$("dateTo")?.value;
   if(!from||!to||from>to)throw new Error("Choose a valid start and end date.");
   return buildDhakaRange(from,to,from+" to "+to);
  }
  if(p==="all")return {from:null,to:null,fromDay:null,toDay:today,days:null,label:"All available time"};
  let fromDay=today,toDay=today,label="Today";
  switch(p){
   case "today": label="Today";break;
   case "yesterday": fromDay=addDhakaDays(today,-1);toDay=fromDay;label="Yesterday";break;
   case "7": fromDay=addDhakaDays(today,-6);label="Last 7 days";break;
   case "30": fromDay=addDhakaDays(today,-29);label="Last 30 days";break;
   case "90": fromDay=addDhakaDays(today,-89);label="Last 90 days";break;
   case "365": fromDay=addDhakaDays(today,-364);label="Last 12 months";break;
   case "this-week": fromDay=weekStart;label="This week";break;
   case "last-week": toDay=addDhakaDays(weekStart,-1);fromDay=addDhakaDays(toDay,-6);label="Last week";break;
   case "this-month": fromDay=monthStart;label="This month";break;
   case "last-month": toDay=addDhakaDays(monthStart,-1);fromDay=toDay.slice(0,7)+"-01";label="Last month";break;
   case "this-year": fromDay=today.slice(0,4)+"-01-01";label="This year";break;
   case "last-year": fromDay=(Number(today.slice(0,4))-1)+"-01-01";toDay=(Number(today.slice(0,4))-1)+"-12-31";label="Last year";break;
   default: fromDay=addDhakaDays(today,-29);label="Last 30 days";
  }
  return buildDhakaRange(fromDay,toDay,label);
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
  const keys=lastDateKeys(days),keySet=new Set(keys),counts=new Map(evtNames.map(item=>[item.key,new Map()]));
  events.forEach(event=>{
   const key=String(event.occurred_at||"").slice(0,10),byDay=counts.get(event.event_name);
   if(byDay&&keySet.has(key))byDay.set(key,(byDay.get(key)||0)+1);
  });
  return {labels:keys.map(k=>dateOnly(k)),datasets:evtNames.map((name,i)=>({label:name.label,data:keys.map(k=>counts.get(name.key)?.get(k)||0),borderColor:name.color||colorSet[i],backgroundColor:(name.color||colorSet[i])+"24",pointRadius:2,pointHoverRadius:5,borderWidth:2,tension:.32,fill:name.fill===true}))};
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

 function normalizeAnalyticsPath(value){
  let path=String(value||"/").trim();
  if(/^https?:\/\//i.test(path)){try{path=new URL(path).pathname;}catch(_urlError){}}
  path=path.split(/[?#]/,1)[0]||"/";
  path=path.replace(/\/{2,}/g,"/");
  if(/^\/halalfood\/?$/.test(path))path="/halalfood/index.html";
  if(path.length>1&&path.endsWith("/"))path=path.slice(0,-1);
  return path||"/";
 }
 function prepareAnalyticsEvents(rows){
  const ids=new Set(),events=[];
  let duplicateIds=0,missingIds=0,cleanedPaths=0,identified=0,attributed=0;
  (rows||[]).forEach(raw=>{
   const eventId=String(raw.event_id||"").trim();
   if(eventId){if(ids.has(eventId)){duplicateIds++;return;}ids.add(eventId);}
   else missingIds++;
   if(raw.session_id||raw.anonymous_id)identified++;
   if(raw.source||raw.medium||raw.campaign)attributed++;
   const original=String(raw.page_path||"");
   const pagePath=normalizeAnalyticsPath(original);
   if(original&&pagePath!==original)cleanedPaths++;
   events.push({...raw,page_path:pagePath});
  });
  return {events,duplicateIds,missingIds,eventIds:ids.size,cleanedPaths,identified,attributed,rawCount:(rows||[]).length};
 }
 function buildSequentialFunnel(events){
  const groups=new Map();
  let missingSessionEvents=0;
  const relevant=new Set(["page_view","view_item","add_to_cart","begin_checkout","order_submit"]);
  events.forEach(event=>{
   const key=visitorSessionKey(event);
   if(!key){if(relevant.has(event.event_name))missingSessionEvents++;return;}
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(event);
  });
  const counts={page:0,product:0,cart:0,checkout:0,submit:0};
  groups.forEach(rows=>{
   rows.sort((a,b)=>Date.parse(a.occurred_at||"")-Date.parse(b.occurred_at||""));
   const firstPage=rows.find(event=>event.event_name==="page_view"&&Number.isFinite(Date.parse(event.occurred_at||"")));
   if(!firstPage)return;
   counts.page++;
   let after=Date.parse(firstPage.occurred_at||"");
   const next=(name,minimum)=>rows.find(event=>event.event_name===name&&Number.isFinite(Date.parse(event.occurred_at||""))&&Date.parse(event.occurred_at||"")>=minimum);
   const product=next("view_item",after);if(!product)return;counts.product++;after=Date.parse(product.occurred_at||"");
   const cart=next("add_to_cart",after);if(!cart)return;counts.cart++;after=Date.parse(cart.occurred_at||"");
   const checkout=next("begin_checkout",after);if(!checkout)return;counts.checkout++;after=Date.parse(checkout.occurred_at||"");
   if(next("order_submit",after))counts.submit++;
  });
  return {counts,identifiedSessions:groups.size,missingSessionEvents};
 }
 function topProducts(events,products,field="item_name",eventName="view_item"){
  const by=new Map(),productByName=new Map();
  products.forEach(product=>{
   const name=String(product.name||"").trim().toLowerCase();
   const slug=String(product.slug||"").trim().toLowerCase();
   if(name&&!productByName.has(name))productByName.set(name,product);
   if(slug&&!productByName.has(slug))productByName.set(slug,product);
  });
  events.forEach(event=>{
   if(event.event_name!==eventName)return;
   const name=String(event[field]||"").trim();
   if(name)by.set(name,(by.get(name)||0)+1);
  });
  return [...by.entries()].map(([name,count])=>({name,count,product:productByName.get(name.toLowerCase())})).sort((a,b)=>b.count-a.count).slice(0,8);
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
  const groups=new Map();
  events.forEach(event=>{
   const key=visitorSessionKey(event);
   if(!key)return;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(event);
  });
  return [...groups.entries()].map(([sessionId,rows])=>{
   rows.sort((a,b)=>Date.parse(a.occurred_at||0)-Date.parse(b.occurred_at||0));
   const pageViews=[],pathSteps=[];
   let visibleSeconds=0,cartAdds=0,checkouts=0,orderSubmits=0;
   rows.forEach(event=>{
    if(event.event_name==="page_view"){
     pageViews.push(event);
     const path=String(event.page_path||"/");
     if(pathSteps[pathSteps.length-1]!==path)pathSteps.push(path);
    }else if(event.event_name==="page_engagement"){
     visibleSeconds+=Math.max(0,Number(event.value)||0);
    }else if(event.event_name==="add_to_cart")cartAdds++;
    else if(event.event_name==="begin_checkout")checkouts++;
    else if(event.event_name==="order_submit")orderSubmits++;
   });
   const last=rows[rows.length-1]||{};
   return {sessionId,rows,pathSteps,steps:pageViews.length,lastSeen:last.occurred_at||"",lastPage:last.page_path||"/",visibleSeconds,cartAdds,checkouts,orderSubmits};
  }).sort((a,b)=>Date.parse(b.lastSeen||0)-Date.parse(a.lastSeen||0));
 }
 function buildProductPerformance(events,orders,products){
  const rows=products.map(product=>({product,views:0,cartAdds:0,viewSessions:new Set(),viewTimeBySession:new Map(),cartAfterViewSessions:new Set(),orderIds:new Set(),orderLines:0,units:0,orderValue:0}));
  const byId=new Map(),bySlug=new Map(),byName=new Map();
  rows.forEach(row=>{
   const id=String(row.product.id||"").toLowerCase(),slug=String(row.product.slug||"").toLowerCase(),name=String(row.product.name||"").trim().toLowerCase();
   if(id&&!byId.has(id))byId.set(id,row);
   if(slug&&!bySlug.has(slug))bySlug.set(slug,row);
   if(name&&!byName.has(name))byName.set(name,row);
  });
  const findEventProduct=event=>{
   const id=String(event.item_id||"").toLowerCase(),name=String(event.item_name||"").trim().toLowerCase();
   return (id&&(bySlug.get(id)||byId.get(id)))||(name&&byName.get(name))||null;
  };
  events.filter(event=>event.event_name==="view_item"||event.event_name==="add_to_cart").slice().sort((a,b)=>Date.parse(a.occurred_at||0)-Date.parse(b.occurred_at||0)).forEach(event=>{
   const row=findEventProduct(event);if(!row)return;
   const actor=visitorSessionKey(event),stamp=Date.parse(event.occurred_at||"");
   if(event.event_name==="view_item"){
    row.views++;
    if(actor){row.viewSessions.add(actor);if(!row.viewTimeBySession.has(actor))row.viewTimeBySession.set(actor,stamp);}
   }else{
    row.cartAdds++;
    if(actor&&row.viewTimeBySession.has(actor)&&stamp>row.viewTimeBySession.get(actor))row.cartAfterViewSessions.add(actor);
   }
  });
  orders.forEach(order=>{
   if(order.status==="cancelled")return;
   (order.order_items||[]).forEach(item=>{
    const id=String(item.product_id||"").toLowerCase(),name=String(item.product_name||"").trim().toLowerCase();
    const row=(id&&byId.get(id))||(name&&byName.get(name));
    if(!row)return;
    row.orderIds.add(String(order.id));row.orderLines++;row.units+=Math.max(0,Number(item.quantity)||0);
    const value=item.line_total!=null?Number(item.line_total):Number(item.unit_price||0)*Number(item.quantity||0);
    row.orderValue+=Number.isFinite(value)?Math.max(0,value):0;
   });
  });
  return rows.map(row=>({...row,orderCount:row.orderIds.size,viewToCartRate:row.viewSessions.size?row.cartAfterViewSessions.size/row.viewSessions.size*100:null})).sort((a,b)=>b.orderCount-a.orderCount||b.units-a.units||b.views-a.views||b.cartAdds-a.cartAdds);
 }
 function renderTopProducts(list,rows){
  if(!list)return;
  if(!rows.length){list.innerHTML=makeEmpty("No product views yet","Once visitors browse products, their activity will appear here.");return;}
  list.innerHTML=rows.map((r,i)=>'<div class="hf-insight-row">'+(r.product?.image_url?'<img class="hf-thumb" loading="lazy" src="'+esc(r.product.image_url)+'" alt="">':'<span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span>')+'<div><strong>'+esc(r.name)+'</strong><small>'+esc(r.product?.category||"Recorded product view")+'</small></div><span class="hf-insight-number">'+shortNum(r.count)+'</span></div>').join("");
 }
 function renderFunnel(events){
  const body=$("funnelStages");if(!body)return;
  const funnel=buildSequentialFunnel(events);
  const stages=[
   ["Page viewed",funnel.counts.page,"Unique identified sessions with a page_view"],
   ["Product viewed",funnel.counts.product,"A product view happened after the page view"],
   ["Added to cart",funnel.counts.cart,"A cart add happened after a product view"],
   ["Checkout started",funnel.counts.checkout,"Checkout started after the cart action"],
   ["Order submitted",funnel.counts.submit,"Submission happened after checkout; not proof of payment"]
  ];
  const baseline=Math.max(funnel.counts.page,1);
  body.innerHTML=stages.map((stage,index)=>{
   const previous=index?stages[index-1][1]:stage[1];
   const overall=stage[1]/baseline*100;
   const stepRate=index&&previous?stage[1]/previous*100:(index?0:100);
   return '<div class="hf-funnel-row"><div class="hf-funnel-label"><span>'+esc(stage[0])+'</span><strong>'+shortNum(stage[1])+'</strong></div><div class="hf-funnel-track"><div class="hf-funnel-fill" style="width:'+Math.max(stage[1]===0?0:2,overall)+'%"></div></div><div class="hf-progress-note">'+esc(stage[2])+' · '+Math.round(overall)+'% of page-view sessions'+(index?' · '+(previous?Math.round(stepRate):0)+'% advanced from prior step':'')+'</div></div>';
  }).join("");
  const note=$("analyticsFunnelNote");
  if(note)note.textContent="Sequential session funnel. Each stage must occur after the preceding stage in the same identified browser session. "+funnel.missingSessionEvents.toLocaleString("en-BD")+" funnel events without a session/anonymous ID are excluded. Order submission is not confirmed payment.";
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
  const rangeSelect=$("overviewRangeSelect");
  const customRange=$("overviewCustomRange");
  const fromInput=$("overviewDateFrom");
  const toInput=$("overviewDateTo");
  const trendTypeSelect=$("overviewTrendType");
  let overviewTrendSnapshot=null;
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
  const localDateFormatter=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"});
  const localDateKey=value=>{
   if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
   const d=value instanceof Date?value:new Date(value);
   if(Number.isNaN(d.getTime()))return "";
   const parts=localDateFormatter.formatToParts(d);
   let year="",month="",day="";
   for(const part of parts){
    if(part.type==="year")year=part.value;
    else if(part.type==="month")month=part.value;
    else if(part.type==="day")day=part.value;
   }
   return year+"-"+month+"-"+day;
  };
    const addDateDays=(key,amount)=>{
   const [year,month,day]=String(key).split("-").map(Number);
   const d=new Date(Date.UTC(year,month-1,day+amount));
   return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");
  };
  const buildRange=(fromDay,toDay,label)=>{
   if(!fromDay||!toDay||fromDay>toDay)throw new Error("Choose a valid start and end date.");
   const days=Math.max(1,Math.round((Date.parse(toDay+"T00:00:00Z")-Date.parse(fromDay+"T00:00:00Z"))/86400000)+1);
   return {
    from:new Date(fromDay+"T00:00:00+06:00").toISOString(),
    to:new Date(toDay+"T23:59:59.999+06:00").toISOString(),
    fromDay,toDay,days,label
   };
  };
  const readOverviewRange=()=>{
   const today=localDateKey(new Date());
   const selected=rangeSelect?.value||"30";
   let fromDay=today,toDay=today,label="Today";
   const currentMonthStart=today.slice(0,7)+"-01";
   const weekday=new Date(today+"T12:00:00+06:00").getUTCDay();
   const thisWeekStart=addDateDays(today,-((weekday+1)%7));
   switch(selected){
    case "today": label="Today";break;
    case "yesterday": fromDay=addDateDays(today,-1);toDay=fromDay;label="Yesterday";break;
    case "7": fromDay=addDateDays(today,-6);label="Last 7 days";break;
    case "30": fromDay=addDateDays(today,-29);label="Last 30 days";break;
    case "90": fromDay=addDateDays(today,-89);label="Last 90 days";break;
    case "this-week": fromDay=thisWeekStart;label="This week";break;
    case "last-week": toDay=addDateDays(thisWeekStart,-1);fromDay=addDateDays(toDay,-6);label="Last week";break;
    case "this-month": fromDay=currentMonthStart;label="This month";break;
    case "last-month": toDay=addDateDays(currentMonthStart,-1);fromDay=toDay.slice(0,7)+"-01";label="Last month";break;
    case "this-year": fromDay=today.slice(0,4)+"-01-01";label="This year";break;
    case "last-year": fromDay=(Number(today.slice(0,4))-1)+"-01-01";toDay=(Number(today.slice(0,4))-1)+"-12-31";label="Last year";break;
    case "custom":
     fromDay=String(fromInput?.value||"");
     toDay=String(toInput?.value||"");
     label="Custom range";
     if(!fromDay||!toDay||fromDay>toDay)throw new Error("Choose a valid start and end date.");
     break;
    default: fromDay=addDateDays(today,-29);label="Last 30 days";
   }
   if(selected==="custom")label=fromDay+" to "+toDay;
   return buildRange(fromDay,toDay,label);
  };
  const dayLabelFormatter=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",day:"numeric",month:"short"});
  const monthLabelFormatter=new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",month:"short",year:"numeric"});
  const formatDayLabel=key=>dayLabelFormatter.format(new Date(key+"T12:00:00+06:00"));
  const formatMonthLabel=key=>monthLabelFormatter.format(new Date(key+"-01T12:00:00+06:00"));
    const nextMonthKey=key=>{
   const [year,month]=key.split("-").map(Number);
   return month===12?(year+1)+"-01":year+"-"+String(month+1).padStart(2,"0");
  };
  const buildChartBuckets=range=>{
   const monthly=range.days>62,items=[];
   if(monthly){
    let month=range.fromDay.slice(0,7);
    const last=range.toDay.slice(0,7);
    while(month<=last){items.push({key:month,label:formatMonthLabel(month)});month=nextMonthKey(month);}
   }else{
    for(let offset=0;offset<range.days;offset++){
     const day=addDateDays(range.fromDay,offset);
     items.push({key:day,label:formatDayLabel(day)});
    }
   }
   return {monthly,items};
  };
  const renderOverviewOperationsTrend=()=>{
   if(!overviewTrendSnapshot)return;
   const selected=trendTypeSelect?.value||"area";
   const useBars=selected==="bar";
   drawChart("overviewOperationsChart",{type:useBars?"bar":"line",data:{labels:overviewTrendSnapshot.labels,datasets:[
    {label:"Order item lines",data:overviewTrendSnapshot.orderLineCounts,borderColor:palette.orange,backgroundColor:"#F59E0B22",fill:selected==="area",tension:.32,pointRadius:2,borderWidth:2,borderRadius:useBars?5:0,maxBarThickness:useBars?24:undefined},
    {label:"Add-to-cart events",data:overviewTrendSnapshot.cartEventCounts,borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:false,tension:.32,pointRadius:2,borderWidth:2,borderRadius:useBars?5:0,maxBarThickness:useBars?24:undefined}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href=items[0].datasetIndex===0?"./orders.html":"./analytics.html";}}});
  };
  async function fetchOverviewPages(buildQuery,maxRows){
   const rows=[],pageSize=1000,concurrency=3;
   const firstSize=Math.min(pageSize,maxRows);
   if(firstSize<=0)return rows;
   const first=await signedQuery(buildQuery().range(0,firstSize-1));
   rows.push(...first);
   if(first.length<firstSize)return rows;
   for(let base=pageSize;base<maxRows;base+=pageSize*concurrency){
    const offsets=[];
    for(let offset=base;offset<Math.min(maxRows,base+pageSize*concurrency);offset+=pageSize){
     offsets.push({offset,size:Math.min(pageSize,maxRows-offset)});
    }
    const pages=await Promise.all(offsets.map(({offset,size})=>signedQuery(buildQuery().range(offset,offset+size-1))));
    for(let index=0;index<pages.length;index++){
     rows.push(...pages[index]);
     if(pages[index].length<offsets[index].size)return rows;
    }
   }
   return rows;
  }
  async function fetchOverviewOrderLines(range,maxRows=5000){
   return fetchOverviewPages(()=>{
    const query=client.from("orders").select("id,total,ordered_at,status,order_items(id)").order("ordered_at",{ascending:false}).order("id",{ascending:true});
    return rangeQuery(query,"ordered_at",range);
   },maxRows);
  }
  async function fetchOverviewEvents(range,maxRows=15000){
   const eventNames=["page_view","view_item","add_to_cart"];
   return fetchOverviewPages(()=>{
    const query=client.from("analytics_events").select("event_name,occurred_at,item_name").in("event_name",eventNames).order("occurred_at",{ascending:false}).order("id",{ascending:false});
    return rangeQuery(query,"occurred_at",range);
   },maxRows);
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
   try{
   const range=readOverviewRange();
   const today=localDateKey(new Date());
   const todayRange=buildRange(today,today,"Today");
   const buckets=buildChartBuckets(range);
   const rangeIncludesToday=!!(range.fromDay&&range.toDay&&range.fromDay<=today&&range.toDay>=today);
   const [chartOrders,events,separateTodayOrders,separateTodayEvents,products,pendingResult,recentOrders,financeAllResult,financeRangeResult]=await Promise.all([
   fetchOverviewOrderLines(range,5000),
   fetchOverviewEvents(range,15000),
   rangeIncludesToday?Promise.resolve(null):fetchOverviewOrderLines(todayRange,1000),
   rangeIncludesToday?Promise.resolve(null):fetchOverviewEvents(todayRange,15000),
   fetchProducts(1000),
   client.from("orders").select("id",{count:"exact",head:true}).eq("status","pending"),
   signedQuery(client.from("orders").select("id,order_number,customer_name,total,status,ordered_at").order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(7)),
   fetchFinance(null,3000).then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason})),
   fetchFinance(range,3000).then(value=>({status:"fulfilled",value}),reason=>({status:"rejected",reason}))
  ]);
  const summaryOrders=chartOrders;
  const bucketIndexes=new Map(buckets.items.map((bucket,index)=>[bucket.key,index]));
  const bucketKeyFromDay=day=>buckets.monthly?day.slice(0,7):day;
  const orderLineCounts=buckets.items.map(()=>0);
  const cartEventCounts=buckets.items.map(()=>0);
  const pageViewCounts=buckets.items.map(()=>0);
  const productViewCounts=buckets.items.map(()=>0);
  let todayItemLines=0,todayCartEvents=0,todayOrderCount=0,todayEventCount=0,orderValue=0;
  chartOrders.forEach(order=>{
   const active=order.status!=="cancelled";
   const day=localDateKey(order.ordered_at);
   const lineCount=Array.isArray(order.order_items)?order.order_items.length:0;
   if(day===today){todayOrderCount++;if(active)todayItemLines+=lineCount;}
   if(active)orderValue+=Number(order.total||0);
   const index=bucketIndexes.get(bucketKeyFromDay(day));
   if(active&&index!==undefined)orderLineCounts[index]+=lineCount;
  });
  if(!rangeIncludesToday){
   todayOrderCount=separateTodayOrders.length;
   separateTodayOrders.forEach(order=>{if(order.status!=="cancelled")todayItemLines+=(order.order_items||[]).length;});
  }
  events.forEach(event=>{
   const day=localDateKey(event.occurred_at);
   if(day===today)todayEventCount++;
   if(event.event_name==="add_to_cart"&&day===today)todayCartEvents++;
   const index=bucketIndexes.get(bucketKeyFromDay(day));
   if(index===undefined)return;
   if(event.event_name==="add_to_cart")cartEventCounts[index]++;
   else if(event.event_name==="page_view")pageViewCounts[index]++;
   else if(event.event_name==="view_item")productViewCounts[index]++;
  });
  if(!rangeIncludesToday){
   todayEventCount=separateTodayEvents.length;
   todayCartEvents=separateTodayEvents.reduce((sum,event)=>sum+(event.event_name==="add_to_cart"?1:0),0);
  }
  const todayOrdersCount=todayOrderCount;
  const todayEventsCount=todayEventCount;
  const todayCartCount=todayCartEvents;
  const pendingVerified=!pendingResult.error&&pendingResult.count!==null&&pendingResult.count!==undefined&&Number.isFinite(Number(pendingResult.count));
  const pendingCount=pendingVerified?Number(pendingResult.count):0;
  const lowStock=products.filter(p=>p.is_active&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&p.stock_quantity!==""&&Number.isFinite(Number(p.stock_quantity))&&Number(p.stock_quantity)>0&&Number(p.stock_quantity)<=Number(p.low_stock_threshold??5)).length;
  $("kpiOrders").textContent=shortNum(summaryOrders.length);
   if($("kpiOrdersNote"))$("kpiOrdersNote").textContent=range.label;
   $("kpiTodayItems").textContent=shortNum(todayItemLines);
   $("kpiPending").textContent=pendingVerified?shortNum(pendingCount):"—";
   $("kpiCart").textContent=shortNum(todayCartCount);
   $("kpiOrderValue").textContent=money(orderValue);
   $("kpiNote").textContent=range.label+" · recorded order value is not verified cash income.";
   $("kpiLowStock").textContent=shortNum(lowStock);
   const rangeSummary=$("overviewRangeSummary");
   if(rangeSummary)rangeSummary.textContent=range.label+" · "+range.fromDay+" → "+range.toDay;
   ["overviewOperationsRangeLabel","overviewFinanceRangeLabel","overviewTrafficRangeLabel","overviewStatusRangeLabel","overviewProductsRangeLabel"].forEach(id=>{
    const node=$(id);if(node)node.textContent=range.label;
   });
   const statusNote=$("overviewStatusRangeNote");
   if(statusNote)statusNote.textContent=range.label+" · not payment/delivery confirmation.";
   renderActionCenter(products,pendingCount,pendingVerified);
   let finance=[],financeRange=[],financeAvailable=false,financeRangeAvailable=false;
  if(financeAllResult.status==="fulfilled"){finance=financeAllResult.value;financeAvailable=true;}
  else console.warn("Overview all-time finance summary is unavailable.",financeAllResult.reason);
  if(financeRangeResult.status==="fulfilled"){financeRange=financeRangeResult.value;financeRangeAvailable=true;}
  else console.warn("Overview selected-period finance chart is unavailable.",financeRangeResult.reason);
  let income=0,expenses=0;
  finance.forEach(entry=>{
   if(entry.status!=="confirmed")return;
   const amount=Number(entry.amount||0);
   if(entry.entry_type==="income")income+=amount;
   else if(entry.entry_type==="expense")expenses+=amount;
  });
  const confirmedFinanceRange=financeRange.filter(entry=>entry.status==="confirmed");
  $("financeSummaryIncome").textContent=financeAvailable?money(income):"Unavailable";
   $("financeSummaryExpenses").textContent=financeAvailable?money(expenses):"Unavailable";
   $("financeSummaryNet").textContent=financeAvailable?money(income-expenses):"Unavailable";
   $("financeSummaryNote").textContent=financeAvailable
    ?"Confirmed manual entries only. COD settlement is not reconciled here."
    :"Finance unavailable. Refresh after signing in and completing MFA.";
   const labels=buckets.items.map(item=>item.label);
   overviewTrendSnapshot={labels,orderLineCounts,cartEventCounts};
    renderOverviewOperationsTrend();
   const financeIncomeCounts=buckets.items.map(()=>0),financeExpenseCounts=buckets.items.map(()=>0);
  const financeBucketIndexes=new Map(buckets.items.map((bucket,index)=>[bucket.key,index]));
  confirmedFinanceRange.forEach(entry=>{
   const day=String(entry.entry_date||"").slice(0,10);
   const index=financeBucketIndexes.get(bucketKeyFromDay(day));
   if(index===undefined)return;
   const amount=Number(entry.amount||0);
   if(entry.entry_type==="income")financeIncomeCounts[index]+=amount;
   else if(entry.entry_type==="expense")financeExpenseCounts[index]+=amount;
  });
  const financeCanvas=$("overviewFinanceChart");
   if(financeRangeAvailable){
    if(financeCanvas)financeCanvas.hidden=false;
    $("overviewFinanceChartNote").textContent="Confirmed ledger entries in the selected period · not a bank/COD balance.";
    drawChart("overviewFinanceChart",{type:"bar",data:{labels,datasets:[
     {label:"Recorded income",data:financeIncomeCounts,backgroundColor:palette.green,borderRadius:5,maxBarThickness:24},
     {label:"Recorded expenses",data:financeExpenseCounts,backgroundColor:palette.orange,borderRadius:5,maxBarThickness:24}
    ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}},onClick:()=>{location.href="./finance.html";}}});
   }else{
    if(financeCanvas)financeCanvas.hidden=true;
    $("overviewFinanceChartNote").textContent="Finance chart unavailable for the selected period. The all-time summary is reported separately.";
   }
   drawChart("overviewTrafficChart",{type:"line",data:{labels,datasets:[
    {label:"Page views",data:pageViewCounts,borderColor:palette.blue,backgroundColor:"#4F7CFF20",fill:true,tension:.35,pointRadius:2,borderWidth:2},
    {label:"Product views",data:productViewCounts,borderColor:palette.orange,backgroundColor:"#C97B3D18",fill:true,tension:.35,pointRadius:2,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}}}});
   drawChart("overviewStatusChart",{type:"doughnut",data:orderStatusCounts(summaryOrders),options:{cutout:"67%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   renderTopProducts($("overviewTopProducts"),topProducts(events,products).slice(0,5));
   renderRecentOrders(recentOrders);
   $("overviewUpdated").textContent="Updated "+new Date().toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"});
   const limits=[];
   if(summaryOrders.length>=5000)limits.push("Order summary reached the 5,000-row limit.");
   if(chartOrders.length>=5000)limits.push("Order trend reached the 5,000-row limit.");
   if(events.length>=15000)limits.push("Website activity reached the 15,000-event limit.");
   if(todayOrdersCount>=1000)limits.push("Today's order-line count reached its 1,000-order limit.");
   if(todayEventsCount>=15000)limits.push("Today's cart-event count reached its 15,000-event limit.");
   if(products.length>=1000)limits.push("Stock alerts reached the 1,000-product retrieval limit.");
   if(finance.length>=3000)limits.push("All-time Finance Snapshot reached its 3,000-entry retrieval limit.");
   if(financeRange.length>=3000)limits.push("Selected-period Finance Chart reached its 3,000-entry retrieval limit.");
   $("overviewDataNote").textContent=events.length+" page, product and cart events · "+range.label+" · "+summaryOrders.length+" orders. Order lines are product rows, not quantities; cart additions are events, not current cart. "+(pendingVerified?"Pending count verified.":"Pending count unavailable; shown as —.")+" Records do not confirm payment or delivery."+(limits.length?" "+limits.join(" "):"");
   }catch(error){
    const note=$("overviewDataNote");
    if(note)note.textContent="Overview data could not be refreshed. Any values still visible are from the last successful load; please retry.";
    console.error("Overview refresh failed.",error);
    throw new Error("Overview could not be refreshed. Please try again.");
   }
  }
  const toggleCustomRange=()=>{if(customRange)customRange.hidden=rangeSelect?.value!=="custom";};
  if(fromInput&&!fromInput.value)fromInput.value=localDateKey(new Date());
  if(toInput&&!toInput.value)toInput.value=localDateKey(new Date());
  rangeSelect?.addEventListener("change",()=>{
   toggleCustomRange();
   if(rangeSelect.value!=="custom")refresh().catch(()=>toast("Overview could not be refreshed. Please try again.","error"));
  });
  $("overviewApplyRange")?.addEventListener("click",()=>refresh().catch(()=>toast("Overview could not be refreshed. Please try again.","error")));
  trendTypeSelect?.addEventListener("change",renderOverviewOperationsTrend);
  toggleCustomRange();
  try{await refresh();}catch(_overviewError){toast("Overview could not be loaded. Please check the connection and refresh.","error");}
  attachRefresh(refresh);
 }
 async function initAnalytics(){
  let plotlyLoadPromise=null,latest3DModel=null,threeDInView=false,analyticsCoveragePromise=null;
  function getAnalyticsCoverage(){
   if(!analyticsCoveragePromise){
    analyticsCoveragePromise=fetchEvents(null,15000).then(rows=>{
     const days=rows.map(event=>dhakaDateKey(event.occurred_at)).filter(Boolean).sort();
     return {firstTrackedDay:days[0]||null,complete:rows.length<15000,rowsFetched:rows.length};
    });
   }
   return analyticsCoveragePromise;
  }
  function loadAnalytics3D(){
   if(window.Plotly)return Promise.resolve(window.Plotly);
   if(plotlyLoadPromise)return plotlyLoadPromise;
   plotlyLoadPromise=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.plot.ly/plotly-gl3d-4.1.2.min.js";
    script.async=true;
    script.onload=()=>window.Plotly?resolve(window.Plotly):reject(new Error("3D chart library did not initialise."));
    script.onerror=()=>reject(new Error("3D chart library could not be loaded."));
    document.head.appendChild(script);
   });
   return plotlyLoadPromise;
  }
  async function renderAnalytics3D(){
   const target=$("analytics3DChart");if(!target||!latest3DModel||!threeDInView)return;
   target.dataset.state="loading";
   try{
    const Plotly=await loadAnalytics3D(),model=latest3DModel,theme=chartTheme();
    const traces=model.series.map((item,index)=>({
     type:"scatter3d",mode:"lines+markers",name:item.label,
     x:model.labels.map((_,position)=>position),y:model.labels.map(()=>index),z:item.values,
     customdata:model.labels.map(label=>[label,item.label]),
     line:{color:item.color,width:5},marker:{size:4,color:item.color,opacity:.92,line:{color:theme.surface,width:1}},
     hovertemplate:"<b>%{customdata[0]}</b><br>%{customdata[1]}<br>%{z} events<extra></extra>"
    }));
    const allTicks=model.labels.map((_,index)=>index),maxTicks=8,step=Math.max(1,Math.ceil(allTicks.length/maxTicks));
    const visibleTicks=allTicks.filter((value,index)=>index%step===0||index===allTicks.length-1);
    await Plotly.react(target,traces,{
     autosize:true,height:410,margin:{l:8,r:12,t:12,b:12},paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",
     font:{family:'Inter, "Segoe UI", system-ui, sans-serif',size:11,color:theme.text},legend:{orientation:"h",y:-.12,x:0},
     scene:{
      bgcolor:"rgba(0,0,0,0)",aspectmode:"manual",aspectratio:{x:2.1,y:1.1,z:.85},camera:{eye:{x:1.55,y:1.55,z:1.12}},
      xaxis:{title:{text:"Date"},tickmode:"array",tickvals:visibleTicks,ticktext:visibleTicks.map(i=>model.labels[i]),gridcolor:theme.grid,color:theme.muted,zerolinecolor:theme.grid},
      yaxis:{title:{text:"Action"},tickmode:"array",tickvals:model.series.map((_,i)=>i),ticktext:model.series.map(item=>item.label),range:[-.45,model.series.length-.55],gridcolor:theme.grid,color:theme.muted,zerolinecolor:theme.grid},
      zaxis:{title:{text:"Event count"},rangemode:"tozero",gridcolor:theme.grid,color:theme.muted,zerolinecolor:theme.grid}
     }
    },{responsive:true,displaylogo:false,scrollZoom:false,modeBarButtonsToRemove:["toImage","sendDataToCloud"]});
    target.dataset.state="ready";
   }catch(error){
    target.dataset.state="unavailable";
    target.innerHTML='<div class="hf-analytics-3d-fallback"><strong>3D view is unavailable in this browser.</strong><span>The interactive 2D charts and comparisons remain available. Check WebGL support or your network connection.</span></div>';
   }
  }
  const threeDTarget=$("analytics3DChart");
  if(threeDTarget){
   if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){threeDInView=true;observer.disconnect();renderAnalytics3D();}},{rootMargin:"160px"});
    observer.observe(threeDTarget);
   }else threeDInView=true;
  }

  
  let pageActivityView="hour",latestPageActivity=null;
  const pageActivityViews={
   hour:{title:"Page activity by hour",description:"Compare page views by weekday and local clock hour across the selected reporting period.",note:"Hourly activity is grouped by Bangladesh weekday and clock hour. Each cell combines all matching dates in the selected range."},
   month:{title:"Page activity by month",description:"Compare page views across dates in the selected reporting period.",note:"Each box represents one date in the selected range. Colour intensity shows page-view volume; hover or tap for the exact count."}
  };
  function renderPageActivity(){
   const config=pageActivityViews[pageActivityView]||pageActivityViews.hour;
   const title=$("analyticsActivityTitle"),description=$("analyticsActivityDescription"),note=$("analyticsActivityNote");
   const heatmap=$("analyticsActivityHeatmap"),monthGrid=$("analyticsActivityMonthGrid");
   if(title)title.textContent=config.title;
   if(description)description.textContent=config.description;
   document.querySelectorAll("[data-activity-view]").forEach(button=>{
    const active=button.dataset.activityView===pageActivityView;
    button.setAttribute("aria-pressed",active?"true":"false");
    button.classList.toggle("is-active",active);
   });
   if(!latestPageActivity)return;
   const data=latestPageActivity;
   if(data.noTrackedData&&pageActivityView==="hour"){
    if(heatmap)heatmap.hidden=true;
    if(monthGrid)monthGrid.hidden=true;
    if(note)note.textContent="No tracked page-view data is available in this selected period. Earlier dates are not counted as zero.";
    return;
   }
   const pageRows=data.events.filter(event=>event.event_name==="page_view"&&event.occurred_at);
   const locale=document.documentElement.lang==="bn"?"bn-BD":"en-BD";
   const englishDays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
   const displayDays=Array.from({length:7},(_,index)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Dhaka",weekday:"short"}).format(new Date(Date.UTC(2023,0,1+index,6))));
   const hourLabel=hour=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Dhaka",hour:"numeric",hour12:true}).format(new Date(Date.UTC(2023,0,1,hour-6)));
   const setActivityNote=()=>{
    let message=config.note;
    if(data.requestedFrom&&data.firstTrackedDay&&data.requestedFrom<data.firstTrackedDay){
     message+=pageActivityView==="month"
      ?" Dates before tracking coverage ("+data.firstTrackedDay+") are shown as Not tracked, not zero activity."
      :" Dates before tracking coverage ("+data.firstTrackedDay+") are excluded from the hourly totals, not counted as zero.";
    }
    if(!data.historyComplete)message+=" History may be limited to the latest 15,000 fetched events.";
    if(note)note.textContent=message;
   };
   if(pageActivityView==="hour"){
    const hourFormatter=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dhaka",hour:"2-digit",hourCycle:"h23"});
    const cells=Array.from({length:7},()=>Array(24).fill(0));
    pageRows.forEach(event=>{
     const date=new Date(event.occurred_at);
     if(Number.isNaN(date.getTime()))return;
     const weekday=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dhaka",weekday:"short"}).format(date);
     const parts=hourFormatter.formatToParts(date);
     const hour=Number(parts.find(part=>part.type==="hour")?.value);
     const dayIndex=englishDays.indexOf(weekday);
     if(dayIndex>=0&&Number.isInteger(hour)&&hour>=0&&hour<24)cells[dayIndex][hour]++;
    });
    const maximum=Math.max(1,...cells.flat());
    const themeColor=String(colorSet[0]||palette.blue||"#C97B3D");
    const safeThemeColor=/^#[0-9a-f]{3,8}$/i.test(themeColor)?themeColor:"#C97B3D";
    const header='<div class="hf-analytics-heatmap-label">Day</div><div class="hf-analytics-heatmap-hours">'+Array.from({length:24},(_,hour)=>'<span>'+([0,6,12,18].includes(hour)?hourLabel(hour):"")+'</span>').join("")+'</div>';
    heatmap.innerHTML=header+cells.map((row,dayIndex)=>{
     const cellHtml=row.map((count,hour)=>{
      const tip=displayDays[dayIndex]+" · "+hourLabel(hour)+" · "+shortNum(count)+" page views";
      const mix=(count/maximum*78).toFixed(0)+"%";
      return '<span class="hf-analytics-heatmap-cell" style="--activity-mix:'+mix+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'"></span>';
     }).join("");
     return '<div class="hf-analytics-heatmap-label">'+esc(displayDays[dayIndex])+'</div><div class="hf-analytics-heatmap-hours">'+cellHtml+'</div>';
    }).join("");
    heatmap.style.setProperty("--activity-color",safeThemeColor);
    heatmap.hidden=false;
    if(monthGrid)monthGrid.hidden=true;
    setActivityNote();
    return;
   }
   const dailyCounts=new Map();
   pageRows.forEach(event=>{
    const day=dhakaDateKey(event.occurred_at);
    if(!day||day<data.requestedFrom||day>data.requestedTo)return;
    dailyCounts.set(day,(dailyCounts.get(day)||0)+1);
   });
   const dayKeys=[];
   for(let day=data.requestedFrom;day<=data.requestedTo;day=addDhakaDays(day,1))dayKeys.push(day);
   const observedPageDays=pageRows.map(event=>dhakaDateKey(event.occurred_at)).filter(Boolean).sort();
   const trackingStart=data.firstTrackedDay||observedPageDays[0]||"";
   const maximum=Math.max(1,...dayKeys.filter(day=>trackingStart&&day>=trackingStart).map(day=>dailyCounts.get(day)||0));
   const themeColors=Array.isArray(colorSet)&&colorSet.length?colorSet:["#C97B3D"];
   const numberFormat=new Intl.NumberFormat(locale);
   const dayFormatter=new Intl.DateTimeFormat(locale,{timeZone:"Asia/Dhaka",day:"numeric",month:"short"});
   const dayCells=dayKeys.map(day=>{
    const parts=day.split("-").map(Number);
    const date=new Date(Date.UTC(parts[0],parts[1]-1,parts[2],6));
    const tracked=Boolean(trackingStart&&day>=trackingStart);
    const count=dailyCounts.get(day)||0;
    const intensity=count/maximum;
    const colorIndex=count?Math.min(themeColors.length-1,Math.floor(intensity*themeColors.length)):0;
    const cellColor=String(themeColors[colorIndex]||palette.blue||"#C97B3D");
    const safeColor=/^#[0-9a-f]{3,8}$/i.test(cellColor)?cellColor:"#C97B3D";
    const mix=count?(16+intensity*76).toFixed(0)+"%":"0%";
    const label=dayFormatter.format(date);
    const stateLabel=tracked?(numberFormat.format(count)+" page views"):"tracking not yet available";
    const tip=label+" · "+stateLabel;
    const peak=tracked&&count>0&&count===maximum;
    const stateClass=tracked?(count?"":" is-zero"):" is-untracked";
    const countLabel=tracked?numberFormat.format(count):"—";
    const footerLabel=tracked?"views":(locale==="bn-BD"?"ট্র্যাকিং নেই":"Not tracked");
    return '<div class="hf-page-activity-day-cell'+(peak?' is-peak':"")+stateClass+'" style="--activity-color:'+safeColor+';--activity-mix:'+(tracked?mix:"0%")+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'"><span class="hf-page-activity-day-date">'+esc(label)+'</span><strong class="hf-page-activity-day-count">'+countLabel+'</strong><small>'+footerLabel+'</small></div>';
   });
   monthGrid.innerHTML=dayCells.join("");
   heatmap.hidden=true;
   monthGrid.hidden=false;
   setActivityNote();
  }
  document.querySelectorAll("[data-activity-view]").forEach(button=>{
   button.addEventListener("click",()=>{
    const next=button.dataset.activityView;
    if(!pageActivityViews[next]||next===pageActivityView)return;
    pageActivityView=next;
    renderPageActivity();
   });
  });
  const activityThemeObserver=new MutationObserver(()=>{
   if(latestPageActivity)renderPageActivity();
  });
  activityThemeObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-hf-theme"]});
  renderPageActivity();

  async function refresh(){
   const range=selectedRange();
   const [rawEvents,orders,products,coverage]=await Promise.all([fetchEvents(range,15000),fetchOrders(range,5000),fetchProducts(),getAnalyticsCoverage()]);
   const firstTrackedDay=coverage.firstTrackedDay,historyComplete=coverage.complete;
   const prepared=prepareAnalyticsEvents(rawEvents),events=prepared.events;
   const observedDays=events.map(event=>dhakaDateKey(event.occurred_at)).filter(Boolean).sort();
   const requestedFrom=range.fromDay||(observedDays[0]||firstTrackedDay||dhakaDateKey(new Date()));
   const requestedTo=range.toDay||(observedDays[observedDays.length-1]||dhakaDateKey(new Date()));
   const noTrackedData=Boolean(firstTrackedDay&&requestedTo<firstTrackedDay);
   const chartFrom=firstTrackedDay&&requestedFrom<firstTrackedDay&&!noTrackedData?firstTrackedDay:requestedFrom;
   const chartTo=requestedTo;
   const chartDays=noTrackedData?0:Math.max(1,Math.round((Date.parse(chartTo+"T00:00:00Z")-Date.parse(chartFrom+"T00:00:00Z"))/86400000)+1);
   const monthly=chartDays>62,trendBuckets=[];
   if(monthly){
    let month=chartFrom.slice(0,7),last=chartTo.slice(0,7);
    while(month<=last){trendBuckets.push({key:month,label:new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",month:"short",year:"numeric"}).format(new Date(month+"-15T12:00:00+06:00"))});const [year,monthNo]=month.split("-").map(Number);const next=new Date(Date.UTC(year,monthNo,1));month=next.getUTCFullYear()+"-"+String(next.getUTCMonth()+1).padStart(2,"0");}
   }else{
    for(let offset=0;offset<chartDays;offset++){const day=addDhakaDays(chartFrom,offset);trendBuckets.push({key:day,label:new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",day:"numeric",month:"short"}).format(new Date(day+"T12:00:00+06:00"))});}
   }
   const trendCountsByEvent=new Map();
   events.forEach(event=>{if(!["page_view","view_item","add_to_cart"].includes(event.event_name))return;const day=dhakaDateKey(event.occurred_at);const key=monthly?day.slice(0,7):day;const mapKey=event.event_name+"|"+key;trendCountsByEvent.set(mapKey,(trendCountsByEvent.get(mapKey)||0)+1);});
   const trendSeries=name=>trendBuckets.map(bucket=>trendCountsByEvent.get(name+"|"+bucket.key)||0);
   drawChart("analyticsTrafficChart",{type:"line",data:{labels:trendBuckets.map(bucket=>bucket.label),datasets:[
    {label:"Page views",data:trendSeries("page_view"),borderColor:palette.blue,backgroundColor:palette.blue+"24",fill:true,tension:.38,pointRadius:2.2,pointHoverRadius:6,pointBorderWidth:2,pointBackgroundColor:chartTheme().surface,borderWidth:2.8},
    {label:"Product views",data:trendSeries("view_item"),borderColor:palette.orange,backgroundColor:palette.orange+"22",fill:true,tension:.38,pointRadius:2.2,pointHoverRadius:6,pointBorderWidth:2,pointBackgroundColor:chartTheme().surface,borderWidth:2.8},
    {label:"Cart additions",data:trendSeries("add_to_cart"),borderColor:palette.green,backgroundColor:palette.green+"20",fill:false,tension:.38,pointRadius:2.2,pointHoverRadius:6,pointBorderWidth:2,pointBackgroundColor:chartTheme().surface,borderWidth:2.8}
   ]},options:{...chartAxisOptions(),animation:{duration:850,easing:"easeOutQuart"},interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom"},tooltip:{usePointStyle:true}}}});
   const comparisonNote=$("analyticsComparisonNote"),comparisonCanvas=$("analyticsComparisonChart");
   let comparisonMessage="Select a fixed date range to compare it with the immediately preceding period of the same length.";
   if(range.fromDay&&range.toDay&&range.days&&historyComplete&&firstTrackedDay){
    const previousFrom=addDhakaDays(range.fromDay,-range.days),previousTo=addDhakaDays(range.toDay,-range.days);
    if(previousFrom>=firstTrackedDay){
     const previousRange=buildDhakaRange(previousFrom,previousTo,"Previous period");
     const previousRaw=await fetchEvents(previousRange,15000);
     const previousEvents=prepareAnalyticsEvents(previousRaw).events;
     const metrics=[{key:"page_view",label:"Page views"},{key:"view_item",label:"Product views"},{key:"add_to_cart",label:"Cart adds"},{key:"begin_checkout",label:"Checkout starts"},{key:"order_submit",label:"Order submits"}];
     const currentValues=metrics.map(item=>events.filter(event=>event.event_name===item.key).length);
     const previousValues=metrics.map(item=>previousEvents.filter(event=>event.event_name===item.key).length);
     if(comparisonCanvas)comparisonCanvas.hidden=false;
     drawChart("analyticsComparisonChart",{type:"bar",data:{labels:metrics.map(item=>item.label),datasets:[
      {label:"Previous period",data:previousValues,backgroundColor:palette.navy+"B8",borderColor:palette.navy,borderWidth:1,borderRadius:8,borderSkipped:false,maxBarThickness:38},
      {label:"Selected period",data:currentValues,backgroundColor:palette.orange+"D8",borderColor:palette.orange,borderWidth:1,borderRadius:8,borderSkipped:false,maxBarThickness:38}
     ]},options:{...chartAxisOptions(),animation:{duration:850,easing:"easeOutQuart"},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:context=>context.dataset.label+": "+shortNum(context.raw)+" events"}}}}});
     comparisonMessage="Selected "+range.fromDay+" to "+range.toDay+" compared with "+previousFrom+" to "+previousTo+". Event counts are shown; this is not a conversion-rate comparison.";
    }else{
     comparisonMessage="Comparison unavailable: the previous period begins before tracking coverage (first recorded event "+firstTrackedDay+"). Missing tracking history is not treated as zero activity.";
     if(comparisonCanvas)comparisonCanvas.hidden=true;
    }
   }else{
    if(!range.fromDay)comparisonMessage="Comparison unavailable for All available time. Choose a finite date range.";
    else if(!firstTrackedDay)comparisonMessage="Comparison unavailable: no tracking history is available.";
    else if(!historyComplete)comparisonMessage="Comparison unavailable: event history reached the 15,000-record retrieval limit, so the earliest coverage date cannot be verified.";
    if(comparisonCanvas)comparisonCanvas.hidden=true;
   }
   if(comparisonNote)comparisonNote.textContent=comparisonMessage;
   latest3DModel={labels:trendBuckets.map(bucket=>bucket.label),series:[
    {label:"Page views",values:trendSeries("page_view"),color:palette.blue},
    {label:"Product views",values:trendSeries("view_item"),color:palette.orange},
    {label:"Cart adds",values:trendSeries("add_to_cart"),color:palette.green},
    {label:"Checkout starts",values:trendSeries("begin_checkout"),color:palette.purple},
    {label:"Order submits",values:trendSeries("order_submit"),color:palette.red}
   ]};
   renderAnalytics3D();
   const top=topProducts(events,products);
   drawChart("analyticsProductChart",{type:"polarArea",data:{labels:top.slice(0,7).map(x=>x.name),datasets:[{data:top.slice(0,7).map(x=>x.count),backgroundColor:colorSet,borderColor:chartTheme().surface,borderWidth:2,hoverOffset:9}]},options:{animation:{duration:850,easing:"easeOutQuart"},scales:{r:{ticks:{display:false,color:chartTheme().muted},grid:{color:chartTheme().grid}}},plugins:{legend:{position:"bottom"}}}});
   const pageStats=buildPageExperience(events);
   latestPageActivity={events,range,requestedFrom,requestedTo,chartFrom,chartTo,noTrackedData,firstTrackedDay,historyComplete};
   renderPageActivity();
   renderPageActivity();
   const health=$("analyticsDataHealth"),rawTotal=prepared.rawCount;
   if(health){
    const idCoverage=rawTotal?Math.round((rawTotal-prepared.missingIds)/rawTotal*100):0,sessionCoverage=rawTotal?Math.round(prepared.identified/rawTotal*100):0,attributionCoverage=rawTotal?Math.round(prepared.attributed/rawTotal*100):0;
    const healthItems=[
     ["Canonical page paths",shortNum(prepared.cleanedPaths)+" normalized","Duplicate slashes and home-page aliases are grouped for analytics; source rows remain unchanged."],
     ["Event ID coverage",idCoverage+"% present",Math.round(prepared.missingIds/Math.max(1,rawTotal)*100)+"% of fetched events have no event_id. Missing IDs are not assumed to be duplicates."],
     ["Session coverage",sessionCoverage+"% identified",shortNum(rawTotal-prepared.identified)+" events lack a session/anonymous ID and are excluded from the sequential funnel."],
     ["Attribution tags",attributionCoverage+"% tagged","Source, medium or campaign metadata is not yet complete enough for channel-level conclusions."],
     ["Duplicate event IDs",shortNum(prepared.duplicateIds)+" suppressed","Only repeated non-empty event_id values are de-duplicated; records without IDs are preserved."]
    ];
    health.innerHTML=healthItems.map((item,index)=>'<div class="hf-analytics-health-item"><span>'+esc(item[0])+'</span><strong class="'+(index===1&&idCoverage<70||index===3&&attributionCoverage<20?"is-warning":"")+'">'+esc(item[1])+'</strong><small>'+esc(item[2])+'</small></div>').join("");
   }
   const healthNote=$("analyticsDataHealthNote");
   if(healthNote){
    const purchaseCount=events.filter(event=>event.event_name==="purchase").length,successCount=events.filter(event=>event.event_name==="order_success").length;
    healthNote.textContent="Purchase events ("+purchaseCount+") and order_success events ("+successCount+") remain separate because their identity coverage and event meanings differ. Neither is treated as verified payment or real revenue.";
   }
   const timedPages=pageStats.filter(p=>p.timingCount>0).sort((a,b)=>b.visibleSeconds-a.visibleSeconds).slice(0,8);
   drawChart("analyticsSourceChart",{type:"bar",data:{labels:timedPages.map(p=>p.path.length>24?p.path.slice(0,21)+"…":p.path),datasets:[{label:"Visible time",data:timedPages.map(p=>p.visibleSeconds),backgroundColor:colorSet,borderRadius:7,maxBarThickness:34}]},options:{indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>formatSeconds(context.raw)}}},scales:{x:{beginAtZero:true,ticks:{color:chartTheme().muted,callback:value=>value+"s"},grid:{color:chartTheme().grid}},y:{ticks:{color:palette.navy},grid:{display:false}}}}});
   const funnelEvents=events.map(e=>e);renderFunnel(funnelEvents);
   drawChart("analyticsOrdersChart",{type:"doughnut",data:orderStatusCounts(orders),options:{cutout:"60%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   const total=events.length,views=events.filter(e=>e.event_name==="page_view").length,pv=events.filter(e=>e.event_name==="view_item").length,carts=events.filter(e=>e.event_name==="add_to_cart").length,wa=events.filter(e=>e.event_name==="whatsapp_click").length;
   $("analyticsEventsCount").textContent=shortNum(total);$("analyticsPageViews").textContent=shortNum(views);$("analyticsProductViews").textContent=shortNum(pv);$("analyticsCartAdds").textContent=shortNum(carts);$("analyticsWhatsApp").textContent=shortNum(wa);
   const coverageNote=firstTrackedDay&&range.fromDay&&range.fromDay<firstTrackedDay?" Tracking coverage in the selected range begins "+firstTrackedDay+". Earlier dates are untracked, not zero activity.":"";
   $("analyticsReportHint").textContent=range.label+" · "+total.toLocaleString("en-BD")+" de-duplicated events · "+orders.length.toLocaleString("en-BD")+" orders. "+(monthly?"Trend grouped by month.":"Daily trend.")+coverageNote+(rawEvents.length>=15000?" Event query reached its 15,000-record limit.":"");
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
   const matrixRows=productRows.filter(row=>row.viewSessions.size>0&&row.viewToCartRate!=null).slice(0,60);
   const matrixCanvas=$("analyticsProductMatrixChart"),matrixNote=$("analyticsProductMatrixNote");
   if(matrixCanvas){
    matrixCanvas.hidden=!matrixRows.length;
    if(matrixRows.length){
     const matrixPoints=matrixRows.map(row=>({x:row.viewSessions.size,y:row.viewToCartRate,r:Math.max(5,Math.min(18,5+Math.sqrt(row.cartAdds)*2)),productName:row.product.name,views:row.views,cartAdds:row.cartAdds,viewSessions:row.viewSessions.size,cartSessions:row.cartAfterViewSessions.size}));
     drawChart("analyticsProductMatrixChart",{type:"bubble",data:{datasets:[{label:"Products",data:matrixPoints,backgroundColor:palette.orange+"8A",borderColor:palette.navy,borderWidth:1.4,hoverRadius:4}]},options:{...chartAxisOptions(),animation:{duration:750},plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>{const point=context.raw;return [point.productName,point.viewSessions+" unique product-view sessions",Math.round(point.y)+"% viewed-to-cart session rate",point.cartAdds+" cart-add events"];}}}},scales:{x:{type:"linear",beginAtZero:true,title:{display:true,text:"Unique product-view sessions",color:chartTheme().muted},ticks:{color:chartTheme().muted,precision:0},grid:{color:chartTheme().grid}},y:{min:0,max:100,title:{display:true,text:"View-to-cart session rate (%)",color:chartTheme().muted},ticks:{color:chartTheme().muted,callback:value=>value+"%"},grid:{color:chartTheme().grid}}}}});
     if(matrixNote)matrixNote.textContent="Each bubble is one product. Horizontal position = unique sessions that viewed it; vertical position = sessions that later added it to cart; bubble size reflects cart-add event volume. Small samples can produce volatile rates.";
    }else if(matrixNote)matrixNote.textContent="No matched product-view sessions are available for this period.";
   }
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

   $("analyticsTopProducts").innerHTML=top.length?top.map((x,i)=>'<div class="hf-insight-row">'+(x.product?.image_url?'<img class="hf-thumb" src="'+esc(x.product.image_url)+'" alt="">':'<span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span>')+'<div><strong>'+esc(x.name)+'</strong><small>'+esc(x.product?.category||"No category match")+'</small></div><span class="hf-insight-number">'+shortNum(x.count)+'</span></div>').join(""):makeEmpty("No product-view data","Check again after the website has recorded product views.");
   $("analyticsEventBreakdown").innerHTML=groupBy(events,e=>e.event_name).slice(0,12).map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+shortNum(x.count)+'</td><td>'+(total?Math.round(x.count/total*100)+"%":"—")+'</td></tr>').join("")||'<tr><td colspan="3">'+makeEmpty("No events yet","No website events were recorded in this date range.")+'</td></tr>';
   const aiEvents=events.filter(event=>String(event.event_name||"").startsWith("ai_"));
   const aiCount=name=>aiEvents.filter(event=>event.event_name===name).length;
   const aiIntents=aiEvents.filter(event=>event.event_name==="ai_intent_detected");
   $("aiAnalyticsConversations").textContent=shortNum(aiIntents.length);
   $("aiAnalyticsAllowed").textContent=shortNum(aiCount("ai_recommendation_allowed"));
   $("aiAnalyticsSuppressed").textContent=shortNum(aiCount("ai_recommendation_suppressed"));
   $("aiAnalyticsImages").textContent=shortNum(aiCount("ai_image_search_started"));
   $("aiAnalyticsResolved").textContent=shortNum(aiCount("ai_search_resolved"));
   $("aiAnalyticsCorrections").textContent=shortNum(aiCount("ai_customer_corrected")+aiCount("ai_recommendation_rejected"));
   const intentRows=groupBy(aiIntents,event=>String(event.metadata?.primary_intent||"unknown").replace(/_/g," "));
   $("aiAnalyticsIntentBody").innerHTML=intentRows.length?intentRows.map(row=>'<tr><td>'+esc(row.label)+'</td><td>'+shortNum(row.count)+'</td><td>'+Math.round(row.count/Math.max(1,aiIntents.length)*100)+'%</td></tr>').join(""):'<tr><td colspan="3">'+makeEmpty("No AI intent data yet","New customer-care conversations will appear here after Stage 2 is live.")+'</td></tr>';
   const aiOutcomeRows=[
    ["Exact product matches",aiCount("ai_exact_product_match")],
    ["Product match failures",aiCount("ai_product_match_failed")],
    ["Clarifications requested",aiCount("ai_clarification_requested")],
    ["Image searches completed",aiCount("ai_image_search_completed")],
    ["Customer corrections",aiCount("ai_customer_corrected")],
    ["Recommendation rejections",aiCount("ai_recommendation_rejected")],
    ["Product searches resolved",aiCount("ai_search_resolved")]
   ];
   $("aiAnalyticsOutcomeBody").innerHTML=aiOutcomeRows.map(row=>'<tr><td>'+esc(row[0])+'</td><td>'+shortNum(row[1])+'</td></tr>').join("");
   const aiProducts=new Map();
   aiEvents.filter(event=>event.event_name==="ai_product_card_shown"||event.event_name==="ai_product_clicked").forEach(event=>{
    const name=String(event.item_name||"Unknown product");
    if(!aiProducts.has(name))aiProducts.set(name,{name,shown:0,clicks:0});
    const row=aiProducts.get(name);
    if(event.event_name==="ai_product_card_shown")row.shown++;
    if(event.event_name==="ai_product_clicked")row.clicks++;
   });
   const aiProductRows=Array.from(aiProducts.values()).sort((a,b)=>b.clicks-a.clicks||b.shown-a.shown).slice(0,12);
   $("aiAnalyticsProductBody").innerHTML=aiProductRows.length?aiProductRows.map(row=>'<tr><td><strong>'+esc(row.name)+'</strong></td><td>'+shortNum(row.shown)+'</td><td>'+shortNum(row.clicks)+'</td><td>'+(row.shown?Math.round(row.clicks/row.shown*100)+'%':'—')+'</td></tr>').join(""):'<tr><td colspan="4">'+makeEmpty("No AI product-card interactions yet","Product impressions and clicks will appear here when customers use the assistant.")+'</td></tr>';
   $("aiAnalyticsCoverageNote").textContent=aiEvents.length
    ? aiEvents.length.toLocaleString("en-BD")+" AI intelligence events in the selected period. These are first-party behavioural signals; they do not identify a person or prove purchase."
    : "No Stage 2 AI events were recorded in this period. Events begin after the new customer-care deployment; older chats are not backfilled.";

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

  async function loadOrderProductCodes(orderRows){
   const ids=[...new Set((orderRows||[]).flatMap(order=>(order.order_items||[]).map(item=>item.product_id).filter(Boolean)))];
   if(!ids.length)return new Map();
   const rows=await signedQuery(client.from("products").select("id,sku,slug").in("id",ids));
   return new Map(rows.map(product=>[product.id,product]));
  }
  function orderProductCodeMarkup(product){
   if(!product?.sku)return '<small class="code-missing">Product code unavailable</small>';
   let barcode="",qr="";
   try{
    if(window.JsBarcode){
     const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
     window.JsBarcode(svg,product.sku,{format:"CODE128",width:1.45,height:28,displayValue:false,margin:0,background:"#fff",lineColor:"#282738"});
     barcode=svg.outerHTML;
    }
    if(window.QRCode){
     const holder=document.createElement("div");
     new QRCode(holder,{text:"https://faysaltalukder.github.io/halalfood/product-lookup.html?sku="+encodeURIComponent(product.sku),width:90,height:90,colorDark:"#2B2A3D",colorLight:"#FFFFFF"});
     const canvas=holder.querySelector("canvas"),image=holder.querySelector("img");
     qr=canvas?canvas.toDataURL("image/png"):(image?.src||"");
    }
   }catch(error){console.warn("Product code rendering failed",error);}
   return '<div class="order-product-code"><div class="order-product-code-bars">'+barcode+'</div>'+(qr?'<img class="order-product-code-qr" src="'+qr+'" alt="Scan product information">':"")+'<small>SKU '+esc(product.sku)+'</small></div>';
  }
  function printPackingSlip(order){
   const win=window.open("","_blank");
   if(!win){toast("Printing window was blocked. Allow pop-ups for this admin page and try again.","error");return;}
   (async()=>{
    try{
     const codeMap=await loadOrderProductCodes([order]);
     const orderNo=order.order_number||String(order.id).slice(0,8);
     const itemRows=(order.order_items||[]).map(item=>"<tr><td><strong>"+esc(item.product_name)+"</strong>"+orderProductCodeMarkup(codeMap.get(item.product_id))+"</td><td>"+esc(item.quantity)+" "+esc(item.unit||"")+"</td><td>"+money(item.unit_price)+"</td><td>"+money(item.line_total)+"</td></tr>").join("");
     const html="<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Halal Food · Order "+esc(orderNo)+"</title><style>*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#2b2a3d;margin:0;padding:28px;max-width:900px;margin:auto}header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #c97b3d;padding-bottom:16px;margin-bottom:20px;gap:16px}h1{margin:0;font-size:24px}h2{font-size:16px;margin:22px 0 8px}small,.muted{color:#686778}.tag{display:inline-block;background:#fff0df;padding:5px 9px;border-radius:99px;font-weight:700;font-size:11px}.notice{margin:18px 0;padding:12px;background:#fff4e7;border:1px solid #edd5b8;border-radius:8px;font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.meta div{padding:12px;background:#faf8f3;border-radius:8px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;border-bottom:1px solid #e8e4dc;padding:10px 8px;font-size:11px;vertical-align:top}th{background:#f5f1e9;text-transform:uppercase;font-size:10px}.totals{margin:16px 0 0 auto;width:min(320px,100%)}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{border-top:1px solid #cfc8bc;margin-top:5px;padding-top:10px;font-size:17px;font-weight:800}.order-product-code{display:flex;align-items:center;gap:7px;margin-top:5px;break-inside:avoid}.order-product-code-bars{width:130px;max-width:56%;min-width:60px}.order-product-code-bars svg{width:100%;height:27px}.order-product-code-qr{width:43px;height:43px;object-fit:contain}.order-product-code small,.code-missing{font-size:8px;align-self:center}@media print{body{padding:0}.notice,.order-product-code{break-inside:avoid}}@media(max-width:600px){body{padding:14px}.meta{grid-template-columns:1fr}}</style></head><body><header><div><h1>Halal Food</h1><div class='muted'>Premium Products · Customer order sheet</div></div><div style='text-align:right'><span class='tag'>ORDER SUMMARY</span><p><strong>"+esc(orderNo)+"</strong><br><small>"+esc(dateTime(order.ordered_at))+"</small></p></div></header><div class='notice'><strong>Learning/testing project:</strong> This document is an order summary, not proof of payment or delivery.</div><div class='meta'><div><strong>Customer</strong><br>"+esc(order.customer_name||"—")+"<br>"+esc(order.customer_phone||"—")+"<br>"+esc(order.customer_email||"")+"</div><div><strong>Delivery details</strong><br>"+esc(order.delivery_address||"—")+"<br><span class='muted'>Zone: "+esc(order.delivery_zone||"Not recorded")+" · Status: "+esc(order.status||"pending")+"</span></div></div><h2>Items &amp; product codes</h2><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>"+(itemRows||"<tr><td colspan='4'>No item details recorded</td></tr>")+"</tbody></table><div class='totals'><div><span>Subtotal</span><strong>"+money(order.subtotal)+"</strong></div>"+(Number(order.coupon_discount_amount)>0?"<div><span>Coupon discount ("+esc(order.coupon_code||"Coupon")+")</span><strong>−"+money(order.coupon_discount_amount)+"</strong></div>":"")+"<div><span>Delivery</span><strong>"+money(order.delivery_charge)+"</strong></div><div class='grand'><span>Recorded total</span><strong>"+money(order.total)+"</strong></div></div><p class='muted' style='margin-top:26px;font-size:10px'>Scan the QR beside a product for its current public details and price. The 1D barcode identifies the product SKU for POS/inventory scanners. Recorded totals do not confirm collected payment.</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\\/script></body></html>";
     win.document.open();win.document.write(html);win.document.close();win.opener=null;
    }catch(error){win.close();toast("The order sheet could not be prepared. "+(error?.message||""),"error");}
   })();
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
   (async()=>{
    try{
     const codeMap=await loadOrderProductCodes(chosen);
     const invoice=kind==="invoice";
     const pages=chosen.map(order=>{
      const items=(order.order_items||[]).map(item=>'<tr><td>'+(invoice?"":'<span class="check"></span>')+'<strong>'+esc(item.product_name||"Product")+'</strong>'+orderProductCodeMarkup(codeMap.get(item.product_id))+'</td><td>'+esc(item.quantity)+' '+esc(item.unit||"")+'</td><td>'+money(item.unit_price)+'</td><td>'+money(item.line_total)+'</td></tr>').join("");
      return '<section class="sheet"><header><div><b>Halal Food</b><small>Order operations · '+(invoice?"Customer order sheet":"Packing slip")+'</small></div><div class="ref"><span>'+(invoice?"ORDER SUMMARY":"PACKING SLIP")+'</span><strong>'+esc(order.order_number||String(order.id).slice(0,8))+'</strong><small>'+esc(dateTime(order.ordered_at))+'</small></div></header><p class="notice"><b>Learning/testing project:</b> This is an order summary, not proof of payment, dispatch or delivery.</p><div class="people"><div><small>CUSTOMER</small><b>'+esc(order.customer_name||"Guest")+'</b><span>'+esc(order.customer_phone||"No phone")+'</span><span>'+esc(order.customer_email||"")+'</span></div><div><small>DELIVERY LOCATION</small><b>'+esc(order.delivery_zone||"Customer provided address")+'</b><span>'+esc(order.delivery_address||"No address recorded")+'</span></div></div><h3>Products &amp; product codes</h3><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>'+(items||'<tr><td colspan="4">No items recorded</td></tr>')+'</tbody></table><div class="totals"><div><span>Products subtotal</span><b>'+money(order.subtotal)+'</b></div><div><span>Delivery charge</span><b>'+money(order.delivery_charge)+'</b></div><div class="grand"><span>Recorded total</span><b>'+money(order.total)+'</b></div></div>'+(invoice?'<p class="note">Cash on Delivery order · this document does not confirm receipt of payment.</p>':'<div class="packing"><b>Packing checklist</b><span>□ Products checked</span><span>□ Quantities checked</span><span>□ Address checked</span><span>□ Parcel packed</span></div>')+'<p class="note">Scan the QR beside a product to view its current public product information and price. The 1D barcode is the product SKU for POS/inventory scanners.</p><footer>Halal Food · '+esc(order.status||"pending")+'</footer></section>';
     }).join("");
     const css='*{box-sizing:border-box}body{margin:0;background:#e9eef5;color:#2b2a3d;font:13px/1.5 Inter,Arial,sans-serif}.sheet{max-width:900px;margin:24px auto;padding:30px;background:#fff;box-shadow:0 8px 28px #1f314c1a;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}header{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #c97b3d;padding-bottom:16px}header b{display:block;font-size:25px}.ref{text-align:right}.ref span{display:inline-block;padding:5px 10px;border-radius:99px;background:#F6E9DC;color:#8F572F;font-size:10px;font-weight:800}.ref strong,.ref small{display:block;margin-top:4px}.notice{margin:18px 0;padding:12px;border:1px solid #efcfac;background:#fff5e9;border-radius:10px;font-size:11px}.people{display:grid;grid-template-columns:1fr 1fr;gap:12px}.people>div{display:grid;gap:4px;padding:14px;border:1px solid #e4ddd3;background:#fbf9f5;border-radius:10px;overflow-wrap:anywhere}.people small{font-weight:800;letter-spacing:.1em}.people span,small,.note{color:#667085}h3{margin:20px 0 8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px 7px;border-bottom:1px solid #e2e9f1;font-size:10px;vertical-align:top}th{background:#f5f1e9;text-transform:uppercase;font-size:9px}.totals{width:min(340px,100%);margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{border-top:2px solid #cfc8bc;margin-top:6px;padding-top:12px!important;font-size:16px}.check{display:inline-block;width:11px;height:11px;border:1px solid #8b9bb0;margin-right:7px}.packing{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:22px;padding:14px;border:1px solid #e4ddd3;background:#fbf9f5;border-radius:10px;font-size:10px}.packing b{grid-column:1/-1}.note{margin-top:14px;font-size:9px}.order-product-code{display:flex;align-items:center;gap:6px;margin-top:4px;break-inside:avoid}.order-product-code-bars{width:122px;max-width:56%;min-width:55px}.order-product-code-bars svg{width:100%;height:24px}.order-product-code-qr{width:40px;height:40px;object-fit:contain}.order-product-code small,.code-missing{font-size:7px}footer{margin-top:22px;padding-top:10px;border-top:1px solid #dce4ee;color:#78889e;font-size:9px}@media print{body{background:#fff}.sheet{max-width:none;margin:0;padding:13mm;box-shadow:none;min-height:270mm}}@media(max-width:640px){.sheet{margin:0;padding:18px}.people{grid-template-columns:1fr}.packing{grid-template-columns:1fr 1fr}}';
     const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Halal Food · '+(invoice?"Order sheets":"Packing slips")+'</title><style>'+css+'</style></head><body>'+pages+'<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));<\\/script></body></html>';
     win.document.open();win.document.write(html);win.document.close();win.opener=null;
    }catch(error){win.close();toast("Could not prepare selected orders for printing. "+(error?.message||""),"error");}
   })();
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
   const couponDetailHtml=order.coupon_code?'<div><strong>Coupon code</strong><p>'+esc(order.coupon_code)+'</p></div>':"";
   const couponDiscountAmount=Number(order.coupon_discount_amount||0);
   const couponDiscountPill=couponDiscountAmount>0?'<div class="hf-summary-pill"><small>Coupon discount</small><strong>−'+money(couponDiscountAmount)+'</strong></div>':"";
   $("orderDetailContent").innerHTML='<div class="hf-summary-strip"><div class="hf-summary-pill"><small>Order total</small><strong>'+money(order.total)+'</strong></div><div class="hf-summary-pill"><small>Products subtotal</small><strong>'+money(order.subtotal)+'</strong></div><div class="hf-summary-pill"><small>Delivery</small><strong>'+money(order.delivery_charge)+'</strong></div>'+couponDiscountPill+'</div><div class="hf-field-grid"><div><strong>Customer</strong><p>'+esc(order.customer_name||"—")+'</p></div><div><strong>Phone</strong><p>'+esc(order.customer_phone||"—")+'</p></div><div><strong>Email</strong><p>'+esc(order.customer_email||"—")+'</p></div><div><strong>Status</strong><p>'+makeStatus(order.status)+'</p></div><div><strong>Delivery area</strong><p>'+esc(order.delivery_zone||"Not recorded")+'</p></div><div><strong>Payment method</strong><p>'+esc(order.payment_method==="cash_on_delivery"?"Cash on Delivery (COD)":(order.payment_method||"Not recorded"))+'</p></div>'+couponDetailHtml+'<div class="hf-span-2"><strong>Delivery address</strong><p>'+esc(order.delivery_address||"—")+'</p></div>'+cancellationHtml+'</div><h3 style="margin:18px 0 8px">Products</h3><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>'+((order.order_items||[]).map(item=>'<tr><td>'+esc(item.product_name)+'</td><td>'+esc(item.quantity)+' '+esc(item.unit||"")+'</td><td>'+money(item.unit_price)+'</td><td>'+money(item.line_total)+'</td></tr>').join("")||'<tr><td colspan="4">No item details</td></tr>')+'</tbody></table></div><p class="hf-data-note">Recorded order value is not proof that payment has been collected. This is currently a testing project; no real payment or delivery is enabled.</p>';
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
   const match=raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gram|grams)$/);
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
    const match=displayInput.match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
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
  let entries=[],orders=[],accounts=[],transfers=[],settlements=[],budgets=[],supplierPayables=null,supplierRows=null;
  const financeChartColors=["#C97B3D","#345F9D","#2A918B","#E1A84C","#C87670","#8C78C5","#6F94B8"];
  const sum=(rows,fn)=>rows.reduce((total,row)=>total+Number(fn(row)||0),0);
  const accountName=id=>accounts.find(a=>a.id===id)?.name||"Unassigned";
  const statusLabel=status=>({pending:"Pending",processing:"Processing",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled",draft:"Draft",confirmed:"Confirmed",void:"Void",collected:"Collected",remitted:"Remitted",reconciled:"Reconciled",exception:"Exception",active:"Active",archived:"Archived"}[status]||String(status||"—").replace(/[_-]+/g," "));
  const statusTone=status=>({confirmed:"success",reconciled:"success",delivered:"success",active:"success",draft:"pending",pending:"pending",collected:"info",remitted:"info",processing:"info",shipped:"info",exception:"danger",void:"muted",cancelled:"muted",archived:"muted"}[status]||"muted");
  const statusBadge=status=>'<span class="hf-finance-status hf-finance-status-'+statusTone(status)+'">'+esc(statusLabel(status))+'</span>';
  const dateRange=()=>{
   const p=$("financePeriodFilter")?.value||"30",today=todayISO();
   if(p==="all")return {from:"0000-01-01",to:today,label:"All time"};
   if(p==="today")return {from:today,to:today,label:"Today"};
   if(p==="this-month")return {from:today.slice(0,7)+"-01",to:today,label:"This month"};
   if(p==="this-year")return {from:today.slice(0,4)+"-01-01",to:today,label:"This year"};
   const days=Math.max(1,Number(p)||30);
   return {from:addDhakaDays(today,-(days-1)),to:today,label:"Last "+days+" days"};
  };
  const inRange=(value,range)=>String(value||"").slice(0,10)>=range.from&&String(value||"").slice(0,10)<=range.to;
  const financialClass=e=>e.financial_class||"operating";
  function accountBalance(account){
   const start=String(account.opening_date||"0000-01-01").slice(0,10);
   const ledger=sum(entries.filter(e=>e.account_id===account.id&&e.status==="confirmed"&&String(e.entry_date)>=start),e=>(e.entry_type==="income"?1:-1)*Number(e.amount||0));
   const transferIn=sum(transfers.filter(t=>t.destination_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date)>=start),t=>t.amount);
   const transferOut=sum(transfers.filter(t=>t.source_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date)>=start),t=>t.amount);
   return Number(account.opening_balance||0)+ledger+transferIn-transferOut;
  }
  function accountOptions(target,placeholder,includeInactive=false,selected=""){
   if(!target)return;
   const rows=accounts.filter(a=>includeInactive||a.is_active);
   target.innerHTML='<option value="">'+esc(placeholder)+'</option>'+rows.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===selected?" selected":"")+'>'+esc(a.name)+' · '+esc(statusLabel(a.account_type))+'</option>').join("");
  }
  function orderOptions(target,placeholder,selected="",excludeSettlementId=""){
   if(!target)return;
   const linked=new Set(settlements.filter(s=>s.id!==excludeSettlementId&&s.order_id).map(s=>s.order_id));
   const rows=orders.filter(o=>o.status!=="cancelled"&&(!linked.has(o.id)||o.id===selected));
   target.innerHTML='<option value="">'+esc(placeholder)+'</option>'+rows.map(o=>'<option value="'+esc(o.id)+'"'+(o.id===selected?" selected":"")+'>'+esc(o.order_number||String(o.id).slice(0,8))+' · '+esc(o.customer_name||"Customer")+' · '+money(o.total)+'</option>').join("");
  }
  function renderKpis(){
   const range=dateRange(),periodEntries=entries.filter(e=>e.status==="confirmed"&&inRange(e.entry_date,range));
   const cashIn=sum(periodEntries.filter(e=>e.entry_type==="income"),e=>e.amount);
   const cashOut=sum(periodEntries.filter(e=>e.entry_type==="expense"),e=>e.amount);
   const income=cashIn,expense=cashOut;
   const available=sum(accounts,accountBalance);
   const codPipeline=sum(settlements.filter(s=>s.status!=="cancelled"),s=>Math.max(0,Number(s.cod_amount||0)-Number(s.remitted_amount||0)));
   const draftCount=entries.filter(e=>e.status==="draft").length+transfers.filter(t=>t.status==="draft").length;
   $("financeIncomeTotal").textContent=money(income);
   $("financeExpenseTotal").textContent=money(expense);
   $("financeNetTotal").textContent=money(cashIn-cashOut);
   $("financeAvailableBalance").textContent=accounts.length?money(available):"Not set up";
   $("financeOutstandingCod").textContent=money(codPipeline);
   $("financeSupplierPayables").textContent=supplierPayables===null?"—":money(supplierPayables);
   $("financeDraftCount").textContent=draftCount.toLocaleString("en-BD");
   $("financeCodPipelineTotal").textContent=money(codPipeline);
   $("financeCodReconciledTotal").textContent=money(sum(settlements.filter(s=>s.status==="reconciled"),s=>s.remitted_amount));
   $("financeCodExceptionCount").textContent=settlements.filter(s=>s.status==="exception").length.toLocaleString("en-BD");
   const note=$("financePeriodFilter");
   if(note)note.title="Confirmed cashbook receipts and payments for "+range.label+"; these are not recognized revenue or Profit & Loss. Account balances show the current all-time position.";
  }
  function renderAlerts(){
   const alerts=[];
   if(!accounts.length)alerts.push(["Account setup","Add your cash, bank or mobile-wallet accounts and enter verified opening balances.","#financeAccountsSection","info"]);
   const oldDrafts=entries.filter(e=>e.status==="draft"&&e.created_at&&(Date.now()-new Date(e.created_at).getTime())>7*86400000).length;
   if(oldDrafts)alerts.push(["Old draft records",oldDrafts+" finance draft(s) are older than seven days. Review them before using totals.","#financeTransactionsSection","warning"]);
   const exceptions=settlements.filter(s=>s.status==="exception").length;
   if(exceptions)alerts.push(["COD exceptions",exceptions+" settlement record(s) need manual review.","#financeCodSection","warning"]);
   const currentMonth=todayISO().slice(0,7)+"-01";
   const overspent=budgets.filter(b=>b.status==="active"&&String(b.period_start)===currentMonth).filter(b=>{
    const end=new Date(Date.UTC(Number(currentMonth.slice(0,4)),Number(currentMonth.slice(5,7)),0)).toISOString().slice(0,10);
    const actual=sum(entries.filter(e=>e.entry_type==="expense"&&e.status==="confirmed"&&financialClass(e)==="operating"&&e.category.toLowerCase()===b.category.toLowerCase()&&e.entry_date>=currentMonth&&e.entry_date<=end),e=>e.amount);
    return actual>Number(b.budget_amount||0);
   });
   if(overspent.length)alerts.push(["Budget limit exceeded",overspent.length+" active budget category/categories are above the monthly limit.","#financeReportsSection","warning"]);
   if(!alerts.length){$("financeAlerts").innerHTML='<div class="hf-finance-alert hf-finance-alert-success"><span>✓</span><div><strong>No urgent finance reminders</strong><p>Keep account balances and settlement records current as new transactions occur.</p></div></div>';return;}
   $("financeAlerts").innerHTML=alerts.map(a=>'<a class="hf-finance-alert hf-finance-alert-'+a[3]+'" href="'+a[2]+'"><span>!</span><div><strong>'+esc(a[0])+'</strong><p>'+esc(a[1])+'</p></div><span class="hf-finance-alert-arrow">↗</span></a>').join("");
  }
  function renderCharts(){
   const active=entries.filter(e=>e.status==="confirmed");
   const monthKeys=[],now=new Date();
   for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);monthKeys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
   drawChart("financeTrendChart",{type:"bar",data:{labels:monthKeys.map(k=>{const [y,m]=k.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleDateString("en-BD",{month:"short",year:"2-digit"});}),datasets:[
    {label:"Confirmed cash in",data:monthKeys.map(k=>sum(active.filter(e=>e.entry_type==="income"&&String(e.entry_date).startsWith(k)),e=>e.amount)),backgroundColor:"#2A918B",borderRadius:6},
    {label:"Confirmed cash out",data:monthKeys.map(k=>sum(active.filter(e=>e.entry_type==="expense"&&String(e.entry_date).startsWith(k)),e=>e.amount)),backgroundColor:"#C87670",borderRadius:6}
   ]},options:{scales:{x:{ticks:{color:chartTheme().muted},grid:{display:false}},y:{beginAtZero:true,ticks:{color:chartTheme().muted,callback:v=>"৳"+Number(v).toLocaleString("en-BD")},grid:{color:chartTheme().grid}}},plugins:{legend:{position:"bottom"}}}});
   const expenseRows=active.filter(e=>e.entry_type==="expense"&&financialClass(e)==="operating"),byCategory=new Map();
   expenseRows.forEach(e=>byCategory.set(e.category,(byCategory.get(e.category)||0)+Number(e.amount||0)));
   const labels=[...byCategory.keys()];
   drawChart("financeExpenseChart",{type:"doughnut",data:{labels,datasets:[{data:labels.map(k=>byCategory.get(k)),backgroundColor:financeChartColors,borderColor:chartTheme().surface,borderWidth:3,hoverOffset:6}]},options:{cutout:"62%",plugins:{legend:{position:"bottom"}}}});
  }
  function renderAccounts(){
   const grid=$("financeAccountsGrid");
   if(!accounts.length){grid.innerHTML='<div class="hf-card hf-card-pad hf-finance-empty"><strong>No cash accounts configured yet</strong><p>Add an account and enter its verified opening balance. Do not use a test amount just to fill the dashboard.</p><button class="hf-button hf-button-primary" id="financeEmptyAddAccount" type="button">＋ Set up first account</button></div>';return;}
   grid.innerHTML=accounts.map(a=>{
    const balance=accountBalance(a),kind={cash:"Cash in hand",bank:"Bank account",bkash:"bKash wallet",nagad:"Nagad wallet",rocket:"Rocket wallet",courier_clearing:"Courier clearing",other:"Other account"}[a.account_type]||a.account_type;
    return '<article class="hf-card hf-finance-account-card'+(a.is_active?"":" is-inactive")+'"><div class="hf-finance-account-top"><span class="hf-finance-account-icon">'+({cash:"৳",bank:"▤",bkash:"b",nagad:"n",rocket:"r",courier_clearing:"⇄",other:"◈"}[a.account_type]||"◈")+'</span>'+statusBadge(a.is_active?"active":"archived")+'</div><p class="hf-finance-account-type">'+esc(kind)+(a.provider?" · "+esc(a.provider):"")+'</p><h3>'+esc(a.name)+'</h3><strong class="hf-finance-account-balance">'+money(balance)+'</strong><small>Opening '+money(a.opening_balance)+' · '+esc(dateOnly(a.opening_date))+'</small><div class="hf-finance-account-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-account="'+esc(a.id)+'">Edit</button><button class="hf-button hf-button-secondary hf-button-small" data-toggle-account="'+esc(a.id)+'">'+(a.is_active?"Archive":"Reactivate")+'</button></div></article>';
   }).join("");
  }
  function renderTransfers(){
   const rows=[...transfers].sort((a,b)=>String(b.transfer_date).localeCompare(String(a.transfer_date)));
   $("financeTransfersBody").innerHTML=rows.length?rows.map(t=>'<tr><td>'+dateOnly(t.transfer_date)+'</td><td><strong>'+esc(accountName(t.source_account_id))+'</strong></td><td><strong>'+esc(accountName(t.destination_account_id))+'</strong></td><td><strong>'+money(t.amount)+'</strong></td><td>'+esc(t.reference||t.description||"—")+'</td><td>'+statusBadge(t.status)+'</td><td><div class="hf-table-actions">'+(t.status==="draft"?'<button class="hf-button hf-button-primary hf-button-small" data-confirm-transfer="'+esc(t.id)+'">Confirm</button>':"")+(t.status!=="void"?'<button class="hf-button hf-button-danger hf-button-small" data-void-transfer="'+esc(t.id)+'">Void</button>':"")+'</div></td></tr>').join(""):'<tr><td colspan="7">'+makeEmpty("No transfers recorded","Internal transfers will appear here after you save them.")+'</td></tr>';
  }
  function renderCod(){
   const rows=[...settlements].sort((a,b)=>String(b.updated_at||b.created_at).localeCompare(String(a.updated_at||a.created_at)));
   $("financeCodTableBody").innerHTML=rows.length?rows.map(s=>{
    const expected=Number(s.collected_amount||0)-Number(s.courier_fee||0)+Number(s.adjustment_amount||0);
    const variance=Number(s.remitted_amount||0)-expected;
    const postAction=s.status==="reconciled"&&!s.accounting_journal_id?'<button class="hf-button hf-button-primary hf-button-small" data-post-cod="'+esc(s.id)+'">Post to GL</button>':"";
    const reverseAction=s.accounting_journal_id&&!s.reversal_journal_id?'<button class="hf-button hf-button-danger hf-button-small" data-reverse-cod="'+esc(s.id)+'">Reverse</button>':"";
    const editAction=!s.accounting_journal_id?'<button class="hf-button hf-button-secondary hf-button-small" data-edit-cod="'+esc(s.id)+'">Review / edit</button>':'<small class="hf-finance-managed-source">Posted to accounting</small>';
    return '<tr><td><strong>'+esc(s.order_number)+'</strong><small>'+esc(s.courier_name||"Courier not set")+(s.tracking_reference?" · "+esc(s.tracking_reference):"")+'</small></td><td>'+money(s.cod_amount)+'</td><td>'+money(s.collected_amount)+'</td><td>'+money(s.courier_fee)+'</td><td><strong>'+money(s.remitted_amount)+'</strong><small>'+(s.remitted_account_id?esc(accountName(s.remitted_account_id)):"No account")+'</small></td><td>'+(s.status==="pending"?"—":money(variance))+'</td><td>'+statusBadge(s.status)+'</td><td><div class="hf-table-actions">'+postAction+reverseAction+editAction+'</div></td></tr>';
   }).join(""):'<tr><td colspan="8">'+makeEmpty("No COD settlement records","Add a courier settlement record when you have real collection or remittance information.")+'</td></tr>';
  }
  function budgetActual(b){
   const from=String(b.period_start).slice(0,10);
   const end=new Date(Date.UTC(Number(from.slice(0,4)),Number(from.slice(5,7)),0)).toISOString().slice(0,10);
   return sum(entries.filter(e=>e.entry_type==="expense"&&!e.related_supplier_payment_id&&e.status==="confirmed"&&financialClass(e)==="operating"&&e.category.toLowerCase()===b.category.toLowerCase()&&e.entry_date>=from&&e.entry_date<=end),e=>e.amount);
  }
  function renderBudgets(){
   const rows=[...budgets].sort((a,b)=>String(b.period_start).localeCompare(String(a.period_start))||a.category.localeCompare(b.category));
   $("financeBudgetTableBody").innerHTML=rows.length?rows.map(b=>{
    const actual=budgetActual(b),limit=Number(b.budget_amount||0),pct=limit?Math.round(actual/limit*100):0;
    return '<tr><td>'+esc(String(b.period_start).slice(0,7))+'</td><td><strong>'+esc(b.category)+'</strong><small>'+esc(b.notes||"")+'</small></td><td>'+money(limit)+'</td><td>'+money(actual)+'</td><td><div class="hf-finance-budget-progress"><span style="width:'+Math.min(100,pct)+'%"></span></div><small>'+pct+'%</small></td><td>'+statusBadge(actual>limit&&b.status==="active"?"exception":b.status)+'</td><td>'+(b.status==="active"?'<button class="hf-button hf-button-secondary hf-button-small" data-archive-budget="'+esc(b.id)+'">Archive</button>':'')+'</td></tr>';
   }).join(""):'<tr><td colspan="7">'+makeEmpty("No budgets configured","Set a monthly limit for marketing, delivery, packaging or another expense category.")+'</td></tr>';
  }
  function filteredLedgerEntries(){
   const search=String($("financeSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim();
   const type=$("financeTypeFilter")?.value||"",klass=$("financeClassFilter")?.value||"",status=$("financeStatusFilter")?.value||"",account=$("financeAccountFilter")?.value||"";
   const from=$("financeDateFrom")?.value||"",to=$("financeDateTo")?.value||"";
   if(from&&to&&from>to)return [];
   return entries.filter(e=>(!type||e.entry_type===type)&&(!klass||financialClass(e)===klass)&&(!status||e.status===status)&&(!account||e.account_id===account)&&(!from||String(e.entry_date)>=from)&&(!to||String(e.entry_date)<=to)&&(!search||[e.category,e.description,e.reference,e.status,e.party_name,e.payment_method].join(" ").toLowerCase().includes(search)));
  }
  function renderLedger(){
   const rows=filteredLedgerEntries(),from=$("financeDateFrom")?.value||"",to=$("financeDateTo")?.value||"";
   const emptyTitle=from&&to&&from>to?"Date range is invalid":"No matching transactions";
   const emptyMessage=from&&to&&from>to?"The start date must be on or before the end date.":"Change the filters or record a new transaction.";
   $("financeTableBody").innerHTML=rows.length?rows.map(e=>{
    const locked=Boolean(e.related_supplier_payment_id||e.related_cod_settlement_id||e.accounting_journal_id);
    const source=e.related_supplier_payment_id?"Supplier payment history":e.related_cod_settlement_id?"COD settlement register":e.accounting_journal_id?"Posted to accounting":"";
    return '<tr><td>'+dateOnly(e.entry_date)+'</td><td>'+makeStatus(e.entry_type)+'</td><td><strong>'+esc(e.category)+'</strong><small>'+esc(e.description||"No description")+'</small></td><td>'+esc(e.party_name||"—")+'</td><td>'+esc(accountName(e.account_id))+'</td><td><strong>'+money(e.amount)+'</strong></td><td>'+esc(financialClass(e))+'</td><td>'+statusBadge(e.status)+'</td><td><div class="hf-table-actions">'+(locked?'<small class="hf-finance-managed-source">'+esc(source)+'</small>':'<button class="hf-button hf-button-secondary hf-button-small" data-edit-finance="'+esc(e.id)+'">Edit</button>')+(!locked&&e.status!=="void"?'<button class="hf-button hf-button-danger hf-button-small" data-void-finance="'+esc(e.id)+'">Void</button>':"")+'</div></td></tr>';
   }).join(""):'<tr><td colspan="9">'+makeEmpty(emptyTitle,emptyMessage)+'</td></tr>';
  }
  function renderRecent(){
   const rows=[...entries].sort((a,b)=>String(b.entry_date).localeCompare(String(a.entry_date))||String(b.created_at).localeCompare(String(a.created_at))).slice(0,8);
   $("financeRecentBody").innerHTML=rows.length?rows.map(e=>'<tr><td>'+dateOnly(e.entry_date)+'</td><td>'+makeStatus(e.entry_type)+'</td><td><strong>'+esc(e.category)+'</strong><small>'+esc(e.party_name||e.description||"")+'</small></td><td>'+esc(accountName(e.account_id))+'</td><td><strong>'+money(e.amount)+'</strong></td><td>'+statusBadge(e.status)+'</td></tr>').join(""):'<tr><td colspan="6">'+makeEmpty("No finance activity yet","The ledger will show activity after a transaction is saved.")+'</td></tr>';
  }
  function render(){
   renderKpis();renderAlerts();renderCharts();renderAccounts();renderTransfers();renderCod();renderBudgets();renderLedger();renderRecent();
  }
  function refreshSelects(){
   accountOptions($("financeAccountId"),"Not assigned to an account");
   accountOptions($("financeCodAccount"),"Choose account only when verified");
   accountOptions($("financeTransferSource"),"Choose source account");
   accountOptions($("financeTransferDestination"),"Choose destination account");
   const filter=$("financeAccountFilter"),prior=filter?.value||"";
   if(filter)filter.innerHTML='<option value="">All accounts</option>'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+(a.is_active?"":" · Archived")+'</option>').join("");
   if(filter)filter.value=prior;
   orderOptions($("financeOrderId"),"No linked order");
   orderOptions($("financeCodOrderId"),"Choose an order");
  }
  async function refresh(){
   const supplierQuery=signedQuery(client.from("admin_supplier_balances").select("outstanding_balance").limit(1000)).catch(err=>{console.warn("Supplier balance summary unavailable",err);return null;});
   [entries,accounts,transfers,settlements,budgets,orders,supplierRows]=await Promise.all([
    signedQuery(client.from("admin_finance_entries").select("id,entry_type,category,amount,entry_date,description,reference,status,related_order_id,related_supplier_payment_id,related_cod_settlement_id,account_id,payment_method,party_name,financial_class,accounting_journal_id,reversal_journal_id,created_by,created_at,updated_at").order("entry_date",{ascending:false}).order("created_at",{ascending:false}).limit(5000)),
    signedQuery(client.from("admin_finance_accounts").select("*").order("is_active",{ascending:false}).order("name",{ascending:true}).limit(300)),
    signedQuery(client.from("admin_finance_transfers").select("*").order("transfer_date",{ascending:false}).limit(1000)),
    signedQuery(client.from("admin_cod_settlements").select("*").order("updated_at",{ascending:false}).limit(1000)),
    signedQuery(client.from("admin_finance_budgets").select("*").order("period_start",{ascending:false}).limit(1000)),
    signedQuery(client.from("orders").select("id,order_number,customer_name,total,status,ordered_at,payment_method").order("ordered_at",{ascending:false}).limit(1000)),
    supplierQuery
   ]);
   supplierPayables=Array.isArray(supplierRows)?sum(supplierRows.filter(r=>Number(r.outstanding_balance||0)>0),r=>r.outstanding_balance):null;
   refreshSelects();render();
  }
  function openEntry(e=null,order=null){
   $("financeForm").reset();$("financeId").value=e?.id||"";
   $("financeEntryType").value=order?"income":e?.entry_type||"expense";
   $("financeCategory").value=order?"Verified income":e?.category||"Supplies";
   $("financeCategory").setAttribute("list",$("financeEntryType").value==="expense"?"financeExpenseCategoryOptions":"financeIncomeCategoryOptions");
   $("financeAmount").value=e?.amount??"";
   $("financeDate").value=e?.entry_date||todayISO();
   $("financeAccountId").value=e?.account_id||"";
   $("financePaymentMethod").value=e?.payment_method||"";
   $("financeClass").value=financialClass(e||{});
   $("financeParty").value=e?.party_name||"";
   $("financeDescription").value=e?.description||(order?"Record only after the actual payment has been verified.":"");
   $("financeReference").value=e?.reference||(order?(order.order_number||String(order.id).slice(0,8)):"");
   $("financeStatus").value=e?.status||"draft";$("financeOrderId").value=order?.id||e?.related_order_id||"";
   $("financeFormError").textContent="";
   $("financeDialogTitle").textContent=e?"Edit transaction":order?"Record income linked to order":"Record a transaction";
   $("financeDialog").showModal();
  }
  function openAccount(account=null){
   $("financeAccountForm").reset();$("financeAccountIdHidden").value=account?.id||"";
   $("financeAccountDialogTitle").textContent=account?"Edit account":"Add account";
   $("financeAccountName").value=account?.name||"";
   $("financeAccountType").value=account?.account_type||"cash";
   $("financeAccountProvider").value=account?.provider||"";
   $("financeAccountReference").value=account?.account_reference||"";
   $("financeAccountLedgerId").value=account?.ledger_account_id||"";
   $("financeAccountOpening").value=account?.opening_balance??0;
   $("financeAccountOpeningDate").value=account?.opening_date||todayISO();
   $("financeAccountFormError").textContent="";$("financeAccountDialog").showModal();
  }
  function openTransfer(){
   if(accounts.filter(a=>a.is_active).length<2){toast("Add at least two active accounts before recording a transfer.","error");return;}
   $("financeTransferForm").reset();$("financeTransferDate").value=todayISO();
   $("financeTransferFormError").textContent="";$("financeTransferDialog").showModal();
  }
  function openCod(settlement=null){
   $("financeCodForm").reset();$("financeCodId").value=settlement?.id||"";
   orderOptions($("financeCodOrderId"),"Choose an order",settlement?.order_id||"",settlement?.id||"");
   $("financeCodOrderId").value=settlement?.order_id||"";
   $("financeCodCourier").value=settlement?.courier_name||"";
   $("financeCodTracking").value=settlement?.tracking_reference||"";
   $("financeCodAmount").value=settlement?.cod_amount??"";
   $("financeCodCollected").value=settlement?.collected_amount??0;
   $("financeCodFee").value=settlement?.courier_fee??0;
   $("financeCodAdjustment").value=settlement?.adjustment_amount??0;
   $("financeCodRemitted").value=settlement?.remitted_amount??0;
   $("financeCodAccount").value=settlement?.remitted_account_id||"";
   $("financeCodStatus").value=settlement?.status||"pending";
   $("financeCodCollectedAt").value=settlement?.collected_at||"";
   $("financeCodRemittedAt").value=settlement?.remitted_at||"";
   $("financeCodNotes").value=settlement?.notes||"";
   $("financeCodDialogTitle").textContent=settlement?"Review COD settlement":"Add COD settlement";
   $("financeCodFormError").textContent="";$("financeCodDialog").showModal();
  }
  $("addFinanceEntryBtn")?.addEventListener("click",()=>openEntry());
  $("financeAddTransactionSecondary")?.addEventListener("click",()=>openEntry());
  $("addFinanceAccountBtn")?.addEventListener("click",()=>openAccount());
  $("financeAccountsAdd")?.addEventListener("click",()=>openAccount());
  $("financeEmptyAddAccount")?.addEventListener("click",()=>openAccount());
  $("financeTransferAdd")?.addEventListener("click",openTransfer);
  $("financeCodAdd")?.addEventListener("click",()=>openCod());
  $("financePeriodFilter")?.addEventListener("change",render);
  $("financeEntryType")?.addEventListener("change",()=>{$("financeCategory").setAttribute("list",$("financeEntryType").value==="expense"?"financeExpenseCategoryOptions":"financeIncomeCategoryOptions");});
  $("financeCodOrderId")?.addEventListener("change",()=>{
   const order=orders.find(o=>o.id===$("financeCodOrderId").value);
   if(order&& !$("financeCodId").value) $("financeCodAmount").value=Number(order.total||0).toFixed(2);
  });
  $("financeForm")?.addEventListener("submit",async event=>{
   event.preventDefault();const id=$("financeId").value,button=$("saveFinanceBtn");button.disabled=true;$("financeFormError").textContent="";
   try{
    const payload={entry_type:$("financeEntryType").value,category:$("financeCategory").value.trim(),amount:Number($("financeAmount").value),entry_date:$("financeDate").value,
     description:$("financeDescription").value.trim(),reference:$("financeReference").value.trim()||null,status:$("financeStatus").value,
     related_order_id:$("financeOrderId").value||null,account_id:$("financeAccountId").value||null,payment_method:$("financePaymentMethod").value,
     party_name:$("financeParty").value.trim(),financial_class:$("financeClass").value};
    if(!Number.isFinite(payload.amount)||payload.amount<=0)throw new Error("Enter an amount greater than zero.");
    if(!payload.category)throw new Error("Enter a transaction category.");
    if(!payload.entry_date)throw new Error("Choose a transaction date.");
    if(payload.entry_type==="expense"&&payload.related_order_id)throw new Error("Linking an order is reserved for verified customer receipts. Remove the order link from this expense.");
    if(payload.entry_type==="income"&&payload.status==="confirmed"&&payload.related_order_id){
     const linkedOrder=orders.find(o=>o.id===payload.related_order_id);
     if(!linkedOrder||linkedOrder.status==="cancelled")throw new Error("The linked order is missing or cancelled. Do not confirm it as income.");
     if(settlements.some(s=>s.order_id===payload.related_order_id))throw new Error("This order has a COD settlement record. Complete or review it in Order & COD Settlement instead of adding a second manual income entry.");
    }
    if(!id)payload.created_by=H.ADMIN_EMAIL;
    if(id){const {error}=await client.from("admin_finance_entries").update(payload).eq("id",id);if(error)throw error;await audit("finance_entry_updated","finance_entry",id,"Finance transaction updated",{entry_type:payload.entry_type,status:payload.status,financial_class:payload.financial_class});}
    else{const {data,error}=await client.from("admin_finance_entries").insert(payload).select("id").single();if(error)throw error;await audit("finance_entry_created","finance_entry",data.id,"Finance transaction added",{entry_type:payload.entry_type,status:payload.status,financial_class:payload.financial_class});}
    $("financeDialog").close();toast("Transaction saved.");await refresh();
   }catch(err){$("financeFormError").textContent=err.message||"Transaction could not be saved. Check admin permissions.";}
   finally{button.disabled=false;}
  });
  $("financeAccountForm")?.addEventListener("submit",async event=>{
   event.preventDefault();const id=$("financeAccountIdHidden").value,button=$("financeAccountForm").querySelector('[type="submit"]');button.disabled=true;$("financeAccountFormError").textContent="";
   try{
    const payload={name:$("financeAccountName").value.trim(),account_type:$("financeAccountType").value,provider:$("financeAccountProvider").value.trim(),
     account_reference:$("financeAccountReference").value.trim(),ledger_account_id:$("financeAccountLedgerId").value||null,
     opening_balance:Number($("financeAccountOpening").value),opening_date:$("financeAccountOpeningDate").value};
    if(payload.name.length<2)throw new Error("Enter an account name.");
    if(!payload.ledger_account_id)throw new Error("Map this account to an active Asset account in the Chart of Accounts.");
    if(!Number.isFinite(payload.opening_balance)||payload.opening_balance<0)throw new Error("Opening balance cannot be negative.");
    if(!payload.opening_date)throw new Error("Choose the opening balance date.");
    if(!id)payload.created_by=H.ADMIN_EMAIL;
    if(id){payload.updated_at=new Date().toISOString();const {error}=await client.from("admin_finance_accounts").update(payload).eq("id",id);if(error)throw error;await audit("finance_account_updated","finance_account",id,"Finance account updated",{account_type:payload.account_type});}
    else{const {data,error}=await client.from("admin_finance_accounts").insert(payload).select("id").single();if(error)throw error;await audit("finance_account_created","finance_account",data.id,"Finance account added",{account_type:payload.account_type});}
    $("financeAccountDialog").close();toast("Account saved.");await refresh();
   }catch(err){$("financeAccountFormError").textContent=err.message||"Account could not be saved.";}
   finally{button.disabled=false;}
  });
  $("financeTransferForm")?.addEventListener("submit",async event=>{
   event.preventDefault();const button=$("financeTransferForm").querySelector('[type="submit"]');button.disabled=true;$("financeTransferFormError").textContent="";
   try{
    const payload={source_account_id:$("financeTransferSource").value,destination_account_id:$("financeTransferDestination").value,
     amount:Number($("financeTransferAmount").value),transfer_date:$("financeTransferDate").value,reference:$("financeTransferReference").value.trim()||null,
     description:$("financeTransferDescription").value.trim(),status:"draft",created_by:H.ADMIN_EMAIL};
    if(!payload.source_account_id||!payload.destination_account_id)throw new Error("Choose both accounts.");
    if(payload.source_account_id===payload.destination_account_id)throw new Error("Source and destination accounts must be different.");
    if(!Number.isFinite(payload.amount)||payload.amount<=0)throw new Error("Enter a transfer amount greater than zero.");
    if(!payload.transfer_date)throw new Error("Choose a transfer date.");
    const {data,error}=await client.from("admin_finance_transfers").insert(payload).select("id").single();if(error)throw error;
    await audit("finance_transfer_created","finance_transfer",data.id,"Internal account transfer drafted",{amount:payload.amount});
    $("financeTransferDialog").close();toast("Transfer saved as Draft. Confirm it after the money moves.");await refresh();
   }catch(err){$("financeTransferFormError").textContent=err.message||"Transfer could not be saved.";}
   finally{button.disabled=false;}
  });
  $("financeCodForm")?.addEventListener("submit",async event=>{
   event.preventDefault();const id=$("financeCodId").value,button=$("financeCodForm").querySelector('[type="submit"]');button.disabled=true;$("financeCodFormError").textContent="";
   try{
    const order=orders.find(o=>o.id===$("financeCodOrderId").value),payload={order_id:$("financeCodOrderId").value||null,order_number:order?.order_number||String(order?.id||"").slice(0,8),customer_name:order?.customer_name||"",
     courier_name:$("financeCodCourier").value.trim(),tracking_reference:$("financeCodTracking").value.trim(),
     cod_amount:Number($("financeCodAmount").value),collected_amount:Number($("financeCodCollected").value),courier_fee:Number($("financeCodFee").value),
     adjustment_amount:Number($("financeCodAdjustment").value),remitted_amount:Number($("financeCodRemitted").value),remitted_account_id:$("financeCodAccount").value||null,
     status:$("financeCodStatus").value,collected_at:$("financeCodCollectedAt").value||null,remitted_at:$("financeCodRemittedAt").value||null,
     notes:$("financeCodNotes").value.trim()};
    if(!order)throw new Error("Choose an existing order.");
    if(!payload.courier_name)throw new Error("Enter the courier name.");
    if(!Number.isFinite(payload.cod_amount)||payload.cod_amount<=0||[payload.collected_amount,payload.courier_fee,payload.remitted_amount].some(n=>!Number.isFinite(n)||n<0)||!Number.isFinite(payload.adjustment_amount))throw new Error("Enter a positive COD value and valid non-negative amounts. Adjustment may be positive or negative.");
    if(["collected","remitted","reconciled"].includes(payload.status)&&payload.collected_amount<=0)throw new Error("Enter the amount collected from the customer before using this status.");
    if(["remitted","reconciled"].includes(payload.status)&&payload.remitted_amount<=0)throw new Error("Enter the actual remitted amount before using this status.");
    const duplicate=settlements.find(s=>s.order_id===payload.order_id&&s.id!==id);if(duplicate)throw new Error("A COD settlement record already exists for this order. Edit the existing record instead.");
    if(payload.status==="reconciled"){
     if(payload.remitted_amount<=0||!payload.remitted_account_id||!payload.remitted_at)throw new Error("Reconciled requires a verified remitted amount, destination account and remittance date.");
     const duplicateManualIncome=entries.some(e=>e.related_order_id===payload.order_id&&e.entry_type==="income"&&e.status==="confirmed"&&!e.related_cod_settlement_id);
     if(duplicateManualIncome)throw new Error("This order already has a confirmed manual income entry. Review the ledger before reconciling COD to avoid double-counting the same receipt.");
     if(!confirm("This will create or update one linked Confirmed Income record for the verified remittance. Have you verified the money reached this account?"))throw new Error("Reconciliation cancelled. No changes were saved.");
    }
    const previousSettlement=settlements.find(s=>s.id===id);
    if(previousSettlement?.status==="reconciled"&&payload.status!=="reconciled"){
     if(!confirm("This settlement was already reconciled. Changing it away from Reconciled will Void its linked Finance income entry and reduce the destination account balance. Continue only if the previous reconciliation was incorrect."))throw new Error("Settlement change cancelled.");
    }
    if(!id)payload.created_by=H.ADMIN_EMAIL;
    if(id){payload.updated_at=new Date().toISOString();const {error}=await client.from("admin_cod_settlements").update(payload).eq("id",id);if(error)throw error;await audit("finance_cod_settlement_updated","cod_settlement",id,"COD settlement updated",{status:payload.status,remitted_amount:payload.remitted_amount});}
    else{const {data,error}=await client.from("admin_cod_settlements").insert(payload).select("id").single();if(error)throw error;await audit("finance_cod_settlement_created","cod_settlement",data.id,"COD settlement added",{status:payload.status,remitted_amount:payload.remitted_amount});}
    $("financeCodDialog").close();toast(payload.status==="reconciled"?"Settlement reconciled and linked to the Finance Ledger.":"COD settlement saved.");await refresh();
   }catch(err){$("financeCodFormError").textContent=err.message||"COD settlement could not be saved.";}
   finally{button.disabled=false;}
  });
  $("financeBudgetForm")?.addEventListener("submit",async event=>{
   event.preventDefault();const button=$("financeBudgetSaveBtn");button.disabled=true;
   try{
    const category=$("financeBudgetCategory").value.trim(),month=$("financeBudgetMonth").value,amount=Number($("financeBudgetAmount").value);
    if(!category||!month||!Number.isFinite(amount)||amount<=0)throw new Error("Enter a category, month and positive budget amount.");
    const periodStart=month+"-01";
    const existing=budgets.find(b=>String(b.period_start).slice(0,10)===periodStart&&b.category.toLowerCase()===category.toLowerCase());
    const payload={category,period_start:periodStart,budget_amount:amount,notes:$("financeBudgetNotes").value.trim(),status:"active"};
    if(existing){payload.updated_at=new Date().toISOString();const {error}=await client.from("admin_finance_budgets").update(payload).eq("id",existing.id);if(error)throw error;await audit("finance_budget_updated","finance_budget",existing.id,"Monthly finance budget updated",{category,period_start:periodStart});}
    else{payload.created_by=H.ADMIN_EMAIL;const {data,error}=await client.from("admin_finance_budgets").insert(payload).select("id").single();if(error)throw error;await audit("finance_budget_created","finance_budget",data.id,"Monthly finance budget added",{category,period_start:periodStart});}
    $("financeBudgetForm").reset();$("financeBudgetMonth").value=todayISO().slice(0,7);toast("Monthly budget saved.");await refresh();
   }catch(err){toast(err.message||"Budget could not be saved.","error");}
   finally{button.disabled=false;}
  });
  $("financeTableBody")?.addEventListener("click",async event=>{
   const edit=event.target.closest("[data-edit-finance]"),voidBtn=event.target.closest("[data-void-finance]");
   if(edit){const item=entries.find(e=>e.id===edit.dataset.editFinance);if(item)openEntry(item);return;}
   if(voidBtn){
    const item=entries.find(e=>e.id===voidBtn.dataset.voidFinance);if(!item||item.related_supplier_payment_id||item.related_cod_settlement_id)return;
    if(!confirm("Mark this transaction as Void? It remains in history but is excluded from totals and account balances."))return;
    try{const {error}=await client.from("admin_finance_entries").update({status:"void"}).eq("id",item.id);if(error)throw error;await audit("finance_entry_voided","finance_entry",item.id,"Finance transaction marked void",{entry_type:item.entry_type});toast("Transaction marked Void.");await refresh();}
    catch(err){toast(err.message||"Transaction could not be updated.","error");}
   }
  });
  $("financeAccountsGrid")?.addEventListener("click",async event=>{
   const edit=event.target.closest("[data-edit-account]"),toggle=event.target.closest("[data-toggle-account]"),empty=event.target.closest("#financeEmptyAddAccount");
   if(edit){const item=accounts.find(a=>a.id===edit.dataset.editAccount);if(item)openAccount(item);return;}
   if(empty){openAccount();return;}
   if(toggle){const item=accounts.find(a=>a.id===toggle.dataset.toggleAccount);if(!item)return;try{const {error}=await client.from("admin_finance_accounts").update({is_active:!item.is_active}).eq("id",item.id);if(error)throw error;await audit("finance_account_status_changed","finance_account",item.id,item.is_active?"Finance account archived":"Finance account reactivated",{is_active:!item.is_active});toast(item.is_active?"Account archived. Existing balances and history remain.":"Account reactivated.");await refresh();}catch(err){toast(err.message||"Account status could not be changed.","error");}}
  });
  $("financeTransfersBody")?.addEventListener("click",async event=>{
   const confirmBtn=event.target.closest("[data-confirm-transfer]"),voidBtn=event.target.closest("[data-void-transfer]");
   const item=transfers.find(t=>t.id===(confirmBtn?.dataset.confirmTransfer||voidBtn?.dataset.voidTransfer));if(!item)return;
   try{
    if(confirmBtn){
     const source=accounts.find(a=>a.id===item.source_account_id),destination=accounts.find(a=>a.id===item.destination_account_id);
     if(!source||!destination||!source.is_active||!destination.is_active){toast("Both source and destination accounts must be active before confirming this transfer.","error");return;}
     if(String(item.transfer_date)<String(source.opening_date)||String(item.transfer_date)<String(destination.opening_date)){toast("Transfer date cannot be earlier than either account opening date.","error");return;}
     if(Number(item.amount)>accountBalance(source)){toast("Insufficient recorded balance in "+source.name+". Available: "+money(accountBalance(source))+".","error");return;}
     if(!confirm("Confirm this transfer only after the money has actually moved. This posts Dr destination account / Cr source account and does not change Revenue or Expenses."))return;
     const {data,error}=await client.rpc("admin_finance_confirm_transfer",{p_transfer_id:item.id});
     if(error)throw error;
     await audit("finance_transfer_confirmed","finance_transfer",item.id,"Internal transfer journal posted",{amount:item.amount,journal_id:data});
     toast("Transfer confirmed and posted to the General Ledger.");
    }else{
     const reason=window.prompt("Reason for voiding this transfer (at least five characters):");
     if(reason===null)return;
     if(reason.trim().length<5)throw new Error("Enter a transfer void reason of at least five characters.");
     if(!confirm("Void this transfer? A confirmed transfer will be reversed through a linked Journal; its history will remain."))return;
     const {data,error}=await client.rpc("admin_finance_void_transfer",{p_transfer_id:item.id,p_reason:reason.trim()});
     if(error)throw error;
     await audit("finance_transfer_voided","finance_transfer",item.id,"Internal transfer voided with reversal",{amount:item.amount,reversal_journal_id:data});
     toast("Transfer voided. Any posted journal has been reversed.");
    }
    await refresh();
   }catch(err){toast(err.message||"Transfer could not be updated.","error");}
  });
  $("financeCodTableBody")?.addEventListener("click",async event=>{
   const edit=event.target.closest("[data-edit-cod]"),post=event.target.closest("[data-post-cod]"),reverse=event.target.closest("[data-reverse-cod]");
   if(edit){const item=settlements.find(s=>s.id===edit.dataset.editCod);if(item)openCod(item);return;}
   if(post){
    const item=settlements.find(s=>s.id===post.dataset.postCod);if(!item)return;
    if(!confirm("Post the reconciled COD remittance? This posts the delivered sale (if not already posted), clears Courier Clearing and records the actual remittance and courier fee."))return;
    try{const {data,error}=await client.rpc("admin_finance_post_cod_settlement",{p_settlement_id:item.id});if(error)throw error;await audit("finance_cod_posted_to_accounting","cod_settlement",item.id,"COD remittance and fee posted to General Ledger",{journal_id:data});toast("COD settlement posted to the General Ledger.");await refresh();}
    catch(err){toast(err.message||"COD settlement could not be posted.","error");}
    return;
   }
   if(reverse){
    const item=settlements.find(s=>s.id===reverse.dataset.reverseCod);if(!item)return;
    const reason=window.prompt("Why must this COD settlement be reversed? (at least five characters)");
    if(reason===null)return;
    if(reason.trim().length<5){toast("Enter a reversal reason of at least five characters.","error");return;}
    if(!confirm("Reverse only the COD remittance journal? The delivered sale and any posted COGS remain valid unless separately corrected through their own business workflows?"))return;
    try{const {data,error}=await client.rpc("admin_finance_reverse_cod_settlement",{p_settlement_id:item.id,p_reversal_date:todayISO(),p_reason:reason.trim()});if(error)throw error;await audit("finance_cod_reversed","cod_settlement",item.id,"COD remittance journal reversed; delivered sale and COGS retained",{reversal_journal_id:data});toast("COD remittance reversed; the delivered sale remains in the ledger and the settlement is flagged for review.");await refresh();}
    catch(err){toast(err.message||"COD settlement could not be reversed.","error");}
   }
  });
  $("financeBudgetTableBody")?.addEventListener("click",async event=>{
   const btn=event.target.closest("[data-archive-budget]");if(!btn)return;
   const item=budgets.find(b=>b.id===btn.dataset.archiveBudget);if(!item)return;
   if(!confirm("Archive this budget? Historical actuals and budget values remain available."))return;
   try{const {error}=await client.from("admin_finance_budgets").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",item.id);if(error)throw error;await audit("finance_budget_archived","finance_budget",item.id,"Finance budget archived",{category:item.category});toast("Budget archived.");await refresh();}
   catch(err){toast(err.message||"Budget could not be archived.","error");}
  });
  const exportEntries=()=>{
   const rows=filteredLedgerEntries().map(e=>({date:e.entry_date,type:e.entry_type,classification:financialClass(e),category:e.category,party:e.party_name||"",description:e.description||"",amount:Number(e.amount||0),account:accountName(e.account_id),payment_method:e.payment_method||"",status:e.status,reference:e.reference||"",order_id:e.related_order_id||"",accounting_journal_id:e.accounting_journal_id||"",source:e.related_supplier_payment_id?"supplier_payment":e.related_cod_settlement_id?"cod_settlement":"manual"}));
   downloadFile("halal-food-finance-ledger-"+todayISO()+".csv",csvText(rows),"text/csv;charset=utf-8");toast(rows.length+" filtered ledger record(s) exported.");
  };
  $("financeExportBtn")?.addEventListener("click",exportEntries);
  $("financeReportExportBtn")?.addEventListener("click",exportEntries);
  $("financeCodExportBtn")?.addEventListener("click",()=>{
   const rows=settlements.map(s=>({order_number:s.order_number,courier:s.courier_name,tracking_reference:s.tracking_reference,cod_amount:s.cod_amount,collected_amount:s.collected_amount,courier_fee:s.courier_fee,adjustment_amount:s.adjustment_amount,remitted_amount:s.remitted_amount,remitted_account:accountName(s.remitted_account_id),status:s.status,variance_for_review:Number(s.remitted_amount||0)-(Number(s.collected_amount||0)-Number(s.courier_fee||0)+Number(s.adjustment_amount||0)),notes:s.notes||""}));
   downloadFile("halal-food-cod-settlements-"+todayISO()+".csv",csvText(rows),"text/csv;charset=utf-8");toast(rows.length+" COD record(s) exported.");
  });
  $("financeSearch")?.addEventListener("input",renderLedger);
  $("financeTypeFilter")?.addEventListener("change",renderLedger);
  $("financeClassFilter")?.addEventListener("change",renderLedger);
  $("financeStatusFilter")?.addEventListener("change",renderLedger);
  $("financeAccountFilter")?.addEventListener("change",renderLedger);
  $("financeDateFrom")?.addEventListener("change",renderLedger);
  $("financeDateTo")?.addEventListener("change",renderLedger);
  $("globalSearch")?.addEventListener("input",renderLedger);
  $("financeBudgetMonth").value=todayISO().slice(0,7);
  document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>$(button.dataset.closeDialog)?.close()));
  await refresh();attachRefresh(refresh);
 }
 
 async function initReports(){
  const reportGroup=page.startsWith("reports-")?page.slice("reports-".length):"";
  const requestedReport=new URLSearchParams(window.location.search).get("report")||"";
  const reportGroups={
   business:["business","sales","product-sales","top-products","customer-wise-products","customer-products"],
   purchase:["purchase","product-purchase"],
   customers:["top-customers","customers","receivable"],
   payables:["payable"],
   inventory:["low-stock","alert-products","stock","stock-list"],
   finance:["account-payments","collections","expenses","transactions"],
   daily:["daily"]
  };
  const definitions={
   business:["ব্যবসা রিপোর্ট","Business Overview","অর্ডার, বিক্রয়, গড় অর্ডার মূল্য ও বাতিল অর্ডারের সার্বিক চিত্র","অর্ডার ও বিক্রয়ের বিশ্লেষণ","দিনভিত্তিক ব্যবসায়িক রেকর্ড"],
   sales:["বিক্রয় রিপোর্ট","Sales Performance","অর্ডার মূল্য, বিক্রয়ের প্রবণতা, পেমেন্ট পদ্ধতি ও অর্ডার স্ট্যাটাস","পেমেন্ট ও অর্ডার স্ট্যাটাস","দিনভিত্তিক বিক্রয় রেকর্ড"],
   "product-sales":["পণ্য বিক্রয় রিপোর্ট","Product Sales","প্রতিটি পণ্যের বিক্রিত পরিমাণ, অর্ডার লাইন ও বিক্রয় মূল্য","পণ্যভিত্তিক বিক্রয়","পণ্য বিক্রয়ের বিস্তারিত"],
   "top-products":["সর্বাধিক বিক্রিত পণ্য","Top Selling Products","বিক্রিত ইউনিটের পরিমাণ অনুযায়ী শীর্ষ পণ্য ও বিক্রয় মূল্য","বিক্রিত ইউনিট অনুযায়ী র‍্যাংকিং","শীর্ষ পণ্যের বিস্তারিত"],
   "customer-wise-products":["কাস্টমারভিত্তিক পণ্য বিক্রয়","Customer-wise Product Sales","কোন গ্রাহক কোন পণ্য কত ইউনিট কিনেছেন ও মোট মূল্য","গ্রাহকভিত্তিক পণ্য ক্রয়","গ্রাহক ও পণ্যের বিস্তারিত"],
   "customer-products":["কাস্টমার পণ্য রিপোর্ট","Customer Product Report","গ্রাহকের কেনা পণ্যের সংখ্যা, ইউনিট, মোট ব্যয় ও সর্বশেষ অর্ডার","গ্রাহকভিত্তিক পণ্য বৈচিত্র্য","গ্রাহক পণ্য সারাংশ"],
   purchase:["ক্রয় রিপোর্ট","Purchase Report","সরবরাহকারীর ক্রয় অর্ডার, স্ট্যাটাস, মোট মূল্য ও গ্রহণের অবস্থা","সরবরাহকারী ও ক্রয় স্ট্যাটাস","ক্রয় অর্ডারের বিস্তারিত"],
   "product-purchase":["ক্রয় পণ্য রিপোর্ট","Product Purchase","প্রতিটি ক্রয় পণ্যের অর্ডারকৃত, গৃহীত ও বাকি পরিমাণ এবং ইউনিট কস্ট","পণ্যভিত্তিক ক্রয় ও গ্রহণ","ক্রয় পণ্যের বিস্তারিত"],
   "top-customers":["শীর্ষ কাস্টমার","Top Customers","মোট অর্ডার মূল্য অনুযায়ী শীর্ষ গ্রাহক ও ক্রয় কার্যক্রম","গ্রাহক ব্যয়ের র‍্যাংকিং","শীর্ষ গ্রাহকের বিস্তারিত"],
   customers:["কাস্টমার রিপোর্ট","Customer Report","গ্রাহকের অর্ডার সংখ্যা, মোট ব্যয়, গড় অর্ডার ও সর্বশেষ অর্ডার","গ্রাহকের কার্যক্রমের সারাংশ","গ্রাহকভিত্তিক রেকর্ড"],
   receivable:["পাওনাদার রিপোর্ট","COD Receivable","কুরিয়ার COD-তে সংগ্রহ বাকি ও রেমিট্যান্স বাকি আলাদা হিসাব","কুরিয়ার ও সংগ্রহের অবস্থা","COD পাওনা ও রেমিট্যান্স রেকর্ড"],
   payable:["দেনাদার রিপোর্ট","Supplier Payables","সরবরাহকারীর বিল, বরাদ্দ পেমেন্ট এবং অবশিষ্ট দায়","সরবরাহকারীভিত্তিক দায়","সরবরাহকারী বিল ও পেমেন্ট"],
   "low-stock":["স্বল্প স্টকের পণ্য","Low Stock Products","ন্যূনতম সীমার সমান বা নিচে কিন্তু শূন্যের বেশি স্টক","ক্যাটাগরি অনুযায়ী স্বল্প স্টক","স্বল্প স্টকের পণ্যের তালিকা"],
   "alert-products":["অ্যালার্ট পণ্য তালিকা","Alert Product List","শূন্য স্টক ও ন্যূনতম সীমায় পৌঁছানো পণ্যের সতর্কতা","স্টক সতর্কতার ধরন","অ্যালার্ট পণ্যের বিস্তারিত"],
   stock:["স্টক রিপোর্ট","Stock Valuation","বর্তমান পণ্য স্টক, সংরক্ষিত কস্ট ও আনুমানিক স্টক মূল্য","ক্যাটাগরি অনুযায়ী স্টক মূল্যায়ন","পণ্যভিত্তিক স্টক মূল্যায়ন"],
   "stock-list":["স্টক লিস্ট","Current Stock List","বর্তমান ক্যাটালগের SKU, ক্যাটাগরি, মজুত ও ন্যূনতম সীমা","ক্যাটাগরি অনুযায়ী পণ্য মজুত","সম্পূর্ণ বর্তমান স্টক তালিকা"],
   "account-payments":["অ্যাকাউন্ট পেমেন্ট রিপোর্ট","Account Payments","অ্যাকাউন্ট, পেমেন্ট পদ্ধতি ও পার্টি অনুযায়ী রেকর্ডকৃত পেমেন্ট","অ্যাকাউন্ট ও পেমেন্ট পদ্ধতিভিত্তিক বিশ্লেষণ","অ্যাকাউন্ট পেমেন্ট ও ট্রান্সফার"],
   collections:["কালেকশন তালিকা","Collections","COD অর্ডারের কালেকশন, কুরিয়ার ফি, রেমিট্যান্স ও স্ট্যাটাস","কুরিয়ারভিত্তিক কালেকশন","কালেকশন ও রেমিট্যান্স রেকর্ড"],
   expenses:["খরচ রিপোর্ট","Expense Report","রেকর্ডকৃত ব্যয়, ক্যাটাগরি, নিশ্চিত খরচ ও মাসিক বাজেট","ক্যাটাগরি অনুযায়ী খরচ ও বাজেট","খরচের বিস্তারিত লেজার"],
   transactions:["লেনদেন রিপোর্ট","Transaction Report","Finance লেনদেনের ধরন, ক্যাটাগরি, আর্থিক শ্রেণি, অ্যাকাউন্ট ও অবস্থা","লেনদেনের ধরন ও আর্থিক শ্রেণি","সম্পূর্ণ লেনদেন লেজার"],
   daily:["দৈনিক ব্যবসায়িক রিপোর্ট","Daily Business Report","প্রতিদিনের অর্ডার, বিক্রয়মূল্য, ব্যয়, COD সংগ্রহ ও রেমিট্যান্সের সমন্বিত চিত্র","দিনভিত্তিক ব্যবসায়িক কার্যক্রম","প্রতিদিনের বিস্তারিত হিসাব"]
  };
  const allowed=reportGroups[reportGroup]||[];
  const first=reportGroup?(allowed.includes(requestedReport)?requestedReport:allowed[0]):"";
  if(reportGroup&&$("reportType"))$("reportType").value=first;
  if(reportGroup){
   document.querySelectorAll("[data-report-category]").forEach(section=>{section.hidden=true;section.style.display="none";});
   document.querySelectorAll("#reportType option").forEach(option=>{option.hidden=true;option.disabled=!allowed.includes(option.value);});
   document.querySelectorAll("[data-report-type]").forEach(button=>button.classList.toggle("is-selected",button.dataset.reportType===first));
  }
  let report={title:"",columns:[],rows:[],notes:"",rangeLabel:"",type:"",source:{}};
  let workspace=null,activeSegment="overview",visibleRows=[],activeFilterColumn="";
  const num=value=>{const n=Number(value??0);return Number.isFinite(n)?n:0;};
  const sum=(rows,key)=>rows.reduce((n,row)=>n+num(row[key]),0);
  const unique=(rows,key)=>new Set(rows.map(row=>String(row[key]??"").trim()).filter(Boolean)).size;
  const textCell=value=>value===null||value===undefined||value===""?"—":String(value);
  const isMoney=key=>/(amount|total|sales|spent|revenue|expense|cost|price|paid|balance|collected|remitted|cod|fee|budget|value|subtotal|delivery_charge|unit_cost|stock_value)/i.test(key);
  function displayCell(value,key){
   if(value===null||value===undefined||value==="")return "—";
   if(typeof value==="number"&&isMoney(key))return money(value);
   if(typeof value==="number")return value.toLocaleString("en-BD",{maximumFractionDigits:2});
   if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value))return dateOnly(value);
   return String(value);
  }
  function groupRows(rows,key,metricKeys){
   const map=new Map();
   rows.forEach(row=>{
    const label=String(row[key]??"অনির্ধারিত").trim()||"অনির্ধারিত";
    let value=map.get(label);
    if(!value){value={[key]:label,records:0};(metricKeys||[]).forEach(k=>value[k]=0);map.set(label,value);}
    value.records++;(metricKeys||[]).forEach(k=>value[k]+=num(row[k]));
   });
   return [...map.values()].sort((a,b)=>num(b[metricKeys?.[0]||"records"])-num(a[metricKeys?.[0]||"records"]));
  }
  function tableMarkup(rows,columns,emptyMessage){
   if(!rows.length)return '<div class="hf-report-empty"><strong>'+esc(emptyMessage||"এই সময়সীমায় কোনো রেকর্ড নেই")+'</strong><p>অন্য তারিখের সীমা নির্বাচন করুন অথবা সংশ্লিষ্ট মডিউলে রেকর্ড যোগ করুন।</p></div>';
   return '<div class="hf-report-table-wrap" tabindex="0" role="region" aria-label="Report table"><table class="hf-table"><thead><tr>'+columns.map(key=>'<th>'+esc(key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()))+'</th>').join("")+'</tr></thead><tbody>'+rows.slice(0,250).map(row=>'<tr>'+columns.map(key=>'<td>'+esc(displayCell(row[key],key))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function ensureWorkspace(){
   if(workspace)return workspace;
   const builder=$("reportBuildSection"),preview=$("reportPreviewSection");
   workspace=document.createElement("section");workspace.id="reportWorkspace";workspace.className="hf-report-workspace";
   workspace.innerHTML='<div class="hf-report-workspace-head"><div><p class="page-eyebrow">INDIVIDUAL REPORT WORKSPACE</p><h2 id="reportWorkspaceTitle"></h2><p id="reportWorkspaceDescription"></p></div><div class="hf-report-workspace-meta"><span id="reportWorkspaceCode"></span><small id="reportWorkspaceRange"></small></div></div><div class="hf-report-kpis" id="reportWorkspaceKpis"></div><div class="hf-report-workspace-toolbar"><div class="hf-report-workspace-filters" id="reportWorkspaceFilters"></div><div class="hf-report-workspace-actions" id="reportWorkspaceActions"></div></div><div class="hf-report-segment-nav" id="reportWorkspaceTabs" role="tablist" aria-label="Report sections"></div><section class="hf-report-segment-panel" id="reportWorkspaceOverview" role="tabpanel"></section><section class="hf-report-segment-panel" id="reportWorkspaceAnalysis" role="tabpanel" hidden></section><section class="hf-report-segment-panel" id="reportWorkspaceRecords" role="tabpanel" hidden><div class="hf-report-record-toolbar"><div><h3 id="reportWorkspaceRecordsTitle"></h3><p id="reportWorkspaceRecordsNote"></p></div><div class="hf-report-record-filters"><input id="reportWorkspaceSearch" class="hf-input" type="search" placeholder="এই রিপোর্টের রেকর্ড খুঁজুন" aria-label="Search report records"><select id="reportWorkspaceFieldFilter" class="hf-select" aria-label="Filter report records"><option value="">সব রেকর্ড</option></select></div></div><div class="hf-report-table-wrap" tabindex="0" role="region" aria-label="Report detail records"><table class="hf-table"><thead id="reportWorkspaceTableHead"></thead><tbody id="reportWorkspaceTableBody"></tbody></table></div><p class="hf-data-note" id="reportWorkspaceRecordsFoot"></p></section><div class="hf-report-workspace-foot" id="reportWorkspaceFoot"></div>';
   if(builder)builder.parentNode.insertBefore(workspace,builder);
   if(reportGroup){
    const center=document.querySelector(".hf-report-center");if(center)center.hidden=true;
    if(builder)builder.hidden=true;if(preview)preview.hidden=true;
    const filterHost=$("reportWorkspaceFilters"),actionHost=$("reportWorkspaceActions");
    const rangeLabel=$("rangeSelect")?.closest("label");
    if(rangeLabel&&filterHost)filterHost.appendChild(rangeLabel);
    if($("customRangeFields")&&filterHost)filterHost.appendChild($("customRangeFields"));
    if($("includePersonalData")?.closest("label"))$("includePersonalData").closest("label").hidden=true;
    if($("buildReportBtn")){ $("buildReportBtn").textContent="রিপোর্ট রিফ্রেশ";actionHost?.appendChild($("buildReportBtn")); }
    ["downloadCsvBtn","downloadXlsxBtn","downloadPdfBtn"].forEach(id=>{if($(id))actionHost?.appendChild($(id));});
    if($("reportType")?.closest("label"))$("reportType").closest("label").hidden=true;
    $("reportWorkspaceSearch")?.addEventListener("input",renderRecordTable);
    $("reportWorkspaceFieldFilter")?.addEventListener("change",renderRecordTable);
    $("reportWorkspaceTabs")?.addEventListener("click",event=>{
     const button=event.target.closest("[data-report-segment]");if(!button)return;
     showSegment(button.dataset.reportSegment);
    });
   }else workspace.hidden=true;
   return workspace;
  }
  function kpisFor(type,rows,source){
   const orders=source.orders||[],valid=orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled");
   const finance=source.finance||[],settlements=source.settlements||[],purchases=source.purchases||[];
   const sales=valid.reduce((n,o)=>n+num(o.total),0);
   const k=(label,value,note)=>({label,value,note:note||""});
   if(type==="business")return [k("মোট অর্ডার",orders.length,"নির্বাচিত সময়"),k("বিক্রয় অর্ডার মূল্য",money(sales),"বাতিল বাদে; সংগৃহীত নগদ নয়"),k("গড় অর্ডার মূল্য",money(valid.length?sales/valid.length:0),"নন-ক্যানসেলড অর্ডার"),k("বাতিল অর্ডার",orders.length-valid.length,"আলাদা করে দেখানো")];
   if(type==="sales")return [k("বিক্রয় অর্ডার",valid.length,"বাতিল বাদে"),k("অর্ডার মূল্য",money(sales),"রেকর্ডকৃত অর্ডার মোট"),k("ডেলিভারি চার্জ",money(sum(valid,"delivery_charge")),"অর্ডারে সংরক্ষিত"),k("গড় অর্ডার",money(valid.length?sales/valid.length:0),"প্রতি অর্ডার")];
   if(type==="daily")return [k("কার্যদিবস",rows.length,"রেকর্ড থাকা দিন"),k("মোট অর্ডার",sum(rows,"orders"),"বাতিলসহ"),k("অর্ডার মূল্য",money(sum(rows,"order_value")),"বাতিল বাদে"),k("নিশ্চিত ব্যয়",money(sum(rows,"confirmed_expenses")),"Confirmed expense"),k("COD সংগ্রহ",money(sum(rows,"cod_collected")),"কুরিয়ার সংগ্রহ"),k("COD রেমিট্যান্স",money(sum(rows,"cod_remitted")),"রেকর্ডকৃত রেমিট্যান্স")];
   if(["product-sales","top-products"].includes(type))return [k("পণ্য",unique(rows,"product"),"বিক্রিত পণ্য"),k("বিক্রিত ইউনিট",sum(rows,"quantity_sold"),"অর্ডার আইটেম"),k("পণ্য বিক্রয়",money(sum(rows,"sales")),"লাইন টোটাল"),k("অর্ডার লাইন",sum(rows,"order_lines"),"পণ্য লাইন")];
   if(type==="customer-wise-products")return [k("গ্রাহক",unique(rows,"customer"),"গ্রাহক-পণ্য সমন্বয়"),k("পণ্য ইউনিট",sum(rows,"quantity"),"বিক্রিত পরিমাণ"),k("পণ্য বিক্রয়",money(sum(rows,"total")),"আইটেম লাইন টোটাল"),k("সমন্বয়",rows.length,"আলাদা গ্রাহক-পণ্য")];
   if(["customer-products","top-customers","customers"].includes(type))return [k("গ্রাহক",rows.length,"স্বতন্ত্র গ্রাহক"),k("অর্ডার",sum(rows,"orders"),"রেকর্ডকৃত"),k("মোট ব্যয়",money(sum(rows,"total_spent")),"অর্ডার মূল্য"),k("গড় ব্যয়",money(rows.length?sum(rows,"total_spent")/rows.length:0),"প্রতি গ্রাহক")];
   if(type==="purchase")return [k("ক্রয় অর্ডার",purchases.length,"Purchase Orders"),k("ক্রয়ের মোট",money(sum(purchases,"total_amount")),"অর্ডার মোট"),k("ক্রয় লাইন",purchases.reduce((n,p)=>n+(p.admin_purchase_order_items||[]).length,0),"অর্ডার আইটেম"),k("সম্পন্ন",purchases.filter(p=>["received","completed"].includes(String(p.status||"").toLowerCase())).length,"Status অনুযায়ী")];
   if(type==="product-purchase")return [k("পণ্য লাইন",rows.length,"ক্রয় আইটেম"),k("ক্রয় ইউনিট",sum(rows,"quantity"),"অর্ডারকৃত"),k("গৃহীত ইউনিট",sum(rows,"received_quantity"),"GRN অনুযায়ী"),k("ক্রয় মূল্য",money(sum(rows,"total")),"লাইন কস্ট")];
   if(type==="payable"){const confirmed=rows.filter(r=>String(r.status||"").toLowerCase()==="confirmed");return [k("নিশ্চিত বিল",confirmed.length,"Invoice-date range"),k("নিশ্চিত বিলের মূল্য",money(sum(confirmed,"bill_total")),"Draft/Void বাদ"),k("নিশ্চিত পেমেন্ট",money(sum(confirmed,"paid")),"Confirmed payment allocations"),k("নিশ্চিত ক্রেডিট",money(sum(confirmed,"confirmed_credit")),"Confirmed credit notes"),k("বর্তমান Supplier Payables",money(sum(source.supplierBalances||[],"outstanding_balance")),"Supplier ledger current balance")];}
   if(type==="receivable"||type==="collections")return [k("COD রেকর্ড",rows.length,type==="receivable"?"Current outstanding snapshot":"Selected-period settlement activity"),k("COD মূল্য",money(sum(rows,"cod_amount")),"Settlement records"),k("সংগ্রহ",money(sum(rows,"collected")),"Current recorded collection"),k("যাচাইকৃত রেমিট্যান্স",money(sum(rows,"verified_remitted")),"Linked confirmed Finance income"),k("সংগ্রহ বাকি",money(sum(rows,"pending_collection")),"COD less collected"),k("নেট রেমিট্যান্স বাকি",money(sum(rows,"pending_remittance")),"After courier fee and adjustment")];
   if(["low-stock","alert-products","stock","stock-list"].includes(type))return [k("পণ্য",rows.length,"বর্তমান স্ন্যাপশট"),k("মোট ইউনিট",sum(rows,"stock"),"বর্তমান স্টক"),k("স্টক মূল্য",money(sum(rows,"stock_value")),"সংরক্ষিত কস্ট থাকলে"),k("শূন্য স্টক",rows.filter(r=>num(r.stock)===0).length,"স্টক নেই"),k("সীমার নিচে",rows.filter(r=>num(r.stock)<=num(r.minimum_stock)).length,"Low threshold")];
   if(type==="account-payments"){const entries=rows.filter(r=>r.record_kind==="Finance entry"&&r.status==="confirmed"),transfers=rows.filter(r=>r.record_kind==="Internal transfer"&&r.status==="confirmed");const cashIn=sum(entries.filter(r=>r.entry_type==="income"),"amount"),cashOut=sum(entries.filter(r=>r.entry_type==="expense"),"amount");return [k("সক্রিয় অ্যাকাউন্ট",(source.accountBalances||[]).filter(a=>a.is_active).length,"Configured accounts"),k("বর্তমান অ্যাকাউন্ট ব্যালেন্স",money(sum((source.accountBalances||[]).filter(a=>a.is_active),"current_balance")),"Opening + confirmed entries + transfers"),k("সময়ে Cash In",money(cashIn),"Confirmed income only"),k("সময়ে Cash Out",money(cashOut),"Confirmed expense only"),k("নেট অ্যাকাউন্ট মুভমেন্ট",money(sum((source.accountBalances||[]).filter(a=>a.is_active),"period_net_movement")),"Transfers included separately"),k("Internal Transfers",transfers.length,"Not income or expense")];}
   if(type==="expenses"){const confirmed=rows.filter(r=>r.status==="confirmed"),operating=confirmed.filter(r=>(r.financial_class||"operating")==="operating"),draft=rows.filter(r=>r.status==="draft");return [k("খরচের রেকর্ড",rows.length,"Draft/Confirmed/Void"),k("Confirmed Operating Expense",money(sum(operating,"amount")),"Operating only"),k("Confirmed Non-operating",money(sum(confirmed.filter(r=>(r.financial_class||"operating")!=="operating"),"amount")),"Capital/Loan/Refund/Adjustment etc."),k("Draft খরচ",draft.length,"Needs review"),k("নির্বাচিত বাজেট",money(sum((source.budgets||[]).filter(b=>b.status==="active"),"budget_amount")),"Active budgets")];}
   if(type==="transactions"){const confirmed=rows.filter(r=>r.status==="confirmed"),transfers=confirmed.filter(r=>r.entry_type==="transfer");return [k("মোট রেকর্ড",rows.length,"Ledger + internal transfers"),k("নিশ্চিত Income",money(sum(confirmed.filter(r=>r.entry_type==="income"),"amount")),"Confirmed ledger income"),k("নিশ্চিত Expense",money(sum(confirmed.filter(r=>r.entry_type==="expense"),"amount")),"Confirmed ledger expense"),k("Internal Transfers",transfers.length,"Separate from income/expense"),k("Transfer Amount",money(sum(transfers,"amount")),"Account-to-account movement"),k("Draft / Void",rows.filter(r=>["draft","void"].includes(String(r.status||"").toLowerCase())).length,"Not in confirmed totals")];}
   return [k("রেকর্ড",rows.length,"নির্বাচিত সময়"),k("মোট পরিমাণ",money(sum(rows,"amount")),"রেকর্ডকৃত"),k("Confirmed",rows.filter(r=>String(r.status).toLowerCase()==="confirmed").length,"নিশ্চিত অবস্থা")];
  }
  function analysisFor(type,rows,source){
   const block=(title,description,columns,values,bars)=>({title,description,columns,rows:values,bars:bars||"records"});
   const grouped=(title,description,data,key,metrics)=>block(title,description,[key,"records",...(metrics||[])],groupRows(data,key,metrics||[]),metrics?.[0]||"records");
   const orders=source.orders||[];
   if(type==="business"||type==="sales"){
    const statusRows=groupRows(orders.map(o=>({status:o.status||"unknown",order_value:num(o.total)})),"status",["order_value"]);
    const paymentRows=groupRows(orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled").map(o=>({payment_method:o.payment_method||"not recorded",order_value:num(o.total)})),"payment_method",["order_value"]);
    const dailyRows=rows.slice().sort((a,b)=>b.date.localeCompare(a.date));
    return {blocks:[
     block("অর্ডার স্ট্যাটাস অনুযায়ী","প্রতিটি স্ট্যাটাসে অর্ডার সংখ্যা ও রেকর্ডকৃত অর্ডার মূল্য।",["status","records","order_value"],statusRows,"order_value"),
     block("পেমেন্ট পদ্ধতি অনুযায়ী","অর্ডার স্ন্যাপশটে সংরক্ষিত payment method; এটি payment confirmation নয়।",["payment_method","records","order_value"],paymentRows,"order_value"),
     block("দিনভিত্তিক বিক্রয়","প্রতিটি দিনের non-cancelled order value ও delivery charge।",["date","orders","order_value","delivery_charge"],dailyRows,"order_value")
    ]};
   }
   if(type==="daily"){
    const statuses=groupRows(orders.map(o=>({status:o.status||"unknown",records:1,order_value:String(o.status).toLowerCase()==="cancelled"?0:num(o.total)})),"status",["order_value"]);
    return {blocks:[
     block("দিনভিত্তিক ব্যবসায়িক সারাংশ","অর্ডার, বাতিল, অর্ডার মূল্য, নিশ্চিত ব্যয়, COD সংগ্রহ ও রেমিট্যান্স।",["date","orders","cancelled_orders","order_value","delivery_charge","confirmed_expenses","cod_collected","cod_remitted"],rows.slice().sort((a,b)=>b.date.localeCompare(a.date)),"order_value"),
     block("অর্ডার স্ট্যাটাস বিভাজন","নির্বাচিত সময়ে অর্ডারের lifecycle অবস্থা।",["status","records","order_value"],statuses,"records")
    ]};
   }
   if(type==="product-sales")return {blocks:[block("বিক্রয় মূল্য অনুযায়ী পণ্য","পণ্যের মোট line total ও অর্ডার লাইনের সংখ্যা।",["product","quantity_sold","sales","order_lines"],rows.slice().sort((a,b)=>num(b.sales)-num(a.sales)).slice(0,20),"sales"),grouped("ক্যাটাগরি অনুযায়ী পণ্য বিক্রয়","পণ্যের বর্তমান ক্যাটাগরি সংরক্ষিত না থাকলে Uncategorised দেখানো হবে।",rows,"category",["quantity_sold","sales"])]};
   if(type==="top-products")return {blocks:[block("বিক্রিত ইউনিট অনুযায়ী শীর্ষ পণ্য","সর্বাধিক ইউনিট বিক্রি হওয়া পণ্য আগে দেখানো হয়েছে।",["rank","product","sku","category","quantity_sold","sales","order_lines","current_stock","minimum_stock","catalogue_status"],rows.slice(0,20),"quantity_sold"),block("বিক্রয় মূল্যের শীর্ষ পণ্য","যে পণ্যগুলো মোট বিক্রয় মূল্যে এগিয়ে।",["product","quantity_sold","sales","order_lines"],rows.slice().sort((a,b)=>num(b.sales)-num(a.sales)).slice(0,20),"sales")]};
   if(type==="customer-wise-products")return {blocks:[
    grouped("গ্রাহকভিত্তিক পণ্য ক্রয়","একই গ্রাহকের একাধিক পণ্যের পরিমাণ ও মূল্য যোগ করা হয়েছে।",rows,"customer",["quantity","total"]),
    grouped("পণ্যভিত্তিক গ্রাহক বিক্রয়","কোন পণ্য কতজন/কতটি customer-product pair-এ বিক্রি হয়েছে।",rows,"product",["quantity","total"])
   ]};
   if(type==="customer-products"||type==="top-customers"||type==="customers")return {blocks:[
    block("গ্রাহক ব্যয় ও অর্ডার","গ্রাহকের মোট ব্যয় ও অর্ডারের র‍্যাংকিং।",["customer","orders","total_spent","average_order","last_order"],rows.slice(0,20),"total_spent"),
    grouped("অর্ডার কার্যক্রম অনুযায়ী","Pending, delivered ও অন্যান্য order stage customer summary থেকে আলাদা বিশ্লেষণ।",rows.map(r=>({activity:r.pending_orders?"Pending orders":r.delivered_orders?"Delivered orders":"Other",total_spent:r.total_spent})),"activity",["total_spent"])
   ]};
   if(type==="purchase")return {blocks:[
    grouped("সরবরাহকারীভিত্তিক ক্রয়","প্রতি সরবরাহকারীর অর্ডার সংখ্যা ও মোট ক্রয়।",rows,"supplier",["total_amount"]),
    grouped("Purchase Order status","Draft, submitted, received বা অন্য স্ট্যাটাস অনুযায়ী অর্ডার।",rows,"status",["total_amount"])
   ]};
   if(type==="product-purchase")return {blocks:[
    grouped("পণ্যভিত্তিক ক্রয় পরিমাণ","অর্ডারকৃত, গৃহীত, বাকি ইউনিট এবং মোট কস্ট।",rows,"product",["quantity","received_quantity","pending_quantity","total"]),
    grouped("সরবরাহকারীভিত্তিক ক্রয় পণ্য","প্রতি সরবরাহকারীর ক্রয় লাইন ও মোট মূল্য।",rows,"supplier",["quantity","total"])
   ]};
   if(type==="payable")return {blocks:[
    grouped("সরবরাহকারীভিত্তিক অবশিষ্ট দায়","বিল মোট, বরাদ্দকৃত পেমেন্ট ও অবশিষ্ট ব্যালেন্স।",rows,"supplier",["bill_total","paid","balance"]),
    grouped("বিলের বয়স/অবস্থা","Open, Paid, Overdue, Draft ও Void আলাদা করে দেখানো।",rows,"due_state",["balance"])
   ]};
   if(type==="receivable"||type==="collections")return {blocks:[
    grouped("কুরিয়ারভিত্তিক COD সংগ্রহ","COD amount, collected, fee, remitted এবং pending remittance।",rows,"courier",["cod_amount","collected","remitted","pending_collection","pending_remittance"]),
    grouped("সেটেলমেন্ট স্ট্যাটাস","Pending, Collected, Remitted, Reconciled ও Exception আলাদা।",rows,"status",["cod_amount","collected","remitted"])
   ]};
   if(type==="low-stock"||type==="alert-products"||type==="stock"||type==="stock-list")return {blocks:[
    grouped("ক্যাটাগরি অনুযায়ী স্টক","মোট ইউনিট ও সংরক্ষিত cost price অনুযায়ী stock value।",rows,"category",["stock","stock_value"]),
    grouped("স্টক সতর্কতা","OUT OF STOCK, LOW ও OK অবস্থা অনুযায়ী পণ্য।",rows,"alert",["stock"])
   ]};
   if(type==="account-payments"){
    const transfers=(source.transfers||[]).map(t=>({transfer_date:t.transfer_date,source_account:t.source_account,destination_account:t.destination_account,amount:num(t.amount),reference:t.reference,status:t.status}));
    return {blocks:[
     grouped("অ্যাকাউন্টভিত্তিক পেমেন্ট","নির্বাচিত অ্যাকাউন্টে রেকর্ডকৃত পেমেন্ট।",rows,"account_name",["amount"]),
     grouped("পেমেন্ট পদ্ধতি অনুযায়ী","Cash, Bank, bKash বা অন্যান্য সংরক্ষিত payment method।",rows,"payment_method",["amount"]),
     block("অ্যাকাউন্ট ট্রান্সফার","অ্যাকাউন্টের অভ্যন্তরীণ স্থানান্তর; এগুলো income বা expense নয়।",["transfer_date","source_account","destination_account","amount","reference","status"],transfers,"amount")
    ]};
   }
   if(type==="expenses"){
    const confirmed=rows.filter(r=>String(r.status||"").toLowerCase()==="confirmed");
    const actualByMonthCategory=new Map();
    confirmed.forEach(r=>{const key=String(r.entry_date||"").slice(0,7)+"|"+String(r.category||"Uncategorised");actualByMonthCategory.set(key,(actualByMonthCategory.get(key)||0)+num(r.amount));});
    const budgetRows=(source.budgets||[]).map(b=>{const key=String(b.period_start||"").slice(0,7)+"|"+String(b.category||"");const actual=actualByMonthCategory.get(key)||0;return {month:String(b.period_start||"").slice(0,7),category:b.category,budget_amount:num(b.budget_amount),confirmed_expense:actual,remaining_budget:num(b.budget_amount)-actual,status:b.status};});
    return {blocks:[
     grouped("ক্যাটাগরি অনুযায়ী খরচ","Expense entry category অনুযায়ী amount ও রেকর্ড সংখ্যা।",rows,"category",["amount"]),
     block("মাসিক বাজেট বনাম নিশ্চিত খরচ","একই মাস ও ক্যাটাগরির Confirmed expense-এর সঙ্গে মাসিক budget তুলনা।",["month","category","budget_amount","confirmed_expense","remaining_budget","status"],budgetRows,"confirmed_expense"),
     grouped("খরচের স্ট্যাটাস","Draft, Confirmed ও Void খরচ আলাদা করে।",rows,"status",["amount"])
    ]};
   }
   if(type==="transactions")return {blocks:[
    grouped("লেনদেনের ধরন","Income, Expense ও অন্যান্য recorded entry type।",rows,"entry_type",["amount"]),
    grouped("আর্থিক শ্রেণি","Operating, Capital, Loan, Refund ও Adjustment আলাদা।",rows,"financial_class",["amount"]),
    grouped("লেনদেনের অবস্থা","Draft, Confirmed, Void বা সংরক্ষিত status।",rows,"status",["amount"]),
    grouped("ক্যাটাগরি অনুযায়ী লেনদেন","Finance ledger category অনুযায়ী amount।",rows,"category",["amount"])
   ]};
   return {blocks:[block("রিপোর্ট বিশ্লেষণ","নির্বাচিত রেকর্ডের সারাংশ।",rows.length?Object.keys(rows[0]).slice(0,8):["record"],rows.slice(0,20),"records")]};
  }
  function renderBars(rows,key){
   if(!rows.length)return '<div class="hf-report-empty"><strong>বিশ্লেষণের জন্য রেকর্ড নেই</strong><p>সংশ্লিষ্ট সোর্স মডিউলে ডেটা যুক্ত হলে এই অংশ পূরণ হবে।</p></div>';
   const max=Math.max(1,...rows.map(r=>num(r[key])));
   return '<div class="hf-report-bars">'+rows.slice(0,10).map(row=>{
    const label=String(row[Object.keys(row).find(k=>typeof row[k]==="string")||"date"]??"—"),value=num(row[key]),width=Math.max(value>0?2:0,value/max*100);
    return '<div class="hf-report-bar-row"><div class="hf-report-bar-label"><strong>'+esc(label)+'</strong><span>'+esc(displayCell(value,key))+'</span></div><div class="hf-report-bar-track"><span style="width:'+width.toFixed(1)+'%"></span></div></div>';
   }).join("")+'</div>';
  }
  function renderRecordTable(){
   if(!workspace||!report.rows)return;
   const q=String($("reportWorkspaceSearch")?.value||"").toLowerCase().trim(),filter=String($("reportWorkspaceFieldFilter")?.value||"");
   visibleRows=report.rows.filter(row=>(!q||Object.values(row).some(v=>String(v??"").toLowerCase().includes(q)))&&(!filter||String(row[activeFilterColumn]??"")===filter));
   const columns=report.columns.length?report.columns:Object.keys(report.rows[0]||{record:""});
   $("reportWorkspaceTableHead").innerHTML="<tr>"+columns.map(k=>"<th>"+esc(k.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportWorkspaceTableBody").innerHTML=visibleRows.length?visibleRows.slice(0,250).map(row=>"<tr>"+columns.map(k=>"<td>"+esc(displayCell(row[k],k))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+columns.length+'"><div class="hf-report-empty"><strong>কোনো রেকর্ড পাওয়া যায়নি</strong><p>সার্চ বা ফিল্টার পরিবর্তন করুন।</p></div></td></tr>';
   $("reportWorkspaceRecordsFoot").textContent=visibleRows.length>250?"প্রিভিউতে প্রথম ২৫০টি রেকর্ড দেখানো হচ্ছে; CSV/Excel-এ সব রেকর্ড থাকবে।":visibleRows.length+"টি রেকর্ড দেখানো হচ্ছে।";
  }
  function showSegment(segment){
   activeSegment=segment;
   ["overview","analysis","records"].forEach(id=>{const panel=$("reportWorkspace"+id.charAt(0).toUpperCase()+id.slice(1));if(panel)panel.hidden=id!==segment;});
   document.querySelectorAll("[data-report-segment]").forEach(b=>{const active=b.dataset.reportSegment===segment;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
   if(segment==="records")renderRecordTable();
  }
  function renderWorkspace(){
   if(!reportGroup||!workspace)return;
   const def=definitions[report.type]||definitions.business,metrics=kpisFor(report.type,report.rows,report.source||{}),analysis=analysisFor(report.type,report.rows,report.source||{});
   $("reportWorkspaceTitle").textContent=def[0];$("reportWorkspaceDescription").textContent=def[2];$("reportWorkspaceCode").textContent=report.type.toUpperCase();$("reportWorkspaceRange").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   $("reportWorkspaceKpis").innerHTML=metrics.map(m=>'<article class="hf-report-kpi"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong><span>'+esc(m.note)+'</span></article>').join("");
   $("reportWorkspaceTabs").innerHTML='<button type="button" role="tab" data-report-segment="overview" aria-selected="true" class="active">সারসংক্ষেপ</button><button type="button" role="tab" data-report-segment="analysis" aria-selected="false">'+esc(def[3])+'</button><button type="button" role="tab" data-report-segment="records" aria-selected="false">'+esc(def[4])+'</button>';
   const blocks=analysis.blocks||[];
   const firstBlock=blocks[0]||{title:def[3],description:def[2],columns:[],rows:[],bars:"records"};
   $("reportWorkspaceOverview").innerHTML='<div class="hf-report-overview-grid"><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>মূল সূচক</h3><p>নির্বাচিত সময়ের রেকর্ড ও নির্দিষ্ট ডেটা সোর্স</p></div><span>'+metrics.length+' indicators</span></div>'+tableMarkup(metrics.map(m=>({বিষয়:m.label,মান:m.value,বিবরণ:m.note})),["বিষয়","মান","বিবরণ"],"সারাংশ নেই")+'</section><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(firstBlock.title)+'</h3><p>'+esc(firstBlock.description)+'</p></div></div>'+tableMarkup(firstBlock.rows,firstBlock.columns,"বিশ্লেষণের ডেটা নেই")+'</section></div><div class="hf-report-source-note">'+esc(report.notes||"রিপোর্টটি সংযুক্ত ডেটা সোর্স থেকে তৈরি।")+'</div>';
   $("reportWorkspaceAnalysis").innerHTML=blocks.map(block=>'<section class="hf-report-subsection" style="margin-bottom:12px"><div class="hf-report-subsection-head"><div><h3>'+esc(block.title)+'</h3><p>'+esc(block.description||"বিভাগ/ধরন অনুযায়ী বিশ্লেষণ; মূল রেকর্ড অপরিবর্তিত থাকে।")+'</p></div><span>'+block.rows.length+' groups</span></div>'+renderBars(block.rows,block.bars||"records")+tableMarkup(block.rows,block.columns,"এই উপ-বিশ্লেষণে কোনো রেকর্ড নেই")+'</section>').join("");
   $("reportWorkspaceRecordsTitle").textContent=def[4];$("reportWorkspaceRecordsNote").textContent="মূল সোর্স রেকর্ড; সার্চ, ফিল্টার এবং CSV/Excel/PDF এক্সপোর্ট ব্যবহার করুন।";
   const preferred=({business:"status",sales:"payment_method","product-sales":"product","top-products":"product","customer-wise-products":"customer","customer-products":"customer","top-customers":"customer",customers:"customer",purchase:"supplier","product-purchase":"product",payable:"supplier",receivable:"courier",collections:"courier","low-stock":"category","alert-products":"alert",stock:"category","stock-list":"category","account-payments":"account_name",expenses:"category",transactions:"entry_type",daily:"date"})[report.type]||"";
   activeFilterColumn=preferred&&report.rows.some(r=>r[preferred]!==undefined)?preferred:"";
   const filter=$("reportWorkspaceFieldFilter"),values=activeFilterColumn?[...new Set(report.rows.map(r=>String(r[activeFilterColumn]??"")).filter(Boolean))].sort():[];
   if(filter){filter.innerHTML='<option value="">সব '+(activeFilterColumn?esc(activeFilterColumn.replace(/_/g," ")):"রেকর্ড")+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");filter.disabled=!values.length;filter.value="";}
   $("reportWorkspaceSearch").value="";renderRecordTable();
   $("reportTitle").textContent=def[0];$("reportRangeLabel").textContent=report.rangeLabel;
   $("reportSummary").innerHTML=metrics.slice(0,3).map(m=>'<div class="hf-summary-pill"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong></div>').join("");
   $("reportNote").textContent=report.notes||"";
   $("reportCreatedAt").textContent="Generated "+dateTime(new Date().toISOString());
   const hero=document.querySelector(".hf-reports-hero h1");if(hero)hero.textContent=def[0];
   const eyebrow=document.querySelector(".hf-reports-hero .page-eyebrow");if(eyebrow)eyebrow.textContent="INDIVIDUAL REPORT";
   const heroDescription=document.querySelector(".hf-reports-hero p:not(.page-eyebrow)");if(heroDescription)heroDescription.textContent=def[2];
   if($("printReportTitle"))$("printReportTitle").textContent=def[0];
   if($("printReportDetails"))$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   showSegment(activeSegment);
  }
  async function fetchReportFinance(range){
   let q=client.from("admin_finance_entries").select("id,entry_type,category,amount,entry_date,description,reference,status,related_order_id,account_id,payment_method,party_name,financial_class,related_supplier_payment_id,related_cod_settlement_id,created_by,created_at,updated_at").order("entry_date",{ascending:false}).order("created_at",{ascending:false}).limit(3000);
   if(range)q=rangeQuery(q,"entry_date",range);
   return signedQuery(q);
  }
  async function fetchReportSettlements(range){
   let q=client.from("admin_cod_settlements").select("id,order_id,order_number,customer_name,courier_name,tracking_reference,cod_amount,collected_amount,courier_fee,adjustment_amount,remitted_amount,status,collected_at,remitted_at,created_at,updated_at").order("created_at",{ascending:false}).limit(3000);
   if(range)q=rangeQuery(q,"created_at",range);
   return signedQuery(q);
  }
  async function buildReport(){
   const range=selectedRange(),type=$("reportType").value;
   if(reportGroup&&!allowed.includes(type))throw new Error("এই ওয়ার্কস্পেসে নির্বাচিত রিপোর্টটি নেই।");
   let rows=[],title="",notes="",source={};
   if(type==="orders"){
    const orders=await fetchOrders(range,5000);source.orders=orders;
    rows=orders.map(o=>({order_number:o.order_number||String(o.id).slice(0,8),ordered_at:o.ordered_at,customer_name:$("includePersonalData").checked?o.customer_name:"",customer_phone:$("includePersonalData").checked?o.customer_phone:"",customer_email:$("includePersonalData").checked?o.customer_email:"",status:o.status,subtotal:num(o.subtotal),delivery_charge:num(o.delivery_charge),total:num(o.total),payment_method:o.payment_method,items:(o.order_items||[]).map(i=>i.product_name+" x "+i.quantity+" "+(i.unit||"")).join("; ")}));
    if(!$("includePersonalData").checked)rows=rows.map(({customer_name,customer_phone,customer_email,...rest})=>rest);
    title="Orders Report";notes="Recorded order values are not proof of payment collection.";
   }else if(type==="analytics"){
    const events=await fetchEvents(range,15000);source.events=events;
    rows=events.map(e=>({occurred_at:e.occurred_at,event_name:e.event_name,page_path:e.page_path,page_title:e.page_title,session_id:e.session_id,item_name:e.item_name,item_category:e.item_category,value:e.value,quantity:e.quantity,source:e.source,medium:e.medium,campaign:e.campaign}));
    title="Website Analytics Report";notes="Recorded website interactions; events are not automatically verified people or paid sales.";
   }else if(type==="products"){
    const products=await fetchProducts(10000);source.products=products;
    rows=products.map(p=>({name:p.name,sku:p.sku,category:p.category,price:num(p.price),stock_quantity:p.stock_quantity,is_active:p.is_active?"visible":"hidden",is_featured:p.is_featured?"yes":"no",updated_at:p.updated_at||p.created_at}));
    title="Products & Inventory Snapshot";notes="Current catalogue snapshot.";
   }else if(type==="content"){
    const blocks=await signedQuery(client.from("site_content_blocks").select("block_key,block_type,title,image_url,link_url,alt_text,is_active,sort_order,updated_by,updated_at").order("sort_order",{ascending:true}));
    rows=blocks.map(b=>({placement:b.block_type,key:b.block_key,title:b.title,image_url:b.image_url,destination_url:b.link_url,alt_text:b.alt_text,active:b.is_active?"yes":"no",sort_order:b.sort_order,updated_by:b.updated_by,updated_at:b.updated_at}));
    title="Homepage Content Settings";notes="Homepage banner and promotion configuration.";
   }else if(["business","sales","daily","product-sales","top-products","customer-wise-products","customer-products","top-customers","customers"].includes(type)){
    const orders=await fetchOrders(range,5000);source.orders=orders;
    const valid=orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled");
    const totalSales=valid.reduce((n,o)=>n+num(o.total),0);
    if(type==="business"){
     const byDay=new Map();orders.forEach(o=>{const day=dhakaDateKey(o.ordered_at);if(!day)return;const r=byDay.get(day)||{date:day,orders:0,order_value:0,delivery_charge:0,cancelled_orders:0};r.orders++;if(String(o.status).toLowerCase()==="cancelled")r.cancelled_orders++;else{r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);}byDay.set(day,r);});
     rows=[...byDay.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Business Overview Report";notes="Order totals represent recorded non-cancelled orders, not verified collections.";
    }else if(type==="sales"){
     const byDay=new Map();valid.forEach(o=>{const day=dhakaDateKey(o.ordered_at);if(!day)return;const r=byDay.get(day)||{date:day,orders:0,order_value:0,delivery_charge:0};r.orders++;r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);byDay.set(day,r);});
     rows=[...byDay.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Sales Performance Report";notes="Sales are based on non-cancelled order totals; payment method and status analysis uses source orders.";
    }else if(type==="daily"){
     const [finance,settlements]=await Promise.all([fetchReportFinance(range),fetchReportSettlements(null)]);source.finance=finance;source.settlements=settlements;
     const byDay=new Map();const dayRow=day=>{if(!day)return null;let r=byDay.get(day);if(!r){r={date:day,orders:0,cancelled_orders:0,order_value:0,delivery_charge:0,confirmed_expenses:0,cod_collected:0,cod_remitted_recorded:0,cod_remitted_verified:0,courier_fees:0};byDay.set(day,r);}return r;};
     orders.forEach(o=>{const r=dayRow(dhakaDateKey(o.ordered_at));if(r){r.orders++;if(String(o.status).toLowerCase()==="cancelled")r.cancelled_orders++;else{r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);}}});
     finance.filter(e=>String(e.entry_type).toLowerCase()==="expense"&&String(e.status).toLowerCase()==="confirmed").forEach(e=>{const r=dayRow(String(e.entry_date||"").slice(0,10));if(r)r.confirmed_expenses+=num(e.amount);});
     settlements.forEach(s=>{if(s.collected_at){const r=dayRow(String(s.collected_at).slice(0,10));if(r){r.cod_collected+=num(s.collected_amount);r.courier_fees+=num(s.courier_fee);}}if(s.remitted_at){const r=dayRow(String(s.remitted_at).slice(0,10));if(r){r.cod_remitted_recorded+=num(s.remitted_amount);}}});
     finance.filter(e=>String(e.entry_type||"").toLowerCase()==="income"&&String(e.status||"").toLowerCase()==="confirmed"&&e.related_cod_settlement_id).forEach(e=>{const r=dayRow(String(e.entry_date||"").slice(0,10));if(r)r.cod_remitted_verified+=num(e.amount);});
     rows=[...byDay.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Daily Business Report";notes="অর্ডার মূল্য cancelled বাদে; ব্যয় কেবল Confirmed expense। COD collection ও settlement-এ লেখা remittance তাদের event date-এ এবং verified remittance linked confirmed Finance income-এর entry date-এ দেখানো হয়েছে। Recorded amount-কে verified cash ধরা হয় না।";
    }else if(type==="product-sales"||type==="top-products"){
     const map=new Map();valid.forEach(o=>(o.order_items||[]).forEach(i=>{const key=String(i.product_id||i.product_name||"Unknown");const r=map.get(key)||{product:i.product_name||"Unknown",quantity_sold:0,sales:0,order_lines:0};r.quantity_sold+=num(i.quantity);r.sales+=num(i.line_total)||num(i.quantity)*num(i.unit_price);r.order_lines++;map.set(key,r);}));
     const products=await fetchProducts(10000);source.products=products;
     const productById=new Map(products.map(p=>[String(p.id),p])),productByName=new Map(products.map(p=>[String(p.name||"").trim().toLowerCase(),p]));
     rows=[...map.entries()].map(([key,r])=>{const product=productById.get(key)||productByName.get(String(r.product||"").trim().toLowerCase());return {...r,sku:product?.sku||"",category:product?.category||"Uncategorised",current_stock:product?num(product.stock_quantity):null,minimum_stock:product?num(product.low_stock_threshold??5):null,catalogue_status:product?(product.is_active===false?"Hidden":"Active"):"Not in current catalogue"};}).sort((a,b)=>type==="top-products"?b.quantity_sold-a.quantity_sold:b.sales-a.sales).map((r,i)=>({rank:i+1,...r}));
     title=type==="top-products"?"Top Selling Products":"Product Sales Report";notes=type==="top-products"?"Ranked by units sold. SKU, category and stock are current catalogue attributes; sales quantity/value remain order-item snapshots.":"Built from non-cancelled order_items snapshots. Current SKU/category/stock are joined from the live catalogue and may differ from historical order snapshots.";
    }else if(type==="customer-wise-products"){
     const map=new Map();valid.forEach(o=>(o.order_items||[]).forEach(i=>{const key=String(o.customer_id||o.customer_name||"Unknown")+"|"+String(i.product_id||i.product_name||"");const r=map.get(key)||{customer:o.customer_name||"Unknown",product:i.product_name||"Unknown",quantity:0,total:0,order_lines:0};r.quantity+=num(i.quantity);r.total+=num(i.line_total)||num(i.quantity)*num(i.unit_price);r.order_lines++;map.set(key,r);}));
     rows=[...map.values()].sort((a,b)=>b.total-a.total);title="Customer-wise Product Sales Report";notes="Each row represents one customer/product pair.";
    }else if(type==="customer-products"){
     const map=new Map();valid.forEach(o=>{const key=String(o.customer_id||o.customer_name||"Unknown");const r=map.get(key)||{customer:o.customer_name||"Unknown",orders:0,unique_products:0,units:0,total_spent:0,last_order:"",_products:new Map()};r.orders++;r.total_spent+=num(o.total);const stamp=String(o.ordered_at||"");if(stamp>r.last_order)r.last_order=stamp;(o.order_items||[]).forEach(i=>{const name=i.product_name||"Unknown";r.units+=num(i.quantity);r._products.set(name,(r._products.get(name)||0)+num(i.quantity));});map.set(key,r);});
     rows=[...map.values()].map(r=>{r.unique_products=r._products.size;r.top_product=[...r._products.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";delete r._products;return r;}).sort((a,b)=>b.unique_products-a.unique_products||b.total_spent-a.total_spent);title="Customer Product Report";notes="One row per customer, with unique products, total units, top product and last order.";
    }else{
     const map=new Map();valid.forEach(o=>{const key=String(o.customer_id||o.customer_name||"Unknown");const r=map.get(key)||{customer:o.customer_name||"Unknown",orders:0,total_spent:0,average_order:0,last_order:"",pending_orders:0,delivered_orders:0};r.orders++;r.total_spent+=num(o.total);const stamp=String(o.ordered_at||"");if(stamp>r.last_order)r.last_order=stamp;if(String(o.status).toLowerCase()==="delivered")r.delivered_orders++;if(["pending","processing","shipped"].includes(String(o.status).toLowerCase()))r.pending_orders++;map.set(key,r);});
     rows=[...map.values()].map(r=>({...r,average_order:r.orders?r.total_spent/r.orders:0})).sort((a,b)=>type==="top-customers"?b.total_spent-a.total_spent:b.orders-a.orders).map((r,i)=>({rank:i+1,...r}));title=type==="top-customers"?"Top Customers Report":"Customer Report";notes="Grouped by customer ID where available, otherwise customer name. Personal contact data is not included.";
    }
   }else if(type==="purchase"||type==="product-purchase"){
    const purchases=await signedQuery(rangeQuery(client.from("admin_purchase_orders").select("id,purchase_number,status,order_date,expected_date,total_amount,supplier_id,admin_suppliers(name),admin_purchase_order_items(id,product_id,product_name,quantity,received_quantity,unit_cost,line_total,unit)").order("order_date",{ascending:false}).limit(5000),"order_date",range));source.purchases=purchases;
    if(type==="purchase")rows=purchases.map(p=>({purchase_number:p.purchase_number,status:p.status,purchase_date:p.order_date,expected_date:p.expected_date,supplier:p.admin_suppliers?.name||"—",items:(p.admin_purchase_order_items||[]).length,total_amount:num(p.total_amount),ordered_units:(p.admin_purchase_order_items||[]).reduce((n,i)=>n+num(i.quantity),0),received_units:(p.admin_purchase_order_items||[]).reduce((n,i)=>n+num(i.received_quantity),0)}));
    else rows=purchases.flatMap(p=>(p.admin_purchase_order_items||[]).map(i=>({purchase_number:p.purchase_number,purchase_date:p.order_date,status:p.status,supplier:p.admin_suppliers?.name||"—",product:i.product_name,quantity:num(i.quantity),received_quantity:num(i.received_quantity),pending_quantity:Math.max(0,num(i.quantity)-num(i.received_quantity)),unit:i.unit,unit_cost:num(i.unit_cost),total:num(i.line_total)})));
    title=type==="purchase"?"Purchase Report":"Product Purchase Report";notes="Only recorded Purchase Orders and saved purchase-order item snapshots are included; order creation does not prove payment.";
   }else if(type==="payable"){
    const [bills,allocations,payments,credits,supplierBalances]=await Promise.all([
     signedQuery(rangeQuery(client.from("admin_supplier_bills").select("id,supplier_id,bill_number,supplier_invoice_number,invoice_date,due_date,total_amount,status,admin_suppliers(name)").order("invoice_date",{ascending:false}).order("id",{ascending:true}).limit(5000),"invoice_date",range)),
     signedQuery(client.from("admin_supplier_payment_allocations").select("payment_id,supplier_bill_id,allocated_amount").limit(20000)),
     signedQuery(client.from("admin_supplier_payments").select("id,supplier_id,status,payment_date,amount").limit(10000)),
     signedQuery(client.from("admin_supplier_credit_notes").select("id,supplier_id,supplier_bill_id,credit_date,amount,status").limit(10000)),
     signedQuery(client.from("admin_supplier_balances").select("supplier_id,supplier_name,outstanding_balance,total_bills,total_paid,total_credits,opening_balance,last_purchase_date,last_payment_date").order("supplier_name",{ascending:true}).limit(2000))
    ]);
    const confirmedPaymentIds=new Set(payments.filter(p=>String(p.status||"").toLowerCase()==="confirmed").map(p=>p.id));
    const paidByBill=new Map();allocations.forEach(a=>{if(confirmedPaymentIds.has(a.payment_id))paidByBill.set(a.supplier_bill_id,(paidByBill.get(a.supplier_bill_id)||0)+num(a.allocated_amount));});
    const creditByBill=new Map();credits.forEach(c=>{if(String(c.status||"").toLowerCase()==="confirmed"&&c.supplier_bill_id)creditByBill.set(c.supplier_bill_id,(creditByBill.get(c.supplier_bill_id)||0)+num(c.amount));});
    const supplierBalanceById=new Map(supplierBalances.map(v=>[v.supplier_id,v]));
    rows=bills.map(bill=>{
     const st=String(bill.status||"").toLowerCase(),total=num(bill.total_amount),paid=paidByBill.get(bill.id)||0,credit=creditByBill.get(bill.id)||0;
     const balance=st==="confirmed"?Math.max(0,total-paid-credit):0,supplier=supplierBalanceById.get(bill.supplier_id);
     const due=st==="void"?"Void":st==="draft"?"Draft":bill.due_date&&bill.due_date<todayISO()&&balance>0?"Overdue":balance<=0&&paid+credit>0?"Paid / Credited":paid+credit>0?"Partially paid":"Open";
     return {bill_number:bill.bill_number,supplier:bill.admin_suppliers?.name||supplier?.supplier_name||"—",supplier_invoice_number:bill.supplier_invoice_number,invoice_date:bill.invoice_date,due_date:bill.due_date,status:bill.status,bill_total:total,paid,confirmed_credit:credit,balance,due_state:due,supplier_current_balance:num(supplier?.outstanding_balance)};
    });
    source.bills=bills;source.payments=payments;source.allocations=allocations;source.credits=credits;source.supplierBalances=supplierBalances;
    title="Supplier Payables Report";
    notes="Bills are selected by invoice date. Bill-level payments include allocations from confirmed supplier payments only; confirmed credit notes are deducted. Supplier balances show the latest ledger position, not a historical as-of balance.";
   }else if(type==="receivable"||type==="collections"){
    const [settlements,codFinance]=await Promise.all([fetchReportSettlements(null),fetchReportFinance(null)]);
    source.settlements=settlements;source.codFinance=codFinance.filter(e=>e.entry_type==="income"&&e.status==="confirmed"&&e.related_cod_settlement_id);
    const verifiedBySettlement=new Map();source.codFinance.forEach(e=>verifiedBySettlement.set(e.related_cod_settlement_id,(verifiedBySettlement.get(e.related_cod_settlement_id)||0)+num(e.amount)));
    const inRange=value=>{const day=String(value||"").slice(0,10);if(!day)return false;const from=range.fromDay??(range.from?String(range.from).slice(0,10):"0000-01-01");const to=range.toDay??(range.to?String(range.to).slice(0,10):todayISO());return day>=from&&day<=to;};
    rows=settlements.filter(settlement=>String(settlement.status||"").toLowerCase()!=="cancelled").map(settlement=>{
     const cod=num(settlement.cod_amount),collected=num(settlement.collected_amount),fee=num(settlement.courier_fee),adjustment=num(settlement.adjustment_amount);
     const expected=Math.max(0,collected-fee+adjustment),verified=verifiedBySettlement.get(settlement.id)||0;
     return {settlement_id:settlement.id,order_number:settlement.order_number,customer:settlement.customer_name,courier:settlement.courier_name,tracking_reference:settlement.tracking_reference,cod_amount:cod,collected,courier_fee:fee,adjustment_amount:adjustment,expected_net_remittance:expected,recorded_remitted:num(settlement.remitted_amount),verified_remitted:verified,pending_collection:Math.max(0,cod-collected),pending_remittance:Math.max(0,expected-verified),remittance_variance:verified-expected,status:settlement.status,collected_at:settlement.collected_at,remitted_at:settlement.remitted_at,created_at:settlement.created_at,remitted_account_id:settlement.remitted_account_id};
    });
    if(type==="receivable")rows=rows.filter(r=>r.pending_collection>0||r.pending_remittance>0||["pending","exception"].includes(String(r.status).toLowerCase()));
    else rows=rows.filter(r=>inRange(r.collected_at)||inRange(r.remitted_at)||inRange(r.created_at));
    title=type==="receivable"?"Courier / COD Receivable Report":"COD Collections Report";
    notes=type==="receivable"?"Current exposure snapshot. Uncollected COD and net courier remittance not yet verified in Finance are shown separately. This is not customer credit debt.":"Selected by collection/remittance/creation date; linked confirmed Finance income is the verified remittance source. Settlement rows show the latest saved state, not a full event-by-event history.";
   }else if(["low-stock","alert-products","stock","stock-list"].includes(type)){
    const products=await fetchProducts(10000);source.products=products;
    const active=products.filter(p=>p.is_active!==false).map(p=>({product:p.name,sku:p.sku,category:p.category||"Uncategorised",price:num(p.price),stock:num(p.stock_quantity),minimum_stock:num(p.low_stock_threshold??5),unit_cost:p.cost_price===null?null:num(p.cost_price),stock_value:p.cost_price===null?null:num(p.stock_quantity)*num(p.cost_price),alert:num(p.stock_quantity)<=0?"OUT OF STOCK":num(p.stock_quantity)<=num(p.low_stock_threshold??5)?"LOW":"OK",updated_at:p.updated_at||p.created_at}));
    rows=type==="low-stock"?active.filter(p=>p.stock>0&&p.stock<=p.minimum_stock):type==="alert-products"?active.filter(p=>p.stock<=p.minimum_stock):active;
    title=({ "low-stock":"Low Stock Products","alert-products":"Alert Product List",stock:"Stock Valuation Report","stock-list":"Current Stock List"})[type];notes="Current catalogue snapshot only; historical stock movement is not stored in this report. Missing unit cost is left blank, not estimated.";
   }else if(["account-payments","expenses","transactions"].includes(type)){
    const finance=await fetchReportFinance(range);source.finance=finance;
    if(type==="account-payments"){
     const [allFinance,accounts,periodTransfers,allTransfers]=await Promise.all([
      fetchReportFinance(null),
      signedQuery(client.from("admin_finance_accounts").select("id,name,account_type,provider,account_reference,opening_balance,opening_date,is_active").order("name",{ascending:true}).limit(1000)),
      fetchReportTransfers(range),
      fetchReportTransfers(null)
     ]);
     const accountMap=new Map(accounts.map(account=>[account.id,account]));
     source.accountBalances=accounts.map(account=>{
      const openingDate=String(account.opening_date||"0000-01-01").slice(0,10);
      const ledger=allFinance.filter(e=>e.account_id===account.id&&e.status==="confirmed"&&String(e.entry_date||"")>=openingDate).reduce((total,e)=>total+(e.entry_type==="income"?num(e.amount):e.entry_type==="expense"?-num(e.amount):0),0);
      const transferIn=allTransfers.filter(t=>t.destination_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date||"")>=openingDate).reduce((total,t)=>total+num(t.amount),0);
      const transferOut=allTransfers.filter(t=>t.source_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date||"")>=openingDate).reduce((total,t)=>total+num(t.amount),0);
      const periodEntries=finance.filter(e=>e.account_id===account.id&&e.status==="confirmed");
      const periodIn=periodEntries.filter(e=>e.entry_type==="income").reduce((total,e)=>total+num(e.amount),0);
      const periodOut=periodEntries.filter(e=>e.entry_type==="expense").reduce((total,e)=>total+num(e.amount),0);
      const periodTransferIn=periodTransfers.filter(t=>t.status==="confirmed"&&t.destination_account_id===account.id).reduce((total,t)=>total+num(t.amount),0);
      const periodTransferOut=periodTransfers.filter(t=>t.status==="confirmed"&&t.source_account_id===account.id).reduce((total,t)=>total+num(t.amount),0);
      return {account_id:account.id,account_name:account.name,account_type:account.account_type,provider:account.provider,account_reference:account.account_reference,is_active:account.is_active,opening_balance:num(account.opening_balance),opening_date:openingDate,current_balance:num(account.opening_balance)+ledger+transferIn-transferOut,period_income:periodIn,period_expense:periodOut,period_transfer_in:periodTransferIn,period_transfer_out:periodTransferOut,period_net_movement:periodIn-periodOut+periodTransferIn-periodTransferOut};
     });
     source.transfers=periodTransfers.map(t=>({...t,source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—"}));
     const entries=finance.map(e=>({record_kind:"Finance entry",record_id:e.id,entry_date:e.entry_date,entry_type:e.entry_type,party_name:e.party_name,account_name:accountMap.get(e.account_id)?.name||"Unassigned",account_type:accountMap.get(e.account_id)?.account_type||"",source_account:"",destination_account:"",payment_method:e.payment_method,category:e.category,financial_class:e.financial_class,amount:num(e.amount),status:e.status,reference:e.reference,related_order_id:e.related_order_id||"",description:e.description}));
     const transfers=periodTransfers.map(t=>({record_kind:"Internal transfer",record_id:t.id,entry_date:t.transfer_date,entry_type:"transfer",party_name:"",account_name:"",account_type:"",source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—",payment_method:"Internal transfer",category:"Internal transfer",financial_class:"internal_transfer",amount:num(t.amount),status:t.status,reference:t.reference||"",related_order_id:"",description:t.description||""}));
     rows=[...entries,...transfers].sort((a,b)=>String(b.entry_date||"").localeCompare(String(a.entry_date||"")));
     source.allFinanceCount=allFinance.length;source.allTransfersCount=allTransfers.length;
     notes="Current balance = opening balance + confirmed account-linked income − confirmed expenses + confirmed transfers in − transfers out. Period movement uses selected-period records. Internal transfers are not income or expense.";
    }else if(type==="expenses"){
     rows=finance.filter(e=>String(e.entry_type||"").toLowerCase()==="expense").map(e=>({entry_date:e.entry_date,category:e.category,party_name:e.party_name,amount:num(e.amount),status:e.status,financial_class:e.financial_class,payment_method:e.payment_method,reference:e.reference,description:e.description}));
     const [budgets,budgetFinance]=await Promise.all([
      signedQuery(client.from("admin_finance_budgets").select("category,period_start,budget_amount,status,notes").order("period_start",{ascending:false}).order("category",{ascending:true}).limit(3000)),
      fetchReportFinance(null)
     ]);
     source.budgets=budgets.filter(b=>(!range?.fromDay||String(b.period_start).slice(0,7)>=String(range.fromDay||range.from).slice(0,7))&&(!range?.toDay||String(b.period_start).slice(0,7)<=String(range.toDay||range.to).slice(0,7)));
     source.budgetFinance=budgetFinance.filter(e=>String(e.entry_type||"").toLowerCase()==="expense"&&e.status==="confirmed"&&(e.financial_class||"operating")==="operating");
     notes="Expense records follow the selected date range. Budget utilization compares each listed calendar month with that full month’s confirmed operating expenses; budget is a planning limit, not paid cash.";
    }else{
     const [transfers,accounts]=await Promise.all([fetchReportTransfers(range),signedQuery(client.from("admin_finance_accounts").select("id,name,account_type").order("name",{ascending:true}).limit(1000))]);
     const accountMap=new Map(accounts.map(account=>[account.id,account]));source.transfers=transfers;source.accounts=accounts;
     const entries=finance.map(e=>({record_kind:"Finance entry",record_id:e.id,entry_date:e.entry_date,entry_type:e.entry_type,category:e.category,party_name:e.party_name,amount:num(e.amount),financial_class:e.financial_class,status:e.status,payment_method:e.payment_method,account_name:accountMap.get(e.account_id)?.name||"Unassigned",source_account:"",destination_account:"",reference:e.reference,related_order_id:e.related_order_id,related_supplier_payment_id:e.related_supplier_payment_id,related_cod_settlement_id:e.related_cod_settlement_id,description:e.description}));
     const transferRows=transfers.map(t=>({record_kind:"Internal transfer",record_id:t.id,entry_date:t.transfer_date,entry_type:"transfer",category:"Internal transfer",party_name:"",amount:num(t.amount),financial_class:"internal_transfer",status:t.status,payment_method:"Internal transfer",account_name:"",source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—",reference:t.reference||"",related_order_id:"",related_supplier_payment_id:"",related_cod_settlement_id:"",description:t.description||""}));
     rows=[...entries,...transferRows].sort((a,b)=>String(b.entry_date||"").localeCompare(String(a.entry_date||"")));
     notes="Finance ledger entries and internal account transfers are shown as distinct record types. Transfers do not count as income or expense. Capital, loan, refund and adjustment classes are not ordinary operating income/expense.";
    }
    title=type==="account-payments"?"Account Payments & Balances":type==="expenses"?"Expense & Budget Report":"Financial Transactions Ledger";
   }else if(type==="finance"){
    const finance=await fetchReportFinance(range);source.finance=finance;rows=finance.map(e=>({entry_date:e.entry_date,entry_type:e.entry_type,category:e.category,amount:num(e.amount),status:e.status,financial_class:e.financial_class,reference:e.reference,description:e.description}));title="Finance Entries Report";notes="Source: Finance ledger.";
   }else{
    const orders=await fetchOrders(range,5000);source.orders=orders;rows=orders.map(o=>({order_number:o.order_number,ordered_at:o.ordered_at,status:o.status,subtotal:num(o.subtotal),delivery_charge:num(o.delivery_charge),total:num(o.total),payment_method:o.payment_method}));title="Orders Report";notes="Recorded orders; values are not proof of payment.";
   }
   const defaultColumns=({
    business:["date","orders","order_value","delivery_charge","cancelled_orders"],
    sales:["date","orders","order_value","delivery_charge"],
    daily:["date","orders","cancelled_orders","order_value","delivery_charge","confirmed_expenses","cod_collected","cod_remitted_recorded","cod_remitted_verified"],
    "product-sales":["rank","product","quantity_sold","sales","order_lines"],"top-products":["rank","product","quantity_sold","sales","order_lines"],
    "customer-wise-products":["customer","product","quantity","total","order_lines"],"customer-products":["customer","orders","unique_products","units","total_spent","last_order","top_product"],
    "top-customers":["rank","customer","orders","total_spent","average_order","last_order"],customers:["rank","customer","orders","total_spent","average_order","last_order"],
    purchase:["purchase_number","status","purchase_date","expected_date","supplier","items","ordered_units","received_units","total_amount"],
    "product-purchase":["purchase_number","purchase_date","supplier","product","quantity","received_quantity","pending_quantity","unit_cost","total"],
    payable:["bill_number","supplier","invoice_date","due_date","status","bill_total","paid","balance","due_state"],
    receivable:["order_number","customer","courier","cod_amount","collected","pending_collection","remitted","pending_remittance","status"],
    collections:["order_number","courier","tracking_reference","cod_amount","collected","courier_fee","remitted","status","collected_at","remitted_at"],
    "low-stock":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],
    "alert-products":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],
    stock:["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],
    "stock-list":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],
    "account-payments":["entry_date","entry_type","party_name","account_name","account_type","payment_method","category","financial_class","amount","status","reference"],
    expenses:["entry_date","category","party_name","amount","status","financial_class","payment_method","reference","description"],
    transactions:["entry_date","entry_type","category","party_name","amount","financial_class","status","payment_method","reference","related_order_id","description"]
   })[type]||["entry_date","entry_type","category","amount","status"];
   const capNotices=[];
   if(source.orders?.length>=5000)capNotices.push("The report reached the 5,000-order retrieval cap.");
   if(source.events?.length>=15000)capNotices.push("The report reached the 15,000-event retrieval cap.");
   if(source.products?.length>=10000)capNotices.push("The report reached the 10,000-product retrieval cap.");
   if(source.finance?.length>=10000||source.allFinanceCount>=10000||source.budgetFinance?.length>=10000)capNotices.push("The report reached the 10,000-entry finance retrieval cap; figures may be incomplete.");
   if(source.settlements?.length>=10000)capNotices.push("The report reached the 10,000-settlement retrieval cap.");
   if(source.bills?.length>=5000)capNotices.push("The report reached the 5,000-bill retrieval cap.");
   if(source.credits?.length>=10000||source.payments?.length>=10000||source.allocations?.length>=20000)capNotices.push("A supplier payment or credit source reached its retrieval cap; check the full Supplier Ledger for a complete statement.");
   if(capNotices.length)notes=(notes?notes+" ":"")+capNotices.join(" ");
   const displayRange=["low-stock","alert-products","stock","stock-list","products","content","receivable"].includes(type)?"Current snapshot":range.label;
   report={title,columns:rows.length?Object.keys(rows[0]):defaultColumns,rows,notes,rangeLabel:displayRange,type,source};
   $("reportTitle").textContent=title;$("reportRangeLabel").textContent=displayRange;$("reportRowsCount").textContent=rows.length.toLocaleString("en-BD")+" records";$("reportNote").textContent=notes;
   $("reportSummary").innerHTML='<div class="hf-summary-pill"><small>Records</small><strong>'+rows.length.toLocaleString("en-BD")+'</strong></div><div class="hf-summary-pill"><small>Report</small><strong style="font-size:14px">'+esc(title)+'</strong></div><div class="hf-summary-pill"><small>Period</small><strong style="font-size:13px">'+esc(displayRange)+'</strong></div>';
   const sample=rows.slice(0,200);$("reportTableHead").innerHTML="<tr>"+report.columns.map(c=>"<th>"+esc(c.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportTableBody").innerHTML=sample.length?sample.map(row=>"<tr>"+report.columns.map(c=>"<td>"+esc(displayCell(row[c],c))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'">'+makeEmpty("No report records","Try another period or add records in the source workspace.")+'</td></tr>';
   $("reportSampleNote").textContent=rows.length>sample.length?"Preview displays the first "+sample.length+" rows. Downloads include all "+rows.length+" rows.":"Preview contains all rows in this report.";
   $("reportCreatedAt").textContent="Generated "+dateTime(new Date().toISOString());
   if(reportGroup)renderWorkspace();
   return report;
  }
  function renderRecordTable(){
   if(!workspace||!report.rows)return;
   const query=String($("reportWorkspaceSearch")?.value||"").toLowerCase().trim(),filter=String($("reportWorkspaceFieldFilter")?.value||"");
   visibleRows=report.rows.filter(row=>(!query||Object.values(row).some(v=>String(v??"").toLowerCase().includes(query)))&&(!filter||String(row[activeFilterColumn]??"")===filter));
   $("reportWorkspaceTableHead").innerHTML="<tr>"+report.columns.map(k=>"<th>"+esc(k.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportWorkspaceTableBody").innerHTML=visibleRows.length?visibleRows.slice(0,250).map(row=>"<tr>"+report.columns.map(k=>"<td>"+esc(displayCell(row[k],k))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'"><div class="hf-report-empty"><strong>কোনো রেকর্ড পাওয়া যায়নি</strong><p>সার্চ বা ফিল্টার পরিবর্তন করুন।</p></div></td></tr>';
   $("reportWorkspaceRecordsFoot").textContent=visibleRows.length>250?"প্রিভিউতে প্রথম ২৫০টি রেকর্ড দেখানো হচ্ছে; CSV/Excel-এ সব রেকর্ড থাকবে।":visibleRows.length+"টি রেকর্ড দেখানো হচ্ছে।";
  }
  function renderWorkspace(){
   if(!reportGroup||!workspace)return;
   const def=definitions[report.type]||definitions.business,metrics=kpisFor(report.type,report.rows,report.source||{}),analysis=analysisFor(report.type,report.rows,report.source||{});
   $("reportWorkspaceTitle").textContent=def[0];$("reportWorkspaceDescription").textContent=def[2];$("reportWorkspaceCode").textContent=report.type.toUpperCase();$("reportWorkspaceRange").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   $("reportWorkspaceKpis").innerHTML=metrics.map(m=>'<article class="hf-report-kpi"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong><span>'+esc(m.note)+'</span></article>').join("");
   $("reportWorkspaceTabs").innerHTML='<button type="button" role="tab" data-report-segment="overview" aria-selected="true" class="active">সারসংক্ষেপ</button><button type="button" role="tab" data-report-segment="analysis" aria-selected="false">'+esc(def[3])+'</button><button type="button" role="tab" data-report-segment="records" aria-selected="false">'+esc(def[4])+'</button>';
   const metricRows=metrics.map(m=>({বিষয়:m.label,মান:m.value,বিবরণ:m.note}));
   $("reportWorkspaceOverview").innerHTML='<div class="hf-report-overview-grid"><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>মূল সূচক</h3><p>নির্বাচিত সময়ের রেকর্ড ও নির্দিষ্ট ডেটা সোর্স</p></div><span>'+metrics.length+' indicators</span></div>'+tableMarkup(metricRows,Object.keys(metricRows[0]||{বিষয়:"",মান:"",বিবরণ:""}),"সারাংশ নেই")+'</section><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(def[3])+'</h3><p>'+esc(def[2])+'</p></div></div>'+tableMarkup(analysis.rows,analysis.columns,"বিশ্লেষণের ডেটা নেই")+'</section></div><div class="hf-report-source-note">'+esc(report.notes||"রিপোর্টটি সংযুক্ত ডেটা সোর্স থেকে তৈরি।")+'</div>';
   $("reportWorkspaceAnalysis").innerHTML='<section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(def[3])+'</h3><p>বিভাগ/ধরন অনুযায়ী সমষ্টি; মূল রেকর্ডের বিকল্প নয়।</p></div><span>'+analysis.rows.length+' groups</span></div>'+renderBars(analysis.rows,analysis.bars||"records")+tableMarkup(analysis.rows,analysis.columns,"এই রিপোর্টে বিশ্লেষণ ডেটা নেই")+'</section>';
   $("reportWorkspaceRecordsTitle").textContent=def[4];$("reportWorkspaceRecordsNote").textContent="মূল সোর্স রেকর্ড; সার্চ, ফিল্টার এবং CSV/Excel/PDF এক্সপোর্ট ব্যবহার করুন।";
   const preferred=({business:"date",sales:"date","product-sales":"product","top-products":"product","customer-wise-products":"customer","customer-products":"customer","top-customers":"customer",customers:"customer",purchase:"supplier","product-purchase":"product",payable:"supplier",receivable:"courier",collections:"courier","low-stock":"category","alert-products":"alert",stock:"category","stock-list":"category","account-payments":"account_name",expenses:"category",transactions:"entry_type",daily:"date"})[report.type]||"";
   activeFilterColumn=preferred&&report.rows.some(r=>r[preferred]!==undefined)?preferred:"";
   const filter=$("reportWorkspaceFieldFilter"),values=activeFilterColumn?[...new Set(report.rows.map(r=>String(r[activeFilterColumn]??"")).filter(Boolean))].sort():[];
   if(filter){filter.innerHTML='<option value="">সব '+(activeFilterColumn?esc(activeFilterColumn.replace(/_/g," ")):"রেকর্ড")+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");filter.disabled=!values.length;filter.value="";}
   $("reportWorkspaceSearch").value="";renderRecordTable();
   $("reportTitle").textContent=def[0];$("reportRangeLabel").textContent=report.rangeLabel;$("reportSummary").innerHTML=metrics.slice(0,3).map(m=>'<div class="hf-summary-pill"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong></div>').join("");$("reportNote").textContent=report.notes||"";
   const hero=document.querySelector(".hf-reports-hero h1");if(hero)hero.textContent=def[0];const eyebrow=document.querySelector(".hf-reports-hero .page-eyebrow");if(eyebrow)eyebrow.textContent="INDIVIDUAL REPORT";const heroDescription=document.querySelector(".hf-reports-hero p:not(.page-eyebrow)");if(heroDescription)heroDescription.textContent=def[2];
   if($("printReportTitle"))$("printReportTitle").textContent=def[0];if($("printReportDetails"))$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   showSegment(activeSegment);
  }
  function makeKpi(label,value,note){return {label,value,note};}
  function kpisFor(type,rows,source){
   const orders=source.orders||[],valid=orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled"),finance=source.finance||[],settlements=source.settlements||[],purchases=source.purchases||[],sales=valid.reduce((n,o)=>n+num(o.total),0);
   const k=makeKpi;
   if(type==="business")return [k("মোট অর্ডার",orders.length,"নির্বাচিত সময়"),k("বিক্রয় অর্ডার মূল্য",money(sales),"বাতিল বাদে; সংগৃহীত নগদ নয়"),k("গড় অর্ডার মূল্য",money(valid.length?sales/valid.length:0),"নন-ক্যানসেলড অর্ডার"),k("বাতিল অর্ডার",orders.length-valid.length,"আলাদা করে দেখানো")];
   if(type==="sales")return [k("বিক্রয় অর্ডার",valid.length,"বাতিল বাদে"),k("অর্ডার মূল্য",money(sales),"রেকর্ডকৃত অর্ডার মোট"),k("ডেলিভারি চার্জ",money(sum(valid,"delivery_charge")),"অর্ডারে সংরক্ষিত"),k("গড় অর্ডার",money(valid.length?sales/valid.length:0),"প্রতি অর্ডার")];
   if(type==="daily")return [k("কার্যদিবস",rows.length,"রেকর্ড থাকা দিন"),k("মোট অর্ডার",sum(rows,"orders"),"বাতিলসহ"),k("অর্ডার মূল্য",money(sum(rows,"order_value")),"বাতিল বাদে"),k("নিশ্চিত ব্যয়",money(sum(rows,"confirmed_expenses")),"Confirmed expense"),k("COD সংগ্রহ",money(sum(rows,"cod_collected")),"কুরিয়ার সংগ্রহ"),k("রেকর্ডকৃত রেমিট্যান্স",money(sum(rows,"cod_remitted_recorded")),"Settlement snapshot-এ সংরক্ষিত"),k("যাচাইকৃত রেমিট্যান্স",money(sum(rows,"cod_remitted_verified")),"Linked confirmed Finance income only")];
   if(["product-sales","top-products"].includes(type))return [k("পণ্য",unique(rows,"product"),"বিক্রিত পণ্য"),k("বিক্রিত ইউনিট",sum(rows,"quantity_sold"),"অর্ডার আইটেম"),k("পণ্য বিক্রয়",money(sum(rows,"sales")),"লাইন টোটাল"),k("অর্ডার লাইন",sum(rows,"order_lines"),"পণ্য লাইন")];
   if(type==="customer-wise-products")return [k("গ্রাহক",unique(rows,"customer"),"গ্রাহক-পণ্য সমন্বয়"),k("পণ্য ইউনিট",sum(rows,"quantity"),"বিক্রিত পরিমাণ"),k("পণ্য বিক্রয়",money(sum(rows,"total")),"আইটেম লাইন টোটাল"),k("সমন্বয়",rows.length,"আলাদা গ্রাহক-পণ্য")];
   if(["customer-products","top-customers","customers"].includes(type))return [k("গ্রাহক",rows.length,"স্বতন্ত্র গ্রাহক"),k("অর্ডার",sum(rows,"orders"),"রেকর্ডকৃত"),k("মোট ব্যয়",money(sum(rows,"total_spent")),"অর্ডার মূল্য"),k("গড় ব্যয়",money(rows.length?sum(rows,"total_spent")/rows.length:0),"প্রতি গ্রাহক")];
   if(type==="purchase")return [k("ক্রয় অর্ডার",purchases.length,"Purchase Orders"),k("ক্রয়ের মোট",money(sum(purchases,"total_amount")),"অর্ডার মোট"),k("ক্রয় লাইন",purchases.reduce((n,p)=>n+(p.admin_purchase_order_items||[]).length,0),"অর্ডার আইটেম"),k("সম্পন্ন",purchases.filter(p=>["received","completed"].includes(String(p.status||"").toLowerCase())).length,"Status অনুযায়ী")];
   if(type==="product-purchase")return [k("পণ্য লাইন",rows.length,"ক্রয় আইটেম"),k("ক্রয় ইউনিট",sum(rows,"quantity"),"অর্ডারকৃত"),k("গৃহীত ইউনিট",sum(rows,"received_quantity"),"GRN অনুযায়ী"),k("ক্রয় মূল্য",money(sum(rows,"total")),"লাইন কস্ট")];
   if(type==="payable"){const confirmed=rows.filter(r=>String(r.status||"").toLowerCase()==="confirmed");return [k("নিশ্চিত বিল",confirmed.length,"Invoice-date range"),k("নিশ্চিত বিলের মূল্য",money(sum(confirmed,"bill_total")),"Draft/Void বাদ"),k("নিশ্চিত পেমেন্ট",money(sum(confirmed,"paid")),"Confirmed allocations"),k("নিশ্চিত ক্রেডিট",money(sum(confirmed,"confirmed_credit")),"Confirmed credit notes"),k("বর্তমান Supplier Payables",money(sum(source.supplierBalances||[],"outstanding_balance")),"Current supplier ledger balance")];}
   if(type==="receivable"||type==="collections")return [k("COD রেকর্ড",rows.length,type==="receivable"?"Current outstanding snapshot":"Selected-period activity"),k("COD মূল্য",money(sum(rows,"cod_amount")),"Settlement records"),k("সংগ্রহ",money(sum(rows,"collected")),"Current recorded collection"),k("যাচাইকৃত রেমিট্যান্স",money(sum(rows,"verified_remitted")),"Linked confirmed Finance income"),k("সংগ্রহ বাকি",money(sum(rows,"pending_collection")),"COD less collected"),k("নেট রেমিট্যান্স বাকি",money(sum(rows,"pending_remittance")),"After courier fee and adjustment")];
   if(["low-stock","alert-products","stock","stock-list"].includes(type))return [k("পণ্য",rows.length,"বর্তমান স্ন্যাপশট"),k("মোট ইউনিট",sum(rows,"stock"),"বর্তমান স্টক"),k("স্টক মূল্য",money(sum(rows,"stock_value")),"সংরক্ষিত কস্ট থাকলে"),k("শূন্য স্টক",rows.filter(r=>num(r.stock)===0).length,"স্টক নেই"),k("সীমার নিচে",rows.filter(r=>num(r.stock)<=num(r.minimum_stock)).length,"Low threshold")];
   if(type==="account-payments"){const entries=rows.filter(r=>r.record_kind==="Finance entry"&&r.status==="confirmed"),transfers=rows.filter(r=>r.record_kind==="Internal transfer"&&r.status==="confirmed");const cashIn=sum(entries.filter(r=>r.entry_type==="income"),"amount"),cashOut=sum(entries.filter(r=>r.entry_type==="expense"),"amount");return [k("অ্যাকাউন্ট", (source.accountBalances||[]).length,"Configured cash/bank/wallet accounts"),k("বর্তমান Account Balance",money(sum(source.accountBalances||[],"current_balance")),"Opening + confirmed ledger + transfers"),k("সময়ে Cash In",money(cashIn),"Confirmed income only"),k("সময়ে Cash Out",money(cashOut),"Confirmed expense only"),k("নেট Account Movement",money(sum(source.accountBalances||[],"period_net_movement")),"Transfer in/out included"),k("Internal Transfers",transfers.length,"Not income or expense")];}
   if(type==="expenses"){const confirmed=rows.filter(r=>r.status==="confirmed"),operating=confirmed.filter(r=>(r.financial_class||"operating")==="operating"),nonOperating=confirmed.filter(r=>(r.financial_class||"operating")!=="operating");return [k("খরচের রেকর্ড",rows.length,"Draft/Confirmed/Void"),k("Confirmed Operating Expense",money(sum(operating,"amount")),"Operating only"),k("Confirmed Non-operating",money(sum(nonOperating,"amount")),"Capital/Loan/Refund/Adjustment etc."),k("Draft খরচ",rows.filter(r=>r.status==="draft").length,"Needs review"),k("নির্বাচিত বাজেট",money(sum((source.budgets||[]).filter(v=>v.status==="active"),"budget_amount")),"Active budgets")];}
   if(type==="transactions"){const confirmed=rows.filter(r=>r.status==="confirmed"),transfers=confirmed.filter(r=>r.entry_type==="transfer");return [k("মোট রেকর্ড",rows.length,"Ledger + internal transfers"),k("নিশ্চিত Income",money(sum(confirmed.filter(r=>r.entry_type==="income"),"amount")),"Confirmed ledger income"),k("নিশ্চিত Expense",money(sum(confirmed.filter(r=>r.entry_type==="expense"),"amount")),"Confirmed ledger expense"),k("Internal Transfers",transfers.length,"Separate from income/expense"),k("Transfer Amount",money(sum(transfers,"amount")),"Account-to-account movement"),k("Draft / Void",rows.filter(r=>["draft","void"].includes(String(r.status||"").toLowerCase())).length,"Not in confirmed totals")];}
   return [k("রেকর্ড",rows.length,"নির্বাচিত সময়"),k("মোট পরিমাণ",money(sum(rows,"amount")),"রেকর্ডকৃত"),k("Confirmed",rows.filter(r=>String(r.status).toLowerCase()==="confirmed").length,"নিশ্চিত অবস্থা")];
  }
  function analysisFor(type,rows,source){
   if(type==="business"||type==="sales")return {columns:["status","records","order_value"],rows:groupRows((source.orders||[]).map(o=>({status:o.status,order_value:num(o.total)})),"status",["order_value"]),bars:"order_value"};
   if(type==="daily")return {columns:["date","orders","order_value","confirmed_expenses","cod_collected","cod_remitted"],rows:rows.slice().sort((a,b)=>b.date.localeCompare(a.date)),bars:"order_value"};
   if(["product-sales","top-products","product-purchase","low-stock","alert-products","stock","stock-list"].includes(type))return {columns:rows.length?Object.keys(rows[0]).slice(0,8):["product","records"],rows:rows.slice(0,12),bars:type==="product-purchase"?"total":["low-stock","alert-products"].includes(type)?"stock":type==="stock"||type==="stock-list"?"stock_value":"sales"};
   if(type==="customer-wise-products")return {columns:["customer","records","quantity","total"],rows:groupRows(rows,"customer",["quantity","total"]),bars:"total"};
   if(["customer-products","top-customers","customers"].includes(type))return {columns:["customer","orders","unique_products","total_spent","last_order"],rows:rows.slice(0,12),bars:"total_spent"};
   if(type==="purchase")return {columns:["supplier","records","total"],rows:groupRows(rows,"supplier",["total"]),bars:"total"};
   if(type==="payable")return {columns:["supplier","records","bill_total","paid","balance"],rows:groupRows(rows,"supplier",["bill_total","paid","balance"]),bars:"balance"};
   if(type==="receivable"||type==="collections")return {columns:["courier","records","cod_amount","collected","remitted","pending_remittance"],rows:groupRows(rows,"courier",["cod_amount","collected","remitted","pending_remittance"]),bars:"collected"};
   if(type==="account-payments")return {columns:["account_name","records","amount"],rows:groupRows(rows,"account_name",["amount"]),bars:"amount"};
   if(type==="expenses")return {columns:["category","records","amount"],rows:groupRows(rows,"category",["amount"]),bars:"amount"};
   if(type==="transactions")return {columns:["entry_type","records","amount"],rows:groupRows(rows,"entry_type",["amount"]),bars:"amount"};
   return {columns:rows.length?Object.keys(rows[0]).slice(0,8):["category","records"],rows:rows.slice(0,12),bars:"records"};
  }
  function renderBars(rows,key){
   if(!rows.length)return '<div class="hf-report-empty"><strong>বিশ্লেষণের জন্য রেকর্ড নেই</strong><p>সংশ্লিষ্ট সোর্স মডিউলে ডেটা যুক্ত হলে এই অংশ পূরণ হবে।</p></div>';
   const max=Math.max(1,...rows.map(r=>num(r[key])));
   return '<div class="hf-report-bars">'+rows.slice(0,10).map(row=>{const label=String(row[Object.keys(row).find(k=>typeof row[k]==="string")||"date"]??"—"),value=num(row[key]),width=Math.max(value>0?2:0,value/max*100);return '<div class="hf-report-bar-row"><div class="hf-report-bar-label"><strong>'+esc(label)+'</strong><span>'+esc(displayCell(value,key))+'</span></div><div class="hf-report-bar-track"><span style="width:'+width.toFixed(1)+'%"></span></div></div>';}).join("")+'</div>';
  }
  function renderRecordTable(){
   if(!workspace||!report.rows)return;
   const query=String($("reportWorkspaceSearch")?.value||"").toLowerCase().trim(),filter=String($("reportWorkspaceFieldFilter")?.value||"");
   visibleRows=report.rows.filter(row=>(!query||Object.values(row).some(v=>String(v??"").toLowerCase().includes(query)))&&(!filter||String(row[activeFilterColumn]??"")===filter));
   $("reportWorkspaceTableHead").innerHTML="<tr>"+report.columns.map(k=>"<th>"+esc(k.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportWorkspaceTableBody").innerHTML=visibleRows.length?visibleRows.slice(0,250).map(row=>"<tr>"+report.columns.map(k=>"<td>"+esc(displayCell(row[k],k))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'"><div class="hf-report-empty"><strong>কোনো রেকর্ড পাওয়া যায়নি</strong><p>সার্চ বা ফিল্টার পরিবর্তন করুন।</p></div></td></tr>';
   $("reportWorkspaceRecordsFoot").textContent=visibleRows.length>250?"প্রিভিউতে প্রথম ২৫০টি রেকর্ড দেখানো হচ্ছে; CSV/Excel-এ সব রেকর্ড থাকবে।":visibleRows.length+"টি রেকর্ড দেখানো হচ্ছে।";
  }
  function showSegment(segment){
   activeSegment=segment;["overview","analysis","records"].forEach(id=>{const panel=$("reportWorkspace"+id.charAt(0).toUpperCase()+id.slice(1));if(panel)panel.hidden=id!==segment;});
   document.querySelectorAll("[data-report-segment]").forEach(b=>{const active=b.dataset.reportSegment===segment;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
   if(segment==="records")renderRecordTable();
  }
  function renderWorkspace(){
   if(!reportGroup||!workspace)return;
   const def=definitions[report.type]||definitions.business,metrics=kpisFor(report.type,report.rows,report.source||{}),analysis=analysisFor(report.type,report.rows,report.source||{});
   $("reportWorkspaceTitle").textContent=def[0];$("reportWorkspaceDescription").textContent=def[2];$("reportWorkspaceCode").textContent=report.type.toUpperCase();$("reportWorkspaceRange").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   $("reportWorkspaceKpis").innerHTML=metrics.map(m=>'<article class="hf-report-kpi"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong><span>'+esc(m.note)+'</span></article>').join("");
   $("reportWorkspaceTabs").innerHTML='<button type="button" role="tab" data-report-segment="overview" aria-selected="true" class="active">সারসংক্ষেপ</button><button type="button" role="tab" data-report-segment="analysis" aria-selected="false">'+esc(def[3])+'</button><button type="button" role="tab" data-report-segment="records" aria-selected="false">'+esc(def[4])+'</button>';
   const metricRows=metrics.map(m=>({বিষয়:m.label,মান:m.value,বিবরণ:m.note}));
   $("reportWorkspaceOverview").innerHTML='<div class="hf-report-overview-grid"><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>মূল সূচক</h3><p>নির্বাচিত সময়ের রেকর্ড ও নির্দিষ্ট ডেটা সোর্স</p></div><span>'+metrics.length+' indicators</span></div>'+tableMarkup(metricRows,Object.keys(metricRows[0]||{বিষয়:"",মান:"",বিবরণ:""}),"সারাংশ নেই")+'</section><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(def[3])+'</h3><p>'+esc(def[2])+'</p></div></div>'+tableMarkup(analysis.rows,analysis.columns,"বিশ্লেষণের ডেটা নেই")+'</section></div><div class="hf-report-source-note">'+esc(report.notes||"রিপোর্টটি সংযুক্ত ডেটা সোর্স থেকে তৈরি।")+'</div>';
   $("reportWorkspaceAnalysis").innerHTML='<section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(def[3])+'</h3><p>বিভাগ/ধরন অনুযায়ী সমষ্টি; মূল রেকর্ডের বিকল্প নয়।</p></div><span>'+analysis.rows.length+' groups</span></div>'+renderBars(analysis.rows,analysis.bars||"records")+tableMarkup(analysis.rows,analysis.columns,"এই রিপোর্টে বিশ্লেষণ ডেটা নেই")+'</section>';
   $("reportWorkspaceRecordsTitle").textContent=def[4];$("reportWorkspaceRecordsNote").textContent="মূল সোর্স রেকর্ড; সার্চ, ফিল্টার এবং CSV/Excel/PDF এক্সপোর্ট ব্যবহার করুন।";
   const preferred=({business:"date",sales:"date","product-sales":"product","top-products":"product","customer-wise-products":"customer","customer-products":"customer","top-customers":"customer",customers:"customer",purchase:"supplier","product-purchase":"product",payable:"supplier",receivable:"courier",collections:"courier","low-stock":"category","alert-products":"alert",stock:"category","stock-list":"category","account-payments":"account_name",expenses:"category",transactions:"entry_type",daily:"date"})[report.type]||"";
   activeFilterColumn=preferred&&report.rows.some(r=>r[preferred]!==undefined)?preferred:"";
   const filter=$("reportWorkspaceFieldFilter"),values=activeFilterColumn?[...new Set(report.rows.map(r=>String(r[activeFilterColumn]??"")).filter(Boolean))].sort():[];
   if(filter){filter.innerHTML='<option value="">সব '+(activeFilterColumn?esc(activeFilterColumn.replace(/_/g," ")):"রেকর্ড")+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");filter.disabled=!values.length;filter.value="";}
   $("reportWorkspaceSearch").value="";renderRecordTable();
   $("reportTitle").textContent=def[0];$("reportRangeLabel").textContent=report.rangeLabel;$("reportSummary").innerHTML=metrics.slice(0,3).map(m=>'<div class="hf-summary-pill"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong></div>').join("");$("reportNote").textContent=report.notes||"";
   const hero=document.querySelector(".hf-reports-hero h1");if(hero)hero.textContent=def[0];const eyebrow=document.querySelector(".hf-reports-hero .page-eyebrow");if(eyebrow)eyebrow.textContent="INDIVIDUAL REPORT";const heroDescription=document.querySelector(".hf-reports-hero p:not(.page-eyebrow)");if(heroDescription)heroDescription.textContent=def[2];
   if($("printReportTitle"))$("printReportTitle").textContent=def[0];if($("printReportDetails"))$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   showSegment(activeSegment);
  }
  async function paginateQuery(buildQuery,limit=10000){
   const rows=[],pageSize=1000,concurrency=3,maxRows=Math.max(0,Math.min(10000,Number(limit)||0));
   const firstSize=Math.min(pageSize,maxRows);
   if(firstSize<=0)return rows;
   const first=await signedQuery(buildQuery().range(0,firstSize-1));
   rows.push(...first);
   if(first.length<firstSize)return rows;
   for(let base=pageSize;base<maxRows;base+=pageSize*concurrency){
    const offsets=[];
    for(let offset=base;offset<Math.min(maxRows,base+pageSize*concurrency);offset+=pageSize){
     offsets.push({offset,size:Math.min(pageSize,maxRows-offset)});
    }
    const pages=await Promise.all(offsets.map(({offset,size})=>signedQuery(buildQuery().range(offset,offset+size-1))));
    for(let i=0;i<pages.length;i++){
     rows.push(...pages[i]);
     if(pages[i].length<offsets[i].size)return rows;
    }
   }
   return rows;
  }
  async function fetchReportFinance(range,limit=10000){
   return paginateQuery(()=>{
    let q=client.from("admin_finance_entries").select("id,entry_type,category,amount,entry_date,description,reference,status,related_order_id,account_id,payment_method,party_name,financial_class,related_supplier_payment_id,related_cod_settlement_id,created_by,created_at,updated_at").order("entry_date",{ascending:false}).order("created_at",{ascending:false}).order("id",{ascending:true});
    if(range)q=rangeQuery(q,"entry_date",range);
    return q;
   },limit);
  }
  async function fetchReportSettlements(range,limit=10000){
   return paginateQuery(()=>{
    let q=client.from("admin_cod_settlements").select("id,order_id,order_number,customer_name,courier_name,tracking_reference,cod_amount,collected_amount,courier_fee,adjustment_amount,remitted_amount,remitted_account_id,status,collected_at,remitted_at,created_at,updated_at").order("created_at",{ascending:false}).order("id",{ascending:true});
    if(range)q=rangeQuery(q,"created_at",range);
    return q;
   },limit);
  }
  async function fetchReportTransfers(range,limit=10000){
   return paginateQuery(()=>{
    let q=client.from("admin_finance_transfers").select("id,source_account_id,destination_account_id,transfer_date,amount,reference,description,status,created_at,updated_at").order("transfer_date",{ascending:false}).order("id",{ascending:true});
    if(range)q=rangeQuery(q,"transfer_date",range);
    return q;
   },limit);
  }
  function attachReportFilters(){
   if(!reportGroup||!workspace)return;
   $("reportWorkspaceSearch")?.addEventListener("input",renderRecordTable);
   $("reportWorkspaceFieldFilter")?.addEventListener("change",renderRecordTable);
   $("reportWorkspaceTabs")?.addEventListener("click",event=>{const b=event.target.closest("[data-report-segment]");if(b)showSegment(b.dataset.reportSegment);});
  }
  async function loadReport(){
   const range=selectedRange(),type=$("reportType").value;
   if(reportGroup&&!allowed.includes(type))throw new Error("এই ওয়ার্কস্পেসে নির্বাচিত রিপোর্টটি নেই।");
   let rows=[],title="",notes="",source={};
   if(["business","sales","daily","product-sales","top-products","customer-wise-products","customer-products","top-customers","customers"].includes(type)){
    const orders=await fetchOrders(range,5000);source.orders=orders;const valid=orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled");
    if(type==="business"){
     const map=new Map();orders.forEach(o=>{const day=dhakaDateKey(o.ordered_at);if(!day)return;const r=map.get(day)||{date:day,orders:0,order_value:0,delivery_charge:0,cancelled_orders:0};r.orders++;if(String(o.status).toLowerCase()==="cancelled")r.cancelled_orders++;else{r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);}map.set(day,r);});
     rows=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Business Overview Report";notes="অর্ডার মূল্য non-cancelled order total থেকে; এটি সংগৃহীত অর্থের প্রমাণ নয়। বাতিল অর্ডার সংখ্যা আলাদাভাবে দেখানো হয়েছে।";
    }else if(type==="sales"){
     const map=new Map();valid.forEach(o=>{const day=dhakaDateKey(o.ordered_at);if(!day)return;const r=map.get(day)||{date:day,orders:0,order_value:0,delivery_charge:0};r.orders++;r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);map.set(day,r);});
     rows=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Sales Performance Report";notes="Sales use non-cancelled order totals. Payment method/status analysis uses original order records.";
    }else if(type==="daily"){
     const [finance,settlements]=await Promise.all([fetchReportFinance(range),fetchReportSettlements(range)]);source.finance=finance;source.settlements=settlements;
     const map=new Map(),get=day=>{if(!day)return null;let r=map.get(day);if(!r){r={date:day,orders:0,cancelled_orders:0,order_value:0,delivery_charge:0,confirmed_expenses:0,cod_collected:0,cod_remitted:0,courier_fees:0};map.set(day,r);}return r;};
     orders.forEach(o=>{const r=get(dhakaDateKey(o.ordered_at));if(r){r.orders++;if(String(o.status).toLowerCase()==="cancelled")r.cancelled_orders++;else{r.order_value+=num(o.total);r.delivery_charge+=num(o.delivery_charge);}}});
     finance.filter(e=>String(e.entry_type).toLowerCase()==="expense"&&String(e.status).toLowerCase()==="confirmed").forEach(e=>{const r=get(String(e.entry_date||"").slice(0,10));if(r)r.confirmed_expenses+=num(e.amount);});
     settlements.forEach(s=>{if(s.collected_at){const r=get(String(s.collected_at).slice(0,10));if(r){r.cod_collected+=num(s.collected_amount);r.courier_fees+=num(s.courier_fee);}}if(s.remitted_at){const r=get(String(s.remitted_at).slice(0,10));if(r)r.cod_remitted+=num(s.remitted_amount);}});
     rows=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));title="Daily Business Report";notes="অর্ডার মূল্য cancelled বাদে; ব্যয় কেবল Confirmed expense। COD collection ও remittance তাদের নিজস্ব তারিখে।";
    }else if(type==="product-sales"||type==="top-products"){
     const catalog=await fetchProducts(10000);source.products=catalog;
     const byId=new Map(catalog.map(p=>[String(p.id),p])),byName=new Map(catalog.map(p=>[String(p.name||"").toLowerCase(),p]));
     const map=new Map();valid.forEach(o=>(o.order_items||[]).forEach(i=>{const key=String(i.product_id||i.product_name||"Unknown"),product=byId.get(String(i.product_id||""))||byName.get(String(i.product_name||"").toLowerCase());const r=map.get(key)||{product:i.product_name||product?.name||"Unknown",sku:product?.sku||"",category:product?.category||"Uncategorised",quantity_sold:0,sales:0,order_lines:0};r.quantity_sold+=num(i.quantity);r.sales+=num(i.line_total)||num(i.quantity)*num(i.unit_price);r.order_lines++;map.set(key,r);}));
     rows=[...map.values()].sort((a,b)=>type==="top-products"?b.quantity_sold-a.quantity_sold:b.sales-a.sales).map((r,i)=>({rank:i+1,...r}));title=type==="top-products"?"Top Selling Products":"Product Sales Report";notes=type==="top-products"?"Sorted by units sold, not sales amount; category and SKU are joined to the current product catalogue where a matching product still exists.":"From order_items snapshots; product category/SKU are matched to current catalogue where available; cancelled orders excluded.";
    }else if(type==="customer-wise-products"){
     const map=new Map();valid.forEach(o=>(o.order_items||[]).forEach(i=>{const key=String(o.customer_id||o.customer_name||"Unknown")+"|"+String(i.product_id||i.product_name||"");const r=map.get(key)||{customer:o.customer_name||"Unknown",product:i.product_name||"Unknown",quantity:0,total:0,order_lines:0};r.quantity+=num(i.quantity);r.total+=num(i.line_total)||num(i.quantity)*num(i.unit_price);r.order_lines++;map.set(key,r);}));
     rows=[...map.values()].sort((a,b)=>b.total-a.total);title="Customer-wise Product Sales Report";notes="Each row is one customer/product pair.";
    }else if(type==="customer-products"){
     const map=new Map();valid.forEach(o=>{const key=String(o.customer_id||o.customer_name||"Unknown");const r=map.get(key)||{customer:o.customer_name||"Unknown",orders:0,unique_products:0,units:0,total_spent:0,last_order:"",_products:new Map()};r.orders++;r.total_spent+=num(o.total);const date=String(o.ordered_at||"");if(date>r.last_order)r.last_order=date;(o.order_items||[]).forEach(i=>{const name=i.product_name||"Unknown";r.units+=num(i.quantity);r._products.set(name,(r._products.get(name)||0)+num(i.quantity));});map.set(key,r);});
     rows=[...map.values()].map(r=>{r.unique_products=r._products.size;r.top_product=[...r._products.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";delete r._products;return r;}).sort((a,b)=>b.unique_products-a.unique_products||b.total_spent-a.total_spent);title="Customer Product Report";notes="One row per customer with unique products, units, top product and last order.";
    }else{
     const map=new Map();valid.forEach(o=>{const key=String(o.customer_id||o.customer_name||"Unknown");const r=map.get(key)||{customer:o.customer_name||"Unknown",orders:0,total_spent:0,average_order:0,last_order:"",pending_orders:0,delivered_orders:0};r.orders++;r.total_spent+=num(o.total);const date=String(o.ordered_at||"");if(date>r.last_order)r.last_order=date;if(String(o.status).toLowerCase()==="delivered")r.delivered_orders++;if(["pending","processing","shipped"].includes(String(o.status).toLowerCase()))r.pending_orders++;map.set(key,r);});
     rows=[...map.values()].map(r=>({...r,average_order:r.orders?r.total_spent/r.orders:0})).sort((a,b)=>type==="top-customers"?b.total_spent-a.total_spent:b.orders-a.orders).map((r,i)=>({rank:i+1,...r}));title=type==="top-customers"?"Top Customers Report":"Customer Report";notes="Grouped by customer ID where available; personal phone/email is not included.";
    }
   }else if(type==="purchase"||type==="product-purchase"){
    const purchases=await signedQuery(rangeQuery(client.from("admin_purchase_orders").select("id,purchase_number,status,order_date,expected_date,total_amount,supplier_id,admin_suppliers(name),admin_purchase_order_items(id,product_id,product_name,quantity,received_quantity,unit_cost,line_total,unit)").order("order_date",{ascending:false}).limit(5000),"order_date",range));source.purchases=purchases;
    if(type==="purchase")rows=purchases.map(p=>({purchase_number:p.purchase_number,status:p.status,purchase_date:p.order_date,expected_date:p.expected_date,supplier:p.admin_suppliers?.name||"—",items:(p.admin_purchase_order_items||[]).length,total_amount:num(p.total_amount),ordered_units:(p.admin_purchase_order_items||[]).reduce((n,i)=>n+num(i.quantity),0),received_units:(p.admin_purchase_order_items||[]).reduce((n,i)=>n+num(i.received_quantity),0)}));
    else rows=purchases.flatMap(p=>(p.admin_purchase_order_items||[]).map(i=>({purchase_number:p.purchase_number,purchase_date:p.order_date,status:p.status,supplier:p.admin_suppliers?.name||"—",product:i.product_name,quantity:num(i.quantity),received_quantity:num(i.received_quantity),pending_quantity:Math.max(0,num(i.quantity)-num(i.received_quantity)),unit:i.unit,unit_cost:num(i.unit_cost),total:num(i.line_total)})));
    title=type==="purchase"?"Purchase Report":"Product Purchase Report";notes="Source: recorded Purchase Orders and saved purchase-order item snapshots. Purchase orders do not by themselves prove payment.";
   }else if(type==="payable"){
    const [bills,allocations,payments,credits,supplierBalances]=await Promise.all([
     signedQuery(rangeQuery(client.from("admin_supplier_bills").select("id,supplier_id,bill_number,supplier_invoice_number,invoice_date,due_date,total_amount,status,admin_suppliers(name)").order("invoice_date",{ascending:false}).order("id",{ascending:true}).limit(5000),"invoice_date",range)),
     signedQuery(client.from("admin_supplier_payment_allocations").select("payment_id,supplier_bill_id,allocated_amount").limit(20000)),
     signedQuery(client.from("admin_supplier_payments").select("id,supplier_id,status,payment_date,amount").limit(10000)),
     signedQuery(client.from("admin_supplier_credit_notes").select("id,supplier_id,supplier_bill_id,credit_date,amount,status").limit(10000)),
     signedQuery(client.from("admin_supplier_balances").select("supplier_id,supplier_name,outstanding_balance,total_bills,total_paid,total_credits,opening_balance,last_purchase_date,last_payment_date").order("supplier_name",{ascending:true}).limit(2000))
    ]);
    const confirmedPaymentIds=new Set(payments.filter(p=>String(p.status||"").toLowerCase()==="confirmed").map(p=>p.id));
    const paidByBill=new Map();allocations.forEach(a=>{if(confirmedPaymentIds.has(a.payment_id))paidByBill.set(a.supplier_bill_id,(paidByBill.get(a.supplier_bill_id)||0)+num(a.allocated_amount));});
    const creditByBill=new Map();credits.forEach(c=>{if(String(c.status||"").toLowerCase()==="confirmed"&&c.supplier_bill_id)creditByBill.set(c.supplier_bill_id,(creditByBill.get(c.supplier_bill_id)||0)+num(c.amount));});
    const supplierBalanceById=new Map(supplierBalances.map(v=>[v.supplier_id,v]));
    rows=bills.map(bill=>{
     const st=String(bill.status||"").toLowerCase(),total=num(bill.total_amount),paid=paidByBill.get(bill.id)||0,credit=creditByBill.get(bill.id)||0;
     const balance=st==="confirmed"?Math.max(0,total-paid-credit):0,supplier=supplierBalanceById.get(bill.supplier_id);
     const due=st==="void"?"Void":st==="draft"?"Draft":bill.due_date&&bill.due_date<todayISO()&&balance>0?"Overdue":balance<=0&&paid+credit>0?"Paid / Credited":paid+credit>0?"Partially paid":"Open";
     return {bill_number:bill.bill_number,supplier:bill.admin_suppliers?.name||supplier?.supplier_name||"—",supplier_invoice_number:bill.supplier_invoice_number,invoice_date:bill.invoice_date,due_date:bill.due_date,status:bill.status,bill_total:total,paid,confirmed_credit:credit,balance,due_state:due,supplier_current_balance:num(supplier?.outstanding_balance)};
    });
    source.bills=bills;source.payments=payments;source.allocations=allocations;source.credits=credits;source.supplierBalances=supplierBalances;
    title="Supplier Payables Report";
    notes="Bills are selected by invoice date. Bill-level payments include allocations from confirmed supplier payments only; confirmed credit notes are deducted. Supplier balances show the latest ledger position, not a historical as-of balance.";
   }else if(type==="receivable"||type==="collections"){
    const [settlements,codFinance]=await Promise.all([fetchReportSettlements(null),fetchReportFinance(type==="collections"?range:null)]);
    source.settlements=settlements;
    source.codFinance=codFinance.filter(e=>e.entry_type==="income"&&e.status==="confirmed"&&e.related_cod_settlement_id);
    const verifiedBySettlement=new Map();
    source.codFinance.forEach(e=>verifiedBySettlement.set(e.related_cod_settlement_id,(verifiedBySettlement.get(e.related_cod_settlement_id)||0)+num(e.amount)));
    const inRange=value=>{
     const day=String(value||"").slice(0,10);if(!day)return false;
     const from=range.fromDay??(range.from?String(range.from).slice(0,10):"0000-01-01");
     const to=range.toDay??(range.to?String(range.to).slice(0,10):todayISO());
     return day>=from&&day<=to;
    };
    rows=settlements.filter(settlement=>String(settlement.status||"").toLowerCase()!=="cancelled").map(settlement=>{
     const cod=num(settlement.cod_amount),collected=num(settlement.collected_amount),fee=num(settlement.courier_fee),adjustment=num(settlement.adjustment_amount);
     const expected=Math.max(0,collected-fee+adjustment),verified=verifiedBySettlement.get(settlement.id)||0;
     return {settlement_id:settlement.id,order_number:settlement.order_number,customer:settlement.customer_name,courier:settlement.courier_name,tracking_reference:settlement.tracking_reference,cod_amount:cod,collected,courier_fee:fee,adjustment_amount:adjustment,expected_net_remittance:expected,recorded_remitted:num(settlement.remitted_amount),verified_remitted:verified,pending_collection:Math.max(0,cod-collected),pending_remittance:Math.max(0,expected-verified),remittance_variance:verified-expected,status:settlement.status,collected_at:settlement.collected_at,remitted_at:settlement.remitted_at,created_at:settlement.created_at,remitted_account_id:settlement.remitted_account_id};
    });
    if(type==="receivable")rows=rows.filter(r=>r.pending_collection>0||r.pending_remittance>0||["pending","exception"].includes(String(r.status).toLowerCase()));
    else rows=rows.filter(r=>inRange(r.collected_at)||inRange(r.remitted_at)||inRange(r.created_at));
    title=type==="receivable"?"Courier / COD Receivable Report":"COD Collections Report";
    notes=type==="receivable"?"Current exposure snapshot. Uncollected COD and net courier remittance not yet verified in Finance are shown separately. This is not customer credit debt.":"Selected by collection/remittance/creation date; linked confirmed Finance income is the verified remittance source. Settlement records store current state rather than a full event history.";
   }else if(["low-stock","alert-products","stock","stock-list"].includes(type)){
    const products=await fetchProducts(10000);source.products=products;
    const active=products.filter(p=>p.is_active!==false).map(p=>({product:p.name,sku:p.sku,category:p.category||"Uncategorised",price:num(p.price),stock:num(p.stock_quantity),minimum_stock:num(p.low_stock_threshold??5),unit_cost:p.cost_price===null?null:num(p.cost_price),stock_value:p.cost_price===null?null:num(p.stock_quantity)*num(p.cost_price),alert:num(p.stock_quantity)<=0?"OUT OF STOCK":num(p.stock_quantity)<=num(p.low_stock_threshold??5)?"LOW":"OK",updated_at:p.updated_at||p.created_at}));
    rows=type==="low-stock"?active.filter(p=>p.stock>0&&p.stock<=p.minimum_stock):type==="alert-products"?active.filter(p=>p.stock<=p.minimum_stock):active;
    title=({"low-stock":"Low Stock Products","alert-products":"Alert Product List",stock:"Stock Valuation Report","stock-list":"Current Stock List"})[type];notes="Current catalogue snapshot only; historical stock movement is not tracked here. Missing cost values are left blank, not estimated.";
   }else if(["account-payments","expenses","transactions"].includes(type)){
    const finance=await fetchReportFinance(range);source.finance=finance;
    if(type==="account-payments"){
     const [allFinance,accounts,periodTransfers,allTransfers]=await Promise.all([
      fetchReportFinance(null),
      signedQuery(client.from("admin_finance_accounts").select("id,name,account_type,provider,account_reference,opening_balance,opening_date,is_active").order("name",{ascending:true}).limit(1000)),
      fetchReportTransfers(range),
      fetchReportTransfers(null)
     ]);
     const accountMap=new Map(accounts.map(account=>[account.id,account]));
     source.accountBalances=accounts.map(account=>{
      const start=String(account.opening_date||"0000-01-01").slice(0,10);
      const entries=allFinance.filter(entry=>entry.account_id===account.id&&entry.status==="confirmed"&&String(entry.entry_date||"")>=start);
      const cashMovement=entries.reduce((sum,entry)=>sum+(entry.entry_type==="income"?1:-1)*num(entry.amount),0);
      const transferIn=allTransfers.filter(t=>t.destination_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date||"")>=start).reduce((sum,t)=>sum+num(t.amount),0);
      const transferOut=allTransfers.filter(t=>t.source_account_id===account.id&&t.status==="confirmed"&&String(t.transfer_date||"")>=start).reduce((sum,t)=>sum+num(t.amount),0);
      const periodEntries=finance.filter(entry=>entry.account_id===account.id&&entry.status==="confirmed");
      const periodIn=periodEntries.filter(entry=>entry.entry_type==="income").reduce((sum,entry)=>sum+num(entry.amount),0);
      const periodOut=periodEntries.filter(entry=>entry.entry_type==="expense").reduce((sum,entry)=>sum+num(entry.amount),0);
      const periodTransferIn=periodTransfers.filter(t=>t.destination_account_id===account.id&&t.status==="confirmed").reduce((sum,t)=>sum+num(t.amount),0);
      const periodTransferOut=periodTransfers.filter(t=>t.source_account_id===account.id&&t.status==="confirmed").reduce((sum,t)=>sum+num(t.amount),0);
      return {account_id:account.id,account_name:account.name,account_type:account.account_type,provider:account.provider,account_reference:account.account_reference,is_active:account.is_active,opening_balance:num(account.opening_balance),opening_date:start,current_balance:num(account.opening_balance)+cashMovement+transferIn-transferOut,period_income:periodIn,period_expense:periodOut,period_transfer_in:periodTransferIn,period_transfer_out:periodTransferOut,period_net_movement:periodIn-periodOut+periodTransferIn-periodTransferOut};
     });
     source.transfers=periodTransfers.map(t=>({...t,source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—"}));
     const entryRows=finance.map(entry=>({record_kind:"Finance entry",record_id:entry.id,entry_date:entry.entry_date,entry_type:entry.entry_type,party_name:entry.party_name,account_name:accountMap.get(entry.account_id)?.name||"Unassigned",account_type:accountMap.get(entry.account_id)?.account_type||"",source_account:"",destination_account:"",payment_method:entry.payment_method,category:entry.category,financial_class:entry.financial_class,amount:num(entry.amount),status:entry.status,reference:entry.reference,related_order_id:entry.related_order_id||"",description:entry.description}));
     const transferRows=periodTransfers.map(t=>({record_kind:"Internal transfer",record_id:t.id,entry_date:t.transfer_date,entry_type:"transfer",party_name:"",account_name:"",account_type:"",source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—",payment_method:"Internal transfer",category:"Internal transfer",financial_class:"internal_transfer",amount:num(t.amount),status:t.status,reference:t.reference||"",related_order_id:"",description:t.description||""}));
     rows=[...entryRows,...transferRows].sort((a,b)=>String(b.entry_date||"").localeCompare(String(a.entry_date||"")));
     source.allFinanceCount=allFinance.length;source.allTransfersCount=allTransfers.length;
     notes="Current balance = opening balance + confirmed account-linked income − confirmed expenses + confirmed transfers in − transfers out. Period movement uses selected-period records. Internal transfers are not income or expense.";
    }else if(type==="expenses"){
     rows=finance.filter(entry=>String(entry.entry_type||"").toLowerCase()==="expense").map(entry=>({entry_date:entry.entry_date,category:entry.category,party_name:entry.party_name,amount:num(entry.amount),status:entry.status,financial_class:entry.financial_class,payment_method:entry.payment_method,reference:entry.reference,description:entry.description}));
     const budgets=await signedQuery(client.from("admin_finance_budgets").select("category,period_start,budget_amount,status,notes").order("period_start",{ascending:false}).order("category",{ascending:true}).limit(3000));
     source.budgets=budgets.filter(b=>(!range?.fromDay||String(b.period_start).slice(0,7)>=String(range.fromDay||range.from).slice(0,7))&&(!range?.toDay||String(b.period_start).slice(0,7)<=String(range.toDay||range.to).slice(0,7)));
     notes="Expense rows include all saved statuses. Confirmed operating expense is separated from draft, void and non-operating entries. Budgets are planning limits, not paid cash.";
    }else{
     const [transfers,accounts]=await Promise.all([fetchReportTransfers(range),signedQuery(client.from("admin_finance_accounts").select("id,name,account_type").order("name",{ascending:true}).limit(1000))]);
     const accountMap=new Map(accounts.map(account=>[account.id,account]));source.transfers=transfers;source.accounts=accounts;
     const entryRows=finance.map(entry=>({record_kind:"Finance entry",record_id:entry.id,entry_date:entry.entry_date,entry_type:entry.entry_type,category:entry.category,party_name:entry.party_name,amount:num(entry.amount),financial_class:entry.financial_class,status:entry.status,payment_method:entry.payment_method,account_name:accountMap.get(entry.account_id)?.name||"Unassigned",source_account:"",destination_account:"",reference:entry.reference,related_order_id:entry.related_order_id,related_supplier_payment_id:entry.related_supplier_payment_id,related_cod_settlement_id:entry.related_cod_settlement_id,description:entry.description}));
     const transferRows=transfers.map(t=>({record_kind:"Internal transfer",record_id:t.id,entry_date:t.transfer_date,entry_type:"transfer",category:"Internal transfer",party_name:"",amount:num(t.amount),financial_class:"internal_transfer",status:t.status,payment_method:"Internal transfer",account_name:"",source_account:accountMap.get(t.source_account_id)?.name||"—",destination_account:accountMap.get(t.destination_account_id)?.name||"—",reference:t.reference||"",related_order_id:"",related_supplier_payment_id:"",related_cod_settlement_id:"",description:t.description||""}));
     rows=[...entryRows,...transferRows].sort((a,b)=>String(b.entry_date||"").localeCompare(String(a.entry_date||"")));
     notes="Finance ledger entries and internal account transfers are shown as distinct record types. Transfers do not count as income or expense. Capital, loan, refund and adjustment classes are not ordinary operating income/expense.";
    }
    title=type==="account-payments"?"Account Payments & Balances":type==="expenses"?"Expense & Budget Report":"Financial Transactions Ledger";
   }else if(type==="finance"){
    const finance=await fetchReportFinance(range);source.finance=finance;rows=finance.map(e=>({entry_date:e.entry_date,entry_type:e.entry_type,category:e.category,amount:num(e.amount),status:e.status,financial_class:e.financial_class,reference:e.reference,description:e.description}));title="Finance Entries Report";notes="Source: Finance ledger.";
   }else{
    const orders=await fetchOrders(range,5000);source.orders=orders;rows=orders.map(o=>({order_number:o.order_number,ordered_at:o.ordered_at,status:o.status,subtotal:num(o.subtotal),delivery_charge:num(o.delivery_charge),total:num(o.total),payment_method:o.payment_method}));title="Orders Report";notes="Recorded orders; values are not proof of payment collection.";
   }
   const fallback=({
    business:["date","orders","order_value","delivery_charge","cancelled_orders"],sales:["date","orders","order_value","delivery_charge"],daily:["date","orders","cancelled_orders","order_value","delivery_charge","confirmed_expenses","cod_collected","cod_remitted_recorded","cod_remitted_verified"],
    "product-sales":["rank","product","quantity_sold","sales","order_lines"],"top-products":["rank","product","quantity_sold","sales","order_lines"],"customer-wise-products":["customer","product","quantity","total","order_lines"],"customer-products":["customer","orders","unique_products","units","total_spent","last_order","top_product"],"top-customers":["rank","customer","orders","total_spent","average_order","last_order"],customers:["rank","customer","orders","total_spent","average_order","last_order"],
    purchase:["purchase_number","status","purchase_date","expected_date","supplier","items","ordered_units","received_units","total_amount"],"product-purchase":["purchase_number","purchase_date","supplier","product","quantity","received_quantity","pending_quantity","unit_cost","total"],
    payable:["bill_number","supplier","invoice_date","due_date","status","bill_total","paid","balance","due_state"],receivable:["order_number","customer","courier","cod_amount","collected","pending_collection","remitted","pending_remittance","status"],collections:["order_number","courier","tracking_reference","cod_amount","collected","courier_fee","remitted","status","collected_at","remitted_at"],
    "low-stock":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],"alert-products":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],stock:["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],"stock-list":["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],
    "account-payments":["entry_date","entry_type","party_name","account_name","account_type","payment_method","category","financial_class","amount","status","reference"],expenses:["entry_date","category","party_name","amount","status","financial_class","payment_method","reference","description"],transactions:["entry_date","entry_type","category","party_name","amount","financial_class","status","payment_method","reference","related_order_id","description"]
   })[type]||["entry_date","entry_type","category","amount","status"];
   const capNotices=[];
   if(source.orders?.length>=5000)capNotices.push("The report reached the 5,000-order retrieval cap.");
   if(source.events?.length>=15000)capNotices.push("The report reached the 15,000-event retrieval cap.");
   if(source.products?.length>=10000)capNotices.push("The report reached the 10,000-product retrieval cap.");
   if(source.finance?.length>=3000)capNotices.push("The report reached the 3,000-entry finance retrieval cap.");
   if(capNotices.length)notes=(notes?notes+" ":"")+capNotices.join(" ");
   const rangeLabel=["low-stock","alert-products","stock","stock-list","products","content"].includes(type)?"Current snapshot":range.label;
   report={title,columns:rows.length?Object.keys(rows[0]):fallback[ type ]||["record"],rows,notes,rangeLabel,type,source};
   $("reportTitle").textContent=title;$("reportRangeLabel").textContent=rangeLabel;$("reportRowsCount").textContent=rows.length.toLocaleString("en-BD")+" records";$("reportNote").textContent=notes;
   $("reportSummary").innerHTML='<div class="hf-summary-pill"><small>Records</small><strong>'+rows.length.toLocaleString("en-BD")+'</strong></div><div class="hf-summary-pill"><small>Report</small><strong style="font-size:14px">'+esc(title)+'</strong></div><div class="hf-summary-pill"><small>Period</small><strong style="font-size:13px">'+esc(rangeLabel)+'</strong></div>';
   const sample=rows.slice(0,200);$("reportTableHead").innerHTML="<tr>"+report.columns.map(c=>"<th>"+esc(c.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportTableBody").innerHTML=sample.length?sample.map(row=>"<tr>"+report.columns.map(c=>"<td>"+esc(displayCell(row[c],c))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'">'+makeEmpty("No report records","Try another period or add records in the source workspace.")+'</td></tr>';
   $("reportSampleNote").textContent=rows.length>sample.length?"Preview shows the first "+sample.length+" rows; exports include all rows.":"Preview contains all rows.";
   $("reportCreatedAt").textContent="Generated "+dateTime(new Date().toISOString());
   if(reportGroup)renderWorkspace();return report;
  }
  function analysisFor(type,rows,source){
   const block=(title,description,columns,data,bars)=>({title,description,columns,rows:data,bars:bars||"records"});
   const grouped=(title,description,data,key,metrics)=>block(title,description,[key,"records",...(metrics||[])],groupRows(data,key,metrics||[]),metrics?.[0]||"records");
   const orders=source.orders||[];
   if(type==="payable"){
    const suppliers=source.supplierBalances||[];
    return {blocks:[
     block("সরবরাহকারীভিত্তিক বর্তমান দায়","Supplier ledger-এর current outstanding balance; opening balance, confirmed bills, payments, credits ও adjustments অন্তর্ভুক্ত।",["supplier_name","total_bills","total_paid","total_credits","opening_balance","outstanding_balance"],suppliers,"outstanding_balance"),
     grouped("বিলভিত্তিক অবস্থা","নির্বাচিত invoice date range-এর bill; paid amount শুধু confirmed allocation থেকে।",rows,"due_state",["bill_total","paid","confirmed_credit","balance"]),
     grouped("সরবরাহকারীভিত্তিক নির্বাচিত বিল","Invoice date অনুযায়ী selected bill total ও due amount.",rows,"supplier",["bill_total","paid","balance"])
    ]};
   }
   if(type==="receivable"||type==="collections")return {blocks:[
    grouped("কুরিয়ারভিত্তিক COD অবস্থান","Collected amount থেকে courier fee ও adjustment বাদ দিয়ে net remittance obligation; linked confirmed Finance income counts as verified remittance.",rows,"courier",["cod_amount","collected","expected_net_remittance","verified_remitted","pending_collection","pending_remittance"]),
    grouped("সেটেলমেন্ট স্ট্যাটাস ও ঝুঁকি","Pending, exception ও reconciled status আলাদা; recorded remittance is not automatically verified cash.",rows,"status",["cod_amount","collected","recorded_remitted","verified_remitted","pending_remittance"]),
    block("Remittance Variance","Verified remittance compared with expected net remittance after courier fee and adjustment.",["order_number","courier","collected","courier_fee","adjustment_amount","expected_net_remittance","verified_remitted","remittance_variance"],rows.filter(r=>r.verified_remitted>0||r.status==="reconciled"),"remittance_variance")
   ]};
   if(type==="account-payments"){
    const accounts=source.accountBalances||[],transfers=source.transfers||[];
    return {blocks:[
     block("বর্তমান Account Balance","Opening balance ও confirmed ledger/transfer movement থেকে প্রতিটি account-এর বর্তমান অবস্থান।",["account_name","account_type","opening_balance","current_balance","is_active"],accounts,"current_balance"),
     block("নির্বাচিত সময়ে Account Movement","Confirmed income/expense এবং transfer in/out আলাদা দেখানো হয়েছে।",["account_name","period_income","period_expense","period_transfer_in","period_transfer_out","period_net_movement"],accounts,"period_net_movement"),
     grouped("পেমেন্ট পদ্ধতি অনুযায়ী রেকর্ড","Cash, Bank, bKash, Nagad, Rocket ও অন্যান্য সংরক্ষিত payment method.",rows.filter(r=>r.record_kind==="Finance entry"),"payment_method",["amount"]),
     block("অভ্যন্তরীণ Account Transfer","এক account থেকে অন্য account-এ স্থানান্তর; income বা expense নয়।",["transfer_date","source_account","destination_account","amount","reference","status"],transfers.map(t=>({transfer_date:t.transfer_date,source_account:t.source_account,destination_account:t.destination_account,amount:num(t.amount),reference:t.reference,status:t.status})),"amount")
    ]};
   }
   if(type==="expenses"){
    const confirmed=rows.filter(r=>r.status==="confirmed"),operating=confirmed.filter(r=>(r.financial_class||"operating")==="operating");
    const actualByMonthCategory=new Map();
    (source.budgetFinance||operating).forEach(r=>{const key=String(r.entry_date||"").slice(0,7)+"|"+String(r.category||"Uncategorised");actualByMonthCategory.set(key,(actualByMonthCategory.get(key)||0)+num(r.amount));});
    const budgets=(source.budgets||[]).map(b=>{const key=String(b.period_start||"").slice(0,7)+"|"+String(b.category||"");const actual=actualByMonthCategory.get(key)||0;return {month:String(b.period_start||"").slice(0,7),category:b.category,budget_amount:num(b.budget_amount),confirmed_expense:actual,remaining_budget:num(b.budget_amount)-actual,status:b.status,variance:actual-num(b.budget_amount)};});
    return {blocks:[
     grouped("ক্যাটাগরি অনুযায়ী নিশ্চিত Operating Expense","Budget utilization uses confirmed operating expense only.",operating,"category",["amount"]),
     block("মাসিক বাজেট বনাম নিশ্চিত খরচ","একই calendar month ও category-এর budget-এর সঙ্গে সেই পূর্ণ মাসের confirmed operating expense তুলনা।",["month","category","budget_amount","confirmed_expense","remaining_budget","variance","status"],budgets,"confirmed_expense"),
     grouped("Financial Class অনুযায়ী খরচ","Operating, Capital, Loan, Refund ও Adjustment আলাদা শ্রেণিতে।",confirmed,"financial_class",["amount"]),
     grouped("খরচের স্ট্যাটাস","Draft, Confirmed ও Void expense আলাদা করে।",rows,"status",["amount"])
    ]};
   }
   if(type==="transactions")return {blocks:[
    grouped("লেনদেনের ধরন","Income, Expense ও Internal transfer আলাদা record type.",rows,"entry_type",["amount"]),
    grouped("আর্থিক শ্রেণি","Operating, Capital, Loan, Refund, Adjustment ও Internal transfer আলাদা।",rows,"financial_class",["amount"]),
    grouped("লেনদেনের অবস্থা","Draft, Confirmed, Void বা সংরক্ষিত status।",rows,"status",["amount"]),
    grouped("ক্যাটাগরি অনুযায়ী লেনদেন","Finance ledger category ও transfer category অনুযায়ী amount.",rows,"category",["amount"])
   ]};
   if(type==="business"||type==="sales"){
    const statusRows=groupRows(orders.map(o=>({status:o.status||"unknown",order_value:num(o.total)})),"status",["order_value"]);
    const paymentRows=groupRows(orders.filter(o=>String(o.status||"").toLowerCase()!=="cancelled").map(o=>({payment_method:o.payment_method||"not recorded",order_value:num(o.total)})),"payment_method",["order_value"]);
    return {blocks:[
     block("অর্ডার স্ট্যাটাস অনুযায়ী","প্রতিটি status-এ order count ও recorded order value.",["status","records","order_value"],statusRows,"order_value"),
     block("পেমেন্ট পদ্ধতি অনুযায়ী","Order snapshot-এ সংরক্ষিত payment method; এটি payment confirmation নয়.",["payment_method","records","order_value"],paymentRows,"order_value"),
     block("দিনভিত্তিক বিক্রয়","Selected date range-এর non-cancelled order value.",["date","orders","order_value","delivery_charge"],rows.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))),"order_value")
    ]};
   }
   if(type==="daily")return {blocks:[
    block("দিনভিত্তিক ব্যবসায়িক সারাংশ","অর্ডার, বাতিল, অর্ডার মূল্য, নিশ্চিত ব্যয়, COD সংগ্রহ, রেকর্ডকৃত ও যাচাইকৃত রেমিট্যান্স।",["date","orders","cancelled_orders","order_value","delivery_charge","confirmed_expenses","cod_collected","cod_remitted_recorded","cod_remitted_verified"],rows.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))),"order_value")
   ]};
   if(["product-sales","top-products"].includes(type))return {blocks:[
    block("পণ্যভিত্তিক বিক্রয়","Units sold এবং order line value; cancelled order বাদ.",["rank","product","sku","category","quantity_sold","sales","order_lines","current_stock","minimum_stock","catalogue_status"],rows.slice(0,12),"sales"),
    grouped("ক্যাটাগরি অনুযায়ী বিক্রয়","Current catalogue category match যেখানে পাওয়া গেছে.",rows,"category",["quantity_sold","sales"])
   ]};
   if(type==="customer-wise-products")return {blocks:[
    block("গ্রাহক-পণ্য অনুযায়ী ক্রয়","প্রতি row একটি customer/product pair.",["customer","product","quantity","total","order_lines"],rows.slice(0,50),"total"),
    grouped("গ্রাহকভিত্তিক মোট ক্রয়","প্রতিটি customer-এর units এবং item value.",rows,"customer",["quantity","total"])
   ]};
   if(["customer-products","top-customers","customers"].includes(type))return {blocks:[
    block("গ্রাহকভিত্তিক সারাংশ","Order count, total spend, product variety ও last order.",["rank","customer","orders","unique_products","units","total_spent","average_order","last_order","top_product"],rows.slice(0,20),"total_spent"),
    grouped("অর্ডার কার্যক্রমের ধরন","Customer order count অনুযায়ী তুলনা.",rows,"orders",["total_spent"])
   ]};
   if(type==="purchase")return {blocks:[
    grouped("সরবরাহকারীভিত্তিক ক্রয়","Selected purchase orders-এর recorded total.",rows,"supplier",["total_amount"]),
    grouped("Purchase Order Status","Draft, confirmed, received/completed ও void status পৃথক.",rows,"status",["total_amount"]),
    block("ক্রয় অর্ডারের গ্রহণ অবস্থা","Ordered vs received units.",["purchase_number","supplier","ordered_units","received_units","total_amount","status"],rows.slice(0,40),"received_units")
   ]};
   if(type==="product-purchase")return {blocks:[
    grouped("পণ্যভিত্তিক ক্রয়","Ordered quantity, received quantity, pending quantity এবং cost.",rows,"product",["quantity","received_quantity","pending_quantity","total"]),
    grouped("সরবরাহকারীভিত্তিক ক্রয়","Supplier-wise purchase line count and value.",rows,"supplier",["quantity","total"])
   ]};
   if(["low-stock","alert-products","stock","stock-list"].includes(type))return {blocks:[
    grouped("ক্যাটাগরি অনুযায়ী স্টক","Current available units এবং saved cost valuation.",rows,"category",["stock","stock_value"]),
    grouped("স্টক সতর্কতার ধরন","Out of stock, low stock ও normal threshold.",rows,"alert",["stock","stock_value"]),
    block("পণ্যভিত্তিক স্টক অবস্থান","Current catalogue snapshot; missing cost values are not estimated.",["product","sku","category","stock","minimum_stock","unit_cost","stock_value","alert"],rows.slice(0,50),"stock_value")
   ]};
   return {blocks:[block("রিপোর্ট বিশ্লেষণ","নির্বাচিত রেকর্ডের সারাংশ।",rows.length?Object.keys(rows[0]).slice(0,8):["record"],rows.slice(0,20),"records")]};
  }
  function insightsFor(type,rows,source){
   const items=[],add=(level,title,detail,action)=>items.push({level,title,detail,action:action||""});
   const orders=source.orders||[],status=o=>String(o.status||"").toLowerCase(),total=(list,key)=>list.reduce((n,r)=>n+num(r[key]),0);
   if(type==="account-payments"){
    const accounts=source.accountBalances||[];
    if(!accounts.length)add("info","অ্যাকাউন্ট সেটআপ নেই","Cash, Bank বা Mobile Wallet account না থাকায় account balance নির্ভরযোগ্যভাবে দেখানো যাচ্ছে না।","Finance → Cash & Accounts");
    const negative=accounts.filter(a=>a.current_balance<0);
    if(negative.length)add("warning","Negative account balance",negative.map(a=>a.account_name+" · "+money(a.current_balance)).join(" | "),"Opening balance ও linked entries যাচাই করুন");
    const unassigned=rows.filter(r=>r.record_kind==="Finance entry"&&r.status==="confirmed"&&r.account_name==="Unassigned");
    if(unassigned.length)add("warning","Confirmed entry-তে account যুক্ত নেই",unassigned.length+"টি confirmed Finance entry কোনো account-এ বরাদ্দ নয়।","Finance ledger-এ account mapping review করুন");
    const drafts=rows.filter(r=>r.record_kind==="Finance entry"&&r.status==="draft");
    if(drafts.length)add("info","Draft transaction review বাকি",drafts.length+"টি draft entry confirmed balance-এ অন্তর্ভুক্ত হয়নি।","Draft entry যাচাই করে confirm বা void করুন");
   }else if(type==="payable"){
    const overdue=rows.filter(r=>r.due_state==="Overdue"),balance=(source.supplierBalances||[]).reduce((n,r)=>n+num(r.outstanding_balance),0);
    if(overdue.length)add("warning","Overdue supplier bills",overdue.length+"টি নির্বাচিত bill-এর due date পার হয়েছে এবং balance বাকি আছে।","Supplier payment schedule review করুন");
    if(balance>0)add("info","বর্তমান supplier liability",money(balance)+" supplier ledger অনুযায়ী outstanding।","Due date ও cash plan মিলিয়ে payment schedule করুন");
    const drafts=rows.filter(r=>String(r.status||"").toLowerCase()==="draft");
    if(drafts.length)add("info","Draft bill review",drafts.length+"টি draft bill confirmed liability নয়।","Invoice যাচাই করে confirm বা void করুন");
   }else if(type==="receivable"||type==="collections"){
    const pendingCollection=total(rows,"pending_collection"),pendingRemittance=total(rows,"pending_remittance"),exceptions=rows.filter(r=>String(r.status||"").toLowerCase()==="exception"),variance=rows.filter(r=>Math.abs(num(r.remittance_variance))>0.009);
    if(pendingCollection>0)add("warning","COD collection এখনো বাকি",money(pendingCollection)+" এখনো courier collection হিসেবে রেকর্ড হয়নি।","Courier tracking ও collection status যাচাই করুন");
    if(pendingRemittance>0)add("warning","Net remittance এখনো যাচাইকৃত নয়",money(pendingRemittance)+" courier fee/adjustment বাদ দেওয়ার পরও Finance-এ verified income হিসেবে নেই।","Courier statement ও linked reconciled settlement যাচাই করুন");
    if(exceptions.length)add("warning","Courier settlement exception",exceptions.length+"টি settlement manual review প্রয়োজন।","Exception record ও courier statement মিলিয়ে দেখুন");
    if(variance.length)add("warning","Remittance variance",variance.length+"টি settlement-এর verified amount expected net amount-এর সঙ্গে মেলে না।","Courier statement, fee ও adjustment যাচাই করুন");
    if(!items.length)add("success","বর্তমান COD অবস্থায় খোলা পার্থক্য নেই","নির্বাচিত রেকর্ডে uncollected COD বা pending verified remittance পাওয়া যায়নি।");
   }else if(type==="expenses"){
    const budgets=(source.budgets||[]).filter(b=>b.status==="active"),actualRows=source.budgetFinance||[],actualByKey=new Map();
    actualRows.forEach(r=>{const key=String(r.entry_date||"").slice(0,7)+"|"+String(r.category||"");actualByKey.set(key,(actualByKey.get(key)||0)+num(r.amount));});
    const over=budgets.map(b=>({category:b.category,month:String(b.period_start||"").slice(0,7),budget:num(b.budget_amount),actual:actualByKey.get(String(b.period_start||"").slice(0,7)+"|"+b.category)||0})).filter(b=>b.actual>b.budget);
    if(over.length)add("warning","Budget exceeded",over.map(b=>b.category+" · "+b.month+" · "+money(b.actual-b.budget)+" over").join(" | "),"Category spending ও budget review করুন");
    const drafts=rows.filter(r=>r.status==="draft");
    if(drafts.length)add("info","Draft expense review বাকি",drafts.length+"টি draft expense confirmed expense total-এ ধরা হয়নি।","Receipt/approval যাচাই করে status update করুন");
    if(!items.length)add("success","নির্বাচিত expense data-তে সতর্কতা নেই","Confirmed operating expense-এ দৃশ্যমান budget overrun বা draft review item নেই।");
   }else if(type==="transactions"){
    const drafts=rows.filter(r=>r.status==="draft"),voids=rows.filter(r=>r.status==="void"),transfers=rows.filter(r=>r.record_kind==="Internal transfer");
    if(drafts.length)add("info","Draft transaction review বাকি",drafts.length+"টি draft transaction confirmed cash movement-এ অন্তর্ভুক্ত নয়।","Source record যাচাই করুন");
    if(voids.length)add("info","Void transaction আছে",voids.length+"টি void record audit trail-এ আছে, confirmed totals-এ গণনা হয়নি।");
    if(transfers.length)add("info","Internal transfer আলাদা রাখা হয়েছে",transfers.length+"টি account transfer income/expense হিসেবে গণনা হয়নি।");
    if(!items.length)add("success","লেনদেনের অবস্থা পরিষ্কার","নির্বাচিত সময়ে draft/void item বা internal transfer record পাওয়া যায়নি।");
   }else if(type==="business"||type==="sales"){
    const cancelled=orders.filter(o=>status(o)==="cancelled"),open=orders.filter(o=>["pending","processing","shipped"].includes(status(o)));
    if(!orders.length)add("info","নির্বাচিত সময়ে অর্ডার নেই","এই সময়সীমায় কোনো অর্ডার রেকর্ড পাওয়া যায়নি।","অন্য সময়সীমা নির্বাচন করুন");
    if(cancelled.length)add("warning","বাতিল অর্ডার রয়েছে",cancelled.length+"টি অর্ডার বাতিল হয়েছে ("+(orders.length?(cancelled.length/orders.length*100).toFixed(1):"0")+"%)। বাতিলের কারণ ও উৎস পর্যালোচনা করুন।","Orders → Cancelled orders");
    if(open.length)add("info","অর্ডার প্রক্রিয়াকরণ বাকি",open.length+"টি অর্ডার Pending, Processing বা Shipped অবস্থায় রয়েছে। অর্ডারমূল্যকে collected cash হিসেবে গণনা করা হয়নি।","Orders/Operations-এ fulfilment status review করুন");
    const undated=orders.filter(o=>!o.ordered_at);
    if(undated.length)add("warning","অর্ডারের তারিখ অনুপস্থিত",undated.length+"টি অর্ডারে ordered_at নেই; date trend-এ সেগুলো বাদ পড়েছে।","Order source data যাচাই করুন");
    if(!items.length)add("success","অর্ডার স্ট্যাটাসে বড় সতর্কতা নেই","নির্বাচিত অর্ডার রেকর্ডে বাতিল বা খোলা fulfilment backlog নেই।");
   }else if(type==="product-sales"||type==="top-products"){
    if(!rows.length)add("info","পণ্য বিক্রয় রেকর্ড নেই","নির্বাচিত সময়ে non-cancelled order item পাওয়া যায়নি।","Orders ও order_items source যাচাই করুন");
    const low=rows.filter(r=>r.current_stock!==null&&r.current_stock!==undefined&&num(r.current_stock)<=num(r.minimum_stock)),out=low.filter(r=>num(r.current_stock)<=0),lowPositive=low.filter(r=>num(r.current_stock)>0);
    if(out.length)add("warning","বিক্রি হওয়া পণ্য বর্তমানে Out of stock",out.slice(0,8).map(r=>r.product+" · "+num(r.quantity_sold)+" sold").join(" | "),"Products → Inventory-তে replenishment review করুন");
    if(lowPositive.length)add("warning","বিক্রিত পণ্যের স্টক Low threshold-এ",lowPositive.slice(0,8).map(r=>r.product+" · stock "+num(r.current_stock)).join(" | "),"Purchase / Inventory-তে replenishment পরিকল্পনা করুন");
    const unmatched=rows.filter(r=>r.catalogue_status==="Not in current catalogue");
    if(unmatched.length)add("info","বর্তমান ক্যাটালগে মেলেনি",unmatched.length+"টি sold product বর্তমান catalogue-এ মেলেনি; order-item snapshot অক্ষত রাখা হয়েছে।","Product catalogue mapping যাচাই করুন");
    const units=total(rows,"quantity_sold"),topUnits=total(rows.slice().sort((a,b)=>num(b.quantity_sold)-num(a.quantity_sold)).slice(0,3),"quantity_sold");
    if(units>0&&rows.length>3&&topUnits/units>=0.6)add("info","বিক্রয় শীর্ষ কয়েকটি পণ্যে কেন্দ্রীভূত","শীর্ষ ৩টি পণ্য মোট বিক্রিত ইউনিটের "+(topUnits/units*100).toFixed(1)+"%। Stock planning-এ এগুলো অগ্রাধিকার পেতে পারে।");
    if(!items.length)add("success","পণ্য বিক্রয়ে উল্লেখযোগ্য সতর্কতা নেই","বর্তমান catalogue match করা বিক্রিত পণ্যে low-stock বা stockout signal পাওয়া যায়নি।");
   }else if(type==="customer-wise-products"){
    if(!rows.length)add("info","গ্রাহক-পণ্য বিক্রয় ডেটা নেই","Selected period-এ customer/product line পাওয়া যায়নি।");
    const customers=new Set(rows.map(r=>String(r.customer||"").trim()).filter(Boolean)).size,products=new Set(rows.map(r=>String(r.product||"").trim()).filter(Boolean)).size,top=rows.slice().sort((a,b)=>num(b.total)-num(a.total))[0];
    if(top)add("info","সবচেয়ে বড় গ্রাহক-পণ্য সমন্বয়",top.customer+" × "+top.product+" · "+money(top.total)+" · "+num(top.quantity)+" units।");
    if(customers>0&&products>0)add("success","Customer/product coverage",customers+" জন গ্রাহক এবং "+products+"টি ভিন্ন পণ্যের ক্রয় সমন্বয় এই সময়ে পাওয়া গেছে।");
   }else if(type==="customer-products"||type==="top-customers"||type==="customers"){
    if(!rows.length)add("info","গ্রাহক রিপোর্টে কোনো অর্ডার নেই","এই সময়সীমায় non-cancelled order থেকে customer summary তৈরি হয়নি।");
    const returning=rows.filter(r=>num(r.orders)>1),oneTime=rows.filter(r=>num(r.orders)===1),spend=total(rows,"total_spent");
    if(returning.length)add("success","পুনরায় অর্ডার করা গ্রাহক",returning.length+" জন গ্রাহক একাধিক অর্ডার করেছেন; তাদের অর্ডার "+total(returning,"orders")+"টি।");
    else if(rows.length)add("info","পুনরায় অর্ডারের সংকেত কম","এই সময়সীমায় একাধিক অর্ডার করা গ্রাহক পাওয়া যায়নি। এটি lifetime retention নয়; কেবল নির্বাচিত সময়ের order snapshot।");
    const top=rows.slice().sort((a,b)=>num(b.total_spent)-num(a.total_spent))[0];
    if(top&&spend>0&&num(top.total_spent)/spend>=0.4)add("info","গ্রাহক ব্যয় কেন্দ্রীভূত","শীর্ষ গ্রাহকের recorded order value মোট customer order value-এর "+(num(top.total_spent)/spend*100).toFixed(1)+"%। এটি order-value concentration, profit নয়।");
    if(oneTime.length)add("info","একবার অর্ডার করা গ্রাহক",oneTime.length+" জন গ্রাহক নির্বাচিত সময়ে একটি non-cancelled order করেছেন। Repeat purchase follow-up বিবেচনা করা যেতে পারে।");
   }else if(type==="purchase"){
    const unfinished=rows.filter(r=>!["received","completed","cancelled","void"].includes(String(r.status||"").toLowerCase())),pendingUnits=rows.reduce((n,r)=>n+Math.max(0,num(r.ordered_units)-num(r.received_units)),0),late=rows.filter(r=>r.expected_date&&r.expected_date<todayISO()&&!["received","completed","cancelled","void"].includes(String(r.status||"").toLowerCase()));
    if(!rows.length)add("info","ক্রয় অর্ডার নেই","নির্বাচিত সময়ে কোনো Purchase Order পাওয়া যায়নি।","Supplier → Purchases");
    if(pendingUnits>0)add("warning","ক্রয়ের পণ্য গ্রহণ বাকি",pendingUnits+"টি unit এখনো Purchase Order-এ received হিসেবে রেকর্ড হয়নি।","Purchase receipt/GRN update করুন");
    if(late.length)add("warning","Expected delivery date পার হয়েছে",late.length+"টি অসম্পূর্ণ Purchase Order-এর expected date অতীত হয়েছে।","Supplier-এর সঙ্গে delivery status যাচাই করুন");
    if(unfinished.length)add("info","অসম্পূর্ণ Purchase Order",unfinished.length+"টি PO এখনো received/completed/cancelled/void নয়।","PO status ও receiving progress review করুন");
    if(!items.length)add("success","Purchase Order status স্বাভাবিক","নির্বাচিত রেকর্ডে অসম্পূর্ণ receiving বা overdue expected date নেই।");
   }else if(type==="product-purchase"){
    const pending=total(rows,"pending_quantity"),missing=rows.filter(r=>!r.product||r.product==="—");
    if(!rows.length)add("info","ক্রয় পণ্য লাইন নেই","নির্বাচিত সময়ে purchase order item পাওয়া যায়নি।");
    if(pending>0)add("warning","পণ্য গ্রহণ বাকি",pending+"টি unit ordered quantity থেকে received quantity বাদ দেওয়ার পরও বাকি।","Purchase Receipts-এ GRN/received quantity যাচাই করুন");
    if(missing.length)add("info","পণ্যের নাম অনুপস্থিত",missing.length+"টি purchase line-এ product name নেই।","Purchase order items review করুন");
    if(!items.length)add("success","ক্রয় পণ্য receiving সম্পন্ন","এই সময়সীমার purchase lines-এ pending receiving পাওয়া যায়নি।");
   }else if(["low-stock","alert-products","stock","stock-list"].includes(type)){
    if(!rows.length)add("info","বর্তমান স্টক রেকর্ড নেই","বর্তমান active catalogue snapshot-এ নির্বাচিত report filter-এর জন্য কোনো পণ্য নেই।");
    const out=rows.filter(r=>num(r.stock)<=0),low=rows.filter(r=>num(r.stock)>0&&num(r.stock)<=num(r.minimum_stock)),missingCost=rows.filter(r=>r.unit_cost===null||r.unit_cost===undefined);
    if(out.length)add("warning","Out of stock পণ্য",out.length+"টি পণ্যের বর্তমান স্টক শূন্য বা কম।","Purchase ও Product stock records review করুন");
    if(low.length)add("warning","Low stock পণ্য",low.length+"টি পণ্যের স্টক তাদের minimum threshold-এর সমান বা নিচে।","Replenishment quantity ও lead time পরিকল্পনা করুন");
    if(missingCost.length)add("info","Cost data অনুপস্থিত",missingCost.length+"টি পণ্যের unit cost সংরক্ষিত নেই; valuation-এ সেগুলোর মান গণনা করা হয়নি।","Product cost settings-এ প্রকৃত ক্রয় কস্ট যোগ করুন");
    if(!items.length)add("success","স্টক সতর্কতা পাওয়া যায়নি","এই snapshot-এ out-of-stock, low-stock বা missing-cost signal নেই।");
   }else if(type==="daily"){
    const recorded=total(rows,"cod_remitted_recorded"),verified=total(rows,"cod_remitted_verified"),expenses=total(rows,"confirmed_expenses"),ordersCount=total(rows,"orders"),cancelled=total(rows,"cancelled_orders");
    if(!rows.length)add("info","দৈনিক কার্যক্রমের ডেটা নেই","Selected period-এ order, finance বা COD event পাওয়া যায়নি।");
    if(cancelled>0)add("warning","দৈনিক অর্ডারে বাতিল রয়েছে",cancelled+"টি অর্ডার নির্বাচিত দিনগুলোতে বাতিল হয়েছে।","Order cancellation reason review করুন");
    if(recorded>verified+0.009)add("warning","রেকর্ডকৃত বনাম যাচাইকৃত COD রেমিট্যান্সে পার্থক্য","Selected date range-এ settlement-এ "+money(recorded)+" recorded remittance আছে, কিন্তু linked confirmed Finance income "+money(verified)+"।","Courier statement এবং COD settlement-এর linked Finance entry reconcile করুন");
    if(verified>recorded+0.009)add("info","Finance verification বেশি","Linked confirmed COD Finance income "+money(verified)+"; settlement record-এ "+money(recorded)+" remitted amount আছে। Link/date mismatch যাচাই করুন");
    if(expenses>0)add("info","নিশ্চিত ব্যয় আলাদা গণনা হয়েছে",money(expenses)+" confirmed expense; এটি profit বা COGS নয়। Product cost/returns আলাদা reconciliation ছাড়া লাভ হিসাব করবেন না।");
    if(ordersCount>0&&ordersCount===cancelled)add("warning","নির্বাচিত সময়ে non-cancelled order নেই","সব রেকর্ডকৃত অর্ডার cancelled; order value শূন্য দেখানো হয়েছে।");
    if(!items.length)add("success","দৈনিক reconciliation সতর্কতা নেই","এই সময়ে recorded এবং verified COD remittance সমান এবং দৃশ্যমান cancellation/expense anomaly নেই।");
   }
   return items;
  }
  function renderBars(rows,key){
   if(!rows.length)return '<div class="hf-report-empty"><strong>বিশ্লেষণের জন্য রেকর্ড নেই</strong><p>সোর্স মডিউলে ডেটা যুক্ত হলে এই অংশ পূরণ হবে।</p></div>';
   const max=Math.max(1,...rows.map(r=>num(r[key])));
   return '<div class="hf-report-bars">'+rows.slice(0,10).map(row=>{const label=String(row[Object.keys(row).find(k=>typeof row[k]==="string")||"date"]??"—"),value=num(row[key]),width=Math.max(value>0?2:0,value/max*100);return '<div class="hf-report-bar-row"><div class="hf-report-bar-label"><strong>'+esc(label)+'</strong><span>'+esc(displayCell(value,key))+'</span></div><div class="hf-report-bar-track"><span style="width:'+width.toFixed(1)+'%"></span></div></div>';}).join("")+'</div>';
  }
  function renderRecordTable(){
   if(!workspace||!report.rows)return;
   const q=String($("reportWorkspaceSearch")?.value||"").toLowerCase().trim(),filter=String($("reportWorkspaceFieldFilter")?.value||"");
   visibleRows=report.rows.filter(row=>(!q||Object.values(row).some(v=>String(v??"").toLowerCase().includes(q)))&&(!filter||String(row[activeFilterColumn]??"")===filter));
   $("reportWorkspaceTableHead").innerHTML="<tr>"+report.columns.map(k=>"<th>"+esc(k.replace(/_/g," "))+"</th>").join("")+"</tr>";
   $("reportWorkspaceTableBody").innerHTML=visibleRows.length?visibleRows.slice(0,250).map(row=>"<tr>"+report.columns.map(k=>"<td>"+esc(displayCell(row[k],k))+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="'+report.columns.length+'"><div class="hf-report-empty"><strong>কোনো রেকর্ড পাওয়া যায়নি</strong><p>সার্চ বা ফিল্টার পরিবর্তন করুন।</p></div></td></tr>';
   $("reportWorkspaceRecordsFoot").textContent=visibleRows.length>250?"প্রিভিউতে প্রথম ২৫০টি রেকর্ড; CSV/Excel-এ সম্পূর্ণ তালিকা।":visibleRows.length+"টি রেকর্ড দেখানো হচ্ছে।";
  }
  function showSegment(segment){
   activeSegment=segment;
   ["overview","analysis","records","insights"].forEach(id=>{const panel=$("reportWorkspace"+id.charAt(0).toUpperCase()+id.slice(1));if(panel)panel.hidden=id!==segment;});
   document.querySelectorAll("[data-report-segment]").forEach(b=>{const active=b.dataset.reportSegment===segment;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
   if(segment==="records")renderRecordTable();
  }
  function renderWorkspace(){
   if(!reportGroup||!workspace)return;
   const def=definitions[report.type]||definitions.business,metrics=kpisFor(report.type,report.rows,report.source||{}),analysis=analysisFor(report.type,report.rows,report.source||{}),analysisBlocks=analysis.blocks||[analysis],firstAnalysisBlock=analysisBlocks[0]||{title:def[3],description:def[2],columns:[],rows:[],bars:"records"};
   $("reportWorkspaceTitle").textContent=def[0];$("reportWorkspaceDescription").textContent=def[2];$("reportWorkspaceCode").textContent=report.type.toUpperCase();$("reportWorkspaceRange").textContent=report.rangeLabel+" · "+report.rows.length+" records";
   $("reportWorkspaceKpis").innerHTML=metrics.map(m=>'<article class="hf-report-kpi"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong><span>'+esc(m.note)+'</span></article>').join("");
   $("reportWorkspaceTabs").innerHTML='<button type="button" role="tab" data-report-segment="overview" aria-selected="true" class="active">সারসংক্ষেপ</button><button type="button" role="tab" data-report-segment="analysis" aria-selected="false">'+esc(def[3])+'</button><button type="button" role="tab" data-report-segment="records" aria-selected="false">'+esc(def[4])+'</button>'+'<button type="button" role="tab" data-report-segment="insights" aria-selected="false">ব্যবসায়িক ইনসাইটস</button>';
   const metricRows=metrics.map(m=>({বিষয়:m.label,মান:m.value,বিবরণ:m.note}));
   $("reportWorkspaceOverview").innerHTML='<div class="hf-report-overview-grid"><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>মূল সূচক</h3><p>নির্বাচিত সময়ের রেকর্ড ও ডেটা সোর্স</p></div><span>'+metrics.length+' indicators</span></div>'+tableMarkup(metricRows,Object.keys(metricRows[0]||{বিষয়:"",মান:"",বিবরণ:""}),"সারাংশ নেই")+'</section><section class="hf-report-subsection"><div class="hf-report-subsection-head"><div><h3>'+esc(firstAnalysisBlock.title||def[3])+'</h3><p>'+esc(firstAnalysisBlock.description||def[2])+'</p></div></div>'+tableMarkup(firstAnalysisBlock.rows||[],firstAnalysisBlock.columns||[],"বিশ্লেষণের ডেটা নেই")+'</section></div><div class="hf-report-source-note">'+esc(report.notes||"রিপোর্টটি সংযুক্ত ডেটা সোর্স থেকে তৈরি।")+'</div>';
   $("reportWorkspaceAnalysis").innerHTML=analysisBlocks.map(block=>'<section class="hf-report-subsection" style="margin-bottom:12px"><div class="hf-report-subsection-head"><div><h3>'+esc(block.title||def[3])+'</h3><p>'+esc(block.description||"বিভাগ/ধরন অনুযায়ী সমষ্টি; মূল রেকর্ডের বিকল্প নয়।")+'</p></div><span>'+(block.rows||[]).length+' groups</span></div>'+renderBars(block.rows||[],block.bars||"records")+tableMarkup(block.rows||[],block.columns||[],"এই উপ-বিশ্লেষণে কোনো রেকর্ড নেই")+'</section>').join("");
   $("reportWorkspaceInsights").innerHTML=insightsFor(report.type,report.rows,report.source||{}).map(item=>'<article class="hf-report-insight-card is-'+esc(item.level)+'"><div><span class="hf-report-insight-level">'+esc(item.level.toUpperCase())+'</span><h3>'+esc(item.title)+'</h3></div><p>'+esc(item.detail)+'</p>'+(item.action?'<small>'+esc(item.action)+'</small>':'')+'</article>').join("")||'<div class="hf-report-empty"><strong>এই রিপোর্টে উল্লেখযোগ্য ব্যবসায়িক সতর্কতা নেই</strong><p>যাচাইকৃত রেকর্ড থেকে কোনো নির্দিষ্ট action item পাওয়া যায়নি।</p></div>';
   $("reportWorkspaceRecordsTitle").textContent=def[4];$("reportWorkspaceRecordsNote").textContent="মূল সোর্স রেকর্ড; সার্চ, ফিল্টার এবং CSV/Excel/PDF এক্সপোর্ট ব্যবহার করুন।";
   const preferred=({business:"date",sales:"date","product-sales":"product","top-products":"product","customer-wise-products":"customer","customer-products":"customer","top-customers":"customer",customers:"customer",purchase:"supplier","product-purchase":"product",payable:"supplier",receivable:"courier",collections:"courier","low-stock":"category","alert-products":"alert",stock:"category","stock-list":"category","account-payments":"account_name",expenses:"category",transactions:"entry_type",daily:"date"})[report.type]||"";
   activeFilterColumn=preferred&&report.rows.some(r=>r[preferred]!==undefined)?preferred:"";
   const filter=$("reportWorkspaceFieldFilter"),values=activeFilterColumn?[...new Set(report.rows.map(r=>String(r[activeFilterColumn]??"")).filter(Boolean))].sort():[];
   if(filter){filter.innerHTML='<option value="">সব '+(activeFilterColumn?esc(activeFilterColumn.replace(/_/g," ")):"রেকর্ড")+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");filter.disabled=!values.length;filter.value="";}
   $("reportWorkspaceSearch").value="";renderRecordTable();$("reportTitle").textContent=def[0];$("reportRangeLabel").textContent=report.rangeLabel;$("reportSummary").innerHTML=metrics.slice(0,3).map(m=>'<div class="hf-summary-pill"><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong></div>').join("");$("reportNote").textContent=report.notes||"";
   const hero=document.querySelector(".hf-reports-hero h1");if(hero)hero.textContent=def[0];const eye=document.querySelector(".hf-reports-hero .page-eyebrow");if(eye)eye.textContent="INDIVIDUAL REPORT";const desc=document.querySelector(".hf-reports-hero p:not(.page-eyebrow)");if(desc)desc.textContent=def[2];
   if($("printReportTitle"))$("printReportTitle").textContent=def[0];if($("printReportDetails"))$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records";showSegment(activeSegment);
  }
  function initWorkspace(){
   if(!reportGroup)return;
   const builder=$("reportBuildSection"),preview=$("reportPreviewSection"),center=document.querySelector(".hf-report-center");
   workspace=document.createElement("section");workspace.id="reportWorkspace";workspace.className="hf-report-workspace";
   workspace.innerHTML='<div class="hf-report-workspace-head"><div><p class="page-eyebrow">INDIVIDUAL REPORT WORKSPACE</p><h2 id="reportWorkspaceTitle"></h2><p id="reportWorkspaceDescription"></p></div><div class="hf-report-workspace-meta"><span id="reportWorkspaceCode"></span><small id="reportWorkspaceRange"></small></div></div><div class="hf-report-kpis" id="reportWorkspaceKpis"></div><div class="hf-report-workspace-toolbar"><div class="hf-report-workspace-filters" id="reportWorkspaceFilters"></div><div class="hf-report-workspace-actions" id="reportWorkspaceActions"></div></div><div class="hf-report-segment-nav" id="reportWorkspaceTabs" role="tablist"></div><section class="hf-report-segment-panel" id="reportWorkspaceOverview" role="tabpanel"></section><section class="hf-report-segment-panel" id="reportWorkspaceAnalysis" role="tabpanel" hidden></section><section class="hf-report-segment-panel" id="reportWorkspaceRecords" role="tabpanel" hidden><div class="hf-report-record-toolbar"><div><h3 id="reportWorkspaceRecordsTitle"></h3><p id="reportWorkspaceRecordsNote"></p></div><div class="hf-report-record-filters"><input id="reportWorkspaceSearch" class="hf-input" type="search" placeholder="এই রিপোর্টের রেকর্ড খুঁজুন" aria-label="Search report records"><select id="reportWorkspaceFieldFilter" class="hf-select" aria-label="Filter report records"><option value="">সব রেকর্ড</option></select></div></div><div class="hf-report-table-wrap" tabindex="0" role="region" aria-label="Report detail records"><table class="hf-table"><thead id="reportWorkspaceTableHead"></thead><tbody id="reportWorkspaceTableBody"></tbody></table></div><p class="hf-data-note" id="reportWorkspaceRecordsFoot"></p></section><section class="hf-report-segment-panel" id="reportWorkspaceInsights" role="tabpanel" hidden></section><div class="hf-report-workspace-foot" id="reportWorkspaceFoot"></div>';
   if(builder)builder.parentNode.insertBefore(workspace,builder);if(center)center.hidden=true;if(builder)builder.hidden=true;if(preview)preview.hidden=true;
   const filterHost=$("reportWorkspaceFilters"),actionHost=$("reportWorkspaceActions"),rangeLabel=$("rangeSelect")?.closest("label");
   if(rangeLabel)filterHost.appendChild(rangeLabel);if($("customRangeFields"))filterHost.appendChild($("customRangeFields"));
   if(first==="receivable"){if(rangeLabel)rangeLabel.hidden=true;if($("customRangeFields"))$("customRangeFields").hidden=true;}
   if($("includePersonalData")?.closest("label"))$("includePersonalData").closest("label").hidden=true;
   if($("buildReportBtn")){ $("buildReportBtn").textContent="রিপোর্ট রিফ্রেশ";actionHost.appendChild($("buildReportBtn")); }
   ["downloadCsvBtn","downloadXlsxBtn","downloadPdfBtn"].forEach(id=>{if($(id))actionHost.appendChild($(id));});
   if($("reportType")?.closest("label"))$("reportType").closest("label").hidden=true;
   $("reportWorkspaceSearch").addEventListener("input",renderRecordTable);$("reportWorkspaceFieldFilter").addEventListener("change",renderRecordTable);
   $("reportWorkspaceTabs").addEventListener("click",event=>{const b=event.target.closest("[data-report-segment]");if(b)showSegment(b.dataset.reportSegment);});
  }
  function setupReportWorkspace(){
   initWorkspace();
   if(reportGroup){document.querySelectorAll("[data-report-type]").forEach(button=>button.hidden=true);}
  }
  setupReportWorkspace();
  document.querySelectorAll("[data-report-type]").forEach(button=>button.addEventListener("click",async()=>{const type=button.dataset.reportType;if(!$("reportType"))return;$("reportType").value=type;document.querySelectorAll("[data-report-type]").forEach(item=>item.classList.toggle("is-selected",item===button));const b=$("buildReportBtn");if(b){b.disabled=true;try{await buildReport();$("reportBuildSection")?.scrollIntoView({behavior:"smooth",block:"start"});}catch(err){toast(err.message||"Could not load report.","error");}finally{b.disabled=false;}}}));
  $("reportType")?.addEventListener("change",()=>document.querySelectorAll("[data-report-type]").forEach(item=>item.classList.toggle("is-selected",item.dataset.reportType===$("reportType").value)));
  $("buildReportBtn")?.addEventListener("click",async()=>{const b=$("buildReportBtn");b.disabled=true;try{await buildReport();toast("Report is ready.");}catch(err){toast(err.message||"Report could not be loaded.","error");}finally{b.disabled=false;}});
  $("downloadCsvBtn")?.addEventListener("click",async()=>{try{if(!report.type)await buildReport();downloadFile(fileBase(report.title)+"-"+todayISO()+".csv",csvText(report.rows),"text/csv;charset=utf-8");await audit("report_downloaded","report",null,report.title+" CSV downloaded",{rows:report.rows.length,type:report.type});toast("CSV download started.");}catch(err){toast(err.message||"CSV export failed.","error");}});
  $("downloadXlsxBtn")?.addEventListener("click",async()=>{try{if(!report.type)await buildReport();if(!window.XLSX)throw new Error("Excel export library did not load. Use CSV instead.");const ws=window.XLSX.utils.json_to_sheet(report.rows),wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,report.title.slice(0,31));window.XLSX.writeFile(wb,fileBase(report.title)+"-"+todayISO()+".xlsx");await audit("report_downloaded","report",null,report.title+" XLSX downloaded",{rows:report.rows.length,type:report.type});toast("Excel file is being downloaded.");}catch(err){toast(err.message||"Excel export failed.","error");}});
  $("downloadPdfBtn")?.addEventListener("click",async()=>{try{if(!report.type)await buildReport();$("printReportTitle").textContent=report.title;$("printReportDetails").textContent=report.rangeLabel+" · "+report.rows.length+" records · "+new Intl.DateTimeFormat("en-BD",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date());await audit("report_printed","report",null,report.title+" opened for PDF/printing",{rows:report.rows.length,type:report.type});window.print();}catch(err){toast(err.message||"Could not prepare print report.","error");}});
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
   "supplier-add":()=>{if(typeof window.HFSupplierInit==="function")return window.HFSupplierInit("add");throw new Error("Supplier module did not load.");},
   "supplier-purchases":()=>{if(typeof window.HFSupplierInit==="function")return window.HFSupplierInit("purchases");throw new Error("Supplier module did not load.");},
   "supplier-payments":()=>{if(typeof window.HFSupplierInit==="function")return window.HFSupplierInit("payments");throw new Error("Supplier module did not load.");},
   products:initProducts,
   coupons:()=>{if(typeof window.HFCouponsInit==="function")return window.HFCouponsInit();throw new Error("Coupon module did not load.");},
   "coupon-usage":()=>{if(typeof window.HFCouponUsageInit==="function")return window.HFCouponUsageInit();throw new Error("Coupon usage module did not load.");},
   "products-add":initProductAdd,
   "products-barcode":()=>{if(typeof window.HFBarcodeInit==="function")return window.HFBarcodeInit();throw new Error("Barcode module did not load.");},
   "products-reviews":()=>{if(typeof window.HFReviewsInit==="function")return window.HFReviewsInit();throw new Error("Product Reviews module did not load.");},
   content:initContent,
   customers:()=>{if(typeof window.HFCustomersInit==="function")return window.HFCustomersInit();throw new Error("Customer Management module did not load.");},
   "customer-settings":()=>{if(typeof window.HFCustomerSettingsInit==="function")return window.HFCustomerSettingsInit();throw new Error("Customer Settings module did not load.");},
    "marketing-center":()=>{if(typeof window.HFMarketingInit==="function")return window.HFMarketingInit();throw new Error("Customer Messages module did not load.");},
   "ai-conversations":()=>Promise.resolve(), // This page initializes itself in ai-conversations.js after the shared AAL2 shell is ready.
   finance:initFinance,
   reports:initReports,
   "reports-business":initReports,
   "reports-purchase":initReports,
   "reports-customers":initReports,
   "reports-payables":initReports,
   "reports-inventory":initReports,
   "reports-finance":initReports,
   "reports-daily":initReports,
   settings:initSettings,
   "website-publisher":()=>{if(typeof window.HFWebsitePublisherInit==="function")return window.HFWebsitePublisherInit();throw new Error("Website Publisher module did not load.");},
    wordpress:()=>Promise.resolve()
  };
  if(!actions[page]){toast("This section is not available yet.","error");return;}
  actions[page]().catch(err=>{console.error("Admin page failed",page,err);toast("The page could not load its data. "+(err?.message||"Please refresh and try again."),"error");});
 }
 const globalSearchInput=$("globalSearch");
  const adminMain=$("adminMain");
  let globalSearchFrame=0;
  const globalSearchFilteredRows=new Set();
  function applyGlobalTableSearch(){
   if(!adminMain)return;
   if(["customers","customer-settings"].includes(document.body.dataset.page))return; // Customer pages apply search server-side.
   const q=String(globalSearchInput?.value||"").toLowerCase().trim();
   if(!q){
    globalSearchFilteredRows.forEach(row=>{if(row.isConnected)row.hidden=false;});
    globalSearchFilteredRows.clear();
    return;
   }
   const rows=adminMain.querySelectorAll(".hf-table tbody tr");
   const liveRows=new Set(rows);
   globalSearchFilteredRows.forEach(row=>{if(!liveRows.has(row))globalSearchFilteredRows.delete(row);});
   rows.forEach(row=>{
    const hidden=!row.textContent.toLowerCase().includes(q);
    if(row.hidden!==hidden)row.hidden=hidden;
    if(hidden)globalSearchFilteredRows.add(row);else globalSearchFilteredRows.delete(row);
   });
  }
  globalSearchInput?.addEventListener("input",applyGlobalTableSearch);
  if(adminMain&&window.MutationObserver){
   const globalSearchObserver=new MutationObserver(records=>{
    if(!String(globalSearchInput?.value||"").trim())return;
    const tableChanged=records.some(record=>{
     const target=record.target.nodeType===1?record.target:record.target.parentElement;
     if(target?.closest?.(".hf-table tbody"))return true;
     return [...(record.addedNodes||[])].some(node=>node.nodeType===1&&
      (node.matches?.(".hf-table tbody")||node.querySelector?.(".hf-table tbody")));
    });
    if(!tableChanged||globalSearchFrame)return;
    globalSearchFrame=window.requestAnimationFrame(()=>{globalSearchFrame=0;applyGlobalTableSearch();});
   });
   globalSearchObserver.observe(adminMain,{subtree:true,childList:true,characterData:true});
  }
 doInit();
});
})();
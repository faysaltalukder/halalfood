/* Pure analytics calculations shared by Admin Overview and Analytics. */
(() => {
  "use strict";
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

  window.HFAnalyticsModel = Object.freeze({
    stageActors,
    topProducts,
    visitorSessionKey,
    formatSeconds,
    buildPageExperience,
    buildSessionJourneys,
    buildProductPerformance,
  });
})();

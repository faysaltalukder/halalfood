(() => {
"use strict";
window.HFAdminReady.then(async H=>{
 if(!H)return;
 const {client,esc,money,shortNum,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,slugify,rangeQuery,fetchOrders,fetchEvents,fetchProducts,fetchCategories,fetchPosts,fetchFinance,palette,colorSet,drawChart,groupBy,lastDateKeys,charts}=H;
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
  return {scales:{x:{ticks:{color:"#858293",maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}},y:{beginAtZero:true,ticks:{color:"#858293",precision:0},grid:{color:"#eeeae2"}}}};
 }
 function orderStatusCounts(orders){
  const labels=["pending","processing","shipped","delivered","cancelled"];
  return {labels,datasets:[{data:labels.map(s=>orders.filter(o=>o.status===s).length),backgroundColor:[palette.yellow,palette.blue,palette.purple,palette.green,palette.red],borderColor:"#fffdf9",borderWidth:3,hoverOffset:7}]};
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
  async function refresh(){
   const range={from:new Date(Date.now()-30*86400000).toISOString(),to:new Date().toISOString(),days:30,label:"Last 30 days"};
   const [orders,events,products]=await Promise.all([fetchOrders(range,5000),fetchEvents(range,15000),fetchProducts()]);
   const orderValue=orders.filter(o=>o.status!=="cancelled").reduce((sum,o)=>sum+Number(o.total||0),0);
   $("kpiPageViews").textContent=shortNum(events.filter(e=>e.event_name==="page_view").length);
   $("kpiProductViews").textContent=shortNum(events.filter(e=>e.event_name==="view_item").length);
   $("kpiOrders").textContent=shortNum(orders.length);
   $("kpiOrderValue").textContent=money(orderValue);
   $("kpiPending").textContent=shortNum(orders.filter(o=>o.status==="pending").length);
   $("kpiCart").textContent=shortNum(events.filter(e=>e.event_name==="add_to_cart").length);
   $("kpiNote").textContent=range.label+" · recorded order value is not verified cash income.";
   const days=14,labels=lastDateKeys(days);
   drawChart("overviewTrafficChart",{type:"line",data:{labels:labels.map(d=>dateOnly(d)),datasets:[
    {label:"Page views",data:labels.map(d=>events.filter(e=>e.event_name==="page_view"&&String(e.occurred_at).slice(0,10)===d).length),borderColor:palette.blue,backgroundColor:"#5B86B51a",fill:true,tension:.35,pointRadius:2,borderWidth:2},
    {label:"Product views",data:labels.map(d=>events.filter(e=>e.event_name==="view_item"&&String(e.occurred_at).slice(0,10)===d).length),borderColor:palette.orange,backgroundColor:"#C97B3D18",fill:true,tension:.35,pointRadius:2,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}}}});
   drawChart("overviewStatusChart",{type:"doughnut",data:orderStatusCounts(orders),options:{cutout:"67%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   renderTopProducts($("overviewTopProducts"),topProducts(events,products).slice(0,5));
   renderRecentOrders(orders);
   $("overviewUpdated").textContent="Updated "+new Date().toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"});
   $("overviewDataNote").textContent=events.length+" tracking events and "+orders.length+" order records were returned for the last 30 days. Chart values use the data available to the admin account.";
  }
  await refresh();attachRefresh(refresh);
 }
 async function initAnalytics(){
  async function refresh(){
   const range=selectedRange();const [events,orders,products]=await Promise.all([fetchEvents(range),fetchOrders(range,5000),fetchProducts()]);
   const chartDays=Math.min(range.days||30,90),keys=lastDateKeys(chartDays);
   drawChart("analyticsTrafficChart",{type:"line",data:{labels:keys.map(dateOnly),datasets:[
    {label:"Page views",data:keys.map(k=>events.filter(e=>e.event_name==="page_view"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.blue,backgroundColor:"#5B86B51a",fill:true,tension:.32,pointRadius:1.5,borderWidth:2},
    {label:"Product views",data:keys.map(k=>events.filter(e=>e.event_name==="view_item"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.orange,backgroundColor:"#C97B3D15",fill:true,tension:.32,pointRadius:1.5,borderWidth:2},
    {label:"Cart additions",data:keys.map(k=>events.filter(e=>e.event_name==="add_to_cart"&&String(e.occurred_at).slice(0,10)===k).length),borderColor:palette.green,backgroundColor:"#4A987016",fill:false,tension:.32,pointRadius:1.5,borderWidth:2}
   ]},options:{...chartAxisOptions(),plugins:{legend:{position:"bottom"}}}});
   const top=topProducts(events,products);
   drawChart("analyticsProductChart",{type:"doughnut",data:{labels:top.slice(0,7).map(x=>x.name),datasets:[{data:top.slice(0,7).map(x=>x.count),backgroundColor:colorSet,borderColor:"#fffdf9",borderWidth:3,hoverOffset:8}]},options:{cutout:"57%",plugins:{legend:{position:"bottom"}}}});
   const sources=groupBy(events.filter(e=>e.event_name==="page_view"),e=>[e.source,e.medium].filter(Boolean).join(" / ")||"Direct or unknown").slice(0,7);
   drawChart("analyticsSourceChart",{type:"bar",data:{labels:sources.map(x=>x.label),datasets:[{label:"Page views",data:sources.map(x=>x.count),backgroundColor:colorSet,borderRadius:7,maxBarThickness:36}]},options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0,color:"#858293"},grid:{color:"#eeeae2"}},y:{ticks:{color:palette.navy},grid:{display:false}}}}});
   const funnelEvents=events.map(e=>e);renderFunnel(funnelEvents);
   drawChart("analyticsOrdersChart",{type:"doughnut",data:orderStatusCounts(orders),options:{cutout:"60%",plugins:{legend:{position:"bottom"}},onClick:(ev,items)=>{if(items.length)location.href="./orders.html?status="+encodeURIComponent(["pending","processing","shipped","delivered","cancelled"][items[0].index]);}}});
   const total=events.length,views=events.filter(e=>e.event_name==="page_view").length,pv=events.filter(e=>e.event_name==="view_item").length,carts=events.filter(e=>e.event_name==="add_to_cart").length,wa=events.filter(e=>e.event_name==="whatsapp_click").length;
   $("analyticsEventsCount").textContent=shortNum(total);$("analyticsPageViews").textContent=shortNum(views);$("analyticsProductViews").textContent=shortNum(pv);$("analyticsCartAdds").textContent=shortNum(carts);$("analyticsWhatsApp").textContent=shortNum(wa);
   $("analyticsReportHint").textContent=range.label+" · "+total.toLocaleString("en-BD")+" recorded events · "+orders.length.toLocaleString("en-BD")+" orders. "+(range.days&&range.days>90?"Daily trend shows the last 90 days; totals use the full selected range.":"");
   $("analyticsTopProducts").innerHTML=top.length?top.map((x,i)=>'<div class="hf-insight-row">'+(x.product?.image_url?'<img class="hf-thumb" src="'+esc(x.product.image_url)+'" alt="">':'<span class="hf-thumb hf-thumb-empty">'+(i+1)+'</span>')+'<div><strong>'+esc(x.name)+'</strong><small>'+esc(x.product?.category||"No category match")+'</small></div><span class="hf-insight-number">'+shortNum(x.count)+'</span></div>').join(""):makeEmpty("No product-view data","Check again after the website has recorded product views.");
   $("analyticsEventBreakdown").innerHTML=groupBy(events,e=>e.event_name).slice(0,12).map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+shortNum(x.count)+'</td><td>'+(total?Math.round(x.count/total*100)+"%":"—")+'</td></tr>').join("")||'<tr><td colspan="3">'+makeEmpty("No events yet","No website events were recorded in this date range.")+'</td></tr>';
  }
  bindRangeControls(()=>refresh());await refresh();attachRefresh(refresh);
 }
 async function initOrders(){
  let all=[];
  function render(){
   const search=String($("orderSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim();
   const status=$("orderStatusFilter")?.value||"";
   const rows=all.filter(o=>(!status||o.status===status)&&(!search||[o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.id,...(o.order_items||[]).map(i=>i.product_name)].join(" ").toLowerCase().includes(search)));
   $("ordersFoundCount").textContent=rows.length.toLocaleString("en-BD")+" orders";
   $("ordersDataBody").innerHTML=rows.length?rows.map(o=>'<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(String(o.id).slice(0,8))+'</small></td><td><strong>'+esc(o.customer_name||"Guest")+'</strong><small>'+esc(o.customer_phone||"No phone")+'</small></td><td>'+esc((o.order_items||[]).slice(0,2).map(x=>x.product_name+" × "+x.quantity).join(", ")||"No item detail")+'</td><td>'+money(o.subtotal)+'</td><td>'+money(o.delivery_charge)+'</td><td><strong>'+money(o.total)+'</strong></td><td><select class="hf-select order-status-select" data-order-id="'+esc(o.id)+'" style="min-width:120px;padding:7px;font-size:11px">'+statusOptions.map(s=>'<option value="'+s+'" '+(s===o.status?"selected":"")+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>').join("")+'</select></td><td>'+dateTime(o.ordered_at)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-order-details="'+esc(o.id)+'">Details</button></div></td></tr>').join(""):'<tr><td colspan="9">'+makeEmpty("No matching orders","Try another status or a shorter search term.")+'</td></tr>';
  }
  async function refresh(){all=await fetchOrders(null,5000);render();$("ordersUpdated").textContent="Updated "+dateTime(new Date().toISOString());}
  $("orderSearch")?.addEventListener("input",render);$("orderStatusFilter")?.addEventListener("change",render);
  const qStatus=new URLSearchParams(location.search).get("status");if(qStatus&&statusOptions.includes(qStatus))$("orderStatusFilter").value=qStatus;
  $("ordersDataBody")?.addEventListener("change",async e=>{
   const select=e.target.closest(".order-status-select");if(!select)return;
   const order=all.find(o=>o.id===select.dataset.orderId);if(!order)return;
   const next=select.value,old=order.status;if(next===old)return;
   if((next==="cancelled"||next==="delivered")&&!confirm("Change order "+(order.order_number||String(order.id).slice(0,8))+" to "+next+"?")){select.value=old;return;}
   select.disabled=true;
   try{
    const {data,error}=await client.from("orders").update({status:next}).eq("id",order.id).select("id,status").single();if(error)throw error;
    await audit("order_status_changed","order",order.id,"Order status changed from "+old+" to "+next,{status:next});
    toast("Order status updated.");await refresh();
   }catch(err){select.value=old;toast("Status could not be saved: "+(err.message||"check database permissions"),"error");}
   finally{select.disabled=false;}
  });
  $("ordersDataBody")?.addEventListener("click",e=>{
   const b=e.target.closest("[data-order-details]");if(!b)return;const o=all.find(x=>x.id===b.dataset.orderDetails);if(!o)return;
   $("orderDetailTitle").textContent="Order "+(o.order_number||String(o.id).slice(0,8));
   $("orderDetailContent").innerHTML='<div class="hf-summary-strip"><div class="hf-summary-pill"><small>Order total</small><strong>'+money(o.total)+'</strong></div><div class="hf-summary-pill"><small>Products subtotal</small><strong>'+money(o.subtotal)+'</strong></div><div class="hf-summary-pill"><small>Delivery</small><strong>'+money(o.delivery_charge)+'</strong></div></div><div class="hf-field-grid"><div><strong>Customer</strong><p>'+esc(o.customer_name||"—")+'</p></div><div><strong>Phone</strong><p>'+esc(o.customer_phone||"—")+'</p></div><div><strong>Email</strong><p>'+esc(o.customer_email||"—")+'</p></div><div><strong>Status</strong><p>'+makeStatus(o.status)+'</p></div><div><strong>Delivery area</strong><p>'+esc(o.delivery_zone||"Not recorded")+'</p></div><div><strong>Payment method</strong><p>'+esc(o.payment_method||"Not recorded")+'</p></div><div class="hf-span-2"><strong>Delivery address</strong><p>'+esc(o.delivery_address||"—")+'</p></div></div><h3 style="margin:18px 0 8px">Products</h3><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>'+((o.order_items||[]).map(i=>'<tr><td>'+esc(i.product_name)+'</td><td>'+esc(i.quantity)+' '+esc(i.unit||"")+'</td><td>'+money(i.unit_price)+'</td><td>'+money(i.line_total)+'</td></tr>').join("")||'<tr><td colspan="4">No item details</td></tr>')+'</tbody></table></div><p class="hf-data-note">Order value is a recorded order amount, not proof that a payment has been collected.</p>';
   $("orderDialog")?.showModal();
  });
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
  let products=[],categories=[];
  function fillCategories(selected=""){
   $("productCategorySelect").innerHTML='<option value="">Choose category</option>'+categories.map(c=>'<option value="'+esc(c.slug)+'" '+(c.slug===selected?"selected":"")+'>'+esc(c.name)+(c.is_active?"":" (hidden)")+'</option>').join("");
   $("productCategoryFilter").innerHTML='<option value="">All categories</option>'+categories.map(c=>'<option value="'+esc(c.slug)+'">'+esc(c.name)+'</option>').join("");
  }
  function render(){
   const search=String($("productSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),cat=$("productCategoryFilter")?.value||"",state=$("productVisibilityFilter")?.value||"";
   const rows=products.filter(p=>(!search||[p.name,p.slug,p.category,p.short_description].join(" ").toLowerCase().includes(search))&&(!cat||p.category_slug===cat)&&(!state||(state==="visible"?p.is_active:!p.is_active)));
   $("productTableBody").innerHTML=rows.length?rows.map(p=>'<tr><td><div style="display:flex;align-items:center;gap:10px">'+(p.image_url?'<img class="hf-thumb" src="'+esc(p.image_url)+'" alt="" loading="lazy">':'<span class="hf-thumb hf-thumb-empty">◇</span>')+'<span><strong>'+esc(p.name)+'</strong><small>/'+esc(p.slug)+'</small></span></div></td><td>'+esc(p.category||"—")+'</td><td><strong>'+esc(p.display_price||money(p.price))+'</strong><small>'+esc(p.unit_type||"piece")+'</small></td><td>'+(p.stock_quantity===null||p.stock_quantity===undefined?'<span class="hf-status">Not tracked</span>':Number(p.stock_quantity)<=5?'<span class="hf-status hf-status-pending">'+esc(p.stock_quantity)+' left</span>':'<span class="hf-status hf-status-confirmed">'+esc(p.stock_quantity)+' in stock</span>')+'</td><td>'+makeStatus(p.is_active?"visible":"hidden")+(p.is_featured?' <span class="hf-status hf-status-review">Featured</span>':"")+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-product="'+esc(p.id)+'">Edit</button><button class="hf-button '+(p.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-product="'+esc(p.id)+'">'+(p.is_active?"Hide":"Restore")+'</button></div></td></tr>').join(""):'<tr><td colspan="6">'+makeEmpty("No products found","Try a different search or add a product.")+'</td></tr>';
   $("productsCount").textContent=products.length.toLocaleString("en-BD");$("productsVisibleCount").textContent=products.filter(p=>p.is_active).length.toLocaleString("en-BD");$("productsHiddenCount").textContent=products.filter(p=>!p.is_active).length.toLocaleString("en-BD");$("categoriesCount").textContent=categories.length.toLocaleString("en-BD");
   $("categoryTableBody").innerHTML=categories.length?categories.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong><small>'+esc(c.slug)+'</small></td><td>'+products.filter(p=>p.category_slug===c.slug&&p.is_active).length+'</td><td>'+makeStatus(c.is_active?"visible":"hidden")+'</td><td>'+esc(c.sort_order??0)+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-category="'+esc(c.id)+'">Edit</button><button class="hf-button '+(c.is_active?"hf-button-danger":"hf-button-success")+' hf-button-small" data-toggle-category="'+esc(c.id)+'">'+(c.is_active?"Hide":"Restore")+'</button></div></td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No categories","Add a category before creating products.")+'</td></tr>';
  }
  async function refresh(){[products,categories]=await Promise.all([fetchProducts(),fetchCategories()]);fillCategories();render();}
  function openProduct(p=null){
   $("productForm").reset();$("productId").value=p?.id||"";$("productName").value=p?.name||"";$("productSlug").value=p?.slug||"";$("productSlug").readOnly=!!p;$("productSlug").dataset.edited=p?"1":"";$("productCategorySelect").value=p?.category_slug||"";$("productPrice").value=p?.price??"";$("productUnit").value=p?.unit_type||"piece";$("productDisplayPrice").value=p?.display_price||"";$("productImageUrl").value=p?.image_url||"";$("productShortDescription").value=p?.short_description||"";$("productFullDescription").value=p?.full_description||p?.description||"";$("productStock").value=p?.stock_quantity??"";$("productSortOrder").value=p?.sort_order??0;$("productSeoTitle").value=p?.seo_title||"";$("productSeoDescription").value=p?.seo_description||"";$("productActive").checked=p?.is_active??true;$("productFeatured").checked=p?.is_featured??false;$("productFormError").textContent="";$("productDialogTitle").textContent=p?"Edit product":"Add a new product";
   const preview=$("productImagePreview");if(p?.image_url){preview.src=p.image_url;preview.hidden=false;}else{preview.removeAttribute("src");preview.hidden=true;}
   $("productDialog").showModal();
  }
  $("addProductBtn")?.addEventListener("click",()=>openProduct());
  $("addCategoryBtn")?.addEventListener("click",()=>openCategory());
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
    const payload={name,slug,category:category.name,category_slug:category.slug,price,unit_type:unit,display_price:$("productDisplayPrice").value.trim()||("৳"+price.toLocaleString("en-BD")+" / "+unit),image_url:imageUrl||null,short_description:$("productShortDescription").value.trim(),full_description:$("productFullDescription").value.trim(),stock_quantity:$("productStock").value===""?null:Number($("productStock").value),is_active:$("productActive").checked,is_featured:$("productFeatured").checked,sort_order:parseInt($("productSortOrder").value||"0",10)||0,seo_title:$("productSeoTitle").value.trim()||null,seo_description:$("productSeoDescription").value.trim()||null,cms_managed:true};
    if(!name)throw new Error("Product name is required.");
    if(id){const {error}=await client.from("products").update(payload).eq("id",id);if(error)throw error;await audit("product_updated","product",id,"Product details updated",{slug});}
    else{payload.cms_created=true;const {data,error}=await client.from("products").insert(payload).select("id").single();if(error)throw error;await audit("product_created","product",data.id,"New product created",{slug});}
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
  let profiles=[],orders=[];
  function render(){
   const search=String($("customerSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim();
   const rows=profiles.filter(p=>!search||[p.full_name,p.phone,p.user_id].join(" ").toLowerCase().includes(search));
   $("customersTableBody").innerHTML=rows.length?rows.map(p=>{const own=orders.filter(o=>(p.phone&&String(o.customer_phone||"").replace(/\D/g,"")===String(p.phone).replace(/\D/g,""))||(p.full_name&&String(o.customer_name||"").trim().toLowerCase()===String(p.full_name).trim().toLowerCase()));return '<tr><td><strong>'+esc(p.full_name||"Name not provided")+'</strong><small>'+esc(String(p.user_id||"").slice(0,10))+'</small></td><td>'+esc(p.phone||"—")+'</td><td>'+dateOnly(p.created_at)+'</td><td>'+own.length+'</td><td>'+money(own.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0))+'<small>Order value, not actual collected income</small></td><td><button class="hf-button hf-button-secondary hf-button-small" data-customer-id="'+esc(p.user_id)+'">Order history</button></td></tr>';}).join(""):'<tr><td colspan="6">'+makeEmpty("No matching customer profiles","Try a different name or phone number.")+'</td></tr>';
   $("customerCount").textContent=rows.length.toLocaleString("en-BD");$("customerOrdersCount").textContent=orders.length.toLocaleString("en-BD");
  }
  async function refresh(){
   const res=await Promise.all([
    signedQuery(client.from("customer_profiles").select("user_id,full_name,phone,created_at,updated_at").order("created_at",{ascending:false}).limit(1000)),
    fetchOrders(null,5000)
   ]);profiles=res[0];orders=res[1];render();
  }
  $("customerSearch")?.addEventListener("input",render);$("globalSearch")?.addEventListener("input",render);
  $("customersTableBody")?.addEventListener("click",e=>{
   const btn=e.target.closest("[data-customer-id]");if(!btn)return;
   const p=profiles.find(x=>x.user_id===btn.dataset.customerId);if(!p)return;
   const own=orders.filter(o=>(p.phone&&String(o.customer_phone||"").replace(/\D/g,"")===String(p.phone).replace(/\D/g,""))||(p.full_name&&String(o.customer_name||"").trim().toLowerCase()===String(p.full_name).trim().toLowerCase()));
   $("customerDetailTitle").textContent=p.full_name||"Customer profile";
   $("customerDetailContent").innerHTML='<p><strong>Profile ID:</strong> '+esc(p.user_id)+'</p><p><strong>Phone:</strong> '+esc(p.phone||"Not provided")+'</p><p><strong>Registered:</strong> '+dateTime(p.created_at)+'</p><p><strong>Matched email-based orders:</strong> '+own.length+'</p><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>'+((own.map(o=>'<tr><td>'+esc(o.order_number||String(o.id).slice(0,8))+'</td><td>'+dateOnly(o.ordered_at)+'</td><td>'+money(o.total)+'</td><td>'+makeStatus(o.status)+'</td></tr>').join(""))||'<tr><td colspan="4">No email-linked order found.</td></tr>')+'</tbody></table></div><p class="hf-data-note">Order-to-profile matching depends on email being available in the current records; this may not include every order.</p>';
   $("customerDialog").showModal();
  });
  $("closeCustomerDialog")?.addEventListener("click",()=>$("customerDialog").close());
  await refresh();attachRefresh(refresh);
 }
 async function initFinance(){
  let entries=[],orders=[];
  function totals(){
   const active=entries.filter(e=>e.status==="confirmed"),income=active.filter(e=>e.entry_type==="income").reduce((s,e)=>s+Number(e.amount||0),0),expense=active.filter(e=>e.entry_type==="expense").reduce((s,e)=>s+Number(e.amount||0),0);
   $("financeIncomeTotal").textContent=money(income);$("financeExpenseTotal").textContent=money(expense);$("financeNetTotal").textContent=money(income-expense);$("financePendingCount").textContent=entries.filter(e=>e.status==="draft").length.toLocaleString("en-BD");
   const cats=groupBy(active.filter(e=>e.entry_type==="expense"),e=>e.category);
   drawChart("financeExpenseChart",{type:"doughnut",data:{labels:cats.map(x=>x.label),datasets:[{data:cats.map(x=>entries.filter(e=>e.status==="confirmed"&&e.entry_type==="expense"&&e.category===x.label).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:colorSet,borderColor:"#fffdf9",borderWidth:3,hoverOffset:6}]},options:{cutout:"62%",plugins:{legend:{position:"bottom"}}}});
   const monthKeys=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);monthKeys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
   drawChart("financeTrendChart",{type:"bar",data:{labels:monthKeys.map(k=>{const [y,m]=k.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleDateString("en-BD",{month:"short",year:"2-digit"});}),datasets:[
    {label:"Confirmed income records",data:monthKeys.map(k=>active.filter(e=>e.entry_type==="income"&&String(e.entry_date).startsWith(k)).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:palette.green,borderRadius:6},
    {label:"Confirmed expense records",data:monthKeys.map(k=>active.filter(e=>e.entry_type==="expense"&&String(e.entry_date).startsWith(k)).reduce((s,e)=>s+Number(e.amount||0),0)),backgroundColor:palette.orange,borderRadius:6}
   ]},options:{scales:{x:{ticks:{color:"#858293"},grid:{display:false}},y:{beginAtZero:true,ticks:{color:"#858293",callback:v=>"৳"+Number(v).toLocaleString("en-BD")},grid:{color:"#eeeae2"}}},plugins:{legend:{position:"bottom"}}}});
  }
  function render(){
   const search=String($("financeSearch")?.value||$("globalSearch")?.value||"").toLowerCase().trim(),type=$("financeTypeFilter")?.value||"",status=$("financeStatusFilter")?.value||"";
   const rows=entries.filter(e=>(!type||e.entry_type===type)&&(!status||e.status===status)&&(!search||[e.category,e.description,e.reference,e.status].join(" ").toLowerCase().includes(search)));
   $("financeTableBody").innerHTML=rows.length?rows.map(e=>'<tr><td>'+dateOnly(e.entry_date)+'</td><td>'+makeStatus(e.entry_type)+'</td><td><strong>'+esc(e.category)+'</strong><small>'+esc(e.description||"No description")+'</small></td><td><strong>'+money(e.amount)+'</strong></td><td>'+makeStatus(e.status)+'</td><td>'+esc(e.reference||"—")+'</td><td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" data-edit-finance="'+esc(e.id)+'">Edit</button>'+(e.status!=="void"?'<button class="hf-button hf-button-danger hf-button-small" data-void-finance="'+esc(e.id)+'">Void</button>':'')+'</div></td></tr>').join(""):'<tr><td colspan="7">'+makeEmpty("No matching entries","Add an income or expense record, or change your filters.")+'</td></tr>';
   totals();
  }
  async function refresh(){[entries,orders]=await Promise.all([fetchFinance(null,3000),fetchOrders(null,1000)]);const sel=$("financeOrderId");if(sel)sel.innerHTML='<option value="">No linked order</option>'+orders.slice(0,300).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.order_number||String(o.id).slice(0,8))+' · '+money(o.total)+'</option>').join("");render();}
  function openEntry(e=null){
   $("financeForm").reset();$("financeId").value=e?.id||"";$("financeEntryType").value=e?.entry_type||"expense";$("financeCategory").value=e?.category||"Supplies";$("financeAmount").value=e?.amount??"";$("financeDate").value=e?.entry_date||todayISO();$("financeDescription").value=e?.description||"";$("financeReference").value=e?.reference||"";$("financeStatus").value=e?.status||"draft";$("financeOrderId").value=e?.related_order_id||"";$("financeFormError").textContent="";$("financeDialogTitle").textContent=e?"Edit finance entry":"Record an entry";$("financeDialog").showModal();
  }
  $("addFinanceEntryBtn")?.addEventListener("click",()=>openEntry());
  $("financeForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const id=$("financeId").value,button=$("saveFinanceBtn");button.disabled=true;$("financeFormError").textContent="";
   try{
    const amount=Number($("financeAmount").value),category=$("financeCategory").value.trim(),date=$("financeDate").value;
    if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter an amount greater than zero.");
    if(!category)throw new Error("Choose a category.");if(!date)throw new Error("Choose an entry date.");
    const payload={entry_type:$("financeEntryType").value,category,amount,entry_date:date,description:$("financeDescription").value.trim(),reference:$("financeReference").value.trim()||null,status:$("financeStatus").value,related_order_id:$("financeOrderId").value||null};
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
    rows=events.map(e=>({occurred_at:e.occurred_at,event_name:e.event_name,page_path:e.page_path,page_title:e.page_title,item_name:e.item_name,item_category:e.item_category,value:e.value,quantity:e.quantity,source:e.source,medium:e.medium,campaign:e.campaign}));
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
  $("includePersonalData")?.addEventListener("change",()=>{report.rows=[];});
  bindRangeControls(()=>buildReport());await buildReport();attachRefresh(buildReport);
 }
 async function initSettings(){
  async function healthCheck(){
   const targets=[["Products","products"],["Categories","categories"],["Orders","orders"],["Tracking events","analytics_events"],["Homepage content","site_content_blocks"],["Finance entries","admin_finance_entries"],["Activity log","admin_activity_log"]];
   $("connectionStatus").textContent="Checking database access…";
   const result=await Promise.all(targets.map(async item=>{try{const r=await client.from(item[1]).select("id",{count:"exact",head:true});return {name:item[0],table:item[1],count:r.count,error:r.error?.message||null};}catch(err){return {name:item[0],table:item[1],error:err.message||"Connection error"};}}));
   $("systemHealthBody").innerHTML=result.map(r=>'<tr><td><strong>'+esc(r.name)+'</strong><small>'+esc(r.table)+'</small></td><td>'+(r.error?'<span class="hf-status hf-status-cancelled">Needs attention</span>':'<span class="hf-status hf-status-confirmed">Connected</span>')+'</td><td>'+(r.error?esc(r.error):Number(r.count||0).toLocaleString("en-BD")+" records")+'</td></tr>').join("");
   const fails=result.filter(x=>x.error);$("connectionStatus").textContent=fails.length?fails.length+" check(s) need attention":"All checked data connections are responding.";
   $("connectionStatus").className="hf-banner "+(fails.length?"":"hf-banner-success");
   return result;
  }
  async function loadActivity(){
   const rows=await signedQuery(client.from("admin_activity_log").select("id,actor_email,action,entity_type,entity_id,summary,created_at").order("created_at",{ascending:false}).limit(60));
   $("activityLogBody").innerHTML=rows.length?rows.map(r=>'<tr><td>'+dateTime(r.created_at)+'</td><td><strong>'+esc(r.action.replace(/_/g," "))+'</strong><small>'+esc(r.actor_email)+'</small></td><td>'+esc(r.entity_type)+(r.entity_id?'<small>'+esc(String(r.entity_id).slice(0,14))+'</small>':"")+'</td><td>'+esc(r.summary||"—")+'</td></tr>').join(""):'<tr><td colspan="4">'+makeEmpty("No activity has been recorded yet","Successful changes made from the new admin pages will be logged here.")+'</td></tr>';
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
 $("globalSearch")?.addEventListener("input",e=>{
  const q=String(e.target.value||"").toLowerCase().trim();
  const table=document.querySelector("#adminMain .hf-table tbody");
  if(table){table.querySelectorAll("tr").forEach(row=>{row.hidden=!!q&&!row.textContent.toLowerCase().includes(q);});}
 });
 doInit();
});
})();
(() => {
"use strict";
try{
 const savedTheme=localStorage.getItem("hf_admin_theme");
 document.documentElement.dataset.adminTheme=savedTheme==="light"?"light":"dark";
}catch(_themeError){document.documentElement.dataset.adminTheme="dark";}
const SUPABASE_URL="https://qfwvrcfkrsydycbfjsxf.supabase.co";
const SUPABASE_KEY="sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const ADMIN_EMAIL="halalfoodbd.official@gmail.com";
const adminApp=document.getElementById("adminApp");
const gate=document.getElementById("authGate");
const initialContent=document.getElementById("pageContent")?.innerHTML||"";
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const money=v=>"৳"+Number(v||0).toLocaleString("en-BD",{minimumFractionDigits:0,maximumFractionDigits:2});
const shortNum=v=>Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:1,notation:Number(v)>=10000?"compact":"standard"});
const dateTime=v=>v?new Date(v).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"}):"—";
const dateOnly=v=>v?new Date(String(v).length===10?String(v)+"T00:00:00":v).toLocaleDateString("en-BD",{year:"numeric",month:"short",day:"numeric"}):"—";
const pageName=document.body.dataset.page||"overview";
let currentUser=null;
let toastTimer=null;
function toast(message,type="success"){
 let node=document.getElementById("hfToast");
 if(!node){node=document.createElement("div");node.id="hfToast";node.className="hf-toast";document.body.appendChild(node);}
 node.textContent=message;node.className="hf-toast show "+type;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("show"),4500);
}
async function audit(action,entityType="system",entityId=null,summary="",metadata={}){
 try{
  const result=await client.from("admin_activity_log").insert({actor_email:ADMIN_EMAIL,action,entity_type:entityType,entity_id:entityId?String(entityId):null,summary,metadata});
  if(result.error)console.warn("Activity log could not be saved",result.error.message);
 }catch(err){console.warn("Activity log exception",err)}
}
async function signedQuery(query){const result=await query;if(result.error)throw result.error;return result.data??[];}
function downloadFile(name,content,type){
 const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function csvText(rows){
 if(!rows.length)return "\uFEFFNo data available\r\n";
 const cols=Object.keys(rows[0]);
 const cell=v=>{let text=String(v??"");if(/^[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 return "\uFEFF"+[cols.map(cell).join(","),...rows.map(r=>cols.map(k=>cell(r[k])).join(","))].join("\r\n");
}
function slugify(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);}
function dayISO(days){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-Math.max(0,Number(days)-1));return d.toISOString();}
function dateRangeFromControls(){
 const period=document.getElementById("rangeSelect")?.value||"30";
 const startValue=document.getElementById("dateFrom")?.value;
 const endValue=document.getElementById("dateTo")?.value;
 if(period==="custom"&&startValue&&endValue&&startValue<=endValue){
  const from=new Date(startValue+"T00:00:00");const to=new Date(endValue+"T23:59:59.999");
  return {from:from.toISOString(),to:to.toISOString(),days:Math.max(1,Math.ceil((to-from)/86400000)+1),label:startValue+" to "+endValue};
 }
 if(period==="all")return {from:null,to:null,days:null,label:"All available time"};
 const days=Number(period)||30;const now=new Date();
 return {from:dayISO(days),to:now.toISOString(),days,label:"Last "+days+" days"};
}
function rangeQuery(query,column,range){
 if(range?.from)query=query.gte(column,range.from);
 if(range?.to)query=query.lte(column,range.to);
 return query;
}
function showTableMessage(id,message,error=false){
 const el=document.getElementById(id);if(!el)return;
 el.textContent=message;el.className="hf-data-note"+(error?" hf-error":"");
}
function statusClass(v){return "hf-status hf-status-"+String(v||"unknown").toLowerCase().replace(/[^a-z0-9-]/g,"-");}
function makeStatus(v){return '<span class="'+statusClass(v)+'">'+esc(v||"unknown")+'</span>';}
function makeEmpty(title,description){return '<div class="hf-empty"><strong>'+esc(title)+'</strong>'+esc(description||"")+'</div>';}
function groupBy(rows,keyFn){
 const map=new Map();rows.forEach(row=>{const key=keyFn(row);map.set(key,(map.get(key)||0)+1)});return [...map.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
}
function dateKey(v){const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10);}
function lastDateKeys(days){
 const keys=[];const today=new Date();today.setHours(0,0,0,0);
 for(let i=Math.max(1,days)-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);keys.push(d.toISOString().slice(0,10));}
 return keys;
}
const palette={navy:"#C9D5E6",orange:"#F59E0B",blue:"#4F7CFF",green:"#10B981",purple:"#9B6DFF",yellow:"#FBBF24",red:"#F05274",teal:"#06B6D4",cream:"#111C2E",muted:"#96A6BE"};
const colorSet=[palette.purple,palette.blue,palette.teal,palette.green,palette.yellow,palette.red,"#E879F9","#818CF8","#F97316","#38BDF8"];
const charts={};
function chartTheme(){
 const light=document.documentElement.dataset.adminTheme==="light";
 return {text:light?"#2B2A3D":"#C9D5E6",muted:light?"#737487":"#A6B4C8",grid:light?"#E5E0D6":"#2A3A52",surface:light?"#FFFDF8":"#111C2E",border:light?"#DED8CD":"#2D405A"};
}
if(window.Chart){
 Chart.defaults.color=palette.navy;
 Chart.defaults.font.family='Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif';
 Chart.defaults.font.size=11;
 Chart.defaults.plugins.legend.labels.usePointStyle=true;
}
function drawChart(id,config){
 const canvas=document.getElementById(id);if(!canvas||!window.Chart)return;
 if(charts[id])charts[id].destroy();
 const t=chartTheme();
 const base={responsive:true,maintainAspectRatio:false,animation:{duration:380},plugins:{
  legend:{labels:{color:t.text,usePointStyle:true,boxWidth:9,boxHeight:9,padding:18,font:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',size:11,weight:600}}},
  tooltip:{backgroundColor:"#07101F",titleColor:"#F2F6FF",bodyColor:"#CFD9E8",borderColor:"#344966",borderWidth:1,cornerRadius:10,padding:12,displayColors:true,titleFont:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',weight:700},bodyFont:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'}}
 }};
 const opts={...base,...config.options,plugins:{...base.plugins,...(config.options?.plugins||{})}};
 charts[id]=new Chart(canvas,{...config,options:opts});
 window.HFAdminLanguage?.translateChart?.(charts[id]);
 return charts[id];
}
function syncChartsForTheme(){
 const t=chartTheme();
 Object.values(charts).forEach(chart=>{
  if(chart.options.plugins?.legend?.labels)chart.options.plugins.legend.labels.color=t.text;
  if(chart.options.scales)Object.values(chart.options.scales).forEach(scale=>{
   if(scale.ticks)scale.ticks.color=t.muted;
   if(scale.grid&&scale.grid.display!==false)scale.grid.color=t.grid;
   if(scale.border)scale.border.color=t.border;
  });
  if(["pie","doughnut"].includes(chart.config.type))chart.data.datasets.forEach(dataset=>{dataset.borderColor=t.surface;});
  chart.update("none");
 });
}
async function paginateQuery(buildQuery,limit=1000){
 const rows=[],pageSize=1000;
 for(let offset=0;offset<limit;offset+=pageSize){
  const requested=Math.min(pageSize,limit-offset);
  const page=await signedQuery(buildQuery().range(offset,offset+requested-1));
  rows.push(...page);
  if(page.length<requested)break;
 }
 return rows;
}
async function fetchOrders(range=null,limit=5000){
 return paginateQuery(()=>{
  let q=client.from("orders").select("id,order_number,customer_id,customer_name,customer_phone,customer_email,delivery_address,subtotal,delivery_charge,delivery_zone,payment_method,total,status,cancellation_reason,source,notes,ordered_at,updated_at,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url)").order("ordered_at",{ascending:false}).order("id",{ascending:true});
  if(range)q=rangeQuery(q,"ordered_at",range);
  return q;
 },limit);
}
async function fetchEvents(range=null,limit=15000){
 return paginateQuery(()=>{
  let q=client.from("analytics_events").select("id,event_name,occurred_at,page_path,page_title,session_id,anonymous_id,item_id,item_name,item_category,value,quantity,search_term,source,medium,campaign,metadata").order("occurred_at",{ascending:false}).order("id",{ascending:false});
  if(range)q=rangeQuery(q,"occurred_at",range);
  return q;
 },limit);
}
async function fetchProducts(limit=2000){
 const products=await paginateQuery(()=>client.from("products").select("id,name,slug,category,category_slug,price,display_price,unit_type,image_url,stock_quantity,is_active,is_featured,sort_order,short_description,full_description,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),limit);
 const costs=await paginateQuery(()=>client.from("admin_product_costs").select("product_id,cost_price,packaging_cost,low_stock_threshold,updated_by,updated_at").order("product_id",{ascending:true}),Math.max(limit,1000));
 const costById=new Map(costs.map(row=>[row.product_id,row]));
 return products.map(product=>{
  const cost=costById.get(product.id);
  return {...product,cost_price:cost?.cost_price??null,packaging_cost:Number(cost?.packaging_cost??0),low_stock_threshold:Number(cost?.low_stock_threshold??5),cost_updated_by:cost?.updated_by??null,cost_updated_at:cost?.updated_at??null};
 });
}
async function fetchCategories(){
 return paginateQuery(()=>client.from("categories").select("id,name,slug,description,image_url,is_active,sort_order,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),500);
}
async function fetchPosts(limit=1000){
 return paginateQuery(()=>client.from("blog_posts").select("id,title,slug,excerpt,content,featured_image_url,category,status,published_at,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("updated_at",{ascending:false}).order("id",{ascending:true}),limit);
}
async function fetchFinance(range=null,limit=3000){
 return paginateQuery(()=>{
  let q=client.from("admin_finance_entries").select("id,entry_type,category,amount,entry_date,description,reference,status,related_order_id,created_by,created_at,updated_at").order("entry_date",{ascending:false}).order("created_at",{ascending:false});
  if(range)q=rangeQuery(q,"entry_date",{from:range.from?range.from.slice(0,10):null,to:range.to?range.to.slice(0,10):null});
  return q;
 },limit);
}
function shellIcon(name){
 const paths={
  overview:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  analytics:'<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
  orders:'<path d="M21 8.5 12 13 3 8.5"/><path d="M12 22V13"/><path d="m3.3 7.2 8-4a1.6 1.6 0 0 1 1.4 0l8 4A1.6 1.6 0 0 1 21.5 8.6v7.8a1.6 1.6 0 0 1-.8 1.4l-8 4.1a1.6 1.6 0 0 1-1.4 0l-8-4.1a1.6 1.6 0 0 1-.8-1.4V8.6a1.6 1.6 0 0 1 .8-1.4Z"/>',
  operations:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 11l2.5 2.5L16 8"/><path d="M8 17h8"/>',
  products:'<path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z"/><path d="m3.5 7.7 8.5 4.4 8.5-4.4M12 12v9"/><path d="m7.5 5.3 9 4.6"/>',
  content:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  messages:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 11h9M8 15h6"/>',
  finance:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M7 5V3h10v2M16 14h2"/>',
  reports:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 17v-3M12 17v-6M16 17v-4"/>',
  settings:'<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  moon:'<path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.3 1.2-1.9 1.6-1.9 3.3M12 17.4v.1"/>',
  logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>'
 };
 return '<svg class="hf-shell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.overview)+'</svg>';
}
function makeShell(){
 adminApp.classList.add("admin-app");
 const activePage=pageName==="messenger"?"messages":pageName;
 const menuGroups=[
  {label:"WORKSPACE",items:[["overview","overview","Overview"]]},
  {label:"STORE MANAGEMENT",items:[["orders","orders","Orders"],["operations","operations","Operations"],["products","products","Products"],["content","content","Website Content"]]},
  {label:"CUSTOMERS & MESSAGES",items:[["messages","messages","Messages"],["customers","customers","Customers"]]},
  {label:"INSIGHTS & FINANCE",items:[["analytics","analytics","Analytics"],["finance","finance","Finance & Cash Flow"],["reports","reports","Reports"]]},
  {label:"SYSTEM",items:[["settings","settings","Settings"]]}
 ];
 const navigation=menuGroups.map(group=>{
  const links=group.items.map(item=>'<a class="admin-nav-link '+(item[0]===activePage?"active":"")+'" href="./'+item[0]+'.html" '+(item[0]===activePage?'aria-current="page"':'')+'><span class="nav-icon">'+shellIcon(item[1])+'</span><span class="admin-nav-text">'+esc(item[2])+'</span></a>').join("");
  return '<section class="admin-nav-group" aria-label="'+esc(group.label)+'"><div class="admin-nav-label">'+esc(group.label)+'</div><div class="admin-nav-links">'+links+'</div></section>';
 }).join("");
 const metadata=currentUser?.user_metadata||{};
 const emailValue=String(currentUser?.email||ADMIN_EMAIL);
 const displayName=String(metadata.full_name||metadata.name||metadata.given_name||emailValue.split("@")[0]||"Admin").trim().slice(0,80);
 const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]||"").join("").toUpperCase()||"HF";
 const avatarCandidate=String(metadata.avatar_url||metadata.picture||"").trim();
 const avatarUrl=/^https:\/\/[^"'<>]+$/i.test(avatarCandidate)?avatarCandidate.slice(0,2048):"";
 const avatarMarkup=avatarUrl
  ? '<img class="admin-account-avatar-image" src="'+esc(avatarUrl)+'" alt="" referrerpolicy="no-referrer"><span class="admin-account-avatar-fallback" hidden>'+esc(initials)+'</span>'
  : '<span class="admin-account-avatar-fallback">'+esc(initials)+'</span>';
 const shell=
  '<aside class="admin-sidebar" id="adminSidebar" aria-label="Primary navigation">'+
   '<a class="admin-brand" href="./overview.html" aria-label="Halal Food admin overview">'+
    '<img src="../images/logo-favicon/halal-food-official-logo.svg" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+
    '<span class="admin-brand-mark" style="display:none" aria-hidden="true">HF</span>'+
    '<span class="admin-brand-copy"><strong>Halal Food</strong><small>Admin Control Center</small></span>'+
   '</a>'+
   '<nav class="admin-sidebar-nav" aria-label="Admin sections">'+navigation+'</nav>'+
   '<div class="admin-sidebar-note"><div class="admin-sidebar-note-head"><span class="admin-test-indicator" aria-hidden="true"></span><strong>Learning &amp; testing project</strong></div><p>Live payments and product deliveries are not enabled.</p></div>'+
  '</aside>'+
  '<button id="adminSidebarBackdrop" class="admin-sidebar-backdrop" type="button" aria-label="Close navigation" hidden></button>'+
  '<div class="admin-frame"><header class="admin-topbar">'+
   '<button id="adminMenuToggle" class="admin-menu-toggle" type="button" aria-label="Open navigation" aria-controls="adminSidebar" aria-expanded="false">'+shellIcon("menu")+'</button>'+
   '<div class="admin-global-search" role="search"><span class="admin-global-search-icon" aria-hidden="true">'+shellIcon("search")+'</span><input id="globalSearch" type="search" autocomplete="off" placeholder="Search this page\'s records…" aria-label="Search records on this page"><kbd class="admin-global-search__shortcut" aria-hidden="true"><span>Ctrl</span><b>K</b></kbd></div>'+
   '<span class="admin-topbar-spacer" aria-hidden="true"></span>'+
   '<div class="admin-topbar-actions">'+
    '<button class="admin-top-button theme-toggle" id="themeToggle" type="button" aria-label="Switch to light theme" title="Switch to light theme" aria-pressed="false"><span class="topbar-button-icon theme-toggle-icon" aria-hidden="true">'+shellIcon("sun")+'</span><span class="topbar-label theme-toggle-label">Light theme</span></button>'+
    '<button class="admin-top-button admin-mode-toggle" id="modeToggle" type="button" title="Switch to advanced view"><span class="topbar-button-icon">'+shellIcon("sliders")+'</span><span class="topbar-label">Advanced view</span></button>'+
    '<button class="admin-top-button admin-help-toggle" id="helpBtn" type="button" title="Open quick guide"><span class="topbar-button-icon">'+shellIcon("help")+'</span><span class="topbar-label">Help</span></button>'+
   '</div>'+
   '<details class="admin-account-menu" id="adminAccountMenu"><summary class="admin-account-chip" aria-label="Open administrator account menu">'+
    '<span class="admin-account-avatar">'+avatarMarkup+'</span><span class="admin-account-meta"><strong>'+esc(displayName)+'</strong><small id="accountEmail">'+esc(emailValue)+'</small></span><span class="admin-account-chevron">'+shellIcon("chevron")+'</span>'+
   '</summary><div class="admin-account-dropdown"><div class="admin-account-dropdown-head"><span class="admin-account-dropdown-kicker">SIGNED IN</span><strong>'+esc(displayName)+'</strong><small>'+esc(emailValue)+'</small></div><a class="admin-account-settings-link" href="./settings.html">'+shellIcon("settings")+'<span>Settings &amp; security</span></a><button id="logoutBtn" class="admin-account-logout" type="button">'+shellIcon("logout")+'<span>Sign out</span></button></div></details>'+
  '</header><main class="admin-main" id="adminMain">'+initialContent+'</main></div>'+
  '<div id="hfToast" class="hf-toast" role="status" aria-live="polite"></div>'+
  '<dialog id="helpDialog" class="hf-dialog"><div class="hf-dialog-inner help-content"><div class="hf-dialog-head"><div><p class="hf-dialog-title-tag">QUICK GUIDE</p><h2>How to use your admin panel</h2><p>Every section is designed for everyday, non-technical use.</p></div><button class="hf-button hf-button-secondary hf-dialog-close" data-close-help type="button" aria-label="Close help">×</button></div><ol><li>Choose a section from the left menu.</li><li>Use the date filters and search boxes to narrow down information.</li><li>Charts are interactive: hover or tap a chart to see values and labels.</li><li>Use Reports to export filtered data. CSV opens in spreadsheets; PDF opens the print dialog where you can choose Save as PDF.</li><li>Finance entries count in summaries only after they are marked Confirmed. Confirm only records you have checked.</li><li>This is a learning/testing storefront. Order value is not proof of collected payment; real delivery and payments are not enabled.</li></ol><div class="hf-dialog-actions"><button class="hf-button hf-button-primary" data-close-help type="button">Got it</button></div></div></dialog>';
 adminApp.innerHTML=shell;
 adminApp.hidden=false;gate.hidden=true;

 const sidebar=document.getElementById("adminSidebar");
 const sidebarBackdrop=document.getElementById("adminSidebarBackdrop");
 const menuToggle=document.getElementById("adminMenuToggle");
 const searchInput=document.getElementById("globalSearch");
 const accountMenu=document.getElementById("adminAccountMenu");
 const avatarImage=adminApp.querySelector(".admin-account-avatar-image");
 avatarImage?.addEventListener("error",()=>{
  avatarImage.hidden=true;
  const fallback=avatarImage.nextElementSibling;
  if(fallback)fallback.hidden=false;
 },{once:true});

 const closeSidebar=(returnFocus=false)=>{
  sidebar.classList.remove("open");
  sidebarBackdrop.hidden=true;
  menuToggle.setAttribute("aria-expanded","false");
  menuToggle.setAttribute("aria-label","Open navigation");
  document.body.classList.remove("admin-sidebar-open");
  if(returnFocus)menuToggle.focus({preventScroll:true});
 };
 const openSidebar=()=>{
  sidebar.classList.add("open");
  sidebarBackdrop.hidden=false;
  menuToggle.setAttribute("aria-expanded","true");
  menuToggle.setAttribute("aria-label","Close navigation");
  document.body.classList.add("admin-sidebar-open");
  sidebar.querySelector(".admin-nav-link")?.focus({preventScroll:true});
 };
 menuToggle?.addEventListener("click",()=>{
  if(sidebar.classList.contains("open"))closeSidebar();else openSidebar();
 });
 sidebarBackdrop?.addEventListener("click",()=>closeSidebar());
 sidebar.querySelectorAll(".admin-nav-link").forEach(link=>link.addEventListener("click",()=>{
  if(window.innerWidth<=900)closeSidebar();
 }));
 window.addEventListener("resize",()=>{if(window.innerWidth>900)closeSidebar();});
 document.addEventListener("keydown",event=>{
  const target=event.target;
  const typing=!!target?.closest?.('input,textarea,select,[contenteditable="true"]');
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
   event.preventDefault();searchInput?.focus();searchInput?.select();return;
  }
  if(event.key==="/"&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!document.querySelector("dialog[open]")){
   event.preventDefault();searchInput?.focus();return;
  }
  if(event.key==="Escape"){
   if(sidebar.classList.contains("open"))closeSidebar(true);
   if(accountMenu?.open)accountMenu.open=false;
  }
 });
 document.addEventListener("click",event=>{
  if(accountMenu?.open&&!accountMenu.contains(event.target))accountMenu.open=false;
 });

 const modeKey="hf_admin_display_mode";
 const themeKey="hf_admin_theme";
 const themeBtn=document.getElementById("themeToggle");
 const applyTheme=(theme)=>{
  const active=theme==="light"?"light":"dark";
  document.documentElement.dataset.adminTheme=active;
  palette.navy=active==="light"?"#2B2A3D":"#C9D5E6";
  palette.muted=active==="light"?"#737487":"#96A6BE";
  palette.cream=active==="light"?"#FFFDF8":"#111C2E";
  if(themeBtn){
   const toLight=active==="dark";
   const label=toLight?"Light theme":"Dark theme";
   themeBtn.innerHTML='<span class="topbar-button-icon theme-toggle-icon" aria-hidden="true">'+shellIcon(toLight?"sun":"moon")+'</span><span class="topbar-label theme-toggle-label">'+label+'</span>';
   themeBtn.setAttribute("aria-label","Switch to "+(toLight?"light":"dark")+" theme");
   themeBtn.setAttribute("title","Switch to "+(toLight?"light":"dark")+" theme");
   themeBtn.setAttribute("aria-pressed",String(active==="light"));
  }
  syncChartsForTheme();
 };
 let savedTheme="dark";
 try{savedTheme=localStorage.getItem(themeKey)||"dark";}catch(_themeReadError){}
 applyTheme(savedTheme);
 themeBtn?.addEventListener("click",()=>{
  const next=document.documentElement.dataset.adminTheme==="light"?"dark":"light";
  try{localStorage.setItem(themeKey,next);}catch(_themeWriteError){}
  applyTheme(next);
 });
 const modeBtn=document.getElementById("modeToggle");
 const applyMode=()=>{
  let advanced=false;
  try{advanced=localStorage.getItem(modeKey)==="advanced";}catch(_modeReadError){}
  adminApp.classList.toggle("simple-mode",!advanced);
  if(modeBtn){
   const action=advanced?"Simple view":"Advanced view";
   modeBtn.innerHTML='<span class="topbar-button-icon">'+shellIcon("sliders")+'</span><span class="topbar-label">'+action+'</span>';
   modeBtn.setAttribute("aria-label","Switch to "+(advanced?"simple":"advanced")+" view");
   modeBtn.title="Switch to "+(advanced?"simple":"advanced")+" view";
  }
 };
 applyMode();
 modeBtn?.addEventListener("click",()=>{
  const advanced=adminApp.classList.contains("simple-mode");
  try{localStorage.setItem(modeKey,advanced?"advanced":"simple");}catch(_modeWriteError){}
  applyMode();
 });
 document.getElementById("helpBtn")?.addEventListener("click",()=>document.getElementById("helpDialog")?.showModal());
 document.querySelectorAll("[data-close-help]").forEach(button=>button.addEventListener("click",()=>document.getElementById("helpDialog")?.close()));
 document.getElementById("logoutBtn")?.addEventListener("click",async()=>{
  if(!confirm("Sign out of the Halal Food admin panel?"))return;
  await client.auth.signOut();
  location.replace("./index.html");
 });
 const email=document.getElementById("accountEmail");
 if(email)email.textContent=emailValue;
}

window.HFAdminReady=(async()=>{
 try{
  const {data,error}=await client.auth.getSession();
  if(error||!data?.session){location.replace("./index.html");return null;}
  const email=String(data.session.user?.email||"").toLowerCase();
  if(email!==ADMIN_EMAIL){await client.auth.signOut();location.replace("./index.html");return null;}
  const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal.error||aal.data?.currentLevel!=="aal2"){location.replace("./index.html");return null;}
  const user=await client.auth.getUser();currentUser=user.data?.user||data.session.user;
  makeShell();
  window.HFAdmin={client,ADMIN_EMAIL,esc,money,shortNum,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,slugify,dayISO,dateRangeFromControls,rangeQuery,showTableMessage,statusClass,makeStatus,makeEmpty,groupBy,dateKey,lastDateKeys,fetchOrders,fetchEvents,fetchProducts,fetchCategories,fetchPosts,fetchFinance,palette,colorSet,chartTheme,drawChart,charts};
  return window.HFAdmin;
 }catch(err){console.error("Admin access check failed",err);gate.innerHTML='<div class="auth-gate-card"><strong>Secure sign-in could not be verified</strong><p>Please refresh and sign in again. No admin data was loaded.</p><p style="margin-top:14px"><a href="./index.html" class="hf-button hf-button-primary">Return to sign-in</a></p></div>';return null;}
})();
client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"&&!location.pathname.endsWith("/index.html"))location.replace("./index.html");});
})();
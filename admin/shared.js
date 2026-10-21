(() => {
"use strict";
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
const palette={navy:"#2B2A3D",orange:"#C97B3D",blue:"#5B86B5",green:"#4A9870",purple:"#9276C4",yellow:"#D6A34D",red:"#C96A5D",teal:"#539AA1",cream:"#F2F0EA",muted:"#9392A0"};
const colorSet=[palette.orange,palette.blue,palette.green,palette.purple,palette.yellow,palette.red,palette.teal,"#9A7C6B","#7E8FB8","#B6A06B"];
const charts={};
function drawChart(id,config){
 const canvas=document.getElementById(id);if(!canvas||!window.Chart)return;
 if(charts[id])charts[id].destroy();
 const base={responsive:true,maintainAspectRatio:false,animation:{duration:450},plugins:{legend:{labels:{color:palette.navy,usePointStyle:true,boxWidth:8,padding:16,font:{family:"Inter, system-ui",size:11}}},tooltip:{backgroundColor:palette.navy,padding:11,displayColors:true,titleFont:{family:"Inter, system-ui"},bodyFont:{family:"Inter, system-ui"}}}};
 const opts={...base,...config.options,plugins:{...base.plugins,...(config.options?.plugins||{})}};
 charts[id]=new Chart(canvas,{...config,options:opts});
 return charts[id];
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
  let q=client.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,subtotal,delivery_charge,delivery_zone,payment_method,total,status,source,notes,ordered_at,updated_at,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url)").order("ordered_at",{ascending:false}).order("id",{ascending:true});
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
 return paginateQuery(()=>client.from("products").select("id,name,slug,category,category_slug,price,display_price,unit_type,image_url,stock_quantity,is_active,is_featured,sort_order,short_description,full_description,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),limit);
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
function makeShell(){
 const menu=[
  ["overview","⌂","Overview"],["analytics","◷","Analytics"],["orders","▣","Orders"],["products","◇","Products"],["content","▤","Website Content"],["customers","♙","Customers"],["finance","৳","Finance"],["reports","⇩","Reports"],["settings","⚙","Settings"]
 ];
 const links=menu.map(x=>'<a class="admin-nav-link '+(x[0]===pageName?"active":"")+'" href="./'+x[0]+'.html" '+(x[0]===pageName?'aria-current="page"':'')+'><span class="nav-icon">'+x[1]+'</span><span>'+x[2]+'</span></a>').join("");
 const shell='<aside class="admin-sidebar" id="adminSidebar">'+
 '<a class="admin-brand" href="./overview.html"><img src="../images/logo-favicon/halal-food-official-logo.svg" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span class="admin-brand-mark" style="display:none">HF</span><span><strong>Halal Food</strong><small>Admin Control Center</small></span></a>'+
 '<div class="admin-nav-group"><div class="admin-nav-label">WORKSPACE</div>'+links+'</div>'+
 '<div class="admin-sidebar-note"><strong>Easy Mode + Advanced Tools</strong>Clear guidance for everyday tasks, with deeper reports when you need them.</div></aside>'+
 '<div class="admin-frame"><header class="admin-topbar"><button id="adminMenuToggle" class="admin-menu-toggle" type="button" aria-label="Open navigation">☰</button>'+
 '<div class="admin-global-search"><input id="globalSearch" type="search" placeholder="Search this page…" aria-label="Search current page"></div><span class="admin-topbar-spacer"></span>'+
 '<button class="admin-top-button" id="modeToggle" type="button">Advanced view</button><button class="admin-top-button" id="helpBtn" type="button">? Help</button><button class="admin-top-button" id="logoutBtn" type="button">Sign out</button>'+
 '<div class="admin-account-chip"><span class="admin-account-avatar">HF</span><span class="admin-account-meta"><strong>Admin</strong><small id="accountEmail">Authorized account</small></span></div></header>'+
 '<main class="admin-main" id="adminMain">'+initialContent+'</main></div>'+
 '<div id="hfToast" class="hf-toast" role="status" aria-live="polite"></div>'+
 '<dialog id="helpDialog" class="hf-dialog"><div class="hf-dialog-inner help-content"><div class="hf-dialog-head"><div><p class="hf-dialog-title-tag">QUICK GUIDE</p><h2>How to use your admin panel</h2><p>Every section is designed for everyday, non-technical use.</p></div><button class="hf-button hf-button-secondary hf-dialog-close" data-close-help type="button" aria-label="Close help">×</button></div><ol><li>Choose a section from the left menu.</li><li>Use the date filters and search boxes to narrow down information.</li><li>Charts are interactive: hover or tap a chart to see values and labels.</li><li>Use Reports to export filtered data. CSV opens in spreadsheets; PDF opens the print dialog where you can choose Save as PDF.</li><li>Finance entries count in summaries only after they are marked Confirmed. Confirm only records you have checked.</li><li>This is a learning/testing storefront. Order value is not proof of collected payment; real delivery and payments are not enabled.</li></ol><div class="hf-dialog-actions"><button class="hf-button hf-button-primary" data-close-help type="button">Got it</button></div></div></dialog>';
 adminApp.innerHTML=shell;
 adminApp.hidden=false;gate.hidden=true;
 const sidebar=document.getElementById("adminSidebar");
 const modeKey="hf_admin_display_mode";
 const modeBtn=document.getElementById("modeToggle");
 const applyMode=()=>{const advanced=localStorage.getItem(modeKey)==="advanced";adminApp.classList.toggle("simple-mode",!advanced);if(modeBtn)modeBtn.textContent=advanced?"Simple view":"Advanced view";};
 applyMode();
 modeBtn?.addEventListener("click",()=>{const advanced=adminApp.classList.contains("simple-mode");localStorage.setItem(modeKey,advanced?"advanced":"simple");applyMode();});
 document.getElementById("adminMenuToggle")?.addEventListener("click",()=>sidebar.classList.toggle("open"));
 document.getElementById("adminMain")?.addEventListener("click",e=>{if(window.innerWidth<=900&&e.target.closest("a"))sidebar.classList.remove("open");});
 document.getElementById("helpBtn")?.addEventListener("click",()=>document.getElementById("helpDialog")?.showModal());
 document.querySelectorAll("[data-close-help]").forEach(b=>b.addEventListener("click",()=>document.getElementById("helpDialog")?.close()));
 document.getElementById("logoutBtn")?.addEventListener("click",async()=>{if(!confirm("Sign out of the Halal Food admin panel?"))return;await client.auth.signOut();location.replace("./index.html");});
 const email=document.getElementById("accountEmail");if(email)email.textContent=currentUser?.email||ADMIN_EMAIL;
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
  window.HFAdmin={client,ADMIN_EMAIL,esc,money,shortNum,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,slugify,dayISO,dateRangeFromControls,rangeQuery,fetchOrders,fetchEvents,fetchProducts,fetchCategories,fetchPosts,fetchFinance,palette,colorSet,drawChart,groupBy,lastDateKeys,charts};
  return window.HFAdmin;
 }catch(err){console.error("Admin access check failed",err);gate.innerHTML='<div class="auth-gate-card"><strong>Secure sign-in could not be verified</strong><p>Please refresh and sign in again. No admin data was loaded.</p><p style="margin-top:14px"><a href="./index.html" class="hf-button hf-button-primary">Return to sign-in</a></p></div>';return null;}
})();
client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"&&!location.pathname.endsWith("/index.html"))location.replace("./index.html");});
})();
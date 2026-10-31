(() => {
"use strict";
try{
 const savedTheme=localStorage.getItem("hf_admin_theme");
 document.documentElement.dataset.adminTheme=savedTheme==="dark"?"dark":"light";
}catch(_themeError){document.documentElement.dataset.adminTheme="light";}
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
  let q=client.from("orders").select("id,order_number,customer_id,customer_name,customer_phone,customer_email,delivery_address,subtotal,delivery_charge,delivery_zone,payment_method,total,status,cancellation_reason,source,notes,ordered_at,updated_at,coupon_id,coupon_code,coupon_discount_amount,coupon_snapshot,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total,product_image_url)").order("ordered_at",{ascending:false}).order("id",{ascending:true});
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
async function fetchProducts(limit=10000){
 const products=await paginateQuery(()=>client.from("products").select("id,name,slug,sku,category,category_slug,price,display_price,unit_type,image_url,stock_quantity,is_active,is_featured,sort_order,home_sort_order,short_description,full_description,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),limit);
 const costs=await paginateQuery(()=>client.from("admin_product_costs").select("product_id,cost_price,packaging_cost,low_stock_threshold,updated_by,updated_at").order("product_id",{ascending:true}),Math.max(limit,1000));
 const costById=new Map(costs.map(row=>[row.product_id,row]));
 return products.map(product=>{
  const cost=costById.get(product.id);
  return {...product,cost_price:cost?.cost_price??null,packaging_cost:Number(cost?.packaging_cost??0),low_stock_threshold:Number(cost?.low_stock_threshold??5),cost_updated_by:cost?.updated_by??null,cost_updated_at:cost?.updated_at??null};
 });
}
async function fetchCategories(){
 return paginateQuery(()=>client.from("categories").select("id,name,slug,parent_id,description,image_url,is_active,sort_order,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),500);
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
  suppliers:'<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"/><path d="M3 21a7 7 0 0 1 14 0M18 8a3 3 0 0 1 0 6M19 17a5 5 0 0 1 3 4"/>',
  products:'<path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z"/><path d="m3.5 7.7 8.5 4.4 8.5-4.4M12 12v9"/><path d="m7.5 5.3 9 4.6"/>',
  content:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  messages:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 11h9M8 15h6"/>',
  messenger:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/><path d="m7.5 14 3.5-3 2.5 2 3.5-3"/>',
  video:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
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
  chevron:'<path d="m7 10 5 5 5-5"/>',
  barcode:'<path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/>',
  coupons:'<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6V7Z"/><path d="M13 8v2M13 14v2M13 20v.1"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  star:'<path d="m12 3 2.75 5.58 6.16.9-4.45 4.33 1.05 6.12L12 17.04l-5.51 2.9 1.05-6.13L3.1 9.48l6.15-.9L12 3Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m18 6-12 12M6 6l12 12"/>'
 };
 return '<svg class="hf-shell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.overview)+'</svg>';
}

function navPictureIcon(name){
 const art={
  overview:'<rect x="3" y="4" width="13" height="12" rx="3" fill="#DCEAF9"/><rect x="19" y="4" width="10" height="12" rx="3" fill="#B9D4F0"/><rect x="3" y="19" width="10" height="10" rx="3" fill="#A8C7E7"/><rect x="16" y="19" width="13" height="10" rx="3" fill="#E9C77F"/><path d="M8 10h3M22 9h4M7 24h3M20 24h5" stroke="#416F9D" stroke-width="1.7" stroke-linecap="round"/>',
  orders:'<path d="m16 3 12 6v15l-12 6-12-6V9l12-6Z" fill="#DCEAF9" stroke="#5C88BC" stroke-width="1.8"/><path d="m4.5 9.5 11.5 6 11.5-6M16 15.5V29" fill="none" stroke="#5C88BC" stroke-width="1.8"/><path d="m11 5.5 10 5" stroke="#D4A34E" stroke-width="3" stroke-linecap="round"/>',
  operations:'<rect x="7" y="4" width="20" height="25" rx="4" fill="#E9E1F6" stroke="#8067A8" stroke-width="1.8"/><path d="M13 4V3h8v1" fill="none" stroke="#8067A8" stroke-width="2"/><path d="m12 14 3 3 6-7M12 23h10" fill="none" stroke="#8067A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="27" cy="27" r="5" fill="#D7B8E8" stroke="#8067A8" stroke-width="1.4"/>',
  suppliers:'<circle cx="13" cy="11" r="6" fill="#DCEAF9" stroke="#5C88BC" stroke-width="1.7"/><circle cx="24" cy="12" r="4" fill="#FBE6D6" stroke="#BA753D" stroke-width="1.7"/><path d="M3 29a10 10 0 0 1 20 0M20 22a7 7 0 0 1 11 6" fill="none" stroke="#5C88BC" stroke-width="1.8" stroke-linecap="round"/>',
  pos:'<rect x="3" y="5" width="28" height="24" rx="4" fill="#F7E8D8" stroke="#B97843" stroke-width="1.8"/><path d="M3 12h28" stroke="#B97843" stroke-width="1.8"/><circle cx="8" cy="8.5" r="1" fill="#D4A34E"/><circle cx="12" cy="8.5" r="1" fill="#79A98B"/><path d="M9 18h7M9 22h11" stroke="#B97843" stroke-width="1.8" stroke-linecap="round"/><path d="M22 17v9m-3-3 3 3 3-3" fill="none" stroke="#438460" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  products:'<path d="M7 13h18l-2 16H9L7 13Z" fill="#DDEFE4" stroke="#438460" stroke-width="1.8"/><path d="M12 14V10a4 4 0 0 1 8 0v4" fill="none" stroke="#438460" stroke-width="2"/><path d="M12 20h8" stroke="#78AC8D" stroke-width="2" stroke-linecap="round"/>',
  coupons:'<path d="M5 5h22a3 3 0 0 1 3 3v5a5 5 0 0 0 0 8v3a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-3a5 5 0 0 0 0-8V8a3 3 0 0 1 3-3Z" fill="#F8E8D8" stroke="#B97843" stroke-width="1.8"/><path d="M16 9v3M16 17v3M16 24v.1" stroke="#B97843" stroke-width="2.2" stroke-linecap="round"/><path d="M9 10h2M9 21h2" stroke="#D3A25C" stroke-width="2" stroke-linecap="round"/>',
  content:'<path d="M9 3h12l7 7v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="#FBE9D9" stroke="#B97943" stroke-width="1.8"/><path d="M21 3v8h7M12 17h12M12 22h12M12 27h7" stroke="#B97943" stroke-width="1.8" stroke-linecap="round"/>',
  messages:'<path d="M16 4C8.8 4 4 8.7 4 15c0 2.2.7 4.1 2 5.7L4.5 28l7-2a14 14 0 0 0 4.5.7c7.2 0 12-4.7 12-11.7C28 8.7 23.2 4 16 4Z" fill="#DDEFE4" stroke="#438460" stroke-width="1.8"/><path d="M12 11c1-1 2-1 3 0l2 3-2 2c1 2 3 4 5 5l2-2 3 2c1 1 1 2 0 3-4 2-15-8-13-13Z" fill="#438460"/>',
  messenger:'<path d="M16 4C9 4 4 8.7 4 15c0 2.3.7 4.2 2.1 5.8L4 28l7-2a13 13 0 0 0 5 .8c7 0 12-4.8 12-11.8S23 4 16 4Z" fill="#E3EAFB" stroke="#647FC2" stroke-width="1.8"/><path d="m9 19 5-6 4 3 5-6" fill="none" stroke="#647FC2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  "facebook-publishing":'<rect x="6" y="5" width="22" height="25" rx="5" fill="#E3EAFB" stroke="#647FC2" stroke-width="1.8"/><path d="M12 12h10M12 17h10M12 22h6" stroke="#647FC2" stroke-width="1.8" stroke-linecap="round"/><circle cx="26" cy="26" r="6" fill="#D5A5C7"/><path d="m24 26 2 2 3-4" fill="none" stroke="#8E527F" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  "meta-ads-review":'<path d="M5 14 23 7v18L5 18v-4Z" fill="#FBE6D3" stroke="#B9783E" stroke-width="1.8" stroke-linejoin="round"/><path d="m10 19 3 9h5l-3-7" fill="#D7A05B" stroke="#B9783E" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 11c2 2 2 7 0 9" fill="none" stroke="#B9783E" stroke-width="2" stroke-linecap="round"/>',
  "youtube-publishing":'<rect x="4" y="8" width="25" height="18" rx="6" fill="#F8DDE0" stroke="#B65B66" stroke-width="1.8"/><path d="m14 12 8 5-8 5V12Z" fill="#B65B66"/><path d="M8 4h17" stroke="#D59A9E" stroke-width="2" stroke-linecap="round"/>',
  customers:'<circle cx="12" cy="12" r="6" fill="#DCEAF9"/><circle cx="24" cy="14" r="5" fill="#E9E1F6"/><path d="M3 29c.5-5 4-8 9-8s8.5 3 9 8" fill="#8FB5D9"/><path d="M20 23c4-2 9 1 10 6" fill="none" stroke="#8067A8" stroke-width="2.6" stroke-linecap="round"/>',
  analytics:'<path d="M5 5v24h25" fill="none" stroke="#5C88BC" stroke-width="2" stroke-linecap="round"/><rect x="9" y="19" width="4" height="8" rx="1.2" fill="#A8C7E7"/><rect x="17" y="13" width="4" height="14" rx="1.2" fill="#76A3D2"/><rect x="25" y="7" width="4" height="20" rx="1.2" fill="#D5A34F"/><path d="m9 15 6-5 5 2 7-7" fill="none" stroke="#39845C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  finance:'<rect x="4" y="9" width="27" height="19" rx="4" fill="#F4E2BE" stroke="#C28B3E" stroke-width="1.8"/><path d="M4 14h27" stroke="#C28B3E" stroke-width="1.8"/><path d="M22 18h9v7h-9a3.5 3.5 0 0 1 0-7Z" fill="#D9A34F"/><circle cx="24" cy="21.5" r="1.2" fill="#FFF8E9"/>',
  reports:'<path d="M9 3h12l7 7v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="#E9E1F6" stroke="#8067A8" stroke-width="1.8"/><path d="M21 3v8h7M11 24v-5M16 24v-9M21 24v-7" stroke="#8067A8" stroke-width="1.8" stroke-linecap="round"/>',
  "website-publisher":'<rect x="4" y="6" width="28" height="23" rx="4" fill="#EAF0FA" stroke="#5C88BC" stroke-width="1.8"/><path d="M4 12h28" stroke="#5C88BC" stroke-width="1.8"/><circle cx="9" cy="9" r="1" fill="#D4A34E"/><circle cx="13" cy="9" r="1" fill="#79A98B"/><path d="m12 21 4 3 9-8" fill="none" stroke="#438460" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  tracking:'<circle cx="17" cy="17" r="12" fill="#DDEFEF" stroke="#438B91" stroke-width="1.8"/><circle cx="17" cy="17" r="6" fill="#A5D6D5"/><circle cx="17" cy="17" r="2" fill="#438B91"/><path d="M17 2v4M32 17h-4" stroke="#438B91" stroke-width="2" stroke-linecap="round"/>',
  settings:'<path d="M17 4a4 4 0 0 1 4 3l2 1 3-.5 2 4-2 2v3l2 2-2 4-3-.5-2 1a4 4 0 0 1-8 0l-2-1-3 .5-2-4 2-2v-3l-2-2 2-4 3 .5 2-1a4 4 0 0 1 4-3Z" fill="#E9E5DC" stroke="#8B8377" stroke-width="1.7"/><circle cx="17" cy="15.5" r="4.5" fill="#FFFDF8" stroke="#8B8377" stroke-width="1.8"/>'
 };
 return '<svg class="hf-nav-art" viewBox="0 0 34 34" aria-hidden="true" focusable="false">'+(art[name]||art.overview)+'</svg>';
}

function makeShell(){
 adminApp.classList.add("admin-app");
 const activePage=pageName==="messenger"?"messenger":pageName==="coupon-usage"?"coupons":(pageName.startsWith("products-")?"products":pageName);
 const menuGroups=[
  {label:"WORKSPACE",items:[["overview","overview","Overview","dashboard home start"]]},
  {label:"STORE MANAGEMENT",items:[["pos","pos","POS Management","offline pos point of sale offline sales import cash register"],["orders","orders","Orders","order order management customer orders"],["incomplete-orders","orders","Incomplete Orders","incomplete checkout abandoned cart order recovery leads"],["operations","operations","Operations","operation packing fulfillment"],["suppliers","layers","Suppliers","supplier vendors procurement purchase orders grn goods received supplier bills payment history payable ledger",[[ "supplier-add","plus","Add Supplier","supplier vendor add new directory contact registration" ],[ "supplier-purchases","orders","Purchase List","purchase orders procurement invoice goods received grn stock" ],[ "supplier-payments","finance","Payment History","supplier payments accounts payable ledger due bkash bank cash" ]]],["products","products","Products","product inventory stock sku barcode scanner reviews ratings",[['products-add','plus','Add Product','add new create product'],['products','products','All Products','all products catalogue inventory'],['products-barcode','barcode','Barcode Generation','barcode generate print scan qr'],['products-reviews','star','Product Reviews','customer product reviews ratings moderation']]],["categories","layers","Categories","catalog categories hierarchy taxonomy subcategories product order drag drop merchandising",[["categories-tree","layers","Category Structure","category tree parent category subcategory child category hierarchy"],["categories-sorting","products","Product Sorting","product order drag drop homepage category position merchandising"],["categories-settings","settings","Catalog Settings","category visibility images descriptions seo presentation settings"]]],["coupons","coupons","Coupons","coupon coupon codes discounts promotion campaigns marketing",[[ "coupons","coupons","Coupon Promotions","coupon promotions offer campaigns" ],[ "coupon-usage","analytics","Coupon Usage","coupon usage redemption orders customers discounts" ]]],["content","content","Website Content","content pages blog seo"]]},
  {label:"CUSTOMERS & MESSAGES",items:[["messages","messages","WhatsApp Inbox","whatsapp inbox customer chat messages"],["messenger","messenger","Messenger Inbox","facebook messenger messages social inbox"],["facebook-publishing","messenger","Facebook Publishing","facebook publishing posts social media schedule"],["meta-ads-review","finance","Meta Ads Review","meta ads advertising campaign paid media copy review draft"],["youtube-publishing","video","YouTube Publishing","youtube channel videos upload schedule"],["customers","customers","Customer Information","customer contact audience crm directory loyalty"],["customer-settings","settings","Customer Settings","customer segmentation tier vip special customer rules"],["marketing-center","messages","Customer Messages","customer messages customer support order updates email whatsapp service communication"]]},
  {label:"INSIGHTS & FINANCE",items:[["analytics","analytics","Analytics","analytics insights website traffic marketing"],["finance","finance","Finance & Cash Flow","finance expenses income bookkeeping cash"],["reports","reports","Reports","report export download csv"]]},
  {label:"SYSTEM",items:[["website-publisher","settings","Website Publisher","website publisher deploy code review approve publish"],["tracking","sliders","Tracking Controls","tracking meta pixel conversions api capi google analytics event routing"],["settings","settings","Settings & Security","settings security preferences access"]]}
 ];
 const allItems=menuGroups.flatMap(group=>group.items.map(item=>({id:item[0],icon:item[1],label:item[2],href:"./"+item[0]+".html",keys:item[3]})));
 const itemById=new Map(allItems.map(item=>[item.id,item]));
 const defaultFavorites=["overview","orders","messages"];
 const readFavorites=()=>{
  try{
   const stored=localStorage.getItem("hf_admin_favorites");
   if(stored!==null){
    const parsed=JSON.parse(stored);
    if(Array.isArray(parsed))return [...new Set(parsed.filter(id=>itemById.has(id)))].slice(0,8);
   }
   localStorage.setItem("hf_admin_favorites",JSON.stringify(defaultFavorites));
  }catch(_favoritesReadError){}
  return defaultFavorites.slice();
 };
 let favorites=readFavorites();
 let favoritesEditing=false;
 const favoriteStar=(id,label)=>{
  const active=favorites.includes(id);
  const verb=active?"Remove "+label+" from favorites":"Add "+label+" to favorites";
  return '<button type="button" class="admin-nav-fav-toggle" data-nav-fav="'+esc(id)+'" aria-pressed="'+String(active)+'" aria-label="'+esc(verb)+'" title="'+esc(verb)+'">'+shellIcon("star")+'</button>';
 };
 const renderNavigation=()=>menuGroups.map(group=>{
  const links=group.items.map(item=>{
   if(["products","coupons","suppliers","categories"].includes(item[0])&&Array.isArray(item[4])){
    const section=item[0],children=item[4],open=children.some(child=>child[0]===pageName)||(section==="categories"&&pageName==="categories");
    const childLinks=children.map(child=>'<a class="admin-nav-child-link '+(child[0]===pageName?"active":"")+'" href="./'+child[0]+'.html" '+(child[0]===pageName?'aria-current="page"':'')+'><span class="admin-nav-child-icon">'+shellIcon(child[1])+'</span><span>'+esc(child[2])+'</span></a>').join("");
    return '<div class="admin-nav-item admin-nav-parent-item" data-nav-item data-nav-keys="'+esc(item[3])+'"><div class="admin-nav-parent-row"><button class="admin-nav-link admin-nav-parent-toggle '+(open?"active":"")+'" type="button" data-nav-expand="'+section+'" aria-expanded="'+String(open)+'"><span class="nav-icon nav-icon-'+section+'">'+navPictureIcon(section)+'</span><span class="admin-nav-text">'+esc(item[2])+'</span><span class="admin-nav-expand-icon" aria-hidden="true">'+shellIcon("chevron")+'</span></button>'+favoriteStar(item[0],item[2])+'</div><div class="admin-nav-children" data-nav-children="'+section+'" '+(open?"":"hidden")+'>'+childLinks+'</div></div>';
   }
   return '<div class="admin-nav-item" data-nav-item data-nav-keys="'+esc(item[3])+'"><a class="admin-nav-link '+(item[0]===activePage?"active":"")+'" href="./'+item[0]+'.html" '+(item[0]===activePage?'aria-current="page"':'')+'><span class="nav-icon nav-icon-'+esc(item[0]==="marketing-center"?"messages":item[0]==="customer-settings"?"settings":item[0])+'">'+navPictureIcon(item[0]==="marketing-center"?"messages":item[0]==="customer-settings"?"settings":item[0])+'</span><span class="admin-nav-text">'+esc(item[2])+'</span></a>'+favoriteStar(item[0],item[2])+'</div>';
  }).join("");
  return '<section class="admin-nav-group" data-nav-group aria-label="'+esc(group.label)+'"><div class="admin-nav-label">'+esc(group.label)+'</div><div class="admin-nav-links">'+links+'</div></section>';
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
  '<a class="admin-skip-link" href="#pageContent">Skip to main content</a>'+
  '<aside class="admin-sidebar" id="adminSidebar" aria-label="Primary navigation">'+
   '<a class="admin-brand" href="./overview.html" aria-label="Halal Food admin overview">'+
    '<img src="../images/logo-favicon/halal-food-official-logo.svg" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+
    '<span class="admin-brand-mark" style="display:none" aria-hidden="true">HF</span>'+
    '<span class="admin-brand-copy"><strong>Halal Food</strong><small>Admin Control Center</small></span>'+
   '</a>'+
   '<div class="admin-navsearch" role="search" aria-label="Search admin navigation">'+
    '<span class="admin-navsearch-icon" aria-hidden="true">'+shellIcon("search")+'</span>'+
    '<input id="adminNavSearch" type="search" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Search menu…" aria-label="Search menu" aria-describedby="adminNavSearchStatus">'+
    '<kbd class="admin-navsearch-shortcut" aria-hidden="true">/</kbd>'+
    '<span id="adminNavSearchStatus" class="admin-sr-only" role="status" aria-live="polite"></span>'+
   '</div>'+
   '<p class="admin-navsearch-empty" id="adminNavSearchEmpty" hidden>No matching sections found.</p>'+
   '<nav class="admin-sidebar-nav" aria-label="Admin sections">'+
    '<section class="admin-favorites" id="adminFavorites" aria-label="Favorites">'+
     '<div class="admin-favorites-heading"><span>FAVORITES</span><button id="adminFavoritesEdit" class="admin-favorites-edit" type="button" aria-pressed="false">Edit</button></div>'+
     '<div id="adminFavoriteList" class="admin-favorite-list"></div>'+
    '</section>'+renderNavigation()+
   '</nav>'+
   '<div class="admin-sidebar-note"><div class="admin-sidebar-note-head"><span class="admin-test-indicator" aria-hidden="true"></span><strong>Learning &amp; testing project</strong></div><p>Live payments and product deliveries are not enabled.</p></div>'+
  '</aside>'+
  '<button id="adminSidebarBackdrop" class="admin-sidebar-backdrop" type="button" aria-label="Close navigation" hidden></button>'+
  '<div class="admin-frame"><header class="admin-topbar">'+
   '<button id="adminMenuToggle" class="admin-menu-toggle" type="button" aria-label="Open navigation" aria-controls="adminSidebar" aria-expanded="false">'+shellIcon("menu")+'</button>'+
   '<div class="admin-global-search" role="search"><span class="admin-global-search-icon" aria-hidden="true">'+shellIcon("search")+'</span><input id="globalSearch" type="search" autocomplete="off" placeholder="Search this page’s records…" aria-label="Search records on this page"></div>'+
   '<span class="admin-topbar-spacer" aria-hidden="true"></span>'+
   '<div class="admin-topbar-actions">'+
    '<button class="admin-top-button theme-toggle" id="themeToggle" type="button" aria-label="Switch to light theme" title="Switch to light theme" aria-pressed="false"><span class="topbar-button-icon theme-toggle-icon" aria-hidden="true">'+shellIcon("sun")+'</span><span class="topbar-label theme-toggle-label">Light theme</span></button>'+
    '<button class="admin-top-button admin-mode-toggle" id="modeToggle" type="button" title="Switch to advanced view"><span class="topbar-button-icon">'+shellIcon("sliders")+'</span><span class="topbar-label">Advanced view</span></button>'+
    '<button class="admin-top-button admin-help-toggle" id="helpBtn" type="button" title="Open quick guide"><span class="topbar-button-icon">'+shellIcon("help")+'</span><span class="topbar-label">Help</span></button>'+
   '</div>'+
   '<details class="admin-account-menu" id="adminAccountMenu"><summary class="admin-account-chip" aria-label="Open administrator account menu">'+
    '<span class="admin-account-avatar">'+avatarMarkup+'</span><span class="admin-account-meta"><strong>'+esc(displayName)+'</strong><small id="accountEmail">'+esc(emailValue)+'</small></span><span class="admin-account-chevron">'+shellIcon("chevron")+'</span>'+
   '</summary><div class="admin-account-dropdown"><div class="admin-account-dropdown-head"><span class="admin-account-dropdown-kicker">SIGNED IN</span><strong>'+esc(displayName)+'</strong><small>'+esc(emailValue)+'</small></div><a class="admin-account-settings-link" href="./settings.html">'+shellIcon("settings")+'<span>Settings &amp; security</span></a><button id="logoutBtn" class="admin-account-logout" type="button">'+shellIcon("logout")+'<span>Sign out</span></button></div></details>'+
  '</header><div class="admin-main" id="adminMain">'+initialContent+'</div></div>'+
  '<div id="hfToast" class="hf-toast" role="status" aria-live="polite"></div>'+
  '<dialog id="helpDialog" class="hf-dialog"><div class="hf-dialog-inner help-content"><div class="hf-dialog-head"><div><p class="hf-dialog-title-tag">QUICK GUIDE</p><h2>How to use your admin panel</h2><p>Every section is designed for everyday, non-technical use.</p></div><button class="hf-button hf-button-secondary hf-dialog-close" data-close-help type="button" aria-label="Close help">×</button></div><ol><li>Choose a section from the left menu.</li><li>Use Search menu or press / to find a section. Use Ctrl/Cmd + K to focus menu search.</li><li>Star important sections to keep them in Favorites. You can save up to eight.</li><li>Use the page search, date filters and search boxes to narrow down records.</li><li>Charts are interactive: hover or tap a chart to see values and labels.</li><li>Use Reports to export filtered data. CSV opens in spreadsheets; PDF opens the print dialog where you can choose Save as PDF.</li><li>Finance entries count in summaries only after they are marked Confirmed. Confirm only records you have checked.</li><li>This is a learning/testing storefront. Order value is not proof of collected payment; real delivery and payments are not enabled.</li></ol><div class="hf-dialog-actions"><button class="hf-button hf-button-primary" data-close-help type="button">Got it</button></div></div></dialog>';
 adminApp.innerHTML=shell;
 adminApp.hidden=false;gate.hidden=true;

 const sidebar=document.getElementById("adminSidebar");
 const sidebarBackdrop=document.getElementById("adminSidebarBackdrop");
 const menuToggle=document.getElementById("adminMenuToggle");
 const searchInput=document.getElementById("globalSearch");
 const navSearchInput=document.getElementById("adminNavSearch");
 const accountMenu=document.getElementById("adminAccountMenu");
 const favoriteList=document.getElementById("adminFavoriteList");
 const favoritesEditButton=document.getElementById("adminFavoritesEdit");
 const navSearchEmpty=document.getElementById("adminNavSearchEmpty");
 const navSearchStatus=document.getElementById("adminNavSearchStatus");
 const avatarImage=adminApp.querySelector(".admin-account-avatar-image");
 avatarImage?.addEventListener("error",()=>{
  avatarImage.hidden=true;
  const fallback=avatarImage.nextElementSibling;
  if(fallback)fallback.hidden=false;
 },{once:true});

 const refreshFavoriteButtons=()=>{
  sidebar.querySelectorAll("[data-nav-fav]").forEach(button=>{
   const item=itemById.get(button.dataset.navFav);
   const active=favorites.includes(button.dataset.navFav);
   button.setAttribute("aria-pressed",String(active));
   const label=(active?"Remove ":"Add ")+(item?.label||"section")+(active?" from favorites":" to favorites");
   button.setAttribute("aria-label",label);button.title=label;
  });
 };
 const renderFavorites=()=>{
  favoriteList.innerHTML=favorites.length?favorites.map(id=>{
   const item=itemById.get(id);if(!item)return "";
   return '<div class="admin-favorite-item"><a class="admin-favorite-link '+(id===activePage?"active":"")+'" href="'+item.href+'" '+(id===activePage?'aria-current="page"':'')+'><span class="admin-favorite-icon">'+shellIcon(item.icon)+'</span><span>'+esc(item.label)+'</span></a><button type="button" class="admin-favorite-remove" data-favorite-remove="'+esc(id)+'" aria-label="Remove '+esc(item.label)+' from favorites" title="Remove favorite">'+shellIcon("close")+'</button></div>';
  }).join(""):'<p class="admin-favorites-empty">Star a section below to add it here.</p>';
  sidebar.querySelector("#adminFavorites").classList.toggle("is-empty",favorites.length===0);
  sidebar.querySelector("#adminFavorites").classList.toggle("is-editing",favoritesEditing);
  favoritesEditButton.textContent=favoritesEditing?"Done":"Edit";
  favoritesEditButton.setAttribute("aria-pressed",String(favoritesEditing));
  favoritesEditButton.disabled=favorites.length===0;
  refreshFavoriteButtons();
 };
 const saveFavorites=next=>{
  const clean=[...new Set(next.filter(id=>itemById.has(id)))].slice(0,8);
  try{localStorage.setItem("hf_admin_favorites",JSON.stringify(clean));}
  catch(_favoritesWriteError){toast("Favorites could not be saved in this browser.","error");return false;}
  favorites=clean;renderFavorites();return true;
 };
 const toggleFavorite=id=>{
  if(!itemById.has(id))return;
  if(favorites.includes(id)){
   if(saveFavorites(favorites.filter(value=>value!==id)))toast(itemById.get(id).label+" removed from Favorites.");
   return;
  }
  if(favorites.length>=8){toast("You can save up to 8 favorite sections. Remove one to add another.","error");return;}
  if(saveFavorites([...favorites,id]))toast(itemById.get(id).label+" added to Favorites.");
 };
 const filterNavigation=()=>{
  const query=String(navSearchInput?.value||"").toLowerCase().trim();
  const tokens=query.split(/\s+/).filter(Boolean);
  const items=[...sidebar.querySelectorAll("[data-nav-item]")];
  let matches=0;const matching=[];
  items.forEach(row=>{
   const link=row.querySelector(".admin-nav-link");
   const haystack=((row.dataset.navKeys||"")+" "+(link?.textContent||"")).toLowerCase();
   const matched=tokens.every(token=>haystack.includes(token));
   row.hidden=!matched;
   row.classList.toggle("is-search-match",matched&&tokens.length>0);
   link?.classList.remove("is-first");
   if(matched){matches++;matching.push(link);}
  });
  sidebar.querySelectorAll("[data-nav-group]").forEach(group=>{
   const groupItems=[...group.querySelectorAll("[data-nav-item]")];
   group.hidden=tokens.length>0&&!groupItems.some(item=>!item.hidden);
  });
  if(navSearchEmpty)navSearchEmpty.hidden=!tokens.length||matches>0;
  if(navSearchStatus)navSearchStatus.textContent=tokens.length?(matches?matches+" matching sections. Press Enter to open the first result.":"No matching sections found."):"";
  if(tokens.length&&matching[0])matching[0].classList.add("is-first");
 };
 const clearMenuSearch=()=>{
  if(!navSearchInput)return;
  navSearchInput.value="";filterNavigation();
 };
 const closeSidebar=(returnFocus=false)=>{
  sidebar.classList.remove("open");sidebarBackdrop.hidden=true;
  sidebar.removeAttribute("aria-modal");sidebar.removeAttribute("role");sidebar.setAttribute("aria-label","Primary navigation");
  menuToggle.setAttribute("aria-expanded","false");menuToggle.setAttribute("aria-label","Open navigation");
  document.body.classList.remove("admin-sidebar-open");
  if(returnFocus)menuToggle.focus({preventScroll:true});
 };
 const openSidebar=(focusSearch=false)=>{
  sidebar.classList.add("open");sidebarBackdrop.hidden=false;
  if(window.innerWidth<=900){sidebar.setAttribute("role","dialog");sidebar.setAttribute("aria-modal","true");sidebar.setAttribute("aria-label","Admin navigation");}
  menuToggle.setAttribute("aria-expanded","true");menuToggle.setAttribute("aria-label","Close navigation");
  document.body.classList.add("admin-sidebar-open");
  (focusSearch?navSearchInput:sidebar.querySelector(".admin-nav-link"))?.focus({preventScroll:true});
 };
 renderFavorites();filterNavigation();
 navSearchInput?.addEventListener("input",filterNavigation);
 navSearchInput?.addEventListener("keydown",event=>{
  const links=[...sidebar.querySelectorAll(".admin-nav-item:not([hidden]) .admin-nav-link")];
  const first=links[0];
  if(event.key==="Enter"&&String(navSearchInput.value||"").trim()&&first){event.preventDefault();const target=first.matches("[data-nav-expand]")?first.closest(".admin-nav-parent-row")?.parentElement?.querySelector(".admin-nav-child-link"):first;if(target?.href)location.href=target.href;}
  else if(event.key==="ArrowDown"&&first){event.preventDefault();first.focus();}
  else if(event.key==="Escape"&&navSearchInput.value){event.preventDefault();clearMenuSearch();}
 });
 sidebar.addEventListener("keydown",event=>{
  if(!["ArrowDown","ArrowUp"].includes(event.key))return;
  const link=event.target.closest?.(".admin-nav-link");
  if(!link||!String(navSearchInput?.value||"").trim())return;
  const links=[...sidebar.querySelectorAll(".admin-nav-item:not([hidden]) .admin-nav-link")];
  const index=links.indexOf(link);if(index<0)return;
  event.preventDefault();
  if(event.key==="ArrowUp"&&index===0)navSearchInput.focus();
  else links[Math.max(0,Math.min(links.length-1,index+(event.key==="ArrowDown"?1:-1)))]?.focus();
 });
 sidebar.addEventListener("click",event=>{
  const expand=event.target.closest?.("[data-nav-expand]");
  if(expand){
   const box=sidebar.querySelector('[data-nav-children="'+expand.dataset.navExpand+'"]');
   const next=expand.getAttribute("aria-expanded")!=="true";
   expand.setAttribute("aria-expanded",String(next));
   if(box)box.hidden=!next;
   return;
  }
  const star=event.target.closest?.("[data-nav-fav]");
  if(star){event.preventDefault();event.stopPropagation();toggleFavorite(star.dataset.navFav);return;}
  const remove=event.target.closest?.("[data-favorite-remove]");
  if(remove){event.preventDefault();event.stopPropagation();toggleFavorite(remove.dataset.favoriteRemove);return;}
  if(event.target.closest?.("#adminFavoritesEdit")){
   favoritesEditing=!favoritesEditing;renderFavorites();return;
  }
 });
 menuToggle?.addEventListener("click",()=>sidebar.classList.contains("open")?closeSidebar():openSidebar());
 sidebarBackdrop?.addEventListener("click",()=>closeSidebar(true));
 sidebar.querySelectorAll(".admin-nav-link,.admin-nav-child-link,.admin-favorite-link").forEach(link=>link.addEventListener("click",()=>{if(window.innerWidth<=900)closeSidebar();}));
 window.addEventListener("resize",()=>{if(window.innerWidth>900)closeSidebar();});
 document.addEventListener("keydown",event=>{
  const target=event.target;
  const typing=!!target?.closest?.('input,textarea,select,[contenteditable="true"]');
  if(event.key==="Tab"&&sidebar.classList.contains("open")&&window.innerWidth<=900&&!document.querySelector("dialog[open]")){
   const focusable=[...sidebar.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&!node.closest("[hidden]")&&node.getClientRects().length>0);
   if(!focusable.length){event.preventDefault();menuToggle.focus({preventScroll:true});return;}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&(document.activeElement===first||!sidebar.contains(document.activeElement))){event.preventDefault();last.focus({preventScroll:true});return;}
   if(!event.shiftKey&&(document.activeElement===last||!sidebar.contains(document.activeElement))){event.preventDefault();first.focus({preventScroll:true});return;}
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
   event.preventDefault();
   if(window.innerWidth<=900&&!sidebar.classList.contains("open"))openSidebar(true);
   else{navSearchInput?.focus();navSearchInput?.select();}
   return;
  }
  if(event.key==="/"&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!document.querySelector("dialog[open]")){
   event.preventDefault();
   if(window.innerWidth<=900&&!sidebar.classList.contains("open"))openSidebar(true);
   else{navSearchInput?.focus();navSearchInput?.select();}
   return;
  }
  if(event.key==="Escape"){
   if(navSearchInput?.value&&document.activeElement===navSearchInput){clearMenuSearch();return;}
   if(sidebar.classList.contains("open"))closeSidebar(true);
   if(accountMenu?.open)accountMenu.open=false;
  }
 });
 document.addEventListener("click",event=>{if(accountMenu?.open&&!accountMenu.contains(event.target))accountMenu.open=false;});

 const modeKey="hf_admin_display_mode";
 const themeKey="hf_admin_theme";
 const themeBtn=document.getElementById("themeToggle");
 const applyTheme=theme=>{
  const active=theme==="light"?"light":"dark";
  document.documentElement.dataset.adminTheme=active;
  palette.navy=active==="light"?"#2B2A3D":"#C9D5E6";
  palette.muted=active==="light"?"#737487":"#96A6BE";
  palette.cream=active==="light"?"#FFFDF8":"#111C2E";
  if(themeBtn){
   const toLight=active==="dark";const label=toLight?"Light theme":"Dark theme";
   themeBtn.innerHTML='<span class="topbar-button-icon theme-toggle-icon" aria-hidden="true">'+shellIcon(toLight?"sun":"moon")+'</span><span class="topbar-label theme-toggle-label">'+label+'</span>';
   themeBtn.setAttribute("aria-label","Toggle color theme");themeBtn.setAttribute("title","Switch to "+(toLight?"light":"dark")+" theme");themeBtn.setAttribute("aria-pressed",String(active==="light"));
  }
  syncChartsForTheme();
 };
 let savedTheme="light";try{savedTheme=localStorage.getItem(themeKey)||"light";}catch(_themeReadError){}
 applyTheme(savedTheme);
 themeBtn?.addEventListener("click",()=>{const next=document.documentElement.dataset.adminTheme==="light"?"dark":"light";try{localStorage.setItem(themeKey,next);}catch(_themeWriteError){}applyTheme(next);});
 const modeBtn=document.getElementById("modeToggle");
 const applyMode=()=>{
  let advanced=false;try{advanced=localStorage.getItem(modeKey)==="advanced";}catch(_modeReadError){}
  adminApp.classList.toggle("simple-mode",!advanced);
  if(modeBtn){const action=advanced?"Simple view":"Advanced view";modeBtn.innerHTML='<span class="topbar-button-icon">'+shellIcon("sliders")+'</span><span class="topbar-label">'+action+'</span>';modeBtn.setAttribute("aria-label","Switch to "+(advanced?"simple":"advanced")+" view");modeBtn.title="Switch to "+(advanced?"simple":"advanced")+" view";}
 };
 applyMode();
 modeBtn?.addEventListener("click",()=>{const advanced=adminApp.classList.contains("simple-mode");try{localStorage.setItem(modeKey,advanced?"advanced":"simple");}catch(_modeWriteError){}applyMode();});
 document.getElementById("helpBtn")?.addEventListener("click",()=>document.getElementById("helpDialog")?.showModal());
 document.querySelectorAll("[data-close-help]").forEach(button=>button.addEventListener("click",()=>document.getElementById("helpDialog")?.close()));
 document.getElementById("logoutBtn")?.addEventListener("click",async()=>{if(!confirm("Sign out of the Halal Food admin panel?"))return;await client.auth.signOut();location.replace("./index.html");});
 if(searchInput&&((pageName==="messages")||(pageName==="messenger"))){
  const conversationSearch=document.getElementById("waConversationSearch");
  if(conversationSearch){
   searchInput.placeholder="Search conversations…";searchInput.setAttribute("aria-label","Search conversations by name or contact");
   searchInput.addEventListener("input",()=>{if(conversationSearch.value!==searchInput.value){conversationSearch.value=searchInput.value;conversationSearch.dispatchEvent(new Event("input",{bubbles:true}));}});
   conversationSearch.addEventListener("input",()=>{if(searchInput.value!==conversationSearch.value)searchInput.value=conversationSearch.value;});
  }
 }
 const email=document.getElementById("accountEmail");if(email)email.textContent=emailValue;
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
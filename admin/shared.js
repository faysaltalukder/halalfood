(() => {
"use strict";
document.documentElement.dataset.adminTheme="light";
document.documentElement.dataset.hfTheme="warm-harvest";
const STORE_CONFIG=window.HALAL_STORE_CONFIG||{};
const SUPABASE_URL=String(STORE_CONFIG.supabase?.url||"https://qfwvrcfkrsydycbfjsxf.supabase.co").replace(/\/$/,"");
const SUPABASE_KEY=STORE_CONFIG.supabase?.publishableKey||"sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const ADMIN_EMAIL=STORE_CONFIG.adminEmail||"halalfoodbd.official@gmail.com";
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

const ADMIN_COLOR_THEMES={
 "warm-harvest":{
  id:"warm-harvest",name:"Warm Harvest",profile:"Warm · Classic · Premium",previewColors:["#7E2D26","#A94335","#D49537","#F0E1D5"],
  tokens:{
   "sidebar-bg":"radial-gradient(ellipse at 10% 8%,rgba(255,210,105,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(255,112,77,.08) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(255,176,72,.08) 0%,transparent 38%),linear-gradient(132deg,#7E2D26 0%,#A94335 27%,#A34A2F 58%,#8F552F 82%,#7E3D37 100%)",
   "sidebar-pattern-filter":"sepia(.72) saturate(.82) hue-rotate(345deg) brightness(1.34)","sidebar-ink":"#FFF2D8","sidebar-muted":"#FFE0B0","sidebar-border":"rgba(255,225,176,.34)",
   "side-group-bg":"linear-gradient(145deg,rgba(116,43,35,.34),rgba(88,37,35,.24))","side-group-border":"rgba(255,231,188,.32)",
   "side-menu-1":"linear-gradient(110deg,#F8E7D8,#FFF1E6)","side-menu-2":"linear-gradient(110deg,#F4E0C3,#FBECD5)","side-menu-3":"linear-gradient(110deg,#F6D8CD,#FCE9DF)","side-menu-4":"linear-gradient(110deg,#EAD9CB,#F6E9DD)",
   "side-menu-ink":"#704536","side-menu-border":"rgba(255,255,255,.88)","side-menu-hover":"linear-gradient(110deg,#FFE5D1,#F7DCC5)","side-menu-active":"linear-gradient(115deg,#F4C66F,#E5A94D)","side-menu-active-ink":"#573B26",
   "side-child-bg":"linear-gradient(145deg,rgba(255,244,232,.96),rgba(244,222,204,.94))","side-child-ink":"#754B3A","side-accent":"#FFD27D","side-icon-bg":"#F8E4D2","side-icon-ink":"#A34D37",
   "side-note-bg":"rgba(93,42,34,.25)","side-search-bg":"rgba(255,242,224,.14)","side-search-border":"rgba(255,230,190,.38)",
   "canvas-bg":"radial-gradient(ellipse at 84% 3%,rgba(190,103,70,.16),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(212,149,55,.12),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(169,67,53,.08),transparent 33%),linear-gradient(133deg,#F4E7DC 0%,#F0E1D5 48%,#EAD8C9 100%)",
   "canvas-ink":"#654536","header-bg":"rgba(246,234,222,.96)","header-border":"#DFC4AF","header-control-bg":"#F1DDCB","header-control-ink":"#89513E","header-control-border":"#D9B79D",
   "hero-bg":"linear-gradient(120deg,#F7E9DE 0%,#EED8C8 56%,#F3E3D4 100%)","hero-border":"#DDBFA8","card-bg":"linear-gradient(145deg,#FFF7EF 0%,#F7E8DC 100%)","card-border":"#E2C7B3","nested-bg":"linear-gradient(125deg,#F0DFD2,#F6E9DE)","control-bg":"#FFF8F1",
   "text":"#654536","muted":"#8B7062","border":"#E3C6B1","primary":"#A94335","primary-hover":"#853329","secondary":"#EED7C3","secondary-ink":"#824B38","secondary-hover":"#E5C8AF","accent":"#D49537","accent-alt":"#B96C54","focus":"#B75A43",
   "kpi-1":"linear-gradient(145deg,#F4DFD5,#EED3C7)","kpi-2":"linear-gradient(145deg,#F6EBD5,#EEDDBB)","kpi-3":"linear-gradient(145deg,#F4E4DD,#EAD4C9)","kpi-4":"linear-gradient(145deg,#F1E3D7,#E7D3C1)",
   "table-bg":"#FFF6ED","table-head":"#EBD8C8","table-row":"#FFF8F1","table-alt":"#F5E9DE","table-hover":"#F1DDCC","chart-bg":"linear-gradient(145deg,#F3E4D8,#EBD8C9)","chart-text":"#704E40","chart-muted":"#8F776A","chart-grid":"#E5CBBB","chart-surface":"#FFF4E8","tooltip-bg":"#FFF4E8","leaf-filter":"none"
  },
  chartColors:["#A94335","#D49537","#BE6E4B","#8D604B","#DBA85E","#A85E58","#C18A67","#785649","#E0B77A","#B77B91"]
 },
 "ocean-calm":{
  id:"ocean-calm",name:"Ocean Calm",profile:"Cool · Calm · Contemporary",previewColors:["#124F50","#176B68","#62AFA5","#E2EFEC"],
  tokens:{
   "sidebar-bg":"radial-gradient(ellipse at 10% 8%,rgba(120,218,203,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(95,184,185,.2) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(126,177,210,.08) 0%,transparent 38%),linear-gradient(132deg,#124F50 0%,#176B68 29%,#247D79 58%,#2D7085 83%,#1C566B 100%)",
   "sidebar-pattern-filter":"hue-rotate(105deg) saturate(.72) brightness(1.24)","sidebar-ink":"#E9FAF5","sidebar-muted":"#C3E8E0","sidebar-border":"rgba(190,239,229,.34)",
   "side-group-bg":"linear-gradient(145deg,rgba(14,65,67,.34),rgba(25,83,90,.25))","side-group-border":"rgba(194,238,229,.32)",
   "side-menu-1":"linear-gradient(110deg,#DCEFE9,#F0F8F4)","side-menu-2":"linear-gradient(110deg,#D8EBEA,#EDF7F5)","side-menu-3":"linear-gradient(110deg,#E5EFED,#F5F9F7)","side-menu-4":"linear-gradient(110deg,#E2EDF4,#F1F7FA)",
   "side-menu-ink":"#245A56","side-menu-border":"rgba(255,255,255,.9)","side-menu-hover":"linear-gradient(110deg,#C8E5DD,#DCEFEB)","side-menu-active":"linear-gradient(115deg,#B9E0D4,#91C9BE)","side-menu-active-ink":"#164D4A",
   "side-child-bg":"linear-gradient(145deg,rgba(237,249,245,.97),rgba(215,237,232,.94))","side-child-ink":"#285F5A","side-accent":"#A8DED2","side-icon-bg":"#D8EEE8","side-icon-ink":"#176B68",
   "side-note-bg":"rgba(11,62,66,.25)","side-search-bg":"rgba(230,250,246,.13)","side-search-border":"rgba(190,239,229,.38)",
   "canvas-bg":"radial-gradient(ellipse at 84% 3%,rgba(88,164,161,.16),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(119,189,177,.13),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(87,143,174,.08),transparent 33%),linear-gradient(133deg,#E8F2EF 0%,#E2EFEC 48%,#D8E9E5 100%)",
   "canvas-ink":"#294F4B","header-bg":"rgba(235,246,242,.96)","header-border":"#C4DED7","header-control-bg":"#D9ECE6","header-control-ink":"#245F59","header-control-border":"#B8D8CF",
   "hero-bg":"linear-gradient(120deg,#F0F7F4 0%,#D9EBE6 56%,#E5F1ED 100%)","hero-border":"#BFDCD4","card-bg":"linear-gradient(145deg,#F8FCFA 0%,#EAF4F0 100%)","card-border":"#C9E0D9","nested-bg":"linear-gradient(125deg,#DDEFEA,#EAF5F1)","control-bg":"#F7FBF9",
   "text":"#294F4B","muted":"#66827D","border":"#C7DDD6","primary":"#176B68","primary-hover":"#105653","secondary":"#D8EBE6","secondary-ink":"#245F59","secondary-hover":"#C6E2DB","accent":"#62AFA5","accent-alt":"#4F8C9A","focus":"#398F88",
   "kpi-1":"linear-gradient(145deg,#D7ECE6,#C7E2D9)","kpi-2":"linear-gradient(145deg,#E0EFEC,#D0E6E1)","kpi-3":"linear-gradient(145deg,#DFEBF2,#CEE0E9)","kpi-4":"linear-gradient(145deg,#F1EBDD,#E7DEC8)",
   "table-bg":"#F8FCFA","table-head":"#D8EAE5","table-row":"#FBFDFC","table-alt":"#EAF3F0","table-hover":"#DCECE7","chart-bg":"linear-gradient(145deg,#E9F3EF,#DCEBE6)","chart-text":"#315C57","chart-muted":"#6C8983","chart-grid":"#CFE1DA","chart-surface":"#F7FBF9","tooltip-bg":"#F7FBF9","leaf-filter":"hue-rotate(115deg) saturate(.62)"
  },
  chartColors:["#176B68","#62AFA5","#D18B70","#507E9A","#9AC9BC","#DDB45D","#719A8E","#3D5F76","#A9BBB1","#CE8C91"]
 },

  "royal-indigo": {
    "id": "royal-indigo",
    "name": "Royal Indigo",
    "profile": "Indigo · Refined · Confident",
    "previewColors": [
      "#28336B",
      "#3F4D8A",
      "#C9A85B",
      "#E7EAF5"
    ],
    "tokens": {
      "sidebar-bg": "radial-gradient(ellipse at 10% 8%,rgba(148,161,240,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(111,128,205,.08) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(218,190,123,.08) 0%,transparent 38%),linear-gradient(132deg,#28336B 0%,#3F4D8A 28%,#4B5CA0 58%,#5E66A3 82%,#354278 100%)",
      "sidebar-pattern-filter": "hue-rotate(175deg) saturate(.68) brightness(1.25)",
      "sidebar-ink": "#F4F5FF",
      "sidebar-muted": "#D4D9F3",
      "sidebar-border": "rgba(220,224,255,.32)",
      "side-group-bg": "linear-gradient(145deg,rgba(36,48,105,.38),rgba(50,60,117,.25))",
      "side-group-border": "rgba(218,224,255,.3)",
      "side-menu-1": "linear-gradient(110deg,#E6EAF8,#F5F6FC)",
      "side-menu-2": "linear-gradient(110deg,#E5E3F4,#F3F0FA)",
      "side-menu-3": "linear-gradient(110deg,#E2ECF7,#F2F7FC)",
      "side-menu-4": "linear-gradient(110deg,#F0E8D8,#FBF4E7)",
      "side-menu-ink": "#364271",
      "side-menu-border": "rgba(255,255,255,.9)",
      "side-menu-hover": "linear-gradient(110deg,#D9E0F5,#E8EAF8)",
      "side-menu-active": "linear-gradient(115deg,#E8D49A,#D5B96E)",
      "side-menu-active-ink": "#3C3760",
      "side-child-bg": "linear-gradient(145deg,rgba(246,247,253,.97),rgba(225,230,247,.94))",
      "side-child-ink": "#3F4D7B",
      "side-accent": "#D6BD79",
      "side-icon-bg": "#E3E8F8",
      "side-icon-ink": "#3F4D8A",
      "side-note-bg": "rgba(34,44,94,.27)",
      "side-search-bg": "rgba(239,242,255,.13)",
      "side-search-border": "rgba(220,224,255,.38)",
      "canvas-bg": "radial-gradient(ellipse at 84% 3%,rgba(116,129,196,.16),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(166,151,205,.12),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(206,176,111,.08),transparent 33%),linear-gradient(133deg,#EEF0F8 0%,#E7EAF5 48%,#E1E5F2 100%)",
      "canvas-ink": "#374268",
      "header-bg": "rgba(243,244,251,.96)",
      "header-border": "#CCD2E7",
      "header-control-bg": "#E2E6F4",
      "header-control-ink": "#3B4B83",
      "header-control-border": "#C4CDE5",
      "hero-bg": "linear-gradient(120deg,#F2F3FA 0%,#E0E5F4 56%,#EAECF7 100%)",
      "hero-border": "#C6CEE6",
      "card-bg": "linear-gradient(145deg,#FCFCFF 0%,#F0F1F9 100%)",
      "card-border": "#D1D7EA",
      "nested-bg": "linear-gradient(125deg,#E6E9F5,#F0F1F8)",
      "control-bg": "#FBFBFE",
      "text": "#374268",
      "muted": "#606C8B",
      "border": "#CDD3E7",
      "primary": "#3F4D8A",
      "primary-hover": "#303D75",
      "secondary": "#E4E8F5",
      "secondary-ink": "#3B4B83",
      "secondary-hover": "#D5DDF0",
      "accent": "#C9A85B",
      "accent-alt": "#7885C0",
      "focus": "#6879BB",
      "kpi-1": "linear-gradient(145deg,#E5E8F7,#D8DDF1)",
      "kpi-2": "linear-gradient(145deg,#F3EBD9,#EAE0C6)",
      "kpi-3": "linear-gradient(145deg,#E1EBF6,#D4E2F1)",
      "kpi-4": "linear-gradient(145deg,#ECE7F3,#E1DCEF)",
      "table-bg": "#FCFCFF",
      "table-head": "#E4E7F3",
      "table-row": "#FDFDFF",
      "table-alt": "#F0F1F8",
      "table-hover": "#E5E9F5",
      "chart-bg": "linear-gradient(145deg,#ECEEF8,#E1E5F2)",
      "chart-text": "#3D4A76",
      "chart-muted": "#6A7694",
      "chart-grid": "#D4D9EB",
      "chart-surface": "#FBFBFE",
      "tooltip-bg": "#FBFBFE",
      "leaf-filter": "hue-rotate(175deg) saturate(.68)"
    },
    "chartColors": [
      "#3F4D8A",
      "#C9A85B",
      "#7885C0",
      "#5D83A7",
      "#A28BB9",
      "#D39A79",
      "#6D7B9F",
      "#B58D59",
      "#819DB8",
      "#9A7797"
    ]
  }
,

  "forest-sage": {
    "id": "forest-sage",
    "name": "Forest Sage",
    "profile": "Natural · Grounded · Quiet",
    "previewColors": [
      "#294B3A",
      "#3F6B50",
      "#D7C48B",
      "#E8EDE1"
    ],
    "tokens": {
      "sidebar-bg": "radial-gradient(ellipse at 10% 8%,rgba(174,201,143,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(111,166,120,.08) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(210,190,130,.08) 0%,transparent 38%),linear-gradient(132deg,#294B3A 0%,#3F6B50 28%,#456D51 58%,#536F47 82%,#365B45 100%)",
      "sidebar-pattern-filter": "sepia(.28) hue-rotate(45deg) saturate(.78) brightness(1.18)",
      "sidebar-ink": "#F2F7E9",
      "sidebar-muted": "#D7E4C9",
      "sidebar-border": "rgba(221,239,202,.32)",
      "side-group-bg": "linear-gradient(145deg,rgba(30,73,50,.36),rgba(55,95,59,.25))",
      "side-group-border": "rgba(221,239,202,.3)",
      "side-menu-1": "linear-gradient(110deg,#E4ECDD,#F4F7EE)",
      "side-menu-2": "linear-gradient(110deg,#E9EBD8,#F7F5E9)",
      "side-menu-3": "linear-gradient(110deg,#DDEBE4,#F0F7F1)",
      "side-menu-4": "linear-gradient(110deg,#EFE8D5,#F9F4E6)",
      "side-menu-ink": "#355943",
      "side-menu-border": "rgba(255,255,255,.9)",
      "side-menu-hover": "linear-gradient(110deg,#D5E5D2,#E7EFDE)",
      "side-menu-active": "linear-gradient(115deg,#E7D9A9,#D7C48B)",
      "side-menu-active-ink": "#38452F",
      "side-child-bg": "linear-gradient(145deg,rgba(246,249,240,.97),rgba(224,236,220,.94))",
      "side-child-ink": "#3D6148",
      "side-accent": "#D7C48B",
      "side-icon-bg": "#E3EDDF",
      "side-icon-ink": "#3F6B50",
      "side-note-bg": "rgba(31,69,46,.26)",
      "side-search-bg": "rgba(237,247,229,.13)",
      "side-search-border": "rgba(221,239,202,.38)",
      "canvas-bg": "radial-gradient(ellipse at 84% 3%,rgba(115,158,108,.15),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(177,183,128,.13),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(142,171,147,.08),transparent 33%),linear-gradient(133deg,#F0F2E9 0%,#E8EDE1 48%,#E0E8D8 100%)",
      "canvas-ink": "#3B5140",
      "header-bg": "rgba(245,247,239,.96)",
      "header-border": "#D0DCC9",
      "header-control-bg": "#E4EBDD",
      "header-control-ink": "#3E634A",
      "header-control-border": "#C8D8C1",
      "hero-bg": "linear-gradient(120deg,#F4F6ED 0%,#E2EAD9 56%,#EBF0E3 100%)",
      "hero-border": "#CCD9C5",
      "card-bg": "linear-gradient(145deg,#FCFDF8 0%,#F0F4E9 100%)",
      "card-border": "#D2DEC9",
      "nested-bg": "linear-gradient(125deg,#E5EBDD,#F0F3E8)",
      "control-bg": "#FAFCF6",
      "text": "#3B5140",
      "muted": "#5F705D",
      "border": "#D0DCC8",
      "primary": "#3F6B50",
      "primary-hover": "#2D563E",
      "secondary": "#E1EADB",
      "secondary-ink": "#365A43",
      "secondary-hover": "#D2E1CB",
      "accent": "#91AA82",
      "accent-alt": "#A89B65",
      "focus": "#61896A",
      "kpi-1": "linear-gradient(145deg,#E1ECDA,#D2E3CB)",
      "kpi-2": "linear-gradient(145deg,#F0EEDC,#E6E4C9)",
      "kpi-3": "linear-gradient(145deg,#DDEBE5,#CFE1D8)",
      "kpi-4": "linear-gradient(145deg,#F0E7D9,#E6D9C7)",
      "table-bg": "#FCFDF8",
      "table-head": "#E4EBDD",
      "table-row": "#FDFEF9",
      "table-alt": "#F0F4E9",
      "table-hover": "#E1EBDD",
      "chart-bg": "linear-gradient(145deg,#EDF1E6,#E0E8D8)",
      "chart-text": "#425B47",
      "chart-muted": "#657762",
      "chart-grid": "#D5E0CD",
      "chart-surface": "#FAFCF6",
      "tooltip-bg": "#FAFCF6",
      "leaf-filter": "sepia(.22) hue-rotate(42deg) saturate(.72)"
    },
    "chartColors": [
      "#3F6B50",
      "#91AA82",
      "#A89B65",
      "#538B88",
      "#B47C62",
      "#6C8B74",
      "#C5A56A",
      "#55718A",
      "#9DAA88",
      "#9C7C8F"
    ]
  }
,

  "berry-rose": {
    "id": "berry-rose",
    "name": "Berry Rose",
    "profile": "Expressive · Soft · Sophisticated",
    "previewColors": [
      "#6F2D4B",
      "#923E62",
      "#D9A17F",
      "#F1E2E8"
    ],
    "tokens": {
      "sidebar-bg": "radial-gradient(ellipse at 10% 8%,rgba(232,160,185,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(187,104,146,.08) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(222,178,132,.08) 0%,transparent 38%),linear-gradient(132deg,#6F2D4B 0%,#923E62 28%,#A94D75 58%,#995B70 82%,#71384F 100%)",
      "sidebar-pattern-filter": "sepia(.22) hue-rotate(285deg) saturate(.66) brightness(1.2)",
      "sidebar-ink": "#FFF2F6",
      "sidebar-muted": "#F2D6E1",
      "sidebar-border": "rgba(255,223,235,.34)",
      "side-group-bg": "linear-gradient(145deg,rgba(94,36,66,.36),rgba(126,52,87,.25))",
      "side-group-border": "rgba(255,223,235,.3)",
      "side-menu-1": "linear-gradient(110deg,#F4E0E8,#FDF2F5)",
      "side-menu-2": "linear-gradient(110deg,#F4E5DC,#FDF4EB)",
      "side-menu-3": "linear-gradient(110deg,#EDE2F0,#F8F1F9)",
      "side-menu-4": "linear-gradient(110deg,#F6E3E6,#FFF4F3)",
      "side-menu-ink": "#713D56",
      "side-menu-border": "rgba(255,255,255,.92)",
      "side-menu-hover": "linear-gradient(110deg,#F0D3DF,#F8E3E9)",
      "side-menu-active": "linear-gradient(115deg,#F0C8A7,#E3B08E)",
      "side-menu-active-ink": "#5B3740",
      "side-child-bg": "linear-gradient(145deg,rgba(253,245,248,.97),rgba(242,224,235,.94))",
      "side-child-ink": "#74465D",
      "side-accent": "#E7B997",
      "side-icon-bg": "#F3E2E9",
      "side-icon-ink": "#923E62",
      "side-note-bg": "rgba(91,37,65,.26)",
      "side-search-bg": "rgba(255,240,246,.13)",
      "side-search-border": "rgba(255,223,235,.38)",
      "canvas-bg": "radial-gradient(ellipse at 84% 3%,rgba(192,116,151,.15),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(217,167,146,.12),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(166,124,170,.08),transparent 33%),linear-gradient(133deg,#F7EEF1 0%,#F1E2E8 48%,#EBDCE5 100%)",
      "canvas-ink": "#653C51",
      "header-bg": "rgba(250,242,245,.96)",
      "header-border": "#E4CCD7",
      "header-control-bg": "#F2E1E8",
      "header-control-ink": "#79435D",
      "header-control-border": "#DFBFCC",
      "hero-bg": "linear-gradient(120deg,#FCF4F6 0%,#F0DDE6 56%,#F7E9EC 100%)",
      "hero-border": "#E3C5D2",
      "card-bg": "linear-gradient(145deg,#FFFAFC 0%,#F7EAF0 100%)",
      "card-border": "#E5CFD9",
      "nested-bg": "linear-gradient(125deg,#F2E2E9,#F8EDF1)",
      "control-bg": "#FFFAFC",
      "text": "#653C51",
      "muted": "#8B6B7A",
      "border": "#E3CCD7",
      "primary": "#923E62",
      "primary-hover": "#78304F",
      "secondary": "#F0E0E8",
      "secondary-ink": "#79435D",
      "secondary-hover": "#E8CEDC",
      "accent": "#C47A96",
      "accent-alt": "#A789B6",
      "focus": "#AE5D7D",
      "kpi-1": "linear-gradient(145deg,#F1DDE6,#E9CCD9)",
      "kpi-2": "linear-gradient(145deg,#F5E8DD,#EED8C8)",
      "kpi-3": "linear-gradient(145deg,#EEE3F0,#E3D7E8)",
      "kpi-4": "linear-gradient(145deg,#F5E2E3,#EBD0D4)",
      "table-bg": "#FFFAFC",
      "table-head": "#F0E0E8",
      "table-row": "#FFFCFD",
      "table-alt": "#F7EAF0",
      "table-hover": "#F0DDE6",
      "chart-bg": "linear-gradient(145deg,#F5E9EE,#EBDCE5)",
      "chart-text": "#6C4358",
      "chart-muted": "#927483",
      "chart-grid": "#E7D3DE",
      "chart-surface": "#FFFAFC",
      "tooltip-bg": "#FFFAFC",
      "leaf-filter": "hue-rotate(285deg) saturate(.68)"
    },
    "chartColors": [
      "#923E62",
      "#C47A96",
      "#A789B6",
      "#D39B76",
      "#80547C",
      "#B96B72",
      "#9C8A6D",
      "#C987A6",
      "#73516B",
      "#D6B06D"
    ]
  }
,

  "coastal-blue": {
    "id": "coastal-blue",
    "name": "Coastal Blue",
    "profile": "Clear · Trustworthy · Coastal",
    "previewColors": [
      "#1F4B73",
      "#265E8D",
      "#D3B77D",
      "#E4EDF4"
    ],
    "tokens": {
      "sidebar-bg": "radial-gradient(ellipse at 10% 8%,rgba(137,190,223,.08) 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,rgba(83,155,202,.08) 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,rgba(221,195,140,.08) 0%,transparent 38%),linear-gradient(132deg,#1F4B73 0%,#265E8D 28%,#3477A2 58%,#3D708C 82%,#244F70 100%)",
      "sidebar-pattern-filter": "hue-rotate(190deg) saturate(.68) brightness(1.25)",
      "sidebar-ink": "#F0F7FC",
      "sidebar-muted": "#D0E4F1",
      "sidebar-border": "rgba(208,232,248,.34)",
      "side-group-bg": "linear-gradient(145deg,rgba(25,69,106,.36),rgba(45,95,130,.25))",
      "side-group-border": "rgba(208,232,248,.3)",
      "side-menu-1": "linear-gradient(110deg,#DFEBF5,#F2F7FB)",
      "side-menu-2": "linear-gradient(110deg,#E2EAF2,#F4F7FA)",
      "side-menu-3": "linear-gradient(110deg,#DCEEF0,#F0F8F8)",
      "side-menu-4": "linear-gradient(110deg,#F0E8D8,#FBF5E9)",
      "side-menu-ink": "#2F5778",
      "side-menu-border": "rgba(255,255,255,.92)",
      "side-menu-hover": "linear-gradient(110deg,#D0E2F0,#E3EEF6)",
      "side-menu-active": "linear-gradient(115deg,#E9D7A9,#D8BE80)",
      "side-menu-active-ink": "#29445C",
      "side-child-bg": "linear-gradient(145deg,rgba(245,249,253,.97),rgba(220,235,245,.94))",
      "side-child-ink": "#355F7D",
      "side-accent": "#D8BE80",
      "side-icon-bg": "#E1ECF6",
      "side-icon-ink": "#265E8D",
      "side-note-bg": "rgba(25,66,100,.26)",
      "side-search-bg": "rgba(233,245,252,.13)",
      "side-search-border": "rgba(208,232,248,.38)",
      "canvas-bg": "radial-gradient(ellipse at 84% 3%,rgba(92,150,190,.16),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(154,183,198,.13),transparent 36%),radial-gradient(ellipse at 88% 92%,rgba(210,183,128,.08),transparent 33%),linear-gradient(133deg,#EDF3F7 0%,#E4EDF4 48%,#DCE8F0 100%)",
      "canvas-ink": "#34516A",
      "header-bg": "rgba(243,248,251,.96)",
      "header-border": "#CBDCE8",
      "header-control-bg": "#E0EAF2",
      "header-control-ink": "#315E81",
      "header-control-border": "#C1D4E2",
      "hero-bg": "linear-gradient(120deg,#F4F8FB 0%,#DCEAF3 56%,#EAF2F7 100%)",
      "hero-border": "#C6D8E5",
      "card-bg": "linear-gradient(145deg,#FCFDFE 0%,#EDF4F8 100%)",
      "card-border": "#CDDEE8",
      "nested-bg": "linear-gradient(125deg,#E2EDF4,#EEF4F8)",
      "control-bg": "#FAFCFD",
      "text": "#34516A",
      "muted": "#596F82",
      "border": "#CBDCE7",
      "primary": "#265E8D",
      "primary-hover": "#1C4B75",
      "secondary": "#DFEAF2",
      "secondary-ink": "#315E81",
      "secondary-hover": "#D0E2ED",
      "accent": "#69A2CC",
      "accent-alt": "#D3B77D",
      "focus": "#4F86B1",
      "kpi-1": "linear-gradient(145deg,#DCE9F3,#CDDFED)",
      "kpi-2": "linear-gradient(145deg,#F1EBDD,#E7DFC9)",
      "kpi-3": "linear-gradient(145deg,#DCEFEB,#CDE4DF)",
      "kpi-4": "linear-gradient(145deg,#E4EAF3,#D6E0ED)",
      "table-bg": "#FCFDFE",
      "table-head": "#E0EAF2",
      "table-row": "#FEFFFF",
      "table-alt": "#EDF4F8",
      "table-hover": "#DDEAF3",
      "chart-bg": "linear-gradient(145deg,#EAF2F7,#DCE8F0)",
      "chart-text": "#395873",
      "chart-muted": "#60798D",
      "chart-grid": "#D1DFE9",
      "chart-surface": "#FAFCFD",
      "tooltip-bg": "#FAFCFD",
      "leaf-filter": "hue-rotate(190deg) saturate(.68)"
    },
    "chartColors": [
      "#265E8D",
      "#69A2CC",
      "#D3B77D",
      "#4B8C89",
      "#7B6F9F",
      "#B97864",
      "#53718C",
      "#A8C0CE",
      "#C28F5C",
      "#6D9F9C"
    ]
  }

};


ADMIN_COLOR_THEMES["merchant-fieldbook"]={
 id:"merchant-fieldbook",
 name:"The Merchant's Fieldbook",
 profile:"Editorial · Tactile · Distinctive",
 previewColors:["#263B35","#D4A34E","#C96F58","#F0EBDD"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["warm-harvest"].tokens,{
  "sidebar-bg":"#263B35","sidebar-pattern-filter":"none","sidebar-ink":"#F0EBDD","sidebar-muted":"#C3CBBE","sidebar-border":"rgba(240,235,221,.18)",
  "side-group-bg":"rgba(240,235,221,.07)","side-group-border":"rgba(240,235,221,.12)",
  "side-menu-1":"#E8E1D1","side-menu-2":"#EEE8DB","side-menu-3":"#E4E8DB","side-menu-4":"#F0E2D9",
  "side-menu-ink":"#31443A","side-menu-border":"rgba(255,253,247,.72)","side-menu-hover":"#FFFDF7","side-menu-active":"#D4A34E","side-menu-active-ink":"#263B35",
  "side-child-bg":"#F7F2E7","side-child-ink":"#3C5144","side-accent":"#E8BD70","side-icon-bg":"#E8E1D1","side-icon-ink":"#395347",
  "side-note-bg":"rgba(240,235,221,.08)","side-search-bg":"rgba(255,253,247,.08)","side-search-border":"rgba(240,235,221,.2)",
  "canvas-bg":"#F0EBDD","canvas-ink":"#263B35","header-bg":"rgba(248,245,235,.97)","header-border":"#D8D0BD","header-control-bg":"#EEE8DB","header-control-ink":"#33483D","header-control-border":"#D5CCB8",
  "hero-bg":"#FFFDF7","hero-border":"#D8D0BD","card-bg":"#FFFDF7","card-border":"#DED6C5","nested-bg":"#F0EBDD","control-bg":"#FFFDF7",
  "text":"#263B35","muted":"#6F756B","border":"#D8D0BD","primary":"#263B35","primary-hover":"#1D302A",
  "secondary":"#E9E3D4","secondary-ink":"#33483D","secondary-hover":"#DED5C1","accent":"#D4A34E","accent-alt":"#C96F58","focus":"#A9772C",
  "kpi-1":"#E5EADF","kpi-2":"#F5EBD5","kpi-3":"#F3E1D9","kpi-4":"#E8E3EC",
  "table-bg":"#FFFDF7","table-head":"#E8E1D1","table-row":"#FFFDF7","table-alt":"#F5F1E7","table-hover":"#EEE8DB",
  "chart-bg":"#F0EBDD","chart-text":"#35483D","chart-muted":"#74796E","chart-grid":"#D9D2C2","chart-surface":"#FFFDF7","tooltip-bg":"#FFFDF7","leaf-filter":"none"
 }),
 chartColors:["#263B35","#D4A34E","#C96F58","#81916C","#82758E","#567C84","#B28A59","#A65F51","#66806B","#B7A58B"]
};

ADMIN_COLOR_THEMES["glass-studio"]={
 id:"glass-studio",name:"Glass Studio",profile:"Frosted · Airy · Refined",
 previewColors:["#2B2A3D","#C79A5B","#D9E4EC","#F8FBFD"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["coastal-blue"].tokens,{
  "sidebar-bg":"linear-gradient(145deg,#2B2A3D 0%,#34455C 54%,#40546D 100%)",
  "sidebar-pattern-filter":"none","sidebar-ink":"#F4F7FA","sidebar-muted":"#CDD8E4","sidebar-border":"rgba(224,235,246,.28)",
  "side-group-bg":"rgba(255,255,255,.075)","side-group-border":"rgba(224,235,246,.16)",
  "side-menu-1":"linear-gradient(110deg,#EAF0F4,#F7FAFC)","side-menu-2":"linear-gradient(110deg,#E2EBF2,#F4F8FB)",
  "side-menu-3":"linear-gradient(110deg,#E8EEF3,#F8FAFC)","side-menu-4":"linear-gradient(110deg,#F0E9DD,#FBF7EF)",
  "side-menu-ink":"#2B3A4D","side-menu-border":"rgba(255,255,255,.86)","side-menu-hover":"linear-gradient(110deg,#DCE8F0,#EAF1F6)",
  "side-menu-active":"linear-gradient(115deg,#D9E4EC,#C9D9E6)","side-menu-active-ink":"#26374A",
  "side-child-bg":"linear-gradient(145deg,rgba(248,251,253,.98),rgba(225,235,243,.96))","side-child-ink":"#314B63",
  "side-accent":"#D4A75F","side-icon-bg":"#E3ECF3","side-icon-ink":"#385D80",
  "side-note-bg":"rgba(255,255,255,.07)","side-search-bg":"rgba(248,251,253,.11)","side-search-border":"rgba(224,235,246,.3)",
  "canvas-bg":"radial-gradient(ellipse at 86% 4%,rgba(199,154,91,.12),transparent 34%),radial-gradient(ellipse at 12% 34%,rgba(103,147,180,.12),transparent 36%),linear-gradient(135deg,#EAF0F4 0%,#E4EDF3 52%,#DDE8F0 100%)",
  "canvas-ink":"#2B3A4D","header-bg":"rgba(248,251,253,.78)","header-border":"rgba(184,201,216,.72)",
  "header-control-bg":"rgba(255,255,255,.72)","header-control-ink":"#344C63","header-control-border":"rgba(184,201,216,.78)",
  "hero-bg":"linear-gradient(120deg,rgba(255,255,255,.84),rgba(226,237,245,.78))","hero-border":"rgba(177,198,215,.76)",
  "card-bg":"rgba(255,255,255,.76)","card-border":"rgba(255,255,255,.88)","nested-bg":"rgba(229,238,245,.82)","control-bg":"rgba(255,255,255,.9)",
  "text":"#2B3A4D","muted":"#58697C","border":"#C9D7E2","primary":"#385D80","primary-hover":"#2B4866",
  "secondary":"#DDE8F0","secondary-ink":"#2B4866","secondary-hover":"#CFDDE8","accent":"#B3843E","accent-alt":"#6F98B7","focus":"#567FA4",
  "kpi-1":"linear-gradient(145deg,rgba(255,255,255,.84),rgba(220,233,242,.78))",
  "kpi-2":"linear-gradient(145deg,rgba(255,255,255,.84),rgba(241,231,214,.8))",
  "kpi-3":"linear-gradient(145deg,rgba(255,255,255,.84),rgba(221,235,239,.8))",
  "kpi-4":"linear-gradient(145deg,rgba(255,255,255,.84),rgba(229,231,242,.8))",
  "table-bg":"#F8FBFD","table-head":"#DFE9F0","table-row":"#FFFFFF","table-alt":"#F2F6F9","table-hover":"#E7EFF5",
  "chart-bg":"linear-gradient(145deg,#EAF1F6,#DCE7EF)","chart-text":"#364B60","chart-muted":"#586F83","chart-grid":"#CFDCE6",
  "chart-surface":"#F8FBFD","tooltip-bg":"#F8FBFD","leaf-filter":"none"
 }),
 chartColors:["#385D80","#C79A5B","#6F98B7","#5D8C91","#8A83A7","#C47D69","#6480A0","#9AABBA","#B18B5C","#708F83"]
};

ADMIN_COLOR_THEMES["glyph-signal"]={
 id:"glyph-signal",name:"Glyph Signal",profile:"Iconic · Minimal · Visual",
 previewColors:["#302B42","#A34E85","#E2C65D","#F5F0E8"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["warm-harvest"].tokens,{
  "sidebar-bg":"linear-gradient(155deg,#302B42 0%,#3C344F 54%,#4B3B58 100%)","sidebar-pattern-filter":"none",
  "sidebar-ink":"#F8F4FA","sidebar-muted":"#D7CEDF","sidebar-border":"rgba(245,240,248,.22)",
  "side-group-bg":"rgba(255,255,255,.055)","side-group-border":"rgba(245,240,248,.13)",
  "side-menu-1":"linear-gradient(110deg,#F1EAF4,#FBF7FA)","side-menu-2":"linear-gradient(110deg,#F5EAF0,#FCF7FA)",
  "side-menu-3":"linear-gradient(110deg,#EAE7F4,#F7F4FA)","side-menu-4":"linear-gradient(110deg,#F6F0DB,#FCF8E9)",
  "side-menu-ink":"#302B42","side-menu-border":"rgba(255,255,255,.88)","side-menu-hover":"linear-gradient(110deg,#F1DFEB,#F8EAF2)",
  "side-menu-active":"linear-gradient(115deg,#E9D27A,#E2C65D)","side-menu-active-ink":"#302B42",
  "side-child-bg":"linear-gradient(145deg,#FBF7FC,#EEE8F3)","side-child-ink":"#443B57",
  "side-accent":"#E2C65D","side-icon-bg":"#E9E3F3","side-icon-ink":"#674476",
  "side-note-bg":"rgba(255,255,255,.065)","side-search-bg":"rgba(255,255,255,.075)","side-search-border":"rgba(245,240,248,.2)",
  "canvas-bg":"radial-gradient(ellipse at 86% 3%,rgba(163,78,133,.10),transparent 34%),radial-gradient(ellipse at 12% 36%,rgba(155,139,206,.12),transparent 36%),linear-gradient(135deg,#F8F4EF 0%,#F5F0E8 54%,#EEE8E2 100%)",
  "canvas-ink":"#302B42","header-bg":"rgba(250,247,243,.96)","header-border":"#DDD4E2",
  "header-control-bg":"#EEE8F1","header-control-ink":"#463B58","header-control-border":"#D8CDDF",
  "hero-bg":"linear-gradient(125deg,#FFFCF8 0%,#F1EAF3 58%,#F7F0E8 100%)","hero-border":"#DDD1E2",
  "card-bg":"linear-gradient(145deg,#FFFDFA 0%,#F7F1F5 100%)","card-border":"#E0D6E3","nested-bg":"linear-gradient(125deg,#EFE9F3,#F7F1F5)","control-bg":"#FFFDFA",
  "text":"#302B42","muted":"#62596D","border":"#DDD4E2","primary":"#A34E85","primary-hover":"#843D6C",
  "secondary":"#EEE8F1","secondary-ink":"#453A57","secondary-hover":"#E3D9E9","accent":"#E2C65D","accent-alt":"#9B8BCE","focus":"#8B5D9A",
  "kpi-1":"linear-gradient(145deg,#F0E7F3,#E5D9ED)","kpi-2":"linear-gradient(145deg,#F7EED7,#F0E3BE)",
  "kpi-3":"linear-gradient(145deg,#E7F0EF,#DCEBE8)","kpi-4":"linear-gradient(145deg,#F5E7EF,#EEDBE8)",
  "table-bg":"#FFFDFA","table-head":"#EDE6F1","table-row":"#FFFDFA","table-alt":"#F6F1F6","table-hover":"#EEE6F0",
  "chart-bg":"linear-gradient(145deg,#F1EAF3,#EAE3EF)","chart-text":"#40364F","chart-muted":"#6A6173","chart-grid":"#DDD4E4",
  "chart-surface":"#FFFDFA","tooltip-bg":"#FFFDFA","leaf-filter":"none"
 }),
 chartColors:["#A34E85","#9B8BCE","#76A7A4","#E2C65D","#6F5A89","#C47BA2","#648E9B","#B49A63","#8071A9","#A96C5E"]
};
function makeExtendedAdminTheme(config){
 const p=config.palette;
 const lightGradient=(a,b)=>"linear-gradient(110deg,"+a+","+b+")";
 const tokens=Object.assign({},ADMIN_COLOR_THEMES["warm-harvest"].tokens,{
  "sidebar-bg":"radial-gradient(ellipse at 10% 8%,"+p.glow[0]+" 0%,transparent 34%),radial-gradient(ellipse at 91% 24%,"+p.glow[1]+" 0%,transparent 34%),radial-gradient(ellipse at 36% 94%,"+p.glow[2]+" 0%,transparent 38%),linear-gradient(132deg,"+p.sidebar.join(", ")+")",
  "sidebar-pattern-filter":p.pattern,
  "sidebar-ink":p.sideInk,"sidebar-muted":p.sideMuted,"sidebar-border":p.sideBorder,
  "side-group-bg":"linear-gradient(145deg,"+p.group[0]+","+p.group[1]+")","side-group-border":p.groupBorder,
  "side-menu-1":lightGradient(p.menu[0][0],p.menu[0][1]),"side-menu-2":lightGradient(p.menu[1][0],p.menu[1][1]),
  "side-menu-3":lightGradient(p.menu[2][0],p.menu[2][1]),"side-menu-4":lightGradient(p.menu[3][0],p.menu[3][1]),
  "side-menu-ink":p.menuInk,"side-menu-border":"rgba(255,255,255,.92)",
  "side-menu-hover":lightGradient(p.hover[0],p.hover[1]),"side-menu-active":lightGradient(p.active[0],p.active[1]),
  "side-menu-active-ink":p.activeInk,"side-child-bg":"linear-gradient(145deg,"+p.child[0]+","+p.child[1]+")",
  "side-child-ink":p.childInk,"side-accent":p.accent,"side-icon-bg":p.iconBg,"side-icon-ink":p.iconInk,
  "side-note-bg":p.note,"side-search-bg":p.search,"side-search-border":p.searchBorder,
  "canvas-bg":"radial-gradient(ellipse at 84% 3%,"+p.glow[1]+" 0%,transparent 34%),radial-gradient(ellipse at 12% 36%,"+p.glow[0]+" 0%,transparent 36%),radial-gradient(ellipse at 88% 92%,"+p.glow[2]+" 0%,transparent 33%),linear-gradient(133deg,"+p.canvas.join(", ")+")",
  "canvas-ink":p.text,"header-bg":p.header,"header-border":p.headerBorder,
  "header-control-bg":p.headerControl,"header-control-ink":p.headerControlInk,"header-control-border":p.headerControlBorder,
  "hero-bg":"linear-gradient(120deg,"+p.hero.join(", ")+")","hero-border":p.heroBorder,
  "card-bg":"linear-gradient(145deg,"+p.card[0]+" 0%,"+p.card[1]+" 100%)","card-border":p.cardBorder,
  "nested-bg":"linear-gradient(125deg,"+p.nested[0]+","+p.nested[1]+")","control-bg":p.control,
  "text":p.text,"muted":p.muted,"border":p.border,"primary":p.primary,"primary-hover":p.primaryHover,
  "secondary":p.secondary,"secondary-ink":p.secondaryInk,"secondary-hover":p.secondaryHover,
  "accent":p.accent,"accent-alt":p.accentAlt,"focus":p.focus,
  "kpi-1":"linear-gradient(145deg,"+p.kpi[0][0]+","+p.kpi[0][1]+")",
  "kpi-2":"linear-gradient(145deg,"+p.kpi[1][0]+","+p.kpi[1][1]+")",
  "kpi-3":"linear-gradient(145deg,"+p.kpi[2][0]+","+p.kpi[2][1]+")",
  "kpi-4":"linear-gradient(145deg,"+p.kpi[3][0]+","+p.kpi[3][1]+")",
  "table-bg":p.tableBg,"table-head":p.tableHead,"table-row":p.tableRow,"table-alt":p.tableAlt,"table-hover":p.tableHover,
  "chart-bg":"linear-gradient(145deg,"+p.chartBg[0]+","+p.chartBg[1]+")","chart-text":p.chartText,
  "chart-muted":p.chartMuted,"chart-grid":p.chartGrid,"chart-surface":p.chartSurface,
  "tooltip-bg":p.chartSurface,"leaf-filter":p.leafFilter
 });
 return {id:config.id,name:config.name,profile:config.profile,previewColors:config.previewColors,tokens,chartColors:config.chartColors};
}
const EXTENDED_ADMIN_THEME_CONFIGS=[{"id":"plum-amethyst","name":"Plum Amethyst","profile":"Creative · Refined · Expressive","previewColors":["#4B315D","#674476","#A789B6","#ECE4F0"],"chartColors":["#674476","#A789B6","#C58FA8","#6F8CA7","#D6B889","#8873A8","#7C9A93","#B77970","#59618E","#B3A0C2"],"palette":{"sidebar":["#4B315D","#5A3B70","#674476","#76538A","#523763"],"glow":["rgba(188,153,217,.10)","rgba(145,112,184,.08)","rgba(215,186,151,.07)"],"pattern":"hue-rotate(225deg) saturate(.68) brightness(1.22)","sideInk":"#F8F4FB","sideMuted":"#E5D9ED","sideBorder":"rgba(232,218,245,.34)","group":["rgba(54,35,73,.38)","rgba(79,51,101,.26)"],"groupBorder":"rgba(232,218,245,.3)","menu":[["#EAE2F0","#F7F2FA"],["#F5EDF5","#FCF7FB"],["#E8E6F2","#F4F2F9"],["#F3EADB","#FBF6EC"]],"menuInk":"#4B3C55","hover":["#DDD1E9","#EFE5F4"],"active":["#E5C99F","#D6B584"],"activeInk":"#403044","child":["rgba(250,247,252,.97)","rgba(234,225,243,.94)"],"childInk":"#534265","accent":"#A789B6","iconBg":"#E8E0EF","iconInk":"#674476","note":"rgba(48,31,65,.27)","search":"rgba(245,238,251,.13)","searchBorder":"rgba(232,218,245,.38)","canvas":["#F3EDF6","#ECE4F0","#E5DAEB"],"text":"#4B3F55","muted":"#6B5B75","header":"rgba(247,243,250,.96)","headerBorder":"#D9CDE3","headerControl":"#E8E0EF","headerControlInk":"#514260","headerControlBorder":"#D3C4E0","hero":["#F7F2FA","#E8DEEF","#F1EAF5"],"heroBorder":"#D6C9E1","card":["#FCF9FD","#F1EBF6"],"cardBorder":"#DDD2E7","nested":["#E9E2F0","#F3EDF6"],"control":"#FCF9FD","border":"#D9CDE3","primary":"#674476","primaryHover":"#4D335B","secondary":"#E9E2F0","secondaryInk":"#4D3A61","secondaryHover":"#DDD1E9","accentAlt":"#C58FA8","focus":"#80649A","kpi":[["#E9E0F1","#DDD2E9"],["#F2E7D9","#E9D8C6"],["#E4EAF3","#D8E1EF"],["#F0E5F0","#E6D7E9"]],"tableBg":"#FCF9FD","tableHead":"#E8E0EF","tableRow":"#FEFCFF","tableAlt":"#F1EBF6","tableHover":"#E6DCEB","chartBg":["#F0EAF5","#E4DCEB"],"chartText":"#584766","chartMuted":"#73657E","chartGrid":"#DCD2E5","chartSurface":"#FCF9FD","leafFilter":"hue-rotate(225deg) saturate(.62)"}},{"id":"copper-espresso","name":"Copper Espresso","profile":"Warm · Refined · Business","previewColors":["#633A29","#98542F","#C48A59","#F1E1D1"],"chartColors":["#98542F","#C48A59","#7E5946","#D5A66B","#6D7660","#A86C62","#4F6F82","#B18A72","#80634B","#D7BD99"],"palette":{"sidebar":["#633A29","#7A452E","#98542F","#91512F","#70442F"],"glow":["rgba(222,166,111,.10)","rgba(197,124,73,.08)","rgba(225,193,141,.07)"],"pattern":"sepia(.42) saturate(.88) hue-rotate(350deg) brightness(1.2)","sideInk":"#FFF5EA","sideMuted":"#EED8C8","sideBorder":"rgba(246,218,193,.34)","group":["rgba(79,43,29,.38)","rgba(113,63,39,.25)"],"groupBorder":"rgba(246,218,193,.3)","menu":[["#F3E4D7","#FFF6EC"],["#FBF0E5","#FFF9F1"],["#F1E2D5","#FAF0E6"],["#F6EBDD","#FCF5EA"]],"menuInk":"#5B3D2C","hover":["#EED8C5","#F7E8D9"],"active":["#E7C27C","#D6AA62"],"activeInk":"#553722","child":["rgba(255,249,242,.97)","rgba(241,225,211,.94)"],"childInk":"#684A38","accent":"#C48A59","iconBg":"#F2E3D5","iconInk":"#98542F","note":"rgba(73,42,29,.27)","search":"rgba(255,244,232,.13)","searchBorder":"rgba(246,218,193,.38)","canvas":["#F7EBDD","#F1E1D1","#EAD8C7"],"text":"#594333","muted":"#765F52","header":"rgba(249,241,232,.96)","headerBorder":"#E0C9B6","headerControl":"#F2E3D5","headerControlInk":"#75492F","headerControlBorder":"#DEC5B0","hero":["#FBF2E8","#EEDCCB","#F5E8DB"],"heroBorder":"#E1C9B6","card":["#FFF9F2","#F6EBDD"],"cardBorder":"#E5D0BC","nested":["#F0DED1","#F8EEE4"],"control":"#FFF9F2","border":"#E0C9B6","primary":"#98542F","primaryHover":"#783F25","secondary":"#F0DED1","secondaryInk":"#74462F","secondaryHover":"#E8CFBC","accentAlt":"#A87554","focus":"#A9663F","kpi":[["#F2E0D3","#EAD0BF"],["#F2E9D7","#E9DCC1"],["#E5E9DF","#D8E1D2"],["#F0E2D7","#E6D2C2"]],"tableBg":"#FFF9F2","tableHead":"#F0E0D1","tableRow":"#FFFCF7","tableAlt":"#F5EBDD","tableHover":"#EEDAC8","chartBg":["#F4E6D9","#EBD9C9"],"chartText":"#654A39","chartMuted":"#80695A","chartGrid":"#E2CFBE","chartSurface":"#FFF9F2","leafFilter":"sepia(.4) hue-rotate(350deg) saturate(.78)"}},{"id":"olive-citrus","name":"Olive Citrus","profile":"Natural · Classic · Composed","previewColors":["#48522B","#66713B","#AEA45A","#ECEBDD"],"chartColors":["#66713B","#AEA45A","#49745B","#B8794E","#596E78","#9A8350","#718A62","#A56F78","#4F6B5E","#C0A36A"],"palette":{"sidebar":["#48522B","#596233","#66713B","#6B763E","#545B31"],"glow":["rgba(190,190,116,.10)","rgba(145,159,91,.08)","rgba(213,194,111,.07)"],"pattern":"sepia(.25) hue-rotate(48deg) saturate(.82) brightness(1.18)","sideInk":"#F9FAEE","sideMuted":"#E1E5C7","sideBorder":"rgba(229,235,199,.34)","group":["rgba(53,64,33,.37)","rgba(78,91,42,.25)"],"groupBorder":"rgba(229,235,199,.3)","menu":[["#E7E9D5","#F7F7EA"],["#F2F0D9","#FBF9EA"],["#E1EBDD","#F2F7ED"],["#F1E8D3","#FAF4E6"]],"menuInk":"#495236","hover":["#DDE5C7","#EEF0D9"],"active":["#E3D27E","#D1BC66"],"activeInk":"#3D4228","child":["rgba(250,250,241,.97)","rgba(232,236,216,.94)"],"childInk":"#505C36","accent":"#AEA45A","iconBg":"#E7E9D5","iconInk":"#66713B","note":"rgba(49,60,30,.26)","search":"rgba(244,246,224,.13)","searchBorder":"rgba(229,235,199,.38)","canvas":["#F2F1E7","#ECEBDD","#E4E4D2"],"text":"#454D35","muted":"#68704F","header":"rgba(247,247,237,.96)","headerBorder":"#D9DBC6","headerControl":"#E4E5D1","headerControlInk":"#515B34","headerControlBorder":"#D0D3B8","hero":["#F7F6EB","#E4E5D2","#EFF0E2"],"heroBorder":"#D5D8C1","card":["#FCFCF4","#F1F1E3"],"cardBorder":"#D9DBC8","nested":["#E8E9D7","#F3F3E8"],"control":"#FCFCF4","border":"#D9DBC6","primary":"#66713B","primaryHover":"#4D582B","secondary":"#E8E9D7","secondaryInk":"#4A5630","secondaryHover":"#DDE0C8","accentAlt":"#85905A","focus":"#68743B","kpi":[["#E7EBD9","#D9E2CA"],["#F0EEDB","#E6E4C9"],["#E1ECE5","#D2E3D9"],["#F0E8D9","#E5D9C6"]],"tableBg":"#FCFCF4","tableHead":"#E6E7D3","tableRow":"#FEFFF9","tableAlt":"#F1F1E3","tableHover":"#E3E7D6","chartBg":["#F0F0E2","#E3E5D2"],"chartText":"#4D563B","chartMuted":"#687253","chartGrid":"#D8DCC5","chartSurface":"#FCFCF4","leafFilter":"sepia(.25) hue-rotate(48deg) saturate(.8)"}},{"id":"coral-peach","name":"Coral Peach","profile":"Warm · Friendly · Expressive","previewColors":["#8A3F39","#B95248","#E59C79","#F5E1D6"],"chartColors":["#B95248","#E59C79","#7D6A86","#557D8B","#C38A52","#8C5A53","#64866C","#A8749A","#5C6C9C","#D0B078"],"palette":{"sidebar":["#8A3F39","#99463E","#A34A40","#A34A40","#92463F"],"glow":["rgba(245,173,134,.10)","rgba(222,126,104,.08)","rgba(247,201,135,.07)"],"pattern":"sepia(.28) saturate(.9) hue-rotate(345deg) brightness(1.2)","sideInk":"#FFF5F0","sideMuted":"#F3DAD1","sideBorder":"rgba(255,225,215,.34)","group":["rgba(110,49,43,.37)","rgba(145,63,54,.25)"],"groupBorder":"rgba(255,225,215,.3)","menu":[["#F4E0D8","#FFF3EC"],["#FFF0E9","#FFF9F5"],["#F1E2E0","#FAF1EF"],["#F3E8DC","#FBF5ED"]],"menuInk":"#713F3A","hover":["#F0D6CC","#F9E7DF"],"active":["#F5C77D","#E9AE67"],"activeInk":"#563833","child":["rgba(255,250,246,.97)","rgba(244,225,217,.94)"],"childInk":"#744943","accent":"#E59C79","iconBg":"#F5E2DA","iconInk":"#A84D43","note":"rgba(105,46,41,.26)","search":"rgba(255,244,239,.13)","searchBorder":"rgba(255,225,215,.38)","canvas":["#F8E9E1","#F5E1D6","#EED7CC"],"text":"#65443F","muted":"#7F615B","header":"rgba(250,242,237,.96)","headerBorder":"#E7C9BE","headerControl":"#F2DDD4","headerControlInk":"#71443D","headerControlBorder":"#E4C1B5","hero":["#FCF2EC","#F0D9CF","#F7E6DD"],"heroBorder":"#E7C8BB","card":["#FFFAF6","#F8ECE6"],"cardBorder":"#E8D0C5","nested":["#F4E3DC","#FAF0EA"],"control":"#FFFAF6","border":"#E7C9BE","primary":"#B95248","primaryHover":"#963E37","secondary":"#F3DBD3","secondaryInk":"#6A3935","secondaryHover":"#EBCBC1","accentAlt":"#C77B68","focus":"#A54E43","kpi":[["#F4DFD8","#EECFC7"],["#F6E9D7","#EEDDC4"],["#E9E7EE","#DDDDE9"],["#F1E1DC","#E8D0C9"]],"tableBg":"#FFFAF6","tableHead":"#F0DCD4","tableRow":"#FFFCF9","tableAlt":"#F8ECE6","tableHover":"#F1DDD5","chartBg":["#F6E7DF","#EED9CF"],"chartText":"#704A44","chartMuted":"#846B64","chartGrid":"#E8D0C5","chartSurface":"#FFFAF6","leafFilter":"sepia(.3) saturate(.88) hue-rotate(345deg)"}}];
EXTENDED_ADMIN_THEME_CONFIGS.forEach(config=>{ADMIN_COLOR_THEMES[config.id]=makeExtendedAdminTheme(config);});
const corporateBaseTheme=ADMIN_COLOR_THEMES["ocean-calm"];
ADMIN_COLOR_THEMES["corporate-standard"]={
 ...corporateBaseTheme,
 id:"corporate-standard",
 name:"Corporate Standard",
 profile:"Traditional · Familiar · Business",
 previewColors:["#376A9B","#F4F6F8","#FFFFFF","#E4E7EC"],
 tokens:{
  ...corporateBaseTheme.tokens,
  "sidebar-bg":"#FFFFFF","sidebar-ink":"#344054","sidebar-muted":"#667085","sidebar-border":"#E4E7EC",
  "side-group-bg":"#F8FAFC","side-group-border":"#E4E7EC",
  "side-menu-1":"#F8FAFC","side-menu-2":"#F8FAFC","side-menu-3":"#F8FAFC","side-menu-4":"#F8FAFC",
  "side-menu-ink":"#475467","side-menu-border":"#E4E7EC","side-menu-hover":"#F2F4F7","side-menu-active":"#EAF1F8","side-menu-active-ink":"#244D73",
  "side-child-bg":"#F8FAFC","side-child-ink":"#475467","side-accent":"#376A9B","side-icon-bg":"#EEF2F6","side-icon-ink":"#526579",
  "side-note-bg":"#F2F4F7","side-search-bg":"#F8FAFC","side-search-border":"#D0D5DD",
  "canvas-bg":"#F4F6F8","canvas-ink":"#344054","header-bg":"#FFFFFF","header-border":"#E4E7EC","header-control-bg":"#F8FAFC","header-control-ink":"#475467","header-control-border":"#D0D5DD",
  "hero-bg":"#FFFFFF","hero-border":"#E4E7EC","card-bg":"#FFFFFF","card-border":"#E4E7EC","nested-bg":"#F8FAFC","control-bg":"#FFFFFF",
  "text":"#344054","muted":"#667085","border":"#E4E7EC","primary":"#376A9B","primary-hover":"#2D587F","secondary":"#EEF2F6","secondary-ink":"#475467","secondary-hover":"#E4E7EC","accent":"#527DA6","accent-alt":"#6B8299","focus":"#84A9CC",
  "kpi-1":"#FFFFFF","kpi-2":"#FFFFFF","kpi-3":"#FFFFFF","kpi-4":"#FFFFFF",
  "table-bg":"#FFFFFF","table-head":"#F8FAFC","table-row":"#FFFFFF","table-alt":"#FAFBFC","table-hover":"#F2F4F7",
  "chart-bg":"#FFFFFF","chart-text":"#344054","chart-muted":"#667085","chart-grid":"#E4E7EC","chart-surface":"#FFFFFF","tooltip-bg":"#FFFFFF","leaf-filter":"none"
 },
 chartColors:["#376A9B","#6B8299","#27815D","#B7791F","#7A6E9A","#D08A57","#527DA6","#667085","#4C9A8A","#A65A5A"]
};

ADMIN_COLOR_THEMES["golden-prestige"]={
 id:"golden-prestige",name:"Golden Prestige",profile:"Royal Gold · Refined · Premium",
 previewColors:["#303344","#8A642D","#D9BC82","#FFFDF8"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["warm-harvest"].tokens,{
 "sidebar-bg":"linear-gradient(145deg,#292B3B 0%,#303344 58%,#3B3C4D 100%)","sidebar-pattern-filter":"none","sidebar-ink":"#FFF9ED","sidebar-muted":"#E6D8BA","sidebar-border":"rgba(217,188,130,.28)",
 "side-group-bg":"rgba(255,249,237,.055)","side-group-border":"rgba(217,188,130,.18)","side-menu-1":"#F8F3E9","side-menu-2":"#F5EBD8","side-menu-3":"#F8F1E4","side-menu-4":"#F1E8D8",
 "side-menu-ink":"#4C4438","side-menu-border":"rgba(255,255,255,.92)","side-menu-hover":"#EFE3CC","side-menu-active":"linear-gradient(110deg,#E6D0A1,#D9BC82)","side-menu-active-ink":"#3B3020",
 "side-child-bg":"#FFFDF8","side-child-ink":"#554A39","side-accent":"#E6C98F","side-icon-bg":"#F2E8D4","side-icon-ink":"#805C27","side-note-bg":"rgba(255,249,237,.07)","side-search-bg":"rgba(255,249,237,.09)","side-search-border":"rgba(217,188,130,.3)",
 "canvas-bg":"linear-gradient(135deg,#F3F0E9 0%,#F7F4ED 54%,#EEE9DF 100%)","canvas-ink":"#303344","header-bg":"rgba(255,253,248,.97)","header-border":"#E5DCCB","header-control-bg":"#F5EBD8","header-control-ink":"#59472A","header-control-border":"#E2D2B2",
 "hero-bg":"linear-gradient(120deg,#FFFDF8 0%,#F5EBD8 100%)","hero-border":"#E5D8BE","card-bg":"#FFFDF8","card-border":"#E8E0D2","nested-bg":"#F6F1E7","control-bg":"#FFFFFF",
 "text":"#303344","muted":"#625F59","border":"#E3DCCF","primary":"#8A642D","primary-hover":"#705020","secondary":"#F2E8D5","secondary-ink":"#59472A","secondary-hover":"#E8D9BC","accent":"#B68A45","accent-alt":"#64758A","focus":"#9A702F",
 "kpi-1":"linear-gradient(145deg,#F7EEDB,#EFE0C1)","kpi-2":"linear-gradient(145deg,#F8F4EA,#EEE6D5)","kpi-3":"linear-gradient(145deg,#F3EBDD,#EADCC4)","kpi-4":"linear-gradient(145deg,#F0EEE8,#E6E2D8)",
 "table-bg":"#FFFDF8","table-head":"#F3EAD8","table-row":"#FFFDF8","table-alt":"#FAF6EE","table-hover":"#F1E7D4","chart-bg":"linear-gradient(145deg,#F6F0E5,#EEE6D7)","chart-text":"#3B3B46","chart-muted":"#68645D","chart-grid":"#E3DCCF","chart-surface":"#FFFDF8","tooltip-bg":"#FFFDF8","leaf-filter":"none"
 }),
 chartColors:["#8A642D","#B68A45","#64758A","#C5A66D","#52677C","#A77C43","#8794A1","#D0B77F","#6F6251","#B18C69"]
};


ADMIN_COLOR_THEMES["solar-journey"]={
 id:"solar-journey",name:"Solar Journey",profile:"Dynamic Day · Sunrise · Golden Hour",
 previewColors:["#F3D8C8","#E8F0F1","#D6A45C","#FFFDF8"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["warm-harvest"].tokens,{
  "sidebar-bg":"linear-gradient(150deg,#77554D 0%,#9B745A 100%)","sidebar-ink":"#FFF9F1","sidebar-muted":"#F2DCCB","sidebar-border":"rgba(255,249,241,.3)",
  "side-group-bg":"rgba(255,249,241,.1)","side-group-border":"rgba(255,249,241,.22)","side-menu-1":"#FFF5EC","side-menu-2":"#F9EBDD","side-menu-3":"#F5EAE2","side-menu-4":"#F2EAE1",
  "side-menu-ink":"#624B42","side-menu-border":"rgba(255,255,255,.92)","side-menu-hover":"#F4E1D3","side-menu-active":"linear-gradient(110deg,#F4D6A7,#E9BC7E)","side-menu-active-ink":"#5A402E",
  "side-child-bg":"#FFF9F3","side-child-ink":"#654F45","side-accent":"#EFC58F","side-icon-bg":"#F7E6D8","side-icon-ink":"#986448",
  "canvas-bg":"#F4ECE5","canvas-ink":"#51463F","header-bg":"rgba(255,250,245,.97)","header-border":"#E8D9CC","header-control-bg":"#F6EADF","header-control-ink":"#76513D","header-control-border":"#E4CFBE",
  "hero-bg":"linear-gradient(120deg,#FFF9F3,#F5E7DB)","hero-border":"#E8D8C9","card-bg":"#FFFDF9","card-border":"#E8DED4","nested-bg":"#F5EAE1","control-bg":"#FFFEFC",
  "text":"#51463F","muted":"#7C6F68","border":"#E6D8CE","primary":"#9D6348","primary-hover":"#824E3A","secondary":"#F3E4D8","secondary-ink":"#684B3D","secondary-hover":"#EBD7C8","accent":"#CD9555","accent-alt":"#718B98","focus":"#B87D55",
  "kpi-1":"#F7E8DF","kpi-2":"#F6EDDE","kpi-3":"#EAF0EF","kpi-4":"#F1E9E1",
  "table-bg":"#FFFDF9","table-head":"#F3E6DC","table-row":"#FFFDF9","table-alt":"#FAF2EC","table-hover":"#F1E1D5","chart-bg":"#F4EAE1","chart-text":"#5A4D45","chart-muted":"#82756D","chart-grid":"#E6D8CE","chart-surface":"#FFFDF9","tooltip-bg":"#FFFDF9","leaf-filter":"none"
 }),
 chartColors:["#9D6348","#CD9555","#718B98","#C27A61","#A6B8B5","#D7AF75","#7E695D","#B58B79","#6D93A2","#C4A59A"]
};
ADMIN_COLOR_THEMES["lunar-journey"]={
 id:"lunar-journey",name:"Lunar Journey",profile:"Dynamic Night · Moonlight · Midnight",
 previewColors:["#242E4C","#414B6D","#AAB6DA","#E6D9B8"],
 tokens:Object.assign({},ADMIN_COLOR_THEMES["royal-indigo"].tokens,{
  "sidebar-bg":"linear-gradient(150deg,#1F2946 0%,#303A5A 100%)","sidebar-ink":"#F2F4FC","sidebar-muted":"#CBD2E8","sidebar-border":"rgba(202,213,242,.25)",
  "side-group-bg":"rgba(226,232,250,.06)","side-group-border":"rgba(202,213,242,.18)","side-menu-1":"#3D4868","side-menu-2":"#404B6C","side-menu-3":"#424D6D","side-menu-4":"#394563",
  "side-menu-ink":"#F0F2FA","side-menu-border":"rgba(194,207,239,.16)","side-menu-hover":"#4A5678","side-menu-active":"linear-gradient(110deg,#66759D,#59698F)","side-menu-active-ink":"#FFFFFF",
  "side-child-bg":"#35415F","side-child-ink":"#E6EAF7","side-accent":"#D9C59D","side-icon-bg":"#465477","side-icon-ink":"#E0D1AE",
  "canvas-bg":"#2C3653","canvas-ink":"#EEF1FA","header-bg":"rgba(42,52,79,.97)","header-border":"#4D5A7B","header-control-bg":"#3B4768","header-control-ink":"#E9EDF9","header-control-border":"#58678B",
  "hero-bg":"linear-gradient(120deg,#3B4666,#333F5F)","hero-border":"#556184","card-bg":"#35415F","card-border":"#4E5B7C","nested-bg":"#303C5A","control-bg":"#303C5A",
  "text":"#EEF1FA","muted":"#C0C8DD","border":"#536080","primary":"#9EAFD9","primary-hover":"#B6C4E7","secondary":"#465273","secondary-ink":"#F0F2FA","secondary-hover":"#536184","accent":"#D7C39A","accent-alt":"#91A3CB","focus":"#9EAFD9",
  "kpi-1":"#3B4869","kpi-2":"#424C68","kpi-3":"#394A66","kpi-4":"#484964",
  "table-bg":"#313D5A","table-head":"#3D4969","table-row":"#34405D","table-alt":"#394563","table-hover":"#455273","chart-bg":"#303C59","chart-text":"#E8ECF8","chart-muted":"#BAC4DE","chart-grid":"#4E5B7B","chart-surface":"#34405D","tooltip-bg":"#27324F","leaf-filter":"none"
 }),
 chartColors:["#AFC0EA","#D8C69E","#8EACD0","#B59BCB","#86B6B2","#D5A17F","#91A3CB","#C5B2D5","#87A0B4","#D1B68B"]
};

const ADMIN_THEME_GROUPS=[
 {id:"standard",label:"Standard",description:"Traditional · familiar · straightforward",themeIds:["corporate-standard"]},
 {id:"modern",label:"Modern",description:"Expressive · contemporary",themeIds:["ocean-calm","berry-rose","plum-amethyst","coral-peach"]},
 {id:"balanced",label:"Balanced",description:"Premium · versatile · business",themeIds:["warm-harvest","royal-indigo","coastal-blue","copper-espresso"]},
 {id:"classic-comfort",label:"Classic Comfort",description:"Calm · familiar · easy on the eyes",themeIds:["forest-sage","olive-citrus"]},
 {id:"signature",label:"Signature",description:"Editorial · tactile · unmistakable",themeIds:["merchant-fieldbook","glass-studio","glyph-signal"]},
 {id:"premium",label:"Premium",description:"Royal · polished · prestigious",themeIds:["golden-prestige"]},
 {id:"celestial",label:"Celestial",description:"Time-aware · atmospheric · living sky",themeIds:["solar-journey","lunar-journey"]}
];
const ADMIN_THEME_CATEGORY_BY_ID=Object.fromEntries(ADMIN_THEME_GROUPS.flatMap(group=>group.themeIds.map(id=>[id,group.id])));
Object.values(ADMIN_COLOR_THEMES).forEach(theme=>{theme.category=ADMIN_THEME_CATEGORY_BY_ID[theme.id]||"balanced";});

const palette={navy:"#704E40",orange:"#D49537",blue:"#A94335",green:"#287A58",purple:"#9B6A8D",yellow:"#E0B45E",red:"#B24B3F",teal:"#C07A55",cream:"#FFF4E8",muted:"#8C7569"};
const colorSet=ADMIN_COLOR_THEMES["warm-harvest"].chartColors.slice();
const charts={};
let currentThemeId="warm-harvest";
function getCurrentColorTheme(){return ADMIN_COLOR_THEMES[currentThemeId]||ADMIN_COLOR_THEMES["warm-harvest"];}
function chartTheme(){
 const t=getCurrentColorTheme().tokens;
 return {text:t["chart-text"],muted:t["chart-muted"],grid:t["chart-grid"],surface:t["chart-surface"]};
}
function themeStorageKey(){return "hf_admin_color_theme:"+(String(currentUser?.id||"anonymous").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100)||"anonymous");}
function syncThemeStyles(themeId){
 const themeStyles=[
  {theme:"merchant-fieldbook",id:"hfMerchantFieldbookStylesheet",href:"./merchant-fieldbook.css?v=20261101-merchant-fieldbook-v1"},
  {theme:"glass-studio",id:"hfGlassStudioStylesheet",href:"./glass-studio.css?v=20261102-glass-studio-v1"},
   {theme:"glyph-signal",id:"hfGlyphSignalStylesheet",href:"./glyph-signal.css?v=20261102-glyph-signal-v3"},
  {theme:"corporate-standard",id:"hfCorporateStandardStylesheet",href:"./corporate-standard.css?v=20261102-corporate-standard-v1"},
  {theme:"golden-prestige",id:"hfGoldenPrestigeStylesheet",href:"./golden-prestige.css?v=20261102-golden-prestige-v1"},
  {theme:"solar-journey",id:"hfSolarJourneyStylesheet",href:"./solar-journey.css?v=20261102-solar-lunar-v1"},
  {theme:"lunar-journey",id:"hfLunarJourneyStylesheet",href:"./lunar-journey.css?v=20261102-solar-lunar-v1"}
 ];
 themeStyles.forEach(item=>{
  let link=document.getElementById(item.id);
  if(themeId===item.theme){
   if(!link){link=document.createElement("link");link.id=item.id;link.rel="stylesheet";document.head.appendChild(link);}
   if(link.getAttribute("href")!==item.href)link.setAttribute("href",item.href);
  }else if(link){link.remove();}
 });
}

function applyColorTheme(themeId,persist=true){
 const theme=ADMIN_COLOR_THEMES[themeId]||ADMIN_COLOR_THEMES["warm-harvest"];
 currentThemeId=theme.id;
 syncThemeStyles(theme.id);
 document.documentElement.dataset.hfTheme=theme.id;
 document.documentElement.dataset.adminTheme="light";
 Object.entries(theme.tokens).forEach(([key,value])=>document.documentElement.style.setProperty("--hf-theme-"+key,value));
 palette.navy=theme.tokens.text;palette.orange=theme.tokens.accent;palette.blue=theme.tokens.primary;palette.green="#287A58";palette.purple=theme.tokens["accent-alt"];palette.yellow=theme.tokens.accent;palette.red="#B24B3F";palette.teal=theme.tokens["accent-alt"];palette.cream=theme.tokens["control-bg"];palette.muted=theme.tokens.muted;
 colorSet.splice(0,colorSet.length,...theme.chartColors);
 if(persist){try{localStorage.setItem(themeStorageKey(),theme.id);}catch(_themeSaveError){}}
 syncChartsForTheme();
 const currentName=document.getElementById("hfThemeCurrentName");
 if(currentName)currentName.textContent=theme.name;
 const picker=document.getElementById("hfThemeGrid");
 if(picker)picker.querySelectorAll("[data-theme-choice]").forEach(button=>{
  const selected=button.dataset.themeChoice===theme.id;
  button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));
 });
 return theme;
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
 const base={responsive:true,maintainAspectRatio:false,animation:{duration:160},plugins:{
  legend:{labels:{color:t.text,usePointStyle:true,boxWidth:9,boxHeight:9,padding:18,font:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',size:11,weight:600}}},
  tooltip:{backgroundColor:getCurrentColorTheme().tokens["tooltip-bg"],titleColor:t.text,bodyColor:t.muted,borderColor:t.grid,borderWidth:1,cornerRadius:10,padding:12,displayColors:true,titleFont:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',weight:700},bodyFont:{family:'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'}}
 }};
 const opts={...base,...config.options,plugins:{...base.plugins,...(config.options?.plugins||{})}};
 charts[id]=new Chart(canvas,{...config,options:opts});
 window.HFAdminLanguage?.translateChart?.(charts[id]);
 return charts[id];
}
function syncChartsForTheme(){
 const t=chartTheme();const theme=getCurrentColorTheme();const tooltip=theme.tokens["tooltip-bg"];
 Object.values(charts).forEach(chart=>{
  if(chart.options.plugins?.legend?.labels)chart.options.plugins.legend.labels.color=t.text;
  if(chart.options.plugins?.tooltip){chart.options.plugins.tooltip.backgroundColor=tooltip;chart.options.plugins.tooltip.titleColor=t.text;chart.options.plugins.tooltip.bodyColor=t.muted;chart.options.plugins.tooltip.borderColor=t.grid;}
  if(chart.options.scales)Object.values(chart.options.scales).forEach(scale=>{
   if(scale.ticks)scale.ticks.color=t.muted;
   if(scale.grid&&scale.grid.display!==false)scale.grid.color=t.grid;
   if(scale.border)scale.border.color=t.grid;
  });
  const type=String(chart.config.type||"").toLowerCase();
  const multiColor=["pie","doughnut","polararea"].includes(type);
  chart.data.datasets.forEach((dataset,index)=>{
   const color=theme.chartColors[index%theme.chartColors.length];
   dataset.backgroundColor=multiColor?theme.chartColors:color;
   dataset.borderColor=multiColor?t.surface:color;
   if(dataset.pointBackgroundColor!==undefined)dataset.pointBackgroundColor=color;
   if(dataset.pointBorderColor!==undefined)dataset.pointBorderColor=t.surface;
   if(dataset.hoverBackgroundColor!==undefined)dataset.hoverBackgroundColor=multiColor?theme.chartColors:color;
  });
  chart.update("none");
 });
 if(window.Chart){Chart.defaults.color=t.text;Chart.defaults.plugins.tooltip.backgroundColor=tooltip;Chart.defaults.plugins.tooltip.titleColor=t.text;Chart.defaults.plugins.tooltip.bodyColor=t.muted;Chart.defaults.plugins.tooltip.borderColor=t.grid;}
}
async function paginateQuery(buildQuery,limit=1000){
 const rows=[],pageSize=1000,concurrency=3;
 const firstSize=Math.min(pageSize,limit);
 if(firstSize<=0)return rows;
 const first=await signedQuery(buildQuery().range(0,firstSize-1));
 rows.push(...first);
 if(first.length<firstSize)return rows;
 // Keep row order deterministic while avoiding one network round-trip per page.
 for(let base=pageSize;base<limit;base+=pageSize*concurrency){
  const offsets=[];
  for(let offset=base;offset<Math.min(limit,base+pageSize*concurrency);offset+=pageSize){
   offsets.push({offset,requested:Math.min(pageSize,limit-offset)});
  }
  const pages=await Promise.all(offsets.map(({offset,requested})=>
   signedQuery(buildQuery().range(offset,offset+requested-1))
  ));
  for(let index=0;index<pages.length;index++){
   const page=pages[index],requested=offsets[index].requested;
   rows.push(...page);
   if(page.length<requested)return rows;
  }
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
  let q=client.from("analytics_events").select("id,event_id,event_name,occurred_at,page_path,page_title,session_id,anonymous_id,item_id,item_name,item_category,value,quantity,search_term,source,medium,campaign,metadata").order("occurred_at",{ascending:false}).order("id",{ascending:false});
  if(range)q=rangeQuery(q,"occurred_at",range);
  return q;
 },limit);
}
async function fetchProducts(limit=10000){
 const [products,costs]=await Promise.all([
  paginateQuery(()=>client.from("products").select("id,name,slug,sku,category,category_slug,price,display_price,unit_type,image_url,stock_quantity,is_active,is_featured,sort_order,home_sort_order,short_description,full_description,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}),limit),
  paginateQuery(()=>client.from("admin_product_costs").select("product_id,cost_price,packaging_cost,low_stock_threshold,updated_by,updated_at").order("product_id",{ascending:true}),Math.max(limit,1000))
 ]);
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
  if(range){
   const from=range.fromDay??(range.from?range.from.slice(0,10):null);
   const to=range.toDay??(range.to?range.to.slice(0,10):null);
   q=rangeQuery(q,"entry_date",{from,to});
  }
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
  health:'<path d="M20.8 8.6c0 5.3-8.8 11-8.8 11s-8.8-5.7-8.8-11A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.8 1.8Z"/><path d="M3.5 12h4l2-3.5 3 7 2-3.5h6"/>',
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
  close:'<path d="m18 6-12 12M6 6l12 12"/>',

   edit:'<path d="m4 20 4.5-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/>',
   trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
   save:'<path d="M5 3h12l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
   refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-3l2 6M4 12l2 6a7 7 0 0 0 12-3"/>',
   download:'<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4"/>',
   upload:'<path d="M12 15V3m0 0 4 4m-4-4L8 7M4 17v4h16v-4"/>',
   filter:'<path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5L4 5Z"/>',
   eye:'<path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
   calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
   printer:'<path d="M6 8V3h12v5M6 17H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
   copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/>',
   send:'<path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
   truck:'<path d="M3 6h11v12H3zM14 10h4l3 4v4h-7z"/><circle cx="7.5" cy="19" r="2"/><circle cx="17.5" cy="19" r="2"/>',
   map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
   phone:'<path d="M7 3h3l2 5-2.5 1.5a14 14 0 0 0 5 5L16 12l5 2v3a3 3 0 0 1-3 3C10 20 4 14 4 6a3 3 0 0 1 3-3Z"/>',
   mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
   hash:'<path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18"/>',
   box:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 13l9 5 9-5M12 13v8"/>',
   more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
   wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h3"/>',
   chart:'<path d="M3 20V4M3 20h18M7 16v-4M12 16V7M17 16V9"/>',
   badge:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>'
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
  settings:'<path d="M17 4a4 4 0 0 1 4 3l2 1 3-.5 2 4-2 2v3l2 2-2 4-3-.5-2 1a4 4 0 0 1-8 0l-2-1-3 .5-2-4 2-2v-3l-2-2 2-4 3 .5 2-1a4 4 0 0 1 4-3Z" fill="#E9E5DC" stroke="#8B8377" stroke-width="1.7"/><circle cx="17" cy="15.5" r="4.5" fill="#FFFDF8" stroke="#8B8377" stroke-width="1.8"/>',
  wordpress:'<rect x="3" y="5" width="28" height="23" rx="3.5" fill="#E7EAF5" stroke="#53658F" stroke-width="1.8"/><path d="M3 11h28" stroke="#53658F" stroke-width="1.8"/><circle cx="8" cy="8" r="1" fill="#D4A34E"/><circle cx="12" cy="8" r="1" fill="#79A98B"/><path d="m11 16 3 8 3-6 3 6 3-8" fill="none" stroke="#53658F" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>'
 };
 return '<svg class="hf-nav-art" viewBox="0 0 34 34" aria-hidden="true" focusable="false">'+(art[name]||art.overview)+'</svg>';
}


let glyphSignalObserver=null;
function glyphSignalIconForLabel(value){
 const raw=String(value||"").toLowerCase().trim();
 const banglaRules=[
  [/অর্ডার|অর্ডারসমূহ/,"orders"],[/পণ্য|প্রোডাক্ট|ইনভেন্টরি|স্টক/,"products"],[/গ্রাহক|কাস্টমার|ব্যবহারকারী/,"customers"],
  [/ক্যাটাগরি|বিভাগ|ক্যাটালগ/,"layers"],[/অর্থ|ফাইন্যান্স|আয়|ব্যয়|ব্যালেন্স|বিক্রয়|বিক্রি/,"wallet"],
  [/রিপোর্ট|বিশ্লেষণ|অ্যানালিটিক্স|চার্ট|ভিজিট/,"chart"],[/মেসেজ|বার্তা|হোয়াটসঅ্যাপ|মেসেঞ্জার|চ্যাট/,"messages"],
  [/সেটিংস|নিরাপত্তা|কনফিগারেশন/,"settings"],[/সাহায্য|গাইড|সহায়তা/,"help"],
  [/খুঁজুন|সার্চ|অনুসন্ধান/,"search"],[/যোগ|নতুন|তৈরি|সংযোজন/,"plus"],[/সম্পাদনা|এডিট|পরিবর্তন|আপডেট/,"edit"],
  [/মুছুন|ডিলিট|অপসারণ|বাদ দিন/,"trash"],[/সংরক্ষণ|সেভ|জমা|নিশ্চিত|অনুমোদন/,"save"],
  [/বাতিল|বন্ধ|বের হোন/,"close"],[/রিফ্রেশ|পুনরায় লোড|সিঙ্ক/,"refresh"],[/ফিল্টার|ছাঁকনি|সাজান/,"filter"],
  [/ডাউনলোড|এক্সপোর্ট|রপ্তানি/,"download"],[/আপলোড|ইমপোর্ট|আমদানি/,"upload"],[/প্রিন্ট|মুদ্রণ|ইনভয়েস/,"printer"],
  [/কপি|অনুলিপি/,"copy"],[/দেখুন|প্রিভিউ|খুলুন|বিস্তারিত/,"eye"],[/পাঠান|প্রকাশ|শেয়ার/,"send"],
  [/কুরিয়ার|ডেলিভারি|শিপমেন্ট/,"truck"],[/তারিখ|ক্যালেন্ডার|সময়সূচি/,"calendar"],[/ফোন|মোবাইল|কল/,"phone"],
  [/ইমেইল|মেইল/,"mail"],[/ঠিকানা|এলাকা|অবস্থান/,"map"],[/অবস্থা|স্ট্যাটাস|সক্রিয়|অপেক্ষমাণ|পেন্ডিং/,"badge"],
  [/পরিমাণ|সংখ্যা|কাউন্ট/,"hash"],[/স্টক|ইনভেন্টরি|প্যাকেজ/,"box"],[/আরও|অ্যাকশন|অপশন/,"more"],
  [/পরবর্তী|সামনে|আগে|পেছনে/,"chevron"]
 ];
 const banglaMatch=banglaRules.find(rule=>rule[0].test(raw));
 if(banglaMatch)return banglaMatch[1];
 const label=raw.replace(/[＋+↻×✓→←]/g," ").replace(/[^a-z0-9৳\s&/-]/g," ").replace(/\s+/g," ").trim();
 const rules=[
  [/favorite|favourite|star/,"star"],[/\b(add|new|create)\b/,"plus"],[/\b(edit|change|update|modify)\b/,"edit"],
  [/\b(delete|remove|discard|archive)\b/,"trash"],[/\b(save|submit|confirm|approve|complete)\b/,"save"],
  [/\b(cancel|close|dismiss)\b/,"close"],[/\b(refresh|reload|sync|retry)\b/,"refresh"],[/\b(search|find)\b/,"search"],
  [/\b(filter|sort)\b/,"filter"],[/\b(download|export)\b/,"download"],[/\b(upload|import|attach)\b/,"upload"],
  [/\b(print|invoice|packing slip)\b/,"printer"],[/\b(copy|duplicate)\b/,"copy"],[/\b(view|preview|open|details|show)\b/,"eye"],
  [/\b(send|publish|share)\b/,"send"],[/\b(courier|shipment|shipping|delivery|dispatch)\b/,"truck"],[/\b(order|orders)\b/,"orders"],
  [/\b(product|products|item|items)\b/,"products"],[/\b(customer|customers|user|users)\b/,"customers"],[/\b(category|categories|catalog|catalogue)\b/,"layers"],
  [/\b(payment|finance|income|expense|cash|wallet|balance|revenue|sales)\b/,"wallet"],[/\b(report|analytics|chart|insight|traffic|views)\b/,"chart"],
  [/\b(message|messages|whatsapp|messenger|chat)\b/,"messages"],[/\b(setting|settings|config|security)\b/,"settings"],[/\b(help|guide)\b/,"help"],
  [/\b(date|calendar|schedule)\b/,"calendar"],[/\b(phone|call|mobile)\b/,"phone"],[/\b(email|mail)\b/,"mail"],[/\b(address|location|area)\b/,"map"],
  [/\b(status|state|verified|active|pending)\b/,"badge"],[/\b(quantity|qty|count|number)\b/,"hash"],[/\b(stock|inventory|package|box)\b/,"box"],
  [/\b(more|actions|options|menu)\b/,"more"],[/\b(next|forward|previous|back)\b/,"chevron"]
 ];
 const found=rules.find(rule=>rule[0].test(label));return found?found[1]:"";
}
function glyphSignalKeepName(element,label){
 if(!element.hasAttribute("aria-label")){element.setAttribute("aria-label",label);element.dataset.glyphAddedAria="1";}
 if(!element.hasAttribute("title")){element.setAttribute("title",label);element.dataset.glyphAddedTitle="1";}
}
function glyphSignalRestoreName(element){
 if(element.dataset.glyphAddedAria==="1")element.removeAttribute("aria-label");
 if(element.dataset.glyphAddedTitle==="1")element.removeAttribute("title");
 delete element.dataset.glyphAddedAria;delete element.dataset.glyphAddedTitle;
}
function glyphSignalDecorateNav(element){
 const text=(element.querySelector(".admin-nav-text")||element.querySelector(".admin-favorite-link>span:last-child")||element).textContent.trim();
 if(element.dataset.glyphNavEnhanced==="1"&&element.dataset.glyphNavLabel===text)return;
 if(element.dataset.glyphNavEnhanced==="1")glyphSignalRestoreName(element);
 if(text){glyphSignalKeepName(element,text);element.dataset.glyphNavLabel=text;element.dataset.glyphNavEnhanced="1";}
}
function glyphSignalUnwrapControl(element){
 const label=element.querySelector(":scope > .glyph-signal-label"),icon=element.querySelector(":scope > .glyph-signal-icon");
 if(label){while(label.firstChild)element.insertBefore(label.firstChild,label);label.remove();}
 if(icon)icon.remove();
 element.classList.remove("glyph-signal-control");delete element.dataset.glyphEnhanced;delete element.dataset.glyphLabel;delete element.dataset.glyphVisibleText;glyphSignalRestoreName(element);
}
function glyphSignalDecorateControl(element){
 if(element.dataset.glyphEnhanced==="1"&&element.querySelector("select,input"))glyphSignalUnwrapControl(element);
 if(element.querySelector("select,input"))return;
 if(element.dataset.glyphEnhanced==="1"){
  const current=element.querySelector(":scope > .glyph-signal-label");
  const visible=(current?current.textContent:element.textContent||"").replace(/\s+/g," ").trim();
  if(visible===String(element.dataset.glyphVisibleText||""))return;
  glyphSignalUnwrapControl(element);
 }
 const sourceText=element.dataset.glyphAddedAria==="1"?element.textContent:(element.getAttribute("aria-label")||element.getAttribute("title")||element.textContent||"");
 const text=String(sourceText||"").replace(/\s+/g," ").trim();
 const iconName=glyphSignalIconForLabel(text);if(!iconName)return;
 glyphSignalKeepName(element,text);element.dataset.glyphLabel=text;
 const existingIcon=[...element.children].find(child=>child.matches("svg,img")||child.querySelector("svg,img"));
 const label=document.createElement("span");label.className="glyph-signal-label";
 [...element.childNodes].forEach(node=>{if(!existingIcon||node!==existingIcon)label.appendChild(node);});
 if(existingIcon){element.append(label);}
 else{
  const iconWrap=document.createElement("span");iconWrap.className="glyph-signal-icon";iconWrap.setAttribute("aria-hidden","true");iconWrap.innerHTML=shellIcon(iconName);
  element.append(iconWrap,label);
 }
 element.classList.add("glyph-signal-control");element.dataset.glyphEnhanced="1";element.dataset.glyphVisibleText=(label.textContent||"").replace(/\\s+/g," ").trim();
}
function glyphSignalDecorateMetric(element){
 if(element.dataset.glyphMetric==="1"){
  const label=element.querySelector(":scope > .glyph-signal-label"),icon=element.querySelector(":scope > .glyph-signal-metric-icon");
  if(label&&icon)return;
  if(label){while(label.firstChild)element.insertBefore(label.firstChild,label);label.remove();}
  if(icon)icon.remove();delete element.dataset.glyphMetric;
 }
 const iconName=glyphSignalIconForLabel(element.textContent);if(!iconName)return;
 const label=document.createElement("span");label.className="glyph-signal-label";while(element.firstChild)label.appendChild(element.firstChild);
 const iconWrap=document.createElement("span");iconWrap.className="glyph-signal-metric-icon";iconWrap.setAttribute("aria-hidden","true");iconWrap.innerHTML=shellIcon(iconName);
 element.append(iconWrap,label);element.dataset.glyphMetric="1";
}
function glyphSignalDecorateHeading(element){
 if(element.dataset.glyphHeading==="1"||element.querySelector(".glyph-signal-heading-icon"))return;
 const text=element.textContent.trim(),iconName=glyphSignalIconForLabel(text);if(!iconName)return;
 glyphSignalKeepName(element,text);element.dataset.glyphLabel=text;
 const label=document.createElement("span");label.className="glyph-signal-label";while(element.firstChild)label.appendChild(element.firstChild);
 const iconWrap=document.createElement("span");iconWrap.className="glyph-signal-heading-icon";iconWrap.setAttribute("aria-hidden","true");iconWrap.innerHTML=shellIcon(iconName);
 element.append(iconWrap,label);element.dataset.glyphHeading="1";
}
function glyphSignalEnhance(root){
 if(!root||root.nodeType!==1)return;
 const nav=".admin-nav-link,.admin-nav-parent-toggle,.admin-nav-child-link,.admin-favorite-link";
 const controls="button,a.hf-button,a.hf-workspace-nav-item,.hf-tab,.hf-workspace-tab,.ops-subnav a";
 const metric=".hf-kpi-label,.cu-kpi-label,.cp-kpi-label,.hf-orders-stat-label";
 const process=element=>{
  if(element.matches(nav)){glyphSignalDecorateNav(element);}else if(element.matches(controls)){glyphSignalDecorateControl(element);}
  if(element.matches(metric))glyphSignalDecorateMetric(element);
  if(element.matches(".hf-table thead th"))glyphSignalDecorateHeading(element);
  element.querySelectorAll(nav).forEach(glyphSignalDecorateNav);
  element.querySelectorAll(controls).forEach(control=>{if(!control.matches(nav))glyphSignalDecorateControl(control);});
  element.querySelectorAll(metric).forEach(glyphSignalDecorateMetric);
  element.querySelectorAll(".hf-table thead th").forEach(glyphSignalDecorateHeading);
 };
 process(root);
}
function glyphSignalRestore(root){
 root.querySelectorAll("[data-glyph-enhanced]").forEach(element=>{
  const label=element.querySelector(":scope > .glyph-signal-label"),icon=element.querySelector(":scope > .glyph-signal-icon");
  if(label){while(label.firstChild)element.insertBefore(label.firstChild,label);label.remove();}
  if(icon)icon.remove();element.classList.remove("glyph-signal-control");delete element.dataset.glyphEnhanced;delete element.dataset.glyphLabel;glyphSignalRestoreName(element);
 });
 root.querySelectorAll("[data-glyph-metric]").forEach(element=>{
  const label=element.querySelector(":scope > .glyph-signal-label"),icon=element.querySelector(":scope > .glyph-signal-metric-icon");
  if(label){while(label.firstChild)element.insertBefore(label.firstChild,label);label.remove();}
  if(icon)icon.remove();delete element.dataset.glyphMetric;
 });
 root.querySelectorAll("[data-glyph-heading]").forEach(element=>{
  const label=element.querySelector(":scope > .glyph-signal-label"),icon=element.querySelector(":scope > .glyph-signal-heading-icon");
  if(label){while(label.firstChild)element.insertBefore(label.firstChild,label);label.remove();}
  if(icon)icon.remove();delete element.dataset.glyphHeading;delete element.dataset.glyphLabel;glyphSignalRestoreName(element);
 });
 root.querySelectorAll("[data-glyph-nav-enhanced]").forEach(element=>{glyphSignalRestoreName(element);delete element.dataset.glyphNavEnhanced;delete element.dataset.glyphNavLabel;});
}
function syncGlyphSignalMode(active){
 if(!adminApp)return;adminApp.classList.toggle("glyph-signal-mode",Boolean(active));
 if(!active){if(glyphSignalObserver){glyphSignalObserver.disconnect();glyphSignalObserver=null;}glyphSignalRestore(adminApp);return;}
 glyphSignalEnhance(adminApp);
 if(!glyphSignalObserver&&typeof MutationObserver==="function"){
  const watched=".admin-nav-link,.admin-nav-parent-toggle,.admin-nav-child-link,.admin-favorite-link,button,a.hf-button,a.hf-workspace-nav-item,.hf-tab,.hf-workspace-tab,.ops-subnav a,.hf-kpi-label,.cu-kpi-label,.cp-kpi-label,.hf-orders-stat-label,.hf-table thead th";
  glyphSignalObserver=new MutationObserver(records=>{
   const dirty=new Set();
   records.forEach(record=>{
    const target=record.target.nodeType===1?record.target:record.target.parentElement;
    if(target){const owner=target.closest?.(watched);dirty.add(owner||target);}
    record.addedNodes.forEach(node=>{if(node.nodeType===1)dirty.add(node);});
   });
   dirty.forEach(node=>glyphSignalEnhance(node));
  });
  glyphSignalObserver.observe(adminApp,{childList:true,subtree:true,characterData:true});
 }
}
function makeShell(){
 adminApp.classList.add("admin-app");
 const activePage=pageName==="messenger"?"messenger":pageName==="coupon-usage"?"coupons":(pageName.startsWith("products-")?"products":pageName);
 const menuGroups=[
  {label:"WORKSPACE",items:[["overview","overview","Overview","dashboard home start"]]},
  {label:"STORE MANAGEMENT",items:[["pos","pos","POS Management","offline pos point of sale offline sales import cash register"],["orders","orders","Orders","order order management customer orders"],["incomplete-orders","orders","Incomplete Orders","incomplete checkout abandoned cart order recovery leads"],["operations","operations","Operations","operation packing fulfillment"],["suppliers","layers","Suppliers","supplier vendors procurement purchase orders grn goods received supplier bills payment history payable ledger",[[ "supplier-add","plus","Add Supplier","supplier vendor add new directory contact registration" ],[ "supplier-purchases","orders","Purchase List","purchase orders procurement invoice goods received grn stock" ],[ "supplier-payments","finance","Payment History","supplier payments accounts payable ledger due bkash bank cash" ]]],["products","products","Products","product inventory stock sku barcode scanner reviews ratings",[['products-add','plus','Add Product','add new create product'],['products','products','All Products','all products catalogue inventory'],['products-barcode','barcode','Barcode Generation','barcode generate print scan qr'],['products-reviews','star','Product Reviews','customer product reviews ratings moderation']]],["categories","layers","Categories","catalog categories hierarchy subcategories product order drag drop merchandising"],["coupons","coupons","Coupons","coupon coupon codes discounts promotion campaigns marketing",[[ "coupons","coupons","Coupon Promotions","coupon promotions offer campaigns" ],[ "coupon-usage","analytics","Coupon Usage","coupon usage redemption orders customers discounts" ]]],["content","content","Website Content","content pages blog seo"]]},
  {label:"CUSTOMERS & MESSAGES",items:[["messages","messages","WhatsApp Inbox","whatsapp inbox customer chat messages"],["messenger","messenger","Messenger Inbox","facebook messenger messages social inbox"],["facebook-publishing","messenger","Facebook Publishing","facebook publishing posts social media schedule"],["meta-ads-review","finance","Meta Ads Review","meta ads advertising campaign paid media copy review draft"],["youtube-publishing","video","YouTube Publishing","youtube channel videos upload schedule"],["customers","customers","Customer Information","customer contact audience crm directory loyalty"],["customer-settings","settings","Customer Settings","customer segmentation tier vip special customer rules"],["marketing-center","messages","Customer Messages","customer messages customer support order updates email whatsapp service communication"],["ai-knowledge","messages","AI Knowledge Center","AI assistant knowledge center FAQ verified product profiles customer care response guidance"],["ai-conversations","messages","AI Conversations","AI customer care conversation history customer chat threads transcript review inbox"],["ai-feedback","chart","AI Training & Feedback","AI customer care feedback review corrections training dataset customer assistant"]]},
  {label:"INSIGHTS & FINANCE",items:[["analytics","analytics","Analytics","analytics insights website traffic marketing"],["finance","finance","Finance & Cash Flow","finance expenses income bookkeeping cash"],["business-health","health","Business Health","daily business questions sales profit cash flow stock inventory supplier payable operating performance product pricing calculator margin markup break even",[["business-health","health","Business Overview","business health daily business questions sales finance cash stock inventory"],["business-health-pricing","finance","Pricing & Profit Calculator","product pricing profit calculator landed cost break even margin markup"]]],["reports","reports","Reports","reports report export download csv business sales purchase customers receivable payable inventory stock finance expenses collection daily",[
    {label:"Business & Sales",items:[
     ["business","chart","ব্যবসা রিপোর্ট","Business overview","reports-business","business sales revenue order overview"],
     ["sales","chart","বিক্রয় রিপোর্ট","Sales performance","reports-business","sales performance order revenue"],
     ["product-sales","boxes","পণ্য বিক্রয় রিপোর্ট","Product sales","reports-business","product sales item quantity"],
     ["top-products","chart","সর্বাধিক বিক্রিত পণ্য","Top selling products","reports-business","top selling product ranking"],
     ["customer-wise-products","users","কাস্টমারভিত্তিক পণ্য বিক্রয়","Customer-wise product sales","reports-business","customer wise product sales"],
     ["customer-products","users","কাস্টমার পণ্য রিপোর্ট","Customer product report","reports-business","customer product report"]
    ]},
    {label:"Purchase & Supply",items:[
     ["purchase","shopping-bag","ক্রয় রিপোর্ট","Purchase history","reports-purchase","purchase orders procurement supplier"],
     ["product-purchase","boxes","ক্রয় পণ্য রিপোর্ট","Product purchase report","reports-purchase","product purchase quantity unit cost"]
    ]},
    {label:"Customer Reports",items:[
     ["top-customers","users","শীর্ষ কাস্টমার","Top customers","reports-customers","top customer ranking"],
     ["customers","users","কাস্টমার রিপোর্ট","Customer overview","reports-customers","customer overview order spending"],
     ["receivable","wallet","পাওনাদার রিপোর্ট","Customer receivables","reports-customers","receivable cod remittance customer due"]
    ]},
    {label:"Payables",items:[
     ["payable","wallet","দেনাদার রিপোর্ট","Supplier payables","reports-payables","supplier payable bill balance"]
    ]},
    {label:"Inventory Reports",items:[
     ["low-stock","boxes","স্বল্প স্টকের পণ্য","Low stock products","reports-inventory","low stock threshold inventory"],
     ["alert-products","chart","অ্যালার্ট পণ্য তালিকা","Stock alert products","reports-inventory","alert products stock warning"],
     ["stock","boxes","স্টক রিপোর্ট","Inventory valuation","reports-inventory","stock valuation inventory"],
     ["stock-list","boxes","স্টক লিস্ট","Current stock list","reports-inventory","stock list products"]
    ]},
    {label:"Financial Reports",items:[
     ["account-payments","finance","অ্যাকাউন্ট পেমেন্ট রিপোর্ট","Account payments","reports-finance","account payment method finance"],
     ["collections","wallet","কালেকশন তালিকা","Collections","reports-finance","collection cod courier remittance"],
     ["expenses","finance","খরচ রিপোর্ট","Expense report","reports-finance","expense ledger finance"],
     ["transactions","finance","লেনদেন রিপোর্ট","Transactions","reports-finance","financial transactions ledger"]
    ]},
    {label:"Daily Reports",items:[
     ["daily","calendar","দৈনিক ব্যবসায়িক রিপোর্ট","Daily business summary","reports-daily","daily business sales summary"]
    ]}
   ]]]},
  {label:"SYSTEM",items:[["website-publisher","settings","Website Publisher","website publisher deploy code review approve publish"],["tracking","sliders","Tracking Controls","tracking meta pixel conversions api capi google analytics event routing"],["settings","settings","Settings & Security","settings security preferences access"],["wordpress","layout","Website Studio","website studio live website test sandbox edit website visual builder preview test publish"]]}
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
   if(["products","coupons","suppliers","business-health","reports"].includes(item[0])&&Array.isArray(item[4])){
    const section=item[0],children=item[4];
    if(section==="reports"){
     const reportDefaults={"reports-business":"business","reports-purchase":"purchase","reports-customers":"top-customers","reports-payables":"payable","reports-inventory":"low-stock","reports-finance":"account-payments","reports-daily":"daily"};
     const activeReportType=new URLSearchParams(window.location.search).get("report")||reportDefaults[pageName]||"";
     const open=pageName==="reports"||pageName.startsWith("reports-");
     const childLinks=children.map(category=>'<div class="admin-nav-report-group" data-nav-report-group><div class="admin-nav-report-heading">'+esc(category.label)+'</div>'+category.items.map(report=>{
      const [type,icon,label,subtitle,workspace,keywords]=report;
      const href="./"+workspace+".html?report="+encodeURIComponent(type);
      const active=pageName===workspace&&activeReportType===type;
      const searchKeys=[category.label,label,subtitle,keywords,type,"reports report"].join(" ");
      return '<div class="admin-nav-item admin-nav-report-item" data-nav-item data-nav-keys="'+esc(searchKeys)+'"><a class="admin-nav-child-link admin-nav-report-link '+(active?"active":"")+'" href="'+esc(href)+'" data-report-nav-type="'+esc(type)+'" '+(active?'aria-current="page"':'')+'><span class="admin-nav-child-icon">'+shellIcon(icon)+'</span><span class="admin-nav-report-copy"><strong>'+esc(label)+'</strong><small>'+esc(subtitle)+'</small></span></a></div>';
     }).join("")+'</div>').join("");
     return '<div class="admin-nav-item admin-nav-parent-item" data-nav-item data-nav-keys="'+esc(item[3])+'"><div class="admin-nav-parent-row"><button class="admin-nav-link admin-nav-parent-toggle '+(open?"active":"")+'" type="button" data-nav-expand="'+section+'" aria-expanded="'+String(open)+'"><span class="nav-icon nav-icon-'+section+'">'+navPictureIcon(section)+'</span><span class="admin-nav-text">'+esc(item[2])+'</span><span class="admin-nav-expand-icon" aria-hidden="true">'+shellIcon("chevron")+'</span></button>'+favoriteStar(item[0],item[2])+'</div><div class="admin-nav-children admin-nav-report-children" data-nav-children="'+section+'" '+(open?"":"hidden")+'>'+childLinks+'</div></div>';
    }
    const open=children.some(child=>child[0]===pageName)||(section==="categories"&&pageName==="categories");
    const childLinks=children.map(child=>'<a class="admin-nav-child-link '+(child[0]===pageName?"active":"")+'" href="./'+child[0]+'.html" '+(child[0]===pageName?'aria-current="page"':'')+'><span class="admin-nav-child-icon">'+shellIcon(child[1])+'</span><span>'+esc(child[2])+'</span></a>').join("");
    return '<div class="admin-nav-item admin-nav-parent-item" data-nav-item data-nav-keys="'+esc(item[3])+'"><div class="admin-nav-parent-row"><button class="admin-nav-link admin-nav-parent-toggle '+(open?"active":"")+'" type="button" data-nav-expand="'+section+'" aria-expanded="'+String(open)+'"><span class="nav-icon nav-icon-'+section+'">'+navPictureIcon(section)+'</span><span class="admin-nav-text">'+esc(item[2])+'</span><span class="admin-nav-expand-icon" aria-hidden="true">'+shellIcon("chevron")+'</span></button>'+favoriteStar(item[0],item[2])+'</div><div class="admin-nav-children" data-nav-children="'+section+'" '+(open?"":"hidden")+'>'+childLinks+'</div></div>';
   }
   return '<div class="admin-nav-item" data-nav-item data-nav-keys="'+esc(item[3])+'"><a class="admin-nav-link '+(item[0]===activePage?"active":"")+'" href="'+(item[0]==="wordpress"?"./wordpress-live.html":"./"+item[0]+".html")+'" '+(item[0]===activePage?'aria-current="page"':'')+'><span class="nav-icon nav-icon-'+esc(item[0]==="marketing-center"?"messages":item[0]==="customer-settings"?"settings":item[0])+'">'+navPictureIcon(item[0]==="marketing-center"?"messages":item[0]==="customer-settings"?"settings":item[0])+'</span><span class="admin-nav-text">'+esc(item[2])+'</span></a>'+favoriteStar(item[0],item[2])+'</div>';
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
   '<div class="admin-sidebar-note"><div class="admin-sidebar-note-head"><span class="admin-test-indicator" aria-hidden="true"></span><strong>Live store operations</strong></div><p>Customer care, orders and catalog are connected to the live store workspace.</p></div>'+
  '</aside>'+
  '<button id="adminSidebarBackdrop" class="admin-sidebar-backdrop" type="button" aria-label="Close navigation" hidden></button>'+
  '<div class="admin-frame"><header class="admin-topbar">'+
   '<button id="adminMenuToggle" class="admin-menu-toggle" type="button" aria-label="Open navigation" aria-controls="adminSidebar" aria-expanded="false">'+shellIcon("menu")+'</button>'+
   '<div class="admin-global-search" role="search"><span class="admin-global-search-icon" aria-hidden="true">'+shellIcon("search")+'</span><input id="globalSearch" type="search" autocomplete="off" placeholder="Search this page’s records…" aria-label="Search records on this page"></div>'+
   '<span class="admin-topbar-spacer" aria-hidden="true"></span>'+
   '<div class="admin-topbar-actions">'+
    '<div class="hf-theme-control" id="hfThemeControl"><button class="admin-top-button hf-theme-picker-trigger" id="hfThemePickerToggle" type="button" aria-haspopup="dialog" aria-controls="hfThemePicker" aria-expanded="false" aria-label="Choose workspace color theme" title="Choose workspace color theme"><span class="topbar-button-icon" aria-hidden="true">◈</span><span class="topbar-label">Theme</span><span class="hf-theme-current-name" id="hfThemeCurrentName">Warm Harvest</span><span class="hf-theme-chevron" aria-hidden="true">⌄</span></button><section class="hf-theme-picker" id="hfThemePicker" role="dialog" aria-label="Choose workspace color theme" hidden><div class="hf-theme-picker-heading"><div><strong>Choose your theme</strong><p>Sidebar and workspace change together</p></div><button type="button" class="hf-theme-picker-close" id="hfThemePickerClose" aria-label="Close theme picker">×</button></div><div class="hf-theme-grid" id="hfThemeGrid"></div><div class="hf-theme-mode-control" id="hfThemeModeControl"><div class="hf-theme-mode-heading"><strong>Time-aware theme</strong><small id="hfCelestialStatus">Choose Auto, Day or Night</small></div><div class="hf-theme-mode-actions"><button type="button" data-hf-time-mode="auto" aria-pressed="false"><span aria-hidden="true">◷</span> Auto</button><button type="button" data-hf-time-mode="day" aria-pressed="false"><span aria-hidden="true">☀</span> Day</button><button type="button" data-hf-time-mode="night" aria-pressed="false"><span aria-hidden="true">☾</span> Night</button></div></div><p class="hf-theme-picker-footnote" id="hfThemePickerFootnote"></p></section></div>'+
    '<button class="admin-top-button admin-mode-toggle" id="modeToggle" type="button" title="Switch to advanced view"><span class="topbar-button-icon">'+shellIcon("sliders")+'</span><span class="topbar-label">Advanced view</span></button>'+
    '<button class="admin-top-button admin-help-toggle" id="helpBtn" type="button" title="Open quick guide"><span class="topbar-button-icon">'+shellIcon("help")+'</span><span class="topbar-label">Help</span></button>'+
   '</div>'+
   '<details class="admin-account-menu" id="adminAccountMenu"><summary class="admin-account-chip" aria-label="Open administrator account menu">'+
    '<span class="admin-account-avatar">'+avatarMarkup+'</span><span class="admin-account-meta"><strong>'+esc(displayName)+'</strong><small id="accountEmail">'+esc(emailValue)+'</small></span><span class="admin-account-chevron">'+shellIcon("chevron")+'</span>'+
   '</summary><div class="admin-account-dropdown"><div class="admin-account-dropdown-head"><span class="admin-account-dropdown-kicker">SIGNED IN</span><strong>'+esc(displayName)+'</strong><small>'+esc(emailValue)+'</small></div><a class="admin-account-settings-link" href="./settings.html">'+shellIcon("settings")+'<span>Settings &amp; security</span></a><button id="logoutBtn" class="admin-account-logout" type="button">'+shellIcon("logout")+'<span>Sign out</span></button></div></details>'+
  '</header><div class="hf-celestial-scene" id="hfCelestialScene" aria-hidden="true" hidden><svg class="hf-celestial-track" viewBox="0 0 1000 190" preserveAspectRatio="none"><path d="M35 156 Q500 -72 965 156"></path></svg><div class="hf-celestial-stars"></div><div class="hf-celestial-orb" id="hfCelestialOrb"><span class="hf-sun-glow"></span><svg viewBox="0 0 56 56" role="presentation"><circle class="hf-sun-disc" cx="28" cy="28" r="22"></circle><circle class="hf-moon-disc" cx="28" cy="28" r="25"></circle><circle class="hf-moon-shadow" id="hfMoonShadow" cx="28" cy="28" r="25"></circle></svg></div><div class="hf-celestial-horizon"></div></div><div class="admin-main" id="adminMain">'+initialContent+'</div></div>'+
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
   const link=row.querySelector(".admin-nav-link,.admin-nav-child-link");
   const haystack=((row.dataset.navKeys||"")+" "+(link?.textContent||"")).toLowerCase();
   const ownMatch=tokens.every(token=>haystack.includes(token));
   const nestedReportMatch=row.classList.contains("admin-nav-parent-item")&&[...row.querySelectorAll(".admin-nav-report-item")].some(child=>{
    const childLink=child.querySelector(".admin-nav-child-link");
    const childText=((child.dataset.navKeys||"")+" "+(childLink?.textContent||"")).toLowerCase();
    return tokens.every(token=>childText.includes(token));
   });
   const matched=ownMatch||nestedReportMatch;
   row.hidden=!matched;
   row.classList.toggle("is-search-match",matched&&tokens.length>0);
   link?.classList.remove("is-first");
   if(matched){matches++;matching.push(link);}
  });
  sidebar.querySelectorAll("[data-nav-report-group]").forEach(group=>{
   group.hidden=tokens.length>0&&![...group.querySelectorAll(".admin-nav-report-item")].some(item=>!item.hidden);
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
  const links=[...sidebar.querySelectorAll(".admin-nav-item:not([hidden]) .admin-nav-link,.admin-nav-item:not([hidden]) .admin-nav-child-link")];
  const first=links[0];
  if(event.key==="Enter"&&String(navSearchInput.value||"").trim()&&first){event.preventDefault();const target=first.matches("[data-nav-expand]")?(first.closest(".admin-nav-parent-row")?.parentElement?.querySelector(".admin-nav-report-item:not([hidden]) .admin-nav-child-link")||first.closest(".admin-nav-parent-row")?.parentElement?.querySelector(".admin-nav-child-link")):first;if(target?.href)location.href=target.href;}
  else if(event.key==="ArrowDown"&&first){event.preventDefault();first.focus();}
  else if(event.key==="Escape"&&navSearchInput.value){event.preventDefault();clearMenuSearch();}
 });
 sidebar.addEventListener("keydown",event=>{
  if(!["ArrowDown","ArrowUp"].includes(event.key))return;
  const link=event.target.closest?.(".admin-nav-link");
  if(!link||!String(navSearchInput?.value||"").trim())return;
  const links=[...sidebar.querySelectorAll(".admin-nav-item:not([hidden]) .admin-nav-link,.admin-nav-item:not([hidden]) .admin-nav-child-link")];
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
 const themeControl=document.getElementById("hfThemeControl");
 const themePicker=document.getElementById("hfThemePicker");
 const themePickerToggle=document.getElementById("hfThemePickerToggle");
 const themeGrid=document.getElementById("hfThemeGrid");
 const themePickerClose=document.getElementById("hfThemePickerClose");
 const renderThemePicker=()=>{
  if(!themeGrid)return;
  const buttonMarkup=theme=> {
   const selected=theme.id===currentThemeId;
   const swatches=theme.previewColors.map(color=>'<i style="background:'+esc(color)+'"></i>').join("");
   return '<button type="button" class="hf-theme-option'+(selected?' is-selected':'')+'" data-theme-choice="'+esc(theme.id)+'" aria-label="Select '+esc(theme.name)+' theme" aria-pressed="'+String(selected)+'"><span class="hf-theme-option-swatches">'+swatches+'</span><span class="hf-theme-option-copy"><strong>'+esc(theme.name)+'</strong><small>'+esc(theme.profile)+'</small></span><span class="hf-theme-option-check" aria-hidden="true">✓</span></button>';
  };
  themeGrid.innerHTML=ADMIN_THEME_GROUPS.map(group=>{
   const themes=group.themeIds.map(id=>ADMIN_COLOR_THEMES[id]).filter(Boolean);
   if(!themes.length)return "";
   return '<section class="hf-theme-group" aria-labelledby="hf-theme-group-'+esc(group.id)+'"><div class="hf-theme-group-heading"><strong id="hf-theme-group-'+esc(group.id)+'">'+esc(group.label)+'</strong><small>'+esc(group.description)+'</small></div><div class="hf-theme-group-options">'+themes.map(buttonMarkup).join("")+'</div></section>';
  }).join("");
  const footnote=document.getElementById("hfThemePickerFootnote");
  const total=Object.keys(ADMIN_COLOR_THEMES).length;
  if(footnote)footnote.textContent=total+" of "+total+" themes available · All themes are available to every administrator; your choice is saved to this browser for this account.";
 };
 let savedColorTheme="warm-harvest";try{savedColorTheme=localStorage.getItem(themeStorageKey())||"warm-harvest";}catch(_themeReadError){}
 if(!ADMIN_COLOR_THEMES[savedColorTheme])savedColorTheme="warm-harvest";
 applyColorTheme(savedColorTheme,true);renderThemePicker();
 const closeThemePicker=()=>{if(themePicker)themePicker.hidden=true;themePickerToggle?.setAttribute("aria-expanded","false");};
 const openThemePicker=()=>{if(!themePicker)return;themePicker.hidden=false;themePickerToggle?.setAttribute("aria-expanded","true");themePicker.querySelector("[data-theme-choice]")?.focus({preventScroll:true});};
 themePickerToggle?.addEventListener("click",()=>themePicker?.hidden?openThemePicker():closeThemePicker());
 themePickerClose?.addEventListener("click",closeThemePicker);
 themeGrid?.addEventListener("click",event=>{const choice=event.target.closest("[data-theme-choice]");if(!choice)return;if(window.HFCelestialEngine)window.HFCelestialEngine.selectTheme(choice.dataset.themeChoice);else applyColorTheme(choice.dataset.themeChoice,true);renderThemePicker();closeThemePicker();});
 document.addEventListener("click",event=>{if(themePicker&&!themePicker.hidden&&!themeControl?.contains(event.target))closeThemePicker();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&themePicker&&!themePicker.hidden){closeThemePicker();themePickerToggle?.focus({preventScroll:true});}});
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
 const celestialScript=document.createElement("script");celestialScript.src="./celestial-engine.js?v=20261102-solar-lunar-v1";celestialScript.onload=()=>window.HFCelestialEngine?.init({applyTheme:applyColorTheme,getCurrentTheme:()=>currentThemeId,getUserId:()=>currentUser?.id||"anonymous"});document.head.appendChild(celestialScript);
}

window.HFAdminReady=(async()=>{
 try{
  const {data,error}=await client.auth.getSession();
  if(error||!data?.session){location.replace("./index.html");return null;}
  const email=String(data.session.user?.email||"").toLowerCase();
  if(email!==ADMIN_EMAIL){await client.auth.signOut();location.replace("./index.html");return null;}
  const [aal,user]=await Promise.all([
   client.auth.mfa.getAuthenticatorAssuranceLevel(),
   client.auth.getUser()
  ]);
  if(aal.error||aal.data?.currentLevel!=="aal2"){location.replace("./index.html");return null;}
  currentUser=user.data?.user||data.session.user;
  makeShell();
  window.HFAdmin={client,ADMIN_EMAIL,esc,money,shortNum,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,slugify,dayISO,dateRangeFromControls,rangeQuery,showTableMessage,statusClass,makeStatus,makeEmpty,groupBy,dateKey,lastDateKeys,fetchOrders,fetchEvents,fetchProducts,fetchCategories,fetchPosts,fetchFinance,palette,colorSet,chartTheme,drawChart,charts,colorThemes:ADMIN_COLOR_THEMES,applyColorTheme,getCurrentColorTheme,syncChartsForTheme};
  return window.HFAdmin;
 }catch(err){console.error("Admin access check failed",err);gate.innerHTML='<div class="auth-gate-card"><strong>Secure sign-in could not be verified</strong><p>Please refresh and sign in again. No admin data was loaded.</p><p style="margin-top:14px"><a href="./index.html" class="hf-button hf-button-primary">Return to sign-in</a></p></div>';return null;}
})();
client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"&&!location.pathname.endsWith("/index.html"))location.replace("./index.html");});
})();
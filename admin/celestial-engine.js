
/* Halal Food dynamic solar/lunar theme engine. Local-only calculations; no API or network dependency. */
(() => {
"use strict";
if(window.HFCelestialEngine)return;
const locationConfig={latitude:21.99,longitude:90.24,timezone:"Asia/Dhaka",utcOffset:6};
let config=null,mode="theme",timer=null;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
function getDhakaParts(date){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:locationConfig.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
 const out={};parts.forEach(p=>{if(p.type!=="literal")out[p.type]=Number(p.value);});
 out.minutes=out.hour*60+out.minute+out.second/60;return out;
}
function solarTimes(y,m,d){
 const day=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/86400000),g=2*Math.PI/365*(day-1);
 const e=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const lat=locationConfig.latitude*Math.PI/180,zenith=90.833*Math.PI/180;
 const c=(Math.cos(zenith)/(Math.cos(lat)*Math.cos(dec)))-Math.tan(lat)*Math.tan(dec);
 const h=Math.acos(clamp(c,-1,1))*180/Math.PI;
 const noon=720-4*locationConfig.longitude-e+locationConfig.utcOffset*60;
 return {sunrise:noon-4*h,sunset:noon+4*h};
}
function shiftedDate(p,days){const d=new Date(Date.UTC(p.year,p.month-1,p.day+days));return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
function moonData(now){
 const synodic=29.530588853,epoch=Date.UTC(2000,0,6,18,14);
 const age=((now.getTime()-epoch)/86400000%synodic+synodic)%synodic,phase=age/synodic;
 const illumination=(1-Math.cos(phase*2*Math.PI))/2;
 let label="New Moon";
 if(phase>=.03&&phase<.22)label="Waxing Crescent";
 else if(phase>=.22&&phase<.28)label="First Quarter";
 else if(phase>=.28&&phase<.47)label="Waxing Gibbous";
 else if(phase>=.47&&phase<.53)label="Full Moon";
 else if(phase>=.53&&phase<.72)label="Waning Gibbous";
 else if(phase>=.72&&phase<.78)label="Last Quarter";
 else if(phase>=.78&&phase<.97)label="Waning Crescent";
 return {phase,illumination,label};
}

function injectBaseStyles(){
 if(document.getElementById("hfCelestialBaseStyles"))return;
 const style=document.createElement("style");style.id="hfCelestialBaseStyles";
 style.textContent=".hf-theme-mode-control{margin:12px 16px 4px;padding:13px 14px;border:1px solid var(--hf-theme-border,#E4E7EC);border-radius:14px;background:var(--hf-theme-card-bg,#FFFFFF)}.hf-theme-mode-heading{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}.hf-theme-mode-heading strong{font-size:12px;color:var(--hf-theme-text,#344054)}.hf-theme-mode-heading small{font-size:10px;line-height:1.45;color:var(--hf-theme-muted,#667085)}.hf-theme-mode-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.hf-theme-mode-actions button{min-height:35px;padding:7px 6px;border:1px solid var(--hf-theme-border,#D9DDE5);border-radius:9px;background:var(--hf-theme-control-bg,#FFFFFF);color:var(--hf-theme-text,#4E5669);font:inherit;font-size:11px;font-weight:650;cursor:pointer;transition:background .2s,border-color .2s,transform .2s}.hf-theme-mode-actions button:hover{transform:translateY(-1px)}.hf-theme-mode-actions button.is-active{background:var(--hf-theme-secondary,#E8EDF5);border-color:var(--hf-theme-accent,#8095B9);color:var(--hf-theme-secondary-ink,var(--hf-theme-text,#304665))}html[data-hf-celestial] .admin-sidebar,html[data-hf-celestial] .admin-topbar,html[data-hf-celestial] .admin-main .hf-card,html[data-hf-celestial] .admin-main .hf-kpi,html[data-hf-celestial] .hf-table{transition:background 45s ease,background-color 45s ease,border-color 45s ease,color 45s ease}";
 document.head.appendChild(style);
}
function hexRgb(hex){const h=hex.replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function rgbHex(rgb){return "#"+rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("");}
function mix(a,b,t){const x=hexRgb(a),y=hexRgb(b);return rgbHex(x.map((v,i)=>v+(y[i]-v)*t));}

const solarChartBase=["#9D6348","#CD9555","#718B98","#C27A61","#A6B8B5","#D7AF75","#7E695D","#B58B79","#6D93A2","#C4A59A"];
const lunarChartBase=["#AFC0EA","#D8C69E","#8EACD0","#B59BCB","#86B6B2","#D5A17F","#91A3CB","#C5B2D5","#87A0B4","#D1B68B"];
const solarStops=[
 {at:0,c:{canvas:"#F5E5DC",header:"#FFF6F0",card:"#FFFCF8",nested:"#F3E5DC",control:"#FFFEFC",text:"#59463F",muted:"#806E66",border:"#E7D4C9",primary:"#A45F48",primaryHover:"#884D3B",secondary:"#F2E1D6",secondaryInk:"#684B3D",accent:"#D18D55",focus:"#B87955",sidebar:"#755249",sideInk:"#FFF8F1",table:"#FFFDF9",tableHead:"#F2E3D9",tableAlt:"#FAF0E9",tableHover:"#F0DED3",chart:"#F5EAE2",chartText:"#5D4D45",chartMuted:"#82746C",chartGrid:"#E5D6CC"}},
 {at:.2,c:{canvas:"#EEF2EF",header:"#F8FCFA",card:"#FFFFFF",nested:"#E8F0ED",control:"#FCFFFD",text:"#41535A",muted:"#708087",border:"#D8E4E0",primary:"#557F91",primaryHover:"#42697A",secondary:"#DDEBE7",secondaryInk:"#3F6267",accent:"#CFA35F",focus:"#6D9AAB",sidebar:"#506E70",sideInk:"#F6FCF9",table:"#FFFFFF",tableHead:"#E3EFEB",tableAlt:"#F1F6F4",tableHover:"#DDECE7",chart:"#EAF2EF",chartText:"#445D62",chartMuted:"#75898B",chartGrid:"#D6E4DF"}},
 {at:.5,c:{canvas:"#E8F1F5",header:"#F9FCFE",card:"#FFFFFF",nested:"#E5EEF2",control:"#FFFFFF",text:"#3B5362",muted:"#6D8490",border:"#D5E2E9",primary:"#477B9E",primaryHover:"#356585",secondary:"#DFEAF0",secondaryInk:"#3D627A",accent:"#D0A354",focus:"#6094B0",sidebar:"#3D657F",sideInk:"#F4FAFD",table:"#FFFFFF",tableHead:"#E4EDF2",tableAlt:"#F3F7F9",tableHover:"#DDE9EF",chart:"#E9F1F5",chartText:"#3E5E70",chartMuted:"#718895",chartGrid:"#D5E2E9"}},
 {at:.8,c:{canvas:"#F0E8DC",header:"#FFF8EF",card:"#FFFCF6",nested:"#F1E5D7",control:"#FFFCF7",text:"#594A40",muted:"#807166",border:"#E6D7C8",primary:"#956744",primaryHover:"#7C5133",secondary:"#F0E2D1",secondaryInk:"#684C36",accent:"#C88D4D",focus:"#B57C4D",sidebar:"#685348",sideInk:"#FFF8EF",table:"#FFFCF7",tableHead:"#F0E2D3",tableAlt:"#F8F0E6",tableHover:"#EEDCCB",chart:"#F2E8DB",chartText:"#5F5145",chartMuted:"#85776C",chartGrid:"#E3D4C5"}},
 {at:1,c:{canvas:"#F0E1DD",header:"#FFF5F1",card:"#FFF9F5",nested:"#F2E1DB",control:"#FFFBF8",text:"#5D4747",muted:"#866F70",border:"#E8D0CB",primary:"#A45F58",primaryHover:"#874B48",secondary:"#F2DFDA",secondaryInk:"#704A47",accent:"#D58C61",focus:"#B96E61",sidebar:"#704B54",sideInk:"#FFF7F2",table:"#FFF9F5",tableHead:"#F1DFD9",tableAlt:"#F9EEEA",tableHover:"#EEDBD4",chart:"#F3E4DF",chartText:"#664D4D",chartMuted:"#897574",chartGrid:"#E6D1CA"}}
];
const lunarStops=[
 {at:0,c:{canvas:"#42465F",header:"#484E69",card:"#525975",nested:"#3D4562",control:"#3C4460",text:"#F1EDF4",muted:"#CFCCDC",border:"#6D718A",primary:"#C1B2D9",primaryHover:"#D1C6E5",secondary:"#59627F",secondaryInk:"#F4F1F8",accent:"#E1BE94",focus:"#B9B1DD",sidebar:"#323A58",sideInk:"#F4F2FA",table:"#414B68",tableHead:"#505A77",tableAlt:"#46516F",tableHover:"#596481",chart:"#3C4663",chartText:"#ECEAF5",chartMuted:"#C2C5D8",chartGrid:"#586381"}},
 {at:.22,c:{canvas:"#343E5C",header:"#3B4665",card:"#434F6E",nested:"#303B59",control:"#303B59",text:"#EEF2FB",muted:"#C4CDE0",border:"#596787",primary:"#AFC0E7",primaryHover:"#C1CEEF",secondary:"#4B5878",secondaryInk:"#EEF2FB",accent:"#D9C59A",focus:"#AFC0E7",sidebar:"#26324F",sideInk:"#F2F5FC",table:"#35415F",tableHead:"#465273",tableAlt:"#3B4867",tableHover:"#4A5878",chart:"#303B59",chartText:"#EAF0FB",chartMuted:"#C0CAE1",chartGrid:"#505E7D"}},
 {at:.5,c:{canvas:"#252F4C",header:"#2C3755",card:"#35415F",nested:"#2A3654",control:"#2A3654",text:"#EEF2FC",muted:"#C0CBE2",border:"#4D5B7C",primary:"#AFC2EE",primaryHover:"#C6D3F5",secondary:"#414E70",secondaryInk:"#F1F4FC",accent:"#D9C89F",focus:"#AFC2EE",sidebar:"#1D2946",sideInk:"#F3F5FC",table:"#2E3A58",tableHead:"#3C496A",tableAlt:"#344160",tableHover:"#435071",chart:"#293552",chartText:"#EAF0FC",chartMuted:"#BAC6E0",chartGrid:"#475675"}},
 {at:.8,c:{canvas:"#29324D",header:"#303A57",card:"#394561",nested:"#2E3956",control:"#2E3956",text:"#EDEFF8",muted:"#C1C7D9",border:"#515D78",primary:"#A8B8E0",primaryHover:"#BECAE9",secondary:"#46516E",secondaryInk:"#F0F2F9",accent:"#D2BD98",focus:"#A8B8E0",sidebar:"#222C47",sideInk:"#F1F3FA",table:"#323D59",tableHead:"#414D69",tableAlt:"#39445F",tableHover:"#4A5672",chart:"#2E3955",chartText:"#E9EDF7",chartMuted:"#BAC3DA",chartGrid:"#4B5874"}},
 {at:1,c:{canvas:"#45445C",header:"#4C4B66",card:"#565670",nested:"#41425E",control:"#41425E",text:"#F2EDF2",muted:"#D0C7D5",border:"#727087",primary:"#C0AED1",primaryHover:"#D4C3E1",secondary:"#605A77",secondaryInk:"#F5F0F6",accent:"#E1B998",focus:"#C0AED1",sidebar:"#34364F",sideInk:"#F6F0F6",table:"#454660",tableHead:"#54546F",tableAlt:"#4A4B66",tableHover:"#5D5E79",chart:"#40415D",chartText:"#F0EBF3",chartMuted:"#CCC4D5",chartGrid:"#6A6982"}}
];
function interpolated(stops,p){
 let a=stops[0],b=stops[stops.length-1];
 for(let i=0;i<stops.length-1;i++){if(p>=stops[i].at&&p<=stops[i+1].at){a=stops[i];b=stops[i+1];break;}}
 const t=clamp((p-a.at)/Math.max(.0001,b.at-a.at));const out={};
 Object.keys(a.c).forEach(k=>out[k]=mix(a.c[k],b.c[k],t));return out;
}
function setPalette(kind,progress){
 const c=interpolated(kind==="solar"?solarStops:lunarStops,clamp(progress));
 const tokenMap={canvas:"canvas-bg",header:"header-bg",card:"card-bg",nested:"nested-bg",control:"control-bg",text:"text",muted:"muted",border:"border",primary:"primary",primaryHover:"primary-hover",secondary:"secondary",secondaryInk:"secondary-ink",accent:"accent",focus:"focus",sideInk:"sidebar-ink",table:"table-bg",tableHead:"table-head",tableAlt:"table-alt",tableHover:"table-hover",chart:"chart-bg",chartText:"chart-text",chartMuted:"chart-muted",chartGrid:"chart-grid"};
 const theme=window.HFAdmin?.getCurrentColorTheme?.();
 Object.entries(tokenMap).forEach(([from,to])=>{const v=c[from];if(!v)return;if(theme)theme.tokens[to]=v;document.documentElement.style.setProperty("--hf-theme-"+to,v);});
 const sidebar="linear-gradient(150deg,"+c.sidebar+","+mix(c.sidebar,"#17233D",kind==="lunar"?.16:.12)+")";
 if(theme)theme.tokens["sidebar-bg"]=sidebar;document.documentElement.style.setProperty("--hf-theme-sidebar-bg",sidebar);
 const derived={"table-row":c.table,"chart-surface":c.card,"tooltip-bg":kind==="lunar"?"#29334F":c.card,"side-menu-1":kind==="lunar"?mix(c.card,"#FFFFFF",.045):mix(c.card,"#FFFFFF",.18),"side-menu-2":c.nested,"side-menu-ink":kind==="lunar"?"#EEF2FB":"#5F4A40","side-menu-hover":kind==="lunar"?mix(c.card,"#FFFFFF",.13):mix(c.card,c.accent,.16),"side-menu-active":kind==="lunar"?mix(c.primary,"#FFFFFF",.08):mix(c.accent,"#FFFFFF",.45),"side-menu-active-ink":kind==="lunar"?"#FFFFFF":"#5A4334","side-icon-bg":kind==="lunar"?mix(c.card,c.primary,.22):mix(c.card,c.accent,.2),"side-icon-ink":kind==="lunar"?"#E1D7F4":c.primary,"kpi-1":c.nested,"kpi-2":c.card,"kpi-3":c.nested,"kpi-4":c.card};
 Object.entries(derived).forEach(([k,v])=>{if(theme)theme.tokens[k]=v;document.documentElement.style.setProperty("--hf-theme-"+k,v);});
 const base=kind==="solar"?solarChartBase:lunarChartBase;const themeForCharts=window.HFAdmin?.getCurrentColorTheme?.();if(themeForCharts){themeForCharts.chartColors.splice(0,themeForCharts.chartColors.length,...base.map(color=>mix(color,c.accent,.08+.08*clamp(progress))));window.HFAdmin?.colorSet?.splice(0,window.HFAdmin.colorSet.length,...themeForCharts.chartColors);}
 const p=window.HFAdmin?.palette;if(p){p.navy=c.text;p.orange=c.accent;p.blue=c.primary;p.muted=c.muted;p.purple=c.primary;}
 window.HFAdmin?.syncChartsForTheme?.();
}
function timeLabel(minutes){const v=(Math.round(minutes)%1440+1440)%1440;return String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0");}
function updateButtons(){
 document.querySelectorAll("[data-hf-time-mode]").forEach(button=>{const active=button.dataset.hfTimeMode===mode;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));});
}
function update(){
 if(!config)return;
 if(mode==="theme"){
  const scene=document.getElementById("hfCelestialScene");if(scene){scene.hidden=true;scene.classList.remove("is-visible");}
  document.documentElement.removeAttribute("data-hf-celestial");const status=document.getElementById("hfCelestialStatus");if(status)status.textContent="Selected theme · Static palette";updateButtons();return;
 }
 const now=new Date(),local=getDhakaParts(now),today=solarTimes(local.year,local.month,local.day);
 const nextDate=shiftedDate(local,1),next=solarTimes(nextDate.year,nextDate.month,nextDate.day);
 const prevDate=shiftedDate(local,-1),prev=solarTimes(prevDate.year,prevDate.month,prevDate.day);
 const dayProgress=clamp((local.minutes-today.sunrise)/Math.max(1,today.sunset-today.sunrise));
 const nightProgress=local.minutes>=today.sunset?clamp((local.minutes-today.sunset)/Math.max(1,1440-today.sunset+next.sunrise)):clamp((1440-prev.sunset+local.minutes)/Math.max(1,1440-prev.sunset+today.sunrise));
 const isSolar=mode==="day"||(mode==="auto"&&local.minutes>=today.sunrise-28&&local.minutes<=today.sunset+32);
 const kind=isSolar?"solar":"lunar",themeId=isSolar?"solar-journey":"lunar-journey";
 if(config.getCurrentTheme()!==themeId)config.applyTheme(themeId,false);
 const progress=isSolar?dayProgress:nightProgress;
 setPalette(kind,progress);
 document.documentElement.dataset.hfCelestial=kind;
 document.documentElement.dataset.hfCelestialPhase=isSolar?(progress<.16?"sunrise":progress<.39?"morning":progress<.66?"midday":progress<.88?"golden-hour":"sunset"):(progress<.18?"twilight":progress<.39?"early-night":progress<.66?"midnight":progress<.88?"late-night":"pre-dawn");
 const scene=document.getElementById("hfCelestialScene"),orb=document.getElementById("hfCelestialOrb");
 if(scene){scene.hidden=false;scene.dataset.kind=kind;scene.classList.add("is-visible");}
 if(orb){orb.style.left=(6+88*progress).toFixed(2)+"%";orb.style.top=(124-Math.sin(Math.PI*progress)*99).toFixed(1)+"px";}
 const moon=moonData(now),shadow=document.getElementById("hfMoonShadow");
 if(shadow){const r=25,offset=moon.phase<=.5?-4*r*moon.phase:4*r*(1-moon.phase);shadow.setAttribute("cx",String(28+offset));shadow.setAttribute("opacity",String(Math.max(.04,1-moon.illumination)));}
 const status=document.getElementById("hfCelestialStatus");
 if(status)status.textContent=isSolar?"Solar time · Rise "+timeLabel(today.sunrise)+" · Set "+timeLabel(today.sunset):"Lunar time · "+moon.label+" · "+Math.round(moon.illumination*100)+"% illuminated";
 updateButtons();
}
function persistMode(){try{localStorage.setItem("hf_admin_celestial_mode:"+String(config.getUserId()||"anonymous").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100),mode);}catch(_){}}
function setMode(nextMode,persist=true){
 mode=["auto","day","night","theme"].includes(nextMode)?nextMode:"theme";
 if(persist)persistMode();
 if(mode==="day")config.applyTheme("solar-journey",true);
 else if(mode==="night")config.applyTheme("lunar-journey",true);
 update();
}
function selectTheme(themeId){
 if(themeId==="solar-journey"){setMode("day",true);return;}
 if(themeId==="lunar-journey"){setMode("night",true);return;}
 setMode("theme",true);config.applyTheme(themeId,true);
}
function init(options){
 config=options;injectBaseStyles();
 const key="hf_admin_celestial_mode:"+String(config.getUserId()||"anonymous").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100);
 let saved="theme";try{saved=localStorage.getItem(key)||"theme";}catch(_){}
 if(saved==="theme"&&config.getCurrentTheme()==="solar-journey")saved="day";
 if(saved==="theme"&&config.getCurrentTheme()==="lunar-journey")saved="night";
 mode=saved;
 document.getElementById("hfThemeModeControl")?.addEventListener("click",event=>{const button=event.target.closest("[data-hf-time-mode]");if(button)setMode(button.dataset.hfTimeMode,true);});
 if(mode==="day")config.applyTheme("solar-journey",false);
 else if(mode==="night")config.applyTheme("lunar-journey",false);
 update();
 if(timer)clearInterval(timer);timer=setInterval(update,60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)update();});
}
window.HFCelestialEngine={init,selectTheme,setMode,getMode:()=>mode,getMoonPhase:moonData};
})();

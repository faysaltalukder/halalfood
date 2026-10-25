(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const FUNCTION_NAME = "meta-ads-review";
const FUNCTION_ORIGIN = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
let H = null;
let state = null;
let accounts = [];
let selectedAccount = null;
let remoteCampaigns = [];
let remoteAds = [];
let draftRows = [];
let popup = null;
let busy = false;
let lastChecks = [];
let sourceMetaAdId = "";
let sourceMetaCampaignId = "";
const statusLabels = {
 draft:"Draft",ready_for_review:"Ready for review",changes_needed:"Changes needed",
 reviewed:"Reviewed here",ready_for_meta:"Ready to build in Meta",archived:"Archived"
};
function text(value,max=10000){return String(value??"").trim().slice(0,max)}
function setHint(message,isError=false){const el=$("marConnectHint");el.textContent=message;el.classList.toggle("error",isError);}
function setResult(message,isError=false){
 const el=$("marDraftResult");el.hidden=false;el.className="mar-result "+(isError?"error":"success");el.textContent=message;
}
function clearResult(){const el=$("marDraftResult");el.hidden=true;el.textContent="";el.className="mar-result";}
async function invoke(action,payload={}){
 const {data,error}=await H.client.functions.invoke(FUNCTION_NAME,{body:{action,...payload}});
 if(error){
  let message=error.message||"Meta Ads request failed.";
  try{if(error.context&&typeof error.context.json==="function"){const body=await error.context.json();if(body?.error)message=body.error;if(Array.isArray(body?.missing)&&body.missing.length)message+=" Missing server secret(s): "+body.missing.join(", ")+ ".";if(body?.providerCode)message+=" (Meta code "+body.providerCode+(body.providerSubcode?"/"+body.providerSubcode:"")+")";}}catch{}
  throw new Error(message);
 }
 if(!data?.success)throw new Error(data?.error||"Meta Ads request failed.");
 return data;
}
function fmtDate(value){return value?H.dateTime(value):"—";}
function metaMoney(minorUnits,currency){
 if(minorUnits===null||minorUnits===undefined||minorUnits==="")return "—";
 const value=Number(minorUnits)/100;
 if(!Number.isFinite(value))return "—";
 return (currency||"")+" "+value.toLocaleString("en-BD",{maximumFractionDigits:2});
}
function statusBadge(value){
 const raw=text(value,50)||"unknown";
 const tone=/ACTIVE|PUBLISHED|APPROVED/i.test(raw)?"active":/ERROR|DISAPPROVED|DISABLED|ARCHIVED/i.test(raw)?"cancelled":/PAUSED|WITH_ISSUES|PENDING|IN_PROCESS/i.test(raw)?"pending":"";
 return '<span class="hf-status '+(tone?"hf-status-"+tone:"hf-status-pending")+'">'+H.esc(raw.replace(/_/g," "))+"</span>";
}
function renderConfig(data){
 const c=data?.config||{};
 const items=[
  ["FACEBOOK_APP_ID","Meta App ID",c.appIdReady],
  ["FACEBOOK_APP_SECRET","Meta App Secret",c.appSecretReady],
  ["FACEBOOK_TOKEN_ENCRYPTION_KEY","Server token encryption key",c.encryptionKeyReady]
 ];
 $("marConfigList").innerHTML=items.map(row=>'<li class="'+(row[2]?"ready":"")+'">'+H.esc(row[1])+": "+(row[2]?"configured in Supabase":"not configured")+"</li>").join("");
 $("marRedirectUri").value=data?.redirectUri||c.redirectUri||"";
 const badge=$("marServerBadge");
 badge.textContent=data?.setupReady?"Server ready":"Server setup incomplete";
 badge.className="hf-status "+(data?.setupReady?"hf-status-active":"hf-status-pending");
 $("marConnectBtn").disabled=!data?.setupReady||busy;
 if(!data?.setupReady){
  const missing=Array.isArray(data?.missingConfig)?data.missingConfig:items.filter(x=>!x[2]).map(x=>x[0]);
  setHint("Add missing secret(s) in Supabase Edge Function Secrets, then refresh: "+missing.join(", ")+".",true);
 } else if(data?.connected){
  setHint("Meta Ads is connected. The granted permission is read-only; refresh accounts if needed.");
 } else {
  setHint("Server secrets are ready. Connect Meta Ads to grant read-only ads_read permission.");
 }
 $("marDisconnectBtn").disabled=!data?.connected||busy;
 $("marSyncAccounts").disabled=!data?.connected||busy;
 const scopes=Array.isArray(data?.grantedScopes)?data.grantedScopes:[];
 $("marPermissions").innerHTML='<div class="mar-permission-line"><span class="'+(scopes.includes("ads_read")?"check":"warn")+'">'+(scopes.includes("ads_read")?"✓":"!")+'</span><span><strong>ads_read</strong> — '+(scopes.includes("ads_read")?"granted":"not connected or not confirmed")+'</span></div><div class="mar-permission-line"><span class="check">✓</span><span><strong>Write access</strong> — not requested by this workspace.</span></div><div class="mar-permission-line"><span class="check">✓</span><span><strong>Token handling</strong> — server-side encryption; never shown in the browser.</span></div>';
}
function renderAccounts(data){
 accounts=Array.isArray(data?.accounts)?data.accounts:[];
 selectedAccount=data?.selectedAccount||accounts.find(a=>a.isSelected)||null;
 const select=$("marAccountSelect");
 select.innerHTML="";
 const first=document.createElement("option");first.value="";first.textContent=accounts.length?"Choose an ad account…":"No ad accounts loaded";select.append(first);
 for(const account of accounts){
  const option=document.createElement("option");
  option.value=account.accountId;
  const blocked=Number(account.accountStatus)!==1;
  option.textContent=account.name+" · "+account.accountId+(account.currency?" · "+account.currency:"")+(blocked?" · status "+account.accountStatus:"");
  option.selected=Boolean(account.isSelected);
  select.append(option);
 }
 select.disabled=!accounts.length||busy;
 $("marSelectAccount").disabled=!select.value||busy;
 $("marVerifyAccount").disabled=!selectedAccount||busy;
 $("marLoadCampaigns").disabled=!selectedAccount||busy;
 $("marLoadAds").disabled=!selectedAccount||busy;
 if(selectedAccount){
  $("marSelectedAccount").innerHTML='<strong>'+H.esc(selectedAccount.name)+'</strong><span>Account ID: '+H.esc(selectedAccount.accountId)+'</span><br><span>Currency: '+H.esc(selectedAccount.currency||"Not returned")+' · Time zone: '+H.esc(selectedAccount.timezoneName||"Not returned")+'</span><br><span>Account status code: '+H.esc(selectedAccount.accountStatus??"Not returned")+' · Last checked: '+H.esc(fmtDate(selectedAccount.lastVerifiedAt))+'</span>';
  $("marRemoteNotice").textContent="Read-only connection selected: "+selectedAccount.name+". Load campaigns or ads to inspect the records Meta returns.";
 }else{
  $("marSelectedAccount").textContent="No ad account selected.";
  $("marRemoteNotice").textContent=accounts.length?"Choose an ad account, then click Use selected account.":"Connect Meta Ads, then refresh ad accounts.";
 }
}
async function refreshStatus(){
 $("marRefreshAll").disabled=true;
 try{
  state=await invoke("status");renderConfig(state);renderAccounts(state);
 }catch(err){
  $("marServerBadge").textContent="Status unavailable";$("marServerBadge").className="hf-status hf-status-cancelled";
  setHint(err.message||"Could not read Meta Ads connection status.",true);
  H.toast(err.message||"Could not read Meta Ads connection status.","error");
 }finally{$("marRefreshAll").disabled=false;}
}
async function connectMeta(){
 const newPopup=window.open("about:blank","hfMetaAdsReviewOAuth","popup=yes,width=720,height=780,left=120,top=60");
 if(!newPopup){H.toast("The sign-in popup was blocked. Allow popups for this site and try again.","error");return;}
 popup=newPopup;$("marConnectBtn").disabled=true;
 try{const data=await invoke("connect");newPopup.location.href=data.authUrl;setHint("Finish Meta's permission screen. This request expires after 10 minutes.");}
 catch(err){try{newPopup.close();}catch{}H.toast(err.message||"Could not start Meta authorization.","error");setHint(err.message||"Could not start Meta authorization.",true);}
 finally{$("marConnectBtn").disabled=!(state?.setupReady)||busy;}
}
async function syncAccounts(){
 if(busy)return;busy=true;$("marSyncAccounts").disabled=true;
 try{const result=await invoke("sync_accounts");H.toast("Refreshed "+Number(result.accountsSynced||0)+" ad account(s).");await refreshStatus();}
 catch(err){H.toast(err.message||"Could not refresh ad accounts.","error");setHint(err.message||"Could not refresh accounts.",true);}
 finally{busy=false;renderConfig(state||{});renderAccounts(state||{});}
}
async function chooseAccount(){
 const accountId=$("marAccountSelect").value;
 if(!accountId){H.toast("Choose an ad account first.","error");return;}
 try{
  const result=await invoke("select_account",{accountId});H.toast("Selected account: "+(result.selectedAccount?.name||accountId));await refreshStatus();
 }catch(err){H.toast(err.message||"Could not select the ad account.","error");}
}
async function disconnectMeta(){
 if(!confirm("Disconnect Meta Ads from this review workspace? This removes the stored encrypted connection and cached account list from Supabase. It does not change your Meta ad account."))return;
 try{await invoke("disconnect");remoteCampaigns=[];remoteAds=[];renderCampaigns([]);renderAds([]);H.toast("Meta Ads disconnected.");await refreshStatus();}
 catch(err){H.toast(err.message||"Could not disconnect Meta Ads.","error");}
}
function statusLabel(key){return statusLabels[key]||key||"Draft";}
function filteredDrafts(){
 const query=text($("marDraftSearch").value,200).toLowerCase();
 const status=$("marStatusFilter").value;
 return draftRows.filter(row=>{
  if(status!=="all"&&row.review_status!==status)return false;
  if(!query)return true;
  return [row.draft_name,row.primary_text,row.headline,row.objective].some(v=>String(v||"").toLowerCase().includes(query));
 });
}
function renderDrafts(){
 const rows=filteredDrafts();const body=$("marDraftRows");
 if(!rows.length){body.innerHTML='<tr><td colspan="5" class="mar-empty">No saved drafts match this filter. Create and save an ad brief above.</td></tr>';}
 else{
  body.innerHTML=rows.map(row=>{
   const sub=(row.platform||"facebook")+" · "+(row.budget_amount!==null&&row.budget_amount!==undefined?(Number(row.budget_amount).toLocaleString("en-BD")+" "+(row.currency||"BDT")+" / "+(row.budget_period||"daily")):"budget not set");
   return '<tr><td><strong>'+H.esc(row.draft_name)+'</strong><small>'+H.esc(sub)+'</small></td><td>'+H.esc((row.objective||"—").replace(/_/g," "))+'</td><td>'+statusBadge(statusLabel(row.review_status))+'</td><td>'+H.esc(fmtDate(row.updated_at))+'</td><td><div class="mar-row-actions"><button class="hf-button hf-button-secondary" data-edit-draft="'+H.esc(row.id)+'" type="button">Open</button><button class="hf-button hf-button-secondary" data-copy-draft="'+H.esc(row.id)+'" type="button">Copy review packet</button><button class="hf-button hf-button-secondary" data-delete-draft="'+H.esc(row.id)+'" type="button">Delete</button></div></td></tr>';
  }).join("");
 }
 $("marDraftListNote").textContent="Showing "+rows.length+" of "+draftRows.length+" saved draft(s). Only the authenticated Halal Food administrator with MFA can access these records.";
}
async function loadDrafts(){
 const body=$("marDraftRows");body.innerHTML='<tr><td colspan="5" class="mar-empty">Loading drafts…</td></tr>';
 const {data,error}=await H.client.from("admin_ad_review_drafts").select("*").order("updated_at",{ascending:false}).limit(200);
 if(error){body.innerHTML='<tr><td colspan="5" class="mar-empty">Could not load drafts. '+H.esc(error.message)+'</td></tr>';$("marDraftListNote").textContent="Verify the Meta Ads review migration and admin MFA session.";return;}
 draftRows=data||[];renderDrafts();
}
function val(id){return text($(id).value)}
function localDatetimeToIso(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();}
function draftPayload(){
 const ageMin=Number($("marAgeMin").value),ageMax=Number($("marAgeMax").value);
 if(!Number.isInteger(ageMin)||!Number.isInteger(ageMax)||ageMin<18||ageMax>65||ageMax<ageMin)throw new Error("Enter a valid age range between 18 and 65.");
 const dest=val("marDestination"),creative=val("marCreativeUrl");
 if(dest&&!/^https?:\/\/[^\s]+$/i.test(dest))throw new Error("Destination URL must start with http:// or https://.");
 if(creative&&!/^https?:\/\/[^\s]+$/i.test(creative))throw new Error("Creative URL must start with http:// or https://.");
 const budget=val("marBudget");
 if(budget!==""&&(!Number.isFinite(Number(budget))||Number(budget)<0))throw new Error("Budget must be a number equal to or greater than zero.");
 return {
  draft_name:val("marDraftName"),platform:val("marPlatform"),objective:val("marObjective"),campaign_type:val("marCampaignType"),
  primary_text:val("marPrimaryText"),headline:val("marHeadline"),description:val("marDescription"),destination_url:dest,
  call_to_action:val("marCta"),creative_url:creative,creative_notes:val("marCreativeNotes"),audience_location:val("marLocation"),
  age_min:ageMin,age_max:ageMax,audience_interests:val("marInterests"),placements:val("marPlacements"),
  budget_amount:budget===""?null:Number(budget),budget_period:val("marBudgetPeriod"),currency:"BDT",
  schedule_start_at:localDatetimeToIso(val("marStart")),schedule_end_at:localDatetimeToIso(val("marEnd")),
  review_status:val("marReviewStatus")||"draft",review_notes:val("marReviewNotes"),checklist:lastChecks.reduce((out,row)=>{out[row.key]={level:row.level,title:row.title,message:row.message};return out;},{}),
  meta_ad_account_id:selectedAccount?.accountId||null,meta_campaign_id:sourceMetaCampaignId||null,meta_ad_id:sourceMetaAdId||null,
  updated_by:H.ADMIN_EMAIL,updated_at:new Date().toISOString()
 };
}
function fillForm(row){
 $("marDraftId").value=row.id||"";
 for(const [id,key] of [["marDraftName","draft_name"],["marPlatform","platform"],["marObjective","objective"],["marCampaignType","campaign_type"],["marPrimaryText","primary_text"],["marHeadline","headline"],["marDescription","description"],["marCta","call_to_action"],["marDestination","destination_url"],["marCreativeUrl","creative_url"],["marCreativeNotes","creative_notes"],["marLocation","audience_location"],["marAgeMin","age_min"],["marAgeMax","age_max"],["marInterests","audience_interests"],["marPlacements","placements"],["marBudget","budget_amount"],["marBudgetPeriod","budget_period"],["marReviewStatus","review_status"],["marReviewNotes","review_notes"]]){
  if($(id))$(id).value=row[key]===null||row[key]===undefined?"":row[key];
 }
 const localValue=iso=>iso?new Date(iso).getTime()&&!Number.isNaN(new Date(iso).getTime())?new Date(new Date(iso).getTime()-new Date(iso).getTimezoneOffset()*60000).toISOString().slice(0,16):"": "";
 $("marStart").value=localValue(row.schedule_start_at);$("marEnd").value=localValue(row.schedule_end_at);
 sourceMetaAdId=row.meta_ad_id||"";sourceMetaCampaignId=row.meta_campaign_id||"";
 $("marDraftMode").textContent=row.id?"Editing saved draft":"New draft";
 $("marDraftMode").className="hf-status "+(row.id?"hf-status-active":"hf-status-pending");
 $("marPrimaryCount").textContent=String(val("marPrimaryText").length);
 lastChecks=Array.isArray(row.checklist)?row.checklist:[];
 renderPreflight(lastChecks);
 $("marDraftBuilder").scrollIntoView({behavior:"smooth",block:"start"});
 clearResult();
}
function newDraft(){
 $("marDraftForm").reset();$("marDraftId").value="";$("marPlatform").value="facebook";$("marObjective").value="traffic";$("marCampaignType").value="manual";$("marCta").value="LEARN_MORE";$("marLocation").value="Bangladesh";$("marAgeMin").value="18";$("marAgeMax").value="65";$("marPlacements").value="Advantage+ placements";$("marBudgetPeriod").value="daily";$("marReviewStatus").value="draft";
 $("marPrimaryCount").textContent="0";$("marDraftMode").textContent="New draft";$("marDraftMode").className="hf-status hf-status-pending";sourceMetaAdId="";sourceMetaCampaignId="";lastChecks=[];renderPreflight([]);clearResult();
}
function buildChecks(d){
 const checks=[];
 const add=(key,level,title,message)=>checks.push({key,level,title,message});
 add("name",d.draft_name?"pass":"risk","Draft name",d.draft_name?"A name is set so this brief can be identified.":"Give the draft a descriptive name.");
 add("primary_text",d.primary_text.length>=30?"pass":d.primary_text.length?"warn":"risk","Primary text",d.primary_text.length>=30?"Main ad text is present.":d.primary_text.length?"Copy is very short; make sure the offer and value are clear.":"Primary text is missing.");
 add("headline",d.headline?"pass":"warn","Headline",d.headline?"Headline is present.":"Add a short headline where the chosen ad format uses one.");
 add("objective",d.objective?"pass":"risk","Objective",d.objective?"Objective is selected.":"Select the business outcome the campaign should optimize for.");
 const needsDestination=["traffic","leads","sales","app_promotion"].includes(d.objective);
 add("destination",!needsDestination||/^https?:\/\/[^\s]+$/i.test(d.destination_url)?"pass":"risk","Destination",!needsDestination||/^https?:\/\/[^\s]+$/i.test(d.destination_url)?"Destination fits the current brief.":"This objective usually needs a working destination, form or app path. Add and test it.");
 add("creative",d.creative_url||d.creative_notes?"pass":"warn","Creative asset",d.creative_url||d.creative_notes?"A creative URL or a production note is included.":"No creative URL or creative description is supplied; visual consistency cannot yet be checked.");
 add("audience",d.audience_location?"pass":"warn","Audience",d.audience_location?"Target location is described.":"Specify the market or location you intend to reach.");
 add("budget",d.budget_amount!==null&&Number(d.budget_amount)>0?"pass":"warn","Test budget",d.budget_amount!==null&&Number(d.budget_amount)>0?"A positive planning budget is recorded.":"No positive test budget is set. This is a plan only, not a live Meta budget.");
 add("placements",d.placements&&d.placements!=="Not decided"?"pass":"warn","Placements",d.placements&&d.placements!=="Not decided"?"Placement approach is recorded.":"Choose a placement approach or note that you need to evaluate it.");
 add("schedule",(!d.schedule_start_at&&!d.schedule_end_at)||(d.schedule_start_at&&d.schedule_end_at&&new Date(d.schedule_end_at)>new Date(d.schedule_start_at))?"pass":"risk","Schedule",(!d.schedule_start_at&&!d.schedule_end_at)?"No schedule is specified yet.":(d.schedule_start_at&&d.schedule_end_at&&new Date(d.schedule_end_at)>new Date(d.schedule_start_at))?"End time is after start time.":"If both times are set, the end must be after the start.");
 const copy=d.primary_text.toLowerCase();
 const policyPatterns=[
  {pattern:/\b(guaranteed|100%\s*(effective|cure|result|profit)|risk[- ]?free|instant results)\b/i,title:"Absolute or guaranteed claim",message:"Check whether any absolute promise is objectively supportable and allowed for this product or service."},
  {pattern:/\b(you are|you're|your (illness|disease|debt|income|salary|religion|race|ethnicity|disability|medical condition))\b/i,title:"Personal-attribute wording",message:"This wording may appear to assert sensitive personal information about the viewer. Rephrase around the product or general audience need."},
  {pattern:/\b(before and after|miracle cure|cure diabetes|lose \d+\s*(kg|pounds|lbs)\s*in)\b/i,title:"Health / transformation claim",message:"Check the applicable restricted-content and misleading-claim policies; avoid unsupported medical or rapid-transformation promises."}
 ];
 let matched=0;
 for(const rule of policyPatterns){if(rule.pattern.test(copy)){add("policy_"+matched,"risk",rule.title,rule.message);matched++;}}
 if(!matched)add("policy_scan","warn","Policy preflight","No common wording flag was detected by this basic scan, but this is not a complete Meta policy review or approval.");
 if(d.destination_url){
  try{const u=new URL(d.destination_url);if(u.protocol!=="https:")add("https","warn","Landing page security","The destination uses HTTP rather than HTTPS. Prefer a secure page where available.");}
  catch{add("destination_url_format","risk","Destination URL format","The destination URL could not be parsed.");}
 }
 if(d.budget_amount!==null&&Number(d.budget_amount)===0)add("zero_budget","warn","Budget is zero","A zero budget may prevent delivery if copied into a live campaign.");
 return checks;
}
function renderPreflight(checks){
 lastChecks=checks||[];const el=$("marPreflightResults");
 if(!checks.length){el.innerHTML="";return;}
 const counts={risk:checks.filter(x=>x.level==="risk").length,warn:checks.filter(x=>x.level==="warn").length,pass:checks.filter(x=>x.level==="pass").length};
 el.innerHTML='<div class="mar-preflight-summary"><strong>Preflight result</strong><span>'+counts.pass+' pass · '+counts.warn+' note(s) · '+counts.risk+' item(s) to fix</span><small>This is a basic rules-based checklist, not a complete legal review or Meta approval.</small></div>'+checks.map(c=>'<div class="mar-check-row '+H.esc(c.level)+'"><span class="mar-check-icon">'+(c.level==="pass"?"✓":c.level==="risk"?"!":"i")+'</span><div><strong>'+H.esc(c.title)+'</strong>'+H.esc(c.message)+'</div></div>').join("");
}
function runPreflight(){
 try{const d=draftPayload();const checks=buildChecks(d);renderPreflight(checks);$("marReviewNotes").value=checks.filter(c=>c.level!=="pass").map(c=>c.title+": "+c.message).join("\n");$("marReviewStatus").value=checks.some(c=>c.level==="risk")?"changes_needed":"ready_for_review";setResult("Preflight complete: "+checks.filter(c=>c.level==="pass").length+" passed, "+checks.filter(c=>c.level==="warn").length+" notes, "+checks.filter(c=>c.level==="risk").length+" higher-risk item(s). Save the draft to preserve the checklist.");}
 catch(err){setResult(err.message||"Check the draft fields.",true);}
}
async function saveDraft(event){
 event?.preventDefault();clearResult();
 let payload;
 try{payload=draftPayload();if(!payload.draft_name)throw new Error("Enter a draft name.");if(!payload.primary_text)throw new Error("Enter the primary ad copy.");if(payload.schedule_start_at&&payload.schedule_end_at&&new Date(payload.schedule_end_at)<=new Date(payload.schedule_start_at))throw new Error("End date/time must be after start date/time.");}
 catch(err){setResult(err.message||"Check the form fields.",true);return;}
 const id=val("marDraftId");
 try{
  let result;
  if(id){result=await H.client.from("admin_ad_review_drafts").update(payload).eq("id",id).select("id").single();}
  else{result=await H.client.from("admin_ad_review_drafts").insert({...payload,created_by:H.ADMIN_EMAIL}).select("id").single();}
  if(result.error)throw result.error;
  $("marDraftId").value=result.data.id;$("marDraftMode").textContent="Saved draft";$("marDraftMode").className="hf-status hf-status-active";
  H.toast("Ad-review draft saved.");setResult("Saved to the private Halal Food admin database. It has not been sent to Meta and no ad has been published.");
  await loadDrafts();
 }catch(err){setResult((err.message||"Could not save draft.")+" Confirm that the Meta Ads review migration has been applied and your MFA session is active.",true);H.toast("Could not save draft.","error");}
}
function makeReviewPacket(d,sourceLabel){
 return [
 "HALAL FOOD — META ADS REVIEW PACKET",
 "Source: "+(sourceLabel||"Internal draft"),
 "Draft: "+(d.draft_name||"Untitled"),
 "Platform: "+(d.platform||"facebook"),
 "Campaign objective: "+(d.objective||"not selected"),
 "Campaign setup: "+(d.campaign_type||"not specified"),
 "",
 "PRIMARY TEXT:",
 d.primary_text||"(not supplied)",
 "",
 "HEADLINE: "+(d.headline||"(not supplied)"),
 "DESCRIPTION: "+(d.description||"(not supplied)"),
 "CALL TO ACTION: "+(d.call_to_action||"not specified"),
 "DESTINATION: "+(d.destination_url||"(not supplied)"),
 "CREATIVE URL: "+(d.creative_url||"(not supplied)"),
 "CREATIVE NOTES: "+(d.creative_notes||"(not supplied)"),
 "",
 "AUDIENCE LOCATION: "+(d.audience_location||"(not supplied)"),
 "AGE RANGE: "+(d.age_min??"—")+"–"+(d.age_max??"—"),
 "AUDIENCE / INTERESTS: "+(d.audience_interests||"(not supplied)"),
 "PLACEMENTS: "+(d.placements||"(not specified)"),
 "TEST BUDGET: "+(d.budget_amount===null||d.budget_amount===undefined?"(not supplied)":d.budget_amount+" "+(d.currency||"BDT")+" / "+(d.budget_period||"daily")),
 "PLANNED START: "+(d.schedule_start_at||"(not supplied)"),
 "PLANNED END: "+(d.schedule_end_at||"(not supplied)"),
 "META AD ACCOUNT: "+(d.meta_ad_account_id||"(not connected)"),
 "META CAMPAIGN ID: "+(d.meta_campaign_id||"(internal draft)"),
 "META AD ID: "+(d.meta_ad_id||"(internal draft)"),
 "",
 "BASIC PREFLIGHT:",
 (lastChecks.length?lastChecks.map(c=>"- "+c.level.toUpperCase()+": "+c.title+" — "+c.message).join("\n"):"Not run yet."),
 "",
 "Please review message clarity, offer credibility, policy risk, objective/CTA alignment, audience and setup. This packet is not a request to publish or spend money."
 ].join("\n");
}
async function copyText(value){
 try{await navigator.clipboard.writeText(value);H.toast("Review packet copied. Paste it into this ChatGPT conversation.");}
 catch{
  const area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();
  const ok=document.execCommand("copy");area.remove();
  if(ok)H.toast("Review packet copied. Paste it into this ChatGPT conversation.");else{setResult("Clipboard access was blocked. Select and copy the text from this field manually.",true);window.prompt("Copy review packet:",value);}
 }
}
function copyCurrentPacket(){
 try{const payload=draftPayload();copyText(makeReviewPacket(payload,"Internal draft form"));}
 catch(err){setResult(err.message||"Complete the required fields before copying a review packet.",true);}
}
function copySavedPacket(id){
 const row=draftRows.find(r=>r.id===id);if(!row)return;
 const normalized={...row,call_to_action:row.call_to_action||"LEARN_MORE"};
 const checks=row.checklist&&typeof row.checklist==="object"?Object.entries(row.checklist).map(([key,value])=>({key,...value})):[];lastChecks=checks;
 copyText(makeReviewPacket(normalized,"Saved internal draft"));
}
async function deleteDraft(id){
 const row=draftRows.find(r=>r.id===id);if(!row)return;
 if(!confirm("Delete the saved draft '"+row.draft_name+"'? This only deletes the internal review brief; it does not change anything in Meta."))return;
 const {error}=await H.client.from("admin_ad_review_drafts").delete().eq("id",id);
 if(error){H.toast(error.message||"Could not delete draft.","error");return;}
 H.toast("Internal draft deleted.");if(val("marDraftId")===id)newDraft();await loadDrafts();
}
function creativePacketFromAd(ad){
 return {
  draft_name:ad.name||"Meta ad review",
  platform:"facebook",
  objective:"traffic",
  campaign_type:"manual",
  primary_text:ad.primaryText||"",
  headline:ad.headline||"",
  description:ad.description||"",
  destination_url:ad.destinationUrl||"",
  call_to_action:"LEARN_MORE",
  creative_url:ad.creativeUrl||"",
  creative_notes:ad.creativeName||"",
  audience_location:"",age_min:18,age_max:65,audience_interests:"",placements:"Not decided",
  budget_amount:null,budget_period:"daily",currency:"BDT",schedule_start_at:null,schedule_end_at:null,
  review_status:"ready_for_review",review_notes:"Imported for review from Meta. Confirm CTA, audience, budget, placements and destination inside Ads Manager.",
  meta_ad_account_id:selectedAccount?.accountId||null,meta_campaign_id:ad.campaignId||null,meta_ad_id:ad.id||null
 };
}
function renderCampaigns(rows){
 remoteCampaigns=rows||[];$("marCampaignCount").textContent=remoteCampaigns.length+" records";$("marCampaignCount").className="hf-status hf-status-active";
 const body=$("marCampaignRows");
 if(!remoteCampaigns.length){body.innerHTML='<tr><td colspan="5" class="mar-empty">Meta returned no campaign records for this query. This does not prove the account has never had campaigns.</td></tr>';return;}
 body.innerHTML=remoteCampaigns.map(r=>{
  const budget=r.dailyBudget?metaMoney(r.dailyBudget,selectedAccount?.currency)+" / day":r.lifetimeBudget?metaMoney(r.lifetimeBudget,selectedAccount?.currency)+" lifetime":"—";
  return '<tr><td><strong>'+H.esc(r.name||"Unnamed campaign")+'</strong><small>ID: '+H.esc(r.id)+'</small><small>Updated '+H.esc(fmtDate(r.updatedTime))+'</small></td><td>'+H.esc((r.objective||"—").replace(/_/g," "))+'</td><td>'+statusBadge(r.status)+'</td><td>'+statusBadge(r.effectiveStatus)+'</td><td>'+H.esc(budget)+'</td></tr>';
 }).join("");
}
function renderAds(rows){
 remoteAds=rows||[];$("marAdCount").textContent=remoteAds.length+" records";$("marAdCount").className="hf-status hf-status-active";
 const body=$("marAdRows");
 if(!remoteAds.length){body.innerHTML='<tr><td colspan="5" class="mar-empty">Meta returned no ad records for this query. Unsaved editor drafts may not be API-readable.</td></tr>';return;}
 body.innerHTML=remoteAds.map(r=>{
  const copy=text(r.primaryText,500);
  return '<tr><td><strong>'+H.esc(r.name||r.creativeName||"Unnamed ad")+'</strong><small>ID: '+H.esc(r.id)+'</small><small>Campaign: '+H.esc(r.campaignId||"—")+'</small></td><td><div class="mar-remote-copy">'+H.esc(copy||"(Meta did not return primary text for this ad)")+'</div></td><td><div class="mar-remote-copy">'+H.esc(r.headline||"—")+'</div><small>'+H.esc(r.description||"")+'</small></td><td>'+statusBadge(r.effectiveStatus||r.status)+'</td><td><div class="mar-row-actions"><button class="hf-button hf-button-secondary" type="button" data-review-meta-ad="'+H.esc(r.id)+'">Open as draft</button><button class="hf-button hf-button-secondary" type="button" data-copy-meta-ad="'+H.esc(r.id)+'">Copy review packet</button></div></td></tr>';
 }).join("");
}
async function loadRemote(action){
 if(!selectedAccount){H.toast("Choose a Meta ad account first.","error");return;}
 const btn=$(action==="campaigns"?"marLoadCampaigns":"marLoadAds");btn.disabled=true;btn.textContent="Loading…";
 try{
  const data=await invoke(action);
  if(action==="campaigns")renderCampaigns(data.rows||[]);else renderAds(data.rows||[]);
  $("marRemoteNotice").textContent="Meta returned "+(data.rows||[]).length+" "+(action==="campaigns"?"campaign":"ad")+" record(s) for "+(data.account?.name||selectedAccount.name)+". This is a read-only API result.";
  H.toast("Loaded "+(data.rows||[]).length+" "+action+" record(s).");
 }catch(err){
  $("marRemoteNotice").textContent=(err.message||"Meta read failed.")+" Check ads_read, app role, ad-account access and Marketing API access tier in Meta.";
  H.toast(err.message||"Could not load Meta records.","error");
 }finally{btn.disabled=!selectedAccount;btn.textContent=action==="campaigns"?"Load campaigns":"Load ads";}
}
function importMetaAd(id){
 const ad=remoteAds.find(r=>r.id===id);if(!ad)return;
 const row=creativePacketFromAd(ad);
 fillForm(row);
 $("marDraftId").value="";
 $("marDraftMode").textContent="Imported from Meta · unsaved";
 $("marDraftMode").className="hf-status hf-status-pending";
 setResult("Ad details copied into the internal brief form. Fill in the missing targeting, budget and CTA information, then save it as a separate review draft.");
}
function bind(){
 $("marRefreshAll").addEventListener("click",async()=>{await refreshStatus();await loadDrafts();});
 $("marConnectBtn").addEventListener("click",connectMeta);
 $("marSyncAccounts").addEventListener("click",syncAccounts);
 $("marSelectAccount").addEventListener("click",chooseAccount);
 $("marVerifyAccount").addEventListener("click",async()=>{await Promise.all([loadRemote("campaigns"),loadRemote("ads")]);});
 $("marDisconnectBtn").addEventListener("click",disconnectMeta);
 $("marAccountSelect").addEventListener("change",()=>{$("marSelectAccount").disabled=!$("marAccountSelect").value||busy;});
 $("marCopyRedirect").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("marRedirectUri").value);H.toast("Redirect URI copied.");}
  catch{$("marRedirectUri").select();document.execCommand("copy");H.toast("Redirect URI selected. Copy it into Meta App settings.");}
 });
 $("marDraftForm").addEventListener("submit",saveDraft);
 $("marPreflight").addEventListener("click",runPreflight);
 $("marCopyPacket").addEventListener("click",copyCurrentPacket);
 $("marNewDraft").addEventListener("click",newDraft);
 $("marRefreshDrafts").addEventListener("click",loadDrafts);
 $("marDraftSearch").addEventListener("input",renderDrafts);
 $("marStatusFilter").addEventListener("change",renderDrafts);
 $("marPrimaryText").addEventListener("input",()=>$("marPrimaryCount").textContent=String($("marPrimaryText").value.length));
 $("marLoadCampaigns").addEventListener("click",()=>loadRemote("campaigns"));
 $("marLoadAds").addEventListener("click",()=>loadRemote("ads"));
 $("marDraftRows").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit-draft]");if(edit){const row=draftRows.find(r=>r.id===edit.dataset.editDraft);if(row)fillForm(row);return;}
  const cp=event.target.closest("[data-copy-draft]");if(cp){copySavedPacket(cp.dataset.copyDraft);return;}
  const del=event.target.closest("[data-delete-draft]");if(del){deleteDraft(del.dataset.deleteDraft);}
 });
 $("marAdRows").addEventListener("click",event=>{
  const open=event.target.closest("[data-review-meta-ad]");if(open){importMetaAd(open.dataset.reviewMetaAd);return;}
  const cp=event.target.closest("[data-copy-meta-ad]");if(cp){const ad=remoteAds.find(r=>r.id===cp.dataset.copyMetaAd);if(ad)copyText(makeReviewPacket(creativePacketFromAd(ad),"Meta ad "+ad.id));}
 });
 window.addEventListener("message",async(event)=>{
  if(event.origin!==FUNCTION_ORIGIN||event.source!==popup||event.data?.type!=="hf-meta-ads-review-oauth-complete")return;
  popup=null;
  if(event.data.success){H.toast("Meta Ads authorization completed. Refresh status and accounts.");await refreshStatus();if(state?.connected)await syncAccounts();}
  else{H.toast("Meta Ads authorization was not completed. Review the popup message and try again.","error");await refreshStatus();}
 });
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&H)refreshStatus();});
}
window.HFAdminReady.then(async(admin)=>{
 if(!admin)return;H=admin;bind();newDraft();await Promise.all([refreshStatus(),loadDrafts()]);
});
})();
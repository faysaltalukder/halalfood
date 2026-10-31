(() => {
"use strict";
const $=id=>document.getElementById(id);
const dict={
 "Marketing Center":"মার্কেটিং সেন্টার","Create campaign":"ক্যাম্পেইন তৈরি","Audience & consent":"অডিয়েন্স ও সম্মতি","Campaign history":"ক্যাম্পেইন ইতিহাস",
 "Active CRM customers":"সক্রিয় CRM গ্রাহক","WhatsApp consent":"WhatsApp সম্মতি","Email consent":"ইমেইল সম্মতি","Saved campaigns":"সংরক্ষিত ক্যাম্পেইন",
 "Choose your channel and message":"চ্যানেল ও বার্তা নির্বাচন করুন","Campaign name":"ক্যাম্পেইনের নাম","Email subject":"ইমেইলের বিষয়","Message content":"বার্তার বিষয়বস্তু",
 "Customer segment":"গ্রাহক সেগমেন্ট","All active customers":"সব সক্রিয় গ্রাহক","New customers":"নতুন গ্রাহক","Regular customers":"নিয়মিত গ্রাহক","Special customers":"বিশেষ গ্রাহক","VIP customers":"ভিআইপি গ্রাহক","Friend customers":"ফ্রেন্ড গ্রাহক",
 "Search customers":"গ্রাহক খুঁজুন","matching CRM records":"মিল পাওয়া CRM রেকর্ড","eligible for this channel":"এই চ্যানেলের জন্য যোগ্য","selected recipients":"নির্বাচিত গ্রাহক",
 "Save campaign & audience":"ক্যাম্পেইন ও অডিয়েন্স সংরক্ষণ","Campaign history":"ক্যাম্পেইন ইতিহাস","Previous":"আগের","Next":"পরের",
 "Provider setup required":"প্রোভাইডার সেটআপ প্রয়োজন","Record opt-in":"সম্মতি নথিভুক্ত করুন","Revoke":"সম্মতি প্রত্যাহার করুন","Save permission record":"সম্মতির তথ্য সংরক্ষণ",
 "Campaign safety check":"ক্যাম্পেইন নিরাপত্তা যাচাই","Consent requirement":"সম্মতির শর্ত","Required":"আবশ্যক","Open WhatsApp Web ↗":"WhatsApp Web খুলুন ↗",
 "No customers match these filters.":"এই ফিল্টারে কোনো গ্রাহক পাওয়া যায়নি।","No marketing campaigns have been saved yet.":"এখনো কোনো মার্কেটিং ক্যাম্পেইন সংরক্ষণ করা হয়নি।",
 "Email provider not connected":"ইমেইল প্রোভাইডার সংযুক্ত নয়","Record WhatsApp sent":"WhatsApp-এ পাঠানো হয়েছে হিসেবে রেকর্ড করুন","manually sent":"অ্যাডমিন নিশ্চিত করেছেন: ম্যানুয়ালি পাঠানো হয়েছে","provider accepted":"প্রোভাইডার গ্রহণ করেছে","Export WhatsApp CSV":"WhatsApp CSV এক্সপোর্ট","Export email CSV":"ইমেইল CSV এক্সপোর্ট",
 "Only active, non-blocked customers with recorded consent for the selected channel can be included.":"নির্বাচিত চ্যানেলের সম্মতি থাকা সক্রিয় ও ব্লক নয় এমন গ্রাহকরাই অন্তর্ভুক্ত হবে।"
};
if(window.HFAdminLanguage&&window.HFAdminLanguage.dictionary)Object.assign(window.HFAdminLanguage.dictionary,dict);
window.HFMarketingInit=async function(){
 const H=window.HFAdmin;if(!H)throw new Error("Admin session is not ready.");
 const {client,ADMIN_EMAIL,esc,dateTime,toast,audit,downloadFile,csvText}=H;
 const PAGE_SIZE=30,LOAD_SIZE=500,MAX_CUSTOMERS=30000;
 let customers=[],preferences=new Map(),campaigns=[],segmentRules=[],channel="email",activeTab="compose",selected=new Set(),selectionTouched=false,audiencePage=0,consentPage=0,emailProvider={configured:false,from:"",missing:[],providerNote:""},savedCampaignId=null;
 const cols="id,name,phone,email,created_at,is_blocked,archived_at,anonymized_at,total_orders,delivered_orders,recorded_order_value,last_order_at,qualifying_orders,segment_code,segment_name,segment_color,has_friend_tag";
 const number=n=>Number(n||0).toLocaleString("en-BD");
 const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
 const normalizePhone=v=>{let d=String(v||"").replace(/\D/g,"");if(d.startsWith("00880"))d="0"+d.slice(5);else if(d.startsWith("880"))d="0"+d.slice(3);return /^01\d{9}$/.test(d)?d:"";};
 const pref=id=>preferences.get(id)||{customer_id:id,whatsapp_opt_in:false,email_opt_in:false};
 const channelPermission=c=>channel==="whatsapp"?!!pref(c.id).whatsapp_opt_in:!!pref(c.id).email_opt_in;
 const channelAddress=c=>channel==="whatsapp"?normalizePhone(c.phone):validEmail(c.email)?String(c.email).trim():"";
 const channelHasPermission=(c,ch)=>{const p=pref(c.id);return ch==="whatsapp"?!!p.whatsapp_opt_in&&!!normalizePhone(c.phone):!!p.email_opt_in&&validEmail(c.email);};
 const setFeedback=(msg,isError=false)=>{const el=$("mktDraftFeedback");if(el){el.textContent=msg||"";el.className="hf-marketing-feedback"+(isError?" is-error":"");}};
 const safeName=c=>String(c.name||"Customer").trim()||"Customer";
 const personalize=(body,c)=>String(body||"").replace(/\{\{\s*name\s*\}\}/gi,safeName(c)).replace(/\{\{\s*segment\s*\}\}/gi,String(c.segment_name||"Customer"));
 const getFilterState=()=>({segment:$("mktSegment").value,minOrders:$("mktMinOrders").value,maxOrders:$("mktMaxOrders").value,lastOrder:$("mktLastOrder").value,search:$("mktAudienceSearch").value.trim(),channel});
 async function loadSegmentRules(){
  const {data,error}=await client.from("customer_segment_rules").select("code,name,sort_order,is_active").eq("is_active",true).order("sort_order",{ascending:true}).order("name",{ascending:true});
  if(error)throw error;
  segmentRules=data||[];
  const select=$("mktSegment"),current=select.value;
  select.innerHTML='<option value="all">All active customers</option>'+
   segmentRules.map(rule=>'<option value="'+esc(rule.code)+'">'+esc(rule.name)+'</option>').join("")+
   '<option value="friend">Friend customers</option>';
  select.value=(segmentRules.some(rule=>rule.code===current)||current==="friend")?current:"all";
 }
 async function loadCustomers(){
  const rows=[];let offset=0;
  while(offset<MAX_CUSTOMERS){
   const {data,error}=await client.from("customer_directory").select(cols).is("archived_at",null).is("anonymized_at",null).eq("is_blocked",false).order("created_at",{ascending:false}).order("id",{ascending:true}).range(offset,offset+LOAD_SIZE-1);
   if(error)throw error;
   rows.push(...(data||[]));offset+=(data||[]).length;
   if(!data||data.length<LOAD_SIZE)break;
  }
  customers=rows;
  preferences=new Map();
  for(let i=0;i<customers.length;i+=400){
   const ids=customers.slice(i,i+400).map(c=>c.id);
   if(!ids.length)continue;
   const {data,error}=await client.from("customer_marketing_preferences").select("customer_id,whatsapp_opt_in,whatsapp_opt_in_at,whatsapp_opt_in_source,whatsapp_opt_out_at,email_opt_in,email_opt_in_at,email_opt_in_source,email_opt_out_at,updated_at").in("customer_id",ids);
   if(error)throw error;
   (data||[]).forEach(p=>preferences.set(p.customer_id,p));
  }
  $("marketingStatsActive").textContent=number(customers.length);
  $("marketingStatsWhatsApp").textContent=number(customers.filter(c=>pref(c.id).whatsapp_opt_in&&normalizePhone(c.phone)).length);
  $("marketingStatsEmail").textContent=number(customers.filter(c=>pref(c.id).email_opt_in&&validEmail(c.email)).length);
 }
 async function loadCampaigns(){
  const {data,error}=await client.from("marketing_campaigns").select("id,name,channel,subject,status,audience_count,exported_count,sent_count,failed_count,created_at,updated_at,last_error").order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  campaigns=data||[];
  $("marketingStatsCampaigns").textContent=number(campaigns.length);
 }
 async function checkEmailProvider(){
  try{
   const {data,error}=await client.functions.invoke("marketing-email",{body:{action:"status"}});
   if(error||!data){emailProvider={configured:false,from:"",missing:["Gmail connection status unavailable"],providerNote:""};return;}
   emailProvider={configured:!!data.configured,from:String(data.sender||""),missing:Array.isArray(data.missing)?data.missing:[],providerNote:String(data.providerNote||""),error:String(data.error||"")};
  }catch(_){emailProvider={configured:false,from:"",missing:[],providerNote:""};}
  const dot=$("mktEmailReadyDot"),title=$("mktEmailReadyText"),detail=$("mktEmailReadyDetail"),hint=$("mktEmailProviderHint");
  if(dot)dot.className="hf-readiness-dot "+(emailProvider.configured?"is-ready":"is-pending");
  if(title)title.textContent=emailProvider.configured?"Gmail API connected":"Gmail connection needs attention";
  if(detail)detail.textContent=emailProvider.configured?"Halal Food sender verified: "+emailProvider.from:(emailProvider.error?"Connection check failed: "+emailProvider.error:"Missing: "+(emailProvider.missing.length?emailProvider.missing.join(", "):"Gmail OAuth configuration")+"; check Supabase Edge Function secrets.");
  if(hint)hint.textContent=emailProvider.configured?(emailProvider.providerNote+" Only active customers with recorded email opt-in can receive campaigns. Gmail acceptance is not proof of inbox placement or reading."):"Gmail is not ready. No email will be sent until the OAuth credentials are available; CSV export remains restricted to a consent-checked audience.";
 }
 function matchingCustomers(){
  const segment=$("mktSegment").value,search=$("mktAudienceSearch").value.trim().toLocaleLowerCase();
  const min=$("mktMinOrders").value===""?null:Number($("mktMinOrders").value),max=$("mktMaxOrders").value===""?null:Number($("mktMaxOrders").value);
  const recent=$("mktLastOrder").value,cutoff=Date.now()-Number(recent||0)*86400000;
  return customers.filter(c=>{
   if(segment==="friend"&&!c.has_friend_tag)return false;
   if(segment!=="all"&&segment!=="friend"&&c.segment_code!==segment)return false;
   const orders=Number(c.total_orders||0);
   if(min!==null&&Number(c.qualifying_orders??orders)<min)return false;
   if(max!==null&&Number(c.qualifying_orders??orders)>max)return false;
   if(recent==="never"&&c.last_order_at)return false;
   if(recent==="inactive90"&&c.last_order_at&&new Date(c.last_order_at).getTime()>=Date.now()-90*86400000)return false;
   if(["30","60","90"].includes(recent)&&(!c.last_order_at||new Date(c.last_order_at).getTime()<cutoff))return false;
   if(search&&!([c.name,c.phone,c.email,c.segment_name].join(" ").toLocaleLowerCase().includes(search)))return false;
   return true;
  });
 }
 function channelLabel(){return channel==="whatsapp"?"WhatsApp":"Email";}
 function renderAudience(){
  const matches=matchingCustomers(),eligible=matches.filter(c=>channelHasPermission(c,channel)),selectedRows=customers.filter(c=>selected.has(c.id)&&channelHasPermission(c,channel));
  $("mktAudienceCount").textContent=number(matches.length);$("mktEligibleCount").textContent=number(eligible.length);$("mktSelectedCount").textContent=number(selectedRows.length);
  $("mktReviewChannel").textContent=channelLabel();$("mktReviewEligible").textContent=number(eligible.length);$("mktReviewSelected").textContent=number(selectedRows.length);
  $("mktAudiencePage").textContent=matches.length?("Showing "+(audiencePage*PAGE_SIZE+1)+"–"+Math.min((audiencePage+1)*PAGE_SIZE,matches.length)+" of "+number(matches.length)):"No matching records";
  $("mktAudiencePrev").disabled=audiencePage<=0;$("mktAudienceNext").disabled=(audiencePage+1)*PAGE_SIZE>=matches.length;
  const visible=matches.slice(audiencePage*PAGE_SIZE,(audiencePage+1)*PAGE_SIZE);
  const body=$("mktAudienceBody");
  if(!visible.length){body.innerHTML='<tr><td colspan="5" class="hf-marketing-muted">No customers match these filters.</td></tr>';return;}
  body.innerHTML=visible.map(c=>{
   const p=pref(c.id),allowed=channelHasPermission(c,channel),contact=channel==="whatsapp"?normalizePhone(c.phone):(validEmail(c.email)?c.email:"No valid email");
   const permission=allowed?'<span class="hf-marketing-permission is-allowed">Ready</span>':'<span class="hf-marketing-permission is-denied">Not eligible</span>';
   const address=contact?esc(contact):'<span class="hf-marketing-permission is-invalid">Invalid contact</span>';
   return '<tr><td><input type="checkbox" data-mkt-select="'+esc(c.id)+'" '+(selected.has(c.id)?"checked ":"")+(allowed?"":"disabled ")+'aria-label="Select '+esc(safeName(c))+'"></td><td><div class="hf-marketing-person"><strong>'+esc(safeName(c))+'</strong><small>'+esc(c.id.slice(0,8))+'</small></div></td><td><span class="hf-marketing-segment">'+esc(c.segment_name||"Unclassified")+'</span><small class="hf-marketing-contact">'+number(c.qualifying_orders??c.total_orders)+' qualifying orders</small></td><td>'+address+'</td><td>'+permission+'</td></tr>';
  }).join("");
  $("mktReviewNote").textContent=channel==="whatsapp"?(selectedRows.length?"WhatsApp audience is ready to export. Complete the broadcast manually in WhatsApp Business.":"Select eligible WhatsApp contacts. The final message is sent manually in WhatsApp Business."):"Ready to send to "+number(selectedRows.length)+" selected email recipient(s). Gmail and recipient eligibility are checked again before sending.";
  $("mktSaveDraft").textContent=channel==="email"?"Send email now":"Save WhatsApp audience";\n  $("mktSaveDraft").disabled=selectedRows.length===0||(channel==="email"&&!emailProvider.configured);
 }
 function renderConsent(){
  const query=$("mktConsentSearch").value.trim().toLocaleLowerCase();
  const rows=customers.filter(c=>!query||[c.name,c.phone,c.email,c.segment_name].join(" ").toLocaleLowerCase().includes(query));
  $("mktConsentCount").textContent=number(rows.length)+" active customer records";
  const visible=rows.slice(0,100);
  if(!visible.length){$("mktConsentBody").innerHTML='<tr><td colspan="4" class="hf-marketing-muted">No customer records match this search.</td></tr>';return;}
  $("mktConsentBody").innerHTML=visible.map(c=>{
   const p=pref(c.id),wa=p.whatsapp_opt_in?'<span class="hf-marketing-permission is-allowed">Opted in</span>':'<span class="hf-marketing-permission is-denied">Not opted in</span>',em=p.email_opt_in?'<span class="hf-marketing-permission is-allowed">Opted in</span>':'<span class="hf-marketing-permission is-denied">Not opted in</span>';
   const waAction=p.whatsapp_opt_in?'<button class="hf-button hf-button-secondary" type="button" data-mkt-consent="whatsapp:off" data-customer-id="'+esc(c.id)+'">Revoke WA</button>':'<button class="hf-button hf-button-secondary" type="button" data-mkt-consent="whatsapp:on" data-customer-id="'+esc(c.id)+'" '+(normalizePhone(c.phone)?"":"disabled")+'>WhatsApp opt-in</button>';
   const emAction=p.email_opt_in?'<button class="hf-button hf-button-secondary" type="button" data-mkt-consent="email:off" data-customer-id="'+esc(c.id)+'">Unsubscribe</button>':'<button class="hf-button hf-button-secondary" type="button" data-mkt-consent="email:on" data-customer-id="'+esc(c.id)+'" '+(validEmail(c.email)?"":"disabled")+'>Email opt-in</button>';
   return '<tr><td><div class="hf-marketing-person"><strong>'+esc(safeName(c))+'</strong><small>'+esc(c.phone||c.email||"No contact")+'</small></div></td><td>'+wa+'</td><td>'+em+'</td><td><div class="hf-marketing-consent-actions">'+waAction+emAction+'</div></td></tr>';
  }).join("");
  if(rows.length>100){$("mktConsentCount").textContent="Showing first 100 of "+number(rows.length)+" matching records. Refine search to narrow the list.";}
 }
 function statusBadge(status,channel){const label=status==="sent"&&channel==="whatsapp"?"manually sent":status==="sent"&&channel==="email"?"provider accepted":String(status||"draft").replace(/_/g," ");return '<span class="hf-marketing-status" data-status="'+esc(status)+'">'+esc(label)+'</span>';}
 function renderHistory(){
  const body=$("mktCampaignHistoryBody");
  if(!campaigns.length){body.innerHTML='<tr><td colspan="6" class="hf-marketing-muted">No marketing campaigns have been saved yet.</td></tr>';return;}
  body.innerHTML=campaigns.map(c=>{
   const action=c.channel==="whatsapp"?((["draft","exported"].includes(c.status)?'<button type="button" class="hf-button hf-button-secondary" data-mkt-export="'+esc(c.id)+'">Export WhatsApp CSV</button>':"")+(c.status==="exported"?'<button type="button" class="hf-button hf-button-primary" data-mkt-whatsapp-sent="'+esc(c.id)+'">Record WhatsApp sent</button>':"")):('<button type="button" class="hf-button hf-button-secondary" data-mkt-export="'+esc(c.id)+'">Export email CSV</button>'+(emailProvider.configured&&["draft","partially_sent"].includes(c.status)?'<button type="button" class="hf-button hf-button-primary" data-mkt-send="'+esc(c.id)+'">'+(c.status==="partially_sent"?"Continue send":"Approve & send")+'</button>':(!emailProvider.configured?'<button type="button" class="hf-button hf-button-secondary" disabled title="Configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN in Supabase Edge Function secrets">Provider needed</button>':"")));
   return '<tr><td><div class="hf-marketing-history-name"><strong>'+esc(c.name)+'</strong><small>'+esc(dateTime(c.created_at))+'</small></div></td><td>'+esc(c.channel==="whatsapp"?"WhatsApp":"Email")+'</td><td>'+statusBadge(c.status,c.channel)+'</td><td>'+number(c.audience_count)+'</td><td>'+number(c.sent_count)+' / '+number(c.failed_count)+'</td><td><div class="hf-marketing-history-actions">'+action+'</div></td></tr>';
  }).join("");
 }
 function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll("[data-marketing-tab]").forEach(b=>b.classList.toggle("is-active",b.dataset.marketingTab===tab));
  document.querySelectorAll("[data-marketing-panel]").forEach(p=>{const active=p.dataset.marketingPanel===tab;p.classList.toggle("is-active",active);p.hidden=!active;});
  if(tab==="history")renderHistory();if(tab==="consent")renderConsent();
 }
 function switchChannel(ch){
  if(ch===channel)return;
  channel=ch;selected.clear();selectionTouched=false;audiencePage=0;
  document.querySelectorAll("[data-marketing-channel]").forEach(b=>b.classList.toggle("is-active",b.dataset.marketingChannel===ch));
  $("mktEmailFields").hidden=ch!=="email";
  $("marketingChannelNote").textContent=ch==="whatsapp"?"WhatsApp is a manual handoff. Export the selected contacts and send from WhatsApp Business.":"Write the subject and email, choose recipients (eligible contacts are pre-selected), then press Send email now.";
  $("mktReviewChannel").textContent=channelLabel();
  if(ch==="email")matchingCustomers().filter(c=>channelHasPermission(c,"email")).forEach(c=>selected.add(c.id));
  renderAudience();
 }
 async function reloadPrefs(ids){
  const unique=[...new Set(ids||[])];if(!unique.length)return;
  for(let i=0;i<unique.length;i+=400){
   const batch=unique.slice(i,i+400);
   const {data,error}=await client.from("customer_marketing_preferences").select("customer_id,whatsapp_opt_in,whatsapp_opt_in_at,whatsapp_opt_in_source,whatsapp_opt_out_at,email_opt_in,email_opt_in_at,email_opt_in_source,email_opt_out_at,updated_at").in("customer_id",batch);
   if(error)throw error;
   (data||[]).forEach(p=>preferences.set(p.customer_id,p));
  }
 }
 async function saveCampaign(){
  setFeedback("");
  const subject=$("mktCampaignSubject").value.trim(),body=$("mktCampaignMessage").value.trim();
  const name=$("mktCampaignName").value.trim()||subject||((channel==="email"?"Email":"WhatsApp")+" campaign "+new Date().toLocaleDateString("en-GB"));
  if(body.length<2)throw new Error("Write the campaign message first.");
  if(channel==="email"&&subject.length<2)throw new Error("An email subject is required.");
  if(selected.size===0)throw new Error("Select at least one eligible customer.");
  const ids=[...selected];
  await reloadPrefs(ids);
  const audience=customers.filter(c=>selected.has(c.id)&&channelHasPermission(c,channel));
  if(!audience.length)throw new Error("No selected customers currently have valid channel consent and contact details.");
  if(audience.length!==ids.length)throw new Error("Some selected recipients are no longer eligible. Review the updated audience and try again.");
  if(audience.length>10000)throw new Error("A single campaign is limited to 10,000 recipients. Narrow the audience first.");
  const rules=getFilterState();
  const payload={name,channel,subject:channel==="email"?subject:null,message_body:body,audience_rules:rules,status:"draft",audience_count:audience.length,created_by:ADMIN_EMAIL};
  const {data:campaign,error}=await client.from("marketing_campaigns").insert(payload).select("id").single();
  if(error)throw error;
  try{
   for(let i=0;i<audience.length;i+=200){
    const chunk=audience.slice(i,i+200).map(c=>({campaign_id:campaign.id,customer_id:c.id,status:"selected"}));
    const {error:recipientError}=await client.from("marketing_campaign_recipients").insert(chunk);
    if(recipientError)throw recipientError;
   }
   await client.from("marketing_campaign_events").insert({campaign_id:campaign.id,event_type:"created",details:{channel,audience_count:audience.length,segment:rules.segment},created_by:ADMIN_EMAIL});
  }catch(err){
   await client.from("marketing_campaigns").update({status:"failed",last_error:"Audience snapshot could not be completed."}).eq("id",campaign.id);
   throw err;
  }
  savedCampaignId=campaign.id;
  await audit("marketing_campaign_created","marketing_campaign",campaign.id,"Marketing campaign saved with consent-checked audience",{channel,audience_count:audience.length});
  await loadCampaigns();renderHistory();
  if(channel==="email"){
   setFeedback("Campaign prepared. Confirm once to send to "+number(audience.length)+" selected recipient(s).");
   const sent=await sendEmail(campaign.id);
   if(sent===false)setFeedback("Campaign saved as a draft. Sending was cancelled.");
   else setFeedback("Email send request completed. See Campaign history for the provider result.");
   return;
  }
  setFeedback("WhatsApp audience saved. Export it from Campaign history, then complete the broadcast manually.");
  toast("WhatsApp audience saved.","success");
  switchTab("history");
 }
 async function exportCampaign(id){
  const {data:campaign,error:campaignError}=await client.from("marketing_campaigns").select("id,name,channel,subject,message_body,status").eq("id",id).single();
  if(campaignError)throw campaignError;
  const {data:recipients,error}=await client.from("marketing_campaign_recipients").select("id,customer_id,status").eq("campaign_id",id).in("status",["selected","exported"]).order("created_at",{ascending:true}).limit(10000);
  if(error)throw error;
  if(!recipients||!recipients.length)throw new Error("There are no exportable recipients in this campaign.");
  const ids=[...new Set(recipients.map(r=>r.customer_id))];
  const directory=[];
  for(let i=0;i<ids.length;i+=400){
   const {data,error:dirError}=await client.from("customer_directory").select(cols).in("id",ids.slice(i,i+400)).is("archived_at",null).is("anonymized_at",null).eq("is_blocked",false);
   if(dirError)throw dirError;(data||[]).forEach(c=>directory.push(c));
  }
  await reloadPrefs(ids);
  const byId=new Map(directory.map(c=>[c.id,c]));
  const rows=[],validRecipientIds=[];
  const suppressedRecipientIds=[];
  recipients.forEach(r=>{
   const c=byId.get(r.customer_id);if(!c||!channelHasPermission(c,campaign.channel)){suppressedRecipientIds.push(r.id);return;}
   const contact=campaign.channel==="whatsapp"?normalizePhone(c.phone):(validEmail(c.email)?String(c.email).trim():"");
   if(!contact){suppressedRecipientIds.push(r.id);return;}
   if(campaign.channel==="whatsapp"){
    const waNumber="880"+contact.slice(1);
    const personalMessage=personalize(campaign.message_body,c);
    rows.push({name:safeName(c),phone:contact,whatsapp_number:waNumber,broadcast_batch:String(Math.floor(rows.length/256)+1),personalized_message:personalMessage,whatsapp_chat_url:"https://wa.me/"+waNumber+"?text="+encodeURIComponent(personalMessage)});
   }else{
    rows.push({name:safeName(c),email:contact,personalized_message:personalize(campaign.message_body,c),subject:personalize(campaign.subject||"",c)});
   }
   validRecipientIds.push(r.id);
  });
  if(!rows.length)throw new Error("Consent or contact details changed. No recipients remain eligible.");
  const content=csvText(rows);
  const file=(campaign.channel==="whatsapp"?"halal-food-whatsapp-":"halal-food-email-")+String(campaign.name||"campaign").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+id.slice(0,8)+".csv";
  downloadFile(file,content,"text/csv;charset=utf-8");
  const now=new Date().toISOString();
  for(let i=0;i<suppressedRecipientIds.length;i+=400){
   const batch=suppressedRecipientIds.slice(i,i+400);
   const {error:suppressError}=await client.from("marketing_campaign_recipients")
    .update({status:"suppressed",last_error:"Consent or valid contact details changed before export."})
    .in("id",batch).eq("campaign_id",id);
   if(suppressError)throw suppressError;
  }
  for(let i=0;i<validRecipientIds.length;i+=400){
   const batch=validRecipientIds.slice(i,i+400);
   const {error:updateError}=await client.from("marketing_campaign_recipients").update({status:"exported",exported_at:now}).in("id",batch);
   if(updateError)throw updateError;
  }
  if(campaign.channel==="whatsapp")await client.from("marketing_campaigns").update({status:"exported",exported_count:validRecipientIds.length,updated_at:now}).eq("id",id);
  await client.from("marketing_campaign_events").insert({campaign_id:id,event_type:"audience_exported",details:{channel:campaign.channel,exported_count:validRecipientIds.length,suppressed_count:suppressedRecipientIds.length},created_by:ADMIN_EMAIL});
  await audit("marketing_audience_exported","marketing_campaign",id,"Consent rechecked and campaign audience exported",{channel:campaign.channel,exported_count:validRecipientIds.length});
  await loadCampaigns();renderHistory();
  toast(number(validRecipientIds.length)+" eligible contact(s) exported. Export does not mean sent. "+number(suppressedRecipientIds.length)+" no longer eligible contact(s) were suppressed.","success");
 }
 async function recordWhatsAppSent(id){
  const campaign=campaigns.find(c=>c.id===id);
  if(!campaign||campaign.channel!=="whatsapp"||campaign.status!=="exported")throw new Error("Only an exported WhatsApp campaign can be marked as manually sent.");
  const {data:recipients,error}=await client.from("marketing_campaign_recipients").select("id")
   .eq("campaign_id",id).eq("status","exported").order("created_at",{ascending:true}).limit(10000);
  if(error)throw error;
  if(!recipients?.length)throw new Error("No exported WhatsApp recipients are waiting for a send confirmation.");
  const listCount=Math.ceil(recipients.length/256);const ok=window.confirm("Have you finished manually sending this campaign in the WhatsApp Business phone app to all "+number(recipients.length)+" exported recipient(s)? If using Broadcast Lists, create "+number(listCount)+" separate list(s) (maximum 256 recipients per list) and each recipient must have saved your number. This only records your confirmation; it does not send WhatsApp messages or verify delivery.");
  if(!ok)return;
  const now=new Date().toISOString(),ids=recipients.map(r=>r.id);
  for(let i=0;i<ids.length;i+=400){
   const batch=ids.slice(i,i+400);
   const {error:updateError}=await client.from("marketing_campaign_recipients").update({status:"sent",sent_at:now,last_error:null}).in("id",batch).eq("campaign_id",id).eq("status","exported");
   if(updateError)throw updateError;
  }
  const {data:updated,error:updateCampaignError}=await client.from("marketing_campaigns")
   .update({status:"sent",sent_count:ids.length,sent_at:now,updated_at:now})
   .eq("id",id).eq("channel","whatsapp").eq("status","exported").select("id").maybeSingle();
  if(updateCampaignError)throw updateCampaignError;
  if(!updated)throw new Error("WhatsApp campaign status changed while it was being recorded. Refresh campaign history.");
  await client.from("marketing_campaign_events").insert({
   campaign_id:id,event_type:"whatsapp_manual_send_recorded",
   details:{channel:"whatsapp",recipient_count:ids.length,method:"WhatsApp Business app",confirmed_by_admin:true,delivery_independently_verified:false},
   created_by:ADMIN_EMAIL
  });
  await audit("marketing_whatsapp_manual_send_confirmed","marketing_campaign",id,"Administrator confirmed WhatsApp messages were sent manually in WhatsApp Business",{recipient_count:ids.length,delivery_independently_verified:false});
  await loadCampaigns();renderHistory();
  toast(number(ids.length)+" WhatsApp recipients recorded as manually sent. Delivery was not independently verified.","success");
 }
 async function sendEmail(id){
  const campaign=campaigns.find(c=>c.id===id);if(!campaign)throw new Error("Campaign was not found.");
  if(!emailProvider.configured)throw new Error("Email provider is not configured. No email has been sent.");
  const ok=window.confirm("Send email campaign from Halal Food to "+number(campaign.audience_count)+" selected recipient(s)? This sends real emails. Recipient eligibility is rechecked by the server.");
  if(!ok)return false;
  const {data,error}=await client.from("marketing_campaigns").update({status:"approved",approved_by:ADMIN_EMAIL,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","partially_sent"]).select("id").maybeSingle();
  if(error)throw error;if(!data)throw new Error("This campaign cannot be sent in its current status.");
  await client.from("marketing_campaign_events").insert({campaign_id:id,event_type:"email_approved",details:{approved_by:ADMIN_EMAIL},created_by:ADMIN_EMAIL});
  const {data:result,error:sendError}=await client.functions.invoke("marketing-email",{body:{action:"send",campaign_id:id}});
  if(sendError)throw sendError;
  if(!result||!result.success)throw new Error(result?.error||"Email provider did not confirm the send.");
  await loadCampaigns();renderHistory();
  toast("Gmail accepted "+number(result.acceptedByProvider??result.sent??0)+" email(s); failed/suppressed: "+number(result.failed||0)+", remaining: "+number(result.remaining||0)+".","success");
  return true;
 }
 function openConsent(customerId,ch,allowed){
  const c=customers.find(x=>x.id===customerId);if(!c)return;
  $("mktConsentCustomerId").value=customerId;$("mktConsentChannel").value=ch;$("mktConsentAllowed").value=allowed?"true":"false";
  $("mktConsentTitle").textContent=(allowed?"Record ":"Revoke ")+(ch==="whatsapp"?"WhatsApp":"Email")+" marketing permission";
  $("mktConsentCustomer").textContent=safeName(c)+" · "+(c.phone||c.email||"");
  $("mktConsentEvidence").value="";$("mktConsentSource").value="";
  $("mktConsentEvidence").required=allowed;
  $("mktConsentEvidenceRequired").textContent=allowed?"Required for opt-in":"Optional for opt-out";
  $("mktConsentEvidence").placeholder=allowed?"Enter where and when this customer gave permission (minimum 8 characters).":"Optional reference for the customer’s opt-out request.";
  $("mktConsentDialog").showModal();
 }
 async function saveConsent(e){
  e.preventDefault();
  const customerId=$("mktConsentCustomerId").value,ch=$("mktConsentChannel").value,allowed=$("mktConsentAllowed").value==="true",source=$("mktConsentSource").value,evidence=$("mktConsentEvidence").value.trim(),button=$("mktConsentSave");
  if(!source)throw new Error("Choose the documented permission source.");
  if(allowed&&evidence.length<8)throw new Error("An evidence note of at least 8 characters is required for opt-in.");
  button.disabled=true;
  try{
   const {data,error}=await client.rpc("admin_set_customer_marketing_consent",{p_customer_id:customerId,p_channel:ch,p_allowed:allowed,p_source:source,p_evidence_note:evidence||null});
   if(error)throw error;
   await reloadPrefs([customerId]);
   $("mktConsentDialog").close();renderConsent();renderAudience();
   await audit("customer_marketing_consent_"+(allowed?"opt_in":"opt_out"),"customer",customerId,"Marketing consent updated",{channel:ch,allowed,source});
   toast("Customer "+(allowed?"opt-in":"opt-out")+" recorded.","success");
  }finally{button.disabled=false;}
 }
 async function refreshAll(){
  await loadSegmentRules();await loadCustomers();await loadCampaigns();await checkEmailProvider();
  if(channel==="email"&&!selectionTouched&&!selected.size)matchingCustomers().filter(c=>channelHasPermission(c,"email")).forEach(c=>selected.add(c.id));
  renderAudience();renderConsent();renderHistory();
 }
 document.querySelectorAll("[data-marketing-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.marketingTab)));
 document.querySelectorAll("[data-marketing-channel]").forEach(b=>b.addEventListener("click",()=>switchChannel(b.dataset.marketingChannel)));
 ["mktSegment","mktMinOrders","mktMaxOrders","mktLastOrder","mktAudienceSearch"].forEach(id=>$(id).addEventListener(id==="mktAudienceSearch"?"input":"change",()=>{selected.clear();selectionTouched=true;audiencePage=0;renderAudience();}));
 $("mktSelectAll").addEventListener("click",()=>{selectionTouched=true;matchingCustomers().filter(c=>channelHasPermission(c,channel)).forEach(c=>selected.add(c.id));renderAudience();});
 $("mktClearSelection").addEventListener("click",()=>{selectionTouched=true;selected.clear();renderAudience();});
 $("mktAudienceBody").addEventListener("change",e=>{const box=e.target.closest("[data-mkt-select]");if(!box)return;selectionTouched=true;if(box.checked)selected.add(box.dataset.mktSelect);else selected.delete(box.dataset.mktSelect);renderAudience();});
 $("mktAudiencePrev").addEventListener("click",()=>{audiencePage=Math.max(0,audiencePage-1);renderAudience();});
 $("mktAudienceNext").addEventListener("click",()=>{audiencePage++;renderAudience();});
 $("mktConsentSearch").addEventListener("input",()=>{consentPage=0;renderConsent();});
 $("mktConsentBody").addEventListener("click",e=>{const b=e.target.closest("[data-mkt-consent]");if(!b)return;const parts=b.dataset.mktConsent.split(":");openConsent(b.dataset.customerId,parts[0],parts[1]==="on");});
 $("mktConsentClose").addEventListener("click",()=>$("mktConsentDialog").close());
 $("mktConsentCancel").addEventListener("click",()=>$("mktConsentDialog").close());
 $("mktConsentForm").addEventListener("submit",e=>saveConsent(e).catch(err=>toast(err.message||"Consent could not be saved.","error")));
 $("mktSaveDraft").addEventListener("click",async b=>{const button=$("mktSaveDraft");button.disabled=true;try{await saveCampaign();}catch(err){setFeedback(err.message||"Campaign could not be saved.",true);toast(err.message||"Campaign save failed.","error");}finally{renderAudience();}});
 $("mktCampaignHistoryBody").addEventListener("click",async e=>{
  const exportButton=e.target.closest("[data-mkt-export]"),sendButton=e.target.closest("[data-mkt-send]");
  try{if(exportButton)await exportCampaign(exportButton.dataset.mktExport);else if(sendButton)await sendEmail(sendButton.dataset.mktSend);}
  catch(err){toast(err.message||"Campaign action failed.","error");await loadCampaigns();renderHistory();}
 });
 document.querySelector("[data-marketing-refresh]")?.addEventListener("click",()=>refreshAll().then(()=>toast("Marketing data refreshed.","success")).catch(e=>toast(e.message||"Refresh failed.","error")));
 await refreshAll();
 if(window.HFAdminLanguage?.applyLanguage)window.HFAdminLanguage.applyLanguage();
};
})();
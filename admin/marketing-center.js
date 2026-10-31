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
 "Only active, non-blocked customers with recorded consent for the selected channel can be included.":"নির্বাচিত চ্যানেলের সম্মতি থাকা সক্রিয় ও ব্লক নয় এমন গ্রাহকরাই অন্তর্ভুক্ত হবে।",
 "Write your email":"ইমেইল লিখুন","Email message":"ইমেইল বার্তা","Choose customers":"গ্রাহক নির্বাচন করুন",
 "Eligible email recipients are pre-selected. Untick anyone you do not want to include.":"যোগ্য ইমেইল গ্রাহকরা আগে থেকেই নির্বাচিত থাকবে। কাউকে বাদ দিতে টিক তুলে দিন।",
 "Search by name or email":"নাম বা ইমেইল দিয়ে খুঁজুন","Select all eligible":"সব যোগ্য গ্রাহক নির্বাচন","Clear selection":"নির্বাচন বাতিল",
 "Send email now":"এখনই ইমেইল পাঠান","Ready":"প্রস্তুত","Not eligible":"যোগ্য নয়",
 "Write the email, choose the recipients and send directly from the Halal Food Gmail account.":"ইমেইল লিখুন, গ্রাহক নির্বাচন করুন এবং সরাসরি Halal Food Gmail থেকে পাঠান।",
 "Unique order emails":"অর্ডারের ইউনিক ইমেইল",
 "Email send-ready":"ইমেইলে পাঠানোর যোগ্য",
 "Repeated order addresses counted once":"একই ইমেইল একবার গণনা করা হয়েছে",
 "Customers with email marketing permission":"ইমেইল মার্কেটিং অনুমতি থাকা গ্রাহক",
 "Select all eligible contacts":"সব যোগ্য গ্রাহক নির্বাচন",
 "Source / orders":"উৎস / অর্ডার",
 "Email / phone":"ইমেইল / ফোন",
 "Send eligibility":"পাঠানোর যোগ্যতা",
 "Marketing permission missing":"মার্কেটিং অনুমতি নেই",
 "Order email only":"শুধু অর্ডারে থাকা ইমেইল",
 "WhatsApp opt-in required":"WhatsApp-এ অনুমতি প্রয়োজন",
 "Order contact":"অর্ডারের যোগাযোগ",
 "No contacts match this search.":"এই অনুসন্ধানে কোনো যোগাযোগ পাওয়া যায়নি।"
};
if(window.HFAdminLanguage&&window.HFAdminLanguage.dictionary)Object.assign(window.HFAdminLanguage.dictionary,dict);
window.HFMarketingInit=async function(){
 const H=window.HFAdmin;if(!H)throw new Error("Admin session is not ready.");
 const {client,ADMIN_EMAIL,esc,dateTime,toast,audit,downloadFile,csvText}=H;
 const PAGE_SIZE=30,LOAD_SIZE=500,MAX_CUSTOMERS=30000;
 let customers=[],orderEmailContacts=[],preferences=new Map(),campaigns=[],segmentRules=[],channel="email",activeTab="compose",selected=new Set(),selectionTouched=false,audiencePage=0,consentPage=0,emailProvider={configured:false,from:"",missing:[],providerNote:""},savedCampaignId=null;
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
  const orderRows=[];let orderOffset=0;
  while(orderOffset<MAX_CUSTOMERS){
   const {data,error}=await client.from("orders").select("customer_id,customer_email,customer_name,ordered_at").not("customer_email","is",null).order("ordered_at",{ascending:false}).range(orderOffset,orderOffset+LOAD_SIZE-1);
   if(error)throw error;
   orderRows.push(...(data||[]));orderOffset+=(data||[]).length;
   if(!data||data.length<LOAD_SIZE)break;
  }
  const grouped=new Map();
  orderRows.forEach(o=>{
   const email=String(o.customer_email||"").trim();
   if(!validEmail(email))return;
   const key=email.toLocaleLowerCase();
   let g=grouped.get(key);
   if(!g){g={key,email,orderCount:0,customerIds:new Set(),names:new Set(),lastOrderAt:o.ordered_at||null};grouped.set(key,g);}
   g.orderCount++;
   if(o.customer_id)g.customerIds.add(o.customer_id);
   if(o.customer_name)g.names.add(String(o.customer_name).trim());
   if(o.ordered_at&&(!g.lastOrderAt||new Date(o.ordered_at)>new Date(g.lastOrderAt)))g.lastOrderAt=o.ordered_at;
  });
  const byId=new Map(customers.map(c=>[c.id,c]));
  orderEmailContacts=[...grouped.values()].map(g=>{
   const linked=[...g.customerIds].map(id=>byId.get(id)).filter(Boolean);
   const exact=linked.filter(c=>validEmail(c.email)&&String(c.email).trim().toLocaleLowerCase()===g.key);
   const matched=exact[0]||linked[0]||null;
   return {email:g.email,emailKey:g.key,orderCount:g.orderCount,lastOrderAt:g.lastOrderAt,
    displayName:[...g.names][0]||matched?.name||"Order email contact",
    linkedCustomerCount:linked.length,customer:matched};
  }).sort((a,b)=>new Date(b.lastOrderAt||0)-new Date(a.lastOrderAt||0));
  $("marketingStatsActive").textContent=number(customers.length);
  $("marketingStatsWhatsApp").textContent=number(customers.filter(c=>pref(c.id).whatsapp_opt_in&&normalizePhone(c.phone)).length);
  $("marketingStatsOrderEmails").textContent=number(orderEmailContacts.length);
 }
 async function loadCampaigns(){
  const {data,error}=await client.from("marketing_campaigns").select("id,name,channel,subject,audience_rules,status,audience_count,exported_count,sent_count,failed_count,created_at,updated_at,last_error").order("created_at",{ascending:false}).limit(100);
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
  if(hint)hint.textContent=emailProvider.configured?(emailProvider.providerNote+" This sender is restricted to order updates and customer-service replies. Gmail acceptance is not proof of inbox placement or reading."):"Gmail is not ready. Connect the server-side OAuth credentials before sending customer updates.";
 }
 function matchingEmailContacts(){
  const search=$("mktAudienceSearch").value.trim().toLocaleLowerCase();
  return orderEmailContacts.filter(c=>!!c.customer&&(!search||[c.email,c.displayName].join(" ").toLocaleLowerCase().includes(search)));
 }
 function eligibleCustomersForCurrentChannel(){
  if(channel==="email")return matchingEmailContacts();
  return matchingCustomers().filter(c=>channelHasPermission(c,channel));
 }
 function matchingCustomers(){
  const search=$("mktAudienceSearch").value.trim().toLocaleLowerCase();
  return customers.filter(c=>!search||[c.name,c.phone,c.email,c.segment_name].join(" ").toLocaleLowerCase().includes(search));
 }
 function channelLabel(){return channel==="whatsapp"?"WhatsApp":"Email";}
 function renderAudience(){
  const matches=channel==="email"?matchingEmailContacts():matchingCustomers();
  const eligible=channel==="email"?matches:matches.filter(c=>channelHasPermission(c,channel));
  const selectedRows=channel==="email"?matches.filter(c=>selected.has(c.emailKey)):customers.filter(c=>selected.has(c.id)&&channelHasPermission(c,channel));
  $("mktAudienceCount").textContent=number(matches.length);$("mktEligibleCount").textContent=number(eligible.length);$("mktSelectedCount").textContent=number(selectedRows.length);
  $("mktReviewChannel").textContent=channelLabel();$("mktReviewEligible").textContent=number(eligible.length);$("mktReviewSelected").textContent=number(selectedRows.length);
  $("mktAudiencePage").textContent=matches.length?("Showing "+(audiencePage*PAGE_SIZE+1)+"–"+Math.min((audiencePage+1)*PAGE_SIZE,matches.length)+" of "+number(matches.length)):"No matching contacts";
  $("mktAudiencePrev").disabled=audiencePage<=0;$("mktAudienceNext").disabled=(audiencePage+1)*PAGE_SIZE>=matches.length;
  const visible=matches.slice(audiencePage*PAGE_SIZE,(audiencePage+1)*PAGE_SIZE),body=$("mktAudienceBody");
  if(!visible.length){body.innerHTML='<tr><td colspan="5" class="hf-marketing-muted">No contacts match this search.</td></tr>';$("mktSaveDraft").disabled=true;$("mktSaveDraft").textContent=channel==="email"?"Send customer update":"Export WhatsApp list";return;}
  body.innerHTML=channel==="email"?visible.map(contact=>{
   const checkbox='<input type="checkbox" data-mkt-select="'+esc(contact.emailKey)+'" '+(selected.has(contact.emailKey)?"checked ":"")+'aria-label="Select '+esc(contact.email)+'">';
   return '<tr><td>'+checkbox+'</td><td><div class="hf-marketing-person"><strong>'+esc(contact.displayName)+'</strong><small>'+number(contact.orderCount)+' order record(s)</small></div></td><td><span class="hf-marketing-segment">Previous order</span><small class="hf-marketing-contact">'+(contact.lastOrderAt?esc(dateTime(contact.lastOrderAt)):"")+'</small></td><td><span class="hf-marketing-contact">'+esc(contact.email)+'</span></td><td><span class="hf-marketing-permission is-allowed">Order update ready</span></td></tr>';
  }).join(""):visible.map(c=>{
   const allowed=channelHasPermission(c,channel),contact=normalizePhone(c.phone);
   const permission=allowed?'<span class="hf-marketing-permission is-allowed">Available for reply</span>':'<span class="hf-marketing-permission is-denied">WhatsApp permission required</span>';
   const address=contact?esc(contact):'<span class="hf-marketing-permission is-invalid">Invalid phone</span>';
   return '<tr><td><input type="checkbox" data-mkt-select="'+esc(c.id)+'" '+(selected.has(c.id)?"checked ":"")+(allowed?"":"disabled ")+'aria-label="Select '+esc(safeName(c))+'"></td><td><div class="hf-marketing-person"><strong>'+esc(safeName(c))+'</strong><small>'+esc(c.id.slice(0,8))+'</small></div></td><td><span class="hf-marketing-segment">'+esc(c.segment_name||"Customer")+'</span><small class="hf-marketing-contact">'+number(c.total_orders||0)+' order(s)</small></td><td>'+address+'</td><td>'+permission+'</td></tr>';
  }).join("");
  $("mktReviewNote").textContent=channel==="email"
   ?"Send order-related updates or customer-service messages to the selected previous-order email addresses. The separate Google Sheets order-confirmation automation remains unchanged."
   :(selectedRows.length?"Selected WhatsApp contacts can be exported with ready-to-open chat links. Final sending remains manual in WhatsApp Business.":"WhatsApp can only be used for customers who have asked to receive messages. No WhatsApp API is connected; customer replies can be handled in the active chat.");
  $("mktSaveDraft").textContent=channel==="email"?"Send customer update":"Export WhatsApp list";
  $("mktSaveDraft").disabled=selectedRows.length===0||(channel==="email"&&!emailProvider.configured);
 }
 function statusBadge(status,channel){
  const labels={draft:"Draft",approved:"Ready",sending:"Sending",partially_sent:"Partially sent",sent:channel==="whatsapp"?"Manually recorded":"Gmail accepted",failed:"Failed",cancelled:"Cancelled",exported:"List exported"};
  return '<span class="hf-marketing-status" data-status="'+esc(status)+'">'+esc(labels[status]||String(status||"draft").replace(/_/g," "))+'</span>';
 }
 function renderHistory(){
  const body=$("mktCampaignHistoryBody");
  if(!campaigns.length){body.innerHTML='<tr><td colspan="6" class="hf-marketing-muted">No customer messages have been saved yet.</td></tr>';return;}
  body.innerHTML=campaigns.map(c=>{
   let action="";
   if(c.channel==="whatsapp"){
    if(["draft","exported"].includes(c.status))action+='<button type="button" class="hf-button hf-button-secondary" data-mkt-export="'+esc(c.id)+'">Export chat links</button>';
    if(c.status==="exported")action+='<button type="button" class="hf-button hf-button-primary" data-mkt-whatsapp-sent="'+esc(c.id)+'">Record manually sent</button>';
   }else{
    if(["draft","partially_sent"].includes(c.status)&&emailProvider.configured)action+='<button type="button" class="hf-button hf-button-primary" data-mkt-send="'+esc(c.id)+'">'+(c.status==="partially_sent"?"Continue sending":"Send update")+'</button>';
    if(["draft","partially_sent"].includes(c.status))action+='<button type="button" class="hf-button hf-button-secondary" data-mkt-export="'+esc(c.id)+'">Download contact list</button>';
    if(!emailProvider.configured)action+='<button type="button" class="hf-button hf-button-secondary" disabled title="Gmail OAuth is not connected">Gmail unavailable</button>';
   }
   return '<tr><td><div class="hf-marketing-history-name"><strong>'+esc(c.name)+'</strong><small>'+esc(dateTime(c.created_at))+'</small></div></td><td>'+esc(c.channel==="whatsapp"?"WhatsApp":"Email")+'</td><td>'+statusBadge(c.status,c.channel)+'</td><td>'+number(c.audience_count)+'</td><td>'+number(c.sent_count)+' / '+number(c.failed_count)+'</td><td><div class="hf-marketing-history-actions">'+action+'</div></td></tr>';
  }).join("");
 }
 function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll("[data-marketing-tab]").forEach(b=>b.classList.toggle("is-active",b.dataset.marketingTab===tab));
  document.querySelectorAll("[data-marketing-panel]").forEach(p=>{const active=p.dataset.marketingPanel===tab;p.classList.toggle("is-active",active);p.hidden=!active;});
  if(tab==="history")renderHistory();
 }
 function switchChannel(ch){
  if(ch===channel)return;
  channel=ch;selected.clear();selectionTouched=false;audiencePage=0;
  document.querySelectorAll("[data-marketing-channel]").forEach(b=>b.classList.toggle("is-active",b.dataset.marketingChannel===ch));
  $("mktEmailFields").hidden=ch!=="email";
  $("marketingChannelNote").textContent=ch==="whatsapp"?"WhatsApp recipients are handled manually. Select eligible contacts, export the chat-link list and use WhatsApp Business.":"Select previous-order email addresses, write a subject and customer-service message, then send through Halal Food Gmail.";
  $("mktReviewChannel").textContent=channelLabel();
  if(ch==="email")eligibleCustomersForCurrentChannel().forEach(c=>selected.add(c.emailKey));
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
  const name=subject||((channel==="email"?"Customer update":"WhatsApp reply list")+" "+new Date().toLocaleDateString("en-GB"));
  if(body.length<2)throw new Error("Write the message first.");
  if(channel==="email"&&subject.length<2)throw new Error("An email subject is required.");
  if(selected.size===0)throw new Error("Select at least one recipient.");
  let audience=[],emailRecipients=[];
  if(channel==="email"){
   const chosen=orderEmailContacts.filter(c=>selected.has(c.emailKey));
   if(!chosen.length)throw new Error("Select at least one previous-order email address.");
   const liveById=new Map(customers.map(c=>[c.id,c]));
   const verified=chosen.map(contact=>({contact,customer:liveById.get(contact.customer?.id)}));
   if(verified.some(x=>!x.customer))throw new Error("One or more customer records are no longer active. Refresh the contact list.");
   if(verified.length>10000)throw new Error("A single message is limited to 10,000 recipients.");
   emailRecipients=verified.map(x=>({campaign_id:null,customer_id:x.customer.id,recipient_email:x.contact.email,recipient_name:x.contact.displayName,status:"selected"}));
   audience=verified.map(x=>x.customer);
  }else{
   const ids=[...selected];await reloadPrefs(ids);
   audience=customers.filter(c=>selected.has(c.id)&&channelHasPermission(c,"whatsapp"));
   if(!audience.length)throw new Error("No selected WhatsApp contacts are currently eligible.");
   if(audience.length!==ids.length)throw new Error("Some WhatsApp contacts are no longer eligible. Refresh the list.");
   if(audience.length>10000)throw new Error("A single message is limited to 10,000 recipients.");
  }
  const rules={...getFilterState(),email_purpose:channel==="email"?"customer_update":null,message_type:"customer_service"};
  const recipientCount=channel==="email"?emailRecipients.length:audience.length;
  const payload={name,channel,subject:channel==="email"?subject:null,message_body:body,audience_rules:rules,status:"draft",audience_count:recipientCount,created_by:ADMIN_EMAIL};
  const {data:campaign,error}=await client.from("marketing_campaigns").insert(payload).select("id").single();
  if(error)throw error;
  try{
   const recipientRows=channel==="email"?emailRecipients.map(r=>({...r,campaign_id:campaign.id})):audience.map(c=>({campaign_id:campaign.id,customer_id:c.id,status:"selected"}));
   for(let i=0;i<recipientRows.length;i+=200){const {error:recipientError}=await client.from("marketing_campaign_recipients").insert(recipientRows.slice(i,i+200));if(recipientError)throw recipientError;}
   await client.from("marketing_campaign_events").insert({campaign_id:campaign.id,event_type:"created",details:{channel,audience_count:recipientCount,message_type:"customer_service"},created_by:ADMIN_EMAIL});
  }catch(err){
   await client.from("marketing_campaigns").update({status:"failed",last_error:"Recipient list could not be saved."}).eq("id",campaign.id);throw err;
  }
  savedCampaignId=campaign.id;
  await audit("customer_message_created","marketing_campaign",campaign.id,"Customer update saved with selected order and support contacts",{channel,audience_count:recipientCount});
  await loadCampaigns();renderHistory();
  if(channel==="email"){
   setFeedback("Customer update prepared. Confirm once to send to "+number(recipientCount)+" selected email address(es).");
   const sent=await sendEmail(campaign.id);
   if(sent===false)setFeedback("Customer update was saved but not sent.");
   else{setFeedback("Gmail accepted the customer update. See Message history for the provider result.");selected.clear();selectionTouched=true;renderAudience();}
   return;
  }
  setFeedback("WhatsApp recipient list saved. Export the list and use the individual chat links in WhatsApp Business.");
  toast("WhatsApp contact list saved.","success");switchTab("history");
 }
 async function exportCampaign(id){
  const {data:campaign,error:campaignError}=await client.from("marketing_campaigns").select("id,name,channel,subject,message_body,status").eq("id",id).single();
  if(campaignError)throw campaignError;
  const {data:recipients,error}=await client.from("marketing_campaign_recipients").select("id,customer_id,recipient_email,recipient_name,status").eq("campaign_id",id).in("status",["selected","exported"]).order("created_at",{ascending:true}).limit(10000);
  if(error)throw error;if(!recipients?.length)throw new Error("There are no recipients to export.");
  const ids=[...new Set(recipients.map(r=>r.customer_id))],directory=[];
  for(let i=0;i<ids.length;i+=400){
   const {data,error:dirError}=await client.from("customer_directory").select(cols).in("id",ids.slice(i,i+400)).is("archived_at",null).is("anonymized_at",null).eq("is_blocked",false);
   if(dirError)throw dirError;(data||[]).forEach(c=>directory.push(c));
  }
  await reloadPrefs(ids);const byId=new Map(directory.map(c=>[c.id,c]));
  const rows=[],validRecipientIds=[],suppressedRecipientIds=[];
  recipients.forEach(r=>{
   const c=byId.get(r.customer_id);if(!c){suppressedRecipientIds.push(r.id);return;}
   const contact=campaign.channel==="whatsapp"?normalizePhone(c.phone):(validEmail(r.recipient_email||c.email)?String(r.recipient_email||c.email).trim():"");
   if(!contact){suppressedRecipientIds.push(r.id);return;}
   if(campaign.channel==="whatsapp"){
    if(!channelHasPermission(c,"whatsapp")){suppressedRecipientIds.push(r.id);return;}
    const waNumber="880"+contact.slice(1),personalMessage=personalize(campaign.message_body,c);
    rows.push({name:safeName(c),phone:contact,whatsapp_number:waNumber,personalized_message:personalMessage,whatsapp_chat_url:"https://wa.me/"+waNumber+"?text="+encodeURIComponent(personalMessage)});
   }else rows.push({name:r.recipient_name||safeName(c),email:contact,personalized_message:personalize(campaign.message_body,c),subject:personalize(campaign.subject||"",c)});
   validRecipientIds.push(r.id);
  });
  if(!rows.length)throw new Error("No active contacts remain for this export.");
  downloadFile((campaign.channel==="whatsapp"?"halal-food-whatsapp-replies-":"halal-food-customer-updates-")+id.slice(0,8)+".csv",csvText(rows),"text/csv;charset=utf-8");
  const now=new Date().toISOString();
  for(let i=0;i<suppressedRecipientIds.length;i+=400){
   const {error}=await client.from("marketing_campaign_recipients").update({status:"suppressed",last_error:"The customer profile is no longer active or the contact is invalid."}).in("id",suppressedRecipientIds.slice(i,i+400)).eq("campaign_id",id);if(error)throw error;
  }
  for(let i=0;i<validRecipientIds.length;i+=400){
   const {error}=await client.from("marketing_campaign_recipients").update({status:"exported",exported_at:now}).in("id",validRecipientIds.slice(i,i+400));if(error)throw error;
  }
  if(campaign.channel==="whatsapp")await client.from("marketing_campaigns").update({status:"exported",exported_count:validRecipientIds.length,updated_at:now}).eq("id",id);
  await client.from("marketing_campaign_events").insert({campaign_id:id,event_type:"audience_exported",details:{channel:campaign.channel,exported_count:validRecipientIds.length},created_by:ADMIN_EMAIL});
  await audit("customer_contact_list_exported","marketing_campaign",id,"Selected customer contact list exported",{channel:campaign.channel,exported_count:validRecipientIds.length});
  await loadCampaigns();renderHistory();toast(number(validRecipientIds.length)+" contacts exported. WhatsApp links open chats; export does not send WhatsApp messages.","success");
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
  const ok=window.confirm("Send this customer update from Halal Food to "+number(campaign.audience_count)+" selected email address(es)? This sends real emails. Active customer records and address validity are rechecked by the server.");
  if(!ok)return false;
  const {data,error}=await client.from("marketing_campaigns").update({status:"approved",approved_by:ADMIN_EMAIL,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","partially_sent"]).select("id").maybeSingle();
  if(error)throw error;if(!data)throw new Error("This campaign cannot be sent in its current status.");
  await client.from("marketing_campaign_events").insert({campaign_id:id,event_type:"email_approved",details:{approved_by:ADMIN_EMAIL},created_by:ADMIN_EMAIL});
  const {data:result,error:sendError}=await client.functions.invoke("marketing-email",{body:{action:"send",campaign_id:id}});
  if(sendError)throw sendError;
  if(!result||!result.success)throw new Error(result?.error||"Email provider did not confirm the send.");
  await loadCampaigns();renderHistory();
  toast("Gmail accepted "+number(result.acceptedByProvider??result.sent??0)+" customer update(s); failed/held: "+number(result.failed||0)+", remaining: "+number(result.remaining||0)+".","success");
  return true;
 }
 async function refreshAll(){
  await loadSegmentRules();await loadCustomers();await loadCampaigns();await checkEmailProvider();
  if(channel==="email"&&!selectionTouched&&!selected.size)eligibleCustomersForCurrentChannel().forEach(c=>selected.add(c.emailKey));
  renderAudience();renderHistory();
 }
 document.querySelectorAll("[data-marketing-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.marketingTab)));
 document.querySelectorAll("[data-marketing-channel]").forEach(b=>b.addEventListener("click",()=>switchChannel(b.dataset.marketingChannel)));
 ["mktSegment","mktMinOrders","mktMaxOrders","mktLastOrder","mktAudienceSearch"].forEach(id=>$(id).addEventListener(id==="mktAudienceSearch"?"input":"change",()=>{selected.clear();selectionTouched=true;audiencePage=0;renderAudience();}));
 $("mktSelectAll").addEventListener("click",()=>{selectionTouched=true;eligibleCustomersForCurrentChannel().forEach(c=>selected.add(channel==="email"?c.emailKey:c.id));renderAudience();});
 $("mktClearSelection").addEventListener("click",()=>{selectionTouched=true;selected.clear();renderAudience();});
 $("mktAudienceBody").addEventListener("change",e=>{const box=e.target.closest("[data-mkt-select]");if(!box)return;selectionTouched=true;if(box.checked)selected.add(box.dataset.mktSelect);else selected.delete(box.dataset.mktSelect);renderAudience();});
 $("mktAudiencePrev").addEventListener("click",()=>{audiencePage=Math.max(0,audiencePage-1);renderAudience();});
 $("mktAudienceNext").addEventListener("click",()=>{audiencePage++;renderAudience();});
 $("mktSaveDraft").addEventListener("click",async b=>{const button=$("mktSaveDraft");button.disabled=true;try{await saveCampaign();}catch(err){setFeedback(err.message||"Campaign could not be saved.",true);toast(err.message||"Campaign save failed.","error");}finally{renderAudience();}});
 $("mktCampaignHistoryBody").addEventListener("click",async e=>{
  const exportButton=e.target.closest("[data-mkt-export]"),sendButton=e.target.closest("[data-mkt-send]"),waSent=e.target.closest("[data-mkt-whatsapp-sent]");
  try{if(exportButton)await exportCampaign(exportButton.dataset.mktExport);else if(sendButton)await sendEmail(sendButton.dataset.mktSend);else if(waSent)await recordWhatsAppSent(waSent.dataset.mktWhatsappSent);}
  catch(err){toast(err.message||"Campaign action failed.","error");await loadCampaigns();renderHistory();}
 });
 document.querySelector("[data-marketing-refresh]")?.addEventListener("click",()=>refreshAll().then(()=>toast("Marketing data refreshed.","success")).catch(e=>toast(e.message||"Refresh failed.","error")));
 await refreshAll();
 if(window.HFAdminLanguage?.applyLanguage)window.HFAdminLanguage.applyLanguage();
};
})();
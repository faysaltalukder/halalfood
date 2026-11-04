(() => {
 "use strict";
 const ready=window.HFAdminReady;
 if(!ready)return;
 ready.then(async admin=>{
  if(!admin||document.body.dataset.page!=="ai-conversations")return;
  const {client,toast,esc,dateTime,downloadFile,audit}=admin;
  const $=id=>document.getElementById(id);
  const cfg=window.HALAL_STORE_CONFIG||{};
  const endpoint=String(cfg.supabase?.url||"https://qfwvrcfkrsydycbfjsxf.supabase.co").replace(/\/$/,"")+"/functions/v1/customer-care-chat";
  const labels={open:"Open",reviewed:"Reviewed",archived:"Archived"};
  const isBn=()=>window.HFAdminLanguage?.language()==="bn";
  const feedbackLabels={helpful:"Appreciate",not_helpful:"Disagree"};
  let rows=[],filtered=[],selectedId=null,selectedConversation=null,messages=[],feedback=[],detailSequence=0;
  async function api(payload){
   const {data,error}=await client.auth.getSession();
   if(error||!data?.session?.access_token)throw new Error("Admin session expired. Sign in again.");
   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+data.session.access_token},body:JSON.stringify(payload),cache:"no-store"});
   let body={};try{body=await res.json();}catch(_){}
   if(!res.ok||!body.success)throw new Error(body.code==="ADMIN_AUTH_REQUIRED"?"Admin access or two-step verification is required.":body.code||"Conversation service is unavailable.");
   return body;
  }
  const value=id=>$(id)?.value||"";
  function statusClass(status){return status==="reviewed"?"hf-status-active":status==="open"?"hf-status-review":"hf-status-muted";}
  function statusPill(status){return '<span class="hf-status '+statusClass(status)+'">'+esc(labels[status]||status)+'</span>';}
  function renderMetrics(){
   $("aicTotal").textContent=rows.length.toLocaleString("en-BD");
   $("aicOpen").textContent=rows.filter(r=>r.status==="open").length.toLocaleString("en-BD");
   $("aicReviewed").textContent=rows.filter(r=>r.status==="reviewed").length.toLocaleString("en-BD");
   $("aicArchived").textContent=rows.filter(r=>r.status==="archived").length.toLocaleString("en-BD");
   $("aicUpdated").textContent="Updated "+new Date().toLocaleTimeString("en-BD")+" · latest "+rows.length+" threads";
  }
  function applyFilters(){
   const q=value("aicSearch").trim().toLowerCase(),status=value("aicStatusFilter");
   filtered=rows.filter(r=>(!status||r.status===status)&&(!q||[r.title,r.last_message_preview,r.admin_notes].join(" ").toLowerCase().includes(q)));
   renderList();
  }
  function renderList(){
   $("aicListNote").textContent=isBn()?"মোট "+filtered.length+"টি থেকে "+rows.length+"টি সর্বশেষ কথোপকথনের মধ্যে দেখানো হচ্ছে।":"Showing "+filtered.length+" of "+rows.length+" loaded conversations.";
   $("aicConversationList").innerHTML=filtered.length?filtered.map(r=>{
    const selected=r.id===selectedId;
    return '<button type="button" class="aic-row '+(selected?"is-selected":"")+'" data-conversation-id="'+esc(r.id)+'"><span class="aic-row-main"><span class="aic-row-title">'+esc(r.title||"Customer conversation")+'</span><span class="aic-row-preview">'+esc(r.last_message_preview||"No message preview")+'</span><span class="aic-row-meta"><span>'+esc(dateTime(r.last_message_at))+'</span><span>'+(isBn()?"থ্রেড ":"Thread ")+esc(String(r.id).slice(0,8))+'</span></span></span><span class="aic-row-status">'+statusPill(r.status)+'</span></button>';
   }).join(""):'<div class="aic-no-results">No conversations match this filter.</div>';
  }
  function renderMessages(){
   const byRequest=new Map(feedback.map(item=>[item.request_id,item]));
   $("aicMessages").innerHTML=messages.length?messages.map(message=>{
    const user=message.role==="user",productNames=Array.isArray(message.product_names)?message.product_names.filter(Boolean).slice(0,8):[];
    const f=byRequest.get(message.request_id);
    const when=message.created_at?dateTime(message.created_at):"";
    const foot=[message.model?(isBn()?"মডেল: ":"Model: ")+message.model:"",message.has_image?(isBn()?"গ্রাহক ছবি সংযুক্ত করেছিলেন (ছবির ফাইল রাখা হয়নি)":"Customer image attached (image file not retained)"):""].filter(Boolean).join(" · ");
    return '<article class="aic-message '+(user?"user":"assistant")+'"><div class="aic-message-head"><span>'+(user?"CUSTOMER":"HALAL FOOD AI")+'</span><time>'+esc(when)+'</time></div><div class="aic-message-content">'+esc(message.content||"")+'</div>'+(productNames.length?'<div class="aic-product-chips">'+productNames.map(name=>'<span class="aic-product-chip">'+esc(name)+'</span>').join("")+'</div>':"")+(f?'<div class="aic-message-foot"><span class="aic-feedback-chip">'+esc(feedbackLabels[f.rating]||f.rating)+' feedback'+(f.feedback_reason?" · "+esc(f.feedback_reason.replace(/_/g," ")):"")+'</span></div>':"")+(foot?'<div class="aic-message-foot">'+esc(foot)+'</div>':"")+'</article>';
   }).join(""):'<div class="aic-no-results">No messages were saved for this thread.</div>';
  }
  function renderDetail(){
   const c=selectedConversation;
   if(!c){$("aicDetailContent").hidden=true;$("aicDetailEmpty").hidden=false;$("aicDetailTitle").textContent="Select a conversation";$("aicDetailSubtitle").textContent="The complete customer and assistant messages will appear here.";$("aicDetailBadge").innerHTML="";return;}
   $("aicDetailEmpty").hidden=true;$("aicDetailContent").hidden=false;
   $("aicDetailTitle").textContent=c.title||"Customer conversation";
   $("aicDetailSubtitle").textContent=isBn()?"শুরু "+dateTime(c.created_at)+" · সর্বশেষ কার্যক্রম "+dateTime(c.last_message_at):"Started "+dateTime(c.created_at)+" · Last activity "+dateTime(c.last_message_at);
   $("aicDetailBadge").innerHTML=statusPill(c.status);
   $("aicThreadMeta").textContent=isBn()?"থ্রেড আইডি: "+c.id+" · "+messages.length+"টি বার্তা সংরক্ষিত"+(c.reviewed_by?" · সর্বশেষ পর্যালোচনা: "+c.reviewed_by+" কর্তৃক":""):"Thread ID: "+c.id+" · "+messages.length+" saved messages"+(c.reviewed_by?" · Last reviewed by "+c.reviewed_by:"");
   $("aicReviewStatus").value=c.status||"open";
   $("aicAdminNotes").value=c.admin_notes||"";
   $("aicReviewedInfo").textContent=c.reviewed_at?(isBn()?"পর্যালোচিত "+dateTime(c.reviewed_at)+(c.reviewed_by?" · "+c.reviewed_by+" কর্তৃক":""):"Reviewed "+dateTime(c.reviewed_at)+(c.reviewed_by?" by "+c.reviewed_by:"")):(isBn()?"এই থ্রেডকে এখনো পর্যালোচিত হিসেবে চিহ্নিত করা হয়নি।":"This thread has not been marked as reviewed.");
   $("aicSaveError").textContent="";
   renderMessages();
  }
  async function selectConversation(id){
   const seq=++detailSequence;selectedId=id;selectedConversation=null;messages=[];feedback=[];renderList();renderDetail();
   $("aicDetailTitle").textContent=isBn()?"কথোপকথন লোড হচ্ছে…":"Loading conversation…";
   try{
    const data=await api({action:"admin_conversation_detail",conversationId:id});
    if(seq!==detailSequence)return;
    selectedConversation=data.conversation||null;messages=Array.isArray(data.messages)?data.messages:[];feedback=Array.isArray(data.feedback)?data.feedback:[];
    renderDetail();renderList();
   }catch(error){
    if(seq!==detailSequence)return;
    $("aicDetailContent").hidden=true;$("aicDetailEmpty").hidden=false;
    $("aicDetailEmpty").classList.add("aic-empty-error");
    $("aicDetailEmpty").textContent="Conversation could not be opened. "+error.message;
    toast(error.message||"Could not open conversation.","error");
   }
  }
  async function load(){
   $("aicConversationList").innerHTML='<div class="hf-loading">Loading customer conversations…</div>';
   try{
    const result=await api({action:"admin_conversations_list",limit:400});
    rows=Array.isArray(result.rows)?result.rows:[];
    renderMetrics();applyFilters();
    if(selectedId&&rows.some(r=>r.id===selectedId))await selectConversation(selectedId);
    else if(rows.length)await selectConversation(rows[0].id);
    else{selectedId=null;selectedConversation=null;messages=[];feedback=[];renderDetail();}
   }catch(error){
    $("aicConversationList").innerHTML='<div class="aic-no-results">Conversations could not be loaded. '+esc(error.message)+'</div>';
    toast(error.message||"Could not load conversations.","error");
   }
  }
  async function saveReview(){
   if(!selectedId||!selectedConversation){toast("Select a conversation first.","error");return;}
   const status=value("aicReviewStatus"),adminNotes=$("aicAdminNotes").value.trim();
   $("aicSaveReview").disabled=true;
   try{
    await api({action:"admin_conversation_update",conversationId:selectedId,status,adminNotes});
    await audit("ai_customer_care_conversation_"+status,"ai_customer_care_conversation",selectedId,"AI conversation reviewed",{status,notesPresent:!!adminNotes,messageCount:messages.length});
    toast("Conversation review saved.");
    await load();
   }catch(error){$("aicSaveError").textContent=error.message||"Could not save review.";toast("Review was not saved.","error");}
   finally{$("aicSaveReview").disabled=false;}
  }
  function exportThread(){
   if(!selectedConversation)return;
   const header=[selectedConversation.title||"Customer conversation","Thread ID: "+selectedConversation.id,"Created: "+dateTime(selectedConversation.created_at),"Status: "+(labels[selectedConversation.status]||selectedConversation.status),"",""];
   const body=messages.map(m=>{
    const role=m.role==="user"?"CUSTOMER":"HALAL FOOD AI";
    const when=m.created_at?dateTime(m.created_at):"";
    const products=Array.isArray(m.product_names)&&m.product_names.length?"\nProducts: "+m.product_names.join(", "):"";
    const model=m.model?"\nModel: "+m.model:"";
    return "["+when+"] "+role+"\n"+String(m.content||"")+products+model;
   });
   const notes=selectedConversation.admin_notes?"\n\nPRIVATE ADMIN NOTES\n"+selectedConversation.admin_notes:"";
   downloadFile("halal-food-ai-thread-"+String(selectedConversation.id).slice(0,8)+".txt",header.join("\n")+body.join("\n\n")+notes,"text/plain;charset=utf-8");
  }
  $("aicRefresh").addEventListener("click",load);
  $("aicSearch").addEventListener("input",applyFilters);
  $("aicStatusFilter").addEventListener("change",applyFilters);
  $("aicConversationList").addEventListener("click",event=>{const item=event.target.closest("[data-conversation-id]");if(item)selectConversation(item.dataset.conversationId);});
  $("aicSaveReview").addEventListener("click",saveReview);
  $("aicExportThread").addEventListener("click",exportThread);
  await load();
 });
})();
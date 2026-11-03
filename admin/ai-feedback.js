(() => {
 "use strict";
 const ready=window.HFAdminReady;
 if(!ready)return;
 ready.then(async admin=>{
  if(!admin||document.body.dataset.page!=="ai-feedback")return;
  const {client,toast,esc,dateTime,downloadFile,csvText,audit}=admin;
  const $=id=>document.getElementById(id);
  const cfg=window.HALAL_STORE_CONFIG||{};
  const endpoint=String(cfg.supabase?.url||"https://qfwvrcfkrsydycbfjsxf.supabase.co").replace(/\/$/,"")+"/functions/v1/customer-care-chat";
  let rows=[],filtered=[],selectedId=null;
  const reasonLabels={wrong_product:"ভুল পণ্য",misunderstood:"প্রশ্ন বোঝেনি",incorrect_information:"ভুল তথ্য",irrelevant:"অপ্রাসঙ্গিক",unclear:"অস্পষ্ট উত্তর",other:"অন্য কারণ"};
  const statusLabels={new:"নতুন",reviewed:"রিভিউ হয়েছে",applied:"প্রয়োগ করা হয়েছে",dismissed:"বাদ দেওয়া হয়েছে"};
  async function api(payload){
   const {data,error}=await client.auth.getSession();if(error||!data?.session?.access_token)throw new Error("Admin session expired. Sign in again.");
   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+data.session.access_token},body:JSON.stringify(payload),cache:"no-store"});
   let body={};try{body=await res.json();}catch(_){}
   if(!res.ok||!body.success)throw new Error(body.code==="ADMIN_AUTH_REQUIRED"?"Admin access or two-step verification is required.":body.code||"Feedback service is unavailable.");
   return body;
  }
  const value=id=>$(id)?.value||"";
  function applyFilters(){
   const q=value("aifSearch").trim().toLowerCase(),rating=value("aifRating"),status=value("aifStatus"),reason=value("aifReason");
   filtered=rows.filter(r=>(!rating||r.rating===rating)&&(!status||r.review_status===status)&&(!reason||r.feedback_reason===reason)&&(!q||[r.question,r.answer,(r.product_names||[]).join(" "),r.corrected_answer].join(" ").toLowerCase().includes(q)));
   renderList();
  }
  function renderMetrics(){
   const bad=rows.filter(r=>r.rating==="not_helpful");
   $("aifTotal").textContent=rows.length.toLocaleString("en-BD");
   $("aifHelpful").textContent=rows.filter(r=>r.rating==="helpful").length.toLocaleString("en-BD");
   $("aifNeedsReview").textContent=bad.filter(r=>r.review_status==="new").length.toLocaleString("en-BD");
   $("aifApplied").textContent=rows.filter(r=>r.review_status==="applied"&&r.corrected_answer).length.toLocaleString("en-BD");
   const counts=Object.keys(reasonLabels).map(k=>({key:k,count:bad.filter(r=>r.feedback_reason===k).length}));
   $("aifReasonBreakdown").innerHTML=counts.map(x=>'<div class="aif-reason"><strong>'+x.count+'</strong><span>'+esc(reasonLabels[x.key])+'</span></div>').join("");
   $("aifUpdated").textContent="Updated "+new Date().toLocaleTimeString("en-BD")+" · latest "+rows.length+" records";
  }
  function renderList(){
   $("aifListNote").textContent="Showing "+filtered.length+" of "+rows.length+" loaded feedback records. Search and filters apply to this set.";
   $("aifFeedbackList").innerHTML=filtered.length?filtered.map(r=>{
    const isSelected=r.request_id===selectedId;
    const rating=r.rating==="helpful"?'<span class="aif-rating good">👍 Appreciate</span>':'<span class="aif-rating bad">👎 Disagree</span>';
    const product=Array.isArray(r.product_names)&&r.product_names.length?r.product_names.join(", "):"No product attached";
    return '<button type="button" class="aif-item '+(isSelected?"is-selected":"")+'" data-feedback-id="'+esc(r.request_id)+'"><span class="aif-item-main"><span class="aif-item-title">'+rating+' '+(r.feedback_reason?'<span>'+esc(reasonLabels[r.feedback_reason]||r.feedback_reason)+'</span>':"")+'</span><span class="aif-item-question">'+esc(r.question||"No question captured")+'</span><span class="aif-item-meta">'+esc(product)+' · '+esc(dateTime(r.created_at))+' · '+esc(r.model||"model not recorded")+'</span></span><span class="aif-item-status hf-status hf-status-'+(r.review_status==="applied"?"active":r.review_status==="new"?"review":"muted")+'">'+esc(statusLabels[r.review_status]||r.review_status)+'</span></button>';
   }).join(""):'<div class="aif-item-empty">এই ফিল্টারে কোনো feedback পাওয়া যায়নি।</div>';
  }
  function selectRow(id){
   const r=rows.find(x=>x.request_id===id);if(!r)return;selectedId=id;
   $("aifReviewTitle").textContent=r.rating==="helpful"?"Helpful answer review":"Answer correction review";
   $("aifReviewSubtitle").textContent=reasonLabels[r.feedback_reason]||"Feedback received "+dateTime(r.created_at);
   $("aifReviewEmpty").hidden=true;$("aifReviewContent").hidden=false;
   $("aifQuestion").textContent=r.question||"No question captured.";
   $("aifAnswer").textContent=r.answer||"No answer captured.";
   $("aifProductContext").textContent="Products: "+((r.product_names||[]).join(", ")||"None recorded")+" · Model: "+(r.model||"Unknown")+" · Source: "+(r.source||"storefront");
   $("aifCorrectedAnswer").value=r.corrected_answer||"";
   $("aifAdminNotes").value=r.admin_notes||"";
   $("aifReviewStatus").value=r.review_status||"new";
   $("aifSaveError").textContent="";
   renderList();
  }
  async function load(){
   $("aifFeedbackList").innerHTML='<div class="hf-loading">Loading feedback records…</div>';
   try{
    const result=await api({action:"admin_feedback_list",limit:500});
    rows=Array.isArray(result.rows)?result.rows:[];
    renderMetrics();applyFilters();
    if(selectedId&&rows.some(r=>r.request_id===selectedId))selectRow(selectedId);
    else{selectedId=null;$("aifReviewContent").hidden=true;$("aifReviewEmpty").hidden=false;$("aifReviewTitle").textContent="Select a feedback item";}
   }catch(error){
    $("aifFeedbackList").innerHTML='<div class="aif-item-empty">Feedback could not be loaded. '+esc(error.message)+'</div>';
    toast(error.message||"Could not load feedback.","error");
   }
  }
  async function save(statusOverride){
   const id=selectedId;if(!id){toast("Select a feedback item first.","error");return;}
   const status=statusOverride||value("aifReviewStatus"),correctedAnswer=$("aifCorrectedAnswer").value.trim(),adminNotes=$("aifAdminNotes").value.trim();
   if(status==="applied"&&!correctedAnswer){$("aifSaveError").textContent="Applied করার আগে corrected ideal answer লিখুন।";return;}
   $("aifSaveReview").disabled=true;
   try{
    await api({action:"admin_feedback_update",requestId:id,status,correctedAnswer,adminNotes});
    await audit("ai_customer_care_feedback_"+status,"ai_customer_care_feedback",id,"AI feedback reviewed",{status,hasCorrectedAnswer:!!correctedAnswer});
    toast("Feedback review saved.");
    await load();selectRow(id);
   }catch(error){$("aifSaveError").textContent=error.message||"Could not save review.";toast("Review was not saved.","error");}
   finally{$("aifSaveReview").disabled=false;}
  }
  function exportCsv(){
   const data=filtered.map(r=>({request_id:r.request_id,rating:r.rating,reason:reasonLabels[r.feedback_reason]||r.feedback_reason,status:r.review_status,question:r.question,original_answer:r.answer,corrected_answer:r.corrected_answer,admin_notes:r.admin_notes,products:(r.product_names||[]).join(" | "),model:r.model,created_at:r.created_at,reviewed_by:r.reviewed_by}));
   downloadFile("halal-food-ai-feedback.csv",csvText(data),"text/csv;charset=utf-8");
  }
  function exportJsonl(){
   const curated=rows.filter(r=>r.review_status==="applied"&&r.corrected_answer&&r.question);
   if(!curated.length){toast("No Applied records with corrected answers yet. Review and correct examples first.","error");return;}
   const lines=curated.map(r=>JSON.stringify({messages:[{role:"user",content:r.question},{role:"assistant",content:r.corrected_answer}],metadata:{request_id:r.request_id,feedback_reason:r.feedback_reason,rating:r.rating,source:"halal-food-owner-reviewed"}}));
   downloadFile("halal-food-reviewed-training.jsonl",lines.join("\n")+"\n","application/jsonl;charset=utf-8");
   toast(curated.length+" curated training examples exported.");
  }
  $("aifRefresh").addEventListener("click",load);
  ["aifSearch","aifRating","aifStatus","aifReason"].forEach(id=>$(id).addEventListener(id==="aifSearch"?"input":"change",applyFilters));
  $("aifFeedbackList").addEventListener("click",e=>{const item=e.target.closest("[data-feedback-id]");if(item)selectRow(item.dataset.feedbackId);});
  $("aifSaveReview").addEventListener("click",()=>save());
  $("aifMarkReviewed").addEventListener("click",()=>save("reviewed"));
  $("aifExportCsv").addEventListener("click",exportCsv);
  $("aifExportJsonl").addEventListener("click",exportJsonl);
  await load();
 });
})();
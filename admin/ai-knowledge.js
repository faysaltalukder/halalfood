(() => {
 "use strict";
 const ready = window.HFAdminReady;
 if (!ready) return;
 ready.then(async admin => {
  if (!admin || document.body.dataset.page !== "ai-knowledge") return;
  const {client,toast,audit,esc,dateTime} = admin;
  const $ = id => document.getElementById(id);
  let docs=[], products=[], profiles=[], selectedProduct=null;
  const fields = {
   quality_summary:"aiKbQuality",ingredients:"aiKbIngredients",origin:"aiKbOrigin",production_method:"aiKbProduction",
   taste_aroma_profile:"aiKbTaste",texture_profile:"aiKbTexture",usage_instructions:"aiKbUsage",
   storage_instructions:"aiKbStorage",allergen_info:"aiKbAllergen",certification_info:"aiKbCertification"
  };
  const lines = value => String(value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const text = id => $(id)?.value?.trim() || "";
  const setText = (id,value) => { const el=$(id); if(!el)return; if("value" in el)el.value=value??""; else el.textContent=value??""; };
  const statusPill = status => '<span class="hf-status hf-status-'+esc(status==='published'?'active':status==='draft'?'review':'muted')+'">'+esc(status||'unknown')+'</span>';
  function switchTab(tab){
   document.querySelectorAll("[data-ai-kb-tab]").forEach(b=>{const active=b.dataset.aiKbTab===tab;b.classList.toggle("is-active",active);b.setAttribute("aria-selected",String(active));});
   $("aiKbDocuments").hidden=tab!=="documents";$("aiKbProducts").hidden=tab!=="products";
  }
  document.querySelectorAll("[data-ai-kb-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.aiKbTab)));
  async function loadAll(){
   $("aiKbDocList").innerHTML='<div class="hf-loading">Loading knowledge documents…</div>';
   $("aiKbProductList").innerHTML='<div class="hf-loading">Loading product profiles…</div>';
   try{
    const [d,p,k]=await Promise.all([
     client.from("ai_knowledge_documents").select("*").order("priority",{ascending:true}).order("title"),
     client.from("products").select("id,name,category,price,display_price,unit_type,is_active").order("name"),
     client.from("ai_product_knowledge").select("*").order("updated_at",{ascending:false})
    ]);
    if(d.error)throw d.error;if(p.error)throw p.error;if(k.error)throw k.error;
    docs=d.data||[];products=(p.data||[]).filter(x=>x.is_active===true);profiles=k.data||[];
    $("aiKbDocCount").textContent=docs.length;$("aiKbDocMeta").textContent=docs.filter(x=>x.status==="published").length+" published · "+docs.filter(x=>x.status==="draft").length+" drafts";
    $("aiKbProfileCount").textContent=profiles.filter(x=>x.status==="published").length;
    $("aiKbProfileMeta").textContent=profiles.length+" created · "+Math.max(0,products.length-profiles.length)+" without profile";
    $("aiKbCatalogCount").textContent=products.length;
    renderDocs();renderProducts();
   }catch(error){
    $("aiKbDocList").innerHTML='<div class="ai-kb-empty">Could not load AI knowledge. Verify admin MFA and database access, then refresh.</div>';
    $("aiKbProductList").innerHTML='<div class="ai-kb-empty">Could not load product profiles.</div>';
    toast(error.message||"Could not load AI knowledge.","error");
   }
  }
  function renderDocs(){
   const q=text("aiKbDocSearch").toLowerCase(),status=$("aiKbDocFilter").value;
   const rows=docs.filter(d=>(!status||d.status===status)&&(!q||[d.title,d.document_key,d.content,d.document_type].join(" ").toLowerCase().includes(q)));
   $("aiKbDocList").innerHTML=rows.length?rows.map(d=>'<article class="ai-kb-record"><div class="ai-kb-record-main"><strong>'+esc(d.title)+'</strong><small>'+esc(d.document_key)+' · '+esc(d.document_type)+' · '+esc(d.language)+'<br>Priority '+esc(d.priority)+' · Updated '+esc(dateTime(d.updated_at))+'<br>'+statusPill(d.status)+'</small></div><div class="ai-kb-record-actions"><button type="button" class="hf-button hf-button-secondary" data-doc-edit="'+esc(d.id)+'">Edit</button>'+(d.status==="published"?'<button type="button" class="hf-button hf-button-secondary" data-doc-status="'+esc(d.id)+'" data-status="archived">Archive</button>':'<button type="button" class="hf-button hf-button-primary" data-doc-status="'+esc(d.id)+'" data-status="published">Publish</button>')+'</div></article>').join(""):'<div class="ai-kb-empty">No matching knowledge documents.</div>';
  }
  function resetDoc(){
   $("aiKbDocForm").reset();setText("aiKbDocId","");setText("aiKbDocPriority","100");setText("aiKbDocFormTitle","Create knowledge document");$("aiKbDocError").textContent="";
  }
  function editDoc(id){
   const d=docs.find(x=>x.id===id);if(!d)return;
   setText("aiKbDocId",d.id);setText("aiKbDocTitle",d.title);setText("aiKbDocKey",d.document_key);setText("aiKbDocType",d.document_type);
   setText("aiKbDocLanguage",d.language);setText("aiKbDocPriority",d.priority);setText("aiKbDocContent",d.content);
   setText("aiKbDocSource",d.source_label);setText("aiKbDocExpiry",d.expires_at?String(d.expires_at).slice(0,10):"");
   $("aiKbDocFormTitle").textContent="Edit knowledge document";$("aiKbDocError").textContent="";
   $("aiKbDocForm").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function saveDoc(status){
   const id=text("aiKbDocId"),payload={title:text("aiKbDocTitle"),document_key:text("aiKbDocKey"),document_type:$("aiKbDocType").value,language:$("aiKbDocLanguage").value,priority:Number($("aiKbDocPriority").value||100),content:text("aiKbDocContent"),source_label:text("aiKbDocSource")||null,expires_at:text("aiKbDocExpiry")?new Date(text("aiKbDocExpiry")+"T23:59:59").toISOString():null,status,updated_at:new Date().toISOString()};
   if(!payload.title||!payload.document_key||!payload.content)throw new Error("Title, document key and verified content are required.");
   if(!/^[a-z0-9][a-z0-9-]*$/.test(payload.document_key))throw new Error("Use a lowercase English key with letters, numbers and hyphens.");
   if(status==="published")payload.verified_at=new Date().toISOString();
   if(id){const old=docs.find(x=>x.id===id);payload.version=Number(old?.version||1)+1;const r=await client.from("ai_knowledge_documents").update(payload).eq("id",id);if(r.error)throw r.error;}
   else{payload.version=1;const r=await client.from("ai_knowledge_documents").insert(payload);if(r.error)throw r.error;}
   await audit("ai_knowledge_document_"+status,"ai_knowledge_document",id||payload.document_key,payload.title,{status,document_type:payload.document_type});
   await loadAll();resetDoc();toast(status==="published"?"Knowledge published for the AI assistant.":"Knowledge draft saved.");
  }
  function renderProducts(){
   const q=text("aiKbProductSearch").toLowerCase(),status=$("aiKbProductStatus").value;
   const rows=products.filter(p=>{const profile=profiles.find(x=>x.product_id===p.id);return(!q||[p.name,p.category].join(" ").toLowerCase().includes(q))&&(!status||(status==="missing"?!profile:profile?.status===status));});
   $("aiKbProductList").innerHTML=rows.length?rows.map(p=>{const k=profiles.find(x=>x.product_id===p.id);return '<button type="button" class="ai-kb-record '+(selectedProduct?.id===p.id?'is-selected':'')+'" data-product-edit="'+esc(p.id)+'"><span class="ai-kb-record-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||"Uncategorized")+' · '+esc(p.display_price||("৳ "+p.price+" / "+(p.unit_type||"piece")))+'<br>'+(k?statusPill(k.status):'<span class="hf-status hf-status-review">profile missing</span>')+'</small></span><span class="ai-kb-record-actions"><span class="hf-button hf-button-secondary">Edit profile</span></span></button>';}).join(""):'<div class="ai-kb-empty">No products match this filter.</div>';
  }
  function editProduct(id){
   const p=products.find(x=>x.id===id);if(!p)return;selectedProduct=p;
   const k=profiles.find(x=>x.product_id===id)||{};
   setText("aiKbProductId",id);setText("aiKbProductTitle",p.name);setText("aiKbProductSubtitle",(p.category||"Uncategorized")+" · "+(p.display_price||("৳ "+p.price+" / "+(p.unit_type||"piece"))));
   $("aiKbProductStatusBadge").textContent=k.status||"New profile";
   Object.entries(fields).forEach(([key,id])=>setText(id,k[key]||""));
   setText("aiKbClaims",Array.isArray(k.verified_claims)?k.verified_claims.join("\n"):"");
   setText("aiKbFit",Array.isArray(k.customer_fit)?k.customer_fit.join("\n"):"");
   setText("aiKbFaq",Array.isArray(k.faq)?k.faq.map(x=>(x.question||"")+" | "+(x.answer||"")).join("\n"):"");
   setText("aiKbProhibited",Array.isArray(k.prohibited_claims)?k.prohibited_claims.join("\n"):"");
   setText("aiKbSourceNotes",k.source_notes||"");$("aiKbProductError").textContent="";
   renderProducts();$("aiKbProductForm").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function saveProduct(status){
   const id=text("aiKbProductId");if(!id)throw new Error("Select a catalog product first.");
   const existing=profiles.find(x=>x.product_id===id);
   const payload={product_id:id,status,version:Number(existing?.version||0)+1,updated_at:new Date().toISOString(),verified_at:status==="published"?new Date().toISOString():null};
   Object.entries(fields).forEach(([key,id])=>payload[key]=text(id)||null);
   payload.verified_claims=lines(text("aiKbClaims"));payload.customer_fit=lines(text("aiKbFit"));
   payload.faq=lines(text("aiKbFaq")).map(line=>{const i=line.indexOf("|");return i<0?null:{question:line.slice(0,i).trim(),answer:line.slice(i+1).trim()};}).filter(x=>x&&x.question&&x.answer);
   payload.prohibited_claims=lines(text("aiKbProhibited"));payload.source_notes=text("aiKbSourceNotes")||null;
   if(status==="published"&&!Object.entries(fields).some(([key])=>payload[key]))throw new Error("Add at least one verified product fact before publishing.");
   if(existing){const r=await client.from("ai_product_knowledge").update(payload).eq("product_id",id);if(r.error)throw r.error;}
   else{const r=await client.from("ai_product_knowledge").insert(payload);if(r.error)throw r.error;}
   await audit("ai_product_knowledge_"+status,"product",id,selectedProduct?.name||"Product profile",{status,version:payload.version});
   await loadAll();editProduct(id);toast(status==="published"?"Verified product profile published.":"Product profile draft saved.");
  }
  $("aiKbDocForm").addEventListener("submit",async e=>{e.preventDefault();try{await saveDoc("published");}catch(err){$("aiKbDocError").textContent=err.message||"Could not publish document.";toast("Could not publish knowledge.","error");}});
  $("aiKbDocSaveDraft").addEventListener("click",async()=>{try{await saveDoc("draft");}catch(err){$("aiKbDocError").textContent=err.message||"Could not save draft.";toast("Could not save draft.","error");}});
  $("aiKbDocReset").addEventListener("click",resetDoc);$("aiKbNewDoc").addEventListener("click",resetDoc);
  $("aiKbDocList").addEventListener("click",async e=>{const edit=e.target.closest("[data-doc-edit]"),change=e.target.closest("[data-doc-status]");if(edit){editDoc(edit.dataset.docEdit);return;}if(change){const d=docs.find(x=>x.id===change.dataset.docStatus);if(!d)return;try{const payload={status:change.dataset.status,version:Number(d.version||1)+1,updated_at:new Date().toISOString()};if(payload.status==="published")payload.verified_at=new Date().toISOString();const r=await client.from("ai_knowledge_documents").update(payload).eq("id",d.id);if(r.error)throw r.error;await audit("ai_knowledge_document_"+payload.status,"ai_knowledge_document",d.id,d.title,{status:payload.status});await loadAll();toast("Knowledge status updated.");}catch(err){toast(err.message||"Could not update document.","error");}}});
  $("aiKbProductList").addEventListener("click",e=>{const b=e.target.closest("[data-product-edit]");if(b)editProduct(b.dataset.productEdit);});
  $("aiKbProductForm").addEventListener("submit",async e=>{e.preventDefault();try{await saveProduct("published");}catch(err){$("aiKbProductError").textContent=err.message||"Could not publish profile.";toast("Could not publish profile.","error");}});
  $("aiKbProductSaveDraft").addEventListener("click",async()=>{try{await saveProduct("draft");}catch(err){$("aiKbProductError").textContent=err.message||"Could not save draft.";toast("Could not save profile.","error");}});
  ["aiKbDocSearch","aiKbDocFilter"].forEach(id=>$(id).addEventListener("input",renderDocs));
  ["aiKbProductSearch","aiKbProductStatus"].forEach(id=>$(id).addEventListener("input",renderProducts));
  $("aiKbRefresh").addEventListener("click",loadAll);
  await loadAll();
 });
})();
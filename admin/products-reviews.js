(() => {
"use strict";
const H=window.HFAdmin;
if(!H)return;
const $=id=>document.getElementById(id);
const esc=H.esc;
let reviews=[],products=[],productById=new Map();
const statusBadge=status=>'<span class="hf-status hf-status-'+esc(status)+'">'+esc(status)+'</span>';
function render(){
 const q=String($("reviewSearch").value||"").toLowerCase().trim();
 const productId=$("reviewProductFilter").value,status=$("reviewStatusFilter").value,rating=$("reviewRatingFilter").value;
 const rows=reviews.filter(review=>{
  const product=productById.get(review.product_id);
  return (!q||[review.reviewer_name,review.review_text,product?.name].join(" ").toLowerCase().includes(q))
   &&(!productId||review.product_id===productId)
   &&(!status||review.status===status)
   &&(!rating||String(review.rating)===rating);
 });
 $("reviewAllCount").textContent=reviews.length.toLocaleString("en-BD");
 $("reviewPendingCount").textContent=reviews.filter(r=>r.status==="pending").length.toLocaleString("en-BD");
 $("reviewPublishedCount").textContent=reviews.filter(r=>r.status==="published").length.toLocaleString("en-BD");
 $("reviewHiddenCount").textContent=reviews.filter(r=>r.status==="hidden").length.toLocaleString("en-BD");
 $("reviewTableBody").innerHTML=rows.length?rows.map(review=>{
  const product=productById.get(review.product_id);
  const source=review.source==="admin"?"Admin added":"Customer";
  const primary=review.status==="published"
   ?'<button class="hf-button hf-button-secondary hf-button-small" data-review-hide="'+esc(review.id)+'">Hide</button>'
   :'<button class="hf-button hf-button-success hf-button-small" data-review-publish="'+esc(review.id)+'">Publish</button>';
  const restore=review.status==="rejected"||review.status==="hidden"
   ?'<button class="hf-button hf-button-secondary hf-button-small" data-review-pending="'+esc(review.id)+'">Pending</button>':"";
  return '<tr><td><div class="pt-review-text"><strong>'+esc(review.reviewer_name)+'</strong><p>'+esc(review.review_text)+'</p>'+(review.verified_purchase?'<small>Verified purchase</small>':"")+'</div></td><td>'+esc(product?.name||"Deleted product")+'</td><td><strong class="pt-rating-stars">'+("★".repeat(Number(review.rating))+"☆".repeat(5-Number(review.rating)))+'</strong><small>'+Number(review.rating)+'/5</small></td><td>'+esc(source)+'</td><td>'+statusBadge(review.status)+'</td><td>'+H.dateTime(review.created_at)+'</td><td><div class="pt-review-actions"><button class="hf-button hf-button-secondary hf-button-small" data-review-edit="'+esc(review.id)+'">Edit</button>'+primary+restore+'<button class="hf-button hf-button-danger hf-button-small" data-review-delete="'+esc(review.id)+'">Delete</button></div></td></tr>';
 }).join(""):'<tr><td colspan="7">'+H.makeEmpty("No reviews found","New customer reviews will appear here as Pending.")+'</td></tr>';
}
async function refresh(){
 const [reviewRows,productRows]=await Promise.all([
  H.signedQuery(H.client.from("product_reviews").select("id,product_id,reviewer_name,rating,review_text,source,status,verified_purchase,published_at,created_at,updated_at").order("created_at",{ascending:false}).limit(2000)),
  H.fetchProducts()
 ]);
 reviews=reviewRows;products=productRows;productById=new Map(products.map(p=>[p.id,p]));
 const productOptions='<option value="">All products</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");
 $("reviewProductFilter").innerHTML=productOptions;
 $("manualReviewProduct").innerHTML='<option value="">Choose product</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");
 render();
}
function openReview(review=null){
 $("manualReviewForm").reset();
 $("manualReviewId").value=review?.id||"";
 $("manualReviewProduct").value=review?.product_id||"";
 $("manualReviewName").value=review?.reviewer_name||"";
 $("manualReviewRating").value=String(review?.rating||5);
 $("manualReviewText").value=review?.review_text||"";
 $("manualReviewStatus").value=review?.status||"pending";
 $("manualReviewDialogTitle").textContent=review?"Edit review":"Add a manual product review";
 $("manualReviewError").textContent="";
 $("manualReviewDialog").showModal();
}
async function setStatus(id,status){
 const row=reviews.find(review=>review.id===id);if(!row)return;
 const payload={status,published_at:status==="published"?(row.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
 const {error}=await H.client.from("product_reviews").update(payload).eq("id",id);
 if(error)throw error;
 await H.audit("product_review_"+status,"product_review",id,"Product review status changed",{status,product_id:row.product_id,source:row.source});
 H.toast(status==="published"?"Review published on the product page.":status==="hidden"?"Review hidden from customers.":"Review returned to Pending.");
 await refresh();
}
async function init(){
 ["reviewSearch","reviewProductFilter","reviewStatusFilter","reviewRatingFilter"].forEach(id=>{
  $(id).addEventListener(id==="reviewSearch"?"input":"change",render);
 });
 $("reviewAddManual").addEventListener("click",()=>openReview());
 document.querySelectorAll("[data-review-close]").forEach(button=>button.addEventListener("click",()=>$("manualReviewDialog").close()));
 $("reviewTableBody").addEventListener("click",async event=>{
  const button=event.target.closest("[data-review-edit],[data-review-publish],[data-review-hide],[data-review-pending],[data-review-delete]");
  if(!button)return;
  const id=button.dataset.reviewEdit||button.dataset.reviewPublish||button.dataset.reviewHide||button.dataset.reviewPending||button.dataset.reviewDelete;
  const row=reviews.find(review=>review.id===id);if(!row)return;
  try{
   if(button.dataset.reviewEdit){openReview(row);return;}
   if(button.dataset.reviewDelete){
    if(!confirm("Delete this review permanently? This cannot be undone."))return;
    const {error}=await H.client.from("product_reviews").delete().eq("id",id);if(error)throw error;
    await H.audit("product_review_deleted","product_review",id,"Product review permanently deleted",{product_id:row.product_id,source:row.source});
    H.toast("Review deleted.");await refresh();return;
   }
   const status=button.dataset.reviewPublish?"published":button.dataset.reviewHide?"hidden":"pending";
   await setStatus(id,status);
  }catch(error){H.toast(error.message||"Review could not be updated.","error");}
 });
 $("manualReviewForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const submit=event.submitter||$("manualReviewForm").querySelector('button[type="submit"]');
  submit.disabled=true;$("manualReviewError").textContent="";
  try{
   const id=$("manualReviewId").value,productId=$("manualReviewProduct").value;
   if(!productById.has(productId))throw new Error("Choose a valid product.");
   const status=$("manualReviewStatus").value;
   const payload={
    product_id:productId,
    reviewer_name:$("manualReviewName").value.trim(),
    rating:Number($("manualReviewRating").value),
    review_text:$("manualReviewText").value.trim(),
    status,
    published_at:status==="published"?new Date().toISOString():null,
    updated_at:new Date().toISOString()
   };
   let savedId=id,source="admin";
   if(id){
    const existing=reviews.find(review=>review.id===id);source=existing?.source||"customer";
    const {error}=await H.client.from("product_reviews").update(payload).eq("id",id);if(error)throw error;
   }else{
    const insert={...payload,source:"admin",verified_purchase:false};
    const {data,error}=await H.client.from("product_reviews").insert(insert).select("id").single();if(error)throw error;savedId=data.id;
   }
   await H.audit(id?"product_review_edited":"product_review_admin_added","product_review",savedId,id?"Product review edited by admin":"Admin-added product review created",{product_id:productId,status,source,verified_purchase:false});
   $("manualReviewDialog").close();
   H.toast(id?"Review updated.":"Admin-added review saved. It is not marked as a verified purchase.");
   await refresh();
  }catch(error){$("manualReviewError").textContent=error.message||"Review could not be saved.";}
  finally{submit.disabled=false;}
 });
 await refresh();
 const refreshButton=document.querySelector("[data-refresh-page]");
 refreshButton?.addEventListener("click",()=>refresh().catch(error=>H.toast(error.message||"Refresh failed.","error")));
}
window.HFReviewsInit=init;
})();
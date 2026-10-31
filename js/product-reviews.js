(() => {
"use strict";
const API="https://qfwvrcfkrsydycbfjsxf.supabase.co";
const KEY="sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const path=location.pathname||"";
let slug=/\/products\/[^/]+\.html$/i.test(path)?path.split("/").pop().replace(/\.html$/i,""):(new URLSearchParams(location.search).get("slug")||"");
if(!slug)return;
const $=selector=>document.querySelector(selector);
const stars=rating=>{const count=Math.max(0,Math.min(5,Number(rating)||0));return "★".repeat(count)+"☆".repeat(5-count);};
const style=document.createElement("style");
style.textContent=".hf-public-reviews{max-width:1120px;margin:28px auto 36px;padding:24px;background:#fffdf8;border:1px solid #e5ded2;border-radius:18px;color:#2b2a3d}.hf-public-reviews h2{margin:0;font-size:24px}.hf-review-summary{display:flex;align-items:center;gap:10px;margin:8px 0 20px;color:#786f67}.hf-review-stars{color:#c58a3b;letter-spacing:2px}.hf-review-list{display:grid;gap:10px}.hf-review-item{padding:14px;border:1px solid #eee7dc;border-radius:12px;background:#fbf9f4}.hf-review-item-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.hf-review-item p{margin:8px 0 0;white-space:pre-line}.hf-review-verified{font-size:10px;font-weight:800;color:#2d7654;background:#eaf4ed;padding:3px 8px;border-radius:99px}.hf-review-admin{font-size:10px;font-weight:800;color:#8b5c36;background:#f7eadf;padding:3px 8px;border-radius:99px}.hf-review-form{margin-top:24px;padding-top:20px;border-top:1px solid #e8e1d6;display:grid;gap:10px}.hf-review-form label{display:grid;gap:5px;font-size:12px;font-weight:750}.hf-review-form input,.hf-review-form select,.hf-review-form textarea{width:100%;padding:11px;border:1px solid #ded7cc;border-radius:10px;background:#fff;color:#2b2a3d;font:inherit}.hf-review-form button{justify-self:start;padding:11px 17px;border:0;border-radius:10px;background:#c97b3d;color:#fff;font-weight:800;cursor:pointer}.hf-review-message{font-size:12px;color:#6b6a79}.hf-review-message.error{color:#a33e32}@media(max-width:600px){.hf-public-reviews{margin:18px 12px;padding:17px}.hf-public-reviews h2{font-size:21px}}";
document.head.appendChild(style);
async function getJson(url){
 const response=await fetch(url,{headers:{apikey:KEY,Authorization:"Bearer "+KEY,Accept:"application/json"},cache:"no-store"});
 if(!response.ok)throw new Error("Review data unavailable ("+response.status+").");
 return response.json();
}
async function postReview(url,payload){
 const response=await fetch(url,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(payload)});
 if(!response.ok){
  let message="Review could not be submitted.";
  try{const data=await response.json();message=data.message||data.details||message;}catch(_){}
  throw new Error(message);
 }
}
async function init(){
 const productParams=new URLSearchParams({select:"id,name,slug,sku",slug:"eq."+slug,is_active:"eq.true",limit:"1"});
 const products=await getJson(API+"/rest/v1/products?"+productParams.toString());
 const product=products[0];if(!product)return;
 const related=$("#related-section");
 const detail=$("#product-detail")||$(".product-detail");
 if(!related&&!detail)return;
 const section=document.createElement("section");section.className="hf-public-reviews";
 section.innerHTML='<div><p style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#a96d36;margin:0 0 6px">CUSTOMER FEEDBACK</p><h2>Product Reviews</h2><div class="hf-review-summary" id="hfReviewSummary">Loading published reviews…</div><div class="hf-review-list" id="hfReviewList"></div></div><form class="hf-review-form" id="hfReviewForm"><strong>Share your experience</strong><label>Your display name<input id="hfReviewName" maxlength="80" minlength="2" required placeholder="Your name"></label><label>Rating<select id="hfReviewRating" required><option value="5">★★★★★ · Excellent</option><option value="4">★★★★☆ · Good</option><option value="3">★★★☆☆ · Average</option><option value="2">★★☆☆☆ · Poor</option><option value="1">★☆☆☆☆ · Very poor</option></select></label><label>Your review<textarea id="hfReviewText" rows="4" minlength="10" maxlength="1200" required placeholder="Tell other customers about this product…"></textarea></label><p class="hf-review-message" id="hfReviewMessage">Your review will be checked before it appears publicly.</p><button type="submit">Submit review for approval</button></form>';
 if(related)related.insertAdjacentElement("beforebegin",section);else detail.insertAdjacentElement("afterend",section);
 const list=$("#hfReviewList"),summary=$("#hfReviewSummary"),form=$("#hfReviewForm"),message=$("#hfReviewMessage");
 async function refreshReviews(){
  const params=new URLSearchParams({select:"reviewer_name,rating,review_text,source,verified_purchase,created_at",product_id:"eq."+product.id,status:"eq.published",order:"created_at.desc",limit:"30"});
  const rows=await getJson(API+"/rest/v1/product_reviews?"+params.toString());
  const average=rows.length?rows.reduce((sum,row)=>sum+Number(row.rating||0),0)/rows.length:0;
  summary.innerHTML='<strong style="font-size:20px;color:#9c632f">'+(rows.length?average.toFixed(1):"—")+'</strong><span class="hf-review-stars">'+stars(Math.round(average))+'</span><span>'+rows.length+' published review(s)</span>';
  list.innerHTML=rows.length?rows.map(row=>{
   const source=row.source==="admin"?'<span class="hf-review-admin">Halal Food note</span>':"";
   const verified=row.verified_purchase?'<span class="hf-review-verified">Verified purchase</span>':"";
   return '<article class="hf-review-item"><div class="hf-review-item-head"><strong>'+esc(row.reviewer_name)+'</strong><span><span class="hf-review-stars">'+stars(row.rating)+'</span> '+source+' '+verified+'</span></div><small style="color:#858293">'+new Date(row.created_at).toLocaleDateString("en-BD",{year:"numeric",month:"short",day:"numeric"})+'</small><p>'+esc(row.review_text)+'</p></article>';
  }).join(""):'<p class="hf-review-message">No published reviews yet. Be the first to share an experience.</p>';
 }
 try{await refreshReviews();}catch(_){summary.textContent="Reviews are temporarily unavailable.";}
 form.addEventListener("submit",async event=>{
  event.preventDefault();const button=form.querySelector("button");button.disabled=true;message.className="hf-review-message";message.textContent="Submitting for moderation…";
  try{
   await postReview(API+"/rest/v1/product_reviews",{
    product_id:product.id,
    reviewer_name:$("#hfReviewName").value.trim(),
    rating:Number($("#hfReviewRating").value),
    review_text:$("#hfReviewText").value.trim(),
    source:"customer",status:"pending",verified_purchase:false
   });
   form.reset();message.textContent="Thank you. Your review was received and will appear after moderation.";
  }catch(error){message.className="hf-review-message error";message.textContent=error.message||"Review submission failed.";}
  finally{button.disabled=false;}
 });
}
function mountWhenReady(){
 let attempts=0;
 const tryMount=()=>{
  attempts++;
  if($("#product-detail")||$(".product-detail")||$("#related-section")){init().catch(()=>{});return;}
  if(attempts<30)setTimeout(tryMount,200);
 };
 tryMount();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountWhenReady,{once:true});else mountWhenReady();
})();
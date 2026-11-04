(() => {
"use strict";
const API="https://qfwvrcfkrsydycbfjsxf.supabase.co";
const KEY="sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const SITE="https://faysaltalukder.github.io/halalfood/";
const root=document.getElementById("productLookup");
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const money=value=>"৳ "+Number(value||0).toLocaleString("en-BD",{maximumFractionDigits:2});
async function loadProduct(){
 const sku=(new URLSearchParams(location.search).get("sku")||"").trim().toUpperCase();
 if(!/^HF-[0-9]{6,}$/.test(sku)){
  root.innerHTML='<div class="lookup-message"><strong>Invalid product code</strong><p>Scan the QR label again or contact Halal Food.</p></div>';return;
 }
 const params=new URLSearchParams({
  select:"id,name,slug,sku,category,price,display_price,unit_type,image_url,short_description,full_description,is_active,stock_quantity,cms_created",
  sku:"eq."+sku,is_active:"eq.true",limit:"1"
 });
 const response=await fetch(API+"/rest/v1/products?"+params.toString(),{
  headers:{apikey:KEY,Authorization:"Bearer "+KEY,Accept:"application/json"},cache:"no-store"
 });
 if(!response.ok)throw new Error("Could not load catalogue information ("+response.status+").");
 const rows=await response.json(),product=rows[0];
 if(!product){
  root.innerHTML='<div class="lookup-message"><strong>Product not available</strong><p>This code is not linked to a currently published product. Please contact Halal Food.</p></div>';return;
 }
 const stockKnown=product.stock_quantity!==null&&product.stock_quantity!==undefined&&product.stock_quantity!=="";
 const outOfStock=stockKnown&&Number(product.stock_quantity)<=0;
 const availability=outOfStock?"Currently out of stock":stockKnown?"Available":"Contact us for availability";
 const price=product.display_price||money(product.price)+" / "+(product.unit_type||"unit");
 const image=product.image_url
  ?'<img class="product-image" src="'+esc(product.image_url)+'" alt="'+esc(product.name)+'">'
  :'<div class="product-image" aria-label="No product image"></div>';
 const productPage=product.cms_created
  ?SITE+"cms-product.html?slug="+encodeURIComponent(product.slug)
  :SITE+"products/"+encodeURIComponent(product.slug)+".html";
 const whatsapp="https://wa.me/8801842031164?text="+encodeURIComponent("আমি "+product.name+" সম্পর্কে জানতে চাই (Product Code: "+product.sku+")");
 root.innerHTML='<div class="product-grid"><div>'+image+'</div><div><p class="eyebrow">CURRENT CATALOGUE INFORMATION</p><h1 class="product-title">'+esc(product.name)+'</h1><span class="sku">PRODUCT CODE · '+esc(product.sku)+'</span><div class="price">'+esc(price)+'</div><span class="availability '+(outOfStock?"out":"")+'">'+esc(availability)+'</span><div class="meta"><div><small>CATEGORY</small><strong>'+esc(product.category||"—")+'</strong></div><div><small>SELLING UNIT</small><strong>'+esc(product.unit_type||"—")+'</strong></div></div><p class="description">'+esc(product.short_description||product.full_description||"Product information is maintained by Halal Food.")+'</p><div class="lookup-actions"><a href="'+esc(productPage)+'">View product</a><a class="secondary" href="'+esc(whatsapp)+'" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a></div></div></div>';
 document.title=product.name+" · Halal Food";
}
loadProduct().catch(error=>{
 root.innerHTML='<div class="lookup-message"><strong>Product information unavailable</strong><p>'+esc(error.message||"Please try again.")+'</p></div>';
});
})();
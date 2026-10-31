(() => {
"use strict";
const $=id=>document.getElementById(id);
const SITE="https://faysaltalukder.github.io/halalfood/";
let H=null,products=[],selected=null,scanner=null,initialized=false;
const skuOf=product=>String(product?.sku||"").trim();
const escape=value=>H.esc(String(value??""));
const publicUrl=product=>SITE+"product-lookup.html?sku="+encodeURIComponent(skuOf(product));
function moneyFor(product){return product?.display_price||H.money(product?.price??0);}
function stockState(product){
 const raw=product?.stock_quantity;
 if(raw===null||raw===undefined||raw==="")return "Not tracked";
 const qty=Number(raw),threshold=5;
 if(!Number.isFinite(qty))return "Not tracked";
 if(qty<=0)return "Out of stock";
 return qty<=threshold?"Low stock":"In stock";
}
function setLoadStatus(message,isError=false,showRetry=false){
 const box=$("barcodeLoadStatus");
 if(!box)return;
 box.innerHTML="<strong>"+escape(message)+"</strong>"+(showRetry?'<button class="hf-button hf-button-secondary" id="barcodeLoadRetry" type="button">আবার চেষ্টা করুন</button>':"");
 box.dataset.state=isError?"error":"ready";
}
function makeQrData(value,size=150){
 if(!window.QRCode)throw new Error("QR library did not load. Refresh the page and try again.");
 const host=document.createElement("div");
 new window.QRCode(host,{text:value,width:size,height:size,colorDark:"#2B2A3D",colorLight:"#FFFFFF",correctLevel:window.QRCode.CorrectLevel.M});
 const canvas=host.querySelector("canvas");
 if(canvas)return canvas.toDataURL("image/png");
 const image=host.querySelector("img");
 if(image?.src)return image.src;
 throw new Error("QR code could not be rendered.");
}
function makeBarcodeSvg(value,height=38){
 if(!window.JsBarcode)throw new Error("Barcode library did not load. Refresh the page and try again.");
 const node=document.createElementNS("http://www.w3.org/2000/svg","svg");
 window.JsBarcode(node,value,{format:"CODE128",width:1.65,height,displayValue:false,margin:0,background:"#FFFFFF",lineColor:"#282738"});
 return node.outerHTML;
}
function filteredProducts(){
 const q=String($("barcodeProductSearch")?.value||"").toLowerCase().trim();
 if(!q)return products;
 return products.filter(p=>[p.name,p.sku,p.category,p.slug].map(value=>String(value||"")).join(" ").toLowerCase().includes(q));
}
function renderProductOptions(){
 const select=$("barcodeProductSelect");
 const current=selected?.id||select.value||"";
 const rows=filteredProducts();
 if(current&&!rows.some(p=>p.id===current))selected=null;
 select.innerHTML='<option value="">'+(rows.length?"একটি পণ্য নির্বাচন করুন":"কোনো পণ্য মেলেনি")+"</option>"+rows.map(p=>'<option value="'+escape(p.id)+'">'+escape(p.name)+" · "+escape(skuOf(p)||"SKU নেই")+(p.is_active?"":" · Hidden")+"</option>").join("");
 if(selected&&rows.some(p=>p.id===selected.id))select.value=selected.id;
 else select.value="";
 const count=products.length.toLocaleString("en-BD");
 setLoadStatus(products.length?count+"টি পণ্য প্রস্তুত"+(rows.length!==products.length?" · "+rows.length+"টি মিলেছে":""):"কোনো পণ্য পাওয়া যায়নি");
 renderPreview();
}
function renderPreview(){
 const box=$("barcodeLabelPreview"),button=$("barcodePrintLabels"),p=selected;
 if(!p){
  box.innerHTML='<div class="pt-empty"><span>▤</span><strong>এখনো কোনো পণ্য নির্বাচন করা হয়নি</strong><p>উপরের তালিকা থেকে একটি পণ্য বেছে নিন।</p></div>';
  button.disabled=true;return;
 }
 if(!skuOf(p)){
  box.innerHTML='<div class="pt-empty"><strong>এই পণ্যের SKU নেই</strong><p>All Products-এ পণ্যটি যাচাই করুন।</p></div>';
  button.disabled=true;return;
 }
 try{
  const qr=makeQrData(publicUrl(p),150),barcode=makeBarcodeSvg(skuOf(p),40);
  box.innerHTML='<div class="pt-preview-label"><strong>'+escape(p.name)+'</strong><small>'+escape(skuOf(p))+'</small><div class="pt-preview-barcode">'+barcode+'</div><div class="pt-preview-qr"><img src="'+qr+'" alt="Customer product QR code"></div><span class="pt-label-live-price">'+escape(moneyFor(p))+'</span></div>';
  button.disabled=false;
 }catch(error){
  box.innerHTML='<div class="pt-empty"><strong>প্রিভিউ তৈরি করা যায়নি</strong><p>'+escape(error.message)+'</p></div>';
  button.disabled=true;
 }
}
function selectProduct(id){
 selected=products.find(p=>String(p.id)===String(id))||null;
 $("barcodeProductSelect").value=selected?.id||"";
 renderPreview();
}
function findCodeValue(raw){
 const value=String(raw||"").trim();
 if(!value)return "";
 try{const url=new URL(value);return (url.searchParams.get("sku")||value).trim().toUpperCase();}catch(_){}
 return value.toUpperCase();
}
function renderScanResult(raw){
 const value=findCodeValue(raw);
 if(!value)return;
 const product=products.find(p=>skuOf(p).toUpperCase()===value);
 const box=$("barcodeScanResult");
 if(!product){
  box.innerHTML='<div class="pt-empty"><span>⚠</span><strong>পণ্য পাওয়া যায়নি</strong><p>'+escape(value)+' SKU-র সঙ্গে মেলেনি। এই স্ক্যানারটি Halal Food-এর নিজস্ব SKU পড়ে।</p></div>';
  return;
 }
 const weight=product.shipping_weight_kg!=null?Number(product.shipping_weight_kg).toFixed(3)+" kg":"Not set";
 box.innerHTML='<div class="pt-scan-product">'+(product.image_url?'<img src="'+escape(product.image_url)+'" alt="">':'<div></div>')+'<div><h3>'+escape(product.name)+'</h3><div class="price">'+escape(moneyFor(product))+' / '+escape(product.unit_type||"unit")+'</div><div class="pt-scan-meta"><span>SKU '+escape(product.sku)+'</span><span>'+escape(product.category||"—")+'</span><span>'+escape(stockState(product))+'</span><span>'+(product.is_active?"Published":"Hidden")+'</span></div></div></div><div class="pt-scan-meta"><span>Shipping weight: '+escape(weight)+'</span></div><p class="hf-data-note">'+escape(product.short_description||"No short description saved.")+'</p><div class="hf-table-actions"><a class="hf-button hf-button-secondary hf-button-small" href="./products.html">পণ্য পরিচালনা</a><a class="hf-button hf-button-secondary hf-button-small" href="'+escape(publicUrl(product))+'" target="_blank" rel="noopener">ক্রেতার পেজ দেখুন</a></div>';
}
function printLabels(){
 if(!selected)return;
 if(!skuOf(selected)){H.toast("এই পণ্যের স্থায়ী SKU নেই।","error");return;}
 const copies=Math.max(1,Math.min(250,Number.parseInt($("barcodeLabelCopies").value||"1",10)||1));
 const dimensions=($("barcodeLabelSize").value||"50x30").split("x").map(Number);
 const win=window.open("","_blank");
 if(!win){H.toast("লেবেল প্রিন্ট করতে browser pop-ups অনুমতি দিন।","error");return;}
 try{
  const barcode=makeBarcodeSvg(skuOf(selected),42),qr=makeQrData(publicUrl(selected),160);
  const labels=Array.from({length:copies},()=>'<article class="label"><div class="name">'+escape(selected.name)+'</div><div class="sku">'+escape(skuOf(selected))+'</div><div class="price">'+escape(moneyFor(selected))+'</div><div class="bars">'+barcode+'</div><img class="qr" src="'+qr+'" alt="Customer product link"></article>').join("");
  const width=dimensions[0],height=dimensions[1],qrWidth=height<=25?13:height<=30?16:21;
  const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Halal Food Product Labels</title><style>*{box-sizing:border-box}body{margin:0;padding:5mm;font:9px Arial,sans-serif;color:#252434}.labels{display:flex;flex-wrap:wrap;gap:2mm}.label{width:'+width+'mm;height:'+height+'mm;border:.2mm solid #ddd;border-radius:1mm;padding:1.5mm;display:grid;grid-template-columns:1fr '+qrWidth+'mm;grid-template-rows:auto auto auto 1fr;gap:.35mm;break-inside:avoid;overflow:hidden}.name{font-weight:800;font-size:8px;line-height:1.15;overflow:hidden}.sku{font-size:6.5px;color:#444}.price{font-size:7.5px;font-weight:800}.bars{grid-column:1;align-self:end;min-width:0}.bars svg{width:100%;height:8mm}.qr{grid-column:2;grid-row:1/5;width:100%;height:auto;align-self:center}.label:nth-child(1){break-before:auto}@page{margin:4mm}@media print{body{padding:0}.labels{gap:1.5mm}}</style></head><body><div class="labels">'+labels+'</div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));<\\/script></body></html>';
  win.document.open();win.document.write(doc);win.document.close();win.opener=null;
 }catch(error){win.close();H.toast(error.message||"বারকোড লেবেল তৈরি করা যায়নি।","error");}
}
async function startCamera(){
 if(!window.Html5Qrcode){H.toast("Camera scanner library পাওয়া যায়নি। USB scanner ব্যবহার করুন।","error");return;}
 try{
  $("barcodeCamera").hidden=false;
  scanner=new window.Html5Qrcode("barcodeCamera",{verbose:false});
  const formatApi=window.Html5QrcodeSupportedFormats;
  const supported=formatApi?[formatApi.CODE_128,formatApi.EAN_13,formatApi.QR_CODE].filter(value=>value!==undefined):undefined;
  await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:150},formatsToSupport:supported},decoded=>{
   $("barcodeScanInput").value=decoded;renderScanResult(decoded);
  },()=>{});
  $("barcodeCameraStart").disabled=true;$("barcodeCameraStop").disabled=false;
 }catch(error){
  $("barcodeCamera").hidden=true;scanner=null;
  H.toast(error.message||"ক্যামেরা চালু করা যায়নি। Browser camera permission পরীক্ষা করুন।","error");
 }
}
async function stopCamera(){
 if(!scanner){$("barcodeCameraStart").disabled=false;$("barcodeCameraStop").disabled=true;return;}
 try{await scanner.stop();await scanner.clear();}catch(_){}
 scanner=null;$("barcodeCamera").hidden=true;$("barcodeCameraStart").disabled=false;$("barcodeCameraStop").disabled=true;
}
async function loadProducts(){
 setLoadStatus("পণ্যের তালিকা লোড হচ্ছে…");
 $("barcodeProductSelect").disabled=true;
 $("barcodePrintLabels").disabled=true;
 $("barcodeScanSubmit").disabled=true;
 $("barcodeCameraStart").disabled=true;
 try{
  const {data,error}=await H.client.from("products")
   .select("id,name,slug,sku,category,price,display_price,unit_type,image_url,stock_quantity,is_active,short_description,shipping_weight_kg")
   .order("name",{ascending:true}).limit(1000);
  if(error)throw error;
  products=Array.isArray(data)?data:[];
  selected=null;
  $("barcodeProductSelect").disabled=false;
  $("barcodeScanSubmit").disabled=false;
  $("barcodeCameraStart").disabled=false;
  if(!products.length){
   $("barcodeProductSelect").innerHTML='<option value="">কোনো পণ্য পাওয়া যায়নি</option>';
   $("barcodeScanResult").innerHTML='<div class="pt-empty"><strong>পণ্যের তালিকা খালি</strong><p>All Products-এ অন্তত একটি পণ্য যোগ করুন।</p></div>';
   setLoadStatus("কোনো পণ্য পাওয়া যায়নি",true,true);
   $("barcodeLoadRetry").addEventListener("click",loadProducts);
   renderPreview();return;
  }
  renderProductOptions();
  $("barcodeScanResult").innerHTML='<div class="pt-empty"><span>▥</span><strong>স্ক্যান করার জন্য প্রস্তুত</strong><p>বারকোড স্ক্যান করলে পণ্যের তথ্য এখানে দেখাবে।</p></div>';
 }catch(error){
  products=[];selected=null;
  $("barcodeProductSelect").innerHTML='<option value="">পণ্য লোড হয়নি</option>';
  $("barcodeProductSelect").disabled=true;
  renderPreview();
  setLoadStatus("পণ্য লোড করা যায়নি: "+(error?.message||"Connection error"),true,true);
  $("barcodeLoadRetry")?.addEventListener("click",loadProducts);
 }
}
async function init(){
 H=window.HFAdmin||await window.HFAdminReady;
 if(!H){setLoadStatus("নিরাপদ অ্যাডমিন সেশন পাওয়া যায়নি। আবার সাইন ইন করুন।",true);throw new Error("Admin session is not ready.");}
 if(initialized)return;
 initialized=true;
 $("barcodeProductSearch").addEventListener("input",renderProductOptions);
 $("barcodeProductSelect").addEventListener("change",()=>selectProduct($("barcodeProductSelect").value));
 $("barcodePrintLabels").addEventListener("click",printLabels);
 $("barcodeScanSubmit").addEventListener("click",()=>renderScanResult($("barcodeScanInput").value));
 $("barcodeScanInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();renderScanResult(event.currentTarget.value);}});
 $("barcodeCameraStart").addEventListener("click",startCamera);
 $("barcodeCameraStop").addEventListener("click",stopCamera);
 $("barcodeLoadStatus").addEventListener("click",event=>{if(event.target.closest("#barcodeLoadRetry"))loadProducts();});
 document.querySelector("[data-refresh-page]")?.addEventListener("click",loadProducts);
 await loadProducts();
}
window.HFBarcodeInit=init;
})();
(() => {
"use strict";
const H=window.HFAdmin;
if(!H)return;
const $=id=>document.getElementById(id);
const esc=H.esc,money=H.money;
const SITE="https://faysaltalukder.github.io/halalfood/";
let products=[],selected=null,scanner=null;
const skuOf=product=>String(product?.sku||"");
const publicUrl=product=>SITE+"product-lookup.html?sku="+encodeURIComponent(skuOf(product));
function stockState(product){
 const raw=product.stock_quantity;
 if(raw===null||raw===undefined||raw==="")return "Not tracked";
 const qty=Number(raw),threshold=Number(product.low_stock_threshold??5);
 if(!Number.isFinite(qty))return "Not tracked";
 if(qty<=0)return "Out of stock";
 return qty<=threshold?"Low stock":"In stock";
}
function makeQrData(value,size=120){
 if(!window.QRCode)throw new Error("QR generator did not load.");
 const host=document.createElement("div");
 new QRCode(host,{text:value,width:size,height:size,colorDark:"#2B2A3D",colorLight:"#FFFFFF",correctLevel:QRCode.CorrectLevel.M});
 const canvas=host.querySelector("canvas");
 if(canvas)return canvas.toDataURL("image/png");
 const image=host.querySelector("img");
 if(image?.src)return image.src;
 throw new Error("QR code could not be rendered.");
}
function makeBarcodeSvg(value,height=34){
 if(!window.JsBarcode)throw new Error("Barcode generator did not load.");
 const node=document.createElementNS("http://www.w3.org/2000/svg","svg");
 window.JsBarcode(node,value,{format:"CODE128",width:1.65,height,displayValue:false,margin:0,background:"#FFFFFF",lineColor:"#282738"});
 return node.outerHTML;
}
function filteredProducts(){
 const q=String($("barcodeProductSearch")?.value||"").toLowerCase().trim();
 return products.filter(p=>!q||[p.name,p.sku,p.category,p.slug].join(" ").toLowerCase().includes(q));
}
function renderDirectory(){
 const rows=filteredProducts();
 $("barcodeProductCount").textContent=products.length.toLocaleString("en-BD")+" products";
 $("barcodeProductTable").innerHTML=rows.length?rows.map(p=>'<tr><td><div class="hf-product-cell">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="" loading="lazy">':'<span class="hf-thumb-empty">◇</span>')+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||"—")+'</small></span></div></td><td><strong>'+esc(skuOf(p)||"SKU pending")+'</strong><small>Code 128</small></td><td><strong>'+esc(p.display_price||money(p.price))+'</strong><small>'+esc(p.unit_type||"unit")+'</small></td><td>'+esc(stockState(p))+'</td><td><button class="hf-button hf-button-secondary hf-button-small" type="button" data-barcode-select="'+esc(p.id)+'">Select &amp; preview</button></td></tr>').join(""):'<tr><td colspan="5">'+H.makeEmpty("No matching products","Try another product name or SKU.")+'</td></tr>';
}
function renderPreview(){
 const p=selected,box=$("barcodeLabelPreview"),button=$("barcodePrintLabels");
 if(!p){box.innerHTML='<div class="pt-empty"><span>▤</span><strong>Select a product</strong><p>Preview will show its 1D barcode and customer QR.</p></div>';button.disabled=true;return;}
 try{
  const qr=makeQrData(publicUrl(p),128),barcode=makeBarcodeSvg(skuOf(p),36);
  box.innerHTML='<div class="pt-preview-label"><strong>'+esc(p.name)+'</strong><small>'+esc(skuOf(p))+'</small><div class="pt-preview-barcode">'+barcode+'</div><div class="pt-preview-qr"><img src="'+qr+'" alt="Customer product QR code"></div><span class="pt-label-live-price">'+esc(p.display_price||money(p.price))+'</span></div>';
  button.disabled=false;
 }catch(error){box.innerHTML='<div class="pt-empty"><strong>Preview unavailable</strong><p>'+esc(error.message)+'</p></div>';button.disabled=true;}
}
function selectProduct(id){
 selected=products.find(p=>p.id===id)||null;
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
  box.innerHTML='<div class="pt-empty"><span>⚠</span><strong>Product not found</strong><p>No active or hidden product matches '+esc(value)+'. Check the code or search the SKU directory.</p></div>';
  return;
 }
 const weight=product.shipping_weight_kg!=null?Number(product.shipping_weight_kg).toFixed(3)+" kg":"Not set";
 box.innerHTML='<div class="pt-scan-product">'+(product.image_url?'<img src="'+esc(product.image_url)+'" alt="">':'<div></div>')+'<div><h3>'+esc(product.name)+'</h3><div class="price">'+esc(product.display_price||money(product.price))+' / '+esc(product.unit_type||"unit")+'</div><div class="pt-scan-meta"><span>SKU '+esc(product.sku)+'</span><span>'+esc(product.category||"—")+'</span><span>'+esc(stockState(product))+'</span><span>'+(product.is_active?"Published":"Hidden")+'</span></div></div></div><div class="pt-scan-meta"><span>Shipping weight: '+esc(weight)+'</span><span>Product URL: /'+esc(product.slug)+'</span></div><p class="hf-data-note">'+esc(product.short_description||"No short description saved.")+'</p><div class="hf-table-actions"><a class="hf-button hf-button-secondary hf-button-small" href="./products.html">Manage products</a><a class="hf-button hf-button-secondary hf-button-small" href="'+esc(publicUrl(product))+'" target="_blank" rel="noopener">Open customer view</a></div>';
}
function printLabels(){
 if(!selected)return;
 const copies=Math.max(1,Math.min(250,Number.parseInt($("barcodeLabelCopies").value||"1",10)||1));
 const dimensions=($("barcodeLabelSize").value||"40x25").split("x").map(Number);
 const win=window.open("","_blank");
 if(!win){H.toast("Allow pop-ups to print barcode labels.","error");return;}
 try{
  const barcode=makeBarcodeSvg(skuOf(selected),38),qr=makeQrData(publicUrl(selected),140);
  const labels=Array.from({length:copies},()=>'<article class="label"><div class="name">'+esc(selected.name)+'</div><div class="sku">'+esc(skuOf(selected))+'</div><div class="price">'+esc(selected.display_price||money(selected.price))+'</div><div class="bars">'+barcode+'</div><img class="qr" src="'+qr+'" alt="Customer product link"></article>').join("");
  const width=dimensions[0],height=dimensions[1],qrWidth=height<=25?13:height<=30?16:21;
  const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Halal Food Product Labels</title><style>*{box-sizing:border-box}body{margin:0;padding:5mm;font:9px Arial,sans-serif;color:#252434}.labels{display:flex;flex-wrap:wrap;gap:2mm}.label{width:'+width+'mm;height:'+height+'mm;border:.2mm solid #ddd;border-radius:1mm;padding:1.5mm;display:grid;grid-template-columns:1fr '+qrWidth+'mm;grid-template-rows:auto auto auto 1fr;gap:.35mm;break-inside:avoid;overflow:hidden}.name{font-weight:800;font-size:8px;line-height:1.15;overflow:hidden}.sku{font-size:6.5px;color:#444}.price{font-size:7.5px;font-weight:800}.bars{grid-column:1;align-self:end;min-width:0}.bars svg{width:100%;height:8mm}.qr{grid-column:2;grid-row:1/5;width:100%;height:auto;align-self:center}.label:nth-child(1){break-before:auto}@page{margin:4mm}@media print{body{padding:0}.labels{gap:1.5mm}}</style></head><body><div class="labels">'+labels+'</div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));<\/script></body></html>';
  win.document.open();win.document.write(doc);win.document.close();win.opener=null;
 }catch(error){win.close();H.toast(error.message||"Barcode labels could not be generated.","error");}
}
async function startCamera(){
 if(!window.Html5Qrcode){H.toast("Camera scanner is unavailable. Use the USB scanner field instead.","error");return;}
 try{
  $("barcodeCamera").hidden=false;
  scanner=new Html5Qrcode("barcodeCamera",{verbose:false});
  const formatApi=window.Html5QrcodeSupportedFormats;
  const supported=formatApi?[formatApi.CODE_128,formatApi.EAN_13,formatApi.QR_CODE].filter(value=>value!==undefined):undefined;
  await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:150},formatsToSupport:supported},decoded=>{
   $("barcodeScanInput").value=decoded;renderScanResult(decoded);
  },()=>{});
  $("barcodeCameraStart").disabled=true;$("barcodeCameraStop").disabled=false;
 }catch(error){
  $("barcodeCamera").hidden=true;scanner=null;
  H.toast(error.message||"Camera could not start. Check the browser camera permission.","error");
 }
}
async function stopCamera(){
 if(!scanner)return;
 try{await scanner.stop();scanner.clear();}catch(_){}
 scanner=null;$("barcodeCamera").hidden=true;$("barcodeCameraStart").disabled=false;$("barcodeCameraStop").disabled=true;
}
async function init(){
 products=await H.fetchProducts();
 $("barcodeProductSelect").innerHTML='<option value="">Choose a product</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.sku||"SKU pending")+'</option>').join("");
 renderDirectory();
 $("barcodeProductSearch").addEventListener("input",renderDirectory);
 $("barcodeProductTable").addEventListener("click",event=>{const button=event.target.closest("[data-barcode-select]");if(button)selectProduct(button.dataset.barcodeSelect);});
 $("barcodeProductSelect").addEventListener("change",()=>selectProduct($("barcodeProductSelect").value));
 $("barcodeScanSubmit").addEventListener("click",()=>renderScanResult($("barcodeScanInput").value));
 $("barcodeScanInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();renderScanResult(event.currentTarget.value);}});
 $("barcodePrintLabels").addEventListener("click",printLabels);
 $("barcodeCameraStart").addEventListener("click",startCamera);
 $("barcodeCameraStop").addEventListener("click",stopCamera);
 const initialSku=new URLSearchParams(location.search).get("sku");
 if(initialSku){$("barcodeScanInput").value=initialSku;renderScanResult(initialSku);const product=products.find(p=>skuOf(p)===initialSku);if(product)selectProduct(product.id);}
 attachRefresh(async()=>{products=await H.fetchProducts();renderDirectory();if(selected)selectProduct(selected.id);});
}
window.HFBarcodeInit=init;
})();
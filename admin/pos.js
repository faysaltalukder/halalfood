(() => {
"use strict";
window.HFPosInit = async function () {
 const H=window.HFAdmin;if(!H)return;
 const {client,esc,money,dateTime,toast,audit,signedQuery,fetchProducts,fetchFinance}=H;
 const $=id=>document.getElementById(id);
 let products=[],orders=[],financeEntries=[],selectedProductId=null,pendingReference=null,formDirty=false;
 const methods=new Set(["cash","mobile_banking","bank_transfer","other"]);
 function dhakaNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};
 }
 function validPhone(value){
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.startsWith("00880"))digits="0"+digits.slice(5);
  else if(digits.startsWith("880"))digits="0"+digits.slice(3);
  if(!digits)return "";
  return /^01[0-9]{9}$/.test(digits)?digits:null;
 }
 function referenceFor(date){
  const bytes=crypto.getRandomValues(new Uint8Array(5));
  return date.replace(/-/g,"")+"-"+Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();
 }
 function productById(id){return products.find(p=>p.id===id)||null;}
 function stockValue(p){return p.stock_quantity===null||p.stock_quantity===undefined||p.stock_quantity===""?null:Number(p.stock_quantity);}
 function flexibleUnit(p){return ["kg","liter"].includes(String(p.unit_type||"").toLowerCase());}
 function quantityText(n){return Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:3});}
 function financeFor(orderId){return financeEntries.find(e=>e.related_order_id===orderId&&e.entry_type==="income");}
 function renderProducts(){
  const term=$("posProductSearch").value.trim().toLowerCase();
  const list=products.filter(p=>!term||[p.name,p.category,p.category_slug,p.slug].join(" ").toLowerCase().includes(term));
  $("posProductCount").textContent=list.length.toLocaleString("en-BD");
  $("posProductList").innerHTML=list.length?list.map(p=>{
   const stock=stockValue(p);
   const stockText=stock===null?"Not tracked":quantityText(stock)+" "+(p.unit_type||"unit");
   const image=p.image_url?'<img src="'+esc(p.image_url)+'" alt="" loading="lazy" onerror="this.remove()">':"";
   return '<button type="button" class="pos-product-item" data-pos-product="'+esc(p.id)+'" aria-pressed="'+String(p.id===selectedProductId)+'"><span class="pos-product-thumb">'+(image||esc(String(p.name||"P").slice(0,1)))+'</span><span class="pos-product-copy"><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||p.category_slug||"Uncategorised")+' · '+esc(p.unit_type||"unit")+'</small><em>'+money(p.price)+'</em></span><span class="pos-product-stock"><strong>'+esc(stockText)+'</strong></span></button>';
  }).join(""):'<div class="pos-list-empty">No matching products.</div>';
 }
 function salesFor(p){
  return orders.flatMap(o=>(o.order_items||[]).filter(i=>i.product_id===p.id).map(item=>({order:o,item,payment:financeFor(o.id)}))).sort((a,b)=>String(b.order.ordered_at||"").localeCompare(String(a.order.ordered_at||"")));
 }
 function renderHistory(p){
  const sales=salesFor(p).slice(0,10);
  $("posHistoryCount").textContent=salesFor(p).length.toLocaleString("en-BD")+" records";
  $("posHistoryBody").innerHTML=sales.length?sales.map(({order,item,payment})=>{
   const pay=payment?.status==="confirmed"?'<span class="pos-payment-badge pos-payment-paid">Paid</span>':'<span class="pos-payment-badge pos-payment-due">Unpaid</span>';
   return '<tr><td>'+esc(dateTime(order.ordered_at))+'</td><td>'+esc(order.customer_name||"Walk-in")+'</td><td>'+quantityText(item.quantity)+' '+esc(item.unit||p.unit_type||"")+'</td><td>'+money(item.unit_price)+'</td><td><strong>'+money(item.line_total)+'</strong></td><td>'+pay+'</td></tr>';
  }).join(""):'<tr><td colspan="6">No sales recorded for this product.</td></tr>';
 }
 function updateTotal(){
  const q=Number($("posSaleQuantity").value||0),price=Number($("posSaleUnitPrice").value||0);
  $("posSaleTotal").textContent=money(q>0&&price>0?q*price:0);
  $("posSaleCalculation").textContent=quantityText(q)+" × "+money(price);
 }
 function selectProduct(id){
  if(id===selectedProductId)return;
  if(formDirty&&!confirm("Discard the unsaved sale details and select another product?"))return;
  selectedProductId=id;pendingReference=null;formDirty=false;
  const p=productById(id);
  $("posSelectedEmpty").hidden=!!p;$("posSelectedContent").hidden=!p;
  if(!p){renderProducts();return;}
  $("posSelectedName").textContent=p.name;
  $("posSelectedMeta").textContent=(p.category||p.category_slug||"Uncategorised")+" · "+money(p.price)+" per "+(p.unit_type||"unit");
  const s=stockValue(p);
  $("posSelectedStock").textContent=s===null?"—":quantityText(s)+" "+(p.unit_type||"");
  $("posSelectedImage").innerHTML=p.image_url?'<img src="'+esc(p.image_url)+'" alt="" onerror="this.remove()">':esc(String(p.name||"P").slice(0,1));
  const now=dhakaNow();
  $("posSaleDate").value=now.date;$("posSaleTime").value=now.time;
  $("posCustomerName").value="";$("posCustomerPhone").value="";
  $("posSaleQuantity").value="1";$("posSaleQuantity").min=flexibleUnit(p)?"0.001":"1";$("posSaleQuantity").step=flexibleUnit(p)?"0.001":"1";
  $("posQuantityUnit").textContent="("+p.unit_type+")";
  $("posSaleUnitPrice").value=Number(p.price||0).toFixed(2);
  $("posPaymentMethod").value="cash";
  document.querySelector('input[name="payment_received"][value="true"]').checked=true;
  $("posFormMessage").textContent="";$("posFormMessage").classList.remove("is-success");
  updateTotal();renderHistory(p);renderProducts();
 }
 function message(text,success=false){
  $("posFormMessage").textContent=text||"";
  $("posFormMessage").classList.toggle("is-success",!!success&&!!text);
 }
 async function refresh(){
  const [p,o,f]=await Promise.all([
   fetchProducts(),
   signedQuery(client.from("orders").select("id,order_number,customer_name,customer_phone,total,status,source,notes,ordered_at,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total)").eq("source","offline_pos").order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(1000)),
   fetchFinance(null,3000)
  ]);
  products=p;orders=o;financeEntries=f;
  if(selectedProductId&&!productById(selectedProductId))selectedProductId=null;
  renderProducts();
  if(selectedProductId){const oldId=selectedProductId;selectedProductId=null;selectProduct(oldId);}
 }
 async function saveSale(event){
  event.preventDefault();
  const p=productById(selectedProductId),button=$("posSaveSaleBtn");
  if(!p){message("Select a product first.");return;}
  const date=$("posSaleDate").value,time=$("posSaleTime").value;
  const quantity=Number($("posSaleQuantity").value),price=Number($("posSaleUnitPrice").value);
  const phone=validPhone($("posCustomerPhone").value);
  const customer=$("posCustomerName").value.trim()||"Walk-in Customer";
  const paymentMethod=$("posPaymentMethod").value;
  const paid=document.querySelector('input[name="payment_received"]:checked')?.value==="true";
  const adjustStock=true;
  const current=dhakaNow();
  if(!date||!time){message("Enter the sale date and time.");return;}
  if(date>current.date||(date===current.date&&time>current.time)){message("Sale date/time cannot be in the future.");return;}
  if(!Number.isFinite(quantity)||quantity<=0||quantity>1000||Math.abs(quantity*1000-Math.round(quantity*1000))>1e-8){message("Enter a valid quantity (up to 3 decimal places).");return;}
  if(!flexibleUnit(p)&&!Number.isInteger(quantity)){message("For packaged items, quantity must be a whole number.");return;}
  if(!Number.isFinite(price)||price<=0||price>1000000){message("Enter a selling price greater than zero.");return;}
  if(phone===null){message("Enter a valid Bangladesh phone number or leave it blank.");return;}
  if(!methods.has(paymentMethod)){message("Choose a valid payment method.");return;}
  const stock=stockValue(p);
  if(stock!==null&&quantity>stock){message("Not enough stock. Available: "+quantityText(stock)+" "+p.unit_type+".");return;}
  if(quantity*price>1000000000){message("Sale total is too high.");return;}
  if(!pendingReference)pendingReference=referenceFor(date);
  const payload={
   sale_reference:pendingReference,sale_date:date,sale_time:time,
   customer_name:customer,customer_phone:phone||"",
   payment_method:paymentMethod,payment_received:paid,
   adjust_stock:adjustStock,notes:"",
   items:[{product_slug:p.slug,quantity,unit_price:Math.round(price*100)/100}]
  };
  button.disabled=true;button.textContent="Saving…";message("");
  try{
   const {data,error}=await client.rpc("create_offline_pos_sale",{p_sale:payload});
   if(error)throw new Error(error.message||"Sale could not be saved.");
   if(data?.success!==true)throw new Error(data?.error||"The server did not confirm the sale.");
   if(data.duplicate){pendingReference=null;formDirty=false;message("This sale was already saved. No duplicate was created.",true);await refresh();return;}
   try{await audit("offline_pos_sale_recorded","order",data.orderId,"Offline sale recorded",{order_number:data.orderNumber,product_id:p.id,quantity,unit_price:price,total:data.total,payment_received:paid});}catch(_auditError){}
   pendingReference=null;formDirty=false;
   await refresh();
   message("Saved. "+money(data.total)+" added to sales. "+(paid?"Finance income confirmed.":"Payment remains unpaid."),true);
   toast("Offline sale saved successfully.");
  }catch(err){message(err.message||"Sale could not be saved.");toast(err.message||"Sale could not be saved.","error");}
  finally{button.disabled=false;button.textContent="Save sale";}
 }
 $("posProductSearch").addEventListener("input",renderProducts);
 $("posProductList").addEventListener("click",e=>{const button=e.target.closest("[data-pos-product]");if(button)selectProduct(button.dataset.posProduct);});
 $("posSaleForm").addEventListener("submit",saveSale);
 ["posSaleQuantity","posSaleUnitPrice"].forEach(id=>$(id).addEventListener("input",()=>{formDirty=true;updateTotal();}));
 ["posSaleDate","posSaleTime","posCustomerName","posCustomerPhone","posPaymentMethod"].forEach(id=>$(id).addEventListener("change",()=>{formDirty=true;}));
 document.querySelectorAll('input[name="payment_received"]').forEach(x=>x.addEventListener("change",()=>{formDirty=true;}));
 $("posRefreshBtn").addEventListener("click",async()=>{
  const button=$("posRefreshBtn");button.disabled=true;
  try{await refresh();toast("POS product list and sales refreshed.");}
  catch(err){toast(err.message||"Could not refresh POS data.","error");}
  finally{button.disabled=false;}
 });
 await refresh();
};
})();
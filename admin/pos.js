(() => {
"use strict";
window.HFPosInit = async function () {
 const H=window.HFAdmin;if(!H)return;
 const {client,esc,money,dateTime,toast,audit,signedQuery,fetchProducts,fetchFinance}=H;
 const $=id=>document.getElementById(id);
 const orderSources=["offline_pos","manual_whatsapp","manual_phone","manual_facebook","manual_other"];
 const paymentMethods=new Set(["cash","mobile_banking","bank_transfer","cash_on_delivery","other"]);
 let products=[],orders=[],financeEntries=[],selectedProductId=null;
 let entryMode="offline",deliveryCart=[],pendingReference=null,formDirty=false,redxAreas=[],redxDistrictLoaded="";
 let redxLookupError="";
 const dhakaNow=()=>{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};
 };
 const validPhone=value=>{
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.startsWith("00880"))digits="0"+digits.slice(5);
  else if(digits.startsWith("880"))digits="0"+digits.slice(3);
  if(!digits)return "";
  return /^01[0-9]{9}$/.test(digits)?digits:null;
 };
 const referenceFor=mode=>{
  const now=dhakaNow(),bytes=crypto.getRandomValues(new Uint8Array(5));
  const suffix=Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();
  return now.date.replace(/-/g,"")+"-"+suffix;
 };
 const getProduct=id=>products.find(p=>p.id===id)||null;
 const stockValue=p=>p.stock_quantity===null||p.stock_quantity===undefined||p.stock_quantity===""?null:Number(p.stock_quantity);
 const flexibleUnit=p=>["kg","liter"].includes(String(p.unit_type||"").toLowerCase());
 const quantityText=n=>Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:3});
 const financeFor=orderId=>financeEntries.find(e=>e.related_order_id===orderId&&e.entry_type==="income");
 const setMessage=(value,success=false)=>{
  $("posFormMessage").textContent=value||"";
  $("posFormMessage").classList.toggle("is-success",!!success&&!!value);
 };
 async function functionError(error){
  let message=error?.message||"The server rejected the request.";
  try{
   const context=error?.context;
   if(context&&typeof context.clone==="function"){
    const data=await context.clone().json();
    message=data?.error||data?.message||message;
   }
  }catch(_){}
  return String(message);
 }
 function renderProducts(){
  const term=$("posProductSearch").value.trim().toLowerCase();
  const rows=products.filter(p=>!term||[p.name,p.category,p.category_slug,p.slug].join(" ").toLowerCase().includes(term));
  $("posProductCount").textContent=rows.length.toLocaleString("en-BD");
  $("posProductList").innerHTML=rows.length?rows.map(p=>{
   const stock=stockValue(p),stockText=stock===null?"Not tracked":quantityText(stock)+" "+(p.unit_type||"unit");
   const img=p.image_url?'<img src="'+esc(p.image_url)+'" alt="" loading="lazy" onerror="this.remove()">':"";
   return '<button type="button" class="pos-product-item" data-pos-product="'+esc(p.id)+'" aria-pressed="'+String(p.id===selectedProductId)+'"><span class="pos-product-thumb">'+(img||esc(String(p.name||"P").slice(0,1)))+'</span><span class="pos-product-copy"><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||p.category_slug||"Uncategorised")+' · '+esc(p.unit_type||"unit")+'</small><em>'+money(p.price)+'</em></span><span class="pos-product-stock"><strong>'+esc(stockText)+'</strong></span></button>';
  }).join(""):'<div class="pos-list-empty">No matching products.</div>';
 }
 function productSales(p){
  return orders.flatMap(o=>(o.order_items||[]).filter(i=>i.product_id===p.id).map(item=>({order:o,item,payment:financeFor(o.id)}))).sort((a,b)=>String(b.order.ordered_at||"").localeCompare(String(a.order.ordered_at||"")));
 }
 function renderHistory(p){
  const sales=productSales(p);
  $("posHistoryCount").textContent=sales.length.toLocaleString("en-BD")+" records";
  $("posHistoryBody").innerHTML=sales.length?sales.slice(0,10).map(({order,item,payment})=>{
   const badge=order.status==="cancelled"?'<span class="pos-payment-badge pos-payment-due">Cancelled</span>':payment?.status==="confirmed"?'<span class="pos-payment-badge pos-payment-paid">Paid</span>':'<span class="pos-payment-badge pos-payment-due">Unpaid</span>';
   return '<tr><td>'+esc(dateTime(order.ordered_at))+'<small class="pos-order-ref">'+esc(order.order_number||"")+'</small></td><td>'+esc(order.customer_name||"Walk-in")+'</td><td>'+quantityText(item.quantity)+' '+esc(item.unit||p.unit_type||"")+'</td><td>'+money(item.unit_price)+'</td><td><strong>'+money(item.line_total)+'</strong></td><td>'+badge+'</td></tr>';
  }).join(""):'<tr><td colspan="6">No sales or delivery orders have been recorded for this product.</td></tr>';
 }
 function updateSelectedDisplay(){
  const p=getProduct(selectedProductId);
  $("posSelectedEmpty").hidden=!!p;
  $("posSelectedContent").hidden=!p;
  if(!p)return;
  $("posSelectedName").textContent=p.name;
  $("posSelectedMeta").textContent=(p.category||p.category_slug||"Uncategorised")+" · "+money(p.price)+" per "+(p.unit_type||"unit");
  const stock=stockValue(p);
  $("posSelectedStock").textContent=stock===null?"—":quantityText(stock)+" "+(p.unit_type||"");
  $("posSelectedImage").innerHTML=p.image_url?'<img src="'+esc(p.image_url)+'" alt="" onerror="this.remove()">':esc(String(p.name||"P").slice(0,1));
  $("posQuantityUnit").textContent="("+p.unit_type+")";
  $("posSaleQuantity").min=flexibleUnit(p)?"0.001":"1";
  $("posSaleQuantity").step=flexibleUnit(p)?"0.001":"1";
  renderHistory(p);
 }
 function updateCurrentLineTotal(){
  if(entryMode==="delivery"){renderCart();return;}
  const qty=Number($("posSaleQuantity").value||0),price=Number($("posSaleUnitPrice").value||0);
  $("posSaleTotal").textContent=money(qty>0&&price>0?qty*price:0);
  $("posSaleCalculation").textContent=quantityText(qty)+" × "+money(price);
 }
 function setSelectedProduct(id){
  selectedProductId=id;
  const p=getProduct(id);
  if(!p)return;
  $("posSaleQuantity").value="1";
  $("posSaleUnitPrice").value=Number(p.price||0).toFixed(2);
  $("posQuantityUnit").textContent="("+p.unit_type+")";
  $("posFormMessage").textContent="";$("posFormMessage").classList.remove("is-success");
  formDirty=false;
  updateCurrentLineTotal();renderProducts();updateSelectedDisplay();
 }
 function updateMode(){
  const delivery=entryMode==="delivery";
  document.querySelectorAll("[data-pos-mode]").forEach(btn=>{
   const active=btn.dataset.posMode===entryMode;
   btn.classList.toggle("is-active",active);
   btn.setAttribute("aria-pressed",String(active));
  });
  $("posOfflineDateFields").hidden=delivery;
  $("posDeliveryFields").hidden=!delivery;
  $("posOrderCartPanel").hidden=!delivery||deliveryCart.length===0;
  $("posAddItemBtn").hidden=!delivery;
  $("posCustomerNameLabel").innerHTML=delivery?'Customer name <span class="pos-required">*</span>':'Customer name <span>(optional)</span>';
  $("posCustomerPhoneLabel").innerHTML=delivery?'Phone number <span class="pos-required">*</span>':'Phone <span>(optional)</span>';
  $("posCustomerName").required=delivery;
  $("posCustomerPhone").required=delivery;
  $("posDeliveryAddress").required=delivery;
  $("posOrderChannel").required=delivery;
  $("posTotalLabel").textContent=delivery?"Order total":"Sale total";
  $("posSaveSaleBtn").textContent=delivery?"Save delivery order":"Save sale";
  $("posSaveExplainer").textContent=delivery
   ?"One confirmed customer order is saved to Orders as Processing. Paid orders enter confirmed Finance income; unpaid/COD orders remain pending until collection. A selected courier can be booked now or later."
   :"Saved sales appear in Orders. Paid sales are added to confirmed Finance income; unpaid sales are saved separately and are not counted as received money.";
  $("posEmptyDescription").textContent=delivery
   ?"Select the products the customer ordered. Add each one to the order, then enter the delivery details."
   :"Select a product from the left to record its offline sale.";
  $("posSelectedEmpty").querySelector("h2").textContent=delivery?"Choose a product for this order":"Choose a product";
  updateCourierFields();renderCart();updateCurrentLineTotal();
 }
 function resetEntryFields(){
  const now=dhakaNow();
  $("posSaleDate").value=now.date;$("posSaleTime").value=now.time;
  $("posCustomerName").value="";$("posCustomerPhone").value="";
  $("posSaleQuantity").value="1";$("posSaleUnitPrice").value=getProduct(selectedProductId)?Number(getProduct(selectedProductId).price||0).toFixed(2):"";
  $("posPaymentMethod").value=entryMode==="delivery"?"cash_on_delivery":"cash";
  document.querySelector('input[name="payment_received"][value="true"]').checked=entryMode==="offline";
  document.querySelector('input[name="payment_received"][value="false"]').checked=entryMode==="delivery";
  $("posDeliveryAddress").value="";$("posDeliveryCharge").value="0";$("posOrderChannel").value="whatsapp";$("posOrderNotes").value="";
  $("posCourierProvider").value="";$("posCourierWeight").value="";$("posCourierFee").value="0";
  $("posRedxDistrict").value="";$("posRedxArea").innerHTML='<option value="">Load areas first</option>';
  $("posRedxHint").textContent="Select the area that matches the customer's address.";
  $("posBookCourierNow").checked=false;redxAreas=[];redxDistrictLoaded="";redxLookupError="";
  pendingReference=null;formDirty=false;
  updateMode();updateCurrentLineTotal();
 }
 function renderCart(){
  const panel=$("posOrderCartPanel"),body=$("posOrderCartBody");
  panel.hidden=entryMode!=="delivery"||deliveryCart.length===0;
  $("posCartCount").textContent=deliveryCart.length+" item line(s)";
  body.innerHTML=deliveryCart.length?deliveryCart.map(item=>
   '<tr><td><strong>'+esc(item.name)+'</strong><small>'+esc(item.unit||"")+'</small></td><td>'+quantityText(item.quantity)+'</td><td>'+money(item.unit_price)+'</td><td><strong>'+money(item.quantity*item.unit_price)+'</strong></td><td><button class="pos-cart-remove" type="button" data-remove-cart="'+esc(item.id)+'" aria-label="Remove '+esc(item.name)+'">Remove</button></td></tr>'
  ).join(""):'<tr><td colspan="5">Add products from the left.</td></tr>';
  const subtotal=deliveryCart.reduce((s,x)=>s+x.quantity*x.unit_price,0);
  const delivery=Number($("posDeliveryCharge").value||0);
  $("posOrderSubtotal").textContent=money(subtotal);
  $("posOrderDelivery").textContent=money(delivery);
  $("posOrderGrandTotal").textContent=money(subtotal+delivery);
  $("posSaleTotal").textContent=money(subtotal+delivery);
  $("posSaleCalculation").textContent=deliveryCart.length+" product line(s) + delivery";
 }
 function addItemToOrder(){
  const p=getProduct(selectedProductId);
  if(!p){setMessage("Select a product first.");return;}
  const qty=Number($("posSaleQuantity").value),price=Number($("posSaleUnitPrice").value);
  if(!Number.isFinite(qty)||qty<=0||qty>1000||Math.abs(qty*1000-Math.round(qty*1000))>1e-8){setMessage("Enter a valid quantity (up to 3 decimal places).");return;}
  if(!flexibleUnit(p)&&!Number.isInteger(qty)){setMessage("This product is sold as a pack or piece. Enter a whole-number quantity.");return;}
  if(!Number.isFinite(price)||price<=0||price>1000000){setMessage("Enter a valid selling price.");return;}
  const already=deliveryCart.filter(x=>x.product_id===p.id).reduce((s,x)=>s+x.quantity,0);
  const stock=stockValue(p);
  if(stock!==null&&already+qty>stock){setMessage("Not enough stock. Available: "+quantityText(stock)+" "+p.unit_type+".");return;}
  deliveryCart.push({id:crypto.randomUUID(),product_id:p.id,product_slug:p.slug,name:p.name,unit:p.unit_type,quantity:qty,unit_price:Math.round(price*100)/100});
  formDirty=true;renderCart();setMessage(p.name+" added to this order.",true);
  $("posSaleQuantity").value="1";$("posSaleUnitPrice").value=Number(p.price||0).toFixed(2);updateCurrentLineTotal();
 }
 function updateCourierFields(){
  const provider=$("posCourierProvider").value;
  const selected=!!provider;
  const needWeight=["pathao","redx"].includes(provider);
  $("posCourierWeightField").hidden=!needWeight;
  $("posCourierFeeField").hidden=!selected;
  $("posRedxFields").hidden=provider!=="redx";
  $("posBookNowLabel").hidden=!selected;
  if(selected){
   $("posPaymentMethod").value="cash_on_delivery";
   document.querySelector('input[name="payment_received"][value="false"]').checked=true;
   $("posPaymentMethod").disabled=true;
   document.querySelectorAll('input[name="payment_received"]').forEach(x=>x.disabled=true);
  }else{
   $("posPaymentMethod").disabled=false;
   document.querySelectorAll('input[name="payment_received"]').forEach(x=>x.disabled=false);
  }
 }
 async function loadRedxAreas(){
  const district=$("posRedxDistrict").value.trim(),button=$("posRedxLoadAreas"),select=$("posRedxArea");
  if(district.length<2){redxLookupError="Enter the destination district in English first.";setMessage(redxLookupError);return;}
  button.disabled=true;select.disabled=true;redxLookupError="";$("posRedxHint").textContent="Loading REDX areas…";
  try{
   const {data,error}=await client.functions.invoke("courier-integration",{body:{action:"areas",provider:"redx",district_name:district}});
   if(error)throw new Error(await functionError(error));
   if(!data?.success)throw new Error(data?.error||"Could not load REDX areas.");
   if(String(data.api_environment||"").toLowerCase()==="sandbox"||data.sandbox_test_mode===true)throw new Error("REDX is returning Sandbox areas. Production API is required for real customer deliveries.");
   redxAreas=(Array.isArray(data.areas)?data.areas:[]).map(a=>({id:String(a?.id??"").trim(),name:String(a?.name??"").trim(),sandbox_test_only:a?.sandbox_test_only===true})).filter(a=>a.id&&a.name&&!a.sandbox_test_only);
   if(!redxAreas.length)throw new Error(data.message||"No active Production areas were returned for this district.");
   redxDistrictLoaded=district;
   select.innerHTML='<option value="">Choose the exact delivery area</option>'+redxAreas.map(a=>'<option value="'+esc(a.id)+'" data-area-name="'+esc(a.name)+'">'+esc(a.name)+'</option>').join("");
   select.disabled=false;$("posRedxHint").textContent=redxAreas.length+" Production area(s) loaded. Choose the customer's actual destination.";
  }catch(err){
   redxLookupError=err.message||"REDX area lookup failed.";
   redxAreas=[];redxDistrictLoaded="";
   select.innerHTML='<option value="">Areas not loaded — try again</option>';
   $("posRedxHint").textContent=redxLookupError;setMessage(redxLookupError);
  }finally{button.disabled=false;}
 }
 async function refresh(){
  const [productRows,orderRows,financeRows]=await Promise.all([
   fetchProducts(),
   signedQuery(client.from("orders").select("id,order_number,customer_name,customer_phone,total,status,source,notes,ordered_at,payment_method,order_items(id,product_id,product_name,quantity,unit,unit_price,line_total)").in("source",orderSources).order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(2000)),
   fetchFinance(null,3000)
  ]);
  products=productRows;orders=orderRows;financeEntries=financeRows;
  if(selectedProductId&&!getProduct(selectedProductId))selectedProductId=null;
  renderProducts();updateSelectedDisplay();renderCart();
 }
 function selectProduct(id){
  if(id===selectedProductId)return;
  selectedProductId=id;pendingReference=null;
  const p=getProduct(id);
  if(p){
   $("posSaleQuantity").value="1";$("posSaleUnitPrice").value=Number(p.price||0).toFixed(2);
   $("posQuantityUnit").textContent="("+p.unit_type+")";
   setMessage("");
  }
  formDirty=false;renderProducts();updateSelectedDisplay();updateCurrentLineTotal();
 }
 async function saveOfflineSale(){
  const p=getProduct(selectedProductId);
  if(!p){setMessage("Select a product first.");return;}
  const date=$("posSaleDate").value,time=$("posSaleTime").value;
  const quantity=Number($("posSaleQuantity").value),price=Number($("posSaleUnitPrice").value);
  const phone=validPhone($("posCustomerPhone").value);
  const customer=$("posCustomerName").value.trim()||"Walk-in Customer";
  const paymentMethod=$("posPaymentMethod").value;
  const paid=document.querySelector('input[name="payment_received"]:checked')?.value==="true";
  const now=dhakaNow();
  if(!date||!time){setMessage("Enter the sale date and time.");return;}
  if(date>now.date||(date===now.date&&time>now.time)){setMessage("Sale date/time cannot be in the future.");return;}
  if(!Number.isFinite(quantity)||quantity<=0||quantity>1000||Math.abs(quantity*1000-Math.round(quantity*1000))>1e-8){setMessage("Enter a valid quantity (up to 3 decimal places).");return;}
  if(!flexibleUnit(p)&&!Number.isInteger(quantity)){setMessage("Packaged products and pieces need a whole-number quantity.");return;}
  if(!Number.isFinite(price)||price<=0||price>1000000){setMessage("Enter a selling price greater than zero.");return;}
  if(phone===null){setMessage("Enter a valid Bangladesh phone number or leave it blank.");return;}
  if(!paymentMethods.has(paymentMethod)){setMessage("Choose a valid payment method.");return;}
  const stock=stockValue(p);
  if(stock!==null&&quantity>stock){setMessage("Not enough stock. Available: "+quantityText(stock)+" "+p.unit_type+".");return;}
  if(!pendingReference)pendingReference=referenceFor("offline");
  const payload={sale_reference:pendingReference,sale_date:date,sale_time:time,customer_name:customer,customer_phone:phone||"",payment_method:paymentMethod,payment_received:paid,adjust_stock:true,notes:"",items:[{product_slug:p.slug,quantity,unit_price:Math.round(price*100)/100}]};
  return await sendOfflineSale(payload,p);
 }
 async function sendOfflineSale(payload,p){
  const button=$("posSaveSaleBtn");button.disabled=true;button.textContent="Saving…";setMessage("");
  try{
   const {data,error}=await client.rpc("create_offline_pos_sale",{p_sale:payload});
   if(error)throw new Error(await functionError(error));
   if(data?.success!==true)throw new Error(data?.error||"The server did not confirm the sale.");
   if(data.duplicate){pendingReference=null;formDirty=false;setMessage("This sale was already saved. No duplicate was created.",true);await refresh();return;}
   pendingReference=null;formDirty=false;
   try{await audit("offline_pos_sale_recorded","order",data.orderId,"Offline sale recorded",{order_number:data.orderNumber,product_id:p.id,quantity:payload.items[0].quantity,unit_price:payload.items[0].unit_price,total:data.total,payment_received:payload.payment_received});}catch(_){}
   const text="Saved. "+money(data.total)+" added to sales. "+(payload.payment_received?"Finance income confirmed.":"Payment remains unpaid.");
   resetEntryFields();try{await refresh();}catch(refreshError){console.warn("Sale saved, but POS history refresh failed.",refreshError);}setMessage(text,true);toast("Offline sale saved successfully.");
  }catch(err){setMessage(err.message||"Sale could not be saved.");toast(err.message||"Sale could not be saved.","error");}
  finally{button.disabled=false;button.textContent=entryMode==="delivery"?"Save delivery order":"Save sale";}
 }
 async function saveDeliveryOrder(){
  if(deliveryCart.length===0){setMessage("Add at least one product to this order.");return;}
  const name=$("posCustomerName").value.trim(),phone=validPhone($("posCustomerPhone").value),address=$("posDeliveryAddress").value.trim();
  const channel=$("posOrderChannel").value,delivery=Number($("posDeliveryCharge").value||0);
  const method=$("posPaymentMethod").value,paid=document.querySelector('input[name="payment_received"]:checked')?.value==="true";
  const provider=$("posCourierProvider").value,weight=$("posCourierWeight").value?Number($("posCourierWeight").value):null;
  const fee=Number($("posCourierFee").value||0),notes=$("posOrderNotes").value.trim();
  if(name.length<2){setMessage("Enter the customer's name.");return;}
  if(provider&&name.length<3){setMessage("Courier booking requires a customer name with at least 3 characters.");return;}
  if(phone===null||!phone){setMessage("Enter a valid 11-digit Bangladesh mobile number.");return;}
  if(address.length<10){setMessage("Enter the complete delivery address, including area/upazila and district.");return;}
  if(provider==="pathao"&&address.length>220){setMessage("Pathao delivery addresses must be 220 characters or fewer. Shorten the address without removing its area/district.");return;}
  if(!["whatsapp","phone","facebook","other"].includes(channel)){setMessage("Choose how the customer placed the order.");return;}
  if(!Number.isFinite(delivery)||delivery<0||delivery>100000){setMessage("Enter a valid delivery charge.");return;}
  if(!paymentMethods.has(method)){setMessage("Choose a valid payment method.");return;}
  if(notes.length>500){setMessage("Order note must be 500 characters or fewer.");return;}
  if(provider&& (method!=="cash_on_delivery"||paid)){setMessage("Courier API booking currently supports unpaid Cash on Delivery orders only.");return;}
  if(provider==="pathao"&&(!Number.isFinite(weight)||weight<0.5||weight>10)){setMessage("Pathao needs a packed weight between 0.5 kg and 10 kg.");return;}
  if(provider==="redx"){
   if(!Number.isFinite(weight)||weight<0.1||weight>10){setMessage("REDX needs a packed weight between 0.1 kg and 10 kg.");return;}
   if(redxLookupError){setMessage("REDX area lookup failed: "+redxLookupError);return;}
   if(redxDistrictLoaded.toLowerCase()!==$("posRedxDistrict").value.trim().toLowerCase()||!$("posRedxArea").value){setMessage("Load and choose the exact REDX Production area matching the address.");return;}
  }
  if(!Number.isFinite(fee)||fee<0||fee>100000){setMessage("Enter a valid courier fee.");return;}
  for(const item of deliveryCart){
   if(!getProduct(item.product_id)){setMessage("One product in this order is no longer in the catalogue. Refresh and rebuild the order.");return;}
  }
  const courierLabel=provider==="steadfast"?"Steadfast":provider==="pathao"?"Pathao":provider==="redx"?"REDX":"";
  const bookNow=!!provider&&$("posBookCourierNow").checked;
  if(bookNow){
   const total=deliveryCart.reduce((s,x)=>s+x.quantity*x.unit_price,0)+delivery;
   const go=confirm("BOOK A REAL COURIER PARCEL NOW?\n\nCourier: "+courierLabel+"\nCustomer: "+name+"\nPhone: "+phone+"\nCOD: "+money(total)+"\nAddress: "+address+"\n\nThe order will be saved first, then customer details will be sent to "+courierLabel+". This may create a real shipment. Continue?");
   if(!go)return;
  }
  if(!pendingReference)pendingReference=referenceFor("delivery");
  const redxOption=$("posRedxArea").selectedOptions?.[0];
  const payload={
   order_reference:pendingReference,order_channel:channel,
   customer_name:name,customer_phone:phone,delivery_address:address,
   delivery_charge:delivery,payment_method:method,payment_received:paid,notes,
   items:deliveryCart.map(x=>({product_slug:x.product_slug,quantity:x.quantity,unit_price:x.unit_price})),
   courier_provider:provider,parcel_weight_kg:weight,courier_fee:fee,
   redx_delivery_area_id:provider==="redx"?$("posRedxArea").value:null,
   redx_delivery_area:provider==="redx"?(redxOption?.dataset?.areaName||""):"",
   redx_delivery_district:provider==="redx"?$("posRedxDistrict").value.trim():"",
   redx_sandbox_test_area:false
  };
  const button=$("posSaveSaleBtn");button.disabled=true;button.textContent="Saving order…";setMessage("");
  try{
   const {data,error}=await client.rpc("create_manual_delivery_order",{p_order:payload});
   if(error)throw new Error(await functionError(error));
   if(data?.success!==true)throw new Error(data?.error||"The order was not confirmed by the server.");
   if(data.duplicate){
    pendingReference=null;deliveryCart=[];formDirty=false;resetEntryFields();renderCart();
    setMessage("This order was already saved as "+data.orderNumber+". No duplicate order or finance entry was created.",true);
    try{await refresh();}catch(refreshError){console.warn("Existing order found, but POS history refresh failed.",refreshError);}return;
   }
   const orderNumber=data.orderNumber,orderTotal=Number(data.total||0);
   pendingReference=null;deliveryCart=[];formDirty=false;
   try{await audit("manual_delivery_order_created","order",data.orderId,"Manual delivery order created from POS",{order_number:orderNumber,channel,items:payload.items.length,total:orderTotal,courier:provider||null,finance_status:data.financeStatus});}catch(_){}
   let resultMessage="Order "+orderNumber+" saved and added to Orders as Processing. "+money(orderTotal)+" recorded.";
   if(paid)resultMessage+=" Payment is confirmed in Finance.";
   else resultMessage+=" Payment is pending; it is not counted as received income.";
   if(provider&&data.shipmentId){
    if(bookNow){
     setMessage(resultMessage+" Booking with "+courierLabel+"…",false);
     try{
      const {data:booking,error:bookingError}=await client.functions.invoke("courier-integration",{body:{action:"book",provider,shipment_id:data.shipmentId}});
      if(bookingError)throw new Error(await functionError(bookingError));
      if(!booking?.success)throw new Error(booking?.error||"Courier provider did not confirm booking.");
      resultMessage+=" "+courierLabel+" booking succeeded. Tracking: "+(booking.tracking_id||"see Operations Center")+".";
      try{await audit("manual_order_courier_booked","shipment",data.orderId,"Courier booked from POS",{order_number:orderNumber,provider,courier_tracking_id:booking.tracking_id||null});}catch(_){}
     }catch(err){
      resultMessage+=" Order is safe, but "+courierLabel+" booking did not complete: "+(err.message||"check the courier response")+". Check Operations before retrying; an uncertain booking must be verified with the provider first.";
     }
    }else{
     resultMessage+=" "+courierLabel+" parcel is prepared but not booked. You can book it later from Operations.";
    }
   }
   resetEntryFields();try{await refresh();}catch(refreshError){console.warn("Delivery order saved, but POS history refresh failed.",refreshError);}setMessage(resultMessage,true);
   toast(bookNow&&provider?"Delivery order saved. Courier result is shown below.":"Delivery order saved successfully.");
  }catch(err){
   setMessage(err.message||"Delivery order could not be saved.");
   toast(err.message||"Delivery order could not be saved.","error");
  }finally{
   button.disabled=false;button.textContent=entryMode==="delivery"?"Save delivery order":"Save sale";
  }
 }
 async function saveSale(event){
  event.preventDefault();
  if(entryMode==="delivery")return await saveDeliveryOrder();
  return await saveOfflineSale();
 }

 document.querySelectorAll("[data-pos-mode]").forEach(btn=>btn.addEventListener("click",()=>{
  const next=btn.dataset.posMode;
  if(next===entryMode)return;
  if((formDirty||deliveryCart.length)&&!confirm("Discard the unsaved details and switch order type?"))return;
  entryMode=next;deliveryCart=[];pendingReference=null;formDirty=false;setMessage("");
  resetEntryFields();
  updateMode();
 }));
 $("posProductSearch").addEventListener("input",renderProducts);
 $("posProductList").addEventListener("click",e=>{const btn=e.target.closest("[data-pos-product]");if(btn)selectProduct(btn.dataset.posProduct);});
 $("posSaleForm").addEventListener("submit",saveSale);
 $("posAddItemBtn").addEventListener("click",addItemToOrder);
 $("posOrderCartBody").addEventListener("click",e=>{
  const btn=e.target.closest("[data-remove-cart]");if(!btn)return;
  deliveryCart=deliveryCart.filter(x=>x.id!==btn.dataset.removeCart);formDirty=true;renderCart();
 });
 ["posSaleQuantity","posSaleUnitPrice"].forEach(id=>$(id).addEventListener("input",()=>{formDirty=true;updateCurrentLineTotal();}));
 ["posSaleDate","posSaleTime","posCustomerName","posCustomerPhone","posPaymentMethod","posDeliveryAddress","posDeliveryCharge","posOrderChannel","posOrderNotes","posCourierWeight","posCourierFee"].forEach(id=>$(id).addEventListener("input",()=>{formDirty=true;if(id==="posDeliveryCharge")renderCart();}));
 $("posCourierProvider").addEventListener("change",()=>{formDirty=true;updateCourierFields();renderCart();});
 $("posRedxLoadAreas").addEventListener("click",loadRedxAreas);
 ["posRedxDistrict","posRedxArea"].forEach(id=>$(id).addEventListener("change",()=>{formDirty=true;}));
 document.querySelectorAll('input[name="payment_received"]').forEach(x=>x.addEventListener("change",()=>{formDirty=true;}));
 $("posRefreshBtn").addEventListener("click",async()=>{
  const btn=$("posRefreshBtn");btn.disabled=true;
  try{await refresh();toast("POS products and saved orders refreshed.");}
  catch(err){toast(err.message||"Could not refresh POS data.","error");}
  finally{btn.disabled=false;}
 });
 const now=dhakaNow();$("posSaleDate").value=now.date;$("posSaleTime").value=now.time;
 updateMode();await refresh();
};
})();
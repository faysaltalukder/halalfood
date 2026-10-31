(() => {
"use strict";
window.HFPosInit = async function () {
 const H=window.HFAdmin;if(!H)return;
 const {client,ADMIN_EMAIL,esc,money,dateTime,dateOnly,toast,audit,signedQuery,downloadFile,csvText,fetchOrders,fetchProducts,makeEmpty}=H;
 const $=id=>document.getElementById(id);
 const MAX_FILE_BYTES=2*1024*1024,MAX_ROWS=5000,MAX_SALES=300,MAX_ITEMS_PER_SALE=100;
 const requiredHeaders=["sale_reference","sale_date","product_slug","quantity"];
 const allowedMethods=new Set(["cash","mobile_banking","bank_transfer","cash_on_delivery","other"]);
 let products=[],orders=[],draftSales=[],fatalRows=[],fileText="",isImported=false;

 const normalizePhone=value=>{
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.startsWith("00880"))digits="0"+digits.slice(5);
  else if(digits.startsWith("880"))digits="0"+digits.slice(3);
  if(!digits)return "";
  return /^01[0-9]{9}$/.test(digits)?digits:null;
 };
 const validDate=value=>{
  const v=String(value||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const [year,month,day]=v.split("-").map(Number);
  const d=new Date(Date.UTC(year,month-1,day));
  return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day&&v<=todayDhaka();
 };
 const todayDhaka=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const parseBoolean=(value,defaultValue=true)=>{
  const v=String(value??"").trim().toLowerCase();
  if(!v)return defaultValue;
  if(["yes","y","true","1"].includes(v))return true;
  if(["no","n","false","0"].includes(v))return false;
  return null;
 };
 const parseCsv=source=>{
  const text=String(source||"").replace(/^\uFEFF/,"");
  const rows=[];let row=[],field="",quoted=false,line=1,rowLine=1;
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(quoted){
    if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
    else if(ch==='"')quoted=false;
    else{field+=ch;if(ch==="\n")line++;}
   }else if(ch==='"'&&field.length===0){quoted=true;}
   else if(ch===","){row.push(field);field="";}
   else if(ch==="\n"||ch==="\r"){
    if(ch==="\r"&&text[i+1]==="\n")i++;
    row.push(field);field="";
    if(row.some(cell=>String(cell).trim()!==""))rows.push({line:rowLine,cells:row});
    row=[];line++;rowLine=line;
   }else field+=ch;
  }
  if(quoted)throw new Error("The CSV contains an unclosed quotation mark.");
  row.push(field);
  if(row.some(cell=>String(cell).trim()!==""))rows.push({line:rowLine,cells:row});
  return rows;
 };
 const paymentLabel=value=>({cash:"Cash",mobile_banking:"Mobile banking",bank_transfer:"Bank transfer",cash_on_delivery:"Cash on delivery",other:"Other"}[value]||value);
 const csvCell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
 function setMessage(message,isError=false){
  const node=$("posFileMessage");if(!node)return;node.textContent=message;node.classList.toggle("pos-message-error",isError);
 }
 function renderMetrics(){
  const rows=orders.filter(o=>o.source==="offline_pos");
  $("posMetricCount").textContent=rows.length.toLocaleString("en-BD");
  $("posMetricValue").textContent=money(rows.reduce((sum,o)=>sum+Number(o.total||0),0));
  const latest=rows.slice().sort((a,b)=>String(b.ordered_at||"").localeCompare(String(a.ordered_at||"")))[0];
  $("posMetricLatest").textContent=latest?money(latest.total):"—";
  $("posMetricLatestDate").textContent=latest?"Latest POS sale · "+dateOnly(latest.ordered_at):"No imported sales yet";
 }
 function renderRecent(){
  const q=String($("posRecentSearch")?.value||"").trim().toLowerCase();
  const rows=orders.filter(o=>o.source==="offline_pos").slice().sort((a,b)=>String(b.ordered_at||"").localeCompare(String(a.ordered_at||"")));
  const filtered=rows.filter(o=>!q||[o.order_number,o.customer_name,o.customer_phone].join(" ").toLowerCase().includes(q));
  $("posRecentBody").innerHTML=filtered.length?filtered.slice(0,100).map(o=>{
   const items=Array.isArray(o.order_items)?o.order_items:[];
   const summary=items.map(i=>String(i.product_name||"Product")+" × "+Number(i.quantity||0)).join(", ");
   return '<tr><td><span class="pos-ref">'+esc(o.order_number||"—")+'</span></td><td>'+esc(dateOnly(o.ordered_at))+'</td><td><strong>'+esc(o.customer_name||"Walk-in Customer")+'</strong><small>'+esc(o.customer_phone||"Not provided")+'</small></td><td class="pos-product-cell">'+esc(summary||"No item details")+'</td><td>'+esc(paymentLabel(o.payment_method||""))+'</td><td class="pos-money"><strong>'+money(o.total)+'</strong></td><td>'+esc(String(o.status||"").replace(/_/g," "))+'</td></tr>';
  }).join(""):'<tr><td colspan="7">'+makeEmpty("No offline POS sales yet","Imported offline sales will appear here after a successful import.")+'</td></tr>';
 }
 function renderCatalog(){
  const q=String($("posProductSearch")?.value||"").trim().toLowerCase();
  const rows=products.filter(p=>!q||[p.name,p.slug,p.category].join(" ").toLowerCase().includes(q)).slice(0,500);
  $("posCatalogBody").innerHTML=rows.length?rows.map(p=>'<tr><td><strong>'+esc(p.name)+'</strong><small>'+esc(p.category||"Uncategorised")+'</small></td><td><code class="pos-mapping-slug">'+esc(p.slug)+'</code></td><td class="pos-money">'+money(p.price)+'</td><td>'+ (p.stock_quantity===null||p.stock_quantity===undefined?"Not tracked":Number(p.stock_quantity).toLocaleString("en-BD"))+'</td><td>'+ (p.is_active?'<span class="hf-status hf-status-active">Active</span>':'<span class="hf-status hf-status-pending">Inactive · historical import allowed</span>')+'</td></tr>').join(""):'<tr><td colspan="5">'+makeEmpty("No matching products","Change the search or refresh the catalogue.")+'</td></tr>';
 }
 async function refresh(){
  [orders,products]=await Promise.all([fetchOrders(null,5000),fetchProducts()]);
  renderMetrics();renderRecent();renderCatalog();
 }
 function buildGroups(parsedRows){
  if(parsedRows.length<2)throw new Error("The CSV needs a header row and at least one sale item row.");
  if(parsedRows.length-1>MAX_ROWS)throw new Error("The CSV contains more than "+MAX_ROWS.toLocaleString("en-BD")+" item rows.");
  const headers=parsedRows[0].cells.map(h=>String(h||"").trim().toLowerCase().replace(/[\s-]+/g,"_"));
  if(new Set(headers).size!==headers.length)throw new Error("The CSV contains duplicate column headers.");
  const missing=requiredHeaders.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error("Missing required CSV column(s): "+missing.join(", "));
  const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const productMap=new Map(products.map(p=>[String(p.slug||"").toLowerCase(),p]));
  const groups=new Map(),fatal=[];
  const read=(cells,key)=>index[key]===undefined?"":String(cells[index[key]]??"").trim();
  for(const record of parsedRows.slice(1)){
   const cells=record.cells;
   if(cells.length>headers.length){fatal.push("CSV row "+record.line+": has more values than the header.");continue;}
   const ref=read(cells,"sale_reference").toUpperCase();
   if(!/^[A-Z0-9][A-Z0-9_-]{0,49}$/.test(ref)){fatal.push("CSV row "+record.line+": invalid or missing sale_reference.");continue;}
   let g=groups.get(ref);
   if(!g){g={sale_reference:ref,items:[],errors:[],lines:[],common:null,total:0,payment_received:true,payment_method:"cash",sale_date:"",customer_name:"",customer_phone:"",customer_email:"",notes:"",status:"ready"};groups.set(ref,g);}
   g.lines.push(record.line);
   const saleDate=read(cells,"sale_date");
   const name=read(cells,"customer_name");
   const rawPhone=read(cells,"customer_phone");
   const phone=normalizePhone(rawPhone);
   const email=read(cells,"customer_email").toLowerCase();
   const method=(read(cells,"payment_method")||"cash").toLowerCase();
   const paid=parseBoolean(read(cells,"payment_received"),true);
   const notes=read(cells,"notes");
   const common={sale_date:saleDate,customer_name:name,customer_phone:rawPhone,customer_email:email,payment_method:method,payment_received:paid,notes};
   if(!g.common)g.common=common;
   else if(Object.keys(common).some(k=>String(common[k]??"")!==String(g.common[k]??"")))g.errors.push("Rows for this sale have inconsistent customer, date, payment or notes values.");
   if(!validDate(saleDate))g.errors.push("Row "+record.line+": sale_date must be a valid YYYY-MM-DD date and cannot be in the future.");
   if(phone===null)g.errors.push("Row "+record.line+": customer_phone must be a Bangladesh mobile number or blank.");
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))g.errors.push("Row "+record.line+": customer_email is not valid.");
   if(!allowedMethods.has(method))g.errors.push("Row "+record.line+": unsupported payment_method '"+method+"'.");
   if(paid===null)g.errors.push("Row "+record.line+": payment_received must be yes or no.");
   const slug=read(cells,"product_slug").toLowerCase();
   const product=productMap.get(slug);
   if(!product)g.errors.push("Row "+record.line+": product_slug '"+slug+"' was not found in Product Mapping.");
   const qtyText=read(cells,"quantity");
   const qty=Number(qtyText);
   if(!qtyText||!Number.isInteger(qty)||qty<1||qty>1000)g.errors.push("Row "+record.line+": quantity must be a whole number from 1 to 1,000.");
   const priceText=read(cells,"unit_price");
   const price=priceText===""?Number(product?.price):Number(priceText);
   if(priceText!==""&&(!Number.isFinite(price)||price<0||price>1000000))g.errors.push("Row "+record.line+": unit_price must be between 0 and 1,000,000.");
   if(product&&Number.isInteger(qty)&&qty>=1&&qty<=1000&&Number.isFinite(price)&&price>=0&&price<=1000000){
    g.items.push({product_slug:product.slug,quantity:qty,unit_price:Math.round(price*100)/100,product_name:product.name,product_id:product.id});
    g.total+=qty*price;
   }
   g.sale_date=saleDate;g.customer_name=name;g.customer_phone=phone||"";g.customer_email=email;g.payment_method=method;g.payment_received=paid===null?true:paid;g.notes=notes;
  }
  if(groups.size>MAX_SALES)throw new Error("The CSV contains more than "+MAX_SALES+" distinct sales. Split it into smaller files.");
  return {groups:[...groups.values()],fatal};
 }
 async function validatePreview(){
  if(!fileText)throw new Error("Choose a CSV file first.");
  const parsed=parseCsv(fileText);
  const built=buildGroups(parsed);
  draftSales=built.groups;fatalRows=built.fatal;
  const numbers=draftSales.map(g=>"POS-"+g.sale_reference);
  let existing=[];
  if(numbers.length)existing=await signedQuery(client.from("orders").select("order_number,source").in("order_number",numbers));
  const existingMap=new Map(existing.map(row=>[row.order_number,row.source]));
  const productMap=new Map(products.map(p=>[String(p.slug||"").toLowerCase(),p]));
  for(const g of draftSales){
   if(g.errors.length){g.status="error";continue;}
   if(existingMap.has("POS-"+g.sale_reference)){
    if(existingMap.get("POS-"+g.sale_reference)==="offline_pos"){g.status="duplicate";continue;}
    g.errors.push("Sale reference conflicts with a non-POS order number.");g.status="error";continue;
   }
   if($("posAdjustStock").checked){
    const quantities=new Map();g.items.forEach(item=>quantities.set(item.product_slug,(quantities.get(item.product_slug)||0)+item.quantity));
    for(const [slug,quantity] of quantities){
     const p=productMap.get(slug);
     if(p&&p.stock_quantity!==null&&p.stock_quantity!==undefined&&Number(p.stock_quantity)<quantity)g.errors.push("Insufficient stock for "+p.name+": available "+p.stock_quantity+", requested "+quantity+".");
    }
   }
   if(g.total<=0)g.errors.push("Sale total must be greater than zero.");
   g.status=g.errors.length?"error":"ready";
  }
  renderPreview();
 }
 function renderPreview(){
  const ready=draftSales.filter(g=>g.status==="ready"),dupes=draftSales.filter(g=>g.status==="duplicate"),bad=draftSales.filter(g=>g.status==="error");
  $("posPreviewPanel").hidden=false;
  $("posReadyCount").textContent=ready.length.toLocaleString("en-BD");
  $("posDuplicateCount").textContent=dupes.length.toLocaleString("en-BD");
  $("posErrorCount").textContent=(bad.length+fatalRows.length).toLocaleString("en-BD");
  $("posReadyValue").textContent=money(ready.reduce((sum,g)=>sum+g.total,0));
  $("posPreviewDescription").textContent=draftSales.length.toLocaleString("en-BD")+" unique sales · "+draftSales.reduce((sum,g)=>sum+g.items.length,0).toLocaleString("en-BD")+" matched item rows · "+fatalRows.length+" ungrouped invalid row(s).";
  $("posPreviewBody").innerHTML=draftSales.length?draftSales.map(g=>{
   const status=g.status==="ready"?'<span class="pos-preview-status pos-preview-ready">Ready</span>':g.status==="duplicate"?'<span class="pos-preview-status pos-preview-duplicate">Already imported</span>':'<span class="pos-preview-status pos-preview-error">Needs correction</span>';
   return '<tr><td><span class="pos-ref">'+esc("POS-"+g.sale_reference)+'</span><small>CSV rows '+esc(g.lines.join(", "))+'</small></td><td>'+esc(g.sale_date||"—")+'</td><td>'+esc(g.customer_name||"Walk-in Customer")+'<small>'+esc(g.customer_phone||"No phone")+'</small></td><td>'+g.items.length+' item row(s)</td><td>'+esc(paymentLabel(g.payment_method))+'<small>'+(g.payment_received?"Marked received":"Not received · draft")+'</small></td><td class="pos-money">'+money(g.total)+'</td><td>'+status+'</td></tr>';
  }).join(""):'<tr><td colspan="7">No valid sale rows were found.</td></tr>';
  const errorList=[...fatalRows,...bad.flatMap(g=>g.errors.map(err=>"POS-"+g.sale_reference+": "+err))];
  $("posImportErrors").hidden=!errorList.length;
  $("posImportErrors").innerHTML=errorList.length?'<strong>Fix these issues before importing the affected sales:</strong><ul>'+errorList.slice(0,100).map(err=>'<li>'+esc(err)+'</li>').join("")+'</ul>':"";
  $("posImportBtn").disabled=!ready.length||isImported;
 }
 async function onFileSelected(){
  const file=$("posCsvFile").files?.[0];
  draftSales=[];fatalRows=[];fileText="";isImported=false;
  $("posPreviewPanel").hidden=true;$("posImportResults").hidden=true;$("posPreviewBtn").disabled=true;
  if(!file){$("posFileName").textContent="No file selected yet.";setMessage("Select a CSV to validate it.");return;}
  $("posFileName").textContent=file.name+" · "+(file.size/1024).toFixed(1)+" KB";
  if(file.size>MAX_FILE_BYTES){setMessage("The selected file is larger than 2 MB.",true);return;}
  if(!/\.csv$/i.test(file.name)&&file.type!=="text/csv"){setMessage("Choose a .csv file.",true);return;}
  try{fileText=await file.text();$("posPreviewBtn").disabled=false;setMessage("File loaded. Validate it to check products, dates, duplicates and stock before import.");}
  catch(err){setMessage(err.message||"Could not read the selected CSV.",true);}
 }
 async function runImport(){
  const ready=draftSales.filter(g=>g.status==="ready");
  if(!ready.length||isImported)return;
  if(!confirm("Import "+ready.length+" offline sale(s) into Orders, Inventory and Finance?\n\n"+($("posAdjustStock").checked?"Tracked stock will be reduced.":"Current stock will not be changed.")+"\nNo website purchase tracking event will be sent."))return;
  const button=$("posImportBtn");button.disabled=true;button.textContent="Importing…";
  const results=[];
  try{
   for(const g of ready){
    try{
     const payload={
      sale_reference:g.sale_reference,sale_date:g.sale_date,
      customer_name:g.customer_name,customer_phone:g.customer_phone,
      customer_email:g.customer_email,payment_method:g.payment_method,
      payment_received:g.payment_received,notes:g.notes,
      adjust_stock:$("posAdjustStock").checked,
      items:g.items.map(item=>({product_slug:item.product_slug,quantity:item.quantity,unit_price:item.unit_price}))
     };
     const {data,error}=await client.rpc("create_offline_pos_sale",{p_sale:payload});
     if(error)throw new Error(error.message||"Server rejected this sale.");
     if(data?.success!==true)throw new Error(data?.error||"The server did not confirm the import.");
     if(data.duplicate){results.push({ref:g.sale_reference,status:"duplicate",text:"Already imported — skipped."});g.status="duplicate";continue;}
     await audit("offline_pos_sale_imported","order",data.orderId,"Offline POS sale imported",{order_number:data.orderNumber,total:data.total,items:data.itemsCount,stock_adjusted:data.stockAdjusted,finance_status:data.financeStatus});
     results.push({ref:g.sale_reference,status:"success",text:data.orderNumber+" · "+money(data.total)+" · Finance "+data.financeStatus+"."});
     g.status="imported";
    }catch(err){results.push({ref:g.sale_reference,status:"error",text:err.message||"Import failed."});}
   }
   isImported=true;
   $("posImportResults").hidden=false;
   const ok=results.filter(r=>r.status==="success").length,dup=results.filter(r=>r.status==="duplicate").length,failed=results.filter(r=>r.status==="error").length;
   $("posImportResults").innerHTML='<strong>Import finished · '+ok+' saved · '+dup+' duplicate(s) skipped · '+failed+' failed</strong><ul>'+results.map(r=>'<li><strong>'+esc("POS-"+r.ref)+'</strong> — '+esc(r.text)+'</li>').join("")+'</ul>';
   setMessage("Import finished. Refresh the page data and review the imported sales below.");
   await refresh();
   renderPreview();
   $("posImportBtn").disabled=true;
   toast("POS import completed: "+ok+" saved, "+dup+" skipped, "+failed+" failed.",failed?"error":"success");
  }finally{button.textContent="Import ready sales";button.disabled=true;}
 }
 function downloadTemplate(){
  const headers=["sale_reference","sale_date","customer_name","customer_phone","customer_email","payment_method","payment_received","notes","product_slug","quantity","unit_price"];
  downloadFile("halal-food-offline-pos-template.csv","\uFEFF"+headers.map(csvCell).join(",")+"\r\n","text/csv;charset=utf-8");
 }
 function downloadProductList(){
  const rows=products.map(p=>({product_name:p.name,product_slug:p.slug,current_price:Number(p.price||0),stock_quantity:p.stock_quantity??"not_tracked",unit_type:p.unit_type||"",catalogue_status:p.is_active?"active":"inactive"}));
  downloadFile("halal-food-pos-product-mapping.csv",csvText(rows),"text/csv;charset=utf-8");
 }
 $("posCsvFile").addEventListener("change",()=>onFileSelected().catch(err=>setMessage(err.message||"Could not read the CSV.",true)));
 $("posPreviewBtn").addEventListener("click",async()=>{
  const b=$("posPreviewBtn");b.disabled=true;b.textContent="Validating…";
  try{await validatePreview();setMessage("Preview ready. Review the status of every sale before importing.");}
  catch(err){$("posPreviewPanel").hidden=true;setMessage(err.message||"The CSV could not be validated.",true);}
  finally{b.textContent="Validate & preview CSV";b.disabled=!fileText;}
 });
 $("posAdjustStock").addEventListener("change",async()=>{
  if(!draftSales.length)return;
  try{await validatePreview();setMessage("Preview refreshed using the updated stock setting.");}
  catch(err){setMessage(err.message||"Could not refresh the preview.",true);}
 });
 $("posImportBtn").addEventListener("click",runImport);
 $("posClearPreviewBtn").addEventListener("click",()=>{
  $("posCsvFile").value="";$("posFileName").textContent="No file selected yet.";fileText="";draftSales=[];fatalRows=[];isImported=false;
  $("posPreviewPanel").hidden=true;$("posImportResults").hidden=true;$("posPreviewBtn").disabled=true;setMessage("Preview cleared. Select another CSV to begin.");
 });
 $("posTemplateBtn").addEventListener("click",downloadTemplate);
 $("posProductCsvBtn").addEventListener("click",downloadProductList);
 $("posRecentSearch").addEventListener("input",renderRecent);
 $("posProductSearch").addEventListener("input",renderCatalog);
 $("posRefreshBtn").addEventListener("click",async()=>{
  const b=$("posRefreshBtn");b.disabled=true;
  try{await refresh();toast("POS records refreshed.");}
  catch(err){toast(err.message||"POS data could not be refreshed.","error");}
  finally{b.disabled=false;}
 });
 await refresh();
 window.HFAdminRefresh=refresh;
};
})();
(() => {
"use strict";
window.HFAdminReady.then(async H => {
 if(!H)return;
 const {client,ADMIN_EMAIL,fetchProducts,money,esc,toast,audit}=H, table="admin_business_health_pricing_scenarios";
 const $=id=>document.getElementById(id), core=window.HFBusinessPricingCore;
 if(!core||typeof core.calculate!=="function"){toast("Calculation engine did not load. Refresh this page.","error");return;}
 const numeric=v=>v===null||v===undefined||String(v).trim()===""?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
 const fmt=v=>v===null||v===undefined||!Number.isFinite(Number(v))?"—":money(Number(v));
 const pct=v=>v===null||v===undefined||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("en-BD",{minimumFractionDigits:1,maximumFractionDigits:2})+"%";
 const nodes=()=>[...document.querySelectorAll("[data-field]")];
 let products=[],selectedProduct=null,activeScenarioId=null,lastResult=null,busy=false;
 const collect=()=>{
  const out={};
  nodes().forEach(el=>{out[el.dataset.field]=el.tagName==="SELECT"?el.value:numeric(el.value);});
  out.vat_mode=out.vat_mode||"inclusive";out.discount_mode=out.discount_mode||"none";out.target_mode=out.target_mode||"margin";
  return out;
 };
 const set=(key,value)=>{const el=document.querySelector('[data-field="'+key+'"]');if(el)el.value=value===null||value===undefined?"":String(value);};
 const clear=()=>nodes().forEach(el=>el.value=el.tagName==="SELECT"?(el.dataset.field==="vat_mode"?"inclusive":el.dataset.field==="target_mode"?"margin":"none"):"");
 function comparison(result){
  if(!result.compare.length)return "<p>Enter alternative prices to compare profit and margin.</p>";
  return "<table><thead><tr><th>Test</th><th>List price</th><th>Profit</th><th>Margin</th></tr></thead><tbody>"+
   result.compare.map(x=>"<tr><td>"+esc(x.label)+"</td><td>"+fmt(x.listPrice)+"</td><td><strong>"+fmt(x.profit)+"</strong></td><td>"+pct(x.margin)+"</td></tr>").join("")+"</tbody></table>";
 }
 function render(){
  const input=collect(),result=core.calculate(input);lastResult=result;
  $("bhpSuggestedPrice").textContent=result.suggested?fmt(result.suggested.list):"—";
  $("bhpSuggestedNote").textContent=result.suggested?
   "After discount: "+fmt(result.suggested.net)+" product price. Tax is shown separately according to the selected treatment.":
   (numeric(input.target_value)===null||numeric(input.target_value)===0?"Add a target margin, markup or fixed profit to get a suggested price.":"No feasible price with the current cost and fee assumptions.");
  $("bhpBreakEven").textContent=fmt(result.breakEvenListPrice);
  $("bhpProfit").textContent=result.manual?fmt(result.manual.profit):"Add selling price";
  $("bhpMargin").textContent=result.manual?pct(result.manual.margin):"—";
  $("bhpCustomerPayable").textContent=result.manual?fmt(result.manual.customerPayable):"—";
  const hasInput=result.hasCostInput||numeric(input.selling_price)!==null||result.compare.length>0;
  $("bhpQuality").textContent=hasInput?"Entered values only":"Waiting for inputs";
  $("bhpQuality").className="hf-bhp-quality"+(hasInput?" is-partial":"");
  const rows=[
   ["Purchase cost / saleable unit",result.unitPurchase],["Sourcing & receiving / unit",result.sourcePerUnit],
   ["Other batch cost / unit",result.otherBatchPerUnit],["Packaging, label & preparation",result.prepCost],
   ["Delivery, handling, ads & return reserve",result.fulfilment],["Allocated monthly overhead",result.overhead],
   ["Entered cost before percentage fees",result.fixedCost]
  ];
  if(result.manual){rows.push(["VAT / sales tax",result.manual.vat],["Payment & marketplace fees",result.manual.fees],["Estimated profit after entered costs",result.manual.profit]);}
  $("bhpBreakdown").innerHTML=rows.map(r=>'<div class="hf-bhp-breakdown-row"><span>'+esc(r[0])+'</span><strong>'+fmt(r[1])+'</strong></div>').join("");
  const notes=[];
  if(result.missing.length)notes.push("Not entered: "+result.missing.join(", ")+".");
  if(result.warnings.length)notes.push(...result.warnings);
  if(!result.hasCompleteCostBasis)notes.push("Purchase price or batch purchase amount is missing. This is not a complete landed-cost estimate.");
  if(!result.manual)notes.push("Enter a current / planned list price to calculate profit at that price.");
  notes.push("Blank inputs are excluded, not confirmed zero costs. Estimated profit is before business-level income tax.");
  $("bhpWarnings").textContent=notes.join(" ");
  $("bhpWarnings").className="hf-bhp-warnings"+(notes.length>2?" is-alert":"");
  $("bhpComparison").innerHTML=comparison(result);
  const usable=Boolean(selectedProduct&&result.suggested&&Number(result.suggested.list)>0&&Number.isFinite(Number(result.suggested.list)));
  $("bhpApplyPrice").disabled=!usable||busy;
  $("bhpApplyPrice").textContent=selectedProduct?"Review suggested price for this product":"Select a product to apply a price";
 }
 function productLabel(p){return p.name+" · "+(p.sku||"No SKU")+" · "+fmt(Number(p.price||0));}
 function renderProducts(){
  const select=$("bhpProductPicker"),keep=select.value;
  select.innerHTML='<option value="">New / unlisted product</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(productLabel(p))+"</option>").join("");
  if(keep&&products.some(p=>p.id===keep))select.value=keep;
 }
 async function loadProducts(){
  $("bhpSourceStatus").textContent="Loading products and saved cost settings…";
  try{products=await fetchProducts();renderProducts();$("bhpSourceStatus").textContent=products.length+" products loaded. You can also calculate an unlisted product.";}
  catch(error){$("bhpSourceStatus").textContent="Products unavailable; manual calculations remain enabled.";toast(error.message||"Could not load products.","error");}
 }
 function chooseProduct(id,prefill=true){
  selectedProduct=products.find(p=>p.id===id)||null;
  if(!selectedProduct){$("bhpProductName").value="";render();return;}
  $("bhpProductName").value=selectedProduct.name||"";
  if(!$("bhpScenarioTitle").value.trim())$("bhpScenarioTitle").value=(selectedProduct.name||"Product")+" pricing";
  if(prefill){set("selling_price",selectedProduct.price);set("purchase_unit_cost",selectedProduct.cost_price);set("packaging_unit_cost",selectedProduct.cost_updated_at?selectedProduct.packaging_cost:null);}
  render();
 }
 async function loadScenarios(){
  $("bhpSavedScenarios").innerHTML='<div class="hf-bhp-saved-empty">Loading saved calculations…</div>';
  try{
   const {data,error}=await client.from(table).select("id,title,product_name,product_id,updated_at,created_at").order("updated_at",{ascending:false}).limit(50);
   if(error)throw error;
   if(!data?.length){$("bhpSavedScenarios").innerHTML='<div class="hf-bhp-saved-empty">No saved calculations yet. Save one to revisit it later.</div>';return;}
   $("bhpSavedScenarios").innerHTML=data.map(r=>'<div class="hf-bhp-saved-row"><div class="hf-bhp-saved-copy"><strong>'+esc(r.title)+'</strong><small>'+esc(r.product_name||"Unlinked product")+" · "+esc(new Date(r.updated_at||r.created_at).toLocaleDateString("en-BD"))+'</small></div><button type="button" data-load-scenario="'+esc(r.id)+'">Open</button><button type="button" data-delete-scenario="'+esc(r.id)+'">Delete</button></div>').join("");
  }catch(error){
   $("bhpSavedScenarios").innerHTML='<div class="hf-bhp-saved-empty">Saved calculations are unavailable. The calculator remains usable; verify admin access and database connection.</div>';
   $("bhpSourceStatus").textContent="Calculation works; saved-scenario storage could not be reached.";
   console.warn("Scenario read failed",error);
  }
 }
 async function saveScenario(){
  const title=String($("bhpScenarioTitle").value||"").trim();
  if(title.length<2){toast("Enter a scenario title before saving.","error");$("bhpScenarioTitle").focus();return;}
  const input=collect(),result=core.calculate(input),productName=String($("bhpProductName").value||selectedProduct?.name||"").trim().slice(0,200)||null;
  const button=$("bhpSaveScenario");button.disabled=true;button.textContent="Saving…";
  try{
   const row={title,product_id:selectedProduct?.id||null,product_name:productName,inputs:input,result,updated_by:ADMIN_EMAIL,updated_at:new Date().toISOString()};
   const response=activeScenarioId?
    await client.from(table).update(row).eq("id",activeScenarioId).select("id").single():
    await client.from(table).insert({...row,created_by:ADMIN_EMAIL}).select("id").single();
   if(response.error)throw response.error;
   activeScenarioId=response.data.id;toast("Pricing calculation saved.","success");await loadScenarios();
  }catch(error){console.error(error);toast(error.message||"Could not save the calculation.","error");}
  finally{button.disabled=false;button.textContent="Save calculation";}
 }
 async function openScenario(id){
  try{
   const {data,error}=await client.from(table).select("id,title,product_id,product_name,inputs").eq("id",id).single();
   if(error)throw error;
   clear();Object.entries(data.inputs||{}).forEach(([k,v])=>set(k,v));
   activeScenarioId=data.id;$("bhpScenarioTitle").value=data.title||"";$("bhpProductName").value=data.product_name||"";
   selectedProduct=products.find(p=>p.id===data.product_id)||null;$("bhpProductPicker").value=selectedProduct?.id||"";
   render();toast("Saved calculation opened.","success");
  }catch(error){toast(error.message||"Could not open calculation.","error");}
 }
 async function deleteScenario(id){
  const buttons=[...$("bhpSavedScenarios").querySelectorAll("[data-delete-scenario]")],button=buttons.find(b=>b.dataset.deleteScenario===id);
  if(button)button.disabled=true;
  try{
   const {error}=await client.from(table).delete().eq("id",id);if(error)throw error;
   if(activeScenarioId===id)activeScenarioId=null;
   toast("Saved calculation deleted.","success");await loadScenarios();
  }catch(error){if(button)button.disabled=false;toast(error.message||"Could not delete calculation.","error");}
 }
 function newCalculation(){
  activeScenarioId=null;selectedProduct=null;$("bhpProductPicker").value="";$("bhpProductName").value="";$("bhpScenarioTitle").value="";clear();render();toast("New calculation ready.","success");
 }
 function reviewPrice(){
  if(!selectedProduct||!lastResult?.suggested)return;
  $("bhpApplySummary").innerHTML="<strong>"+esc(selectedProduct.name)+"</strong><br>Current website price: "+fmt(Number(selectedProduct.price||0))+"<br>Suggested website price: <strong>"+fmt(lastResult.suggested.list)+"</strong><br><span>Only the product price will change. Cost settings and saved scenarios stay as they are.</span>";
  $("bhpApplyDialog").showModal();
 }
 async function applyPrice(){
  if(busy||!selectedProduct||!lastResult?.suggested)return;
  const price=Number(lastResult.suggested.list);
  if(!Number.isFinite(price)||price<=0){toast("Suggested price is not valid.","error");return;}
  const productId=selectedProduct.id,oldPrice=Number(selectedProduct.price||0);
  busy=true;$("bhpApplyConfirm").disabled=true;$("bhpApplyConfirm").textContent="Updating…";render();
  try{
   const {data,error}=await client.from("products").update({price}).eq("id",productId).select("id,name,price").single();
   if(error)throw error;
   products=products.map(p=>p.id===data.id?{...p,price:Number(data.price)}:p);
   selectedProduct=products.find(p=>p.id===data.id)||selectedProduct;renderProducts();$("bhpProductPicker").value=data.id;
   set("selling_price",data.price);$("bhpApplyDialog").close();
   await audit("update","product",data.id,"Product price updated from Business Health pricing calculator.",{old_price:oldPrice,new_price:Number(data.price),source:"business-health-pricing"});
   toast("Website product price updated.","success");
  }catch(error){console.error("Price update failed",error);toast(error.message||"Price update failed. Confirm admin MFA access.","error");}
  finally{busy=false;$("bhpApplyConfirm").disabled=false;$("bhpApplyConfirm").textContent="Confirm price update";render();}
 }
 document.addEventListener("input",e=>{if(e.target?.matches("[data-field]"))render();});
 document.addEventListener("change",e=>{if(e.target?.matches("[data-field]"))render();});
 $("bhpProductPicker").addEventListener("change",e=>chooseProduct(e.target.value,true));
 $("bhpProductName").addEventListener("input",()=>{if(!$("bhpScenarioTitle").value.trim())$("bhpScenarioTitle").value=$("bhpProductName").value.trim()+" pricing";});
 $("bhpReloadProducts").addEventListener("click",async()=>{await loadProducts();if(selectedProduct)chooseProduct(selectedProduct.id,false);});
 $("bhpSaveScenario").addEventListener("click",saveScenario);$("bhpNewScenario").addEventListener("click",newCalculation);
 $("bhpRefreshScenarios").addEventListener("click",loadScenarios);$("bhpApplyPrice").addEventListener("click",reviewPrice);
 $("bhpApplyConfirm").addEventListener("click",applyPrice);$("bhpApplyClose").addEventListener("click",()=>$("bhpApplyDialog").close());
 $("bhpApplyCancel").addEventListener("click",()=>$("bhpApplyDialog").close());
 $("bhpSavedScenarios").addEventListener("click",e=>{
  const open=e.target.closest("[data-load-scenario]"),remove=e.target.closest("[data-delete-scenario]");
  if(open)openScenario(open.dataset.loadScenario);if(remove)deleteScenario(remove.dataset.deleteScenario);
 });
 await loadProducts();await loadScenarios();render();
});
})();
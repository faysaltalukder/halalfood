(() => {
"use strict";
const $=id=>document.getElementById(id);
const customerTierClass=color=>"hf-tier-"+(["blue","teal","violet","gold","amber","rose","slate"].includes(color)?color:"slate");
window.HFCustomersInit=async function(){
 const H=window.HFAdmin;if(!H)throw new Error("Admin session is not ready.");
 const {client,esc,money,dateTime,dateOnly,makeStatus,makeEmpty,toast,ADMIN_EMAIL,audit}=H;
 const pageSize=25;let rows=[],page=0,total=0,segment="all",friendTag=null,rules=[];
 const viewColumns="id,name,phone,email,address,auth_user_id,created_at,updated_at,is_blocked,blocked_at,blocked_by,blocked_reason,archived_at,anonymized_at,total_orders,delivered_orders,cancelled_orders,non_cancelled_orders,recorded_order_value,average_recorded_order_value,first_order_at,last_order_at,last_order_status,qualifying_orders,segment_code,segment_name,segment_color,manual_tags,tag_codes,has_friend_tag,ip_masked,ip_country,signal_created_at";
 const tier=(name,color)=>'<span class="hf-customer-tier '+customerTierClass(color)+'">'+esc(name||"Unclassified")+'</span>';
 const count=async(field,value)=>{let q=client.from("customer_directory").select("id",{count:"exact",head:true}).is("archived_at",null);if(field)q=q.eq(field,value);const {count,error}=await q;if(error)throw error;return Number(count||0);};
 async function summary(){
  const values=await Promise.all([count(),count("segment_code","new"),count("segment_code","regular"),count("segment_code","special"),count("segment_code","vip"),count("has_friend_tag",true),count("is_blocked",true)]);
  ["customerCount","customerNewCount","customerRegularCount","customerSpecialCount","customerVipCount","customerFriendCount","customerBlockedCount"].forEach((id,i)=>$(id).textContent=values[i].toLocaleString("en-BD"));
  const ruleMap=new Map(rules.map(r=>[r.code,r]));
  ["new","regular","special","vip"].forEach(code=>{const r=ruleMap.get(code);const button=document.querySelector('[data-customer-segment="'+code+'"]');if(!button||!r)return;button.querySelector("span").textContent=r.name;button.querySelector("small").textContent=r.max_orders===null||r.max_orders===undefined?r.min_orders+"+ qualifying orders":r.min_orders+"–"+r.max_orders+" qualifying orders";});
 }
 async function refresh(){
  $("customersTableBody").innerHTML='<tr><td colspan="7" class="hf-loading">Loading customer information…</td></tr>';
  const ruleResult=await client.from("customer_segment_rules").select("code,name,min_orders,max_orders,is_active").order("sort_order");if(ruleResult.error)throw ruleResult.error;rules=ruleResult.data||[];
  const tierSelect=$("customerTierFilter"),selectedTier=tierSelect.value;
  tierSelect.innerHTML='<option value="">All customer types</option>'+rules.filter(r=>r.is_active).map(r=>'<option value="'+esc(r.code)+'">'+esc(r.name)+'</option>').join("");
  if(rules.some(r=>r.code===selectedTier&&r.is_active))tierSelect.value=selectedTier;
  await summary();
  const status=$("customerStatusFilter").value;
  let q=client.from("customer_directory").select(viewColumns,{count:"exact"}).order("last_order_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).order("id",{ascending:true});
  if(status==="active")q=q.is("archived_at",null);else if(status==="archived")q=q.not("archived_at","is",null);
  else if(status==="blocked")q=q.is("archived_at",null).eq("is_blocked",true);
  if($("customerTierFilter").value)q=q.eq("segment_code",$("customerTierFilter").value);
  if(segment==="blocked")q=q.eq("is_blocked",true);else if(["new","regular","special","vip"].includes(segment))q=q.eq("segment_code",segment);else if(segment==="friend")q=q.eq("has_friend_tag",true);
  const term=String($("customerSearch").value||$("globalSearch").value||"").trim().replace(/[%_*(),]/g," ").replace(/\s+/g," ").slice(0,80);
  if(term){
   if(/^[0-9a-f-]{36}$/i.test(term))q=q.eq("id",term);
   else{
    const [ordersByNumber]=await Promise.all([client.from("orders").select("customer_id").ilike("order_number","%"+term+"%").not("customer_id","is",null).limit(500)]);
    if(ordersByNumber.error)throw ordersByNumber.error;
    const ids=[...new Set((ordersByNumber.data||[]).map(o=>o.customer_id).filter(Boolean))];
    const clauses=["name.ilike.%"+term+"%","phone.ilike.%"+term+"%","email.ilike.%"+term+"%","address.ilike.%"+term+"%"];
    if(ids.length)clauses.push("id.in.("+ids.join(",")+")");
    q=q.or(clauses.join(","));
   }
  }
  const result=await q.range(page*pageSize,(page+1)*pageSize-1);if(result.error)throw result.error;rows=result.data||[];total=Number(result.count||0);render();
 }
 function render(){
  $("customerResultCount").textContent=total.toLocaleString("en-BD")+" customers";
  $("customerPagerInfo").textContent=total?"Showing "+(page*pageSize+1)+"–"+Math.min((page+1)*pageSize,total)+" of "+total:"No records";
  $("customerPrevPage").disabled=page<=0;$("customerNextPage").disabled=(page+1)*pageSize>=total;
  document.querySelectorAll("[data-customer-segment]").forEach(b=>b.classList.toggle("is-selected",b.dataset.customerSegment===segment));
  $("customersTableBody").innerHTML=rows.length?rows.map(c=>{
   const initial=Array.from(String(c.name||"C").trim())[0]?.toLocaleUpperCase("en-US")||"C",tags=Array.isArray(c.manual_tags)?c.manual_tags:[];
   const status=c.anonymized_at?'<span class="hf-customer-status">Anonymized</span>':c.is_blocked?'<span class="hf-customer-status is-blocked">Blocked</span>':c.archived_at?'<span class="hf-customer-status">Archived</span>':'<span class="hf-customer-status">Active</span>';
   return '<tr><td><div class="hf-customer-person"><span class="hf-customer-avatar">'+esc(initial)+'</span><span><strong>'+esc(c.name||"Name not provided")+'</strong><small>HF · '+esc(String(c.id).slice(0,8))+(tags.some(t=>t.code==="friend")?" · Friend":"")+'</small></span></div></td>'+
    '<td><div class="hf-customer-contact">'+(c.phone?'<span>'+esc(c.phone)+'</span>':'<span>Phone not available</span>')+'<small>'+esc(c.email||"Email not provided")+'</small></div></td>'+
    '<td><div class="hf-customer-location">'+esc(c.address||"Address not available")+'<small>'+esc(c.ip_country||"IP country unavailable")+'</small></div></td>'+
    '<td><span class="hf-customer-order-count">'+Number(c.total_orders||0).toLocaleString("en-BD")+'</span><small>'+Number(c.delivered_orders||0).toLocaleString("en-BD")+' delivered</small></td>'+
    '<td>'+tier(c.segment_name,c.segment_color)+(tags.some(t=>t.code==="friend")?'<small>'+tier("Friend","rose")+'</small>':"")+'</td><td>'+status+'</td>'+
    '<td><div class="hf-customer-actions"><button class="hf-button hf-button-secondary hf-button-small" type="button" data-customer-view="'+esc(c.id)+'">View</button>'+(c.is_blocked?'<button class="hf-button hf-button-secondary hf-button-small" type="button" data-customer-action="unblock" data-customer-id="'+esc(c.id)+'">Unblock</button>':'<button class="hf-button hf-button-secondary hf-button-small" type="button" data-customer-action="block" data-customer-id="'+esc(c.id)+'">Block</button>')+'</div></td></tr>';
  }).join(""):'<tr><td colspan="7">'+makeEmpty("No customers found","Try another search or choose a different customer filter.")+'</td></tr>';
 }
 async function ordersFor(id){const {data,error}=await client.from("orders").select("id,order_number,subtotal,delivery_charge,total,status,ordered_at,order_items(product_name,quantity,unit)").eq("customer_id",id).order("ordered_at",{ascending:false}).order("id",{ascending:true}).limit(100);if(error)throw error;return data||[];}
 async function openProfile(id){
  const c=rows.find(x=>x.id===id);if(!c)return;
  $("customerDetailTitle").textContent=c.name||"Customer";$("customerDetailSub").textContent="Customer ID · "+c.id;$("customerDetailContent").innerHTML='<p class="hf-loading">Loading profile and order history…</p>';$("customerDialog").showModal();
  const orderRows=await ordersFor(id),tags=Array.isArray(c.manual_tags)?c.manual_tags:[],friend=tags.some(t=>t.code==="friend");
  const cells=[["Phone",c.phone||"Not provided"],["Email",c.email||"Not provided"],["Location / delivery address",c.address||"Not recorded"],["First order",dateTime(c.first_order_at)],["Last order",dateTime(c.last_order_at)],["Last order status",c.last_order_status||"No order"],["Total orders",c.total_orders],["Delivered orders",c.delivered_orders],["Cancelled orders",c.cancelled_orders],["Recorded order value",money(c.recorded_order_value)],["Average recorded order",money(c.average_recorded_order_value)],["Masked IP / Country",[c.ip_masked,c.ip_country].filter(Boolean).join(" · ")||"No security IP record"]];
  const orderHtml=orderRows.length?orderRows.map(o=>{const items=(o.order_items||[]).map(i=>(i.product_name||"Product")+" × "+i.quantity+" "+(i.unit||"")).join(", ");return '<tr><td><strong>'+esc(o.order_number||String(o.id).slice(0,8))+'</strong><small>'+esc(items||"No item details")+'</small></td><td>'+dateOnly(o.ordered_at)+'</td><td>'+money(o.total)+'</td><td>'+makeStatus(o.status)+'</td></tr>';}).join(""):'<tr><td colspan="4">No linked orders found.</td></tr>';
  $("customerDetailContent").innerHTML='<div class="hf-customer-detail-grid">'+cells.map(([k,v])=>'<div class="hf-customer-detail-item"><small>'+esc(k)+'</small><strong>'+esc(String(v??"—"))+'</strong></div>').join("")+'</div>'+
   '<div class="hf-customer-detail-section"><h3>Customer classification</h3><div class="hf-customer-tag-list">'+tier(c.segment_name,c.segment_color)+(tags.map(t=>tier(t.name,t.badge_color)).join("")||'<span class="hf-customer-status">No manual tags</span>')+'</div>'+
   '<div class="hf-customer-detail-actions"><button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-tag="'+(friend?"remove":"add")+'" data-customer-id="'+esc(id)+'">'+(friend?"Remove Friend tag":"＋ Add Friend tag")+'</button>'+
   (c.is_blocked?'<button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-action="unblock" data-customer-id="'+esc(id)+'">Unblock customer</button>':'<button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-action="block" data-customer-id="'+esc(id)+'">Block customer</button>')+
   (c.archived_at?'<button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-action="restore" data-customer-id="'+esc(id)+'">Restore from archive</button>':'<button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-action="archive" data-customer-id="'+esc(id)+'">Archive</button>')+
   (!c.anonymized_at?'<button type="button" class="hf-button hf-button-secondary hf-button-small" data-customer-action="anonymize" data-customer-id="'+esc(id)+'">Anonymize customer data</button>':"")+'</div></div>'+
   '<div class="hf-customer-detail-section"><h3>Order history ('+Number(c.total_orders||0)+')</h3><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Order / products</th><th>Date</th><th>Recorded total</th><th>Status</th></tr></thead><tbody>'+orderHtml+'</tbody></table></div>'+(orderRows.length>=100?'<p class="hf-data-note">Showing the latest 100 orders.</p>':"")+'<p class="hf-data-note">Recorded order totals are not verified payments. IP is masked and shown only when captured by checkout security. Delivery address is customer-provided.</p></div>';
 }
 async function action(id,kind){
  const c=rows.find(x=>x.id===id);if(!c)return;let reason="";
  if(kind==="block"){reason=window.prompt("Why should this customer be blocked?","Repeated unverified or fraudulent orders.")||"";if(!reason.trim())return;if(!confirm("Block this customer? New order submissions will be rejected by the server."))return;}
  else if(kind==="unblock"&&!confirm("Unblock this customer and allow future orders again?"))return;
  else if(kind==="archive"&&!confirm("Archive this customer? Their order history stays. A new order can restore them."))return;
  else if(kind==="restore"&&!confirm("Restore this customer to the active directory?"))return;
  else if(kind==="anonymize"){if(!confirm("Anonymize linked customer, order and checkout contact details? This cannot be undone. Order totals and order history remain. Supabase sign-in and external messaging records are not deleted."))return;if(!confirm("Final confirmation: permanently remove the linked personal details now?"))return;}
  const {data,error}=await client.rpc("admin_customer_action",{p_customer_id:id,p_action:kind,p_reason:reason||null});if(error)throw error;if(data?.success!==true)throw new Error("The customer action was not confirmed.");
  toast(kind==="block"?"Customer blocked. Future online orders are restricted.":kind==="unblock"?"Customer unblocked.":kind==="archive"?"Customer archived.":kind==="restore"?"Customer restored.":"Customer details anonymized; order history retained.");
  $("customerDialog").close();await refresh();
 }
 async function toggleFriend(id,mode){
  if(!friendTag)throw new Error("Friend tag is not configured.");
  const result=mode==="add"?await client.from("customer_tag_assignments").upsert({customer_id:id,tag_id:friendTag.id,assigned_by:ADMIN_EMAIL},{onConflict:"customer_id,tag_id"}):await client.from("customer_tag_assignments").delete().eq("customer_id",id).eq("tag_id",friendTag.id);
  if(result.error)throw result.error;await audit("customer_friend_tag_"+mode,"customer",id,"Friend customer tag "+mode+"ed");toast(mode==="add"?"Friend tag added.":"Friend tag removed.");await refresh();
  const c=rows.find(x=>x.id===id);if(c)await openProfile(id);
 }
 $("customersTableBody").addEventListener("click",async e=>{try{const v=e.target.closest("[data-customer-view]"),a=e.target.closest("[data-customer-action]");if(v)await openProfile(v.dataset.customerView);else if(a)await action(a.dataset.customerId,a.dataset.customerAction);}catch(err){toast(err.message||"Customer action failed.","error");}});
 $("customerDetailContent").addEventListener("click",async e=>{try{const a=e.target.closest("[data-customer-action]"),t=e.target.closest("[data-customer-tag]");if(a)await action(a.dataset.customerId,a.dataset.customerAction);else if(t)await toggleFriend(t.dataset.customerId,t.dataset.customerTag);}catch(err){toast(err.message||"Customer action failed.","error");}});
 $("closeCustomerDialog").addEventListener("click",()=>$("customerDialog").close());$("closeCustomerDialogBottom").addEventListener("click",()=>$("customerDialog").close());
 let searchTimer;const searchRefresh=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=0;refresh().catch(e=>toast(e.message||"Could not refresh customers.","error"));},250);};
 $("customerSearch").addEventListener("input",searchRefresh);$("globalSearch")?.addEventListener("input",searchRefresh);
 $("customerStatusFilter").addEventListener("change",()=>{page=0;refresh().catch(e=>toast(e.message||"Could not filter customers.","error"));});
 $("customerTierFilter").addEventListener("change",()=>{segment="all";page=0;refresh().catch(e=>toast(e.message||"Could not filter customer tiers.","error"));});
 $("customerClearFilters").addEventListener("click",()=>{$("customerSearch").value="";$("customerStatusFilter").value="active";$("customerTierFilter").value="";segment="all";page=0;refresh().catch(e=>toast(e.message||"Could not refresh customers.","error"));});
 $("customerPrevPage").addEventListener("click",()=>{if(page>0){page--;refresh().catch(e=>toast(e.message||"Could not load customers.","error"));}});
 $("customerNextPage").addEventListener("click",()=>{if((page+1)*pageSize<total){page++;refresh().catch(e=>toast(e.message||"Could not load customers.","error"));}});
 document.querySelectorAll("[data-customer-segment]").forEach(b=>b.addEventListener("click",()=>{$("customerTierFilter").value="";segment=b.dataset.customerSegment||"all";page=0;refresh().catch(e=>toast(e.message||"Could not filter customers.","error"));}));
 const tagResult=await client.from("customer_tags").select("id,code").eq("code","friend").maybeSingle();if(tagResult.error)throw tagResult.error;friendTag=tagResult.data;
 const manualRefresh=document.querySelector("[data-refresh-page]");manualRefresh?.addEventListener("click",()=>refresh().then(()=>toast("Customer information refreshed.")).catch(e=>toast(e.message||"Refresh failed.","error")));
 await refresh();
};
window.HFCustomerSettingsInit=async function(){
 const H=window.HFAdmin;if(!H)throw new Error("Admin session is not ready.");
 const {client,esc,toast,slugify,ADMIN_EMAIL,audit,signedQuery}=H;
 let rules=[],settings=null;const builtins=["new","regular","special","vip"],colors=["blue","teal","violet","gold","amber","rose","slate"];
 function render(){
  $("customerRulesList").innerHTML=rules.length?[...rules].sort((a,b)=>a.min_orders-b.min_orders).map(r=>'<div class="hf-customer-rule-row" data-rule-id="'+esc(r.id)+'"><div class="hf-customer-rule-name"><input class="hf-input" data-rule-name maxlength="60" value="'+esc(r.name)+'" aria-label="Category name"><small>'+esc(r.code)+(builtins.includes(r.code)?" · default tier":" · custom tier")+'</small></div><input class="hf-input" data-rule-min type="number" min="0" step="1" value="'+Number(r.min_orders)+'" aria-label="Minimum qualifying orders"><input class="hf-input" data-rule-max type="number" min="0" step="1" value="'+(r.max_orders===null?"":Number(r.max_orders))+'" placeholder="Unlimited" aria-label="Maximum qualifying orders"><label class="hf-customer-rule-enabled"><input data-rule-enabled type="checkbox" '+(r.is_active?"checked":"")+' aria-label="Enable category"></label></div>').join(""):'<p class="hf-data-note">No customer tiers configured.</p>';
 }
 async function refresh(){
  const [a,b]=await Promise.all([signedQuery(client.from("customer_segment_rules").select("id,code,name,min_orders,max_orders,badge_color,sort_order,is_active").order("sort_order")),signedQuery(client.from("customer_management_settings").select("id,classification_basis").eq("id",1).single())]);
  rules=a;settings=b;$("customerClassificationBasis").value=settings.classification_basis;render();
 }
 function collect(){
  return [...document.querySelectorAll(".hf-customer-rule-row")].map((row,i)=>{
   const previous=rules.find(r=>r.id===row.dataset.ruleId),name=row.querySelector("[data-rule-name]").value.trim(),min=Number(row.querySelector("[data-rule-min]").value),rawMax=row.querySelector("[data-rule-max]").value.trim(),max=rawMax===""?null:Number(rawMax);
   if(!previous||name.length<2||!Number.isInteger(min)||min<0||(max!==null&&(!Number.isInteger(max)||max<min)))throw new Error("Check category names and limits. Maximum must be empty or at least the minimum.");
   return {...previous,name,min_orders:min,max_orders:max,is_active:row.querySelector("[data-rule-enabled]").checked,sort_order:(i+1)*10,updated_at:new Date().toISOString()};
  });
 }
 function checkRanges(next){
  const active=next.filter(r=>r.is_active).sort((a,b)=>a.min_orders-b.min_orders);
  if(!active.length)throw new Error("At least one customer category must stay enabled.");
  for(let i=0;i<active.length-1;i++)if(active[i].max_orders===null||active[i].max_orders>=active[i+1].min_orders)throw new Error("Enabled customer category ranges overlap. Adjust the minimum or maximum values.");
 }
 async function save(){
  const next=collect();checkRanges(next);const basis=$("customerClassificationBasis").value;
  const {error:e1}=await client.from("customer_segment_rules").upsert(next,{onConflict:"id"});if(e1)throw e1;
  const {error:e2}=await client.from("customer_management_settings").upsert({id:1,classification_basis:basis,updated_at:new Date().toISOString(),updated_by:ADMIN_EMAIL},{onConflict:"id"});if(e2)throw e2;
  await audit("customer_segment_rules_updated","customer_segment_rules",null,"Customer classification rules updated",{classification_basis:basis,rule_count:next.length});
  toast("Customer settings saved. Updated tiers are reflected in the directory.");await refresh();
 }
 $("addCustomerRuleForm").addEventListener("submit",e=>{
  e.preventDefault();const name=$("newCustomerRuleName").value.trim(),min=Number($("newCustomerRuleMin").value),raw=$("newCustomerRuleMax").value.trim(),max=raw===""?null:Number(raw);
  if(name.length<2||!Number.isInteger(min)||min<0||(max!==null&&(!Number.isInteger(max)||max<min))){toast("Enter a category name and valid order limits.","error");return;}
  let code=slugify(name).replace(/-/g,"_");if(!/^[a-z]/.test(code))code="tier_"+code;code=code.slice(0,38);
  if(rules.some(r=>r.code===code)){toast("This category already exists.","error");return;}
  rules.push({id:crypto.randomUUID(),code,name,min_orders:min,max_orders:max,badge_color:colors[rules.length%colors.length],sort_order:(rules.length+1)*10,is_active:true,updated_at:new Date().toISOString()});render();
  $("newCustomerRuleName").value="";$("newCustomerRuleMin").value="100";$("newCustomerRuleMax").value="";toast("Category added to the draft. Select Save settings to apply it.");
 });
 $("saveCustomerSettingsBtn").addEventListener("click",async()=>{const b=$("saveCustomerSettingsBtn");b.disabled=true;try{await save();}catch(e){toast(e.message||"Settings could not be saved.","error");}finally{b.disabled=false;}});
 const manualRefresh=document.querySelector("[data-refresh-page]");manualRefresh?.addEventListener("click",()=>refresh().then(()=>toast("Customer settings refreshed.")).catch(e=>toast(e.message||"Refresh failed.","error")));
 await refresh();
};
})();
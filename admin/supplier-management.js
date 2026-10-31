(() => {
"use strict";
async function HFSupplierInit(mode) {
  const H=window.HFAdmin;
  if(!H) throw new Error("Secure admin session is not ready.");
  const {client,ADMIN_EMAIL,esc,money,dateOnly,toast,audit,signedQuery,downloadFile,csvText,makeStatus,makeEmpty}=H;
  const $=id=>document.getElementById(id);
  const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const round=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  const key=()=>{if(window.crypto?.randomUUID)return window.crypto.randomUUID();return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16);});};
  const fmtDate=v=>v?String(v).slice(0,10):"—";
  const label=v=>String(v||"—").replace(/_/g," ");
  const statusPill=(v)=>{
    const raw=String(v||"").toLowerCase();
    const cls=["confirmed","received","active","paid"].includes(raw)?"good":["draft","ordered","partially_received","part_paid","overdue"].includes(raw)?"warn":["void","cancelled","inactive","rejected"].includes(raw)?"bad":"";
    return '<span class="hf-inline-status '+cls+'">'+esc(label(raw))+'</span>';
  };
  const options=(el,items,first,selected="")=>{
    if(!el)return;
    el.innerHTML='<option value="">'+esc(first)+'</option>'+items.map(x=>'<option value="'+esc(x.value)+'" '+(String(x.value)===String(selected)?"selected":"")+'>'+esc(x.label)+'</option>').join("");
  };
  const errorText=(id,message)=>{const el=$(id);if(el)el.textContent=message||"";};
  const submitting=(button,on)=>{if(button)button.disabled=!!on;};
  const rpc=async(name,args)=>{
    const {data,error}=await client.rpc(name,args);
    if(error)throw error;
    return data;
  };
  const exportRows=(filename,rows)=>{
    downloadFile(filename,csvText(rows),"text/csv;charset=utf-8");
  };
  const supplierName=id=>suppliers.find(s=>s.id===id)?.name||"Unknown supplier";
  let suppliers=[],balances=[],products=[],productCosts=[],purchaseOrders=[],bills=[],receipts=[],payments=[],allocations=[],credits=[],ledger=[];
  let purchaseLines=[];
  let currentMode=mode;
  const balanceMap=()=>new Map(balances.map(x=>[x.supplier_id,x]));
  const poItems=po=>po.admin_purchase_order_items||[];
  const allocatedToBill=billId=>{
    const paid=allocations.filter(a=>a.supplier_bill_id===billId).reduce((sum,a)=>{
      const p=payments.find(x=>x.id===a.payment_id);
      return sum+(p?.status==="confirmed"?n(a.allocated_amount):0);
    },0);
    const credit=credits.filter(c=>c.supplier_bill_id===billId&&c.status==="confirmed").reduce((sum,c)=>sum+n(c.amount),0);
    return {paid:round(paid),credit:round(credit)};
  };
  const billDue=b=>{
    if(b.status!=="confirmed")return 0;
    const a=allocatedToBill(b.id);
    return round(Math.max(0,n(b.total_amount)-a.paid-a.credit));
  };
  const supplierPayable=supplierId=>bills.filter(b=>b.supplier_id===supplierId&&b.status==="confirmed").reduce((sum,b)=>sum+billDue(b),0);
  const supplierAdvance=supplierId=>{
    const paid=payments.filter(p=>p.supplier_id===supplierId&&p.status==="confirmed").reduce((sum,p)=>sum+n(p.amount),0);
    const allocated=allocations.reduce((sum,a)=>{
      const p=payments.find(x=>x.id===a.payment_id);
      return sum+(p?.supplier_id===supplierId&&p.status==="confirmed"?n(a.allocated_amount):0);
    },0);
    return round(Math.max(0,paid-allocated));
  };
  const loadCommon=async()=>{
    const r=await Promise.all([
      signedQuery(client.from("admin_suppliers").select("*").order("name").limit(2000)),
      signedQuery(client.from("admin_supplier_balances").select("*").order("supplier_name").limit(2000))
    ]);
    [suppliers,balances]=r;
  };
  const loadPurchases=async()=>{
    const r=await Promise.all([
      signedQuery(client.from("products").select("id,name,sku,unit_type,stock_quantity,is_active").eq("is_active",true).order("name").limit(2000)),
      signedQuery(client.from("admin_product_costs").select("product_id,cost_price").limit(5000)),
      signedQuery(client.from("admin_purchase_orders").select("*,admin_purchase_order_items(*)").order("order_date",{ascending:false}).limit(2000)),
      signedQuery(client.from("admin_purchase_receipts").select("*").order("receipt_date",{ascending:false}).limit(2000)),
      signedQuery(client.from("admin_supplier_bills").select("*").order("invoice_date",{ascending:false}).limit(2000)),
      signedQuery(client.from("admin_supplier_payments").select("id,supplier_id,status,amount").limit(5000)),
      signedQuery(client.from("admin_supplier_payment_allocations").select("*").limit(5000)),
      signedQuery(client.from("admin_supplier_credit_notes").select("*").limit(5000))
    ]);
    products=r[0];productCosts=r[1];products=products.map(p=>({...p,cost_price:productCosts.find(c=>c.product_id===p.id)?.cost_price??0}));
    purchaseOrders=r[2];receipts=r[3];bills=r[4];payments=r[5];allocations=r[6];credits=r[7];
  };
  const loadPayments=async()=>{
    const r=await Promise.all([
      signedQuery(client.from("admin_supplier_bills").select("*").order("invoice_date",{ascending:false}).limit(5000)),
      signedQuery(client.from("admin_supplier_payments").select("*").order("payment_date",{ascending:false}).limit(5000)),
      signedQuery(client.from("admin_supplier_payment_allocations").select("*").limit(10000)),
      signedQuery(client.from("admin_supplier_credit_notes").select("*").limit(5000)),
      signedQuery(client.from("admin_supplier_ledger").select("*").order("transaction_date",{ascending:false}).order("recorded_at",{ascending:false}).limit(10000))
    ]);
    [bills,payments,allocations,credits,ledger]=r;
  };
  const renderSupplierKpis=()=>{
    const el=$("supplierActiveCount");if(!el)return;
    el.textContent=suppliers.filter(s=>s.is_active).length.toLocaleString("en-BD");
    $("supplierTotalCount").textContent=suppliers.length.toLocaleString("en-BD");
    $("supplierOutstanding").textContent=money(balances.reduce((sum,b)=>sum+Math.max(0,n(b.outstanding_balance)),0));
    $("supplierAdvances").textContent=money(balances.reduce((sum,b)=>sum+Math.max(0,-n(b.outstanding_balance)),0));
  };
  const renderSuppliers=()=>{
    const body=$("suppliersTableBody");if(!body)return;
    const q=String($("supplierSearch")?.value||"").trim().toLowerCase(),st=$("supplierStatusFilter")?.value||"";
    const bm=balanceMap();
    const rows=suppliers.filter(s=>(!st||(st==="active"?s.is_active:!s.is_active))&&(!q||[s.supplier_code,s.name,s.contact_name,s.phone,s.whatsapp,s.email,s.city,s.district].join(" ").toLowerCase().includes(q)));
    body.innerHTML=rows.length?rows.map(s=>{
      const b=bm.get(s.id)||{};
      return '<tr><td><strong>'+esc(s.name)+'</strong><small>'+esc(s.supplier_code||"")+' · '+esc(s.supplier_type||"")+'</small></td><td>'+esc(s.contact_name||"—")+'<small>'+esc(s.phone||"—")+(s.whatsapp?" · WA "+esc(s.whatsapp):"")+'</small></td><td>'+esc((s.product_categories||[]).join(", ")||"—")+'<small>'+esc([s.city,s.district].filter(Boolean).join(", "))+'</small></td><td>'+money(b.total_bills)+'</td><td>'+money(b.total_paid)+'</td><td><strong>'+money(b.outstanding_balance)+'</strong></td><td>'+statusPill(s.is_active?"active":"inactive")+'</td><td><div class="hf-row-actions"><button class="hf-button hf-button-secondary hf-button-small" data-supplier-view="'+esc(s.id)+'" type="button">View</button><button class="hf-button hf-button-secondary hf-button-small" data-supplier-edit="'+esc(s.id)+'" type="button">Edit</button><button class="hf-button hf-button-secondary hf-button-small" data-supplier-toggle="'+esc(s.id)+'" data-next="'+String(!s.is_active)+'" type="button">'+(s.is_active?"Hold":"Activate")+'</button></div></td></tr>';
    }).join(""):'<tr><td colspan="8">'+makeEmpty("No suppliers found","Add a supplier or adjust your search filters.")+'</td></tr>';
  };
  const resetSupplierForm=()=>{
    $("hfSupplierForm")?.reset();
    $("supplierRecordId").value="";
    $("supplierFormTitle").textContent="Add a supplier";
    $("saveSupplierBtn").textContent="Save supplier";
    $("openingBalanceField").hidden=false;$("openingBalanceDateField").hidden=false;$("openingBalanceNoteField").hidden=false;
    $("supplierOpeningDate").value=today();$("supplierOpeningBalance").value="0";
    errorText("supplierFormError","");
  };
  const setSupplierForm=s=>{
    $("supplierRecordId").value=s.id;
    $("supplierFormTitle").textContent="Edit supplier";
    $("saveSupplierBtn").textContent="Save changes";
    $("supplierName").value=s.name||"";
    $("supplierType").value=s.supplier_type||"wholesaler";
    $("supplierContact").value=s.contact_name||"";
    $("supplierPhone").value=s.phone||"";
    $("supplierWhatsapp").value=s.whatsapp||"";
    $("supplierEmail").value=s.email||"";
    $("supplierCategories").value=(s.product_categories||[]).join(", ");
    $("supplierAddress").value=s.address||"";
    $("supplierCity").value=s.city||"";
    $("supplierDistrict").value=s.district||"";
    $("supplierPostalCode").value=s.postal_code||"";
    $("supplierTerms").value=String(s.payment_terms_days||0);
    $("supplierPreferredMethod").value=s.preferred_payment_method||"cash";
    $("supplierTaxId").value=s.tax_id||"";
    $("supplierBankName").value=s.bank_name||"";
    $("supplierBankAccountName").value=s.bank_account_name||"";
    $("supplierBankAccountNumber").value=s.bank_account_number||"";
    $("supplierNotes").value=s.notes||"";
    $("openingBalanceField").hidden=true;$("openingBalanceDateField").hidden=true;$("openingBalanceNoteField").hidden=true;
    $("supplierFormSection").scrollIntoView({behavior:"smooth",block:"start"});
  };
  const supplierPayload=()=>({
    name:$("supplierName").value.trim(),
    supplier_type:$("supplierType").value,
    contact_name:$("supplierContact").value.trim(),
    phone:$("supplierPhone").value.trim(),
    whatsapp:$("supplierWhatsapp").value.trim(),
    email:$("supplierEmail").value.trim(),
    product_categories:$("supplierCategories").value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,30),
    address:$("supplierAddress").value.trim(),
    city:$("supplierCity").value.trim(),
    district:$("supplierDistrict").value.trim(),
    postal_code:$("supplierPostalCode").value.trim(),
    payment_terms_days:Number($("supplierTerms").value||0),
    preferred_payment_method:$("supplierPreferredMethod").value,
    tax_id:$("supplierTaxId").value.trim(),
    bank_name:$("supplierBankName").value.trim(),
    bank_account_name:$("supplierBankAccountName").value.trim(),
    bank_account_number:$("supplierBankAccountNumber").value.trim(),
    notes:$("supplierNotes").value.trim()
  });
  const openSupplierProfile=async id=>{
    const s=suppliers.find(x=>x.id===id);if(!s)return;
    const [b,rows,orders]=await Promise.all([
      signedQuery(client.from("admin_supplier_balances").select("*").eq("supplier_id",id).maybeSingle()),
      signedQuery(client.from("admin_supplier_ledger").select("*").eq("supplier_id",id).order("transaction_date",{ascending:false}).limit(100)),
      signedQuery(client.from("admin_purchase_orders").select("purchase_number,order_date,total_amount,status").eq("supplier_id",id).order("order_date",{ascending:false}).limit(30))
    ]);
    $("supplierProfileTitle").textContent=s.name;
    $("supplierProfileSubtitle").textContent=(s.supplier_code||"Supplier")+" · "+(s.phone||"No phone on file");
    $("supplierProfileBody").innerHTML=
      '<div class="hf-supplier-profile-kpis"><div class="hf-supplier-profile-kpi"><small>Total confirmed bills</small><strong>'+money(b?.total_bills)+'</strong></div><div class="hf-supplier-profile-kpi"><small>Total paid</small><strong>'+money(b?.total_paid)+'</strong></div><div class="hf-supplier-profile-kpi"><small>Outstanding / advance</small><strong>'+money(b?.outstanding_balance)+'</strong></div></div>'+
      '<div class="hf-supplier-profile-meta"><div><small>Contact person</small><strong>'+esc(s.contact_name||"—")+'</strong></div><div><small>Phone / WhatsApp</small><strong>'+esc(s.phone||"—")+' / '+esc(s.whatsapp||"—")+'</strong></div><div><small>Email</small><strong>'+esc(s.email||"—")+'</strong></div><div><small>Address</small><strong>'+esc([s.address,s.city,s.district].filter(Boolean).join(", ")||"—")+'</strong></div><div><small>Payment terms</small><strong>'+esc(s.payment_terms_days? s.payment_terms_days+" days":"Due on receipt")+'</strong></div><div><small>Preferred payment</small><strong>'+esc(label(s.preferred_payment_method))+'</strong></div></div>'+
      '<div><div class="hf-section-head"><h3>Recent purchases</h3><a class="hf-button hf-button-secondary hf-button-small" href="./supplier-purchases.html">Open Purchase List</a></div><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Purchase</th><th>Date</th><th>Value</th><th>Status</th></tr></thead><tbody>'+ (orders.length?orders.map(o=>'<tr><td>'+esc(o.purchase_number)+'</td><td>'+esc(fmtDate(o.order_date))+'</td><td>'+money(o.total_amount)+'</td><td>'+statusPill(o.status)+'</td></tr>').join(""):'<tr><td colspan="4">No purchase orders yet.</td></tr>')+'</tbody></table></div></div>'+
      '<div><div class="hf-section-head"><h3>Supplier statement</h3><a class="hf-button hf-button-secondary hf-button-small" href="./supplier-payments.html">Open full ledger</a></div><div class="hf-table-wrap"><table class="hf-table"><thead><tr><th>Date</th><th>Transaction</th><th>Reference</th><th>Change</th></tr></thead><tbody>'+ (rows.length?rows.map(x=>'<tr><td>'+esc(fmtDate(x.transaction_date))+'</td><td>'+esc(label(x.transaction_type))+'</td><td>'+esc(x.reference||"—")+'</td><td>'+money(x.balance_delta)+'</td></tr>').join(""):'<tr><td colspan="4">No ledger entries yet.</td></tr>')+'</tbody></table></div></div>';
    $("supplierProfileDialog").showModal();
  };
  const renderPurchaseLines=()=>{
    const host=$("purchaseLines");if(!host)return;
    host.innerHTML=purchaseLines.map((line,i)=>{
      const chosen=products.find(p=>p.id===line.product_id);
      const manual=line.product_id==="__manual__";
      const productField=manual
        ? '<label class="line-product">Non-catalog item name *<input data-field="product_name" maxlength="180" value="'+esc(line.product_name||"")+'" placeholder="Enter purchased item name"></label><label>SKU / code<input data-field="sku_snapshot" maxlength="100" value="'+esc(line.sku_snapshot||"")+'" placeholder="Optional"></label><label>Unit<select data-field="unit"><option value="piece" '+(line.unit==="piece"?"selected":"")+'>piece</option><option value="kg" '+(line.unit==="kg"?"selected":"")+'>kg</option><option value="gram" '+(line.unit==="gram"?"selected":"")+'>gram</option><option value="litre" '+(line.unit==="litre"?"selected":"")+'>litre</option><option value="pack" '+(line.unit==="pack"?"selected":"")+'>pack</option><option value="box" '+(line.unit==="box"?"selected":"")+'>box</option></select></label>'
        : '<label class="line-product">Product *<select class="product-select" data-field="product_id"><option value="">Choose catalogue product</option><option value="__manual__">＋ Non-catalog item</option>'+products.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===line.product_id?"selected":"")+'>'+esc(p.name)+' · '+esc(p.sku||"SKU")+'</option>').join("")+'</select></label>';
      const unit=manual?(line.unit||"piece"):(chosen?.unit_type||line.unit||"piece");
      return '<div class="hf-purchase-line" data-purchase-line="'+i+'">'+productField+
        '<label>Quantity<input data-field="quantity" type="number" min="0.001" step="0.001" value="'+esc(line.quantity)+'"></label>'+
        '<label>Unit cost ৳<input data-field="unit_cost" type="number" min="0" step="0.01" value="'+esc(line.unit_cost)+'"></label>'+
        '<label>Discount ৳<input data-field="discount_amount" type="number" min="0" step="0.01" value="'+esc(line.discount_amount)+'"></label>'+
        '<div><label>Line total</label><strong class="line-total">'+money(Math.max(0,n(line.quantity)*n(line.unit_cost)-n(line.discount_amount)))+'</strong><small>'+(manual?"Non-catalog · not added to store stock":chosen?esc(unit)+" · stock "+n(chosen.stock_quantity).toLocaleString("en-BD"):"Choose a product or enter a non-catalog item")+'</small></div>'+
        '<button class="hf-line-remove" data-remove-purchase-line="'+i+'" type="button" aria-label="Remove product line">×</button>'+
      '</div>';
    }).join("");
    calcPurchaseTotal();
  };
  const calcPurchaseTotal=()=>{
    const subtotal=purchaseLines.reduce((s,l)=>s+n(l.quantity)*n(l.unit_cost),0);
    const lineDisc=purchaseLines.reduce((s,l)=>s+n(l.discount_amount),0);
    const headerDisc=n($("purchaseDiscount")?.value),transport=n($("purchaseTransport")?.value),handling=n($("purchaseHandling")?.value),tax=n($("purchaseTax")?.value),other=n($("purchaseOther")?.value);
    $("purchaseSubtotal").textContent=money(subtotal);
    $("purchaseLineDiscount").textContent=money(lineDisc);
    $("purchaseOtherAdjustments").textContent=money(-headerDisc+transport+handling+tax+other);
    $("purchaseGrandTotal").textContent=money(round(subtotal-lineDisc-headerDisc+transport+handling+tax+other));
  };
  const setPurchaseSuppliers=()=>{
    options($("purchaseSupplier"),suppliers.filter(s=>s.is_active).map(s=>({value:s.id,label:s.name+" · "+s.supplier_code})),"Choose active supplier");
    options($("billSupplier"),suppliers.filter(s=>s.is_active).map(s=>({value:s.id,label:s.name})),"Choose supplier");
  };
  const renderPurchasePage=()=>{
    const poBody=$("purchaseTableBody");if(!poBody)return;
    $("purchaseOrderCount").textContent=purchaseOrders.length.toLocaleString("en-BD");
    $("purchaseOrderValue").textContent=money(purchaseOrders.filter(p=>p.status!=="cancelled").reduce((s,p)=>s+n(p.total_amount),0));
    $("purchaseAwaitingCount").textContent=purchaseOrders.filter(p=>["draft","ordered","partially_received"].includes(p.status)).length.toLocaleString("en-BD");
    $("purchaseBillValue").textContent=money(bills.filter(b=>b.status==="confirmed").reduce((s,b)=>s+n(b.total_amount),0));
    const q=String($("purchaseSearch")?.value||"").trim().toLowerCase(),st=$("purchaseStatusFilter")?.value||"";
    const rows=purchaseOrders.filter(p=>(!st||p.status===st)&&(!q||[p.purchase_number,p.reference,supplierName(p.supplier_id),...poItems(p).map(i=>i.product_name)].join(" ").toLowerCase().includes(q)));
    poBody.innerHTML=rows.length?rows.map(p=>{
      const items=poItems(p),received=items.reduce((s,x)=>s+n(x.received_quantity),0),ordered=items.reduce((s,x)=>s+n(x.quantity),0);
      const billCount=bills.filter(b=>b.purchase_order_id===p.id).length;
      return '<tr><td><strong>'+esc(p.purchase_number)+'</strong><small>'+esc(fmtDate(p.order_date))+'</small></td><td>'+esc(supplierName(p.supplier_id))+'</td><td>'+esc(items.map(x=>x.product_name+" × "+n(x.quantity)).join(", "))+'</td><td>'+money(p.total_amount)+'</td><td>'+n(received).toLocaleString("en-BD")+' / '+n(ordered).toLocaleString("en-BD")+'</td><td>'+billCount.toLocaleString("en-BD")+' bill(s)</td><td>'+statusPill(p.status)+'</td><td><div class="hf-row-actions">'+(["draft","ordered","partially_received"].includes(p.status)?'<button class="hf-button hf-button-secondary hf-button-small" data-grn="'+esc(p.id)+'" type="button">Receive</button>':"")+'<button class="hf-button hf-button-secondary hf-button-small" data-create-bill="'+esc(p.id)+'" type="button">Bill</button>'+(["draft","ordered"].includes(p.status)?'<button class="hf-button hf-button-secondary hf-button-small" data-cancel-po="'+esc(p.id)+'" type="button">Cancel</button>':"")+'</div></td></tr>';
    }).join(""):'<tr><td colspan="8">'+makeEmpty("No purchase orders","Create a multi-product purchase order to start the register.")+'</td></tr>';
    const bb=$("supplierBillsTableBody");
    bb.innerHTML=bills.length?bills.map(b=>{
      const a=allocatedToBill(b.id),due=billDue(b);
      return '<tr><td><strong>'+esc(b.bill_number)+'</strong><small>'+esc(b.supplier_invoice_number||"No supplier invoice #")+'</small></td><td>'+esc(supplierName(b.supplier_id))+'</td><td>'+esc(fmtDate(b.invoice_date))+'</td><td>'+esc(fmtDate(b.due_date))+'</td><td>'+money(b.total_amount)+'</td><td>'+money(a.paid)+'</td><td>'+money(due)+'</td><td>'+statusPill(b.status)+'</td><td>'+(b.status==="draft"?'<button class="hf-button hf-button-secondary hf-button-small" data-confirm-bill="'+esc(b.id)+'" type="button">Confirm</button>':"")+'</td></tr>';
    }).join(""):'<tr><td colspan="9">'+makeEmpty("No supplier bills","Record a supplier invoice against a purchase order or directly.")+'</td></tr>';
    const creditBody=$("supplierCreditNotesBody");
    if(creditBody)creditBody.innerHTML=credits.length?credits.map(c=>'<tr><td><strong>'+esc(c.credit_note_number)+'</strong><small>'+esc(c.supplier_reference||"")+'</small></td><td>'+esc(supplierName(c.supplier_id))+'</td><td>'+esc(fmtDate(c.credit_date))+'</td><td>'+esc(c.reason)+'</td><td>'+money(c.amount)+'</td><td>'+esc(bills.find(b=>b.id===c.supplier_bill_id)?.bill_number||"—")+'</td><td>'+statusPill(c.status)+'</td><td>'+(c.status==="draft"?'<button class="hf-button hf-button-secondary hf-button-small" data-confirm-credit="'+esc(c.id)+'" type="button">Confirm</button>':c.status==="confirmed"?'<button class="hf-button hf-button-secondary hf-button-small" data-void-credit="'+esc(c.id)+'" type="button">Void</button>':"")+'</td></tr>').join(""):'<tr><td colspan="8">'+makeEmpty("No supplier credits","Approved supplier returns and credit notes will appear here.")+'</td></tr>';

  };
  const poOptions=supplierId=>purchaseOrders.filter(p=>(!supplierId||p.supplier_id===supplierId)&&p.status!=="cancelled").map(p=>({value:p.id,label:p.purchase_number+" · "+money(p.total_amount)}));
  const updateBillTotal=()=>{
    const total=round(n($("billSubtotal").value)-n($("billDiscount").value)+n($("billCharges").value)+n($("billTax").value));
    $("billTotal").value=total.toFixed(2);
  };
  const creditBillOptions=supplierId=>bills.filter(b=>b.supplier_id===supplierId&&b.status==="confirmed").map(b=>({value:b.id,label:b.bill_number+" · due "+money(billDue(b))}));
  const openCreditNote=()=>{
    $("creditNoteForm").reset();$("creditDate").value=today();$("creditStatus").value="confirmed";
    options($("creditSupplier"),suppliers.map(s=>({value:s.id,label:s.name})),"Choose supplier");
    options($("creditBill"),[],"No linked bill");options($("creditPurchaseOrder"),[],"No linked purchase order");
    errorText("creditFormError","");$("creditNoteDialog").showModal();
  };
  const openBill=(poId="")=>{
    $("billForm").reset();$("billInvoiceDate").value=today();$("billDueDate").value=today();
    options($("billSupplier"),suppliers.filter(s=>s.is_active).map(s=>({value:s.id,label:s.name})),"Choose supplier");
    if(poId){
      const p=purchaseOrders.find(x=>x.id===poId);
      if(p){$("billSupplier").value=p.supplier_id;options($("billPurchaseOrder"),poOptions(p.supplier_id),"No linked purchase order",poId);$("billSubtotal").value=n(p.total_amount).toFixed(2);}
    }else options($("billPurchaseOrder"),poOptions(""),"No linked purchase order");
    const terms=n(suppliers.find(s=>s.id===$("billSupplier").value)?.payment_terms_days);
    const due=new Date(today()+"T12:00:00");due.setDate(due.getDate()+terms);$("billDueDate").value=due.getFullYear()+"-"+String(due.getMonth()+1).padStart(2,"0")+"-"+String(due.getDate()).padStart(2,"0");
    updateBillTotal();errorText("billFormError","");$("billDialog").showModal();
  };
  const openGrn=poId=>{
    const po=purchaseOrders.find(p=>p.id===poId);if(!po)return;
    const remaining=poItems(po).filter(i=>n(i.quantity)>n(i.received_quantity));
    if(!remaining.length){toast("All ordered items have already been received.","error");return;}
    $("grnPurchaseOrderId").value=poId;$("grnDate").value=today();$("grnChallan").value="";$("grnReceivedBy").value="";$("grnNotes").value="";
    $("grnLines").innerHTML=remaining.map(i=>{
      const left=round(n(i.quantity)-n(i.received_quantity));
      return '<div class="hf-grn-line" data-grn-item="'+esc(i.id)+'"><div><strong>'+esc(i.product_name)+'</strong><small>'+esc(i.sku_snapshot||"No SKU")+' · Remaining '+left+' '+esc(i.unit||"")+'</small></div><label>Received<input data-grn-field="received" type="number" min="0.001" max="'+left+'" step="0.001" value="'+left+'"></label><label>Rejected<input data-grn-field="rejected" type="number" min="0" max="'+left+'" step="0.001" value="0"></label><label>Accepted<input data-grn-field="accepted" type="text" readonly value="'+left+'"></label></div>';
    }).join("");
    errorText("grnFormError","");$("grnDialog").showModal();
  };
  const renderPayments=()=>{
    const selected=$("paymentSearch")?.value.toLowerCase().trim()||"",method=$("paymentMethodFilter")?.value||"";
    const tbody=$("paymentsTableBody");if(!tbody)return;
    const totalPayable=bills.reduce((sum,b)=>sum+billDue(b),0);
    const thisMonth=today().slice(0,7);
    const paidMonth=payments.filter(p=>p.status==="confirmed"&&String(p.payment_date).startsWith(thisMonth)).reduce((s,p)=>s+n(p.amount),0);
    const advances=suppliers.reduce((s,x)=>s+supplierAdvance(x.id),0);
    $("payableTotal").textContent=money(totalPayable);$("paymentsThisMonth").textContent=money(paidMonth);
    $("overdueBills").textContent=bills.filter(b=>b.status==="confirmed"&&b.due_date<today()&&billDue(b)>0).length.toLocaleString("en-BD");
    $("advanceTotal").textContent=money(advances);
    const rows=payments.filter(p=>(!method||p.payment_method===method)&&(!selected||[p.payment_number,supplierName(p.supplier_id),p.transaction_reference,p.paid_from_account].join(" ").toLowerCase().includes(selected)));
    tbody.innerHTML=rows.length?rows.map(p=>{
      const alloc=allocations.filter(a=>a.payment_id===p.id).reduce((s,a)=>s+n(a.allocated_amount),0);
      return '<tr><td><strong>'+esc(p.payment_number)+'</strong><small>'+esc(fmtDate(p.payment_date))+'</small></td><td>'+esc(supplierName(p.supplier_id))+'</td><td>'+esc(label(p.payment_method))+'<small>'+esc(p.transaction_reference||p.paid_from_account||"No reference")+'</small></td><td>'+money(p.amount)+'</td><td>'+money(alloc)+'</td><td>'+money(Math.max(0,n(p.amount)-alloc))+'</td><td>'+statusPill(p.status)+'</td><td>'+(p.status==="confirmed"?'<button class="hf-button hf-button-secondary hf-button-small" data-void-payment="'+esc(p.id)+'" type="button">Void / reverse</button>':"")+'</td></tr>';
    }).join(""):'<tr><td colspan="8">'+makeEmpty("No payment records","Confirmed supplier payments will appear here.")+'</td></tr>';
    const overdueFilter=$("billAgingFilter")?.value||"",payablesRows=bills.filter(b=>b.status==="confirmed").filter(b=>{
      const due=billDue(b),over=b.due_date<today()&&due>0;
      if(overdueFilter==="overdue")return over;
      if(overdueFilter==="not_due")return !over&&due>0;
      if(overdueFilter==="part_paid")return due>0&&due<n(b.total_amount);
      if(overdueFilter==="unpaid")return due>=n(b.total_amount);
      return due>0;
    });
    $("payablesTableBody").innerHTML=payablesRows.length?payablesRows.map(b=>{
      const a=allocatedToBill(b.id),due=billDue(b),age=b.due_date<today()?Math.floor((new Date(today()+"T12:00:00")-new Date(b.due_date+"T12:00:00"))/86400000):0;
      return '<tr><td><strong>'+esc(b.bill_number)+'</strong><small>'+esc(supplierName(b.supplier_id))+'</small></td><td>'+esc(fmtDate(b.invoice_date))+'</td><td>'+esc(fmtDate(b.due_date))+'</td><td>'+money(b.total_amount)+'</td><td>'+money(a.paid)+'</td><td><strong>'+money(due)+'</strong></td><td>'+(age>0?'<span class="hf-inline-status bad">'+age+' days overdue</span>':statusPill("not_due"))+'</td></tr>';
    }).join(""):'<tr><td colspan="7">'+makeEmpty("No outstanding supplier bills","All confirmed bills are paid, credited or no invoices have been recorded.")+'</td></tr>';
    renderLedger();
  };
  const renderLedger=()=>{
    const body=$("supplierLedgerTableBody");if(!body)return;
    const supplierId=$("ledgerSupplierFilter")?.value||"",from=$("ledgerDateFrom")?.value||"",to=$("ledgerDateTo")?.value||"";
    let rows=ledger.filter(x=>(!supplierId||x.supplier_id===supplierId)&&(!from||x.transaction_date>=from)&&(!to||x.transaction_date<=to));
    const bySupplier=new Map();
    const all=rows.slice().sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date))||String(a.recorded_at).localeCompare(String(b.recorded_at)));
    const running=new Map();
    all.forEach(x=>running.set(x.supplier_id,round((running.get(x.supplier_id)||0)+n(x.balance_delta))));
    const ending=new Map(running);
    rows=rows.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))||String(b.recorded_at).localeCompare(String(a.recorded_at)));
    const reverse=new Map(ending);
    const withBalance=rows.map(x=>{
      const current=reverse.get(x.supplier_id)||0;
      const prior=round(current-n(x.balance_delta));reverse.set(x.supplier_id,prior);
      return {...x,running_balance:current};
    });
    body.innerHTML=withBalance.length?withBalance.map(x=>'<tr><td>'+esc(fmtDate(x.transaction_date))+'</td><td>'+esc(supplierName(x.supplier_id))+'</td><td>'+esc(label(x.transaction_type))+'</td><td>'+esc(x.reference||"—")+'</td><td>'+(n(x.balance_delta)>0?money(x.balance_delta):"—")+'</td><td>'+(n(x.balance_delta)<0?money(-n(x.balance_delta)):"—")+'</td><td><strong>'+money(x.running_balance)+'</strong></td></tr>').join(""):'<tr><td colspan="7">'+makeEmpty("No ledger transactions","Opening balances, bills, payments and credits appear here.")+'</td></tr>';
  };
  const renderPaymentAllocations=()=>{
    const supplierId=$("paymentSupplier").value;
    const host=$("paymentAllocations");if(!host)return;
    const openBills=bills.filter(b=>b.supplier_id===supplierId&&billDue(b)>0&&b.status==="confirmed");
    $("allocationSupplierHint").textContent=supplierId?openBills.length+" confirmed invoice(s) with balance":"Choose a supplier to load confirmed bills";
    host.innerHTML=openBills.length?openBills.map(b=>{
      return '<div class="hf-payment-allocation" data-payment-bill="'+esc(b.id)+'"><div><strong>'+esc(b.bill_number)+'</strong><small>'+esc(fmtDate(b.invoice_date))+' · Due '+esc(fmtDate(b.due_date))+'</small></div><div><small>Outstanding</small><strong>'+money(billDue(b))+'</strong></div><label>Allocate ৳<input type="number" min="0" max="'+billDue(b)+'" step="0.01" value="0" data-allocation-amount="'+esc(b.id)+'"></label></div>';
    }).join(""):'<div class="hf-empty-state">No confirmed invoices with an outstanding balance. Any payment will be held as a supplier advance.</div>';
    calcPaymentAllocation();
  };
  const calcPaymentAllocation=()=>{
    const amt=n($("paymentAmount")?.value),allocated=Array.from(document.querySelectorAll("[data-allocation-amount]")).reduce((s,e)=>s+n(e.value),0);
    $("paymentAmountPreview").textContent=money(amt);$("paymentAllocatedPreview").textContent=money(allocated);$("paymentAdvancePreview").textContent=money(Math.max(0,amt-allocated));
    const valid=allocated<=amt+0.001&&allocated>=0;
    $("saveSupplierPaymentBtn").disabled=!valid||!$("confirmPaymentSent").checked||amt<=0;
    return {amt,allocated,valid};
  };
  const fillSupplierSelects=()=>{
    const active=suppliers.filter(s=>s.is_active);
    options($("purchaseSupplier"),active.map(s=>({value:s.id,label:s.name+" · "+s.supplier_code})),"Choose active supplier");
    options($("billSupplier"),active.map(s=>({value:s.id,label:s.name})),"Choose supplier");
    options($("paymentSupplier"),active.map(s=>({value:s.id,label:s.name})),"Choose supplier");
    options($("ledgerSupplierFilter"),suppliers.map(s=>({value:s.id,label:s.name})),"All suppliers");
  };
  const bindAddPage=()=>{
    $("hfSupplierForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("saveSupplierBtn");submitting(b,true);errorText("supplierFormError","");
      try{
        const p=supplierPayload(),id=$("supplierRecordId").value;
        if(p.name.length<2)throw Error("Supplier name must contain at least 2 characters.");
        if(p.phone&&p.phone.length<7)throw Error("Enter a valid phone number or leave it blank.");
        if(id){
          const {error}=await client.from("admin_suppliers").update({...p,updated_at:new Date().toISOString()}).eq("id",id);
          if(error)throw error;
          await audit("supplier_updated","supplier",id,p.name,{supplier_code:suppliers.find(s=>s.id===id)?.supplier_code});
        }else{
          const opening=n($("supplierOpeningBalance").value);
          if(opening<0)throw Error("Opening balance cannot be negative.");
          const result=await rpc("create_supplier_with_opening_balance",{
            p_supplier:p,p_opening_balance:opening,p_opening_balance_date:$("supplierOpeningDate").value||today(),
            p_opening_balance_note:$("supplierOpeningNote").value.trim()
          });
          await audit("supplier_created","supplier",result?.id,p.name,{supplier_code:result?.supplier_code,opening_balance:opening});
        }
        resetSupplierForm();await loadCommon();renderSupplierKpis();renderSuppliers();toast(id?"Supplier updated.":"Supplier saved.");
      }catch(err){errorText("supplierFormError",err.message||"Could not save supplier.");}
      finally{submitting(b,false);}
    });
    $("focusSupplierForm").addEventListener("click",()=>{$("supplierName").focus();$("supplierFormSection").scrollIntoView({behavior:"smooth",block:"start"});});
    $("resetSupplierForm").addEventListener("click",resetSupplierForm);
    $("supplierSearch").addEventListener("input",renderSuppliers);
    $("supplierStatusFilter").addEventListener("change",renderSuppliers);
    $("suppliersTableBody").addEventListener("click",async e=>{
      const view=e.target.closest("[data-supplier-view]"),edit=e.target.closest("[data-supplier-edit]"),toggle=e.target.closest("[data-supplier-toggle]");
      try{
        if(view)await openSupplierProfile(view.dataset.supplierView);
        if(edit){const s=suppliers.find(x=>x.id===edit.dataset.supplierEdit);if(s)setSupplierForm(s);}
        if(toggle){
          const s=suppliers.find(x=>x.id===toggle.dataset.supplierToggle);if(!s)return;
          const next=toggle.dataset.next==="true";
          if(!next&&!confirm("Set this supplier to inactive? Historical purchases and payments will remain unchanged."))return;
          const {error}=await client.from("admin_suppliers").update({is_active:next,updated_at:new Date().toISOString()}).eq("id",s.id);
          if(error)throw error;await audit("supplier_status_changed","supplier",s.id,"Supplier status changed",{is_active:next});
          await loadCommon();renderSupplierKpis();renderSuppliers();toast("Supplier status updated.");
        }
      }catch(err){toast(err.message||"Supplier action failed.","error");}
    });
    $("exportSuppliersBtn").addEventListener("click",()=>exportRows("halal-food-suppliers-"+today()+".csv",suppliers.map(s=>{
      const b=balanceMap().get(s.id)||{};
      return {supplier_code:s.supplier_code,name:s.name,contact:s.contact_name,phone:s.phone,whatsapp:s.whatsapp,email:s.email,type:s.supplier_type,categories:(s.product_categories||[]).join("; "),city:s.city,district:s.district,payment_terms_days:s.payment_terms_days,total_bills:b.total_bills,total_paid:b.total_paid,outstanding:b.outstanding_balance,status:s.is_active?"active":"inactive"};
    })));
    document.querySelectorAll("[data-close-supplier-profile]").forEach(b=>b.addEventListener("click",()=>$("supplierProfileDialog").close()));
  };
  const bindPurchasePage=()=>{
    purchaseLines=[{product_id:"",product_name:"",sku_snapshot:"",unit:"piece",quantity:1,unit_cost:0,discount_amount:0}];renderPurchaseLines();
    $("focusPurchaseForm").addEventListener("click",()=>$("purchaseCreateSection").scrollIntoView({behavior:"smooth",block:"start"}));
    $("addPurchaseLine").addEventListener("click",()=>{purchaseLines.push({product_id:"",quantity:1,unit_cost:0,discount_amount:0});renderPurchaseLines();});
    $("purchaseLines").addEventListener("input",e=>{
      const row=e.target.closest("[data-purchase-line]");if(!row)return;
      const i=Number(row.dataset.purchaseLine),field=e.target.dataset.field;if(!field||!purchaseLines[i])return;
      purchaseLines[i][field]=e.target.value;
      const total=row.querySelector(".line-total");if(total)total.textContent=money(Math.max(0,n(purchaseLines[i].quantity)*n(purchaseLines[i].unit_cost)-n(purchaseLines[i].discount_amount)));
      calcPurchaseTotal();
    });
    $("purchaseLines").addEventListener("change",e=>{
      const row=e.target.closest("[data-purchase-line]");if(!row)return;
      const i=Number(row.dataset.purchaseLine),field=e.target.dataset.field;if(!field||!purchaseLines[i])return;
      purchaseLines[i][field]=e.target.value;
      if(field==="product_id"){
        const p=products.find(x=>x.id===e.target.value);
        if(p){purchaseLines[i].unit_cost=p.cost_price??purchaseLines[i].unit_cost;purchaseLines[i].unit=p.unit_type||"piece";}
        if(e.target.value==="__manual__"){purchaseLines[i].product_name="";purchaseLines[i].sku_snapshot="";purchaseLines[i].unit="piece";}
        renderPurchaseLines();
      }
      calcPurchaseTotal();
    });
    $("purchaseLines").addEventListener("click",e=>{
      const b=e.target.closest("[data-remove-purchase-line]");if(!b)return;
      purchaseLines.splice(Number(b.dataset.removePurchaseLine),1);if(!purchaseLines.length)purchaseLines.push({product_id:"",quantity:1,unit_cost:0,discount_amount:0});renderPurchaseLines();
    });
    ["purchaseDiscount","purchaseTransport","purchaseHandling","purchaseTax","purchaseOther"].forEach(id=>$(id).addEventListener("input",calcPurchaseTotal));
    $("resetPurchaseForm").addEventListener("click",()=>{ $("purchaseForm").reset();$("purchaseDate").value=today();purchaseLines=[{product_id:"",quantity:1,unit_cost:0,discount_amount:0}];renderPurchaseLines();errorText("purchaseFormError","");});
    $("purchaseForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("savePurchaseBtn");submitting(b,true);errorText("purchaseFormError","");
      try{
        if(!purchaseLines.length)throw Error("Add at least one purchase line.");
        const items=purchaseLines.map(l=>({
          product_id:l.product_id==="__manual__"||!l.product_id?null:l.product_id,
          product_name:l.product_name||"",
          sku_snapshot:l.sku_snapshot||"",
          unit:l.unit||"piece",
          quantity:n(l.quantity),unit_cost:n(l.unit_cost),discount_amount:n(l.discount_amount)
        }));
        if(items.some(x=>x.product_id===null&&x.product_name.trim().length<2))throw Error("Enter a name for each non-catalog item.");
        if(items.some(x=>x.quantity<=0||x.unit_cost<0||x.discount_amount<0||x.discount_amount>x.quantity*x.unit_cost))throw Error("Check quantities, unit costs and line discounts.");
        const po=await rpc("create_supplier_purchase_order",{
          p_supplier_id:$("purchaseSupplier").value,p_order_date:$("purchaseDate").value,
          p_expected_date:$("purchaseExpected").value||null,p_status:$("purchaseStatus").value,
          p_reference:$("purchaseReference").value.trim(),p_notes:$("purchaseNotes").value.trim(),
          p_discount_amount:n($("purchaseDiscount").value),p_transport_cost:n($("purchaseTransport").value),
          p_handling_cost:n($("purchaseHandling").value),p_tax_amount:n($("purchaseTax").value),
          p_other_charges:n($("purchaseOther").value),p_items:items
        });
        await audit("supplier_purchase_order_created","purchase_order",po?.id,"Purchase order "+po?.purchase_number+" created",{total:po?.total_amount,item_count:items.length});
        $("purchaseForm").reset();$("purchaseDate").value=today();purchaseLines=[{product_id:"",quantity:1,unit_cost:0,discount_amount:0}];renderPurchaseLines();
        await loadPurchases();await loadCommon();renderPurchasePage();toast("Multi-product purchase order created. Stock was not changed.");
      }catch(err){errorText("purchaseFormError",err.message||"Purchase order could not be created.");}
      finally{submitting(b,false);}
    });
    $("purchaseSearch").addEventListener("input",renderPurchasePage);
    $("purchaseStatusFilter").addEventListener("change",renderPurchasePage);
    $("purchaseTableBody").addEventListener("click",e=>{
      const grn=e.target.closest("[data-grn]"),bill=e.target.closest("[data-create-bill]"),cancel=e.target.closest("[data-cancel-po]");
      if(grn)openGrn(grn.dataset.grn);
      if(bill)openBill(bill.dataset.createBill);
      if(cancel){
        const p=purchaseOrders.find(x=>x.id===cancel.dataset.cancelPo);if(!p)return;
        if(!confirm("Cancel "+p.purchase_number+"? Cancelled purchase orders cannot receive stock."))return;
        client.from("admin_purchase_orders").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",p.id).then(async ({error})=>{
          if(error)throw error;await audit("purchase_order_cancelled","purchase_order",p.id,"Purchase order cancelled");await loadPurchases();renderPurchasePage();toast("Purchase order cancelled.");
        }).catch(err=>toast(err.message||"Could not cancel purchase order.","error"));
      }
    });
    $("supplierBillsTableBody").addEventListener("click",async e=>{
      const b=e.target.closest("[data-confirm-bill]");if(!b)return;
      const bill=bills.find(x=>x.id===b.dataset.confirmBill);if(!bill)return;
      if(!confirm("Confirm supplier bill "+bill.bill_number+" for "+money(bill.total_amount)+"? This will create a payable balance."))return;
      try{
        const {error}=await client.from("admin_supplier_bills").update({status:"confirmed",updated_at:new Date().toISOString()}).eq("id",bill.id);
        if(error)throw error;await audit("supplier_bill_confirmed","supplier_bill",bill.id,"Supplier bill confirmed",{amount:bill.total_amount});
        await loadPurchases();await loadCommon();renderPurchasePage();toast("Supplier bill confirmed.");
      }catch(err){toast(err.message||"Could not confirm bill.","error");}
    });
    $("openBillDialogBtn").addEventListener("click",()=>openBill());
    $("openCreditNoteBtn").addEventListener("click",openCreditNote);
    $("creditSupplier").addEventListener("change",()=>{
      const supplierId=$("creditSupplier").value;
      options($("creditBill"),creditBillOptions(supplierId),"No linked bill");
      options($("creditPurchaseOrder"),poOptions(supplierId),"No linked purchase order");
    });
    $("creditBill").addEventListener("change",()=>{
      const bill=bills.find(x=>x.id===$("creditBill").value);
      if(bill){$("creditSupplier").value=bill.supplier_id;options($("creditPurchaseOrder"),poOptions(bill.supplier_id),"No linked purchase order",bill.purchase_order_id||"");}
    });
    $("creditNoteForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("saveCreditNoteBtn");submitting(b,true);errorText("creditFormError","");
      try{
        const supplierId=$("creditSupplier").value,billId=$("creditBill").value||null,poId=$("creditPurchaseOrder").value||null;
        const amount=round($("creditAmount").value),reason=$("creditReason").value.trim();
        if(!supplierId||amount<=0||reason.length<2)throw Error("Choose a supplier and enter a valid amount and reason.");
        const linkedBill=billId?bills.find(x=>x.id===billId):null;
        if(linkedBill&&linkedBill.supplier_id!==supplierId)throw Error("The selected bill belongs to a different supplier.");
        if(poId&&!purchaseOrders.some(x=>x.id===poId&&x.supplier_id===supplierId))throw Error("The selected purchase order belongs to a different supplier.");
        if(linkedBill&&amount>n(linkedBill.total_amount))throw Error("A credit note cannot exceed the linked bill's original total.");
        const payload={supplier_id:supplierId,supplier_bill_id:billId,purchase_order_id:poId,credit_date:$("creditDate").value,
          amount,reason,supplier_reference:$("creditReference").value.trim(),status:$("creditStatus").value,
          notes:$("creditNotes").value.trim(),created_by:ADMIN_EMAIL};
        const {data,error}=await client.from("admin_supplier_credit_notes").insert(payload).select("id,credit_note_number").single();
        if(error)throw error;
        await audit("supplier_credit_note_created","supplier_credit_note",data?.id,"Supplier credit note "+data?.credit_note_number+" recorded",{amount,status:payload.status,supplier_id:supplierId});
        $("creditNoteDialog").close();await loadPurchases();await loadCommon();renderPurchasePage();toast("Supplier credit note recorded.");
      }catch(err){errorText("creditFormError",err.message||"Supplier credit note could not be saved.");}
      finally{submitting(b,false);}
    });
    $("supplierCreditNotesBody").addEventListener("click",async e=>{
      const confirmButton=e.target.closest("[data-confirm-credit]"),voidButton=e.target.closest("[data-void-credit]");
      const button=confirmButton||voidButton;if(!button)return;
      const credit=credits.find(x=>x.id===(confirmButton?.dataset.confirmCredit||voidButton?.dataset.voidCredit));if(!credit)return;
      const next=confirmButton?"confirmed":"void";
      if(!confirm((next==="confirmed"?"Confirm":"Void")+" credit note "+credit.credit_note_number+" for "+money(credit.amount)+"?"))return;
      try{
        const {error}=await client.from("admin_supplier_credit_notes").update({status:next,updated_at:new Date().toISOString()}).eq("id",credit.id);
        if(error)throw error;await audit("supplier_credit_note_status_changed","supplier_credit_note",credit.id,"Supplier credit note status changed",{from:credit.status,to:next});
        await loadPurchases();await loadCommon();renderPurchasePage();toast("Supplier credit note updated.");
      }catch(err){toast(err.message||"Supplier credit note could not be updated.","error");}
    });
    $("billSupplier").addEventListener("change",()=>options($("billPurchaseOrder"),poOptions($("billSupplier").value),"No linked purchase order"));
    $("billPurchaseOrder").addEventListener("change",()=>{
      const p=purchaseOrders.find(x=>x.id===$("billPurchaseOrder").value);if(p){$("billSupplier").value=p.supplier_id;$("billSubtotal").value=n(p.total_amount).toFixed(2);updateBillTotal();}
    });
    ["billSubtotal","billDiscount","billCharges","billTax"].forEach(id=>$(id).addEventListener("input",updateBillTotal));
    $("billForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("saveBillBtn");submitting(b,true);errorText("billFormError","");
      try{
        const supplierId=$("billSupplier").value,invoiceDate=$("billInvoiceDate").value,dueDate=$("billDueDate").value;
        const subtotal=n($("billSubtotal").value),discount=n($("billDiscount").value),charges=n($("billCharges").value),tax=n($("billTax").value),total=round(subtotal-discount+charges+tax);
        if(!supplierId||!invoiceDate||!dueDate||dueDate<invoiceDate||subtotal<=0||total<=0)throw Error("Check supplier, invoice date, due date and bill amount.");
        const result=await rpc("create_supplier_bill",{
          p_supplier_id:supplierId,p_purchase_order_id:$("billPurchaseOrder").value||null,
          p_supplier_invoice_number:$("billInvoiceNumber").value.trim(),p_invoice_date:invoiceDate,p_due_date:dueDate,
          p_subtotal:subtotal,p_discount_amount:discount,p_additional_charges:charges,p_tax_amount:tax,
          p_total_amount:total,p_attachment_path:"",p_notes:$("billNotes").value.trim(),p_status:$("billStatus").value
        });
        await audit("supplier_bill_created","supplier_bill",result?.id,"Supplier bill "+result?.bill_number+" recorded",{amount:total,status:$("billStatus").value});
        $("billDialog").close();await loadPurchases();await loadCommon();renderPurchasePage();toast("Supplier invoice recorded.");
      }catch(err){errorText("billFormError",err.message||"Supplier bill could not be recorded.");}
      finally{submitting(b,false);}
    });
    $("grnLines").addEventListener("input",e=>{
      const row=e.target.closest(".hf-grn-line");if(!row)return;
      const received=n(row.querySelector('[data-grn-field="received"]').value),rejected=n(row.querySelector('[data-grn-field="rejected"]').value);
      row.querySelector('[data-grn-field="accepted"]').value=String(Math.max(0,received-rejected));
    });
    $("grnForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("saveGrnBtn");submitting(b,true);errorText("grnFormError","");
      try{
        const items=Array.from($("grnLines").querySelectorAll("[data-grn-item]")).map(row=>({
          purchase_order_item_id:row.dataset.grnItem,
          quantity_received:n(row.querySelector('[data-grn-field="received"]').value),
          quantity_rejected:n(row.querySelector('[data-grn-field="rejected"]').value),
          rejection_reason:row.querySelector('[data-grn-field="rejected"]').value>0?"Rejected during receiving inspection":""
        })).filter(x=>x.quantity_received>0);
        if(!items.length)throw Error("Enter at least one received quantity.");
        if(items.some(x=>x.quantity_rejected>x.quantity_received))throw Error("Rejected quantity cannot exceed the quantity received.");
        const result=await rpc("record_supplier_purchase_receipt",{
          p_purchase_order_id:$("grnPurchaseOrderId").value,p_receipt_date:$("grnDate").value,
          p_challan_number:$("grnChallan").value.trim(),p_received_by:$("grnReceivedBy").value.trim(),
          p_notes:$("grnNotes").value.trim(),p_idempotency_key:key(),p_items:items
        });
        await audit("supplier_goods_received","purchase_receipt",result?.id,"Goods received note "+result?.receipt_number,{lines:items.length});
        $("grnDialog").close();await loadPurchases();await loadCommon();renderPurchasePage();toast("GRN saved. Accepted quantities were added to inventory.");
      }catch(err){errorText("grnFormError",err.message||"Goods receipt could not be saved.");}
      finally{submitting(b,false);}
    });
    $("exportPurchasesBtn").addEventListener("click",()=>exportRows("halal-food-purchases-"+today()+".csv",purchaseOrders.map(p=>({purchase_number:p.purchase_number,supplier:supplierName(p.supplier_id),date:p.order_date,status:p.status,subtotal:p.subtotal,discount:p.discount_amount,transport:p.transport_cost,handling:p.handling_cost,tax:p.tax_amount,other_charges:p.other_charges,total:p.total_amount,items:poItems(p).map(i=>i.product_name+" × "+i.quantity+" "+i.unit).join("; "),received:poItems(p).reduce((s,i)=>s+n(i.received_quantity),0),reference:p.reference}))));
    document.querySelectorAll("[data-close-supplier-dialog]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.closeSupplierDialog).close()));
    $("billInvoiceDate").value=today();$("billDueDate").value=today();$("purchaseDate").value=today();
  };
  const bindPaymentPage=()=>{
    fillSupplierSelects();
    $("paymentDate").value=today();
    $("paymentSupplier").addEventListener("change",renderPaymentAllocations);
    $("paymentAmount").addEventListener("input",calcPaymentAllocation);
    $("paymentAllocations").addEventListener("input",calcPaymentAllocation);
    $("confirmPaymentSent").addEventListener("change",calcPaymentAllocation);
    $("supplierPaymentForm").addEventListener("submit",async e=>{
      e.preventDefault();const b=$("saveSupplierPaymentBtn");const totals=calcPaymentAllocation();submitting(b,true);errorText("paymentFormError","");
      try{
        const supplierId=$("paymentSupplier").value,amount=round($("paymentAmount").value),method=$("paymentMethod").value;
        const allocs=Array.from(document.querySelectorAll("[data-allocation-amount]")).map(input=>({supplier_bill_id:input.dataset.allocationAmount,allocated_amount:round(input.value)})).filter(x=>x.allocated_amount>0);
        const allocated=round(allocs.reduce((s,x)=>s+x.allocated_amount,0));
        if(!supplierId||amount<=0)throw Error("Choose a supplier and enter a payment amount greater than zero.");
        if(method!=="cash"&&$("paymentReference").value.trim().length<2)throw Error("Add the bank, wallet or cheque transaction reference.");
        if(allocated>amount)throw Error("Allocated amounts cannot exceed the payment amount.");
        if(!$("confirmPaymentSent").checked)throw Error("Confirm that this payment has actually been sent before recording it.");
        const result=await rpc("record_supplier_payment",{
          p_supplier_id:supplierId,p_payment_date:$("paymentDate").value,p_amount:amount,p_payment_method:method,
          p_paid_from_account:$("paymentAccount").value.trim(),p_transaction_reference:$("paymentReference").value.trim(),
          p_receipt_path:"",p_notes:$("paymentNotes").value.trim(),p_idempotency_key:key(),p_allocations:allocs
        });
        await audit("supplier_payment_recorded","supplier_payment",result?.id,"Supplier payment "+result?.payment_number+" confirmed",{amount,allocated_amount:allocated,payment_method:method,advance:result?.supplier_advance});
        $("supplierPaymentForm").reset();$("paymentDate").value=today();$("paymentAllocations").innerHTML='<div class="hf-empty-state">Choose a supplier to view confirmed invoices.</div>';
        await loadPayments();await loadCommon();fillSupplierSelects();renderPayments();toast("Payment recorded and linked to Finance & Cash Flow.");
      }catch(err){errorText("paymentFormError",err.message||"Supplier payment could not be saved.");}
      finally{submitting(b,false);calcPaymentAllocation();}
    });
    $("resetSupplierPayment").addEventListener("click",()=>{
      $("supplierPaymentForm").reset();$("paymentDate").value=today();$("paymentAllocations").innerHTML='<div class="hf-empty-state">Choose a supplier to view confirmed invoices.</div>';calcPaymentAllocation();errorText("paymentFormError","");
    });
    $("paymentSearch").addEventListener("input",renderPayments);
    $("paymentMethodFilter").addEventListener("change",renderPayments);
    $("billAgingFilter").addEventListener("change",renderPayments);
    $("ledgerSupplierFilter").addEventListener("change",renderLedger);
    $("ledgerDateFrom").addEventListener("change",renderLedger);
    $("ledgerDateTo").addEventListener("change",renderLedger);
    $("clearLedgerFilters").addEventListener("click",()=>{$("ledgerDateFrom").value="";$("ledgerDateTo").value="";renderLedger();});
    $("paymentsTableBody").addEventListener("click",async e=>{
      const b=e.target.closest("[data-void-payment]");if(!b)return;
      const p=payments.find(x=>x.id===b.dataset.voidPayment);if(!p)return;
      const reason=prompt("Why are you reversing payment "+p.payment_number+"? This will void its linked finance expense and remove its supplier ledger credit.");
      if(reason===null)return;if(reason.trim().length<3){toast("Enter a short reason for the reversal.","error");return;}
      if(!confirm("Void "+p.payment_number+" for "+money(p.amount)+"? The original record will remain in history."))return;
      try{
        const {error}=await client.from("admin_supplier_payments").update({status:"void",notes:(p.notes||"")+"\nReversal: "+reason.trim(),updated_at:new Date().toISOString()}).eq("id",p.id);
        if(error)throw error;await audit("supplier_payment_voided","supplier_payment",p.id,"Supplier payment reversed",{reason:reason.trim(),amount:p.amount});
        await loadPayments();await loadCommon();renderPayments();toast("Payment voided; finance mirror and supplier ledger were updated.");
      }catch(err){toast(err.message||"Payment could not be reversed.","error");}
    });
    $("exportPaymentsBtn").addEventListener("click",()=>exportRows("halal-food-supplier-payments-"+today()+".csv",payments.map(p=>({payment_number:p.payment_number,date:p.payment_date,supplier:supplierName(p.supplier_id),method:p.payment_method,reference:p.transaction_reference,amount:p.amount,allocated:allocations.filter(a=>a.payment_id===p.id).reduce((s,a)=>s+n(a.allocated_amount),0),status:p.status,notes:p.notes}))));
    $("exportLedgerBtn").addEventListener("click",()=>exportRows("halal-food-supplier-ledger-"+today()+".csv",ledger.map(x=>({date:x.transaction_date,supplier:supplierName(x.supplier_id),type:x.transaction_type,reference:x.reference,description:x.description,change:x.balance_delta}))));
  };
  document.querySelectorAll("[data-supplier-tab]").forEach(a=>a.classList.toggle("active",a.dataset.supplierTab===(currentMode==="add"?"add":currentMode)));
  if(currentMode==="add"){
    await loadCommon();renderSupplierKpis();renderSuppliers();bindAddPage();resetSupplierForm();
  }else if(currentMode==="purchases"){
    await loadCommon();await loadPurchases();setPurchaseSuppliers();renderPurchasePage();bindPurchasePage();
  }else if(currentMode==="payments"){
    await loadCommon();await loadPayments();fillSupplierSelects();renderPayments();bindPaymentPage();
  }else throw new Error("Unknown supplier workspace page.");
  document.querySelector("[data-refresh-page]")?.addEventListener("click",async()=>{
    try{
      if(currentMode==="add"){await loadCommon();renderSupplierKpis();renderSuppliers();}
      if(currentMode==="purchases"){await loadCommon();await loadPurchases();setPurchaseSuppliers();renderPurchasePage();}
      if(currentMode==="payments"){await loadCommon();await loadPayments();fillSupplierSelects();renderPayments();}
      toast("Supplier workspace refreshed.");
    }catch(err){toast(err.message||"Refresh failed.","error");}
  });
};
  window.HFSupplierInit = HFSupplierInit;
})();
(function(root){
"use strict";
const toNumber=value=>{
 if(value===null||value===undefined||String(value).trim()==="")return null;
 const parsed=Number(value);
 return Number.isFinite(parsed)&&parsed>=0?parsed:null;
};
const round=value=>Number.isFinite(value)?Math.round((value+Number.EPSILON)*100)/100:null;
const percent=value=>Math.max(0,Math.min(100,Number(value)||0))/100;
function calculate(input){
 const purchaseQtyInput=toNumber(input.purchase_quantity);
 const saleableQtyInput=toNumber(input.saleable_quantity);
 const qty=purchaseQtyInput===null?1:purchaseQtyInput;
 const saleable=saleableQtyInput===null?qty:saleableQtyInput;
 const unitsPerOrderInput=toNumber(input.avg_units_per_order);
 const unitsPerOrder=unitsPerOrderInput===null?1:unitsPerOrderInput;
 const quantityValid=qty>0&&saleable>0&&unitsPerOrder>0;
 const safeSaleable=saleable>0?saleable:1;
 const safeUnitsPerOrder=unitsPerOrder>0?unitsPerOrder:1;
 const batchPurchase=toNumber(input.batch_purchase_total);
 const enteredUnit=toNumber(input.purchase_unit_cost);
 const unitPurchase=batchPurchase!==null?batchPurchase/safeSaleable:(enteredUnit||0);
 const sourceBatch=(toNumber(input.supplier_freight_total)||0)+(toNumber(input.loading_total)||0)+(toNumber(input.other_landed_total)||0);
 const otherBatch=toNumber(input.other_direct_batch_cost)||0;
 const sourcePerUnit=sourceBatch/safeSaleable;
 const otherBatchPerUnit=otherBatch/safeSaleable;
 const packaging=toNumber(input.packaging_unit_cost)||0;
 const label=toNumber(input.label_unit_cost)||0;
 const prep=toNumber(input.prep_unit_cost)||0;
 const otherDirect=toNumber(input.other_direct_unit_cost)||0;
 const monthly=toNumber(input.monthly_overhead);
 const monthlyUnits=toNumber(input.monthly_units);
 const overhead=monthly!==null&&monthlyUnits!==null&&monthlyUnits>0?monthly/monthlyUnits:0;
 const landed=unitPurchase+sourcePerUnit+otherBatchPerUnit;
 const prepCost=packaging+label+prep+otherDirect;
 const directCost=landed+prepCost;
 const fulfilment=((toNumber(input.courier_unit_cost)||0)+(toNumber(input.handling_unit_cost)||0)+(toNumber(input.ad_cost_per_order)||0))/safeUnitsPerOrder+(toNumber(input.return_reserve_per_unit)||0);
 const fixedCost=directCost+fulfilment+overhead;
 const delivery=(toNumber(input.customer_delivery_charge)||0)/safeUnitsPerOrder;
 const paymentRate=percent(input.payment_fee_pct);
 const marketplaceRate=percent(input.marketplace_fee_pct);
 const feeRate=paymentRate+marketplaceRate;
 const vatRate=percent(input.vat_pct);
 const vatInclusive=input.vat_mode!=="exclusive";
 const taxCoeff=vatInclusive?(vatRate/(1+vatRate)):0;
 const vatExclusiveRate=vatInclusive?0:vatRate;
 const priceCoefficient=1-taxCoeff-feeRate*(1+vatExclusiveRate);
 const fixedOffset=delivery*(1-feeRate)-fixedCost;
 const hasCostInput=[
  "purchase_unit_cost","batch_purchase_total","supplier_freight_total","loading_total","other_landed_total","other_direct_batch_cost",
  "packaging_unit_cost","label_unit_cost","prep_unit_cost","other_direct_unit_cost","courier_unit_cost","handling_unit_cost",
  "ad_cost_per_order","return_reserve_per_unit","monthly_overhead"
 ].some(key=>toNumber(input[key])!==null);
 const discountMode=input.discount_mode||"none";
 const discountValue=toNumber(input.discount_value)||0;
 const applyDiscount=listPrice=>{
  const list=Math.max(0,Number(listPrice)||0);
  if(discountMode==="percent")return list*(1-percent(discountValue));
  if(discountMode==="amount")return Math.max(0,list-discountValue);
  return list;
 };
 const listFromNet=net=>{
  if(discountMode==="percent"){
   const keep=1-percent(discountValue);
   return keep>0?net/keep:null;
  }
  if(discountMode==="amount")return net+discountValue;
  return net;
 };
 const profitAtNetPrice=netPrice=>{
  const x=Math.max(0,Number(netPrice)||0);
  const vat=vatInclusive?x*taxCoeff:x*vatRate;
  const taxableCheckout=vatInclusive?x:x*(1+vatRate);
  const feeBase=taxableCheckout+delivery;
  const fees=feeBase*feeRate;
  const netRevenue=(vatInclusive?x-vat:x)+delivery;
  const profit=netRevenue-fixedCost-fees;
  return {
   netProductPrice:round(x),vat:round(vat),fees:round(fees),netRevenue:round(netRevenue),profit:round(profit),
   margin:netRevenue>0?round(profit/netRevenue*100):null,
   markup:fixedCost>0?round(profit/fixedCost*100):null,
   customerPayable:round(x+(vatInclusive?0:vat)+delivery)
  };
 };
 const discountForNet=net=>{
  const list=listFromNet(net);
  return list===null?null:{list:round(list),net:round(net),discount:round(Math.max(0,list-net))};
 };
 let breakEvenNet=null;
 if(quantityValid&&(hasCostInput||delivery>0)){
  if(priceCoefficient>0)breakEvenNet=Math.max(0,(fixedCost-delivery*(1-feeRate))/priceCoefficient);
 }
 const breakEven=breakEvenNet===null?null:discountForNet(breakEvenNet);
 const targetValue=toNumber(input.target_value);
 const targetMode=input.target_mode||"margin";
 let targetNet=null;
 if(quantityValid&&hasCostInput&&targetValue!==null&&targetValue>0&&feeRate<1){
  if(targetMode==="margin"){
   if(targetValue<100){
    const margin=targetValue/100;
    const denominator=priceCoefficient-margin*(1-taxCoeff);
    if(denominator>0)targetNet=(fixedCost-delivery*(1-feeRate)+margin*delivery)/denominator;
   }
  }else if(targetMode==="markup"){
   if(priceCoefficient>0)targetNet=(fixedCost*(1+targetValue/100)-delivery*(1-feeRate))/priceCoefficient;
  }else if(targetMode==="fixed"){
   if(priceCoefficient>0)targetNet=(fixedCost+targetValue-delivery*(1-feeRate))/priceCoefficient;
  }
  if(targetNet!==null&&(!Number.isFinite(targetNet)||targetNet<0))targetNet=null;
 }
 const suggested=targetNet===null?null:discountForNet(targetNet);
 const manualList=toNumber(input.selling_price);
 const manualNet=manualList===null?null:applyDiscount(manualList);
 const manual=manualNet===null?null:profitAtNetPrice(manualNet);
 const compare=[1,2,3].map(index=>{
  const value=toNumber(input["compare_price_"+index]);
  if(value===null)return null;
  const net=applyDiscount(value);
  return {label:"Scenario "+String.fromCharCode(64+index),listPrice:round(value),...profitAtNetPrice(net)};
 }).filter(Boolean);
 const missing=[];
 if(enteredUnit===null&&batchPurchase===null)missing.push("purchase price");
 if(sourceBatch===0&&["supplier_freight_total","loading_total","other_landed_total"].every(key=>toNumber(input[key])===null))missing.push("sourcing / receiving costs");
 if(["packaging_unit_cost","label_unit_cost","prep_unit_cost","other_direct_unit_cost"].every(key=>toNumber(input[key])===null))missing.push("preparation / packaging costs");
 if(["courier_unit_cost","handling_unit_cost","ad_cost_per_order","return_reserve_per_unit"].every(key=>toNumber(input[key])===null))missing.push("delivery / order costs");
 if(["payment_fee_pct","marketplace_fee_pct","vat_pct"].every(key=>toNumber(input[key])===null))missing.push("sales fees / tax");
 if(monthly===null||monthlyUnits===null)missing.push("monthly overhead allocation");
 const warnings=[];
 if(purchaseQtyInput===0)warnings.push("Purchased quantity must be greater than zero.");
 if(saleableQtyInput===0)warnings.push("Saleable quantity must be greater than zero.");
 if(unitsPerOrderInput===0)warnings.push("Average product units per order must be greater than zero.");
 if(saleable>qty&&purchaseQtyInput!==null&&saleableQtyInput!==null)warnings.push("Saleable quantity is greater than purchased quantity. Confirm the quantities.");
 if(enteredUnit!==null&&batchPurchase!==null)warnings.push("Both unit purchase price and batch purchase amount are entered. Batch amount is used for the unit cost.");
 if(feeRate>=1)warnings.push("Combined payment and marketplace fee rates are 100% or more; a valid selling price cannot be calculated.");
 if(targetMode==="margin"&&targetValue!==null&&targetValue>=100)warnings.push("A target profit margin must be below 100%.");
 if(monthly!==null&&monthlyUnits===null||monthly===null&&monthlyUnits!==null)warnings.push("Monthly overhead is allocated only when both monthly overhead and expected monthly units are entered.");
 if(discountMode==="percent"&&discountValue>=100)warnings.push("A 100% discount leaves no product selling revenue.");
 if(!quantityValid)warnings.push("A positive purchase quantity, saleable quantity and average units per order are required for a valid unit calculation.");
 const hasCompleteCostBasis=(enteredUnit!==null||batchPurchase!==null)&&quantityValid;
 return {
  quantity:round(qty),saleableQuantity:round(saleable),unitsPerOrder:round(unitsPerOrder),quantityValid,unitPurchase:round(unitPurchase),sourcePerUnit:round(sourcePerUnit),otherBatchPerUnit:round(otherBatchPerUnit),
  landed:round(landed),packaging:round(packaging),label:round(label),prep:round(prep),otherDirect:round(otherDirect),prepCost:round(prepCost),
  directCost:round(directCost),fulfilment:round(fulfilment),overhead:round(overhead),fixedCost:round(fixedCost),feeRate:round(feeRate*100),vatRate:round(vatRate*100),
  breakEvenNet:round(breakEvenNet),breakEvenListPrice:breakEven?.list??null,breakEven, suggested, targetNet:round(targetNet), manual,manualListPrice:manualList===null?null:round(manualList),
  compare,missing,warnings,hasCostInput,hasCompleteCostBasis,priceCoefficient:round(priceCoefficient),deliveryCharge:round(delivery)
 };
}
root.HFBusinessPricingCore={calculate};
})(typeof window!=="undefined"?window:globalThis);

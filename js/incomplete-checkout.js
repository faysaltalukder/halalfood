(() => {
"use strict";
const form = document.getElementById("order-form");
if (!form) return;
const endpoint = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/incomplete-checkout";
const recoveryBox = document.getElementById("hf-recovery-consent");
const marketingBox = document.getElementById("hf-marketing-consent");
const sessionKey = "hf_incomplete_checkout_session_v1";
const consentKey = "hf_incomplete_checkout_consent_v1";
const marketingKey = "hf_incomplete_checkout_marketing_v1";
let saveTimer = 0;
let lastField = "";
let sending = Promise.resolve();

function makeUuid() {
 if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
 const bytes = crypto.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 15) | 64;
 bytes[8] = (bytes[8] & 63) | 128;
 const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2,"0")).join("");
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
function getSessionId() {
 let value = "";
 try { value = sessionStorage.getItem(sessionKey) || ""; } catch (_) {}
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
  value = makeUuid();
  try { sessionStorage.setItem(sessionKey,value); } catch (_) {}
 }
 return value;
}
function numberFromText(value) {
 const n = Number(String(value || "").replace(/[^0-9.]/g,""));
 return Number.isFinite(n) ? n : 0;
}
function checkoutItems() {
 if (window.HALAL_CART_MODE && window.HALAL_CART_API) {
  return window.HALAL_CART_API.read().slice(0,20).map((item) => ({
   name: String(item.name || "").slice(0,120),
   slug: String(item.slug || "").slice(0,90),
   quantity: Math.max(1,Math.min(999,Number(item.qty)||1)),
   price: Math.max(0,Number(item.price)||0)
  })).filter((item) => item.name);
 }
 const name = String(document.getElementById("product-display")?.textContent || document.getElementById("product")?.value || "").trim();
 if (!name || name.toLowerCase().includes("unavailable")) return [];
 const quantity = Math.max(1,Math.min(99,Number(document.getElementById("quantity")?.value)||1));
 const lineTotal = numberFromText(document.getElementById("product-line-total")?.textContent);
 const displayedUnit = numberFromText(document.getElementById("product-price")?.textContent);
 const price = lineTotal > 0 ? lineTotal / quantity : displayedUnit;
 return [{name:name.slice(0,120),slug:"",quantity,price:Math.max(0,price)}];
}
function fieldValue(id) {
 return String(document.getElementById(id)?.value || "").trim();
}
function buildPayload() {
 const items = checkoutItems();
 const subtotal = items.reduce((sum,item) => sum + item.price * item.quantity,0);
 const deliveryZone = form.querySelector('input[name="deliveryZone"]:checked')?.value || "";
 const deliveryCharge = deliveryZone === "inside_dhaka" ? 70 : deliveryZone === "outside_dhaka" ? 120 : 0;
 const fields = ["name","mobile","email","address","notes"];
 const done = fields.filter((id) => fieldValue(id)).length + (items.length ? 1 : 0) + (deliveryZone ? 1 : 0);
 const progress = Math.min(95,Math.round(done / 7 * 95));
 const currentField = lastField || "checkout";
 const step = ["name","mobile","email"].includes(currentField) ? "Customer details"
  : currentField === "address" ? "Delivery address"
  : currentField === "notes" ? "Order notes"
  : currentField === "delivery-inside-dhaka" || currentField === "delivery-outside-dhaka" ? "Delivery area"
  : "Product and order summary";
 return {
  action:"save",
  checkoutSessionId:getSessionId(),
  recoveryConsent:recoveryBox?.checked === true,
  marketingConsent:marketingBox?.checked === true,
  customerName:fieldValue("name"),
  customerPhone:fieldValue("mobile"),
  customerEmail:fieldValue("email"),
  deliveryAddress:fieldValue("address"),
  orderNotes:fieldValue("notes"),
  orderContext:window.HALAL_CART_MODE ? "cart" : "single",
  deliveryZone:deliveryZone,
  items:items,
  subtotal:subtotal,
  deliveryCharge:deliveryCharge,
  total:subtotal + deliveryCharge,
  lastStep:step,
  lastField:currentField,
  progressPercent:progress,
  honeypot:fieldValue("hf-website")
 };
}
function post(payload) {
 sending = sending.catch(() => {}).then(() => fetch(endpoint,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(payload),
  keepalive:true,
  credentials:"omit"
 })).then((response) => {
  if (!response.ok) throw new Error("Checkout progress request failed.");
  return response.json().catch(() => null);
 }).catch((error) => {
  console.warn("Incomplete checkout progress was not saved.",error);
  return null;
 });
 return sending;
}
function flush() {
 if (!recoveryBox?.checked) return;
 const payload = buildPayload();
 if (!payload.customerName && !payload.customerPhone && !payload.customerEmail) return;
 void post(payload);
}
function schedule(field) {
 if (field) lastField = field;
 window.clearTimeout(saveTimer);
 saveTimer = window.setTimeout(flush,1100);
}
if (recoveryBox) {
 try {
  if (sessionStorage.getItem(consentKey) === "yes") recoveryBox.checked = true;
  if (sessionStorage.getItem(marketingKey) === "yes" && marketingBox) marketingBox.checked = true;
 } catch (_) {}
 recoveryBox.addEventListener("change",() => {
  if (recoveryBox.checked) {
   try { sessionStorage.setItem(consentKey,"yes"); } catch (_) {}
   schedule("consent");
  } else {
   window.clearTimeout(saveTimer);
   try { sessionStorage.removeItem(consentKey); sessionStorage.removeItem(marketingKey); } catch (_) {}
   void post({action:"withdraw",checkoutSessionId:getSessionId()});
  }
 });
}
marketingBox?.addEventListener("change",() => {
 try {
  if (marketingBox.checked) sessionStorage.setItem(marketingKey,"yes");
  else sessionStorage.removeItem(marketingKey);
 } catch (_) {}
 if (recoveryBox?.checked) schedule("marketing-consent");
});
form.addEventListener("input",(event) => {
 const target = event.target;
 if (target && target.id && ["name","mobile","email","address","notes","quantity"].includes(target.id)) schedule(target.id);
});
form.addEventListener("change",(event) => {
 const target = event.target;
 if (target && (target.name === "deliveryZone" || target.id === "quantity")) schedule(target.id || "delivery-area");
});
form.addEventListener("focusout",(event) => {
 const target = event.target;
 if (target && target.id && ["name","mobile","email","address","notes"].includes(target.id)) schedule(target.id);
});
window.addEventListener("halalcart:updated",() => schedule("cart"));
window.addEventListener("halalcatalog:updated",() => schedule("product"));
document.addEventListener("visibilitychange",() => {
 if (document.visibilityState === "hidden") {
  window.clearTimeout(saveTimer);
  flush();
 }
});
window.addEventListener("pagehide",() => {
 window.clearTimeout(saveTimer);
 flush();
});
window.HFIncompleteCheckout = {
 getSessionId,
 complete: async (sessionId,orderNumber) => {
  if (!sessionId || !orderNumber) return;
  window.clearTimeout(saveTimer);
  if (recoveryBox?.checked) {
   const snapshot = buildPayload();
   if (snapshot.customerName || snapshot.customerPhone || snapshot.customerEmail) {
    await post(snapshot);
   }
  }
  const result = await post({action:"complete",checkoutSessionId:sessionId,orderNumber:String(orderNumber).slice(0,40)});
  try { sessionStorage.removeItem(sessionKey); sessionStorage.removeItem(consentKey); sessionStorage.removeItem(marketingKey); } catch (_) {}
  return result;
 }
};
})();
(() => {
"use strict";

const form = document.getElementById("order-form");
if (!form) return;

const endpoint = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/incomplete-checkout";
const NOTICE_VERSION = "2026-10-31-checkout-entry-v2";
const sessionKey = "hf_incomplete_checkout_session_v2";
let saveTimer = 0;
let lastField = "";
let lastQueuedSnapshot = "";
let sending = Promise.resolve();

function makeUuid() {
 if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
 const bytes = crypto.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 15) | 64;
 bytes[8] = (bytes[8] & 63) | 128;
 const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2,"0")).join("");
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20,32);
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
function fieldValue(id) {
 return String(document.getElementById(id)?.value || "").trim();
}
function phoneIsValid(value) {
 return /^01[0-9]{9}$/.test(String(value || "").replace(/\D/g,""));
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
function buildPayload() {
 const items = checkoutItems();
 const subtotal = items.reduce((sum,item) => sum + item.price * item.quantity,0);
 const deliveryZone = form.querySelector('input[name="deliveryZone"]:checked')?.value || "";
 const deliveryCharge = deliveryZone === "inside_dhaka" ? 70 : deliveryZone === "outside_dhaka" ? 120 : 0;
 const fields = ["name","mobile","email"];
 const done = fields.filter((id) => fieldValue(id)).length + (items.length ? 1 : 0) + (deliveryZone ? 1 : 0);
 const progress = Math.min(95,Math.round(done / 5 * 95));
 const currentField = lastField || "checkout";
 const step = ["name","mobile","email"].includes(currentField) ? "Customer details"
  : currentField === "delivery-inside-dhaka" || currentField === "delivery-outside-dhaka" ? "Delivery area"
  : "Product and order summary";
 return {
  action:"save",
  checkoutSessionId:getSessionId(),
  privacyNoticeVersion:NOTICE_VERSION,
  customerName:fieldValue("name"),
  customerPhone:fieldValue("mobile"),
  customerEmail:fieldValue("email"),
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
 })).then(async (response) => {
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) throw new Error(result?.error || "Checkout progress request failed.");
  return result;
 }).catch((error) => {
  console.warn("Incomplete checkout progress was not saved.",error);
  return null;
 });
 return sending;
}
async function flush() {
 if (!phoneIsValid(fieldValue("mobile"))) return null;
 const payload = buildPayload();
 const snapshot = JSON.stringify(payload);
 if (snapshot === lastQueuedSnapshot) return null;
 lastQueuedSnapshot = snapshot;
 const result = await post(payload);
 if (!result?.saved) lastQueuedSnapshot = "";
 return result;
}
function schedule(field) {
 if (field) lastField = field;
 window.clearTimeout(saveTimer);
 if (!phoneIsValid(fieldValue("mobile"))) return;
 saveTimer = window.setTimeout(() => { void flush(); },1100);
}
function removeSessionData() {
 try { sessionStorage.removeItem(sessionKey); } catch (_) {}
}

form.addEventListener("input",(event) => {
 const target = event.target;
 if (target && target.id && ["name","mobile","email","quantity"].includes(target.id)) schedule(target.id);
});
form.addEventListener("change",(event) => {
 const target = event.target;
 if (target && (target.name === "deliveryZone" || target.id === "quantity")) schedule(target.id || "delivery-area");
});
form.addEventListener("focusout",(event) => {
 const target = event.target;
 if (target && target.id && ["name","mobile","email"].includes(target.id)) schedule(target.id);
});
window.addEventListener("halalcart:updated",() => schedule("cart"));
window.addEventListener("halalcatalog:updated",() => schedule("product"));
document.addEventListener("visibilitychange",() => {
 if (document.visibilityState === "hidden") {
  window.clearTimeout(saveTimer);
  void flush();
 }
});
window.addEventListener("pagehide",() => {
 window.clearTimeout(saveTimer);
 void flush();
});

window.HFIncompleteCheckout = {
 getSessionId: () => phoneIsValid(fieldValue("mobile")) ? getSessionId() : "",
 complete: async (sessionId,orderNumber) => {
  if (!sessionId || !orderNumber) return;
  window.clearTimeout(saveTimer);
  if (phoneIsValid(fieldValue("mobile"))) await flush();
  await post({action:"complete",checkoutSessionId:sessionId,orderNumber:String(orderNumber).slice(0,40)});
  removeSessionData();
 }
};
})();
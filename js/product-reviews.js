(() => {
"use strict";
if (window.__HF_PRODUCT_REVIEWS_V2__) return;
window.__HF_PRODUCT_REVIEWS_V2__ = true;

const API = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const PAGE_SIZE = 5;
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const path = location.pathname || "";
const slug = /\/products\/[^/]+\.html$/i.test(path)
  ? path.split("/").pop().replace(/\.html$/i, "")
  : (new URLSearchParams(location.search).get("slug") || "");
if (!slug) return;

const $ = selector => document.querySelector(selector);
const stars = rating => {
  const count = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(count) + "☆".repeat(5 - count);
};
const headers = () => ({apikey:KEY, Authorization:"Bearer " + KEY, Accept:"application/json"});
async function getJson(url, extraHeaders = {}) {
  const response = await fetch(url, {headers:{...headers(), ...extraHeaders}, cache:"no-store"});
  if (!response.ok) throw new Error("Review data unavailable (" + response.status + ").");
  return response.json();
}
async function postReview(url, payload) {
  const response = await fetch(url, {
    method:"POST",
    headers:{...headers(), "Content-Type":"application/json", Prefer:"return=minimal"},
    body:JSON.stringify(payload)
  });
  if (!response.ok) {
    let message = "Review could not be submitted.";
    try { const data = await response.json(); message = data.message || data.details || message; } catch (_) {}
    throw new Error(message);
  }
}
const dateLabel = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-BD", {year:"numeric", month:"short", day:"numeric"});
};

const style = document.createElement("style");
style.textContent = `
.hf-public-reviews{--hf-copper:#c97b3d;--hf-ink:#2b2a3d;--hf-muted:#77716a;--hf-line:#e9e1d6;max-width:1120px;margin:14px auto 18px;padding:12px 15px;background:#fffdf8;border:1px solid var(--hf-line);border-radius:12px;color:var(--hf-ink);box-shadow:0 3px 12px rgba(43,42,61,.025)}
.hf-reviews-kicker{margin:0 0 2px;color:#a96d36;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.hf-reviews-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}
.hf-reviews-heading h2{margin:0;font-size:17px;line-height:1.25;font-weight:800;color:var(--hf-ink)}
.hf-review-write{display:inline-flex;align-items:center;gap:6px;border:1px solid #d8b08e;border-radius:8px;background:#fff8f0;color:#87512c;padding:7px 10px;font-family:inherit;font-size:11px;font-weight:750;cursor:pointer;white-space:nowrap}
.hf-review-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:7px 0 8px;color:var(--hf-muted);font-size:11px}
.hf-review-average{font-size:20px;font-weight:850;line-height:1;color:#9c632f}
.hf-review-stars{color:#c58a3b;letter-spacing:1px;white-space:nowrap}
.hf-review-count{font-size:11px}
.hf-review-empty{margin:0;padding:9px 10px;border-radius:8px;background:#f8f5ef;color:#77716a;font-size:12px;line-height:1.45}
.hf-review-item{padding:9px 11px;border:1px solid #eee7dc;border-radius:9px;background:#fbf9f4}
.hf-review-item-head{display:flex;align-items:center;justify-content:space-between;gap:7px;flex-wrap:wrap}
.hf-review-item-head strong{font-size:12px}
.hf-review-item small{display:block;margin-top:2px;color:#858078;font-size:10px}
.hf-review-item p{margin:5px 0 0;font-size:12px;line-height:1.5;white-space:pre-line;overflow-wrap:anywhere}
.hf-review-verified{font-size:9px;font-weight:750;color:#45664f;background:#edf3ed;padding:2px 6px;border-radius:99px}
.hf-review-actions{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:7px}
.hf-review-link{border:0;background:transparent;padding:4px 6px;color:#985b2e;font-family:inherit;font-size:11px;font-weight:750;cursor:pointer}
.hf-review-form-wrap{margin-top:10px;padding-top:10px;border-top:1px solid var(--hf-line)}
.hf-review-form{display:grid;gap:8px}
.hf-review-form[hidden],.hf-review-form-wrap[hidden],.hf-review-all[hidden]{display:none!important}
.hf-review-form-title{font-size:13px;font-weight:800}
.hf-review-product{margin:-4px 0 0;color:var(--hf-muted);font-size:10px}
.hf-review-form label{display:grid;gap:4px;font-size:11px;font-weight:750;color:#514d49}
.hf-review-form input,.hf-review-form textarea{box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid #ded7cc;border-radius:8px;background:#fff;color:var(--hf-ink);font:inherit;font-size:12px}
.hf-review-form textarea{resize:vertical;min-height:66px}
.hf-review-rating{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:2px;width:max-content}
.hf-review-rating input{position:absolute;opacity:0;width:1px;height:1px;clip:rect(0,0,0,0);overflow:hidden}
.hf-review-rating label{display:block;cursor:pointer;color:#cfc7bc;font-size:25px;line-height:1;padding:0 1px}
.hf-review-rating label:hover,.hf-review-rating label:hover~label,.hf-review-rating input:checked+label,.hf-review-rating input:checked~label{color:#c58a3b}
.hf-review-rating-hint{font-size:10px;color:var(--hf-muted)}
.hf-review-submit{justify-self:start;border:0;border-radius:8px;background:var(--hf-copper);color:#fff;padding:9px 14px;font-size:11px;font-weight:800;cursor:pointer}
.hf-review-submit:disabled{opacity:.6;cursor:wait}
.hf-review-message{margin:0;color:#77716a;font-size:10px;line-height:1.45}
.hf-review-message.error{color:#a33e32}
.hf-review-all{display:grid;gap:7px;margin-top:7px}
.hf-review-pagination{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:5px}
.hf-review-pagination[hidden]{display:none}
@media(max-width:600px){.hf-public-reviews{margin:10px 10px 14px;padding:10px 11px;border-radius:10px}.hf-reviews-heading h2{font-size:16px}.hf-review-summary{margin:6px 0 7px;gap:6px}.hf-review-item{padding:8px 9px}.hf-review-item p{font-size:11px;line-height:1.45}.hf-review-write{padding:6px 8px;font-size:10px}.hf-review-rating label{font-size:24px}}
:root[data-theme="dark"] .hf-public-reviews,html[data-theme="dark"] .hf-public-reviews,body.dark .hf-public-reviews,body.dark-mode .hf-public-reviews,body.theme-dark .hf-public-reviews{--hf-ink:#f2f0ea;--hf-muted:#b6b1bf;--hf-line:#454253;background:#242333;border-color:#454253;color:#f2f0ea;box-shadow:none}
:root[data-theme="dark"] .hf-review-item,html[data-theme="dark"] .hf-review-item,body.dark .hf-review-item,body.dark-mode .hf-review-item,body.theme-dark .hf-review-item{background:#2d2b3c;border-color:#464354}
:root[data-theme="dark"] .hf-review-empty,html[data-theme="dark"] .hf-review-empty,body.dark .hf-review-empty,body.dark-mode .hf-review-empty,body.theme-dark .hf-review-empty{background:#302e40;color:#c5c0cc}
:root[data-theme="dark"] .hf-review-item p,html[data-theme="dark"] .hf-review-item p,body.dark .hf-review-item p,body.dark-mode .hf-review-item p,body.theme-dark .hf-review-item p{color:#e5e1e9}
:root[data-theme="dark"] .hf-review-write,html[data-theme="dark"] .hf-review-write,body.dark .hf-review-write,body.dark-mode .hf-review-write,body.theme-dark .hf-review-write{background:#3a3140;color:#f2d4b8;border-color:#755337}

/* Mobile-first refinement: keep the review block readable without pushing the product page too far down. */
.hf-public-reviews{width:min(100% - 28px,1120px);box-sizing:border-box}
.hf-review-form-wrap,.hf-review-form,.hf-review-form label{min-width:0}
.hf-review-form input,.hf-review-form textarea{box-sizing:border-box;min-width:0;max-width:100%;min-height:40px}
.hf-review-form textarea{min-height:76px}
.hf-review-submit,.hf-review-write,.hf-review-link{touch-action:manipulation}
.hf-review-write:focus-visible,.hf-review-link:focus-visible,.hf-review-submit:focus-visible,.hf-review-form input:focus-visible,.hf-review-form textarea:focus-visible{outline:2px solid #c97b3d;outline-offset:3px}
.hf-review-item{min-width:0;overflow-wrap:anywhere}
.hf-review-item-head>span{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap}
.hf-review-item p{overflow-wrap:anywhere;word-break:normal}
@media(min-width:601px){
 .hf-public-reviews{padding:14px 18px;margin-top:16px;margin-bottom:20px}
 .hf-review-form{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;column-gap:14px;row-gap:10px}
 .hf-review-form-title,.hf-review-product,.hf-review-form>div,.hf-review-form>label:nth-of-type(2),.hf-review-message,.hf-review-submit{grid-column:1/-1}
 .hf-review-form label:first-of-type{grid-column:1}
}
@media(max-width:600px){
 .hf-public-reviews{width:calc(100% - 20px);margin:9px auto 13px;padding:10px;border-radius:10px}
 .hf-reviews-kicker{font-size:8px;letter-spacing:.11em}
 .hf-reviews-heading{align-items:center;gap:7px}
 .hf-reviews-heading h2{font-size:15px;line-height:1.2}
 .hf-review-write{min-height:34px;padding:6px 8px;gap:4px;font-size:10px;border-radius:7px}
 .hf-review-form-wrap{margin-top:8px;padding-top:9px}
 .hf-review-form{gap:8px}
 .hf-review-form-title{font-size:12px}
 .hf-review-form label{font-size:10px;gap:4px}
 .hf-review-form input,.hf-review-form textarea{font-size:16px;min-height:42px;padding:9px 10px;border-radius:7px}
 .hf-review-form textarea{min-height:84px}
 .hf-review-rating label{font-size:27px;padding:2px 3px;min-width:27px;text-align:center}
 .hf-review-submit{width:100%;min-height:42px;justify-self:stretch;font-size:12px}
 .hf-review-summary{gap:6px;margin:7px 0;font-size:10px}
 .hf-review-average{font-size:19px}
 .hf-review-stars{font-size:12px;letter-spacing:.5px}
 .hf-review-count{font-size:10px}
 .hf-review-item{padding:8px 9px;border-radius:8px}
 .hf-review-item-head{align-items:flex-start;gap:5px}
 .hf-review-item-head strong{font-size:11px}
 .hf-review-item small{font-size:9px}
 .hf-review-item p{font-size:11px;line-height:1.45;margin-top:4px}
 .hf-review-actions{margin-top:5px}
 .hf-review-link{font-size:11px;padding:7px 8px;min-height:34px}
 .hf-review-pagination{flex-wrap:wrap}
}
@media(max-width:380px){
 .hf-public-reviews{width:calc(100% - 16px);padding:9px}
 .hf-reviews-heading h2{font-size:14px}
 .hf-review-write{font-size:9px;padding:5px 7px}
 .hf-review-summary{gap:5px}
 .hf-review-item-head{flex-direction:column;align-items:flex-start}
 .hf-review-item-head>span{align-self:flex-start}
}

/* Refined responsive review presentation: muted on mobile, editorial layout on desktop. */
.hf-public-reviews{
 --hf-review-surface:#f3eee5;
 --hf-review-card:#ece5da;
 --hf-review-field:#f8f4ed;
 --hf-review-border:#e1d7c9;
 --hf-review-ink:#373343;
 --hf-review-muted:#77716a;
 --hf-review-accent:#a96d3b;
 background:var(--hf-review-surface);
 border-color:var(--hf-review-border);
 color:var(--hf-review-ink);
 box-shadow:0 5px 18px rgba(58,48,38,.045);
}
.hf-review-item{background:var(--hf-review-card);border-color:var(--hf-review-border)}
.hf-review-empty{background:var(--hf-review-card);color:var(--hf-review-muted)}
.hf-review-form-wrap{border-color:var(--hf-review-border)}
.hf-review-form input,.hf-review-form textarea{background:var(--hf-review-field);border-color:#d9cfc1;color:var(--hf-review-ink)}
.hf-review-form label{color:#59534e}
.hf-review-form-title{color:var(--hf-review-ink)}
.hf-review-write{background:#eee4d7;border-color:#d5b99b;color:#80542f}
.hf-review-write:hover{background:#e8dac8}
.hf-review-submit{background:#a96d3b}
.hf-review-link{color:#8c592f}
.hf-review-average{color:#98612f}
.hf-review-stars{color:#b98543}
@media(min-width:761px){
 .hf-public-reviews{
  width:min(calc(100% - 64px),1160px);
  max-width:1160px;
  margin:28px auto 34px;
  padding:25px 30px 26px;
  border-radius:18px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  column-gap:24px;
  row-gap:12px;
  background:linear-gradient(135deg,#f4efe6 0%,#eee7dc 100%);
  box-shadow:0 12px 30px rgba(58,48,38,.055);
 }
 .hf-reviews-kicker{grid-column:1/-1;margin:0;color:#98704b;font-size:10px;letter-spacing:.18em}
 .hf-reviews-heading{grid-column:1/-1;align-items:center;gap:20px;padding-bottom:13px;border-bottom:1px solid #dfd4c5}
 .hf-reviews-heading h2{font-size:24px;letter-spacing:-.025em}
 .hf-review-write{padding:10px 15px;font-size:12px;border-radius:10px;background:#e9ddcd;border-color:#d5b99b}
 .hf-review-summary{grid-column:1/-1;display:flex;align-items:center;gap:13px;margin:3px 0 5px;padding:13px 16px;border:1px solid #e1d6c8;border-radius:12px;background:rgba(232,224,212,.72);font-size:13px}
 .hf-review-average{font-size:28px}
 .hf-review-stars{font-size:17px;letter-spacing:2px}
 .hf-review-count{font-size:12px;color:#746c63}
 #hfReviewLatest{grid-column:1/-1}
 .hf-review-item{display:grid;grid-template-columns:minmax(170px,.28fr) minmax(0,1fr);column-gap:22px;align-items:center;padding:19px 21px;border-radius:13px;background:#eae2d6;border-color:#ded2c2}
 .hf-review-item-head{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px}
 .hf-review-item-head strong{font-size:14px;color:#3c3742}
 .hf-review-item-head>span{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
 .hf-review-item-head .hf-review-stars{font-size:15px;letter-spacing:1px}
 .hf-review-item small{grid-column:1;grid-row:2;margin-top:6px;font-size:11px}
 .hf-review-item p{grid-column:2;grid-row:1/3;margin:0;padding-left:22px;border-left:1px solid #d8cbbb;font-size:14px;line-height:1.7;color:#514b49}
 .hf-review-verified{font-size:10px}
 .hf-review-actions{grid-column:1/-1;margin:11px 0 0}
 .hf-review-link{font-size:12px;padding:8px 12px;border-radius:8px}
 .hf-review-all{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
 .hf-review-all .hf-review-item{grid-template-columns:minmax(120px,.38fr) minmax(0,1fr);column-gap:14px;padding:15px}
 .hf-review-all .hf-review-item p{font-size:12px;padding-left:14px}
 .hf-review-pagination{grid-column:1/-1;margin-top:8px}
 .hf-review-form-wrap{grid-column:1/-1;margin-top:8px;padding:18px 20px;border:1px solid #e1d6c8;border-radius:13px;background:#eee7dc}
 .hf-review-form{grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:18px;row-gap:13px}
 .hf-review-form-title,.hf-review-product,.hf-review-message,.hf-review-submit{grid-column:1/-1}
 .hf-review-form label{font-size:12px}
 .hf-review-form input,.hf-review-form textarea{padding:11px 13px;font-size:13px;border-radius:9px}
 .hf-review-form textarea{min-height:90px}
 .hf-review-rating label{font-size:29px}
 .hf-review-submit{padding:11px 18px;font-size:12px}
}
@media(max-width:760px){
 .hf-public-reviews{background:#f2ede4;border-color:#e3d9cb;box-shadow:0 2px 8px rgba(58,48,38,.035)}
 .hf-review-item{background:#ebe4d9;border-color:#dfd5c8}
 .hf-review-empty{background:#ebe4d9}
 .hf-review-form input,.hf-review-form textarea{background:#f7f2ea;border-color:#ddd2c4}
 .hf-review-write{background:#ece1d3;border-color:#d9bea2}
}
:root[data-theme="dark"] .hf-public-reviews,html[data-theme="dark"] .hf-public-reviews,body.dark .hf-public-reviews,body.dark-mode .hf-public-reviews,body.theme-dark .hf-public-reviews{
 --hf-review-surface:#292735;--hf-review-card:#333140;--hf-review-field:#302e3b;--hf-review-border:#494555;
 --hf-review-ink:#eee9e1;--hf-review-muted:#b8b1a8;background:#292735;border-color:#494555;color:#eee9e1
}
:root[data-theme="dark"] .hf-review-item,html[data-theme="dark"] .hf-review-item,body.dark .hf-review-item,body.dark-mode .hf-review-item,body.theme-dark .hf-review-item{background:#333140;border-color:#494555}
:root[data-theme="dark"] .hf-review-form input,html[data-theme="dark"] .hf-review-form input,body.dark .hf-review-form input,body.dark-mode .hf-review-form input,body.theme-dark .hf-review-form input,
:root[data-theme="dark"] .hf-review-form textarea,html[data-theme="dark"] .hf-review-form textarea,body.dark .hf-review-form textarea,body.dark-mode .hf-review-form textarea,body.theme-dark .hf-review-form textarea{background:#302e3b;border-color:#514d5b;color:#eee9e1}
@media(min-width:761px) and (prefers-reduced-motion:no-preference){
 .hf-public-reviews,.hf-review-item{transition:box-shadow .2s ease,border-color .2s ease}
 .hf-review-item:hover{box-shadow:0 7px 18px rgba(40,34,28,.06);border-color:#d2c2ad}
}

/* Clear desktop/mobile art direction — v8 */
.hf-public-reviews{
 --hf-review-surface:#eee7dc;
 --hf-review-card:#e6dccf;
 --hf-review-field:#f5efe6;
 --hf-review-border:#d8cbbb;
 --hf-review-ink:#302d3b;
 --hf-review-muted:#70695f;
 --hf-review-accent:#a76532;
 background:var(--hf-review-surface)!important;
 border:1px solid var(--hf-review-border)!important;
 color:var(--hf-review-ink)!important;
}
.hf-review-item{background:var(--hf-review-card)!important;border-color:#d7cabb!important}
.hf-review-empty{background:var(--hf-review-card)!important;color:var(--hf-review-muted)!important}
.hf-review-form-wrap{background:#e9e0d4;border:1px solid #d8cbbb;border-radius:12px}
.hf-review-form input,.hf-review-form textarea{background:var(--hf-review-field)!important;border-color:#d5c9b9!important;color:var(--hf-review-ink)!important}
.hf-review-write{background:#e5d5c2!important;border-color:#cdb18f!important;color:#704523!important}
.hf-review-submit{background:#98602f!important}
.hf-review-link{color:#87552f!important}
@media(min-width:761px){
 .hf-public-reviews{
  width:min(calc(100% - 72px),1180px)!important;
  max-width:1180px!important;
  margin:34px auto 42px!important;
  padding:30px 34px 32px!important;
  border-radius:20px!important;
  display:grid!important;
  grid-template-columns:minmax(220px,.72fr) minmax(0,1.8fr)!important;
  grid-template-rows:auto auto auto auto!important;
  align-items:stretch!important;
  column-gap:26px!important;
  row-gap:17px!important;
  background:linear-gradient(145deg,#eee7dc 0%,#e8dfd2 100%)!important;
  box-shadow:0 15px 38px rgba(50,42,32,.09)!important;
 }
 .hf-reviews-kicker{grid-column:1/-1!important;margin:0!important;color:#8b633f!important;font-size:10px!important;letter-spacing:.2em!important}
 .hf-reviews-heading{grid-column:1/-1!important;padding:0 0 18px!important;border-bottom:1px solid #d5c8b7!important}
 .hf-reviews-heading h2{font-size:27px!important;letter-spacing:-.035em!important}
 .hf-review-write{padding:11px 17px!important;font-size:12px!important;border-radius:10px!important;background:#dfcfbb!important}
 .hf-review-summary{
  grid-column:1!important;grid-row:3!important;
  align-self:stretch!important;display:flex!important;flex-direction:column!important;
  align-items:flex-start!important;justify-content:center!important;gap:12px!important;
  margin:0!important;padding:25px 24px!important;
  border:1px solid #d5c6b3!important;border-radius:16px!important;
  background:linear-gradient(160deg,#e1d3c0 0%,#e9dfd2 100%)!important;
  box-shadow:inset 0 1px rgba(255,255,255,.42)!important;
 }
 .hf-review-average{font-size:52px!important;line-height:1!important;color:#87552e!important;letter-spacing:-.06em!important}
 .hf-review-summary .hf-review-stars{font-size:21px!important;letter-spacing:3px!important}
 .hf-review-count{font-size:12px!important;color:#706354!important}
 #hfReviewLatest{grid-column:2!important;grid-row:3!important;align-self:stretch!important}
 .hf-review-item{height:100%;box-sizing:border-box;grid-template-columns:minmax(145px,.42fr) minmax(0,1fr)!important;column-gap:23px!important;align-content:center!important;padding:25px 26px!important;border-radius:16px!important;background:#e3d8c9!important;border-color:#d3c5b4!important}
 .hf-review-item-head{gap:10px!important}
 .hf-review-item-head strong{font-size:15px!important;color:#353140!important}
 .hf-review-item-head .hf-review-stars{font-size:16px!important}
 .hf-review-item small{font-size:11px!important;color:#776d61!important}
 .hf-review-item p{font-size:15px!important;line-height:1.85!important;padding-left:25px!important;border-left:1px solid #cdbda9!important;color:#49433e!important}
 .hf-review-actions{grid-column:2!important;grid-row:4!important;justify-content:flex-start!important;margin:0!important}
 .hf-review-link{font-size:12px!important;padding:9px 13px!important;border-radius:8px!important;background:#e1d5c5!important}
 .hf-review-all{grid-column:1/-1!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;margin-top:2px!important}
 .hf-review-all .hf-review-item{height:auto!important;padding:18px!important;grid-template-columns:minmax(110px,.42fr) minmax(0,1fr)!important}
 .hf-review-all .hf-review-item p{font-size:13px!important}
 .hf-review-pagination{grid-column:1/-1!important}
 .hf-review-form-wrap{grid-column:1/-1!important;grid-row:5!important;margin:2px 0 0!important;padding:22px 24px!important;background:#e8dfd3!important;border-color:#d5c8b8!important;border-radius:15px!important}
 .hf-review-form{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:15px 22px!important}
 .hf-review-form-title,.hf-review-product,.hf-review-message,.hf-review-submit{grid-column:1/-1!important}
 .hf-review-form input,.hf-review-form textarea{padding:12px 14px!important;font-size:14px!important}
}
@media(max-width:760px){
 .hf-public-reviews{
  width:calc(100% - 20px)!important;margin:10px auto 14px!important;padding:11px!important;
  border-radius:11px!important;background:#f0e9df!important;border-color:#dfd4c6!important;
  box-shadow:0 2px 8px rgba(58,48,38,.035)!important;display:block!important;
 }
 .hf-reviews-heading h2{font-size:15px!important}
 .hf-review-summary{margin:7px 0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;flex-direction:row!important;align-items:center!important}
 .hf-review-average{font-size:19px!important}
 .hf-review-item{height:auto!important;padding:9px 10px!important;background:#e8dfd3!important;border-color:#ded2c3!important}
 .hf-review-item p{padding:0!important;border:0!important;font-size:11px!important;line-height:1.5!important;color:#504940!important}
 .hf-review-form-wrap{background:#ebe2d6!important;padding:10px!important}
 .hf-review-form input,.hf-review-form textarea{background:#f6f0e7!important}
 .hf-review-write{min-height:34px!important}
}
`;document.head.appendChild(style);

async function init() {
  const productParams = new URLSearchParams({select:"id,name,slug,sku", slug:"eq." + slug, is_active:"eq.true", limit:"1"});
  const products = await getJson(API + "/rest/v1/products?" + productParams.toString());
  const product = products[0];
  if (!product) return;

  const related = $("#related-section");
  const detail = $("#product-detail") || $(".product-detail");
  if (!related && !detail) return;
  if ($(".hf-public-reviews")) return;

  const section = document.createElement("section");
  section.className = "hf-public-reviews";
  section.setAttribute("aria-labelledby", "hfReviewsTitle");
  section.innerHTML = `
    <p class="hf-reviews-kicker">CUSTOMER FEEDBACK</p>
    <div class="hf-reviews-heading">
      <h2 id="hfReviewsTitle">Product Reviews</h2>
      <button class="hf-review-write" id="hfReviewWrite" type="button" aria-expanded="false" aria-controls="hfReviewFormWrap"><span aria-hidden="true">✎</span> Write a Review</button>
    </div>
    <div class="hf-review-form-wrap" id="hfReviewFormWrap" hidden>
      <form class="hf-review-form" id="hfReviewForm">
        <strong class="hf-review-form-title">Share your experience</strong>
        <p class="hf-review-product">Reviewing: <strong>${esc(product.name)}</strong></p>
        <label>Your name<input id="hfReviewName" name="reviewer_name" maxlength="80" minlength="2" autocomplete="name" required placeholder="Enter your name"></label>
        <div>
          <span class="hf-review-form-label" style="display:block;font-size:11px;font-weight:750;color:#514d49;margin-bottom:6px">Your rating</span>
          <div class="hf-review-rating" role="radiogroup" aria-label="Choose a rating from one to five stars">
            ${[5,4,3,2,1].map(value => `<input type="radio" id="hfReviewRating${value}" name="rating" value="${value}" required><label for="hfReviewRating${value}" title="${value} out of 5 stars" aria-label="${value} out of 5 stars">★</label>`).join("")}
          </div>
          <span class="hf-review-rating-hint" id="hfReviewRatingHint" aria-live="polite">Select 1 to 5 stars</span>
        </div>
        <label>Your review<textarea id="hfReviewText" name="review_text" rows="3" minlength="10" maxlength="1200" required placeholder="What did you like about this product?"></textarea></label>
        <p class="hf-review-message" id="hfReviewMessage">Your review will be checked before it appears publicly.</p>
        <button class="hf-review-submit" type="submit">Submit Review</button>
      </form>
    </div>
    <div class="hf-review-summary" id="hfReviewSummary" aria-live="polite">Loading reviews…</div>
    <div id="hfReviewLatest"></div>
    <div class="hf-review-actions" id="hfReviewActions" hidden>
      <button class="hf-review-link" id="hfReviewToggle" type="button" aria-expanded="false" aria-controls="hfReviewAll">Show more reviews</button>
    </div>
    <div class="hf-review-all" id="hfReviewAll" hidden></div>
    <div class="hf-review-pagination" id="hfReviewPagination" hidden>
      <button class="hf-review-link" id="hfReviewMore" type="button">Load 5 more reviews</button>
      <span class="hf-review-count" id="hfReviewPageCount"></span>
    </div>`;
  if (related) related.insertAdjacentElement("beforebegin", section);
  else detail.insertAdjacentElement("afterend", section);

  const summary = $("#hfReviewSummary");
  const latest = $("#hfReviewLatest");
  const actions = $("#hfReviewActions");
  const toggle = $("#hfReviewToggle");
  const all = $("#hfReviewAll");
  const pagination = $("#hfReviewPagination");
  const more = $("#hfReviewMore");
  const pageCount = $("#hfReviewPageCount");
  const formWrap = $("#hfReviewFormWrap");
  const form = $("#hfReviewForm");
  const message = $("#hfReviewMessage");
  const write = $("#hfReviewWrite");
  let publishedCount = 0;
  let loadedRows = 0;
  let loadingMore = false;
  let expanded = false;

  const renderReview = row => {
    
    const verified = row.verified_purchase === true ? '<span class="hf-review-verified">Verified purchase</span>' : "";
    return `<article class="hf-review-item">
      <div class="hf-review-item-head"><strong>${esc(row.reviewer_name || "Customer")}</strong><span><span class="hf-review-stars" aria-label="${Number(row.rating)||0} out of 5 stars">${stars(row.rating)}</span> ${verified}</span></div>
      <small>${esc(dateLabel(row.created_at))}</small>
      <p>${esc(row.review_text)}</p>
    </article>`;
  };

  async function loadSummary() {
    // Fetch only rating values in bounded pages so the average and distribution
    // are calculated across every published review, not merely the latest 30.
    const ratings = [];
    let offset = 0;
    const chunk = 500;
    while (true) {
      const params = new URLSearchParams({select:"rating", product_id:"eq." + product.id, status:"eq.published", order:"created_at.desc", limit:String(chunk), offset:String(offset)});
      const rows = await getJson(API + "/rest/v1/product_reviews?" + params.toString());
      ratings.push(...rows.map(row => Number(row.rating)).filter(value => value >= 1 && value <= 5));
      if (rows.length < chunk) break;
      offset += chunk;
      if (offset >= 50000) break;
    }
    publishedCount = ratings.length;
    const average = publishedCount ? ratings.reduce((sum, value) => sum + value, 0) / publishedCount : 0;
    summary.innerHTML = publishedCount
      ? `<strong class="hf-review-average">${average.toFixed(1)}</strong><span class="hf-review-stars" aria-label="${average.toFixed(1)} out of 5 stars">${stars(Math.round(average))}</span><span class="hf-review-count">${publishedCount} published review${publishedCount === 1 ? "" : "s"}</span>`
      : '<span class="hf-review-count">No published reviews yet</span>';
    if (offset >= 50000) summary.insertAdjacentHTML("beforeend", '<span class="hf-review-count"> · summary covers first 50,000 records</span>');
  }

  async function loadLatest() {
    const params = new URLSearchParams({select:"reviewer_name,rating,review_text,source,verified_purchase,created_at", product_id:"eq." + product.id, status:"eq.published", order:"created_at.desc", limit:"1"});
    const rows = await getJson(API + "/rest/v1/product_reviews?" + params.toString());
    latest.innerHTML = rows.length ? renderReview(rows[0]) : '<p class="hf-review-empty">No reviews yet. Be the first to share your experience with this product.</p>';
    actions.hidden = publishedCount <= 1;
  }

  async function loadMore() {
    if (loadingMore || loadedRows >= publishedCount) return;
    loadingMore = true;
    more.disabled = true;
    more.textContent = "Loading…";
    try {
      const params = new URLSearchParams({select:"reviewer_name,rating,review_text,source,verified_purchase,created_at", product_id:"eq." + product.id, status:"eq.published", order:"created_at.desc", limit:String(PAGE_SIZE), offset:String(1 + loadedRows)});
      const rows = await getJson(API + "/rest/v1/product_reviews?" + params.toString());
      all.insertAdjacentHTML("beforeend", rows.map(renderReview).join(""));
      loadedRows += rows.length;
      pagination.hidden = loadedRows >= publishedCount - 1;
      pageCount.textContent = Math.min(loadedRows + 1, publishedCount) + " of " + publishedCount;
    } finally {
      loadingMore = false;
      more.disabled = false;
      more.textContent = "Load 5 more reviews";
    }
  }

  write.addEventListener("click", () => {
    const open = formWrap.hidden;
    formWrap.hidden = !open;
    write.setAttribute("aria-expanded", String(open));
    write.innerHTML = open ? '<span aria-hidden="true">×</span> Close' : '<span aria-hidden="true">✎</span> Write a Review';
    if (open) $("#hfReviewName").focus({preventScroll:true});
  });
  toggle.addEventListener("click", async () => {
    expanded = !expanded;
    all.hidden = !expanded;
    pagination.hidden = !expanded || loadedRows >= publishedCount - 1;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Show fewer reviews" : "Show more reviews";
    if (expanded && loadedRows === 0) {
      try { await loadMore(); } catch (_) { pageCount.textContent = "Could not load more reviews. Please try again."; }
    }
  });
  more.addEventListener("click", async () => {
    try { await loadMore(); } catch (_) { pageCount.textContent = "Could not load more reviews. Please try again."; }
  });
  form.querySelectorAll('input[name="rating"]').forEach(input => input.addEventListener("change", () => {
    $("#hfReviewRatingHint").textContent = input.value + " out of 5 stars selected";
  }));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const rating = form.querySelector('input[name="rating"]:checked');
    if (!rating) {
      $("#hfReviewRatingHint").textContent = "Please select a star rating.";
      form.querySelector("#hfReviewRating5").focus();
      return;
    }
    button.disabled = true;
    message.className = "hf-review-message";
    message.textContent = "Submitting your review…";
    try {
      await postReview(API + "/rest/v1/product_reviews", {
        product_id:product.id,
        reviewer_name:$("#hfReviewName").value.trim(),
        rating:Number(rating.value),
        review_text:$("#hfReviewText").value.trim(),
        source:"customer",status:"pending",
        verified_purchase:false
      });
      form.reset();
      $("#hfReviewRatingHint").textContent = "Select 1 to 5 stars";
      message.textContent = "Thank you! Your review has been received and will appear after approval.";
      write.innerHTML = '<span aria-hidden="true">✎</span> Write a Review';
    } catch (error) {
      message.className = "hf-review-message error";
      message.textContent = error.message || "Review submission failed. Please try again.";
    } finally {
      button.disabled = false;
    }
  });

  await loadSummary();
  await loadLatest();
}
function mountWhenReady() {
  let attempts = 0;
  const tryMount = () => {
    attempts++;
    if ($("#product-detail") || $(".product-detail") || $("#related-section")) {
      init().catch(error => console.warn("Product reviews could not be initialized.", error));
      return;
    }
    if (attempts < 40) setTimeout(tryMount, 200);
  };
  tryMount();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountWhenReady, {once:true});
else mountWhenReady();
})();
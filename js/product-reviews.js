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
.hf-public-reviews{--hf-copper:#c97b3d;--hf-ink:#2b2a3d;--hf-muted:#77716a;--hf-line:#e9e1d6;max-width:1120px;margin:22px auto 28px;padding:18px 20px;background:#fffdf8;border:1px solid var(--hf-line);border-radius:15px;color:var(--hf-ink);box-shadow:0 5px 18px rgba(43,42,61,.035)}
.hf-reviews-kicker{margin:0 0 4px;color:#a96d36;font-size:9px;font-weight:850;letter-spacing:.16em;text-transform:uppercase}
.hf-reviews-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hf-reviews-heading h2{margin:0;font-size:20px;line-height:1.25;font-weight:800;color:var(--hf-ink)}
.hf-review-summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:10px 0 12px;color:var(--hf-muted);font-size:12px}
.hf-review-average{font-size:22px;font-weight:850;line-height:1;color:#9c632f}
.hf-review-stars{color:#c58a3b;letter-spacing:1.5px;white-space:nowrap}
.hf-review-count{font-size:12px}
.hf-review-empty{margin:0;padding:10px 12px;border-radius:10px;background:#f8f5ef;color:#77716a;font-size:12px;line-height:1.55}
.hf-review-item{padding:12px 13px;border:1px solid #eee7dc;border-radius:11px;background:#fbf9f4}
.hf-review-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hf-review-item-head strong{font-size:13px}
.hf-review-item small{display:block;margin-top:4px;color:#858078;font-size:10px}
.hf-review-item p{margin:7px 0 0;font-size:13px;line-height:1.6;white-space:pre-line;overflow-wrap:anywhere}
.hf-review-admin{font-size:9px;font-weight:800;color:#8b5c36;background:#f7eadf;padding:3px 7px;border-radius:99px}
.hf-review-verified{font-size:9px;font-weight:800;color:#45664f;background:#edf3ed;padding:3px 7px;border-radius:99px}
.hf-review-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:11px}
.hf-review-link{appearance:none;border:0;background:transparent;padding:4px 0;color:#985b2e;font:700 12px/1.4 inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.hf-review-link:focus-visible,.hf-review-submit:focus-visible,.hf-review-write:focus-visible{outline:3px solid rgba(201,123,61,.28);outline-offset:3px}
.hf-review-write{appearance:none;border:1px solid #d8b08e;border-radius:9px;background:#fffaf4;color:#87512c;padding:8px 12px;font:750 12px/1.2 inherit;cursor:pointer}
.hf-review-form-wrap{margin-top:13px;padding-top:13px;border-top:1px solid var(--hf-line)}
.hf-review-form{display:grid;gap:10px}
.hf-review-form[hidden],.hf-review-form-wrap[hidden],.hf-review-all[hidden]{display:none!important}
.hf-review-form-title{font-size:14px;font-weight:800}
.hf-review-product{margin:-5px 0 0;color:var(--hf-muted);font-size:11px}
.hf-review-form label{display:grid;gap:5px;font-size:11px;font-weight:750;color:#514d49}
.hf-review-form input,.hf-review-form textarea{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid #ded7cc;border-radius:9px;background:#fff;color:var(--hf-ink);font:inherit;font-size:13px}
.hf-review-form textarea{resize:vertical;min-height:86px}
.hf-review-form input:focus,.hf-review-form textarea:focus{outline:2px solid rgba(201,123,61,.2);border-color:var(--hf-copper)}
.hf-review-rating{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:3px;width:max-content}
.hf-review-rating input{position:absolute;opacity:0;width:1px;height:1px;clip:rect(0,0,0,0);overflow:hidden}
.hf-review-rating label{display:block;cursor:pointer;color:#cfc7bc;font-size:28px;line-height:1;padding:1px}
.hf-review-rating label:hover,.hf-review-rating label:hover~label,.hf-review-rating input:checked~label{color:#c58a3b}
.hf-review-rating input:focus-visible+label{outline:3px solid rgba(201,123,61,.3);outline-offset:2px;border-radius:4px}
.hf-review-rating-hint{font-size:10px;color:var(--hf-muted)}
.hf-review-submit{justify-self:start;border:0;border-radius:9px;background:var(--hf-copper);color:#fff;padding:10px 16px;font:800 12px/1.2 inherit;cursor:pointer;box-shadow:0 3px 8px rgba(201,123,61,.15)}
.hf-review-submit:disabled{opacity:.6;cursor:wait}
.hf-review-message{margin:0;color:#77716a;font-size:11px;line-height:1.5}
.hf-review-message.error{color:#a33e32}
.hf-review-all{display:grid;gap:9px;margin-top:10px}
.hf-review-pagination{display:flex;align-items:center;gap:10px;margin-top:10px}
.hf-review-pagination[hidden]{display:none}
@media(max-width:600px){.hf-public-reviews{margin:16px 12px 22px;padding:14px;border-radius:13px}.hf-reviews-heading h2{font-size:18px}.hf-review-summary{margin:8px 0 10px}.hf-review-item{padding:10px}.hf-review-rating label{font-size:27px}}
`;
document.head.appendChild(style);

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
      <button class="hf-review-write" id="hfReviewWrite" type="button" aria-expanded="false" aria-controls="hfReviewFormWrap">Write a Review</button>
    </div>
    <div class="hf-review-summary" id="hfReviewSummary" aria-live="polite">Loading reviews…</div>
    <div id="hfReviewLatest"></div>
    <div class="hf-review-actions" id="hfReviewActions" hidden>
      <button class="hf-review-link" id="hfReviewToggle" type="button" aria-expanded="false" aria-controls="hfReviewAll">View all reviews</button>
    </div>
    <div class="hf-review-all" id="hfReviewAll" hidden></div>
    <div class="hf-review-pagination" id="hfReviewPagination" hidden>
      <button class="hf-review-link" id="hfReviewMore" type="button">Load 5 more reviews</button>
      <span class="hf-review-count" id="hfReviewPageCount"></span>
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
    const source = row.source === "admin" ? '<span class="hf-review-admin">Halal Food note</span>' : "";
    const verified = row.verified_purchase === true ? '<span class="hf-review-verified">Verified purchase</span>' : "";
    return `<article class="hf-review-item">
      <div class="hf-review-item-head"><strong>${esc(row.reviewer_name || "Customer")}</strong><span><span class="hf-review-stars" aria-label="${Number(row.rating)||0} out of 5 stars">${stars(row.rating)}</span> ${source} ${verified}</span></div>
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
    write.textContent = open ? "Close Review Form" : "Write a Review";
    if (open) $("#hfReviewName").focus({preventScroll:true});
  });
  toggle.addEventListener("click", async () => {
    expanded = !expanded;
    all.hidden = !expanded;
    pagination.hidden = !expanded || loadedRows >= publishedCount - 1;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Show latest review only" : "View all reviews";
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
        source:"customer",
        status:"pending",
        verified_purchase:false
      });
      form.reset();
      $("#hfReviewRatingHint").textContent = "Select 1 to 5 stars";
      message.textContent = "Thank you! Your review has been received and will appear after approval.";
      write.textContent = "Write another Review";
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
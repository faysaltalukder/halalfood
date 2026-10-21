/* Dynamic detail template for products created in Admin. */
(function () {
  "use strict";
  const API_ROOT = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
  const PUBLIC_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
  const SITE_ROOT = "https://faysaltalukder.github.io/halalfood/";
  const $ = (s, root) => (root || document).querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = value => "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const displayPrice = item => item.display_price || (money(item.price) + " / " + (item.unit_type || "piece"));
  const rootURL = path => new URL(path, SITE_ROOT).href;
  const priceNumber = text => {
    const match = String(text || "").match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
    return match ? Number(match[0].replace(/,/g, "")) : 0;
  };
  async function getProducts(slug) {
    const query = new URLSearchParams({
      select: "id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,is_active,is_featured,cms_created,cms_managed,sort_order,seo_title,seo_description",
      slug: "eq." + slug, is_active: "eq.true", limit: "1"
    });
    const response = await fetch(API_ROOT + "/rest/v1/products?" + query.toString(), {
      headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Product details could not be loaded (" + response.status + ").");
    return response.json();
  }
  async function getRelated(categorySlug, currentSlug) {
    const query = new URLSearchParams({
      select: "name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,cms_created,is_active,sort_order",
      category_slug: "eq." + categorySlug, is_active: "eq.true", order: "sort_order.asc,name.asc", limit: "5"
    });
    const response = await fetch(API_ROOT + "/rest/v1/products?" + query.toString(), {
      headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, Accept: "application/json" }
    });
    if (!response.ok) return [];
    return (await response.json()).filter(item => item.slug !== currentSlug).slice(0, 4);
  }
  function itemHref(item) {
    return item.cms_created ? rootURL("cms-product.html?slug=" + encodeURIComponent(item.slug)) : rootURL("products/" + encodeURIComponent(item.slug) + ".html");
  }
  function renderRelated(items) {
    const section = $("#related-section"), grid = $("#related-grid");
    if (!section || !grid || !items.length) return;
    grid.innerHTML = items.map(item => {
      const href = itemHref(item);
      const price = displayPrice(item);
      return '<article class="product-card"><a class="product-image-link" href="' + esc(href) + '"><div class="product-image"><img src="' + esc(item.image_url || "") + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async"></div></a>' +
        '<div class="product-body"><span class="tag">' + esc(item.category || "") + '</span><a class="product-name-link" href="' + esc(href) + '"><h3>' + esc(item.name) + '</h3></a>' +
        '<p>' + esc(item.short_description || "") + '</p><div class="product-foot"><span class="price">' + esc(price) + '</span>' +
        '<button type="button" class="cart-add-btn related-cart-btn" data-add-to-cart data-slug="' + esc(item.slug) + '" data-name="' + esc(item.name) + '" data-price="' + esc(item.price) + '" data-display-price="' + esc(price) + '" data-image="' + esc(item.image_url || "") + '" data-category="' + esc(item.category || "") + '">Add to Cart</button></div></div></article>';
    }).join("");
    section.style.display = "block";
  }
  function notFound(message) {
    const box = $("#product-detail");
    if (!box) return;
    box.innerHTML = '<div class="product-not-found"><h1>Product unavailable</h1><p>' + esc(message || "This product is not currently listed.") + '</p><a class="btn-secondary" href="' + rootURL("index.html") + '">Back to store</a></div>';
    const related = $("#related-section"); if (related) related.style.display = "none";
  }
  function render(item) {
    const box = $("#product-detail");
    if (!box) return;
    const price = displayPrice(item);
    const image = item.image_url || "";
    const articleTitle = item.seo_title || item.name + " | Halal Food";
    const articleDescription = item.seo_description || item.short_description || item.name;
    const orderLink = rootURL("order.html?product=" + encodeURIComponent(item.name));
    const whatsLink = "https://wa.me/8801842031164?text=" + encodeURIComponent("আমি " + item.name + " অর্ডার করতে চাই");
    const paragraphs = String(item.full_description || item.description || item.short_description || "Product details will be updated soon.")
      .split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
      .map(part => '<p>' + esc(part).replace(/\n/g, "<br>") + "</p>").join("");
    box.innerHTML =
      '<article class="product-detail"><div class="product-detail-grid">' +
        '<div class="product-detail-image-wrap"><button class="product-detail-image" type="button" aria-label="View ' + esc(item.name) + ' image in full screen">' +
          '<img src="' + esc(image) + '" alt="' + esc(item.name) + '" decoding="async" fetchpriority="high"><span class="image-zoom-hint">Click image to enlarge</span></button></div>' +
        '<div class="product-detail-info"><span class="tag">' + esc(item.category || "") + '</span><h1>' + esc(item.name) + '</h1><p class="product-detail-price">' + esc(price) + '</p>' +
          '<div class="product-detail-actions"><a class="btn-primary order-btn" href="' + esc(orderLink) + '">Order Now</a>' +
          '<button type="button" class="btn-secondary cart-detail-add" data-add-to-cart data-slug="' + esc(item.slug) + '" data-name="' + esc(item.name) + '" data-price="' + esc(item.price) + '" data-display-price="' + esc(price) + '" data-image="' + esc(image) + '" data-category="' + esc(item.category || "") + '">Add to Cart</button>' +
          '<a class="btn-secondary" href="' + esc(whatsLink) + '" target="_blank" rel="noopener">Message Us</a><a class="btn-secondary" href="tel:+8801842031164">Call Us</a></div>' +
          '<div class="product-short-note"><strong>Product:</strong> ' + esc(item.name) + '<br><strong>Category:</strong> ' + esc(item.category || "") + '</div></div></div>' +
        '<section class="product-description-section" aria-labelledby="product-description-title"><div class="product-description-inner"><span class="section-eyebrow">Product Details</span><h2 id="product-description-title">Description</h2>' + paragraphs + '</div></section></article>';
    document.title = articleTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = articleDescription;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = rootURL("cms-product.html?slug=" + encodeURIComponent(item.slug));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (ogTitle) ogTitle.content = articleTitle;
    if (ogDescription) ogDescription.content = articleDescription;
    if (ogUrl && canonical) ogUrl.content = canonical.href;
    if (twitterTitle) twitterTitle.content = articleTitle;
    if (twitterDescription) twitterDescription.content = articleDescription;
    if (twitterUrl && canonical) twitterUrl.content = canonical.href;
    const breadcrumb = $("#product-breadcrumb");
    if (breadcrumb) breadcrumb.innerHTML = '<a href="' + rootURL("index.html") + '">Home</a> &gt; <a href="' + rootURL("category.html?slug=" + encodeURIComponent(item.category_slug || "")) + '">' + esc(item.category || "Category") + '</a> &gt; ' + esc(item.name);
    const imgButton = $(".product-detail-image", box);
    if (imgButton) imgButton.addEventListener("click", () => {
      const modal = document.createElement("div");
      modal.className = "product-image-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", item.name + " image viewer");
      modal.innerHTML = '<button class="product-image-modal-close" type="button" aria-label="Close image viewer">&times;</button><img src="' + esc(image) + '" alt="' + esc(item.name) + '">';
      document.body.appendChild(modal);
      document.body.classList.add("image-modal-open");
      const close = () => { modal.remove(); document.body.classList.remove("image-modal-open"); document.removeEventListener("keydown", onKey); };
      const onKey = event => { if (event.key === "Escape") close(); };
      modal.addEventListener("click", event => { if (event.target === modal) close(); });
      $(".product-image-modal-close", modal).addEventListener("click", close);
      document.addEventListener("keydown", onKey);
    });
    getRelated(item.category_slug, item.slug).then(renderRelated).catch(() => {});
  }
  document.addEventListener("DOMContentLoaded", async () => {
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { notFound("Choose a product from the store catalog."); return; }
    try {
      const rows = await getProducts(slug);
      if (!rows.length) { notFound("This product is no longer listed in the active catalog."); return; }
      render(rows[0]);
    } catch (error) {
      notFound(error?.message || "Product details could not be loaded. Please refresh.");
      console.error("Dynamic product load failed", error);
    }
  });
})();
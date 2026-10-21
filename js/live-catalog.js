/* Live catalog bridge: Supabase remains the source of truth for active store products and categories. */
(function () {
  "use strict";
  const API_ROOT = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
  const PUBLIC_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
  const SITE_ROOT = "https://faysaltalukder.github.io/halalfood/";
  const CART_ICON = '<svg aria-hidden="true" class="btn-icon" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z"></path><circle cx="9" cy="20" r="1.4"></circle><circle cx="18" cy="20" r="1.4"></circle><path d="M2 3h2l1 3"></path></svg>';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = value => "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const priceText = product => product.display_price || (money(product.price) + " / " + (product.unit_type || "piece"));
  const numericPrice = value => {
    const match = String(value ?? "").match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
    return match ? Number(match[0].replace(/,/g, "")) : 0;
  };
  const rootURL = path => new URL(path, SITE_ROOT).href;
  async function readTable(table, params) {
    const query = new URLSearchParams(params || {});
    const response = await fetch(API_ROOT + "/rest/v1/" + table + "?" + query.toString(), {
      headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Catalog request failed (" + response.status + ")");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected catalog response");
    return data;
  }
  function pathInfo() {
    const path = window.location.pathname;
    if (/\/categories\/[^/]+\.html$/i.test(path)) {
      return { kind: "category", slug: path.split("/").pop().replace(/\.html$/i, "") };
    }
    if (/\/category\.html$/i.test(path)) {
      return { kind: "category", slug: new URLSearchParams(location.search).get("slug") || "" , generic: true };
    }
    if (/\/products\/[^/]+\.html$/i.test(path)) {
      return { kind: "product", slug: path.split("/").pop().replace(/\.html$/i, "") };
    }
    if (/\/(?:index\.html)?$/i.test(path)) return { kind: "home" };
    return { kind: "other" };
  }
  function imageNeedsReplace(img, url) {
    if (!img || !url) return false;
    try { return new URL(img.getAttribute("src") || "", location.href).href !== new URL(url, SITE_ROOT).href; }
    catch (_) { return true; }
  }
  function setPictureImage(img, url, name) {
    if (!img || !url) return;
    const differs = imageNeedsReplace(img, url);
    img.alt = name || "";
    if (!differs) return; // Keep existing responsive WebP/JPG srcsets when the source is unchanged.
    const picture = img.closest("picture");
    if (picture) picture.querySelectorAll("source").forEach(source => source.remove());
    img.removeAttribute("srcset");
    img.src = url;
  }
  function productHref(product, existingHref) {
    if (product.cms_created) return rootURL("cms-product.html?slug=" + encodeURIComponent(product.slug));
    return existingHref || rootURL("products/" + encodeURIComponent(product.slug) + ".html");
  }
  function setProductControls(button, product) {
    if (!button) return;
    button.dataset.slug = product.slug;
    button.dataset.name = product.name;
    button.dataset.price = String(Number(product.price) || numericPrice(priceText(product)));
    button.dataset.displayPrice = priceText(product);
    button.dataset.image = product.image_url || "";
    button.dataset.category = product.category || "";
    button.setAttribute("aria-label", "Add " + product.name + " to cart");
  }
  function updateProductCard(card, product) {
    const button = $("[data-add-to-cart][data-slug]", card);
    const image = $(".product-image img, .jfy-image img, .mrow-image img", card);
    const imageLink = $(".product-image-link, .jfy-image-link, .mrow-image-link", card);
    const nameLink = $(".product-name-link, .jfy-name-link, .mrow-name-link", card);
    const title = $("h3", nameLink || card);
    const categoryTag = $(".tag", card);
    const price = $(".price, .jfy-price, .mrow-price", card);
    const description = $(".product-body > p", card);
    if (title) title.textContent = product.name;
    if (nameLink) nameLink.href = productHref(product, nameLink.getAttribute("href"));
    if (imageLink) imageLink.href = productHref(product, imageLink.getAttribute("href"));
    if (image) setPictureImage(image, product.image_url, product.name);
    if (categoryTag) categoryTag.textContent = product.category || "";
    if (price) price.textContent = priceText(product);
    if (description && product.cms_created) description.textContent = product.short_description || "";
    if (button) setProductControls(button, product);
    const orderLink = $(".category-order-btn, .product-body .order-btn", card);
    if (orderLink) {
      orderLink.href = rootURL("order.html?product=" + encodeURIComponent(product.name));
      orderLink.setAttribute("aria-label", "Order Now: " + product.name);
    }
  }
  function makeProductCard(product, variant) {
    const card = document.createElement("article");
    card.className = variant === "jfy" ? "jfy-card" : variant === "mrow" ? "mrow-card" : "product-card";
    const href = productHref(product, null);
    const img = document.createElement("img");
    img.src = product.image_url || "";
    img.alt = product.name;
    img.loading = "lazy";
    img.decoding = "async";
    const imageLink = document.createElement("a");
    imageLink.href = href;
    imageLink.className = variant === "jfy" ? "jfy-image-link" : variant === "mrow" ? "mrow-image-link" : "product-image-link";
    if (variant === "jfy") {
      const span = document.createElement("span"); span.className = "jfy-image"; span.appendChild(img); imageLink.appendChild(span);
    } else if (variant === "mrow") {
      const span = document.createElement("span"); span.className = "mrow-image"; span.appendChild(img); imageLink.appendChild(span);
    } else {
      const box = document.createElement("div"); box.className = "product-image"; box.appendChild(img); imageLink.appendChild(box);
    }
    const nameLink = document.createElement("a");
    nameLink.href = href;
    nameLink.className = variant === "jfy" ? "jfy-name-link" : variant === "mrow" ? "mrow-name-link" : "product-name-link";
    const h3 = document.createElement("h3"); h3.textContent = product.name; nameLink.appendChild(h3);
    const price = document.createElement("span");
    price.className = variant === "jfy" ? "jfy-price" : variant === "mrow" ? "mrow-price" : "price";
    price.textContent = priceText(product);
    if (variant === "jfy") {
      card.append(imageLink, nameLink, price);
      const button = document.createElement("button"); button.type = "button"; button.className = "cart-add-btn jfy-cart-btn"; button.innerHTML = CART_ICON + "<span>Add to Cart</span>"; setProductControls(button, product); card.appendChild(button);
      return card;
    }
    if (variant === "mrow") {
      card.append(imageLink, nameLink, price);
      const button = document.createElement("button"); button.type = "button"; button.className = "cart-add-btn mrow-cart-btn"; button.innerHTML = CART_ICON + "<span>Add to Cart</span>"; setProductControls(button, product); card.appendChild(button);
      return card;
    }
    const body = document.createElement("div"); body.className = "product-body";
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = product.category || "";
    const description = document.createElement("p"); description.textContent = product.short_description || "Product details can be confirmed before ordering.";
    const foot = document.createElement("div"); foot.className = "product-foot"; foot.appendChild(price);
    const add = document.createElement("button"); add.type = "button"; add.className = "cart-add-btn"; add.innerHTML = CART_ICON + "<span>Add to Cart</span>"; setProductControls(add, product);
    const order = document.createElement("a"); order.className = "order-btn category-order-btn"; order.href = rootURL("order.html?product=" + encodeURIComponent(product.name)); order.innerHTML = CART_ICON + "<span>Order Now</span>";
    foot.append(order, add);
    body.append(tag, nameLink, description, foot);
    card.append(imageLink, body);
    return card;
  }
  function patchExistingCards(products) {
    const bySlug = new Map(products.map(product => [product.slug, product]));
    $$(".product-card, .jfy-card, .mrow-card").forEach(card => {
      const button = $("[data-add-to-cart][data-slug]", card);
      const slug = button?.dataset.slug || "";
      if (!slug) return;
      const product = bySlug.get(slug);
      if (!product) { card.remove(); return; }
      updateProductCard(card, product);
    });
  }
  function renderCategory(products, categories, info) {
    const category = categories.find(item => item.slug === info.slug && item.is_active);
    const grid = $(".category-page-products .product-grid");
    const heading = $(".category-page-heading h1, #live-category-title");
    if (heading) heading.textContent = category?.name || "Category unavailable";
    const meta = document.querySelector('meta[name="description"]');
    if (category && meta) meta.content = category.description || "Browse " + category.name + " products from Halal Food.";
    document.title = category ? category.name + " | Halal Food" : "Category | Halal Food";
    if (!grid) return;
    if (info.generic) grid.replaceChildren();
    const records = products.filter(item => item.category_slug === info.slug && item.is_active);
    const cardSlugs = new Set($$(".product-card", grid).map(card => $("[data-add-to-cart][data-slug]", card)?.dataset.slug).filter(Boolean));
    $$(".product-card", grid).forEach(card => {
      const slug = $("[data-add-to-cart][data-slug]", card)?.dataset.slug;
      if (!slug || !records.some(item => item.slug === slug)) card.remove();
    });
    const stillThere = new Set($$(".product-card", grid).map(card => $("[data-add-to-cart][data-slug]", card)?.dataset.slug).filter(Boolean));
    records.forEach(item => {
      const existing = stillThere.has(item.slug) ? $$(".product-card", grid).find(card => $("[data-add-to-cart][data-slug]", card)?.dataset.slug === item.slug) : null;
      if (existing) updateProductCard(existing, item);
      else grid.appendChild(makeProductCard(item, "standard"));
    });
    if (!records.length) grid.innerHTML = '<p class="muted">No active products are currently listed in this category.</p>';
  }
  function renderHome(products, categories) {
    const featuredGrid = $("#products .product-grid");
    if (featuredGrid) {
      const featured = products.filter(item => item.is_featured && item.is_active).sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0)).slice(0,4);
      const rows = featured.length ? featured : products.slice(0,4);
      featuredGrid.replaceChildren(...rows.map(item => makeProductCard(item, "standard")));
      featuredGrid.classList.add("featured-grid-4");
    }
    const jfy = $("#just-for-you .jfy-grid");
    if (jfy) {
      const rows = products.filter(item => item.is_active).sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0)).slice(0,10);
      jfy.replaceChildren(...rows.map(item => makeProductCard(item, "jfy")));
    }
    // Keep current curated product rails, but update product data and remove hidden products.
    patchExistingCards(products);
    const rail = $("[data-category-rail]");
    if (rail) {
      const present = new Map($$(".cat-card", rail).map(card => {
        const url = card.getAttribute("href") || "";
        const match = url.match(/categories\/([^/?#]+)\.html/i) || url.match(/[?&]slug=([^&]+)/);
        return [match ? decodeURIComponent(match[1]) : "", card];
      }).filter(pair => pair[0]));
      rail.querySelectorAll(".cat-card").forEach(card => {
        const href = card.getAttribute("href") || "";
        const match = href.match(/categories\/([^/?#]+)\.html/i) || href.match(/[?&]slug=([^&]+)/);
        if (match && !categories.some(cat => cat.slug === decodeURIComponent(match[1]) && cat.is_active)) card.remove();
      });
      const liveSlugs = new Set($$(".cat-card", rail).map(card => {
        const href = card.getAttribute("href") || ""; const m = href.match(/categories\/([^/?#]+)\.html/i) || href.match(/[?&]slug=([^&]+)/);
        return m ? decodeURIComponent(m[1]) : "";
      }));
      categories.filter(cat => cat.is_active).forEach(cat => {
        let card = $$(".cat-card", rail).find(node => {
          const href = node.getAttribute("href") || ""; const m = href.match(/categories\/([^/?#]+)\.html/i) || href.match(/[?&]slug=([^&]+)/);
          return m && decodeURIComponent(m[1]) === cat.slug;
        });
        if (!card) {
          card = document.createElement("a"); card.className = "cat-card";
          card.href = cat.cms_created ? rootURL("category.html?slug=" + encodeURIComponent(cat.slug)) : rootURL("categories/" + encodeURIComponent(cat.slug) + ".html");
          const imageBox = document.createElement("span"); imageBox.className = "cat-card-img";
          const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; if (cat.image_url) img.src = cat.image_url;
          imageBox.appendChild(img); const heading = document.createElement("h3"); heading.textContent = cat.name; card.append(imageBox, heading); rail.appendChild(card);
        }
        const label = $("h3", card); if (label) label.textContent = cat.name;
        const img = $("img", card); if (img) { img.alt = ""; if (cat.image_url) setPictureImage(img, cat.image_url, ""); }
        if (cat.cms_created) card.href = rootURL("category.html?slug=" + encodeURIComponent(cat.slug));
      });
    }
    // Keep category menus in sync with active database categories.
    $$(".mega-menu").forEach(menu => {
      categories.filter(cat => cat.is_active).forEach(cat => {
        const present = Array.from(menu.querySelectorAll("a")).some(a => /(?:^|\/)categories\/[^/?#]+\.html(?:$|\?)/i.test(a.getAttribute("href") || "") &&
          (a.getAttribute("href") || "").toLowerCase().includes("/" + cat.slug.toLowerCase() + ".html"));
        if (!present) {
          const a = document.createElement("a");
          a.href = cat.cms_created ? rootURL("category.html?slug=" + encodeURIComponent(cat.slug)) : rootURL("categories/" + encodeURIComponent(cat.slug) + ".html");
          a.textContent = cat.name; menu.appendChild(a);
        }
      });
      Array.from(menu.querySelectorAll("a")).forEach(a => {
        const match = (a.getAttribute("href") || "").match(/categories\/([^/?#]+)\.html/i) || (a.getAttribute("href") || "").match(/[?&]slug=([^&]+)/);
        if (match && !categories.some(cat => cat.slug === decodeURIComponent(match[1]) && cat.is_active)) a.remove();
      });
    });
  }
  function renderProductDetail(products, info) {
    const product = products.find(item => item.slug === info.slug && item.is_active);
    if (!product) {
      // Only hide a static product page when the API returned successfully but the product is inactive/deleted.
      const article = $("main .product-detail") || $("main .product-detail-grid")?.closest("article");
      if (article && !article.dataset.cmsUnavailable) {
        article.dataset.cmsUnavailable = "1";
        article.innerHTML = '<div class="product-not-found"><h1>Product unavailable</h1><p>This product is no longer listed in the active catalog.</p><a class="btn-secondary" href="' + rootURL("index.html") + '">Back to store</a></div>';
      }
      return;
    }
    const article = $("main .product-detail") || $("main .product-detail-grid")?.closest("article");
    if (!article) return;
    const title = $(".product-detail-info h1", article);
    if (title) title.textContent = product.name;
    const tag = $(".product-detail-info .tag", article);
    if (tag) tag.textContent = product.category || "";
    const price = $(".product-detail-price", article);
    if (price) price.textContent = priceText(product);
    const image = $(".product-detail-image img, .product-detail-image-wrap img", article);
    if (image) setPictureImage(image, product.image_url, product.name);
    const add = $("[data-add-to-cart][data-slug]", article);
    if (add) setProductControls(add, product);
    const order = $(".product-detail-actions .btn-primary", article);
    if (order) order.href = rootURL("order.html?product=" + encodeURIComponent(product.name));
    const message = encodeURIComponent("আমি " + product.name + " অর্ডার করতে চাই");
    const whats = $('.product-detail-actions a[href*="wa.me"]', article);
    if (whats) whats.href = "https://wa.me/8801842031164?text=" + message;
    const detail = $(".product-description-section .product-description-inner p", article);
    if (detail && product.cms_managed) detail.textContent = product.full_description || product.description || "";
    const seo = document.querySelector('meta[name="description"]');
    if (seo && product.cms_managed && product.seo_description) seo.content = product.seo_description;
    document.title = product.cms_managed ? (product.seo_title || product.name + " | Halal Food") : document.title;
  }
  function handleProductResult(product, info) {
    if (info.kind === "product") renderProductDetail([product], info);
  }
  async function start() {
    const info = pathInfo();
    const [products, categories] = await Promise.all([
      readTable("products", { select: "id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,is_active,is_featured,cms_created,cms_managed,sort_order,seo_title,seo_description,stock_quantity", is_active: "eq.true", order: "sort_order.asc,name.asc", limit: "1000" }),
      readTable("categories", { select: "id,name,slug,description,image_url,is_active,cms_created,sort_order", is_active: "eq.true", order: "sort_order.asc,name.asc", limit: "500" })
    ]);
    if (info.kind === "home") renderHome(products, categories);
    else if (info.kind === "category") renderCategory(products, categories, info);
    else if (info.kind === "product") renderProductDetail(products, info);
  }
  document.addEventListener("DOMContentLoaded", () => {
    start().catch(error => {
      console.warn("Live catalog could not connect; leaving the static catalog in place.", error);
      const status = $("#live-catalog-status");
      if (status) status.textContent = "Catalog is temporarily showing saved static content.";
    });
  });
})();
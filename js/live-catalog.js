/* Live catalog bridge: Supabase remains the source of truth for active store products and categories. */
(function () {
  "use strict";
  // Older category/product pages load this bridge directly. Wait for the per-store
  // config once, then re-run this file with the same URL so every page is configured.
  if (!window.HALAL_STORE_CONFIG) {
    const sourceScript = Array.from(document.scripts).find(script =>
      /(?:^|\/)live-catalog\.js(?:\?|$)/i.test(script.src)
    );
    const sourceUrl = sourceScript?.src || "";
    const retry = () => {
      if (window.__HALAL_LIVE_CATALOG_RETRYING || !window.HALAL_STORE_CONFIG || !sourceUrl) return;
      window.__HALAL_LIVE_CATALOG_RETRYING = true;
      const script = document.createElement("script");
      script.src = sourceUrl;
      script.async = true;
      document.head.appendChild(script);
    };
    window.addEventListener("halalstore:config-ready", retry, { once: true });
    const configScript = Array.from(document.scripts).find(script =>
      /(?:^|\/)store-config\.js(?:\?|$)/i.test(script.src)
    );
    if (configScript) {
      configScript.addEventListener("load", retry, { once: true });
      if (window.HALAL_STORE_CONFIG) retry();
    } else {
      const mainScript = Array.from(document.scripts).find(script =>
        /(?:^|\/)main\.js(?:\?|$)/i.test(script.src)
      );
      const siteRoot = mainScript ? new URL("../", mainScript.src) :
        sourceScript ? new URL("../", sourceScript.src) : null;
      if (siteRoot) {
        const config = document.createElement("script");
        config.src = new URL("js/store-config.js", siteRoot).href;
        config.async = true;
        config.onload = retry;
        config.onerror = () => console.error("This website's store-config.js could not be loaded.");
        document.head.appendChild(config);
      } else {
        console.error("The reusable catalog bridge could not find store-config.js.");
      }
    }
    return;
  }
  const STORE_CONFIG = window.HALAL_STORE_CONFIG || {};
  const API_ROOT = String(STORE_CONFIG.supabase?.url || "").replace(/\/$/, "");
  const PUBLIC_KEY = STORE_CONFIG.supabase?.publishableKey || "";
  const SITE_ROOT = STORE_CONFIG.siteRoot || "";
  const STORE_NAME = STORE_CONFIG.storeName || "Store";
  const WHATSAPP_NUMBER = String(STORE_CONFIG.contact?.whatsappNumber || "").replace(/[^0-9]/g, "");
  const CATALOG = STORE_CONFIG.catalog || {};
  const CATEGORY_TABLE = CATALOG.categoriesTable || "categories";
  const PRODUCT_TABLE = CATALOG.productsTable || "products";
  const MAX_CATEGORIES = Math.min(5000, Math.max(1, Number(CATALOG.maxCategories) || 5000));
  const MAX_PRODUCTS = Math.min(50000, Math.max(1, Number(CATALOG.maxProducts) || 10000));
  const STORAGE_BUCKET = STORE_CONFIG.storage?.publicContentBucket || "store-content";
  let currentCategories = [];
  let catalogRefreshInFlight = false;
  let lastSuccessfulCatalogSync = 0;
  const CART_ICON = '<svg aria-hidden="true" class="btn-icon" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z"></path><circle cx="9" cy="20" r="1.4"></circle><circle cx="18" cy="20" r="1.4"></circle><path d="M2 3h2l1 3"></path></svg>';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = value => "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const priceText = product => { const raw = Number(product?.price); const display = String(product?.display_price || ""); const shown = numericPrice(display); const unit = product?.unit_type || "piece"; if (product?.price !== null && product?.price !== "" && Number.isFinite(raw)) { if (display && shown === raw) return display; return money(raw) + " / " + unit; } return display || (money(product?.price) + " / " + unit); };
  const numericPrice = value => {
    const match = String(value ?? "").match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
    return match ? Number(match[0].replace(/,/g, "")) : 0;
  };
  const rootURL = path => new URL(path, SITE_ROOT).href;
  async function readTable(table, params) {
    const base = new URLSearchParams(params || {});
    const requestedLimit = Math.min(50000, Math.max(1, Number(base.get("limit") || 1000)));
    const pageSize = 500;
    const rows = [];
    for (let offset = 0; offset < requestedLimit; offset += pageSize) {
      const query = new URLSearchParams(base);
      const requested = Math.min(pageSize, requestedLimit - offset);
      query.set("limit", String(requested));
      query.set("offset", String(offset));
      const response = await fetch(API_ROOT + "/rest/v1/" + table + "?" + query.toString(), {
        headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Catalog request failed (" + response.status + ")");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected catalog response");
      rows.push(...data);
      if (data.length < requested) break;
    }
    return rows;
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
    // Dynamic product cards must carry the delegated cart hook, not just product metadata.
    button.setAttribute("data-add-to-cart", "");
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
    if (description && product.short_description != null) description.textContent = String(product.short_description);
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
    foot.append(add, order);
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
  function effectiveCategoryActive(category, categories) {
    if (!category) return false;
    const byId = new Map(categories.map(item => [item.id, item]));
    let current = category, guard = 0;
    while (current && guard++ < 4) {
      if (!current.is_active) return false;
      if (current.parent_id && !byId.has(current.parent_id)) return false;
      current = current.parent_id ? byId.get(current.parent_id) : null;
    }
    return true;
  }
  function orderedCategories(categories) {
    const result = [];
    const visit = parentId => categories
      .filter(item => (item.parent_id || null) === (parentId || null))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name || "").localeCompare(String(b.name || "")))
      .forEach(item => { result.push(item); visit(item.id); });
    visit(null);
    return result;
  }
  function categoryPath(category, categories) {
    const byId = new Map(categories.map(item => [item.id, item]));
    const path = []; let current = category, guard = 0;
    while (current && guard++ < 4) { path.unshift(current); current = current.parent_id ? byId.get(current.parent_id) : null; }
    return path;
  }
  function categoryHref(category) {
    const slug = encodeURIComponent(category.slug);
    const template = (category.cms_created || category.cms_managed)
      ? (CATALOG.categoryPage || "category.html?slug={slug}")
      : (CATALOG.legacyCategoryPage || "categories/{slug}.html");
    return rootURL(String(template).replace(/\{slug\}/g, slug));
  }
  function categorySlugFromHref(href) {
    const value = String(href || "");
    const match = value.match(/categories\/([^/?#]+)\.html/i) || value.match(/[?&]slug=([^&#]+)/i);
    if (!match) return "";
    try { return decodeURIComponent(match[1]); } catch (_) { return match[1]; }
  }
  function categoryCardImage(card, category) {
    let imageBox = $(".cat-card-img", card);
    if (!imageBox) {
      imageBox = document.createElement("span");
      imageBox.className = "cat-card-img";
      card.prepend(imageBox);
    }
    let image = $("img", imageBox);
    if (category.image_url) {
      if (!image) {
        image = document.createElement("img");
        image.loading = "lazy";
        imageBox.replaceChildren(image);
      }
      image.alt = "";
      setPictureImage(image, category.image_url, "");
      image.onerror = () => {
        image.onerror = null;
        imageBox.innerHTML = '<span class="cms-image-placeholder">Category image</span>';
      };
      return;
    }
    // Keep the original responsive picture for the ten legacy categories. New
    // categories without an image receive a neutral placeholder, not a broken URL.
    if (image && (image.getAttribute("src") || image.getAttribute("srcset"))) return;
    imageBox.innerHTML = '<span class="cms-image-placeholder">Category image</span>';
  }
  function categoryAnchor(category, className) {
    const link = document.createElement("a");
    link.href = categoryHref(category);
    if (className) link.className = className;
    link.textContent = category.name;
    return link;
  }
  function visibleCategoryTree(categories) {
    return orderedCategories(categories).filter(category => effectiveCategoryActive(category, categories));
  }
  function ensureLiveCategoryStyles() {
    if ($("#live-category-workspace-styles")) return;
    const style = document.createElement("style");
    style.id = "live-category-workspace-styles";
    style.textContent = ".live-category-children{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px;margin:0 0 22px}.live-category-child-link{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e5e0d6;border-radius:13px;background:#fffdf8;color:#2b2a3d;text-decoration:none;min-width:0}.live-category-child-link img{width:48px;height:48px;border-radius:9px;object-fit:cover;background:#f2f0ea;flex:0 0 48px}.live-category-child-link strong{font-size:12px;line-height:1.35;overflow-wrap:anywhere}.live-category-child-link small{display:block;color:#737487;font-size:10px;margin-top:3px}@media(max-width:520px){.live-category-children{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.live-category-child-link{padding:8px;gap:7px}.live-category-child-link img{width:38px;height:38px;flex-basis:38px}}";
    document.head.appendChild(style);
  }
  function renderCategory(products, categories, info) {
    const category = categories.find(item => item.slug === info.slug && effectiveCategoryActive(item, categories));
    const grid = $(".category-page-products .product-grid");
    const heading = $(".category-page-heading h1, #live-category-title");
    if (heading && (info.generic || category?.cms_created || category?.cms_managed)) heading.textContent = category?.name || "Category unavailable";
    const meta = document.querySelector('meta[name="description"]');
    if (category && meta && (info.generic || category.cms_created || category.cms_managed)) meta.content = category.seo_description || category.description || "Browse " + category.name + " products from " + STORE_NAME + ".";
    if (info.generic || category?.cms_created || category?.cms_managed) {
      const pageTitle = category ? (category.seo_title || category.name + " | " + STORE_NAME) : "Category | " + STORE_NAME;
      document.title = pageTitle;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.href = info.generic ? categoryHref(category || {slug:info.slug,cms_created:true}) : categoryHref(category);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogTitle) ogTitle.content = pageTitle;
      if (ogDescription && meta) ogDescription.content = meta.content;
      if (ogUrl && canonical) ogUrl.content = canonical.href;
    }
    if (!grid) return;
    if (info.generic) grid.replaceChildren();
    let childBox = $("#live-category-children");
    if (!childBox) {
      childBox = document.createElement("div");
      childBox.id = "live-category-children";
      childBox.className = "live-category-children";
      grid.parentElement?.insertBefore(childBox, grid);
    }
    const childCategories = category ? categories
      .filter(item => item.parent_id === category.id && effectiveCategoryActive(item, categories))
      .sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.name||"").localeCompare(String(b.name||""))) : [];
    ensureLiveCategoryStyles();
    childBox.innerHTML = childCategories.map(child =>
      '<a class="live-category-child-link" href="' + esc(categoryHref(child)) + '">' +
      (child.image_url ? '<img src="' + esc(child.image_url) + '" alt="" loading="lazy">' : '<span class="cms-image-placeholder">Category</span>') +
      '<span><strong>' + esc(child.name) + '</strong><small>' + esc(child.description || "Browse products") + '</small></span></a>'
    ).join("");
    childBox.hidden = !childCategories.length;
    if (!category) {
      grid.innerHTML = '<p class="muted">This category is not currently available.</p>';
      return;
    }
    const branchSlugs = new Set([category.slug]);
    const addDescendants = parentId => categories.filter(item => item.parent_id === parentId).forEach(item => {
      branchSlugs.add(item.slug); addDescendants(item.id);
    });
    addDescendants(category.id);
    const categoryRank = new Map(orderedCategories(categories).map((item,index)=>[item.slug,index]));
    const records = products.filter(item => branchSlugs.has(item.category_slug) && item.is_active)
      .sort((a,b) => (categoryRank.get(a.category_slug)??0)-(categoryRank.get(b.category_slug)??0) ||
        Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.name||"").localeCompare(String(b.name||"")));
    // Rebuild the grid in the database-defined order. Updating cards in place would
    // leave old static product cards in their original positions after a drag reorder.
    if (records.length) grid.replaceChildren(...records.map(item => makeProductCard(item, "standard")));
    else grid.innerHTML = '<p class="muted">No active products are currently listed in this category.</p>';
  }
  // Render every active homepage category rail from the same current catalog as category pages.
  function renderMerchandisingRails(products, categories) {
    $$("[data-mrow]").forEach(wrap => {
      const track = $("[data-mrow-track]", wrap);
      const section = wrap.closest("section") || wrap.parentElement;
      const viewAll = $(".merch-view-all", section);
      if (!track || !viewAll) return;
      const href = viewAll.getAttribute("href") || "";
      const match = href.match(/categories\/([^/?#]+)\.html/i) || href.match(/[?&]slug=([^&]+)/i);
      if (!match) return;
      let categorySlug = match[1];
      try { categorySlug = decodeURIComponent(categorySlug); } catch (_) {}
      const rootCategory = categories.find(item => item.slug === categorySlug);
      const branchSlugs = new Set(rootCategory ? [rootCategory.slug] : [categorySlug]);
      const addDescendants = parentId => categories.filter(item => item.parent_id === parentId).forEach(item => {
        branchSlugs.add(item.slug);
        addDescendants(item.id);
      });
      if (rootCategory) addDescendants(rootCategory.id);
      const categoryRank = new Map(orderedCategories(categories).map((item,index)=>[item.slug,index]));
      const rows = products
        .filter(item => item.is_active && branchSlugs.has(item.category_slug))
        .sort((a, b) =>
          (categoryRank.get(a.category_slug) ?? 0) - (categoryRank.get(b.category_slug) ?? 0) ||
          Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
          Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
          (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0) ||
          String(a.name || "").localeCompare(String(b.name || ""))
        );
      track.replaceChildren(...rows.map(item => makeProductCard(item, "mrow")));
      if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No active products are currently listed in this category.";
        track.appendChild(empty);
      }
    });
  }

  function renderHome(products, categories) {
    const featuredGrid = $("#products .product-grid");
    if (featuredGrid) {
      const catalogOrder = (a, b) =>
        Number(a.home_sort_order ?? 1000000) - Number(b.home_sort_order ?? 1000000) ||
        Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
        (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""));
      // Homepage position is authoritative. Featured remains an independent product flag,
      // rather than silently overriding the administrator's explicit display order.
      const rows = products.filter(item => item.is_active).sort(catalogOrder).slice(0,4);
      featuredGrid.replaceChildren(...rows.map(item => makeProductCard(item, "standard")));
      featuredGrid.classList.add("featured-grid-4");
    }
    const jfy = $("#just-for-you .jfy-grid");
    const jfyOrdered = products.filter(item => item.is_active).sort((a, b) =>
      Number(a.home_sort_order ?? 1000000) - Number(b.home_sort_order ?? 1000000) ||
      Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );
    const jfyVisible = jfyOrdered.slice(0, 10);
    if (jfy) jfy.replaceChildren(...jfyVisible.map(item => makeProductCard(item, "jfy")));

    // Populate Load More with live catalog records instead of the stale static HTML template.
    const jfyRemainder = jfyOrdered.slice(10);
    const hiddenTemplate = $("[data-jfy-hidden]");
    if (hiddenTemplate && hiddenTemplate.tagName === "TEMPLATE") {
      hiddenTemplate.content.replaceChildren(...jfyRemainder.map(item => makeProductCard(item, "jfy")));
    } else {
      const expandedGrid = $("#just-for-you .jfy-shown");
      if (expandedGrid) expandedGrid.replaceChildren(...jfyRemainder.map(item => makeProductCard(item, "jfy")));
    }
    const loadMoreButton = $("[data-jfy-load-more]");
    if (loadMoreButton) {
      loadMoreButton.hidden = jfyRemainder.length === 0;
      loadMoreButton.disabled = jfyRemainder.length === 0;
    }
    // Rebuild category product rails from the current database so new products and edits appear here too.
    renderMerchandisingRails(products, categories);
    patchExistingCards(products);
    const rail = $("[data-category-rail]");
    if (rail) {
      const oldCards = new Map();
      $$(".cat-card", rail).forEach(card => {
        const slug = categorySlugFromHref(card.getAttribute("href"));
        if (slug && !oldCards.has(slug)) oldCards.set(slug, card);
      });
      const rootCategories = categories
        .filter(category => !category.parent_id && effectiveCategoryActive(category, categories))
        .sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.name||"").localeCompare(String(b.name||"")));
      const orderedCards = rootCategories.map(category => {
        let card = oldCards.get(category.slug);
        if (!card) {
          card = document.createElement("a");
          card.className = "cat-card";
          const imageBox = document.createElement("span");
          imageBox.className = "cat-card-img";
          const heading = document.createElement("h3");
          card.append(imageBox, heading);
        }
        card.href = categoryHref(category);
        const heading = $("h3", card);
        if (heading) heading.textContent = category.name;
        categoryCardImage(card, category);
        return card;
      });
      rail.replaceChildren(...orderedCards);
    }
    window.dispatchEvent(new CustomEvent("halalcatalog:rendered", { detail: { products, categories } }));
  }
  function syncCategoryMenus(categories) {
    // All storefront navigation surfaces are rebuilt from the same ordered database tree.
    // This prevents a rename, hide/show or reorder from leaving stale static links behind.
    const menuCategories = visibleCategoryTree(categories);
    const linksFor = (className) => menuCategories.map(category => {
      const link = categoryAnchor(category, className);
      const depth = categoryPath(category, categories).length - 1;
      link.textContent = "— ".repeat(Math.max(0, depth)) + category.name;
      return link;
    });
    $$(".mega-menu").forEach(menu => {
      menu.replaceChildren(...linksFor(""));
    });
    const mobileLinks = $(".mobile-category-links");
    if (mobileLinks) mobileLinks.replaceChildren(...linksFor(""));
    const footerHeading = $$("footer h4").find(heading => heading.textContent.trim().toLowerCase() === "categories");
    const footerList = footerHeading?.nextElementSibling;
    if (footerList && footerList.tagName === "UL") {
      footerList.replaceChildren(...menuCategories.map(category => {
        const item = document.createElement("li");
        const link = categoryAnchor(category, "");
        const depth = categoryPath(category, categories).length - 1;
        link.textContent = "— ".repeat(Math.max(0, depth)) + category.name;
        item.appendChild(link);
        return item;
      }));
    }
    window.dispatchEvent(new CustomEvent("halalcatalog:navigation-synced", {
      detail: { categories: menuCategories }
    }));
  }
  function renderProductDetail(products, info, categories) {
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
    if (whats) whats.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + message;
    const detail = $(".product-description-section .product-description-inner p", article);
    if (detail && (product.full_description != null || product.description != null)) detail.textContent = product.full_description || product.description || "";
    const breadcrumb = $("#product-breadcrumb");
    const productCategory = (categories || []).find(item => item.slug === product.category_slug);
    if (breadcrumb && productCategory) {
      const chain = categoryPath(productCategory, categories || []);
      breadcrumb.innerHTML = '<a href="' + rootURL("index.html") + '">Home</a> &gt; ' +
        chain.map(item => '<a href="' + esc(categoryHref(item)) + '">' + esc(item.name) + '</a>').join(' &gt; ') +
        ' &gt; ' + esc(product.name);
    }
    const seo = document.querySelector('meta[name="description"]');
    if (seo && product.seo_description) seo.content = product.seo_description;
    document.title = product.seo_title || product.name + " | " + STORE_NAME;
  }
  function handleProductResult(product, info) {
    if (info.kind === "product") renderProductDetail([product], info);
  }
  function syncProductData(products, categories) {
    if (!Array.isArray(window.PRODUCTS_DATA)) window.PRODUCTS_DATA = [];
    const previous = window.PRODUCTS_DATA.slice();
    const active = products.filter(item => item.is_active).map(item => {
      const old = previous.find(entry => String(entry.slug || "") === String(item.slug || "")) || {};
      return Object.assign(old, {
        slug: item.slug, name: item.name, category: item.category || "",
        categorySlug: item.category_slug || "",
        price: priceText(item), image: item.image_url || "",
        shortDescription: item.short_description || "",
        fullDescription: item.full_description || item.description || "",
        cmsCreated: Boolean(item.cms_created), cmsManaged: Boolean(item.cms_managed)
      });
    });
    window.PRODUCTS_DATA.splice(0, window.PRODUCTS_DATA.length, ...active);
    try {
      if (typeof PRODUCTS_INDEX !== "undefined" && Array.isArray(PRODUCTS_INDEX)) {
        const nextIndex = active.map(item => [
          item.name,
          item.cmsCreated ? rootURL("cms-product.html?slug=" + encodeURIComponent(item.slug)) :
            rootURL("products/" + encodeURIComponent(item.slug) + ".html")
        ]);
        PRODUCTS_INDEX.splice(0, PRODUCTS_INDEX.length, ...nextIndex);
      }
    } catch (_) {}
    window.HALAL_LIVE_CATALOG_READY = true;
    window.dispatchEvent(new CustomEvent("halalcatalog:updated", { detail: { products: active, categories } }));
    window.dispatchEvent(new CustomEvent("halalcart:updated", { detail: window.HALAL_CART_API?.read?.() || [] }));
  }
  async function start() {
    if (catalogRefreshInFlight) return;
    catalogRefreshInFlight = true;
    try {
      const info = pathInfo();
      if (!API_ROOT || !PUBLIC_KEY || !SITE_ROOT) {
        throw new Error("This website is missing its HALAL_STORE_CONFIG deployment settings.");
      }
      const [products, categories] = await Promise.all([
        readTable(PRODUCT_TABLE, { select: "id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,is_active,is_featured,cms_created,cms_managed,sort_order,home_sort_order,seo_title,seo_description,stock_quantity,created_at", is_active: "eq.true", order: "home_sort_order.asc,sort_order.asc,name.asc,id.asc", limit: String(MAX_PRODUCTS) }),
        readTable(CATEGORY_TABLE, { select: "id,name,slug,parent_id,description,image_url,is_active,cms_created,cms_managed,sort_order,seo_title,seo_description", is_active: "eq.true", order: "sort_order.asc,name.asc,id.asc", limit: String(MAX_CATEGORIES) })
      ]);
      currentCategories = categories;
      // Products assigned to a hidden category should not leak into home, search or cart.
      const visibleProducts = products.filter(product =>
        categories.some(category => category.slug === product.category_slug && effectiveCategoryActive(category, categories))
      );
      syncProductData(visibleProducts, categories);
      // Render catalog data before optional navigation synchronization. A navigation
      // problem must never prevent current prices/descriptions from reaching the page.
      if (info.kind === "home") renderHome(visibleProducts, categories);
      else if (info.kind === "category") renderCategory(visibleProducts, categories, info);
      else if (info.kind === "product") renderProductDetail(visibleProducts, info, categories);
      try {
        syncCategoryMenus(categories);
      } catch (error) {
        console.warn("Live catalog rendered, but category navigation could not sync.", error);
      }
      lastSuccessfulCatalogSync = Date.now();
    } finally {
      catalogRefreshInFlight = false;
    }
  }
  window.addEventListener("halalnav:ready", () => { if (currentCategories.length) syncCategoryMenus(currentCategories); });
  const refreshCatalogWhenVisible = () => {
    if (!document.hidden && Date.now() - lastSuccessfulCatalogSync > 60000) {
      initLiveCatalog();
    }
  };
  window.addEventListener("focus", refreshCatalogWhenVisible);
  document.addEventListener("visibilitychange", refreshCatalogWhenVisible);
  const initLiveCatalog = () => start().catch(error => {
    console.warn("Live catalog could not connect; leaving the static catalog in place.", error);
    const status = $("#live-catalog-status");
    if (status) status.textContent = "Catalog is temporarily showing saved static content.";
    if (/\/category\.html$/i.test(location.pathname)) {
      const heading = $("#live-category-title");
      const grid = $(".category-page-products .product-grid");
      if (heading && /loading category/i.test(heading.textContent)) heading.textContent = "Category temporarily unavailable";
      if (grid && /loading products/i.test(grid.textContent)) {
        grid.innerHTML = '<p class="muted">We could not load this category right now. Please refresh the page to try again.</p>';
      }
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLiveCatalog, { once: true });
  else initLiveCatalog();
})();
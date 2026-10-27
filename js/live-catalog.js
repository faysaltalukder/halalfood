/* Live catalog bridge: Supabase remains the source of truth for active store products and categories. */
(function () {
  "use strict";
  const API_ROOT = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
  const PUBLIC_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
  const SITE_ROOT = "https://faysaltalukder.github.io/halalfood/";
  let currentCategories = [];
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
    let response;
    try {
      response = await fetch(API_ROOT + "/rest/v1/" + table + "?" + query.toString(), {
        headers: { apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, Accept: "application/json" },
        cache: "no-store"
      });
    } catch (cause) {
      const error = new Error("Could not reach the Supabase " + table + " endpoint. Check the connection and retry.");
      error.catalogTable = table;
      error.catalogKind = "network";
      error.cause = cause;
      throw error;
    }
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.text()).slice(0, 240); } catch (_) {}
      const error = new Error("Supabase " + table + " request failed with HTTP " + response.status + (detail ? ": " + detail : ""));
      error.catalogTable = table;
      error.status = response.status;
      throw error;
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      const error = new Error("Supabase returned an invalid response for the " + table + " catalog.");
      error.catalogTable = table;
      error.catalogKind = "invalid-response";
      error.cause = cause;
      throw error;
    }
    if (!Array.isArray(data)) {
      const error = new Error("Supabase returned an unexpected " + table + " catalog format.");
      error.catalogTable = table;
      error.catalogKind = "invalid-response";
      throw error;
    }
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
  function categoryHref(category) {
    return category?.cms_created
      ? rootURL("category.html?slug=" + encodeURIComponent(category.slug))
      : rootURL("categories/" + encodeURIComponent(category?.slug || "") + ".html");
  }
  function categorySlugFromHref(href) {
    try {
      const url = new URL(href || "", SITE_ROOT);
      const querySlug = new URLSearchParams(url.search).get("slug");
      if (querySlug) return querySlug;
      const match = url.pathname.match(/\/categories\/([^/]+)\.html$/i);
      return match ? decodeURIComponent(match[1]) : "";
    } catch (_) { return ""; }
  }
  function compareCatalogProducts(a, b) {
    return Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" }) ||
      String(a.slug || "").localeCompare(String(b.slug || ""));
  }
  function sortCatalogProducts(items) {
    return [...items].sort(compareCatalogProducts);
  }
  function emptyState(message) {
    const item = document.createElement("p");
    item.className = "muted catalog-empty-state";
    item.setAttribute("role", "status");
    item.textContent = message;
    item.style.gridColumn = "1 / -1";
    return item;
  }
  function setProductControls(button, product) {
    if (!button) return;
    button.dataset.slug = product.slug;
    button.dataset.name = product.name;
    button.dataset.price = String(Number.isFinite(Number(product.price)) ? Number(product.price) : numericPrice(priceText(product)));
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
    if (description && product.cms_managed) description.textContent = product.short_description || "";
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
    const order = document.createElement("a"); order.className = "order-btn category-order-btn"; order.href = rootURL("order.html?product=" + encodeURIComponent(product.slug)); order.innerHTML = CART_ICON + "<span>Order Now</span>";
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
  function renderCategory(products, categories, info) {
    const category = categories.find(item => item.slug === info.slug && item.is_active);
    const grid = $(".category-page-products .product-grid");
    const heading = $(".category-page-heading h1, #live-category-title");
    if (!category) {
      if (heading) heading.textContent = "Category unavailable";
      document.title = "Category unavailable | Halal Food";
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = "This category is unavailable or has been hidden.";
      if (grid) grid.replaceChildren(emptyState("This category is unavailable or has been hidden."));
      return;
    }
    if (heading && (info.generic || category.cms_created || category.cms_managed)) heading.textContent = category.name;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && (info.generic || category.cms_created || category.cms_managed)) {
      meta.content = category.description || "Browse " + category.name + " products from Halal Food.";
    }
    if (info.generic || category.cms_created || category.cms_managed) {
      const pageTitle = category.name + " | Halal Food";
      document.title = pageTitle;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.href = info.generic ?
        rootURL("category.html?slug=" + encodeURIComponent(info.slug)) :
        rootURL("categories/" + encodeURIComponent(info.slug) + ".html");
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogTitle) ogTitle.content = pageTitle;
      if (ogDescription && meta) ogDescription.content = meta.content;
      if (ogUrl && canonical) ogUrl.content = canonical.href;
    }
    if (!grid) return;
    const records = sortCatalogProducts(products.filter(item =>
      item.is_active && item.category_slug === category.slug
    ));
    // Replace the static scaffold deterministically. This prevents duplicate cards and stale empty states.
    grid.replaceChildren(...records.map(item => makeProductCard(item, "standard")));
    if (!records.length) grid.appendChild(emptyState("No active products are currently listed in this category."));
  }
  // Render every active product assigned to each existing homepage merchandising rail.
  // The carousel controls are refreshed after the DOM replacement; the old scaffold card count is not a limit.
  function renderMerchandisingRails(products) {
    $$("[data-mrow]").forEach(wrap => {
      const track = $("[data-mrow-track]", wrap);
      const section = wrap.closest("section") || wrap.parentElement;
      const viewAll = $(".merch-view-all", section);
      if (!track || !viewAll) return;
      const categorySlug = categorySlugFromHref(viewAll.getAttribute("href") || "");
      if (!categorySlug) return;
      const rows = products.filter(item =>
        item.is_active && item.category_slug === categorySlug
      ).sort((a, b) =>
        Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
        compareCatalogProducts(a, b)
      );
      track.replaceChildren(...rows.map(item => makeProductCard(item, "mrow")));
      if (!rows.length) track.appendChild(emptyState("No active products are currently listed in this category."));
    });
  }
  function renderHome(products, categories) {
    const featuredGrid = $("#products .product-grid");
    if (featuredGrid) {
      const featured = sortCatalogProducts(products.filter(item => item.is_active && item.is_featured));
      featuredGrid.replaceChildren(...featured.map(item => makeProductCard(item, "standard")));
      if (!featured.length) featuredGrid.appendChild(emptyState("No products are currently marked as Featured."));
      featuredGrid.classList.add("featured-grid-4");
    }

    const jfy = $("#just-for-you .jfy-grid");
    const jfyOrdered = [...products].filter(item => item.is_active).sort((a, b) =>
      (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0) ||
      compareCatalogProducts(a, b)
    );
    const jfyRows = jfyOrdered.slice(0, 10);
    if (jfy) jfy.replaceChildren(...jfyRows.map(item => makeProductCard(item, "jfy")));

    // Keep Load More dynamic too: never re-insert the old hardcoded <template> after live data loads.
    const remainder = jfyOrdered.slice(10);
    const hiddenTemplate = $("[data-jfy-hidden]");
    if (hiddenTemplate && hiddenTemplate.tagName === "TEMPLATE") {
      hiddenTemplate.content.replaceChildren(...remainder.map(item => makeProductCard(item, "jfy")));
    } else {
      const expandedGrid = $("#just-for-you .jfy-shown");
      if (expandedGrid) expandedGrid.replaceChildren(...remainder.map(item => makeProductCard(item, "jfy")));
    }
    const loadMoreButton = $("[data-jfy-load-more]");
    if (loadMoreButton) loadMoreButton.hidden = remainder.length === 0;

    renderMerchandisingRails(products);
    patchExistingCards(products);
    const rail = $("[data-category-rail]");
    if (rail) {
      const activeCategories = categories.filter(cat => cat.is_active);
      $$(".cat-card", rail).forEach(card => {
        const slug = categorySlugFromHref(card.getAttribute("href") || "");
        if (slug && !activeCategories.some(cat => cat.slug === slug)) card.remove();
      });
      activeCategories.forEach(cat => {
        let card = $$(".cat-card", rail).find(node =>
          categorySlugFromHref(node.getAttribute("href") || "") === cat.slug
        );
        if (!card) {
          card = document.createElement("a");
          card.className = "cat-card";
          const imageBox = document.createElement("span"); imageBox.className = "cat-card-img";
          const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.decoding = "async";
          if (cat.image_url) img.src = cat.image_url;
          imageBox.appendChild(img);
          const heading = document.createElement("h3"); heading.textContent = cat.name;
          card.append(imageBox, heading);
          rail.appendChild(card);
        }
        card.href = categoryHref(cat);
        const label = $("h3", card); if (label) label.textContent = cat.name;
        const img = $("img", card);
        if (img) {
          img.alt = "";
          if (cat.image_url) setPictureImage(img, cat.image_url, "");
        }
      });
    }
    window.dispatchEvent(new CustomEvent("halalcatalog:rendered", {
      detail: { products, categories }
    }));
  }
  function syncCategoryMenus(categories) {
    const activeCategories = categories.filter(cat => cat.is_active);
    const syncLinks = container => {
      if (!container) return;
      activeCategories.forEach(cat => {
        let link = Array.from(container.querySelectorAll("a")).find(a =>
          categorySlugFromHref(a.getAttribute("href") || "") === cat.slug
        );
        if (!link) {
          link = document.createElement("a");
          container.appendChild(link);
        }
        link.href = categoryHref(cat);
        link.textContent = cat.name;
      });
      Array.from(container.querySelectorAll("a")).forEach(link => {
        const slug = categorySlugFromHref(link.getAttribute("href") || "");
        if (slug && !activeCategories.some(cat => cat.slug === slug)) link.remove();
      });
    };

    $$(".mega-menu").forEach(syncLinks);
    $$(".mobile-category-links").forEach(syncLinks);

    // Keep the footer category list consistent with the header and mobile navigation.
    $$("footer .footer-grid > div").forEach(column => {
      const heading = $("h4", column);
      const list = $("ul", column);
      if (!heading || !list || heading.textContent.trim().toLowerCase() !== "categories") return;
      list.replaceChildren(...activeCategories.map(cat => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = categoryHref(cat);
        link.textContent = cat.name;
        item.appendChild(link);
        return item;
      }));
    });
  }
  function renderRelatedProducts(products, currentProduct) {
    const section = $("#related-section");
    const grid = $("#related-grid");
    if (!section || !grid) return;
    const related = sortCatalogProducts(products.filter(item =>
      item.is_active &&
      item.slug !== currentProduct.slug &&
      item.category_slug === currentProduct.category_slug
    )).slice(0, 4);
    grid.replaceChildren(...related.map(item => makeProductCard(item, "standard")));
    section.style.display = related.length ? "" : "none";
  }

  function renderProductDetail(products, info, categories = currentCategories) {
    const product = products.find(item => item.slug === info.slug && item.is_active);
    const article = $("main .product-detail") || $("main .product-detail-grid")?.closest("article");
    if (!product) {
      // Only hide a static product page when the catalog fetch succeeded but the product or its category is unavailable.
      if (article && !article.dataset.cmsUnavailable) {
        article.dataset.cmsUnavailable = "1";
        article.innerHTML = '<div class="product-not-found"><h1>Product unavailable</h1><p>This product is no longer listed in the active catalog.</p><a class="btn-secondary" href="' + rootURL("index.html") + '">Back to store</a></div>';
      }
      const relatedSection = $("#related-section");
      if (relatedSection) relatedSection.style.display = "none";
      document.title = "Product unavailable | Halal Food";
      return;
    }
    if (!article) return;
    const title = $(".product-detail-info h1", article);
    if (title && product.cms_managed) title.textContent = product.name;
    const tag = $(".product-detail-info .tag", article);
    if (tag) tag.textContent = product.category || "";
    const price = $(".product-detail-price", article);
    if (price) price.textContent = priceText(product);
    const image = $(".product-detail-image img, .product-detail-image-wrap img", article);
    if (image) setPictureImage(image, product.image_url, product.name);
    const add = $("[data-add-to-cart][data-slug]", article);
    if (add) setProductControls(add, product);
    const order = $(".product-detail-actions .btn-primary, .product-detail-actions .order-btn", article);
    if (order) {
      order.href = rootURL("order.html?product=" + encodeURIComponent(product.slug));
      order.setAttribute("aria-label", "Order Now: " + product.name);
    }
    const message = encodeURIComponent("আমি " + product.name + " অর্ডার করতে চাই");
    const whats = $('.product-detail-actions a[href*="wa.me"]', article);
    if (whats) whats.href = "https://wa.me/8801842031164?text=" + message;

    const descriptionInner = $(".product-description-section .product-description-inner", article);
    if (descriptionInner && product.cms_managed) {
      descriptionInner.querySelectorAll("p").forEach(paragraph => paragraph.remove());
      const text = String(product.full_description || product.description || product.short_description || "Product details will be updated soon.");
      const parts = text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
      (parts.length ? parts : ["Product details will be updated soon."]).forEach(part => {
        const paragraph = document.createElement("p");
        part.split(/\n/).forEach((line, index) => {
          if (index) paragraph.appendChild(document.createElement("br"));
          paragraph.appendChild(document.createTextNode(line));
        });
        descriptionInner.appendChild(paragraph);
      });
    }
    const seo = document.querySelector('meta[name="description"]');
    if (seo && product.cms_managed) seo.content = product.seo_description || product.short_description || product.name;
    if (product.cms_managed) document.title = product.seo_title || product.name + " | Halal Food";

    const category = categories.find(item => item.slug === product.category_slug && item.is_active);
    const breadcrumb = $("#product-breadcrumb");
    if (breadcrumb) {
      breadcrumb.replaceChildren();
      const homeLink = document.createElement("a");
      homeLink.href = rootURL("index.html");
      homeLink.textContent = "Home";
      breadcrumb.append(homeLink, document.createTextNode(" › "));
      if (category) {
        const categoryLink = document.createElement("a");
        categoryLink.href = categoryHref(category);
        categoryLink.textContent = category.name;
        breadcrumb.append(categoryLink, document.createTextNode(" › "));
      } else {
        breadcrumb.append(document.createTextNode(product.category || "Category"), document.createTextNode(" › "));
      }
      breadcrumb.append(document.createTextNode(product.name));
    }
    renderRelatedProducts(products, product);
  }
  function handleProductResult(product, info) {
    if (info.kind === "product") renderProductDetail([product], info, currentCategories);
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
    const info = pathInfo();
    const [productsResult, categoriesResult] = await Promise.allSettled([
      readTable("products", { select: "id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,is_active,is_featured,cms_created,cms_managed,sort_order,seo_title,seo_description,stock_quantity,created_at", is_active: "eq.true", order: "sort_order.asc,name.asc", limit: "1000" }),
      readTable("categories", { select: "id,name,slug,description,image_url,is_active,cms_created,cms_managed,sort_order", is_active: "eq.true", order: "sort_order.asc,name.asc", limit: "500" })
    ]);
    const failures = [];
    if (productsResult.status === "rejected") failures.push("Products: " + (productsResult.reason?.message || "request failed"));
    if (categoriesResult.status === "rejected") failures.push("Categories: " + (categoriesResult.reason?.message || "request failed"));
    if (failures.length) {
      const error = new Error("Live catalog fetch failed. " + failures.join(" | "));
      error.catalogStage = "fetch";
      error.catalogFailures = failures;
      throw error;
    }
    const products = productsResult.value;
    const categories = categoriesResult.value;
    currentCategories = categories;
    // Products assigned to a hidden category should not leak into home, search or cart.
    const visibleProducts = products.filter(product =>
      categories.some(category => category.slug === product.category_slug && category.is_active)
    );
    try {
      syncProductData(visibleProducts, categories);
      syncCategoryMenus(categories);
      if (info.kind === "home") renderHome(visibleProducts, categories);
      else if (info.kind === "category") renderCategory(visibleProducts, categories, info);
      else if (info.kind === "product") renderProductDetail(visibleProducts, info, categories);
    } catch (cause) {
      const error = new Error("Live catalog data was fetched, but page synchronization did not complete.");
      error.catalogStage = "synchronization";
      error.cause = cause;
      throw error;
    }
    const status = $("#live-catalog-status");
    if (status) status.remove();
  }
  function showCatalogError(error) {
    console.error("Live catalog synchronization failed.", error);
    let status = $("#live-catalog-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "live-catalog-status";
      const container = document.querySelector("main") || document.body;
      container.prepend(status);
    }
    status.className = "catalog-sync-status catalog-sync-status-error";
    status.setAttribute("role", "alert");
    status.setAttribute("aria-live", "assertive");
    status.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:12px auto;padding:12px 16px;max-width:1200px;border:1px solid #D8D4C9;border-left:4px solid #C97B3D;border-radius:10px;background:#FFFDF8;color:#2B2A3D;font:500 14px/1.5 system-ui,sans-serif";
    status.replaceChildren();
    const message = document.createElement("span");
    message.textContent = "We couldn’t refresh the live catalog. The products or categories currently shown may be preloaded and outdated. Please retry.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry catalog";
    retry.style.cssText = "border:0;border-radius:7px;padding:8px 12px;background:#C97B3D;color:#FFFDF8;font:600 14px/1.3 system-ui,sans-serif;cursor:pointer";
    retry.addEventListener("click", async () => {
      retry.disabled = true;
      retry.textContent = "Retrying…";
      try {
        await start();
      } catch (retryError) {
        showCatalogError(retryError);
      }
    });
    status.append(message, retry);
  }
  window.addEventListener("halalnav:ready", () => {
    if (!currentCategories.length) return;
    try { syncCategoryMenus(currentCategories); }
    catch (error) { showCatalogError(error); }
  });
  const initLiveCatalog = () => start().catch(showCatalogError);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLiveCatalog, { once: true });
  else initLiveCatalog();
})();
/* Halal Food — guest shopping cart (localStorage only). No accounts/login. */
(function () {
  "use strict";
  const scriptEl = document.currentScript;
  const siteBase = scriptEl ? scriptEl.src.replace(/js\/cart\.js(?:\?.*)?$/, "") : "";
  const CART_KEY = "halal_food_cart_v1";
  const MAX_QTY = 99;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      const products = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
      return value.filter(item => item && item.slug && item.name).map(item => {
        const source = products.find(p => String(p.slug || "") === String(item.slug || ""));
        const displayPrice = String(source?.price || visibleDisplayPrice(item.slug) || item.displayPrice || item.price || "");
        // Prefer the visible unit price: older product markup could turn "৳ 950 / 500g"
        // into "950500" in data-price. Parsing displayPrice keeps the unit amount correct.
        const parsedDisplayPrice = displayPrice ? priceNumber(displayPrice) : null;
        return {
          ...item,
          name: String(source?.name || item.name),
          price: parsedDisplayPrice === null ? priceNumber(item.price) : parsedDisplayPrice,
          displayPrice,
          image: String(source?.image || item.image || ""),
          category: String(source?.category || item.category || "")
        };
      });
    } catch (_) { return []; }
  }
  function write(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("halalcart:updated", { detail: items }));
  }
  function money(value) {
    return "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 });
  }
  function priceNumber(text) {
    const match = String(text || "").match(/(?:৳|BDT)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    const n = match ? Number(match[1].replace(/,/g, "")) : 0;
    return Number.isFinite(n) ? n : 0;
  }
  function visibleDisplayPrice(slug) {
    const controls = document.querySelectorAll("[data-add-to-cart][data-slug], [data-product-cart-control][data-slug]");
    for (const control of controls) {
      if (String(control.dataset.slug || "") === String(slug || "") && control.dataset.displayPrice) {
        return String(control.dataset.displayPrice);
      }
    }
    return "";
  }
  function imageUrl(path) {
    try { return new URL(path, siteBase).href; } catch (_) { return path || ""; }
  }
  function cartUrl() {
    return new URL("cart.html", siteBase).href;
  }
  function checkoutUrl() {
    return new URL("order.html?cart=1", siteBase).href;
  }
  function totalQty(items=read()) { return items.reduce((sum, item) => sum + Number(item.qty || 0), 0); }
  function total(items=read()) { return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0); }

  function add(item, qty=1) {
    const items = read();
    const existing = items.find(x => x.slug === item.slug);
    const amount = Math.max(1, Math.min(MAX_QTY, Number(qty) || 1));
    // Always calculate from the visible unit price when it exists (e.g. "৳ 950 / 500g").
    const displayPrice = String(item.displayPrice || "");
    const unitPrice = priceNumber(displayPrice || item.price);
    if (existing) {
      existing.qty = Math.min(MAX_QTY, Number(existing.qty || 0) + amount);
      existing.price = unitPrice;
      if (displayPrice) existing.displayPrice = displayPrice;
    } else items.push({
      slug: String(item.slug), name: String(item.name), price: unitPrice,
      displayPrice: String(item.displayPrice || item.price || ""), image: String(item.image || ""),
      category: String(item.category || ""), qty: amount
    });
    write(items); renderAll();
    if(window.halalTrack){
      const trackedItem={...item,price:unitPrice,displayPrice:displayPrice || String(item.price || ""),quantity:amount};
      const value=unitPrice*amount;
      window.halalTrack("add_to_cart",{currency:"BDT",value:value,items:window.halalTrackItems([trackedItem])},"AddToCart",{
        content_ids:[String(item.slug||"")],contents:[{id:String(item.slug||""),quantity:amount,item_price:unitPrice}],content_type:"product",value:value,currency:"BDT"
      });
    }
  }
  function setQty(slug, qty) {
    const items = read();
    const item = items.find(x => x.slug === slug);
    if (!item) return;
    const n = Math.max(0, Math.min(MAX_QTY, Number(qty) || 0));
    if (n === 0) write(items.filter(x => x.slug !== slug));
    else { item.qty = n; write(items); }
    renderAll();
  }
  function remove(slug) {
    const item=read().find(x=>x.slug===slug);
    write(read().filter(x => x.slug !== slug)); renderAll();
    if(item && window.halalTrack) window.halalTrack("remove_from_cart",{currency:"BDT",value:(Number(item.price)||0)*Math.max(1,Number(item.qty)||1),items:window.halalTrackItems([item])});
  }
  function clear() { write([]); renderAll(); }

  function applyThemeMode(mode) {
    const dark = mode === "dark";
    document.documentElement.classList.toggle("dark-mode", dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      toggle.setAttribute("title", dark ? "Light mode" : "Dark mode");
      const icon = toggle.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = dark ? "☀" : "☾";
    }
  }

  function ensureThemeToggle() {
    document.querySelectorAll(".header-actions").forEach(actions => {
      if (actions.querySelector("[data-theme-toggle]")) return;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "theme-toggle";
      toggle.setAttribute("data-theme-toggle", "");
      toggle.innerHTML = '<span data-theme-icon aria-hidden="true">☾</span>';
      toggle.addEventListener("click", () => {
        const next = document.documentElement.classList.contains("dark-mode") ? "light" : "dark";
        localStorage.setItem("halal-food-theme", next);
        applyThemeMode(next);
      });
      actions.insertBefore(toggle, actions.firstElementChild);
    });
  }

  function initThemeMode() {
    let saved = "";
    try { saved = localStorage.getItem("halal-food-theme") || ""; } catch (_) {}
    const mode = saved === "dark" ? "dark" : "light";
    applyThemeMode(mode);
    ensureThemeToggle();
    applyThemeMode(mode);
  }

  function ensureHeaderButton() {
    document.querySelectorAll(".header-actions").forEach(actions => {
      const oldContact = actions.querySelector(".call-btn");
      if (oldContact) oldContact.remove();

      let trackButton = actions.querySelector(".header-track-order");
      if (!trackButton) {
        trackButton = document.createElement("a");
        trackButton.className = "header-track-order";
        trackButton.href = "track-order.html";
        trackButton.setAttribute("aria-label", "Track Order");
        trackButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7.5h11v9H3z"></path><path d="M14 10h3.5l3.5 3.5V16h-7z"></path><circle cx="7" cy="18" r="1.5"></circle><circle cx="18" cy="18" r="1.5"></circle><path d="M14 13h6"></path></svg><span>Track Order</span>';
        actions.appendChild(trackButton);
      }

      if (actions.querySelector("[data-cart-open]")) return;
      const link = document.createElement("a");
      link.className = "header-cart";
      link.href = cartUrl();
      link.setAttribute("data-cart-open", "true");
      link.setAttribute("aria-label", "Shopping cart");
      link.innerHTML = '<span class="header-cart-icon header-cart-icon--desktop" aria-hidden="true">🛒</span><span class="header-cart-icon header-cart-icon--mobile" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5.5 8h13l1 12h-15l1-12Z"></path><path d="M9 8V6.2a3 3 0 0 1 6 0V8"></path></svg></span><span class="header-cart-label">Cart</span><span class="cart-count" data-cart-count>0</span>';
      actions.insertBefore(link, trackButton);
    });
  }

  function ensureDrawer() {
    if (document.querySelector("#cart-drawer")) return;
    const drawer = document.createElement("aside");
    drawer.id = "cart-drawer";
    drawer.className = "cart-drawer";
    drawer.innerHTML = `
      <div class="cart-drawer-head"><div><span class="section-eyebrow">Halal Food</span><h2>Your Cart</h2></div><button type="button" class="cart-close" data-cart-close aria-label="Close cart">×</button></div>
      <div class="cart-drawer-items" data-cart-drawer-items></div>
      <div class="cart-drawer-foot"><div class="cart-total-row"><span>Subtotal</span><strong data-cart-drawer-total>৳ 0</strong></div><a class="btn-primary cart-checkout-btn" href="${checkoutUrl()}">Proceed to Order</a><a class="cart-view-link" href="${cartUrl()}">View Full Cart</a></div>`;
    const shade = document.createElement("div");
    shade.className = "cart-drawer-backdrop";
    shade.setAttribute("data-cart-close", "true");
    document.body.append(drawer, shade);
  }
  function setDrawer(open) {
    const drawer = document.querySelector("#cart-drawer");
    const shade = document.querySelector(".cart-drawer-backdrop");
    if (!drawer) return;
    drawer.classList.toggle("open", open); shade?.classList.toggle("open", open);
    document.body.classList.toggle("cart-open", open);
  }
  function itemMarkup(item, compact=false) {
    const line = Number(item.price || 0) * Number(item.qty || 0);
    return `<div class="cart-item" data-cart-item="${html.escape(item.slug)}">
      <a class="cart-item-image" href="${html.escape(new URL("products/" + item.slug + ".html", siteBase).href)}"><img src="${html.escape(imageUrl(String(item.image || "").replace(/\.(jpe?g|png)$/i, ".webp")))}" alt="${html.escape(item.name)}"></a>
      <div class="cart-item-info"><a class="cart-item-name" href="${html.escape(new URL("products/" + item.slug + ".html", siteBase).href)}">${html.escape(item.name)}</a><span class="cart-item-price">${html.escape(item.displayPrice || money(item.price))} × ${item.qty}</span>
      ${compact ? "" : `<div class="cart-qty"><button type="button" data-cart-dec="${html.escape(item.slug)}" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button type="button" data-cart-inc="${html.escape(item.slug)}" aria-label="Increase quantity">+</button></div>`}</div>
      <div class="cart-item-actions">${compact ? `<span class="cart-item-line-total">${money(line)}</span>` : `<button type="button" class="cart-remove" data-cart-remove="${html.escape(item.slug)}" aria-label="Remove ${html.escape(item.name)}">Remove</button>`}</div>
    </div>`;
  }
  function checkoutItemMarkup(item) {
    const line = Number(item.price || 0) * Number(item.qty || 0);
    const productHref = new URL("products/" + item.slug + ".html", siteBase).href;
    const image = imageUrl(String(item.image || "").replace(/\.(jpe?g|png)$/i, ".webp"));
    return `<div class="cart-item checkout-cart-item" data-cart-item="${html.escape(item.slug)}">
      <a class="cart-item-image" href="${html.escape(productHref)}"><img src="${html.escape(image)}" alt="${html.escape(item.name)}" loading="lazy"></a>
      <div class="cart-item-info">
        <a class="cart-item-name" href="${html.escape(productHref)}">${html.escape(item.name)}</a>
        <span class="cart-item-price">${html.escape(item.displayPrice || money(item.price))} per unit</span>
        <div class="cart-qty"><button type="button" data-cart-dec="${html.escape(item.slug)}" aria-label="Decrease ${html.escape(item.name)} quantity">−</button><span>${Number(item.qty)||1}</span><button type="button" data-cart-inc="${html.escape(item.slug)}" aria-label="Increase ${html.escape(item.name)} quantity">+</button></div>
      </div>
      <div class="cart-item-actions"><strong class="checkout-line-total">${money(line)}</strong><button type="button" class="cart-remove" data-cart-remove="${html.escape(item.slug)}" aria-label="Remove ${html.escape(item.name)}">Remove</button></div>
    </div>`;
  }

  const html = { escape: s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])) };

  function renderCounts() {
    const qty = totalQty();
    document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = String(qty); el.classList.toggle("is-empty", qty === 0); });
  }

  // Keep the shopper on the current page and turn added product buttons into quantity steppers.
  function renderProductCartControls() {
    const quantities = new Map(read().map(item => [String(item.slug), Math.max(0, Number(item.qty) || 0)]));
    const targets = document.querySelectorAll("button[data-add-to-cart], [data-product-cart-control]");
    targets.forEach(current => {
      const slug = String(current.dataset.slug || "");
      if (!slug) return;
      const qty = quantities.get(slug) || 0;

      if (current.matches("button[data-add-to-cart]")) {
        if (qty < 1) return;
        const wrapper = document.createElement("div");
        const originalClass = current.className;
        wrapper.className = originalClass + " cart-qty-control";
        wrapper.dataset.productCartControl = "";
        wrapper.dataset.cartOriginalHtml = current.innerHTML;
        wrapper.dataset.cartOriginalClass = originalClass;
        wrapper.dataset.cartOriginalAria = current.getAttribute("aria-label") || ("Add " + (current.dataset.name || "product") + " to cart");
        Array.from(current.attributes).forEach(attribute => {
          if (["class", "type", "aria-label", "data-add-to-cart"].includes(attribute.name)) return;
          wrapper.setAttribute(attribute.name, attribute.value);
        });
        wrapper.setAttribute("role", "group");
        wrapper.setAttribute("aria-label", "Quantity for " + (current.dataset.name || "product"));
        renderQuantityStepper(wrapper, slug, current.dataset.name || "product", qty);
        current.replaceWith(wrapper);
        return;
      }

      if (current.hasAttribute("data-product-cart-control")) {
        if (qty < 1) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = current.dataset.cartOriginalClass || "cart-add-btn";
          Array.from(current.attributes).forEach(attribute => {
            if (["class", "role", "aria-label", "data-product-cart-control", "data-cart-original-html", "data-cart-original-class", "data-cart-original-aria"].includes(attribute.name)) return;
            button.setAttribute(attribute.name, attribute.value);
          });
          button.setAttribute("data-add-to-cart", "");
          const label = current.dataset.cartOriginalAria;
          if (label) button.setAttribute("aria-label", label);
          button.innerHTML = current.dataset.cartOriginalHtml || "<span>Add to Cart</span>";
          current.replaceWith(button);
          return;
        }
        const count = current.querySelector(".cart-qty-value");
        if (count && count.textContent !== String(qty)) count.textContent = String(qty);
        const dec = current.querySelector("[data-product-qty-dec]");
        if (dec) dec.setAttribute("aria-label", "Remove one " + (current.dataset.name || "item"));
        const inc = current.querySelector("[data-product-qty-inc]");
        if (inc) inc.setAttribute("aria-label", "Add one " + (current.dataset.name || "item"));
      }
    });
  }

  function renderQuantityStepper(wrapper, slug, name, qty) {
    wrapper.replaceChildren();
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "cart-qty-action cart-qty-minus";
    minus.dataset.productQtyDec = slug;
    minus.setAttribute("aria-label", "Remove one " + name);
    minus.textContent = "−";

    const count = document.createElement("span");
    count.className = "cart-qty-value";
    count.dataset.cartQtyValue = slug;
    count.setAttribute("aria-live", "polite");
    count.textContent = String(qty);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "cart-qty-action cart-qty-plus";
    plus.dataset.productQtyInc = slug;
    plus.setAttribute("aria-label", "Add one " + name);
    plus.textContent = "+";

    wrapper.append(minus, count, plus);
  }
  function renderDrawer() {
    const box = document.querySelector("[data-cart-drawer-items]");
    if (!box) return;
    const items = read();
    box.innerHTML = items.length ? items.map(item => itemMarkup(item)).join("") : '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><h3>Your cart is empty</h3><p>Add a few products and they will stay here on this device.</p><a class="btn-secondary" href="' + cartUrl() + '">Browse Products</a></div>';
    const totalEl = document.querySelector("[data-cart-drawer-total]"); if (totalEl) totalEl.textContent = money(total(items));
  }
  function renderPage() {
    const cartPageItems=read();
    if(document.querySelector("[data-cart-page]") && cartPageItems.length && !window.__HALAL_VIEW_CART_TRACKED__){
      window.__HALAL_VIEW_CART_TRACKED__=true;
      window.halalTrack?.("view_cart",{currency:"BDT",value:total(cartPageItems),items:window.halalTrackItems(cartPageItems)});
    }
    const box = document.querySelector("[data-cart-page-items]");
    if (!box) return;
    const items = read();
    box.innerHTML = items.length ? items.map(item => itemMarkup(item)).join("") : '<div class="cart-empty cart-page-empty"><div class="cart-empty-icon">🛒</div><h2>Your cart is empty</h2><p>Browse the products and use “Add to Cart” to build your order.</p><a class="btn-primary" href="index.html#products">Browse Products</a></div>';
    const subtotal = document.querySelector("[data-cart-page-total]"); if (subtotal) subtotal.textContent = money(total(items));
    const checkout = document.querySelector("[data-cart-checkout-link]"); if (checkout) checkout.classList.toggle("disabled", items.length === 0);
    const summary = document.querySelector("[data-cart-page-count]"); if (summary) summary.textContent = `${totalQty(items)} item${totalQty(items) === 1 ? "" : "s"}`;
  }
  function renderOrderSummary() {
    const box = document.querySelector("[data-cart-checkout-summary]");
    if (!box) return;
    const items = read();
    window.HALAL_CART_MODE = new URLSearchParams(location.search).get("cart") === "1";
    if (!window.HALAL_CART_MODE) { box.style.display = "none"; return; }
    box.style.display = "block";
    if (!items.length) {
      box.innerHTML = '<div class="cart-empty"><h2>Your cart is empty</h2><p>Please add products before placing a cart order.</p><a class="btn-secondary" href="index.html#products">Browse Products</a></div>';
      const form = document.querySelector("#order-form"); if (form) form.classList.add("cart-order-disabled");
      return;
    }
    const form = document.querySelector("#order-form"); if (form) form.classList.remove("cart-order-disabled");
    box.innerHTML = `<div class="cart-checkout-summary-head"><div><span class="section-eyebrow">Order Items</span><h2>Review your cart</h2></div><strong>${money(total(items))}</strong></div><div class="cart-checkout-list">${items.map(item => checkoutItemMarkup(item)).join("")}</div><div class="cart-checkout-summary-bottom"><span>${totalQty(items)} item${totalQty(items) === 1 ? "" : "s"}</span><strong>Products subtotal: ${money(total(items))}</strong></div>`;
    const productInput = document.querySelector("#product"); if (productInput) productInput.value = items.map(i => `${i.name} × ${i.qty}`).join(" | ");
    const quantityInput = document.querySelector("#quantity"); if (quantityInput) quantityInput.value = String(totalQty(items));
    const display = document.querySelector("#product-display"); if (display) display.textContent = `${items.length} product${items.length===1?"":"s"} in cart`;
    document.querySelectorAll("[data-single-order-review]").forEach(el => el.style.display = "none");
  }

  function renderAll() { renderCounts(); renderProductCartControls(); renderDrawer(); renderPage(); renderOrderSummary(); }

  document.addEventListener("click", event => {
    const addBtn = event.target.closest("[data-add-to-cart]");
    if (addBtn) {
      // Add in place; prevent a product-card wrapper/link from navigating to Cart or Product.
      event.preventDefault();
      event.stopPropagation();
      if (!addBtn.dataset.slug || !addBtn.dataset.name) return;
      add({slug:addBtn.dataset.slug, name:addBtn.dataset.name, price:addBtn.dataset.price, displayPrice:addBtn.dataset.displayPrice, image:addBtn.dataset.image, category:addBtn.dataset.category}, addBtn.dataset.qty || 1);
      return;
    }
    const productInc = event.target.closest("[data-product-qty-inc]");
    if (productInc) {
      event.preventDefault();
      event.stopPropagation();
      const item = read().find(x => String(x.slug) === String(productInc.dataset.productQtyInc));
      if (item) add(item, 1);
      return;
    }
    const productDec = event.target.closest("[data-product-qty-dec]");
    if (productDec) {
      event.preventDefault();
      event.stopPropagation();
      const item = read().find(x => String(x.slug) === String(productDec.dataset.productQtyDec));
      if (item) {
        if (Number(item.qty) <= 1) remove(item.slug);
        else setQty(item.slug, Number(item.qty) - 1);
      }
      return;
    }
    const open = event.target.closest("[data-cart-open]");
    if (open && !/cart\.html$/i.test(location.pathname)) { event.preventDefault(); setDrawer(true); return; }
    if (event.target.closest("[data-cart-close]")) { setDrawer(false); return; }
    const inc = event.target.closest("[data-cart-inc]"); if (inc) { const item=read().find(x=>x.slug===inc.dataset.cartInc); if(item)setQty(item.slug, item.qty+1); return; }
    const dec = event.target.closest("[data-cart-dec]"); if (dec) { const item=read().find(x=>x.slug===dec.dataset.cartDec); if(item)setQty(item.slug, item.qty-1); return; }
    const rem = event.target.closest("[data-cart-remove]"); if (rem) { remove(rem.dataset.cartRemove); return; }
    const clearBtn = event.target.closest("[data-cart-clear]"); if (clearBtn) { clear(); return; }
  }, true);

  // Product cards can be inserted after initial page load (home page, category rails, load-more).
  // Observe only newly inserted controls so their quantities always match the cart without navigation.
  function observeProductCartControls() {
    if (!document.body || document.body.dataset.cartControlsObserved === "1") return;
    document.body.dataset.cartControlsObserved = "1";
    let pending = false;
    const selector = 'button[data-add-to-cart], [data-product-cart-control]';
    const hasControl = node => node && node.nodeType === 1 &&
      (node.matches(selector) || Boolean(node.querySelector(selector)));
    const observer = new MutationObserver(records => {
      const shouldRefresh = records.some(record =>
        Array.from(record.addedNodes || []).some(hasControl)
      );
      if (!shouldRefresh || pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        renderProductCartControls();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("keydown", e => { if (e.key === "Escape") setDrawer(false); });
  window.addEventListener("halalcart:updated", renderAll);
  window.addEventListener("storage", e => { if (e.key === CART_KEY) renderAll(); });

  window.HALAL_CART_API = { read, add, setQty, remove, clear, total, totalQty };
  window.HALAL_CART_KEY = CART_KEY;

  document.addEventListener("DOMContentLoaded", () => {
    initThemeMode(); ensureHeaderButton(); ensureDrawer(); renderAll(); observeProductCartControls();
    if (document.querySelector("[data-cart-page]")) renderPage();
    if (document.querySelector("[data-cart-checkout-summary]")) renderOrderSummary();
  });
})();

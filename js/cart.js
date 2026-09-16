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
      return Array.isArray(value) ? value.filter(item => item && item.slug && item.name) : [];
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
    const n = Number(String(text || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
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
    if (existing) existing.qty = Math.min(MAX_QTY, Number(existing.qty || 0) + amount);
    else items.push({
      slug: String(item.slug), name: String(item.name), price: priceNumber(item.price),
      displayPrice: String(item.displayPrice || item.price || ""), image: String(item.image || ""),
      category: String(item.category || "") , qty: amount
    });
    write(items); renderAll();
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
  function remove(slug) { write(read().filter(x => x.slug !== slug)); renderAll(); }
  function clear() { write([]); renderAll(); }

  function ensureHeaderButton() {
    document.querySelectorAll(".header-actions").forEach(actions => {
      if (actions.querySelector("[data-cart-open]")) return;
      const link = document.createElement("a");
      link.className = "header-cart";
      link.href = cartUrl();
      link.setAttribute("data-cart-open", "true");
      link.setAttribute("aria-label", "Shopping cart");
      link.innerHTML = '<span class="header-cart-icon" aria-hidden="true">🛒</span><span class="header-cart-label">Cart</span><span class="cart-count" data-cart-count>0</span>';
      actions.appendChild(link);
    });
  }

  function ensureDrawer() {
    if (document.querySelector("#cart-drawer")) return;
    const drawer = document.createElement("aside");
    drawer.id = "cart-drawer";
    drawer.className = "cart-drawer";
    drawer.setAttribute("aria-hidden", "true");
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
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("cart-open", open);
  }
  function itemMarkup(item, compact=false) {
    const line = Number(item.price || 0) * Number(item.qty || 0);
    return `<div class="cart-item" data-cart-item="${html.escape(item.slug)}">
      <a class="cart-item-image" href="${html.escape(new URL("products/" + item.slug + ".html", siteBase).href)}"><img src="${html.escape(imageUrl(item.image))}" alt="${html.escape(item.name)}"></a>
      <div class="cart-item-info"><a class="cart-item-name" href="${html.escape(new URL("products/" + item.slug + ".html", siteBase).href)}">${html.escape(item.name)}</a><span class="cart-item-price">${html.escape(item.displayPrice || money(item.price))}</span>
      ${compact ? `<div class="cart-item-line-total">${money(line)}</div>` : `<div class="cart-qty"><button type="button" data-cart-dec="${html.escape(item.slug)}" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button type="button" data-cart-inc="${html.escape(item.slug)}" aria-label="Increase quantity">+</button></div>`}</div>
      <div class="cart-item-actions">${compact ? `<span class="cart-item-line-total">${money(line)}</span>` : `<button type="button" class="cart-remove" data-cart-remove="${html.escape(item.slug)}" aria-label="Remove ${html.escape(item.name)}">Remove</button>`}</div>
    </div>`;
  }
  const html = { escape: s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])) };

  function renderCounts() {
    const qty = totalQty();
    document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = String(qty); el.classList.toggle("is-empty", qty === 0); });
  }
  function renderDrawer() {
    const box = document.querySelector("[data-cart-drawer-items]");
    if (!box) return;
    const items = read();
    box.innerHTML = items.length ? items.map(item => itemMarkup(item)).join("") : '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><h3>Your cart is empty</h3><p>Add a few products and they will stay here on this device.</p><a class="btn-secondary" href="' + cartUrl() + '">Browse Products</a></div>';
    const totalEl = document.querySelector("[data-cart-drawer-total]"); if (totalEl) totalEl.textContent = money(total(items));
  }
  function renderPage() {
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
    box.innerHTML = `<div class="cart-checkout-summary-head"><div><span class="section-eyebrow">Order Items</span><h2>Review your cart</h2></div><strong>${money(total(items))}</strong></div><div class="cart-checkout-list">${items.map(item => itemMarkup(item, true)).join("")}</div><div class="cart-checkout-summary-bottom"><span>${totalQty(items)} item${totalQty(items) === 1 ? "" : "s"}</span><strong>Subtotal: ${money(total(items))}</strong></div>`;
    const productInput = document.querySelector("#product"); if (productInput) productInput.value = items.map(i => `${i.name} × ${i.qty}`).join(" | ");
    const quantityInput = document.querySelector("#quantity"); if (quantityInput) quantityInput.value = String(totalQty(items));
    const display = document.querySelector("#product-display"); if (display) display.textContent = `${items.length} product${items.length===1?"":"s"} in cart`;
    document.querySelectorAll("[data-single-order-review]").forEach(el => el.style.display = "none");
  }

  function renderAll() { renderCounts(); renderDrawer(); renderPage(); renderOrderSummary(); }

  document.addEventListener("click", event => {
    const addBtn = event.target.closest("[data-add-to-cart]");
    if (addBtn) {
      event.preventDefault();
      add({slug:addBtn.dataset.slug, name:addBtn.dataset.name, price:addBtn.dataset.price, displayPrice:addBtn.dataset.displayPrice, image:addBtn.dataset.image, category:addBtn.dataset.category}, addBtn.dataset.qty || 1);
      setDrawer(true);
      return;
    }
    const open = event.target.closest("[data-cart-open]");
    if (open && !/cart\.html$/i.test(location.pathname)) { event.preventDefault(); setDrawer(true); return; }
    if (event.target.closest("[data-cart-close]")) { setDrawer(false); return; }
    const inc = event.target.closest("[data-cart-inc]"); if (inc) { const item=read().find(x=>x.slug===inc.dataset.cartInc); if(item)setQty(item.slug, item.qty+1); return; }
    const dec = event.target.closest("[data-cart-dec]"); if (dec) { const item=read().find(x=>x.slug===dec.dataset.cartDec); if(item)setQty(item.slug, item.qty-1); return; }
    const rem = event.target.closest("[data-cart-remove]"); if (rem) { remove(rem.dataset.cartRemove); return; }
    const clearBtn = event.target.closest("[data-cart-clear]"); if (clearBtn) { clear(); return; }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setDrawer(false); });
  window.addEventListener("halalcart:updated", renderAll);
  window.addEventListener("storage", e => { if (e.key === CART_KEY) renderAll(); });

  window.HALAL_CART_API = { read, add, setQty, remove, clear, total, totalQty };
  window.HALAL_CART_KEY = CART_KEY;

  document.addEventListener("DOMContentLoaded", () => {
    ensureHeaderButton(); ensureDrawer(); renderAll();
    if (document.querySelector("[data-cart-page]")) renderPage();
    if (document.querySelector("[data-cart-checkout-summary]")) renderOrderSummary();
  });
})();

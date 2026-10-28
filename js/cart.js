/* Halal Food — guest shopping cart (localStorage only). No accounts/login. */
(function () {
  "use strict";
  const scriptEl = document.currentScript;
  const siteBase = scriptEl ? scriptEl.src.replace(/js\/cart\.js(?:\?.*)?$/, "") : "";
  const CART_KEY = "halal_food_cart_v1";
  const MAX_QTY = 99;
  const AUTH_STORAGE_KEY = "sb-qfwvrcfkrsydycbfjsxf-auth-token";
  const CART_OWNER_KEY = "halal_food_cart_owner_v1";
  const SUPABASE_URL = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
  const SUPABASE_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
  let cloudCartClient = null;
  let cloudCartUserId = null;
  let cloudCartReady = false;
  let cloudCartPaused = 0;
  let cloudCartSaveTimer = 0;
  let cloudCartStartPromise = null;
  let cloudCartSaveQueue = Promise.resolve();
  let cloudSupabaseSdkPromise = null;

  function readStoredAuthUser() {
    try {
      let raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      if (raw.startsWith("base64-")) {
        const encoded = raw.slice(7).replace(/-/g, "+").replace(/_/g, "/");
        const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
        const binary = atob(padded);
        raw = new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
      }
      const stored = JSON.parse(raw);
      return stored?.user || stored?.currentSession?.user || null;
    } catch (_) { return null; }
  }

  function loadSupabaseSdk() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    if (cloudSupabaseSdkPromise) return cloudSupabaseSdkPromise;
    cloudSupabaseSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4";
      script.async = true;
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error("Supabase client library did not initialize."));
      script.onerror = () => reject(new Error("Supabase client library could not be loaded."));
      document.head.appendChild(script);
    });
    return cloudSupabaseSdkPromise;
  }

  async function getCloudCartClient(preferredClient) {
    if (preferredClient?.from && preferredClient?.auth) {
      cloudCartClient = preferredClient;
      window.halalSupabaseClient = preferredClient;
      return preferredClient;
    }
    if (window.halalSupabaseClient?.from && window.halalSupabaseClient?.auth) {
      cloudCartClient = window.halalSupabaseClient;
      return cloudCartClient;
    }
    await loadSupabaseSdk();
    if (!window.halalSupabaseClient?.from) {
      window.halalSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    cloudCartClient = window.halalSupabaseClient;
    return cloudCartClient;
  }

  function waitForLiveCatalog() {
    if (window.HALAL_LIVE_CATALOG_READY === true) return Promise.resolve();
    return new Promise(resolve => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener("halalcatalog:updated", finish);
        resolve();
      };
      window.addEventListener("halalcatalog:updated", finish, { once: true });
      window.setTimeout(finish, 1400);
    });
  }

  function scheduleCloudCartSave() {
    if (!cloudCartReady || !cloudCartUserId || cloudCartPaused) return;
    window.clearTimeout(cloudCartSaveTimer);
    cloudCartSaveTimer = window.setTimeout(() => {
      const userId = cloudCartUserId;
      saveCloudCartSnapshot(userId, read()).catch(error => {
        console.warn("Could not sync the saved cart to the customer account.", error?.message || error);
      });
    }, 450);
  }

  function saveCloudCartSnapshot(userId, items) {
    if (!cloudCartClient || !userId) return Promise.resolve();
    const snapshot = (items || []).map(item => ({
      user_id: userId,
      product_slug: String(item.slug || ""),
      quantity: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(item.qty) || 1))),
      product_name: String(item.name || ""),
      unit_price: Math.max(0, Number(item.price) || 0),
      display_price: String(item.displayPrice || ""),
      image_url: String(item.image || ""),
      category_slug: String(item.category || "")
    })).filter(item => item.product_slug && item.product_name);
    cloudCartSaveQueue = cloudCartSaveQueue.catch(() => {}).then(async () => {
      if (!cloudCartClient || cloudCartUserId !== userId) return;
      const { data: existing, error: listError } = await cloudCartClient
        .from("customer_cart_items").select("product_slug").eq("user_id", userId);
      if (listError) throw listError;

      if (snapshot.length) {
        const { error: upsertError } = await cloudCartClient
          .from("customer_cart_items").upsert(snapshot, { onConflict: "user_id,product_slug" });
        if (upsertError) throw upsertError;
      }
      const keep = new Set(snapshot.map(item => item.product_slug));
      const stale = (existing || []).map(row => row.product_slug).filter(slug => !keep.has(slug));
      if (stale.length) {
        const { error: deleteError } = await cloudCartClient
          .from("customer_cart_items").delete().eq("user_id", userId).in("product_slug", stale);
        if (deleteError) throw deleteError;
      }
      window.dispatchEvent(new CustomEvent("halalcloudcart:saved", { detail: { userId, itemCount: snapshot.length } }));
    });
    return cloudCartSaveQueue;
  }

  async function startCloudCartSync(preferredClient = null, preferredUser = null) {
    const hintedUser = preferredUser || readStoredAuthUser();
    if (!hintedUser?.id) {
      cloudCartReady = false;
      cloudCartUserId = null;
      return;
    }
    if (cloudCartReady && cloudCartUserId === hintedUser.id) return;
    if (cloudCartStartPromise) {
      try { await cloudCartStartPromise; } catch (_) {}
      if (cloudCartReady && cloudCartUserId === hintedUser.id) return;
    }

    const task = (async () => {
      const client = await getCloudCartClient(preferredClient);
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const sessionUser = data?.session?.user;
      const user = sessionUser?.id === hintedUser.id
        ? sessionUser
        : preferredUser?.id === hintedUser.id ? preferredUser : null;
      if (!user?.id) {
        cloudCartReady = false;
        cloudCartUserId = null;
        return;
      }

      cloudCartClient = client;
      cloudCartUserId = user.id;
      cloudCartReady = false;
      await waitForLiveCatalog();

      const { data: rows, error } = await client.from("customer_cart_items")
        .select("product_slug,quantity,product_name,unit_price,display_price,image_url,category_slug,updated_at")
        .eq("user_id", user.id);
      if (error) throw error;

      const products = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
      const storedCartOwner = (() => { try { return localStorage.getItem(CART_OWNER_KEY) || ""; } catch (_) { return ""; } })();
      // A cart owned by another signed-in account must never be merged into this user's cart.
      // A missing owner means the items are a guest cart and can be merged during sign-in.
      const localItems = storedCartOwner && storedCartOwner !== user.id ? [] : read();
      const merged = new Map(localItems.map(item => [String(item.slug), { ...item }]));
      (rows || []).forEach(row => {
        const slug = String(row.product_slug || "");
        if (!slug) return;
        if (window.HALAL_LIVE_CATALOG_READY === true && !products.some(product => String(product.slug || "") === slug)) return;
        const cloudItem = {
          slug,
          name: String(row.product_name || slug),
          price: Math.max(0, Number(row.unit_price) || 0),
          displayPrice: String(row.display_price || row.unit_price || ""),
          image: String(row.image_url || ""),
          category: String(row.category_slug || ""),
          qty: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(row.quantity) || 1)))
        };
        const previous = merged.get(slug);
        if (previous) {
          previous.qty = Math.max(1, Math.min(MAX_QTY, Math.max(Number(previous.qty) || 0, cloudItem.qty)));
        } else {
          merged.set(slug, cloudItem);
        }
      });

      try { localStorage.setItem(CART_OWNER_KEY, user.id); } catch (_) {}
      cloudCartPaused++;
      try { write(Array.from(merged.values())); }
      finally { cloudCartPaused--; }
      cloudCartReady = true;
      await saveCloudCartSnapshot(user.id, read());
      window.dispatchEvent(new CustomEvent("halalcloudcart:ready", { detail: { userId: user.id } }));
    })();

    cloudCartStartPromise = task;
    try { await task; }
    catch (error) {
      cloudCartReady = false;
      cloudCartUserId = null;
      console.warn("Your cart is still available on this device; cloud sync could not complete.", error?.message || error);
    }
    finally { if (cloudCartStartPromise === task) cloudCartStartPromise = null; }
  }

  window.halalStartCloudCartSync = startCloudCartSync;

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      const products = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
      const catalogReady = window.HALAL_LIVE_CATALOG_READY === true;
      return value.filter(item => item && item.slug && item.name && (!catalogReady || products.some(p => String(p.slug || "") === String(item.slug || "")))).map(item => {
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
    if (cloudCartReady && cloudCartUserId) {
      try { localStorage.setItem(CART_OWNER_KEY, cloudCartUserId); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("halalcart:updated", { detail: items }));
    scheduleCloudCartSave();
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

  function ensureCategoryFloatingCart() {
    if (!document.body || !document.body.classList.contains("category-products-page")) return;
    if (document.querySelector(".mobile-floating-cart")) return;

    const link = document.createElement("a");
    link.className = "mobile-floating-cart";
    link.href = cartUrl();
    link.setAttribute("aria-label", "Open shopping cart");
    link.innerHTML = '<span class="mobile-floating-cart-top"><span class="mobile-floating-cart-icon-wrap"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5.5 8h13l1 12h-15l1-12Z"></path><path d="M9 8V6.2a3 3 0 0 1 6 0V8"></path></svg><b class="mobile-floating-cart-count" data-cart-count>0</b></span><span class="mobile-floating-cart-label">Items</span></span><span class="mobile-floating-cart-total" data-cart-total>৳ 0</span>';
    document.body.appendChild(link);
  }

  function ensureHeaderButton() {
    document.querySelectorAll(".header-actions").forEach(actions => {
      const oldContact = actions.querySelector(".call-btn");
      if (oldContact) oldContact.remove();

      let trackButton = actions.querySelector(".header-track-order");
      if (!trackButton) {
        trackButton = document.createElement("a");
        trackButton.className = "header-track-order";
        trackButton.setAttribute("aria-label", "Track Order");
        trackButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7.5h11v9H3z"></path><path d="M14 10h3.5l3.5 3.5V16h-7z"></path><circle cx="7" cy="18" r="1.5"></circle><circle cx="18" cy="18" r="1.5"></circle><path d="M14 13h6"></path></svg><span>Track Order</span>';
        actions.appendChild(trackButton);
      }
      trackButton.href = new URL("track-order.html", siteBase).href;

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
        <div class="cart-qty"><button type="button" data-cart-dec="${html.escape(item.slug)}" aria-label="Decrease ${html.escape(item.name)} quantity">−</button><input aria-label="Quantity for ${html.escape(item.name)}" data-checkout-qty="${html.escape(item.slug)}" inputmode="numeric" max="${MAX_QTY}" min="1" step="1" type="number" value="${Number(item.qty)||1}"><button type="button" data-cart-inc="${html.escape(item.slug)}" aria-label="Increase ${html.escape(item.name)} quantity">+</button></div>
      </div>
      <div class="cart-item-actions"><strong class="checkout-line-total">${money(line)}</strong><button type="button" class="cart-remove" data-cart-remove="${html.escape(item.slug)}" aria-label="Remove ${html.escape(item.name)}">Remove</button></div>
    </div>`;
  }

  const html = { escape: s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])) };

  function renderCounts() {
    const items = read();
    const qty = totalQty(items);
    const amount = money(total(items));
    document.querySelectorAll("[data-cart-count]").forEach(el => {
      el.textContent = String(qty);
      el.classList.toggle("is-empty", qty === 0);
    });
    document.querySelectorAll("[data-cart-total]").forEach(el => {
      el.textContent = amount;
    });
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
        const count = current.querySelector("[data-product-qty-input]");
        if (count && document.activeElement !== count && count.value !== String(qty)) count.value = String(qty);
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

    const count = document.createElement("input");
    count.type = "number";
    count.className = "cart-qty-input";
    count.dataset.productQtyInput = slug;
    count.setAttribute("aria-label", "Quantity for " + name);
    count.setAttribute("inputmode", "numeric");
    count.autocomplete = "off";
    count.min = "1";
    count.max = String(MAX_QTY);
    count.step = "1";
    count.value = String(qty);

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

  // When the server-managed catalog arrives, refresh persisted cart snapshots too.
  // This keeps cart rows, checkout totals and account-synced carts aligned with live prices.
  window.addEventListener("halalcatalog:updated", () => {
    write(read());
    renderAll();
  });

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

  // Commit manually edited product quantities on change, blur, or Enter.
  function commitProductQtyInput(input) {
    const slug = String(input.dataset.productQtyInput || "");
    const item = read().find(entry => String(entry.slug) === slug);
    if (!item) return;
    const raw = String(input.value ?? "").trim();
    const entered = raw === "" ? (Number(item.qty) || 1) : Number(raw);
    const quantity = Math.max(1, Math.min(MAX_QTY, Math.floor(Number.isFinite(entered) ? entered : (Number(item.qty) || 1))));
    if (Number(item.qty) !== quantity) setQty(slug, quantity);
    input.value = String(quantity);
  }

  // Commit manually entered checkout quantities when the field loses focus or Enter is pressed.
  document.addEventListener("change", event => {
    const productQtyInput = event.target.closest("[data-product-qty-input]");
    if (productQtyInput) {
      commitProductQtyInput(productQtyInput);
      return;
    }
    const input = event.target.closest("[data-checkout-qty]");
    if (!input) return;
    const slug = String(input.dataset.checkoutQty || "");
    const item = read().find(entry => String(entry.slug) === slug);
    if (!item) return;
    const entered = Number(input.value);
    const quantity = Math.max(1, Math.min(MAX_QTY, Math.floor(Number.isFinite(entered) ? entered : 1)));
    setQty(slug, quantity);
  }, true);

  document.addEventListener("keydown", e => {
    const quantityInput = e.target?.closest?.("[data-product-qty-input]");
    if (quantityInput && e.key === "Enter") {
      e.preventDefault();
      commitProductQtyInput(quantityInput);
      quantityInput.blur();
      return;
    }
    if (e.key === "Escape") setDrawer(false);
  });
  window.addEventListener("halalcart:updated", renderAll);
  window.addEventListener("storage", e => { if (e.key === CART_KEY) { renderAll(); scheduleCloudCartSave(); } });
  window.addEventListener("halal-auth-state-change", event => {
    const detail = event.detail || {};
    const user = Object.prototype.hasOwnProperty.call(detail, "user") ? detail.user : readStoredAuthUser();
    if (user?.id) startCloudCartSync(detail.client || window.halalSupabaseClient || null, user);
    else {
      cloudCartReady = false; cloudCartUserId = null; cloudCartClient = null;
      window.clearTimeout(cloudCartSaveTimer);
      if (detail.reason === "signout") {
        // The signed-in cart remains in the cloud; clear device-only state on sign-out.
        // A later guest cart can then be merged safely into whichever account signs in next.
        try { localStorage.removeItem(CART_KEY); localStorage.removeItem(CART_OWNER_KEY); } catch (_) {}
        window.dispatchEvent(new CustomEvent("halalcart:updated", { detail: [] }));
      }
    }
  });
  window.addEventListener("halalcatalog:updated", () => { renderAll(); scheduleCloudCartSave(); });

  window.HALAL_CART_API = { read, add, setQty, remove, clear, total, totalQty };
  window.HALAL_CART_KEY = CART_KEY;

  document.addEventListener("DOMContentLoaded", () => {
    initThemeMode(); ensureHeaderButton(); ensureDrawer(); ensureCategoryFloatingCart(); renderAll(); observeProductCartControls();
    if (readStoredAuthUser()?.id) startCloudCartSync(window.halalSupabaseClient || null, readStoredAuthUser());
    if (document.querySelector("[data-cart-page]")) renderPage();
    if (document.querySelector("[data-cart-checkout-summary]")) renderOrderSummary();
  });
})();

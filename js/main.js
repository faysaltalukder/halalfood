// Load the server-managed catalog on every public page that includes this shared script.
// Pages that already include it explicitly are left untouched.
(function ensureLiveCatalogScript() {
  const alreadyIncluded = Array.from(document.scripts).some(script =>
    /(?:^|\/)live-catalog\.js(?:\?|$)/i.test(script.src)
  );
  if (alreadyIncluded) return;
  const mainScript = Array.from(document.scripts).find(script =>
    /(?:^|\/)js\/main\.js(?:\?|$)/i.test(script.src)
  );
  if (!mainScript) return;
  try {
    const siteRoot = new URL("../", mainScript.src);
    const script = document.createElement("script");
    script.src = new URL("js/live-catalog.js?v=20261021-catalog-v2", siteRoot).href;
    script.async = true;
    document.head.appendChild(script);
  } catch (error) {
    console.warn("Could not initialize the live catalog script.", error);
  }
})();

function makeOrderId() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return "HF-" + String(100000 + (a[0] % 900000));
}
// Google Apps Script Web App URL: production endpoint.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSf6OzjwGNBSmaZBNxBf5zL8z5wkf3tY7QtSqRUGrjZj2eWLN4DsGw1WQwkPhTqmSzrw/exec";

function whatsappLink(productName = "") {
  const message = productName
    ? `আমি ${productName} অর্ডার করতে চাই`
    : "আমি Halal Food থেকে অর্ডার করতে চাই";
  return `https://wa.me/8801842031164?text=${encodeURIComponent(message)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const track=window.halalTrack||function(){};
  const trackItems=window.halalTrackItems||function(items){return items||[];};
  const parseProductPrice=(value,displayValue="")=>{
    const displayMatch=String(displayValue||"").match(/(?:৳|BDT)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if(displayMatch){
      const parsed=Number(displayMatch[1].replace(/,/g,""));
      if(Number.isFinite(parsed)) return parsed;
    }
    const raw=String(value??"").replace(/,/g,"").match(/[0-9]+(?:\.[0-9]+)?/);
    const parsed=raw?Number(raw[0]):0;
    return Number.isFinite(parsed)?parsed:0;
  };
  const productFromElement=(el)=>({
    slug:el?.dataset?.slug||"", name:el?.dataset?.name||"", price:parseProductPrice(el?.dataset?.price,el?.dataset?.displayPrice),
    category:el?.dataset?.category||"", image:el?.dataset?.image||""
  });
  const pageProduct={
    slug:(location.pathname.match(/products\/([^/]+)\.html$/)||[])[1]||"",
    name:document.querySelector(".cart-detail-add")?.dataset?.name||document.querySelector(".product-detail-info h1")?.textContent?.replace(/\s+Online in Bangladesh\s*$/i,"").trim()||"",
    price:parseProductPrice(document.querySelector(".cart-detail-add")?.dataset?.price,document.querySelector(".cart-detail-add")?.dataset?.displayPrice),
    category:document.querySelector(".cart-detail-add")?.dataset?.category||document.querySelector(".product-detail-info .tag")?.textContent?.trim()||""
  };

  // Product detail view + product-list impression.
  if(pageProduct.slug && pageProduct.name){
    const item=trackItems([pageProduct]);
    track("view_item",{currency:"BDT",value:pageProduct.price,items:item},"ViewContent",{
      content_ids:[pageProduct.slug],content_name:pageProduct.name,content_type:"product",value:pageProduct.price,currency:"BDT"
    });
  } else {
    const listItems=[...document.querySelectorAll("[data-add-to-cart]")].map(productFromElement).filter(x=>x.slug&&x.name);
    if(listItems.length){
      track("view_item_list",{item_list_name:document.title||location.pathname,items:trackItems(listItems)});
    }
  }

  // Product selection from cards / product links.
  document.addEventListener("click",(event)=>{
    const add=event.target.closest("[data-add-to-cart]");
    const link=event.target.closest('a[href*="products/"]');
    const el=add||link;
    if(el){
      const p=add?productFromElement(add):{slug:(el.getAttribute("href").match(/products\/([^/?#]+)\.html/)||[])[1]||"",name:el.dataset.name||el.querySelector("h3")?.textContent?.trim()||"",price:0,category:el.dataset.category||""};
      if(p.slug||p.name) track("select_item",{item_list_name:document.title||location.pathname,items:trackItems([p])});
    }
  },true);

  // Search intent — send once the user pauses typing.
  const searchInput=document.querySelector("#product-search");
  if(searchInput){
    let searchTimer;
    searchInput.addEventListener("input",()=>{
      clearTimeout(searchTimer);
      const term=searchInput.value.trim();
      if(!term) return;
      searchTimer=setTimeout(()=>track("search",{search_term:term},"Search",{search_string:term}),700);
    });
  }

  // WhatsApp / phone intent tracking. No customer PII is sent.
  document.addEventListener("click",(event)=>{
    const whatsapp=event.target.closest('a[href*="wa.me"],a[data-whatsapp]');
    const phone=event.target.closest('a[href^="tel:"]');
    if(whatsapp){
      track("whatsapp_click",{page_location:location.href,page_title:document.title},"Contact",{contact_method:"whatsapp"});
    } else if(phone){
      track("phone_click",{page_location:location.href,page_title:document.title},"Contact",{contact_method:"phone"});
    }
  },true);

  // Contact / checkout intent.
  if(document.querySelector("#order-form")){
    const isCart=new URLSearchParams(location.search).get("cart")==="1";
    const cartItems=isCart && window.HALAL_CART_API ? window.HALAL_CART_API.read() : [];
    const items=isCart ? cartItems : (pageProduct.name ? [{...pageProduct,quantity:1}] : []);
    const value=items.reduce((s,x)=>s+(Number(x.price)||0)*Math.max(1,Number(x.quantity||x.qty)||1),0);
    if(items.length){
      track("begin_checkout",{currency:"BDT",value:value,items:trackItems(items)}, "InitiateCheckout",{currency:"BDT",value:value,contents:trackItems(items).map(x=>({id:x.item_id,quantity:x.quantity})),content_type:"product"});
    }
  }


  // Existing WhatsApp pattern — same number and deep-link format.
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    const productName = link.dataset.whatsapp || "";
    link.href = whatsappLink(productName);
    link.target = "_blank";
    link.rel = "noopener";
  });

  // Favicon works on every GitHub Pages sub-page.
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = "/halalfood/images/favicon.png";
  document.head.appendChild(favicon);

  // Search
  const toggle = document.querySelector(".search-toggle");
  const box = document.querySelector(".search-box");
  if (toggle && box) {
    toggle.addEventListener("click", () => {
      box.classList.toggle("open");
      if (box.classList.contains("open")) box.querySelector("input")?.focus();
    });
  }

  // Add a shared mobile drawer on simple pages that do not carry the home-page drawer markup.
  const drawerMainScript = [...document.scripts].find(script => /js\/main\.js(?:\?|$)/.test(script.src));
  const drawerSiteRoot = drawerMainScript ? new URL("../", drawerMainScript.src) : new URL("/halalfood/", location.origin);
  const drawerHref = path => new URL(path, drawerSiteRoot).href;
  if (!document.querySelector("#mobile-drawer")) {
    const drawerBackdrop = document.createElement("div");
    drawerBackdrop.className = "mobile-drawer-backdrop";
    drawerBackdrop.setAttribute("data-drawer-close", "");
    const drawer = document.createElement("aside");
    drawer.id = "mobile-drawer";
    drawer.className = "mobile-drawer";
    drawer.setAttribute("aria-label", "Site menu");
    drawer.innerHTML = '<div class="mobile-drawer-head"><strong>Halal Food</strong><button class="mobile-drawer-close" type="button" data-drawer-close aria-label="Close menu">×</button></div><nav class="mobile-drawer-nav"><a href="' + drawerHref("index.html") + '">Home</a><details class="mobile-category-details"><summary>Categories <span aria-hidden="true">＋</span></summary><div class="mobile-category-links"><a href="' + drawerHref("categories/dates.html") + '">Dates</a><a href="' + drawerHref("categories/dry-food.html") + '">Dry Food</a><a href="' + drawerHref("categories/honey.html") + '">Honey</a><a href="' + drawerHref("categories/mix-food.html") + '">Mix Food</a><a href="' + drawerHref("categories/nuts-seeds.html") + '">Nuts &amp; Seeds</a><a href="' + drawerHref("categories/special-masala.html") + '">Special Masala</a><a href="' + drawerHref("categories/tea.html") + '">Tea</a><a href="' + drawerHref("categories/fresh-meat.html") + '">Fresh Meat</a><a href="' + drawerHref("categories/oil.html") + '">Oil</a><a href="' + drawerHref("categories/ghee.html") + '">Ghee</a></div></details><a href="' + drawerHref("cart.html") + '">Cart</a><a href="' + drawerHref("account.html") + '">Account</a><a href="' + drawerHref("track-order.html") + '">Track Order</a><a href="' + drawerHref("contact.html") + '">Contact</a></nav>';
    document.body.append(drawerBackdrop, drawer);
    window.dispatchEvent(new CustomEvent("halalnav:ready"));
  }
  // Mobile drawer
  const drawer = document.querySelector("#mobile-drawer");
  const backdrop = document.querySelector(".mobile-drawer-backdrop");
  const menuButton = document.querySelector(".mobile-menu-toggle");
  const closeButtons = document.querySelectorAll("[data-drawer-close]");

  // Promote account access to the top of the mobile drawer and reflect the stored Supabase session.
  const drawerNav = drawer?.querySelector(".mobile-drawer-nav");
  drawer?.querySelectorAll(".mobile-account-link").forEach(link => link.remove());
  let drawerAccountCta = drawerNav?.querySelector(".mobile-drawer-account-cta");
  if (drawerNav && !drawerAccountCta) {
    drawerAccountCta = document.createElement("a");
    drawerAccountCta.className = "mobile-drawer-account-cta";
    drawerAccountCta.href = drawerHref("account.html");
    drawerAccountCta.innerHTML =
      '<span class="mobile-drawer-account-avatar" aria-hidden="true"></span>' +
      '<span class="mobile-drawer-account-copy"><strong></strong><small></small></span>' +
      '<span class="mobile-drawer-account-chevron" aria-hidden="true">›</span>';
    drawerNav.prepend(drawerAccountCta);
  }
  const refreshMobileDrawerAccount = () => {
    if (!drawerAccountCta) return;
    let user = null;
    try {
      let rawStored = localStorage.getItem("sb-qfwvrcfkrsydycbfjsxf-auth-token");
      let stored = null;
      if (rawStored) {
        // Supabase may base64-encode larger persisted sessions with this prefix.
        if (rawStored.startsWith("base64-")) {
          const encoded = rawStored.slice(7).replace(/-/g, "+").replace(/_/g, "/");
          const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
          const binary = atob(padded);
          const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
          rawStored = new TextDecoder().decode(bytes);
        }
        stored = JSON.parse(rawStored);
      }
      user = stored?.user || stored?.currentSession?.user || null;
    } catch (_) {}
    const metadata = user?.user_metadata || {};
    const email = String(user?.email || "").trim();
    const name = String(metadata.full_name || metadata.name || metadata.given_name || metadata.display_name || "").trim();
    const identity = name || email || "Account";
    const initial = Array.from(identity)[0]?.toLocaleUpperCase("en-US") || "A";
    const avatar = drawerAccountCta.querySelector(".mobile-drawer-account-avatar");
    const title = drawerAccountCta.querySelector(".mobile-drawer-account-copy strong");
    const subtitle = drawerAccountCta.querySelector(".mobile-drawer-account-copy small");
    avatar?.replaceChildren();
    drawerAccountCta.classList.toggle("is-signed-in", Boolean(user));
    drawerAccountCta.href = drawerHref("account.html");

    const fallbackInitial = () => {
      if (avatar) {
        avatar.replaceChildren();
        avatar.textContent = initial;
        avatar.classList.add("has-initial");
      }
    };
    avatar?.classList.remove("has-initial");
    if (user) {
      const photo = [metadata.avatar_url, metadata.picture, metadata.photo_url, metadata.profile_image]
        .find(value => typeof value === "string" && /^https:\/\//i.test(value));
      if (photo && avatar) {
        const image = document.createElement("img");
        image.alt = "";
        image.referrerPolicy = "no-referrer";
        image.src = photo;
        image.addEventListener("error", fallbackInitial, { once: true });
        avatar.appendChild(image);
      } else {
        fallbackInitial();
      }
      if (title) title.textContent = name || "My account";
      if (subtitle) subtitle.textContent = email ? "Signed in · " + email : "Signed in — manage your account";
      drawerAccountCta.setAttribute("aria-label", "My account" + (email ? ", " + email : ""));
    } else {
      if (avatar) {
        avatar.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.6-3.8 3.1-5.7 7-5.7s6.4 1.9 7 5.7"></path></svg>';
      }
      if (title) title.textContent = "Sign in to your account";
      if (subtitle) subtitle.textContent = "Log in or create an account";
      drawerAccountCta.setAttribute("aria-label", "Sign in to your account");
    }
  };
  window.halalRefreshMobileAccountCTA = refreshMobileDrawerAccount;
  window.addEventListener("storage", refreshMobileDrawerAccount);
  window.addEventListener("halal-auth-state-change", refreshMobileDrawerAccount);
  refreshMobileDrawerAccount();

  const setDrawer = (open) => {
    if (!drawer) return;
    if (open) window.halalRefreshMobileAccountCTA?.();
    drawer.classList.toggle("open", open);
    backdrop?.classList.toggle("open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-open", open);
  };
  menuButton?.addEventListener("click", () => setDrawer(true));
  closeButtons.forEach((button) => button.addEventListener("click", () => setDrawer(false)));
  drawer?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setDrawer(false);
  });

  // Desktop Categories mega-menu: CSS handles hover/focus-within; JS adds touch support.
  document.querySelectorAll(".nav-category-trigger").forEach((trigger) => {
    const wrapper = trigger.closest(".nav-category");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const open = wrapper.classList.toggle("touch-open");
      trigger.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".nav-category.touch-open").forEach((wrapper) => {
      if (!wrapper.contains(event.target)) {
        wrapper.classList.remove("touch-open");
        wrapper.querySelector(".nav-category-trigger")?.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Mobile search: open a full-width, accessible search panel and populate real product matches.
  const mobileSearchButton = document.querySelector("[data-mobile-search]");
  const searchWrap = document.querySelector(".search-wrap");
  const productSearch = document.querySelector("#product-search");
  const searchResults = document.querySelector("#search-results");
  const closeMobileSearch = () => {
    searchWrap?.classList.remove("mobile-search-open");
    if (box) box.classList.remove("open");
    if (productSearch) productSearch.setAttribute("aria-expanded", "false");
    searchWrap?.querySelector(".mobile-search-panel-head")?.remove();
  };
  const renderSearchResults = (term) => {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const query = String(term || "").trim().toLocaleLowerCase();
    if (!query) return;
    const source = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
    const matches = source.filter(item => [item.name,item.category,item.slug].some(value => String(value || "").toLocaleLowerCase().includes(query))).slice(0,10);
    matches.forEach(item => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const mainScript = [...document.scripts].find(script => /js\/main\.js(?:\?|$)/.test(script.src));
      const siteRoot = mainScript ? new URL("../", mainScript.src) : new URL("/halalfood/", location.origin);
      link.href = item.cmsCreated ? new URL("cms-product.html?slug=" + encodeURIComponent(String(item.slug || "")), siteRoot).href : new URL("products/" + encodeURIComponent(String(item.slug || "")) + ".html", siteRoot).href;
      link.textContent = String(item.name || item.slug || "Product");
      if (item.price) {
        const price = document.createElement("span");
        price.className = "mobile-search-price";
        price.textContent = " — " + String(item.price);
        link.appendChild(price);
      }
      li.appendChild(link);
      searchResults.appendChild(li);
    });
    if (!matches.length) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No matching products found";
      searchResults.appendChild(li);
    }
  };
  if (productSearch) {
    productSearch.setAttribute("aria-label", "Search products");
    productSearch.setAttribute("aria-expanded", "false");
    if (window.matchMedia("(max-width: 900px)").matches) productSearch.addEventListener("input", () => renderSearchResults(productSearch.value));
  }
  mobileSearchButton?.addEventListener("click", () => {
    if (!searchWrap || !productSearch) return;
    searchWrap.classList.add("mobile-search-open");
    document.querySelector("header")?.classList.remove("hf-header-hidden");
    if (box) box.classList.add("open");
    const searchBox = searchWrap.querySelector(".search-box");
    if (!searchWrap.querySelector(".mobile-search-panel-head")) {
      const panelHead = document.createElement("div");
      panelHead.className = "mobile-search-panel-head";
      const title = document.createElement("strong");
      title.textContent = "Search Products";
      const close = document.createElement("button");
      close.type = "button";
      close.className = "mobile-search-close";
      close.setAttribute("aria-label", "Close search");
      close.textContent = "×";
      close.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); closeMobileSearch(); });
      panelHead.append(title, close);
      searchWrap.insertBefore(panelHead, searchBox || null);
    }
    productSearch.setAttribute("aria-expanded", "true");
    window.setTimeout(() => productSearch.focus({preventScroll:true}), 40);
  });
  document.addEventListener("click", (event) => {
    if (searchWrap?.classList.contains("mobile-search-open") &&
        !searchWrap.contains(event.target) &&
        !event.target.closest("[data-mobile-search]")) closeMobileSearch();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileSearch();
  });

  // Keep the compact cart summary synchronized with the existing cart data.
  const updateMobileCartSummary = () => {
    const api = window.HALAL_CART_API;
    if (!api) return;
    const qty = api.totalQty();
    const total = api.total();
    document.querySelectorAll(".mobile-floating-cart [data-cart-count]").forEach(el => { el.textContent = String(qty); });
    document.querySelectorAll("[data-cart-total]").forEach(el => { el.textContent = "৳ " + Number(total || 0).toLocaleString("en-BD", {maximumFractionDigits:0}); });
  };
  window.addEventListener("halalcart:updated", updateMobileCartSummary);
  document.addEventListener("DOMContentLoaded", updateMobileCartSummary);
  updateMobileCartSummary();

  // Mobile-only hide-on-down / reveal-on-up header behavior. Bottom navigation stays fixed.
  if (window.matchMedia("(max-width: 900px)").matches) {
    let lastY = window.scrollY;
    let ticking = false;
    const mobileHeader = document.querySelector("header");
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const mobileCart = document.querySelector(".mobile-floating-cart");
        if (currentY < 70 || currentY < lastY - 6) {
          mobileHeader?.classList.remove("hf-header-hidden");
          mobileCart?.classList.add("hf-cart-scroll-up");
          mobileCart?.classList.remove("hf-cart-scroll-down");
        } else if (currentY > lastY + 8) {
          mobileCart?.classList.add("hf-cart-scroll-down");
          mobileCart?.classList.remove("hf-cart-scroll-up");
          if (currentY > 110 && !searchWrap?.classList.contains("mobile-search-open")) mobileHeader?.classList.add("hf-header-hidden");
        }
        lastY = currentY;
        ticking = false;
      });
    }, {passive:true});
  }

  // Ensure mobile navigation and the floating cart exist consistently on every page.
  const mainScriptForUi = [...document.scripts].find(script => /js\/main\.js(?:\?|$)/.test(script.src));
  const siteRootForUi = mainScriptForUi ? new URL("../", mainScriptForUi.src) : new URL("/halalfood/", location.origin);
  const localHref = path => new URL(path, siteRootForUi).href;
  if (!document.querySelector(".mobile-bottom-nav")) {
    const nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.setAttribute("aria-label", "Mobile quick navigation");
    nav.innerHTML = '<a aria-label="Home" href="' + localHref("index.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"></path></svg><span>Home</span></a><button aria-label="Open menu" data-mobile-menu type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path></svg><span>Menu</span></button><a aria-label="Cart" class="mobile-cart-link" href="' + localHref("cart.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5.5 8h13l1 12h-15l1-12Z"></path><path d="M9 8V6.2a3 3 0 0 1 6 0V8"></path></svg><span>Cart</span><b class="mobile-cart-count" data-cart-count>0</b></a><button aria-label="Search" data-mobile-search type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><span>Search</span></button><a aria-label="Account" href="' + localHref("account.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.6-3.8 3.1-5.7 7-5.7s6.4 1.9 7 5.7"></path></svg><span>Account</span></a>';
    document.body.appendChild(nav);
  }
  // Show the floating cart summary only on the home page and category listings.
  const currentPagePath = window.location.pathname.replace(/\/+$/, "");
  const isHomePage = currentPagePath === "" || /\/halalfood$/i.test(currentPagePath) || /\/halalfood\/index\.html$/i.test(currentPagePath);
  const isCategoryListingPage = /\/categories\/[^/]+\.html$/i.test(currentPagePath);
  const showFloatingCart = isHomePage || isCategoryListingPage;

  if (showFloatingCart && !document.querySelector(".mobile-floating-cart")) {
    const miniCart = document.createElement("a");
    miniCart.className = "mobile-floating-cart";
    miniCart.href = localHref("cart.html");
    miniCart.setAttribute("aria-label", "Open shopping cart");
    miniCart.innerHTML = '<span class="mobile-floating-cart-top"><span class="mobile-floating-cart-icon-wrap"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5.5 8h13l1 12h-15l1-12Z"></path><path d="M9 8V6.2a3 3 0 0 1 6 0V8"></path></svg><b class="mobile-floating-cart-count" data-cart-count>0</b></span><span class="mobile-floating-cart-label">Items</span></span><span class="mobile-floating-cart-total" data-cart-total>৳ 0</span>';
    document.body.appendChild(miniCart);
  } else if (!showFloatingCart) {
    // Remove any copy already present in the static HTML on other pages.
    document.querySelectorAll(".mobile-floating-cart").forEach(miniCart => miniCart.remove());
  }

  if (window.matchMedia("(max-width: 900px)").matches && !document.querySelector("#hf-contact-widget")) {
    const contact = document.createElement("div");
    contact.className = "hf-contact-widget";
    contact.id = "hf-contact-widget";
    contact.innerHTML = '<div class="hf-contact-options" hidden><a class="hf-contact-option hf-contact-whatsapp" href="https://wa.me/8801842031164" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A10.1 10.1 0 0 0 12.1 1 10 10 0 0 0 3.5 15.8L2 21l5.4-1.4A10 10 0 1 0 20.5 3.5z"></path></svg><span>WhatsApp</span></a><a class="hf-contact-option hf-contact-call" href="tel:+8801842031164"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11 11 0 0 0 3.4.5 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17.8 17.8 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .5 3.4 1 1 0 0 1-.2 1z"></path></svg><span>Call</span></a></div><button class="hf-contact-launcher" type="button" aria-label="Open contact options" aria-expanded="false"><svg class="hf-contact-chat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4z"></path></svg><svg class="hf-contact-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>';
    document.body.appendChild(contact);
  }
  const contactRoot = document.querySelector("#hf-contact-widget");
  const contactTrigger = contactRoot?.querySelector(".hf-contact-launcher");
  const contactOptions = contactRoot?.querySelector(".hf-contact-options");
  if (contactRoot && contactTrigger && contactOptions && !contactTrigger.dataset.bound && !document.querySelector("#hf-contact-widget-script")) {
    contactTrigger.dataset.bound = "1";
    contactTrigger.addEventListener("click", () => {
      const open = contactTrigger.getAttribute("aria-expanded") === "true";
      contactTrigger.setAttribute("aria-expanded", String(!open));
      contactOptions.hidden = open;
    });
    document.addEventListener("click", event => {
      if (!contactRoot.contains(event.target)) {
        contactOptions.hidden = true;
        contactTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Ensure a mobile search input is available on lightweight pages without a header search box.
  if (window.matchMedia("(max-width: 900px)").matches && !document.querySelector(".search-wrap")) {
    const host = document.querySelector("header .header-actions") || document.querySelector("header") || document.body;
    const fallbackSearch = document.createElement("div");
    fallbackSearch.className = "search-wrap mobile-search-global";
    fallbackSearch.innerHTML = '<button class="search-toggle" type="button" aria-label="Search products"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 5 5"></path></svg></button><div class="search-box"><input autocomplete="off" id="product-search" type="search" placeholder="Search products..."><ul class="search-results" id="search-results"></ul></div>';
    host.appendChild(fallbackSearch);
  }

  // Mobile bottom navigation
  // Bottom navigation Menu uses the same header drawer toggle via the delegated handler below.
  document.querySelector("[data-mobile-search]")?.addEventListener("click", () => {
    if (box) box.classList.add("open");
  });

  // Hero carousel
  const hero = document.querySelector("[data-hero-carousel]");
  if (hero) {
    const track = hero.querySelector("[data-carousel-track]");
    const slides = [...hero.querySelectorAll(".hero-slide")];
    const dots = hero.querySelector("[data-carousel-dots]");
    let index = 0;
    let timer = null;
    let paused = false;

    const go = (nextIndex, smooth = true) => {
      index = (nextIndex + slides.length) % slides.length;
      if (smooth || index !== 0) track.scrollTo({ left: track.clientWidth * index, behavior: smooth ? "smooth" : "auto" });
      dots?.querySelectorAll("button").forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
        dot.setAttribute("aria-selected", String(i === index));
      });
    };
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => go(i));
      dots?.appendChild(dot);
    });
    go(0, false);

    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => { if (!paused) go(index + 1); }, 5000);
    };
    hero.addEventListener("mouseenter", () => { paused = true; });
    hero.addEventListener("mouseleave", () => { paused = false; });
    hero.addEventListener("focusin", () => { paused = true; });
    hero.addEventListener("focusout", () => { paused = false; });
    hero.querySelector("[data-carousel-prev]")?.addEventListener("click", () => { go(index - 1); start(); });
    hero.querySelector("[data-carousel-next]")?.addEventListener("click", () => { go(index + 1); start(); });

    let scrollTimer;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const next = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
        if (Number.isFinite(next)) {
          index = Math.max(0, Math.min(slides.length - 1, next));
          dots?.querySelectorAll("button").forEach((dot, i) => dot.classList.toggle("active", i === index));
        }
      }, 80);
    });
    start();
  }

  // Featured Categories horizontal rail
  const categoryRail = document.querySelector("[data-category-rail]");
  if (categoryRail) {
    const step = () => Math.max(categoryRail.clientWidth / (window.innerWidth >= 901 ? 8 : 2.4), 180);
    document.querySelector("[data-category-prev]")?.addEventListener("click", () => categoryRail.scrollBy({ left: -step(), behavior: "smooth" }));
    document.querySelector("[data-category-next]")?.addEventListener("click", () => categoryRail.scrollBy({ left: step(), behavior: "smooth" }));

    let dragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    const DRAG_THRESHOLD = 6; // px

    categoryRail.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") return;
      dragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartScroll = categoryRail.scrollLeft;
    });

    categoryRail.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const delta = event.clientX - dragStartX;
      if (!dragMoved && Math.abs(delta) > DRAG_THRESHOLD) {
        dragMoved = true;
        categoryRail.setPointerCapture?.(event.pointerId);
      }
      if (dragMoved) {
        categoryRail.scrollLeft = dragStartScroll - delta;
      }
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      categoryRail.addEventListener(type, () => { dragging = false; });
    });

    categoryRail.addEventListener("click", (event) => {
      if (dragMoved) {
        event.preventDefault();
        dragMoved = false;
      }
    }, true);
  }

  // Order form
  const params = new URLSearchParams(window.location.search);
  const productInput = document.querySelector("#product");
  const productDisplay = document.querySelector("#product-display");
  const productImageWrap = document.querySelector("#product-image-wrap");
  const productImage = document.querySelector("#product-image");
  const productPrice = document.querySelector("#product-price");
  const productLineTotal = document.querySelector("#product-line-total");
  const quantityInput = document.querySelector("#quantity");
  const quantityDisplay = document.querySelector("#quantity-display");
  const quantityMinus = document.querySelector("[data-quantity-minus]");
  const quantityPlus = document.querySelector("[data-quantity-plus]");

  const priceNumber = (value) => {
    // Product prices may be displayed as "৳ 750 / 500g". Extract only
    // the first numeric amount; never concatenate the package weight.
    const match = String(value || "").match(/(?:৳|BDT)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    const n = match ? Number(match[1].replace(/,/g, "")) : 0;
    return Number.isFinite(n) ? n : 0;
  };
  const money = (value) => `৳ ${Math.round(Number(value) || 0).toLocaleString("en-BD")}`;
  const singleProductName = params.get("product") || "";
  let singleProduct = null;
  let singleProductUnavailable = false;

  if (singleProductName) {
    productInput && (productInput.value = singleProductName);
    productDisplay && (productDisplay.textContent = singleProductName);
    const source = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
    const normalized = singleProductName.trim().toLowerCase();
    singleProduct = source.find((item) =>
      String(item.slug || "").toLowerCase() === normalized ||
      String(item.name || "").toLowerCase() === normalized
    ) || null;

    if (singleProduct) {
      productInput && (productInput.value = singleProduct.name);
      productDisplay && (productDisplay.textContent = singleProduct.name);
      const price = priceNumber(singleProduct.price);
      productPrice && (productPrice.textContent = singleProduct.price || money(price));
      if (productImage && singleProduct.image) {
        productImage.src = String(singleProduct.image).replace(/\.(jpe?g|png)$/i, ".webp");
        productImage.alt = singleProduct.name || "Selected product";
        productImageWrap && (productImageWrap.hidden = false);
      }
      if (productLineTotal) productLineTotal.textContent = money(price);
    }
  }

  const checkoutIsCart = new URLSearchParams(window.location.search).get("cart") === "1";
  const getCheckoutSubtotal = () => {
    if (checkoutIsCart && window.HALAL_CART_API) {
      return window.HALAL_CART_API.read().reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.qty) || 1), 0);
    }
    return singleProduct ? priceNumber(singleProduct.price) * Math.max(1, Number(quantityInput?.value) || 1) : 0;
  };
  const selectedDeliveryZone = () => document.querySelector('input[name="deliveryZone"]:checked')?.value || "";
  const deliveryChargeFor = (zone) => zone === "inside_dhaka" ? 70 : zone === "outside_dhaka" ? 120 : 0;
  const updateCheckoutTotals = () => {
    const subtotal = getCheckoutSubtotal();
    const zone = selectedDeliveryZone();
    const deliveryCharge = deliveryChargeFor(zone);
    const subtotalNode = document.querySelector("#checkout-subtotal");
    const deliveryNode = document.querySelector("#checkout-delivery-charge");
    const totalNode = document.querySelector("#checkout-grand-total");
    if (subtotalNode) subtotalNode.textContent = money(subtotal);
    if (deliveryNode) deliveryNode.textContent = zone ? money(deliveryCharge) : "Choose an area";
    if (totalNode) totalNode.textContent = zone ? money(subtotal + deliveryCharge) : "Select delivery area";
    return { subtotal, deliveryCharge, total: subtotal + deliveryCharge, deliveryZone: zone };
  };
  document.querySelectorAll('input[name="deliveryZone"]').forEach((radio) => radio.addEventListener("change", updateCheckoutTotals));
  window.addEventListener("halalcart:updated", updateCheckoutTotals);
  // When the live catalog arrives, use the server-managed price/name/image for a single-product checkout.
  window.addEventListener("halalcatalog:updated", () => {
    if (!singleProductName || checkoutIsCart) return;
    const source = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];
    const normalized = singleProductName.trim().toLowerCase();
    const fresh = source.find(item =>
      String(item.slug || "").toLowerCase() === normalized ||
      String(item.name || "").toLowerCase() === normalized
    );
    if (!fresh) {
      singleProduct = null;
      singleProductUnavailable = true;
      if (productDisplay) productDisplay.textContent = "This product is no longer available.";
      if (productPrice) productPrice.textContent = "Price unavailable";
      if (productLineTotal) productLineTotal.textContent = money(0);
      updateCheckoutTotals();
      return;
    }
    singleProduct = fresh;
    singleProductUnavailable = false;
    if (productInput) productInput.value = fresh.name;
    if (productDisplay) productDisplay.textContent = fresh.name;
    const latestPrice = priceNumber(fresh.price);
    if (productPrice) productPrice.textContent = fresh.price || money(latestPrice);
    if (productImage && fresh.image) {
      productImage.src = fresh.image;
      productImage.alt = fresh.name || "Selected product";
      if (productImageWrap) productImageWrap.hidden = false;
    }
    if (productLineTotal) productLineTotal.textContent = money(latestPrice * Math.max(1, Number(quantityInput?.value) || 1));
    updateCheckoutTotals();
  });


  const syncQuantity = (value) => {
    const n = Math.max(1, Math.min(99, Number(value) || 1));
    if (quantityInput) quantityInput.value = String(n);
    if (quantityDisplay) quantityDisplay.textContent = String(n);
    if (productLineTotal && singleProduct) {
      productLineTotal.textContent = money(priceNumber(singleProduct.price) * n);
    }
    updateCheckoutTotals();
    return n;
  };
  if (quantityInput) syncQuantity(quantityInput.value);
  quantityMinus?.addEventListener("click", () => syncQuantity(Number(quantityInput?.value) - 1));
  quantityPlus?.addEventListener("click", () => syncQuantity(Number(quantityInput?.value) + 1));

  document.querySelector("[data-remove-order]")?.addEventListener("click", () => {
    window.location.href = document.querySelector("[data-remove-order]")?.dataset.home || "index.html";
  });

  // Searchable District + Upazila fields.
  if (window.BD_LOCATIONS) {
    initLocationCombobox("district", Object.keys(BD_LOCATIONS), (district) => {
      const upazilaBox = document.querySelector("#upazila-combobox");
      const list = district ? (BD_LOCATIONS[district] || []) : [];
      if (upazilaBox) {
        upazilaBox.dataset.options = JSON.stringify(list);
        upazilaBox.querySelector("input").disabled = !district;
        upazilaBox.querySelector("input").value = "";
        upazilaBox.querySelector("[data-combobox-list]").innerHTML = "";
      }
    });
    initLocationCombobox("upazila", [], null);
  }

  const form = document.querySelector("#order-form");
  if (form) {
    const mobile = document.querySelector("#mobile");
    mobile?.setAttribute("pattern", "01[0-9]{9}");
    mobile?.setAttribute("maxlength", "11");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const success = document.querySelector("#form-success");
      const error = document.querySelector("#form-error");
      const submit = document.querySelector("#order-submit") || form.querySelector("button[type='submit']");
      const submitLabel = submit?.querySelector(".order-submit-label");

      if (success) {
        success.style.display = "none";
        success.innerHTML = "";
      }
      if (error) {
        error.style.display = "none";
        error.textContent = "";
      }

      if (!form.reportValidity()) return;

      if (submit) {
        submit.disabled = true;
        submit.classList.add("is-loading");
        if (submitLabel) submitLabel.textContent = "অর্ডার পাঠানো হচ্ছে...";
      }

      const data = Object.fromEntries(new FormData(form).entries());
      data.quantity = String(Math.max(1, Number(data.quantity) || 1));
      const isCartOrder = Boolean(window.HALAL_CART_MODE);
      const cartItems = isCartOrder && window.HALAL_CART_API ? window.HALAL_CART_API.read() : [];

      if (isCartOrder && !cartItems.length) {
        if (error) {
          error.textContent = "আপনার কার্ট খালি। আগে পণ্য যোগ করুন।";
          error.style.display = "block";
        }
        if (submit) {
          submit.disabled = false;
          submit.classList.remove("is-loading");
          if (submitLabel) submitLabel.textContent = "Submit Order";
        }
        return;
      }

      if (!isCartOrder && (!singleProductName || !singleProduct || singleProductUnavailable)) {
        if (error) {
          error.textContent = singleProductUnavailable ? "এই পণ্যটি এখন আর পাওয়া যাচ্ছে না। আবার সক্রিয় পণ্য নির্বাচন করুন।" : (!singleProduct ? "পণ্যের তথ্য লোড হয়নি। একটু পর আবার চেষ্টা করুন।" : "কোনো পণ্য নির্বাচন করা হয়নি। আবার পণ্য নির্বাচন করুন।");
          error.style.display = "block";
        }
        if (submit) {
          submit.disabled = false;
          submit.classList.remove("is-loading");
          if (submitLabel) submitLabel.textContent = "Submit Order";
        }
        return;
      }

      if (isCartOrder) {
        data.orderId = makeOrderId();
        data.items = cartItems.map((item) => ({
          product: item.name,
          quantity: String(Math.max(1, Number(item.qty) || 1)),
          price: String(Number(item.price) || 0),
          image: String(item.image || ""),
          slug: String(item.slug || "")
        }));
        data.product = cartItems.map((item) => `${item.name} × ${item.qty}`).join(" | ");
        data.quantity = String(window.HALAL_CART_API.totalQty(cartItems));
      } else {
        data.product = singleProduct?.name || singleProductName;
        data.orderId = makeOrderId();
        const singleUnitPrice = singleProduct ? priceNumber(singleProduct.price) : priceNumber(data.price);
        data.price = String(singleUnitPrice);
        data.image = String(singleProduct?.image || "");
        data.slug = String(singleProduct?.slug || "");
        data.items = [{
          product: data.product,
          quantity: String(Math.max(1, Number(data.quantity) || 1)),
          price: String(singleUnitPrice),
          image: data.image,
          slug: data.slug
        }];
      }

      const checkoutItems = Array.isArray(data.items) && data.items.length ? data.items : [{
        product:data.product || singleProduct?.name || singleProductName,
        quantity:data.quantity || "1",
        price:data.price || (singleProduct ? String(priceNumber(singleProduct.price)) : "0")
      }];
      const checkoutValue = checkoutItems.reduce((sum,item) => sum + (Number(item.price)||0) * Math.max(1,Number(item.quantity)||1), 0);
      const deliveryZone = String(data.deliveryZone || "");
      if (deliveryZone !== "inside_dhaka" && deliveryZone !== "outside_dhaka") {
        if (error) {
          error.textContent = "অর্ডার দেওয়ার আগে ডেলিভারি এলাকা নির্বাচন করুন।";
          error.style.display = "block";
        }
        if (submit) {
          submit.disabled = false;
          submit.classList.remove("is-loading");
          if (submitLabel) submitLabel.textContent = "Submit Order";
        }
        return;
      }
      const deliveryCharge = deliveryChargeFor(deliveryZone);
      const grandTotal = checkoutValue + deliveryCharge;
      data.deliveryZone = deliveryZone;
      data.deliveryCharge = String(deliveryCharge);
      data.subtotal = String(checkoutValue);
      data.total = String(grandTotal);
      data.orderTotal = String(grandTotal);
      data.paymentMethod = "cash_on_delivery";
      // Keep Google Apps Script's existing amount field, but send the complete
      // order amount there. Item unit prices remain intact in data.items.
      data.price = String(grandTotal);
      updateCheckoutTotals();
      track("add_shipping_info",{currency:"BDT",value:grandTotal,shipping_tier:"Cash on Delivery",items:trackItems(checkoutItems)});
      track("order_submit",{currency:"BDT",value:grandTotal,items:trackItems(checkoutItems)});

      // Fast confirmation flow: Google Sheet is backup only; its response never blocks checkout.
      // Supabase and Google Sheets are both written in parallel. We no longer
      // make the customer wait for the slower Google Apps Script response
      // (email/card/admin work can take several seconds or trigger a browser
      // CORS/network error even after the Sheet row has already been saved).
      const confirmedItems = Array.isArray(data.items) && data.items.length
        ? data.items
        : [{
            product: data.product || singleProduct?.name || singleProductName,
            quantity: data.quantity || "1",
            price: data.price || (singleProduct ? String(priceNumber(singleProduct.price)) : "0")
          }];
      const localOrderTotal = grandTotal;

      const googleSubmitPromise = (async () => {
        if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
          throw new Error("Google Apps Script URL is not configured.");
        }
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
          keepalive: true
        });
        if (!response.ok) throw new Error(`Google Apps Script HTTP ${response.status}`);
        let result = null;
        try { result = await response.json(); } catch (_) {}
        if (result && result.success === false) throw new Error("Google Apps Script rejected the order.");
        return {
          source: "google",
          success: true,
          orderId: result?.orderId || data.orderId,
          orderTotal: localOrderTotal
        };
      })();

      const supabaseSubmitPromise = fetch("https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/order-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      }).then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
          throw new Error(result?.error || `Order backend HTTP ${response.status}`);
        }
        return {
          source: "supabase",
          success: true,
          orderId: result?.orderId || data.orderId,
          orderTotal: Number.isFinite(Number(result?.orderTotal)) ? Number(result.orderTotal) : localOrderTotal
        };
      });

      try {
        // Whichever backend confirms first is enough to take the customer to
        // Thank You. This keeps checkout fast while both persistence paths run.
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 100);
        });

        let winner;
        try {
          // Promise.any ignores a single backend failure and waits for the
          // first successful backend. This prevents one slow/broken path from
          // blocking a successful order saved by the other path.
          winner = await Promise.race([
            Promise.any([googleSubmitPromise, supabaseSubmitPromise]),
            timeoutPromise
          ]);
        } catch (backendError) {
          // Both backends explicitly failed before the timeout.
          throw backendError;
        }

        // A timeout is deliberately treated as pending/accepted rather than
        // showing a scary failure message: Google Apps Script may already have
        // written the Sheet row and simply be busy sending email/admin work.
        const confirmedOrderId = winner?.orderId
          ? String(winner.orderId)
          : String(data.orderId || "");
        const confirmedTotal = winner?.orderTotal != null
          ? Number(winner.orderTotal)
          : localOrderTotal;

        const purchaseKey="HALAL_PURCHASE_RECORDED_"+confirmedOrderId;
        let alreadyTracked=false;
        try { alreadyTracked=sessionStorage.getItem(purchaseKey)==="1"; } catch (_) {}
        if(!alreadyTracked){
          track("purchase",{
            transaction_id:confirmedOrderId,
            value:confirmedTotal,
            currency:"BDT",
            items:trackItems(confirmedItems)
          },"Purchase",{
            value:confirmedTotal,
            currency:"BDT",
            content_ids:trackItems(confirmedItems).map(i=>i.item_id),
            contents:trackItems(confirmedItems).map(i=>({id:i.item_id,quantity:i.quantity,item_price:i.price})),
            content_type:"product",
            order_id:confirmedOrderId
          });
          try { sessionStorage.setItem(purchaseKey,"1"); } catch (_) {}
        }

        try {
          sessionStorage.setItem("HALAL_ORDER_CONFIRMATION", JSON.stringify({
            orderId: confirmedOrderId,
            orderTotal: confirmedTotal,
            subtotal: checkoutValue,
            deliveryCharge,
            deliveryZone,
            paymentMethod: "cash_on_delivery",
            items: confirmedItems,
            customerName: data.name || "",
            confirmedAt: new Date().toISOString()
          }));
        } catch (storageError) {
          console.warn("Could not save local order confirmation state:", storageError);
        }

        if (isCartOrder) {
          window.HALAL_CART_API?.clear();
        }

        // Success is now the normal path: land on Thank You within ~2–3s.
        window.location.replace("thank-you.html");
      } catch (err) {

        console.error("Order submission failed:", err);
        if (error) {
          error.textContent = "অর্ডার নিশ্চিত করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
          error.style.display = "block";
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.classList.remove("is-loading");
          if (submitLabel) submitLabel.textContent = "Submit Order";
        }
      }
    });
  }
});

function initLocationCombobox(id, initialOptions, onSelect) {
  const box = document.querySelector(`#${id}-combobox`);
  if (!box) return;
  const input = box.querySelector("input");
  const list = box.querySelector("[data-combobox-list]");
  const getOptions = () => {
    if (id === "upazila") {
      try { return JSON.parse(box.dataset.options || "[]"); } catch (_) { return []; }
    }
    return initialOptions;
  };
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const options = getOptions().filter((name) => name.toLowerCase().includes(q)).slice(0, 50);
    list.innerHTML = "";
    options.forEach((name) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "combobox-option";
      option.textContent = name;
      option.addEventListener("click", () => {
        input.value = name;
        list.classList.remove("open");
        input.setAttribute("aria-expanded", "false");
        onSelect?.(name);
      });
      list.appendChild(option);
    });
    const isOpen = options.length > 0 && document.activeElement === input;
    list.classList.toggle("open", isOpen);
    input.setAttribute("aria-expanded", String(isOpen));
  };
  input.addEventListener("focus", render);
  input.addEventListener("input", render);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { list.classList.remove("open"); input.setAttribute("aria-expanded", "false"); }
  });
  document.addEventListener("click", (event) => {
    if (!box.contains(event.target)) { list.classList.remove("open"); input.setAttribute("aria-expanded", "false"); }
  });
}

// ---------------------------------------------------------------------------
// v3/v4 redesign: merchandising-row carousels
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const initMrow = () => {
  document.querySelectorAll("[data-mrow]").forEach((wrap) => {
    const track = wrap.querySelector("[data-mrow-track]");
    const dotsBox = wrap.parentElement.querySelector("[data-mrow-dots]");
    const cards = Array.from(track.children);
    if (!cards.length) return;

    const visibleCount = () => (window.innerWidth <= 600 ? 2 : window.innerWidth <= 900 ? 3 : 5);
    const pageCount = () => Math.max(1, Math.ceil(cards.length / visibleCount()));

    const buildDots = () => {
      dotsBox.innerHTML = "";
      const pages = pageCount();
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to slide group ${i + 1}`);
        if (i === 0) dot.classList.add("active");
        dot.addEventListener("click", () => {
          const cardWidth = cards[0].getBoundingClientRect().width + 18;
          track.scrollTo({ left: i * visibleCount() * cardWidth, behavior: "smooth" });
        });
        dotsBox.appendChild(dot);
      }
    };
    buildDots();
    window.addEventListener("resize", () => { buildDots(); });

    const updateActiveDot = () => {
      const cardWidth = cards[0].getBoundingClientRect().width + 18;
      const page = Math.round(track.scrollLeft / (visibleCount() * cardWidth));
      Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle("active", i === page));
    };
    track.addEventListener("scroll", () => {
      window.requestAnimationFrame(updateActiveDot);
    }, { passive: true });

    let dragging = false, dragMoved = false, dragStartX = 0, dragStartScroll = 0;
    const DRAG_THRESHOLD = 6;
    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") return;
      dragging = true; dragMoved = false;
      dragStartX = event.clientX; dragStartScroll = track.scrollLeft;
    });
    track.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const delta = event.clientX - dragStartX;
      if (!dragMoved && Math.abs(delta) > DRAG_THRESHOLD) {
        dragMoved = true;
        track.classList.add("dragging");
        track.setPointerCapture?.(event.pointerId);
      }
      if (dragMoved) track.scrollLeft = dragStartScroll - delta;
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      track.addEventListener(type, () => { dragging = false; track.classList.remove("dragging"); });
    });
    track.addEventListener("click", (event) => {
      if (dragMoved) { event.preventDefault(); dragMoved = false; }
    }, true);

    let auto = setInterval(advance, 5500);
    function advance() {
      const cardWidth = cards[0].getBoundingClientRect().width + 18;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const next = track.scrollLeft + visibleCount() * cardWidth;
      track.scrollTo({ left: next > maxScroll - 4 ? 0 : next, behavior: "smooth" });
    }
    wrap.addEventListener("mouseenter", () => clearInterval(auto));
    wrap.addEventListener("mouseleave", () => { clearInterval(auto); auto = setInterval(advance, 5500); });
  });

  };
  (window.requestIdleCallback ? window.requestIdleCallback(initMrow, { timeout: 1500 }) : setTimeout(initMrow, 200));

  const loadMoreBtn = document.querySelector("[data-jfy-load-more]");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      const hidden = document.querySelector("[data-jfy-hidden]");
      if (hidden && hidden.tagName === "TEMPLATE") {
        // Extra products are kept inside a <template> so they do not weigh down the page until requested.
        const grid = document.createElement("div");
        grid.className = "jfy-grid jfy-shown";
        grid.appendChild(hidden.content.cloneNode(true));
        hidden.replaceWith(grid);
      } else if (hidden) {
        hidden.hidden = false;
        hidden.classList.add("jfy-shown");
      }
      loadMoreBtn.remove();
    });
  }
});


/* HALAL TRACKING: GA4 + META + GTM */
(function(){
  if(window.__HALAL_TRACKING_BOOTSTRAPPED__) return;
  window.__HALAL_TRACKING_BOOTSTRAPPED__=true;

  /* PERFORMANCE: the heavy tracking files (Google Tag Manager, Meta Pixel) are NOT downloaded
     while the page is first painting. They load on the visitor's first interaction, or after
     HALAL_TRACKING_DELAY_MS once the page has finished loading - whichever comes first.
     Nothing is lost: every event is queued in dataLayer / the fbq queue and sent as soon as the
     tracking files arrive. Order, cart, thank-you and track-order pages load tracking at once
     so that purchase events are never delayed.
     To change the wait time, edit the number below (milliseconds). */
  var HALAL_TRACKING_DELAY_MS=5000;

  window.dataLayer=window.dataLayer||[];

  /* Meta Pixel: only the tiny queue stub now; fbevents.js itself is loaded later. */
  !function(f,n){
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
  }(window);
  window.fbq('init','28564665756499119');
  window.fbq('track','PageView');
  /* Keep gtag event commands queued even if the GTM Google tag is still loading. */
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};

  var trackersLoaded=false;
  var triggerEvents=['pointerdown','touchstart','keydown','scroll','mousemove'];
  function loadTrackers(){
    if(trackersLoaded) return;
    trackersLoaded=true;
    triggerEvents.forEach(function(ev){window.removeEventListener(ev,loadTrackers,{passive:true});});
    window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var g=document.createElement('script');
    g.async=true;
    g.src='https://www.googletagmanager.com/gtm.js?id=GTM-5TW678CX';
    document.head.appendChild(g);
    var t=document.createElement('script');
    t.async=true;
    t.src='https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(t);
  }
  window.halalLoadTrackers=loadTrackers;

  var loadNow=/\/(order|cart|thank-you|track-order)(\.html)?\/?$/.test(location.pathname);
  if(loadNow){
    loadTrackers();
  }else{
    triggerEvents.forEach(function(ev){window.addEventListener(ev,loadTrackers,{passive:true});});
    var armTimer=function(){setTimeout(loadTrackers,HALAL_TRACKING_DELAY_MS);};
    if(document.readyState==='complete') armTimer(); else window.addEventListener('load',armTimer);
  }

  var firstPartySessionId = '';
  try {
    firstPartySessionId = sessionStorage.getItem('hf_analytics_session') || '';
    if (!firstPartySessionId) {
      firstPartySessionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2));
      sessionStorage.setItem('hf_analytics_session', firstPartySessionId);
    }
  } catch (_) {}
  var firstPartyEndpoint = 'https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/analytics-ingest';
  var firstPartyEvents = new Set(['page_view','view_item','view_item_list','select_item','search','add_to_cart','view_cart','begin_checkout','order_submit','order_success','track_order','whatsapp_click','phone_click']);
  function sendFirstPartyEvent(eventName, params) {
    if (!firstPartyEvents.has(eventName)) return;
    var p = params || {};
    var items = Array.isArray(p.items) ? p.items : [];
    var first = items.length && items[0] && typeof items[0] === 'object' ? items[0] : {};
    var urlParams = new URLSearchParams(location.search);
    var row = {
      event_name: eventName,
      occurred_at: new Date().toISOString(),
      page_path: location.pathname,
      page_title: document.title,
      session_id: firstPartySessionId || null,
      item_id: first.item_id || first.itemId || first.slug || null,
      item_name: first.item_name || first.name || null,
      item_category: first.item_category || first.category || null,
      value: typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : null,
      quantity: typeof first.quantity === 'number' ? first.quantity : null,
      search_term: typeof p.search_term === 'string' ? p.search_term.slice(0,120) : null,
      source: urlParams.get('utm_source'),
      medium: urlParams.get('utm_medium'),
      campaign: urlParams.get('utm_campaign')
    };
    try {
      fetch(firstPartyEndpoint, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(row),
        keepalive: true,
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      }).catch(function(){});
    } catch (_) {}
  }

  window.halalTrack=function(eventName,params,metaEvent,metaParams){
    var safeParams=params||{};
    sendFirstPartyEvent(eventName, safeParams);
    window.dataLayer.push(Object.assign({event:eventName},safeParams));
    if(typeof window.gtag==='function') window.gtag('event',eventName,safeParams);
    if(typeof window.fbq==='function' && metaEvent){
      window.fbq('track',metaEvent,metaParams||safeParams);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.halalTrack('page_view', {page_title: document.title});
    }, {once:true});
  } else {
    window.halalTrack('page_view', {page_title: document.title});
  }

  window.halalTrackItems=function(items){
    return (Array.isArray(items)?items:[]).map(function(item){
      var displayMatch=String(item.displayPrice||"").match(/(?:৳|BDT)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
      var rawMatch=String(item.price??"").replace(/,/g,"").match(/[0-9]+(?:\.[0-9]+)?/);
      var price=displayMatch?Number(displayMatch[1].replace(/,/g,"")):(rawMatch?Number(rawMatch[0]):0);
      if(!Number.isFinite(price)) price=0;
      var quantity=Math.max(1,Number(item.quantity!=null?item.quantity:item.qty)||1);
      return {
        item_id:String(item.slug||item.id||item.product_id||item.name||''),
        item_name:String(item.name||item.product||''),
        item_category:String(item.category||item.catLabel||''),
        price:price,
        quantity:quantity
      };
    });
  };
})();
/* END HALAL TRACKING */



/* Display prices without package/weight suffixes; preserve underlying cart/order data. */
(function () {
  const priceSelectors = '.price, .mrow-price, .jfy-price, .product-detail-price, .order-product-price';
  function cleanVisiblePrices(root) {
    const nodes = [];
    if (root && root.nodeType === 1 && root.matches(priceSelectors)) nodes.push(root);
    if (root && root.querySelectorAll) nodes.push(...root.querySelectorAll(priceSelectors));
    nodes.forEach(function (node) {
      if (node.dataset.priceSuffixCleaned === '1') return;
      const original = node.textContent || '';
      const cleaned = original.replace(/\s*\/\s*[^\n]+$/, '').trim();
      if (cleaned !== original.trim()) node.textContent = cleaned;
      node.dataset.priceSuffixCleaned = '1';
    });
  }
  function initPriceDisplay() {
    cleanVisiblePrices(document);
    const observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'childList') record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) cleanVisiblePrices(node);
        });
        if (record.type === 'characterData' && record.target.parentElement) {
          const parent = record.target.parentElement;
          if (parent.matches(priceSelectors)) {
            delete parent.dataset.priceSuffixCleaned;
            cleanVisiblePrices(parent);
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPriceDisplay, { once: true });
  else initPriceDisplay();
})();


/* HALAL FOOD — consistent mobile dock and delegated controls on every page. */
(function () {
  "use strict";
  const mobile = window.matchMedia("(max-width: 900px)");
  const mainScript = [...document.scripts].find(s => /js\/main\.js(?:\?|$)/.test(s.src));
  const root = mainScript ? new URL("../", mainScript.src) : new URL("/halalfood/", location.origin);
  const href = p => new URL(p, root).href;
  function installMobileDock() {
    let nav = document.querySelector(".mobile-bottom-nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.appendChild(nav);
    }
    nav.className = "mobile-bottom-nav";
    nav.setAttribute("aria-label", "Mobile quick navigation");
    nav.innerHTML =
      '<a aria-label="Home" href="' + href("index.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"></path></svg><span>Home</span></a>' +
      '<button aria-label="Open menu" data-mobile-menu type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path></svg><span>Menu</span></button>' +
      '<a aria-label="Cart" class="mobile-cart-link" href="' + href("cart.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5.5 8h13l1 12h-15l1-12Z"></path><path d="M9 8V6.2a3 3 0 0 1 6 0V8"></path></svg><b class="mobile-cart-count" data-cart-count>0</b><span>Cart</span></a>' +
      '<button aria-label="Search" data-mobile-search type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><span>Search</span></button>' +
      '<a aria-label="Account" href="' + href("account.html") + '"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.6-3.8 3.1-5.7 7-5.7s6.4 1.9 7 5.7"></path></svg><span>Account</span></a>';
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installMobileDock, {once:true});
  else installMobileDock();

  document.addEventListener("click", function (event) {
    const menuButton = event.target.closest("[data-mobile-menu]");
    if (menuButton && mobile.matches) {
      event.preventDefault();
      const drawer = document.querySelector("#mobile-drawer");
      const backdrop = document.querySelector(".mobile-drawer-backdrop");
      if (drawer?.classList.contains("open")) {
        const close = drawer.querySelector("[data-drawer-close]");
        if (close) close.click();
        else {
          drawer.classList.remove("open");
          backdrop?.classList.remove("open");
          document.body.classList.remove("drawer-open");
          document.querySelector(".mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
        }
      } else {
        const headerMenu = document.querySelector(".mobile-menu-toggle");
        if (headerMenu) headerMenu.click();
        else if (drawer) {
          drawer.classList.add("open");
          backdrop?.classList.add("open");
          document.body.classList.add("drawer-open");
        }
      }
      return;
    }
    const searchButton = event.target.closest("[data-mobile-search]");
    if (searchButton && mobile.matches) {
      const wrap = document.querySelector(".search-wrap");
      const input = document.querySelector("#product-search");
      if (!wrap || !input) {
        location.href = href("index.html#products");
        return;
      }
      event.preventDefault();
      wrap.classList.add("mobile-search-open");
      document.querySelector("header")?.classList.remove("hf-header-hidden");
      const box = wrap.querySelector(".search-box");
      box?.classList.add("open");
      if (!wrap.querySelector(".mobile-search-panel-head")) {
        const head = document.createElement("div");
        head.className = "mobile-search-panel-head";
        const title = document.createElement("strong");
        title.textContent = "Search Products";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "mobile-search-close";
        close.setAttribute("aria-label", "Close search");
        close.textContent = "×";
        close.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          wrap.classList.remove("mobile-search-open");
          box?.classList.remove("open");
          head.remove();
          input.setAttribute("aria-expanded", "false");
        });
        head.append(title, close);
        wrap.insertBefore(head, box || null);
      }
      input.setAttribute("aria-expanded", "true");
      window.setTimeout(() => input.focus({preventScroll:true}), 30);
    }
  });

  // Make sure dismissing search always restores the magnifier control in the bottom dock.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const wrap = document.querySelector(".search-wrap.mobile-search-open");
      if (wrap) {
        wrap.classList.remove("mobile-search-open");
        wrap.querySelector(".search-box")?.classList.remove("open");
        wrap.querySelector(".mobile-search-panel-head")?.remove();
        document.querySelector("#product-search")?.setAttribute("aria-expanded", "false");
      }
    }
  });
})();

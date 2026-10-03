// Google Apps Script Web App URL: unchanged — keep the deployed endpoint stable.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzShx69e71dZWyF8MN3ZWJSN5rTdeizgsFoN-ElkZzs2_j_gncTeGfpZiDm3YiZskGQ/exec";

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

  // Mobile drawer
  const drawer = document.querySelector("#mobile-drawer");
  const backdrop = document.querySelector(".mobile-drawer-backdrop");
  const menuButton = document.querySelector(".mobile-menu-toggle");
  const closeButtons = document.querySelectorAll("[data-drawer-close]");
  const setDrawer = (open) => {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    backdrop?.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
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

  // Mobile bottom navigation
  document.querySelector("[data-mobile-categories]")?.addEventListener("click", () => setDrawer(true));
  document.querySelector("[data-mobile-search]")?.addEventListener("click", () => {
    if (box) box.classList.add("open");
    document.querySelector("#product-search")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      track.scrollTo({ left: track.clientWidth * index, behavior: smooth ? "smooth" : "auto" });
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
        productImage.src = singleProduct.image;
        productImage.alt = singleProduct.name || "Selected product";
        productImageWrap && (productImageWrap.hidden = false);
      }
      if (productLineTotal) productLineTotal.textContent = money(price);
    }
  }

  const syncQuantity = (value) => {
    const n = Math.max(1, Math.min(99, Number(value) || 1));
    if (quantityInput) quantityInput.value = String(n);
    if (quantityDisplay) quantityDisplay.textContent = String(n);
    if (productLineTotal && singleProduct) {
      productLineTotal.textContent = money(priceNumber(singleProduct.price) * n);
    }
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

      if (!isCartOrder && !singleProductName) {
        if (error) {
          error.textContent = "কোনো পণ্য নির্বাচন করা হয়নি। আবার পণ্য নির্বাচন করুন।";
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
        data.orderId = `HF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
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
        data.orderId = `HF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
        if (singleProduct) {
          data.price = String(priceNumber(singleProduct.price));
          data.image = String(singleProduct.image || "");
          data.slug = String(singleProduct.slug || "");
        }
      }

      const checkoutItems = Array.isArray(data.items) && data.items.length ? data.items : [{
        product:data.product || singleProduct?.name || singleProductName,
        quantity:data.quantity || "1",
        price:data.price || (singleProduct ? String(priceNumber(singleProduct.price)) : "0")
      }];
      const checkoutValue=checkoutItems.reduce((sum,item)=>sum+(Number(item.price)||0)*Math.max(1,Number(item.quantity)||1),0);
      track("add_shipping_info",{currency:"BDT",value:checkoutValue,shipping_tier:"Cash on Delivery",items:trackItems(checkoutItems)});
      track("order_submit",{currency:"BDT",value:checkoutValue,items:trackItems(checkoutItems)});

      try {
        if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
          throw new Error("Google Apps Script URL is not configured yet.");
        }

        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`Order submission failed with HTTP ${response.status}`);
        }

        let result = null;
        try { result = await response.json(); } catch (_) { /* Apps Script responses can be text-like after redirects. */ }
        if (result && result.success === false) {
          throw new Error("Google Apps Script rejected the order.");
        }

        // Build the confirmation payload before clearing the cart or leaving checkout.
        const confirmedOrderId = result && result.orderId ? String(result.orderId) : String(data.orderId || "");
        const confirmedItems = Array.isArray(data.items) && data.items.length
          ? data.items
          : [{
              product: data.product || singleProduct?.name || singleProductName,
              quantity: data.quantity || "1",
              price: data.price || (singleProduct ? String(priceNumber(singleProduct.price)) : "0")
            }];
        const confirmedTotal = result && Number.isFinite(Number(result.orderTotal))
          ? Number(result.orderTotal)
          : confirmedItems.reduce((sum, item) => {
              const price = Number(item.price) || 0;
              const qty = Math.max(1, Number(item.quantity) || 1);
              return sum + price * qty;
            }, 0);

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

        // A successful order has its own confirmation page. The checkout form is
        // never shown as the final success state.
        window.location.replace("thank-you.html");
      } catch (err) {
        console.error("Order submission failed:", err);
        if (error) {
          error.textContent = "অর্ডার পাঠানো যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন। Google Sheet সংযোগটি পরীক্ষা করুন।";
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

  const loadMoreBtn = document.querySelector("[data-jfy-load-more]");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      const hidden = document.querySelector("[data-jfy-hidden]");
      if (hidden) {
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

  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});

  (function(){
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtm.js?id=GTM-5TW678CX';
    document.head.appendChild(s);
  })();

  /* Meta Pixel — sitewide */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init','28564665756499119');
  window.fbq('track','PageView');
  /* Keep gtag event commands queued even if the GTM Google tag is still loading. */
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};

  window.halalTrack=function(eventName,params,metaEvent,metaParams){
    var safeParams=params||{};
    window.dataLayer.push(Object.assign({event:eventName},safeParams));
    if(typeof window.gtag==='function') window.gtag('event',eventName,safeParams);
    if(typeof window.fbq==='function' && metaEvent){
      window.fbq('track',metaEvent,metaParams||safeParams);
    }
  };

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



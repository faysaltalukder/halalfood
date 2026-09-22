// Google Apps Script Web App URL: unchanged — keep the deployed endpoint stable.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzShx69e71dZWyF8MN3ZWJSN5rTdeizgsFoN-ElkZzs2_j_gncglTeGfpZiDm3YiZskGQ/exec";

function whatsappLink(productName = "") {
  const message = productName
    ? `আমি ${productName} অর্ডার করতে চাই`
    : "আমি Halal Food থেকে অর্ডার করতে চাই";
  return `https://wa.me/8801842031164?text=${encodeURIComponent(message)}`;
}

document.addEventListener("DOMContentLoaded", () => {
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
  favicon.href = "/halal-food/images/favicon.png";
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
  if (productInput && params.get("product")) {
    const product = params.get("product");
    productInput.value = product;
    if (productDisplay) productDisplay.textContent = product;
  }

  const quantityInput = document.querySelector("#quantity");
  const quantityDisplay = document.querySelector("#quantity-display");
  const quantityMinus = document.querySelector("[data-quantity-minus]");
  const quantityPlus = document.querySelector("[data-quantity-plus]");
  const syncQuantity = (value) => {
    const n = Math.max(1, Math.min(99, Number(value) || 1));
    if (quantityInput) quantityInput.value = String(n);
    if (quantityDisplay) quantityDisplay.textContent = String(n);
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
      success.style.display = "none";
      error.style.display = "none";

      if (!form.reportValidity()) return;

      const submit = form.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Sending...";

      const data = Object.fromEntries(new FormData(form).entries());
      data.quantity = String(Math.max(1, Number(data.quantity) || 1));
      const isCartOrder = Boolean(window.HALAL_CART_MODE);
      const cartItems = isCartOrder && window.HALAL_CART_API ? window.HALAL_CART_API.read() : [];
      if (isCartOrder && !cartItems.length) {
        error.textContent = "আপনার কার্ট খালি। আগে পণ্য যোগ করুন।";
        error.style.display = "block";
        submit.disabled = false;
        submit.textContent = "Submit Order";
        return;
      }
      if (isCartOrder) {
        data.orderId = `HF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
        data.items = cartItems.map((item) => ({
          product: item.name,
          quantity: String(Math.max(1, Number(item.qty) || 1)),
          price: String(Number(item.price) || 0)
        }));
        data.product = cartItems.map((item) => `${item.name} × ${item.qty}`).join(" | ");
        data.quantity = String(window.HALAL_CART_API.totalQty(cartItems));
      }

      try {
        if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
          throw new Error("Google Apps Script URL is not configured yet.");
        }
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data)
        });
        if (isCartOrder) {
          window.HALAL_CART_API?.clear();
          window.history.replaceState({}, document.title, "order.html");
          const summary = document.querySelector("[data-cart-checkout-summary]");
          if (summary) summary.innerHTML = '<div class="cart-success-state"><strong>Order received</strong><p>ধন্যবাদ! আপনার কার্ট অর্ডারটি গ্রহণ করা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।</p></div>';
        }
        form.reset();
        if (productDisplay && params.get("product")) productDisplay.textContent = params.get("product");
        syncQuantity(1);
        success.style.display = "block";
      } catch (err) {
        error.textContent = "অর্ডার পাঠানো যায়নি। অনুগ্রহ করে সরাসরি যোগাযোগ করুন।";
        error.style.display = "block";
      } finally {
        submit.disabled = false;
        submit.textContent = "Submit Order";
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
// v3/v4 redesign: merchandising-row carousels (5-visible, draggable, dotted,
// slower auto-advance than the hero) + Just-For-You "Load More".
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

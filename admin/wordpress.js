(() => {
  "use strict";

  const LIVE_URL = "https://faysaltalukder.github.io/halalfood/";
  const LOAD_TIMEOUT_MS = 20000;

  const init = () => {
    const frame = document.getElementById("wordpressLiveFrame");
    const shell = document.getElementById("wpDeviceShell");
    const stage = document.querySelector(".hf-wordpress-preview-stage");
    const description = document.getElementById("wpViewDescription");
    const status = document.getElementById("wpPreviewStatus");
    const address = document.getElementById("wpPreviewAddress");
    const loading = document.getElementById("wpLoading");
    const errorPanel = document.getElementById("wpPreviewError");
    if (!frame || !shell || !stage) return;

    const viewButtons = [...document.querySelectorAll("[data-wp-view]")];
    let currentView = "desktop";
    let loadTimer = 0;
    let hasLoaded = false;
    let emulatedWindow = null;
    let nativeMatchMedia = null;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const showLoading = () => {
      if (loading) loading.hidden = false;
      if (errorPanel) errorPanel.hidden = true;
      setStatus("Connecting to the live website…");
    };

    const updateAddress = () => {
      try {
        const current = frame.contentWindow.location.href;
        const parsed = new URL(current);
        if (address) address.textContent = parsed.origin === window.location.origin
          ? parsed.href
          : parsed.hostname + parsed.pathname;
      } catch (_) {
        if (address) address.textContent = "Halal Food live website";
      }
    };

    const applyMobilePointerSimulation = () => {
      try {
        const win = frame.contentWindow;
        const doc = frame.contentDocument;
        if (!win || !doc) return;

        if (emulatedWindow !== win) {
          emulatedWindow = win;
          nativeMatchMedia = win.matchMedia.bind(win);
        }

        if (currentView === "mobile") {
          win.matchMedia = (query) => {
            const result = nativeMatchMedia(query);
            if (typeof query === "string" && /\(pointer\s*:\s*coarse\)/i.test(query)) {
              return new Proxy(result, {
                get(target, property) {
                  if (property === "matches") return true;
                  const value = Reflect.get(target, property, target);
                  return typeof value === "function" ? value.bind(target) : value;
                }
              });
            }
            return result;
          };
        } else if (nativeMatchMedia) {
          win.matchMedia = nativeMatchMedia;
        }

        doc.querySelectorAll('picture source[media*="pointer: coarse"], picture source[data-wp-original-media]').forEach((source) => {
          if (source.dataset.wpOriginalMedia === undefined) {
            source.dataset.wpOriginalMedia = source.getAttribute("media") || "";
          }
          if (currentView === "mobile") {
            const mobileMedia = source.dataset.wpOriginalMedia
              .replace(/\s+and\s+\(pointer\s*:\s*coarse\)/i, "")
              .trim();
            source.setAttribute("media", mobileMedia || "all");
          } else {
            source.setAttribute("media", source.dataset.wpOriginalMedia);
          }
        });

        win.dispatchEvent(new win.Event("resize"));
      } catch (_) {
        // Cross-origin destinations remain usable, but their internal viewport cannot be modified.
      }
    };

    const setView = (view) => {
      currentView = view === "mobile" ? "mobile" : "desktop";
      const mobile = currentView === "mobile";
      shell.classList.toggle("is-mobile", mobile);
      shell.classList.toggle("is-desktop", !mobile);
      stage.classList.toggle("is-mobile-mode", mobile);

      viewButtons.forEach((button) => {
        const active = button.dataset.wpView === currentView;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      if (description) {
        description.textContent = mobile
          ? "Mobile view · 390px phone viewport"
          : "Desktop view · Full responsive website";
      }

      if (hasLoaded) applyMobilePointerSimulation();
    };

    const handleFrameLoad = () => {
      let currentUrl = "";
      try { currentUrl = frame.contentWindow.location.href; } catch (_) {}
      if (currentUrl === "about:blank") return;

      hasLoaded = true;
      window.clearTimeout(loadTimer);
      if (loading) loading.hidden = true;
      if (errorPanel) errorPanel.hidden = true;
      updateAddress();
      applyMobilePointerSimulation();
      setStatus("Live website loaded · Links, navigation, product interactions and forms run inside the preview.");
    };

    // Attach the load handler before assigning the live URL.
    // This prevents a fast cached storefront response from beating the listener.
    frame.addEventListener("load", handleFrameLoad);

    const loadPreview = (reloadCurrent = false) => {
      window.clearTimeout(loadTimer);
      hasLoaded = false;
      showLoading();

      if (reloadCurrent) {
        try {
          if (frame.contentWindow.location.origin === window.location.origin) {
            frame.contentWindow.location.reload();
          } else {
            frame.src = LIVE_URL;
          }
        } catch (_) {
          frame.src = LIVE_URL;
        }
      } else {
        frame.src = LIVE_URL;
      }

      loadTimer = window.setTimeout(() => {
        if (hasLoaded) return;
        if (loading) loading.hidden = true;
        if (errorPanel) errorPanel.hidden = false;
        setStatus("The preview did not finish loading. Retry or open the live website separately.");
      }, LOAD_TIMEOUT_MS);
    };

    viewButtons.forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.wpView));
    });

    document.getElementById("wpRefresh")?.addEventListener("click", () => loadPreview(true));
    document.getElementById("wpRetry")?.addEventListener("click", () => loadPreview(false));
    document.getElementById("wpGoHome")?.addEventListener("click", () => loadPreview(false));

    setView("desktop");
    loadPreview(false);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
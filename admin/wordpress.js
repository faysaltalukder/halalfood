(() => {
  "use strict";

  // The admin workspace and storefront are hosted on the same GitHub Pages
  // origin. Load the real page directly instead of fetching/rebuilding it via
  // srcdoc; this preserves the storefront's native scripts, assets and routing.
  const LIVE_URL = "https://faysaltalukder.github.io/halalfood/";
  const LOAD_TIMEOUT_MS = 30000;

  const init = () => {
    const frame = document.getElementById("wordpressLiveFrame");
    const shell = document.getElementById("wpDeviceShell");
    const stage = document.querySelector(".hf-wordpress-preview-stage");
    const description = document.getElementById("wpViewDescription");
    const status = document.getElementById("wpPreviewStatus");
    const address = document.getElementById("wpPreviewAddress");
    const loading = document.getElementById("wpLoading");
    const errorPanel = document.getElementById("wpPreviewError");
    const backButton = document.getElementById("wpGoBack");
    const forwardButton = document.getElementById("wpGoForward");
    if (!frame || !shell || !stage) return;

    const viewButtons = [...document.querySelectorAll("[data-wp-view]")];
    let currentView = "desktop";
    let loadTimer = 0;
    let loadSequence = 0;
    let hasLoaded = false;
    let frameHistoryReady = false;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const showLoading = (message) => {
      hasLoaded = false;
      if (loading) {
        loading.hidden = false;
        const strong = loading.querySelector("strong");
        const small = loading.querySelector("small");
        if (strong) strong.textContent = message || "Opening the live website…";
        if (small) small.textContent = "Connecting directly to the published Halal Food storefront.";
      }
      if (errorPanel) errorPanel.hidden = true;
      setStatus("Connecting to the live Halal Food website…");
    };

    const showError = (message) => {
      if (loading) loading.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        const paragraph = errorPanel.querySelector("p");
        if (paragraph) paragraph.textContent = message;
      }
      setStatus(message);
    };

    const getFrameUrl = () => {
      try {
        const href = frame.contentWindow.location.href;
        const url = new URL(href);
        if (url.origin === new URL(LIVE_URL).origin && url.pathname.startsWith("/halalfood/")) return url.href;
      } catch (_) {}
      return LIVE_URL;
    };

    const updateAddress = () => {
      if (address) address.textContent = getFrameUrl();
      updateHistoryControls();
    };

    const updateHistoryControls = () => {
      try {
        if (backButton) backButton.disabled = frame.contentWindow.history.length <= 1;
        if (forwardButton) forwardButton.disabled = true;
      } catch (_) {
        if (backButton) backButton.disabled = true;
        if (forwardButton) forwardButton.disabled = true;
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
        description.textContent = mobile ? "Mobile view · 390px phone viewport" : "Desktop view · Full responsive website";
      }
      try {
        frame.contentWindow.dispatchEvent(new frame.contentWindow.Event("resize"));
      } catch (_) {}
    };

    const attachFrameNavigationListeners = () => {
      if (frameHistoryReady) return;
      try {
        const win = frame.contentWindow;
        win.addEventListener("popstate", updateAddress);
        win.addEventListener("hashchange", updateAddress);
        win.addEventListener("pageshow", updateAddress);
        frameHistoryReady = true;
      } catch (_) {}
    };

    const onFrameLoad = () => {
      window.clearTimeout(loadTimer);
      try {
        const doc = frame.contentDocument;
        if (!doc || !doc.documentElement) throw new Error("The browser did not expose the storefront document.");
        const title = doc.title || "Halal Food";
        if (doc.readyState !== "complete" && !doc.body) throw new Error("The storefront document is not ready yet.");
        hasLoaded = true;
        frameHistoryReady = false;
        attachFrameNavigationListeners();
        if (loading) loading.hidden = true;
        if (errorPanel) errorPanel.hidden = true;
        updateAddress();
        setStatus("Live website loaded successfully · " + title);
      } catch (error) {
        showError("The storefront opened, but the preview could not verify its page content. Open it separately to check browser restrictions.");
      }
    };

    const navigate = (url, message = "Opening the live website…") => {
      const target = new URL(url, LIVE_URL);
      const liveOrigin = new URL(LIVE_URL).origin;
      if (target.origin !== liveOrigin || !target.pathname.startsWith("/halalfood/")) {
        window.open(target.href, "_blank", "noopener,noreferrer");
        return;
      }
      window.clearTimeout(loadTimer);
      const sequence = ++loadSequence;
      showLoading(message);
      setStatus("Opening " + target.pathname + " from the published storefront…");
      loadTimer = window.setTimeout(() => {
        if (sequence !== loadSequence || hasLoaded) return;
        showError("The live website did not finish loading within 30 seconds. Check your connection or open the live website separately.");
      }, LOAD_TIMEOUT_MS);
      frameHistoryReady = false;
      frame.src = target.href;
    };

    frame.addEventListener("load", onFrameLoad);
    frame.addEventListener("error", () => {
      window.clearTimeout(loadTimer);
      showError("The browser could not load the live storefront. Check the connection, then retry.");
    });

    viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.wpView)));

    backButton?.addEventListener("click", () => {
      try {
        if (frame.contentWindow.history.length > 1) frame.contentWindow.history.back();
      } catch (_) {
        showError("Browser history is not available for this page. Use Home to return to the storefront.");
      }
    });

    forwardButton?.addEventListener("click", () => {
      try { frame.contentWindow.history.forward(); } catch (_) {}
    });

    document.getElementById("wpRefresh")?.addEventListener("click", () =>
      navigate(getFrameUrl(), "Refreshing the live website…")
    );
    document.getElementById("wpRetry")?.addEventListener("click", () =>
      navigate(LIVE_URL, "Retrying the live website…")
    );
    document.getElementById("wpGoHome")?.addEventListener("click", () =>
      navigate(LIVE_URL, "Returning to the storefront home page…")
    );

    setView("desktop");
    if (backButton) backButton.disabled = true;
    if (forwardButton) forwardButton.disabled = true;
    navigate(LIVE_URL);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

(() => {
  "use strict";

  const LIVE_URL = "https://faysaltalukder.github.io/halalfood/";
  const LOAD_TIMEOUT_MS = 25000;

  const init = () => {
    const frame = document.getElementById("wordpressLiveFrame");
    const shell = document.getElementById("wpDeviceShell");
    const stage = document.querySelector(".hf-wordpress-preview-stage");
    const description = document.getElementById("wpViewDescription");
    const status = document.getElementById("wpPreviewStatus");
    const address = document.getElementById("wpPreviewAddress");
    const loading = document.getElementById("wpLoading");
    const errorPanel = document.getElementById("wpPreviewError");
    const diagnostics = document.getElementById("wpPreviewDiagnostics");
    const backButton = document.getElementById("wpGoBack");
    const forwardButton = document.getElementById("wpGoForward");
    if (!frame || !shell || !stage) return;

    const viewButtons = [...document.querySelectorAll("[data-wp-view]")];
    let currentView = "desktop";
    let loadTimer = 0;
    let loadSequence = 0;
    let hasLoaded = false;
    let frameHistoryReady = false;
    let attemptStartedAt = 0;
    let attemptedUrl = LIVE_URL;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const setDiagnostics = (lines) => {
      if (diagnostics) diagnostics.textContent = lines.filter(Boolean).join("\n");
    };

    const describeError = (error) => {
      if (!error) return "No browser exception was exposed.";
      return [error.name || "Error", error.message || String(error)].join(": ");
    };

    const getLayoutInfo = () => {
      const rect = frame.getBoundingClientRect();
      const style = window.getComputedStyle(frame);
      return {
        iframeWidth: Math.round(rect.width) + "px",
        iframeHeight: Math.round(rect.height) + "px",
        iframeDisplay: style.display,
        iframeVisibility: style.visibility,
        shellWidth: Math.round(shell.getBoundingClientRect().width) + "px",
        shellHeight: Math.round(shell.getBoundingClientRect().height) + "px",
        viewport: window.innerWidth + " × " + window.innerHeight
      };
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
      setDiagnostics([
        "Preview state: loading",
        "Requested URL: " + attemptedUrl,
        "Started: " + new Date(attemptStartedAt).toLocaleString(),
        ...Object.entries(getLayoutInfo()).map(([key, value]) => key + ": " + value)
      ]);
    };

    const showError = (heading, explanation, extra = []) => {
      window.clearTimeout(loadTimer);
      if (loading) loading.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        const strong = errorPanel.querySelector("strong");
        const paragraph = errorPanel.querySelector("p");
        if (strong) strong.textContent = heading;
        if (paragraph) paragraph.textContent = explanation;
      }
      setStatus(heading + " " + explanation);
      setDiagnostics([
        "Preview state: FAILED",
        "Failure time: " + new Date().toLocaleString(),
        "Requested URL: " + attemptedUrl,
        "iframe src: " + (frame.getAttribute("src") || "(not assigned)"),
        "Elapsed: " + (attemptStartedAt ? Math.round(performance.now() - attemptStartedAt) + " ms" : "unknown"),
        ...Object.entries(getLayoutInfo()).map(([key, value]) => key + ": " + value),
        ...extra
      ]);
    };

    const getFrameUrl = () => {
      try {
        const href = frame.contentWindow.location.href;
        const url = new URL(href);
        if (url.origin === new URL(LIVE_URL).origin && url.pathname.startsWith("/halalfood/")) return url.href;
      } catch (_) {}
      return attemptedUrl || LIVE_URL;
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

    const updateAddress = () => {
      if (address) address.textContent = getFrameUrl();
      updateHistoryControls();
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
      if (description) description.textContent = mobile ? "Mobile view · 390px phone viewport" : "Desktop view · Full responsive website";
      window.requestAnimationFrame(() => {
        if (!hasLoaded) return;
        setDiagnostics([
          "Preview state: loaded",
          "Current URL: " + getFrameUrl(),
          ...Object.entries(getLayoutInfo()).map(([key, value]) => key + ": " + value)
        ]);
      });
      try { frame.contentWindow.dispatchEvent(new frame.contentWindow.Event("resize")); } catch (_) {}
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
      const elapsed = Math.round(performance.now() - attemptStartedAt);
      try {
        const doc = frame.contentDocument;
        if (!doc) {
          showError("Preview loaded, but its document is inaccessible.",
            "The iframe load event fired, but the browser returned a null document. This usually means the final page is not same-origin or the browser blocked document access.",
            ["Document check: contentDocument is null", "Load event: fired", "Elapsed: " + elapsed + " ms"]);
          return;
        }
        if (!doc.documentElement) {
          showError("The iframe loaded an empty document.",
            "The browser fired the load event, but the document has no HTML root element.",
            ["Document readyState: " + doc.readyState, "Document title: " + (doc.title || "(empty)"), "Load event: fired"]);
          return;
        }
        if (!doc.body) {
          showError("The storefront document is incomplete.",
            "The iframe loaded, but the document body is missing. Check the storefront response and its redirects.",
            ["Document readyState: " + doc.readyState, "Document title: " + (doc.title || "(empty)"), "Load event: fired"]);
          return;
        }
        const bodyText = (doc.body.innerText || "").trim();
        const title = doc.title || "Halal Food";
        hasLoaded = true;
        attachFrameNavigationListeners();
        if (loading) loading.hidden = true;
        if (errorPanel) errorPanel.hidden = true;
        updateAddress();
        setStatus("Live website loaded successfully · " + title);
        setDiagnostics([
          "Preview state: loaded and verified",
          "Document title: " + title,
          "Document readyState: " + doc.readyState,
          "Body text length: " + bodyText.length + " characters",
          "Current URL: " + getFrameUrl(),
          "Load event: fired",
          "Elapsed: " + elapsed + " ms",
          ...Object.entries(getLayoutInfo()).map(([key, value]) => key + ": " + value)
        ]);
      } catch (error) {
        showError("The browser blocked access to the preview document.",
          "The iframe load event fired, but JavaScript could not inspect the page. The exact browser exception is shown below.",
          ["Load event: fired", "Document access exception: " + describeError(error)]);
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
      attemptedUrl = target.href;
      attemptStartedAt = performance.now();
      showLoading(message);
      setStatus("Opening " + target.pathname + " from the published storefront…");
      loadTimer = window.setTimeout(() => {
        if (sequence !== loadSequence || hasLoaded) return;
        showError("The iframe did not report a completed load.",
          "No iframe load event was received within 25 seconds. The storefront may be blocked by a network failure, redirect, browser frame policy, or a stalled request. Check the requested URL and layout details below.",
          ["Load event: NOT received", "Timeout: " + LOAD_TIMEOUT_MS + " ms", "Note: browsers do not expose the underlying iframe network error to the parent page."]);
      }, LOAD_TIMEOUT_MS);
      frame.src = target.href;
    };

    frame.addEventListener("load", onFrameLoad);
    frame.addEventListener("error", (event) => {
      showError("The iframe reported a loading error.",
        "The browser dispatched an iframe error event. Additional event information is shown below.",
        ["Load event: error", "Event type: " + event.type]);
    });

    viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.wpView)));
    backButton?.addEventListener("click", () => {
      try {
        if (frame.contentWindow.history.length > 1) frame.contentWindow.history.back();
      } catch (error) {
        showError("Browser history is unavailable.", "The preview page did not allow history access.", ["History exception: " + describeError(error)]);
      }
    });
    forwardButton?.addEventListener("click", () => {
      try { frame.contentWindow.history.forward(); } catch (_) {}
    });
    document.getElementById("wpRefresh")?.addEventListener("click", () => navigate(getFrameUrl(), "Refreshing the live website…"));
    document.getElementById("wpRetry")?.addEventListener("click", () => navigate(LIVE_URL, "Retrying the live website…"));
    document.getElementById("wpGoHome")?.addEventListener("click", () => navigate(LIVE_URL, "Returning to the storefront home page…"));

    setView("desktop");
    if (backButton) backButton.disabled = true;
    if (forwardButton) forwardButton.disabled = true;
    navigate(LIVE_URL);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

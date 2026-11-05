(() => {
  "use strict";

  const LIVE_URL = "https://faysaltalukder.github.io/halalfood/";
  const SITE_ORIGIN = new URL(LIVE_URL).origin;
  const SITE_PATH = new URL(LIVE_URL).pathname;
  const BRIDGE_CHANNEL = "halal-food-wordpress-preview";
  const TOTAL_TIMEOUT_MS = 30000;
  const REQUEST_TIMEOUT_MS = 20000;
  const BOOTSTRAP_TIMEOUT_MS = 35000;

  const init = () => {
    const frame = document.getElementById("wordpressLiveFrame");
    const shell = document.getElementById("wpDeviceShell");
    const stage = document.getElementById("wpPublishedStage");
    const description = document.getElementById("wpViewDescription");
    const status = document.getElementById("wpPreviewStatus");
    const address = document.getElementById("wpPreviewAddress");
    const loading = document.getElementById("wpLoading");
    const errorPanel = document.getElementById("wpPreviewError");
    const diagnostics = document.getElementById("wpPreviewDiagnostics");
    const backButton = document.getElementById("wpGoBack");
    const forwardButton = document.getElementById("wpGoForward");
    if (!frame || !shell || !stage) {
      showBootstrapError("The WordPress preview workspace is missing required iframe or layout elements.", ["Required: #wordpressLiveFrame, #wpDeviceShell, .hf-wordpress-preview-stage", "Check admin shell markup replacement and the current route."]);
      return;
    }

    const viewButtons = [...document.querySelectorAll("[data-wp-view]")];
    let currentView = "desktop";
    let currentUrl = LIVE_URL;
    let totalTimer = 0;
    let loadSequence = 0;
    let pendingRenderSequence = 0;
    let lastResourceErrors = [];
    let activeRequestController = null;
    let attemptStartedAt = 0;
    let attemptedUrl = LIVE_URL;
    let hasLoaded = false;
    let emulatedWindow = null;
    let nativeMatchMedia = null;
    const routeHistory = [LIVE_URL];
    let routeIndex = 0;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const updateHistoryControls = () => {
      if (backButton) backButton.disabled = routeIndex <= 0;
      if (forwardButton) forwardButton.disabled = routeIndex >= routeHistory.length - 1;
    };

    const setDiagnostics = (lines) => { if (diagnostics) diagnostics.textContent = lines.filter(Boolean).join("\n"); };

    const layoutDiagnostics = () => {
      const rect = frame.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const style = window.getComputedStyle(frame);
      return ["Preview frame: " + Math.round(rect.width) + " × " + Math.round(rect.height) + " px", "Preview shell: " + Math.round(shellRect.width) + " × " + Math.round(shellRect.height) + " px", "Frame display: " + style.display, "Frame visibility: " + style.visibility, "Parent viewport: " + window.innerWidth + " × " + window.innerHeight];
    };

    const showLoading = (message = "Loading the live Halal Food website…") => {
      if (loading) {
        loading.hidden = false;
        const strong = loading.querySelector("strong");
        const small = loading.querySelector("small");
        if (strong) strong.textContent = message;
        if (small) small.textContent = "Checking the live page and rendering it. If it cannot load, detailed diagnostics appear within 30 seconds.";
      }
      if (errorPanel) errorPanel.hidden = true;
      setStatus("Connecting securely to the live website…");
      setDiagnostics(["Preview state: fetching storefront HTML", "Requested URL: " + attemptedUrl, "Total preview deadline: " + TOTAL_TIMEOUT_MS + " ms", "Storefront request deadline: " + REQUEST_TIMEOUT_MS + " ms", "Started: " + new Date().toLocaleString(), "Browser online: " + navigator.onLine, ...layoutDiagnostics()]);
    };

    const showError = (message, details = []) => {
      window.clearTimeout(totalTimer);
      pendingRenderSequence = 0;
      if (activeRequestController) { activeRequestController.abort(); activeRequestController = null; }
      if (loading) loading.hidden = true;
      if (errorPanel) {
        errorPanel.hidden = false;
        const paragraph = errorPanel.querySelector("p");
        if (paragraph) paragraph.textContent = message;
      }
      setStatus(message);
      setDiagnostics(["Preview state: FAILED", "Failure: " + message, "Failure time: " + new Date().toLocaleString(), "Requested URL: " + attemptedUrl, "Elapsed: " + (attemptStartedAt ? Math.round(performance.now() - attemptStartedAt) + " ms" : "unknown"), "Browser online: " + navigator.onLine, "Page origin: " + location.origin, "Expected storefront origin: " + SITE_ORIGIN, ...lastResourceErrors.map((item, index) => "Resource error " + (index + 1) + ": " + item), ...layoutDiagnostics(), ...details]);
    };

    const escapeAttribute = (value) =>
      String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

    const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

    const createPreviewBridge = (pageUrl) => [
      '<script data-hf-preview-bridge>',
      '(() => {',
      '"use strict";',
      'const pageUrl = ' + safeJson(pageUrl) + ';',
      'const channel = "' + BRIDGE_CHANNEL + '";',
      'const siteOrigin = window.location.origin;',
      'window.addEventListener("error", (event) => { const target = event.target; const resource = target && (target.src || target.href); const detail = resource ? (target.tagName + " failed: " + resource) : ("JavaScript error: " + (event.message || "unknown") + " at " + (event.filename || "inline") + ":" + (event.lineno || 0)); window.parent.postMessage({ channel, type: "preview-error", detail }, siteOrigin); }, true);',
      'window.addEventListener("unhandledrejection", (event) => { const reason = event.reason; window.parent.postMessage({ channel, type: "preview-error", detail: "Unhandled promise rejection: " + (reason && reason.message ? reason.message : String(reason)) }, siteOrigin); });',
      'try { window.history.replaceState({ hfPreview: true }, "", pageUrl); } catch (_) {}',
      'const isSitePage = (url) => url.origin === siteOrigin && url.pathname.startsWith("/halalfood/");',
      'document.addEventListener("click", (event) => {',
      '  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;',
      '  const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;',
      '  if (!anchor || anchor.hasAttribute("download")) return;',
      '  const raw = anchor.getAttribute("href");',
      '  if (!raw || raw.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(raw)) return;',
      '  let url;',
      '  try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }',
      '  if (!isSitePage(url)) { anchor.target = "_self"; return; }',
      '  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) { anchor.target = "_self"; return; }',
      '  event.preventDefault();',
      '  window.parent.postMessage({ channel, type: "navigate", url: url.href }, siteOrigin);',
      '}, false);',
      'document.addEventListener("submit", (event) => {',
      '  if (event.defaultPrevented) return;',
      '  const form = event.target;',
      '  if (!form || !(form instanceof HTMLFormElement)) return;',
      '  if (form.target && form.target.toLowerCase() !== "_self") return;',
      '  let action;',
      '  try { action = new URL(form.getAttribute("action") || window.location.href, window.location.href); } catch (_) { return; }',
      '  if (!isSitePage(action)) { form.target = "_self"; return; }',
      '  const method = String(form.method || "get").toUpperCase();',
      '  const data = new FormData(form);',
      '  if (event.submitter && event.submitter.name && !data.has(event.submitter.name)) data.append(event.submitter.name, event.submitter.value || "");',
      '  event.preventDefault();',
      '  window.parent.postMessage({ channel, type: "form-submit", method, action: action.href, entries: Array.from(data.entries()) }, siteOrigin);',
      '}, false);',
      '})();',
      '</script>'
    ].join("\n");

    const prepareDocument = (source, pageUrl) => {
      const base = '<base href="' + escapeAttribute(pageUrl) + '">';
      const bridge = createPreviewBridge(pageUrl);
      let documentHtml = String(source).replace(/<base\b[^>]*>/gi, "");
      if (/<head\b[^>]*>/i.test(documentHtml)) {
        documentHtml = documentHtml.replace(/<head\b[^>]*>/i, (headTag) => headTag + "\n" + base + "\n" + bridge);
      } else if (/<html\b[^>]*>/i.test(documentHtml)) {
        documentHtml = documentHtml.replace(/<html\b[^>]*>/i, (htmlTag) => htmlTag + "<head>" + base + bridge + "</head>");
      } else {
        documentHtml = "<!doctype html><html><head>" + base + bridge + "</head><body>" + documentHtml + "</body></html>";
      }
      return documentHtml;
    };

    const updateAddress = () => {
      if (!address) return;
      try {
        const url = new URL(currentUrl);
        address.textContent = url.origin + url.pathname + url.search + url.hash;
      } catch (_) {
        address.textContent = "Halal Food live website";
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
            const mobileMedia = source.dataset.wpOriginalMedia.replace(/\s+and\s+\(pointer\s*:\s*coarse\)/i, "").trim();
            source.setAttribute("media", mobileMedia || "all");
          } else {
            source.setAttribute("media", source.dataset.wpOriginalMedia);
          }
        });

        win.dispatchEvent(new win.Event("resize"));
      } catch (_) {}
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
      if (hasLoaded) applyMobilePointerSimulation();
    };

    const validateSiteUrl = (rawUrl) => {
      const url = new URL(rawUrl, currentUrl);
      if (url.protocol !== "https:" || url.origin !== SITE_ORIGIN || !url.pathname.startsWith(SITE_PATH)) return null;
      return url;
    };

    const renderFetchedPage = async (response, requestedUrl, sequence) => {
      const finalUrl = validateSiteUrl(response.url || requestedUrl);
      if (!finalUrl) throw new Error("The requested page redirected outside the Halal Food website.");
      const contentType = response.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error("This destination is not an HTML page. Open it separately from the live website.");
      }
      const pageHtml = await response.text();
      if (!pageHtml.trim()) throw new Error("The server returned an empty HTML document.");
      if (sequence !== loadSequence) return;
      currentUrl = finalUrl.href;
      updateAddress();
      hasLoaded = false;
      pendingRenderSequence = sequence;
      if (errorPanel) errorPanel.hidden = true;
      setStatus("HTML received · Rendering the website inside the preview…");
      setDiagnostics(["Preview state: HTML fetched; iframe rendering in progress", "Final URL: " + currentUrl, "HTTP status: " + response.status, "Content-Type: " + (response.headers.get("content-type") || "(missing)"), "HTML size: " + pageHtml.length + " characters", "Remaining total deadline: " + Math.max(0, TOTAL_TIMEOUT_MS - Math.round(performance.now() - attemptStartedAt)) + " ms", ...layoutDiagnostics()]);
      frame.srcdoc = prepareDocument(pageHtml, currentUrl);
    };

    const fetchAndRender = async (rawUrl, options = {}) => {
      const url = validateSiteUrl(rawUrl);
      if (!url) {
        try { window.open(new URL(rawUrl, currentUrl).href, "_blank", "noopener,noreferrer"); } catch (_) {}
        return;
      }
      const sequence = ++loadSequence;
      attemptedUrl = url.href;
      attemptStartedAt = performance.now();
      window.clearTimeout(totalTimer);
      pendingRenderSequence = 0;
      activeRequestController?.abort();
      const requestController = new AbortController();
      activeRequestController = requestController;
      hasLoaded = false;
      lastResourceErrors = [];
      showLoading(options.loadingMessage || "Loading the live Halal Food website…");
      setStatus("Fetching " + url.pathname + " from the live website…");
      totalTimer = window.setTimeout(() => {
        if (sequence !== loadSequence || hasLoaded) return;
        const stage = pendingRenderSequence === sequence ? "iframe/srcdoc rendering" : "storefront fetch or response body";
        let frameInfo = "Iframe document unavailable";
        try { const doc = frame.contentDocument; frameInfo = doc ? "Iframe readyState=" + doc.readyState + ", body=" + Boolean(doc.body) + ", body children=" + (doc.body?.children.length ?? 0) : frameInfo; } catch (error) { frameInfo = "Iframe access error: " + error.name + ": " + error.message; }
        loadSequence += 1;
        showError("The live website could not be previewed within 30 seconds.", ["Failure stage: " + stage, "Total deadline: " + TOTAL_TIMEOUT_MS + " ms", frameInfo, "The preview stopped automatically instead of spinning indefinitely."]);
      }, TOTAL_TIMEOUT_MS);
      const requestTimer = window.setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url.href, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "follow",
          headers: { Accept: "text/html,application/xhtml+xml" },
          signal: requestController.signal
        });
        if (sequence !== loadSequence) return;
        if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText + " — server rejected the requested page.");
        await renderFetchedPage(response, url.href, sequence);
        window.clearTimeout(requestTimer);
        if (activeRequestController === requestController) activeRequestController = null;
        if (options.record !== false) {
          routeHistory.splice(routeIndex + 1);
          routeHistory.push(currentUrl);
          routeIndex = routeHistory.length - 1;
          updateHistoryControls();
        }
      } catch (error) {
        window.clearTimeout(requestTimer);
        if (sequence !== loadSequence) return;
        if (activeRequestController === requestController) activeRequestController = null;
        if (error && error.name === "AbortError") {
          showError("The storefront request did not return within 20 seconds.", ["Failure stage: storefront fetch or response body", "Abort reason: request timer expired", "Request timeout: " + REQUEST_TIMEOUT_MS + " ms"]);
        } else {
          showError("The storefront request failed: " + (error && error.message ? error.message : String(error)), ["Failure stage: storefront fetch", "Exception: " + (error && error.name ? error.name : "unknown"), "Browser detail: " + (error && error.message ? error.message : String(error)), "Likely classes: network/DNS/TLS, same-origin policy, or request blocked; inspect this exact exception before changing code."]);
        }
      }
    };

    frame.addEventListener("load", () => {
      if (!pendingRenderSequence || pendingRenderSequence !== loadSequence) return;
      try {
        const doc = frame.contentDocument;
        if (!doc || !doc.documentElement || !doc.body) {
          showError("The iframe load event fired, but the preview document has no usable HTML body.", ["Failure stage: iframe document validation", "Document available: " + Boolean(doc), "HTML root: " + Boolean(doc?.documentElement), "Body: " + Boolean(doc?.body)]);
          return;
        }
        hasLoaded = true;
        pendingRenderSequence = 0;
        window.clearTimeout(totalTimer);
        if (loading) loading.hidden = true;
        if (errorPanel) errorPanel.hidden = true;
        applyMobilePointerSimulation();
        setStatus("Live website loaded · Internal pages, shopping links and on-page interactions are available.");
        setDiagnostics(["Preview state: SUCCESS — srcdoc rendered", "Document title: " + (doc.title || "(empty)"), "Document readyState: " + doc.readyState, "HTML root: " + Boolean(doc.documentElement), "Body: " + Boolean(doc.body), "Body child elements: " + doc.body.children.length, "Current page: " + currentUrl, "Elapsed: " + Math.round(performance.now() - attemptStartedAt) + " ms", ...lastResourceErrors.map((item, index) => "Resource warning " + (index + 1) + ": " + item), ...layoutDiagnostics()]);
      } catch (_) {
        setStatus("Live page rendered. Some protected browser features may be unavailable in the preview.");
      }
    });

    window.addEventListener("message", (event) => {
      if (event.source !== frame.contentWindow || event.origin !== SITE_ORIGIN) return;
      const data = event.data;
      if (!data || data.channel !== BRIDGE_CHANNEL) return;
      if (data.type === "preview-error" && typeof data.detail === "string") {
        if (lastResourceErrors.length < 12) lastResourceErrors.push(data.detail.slice(0, 500));
        if (hasLoaded) setDiagnostics(["Preview state: SUCCESS WITH RESOURCE WARNINGS", "Current page: " + currentUrl, "Elapsed: " + Math.round(performance.now() - attemptStartedAt) + " ms", ...lastResourceErrors.map((item, index) => "Resource warning " + (index + 1) + ": " + item), ...layoutDiagnostics()]);
      }
      if (data.type === "navigate" && typeof data.url === "string") {
        const url = validateSiteUrl(data.url);
        if (url) fetchAndRender(url.href);
      }
      if (data.type === "form-submit" && typeof data.action === "string") {
        handleNativeForm(data).catch((error) => {
          showError(error instanceof Error ? error.message : "This form could not be submitted in the preview.");
        });
      }
    });

    const handleNativeForm = async (data) => {
      const action = validateSiteUrl(data.action);
      if (!action) return;
      const method = String(data.method || "GET").toUpperCase();
      const entries = Array.isArray(data.entries) ? data.entries : [];
      if (method === "GET") {
        entries.forEach(([key, value]) => {
          if (typeof value === "string") action.searchParams.append(String(key), value);
        });
        await fetchAndRender(action.href);
        return;
      }
      if (!["POST", "PUT", "PATCH"].includes(method)) return;
      const formData = new FormData();
      entries.forEach(([key, value]) => {
        if (typeof value === "string" || (typeof File !== "undefined" && value instanceof File)) formData.append(String(key), value);
      });
      const sequence = ++loadSequence;
      showLoading("Submitting the website form…");
      totalTimer = window.setTimeout(() => { if (sequence === loadSequence && !hasLoaded) { loadSequence += 1; showError("The form response did not finish rendering within 30 seconds.", ["Failure stage: form submission or iframe rendering", "Total deadline: " + TOTAL_TIMEOUT_MS + " ms"]); } }, TOTAL_TIMEOUT_MS);
      const response = await fetch(action.href, {
        method,
        body: formData,
        credentials: "same-origin",
        redirect: "follow"
      });
      if (!response.ok) throw new Error("The form endpoint returned HTTP " + response.status + ".");
      await renderFetchedPage(response, action.href, sequence);
      routeHistory.splice(routeIndex + 1);
      routeHistory.push(currentUrl);
      routeIndex = routeHistory.length - 1;
      updateHistoryControls();
    };

    viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.wpView)));

    backButton?.addEventListener("click", () => {
      if (routeIndex <= 0) return;
      routeIndex -= 1;
      updateHistoryControls();
      fetchAndRender(routeHistory[routeIndex], { record: false, loadingMessage: "Opening previous page…" });
    });

    forwardButton?.addEventListener("click", () => {
      if (routeIndex >= routeHistory.length - 1) return;
      routeIndex += 1;
      updateHistoryControls();
      fetchAndRender(routeHistory[routeIndex], { record: false, loadingMessage: "Opening next page…" });
    });

    document.getElementById("wpRefresh")?.addEventListener("click", () =>
      fetchAndRender(currentUrl, { record: false, loadingMessage: "Refreshing the live page…" })
    );

    document.getElementById("wpRetry")?.addEventListener("click", () =>
      fetchAndRender(currentUrl, { record: false, loadingMessage: "Retrying the live website…" })
    );

    document.getElementById("wpGoHome")?.addEventListener("click", () => {
      routeHistory.splice(1);
      routeIndex = 0;
      updateHistoryControls();
      fetchAndRender(LIVE_URL, { record: false, loadingMessage: "Returning to the storefront home page…" });
    });

    setView("desktop");
    updateHistoryControls();
    fetchAndRender(LIVE_URL, { record: false });
  };

  const showBootstrapError = (message, details = []) => {
    const adminApp = document.getElementById("adminApp");
    const gate = document.getElementById("authGate");
    const loading = document.getElementById("wpLoading");
    const errorPanel = document.getElementById("wpPreviewError");
    const status = document.getElementById("wpPreviewStatus");
    const diagnostics = document.getElementById("wpPreviewDiagnostics");
    if (loading) loading.hidden = true;
    if (errorPanel) {
      errorPanel.hidden = false;
      const paragraph = errorPanel.querySelector("p");
      if (paragraph) paragraph.textContent = message;
    }
    if (status) status.textContent = message;
    const report = ["Preview state: FAILED BEFORE PREVIEW INITIALIZATION", "Failure: " + message, "Failure stage: secure admin initialization", "Elapsed deadline: " + BOOTSTRAP_TIMEOUT_MS + " ms", "HFAdminReady present: " + Boolean(window.HFAdminReady), "Browser online: " + navigator.onLine, "Page URL: " + location.href, ...details];
    if (diagnostics) diagnostics.textContent = report.join("\n");
    if (adminApp?.hidden && gate) {
      gate.innerHTML = '<div class="auth-gate-card"><strong>WordPress preview could not start</strong><p></p><pre style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><a href="./index.html" class="hf-button hf-button-secondary">Return to sign-in</a></div>';
      gate.querySelector("p").textContent = message;
      gate.querySelector("pre").textContent = report.join("\n");
    }
  };

  const startAfterAdminReady = () => {
    let expired = false;
    const bootstrapTimer = window.setTimeout(() => {
      expired = true;
      showBootstrapError("The secure admin workspace did not become ready. Preview initialization stopped instead of waiting indefinitely.", ["HFAdminReady did not resolve before the bootstrap deadline.", "Check Supabase Auth session, MFA verification and admin shell construction."]);
    }, BOOTSTRAP_TIMEOUT_MS);
    const adminReady = window.HFAdminReady;
    if (!adminReady || typeof adminReady.then !== "function") {
      window.clearTimeout(bootstrapTimer);
      showBootstrapError("The admin initialization signal is missing. The preview cannot safely start.", ["Expected window.HFAdminReady to be a Promise.", "Check that shared.js executes before wordpress.js."]);
      return;
    }
    adminReady.then((admin) => {
      window.clearTimeout(bootstrapTimer);
      if (expired) return;
      if (!admin) {
        showBootstrapError("The secure admin session was not authorized, so the preview was not started.", ["HFAdminReady resolved without an admin session.", "Sign in again and complete two-step verification."]);
        return;
      }
      window.__HFWordpressPreviewInitialized = true;
      init();
    }).catch((error) => {
      window.clearTimeout(bootstrapTimer);
      if (expired) return;
      showBootstrapError("The secure admin initialization failed: " + (error?.message || String(error)), ["Exception: " + (error?.name || "unknown"), "Stack: " + (error?.stack || "not available")]);
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAfterAdminReady, { once: true });
  else startAfterAdminReady();
})();
/* WordPress Studio sandbox workflow.
 * The "Live Website" partition is a dashboard-only published test version.
 * No production storefront, APIs, database, checkout, or deployment is accessed.
 */
(() => {
  "use strict";
  const REVIEW_KEY = "hf-wp-review-package-v1";
  const PUBLISHED_KEY = "hf-wp-sandbox-published-v1";
  const HISTORY_KEY = "hf-wp-sandbox-history-v1";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validNode = (n, depth = 0) => Boolean(n && typeof n === "object" && !Array.isArray(n) && typeof n.id === "string" && ["section","container","heading","paragraph","image","button"].includes(n.type) && n.props && typeof n.props === "object" && Array.isArray(n.children) && depth <= 12 && n.children.length <= 200 && n.children.every((child) => validNode(child, depth + 1)));
  const validDoc = (doc) => Boolean(doc && doc.schemaVersion === 1 && doc.page && typeof doc.page.title === "string" && Array.isArray(doc.tree) && doc.tree.length <= 200 && doc.tree.every((node) => validNode(node)));
  const safeColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "";
  const cssFor = (p) => {
    let css = "";
    if (safeColor(p.background)) css += "background:" + p.background + ";";
    if (safeColor(p.color)) css += "color:" + p.color + ";";
    if (Number.isFinite(Number(p.padding))) css += "padding:" + Math.max(0, Math.min(160, Number(p.padding))) + "px;";
    if (Number.isFinite(Number(p.fontSize))) css += "font-size:" + Math.max(8, Math.min(96, Number(p.fontSize))) + "px;";
    if (["left","center","right"].includes(p.align)) css += "text-align:" + p.align + ";";
    if (/^\d{1,4}(px|%)$/.test(String(p.width || ""))) css += "width:" + p.width + ";";
    if (Number.isFinite(Number(p.height))) css += "height:" + Math.max(40, Math.min(900, Number(p.height))) + "px;";
    return css;
  };
  const renderNode = (node) => {
    const p = node.props || {};
    const children = (node.children || []).map(renderNode).join("");
    const css = cssFor(p);
    if (node.type === "section") return '<section style="' + css + ';box-sizing:border-box;min-height:110px">' + children + "</section>";
    if (node.type === "container") return '<div style="' + css + ';box-sizing:border-box;max-width:1100px;margin-inline:auto">' + children + "</div>";
    if (node.type === "heading") return '<h2 style="' + css + ';font-weight:800;line-height:1.12">' + esc(node.text) + "</h2>";
    if (node.type === "paragraph") return '<p style="' + css + ';line-height:1.65">' + esc(node.text) + "</p>";
    if (node.type === "button") return '<span style="' + css + ';display:inline-block;border-radius:8px;background:' + (safeColor(p.background) || "#35486d") + ';color:' + (safeColor(p.color) || "#fff") + '">' + esc(node.text) + "</span>";
    if (node.type === "image") {
      let src = "";
      try { const url = new URL(p.src || ""); if (["https:","http:"].includes(url.protocol)) src = url.href; } catch (_) {}
      return src ? '<img src="' + esc(src) + '" alt="' + esc(p.alt || "") + '" referrerpolicy="no-referrer" loading="lazy" style="display:block;max-width:100%;object-fit:' + (["cover","contain","fill"].includes(p.fit) ? p.fit : "cover") + ";" + css + '">' : '<div style="padding:24px;background:#eef1f5;color:#68758a">Image placeholder</div>';
    }
    return "";
  };
  const renderDocument = (doc) => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><style>*{box-sizing:border-box}body{margin:0;padding:24px;color:#263247;font-family:Inter,system-ui,sans-serif}img{max-width:100%}</style></head><body>' + doc.tree.map(renderNode).join("") + "</body></html>";
  const readJson = (key, fallback = null) => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch (_) { return fallback; } };
  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const init = () => {
    const frame = $("wpSandboxFrame");
    if (!frame) return;
    const reviewPanel = $("wpSandboxReview");
    const reviewFrame = $("wpSandboxReviewFrame");
    const empty = $("wpSandboxEmpty");
    const status = $("wpSandboxStatus");
    const publishedMeta = $("wpSandboxPublishedMeta");
    const historyList = $("wpSandboxHistory");
    const viewButtons = [...document.querySelectorAll("[data-sandbox-view]")];
    const stage = $("wpSandboxStage");
    const device = $("wpSandboxDevice");
    let review = readJson(REVIEW_KEY);
    let published = readJson(PUBLISHED_KEY);
    let currentView = "desktop";
    const setStatus = (message) => { if (status) status.textContent = message; };
    const setView = (view) => {
      currentView = view;
      const mobile = view === "mobile";
      if (device) device.classList.toggle("is-mobile", mobile);
      if (stage) stage.classList.toggle("is-mobile-mode", mobile);
      viewButtons.forEach((button) => {
        const active = button.dataset.sandboxView === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };
    const loadPublished = () => {
      published = readJson(PUBLISHED_KEY);
      if (!published || !validDoc(published.document)) {
        frame.removeAttribute("srcdoc");
        frame.hidden = true;
        if (empty) empty.hidden = false;
        if (publishedMeta) publishedMeta.textContent = "No Test Published Version yet. Edit a page and publish a test version to see it here.";
        setStatus("Sandbox ready · no test version published");
        return;
      }
      frame.hidden = false;
      if (empty) empty.hidden = true;
      frame.srcdoc = renderDocument(published.document);
      if (publishedMeta) publishedMeta.textContent = "Test Version " + published.version + " · Published " + new Date(published.publishedAt).toLocaleString() + " · " + (published.document.page.title || "Untitled page");
      setStatus("Test Version " + published.version + " loaded · sandbox only");
      renderHistory();
    };
    const renderHistory = () => {
      if (!historyList) return;
      const history = readJson(HISTORY_KEY, []);
      historyList.replaceChildren();
      if (!Array.isArray(history) || !history.length) {
        const item = document.createElement("li");
        item.textContent = "No test versions yet.";
        historyList.append(item);
        return;
      }
      history.slice(0, 12).forEach((entry) => {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = "Version " + entry.version + " · " + (entry.title || "Untitled page");
        const meta = document.createElement("small");
        meta.textContent = new Date(entry.publishedAt).toLocaleString();
        item.append(title, meta);
        historyList.append(item);
      });
    };
    const renderReview = () => {
      review = readJson(REVIEW_KEY);
      if (!reviewPanel) return;
      const valid = review && validDoc(review.document) && ["in_review","approved","rejected","test_published"].includes(review.status);
      reviewPanel.hidden = !valid;
      if (!valid) return;
      $("wpSandboxReviewTitle").textContent = review.document.page.title || "Submitted draft";
      $("wpSandboxReviewMeta").textContent = "Submitted " + new Date(review.sentAt).toLocaleString() + " · Review ID " + review.reviewId;
      $("wpSandboxReviewState").textContent = review.status.replaceAll("_"," ").toUpperCase();
      $("wpSandboxReviewState").dataset.state = review.status;
      $("wpSandboxApprove").disabled = review.status !== "in_review";
      $("wpSandboxPublish").disabled = review.status !== "approved";
      $("wpSandboxPublish").textContent = review.status === "test_published" ? "Test version published" : "Publish Test Version";
      if (review.status === "in_review" || review.status === "approved") {
        reviewFrame.hidden = false;
        reviewFrame.srcdoc = renderDocument(review.document);
      } else {
        reviewFrame.hidden = true;
        reviewFrame.removeAttribute("srcdoc");
      }
    };
    const approve = () => {
      review = readJson(REVIEW_KEY);
      if (!review || !validDoc(review.document) || review.status !== "in_review") return;
      if (!window.confirm("Approve this draft for Test Publish? This only changes the dashboard sandbox.")) return;
      review.status = "approved";
      review.approvedAt = new Date().toISOString();
      writeJson(REVIEW_KEY, review);
      renderReview();
      setStatus("Draft approved · ready for Test Publish");
    };
    const publishTest = () => {
      review = readJson(REVIEW_KEY);
      if (!review || !validDoc(review.document) || review.status !== "approved") return;
      if (!window.confirm("Publish this as a Test Version inside this admin dashboard only? The real Halal Food website will not change.")) return;
      published = readJson(PUBLISHED_KEY);
      const history = readJson(HISTORY_KEY, []);
      const version = (Number(published?.version) || 0) + 1;
      const record = { schemaVersion: 1, version, versionId: "sandbox-v" + version + "-" + Date.now(), publishedAt: new Date().toISOString(), sourceReviewId: review.reviewId, document: review.document };
      const before = { published: localStorage.getItem(PUBLISHED_KEY), history: localStorage.getItem(HISTORY_KEY), review: localStorage.getItem(REVIEW_KEY) };
      try {
        writeJson(PUBLISHED_KEY, record);
        writeJson(HISTORY_KEY, [record, ...(Array.isArray(history) ? history : [])].slice(0, 20));
        review.status = "test_published";
        review.testPublishedAt = record.publishedAt;
        review.testPublishedVersion = version;
        writeJson(REVIEW_KEY, review);
        renderReview();
        loadPublished();
        setStatus("Test Version " + version + " published inside this dashboard · Production unchanged");
      } catch (error) {
        [[PUBLISHED_KEY, before.published], [HISTORY_KEY, before.history], [REVIEW_KEY, before.review]].forEach(([key, value]) => {
          try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {}
        });
        setStatus("Test Publish failed: " + (error?.message || String(error)));
        window.alert("Could not save the Test Version in this browser. The previous sandbox state was restored. Check available storage and try again.");
      }
    };
    $("wpSandboxApprove")?.addEventListener("click", approve);
    $("wpSandboxPublish")?.addEventListener("click", publishTest);
    $("wpSandboxViewDraft")?.addEventListener("click", () => { reviewFrame.hidden = false; reviewFrame.srcdoc = renderDocument(review.document); reviewFrame.scrollIntoView({behavior:"smooth",block:"center"}); });
    $("wpSandboxRefresh")?.addEventListener("click", () => { renderReview(); loadPublished(); setStatus("Sandbox refreshed from this browser's saved test data"); });
    viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.sandboxView)));
    setView("desktop");
    renderReview();
    loadPublished();
    if (new URLSearchParams(location.search).has("wp_review") && review && validDoc(review.document)) {
      reviewPanel.hidden = false;
      reviewFrame.scrollIntoView({behavior:"smooth",block:"center"});
    }
  };
  const waitForAdmin = () => {
    const ready = window.HFAdminReady;
    if (!ready || typeof ready.then !== "function") return;
    ready.then((authorized) => { if (authorized) init(); }).catch(() => {});
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForAdmin, { once: true });
  else waitForAdmin();
})();

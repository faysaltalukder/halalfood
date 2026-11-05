(() => {
  "use strict";
  const init = () => {
    const frame = document.getElementById("wordpressLiveFrame");
    const shell = document.getElementById("wpDeviceShell");
    const description = document.getElementById("wpViewDescription");
    const status = document.getElementById("wpPreviewStatus");
    const address = document.getElementById("wpPreviewAddress");
    const loading = document.getElementById("wpLoading");
    if (!frame || !shell) return;

    const viewButtons = [...document.querySelectorAll("[data-wp-view]")];
    const setView = (view) => {
      const mobile = view === "mobile";
      shell.classList.toggle("is-mobile", mobile);
      shell.classList.toggle("is-desktop", !mobile);
      viewButtons.forEach((button) => {
        const active = button.dataset.wpView === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      if (description) {
        description.textContent = mobile
          ? "Mobile view · Narrow phone-sized viewport"
          : "Desktop view · Full responsive website";
      }
    };

    viewButtons.forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.wpView));
    });

    document.getElementById("wpRefresh")?.addEventListener("click", () => {
      if (status) status.textContent = "Refreshing the live website…";
      try { frame.contentWindow.location.reload(); }
      catch (_) { frame.src = frame.src; }
    });

    document.getElementById("wpGoHome")?.addEventListener("click", () => {
      if (status) status.textContent = "Returning to the website home page…";
      frame.src = "../";
    });

    frame.addEventListener("load", () => {
      if (loading) loading.hidden = true;
      if (status) status.textContent = "Live website loaded · Links and on-page interactions are available.";
      try {
        const current = frame.contentWindow.location.href;
        if (address && current.startsWith(window.location.origin)) address.textContent = current;
      } catch (_) {
        if (address) address.textContent = "Halal Food live website";
      }
    });

    setView("desktop");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
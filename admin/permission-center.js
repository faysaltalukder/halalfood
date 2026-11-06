(() => {
 "use strict";
 const ready = window.HFAdminReady;
 if (!ready || typeof ready.then !== "function") return;
 ready.then(admin => {
  if (!admin || document.body.dataset.page !== "permission-center") return;
  const host = document.getElementById("adminMain") || document.getElementById("pageContent");
  if (!host) return;
  let root = document.getElementById("hfPermissionRoot");
  if (!root || !host.contains(root)) {
   root = document.createElement("div");
   root.id = "hfPermissionRoot";
   host.appendChild(root);
  }
  let busy = false;
  function status(message, kind) {
   const el = root.querySelector("[data-publish-status]");
   if (!el) return;
   el.textContent = message || "";
   el.style.color = kind === "error" ? "#b54737" : kind === "success" ? "#28734b" : "var(--hf-muted,#697586)";
  }
  function render() {
   root.innerHTML = `
    <div class="hfp-publish-wrap">
     <button type="button" class="hfp-publish-button" data-publish ${busy ? "disabled" : ""}>${busy ? "Publishing…" : "Publish"}</button>
     <div class="hfp-publish-status" data-publish-status role="status" aria-live="polite"></div>
    </div>`;
  }
  async function publish() {
   if (busy) return;
   const client = admin.client;
   if (!client?.functions?.invoke) {
    status("Admin session is not ready. Refresh the page and sign in again.", "error");
    return;
   }
   busy = true;
   render();
   status("Publishing the latest website files to Backblaze B2…");
   try {
    const invoke = client.functions.invoke("backblaze-storage", { body: { action: "publish_site" } });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Publish timed out. Check the server logs before retrying.")), 180000));
    const { data, error } = await Promise.race([invoke, timeout]);
    if (error) {
     let message = error.message || "Publish failed.";
     try {
      if (error.context?.json) {
       const body = await error.context.json();
       message = body.error || body.message || message;
      }
     } catch (_) {}
     throw new Error(message);
    }
    if (!data?.ok || data.status !== "published") throw new Error(data?.error || "The server did not confirm a completed publish.");
    status("Published successfully · " + Number(data.file_count || 0) + " files · " +
     Number(data.total_bytes || 0).toLocaleString("en-US") + " bytes · source " +
     String(data.source_commit || "").slice(0, 12), "success");
    admin.toast?.("Website published to Backblaze B2.", "success");
   } catch (error) {
    const message = error?.message || "Publish failed.";
    status(message, "error");
    admin.toast?.(message, "error");
   } finally {
    busy = false;
    const button = root.querySelector("[data-publish]");
    if (button) {
     button.disabled = false;
     button.textContent = "Publish";
    }
   }
  }
  root.addEventListener("click", event => {
   if (event.target.closest("[data-publish]")) publish();
  });
  render();
 }).catch(error => console.error("Permission Center initialization failed", error));
})();
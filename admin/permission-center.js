(() => {
"use strict";
const root = document.getElementById("hfPermissionRoot");
if (!root) return;
const PROJECT_ID = "qfwvrcfkrsydycbfjsxf";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const when = value => value ? new Date(value).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"}) : "—";
let apiData = {requests:[],grants:[],audit:[]};
let statusData = {};
let selectedRequest = null;
let selectedDecision = "approve";
let busy = false;

async function call(action, payload = {}) {
  const {data,error} = await window.HFAdmin.client.functions.invoke("hf-permission-center",{body:{action,...payload}});
  if (error) {
    let detail = error.message || "Permission service request failed.";
    try { const context = error.context; if (context?.json) { const body = await context.json(); detail = body.error || detail; } } catch (_) {}
    throw new Error(detail);
  }
  if (!data?.success) throw new Error(data?.error || "Permission service rejected the request.");
  return data;
}
function notify(message, kind = "success") {
  if (window.HFAdmin?.toast) window.HFAdmin.toast(message,kind);
  else alert(message);
}
function chip(text, type = "") { return '<span class="hfp-chip '+type+'">'+escapeHtml(text)+'</span>'; }
function active(grant) {
  return !grant.revoked_at && grant.expires_at && new Date(grant.expires_at).getTime() > Date.now() && Number(grant.uses_count) < Number(grant.max_uses);
}
function render() {
  const requests = apiData.requests || [];
  const grants = apiData.grants || [];
  const logs = apiData.audit || [];
  const pending = requests.filter(r => r.status === "pending");
  const activeGrants = grants.filter(active);
  const revoked = grants.filter(g => !!g.revoked_at);
  const githubReady = statusData.githubOAuthConfigured && statusData.githubTokenEncryptionConfigured;
  const bridgeReady = statusData.bridgeSecretConfigured;
  root.innerHTML = `
    <header class="page-heading hfp-head">
      <div><p class="page-eyebrow">SECURE ACCESS · SERVER APPROVALS · AUDIT</p><h1>Permission</h1><p class="hfp-muted">Review every request before access is granted. Each approval is scoped, time-limited and recorded on the server.</p></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${chip("Approval API "+(statusData.backend==="connected"?"connected":"offline"),statusData.backend==="connected"?"good":"danger")}<button class="hfp-btn" data-action="refresh" ${busy?"disabled":""}>↻ Refresh</button></div>
    </header>
    <div class="hfp-alert"><strong>What works now—and what still needs connecting</strong>The approval database and MFA-protected decision API are active. Approving a request creates a real server-side grant. It does not by itself install the ChatGPT MCP connection or create a GitHub OAuth token; those integration requirements are listed below. Do not treat a test request as permission to perform a real external action.</div>
    <section class="hfp-grid">
      <div class="hfp-card"><div class="hfp-muted">Pending requests</div><div class="hfp-metric">${pending.length}</div></div>
      <div class="hfp-card"><div class="hfp-muted">Active grants</div><div class="hfp-metric">${activeGrants.length}</div></div>
      <div class="hfp-card"><div class="hfp-muted">Revoked grants</div><div class="hfp-metric">${revoked.length}</div></div>
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Connection diagnostics</h2><p class="hfp-muted">These checks identify exactly which server-side settings are missing.</p></div>${chip("Live status", "good")}</div>
      <div class="hfp-row"><div><strong>Supabase approval backend</strong><div class="hfp-muted">Database tables, server function and admin MFA check</div></div>${chip(statusData.database==="ready"?"Ready":"Not ready",statusData.database==="ready"?"good":"danger")}</div>
      <div class="hfp-row"><div><strong>Secure Bridge key</strong><div class="hfp-muted">Required for external ChatGPT/MCP permission requests and grant checks. Secret name: <code>HF_PERMISSION_BRIDGE_SECRET</code></div></div>${chip(bridgeReady?"Configured":"Missing",bridgeReady?"good":"warn")}</div>
      <div class="hfp-row"><div><strong>GitHub OAuth credentials</strong><div class="hfp-muted">Required: <code>HF_GITHUB_CLIENT_ID</code> and <code>HF_GITHUB_CLIENT_SECRET</code></div></div>${chip(statusData.githubOAuthConfigured?"Configured":"Missing",statusData.githubOAuthConfigured?"good":"warn")}</div>
      <div class="hfp-row"><div><strong>GitHub token encryption key</strong><div class="hfp-muted">Required: <code>HF_GITHUB_TOKEN_ENCRYPTION_KEY</code> (32-byte base64 key; never place it in this page)</div></div>${chip(statusData.githubTokenEncryptionConfigured?"Configured":"Missing",statusData.githubTokenEncryptionConfigured?"good":"warn")}</div>
      <div class="hfp-row"><div><strong>ChatGPT MCP transport</strong><div class="hfp-muted">An authenticated remote MCP server/client transport still needs to be installed and connected in ChatGPT.</div></div>${chip(statusData.mcpTransport==="connected"?"Connected":"Not installed","warn")}</div>
      <p class="hfp-muted" style="margin-top:12px">The dashboard can securely manage approvals, but it cannot silently expand the permissions of the separate GitHub app already connected to ChatGPT. A one-time GitHub App/OAuth authorization is still required.</p>
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Permission catalogue</h2><p class="hfp-muted">Available permission types. The Bridge may request additional namespaced permissions even when they are not listed here.</p></div>${chip("Dynamic requests", "good")}</div>
      ${(statusData.catalog || []).map(item => '<div class="hfp-row"><div><strong>'+escapeHtml(item.key)+'</strong><div class="hfp-muted">'+escapeHtml(item.provider)+' · '+escapeHtml(item.description)+'</div></div>'+chip(item.risk, item.risk==="High risk"?"warn":"")+'</div>').join("")}
      <p class="hfp-muted" style="margin-top:10px">A newly approved permission is an authorization record only. It can execute only after a matching server-side connector handler is installed and tested. Unknown operations are never run as generic shell, SQL or unrestricted API access.</p>
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Pending approval requests</h2><p class="hfp-muted">Tick the review box first. Then use the second confirmation before approving or denying.</p></div>${chip(pending.length+" pending",pending.length?"warn":"")}</div>
      ${pending.length ? pending.map(r=>`
        <article class="hfp-request" data-request="${escapeHtml(r.id)}">
          <div class="hfp-request-top"><div><strong>${escapeHtml(r.permission_key)}</strong><div class="hfp-muted">${escapeHtml(r.requester)} · ${escapeHtml(r.source)} · ${when(r.created_at)}</div></div>${chip(r.risk_level+" risk",r.risk_level==="critical"||r.risk_level==="high"?"danger":"warn")}</div>
          <p><strong>Reason:</strong> ${escapeHtml(r.reason)}</p>
          <p><strong>Resource:</strong> <code>${escapeHtml(JSON.stringify(r.resource||{}))}</code></p>
          <p><strong>Requested duration:</strong> ${Math.round(Number(r.requested_duration_seconds||900)/60)} minutes · <strong>Request expires:</strong> ${when(r.expires_at)}</p>
          <div class="hfp-request-actions">
            <label class="hfp-check"><input type="checkbox" data-reviewed="${escapeHtml(r.id)}"> I have reviewed the action, resource and risk</label>
            <button class="hfp-btn primary" data-action="approve" data-id="${escapeHtml(r.id)}" disabled>Approve…</button>
            <button class="hfp-btn danger" data-action="deny" data-id="${escapeHtml(r.id)}" disabled>Deny…</button>
          </div>
        </article>`).join("") : '<div class="hfp-empty">No pending requests. You can create a clearly labelled test request below to verify the approval flow.</div>'}
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Test the approval workflow</h2><p class="hfp-muted">Creates a test request only. It does not read or change the selected server or GitHub resource.</p></div>${chip("Safe test", "good")}</div>
      <form id="hfpTestForm" class="hfp-form">
        <div class="hfp-field"><label for="hfpPermission">Permission to test</label><select id="hfpPermission" required>
          <option value="github.repo.read">GitHub repository read</option><option value="github.repo.write">GitHub repository write</option>
          <option value="supabase.project.read">Supabase project read</option><option value="supabase.database.read">Supabase database read</option>
          <option value="supabase.database.write">Supabase database write</option><option value="supabase.storage.read">Supabase Storage read</option>
          <option value="supabase.storage.upload">Supabase Storage upload</option><option value="filebase.storage.read">Filebase storage read</option>
          <option value="filebase.storage.upload">Filebase storage upload</option><option value="website.deploy">Website deploy</option>
        </select></div>
        <div class="hfp-field"><label for="hfpDuration">Requested duration</label><select id="hfpDuration"><option value="900">15 minutes</option><option value="3600">1 hour</option><option value="86400">24 hours</option></select></div>
        <div class="hfp-field full"><label for="hfpResource">Resource scope (JSON)</label><input id="hfpResource" value='{"repo":"faysaltalukder/halalfood"}' required></div>
        <div class="hfp-field full"><label for="hfpReason">Reason</label><textarea id="hfpReason" required minlength="12">Testing the permission approval flow only. No external action should be executed.</textarea></div>
        <div class="hfp-field full"><button class="hfp-btn primary" type="submit">Create test approval request</button></div>
      </form>
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Permission grants</h2><p class="hfp-muted">Approved grants are stored on the server and can be revoked here.</p></div>${chip(activeGrants.length+" active",activeGrants.length?"good":"")}</div>
      ${grants.length ? '<div class="hfp-tablewrap"><table class="hfp-table"><thead><tr><th>Permission</th><th>Scope</th><th>Mode</th><th>Expires</th><th>Usage</th><th>Status</th><th></th></tr></thead><tbody>'+grants.map(g=>`<tr><td><strong>${escapeHtml(g.permission_key)}</strong></td><td><code>${escapeHtml(JSON.stringify(g.resource||{}))}</code></td><td>${escapeHtml(g.grant_mode)}</td><td>${when(g.expires_at)}</td><td>${Number(g.uses_count)}/${Number(g.max_uses)}</td><td>${g.revoked_at?chip("Revoked","danger"):active(g)?chip("Active","good"):chip("Expired/used","warn")}</td><td>${active(g)?'<button class="hfp-btn danger" data-action="revoke" data-id="'+escapeHtml(g.id)+'">Revoke</button>':"—"}</td></tr>`).join("")+'</tbody></table></div>' : '<div class="hfp-empty">No grants have been created yet.</div>'}
    </section>
    <section class="hfp-card">
      <div class="hfp-head"><div><h2>Audit history</h2><p class="hfp-muted">Server-recorded requests, decisions, revocations and bridge authorization checks.</p></div>${chip(logs.length+" events")}</div>
      ${logs.length ? logs.slice(0,50).map(log=>'<div class="hfp-log"><strong>'+escapeHtml(log.event)+'</strong> · '+escapeHtml(log.permission_key||"")+' · '+when(log.created_at)+'<div class="hfp-muted">'+escapeHtml(log.actor_type)+' · '+escapeHtml(JSON.stringify(log.details||{}))+'</div></div>').join("") : '<div class="hfp-empty">No permission events have been recorded yet.</div>'}
    </section>
    <dialog id="hfpConfirm" class="hfp-dialog">
      <h2 id="hfpConfirmTitle">Confirm permission decision</h2>
      <p id="hfpConfirmDescription" class="hfp-muted">Review the request before confirming.</p>
      <div class="hfp-form" style="margin-top:12px">
        <div class="hfp-field"><label for="hfpGrantMode">Grant type</label><select id="hfpGrantMode"><option value="once">One action only</option><option value="temporary">Temporary access</option></select></div>
        <div class="hfp-field"><label for="hfpGrantDuration">Duration</label><select id="hfpGrantDuration"><option value="900">15 minutes</option><option value="3600">1 hour</option><option value="86400">24 hours</option><option value="604800">7 days</option></select></div>
      </div>
      <label class="hfp-check" style="margin:14px 0"><input id="hfpFinalCheck" type="checkbox"> I understand this creates a server-side permission grant for the exact scope shown.</label>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="hfp-btn" data-action="close-confirm">Cancel</button><button class="hfp-btn primary" id="hfpFinalButton" disabled>Confirm approval</button></div>
    </dialog>
  `;
}
async function refresh() {
  if (busy) return;
  busy = true;
  try {
    const status = await call("status");
    const records = await call("list");
    statusData = status;
    apiData = records;
    render();
  } catch (error) {
    root.innerHTML = '<div class="hfp-alert"><strong>Permission service could not be loaded</strong>'+escapeHtml(error.message)+'<p style="margin:8px 0 0">Check that the admin session is still valid and the Edge Function is deployed. Refresh after signing in again if needed.</p><button class="hfp-btn" data-action="refresh" style="margin-top:10px">Retry</button></div>';
  } finally { busy = false; }
}
function openDecision(id, decision) {
  const request = apiData.requests.find(r => r.id === id);
  if (!request) return;
  selectedRequest = id;
  selectedDecision = decision;
  const dialog = document.getElementById("hfpConfirm");
  document.getElementById("hfpConfirmTitle").textContent = decision === "approve" ? "Final approval required" : "Confirm request denial";
  document.getElementById("hfpConfirmDescription").textContent =
    request.permission_key+" — "+request.reason+" Resource: "+JSON.stringify(request.resource||{});
  document.getElementById("hfpFinalCheck").checked = false;
  document.getElementById("hfpFinalButton").disabled = true;
  document.getElementById("hfpFinalButton").textContent = decision === "approve" ? "Confirm approval" : "Confirm denial";
  dialog.showModal();
}
root.addEventListener("change", event => {
  if (event.target.matches("[data-reviewed]")) {
    const id = event.target.getAttribute("data-reviewed");
    root.querySelectorAll('[data-action="approve"][data-id="'+CSS.escape(id)+'"],[data-action="deny"][data-id="'+CSS.escape(id)+'"]').forEach(b => b.disabled = !event.target.checked);
  }
  if (event.target.id === "hfpFinalCheck") document.getElementById("hfpFinalButton").disabled = !event.target.checked;
  if (event.target.id === "hfpPermission") {
    const val = event.target.value;
    document.getElementById("hfpResource").value = val.startsWith("github.") ? '{"repo":"faysaltalukder/halalfood"}' :
      val.startsWith("filebase.") ? '{"bucket":"halalfood-assets-bd","prefix":"sites/halalfood/"}' :
      '{"project_id":"'+PROJECT_ID+'"}';
  }
});
root.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action, id = button.dataset.id;
  try {
    if (action === "refresh") { await refresh(); return; }
    if (action === "close-confirm") { document.getElementById("hfpConfirm").close(); return; }
    if (action === "approve" || action === "deny") { openDecision(id,action); return; }
    if (action === "revoke") {
      if (!confirm("Revoke this permission grant immediately?")) return;
      await call("revoke",{grant_id:id,final_confirm:true});
      notify("Permission grant revoked.");
      await refresh();
    }
  } catch(error) { notify(error.message,"error"); }
});
root.addEventListener("submit", async event => {
  if (event.target.id !== "hfpTestForm") return;
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    let resource;
    try { resource = JSON.parse(document.getElementById("hfpResource").value); } catch (_) { throw new Error("Resource scope must be valid JSON."); }
    if (!resource || typeof resource !== "object" || Array.isArray(resource) || !Object.keys(resource).length) throw new Error("Provide a non-empty resource scope object.");
    await call("create_test_request",{
      permission_key:document.getElementById("hfpPermission").value,
      duration_seconds:Number(document.getElementById("hfpDuration").value),
      resource,
      reason:document.getElementById("hfpReason").value
    });
    notify("Test request created. It is now waiting for your approval.");
    await refresh();
  } catch(error) { notify(error.message,"error"); }
  finally { if (button.isConnected) button.disabled = false; }
});
root.addEventListener("click", async event => {
  if (event.target.id !== "hfpFinalButton") return;
  const finalCheck = document.getElementById("hfpFinalCheck");
  if (!finalCheck.checked || !selectedRequest) return;
  const button = event.target;
  button.disabled = true;
  try {
    await call("decide",{
      request_id:selectedRequest,
      decision:selectedDecision,
      checkbox_confirmed:true,
      final_confirm:true,
      grant_mode:document.getElementById("hfpGrantMode").value,
      duration_seconds:Number(document.getElementById("hfpGrantDuration").value)
    });
    document.getElementById("hfpConfirm").close();
    notify(selectedDecision === "approve" ? "Approval saved. A scoped server-side grant has been created." : "Request denied.");
    selectedRequest = null;
    await refresh();
  } catch(error) { notify(error.message,"error"); button.disabled = false; }
});
(async () => {
  try {
    const ready = await window.HFAdminReady;
    if (!ready) return;
    await refresh();
  } catch(error) {
    root.innerHTML = '<div class="hfp-alert"><strong>Admin authentication is not ready</strong>'+escapeHtml(error.message)+'</div>';
  }
})();
})();
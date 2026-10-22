(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const WEBHOOK_URL = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/whatsapp-webhook";
let H = null;
let conversations = [];
let activeConversationId = null;
let serverReady = false;
let sending = false;
let refreshBusy = false;

function showStatus(message, type = "info") {
  const node = $("waCredentialsText");
  if (node) node.textContent = message;
  const badge = $("waCredentialsBadge");
  if (badge) {
    badge.textContent = type === "success" ? "Credentials present" : type === "error" ? "Check configuration" : "Setup required";
    badge.className = "wa-state-badge" + (type === "success" ? " success" : type === "error" ? " error" : "");
  }
}
async function invoke(action, payload = {}) {
  const { data, error } = await H.client.functions.invoke("whatsapp-send", { body: { action, ...payload } });
  if (error) {
    let message = error.message || "WhatsApp server request failed.";
    let details = null;
    try {
      if (error.context && typeof error.context.json === "function") {
        details = await error.context.json();
        if (details?.error) message = details.error;
      }
      if (details?.providerCode) message += " (Meta code: " + details.providerCode + (details?.providerSubcode ? "/" + details.providerSubcode : "") + ")";
      if (details?.providerType) message += " [" + details.providerType + "]";
      if (details?.httpStatus) message += " [HTTP " + details.httpStatus + "]";
      if (details?.step) message = details.step + ": " + message;
    } catch {}
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || "WhatsApp server request failed.");
  return data;
}
async function checkConfig() {
  try {
    const data = await invoke("status");
    const names = [
      ["WHATSAPP_ACCESS_TOKEN", "Access Token"],
      ["WHATSAPP_PHONE_NUMBER_ID", "Phone Number ID"],
      ["WHATSAPP_BUSINESS_ACCOUNT_ID", "Business Account ID"],
      ["WHATSAPP_APP_SECRET", "App Secret"],
      ["WHATSAPP_VERIFY_TOKEN", "Webhook Verify Token"],
    ];
    const list = $("waCredentialsList");
    if (list) list.innerHTML = names.map(([key, label]) =>
      '<li class="' + (data.configured?.[key] ? "ready" : "") + '">' + H.esc(label) + ": " + (data.configured?.[key] ? "available" : "missing") + "</li>"
    ).join("");
    serverReady = Boolean(data.allConfigured);
    $("waCredentialsTitle").textContent = serverReady ? "All five server-side secrets are available" : "Some server-side secrets are missing";
    showStatus(
      serverReady
        ? "Supabase confirms all five required secret names have values. Secret contents were not returned to the browser. The Meta webhook still needs to be configured below."
        : "One or more required WhatsApp secrets are not available to this function. Return to Supabase Edge Function Secrets and check the names; secret values are never displayed here.",
      serverReady ? "success" : "error"
    );
  } catch (err) {
    serverReady = false;
    showStatus("Could not check the WhatsApp function. Confirm the admin session, deployed function, and server configuration, then refresh.", "error");
    if ($("waCredentialsTitle")) $("waCredentialsTitle").textContent = "Server status could not be checked";
  }
  updateComposerState();
}
function initials(name) {
  const parts = String(name || "W").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) || "W").toUpperCase();
}
function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-BD", { day: "numeric", month: "short" });
}
function selectedConversation() {
  return conversations.find((item) => item.id === activeConversationId) || null;
}
function renderConversations() {
  const list = $("waConversationList");
  if (!list) return;
  const q = String($("waConversationSearch")?.value || "").toLowerCase().trim();
  const rows = conversations.filter((c) => {
    const name = c.contact?.display_name || "";
    const phone = c.contact?.phone_number || c.contact?.external_contact_id || "";
    const preview = c.last_message_preview || "";
    return !q || (name + " " + phone + " " + preview).toLowerCase().includes(q);
  });
  $("waConversationCount").textContent = conversations.length + " conversation" + (conversations.length === 1 ? "" : "s");
  if (!rows.length) {
    list.innerHTML = '<div class="wa-empty-list">' + (conversations.length ? "No conversations match your search." : "No WhatsApp messages yet. Complete Meta webhook setup, then send a message to the WhatsApp number.") + "</div>";
    return;
  }
  list.innerHTML = rows.map((c) => {
    const name = c.contact?.display_name || c.contact?.phone_number || "WhatsApp contact";
    const phone = c.contact?.phone_number || c.contact?.external_contact_id || "";
    return '<button type="button" class="wa-conversation-item ' + (c.id === activeConversationId ? "active" : "") + '" data-conversation-id="' + H.esc(c.id) + '" aria-current="' + (c.id === activeConversationId ? "true" : "false") + '">' +
      '<span class="wa-avatar-small">' + H.esc(initials(name)) + "</span>" +
      '<span class="wa-conversation-main"><span class="wa-conversation-top"><span class="wa-conversation-name">' + H.esc(name) + '</span><span class="wa-conversation-time">' + H.esc(formatTime(c.last_message_at)) + "</span></span>" +
      '<span class="wa-conversation-preview">' + H.esc(c.last_message_preview || phone || "No message preview") + "</span>" +
      (Number(c.unread_count) > 0 ? '<span class="wa-unread-count">' + H.esc(c.unread_count) + " new</span>" : "") + "</span></button>";
  }).join("");
  list.querySelectorAll("[data-conversation-id]").forEach((node) => node.addEventListener("click", () => openConversation(node.dataset.conversationId)));
}
async function loadConversations(keepSelection = true) {
  if (!H || refreshBusy) return;
  refreshBusy = true;
  try {
    const { data, error } = await H.client.from("messaging_conversations")
      .select("id,channel,status,unread_count,last_message_at,last_message_preview,last_message_direction,last_inbound_at,contact:messaging_contacts(id,display_name,phone_number,external_contact_id)")
      .eq("channel", "whatsapp").order("last_message_at", { ascending: false, nullsFirst: false }).limit(250);
    if (error) throw error;
    conversations = data || [];
    if (!keepSelection || !conversations.some((c) => c.id === activeConversationId)) activeConversationId = conversations[0]?.id || null;
    renderConversations();
    if (activeConversationId) {
      const active = selectedConversation();
      if (active) renderSelectedHeader(active);
    } else {
      $("waChatView").hidden = true;
      $("waChatEmpty").hidden = false;
    }
  } catch (err) {
    $("waConversationList").innerHTML = '<div class="wa-empty-list wa-connection-error">Could not load the inbox. Confirm the messaging tables are exposed to the Data API and your verified admin session has access.</div>';
    $("waConversationCount").textContent = "Inbox unavailable";
    H.toast("Could not load WhatsApp conversations. Check database access and RLS.", "error");
  } finally {
    refreshBusy = false;
  }
}
function renderSelectedHeader(conversation) {
  const contact = conversation?.contact || {};
  const name = contact.display_name || contact.phone_number || "WhatsApp contact";
  $("waContactName").textContent = name;
  $("waContactPhone").textContent = contact.phone_number || contact.external_contact_id || "";
  $("waContactAvatar").textContent = initials(name);
  $("waChatEmpty").hidden = true;
  $("waChatView").hidden = false;
  updateComposerState(conversation);
}
async function openConversation(id) {
  activeConversationId = id;
  renderConversations();
  let selected = selectedConversation();
  if (!selected) {
    await loadConversations(false);
    selected = selectedConversation();
  }
  if (!selected) return;
  renderSelectedHeader(selected);
  const mark = await H.client.from("messaging_conversations").update({ unread_count: 0, updated_at: new Date().toISOString() }).eq("id", id);
  if (!mark.error) {
    selected.unread_count = 0;
    renderConversations();
  }
  await loadMessages(id);
}
function updateComposerState(conversation = selectedConversation()) {
  const lastInbound = conversation?.last_inbound_at ? Date.parse(conversation.last_inbound_at) : NaN;
  const elapsed = Date.now() - lastInbound;
  const windowOpen = Number.isFinite(lastInbound) && elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
  const canSend = Boolean(conversation && serverReady && windowOpen && !sending);
  const badge = $("waReplyWindowBadge");
  if (badge) {
    badge.textContent = !conversation ? "No conversation selected" : windowOpen ? "24-hour reply window open" : "24-hour window closed";
    badge.className = "wa-window-badge" + (windowOpen ? " open" : "");
  }
  const text = $("waMessageText");
  const button = $("waSendBtn");
  if (text) text.disabled = !canSend;
  if (button) button.disabled = !canSend || !String(text?.value || "").trim();
  const hint = $("waReplyPolicyHint");
  if (hint) {
    if (!conversation) hint.textContent = "Select a WhatsApp conversation to reply.";
    else if (!serverReady) hint.textContent = "Reply is disabled until the server confirms all required secrets are available.";
    else if (!windowOpen) hint.textContent = "The 24-hour customer-service window is closed. This release supports text replies only; use an approved template in a later release.";
    else hint.textContent = "Text reply only. WhatsApp's messaging rules and customer consent still apply.";
  }
}
async function loadMessages(conversationId = activeConversationId) {
  if (!conversationId || !H) return;
  const area = $("waMessages");
  try {
    const { data, error } = await H.client.from("messaging_messages")
      .select("id,direction,message_type,body,status,created_at,provider_timestamp,error_code,error_title,media_id")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(500);
    if (error) throw error;
    if (activeConversationId !== conversationId) return;
    if (!data?.length) {
      area.innerHTML = '<div class="wa-empty-list">No saved messages in this conversation yet.</div>';
      return;
    }
    area.innerHTML = data.map((m) => {
      const outbound = m.direction === "outbound";
      const stamp = m.provider_timestamp || m.created_at;
      const mediaHint = m.media_id ? " Media attachment detected; preview/download is not included in this release." : "";
      return '<div class="wa-message-row ' + (outbound ? "outbound" : "inbound") + '">' +
        '<div class="wa-message-bubble">' + H.esc((m.body || ("[" + m.message_type + " message]")) + mediaHint) + "</div>" +
        '<div class="wa-message-meta"><time>' + H.esc(H.dateTime(stamp)) + "</time>" +
        (outbound ? '<span class="wa-message-status">' + H.esc(m.status) + "</span>" : "") + "</div>" +
        (m.status === "failed" ? '<div class="wa-message-error">' + H.esc(m.error_title || ("Delivery failed" + (m.error_code ? " (" + m.error_code + ")" : ""))) + "</div>" : "") +
        "</div>";
    }).join("");
    area.scrollTop = area.scrollHeight;
  } catch (err) {
    area.innerHTML = '<div class="wa-empty-list wa-connection-error">Could not load messages. Check the table permissions and refresh.</div>';
  }
}
async function sendReply(event) {
  event.preventDefault();
  if (sending) return;
  const conversation = selectedConversation();
  const text = String($("waMessageText").value || "").trim();
  if (!conversation || !text) return;
  sending = true;
  updateComposerState(conversation);
  $("waSendBtn").textContent = "Sending…";
  try {
    const data = await invoke("send", { conversationId: conversation.id, text });
    $("waMessageText").value = "";
    H.toast(data.warning || "WhatsApp accepted the reply. Delivery status will update from Meta.", data.warning ? "error" : "success");
    await loadMessages(conversation.id);
    await loadConversations(true);
    if (data.providerMessageId) $("waMessageText").dataset.lastProviderMessageId = data.providerMessageId;
  } catch (err) {
    const message = err?.message || "WhatsApp reply failed.";
    H.toast(message, "error");
  } finally {
    sending = false;
    $("waSendBtn").textContent = "Send reply";
    updateComposerState(selectedConversation());
  }
}
async function refreshAll() {
  await checkConfig();
  await loadConversations(true);
  if (activeConversationId) await loadMessages(activeConversationId);
}
function subscribeToLiveInbox() {
  if (!H?.client) return null;
  const channel = H.client.channel("hf-whatsapp-inbox")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "messaging_conversations",
      filter: "channel=eq.whatsapp"
    }, (payload) => {
      const row = payload.new || payload.old || {};
      if (row.channel !== "whatsapp") return;
      void loadConversations(true);
      if (activeConversationId) void loadMessages(activeConversationId);
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "messaging_messages",
      filter: "channel=eq.whatsapp"
    }, (payload) => {
      const row = payload.new || payload.old || {};
      if (row.channel !== "whatsapp") return;
      void loadConversations(true);
      if (row.conversation_id && row.conversation_id === activeConversationId) {
        void loadMessages(activeConversationId);
      }
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("WhatsApp realtime unavailable; periodic inbox refresh remains enabled.");
      }
    });
  window.addEventListener("beforeunload", () => {
    try { H.client.removeChannel(channel); } catch {}
  }, { once: true });
  return channel;
}
async function connectWhatsAppAccount() {
  const button = $("waConnectBtn");
  const result = $("waConnectionDiagnostic");
  if (!button || button.disabled) return;
  if (result) { result.hidden = false; result.className = "wa-diagnostic-result"; result.textContent = "Checking the saved Phone Number ID against the Business Account, then requesting the WABA webhook subscription from Meta. No message will be sent."; }
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Checking connection…";
  try {
    const data = await invoke("connect");
    if (result) {
      result.hidden = false;
      result.className = "wa-diagnostic-result";
      const phone = data.displayPhoneNumber ? "Phone: " + H.esc(data.displayPhoneNumber) : "Phone Number ID verified";
      const name = data.verifiedName ? " · " + H.esc(data.verifiedName) : "";
      result.innerHTML = "<strong>WABA subscription confirmed by Meta</strong><p>" + phone + name + "</p><p>Phone Number ID matches the Business Account. The server requested the WABA subscription successfully.</p><p><b>Next:</b> In Meta App Dashboard, ensure the WhatsApp webhook field <code>messages</code> is subscribed. Also ensure the app's mode and test recipient setup allow this test. This tool cannot verify that app-level field toggle.</p>";
    }
    H.toast("Business Account subscription succeeded. Confirm the messages webhook field in Meta, then send a new test message.", "success");
    await refreshAll();
  } catch (err) {
    if (result) {
      result.hidden = false;
      result.className = "wa-diagnostic-result error";
      const message = err?.message || "Could not connect to the Business Account.";
      result.innerHTML = "<strong>Connection check failed</strong><p>" + H.esc(message) + "</p><p>Possible causes: incorrect Business Account ID or Phone Number ID, expired token, missing whatsapp_business_management permission, or the token user does not have access to this WABA.</p>";
    }
    H.toast(err?.message || "WhatsApp connection check failed.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}
function copyWebhook() {
  const text = WEBHOOK_URL;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => H.toast("Webhook callback URL copied."), () => H.toast("Copy failed; select and copy the URL manually.", "error"));
  } else {
    $("waWebhookUrl").focus();
    $("waWebhookUrl").select();
    H.toast("Select and copy the callback URL.");
  }
}
window.HFAdminReady?.then(async (ready) => {
  if (!ready) return;
  H = ready;
  $("waCopyWebhookBtn")?.addEventListener("click", copyWebhook);
  $("waRefreshBtn")?.addEventListener("click", refreshAll);
  $("waConnectBtn")?.addEventListener("click", connectWhatsAppAccount);
  $("waConversationSearch")?.addEventListener("input", renderConversations);
  $("waMessageText")?.addEventListener("input", () => updateComposerState(selectedConversation()));
  $("waComposer")?.addEventListener("submit", sendReply);
  await refreshAll();
  subscribeToLiveInbox();
  window.setInterval(async () => {
    if (document.visibilityState === "visible") {
      await loadConversations(true);
      if (activeConversationId) await loadMessages(activeConversationId);
    }
  }, 30000);
});
})();
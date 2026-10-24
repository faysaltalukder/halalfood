(() => {
"use strict";
const FUNCTION_NAME = "facebook-publishing";
const FUNCTION_ORIGIN = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const MEDIA_BUCKET = "hf-facebook-media";
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const REQUIRED_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
const $ = (id) => document.getElementById(id);
let H = null;
let statusData = null;
let selectedPage = null;
let oauthPopup = null;
let busy = false;
let mediaPreviewUrl = null;

async function invoke(action, payload = {}) {
  const { data, error } = await H.client.functions.invoke(FUNCTION_NAME, { body: { action, ...payload } });
  if (error) {
    let message = error.message || "Facebook publishing request failed.";
    try {
      if (error.context && typeof error.context.json === "function") {
        const details = await error.context.json();
        if (details?.error) message = details.error;
        if (Array.isArray(details?.missing) && details.missing.length) message += " Missing server secrets: " + details.missing.join(", ") + ".";
        if (details?.providerCode) message += " (Meta code " + details.providerCode + (details.providerSubcode ? "/" + details.providerSubcode : "") + ")";
      }
    } catch {}
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || "Facebook publishing request failed.");
  return data;
}
function showResult(message, isError = false, link = "") {
  const node = $("fbPublishResult");
  if (!node) return;
  node.hidden = false;
  node.classList.toggle("error", isError);
  node.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = isError ? "The request needs attention" : "Facebook response";
  const p = document.createElement("p");
  p.textContent = message;
  node.append(strong, p);
  if (link && /^https:\/\/(?:www\.)?facebook\.com\//i.test(link)) {
    const a = document.createElement("a");
    a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = "Open Facebook result";
    node.append(a);
  }
}
function setInlineStatus(message, isError = false) {
  const node = $("fbOauthHint");
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "var(--hf-red)" : "";
}
function renderConfig(data) {
  const config = data?.config || {};
  const rows = [
    ["FACEBOOK_APP_ID", "Meta App ID", config.appIdReady],
    ["FACEBOOK_APP_SECRET", "Meta App Secret", config.appSecretReady],
    ["FACEBOOK_TOKEN_ENCRYPTION_KEY", "Token encryption key", config.encryptionKeyReady],
  ];
  $("fbConfigList").innerHTML = rows.map(([key, label, ready]) =>
    '<li class="' + (ready ? "ready" : "") + '">' + H.esc(label) + ": " + (ready ? "configured on server" : "not configured") + "</li>"
  ).join("");
  $("fbRedirectUri").value = data?.redirectUri || config.redirectUri || "";
  const badge = $("fbServerBadge");
  badge.textContent = data?.setupReady ? "Server ready for connection" : "Server setup incomplete";
  badge.className = "hf-status " + (data?.setupReady ? "hf-status-active" : "hf-status-pending");
  $("fbConnectBtn").disabled = !data?.setupReady || busy;
  if (data?.setupReady) {
    setInlineStatus("Server credentials are present. Connect Facebook to approve Page permissions.");
  } else {
    const missing = Array.isArray(data?.missingConfig) ? data.missingConfig : rows.filter((r) => !r[2]).map((r) => r[0]);
    setInlineStatus("Add the missing secret(s) in Supabase Edge Function Secrets, then refresh: " + missing.join(", ") + ".", true);
  }
}
function renderPages(data) {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  selectedPage = data?.selectedPage || pages.find((p) => p.isSelected) || null;
  const select = $("fbPageSelect");
  select.innerHTML = "";
  const choose = document.createElement("option");
  choose.value = "";
  choose.textContent = pages.length ? "Choose a Facebook Page…" : "No Pages found — connect Facebook";
  select.append(choose);
  for (const page of pages) {
    const option = document.createElement("option");
    option.value = page.pageId;
    option.textContent = page.pageName + (page.canPublish ? "" : " — permissions needed");
    option.disabled = !page.canPublish;
    option.selected = Boolean(page.isSelected);
    select.append(option);
  }
  select.disabled = pages.length === 0 || busy;
  $("fbSelectPageBtn").disabled = !select.value || !pages.some((p) => p.pageId === select.value && p.canPublish) || busy;
  $("fbVerifyPageBtn").disabled = !selectedPage || !selectedPage.canPublish || busy;
  $("fbDisconnectBtn").disabled = !selectedPage || busy;
  const composerReady = Boolean(selectedPage?.canPublish && data?.setupReady);
  $("fbComposerBadge").textContent = selectedPage ? (selectedPage.canPublish ? "Page selected" : "Permission needed") : "Connect a Page first";
  $("fbComposerBadge").className = "hf-status " + (selectedPage?.canPublish ? "hf-status-active" : "hf-status-pending");
  $("fbPublishNowBtn").disabled = !composerReady || busy;
  $("fbScheduleBtn").disabled = !composerReady || busy;

  if (selectedPage) {
    const taskList = Array.isArray(selectedPage.tasks) ? selectedPage.tasks : [];
    const scopeList = Array.isArray(selectedPage.grantedScopes) ? selectedPage.grantedScopes : [];
    $("fbSelectedPage").innerHTML = '<strong>' + H.esc(selectedPage.pageName) + '</strong><span>Page ID: ' + H.esc(selectedPage.pageId) + '</span><br><span>Page tasks: ' + H.esc(taskList.join(", ") || "Not returned") + '</span><br><span>Last verified: ' + H.esc(selectedPage.lastVerifiedAt ? H.dateTime(selectedPage.lastVerifiedAt) : "Not checked yet") + '</span>';
    $("fbPermissionChecks").innerHTML = REQUIRED_SCOPES.map((scope) => {
      const granted = scopeList.includes(scope);
      return '<div class="fb-permission-line ' + (granted ? "" : "missing") + '"><span class="fb-check-icon">' + (granted ? "✓" : "!") + '</span><span><strong>' + H.esc(scope) + '</strong> — ' + (granted ? "granted" : "not confirmed; reconnect and approve this permission") + "</span></div>";
    }).join("") + '<div class="fb-permission-line ' + (selectedPage.canPublish ? "" : "missing") + '"><span class="fb-check-icon">' + (selectedPage.canPublish ? "✓" : "!") + '</span><span><strong>Page task</strong> — ' + (selectedPage.canPublish ? "publishing task confirmed" : "CREATE_CONTENT or MANAGE task and all required scopes are needed") + "</span></div>";
    if (selectedPage.canPublish) setInlineStatus("Connected Page: " + selectedPage.pageName + ". You can prepare a post below.");
    else setInlineStatus("The selected Page does not currently show all publishing permissions. See the checks below.", true);
  } else {
    $("fbSelectedPage").textContent = "No Page selected yet.";
    $("fbPermissionChecks").innerHTML = "";
    if (pages.length) setInlineStatus("Choose a Page with the required content-creation task and permission scopes.");
  }
  updatePostFields();
}
async function refreshStatus() {
  $("fbRefreshBtn").disabled = true;
  try {
    statusData = await invoke("status");
    renderConfig(statusData);
    renderPages(statusData);
  } catch (err) {
    H.toast(err.message || "Could not read Facebook publishing status.", "error");
    setInlineStatus(err.message || "Status check failed.", true);
    $("fbServerBadge").textContent = "Status unavailable";
    $("fbServerBadge").className = "hf-status hf-status-cancelled";
  } finally {
    $("fbRefreshBtn").disabled = false;
  }
}
function updatePostFields() {
  const type = $("fbPostType").value;
  $("fbLinkField").hidden = type !== "link";
  $("fbMediaField").hidden = type !== "photo" && type !== "video";
  $("fbPostLink").required = type === "link";
  $("fbMediaFile").required = type === "photo" || type === "video";
  $("fbMediaFile").accept = type === "video" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif";
  const composerReady = Boolean(selectedPage?.canPublish && statusData?.setupReady && !busy);
  $("fbPublishNowBtn").disabled = !composerReady;
  $("fbScheduleBtn").disabled = !composerReady;
}
function clearPreview() {
  if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
  mediaPreviewUrl = null;
  $("fbMediaPreview").hidden = true;
  $("fbMediaPreview").replaceChildren();
}
function previewSelectedFile() {
  clearPreview();
  const file = $("fbMediaFile").files?.[0];
  if (!file) return;
  const type = $("fbPostType").value;
  const allowed = type === "video" ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    H.toast("This file type does not match the selected post format.", "error");
    $("fbMediaFile").value = "";
    return;
  }
  if (file.size > MAX_MEDIA_BYTES) {
    H.toast("Choose a file smaller than or equal to 50 MB.", "error");
    $("fbMediaFile").value = "";
    return;
  }
  mediaPreviewUrl = URL.createObjectURL(file);
  const media = document.createElement(type === "video" ? "video" : "img");
  media.src = mediaPreviewUrl;
  if (type === "video") { media.controls = true; media.preload = "metadata"; }
  media.alt = file.name;
  const caption = document.createElement("p");
  caption.textContent = file.name + " · " + (file.size / (1024 * 1024)).toFixed(2) + " MB";
  $("fbMediaPreview").append(media, caption);
  $("fbMediaPreview").hidden = false;
}
function safeFileName(name) {
  return String(name || "media").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "").slice(-100) || "media";
}
function minimumScheduleValue() {
  const date = new Date(Date.now() + 12 * 60 * 1000);
  date.setSeconds(0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  $("fbScheduleAt").min = local.toISOString().slice(0, 16);
  const maxDate = new Date(Date.now() + 74 * 24 * 60 * 60 * 1000);
  const maxLocal = new Date(maxDate.getTime() - maxDate.getTimezoneOffset() * 60000);
  $("fbScheduleAt").max = maxLocal.toISOString().slice(0, 16);
}
async function choosePage() {
  const pageId = $("fbPageSelect").value;
  if (!pageId) { H.toast("Choose a Facebook Page first.", "error"); return; }
  $("fbSelectPageBtn").disabled = true;
  try {
    const result = await invoke("select_page", { pageId });
    H.toast("Selected Facebook Page: " + result.selectedPage.pageName);
    await refreshStatus();
  } catch (err) { H.toast(err.message || "Could not select this Page.", "error"); }
  finally { $("fbSelectPageBtn").disabled = false; }
}
async function verifyPage() {
  $("fbVerifyPageBtn").disabled = true;
  try {
    const result = await invoke("verify_page");
    H.toast("Meta verified the connection to " + result.pageName + ".");
    await refreshStatus();
  } catch (err) { H.toast(err.message || "Page verification failed.", "error"); }
  finally { $("fbVerifyPageBtn").disabled = false; }
}
async function disconnectPage() {
  if (!selectedPage || !confirm("Remove the saved Page token for " + selectedPage.pageName + "? You can reconnect later.")) return;
  $("fbDisconnectBtn").disabled = true;
  try {
    await invoke("disconnect");
    H.toast("Selected Page connection removed.");
    await refreshStatus();
  } catch (err) { H.toast(err.message || "Could not disconnect the Page.", "error"); }
  finally { $("fbDisconnectBtn").disabled = false; }
}
async function connectFacebook() {
  const popup = window.open("about:blank", "hfFacebookOAuth", "popup=yes,width=720,height=780,left=120,top=60");
  if (!popup) {
    H.toast("Your browser blocked the sign-in popup. Allow popups for this site and try again.", "error");
    return;
  }
  oauthPopup = popup;
  $("fbConnectBtn").disabled = true;
  try {
    const data = await invoke("connect");
    popup.location.href = data.authUrl;
    setInlineStatus("Finish the Meta permission screen in the popup. This request expires after 10 minutes.");
  } catch (err) {
    try { popup.close(); } catch {}
    H.toast(err.message || "Could not start Facebook authorization.", "error");
    setInlineStatus(err.message || "Connection could not be started.", true);
  } finally {
    $("fbConnectBtn").disabled = !(statusData?.setupReady) || busy;
  }
}
async function publishPost(schedule) {
  if (busy) return;
  const type = $("fbPostType").value;
  const message = $("fbPostMessage").value.trim();
  const link = $("fbPostLink").value.trim();
  const file = $("fbMediaFile").files?.[0] || null;
  let scheduledAt = "";
  if (schedule) {
    if (!$("fbScheduleAt").value) {
      H.toast("Choose a date and time to schedule the post.", "error");
      $("fbScheduleAt").focus();
      return;
    }
    const date = new Date($("fbScheduleAt").value);
    if (Number.isNaN(date.getTime())) { H.toast("Choose a valid schedule date and time.", "error"); return; }
    scheduledAt = date.toISOString();
  }
  if (!message && !(type === "link" && link) && !file) {
    H.toast("Write a caption or select the content to publish.", "error");
    $("fbPostMessage").focus();
    return;
  }
  if (type === "link" && !/^https?:\/\/\S+$/i.test(link)) {
    H.toast("Enter a valid public website link.", "error");
    $("fbPostLink").focus();
    return;
  }
  if ((type === "photo" || type === "video") && !file) {
    H.toast("Choose a media file first.", "error");
    $("fbMediaFile").focus();
    return;
  }
  if (file && file.size > MAX_MEDIA_BYTES) { H.toast("Choose a media file no larger than 50 MB.", "error"); return; }
  const title = schedule ? "Schedule this post on " + selectedPage.pageName + "?" : "Publish this post to " + selectedPage.pageName + " now?";
  if (!confirm(title + "\n\nReview your caption, media and destination before continuing.")) return;
  busy = true;
  $("fbPublishNowBtn").disabled = true; $("fbScheduleBtn").disabled = true;
  $("fbPublishNowBtn").textContent = "Working…"; $("fbScheduleBtn").textContent = "Working…";
  showResult(file ? "Uploading media securely, then sending the publishing request to Meta…" : "Sending the publishing request to Meta…");
  let mediaPath = "";
  try {
    if (file) {
      const storagePath = "posts/" + crypto.randomUUID() + "-" + safeFileName(file.name);
      const { error: uploadError } = await H.client.storage.from(MEDIA_BUCKET).upload(storagePath, file, {
        contentType: file.type, cacheControl: "3600", upsert: false,
      });
      if (uploadError) throw new Error("Secure media upload failed: " + (uploadError.message || "check Supabase Storage access and upload size."));
      mediaPath = storagePath;
    }
    const result = await invoke("publish", {
      postType: type, message, link, mediaPath, scheduledAt,
    });
    const dateText = result.scheduledAt ? " Scheduled for " + H.dateTime(result.scheduledAt) + "." : " Meta accepted the publish request.";
    const idText = result.facebookPostId ? " Facebook ID: " + result.facebookPostId + "." : "";
    const warningText = result.warning ? " Warning: " + result.warning : "";
    showResult((result.status === "scheduled" ? "Post scheduled successfully." : "Post request accepted.") + dateText + idText + warningText, false, result.permalinkUrl || "");
    H.toast(result.status === "scheduled" ? "Facebook accepted the scheduled post." : "Facebook accepted the publishing request.");
    if (result.warning) H.toast(result.warning, "error");
    $("fbComposerForm").reset();
    clearPreview();
    updatePostFields();
    minimumScheduleValue();
    await Promise.all([refreshStatus(), refreshHistory()]);
  } catch (err) {
    showResult(err.message || "Facebook publishing failed. Check the error and retry only after checking whether Meta already created the post.", true);
    H.toast(err.message || "Facebook publishing failed.", "error");
    await refreshHistory();
  } finally {
    busy = false;
    $("fbPublishNowBtn").textContent = "Publish now";
    $("fbScheduleBtn").textContent = "Schedule post";
    renderPages(statusData || {});
    updatePostFields();
  }
}
async function refreshHistory() {
  $("fbHistoryRefreshBtn").disabled = true;
  try {
    const result = await invoke("history");
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const body = $("fbHistoryBody");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="fb-history-empty">No Facebook publishing requests yet.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((row) => {
      const content = String(row.message || "").trim();
      const truncated = content.length > 150 ? content.slice(0, 150) + "…" : content;
      const timestamp = row.scheduled_at || row.created_at;
      const resultCell = row.permalink_url && /^https:\/\/(?:www\.)?facebook\.com\//i.test(row.permalink_url)
        ? '<a class="fb-mini-link" target="_blank" rel="noopener noreferrer" href="' + H.esc(row.permalink_url) + '">Open post ↗</a><div class="fb-history-id">' + H.esc(row.facebook_post_id || "") + "</div>"
        : '<div class="fb-history-id">' + H.esc(row.facebook_post_id || "—") + "</div>";
      const err = row.error_message ? '<small class="fb-history-error">' + H.esc(row.error_message) + (row.error_code ? " · code " + H.esc(row.error_code) : "") + "</small>" : "";
      return "<tr><td>" + H.esc(timestamp ? H.dateTime(timestamp) : "—") + "</td><td><strong>" + H.esc(String(row.post_type || "").toUpperCase()) + "</strong><div class=\"fb-history-message\">" + H.esc(truncated || "—") + "</div>" + err + "</td><td>" + H.makeStatus(row.status) + "</td><td><span class=\"fb-history-page\">" + H.esc(row.page_name || "—") + "</span></td><td>" + resultCell + "</td></tr>";
    }).join("");
  } catch (err) {
    $("fbHistoryBody").innerHTML = '<tr><td colspan="5" class="fb-history-empty">Could not load history. ' + H.esc(err.message || "") + "</td></tr>";
  } finally { $("fbHistoryRefreshBtn").disabled = false; }
}
function bindEvents() {
  $("fbRefreshBtn").addEventListener("click", refreshStatus);
  $("fbHistoryRefreshBtn").addEventListener("click", refreshHistory);
  $("fbConnectBtn").addEventListener("click", connectFacebook);
  $("fbSelectPageBtn").addEventListener("click", choosePage);
  $("fbVerifyPageBtn").addEventListener("click", verifyPage);
  $("fbDisconnectBtn").addEventListener("click", disconnectPage);
  $("fbPageSelect").addEventListener("change", () => {
    const page = (statusData?.pages || []).find((p) => p.pageId === $("fbPageSelect").value);
    $("fbSelectPageBtn").disabled = !page?.canPublish || busy;
  });
  $("fbPostType").addEventListener("change", () => {
    updatePostFields();
    if ($("fbMediaFile").files?.length) previewSelectedFile();
    if ($("fbPostType").value !== "link") $("fbPostLink").value = "";
  });
  $("fbMediaFile").addEventListener("change", previewSelectedFile);
  $("fbPostMessage").addEventListener("input", () => { $("fbCharCount").textContent = String($("fbPostMessage").value.length); });
  $("fbPublishNowBtn").addEventListener("click", () => publishPost(false));
  $("fbScheduleBtn").addEventListener("click", () => publishPost(true));
  $("fbClearBtn").addEventListener("click", () => setTimeout(() => {
    $("fbCharCount").textContent = "0"; clearPreview(); updatePostFields(); $("fbPublishResult").hidden = true;
  }, 0));
  $("fbCopyRedirectBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("fbRedirectUri").value); H.toast("OAuth redirect URI copied."); }
    catch { $("fbRedirectUri").select(); document.execCommand("copy"); H.toast("OAuth redirect URI selected; copy it if the browser blocks clipboard access."); }
  });
  window.addEventListener("message", async (event) => {
    if (event.origin !== FUNCTION_ORIGIN || event.source !== oauthPopup || event.data?.type !== "hf-facebook-oauth-complete") return;
    oauthPopup = null;
    if (event.data.success) {
      H.toast("Facebook authorization completed. Select the Page to publish to.");
      await refreshStatus();
    } else {
      H.toast("Facebook connection was not completed. Review the callback message and try again.", "error");
      await refreshStatus();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && H) refreshStatus();
  });
}
window.HFAdminReady.then(async (admin) => {
  if (!admin) return;
  H = admin;
  bindEvents();
  minimumScheduleValue();
  updatePostFields();
  await Promise.all([refreshStatus(), refreshHistory()]);
});
})();
(() => {
"use strict";
const FUNCTION_NAME = "youtube-publishing";
const FUNCTION_ORIGIN = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const REQUIRED_SCOPES = ["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly"];
const MAX_FILE_BYTES = 256 * 1024 ** 3;
const MAX_DESCRIPTION_BYTES = 5000;
const SHORTS_MAX_SECONDS = 180;
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const $ = id => document.getElementById(id);
let H = null, statusData = null, selectedChannel = null, oauthPopup = null, busy = false, previewUrl = null, mediaInfo = null;

async function invoke(action, payload = {}) {
  const { data, error } = await H.client.functions.invoke(FUNCTION_NAME, { body: { action, ...payload } });
  if (error) {
    let message = error.message || "YouTube publishing request failed.";
    try {
      if (error.context && typeof error.context.json === "function") {
        const details = await error.context.json();
        if (details?.error) message = details.error;
        if (Array.isArray(details?.missing) && details.missing.length) message += " Missing server configuration: " + details.missing.join(", ") + ".";
        if (details?.providerCode) message += " (Google/YouTube code " + details.providerCode + ")";
      }
    } catch {}
    throw new Error(message);
  }
  if (!data?.success) {
    let message = data?.error || "YouTube publishing request failed.";
    if (Array.isArray(data?.missing) && data.missing.length) message += " Missing server configuration: " + data.missing.join(", ") + ".";
    if (data?.providerCode) message += " (Google/YouTube code " + data.providerCode + ")";
    throw new Error(message);
  }
  return data;
}
function inlineStatus(message, isError = false) {
  $("ytOauthHint").textContent = message;
  $("ytOauthHint").style.color = isError ? "var(--hf-red)" : "";
}
function utf8Bytes(value) { return new TextEncoder().encode(String(value || "")).length; }
function selectedUploadMode() {
  return document.querySelector('input[name="ytUploadMode"]:checked')?.value === "video" ? "video" : "shorts";
}
function updateUploadButton() {
  if (!$("ytUploadBtn")) return;
  const file = $("ytVideoFile")?.files?.[0];
  const ready = Boolean(selectedChannel && statusData?.setupReady &&
    REQUIRED_SCOPES.every(scope => (selectedChannel.grantedScopes || []).includes(scope)));
  $("ytUploadBtn").disabled = !ready || busy || !file || !$("ytTermsAccepted")?.checked;
}
function modeValidationError() {
  if (selectedUploadMode() !== "shorts") return "";
  if (!mediaInfo || !Number.isFinite(mediaInfo.duration) || !mediaInfo.width || !mediaInfo.height)
    return "Wait for the browser to read the video's dimensions and duration, then try again.";
  if (mediaInfo.duration > SHORTS_MAX_SECONDS + 0.05)
    return "This file is longer than 3 minutes. Choose Regular video or trim it to 3:00 or less for Shorts.";
  if (mediaInfo.height < mediaInfo.width)
    return "Shorts needs a square or vertical video. This file is landscape; choose Regular video or use a square/vertical export.";
  return "";
}
function updateModeHint() {
  const mode = selectedUploadMode();
  const hint = $("ytModeHint");
  if (!hint) return;
  let message = mode === "shorts"
    ? "Shorts mode: square/vertical video, no longer than 3 minutes. YouTube classifies eligible uploads automatically; both modes use the same YouTube upload API."
    : "Regular video mode: select the format you intend to publish. A square/vertical video up to 3 minutes may still be classified by YouTube as a Short regardless of this selector.";
  if (mediaInfo) {
    const duration = Math.round(mediaInfo.duration * 10) / 10;
    const mins = Math.floor(duration / 60), secs = (duration % 60).toFixed(1).padStart(4,"0");
    message += " File: " + mediaInfo.width + "×" + mediaInfo.height + ", " + mins + ":" + secs + ".";
    const issue = modeValidationError();
    if (issue) message += " " + issue;
    else if (mode === "shorts") message += " This file matches the basic Shorts format checks.";
    hint.classList.toggle("warning", Boolean(issue));
  } else {
    hint.classList.remove("warning");
  }
  hint.textContent = message;
  if (!busy) $("ytUploadBtn").textContent = mode === "shorts" ? "Upload Short to YouTube" : "Upload video to YouTube";
}
function renderConfig(data) {
  const missing = Array.isArray(data?.missingConfig) ? data.missingConfig : [];
  const rows = [
    ["YOUTUBE_CLIENT_ID", "Google OAuth Client ID"],
    ["YOUTUBE_CLIENT_SECRET", "Google OAuth Client Secret"],
    ["YOUTUBE_TOKEN_ENCRYPTION_KEY", "Refresh-token encryption key"]
  ];
  $("ytConfigList").innerHTML = rows.map(([key,label]) => {
    const ready = !missing.includes(key);
    return '<li class="' + (ready ? "ready" : "") + '">' + H.esc(label) + ": " + (ready ? "configured on server" : "not configured") + "</li>";
  }).join("");
  $("ytRedirectUri").value = data?.redirectUri || "";
  $("ytServerBadge").textContent = data?.setupReady ? "Server ready for connection" : "Server setup incomplete";
  $("ytServerBadge").className = "hf-status " + (data?.setupReady ? "hf-status-active" : "hf-status-pending");
  $("ytConnectBtn").disabled = !data?.setupReady || busy;
  if (data?.setupReady) inlineStatus("Server configuration is present. Connect Google and approve the YouTube permissions.");
  else inlineStatus("Add the missing secrets in Supabase Edge Function Secrets, then refresh: " + missing.join(", "), true);
}
function renderChannel(data) {
  selectedChannel = data?.selectedAccount || (data?.connectedAccounts || []).find(row => row.isSelected) || null;
  const ready = Boolean(selectedChannel && data?.setupReady && REQUIRED_SCOPES.every(scope => (selectedChannel.grantedScopes || []).includes(scope)));
  $("ytVerifyBtn").disabled = !selectedChannel || busy;
  $("ytDisconnectBtn").disabled = !selectedChannel || busy;
  $("ytComposerBadge").textContent = ready ? "Channel connected" : (selectedChannel ? "Check permissions" : "Connect a channel first");
  $("ytComposerBadge").className = "hf-status " + (ready ? "hf-status-active" : "hf-status-pending");
  updateUploadButton();
  if (selectedChannel) {
    $("ytSelectedChannel").innerHTML = '<strong>' + H.esc(selectedChannel.channelTitle) + '</strong><span>Channel ID: ' + H.esc(selectedChannel.channelId) + '</span><br><span>Custom URL: ' + H.esc(selectedChannel.channelCustomUrl || "Not returned") + '</span><br><span>Last verified: ' + H.esc(selectedChannel.lastVerifiedAt ? H.dateTime(selectedChannel.lastVerifiedAt) : "Not verified yet") + '</span>';
    $("ytPermissionChecks").innerHTML = REQUIRED_SCOPES.map(scope => {
      const granted = (selectedChannel.grantedScopes || []).includes(scope);
      return '<div class="yt-permission-line ' + (granted ? "" : "missing") + '"><span class="yt-check-icon">' + (granted ? "✓" : "!") + '</span><span><strong>' + H.esc(scope) + '</strong> — ' + (granted ? "granted" : "not confirmed; reconnect and approve this scope") + '</span></div>';
    }).join("");
    inlineStatus(ready ? "Connected channel: " + selectedChannel.channelTitle + ". You can upload a video below." : "Channel connected, but one or more required permissions are missing.", !ready);
  } else {
    $("ytSelectedChannel").textContent = "No YouTube channel connected yet.";
    $("ytPermissionChecks").innerHTML = "";
    if (data?.setupReady) inlineStatus("Connect the Google account that owns or manages your intended YouTube channel.");
  }
}
async function refreshStatus() {
  $("ytRefreshBtn").disabled = true;
  try {
    statusData = await invoke("status");
    renderConfig(statusData);
    renderChannel(statusData);
  } catch (err) {
    H.toast(err.message || "Could not read YouTube status.", "error");
    inlineStatus(err.message || "Status check failed.", true);
    $("ytServerBadge").textContent = "Status unavailable";
    $("ytServerBadge").className = "hf-status hf-status-cancelled";
  } finally { $("ytRefreshBtn").disabled = false; }
}
async function connectYouTube() {
  if (oauthPopup && !oauthPopup.closed) oauthPopup.close();
  oauthPopup = window.open("about:blank", "hf-youtube-oauth", "popup,width=600,height=760");
  if (!oauthPopup) {
    H.toast("Your browser blocked the Google login popup. Allow popups for the Halal Food dashboard and try again.", "error");
    return;
  }
  $("ytConnectBtn").disabled = true;
  try {
    const result = await invoke("connect");
    oauthPopup.location.href = result.authUrl;
    inlineStatus("Google authorization opened in a separate window. Complete it, then return here.");
  } catch (err) {
    oauthPopup.close(); oauthPopup = null;
    H.toast(err.message || "Could not start Google authorization.", "error");
    inlineStatus(err.message || "Could not start Google authorization.", true);
  } finally { $("ytConnectBtn").disabled = false; }
}
async function verifyChannel() {
  $("ytVerifyBtn").disabled = true;
  try {
    const result = await invoke("verify_channel");
    H.toast("Verified YouTube channel: " + result.channelTitle);
    await refreshStatus();
  } catch (err) { H.toast(err.message || "Channel verification failed.", "error"); }
  finally { $("ytVerifyBtn").disabled = !selectedChannel || busy; }
}
async function disconnectChannel() {
  if (!selectedChannel) return;
  if (!window.confirm("Disconnect " + selectedChannel.channelTitle + " from this dashboard? Existing YouTube videos will not be changed.")) return;
  $("ytDisconnectBtn").disabled = true;
  try {
    await invoke("disconnect");
    H.toast("YouTube channel disconnected. Existing videos were not changed.");
    await refreshStatus();
  } catch (err) { H.toast(err.message || "Could not disconnect YouTube.", "error"); }
  finally { $("ytDisconnectBtn").disabled = !selectedChannel || busy; }
}
function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null; mediaInfo = null;
  $("ytMediaPreview").hidden = true;
  $("ytMediaPreview").replaceChildren();
  $("ytVideoMetadata").textContent = "Video dimensions and duration will appear here.";
  updateModeHint();
}
function inspectFile() {
  clearPreview();
  const file = $("ytVideoFile").files?.[0];
  if (!file) { $("ytFileInfo").textContent = "No video selected."; updateUploadButton(); return; }
  if (file.size < 1 || file.size > MAX_FILE_BYTES || !(file.type.startsWith("video/") || file.type === "")) {
    H.toast("Choose a valid video file supported by YouTube.", "error");
    $("ytVideoFile").value = "";
    $("ytFileInfo").textContent = "No video selected.";
    updateUploadButton();
    return;
  }
  $("ytFileInfo").textContent = file.name + " · " + (file.size / (1024 * 1024)).toLocaleString("en-BD", {maximumFractionDigits:2}) + " MB";
  if (!$("ytTitle").value.trim()) $("ytTitle").value = file.name.replace(/\.[^.]+$/, "").slice(0,100);
  $("ytTitleCount").textContent = String($("ytTitle").value.length);
  previewUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = previewUrl; video.controls = true; video.preload = "metadata"; video.setAttribute("aria-label", "Selected video preview");
  video.onloadedmetadata = () => {
    if (!Number.isFinite(video.duration) || !video.videoWidth || !video.videoHeight) {
      $("ytVideoMetadata").textContent = "The browser could not read the video's dimensions/duration.";
      mediaInfo = null; updateModeHint(); return;
    }
    mediaInfo = {duration:video.duration,width:video.videoWidth,height:video.videoHeight};
    $("ytVideoMetadata").textContent = "Detected: " + mediaInfo.width + "×" + mediaInfo.height + " · " +
      Math.floor(mediaInfo.duration/60) + ":" + String(Math.floor(mediaInfo.duration%60)).padStart(2,"0") +
      " · " + (mediaInfo.height >= mediaInfo.width ? "square/vertical" : "landscape");
    updateModeHint();
  };
  video.onerror = () => {
    mediaInfo = null;
    $("ytVideoMetadata").textContent = "Preview metadata was unavailable. Upload checks may need the file to be re-exported in a standard video format.";
    updateModeHint();
  };
  const caption = document.createElement("p"); caption.textContent = "Local preview only — the source file remains on this computer until upload begins.";
  $("ytMediaPreview").append(video, caption); $("ytMediaPreview").hidden = false;
  updateUploadButton();
}
function showUploadResult(message, isError = false, link = "") {
  const node = $("ytUploadResult"); node.hidden = false; node.classList.toggle("error", isError); node.replaceChildren();
  const strong = document.createElement("strong"); strong.textContent = isError ? "Upload needs attention" : "YouTube response";
  const p = document.createElement("p"); p.textContent = message; node.append(strong,p);
  if (link && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+/.test(link)) {
    const a = document.createElement("a"); a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Open video on YouTube ↗"; node.append(a);
  }
}
function setProgress(pct, label, note) {
  const value = Math.max(0,Math.min(100,pct));
  $("ytProgress").value = value; $("ytProgressPercent").textContent = Math.round(value) + "%";
  $("ytProgressLabel").textContent = label; $("ytProgressNote").textContent = note || "";
}

function xhrUpload(uploadUrl, file, start, end, onProgress) {
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Content-Range", "bytes " + start + "-" + (end - 1) + "/" + file.size);
    xhr.setRequestHeader("X-Upload-Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && typeof onProgress === "function")
        onProgress(start + event.loaded, file.size);
    };
    xhr.onerror = () => {
      const error = new Error("The browser could not read a response from YouTube's upload endpoint (network/CORS interruption).");
      error.httpStatus = 0; reject(error);
    };
    xhr.ontimeout = () => { const e = new Error("YouTube's upload request timed out."); e.httpStatus=0; reject(e); };
    xhr.timeout = 120000;
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        let data = {};
        try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
        if (!data.id) { const e = new Error("YouTube completed the transfer response without a video ID. Check Studio before retrying."); e.httpStatus=xhr.status; reject(e); return; }
        resolve({complete:true,data,next:file.size}); return;
      }
      if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range");
        const match = range && range.match(/(\d+)\s*$/);
        const next = match ? Number(match[1]) + 1 : 0;
        resolve({complete:false,next}); return;
      }
      let message = "";
      try { message = JSON.parse(xhr.responseText || "{}")?.error?.message || ""; } catch {}
      const e = new Error(message || ("YouTube returned HTTP " + xhr.status + " while receiving the file."));
      e.httpStatus = xhr.status; reject(e);
    };
    xhr.send(file.slice(start,end));
  });
}
function probeUpload(uploadUrl, file) {
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Range", "bytes */" + file.size);
    xhr.setRequestHeader("X-Upload-Content-Type", file.type || "application/octet-stream");
    xhr.onerror = () => { const e = new Error("Could not check YouTube's resumable upload session after a network interruption."); e.httpStatus=0; reject(e); };
    xhr.ontimeout = () => { const e = new Error("The resumable upload status check timed out."); e.httpStatus=0; reject(e); };
    xhr.timeout = 45000;
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        let data = {};
        try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
        if (!data.id) { const e = new Error("The upload status response had no video ID."); e.httpStatus=xhr.status; reject(e); return; }
        resolve({complete:true,data,next:file.size}); return;
      }
      if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range");
        const match = range && range.match(/(\d+)\s*$/);
        resolve({complete:false,next:match ? Number(match[1])+1 : 0}); return;
      }
      let message = "";
      try { message = JSON.parse(xhr.responseText || "{}")?.error?.message || ""; } catch {}
      const e = new Error(message || ("YouTube upload-session check returned HTTP " + xhr.status + "."));
      e.httpStatus = xhr.status; reject(e);
    };
    xhr.send();
  });
}
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function uploadVideo(event) {
  event.preventDefault();
  if (busy) return;
  const file = $("ytVideoFile").files?.[0];
  if (!selectedChannel || !file) { H.toast("Connect a channel and choose a video file first.", "error"); return; }
  const title = $("ytTitle").value.trim();
  if (!title) { H.toast("Enter a video title.", "error"); $("ytTitle").focus(); return; }
  const description = $("ytDescription").value.trim();
  if (title.length > 100 || /[<>]/.test(title)) {
    H.toast("YouTube titles must be 100 characters or fewer and cannot contain < or >.", "error"); $("ytTitle").focus(); return;
  }
  if (/[<>]/.test(description)) {
    H.toast("YouTube descriptions cannot contain < or > characters. Remove them before uploading.", "error"); $("ytDescription").focus(); return;
  }
  if (utf8Bytes(description) > MAX_DESCRIPTION_BYTES) {
    H.toast("The description is " + utf8Bytes(description) + " UTF-8 bytes. YouTube's limit is 5,000 bytes for both Shorts and regular videos.", "error"); $("ytDescription").focus(); return;
  }
  const formatError = modeValidationError();
  if (formatError) { H.toast(formatError, "error"); $("ytVideoFile").focus(); return; }
  if (!$("ytTermsAccepted").checked) { H.toast("Confirm the YouTube Terms and rights notice before uploading.", "error"); return; }
  const tags = $("ytTags").value.split(",").map(v=>v.trim()).filter(Boolean);
  const scheduledLocal = $("ytScheduleAt").value;
  let scheduledAt = "";
  if (scheduledLocal) {
    const date = new Date(scheduledLocal);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 120000) { H.toast("Choose a schedule at least 2 minutes in the future.", "error"); return; }
    scheduledAt = date.toISOString();
  }
  const mimeType = file.type || "application/octet-stream";
  busy = true; $("ytUploadBtn").disabled = true; $("ytConnectBtn").disabled = true; $("ytProgressWrap").hidden = false; $("ytUploadResult").hidden = true;
  $("ytRefreshBtn").disabled = true; $("ytHistoryRefreshBtn").disabled = true;
  let uploadId = null;
  try {
    setProgress(0,"Preparing YouTube upload session…","This request sends video metadata only; the video bytes go directly from the browser to YouTube.");
    const session = await invoke("start_upload", {
      title, description, tags,
      categoryId: $("ytCategory").value, privacyStatus: $("ytPrivacy").value,
      scheduledAt, madeForKids: $("ytMadeForKids").checked,
      containsSyntheticMedia: $("ytSyntheticMedia").checked, uploadMode: selectedUploadMode(),
      fileSizeBytes: file.size, mimeType
    });
    uploadId = session.uploadId;
    const chunkSize = Number(session.chunkSizeBytes) || UPLOAD_CHUNK_BYTES;
    let offset = 0, result = null, retryCount = 0, noProgressCount = 0;
    while (offset < file.size && !result) {
      const end = Math.min(file.size, offset + chunkSize);
      setProgress(offset / file.size * 100, "Uploading video…", "Uploaded " + (offset / (1024*1024)).toFixed(1) + " MB of " + (file.size / (1024*1024)).toFixed(1) + " MB. Keep this tab open.");
      try {
        const step = await xhrUpload(session.uploadUrl, file, offset, end, (loaded,total) => {
          setProgress(loaded / total * 100, "Uploading video…", "Sending " + (loaded / (1024*1024)).toFixed(1) + " MB of " + (total / (1024*1024)).toFixed(1) + " MB directly to YouTube.");
        });
        if (step.complete) { result = step.data; offset = file.size; break; }
        if (step.next <= offset) {
          noProgressCount++;
          if (noProgressCount > 3) throw new Error("YouTube's resumable session did not advance the upload offset. Check YouTube Studio before retrying.");
          await wait(800 * noProgressCount);
        } else {
          offset = step.next;
          noProgressCount = 0; retryCount = 0;
        }
      } catch (error) {
        if (error.httpStatus >= 400 && error.httpStatus < 500) throw error;
        retryCount++;
        if (retryCount > 5) {
          throw new Error("Upload was interrupted after 5 retries. The browser reported a network/CORS failure or lost connection. Check YouTube Studio before retrying. Details: " + (error.message || "No HTTP response was exposed."));
        }
        const pause = Math.min(1000 * (2 ** (retryCount - 1)), 12000) + Math.floor(Math.random()*500);
        setProgress(offset / file.size * 100, "Connection interrupted — checking resumable upload…", "Retry " + retryCount + " of 5. Checking how much YouTube received before sending data again.");
        await wait(pause);
        const state = await probeUpload(session.uploadUrl, file);
        if (state.complete) { result = state.data; offset = file.size; break; }
        if (state.next > file.size) throw new Error("YouTube returned an invalid resumable-upload offset.");
        if (state.next > offset) { offset = state.next; noProgressCount=0; }
        else if (state.next < offset) { offset = state.next; }
      }
    }
    if (!result?.id) throw new Error("Upload session ended without a video ID. Check YouTube Studio before retrying to avoid duplicates.");
    setProgress(100,"Transfer complete — verifying video…","YouTube has returned a video ID. Saving the final status to the server.");
    const final = await invoke("complete_upload", { uploadId, videoId: result.id });
    showUploadResult("YouTube accepted the video. Current status: " + final.status + ". " + (scheduledAt ? "The video was uploaded as Private and scheduled for " + H.dateTime(scheduledAt) + "." : "Check the selected visibility and any processing in YouTube Studio."), false, final.youtubeUrl);
    H.toast("YouTube upload completed.");
    $("ytProgressWrap").hidden = false;
    setProgress(100,"Upload complete","YouTube has returned a video ID and the server history was updated.");
    await refreshHistory();
  } catch (err) {
    const message = err.message || "YouTube upload failed.";
    if (uploadId) {
      try { await invoke("fail_upload", { uploadId, errorMessage: message }); } catch {}
    }
    showUploadResult(message + " Before retrying, check YouTube Studio in case YouTube received the video but the final response was interrupted.", true);
    H.toast(message, "error");
    await refreshHistory();
  } finally {
    busy = false;
    $("ytConnectBtn").disabled = !statusData?.setupReady;
    $("ytRefreshBtn").disabled = false;
    $("ytHistoryRefreshBtn").disabled = false;
    updateModeHint();
    renderChannel(statusData || {});
    updateUploadButton();
  }
}
async function refreshHistory() {
  $("ytHistoryRefreshBtn").disabled = true;
  try {
    const result = await invoke("history");
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const body = $("ytHistoryBody");
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="yt-history-empty">No YouTube uploads yet.</td></tr>'; return; }
    body.innerHTML = rows.map(row => {
      const time = row.scheduled_at || row.created_at;
      const visibility = row.privacy_status ? row.privacy_status.charAt(0).toUpperCase() + row.privacy_status.slice(1) : "—";
      const link = row.youtube_url && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+/.test(row.youtube_url)
        ? '<a class="yt-mini-link" target="_blank" rel="noopener noreferrer" href="' + H.esc(row.youtube_url) + '">Open video ↗</a><div class="yt-history-id">' + H.esc(row.video_id || "") + "</div>"
        : '<div class="yt-history-id">' + H.esc(row.video_id || "—") + "</div>";
      const err = row.error_message ? '<small class="yt-history-id">' + H.esc(row.error_message) + "</small>" : "";
      const title = String(row.title || ""), short = title.length > 110 ? title.slice(0,110) + "…" : title;
      return "<tr><td>" + H.esc(time ? H.dateTime(time) : "—") + "</td><td><strong>" + H.esc(short) + "</strong><div class=\"yt-history-id\">" + H.esc(row.channel_title || "—") + "</div>" + err + "</td><td>" + H.makeStatus(row.status) + "</td><td>" + H.esc(visibility) + (row.scheduled_at ? '<div class="yt-history-id">Publish: ' + H.esc(H.dateTime(row.scheduled_at)) + "</div>" : "") + "</td><td>" + link + "</td></tr>";
    }).join("");
  } catch (err) {
    $("ytHistoryBody").innerHTML = '<tr><td colspan="5" class="yt-history-empty">Could not load history. ' + H.esc(err.message || "") + "</td></tr>";
  } finally { $("ytHistoryRefreshBtn").disabled = false; }
}
function bindEvents() {
  $("ytRefreshBtn").addEventListener("click",refreshStatus);
  $("ytHistoryRefreshBtn").addEventListener("click",refreshHistory);
  $("ytConnectBtn").addEventListener("click",connectYouTube);
  $("ytVerifyBtn").addEventListener("click",verifyChannel);
  $("ytDisconnectBtn").addEventListener("click",disconnectChannel);
  $("ytVideoFile").addEventListener("change",inspectFile);
  $("ytTitle").addEventListener("input",()=>$("ytTitleCount").textContent=String($("ytTitle").value.length));
  $("ytDescription").addEventListener("input",()=>$("ytDescriptionCount").textContent=String(utf8Bytes($("ytDescription").value)));
  $("ytTermsAccepted").addEventListener("change",updateUploadButton);
  document.querySelectorAll('input[name="ytUploadMode"]').forEach(input => input.addEventListener("change", () => { updateModeHint(); updateUploadButton(); }));
  $("ytComposerForm").addEventListener("submit",uploadVideo);
  $("ytClearBtn").addEventListener("click",()=>setTimeout(()=>{
    clearPreview(); $("ytFileInfo").textContent="No video selected."; $("ytVideoMetadata").textContent="Video dimensions and duration will appear here."; $("ytTitleCount").textContent="0"; $("ytDescriptionCount").textContent="0"; $("ytUploadResult").hidden=true;
    $("ytProgressWrap").hidden=true; updateUploadButton();
  },0));
  $("ytCopyRedirectBtn").addEventListener("click",async()=>{
    try { await navigator.clipboard.writeText($("ytRedirectUri").value); H.toast("OAuth redirect URI copied."); }
    catch { $("ytRedirectUri").select(); document.execCommand("copy"); H.toast("Redirect URI selected; copy it if clipboard access is blocked."); }
  });
  window.addEventListener("message",async(event)=>{
    if(event.origin!==FUNCTION_ORIGIN||event.source!==oauthPopup||event.data?.type!=="hf-youtube-oauth-complete")return;
    oauthPopup=null;
    if(event.data.success){H.toast("YouTube authorization completed.");await refreshStatus();await refreshHistory();}
    else {H.toast("YouTube connection was not completed. Read the callback page message and try again.","error");await refreshStatus();}
  });
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&H)refreshStatus();});
}
window.HFAdminReady.then(async admin=>{
  if(!admin)return;
  H=admin; bindEvents(); await Promise.all([refreshStatus(),refreshHistory()]);
});
})();
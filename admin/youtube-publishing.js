(() => {
"use strict";
const FUNCTION_NAME = "youtube-publishing";
const FUNCTION_ORIGIN = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const REQUIRED_SCOPES = ["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly"];
const MAX_FILE_BYTES = 256_000_000_000;
const MAX_DESCRIPTION_BYTES = 5000;
const SHORTS_MAX_SECONDS = 180;
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const $ = id => document.getElementById(id);
let H = null, statusData = null, selectedChannel = null, oauthPopup = null, busy = false, previewUrl = null, mediaInfo = null;
let videoThumbnailPreviewUrl = null, existingThumbnailPreviewUrl = null, communityPreviewUrls = [], activeCommunityDraftId = null, overviewBusy = false;

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
async function uploadThumbnail(videoId, file) {
  if (!selectedChannel) throw new Error("Connect a YouTube channel first.");
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(String(videoId || ""))) throw new Error("Enter a valid YouTube video ID.");
  if (!file || !["image/jpeg","image/png"].includes(file.type)) throw new Error("Choose a JPEG or PNG thumbnail image.");
  if (file.size < 1 || file.size > 50 * 1024 * 1024) throw new Error("The thumbnail must be no larger than 50 MB.");
  const { data, error } = await H.client.auth.getSession();
  const session = data?.session;
  if (error || !session?.access_token) throw new Error("Your admin session expired. Sign in again before setting the thumbnail.");
  const response = await fetch(FUNCTION_ORIGIN + "/functions/v1/youtube-publishing?action=set_thumbnail&videoId=" + encodeURIComponent(videoId), {
    method: "POST",
    headers: { Authorization: "Bearer " + session.access_token, apikey: SUPABASE_PUBLIC_KEY, "Content-Type": file.type },
    body: file
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) throw new Error(result?.error || ("Thumbnail upload failed (HTTP " + response.status + ")."));
  return result;
}
function clearImagePreview(nodeId, storedUrl) {
  if (storedUrl) URL.revokeObjectURL(storedUrl);
  const node = $(nodeId);
  if (node) { node.hidden = true; node.replaceChildren(); }
  return null;
}
async function refreshOverview() {
  if (!$("ytChannelMetrics")) return;
  if (!selectedChannel) {
    $("ytChannelMetrics").innerHTML = '<div class="yt-overview-placeholder">Connect a channel to load its overview.</div>';
    $("ytRecentVideos").innerHTML = '<div class="yt-overview-placeholder">No channel data loaded.</div>';
    return;
  }
  if (overviewBusy) return;
  overviewBusy = true; $("ytOverviewRefreshBtn").disabled = true; $("ytOverviewRefreshBtn").textContent = "Loading…";
  try {
    const data = await invoke("channel_overview"), ch = data.channel || {};
    const metrics = [
      ["Subscribers", ch.hiddenSubscriberCount ? "Hidden" : Number(ch.subscriberCount || 0).toLocaleString("en-BD")],
      ["Channel views", Number(ch.viewCount || 0).toLocaleString("en-BD")],
      ["Videos", Number(ch.videoCount || 0).toLocaleString("en-BD")],
      ["Channel created", ch.publishedAt ? new Date(ch.publishedAt).toLocaleDateString("en-BD") : "—"]
    ];
    $("ytChannelMetrics").innerHTML = metrics.map(([label,value]) => '<div class="yt-metric"><span>' + H.esc(label) + '</span><strong>' + H.esc(value) + '</strong></div>').join("");
    const videos = Array.isArray(data.recentVideos) ? data.recentVideos : [];
    if (!videos.length) $("ytRecentVideos").innerHTML = '<div class="yt-overview-placeholder">No recent uploads were returned by YouTube.</div>';
    else $("ytRecentVideos").innerHTML = videos.map(v => {
      const thumb = v.thumbnailUrl && /^https:\/\//.test(v.thumbnailUrl) ? '<img loading="lazy" src="' + H.esc(v.thumbnailUrl) + '" alt="" class="yt-recent-thumb">' : '<div class="yt-recent-thumb yt-recent-thumb-empty">YT</div>';
      return '<article class="yt-recent-video">' + thumb + '<div class="yt-recent-video-body"><strong>' + H.esc(v.title || "Untitled video") + '</strong><span>' + H.esc(v.publishedAt ? H.dateTime(v.publishedAt) : "Upload date unavailable") + '</span><span>' + H.esc(v.privacyStatus || "Unknown visibility") + ' · ' + H.esc(v.uploadStatus || "status unavailable") + '</span><span>' + Number(v.viewCount || 0).toLocaleString("en-BD") + ' views</span></div><a class="yt-mini-link" target="_blank" rel="noopener noreferrer" href="' + H.esc(v.youtubeUrl) + '">Open ↗</a></article>';
    }).join("");
  } catch (err) {
    $("ytChannelMetrics").innerHTML = '<div class="yt-overview-placeholder">Could not load channel metrics: ' + H.esc(err.message || "Unknown error") + '</div>';
    H.toast(err.message || "Could not load YouTube channel overview.", "error");
  } finally {
    overviewBusy = false; $("ytOverviewRefreshBtn").disabled = !selectedChannel; $("ytOverviewRefreshBtn").textContent = "↻ Refresh overview";
  }
}
async function refreshCommunityDrafts() {
  const body = $("ytCommunityDrafts");
  if (!body) return;
  if (!selectedChannel) { body.innerHTML = '<div class="yt-overview-placeholder">Connect a channel to load drafts.</div>'; return; }
  $("ytCommunityDraftRefreshBtn").disabled = true;
  try {
    const result = await invoke("community_drafts_list"), rows = Array.isArray(result.rows) ? result.rows : [];
    if (!rows.length) { body.innerHTML = '<div class="yt-overview-placeholder">No saved Community drafts yet.</div>'; return; }
    body.innerHTML = rows.map(row => {
      const names = Array.isArray(row.image_names) ? row.image_names.map(x => x && typeof x === "object" ? x.name : x).filter(Boolean) : [];
      const when = row.scheduled_at ? "Desired time: " + H.dateTime(row.scheduled_at) : "No desired time saved";
      const status = row.status === "published_manually" ? "Marked published in Studio" : row.status === "ready_for_studio" ? "Ready for Studio" : "Draft";
      return '<article class="yt-community-draft"><div class="yt-community-draft-main"><strong>' + H.esc(row.post_text ? String(row.post_text).slice(0,180) : "Image post without caption") + '</strong><span>' + names.length + ' image(s): ' + H.esc(names.join(", ") || "No image filenames saved") + '</span><span>' + H.esc(when) + ' · ' + H.esc(status) + '</span><span class="yt-history-id">Saved ' + H.esc(row.created_at ? H.dateTime(row.created_at) : "—") + '</span></div><div class="yt-community-draft-actions"><button type="button" class="hf-button hf-button-secondary" data-community-open="' + H.esc(row.id) + '">Open in Studio</button>' + (row.status !== "published_manually" ? '<button type="button" class="hf-button hf-button-secondary" data-community-mark="' + H.esc(row.id) + '">Mark posted</button>' : '') + '<button type="button" class="hf-button hf-button-secondary" data-community-delete="' + H.esc(row.id) + '">Delete</button></div></article>';
    }).join("");
  } catch (err) {
    body.innerHTML = '<div class="yt-overview-placeholder">Could not load Community drafts: ' + H.esc(err.message || "Unknown error") + '</div>';
  } finally { $("ytCommunityDraftRefreshBtn").disabled = !selectedChannel; }
}
function updateCommunityButtons() {
  const files = Array.from($("ytCommunityImages").files || []), text = $("ytCommunityText").value.trim();
  const validCount = files.length >= 1 && files.length <= 10;
  const validFiles = files.every(f => ["image/jpeg","image/png","image/gif","image/webp"].includes(f.type) && f.size > 0 && f.size <= 16 * 1024 * 1024);
  const ready = Boolean(selectedChannel && !busy && validFiles && validCount);
  $("ytSaveCommunityDraftBtn").disabled = !ready || (!text && !files.length);
  $("ytOpenStudioBtn").disabled = !ready || (!text && !files.length);
}
function inspectCommunityImages() {
  communityPreviewUrls.forEach(url => URL.revokeObjectURL(url)); communityPreviewUrls = [];
  const files = Array.from($("ytCommunityImages").files || []), summary = $("ytCommunityFileSummary"), preview = $("ytCommunityPreview");
  preview.replaceChildren();
  if (files.length > 10) { summary.textContent = "Too many images. YouTube Community posts support up to 10 images; select 10 or fewer."; updateCommunityButtons(); return; }
  const bad = files.find(f => !["image/jpeg","image/png","image/gif","image/webp"].includes(f.type) || f.size < 1 || f.size > 16 * 1024 * 1024);
  if (bad) { summary.textContent = "Invalid image: " + bad.name + ". Choose JPG, PNG, GIF, or WEBP files up to 16 MB each."; updateCommunityButtons(); return; }
  summary.textContent = files.length ? files.length + " image(s) selected · " + (files.reduce((n,f)=>n+f.size,0)/(1024*1024)).toLocaleString("en-BD",{maximumFractionDigits:2}) + " MB total. Files remain on this computer." : "No Community images selected.";
  for (const file of files) {
    const url = URL.createObjectURL(file); communityPreviewUrls.push(url);
    const card=document.createElement("div");card.className="yt-community-image-card";
    const img=document.createElement("img");img.loading="lazy";img.src=url;img.alt=file.name;
    const name=document.createElement("strong");name.textContent=file.name;
    const meta=document.createElement("span");meta.textContent=(file.size/(1024*1024)).toLocaleString("en-BD",{maximumFractionDigits:2})+" MB";
    img.onload=()=>{const ratio=img.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:0;meta.textContent=img.naturalWidth+"×"+img.naturalHeight+" · "+(file.size/(1024*1024)).toLocaleString("en-BD",{maximumFractionDigits:2})+" MB"+(ratio>0.95&&ratio<1.05?" · near-square":" · consider square crop");};
    card.append(img,name,meta);preview.append(card);
  }
  updateCommunityButtons();
}
async function saveCommunityDraft(status = "draft", draftId = activeCommunityDraftId, draftFiles = null, draftText = null, desiredSchedule = null) {
  if (!selectedChannel) throw new Error("Connect your YouTube channel before saving a draft.");
  const files = draftFiles || Array.from($("ytCommunityImages").files || []);
  const postText = draftText !== null ? draftText : $("ytCommunityText").value.trim();
  const names = files.map(f => typeof f === "string" ? ({name:f,type:"image/jpeg",size:1}) : ({name:f.name,type:f.type,size:f.size}));
  if (!postText && !names.length) throw new Error("Add a caption or select at least one image.");
  if (names.length > 10 || names.some(f => !["image/jpeg","image/png","image/gif","image/webp"].includes(f.type) || !Number.isSafeInteger(f.size) || f.size < 1 || f.size > 16*1024*1024)) throw new Error("Select up to 10 JPG, PNG, GIF, or WEBP images, each no larger than 16 MB.");
  let scheduledAt=null;const schedule=desiredSchedule!==null?desiredSchedule:$("ytCommunitySchedule").value;
  if(schedule){const date=new Date(schedule);if(Number.isNaN(date.getTime())||date.getTime()<Date.now()+60000)throw new Error("Choose a desired posting time in the future.");scheduledAt=date.toISOString();}
  const result=await invoke("community_draft_save",{draftId:draftId||undefined,postText,images:names,scheduledAt,status});
  activeCommunityDraftId=result.draft?.id||draftId||null;
  await refreshCommunityDrafts();
  return result.draft;
}
async function openCommunityStudio(draftId = null) {
  if (!selectedChannel) { H.toast("Connect your YouTube channel first.", "error"); return; }
  const tab=window.open("about:blank","_blank");
  if(!tab){H.toast("Allow popups for this dashboard to open YouTube Studio.","error");return;}
  const openId=draftId||activeCommunityDraftId;
  const currentFiles=Array.from($("ytCommunityImages").files||[]);
  let text=$("ytCommunityText").value.trim(),schedule=$("ytCommunitySchedule").value;
  try{
    if(draftId){
      const saved=await invoke("community_drafts_list"),row=(saved.rows||[]).find(x=>x.id===draftId);
      if(!row)throw new Error("Saved Community draft was not found.");
      text=row.post_text||"";
      const draft=await saveCommunityDraft("ready_for_studio",draftId,row.image_names||[],text,row.scheduled_at||null);
      activeCommunityDraftId=draft.id;$("ytCommunityText").value=text;
      $("ytCommunityTextCount").textContent=String(text.length);
    } else {
      const draft=await saveCommunityDraft("ready_for_studio",openId,currentFiles,text,schedule);
      activeCommunityDraftId=draft.id;
    }
    if(text){try{await navigator.clipboard.writeText(text);}catch{H.toast("Caption saved, but the browser blocked clipboard access. Copy it from the dashboard manually.","error");}}
    tab.location.href="https://studio.youtube.com/channel/"+encodeURIComponent(selectedChannel.channelId)+"/posts";
    $("ytCommunityResult").hidden=false;$("ytCommunityResult").classList.remove("error");$("ytCommunityResult").replaceChildren();
    const strong=document.createElement("strong");strong.textContent="Draft ready for YouTube Studio";
    const p=document.createElement("p");p.textContent="The draft metadata is saved on the Halal Food server. The caption was copied if clipboard permission was available. In Studio, create an Image post, select these same local images again, then choose Post or Schedule. No Community post was auto-published.";
    $("ytCommunityResult").append(strong,p);H.toast("Community draft saved. Finish publication in YouTube Studio.");
  }catch(err){try{tab.close();}catch{}H.toast(err.message||"Could not prepare the Community post.","error");}
}
async function setThumbnailPreview(file,nodeId,oldUrl,altText){
 const node=$(nodeId);if(oldUrl)URL.revokeObjectURL(oldUrl);node.replaceChildren();node.hidden=true;
 if(!file)return null;
 const url=URL.createObjectURL(file),img=document.createElement("img");img.src=url;img.alt=altText||file.name;
 const label=document.createElement("span");label.textContent=file.name+" · "+(file.size/(1024*1024)).toLocaleString("en-BD",{maximumFractionDigits:2})+" MB";
 node.append(img,label);node.hidden=false;return url;
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
function updateDescriptionCount() {
  const count = utf8Bytes($("ytDescription").value);
  $("ytDescriptionCount").textContent = String(count);
  $("ytDescriptionCount").parentElement.classList.toggle("yt-over-limit", count > MAX_DESCRIPTION_BYTES);
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
  $("ytOverviewRefreshBtn").disabled = !selectedChannel || overviewBusy;
  $("ytCommunityDraftRefreshBtn").disabled = !selectedChannel || busy;
  $("ytApplyExistingThumbnailBtn").disabled = !selectedChannel || busy || !$("ytExistingVideoId").value.trim() || !$("ytExistingThumbnailFile").files?.[0];
  $("ytComposerBadge").textContent = ready ? "Channel connected" : (selectedChannel ? "Check permissions" : "Connect a channel first");
  $("ytComposerBadge").className = "hf-status " + (ready ? "hf-status-active" : "hf-status-pending");
  updateUploadButton();
  updateCommunityButtons();
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
    await Promise.all([refreshOverview(), refreshCommunityDrafts()]);
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

function xhrUpload(uploadUrl, accessToken, file, start, end, onProgress) {
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader(["Author","ization"].join(""), ["Bearer",accessToken].join(" "));
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Content-Range", "bytes " + start + "-" + (end - 1) + "/" + file.size);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && typeof onProgress === "function")
        onProgress(start + event.loaded, file.size);
    };
    xhr.onerror = () => {
      console.error("[YouTube upload] Media PUT failed without an HTTP response. Check the browser Network panel for a CORS/preflight block or network interruption.", { phase: "media-put", status: xhr.status, readyState: xhr.readyState });
      const error = new Error("The browser could not read an HTTP response from YouTube's media-upload request. This points to a browser/network/CORS path; inspect DevTools Network for the blocked request.");
      error.httpStatus = 0; error.stage = "media-put"; reject(error);
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
function probeUpload(uploadUrl, accessToken, file) {
  return new Promise((resolve,reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader(["Author","ization"].join(""), ["Bearer",accessToken].join(" "));
    xhr.setRequestHeader("Content-Range", "bytes */" + file.size);
    xhr.onerror = () => {
      console.error("[YouTube upload] Resumable-session status check failed without an HTTP response. Check browser Network for CORS/preflight or network filtering.", { phase: "session-status", status: xhr.status, readyState: xhr.readyState });
      const e = new Error("The browser could not read an HTTP response from YouTube's resumable-session status check. Inspect DevTools Network for the blocked request.");
      e.httpStatus=0; e.stage="session-status"; reject(e);
    };
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
  if (!mediaInfo) { H.toast("Wait for the browser to read the video's dimensions and duration before uploading.", "error"); $("ytVideoFile").focus(); return; }
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
  let uploadId = null, acknowledgedVideoId = null;
  try {
    setProgress(0,"Preparing YouTube upload session…","This request sends video metadata only; the video bytes go directly from the browser to YouTube.");
    const session = await invoke("start_upload", {
      title, description, tags,
      categoryId: $("ytCategory").value, privacyStatus: $("ytPrivacy").value,
      scheduledAt, madeForKids: $("ytMadeForKids").checked,
      containsSyntheticMedia: $("ytSyntheticMedia").checked, uploadMode: selectedUploadMode(),
      videoWidth: mediaInfo.width, videoHeight: mediaInfo.height, videoDurationSeconds: mediaInfo.duration,
      fileSizeBytes: file.size, mimeType
    });
    uploadId = session.uploadId;
    const chunkSize = Number(session.chunkSizeBytes) || UPLOAD_CHUNK_BYTES;
    let offset = 0, result = null, retryCount = 0, noProgressCount = 0, lastMediaError = null;
    while (offset < file.size && !result) {
      const end = Math.min(file.size, offset + chunkSize);
      setProgress(offset / file.size * 100, "Uploading video…", "Uploaded " + (offset / (1024*1024)).toFixed(1) + " MB of " + (file.size / (1024*1024)).toFixed(1) + " MB. Keep this tab open.");
      try {
        const step = await xhrUpload(session.uploadUrl, session.accessToken, file, offset, end, (loaded,total) => {
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
        lastMediaError = error;
        retryCount++;
        if (retryCount > 5) {
          throw new Error("Upload was interrupted after 5 retries. The browser reported a network/CORS failure or lost connection. Check YouTube Studio before retrying. Details: " + (error.message || "No HTTP response was exposed."));
        }
        const pause = Math.min(1000 * (2 ** (retryCount - 1)), 12000) + Math.floor(Math.random()*500);
        setProgress(offset / file.size * 100, "Connection interrupted — checking resumable upload…", "Retry " + retryCount + " of 5. Checking how much YouTube received before sending data again.");
        await wait(pause);
        let state;
        try {
          state = await probeUpload(session.uploadUrl, session.accessToken, file);
        } catch (probeError) {
          if (retryCount >= 5) {
            throw new Error("Both the media-upload request and the resumable-session status check failed without an HTTP response. Likely boundary: browser ↔ Google upload endpoint (CORS/preflight, network filtering, or connectivity), not a confirmed Supabase database error. Media request: " + (lastMediaError?.message || "no response") + " Status check: " + (probeError.message || "no response") + ". Check YouTube Studio before retrying to avoid duplicates.");
          }
          setProgress(offset / file.size * 100, "Network interrupted — retrying status check…", "Retry " + retryCount + " of 5. No file copy is stored on Supabase.");
          continue;
        }
        if (state.complete) { result = state.data; offset = file.size; break; }
        if (state.next > file.size) throw new Error("YouTube returned an invalid resumable-upload offset.");
        if (state.next > offset) { offset = state.next; noProgressCount=0; }
        else if (state.next < offset) { offset = state.next; noProgressCount=0; }
      }
    }
    if (!result?.id) throw new Error("Upload session ended without a video ID. Check YouTube Studio before retrying to avoid duplicates.");
    acknowledgedVideoId = String(result.id);
    setProgress(100,"Transfer complete — verifying video…","YouTube has returned a video ID. Saving the final status to the server.");
    const final = await invoke("complete_upload", { uploadId, videoId: result.id });
    let thumbnailNote = "";
    const thumbnailFile = $("ytThumbnailFile").files?.[0];
    if (thumbnailFile) {
      try {
        setProgress(100,"Setting custom thumbnail…","The video exists on YouTube. The image is sent through the protected server, not stored in Supabase.");
        await uploadThumbnail(result.id, thumbnailFile);
        thumbnailNote = " The custom thumbnail was set successfully.";
        $("ytThumbnailFile").value = "";
        videoThumbnailPreviewUrl = clearImagePreview("ytThumbnailPreview", videoThumbnailPreviewUrl);
      } catch (thumbnailError) {
        thumbnailNote = " The video uploaded successfully, but its thumbnail could not be set: " + (thumbnailError.message || "Unknown thumbnail error") + ". You can retry below; do not re-upload the video.";
        H.toast("Video uploaded, but thumbnail setting needs attention.", "error");
      }
    }
    showUploadResult("YouTube accepted the video. Current status: " + final.status + ". " + (scheduledAt ? "The video was uploaded as Private and scheduled for " + H.dateTime(scheduledAt) + "." : "Check the selected visibility and any processing in YouTube Studio.") + thumbnailNote, false, final.youtubeUrl);
    H.toast("YouTube upload completed.");
    $("ytProgressWrap").hidden = false;
    setProgress(100,"Upload complete","YouTube returned a video ID and the server history was updated. A thumbnail-only error does not require re-uploading.");
    await Promise.all([refreshHistory(), refreshOverview()]);
  } catch (err) {
    const message = err.message || "YouTube upload outcome could not be confirmed.";
    const httpStatus = Number(err?.httpStatus || err?.context?.status || 0);
    const uncertain = Boolean(acknowledgedVideoId) || !httpStatus || httpStatus >= 500 ||
      /failed to fetch|network|CORS|timed out|could not read an HTTP response|connection interrupted|session.*status|response was interrupted/i.test(message);
    if (uploadId && acknowledgedVideoId) {
      try {
        const finalized = await invoke("complete_upload", { uploadId, videoId: acknowledgedVideoId });
        showUploadResult("YouTube returned a video ID and the server has now confirmed the existing upload. No second post was created. Status: " + finalized.status + ".", false, finalized.youtubeUrl);
        H.toast("Existing YouTube upload confirmed.");
        await refreshHistory();
        return;
      } catch { /* Reconcile the actual channel uploads before reporting failure. */ }
    }
    if (uploadId && uncertain) {
      try {
        const checked = await invoke("reconcile_uploads", { uploadId });
        if (checked.matchedUpload?.youtubeUrl) {
          const match = checked.matchedUpload;
          showUploadResult("YouTube received this video. The browser lost the final response, but the server found the existing upload and linked it here. No duplicate was created by this recovery.", false, match.youtubeUrl);
          H.toast("Existing YouTube upload verified.");
          await refreshHistory();
          return;
        }
      } catch (reconcileError) {
        console.warn("[YouTube upload] Automatic reconciliation could not finish:", reconcileError?.message || reconcileError);
      }
    }
    if (uploadId) {
      try { await invoke("fail_upload", { uploadId, errorMessage: message, uncertain }); } catch {}
    }
    if (uncertain) {
      const safeMessage = "Upload outcome is not confirmed. The history is marked Needs verification, not Failed. Do not upload the same file again yet. Use “Verify uploads on YouTube” or check YouTube Studio first. Details: " + message;
      showUploadResult(safeMessage, true);
      H.toast("Upload needs verification; no automatic re-upload was started.", "error");
    } else {
      showUploadResult("YouTube rejected the upload request. " + message, true);
      H.toast(message, "error");
    }
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
async function reconcileUploads() {
  const button = $("ytReconcileBtn");
  if (button.disabled) return;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Checking YouTube…";
  try {
    const result = await invoke("reconcile_uploads");
    await refreshHistory();
    const count = Number(result.matchedCount || 0);
    const matched = Array.isArray(result.matches) ? result.matches : [];
    if (count) {
      const links = matched.map(x => String(x.title || "Video") + " — " + String(x.youtubeUrl || "")).join("\n");
      showUploadResult("YouTube checked " + Number(result.checkedVideos || 0) + " recent videos and linked " + count + " existing upload(s) to history. Nothing was re-uploaded.\n" + links, false, matched[0]?.youtubeUrl || "");
      H.toast("Verified " + count + " existing YouTube upload(s).");
    } else if (Number(result.checkedRecords || 0) === 0) {
      showUploadResult("All recent upload records are already reconciled. There are no unresolved uploads left to match. The existing YouTube videos were not uploaded again.", false);
      H.toast("Upload history is already verified.");
    } else {
      showUploadResult("YouTube was checked, but no exact match was found for " + Number(result.checkedRecords || 0) + " unresolved record(s) among the latest " + Number(result.checkedVideos || 0) + " channel videos. No video was uploaded or duplicated. Check YouTube Studio before trying again.", true);
      H.toast("Some uploads still need verification. Nothing was re-published.", "error");
    }
  } catch (err) {
    const message = err?.message || "Could not verify the recent YouTube uploads.";
    showUploadResult("Server-side verification failed; no new video was uploaded. " + message, true);
    H.toast(message, "error");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
async function refreshHistory() {
  $("ytHistoryRefreshBtn").disabled = true;
  try {
    const result = await invoke("history");
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const body = $("ytHistoryBody");
    if (!rows.length) { body.innerHTML = '<tr><td colspan="6" class="yt-history-empty">No YouTube uploads yet.</td></tr>'; return; }
    body.innerHTML = rows.map(row => {
      const time = row.scheduled_at || row.created_at;
      const visibility = row.privacy_status ? row.privacy_status.charAt(0).toUpperCase() + row.privacy_status.slice(1) : "—";
      const link = row.youtube_url && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+/.test(row.youtube_url)
        ? '<a class="yt-mini-link" target="_blank" rel="noopener noreferrer" href="' + H.esc(row.youtube_url) + '">Open video ↗</a><div class="yt-history-id">' + H.esc(row.video_id || "") + "</div>"
        : '<div class="yt-history-id">' + H.esc(row.video_id || "—") + "</div>";
      const err = row.error_message ? '<small class="yt-history-id">' + H.esc(row.error_message) + "</small>" : "";
      const thumbnailLink = row.thumbnail_url && /^https:\/\//.test(row.thumbnail_url) ? '<div class="yt-history-id"><a target="_blank" rel="noopener noreferrer" href="' + H.esc(row.thumbnail_url) + '">Custom thumbnail ↗</a></div>' : "";
      const title = String(row.title || ""), short = title.length > 110 ? title.slice(0,110) + "…" : title;
      const mode = row.upload_mode === "shorts" ? "YouTube Shorts" : "Regular video";
      const shape = row.video_width && row.video_height ? (row.video_width + "×" + row.video_height) : "";
      const duration = Number.isFinite(Number(row.video_duration_seconds)) && row.video_duration_seconds ? (Math.floor(Number(row.video_duration_seconds)/60) + ":" + String(Math.floor(Number(row.video_duration_seconds)%60)).padStart(2,"0")) : "";
      const synthetic = row.contains_synthetic_media ? '<div class="yt-history-id">AI/altered disclosure: yes</div>' : "";
      return "<tr><td>" + H.esc(time ? H.dateTime(time) : "—") + "</td><td><strong>" + H.esc(short) + "</strong><div class=\"yt-history-id\">" + H.esc(row.channel_title || "—") + "</div>" + thumbnailLink + err + "</td><td><strong>" + H.esc(mode) + "</strong><div class=\"yt-history-id\">" + H.esc([shape,duration].filter(Boolean).join(" · ")) + "</div>" + synthetic + "</td><td>" + H.makeStatus(row.status) + "</td><td>" + H.esc(visibility) + (row.scheduled_at ? '<div class="yt-history-id">Publish: ' + H.esc(H.dateTime(row.scheduled_at)) + "</div>" : "") + "</td><td>" + link + "</td></tr>";
    }).join("");
  } catch (err) {
    $("ytHistoryBody").innerHTML = '<tr><td colspan="6" class="yt-history-empty">Could not load history. ' + H.esc(err.message || "") + "</td></tr>";
  } finally { $("ytHistoryRefreshBtn").disabled = false; }
}
function bindEvents() {
  $("ytRefreshBtn").addEventListener("click",refreshStatus);
  $("ytHistoryRefreshBtn").addEventListener("click",refreshHistory);
  $("ytReconcileBtn").addEventListener("click",reconcileUploads);
  $("ytOverviewRefreshBtn").addEventListener("click",refreshOverview);
  $("ytCommunityDraftRefreshBtn").addEventListener("click",refreshCommunityDrafts);
  $("ytSaveCommunityDraftBtn").addEventListener("click",async()=>{
    try{await saveCommunityDraft("draft");H.toast("Community draft saved.");$("ytCommunityResult").hidden=false;$("ytCommunityResult").classList.remove("error");$("ytCommunityResult").textContent="Draft metadata saved. Image files remain on this computer; select them again in YouTube Studio when publishing.";}
    catch(err){H.toast(err.message||"Could not save Community draft.","error");}
  });
  $("ytOpenStudioBtn").addEventListener("click",()=>openCommunityStudio());
  $("ytCommunityImages").addEventListener("change",inspectCommunityImages);
  $("ytCommunityText").addEventListener("input",()=>{
    $("ytCommunityTextCount").textContent=String($("ytCommunityText").value.length);updateCommunityButtons();
  });
  $("ytThumbnailFile").addEventListener("change",async()=>{
    const file=$("ytThumbnailFile").files?.[0];
    if(file&&(!["image/jpeg","image/png"].includes(file.type)||file.size<1||file.size>50*1024*1024)){
      H.toast("Choose a JPEG/PNG thumbnail no larger than 50 MB.","error");$("ytThumbnailFile").value="";
      videoThumbnailPreviewUrl=clearImagePreview("ytThumbnailPreview",videoThumbnailPreviewUrl);return;
    }
    videoThumbnailPreviewUrl=await setThumbnailPreview(file,"ytThumbnailPreview",videoThumbnailPreviewUrl,"Selected custom video thumbnail");
  });
  $("ytExistingVideoId").addEventListener("input",()=>{$("ytApplyExistingThumbnailBtn").disabled=!selectedChannel||busy||!$("ytExistingVideoId").value.trim()||!$("ytExistingThumbnailFile").files?.[0];});
  $("ytExistingThumbnailFile").addEventListener("change",async()=>{
    const file=$("ytExistingThumbnailFile").files?.[0];
    if(file&&(!["image/jpeg","image/png"].includes(file.type)||file.size<1||file.size>50*1024*1024)){
      H.toast("Choose a JPEG/PNG thumbnail no larger than 50 MB.","error");$("ytExistingThumbnailFile").value="";
      existingThumbnailPreviewUrl=clearImagePreview("ytExistingThumbnailPreview",existingThumbnailPreviewUrl);
    }else existingThumbnailPreviewUrl=await setThumbnailPreview(file,"ytExistingThumbnailPreview",existingThumbnailPreviewUrl,"Thumbnail for existing video");
    $("ytApplyExistingThumbnailBtn").disabled=!selectedChannel||busy||!$("ytExistingVideoId").value.trim()||!$("ytExistingThumbnailFile").files?.[0];
  });
  $("ytThumbnailManagerForm").addEventListener("submit",async(event)=>{
    event.preventDefault();if(busy)return;
    const videoId=$("ytExistingVideoId").value.trim(),file=$("ytExistingThumbnailFile").files?.[0];
    if(!videoId||!file){H.toast("Enter a video ID and choose a thumbnail.","error");return;}
    busy=true;$("ytApplyExistingThumbnailBtn").disabled=true;
    try{
      await uploadThumbnail(videoId,file);
      $("ytThumbnailManagerResult").hidden=false;$("ytThumbnailManagerResult").classList.remove("error");$("ytThumbnailManagerResult").replaceChildren();
      $("ytThumbnailManagerResult").textContent="Custom thumbnail set for the existing YouTube video.";
      H.toast("Custom thumbnail set.");
      $("ytExistingThumbnailFile").value="";existingThumbnailPreviewUrl=clearImagePreview("ytExistingThumbnailPreview",existingThumbnailPreviewUrl);
      await refreshHistory();
    }catch(err){
      $("ytThumbnailManagerResult").hidden=false;$("ytThumbnailManagerResult").classList.add("error");
      $("ytThumbnailManagerResult").textContent=err.message||"Could not set thumbnail.";
      H.toast(err.message||"Could not set thumbnail.","error");
    }finally{busy=false;renderChannel(statusData||{});}
  });
  $("ytCommunityDrafts").addEventListener("click",async(event)=>{
    const button=event.target.closest("button[data-community-open],button[data-community-mark],button[data-community-delete]");
    if(!button)return;
    const id=button.dataset.communityOpen||button.dataset.communityMark||button.dataset.communityDelete;
    if(button.dataset.communityOpen){
      try{
        const drafts=await invoke("community_drafts_list"),row=(drafts.rows||[]).find(x=>x.id===id);
        if(row){$("ytCommunityText").value=row.post_text||"";$("ytCommunityTextCount").textContent=String($("ytCommunityText").value.length);activeCommunityDraftId=id;}
        await openCommunityStudio(id);
      }catch(err){H.toast(err.message||"Could not open Community draft.","error");}
      return;
    }
    try{
      if(button.dataset.communityMark){await invoke("community_draft_mark_published",{draftId:id});H.toast("Draft marked as published in YouTube Studio.");}
      else if(button.dataset.communityDelete){if(!confirm("Delete this saved Community draft? No YouTube post will be deleted."))return;await invoke("community_draft_delete",{draftId:id});H.toast("Community draft deleted.");}
      await refreshCommunityDrafts();
    }catch(err){H.toast(err.message||"Could not update Community draft.","error");}
  });
  $("ytConnectBtn").addEventListener("click",connectYouTube);
  $("ytVerifyBtn").addEventListener("click",verifyChannel);
  $("ytDisconnectBtn").addEventListener("click",disconnectChannel);
  $("ytVideoFile").addEventListener("change",inspectFile);
  $("ytTitle").addEventListener("input",()=>$("ytTitleCount").textContent=String($("ytTitle").value.length));
  $("ytDescription").addEventListener("input",updateDescriptionCount);
  $("ytTermsAccepted").addEventListener("change",updateUploadButton);
  document.querySelectorAll('input[name="ytUploadMode"]').forEach(input => input.addEventListener("change", () => { updateModeHint(); updateUploadButton(); }));
  $("ytComposerForm").addEventListener("submit",uploadVideo);
  $("ytClearBtn").addEventListener("click",()=>setTimeout(()=>{
    clearPreview(); $("ytFileInfo").textContent="No video selected."; $("ytVideoMetadata").textContent="Video dimensions and duration will appear here."; $("ytTitleCount").textContent="0"; updateDescriptionCount(); $("ytUploadResult").hidden=true;
    videoThumbnailPreviewUrl=clearImagePreview("ytThumbnailPreview",videoThumbnailPreviewUrl);$("ytThumbnailFile").value="";
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
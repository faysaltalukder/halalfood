import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const GRAPH_VERSION = "v26.0";
const GRAPH_ROOT = "https://graph.facebook.com/" + GRAPH_VERSION;
const MEDIA_BUCKET = "hf-facebook-media";
const REQUIRED_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
const REDIRECT_URI = Deno.env.get("FACEBOOK_APP_REDIRECT_URI") || (SUPABASE_URL + "/functions/v1/facebook-publishing");

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

type Row = Record<string, unknown>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const isSuccess = (status: number) => status >= 200 && status < 300;
const service = () => {
  if (!SERVICE_ROLE_KEY) throw new Error("Supabase service configuration is missing.");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
};
const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

function readJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token.");
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)));
}
async function requireAdmin(req: Request) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return { error: json({ success: false, error: "Sign in to the Halal Food admin dashboard first." }, 401) };
  let claims: Record<string, unknown>;
  try { claims = readJwtPayload(bearer); } catch { return { error: json({ success: false, error: "Invalid admin session." }, 401) }; }
  if (String(claims.email || "").toLowerCase() !== ADMIN_EMAIL || claims.role !== "authenticated" || claims.aal !== "aal2") {
    return { error: json({ success: false, error: "Only the authorized Halal Food admin with completed MFA can use Facebook publishing." }, 403) };
  }
  try {
    const authClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser(bearer);
    if (error || !data.user || String(data.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      return { error: json({ success: false, error: "Your admin session could not be verified. Sign in again." }, 401) };
    }
    return { email: ADMIN_EMAIL };
  } catch {
    return { error: json({ success: false, error: "Admin session verification is currently unavailable." }, 503) };
  }
}
function appConfig() {
  return {
    appIdReady: Boolean(Deno.env.get("FACEBOOK_APP_ID")),
    appSecretReady: Boolean(Deno.env.get("FACEBOOK_APP_SECRET")),
    encryptionKeyReady: (Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY") || "").length >= 32,
    redirectUri: REDIRECT_URI,
  };
}
function configMissing() {
  const config = appConfig();
  return [
    ...(!config.appIdReady ? ["FACEBOOK_APP_ID"] : []),
    ...(!config.appSecretReady ? ["FACEBOOK_APP_SECRET"] : []),
    ...(!config.encryptionKeyReady ? ["FACEBOOK_TOKEN_ENCRYPTION_KEY"] : []),
  ];
}
function tokenCryptoKey() {
  const secret = Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY") || "";
  if (secret.length < 32) throw new Error("FACEBOOK_TOKEN_ENCRYPTION_KEY must contain at least 32 characters.");
  return secret;
}
async function cryptoKeyForTokens(usage: KeyUsage[]) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenCryptoKey()));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usage);
}
async function encryptToken(token: string) {
  const key = await cryptoKeyForTokens(["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return { token_ciphertext: base64(new Uint8Array(cipher)), token_iv: base64(iv) };
}
async function decryptToken(row: Row) {
  const key = await cryptoKeyForTokens(["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(String(row.token_iv)) }, key, fromBase64(String(row.token_ciphertext)));
  return new TextDecoder().decode(plain);
}
function graphUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(GRAPH_ROOT + "/" + path.replace(/^\/+/, ""));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}
async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const response = await fetch(graphUrl(path, params), { headers: { Authorization: "Bearer " + token } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const err = data?.error || {};
    throw Object.assign(new Error(clean(err.message, 350) || "Meta Graph API request failed."), {
      providerCode: clean(err.code, 30), providerSubcode: clean(err.error_subcode, 30), httpStatus: response.status,
    });
  }
  return data;
}
async function graphPost(path: string, token: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const response = await fetch(graphUrl(path), {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const err = data?.error || {};
    throw Object.assign(new Error(clean(err.message, 350) || "Meta did not accept the publishing request."), {
      providerCode: clean(err.code, 30), providerSubcode: clean(err.error_subcode, 30), httpStatus: response.status,
    });
  }
  return data;
}
function canPublish(row: Row) {
  const scopes = Array.isArray(row.granted_scopes) ? row.granted_scopes.map(String) : [];
  const tasks = Array.isArray(row.tasks) ? row.tasks.map(String) : [];
  return REQUIRED_SCOPES.every((scope) => scopes.includes(scope)) && (tasks.includes("CREATE_CONTENT") || tasks.includes("MANAGE"));
}
function publicPage(row: Row) {
  return {
    pageId: row.page_id, pageName: row.page_name, tasks: row.tasks || [],
    grantedScopes: row.granted_scopes || [], isSelected: Boolean(row.is_selected),
    canPublish: canPublish(row), tokenExpiresAt: row.token_expires_at || null,
    lastVerifiedAt: row.last_verified_at || null,
  };
}
function oauthPopupHtml(success: boolean, message: string) {
  const safeMessage = message.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] || c));
  const target = JSON.stringify(ALLOWED_ORIGIN);
  const html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Facebook connection · Halal Food</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#f7f5ef;color:#2b2a3d;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}.card{max-width:440px;background:#fffdf8;border:1px solid #e5e0d6;border-radius:16px;padding:28px;box-shadow:0 10px 35px #2b2a3d14}h1{font-size:22px}p{color:#737487}button{border:0;background:#c97b3d;color:white;font-weight:700;padding:12px 16px;border-radius:10px;cursor:pointer}</style></head><body><main class=\"card\"><h1>" +
    (success ? "Facebook authorization received" : "Facebook connection was not completed") +
    "</h1><p>" + safeMessage + "</p><p>You can close this window and return to the Halal Food dashboard.</p><button onclick=\"window.close()\">Close window</button></main><script>try{if(window.opener){window.opener.postMessage({type:'hf-facebook-oauth-complete',success:" +
    (success ? "true" : "false") + "}," + target + ");}}catch(e){}setTimeout(()=>{try{window.close()}catch(e){}},1200);</script></body></html>";
  return new Response(html, { status: success ? 200 : 400, headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}
async function handleOAuthCallback(url: URL) {
  const code = clean(url.searchParams.get("code"), 4000);
  const state = clean(url.searchParams.get("state"), 200);
  const providerError = url.searchParams.get("error");
  if (providerError) return oauthPopupHtml(false, "Facebook authorization was cancelled or denied. Return to the dashboard and try again.");
  if (!code || !state) return oauthPopupHtml(false, "The callback did not include the required authorization code and state.");
  const db = service();
  const { data: stateRow, error: stateReadError } = await db.from("facebook_oauth_states")
    .select("state,admin_email,expires_at,used_at").eq("state", state).maybeSingle();
  if (stateReadError || !stateRow || stateRow.admin_email !== ADMIN_EMAIL || stateRow.used_at || Date.parse(stateRow.expires_at) <= Date.now()) {
    return oauthPopupHtml(false, "This authorization request is invalid, expired, or already used. Start a fresh connection from the dashboard.");
  }
  const { data: claimedState, error: claimError } = await db.from("facebook_oauth_states")
    .update({ used_at: new Date().toISOString() }).eq("state", state).is("used_at", null)
    .select("state").maybeSingle();
  if (claimError || !claimedState) return oauthPopupHtml(false, "This authorization request has already been processed. Start again from the dashboard.");
  const appId = Deno.env.get("FACEBOOK_APP_ID") || "";
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET") || "";
  if (!appId || !appSecret || !Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY")) {
    return oauthPopupHtml(false, "The publishing server still needs its Meta App secrets configured.");
  }
  try {
    const codeData = await fetch(graphUrl("oauth/access_token", {
      client_id: appId, client_secret: appSecret, redirect_uri: REDIRECT_URI, code,
    })).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || !data?.access_token) throw new Error("Meta could not exchange the authorization code.");
      return data;
    });
    const longData = await fetch(graphUrl("oauth/access_token", {
      grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: codeData.access_token,
    })).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || !data?.access_token) return codeData;
      return data;
    });
    const userToken = String(longData.access_token);
    const results = await Promise.all([
      graphGet("me/permissions", userToken),
      graphGet("me/accounts", userToken, { fields: "id,name,access_token,tasks", limit: "100" }),
    ]);
    const permissionsResponse = results[0], pagesResponse = results[1];
    const scopes = Array.isArray(permissionsResponse?.data)
      ? permissionsResponse.data.filter((p: Row) => p.status === "granted").map((p: Row) => String(p.permission))
      : [];
    const expiresIn = Number(longData.expires_in || codeData.expires_in || 0);
    const tokenExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    let pages = Array.isArray(pagesResponse?.data) ? pagesResponse.data : [];
    let next = pagesResponse?.paging?.next;
    let pageFetches = 0;
    while (next && pageFetches < 8) {
      const response = await fetch(String(next), { headers: { Authorization: "Bearer " + userToken } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) break;
      pages = pages.concat(Array.isArray(data?.data) ? data.data : []);
      next = data?.paging?.next;
      pageFetches++;
    }
    if (!pages.length) return oauthPopupHtml(false, "Facebook authorization succeeded, but no manageable Page was returned. Check your Page access and pages_show_list permission.");
    for (const page of pages) {
      const pageId = clean(page?.id, 100);
      const pageName = clean(page?.name, 160);
      const pageToken = String(page?.access_token || "");
      if (!pageId || !pageName || !pageToken) continue;
      const encrypted = await encryptToken(pageToken);
      const row = {
        page_id: pageId, page_name: pageName,
        tasks: Array.isArray(page?.tasks) ? page.tasks.map((v: unknown) => clean(v, 50)) : [],
        granted_scopes: scopes, ...encrypted, token_expires_at: tokenExpiresAt,
        is_selected: false, connected_by: ADMIN_EMAIL,
        updated_at: new Date().toISOString(), last_verified_at: null,
      };
      const { error } = await db.from("facebook_page_accounts").upsert(row, { onConflict: "page_id" });
      if (error) throw new Error("Facebook pages were found, but the server could not save the encrypted Page credentials.");
    }
    return oauthPopupHtml(true, "Facebook authorization succeeded. Return to the dashboard, refresh the page list, and select the Page you want to publish to.");
  } catch (err) {
    console.error("Facebook OAuth callback failed:", clean((err as Error)?.message, 250));
    return oauthPopupHtml(false, "The server could not complete the Meta connection. Check the App ID, App Secret, callback URL, requested permissions, and server logs.");
  }
}

async function selectedPage(db: ReturnType<typeof service>) {
  const { data, error } = await db.from("facebook_page_accounts").select("*").eq("is_selected", true).maybeSingle();
  if (error) throw new Error("Could not read the selected Facebook Page.");
  if (!data) throw new Error("Connect Facebook and select a Page before publishing.");
  return data as Row;
}
async function getStatus(db: ReturnType<typeof service>) {
  const { data, error } = await db.from("facebook_page_accounts")
    .select("page_id,page_name,tasks,granted_scopes,is_selected,token_expires_at,last_verified_at")
    .order("page_name", { ascending: true });
  if (error) throw new Error("Could not read Facebook Page connection status.");
  const rows = (data || []) as Row[];
  const selected = rows.find((row) => Boolean(row.is_selected)) || null;
  return {
    success: true, graphApiVersion: GRAPH_VERSION, config: appConfig(),
    setupReady: configMissing().length === 0, missingConfig: configMissing(),
    requiredScopes: REQUIRED_SCOPES, redirectUri: REDIRECT_URI,
    pages: rows.map(publicPage), selectedPage: selected ? publicPage(selected) : null,
  };
}
async function invokeMetaPublish(db: ReturnType<typeof service>, page: Row, body: Row, token: string) {
  const postType = clean(body.postType, 20).toLowerCase();
  if (!["text", "link", "photo", "video"].includes(postType)) throw new Error("Choose text, link, photo, or video for this post.");
  const message = clean(body.message, 60000);
  const link = clean(body.link, 2000);
  const mediaPath = clean(body.mediaPath, 500);
  const scheduledAtRaw = clean(body.scheduledAt, 80);
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  if (scheduledAtRaw && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) throw new Error("Choose a valid scheduled date and time.");
  const isScheduled = Boolean(scheduledAt);
  if (isScheduled) {
    const delta = scheduledAt!.getTime() - Date.now();
    if (delta < 10 * 60 * 1000) throw new Error("Facebook scheduling requires a time at least 10 minutes in the future.");
    if (delta > 75 * 24 * 60 * 60 * 1000) throw new Error("Choose a time within the next 75 days.");
  }
  if (!message && !mediaPath && !link) throw new Error("Write a caption or add media/a link before publishing.");
  if (postType === "link" && !/^https?:\/\/\S+$/i.test(link)) throw new Error("Enter a valid http or https link.");
  if ((postType === "photo" || postType === "video") && !mediaPath) throw new Error("Choose and upload the media file first.");
  if ((postType === "text" || postType === "link") && mediaPath) throw new Error("Media is not expected for this post type.");
  if (mediaPath && (!mediaPath.startsWith("posts/") || mediaPath.includes("..") || mediaPath.startsWith("/"))) throw new Error("Invalid media upload path.");
  const pageId = String(page.page_id);
  let mediaUrl = "";
  if (mediaPath) {
    const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUrl(mediaPath, 3600);
    if (error || !data?.signedUrl) throw new Error("The uploaded media could not be prepared for Meta. Upload it again and retry.");
    mediaUrl = data.signedUrl;
  }
  const time = isScheduled ? String(Math.floor(scheduledAt!.getTime() / 1000)) : "";
  let response: Row;
  if (postType === "text" || postType === "link") {
    const fields: Record<string, string> = { message: message || " " };
    if (postType === "link") fields.link = link;
    if (isScheduled) { fields.published = "false"; fields.scheduled_publish_time = time; }
    else fields.published = "true";
    response = await graphPost(pageId + "/feed", token, fields);
  } else if (postType === "photo" && !isScheduled) {
    response = await graphPost(pageId + "/photos", token, { url: mediaUrl, caption: message, published: "true" });
  } else if (postType === "photo" && isScheduled) {
    const photo = await graphPost(pageId + "/photos", token, { url: mediaUrl, published: "false" });
    const photoId = clean(photo?.id, 120);
    if (!photoId) throw new Error("Meta created the photo asset but did not return a photo ID.");
    response = await graphPost(pageId + "/feed", token, {
      message: message || " ", "attached_media[0]": JSON.stringify({ media_fbid: photoId }),
      published: "false", scheduled_publish_time: time,
    });
  } else {
    const fields: Record<string, string> = { file_url: mediaUrl, description: message, published: isScheduled ? "false" : "true" };
    if (isScheduled) fields.scheduled_publish_time = time;
    response = await graphPost(pageId + "/videos", token, fields);
  }
  const objectId = clean(response?.post_id || response?.id, 180);
  if (!objectId) throw new Error("Meta accepted the request without returning a post/video ID. Check Page Publishing before retrying to avoid duplicates.");
  let permalink = "";
  try {
    const permalinkData = await graphGet(objectId, token, { fields: "permalink_url" });
    permalink = clean(permalinkData?.permalink_url, 2000);
  } catch { /* A permalink may not be available immediately for a video. */ }
  return { postType, message, link, mediaPath, isScheduled, scheduledAt, objectId, permalink, status: isScheduled ? "scheduled" : "published" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  if (req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("error") || url.searchParams.has("state"))) {
    try { return await handleOAuthCallback(url); }
    catch (err) {
      console.error("Facebook callback failure:", clean((err as Error)?.message, 200));
      return oauthPopupHtml(false, "The connection callback failed. Start again from the Halal Food dashboard.");
    }
  }
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if ((req.headers.get("origin") || "") !== ALLOWED_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  let body: Row;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON request." }, 400); }
  const action = clean(body?.action, 40).toLowerCase();
  let db: ReturnType<typeof service>;
  try { db = service(); } catch { return json({ success: false, error: "Server database configuration is unavailable." }, 503); }

  try {
    if (action === "status") return json(await getStatus(db));
    if (action === "connect") {
      const missing = configMissing();
      if (missing.length) return json({ success: false, error: "Facebook publishing is not configured on the server yet.", missing }, 503);
      const state = crypto.randomUUID();
      const { error } = await db.from("facebook_oauth_states").insert({
        state, admin_email: ADMIN_EMAIL, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) throw new Error("Could not start a secure Facebook connection. Check server database access.");
      const authUrl = new URL("https://www.facebook.com/" + GRAPH_VERSION + "/dialog/oauth");
      authUrl.searchParams.set("client_id", Deno.env.get("FACEBOOK_APP_ID") || "");
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", REQUIRED_SCOPES.join(","));
      authUrl.searchParams.set("auth_type", "rerequest");
      authUrl.searchParams.set("return_scopes", "true");
      return json({ success: true, authUrl: authUrl.toString(), redirectUri: REDIRECT_URI });
    }
    if (action === "select_page") {
      const pageId = clean(body?.pageId, 100);
      if (!/^\d{5,40}$/.test(pageId)) return json({ success: false, error: "Choose a valid Facebook Page." }, 400);
      const { data: page, error } = await db.from("facebook_page_accounts").select("*").eq("page_id", pageId).maybeSingle();
      if (error || !page) return json({ success: false, error: "That Page is not in the list. Reconnect Facebook and refresh." }, 404);
      if (!canPublish(page)) return json({ success: false, error: "This Page is missing a required permission or the CREATE_CONTENT Page task. Check the granted permissions and your Page access." }, 403);
      const { error: clearError } = await db.from("facebook_page_accounts").update({ is_selected: false }).eq("is_selected", true);
      if (clearError) throw new Error("Could not change the selected Facebook Page.");
      const { error: chooseError } = await db.from("facebook_page_accounts").update({ is_selected: true, updated_at: new Date().toISOString() }).eq("page_id", pageId);
      if (chooseError) throw new Error("Could not select the Facebook Page.");
      return json({ success: true, selectedPage: { pageId, pageName: page.page_name } });
    }
    if (action === "verify_page") {
      const page = await selectedPage(db);
      const token = await decryptToken(page);
      const checked = await graphGet(String(page.page_id), token, { fields: "id,name" });
      if (String(checked?.id) !== String(page.page_id)) throw new Error("Meta returned a different Page ID than the selected Page.");
      await db.from("facebook_page_accounts").update({ page_name: clean(checked.name, 160), last_verified_at: new Date().toISOString() }).eq("page_id", String(page.page_id));
      return json({ success: true, pageId: String(checked.id), pageName: clean(checked.name, 160), verifiedAt: new Date().toISOString() });
    }

    if (action === "queue_history") {
      const { data, error } = await db.from("post_queue")
        .select("id,platform,post_type,message,link,media_path,publish_at,status,external_id,permalink,error,created_by,created_at")
        .eq("platform", "facebook")
        .order("publish_at", { ascending: false })
        .limit(50);
      if (error) throw new Error("Could not load the automated publishing queue.");
      return json({ success: true, rows: data || [] });
    }
    if (action === "cancel_queued") {
      const queueId = clean(body?.queueId, 80);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(queueId)) {
        return json({ success: false, error: "Choose a valid queued post." }, 400);
      }
      const { data, error } = await db.from("post_queue")
        .update({ status: "cancelled", error: null })
        .eq("id", queueId).eq("platform", "facebook").eq("status", "pending")
        .select("id,status").maybeSingle();
      if (error) throw new Error("Could not cancel this queued post.");
      if (!data) return json({ success: false, error: "Only a pending post can be cancelled. Refresh the queue to check its latest status." }, 409);
      return json({ success: true, queueId: data.id, status: data.status });
    }
    if (action === "queue_post") {
      const page = await selectedPage(db);
      if (!canPublish(page)) return json({ success: false, error: "This Page no longer has the publishing permissions required. Reconnect Facebook and select the Page again." }, 403);

      const postType = clean(body?.postType, 20).toLowerCase();
      const message = clean(body?.message, 60000);
      const link = clean(body?.link, 2000);
      const mediaPath = clean(body?.mediaPath, 500);
      const scheduledAtRaw = clean(body?.scheduledAt, 80);
      const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
      if (!["text", "link", "photo", "video"].includes(postType)) throw new Error("Choose text, link, photo, or video for this post.");
      if (!scheduledAtRaw || !scheduledAt || Number.isNaN(scheduledAt.getTime())) throw new Error("Choose a valid schedule date and time for the automated queue.");
      const delay = scheduledAt.getTime() - Date.now();
      if (delay < 10 * 60 * 1000) throw new Error("Automated publishing requires a time at least 10 minutes in the future.");
      if (delay > 75 * 24 * 60 * 60 * 1000) throw new Error("Choose a scheduled time within the next 75 days.");
      if (!message && !link && !mediaPath) throw new Error("Write a caption or attach a link/photo/video before queueing.");
      if (postType === "link" && !/^https?:\/\/\S+$/i.test(link)) throw new Error("Enter a valid public http or https link.");
      if ((postType === "photo" || postType === "video") && !mediaPath) throw new Error("Choose and upload the media file first.");
      if ((postType === "text" || postType === "link") && mediaPath) throw new Error("Media is not expected for a text or link post.");
      if (mediaPath && (!mediaPath.startsWith("posts/") || mediaPath.includes("..") || mediaPath.startsWith("/"))) {
        throw new Error("Invalid media upload path.");
      }

      const { data: platform, error: platformError } = await db.from("platform_settings")
        .select("enabled,daily_limit").eq("platform", "facebook").maybeSingle();
      if (platformError || !platform) throw new Error("Could not verify Facebook automation settings.");
      if (!platform.enabled) throw new Error("Facebook automated publishing is disabled in platform settings.");
      const dailyLimit = Math.max(0, Math.min(100, Number(platform.daily_limit) || 0));
      if (dailyLimit < 1) throw new Error("Facebook's daily automated publishing limit is set to zero.");

      const dhakaDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(scheduledAt);
      const dayStart = new Date(dhakaDay + "T00:00:00+06:00").toISOString();
      const nextDay = new Date(new Date(dhakaDay + "T00:00:00+06:00").getTime() + 86400000);
      const dayEnd = nextDay.toISOString();

      const [queuedCount, publishedCount, metaScheduledCount] = await Promise.all([
        db.from("post_queue").select("id", { count: "exact", head: true })
          .eq("platform", "facebook").in("status", ["pending", "processing"])
          .gte("publish_at", dayStart).lt("publish_at", dayEnd),
        db.from("facebook_publish_history").select("id", { count: "exact", head: true })
          .eq("status", "published").gte("published_at", dayStart).lt("published_at", dayEnd),
        db.from("facebook_publish_history").select("id", { count: "exact", head: true })
          .eq("status", "scheduled").gte("scheduled_at", dayStart).lt("scheduled_at", dayEnd)
      ]);
      if (queuedCount.error || publishedCount.error || metaScheduledCount.error) {
        throw new Error("Could not verify the daily publishing limit. Refresh and retry.");
      }
      const usedSlots = (queuedCount.count || 0) + (publishedCount.count || 0) + (metaScheduledCount.count || 0);
      if (usedSlots >= dailyLimit) {
        throw new Error("The Facebook daily limit of " + dailyLimit + " posts is already reserved for " + dhakaDay + ". Choose another date or review the existing queue.");
      }

      if (mediaPath) {
        const { data: signed, error: mediaError } = await db.storage.from(MEDIA_BUCKET).createSignedUrl(mediaPath, 3600);
        if (mediaError || !signed?.signedUrl) throw new Error("The uploaded media could not be verified in private storage. Upload it again and retry.");
      }

      const { data: row, error: insertError } = await db.from("post_queue").insert({
        platform: "facebook",
        post_type: postType,
        message,
        link: link || null,
        media_path: mediaPath || null,
        publish_at: scheduledAt.toISOString(),
        status: "pending",
        created_by: ADMIN_EMAIL
      }).select("id,status,publish_at").single();
      if (insertError || !row) throw new Error("Could not save the automated post. Refresh the queue before retrying.");
      return json({
        success: true,
        queueId: row.id,
        status: row.status,
        postType,
        scheduledAt: row.publish_at,
        dailyLimit,
        remainingSlots: Math.max(0, dailyLimit - usedSlots - 1)
      });
    }
    if (action === "history") {
      const { data, error } = await db.from("facebook_publish_history").select("id,page_id,page_name,post_type,status,message,media_object_path,facebook_post_id,permalink_url,scheduled_at,published_at,error_code,error_message,created_by,created_at,updated_at").order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error("Could not load Facebook publishing history.");
      return json({ success: true, rows: data || [] });
    }
    if (action === "disconnect") {
      const page = await selectedPage(db).catch(() => null);
      if (!page) return json({ success: true, disconnected: true });
      const { error } = await db.from("facebook_page_accounts").delete().eq("page_id", String(page.page_id));
      if (error) throw new Error("Could not remove the selected Page connection.");
      return json({ success: true, disconnected: true, pageName: page.page_name });
    }
    if (action === "publish") {
      const page = await selectedPage(db);
      if (!canPublish(page)) return json({ success: false, error: "This Page no longer has the publishing permissions required. Reconnect Facebook and select the Page again." }, 403);
      const token = await decryptToken(page);
      const draft = {
        page_id: String(page.page_id), page_name: String(page.page_name),
        post_type: clean(body?.postType, 20).toLowerCase(), status: "failed",
        message: clean(body?.message, 60000), media_object_path: clean(body?.mediaPath, 500) || null,
        created_by: ADMIN_EMAIL, updated_at: new Date().toISOString(),
      };
      try {
        const result = await invokeMetaPublish(db, page, body, token);
        const record = {
          ...draft, post_type: result.postType, status: result.status, message: result.message,
          media_object_path: result.mediaPath || null, facebook_post_id: result.objectId,
          permalink_url: result.permalink || null,
          scheduled_at: result.isScheduled ? result.scheduledAt!.toISOString() : null,
          published_at: result.isScheduled ? null : new Date().toISOString(),
          error_code: null, error_message: null,
        };
        const { error: historyError } = await db.from("facebook_publish_history").insert(record);
        return json({
          success: true, status: result.status, pageName: page.page_name, postType: result.postType,
          facebookPostId: result.objectId, permalinkUrl: result.permalink || null,
          scheduledAt: result.isScheduled ? result.scheduledAt!.toISOString() : null,
          warning: historyError ? "Meta accepted the post, but the dashboard could not save the history record." : null,
        });
      } catch (err) {
        const e = err as Error & { providerCode?: string; providerSubcode?: string; httpStatus?: number };
        await db.from("facebook_publish_history").insert({
          ...draft, error_code: clean(e.providerCode, 30) || null, error_message: clean(e.message, 500),
        });
        return json({
          success: false, error: clean(e.message, 500) || "Facebook publishing failed.",
          providerCode: clean(e.providerCode, 30) || null, providerSubcode: clean(e.providerSubcode, 30) || null,
          httpStatus: Number(e.httpStatus) || null,
        }, 502);
      }
    }
    return json({ success: false, error: "Unsupported Facebook publishing action." }, 400);
  } catch (err) {
    const e = err as Error & { providerCode?: string; providerSubcode?: string; httpStatus?: number };
    return json({
      success: false, error: clean(e.message, 500) || "Facebook publishing request failed.",
      providerCode: clean(e.providerCode, 30) || null, providerSubcode: clean(e.providerSubcode, 30) || null,
      httpStatus: Number(e.httpStatus) || null,
    }, 400);
  }
});
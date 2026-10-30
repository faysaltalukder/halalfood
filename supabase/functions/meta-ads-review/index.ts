import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const GRAPH_VERSION = "v26.0";
const GRAPH_ROOT = "https://graph.facebook.com/" + GRAPH_VERSION;
const REQUIRED_SCOPES = ["ads_read"];
const REDIRECT_URI = Deno.env.get("META_ADS_REVIEW_REDIRECT_URI") || (SUPABASE_URL + "/functions/v1/meta-ads-review");

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
const svc = () => {
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
    return { error: json({ success: false, error: "Only the authorized Halal Food admin with completed MFA can use this Meta Ads connection." }, 403) };
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
  const encryptionSecret = Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY") || "";
  return {
    appIdReady: Boolean(Deno.env.get("FACEBOOK_APP_ID")),
    appSecretReady: Boolean(Deno.env.get("FACEBOOK_APP_SECRET")),
    encryptionKeyReady: encryptionSecret.length >= 32,
    redirectUri: REDIRECT_URI,
  };
}
function missingConfig() {
  const c = appConfig();
  return [
    ...(!c.appIdReady ? ["FACEBOOK_APP_ID"] : []),
    ...(!c.appSecretReady ? ["FACEBOOK_APP_SECRET"] : []),
    ...(!c.encryptionKeyReady ? ["FACEBOOK_TOKEN_ENCRYPTION_KEY"] : []),
  ];
}
async function cryptoKey(usage: KeyUsage[]) {
  const secret = Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY") || "";
  if (secret.length < 32) throw new Error("FACEBOOK_TOKEN_ENCRYPTION_KEY must contain at least 32 characters.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, usage);
}
async function encryptToken(token: string) {
  const key = await cryptoKey(["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return { token_ciphertext: base64(new Uint8Array(cipher)), token_iv: base64(iv) };
}
async function decryptToken(row: Row) {
  const key = await cryptoKey(["decrypt"]);
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
    throw Object.assign(new Error(clean(err.message, 350) || "Meta Marketing API request failed."), {
      providerCode: clean(err.code, 30), providerSubcode: clean(err.error_subcode, 30), httpStatus: response.status,
    });
  }
  return data;
}
function oauthPopupHtml(success: boolean, message: string) {
  const safeMessage = message.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] || c));
  const target = JSON.stringify(ALLOWED_ORIGIN);
  const html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Meta Ads connection · Halal Food</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#f7f5ef;color:#2b2a3d;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}.card{max-width:440px;background:#fffdf8;border:1px solid #e5e0d6;border-radius:16px;padding:28px;box-shadow:0 10px 35px #2b2a3d14}h1{font-size:22px}p{color:#737487}button{border:0;background:#c97b3d;color:white;font-weight:700;padding:12px 16px;border-radius:10px;cursor:pointer}</style></head><body><main class=\"card\"><h1>" +
    (success ? "Meta Ads authorization received" : "Meta Ads connection was not completed") +
    "</h1><p>" + safeMessage + "</p><p>You can close this window and return to the Halal Food dashboard.</p><button onclick=\"window.close()\">Close window</button></main><script>try{if(window.opener){window.opener.postMessage({type:'hf-meta-ads-review-oauth-complete',success:" +
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
  if (providerError) return oauthPopupHtml(false, "Meta authorization was cancelled or denied. Return to the dashboard and try again.");
  if (!code || !state) return oauthPopupHtml(false, "The callback did not include the required authorization code and state.");
  const db = svc();
  const { data: stateRow, error: stateReadError } = await db.from("meta_ads_oauth_states")
    .select("state,admin_email,expires_at,used_at").eq("state", state).maybeSingle();
  if (stateReadError || !stateRow || stateRow.admin_email !== ADMIN_EMAIL || stateRow.used_at || Date.parse(stateRow.expires_at) <= Date.now()) {
    return oauthPopupHtml(false, "This authorization request is invalid, expired, or already used. Start a fresh connection from the dashboard.");
  }
  const { data: claimed, error: claimError } = await db.from("meta_ads_oauth_states")
    .update({ used_at: new Date().toISOString() }).eq("state", state).is("used_at", null).select("state").maybeSingle();
  if (claimError || !claimed) return oauthPopupHtml(false, "This authorization request has already been processed. Start again from the dashboard.");
  const appId = Deno.env.get("FACEBOOK_APP_ID") || "";
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET") || "";
  if (!appId || !appSecret || !Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY")) {
    return oauthPopupHtml(false, "The server is missing one or more Meta App secrets.");
  }
  try {
    const shortData = await fetch(graphUrl("oauth/access_token", {
      client_id: appId, client_secret: appSecret, redirect_uri: REDIRECT_URI, code,
    })).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || !data?.access_token) throw new Error("Meta could not exchange the authorization code.");
      return data;
    });
    const longData = await fetch(graphUrl("oauth/access_token", {
      grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: String(shortData.access_token),
    })).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error || !data?.access_token) return shortData;
      return data;
    });
    const token = String(longData.access_token);
    const perms = await graphGet("me/permissions", token);
    const scopes = Array.isArray(perms?.data) ? perms.data.filter((p: Row) => p.status === "granted").map((p: Row) => String(p.permission)) : [];
    if (!REQUIRED_SCOPES.every((s) => scopes.includes(s))) {
      return oauthPopupHtml(false, "Meta login completed, but ads_read was not granted. Reconnect and approve the read-only Ads permission.");
    }
    const encrypted = await encryptToken(token);
    const expiresIn = Number(longData.expires_in || shortData.expires_in || 0);
    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const { error: saveError } = await db.from("meta_ads_review_connection").upsert({
      singleton: true, ...encrypted, granted_scopes: scopes, token_expires_at: expiresAt,
      connected_by: ADMIN_EMAIL, updated_at: new Date().toISOString(), last_verified_at: new Date().toISOString(),
    }, { onConflict: "singleton" });
    if (saveError) throw new Error("Meta authorization succeeded, but the server could not save the encrypted token.");
    await syncAccounts(db, token);
    return oauthPopupHtml(true, "Meta Ads connected with read-only ads_read permission. Return to the dashboard and load the ad accounts.");
  } catch (err) {
    console.error("Meta Ads OAuth callback failed:", clean((err as Error)?.message, 220));
    return oauthPopupHtml(false, "The server could not complete the Meta Ads connection. Verify the App ID, App Secret, redirect URI, and Ads permission.");
  }
}
function publicAccount(row: Row) {
  return {
    accountId: row.account_id, numericAccountId: row.numeric_account_id, name: row.account_name,
    accountStatus: row.account_status, currency: row.currency, timezoneName: row.timezone_name,
    disableReason: row.disable_reason, isSelected: Boolean(row.is_selected), lastVerifiedAt: row.last_verified_at || null,
  };
}
async function syncAccounts(db: ReturnType<typeof svc>, token: string) {
  const { data: priorRows } = await db.from("meta_ads_review_accounts").select("account_id,is_selected");
  const selectedPrior = (priorRows || []).find((row: Row) => Boolean(row.is_selected))?.account_id || null;
  const accounts: Row[] = [];
  let response = await graphGet("me/adaccounts", token, { fields: "id,account_id,name,account_status,currency,timezone_name,disable_reason", limit: "100" });
  accounts.push(...(Array.isArray(response?.data) ? response.data : []));
  let next = response?.paging?.next;
  let loops = 0;
  while (next && loops < 8) {
    const page = await fetch(String(next), { headers: { Authorization: "Bearer " + token } });
    const data = await page.json().catch(() => ({}));
    if (!page.ok || data?.error) break;
    accounts.push(...(Array.isArray(data?.data) ? data.data : []));
    next = data?.paging?.next;
    loops++;
  }
  await db.from("meta_ads_review_accounts").update({ is_selected: false }).eq("is_selected", true);
  const rows = accounts.filter((a) => a?.id && a?.name).map((a) => ({
    account_id: String(a.id), numeric_account_id: clean(a.account_id, 100) || null, account_name: clean(a.name, 200),
    account_status: Number.isFinite(Number(a.account_status)) ? Number(a.account_status) : null,
    currency: clean(a.currency, 12) || null, timezone_name: clean(a.timezone_name, 100) || null,
    disable_reason: Number.isFinite(Number(a.disable_reason)) ? Number(a.disable_reason) : null,
    is_selected: false, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await db.from("meta_ads_review_accounts").upsert(rows, { onConflict: "account_id" });
    if (error) throw new Error("Meta returned ad accounts, but the server could not save the account list.");
    const desired = rows.some((r) => r.account_id === selectedPrior) ? selectedPrior : null;
    if (desired) await db.from("meta_ads_review_accounts").update({ is_selected: true }).eq("account_id", desired);
  }
  return rows.length;
}
async function getStatus(db: ReturnType<typeof svc>) {
  const config = appConfig();
  const [connectionResult, accountsResult] = await Promise.all([
    db.from("meta_ads_review_connection").select("granted_scopes,token_expires_at,connected_by,last_verified_at,updated_at").eq("singleton", true).maybeSingle(),
    db.from("meta_ads_review_accounts").select("*").order("account_name", { ascending: true }),
  ]);
  if (connectionResult.error || accountsResult.error) throw new Error("Could not read Meta Ads connection status.");
  const connection = connectionResult.data;
  const accounts = accountsResult.data || [];
  return {
    success: true, graphApiVersion: GRAPH_VERSION, config,
    setupReady: missingConfig().length === 0, missingConfig: missingConfig(),
    requiredScopes: REQUIRED_SCOPES, redirectUri: REDIRECT_URI,
    connected: Boolean(connection),
    grantedScopes: connection?.granted_scopes || [],
    tokenExpiresAt: connection?.token_expires_at || null,
    lastVerifiedAt: connection?.last_verified_at || null,
    accounts: accounts.map(publicAccount),
    selectedAccount: accounts.map(publicAccount).find((a: Row) => a.isSelected) || null,
  };
}
async function getConnection(db: ReturnType<typeof svc>) {
  const { data, error } = await db.from("meta_ads_review_connection").select("*").eq("singleton", true).maybeSingle();
  if (error || !data) throw new Error("Connect Meta Ads first, then refresh the account list.");
  return { row: data as Row, token: await decryptToken(data as Row) };
}
async function selectedAccount(db: ReturnType<typeof svc>) {
  const { data, error } = await db.from("meta_ads_review_accounts").select("*").eq("is_selected", true).maybeSingle();
  if (error || !data) throw new Error("Choose an ad account before loading campaigns.");
  return data as Row;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  if (req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("error") || url.searchParams.has("state"))) {
    try { return await handleOAuthCallback(url); }
    catch (err) {
      console.error("Meta Ads callback failure:", clean((err as Error)?.message, 200));
      return oauthPopupHtml(false, "The Meta Ads callback failed. Start again from the Halal Food dashboard.");
    }
  }
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if ((req.headers.get("origin") || "") !== ALLOWED_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  let body: Row;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON request." }, 400); }
  const action = clean(body?.action, 40).toLowerCase();
  let db: ReturnType<typeof svc>;
  try { db = svc(); } catch { return json({ success: false, error: "Server database configuration is unavailable." }, 503); }
  try {
    if (action === "status") return json(await getStatus(db));
    if (action === "connect") {
      const missing = missingConfig();
      if (missing.length) return json({ success: false, error: "Meta Ads connection is not configured on the server yet.", missing }, 503);
      const state = crypto.randomUUID();
      const { error } = await db.from("meta_ads_oauth_states").insert({
        state, admin_email: ADMIN_EMAIL, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) throw new Error("Could not start a secure Meta Ads connection.");
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
    if (action === "sync_accounts") {
      const { row, token } = await getConnection(db);
      const count = await syncAccounts(db, token);
      await db.from("meta_ads_review_connection").update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("singleton", true);
      return json({ success: true, accountsSynced: count });
    }
    if (action === "select_account") {
      const accountId = clean(body?.accountId, 100);
      if (!/^act_\d+$/.test(accountId)) return json({ success: false, error: "Select a valid ad account from the returned list." }, 400);
      const { data: account, error: readError } = await db.from("meta_ads_review_accounts").select("account_id,account_name").eq("account_id", accountId).maybeSingle();
      if (readError || !account) return json({ success: false, error: "That ad account is not in the connected account list. Refresh it and try again." }, 404);
      await db.from("meta_ads_review_accounts").update({ is_selected: false }).eq("is_selected", true);
      const { error } = await db.from("meta_ads_review_accounts").update({ is_selected: true, updated_at: new Date().toISOString() }).eq("account_id", accountId);
      if (error) throw new Error("Could not select the ad account.");
      return json({ success: true, selectedAccount: { accountId, name: account.account_name } });
    }
    if (action === "campaigns" || action === "ads") {
      const { row, token } = await getConnection(db);
      const account = await selectedAccount(db);
      const accountId = String(account.account_id);
      await db.from("meta_ads_review_connection").update({ last_verified_at: new Date().toISOString() }).eq("singleton", true);
      if (action === "campaigns") {
        const data = await graphGet(accountId + "/campaigns", token, {
          fields: "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,special_ad_categories",
          limit: "50",
        });
        return json({ success: true, account: publicAccount(account), rows: (Array.isArray(data?.data) ? data.data : []).map((r: Row) => ({
          id: clean(r.id, 100), name: clean(r.name, 200), status: clean(r.status, 40),
          effectiveStatus: clean(r.effective_status, 60), objective: clean(r.objective, 80),
          buyingType: clean(r.buying_type, 40), dailyBudget: r.daily_budget ?? null, lifetimeBudget: r.lifetime_budget ?? null,
          startTime: r.start_time || null, stopTime: r.stop_time || null, createdTime: r.created_time || null, updatedTime: r.updated_time || null,
          specialAdCategories: Array.isArray(r.special_ad_categories) ? r.special_ad_categories : [],
        })) });
      }
      const data = await graphGet(accountId + "/ads", token, {
        fields: "id,name,status,effective_status,adset_id,campaign_id,created_time,updated_time,creative{id,name,object_story_spec,link_url,object_url,thumbnail_url}",
        limit: "50",
      });
      return json({ success: true, account: publicAccount(account), rows: (Array.isArray(data?.data) ? data.data : []).map((r: Row) => {
        const creative = (r.creative && typeof r.creative === "object") ? r.creative as Row : {};
        const spec = (creative.object_story_spec && typeof creative.object_story_spec === "object") ? creative.object_story_spec as Row : {};
        const linkData = (spec.link_data && typeof spec.link_data === "object") ? spec.link_data as Row : {};
        const videoData = (spec.video_data && typeof spec.video_data === "object") ? spec.video_data as Row : {};
        const storyData = (spec.page_welcome_message && typeof spec.page_welcome_message === "object") ? spec.page_welcome_message as Row : {};
        const message = clean(linkData.message || videoData.message || "", 5000);
        const title = clean(linkData.name || videoData.title || creative.name || r.name, 300);
        const desc = clean(linkData.description || videoData.description || "", 1500);
        const link = clean(linkData.link || creative.link_url || creative.object_url || "", 2000);
        const thumbnail = clean(linkData.picture || videoData.image_url || creative.thumbnail_url || "", 2000);
        return {
          id: clean(r.id, 100), name: clean(r.name, 200), status: clean(r.status, 40), effectiveStatus: clean(r.effective_status, 60),
          adsetId: clean(r.adset_id, 100), campaignId: clean(r.campaign_id, 100), createdTime: r.created_time || null, updatedTime: r.updated_time || null,
          creativeId: clean(creative.id, 100), creativeName: clean(creative.name, 200), primaryText: message, headline: title,
          description: desc, destinationUrl: link, creativeUrl: thumbnail,
        };
      }) });
    }
    if (action === "disconnect") {
      const { error: tokenError } = await db.from("meta_ads_review_connection").delete().eq("singleton", true);
      if (tokenError) throw new Error("Could not remove the Meta Ads connection.");
      const { error: accountError } = await db.from("meta_ads_review_accounts").delete().neq("account_id", "");
      if (accountError) throw new Error("Connection removed, but the cached ad account list could not be cleared.");
      return json({ success: true, disconnected: true });
    }
    return json({ success: false, error: "Unsupported Meta Ads review action." }, 400);
  } catch (err) {
    const e = err as Error & { providerCode?: string; providerSubcode?: string; httpStatus?: number };
    return json({
      success: false, error: clean(e.message, 500) || "Meta Ads request failed.",
      providerCode: clean(e.providerCode, 30) || null, providerSubcode: clean(e.providerSubcode, 30) || null,
      httpStatus: Number(e.httpStatus) || null,
    }, 400);
  }
});
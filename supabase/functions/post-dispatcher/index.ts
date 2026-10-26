import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const GRAPH = "https://graph.facebook.com/v26.0";
const MEDIA_BUCKET = "hf-facebook-media";
const REQUIRED_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Row = Record<string, any>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const clean = (value: unknown, max = 500) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

function dhakaDayWindow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const item = (name: string) => parts.find((part) => part.type === name)?.value || "";
  const day = item("year") + "-" + item("month") + "-" + item("day");
  const start = new Date(day + "T00:00:00+06:00");
  const end = new Date(start.getTime() + 86400000);
  return { day, start: start.toISOString(), end: end.toISOString() };
}

function canPublish(page: Row) {
  const scopes = Array.isArray(page.granted_scopes) ? page.granted_scopes.map(String) : [];
  const tasks = Array.isArray(page.tasks) ? page.tasks.map(String) : [];
  return REQUIRED_SCOPES.every((scope) => scopes.includes(scope))
    && (tasks.includes("CREATE_CONTENT") || tasks.includes("MANAGE"));
}

async function pageToken(row: Row) {
  const secret = Deno.env.get("FACEBOOK_TOKEN_ENCRYPTION_KEY") || "";
  if (secret.length < 32) throw new Error("Facebook token encryption is not configured.");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(String(row.token_iv)) },
    key,
    fromB64(String(row.token_ciphertext)),
  );
  return new TextDecoder().decode(plain);
}

async function graphPost(path: string, token: string, fields: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(GRAPH + "/" + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams(fields).toString(),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const providerError = data?.error || {};
      throw Object.assign(new Error(
        clean(providerError.message, 350) || "Meta rejected the automated post.",
      ), {
        providerCode: clean(providerError.code, 40),
        providerSubcode: clean(providerError.error_subcode, 40),
        httpStatus: response.status,
      });
    }
    return data as Row;
  } finally {
    clearTimeout(timer);
  }
}

async function mediaUrlFor(pathValue: unknown) {
  const path = clean(pathValue, 500);
  if (!/^posts\/[A-Za-z0-9._-]{1,180}$/.test(path) || path.includes("..")) {
    throw new Error("The queued media path is invalid. Re-upload the file before trying again.");
  }
  const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    throw new Error("The queued media could not be accessed in private storage. Review the file before retrying.");
  }
  return data.signedUrl;
}

async function publishQueuedPost(post: Row, page: Row, token: string) {
  const postType = clean(post.post_type, 20).toLowerCase();
  const message = clean(post.message, 60000);
  const link = clean(post.link, 2000);
  let response: Row;

  if (postType === "text" || postType === "link") {
    const fields: Record<string, string> = { message: message || " " };
    if (postType === "link") {
      if (!/^https?:\/\/\S+$/i.test(link)) throw new Error("The queued link is invalid. Review the post before trying again.");
      fields.link = link;
    }
    response = await graphPost(String(page.page_id) + "/feed", token, fields);
  } else if (postType === "photo") {
    const mediaUrl = await mediaUrlFor(post.media_path);
    response = await graphPost(String(page.page_id) + "/photos", token, {
      url: mediaUrl, caption: message, published: "true",
    });
  } else if (postType === "video") {
    const mediaUrl = await mediaUrlFor(post.media_path);
    response = await graphPost(String(page.page_id) + "/videos", token, {
      file_url: mediaUrl, description: message, published: "true",
    });
  } else {
    throw new Error("This queued post format is not supported.");
  }

  const objectId = clean(response?.post_id || response?.id, 180);
  if (!objectId) {
    throw new Error("Meta returned no post ID. The result may be uncertain; verify the Facebook Page before attempting another post.");
  }

  let permalink = "";
  try {
    const url = new URL(GRAPH + "/" + encodeURIComponent(objectId));
    url.searchParams.set("fields", "permalink_url");
    const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const data = await response.json().catch(() => ({}));
    if (response.ok && !data?.error) permalink = clean(data?.permalink_url, 2000);
  } catch {
    // The post is already accepted; a permalink can be unavailable immediately after publication.
  }

  return { postType, message, mediaPath: clean(post.media_path, 500) || null, objectId, permalink };
}

async function recordFailure(post: Row, page: Row, message: string, providerCode = "") {
  const now = new Date().toISOString();
  const safeMessage = clean(message, 500) || "The automated post failed.";
  await db.from("post_queue").update({ status: "failed", error: safeMessage }).eq("id", post.id);
  const { error } = await db.from("facebook_publish_history").insert({
    page_id: String(page.page_id),
    page_name: clean(page.page_name, 160) || "Facebook Page",
    post_type: clean(post.post_type, 20).toLowerCase(),
    status: "failed",
    message: clean(post.message, 60000),
    media_object_path: clean(post.media_path, 500) || null,
    scheduled_at: post.publish_at || null,
    published_at: null,
    error_code: clean(providerCode, 40) || null,
    error_message: safeMessage,
    created_by: clean(post.created_by, 180) || ADMIN_EMAIL,
    updated_at: now,
  });
  return !error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ success: false, error: "Server database configuration is unavailable." }, 503);

  const dispatchSecret = req.headers.get("x-dispatch-secret") || "";
  const { data: authorized, error: authError } = await db.rpc("check_dispatch_secret", { p_secret: dispatchSecret });
  if (authError || authorized !== true) return json({ success: false, error: "Forbidden." }, 403);

  try {
    const { data: settings, error: settingsError } = await db.from("platform_settings")
      .select("enabled,daily_limit").eq("platform", "facebook").maybeSingle();
    if (settingsError || !settings) return json({ success: false, error: "Facebook automation settings could not be loaded." }, 503);
    if (!settings.enabled) return json({ success: true, processed: 0, skipped: "Facebook automation is disabled." });
    const dailyLimit = Math.max(0, Math.min(100, Number(settings.daily_limit) || 0));
    if (dailyLimit < 1) return json({ success: true, processed: 0, skipped: "Facebook daily limit is zero." });

    // Check the Page and token before claiming rows so a temporary connection issue does not consume queued posts.
    const { data: page, error: pageError } = await db.from("facebook_page_accounts")
      .select("*").eq("is_selected", true).maybeSingle();
    if (pageError) return json({ success: false, error: "The selected Facebook Page could not be verified." }, 503);
    if (!page) return json({ success: true, processed: 0, skipped: "No Facebook Page is selected." });
    if (!canPublish(page)) return json({ success: true, processed: 0, skipped: "The selected Page no longer has the required publishing permission." });
    let token = "";
    try { token = await pageToken(page); }
    catch { return json({ success: false, error: "Facebook Page credentials could not be decrypted. Queue items were not claimed." }, 503); }

    const { data: due, error: claimError } = await db.rpc("claim_due_posts_with_daily_limit", {
      p_platform: "facebook", p_limit: 3, p_daily_limit: dailyLimit,
    });
    if (claimError) return json({ success: false, error: "Due posts could not be claimed safely." }, 500);
    if (!due?.length) {
      const window = dhakaDayWindow();
      const [published, scheduled] = await Promise.all([
        db.from("facebook_publish_history").select("id", { count: "exact", head: true })
          .eq("status", "published").gte("published_at", window.start).lt("published_at", window.end),
        db.from("facebook_publish_history").select("id", { count: "exact", head: true })
          .eq("status", "scheduled").gte("scheduled_at", window.start).lt("scheduled_at", window.end),
      ]);
      return json({
        success: true, processed: 0, published: 0, failed: 0, dailyLimit,
        dailyUsed: (published.count || 0) + (scheduled.count || 0),
      });
    }

    let publishedCount = 0;
    let failedCount = 0;
    let uncertainCount = 0;
    for (const post of due as Row[]) {
      let providerAccepted = false;
      try {
        const result = await publishQueuedPost(post, page, token);
        providerAccepted = true;
        const now = new Date().toISOString();
        const { error: historyError } = await db.from("facebook_publish_history").insert({
          page_id: String(page.page_id),
          page_name: clean(page.page_name, 160) || "Facebook Page",
          post_type: result.postType,
          status: "published",
          message: result.message,
          media_object_path: result.mediaPath,
          facebook_post_id: result.objectId,
          permalink_url: result.permalink || null,
          scheduled_at: post.publish_at || null,
          published_at: now,
          error_code: null,
          error_message: null,
          created_by: clean(post.created_by, 180) || ADMIN_EMAIL,
          updated_at: now,
        });

        if (historyError) {
          // Meta already accepted the post. Keep the queue row processing (quota-reserved)
          // rather than mark it retryable and risk publishing a duplicate.
          await db.from("post_queue").update({
            error: "Meta accepted this post, but its history could not be saved. Verify the Page before manually recovering this row.",
          }).eq("id", post.id);
          uncertainCount++;
          continue;
        }

        const { error: queueSaveError } = await db.from("post_queue").update({
          status: "published",
          external_id: result.objectId,
          permalink: result.permalink || null,
          error: null,
        }).eq("id", post.id);
        if (queueSaveError) {
          // The successful history row still reserves quota if the queue status update fails.
          uncertainCount++;
          continue;
        }
        publishedCount++;
      } catch (err) {
        const e = err as Error & { providerCode?: string };
        const safeMessage = clean(e?.message, 500) || "Automated publishing failed.";
        if (providerAccepted) {
          await db.from("post_queue").update({
            error: "Meta accepted this post, but the dashboard could not finish recording it. Verify the Page before manually recovering this row.",
          }).eq("id", post.id);
          uncertainCount++;
        } else {
          const historySaved = await recordFailure(post, page, safeMessage, e?.providerCode || "");
          if (historySaved) failedCount++;
          else failedCount++;
        }
      }
    }

    const window = dhakaDayWindow();
    const [published, scheduled] = await Promise.all([
      db.from("facebook_publish_history").select("id", { count: "exact", head: true })
        .eq("status", "published").gte("published_at", window.start).lt("published_at", window.end),
      db.from("facebook_publish_history").select("id", { count: "exact", head: true })
        .eq("status", "scheduled").gte("scheduled_at", window.start).lt("scheduled_at", window.end),
    ]);
    return json({
      success: true,
      processed: due.length,
      published: publishedCount,
      failed: failedCount,
      needsReview: uncertainCount,
      dailyLimit,
      dailyUsed: (published.count || 0) + (scheduled.count || 0),
    });
  } catch {
    return json({ success: false, error: "The automated publishing worker encountered an unexpected error." }, 500);
  }
});

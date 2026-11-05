import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const BATCH_SIZE = 20;
const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const validEmail = (value: unknown) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value ?? "").trim());
const htmlEscape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[ch] as string));
const textToHtml = (value: string) => htmlEscape(value).replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");


function jwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid admin session.");
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)));
}
function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("Server database configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function config() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
  const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") || "";
  const gmailRefreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN") || "";
  const from = ADMIN_EMAIL;
  return {
    configured: Boolean(url && serviceKey && gmailClientId && gmailClientSecret &&
      gmailRefreshToken),
    missing: [
      ...(!url || !serviceKey ? ["SUPABASE server configuration"] : []),
      ...(!gmailClientId ? ["GMAIL_CLIENT_ID"] : []),
      ...(!gmailClientSecret ? ["GMAIL_CLIENT_SECRET"] : []),
      ...(!gmailRefreshToken ? ["GMAIL_REFRESH_TOKEN"] : []),
    ],
    gmailClientId, gmailClientSecret, gmailRefreshToken, from,
  };
}
async function requireAdmin(req: Request): Promise<{ email: string } | { response: Response }> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { response: json({ success: false, error: "Sign in to the Halal Food admin dashboard first." }, 401) };
  let claims: Record<string, unknown>;
  try { claims = jwtPayload(token); } catch { return { response: json({ success: false, error: "Invalid admin session." }, 401) }; }
  if (claims.role !== "authenticated" || claims.aal !== "aal2" ||
      Number(claims.exp || 0) <= Math.floor(Date.now() / 1000) ||
      String(claims.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return { response: json({ success: false, error: "A valid Halal Food admin session with completed MFA is required." }, 403) };
  }
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
    const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user || clean(data.user.email, 320).toLowerCase() !== ADMIN_EMAIL) {
      return { response: json({ success: false, error: "Admin session could not be verified. Sign in again." }, 401) };
    }
    return { email: ADMIN_EMAIL };
  } catch {
    return { response: json({ success: false, error: "Admin session verification is temporarily unavailable." }, 503) };
  }
}


function base64Standard(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
function base64Url(value: string): string {
  return base64Standard(value).split("+").join("-").split("/").join("_").replace(/=+$/g, "");
}
function mimeHeader(value: string): string {
  return "=?UTF-8?B?" + base64Standard(value) + "?=";
}
function buildRawEmail(payload: any): string {
  const to = clean(payload?.to?.[0], 320);
  const subject = clean(payload?.subject, 180);
  const textBody = String(payload?.text || "");
  const htmlBody = String(payload?.html || "");
  if (!validEmail(to) || !subject || !textBody || !htmlBody) {
    throw new Error("Email payload is incomplete or invalid.");
  }
  const boundary = "hf_" + crypto.randomUUID().replace(/-/g, "");
  const listUnsubscribe = clean(payload?.headers?.["List-Unsubscribe"], 2000);
  const listUnsubscribePost = clean(payload?.headers?.["List-Unsubscribe-Post"], 100);
  const headers = [
    "From: Halal Food <" + ADMIN_EMAIL + ">",
    "To: " + to,
    "Subject: " + mimeHeader(subject),
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    ...(listUnsubscribe ? ["List-Unsubscribe: " + listUnsubscribe] : []),
    ...(listUnsubscribePost ? ["List-Unsubscribe-Post: " + listUnsubscribePost] : []),
  ];
  const mime = [
    ...headers,
    "",
    "--" + boundary,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Standard(textBody),
    "--" + boundary,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Standard(htmlBody),
    "--" + boundary + "--",
    "",
  ].join("\r\n");
  return base64Url(mime);
}
async function getGmailAccessToken(readiness: ReturnType<typeof config>): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: readiness.gmailClientId,
      client_secret: readiness.gmailClientSecret,
      refresh_token: readiness.gmailRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !clean(result?.access_token, 5000)) {
    const detail = clean(result?.error_description || result?.error, 240);
    throw new Error("Gmail OAuth token refresh failed (" + response.status + ")" +
      (detail ? ": " + detail : "."));
  }
  return String(result.access_token);
}
async function markGmailRecipientFailed(
  db: ReturnType<typeof supabaseAdmin>,
  campaignId: string,
  recipientId: string,
  claimToken: string,
  reason: string,
) {
  const { error } = await db.from("marketing_campaign_recipients")
    .update({ status: "failed", claim_token: null, last_error: clean(reason, 900) })
    .eq("id", recipientId).eq("campaign_id", campaignId)
    .eq("status", "queued").eq("claim_token", claimToken);
  if (error) throw new Error("Could not safely record the Gmail delivery exception; stop and inspect the campaign before retrying.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 12000) return json({ success: false, error: "Request is too large." }, 413);

  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON request." }, 400); }
  const action = clean(body.action, 40).toLowerCase();
  const readiness = config();
  if (action === "status") {
    if (!readiness.configured) {
      return json({ success: true, configured: false, sender: null, missing: readiness.missing,
        batchSize: BATCH_SIZE, provider: "Gmail API",
        providerNote: "Google OAuth app is currently in Testing mode. Gmail refresh tokens issued in Testing expire after 7 days; move the app out of Testing for long-term use." });
    }
    try {
      await getGmailAccessToken(readiness);
      const db = supabaseAdmin();
      const checks = await Promise.all([
        db.from("marketing_campaigns").select("id").limit(1),
        db.from("marketing_campaign_recipients").select("id").limit(1),
        db.from("customers").select("id").limit(1),
      ]);
      const failedCheck = checks.find((check: any) => check.error);
      if (failedCheck) {
        const detail = clean(failedCheck.error?.message || "Server database access check failed.", 240);
        console.error("Marketing email readiness database check failed:", detail);
        return json({ success: true, configured: false, sender: null,
          missing: ["Server database permissions: " + detail],
          batchSize: BATCH_SIZE, provider: "Gmail API",
          providerNote: "Gmail OAuth is valid, but the server cannot read the email campaign data. No email is sent during this check." });
      }
      return json({ success: true, configured: true, databaseReady: true, sender: readiness.from, missing: [],
        batchSize: BATCH_SIZE, provider: "Gmail API",
        providerNote: "Gmail OAuth and server database read checks passed. The app is in Testing mode, so this refresh token expires after 7 days unless the app is moved out of Testing." });
    } catch (error) {
      return json({ success: true, configured: false, sender: null,
        missing: [clean(error instanceof Error ? error.message : "Gmail connection check failed.", 260)],
        batchSize: BATCH_SIZE, provider: "Gmail API",
        providerNote: "No email is sent during the connection check." });
    }
  }
  if (action !== "send") return json({ success: false, error: "Unsupported action." }, 400);
  if (!readiness.configured) return json({ success: false, error: "Email provider is not configured. No email has been sent.", missing: readiness.missing }, 503);
  const campaignId = clean(body.campaign_id, 60);
  if (!isUuid(campaignId)) return json({ success: false, error: "A valid campaign ID is required." }, 400);

  const db = supabaseAdmin();
  let locked = false;
  try {
    const { data: campaign, error: campaignError } = await db.from("marketing_campaigns")
      .select("id,name,channel,subject,message_body,audience_rules,status,audience_count,sent_count,failed_count")
      .eq("id", campaignId).maybeSingle();
    if (campaignError) {
      const code = clean((campaignError as any).code || "DB_ERROR", 40);
      const detail = clean((campaignError as any).message || "Database lookup failed.", 240);
      console.error("Marketing campaign lookup failed:", code, detail);
      return json({ success: false, error: "The server could not read the saved customer update (" + code + "): " + detail }, 500);
    }
    if (!campaign) return json({ success: false, error: "Saved customer update was not found." }, 404);
    if (campaign.channel !== "email") return json({ success: false, error: "Only Email campaigns can be sent by this endpoint." }, 400);
    const emailPurpose = clean((campaign.audience_rules as any)?.email_purpose || "", 40);
    const messageType = clean((campaign.audience_rules as any)?.message_type || "", 40);
    if (emailPurpose !== "customer_update" || messageType !== "customer_service") {
      return json({ success: false, error: "Only order updates and customer-service emails are enabled. Promotional email is disabled." }, 403);
    }
    if (!["approved", "partially_sent"].includes(campaign.status)) {
      return json({ success: false, error: "Campaign must be approved before sending. Current status: " + campaign.status }, 409);
    }

    const { data: lock, error: lockError } = await db.from("marketing_campaigns")
      .update({ status: "sending", last_error: null, updated_at: new Date().toISOString() })
      .eq("id", campaignId).eq("status", campaign.status).select("id").maybeSingle();
    if (lockError) throw new Error("Could not safely lock the campaign for sending.");
    if (!lock) return json({ success: false, error: "This campaign is already being processed. Refresh campaign history before trying again." }, 409);
    locked = true;

    let { data: batch, error: batchError } = await db.from("marketing_campaign_recipients")
      .select("id,customer_id,recipient_email,recipient_name,claim_token,unsubscribe_token_hash")
      .eq("campaign_id", campaignId).eq("status", "queued")
      .order("claimed_at", { ascending: true }).limit(BATCH_SIZE);
    if (batchError) throw new Error("Could not resume the saved email batch.");
    let claimToken: string;
    if (batch?.length) {
      claimToken = String(batch[0].claim_token || "");
      if (!isUuid(claimToken) || batch.some((r: any) => r.claim_token !== claimToken)) {
        throw new Error("Saved email batch has an invalid idempotency token. Sending was stopped safely.");
      }
      batch = batch.filter((r: any) => r.claim_token === claimToken);
    } else {
      const { data: selected, error: selectedError } = await db.from("marketing_campaign_recipients")
        .select("id,customer_id,recipient_email,recipient_name").eq("campaign_id", campaignId).in("status", ["selected", "exported"])
        .order("created_at", { ascending: true }).limit(BATCH_SIZE);
      if (selectedError) throw new Error("Could not load pending email recipients.");
      if (!selected?.length) {
        const { count: sentCount } = await db.from("marketing_campaign_recipients").select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId).in("status", ["sent", "delivered"]);
        const { count: failedCount } = await db.from("marketing_campaign_recipients").select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId).in("status", ["failed", "suppressed"]);
        await db.from("marketing_campaigns").update({
          status: Number(sentCount || 0) > 0 ? "sent" : "failed", sent_count: sentCount || 0, failed_count: failedCount || 0,
          sent_at: Number(sentCount || 0) > 0 ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
        }).eq("id", campaignId).eq("status", "sending");
        locked = false;
        return json({ success: true, sent: 0, failed: failedCount || 0, remaining: 0, message: "There were no more eligible recipients to send." });
      }
      claimToken = crypto.randomUUID();
      const selectedIds = selected.map((r: any) => r.id);
      const { error: claimError } = await db.from("marketing_campaign_recipients")
        .update({ status: "queued", claim_token: claimToken, claimed_at: new Date().toISOString() })
        .eq("campaign_id", campaignId).in("status", ["selected", "exported"]).in("id", selectedIds);
      if (claimError) throw new Error("Could not reserve the next email batch. No email was sent.");
      batch = selected.map((r: any) => ({ ...r, claim_token: claimToken, unsubscribe_token_hash: null }));
    }
    const recipientIds = (batch || []).map((r: any) => r.id);
    const customerIds = [...new Set((batch || []).map((r: any) => r.customer_id))];
    if (!recipientIds.length) throw new Error("The email batch is empty.");

    const { data: directory, error: directoryError } = await db.from("customers")
      .select("id,name,email,is_blocked,archived_at,anonymized_at")
      .in("id", customerIds).is("archived_at", null).is("anonymized_at", null).eq("is_blocked", false);
    if (directoryError) throw new Error("Could not re-check the active customer records.");
    const directoryById = new Map((directory || []).map((c: any) => [c.id, c]));
    const payloads: any[] = [];
    const payloadRecipients: any[] = [];
    let suppressed = 0;
    const now = new Date().toISOString();
    for (const recipient of (batch || []) as any[]) {
      const customer: any = directoryById.get(recipient.customer_id);
      const recipientEmail = clean(recipient.recipient_email || customer?.email || "", 320);
      const sendAllowed = Boolean(customer && validEmail(recipientEmail));
      if (!sendAllowed) {
        const { error: suppressError } = await db.from("marketing_campaign_recipients")
          .update({ status: "suppressed", last_error: "The linked customer record is no longer active or the saved email address is invalid." })
          .eq("id", recipient.id).eq("status", "queued");
        if (suppressError) throw new Error("Could not record an ineligible recipient safely.");
        suppressed++;
        continue;
      }
      const name = clean(recipient.recipient_name || customer.name || "Customer", 120);
      const text = clean(campaign.message_body, 4000).replace(/\{\{\s*name\s*\}\}/gi, name)
        .replace(/\{\{\s*segment\s*\}\}/gi, clean(customer.segment_name || "Customer", 80));
      const subject = clean(campaign.subject || "", 180).replace(/\{\{\s*name\s*\}\}/gi, name)
        .replace(/\{\{\s*segment\s*\}\}/gi, clean(customer.segment_name || "Customer", 80));
      if (!subject || !text) throw new Error("Email subject or message is empty.");

      const serviceFooter = "\n\nThis message relates to your order or customer-service interaction with Halal Food. For support, reply to this email or contact halalfoodbd.official@gmail.com / 01842031164.";
      const plain = text + serviceFooter;
      const html = "<!doctype html><html><body style=\"margin:0;background:#f7f5ef;padding:24px;font-family:Arial,sans-serif;color:#2b2a3d\"><div style=\"max-width:620px;margin:auto;background:#fffdf8;border:1px solid #e5e0d6;border-radius:14px;padding:26px\"><div style=\"font-weight:800;font-size:18px;color:#2b2a3d;margin-bottom:18px\">Halal Food</div><div style=\"font-size:14px;line-height:1.75\">" + textToHtml(text) + "</div><hr style=\"border:0;border-top:1px solid #e5e0d6;margin:24px 0\"><p style=\"font-size:11px;line-height:1.6;color:#737487\">This message relates to your order or customer-service interaction with Halal Food. For support, reply to this email or contact halalfoodbd.official@gmail.com / 01842031164.</p></div></body></html>";
      payloads.push({
        from: readiness.from, to: [recipientEmail], subject, html, text: plain,
        headers: {},
      });
      payloadRecipients.push({ ...recipient, customerId: recipient.customer_id, recipientEmail });
    }

    let sentThisRun = 0;
    let sendPausedReason = "";
    if (payloads.length) {
      await db.from("marketing_campaign_events").insert({
        campaign_id: campaignId,
        event_type: "email_batch_started",
        details: { batch_size: payloads.length, suppressed, provider: "gmail", email_purpose: emailPurpose },
        created_by: ADMIN_EMAIL,
      });

      const accessToken = await getGmailAccessToken(readiness);
      for (let index = 0; index < payloads.length; index++) {
        const payload = payloads[index];
        const recipient = payloadRecipients[index];
        let response: Response;
        try {
          response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + accessToken,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({ raw: buildRawEmail(payload) }),
          });
        } catch {
          const reason = "Gmail did not return a response. Delivery is uncertain; check the sender's Sent Mail before manually retrying this recipient.";
          await markGmailRecipientFailed(db, campaignId, recipient.id, claimToken, reason);
          await db.from("marketing_campaign_events").insert({
            campaign_id: campaignId, event_type: "email_delivery_uncertain",
            details: { provider: "gmail", recipient_id: recipient.id, message: reason },
            created_by: ADMIN_EMAIL,
          });
          await db.from("marketing_campaigns").update({
            status: "partially_sent", last_error: reason, updated_at: new Date().toISOString(),
          }).eq("id", campaignId).eq("status", "sending");
          locked = false;
          return json({ success: false, sent: sentThisRun, failed: 1, uncertain: true,
            message: reason, safeToRetry: false }, 502);
        }

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !clean(result?.id, 200)) {
          const detail = clean(result?.error?.message || result?.error_description || result?.error, 300);
          const reason = "Gmail API returned HTTP " + response.status +
            (detail ? ": " + detail : ".") +
            " The remaining recipients have not been processed.";
          if ([401, 403, 429].includes(response.status)) {
            sendPausedReason = reason + " Resolve the authorization or quota issue, then use Continue send.";
            await db.from("marketing_campaign_events").insert({
              campaign_id: campaignId, event_type: "email_send_paused",
              details: { provider: "gmail", http_status: response.status, message: clean(sendPausedReason, 350) },
              created_by: ADMIN_EMAIL,
            });
            break;
          }
          await markGmailRecipientFailed(db, campaignId, recipient.id, claimToken,
            reason + " Check Gmail Sent Mail before any manual retry.");
          await db.from("marketing_campaign_events").insert({
            campaign_id: campaignId, event_type: "email_failed",
            details: { provider: "gmail", recipient_id: recipient.id, http_status: response.status, message: clean(reason, 350) },
            created_by: ADMIN_EMAIL,
          });
          sendPausedReason = reason + " This recipient was stopped from automatic retry to prevent duplicates. Check Gmail Sent Mail.";
          break;
        }

        const gmailMessageId = clean(result.id, 200);
        const { data: recordedCount, error: recordError } = await db.rpc("admin_marketing_record_email_batch", {
          p_campaign_id: campaignId,
          p_claim_token: claimToken,
          p_recipient_ids: [recipient.id],
          p_provider_message_ids: [gmailMessageId],
        });
        if (recordError || Number(recordedCount) !== 1) {
          const reason = "Gmail accepted the message, but its receipt could not be saved. Check Gmail Sent Mail before retrying. Campaign sending has been stopped to prevent duplicates.";
          await db.from("marketing_campaign_recipients").update({
            status: "failed", claim_token: null, provider_message_id: gmailMessageId,
            last_error: reason,
          }).eq("id", recipient.id).eq("campaign_id", campaignId).eq("status", "queued").eq("claim_token", claimToken);
          await db.from("marketing_campaigns").update({
            status: "failed", last_error: reason, updated_at: new Date().toISOString(),
          }).eq("id", campaignId).eq("status", "sending");
          locked = false;
          return json({ success: false, sent: sentThisRun, manualReviewRequired: true,
            message: reason }, 503);
        }
        sentThisRun++;
      }
    }
    const { count: sentCount } = await db.from("marketing_campaign_recipients").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).in("status", ["sent", "delivered"]);
    const { count: failedCount } = await db.from("marketing_campaign_recipients").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).in("status", ["failed", "suppressed"]);
    const { count: remaining } = await db.from("marketing_campaign_recipients").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).in("status", ["selected", "exported", "queued"]);
    const finalStatus = Number(remaining || 0) > 0 ? "partially_sent" : Number(sentCount || 0) > 0 ? "sent" : "failed";
    const { error: finalizeError } = await db.from("marketing_campaigns").update({
      status: finalStatus, sent_count: sentCount || 0, failed_count: failedCount || 0,
      sent_at: finalStatus === "sent" ? new Date().toISOString() : null, last_error: sendPausedReason ? clean(sendPausedReason, 500) : null, updated_at: new Date().toISOString(),
    }).eq("id", campaignId).eq("status", "sending");
    if (finalizeError) throw new Error("Batch accepted by provider, but campaign summary could not be finalized.");
    await db.from("marketing_campaign_events").insert({
      campaign_id: campaignId, event_type: "email_batch_finished",
      details: { accepted_by_provider: sentThisRun, suppressed, total_accepted: sentCount || 0, remaining: remaining || 0, provider: "gmail" },
      created_by: ADMIN_EMAIL,
    });
    locked = false;
    return json({ success: true, sent: sentThisRun, acceptedByProvider: sentThisRun, failed: failedCount || 0, suppressed,
      totalAccepted: sentCount || 0, remaining: remaining || 0, status: finalStatus,
      paused: Boolean(sendPausedReason), note: sendPausedReason || "Gmail API accepted the message; accepted does not guarantee inbox placement or reading." });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : "Email send failed.", 500);
    if (locked) {
      await db.from("marketing_campaigns").update({ status: "partially_sent", last_error: message, updated_at: new Date().toISOString() })
        .eq("id", campaignId).eq("status", "sending");
    }
    console.error("Marketing email worker failed:", message);
    return json({ success: false, error: message }, 500);
  }
});

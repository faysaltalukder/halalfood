import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const readJwtPayload = (token: string): Record<string, unknown> => {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)));
};
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const required = ["MESSENGER_PAGE_ACCESS_TOKEN", "MESSENGER_PAGE_ID", "MESSENGER_APP_SECRET", "MESSENGER_VERIFY_TOKEN"];
const readiness = () => Object.fromEntries(required.map((key) => [key, Boolean(Deno.env.get(key))])) as Record<string, boolean>;
const graphBase = "https://graph.facebook.com/v26.0/";
const isSuccess = (status: number) => status >= 200 && status < 300;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return reply({ success: false, error: "Origin not allowed" }, 403);

  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return reply({ success: false, error: "Admin sign-in is required." }, 401);
  let claims: Record<string, unknown>;
  try { claims = readJwtPayload(bearer); } catch { return reply({ success: false, error: "Invalid admin session." }, 401); }
  if (String(claims.email || "").toLowerCase() !== "halalfoodbd.official@gmail.com" || claims.aal !== "aal2" || claims.role !== "authenticated") {
    return reply({ success: false, error: "Only the verified Halal Food admin with MFA can use Messenger messaging." }, 403);
  }

  const configured = readiness();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "", serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return reply({ success: false, error: "Server database configuration unavailable." }, 503);
  let body: any;
  try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid JSON body." }, 400); }
  const action = clean(body?.action, 40).toLowerCase();
  if (action === "status") return reply({ success: true, configured, allConfigured: Object.values(configured).every(Boolean), graphApiVersion: "v26.0", sendMode: "text-only" });
  if (!["connect", "send"].includes(action)) return reply({ success: false, error: "Unsupported action." }, 400);
  if (!Object.values(configured).every(Boolean)) return reply({
    success: false, error: "Messenger server credentials are incomplete.",
    missing: Object.keys(configured).filter((key) => !configured[key]),
  }, 503);

  const pageToken = Deno.env.get("MESSENGER_PAGE_ACCESS_TOKEN") || "", pageId = Deno.env.get("MESSENGER_PAGE_ID") || "";
  const headers = { "Authorization": "Bearer " + pageToken, "Content-Type": "application/json" };

  if (action === "connect") {
    let pageResponse: Response, pageData: any;
    try {
      pageResponse = await fetch(graphBase + encodeURIComponent(pageId) + "?fields=id,name", { method: "GET", headers });
      pageData = await pageResponse.json().catch(() => ({}));
    } catch { return reply({ success: false, step: "verify_page", error: "Could not reach Meta to verify the Facebook Page." }, 502); }
    if (!pageResponse!.ok || clean(pageData?.id, 100) !== pageId) {
      const diagnostic = { step: "verify_page", httpStatus: pageResponse!.status, providerCode: clean(pageData?.error?.code, 50) || null, providerSubcode: clean(pageData?.error?.error_subcode, 50) || null, providerType: clean(pageData?.error?.type, 100) || null };
      console.error("Messenger Page connection check failed", JSON.stringify(diagnostic));
      return reply({ success: false, ...diagnostic, error: diagnostic.providerCode === "190"
        ? "Meta rejected the Page Access Token. Use a valid Page Access Token for this Page with pages_messaging and pages_manage_metadata."
        : "Meta could not verify the saved Facebook Page ID. Confirm the Page ID and that the token belongs to this Page." }, 502);
    }
    let subResponse: Response, subData: any;
    try {
      subResponse = await fetch(graphBase + encodeURIComponent(pageId) + "/subscribed_apps?subscribed_fields=messages", { method: "POST", headers });
      subData = await subResponse.json().catch(() => ({}));
    } catch { return reply({ success: false, step: "subscribe_page", error: "Could not reach Meta to subscribe this Page to Messenger webhook events." }, 502); }
    if (!subResponse!.ok || !(subData?.success === true || subData?.success === "true")) {
      const diagnostic = { step: "subscribe_page", httpStatus: subResponse!.status, providerCode: clean(subData?.error?.code, 50) || null, providerSubcode: clean(subData?.error?.error_subcode, 50) || null, providerType: clean(subData?.error?.type, 100) || null };
      console.error("Messenger Page webhook subscription failed", JSON.stringify(diagnostic));
      return reply({ success: false, ...diagnostic, error: "Meta did not confirm Page subscription. Check pages_manage_metadata and pages_messaging permissions, and the Page token's messaging task access." }, 502);
    }
    return reply({ success: true, action: "connect", pageSubscribed: true, pageId, pageName: clean(pageData?.name, 160) || "Facebook Page", subscribedFields: ["messages"], graphApiVersion: "v26.0",
      nextStep: "Ensure the Meta App's Page webhook object has the messages field subscribed to this callback URL, then send a new message to the Page." });
  }

  const conversationId = clean(body?.conversationId, 80);
  const messageText = String(body?.text ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!isUuid(conversationId)) return reply({ success: false, error: "Choose a valid conversation." }, 400);
  if (!messageText) return reply({ success: false, error: "Write a message before sending." }, 400);
  if (messageText.length > 2000) return reply({ success: false, error: "Messenger text replies cannot exceed 2000 characters." }, 400);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await db.from("messaging_conversations").select("id,contact_id,channel,last_inbound_at").eq("id", conversationId).maybeSingle();
  if (result.error) return reply({ success: false, error: "Could not load this conversation." }, 500);
  const conversation = result.data;
  if (!conversation || conversation.channel !== "messenger") return reply({ success: false, error: "Messenger conversation not found." }, 404);
  const lastInbound = conversation.last_inbound_at ? Date.parse(conversation.last_inbound_at) : NaN, elapsed = Date.now() - lastInbound;
  if (!Number.isFinite(lastInbound) || elapsed < 0 || elapsed >= 86400000) return reply({ success: false, error: "The 24-hour Messenger customer-service window is closed. This version sends text replies only within the standard window." }, 409);

  const contactResult = await db.from("messaging_contacts").select("external_contact_id").eq("id", conversation.contact_id).maybeSingle();
  if (contactResult.error || !contactResult.data?.external_contact_id) return reply({ success: false, error: "Messenger contact is unavailable." }, 500);
  const recipient = clean(contactResult.data.external_contact_id, 80);
  if (!/^\d{5,40}$/.test(recipient)) return reply({ success: false, error: "Messenger recipient Page-scoped ID is invalid." }, 400);

  let apiResponse: Response, apiData: any;
  try {
    apiResponse = await fetch(graphBase + encodeURIComponent(pageId) + "/messages", {
      method: "POST", headers,
      body: JSON.stringify({ recipient: { id: recipient }, messaging_type: "RESPONSE", message: { text: messageText } }),
    });
    apiData = await apiResponse.json().catch(() => ({}));
  } catch { return reply({ success: false, error: "The Messenger API request failed. Check the server/network status and try again." }, 502); }

  const providerId = clean(apiData?.message_id, 200) || null, now = new Date().toISOString();
  if (!isSuccess(apiResponse!.status) || !providerId) {
    const diagnostic = { providerCode: clean(apiData?.error?.code, 50) || null, providerSubcode: clean(apiData?.error?.error_subcode, 50) || null, providerType: clean(apiData?.error?.type, 100) || null };
    const title = clean(apiData?.error?.error_user_title || apiData?.error?.message || apiData?.error?.type, 200) || "Messenger did not accept the message";
    await db.from("messaging_messages").insert({ conversation_id: conversationId, channel: "messenger", direction: "outbound", message_type: "text", body: messageText, status: "failed", failed_at: now, error_code: diagnostic.providerCode, error_title: title });
    console.error("Messenger send failed", JSON.stringify(diagnostic));
    return reply({ success: false, error: "Meta did not accept the message. Check the Page Access Token, pages_messaging permission, recipient eligibility, and Messenger messaging rules.", ...diagnostic }, 502);
  }

  const saved = await db.from("messaging_messages").insert({ conversation_id: conversationId, channel: "messenger", provider_message_id: providerId, direction: "outbound", message_type: "text", body: messageText, status: "sent", provider_timestamp: now, sent_at: now });
  if (saved.error) {
    console.error("Messenger accepted reply but saving local message history failed");
    return reply({ success: true, warning: "Meta accepted the message, but local message history could not be saved.", providerMessageId: providerId });
  }
  const updated = await db.from("messaging_conversations").update({ last_message_at: now, last_message_preview: messageText.slice(0, 180), last_message_direction: "outbound", updated_at: now }).eq("id", conversationId);
  if (updated.error) console.error("Messenger conversation summary update failed");
  return reply({ success: true, status: "sent", providerMessageId: providerId });
});

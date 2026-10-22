import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const readJwtPayload = (token: string): Record<string, unknown> => {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token.");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return JSON.parse(decoded);
};
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const requiredSecrets = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
];
const secretReadiness = () => {
  const values: Record<string, boolean> = {};
  for (const name of requiredSecrets) values[name] = Boolean(Deno.env.get(name));
  return values;
};
const statusAllowed = (status: number) => status >= 200 && status < 300;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return reply({ success: false, error: "Origin not allowed." }, 403);

  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return reply({ success: false, error: "Admin sign-in is required." }, 401);
  let claims: Record<string, unknown>;
  try { claims = readJwtPayload(accessToken); }
  catch { return reply({ success: false, error: "Invalid admin session." }, 401); }
  if (
    String(claims.email || "").toLowerCase() !== "halalfoodbd.official@gmail.com" ||
    claims.aal !== "aal2" ||
    claims.role !== "authenticated"
  ) {
    return reply({ success: false, error: "Only the verified Halal Food admin with MFA can use WhatsApp messaging." }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const configured = secretReadiness();
  if (!supabaseUrl || !serviceKey) return reply({ success: false, error: "Server database configuration unavailable." }, 503);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: any;
  try { body = await req.json(); }
  catch { return reply({ success: false, error: "Invalid JSON body." }, 400); }
  const action = clean(body?.action, 40).toLowerCase();

  if (action === "status") {
    return reply({ success: true, configured, allConfigured: Object.values(configured).every(Boolean), sendMode: "text-only", graphApiVersion: "v26.0" });
  }

  if (!["send", "connect"].includes(action)) return reply({ success: false, error: "Unsupported action." }, 400);

  if (!Object.values(configured).every(Boolean)) {
    const missing = Object.keys(configured).filter((key) => !configured[key]);
    return reply({ success: false, error: "WhatsApp server credentials are incomplete.", missing }, 503);
  }

  if (action === "connect") {
    const accessTokenSecret = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    const businessAccountId = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID") || "";
    const graphBase = "https://graph.facebook.com/v26.0/";
    const graphHeaders = { "Authorization": "Bearer " + accessTokenSecret, "Content-Type": "application/json" };

    let phonesResponse: Response;
    let phonesData: any;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        phonesResponse = await fetch(graphBase + encodeURIComponent(businessAccountId) + "/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating", {
          method: "GET", headers: graphHeaders, signal: controller.signal,
        });
        phonesData = await phonesResponse.json().catch(() => ({}));
      } finally { clearTimeout(timer); }
    } catch {
      return reply({ success: false, error: "Could not reach Meta to verify the WhatsApp Business Account. Try again shortly." }, 502);
    }

    if (!phonesResponse!.ok) {
      const diagnostic = {
        step: "verify_business_account",
        httpStatus: phonesResponse!.status,
        providerCode: clean(phonesData?.error?.code, 50) || null,
        providerSubcode: clean(phonesData?.error?.error_subcode, 50) || null,
        providerType: clean(phonesData?.error?.type, 100) || null,
      };
      console.error("WhatsApp connection diagnostic", JSON.stringify(diagnostic));
      return reply({
        success: false,
        ...diagnostic,
        error: "Meta could not read phone numbers for this Business Account. Check that the saved Business Account ID is correct and that this token has whatsapp_business_management access.",
      }, 502);
    }

    const phoneList = Array.isArray(phonesData?.data) ? phonesData.data : [];
    const matchingPhone = phoneList.find((item: any) => clean(item?.id, 100) === phoneNumberId);
    if (!matchingPhone) {
      return reply({
        success: false,
        step: "verify_phone_number",
        error: "The saved Phone Number ID was not found under the saved WhatsApp Business Account ID. Check the two IDs in Meta and update the Supabase secrets if needed.",
        phoneNumberFound: false,
      }, 409);
    }

    let subscribeResponse: Response;
    let subscribeData: any;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        subscribeResponse = await fetch(graphBase + encodeURIComponent(businessAccountId) + "/subscribed_apps", {
          method: "POST", headers: graphHeaders, signal: controller.signal,
        });
        subscribeData = await subscribeResponse.json().catch(() => ({}));
      } finally { clearTimeout(timer); }
    } catch {
      return reply({ success: false, step: "subscribe_waba", error: "Could not reach Meta to subscribe this Business Account. No message was sent." }, 502);
    }

    if (!subscribeResponse!.ok || !(subscribeData?.success === true || subscribeData?.success === "true")) {
      const diagnostic = {
        step: "subscribe_waba",
        httpStatus: subscribeResponse!.status,
        providerCode: clean(subscribeData?.error?.code, 50) || null,
        providerSubcode: clean(subscribeData?.error?.error_subcode, 50) || null,
        providerType: clean(subscribeData?.error?.type, 100) || null,
      };
      console.error("WhatsApp connection diagnostic", JSON.stringify(diagnostic));
      return reply({
        success: false,
        ...diagnostic,
        error: "Meta did not confirm the WABA subscription. Check the token's WhatsApp Business Account permissions and assigned assets.",
      }, 502);
    }

    // Do not return the access token or any secret value to the browser.
    return reply({
      success: true,
      action: "connect",
      wabaSubscribed: true,
      phoneNumberFound: true,
      phoneNumberId,
      displayPhoneNumber: clean(matchingPhone?.display_phone_number, 40) || null,
      verifiedName: clean(matchingPhone?.verified_name, 160) || null,
      qualityRating: clean(matchingPhone?.quality_rating, 40) || null,
      graphApiVersion: "v26.0",
      nextStep: "Confirm the Meta App is subscribed to the messages webhook field, then send a new test message to the verified number.",
    });
  }

  const conversationId = clean(body?.conversationId, 80);
  const rawText = String(body?.text ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!isUuid(conversationId)) return reply({ success: false, error: "Choose a valid conversation." }, 400);
  if (!rawText) return reply({ success: false, error: "Write a message before sending." }, 400);
  if (rawText.length > 4096) return reply({ success: false, error: "Text messages cannot exceed 4096 characters." }, 400);
  const text = rawText;

  const conversationResult = await db.from("messaging_conversations")
    .select("id,contact_id,channel,last_inbound_at")
    .eq("id", conversationId).maybeSingle();
  if (conversationResult.error) return reply({ success: false, error: "Could not load this conversation." }, 500);
  const conversation = conversationResult.data;
  if (!conversation || conversation.channel !== "whatsapp") return reply({ success: false, error: "WhatsApp conversation not found." }, 404);

  const lastInbound = conversation.last_inbound_at ? Date.parse(conversation.last_inbound_at) : NaN;
  const elapsed = Date.now() - lastInbound;
  if (!Number.isFinite(lastInbound) || elapsed < 0 || elapsed >= 24 * 60 * 60 * 1000) {
    return reply({ success: false, error: "The 24-hour customer-service window is closed. This version sends only free-form text; add an approved WhatsApp template to contact the customer outside that window." }, 409);
  }

  const contactResult = await db.from("messaging_contacts")
    .select("external_contact_id")
    .eq("id", conversation.contact_id).maybeSingle();
  if (contactResult.error || !contactResult.data?.external_contact_id) return reply({ success: false, error: "Customer contact is unavailable." }, 500);
  const recipient = clean(contactResult.data.external_contact_id, 40);
  if (!/^\d{6,20}$/.test(recipient)) return reply({ success: false, error: "Customer's WhatsApp recipient ID is invalid." }, 400);

  const accessTokenSecret = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
  const apiUrl = "https://graph.facebook.com/v26.0/" + encodeURIComponent(phoneNumberId) + "/messages";
  let providerResponse: Response | null = null;
  let providerData: any = null;
  try {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    try {
      providerResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessTokenSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { preview_url: false, body: text },
        }),
        signal: abort.signal,
      });
      providerData = await providerResponse.json().catch(() => ({}));
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    await db.from("messaging_messages").insert({
      conversation_id: conversationId, channel: "whatsapp", direction: "outbound",
      message_type: "text", body: text, status: "failed", failed_at: new Date().toISOString(),
      error_title: "WhatsApp API request failed",
    });
    return reply({ success: false, error: "The WhatsApp API request failed. Check server/network status and try again." }, 502);
  }

  const now = new Date().toISOString();
  const providerMessageId = clean(providerData?.messages?.[0]?.id, 200) || null;

  if (!providerResponse || !statusAllowed(providerResponse.status) || !providerMessageId) {
    const errorCode = clean(providerData?.error?.code, 50) || null;
    const errorTitle = clean(providerData?.error?.error_user_title || providerData?.error?.message || providerData?.error?.type, 200) || "WhatsApp did not accept the message";
    const insertResult = await db.from("messaging_messages").insert({
      conversation_id: conversationId, channel: "whatsapp", direction: "outbound",
      message_type: "text", body: text, status: "failed", failed_at: now,
      error_code: errorCode, error_title: errorTitle,
    });
    await db.from("messaging_conversations").update({
      last_message_at: now, last_message_preview: text.slice(0, 180),
      last_message_direction: "outbound", updated_at: now,
    }).eq("id", conversationId);
    if (insertResult.error) console.error("WhatsApp failed-message record could not be saved");
    return reply({
      success: false,
      error: "Meta did not accept the message. Check the recipient's test-number eligibility, API permissions, phone number configuration, and WhatsApp messaging rules.",
      providerCode: errorCode,
    }, 502);
  }

  const messageResult = await db.from("messaging_messages").insert({
    conversation_id: conversationId,
    channel: "whatsapp",
    provider_message_id: providerMessageId,
    direction: "outbound",
    message_type: "text",
    body: text,
    status: "sent",
    provider_timestamp: now,
    sent_at: now,
  });
  if (messageResult.error) {
    // Provider accepted the message, but do not log the body or tokens.
    console.error("WhatsApp accepted a reply but saving its message record failed");
    return reply({ success: true, warning: "Meta accepted the message, but the dashboard could not save its local history.", providerMessageId }, 200);
  }
  const conversationUpdate = await db.from("messaging_conversations").update({
    last_message_at: now, last_message_preview: text.slice(0, 180),
    last_message_direction: "outbound", updated_at: now,
  }).eq("id", conversationId);
  if (conversationUpdate.error) console.error("WhatsApp conversation summary update failed");
  return reply({ success: true, status: "sent", providerMessageId });
});

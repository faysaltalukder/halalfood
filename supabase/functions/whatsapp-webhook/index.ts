import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const cleanMessageText = (value: unknown, max: number) =>
  String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const equalSecret = (a: string, b: string) => {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
};
const toIso = (timestamp: unknown) => {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
};
const previewFor = (body: string, type: string) => {
  const value = clean(body || ("[" + type + " message]"), 180);
  return value || "[message]";
};

type SignatureCheck = {
  valid: boolean;
  reason: "valid" | "missing_signature_header" | "malformed_signature_header" | "signature_mismatch" | "signature_verification_error";
};

async function verifySignature(raw: Uint8Array, signatureHeader: string, appSecret: string): Promise<SignatureCheck> {
  const value = signatureHeader.trim();
  if (!value) return { valid: false, reason: "missing_signature_header" };

  const match = /^sha256=([a-f0-9]{64})$/i.exec(value);
  if (!match) return { valid: false, reason: "malformed_signature_header" };

  try {
    const hex = match[1];
    const providedSignature = new Uint8Array(32);
    for (let i = 0; i < providedSignature.length; i++) {
      providedSignature[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const rawBuffer = new ArrayBuffer(raw.byteLength);
    new Uint8Array(rawBuffer).set(raw);
    const valid = await crypto.subtle.verify({ name: "HMAC" }, key, providedSignature, rawBuffer);
    return valid
      ? { valid: true, reason: "valid" }
      : { valid: false, reason: "signature_mismatch" };
  } catch {
    return { valid: false, reason: "signature_verification_error" };
  }
}

async function processWebhookPayload(db: ReturnType<typeof createClient<any>>, payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== "messages") continue;
      const value = change?.value || {};
      const people = Array.isArray(value.contacts) ? value.contacts : [];
      const personById = new Map<string, any>();
      for (const person of people) {
        const id = clean(person?.wa_id, 40);
        if (id) personById.set(id, person);
      }

      const incoming = Array.isArray(value.messages) ? value.messages : [];
      for (const message of incoming) {
        const externalId = clean(message?.from, 40);
        const providerId = clean(message?.id, 200);
        if (!externalId || !providerId) continue;

        const person = personById.get(externalId);
        const displayName = clean(person?.profile?.name, 160) || null;
        const type = clean(message?.type, 40).toLowerCase() || "unknown";
        let body = "";
        let mediaId: string | null = null;
        let mediaMimeType: string | null = null;
        if (type === "text") body = cleanMessageText(message?.text?.body, 4096);
        else if (type === "interactive") {
          body = cleanMessageText(message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title, 1000) || "[Interactive message]";
        } else if (type === "button") body = clean(message?.button?.text, 1000) || "[Button reply]";
        else if (type === "image" || type === "video" || type === "audio" || type === "document" || type === "sticker") {
          const media = message?.[type] || {};
          mediaId = clean(media?.id, 200) || null;
          mediaMimeType = clean(media?.mime_type, 120) || null;
          body = cleanMessageText(media?.caption, 2000) || "[" + type + " message]";
        } else if (type === "location") body = "[Location shared]";
        else if (type === "contacts") body = "[Contact card shared]";
        else if (type === "reaction") body = clean(message?.reaction?.emoji, 50) || "[Reaction]";
        else body = "[" + type + " message]";

        const receivedAt = toIso(message?.timestamp);
        const contactResult = await db.from("messaging_contacts").upsert({
          channel: "whatsapp",
          external_contact_id: externalId,
          phone_number: externalId,
          ...(displayName ? { display_name: displayName } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: "channel,external_contact_id" }).select("id").single();
        if (contactResult.error || !contactResult.data?.id) throw new Error("contact_upsert_failed");

        const conversationResult = await db.from("messaging_conversations").upsert({
          channel: "whatsapp",
          contact_id: contactResult.data.id,
        }, { onConflict: "channel,contact_id" }).select("id,unread_count").single();
        if (conversationResult.error || !conversationResult.data?.id) throw new Error("conversation_upsert_failed");

        const savedMessage = await db.from("messaging_messages").upsert({
          conversation_id: conversationResult.data.id,
          channel: "whatsapp",
          provider_message_id: providerId,
          direction: "inbound",
          message_type: type,
          body,
          media_id: mediaId,
          media_mime_type: mediaMimeType,
          status: "received",
          provider_timestamp: receivedAt,
        }, { onConflict: "channel,provider_message_id", ignoreDuplicates: true }).select("id").maybeSingle();
        if (savedMessage.error) throw new Error("message_save_failed");

        if (savedMessage.data?.id) {
          const previousUnread = Number(conversationResult.data.unread_count || 0);
          const conversationUpdate = await db.from("messaging_conversations").update({
            unread_count: previousUnread + 1,
            last_message_at: receivedAt,
            last_message_preview: previewFor(body, type),
            last_message_direction: "inbound",
            last_inbound_at: receivedAt,
            status: "open",
            updated_at: new Date().toISOString(),
          }).eq("id", conversationResult.data.id);
          if (conversationUpdate.error) throw new Error("conversation_update_failed");
        }
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const item of statuses) {
        const providerId = clean(item?.id, 200);
        const status = clean(item?.status, 30).toLowerCase();
        if (!providerId || !["sent", "delivered", "read", "failed"].includes(status)) continue;
        const eventAt = toIso(item?.timestamp);
        const patch: Record<string, unknown> = { status };
        if (status === "sent") patch.sent_at = eventAt;
        if (status === "delivered") patch.delivered_at = eventAt;
        if (status === "read") patch.read_at = eventAt;
        if (status === "failed") {
          patch.failed_at = eventAt;
          const providerError = Array.isArray(item?.errors) ? item.errors[0] : null;
          patch.error_code = clean(providerError?.code, 50) || null;
          patch.error_title = clean(providerError?.title || providerError?.message, 200) || "Message delivery failed";
        }
        const result = await db.from("messaging_messages").update(patch)
          .eq("channel", "whatsapp").eq("provider_message_id", providerId);
        if (result.error) throw new Error("message_status_update_failed");
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode") || "";
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
    if (!expectedToken) return new Response("Webhook configuration unavailable", { status: 503 });
    if (mode === "subscribe" && challenge && equalSecret(token, expectedToken)) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    }
    return new Response("Webhook verification failed", { status: 403 });
  }

  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!appSecret || !supabaseUrl || !serviceKey) return json({ success: false, error: "Webhook configuration unavailable" }, 503);

  const signature = req.headers.get("x-hub-signature-256") || "";
  const rawBuffer = new Uint8Array(await req.arrayBuffer());
  const verification = await verifySignature(rawBuffer, signature, appSecret);
  if (!verification.valid) {
    // Safe diagnostics only: never log the app secret, signature value, raw body,
    // phone numbers, or message contents.
    console.warn("WhatsApp webhook signature validation rejected", JSON.stringify({
      reason: verification.reason,
      signatureHeaderPresent: Boolean(signature.trim()),
      signatureHeaderFormatValid: /^sha256=[a-f0-9]{64}$/i.test(signature.trim()),
      rawBodyBytes: rawBuffer.byteLength,
      appSecretConfigured: Boolean(appSecret),
    }));
    return json({ success: false, error: "Invalid webhook signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBuffer));
  } catch {
    return json({ success: false, error: "Invalid JSON payload" }, 400);
  }

  const db = createClient<any>(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await processWebhookPayload(db, payload);
    return json({ received: true });
  } catch {
    // Do not log request bodies, message content, phone numbers, or secrets.
    console.error("WhatsApp webhook processing failed");
    return json({ received: false, error: "Temporary message processing failure" }, 500);
  }
});

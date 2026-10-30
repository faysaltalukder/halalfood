import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { Database } from "../../database.types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const clean = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const cleanText = (value: unknown, max: number) => String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const toIso = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : new Date().toISOString();
};
type MessengerClient = SupabaseClient<Database>;
type SignatureCheck = { valid: boolean; reason: "valid" | "missing_signature_header" | "malformed_signature_header" | "signature_mismatch" | "signature_verification_error" };
async function verifySignature(raw: ArrayBuffer, header: string, appSecret: string): Promise<SignatureCheck> {
  const value = header.trim();
  if (!value) return { valid: false, reason: "missing_signature_header" };
  const match = /^sha256=([a-f0-9]{64})$/i.exec(value);
  if (!match) return { valid: false, reason: "malformed_signature_header" };
  try {
    const hex = match[1], provided = new Uint8Array(32);
    for (let i = 0; i < 32; i++) provided[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "HMAC" }, key, provided, raw);
    return valid ? { valid: true, reason: "valid" } : { valid: false, reason: "signature_mismatch" };
  } catch { return { valid: false, reason: "signature_verification_error" }; }
}

async function processPayload(db: MessengerClient, payload: any, pageId: string) {
  if (payload?.object !== "page") return;
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const entryPage = clean(entry?.id, 100);
    if (pageId && entryPage && entryPage !== pageId) continue;
    const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const event of events) {
      const message = event?.message, senderId = clean(event?.sender?.id, 80);
      if (!message || message.is_echo || !senderId || !/^\d{5,40}$/.test(senderId)) continue;
      const providerId = clean(message?.mid, 200);
      if (!providerId) continue;
      const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
      const attachmentTypes = attachments.slice(0, 5).map((a: any) => clean(a?.type, 40) || "media");
      const type = message?.text ? "text" : (attachmentTypes[0] || "unknown");
      let body = cleanText(message?.text, 2000);
      if (!body && attachments.length) body = "[" + attachmentTypes.join(", ") + " attachment]";
      if (!body && message?.quick_reply?.payload) body = "[Quick reply: " + cleanText(message.quick_reply.payload, 300) + "]";
      if (!body) body = "[Messenger message]";
      const receivedAt = toIso(event?.timestamp);

      const contact = await db.from("messaging_contacts").upsert({
        channel: "messenger", external_contact_id: senderId, updated_at: new Date().toISOString(),
      }, { onConflict: "channel,external_contact_id" }).select("id").single();
      if (contact.error || !contact.data?.id) throw new Error("contact_upsert_failed");

      const conversation = await db.from("messaging_conversations").upsert({
        channel: "messenger", contact_id: contact.data.id,
      }, { onConflict: "channel,contact_id" }).select("id,unread_count").single();
      if (conversation.error || !conversation.data?.id) throw new Error("conversation_upsert_failed");

      const saved = await db.from("messaging_messages").upsert({
        conversation_id: conversation.data.id, channel: "messenger", provider_message_id: providerId,
        direction: "inbound", message_type: type, body, status: "received", provider_timestamp: receivedAt,
      }, { onConflict: "channel,provider_message_id", ignoreDuplicates: true }).select("id").maybeSingle();
      if (saved.error) throw new Error("message_save_failed");

      if (saved.data?.id) {
        const update = await db.from("messaging_conversations").update({
          unread_count: Number(conversation.data.unread_count || 0) + 1,
          last_message_at: receivedAt, last_message_preview: clean(body, 180),
          last_message_direction: "inbound", last_inbound_at: receivedAt,
          status: "open", updated_at: new Date().toISOString(),
        }).eq("id", conversation.data.id);
        if (update.error) throw new Error("conversation_update_failed");
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const url = new URL(req.url), mode = url.searchParams.get("hub.mode") || "";
    const token = url.searchParams.get("hub.verify_token") || "", challenge = url.searchParams.get("hub.challenge") || "";
    const expected = Deno.env.get("MESSENGER_VERIFY_TOKEN") || "";
    if (!expected) return new Response("Webhook configuration unavailable", { status: 503 });
    if (mode === "subscribe" && challenge && token === expected) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    }
    return new Response("Webhook verification failed", { status: 403 });
  }
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const appSecret = Deno.env.get("MESSENGER_APP_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const pageId = Deno.env.get("MESSENGER_PAGE_ID") || "";
  if (!appSecret || !supabaseUrl || !serviceKey || !pageId) return json({ success: false, error: "Messenger webhook configuration unavailable" }, 503);

  const signature = req.headers.get("x-hub-signature-256") || "", raw = await req.arrayBuffer();
  const check = await verifySignature(raw, signature, appSecret);
  if (!check.valid) {
    console.warn("Messenger webhook signature rejected", JSON.stringify({
      reason: check.reason, signatureHeaderPresent: Boolean(signature.trim()),
      signatureHeaderFormatValid: /^sha256=[a-f0-9]{64}$/i.test(signature.trim()),
      rawBodyBytes: raw.byteLength, appSecretConfigured: Boolean(appSecret),
    }));
    return json({ success: false, error: "Invalid webhook signature" }, 401);
  }
  let payload: any;
  try { payload = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return json({ success: false, error: "Invalid JSON payload" }, 400); }
  if (payload?.object !== "page") return json({ received: true, ignored: true });

  const db = createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await processPayload(db, payload, pageId);
    return json({ received: true });
  } catch {
    console.error("Messenger webhook processing failed; payload and customer data omitted");
    return json({ received: false, error: "Temporary message processing failure" }, 500);
  }
});

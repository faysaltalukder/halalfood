import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_ORIGIN = "https://faysaltalukder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Content-Type": "application/json",
  "Vary": "Origin"
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}
function uuid(value: unknown): string {
  const v = clean(value, 64);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : "";
}
function amount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(10000000, n)) : 0;
}
function phoneDigits(value: unknown): string {
  return clean(value, 32).replace(/\D/g, "");
}
function phoneMatches(a: unknown, b: unknown): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (!left || !right) return false;
  const normalize = (v: string) => v.startsWith("00880") ? v.slice(2) : v.startsWith("0") ? "88" + v : v;
  return normalize(left) === normalize(right);
}
function sanitizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((entry) => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const quantity = Math.max(1, Math.min(999, Math.floor(Number(item.quantity ?? item.qty) || 1)));
    return {
      name: clean(item.name ?? item.product ?? item.product_name, 120),
      slug: clean(item.slug, 90),
      quantity,
      unit_price: amount(item.price ?? item.unit_price)
    };
  }).filter((item) => item.name);
}
function hasContact(payload: Record<string, unknown>) {
  return Boolean(
    clean(payload.customerName, 2) ||
    phoneDigits(payload.customerPhone) ||
    clean(payload.customerEmail, 3)
  );
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
if (!supabaseUrl || !serviceKey) {
  console.error("Incomplete checkout endpoint is missing server Supabase credentials.");
}
const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (origin !== SITE_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if (!admin) return json({ success: false, error: "Checkout recovery is temporarily unavailable." }, 503);

  try {
    const raw = await request.text();
    if (raw.length > 18000) return json({ success: false, error: "Request is too large." }, 413);
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (clean(payload.honeypot, 120)) return json({ success: true, ignored: true });
    const action = clean(payload.action, 20);
    const checkoutSessionId = uuid(payload.checkoutSessionId ?? payload.sessionId);
    if (!checkoutSessionId) return json({ success: false, error: "Invalid checkout session." }, 400);

    if (action === "withdraw") {
      const { error } = await admin.from("incomplete_checkouts")
        .delete().eq("checkout_session_id", checkoutSessionId);
      if (error) throw error;
      return json({ success: true, deleted: true });
    }

    if (action === "complete") {
      const orderNumber = clean(payload.orderNumber, 40);
      if (!orderNumber) return json({ success: true, matched: false });
      const [{ data: lead, error: leadError }, { data: order, error: orderError }] = await Promise.all([
        admin.from("incomplete_checkouts")
          .select("id,customer_phone,status")
          .eq("checkout_session_id", checkoutSessionId)
          .maybeSingle(),
        admin.from("orders")
          .select("id,order_number,customer_phone")
          .eq("order_number", orderNumber)
          .maybeSingle()
      ]);
      if (leadError) throw leadError;
      if (orderError) throw orderError;
      if (!lead || !order || lead.status === "converted" || !phoneMatches(lead.customer_phone, order.customer_phone)) {
        return json({ success: true, matched: false });
      }
      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await admin.from("incomplete_checkouts").update({
        status: "converted",
        converted_order_id: order.id,
        converted_order_number: order.order_number,
        converted_at: now,
        last_seen_at: now,
        updated_at: now,
        expires_at: expires
      }).eq("id", lead.id);
      if (error) throw error;
      return json({ success: true, matched: true });
    }

    if (action !== "save") return json({ success: false, error: "Unsupported action." }, 400);
    if (payload.recoveryConsent !== true) {
      return json({ success: false, error: "Recovery consent is required." }, 400);
    }

    const record = {
      customer_name: clean(payload.customerName, 100) || null,
      customer_phone: clean(payload.customerPhone, 32) || null,
      customer_email: clean(payload.customerEmail, 254).toLowerCase() || null,
      delivery_address: clean(payload.deliveryAddress, 400) || null,
      order_notes: clean(payload.orderNotes, 300) || null,
      order_context: payload.orderContext === "cart" ? "cart" : "single",
      delivery_zone: ["inside_dhaka", "outside_dhaka"].includes(String(payload.deliveryZone)) ? String(payload.deliveryZone) : null,
      item_summary: sanitizeItems(payload.items),
      subtotal: amount(payload.subtotal),
      delivery_charge: amount(payload.deliveryCharge),
      total: amount(payload.total),
      last_step: clean(payload.lastStep, 80) || null,
      last_field: clean(payload.lastField, 80) || null,
      progress_percent: Math.max(0, Math.min(95, Math.floor(Number(payload.progressPercent) || 0))),
      recovery_consent: true,
      marketing_consent: payload.marketingConsent === true,
      consent_version: "2026-10-31-v1",
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    if (!record.customer_name && !record.customer_phone && !record.customer_email) {
      return json({ success: true, saved: false, reason: "No contact information entered yet." });
    }

    const { data: existing, error: existingError } = await admin.from("incomplete_checkouts")
      .select("id,status,recovery_consent_at,marketing_consent,marketing_consent_at,first_seen_at")
      .eq("checkout_session_id", checkoutSessionId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === "converted") return json({ success: true, saved: false, converted: true });

    const now = new Date().toISOString();
    const upsertRecord = {
      ...record,
      checkout_session_id: checkoutSessionId,
      recovery_consent_at: existing?.recovery_consent_at || now,
      marketing_consent_at: record.marketing_consent
        ? (existing?.marketing_consent ? (existing.marketing_consent_at || now) : now)
        : null,
      first_seen_at: existing?.first_seen_at || now,
      created_at: existing?.first_seen_at || now
    };
    const { error } = await admin.from("incomplete_checkouts")
      .upsert(upsertRecord, { onConflict: "checkout_session_id" });
    if (error) throw error;
    return json({ success: true, saved: true });
  } catch (error) {
    console.error("Incomplete checkout request failed:", error);
    return json({ success: false, error: "Could not save checkout progress." }, 500);
  }
});

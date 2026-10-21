import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const ALLOWED_EVENTS = new Set([
  "page_view", "view_item", "view_item_list", "select_item", "search",
  "add_to_cart", "view_cart", "begin_checkout", "order_submit",
  "order_success", "track_order", "whatsapp_click", "phone_click", "page_engagement"
]);

const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Vary": "Origin"
};

function textValue(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}
function safePath(v: unknown): string {
  const raw = textValue(v, 500) || "/";
  try {
    const u = new URL(raw, ALLOWED_ORIGIN);
    if (u.origin !== ALLOWED_ORIGIN) return "/";
    // Deliberately discard query strings and fragments to avoid accidental PII capture.
    return u.pathname.slice(0, 300) || "/";
  } catch {
    return "/";
  }
}
function safeEvent(input: Record<string, unknown>) {
  const eventName = textValue(input.event_name, 40);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) return null;
  const value = typeof input.value === "number" && Number.isFinite(input.value) && input.value >= 0
    ? Math.min(input.value, eventName === "page_engagement" ? 86400 : 100000000) : null;
  const quantity = typeof input.quantity === "number" && Number.isInteger(input.quantity) && input.quantity >= 0
    ? Math.min(input.quantity, 100000) : null;
  const occurred = typeof input.occurred_at === "string" ? new Date(input.occurred_at) : new Date();
  const occurredAt = Number.isFinite(occurred.getTime()) &&
    Math.abs(Date.now() - occurred.getTime()) <= 7 * 24 * 60 * 60 * 1000
      ? occurred.toISOString() : new Date().toISOString();

  return {
    event_name: eventName,
    occurred_at: occurredAt,
    page_path: safePath(input.page_path),
    page_title: textValue(input.page_title, 180),
    session_id: textValue(input.session_id, 80),
    anonymous_id: textValue(input.anonymous_id, 80),
    item_id: textValue(input.item_id, 100),
    item_name: textValue(input.item_name, 180),
    item_category: textValue(input.item_category, 100),
    currency: "BDT",
    value,
    quantity,
    search_term: textValue(input.search_term, 120),
    // Store only a fixed, non-personal marker for page timing; arbitrary client metadata is discarded.
    metadata: eventName === "page_engagement" ? { measurement: "visible_seconds" } : {}
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
  }
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 32_000) {
    return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }
  const items = Array.isArray(body) ? body : [body];
  if (items.length < 1 || items.length > 20 ||
      items.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    return new Response(JSON.stringify({ error: "Invalid event batch" }), { status: 400, headers });
  }
  const rows = items.map((item) => safeEvent(item as Record<string, unknown>));
  if (rows.some((row) => row === null)) {
    return new Response(JSON.stringify({ error: "Unsupported event" }), { status: 400, headers });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error } = await supabase.from("analytics_events").insert(rows);
  if (error) {
    console.error("analytics insert failed", error.code);
    return new Response(JSON.stringify({ error: "Event could not be saved" }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ accepted: rows.length }), { status: 202, headers });
});

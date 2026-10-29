import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const DATASET_ID = "28564665756499119";
const GRAPH_API_VERSION = "v26.0";
const CAPI_MODE = (Deno.env.get("META_CAPI_MODE") || "disabled").toLowerCase();
const TEST_EVENT_CODE = Deno.env.get("META_CAPI_TEST_EVENT_CODE") || "";
const LIVE_PURCHASE_TRACKING = Deno.env.get("HF_LIVE_PURCHASE_TRACKING") === "true";

const ALLOWED_EVENTS = new Set([
  "page_view", "page_engagement", "view_item", "view_item_list", "select_item",
  "search", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout",
  "add_shipping_info", "add_payment_info", "order_submit", "order_success",
  "purchase", "track_order", "whatsapp_click", "phone_click", "sign_up",
  "login", "generate_lead", "refund"
]);

const META_EVENT_MAP: Record<string, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  search: "Search",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  sign_up: "CompleteRegistration",
  generate_lead: "Lead",
  whatsapp_click: "Contact",
  phone_click: "Contact"
};

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
  "Vary": "Origin"
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function textValue(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}
function validEventId(v: unknown): string | null {
  const value = textValue(v, 100);
  if (!value || !/^[A-Za-z0-9._:-]{8,100}$/.test(value)) return null;
  return value;
}
function safePath(v: unknown): string {
  const raw = textValue(v, 500) || "/";
  try {
    const u = new URL(raw, ALLOWED_ORIGIN);
    if (u.origin !== ALLOWED_ORIGIN) return "/";
    return u.pathname.slice(0, 300) || "/";
  } catch {
    return "/";
  }
}
function safeCookie(v: unknown): string | null {
  const value = textValue(v, 180);
  if (!value || !/^fb\.1\.\d{10,13}\.[A-Za-z0-9._-]{1,150}$/.test(value)) return null;
  return value;
}
function safeItems(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 30).filter((item) => item && typeof item === "object" && !Array.isArray(item)).map((item: any) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    return {
      item_id: textValue(item.item_id ?? item.slug ?? item.id, 100),
      item_name: textValue(item.item_name ?? item.name ?? item.product, 180),
      item_category: textValue(item.item_category ?? item.category, 100),
      price: Number.isFinite(price) && price >= 0 ? Math.min(price, 100000000) : 0,
      quantity: Number.isInteger(quantity) && quantity >= 1 ? Math.min(quantity, 100000) : 1
    };
  });
}
function safeMetaParams(input: Record<string, unknown>, items: ReturnType<typeof safeItems>) {
  const raw = input.meta_params && typeof input.meta_params === "object" && !Array.isArray(input.meta_params)
    ? input.meta_params as Record<string, unknown> : {};
  const result: Record<string, unknown> = {};
  const value = typeof raw.value === "number" && Number.isFinite(raw.value) && raw.value >= 0
    ? Math.min(raw.value, 100000000)
    : (typeof input.value === "number" && Number.isFinite(input.value) && input.value >= 0 ? Math.min(input.value, 100000000) : null);
  if (value !== null) result.value = value;
  result.currency = "BDT";
  const idsRaw = Array.isArray(raw.content_ids) ? raw.content_ids : [];
  const ids = idsRaw.map((item) => textValue(item, 100)).filter(Boolean).slice(0, 30);
  const derivedIds = items.map((item) => item.item_id).filter(Boolean).slice(0, 30);
  if ((ids.length ? ids : derivedIds).length) result.content_ids = ids.length ? ids : derivedIds;
  const contentsRaw = Array.isArray(raw.contents) ? raw.contents : [];
  const contents = contentsRaw.slice(0, 30).filter((item: any) => item && typeof item === "object").map((item: any) => {
    const quantity = Number(item.quantity);
    const itemPrice = Number(item.item_price ?? item.price);
    return {
      id: textValue(item.id ?? item.item_id, 100) || "",
      quantity: Number.isInteger(quantity) && quantity >= 1 ? Math.min(quantity, 100000) : 1,
      item_price: Number.isFinite(itemPrice) && itemPrice >= 0 ? Math.min(itemPrice, 100000000) : 0
    };
  }).filter((item: any) => item.id);
  const derivedContents = items.filter((item) => item.item_id).map((item) => ({
    id: item.item_id,
    quantity: item.quantity,
    item_price: item.price
  }));
  if ((contents.length ? contents : derivedContents).length) result.contents = contents.length ? contents : derivedContents;
  const contentType = textValue(raw.content_type, 40);
  if (contentType === "product" || contentType === "product_group") result.content_type = contentType;
  const searchString = textValue(raw.search_string ?? input.search_term, 120);
  if (searchString) result.search_string = searchString;
  const contactMethod = textValue(raw.contact_method, 32);
  if (contactMethod === "whatsapp" || contactMethod === "phone") result.contact_method = contactMethod;
  return result;
}
function safeEvent(input: Record<string, unknown>) {
  const eventName = textValue(input.event_name, 40);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) return null;

  const occurred = typeof input.occurred_at === "string" ? new Date(input.occurred_at) : new Date();
  const occurredAt = Number.isFinite(occurred.getTime()) &&
    Math.abs(Date.now() - occurred.getTime()) <= 7 * 24 * 60 * 60 * 1000
      ? occurred.toISOString() : new Date().toISOString();
  const items = safeItems(input.items);
  const first = items[0] || {
    item_id: textValue(input.item_id, 100),
    item_name: textValue(input.item_name, 180),
    item_category: textValue(input.item_category, 100),
    price: 0,
    quantity: Number(input.quantity) || 1
  };
  const value = typeof input.value === "number" && Number.isFinite(input.value) && input.value >= 0
    ? Math.min(input.value, eventName === "page_engagement" ? 86400 : 100000000) : null;
  const quantity = typeof first.quantity === "number" && Number.isInteger(first.quantity) && first.quantity >= 0
    ? Math.min(first.quantity, 100000) : null;
  const eventId = validEventId(input.event_id);
  const pagePath = safePath(input.page_path);
  const row = {
    event_id: eventId,
    event_name: eventName,
    occurred_at: occurredAt,
    page_path: pagePath,
    page_title: textValue(input.page_title, 180),
    session_id: textValue(input.session_id, 80),
    anonymous_id: textValue(input.anonymous_id, 80),
    item_id: first.item_id || null,
    item_name: first.item_name || null,
    item_category: first.item_category || null,
    currency: "BDT",
    value,
    quantity,
    search_term: textValue(input.search_term, 120),
    metadata: eventName === "page_engagement" ? { measurement: "visible_seconds" } : {}
  };
  const fbp = safeCookie(input.fbp);
  const fbc = safeCookie(input.fbc);
  const metaParams = safeMetaParams(input, items);
  const eventSourceUrl = ALLOWED_ORIGIN + pagePath;
  return { row, eventId, eventName, occurredAt, pagePath, eventSourceUrl, items, fbp, fbc, metaParams };
}

async function readSettings(supabase: any) {
  const { data, error } = await supabase.from("tracking_event_settings").select("destination,event_key,enabled");
  if (error) throw error;
  const routes: Record<string, boolean> = {};
  for (const row of data || []) routes[String(row.destination) + ":" + String(row.event_key)] = row.enabled === true;
  return routes;
}
function publicConfig(routes: Record<string, boolean>) {
  return {
    version: 1,
    datasetId: DATASET_ID,
    routes,
    metaCapiMode: CAPI_MODE === "test" || CAPI_MODE === "production" ? CAPI_MODE : "disabled",
    testEventCodeConfigured: Boolean(TEST_EVENT_CODE),
    metaCapiTokenConfigured: Boolean(Deno.env.get("META_CAPI_ACCESS_TOKEN")),
    livePurchaseTracking: LIVE_PURCHASE_TRACKING
  };
}

async function deliverMetaEvent(supabase: any, event: ReturnType<typeof safeEvent>, req: Request, metaEventName: string) {
  if (!event?.eventId) return { status: "skipped", reason: "missing_event_id" };
  const mode = CAPI_MODE;
  if (mode !== "test" && mode !== "production") return { status: "skipped", reason: "capi_mode_disabled" };
  if (mode === "test" && !TEST_EVENT_CODE) return { status: "skipped", reason: "missing_test_event_code" };
  if (event.eventName === "purchase" && !LIVE_PURCHASE_TRACKING) return { status: "skipped", reason: "purchase_protected_for_testing_project" };

  const userAgent = textValue(req.headers.get("user-agent"), 500);
  const userData: Record<string, unknown> = {};
  if (userAgent) userData.client_user_agent = userAgent;
  if (event.fbp) userData.fbp = event.fbp;
  if (event.fbc) userData.fbc = event.fbc;

  const serverEvent: Record<string, unknown> = {
    event_name: metaEventName,
    event_time: Math.floor(Date.parse(event.occurredAt) / 1000),
    event_id: event.eventId,
    action_source: "website",
    event_source_url: event.eventSourceUrl,
    user_data: userData
  };
  if (Object.keys(event.metaParams).length) serverEvent.custom_data = event.metaParams;
  const payload: Record<string, unknown> = {
    data: [serverEvent],
    partner_agent: "HalalFood_Server_Side_Tracking"
  };
  if (mode === "test" && TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

  const { error: insertError } = await supabase.from("meta_event_delivery_log").insert({
    event_id: event.eventId,
    event_key: event.eventName,
    meta_event_name: metaEventName,
    occurred_at: event.occurredAt,
    event_source_url: event.eventSourceUrl,
    payload,
    status: "pending",
    attempts: 0
  });
  if (insertError) {
    if (String(insertError.code) === "23505") return { status: "duplicate", reason: "event_id_already_processed" };
    console.error("Meta delivery log insert failed", String(insertError.code || "unknown"));
    return { status: "failed", reason: "delivery_log_insert_failed" };
  }

  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!token) {
    await supabase.from("meta_event_delivery_log").update({
      status: "failed", attempts: 1, last_error: "Missing META_CAPI_ACCESS_TOKEN", updated_at: new Date().toISOString()
    }).eq("event_id", event.eventId);
    return { status: "failed", reason: "missing_token" };
  }

  try {
    const url = "https://graph.facebook.com/" + GRAPH_API_VERSION + "/" + DATASET_ID + "/events?access_token=" + encodeURIComponent(token);
    const responseMeta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    const result = await responseMeta.json().catch(() => ({}));
    const received = Number((result as any)?.events_received || 0);
    const success = responseMeta.ok && received > 0 && !(result as any)?.error;
    await supabase.from("meta_event_delivery_log").update({
      status: success ? "sent" : "failed",
      attempts: 1,
      meta_http_status: responseMeta.status,
      meta_response: result,
      last_error: success ? null : textValue((result as any)?.error?.message, 500) || "Meta did not confirm receipt of this event",
      sent_at: success ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq("event_id", event.eventId);
    if (!success) console.warn("Meta CAPI delivery failed", responseMeta.status, (result as any)?.error?.code || "unconfirmed");
    return { status: success ? "sent" : "failed", httpStatus: responseMeta.status };
  } catch (error) {
    await supabase.from("meta_event_delivery_log").update({
      status: "failed", attempts: 1, last_error: "Meta API request failed or timed out", updated_at: new Date().toISOString()
    }).eq("event_id", event.eventId);
    console.warn("Meta CAPI request failed", error instanceof Error ? error.name : "unknown");
    return { status: "failed", reason: "request_failed" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) return response({ error: "Origin not allowed" }, 403);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("config") !== "1") return response({ error: "Not found" }, 404);
    try {
      const routes = await readSettings(supabase);
      return response(publicConfig(routes), 200);
    } catch (error) {
      console.error("Tracking config could not be loaded", error instanceof Error ? error.name : "unknown");
      return response({ error: "Tracking configuration is temporarily unavailable" }, 503);
    }
  }

  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 32_000) return response({ error: "Payload too large" }, 413);

  let body: unknown;
  try { body = await req.json(); } catch { return response({ error: "Invalid JSON" }, 400); }
  const items = Array.isArray(body) ? body : [body];
  if (items.length < 1 || items.length > 20 ||
      items.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    return response({ error: "Invalid event batch" }, 400);
  }
  const events = items.map((item) => safeEvent(item as Record<string, unknown>));
  if (events.some((event) => event === null)) return response({ error: "Unsupported event" }, 400);
  const validEvents = events as NonNullable<typeof events[number]>[];
  const eventIds = validEvents.map((event) => event.eventId).filter(Boolean);
  if (eventIds.length !== new Set(eventIds).size) return response({ error: "Duplicate event IDs within the request" }, 400);

  const rows = validEvents.map((event) => event.row);
  const { error } = await supabase.from("analytics_events").insert(rows);
  if (error) {
    if (String(error.code) === "23505" && eventIds.length) return response({ accepted: 0, duplicate: true }, 202);
    console.error("analytics insert failed", String(error.code || "unknown"));
    return response({ error: "Event could not be saved" }, 500);
  }

  let routes: Record<string, boolean> = {};
  try { routes = await readSettings(supabase); }
  catch (error) {
    console.error("Tracking route settings could not be loaded", error instanceof Error ? error.name : "unknown");
    return response({ accepted: rows.length, delivery: "settings_unavailable" }, 202);
  }

  const delivery: Array<{ eventId: string | null; status: string; reason?: string; httpStatus?: number }> = [];
  for (const event of validEvents) {
    const metaEventName = META_EVENT_MAP[event.eventName];
    const allowed = Boolean(metaEventName && routes["meta_capi:" + event.eventName]);
    if (!allowed || (event.eventName === "purchase" && !LIVE_PURCHASE_TRACKING)) continue;
    const result = await deliverMetaEvent(supabase, event, req, metaEventName!);
    delivery.push({ eventId: event.eventId, ...result });
  }

  return response({ accepted: rows.length, metaDelivery: delivery }, 202);
});

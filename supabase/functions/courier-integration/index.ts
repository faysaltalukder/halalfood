import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
  "Vary": "Origin",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const providerName = (provider: string) => provider === "steadfast" ? "Steadfast" : provider === "pathao" ? "Pathao" : "REDX";
const readJwtPayload = (token: string): Record<string, unknown> => {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token.");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return JSON.parse(decoded);
};
async function fetchJson(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { message: clean(text, 1000) }; }
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}
function normalizePhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00880")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("880")) digits = "0" + digits.slice(3);
  if (digits.length !== 11 || !digits.startsWith("01")) {
    throw new Error("The selected order must have a valid Bangladeshi 11-digit mobile number before courier booking.");
  }
  return digits;
}
function missingSecrets(names: string[]) {
  return names.filter((name) => !Deno.env.get(name)?.trim());
}
function providerBase(provider: string) {
  if (provider === "steadfast") return "https://portal.packzy.com/api/v1";
  if (provider === "redx") {
    const configuredBase = (Deno.env.get("REDX_BASE_URL") || "https://sandbox.redx.com.bd/v1.0.0-beta").trim();
    const httpsBase = /^https:\/\//i.test(configuredBase)
      ? configuredBase
      : "https://" + configuredBase.replace(/^http:\/\//i, "");
    return httpsBase.replace(/\/+$/, "");
  }
  return (Deno.env.get("PATHAO_BASE_URL") || "https://api-hermes.pathao.com").replace(/\/+$/, "");
}
function redxHeaders() {
  const rawToken = Deno.env.get("REDX_API_TOKEN")?.trim() || "";
  const token = /^Bearer\s/i.test(rawToken) ? rawToken : "Bearer " + rawToken;
  return { "API-ACCESS-TOKEN": token, "Accept": "application/json", "Content-Type": "application/json" };
}
async function issuePathaoToken() {
  const missing = missingSecrets(["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD"]);
  if (missing.length) throw new Error("Missing Supabase Secrets: " + missing.join(", "));
  const { response, data } = await fetchJson(providerBase("pathao") + "/aladdin/api/v1/issue-token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("PATHAO_CLIENT_ID"),
      client_secret: Deno.env.get("PATHAO_CLIENT_SECRET"),
      username: Deno.env.get("PATHAO_USERNAME"),
      password: Deno.env.get("PATHAO_PASSWORD"),
      grant_type: "password",
    }),
  });
  const token = data?.access_token ?? data?.data?.access_token;
  if (!response.ok || !token) {
    throw new Error("Pathao authentication failed. Check the Client ID, Client Secret, merchant username/password and production API access.");
  }
  return String(token);
}
function providerError(data: any) {
  const candidates: any[] = [];
  const addCandidate = (value: any) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };
  addCandidate(data);
  addCandidate(Array.isArray(data) ? data[0] : null);
  addCandidate(data?.consignment);
  addCandidate(data?.data);
  addCandidate(Array.isArray(data?.data) ? data.data[0] : null);
  addCandidate(data?.data?.consignment);
  addCandidate(data?.data?.data);
  addCandidate(Array.isArray(data?.data?.data) ? data.data.data[0] : null);

  const parts: string[] = [];
  const addText = (value: unknown, label = "") => {
    if (typeof value !== "string" && typeof value !== "number") return;
    const valueText = clean(value, 180);
    if (!valueText || /^(?:\[object Object\]|null|undefined)$/i.test(valueText)) return;
    const entry = label ? label + ": " + valueText : valueText;
    if (!parts.includes(entry)) parts.push(entry);
  };
  for (const row of candidates) {
    if (!row || typeof row !== "object") continue;
    addText(row.message);
    addText(row.error);
    addText(row.detail);
    addText(row.title);
    const errors = row.errors;
    if (typeof errors === "string") addText(errors);
    else if (Array.isArray(errors)) errors.forEach((entry) => {
      if (typeof entry === "string") addText(entry);
      else if (entry && typeof entry === "object") {
        addText((entry as any).message);
        addText((entry as any).error);
      }
    });
    else if (errors && typeof errors === "object") {
      for (const [key, value] of Object.entries(errors as Record<string, unknown>).slice(0, 8)) {
        if (typeof value === "string") addText(value, key);
        else if (Array.isArray(value)) value.slice(0, 3).forEach((item) => addText(item, key));
      }
    }
  }
  return clean(parts.join("; "), 350) || "Provider returned an error without a specific message. Check the saved order fields and merchant API access.";
}
function providerRejected(data: any, responseOk: boolean) {
  const candidates: any[] = [
    data,
    Array.isArray(data) ? data[0] : null,
    data?.consignment,
    data?.data,
    Array.isArray(data?.data) ? data.data[0] : null,
    data?.data?.consignment,
    data?.data?.data,
    Array.isArray(data?.data?.data) ? data.data.data[0] : null,
  ].filter(Boolean);
  return !responseOk || candidates.some((row) =>
    row && typeof row === "object" && (
      String(row.status ?? "").toLowerCase() === "error" ||
      String(row.type ?? "").toLowerCase() === "error" ||
      row.success === false ||
      (row.code !== undefined && Number(row.code) >= 400) || (row.status_code !== undefined && Number(row.status_code) >= 400)
    )
  );
}
function providerBookingRecord(data: any) {
  if (Array.isArray(data)) return data[0] ?? {};
  if (Array.isArray(data?.data)) return data.data[0] ?? {};
  return data?.consignment ?? data?.data?.consignment ?? data?.data?.data ?? data?.data ?? data ?? {};
}

function mapCourierStatus(value: unknown): string | null {
  const s = String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (!s) return null;
  if (s.includes("delivered")) return "delivered";
  if (s.includes("return")) return "returned";
  if (s.includes("cancelled") || s.includes("canceled")) return "cancelled";
  if (s.includes("delivery_failed") || s.includes("failed") || s.includes("attempt_fail")) return "delivery_failed";
  if (s.includes("picked_up") || s === "picked" || s.includes("picked")) return "picked_up";
  if (s.includes("in_transit") || s.includes("out_for_delivery") || s.includes("transit") || s.includes("assigned")) return "in_transit";
  if (s === "pending" || s.includes("in_review") || s === "booked" || s.includes("confirmed")) return "booked";
  return null;
}
function shouldAdvanceStatus(current: string, next: string): boolean {
  const terminal = ["delivered", "returned", "cancelled", "delivery_failed"];
  if (terminal.includes(current)) return terminal.includes(next);
  if (terminal.includes(next)) return true;
  const rank: Record<string, number> = {
    draft: 0, ready_for_pickup: 1, booked: 2, picked_up: 3, in_transit: 4, delivered: 5,
  };
  return (rank[next] ?? -1) >= (rank[current] ?? 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return reply({ success: false, error: "Origin not allowed." }, 403);

  const authorization = req.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return reply({ success: false, error: "Admin sign-in is required." }, 401);

  let claims: Record<string, unknown>;
  try { claims = readJwtPayload(accessToken); }
  catch { return reply({ success: false, error: "Invalid admin session." }, 401); }
  if (String(claims.email || "").toLowerCase() !== "halalfoodbd.official@gmail.com" ||
      claims.aal !== "aal2" || claims.role !== "authenticated") {
    return reply({ success: false, error: "Only the verified Halal Food admin with MFA can use courier integration." }, 403);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ success: false, error: "Courier integration server configuration is unavailable." }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    let body: any;
    try { body = await req.json(); }
    catch { return reply({ success: false, error: "Invalid JSON body." }, 400); }
    const action = clean(body?.action, 30).toLowerCase();
    const provider = clean(body?.provider, 30).toLowerCase();
    if (!["steadfast", "pathao", "redx"].includes(provider)) return reply({ success: false, error: "Choose Steadfast, Pathao or REDX." }, 400);

    if (action === "test") {
      if (provider === "steadfast") {
        const missing = missingSecrets(["STEADFAST_API_KEY", "STEADFAST_SECRET_KEY"]);
        if (missing.length) return reply({ success: false, error: "Missing Supabase Secrets: " + missing.join(", ") }, 400);
        const { response, data } = await fetchJson(providerBase(provider) + "/get_balance", {
          method: "GET",
          headers: {
            "Api-Key": Deno.env.get("STEADFAST_API_KEY")!,
            "Secret-Key": Deno.env.get("STEADFAST_SECRET_KEY")!,
            "Accept": "application/json",
          },
        });
        if (!response.ok || String(data?.status || "").toLowerCase() === "error" || data?.success === false || (data?.status && Number(data.status) >= 400)) {
          return reply({ success: false, error: "Steadfast connection test failed. Verify the API credentials and merchant API access." }, 502);
        }
        const balance = data?.current_balance ?? data?.data?.current_balance ?? null;
        return reply({ success: true, provider: "Steadfast", message: "Steadfast API responded successfully.", balance });
      }

      if (provider === "redx") {
        const missing = missingSecrets(["REDX_API_TOKEN"]);
        if (missing.length) return reply({ success: false, error: "Missing Supabase Secrets: " + missing.join(", ") }, 400);
        const apiBase = providerBase("redx");
        const apiHost = new URL(apiBase).hostname.toLowerCase();
        const apiEnvironment = apiHost === "openapi.redx.com.bd"
          ? "Production"
          : apiHost === "sandbox.redx.com.bd" ? "Sandbox" : "Custom-host";
        const { response, data } = await fetchJson(apiBase + "/pickup/stores", {
          method: "GET",
          headers: redxHeaders(),
        });
        if (!response.ok || providerRejected(data, response.ok)) {
          return reply({ success: false, error: "REDX connection test failed (HTTP " + response.status + "). " + providerError(data) + " Check the merchant API token and access." }, 502);
        }
        const rawStores = Array.isArray(data) ? data : data?.data?.data ?? data?.data?.pickup_stores ?? data?.pickup_stores ?? data?.stores ?? data?.data ?? [];
        const stores = (Array.isArray(rawStores) ? rawStores : []).map((s: any) => ({
          id: clean(s?.pickup_store_id ?? s?.store_id ?? s?.id, 40),
          name: clean(s?.pickup_store_name ?? s?.store_name ?? s?.name ?? s?.address, 120),
        })).filter((s: any) => s.id);
        const storeId = Deno.env.get("REDX_PICKUP_STORE_ID")?.trim() || "";
        const matched = storeId ? stores.some((s: any) => s.id === storeId) : false;
        return reply({
          success: true,
          provider: "REDX",
          message: storeId
            ? (matched ? "REDX " + apiEnvironment + " API token and configured pickup store were verified." : "REDX API token works, but REDX_PICKUP_STORE_ID does not match the returned pickup stores.")
            : "REDX " + apiEnvironment + " API token works. Choose a pickup store and configure REDX_PICKUP_STORE_ID before booking.",
          api_environment: apiEnvironment.toLowerCase(),
          api_host: apiHost,
          storeIdConfigured: Boolean(storeId),
          storeMatched: matched,
          stores: stores.slice(0, 30),
        });
      }

      const token = await issuePathaoToken();
      const { response, data } = await fetchJson(providerBase(provider) + "/aladdin/api/v1/stores", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Accept": "application/json", "Content-Type": "application/json" },
      });
      if (!response.ok || (data?.type === "error") || (data?.code && Number(data.code) >= 400)) {
        return reply({ success: false, error: "Pathao login worked, but the store list could not be retrieved. Check merchant API permissions." }, 502);
      }
      const rawStores = data?.data?.data ?? data?.data?.stores ?? data?.data ?? [];
      const stores = (Array.isArray(rawStores) ? rawStores : []).map((s: any) => ({
        id: clean(s?.store_id ?? s?.id, 40),
        name: clean(s?.store_name ?? s?.name, 120),
      })).filter((s: any) => s.id);
      const storeId = Deno.env.get("PATHAO_STORE_ID")?.trim() || "";
      const matched = storeId ? stores.some((s: any) => s.id === storeId) : false;
      return reply({
        success: true,
        provider: "Pathao",
        message: storeId
          ? (matched ? "Pathao API login and configured store were verified." : "Pathao API login worked, but PATHAO_STORE_ID does not match the returned merchant stores.")
          : "Pathao API login worked. Add PATHAO_STORE_ID using one of the store IDs listed below.",
        storeIdConfigured: Boolean(storeId),
        storeMatched: matched,
        stores: stores.slice(0, 20),
      });
    }


    // Safe, one-click REDX Sandbox parcel test for one explicitly selected order.
    // This branch hardcodes the Sandbox host and never uses REDX_BASE_URL, so it cannot create a production shipment.
    if (action === "sandbox_test_book") {
      if (provider !== "redx") return reply({ success: false, error: "This quick test is available for REDX Sandbox only." }, 400);
      const missing = missingSecrets(["REDX_API_TOKEN", "REDX_PICKUP_STORE_ID"]);
      if (missing.length) return reply({ success: false, error: "Missing Supabase Secrets: " + missing.join(", ") }, 400);

      const sandboxBase = "https://sandbox.redx.com.bd/v1.0.0-beta";
      const configuredStoreId = Deno.env.get("REDX_PICKUP_STORE_ID")?.trim() || "";
      if (!/^\d+$/.test(configuredStoreId) || Number(configuredStoreId) <= 0) {
        return reply({ success: false, error: "REDX_PICKUP_STORE_ID must be a numeric pickup-store ID." }, 400);
      }

      // Verify this exact store against the Sandbox store list before sending any test parcel.
      const { response: storeResponse, data: storeData } = await fetchJson(sandboxBase + "/pickup/stores", {
        method: "GET",
        headers: redxHeaders(),
      });
      if (!storeResponse.ok || providerRejected(storeData, storeResponse.ok)) {
        return reply({
          success: false,
          error: "REDX Sandbox pickup-store check failed (HTTP " + storeResponse.status + "). " + providerError(storeData) + " Confirm REDX_API_TOKEN is a Sandbox token.",
        }, 502);
      }
      const rawStores = Array.isArray(storeData) ? storeData : storeData?.data?.data ?? storeData?.data?.pickup_stores ?? storeData?.pickup_stores ?? storeData?.stores ?? storeData?.data ?? [];
      const stores = (Array.isArray(rawStores) ? rawStores : []).map((s: any) => ({
        id: clean(s?.pickup_store_id ?? s?.store_id ?? s?.id, 40),
        name: clean(s?.pickup_store_name ?? s?.store_name ?? s?.name ?? s?.address, 120),
      })).filter((s: any) => s.id);
      const pickupStore = stores.find((s: any) => s.id === configuredStoreId);
      if (!pickupStore) {
        const options = stores.map((s: any) => s.id + (s.name ? " — " + s.name : "")).slice(0, 10).join("; ");
        return reply({
          success: false,
          error: "REDX Sandbox did not return pickup store ID " + configuredStoreId + ". The configured ID may be a dashboard/shop ID or belong to another environment. IDs returned by Sandbox: " + (options || "none"),
        }, 400);
      }

      const orderId = clean(body?.order_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return reply({ success: false, error: "Choose one valid order from the Orders page." }, 400);
      const { data: order, error: orderError } = await db.from("orders")
        .select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,total,status,notes,payment_method")
        .eq("id", orderId).maybeSingle();
      if (orderError || !order) return reply({ success: false, error: "The selected order was not found. Refresh the Orders page." }, 404);
      const orderStatus = String(order.status || "").toLowerCase();
      if (!["pending", "processing"].includes(orderStatus)) {
        return reply({ success: false, error: "For safety, the REDX Sandbox test is limited to a pending or processing order." }, 400);
      }
      if (String(order.payment_method || "cash_on_delivery").toLowerCase() !== "cash_on_delivery") {
        return reply({ success: false, error: "Only Cash on Delivery orders can be used for this Sandbox test." }, 400);
      }

      const recipientName = clean(order.customer_name, 100);
      const phone = normalizePhone(order.customer_phone);
      const address = clean(order.delivery_address, 250);
      const total = Number(order.total);
      if (recipientName.length < 3) return reply({ success: false, error: "The selected order needs a customer name with at least 3 characters." }, 400);
      if (address.length < 10) return reply({ success: false, error: "The selected order needs a delivery address of at least 10 characters." }, 400);
      if (!Number.isFinite(total) || total < 0) return reply({ success: false, error: "The selected order has an invalid COD total." }, 400);

      // The Sandbox can expose a test fixture instead of the customer's actual district.
      // Only select a fixture whose name/district explicitly says Test Area/Test District.
      const { response: areaResponse, data: areaData } = await fetchJson(sandboxBase + "/areas", {
        method: "GET",
        headers: redxHeaders(),
      });
      if (!areaResponse.ok || providerRejected(areaData, areaResponse.ok)) {
        return reply({
          success: false,
          error: "REDX Sandbox area-list check failed (HTTP " + areaResponse.status + "). " + providerError(areaData),
        }, 502);
      }
      const rawAreas = Array.isArray(areaData) ? areaData : areaData?.areas ?? areaData?.data?.areas ?? areaData?.data?.data ?? areaData?.data ?? areaData?.results ?? [];
      const sandboxAreas = (Array.isArray(rawAreas) ? rawAreas : []).map((a: any) => ({
        id: clean(a?.redx_delivery_area_id ?? a?.area_id ?? a?.delivery_area_id ?? a?.id, 40),
        name: clean(a?.redx_delivery_area ?? a?.area_name ?? a?.delivery_area ?? a?.name ?? a?.title, 120),
        district: clean(a?.district_name ?? a?.district ?? a?.districtName, 100),
      })).filter((a: any) => a.id && a.name);
      const testArea = sandboxAreas.find((a: any) => /test\s*(area|district)|sandbox/i.test(a.name + " " + a.district));
      if (!testArea || !Number.isInteger(Number(testArea.id)) || Number(testArea.id) <= 0) {
        return reply({
          success: false,
          error: "REDX Sandbox did not return a recognizable Test Area/Test District fixture. No parcel was submitted. Areas returned: " + (sandboxAreas.map((a: any) => a.name + (a.district ? " (" + a.district + ")" : "")).slice(0, 10).join("; ") || "none"),
        }, 404);
      }

      const { data: existingShipment, error: existingError } = await db.from("admin_shipments")
        .select("*").eq("order_id", order.id).maybeSingle();
      if (existingError) return reply({ success: false, error: "Could not check the selected order's courier record. Refresh and try again." }, 500);
      let shipment: any = existingShipment;
      if (shipment) {
        const oldState = String(shipment.booking_state || "not_started");
        const oldCourier = String(shipment.courier_name || "").toLowerCase();
        if (["in_progress", "succeeded", "unknown"].includes(oldState) ||
            shipment.integration_mode === "live_api" || ["booked", "picked_up", "in_transit", "delivered", "cancelled", "returned"].includes(String(shipment.shipment_status || ""))) {
          return reply({ success: false, error: "This order already has a booked, successful or uncertain courier record. Do not submit another parcel; verify that record first." }, 409);
        }
        if (oldCourier && !oldCourier.includes("redx") && !oldCourier.includes("manual") && !oldCourier.includes("placeholder")) {
          return reply({ success: false, error: "This order already has a parcel record for another courier. Do not replace it with the REDX Sandbox test." }, 409);
        }
      } else {
        const { data: createdShipment, error: createShipmentError } = await db.from("admin_shipments").insert({
          order_id: order.id,
          courier_name: "REDX",
          shipment_status: "draft",
          integration_mode: "api_ready",
          cod_amount: total,
          courier_fee: 0,
          settlement_status: "pending",
          settled_amount: 0,
          parcel_weight_kg: 1,
          parcel_notes: "REDX SANDBOX API TEST ONLY — not a real delivery.",
          created_by: "halalfoodbd.official@gmail.com",
          updated_by: "halalfoodbd.official@gmail.com",
          booking_state: "not_started",
          booking_error: "",
          provider_response: {},
        }).select("*").single();
        if (createShipmentError || !createdShipment) {
          return reply({ success: false, error: "Could not create a local test record for this order. Refresh before retrying; no REDX parcel was submitted." }, 409);
        }
        shipment = createdShipment;
      }

      const requestedAt = new Date().toISOString();
      const priorMeta = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
      const sandboxMeta = {
        ...priorMeta,
        redx_delivery_area_id: Number(testArea.id),
        redx_delivery_area: testArea.name,
        redx_sandbox_test_area: true,
        redx_sandbox_quick_test: true,
        redx_sandbox_test_only: true,
        redx_sandbox_pickup_store_id: configuredStoreId,
        redx_sandbox_test_weight_kg: 1,
        redx_sandbox_requested_at: requestedAt,
      };
      const { data: claim, error: claimError } = await db.from("admin_shipments").update({
        courier_name: "REDX",
        integration_mode: "api_ready",
        booking_state: "in_progress",
        booking_error: "",
        booking_requested_at: requestedAt,
        cod_amount: total,
        parcel_weight_kg: 1,
        parcel_notes: "REDX SANDBOX API TEST ONLY — not a real delivery.",
        provider_response: sandboxMeta,
        updated_by: "halalfoodbd.official@gmail.com",
        updated_at: requestedAt,
      }).eq("id", shipment.id).in("booking_state", ["not_started", "failed"])
        .neq("integration_mode", "live_api").neq("shipment_status", "booked")
        .select("id").maybeSingle();
      if (claimError || !claim) {
        return reply({ success: false, error: "Another test may already be running, or this order's courier record changed. Refresh and verify the row before retrying." }, 409);
      }

      const invoice = clean(order.order_number || ("HF-" + String(order.id).replace(/-/g, "").slice(0, 12)), 50);
      const sandboxInvoice = clean(invoice.slice(0, 46) + "-SBX", 50);
      const payload: Record<string, unknown> = {
        customer_name: recipientName,
        customer_phone: phone,
        delivery_area: testArea.name,
        delivery_area_id: Number(testArea.id),
        customer_address: address,
        merchant_invoice_id: sandboxInvoice,
        cash_collection_amount: String(Math.round(total * 100) / 100),
        parcel_weight: 1000,
        value: Math.round(total),
        is_closed_box: false,
        instruction: "SANDBOX API INTEGRATION TEST ONLY — NOT A REAL DELIVERY.",
        pickup_store_id: Number(configuredStoreId),
      };

      let parcelResponse: { response: Response; data: any };
      try {
        parcelResponse = await fetchJson(sandboxBase + "/parcel", {
          method: "POST",
          headers: redxHeaders(),
          body: JSON.stringify(payload),
        });
      } catch (networkError) {
        const detail = clean(networkError instanceof Error ? networkError.message : networkError, 220);
        const displayed = "REDX Sandbox did not return a clear response. Check the Sandbox parcel list before retrying to avoid a duplicate test. " + detail;
        await db.from("admin_shipments").update({
          booking_state: "unknown",
          booking_error: clean(displayed, 350),
          provider_response: { ...sandboxMeta, outcome: "unknown", error_detail: clean(detail, 250) },
          updated_at: new Date().toISOString(),
        }).eq("id", shipment.id);
        return reply({ success: false, error: displayed }, 502);
      }

      const { response: parcelHttp, data: parcelData } = parcelResponse;
      if (!parcelHttp.ok || providerRejected(parcelData, parcelHttp.ok)) {
        const detail = providerError(parcelData);
        const ambiguous = parcelHttp.status >= 500;
        const displayed = "REDX Sandbox rejected the test (HTTP " + parcelHttp.status + "). " + detail +
          (ambiguous ? " Check the Sandbox parcel list before retrying; the result may be uncertain." : "");
        await db.from("admin_shipments").update({
          booking_state: ambiguous ? "unknown" : "failed",
          booking_error: clean(displayed, 350),
          provider_response: { ...sandboxMeta, http_status: parcelHttp.status, outcome: ambiguous ? "unknown" : "rejected", error_detail: clean(detail, 300) },
          updated_at: new Date().toISOString(),
        }).eq("id", shipment.id);
        return reply({ success: false, error: clean(displayed, 500), http_status: parcelHttp.status }, 502);
      }

      const record = providerBookingRecord(parcelData);
      const providerOrderId = clean(record?.parcel_id ?? record?.id ?? record?.tracking_id ?? record?.tracking_number ?? record?.tracking_code ?? "", 100);
      const trackingId = clean(record?.tracking_id ?? record?.tracking_number ?? record?.tracking_code ?? parcelData?.tracking_id ?? parcelData?.tracking_number ?? parcelData?.data?.tracking_id ?? providerOrderId, 180);
      if (!providerOrderId && !trackingId) {
        await db.from("admin_shipments").update({
          booking_state: "unknown",
          booking_error: "REDX Sandbox responded, but no parcel/tracking ID was returned. Check Sandbox before retrying.",
          provider_response: { ...sandboxMeta, http_status: parcelHttp.status, outcome: "unknown_response", response_status: clean(parcelData?.status ?? parcelData?.data?.status ?? "received", 60) },
          updated_at: new Date().toISOString(),
        }).eq("id", shipment.id);
        return reply({ success: false, error: "REDX Sandbox responded without a parcel/tracking ID. Check the Sandbox parcel list before retrying." }, 502);
      }

      const saved = {
        ...sandboxMeta,
        outcome: "sandbox_test_succeeded",
        http_status: parcelHttp.status,
        parcel_id: providerOrderId || null,
        tracking_id: trackingId || providerOrderId,
        redx_delivery_area_id: Number(testArea.id),
        redx_delivery_area: testArea.name,
        redx_sandbox_test_area: true,
        redx_sandbox_quick_test: true,
        redx_sandbox_test_only: true,
        redx_sandbox_response_status: clean(parcelData?.status ?? parcelData?.data?.status ?? "success", 60),
      };
      const { error: saveResultError } = await db.from("admin_shipments").update({
        provider_order_id: providerOrderId || trackingId,
        tracking_id: trackingId || providerOrderId,
        shipment_status: "draft",
        integration_mode: "api_ready",
        booking_state: "succeeded",
        booking_error: "",
        provider_response: saved,
        updated_by: "halalfoodbd.official@gmail.com",
        updated_at: new Date().toISOString(),
      }).eq("id", shipment.id);
      if (saveResultError) {
        console.error("REDX Sandbox accepted a test parcel but local result save failed; order:", invoice);
        return reply({ success: false, error: "REDX Sandbox may have accepted the test, but the local test result could not be saved. Check the Sandbox parcel list before retrying." }, 500);
      }
      return reply({
        success: true,
        provider: "REDX Sandbox",
        sandbox_test_only: true,
        order_number: invoice,
        test_area: testArea.name,
        test_weight_kg: 1,
        pickup_store_id: configuredStoreId,
        tracking_id: trackingId || providerOrderId,
        message: "REDX Sandbox accepted a test parcel. This is not a real delivery and did not mark the customer order as shipped.",
      });
    }

    if (action === "areas") {
      if (provider !== "redx") return reply({ success: false, error: "Delivery-area lookup is available for REDX only." }, 400);
      const missing = missingSecrets(["REDX_API_TOKEN"]);
      if (missing.length) return reply({ success: false, error: "Missing Supabase Secrets: " + missing.join(", ") }, 400);
      const districtName = clean(body?.district_name, 80);
      if (districtName.length < 2) return reply({ success: false, error: "Enter the destination district name in English, then load REDX areas." }, 400);
      const districtAliases: Record<string, string[]> = {
        barishal: ["Barisal"], barisal: ["Barishal"],
        bogura: ["Bogra"], bogra: ["Bogura"],
        chattogram: ["Chittagong"], chittagong: ["Chattogram"],
        cumilla: ["Comilla"], comilla: ["Cumilla"],
        jashore: ["Jessore"], jessore: ["Jashore"],
      };
      const candidates = [districtName, ...(districtAliases[districtName.toLowerCase()] || [])];
      let resolvedDistrict = districtName;
      let areas: { id: string; name: string }[] = [];
      let upstreamIssue = "";
      for (const candidate of candidates) {
        const areasUrl = new URL(providerBase("redx") + "/areas");
        areasUrl.searchParams.set("district_name", candidate);
        let upstream: { response: Response; data: any };
        try {
          upstream = await fetchJson(areasUrl.toString(), { method: "GET", headers: redxHeaders() });
        } catch (networkError) {
          const detail = clean(networkError instanceof Error ? networkError.message : networkError, 220);
          console.error("REDX area API network failure:", JSON.stringify({ district: candidate, error: detail }));
          return reply({ success: false, error: "Could not reach REDX Sandbox area API for district " + candidate + ". " + (detail || "Network, DNS, TLS or timeout error.") }, 502);
        }
        const { response, data } = upstream;
        if (!response.ok || providerRejected(data, response.ok)) {
          upstreamIssue = "HTTP " + response.status + ". " + providerError(data);
          console.error("REDX area API rejected the request:", JSON.stringify({ district: candidate, status: response.status, message: clean(providerError(data), 250) }));
          if (response.status === 401 || response.status === 403) {
            return reply({ success: false, error: "REDX area lookup was rejected (HTTP " + response.status + "). Check that REDX_API_TOKEN is the Sandbox token for the configured Sandbox Base URL. " + providerError(data) }, 502);
          }
          continue;
        }
        const rawAreas = Array.isArray(data) ? data : data?.areas ?? data?.data?.areas ?? data?.data?.data ?? data?.data ?? data?.results ?? [];
        const found = (Array.isArray(rawAreas) ? rawAreas : []).map((a: any) => ({
          id: clean(a?.redx_delivery_area_id ?? a?.area_id ?? a?.delivery_area_id ?? a?.id, 40),
          name: clean(a?.redx_delivery_area ?? a?.area_name ?? a?.delivery_area ?? a?.name ?? a?.title, 120),
        })).filter((a: any) => a.id && a.name);
        if (found.length) {
          resolvedDistrict = candidate;
          areas = found.slice(0, 250);
          break;
        }
      }
      if (!areas.length && upstreamIssue) {
        // Some REDX environments return 404 for a district-filtered lookup even though
        // the general active-area list is available. Retry /areas without a district
        // and keep only entries that explicitly match the requested district.
        try {
          const allAreasUrl = new URL(providerBase("redx") + "/areas");
          const { response: allResponse, data: allData } = await fetchJson(allAreasUrl.toString(), {
            method: "GET",
            headers: redxHeaders(),
          });
          if (allResponse.ok && !providerRejected(allData, allResponse.ok)) {
            const rawAllAreas = Array.isArray(allData)
              ? allData
              : allData?.areas ?? allData?.data?.areas ?? allData?.data?.data ?? allData?.data ?? allData?.results ?? [];
            const districtAliasesForMatch: Record<string, string> = {
              barisal: "barishal", barishal: "barishal",
              bogra: "bogura", bogura: "bogura",
              chittagong: "chattogram", chattogram: "chattogram",
              comilla: "cumilla", cumilla: "cumilla",
              jessore: "jashore", jashore: "jashore",
            };
            const normalizeDistrict = (value: unknown) => {
              const key = clean(value, 100).toLowerCase().replace(/[^a-z]/g, "");
              return districtAliasesForMatch[key] || key;
            };
            const targetDistrict = normalizeDistrict(districtName);
            const allMapped = (Array.isArray(rawAllAreas) ? rawAllAreas : []).map((a: any) => {
              const name = clean(a?.redx_delivery_area ?? a?.area_name ?? a?.delivery_area ?? a?.name ?? a?.title, 120);
              const explicitDistrict = clean(a?.district_name ?? a?.district ?? a?.districtName, 100);
              const suffixMatch = name.match(/\(([^)]+)\)\s*$/);
              const labelDistrict = suffixMatch?.[1] || "";
              return {
                id: clean(a?.redx_delivery_area_id ?? a?.area_id ?? a?.delivery_area_id ?? a?.id, 40),
                name,
                district: explicitDistrict || labelDistrict,
                raw: a,
              };
            }).filter((a: any) => a.id && a.name);
            const matchedAreas = allMapped.filter((a: any) => {
              const explicit = normalizeDistrict(a.district);
              const exactName = normalizeDistrict(a.name);
              const nameStartsWithDistrict = exactName.startsWith(targetDistrict) && targetDistrict.length >= 4;
              return explicit === targetDistrict || exactName === targetDistrict || nameStartsWithDistrict;
            }).slice(0, 250);
            if (matchedAreas.length) {
              areas = matchedAreas.map((a: any) => ({ id: a.id, name: a.name }));
              resolvedDistrict = districtName;
            } else {
              const redxSandboxHost = new URL(providerBase("redx")).hostname.toLowerCase() === "sandbox.redx.com.bd";
              const sandboxTestAreas = redxSandboxHost
                ? allMapped.filter((a: any) => normalizeDistrict(a.name) === "testdistrict" || normalizeDistrict(a.district) === "testdistrict")
                : [];
              if (sandboxTestAreas.length) {
                console.info("REDX Sandbox test fixture offered for district test:", JSON.stringify({
                  requestedDistrict: districtName,
                  availableTestAreas: sandboxTestAreas.map((a: any) => ({ id: a.id, name: a.name })),
                }));
                return reply({
                  success: true,
                  provider: "REDX",
                  district_name: districtName,
                  resolved_district_name: "Test District",
                  sandbox_test_mode: true,
                  areas: sandboxTestAreas.map((a: any) => ({ id: a.id, name: a.name, sandbox_test_only: true })),
                  message: "SANDBOX TEST ONLY: REDX returned a test fixture (" + sandboxTestAreas.map((a: any) => a.name).join(", ") + ") for testing instead of " + districtName + ". Selecting this fixture tests the API integration only; it does not represent the customer's real destination.",
                });
              }
              const availableDistricts = Array.from(new Set(allMapped
                .map((a: any) => clean(a.district, 100))
                .filter((name: string) => name && !/^\d+$/.test(name))))
                .sort((a, b) => a.localeCompare(b))
                .slice(0, 12);
              const hint = availableDistricts.length
                ? " District labels returned by REDX include: " + availableDistricts.join(", ") + "."
                : "";
              console.error("REDX full area list had no exact district match:", JSON.stringify({
                requestedDistrict: districtName,
                totalActiveAreas: allMapped.length,
                exampleAreas: allMapped.slice(0, 5).map((a: any) => a.name),
              }));
              return reply({
                success: false,
                error: "REDX found no active area for district '" + districtName + "'. The unfiltered Sandbox area list was checked (" + allMapped.length + " areas) but no exact district match was found." + hint + " Use the district name for the actual destination; for a Sandbox parcel test, choose a supported test destination rather than a mismatched area.",
              }, 404);
            }
          } else {
            console.error("REDX unfiltered area fallback failed:", JSON.stringify({
              status: allResponse.status,
              message: clean(providerError(allData), 250),
            }));
            return reply({
              success: false,
              error: "REDX district lookup failed (" + upstreamIssue + "). The fallback request for the full active-area list also failed (HTTP " + allResponse.status + "). " + providerError(allData),
            }, 502);
          }
        } catch (fallbackError) {
          const detail = clean(fallbackError instanceof Error ? fallbackError.message : fallbackError, 220);
          console.error("REDX unfiltered area fallback network failure:", detail);
          return reply({
            success: false,
            error: "REDX district lookup failed (" + upstreamIssue + "). Could not retrieve the full active-area list: " + (detail || "network error"),
          }, 502);
        }
      }
      return reply({
        success: true,
        provider: "REDX",
        district_name: districtName,
        resolved_district_name: resolvedDistrict,
        areas,
        message: areas.length
          ? "REDX delivery areas loaded" + (resolvedDistrict.toLowerCase() !== districtName.toLowerCase() ? " using district spelling " + resolvedDistrict : "") + ". Select the exact area matching the customer address."
          : "No REDX delivery areas were returned for " + candidates.join(" / ") + ". Check the English district name and Sandbox API access.",
      });
    }

    if (!["book", "track"].includes(action)) return reply({ success: false, error: "Unsupported action." }, 400);
    const shipmentId = clean(body?.shipment_id, 80);
    if (!shipmentId) return reply({ success: false, error: "Choose a saved parcel record first." }, 400);

    const required = provider === "steadfast"
      ? ["STEADFAST_API_KEY", "STEADFAST_SECRET_KEY"]
      : provider === "pathao"
        ? action === "book"
          ? ["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD", "PATHAO_STORE_ID"]
          : ["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD"]
        : action === "book"
          ? ["REDX_API_TOKEN", "REDX_PICKUP_STORE_ID"]
          : ["REDX_API_TOKEN"];
    const missing = missingSecrets(required);
    if (missing.length) return reply({ success: false, error: "Missing Supabase Secrets: " + missing.join(", ") }, 400);

    const { data: shipment, error: shipmentError } = await db.from("admin_shipments")
      .select("*").eq("id", shipmentId).maybeSingle();
    if (shipmentError || !shipment) return reply({ success: false, error: "Saved parcel record not found. Refresh Operations Center and try again." }, 404);

    const expectedProvider = providerName(provider);
    const selectedCourier = clean(shipment.courier_name, 120).toLowerCase();
    if (!selectedCourier.includes(provider)) {
      return reply({ success: false, error: "The saved parcel's courier choice does not match the requested provider." }, 400);
    }

    if (action === "track") {
      if (shipment.integration_mode !== "live_api" || shipment.booking_state !== "succeeded") {
        return reply({ success: false, error: "Only successfully API-booked parcels can refresh courier status." }, 409);
      }
      const { data: linkedOrder, error: linkedOrderError } = await db.from("orders")
        .select("id,order_number").eq("id", shipment.order_id).maybeSingle();
      if (linkedOrderError || !linkedOrder) return reply({ success: false, error: "Linked order not found." }, 404);
      const invoice = clean(linkedOrder.order_number || ("HF-" + String(linkedOrder.id).replace(/-/g, "").slice(0, 12)), 50);
      let providerStatus = "";
      let trackingData: any = {};
      let providerHttpStatus = 200;
      if (provider === "steadfast") {
        const { response, data } = await fetchJson(providerBase(provider) + "/status_by_invoice/" + encodeURIComponent(invoice), {
          method: "GET",
          headers: {
            "Api-Key": Deno.env.get("STEADFAST_API_KEY")!,
            "Secret-Key": Deno.env.get("STEADFAST_SECRET_KEY")!,
            "Accept": "application/json",
          },
        });
        providerHttpStatus = response.status;
        if (!response.ok || String(data?.status || "").toLowerCase() === "error" || data?.success === false) {
          const detail = providerError(data);
          const checkedAt = new Date().toISOString();
          const previous = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
          await db.from("admin_shipments").update({
            provider_response: { ...previous, status_sync: { outcome: "error", http_status: response.status, error_detail: clean(detail, 300), checked_at: checkedAt } },
            updated_by: "halalfoodbd.official@gmail.com",
            updated_at: checkedAt,
          }).eq("id", shipmentId);
          return reply({ success: false, error: "Steadfast status refresh failed (HTTP " + response.status + "). " + detail + " The local parcel status was not changed; verify the Steadfast Merchant Dashboard." }, 502);
        }
        providerStatus = clean(data?.delivery_status ?? data?.data?.delivery_status ?? data?.status_label ?? "", 100);
        trackingData = {
          provider_status: providerStatus,
          tracking_code: clean(data?.tracking_code ?? data?.data?.tracking_code ?? shipment.tracking_id ?? "", 180),
        };
      } else if (provider === "pathao") {
        const token = await issuePathaoToken();
        const consignmentId = clean(shipment.provider_order_id, 100);
        if (!consignmentId) return reply({ success: false, error: "No Pathao consignment ID is stored for this parcel." }, 409);
        const { response, data } = await fetchJson(providerBase(provider) + "/aladdin/api/v1/orders/" + encodeURIComponent(consignmentId) + "/info", {
          method: "GET",
          headers: { "Authorization": "Bearer " + token, "Accept": "application/json", "Content-Type": "application/json" },
        });
        providerHttpStatus = response.status;
        if (!response.ok || data?.type === "error" || (data?.code && Number(data.code) >= 400) || data?.success === false) {
          const detail = providerError(data);
          const checkedAt = new Date().toISOString();
          const previous = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
          await db.from("admin_shipments").update({
            provider_response: { ...previous, status_sync: { outcome: "error", http_status: response.status, error_detail: clean(detail, 300), checked_at: checkedAt } },
            updated_by: "halalfoodbd.official@gmail.com",
            updated_at: checkedAt,
          }).eq("id", shipmentId);
          return reply({ success: false, error: "Pathao status refresh failed (HTTP " + response.status + "). " + detail + " The local parcel status was not changed; verify the Pathao Merchant Dashboard." }, 502);
        }
        const info = data?.data?.data ?? data?.data ?? data;
        // Prefer Pathao's status slug when available; it is the most useful value for mapping terminal states such as cancelled.
        providerStatus = clean(info?.order_status_slug ?? info?.status_slug ?? info?.order_status ?? info?.delivery_status ?? info?.status ?? "", 100);
        trackingData = {
          provider_status: providerStatus,
          provider_status_slug: clean(info?.order_status_slug ?? info?.status_slug ?? "", 100),
          tracking_code: clean(info?.tracking_code ?? info?.consignment_id ?? shipment.tracking_id ?? "", 180),
          consignment_id: clean(info?.consignment_id ?? shipment.provider_order_id ?? "", 100),
        };
      } else {
        const trackingIdForLookup = clean(shipment.tracking_id || shipment.provider_order_id, 180);
        if (!trackingIdForLookup) return reply({ success: false, error: "No REDX tracking ID is stored for this parcel." }, 409);
        const { response, data } = await fetchJson(providerBase("redx") + "/parcel/track/" + encodeURIComponent(trackingIdForLookup), {
          method: "GET",
          headers: redxHeaders(),
        });
        providerHttpStatus = response.status;
        if (!response.ok || providerRejected(data, response.ok)) {
          const detail = providerError(data);
          const checkedAt = new Date().toISOString();
          const previous = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
          await db.from("admin_shipments").update({
            provider_response: { ...previous, status_sync: { outcome: "error", http_status: response.status, error_detail: clean(detail, 300), checked_at: checkedAt } },
            updated_by: "halalfoodbd.official@gmail.com",
            updated_at: checkedAt,
          }).eq("id", shipmentId);
          return reply({ success: false, error: "REDX status refresh failed (HTTP " + response.status + "). " + detail + " The local parcel status was not changed; verify the REDX Merchant Dashboard." }, 502);
        }
        const info = data?.data?.data ?? data?.data ?? data;
        providerStatus = clean(info?.status ?? info?.parcel?.status ?? info?.parcel_status ?? info?.delivery_status ?? info?.tracking_status ?? info?.current_status ?? info?.status_label ?? "", 100);
        trackingData = {
          provider_status: providerStatus,
          tracking_code: clean(info?.tracking_id ?? info?.tracking_number ?? info?.tracking_code ?? info?.parcel?.tracking_id ?? shipment.tracking_id ?? "", 180),
        };
      }
      const mapped = mapCourierStatus(providerStatus);
      let nextStatus = shipment.shipment_status;
      if (mapped && shouldAdvanceStatus(String(shipment.shipment_status || "booked"), mapped)) nextStatus = mapped;
      const now = new Date().toISOString();
      const existingMeta = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
      const patch: Record<string, unknown> = {
        provider_response: {
          ...existingMeta,
          ...trackingData,
          status_checked_at: now,
          status_sync: { outcome: "success", http_status: providerHttpStatus, provider_status: providerStatus || null, mapped_status: mapped, checked_at: now },
        },
        updated_by: "halalfoodbd.official@gmail.com",
        updated_at: now,
      };
      if (mapped && nextStatus !== shipment.shipment_status) patch.shipment_status = nextStatus;
      if (nextStatus === "picked_up" && !shipment.handed_over_at) patch.handed_over_at = now;
      if (nextStatus === "delivered" && !shipment.delivered_at) patch.delivered_at = now;
      const { error: trackingSaveError } = await db.from("admin_shipments").update(patch).eq("id", shipmentId);
      if (trackingSaveError) return reply({ success: false, error: "Courier status was retrieved, but the local record could not be updated." }, 500);
      return reply({
        success: true,
        provider: expectedProvider,
        provider_status: providerStatus || "Not returned by provider",
        mapped_status: mapped,
        shipment_status: nextStatus,
        updated: nextStatus !== shipment.shipment_status,
        message: mapped ? "Courier tracking status refreshed." : "Courier responded, but the status was not recognised; the saved shipment status was left unchanged. The provider status and response were saved for diagnosis.",
      });
    }
    if (shipment.booking_state === "succeeded" || shipment.integration_mode === "live_api" || shipment.shipment_status === "booked") {
      return reply({ success: false, error: "This parcel is already booked or marked booked. Do not send it again." }, 409);
    }
    if (!["not_started", "failed"].includes(shipment.booking_state || "not_started")) {
      return reply({ success: false, error: "Booking state is " + shipment.booking_state + ". Verify the courier dashboard before retrying; duplicate booking is blocked." }, 409);
    }
    const { data: order, error: orderError } = await db.from("orders")
      .select("id,order_number,customer_name,customer_phone,customer_email,delivery_address,total,status,notes,payment_method")
      .eq("id", shipment.order_id).maybeSingle();
    if (orderError || !order) return reply({ success: false, error: "Linked customer order was not found." }, 404);
    if (["cancelled", "delivered"].includes(String(order.status || "").toLowerCase())) {
      return reply({ success: false, error: "Cancelled or delivered orders cannot be sent to a courier." }, 400);
    }
    const { data: items, error: itemsError } = await db.from("order_items")
      .select("product_name,quantity,unit").eq("order_id", order.id);
    if (itemsError) return reply({ success: false, error: "Could not read the order items. Refresh and retry." }, 500);

    const recipientName = clean(order.customer_name, 100);
    const phone = normalizePhone(order.customer_phone);
    const address = clean(order.delivery_address, provider === "pathao" ? 220 : 250);
    const total = Number(order.total);
    if (recipientName.length < 3) throw new Error("The customer name must contain at least 3 characters.");
    if (address.length < 10) throw new Error("The order needs a complete delivery address (at least 10 characters).");
    if (!Number.isFinite(total) || total < 0) throw new Error("The order total is invalid.");
    if (String(order.payment_method || "cash_on_delivery") !== "cash_on_delivery") {
      throw new Error("Only Cash on Delivery orders are enabled for courier booking.");
    }
    const invoice = clean(order.order_number || ("HF-" + String(order.id).replace(/-/g, "").slice(0, 12)), 50);
    if (!invoice) throw new Error("Order invoice could not be generated.");
    const weight = shipment.parcel_weight_kg == null ? null : Number(shipment.parcel_weight_kg);
    if (provider === "pathao" && (!Number.isFinite(weight) || weight! < 0.5 || weight! > 10)) {
      throw new Error("For Pathao, enter a parcel weight between 0.5 kg and 10 kg in the saved parcel record.");
    }
    if (provider === "redx" && (!Number.isFinite(weight) || weight! < 0.1 || weight! > 10)) {
      throw new Error("For REDX, enter a packed parcel weight between 0.1 kg and 10 kg in the saved parcel record.");
    }
    const savedProviderMeta = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
    const redxAreaId = Number(savedProviderMeta.redx_delivery_area_id);
    const redxAreaName = clean(savedProviderMeta.redx_delivery_area, 120);
    const redxSandboxTestOnly = savedProviderMeta.redx_sandbox_test_area === true;
    const redxSandboxHost = new URL(providerBase("redx")).hostname.toLowerCase() === "sandbox.redx.com.bd";
    if (provider === "redx" && redxSandboxTestOnly && !redxSandboxHost) {
      throw new Error("The REDX Sandbox test area is permitted only against the REDX Sandbox host. Confirm REDX_BASE_URL is https://sandbox.redx.com.bd/v1.0.0-beta before testing.");
    }
    if (provider === "redx" && ["test district", "test area"].includes(redxAreaName.toLowerCase()) && !redxSandboxHost) {
      throw new Error("REDX Sandbox test areas cannot be used for a real delivery. Reload actual delivery areas from the production API.");
    }
    if (provider === "redx" && (!Number.isInteger(redxAreaId) || redxAreaId <= 0 || !redxAreaName)) {
      throw new Error("Before REDX booking, use the REDX area lookup and save the exact delivery area and area ID matching the customer address.");
    }
    if (provider === "redx" && (!Number.isInteger(Number(Deno.env.get("REDX_PICKUP_STORE_ID"))) || Number(Deno.env.get("REDX_PICKUP_STORE_ID")) <= 0)) {
      throw new Error("REDX_PICKUP_STORE_ID must be the numeric pickup-store ID returned by REDX's API, not the shop ID from the dashboard URL.");
    }
    if (Math.abs(Number(shipment.cod_amount || 0) - total) > 0.01) {
      throw new Error("The parcel COD amount must match the saved order total.");
    }

    const { data: claim, error: claimError } = await db.from("admin_shipments").update({
      booking_state: "in_progress",
      booking_error: "",
      booking_requested_at: new Date().toISOString(),
      updated_by: "halalfoodbd.official@gmail.com",
      updated_at: new Date().toISOString(),
    }).eq("id", shipmentId).in("booking_state", ["not_started", "failed"])
      .neq("integration_mode", "live_api").neq("shipment_status", "booked")
      .select("id").maybeSingle();
    if (claimError || !claim) {
      return reply({ success: false, error: "Another booking attempt is in progress, or this parcel has already been processed. Refresh before continuing." }, 409);
    }

    let responseData: any;
    let providerOrderId = "";
    let trackingId = "";
    try {
      if (provider === "steadfast") {
        const payload: Record<string, unknown> = {
          invoice,
          recipient_name: recipientName,
          recipient_phone: phone,
          recipient_address: address,
          cod_amount: Math.round(total * 100) / 100,
          delivery_type: 0,
          note: clean(shipment.parcel_notes || order.notes || "", 250),
        };
        const { response, data } = await fetchJson(providerBase(provider) + "/create_order", {
          method: "POST",
          headers: {
            "Api-Key": Deno.env.get("STEADFAST_API_KEY")!,
            "Secret-Key": Deno.env.get("STEADFAST_SECRET_KEY")!,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        });
        responseData = data;
        if (providerRejected(data, response.ok)) {
          const detail = providerError(data);
          const ambiguous = response.status >= 500;
          const inactiveAccount = /account is not active/i.test(detail);
          const displayed = inactiveAccount
            ? "Steadfast rejected API booking (HTTP " + response.status + "): the merchant account is not active for API-created shipments. This is a Steadfast account/API activation issue, not an address-format problem. Ask Steadfast support to confirm API booking activation; do not retry until they confirm."
            : ambiguous
              ? "Steadfast returned HTTP " + response.status + ". " + detail + " Check the merchant dashboard before retrying; the booking outcome may be uncertain."
              : "Steadfast rejected the booking (HTTP " + response.status + "). " + detail;
          await db.from("admin_shipments").update({
            booking_state: ambiguous ? "unknown" : "failed",
            booking_error: clean(displayed, 350),
            provider_response: { http_status: response.status, outcome: ambiguous ? "unknown" : "rejected", error_detail: clean(detail, 300) },
            updated_at: new Date().toISOString(),
          }).eq("id", shipmentId);
          return reply({ success: false, error: clean(displayed, 500) }, 502);
        }
        const record = providerBookingRecord(data);
        providerOrderId = clean(record?.consignment_id ?? data?.consignment_id ?? data?.data?.consignment_id ?? "", 100);
        trackingId = clean(record?.tracking_code ?? data?.tracking_code ?? data?.data?.tracking_code ?? providerOrderId, 180);
      } else if (provider === "pathao") {
        const token = await issuePathaoToken();
        const itemRows = Array.isArray(items) ? items : [];
        const itemQuantity = Math.max(1, Math.min(999, itemRows.reduce((sum: number, item: any) => {
          const unit = String(item?.unit || "").toLowerCase();
          const q = Number(item?.quantity || 1);
          return sum + (["piece", "pieces", "pcs", "pc"].includes(unit) ? Math.max(1, Math.ceil(Number.isFinite(q) ? q : 1)) : 1);
        }, 0)));
        const description = itemRows.map((item: any) => clean(item?.product_name, 70)).filter(Boolean).join(", ").slice(0, 250);
        const payload: Record<string, unknown> = {
          store_id: Number(Deno.env.get("PATHAO_STORE_ID")),
          merchant_order_id: invoice,
          recipient_name: recipientName,
          recipient_phone: phone,
          recipient_address: address,
          delivery_type: 48,
          item_type: 2,
          special_instruction: clean(shipment.parcel_notes || order.notes || "", 250),
          item_quantity: itemQuantity,
          item_weight: weight,
          amount_to_collect: Math.round(total * 100) / 100,
          item_description: description || "Halal Food order",
        };
        if (!Number.isFinite(Number(payload.store_id)) || Number(payload.store_id) <= 0) {
          throw new Error("PATHAO_STORE_ID must be a valid numeric store ID from your Pathao merchant account.");
        }
        const { response, data } = await fetchJson(providerBase(provider) + "/aladdin/api/v1/orders", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload),
        });
        responseData = data;
        if (providerRejected(data, response.ok)) {
          const detail = providerError(data);
          const ambiguous = response.status >= 500;
          const displayed = ambiguous
            ? "Pathao returned HTTP " + response.status + ". " + detail + " Check the merchant dashboard before retrying; the booking outcome may be uncertain."
            : "Pathao rejected the booking (HTTP " + response.status + "). " + detail;
          await db.from("admin_shipments").update({
            booking_state: ambiguous ? "unknown" : "failed",
            booking_error: clean(displayed, 350),
            provider_response: { http_status: response.status, outcome: ambiguous ? "unknown" : "rejected", error_detail: clean(detail, 300) },
            updated_at: new Date().toISOString(),
          }).eq("id", shipmentId);
          return reply({ success: false, error: clean(displayed, 500) }, 502);
        }
        const d = providerBookingRecord(data);
        providerOrderId = clean(d?.consignment_id ?? d?.order_id ?? "", 100);
        trackingId = clean(d?.tracking_code ?? d?.consignment_id ?? d?.order_id ?? "", 180);
      } else {
        const redxPickupStoreId = Number(Deno.env.get("REDX_PICKUP_STORE_ID"));
        const payload: Record<string, unknown> = {
          customer_name: recipientName,
          customer_phone: phone,
          delivery_area: redxAreaName,
          delivery_area_id: redxAreaId,
          customer_address: address,
          merchant_invoice_id: invoice,
          cash_collection_amount: String(Math.round(total * 100) / 100),
          parcel_weight: Math.round(weight! * 1000),
          value: Math.round(total),
          is_closed_box: false,
          instruction: clean([shipment.parcel_notes, order.notes].filter(Boolean).join(" · "), 250),
          pickup_store_id: redxPickupStoreId,
        };
        const { response, data } = await fetchJson(providerBase("redx") + "/parcel", {
          method: "POST",
          headers: redxHeaders(),
          body: JSON.stringify(payload),
        });
        responseData = data;
        if (!response.ok || providerRejected(data, response.ok)) {
          const detail = providerError(data);
          const ambiguous = response.status >= 500;
          const displayed = ambiguous
            ? "REDX returned HTTP " + response.status + ". " + detail + " Check the REDX Merchant Dashboard before retrying; the booking outcome may be uncertain."
            : "REDX rejected the booking (HTTP " + response.status + "). " + detail;
          const previous = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
          await db.from("admin_shipments").update({
            booking_state: ambiguous ? "unknown" : "failed",
            booking_error: clean(displayed, 350),
            provider_response: { ...previous, http_status: response.status, outcome: ambiguous ? "unknown" : "rejected", error_detail: clean(detail, 300) },
            updated_at: new Date().toISOString(),
          }).eq("id", shipmentId);
          return reply({ success: false, error: clean(displayed, 500) }, 502);
        }
        const record = providerBookingRecord(data);
        providerOrderId = clean(record?.parcel_id ?? record?.id ?? record?.tracking_id ?? record?.tracking_number ?? record?.tracking_code ?? "", 100);
        trackingId = clean(record?.tracking_id ?? record?.tracking_number ?? record?.tracking_code ?? data?.tracking_id ?? data?.tracking_number ?? data?.data?.tracking_id ?? providerOrderId, 180);
        if (!providerOrderId) providerOrderId = trackingId;
      }
    } catch (providerErrorValue) {
      const message = providerErrorValue instanceof Error ? providerErrorValue.message : "Courier request failed.";
      const isValidation = /Missing Supabase Secrets|Pathao authentication failed|REDX_API_TOKEN|REDX_PICKUP_STORE_ID/.test(message);
      await db.from("admin_shipments").update({
        booking_state: isValidation ? "failed" : "unknown",
        booking_error: isValidation ? clean(message, 350) : "Courier request response was ambiguous. Check the provider dashboard before retrying.",
        updated_at: new Date().toISOString(),
      }).eq("id", shipmentId);
      return reply({ success: false, error: isValidation ? message : "Courier request did not complete clearly. Check the provider dashboard before retrying to avoid a duplicate shipment." }, isValidation ? 400 : 502);
    }

    if (!providerOrderId && !trackingId) {
      await db.from("admin_shipments").update({
        booking_state: "unknown",
        booking_error: "Provider response did not include an order or tracking identifier. Verify provider dashboard before retrying.",
        provider_response: { received_response: true },
        updated_at: new Date().toISOString(),
      }).eq("id", shipmentId);
      return reply({ success: false, error: providerName(provider) + " response did not include a parcel ID. Check its dashboard before retrying; duplicate booking is blocked." }, 502);
    }

    const minimalResponse = provider === "steadfast"
      ? {
          status: clean(responseData?.status ?? responseData?.data?.status ?? "success", 60),
          consignment_id: providerOrderId || null,
          tracking_code: trackingId || null,
        }
      : provider === "pathao"
        ? {
            type: clean(responseData?.type ?? "success", 60),
            code: Number(responseData?.code || 200),
            consignment_id: providerOrderId || null,
            tracking_code: trackingId || null,
            order_status: clean(responseData?.data?.order_status ?? responseData?.data?.data?.order_status ?? "", 80),
          }
        : {
            outcome: "success",
            parcel_id: providerOrderId || null,
            tracking_id: trackingId || null,
            redx_delivery_area_id: redxAreaId,
            redx_delivery_area: redxAreaName,
            redx_sandbox_test_area: redxSandboxTestOnly,
          };
    const { error: saveError } = await db.from("admin_shipments").update({
      courier_name: expectedProvider,
      provider_order_id: providerOrderId || trackingId,
      tracking_id: trackingId || providerOrderId,
      shipment_status: "booked",
      integration_mode: "live_api",
      booking_state: "succeeded",
      booking_error: "",
      provider_response: minimalResponse,
      updated_by: "halalfoodbd.official@gmail.com",
      updated_at: new Date().toISOString(),
    }).eq("id", shipmentId);
    if (saveError) {
      console.error("Courier accepted a booking but the local shipment update failed; reference:", clean(providerOrderId || trackingId, 100));
      return reply({ success: false, error: "The courier may have accepted the parcel, but the local tracking record could not be saved. Check the courier dashboard before retrying." }, 500);
    }
    return reply({
      success: true,
      provider: expectedProvider,
      order_number: invoice,
      tracking_id: trackingId || providerOrderId,
      message: "Parcel booked successfully. Confirm the shipment and fee in the courier merchant dashboard.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Courier integration failed.";
    console.error("Courier integration request failed:", clean(message, 350));
    return reply({ success: false, error: clean(message, 350) || "Courier integration failed." }, 400);
  }
});
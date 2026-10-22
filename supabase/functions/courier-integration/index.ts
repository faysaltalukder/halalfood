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
const providerName = (provider: string) => provider === "steadfast" ? "Steadfast" : "Pathao";
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
  if (provider === "steadfast") {
    return "https://portal.packzy.com/api/v1";
  }
  return (Deno.env.get("PATHAO_BASE_URL") || "https://api-hermes.pathao.com").replace(/\/+$/, "");
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
  const message = clean(data?.message ?? data?.error ?? data?.errors?.message ?? data?.errors ?? "Courier provider rejected the request.", 350);
  return message || "Courier provider rejected the request.";
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
    if (!["steadfast", "pathao"].includes(provider)) return reply({ success: false, error: "Choose Steadfast or Pathao." }, 400);

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

    if (!["book", "track"].includes(action)) return reply({ success: false, error: "Unsupported action." }, 400);
    const shipmentId = clean(body?.shipment_id, 80);
    if (!shipmentId) return reply({ success: false, error: "Choose a saved parcel record first." }, 400);

    const required = provider === "steadfast"
      ? ["STEADFAST_API_KEY", "STEADFAST_SECRET_KEY"]
      : action === "book"
        ? ["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD", "PATHAO_STORE_ID"]
        : ["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD"];
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
      if (provider === "steadfast") {
        const { response, data } = await fetchJson(providerBase(provider) + "/status_by_invoice/" + encodeURIComponent(invoice), {
          method: "GET",
          headers: {
            "Api-Key": Deno.env.get("STEADFAST_API_KEY")!,
            "Secret-Key": Deno.env.get("STEADFAST_SECRET_KEY")!,
            "Accept": "application/json",
          },
        });
        if (!response.ok || String(data?.status || "").toLowerCase() === "error" || data?.success === false) {
          return reply({ success: false, error: "Steadfast could not return tracking status. Check the provider dashboard and try again later." }, 502);
        }
        providerStatus = clean(data?.delivery_status ?? data?.data?.delivery_status ?? data?.status_label ?? "", 100);
        trackingData = {
          provider_status: providerStatus,
          tracking_code: clean(data?.tracking_code ?? data?.data?.tracking_code ?? shipment.tracking_id ?? "", 180),
        };
      } else {
        const token = await issuePathaoToken();
        const consignmentId = clean(shipment.provider_order_id, 100);
        if (!consignmentId) return reply({ success: false, error: "No Pathao consignment ID is stored for this parcel." }, 409);
        const { response, data } = await fetchJson(providerBase(provider) + "/aladdin/api/v1/orders/" + encodeURIComponent(consignmentId) + "/info", {
          method: "GET",
          headers: { "Authorization": "Bearer " + token, "Accept": "application/json", "Content-Type": "application/json" },
        });
        if (!response.ok || data?.type === "error" || (data?.code && Number(data.code) >= 400) || data?.success === false) {
          return reply({ success: false, error: "Pathao could not return tracking status. Check the provider dashboard and try again later." }, 502);
        }
        const info = data?.data?.data ?? data?.data ?? data;
        providerStatus = clean(info?.order_status ?? info?.delivery_status ?? info?.status ?? "", 100);
        trackingData = {
          provider_status: providerStatus,
          tracking_code: clean(info?.tracking_code ?? info?.consignment_id ?? shipment.tracking_id ?? "", 180),
          consignment_id: clean(info?.consignment_id ?? shipment.provider_order_id ?? "", 100),
        };
      }
      const mapped = mapCourierStatus(providerStatus);
      let nextStatus = shipment.shipment_status;
      if (mapped && shouldAdvanceStatus(String(shipment.shipment_status || "booked"), mapped)) nextStatus = mapped;
      const now = new Date().toISOString();
      const existingMeta = shipment.provider_response && typeof shipment.provider_response === "object" ? shipment.provider_response : {};
      const patch: Record<string, unknown> = {
        provider_response: { ...existingMeta, ...trackingData, status_checked_at: now },
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
        message: mapped ? "Courier tracking status refreshed." : "Courier responded, but the status was not recognised; the saved shipment status was left unchanged.",
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
    if (address.length < (provider === "pathao" ? 10 : 5)) throw new Error("The order needs a complete delivery address.");
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
        if (!response.ok || String(data?.status || "").toLowerCase() === "error" || data?.success === false) {
          await db.from("admin_shipments").update({
            booking_state: response.status >= 500 ? "unknown" : "failed",
            booking_error: response.status >= 500 ? "Provider server error; verify the courier dashboard before retrying." : "Steadfast rejected the booking. Review order data and merchant API response.",
            updated_at: new Date().toISOString(),
          }).eq("id", shipmentId);
          return reply({ success: false, error: response.status >= 500
            ? "Steadfast returned a server error. Verify the merchant dashboard before any retry."
            : "Steadfast rejected the booking. Check phone, address, invoice and merchant API access." }, 502);
        }
        providerOrderId = clean(data?.consignment_id ?? data?.data?.consignment_id ?? "", 100);
        trackingId = clean(data?.tracking_code ?? data?.data?.tracking_code ?? providerOrderId, 180);
      } else {
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
        const apiError = data?.type === "error" || (data?.code && Number(data.code) >= 400) || data?.success === false;
        if (!response.ok || apiError) {
          await db.from("admin_shipments").update({
            booking_state: response.status >= 500 ? "unknown" : "failed",
            booking_error: response.status >= 500 ? "Provider server error; verify the courier dashboard before retrying." : "Pathao rejected the booking. Review order data and merchant API access.",
            updated_at: new Date().toISOString(),
          }).eq("id", shipmentId);
          return reply({ success: false, error: response.status >= 500
            ? "Pathao returned a server error. Verify the merchant dashboard before any retry."
            : "Pathao rejected the booking. Check complete address, phone, parcel weight, store ID and merchant API access." }, 502);
        }
        const d = data?.data?.data ?? data?.data ?? data;
        providerOrderId = clean(d?.consignment_id ?? d?.order_id ?? "", 100);
        trackingId = clean(d?.tracking_code ?? d?.consignment_id ?? d?.order_id ?? "", 180);
      }
    } catch (providerErrorValue) {
      const message = providerErrorValue instanceof Error ? providerErrorValue.message : "Courier request failed.";
      const isValidation = /Missing Supabase Secrets|Pathao authentication failed/.test(message);
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
      : {
          type: clean(responseData?.type ?? "success", 60),
          code: Number(responseData?.code || 200),
          consignment_id: providerOrderId || null,
          tracking_code: trackingId || null,
          order_status: clean(responseData?.data?.order_status ?? responseData?.data?.data?.order_status ?? "", 80),
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
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Content-Type": "application/json"
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function dispatchApprovedPurchase(args: {
  url: string;
  serviceKey: string;
  orderNumber: string;
  fbp: string;
  fbc: string;
  userAgent: string;
}) {
  const endpoint = args.url.replace(/\/+$/, "") + "/functions/v1/analytics-ingest";
  const headers = new Headers({
    "Content-Type": "application/json",
    "Origin": ALLOWED_ORIGIN,
    "Authorization": `Bearer ${args.serviceKey}`
  });
  if (args.userAgent) headers.set("x-hf-original-user-agent", args.userAgent);
  const payload = {
    event_name: "purchase",
    order_number: args.orderNumber,
    page_path: "/order.html",
    fbp: args.fbp,
    fbc: args.fbc
  };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      console.warn("Approved-order Purchase dispatch was not confirmed:", response.status);
      return;
    }
    const deliveries = Array.isArray(result?.metaDelivery) ? result.metaDelivery : [];
    const sent = deliveries.some((item: any) =>
      item?.status === "sent" ||
      (item?.status === "duplicate" && [
        "already_sent",
        "delivery_in_progress",
        "another_delivery_attempt_claimed"
      ].includes(String(item?.reason || "")))
    );
    if (!sent) console.warn("Approved-order Meta Purchase was not confirmed by delivery log.");
  } catch (error) {
    console.warn("Approved-order Purchase dispatch failed:", error instanceof Error ? error.name : "unknown");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return reply({ success: false, error: "Origin not allowed" }, 403);

  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ success: false, error: "Authentication required." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !publicKey) {
      console.error("Security-review admin function is missing Supabase server configuration.");
      return reply({ success: false, error: "Admin review service is unavailable." }, 503);
    }

    // verify_jwt is enabled at the Supabase gateway. Confirm the signed-in identity
    // and independently require the MFA-backed aal2 claim before allowing a decision.
    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return reply({ success: false, error: "Session is not valid." }, 401);
    if (String(userData.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      return reply({ success: false, error: "Admin access only." }, 403);
    }
    const claims = decodeJwtClaims(token);
    if (claims?.aal !== "aal2") return reply({ success: false, error: "Admin MFA verification is required." }, 403);

    // Create the privileged client only after the identity and MFA checks pass.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    let body: Record<string, any>;
    try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid request body." }, 400); }
    const action = clean(body.action, 24).toLowerCase();
    if (action === "list_signals") {
      const requestedLimit = Number(body.limit || 60);
      const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 60;
      const { data: signals, error: signalError } = await admin
        .from("order_security_signals")
        .select("order_number,risk_score,risk_flags,form_elapsed_ms,ip_masked,ip_country,device_hash,user_agent,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (signalError) {
        console.error("Could not load security signal records:", String(signalError.code || "unknown"));
        return reply({ success: false, error: "Security activity could not be loaded." }, 500);
      }

      const orderNumbers = (signals || []).map((row: any) => clean(row.order_number, 20)).filter(Boolean);
      const [ordersResult, reviewsResult] = orderNumbers.length
        ? await Promise.all([
            admin.from("orders")
              .select("order_number,customer_name,customer_phone,status,total,ordered_at")
              .in("order_number", orderNumbers),
            admin.from("order_security_reviews")
              .select("order_number,status,order_payload")
              .in("order_number", orderNumbers)
          ])
        : [{ data: [], error: null }, { data: [], error: null }];

      if (ordersResult.error || reviewsResult.error) {
        console.error("Could not map order details to security signals.");
        return reply({ success: false, error: "Security activity details could not be loaded." }, 500);
      }
      const orderMap = new Map((ordersResult.data || []).map((row: any) => [row.order_number, row]));
      const reviewMap = new Map((reviewsResult.data || []).map((row: any) => [row.order_number, row]));
      const rows = (signals || []).map((signal: any) => {
        const order = orderMap.get(signal.order_number) as any;
        const review = reviewMap.get(signal.order_number) as any;
        const heldPayload = review?.order_payload && typeof review.order_payload === "object" ? review.order_payload : {};
        return {
          orderNumber: signal.order_number,
          customerName: order?.customer_name || heldPayload.name || "Customer",
          phone: order?.customer_phone || heldPayload.phone || heldPayload.mobile || "",
          orderStatus: review?.status === "pending_review" ? "review_pending" : (order?.status || "recorded"),
          total: order?.total ?? null,
          orderedAt: order?.ordered_at || signal.created_at,
          riskScore: Number(signal.risk_score || 0),
          riskFlags: Array.isArray(signal.risk_flags) ? signal.risk_flags : [],
          formElapsedMs: signal.form_elapsed_ms ?? null,
          ipMasked: signal.ip_masked || null,
          ipCountry: signal.ip_country || null,
          deviceRef: signal.device_hash ? String(signal.device_hash).slice(0, 10) : null,
          userAgent: clean(signal.user_agent, 240)
        };
      });
      return reply({ success: true, signals: rows, count: rows.length });
    }

    const reviewId = clean(body.reviewId, 50);
    const decision = clean(body.decision, 20).toLowerCase();
    const notes = clean(body.notes, 500);
    if (!/^[0-9a-f-]{36}$/i.test(reviewId) || !["approve", "reject"].includes(decision)) {
      return reply({ success: false, error: "A valid review and decision are required." }, 400);
    }

    const { data: review, error: reviewError } = await admin
      .from("order_security_reviews")
      .select("id,order_number,status,order_payload,fbp,fbc,user_agent")
      .eq("id", reviewId)
      .maybeSingle();
    if (reviewError || !review) return reply({ success: false, error: "Review item was not found." }, 404);
    if (review.status !== "pending_review") {
      return reply({ success: false, error: "This review has already been resolved." }, 409);
    }

    let savedOrderId: string | null = null;
    if (decision === "approve") {
      const { data: orderResult, error: orderError } = await admin.rpc(
        "create_website_order",
        { p_order: review.order_payload }
      );
      if (orderError || orderResult?.success !== true) {
        console.warn("Admin approval could not create the order:", String(orderError?.code || "unknown"));
        return reply({
          success: false,
          error: "অর্ডারটি এখনো অনুমোদন করা যাচ্ছে না। পণ্যের স্টক, ফোন নম্বর ও অর্ডারের তথ্য যাচাই করুন।"
        }, 400);
      }

      const { data: savedOrder, error: savedOrderError } = await admin
        .from("orders")
        .select("id,order_number")
        .eq("order_number", review.order_number)
        .eq("source", "website_parallel")
        .maybeSingle();
      if (savedOrderError || !savedOrder?.id) {
        console.error("Order was accepted by RPC but could not be resolved for review:", String(savedOrderError?.code || "unknown"));
        return reply({ success: false, error: "Order save could not be confirmed. Refresh the review list before retrying." }, 500);
      }
      savedOrderId = savedOrder.id;
    }

    const nextStatus = decision === "approve" ? "approved" : "rejected";
    const { error: updateError } = await admin
      .from("order_security_reviews")
      .update({
        status: nextStatus,
        order_id: savedOrderId,
        reviewer_email: ADMIN_EMAIL,
        review_notes: notes || null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", reviewId)
      .eq("status", "pending_review");
    if (updateError) {
      console.error("Could not resolve the security review:", String(updateError.code || "unknown"));
      return reply({ success: false, error: "The review decision could not be saved. Refresh and check its status." }, 500);
    }

    if (decision === "approve" && savedOrderId && Deno.env.get("SUPABASE_URL") && serviceKey) {
      EdgeRuntime.waitUntil(dispatchApprovedPurchase({
        url,
        serviceKey,
        orderNumber: review.order_number,
        fbp: clean(review.fbp, 180),
        fbc: clean(review.fbc, 180),
        userAgent: clean(review.user_agent, 500)
      }));
    }

    return reply({
      success: true,
      status: nextStatus,
      orderId: review.order_number,
      message: decision === "approve" ? "Order approved and created." : "Order rejected."
    });
  } catch (error) {
    console.error("order-security-admin unexpected error:", error instanceof Error ? error.name : "unknown");
    return reply({ success: false, error: "The admin review could not be completed." }, 500);
  }
});
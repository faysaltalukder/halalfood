import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Vary": "Origin",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);

  const origin = req.headers.get("origin") || "";
  if (origin !== allowedOrigin) return json({ success: false, error: "Origin not allowed." }, 403);

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 16000) return json({ success: false, error: "Request is too large." }, 413);

  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return json({ success: false, error: "Invalid request." }, 400); }

    const code = clean(body.code ?? body.couponCode, 40).toUpperCase();
    const phone = clean(body.phone, 32);
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) {
      return json({ success: true, valid: false, error: "Enter a valid coupon code." });
    }
    if (!rawItems.length || rawItems.length > 30) {
      return json({ success: true, valid: false, error: "Your cart could not be checked. Refresh and try again." });
    }

    const items = rawItems.map((item: any) => ({
      product: clean(item?.product ?? item?.name ?? item?.slug, 120),
      quantity: item?.quantity ?? item?.qty ?? 1
    }));
    if (items.some(item => !item.product)) {
      return json({ success: true, valid: false, error: "A product in your cart could not be identified." });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      console.error("Coupon validation is missing server configuration.");
      return json({ success: false, error: "Coupon service is temporarily unavailable." }, 503);
    }

    const server = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const clientIp = clean(
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown",
      128
    );
    const fingerprint = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("halal-food-coupon-preview:" + clientIp)
    );
    const ipHash = Array.from(new Uint8Array(fingerprint))
      .map(value => value.toString(16).padStart(2, "0"))
      .join("");
    const { data: rateLimit, error: rateLimitError } = await server.rpc(
      "consume_coupon_validation_rate_limit",
      { p_ip_hash: ipHash }
    );
    if (rateLimitError) {
      console.error("Coupon preview rate-limit check failed:", String(rateLimitError.code || "unknown"));
      return json({ success: false, error: "Coupon service is temporarily unavailable. Please try again." }, 503);
    }
    if (rateLimit?.allowed !== true) {
      const retryAfter = Math.max(1, Math.min(60, Number(rateLimit?.retryAfterSeconds) || 60));
      return new Response(JSON.stringify({
        success: false,
        error: "Too many coupon checks. Please wait a moment and try again."
      }), {
        status: 429,
        headers: { ...headers, "Retry-After": String(retryAfter) }
      });
    }

    const { data, error } = await server.rpc("preview_coupon_discount", {
      p_code: code,
      p_items: items,
      p_phone: phone
    });
    if (error) {
      console.error("Coupon preview RPC failed:", String(error.code || "unknown"));
      return json({ success: false, error: "Coupon service is temporarily unavailable. Please try again." }, 503);
    }
    if (!data || data.valid !== true) {
      return json({
        success: true,
        valid: false,
        error: clean(data?.message, 220) || "This coupon is invalid or unavailable."
      });
    }

    return json({
      success: true,
      valid: true,
      coupon: {
        code: clean(data.couponCode, 40),
        name: clean(data.couponName, 100),
        discountType: data.discountType === "percentage" ? "percentage" : "fixed",
        discountValue: Number(data.discountValue || 0),
        subtotal: Number(data.subtotal || 0),
        eligibleSubtotal: Number(data.eligibleSubtotal || 0),
        discountAmount: Number(data.discountAmount || 0),
        minimumOrderAmount: Number(data.minimumOrderAmount || 0)
      }
    });
  } catch (error) {
    console.error("Coupon validation request failed:", error instanceof Error ? error.name : "unknown");
    return json({ success: false, error: "Coupon service is temporarily unavailable. Please try again." }, 500);
  }
});

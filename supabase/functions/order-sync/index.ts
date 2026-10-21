import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return json({ success: false, error: "Origin not allowed" }, 403);
  try {
    let d: Record<string, any>;
    try { d = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }
    const items = Array.isArray(d.items) && d.items.length
      ? d.items
      : [{ product: d.product, quantity: d.quantity || 1, image: d.image }];
    if (items.length > 30) return json({ success: false, error: "Too many items in one order." }, 400);
    const payload = {
      name: clean(d.name, 80), phone: clean(d.mobile ?? d.phone, 32),
      email: clean(d.email, 120), address: clean(d.address, 300), notes: clean(d.notes, 500),
      deliveryZone: clean(d.deliveryZone ?? d.delivery_zone, 40),
      paymentMethod: clean(d.paymentMethod ?? d.payment_method ?? "cash_on_delivery", 40).toLowerCase(),
      orderId: clean(d.orderId, 20),
      items: items.map((item: any) => ({
        product: clean(item.product ?? item.name ?? item.slug, 120),
        quantity: item.quantity ?? item.qty ?? 1, image: clean(item.image ?? item.imageUrl, 240)
      }))
    };
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      console.error("Missing Supabase server environment configuration.");
      return json({ success: false, error: "Order service is temporarily unavailable. Please try again." }, 503);
    }
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("create_website_order", { p_order: payload });
    if (error) {
      const message = String(error.message || "");
      const clientError = /Please enter|Sorry, this product|Cash on Delivery|select a valid delivery|Not enough stock|Too many items|between 1 and 30|Too many orders/i.test(message);
      return json({ success: false, error: clientError ? message : "Order could not be placed. Please try again or contact us by phone." }, clientError ? 400 : 500);
    }
    if (!data || data.success !== true) return json({ success: false, error: "Order could not be placed. Please try again." }, 500);
    return json(data);
  } catch (error) {
    console.error("order-sync unexpected error:", error);
    return json({ success: false, error: "Order could not be placed. Please try again or contact us by phone." }, 500);
  }
});
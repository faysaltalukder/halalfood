import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://faysaltalukder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const normalizePhone = (value: string) => {
  let v = value.replace(/[^0-9+]/g, "");
  if (v.startsWith("+880")) v = "0" + v.slice(4);
  else if (v.startsWith("880") && v.length === 13) v = "0" + v.slice(3);
  return v;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ success: false, error: "Method not allowed." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return json({ success: false, error: "Origin not allowed." }, 403);

  const url = new URL(req.url);
  const orderId = (url.searchParams.get("orderId") || "").trim().toUpperCase();
  const mobile = normalizePhone(url.searchParams.get("mobile") || "");
  if (!/^HF-\d{4,6}$/.test(orderId) || !/^01\d{9}$/.test(mobile)) {
    return json({ success: false, error: "সঠিক Order ID এবং মোবাইল নম্বর দিন।" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Tracking service is not configured." }, 500);

  try {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: order, error } = await admin.from("orders")
      .select("id,order_number,customer_name,customer_phone,total,status,updated_at,ordered_at")
      .eq("order_number", orderId)
      .eq("customer_phone", mobile)
      .maybeSingle();
    if (error) throw error;
    if (!order) return json({ success: false, error: "এই Order ID ও মোবাইল নম্বরের সঙ্গে কোনো অর্ডার মেলেনি।" }, 404);

    const { data: items, error: itemsError } = await admin.from("order_items")
      .select("product_name,quantity,line_total")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;

    const statusLabels: Record<string, string> = {
      pending: "Order Received",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Order Cancelled"
    };
    return json({
      success: true,
      orderId: order.order_number,
      customerName: order.customer_name,
      orderTotal: order.total,
      status: statusLabels[order.status] || "Order Received",
      statusCode: order.status,
      lastUpdated: order.updated_at || order.ordered_at,
      courier: null,
      trackingNumber: null,
      items: (items || []).map((item: any) => ({
        product: item.product_name,
        quantity: item.quantity,
        lineTotal: item.line_total
      }))
    });
  } catch (error) {
    console.error("order-track error", error);
    return json({ success: false, error: "অর্ডারের তথ্য আনা যায়নি। পরে আবার চেষ্টা করুন।" }, 500);
  }
});
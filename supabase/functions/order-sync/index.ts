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
 
async function hmacFingerprint(secret: string, namespace: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(namespace + ":" + value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function maskedIp(value: string): string | null {
  const ip = String(value || "").trim();
  if (!ip) return null;
  const ipv4Mapped = ip.match(/::ffff:(\\d+\\.\\d+\\.\\d+\\.\\d+)$/i);
  const ipv4 = ipv4Mapped?.[1] || ip;
  const parts = ipv4.split(".");
  if (parts.length === 4 && parts.every(part => /^\\d{1,3}$/.test(part) && Number(part) <= 255)) {
    return parts[0] + "." + parts[1] + "." + parts[2] + ".x";
  }
  if (ip.includes(":")) {
    const groups = ip.split("%")[0].split(":").filter(Boolean);
    return groups.length ? groups.slice(0, 3).join(":") + ":x::/48" : "IPv6";
  }
  return "unavailable";
}


// Purchase enablement is decided by the MFA-protected runtime settings in analytics-ingest.

async function verifyTurnstileToken(token: string, remoteIp: string): Promise<{ verified: boolean; unavailable: boolean; errorCodes: string[] }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { verified: false, unavailable: true, errorCodes: ["missing-secret"] };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return { verified: false, unavailable: true, errorCodes: ["siteverify-http-error"] };

  const result = await response.json().catch(() => null);
  const errorCodes = Array.isArray(result?.["error-codes"])
    ? result["error-codes"].map((code: unknown) => clean(code, 80))
    : [];
  return {
    verified: result?.success === true &&
      result?.hostname === "faysaltalukder.github.io" &&
      result?.action === "checkout",
    unavailable: false,
    errorCodes
  };
}

async function dispatchVerifiedPurchase(args: {
  url: string;
  key: string;
  orderId: string;
  fbp: string;
  fbc: string;
  userAgent: string;
  clientIp: string;
}) {
  const endpoint = args.url.replace(/\/+$/, "") + "/functions/v1/analytics-ingest";
  const headers = new Headers({
    "Content-Type": "application/json",
    "Origin": allowedOrigin,
    "Authorization": `Bearer ${args.key}`
  });
  if (args.userAgent) headers.set("x-hf-original-user-agent", args.userAgent);
  if (args.clientIp) headers.set("x-hf-original-client-ip", args.clientIp);
  const payload = {
    event_name: "purchase",
    order_number: args.orderId,
    page_path: "/order.html",
    fbp: args.fbp,
    fbc: args.fbc
  };

  // Background task starts only after the RPC confirms the order was saved.
  // Retrying uses the same server-derived order ID, so the delivery log and Meta event_id
  // prevent duplicate conversions while allowing a previously failed delivery to recover.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        throw new Error("Internal tracking endpoint returned HTTP " + response.status);
      }
      const delivery = Array.isArray(result?.metaDelivery) ? result.metaDelivery : [];
      const confirmed = delivery.some((item: any) =>
        item?.status === "sent" ||
        (item?.status === "duplicate" && [
          "already_sent",
          "delivery_in_progress",
          "another_delivery_attempt_claimed"
        ].includes(String(item?.reason || "")))
      );
      if (!confirmed && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
      if (!confirmed) {
        console.warn(
          "Verified-order Meta Purchase was not confirmed after retries.",
          delivery.map((item: any) => ({ status: item?.status, reason: item?.reason }))
        );
      }
      return;
    } catch (error) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
      console.warn("Verified-order Meta delivery failed after retries; saved order remains intact.", error instanceof Error ? error.name : "unknown");
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return json({ success: false, error: "Origin not allowed" }, 403);

  try {
    let d: Record<string, any>;
    try { d = await req.json(); } catch { return json({ success: false, error: "Invalid JSON" }, 400); }

    // Fail closed: validate the one-time browser token before creating an order or
    // allowing the Google Sheets backup to be triggered by the checkout client.
    // A filled hidden field is a strong bot signal. Do not create an order or call Sheets.
    const honeypot = clean(d.honeypot ?? d.hf_website, 160);
    if (honeypot) {
      console.warn("Checkout honeypot triggered; submission rejected.");
      return json({ success: false, error: "অর্ডার যাচাই করা যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" }, 403);
    }

    const turnstileToken = clean(d.turnstileToken ?? d["cf-turnstile-response"], 2048);
    if (!turnstileToken) {
      return json({ success: false, error: "নিরাপত্তা যাচাই পাওয়া যায়নি। আবার যাচাই করে অর্ডার দিন।" }, 400);
    }
    const turnstileIp = clean(req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip"), 64);
    let turnstileResult: { verified: boolean; unavailable: boolean; errorCodes: string[] };
    try {
      turnstileResult = await verifyTurnstileToken(turnstileToken, turnstileIp);
    } catch (verificationError) {
      console.error("Turnstile Siteverify request failed:", verificationError instanceof Error ? verificationError.name : "unknown");
      return json({ success: false, error: "নিরাপত্তা যাচাই সেবা সাময়িকভাবে পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।" }, 503);
    }
    if (turnstileResult.unavailable) {
      console.error("Turnstile is not configured or Siteverify is unavailable:", turnstileResult.errorCodes);
      return json({ success: false, error: "নিরাপত্তা যাচাই সেবা সাময়িকভাবে পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।" }, 503);
    }
    if (!turnstileResult.verified) {
      console.warn("Turnstile rejected checkout token:", turnstileResult.errorCodes);
      return json({ success: false, error: "নিরাপত্তা যাচাই সম্পন্ন হয়নি। আবার যাচাই করে অর্ডার দিন।" }, 403);
    }

    const items = Array.isArray(d.items) && d.items.length
      ? d.items
      : [{ product: d.product, quantity: d.quantity || 1, image: d.image }];
    if (items.length > 30) return json({ success: false, error: "Too many items in one order." }, 400);
    const payload = {
      name: clean(d.name, 80),
      phone: clean(d.mobile ?? d.phone, 32),
      email: clean(d.email, 120),
      address: clean(d.address, 300),
      notes: clean(d.notes, 500),
      deliveryZone: clean(d.deliveryZone ?? d.delivery_zone, 40),
      paymentMethod: clean(d.paymentMethod ?? d.payment_method ?? "cash_on_delivery", 40).toLowerCase(),
      orderId: clean(d.orderId, 20),
      checkoutSessionId: clean(d.checkoutSessionId, 64),
      items: items.map((item: any) => ({
        product: clean(item.product ?? item.name ?? item.slug, 120),
        quantity: item.quantity ?? item.qty ?? 1,
        image: clean(item.image ?? item.imageUrl, 240)
      }))
    };

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      console.error("Missing Supabase server environment configuration.");
      return json({ success: false, error: "Order service is temporarily unavailable. Please try again." }, 503);
    }
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // Risk checks add up several weak signals; no single IP/device match blocks an order.
    // Raw IP and device identifiers are never stored. Fingerprints are HMACed using the
    // server-only Turnstile secret, with a namespace per identifier type.
    const fingerprintSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!fingerprintSecret) {
      console.error("Missing TURNSTILE_SECRET_KEY for checkout risk fingerprinting.");
      return json({ success: false, error: "Order service is temporarily unavailable. Please try again." }, 503);
    }
    const clientIp = clean(req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip"), 64);
    const ipMasked = maskedIp(clientIp);
    const ipCountry = clean(req.headers.get("cf-ipcountry"), 8).toUpperCase() || null;
    const userAgent = clean(req.headers.get("user-agent"), 500) || null;
    const deviceId = clean(d.deviceId ?? d.hf_device_id, 100);
    const normalizedPhone = clean(payload.phone, 32).replace(/[\\s-]/g, "");
    const [ipHash, deviceHash, phoneHash] = await Promise.all([
      clientIp ? hmacFingerprint(fingerprintSecret, "ip", clientIp) : Promise.resolve(null),
      deviceId ? hmacFingerprint(fingerprintSecret, "device", deviceId) : Promise.resolve(null),
      normalizedPhone ? hmacFingerprint(fingerprintSecret, "phone", normalizedPhone) : Promise.resolve(null)
    ]);

    const now = Date.now();
    const startedAt = Number(d.formStartedAt ?? d.hf_form_started_at);
    const elapsedMs = Number.isFinite(startedAt) && startedAt > 0 && startedAt <= now
      ? Math.min(now - startedAt, 24 * 60 * 60 * 1000)
      : null;
    const isoAgo = (milliseconds: number) => new Date(now - milliseconds).toISOString();
    const countSignals = async (column: "ip_hash" | "device_hash" | "phone_hash", hash: string | null, windowMs: number) => {
      if (!hash) return 0;
      const { count, error: countError } = await admin
        .from("order_security_signals")
        .select("id", { count: "exact", head: true })
        .eq(column, hash)
        .gte("created_at", isoAgo(windowMs));
      if (countError) throw countError;
      return Number(count || 0);
    };

    const [ip10mCount, device1hCount, phone24hSignalCount, phone24hOrderCount] = await Promise.all([
      countSignals("ip_hash", ipHash, 10 * 60 * 1000),
      countSignals("device_hash", deviceHash, 60 * 60 * 1000),
      countSignals("phone_hash", phoneHash, 24 * 60 * 60 * 1000),
      (async () => {
        if (!normalizedPhone) return 0;
        const { count, error: phoneError } = await admin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_phone", normalizedPhone)
          .gte("ordered_at", isoAgo(24 * 60 * 60 * 1000));
        if (phoneError) throw phoneError;
        return Number(count || 0);
      })()
    ]);

    let riskScore = 0;
    const riskFlags: string[] = [];
    if (elapsedMs !== null && elapsedMs < 900) {
      riskScore += 35;
      riskFlags.push("form_submitted_under_1_second");
    } else if (elapsedMs !== null && elapsedMs < 2500) {
      riskScore += 18;
      riskFlags.push("form_submitted_under_2_5_seconds");
    }
    if (ip10mCount >= 8) {
      riskScore += 50;
      riskFlags.push("many_orders_from_same_ip_in_10_minutes");
    } else if (ip10mCount >= 5) {
      riskScore += 25;
      riskFlags.push("repeated_orders_from_same_ip_in_10_minutes");
    }
    if (device1hCount >= 5) {
      riskScore += 55;
      riskFlags.push("many_orders_from_same_device_in_1_hour");
    } else if (device1hCount >= 3) {
      riskScore += 35;
      riskFlags.push("repeated_orders_from_same_device_in_1_hour");
    }
    const phone24hCount = Math.max(phone24hSignalCount, phone24hOrderCount);
    if (phone24hCount >= 5) {
      riskScore += 30;
      riskFlags.push("many_orders_from_same_phone_in_24_hours");
    } else if (phone24hCount >= 3) {
      riskScore += 15;
      riskFlags.push("repeated_orders_from_same_phone_in_24_hours");
    }
    riskScore = Math.min(100, riskScore);

    const riskSignal = {
      order_number: payload.orderId,
      ip_hash: ipHash,
      device_hash: deviceHash,
      phone_hash: phoneHash,
      ip_masked: ipMasked,
      ip_country: ipCountry,
      form_elapsed_ms: elapsedMs,
      user_agent: userAgent,
      risk_score: riskScore,
      risk_flags: riskFlags
    };

    // High-risk orders are held outside the normal orders table. They do not reserve stock,
    // dispatch Purchase events, or trigger courier booking until an MFA-protected admin approves.
    if (riskScore >= 60) {
      const { data: review, error: reviewError } = await admin
        .from("order_security_reviews")
        .insert({
          order_number: payload.orderId,
          status: "pending_review",
          risk_score: riskScore,
          risk_flags: riskFlags,
          ip_hash: ipHash,
          device_hash: deviceHash,
          phone_hash: phoneHash,
          ip_masked: ipMasked,
          ip_country: ipCountry,
          form_elapsed_ms: elapsedMs,
          user_agent: userAgent,
          order_payload: payload,
          fbp: clean(d.fbp, 180),
          fbc: clean(d.fbc, 180)
        })
        .select("id")
        .single();
      if (reviewError) {
        console.error("Could not place suspicious order in the review queue:", String(reviewError.code || "unknown"));
        return json({ success: false, error: "অর্ডারটি নিরাপত্তা যাচাইয়ের জন্য জমা করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" }, 503);
      }
      const { error: signalError } = await admin
        .from("order_security_signals")
        .upsert(riskSignal, { onConflict: "order_number", ignoreDuplicates: true });
      if (signalError) console.warn("Could not save a checkout fingerprint signal:", String(signalError.code || "unknown"));
      return json({
        success: true,
        heldForReview: true,
        reviewId: review.id,
        orderId: payload.orderId,
        riskScore,
        riskFlags,
        message: "Order received and held for a quick manual security review."
      }, 202);
    }

    const { data, error } = await admin.rpc("create_website_order", { p_order: payload });
    if (error) {
      const message = String(error.message || "");
      const clientError = /Please enter|Sorry, this product|Cash on Delivery|select a valid delivery|Not enough stock|Too many items|between 1 and 30|Too many orders/i.test(message);
      return json({ success: false, error: clientError ? message : "Order could not be placed. Please try again or contact us by phone." }, clientError ? 400 : 500);
    }
    if (!data || data.success !== true) return json({ success: false, error: "Order could not be placed. Please try again." }, 500);

    if (typeof data.orderId === "string" && /^HF-[0-9]{4,6}$/.test(data.orderId)) {
      const { error: signalError } = await admin
        .from("order_security_signals")
        .upsert(riskSignal, { onConflict: "order_number", ignoreDuplicates: true });
      if (signalError) console.warn("Could not save a checkout fingerprint signal:", String(signalError.code || "unknown"));
    }

    // Resolve the same stable, database-derived event ID used by analytics-ingest.
    // The browser may send its Pixel copy only when this saved-order lookup succeeds.
    let purchaseEventId: string | null = null;
    if (typeof data.orderId === "string" && /^HF-[0-9]{4,6}$/.test(data.orderId)) {
      const { data: savedOrder, error: savedOrderError } = await admin
        .from("orders")
        .select("id,order_number")
        .eq("order_number", data.orderId)
        .eq("source", "website_parallel")
        .maybeSingle();

      if (savedOrderError) {
        console.warn("Verified order ID lookup failed; browser Pixel Purchase will be skipped.", String(savedOrderError.code || "unknown"));
      } else if (savedOrder?.id) {
        const checkoutSessionId = payload.checkoutSessionId;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutSessionId)) {
          const convertedAt = new Date().toISOString();
          const { error: incompleteCheckoutError } = await admin
            .from("incomplete_checkouts")
            .update({
              status: "converted",
              converted_order_id: savedOrder.id,
              converted_order_number: data.orderId,
              converted_at: convertedAt,
              last_seen_at: convertedAt,
              updated_at: convertedAt
            })
            .eq("checkout_session_id", checkoutSessionId)
            .eq("status", "incomplete");
          if (incompleteCheckoutError) {
            console.warn("Saved order could not mark its incomplete checkout as converted:", String(incompleteCheckoutError.code || "unknown"));
          }
        }
        purchaseEventId = "hf_purchase_" + String(savedOrder.id).replace(/-/g, "");

        // Dispatch after persistence, including idempotent duplicate submissions.
        // Stable event_id deduplicates browser Pixel against server CAPI and makes retries safe.
        const clientIp = clean(
          req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip"),
          64
        );
        const purchaseDispatch = dispatchVerifiedPurchase({
          url,
          key,
          orderId: data.orderId,
          fbp: clean(d.fbp, 180),
          fbc: clean(d.fbc, 180),
          userAgent: clean(req.headers.get("user-agent"), 500),
          clientIp
        });
        const edgeRuntime = (globalThis as typeof globalThis & {
          EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
        }).EdgeRuntime;
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(purchaseDispatch);
        else void purchaseDispatch;
      } else {
        console.warn("Saved order was not found for Purchase dispatch.");
      }
    }
    return json(purchaseEventId ? { ...data, purchaseEventId } : data);
  } catch (error) {
    console.error("order-sync unexpected error:", error);
    return json({ success: false, error: "Order could not be placed. Please try again or contact us by phone." }, 500);
  }
});
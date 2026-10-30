import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

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

function normalizeBangladeshPhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00880")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("880")) digits = "0" + digits.slice(3);
  if (!/^01\d{9}$/.test(digits)) {
    throw new Error("Enter a valid Bangladeshi 11-digit mobile number (01XXXXXXXXX).");
  }
  return digits;
}

async function hmacPhone(secret: string, phone: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("courier-history-phone:" + phone));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeSummary(name: string, raw: any) {
  const source = raw && typeof raw === "object" ? raw : {};
  const dataType = clean(source.data_type || "delivery", 30).toLowerCase();
  const total = toNumber(source.total);
  const success = toNumber(source.success);
  const cancel = toNumber(source.cancel);
  let successRate = toNumber(source.success_rate);
  if (successRate === null && dataType !== "rating" && total !== null && total > 0 && success !== null) {
    successRate = Math.round((success / total) * 10000) / 100;
  }
  return {
    courierName: clean(name, 40),
    dataType,
    customerRating: clean(source.customer_rating, 60) || null,
    riskLevel: clean(source.risk_level, 30).toLowerCase() || null,
    message: clean(source.message, 240) || null,
    successRate,
    total: total !== null ? Math.max(0, total) : null,
    success: success !== null ? Math.max(0, success) : null,
    cancel: cancel !== null ? Math.max(0, cancel) : null,
    showCount: source.show_count === true || (dataType !== "rating" && total !== null)
  };
}

function normalizeResult(payload: any) {
  const rawSummaries = payload?.data?.Summaries ?? payload?.Summaries ?? {};
  if (!rawSummaries || typeof rawSummaries !== "object" || Array.isArray(rawSummaries)) {
    throw new Error("Courier-history provider returned an unsupported response format.");
  }
  const summaries = Object.entries(rawSummaries)
    .slice(0, 12)
    .map(([name, raw]) => normalizeSummary(name, raw));
  const rawTotal = payload?.data?.totalSummary ?? payload?.totalSummary ?? {};
  const total = toNumber(rawTotal.total);
  const success = toNumber(rawTotal.success);
  const cancel = toNumber(rawTotal.cancel);
  const successRate = toNumber(rawTotal.successRate);
  const cancelRate = toNumber(rawTotal.cancelRate);
  return {
    summaries,
    totalSummary: {
      total: total !== null ? Math.max(0, total) : null,
      success: success !== null ? Math.max(0, success) : null,
      cancel: cancel !== null ? Math.max(0, cancel) : null,
      successRate,
      cancelRate
    }
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return reply({ success: false, error: "Origin not allowed." }, 403);

  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ success: false, error: "Authentication required." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("FRAUDBD_API_KEY");
    const fingerprintSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!url || !serviceKey || !publicKey) {
      console.error("Courier history function is missing Supabase server configuration.");
      return reply({ success: false, error: "Courier-history service is temporarily unavailable." }, 503);
    }

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

    if (!apiKey?.trim()) {
      return reply({
        success: false,
        code: "FRAUDBD_API_KEY_MISSING",
        error: "Courier-history API is not connected yet. Add FRAUDBD_API_KEY in Supabase Edge Function Secrets after creating an active Fraud BD API plan."
      }, 503);
    }
    if (!fingerprintSecret) {
      return reply({ success: false, error: "Secure phone-hash configuration is unavailable." }, 503);
    }

    let body: Record<string, any>;
    try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid request body." }, 400); }
    let phone: string;
    try { phone = normalizeBangladeshPhone(body.phone); }
    catch (error) { return reply({ success: false, error: error instanceof Error ? error.message : "Invalid phone number." }, 400); }

    const phoneHash = await hmacPhone(fingerprintSecret, phone);
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const now = new Date();
    const { data: cached, error: cacheError } = await admin
      .from("courier_customer_history_cache")
      .select("result,checked_at,expires_at")
      .eq("phone_hash", phoneHash)
      .gt("expires_at", now.toISOString())
      .maybeSingle();
    if (cacheError) {
      console.warn("Courier-history cache lookup failed:", String(cacheError.code || "unknown"));
    } else if (cached?.result) {
      return reply({
        success: true,
        source: "Fraud BD courier-history aggregator",
        cached: true,
        checkedAt: cached.checked_at,
        expiresAt: cached.expires_at,
        ...cached.result
      });
    }

    let response: Response;
    let upstream: any;
    try {
      response = await fetch("https://fraudbd.com/api/check-courier-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": apiKey.trim()
        },
        body: JSON.stringify({ phone_number: phone }),
        signal: AbortSignal.timeout(12000)
      });
      upstream = await response.json().catch(() => null);
    } catch (error) {
      console.warn("Courier-history provider request failed:", error instanceof Error ? error.name : "unknown");
      return reply({ success: false, error: "Courier-history provider could not be reached. Try again later." }, 502);
    }

    if (!response.ok || upstream?.status !== true) {
      const providerMessage = clean(upstream?.message, 280);
      const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
      return reply({
        success: false,
        error: providerMessage || ("Courier-history provider returned HTTP " + response.status + ".")
      }, status);
    }

    let result: ReturnType<typeof normalizeResult>;
    try { result = normalizeResult(upstream); }
    catch (error) {
      console.warn("Courier-history response could not be normalized.");
      return reply({ success: false, error: error instanceof Error ? error.message : "Unsupported courier-history response." }, 502);
    }

    const checkedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const cacheRecord = {
      phone_hash: phoneHash,
      result,
      checked_at: checkedAt,
      expires_at: expiresAt
    };
    const { error: saveError } = await admin
      .from("courier_customer_history_cache")
      .upsert(cacheRecord, { onConflict: "phone_hash" });
    if (saveError) console.warn("Courier-history cache write failed:", String(saveError.code || "unknown"));

    return reply({
      success: true,
      source: "Fraud BD courier-history aggregator",
      cached: false,
      checkedAt,
      expiresAt,
      ...result
    });
  } catch (error) {
    console.error("courier-fraud-check unexpected error:", error instanceof Error ? error.name : "unknown");
    return reply({ success: false, error: "Courier history could not be checked. Please try again." }, 500);
  }
});
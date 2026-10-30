import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const SOURCE = "first_party_courier_apis_v1";
const CACHE_HOURS = 6;

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Content-Type": "application/json",
  "Vary": "Origin",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const clean = (value: unknown, max = 240) =>
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

function normalizeBangladeshPhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00880")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("880")) digits = "0" + digits.slice(3);
  if (!/^01[3-9]\d{8}$/.test(digits)) {
    throw new Error("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
  }
  return digits;
}

async function hmacPhone(secret: string, phone: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("courier-history-phone:" + phone),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: clean(text, 500) };
  }
  return { response, data };
}

function numberValue(value: unknown): number | null {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(rows: any[], keys: string[]): number | null {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of keys) {
      const value = numberValue(row[key]);
      if (value !== null && value >= 0) return value;
    }
  }
  return null;
}

function firstText(rows: any[], keys: string[]): string | null {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of keys) {
      const value = clean(row[key], 120);
      if (value) return value;
    }
  }
  return null;
}

function rateValue(rows: any[]): number | null {
  const raw = firstText(rows, ["success_rate", "successRate", "delivery_rate", "deliveryRate", "success_rate_percentage", "delivery_success_rate"]);
  if (raw === null) return null;
  const parsed = numberValue(raw);
  if (parsed === null || parsed < 0) return null;
  const normalized = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
  return normalized <= 100 ? Math.round(normalized * 100) / 100 : null;
}

function noHistorySignal(rows: any[]): string | null {
  const message = firstText(rows, ["message", "description", "detail", "status_message"]) || "";
  const rating = (firstText(rows, ["customer_rating", "customerRating", "rating", "customer_status"]) || "").toLowerCase();
  const haystack = (message + " " + rating).toLowerCase();
  if (
    /no (delivery|order|parcel|customer|history|record|data)|not found|new customer|no previous|no record|not available in (our|the) system/.test(haystack) ||
    ["new_customer", "new customer", "not_found", "no_history"].includes(rating)
  ) {
    return message || "এই ফোন নম্বরের জন্য এই কুরিয়ারে আগের ডেলিভারি তথ্য পাওয়া যায়নি।";
  }
  for (const row of rows) {
    if (row && typeof row === "object" && (row.customer_found === false || row.has_history === false || row.found === false)) {
      return message || "এই ফোন নম্বরের জন্য আগের ডেলিভারি তথ্য পাওয়া যায়নি।";
    }
  }
  return null;
}

function normalizeProvider(provider: string, payload: any) {
  const rows = [
    payload?.data?.data,
    payload?.data,
    payload?.result,
    payload?.customer,
    payload,
  ].filter((value) => value && typeof value === "object" && !Array.isArray(value));

  const noHistory = noHistorySignal(rows);
  if (noHistory) {
    return {
      courierName: provider,
      status: "no_history",
      dataType: "none",
      message: noHistory,
      total: null,
      success: null,
      cancel: null,
      successRate: null,
      customerRating: firstText(rows, ["customer_rating", "customerRating", "rating", "customer_status"]),
      riskLevel: firstText(rows, ["risk_level", "riskLevel"]),
    };
  }

  const total = firstNumber(rows, ["total", "total_orders", "total_parcels", "total_count", "orders", "parcels"]);
  const success = firstNumber(rows, ["success", "successful", "delivered", "delivered_count", "success_count", "success_parcels", "delivered_parcels", "successful_deliveries", "total_delivered"]);
  const cancel = firstNumber(rows, ["cancel", "cancelled", "canceled", "returned", "returned_count", "cancelled_count", "canceled_count", "cancel_count", "cancelled_parcels", "returned_parcels", "total_returned"]);
  let successRate = rateValue(rows);
  if (successRate === null && total !== null && total > 0 && success !== null) {
    successRate = Math.round((success / total) * 10000) / 100;
  }
  const customerRating = firstText(rows, ["customer_rating", "customerRating", "rating", "customer_status"]);
  const riskLevel = firstText(rows, ["risk_level", "riskLevel", "risk", "fraud_level"]);
  const hasCounts = total !== null || success !== null || cancel !== null;
  const hasRating = !!customerRating || !!riskLevel;
  const hasRate = successRate !== null;
  const explicitlyEmpty = total === 0 &&
    (success === null || success === 0) &&
    (cancel === null || cancel === 0) &&
    !hasRating;
  if (explicitlyEmpty) {
    return {
      courierName: provider,
      status: "no_history",
      dataType: "none",
      message: "এই ফোন নম্বরের জন্য এই কুরিয়ারে আগের ডেলিভারি তথ্য পাওয়া যায়নি।",
      total: null,
      success: null,
      cancel: null,
      successRate: null,
      customerRating,
      riskLevel: riskLevel ? riskLevel.toLowerCase() : null,
    };
  }

  if (!hasCounts && !hasRating && !hasRate) {
    throw new Error(provider + " returned an unrecognized customer-history response.");
  }

  return {
    courierName: provider,
    status: "available",
    dataType: hasCounts ? "delivery" : "rating",
    message: firstText(rows, ["message", "description", "detail"]) || "কুরিয়ারের নিজস্ব API থেকে গ্রাহকের তথ্য পাওয়া গেছে।",
    total,
    success,
    cancel,
    successRate,
    customerRating,
    riskLevel: riskLevel ? riskLevel.toLowerCase() : null,
  };
}

function resultMessage(provider: string, status: number, data: any): string {
  const message = clean(data?.message || data?.error || data?.detail, 220);
  if (status === 401 || status === 403) {
    return message || provider + " API access এই merchant account-এর জন্য অনুমোদিত নয়।";
  }
  if (status === 404) return provider + " customer-history endpoint পাওয়া যায়নি বা চালু নেই।";
  if (status === 429) return provider + " API request limit reached হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।";
  if (status >= 500) return provider + " সার্ভার সাময়িকভাবে সাড়া দিচ্ছে না।";
  return message || provider + " থেকে যাচাইকৃত customer-history তথ্য পাওয়া যায়নি।";
}

async function pathaoHistory(phone: string) {
  const required = ["PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD"];
  const missing = required.filter((key) => !Deno.env.get(key)?.trim());
  if (missing.length) {
    return {
      courierName: "Pathao",
      status: "not_connected",
      dataType: "none",
      message: "Pathao Merchant API-এর প্রয়োজনীয় credentials Supabase-এ সম্পূর্ণ সেট করা নেই।",
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }

  try {
    const tokenResult = await fetchJson("https://api-hermes.pathao.com/aladdin/api/v1/issue-token", {
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
    const token = tokenResult.data?.access_token ?? tokenResult.data?.data?.access_token;
    if (!tokenResult.response.ok || !token) {
      return {
        courierName: "Pathao",
        status: "error",
        dataType: "none",
        message: "Pathao Merchant API authentication ব্যর্থ হয়েছে। credentials ও API activation যাচাই করো।",
        total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
      };
    }

    const headers = {
      "Authorization": "Bearer " + String(token),
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
    let result = await fetchJson("https://api-hermes.pathao.com/aladdin/api/v1/user/success-rate", {
      method: "POST",
      headers,
      body: JSON.stringify({ phone }),
    });

    // Older Pathao Merchant API integrations expose the same user-success lookup
    // on merchant.pathao.com. Only try this compatibility route when the primary
    // route is absent; never retry on authorization or account errors.
    if (result.response.status === 404 || result.response.status === 405) {
      result = await fetchJson("https://merchant.pathao.com/api/v1/user/success", {
        method: "POST",
        headers,
        body: JSON.stringify({ phone }),
      });
    }

    if (!result.response.ok) {
      return {
        courierName: "Pathao",
        status: "error",
        dataType: "none",
        message: resultMessage("Pathao", result.response.status, result.data),
        total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
      };
    }
    return normalizeProvider("Pathao", result.data);
  } catch (error) {
    return {
      courierName: "Pathao",
      status: "error",
      dataType: "none",
      message: error instanceof Error && error.name === "TimeoutError"
        ? "Pathao API response timeout হয়েছে। পরে আবার চেষ্টা করো।"
        : "Pathao customer-history API-তে সংযোগ করা যায়নি।",
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }
}

async function steadfastHistory(phone: string) {
  const apiKey = Deno.env.get("STEADFAST_API_KEY")?.trim();
  const secretKey = Deno.env.get("STEADFAST_SECRET_KEY")?.trim();
  if (!apiKey || !secretKey) {
    return {
      courierName: "Steadfast",
      status: "not_connected",
      dataType: "none",
      message: "Steadfast Merchant API credentials Supabase-এ পাওয়া যায়নি।",
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }

  const headers = {
    "Api-Key": apiKey,
    "Secret-Key": secretKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  const base = "https://portal.packzy.com/api/v1";
  try {
    let result = await fetchJson(base + "/fraud_check/score/" + encodeURIComponent(phone), {
      method: "GET",
      headers,
    });
    if (result.response.status === 404 || result.response.status === 405) {
      result = await fetchJson(base + "/fraud_check/" + encodeURIComponent(phone), {
        method: "GET",
        headers,
      });
    }
    if (!result.response.ok) {
      return {
        courierName: "Steadfast",
        status: result.response.status === 404 ? "not_supported" : "error",
        dataType: "none",
        message: resultMessage("Steadfast", result.response.status, result.data),
        total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
      };
    }
    return normalizeProvider("Steadfast", result.data);
  } catch (error) {
    return {
      courierName: "Steadfast",
      status: "error",
      dataType: "none",
      message: error instanceof Error && error.name === "TimeoutError"
        ? "Steadfast API response timeout হয়েছে। পরে আবার চেষ্টা করো।"
        : "Steadfast customer-history API-তে সংযোগ করা যায়নি।",
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }
}

function unsupportedRedx() {
  return {
    courierName: "REDX",
    status: "not_supported",
    dataType: "none",
    message: "REDX-এর প্রকাশ্য Merchant OpenAPI-তে অন্য merchant-এর customer delivery-history lookup route পাওয়া যায়নি। তাই কোনো private dashboard endpoint বা scraping ব্যবহার করা হয়নি।",
    total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
  };
}

function buildSummary(summaries: any[]) {
  const available = summaries.filter((item) => item.status === "available");
  const rates = available
    .map((item) => numberValue(item.successRate))
    .filter((value): value is number => value !== null && value >= 0 && value <= 100);
  const counted = available.filter((item) => item.total !== null);
  const total = counted.length ? counted.reduce((sum, item) => sum + Number(item.total || 0), 0) : null;
  const successCounted = counted.filter((item) => item.success !== null);
  const success = successCounted.length ? successCounted.reduce((sum, item) => sum + Number(item.success || 0), 0) : null;
  const cancelCounted = counted.filter((item) => item.cancel !== null);
  const cancel = cancelCounted.length ? cancelCounted.reduce((sum, item) => sum + Number(item.cancel || 0), 0) : null;
  const averageSuccessRate = rates.length
    ? Math.round((rates.reduce((sum, value) => sum + value, 0) / rates.length) * 100) / 100
    : null;
  const pooledSuccessRate = total && success !== null
    ? Math.round((success / total) * 10000) / 100
    : null;

  return {
    total,
    success,
    cancel,
    successRate: averageSuccessRate,
    averageSuccessRate,
    pooledSuccessRate,
    availableCouriers: available.length,
    rateSources: rates.length,
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
    const fingerprintSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!url || !serviceKey || !publicKey || !fingerprintSecret) {
      console.error("Direct courier-history function is missing required server configuration.");
      return reply({ success: false, error: "Courier-history service is temporarily unavailable." }, 503);
    }

    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return reply({ success: false, error: "Session is not valid." }, 401);
    if (String(userData.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      return reply({ success: false, error: "Admin access only." }, 403);
    }
    const claims = decodeJwtClaims(token);
    if (claims?.aal !== "aal2") {
      return reply({ success: false, error: "Admin MFA verification is required." }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return reply({ success: false, error: "Invalid request body." }, 400);
    }

    let phone: string;
    try {
      phone = normalizeBangladeshPhone(body.phone);
    } catch (error) {
      return reply({ success: false, error: error instanceof Error ? error.message : "Invalid phone number." }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const phoneHash = await hmacPhone(fingerprintSecret, phone);
    const now = new Date();
    const { data: cached, error: cacheError } = await admin
      .from("courier_customer_history_cache")
      .select("result,checked_at,expires_at")
      .eq("phone_hash", phoneHash)
      .gt("expires_at", now.toISOString())
      .maybeSingle();

    // Ignore legacy cache rows from the retired FraudBD integration.
    if (!cacheError && cached?.result?.source === SOURCE) {
      return reply({
        success: true,
        source: SOURCE,
        cached: true,
        checkedAt: cached.checked_at,
        expiresAt: cached.expires_at,
        ...cached.result,
      });
    }
    if (cacheError) console.warn("Direct courier-history cache lookup failed:", String(cacheError.code || "unknown"));

    const settled = await Promise.allSettled([
      pathaoHistory(phone),
      steadfastHistory(phone),
      Promise.resolve(unsupportedRedx()),
    ]);
    const summaries = settled.map((entry, index) => {
      if (entry.status === "fulfilled") return entry.value;
      const provider = ["Pathao", "Steadfast", "REDX"][index];
      return {
        courierName: provider,
        status: "error",
        dataType: "none",
        message: provider + " lookup failed unexpectedly.",
        total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
      };
    });
    const checkedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString();
    const result = {
      source: SOURCE,
      summaries,
      totalSummary: buildSummary(summaries),
    };

    const cacheable = summaries.some((item) => ["available", "no_history"].includes(item.status)) &&
      summaries.every((item) => !["error", "not_connected"].includes(item.status));
    if (cacheable) {
      const { error: saveError } = await admin
        .from("courier_customer_history_cache")
        .upsert({
          phone_hash: phoneHash,
          result,
          checked_at: checkedAt,
          expires_at: expiresAt,
        }, { onConflict: "phone_hash" });
      if (saveError) console.warn("Direct courier-history cache write failed:", String(saveError.code || "unknown"));
    }

    return reply({
      success: true,
      source: SOURCE,
      cached: false,
      cacheStored: cacheable,
      checkedAt,
      expiresAt: cacheable ? expiresAt : null,
      ...result,
    });
  } catch (error) {
    console.error("Direct courier-history lookup failed:", error instanceof Error ? error.name : "unknown");
    return reply({ success: false, error: "Courier history could not be checked. Please try again." }, 500);
  }
});
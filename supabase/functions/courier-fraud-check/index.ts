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
  const declaredDataType = (firstText(rows, ["data_type", "dataType"]) || "").toLowerCase();
  const showCountValue = rows.find((row) => typeof row?.show_count === "boolean")?.show_count;
  const hasRating = !!customerRating || !!riskLevel;
  const hasRate = successRate !== null;

  // Pathao's newer response is rating-only and may include total/success/cancel=0
  // with show_count=false. Those are placeholders, not actual parcel counts.
  const ratingOnly = declaredDataType === "rating" ||
    (showCountValue === false && (hasRating || hasRate));
  if (ratingOnly) {
    return {
      courierName: provider,
      status: "available",
      dataType: "rating",
      message: firstText(rows, ["message", "description", "detail"]) ||
        "কুরিয়ারের API থেকে customer rating পাওয়া গেছে; parcel count এই response-এ প্রকাশ করা হয়নি।",
      total: null,
      success: null,
      cancel: null,
      successRate,
      customerRating,
      riskLevel: riskLevel ? riskLevel.toLowerCase() : null,
    };
  }

  const hasCounts = total !== null || success !== null || cancel !== null;
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

  // Match the exact host used by courier-integration for booking and tracking.
  const base = (Deno.env.get("PATHAO_BASE_URL") || "https://api-hermes.pathao.com").trim().replace(/\/+$/, "");
  let token: string;
  let tokenResult: { response: Response; data: any };

  try {
    tokenResult = await fetchJson(base + "/aladdin/api/v1/issue-token", {
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
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = clean(error instanceof Error ? error.message : error, 180);
    console.error("Pathao customer-history token request failed:", JSON.stringify({
      stage: "token_request",
      host: new URL(base).host,
      error_name: errorName,
      error_message: errorMessage,
    }));
    return {
      courierName: "Pathao",
      status: "error",
      dataType: "none",
      message: "Pathao token endpoint-এ server থেকে সংযোগ করা যায়নি (" + errorName + ")।",
      diagnostic: { stage: "token_request", errorName },
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }

  const rawToken = tokenResult.data?.access_token ?? tokenResult.data?.data?.access_token;
  if (!tokenResult.response.ok || !rawToken) {
    const status = tokenResult.response.status;
    const providerMessage = clean(tokenResult.data?.message || tokenResult.data?.error || tokenResult.data?.detail, 180);
    console.warn("Pathao customer-history token rejected:", JSON.stringify({
      stage: "token_request",
      host: new URL(base).host,
      http_status: status,
      provider_message: providerMessage,
    }));
    return {
      courierName: "Pathao",
      status: "error",
      dataType: "none",
      message: "Pathao Merchant API token request প্রত্যাখ্যান করেছে (HTTP " + status + "). " +
        (providerMessage || "Existing booking credentials ও configured API host যাচাই প্রয়োজন।"),
      diagnostic: { stage: "token_request", httpStatus: status },
      total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
    };
  }
  token = String(rawToken);

  const headers = {
    "Authorization": "Bearer " + token,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  // Pathao integrations in the field use both the newer Aladdin route and
  // the compatibility Merchant route. Try the second route after transport,
  // endpoint, authorization, or response-shape failures; never expose secrets.
  const endpoints = [
    {
      variant: "aladdin_user_success_rate",
      url: base + "/aladdin/api/v1/user/success-rate",
    },
    {
      variant: "merchant_user_success",
      url: base.toLowerCase().includes("courier-api-sandbox.pathao.com")
        ? base + "/api/v1/user/success"
        : "https://merchant.pathao.com/api/v1/user/success",
    },
  ];

  const failures: Array<Record<string, unknown>> = [];
  for (const endpoint of endpoints) {
    let result: { response: Response; data: any };
    try {
      result = await fetchJson(endpoint.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone }),
      });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const errorMessage = clean(error instanceof Error ? error.message : error, 180);
      failures.push({ variant: endpoint.variant, kind: "network", errorName });
      console.error("Pathao customer-history endpoint transport failed:", JSON.stringify({
        stage: "history_lookup",
        variant: endpoint.variant,
        host: new URL(endpoint.url).host,
        error_name: errorName,
        error_message: errorMessage,
      }));
      continue;
    }

    if (!result.response.ok) {
      const status = result.response.status;
      const providerMessage = clean(result.data?.message || result.data?.error || result.data?.detail, 180);
      failures.push({ variant: endpoint.variant, kind: "http", httpStatus: status });
      console.warn("Pathao customer-history endpoint returned HTTP error:", JSON.stringify({
        stage: "history_lookup",
        variant: endpoint.variant,
        host: new URL(endpoint.url).host,
        http_status: status,
        provider_message: providerMessage,
      }));
      // Do not turn a rate-limit response into extra requests.
      if (status === 429) break;
      continue;
    }

    try {
      const normalized = normalizeProvider("Pathao", result.data);
      if (normalized.status === "available" || normalized.status === "no_history") {
        return {
          ...normalized,
          diagnostic: {
            stage: "completed",
            endpointVariant: endpoint.variant,
            httpStatus: result.response.status,
          },
        };
      }
      failures.push({
        variant: endpoint.variant,
        kind: "unexpected_status",
        httpStatus: result.response.status,
      });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const responseKeys = result.data && typeof result.data === "object" && !Array.isArray(result.data)
        ? Object.keys(result.data).slice(0, 20)
        : [];
      failures.push({
        variant: endpoint.variant,
        kind: "response_shape",
        httpStatus: result.response.status,
        errorName,
      });
      console.warn("Pathao customer-history response could not be normalized:", JSON.stringify({
        stage: "response_normalization",
        variant: endpoint.variant,
        http_status: result.response.status,
        response_keys: responseKeys,
        error_name: errorName,
      }));
    }
  }

  const httpFailures = failures.filter((item) => item.kind === "http");
  const responseFailures = failures.filter((item) => item.kind === "response_shape");
  const networkFailures = failures.filter((item) => item.kind === "network");
  let message = "Pathao customer-history lookup সম্পন্ন হয়নি।";
  let diagnostic: Record<string, unknown> = { stage: "history_lookup", failures };

  if (httpFailures.length) {
    const last = httpFailures[httpFailures.length - 1];
    const status = Number(last.httpStatus);
    message = status === 401 || status === 403
      ? "Pathao customer-history endpoint access প্রত্যাখ্যান করেছে (HTTP " + status + ")। Booking API কাজ করলেও এই lookup route-এর permission আলাদা হতে পারে।"
      : status === 404 || status === 405
        ? "Pathao customer-history endpoint এই host-এ পাওয়া যায়নি বা চালু নেই (HTTP " + status + ")।"
        : status === 429
          ? "Pathao customer-history API request limit (HTTP 429) জানিয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।"
          : "Pathao customer-history endpoint HTTP " + status + " error দিয়েছে।";
    diagnostic = { stage: "history_lookup", httpFailures };
  } else if (responseFailures.length) {
    message = "Pathao API HTTP response দিয়েছে, কিন্তু response format আমাদের customer-history parser বুঝতে পারেনি।";
    diagnostic = { stage: "response_normalization", responseFailures };
  } else if (networkFailures.length) {
    message = "Pathao booking token পাওয়া গেছে, কিন্তু customer-history endpoint-এ server থেকে network connection সম্পন্ন হয়নি।";
    diagnostic = { stage: "history_lookup", networkFailures };
  }

  console.error("Pathao customer-history lookup exhausted all compatible endpoints:", JSON.stringify(diagnostic));
  return {
    courierName: "Pathao",
    status: "error",
    dataType: "none",
    message,
    diagnostic,
    total: null, success: null, cancel: null, successRate: null, customerRating: null, riskLevel: null,
  };
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
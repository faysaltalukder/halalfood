import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, error: "Use the unsubscribe link to submit a POST request." }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return json({ success: false, error: "Origin not allowed." }, 403);
  const contentType = req.headers.get("content-type") || "";
  let token = "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const url = new URL(req.url);
      const body = new URLSearchParams(await req.text());
      const oneClick = body.get("List-Unsubscribe");
      if (oneClick && oneClick !== "One-Click") return json({ success: false, error: "Invalid unsubscribe request." }, 400);
      token = clean(url.searchParams.get("t"), 180);
    } else {
      const body = await req.json();
      token = clean(body?.token, 180);
    }
  } catch {
    return json({ success: false, error: "Invalid unsubscribe request." }, 400);
  }
  if (token.length < 80 || token.length > 160) return json({ success: false, error: "This unsubscribe link is invalid or incomplete." }, 400);
  const tokenHash = await sha256(token);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json({ success: false, error: "Unsubscribe service is temporarily unavailable. Please contact Halal Food support." }, 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: recipient, error: recipientError } = await db.from("marketing_campaign_recipients")
      .select("id,campaign_id,customer_id").eq("unsubscribe_token_hash", tokenHash).maybeSingle();
    if (recipientError || !recipient) return json({ success: false, error: "This unsubscribe link is invalid or has expired." }, 404);
    const { data: campaign, error: campaignError } = await db.from("marketing_campaigns")
      .select("channel").eq("id", recipient.campaign_id).maybeSingle();
    if (campaignError || !campaign || campaign.channel !== "email") return json({ success: false, error: "This unsubscribe link is not valid for an email campaign." }, 404);
    const { data: preference, error: preferenceError } = await db.from("customer_marketing_preferences")
      .select("customer_id,email_opt_in").eq("customer_id", recipient.customer_id).maybeSingle();
    if (preferenceError) return json({ success: false, error: "Could not read your email preference. Please try again." }, 503);
    if (!preference || preference.email_opt_in !== true) {
      return json({ success: true, already_unsubscribed: true, message: "This email address is already unsubscribed from promotional emails." });
    }
    const now = new Date().toISOString();
    const { error: updateError } = await db.from("customer_marketing_preferences")
      .update({ email_opt_in: false, email_opt_out_at: now, updated_at: now, updated_by: "customer:self-service" })
      .eq("customer_id", recipient.customer_id);
    if (updateError) return json({ success: false, error: "Your preference could not be updated. Please try again." }, 503);
    const { error: eventError } = await db.from("customer_marketing_consent_events").insert({
      customer_id: recipient.customer_id, channel: "email", decision: "opt_out",
      source: "Email one-click unsubscribe", evidence_note: "Customer used a signed one-click unsubscribe link.",
      recorded_by: "customer:self-service",
    });
    if (eventError) {
      console.error("Email opt-out was saved but consent history could not be written.");
      return json({ success: true, warning: "Your email preference was updated. The audit record is being reconciled." });
    }
    return json({ success: true, already_unsubscribed: false, message: "You have been unsubscribed from Halal Food promotional emails." });
  } catch (error) {
    console.error("Marketing unsubscribe failed:", error instanceof Error ? error.name : "unknown");
    return json({ success: false, error: "Unsubscribe service is temporarily unavailable. Please try again." }, 500);
  }
});

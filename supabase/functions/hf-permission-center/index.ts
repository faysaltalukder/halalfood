import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-hf-bridge-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const catalog = new Set([
  "supabase.project.read", "supabase.database.read", "supabase.database.write",
  "supabase.storage.read", "supabase.storage.upload", "supabase.storage.delete",
  "filebase.storage.read", "filebase.storage.upload", "filebase.storage.delete",
  "github.repo.read", "github.repo.write", "github.workflow.read", "github.workflow.run",
  "website.deploy", "website.publish"
]);

function jwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), c => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}
function canonical(value: unknown, depth = 0): string {
  if (depth > 8) throw new Error("Resource scope is too deeply nested.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid numeric resource scope.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(item => canonical(item, depth + 1)).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length > 40) throw new Error("Resource scope contains too many fields.");
    return "{" + keys.map(key => JSON.stringify(key) + ":" + canonical(record[key], depth + 1)).join(",") + "}";
  }
  throw new Error("Unsupported value in resource scope.");
}
function resourceMatches(granted: Record<string, unknown>, requested: Record<string, unknown>) {
  if (!granted || !requested || !Object.keys(granted).length || !Object.keys(requested).length) return false;
  try { return canonical(granted) === canonical(requested); } catch { return false; }
}
function validPermissionKey(value: string) {
  return /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*){1,5}$/.test(value) && value.length <= 80;
}
function riskForPermission(permissionKey: string) {
  if (/delete|destroy|purge|drop|revoke|secret|credential/i.test(permissionKey)) return "critical";
  if (/write|upload|deploy|publish|run|update|create|modify/i.test(permissionKey)) return "high";
  return "medium";
}
const catalogItems = [
  ["github.repo.read","GitHub","Read approved repository files and metadata","Read"],
  ["github.repo.write","GitHub","Create or update approved repository files","Write"],
  ["github.workflow.read","GitHub","Read workflow runs and logs","Read"],
  ["github.workflow.run","GitHub","Run an approved workflow","High risk"],
  ["supabase.project.read","Supabase","Read project metadata","Read"],
  ["supabase.database.read","Supabase","Read explicitly scoped database records","Read"],
  ["supabase.database.write","Supabase","Write through approved server-side operations","High risk"],
  ["supabase.storage.read","Supabase Storage","List or read scoped objects","Read"],
  ["supabase.storage.upload","Supabase Storage","Upload to a scoped bucket and prefix","High risk"],
  ["filebase.storage.read","S3-compatible storage","Read scoped bucket objects","Read"],
  ["filebase.storage.upload","S3-compatible storage","Upload to a scoped bucket and prefix","High risk"],
  ["backblaze.storage.read","Backblaze B2","Read scoped bucket objects","Read"],
  ["backblaze.storage.upload","Backblaze B2","Upload to a scoped bucket and prefix","High risk"],
  ["backblaze.storage.delete","Backblaze B2","Delete an approved object only","Critical"],
  ["website.deploy","Website","Prepare a reviewed deployment","High risk"],
  ["website.publish","Website","Publish an approved website version","High risk"]
];
async function audit(admin: any, data: Record<string, unknown>) {
  const { error } = await admin.from("hf_permission_audit").insert(data);
  if (error) console.error("Permission audit write failed", error.code || "unknown");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "POST"].includes(req.method)) return reply({ success: false, error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ALLOWED_ORIGIN) return reply({ success: false, error: "Origin not allowed" }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !serviceKey || !publicKey) return reply({ success: false, error: "Permission backend server configuration is incomplete." }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, any> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid JSON request." }, 400); }
  } else {
    body.action = new URL(req.url).searchParams.get("action") || "status";
  }
  const action = clean(body.action, 40).toLowerCase();

  // Bridge-only operations use a dedicated server secret. It is never sent to the browser.
  const bridgeSecret = Deno.env.get("HF_PERMISSION_BRIDGE_SECRET") || "";
  const suppliedBridgeSecret = req.headers.get("x-hf-bridge-key") || "";
  const isBridge = Boolean(bridgeSecret && suppliedBridgeSecret && suppliedBridgeSecret.length === bridgeSecret.length &&
    (() => { let diff = 0; for (let i = 0; i < bridgeSecret.length; i++) diff |= bridgeSecret.charCodeAt(i) ^ suppliedBridgeSecret.charCodeAt(i); return diff === 0; })());

  const bridgeActions = new Set(["bridge_request", "authorize_action"]);
  let adminUser: any = null;
  if (bridgeActions.has(action)) {
    if (!bridgeSecret) return reply({ success: false, error: "Secure Bridge is not configured. Add HF_PERMISSION_BRIDGE_SECRET to Edge Function secrets." }, 503);
    if (!isBridge) return reply({ success: false, error: "Bridge authentication failed." }, 401);
  } else {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return reply({ success: false, error: "Admin sign-in required." }, 401);
    const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return reply({ success: false, error: "Admin session is invalid. Sign in again." }, 401);
    adminUser = data.user;
    if (String(adminUser.email || "").toLowerCase() !== ADMIN_EMAIL) return reply({ success: false, error: "Authorized admin account only." }, 403);
    if (jwtClaims(token)?.aal !== "aal2") return reply({ success: false, error: "MFA verification (AAL2) is required. Refresh your admin session after verification." }, 403);
  }

  try {
    if (action === "status") {
      return reply({
        success: true,
        backend: "connected",
        database: "ready",
        adminMfa: "verified",
        bridgeSecretConfigured: Boolean(bridgeSecret),
        githubOAuthConfigured: Boolean(Deno.env.get("HF_GITHUB_CLIENT_ID") && Deno.env.get("HF_GITHUB_CLIENT_SECRET")),
        githubTokenEncryptionConfigured: Boolean(Deno.env.get("HF_GITHUB_TOKEN_ENCRYPTION_KEY")),
        mcpTransport: "not_installed",
        catalog: catalogItems.map(([key, provider, description, risk]) => ({ key, provider, description, risk, builtIn: true })),
        dynamicRequests: true,
        note: "The approval database is active. The bridge can request additional namespaced permission keys; only installed connector handlers can execute approved work. ChatGPT MCP transport and provider authorization remain separate setup requirements."
      });
    }

    if (action === "list") {
      const [requests, grants, logs] = await Promise.all([
        admin.from("hf_permission_requests").select("*").order("created_at", { ascending: false }).limit(100),
        admin.from("hf_permission_grants").select("*").order("created_at", { ascending: false }).limit(100),
        admin.from("hf_permission_audit").select("*").order("created_at", { ascending: false }).limit(150)
      ]);
      const error = requests.error || grants.error || logs.error;
      if (error) return reply({ success: false, error: "Permission records could not be loaded.", code: error.code || "query_failed" }, 500);
      return reply({ success: true, requests: requests.data || [], grants: grants.data || [], audit: logs.data || [] });
    }

    if (action === "create_test_request") {
      const permissionKey = clean(body.permission_key, 80);
      if (!catalog.has(permissionKey)) return reply({ success: false, error: "Permission is not in the allow-list." }, 400);
      const reason = clean(body.reason, 700);
      if (reason.length < 12) return reply({ success: false, error: "Please provide a clear reason (at least 12 characters)." }, 400);
      const resource = body.resource && typeof body.resource === "object" && !Array.isArray(body.resource) ? body.resource : {};
      const duration = Math.max(60, Math.min(2592000, Number(body.duration_seconds) || 900));
      const requestKey = crypto.randomUUID();
      const { data, error } = await admin.from("hf_permission_requests").insert({
        request_key: requestKey, source: "dashboard", requester: "Admin permission test",
        permission_key: permissionKey, resource, reason, risk_level: permissionKey.includes("delete") || permissionKey.includes("write") ? "high" : "medium",
        requested_duration_seconds: duration, status: "pending"
      }).select("*").single();
      if (error) return reply({ success: false, error: "Could not create the approval request.", code: error.code || "insert_failed" }, 500);
      await audit(admin, { request_id: data.id, actor_type: "admin", actor_id: adminUser.id, event: "request_created", permission_key: permissionKey, resource, details: { source: "dashboard_test" } });
      return reply({ success: true, request: data });
    }

    if (action === "decide") {
      const requestId = clean(body.request_id, 50);
      const decision = clean(body.decision, 20);
      if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approve", "deny"].includes(decision)) return reply({ success: false, error: "A valid request and decision are required." }, 400);
      if (body.checkbox_confirmed !== true || body.final_confirm !== true) return reply({ success: false, error: "Both confirmation steps are required." }, 400);
      const { data: request, error: getError } = await admin.from("hf_permission_requests").select("*").eq("id", requestId).maybeSingle();
      if (getError || !request) return reply({ success: false, error: "Approval request was not found." }, 404);
      if (request.status !== "pending") return reply({ success: false, error: "This request has already been resolved." }, 409);
      if (new Date(request.expires_at).getTime() <= Date.now()) {
        await admin.from("hf_permission_requests").update({ status: "expired" }).eq("id", requestId).eq("status", "pending");
        return reply({ success: false, error: "This request has expired. Create a new request." }, 410);
      }
      let grant = null;
      if (decision === "approve") {
        const mode = body.grant_mode === "temporary" ? "temporary" : "once";
        const requestedDuration = Math.max(60, Math.min(2592000, Number(body.duration_seconds) || request.requested_duration_seconds || 900));
        const expiry = new Date(Date.now() + (mode === "once" ? Math.min(requestedDuration, 900) : requestedDuration) * 1000).toISOString();
        const { data: createdGrant, error: grantError } = await admin.from("hf_permission_grants").insert({
          request_id: requestId, permission_key: request.permission_key, resource: request.resource,
          grant_mode: mode, expires_at: expiry, max_uses: mode === "once" ? 1 : 100000
        }).select("*").single();
        if (grantError) return reply({ success: false, error: "Could not create the server permission grant.", code: grantError.code || "grant_failed" }, 500);
        grant = createdGrant;
      }
      const nextStatus = decision === "approve" ? "approved" : "denied";
      const { data: updated, error: updateError } = await admin.from("hf_permission_requests").update({
        status: nextStatus, decided_at: new Date().toISOString(), decided_by: adminUser.id,
        decision_notes: clean(body.notes, 500), grant_id: grant?.id || null
      }).eq("id", requestId).eq("status", "pending").select("id").maybeSingle();
      if (updateError || !updated) {
        if (grant?.id) await admin.from("hf_permission_grants").delete().eq("id", grant.id);
        return reply({ success: false, error: "The request changed while being approved. Refresh and try again." }, 409);
      }
      await audit(admin, { request_id: requestId, grant_id: grant?.id || null, actor_type: "admin", actor_id: adminUser.id, event: nextStatus, permission_key: request.permission_key, resource: request.resource, details: { grant_mode: grant?.grant_mode || null, expires_at: grant?.expires_at || null } });
      return reply({ success: true, status: nextStatus, grant: grant ? { id: grant.id, permission_key: grant.permission_key, resource: grant.resource, grant_mode: grant.grant_mode, expires_at: grant.expires_at, max_uses: grant.max_uses } : null });
    }

    if (action === "revoke") {
      const grantId = clean(body.grant_id, 50);
      if (!/^[0-9a-f-]{36}$/i.test(grantId) || body.final_confirm !== true) return reply({ success: false, error: "Grant ID and explicit confirmation are required." }, 400);
      const { data: grant, error } = await admin.from("hf_permission_grants").update({ revoked_at: new Date().toISOString(), revoked_by: adminUser.id }).eq("id", grantId).is("revoked_at", null).select("*").maybeSingle();
      if (error || !grant) return reply({ success: false, error: "Active grant not found or already revoked." }, 404);
      await admin.from("hf_permission_requests").update({ status: "revoked" }).eq("id", grant.request_id).eq("status", "approved");
      await audit(admin, { request_id: grant.request_id, grant_id: grant.id, actor_type: "admin", actor_id: adminUser.id, event: "revoked", permission_key: grant.permission_key, resource: grant.resource, details: {} });
      return reply({ success: true, revoked: true });
    }

    if (action === "bridge_request") {
      if (!isBridge) return reply({ success: false, error: "Bridge authentication failed." }, 401);
      const permissionKey = clean(body.permission_key, 80).toLowerCase();
      if (!validPermissionKey(permissionKey)) return reply({ success: false, error: "Permission key must use a namespaced format such as provider.resource.action." }, 400);
      const reason = clean(body.reason, 700);
      if (reason.length < 12) return reply({ success: false, error: "A meaningful reason is required." }, 400);
      const resource = body.resource && typeof body.resource === "object" && !Array.isArray(body.resource) ? body.resource : {};
      if (!Object.keys(resource).length || Object.keys(resource).length > 40 || new TextEncoder().encode(JSON.stringify(resource)).length > 4096) {
        return reply({ success: false, error: "A non-empty, bounded resource scope is required." }, 400);
      }
      try { canonical(resource); } catch { return reply({ success: false, error: "Resource scope is invalid or too complex." }, 400); }
      const { data, error } = await admin.from("hf_permission_requests").insert({
        request_key: crypto.randomUUID(), source: "bridge", requester: clean(body.requester || "ChatGPT Bridge", 100),
        permission_key: permissionKey, resource, reason, risk_level: riskForPermission(permissionKey),
        requested_duration_seconds: Math.max(60, Math.min(2592000, Number(body.duration_seconds) || 900)), status: "pending"
      }).select("*").single();
      if (error) return reply({ success: false, error: "Bridge request could not be queued." }, 500);
      await audit(admin, { request_id: data.id, actor_type: "bridge", event: "request_created", permission_key: permissionKey, resource, details: { requester: data.requester } });
      return reply({ success: true, request_id: data.id, status: "pending" }, 201);
    }

    if (action === "authorize_action") {
      if (!isBridge) return reply({ success: false, error: "Bridge authentication failed." }, 401);
      const grantId = clean(body.grant_id, 50);
      const permissionKey = clean(body.permission_key, 80);
      const resource = body.resource && typeof body.resource === "object" && !Array.isArray(body.resource) ? body.resource : {};
      if (!validPermissionKey(permissionKey) || !Object.keys(resource).length) return reply({ success: false, authorized: false, error: "A valid permission key and exact resource scope are required." }, 400);
      const { data: grant, error } = await admin.from("hf_permission_grants").select("*").eq("id", grantId).maybeSingle();
      const { data: parentRequest } = grant?.request_id
        ? await admin.from("hf_permission_requests").select("status").eq("id", grant.request_id).maybeSingle()
        : { data: null };
      const allowed = !error && grant && parentRequest?.status === "approved" && grant.permission_key === permissionKey && !grant.revoked_at &&
        grant.expires_at && new Date(grant.expires_at).getTime() > Date.now() &&
        Number(grant.uses_count) < Number(grant.max_uses) &&
        resourceMatches(grant.resource || {}, resource);
      if (!allowed) {
        await audit(admin, { grant_id: grant?.id || null, actor_type: "bridge", event: "authorization_denied", permission_key: permissionKey, resource, details: { reason: "grant_missing_expired_revoked_or_scope_mismatch" } });
        return reply({ success: false, authorized: false, error: "No active grant matches this exact action and resource." }, 403);
      }
      const { data: used, error: useError } = await admin.from("hf_permission_grants").update({ uses_count: Number(grant.uses_count) + 1, last_used_at: new Date().toISOString() }).eq("id", grant.id).eq("uses_count", grant.uses_count).is("revoked_at", null).select("id").maybeSingle();
      if (useError || !used) return reply({ success: false, authorized: false, error: "Grant use could not be claimed safely. Retry after checking status." }, 409);
      await audit(admin, { request_id: grant.request_id, grant_id: grant.id, actor_type: "bridge", event: "authorization_allowed", permission_key: permissionKey, resource, details: { use_number: Number(grant.uses_count) + 1 } });
      return reply({ success: true, authorized: true, grant_id: grant.id });
    }

    return reply({ success: false, error: "Unknown permission action." }, 400);
  } catch (error) {
    console.error("hf-permission-center failed", error instanceof Error ? error.name : "unknown");
    return reply({ success: false, error: "Permission service encountered an unexpected error." }, 500);
  }
});
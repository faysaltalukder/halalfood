import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { pipeline } from "npm:@supabase/middleware@1";
import { withOAuthProtectedResource, withSupabase } from "npm:@supabase/server@1";
import { z } from "npm:zod@^4.3.6";

const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function risk(key: string) {
  if (/delete|destroy|purge|drop|revoke|secret|credential/i.test(key)) return "critical";
  if (/write|upload|deploy|publish|run|update|create|modify/i.test(key)) return "high";
  return "medium";
}

Deno.serve(pipeline(
  [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
  async (req, ctx) => {
    const claims = (ctx as any).userClaims || {};
    if (String(claims.email || "").toLowerCase() !== ADMIN_EMAIL || claims.aal !== "aal2") {
      return Response.json({ error: "Verified Halal Food admin with MFA AAL2 required." }, { status: 403 });
    }
    if (!url || !serviceKey) return Response.json({ error: "Permission Bridge backend is not configured." }, { status: 503 });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: "halal-food-permission-center", version: "1.0.0" });
      server.registerTool("request_permission", {
        title: "Request a Halal Food permission",
        description: "Submit a new scoped permission request for owner approval. This only queues a request; it does not execute the requested platform action.",
        inputSchema: z.object({
          permission_key: z.string().min(3).max(80).regex(/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*){1,5}$/),
          reason: z.string().min(12).max(700),
          resource: z.record(z.string(), z.unknown()),
          duration_seconds: z.number().int().min(60).max(2592000).default(900)
        }),
        securitySchemes: [{ type: "oauth2", scopes: ["openid", "email"] }]
      }, async ({ permission_key, reason, resource, duration_seconds }) => {
        if (!resource || !Object.keys(resource).length || Array.isArray(resource)) throw new Error("A non-empty exact resource scope is required.");
        if (new TextEncoder().encode(JSON.stringify(resource)).length > 4096) throw new Error("Resource scope is too large.");
        const key = permission_key.toLowerCase();
        const { data, error } = await admin.from("hf_permission_requests").insert({
          request_key: crypto.randomUUID(), source: "bridge", requester: "ChatGPT · Halal Food MCP",
          permission_key: key, resource, reason, risk_level: risk(key),
          requested_duration_seconds: duration_seconds, status: "pending"
        }).select("id,permission_key,resource,reason,risk_level,requested_duration_seconds,created_at,expires_at").single();
        if (error || !data) throw new Error("Permission request could not be saved.");
        const { error: auditError } = await admin.from("hf_permission_audit").insert({
          request_id: data.id, actor_type: "bridge", event: "request_created",
          permission_key: key, resource, details: { requester: "ChatGPT · Halal Food MCP" }
        });
        if (auditError) {
          await admin.from("hf_permission_requests").update({ status: "cancelled" }).eq("id", data.id).eq("status", "pending");
          throw new Error("Request cancelled because its audit record could not be saved.");
        }
        return { content: [{ type: "text", text: JSON.stringify({ submitted: true, executed: false, request: data }, null, 2) }] };
      });
      server.registerTool("list_permission_requests", {
        title: "List permission requests",
        description: "Show recent permission requests and their approval status. This tool cannot approve or revoke.",
        inputSchema: { limit: z.number().int().min(1).max(50).default(20) }
      }, async ({ limit }) => {
        const { data, error } = await admin.from("hf_permission_requests")
          .select("id,permission_key,resource,reason,risk_level,status,created_at,expires_at,decided_at")
          .order("created_at", { ascending: false }).limit(limit);
        if (error) throw new Error("Permission request history could not be loaded.");
        return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
      });
      return server;
    });
    return handler.fetch(req);
  }
));

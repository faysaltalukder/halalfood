// Shared, database-backed edge rate limiter. Client identifiers are HMACed before storage.
export function trustedClientIp(req: Request): string | null {
  const candidates = [req.headers.get("cf-connecting-ip"), req.headers.get("x-real-ip")];
  for (const raw of candidates) {
    const value = String(raw || "").trim();
    if (!value || value.length > 64) continue;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-f:]{2,45}$/i.test(value)) return value;
  }
  return null;
}

async function hmacKey(scope: string, key: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
  if (!secret) throw new Error("EDGE_RATE_LIMIT_SECRET_MISSING");
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(scope + ":" + key));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function reserveEdgeRateLimit(
  admin: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  scope: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const keyHash = await hmacKey(scope, key);
  const { data, error } = await admin.rpc("consume_edge_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== "boolean") throw new Error("EDGE_RATE_LIMIT_UNAVAILABLE");
  return data;
}

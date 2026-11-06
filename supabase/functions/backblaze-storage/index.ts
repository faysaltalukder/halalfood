import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { S3Client, PutObjectCommand, HeadBucketCommand } from "npm:@aws-sdk/client-s3@3.850.0";

const ORIGIN = "https://faysaltalukder.github.io";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const REPO = Deno.env.get("GITHUB_REPO") || "faysaltalukder/halalfood";
const BRANCH = Deno.env.get("GITHUB_BRANCH") || "main";
const PUBLISH_ROOT = "sites/halalfood/releases/";
const MAX_FILES = 1200;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const EXCLUDED = [
  "admin/", "supabase/", ".github/", ".git/", "docs/", "scripts/", "tests/",
  "test/", "node_modules/", "vendor/", "coverage/", ".vscode/", ".husky/",
  "playwright-report/", "test-results/", "storybook-static/"
];
const ALLOWED = new Set([
  ".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".webmanifest",
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".webm", ".mp3"
]);
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
});
function jwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normal = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, "=")));
  } catch { return null; }
}
function clean(value: unknown, max = 500): string {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}
async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, "0")).join("");
}
function allowedPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\\") ||
      path.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))) return false;
  const lower = path.toLowerCase();
  if (EXCLUDED.some((prefix) => lower.startsWith(prefix))) return false;
  if (/(^|\/)(?:\.env(?:\..*)?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|deno\.lock|.*secret.*|.*credential.*)$/i.test(path)) return false;
  if (lower.endsWith(".map") || lower.endsWith(".md") || lower.endsWith(".sql") || lower.endsWith(".ts") ||
      lower.endsWith(".yml") || lower.endsWith(".yaml") || lower.endsWith(".toml") || lower.endsWith(".sh")) return false;
  const dot = lower.lastIndexOf(".");
  return dot >= 0 && ALLOWED.has(lower.slice(dot));
}
function contentType(path: string): string {
  const ext = path.toLowerCase().slice(path.lastIndexOf("."));
  const map: Record<string, string> = {
    ".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",
    ".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8",".xml":"application/xml",
    ".webmanifest":"application/manifest+json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
    ".webp":"image/webp",".avif":"image/avif",".gif":"image/gif",".ico":"image/x-icon",
    ".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",".otf":"font/otf",
    ".mp4":"video/mp4",".webm":"video/webm",".mp3":"audio/mpeg"
  };
  return map[ext] || "application/octet-stream";
}
async function github(path: string, token: string): Promise<any> {
  const response = await fetch("https://api.github.com/repos/" + REPO + "/" + path, {
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Halal-Food-Backblaze-Publisher",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("GitHub source error (" + response.status + "): " + clean(data?.message, 180));
  return data;
}
async function currentHead(token: string): Promise<string> {
  const branch = BRANCH.split("/").map(encodeURIComponent).join("/");
  const data = await github("git/ref/heads/" + branch, token);
  const sha = clean(data?.object?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("Could not resolve the current source commit.");
  return sha;
}
async function runPublish(userId: string) {
  const keyId = Deno.env.get("BACKBLAZE_B2_KEY_ID") || "";
  const secret = Deno.env.get("BACKBLAZE_B2_APPLICATION_KEY") || "";
  const bucket = Deno.env.get("BACKBLAZE_B2_BUCKET") || "";
  const endpoint = Deno.env.get("BACKBLAZE_B2_S3_ENDPOINT") || "";
  const region = Deno.env.get("BACKBLAZE_B2_REGION") || "us-east-005";
  const githubToken = Deno.env.get("GITHUB_TOKEN") || "";
  const missing = [
    !keyId && "BACKBLAZE_B2_KEY_ID", !secret && "BACKBLAZE_B2_APPLICATION_KEY",
    !bucket && "BACKBLAZE_B2_BUCKET", !endpoint && "BACKBLAZE_B2_S3_ENDPOINT"
  ].filter(Boolean);
  if (missing.length) throw Object.assign(new Error("Backblaze configuration is incomplete: " + missing.join(", ")), { status: 503 });
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== "https:" || !endpointUrl.hostname.endsWith(".backblazeb2.com")) {
    throw Object.assign(new Error("The configured Backblaze S3 endpoint is not valid."), { status: 503 });
  }

  const headBefore = await currentHead(githubToken);
  const treeResult = await github("git/trees/" + headBefore + "?recursive=1", githubToken);
  if (treeResult?.truncated || !Array.isArray(treeResult?.tree)) {
    throw new Error("The GitHub source tree is truncated or unavailable. Nothing was published.");
  }
  const files = treeResult.tree.filter((item: any) =>
    item?.type === "blob" && allowedPath(String(item.path || "")) &&
    Number(item.size || 0) > 0 && Number(item.size || 0) <= MAX_FILE_BYTES
  ).map((item: any) => ({ path: String(item.path), size: Number(item.size || 0) }));
  if (!files.length) throw new Error("No eligible public website files were found in the source repository.");
  if (files.length > MAX_FILES) throw new Error("Publish stopped safely: eligible file count exceeds " + MAX_FILES + ".");
  const estimatedBytes = files.reduce((sum: number, file: any) => sum + file.size, 0);
  if (estimatedBytes > MAX_TOTAL_BYTES) throw new Error("Publish stopped safely: source files exceed the 500 MB release limit.");

  const s3 = new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId: keyId, secretAccessKey: secret } });
  const releasePrefix = PUBLISH_ROOT + headBefore + "/";
  const errors: string[] = [];
  const manifestFiles: Array<{ path: string; key: string; bytes: number; sha256: string }> = [];
  let uploadedBytes = 0;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    let cursor = 0;
    const workers = Array.from({ length: 4 }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= files.length) return;
        const file = files[index];
        try {
          const rawPath = file.path.split("/").map(encodeURIComponent).join("/");
          const response = await fetch("https://raw.githubusercontent.com/" + REPO + "/" + headBefore + "/" + rawPath, {
            cache: "no-store", headers: { "Accept": "application/octet-stream" }
          });
          if (!response.ok) throw new Error("Source download returned HTTP " + response.status);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.byteLength !== file.size) throw new Error("Downloaded file size differs from the Git tree.");
          if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("File exceeds the per-file limit.");
          const digest = await sha256(bytes);
          const key = releasePrefix + file.path;
          await s3.send(new PutObjectCommand({
            Bucket: bucket, Key: key, Body: bytes, ContentLength: bytes.byteLength,
            ContentType: contentType(file.path),
            CacheControl: "public, max-age=31536000, immutable",
            Metadata: { "source-commit": headBefore, "sha256": digest }
          }));
          manifestFiles.push({ path: file.path, key, bytes: bytes.byteLength, sha256: digest });
          uploadedBytes += bytes.byteLength;
        } catch (error) {
          errors.push(file.path + ": " + clean((error as any)?.message || "upload failed", 180));
        }
      }
    });
    await Promise.all(workers);
    if (errors.length) {
      throw Object.assign(new Error("Release upload incomplete: " + errors.length + " file(s) failed. The latest release pointer was not changed. " + errors.slice(0, 5).join(" | ")), { partial: true, uploadedFiles: manifestFiles.length, failedFiles: errors.length });
    }
    const headAfter = await currentHead(githubToken);
    if (headAfter !== headBefore) {
      throw Object.assign(new Error("The GitHub source changed during upload. The release was uploaded but not activated; click Publish again to publish the latest version."), { conflict: true, uploadedFiles: manifestFiles.length });
    }
    manifestFiles.sort((a, b) => a.path.localeCompare(b.path));
    const manifest = {
      provider: "Backblaze B2", site: "Halal Food", repository: REPO, branch: BRANCH,
      source_commit: headBefore, release_prefix: releasePrefix,
      file_count: manifestFiles.length, total_bytes: uploadedBytes,
      published_at: new Date().toISOString(), published_by: userId,
      files: manifestFiles
    };
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");
    const manifestKey = "sites/halalfood/latest.json";
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: manifestKey, Body: manifestBytes, ContentLength: manifestBytes.byteLength,
      ContentType: "application/json", CacheControl: "no-store",
      Metadata: { "source-commit": headBefore, "file-count": String(manifestFiles.length) }
    }));
    return {
      ok: true, status: "published", provider: "Backblaze B2", source_commit: headBefore,
      file_count: manifestFiles.length, total_bytes: uploadedBytes,
      release_prefix: releasePrefix, manifest_key: manifestKey,
      stale_objects_deleted: false
    };
  } finally {
    s3.destroy();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ORIGIN) return json({ ok: false, error: "origin_not_allowed" }, 403);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (!supabaseUrl || !serviceKey || !publicKey) return json({ ok: false, error: "supabase_auth_config_missing" }, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "admin_session_required" }, 401);
  const claim = jwtClaims(token);
  if (claim?.aal !== "aal2" || claim?.role !== "authenticated" || Number(claim?.exp || 0) <= Math.floor(Date.now() / 1000)) {
    return json({ ok: false, error: "admin_mfa_aal2_required" }, 403);
  }
  const authClient = createClient(supabaseUrl, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user || String(data.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return json({ ok: false, error: "authorized_admin_required" }, 403);
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  if (body.action !== "publish_site") return json({ ok: false, error: "unsupported_action" }, 400);
  try {
    return json(await runPublish(data.user.id));
  } catch (error) {
    const e = error as any;
    console.error("Backblaze site publish failed", { message: clean(e?.message, 700), partial: !!e?.partial, conflict: !!e?.conflict });
    return json({
      ok: false, error: clean(e?.message || "publish_failed", 1000),
      partial: !!e?.partial, uploaded_files: e?.uploadedFiles || 0,
      failed_files: e?.failedFiles || 0, conflict: !!e?.conflict
    }, Number(e?.status) || (e?.conflict ? 409 : 502));
  }
});
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const PUBLIC_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
const DEFAULT_REPO = "faysaltalukder/halalfood";
const DEFAULT_BRANCH = "main";
const DEFAULT_SITE_URL = "https://faysaltalukder.github.io/halalfood/";
const ALLOWED_ORIGIN = "https://faysaltalukder.github.io";
const MAX_FILES = 160;
const MAX_FILE_BYTES = 204800;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_HTML_FILES_FOR_CACHE_BUST = 180;
const CACHE_FILE = "site-release.json";
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".webmanifest"]);
const BLOCKED_PATHS = new Set([
  "site-release.json",
  "admin/shared.js",
  "admin/index.html",
  "admin/settings.html",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

type Row = Record<string, unknown>;
type ChangeFile = { id?: string; path: string; action: "add" | "modify" | "delete"; content: string | null; sha256?: string | null };
type TreeItem = { path: string; mode?: string; type?: string; sha?: string | null; size?: number };
type ChangeSet = {
  id: string; title: string; description: string; status: string; base_commit_sha: string | null;
  manifest_sha256: string | null; approval_signature: string | null; approved_manifest_sha256: string | null;
  release_id: string | null; created_by: string; approved_by: string | null; approved_at: string | null;
  published_commit_sha: string | null; deployment_status: string; deployment_url: string | null;
  last_error: string | null; created_at: string; updated_at: string;
  rollback_of_change_set_id: string | null;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const service = () => {
  if (!SERVICE_ROLE_KEY) throw new Error("Supabase service configuration is missing.");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
};
const repoName = () => {
  const value = (Deno.env.get("GITHUB_REPO") || DEFAULT_REPO).trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error("GITHUB_REPO must use owner/repository format.");
  return value;
};
const branchName = () => (Deno.env.get("GITHUB_BRANCH") || DEFAULT_BRANCH).trim();
const siteUrl = () => {
  const value = (Deno.env.get("SITE_BASE_URL") || DEFAULT_SITE_URL).trim();
  if (!value.startsWith("https://")) throw new Error("SITE_BASE_URL must use HTTPS.");
  return value.endsWith("/") ? value : value + "/";
};
const githubToken = () => (Deno.env.get("GITHUB_TOKEN") || "").trim();

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid session token.");
  const normal = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(normal + "=".repeat((4 - normal.length % 4) % 4)));
}

async function requireAdmin(req: Request): Promise<{ email: string } | { response: Response }> {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return { response: json({ success: false, error: "Sign in to the Halal Food admin dashboard first." }, 401) };
  let claims: Record<string, unknown>;
  try {
    claims = decodeJwtPayload(bearer);
  } catch {
    return { response: json({ success: false, error: "Invalid admin session." }, 401) };
  }
  if (claims.role !== "authenticated" || claims.aal !== "aal2" || Number(claims.exp || 0) <= Math.floor(Date.now() / 1000)) {
    return { response: json({ success: false, error: "A valid admin session with completed MFA (aal2) is required." }, 403) };
  }
  try {
    const authClient = createClient(SUPABASE_URL, PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser(bearer);
    if (error || !data.user || clean(data.user.email, 320).toLowerCase() !== ADMIN_EMAIL) {
      return { response: json({ success: false, error: "Admin session could not be verified. Sign in again." }, 401) };
    }
    return { email: ADMIN_EMAIL };
  } catch {
    return { response: json({ success: false, error: "Admin session verification is temporarily unavailable." }, 503) };
  }
}

function validOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === ALLOWED_ORIGIN;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, "0")).join("");
}
function approvalKey(): string {
  const value = Deno.env.get("SITE_PUBLISH_APPROVAL_HMAC_KEY") || SERVICE_ROLE_KEY;
  if (!value || value.length < 32) throw new Error("Server-side approval signing key is not configured.");
  return value;
}
async function signApproval(value: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(approvalKey());
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result)).map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let difference = 0;
  for (let i = 0; i < aa.length; i++) difference |= aa[i] ^ bb[i];
  return difference === 0;
}

function checkPath(path: string, reading = false): string {
  const p = clean(path, 400);
  if (!p || p !== path || p.startsWith("/") || p.includes("\\") || p.includes("\0") ||
      p.split("/").some((part) => !part || part === "." || part === "..") ||
      p.startsWith(".") || p.includes("/.")) {
    throw new Error("Unsafe repository path.");
  }
  const lower = p.toLowerCase();
  if (lower.endsWith(".env") || lower.includes(".env.") || lower.includes("secret") || lower.includes("credential")) {
    throw new Error("Secret/configuration files are not available through this workflow.");
  }
  if (reading) {
    const readExtensions = [".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".webmanifest", ".ts", ".sql", ".md", ".yml"];
    if (!readExtensions.some((ext) => lower.endsWith(ext))) throw new Error("Only text source files can be read.");
    return p;
  }
  if (BLOCKED_PATHS.has(lower) || lower.startsWith(".github/") || lower.startsWith("supabase/") ||
      lower.startsWith(".git/") || lower.startsWith("images/") || lower.startsWith("docs/")) {
    throw new Error("This path is excluded from one-click website publishing.");
  }
  const ext = p.includes(".") ? "." + p.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Only text-based website files can be published. Binary uploads are disabled.");
  return p;
}

function githubHeaders(authenticated = true): HeadersInit {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Halal-Food-Site-Publisher",
  };
  if (authenticated && githubToken()) headers.Authorization = "Bearer " + githubToken();
  return headers;
}
async function githubApi(path: string, init: RequestInit = {}, needsWrite = false, useToken = true): Promise<any> {
  if (needsWrite && !githubToken()) throw new Error("GITHUB_TOKEN is not configured in Supabase Edge Function secrets.");
  const url = "https://api.github.com/repos/" + repoName() + "/" + path.replace(/^\/+/, "");
  const headers = new Headers(githubHeaders(Boolean(useToken && githubToken())));
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 || response.status === 422) {
      throw Object.assign(new Error("GitHub rejected the operation because the branch or file state changed. Refresh and validate again."), { conflict: true, status: response.status });
    }
    throw Object.assign(new Error(clean(data?.message, 450) || "GitHub API request failed."), { status: response.status });
  }
  return data;
}
async function getHeadSha(useToken = true): Promise<string> {
  const branch = branchName().split("/").map(encodeURIComponent).join("/");
  const ref = await githubApi("git/ref/heads/" + branch, {}, false, useToken);
  const sha = clean(ref?.object?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("Could not determine the current GitHub branch head.");
  return sha;
}
async function getCommit(sha: string): Promise<any> {
  return await githubApi("git/commits/" + encodeURIComponent(sha));
}
async function getTree(sha: string): Promise<TreeItem[]> {
  const result = await githubApi("git/trees/" + encodeURIComponent(sha) + "?recursive=1");
  if (result?.truncated) throw new Error("Repository tree was truncated; validation stopped safely.");
  return Array.isArray(result?.tree) ? result.tree as TreeItem[] : [];
}
async function readRawFile(sha: string, path: string): Promise<string> {
  const rawPath = path.split("/").map(encodeURIComponent).join("/");
  const url = "https://raw.githubusercontent.com/" + repoName() + "/" + encodeURIComponent(sha) + "/" + rawPath;
  const response = await fetch(url, { cache: "no-store", headers: { "Accept": "text/plain" } });
  if (!response.ok) throw new Error("Could not read source file from the selected base commit: " + path);
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) throw new Error("Source file exceeds the text file size limit: " + path);
  return text;
}

async function loadChangeSet(id: string): Promise<{ set: ChangeSet; files: ChangeFile[] }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid change set ID.");
  const db = service();
  const { data: set, error: setError } = await db.from("site_change_sets").select("*").eq("id", id).single();
  if (setError || !set) throw new Error("Change set was not found.");
  const { data: files, error: fileError } = await db.from("site_change_files").select("id,path,action,content,sha256").eq("change_set_id", id).order("path", { ascending: true });
  if (fileError) throw new Error("Could not read change set files.");
  return { set: set as ChangeSet, files: (files || []) as ChangeFile[] };
}

async function logEvent(changeSetId: string | null, action: string, actor: string | null, status: "info" | "success" | "warning" | "error", message: string, metadata: Record<string, unknown> = {}) {
  try {
    await service().from("site_publish_log").insert({
      change_set_id: changeSetId, action, actor_email: actor, status,
      message: clean(message, 2000),
      metadata: JSON.parse(JSON.stringify(metadata, (_key, value) => typeof value === "string" ? clean(value, 300) : value)),
    });
  } catch {
    // Logging must never surface credentials or interrupt a safe failure response.
  }
}

async function updateSet(id: string, values: Record<string, unknown>, expectedStatus?: string): Promise<boolean> {
  let query = service().from("site_change_sets").update(values).eq("id", id);
  if (expectedStatus) query = query.eq("status", expectedStatus);
  const { data, error } = await query.select("id");
  if (error) throw new Error("Could not update change set state.");
  return Array.isArray(data) && data.length > 0;
}

function normalizedRepoPath(htmlPath: string, reference: string): string | null {
  const value = reference.trim();
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return null;
  let raw = value.split("#")[0].split("?")[0].trim();
  if (!raw) return null;
  try { raw = decodeURIComponent(raw); } catch { return null; }
  let parts: string[];
  if (raw.startsWith("/")) {
    raw = raw.replace(/^\/+/, "");
    if (raw.startsWith("halalfood/")) raw = raw.slice("halalfood/".length);
    parts = [];
  } else {
    parts = htmlPath.includes("/") ? htmlPath.split("/").slice(0, -1) : [];
  }
  for (const segment of raw.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") { if (parts.length) parts.pop(); else return null; }
    else parts.push(segment);
  }
  return parts.join("/");
}
function bumpVersion(reference: string, version: string): string {
  const hashIndex = reference.indexOf("#");
  const hash = hashIndex >= 0 ? reference.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
  const q = withoutHash.indexOf("?");
  const path = q >= 0 ? withoutHash.slice(0, q) : withoutHash;
  const query = q >= 0 ? withoutHash.slice(q + 1).split("&").filter((part) => part && !/^v=/i.test(part)) : [];
  query.push("v=" + encodeURIComponent(version));
  return path + "?" + query.join("&") + hash;
}
function bumpHtmlReferences(htmlPath: string, html: string, changedAssets: Set<string>, version: string): { content: string; count: number } {
  let count = 0;
  const content = html.replace(/\b(href|src)\s*=\s*(["'])(.*?)\2/gi, (full, attr, quote, ref) => {
    const target = normalizedRepoPath(htmlPath, ref);
    if (!target || !changedAssets.has(target)) return full;
    const bumped = bumpVersion(ref, version);
    if (bumped === ref) return full;
    count++;
    return attr + "=" + quote + bumped + quote;
  });
  return { content, count };
}
function scanSecrets(path: string, content: string): boolean {
  const patterns = [
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{16,}/i,
    /\bGITHUB_TOKEN\s*[:=]\s*["'][^"']{16,}/i,
    /\bFACEBOOK_APP_SECRET\s*[:=]\s*["'][^"']{8,}/i,
  ];
  return patterns.some((pattern) => pattern.test(content));
}
function checkCss(content: string): boolean {
  const trimmed = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}
function checkHtml(content: string): boolean {
  const lower = content.toLowerCase();
  if (lower.includes("<html") && !lower.includes("</html>")) return false;
  if (lower.includes("<head") && !lower.includes("</head>")) return false;
  if (lower.includes("<body") && !lower.includes("</body>")) return false;
  return true;
}
async function manifestFor(set: ChangeSet, files: ChangeFile[]): Promise<{ manifest: string; files: ChangeFile[]; totalBytes: number }> {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  let totalBytes = 0;
  for (const file of sorted) {
    file.path = checkPath(file.path);
    if (!["add", "modify", "delete"].includes(file.action)) throw new Error("A change file has an invalid action.");
    if (file.action === "delete") file.content = null;
    else if (typeof file.content !== "string") throw new Error("Every added or modified file must include its full text content.");
    if (file.content !== null) {
      const bytes = new TextEncoder().encode(file.content).byteLength;
      if (bytes > MAX_FILE_BYTES) throw new Error("File exceeds 200 KiB size limit: " + file.path);
      totalBytes += bytes;
      if (scanSecrets(file.path, file.content)) throw new Error("A possible secret was detected in " + file.path + ". Remove it; the content was not included in the error log.");
      if (file.path.endsWith(".js")) {
        try { new Function(file.content); } catch { throw new Error("JavaScript syntax validation failed in " + file.path + "."); }
      }
      if (file.path.endsWith(".json") || file.path.endsWith(".webmanifest")) {
        try { JSON.parse(file.content); } catch { throw new Error("JSON validation failed in " + file.path + "."); }
      }
      if (file.path.endsWith(".css") && !checkCss(file.content)) throw new Error("CSS braces are unbalanced in " + file.path + ".");
      if (file.path.endsWith(".html") && !checkHtml(file.content)) throw new Error("HTML structure check failed in " + file.path + ".");
      file.sha256 = await sha256(file.content);
    } else {
      file.sha256 = null;
    }
  }
  if (!sorted.length) throw new Error("Change set contains no files.");
  if (sorted.length > MAX_FILES) throw new Error("The change set exceeds the file-count limit.");
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("The change set exceeds the 5 MiB total text limit.");
  const manifestInput = JSON.stringify({
    changeSetId: set.id, baseCommitSha: set.base_commit_sha, releaseId: set.release_id,
    files: sorted.map((f) => ({ path: f.path, action: f.action, sha256: f.sha256 })),
  });
  return { manifest: await sha256(manifestInput), files: sorted, totalBytes };
}

async function concurrentMap<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      output[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

async function validateChangeSet(id: string, actor: string) {
  const db = service();
  const { set, files: originalFiles } = await loadChangeSet(id);
  if (!["draft", "failed"].includes(set.status)) throw new Error("Only a draft or failed change set can be validated.");
  if (!set.base_commit_sha || !/^[a-f0-9]{40}$/i.test(set.base_commit_sha)) throw new Error("base_commit_sha is required. The AI agent must record the source_read headSha used to prepare the draft.");
  const headSha = await getHeadSha();
  if (headSha !== set.base_commit_sha) {
    await updateSet(id, { status: "conflict", last_error: "The base commit no longer matches the branch head. Refresh the source and recreate or rebase the draft." });
    await logEvent(id, "validation_conflict", actor, "warning", "Branch head changed before validation.", { base: set.base_commit_sha, head: headSha });
    throw Object.assign(new Error("The branch changed since the draft was prepared. Read the source again and recreate/rebase the draft."), { conflict: true });
  }
  const tree = await getTree(headSha);
  const treeMap = new Map(tree.filter((item) => item.type === "blob").map((item) => [item.path, item]));
  const byPath = new Map<string, ChangeFile>();
  for (const file of originalFiles) {
    const path = checkPath(file.path);
    if (byPath.has(path)) throw new Error("Duplicate path in change set: " + path);
    const exists = treeMap.has(path);
    if (file.action === "add" && exists) throw new Error("A file marked add already exists: " + path);
    if ((file.action === "modify" || file.action === "delete") && !exists) throw new Error("A file marked modify/delete does not exist: " + path);
    if (file.action === "delete" && path.endsWith(".html")) {
      // A deleted page is permitted only if no changed page links to it; local-reference validation below checks changed HTML.
    }
    byPath.set(path, { ...file, path });
  }

  const assetPaths = new Set(originalFiles.filter((file) => file.action !== "delete" && (file.path.endsWith(".css") || file.path.endsWith(".js"))).map((file) => file.path));
  const releaseId = crypto.randomUUID();
  let cacheBumps = 0;
  if (assetPaths.size) {
    const htmlItems = tree.filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".html"));
    if (htmlItems.length > MAX_HTML_FILES_FOR_CACHE_BUST) throw new Error("Too many HTML files for automatic cache-busting. Include the dependent HTML files manually or use a reviewed release.");
    const htmlPaths = new Set(htmlItems.map((item) => item.path));
    for (const file of byPath.values()) if (file.action !== "delete" && file.path.toLowerCase().endsWith(".html")) htmlPaths.add(file.path);
    const bumpResults = await concurrentMap(Array.from(htmlPaths), 10, async (path) => {
      const staged = byPath.get(path);
      if (staged?.action === "delete") return null;
      let content: string;
      if (staged && (staged.action === "add" || staged.action === "modify") && typeof staged.content === "string") content = staged.content;
      else {
        if (!treeMap.has(path)) return null;
        content = await readRawFile(headSha, path);
      }
      const bumped = bumpHtmlReferences(path, content, assetPaths, releaseId);
      return bumped.count ? { path, content: bumped.content, exists: treeMap.has(path), originalAction: staged?.action || null, count: bumped.count } : null;
    });
    for (const result of bumpResults) {
      if (!result) continue;
      cacheBumps += result.count;
      const existing = byPath.get(result.path);
      if (existing?.action === "add") existing.content = result.content;
      else if (existing?.action === "modify") existing.content = result.content;
      else if (existing?.action === "delete") continue;
      else byPath.set(result.path, { path: result.path, action: result.exists ? "modify" : "add", content: result.content, sha256: null });
    }
  }

  const finalFiles = Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
  const finalPaths = new Set(finalFiles.filter((file) => file.action !== "delete").map((file) => file.path));
  const deletedPaths = new Set(finalFiles.filter((file) => file.action === "delete").map((file) => file.path));
  for (const file of finalFiles) {
    if (file.action !== "delete" && file.path.endsWith(".html")) {
      const attrs = file.content || "";
      const refs = Array.from(attrs.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)).map((m) => m[2]);
      for (const ref of refs) {
        const local = normalizedRepoPath(file.path, ref);
        if (!local) continue;
        const ext = local.includes(".") ? "." + local.split(".").pop()!.toLowerCase() : "";
        if (![".html", ".css", ".js", ".json", ".webmanifest", ".svg", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico"].includes(ext)) continue;
        if (deletedPaths.has(local) || (!treeMap.has(local) && !finalPaths.has(local))) {
          throw new Error("A local file referenced by " + file.path + " is missing from the repository/draft: " + local);
        }
      }
    }
  }

  const manifestResult = await manifestFor({ ...set, release_id: releaseId }, finalFiles);
  const upserts = manifestResult.files.map((file) => ({
    change_set_id: id, path: file.path, action: file.action, content: file.content, sha256: file.sha256,
  }));
  const { error: saveFilesError } = await db.from("site_change_files").upsert(upserts, { onConflict: "change_set_id,path" });
  if (saveFilesError) throw new Error("Validated draft could not be saved. Check staging limits and try again.");
  const { error: cleanError } = await db.from("site_change_files").delete().eq("change_set_id", id).not("path", "in", "(" + manifestResult.files.map((f) => "\"" + f.path.replace(/"/g, "\\\"") + "\"").join(",") + ")");
  if (cleanError) {
    // No delete is required for safety; stale rows are caught by the manifest check on publish.
  }
  const { error: setError } = await db.from("site_change_sets").update({
    status: "validated", base_commit_sha: headSha, release_id: releaseId,
    manifest_sha256: manifestResult.manifest, approved_manifest_sha256: null,
    approval_signature: null, approved_by: null, approved_at: null,
    last_error: null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (setError) throw new Error("Validated files were staged but the status could not be updated.");
  await logEvent(id, "validated", actor, "success", "Validation passed. Review the generated diff before approval.", {
    fileCount: manifestResult.files.length, totalBytes: manifestResult.totalBytes, cacheBustedReferences: cacheBumps, releaseId,
  });
  return { success: true, changeSetId: id, status: "validated", fileCount: manifestResult.files.length, totalBytes: manifestResult.totalBytes, cacheBustedReferences: cacheBumps, releaseId, manifestSha256: manifestResult.manifest };
}

async function getCurrentManifest(set: ChangeSet, files: ChangeFile[]): Promise<string> {
  const result = await manifestFor(set, files);
  return result.manifest;
}
function approvalPayload(set: ChangeSet, approvedBy: string, approvedAt: string, manifest: string): string {
  return [set.id, set.base_commit_sha || "", set.release_id || "", manifest, approvedBy, approvedAt].join("|");
}
async function approveChangeSet(id: string, actor: string) {
  const { set, files } = await loadChangeSet(id);
  if (set.status !== "validated" || !set.manifest_sha256 || !set.release_id) throw new Error("Only a validated change set can be approved.");
  const currentHead = await getHeadSha();
  if (currentHead !== set.base_commit_sha) {
    await updateSet(id, { status: "conflict", last_error: "Branch changed after validation. Validate a fresh draft before approval." });
    await logEvent(id, "approval_conflict", actor, "warning", "Branch head changed before approval.");
    throw Object.assign(new Error("The branch has changed since validation. Refresh and validate the draft again."), { conflict: true });
  }
  const currentManifest = await getCurrentManifest(set, files);
  if (currentManifest !== set.manifest_sha256) throw new Error("The draft changed after validation. Validate again before approval.");
  const approvedAt = new Date().toISOString();
  const signature = await signApproval(approvalPayload(set, actor, approvedAt, currentManifest));
  const { data: approvedRows, error } = await service().from("site_change_sets").update({
    status: "approved", approved_by: actor, approved_at: approvedAt,
    approved_manifest_sha256: currentManifest, approval_signature: signature, last_error: null,
  }).eq("id", id).eq("status", "validated").select("id");
  if (error || !approvedRows?.length) throw new Error("Could not record approval; the draft status may have changed. Refresh and retry.");
  await logEvent(id, "approved", actor, "success", "Admin approval recorded for this exact file manifest.", { manifestSha256: currentManifest });
  return { success: true, changeSetId: id, status: "approved", approvedAt };
}
async function checkApproval(set: ChangeSet, files: ChangeFile[]): Promise<boolean> {
  if (!set.approved_by || !set.approved_at || !set.approval_signature || !set.approved_manifest_sha256 || !set.base_commit_sha || !set.release_id) return false;
  const manifest = await getCurrentManifest(set, files);
  if (manifest !== set.approved_manifest_sha256 || manifest !== set.manifest_sha256) return false;
  const expected = await signApproval(approvalPayload(set, set.approved_by, set.approved_at, manifest));
  return await constantTimeEqual(expected, set.approval_signature);
}

async function blobFor(content: string): Promise<string> {
  const result = await githubApi("git/blobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, encoding: "utf-8" }) }, true);
  if (!/^[a-f0-9]{40}$/i.test(String(result?.sha || ""))) throw new Error("GitHub did not return a valid blob SHA.");
  return result.sha;
}
async function createCommitFromTree(baseSha: string, changeSetId: string, changedFiles: ChangeFile[], title: string, releaseId: string, rollbackOf?: string | null) {
  const headSha = await getHeadSha();
  if (headSha !== baseSha) throw Object.assign(new Error("The branch head changed before commit creation. No new commit was published."), { conflict: true });
  const headCommit = await getCommit(headSha);
  const baseTreeSha = clean(headCommit?.tree?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(baseTreeSha)) throw new Error("Could not read the current base tree.");
  const entries = await concurrentMap(changedFiles, 6, async (file) => {
    if (file.action === "delete") return { path: file.path, mode: "100644", type: "blob", sha: null };
    if (typeof file.content !== "string") throw new Error("Missing content for " + file.path);
    const sha = await blobFor(file.content);
    return { path: file.path, mode: "100644", type: "blob", sha };
  });
  const releaseContent = JSON.stringify({
    release_id: releaseId,
    change_set_id: changeSetId,
    release_title: clean(title, 200),
    base_commit_sha: baseSha,
    rollback_of_commit: rollbackOf || null,
    generated_at: new Date().toISOString(),
  }, null, 2) + "\n";
  const releaseBlobSha = await blobFor(releaseContent);
  const treeElements = [...entries.filter((entry) => entry.path !== CACHE_FILE), { path: CACHE_FILE, mode: "100644", type: "blob", sha: releaseBlobSha }];
  const tree = await githubApi("git/trees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_tree: baseTreeSha, tree: treeElements }) }, true);
  const treeSha = clean(tree?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(treeSha)) throw new Error("GitHub did not return a valid tree SHA.");
  const message = "Website Publisher: " + clean(title, 160) + "\n\nChange-Set: " + changeSetId + "\nRelease-ID: " + releaseId + (rollbackOf ? "\nRollback-Of: " + rollbackOf : "");
  const commit = await githubApi("git/commits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, tree: treeSha, parents: [baseSha] }) }, true);
  const commitSha = clean(commit?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) throw new Error("GitHub did not return a valid commit SHA.");
  // Recheck before the ref move. force:false plus the parent SHA prevents a non-fast-forward overwrite.
  const headBeforeRef = await getHeadSha();
  if (headBeforeRef !== baseSha) throw Object.assign(new Error("The branch head changed before ref update. The commit was created but not published."), { conflict: true, orphanCommitSha: commitSha });
  const branch = branchName().split("/").map(encodeURIComponent).join("/");
  await githubApi("git/refs/heads/" + branch, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: commitSha, force: false }) }, true);
  return { commitSha, releaseId, releaseContent };
}

async function publishChangeSet(id: string, actor: string) {
  if (!githubToken()) throw new Error("GITHUB_TOKEN is missing. Add the repository-scoped token in Supabase Edge Function secrets before publishing.");
  const { set, files } = await loadChangeSet(id);
  if (set.status !== "approved") throw new Error("This change set is not approved. Approve it from the authenticated admin dashboard first.");
  if (!await checkApproval(set, files)) throw new Error("Approval integrity check failed. The change set or approval record may have been modified. Validate and approve again.");
  const head = await getHeadSha();
  if (head !== set.base_commit_sha) {
    await updateSet(id, { status: "conflict", last_error: "Branch changed after approval. Rebase/revalidate and obtain a new approval." });
    await logEvent(id, "publish_conflict", actor, "warning", "Branch head changed after approval.");
    throw Object.assign(new Error("The branch changed after approval. Nothing was published; refresh the source and approve a new draft."), { conflict: true });
  }
  const locked = await updateSet(id, { status: "publishing", last_error: null }, "approved");
  if (!locked) throw new Error("This change set is already being processed or its status changed.");
  try {
    const tree = await getTree(head);
    const treeMap = new Map(tree.filter((item) => item.type === "blob").map((item) => [item.path, item]));
    for (const file of files) {
      checkPath(file.path);
      const exists = treeMap.has(file.path);
      if (file.action === "add" && exists) throw new Error("A file marked add now exists: " + file.path);
      if ((file.action === "modify" || file.action === "delete") && !exists) throw new Error("A file marked modify/delete disappeared: " + file.path);
    }
    const title = clean(set.title, 200);
    const commit = await createCommitFromTree(head, set.id, files, title, set.release_id || crypto.randomUUID());
    const { error: updateError } = await service().from("site_change_sets").update({
      status: "published", published_commit_sha: commit.commitSha, deployment_status: "pending",
      deployment_url: siteUrl(), last_error: null, updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "publishing");
    if (updateError) {
      await logEvent(id, "commit_created_status_update_failed", actor, "error", "GitHub commit was created; database status update needs review.", { commitSha: commit.commitSha });
      return { success: true, changeSetId: id, status: "publishing", commitSha: commit.commitSha, deploymentStatus: "unknown", warning: "Commit was created, but the status log needs review." };
    }
    await logEvent(id, "published", actor, "success", "Commit pushed to the configured branch. GitHub Pages deployment is pending verification.", { commitSha: commit.commitSha, releaseId: commit.releaseId });
    return { success: true, changeSetId: id, status: "published", commitSha: commit.commitSha, commitUrl: "https://github.com/" + repoName() + "/commit/" + commit.commitSha, deploymentStatus: "pending", releaseId: commit.releaseId };
  } catch (error) {
    const message = clean((error as any)?.message, 1200) || "Publishing failed.";
    const conflict = Boolean((error as any)?.conflict);
    await updateSet(id, { status: conflict ? "conflict" : "failed", last_error: message }, "publishing").catch(() => false);
    await logEvent(id, conflict ? "publish_conflict" : "publish_failed", actor, conflict ? "warning" : "error", message);
    throw error;
  }
}

async function checkDeployment(id: string, actor: string) {
  const { set } = await loadChangeSet(id);
  if (set.status !== "published" || !set.release_id || !set.published_commit_sha) throw new Error("This change set has no published commit to verify.");
  const url = new URL(CACHE_FILE, siteUrl());
  url.searchParams.set("verify", set.release_id);
  let liveRelease = "";
  let httpStatus = 0;
  try {
    const response = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
    httpStatus = response.status;
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      liveRelease = clean(data?.release_id, 100);
    }
  } catch {
    // Treat an unreachable URL as pending; never claim deployment succeeded.
  }
  if (liveRelease === set.release_id) {
    await updateSet(id, { deployment_status: "deployed", deployment_url: siteUrl(), last_error: null });
    await logEvent(id, "deployment_verified", actor, "success", "Live site release marker matches the published release.", { httpStatus, releaseId: liveRelease });
    return { success: true, changeSetId: id, deploymentStatus: "deployed", liveUrl: siteUrl(), releaseId: liveRelease };
  }
  await updateSet(id, { deployment_status: "pending", deployment_url: siteUrl() });
  await logEvent(id, "deployment_check_pending", actor, "info", "The live release marker has not appeared yet.", { httpStatus, expectedRelease: set.release_id, observedRelease: liveRelease || null });
  return { success: true, changeSetId: id, deploymentStatus: "pending", liveUrl: siteUrl(), expectedRelease: set.release_id, observedRelease: liveRelease || null, message: "The live site has not reported this release yet. Check again shortly." };
}

async function rollbackChangeSet(id: string, actor: string) {
  if (!githubToken()) throw new Error("GITHUB_TOKEN is missing. Add the repository-scoped token before rollback.");
  const db = service();
  const { set } = await loadChangeSet(id);
  if (set.status !== "published" || !set.published_commit_sha) throw new Error("Only a published change set can be rolled back.");
  const headSha = await getHeadSha();
  const targetCommit = await getCommit(set.published_commit_sha);
  const parentSha = clean(targetCommit?.parents?.[0]?.sha, 80);
  if (!/^[a-f0-9]{40}$/i.test(parentSha)) throw new Error("The target commit has no parent to revert.");
  const [targetTree, parentTree, currentTree] = await Promise.all([
    getTree(set.published_commit_sha), getTree(parentSha), getTree(headSha),
  ]);
  const toMap = (items: TreeItem[]) => new Map(items.filter((item) => item.type === "blob").map((item) => [item.path, item]));
  const targetMap = toMap(targetTree), parentMap = toMap(parentTree), currentMap = toMap(currentTree);
  const changedPaths = new Set([...targetMap.keys(), ...parentMap.keys()]);
  const touched: string[] = [];
  for (const path of changedPaths) {
    if (path === CACHE_FILE) continue; // Publisher-owned release marker is regenerated.
    const before = parentMap.get(path);
    const after = targetMap.get(path);
    if ((before?.sha || null) === (after?.sha || null) && (before?.mode || null) === (after?.mode || null)) continue;
    const current = currentMap.get(path);
    if ((current?.sha || null) !== (after?.sha || null) || (current?.mode || null) !== (after?.mode || null)) {
      throw Object.assign(new Error("Rollback stopped safely: " + path + " has changed since the selected commit. Review the later changes before reverting."), { conflict: true });
    }
    touched.push(path);
  }
  if (!touched.length) throw new Error("No revertible file changes were found for the selected commit.");
  const parentByPath = parentMap;
  const edits = touched.map((path) => {
    const old = parentByPath.get(path);
    return old
      ? { path, mode: old.mode || "100644", type: "blob", sha: old.sha }
      : { path, mode: "100644", type: "blob", sha: null };
  });
  const rollbackReleaseId = crypto.randomUUID();
  const releaseContent = JSON.stringify({ release_id: rollbackReleaseId, rollback_of_commit: set.published_commit_sha, rolled_back_change_set_id: set.id, generated_at: new Date().toISOString() }, null, 2) + "\n";
  const releaseBlob = await blobFor(releaseContent);
  const treeCommit = await getCommit(headSha);
  const rollbackTree = await githubApi("git/trees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    base_tree: clean(treeCommit?.tree?.sha, 80),
    tree: [...edits, { path: CACHE_FILE, mode: "100644", type: "blob", sha: releaseBlob }],
  }) }, true);
  const rollbackCommit = await githubApi("git/commits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    message: "Website Publisher: revert " + set.published_commit_sha + "\n\nRollback-Of-Change-Set: " + id + "\nRelease-ID: " + rollbackReleaseId,
    tree: rollbackTree.sha, parents: [headSha],
  }) }, true);
  const latestHead = await getHeadSha();
  if (latestHead !== headSha) throw Object.assign(new Error("Branch changed during rollback. The rollback commit was created but not published."), { conflict: true });
  await githubApi("git/refs/heads/" + branchName().split("/").map(encodeURIComponent).join("/"), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: rollbackCommit.sha, force: false }),
  }, true);
  await db.from("site_change_sets").update({ status: "rolled_back", updated_at: new Date().toISOString() }).eq("id", id);
  const { data: rollbackSet, error: insertError } = await db.from("site_change_sets").insert({
    title: "Rollback: " + clean(set.title, 150), description: "Reverts published change set " + id,
    status: "published", base_commit_sha: headSha, release_id: rollbackReleaseId,
    created_by: actor, published_commit_sha: rollbackCommit.sha,
    deployment_status: "pending", deployment_url: siteUrl(), rollback_of_change_set_id: id,
  }).select("id").single();
  if (insertError) await logEvent(id, "rollback_committed_log_row_failed", actor, "error", "Rollback commit was published but its history row could not be created.", { rollbackCommitSha: rollbackCommit.sha });
  await logEvent(id, "rolled_back", actor, "success", "Rollback commit pushed. Deployment verification is pending.", { rollbackCommitSha: rollbackCommit.sha, rollbackChangeSetId: rollbackSet?.id || null, restoredPaths: touched.length });
  return { success: true, changeSetId: id, rollbackChangeSetId: rollbackSet?.id || null, rollbackCommitSha: rollbackCommit.sha, deploymentStatus: "pending", restoredPaths: touched.length };
}

async function listChangeSets() {
  const db = service();
  const { data, error } = await db.from("site_change_sets")
    .select("id,title,description,status,base_commit_sha,manifest_sha256,release_id,created_by,approved_by,approved_at,published_commit_sha,deployment_status,deployment_url,last_error,rollback_of_change_set_id,created_at,updated_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Could not list website change sets.");
  const { data: logs, error: logError } = await db.from("site_publish_log")
    .select("id,change_set_id,action,actor_email,status,message,commit_sha,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (logError) throw new Error("Could not load publishing history.");
  return { success: true, changeSets: data || [], logs: logs || [] };
}
async function getChangeSetDetails(id: string) {
  const { set, files } = await loadChangeSet(id);
  const safeSet = {
    id: set.id, title: set.title, description: set.description, status: set.status, base_commit_sha: set.base_commit_sha,
    manifest_sha256: set.manifest_sha256, release_id: set.release_id, created_by: set.created_by,
    approved_by: set.approved_by, approved_at: set.approved_at, published_commit_sha: set.published_commit_sha,
    deployment_status: set.deployment_status, deployment_url: set.deployment_url, last_error: set.last_error,
    created_at: (set as any).created_at, updated_at: (set as any).updated_at,
  };
  return { success: true, changeSet: safeSet, files: files.map((file) => ({ path: file.path, action: file.action, content: file.content, sha256: file.sha256 })) };
}

async function sourceRead(pathValue: unknown, refValue?: unknown) {
  const path = checkPath(clean(pathValue, 400), true);
  if (!/^[A-Za-z0-9_./-]+$/.test(path)) throw new Error("Unsupported source path.");
  const requestedSha = typeof refValue === "string" && /^[a-f0-9]{40}$/i.test(refValue) ? refValue : "";
  const headSha = requestedSha || await getHeadSha(false);
  const sourceSha = requestedSha || headSha;
  const content = await readRawFile(sourceSha, path);
  return { success: true, repository: repoName(), branch: branchName(), headSha, sourceSha, path, content, sha256: await sha256(content) };
}
function missingConfiguration() {
  const missing: string[] = [];
  if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!githubToken()) missing.push("GITHUB_TOKEN");
  if (!(Deno.env.get("SITE_PUBLISH_APPROVAL_HMAC_KEY") || SERVICE_ROLE_KEY)) missing.push("SITE_PUBLISH_APPROVAL_HMAC_KEY");
  return missing;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ success: false, error: "Use POST for this endpoint." }, 405);
  if (!validOrigin(req)) return json({ success: false, error: "Origin is not allowed." }, 403);
  let body: Row;
  try { body = await req.json(); } catch { return json({ success: false, error: "Request body must be valid JSON." }, 400); }
  const action = clean(body.action, 60);
  try {
    if (action === "source_read") return json(await sourceRead(body.path, body.ref));
    const auth = await requireAdmin(req);
    if ("response" in auth) return auth.response;
    const actor = auth.email;

    if (action === "config_status") {
      return json({
        success: true, repository: repoName(), branch: branchName(), siteUrl: siteUrl(),
        githubTokenConfigured: Boolean(githubToken()), approvalKeyConfigured: Boolean(Deno.env.get("SITE_PUBLISH_APPROVAL_HMAC_KEY") || SERVICE_ROLE_KEY),
        serviceRoleConfigured: Boolean(SERVICE_ROLE_KEY), missingConfiguration: missingConfiguration(),
        allowedFileExtensions: Array.from(ALLOWED_EXTENSIONS), binaryUploadsEnabled: false,
      });
    }
    if (action === "list") return json(await listChangeSets());
    if (action === "details") return json(await getChangeSetDetails(clean(body.change_set_id, 60)));
    if (action === "validate") return json(await validateChangeSet(clean(body.change_set_id, 60), actor));
    if (action === "approve") return json(await approveChangeSet(clean(body.change_set_id, 60), actor));
    if (action === "publish") return json(await publishChangeSet(clean(body.change_set_id, 60), actor));
    if (action === "check_deployment") return json(await checkDeployment(clean(body.change_set_id, 60), actor));
    if (action === "rollback") return json(await rollbackChangeSet(clean(body.change_set_id, 60), actor));
    return json({ success: false, error: "Unknown action." }, 400);
  } catch (error) {
    const message = clean((error as any)?.message, 1200) || "Request failed.";
    const status = (error as any)?.status === 401 ? 401 : (error as any)?.status === 403 ? 403 : (error as any)?.conflict ? 409 : /not found/i.test(message) ? 404 : 400;
    return json({ success: false, error: message, conflict: status === 409 }, status);
  }
});

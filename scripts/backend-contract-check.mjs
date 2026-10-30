import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const security = read("supabase/functions/order-security-admin/index.ts");
const mfaGate = security.indexOf('if (claims?.aal !== "aal2")');
const adminClient = security.indexOf("const admin = createClient(url, serviceKey");
const listSignals = security.indexOf('if (action === "list_signals")');
assert.ok(mfaGate >= 0 && adminClient > mfaGate && listSignals > adminClient,
  "Order-security admin client must be created after MFA validation and before list_signals dispatch.");

const checkout = read("supabase/functions/incomplete-checkout/index.ts");
assert.match(checkout, /select\(["'][^"']*recovery_consent[^"']*["']\)/,
  "Incomplete checkout must read the stored recovery_consent value before preserving consent.");

for (const path of [
  "supabase/functions/messenger-webhook/index.ts",
  "supabase/functions/whatsapp-webhook/index.ts",
]) {
  const source = read(path);
  assert.match(source, /new ArrayBuffer\(raw\.byteLength\)/,
    `${path}: HMAC verification must copy raw request bytes into an ArrayBuffer.`);
  assert.match(source, /crypto\.subtle\.verify\([^;]*rawBuffer/s,
    `${path}: HMAC verification must verify the original raw bytes.`);
}

for (const path of [
  "supabase/functions/order-sync/index.ts",
  "supabase/functions/order-security-admin/index.ts",
]) {
  const source = read(path);
  assert.match(source, /EdgeRuntime\?:\s*\{\s*waitUntil:/,
    `${path}: background dispatch must use a typed EdgeRuntime waitUntil guard.`);
}

const youtube = read("supabase/functions/youtube-publishing/index.ts");
assert.match(youtube, /async function admin\(req:Request\):Promise<\{email:string\}\|\{error:Response\}>/,
  "YouTube admin authentication must expose a discriminated result type.");
assert.match(youtube, /matchedVideos:\s*R\[\]/,
  "YouTube recent-video mapping must narrow missing video records before mapping.");

const courier = read("supabase/functions/courier-integration/index.ts");
assert.match(courier, /async function redxPreflight\(/,
  "Courier Integration must retain Production REDX pickup-store/area preflight.");
assert.match(courier, /await redxPreflight\(/,
  "Courier booking must execute REDX preflight before booking.");

console.log("Backend contract guard passed.");

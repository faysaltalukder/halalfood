import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("admin/website-builder.html");
const js = read("admin/website-builder.js");
const css = read("admin/website-builder.css");
const studio = read("admin/wordpress-live.html");
const mediaPage = read("admin/media-library.html");
const mediaJs = read("admin/media-library.js");
const mediaCss = read("admin/media-library.css");
const storageDocs = read("docs/FILEBASE_STORAGE_ARCHITECTURE.md");

assert.ok(page.includes('data-page="wordpress"'), "Builder must use the existing secure admin shell route.");
assert.ok(page.includes('id="authGate"') && page.includes('id="adminApp" hidden'), "Builder must retain the secure admin gate.");
assert.ok(page.includes('website-builder.js?v=20261105-sandbox-partitions-v1') && page.includes('website-builder.css?v=20261105-sandbox-partitions-v1'), "Builder assets must be cache-busted.");
assert.ok(studio.includes('href="./website-builder.html"'), "WordPress Studio must expose the isolated Visual Builder entry point.");
assert.ok(js.includes("schemaVersion:1") && js.includes("sampleDocument"), "Builder must use a versioned JSON document model.");
for (const type of ["section","container","heading","paragraph","image","button"]) {
  assert.ok(js.includes(type + ":"), "Component defaults are missing: " + type);
  assert.ok(page.includes('data-add-component="' + type + '"'), "Component palette is missing: " + type);
}
assert.ok(js.includes("renderNode") && js.includes("renderInspector") && js.includes("renderLayers"), "Builder must separate rendering, layers and inspector behavior.");
assert.ok(js.includes("data-builder-viewport") && js.includes('is-"+viewport'), "Desktop, tablet and mobile canvas modes must be implemented.");
assert.ok(js.includes("state.undo") && js.includes("state.redo") && js.includes("builderUndo") && js.includes("builderRedo"), "Builder must support undo and redo.");
assert.ok(js.includes("localStorage.setItem(STORAGE_KEY") && page.includes('id="builderExport"'), "Draft persistence must stay browser-local and exportable.");
assert.ok(js.includes("not published") && page.includes("Test Publish never changes the public website") && page.includes("no live changes"), "The first builder milestone must not publish to the live site.");
assert.ok(!/\.from\(["']site_pages|\.from\(["']page_revisions|\.rpc\(["']publish/i.test(js), "The starter editor must not write to production CMS tables or publish.");
assert.ok(!/fetch\s*\(|XMLHttpRequest|supabase/i.test(js), "The isolated editor engine must not make network or Supabase requests.");
assert.ok(js.includes("textContent") && !js.includes("innerHTML=node.text") && !js.includes("insertAdjacentHTML(node.text"), "User-authored text must be rendered as text, not executable HTML.");
assert.ok(js.includes('["https:","http:"]'), "Image nodes must reject non-web URL schemes.");
assert.ok(css.includes("@media(max-width:900px)") && css.includes("@media(max-width:620px)") && css.includes("prefers-reduced-motion"), "Builder workspace must be responsive and respect reduced motion.");
assert.ok(mediaPage.includes('data-page="media-library"') && mediaPage.includes('media-library.js'), "Filebase Media Library must use the existing secure admin shell.");
assert.ok(mediaPage.includes('media-library.css') && mediaPage.includes('id="mediaUpload"') && mediaPage.includes('id="mediaGrid"'), "Media Library must expose upload and asset listing controls.");
assert.ok(mediaJs.includes('functions.invoke("filebase-storage"') && mediaJs.includes('action:"create_upload"') && mediaJs.includes('action:"list"') && mediaJs.includes('action:"create_download"') && mediaJs.includes('action:"delete"'), "Media Library must use the authenticated Filebase storage API for all object operations.");
assert.ok(mediaJs.includes('action:"configure_cors"') && mediaJs.includes('fetch(prepared.upload.url'), "Media Library must configure browser CORS and upload bytes directly to Filebase.");
assert.ok(!/\.storage\.from\s*\(/.test(mediaJs), "Filebase media uploads must not use Supabase Storage.");
assert.ok(storageDocs.includes("Supabase does not proxy the bytes") && storageDocs.includes("GitHub remains the canonical source-control"), "Secondary storage architecture must preserve Supabase/GitHub responsibility boundaries.");
assert.ok(mediaCss.includes("@media(max-width:760px)"), "Media Library must be responsive.");
console.log("Universal Website Builder foundation checks passed.");

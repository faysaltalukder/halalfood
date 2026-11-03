import fs from "node:fs";
import assert from "node:assert/strict";

const main = fs.readFileSync("js/main.js", "utf8");
const chat = fs.readFileSync("js/customer-care-chat.js", "utf8");
const css = fs.readFileSync("css/customer-care-chat.css", "utf8");
const home = fs.readFileSync("index.html", "utf8");

assert.match(main, /js\/customer-care-chat\.js\?v=20261103-ai-customer-care-ui-v1/);
assert.match(chat, /hf-contact-widget/);
assert.match(chat, /hf-contact-options"\)\?\.remove/);
assert.match(chat, /mobile-bottom-nav a\[aria-label="Contact"\]/);
assert.match(chat, /Open AI chat/);
assert.match(chat, /আমি Halal Food-এর AI সহকারী/);
assert.match(chat, /data-hf-chat-prompt/);
assert.match(chat, /Gemini AI-এর উত্তর দেওয়ার সার্ভার সংযোগ এখনো সম্পন্ন হয়নি/);
assert.match(chat, /https:\/\/wa\.me\/8801842031164/);
assert.match(chat, /tel:\+8801842031164/);
assert.doesNotMatch(chat, /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}/, "No Gemini API key may appear in storefront JavaScript");
assert.match(css, /\.hf-ai-chat-panel\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(css, /@media \(max-width: 900px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(home, /id="hf-contact-widget"/);
assert.match(home, /id="hf-contact-launcher"/);

console.log("AI Customer Care chat widget checks passed.");

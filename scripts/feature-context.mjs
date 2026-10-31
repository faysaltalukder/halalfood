#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const FEATURES = {
  catalog: {
    title: "Public product catalogue",
    purpose: "Product/category data, listing, search, product detail and catalogue rendering.",
    readFirst: ["js/live-catalog.js", "js/products-index.js"],
    files: [
      "index.html", "js/live-catalog.js", "js/products-index.js",
      "js/products-data.js", "js/product-page.js", "js/product-viewer.js",
      "categories/ghee.html", "products/cow-ghee.html"
    ],
    tables: ["products", "categories", "site_content_blocks"],
    functions: [],
    tests: ["scripts/architecture-check.mjs", "scripts/admin-phase12-check.mjs"],
    guardrails: ["Supabase is the live catalogue source.", "Keep product/category URLs, SEO metadata, filters and listing order compatible.", "Do not delete legacy product data until all fallbacks and page consumers are mapped."]
  },
  checkout: {
    title: "Cart and checkout",
    purpose: "Cart state, checkout validation, incomplete-checkout consent and order submission.",
    readFirst: ["js/cart.js", "js/main.js"],
    files: [
      "order.html", "js/cart.js", "js/main.js", "js/incomplete-checkout.js",
      "supabase/functions/order-sync/index.ts", "supabase/functions/incomplete-checkout/index.ts"
    ],
    tables: ["products", "orders", "order_items", "incomplete_checkouts", "inventory_movements"],
    functions: ["order-sync", "incomplete-checkout"],
    tests: ["scripts/architecture-check.mjs", "scripts/admin-phase12-check.mjs"],
    guardrails: ["Preserve current checkout fields, validation, COD totals and order ID format.", "Keep consent timestamps and consent method semantics intact.", "Do not change inventory reservation/release or Google Sheets fallback semantics without a separate test."]
  },
  orders: {
    title: "Admin order management",
    purpose: "Order list/detail, status changes, customer details, packing, finance and order security.",
    readFirst: ["admin/orders.html", "admin/app.js"],
    files: [
      "admin/orders.html", "admin/app.js", "admin/shared.js", "admin/operations.js",
      "supabase/functions/order-sync/index.ts", "supabase/functions/order-track/index.ts",
      "supabase/functions/order-security-admin/index.ts"
    ],
    tables: ["orders", "order_items", "customers", "admin_shipments", "admin_finance_entries", "order_security_reviews", "order_security_signals"],
    functions: ["order-sync", "order-track", "order-security-admin"],
    tests: ["scripts/admin-phase12-check.mjs", "scripts/architecture-check.mjs"],
    guardrails: ["Preserve order states, HF order numbers, saved totals and admin MFA access.", "Do not change customer visibility or financial ledger references casually.", "Never delete or mutate orders through a broad unfiltered operation."]
  },
  courier: {
    title: "Courier integrations",
    purpose: "Steadfast, Pathao and REDX validation, booking, cancellation and shipment state.",
    readFirst: ["admin/operations.js", "supabase/functions/courier-integration/index.ts"],
    files: [
      "admin/operations.html", "admin/operations.js", "admin/app.js",
      "supabase/functions/courier-integration/index.ts",
      "supabase/functions/courier-fraud-check/index.ts"
    ],
    tables: ["orders", "order_items", "admin_shipments", "courier_customer_history_cache", "order_security_signals", "order_security_reviews"],
    functions: ["courier-integration", "courier-fraud-check"],
    tests: ["scripts/admin-phase12-check.mjs", "scripts/architecture-check.mjs"],
    guardrails: ["A booking may create a real parcel; preserve the confirmation and idempotency checks.", "Never automatically retry an uncertain booking.", "Keep provider-specific field limits, area/store validation and COD matching.", "Compare Production Function source before editing or deployment."]
  },
  tracking: {
    title: "Analytics and conversion tracking",
    purpose: "First-party event collection, GA4/Meta event routing, deduplication and admin settings.",
    readFirst: ["admin/tracking.js", "supabase/functions/analytics-ingest/index.ts"],
    files: [
      "admin/tracking.html", "admin/tracking.js", "js/main.js", "js/live-catalog.js",
      "supabase/functions/analytics-ingest/index.ts"
    ],
    tables: ["analytics_events", "tracking_event_settings", "tracking_runtime_settings", "meta_event_delivery_log"],
    functions: ["analytics-ingest"],
    tests: ["scripts/admin-phase12-check.mjs", "scripts/architecture-check.mjs"],
    guardrails: ["Preserve event names, event IDs, purchase deduplication and revenue/order IDs.", "Do not emit a browser Purchase and server Purchase twice.", "Keep secrets and access tokens server-side."]
  },
  facebook: {
    title: "Facebook publishing and Meta Ads",
    purpose: "Page connection, publishing queue, post dispatch and read-only ads review.",
    readFirst: ["admin/facebook-publishing.js", "supabase/functions/facebook-publishing/index.ts"],
    files: [
      "admin/facebook-publishing.html", "admin/facebook-publishing.js",
      "admin/meta-ads-review.html", "admin/meta-ads-review.js",
      "supabase/functions/facebook-publishing/index.ts",
      "supabase/functions/post-dispatcher/index.ts",
      "supabase/functions/meta-ads-review/index.ts"
    ],
    tables: ["facebook_page_accounts", "post_queue", "meta_ads_oauth_states", "meta_ads_review_connection", "meta_ads_review_accounts"],
    functions: ["facebook-publishing", "post-dispatcher", "meta-ads-review"],
    tests: ["scripts/architecture-check.mjs"],
    guardrails: ["Preserve existing OAuth redirect, state validation and token encryption.", "Do not add write permissions to the read-only Meta Ads review integration.", "Do not store media blobs on the server when direct upload is intended."]
  },
  youtube: {
    title: "YouTube publishing",
    purpose: "OAuth connection, direct upload, Shorts/video metadata, thumbnail and publish history.",
    readFirst: ["admin/youtube-publishing.js", "supabase/functions/youtube-publishing/index.ts"],
    files: [
      "admin/youtube-publishing.html", "admin/youtube-publishing.js",
      "supabase/functions/youtube-publishing/index.ts"
    ],
    tables: ["youtube_connected_accounts", "youtube_oauth_states", "youtube_publish_history", "youtube_community_drafts"],
    functions: ["youtube-publishing"],
    tests: ["scripts/architecture-check.mjs"],
    guardrails: ["Preserve direct browser-to-YouTube upload and keep video files out of Supabase storage.", "Preserve MFA, OAuth state, encrypted refresh tokens and channel scope checks.", "Do not change Shorts/description/file validation without tests."]
  },
  messaging: {
    title: "WhatsApp and Messenger",
    purpose: "Conversation inbox, outbound messages and provider webhooks.",
    readFirst: ["admin/messenger.js", "admin/messages.js"],
    files: [
      "admin/messages.html", "admin/messenger.html", "admin/messages.js", "admin/messenger.js",
      "supabase/functions/whatsapp-send/index.ts", "supabase/functions/whatsapp-webhook/index.ts",
      "supabase/functions/messenger-send/index.ts", "supabase/functions/messenger-webhook/index.ts"
    ],
    tables: ["messaging_contacts", "messaging_conversations", "messaging_messages", "whatsapp_connected_accounts"],
    functions: ["whatsapp-send", "whatsapp-webhook", "messenger-send", "messenger-webhook"],
    tests: ["scripts/architecture-check.mjs"],
    guardrails: ["Preserve provider webhook verification and message idempotency.", "Keep phone numbers and message content out of public logs.", "Do not expose provider tokens in browser code."]
  },
  site_publishing: {
    title: "Website publishing and change history",
    purpose: "Admin-managed site content, GitHub publishing, change sets and rollback.",
    readFirst: ["admin/website-publisher.js", "supabase/functions/site-publisher/index.ts"],
    files: [
      "admin/website-publisher.html", "admin/website-publisher.js",
      "supabase/functions/site-publisher/index.ts", "js/admin-cms.js", "js/cms-product.js"
    ],
    tables: ["site_change_sets", "site_change_files", "site_content_blocks"],
    functions: ["site-publisher"],
    tests: ["scripts/architecture-check.mjs"],
    guardrails: ["Preserve preview, approval, publish and rollback workflow.", "Never publish arbitrary paths or unreviewed user-controlled code.", "Keep GitHub tokens exclusively in server secrets."]
  }
};

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const listMode = args.includes("--list");
const target = args.find((arg) => !arg.startsWith("--"));

if (checkMode) {
  const missing = [];
  for (const [key, feature] of Object.entries(FEATURES)) {
    for (const file of feature.files) {
      if (!existsSync(resolve(process.cwd(), file))) missing.push(`${key}: ${file}`);
    }
  }
  if (missing.length) {
    console.error("Feature context map has missing paths:");
    for (const item of missing) console.error(` - ${item}`);
    process.exitCode = 1;
  } else {
    console.log(`Feature context map passed: ${Object.keys(FEATURES).length} features and ${Object.values(FEATURES).reduce((n, f) => n + f.files.length, 0)} verified file references.`);
  }
} else if (listMode || !target || target === "--help") {
  console.log("Usage: node scripts/feature-context.mjs <feature> | --list | --check");
  console.log("\nFeatures:");
  for (const [key, feature] of Object.entries(FEATURES)) console.log(` - ${key.padEnd(18)} ${feature.title}`);
  console.log("\nUse --check in CI to verify that every indexed path still exists.");
} else {
  const feature = FEATURES[target];
  if (!feature) {
    console.error(`Unknown feature: ${target}`);
    console.error(`Available features: ${Object.keys(FEATURES).join(", ")}`);
    process.exitCode = 2;
  } else {
    console.log(`FEATURE: ${feature.title}\n`);
    console.log(`PURPOSE\n${feature.purpose}\n`);
    console.log(`READ FIRST\n${feature.readFirst.map((file) => `- ${file}`).join("\n")}\n`);
    console.log(`RELATED FILES\n${feature.files.map((file) => `- ${file}`).join("\n")}\n`);
    console.log(`DATABASE TABLES\n${feature.tables.map((table) => `- ${table}`).join("\n")}\n`);
    console.log(`EDGE FUNCTIONS\n${(feature.functions.length ? feature.functions : ["None identified"]).map((name) => `- ${name}`).join("\n")}\n`);
    console.log(`CHECKS\n${feature.tests.map((file) => `- node ${file}`).join("\n")}\n`);
    console.log(`GUARDRAILS\n${feature.guardrails.map((rule) => `- ${rule}`).join("\n")}`);
    const missing = feature.files.filter((file) => !existsSync(resolve(process.cwd(), file)));
    if (missing.length) {
      console.error(`\nWARNING: Missing indexed paths: ${missing.join(", ")}`);
      process.exitCode = 1;
    }
  }
}

import { classifyCustomerIntent } from "../supabase/functions/customer-care-chat/policy.mjs";
import { extractTrackingOrderId, extractTrackingPhone, getOrderTrackingCredentials, isOrderTrackingRequest, normalizeTrackingPhone } from "../supabase/functions/customer-care-chat/tracking.mjs";
import { rankProductCandidates, extractConversationState, extractImageMatch, applyConfidencePolicy, normalizeText } from "../supabase/functions/customer-care-chat/intelligence.mjs";
import fs from "node:fs";
import assert from "node:assert/strict";

const main = fs.readFileSync("js/main.js", "utf8");
const chat = fs.readFileSync("js/customer-care-chat.js", "utf8");
const css = fs.readFileSync("css/customer-care-chat.css", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const edge = fs.readFileSync("supabase/functions/customer-care-chat/index.ts", "utf8");
const aiConversations = fs.readFileSync("admin/ai-conversations.js", "utf8");
const aiConversationsPage = fs.readFileSync("admin/ai-conversations.html", "utf8");
const customerIdentityMigration = fs.readFileSync("supabase/migrations/20261104120726_link_ai_conversations_to_customer_profiles.sql", "utf8");
const intelligence = fs.readFileSync("supabase/functions/customer-care-chat/intelligence.mjs", "utf8");
const analyticsIngest = fs.readFileSync("supabase/functions/analytics-ingest/index.ts", "utf8");
const knowledgeAdmin = fs.readFileSync("admin/ai-knowledge.js", "utf8");
const knowledgePage = fs.readFileSync("admin/ai-knowledge.html", "utf8");
const analyticsPage = fs.readFileSync("admin/analytics.html", "utf8");
const adminApp = fs.readFileSync("admin/app.js", "utf8");
const stageTwoMigration = fs.readFileSync("supabase/migrations/20261103143000_ai_customer_intelligence_stage_two.sql", "utf8");
const golden = JSON.parse(fs.readFileSync("scripts/customer-care-intelligence-golden.json", "utf8"));

assert.equal(extractTrackingOrderId("Track my order HF-484590"), "HF-484590");
assert.equal(extractTrackingOrderId("অর্ডার HF-১২৩৪"), "HF-1234");
assert.equal(extractTrackingOrderId("পুরোনো অর্ডার HF-2026110312345-123"), "HF-2026110312345-123");
assert.equal(extractTrackingOrderId("legacy HF-20261103-99AE9EBB99"), "HF-20261103-99AE9EBB99");
assert.equal(extractTrackingPhone("আমার নম্বর ০১৮৪২০৩১১৬৪"), "01842031164");
assert.equal(extractTrackingPhone("+880 1700-000000"), "01700000000");
assert.equal(normalizeTrackingPhone("8801700000000"), "01700000000");
assert.equal(isOrderTrackingRequest("আমি একটা পণ্য ট্র্যাক করতে চাই"), true);
assert.equal(isOrderTrackingRequest("where is my package"), true);
assert.equal(isOrderTrackingRequest("ডেলিভারি স্ট্যাটাস কী"), true);
assert.equal(isOrderTrackingRequest("HF-484590", [{role:"user",text:"I want to track my product"}]), true);
assert.equal(isOrderTrackingRequest("HF-484590", [{role:"assistant",text:"track this order"}]), false);
assert.deepEqual(
  getOrderTrackingCredentials("আমার নম্বর 01700000000", [{role:"user",text:"Please track order HF-484590"}]),
  {orderId:"HF-484590",mobile:"01700000000"}
);
assert.match(edge, /from "\.\/tracking\.mjs"/);
assert.match(edge, /getOrderTrackingCredentials\(message, historyInput\)/);
assert.match(edge, /source: "in\.\(website,website_parallel,manual_phone\)"/);
assert.match(edge, /activeTracking/);
assert.match(edge, /bookingState === "succeeded"/);
assert.match(edge, /shipmentStatus !== "cancelled"/);
assert.match(edge, /STRICT PRIVATE-DATA BOUNDARY/);
assert.match(edge, /PUBLIC KNOWLEDGE ACCESS/);
assert.match(edge, /parts\.join\("\\n"\)/);


assert.match(main, /js\/customer-care-chat\.js\?v=\d{8}-[a-z0-9-]+/);
assert.match(chat, /functions\/v1\/customer-care-chat/);
assert.doesNotMatch(chat, /ageConfirmed|hf-ai-chat-age-gate|hf-ai-age-confirm|প্রাপ্তবয়স্কদের জন্য AI সহায়তা/);
assert.match(chat, /if \(\(!text && !imageFile\) \|\| busy\) return;/);
assert.match(chat, /cleanAssistantText/);
assert.doesNotMatch(chat, /আমি নিশ্চিত করছি, আমার বয়স ১৮ বছর বা তার বেশি|১৮ বছর বা তার বেশি/);
assert.match(chat, /GEMINI_QUOTA/);
assert.doesNotMatch(chat, /RATE_LIMITED|status === 429/);
assert.doesNotMatch(chat, /status === 429\) return "আপনি অল্প সময়ে অনেকগুলো প্রশ্ন পাঠিয়েছেন/);
assert.match(chat, /উত্তর তৈরি হচ্ছে/);
assert.doesNotMatch(chat, /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}/, "Gemini API credentials must never reach storefront code");
assert.match(edge, /Deno\.env\.get\("GEMINI_API_KEY"\)/);
assert.match(edge, /Deno\.env\.get\("GEMINI_MODEL"\)/);
assert.match(edge, /isSecretKey: legacyKey\.startsWith\("sb_secret_"\)/);
assert.match(edge, /class SupabaseRestError/);
assert.match(edge, /customer_care_conversation_user_saved/);
assert.match(edge, /async function verifyCustomerIdentity/);
assert.match(edge, /customer_user_id/);
assert.match(edge, /customer_profile_updated_at/);
assert.match(edge, /customer_profiles/);
assert.match(chat, /function getCustomerAuthorizationHeaders/);
assert.match(chat, /session\.access_token/);
assert.match(aiConversations, /function customerDisplayName/);
assert.match(aiConversations, /customerAvatarMarkup/);
assert.match(aiConversationsPage, /id="aicThreadAvatar"/);
assert.match(aiConversationsPage, /20261104-aiconversations-v6/);
assert.match(customerIdentityMigration, /customer_user_id uuid/);
assert.match(customerIdentityMigration, /customer_name text/);
assert.match(customerIdentityMigration, /customer_avatar_url text/);
assert.match(customerIdentityMigration, /ai_customer_care_conversations_store_customer_user_uidx/);

assert.match(edge, /customer_care_conversation_assistant_saved/);
assert.match(edge, /assistantMessageSaved/);
assert.match(edge, /x-goog-api-key/);
assert.doesNotMatch(edge, /ageConfirmed !== true|ADULT_CONFIRMATION_REQUIRED/);
assert.doesNotMatch(edge, /checkRateLimit|getClientKey|RATE_LIMIT =/);
assert.match(edge, /AbortController/);
assert.match(edge, /ALLOWED_ORIGIN/);
assert.match(edge, /origin !== ALLOWED_ORIGIN/);
assert.match(edge, /generateContent/);
assert.match(edge, /selectCustomerCareModel/);
assert.match(edge, /gemini-3\.8-flash/);
assert.match(edge, /gemini-3\.6-flash/);
assert.doesNotMatch(edge, /gemini-3\.7-flash/);
assert.match(edge, /gemini-3\.6-flash/);
assert.match(edge, /callGeminiOnce/);
assert.match(edge, /isBroadCatalogQuestion/);
assert.match(edge, /isTestOrPlaceholderProduct/);
assert.match(edge, /customer_care_single_model_attempt/);
assert.match(edge, /if \(status === 429\) return "GEMINI_QUOTA"/);
assert.match(edge, /if \(status >= 500\) return "GEMINI_UNAVAILABLE"/);
assert.match(edge, /isCompleteReply/);
assert.match(edge, /gemini-3\.5-flash-lite/);
assert.doesNotMatch(edge, /gemini-3\.1-flash-lite/);

assert.match(edge, /buildDeterministicFallbackReply/);
assert.match(edge, /customer_care_verified_knowledge_fallback/);
assert.match(edge, /hany|honey/);
assert.match(edge, /Hello! Welcome to Halal Food/);
assert.match(edge, /Of course, I can help with that/);
assert.match(edge, /ওয়ালাইকুম আসসালাম/);
assert.match(edge, /ageRestricted: false/);
assert.match(edge, /analyzeCustomerNeed/);
assert.match(edge, /budgetMatchedCount/);
assert.match(edge, /publicProductCards/);
assert.match(edge, /CUSTOMER NEED PROFILE/);
assert.match(chat, /appendProductCards/);
assert.match(chat, /hf-ai-product-card/);
assert.match(chat, /innerHTML = "অর্ডার<br>করুন"/);
assert.match(chat, /setAttribute\("aria-label", "অর্ডার করুন"\)/);
assert.doesNotMatch(chat, /অর্ডার নিন|পণ্যের পেজ/);
assert.match(chat, /actions\.append\(details, order\)/);
assert.match(css, /flex-wrap:\s*nowrap!important/);
assert.match(css, /background:\s*#c97b3d!important/);
assert.match(css, /min-height:48px!important/);
assert.match(css, /flex:1.22 1 0!important/);
assert.match(css, /padding:6px 8px!important/);
assert.doesNotMatch(css, /\.hf-ai-product-card-actions button:last-child\{[^}]*background:#2b2a3d!important/s);
assert.match(chat, /hf-ai-chat-view/);
assert.match(chat, /data-hf-product-view/);
assert.match(chat, /data-hf-product-order/);
assert.match(chat, /requestChatQuote/);
assert.match(chat, /বর্তমান মূল্য যাচাই করা যাচ্ছে না/);
assert.match(chat, /functions\/v1\/order-sync/);
assert.match(chat, /turnstileToken/);
assert.match(chat, /chatCheckoutStartedAt/);
assert.match(chat, /AbortSignal\.timeout\(12000\)/);
assert.match(chat, /trackChatEvent\("view_item"/);
assert.match(chat, /trackChatEvent\("view_cart"/);
assert.match(chat, /price_value != null \? item.price_value/);
assert.match(chat, /গোপনীয়তা নীতি/);
assert.match(chat, /renderCart\(false\)/);
assert.match(chat, /trackChatEvent\("remove_from_cart"/);
assert.match(css, /has-shopping-view \.hf-ai-chat-footnote/);
assert.match(edge, /payload\.action === "quote"/);
assert.match(edge, /price_value/);
assert.match(fs.readFileSync("supabase/functions/order-sync/index.ts", "utf8"), /expectedSubtotal/);
assert.match(edge, /verified-knowledge-fallback/);
assert.doesNotMatch(chat, /textarea id="hf-ai-chat-input"[^>]*maxlength=/);
assert.match(edge, /customer_care_incomplete_response_retry/);
assert.match(edge, /INCOMPLETE_AI_RESPONSE/);
assert.match(chat, /INCOMPLETE_AI_RESPONSE/);
assert.doesNotMatch(edge, /console\.(log|error)\([^)]*message/);
assert.match(css, /\.hf-ai-chat-panel\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(css, /@media \(max-width: 900px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /hf-ai-chat-age-gate|hf-ai-age-confirm|hf-ai-age-support/);
assert.match(css, /\.hf-ai-product-cards/);
assert.match(home, /id="hf-contact-widget"/);
assert.match(home, /id="hf-contact-launcher"/);
const aiKnowledge = fs.readFileSync("admin/ai-knowledge.js", "utf8");
const aiKnowledgePage = fs.readFileSync("admin/ai-knowledge.html", "utf8");
const adminShell = fs.readFileSync("admin/shared.js", "utf8");
const aiKnowledgeMigration = fs.readFileSync("supabase/migrations/20261103120000_ai_customer_care_stage_two_admin_access.sql", "utf8");
assert.match(aiKnowledgePage, /data-page="ai-knowledge"/);
assert.match(aiKnowledge, /ai_knowledge_documents/);
assert.match(aiKnowledge, /ai_product_knowledge/);
assert.match(aiKnowledge, /verified_claims/);
assert.match(aiKnowledge, /customer_fit/);
assert.match(aiKnowledge, /source_notes/);
assert.match(adminShell, /AI Knowledge Center/);
assert.match(aiKnowledgeMigration, /aal.*aal2/);
assert.match(aiKnowledgeMigration, /halalfoodbd\.official@gmail\.com/);

assert.doesNotMatch(chat, /serverCheckStarted|সংযুক্ত ·|appendHumanSupport|humanRequest/);
assert.match(chat, /cleanAssistantText/);
assert.match(edge, /Do not volunteer phone numbers/);
assert.match(edge, /secure in-chat product cards/);
assert.match(edge, /human customer care is available/);
assert.match(main, /first_party_metadata/);
assert.match(fs.readFileSync("supabase/functions/analytics-ingest/index.ts", "utf8"), /interactionSource === "ai_chat"/);
assert.doesNotMatch(edge, /demo project|ডেমো প্রকল্প|ডেমো\/টেস্ট/);
assert.doesNotMatch(edge, /\*\*/);
console.log("Customer-care friendly conversation checks passed.");
assert.match(edge, /classifyCustomerIntent/);
assert.match(edge, /resolveCustomerOrderTracking/);
assert.match(edge, /fetchSupabaseRows\("blog_posts"/);
assert.match(edge, /PUBLISHED PUBLIC WEBSITE ARTICLES/);
assert.match(edge, /publishedArticles/);
assert.match(edge, /server-order-tracking/);
assert.match(edge, /admin_shipments/);
assert.match(edge, /order_number/);
assert.match(edge, /recommendation_permission/);
assert.match(edge, /buildRecommendationContract/);
assert.match(edge, /SERVER-ENFORCED RECOMMENDATION POLICY/);
assert.match(edge, /max_product_cards/);
assert.match(edge, /rejection_context/);
assert.match(chat, /appendProductCards\(answerBubble, data.products, data.recommendation/);
assert.match(chat, /safeLimit/);
assert.doesNotMatch(chat, /products\.slice\(0, 4\)/);
assert.match(edge, /real operating business/);
assert.match(chat, /conversation.length > 40/);

assert.match(edge, /MAX_HISTORY_ITEMS = 20/);
assert.match(edge, /MAX_HISTORY_CHARS = 48000/);
assert.match(edge, /MAX_REQUEST_BYTES = 262144/);
assert.doesNotMatch(edge, /MAX_MESSAGE_CHARS/);
assert.match(chat, /history: imageFile \? \[\] : conversation\.slice\(-20\)/);

assert.match(edge, /maxOutputTokens: 8192/);
assert.match(edge, /thinkingConfig: \{ thinkingLevel: "HIGH" \}/);
assert.match(edge, /45_000/);
assert.ok(edge.includes("return Boolean(reply.trim())"));
assert.match(main, /customer-care-chat\.js\?v=\d{8}-[a-z0-9-]+/);

assert.match(chat, /textarea id="hf-ai-chat-input"/);
assert.match(chat, /messages.addEventListener\("wheel"/);
assert.match(chat, /hf-ai-chat-new/);
assert.match(chat, /hf-ai-chat-minimize/);
assert.match(css, /width:min\(520px/);
assert.match(css, /\.hf-ai-chat-view\[hidden\]/);
assert.match(css, /hf-ai-checkout-form/);
assert.match(css, /height:min\(760px/);
assert.match(css, /overscroll-behavior-y:contain/);
assert.match(css, /touch-action:pan-y/);

assert.match(chat, /hf-ai-chat-attach/);
assert.match(chat, /prepareImageForUpload/);
assert.match(chat, /requestBody\.image/);
assert.match(chat, /SpeechRecognition/);
assert.match(chat, /speechRecognition\.interimResults = false/);
assert.match(edge, /MAX_IMAGE_BASE64_CHARS = 190000/);
assert.match(edge, /payload\.image/);
assert.match(edge, /inlineData/);
assert.match(edge, /imageSearch/);
assert.match(edge, /INVALID_IMAGE/);
assert.match(css, /hf-ai-chat-attachment-preview/);
assert.match(css, /hf-ai-chat-mic/);

const intentCases = [
  ["একটা সরিষার তেল দেখাও", "exact_product_lookup", 1],
  ["I want to order mustard oil", "exact_product_lookup", 1],
  ["কী কী তেল পাওয়া যায়", "category_browse", 4],
  ["তেলগুলো দেখাও", "category_browse", 4],
  ["সরিষার তেলের দাম কত?", "product_price_inquiry", 0],
  ["ডেলিভারি কত?", "store_policy_question", 0],
  ["ধন্যবাদ", "casual_conversation", 0],
  ["can you track this prodack", "order_support", 0],
  ["আমার অর্ডার করা এই পণ্য টাকে ট্র্যাক করতে হবে", "order_support", 0],
  ["কয়েকটি ঘি সাজেস্ট করো", "recommendation_request", 4],
  ["অন্যটা দেখাও", "recommendation_request", 4],
  ["এই ঘিগুলোর তুলনা করো", "product_comparison", 2],
];
for (const [query, expectedIntent, expectedCards] of intentCases) {
  const decision = classifyCustomerIntent(query);
  assert.equal(decision.primary_intent, expectedIntent, query);
  assert.equal(decision.max_product_cards, expectedCards, query);
}
const imageOnly = classifyCustomerIntent("", true);
assert.equal(imageOnly.primary_intent, "image_product_search");
assert.equal(imageOnly.max_product_cards, 1);
const imageSimilar = classifyCustomerIntent("এই নারিকেলের ছবির মতো তেল আছে?", true);
assert.equal(imageSimilar.primary_intent, "image_similar_product_search");
assert.equal(imageSimilar.max_product_cards, 3);
const imageMaterial = classifyCustomerIntent("নারিকেলের তেল আছে?", true);
assert.equal(imageMaterial.primary_intent, "image_material_search");
assert.equal(imageMaterial.max_product_cards, 1);

const rejected = classifyCustomerIntent("এই ঘি চাই না");
assert.equal(rejected.primary_intent, "ambiguous_product_request");
assert.equal(rejected.max_product_cards, 0);

assert.match(edge, /from "\.\/intelligence\.mjs"/);
assert.match(edge, /rankProductCandidates/);
assert.match(edge, /extractImageMatch/);
assert.match(edge, /buildCatalogImageParts/);
assert.match(edge, /logAiCustomerCareEvents/);
assert.match(edge, /HF_IMAGE_MATCH/);
assert.match(edge, /suppressed_rejected_product_count/);
assert.match(chat, /appendProductCards\(bubble, products, maxCards, matchType\)/);
assert.match(chat, /const safeLimit = Math\.min\(4/);
assert.match(chat, /ai_product_card_shown/);
assert.match(chat, /ai_product_clicked/);
assert.match(main, /ai_product_card_shown/);
assert.match(main, /ai_product_clicked/);
assert.match(analyticsIngest, /ai_intent_detected/);
assert.match(analyticsIngest, /ai_product_clicked/);
assert.match(analyticsIngest, /primary_intent/);
assert.match(knowledgePage, /aiKbSearchSynonyms/);
assert.match(knowledgePage, /aiKbSearchAttributes/);
assert.match(knowledgeAdmin, /search_synonyms/);
assert.match(knowledgeAdmin, /search_attributes/);
assert.match(analyticsPage, /analyticsAiIntelligenceSection/);
assert.match(analyticsPage, /aiAnalyticsIntentBody/);
assert.match(adminApp, /aiAnalyticsConversations/);
assert.match(stageTwoMigration, /search_synonyms text\[\]/);
assert.match(stageTwoMigration, /search_attributes jsonb/);
assert.match(stageTwoMigration, /ai_recommendation_suppressed/);
assert.doesNotMatch(stageTwoMigration, /DROP TABLE|DELETE FROM|TRUNCATE/);
assert.equal(golden.cases.length, 120);
for (const item of golden.cases) {
  const decision = classifyCustomerIntent(item.message, item.has_image);
  assert.equal(decision.primary_intent, item.expected_intent, item.message || "[image only]");
  assert.equal(decision.max_product_cards, item.expected_max_cards, item.message || "[image only]");
}

const catalogFixtures = [
  {id:"p1",name:"Pure Mustard Oil (Sorisha Tel)",slug:"mustard-oil",category:"Oil",category_slug:"oil",is_active:true,unit_type:"1L",price:950},
  {id:"p2",name:"Virgin Coconut Oil",slug:"coconut-oil",category:"Oil",category_slug:"oil",is_active:true,unit_type:"500ml",price:650},
  {id:"p3",name:"Pure Cow Ghee",slug:"cow-ghee",category:"Ghee",category_slug:"ghee",is_active:true,unit_type:"500g",price:1200},
  {id:"p4",name:"Black Seed Honey",slug:"black-seed-honey",category:"Honey",category_slug:"honey",is_active:true,unit_type:"1kg",price:800},
  {id:"p5",name:"Basmati Rice",slug:"basmati-rice",category:"Dry Food",category_slug:"dry-food",is_active:true,unit_type:"1kg",price:850},
  {id:"p6",name:"Inactive Mustard Oil",slug:"inactive-oil",category:"Oil",category_slug:"oil",is_active:false,unit_type:"1L",price:500},
  {id:"p7",name:"Ghee Test Product 7",slug:"ghee-test-product-7",category:"Ghee",category_slug:"ghee",is_active:true,unit_type:"500g",price:10}
];
const verifiedProfiles = [
  {product_id:"p2",status:"published",search_synonyms:["narkel tel","coconut tel"],product_form:"liquid",derived_from:["coconut"],related_terms:["cooking"],brand:"Verified Coconut Brand",packaging_type:"glass bottle",visual_description:"clear glass bottle with white label",size_label:"500ml",search_attributes:{usage:["cooking"],material:["coconut"]}},
  {product_id:"p3",status:"published",search_synonyms:["gawa ghi"],product_form:"semi-solid",derived_from:["milk fat"],related_terms:["cooking","dessert"],brand:"Verified Ghee Brand",packaging_type:"jar",visual_description:"golden ghee in a sealed jar",size_label:"500g",search_attributes:{usage:["cooking","dessert"]}},
  {product_id:"p4",status:"published",search_synonyms:["kalo jira modhu"],product_form:"liquid",derived_from:["honey"],related_terms:["sweetener"],brand:null,packaging_type:"jar",visual_description:"dark honey in a glass jar",size_label:"1kg",search_attributes:{taste:["sweet"]}}
];
assert.match(normalizeText("বাংলা ১০০০ টাকা"), /বাংলা 1000 টাকা/);
assert.equal(rankProductCandidates(catalogFixtures, [], "সরিষার তেল", {primary_intent:"exact_product_lookup"})[0].product.slug, "mustard-oil");
assert.equal(rankProductCandidates(catalogFixtures, [], "Sorishar Tel", {primary_intent:"exact_product_lookup"})[0].product.slug, "mustard-oil");
assert.equal(rankProductCandidates(catalogFixtures, [], "নারিকেল তেল", {primary_intent:"exact_product_lookup"})[0].product.slug, "coconut-oil");
assert.equal(rankProductCandidates(catalogFixtures, [], "ঘি", {primary_intent:"exact_product_lookup"})[0].product.slug, "cow-ghee");
assert.ok(rankProductCandidates(catalogFixtures, [], "কী কী তেল আছে", {primary_intent:"category_browse"}).every(item => item.product.category_slug === "oil"));
assert.equal(rankProductCandidates(catalogFixtures, [], "dragonfruit juice", {primary_intent:"exact_product_lookup"}).length, 0);
assert.ok(!rankProductCandidates(catalogFixtures, [], "inactive mustard oil", {primary_intent:"exact_product_lookup"}).some(item => item.product.slug === "inactive-oil"));
assert.ok(!rankProductCandidates(catalogFixtures, [], "ghee", {primary_intent:"exact_product_lookup"}).some(item => item.product.slug === "ghee-test-product-7"));
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "kalo jira modhu", {primary_intent:"exact_product_lookup"})[0].product.slug, "black-seed-honey");
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "নারিকেল তেল jar", {primary_intent:"exact_product_lookup"}).some(item => item.product.slug === "coconut-oil"), false);
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "নারিকেল তেল 500ml", {primary_intent:"exact_product_lookup"})[0].product.slug, "coconut-oil");
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "oil", {primary_intent:"category_browse",pack_preference:"small"})[0].product.slug, "coconut-oil");
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "oil", {primary_intent:"category_browse",pack_preference:"large"})[0].product.slug, "mustard-oil");
assert.equal(rankProductCandidates(catalogFixtures, verifiedProfiles, "brand UnknownBrand coconut oil", {primary_intent:"exact_product_lookup"}).length, 0);
assert.ok(rankProductCandidates(catalogFixtures, verifiedProfiles, "cooking", {primary_intent:"general_information"}).some(item => item.product.slug === "coconut-oil"));
const state = extractConversationState("এখন ২০০০ টাকার মধ্যে উপহারের জন্য বড় প্যাক চাই", [{role:"user",parts:[{text:"আগে ১০০০ টাকার মধ্যে রান্নার জন্য ছোট প্যাক চাই"}]}]);
assert.equal(state.budget_bdt, 2000);
assert.equal(state.purpose, "gift");
assert.equal(state.pack_preference, "large");
assert.equal(extractConversationState("এইটা চাই না", []).rejection_detected, true);
assert.equal(extractConversationState("না, আমি অন্য পণ্য বলেছি", []).correction_detected, true);
const parsedImage = extractImageMatch('Matched. [[HF_IMAGE_MATCH]]{"candidate_slug":"coconut-oil","candidate_slugs":["coconut-oil"],"match_type":"exact","confidence":"high"}[[/HF_IMAGE_MATCH]]');
assert.equal(parsedImage.reply, "Matched.");
assert.equal(parsedImage.imageMatch.candidate_slug, "coconut-oil");
const imageCandidates = rankProductCandidates(catalogFixtures, verifiedProfiles, "নারিকেল তেল", {primary_intent:"image_product_search",image_search:true});
const similarCandidates = rankProductCandidates(catalogFixtures, verifiedProfiles, "oil", {primary_intent:"image_similar_product_search",image_search:true});
assert.equal(applyConfidencePolicy(imageCandidates, {primary_intent:"image_product_search",max_product_cards:1}, {candidate_slug:"coconut-oil",match_type:"exact",confidence:"high"}).length, 1);
assert.equal(applyConfidencePolicy(imageCandidates, {primary_intent:"image_product_search",max_product_cards:1}, {candidate_slug:"coconut-oil",match_type:"exact",confidence:"low"}).length, 0);
assert.equal(applyConfidencePolicy(similarCandidates, {primary_intent:"image_similar_product_search",max_product_cards:3}, {candidate_slugs:["coconut-oil","mustard-oil"],match_type:"similar",confidence:"medium"}).length, 2);
console.log("Stage 2 customer-intelligence regression checks passed.");

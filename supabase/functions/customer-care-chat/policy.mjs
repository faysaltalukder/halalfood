function classifyCustomerIntent(message, hasImage = false) {
  const toDigits = (value) => value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  const text = toDigits(String(message || "").normalize("NFKC")).toLowerCase().trim();
  const hasCategory = /(ঘি|ghee|মধু|honey|বাদাম|nuts?|almond|তেল|oil|চাল|rice|মসলা|মশলা|masala|spice|খেজুর|dates?|চা|tea|মাংস|গরু|beef|meat|chicken|মুরগি|ডাল|lentils?|chickpeas?|ছোলা|toor|arhar|ড্রাই\s*ফুড|dry\s*food)/iu.test(text);
  const broad = /(কী\s*কী\s*পণ্য|কি\s*কি\s*পণ্য|কোন\s*কোন\s*পণ্য|সব\s*পণ্য|পণ্যের\s*তালিকা|ক্যাটালগ|catalog|product\s*list|list\s*(all\s*)?products|what\s+products|which\s+products|available\s+products)/iu.test(text);
  const comparison = /(তুলনা|পার্থক্য|তফাৎ|দুটোর মধ্যে|দুটির মধ্যে|compare|comparison|difference|versus|\bvs\b)/iu.test(text);
  const recommendation = /(সাজেস্ট|সাজেশন|পরামর্শ|recommend|suggest|কোনটা.{0,30}ভালো|কোনটি.{0,30}ভালো|আমার জন্য.{0,30}(?:ভালো|উপযুক্ত)|কোনটা নেব|কোনটি নেব|কি নেব|কী নেব|কী নিতে পারি|কি নিতে পারি|বাজেট.{0,30}(?:মধ্যে|ভিতরে)|within.{0,20}budget|under.{0,20}budget|আরেকটা দেখাও|আরও একটি দেখাও|আরেকটি বিকল্প|অন্যটা দেখাও)/iu.test(text);
  const price = /(দাম|মূল্য|কত টাকা|কত দাম|price|cost|how much)/iu.test(text);
  const categoryBrowse = hasCategory && /(কী\s*কী|কি\s*কি|কোন\s*কোন|কয়েকটি|কিছু|সবগুলো|তালিকা|\p{L}+(?:গুলো|গুলি)|what .{0,40}(?:oil|ghee|honey|rice|tea|product)|what (?:kind|types|kinds)|show me (?:some|all|the)?\s*(?:oils?|ghee|honey|products?)|list)/iu.test(text);
  const availability = /(স্টকে|মজুত|উপলভ্য|available|in stock|আছে কি না|আছে কিনা|do you have|have you got)/iu.test(text) && !categoryBrowse;
  const storePolicy = /(ডেলিভারি|delivery|পেমেন্ট|payment|ক্যাশ অন ডেলিভারি|cash on delivery|রিফান্ড|refund|রিটার্ন|return policy|কাজের সময়|খোলা থাকে|যোগাযোগের নম্বর)/iu.test(text);
  const orderSupport = /(অর্ডারের অবস্থা|অর্ডার কোথায়|অর্ডার কোথায়|অর্ডার ট্র্যাক|ট্র্যাক.*অর্ডার|আমার অর্ডার|order status|track order|my order|shipment|শিপমেন্ট|কুরিয়ার|courier|checkout)/iu.test(text);
  const complaint = /(অভিযোগ|সমস্যা হয়েছে|সমস্যা হয়েছে|ভুল হয়েছে|ভুল হয়েছে|খারাপ অভিজ্ঞতা|complain|complaint|issue|damaged|ভাঙা পণ্য)/iu.test(text);
  const humanSupport = /(মানুষের সঙ্গে কথা|মানুষের সাথে কথা|কাস্টমার কেয়ার|কাস্টমার কেয়ার|লাইভ এজেন্ট|মানব সহায়তা|মানব সহায়তা|human support|talk to (?:a )?(?:person|human|agent))/iu.test(text);
  const casual = /^(হ্যালো|হাই|আসসালামু আলাইকুম|সালাম|ধন্যবাদ|অনেক ধন্যবাদ|hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)[!.\s]*$/iu.test(text);
  const info = /(কীভাবে|কিভাবে|কেন|কী জিনিস|কি জিনিস|মানে কী|কী দিয়ে তৈরি|কি দিয়ে তৈরি|তৈরি হয়|তৈরি করা হয়|উপকারিতা|ব্যবহার কী|what is|how is|how are|why does|made from|ingredients|benefits of)/iu.test(text);
  const exactLookup = hasCategory && /(একটা|একটি|এক\s|দেখাও|দেখতে চাই|আছে|পাওয়া|পাওয়া|খুঁজছি|চাই|show|find|available|do you have|want|buy|purchase|order)/iu.test(text);
  const rejection = /(চাই না|পছন্দ হয়নি|পছন্দ হয়নি|ভালো লাগেনি|এটা নয়|এটা না|ওটা নয়|ভুল পণ্য|not this|don't want|do not want|not interested|wrong product|not what i asked)/iu.test(text);
  let primary = "general_information", permission = "none", maxCards = 0, matchMode = "none", confidence = "medium", clarification = false;
  if (complaint) { primary = "complaint_or_problem"; confidence = "high"; }
  else if (humanSupport) { primary = "human_support_request"; confidence = "high"; }
  else if (storePolicy) { primary = "store_policy_question"; confidence = "high"; }
  else if (orderSupport) { primary = "order_support"; confidence = "high"; }
  else if (casual) { primary = "casual_conversation"; confidence = "high"; }
  else if (rejection) { primary = "ambiguous_product_request"; clarification = true; confidence = "high"; }
  else if (price) { primary = "product_price_inquiry"; confidence = "high"; }
  else if (comparison) { primary = "product_comparison"; permission = "explicit"; maxCards = 4; matchMode = "requested_items"; confidence = "high"; }
  else if (recommendation) { primary = "recommendation_request"; permission = "explicit"; maxCards = 4; matchMode = "ranked_recommendations"; confidence = "high"; }
  else if (broad) { primary = "broad_catalog_browse"; permission = "explicit"; maxCards = 4; matchMode = "broad_catalog"; confidence = "high"; }
  else if (categoryBrowse) { primary = "category_browse"; permission = "explicit"; maxCards = 4; matchMode = "category"; confidence = "high"; }
  else if (availability && hasCategory) { primary = "product_availability_inquiry"; confidence = "high"; }
  else if (info) { primary = "general_information"; confidence = "high"; }
  else if (hasImage && !text) { primary = "ambiguous_product_request"; clarification = true; confidence = "low"; }
  else if (hasImage && /(এর মতো|এটার মতো|এই ধরনের|একই রকম|ছবির মতো|প্যাকেটের মতো|বোতলের মতো|similar|like this|same type)/iu.test(text)) {
    primary = "image_similar_product_search"; permission = "limited"; maxCards = 3; matchMode = "visual_similarity"; confidence = "medium";
  } else if (hasImage && hasCategory && /(নারিকেল|নারকেল|coconut|সরিষা|mustard|দুধ|milk|বাদাম|nut|কাঁচামাল|raw material)/iu.test(text)) {
    primary = "image_material_search"; permission = "limited"; maxCards = 1; matchMode = "derived_product"; confidence = "medium";
  } else if (hasImage && text) {
    primary = "image_product_search"; permission = "limited"; maxCards = 1; matchMode = "exact_or_same_product"; confidence = "medium";
  } else if (exactLookup || hasCategory) {
    primary = "exact_product_lookup"; permission = "limited"; maxCards = 1; matchMode = "exact"; confidence = exactLookup ? "high" : "medium";
  } else if (rejection) {
    primary = "ambiguous_product_request"; clarification = true; confidence = "medium";
  }
  return {
    primary_intent: primary, secondary_intents: primary === "image_material_search" ? ["exact_product_lookup"] : [],
    recommendation_permission: permission, allow_product_cards: maxCards > 0, max_product_cards: maxCards,
    match_mode: matchMode, intent_confidence: confidence, clarification_needed: clarification, rejection_detected: rejection,
    intent: primary === "recommendation_request" ? "recommend" : primary === "product_comparison" ? "compare"
      : primary === "broad_catalog_browse" ? "catalog" : primary === "category_browse" ? "category"
      : primary === "exact_product_lookup" ? "exact" : "general",
  };
}
export { classifyCustomerIntent };

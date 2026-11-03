const GROUPS = [
  { canonical:"mustard oil", category:"oil", aliases:["mustard oil","সরিষার তেল","সরিষা তেল","সরষের তেল","সরিষার তৈল","sorishar tel","shorishar tel","sorisha tel","shorisha tel","mustard tel"] },
  { canonical:"coconut oil", category:"oil", aliases:["coconut oil","নারিকেল তেল","নারকেল তেল","নারিকেলের তেল","নারকেলের তেল","narkel tel","narikel tel","narikeler tel","narkeler tel","coconut tel"] },
  { canonical:"olive oil", category:"oil", aliases:["olive oil","অলিভ অয়েল","অলিভ অয়েল","জলপাই তেল","oliv oil","jolpai tel"] },
  { canonical:"sesame oil", category:"oil", aliases:["sesame oil","তিলের তেল","তিল তেল","til tel","tiler tel","sesame tel"] },
  { canonical:"soybean oil", category:"oil", aliases:["soybean oil","সয়াবিন তেল","সয়াবিন তেল","soyabin tel","soya bean oil"] },
  { canonical:"sunflower oil", category:"oil", aliases:["sunflower oil","সূর্যমুখী তেল","surjomukhi tel"] },
  { canonical:"ghee", category:"ghee", aliases:["ghee","ঘি","গাওয়া ঘি","গাওয়া ঘি","গাওয়া","gawa ghee","gawa ghi","clarified butter"] },
  { canonical:"honey", category:"honey", aliases:["honey","মধু","modhu","modhu"] },
  { canonical:"almonds", category:"nuts-seeds", aliases:["almond","almonds","বাদাম","কাঠবাদাম","kath badam","badam"] },
  { canonical:"cashews", category:"nuts-seeds", aliases:["cashew","cashews","কাজু","কাজুবাদাম","kaju badam","kaju"] },
  { canonical:"pistachios", category:"nuts-seeds", aliases:["pistachio","pistachios","পেস্তা","pesta badam"] },
  { canonical:"walnuts", category:"nuts-seeds", aliases:["walnut","walnuts","আখরোট","akhrot"] },
  { canonical:"dates", category:"dates", aliases:["dates","খেজুর","khejur","khajur"] },
  { canonical:"rice", category:"dry-food", aliases:["rice","চাল","চাউল","chaal","chal"] },
  { canonical:"lentils", category:"dry-food", aliases:["lentil","lentils","ডাল","মসুর ডাল","মসুর","dal","mosur dal"] },
  { canonical:"chickpeas", category:"dry-food", aliases:["chickpea","chickpeas","ছোলা","chola","boot"] },
  { canonical:"tea", category:"tea", aliases:["tea","চা","cha","chai"] },
  { canonical:"masala", category:"special-masala", aliases:["masala","মসলা","মশলা","মসলা মিক্স","মশলা মিক্স","moshla","mosla","spice mix"] },
  { canonical:"beef", category:"fresh-meat", aliases:["beef","গরুর মাংস","গরুর গোশত","gorur mangsho","gorur gosht"] },
  { canonical:"chicken", category:"fresh-meat", aliases:["chicken","মুরগি","মুরগির মাংস","murgi","murgir mangsho"] },
  { canonical:"mutton", category:"fresh-meat", aliases:["mutton","খাসির মাংস","খাসি","khashi","khasir mangsho"] },
  { canonical:"nuts-seeds", category:"nuts-seeds", aliases:["nuts","seeds","বাদাম","বীজ","nuts and seeds","nuts & seeds"] },
  { canonical:"dry-food", category:"dry-food", aliases:["dry food","শুকনো খাবার","শুকনা খাবার","শুকনো খাদ্য"] },
];
const CATEGORY_ALIASES = {
  oil:["oil","তেল","তৈল","tel","tail"],
  ghee:["ghee","ঘি","ghi"],
  honey:["honey","মধু","modhu"],
  "nuts-seeds":["nuts","seeds","বাদাম","বীজ"],
  dates:["dates","খেজুর","khejur","khajur"],
  "dry-food":["dry food","শুকনো খাবার","শুকনা খাবার"],
  tea:["tea","চা","cha"],
  "special-masala":["masala","spice","মসলা","মশলা"],
  "fresh-meat":["meat","মাংস","গোশত","মাংস"],
  "mix-food":["mix","মিশ্র","মিক্স","mix food"],
};
const RELATIONS = [
  {source:["coconut","নারিকেল","নারকেল","narkel","narikel"],target:["coconut oil","নারিকেল তেল","নারকেল তেল"],type:"derived_product"},
  {source:["mustard seed","সরিষা","সরষে","mustard","sorisha"],target:["mustard oil","সরিষার তেল"],type:"derived_product"},
  {source:["milk fat","দুধ","milk"],target:["ghee","ঘি"],type:"related_product"},
];
const STOP = new Set(["ami","amr","amar","apni","apnar","please","plz","the","a","an","is","are","do","you","have","got","want","need","show","me","find","tell","what","which","how","much","price","cost","please","একটা","একটি","আমার","আপনার","আপনি","আমি","কী","কি","কোন","দাম","মূল্য","কত","টাকা","আছে","দেখাও","দেখান","চাই","বলুন","জানান","পণ্য","পন্য"]);
function normalizeText(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase()
    .replace(/[০-৯]/g, d => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/[অ-ঔ]/gu, c => c)
    .replace(/[^\p{L}\p{M}\p{N}\s&-]/gu," ").replace(/\s+/g," ").trim();
}
function tokenize(value) {
  return normalizeText(value).split(/[\s&-]+/u).filter(t=>t.length>1&&!STOP.has(t)).slice(0,50);
}
function expandSearchTerms(message, profiles=[]) {
  const normalized=normalizeText(message), terms=new Set(tokenize(message));
  for(const group of GROUPS){
    if(group.aliases.some(alias=>normalized.includes(normalizeText(alias)))){
      tokenize(group.canonical).forEach(t=>terms.add(t));
      group.aliases.forEach(alias=>tokenize(alias).forEach(t=>terms.add(t)));
    }
  }
  for(const profile of profiles){
    const aliases=Array.isArray(profile.search_synonyms)?profile.search_synonyms:[];
    if(aliases.some(alias=>normalized.includes(normalizeText(alias)))){
      tokenize(String(profile.product_name||profile.product_slug||"")).forEach(t=>terms.add(t));
      aliases.forEach(alias=>tokenize(alias).forEach(t=>terms.add(t)));
    }
  }
  return Array.from(terms).slice(0,80);
}
function detectCategory(message) {
  const n=normalizeText(message);
  for(const [category,aliases] of Object.entries(CATEGORY_ALIASES)){
    if(aliases.some(a=>n.includes(normalizeText(a))))return category;
  }
  for(const group of GROUPS){
    if(group.aliases.some(a=>n.includes(normalizeText(a))))return group.category;
  }
  return null;
}
function detectBrand(message, profiles=[]) {
  const n=normalizeText(message);
  for(const p of profiles){
    const brand=normalizeText(p.brand);
    if(brand && brand.length>1 && n.includes(brand))return String(p.brand);
  }
  const match=n.match(/(?:brand|ব্র্যান্ড)\s+([\p{L}\p{N}-]{2,40})/u);
  return match?.[1]||null;
}
function profileFor(product, profiles) {
  return profiles.find(p=>String(p.product_id||"")===String(product.id||"") && p.status==="published")||null;
}
function productSearchDocument(product, profile) {
  const search=profile?.search_attributes && typeof profile.search_attributes==="object" && !Array.isArray(profile.search_attributes)?profile.search_attributes:{};
  const synonyms=Array.isArray(profile?.search_synonyms)?profile.search_synonyms:[];
  const derived=Array.isArray(profile?.derived_from)?profile.derived_from:[];
  const related=Array.isArray(profile?.related_terms)?profile.related_terms:[];
  return {
    name:String(product.name||""),slug:String(product.slug||""),category:String(product.category||""),
    category_slug:String(product.category_slug||""),description:String(product.short_description||product.description||""),
    synonyms:synonyms.map(String),derived_from:derived.map(String),related_terms:related.map(String),
    product_form:String(profile?.product_form||""),brand:String(profile?.brand||""),
    packaging_type:String(profile?.packaging_type||""),visual_description:String(profile?.visual_description||""),
    size_label:String(profile?.size_label||product.unit_type||""),attributes:search,
  };
}
function parseSizeValue(value) {
  const match=normalizeText(value).match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|g|ml|l)/iu);
  if(!match)return null;
  const unit=match[2].toLowerCase();
  return {kind:unit==="kg"||unit==="g"?"weight":"volume",value:Number(match[1])*(unit==="kg"||unit==="l"?1000:1)};
}
function hasAny(text, values) {
  const n=normalizeText(text);
  return (Array.isArray(values)?values:[]).some(v=>{const x=normalizeText(v);return x.length>1&&n.includes(x);});
}
function rankProductCandidates(products, profiles, message, decision={}, imageMatch=null) {
  const query=normalizeText(message), terms=expandSearchTerms(message,profiles.map(p=>({...p,product_name:"",product_slug:""})));
  const requestedCategory=detectCategory(message);
  const requestedBrand=detectBrand(message,profiles);
  const targetGroup=GROUPS.find(group=>group.aliases.some(alias=>query.includes(normalizeText(alias))))||null;
  const exactIdentityIntent=["exact_product_lookup","product_price_inquiry","product_availability_inquiry"].includes(String(decision.primary_intent||""));
  const requestedForm=/(গুঁড়া|গুঁড়া|পাউডার|powder)/u.test(query)?"powder":
    /(তরল|liquid)/u.test(query)?"liquid":
    /(whole|আস্ত|পুরো)/u.test(query)?"whole":
    /(কাটা|cut)/u.test(query)?"cut":null;
  const requestedPackaging=/(বোতল|bottle)/u.test(query)?"bottle":
    /(জার|jar)/u.test(query)?"jar":
    /(টিন|tin)/u.test(query)?"tin":
    /(প্যাকেট|packet|pouch|পাউচ)/u.test(query)?"packet":null;
  const requestedSize=(query.match(/(?:^|\s)([0-9]+\s?(?:ml|l|g|kg))(?=\s|$)/u)||[])[1]||"";
  const packPreference=decision.pack_preference==="small"||decision.pack_preference==="large"?decision.pack_preference:null;
  const visualSlug=typeof imageMatch?.candidate_slug==="string"?imageMatch.candidate_slug:"";
  const visualSlugs=Array.isArray(imageMatch?.candidate_slugs)?imageMatch.candidate_slugs.filter(x=>typeof x==="string"):[];

  const visualObject=String(imageMatch?.image_object||"");
  const visibleText=String(imageMatch?.visible_text||"");
  const visualBrand=String(imageMatch?.brand||"");
  const visualPackaging=String(imageMatch?.packaging_type||"");
  const genericBudgetBrowse=decision.primary_intent==="recommendation_request" && /(?:৳|টাকা|টাকার|budget|under|within|বাজেট|সর্বোচ্চ)\s*[0-9]/iu.test(query);
  const broadBrowse=decision.primary_intent==="broad_catalog_browse" || decision.primary_intent==="category_browse";
  const imageContext=decision.image_search===true;
  const sizeGroups=new Map();
  for(const product of products){
    const profile=profileFor(product,profiles);
    const doc=productSearchDocument(product,profile);
    const size=parseSizeValue(doc.size_label);
    if(!size)continue;
    const groupKey=normalizeText(product.category_slug||product.category||"")+"|"+size.kind;
    if(!sizeGroups.has(groupKey))sizeGroups.set(groupKey,[]);
    sizeGroups.get(groupKey).push(size.value);
  }
  const sizeMedians=new Map();
  sizeGroups.forEach((values,key)=>{
    const sorted=[...values].sort((a,b)=>a-b);
    sizeMedians.set(key,sorted.length%2?sorted[Math.floor(sorted.length/2)]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2);
  });
  const scored=[];
  for(const product of products){
    if(product.is_active!==true)continue;
    const identity=(String(product.name||"")+" "+String(product.slug||"")).toLowerCase();
    if(/(?:^|[\s_-])(test|sample|demo|draft|placeholder)(?:$|[\s_-])/iu.test(identity))continue;
    const profile=profileFor(product,profiles);
    const doc=productSearchDocument(product,profile);
    if(requestedCategory && normalizeText(product.category_slug||"")!==requestedCategory && normalizeText(product.category||"")!==requestedCategory) {
      const categoryAliases=CATEGORY_ALIASES[requestedCategory]||[];
      if(!categoryAliases.some(a=>normalizeText(product.category).includes(normalizeText(a))||normalizeText(product.category_slug).includes(normalizeText(a).replace(/\s+/g,"-"))))continue;
    }
    if(requestedBrand && (!doc.brand || normalizeText(doc.brand)!==normalizeText(requestedBrand)))continue;
    if(requestedForm && doc.product_form && !normalizeText(doc.product_form).includes(requestedForm))continue;
    if(requestedPackaging && doc.packaging_type && !normalizeText(doc.packaging_type).includes(requestedPackaging))continue;
    if(requestedSize && doc.size_label && normalizeText(doc.size_label).replace(/\s+/g,"")!==normalizeText(requestedSize).replace(/\s+/g,""))continue;
    const name=normalizeText(doc.name),slug=normalizeText(doc.slug),category=normalizeText(doc.category+" "+doc.category_slug);
    const aliasText=doc.synonyms.join(" ");
    if(exactIdentityIntent && targetGroup){
      const canonicalSlug=normalizeText(targetGroup.canonical).replace(/\s+/g,"-");
      const groupMatch=name.includes(normalizeText(targetGroup.canonical))||slug.includes(canonicalSlug)||
        hasAny(aliasText,targetGroup.aliases)||hasAny(doc.name,targetGroup.aliases);
      if(!groupMatch)continue;
    }
    const exactName=Boolean(name && (query===name || query.includes(name) || name.includes(query)));
    const exactAlias=hasAny(query,doc.synonyms);
    let identityScore=exactName?1:exactAlias?0.92:0;
    for(const group of GROUPS){
      const asked=group.aliases.some(a=>query.includes(normalizeText(a)));
      if(asked && (name.includes(normalizeText(group.canonical))||slug.includes(normalizeText(group.canonical.replace(/\s+/g,"-")))||hasAny(aliasText,group.aliases)))identityScore=Math.max(identityScore,0.92);
    }
    const intentScore=decision.primary_intent==="exact_product_lookup"||decision.primary_intent==="product_price_inquiry"||decision.primary_intent==="product_availability_inquiry"?1:
      decision.primary_intent==="image_product_search"||decision.primary_intent==="image_material_search"?0.9:
      decision.primary_intent==="recommendation_request"||decision.primary_intent==="product_comparison"?0.8:0.5;
    const categoryScore=requestedCategory && (category.includes(requestedCategory)||category.includes((CATEGORY_ALIASES[requestedCategory]||[]).find(a=>normalizeText(a)===category)||"__none__"))?1:
      requestedCategory && detectCategory(product.category+" "+product.category_slug)===requestedCategory?1:0;
    const attrText=JSON.stringify(doc.attributes)+" "+doc.product_form+" "+doc.derived_from.join(" ")+" "+doc.related_terms.join(" ");
    const attributeScore=hasAny(query,Object.values(doc.attributes).flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>typeof v==="string").concat(doc.product_form,doc.derived_from,doc.related_terms))?1:0;
    const docText=normalizeText([doc.name,doc.slug,doc.category,doc.description,aliasText,attrText].join(" "));
    const qTerms=terms.filter(t=>t.length>1);
    const overlap=qTerms.length?qTerms.filter(t=>docText.includes(t)).length/qTerms.length:0;
    const semanticScore=Math.min(1,overlap*1.35);
    const visualScore=visualSlug && visualSlug===doc.slug || visualSlugs.includes(doc.slug)?1:
      visualObject && (hasAny(doc.name+" "+doc.slug+" "+doc.derived_from, [visualObject])||hasAny(doc.attributes,[visualObject]))?0.75:0;
    const packagingScore=visualPackaging && doc.packaging_type && normalizeText(visualPackaging)===normalizeText(doc.packaging_type)?1:0;
    const sizeInfo=parseSizeValue(doc.size_label);
    const sizeGroupKey=normalizeText(product.category_slug||product.category||"")+"|"+(sizeInfo?.kind||"");
    const medianSize=sizeMedians.get(sizeGroupKey);
    const packPreferenceScore=packPreference&&sizeInfo&&medianSize
      ? (packPreference==="small"?(sizeInfo.value<=medianSize?1:0):(sizeInfo.value>=medianSize?1:0)) : 0;
    const visibleTextScore=visibleText && (name.includes(normalizeText(visibleText))||slug.includes(normalizeText(visibleText)))?1:0;
    const weights={identity:30,intent:20,category:15,attribute:15,semantic:8,visual:5,packaging:5,pack_preference:2};
    const raw=identityScore*weights.identity+intentScore*weights.intent+categoryScore*weights.category+
      attributeScore*weights.attribute+semanticScore*weights.semantic+visualScore*weights.visual+packagingScore*weights.packaging+packPreferenceScore*weights.pack_preference;
    const hasRelevanceEvidence=identityScore>0||categoryScore>0||attributeScore>0||semanticScore>0||visualScore>0||packagingScore>0||packPreferenceScore>0||visibleTextScore>0;
    if(!hasRelevanceEvidence && !genericBudgetBrowse && !broadBrowse && !imageContext)continue;
    const score=Math.min(100,raw+(visibleTextScore*10));
    let matchType=identityScore>=0.9?"exact":visualScore>0?"visual":attributeScore>0?"attribute":categoryScore>0?"category":semanticScore>0.25?"semantic":"alternative";
    const derivedMatch=hasAny(visualObject,doc.derived_from)||RELATIONS.some(r=>hasAny(visualObject,r.source)&&hasAny(doc.name+" "+doc.slug,r.target));
    if(derivedMatch)matchType="relationship";
    const confidenceScore=Math.max(identityScore*0.92,Math.min(0.99,score/100));
    const confidenceLevel=confidenceScore>=0.9?"high":confidenceScore>=0.75?"medium":confidenceScore>=0.5?"low":"very_low";
    scored.push({product,profile,score,confidence_score:confidenceScore,confidence_level:confidenceLevel,match_type:matchType,
      evidence:{identity:identityScore,intent:intentScore,category:categoryScore,attribute:attributeScore,semantic:semanticScore,visual:visualScore,packaging:packagingScore,pack_preference:packPreferenceScore}});
  }
  return scored.sort((a,b)=>b.score-a.score||String(a.product.name||"").localeCompare(String(b.product.name||"")));
}
function extractConversationState(message, history=[]) {
  const turns=history.filter(item=>item?.role==="user").slice(-10)
    .map(item=>String(item?.parts?.map?.(p=>p.text||"").join(" ")||"")).concat(String(message||""));
  let budget=null,purpose=null,pack=null,preference=null;
  for(const turn of turns){
    const text=normalizeText(turn);
    const budgetMatches=[...text.matchAll(/(?:৳|টাকা|টাকার|budget|under|within|maximum|max|বাজেট|সর্বোচ্চ)\s*([0-9][0-9,]*)/giu)];
    const trailingBudget=[...text.matchAll(/([0-9][0-9,]*)\s*(?:টাকা|টাকার|bdt)/giu)];
    const budgetRaw=budgetMatches.length?budgetMatches[budgetMatches.length-1][1]:trailingBudget.length?trailingBudget[trailingBudget.length-1][1]:null;
    if(budgetRaw){const value=Number(budgetRaw.replace(/,/g,""));if(Number.isFinite(value)&&value>0)budget=value;}
    if(/রান্না|ভাজি|cooking|fry|baking|বেকিং/u.test(text))purpose="cooking";
    if(/উপহার|গিফট|gift|present/u.test(text))purpose="gift";
    if(/পরিবার|বাসা|ঘর|family|household|প্রতিদিন/u.test(text))purpose="household";
    if(/ব্যবসা|রিসেল|resell|wholesale|পাইকারি/u.test(text))purpose="business";
    if(/ছোট প্যাক|small pack|small size/u.test(text))pack="small";
    if(/বড় প্যাক|বড় প্যাক|large pack|bulk|বাল্ক/u.test(text))pack="large";
    if(/ছোট প্যাক.{0,12}(?:চাই না|নয়|না)|not small pack/u.test(text))pack=null;
    if(/ঝাল|spicy/u.test(text))preference="spicy";
    if(/মিষ্টি|sweet/u.test(text))preference="sweet";
  }
  const current=normalizeText(message);
  const rejected=/(চাই না|পছন্দ হয়নি|পছন্দ হয়নি|ভালো লাগেনি|not this|don't want|do not want|not interested)/u.test(current);
  const correction=/(না,? আমি|ভুল পণ্য|এটা নয়|এটা না|ওটা নয়|not what i asked|wrong product|i meant)/u.test(current);
  return {budget_bdt:budget,purpose,pack_preference:pack,preference,rejection_detected:rejected,correction_detected:correction,recent_turns:Math.min(10,history.length)};
}
function extractImageMatch(reply) {
  const marker=/\[\[HF_IMAGE_MATCH\]\]([\s\S]*?)\[\[\/HF_IMAGE_MATCH\]\]/u;
  const match=String(reply||"").match(marker);
  if(!match)return {reply:String(reply||"").trim(),imageMatch:null};
  let imageMatch=null;
  try{
    const raw=JSON.parse(match[1]);
    const allowedTypes=new Set(["exact","derived_product","similar","alternative","uncertain"]);
    const allowedConfidence=new Set(["high","medium","low"]);
    imageMatch={
      image_object:typeof raw.image_object==="string"?raw.image_object.slice(0,80):"",
      candidate_slug:typeof raw.candidate_slug==="string"&&/^[a-z0-9-]{1,100}$/i.test(raw.candidate_slug)?raw.candidate_slug:"",
      candidate_slugs:Array.isArray(raw.candidate_slugs)?raw.candidate_slugs.filter(x=>typeof x==="string"&&/^[a-z0-9-]{1,100}$/i.test(x)).slice(0,4):[],
      brand:typeof raw.brand==="string"?raw.brand.slice(0,80):"",
      packaging_type:typeof raw.packaging_type==="string"?raw.packaging_type.slice(0,60):"",
      visible_text:typeof raw.visible_text==="string"?raw.visible_text.slice(0,100):"",
      match_type:allowedTypes.has(raw.match_type)?raw.match_type:"uncertain",
      confidence:allowedConfidence.has(raw.confidence)?raw.confidence:"low",
    };
  }catch{imageMatch=null;}
  return {reply:String(reply||"").replace(marker,"").trim(),imageMatch};
}
function applyConfidencePolicy(ranked, decision, imageMatch=null) {
  if(!Array.isArray(ranked)||!ranked.length)return [];
  if(decision?.primary_intent?.startsWith("image_")){
    if(!imageMatch || imageMatch.match_type==="uncertain" || imageMatch.confidence==="low")return [];
    if(imageMatch.candidate_slug)return ranked.filter(x=>String(x.product.slug)===imageMatch.candidate_slug);
    if(imageMatch.candidate_slugs?.length)return ranked.filter(x=>imageMatch.candidate_slugs.includes(String(x.product.slug))).slice(0,Math.min(3,Number(decision.max_product_cards||0)));
    if(imageMatch.match_type==="derived_product"||imageMatch.match_type==="similar")return ranked.filter(x=>x.confidence_level==="high"||x.confidence_level==="medium").slice(0,Math.min(3,Number(decision.max_product_cards||0)));
    return [];
  }
  const top=ranked[0];
  if(top.confidence_level==="very_low")return [];
  if(decision?.primary_intent==="exact_product_lookup" && top.confidence_level==="low")return [];
  return ranked;
}
export { normalizeText, tokenize, expandSearchTerms, detectCategory, rankProductCandidates, extractConversationState, extractImageMatch, applyConfidencePolicy };

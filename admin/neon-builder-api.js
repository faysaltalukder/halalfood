/* Halal Food multi-page storefront API.
 * GitHub owns renderer code. Neon owns catalog, pages, tenant content and orders.
 * Admin writes use the current Supabase Auth JWT; public reads are restricted by
 * Neon RLS to published websites. No database credentials are shipped to browsers.
 */
(() => {
  "use strict";
  const API_BASE="https://ep-wild-lab-a1jqqu0p.apirest.ap-southeast-1.aws.neon.tech/halal_food_db/rest/v1";
  const ALLOWED_TEMPLATES=new Set(["general-supermarket","fresh-produce","express-grocery","wholesale-bulk"]);
  const $=v=>encodeURIComponent(String(v??""));
  async function authContext(){
    const admin=await window.HFAdminReady;
    if(!admin)throw new Error("Secure Halal Food admin session is unavailable.");
    const {data,error}=await admin.client.auth.getSession(),session=data?.session;
    if(error||!session?.access_token||!session?.user?.id)throw new Error("Please sign in again before connecting to Neon.");
    return {admin,session,user:session.user,token:session.access_token};
  }
  async function request(table,query="",options={}){
    let token=options.token||null;
    if(!options.public&&!token)token=(await authContext()).token;
    const method=options.method||"GET";
    const headers={"Accept-Profile":"builder","Content-Type":"application/json"};
    if(token)headers.Authorization="Bearer "+token;
    if(method!=="GET")headers["Content-Profile"]="builder";
    if(options.prefer)headers.Prefer=options.prefer;
    const response=await fetch(API_BASE+"/"+table+query,{method,headers,body:options.body?JSON.stringify(options.body):undefined,credentials:"omit",cache:"no-store"});
    const raw=await response.text();let payload=null;
    try{payload=raw?JSON.parse(raw):null;}catch(_){payload=raw;}
    if(!response.ok){
      const msg=payload?.message||payload?.hint||payload?.details||raw||("HTTP "+response.status);
      throw new Error("Neon "+table+" request failed ("+response.status+"): "+String(msg).slice(0,260));
    }
    return payload;
  }
  const defaultContent={
    home:{heading:"A better way to shop, every day",description:"Discover carefully selected favourites, fresh picks and everyday essentials.",cta:"Shop now"},
    shop:{heading:"Shop the collection",description:"Browse our complete selection and find something good.",cta:""},
    category:{heading:"Explore this collection",description:"Thoughtfully selected products for every day.",cta:""},
    product:{heading:"Product details",description:"Quality you can trust, with all the details before you buy.",cta:"Add to cart"},
    search:{heading:"Find what you need",description:"Search the store and discover your next favourite.",cta:""},
    cart:{heading:"Your basket",description:"Review your selections before checkout.",cta:"Continue to checkout"},
    checkout:{heading:"Secure checkout",description:"A few details and your order will be on its way.",cta:"Place order"},
    "order-confirmation":{heading:"Thank you for your order",description:"Your order has been received.",cta:"Continue shopping"},
    "order-tracking":{heading:"Track your order",description:"Enter your order number and phone number to see the latest status.",cta:"Track order"},
    content:{heading:"A little more about us",description:"We believe good products and thoughtful service make everyday life better.",cta:""},
    contact:{heading:"We would love to hear from you",description:"Questions, feedback or a special request? Get in touch.",cta:"Send message"},
    faq:{heading:"How can we help?",description:"Answers to the questions we hear most often.",cta:""},
    legal:{heading:"Information and policies",description:"Please read the information below.",cta:""},
    account:{heading:"Your account",description:"Look up an order or get help with your shopping.",cta:""},
    wishlist:{heading:"Your saved favourites",description:"Keep the products you love in one place.",cta:""}
  };
  function defaultPageDocument(page,templateKey){
    const type=page.page_type||"content",content=defaultContent[type]||defaultContent.content;
    const title=page.title||"New page";
    const slug=page.slug||page.page_key;
    const color={"general-supermarket":"#b94f35","fresh-produce":"#657c4a","express-grocery":"#df6b35","wholesale-bulk":"#344b70"}[templateKey]||"#b94f35";
    const bg={"general-supermarket":"#fbf8f1","fresh-produce":"#f7f7ef","express-grocery":"#f7f8fb","wholesale-bulk":"#f5f7fa"}[templateKey]||"#fbf8f1";
    return {
      schemaVersion:1,site:{templateKey},page:{id:page.page_key||slug,title,pageType:type,slug,seoTitle:title,seoDescription:content.description},
      content:{heading:content.heading,description:content.description,cta:content.cta,sections:page.page_spec?.sections||[]},
      theme:{colors:{primary:color,paper:bg}},
      tree:[{id:"page-"+slug+"-hero",type:"section",label:"Page introduction",props:{background:bg,padding:44,width:"100%",align:"left"},children:[
        {id:"page-"+slug+"-title",type:"heading",label:"Page heading",text:content.heading,props:{color:"#263247",fontSize:38,align:"left",width:"100%"},children:[]},
        {id:"page-"+slug+"-description",type:"paragraph",label:"Page introduction",text:content.description,props:{color:"#68758a",fontSize:16,align:"left",width:"100%"},children:[]}
      ]}]
    };
  }
  async function loadTemplateCatalog(){
    const [catalog,designs]=await Promise.all([
      request("template_catalog","?select=template_key,category_slug,name,tagline,description,business_types,feature_flags,sort_order,is_builtin&is_builtin=eq.true&order=sort_order.asc",{public:true}),
      request("template_designs","?select=template_key,design_version,design_spec,preview_settings,source_commit,is_active&is_active=eq.true&order=design_version.desc",{public:true})
    ]);
    const latest=new Map();(designs||[]).forEach(row=>{if(!latest.has(row.template_key))latest.set(row.template_key,row);});
    const rows=(catalog||[]).filter(row=>ALLOWED_TEMPLATES.has(row.template_key)).map(row=>({...row,design:latest.get(row.template_key)||null}));
    if(rows.length!==4||rows.some(row=>!row.design))throw new Error("Neon catalog is missing one or more active grocery template design records.");
    return rows;
  }
  async function loadTemplatePages(templateKey){
    if(!ALLOWED_TEMPLATES.has(templateKey))throw new Error("Unsupported grocery template.");
    const rows=await request("template_pages","?select=template_key,page_key,page_type,title,slug,sort_order,page_spec,is_required,is_active&template_key=eq."+$(templateKey)+"&is_active=eq.true&order=sort_order.asc",{public:true});
    if((rows||[]).length<25)throw new Error("Neon page catalog is incomplete for "+templateKey+" (expected 25 designed pages).");
    return rows;
  }
  async function ensureWebsite(templateKey,name){
    if(!ALLOWED_TEMPLATES.has(templateKey))throw new Error("Unsupported grocery template.");
    const {user}=await authContext(),slug="hf-"+templateKey;
    const query="?select=id,owner_id,name,slug,category_slug,template_key,status,brand,settings&owner_id=eq."+$(user.id)+"&slug=eq."+$(slug)+"&limit=1";
    const found=await request("websites",query);
    if(found?.[0])return found[0];
    const created=await request("websites","?select=id,owner_id,name,slug,category_slug,template_key,status,brand,settings",{method:"POST",prefer:"return=representation",body:{owner_id:user.id,name:String(name||templateKey).slice(0,120),slug,category_slug:"ecommerce-grocery",template_key:templateKey,status:"draft",brand:{},settings:{builder_version:2,isolated_sandbox:true}}});
    if(!created?.[0])throw new Error("Neon did not return the newly created website record.");
    return created[0];
  }
  async function loadWebsiteDocuments(websiteId){
    return await request("website_documents","?select=id,website_id,owner_id,page_key,schema_version,document,updated_at&website_id=eq."+$(websiteId)+"&order=updated_at.desc");
  }
  async function seedWebsitePages(website,templateKey){
    const [pages,docs]=await Promise.all([loadTemplatePages(templateKey),loadWebsiteDocuments(website.id)]);
    const existing=new Set((docs||[]).map(row=>row.page_key));
    const missing=pages.filter(page=>!existing.has(page.page_key));
    if(missing.length){
      const {user}=await authContext();
      if(website.owner_id!==user.id)throw new Error("Website ownership check failed while preparing page documents.");
      const records=missing.map(page=>({website_id:website.id,owner_id:user.id,page_key:page.page_key,schema_version:1,document:defaultPageDocument(page,templateKey)}));
      const saved=await request("website_documents","?on_conflict=website_id,page_key&select=id,page_key",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:records});
      if(!Array.isArray(saved)||saved.length!==missing.length)throw new Error("Neon did not confirm all 25 page drafts.");
    }
    return {pages,documents:await loadWebsiteDocuments(website.id)};
  }
  async function loadPageDocument(templateKey,name,pageKey="home"){
    const website=await ensureWebsite(templateKey,name);
    await seedWebsitePages(website,templateKey);
    const rows=await request("website_documents","?select=id,website_id,owner_id,page_key,schema_version,document,updated_at&website_id=eq."+$(website.id)+"&page_key=eq."+$(pageKey)+"&limit=1");
    return {website,record:rows?.[0]||null,document:rows?.[0]?.document||null};
  }
  async function savePageDocument(website,pageKey,document){
    if(!website?.id||!website?.owner_id)throw new Error("Neon website context is missing.");
    const {user}=await authContext();
    if(website.owner_id!==user.id)throw new Error("Website ownership check failed.");
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(pageKey))throw new Error("Invalid page key.");
    if(!document||document.schemaVersion!==1||!document.page||typeof document.page.title!=="string"||!Array.isArray(document.tree)||document.tree.length>100)throw new Error("The page document did not pass schema validation.");
    const rows=await request("website_documents","?on_conflict=website_id,page_key&select=id,updated_at",{method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{website_id:website.id,owner_id:user.id,page_key,schema_version:1,document,updated_at:new Date().toISOString()}});
    if(!rows?.[0]?.id)throw new Error("Neon did not confirm that the page was saved.");
    return rows[0];
  }
  async function loadStorefrontData(siteSlug,{token=null,preview=false}={}){
    const opts=token?{token}:preview?{}:{public:true};
    const websites=await request("websites","?select=id,name,slug,template_key,status,brand,settings&slug=eq."+$(siteSlug)+"&limit=1",opts);
    const website=websites?.[0];
    if(!website)throw new Error("Storefront not found or not published.");
    if(website.status!=="published"&&!preview)throw new Error("This storefront is not published yet.");
    const [pages,documents,categories,products]=await Promise.all([
      loadTemplatePages(website.template_key),
      request("website_documents","?select=page_key,schema_version,document,updated_at&website_id=eq."+$(website.id),opts),
      request("categories","?select=id,name,slug,parent_id,sort_order,is_active&website_id=eq."+$(website.id)+"&is_active=eq.true&order=sort_order.asc",opts),
      request("products","?select=id,category_id,name,description,sku,price,compare_at_price,unit,stock,image_url,gallery,attributes,sort_order&website_id=eq."+$(website.id)+"&is_active=eq.true&order=sort_order.asc",opts)
    ]);
    return {website,pages,documents:documents||[],categories:categories||[],products:products||[]};
  }
  async function placeOrder(siteSlug,items,customer,shippingAddress,notes=""){
    return await request("rpc/place_storefront_order","",{method:"POST",public:true,body:{p_website_slug:siteSlug,p_items:items,p_customer:customer,p_shipping_address:shippingAddress,p_notes:notes}});
  }
  async function trackOrder(siteSlug,orderNumber,phone){
    return await request("rpc/track_storefront_order","",{method:"POST",public:true,body:{p_website_slug:siteSlug,p_order_number:orderNumber,p_phone:phone}});
  }
  async function getWebsiteStats(website){
    if(!website?.id)throw new Error("Website context is missing.");
    const [products,categories,docs]=await Promise.all([
      request("products","?select=id&website_id=eq."+$(website.id)+"&is_active=eq.true&limit=500"),
      request("categories","?select=id&website_id=eq."+$(website.id)+"&is_active=eq.true&limit=500"),
      loadWebsiteDocuments(website.id)
    ]);
    return {products:(products||[]).length,categories:(categories||[]).length,pages:(docs||[]).length};
  }
  async function loadWebsiteOrders(website){
    if(!website?.id||!website?.owner_id)throw new Error("Website context is missing.");
    const {user}=await authContext();
    if(website.owner_id!==user.id)throw new Error("Website ownership check failed.");
    return await request("orders","?select=id,order_number,customer,shipping_address,subtotal,delivery_fee,discount,total,payment_method,payment_status,status,notes,created_at,order_items(id,product_snapshot,quantity,unit_price,line_total)&website_id=eq."+$(website.id)+"&owner_id=eq."+$(user.id)+"&order=created_at.desc&limit=250");
  }
  async function updateOrderStatus(website,orderId,status){
    const allowed=new Set(["pending","processing","shipped","delivered","cancelled"]);
    if(!allowed.has(status))throw new Error("Unsupported order status.");
    const {user}=await authContext();
    if(!website?.id||website.owner_id!==user.id)throw new Error("Website ownership check failed.");
    const rows=await request("orders","?id=eq."+$(orderId)+"&website_id=eq."+$(website.id)+"&owner_id=eq."+$(user.id)+"&select=id,order_number,status,payment_status",{method:"PATCH",prefer:"return=representation",body:{status}});
    if(!rows?.[0])throw new Error("Neon did not confirm the order status update.");
    return rows[0];
  }
  async function createCustomPage(website,templateKey,title){
    const clean=String(title||"").trim().slice(0,80);
    if(clean.length<2)throw new Error("Page title must contain at least two characters.");
    const slug=clean.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
    if(!slug)throw new Error("Please choose a page title using letters or numbers.");
    const pageKey="custom-"+slug;
    const docs=await loadWebsiteDocuments(website.id);
    if((docs||[]).some(row=>row.page_key===pageKey))throw new Error("A page with this address already exists.");
    const page={page_key:pageKey,page_type:"content",title:clean,slug,page_spec:{sections:["page-hero","rich-content","footer"]}};
    const document=defaultPageDocument(page,templateKey);
    await savePageDocument(website,pageKey,document);
    return page;
  }
  async function publishWebsite(website,brand,settings){
    const {user}=await authContext();
    if(!website?.id||website.owner_id!==user.id)throw new Error("Website ownership check failed.");
    const [products,categories]=await Promise.all([
      request("products","?select=id&website_id=eq."+$(website.id)+"&is_active=eq.true&limit=1"),
      request("categories","?select=id&website_id=eq."+$(website.id)+"&is_active=eq.true&limit=1")
    ]);
    if(!products?.length||!categories?.length)throw new Error("Add at least one active category and one active product before publishing.");
    const result=await request("websites","?id=eq."+$(website.id)+"&owner_id=eq."+$(user.id)+"&select=id,status,updated_at",{method:"PATCH",prefer:"return=representation",body:{status:"published",brand:brand||website.brand||{},settings:settings||website.settings||{},updated_at:new Date().toISOString()}});
    if(!result?.[0])throw new Error("Neon did not confirm the publish status.");
    return result[0];
  }
  window.HFNeonBuilderApi=Object.freeze({apiBase:API_BASE,loadTemplateCatalog,loadTemplatePages,ensureWebsite,loadWebsiteDocuments,seedWebsitePages,loadPageDocument,savePageDocument,loadDocument:loadPageDocument,saveDocument:(website,document,pageKey="home")=>savePageDocument(website,pageKey,document),loadStorefrontData,placeOrder,trackOrder,getWebsiteStats,loadWebsiteOrders,updateOrderStatus,createCustomPage,publishWebsite,defaultPageDocument});
})();

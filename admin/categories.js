(() => {
"use strict";
window.HFAdminReady.then(async H => {
 if(!H)return;
 const {client,esc,money,toast,audit,slugify}=H;
 const page=document.body.dataset.page||"categories";
 const $=id=>document.getElementById(id);
 const STORE_CONFIG=window.HALAL_STORE_CONFIG||{};
const CATALOG_CONFIG=STORE_CONFIG.catalog||{};
const CATEGORY_TABLE=CATALOG_CONFIG.categoriesTable||"categories";
const PRODUCT_TABLE=CATALOG_CONFIG.productsTable||"products";
const MAX_CATEGORIES=Math.min(50000,Math.max(1,Number(CATALOG_CONFIG.maxCategories)||5000));
const MAX_PRODUCTS=Math.min(50000,Math.max(1,Number(CATALOG_CONFIG.maxProducts)||20000));
const REORDER_CATEGORY_RPC=CATALOG_CONFIG.reorderCategoriesRpc||"admin_reorder_categories";
const REORDER_PRODUCT_RPC=CATALOG_CONFIG.reorderProductsRpc||"admin_reorder_products";
const REORDER_HOME_RPC=CATALOG_CONFIG.reorderHomeProductsRpc||"admin_reorder_home_products";
const STORAGE_BUCKET=STORE_CONFIG.storage?.publicContentBucket||"store-content";
const state={categories:[],products:[],loading:false,categoryDrag:null,productDrag:null,lastUndo:null,view:"categories",selectedCategoryId:null};
 const orderOf=row=>Number(row?.sort_order??0);
 const byOrder=(a,b)=>orderOf(a)-orderOf(b)||String(a.name||"").localeCompare(String(b.name||""));
 const categoryById=id=>state.categories.find(c=>c.id===id);
 const categoryBySlug=slug=>state.categories.find(c=>c.slug===slug);
 const childrenOf=parentId=>state.categories.filter(c=>(c.parent_id||null)===(parentId||null)).sort(byOrder);
 function depthOf(category){
  let depth=1,current=category,guard=0;
  while(current?.parent_id&&guard++<3){current=categoryById(current.parent_id);if(current)depth++;}
  return depth;
 }
 function descendantsOf(id){
  const found=new Set(),visit=parent=>state.categories.filter(c=>c.parent_id===parent).forEach(c=>{if(!found.has(c.id)){found.add(c.id);visit(c.id);}});
  visit(id);return found;
 }
 function ancestorsOf(category){
  const chain=[];let current=category,guard=0;
  while(current&&guard++<4){chain.unshift(current);current=current.parent_id?categoryById(current.parent_id):null;}
  return chain;
 }
 function categoryPath(category){return ancestorsOf(category).map(c=>c.name).join(" / ");}
 function effectiveActive(category){
  return ancestorsOf(category).every(c=>Boolean(c.is_active));
 }
 function orderedCategories(){
  const out=[];const visit=parent=>childrenOf(parent).forEach(c=>{out.push(c);visit(c.id);});
  visit(null);return out;
 }
 function categoryProductCount(category){
  const slugs=new Set([category.slug,...[...descendantsOf(category.id)].map(id=>categoryById(id)?.slug).filter(Boolean)]);
  return state.products.filter(p=>slugs.has(p.category_slug)).length;
 }
 function optionMarkup(selected="",excludeId=null){
  return '<option value="">Top-level category</option>'+orderedCategories().filter(c=>c.id!==excludeId&&!descendantsOf(excludeId||"").has(c.id)).map(c=>
   '<option value="'+esc(c.id)+'" '+(c.id===selected?"selected":"")+'>'+esc("— ".repeat(Math.max(0,depthOf(c)-1))+c.name)+'</option>'
  ).join("");
 }
 function productCategoryOptions(selected=""){
  return '<option value="">Choose category</option>'+orderedCategories().filter(c=>effectiveActive(c)||c.slug===selected).map(c=>
   '<option value="'+esc(c.slug)+'" '+(c.slug===selected?"selected":"")+'>'+esc("— ".repeat(Math.max(0,depthOf(c)-1))+c.name)+'</option>'
  ).join("");
 }
 function setStatus(id,message,error=false){
  const node=$(id);if(node){node.textContent=message||"";node.classList.toggle("error",!!error);}
 }
 async function fetchCatalogRows(table,fields,maxRows,sortFields){
  const pageSize=500,rows=[];
  for(let offset=0;offset<maxRows;offset+=pageSize){
   let query=client.from(table).select(fields);
   sortFields.forEach(field=>{query=query.order(field,{ascending:true});});
   const {data,error}=await query.range(offset,offset+pageSize-1);
   if(error)throw error;
   const page=data||[];rows.push(...page);
   if(page.length<pageSize)return rows;
  }
  throw new Error("The "+table+" catalog reached the workspace safety limit. Narrow the catalog or increase its pagination limit.");
 }
 async function reload(showToast=false){
  if(state.loading)return;
  state.loading=true;
  try{
   const [categories,products]=await Promise.all([
    fetchCatalogRows(CATEGORY_TABLE,"id,name,slug,parent_id,description,image_url,is_active,sort_order,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at",MAX_CATEGORIES,["sort_order","name","id"]),
    fetchCatalogRows(PRODUCT_TABLE,"id,name,slug,sku,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,stock_quantity,is_active,is_featured,sort_order,home_sort_order,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at",MAX_PRODUCTS,["sort_order","name","id"])
   ]);
   state.categories=categories;state.products=products;
   renderPage();
   if(showToast)toast("Catalog refreshed.");
  }catch(error){
   console.error("Catalog workspace could not load",error);
   toast(error?.message||"Could not load the catalog. Refresh and try again.","error");
  }finally{state.loading=false;}
 }
 function renderPage(){
  if(page==="categories"){renderExplorer();renderSorting();}
 }
 function directCategoryProductCount(category){
  return state.products.filter(product=>product.category_slug===category.slug).length;
 }
 function categoryNodeMarkup(category,index,total,search="",filter="all"){
  const depth=depthOf(category),query=String(search||"").toLowerCase().trim();
  const active=effectiveActive(category),directCount=directCategoryProductCount(category),branchCount=categoryProductCount(category);
  if(query&&!(category.name+" "+category.slug).toLowerCase().includes(query))return "";
  if(filter==="active"&&!active)return "";
  if(filter==="hidden"&&active)return "";
  const canReorder=!query&&filter==="all";
  const image=category.image_url
   ?'<img class="catalog-category-thumb" src="'+esc(category.image_url)+'" alt="" loading="lazy">'
   :'<span class="catalog-category-thumb catalog-category-thumb-empty" aria-hidden="true">▧</span>';
  const childCount=childrenOf(category.id).length;
  return '<article class="catalog-tree-node catalog-explorer-row" data-node-id="'+esc(category.id)+'">'+
   '<div class="catalog-tree-row" draggable="'+String(canReorder)+'" data-category-id="'+esc(category.id)+'" data-parent-id="'+esc(category.parent_id||"")+'">'+
    '<span class="catalog-tree-grip" data-touch-drag-handle aria-hidden="true" title="Hold and drag to reorder">⠿</span>'+
    image+
    '<div class="catalog-tree-info"><div class="catalog-tree-title"><strong>'+esc(category.name)+'</strong><span class="catalog-tree-level">'+(depth===1?"মূল ক্যাটাগরি":depth===2?"সাব-ক্যাটাগরি":"চাইল্ড ক্যাটাগরি")+'</span></div>'+
     '<small>/'+esc(category.slug)+' · '+directCount+'টি সরাসরি পণ্য · '+childCount+'টি সাব-ক্যাটাগরি</small></div>'+
    '<span class="catalog-tree-product-count">'+(active?'<span class="hf-status hf-status-active">Visible</span>':'<span class="hf-status hf-status-hidden">Hidden</span>')+'</span>'+
    '<div class="catalog-tree-actions">'+
     '<button class="catalog-mini-button" type="button" data-cat-up="'+esc(category.id)+'" '+(index===0||!canReorder?"disabled":"")+' aria-label="Move '+esc(category.name)+' up">↑ উপরে</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-down="'+esc(category.id)+'" '+(index===total-1||!canReorder?"disabled":"")+' aria-label="Move '+esc(category.name)+' down">↓ নিচে</button>'+
     '<button class="catalog-mini-button catalog-enter-button" type="button" data-cat-enter="'+esc(category.id)+'">ভেতরে যান →</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-edit="'+esc(category.id)+'">সম্পাদনা</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-toggle="'+esc(category.id)+'">'+(category.is_active?"লুকান":"দেখান")+'</button>'+
     (depth<3?'<button class="catalog-mini-button" type="button" data-cat-add-child="'+esc(category.id)+'">＋ সাব-ক্যাটাগরি</button>':"")+
    '</div>'+
    '<span class="catalog-explorer-count">'+branchCount+'টি মোট পণ্য · '+childCount+'টি সাব-ক্যাটাগরি</span>'+
   '</div></article>';
 }
 function renderExplorer(){
  const section=$("categoryExplorerSection"),tree=$("categoryTree");
  if(!section||!tree)return;
  const isHome=state.view==="home";
  section.hidden=isHome;
  if(isHome)return;
  let selected=state.selectedCategoryId?categoryById(state.selectedCategoryId):null;
  if(state.selectedCategoryId&&!selected){state.selectedCategoryId=null;selected=null;}
  const siblings=childrenOf(selected?.id||null);
  const depth=selected?depthOf(selected):0;
  const search=$("categoryTreeSearch")?.value||"",filter=$("categoryTreeVisibility")?.value||"all";
  $("categoryViewTitle").textContent=selected?selected.name+" · ক্যাটাগরি":"মূল ক্যাটাগরি";
  $("categoryViewDescription").textContent=selected
   ?"এই ক্যাটাগরির সাব-ক্যাটাগরিতে যেতে পারবেন। নিচে সরাসরি যুক্ত পণ্য আলাদাভাবে সাজানো যাবে।"
   :"প্রথমে একটি ক্যাটাগরি খুলুন। তার ভেতরে সাব-ক্যাটাগরি ও পণ্যের তালিকা পাবেন।";
  $("categoryBackBtn").hidden=!selected;
  $("addRootCategory").hidden=!!selected;
  $("addChildCategory").hidden=!selected||depth>=3;
  $("categoryTreeSearch").placeholder=selected?"এই স্তরের সাব-ক্যাটাগরি খুঁজুন…":"মূল ক্যাটাগরি খুঁজুন…";
  $("categoryExplorerHint").innerHTML=selected
   ?'<strong>'+esc(selected.name)+'</strong> · '+childrenOf(selected.id).length+'টি সাব-ক্যাটাগরি · '+directCategoryProductCount(selected)+'টি সরাসরি পণ্য। সাব-ক্যাটাগরি সাজাতে ↑/↓ ব্যবহার করুন; পণ্য সাজানোর জন্য নিচের তালিকা ব্যবহার করুন।'
   :'একটি ক্যাটাগরির <strong>ভেতরে যান →</strong>। তারপর তার ভেতরের সাব-ক্যাটাগরি এবং সরাসরি যুক্ত পণ্য সাজাতে পারবেন।';
  const crumbs=[{id:"root",name:"সব ক্যাটাগরি"},...(selected?ancestorsOf(selected).map(c=>({id:c.id,name:c.name})):[])];
  $("categoryBreadcrumb").innerHTML=crumbs.map((crumb,index)=>
   (index===crumbs.length-1
    ?'<span class="catalog-breadcrumb-current" aria-current="page">'+esc(crumb.name)+'</span>'
    :'<button type="button" data-cat-breadcrumb="'+esc(crumb.id)+'">'+esc(crumb.name)+'</button>')
  ).join('<span aria-hidden="true">/</span>');
  const activeProducts=state.products.filter(p=>p.is_active).length;
  const hidden=state.categories.filter(c=>!effectiveActive(c)).length+state.products.filter(p=>!p.is_active).length;
  $("catalogCategoryCount").textContent=String(state.categories.length);
  $("catalogProductCount").textContent=String(activeProducts);
  $("catalogNestedCount").textContent=String(state.categories.filter(c=>c.parent_id).length);
  $("catalogHiddenCount").textContent=String(hidden);
  const markup=siblings.map((category,index)=>categoryNodeMarkup(category,index,siblings.length,search,filter)).filter(Boolean).join("");
  tree.innerHTML=markup;
  $("categoryTreeEmpty").hidden=!!markup;
  $("categoryTreeEmpty").textContent=search||filter!=="all"?"এই স্তরে খোঁজের সঙ্গে মেলে এমন কোনো ক্যাটাগরি নেই।":"এখানে এখনো কোনো সাব-ক্যাটাগরি নেই।";
  setStatus("categoryTreeStatus","ক্যাটাগরির ক্রম বদলালে তা ওয়েবসাইটেও আপডেট হবে।");
  updateUndoButtons();
 }
 function productRowMarkup(product,index,total,canDrag){
  return '<article class="product-sort-item" draggable="'+String(canDrag)+'" data-product-id="'+esc(product.id)+'">'+
   '<span class="product-sort-grip" data-touch-drag-handle aria-hidden="true" title="Hold and drag to reorder">⠿</span>'+
   (product.image_url?'<img class="product-sort-image" src="'+esc(product.image_url)+'" alt="" loading="lazy">':'<span class="product-sort-image product-sort-image-empty">No image</span>')+
   '<div class="product-sort-main"><strong>'+esc(product.name)+'</strong><small>'+esc(product.sku||product.slug)+' · '+esc(categoryPath(categoryBySlug(product.category_slug)||{name:product.category||"Unassigned"}))+'</small><div class="product-sort-meta"><span class="product-sort-price">'+esc(product.display_price||money(product.price))+'</span><span class="hf-status '+(product.is_active?"hf-status-active":"hf-status-hidden")+'">'+(product.is_active?"Visible":"Hidden")+'</span>'+(product.is_featured?'<span class="hf-status hf-status-review">Featured</span>':"")+'</div></div>'+
   '<div class="product-sort-actions"><button type="button" class="catalog-mini-button" data-product-up="'+esc(product.id)+'" '+(index===0||!canDrag?"disabled":"")+' aria-label="Move '+esc(product.name)+' up">↑ উপরে</button><button type="button" class="catalog-mini-button" data-product-down="'+esc(product.id)+'" '+(index===total-1||!canDrag?"disabled":"")+' aria-label="Move '+esc(product.name)+' down">↓ নিচে</button><button type="button" class="catalog-mini-button" data-product-edit="'+esc(product.id)+'">সম্পাদনা</button></div></article>';
 }
 function renderSorting(){
  const section=$("productSortSection"),list=$("productSortList");
  if(!section||!list)return;
  const mode=state.view==="home"?"home":"category";
  const selected=state.selectedCategoryId?categoryById(state.selectedCategoryId):null;
  section.hidden=mode!=="home"&&!selected;
  if(section.hidden)return;
  $("productSortTitle").textContent=mode==="home"?"হোমপেজের পণ্যের ক্রম":"পণ্য · "+selected.name;
  $("productSortDescription").textContent=mode==="home"
   ?"হোমপেজে প্রথমে কোন পণ্য দেখাবে, তা এখানে সাজান।"
   :"এই ক্যাটাগরিতে সরাসরি যুক্ত পণ্য সাজান। সাব-ক্যাটাগরির পণ্য আলাদা করে সেই সাব-ক্যাটাগরিতে ঢুকে সাজাতে হবে।";
  $("productSortScopeBadge").textContent=mode==="home"?"হোমপেজের ক্রম":"ক্যাটাগরির ক্রম";
  $("productSortBackBtn").hidden=mode!=="home";
  const scopeSlug=mode==="home"?"":selected.slug;
  const all=mode==="home"
   ?state.products.filter(p=>p.is_active).sort((a,b)=>Number(a.home_sort_order??1000000)-Number(b.home_sort_order??1000000)||orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)))
   :state.products.filter(p=>p.category_slug===scopeSlug).sort((a,b)=>orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)));
  const search=String($("productSortSearch")?.value||"").toLowerCase().trim();
  const filtered=search?all.filter(p=>(p.name+" "+p.slug+" "+(p.sku||"")).toLowerCase().includes(search)):all;
  const canDrag=!search;
  list.innerHTML=filtered.length?filtered.map((p,i)=>productRowMarkup(p,i,filtered.length,canDrag)).join(""):"";
  $("productSortEmpty").hidden=!!filtered.length;
  $("sortingVisibleCount").textContent=String(all.length);
  $("sortingActiveCount").textContent=String(all.filter(p=>p.is_active).length);
  $("sortingHiddenCount").textContent=String(all.filter(p=>!p.is_active).length);
  $("sortingScopeNote").textContent=mode==="home"?"হোমপেজের সক্রিয় পণ্য":"সরাসরি যুক্ত পণ্য · "+selected.name;
  $("productSortStatus").textContent=search?"সম্পূর্ণ ক্রম সাজাতে সার্চ মুছে দিন।":"ড্র্যাগ করুন অথবা ↑ উপরে / ↓ নিচে চাপুন।";
  updateUndoButtons();
 }
 function moveOrderedId(ids,id,directionOrTarget){
  const from=ids.indexOf(id);
  if(from<0)return ids.slice();
  const next=ids.slice();
  const [moved]=next.splice(from,1);
  let insertAt;
  if(typeof directionOrTarget==="number"){
   insertAt=Math.max(0,Math.min(next.length,from+directionOrTarget));
  }else{
   if(!ids.includes(directionOrTarget)||directionOrTarget===id)return ids.slice();
   insertAt=next.indexOf(directionOrTarget);
  }
  if(insertAt<0)return ids.slice();
  next.splice(insertAt,0,moved);
  return next;
 }
 function sortCategoryIds(parentId){
  return childrenOf(parentId).map(c=>c.id);
 }
 function updateUndoButtons(){
  const categoryButton=$("undoCategoryOrder"),productButton=$("undoProductOrder");
  if(categoryButton)categoryButton.hidden=state.lastUndo?.kind!=="category";
  if(productButton)productButton.hidden=state.lastUndo?.kind!=="product";
 }
 async function persistCategoryOrder(parentId,ids,previousIds,recordUndo=true,isUndo=false){
  if(!ids.length)return false;
  setStatus("categoryTreeStatus","ক্যাটাগরির ক্রম সংরক্ষণ হচ্ছে…");
  const {error}=await client.rpc(REORDER_CATEGORY_RPC,{p_parent_id:parentId||null,p_category_ids:ids});
  if(error){if(recordUndo)state.lastUndo=null;updateUndoButtons();toast(error.message||"Category order could not be saved.","error");await reload();return false;}
  state.lastUndo=recordUndo?{kind:"category",parentId:parentId||null,ids:previousIds}:null;
  await audit?.(isUndo?"catalog.category.reorder_undone":"catalog.category.reordered","category",parentId||null,(isUndo?"Restored ":"Reordered ")+ids.length+" sibling categories",{parent_id:parentId||null,category_ids:ids});
  toast(isUndo?"আগের ক্যাটাগরি ক্রম ফিরিয়ে আনা হয়েছে।":"ক্যাটাগরির নতুন ক্রম সংরক্ষণ হয়েছে।");await reload();return true;
 }
 async function reorderCategory(id,directionOrTarget){
  const item=categoryById(id);if(!item)return;
  const previousIds=childrenOf(item.parent_id||null).map(c=>c.id);
  if(!previousIds.includes(id))return;
  const ids=moveOrderedId(previousIds,id,directionOrTarget);
  if(ids.every((value,index)=>value===previousIds[index]))return;
  await persistCategoryOrder(item.parent_id||null,ids,previousIds,true);
 }
 function openCategoryEditor(id=null,parentId=null){
  const form=$("categoryForm");if(!form)return;
  form.reset();
  const item=id?categoryById(id):null;
  $("categoryId").value=item?.id||"";
  $("categoryName").value=item?.name||"";
  $("categorySlug").value=item?.slug||"";
  $("categorySlug").readOnly=!!item;
  $("categoryParent").innerHTML=optionMarkup(item?.parent_id||parentId||"",item?.id||null);
  $("categoryParent").value=item?.parent_id||parentId||"";
  $("categoryDescription").value=item?.description||"";
  $("categoryImageUrl").value=item?.image_url||"";
  $("categorySeoTitle").value=item?.seo_title||"";
  $("categorySeoDescription").value=item?.seo_description||"";
  $("categorySortOrder").value=item?.sort_order??(childrenOf(parentId).length*10);
  $("categoryActive").checked=item?Boolean(item.is_active):true;
  $("categoryImageFile").value="";
  paintPreview("categoryImagePreview","categoryImagePreviewNote",item?.image_url||"");
  $("categoryDialogTitle").textContent=item?"Edit category":(parentId?"Add subcategory":"Add category");
  setStatus("categoryFormError","");
  $("categoryDialog").showModal();
 }
 function validateCategoryMove(id,parentId){
  if(id&&parentId===id)throw new Error("A category cannot be its own parent.");
  if(id&&parentId&&descendantsOf(id).has(parentId))throw new Error("This move would create a circular category structure.");
  const parent=parentId?categoryById(parentId):null;
  const newDepth=parent?depthOf(parent)+1:1;
  const idToCheck=id?categoryById(id):null;
  const descendants=id?descendantsOf(id):new Set();
  let maxBelow=0;
  descendants.forEach(childId=>{const child=categoryById(childId);if(child)maxBelow=Math.max(maxBelow,depthOf(child)-(idToCheck?depthOf(idToCheck):0));});
  if(newDepth+maxBelow>3)throw new Error("The catalog supports a maximum of three category levels.");
 }
 async function uploadContentImage(input,folder,slug){
  const file=input?.files?.[0];if(!file)return null;
  if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type))throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
  if(file.size>5*1024*1024)throw new Error("Image size must be 5 MB or less.");
  const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"}[file.type];
  const path=folder+"/"+slug+"-"+Date.now()+"."+ext;
  const {error}=await client.storage.from(STORAGE_BUCKET).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
  if(error)throw error;
  return client.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
 }
 async function saveCategory(event){
  event.preventDefault();const button=$("saveCategoryBtn");button.disabled=true;
  setStatus("categoryFormError","Saving category…");
  try{
   const id=$("categoryId").value||null,name=$("categoryName").value.trim(),slug=slugify($("categorySlug").value||name),parentId=$("categoryParent").value||null;
   if(!name||!slug)throw new Error("Enter a category name and URL slug.");
   if(state.categories.some(c=>c.slug===slug&&c.id!==id))throw new Error("This category URL slug is already in use.");
   validateCategoryMove(id,parentId);
   let image=$("categoryImageUrl").value.trim()||null;
   const uploaded=await uploadContentImage($("categoryImageFile"),"categories",slug);if(uploaded)image=uploaded;
   const old=id?categoryById(id):null;
   const movedToNewParent=Boolean(old&&String(old.parent_id||"")!==String(parentId||""));
   const nextParentOrder=childrenOf(parentId).filter(category=>category.id!==id).reduce((max,category)=>Math.max(max,orderOf(category)),0)+10;
   const row={name,slug,parent_id:parentId,description:$("categoryDescription").value.trim(),image_url:image,
    seo_title:$("categorySeoTitle").value.trim()||name+" | "+(STORE_CONFIG.storeName||"Store"),
    seo_description:$("categorySeoDescription").value.trim()||$("categoryDescription").value.trim().slice(0,155),
    sort_order:movedToNewParent?nextParentOrder:Number($("categorySortOrder").value||0),is_active:$("categoryActive").checked,
    cms_created:old?Boolean(old.cms_created):true,cms_managed:true,updated_at:new Date().toISOString()};
   const result=id?await client.from(CATEGORY_TABLE).update(row).eq("id",id).select("id").single():await client.from(CATEGORY_TABLE).insert(row).select("id").single();
   if(result.error)throw result.error;
   $("categoryDialog").close();await reload();await audit?.(id?"catalog.category.updated":"catalog.category.created","category",result.data?.id||id,name,{parent_id:parentId});
   toast(id?"Category updated.":"Category created.");
  }catch(error){setStatus("categoryFormError",error.message||"Could not save category.",true);}
  finally{button.disabled=false;}
 }
 async function toggleCategory(id){
  const item=categoryById(id);if(!item)return;
  const action=item.is_active?"hide":"show";
  if(!confirm((item.is_active?"Hide ":"Show ")+item.name+"? "+(item.is_active?"Its descendants and products will be hidden from public navigation while the parent is hidden. No records will be deleted.":"It will become available to customers again if its parent is visible.")))return;
  const {error}=await client.from(CATEGORY_TABLE).update({is_active:!item.is_active,updated_at:new Date().toISOString()}).eq("id",id);
  if(error){toast(error.message||"Category visibility could not be changed.","error");return;}
  await audit?.("catalog.category."+action,"category",id,item.name);
  await reload();toast("Category "+(action==="hide"?"hidden":"restored")+".");
 }
 function paintPreview(imageId,noteId,url){
  const image=$(imageId),note=$(noteId);if(!image)return;
  if(url){image.src=url;image.hidden=false;if(note)note.hidden=true;}
  else{image.removeAttribute("src");image.hidden=true;if(note)note.hidden=false;}
 }
 function bindImagePreview(fileId,urlId,imageId,noteId){
  const file=$(fileId),url=$(urlId);if(!file)return;
  file.addEventListener("change",()=>{const f=file.files?.[0];if(f){const preview=URL.createObjectURL(f);paintPreview(imageId,noteId,preview);}});
  url?.addEventListener("input",()=>{if(!file.files?.length)paintPreview(imageId,noteId,url.value.trim());});
 }
 function reorderStateProducts(ids,key){
  const rank=new Map(ids.map((id,i)=>[id,(i+1)*10]));
  state.products=state.products.map(p=>rank.has(p.id)?{...p,[key]:rank.get(p.id)}:p);
 }
 async function persistProductOrder(mode,categorySlug,ids,previousIds,recordUndo=true,isUndo=false){
  setStatus("productSortStatus","পণ্যের ক্রম সংরক্ষণ হচ্ছে…");
  const rpc=mode==="home"?REORDER_HOME_RPC:REORDER_PRODUCT_RPC;
  const args=mode==="home"?{p_product_ids:ids}:{p_category_slug:categorySlug,p_product_ids:ids};
  const {error}=await client.rpc(rpc,args);
  if(error){if(recordUndo)state.lastUndo=null;updateUndoButtons();toast(error.message||"Product order could not be saved.","error");await reload();return false;}
  state.lastUndo=recordUndo?{kind:"product",mode,categorySlug:categorySlug||null,ids:previousIds}:null;
  await audit?.(isUndo?"catalog.product.reorder_undone":(mode==="home"?"catalog.product.home_reordered":"catalog.product.category_reordered"),"product",null,(isUndo?"Restored ":"Reordered ")+ids.length+" products",{mode,category_slug:categorySlug||null});
  toast(isUndo?"আগের পণ্য ক্রম ফিরিয়ে আনা হয়েছে।":(mode==="home"?"Homepage product order saved.":"Category product order saved."));await reload();return true;
 }
 async function undoLastOrder(kind){
  const undo=state.lastUndo;if(!undo||undo.kind!==kind)return;
  if(kind==="category")await persistCategoryOrder(undo.parentId,undo.ids,null,false,true);
  else await persistProductOrder(undo.mode,undo.categorySlug,undo.ids,null,false,true);
 }
 async function reorderProduct(id,directionOrTarget){
  const mode=state.view==="home"?"home":"category",slug=mode==="home"?"":categoryById(state.selectedCategoryId)?.slug||"";
  const list=mode==="home"
   ?state.products.filter(p=>p.is_active).sort((a,b)=>Number(a.home_sort_order??1000000)-Number(b.home_sort_order??1000000)||orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)))
   :state.products.filter(p=>p.category_slug===slug).sort((a,b)=>orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)));
  const previousIds=list.map(p=>p.id);
  if(!previousIds.includes(id))return;
  const ids=moveOrderedId(previousIds,id,directionOrTarget);
  if(ids.every((value,index)=>value===previousIds[index]))return;
  reorderStateProducts(ids,mode==="home"?"home_sort_order":"sort_order");renderSorting();
  await persistProductOrder(mode,slug,ids,previousIds,true);
 }
 function openQuickProductEditor(id){
  const product=state.products.find(p=>p.id===id);if(!product)return;
  $("quickProductForm").reset();
  $("quickProductId").value=product.id;
  $("quickProductName").value=product.name||"";
  $("quickProductSlug").value=product.slug||"";
  $("quickProductCategory").innerHTML=productCategoryOptions(product.category_slug);
  $("quickProductCategory").value=product.category_slug||"";
  $("quickProductPrice").value=product.price??"";
  $("quickProductUnit").value=product.unit_type||"piece";
  $("quickProductImageUrl").value=product.image_url||"";
  $("quickProductShortDescription").value=product.short_description||"";
  $("quickProductFullDescription").value=product.full_description||product.description||"";
  $("quickProductSeoTitle").value=product.seo_title||"";
  $("quickProductSeoDescription").value=product.seo_description||"";
  $("quickProductActive").checked=Boolean(product.is_active);
  $("quickProductFeatured").checked=Boolean(product.is_featured);
  $("quickProductImageFile").value="";
  paintPreview("quickProductImagePreview","quickProductImagePreviewNote",product.image_url||"");
  $("quickProductTitle").textContent="Edit "+product.name;
  $("openFullProductEditor").href="./products.html";
  setStatus("quickProductFormError","");
  $("quickProductDialog").showModal();
 }
 async function saveQuickProduct(event){
  event.preventDefault();const button=$("saveQuickProductBtn");button.disabled=true;
  setStatus("quickProductFormError","Saving product…");
  try{
   const id=$("quickProductId").value,old=state.products.find(p=>p.id===id),name=$("quickProductName").value.trim(),slug=old?.slug||"";
   const category=categoryBySlug($("quickProductCategory").value),price=Number($("quickProductPrice").value),unit=$("quickProductUnit").value.trim()||"piece";
   if(!old||!name||!category||!effectiveActive(category))throw new Error("Choose a visible category and enter a product name.");
   if(!Number.isFinite(price)||price<0)throw new Error("Price must be zero or greater.");
   let image=$("quickProductImageUrl").value.trim()||null;
   const uploaded=await uploadContentImage($("quickProductImageFile"),"products",slug);if(uploaded)image=uploaded;
   if(!image)throw new Error("Add a product image URL or upload an image.");
   const displayPrice=money(price)+(unit.toLowerCase()==="piece"?" / piece":" / "+unit);
   const moved=old.category_slug!==category.slug;
   const newOrder=moved?state.products.filter(p=>p.category_slug===category.slug).reduce((max,p)=>Math.max(max,orderOf(p)),0)+10:old.sort_order;
   const row={name,category:category.name,category_slug:category.slug,price,unit_type:unit,display_price:displayPrice,image_url:image,
    short_description:$("quickProductShortDescription").value.trim(),full_description:$("quickProductFullDescription").value.trim(),
    description:$("quickProductFullDescription").value.trim(),seo_title:$("quickProductSeoTitle").value.trim()||name+" | "+(STORE_CONFIG.storeName||"Store"),
    seo_description:$("quickProductSeoDescription").value.trim()||$("quickProductShortDescription").value.trim().slice(0,155),
    is_active:$("quickProductActive").checked,is_featured:$("quickProductFeatured").checked,
    ...(moved?{sort_order:newOrder}:{}),updated_at:new Date().toISOString()};
   const {error}=await client.from(PRODUCT_TABLE).update(row).eq("id",id);
   if(error)throw error;
   $("quickProductDialog").close();await audit?.("catalog.product.quick_updated","product",id,name,{category_slug:category.slug});
   await reload();toast("Product updated. The live catalog will use the saved details.");
  }catch(error){setStatus("quickProductFormError",error.message||"Could not save product.",true);}
  finally{button.disabled=false;}
 }
 function bindTouchReorder(container,rowSelector,idField,scopeField,reorder){
  if(!container)return;
  let drag=null;
  const clear=()=>{
   if(!drag)return;
   drag.row?.classList.remove("is-dragging");
   container.querySelectorAll(".is-drop-target").forEach(row=>row.classList.remove("is-drop-target"));
   drag=null;
   document.removeEventListener("pointermove",move,{passive:false});
   document.removeEventListener("pointerup",finish);
   document.removeEventListener("pointercancel",cancel);
  };
  const move=event=>{
   if(!drag||event.pointerType!=="touch")return;
   if(event.cancelable)event.preventDefault();
   const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(rowSelector);
   container.querySelectorAll(".is-drop-target").forEach(row=>row.classList.remove("is-drop-target"));
   drag.target=null;
   if(!target||target===drag.row)return;
   if(scopeField&&String(target.dataset[scopeField]||"")!==String(drag.scope||""))return;
   target.classList.add("is-drop-target");
   drag.target=target;
  };
  const finish=event=>{
   if(!drag)return;
   const target=drag.target;
   const sourceId=drag.id;
   const targetId=target?.dataset[idField];
   const sameScope=!target||!scopeField||String(target.dataset[scopeField]||"")===String(drag.scope||"");
   clear();
   if(event.pointerType==="touch"&&targetId&&sourceId!==targetId&&sameScope)reorder(sourceId,targetId);
  };
  const cancel=()=>clear();
  container.addEventListener("pointerdown",event=>{
   if(event.pointerType!=="touch")return;
   const handle=event.target.closest("[data-touch-drag-handle]");
   const row=handle?.closest(rowSelector);
   if(!row||row.draggable===false)return;
   event.preventDefault();
   drag={id:row.dataset[idField],scope:scopeField?row.dataset[scopeField]:"",row,target:null};
   row.classList.add("is-dragging");
   document.addEventListener("pointermove",move,{passive:false});
   document.addEventListener("pointerup",finish);
   document.addEventListener("pointercancel",cancel);
  },{passive:false});
 }
 function bindTreeDrag(){
  const tree=$("categoryTree");if(!tree)return;
  tree.addEventListener("dragstart",event=>{
   const row=event.target.closest("[data-category-id]");if(!row||row.draggable===false)return;
   state.categoryDrag=row.dataset.categoryId;row.classList.add("is-dragging");
   event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",state.categoryDrag);
  });
  tree.addEventListener("dragover",event=>{
   const target=event.target.closest("[data-category-id]");if(!target||!state.categoryDrag)return;
   const source=categoryById(state.categoryDrag),dest=categoryById(target.dataset.categoryId);
   if(!source||!dest||String(source.parent_id||"")!==String(dest.parent_id||""))return;
   event.preventDefault();tree.querySelectorAll(".is-drop-target").forEach(x=>x.classList.remove("is-drop-target"));target.classList.add("is-drop-target");
  });
  tree.addEventListener("drop",async event=>{
   const target=event.target.closest("[data-category-id]");if(!target||!state.categoryDrag)return;
   event.preventDefault();const dragged=state.categoryDrag;state.categoryDrag=null;tree.querySelectorAll(".is-dragging,.is-drop-target").forEach(x=>x.classList.remove("is-dragging","is-drop-target"));
   const source=categoryById(dragged),dest=categoryById(target.dataset.categoryId);
   if(!source||!dest||String(source.parent_id||"")!==String(dest.parent_id||"")){toast("Reorder within the same level. Use Edit to move a category to another parent.","error");return;}
   await reorderCategory(dragged,dest.id);
  });
  tree.addEventListener("dragend",()=>{state.categoryDrag=null;tree.querySelectorAll(".is-dragging,.is-drop-target").forEach(x=>x.classList.remove("is-dragging","is-drop-target"));});
  bindTouchReorder(tree,"[data-category-id]","categoryId","parentId",reorderCategory);
 }
 function bindProductDrag(){
  const list=$("productSortList");if(!list)return;
  list.addEventListener("dragstart",event=>{
   if(String($("productSortSearch")?.value||"").trim())return;
   const row=event.target.closest("[data-product-id]");if(!row)return;
   state.productDrag=row.dataset.productId;row.classList.add("is-dragging");event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",state.productDrag);
  });
  list.addEventListener("dragover",event=>{
   const row=event.target.closest("[data-product-id]");if(!row||!state.productDrag)return;
   event.preventDefault();list.querySelectorAll(".is-drop-target").forEach(x=>x.classList.remove("is-drop-target"));row.classList.add("is-drop-target");
  });
  list.addEventListener("drop",async event=>{
   const row=event.target.closest("[data-product-id]");if(!row||!state.productDrag)return;
   event.preventDefault();const dragged=state.productDrag;state.productDrag=null;list.querySelectorAll(".is-dragging,.is-drop-target").forEach(x=>x.classList.remove("is-dragging","is-drop-target"));
   await reorderProduct(dragged,row.dataset.productId);
  });
  list.addEventListener("dragend",()=>{state.productDrag=null;list.querySelectorAll(".is-dragging,.is-drop-target").forEach(x=>x.classList.remove("is-dragging","is-drop-target"));});
  bindTouchReorder(list,"[data-product-id]","productId",null,reorderProduct);
 }
 function setupEvents(){
  document.querySelectorAll("[data-catalog-refresh]").forEach(btn=>btn.addEventListener("click",()=>reload(true)));
  $("categoryTreeSearch")?.addEventListener("input",renderExplorer);$("categoryTreeVisibility")?.addEventListener("change",renderExplorer);
   $("categoryBackBtn")?.addEventListener("click",()=>{const selected=categoryById(state.selectedCategoryId);state.selectedCategoryId=selected?.parent_id||null;$("categoryTreeSearch").value="";renderPage();});
   $("addChildCategory")?.addEventListener("click",()=>{if(state.selectedCategoryId)openCategoryEditor(null,state.selectedCategoryId);});
   $("homeSortToggle")?.addEventListener("click",()=>{state.view="home";renderPage();});
   $("productSortBackBtn")?.addEventListener("click",()=>{state.view="categories";state.selectedCategoryId=null;renderPage();});

  $("addRootCategory")?.addEventListener("click",()=>openCategoryEditor());
  $("categoryForm")?.addEventListener("submit",saveCategory);
  $("undoCategoryOrder")?.addEventListener("click",()=>undoLastOrder("category"));
  $("undoProductOrder")?.addEventListener("click",()=>undoLastOrder("product"));
  $("productSortSearch")?.addEventListener("input",renderSorting);
  $("quickProductForm")?.addEventListener("submit",saveQuickProduct);
  $("categoryName")?.addEventListener("input",()=>{if(!$("categorySlug").readOnly)$("categorySlug").value=slugify($("categoryName").value);});
  document.addEventListener("click",event=>{
   const close=event.target.closest("[data-close-catalog-dialog]");if(close){document.querySelectorAll("dialog[open]").forEach(d=>d.close());return;}
   const breadcrumb=event.target.closest("[data-cat-breadcrumb]");if(breadcrumb){state.view="categories";state.selectedCategoryId=breadcrumb.dataset.catBreadcrumb==="root"?null:breadcrumb.dataset.catBreadcrumb;$("categoryTreeSearch").value="";renderPage();return;}
   const enter=event.target.closest("[data-cat-enter]");if(enter){state.view="categories";state.selectedCategoryId=enter.dataset.catEnter;$("categoryTreeSearch").value="";$("categoryTreeVisibility").value="all";$("productSortSearch").value="";renderPage();return;}
   const edit=event.target.closest("[data-cat-edit]");if(edit){openCategoryEditor(edit.dataset.catEdit);return;}
   const toggle=event.target.closest("[data-cat-toggle]");if(toggle){toggleCategory(toggle.dataset.catToggle);return;}
   const addChild=event.target.closest("[data-cat-add-child]");if(addChild){openCategoryEditor(null,addChild.dataset.catAddChild);return;}
   const catUp=event.target.closest("[data-cat-up]");if(catUp){reorderCategory(catUp.dataset.catUp,-1);return;}
   const catDown=event.target.closest("[data-cat-down]");if(catDown){reorderCategory(catDown.dataset.catDown,1);return;}
   const productEdit=event.target.closest("[data-product-edit]");if(productEdit){openQuickProductEditor(productEdit.dataset.productEdit);return;}
   const productUp=event.target.closest("[data-product-up]");if(productUp){reorderProduct(productUp.dataset.productUp,-1);return;}
   const productDown=event.target.closest("[data-product-down]");if(productDown){reorderProduct(productDown.dataset.productDown,1);return;}
  });
  bindImagePreview("categoryImageFile","categoryImageUrl","categoryImagePreview","categoryImagePreviewNote");
  bindImagePreview("quickProductImageFile","quickProductImageUrl","quickProductImagePreview","quickProductImagePreviewNote");
  bindTreeDrag();bindProductDrag();
 }
 setupEvents();
 await reload();
 window.HFAdminRefresh=reload;
});
})();
(() => {
"use strict";
window.HFAdminReady.then(async H => {
 if(!H)return;
 const {client,esc,money,toast,audit,slugify}=H;
 const page=document.body.dataset.page||"categories";
 const $=id=>document.getElementById(id);
 const state={categories:[],products:[],loading:false,categoryDrag:null,productDrag:null,lastUndo:null};
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
 async function reload(showToast=false){
  if(state.loading)return;
  state.loading=true;
  try{
   const [catRes,prodRes]=await Promise.all([
    client.from("categories").select("id,name,slug,parent_id,description,image_url,is_active,sort_order,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}).limit(1000),
    client.from("products").select("id,name,slug,sku,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,description,stock_quantity,is_active,is_featured,sort_order,home_sort_order,seo_title,seo_description,cms_created,cms_managed,created_at,updated_at").order("sort_order",{ascending:true}).order("name",{ascending:true}).order("id",{ascending:true}).limit(5000)
   ]);
   if(catRes.error)throw catRes.error;if(prodRes.error)throw prodRes.error;
   state.categories=catRes.data||[];state.products=prodRes.data||[];
   renderPage();
   if(showToast)toast("Catalog refreshed.");
  }catch(error){
   console.error("Catalog workspace could not load",error);
   toast(error?.message||"Could not load the catalog. Refresh and try again.","error");
  }finally{state.loading=false;}
 }
 function renderPage(){
  if(page==="categories")renderHub();
  if(page==="categories-tree")renderTree();
  if(page==="categories-sorting")renderSorting();
  if(page==="categories-settings")renderSettings();
 }
 function renderHub(){
  const total=state.categories.length,nested=state.categories.filter(c=>c.parent_id).length,activeProducts=state.products.filter(p=>p.is_active).length;
  const hidden=state.categories.filter(c=>!c.is_active).length+state.products.filter(p=>!p.is_active).length;
  if($("catalogCategoryCount"))$("catalogCategoryCount").textContent=String(total);
  if($("catalogProductCount"))$("catalogProductCount").textContent=String(activeProducts);
  if($("catalogNestedCount"))$("catalogNestedCount").textContent=String(nested);
  if($("catalogHiddenCount"))$("catalogHiddenCount").textContent=String(hidden);
  const box=$("catalogHubTree");if(!box)return;
  const roots=childrenOf(null);
  box.innerHTML=roots.length?roots.map(cat=>'<div class="catalog-hub-row"><span aria-hidden="true">▰</span><strong>'+esc(cat.name)+'</strong><small>'+categoryProductCount(cat)+' products · '+(cat.is_active?"Visible":"Hidden")+'</small><a class="catalog-text-link" href="./categories-tree.html">Edit</a></div>'+childrenOf(cat.id).map(child=>'<div class="catalog-hub-row is-child"><span aria-hidden="true">↳</span><strong>'+esc(child.name)+'</strong><small>'+categoryProductCount(child)+' products</small></div>'+childrenOf(child.id).map(grand=>'<div class="catalog-hub-row is-child" style="margin-left:50px"><span aria-hidden="true">↳</span><strong>'+esc(grand.name)+'</strong><small>'+categoryProductCount(grand)+' products</small></div>').join("")).join("")).join(""):'<div class="hf-empty">No categories have been created yet.</div>';
 }
 function categoryNodeMarkup(category,search="",filter="all"){
  const depth=depthOf(category),children=childrenOf(category.id);
  const query=search.toLowerCase();
  const descendantMatches=child=>[child,...[...descendantsOf(child.id)].map(id=>categoryById(id)).filter(Boolean)].some(c=>(c.name+" "+c.slug).toLowerCase().includes(query)&&(filter==="all"||(filter==="active"?c.is_active:!c.is_active)));
  const ownMatch=(!query||(category.name+" "+category.slug).toLowerCase().includes(query))&&(filter==="all"||(filter==="active"?category.is_active:!category.is_active));
  const visible=ownMatch||children.some(descendantMatches);
  if((query||filter!=="all")&&!visible)return "";
  const childMarkup=children.map(child=>categoryNodeMarkup(child,search,filter)).join("");
  const canReorder=!query&&filter==="all";
  const childButton=depth<3?'<button class="catalog-mini-button" type="button" data-cat-add-child="'+esc(category.id)+'" title="Add child category">＋ Child</button>':"";
  return '<article class="catalog-tree-node" data-node-id="'+esc(category.id)+'">'+
   '<div class="catalog-tree-row" draggable="'+String(canReorder)+'" data-category-id="'+esc(category.id)+'" data-parent-id="'+esc(category.parent_id||"")+'">'+
    '<span class="catalog-tree-grip" aria-hidden="true" title="Drag to reorder">⠿</span>'+
    '<div class="catalog-tree-info"><div class="catalog-tree-title"><strong>'+esc(category.name)+'</strong><span class="catalog-tree-level">'+(depth===1?"Category":depth===2?"Subcategory":"Child category")+'</span></div><small>/'+esc(category.slug)+' · '+categoryProductCount(category)+' products</small></div>'+
    '<span class="catalog-tree-product-count">'+(category.is_active?'<span class="hf-status hf-status-active">Visible</span>':'<span class="hf-status hf-status-hidden">Hidden</span>')+'</span>'+
    '<div class="catalog-tree-actions">'+
     '<button class="catalog-mini-button" type="button" data-cat-up="'+esc(category.id)+'" '+(!canReorder?"disabled":"")+' aria-label="Move '+esc(category.name)+' up">↑</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-down="'+esc(category.id)+'" '+(!canReorder?"disabled":"")+' aria-label="Move '+esc(category.name)+' down">↓</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-edit="'+esc(category.id)+'">Edit</button>'+
     '<button class="catalog-mini-button" type="button" data-cat-toggle="'+esc(category.id)+'">'+(category.is_active?"Hide":"Show")+'</button>'+
     childButton+
    '</div>'+
   '</div>'+
   (childMarkup?'<div class="catalog-tree-branch">'+childMarkup+'</div>':"")+
  '</article>';
 }
 function renderTree(){
  const tree=$("categoryTree");if(!tree)return;
  updateUndoButtons();
  const search=$("categoryTreeSearch")?.value||"",filter=$("categoryTreeVisibility")?.value||"all";
  tree.innerHTML=childrenOf(null).map(c=>categoryNodeMarkup(c,search,filter)).join("");
  $("categoryTreeCount").textContent=state.categories.length+" categories · "+state.categories.filter(c=>!c.parent_id).length+" top-level categories";
  $("categoryTreeEmpty").hidden=!!tree.children.length;
 }
 function renderSettings(){
  const body=$("categorySettingsBody");if(!body)return;
  const search=String($("categorySettingsSearch")?.value||"").toLowerCase().trim(),filter=$("categorySettingsFilter")?.value||"all";
  const rows=orderedCategories().filter(c=>{
   const matches=(!search||(c.name+" "+c.slug+" "+categoryPath(c)).toLowerCase().includes(search));
   const visible=effectiveActive(c);
   return matches&&(filter==="all"||(filter==="active"?visible:!visible));
  });
  body.innerHTML=rows.length?rows.map(c=>{
   const depth=depthOf(c),status=effectiveActive(c);
   return '<tr><td><div class="catalog-table-category">'+(c.image_url?'<img class="catalog-table-image" src="'+esc(c.image_url)+'" alt="" loading="lazy">':'<span class="catalog-table-image catalog-table-image-empty">No image</span>')+'<div><strong>'+esc(c.name)+'</strong><small>/'+esc(c.slug)+'</small></div></div></td>'+
    '<td><div class="catalog-parent-label">'+esc(categoryPath(c))+'</div><small>'+(depth===1?"Category":depth===2?"Subcategory":"Child category")+'</small></td>'+
    '<td>'+categoryProductCount(c)+'</td><td>'+ (status?'<span class="hf-status hf-status-active">Visible</span>':'<span class="hf-status hf-status-hidden">Hidden</span>')+'</td>'+
    '<td>'+esc(c.updated_at?new Date(c.updated_at).toLocaleDateString("en-BD"):"—")+'</td>'+
    '<td><div class="hf-table-actions"><button class="hf-button hf-button-secondary hf-button-small" type="button" data-cat-edit="'+esc(c.id)+'">Edit</button><button class="hf-button hf-button-secondary hf-button-small catalog-settings-toggle" type="button" data-cat-toggle="'+esc(c.id)+'">'+(c.is_active?"Hide":"Show")+'</button></div></td></tr>';
  }).join(""):'<tr><td colspan="6" class="hf-empty">No categories match this filter.</td></tr>';
  $("categorySettingsEmpty").hidden=!!rows.length;
 }
 function fillSortCategory(){
  const select=$("sortCategory");if(!select)return;
  const previous=select.value;
  select.innerHTML='<option value="">Choose a category</option>'+orderedCategories().map(c=>'<option value="'+esc(c.slug)+'">'+esc("— ".repeat(Math.max(0,depthOf(c)-1))+c.name)+'</option>').join("");
  if(state.categories.some(c=>c.slug===previous))select.value=previous;
  else select.value=childrenOf(null)[0]?.slug||"";
 }
 function productRowMarkup(product,index,total,canDrag){
  return '<article class="product-sort-item" draggable="'+String(canDrag)+'" data-product-id="'+esc(product.id)+'">'+
   '<span class="product-sort-grip" aria-hidden="true" title="Drag to reorder">⠿</span>'+
   (product.image_url?'<img class="product-sort-image" src="'+esc(product.image_url)+'" alt="" loading="lazy">':'<span class="product-sort-image product-sort-image-empty">No image</span>')+
   '<div class="product-sort-main"><strong>'+esc(product.name)+'</strong><small>'+esc(product.sku||product.slug)+' · '+esc(categoryPath(categoryBySlug(product.category_slug)||{name:product.category||"Unassigned"}))+'</small><div class="product-sort-meta"><span class="product-sort-price">'+esc(product.display_price||money(product.price))+'</span><span class="hf-status '+(product.is_active?"hf-status-active":"hf-status-hidden")+'">'+(product.is_active?"Visible":"Hidden")+'</span>'+(product.is_featured?'<span class="hf-status hf-status-review">Featured</span>':"")+'</div></div>'+
   '<div class="product-sort-actions"><button type="button" class="catalog-mini-button" data-product-up="'+esc(product.id)+'" '+(index===0||!canDrag?"disabled":"")+' aria-label="Move '+esc(product.name)+' up">↑</button><button type="button" class="catalog-mini-button" data-product-down="'+esc(product.id)+'" '+(index===total-1||!canDrag?"disabled":"")+' aria-label="Move '+esc(product.name)+' down">↓</button><button type="button" class="catalog-mini-button" data-product-edit="'+esc(product.id)+'">Quick edit</button></div></article>';
 }
 function renderSorting(){
  const mode=$("sortMode")?.value||"category",categorySlug=$("sortCategory")?.value||"";
  updateUndoButtons();
  const wrap=$("sortCategoryWrap");if(wrap)wrap.hidden=mode==="home";
  if(mode==="category"&&!categorySlug){fillSortCategory();}
  const selectedSlug=$("sortCategory")?.value||categorySlug;
  let all=mode==="home"?state.products.filter(p=>p.is_active).sort((a,b)=>Number(a.home_sort_order??1000000)-Number(b.home_sort_order??1000000)||orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name))):
   state.products.filter(p=>p.category_slug===selectedSlug).sort((a,b)=>orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)));
  const search=String($("productSortSearch")?.value||"").toLowerCase().trim();
  const filtered=search?all.filter(p=>(p.name+" "+p.slug+" "+(p.sku||"")).toLowerCase().includes(search)):all;
  const list=$("productSortList");if(!list)return;
  const canDrag=!search;
  list.innerHTML=filtered.length?filtered.map((p,i)=>productRowMarkup(p,i,filtered.length,canDrag)).join(""):"";
  $("productSortEmpty").hidden=!!filtered.length;
  $("sortingVisibleCount").textContent=String(all.length);
  $("sortingActiveCount").textContent=String(all.filter(p=>p.is_active).length);
  $("sortingHiddenCount").textContent=String(all.filter(p=>!p.is_active).length);
  $("sortingScopeNote").textContent=mode==="home"?"Homepage order · active products":"Products assigned to "+(categoryBySlug(selectedSlug)?.name||"the selected category");
  $("productSortStatus").textContent=search?"Clear search to reorder the complete list.":"Drag to reorder · changes save after drop.";
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
  setStatus("categoryTreeStatus","Saving category order…");
  const {error}=await client.rpc("admin_reorder_categories",{p_parent_id:parentId||null,p_category_ids:ids});
  if(error){if(recordUndo)state.lastUndo=null;updateUndoButtons();toast(error.message||"Category order could not be saved.","error");await reload();return false;}
  state.lastUndo=recordUndo?{kind:"category",parentId:parentId||null,ids:previousIds}:null;
  await audit?.(isUndo?"catalog.category.reorder_undone":"catalog.category.reordered","category",parentId||null,(isUndo?"Restored ":"Reordered ")+ids.length+" sibling categories",{parent_id:parentId||null,category_ids:ids});
  toast(isUndo?"Previous category order restored.":"Category order saved.");await reload();return true;
 }
 async function reorderCategory(id,directionOrTarget){
  const item=categoryById(id);if(!item)return;
  const siblings=childrenOf(item.parent_id||null),ids=siblings.map(c=>c.id),from=ids.indexOf(id);
  let to=typeof directionOrTarget==="number"?from+directionOrTarget:ids.indexOf(directionOrTarget);
  if(from<0||to<0||to>=ids.length||from===to)return;
  const previousIds=ids.slice();const [moved]=ids.splice(from,1);ids.splice(to,0,moved);
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
  const {error}=await client.storage.from("store-content").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
  if(error)throw error;
  return client.storage.from("store-content").getPublicUrl(path).data.publicUrl;
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
   const row={name,slug,parent_id:parentId,description:$("categoryDescription").value.trim(),image_url:image,
    seo_title:$("categorySeoTitle").value.trim()||name+" | Halal Food",
    seo_description:$("categorySeoDescription").value.trim()||$("categoryDescription").value.trim().slice(0,155),
    sort_order:Number($("categorySortOrder").value||0),is_active:$("categoryActive").checked,
    cms_created:old?Boolean(old.cms_created):true,cms_managed:true,updated_at:new Date().toISOString()};
   const result=id?await client.from("categories").update(row).eq("id",id).select("id").single():await client.from("categories").insert(row).select("id").single();
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
  const {error}=await client.from("categories").update({is_active:!item.is_active,updated_at:new Date().toISOString()}).eq("id",id);
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
  setStatus("productSortStatus","Saving product order…");
  const rpc=mode==="home"?"admin_reorder_home_products":"admin_reorder_products";
  const args=mode==="home"?{p_product_ids:ids}:{p_category_slug:categorySlug,p_product_ids:ids};
  const {error}=await client.rpc(rpc,args);
  if(error){if(recordUndo)state.lastUndo=null;updateUndoButtons();toast(error.message||"Product order could not be saved.","error");await reload();return false;}
  state.lastUndo=recordUndo?{kind:"product",mode,categorySlug:categorySlug||null,ids:previousIds}:null;
  await audit?.(isUndo?"catalog.product.reorder_undone":(mode==="home"?"catalog.product.home_reordered":"catalog.product.category_reordered"),"product",null,(isUndo?"Restored ":"Reordered ")+ids.length+" products",{mode,category_slug:categorySlug||null});
  toast(isUndo?"Previous product order restored.":(mode==="home"?"Homepage product order saved.":"Category product order saved."));await reload();return true;
 }
 async function undoLastOrder(kind){
  const undo=state.lastUndo;if(!undo||undo.kind!==kind)return;
  if(kind==="category")await persistCategoryOrder(undo.parentId,undo.ids,null,false,true);
  else await persistProductOrder(undo.mode,undo.categorySlug,undo.ids,null,false,true);
 }
 async function reorderProduct(id,directionOrTarget){
  const mode=$("sortMode")?.value||"category",slug=$("sortCategory")?.value||"";
  let list=mode==="home"?state.products.filter(p=>p.is_active).sort((a,b)=>Number(a.home_sort_order??1000000)-Number(b.home_sort_order??1000000)||orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name))):
   state.products.filter(p=>p.category_slug===slug).sort((a,b)=>orderOf(a)-orderOf(b)||String(a.name).localeCompare(String(b.name)));
  const ids=list.map(p=>p.id),from=ids.indexOf(id);
  let to=typeof directionOrTarget==="number"?from+directionOrTarget:ids.indexOf(directionOrTarget);
  if(from<0||to<0||to>=ids.length||from===to)return;
  const previousIds=ids.slice();const [moved]=ids.splice(from,1);ids.splice(to,0,moved);
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
    description:$("quickProductFullDescription").value.trim(),seo_title:$("quickProductSeoTitle").value.trim()||name+" | Halal Food",
    seo_description:$("quickProductSeoDescription").value.trim()||$("quickProductShortDescription").value.trim().slice(0,155),
    is_active:$("quickProductActive").checked,is_featured:$("quickProductFeatured").checked,
    ...(moved?{sort_order:newOrder}:{}),updated_at:new Date().toISOString()};
   const {error}=await client.from("products").update(row).eq("id",id);
   if(error)throw error;
   $("quickProductDialog").close();await audit?.("catalog.product.quick_updated","product",id,name,{category_slug:category.slug});
   await reload();toast("Product updated. The live catalog will use the saved details.");
  }catch(error){setStatus("quickProductFormError",error.message||"Could not save product.",true);}
  finally{button.disabled=false;}
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
 }
 function setupEvents(){
  document.querySelectorAll("[data-catalog-refresh]").forEach(btn=>btn.addEventListener("click",()=>reload(true)));
  $("categoryTreeSearch")?.addEventListener("input",renderTree);$("categoryTreeVisibility")?.addEventListener("change",renderTree);
  $("categorySettingsSearch")?.addEventListener("input",renderSettings);$("categorySettingsFilter")?.addEventListener("change",renderSettings);
  $("addRootCategory")?.addEventListener("click",()=>openCategoryEditor());
  $("settingsAddCategory")?.addEventListener("click",()=>openCategoryEditor());
  $("categoryForm")?.addEventListener("submit",saveCategory);
  $("undoCategoryOrder")?.addEventListener("click",()=>undoLastOrder("category"));
  $("undoProductOrder")?.addEventListener("click",()=>undoLastOrder("product"));
  $("sortMode")?.addEventListener("change",renderSorting);
  $("sortCategory")?.addEventListener("change",renderSorting);
  $("productSortSearch")?.addEventListener("input",renderSorting);
  $("quickProductForm")?.addEventListener("submit",saveQuickProduct);
  $("categoryName")?.addEventListener("input",()=>{if(!$("categorySlug").readOnly)$("categorySlug").value=slugify($("categoryName").value);});
  document.addEventListener("click",event=>{
   const close=event.target.closest("[data-close-catalog-dialog]");if(close){document.querySelectorAll("dialog[open]").forEach(d=>d.close());return;}
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
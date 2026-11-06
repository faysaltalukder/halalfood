(() => {
  'use strict';
  const API_BASE = 'https://br-muddy-lake-a1tcb0n1-groceryapi.compute.c-1.ap-southeast-1.aws.neon.tech';
  const CATEGORY = 'ecommerce-grocery';
  const templates = [
    { key:'general-supermarket', number:'01', name:'General Supermarket', short:'The complete everyday grocery store', desc:'A familiar supermarket experience for families and everyday shopping baskets. Built for broad catalogues, promotions and repeat orders.', segment:'Daily grocery & supermarket', style:'supermarket', accent:'#2f7657', hero:'Your everyday market, delivered.', heroText:'Everything your home needs, in one easy shop.', art:'🛒', categories:[['🥬','Vegetables'],['🍎','Fruits'],['🥛','Dairy'],['🍞','Bakery'],['🥫','Pantry'],['🧼','Household']], tags:['Large product catalogue','Daily deals','Family shopping','Reorder & pickup'], samples:[['🥬','Fresh spinach','৳45'],['🍎','Red apples','৳220'],['🥛','Fresh milk','৳90'],['🍞','Whole wheat bread','৳75']] },
    { key:'fresh-produce', number:'02', name:'Fresh & Farm', short:'Freshness-led produce shopping', desc:'An editorial, premium storefront for fruit, vegetables, dairy, meat, fish and farm-to-home sellers.', segment:'Fresh produce & premium food', style:'fresh', accent:'#55714b', hero:'Fresh from the source.', heroText:'Seasonal picks and good food, selected with care.', art:'🥑', categories:[['🥑','Organic'],['🍓','Berries'],['🥕','Vegetables'],['🥩','Fresh meat'],['🐟','Fish'],['🥚','Dairy & eggs']], tags:['Seasonal collections','Variable weight','Product origin','Substitution choices'], samples:[['🥑','Avocado','৳160'],['🍓','Fresh berries','৳280'],['🥕','Farm carrots','৳65'],['🥚','Farm eggs','৳145']] },
    { key:'express-grocery', number:'03', name:'Express Grocery', short:'Fast essentials, fewer steps', desc:'A mobile-first convenience store for quick add-to-cart, local delivery zones and small urgent baskets.', segment:'Convenience & express delivery', style:'express', accent:'#c15d35', hero:'Need it? Get it today.', heroText:'Everyday essentials, just a few taps away.', art:'🚲', categories:[['🥤','Drinks'],['🍫','Snacks'],['🍜','Instant food'],['🧻','Essentials'],['🍼','Baby care'],['🔋','Quick needs']], tags:['Quick add-to-cart','Sticky cart','Delivery zones','Fast reorder'], samples:[['🥤','Orange juice','৳85'],['🍫','Chocolate bar','৳55'],['🍜','Instant noodles','৳35'],['🧻','Tissue pack','৳65']] },
    { key:'wholesale-bulk', number:'04', name:'Wholesale & Bulk', short:'Built for repeat business orders', desc:'A professional B2B grocery catalogue for shops, restaurants, hotels and bulk food suppliers.', segment:'Wholesale & business supply', style:'wholesale', accent:'#314866', hero:'Supply smarter. Buy in bulk.', heroText:'Reliable grocery supply for growing businesses.', art:'📦', categories:[['🌾','Grains'],['🛢️','Cooking oil'],['🫘','Pulses'],['🍚','Rice'],['🧂','Spices'],['📦','Bulk packs']], tags:['Tiered pricing','Minimum quantities','Quick order sheet','Quote requests'], samples:[['🍚','Premium rice · 25 kg','৳1,850'],['🛢️','Soybean oil · 5 L','৳820'],['🫘','Lentils · 10 kg','৳1,250'],['🌾','Wheat flour · 25 kg','৳1,450']] }
  ];
  const categoryNames = {'ecommerce-grocery':'E-commerce & Grocery','clothing-fashion':'Clothing & Fashion','medicine-pharmacy':'Medicine & Pharmacy','hospital-healthcare':'Hospital & Healthcare','real-estate':'Real Estate & Property','restaurant-food':'Restaurant & Food','education-training':'Education & Training','travel-tourism':'Travel & Tourism','hotel-accommodation':'Hotel & Accommodation','beauty-salon':'Beauty & Salon','fitness-gym':'Fitness & Gym','automotive-services':'Automotive & Vehicle Services','professional-services':'Professional & Business Services','construction-interior':'Construction & Interior','events-weddings':'Event & Wedding Services','portfolio-agency':'Portfolio & Creative Agency','news-media':'News & Media','nonprofit-organization':'Nonprofit & Organization','logistics-delivery':'Logistics & Delivery','legal-accounting':'Legal & Accounting'};
  const params = new URLSearchParams(location.search);
  const category = params.get('category') || CATEGORY;
  const selectedNumber = Math.max(1, Math.min(4, Number(params.get('template') || 1)));
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => '৳' + Number(value || 0).toLocaleString('en-BD', {maximumFractionDigits:2});
  const state = { token:'', apiReady:false, currentTemplate:null, currentWebsite:null, websiteData:null, websites:[], templates:[], selectedFile:null, logoFile:null, selectedImageUrl:'', logoImageUrl:'', draggedProductId:null, previewOnly:false, device:'desktop', toastTimer:null };

  function toast(message, error=false) {
    const node=$('wptToast'); if(!node)return;
    node.textContent=message; node.classList.toggle('is-error',error); node.classList.add('is-visible');
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>node.classList.remove('is-visible'),3600);
  }
  function setBackendState(label, status='') {
    const node=$('wptBackendState'); if(!node)return;
    node.className='hf-wpt-backend-state'+(status?' is-'+status:'');
    node.querySelector('span').textContent=label;
  }
  async function api(path, options={}) {
    if(!state.token) throw new Error('Your secure admin session is not available. Please sign in again.');
    const response=await fetch(API_BASE+path,{...options,headers:{'content-type':'application/json','authorization':'Bearer '+state.token,...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.error||('Backend request failed ('+response.status+').'));
    return body;
  }
  async function refreshToken(H) {
    const result=await H.client.auth.getSession();
    if(result.error||!result.data?.session?.access_token) throw new Error('Admin session expired. Please sign in again.');
    state.token=result.data.session.access_token;
  }
  function mockPreview(template) {
    return `<div class="hf-wpt-mock ${template.style}" aria-hidden="true"><div class="hf-wpt-mock-browser"><i></i><i></i><i></i><span>${escapeHtml(template.name.toLowerCase().replaceAll(' ','-'))}.store</span></div><div class="hf-wpt-mock-body"><div class="hf-wpt-mock-nav"><strong>${escapeHtml(template.name.split(' ')[0])} Market</strong><small>Shop&nbsp;&nbsp; Categories&nbsp;&nbsp; About&nbsp;&nbsp; Cart</small></div><div class="hf-wpt-mock-hero"><div><strong>${escapeHtml(template.hero)}</strong><small>${escapeHtml(template.heroText)}</small></div><em>${template.art}</em></div><div class="hf-wpt-mock-cats">${template.categories.slice(0,4).map(item=>`<i>${item[0]}</i>`).join('')}</div><div class="hf-wpt-mock-products">${template.samples.map(item=>`<div class="hf-wpt-mock-product"><i>${item[0]}</i><small>${escapeHtml(item[1])}</small><b>${item[2]}</b></div>`).join('')}</div></div></div>`;
  }
  function renderLibrary() {
    const grid=$('wpTemplateSlots'); if(!grid)return;
    const installedByTemplate=new Map();
    state.websites.forEach(site=>{installedByTemplate.set(site.template_key,(installedByTemplate.get(site.template_key)||[]).concat(site));});
    $('wptInstalledCount').textContent=String(state.websites.length);
    grid.innerHTML=templates.map(template=>{
      const sites=installedByTemplate.get(template.key)||[];
      const tags=template.tags.map(tag=>`<span>${escapeHtml(tag)}</span>`).join('');
      const openButton=sites.length?`<button type="button" data-wpt-open-site="${escapeHtml(sites[0].id)}">Open installed store</button>`:'';
      return `<article class="hf-wpt-template-card"><div class="hf-wpt-card-top"><span class="hf-wpt-card-index">TEMPLATE ${template.number}</span><span class="hf-wpt-card-badge ${sites.length?'is-installed':''}">${sites.length?sites.length+' INSTALLED':'BUILT-IN TEMPLATE'}</span></div>${mockPreview(template)}<div class="hf-wpt-card-copy"><div class="hf-wpt-card-title-row"><h3>${escapeHtml(template.name)}</h3></div><p>${escapeHtml(template.desc)}</p><div class="hf-wpt-tags">${tags}</div><div class="hf-wpt-card-actions"><button type="button" data-wpt-preview="${template.key}">View design</button><button type="button" class="primary" data-wpt-install="${template.key}">Install template</button>${openButton}</div></div></article>`;
    }).join('');
    grid.querySelectorAll('[data-wpt-preview]').forEach(button=>button.addEventListener('click',()=>openTemplatePreview(button.dataset.wptPreview)));
    grid.querySelectorAll('[data-wpt-install]').forEach(button=>button.addEventListener('click',()=>showInstallDialog(button.dataset.wptInstall)));
    grid.querySelectorAll('[data-wpt-open-site]').forEach(button=>button.addEventListener('click',()=>openInstalledWebsite(button.dataset.wptOpenSite)));
  }
  function showInstallDialog(templateKey) {
    state.currentTemplate=templates.find(item=>item.key===templateKey)||templates[0];
    $('wptInstallDescription').textContent=state.currentTemplate.name+' will be installed as a new draft store in your Neon workspace.';
    $('wptInstallName').value=state.previewOnly && state.websiteData?.website?.name ? state.websiteData.website.name : 'My '+state.currentTemplate.name.replace('General ','')+' Store';
    $('wptInstallDialog').showModal();
  }
  async function installTemplate(name) {
    if(!state.apiReady) throw new Error('Neon backend is not ready. Check the connection status and try again.');
    const template=state.currentTemplate; if(!template)throw new Error('Choose a template first.');
    const accent=state.previewOnly ? $('wptBrandColor').value : template.accent;
    const body=await api('/websites',{method:'POST',body:JSON.stringify({name,template_key:template.key,brand:{accent},settings:{delivery:{mode:template.key==='express-grocery'?'express':template.key==='wholesale-bulk'?'bulk':'standard'},currency:'BDT'}})});
    state.currentWebsite=body.website;
    await loadWebsite(body.website.id);
    $('wptInstallDialog').close();
    toast(template.name+' installed. Your new store is ready to customize.');
    openEditor();
    await loadWebsites();
  }
  function openTemplatePreview(templateKey) {
    state.currentTemplate=templates.find(item=>item.key===templateKey)||templates[0];
    state.currentWebsite=null; state.websiteData={website:{name:'My '+state.currentTemplate.name+' Store',brand:{accent:state.currentTemplate.accent},settings:{}},products:[],categories:[],assets:[],plugins:[]};
    state.previewOnly=true; state.selectedFile=null; state.logoFile=null;
    openEditor();
    $('wptEditorStatus').textContent='Preview mode · Install this template to save your own products and images.';
  }
  async function openInstalledWebsite(id) {
    try {
      const summary=state.websites.find(site=>site.id===id);
      state.currentTemplate=templates.find(item=>item.key===summary?.template_key)||templates[0];
      state.currentWebsite=summary; state.previewOnly=false;
      await loadWebsite(id); openEditor();
    } catch(error) { toast(error.message,true); }
  }
  async function loadWebsite(id) {
    const body=await api('/websites/'+encodeURIComponent(id));
    state.currentWebsite=body.website; state.websiteData=body; state.currentTemplate=templates.find(item=>item.key===body.website.template_key)||templates[0];
    state.previewOnly=false;
    renderEditor();
  }
  function openEditor() {
    $('wptEditor').hidden=false; $('wptEditor').scrollIntoView({behavior:'smooth',block:'start'});
    renderEditor();
  }
  function closeEditor() {
    $('wptEditor').hidden=true; $('wpTemplateSlots').scrollIntoView({behavior:'smooth',block:'start'});
    state.currentWebsite=null;state.websiteData=null;state.previewOnly=false;state.selectedFile=null;state.logoFile=null;
  }
  function assetUrlFor(key) {
    const asset=(state.websiteData?.assets||[]).find(item=>item.object_key===key);
    return asset?.view_url||'';
  }
  function renderProductList() {
    const list=$('wptProductList'); const products=state.websiteData?.products||[];
    if(!products.length){list.innerHTML='<p class="hf-wpt-empty-products">No products added yet. Add your first product above.</p>';return;}
    list.innerHTML=products.map(product=>{
      const image=assetUrlFor(product.image_key);
      return `<div class="hf-wpt-product-row" draggable="${!state.previewOnly}" data-product-id="${escapeHtml(product.id)}"><img src="${image||''}" alt="" ${image?'':'hidden'}><span class="no-image" ${image?'hidden':''}>🛍️</span><span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} / ${escapeHtml(product.unit||'piece')}</small></span><button type="button" data-wpt-remove-product="${escapeHtml(product.id)}" aria-label="Remove ${escapeHtml(product.name)}">×</button></div>`;
    }).join('');
    list.querySelectorAll('[data-wpt-remove-product]').forEach(button=>button.addEventListener('click',()=>removeProduct(button.dataset.wptRemoveProduct)));
    list.querySelectorAll('[draggable="true"]').forEach(row=>{
      row.addEventListener('dragstart',event=>{state.draggedProductId=row.dataset.productId;row.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';});
      row.addEventListener('dragend',()=>row.classList.remove('is-dragging'));
      row.addEventListener('dragover',event=>event.preventDefault());
      row.addEventListener('drop',event=>{event.preventDefault();reorderProducts(state.draggedProductId,row.dataset.productId);});
    });
  }
  function renderStorePreview() {
    const website=state.websiteData?.website||{}; const template=state.currentTemplate||templates[0];
    const brand=website.brand||{}; const accent=brand.accent||template.accent; const logo=assetUrlFor(brand.logo_key);
    const name=website.name||'My Grocery Store';
    const products=state.websiteData?.products?.length?state.websiteData.products:template.samples.map((sample,index)=>({id:'demo-'+index,name:sample[1],price:Number(sample[2].replace(/[^0-9.]/g,'')),unit:'piece',image_key:null,description:'Fresh quality grocery pick'}));
    const productMarkup=products.map((product,index)=>{
      const image=assetUrlFor(product.image_key);
      const art=template.samples[index%template.samples.length]?.[0]||'🛍️';
      return `<article class="wpt-store-product">${image?`<img src="${image}" alt="${escapeHtml(product.name)}">`:`<div class="wpt-store-product-art">${art}</div>`}<h4>${escapeHtml(product.name)}</h4><small>${escapeHtml(product.unit||'piece')} · ${Number(product.stock||0)>0?'In stock':'Stock on request'}</small><div class="wpt-store-product-foot"><b>${money(product.price)}</b><button type="button">＋ Add</button></div></article>`;
    }).join('');
    const categoryMarkup=template.categories.map(item=>`<div class="wpt-store-category"><i>${item[0]}</i><span>${escapeHtml(item[1])}</span></div>`).join('');
    const preview=$('wptPreviewCanvas');
    preview.classList.toggle('is-mobile',state.device==='mobile');
    preview.innerHTML=`<div class="wpt-store ${template.style}" style="--store-accent:${escapeHtml(accent)}"><header class="wpt-store-head"><div class="wpt-store-brand">${logo?`<img src="${logo}" alt="">`:''}<span>${escapeHtml(name)}</span></div><nav class="wpt-store-nav"><span>Home</span><span>Shop</span><span>Categories</span><span>About</span></nav><div class="wpt-store-tools">⌕ Search&nbsp;&nbsp; ♡&nbsp;&nbsp; 🛒 Cart</div></header><section class="wpt-store-hero"><div class="wpt-store-hero-copy"><span class="wpt-store-hero-kicker">${escapeHtml(template.segment.toUpperCase())}</span><h2>${escapeHtml(template.hero)}</h2><p>${escapeHtml(template.heroText)}</p><button type="button">Explore products</button></div><div class="wpt-store-hero-art">${template.art}</div></section><section class="wpt-store-section"><div class="wpt-store-section-head"><h3>Shop by category</h3><small>Explore the store →</small></div><div class="wpt-store-categories">${categoryMarkup}</div></section><section class="wpt-store-section"><div class="wpt-store-section-head"><h3>${template.key==='wholesale-bulk'?'Popular bulk supplies':'Popular products'}</h3><small>View all →</small></div><div class="wpt-store-products">${productMarkup}</div></section><div class="wpt-store-banner">${template.key==='wholesale-bulk'?'Business supply made simple · Bulk packs and repeat orders':template.key==='express-grocery'?'Your local essentials, ready when you need them':'Good food, easy shopping · Delivered to your door'}</div><footer class="wpt-store-footer">${escapeHtml(name)} · Contact · Delivery information · Returns & support</footer></div>`;
    $('wptPreviewAddress').textContent=(website.slug||'your-store')+'.preview';
  }
  function renderEditor() {
    if(!state.currentTemplate||!state.websiteData)return;
    const website=state.websiteData.website||{}; const brand=website.brand||{};
    $('wptEditorTitle').textContent=website.name||'Your grocery store';
    $('wptEditorSubtitle').textContent=state.currentTemplate.name+' · '+state.currentTemplate.short;
    $('wptInstalledPill').textContent=state.previewOnly?'● PREVIEW ONLY':'● INSTALLED DRAFT';
    $('wptInstallFromEditor').hidden=!state.previewOnly;
    $('wptSaveButton').hidden=state.previewOnly;
    $('wptSiteName').value=website.name||'';
    $('wptBrandColor').value=brand.accent||state.currentTemplate.accent;
    const logoUrl=assetUrlFor(brand.logo_key);
    $('wptLogoPreview').src=logoUrl||''; $('wptLogoPreview').hidden=!logoUrl;
    $('wptAddProduct').disabled=state.previewOnly;
    $('wptProductName').disabled=state.previewOnly;
    $('wptProductPrice').disabled=state.previewOnly;
    $('wptProductUnit').disabled=state.previewOnly;
    $('wptProductStock').disabled=state.previewOnly;
    $('wptProductCategory').disabled=state.previewOnly;
    $('wptProductDescription').disabled=state.previewOnly;
    $('wptProductImage').disabled=state.previewOnly;
    $('wptLogoFile').disabled=state.previewOnly;
    renderProductList(); renderStorePreview();
  }
  async function saveWebsite() {
    if(state.previewOnly||!state.currentWebsite)return;
    const siteName=$('wptSiteName').value.trim();
    if(!siteName){toast('Store name cannot be empty.',true);return;}
    const brand={...(state.websiteData.website.brand||{}),accent:$('wptBrandColor').value};
    const body=await api('/websites/'+state.currentWebsite.id,{method:'PATCH',body:JSON.stringify({name:siteName,brand})});
    state.websiteData.website=body.website;state.currentWebsite=body.website;
    $('wptEditorTitle').textContent=body.website.name;renderStorePreview();
    $('wptEditorStatus').textContent='Saved to Neon · '+new Date().toLocaleTimeString();
    toast('Store settings saved.');
  }
  async function uploadImage(file, altText='') {
    if(!file)return null;
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Use a JPG, PNG, WebP or GIF image.');
    if(file.size>5*1024*1024)throw new Error('Each image must be 5 MB or smaller.');
    const form=new FormData();form.append('file',file,file.name);form.append('alt_text',altText);
    const response=await fetch(API_BASE+'/websites/'+state.currentWebsite.id+'/assets/upload',{method:'POST',headers:{authorization:'Bearer '+state.token},body:form});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||'Image upload failed. Please retry.');
    return body.asset;
  }
  async function addProduct() {
    if(state.previewOnly||!state.currentWebsite)return;
    const name=$('wptProductName').value.trim(); if(!name){toast('Enter a product name first.',true);return;}
    const button=$('wptAddProduct');button.disabled=true;button.textContent='Uploading and saving…';
    try {
      let asset=null;
      if(state.selectedFile)asset=await uploadImage(state.selectedFile,name);
      await api('/websites/'+state.currentWebsite.id+'/products',{method:'POST',body:JSON.stringify({name,price:Number($('wptProductPrice').value||0),unit:$('wptProductUnit').value.trim()||'piece',stock:Number($('wptProductStock').value||0),description:$('wptProductDescription').value.trim(),category:$('wptProductCategory').value.trim(),image_key:asset?.object_key||null,sort_order:(state.websiteData.products||[]).length})});
      await loadWebsite(state.currentWebsite.id);
      ['wptProductName','wptProductPrice','wptProductCategory','wptProductDescription'].forEach(id=>$(id).value='');
      $('wptProductUnit').value='kg';$('wptProductStock').value='10';$('wptProductImagePreview').hidden=true;$('wptProductImagePreview').src='';$('wptProductImage').value='';state.selectedFile=null;state.selectedImageUrl='';
      toast('Product added to your Neon-backed catalogue.');
    } catch(error) { toast(error.message,true); }
    finally {button.disabled=false;button.textContent='＋ Add product to store';}
  }
  async function removeProduct(id) {
    if(!state.currentWebsite||!confirm('Remove this product from the store?'))return;
    try {await api('/websites/'+state.currentWebsite.id+'/products/'+id,{method:'DELETE'});await loadWebsite(state.currentWebsite.id);toast('Product removed.');}
    catch(error){toast(error.message,true);}
  }
  async function reorderProducts(fromId,toId) {
    if(!fromId||!toId||fromId===toId||!state.currentWebsite)return;
    const products=[...(state.websiteData.products||[])];const from=products.findIndex(item=>item.id===fromId);const to=products.findIndex(item=>item.id===toId);if(from<0||to<0)return;
    const [moved]=products.splice(from,1);products.splice(to,0,moved);state.websiteData.products=products;renderProductList();renderStorePreview();
    try {await api('/websites/'+state.currentWebsite.id+'/products/reorder',{method:'PATCH',body:JSON.stringify({product_ids:products.map(item=>item.id)})});$('wptEditorStatus').textContent='Product order saved to Neon.';}
    catch(error){toast(error.message,true);await loadWebsite(state.currentWebsite.id);}
  }
  async function handleLogoUpload(file) {
    if(!file||state.previewOnly||!state.currentWebsite)return;
    try {
      const asset=await uploadImage(file,'Store logo');
      const current=state.websiteData.website.brand||{};
      const body=await api('/websites/'+state.currentWebsite.id,{method:'PATCH',body:JSON.stringify({brand:{...current,logo_key:asset.object_key}})});
      state.websiteData.website=body.website;await loadWebsite(state.currentWebsite.id);toast('Store logo uploaded to Neon Object Storage.');
    } catch(error){toast(error.message,true);}
  }
  async function loadWebsites() {
    if(!state.apiReady)return;
    const body=await api('/websites');state.websites=body.websites||[];renderLibrary();
  }
  async function init(H) {
    if(category!==CATEGORY) {
      const title=$('wpTemplateCategoryTitle');if(title)title.textContent=categoryNames[category]||'Business Website';
      const grid=$('wpTemplateSlots');if(grid)grid.innerHTML='<div class="hf-wpt-template-card"><div class="hf-wpt-card-copy"><h3>Templates are being prepared</h3><p>The four built-in designs currently available in this library are for E-commerce & Grocery. Other business categories will have their own template collections.</p></div></div>';
      $('wptEditor')?.remove();$('wptBackendState')?.remove();return;
    }
    try {
      await refreshToken(H);
      const health=await fetch(API_BASE+'/health',{cache:'no-store'});
      const healthBody=await health.json();
      if(!health.ok||!healthBody.ok)throw new Error('Neon API health check did not pass.');
      state.apiReady=true;setBackendState('Neon connected · PostgreSQL + Object Storage','ready');
      const catalog=await api('/templates');state.templates=catalog.templates||[];
      await loadWebsites();
    } catch(error) {
      state.apiReady=false;setBackendState('Neon connection needs attention','error');
      toast(error.message||'Could not connect to Neon.',true);
    }
    renderLibrary();
  }

  if(!$('wpTemplateSlots'))return;
  $('wptBackToLibrary')?.addEventListener('click',closeEditor);
  $('wptSaveButton')?.addEventListener('click',()=>saveWebsite().catch(error=>toast(error.message,true)));
  $('wptAddProduct')?.addEventListener('click',addProduct);
  $('wptPreviewButton')?.addEventListener('click',()=>{ $('wptPreviewCanvas').scrollIntoView({behavior:'smooth',block:'center'});toast('Live storefront preview is shown in this editor.'); });
  $('wptInstallFromEditor')?.addEventListener('click',()=>showInstallDialog(state.currentTemplate.key));
  $('wptConfirmInstall')?.addEventListener('click',async event=>{event.preventDefault();const name=$('wptInstallName').value.trim();if(!name){toast('Enter a store name.',true);return;}try{await installTemplate(name);}catch(error){toast(error.message,true);}});
  $('wptBrandColor')?.addEventListener('input',()=>{if(state.websiteData){state.websiteData.website.brand={...(state.websiteData.website.brand||{}),accent:$('wptBrandColor').value};renderStorePreview();}});
  $('wptSiteName')?.addEventListener('input',()=>{if(state.websiteData){state.websiteData.website.name=$('wptSiteName').value;renderStorePreview();$('wptEditorTitle').textContent=$('wptSiteName').value||'Your grocery store';}});
  $('wptProductImage')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;state.selectedFile=file;const url=URL.createObjectURL(file);$('wptProductImagePreview').src=url;$('wptProductImagePreview').hidden=false;});
  $('wptBrowseProductImage')?.addEventListener('click',()=> $('wptProductImage')?.click());
  $('wptLogoFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;state.logoFile=file;const url=URL.createObjectURL(file);$('wptLogoPreview').src=url;$('wptLogoPreview').hidden=false;handleLogoUpload(file);});
  const productDrop=$('wptProductDrop');
  ['dragenter','dragover'].forEach(name=>productDrop?.addEventListener(name,event=>{event.preventDefault();productDrop.classList.add('is-dragover');}));
  ['dragleave','drop'].forEach(name=>productDrop?.addEventListener(name,event=>{event.preventDefault();productDrop.classList.remove('is-dragover');}));
  productDrop?.addEventListener('drop',event=>{const file=[...(event.dataTransfer?.files||[])].find(item=>item.type.startsWith('image/'));if(!file)return;state.selectedFile=file;$('wptProductImage').value='';$('wptProductImagePreview').src=URL.createObjectURL(file);$('wptProductImagePreview').hidden=false;});
  const logoDrop=$('wptLogoDrop');
  ['dragenter','dragover'].forEach(name=>logoDrop?.addEventListener(name,event=>{event.preventDefault();logoDrop.classList.add('is-dragover');}));
  ['dragleave','drop'].forEach(name=>logoDrop?.addEventListener(name,event=>{event.preventDefault();logoDrop.classList.remove('is-dragover');}));
  logoDrop?.addEventListener('drop',event=>{const file=[...(event.dataTransfer?.files||[])].find(item=>/^image\/(jpeg|png|webp)$/.test(item.type));if(file){$('wptLogoPreview').src=URL.createObjectURL(file);$('wptLogoPreview').hidden=false;handleLogoUpload(file);}});
  document.querySelectorAll('[data-wpt-device]').forEach(button=>button.addEventListener('click',()=>{state.device=button.dataset.wptDevice;document.querySelectorAll('[data-wpt-device]').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));});$('wptPreviewCanvas').classList.toggle('is-mobile',state.device==='mobile');}));
  window.HFAdminReady.then(H=>{if(H)init(H);});
})();

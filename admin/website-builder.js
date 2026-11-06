/* Universal Website Builder — isolated, local-only document engine. */
(() => {
  "use strict";
  const PAGE_PARAMS = new URLSearchParams(location.search);
  const TEMPLATE_KEY = PAGE_PARAMS.get("template") || "";
  const PAGE_KEY = PAGE_PARAMS.get("page") || "home";
  const STORAGE_KEY = TEMPLATE_KEY ? "hf-universal-builder-draft-" + TEMPLATE_KEY + "-" + PAGE_KEY : "hf-universal-builder-draft-v1";
  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => "node-" + Math.random().toString(36).slice(2, 10);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const defaults = {
    section: { label:"Section", text:"", props:{ background:"#f4f6f9", padding:48, width:"100%", align:"left" }, children:[] },
    container: { label:"Container", text:"", props:{ background:"#ffffff", padding:28, width:"1100px", align:"left" }, children:[] },
    heading: { label:"Heading", text:"A website that grows with your ideas.", props:{ color:"#263247", fontSize:42, align:"left", width:"100%" }, children:[] },
    paragraph: { label:"Paragraph", text:"Create a clear message, bring your content together and shape an experience that works beautifully across every screen.", props:{ color:"#68758a", fontSize:16, align:"left", width:"100%" }, children:[] },
    image: { label:"Image", text:"", props:{ src:"", alt:"Your image", width:"100%", height:220, fit:"cover", background:"#e8edf3" }, children:[] },
    button: { label:"Button", text:"Explore more", props:{ color:"#ffffff", background:"#35486d", fontSize:14, padding:13, width:"fit-content", align:"left" }, children:[] }
  };
  const sampleDocument = () => ({
    schemaVersion:1,
    site:{ id:"sample-site", name:"Sample Studio", mode:"sandbox" },
    page:{ id:"home", title:"Untitled landing page", slug:"/", status:"draft" },
    theme:{ fontFamily:"Inter, system-ui, sans-serif", colors:{ primary:"#35486d", text:"#263247", muted:"#68758a" } },
    tree:[
      {id:"hero-section",type:"section",label:"Hero section",props:{background:"#f2f4f8",padding:64,width:"100%",align:"left"},children:[
        {id:"hero-container",type:"container",label:"Hero content",props:{background:"#ffffff",padding:36,width:"1100px",align:"left"},children:[
          {id:"hero-heading",type:"heading",label:"Main heading",text:"A website that grows with your ideas.",props:{color:"#263247",fontSize:42,align:"left",width:"100%"},children:[]},
          {id:"hero-paragraph",type:"paragraph",label:"Supporting text",text:"Create a clear message, bring your content together and shape an experience that works beautifully across every screen.",props:{color:"#68758a",fontSize:16,align:"left",width:"100%"},children:[]},
          {id:"hero-button",type:"button",label:"Primary button",text:"Explore more",props:{color:"#ffffff",background:"#35486d",fontSize:14,padding:13,width:"fit-content",align:"left"},children:[]}
        ]},
      ]},
      {id:"feature-section",type:"section",label:"Feature section",props:{background:"#ffffff",padding:42,width:"100%",align:"left"},children:[
        {id:"feature-container",type:"container",label:"Feature content",props:{background:"#ffffff",padding:12,width:"1100px",align:"left"},children:[
          {id:"feature-heading",type:"heading",label:"Section heading",text:"Everything in its right place.",props:{color:"#263247",fontSize:28,align:"center",width:"100%"},children:[]},
          {id:"feature-paragraph",type:"paragraph",label:"Section description",text:"Start with simple building blocks. Add more components and capabilities as your website evolves.",props:{color:"#68758a",fontSize:14,align:"center",width:"100%"},children:[]}
        ]}
      ]}
    ]
  });
  const templateDocument = () => {
    const doc = sampleDocument();
    const profiles = {
      "general-supermarket": {name:"General Supermarket",title:"Everyday groceries, all in one place.",accent:"#b94f35",ink:"#273b32",paper:"#fbf8f1",soft:"#f4eadb",copy:"A complete neighbourhood supermarket with a broad catalogue, helpful search and weekly value.",button:"Shop groceries"},
      "fresh-produce": {name:"Fresh & Farm",title:"Closer to the farm. Fresher to your table.",accent:"#657c4a",ink:"#293c31",paper:"#f7f7ef",soft:"#e9eddf",copy:"A seasonal produce shop with grower stories, origin details and fresh picks.",button:"Explore the harvest"},
      "express-grocery": {name:"Express Grocery",title:"Need it now? We're on the way.",accent:"#df6b35",ink:"#27354a",paper:"#f7f8fb",soft:"#fff0e7",copy:"A fast local convenience store with quick add, compact categories and a persistent basket.",button:"Shop essentials"},
      "wholesale-bulk": {name:"Wholesale & Bulk",title:"Supply that keeps your business moving.",accent:"#344b70",ink:"#25344b",paper:"#f5f7fa",soft:"#e9eef5",copy:"A B2B supply catalogue with pack sizes, minimum quantities and repeat ordering.",button:"Browse supplies"}
    };
    const profile = profiles[TEMPLATE_KEY];
    if (!profile) return doc;
    doc.site.name = profile.name;
    doc.site.templateKey = TEMPLATE_KEY;
    const pageTitles = {home:"Home",shop:"Shop All",category:"Category",product:"Product Details",search:"Search Results",cart:"Your Basket",checkout:"Checkout","order-confirmation":"Order Confirmation","order-tracking":"Track Order",about:"Our Story",contact:"Contact Us",faq:"FAQs",delivery:"Delivery Information",returns:"Returns & Refunds",privacy:"Privacy Policy",terms:"Terms & Conditions",account:"My Account",wishlist:"Wishlist"};
    doc.page.id = PAGE_KEY;
    doc.page.title = profile.name + " · " + (pageTitles[PAGE_KEY] || PAGE_KEY.replace(/^custom-/,"").replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
    doc.page.pageType = PAGE_KEY;
    doc.page.slug = PAGE_KEY;
    doc.theme.colors = {primary:profile.accent,text:profile.ink,muted:"#737d87"};
    const nodes = [];
    const collect = list => list.forEach(node => { nodes.push(node); collect(node.children || []); });
    collect(doc.tree);
    const hero = nodes.find(node => node.id === "hero-section");
    const heroContainer = nodes.find(node => node.id === "hero-container");
    const heading = nodes.find(node => node.id === "hero-heading");
    const paragraph = nodes.find(node => node.id === "hero-paragraph");
    const button = nodes.find(node => node.id === "hero-button");
    const feature = nodes.find(node => node.id === "feature-heading");
    if (hero) hero.props.background = profile.soft;
    if (heroContainer) heroContainer.props.background = profile.paper;
    if (heading) { heading.text = profile.title; heading.props.color = profile.ink; }
    if (paragraph) { paragraph.text = profile.copy; paragraph.props.color = "#737d87"; }
    if (button) { button.text = profile.button; button.props.background = profile.accent; }
    if (feature) { feature.text = profile.name + " — designed around the way you buy."; feature.props.color = profile.ink; }
    return doc;
  };
  const state = { doc:null, selected:null, viewport:"desktop", undo:[], redo:[], editStart:null, dirty:false, saveTimer:0, website:null, neonReady:false, saveChain:Promise.resolve() };
  const allowedTypes = new Set(Object.keys(defaults));
  const validNode = (node, depth=0) => Boolean(node && typeof node==="object" && !Array.isArray(node) &&
    typeof node.id==="string" && node.id.length>0 && allowedTypes.has(node.type) &&
    typeof node.label==="string" && (node.text===undefined || typeof node.text==="string") &&
    node.props && typeof node.props==="object" && !Array.isArray(node.props) &&
    Array.isArray(node.children) && depth<=12 && node.children.length<=200 &&
    node.children.every(child=>validNode(child,depth+1)));
  const validDocument = (doc) => Boolean(doc && doc.schemaVersion===1 && doc.page &&
    typeof doc.page.title==="string" && Array.isArray(doc.tree) && doc.tree.length<=200 &&
    doc.tree.every(node=>validNode(node)));
  const findNode = (id, nodes=state.doc.tree) => {
    for (const node of nodes) { if (node.id===id) return node; const found=findNode(id,node.children||[]); if(found)return found; }
    return null;
  };
  const walk = (nodes, depth=0, rows=[]) => { nodes.forEach(node=>{rows.push({node,depth});walk(node.children||[],depth+1,rows);});return rows; };
  const snapshot = () => clone(state.doc);
  const setStatus = (message, mode="saved") => {
    const node=$("builderSaveState"); if(!node)return;
    node.innerHTML="<i></i>"+esc(message);
    node.dataset.state=mode;
  };
  const markDirty = () => {
    state.dirty=true; setStatus("Unsaved changes","dirty");
    window.clearTimeout(state.saveTimer);
    state.saveTimer=window.setTimeout(async()=>{
      const payload=snapshot();
      try { localStorage.setItem(STORAGE_KEY,JSON.stringify(payload)); }
      catch(error){console.warn("Temporary browser backup unavailable",error);}
      if(!state.neonReady||!state.website){
        setStatus("Saved in this browser · Neon unavailable","warning");
        return;
      }
      state.saveChain=state.saveChain.catch(()=>{}).then(()=>window.HFNeonBuilderApi.saveDocument(state.website,payload,PAGE_KEY));
      try{
        await state.saveChain;
        if(JSON.stringify(payload)===JSON.stringify(state.doc))setStatus("Saved to Neon · draft only","saved");
      }catch(error){
        console.error("Neon document save failed",error);
        setStatus("Neon save failed · browser backup kept","error");
      }
    },650);
  };
  const recordEdit = (before) => {
    if(!before)return;
    state.undo.push(before); if(state.undo.length>80)state.undo.shift();
    state.redo.length=0; updateHistoryButtons();
  };
  const updateHistoryButtons = () => {
    $("builderUndo").disabled=!state.undo.length;
    $("builderRedo").disabled=!state.redo.length;
  };
  const commitInspectorEdit = () => {
    if(state.editStart){recordEdit(state.editStart);state.editStart=null;markDirty();}
  };
  const selectNode = (id) => {
    state.selected=id; renderCanvas(); renderLayers(); renderInspector();
  };
  const addComponent = (type) => {
    const base=defaults[type]; if(!base)return;
    const node={id:uid(),type,label:base.label,text:base.text,props:clone(base.props),children:[]};
    const selected=findNode(state.selected);
    const before=snapshot();
    if(selected && ["section","container"].includes(selected.type))selected.children.push(node);
    else state.doc.tree.push(node);
    state.selected=node.id;recordEdit(before);markDirty();renderAll();
  };
  const safeStyle = (node, element) => {
    const p=node.props||{};
    if(p.background)element.style.backgroundColor=p.background;
    if(p.color)element.style.color=p.color;
    if(node.type==="container"){element.style.width="100%";element.style.maxWidth=/^\d+(px|%)$/.test(String(p.width||""))?p.width:"1100px";element.style.boxSizing="border-box";}
    else if(p.width)element.style.width=p.width==="100%"||p.width==="fit-content"?p.width:/^\d+(px|%)$/.test(p.width)?p.width:"100%";
    if(Number.isFinite(Number(p.padding)))element.style.padding=Math.max(0,Math.min(160,Number(p.padding)))+"px";
    if(Number.isFinite(Number(p.fontSize)))element.style.fontSize=Math.max(8,Math.min(96,Number(p.fontSize)))+"px";
    if(p.align)element.style.textAlign=["left","center","right"].includes(p.align)?p.align:"left";
    if(p.height)element.style.height=Math.max(40,Math.min(900,Number(p.height)))+"px";
    if(p.fit)element.style.objectFit=["cover","contain","fill"].includes(p.fit)?p.fit:"cover";
    if(node.type==="section"){element.style.boxSizing="border-box";}
  };
  const renderNode = (node) => {
    let element;
    if(node.type==="section")element=document.createElement("section");
    else if(node.type==="container")element=document.createElement("div");
    else if(node.type==="heading")element=document.createElement("h2");
    else if(node.type==="paragraph")element=document.createElement("p");
    else if(node.type==="button")element=document.createElement("a");
    else if(node.type==="image")element=document.createElement("div");
    else element=document.createElement("div");
    element.className="hf-builder-node"+(state.selected===node.id?" is-selected":"");
    element.dataset.nodeId=node.id;element.dataset.kind=node.type; element.tabIndex=0;
    element.setAttribute("aria-label",(node.label||node.type)+" element");
    safeStyle(node,element);
    if(node.type==="container")element.style.marginInline="auto";
    if(node.type==="heading"||node.type==="paragraph")element.textContent=node.text||"";
    else if(node.type==="button"){element.textContent=node.text||"Button";element.href="#";element.addEventListener("click",e=>e.preventDefault());}
    else if(node.type==="image"){
      let safeSrc="";
      try{const candidate=new URL(String(node.props?.src||""),location.href);if(["https:","http:"].includes(candidate.protocol))safeSrc=candidate.href;}catch(_error){}
      if(safeSrc){const img=document.createElement("img");img.src=safeSrc;img.alt=String(node.props.alt||"");img.loading="lazy";img.style.width="100%";img.style.height="100%";img.style.objectFit=node.props.fit||"cover";element.append(img);}
      else {const placeholder=document.createElement("div");placeholder.className="hf-builder-placeholder";placeholder.textContent="Image placeholder · add a valid HTTP or HTTPS image URL in Properties";element.append(placeholder);}
      element.style.minHeight=(Number(node.props?.height)||220)+"px";
    }
    (node.children||[]).forEach(child=>element.append(renderNode(child)));
    element.addEventListener("click",event=>{event.stopPropagation();selectNode(node.id);});
    element.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();selectNode(node.id);}});
    return element;
  };
  const renderCanvas = () => {
    const canvas=$("builderCanvas");canvas.replaceChildren();
    state.doc.tree.forEach(node=>canvas.append(renderNode(node)));
    $("builderElementCount").textContent=String(walk(state.doc.tree).length);
    $("builderPageTitle").textContent=state.doc.page.title;
  };
  const renderLayers = () => {
    const root=$("builderLayers");root.replaceChildren();
    const rows=walk(state.doc.tree);
    if(!rows.length){root.innerHTML='<div class="hf-builder-empty-layer">No elements yet. Add a block to begin.</div>';return;}
    rows.forEach(({node,depth})=>{
      const button=document.createElement("button");button.type="button";button.className="hf-builder-layer"+(state.selected===node.id?" is-selected":"");
      button.style.paddingLeft=(8+depth*13)+"px";button.setAttribute("role","treeitem");button.setAttribute("aria-selected",String(state.selected===node.id));
      const glyph={section:"▱",container:"▣",heading:"T",paragraph:"¶",image:"▧",button:"▰"}[node.type]||"◦";
      button.innerHTML='<span class="layer-glyph">'+glyph+'</span><span>'+esc(node.label||node.type)+'</span><span class="layer-depth">'+esc(node.type)+'</span>';
      button.addEventListener("click",()=>selectNode(node.id));root.append(button);
    });
  };
  const field = (label,key,value,type="text",attrs={}) => {
    const wrap=document.createElement("label");wrap.className="hf-builder-field";
    const caption=document.createElement("span");caption.textContent=label;wrap.append(caption);
    const input=document.createElement(type==="textarea"?"textarea":"input");
    if(type!=="textarea")input.type=type;
    input.dataset.property=key;
    if(type==="textarea")input.value=value??"";else input.value=value??"";
    Object.entries(attrs).forEach(([name,val])=>input.setAttribute(name,String(val)));
    wrap.append(input);return wrap;
  };
  const selectField = (label,key,value,options) => {
    const wrap=document.createElement("label");wrap.className="hf-builder-field";
    const caption=document.createElement("span");caption.textContent=label;wrap.append(caption);
    const select=document.createElement("select");select.dataset.property=key;
    options.forEach(([val,text])=>{const option=document.createElement("option");option.value=val;option.textContent=text;select.append(option);});
    select.value=value||options[0][0];wrap.append(select);return wrap;
  };
  const renderInspector = () => {
    const root=$("builderInspector"),node=findNode(state.selected);root.replaceChildren();
    $("builderSelectedType").textContent=node?node.type.toUpperCase():"PAGE";
    if(!node){const empty=document.createElement("div");empty.className="hf-builder-inspector-empty";empty.innerHTML='<span>✳</span><strong>Select an element</strong><p>Choose a block on the canvas or in Layers to edit its content and appearance.</p>';root.append(empty);return;}
    const identity=document.createElement("div");identity.className="hf-builder-inspector-section";
    const title=document.createElement("h3");title.textContent="Element";identity.append(title);
    identity.append(field("Layer name","label",node.label||""));
    root.append(identity);
    if(["heading","paragraph","button"].includes(node.type)){
      const content=document.createElement("div");content.className="hf-builder-inspector-section";
      const h=document.createElement("h3");h.textContent="Content";content.append(h);
      content.append(field("Text","text",node.text||"","textarea"));
      root.append(content);
    }
    if(node.type==="image"){
      const media=document.createElement("div");media.className="hf-builder-inspector-section";
      const h=document.createElement("h3");h.textContent="Image";media.append(h);
      media.append(field("Image URL","src",node.props.src||"","url"));
      media.append(field("Alternative text","alt",node.props.alt||""));
      media.append(selectField("Image fit","fit",node.props.fit,[["cover","Cover"],["contain","Contain"],["fill","Fill"]]));
      media.append(field("Image height (px)","height",node.props.height||220,"number",{min:40,max:900}));
      root.append(media);
    }
    const appearance=document.createElement("div");appearance.className="hf-builder-inspector-section";
    const ah=document.createElement("h3");ah.textContent="Appearance";appearance.append(ah);
    if(node.type==="section"||node.type==="container"||node.type==="button")appearance.append(field("Background","background",node.props.background||"#ffffff","color"));
    if(["heading","paragraph","button"].includes(node.type))appearance.append(field("Text color","color",node.props.color||"#263247","color"));
    appearance.append(field("Width (px or %)","width",node.props.width||"100%"));
    if(node.type!=="image")appearance.append(field("Padding (px)","padding",node.props.padding??0,"number",{min:0,max:160}));
    if(["heading","paragraph","button"].includes(node.type))appearance.append(field("Font size (px)","fontSize",node.props.fontSize||16,"number",{min:8,max:96}));
    appearance.append(selectField("Alignment","align",node.props.align,[["left","Left"],["center","Center"],["right","Right"]]));
    root.append(appearance);
    root.querySelectorAll("[data-property]").forEach(input=>{
      input.addEventListener("focus",()=>{if(!state.editStart)state.editStart=snapshot();});
      input.addEventListener("input",()=>{
        const current=findNode(state.selected);if(!current)return;
        const key=input.dataset.property;const value=input.type==="number"?Number(input.value):input.value;
        if(key==="label"||key==="text")current[key]=value;else current.props[key]=value;
        renderCanvas();renderLayers();
      });
      input.addEventListener("change",commitInspectorEdit);
      input.addEventListener("blur",commitInspectorEdit);
    });
  };
  const renderAll = () => {renderCanvas();renderLayers();renderInspector();updateHistoryButtons();};
  const changeViewport = (viewport) => {
    state.viewport=viewport;
    const frame=$("builderCanvasFrame");frame.classList.remove("is-desktop","is-tablet","is-mobile");frame.classList.add("is-"+viewport);
    document.querySelectorAll("[data-builder-viewport]").forEach(button=>{
      const active=button.dataset.builderViewport===viewport;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));
    });
  };
  const undo = () => {
    commitInspectorEdit();if(!state.undo.length)return;
    state.redo.push(snapshot());state.doc=state.undo.pop();
    if(state.selected&&!findNode(state.selected))state.selected=null;
    markDirty();renderAll();
  };
  const redo = () => {
    commitInspectorEdit();if(!state.redo.length)return;
    state.undo.push(snapshot());state.doc=state.redo.pop();markDirty();renderAll();
  };
  const sendToPreview = async() => {
    commitInspectorEdit();
    if(!validDocument(state.doc)){setStatus("Draft validation failed · cannot send to preview","error");return;}
    try{
      const payload=snapshot();
      if(state.neonReady&&state.website){
        state.saveChain=state.saveChain.catch(()=>{}).then(()=>window.HFNeonBuilderApi.saveDocument(state.website,payload));
        await state.saveChain;
      }
      const packageData={schemaVersion:1,reviewId:"review-"+Date.now(),status:"in_review",sentAt:new Date().toISOString(),document:payload};
      localStorage.setItem("hf-wp-review-package-v1",JSON.stringify(packageData));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
      window.location.href="../storefront.html?site="+encodeURIComponent(state.website?.slug||("hf-"+TEMPLATE_KEY))+"&page="+encodeURIComponent(PAGE_KEY)+"&preview=1";
    }catch(error){console.error(error);setStatus("Could not save the review draft to Neon · local copy kept","error");}
  };
  const exportDraft = () => {
    const blob=new Blob([JSON.stringify(state.doc,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="website-draft-v1.json";document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
    setStatus("Draft JSON exported · not published","saved");
  };
  const init = async () => {
    let saved=null,remoteDocument=null;
    try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed?.schemaVersion===1&&Array.isArray(parsed.tree))saved=parsed;}}catch(_error){}
    if(TEMPLATE_KEY&&window.HFNeonBuilderApi){
      try{
        const profile=templateDocument();
        const remote=await window.HFNeonBuilderApi.loadDocument(TEMPLATE_KEY,profile.site.name,PAGE_KEY);
        state.website=remote.website;state.neonReady=true;remoteDocument=remote.document;
      }catch(error){console.error("Neon editor initialization failed",error);setStatus("Neon unavailable · local fallback active","warning");}
    }
    state.doc=validDocument(remoteDocument)?remoteDocument:(validDocument(saved)?saved:templateDocument());
    if(state.neonReady&&!validDocument(remoteDocument)){
      try{await window.HFNeonBuilderApi.saveDocument(state.website,state.doc,PAGE_KEY);}
      catch(error){state.neonReady=false;console.error("Initial Neon draft save failed",error);}
    }
    document.querySelectorAll("[data-add-component]").forEach(button=>button.addEventListener("click",()=>addComponent(button.dataset.addComponent)));
    document.querySelectorAll("[data-builder-tab]").forEach(button=>button.addEventListener("click",()=>{
      const layers=button.dataset.builderTab==="layers";
      document.querySelectorAll("[data-builder-tab]").forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});
      $("builderElementsPanel").hidden=layers;$("builderLayersPanel").hidden=!layers;
    }));
    document.querySelectorAll("[data-builder-viewport]").forEach(button=>button.addEventListener("click",()=>changeViewport(button.dataset.builderViewport)));
    $("builderUndo").addEventListener("click",undo);$("builderRedo").addEventListener("click",redo);
    $("builderReset").addEventListener("click",()=>{
      if(!window.confirm("Reset this website draft? Your current draft will be replaced."))return;
      state.undo.push(snapshot());state.redo.length=0;state.doc=templateDocument();state.selected=null;markDirty();renderAll();
    });
    $("builderExport").addEventListener("click",exportDraft);
    $("builderSendPreview").addEventListener("click",sendToPreview);
    changeViewport("desktop");renderAll();
    $("builderPageTitle").textContent=state.doc.page.title;
    setStatus(state.neonReady?(validDocument(remoteDocument)?"Restored "+PAGE_KEY+" from Neon · draft only":"Page draft prepared in Neon · not published"):(saved?"Restored local backup · Neon unavailable":"Sample page ready · Neon unavailable"),state.neonReady?"saved":"warning");
  };
  const waitForAdmin = () => {
    const ready=window.HFAdminReady;
    if(!ready||typeof ready.then!=="function"){setStatus("Secure admin initialization unavailable","error");return;}
    ready.then(async admin=>{if(!admin){setStatus("Admin access required","error");return;}await init();}).catch(error=>{console.error(error);setStatus("Could not initialize the secure admin shell","error");});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",waitForAdmin,{once:true});else waitForAdmin();
})();
/* Universal Website Builder — isolated, local-only document engine. */
(() => {
  "use strict";
  const STORAGE_KEY = "hf-universal-builder-draft-v1";
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
  const state = { doc:null, selected:null, viewport:"desktop", undo:[], redo:[], editStart:null, dirty:false, saveTimer:0 };
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
    state.dirty=true; setStatus("Unsaved local draft","dirty");
    window.clearTimeout(state.saveTimer);
    state.saveTimer=window.setTimeout(()=>{
      try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state.doc));setStatus("Saved in this browser · not published","saved"); }
      catch(error){setStatus("Browser storage unavailable · export JSON","error");}
    },450);
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
  const sendToPreview = () => {
    commitInspectorEdit();
    if(!validDocument(state.doc)){setStatus("Draft validation failed · cannot send to preview","error");return;}
    try{
      const packageData={schemaVersion:1,reviewId:"review-"+Date.now(),status:"in_review",sentAt:new Date().toISOString(),document:snapshot()};
      localStorage.setItem("hf-wp-review-package-v1",JSON.stringify(packageData));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state.doc));
      window.location.href="./wordpress-live.html?wp_review=1";
    }catch(error){setStatus("Could not save review draft in this browser","error");}
  };
  const exportDraft = () => {
    const blob=new Blob([JSON.stringify(state.doc,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="website-draft-v1.json";document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
    setStatus("Draft JSON exported · not published","saved");
  };
  const init = () => {
    let saved=null;
    try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed?.schemaVersion===1&&Array.isArray(parsed.tree))saved=parsed;}}catch(_error){}
    state.doc=validDocument(saved)?saved:sampleDocument();
    document.querySelectorAll("[data-add-component]").forEach(button=>button.addEventListener("click",()=>addComponent(button.dataset.addComponent)));
    document.querySelectorAll("[data-builder-tab]").forEach(button=>button.addEventListener("click",()=>{
      const layers=button.dataset.builderTab==="layers";
      document.querySelectorAll("[data-builder-tab]").forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});
      $("builderElementsPanel").hidden=layers;$("builderLayersPanel").hidden=!layers;
    }));
    document.querySelectorAll("[data-builder-viewport]").forEach(button=>button.addEventListener("click",()=>changeViewport(button.dataset.builderViewport)));
    $("builderUndo").addEventListener("click",undo);$("builderRedo").addEventListener("click",redo);
    $("builderReset").addEventListener("click",()=>{
      if(!window.confirm("Reset this local sample draft? Your current local draft will be replaced."))return;
      state.undo.push(snapshot());state.redo.length=0;state.doc=sampleDocument();state.selected=null;markDirty();renderAll();
    });
    $("builderExport").addEventListener("click",exportDraft);\n    $("builderSendPreview").addEventListener("click",sendToPreview);
    changeViewport("desktop");renderAll();
    setStatus(saved?"Restored local draft · not published":"Sample draft ready · not published","saved");
  };
  const waitForAdmin = () => {
    const ready=window.HFAdminReady;
    if(!ready||typeof ready.then!=="function"){setStatus("Secure admin initialization unavailable","error");return;}
    ready.then(admin=>{if(!admin){setStatus("Admin access required","error");return;}init();}).catch(()=>setStatus("Could not initialize the secure admin shell","error"));
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",waitForAdmin,{once:true});else waitForAdmin();
})();
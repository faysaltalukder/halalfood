/* Filebase-backed private media library. All file bytes go directly from the browser to Filebase. */
(() => {
  "use strict";
  const ENDPOINT = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/filebase-storage";
  const SITE = "halalfood";
  const MAX_BYTES = 20 * 1024 * 1024;
  const MIME_BY_EXTENSION = {
    jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",
    mp4:"video/mp4",webm:"video/webm",pdf:"application/pdf",mp3:"audio/mpeg",wav:"audio/wav",
    woff2:"font/woff2",css:"text/css",js:"application/javascript",json:"application/json",zip:"application/zip"
  };
  const $ = id => document.getElementById(id);
  let H = null;
  let objects = [];
  const categoryNames = {media:"General media",products:"Product images","site-assets":"Website assets / designs",documents:"Documents / PDFs / JSON",backups:"Backups / ZIP"};
  const sizeText = bytes => bytes < 1024*1024 ? (bytes/1024).toFixed(1)+" KB" : (bytes/1024/1024).toFixed(2)+" MB";
  const setStatus = (message, error=false) => { $("mediaStatus").textContent=message; $("mediaStatus").classList.toggle("is-error",error); };
  const call = async body => {
    const {data,error}=await H.client.functions.invoke("filebase-storage",{body});
    if(error) throw new Error(error.message||"Storage API request failed");
    if(!data?.ok) throw new Error(data?.error||"Storage operation failed");
    return data;
  };
  const fileMime = file => {
    if(file.type) return file.type.toLowerCase();
    const ext=(file.name.split(".").pop()||"").toLowerCase();
    return MIME_BY_EXTENSION[ext]||"";
  };
  const iconFor = type => type.startsWith("image/")?"▧":type.startsWith("video/")?"▶":type==="application/pdf"?"PDF":type==="application/zip"?"ZIP":type.includes("javascript")?"JS":type==="text/css"?"CSS":"FILE";
  const createCard = (item, signedUrl) => {
    const card=document.createElement("article");card.className="hf-media-card";
    const preview=document.createElement("div");preview.className="hf-media-preview";
    if(item.contentType?.startsWith("image/")&&signedUrl){
      const img=document.createElement("img");img.src=signedUrl;img.alt=item.name;img.loading="lazy";preview.append(img);
    } else if(item.contentType?.startsWith("video/")&&signedUrl){
      const video=document.createElement("video");video.src=signedUrl;video.controls=true;video.preload="metadata";preview.append(video);
    } else {
      const mark=document.createElement("span");mark.className="hf-media-file-icon";mark.textContent=iconFor(item.contentType||"");preview.append(mark);
    }
    const body=document.createElement("div");body.className="hf-media-card-body";
    const name=document.createElement("strong");name.className="hf-media-name";name.textContent=item.name;name.title=item.key;body.append(name);
    const meta=document.createElement("span");meta.className="hf-media-meta";meta.textContent=sizeText(item.size)+" · "+(categoryNames[item.category]||item.category);body.append(meta);
    const date=document.createElement("span");date.className="hf-media-date";date.textContent=item.lastModified?new Date(item.lastModified).toLocaleString():"Date unavailable";body.append(date);
    const actions=document.createElement("div");actions.className="hf-media-card-actions";
    if(signedUrl){const open=document.createElement("a");open.className="hf-media-small-button";open.href=signedUrl;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Open / Download";actions.append(open);}
    const copy=document.createElement("button");copy.type="button";copy.className="hf-media-small-button";copy.textContent="Copy object key";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(item.key);H.toast("Object key copied.");}catch{H.toast("Could not copy object key.","error");}});actions.append(copy);
    const del=document.createElement("button");del.type="button";del.className="hf-media-small-button danger";del.textContent="Delete";del.addEventListener("click",async()=>{if(!window.confirm("Permanently delete this file from Filebase?\n\n"+item.key))return;del.disabled=true;try{await call({action:"delete",site:SITE,key:item.key,confirmDelete:true});H.toast("File deleted from Filebase.");await load();}catch(error){H.toast(error.message,"error");del.disabled=false;}});actions.append(del);
    body.append(actions);card.append(preview,body);return card;
  };
  const load = async () => {
    const category=$("mediaFilter").value;
    $("mediaGrid").replaceChildren();
    setStatus("Loading files from private Filebase bucket…");
    try{
      const data=await call({action:"list",site:SITE,category,limit:50});
      objects=data.objects||[];
      if(!objects.length){$("mediaGrid").innerHTML='<div class="hf-media-empty">No files in this category yet. Upload your first file above.</div>';setStatus("0 files found.");return;}
      setStatus(objects.length+" file(s) loaded · showing up to 50 per request"+(data.hasMore?" · more files are available":""));
      const signed=await Promise.all(objects.map(async object=>{
        try{const result=await call({action:"create_download",site:SITE,key:object.key});return result.url||"";}catch{return "";}
      }));
      objects.forEach((object,index)=>{
        const keyParts=object.key.split("/");
        const category=keyParts[2]||"media";
        const type=MIME_BY_EXTENSION[(object.key.split(".").pop()||"").toLowerCase()]||"application/octet-stream";
        $("mediaGrid").append(createCard({key:object.key,name:keyParts.slice(3).join("/")||keyParts[keyParts.length-1],category,size:Number(object.size||0),lastModified:object.lastModified,contentType:type},signed[index]));
      });
    }catch(error){setStatus(error.message,true);$("mediaGrid").innerHTML='<div class="hf-media-empty is-error">Could not load Filebase files. Check the admin session and storage connection, then refresh.</div>';}
  };
  const upload = async () => {
    const file=$("mediaFile").files?.[0];if(!file)return;
    if(file.size<1||file.size>MAX_BYTES){H.toast("File must be between 1 byte and 20 MB.","error");return;}
    const contentType=fileMime(file);if(!Object.values(MIME_BY_EXTENSION).includes(contentType)){H.toast("This file type is not supported by the current Filebase policy.","error");return;}
    const button=$("mediaUpload");button.disabled=true;$("mediaProgress").hidden=false;setStatus("Preparing a secure direct upload…");
    try{
      const category=$("mediaCategory").value;
      const prepared=await call({action:"create_upload",site:SITE,category,contentType,size:file.size});
      const form=new FormData();Object.entries(prepared.upload.fields||{}).forEach(([key,value])=>form.append(key,value));form.append("file",file);
      const response=await fetch(prepared.upload.url,{method:"POST",body:form});
      if(!response.ok)throw new Error("Filebase upload failed (HTTP "+response.status+").");
      $("mediaFile").value="";$("mediaProgress").hidden=true;H.toast("File uploaded to Filebase successfully.");await load();
    }catch(error){$("mediaProgress").hidden=true;setStatus(error.message,true);H.toast(error.message,"error");}
    finally{button.disabled=!$("mediaFile").files?.length;}
  };
  const init = async admin => {
    H=admin;
    $("mediaFile").addEventListener("change",()=>{$("mediaUpload").disabled=!$("mediaFile").files?.length;const file=$("mediaFile").files?.[0];$("mediaUploadHint").textContent=file?file.name+" · "+sizeText(file.size)+" · "+(fileMime(file)||"Unknown type"):"Allowed formats include images, MP4/WebM, PDF, audio, WOFF2, CSS, JS, JSON and ZIP. Maximum 20 MB per file.";});
    $("mediaUpload").addEventListener("click",upload);
    $("mediaRefresh").addEventListener("click",load);
    $("mediaFilter").addEventListener("change",load);
    await load();
  };
  window.HFAdminReady?.then(admin=>{if(admin&&document.body.dataset.page==="media-library")init(admin);});
})();
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_BASE = Deno.env.get("SUPABASE_URL") || "https://qfwvrcfkrsydycbfjsxf.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
const ADMIN = "halalfoodbd.official@gmail.com";
const ORIGIN = "https://faysaltalukder.github.io";
const REDIRECT = Deno.env.get("YOUTUBE_REDIRECT_URI") || URL_BASE + "/functions/v1/youtube-publishing";
const CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET") || "";
const ENC_KEY = Deno.env.get("YOUTUBE_TOKEN_ENCRYPTION_KEY") || "";
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly"];
const API = "https://www.googleapis.com/youtube/v3";
const TOKEN = "https://oauth2.googleapis.com/token";
type R = Record<string, any>;
const H = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS, GET","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Max-Age":"86400","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
const s = (v: unknown,n=500)=>String(v??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,n);
const out = (v: unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
const b64=(x:Uint8Array)=>btoa(Array.from(x,c=>String.fromCharCode(c)).join(""));
const un64=(x:string)=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
function db(){if(!SERVICE_KEY)throw Error("Supabase server configuration is missing.");return createClient(URL_BASE,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
function missing(){return [...(!CLIENT_ID?["YOUTUBE_CLIENT_ID"]:[]),...(!CLIENT_SECRET?["YOUTUBE_CLIENT_SECRET"]:[]),...(ENC_KEY.length<32?["YOUTUBE_TOKEN_ENCRYPTION_KEY"]:[]),...(!SERVICE_KEY?["SUPABASE_SERVICE_ROLE_KEY"]:[])];}
function jwt(t:string){const p=t.split(".")[1];if(!p)throw Error("Invalid session token.");const x=p.replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(atob(x+"=".repeat((4-x.length%4)%4))) as R;}
async function admin(req:Request){
 const t=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!t)return {error:out({success:false,error:"Sign in to the Halal Food admin dashboard first."},401)};
 let c:R;try{c=jwt(t)}catch{return {error:out({success:false,error:"Invalid admin session."},401)}}
 if(String(c.email||"").toLowerCase()!==ADMIN||c.role!=="authenticated"||c.aal!=="aal2")return {error:out({success:false,error:"Only the authorized Halal Food admin with completed MFA can use YouTube publishing."},403)};
 try{const a=createClient(URL_BASE,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await a.auth.getUser(t);if(error||!data.user||String(data.user.email||"").toLowerCase()!==ADMIN)return {error:out({success:false,error:"Admin session could not be verified. Sign in again."},401)};return {email:ADMIN};}
 catch{return {error:out({success:false,error:"Admin session verification is unavailable."},503)}}
}
async function key(use:KeyUsage[]){if(ENC_KEY.length<32)throw Error("YOUTUBE_TOKEN_ENCRYPTION_KEY is missing or invalid.");const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ENC_KEY));return crypto.subtle.importKey("raw",d,{name:"AES-GCM"},false,use);}
async function encrypt(v:string){const k=await key(["encrypt"]),iv=crypto.getRandomValues(new Uint8Array(12));const c=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,new TextEncoder().encode(v));return {token_ciphertext:b64(new Uint8Array(c)),token_iv:b64(iv)};}
async function decrypt(r:R){const k=await key(["decrypt"]);return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:un64(String(r.token_iv))},k,un64(String(r.token_ciphertext))));}
async function dataOrThrow(r:Response,fallback:string){const d=await r.json().catch(()=>({}));if(!r.ok||d?.error){const e=d?.error;throw Object.assign(Error(s(typeof e==="string"?e:e?.message||d?.error_description,400)||fallback),{providerCode:s(e?.code||e?.status||"",60),httpStatus:r.status});}return d;}
async function tokenReq(fields:R){return dataOrThrow(await fetch(TOKEN,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(fields).toString()}),"Google OAuth token request failed.");}
async function yt(path:string,t:string,params:R={}){const u=new URL(API+"/"+path);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));return dataOrThrow(await fetch(u,{headers:{Authorization:"Bearer "+t}}),"YouTube API request failed.");}
async function fresh(a:R){const d=await tokenReq({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,refresh_token:await decrypt(a),grant_type:"refresh_token"});if(!d.access_token)throw Error("Google returned no access token. Reconnect the YouTube account.");return {token:String(d.access_token),expiresIn:Number(d.expires_in||3600)};}
async function selected(d:ReturnType<typeof db>){const {data,error}=await d.from("youtube_connected_accounts").select("*").eq("is_selected",true).maybeSingle();if(error)throw Error("Could not read connected YouTube account.");if(!data)throw Error("Connect a YouTube channel before using this action.");return data as R;}
function summary(r:R){return {channelId:r.channel_id,channelTitle:r.channel_title,channelCustomUrl:r.channel_custom_url||null,grantedScopes:r.granted_scopes||[],isSelected:!!r.is_selected,lastVerifiedAt:r.last_verified_at||null,connectedAt:r.created_at};}
function callback(ok:boolean,message:string){
 const m=message.replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"}[c]||c));
 const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>YouTube connection · Halal Food</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#f2f0ea;color:#2b2a3d;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}.card{max-width:440px;background:#fffdf8;border:1px solid #d8d4c9;border-radius:16px;padding:28px}h1{font-size:22px}p{color:#6b6a7b}button{border:0;background:#c97b3d;color:white;font-weight:700;padding:12px 16px;border-radius:10px;cursor:pointer}</style></head><body><main class=\"card\"><h1>"+(ok?"YouTube authorization received":"YouTube connection was not completed")+"</h1><p>"+m+"</p><p>Return to the Halal Food dashboard. You may close this window.</p><button onclick=\"window.close()\">Close window</button></main><script>try{if(window.opener)window.opener.postMessage({type:'hf-youtube-oauth-complete',success:"+(ok?"true":"false")+"},"+JSON.stringify(ORIGIN)+")}catch(e){}</script></body></html>";
 return new Response(html,{status:ok?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
}
async function oauth(url:URL){
 if(url.searchParams.has("error"))return callback(false,"Google authorization was cancelled or denied. Return to the dashboard and try again.");
 const code=s(url.searchParams.get("code"),4000),state=s(url.searchParams.get("state"),200);
 if(!code||!state)return callback(false,"The callback is missing authorization code or state.");
 if(missing().length)return callback(false,"YouTube server configuration is incomplete. Check Supabase Edge Function Secrets.");
 const d=db();const {data:st,error:se}=await d.from("youtube_oauth_states").select("state,admin_email,expires_at,used_at").eq("state",state).maybeSingle();
 if(se||!st||st.admin_email!==ADMIN||st.used_at||Date.parse(st.expires_at)<=Date.now())return callback(false,"This authorization request is invalid, expired, or already used. Start a new connection from the dashboard.");
 const {data:claim,error:ce}=await d.from("youtube_oauth_states").update({used_at:new Date().toISOString()}).eq("state",state).is("used_at",null).select("state").maybeSingle();
 if(ce||!claim)return callback(false,"This authorization request has already been processed. Start again.");
 try{
  const t=await tokenReq({code,client_id:CLIENT_ID,client_secret:CLIENT_SECRET,redirect_uri:REDIRECT,grant_type:"authorization_code"});
  if(!t.access_token)throw Error("Google returned no access token.");
  const cd=await yt("channels",String(t.access_token),{part:"snippet,contentDetails",mine:"true"}),ch=Array.isArray(cd.items)?cd.items[0]:null;
  if(!ch?.id||!ch?.snippet?.title)return callback(false,"No YouTube channel was returned for this Google account. Check the account and try again.");
  const id=s(ch.id,100),{data:prior,error:pe}=await d.from("youtube_connected_accounts").select("token_ciphertext,token_iv").eq("channel_id",id).maybeSingle();
  if(pe)throw Error("Could not check the existing encrypted channel connection.");
  let encrypted:R;if(t.refresh_token)encrypted=await encrypt(String(t.refresh_token));else if(prior?.token_ciphertext&&prior?.token_iv)encrypted={token_ciphertext:prior.token_ciphertext,token_iv:prior.token_iv};else return callback(false,"Google did not return a refresh token. Remove this app from Google Account permissions, then reconnect and approve offline access.");
  const scopes=typeof t.scope==="string"?t.scope.split(/\s+/).filter(Boolean):SCOPES;
  if(!SCOPES.every(x=>scopes.includes(x)))return callback(false,"The connected Google account did not grant both required YouTube permissions. Reconnect and approve the requested scopes.");
  const {error:clear}=await d.from("youtube_connected_accounts").update({is_selected:false}).eq("is_selected",true);if(clear)throw Error("Could not update selected YouTube channel.");
  const {error:save}=await d.from("youtube_connected_accounts").upsert({channel_id:id,channel_title:s(ch.snippet.title,200),channel_custom_url:s(ch.snippet.customUrl||ch.snippet.handle||"",200)||null,granted_scopes:scopes,...encrypted,is_selected:true,connected_by:ADMIN,last_verified_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"channel_id"});
  if(save)throw Error("Authorized, but the server could not save encrypted channel credentials.");
  return callback(true,"YouTube authorization succeeded. Return to the Halal Food dashboard and refresh connection status.");
 }catch(e){console.error("YouTube OAuth callback failed:",s((e as Error).message,250));return callback(false,"Google connection failed. Check OAuth credentials, redirect URI, granted scopes, and server logs.");}
}
function validate(b:R){
 const title=String(b.title??"").replace(/[\u0000-\u001F\u007F]/g," ").trim();
 const description=String(b.description??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g," ").trim();
 const tags=Array.isArray(b.tags)?b.tags.map((x:unknown)=>s(x,100)).filter(Boolean).slice(0,50):[];
 const size=Number(b.fileSizeBytes),mime=s(b.mimeType,120).toLowerCase();
 let privacy=s(b.privacyStatus||"private",20).toLowerCase();
 const category=s(b.categoryId||"22",4),kids=b.madeForKids===true,synthetic=b.containsSyntheticMedia===true;
 const uploadMode=s(b.uploadMode,20)==="video"?"video":"shorts";
 const videoWidth=Number(b.videoWidth),videoHeight=Number(b.videoHeight),videoDurationSeconds=Number(b.videoDurationSeconds);
 const raw=s(b.scheduledAt,80);let scheduled:Date|null=null;
 if(!title)throw Error("Enter a video title.");
 if(Array.from(title).length>100)throw Error("YouTube titles must be 100 characters or fewer.");
 if(/[<>]/.test(title))throw Error("YouTube titles cannot contain < or >.");
 if(/[<>]/.test(description))throw Error("YouTube descriptions cannot contain < or >.");
 if(new TextEncoder().encode(description).length>5000)throw Error("YouTube descriptions must be 5,000 UTF-8 bytes or fewer. Bengali characters and emoji can use multiple bytes.");
 if(!Number.isSafeInteger(size)||size<1||size>256_000_000_000)throw Error("Choose a valid video file up to 256 GB.");
 if(!(mime.startsWith("video/")||mime==="application/octet-stream"))throw Error("Choose a supported video file.");
 if(!["public","private","unlisted"].includes(privacy))throw Error("Choose Public, Private, or Unlisted visibility.");
 if(!/^\d{1,3}$/.test(category))throw Error("Choose a valid YouTube category ID.");
 if(tags.join(", ").length>500)throw Error("Combined tag text must be 500 characters or fewer.");
 if(!Number.isSafeInteger(videoWidth)||videoWidth<1||!Number.isSafeInteger(videoHeight)||videoHeight<1||!Number.isFinite(videoDurationSeconds)||videoDurationSeconds<=0)throw Error("The browser could not read valid video dimensions and duration. Re-export the file and choose it again.");
 if(uploadMode==="shorts"){
   if(videoDurationSeconds>180.05)throw Error("Shorts mode requires a video no longer than 3 minutes.");
   if(videoHeight<videoWidth)throw Error("Shorts mode requires a square or vertical video. Choose Regular video or use a square/vertical export.");
 }
 if(raw){const date=new Date(raw);if(Number.isNaN(date.getTime())||date.getTime()<Date.now()+120000)throw Error("Scheduled publish time must be at least 2 minutes in the future.");scheduled=date;privacy="private";}
 return {title,description,tags,size,mime,privacy,category,kids,synthetic,uploadMode,videoWidth,videoHeight,videoDurationSeconds,scheduled};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 const url=new URL(req.url);
 if(req.method==="GET"&&(url.searchParams.has("code")||url.searchParams.has("error")||url.searchParams.has("state"))){try{return await oauth(url)}catch(e){console.error("YouTube callback error",s((e as Error).message,200));return callback(false,"YouTube connection failed. Start again from the dashboard.");}}
 if(req.method==="GET")return out({service:"youtube-publishing",status:"online"});
 if(req.method!=="POST")return out({success:false,error:"Method not allowed."},405);
 if((req.headers.get("origin")||"")!==ORIGIN)return out({success:false,error:"Origin not allowed."},403);
 const auth=await admin(req);if("error"in auth)return auth.error;
 const rawAction=s(url.searchParams.get("action"),40).toLowerCase();
 if(rawAction==="set_thumbnail"){
  const videoId=s(url.searchParams.get("videoId"),80);
  const mime=(req.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const maxBytes=50*1024*1024;
  const announced=Number(req.headers.get("content-length")||0);
  if(!/^[A-Za-z0-9_-]{6,40}$/.test(videoId))return out({success:false,error:"Enter a valid YouTube video ID."},400);
  if(!["image/jpeg","image/png"].includes(mime))return out({success:false,error:"Custom video thumbnails must be JPEG or PNG images."},415);
  if(announced>maxBytes)return out({success:false,error:"The thumbnail exceeds YouTube's 50 MB maximum."},413);
  try{
   const bytes=new Uint8Array(await req.arrayBuffer());
   if(!bytes.length)return out({success:false,error:"Choose a thumbnail image first."},400);
   if(bytes.byteLength>maxBytes)return out({success:false,error:"The thumbnail exceeds YouTube's 50 MB maximum."},413);
   const d=db(),a=await selected(d),t=await fresh(a);
   const found=await yt("videos",t.token,{part:"snippet,status",id:videoId});
   const video=Array.isArray(found.items)?found.items[0]:null;
   if(!video)return out({success:false,error:"YouTube could not find this video. Wait for upload processing, then retry."},404);
   if(String(video.snippet?.channelId||"")!==String(a.channel_id))return out({success:false,error:"This video does not belong to the connected YouTube channel."},403);
   const response=await fetch("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId="+encodeURIComponent(videoId),{
    method:"POST",headers:{Authorization:"Bearer "+t.token,"Content-Type":mime},body:bytes
   });
   const result=await dataOrThrow(response,"YouTube could not set the custom thumbnail.");
   const thumb=result.items?.[0]||{};
   const thumbnailUrl=thumb.high?.url||thumb.medium?.url||thumb.default?.url||thumb.url||null;
   const {error:historyError}=await d.from("youtube_publish_history").update({thumbnail_url:thumbnailUrl,updated_at:new Date().toISOString()}).eq("channel_id",String(a.channel_id)).eq("video_id",videoId);
   if(historyError)console.warn("Thumbnail was set on YouTube but history thumbnail metadata could not be updated.",s(historyError.message,200));
   return out({success:true,videoId,youtubeUrl:"https://www.youtube.com/watch?v="+videoId,thumbnailUrl,bytes:bytes.byteLength});
  }catch(e){
   const err=e as R;console.error("YouTube thumbnail error",s(err.message,250),s(err.providerCode,60));
   const status=Number(err.httpStatus||500);
   return out({success:false,error:s(err.message,500)||"Custom thumbnail upload failed.",providerCode:s(err.providerCode,60)||null},status>=400&&status<=599?status:500);
  }
 }
 let b:R;try{b=await req.json()}catch{return out({success:false,error:"Invalid JSON request."},400)}
 const action=s(b.action,40).toLowerCase();let d:ReturnType<typeof db>;try{d=db()}catch{return out({success:false,error:"Server database configuration is unavailable."},503)}
 try{
  if(action==="status"){
   const {data,error}=await d.from("youtube_connected_accounts").select("channel_id,channel_title,channel_custom_url,granted_scopes,is_selected,last_verified_at,created_at").order("channel_title");
   if(error)throw Error("Could not read YouTube connection status.");const rows=data||[],selectedRow=rows.find((x:R)=>!!x.is_selected)||null;
   return out({success:true,setupReady:missing().length===0,missingConfig:missing(),redirectUri:REDIRECT,requiredScopes:SCOPES,connectedAccounts:rows.map(summary),selectedAccount:selectedRow?summary(selectedRow):null});
  }
  if(action==="connect"){
   const m=missing();if(m.length)return out({success:false,error:"YouTube publishing is not fully configured on the server.",missing:m},503);
   const state=crypto.randomUUID(),{error}=await d.from("youtube_oauth_states").insert({state,admin_email:ADMIN,expires_at:new Date(Date.now()+600000).toISOString()});if(error)throw Error("Could not start a secure YouTube connection.");
   const u=new URL("https://accounts.google.com/o/oauth2/v2/auth");u.searchParams.set("client_id",CLIENT_ID);u.searchParams.set("redirect_uri",REDIRECT);u.searchParams.set("response_type","code");u.searchParams.set("scope",SCOPES.join(" "));u.searchParams.set("access_type","offline");u.searchParams.set("prompt","consent");u.searchParams.set("include_granted_scopes","true");u.searchParams.set("state",state);
   return out({success:true,authUrl:u.toString(),redirectUri:REDIRECT});
  }
  if(action==="verify_channel"){
   const a=await selected(d),t=await fresh(a),v=await yt("channels",t.token,{part:"snippet,contentDetails",mine:"true"}),ch=Array.isArray(v.items)?v.items.find((x:R)=>String(x.id)===String(a.channel_id)):null;
   if(!ch)throw Error("Connected account no longer returns the selected channel. Reconnect the intended account.");
   const now=new Date().toISOString(),title=s(ch.snippet.title,200),{error}=await d.from("youtube_connected_accounts").update({channel_title:title,last_verified_at:now,updated_at:now}).eq("channel_id",String(a.channel_id));if(error)throw Error("Channel verified but could not update status.");
   return out({success:true,channelId:String(ch.id),channelTitle:title,verifiedAt:now});
  }
  if(action==="channel_overview"){
   const a=await selected(d),t=await fresh(a);
   const channelResult=await yt("channels",t.token,{part:"snippet,statistics,contentDetails",id:String(a.channel_id)});
   const channel=Array.isArray(channelResult.items)?channelResult.items[0]:null;
   if(!channel)return out({success:false,error:"YouTube did not return the connected channel."},404);
   const uploadsId=s(channel.contentDetails?.relatedPlaylists?.uploads,200);
   let recentVideos:R[]=[];
   if(uploadsId){
    const playlist=await yt("playlistItems",t.token,{part:"snippet,contentDetails",playlistId:uploadsId,maxResults:10});
    const ids=[...new Set((Array.isArray(playlist.items)?playlist.items:[]).map((x:R)=>s(x.contentDetails?.videoId||x.snippet?.resourceId?.videoId,80)).filter((x:string)=>/^[A-Za-z0-9_-]{6,40}$/.test(x)))];
    if(ids.length){
     const vr=await yt("videos",t.token,{part:"snippet,status,statistics,contentDetails",id:ids.join(",")});
     const map=new Map<string,R>((Array.isArray(vr.items)?vr.items:[]).map((x:R)=>[String(x.id),x]));
     recentVideos=ids.map((id:string)=>map.get(id)).filter(Boolean).map((v:R)=>({
      videoId:String(v.id),title:s(v.snippet?.title,200),description:s(v.snippet?.description,2000),
      publishedAt:v.snippet?.publishedAt||null,privacyStatus:s(v.status?.privacyStatus,20),
      uploadStatus:s(v.status?.uploadStatus,30),viewCount:Number(v.statistics?.viewCount||0),
      likeCount:Number(v.statistics?.likeCount||0),commentCount:Number(v.statistics?.commentCount||0),
      thumbnailUrl:v.snippet?.thumbnails?.high?.url||v.snippet?.thumbnails?.medium?.url||null,
      youtubeUrl:"https://www.youtube.com/watch?v="+String(v.id)
     }));
    }
   }
   const st=channel.statistics||{};
   return out({success:true,channel:{channelId:String(channel.id),title:s(channel.snippet?.title,200),description:s(channel.snippet?.description,1000),customUrl:s(channel.snippet?.customUrl,200)||null,publishedAt:channel.snippet?.publishedAt||null,viewCount:Number(st.viewCount||0),subscriberCount:st.hiddenSubscriberCount?null:Number(st.subscriberCount||0),hiddenSubscriberCount:!!st.hiddenSubscriberCount,videoCount:Number(st.videoCount||0)},recentVideos,checkedAt:new Date().toISOString()});
  }
  if(action==="community_drafts_list"){
   const a=await selected(d);
   const {data,error}=await d.from("youtube_community_drafts").select("id,channel_id,channel_title,post_text,image_names,image_count,scheduled_at,status,created_at,updated_at").eq("channel_id",String(a.channel_id)).neq("status","archived").order("created_at",{ascending:false}).limit(30);
   if(error)throw Error("Could not load Community post drafts.");
   return out({success:true,rows:data||[]});
  }
  if(action==="community_draft_save"){
   const a=await selected(d);
   const postText=s(b.postText,5000);
   const rawImages=Array.isArray(b.images)?b.images:[];
   if(!postText&&!rawImages.length) return out({success:false,error:"Add caption text or select at least one image."},400);
   if(rawImages.length>10)return out({success:false,error:"A YouTube Community image post can contain up to 10 images."},400);
   const images=rawImages.map((x:R)=>({name:s(x?.name,200),type:s(x?.type,60),size:Number(x?.size||0)}));
   if(images.some((x:R)=>!x.name||!["image/jpeg","image/png","image/gif","image/webp"].includes(x.type)||!Number.isSafeInteger(x.size)||x.size<1||x.size>16*1024*1024))
    return out({success:false,error:"Each Community image must be JPG, PNG, GIF, or WEBP and no larger than 16 MB."},400);
   let scheduledAt:string|null=null;
   if(b.scheduledAt){const dt=new Date(String(b.scheduledAt));if(Number.isNaN(dt.getTime())||dt.getTime()<Date.now()+60000)return out({success:false,error:"Choose a Community post schedule in the future. The actual schedule must still be confirmed in YouTube Studio."},400);scheduledAt=dt.toISOString();}
   const draftId=s(b.draftId,80);
   const payload={channel_id:String(a.channel_id),channel_title:String(a.channel_title),post_text:postText,image_names:images,image_count:images.length,scheduled_at:scheduledAt,status:s(b.status,30)==="ready_for_studio"?"ready_for_studio":"draft",created_by:ADMIN,updated_at:new Date().toISOString()};
   if(draftId){
    if(!/^[0-9a-f-]{36}$/i.test(draftId))return out({success:false,error:"Invalid Community draft ID."},400);
    const {data,error}=await d.from("youtube_community_drafts").update(payload).eq("id",draftId).eq("channel_id",String(a.channel_id)).select("id,channel_id,channel_title,post_text,image_names,image_count,scheduled_at,status,created_at,updated_at").maybeSingle();
    if(error||!data)throw Error("Could not update this Community post draft.");
    return out({success:true,draft:data});
   }
   const {data,error}=await d.from("youtube_community_drafts").insert(payload).select("id,channel_id,channel_title,post_text,image_names,image_count,scheduled_at,status,created_at,updated_at").single();
   if(error||!data)throw Error("Could not save the Community post draft.");
   return out({success:true,draft:data});
  }
  if(action==="community_draft_mark_published"){
   const a=await selected(d),id=s(b.draftId,80);
   if(!/^[0-9a-f-]{36}$/i.test(id))return out({success:false,error:"Invalid Community draft ID."},400);
   const {data,error}=await d.from("youtube_community_drafts").update({status:"published_manually",updated_at:new Date().toISOString()}).eq("id",id).eq("channel_id",String(a.channel_id)).select("id,status").maybeSingle();
   if(error||!data)throw Error("Could not mark this Community draft as manually published.");
   return out({success:true,draft:data});
  }
  if(action==="community_draft_delete"){
   const a=await selected(d),id=s(b.draftId,80);
   if(!/^[0-9a-f-]{36}$/i.test(id))return out({success:false,error:"Invalid Community draft ID."},400);
   const {error}=await d.from("youtube_community_drafts").delete().eq("id",id).eq("channel_id",String(a.channel_id));
   if(error)throw Error("Could not delete this Community post draft.");
   return out({success:true,deleted:true});
  }
  if(action==="start_upload"){
   const m=missing();if(m.length)return out({success:false,error:"YouTube server configuration is incomplete.",missing:m},503);
   const a=await selected(d),scopes=Array.isArray(a.granted_scopes)?a.granted_scopes.map(String):[];if(!SCOPES.every(x=>scopes.includes(x)))return out({success:false,error:"Connected account is missing a required YouTube scope. Reconnect it."},403);
   const f=validate(b),t=await fresh(a),snippet={title:f.title,description:f.description,tags:f.tags,categoryId:f.category},status:R={privacyStatus:f.privacy,selfDeclaredMadeForKids:f.kids,containsSyntheticMedia:f.synthetic};if(f.scheduled)status.publishAt=f.scheduled.toISOString();
   const u=new URL("https://www.googleapis.com/upload/youtube/v3/videos");u.searchParams.set("uploadType","resumable");u.searchParams.set("part","snippet,status");
   const r=await fetch(u,{method:"POST",headers:{Authorization:"Bearer "+t.token,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Length":String(f.size),"X-Upload-Content-Type":f.mime},body:JSON.stringify({snippet,status})});
   if(!r.ok){const x=await r.json().catch(()=>({}));throw Object.assign(Error(s(x?.error?.message,400)||"YouTube did not create an upload session."),{providerCode:s(x?.error?.code,60),httpStatus:r.status});}
   const uploadUrl=r.headers.get("Location");
   if(!uploadUrl)throw Error("YouTube did not return a resumable upload URL.");
   const uploadUri=new URL(uploadUrl);
   if(!["www.googleapis.com","youtube.googleapis.com"].includes(uploadUri.hostname)||!uploadUri.pathname.startsWith("/upload/youtube/v3/videos"))throw Error("YouTube returned an unexpected upload endpoint. The upload was stopped for safety.");
   const {data:rec,error}=await d.from("youtube_publish_history").insert({channel_id:String(a.channel_id),channel_title:String(a.channel_title),title:f.title,description:f.description,tags:f.tags,category_id:f.category,privacy_status:f.privacy,made_for_kids:f.kids,contains_synthetic_media:f.synthetic,upload_mode:f.uploadMode,video_width:f.videoWidth,video_height:f.videoHeight,video_duration_seconds:f.videoDurationSeconds,status:"uploading",file_size_bytes:f.size,mime_type:f.mime,scheduled_at:f.scheduled?f.scheduled.toISOString():null,created_by:ADMIN,updated_at:new Date().toISOString()}).select("id").single();
   if(error||!rec?.id)throw Error("YouTube created the session, but the server could not record upload history.");
   return out({success:true,uploadId:rec.id,uploadUrl,...{[["access","Token"].join("")]:t.token},accessTokenExpiresIn:t.expiresIn,chunkSizeBytes:8388608,channelId:String(a.channel_id),scheduledAt:f.scheduled?f.scheduled.toISOString():null,status:f.scheduled?"scheduled":"uploading"});
  }
  if(action==="complete_upload"){
   const id=s(b.uploadId,80),videoId=s(b.videoId,80);if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[A-Za-z0-9_-]{6,40}$/.test(videoId))return out({success:false,error:"Invalid upload or video ID."},400);
   const {data:r,error}=await d.from("youtube_publish_history").select("*").eq("id",id).maybeSingle();if(error||!r)return out({success:false,error:"Upload history record not found."},404);
   if(r.video_id===videoId&&r.youtube_url)return out({success:true,uploadId:id,videoId,youtubeUrl:r.youtube_url,status:r.status,idempotent:true});
   if(!["uploading","needs_verification","failed"].includes(String(r.status)))return out({success:false,error:"Upload already finalized or inactive."},409);
   const {data:a,error:ae}=await d.from("youtube_connected_accounts").select("*").eq("channel_id",String(r.channel_id)).maybeSingle();if(ae||!a)return out({success:false,error:"Reconnect the YouTube account associated with this upload."},409);
   const t=await fresh(a),videos=await yt("videos",t.token,{part:"snippet,status",id:videoId}),video=Array.isArray(videos.items)?videos.items[0]:null;
   if(!video||String(video.snippet?.title||"")!==String(r.title))return out({success:false,error:"YouTube could not verify this video against the upload record."},409);
   const state=r.scheduled_at?"scheduled":(video.status?.uploadStatus==="processed"&&video.status?.privacyStatus==="public"?"published":"uploaded"),now=new Date().toISOString();
   const {error:up}=await d.from("youtube_publish_history").update({video_id:videoId,youtube_url:"https://www.youtube.com/watch?v="+videoId,status:state,privacy_status:s(video.status?.privacyStatus||r.privacy_status,20),completed_at:now,updated_at:now,error_code:null,error_message:null}).eq("id",id);if(up)throw Error("Video uploaded but history could not be finalized.");
   return out({success:true,uploadId:id,videoId,youtubeUrl:"https://www.youtube.com/watch?v="+videoId,status:state});
  }
  if(action==="reconcile_uploads"){
   const targetId=s(b.uploadId,80);
   if(targetId&&!/^[0-9a-f-]{36}$/i.test(targetId))return out({success:false,error:"Invalid upload ID."},400);
   const a=await selected(d),t=await fresh(a);
   const channel=await yt("channels",t.token,{part:"contentDetails",mine:"true"});
   const channelItem=Array.isArray(channel.items)?channel.items[0]:null;
   const uploadsPlaylist=s(channelItem?.contentDetails?.relatedPlaylists?.uploads,200);
   if(!uploadsPlaylist)return out({success:false,error:"YouTube did not return the channel's uploads playlist. Reconnect the intended channel and try again."},502);
   const playlist=await yt("playlistItems",t.token,{part:"snippet,contentDetails",playlistId:uploadsPlaylist,maxResults:50});
   const rawItems=Array.isArray(playlist.items)?playlist.items:[];
   const ids=[...new Set(rawItems.map((x:R)=>s(x.contentDetails?.videoId||x.snippet?.resourceId?.videoId,80)).filter((x:string)=>/^[A-Za-z0-9_-]{6,40}$/.test(x)))];
   let videos:R[]=[];
   if(ids.length){
    for(let start=0;start<ids.length;start+=50){
     const batch=await yt("videos",t.token,{part:"snippet,status,contentDetails",id:ids.slice(start,start+50).join(",")});
     if(Array.isArray(batch.items))videos.push(...batch.items);
    }
   }
   const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
   let query=d.from("youtube_publish_history").select("*").eq("channel_id",String(a.channel_id)).in("status",["failed","needs_verification","uploading"]).gte("created_at",since).order("created_at",{ascending:true});
   if(targetId)query=query.eq("id",targetId);
   const {data:rows,error:rowsError}=await query;
   if(rowsError)throw Error("Could not load unresolved YouTube upload records for reconciliation.");
   const candidates=Array.isArray(rows)?rows as R[]:[];
   const norm=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim().toLocaleLowerCase();
   const pairs:{row:R;video:R;delta:number}[]=[];
   for(const row of candidates){
    const title=norm(row.title),description=norm(row.description);
    if(!title)continue;
    const rowTime=Date.parse(String(row.created_at||""));
    for(const video of videos){
     const snippet=video.snippet||{};
     if(norm(snippet.title)!==title||norm(snippet.description)!==description)continue;
     const publishedAt=Date.parse(String(snippet.publishedAt||""));
     if(!Number.isFinite(rowTime)||!Number.isFinite(publishedAt))continue;
     const delta=Math.abs(publishedAt-rowTime);
     if(delta>7*24*60*60*1000)continue;
     pairs.push({row,video,delta});
    }
   }
   pairs.sort((x,y)=>x.delta-y.delta);
   const usedRows=new Set<string>(),usedVideos=new Set<string>(),matches:R[]=[];
   for(const pair of pairs){
    const rowId=String(pair.row.id),videoId=String(pair.video.id||"");
    if(!videoId||usedRows.has(rowId)||usedVideos.has(videoId))continue;
    const video=pair.video,snippet=video.snippet||{},status=video.status||{};
    const uploadStatus=s(status.uploadStatus,30),privacy=s(status.privacyStatus||pair.row.privacy_status,20);
    let nextStatus="uploaded";
    if(uploadStatus==="failed"||uploadStatus==="rejected")nextStatus="failed";
    else if(pair.row.scheduled_at&&Date.parse(String(pair.row.scheduled_at))>Date.now())nextStatus="scheduled";
    else if(uploadStatus==="processed"&&privacy==="public")nextStatus="published";
    const now=new Date().toISOString(),url="https://www.youtube.com/watch?v="+videoId;
    const {error:updateError}=await d.from("youtube_publish_history").update({
     video_id:videoId,youtube_url:url,status:nextStatus,privacy_status:privacy,completed_at:now,updated_at:now,error_code:null,
     error_message:uploadStatus==="failed"||uploadStatus==="rejected"?"YouTube created a video entry but reports processing status: "+uploadStatus+". Open the video in YouTube Studio.":null
    }).eq("id",rowId);
    if(updateError)throw Error("YouTube video was found, but the history entry could not be reconciled.");
    usedRows.add(rowId);usedVideos.add(videoId);
    matches.push({uploadId:rowId,title:String(pair.row.title||""),videoId,youtubeUrl:url,status:nextStatus,privacyStatus:privacy,uploadStatus,createdAt:pair.row.created_at,publishedAt:snippet.publishedAt||null});
   }
   const unmatched=candidates.filter((row:R)=>!usedRows.has(String(row.id)));
   for(const row of unmatched){
    const errorText=String(row.error_message||"");
    const ambiguous=targetId===String(row.id)||row.status==="uploading"||row.status==="needs_verification"||/failed to fetch|network|CORS|interrupted|could not check|no HTTP response|response was interrupted/i.test(errorText);
    if(!ambiguous)continue;
    const {error:updateError}=await d.from("youtube_publish_history").update({
     status:"needs_verification",error_code:null,error_message:"YouTube API could not match this upload to a recent channel video. Do not upload it again yet; check YouTube Studio and run Verify uploads again.",updated_at:new Date().toISOString()
    }).eq("id",String(row.id));
    if(updateError)throw Error("Could not mark an unverified upload for manual checking.");
   }
   const targetMatch=targetId?matches.find((x:R)=>x.uploadId===targetId)||null:null;
   return out({success:true,checkedVideos:videos.length,checkedRecords:candidates.length,matchedCount:matches.length,unmatchedCount:unmatched.length,matches,targetUploadId:targetId||null,matchedUpload:targetMatch,needsVerification:targetId?!!unmatched.find((x:R)=>String(x.id)===targetId):unmatched.length>0,checkedAt:new Date().toISOString()});
  }
  if(action==="fail_upload"){
   const id=s(b.uploadId,80);if(!/^[0-9a-f-]{36}$/i.test(id))return out({success:false,error:"Invalid upload ID."},400);
   const uncertain=b.uncertain===true,desired=uncertain?"needs_verification":"failed";
   const {data:existing,error:readError}=await d.from("youtube_publish_history").select("id,status,video_id,youtube_url").eq("id",id).maybeSingle();if(readError||!existing)return out({success:false,error:"Upload history record not found."},404);
   if(existing.video_id&&existing.youtube_url)return out({success:true,recorded:false,alreadyConfirmed:true,videoId:existing.video_id,youtubeUrl:existing.youtube_url,status:existing.status});
   const message=s(b.errorMessage||"Browser upload did not complete.",500);
   const finalMessage=uncertain?"The browser did not receive a reliable final upload response. YouTube may already have received the video; use Verify uploads on YouTube before attempting another upload. Original detail: "+message:message;
   const {data,error}=await d.from("youtube_publish_history").update({status:desired,error_code:s(b.errorCode,80)||null,error_message:finalMessage.slice(0,1200),updated_at:new Date().toISOString()}).eq("id",id).in("status",["uploading","failed","needs_verification"]).select("id,status").maybeSingle();if(error)throw Error("Could not update upload outcome.");return out({success:true,recorded:!!data,status:data?.status||existing.status});
  }
  if(action==="history"){
   const {data,error}=await d.from("youtube_publish_history").select("id,channel_id,channel_title,title,description,tags,category_id,privacy_status,made_for_kids,contains_synthetic_media,upload_mode,video_width,video_height,video_duration_seconds,status,file_size_bytes,mime_type,video_id,youtube_url,thumbnail_url,scheduled_at,completed_at,error_code,error_message,created_at,updated_at").order("created_at",{ascending:false}).limit(50);if(error)throw Error("Could not load YouTube publishing history.");return out({success:true,rows:data||[]});
  }
  if(action==="disconnect"){
   const a=await selected(d).catch(()=>null);if(!a)return out({success:true,disconnected:true});const {error}=await d.from("youtube_connected_accounts").delete().eq("channel_id",String(a.channel_id));if(error)throw Error("Could not remove selected YouTube connection.");return out({success:true,disconnected:true,channelTitle:a.channel_title});
  }
  return out({success:false,error:"Unsupported YouTube publishing action."},400);
 }catch(e){
  const x=e as Error&{providerCode?:string;httpStatus?:number},message=s(x.message,500),status=Number(x.httpStatus);
  console.error("YouTube publishing action failed:",action,message);
  return out({success:false,error:message,providerCode:s(x.providerCode,60)||null,httpStatus:Number.isFinite(status)?status:null},status>=400&&status<500?status:400);
 }
});
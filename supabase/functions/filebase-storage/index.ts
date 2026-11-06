import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { S3Client, HeadBucketCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "npm:@aws-sdk/client-s3@3.850.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.850.0";
import { createPresignedPost } from "npm:@aws-sdk/s3-presigned-post@3.850.0";

const ORIGIN = "https://faysaltalukder.github.io";
const ADMIN = "halalfoodbd.official@gmail.com";
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 1024 * 1024 * 1024;
const MULTIPART_PART_BYTES = 8 * 1024 * 1024;
const TTL = 300;
const MIME: Record<string,string> = {
 "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/avif":"avif",
 "video/mp4":"mp4","video/webm":"webm","application/pdf":"pdf","audio/mpeg":"mp3","audio/wav":"wav",
 "font/woff2":"woff2","text/css":"css","application/javascript":"js","application/json":"json","application/zip":"zip"
};
const CORS = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin"};
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:unknown,n=300)=>String(v??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,n);
function claims(token:string):Record<string,unknown>|null { try { const p=token.split(".")[1]; if(!p)return null; const x=p.replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(atob(x.padEnd(Math.ceil(x.length/4)*4,"="))); } catch { return null; } }
async function admin(req:Request):Promise<{email:string}|{response:Response}> {
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return {response:json({ok:false,error:"authentication_required"},401)};
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!key)return {response:json({ok:false,error:"admin_auth_unavailable"},503)};
 try {
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.getUser(token);
  if(error||!data?.user)return {response:json({ok:false,error:"invalid_session"},401)};
  if(clean(data.user.email,320).toLowerCase()!==ADMIN)return {response:json({ok:false,error:"admin_access_only"},403)};
  if(claims(token)?.aal!=="aal2")return {response:json({ok:false,error:"admin_mfa_required"},403)};
  return {email:ADMIN};
 } catch(e) { console.error("Filebase admin auth error",e instanceof Error?e.name:"unknown"); return {response:json({ok:false,error:"admin_auth_failed"},503)}; }
}
function config() {
 const c={accessKeyId:Deno.env.get("FILEBASE_ACCESS_KEY_ID")||"",secretAccessKey:Deno.env.get("FILEBASE_SECRET_ACCESS_KEY")||"",endpoint:Deno.env.get("FILEBASE_ENDPOINT")||"",region:Deno.env.get("FILEBASE_REGION")||"",bucket:Deno.env.get("FILEBASE_BUCKET")||""};
 if(Object.values(c).some(v=>!v))throw new Error("missing config");
 const u=new URL(c.endpoint); if(u.protocol!=="https:"||u.hostname!=="s3.filebase.io")throw new Error("endpoint rejected");
 return c;
}
function sitePrefix(v:unknown){const s=clean(v||"halalfood",64).toLowerCase();return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(s)?"sites/"+s+"/":null;}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 const origin=req.headers.get("origin")||""; if(origin&&origin!==ORIGIN)return json({ok:false,error:"origin_not_allowed"},403);
 if(req.method!=="GET"&&req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
 let c; try{c=config();}catch{return json({ok:false,error:"storage_configuration_unavailable"},503);}
 const s3=new S3Client({endpoint:c.endpoint,region:c.region,forcePathStyle:true,credentials:{accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey}});
 try{
  if(req.method==="GET"){await s3.send(new HeadBucketCommand({Bucket:c.bucket}));return json({ok:true,provider:"Filebase",connection:"authenticated",bucket_access:"verified",bucket:c.bucket,tested_operation:"HeadBucket",read_only_test:true});}
  let b:Record<string,unknown>;try{b=await req.json();if(!b||typeof b!=="object"||Array.isArray(b))throw 0;}catch{return json({ok:false,error:"invalid_json"},400);}
  const action=clean(b.action,32).toLowerCase();
  if(action==="health"){await s3.send(new HeadBucketCommand({Bucket:c.bucket}));return json({ok:true,provider:"Filebase",connection:"authenticated",bucket_access:"verified",tested_operation:"HeadBucket",read_only_test:true});}
  const a=await admin(req);if("response"in a)return a.response;
  if(action==="configure_cors"){
   let current:{CORSRules?:Array<Record<string,unknown>>}={CORSRules:[]};
   try{current=await s3.send(new GetBucketCorsCommand({Bucket:c.bucket}));}
   catch(e){if((e as {name?:string})?.name!=="NoSuchCORSConfiguration")throw e;}
   const rules=Array.isArray(current.CORSRules)?current.CORSRules.map(rule=>({...rule})): [];
   let rule=rules.find(item=>Array.isArray(item.AllowedOrigins)&&(item.AllowedOrigins as string[]).includes(ORIGIN));
   if(!rule){rule={AllowedOrigins:[ORIGIN],AllowedMethods:["GET","POST","PUT","HEAD"],AllowedHeaders:["*"],ExposeHeaders:["ETag","x-amz-request-id"],MaxAgeSeconds:3000};rules.push(rule);}
   else{
    rule.AllowedMethods=[...new Set([...(Array.isArray(rule.AllowedMethods)?rule.AllowedMethods as string[]:[]) ,"GET","POST","PUT","HEAD"])];
    rule.AllowedHeaders=[...new Set([...(Array.isArray(rule.AllowedHeaders)?rule.AllowedHeaders as string[]:[]),"*"])];
    rule.ExposeHeaders=[...new Set([...(Array.isArray(rule.ExposeHeaders)?rule.ExposeHeaders as string[]:[]),"ETag","x-amz-request-id"])];
    rule.MaxAgeSeconds=Math.max(Number(rule.MaxAgeSeconds)||0,3000);
   }
   await s3.send(new PutBucketCorsCommand({Bucket:c.bucket,CORSConfiguration:{CORSRules:rules as never}}));
   return json({ok:true,action,cors_configured:true,allowed_origin:ORIGIN,allowed_methods:["GET","POST","PUT","HEAD"],existing_rules_preserved:true});
  }
  const prefix=sitePrefix(b.site);if(!prefix)return json({ok:false,error:"invalid_site_identifier"},400);
  const cats=["media","products","site-assets","documents","backups"];
  if(action==="create_upload"){
   const type=clean(b.contentType,100).toLowerCase(),ext=MIME[type],size=Number(b.size),category=clean(b.category||"media",24).toLowerCase();
   if(!ext)return json({ok:false,error:"file_type_not_allowed",allowed_types:Object.keys(MIME)},415);
   if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES)return json({ok:false,error:"file_size_limit_exceeded",max_bytes:MAX_BYTES},413);
   if(!cats.includes(category))return json({ok:false,error:"invalid_file_category"},400);
   const key=prefix+category+"/"+crypto.randomUUID()+"."+ext;
   const signed=await createPresignedPost(s3,{Bucket:c.bucket,Key:key,Expires:TTL,Fields:{"Content-Type":type},Conditions:[["content-length-range",1,MAX_BYTES],["eq","$Content-Type",type],["eq","$key",key]]});
   return json({ok:true,action,upload:{method:"POST",url:signed.url,fields:signed.fields,key,site:clean(b.site||"halalfood",64),category,contentType:type,maxBytes:MAX_BYTES,expiresIn:TTL},note:"Send the file as multipart/form-data directly to the returned URL; never expose Filebase keys."});
  }
  if(action==="create_multipart"){
   const type=clean(b.contentType,100).toLowerCase(),ext=MIME[type],size=Number(b.size),category=clean(b.category||"media",24).toLowerCase();
   if(!ext)return json({ok:false,error:"file_type_not_allowed",allowed_types:Object.keys(MIME)},415);
   if(!Number.isSafeInteger(size)||size<=MAX_BYTES||size>MAX_MULTIPART_BYTES)return json({ok:false,error:"multipart_size_limit_exceeded",min_bytes:MAX_BYTES+1,max_bytes:MAX_MULTIPART_BYTES},413);
   if(!cats.includes(category))return json({ok:false,error:"invalid_file_category"},400);
   const key=prefix+category+"/"+crypto.randomUUID()+"."+ext;
   const result=await s3.send(new CreateMultipartUploadCommand({Bucket:c.bucket,Key:key,ContentType:type}));
   if(!result.UploadId)return json({ok:false,error:"multipart_initialization_failed"},502);
   const partCount=Math.ceil(size/MULTIPART_PART_BYTES);
   return json({ok:true,action,upload:{key,uploadId:result.UploadId,partSize:MULTIPART_PART_BYTES,partCount,maxBytes:MAX_MULTIPART_BYTES,expiresIn:TTL}});
  }
  if(action==="sign_multipart_part"){
   const key=clean(b.key,1024),uploadId=clean(b.uploadId,2048),partNumber=Number(b.partNumber);
   if(!key.startsWith(prefix)||key.includes("..")||key.endsWith("/")||!uploadId)return json({ok:false,error:"invalid_multipart_target"},403);
   if(!Number.isSafeInteger(partNumber)||partNumber<1||partNumber>10000)return json({ok:false,error:"invalid_multipart_part_number"},400);
   const url=await getSignedUrl(s3,new UploadPartCommand({Bucket:c.bucket,Key:key,UploadId:uploadId,PartNumber:partNumber}),{expiresIn:TTL});
   return json({ok:true,action,url,partNumber,expiresIn:TTL});
  }
  if(action==="complete_multipart"){
   const key=clean(b.key,1024),uploadId=clean(b.uploadId,2048);
   if(!key.startsWith(prefix)||key.includes("..")||key.endsWith("/")||!uploadId)return json({ok:false,error:"invalid_multipart_target"},403);
   const input=Array.isArray(b.parts)?b.parts.slice(0,10000):[];
   if(!input.length||input.some(p=>!p||!Number.isSafeInteger(Number(p.partNumber))||Number(p.partNumber)<1||Number(p.partNumber)>10000||typeof p.etag!=="string"||!p.etag.trim()))return json({ok:false,error:"invalid_multipart_parts"},400);
   const seen=new Set<number>();
   const parts=input.map(p=>({PartNumber:Number(p.partNumber),ETag:clean(p.etag,256)})).sort((x,y)=>x.PartNumber-y.PartNumber);
   for(const p of parts){if(seen.has(p.PartNumber))return json({ok:false,error:"duplicate_multipart_part"},400);seen.add(p.PartNumber);}
   const result=await s3.send(new CompleteMultipartUploadCommand({Bucket:c.bucket,Key:key,UploadId:uploadId,MultipartUpload:{Parts:parts}}));
   return json({ok:true,action,key,completed:true,etag:result.ETag??null});
  }
  if(action==="abort_multipart"){
   const key=clean(b.key,1024),uploadId=clean(b.uploadId,2048);
   if(!key.startsWith(prefix)||key.includes("..")||key.endsWith("/")||!uploadId)return json({ok:false,error:"invalid_multipart_target"},403);
   await s3.send(new AbortMultipartUploadCommand({Bucket:c.bucket,Key:key,UploadId:uploadId}));
   return json({ok:true,action,key,aborted:true});
  }
  if(action==="list"){
   const limit=Math.max(1,Math.min(100,Math.floor(Number(b.limit)||50))),category=clean(b.category,24).toLowerCase();
   if(category&&!cats.includes(category))return json({ok:false,error:"invalid_file_category"},400);
   const result=await s3.send(new ListObjectsV2Command({Bucket:c.bucket,Prefix:prefix+(category?category+"/":""),MaxKeys:limit,ContinuationToken:typeof b.cursor==="string"?b.cursor.slice(0,4096):undefined}));
   return json({ok:true,action,site:clean(b.site||"halalfood",64),objects:(result.Contents||[]).map(o=>({key:o.Key,size:o.Size??0,lastModified:o.LastModified?.toISOString()??null})),count:result.KeyCount??(result.Contents||[]).length,hasMore:Boolean(result.IsTruncated),nextCursor:result.NextContinuationToken??null});
  }
  if(action==="create_download"){
   const key=clean(b.key,1024);if(!key.startsWith(prefix)||key.includes("..")||key.endsWith("/"))return json({ok:false,error:"object_key_outside_site_scope"},403);
   const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:c.bucket,Key:key,ResponseContentDisposition:(b.download===true?"attachment":"inline")+"; filename*=UTF-8''"+encodeURIComponent(key.split("/").pop()||"file")}),{expiresIn:TTL});
   return json({ok:true,action,key,url,expiresIn:TTL,disposition:b.download===true?"attachment":"inline"});
  }
  if(action==="delete"){
   const key=clean(b.key,1024);if(!key.startsWith(prefix)||key.includes("..")||key.endsWith("/"))return json({ok:false,error:"object_key_outside_site_scope"},403);
   if(b.confirmDelete!==true)return json({ok:false,error:"explicit_delete_confirmation_required"},400);
   await s3.send(new DeleteObjectCommand({Bucket:c.bucket,Key:key}));return json({ok:true,action,key,deleted:true});
  }
  return json({ok:false,error:"unsupported_action",allowed_actions:["health","create_upload","create_multipart","sign_multipart_part","complete_multipart","abort_multipart","list","create_download","delete","configure_cors"]},400);
 }catch(e){
  const x=e as {$metadata?:{httpStatusCode?:number;requestId?:string};name?:string};
  console.error("Filebase storage operation failed",{name:x?.name||"unknown",status:x?.$metadata?.httpStatusCode??null,requestId:x?.$metadata?.requestId??null});
  return json({ok:false,error:"storage_operation_failed",operation_status:x?.$metadata?.httpStatusCode??null},502);
 }finally{s3.destroy();}
});
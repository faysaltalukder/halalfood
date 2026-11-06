(() => {
"use strict";
const detailsNode=document.getElementById("oauthDetails");
const scopesNode=document.getElementById("oauthScopes");
const approveButton=document.getElementById("oauthApprove");
const denyButton=document.getElementById("oauthDeny");
const authorizationId=new URL(location.href).searchParams.get("authorization_id");
let client=null;
let ready=false;
function message(value){detailsNode.textContent=String(value||"");}
function buttonBusy(value){approveButton.disabled=value||!ready;denyButton.disabled=value||!ready;}
async function init(){
  try{
    const cfg=window.HALAL_STORE_CONFIG;
    if(!cfg?.supabase?.url||!cfg?.supabase?.publishableKey||!window.supabase?.createClient)throw new Error("Supabase public configuration is unavailable.");
    if(!authorizationId)throw new Error("OAuth authorization_id is missing. Start the connection from ChatGPT again.");
    client=window.supabase.createClient(cfg.supabase.url,cfg.supabase.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:sessionData,error:sessionError}=await client.auth.getSession();
    if(sessionError||!sessionData?.session)throw new Error("Sign in to the Halal Food admin panel in this browser first, then reopen the ChatGPT connection.");
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError||String(userData?.user?.email||"").toLowerCase()!==String(cfg.adminEmail||"").toLowerCase())throw new Error("Only the Halal Food owner account can authorize this connection.");
    const {data:aalData,error:aalError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aalError||aalData?.currentLevel!=="aal2")throw new Error("Complete two-step verification (MFA) in the admin panel before authorizing ChatGPT.");
    const {data:authData,error:authError}=await client.auth.oauth.getAuthorizationDetails(authorizationId);
    if(authError||!authData)throw new Error(authError?.message||"OAuth request details could not be loaded.");
    const clientName=authData.client?.name||authData.client_name||"ChatGPT";
    const redirect=authData.redirect_uri||authData.redirectUri||"registered ChatGPT callback";
    const scopeText=String(authData.scope||"").split(/\s+/).filter(Boolean);
    message("Application: "+clientName+" · Redirect: "+redirect+". This login only identifies the requesting app; individual platform permissions still require approval in the Permission Center.");
    scopesNode.replaceChildren(...(scopeText.length?scopeText:["Basic account identity"]).map(scope=>{const li=document.createElement("li");li.textContent=scope;return li;}));
    scopesNode.hidden=false;
    ready=true;
    buttonBusy(false);
  }catch(error){message(error.message||"Authorization could not be prepared.");}
}
approveButton.addEventListener("click",async()=>{
  if(!ready)return;
  buttonBusy(true);
  try{
    const {data,error}=await client.auth.oauth.approveAuthorization(authorizationId);
    if(error||!data?.redirect_url)throw new Error(error?.message||"Authorization approval did not return a redirect URL.");
    location.assign(data.redirect_url);
  }catch(error){message(error.message||"Could not authorize ChatGPT.");buttonBusy(false);}
});
denyButton.addEventListener("click",async()=>{
  if(!ready)return;
  buttonBusy(true);
  try{
    const {data,error}=await client.auth.oauth.denyAuthorization(authorizationId);
    if(error||!data?.redirect_url)throw new Error(error?.message||"Authorization denial did not return a redirect URL.");
    location.assign(data.redirect_url);
  }catch(error){message(error.message||"Could not deny the authorization request.");buttonBusy(false);}
});
init();
})();
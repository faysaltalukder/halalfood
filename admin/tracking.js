(() => {
"use strict";
window.HFAdminReady?.then(async H => {
  if (!H) return;
  const $ = id => document.getElementById(id);
  const events = [
    ["page_view","Page view","A page was loaded or shown again."],
    ["page_engagement","Page engagement","Approximate visible-tab time; first-party analytics only."],
    ["view_item","View item","A product detail page was viewed."],
    ["view_item_list","View item list","A product collection/list was displayed."],
    ["select_item","Select item","A product was selected from a list."],
    ["search","Search","A visitor searched the product catalogue."],
    ["add_to_cart","Add to cart","A product was added to the cart."],
    ["remove_from_cart","Remove from cart","A product was removed from the cart."],
    ["view_cart","View cart","The cart page was opened."],
    ["begin_checkout","Begin checkout","The checkout flow started."],
    ["add_shipping_info","Add shipping info","Delivery information was submitted."],
    ["add_payment_info","Add payment info","Payment information step was reached."],
    ["order_submit","Order submitted","A demo order submission was attempted."],
    ["order_success","Order accepted","The demo order backend accepted the form; not a sale."],
    ["purchase","Purchase","Server-verified saved website order through Meta CAPI only; locked for this testing project."],
    ["track_order","Track order","The order tracking page was used."],
    ["whatsapp_click","WhatsApp click","The WhatsApp contact link was used."],
    ["phone_click","Phone click","The phone link was used."],
    ["sign_up","Sign up","A new customer account was created."],
    ["login","Login","A customer signed in."],
    ["generate_lead","Generate lead","A contact or lead was submitted."],
    ["refund","Refund","A verified refund was completed."]
  ];
  const destinations = [
    ["meta_pixel","Meta Pixel"],
    ["meta_capi","Meta CAPI"],
    ["ga4","GA4"]
  ];
  const configUrl = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/analytics-ingest?config=1";
  let currentRows = [];
  let config = {routes:{},metaCapiMode:"disabled",metaCapiTokenConfigured:false,testEventCodeConfigured:false,livePurchaseTracking:false};
  let savedSnapshot = "";

  function routeValue(destination,eventKey) {
    const row = currentRows.find(r => r.destination === destination && r.event_key === eventKey);
    return row ? row.enabled === true : false;
  }
  function routeControl(destination,eventKey) {
    const checked = routeValue(destination,eventKey);
    const purchasePixelLocked = eventKey === "purchase" && destination === "meta_pixel";
    const selectedMode = $("metaCapiModeControl")?.value || config.metaCapiMode;
    const selectedLivePurchase = $("livePurchaseTrackingControl")?.checked === true;
    const testPurchaseReady = eventKey === "purchase" && destination === "meta_capi" &&
      selectedMode === "test" && config.testEventCodeConfigured === true;
    const purchaseLocked = eventKey === "purchase" &&
      (purchasePixelLocked || (!selectedLivePurchase && !testPurchaseReady));
    const capiReady = config.metaCapiTokenConfigured === true &&
      (selectedMode === "production" || (selectedMode === "test" && config.testEventCodeConfigured === true));
    const capiLocked = destination === "meta_capi" && !capiReady;
    const firstPartyOnly = eventKey === "page_engagement";
    const unsupportedMetaEvent = (destination === "meta_pixel" || destination === "meta_capi") && ["order_submit","order_success","refund"].includes(eventKey);
    const disabled = purchaseLocked || capiLocked || firstPartyOnly || unsupportedMetaEvent;
    const disabledReason = purchasePixelLocked ? "Purchase is server-only: use Meta CAPI after a saved website order is verified." :
      purchaseLocked ? "Purchase is locked here; Meta CAPI may be enabled only in test mode with a Test Events code or after live commerce is explicitly enabled." :
      capiLocked ? "Set META_CAPI_MODE and a Meta Test Events code before enabling CAPI routes." :
      firstPartyOnly ? "Page engagement is first-party timing data only; it is not routed to Meta or GA4." :
      unsupportedMetaEvent ? "This event is not mapped to Meta while the storefront is a testing project." : "";
    const label = destinations.find(d => d[0] === destination)?.[1] || destination;
    return '<label class="hf-tracking-toggle" title="'+H.esc(disabled ? disabledReason : ((checked ? "Disable " : "Enable ")+label+" for "+eventKey))+'">' +
      '<input type="checkbox" data-route-destination="'+H.esc(destination)+'" data-route-event="'+H.esc(eventKey)+'" '+(checked?"checked ":"")+(disabled?"disabled ":"")+'aria-label="'+H.esc(label+" "+eventKey)+'"><span aria-hidden="true"></span></label>';
  }
  function render() {
    $("trackingSettingsBody").innerHTML = events.map(([key,label,description]) =>
      '<tr><td class="hf-tracking-event"><strong>'+H.esc(label)+'</strong><small>'+H.esc(description)+' <span style="font-family:monospace">('+H.esc(key)+')</span></small></td>' +
      '<td class="hf-tracking-toggle-cell">'+routeControl("meta_pixel",key)+'</td>' +
      '<td class="hf-tracking-toggle-cell">'+routeControl("meta_capi",key)+'</td>' +
      '<td class="hf-tracking-toggle-cell">'+routeControl("ga4",key)+'</td></tr>'
    ).join("");
    $("capiTokenStatus").textContent = config.metaCapiTokenConfigured ? "Saved in Supabase Secrets" : "Not detected";
    $("capiModeStatus").textContent = config.metaCapiMode === "test" ? (config.testEventCodeConfigured ? "Test mode ready" : "Test code missing") : (config.metaCapiMode === "production" ? "Production mode" : "Disabled — safe default");
    $("purchaseLockStatus").textContent = config.livePurchaseTracking ? "Live purchase tracking enabled" :
      (config.metaCapiMode === "test" && config.testEventCodeConfigured
        ? "Test-only Purchase allowed; live Purchase remains locked"
        : "Locked — test project");
    const note = $("trackingConfigNote");
    const selectedMode = $("metaCapiModeControl")?.value || config.metaCapiMode;
    const selectedLivePurchase = $("livePurchaseTrackingControl")?.checked === true;
    $("capiModeStatus").textContent = selectedMode === "test" ? (config.testEventCodeConfigured ? "Test mode ready" : "Test code missing") : (selectedMode === "production" ? "Production mode" : "Disabled — safe default");
    $("purchaseLockStatus").textContent = selectedLivePurchase ? "Live Purchase tracking enabled" :
      (selectedMode === "test" && config.testEventCodeConfigured ? "Test-only Purchase; live Purchase off" : "Off — Purchase is not being sent live");
    if (selectedMode === "disabled") {
      note.className = "hf-banner hf-banner-warning hf-tracking-mode-note";
      note.innerHTML = '<span>!</span><div><strong>Meta CAPI is safely disabled</strong>The access token is kept server-side. Choose Test mode only with a configured Test Events code; choose Production to send enabled events to normal Meta reporting.</div>';
    } else if (selectedMode === "test" && !config.testEventCodeConfigured) {
      note.className = "hf-banner hf-banner-warning hf-tracking-mode-note";
      note.innerHTML = '<span>!</span><div><strong>Test mode needs a Test Events code</strong>Add the Test Events code as the Supabase secret META_CAPI_TEST_EVENT_CODE before enabling server routes.</div>';
    } else if (selectedMode === "test") {
      note.className = "hf-banner hf-banner-info hf-tracking-mode-note";
      note.innerHTML = '<span>i</span><div><strong>Meta CAPI is in test mode</strong>Events are marked as test events and are intended for validation in Events Manager, not production reporting.</div>';
    } else {
      note.className = "hf-banner hf-banner-info hf-tracking-mode-note";
      note.innerHTML = '<span>i</span><div><strong>Meta CAPI is in production mode</strong>Only explicitly enabled, mapped events will be sent server-side. Purchase is sent only for a server-verified saved order and only while Live Purchase is enabled.</div>';
    }
    updateSaveStatus();
  }
  function serialiseControls() {
    const map = new Map(currentRows.map(row => [row.destination+":"+row.event_key,row]));
    document.querySelectorAll("[data-route-destination][data-route-event]").forEach(input => {
      const key = input.dataset.routeDestination+":"+input.dataset.routeEvent;
      const prev = map.get(key) || {destination:input.dataset.routeDestination,event_key:input.dataset.routeEvent,enabled:false};
      map.set(key,{...prev, enabled:input.disabled ? prev.enabled===true : input.checked});
    });
    return [...map.values()].map(row => ({destination:row.destination,event_key:row.event_key,enabled:row.enabled===true,updated_by:H.ADMIN_EMAIL}));
  }
  function stateSnapshot() {
    return JSON.stringify({
      routes: serialiseControls().map(r=>[r.destination,r.event_key,r.enabled]).sort(),
      mode: $("metaCapiModeControl")?.value || "disabled",
      livePurchase: $("livePurchaseTrackingControl")?.checked === true
    });
  }
  function updateSaveStatus() {
    const dirty = stateSnapshot() !== savedSnapshot;
    $("trackingSaveStatus").textContent = dirty ? "Unsaved changes — save to apply." : "No unsaved changes.";
    $("saveTracking").disabled = !dirty;
    $("saveTrackingBottom").disabled = !dirty;
  }
  async function load() {
    $("trackingSaveStatus").textContent = "Loading settings…";
    const [settingsResponse, configResponse] = await Promise.all([
      H.signedQuery(H.client.from("tracking_event_settings").select("destination,event_key,enabled,updated_at,updated_by").order("event_key")),
      fetch(configUrl,{method:"GET",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer"}).then(async r=>{if(!r.ok)throw new Error("Server tracking configuration could not be loaded.");return r.json();})
    ]);
    currentRows = Array.isArray(settingsResponse) ? settingsResponse : [];
    config = configResponse || config;
    $("metaCapiModeControl").value = config.metaCapiMode || "disabled";
    $("livePurchaseTrackingControl").checked = config.livePurchaseTracking === true;
    $("livePurchaseHelp").textContent = config.livePurchaseTracking
      ? "Live Purchase is enabled. Only server-verified saved orders are eligible."
      : "Off. Enable this only when actual customer orders are being accepted.";
    render();
    savedSnapshot = stateSnapshot();
    updateSaveStatus();
  }
  async function save() {
    const button = $("saveTracking");
    button.disabled = true;
    $("saveTrackingBottom").disabled = true;
    $("trackingSaveStatus").textContent = "Saving secure tracking settings…";
    try {
      const selectedMode = $("metaCapiModeControl").value;
      const livePurchase = $("livePurchaseTrackingControl").checked === true;
      if (selectedMode === "production" && config.metaCapiTokenConfigured !== true) {
        throw new Error("Meta CAPI access token is missing in Supabase Secrets; Production mode cannot be enabled.");
      }
      if (livePurchase && selectedMode !== "production") {
        throw new Error("Live Purchase can be enabled only in Production mode.");
      }
      if (selectedMode === "test" && !config.testEventCodeConfigured) {
        throw new Error("Add META_CAPI_TEST_EVENT_CODE in Supabase Secrets before selecting Test mode.");
      }
      const payload = serialiseControls();
      const {error} = await H.client.from("tracking_event_settings").upsert(payload,{onConflict:"destination,event_key"});
      if (error) throw error;
      const {error:runtimeError} = await H.client.from("tracking_runtime_settings").upsert({
        id: 1,
        meta_capi_mode: selectedMode,
        live_purchase_tracking: livePurchase,
        updated_by: H.ADMIN_EMAIL
      },{onConflict:"id"});
      if (runtimeError) throw runtimeError;
      await H.audit("tracking_routes_updated","tracking_event_settings",null,"Updated platform, event routing and runtime mode controls",{routesUpdated:payload.length,metaCapiMode:selectedMode,livePurchaseTracking:livePurchase});
      H.toast("Tracking settings saved.");
      await load();
    } catch (error) {
      console.error("Tracking settings save failed",error);
      H.toast(error.message || "Could not save tracking settings.","error");
      $("trackingSaveStatus").textContent = "Save failed. Check admin access and retry.";
      button.disabled = false;
      $("saveTrackingBottom").disabled = false;
    }
  }
  $("metaCapiModeControl")?.addEventListener("change",()=>{
    if ($("metaCapiModeControl").value !== "production") $("livePurchaseTrackingControl").checked = false;
    currentRows = serialiseControls();
    render();
  });
  $("livePurchaseTrackingControl")?.addEventListener("change",()=>{
    currentRows = serialiseControls();
    $("livePurchaseHelp").textContent = $("livePurchaseTrackingControl").checked
      ? "Live Purchase is enabled. Only server-verified saved orders are eligible."
      : "Off. Enable this only when actual customer orders are being accepted.";
    render();
  });
  document.querySelectorAll("[data-refresh-page]").forEach(button=>button.addEventListener("click",()=>load().catch(e=>H.toast(e.message||"Refresh failed","error"))));
  $("refreshTracking")?.addEventListener("click",()=>load().then(()=>H.toast("Tracking status refreshed.")).catch(e=>H.toast(e.message||"Refresh failed","error")));
  $("saveTracking")?.addEventListener("click",save);
  $("saveTrackingBottom")?.addEventListener("click",save);
  $("discardTracking")?.addEventListener("click",()=>load().then(()=>H.toast("Unsaved changes discarded.")).catch(e=>H.toast(e.message||"Could not reload settings.","error")));
  $("trackingSettingsBody")?.addEventListener("change",event=>{
    if(event.target?.matches?.("[data-route-destination][data-route-event]")) {
      currentRows = serialiseControls();
      updateSaveStatus();
    }
  });
  try { await load(); }
  catch (error) {
    console.error("Tracking page load failed",error);
    $("trackingSettingsBody").innerHTML='<tr><td colspan="4">Unable to load settings. Refresh and confirm that the admin session has two-step verification enabled.</td></tr>';
    H.toast(error.message||"Could not load tracking settings.","error");
  }
});
})();
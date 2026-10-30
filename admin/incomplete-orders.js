(() => {
"use strict";
window.HFAdminReady.then(async (H) => {
 if (!H) return;
 const {client,esc,money,dateTime,dateOnly,toast,audit,signedQuery,makeEmpty} = H;
 const $ = (id) => document.getElementById(id);
 const table = $("incompleteTableBody");
 const dialog = $("incompleteDetailsDialog");
 let records = [];

 function itemLabel(items) {
  const list = Array.isArray(items) ? items : [];
  return list.length ? list.map((item) => String(item.name || "Item") + " × " + String(item.quantity || 1)).join(", ") : "No product details";
 }
 function filteredRecords() {
  const query = String($("incompleteSearch")?.value || "").toLowerCase().trim();
  const status = $("incompleteStatusFilter")?.value || "incomplete";
  return records.filter((row) => {
   if (status !== "all" && row.status !== status) return false;
   const haystack = [row.customer_name,row.customer_phone,row.customer_email,row.delivery_address,itemLabel(row.item_summary),row.converted_order_number].join(" ").toLowerCase();
   return !query || haystack.includes(query);
  });
 }
 function render() {
  const rows = filteredRecords();
  if (!rows.length) {
   table.innerHTML = '<tr><td colspan="8">' + makeEmpty("No checkout records found", "A record appears after a shopper enters a valid mobile number following the checkout privacy notice.") + "</td></tr>";
   return;
  }
  table.innerHTML = rows.map((row) => {
   const progress = Math.max(0,Math.min(95,Number(row.progress_percent)||0));
   const customer = row.customer_name || "Name not entered";
   const phone = row.customer_phone || "No mobile entered";
   const email = row.customer_email || "No email entered";
   const items = itemLabel(row.item_summary);
   const method = row.consent_method === "checkout_form_entry_after_notice"
    ? '<span class="hf-status hf-status-confirmed">After privacy notice</span>'
    : '<span class="hf-status">Legacy checkbox</span>';
   const marketing = row.marketing_consent === true
    ? '<small>Marketing consent recorded</small>'
    : '<small>No promotional permission</small>';
   return '<tr>' +
    '<td><strong>' + esc(dateOnly(row.first_seen_at || row.created_at)) + '</strong><small>' + esc(dateTime(row.first_seen_at || row.created_at)) + '</small></td>' +
    '<td class="hf-incomplete-customer"><strong>' + esc(customer) + '</strong><small>' + esc(row.order_context === "cart" ? "Cart checkout" : "Single product") + '</small></td>' +
    '<td><strong>' + esc(phone) + '</strong><small>' + esc(email) + '</small></td>' +
    '<td class="hf-incomplete-items">' + esc(items) + '<small>' + esc(money(row.total)) + ' estimated checkout total</small></td>' +
    '<td><div class="hf-incomplete-progress"><span>' + progress + '%</span><span class="hf-incomplete-progress-track"><span class="hf-incomplete-progress-fill" style="display:block;width:' + progress + '%"></span></span></div><small>' + esc(row.last_step || "Checkout started") + '</small></td>' +
    '<td><strong>' + esc(dateTime(row.last_seen_at)) + '</strong><small>' + esc(row.last_field ? "Last field: " + row.last_field : "Progress saved") + '</small></td>' +
    '<td>' + method + marketing + '</td>' +
    '<td><div class="hf-incomplete-actions"><button type="button" class="hf-button hf-button-secondary hf-button-small" data-incomplete-view="' + esc(row.id) + '">View</button>' +
    (row.customer_phone ? '<button type="button" class="hf-button hf-button-success hf-button-small" data-incomplete-contact="' + esc(row.id) + '">WhatsApp</button>' : '') + '<button type="button" class="hf-button hf-button-danger hf-button-small" data-incomplete-delete="' + esc(row.id) + '">Delete</button></div></td>' +
   '</tr>';
  }).join("");
 }
 function updateKpis() {
  const incomplete = records.filter((row) => row.status === "incomplete");
  $("incompleteCount").textContent = incomplete.length.toLocaleString("en-BD");
  $("incompletePhoneCount").textContent = incomplete.filter((row) => Boolean(row.customer_phone)).length.toLocaleString("en-BD");
  $("incompleteMarketingCount").textContent = incomplete.filter((row) => row.marketing_consent === true).length.toLocaleString("en-BD");
  $("incompleteConvertedCount").textContent = records.filter((row) => row.status === "converted").length.toLocaleString("en-BD");
 }
 function detailCard(label,value) {
  return '<div class="hf-incomplete-detail"><span>' + esc(label) + '</span><strong>' + esc(value || "—") + '</strong></div>';
 }
 function openDetails(row) {
  $("incompleteDetailsTitle").textContent = row.customer_name || "Incomplete checkout";
  $("incompleteDetailsMeta").textContent = (row.customer_phone || row.customer_email || "No contact detail") + " · " + dateTime(row.first_seen_at);
  const items = Array.isArray(row.item_summary) ? row.item_summary : [];
  const itemTable = items.length
   ? '<table class="hf-incomplete-detail-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th></tr></thead><tbody>' + items.map((item) => '<tr><td>' + esc(item.name) + '</td><td>' + esc(item.quantity) + '</td><td>' + esc(money(item.unit_price)) + '</td></tr>').join("") + '</tbody></table>'
   : '<p class="hf-data-note">No product details were captured.</p>';
  const methodLabel = row.consent_method === "checkout_form_entry_after_notice"
   ? "Valid mobile number entered after checkout privacy notice"
   : "Legacy explicit checkbox";
  const consent = '<div class="hf-incomplete-consent">' +
   (row.recovery_consent ? '<span class="hf-status hf-status-confirmed">Legacy recovery checkbox recorded</span>' : '<span class="hf-status hf-status-review">No separate recovery checkbox</span>') +
   '<span class="hf-status">Collection method: ' + esc(methodLabel) + '</span>' +
   (row.consent_version ? '<span class="hf-status">Notice / consent version: ' + esc(row.consent_version) + '</span>' : '') +
   (row.marketing_consent ? '<span class="hf-status hf-status-confirmed">Marketing consent recorded · ' + esc(dateTime(row.marketing_consent_at)) + '</span>' : '<span class="hf-status hf-status-review">Marketing not permitted</span>') +
   '</div>';
  $("incompleteDetailsBody").innerHTML =
   '<div class="hf-incomplete-detail-grid">' +
   detailCard("Mobile number",row.customer_phone) +
   detailCard("Email address",row.customer_email) +
   detailCard("Delivery area",row.delivery_zone === "inside_dhaka" ? "Inside Dhaka" : row.delivery_zone === "outside_dhaka" ? "Outside Dhaka" : "Not selected") +
   detailCard("Estimated total",money(row.total)) +
   detailCard("Checkout progress",String(row.progress_percent || 0) + "%") +
   detailCard("Last activity",dateTime(row.last_seen_at)) +
   detailCard("Started",dateTime(row.first_seen_at)) +
   detailCard("Record status",row.status === "converted" ? "Converted · " + (row.converted_order_number || "Order linked") : "Incomplete") +
   '</div>' +
   '<section><h3>Selected products</h3>' + itemTable + '</section>' +
   '<section><h3>Address and notes</h3>' + detailCard("Delivery address",row.delivery_address) + detailCard("Order notes",row.order_notes) + '</section>' +
   '<section><h3>Data collection and permissions</h3>' + consent + '<p class="hf-data-note">New records are saved after the shopper enters a valid mobile number following the checkout privacy notice. Use is limited to helping with that specific unfinished checkout. Promotional messages are not permitted unless a separate marketing opt-in exists.</p></section>';
  if (!dialog.open) dialog.showModal();
 }
 async function refresh() {
  table.innerHTML = '<tr><td colspan="8" class="hf-loading">Loading incomplete checkout records…</td></tr>';
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [checkoutRows, approvedReviews] = await Promise.all([
   signedQuery(client.from("incomplete_checkouts")
    .select("id,checkout_session_id,customer_name,customer_phone,customer_email,delivery_address,order_notes,order_context,delivery_zone,item_summary,total,last_step,last_field,progress_percent,recovery_consent,recovery_consent_at,consent_method,consent_version,marketing_consent,marketing_consent_at,status,converted_order_number,first_seen_at,last_seen_at,expires_at,created_at")
    .gt("expires_at",new Date().toISOString())
    .order("last_seen_at",{ascending:false})
    .limit(1000)),
   signedQuery(client.from("order_security_reviews")
    .select("order_number,status,order_id,order_payload,reviewed_at")
    .eq("status","approved")
    .gte("reviewed_at",cutoff)
    .order("reviewed_at",{ascending:false})
    .limit(1000))
  ]);
  records = Array.isArray(checkoutRows) ? checkoutRows : [];
  const approvedBySession = new Map();
  (Array.isArray(approvedReviews) ? approvedReviews : []).forEach((review) => {
   const payload = review.order_payload && typeof review.order_payload === "object" ? review.order_payload : {};
   const sessionId = String(payload.checkoutSessionId || "");
   if (sessionId && review.order_id) approvedBySession.set(sessionId,review);
  });
  for (const row of records) {
   const approved = approvedBySession.get(row.checkout_session_id);
   if (row.status !== "incomplete" || !approved) continue;
   const convertedAt = approved.reviewed_at || new Date().toISOString();
   const {error} = await client.from("incomplete_checkouts").update({
    status:"converted",
    converted_order_id:approved.order_id,
    converted_order_number:approved.order_number,
    converted_at:convertedAt,
    last_seen_at:convertedAt,
    updated_at:convertedAt
   }).eq("id",row.id).eq("status","incomplete");
   if (!error) {
    row.status = "converted";
    row.converted_order_number = approved.order_number;
    row.converted_at = convertedAt;
    row.converted_order_id = approved.order_id;
   }
  }
  updateKpis();
  render();
  $("incompleteUpdatedAt").textContent = "Updated " + dateTime(new Date().toISOString());
  $("incompleteDataNote").textContent = records.length >= 1000
   ? "Showing the latest 1,000 unexpired records. Records are automatically deleted after 30 days; no messages are sent automatically."
   : records.length + " recent records · Automatically deleted after 30 days · No messages are sent automatically.";
 }
 $("incompleteSearch")?.addEventListener("input",render);
 $("incompleteStatusFilter")?.addEventListener("change",render);
 table?.addEventListener("click",async(event) => {
  const viewButton = event.target.closest("[data-incomplete-view]");
  if (viewButton) {
   const row = records.find((item) => item.id === viewButton.dataset.incompleteView);
   if (row) openDetails(row);
   return;
  }
  const contactButton = event.target.closest("[data-incomplete-contact]");
  if (contactButton) {
   const row = records.find((item) => item.id === contactButton.dataset.incompleteContact);
   if (!row?.customer_phone) return;
   let phone = String(row.customer_phone).replace(/\D/g,"");
   if (phone.startsWith("00880")) phone = phone.slice(2);
   else if (phone.startsWith("0")) phone = "88" + phone;
   if (!/^8801[3-9]\d{8}$/.test(phone)) {
    toast("This record does not contain a valid Bangladeshi mobile number.","error");
    return;
   }
   const name = row.customer_name || "there";
   const message = "Assalamu Alaikum " + name + ", you recently started a checkout on Halal Food. Would you like any help completing that specific order? Please reply here if you need assistance. This is not a promotional offer.";
   window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message),"_blank","noopener,noreferrer");
   void audit("incomplete_checkout_recovery_opened","incomplete_checkout",row.id,"Admin opened a checkout-recovery WhatsApp draft",{consentMethod:row.consent_method,marketingConsent:row.marketing_consent===true});
   return;
  }
  const deleteButton = event.target.closest("[data-incomplete-delete]");
  if (deleteButton) {
   const row = records.find((item) => item.id === deleteButton.dataset.incompleteDelete);
   if (!row || !confirm("Permanently delete this incomplete checkout record? This cannot be undone.")) return;
   deleteButton.disabled = true;
   try {
    const {error} = await client.from("incomplete_checkouts").delete().eq("id",row.id);
    if (error) throw error;
    await audit("incomplete_checkout_deleted","incomplete_checkout",row.id,"Incomplete checkout record deleted",{status:row.status});
    records = records.filter((item) => item.id !== row.id);
    updateKpis();
    render();
    toast("Incomplete checkout record deleted.");
   } catch (error) {
    toast(error?.message || "Record could not be deleted.", "error");
    deleteButton.disabled = false;
   }
  }
 });
 document.querySelectorAll("[data-refresh-page]").forEach((button) => button.addEventListener("click",async() => {
  button.disabled = true;
  try { await refresh(); toast("Incomplete checkout records refreshed."); }
  catch(error) { toast(error?.message || "Could not refresh records.", "error"); }
  finally { button.disabled = false; }
 }));
 try { await refresh(); }
 catch(error) {
  console.error("Incomplete checkout records failed to load.",error);
  $("incompleteUpdatedAt").textContent = "Unavailable";
  table.innerHTML = '<tr><td colspan="8">' + makeEmpty("Could not load incomplete checkouts", "Verify that your admin session is MFA-verified and the new table is available.") + '</td></tr>';
  $("incompleteDataNote").textContent = error?.message || "Database access failed.";
 }
});
})();
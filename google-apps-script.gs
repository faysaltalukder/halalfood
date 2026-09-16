/*
  Halal Food — Google Apps Script
  Supports both the existing single-product payload and guest cart orders.
  Cart orders send { orderId, items:[{product,quantity,price}], ... }.
*/
const SHEET_NAME = "Orders";

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

  const headers = ["Timestamp","Order ID","Product","Name","Mobile","Address","District","Upazila","Quantity","Notes"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    // Add the new Order ID column only when it is not already present.
    if (firstRow.indexOf("Order ID") === -1) {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  let data = {};
  try { data = JSON.parse(e.postData.contents || "{}"); }
  catch (_) { data = e.parameter || {}; }

  const orderId = data.orderId || ("HF-" + new Date().getTime());
  const items = Array.isArray(data.items) && data.items.length ? data.items : [{
    product: data.product || "",
    quantity: data.quantity || ""
  }];

  items.forEach(function(item) {
    sheet.appendRow([
      new Date(),
      orderId,
      item.product || data.product || "",
      data.name || "",
      data.mobile || "",
      data.address || "",
      data.district || "",
      data.upazila || "",
      item.quantity || data.quantity || "",
      data.notes || ""
    ]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({success:true, orderId:orderId, items:items.length}))
    .setMimeType(ContentService.MimeType.JSON);
}

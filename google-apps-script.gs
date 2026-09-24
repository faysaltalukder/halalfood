/*
  Halal Food — Google Apps Script
  Receives both single-product and guest cart orders from order.html.
*/
const SHEET_NAME = "Orders";
const HEADERS = [
  "Timestamp", "Order ID", "Product", "Unit Price", "Line Total",
  "Name", "Mobile", "Email", "Address", "District", "Upazila", "Quantity", "Notes", "Order Total"
];

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sheet);

  let data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (_) {
    data = (e && e.parameter) || {};
  }

  const orderId = data.orderId || ("HF-" + Date.now());
  const items = Array.isArray(data.items) && data.items.length
    ? data.items
    : [{ product: data.product || "", quantity: data.quantity || "", price: data.price || "" }];

  const orderTotal = items.reduce(function(sum, item) {
    const price = Number(item.price || 0);
    const qty = Math.max(1, Number(item.quantity) || 1);
    return sum + (Number.isFinite(price) ? price * qty : 0);
  }, 0);

  const headerMap = getHeaderMap_(sheet);
  const rows = items.map(function(item) {
    const price = Number(item.price || 0);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = Number.isFinite(price) ? price * qty : "";
    const row = new Array(sheet.getLastColumn()).fill("");

    setCell_(row, headerMap, "Timestamp", new Date());
    setCell_(row, headerMap, "Order ID", orderId);
    setCell_(row, headerMap, "Product", item.product || data.product || "");
    setCell_(row, headerMap, "Unit Price", item.price || data.price || "");
    setCell_(row, headerMap, "Line Total", lineTotal);
    setCell_(row, headerMap, "Name", data.name || "");
    setCell_(row, headerMap, "Mobile", data.mobile || "");
    setCell_(row, headerMap, "Email", data.email || "");
    setCell_(row, headerMap, "Address", data.address || "");
    setCell_(row, headerMap, "District", data.district || "");
    setCell_(row, headerMap, "Upazila", data.upazila || "");
    setCell_(row, headerMap, "Quantity", qty);
    setCell_(row, headerMap, "Notes", data.notes || "");
    setCell_(row, headerMap, "Order Total", orderTotal);
    return row;
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, sheet.getLastColumn()).setValues(rows);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, orderId: orderId, items: items.length, orderTotal: orderTotal }))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  const missing = HEADERS.filter(function(header) { return current.indexOf(header) === -1; });
  if (missing.length) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
  }
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const map = {};
  headers.forEach(function(header, index) {
    if (header) map[header] = index;
  });
  return map;
}

function setCell_(row, headerMap, header, value) {
  if (headerMap[header] !== undefined) row[headerMap[header]] = value;
}

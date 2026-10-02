/*
  Halal Food — Google Apps Script
  Receives single-product and guest cart orders, stores them in Google Sheets,
  and optionally sends a personalized visual Thank-You Card by email.

  IMPORTANT:
  1) TEST_MODE is TRUE initially so customer emails are NOT sent during testing.
  2) Change TEST_RECIPIENT_EMAIL to the inbox you want to use for testing.
  3) After testing, set TEST_MODE = false to send to the customer's own email.
*/
const SHEET_NAME = "Orders";
const TEST_MODE = true;
const TEST_RECIPIENT_EMAIL = "halalfoodbd.official@gmail.com";
const LOGO_URL = "https://raw.githubusercontent.com/faysaltalukder/halalfood/main/images/logo-favicon/logo.png";
const SITE_URL = "https://faysaltalukder.github.io/halalfood/";

const HEADERS = [
  "Timestamp", "Order ID", "Product", "Unit Price", "Line Total",
  "Name", "Mobile", "Email", "Address", "District", "Upazila",
  "Quantity", "Notes", "Order Total", "Thank You Email Status"
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
    setCell_(row, headerMap, "Thank You Email Status", data.email ? "Pending" : "No email provided");
    return row;
  });

  let firstWrittenRow = 0;
  if (rows.length) {
    firstWrittenRow = sheet.getLastRow() + 1;
    sheet.getRange(firstWrittenRow, 1, rows.length, sheet.getLastColumn()).setValues(rows);
  }

  // Send the personalized card only when the customer voluntarily provided an email.
  // In TEST_MODE it goes only to TEST_RECIPIENT_EMAIL.
  let emailStatus = data.email ? "Pending" : "No email provided";
  if (data.email && String(data.email).trim()) {
    try {
      const recipient = TEST_MODE ? TEST_RECIPIENT_EMAIL : String(data.email).trim();
      const cardBlob = createThankYouCard_(data, items, orderId, orderTotal);
      const subject = TEST_MODE
        ? "[TEST] Thank You Card — " + (data.name || "Halal Food Customer") + " — " + orderId
        : "Thank You, " + (data.name || "Friend") + " — You’re Part of the Halal Food Journey ❤️";

      const htmlBody = buildThankYouEmail_(data, items, orderId, orderTotal, TEST_MODE);

      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
        body: buildPlainTextEmail_(data, items, orderId, orderTotal, TEST_MODE),
        attachments: [cardBlob],
        name: "Halal Food"
      });

      emailStatus = TEST_MODE ? "TEST sent to " + TEST_RECIPIENT_EMAIL : "Sent to customer";
    } catch (err) {
      emailStatus = "Failed: " + String(err && err.message ? err.message : err);
    }
  }

  if (firstWrittenRow && rows.length) {
    const statusColumn = getHeaderMap_(sheet)["Thank You Email Status"];
    if (statusColumn !== undefined) {
      sheet.getRange(firstWrittenRow, statusColumn + 1, rows.length, 1)
        .setValues(rows.map(function() { return [emailStatus]; }));
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      orderId: orderId,
      items: items.length,
      orderTotal: orderTotal,
      thankYouEmail: emailStatus
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createThankYouCard_(data, items, orderId, orderTotal) {
  const name = escapeXml_(data.name || "Friend");
  const itemLines = items.map(function(item) {
    const product = escapeXml_(item.product || "Product");
    const qty = Math.max(1, Number(item.quantity) || 1);
    return '<text x="800" y="' + (780 + items.indexOf(item) * 62) + '" text-anchor="middle" class="item">' +
      product + ' × ' + qty + '</text>';
  }).join("");

  let logoData = "";
  try {
    const response = UrlFetchApp.fetch(LOGO_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      logoData = Utilities.base64Encode(response.getBlob().getBytes());
    }
  } catch (_) {}

  const logoMarkup = logoData
    ? '<image href="data:image/png;base64,' + logoData + '" x="500" y="85" width="600" height="300" preserveAspectRatio="xMidYMid meet"/>'
    : '<text x="800" y="220" text-anchor="middle" class="brand">HALAL FOOD</text>';

  const svg =
'<?xml version="1.0" encoding="UTF-8"?>' +
'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600">' +
'<rect width="1600" height="1600" rx="42" fill="#F7F1E6"/>' +
'<rect x="35" y="35" width="1530" height="1530" rx="30" fill="none" stroke="#2B2A3D" stroke-width="4"/>' +
'<rect x="85" y="85" width="1430" height="1430" rx="22" fill="#FFFFFF" stroke="#D9D2C4" stroke-width="2"/>' +
logoMarkup +
'<text x="800" y="485" text-anchor="middle" class="eyebrow">A PERSONAL THANK-YOU FROM</text>' +
'<text x="800" y="575" text-anchor="middle" class="title">Halal Food</text>' +
'<text x="800" y="660" text-anchor="middle" class="name">Thank You, ' + name + ' ❤️</text>' +
'<line x1="330" y1="705" x2="1270" y2="705" stroke="#D9D2C4" stroke-width="2"/>' +
'<text x="800" y="755" text-anchor="middle" class="section">Your Order</text>' +
itemLines +
'<text x="800" y="990" text-anchor="middle" class="order">Order ID: ' + escapeXml_(orderId) + '</text>' +
'<text x="800" y="1060" text-anchor="middle" class="message">আপনার ভালোবাসা ও আস্থার জন্য আন্তরিক ধন্যবাদ।</text>' +
'<text x="800" y="1110" text-anchor="middle" class="message">আপনার প্রতিটি response আমাদের শেখার যাত্রার অংশ।</text>' +
'<text x="800" y="1180" text-anchor="middle" class="small">আমরা বাস্তব অভিজ্ঞতার মাধ্যমে একটি সুন্দর,</text>' +
'<text x="800" y="1220" text-anchor="middle" class="small">বিশ্বাসযোগ্য ও customer-focused food brand তৈরি করার চেষ্টা করছি।</text>' +
'<text x="800" y="1320" text-anchor="middle" class="signature">— Team Halal Food</text>' +
'<text x="800" y="1400" text-anchor="middle" class="site">' + escapeXml_(SITE_URL.replace(/^https?:\/\//, "")) + '</text>' +
'<text x="800" y="1460" text-anchor="middle" class="footer">Thank you for being part of our journey.</text>' +
'<style>' +
'.eyebrow{font-family:Arial,sans-serif;font-size:25px;letter-spacing:5px;fill:#686575}' +
'.brand{font-family:Arial,sans-serif;font-size:74px;font-weight:700;fill:#2B2A3D}' +
'.title{font-family:Arial,sans-serif;font-size:62px;font-weight:700;fill:#2B2A3D}' +
'.name{font-family:Arial,sans-serif;font-size:52px;font-weight:700;fill:#2B2A3D}' +
'.section{font-family:Arial,sans-serif;font-size:27px;font-weight:700;letter-spacing:3px;fill:#686575}' +
'.item{font-family:Arial,sans-serif;font-size:31px;font-weight:600;fill:#2B2A3D}' +
'.order{font-family:Arial,sans-serif;font-size:26px;font-weight:700;fill:#686575}' +
'.message{font-family:Noto Sans Bengali,Arial,sans-serif;font-size:31px;fill:#2B2A3D}' +
'.small{font-family:Noto Sans Bengali,Arial,sans-serif;font-size:24px;fill:#686575}' +
'.signature{font-family:Arial,sans-serif;font-size:29px;font-weight:700;fill:#2B2A3D}' +
'.site{font-family:Arial,sans-serif;font-size:22px;fill:#686575}' +
'.footer{font-family:Arial,sans-serif;font-size:20px;fill:#8A8490}' +
'</style></svg>';

  return Utilities.newBlob(svg, "image/svg+xml", "Halal-Food-Thank-You-" + orderId + ".svg");
}

function buildThankYouEmail_(data, items, orderId, orderTotal, testMode) {
  const name = escapeHtml_(data.name || "Friend");
  const productHtml = items.map(function(item) {
    return "<li>" + escapeHtml_(item.product || "Product") + " × " +
      Math.max(1, Number(item.quantity) || 1) + "</li>";
  }).join("");

  const testNote = testMode
    ? '<div style="margin:0 0 20px;padding:12px 16px;background:#fff3cd;border:1px solid #e6c96b;color:#5d4a00;border-radius:8px;"><strong>TEST MODE:</strong> This message was sent to the Halal Food test inbox, not to the customer.</div>'
    : "";

  return '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#2B2A3D;background:#F7F1E6;padding:28px;">' +
    testNote +
    '<div style="background:#fff;border:1px solid #ddd5c7;padding:30px;border-radius:12px;">' +
    '<p style="font-size:13px;letter-spacing:2px;color:#777;">HALAL FOOD</p>' +
    '<h1 style="margin:0 0 14px;">Thank you, ' + name + ' ❤️</h1>' +
    '<p style="line-height:1.7;">আপনার ভালোবাসা ও আমাদের সাথে এই ছোট্ট যাত্রায় যুক্ত হওয়ার জন্য আন্তরিক ধন্যবাদ। আপনার জন্য একটি personalized Thank-You Card এই email-এর সাথে সংযুক্ত করেছি। আপনি চাইলে এটি download করে নিজের কাছে রাখতে বা social media-তে share করতে পারেন।</p>' +
    '<h3>Your Order</h3><ul>' + productHtml + '</ul>' +
    '<p><strong>Order ID:</strong> ' + escapeHtml_(orderId) + '<br><strong>Order Total:</strong> ৳ ' + Math.round(Number(orderTotal) || 0).toLocaleString("en-BD") + '</p>' +
    '<p style="line-height:1.7;">Halal Food আমাদের একটি বাস্তব learning project—আমরা customer experience, digital marketing এবং একটি বিশ্বাসযোগ্য food brand তৈরির বাস্তব দিকগুলো শিখছি। আপনার response আমাদের এই যাত্রায় আরও এক ধাপ এগিয়ে দেয়।</p>' +
    '<p style="margin-top:26px;"><strong>— Team Halal Food</strong></p>' +
    '<p style="font-size:13px;color:#777;">' + escapeHtml_(SITE_URL.replace(/^https?:\/\//, "")) + '</p>' +
    '</div></div>';
}

function buildPlainTextEmail_(data, items, orderId, orderTotal, testMode) {
  const lines = items.map(function(item) {
    return "- " + (item.product || "Product") + " × " + Math.max(1, Number(item.quantity) || 1);
  }).join("\n");
  return (testMode ? "[TEST MODE] This email was sent to the Halal Food test inbox.\n\n" : "") +
    "Thank you, " + (data.name || "Friend") + "!\n\n" +
    "আপনার ভালোবাসা ও আমাদের সাথে এই ছোট্ট যাত্রায় যুক্ত হওয়ার জন্য আন্তরিক ধন্যবাদ।\n\n" +
    "Your Order:\n" + lines + "\n\n" +
    "Order ID: " + orderId + "\n" +
    "Order Total: ৳ " + Math.round(Number(orderTotal) || 0).toLocaleString("en-BD") + "\n\n" +
    "Your personalized Thank-You Card is attached to this email.\n\n" +
    "— Team Halal Food\n" + SITE_URL;
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
  });
}

function escapeXml_(value) {
  return String(value).replace(/[<>&'"]/g, function(c) {
    return {"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c];
  });
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

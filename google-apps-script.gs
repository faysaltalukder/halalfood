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
const LOGO_URL = "https://raw.githubusercontent.com/faysaltalukder/halalfood/main/images/logo-favicon/halal-food-official-logo.svg";
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


/* ===== Shareable Thank-You Card Upgrade ===== */
var CARD_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzShx69e71dZWyF8MN3ZWJSN5rTdeizgsFoN-ElkZzs2_j_gncglTeGfpZiDm3YiZskGQ/exec";
var CARD_PHONE = "01842031164";

function doGet(e) {
  try {
    var token=e&&e.parameter&&e.parameter.card?String(e.parameter.card):"";
    if(!token)return HtmlService.createHtmlOutput("<h2 style='font-family:Arial;text-align:center;padding:60px'>Halal Food<br><small>Thank-You Card link is missing.</small></h2>");
    var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); if(!sh)return HtmlService.createHtmlOutput("<h2>Order sheet not found.</h2>");
    ensureCardTokenHeader_(sh); var m=getHeaderMap_(sh), tc=m["Card Token"];
    var vals=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues():[];
    var rows=vals.filter(function(row){return String(row[tc]||"")===token;});
    if(!rows.length)return HtmlService.createHtmlOutput("<h2 style='font-family:Arial;text-align:center;padding:60px'>This Thank-You Card link is invalid.</h2>");
    var first=rows[0], data={name:first[m["Name"]],email:first[m["Email"]]}, orderId=String(first[m["Order ID"]]||""), total=Number(first[m["Order Total"]]||0);
    var items=rows.map(function(row){return{product:String(row[m["Product"]]||"Product"),quantity:Number(row[m["Quantity"]]||1),price:Number(row[m["Unit Price"]]||0),lineTotal:Number(row[m["Line Total"]]||0)};});
    return HtmlService.createHtmlOutput(buildCardPage_(buildCardSvg_(data,items,orderId,total),data.name,orderId)).setTitle("Thank You — Halal Food");
  }catch(err){return HtmlService.createHtmlOutput("<h2 style='font-family:Arial;text-align:center;padding:60px'>Halal Food<br><small>Card could not be opened.</small></h2>");}
}

function doPost(e) {
  try {
    var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)||SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
    ensureCardTokenHeader_(sh);
    var data={}; try{data=JSON.parse(e.postData.contents);}catch(_){data=e.parameter||{};}
    var items=Array.isArray(data.items)&&data.items.length?data.items:[{name:data.product||"",qty:data.quantity||1,price:data.price||0}];
    var orderId=data.orderId||("HFB-"+Date.now());
    var total=items.reduce(function(sum,it){return sum+Number(it.price||it.unitPrice||0)*Math.max(1,Number(it.qty||it.quantity||1));},0);
    var email=String(data.email||data.customerEmail||"").trim(), token=email?Utilities.getUuid().replace(/-/g,""):"", m=getHeaderMap_(sh);
    var rows=items.map(function(it){var row=new Array(sh.getLastColumn()).fill(""),q=Math.max(1,Number(it.qty||it.quantity||1)),p=Number(it.price||it.unitPrice||0);setCell_(row,m,"Timestamp",new Date());setCell_(row,m,"Order ID",orderId);setCell_(row,m,"Product",it.name||it.product||"");setCell_(row,m,"Unit Price",p);setCell_(row,m,"Line Total",p*q);setCell_(row,m,"Name",data.name||"");setCell_(row,m,"Mobile",data.mobile||data.phone||"");setCell_(row,m,"Email",email);setCell_(row,m,"Address",data.address||"");setCell_(row,m,"District",data.district||"");setCell_(row,m,"Upazila",data.upazila||"");setCell_(row,m,"Quantity",q);setCell_(row,m,"Notes",data.notes||"");setCell_(row,m,"Order Total",total);setCell_(row,m,"Thank You Email Status",email?"Pending":"No email provided");setCell_(row,m,"Card Token",token);return row;});
    var start=sh.getLastRow()+1; sh.getRange(start,1,rows.length,sh.getLastColumn()).setValues(rows);
    var status=email?"Pending":"No email provided", cardUrl="";
    if(email){try{
      cardUrl=CARD_WEB_APP_URL+"?card="+encodeURIComponent(token);
      var blob=Utilities.newBlob(buildCardSvg_(data,items,orderId,total),"image/svg+xml","Halal-Food-Thank-You-"+orderId+".svg");
      var recipient=TEST_MODE?TEST_RECIPIENT_EMAIL:email, list=""; items.forEach(function(it){list+="<li>"+escapeHtml_(it.name||it.product||"Product")+" × "+Math.max(1,Number(it.qty||it.quantity||1))+"</li>";});
      var html="<div style='font-family:Arial,sans-serif;max-width:680px;margin:20px auto;background:#fff;border:1px solid #e5ded0;border-radius:18px;overflow:hidden;color:#17233c'><div style='padding:28px;text-align:center;background:#17233c;color:#fff'><h1 style='margin:0'>Halal Food</h1><p style='color:#e8d9b4'>Premium Products</p></div><div style='padding:28px'>"+(TEST_MODE?"<div style='padding:12px;background:#fff4d6;border:1px solid #e5c66b;border-radius:8px;margin-bottom:18px'><b>TEST MODE</b><br>এটি testing-এর জন্য পাঠানো হয়েছে।</div>":"")+"<h2>আসসালামু আলাইকুম "+escapeHtml_(data.name||"Friend")+" 👋</h2><p style='line-height:1.8;color:#444'>আপনার ভালোবাসা, আস্থা এবং Halal Food-এর সঙ্গে যুক্ত হওয়ার জন্য আন্তরিক ধন্যবাদ। আপনার order আমাদের জন্য অত্যন্ত মূল্যবান।</p><div style='background:#f7f2e8;padding:18px;border-radius:12px'><b>Order ID:</b> "+escapeHtml_(orderId)+"<h3>আপনার Order</h3><ul>"+list+"</ul><p style='text-align:right'><b>মোট: ৳ "+Math.round(total).toLocaleString("en-BD")+"</b></p></div><div style='text-align:center;margin:28px 0'><a href='"+cardUrl+"' style='display:inline-block;background:#17233c;color:#fff;padding:15px 24px;border-radius:999px;text-decoration:none;font-weight:700'>🎁 Download &amp; Share Your Thank-You Card</a><p style='font-size:13px;color:#777'>Link খুলে PNG download করে Facebook, Instagram বা WhatsApp-এ share করতে পারবেন।</p></div><p style='line-height:1.8;color:#555'>Halal Food একটি বাস্তব learning project—আমরা digital marketing ও customer experience নিয়ে বাস্তব পরীক্ষা করছি। আপনার participation আমাদের শেখার একটি মূল্যবান অংশ।</p><div style='text-align:center;border-top:1px solid #e5ded0;padding-top:18px;color:#666;font-size:13px;line-height:1.8'><b>Team Halal Food</b><br>"+COMPANY_EMAIL+"<br>"+CARD_PHONE+"<br><a href='"+SITE_URL+"'>"+SITE_URL.replace(/^https?:\/\//,"")+"</a></div></div></div>";
      MailApp.sendEmail({to:recipient,subject:(TEST_MODE?"[TEST] ":"")+"Thank You, "+(data.name||"Friend")+" — Halal Food | "+orderId,htmlBody:html,body:"Thank you from Halal Food. Your Thank-You Card: "+cardUrl,attachments:[blob],name:"Halal Food",replyTo:COMPANY_EMAIL});
      status=TEST_MODE?"TEST sent to "+TEST_RECIPIENT_EMAIL:"Sent to customer";
    }catch(err){status="Failed: "+String(err&&err.message?err.message:err);}}
    var lm=getHeaderMap_(sh), sc=lm["Thank You Email Status"]; if(sc!==undefined)sh.getRange(start,sc+1,rows.length,1).setValues(rows.map(function(){return[status];}));
    try{var addr=[data.address||"",data.upazila||"",data.district||""].filter(Boolean).join(", ");sendAdminNotification_(data.name||"",data.mobile||data.phone||"",email,addr,orderId,items,total,data.notes||"");}catch(_){}
    return ContentService.createTextOutput(JSON.stringify({success:true,orderId:orderId,orderTotal:total,thankYouEmail:status,cardUrl:cardUrl||null})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){return ContentService.createTextOutput(JSON.stringify({success:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);}
}

function ensureCardTokenHeader_(sh){var last=sh.getLastColumn(),h=last?sh.getRange(1,1,1,last).getValues()[0].map(String):[];if(!h.length){sh.getRange(1,1,1,16).setValues([["Timestamp","Order ID","Product","Unit Price","Line Total","Name","Mobile","Email","Address","District","Upazila","Quantity","Notes","Order Total","Thank You Email Status","Card Token"]]);}else{if(h.indexOf("Thank You Email Status")===-1)sh.getRange(1,sh.getLastColumn()+1).setValue("Thank You Email Status");if(h.indexOf("Card Token")===-1)sh.getRange(1,sh.getLastColumn()+1).setValue("Card Token");}}

function buildCardSvg_(data,items,orderId,total){
  var logo="";try{var r=UrlFetchApp.fetch(LOGO_URL,{muteHttpExceptions:true});if(r.getResponseCode()>=200&&r.getResponseCode()<300){var b=r.getBlob();logo='<image href="data:'+(b.getContentType()||"image/jpeg")+';base64,'+Utilities.base64Encode(b.getBytes())+'" x="520" y="55" width="560" height="300" preserveAspectRatio="xMidYMid meet"/>';}}catch(_){}
  if(!logo)logo='<text x="800" y="220" text-anchor="middle" class="brand">Halal Food</text>';
  var products="";items.slice(0,5).forEach(function(it,i){products+='<text x="800" y="'+(790+i*55)+'" text-anchor="middle" class="item">'+escapeXml_(it.name||it.product||"Product")+" × "+Math.max(1,Number(it.qty||it.quantity||1))+"</text>";});
  return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600"><rect width="1600" height="1600" fill="#F7F2E8"/><rect x="45" y="45" width="1510" height="1510" rx="42" fill="#fff" stroke="#17233C" stroke-width="5"/><rect x="80" y="80" width="1440" height="1440" rx="30" fill="none" stroke="#D9C79B" stroke-width="2"/>'+logo+'<text x="800" y="430" text-anchor="middle" class="eyebrow">A PERSONAL THANK-YOU FROM</text><text x="800" y="515" text-anchor="middle" class="title">Halal Food</text><text x="800" y="595" text-anchor="middle" class="name">Thank You, '+escapeXml_(data.name||"Friend")+' ❤️</text><line x1="300" y1="640" x2="1300" y2="640" stroke="#D9D2C4" stroke-width="2"/><text x="800" y="700" text-anchor="middle" class="section">YOUR ORDER</text>'+products+'<text x="800" y="1080" text-anchor="middle" class="order">Order ID: '+escapeXml_(orderId)+'</text><text x="800" y="1140" text-anchor="middle" class="total">৳ '+Math.round(total).toLocaleString("en-BD")+'</text><text x="800" y="1210" text-anchor="middle" class="message">আপনার ভালোবাসা, আস্থা ও মূল্যবান সময়ের জন্য</text><text x="800" y="1255" text-anchor="middle" class="message">Halal Food আপনাকে আন্তরিকভাবে ধন্যবাদ জানায়।</text><text x="800" y="1310" text-anchor="middle" class="small">আপনার প্রতিটি order আমাদের আরও ভালো customer experience</text><text x="800" y="1345" text-anchor="middle" class="small">এবং একটি বিশ্বাসযোগ্য food brand তৈরি করতে অনুপ্রাণিত করে।</text><text x="800" y="1410" text-anchor="middle" class="contact">'+escapeXml_(SITE_URL.replace(/^https?:\/\//,""))+'</text><text x="800" y="1445" text-anchor="middle" class="contact">'+escapeXml_(COMPANY_EMAIL)+' • '+CARD_PHONE+'</text><text x="800" y="1490" text-anchor="middle" class="signature">— Team Halal Food</text><style>.brand{font-family:Arial;font-size:70px;font-weight:700;fill:#17233C}.eyebrow{font-family:Arial;font-size:24px;letter-spacing:5px;fill:#6D6875}.title{font-family:Arial;font-size:56px;font-weight:700;fill:#17233C}.name{font-family:Arial,"Noto Sans Bengali",sans-serif;font-size:48px;font-weight:700;fill:#17233C}.section{font-family:Arial;font-size:25px;font-weight:700;letter-spacing:4px;fill:#6D6875}.item{font-family:Arial,"Noto Sans Bengali",sans-serif;font-size:30px;font-weight:600;fill:#17233C}.order{font-family:Arial;font-size:25px;font-weight:700;fill:#6D6875}.total{font-family:Arial;font-size:34px;font-weight:700;fill:#17233C}.message{font-family:Arial,"Noto Sans Bengali",sans-serif;font-size:27px;fill:#17233C}.small{font-family:Arial,"Noto Sans Bengali",sans-serif;font-size:21px;fill:#6D6875}.contact{font-family:Arial;font-size:20px;fill:#6D6875}.signature{font-family:Arial;font-size:23px;font-weight:700;fill:#17233C}</style></svg>';
}

function buildCardPage_(svg,name,orderId){
  var b64=Utilities.base64Encode(Utilities.newBlob(svg,"image/svg+xml").getBytes()),n=escapeHtml_(name||"Friend"),id=escapeHtml_(orderId||"");
  return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#F7F2E8;color:#17233C;font-family:Arial}.wrap{max-width:760px;margin:auto;padding:18px 14px 40px}.head{text-align:center}.card{background:#fff;padding:12px;border-radius:18px;box-shadow:0 8px 30px rgba(23,35,60,.1)}.card img{width:100%;display:block;border-radius:10px}.actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:18px}button{border:0;border-radius:999px;padding:13px 20px;font-weight:700;font-size:15px}.p{background:#17233C;color:#fff}.s{background:#fff;color:#17233C;border:1px solid #D9D2C4}.note{text-align:center;color:#6D6875;font-size:13px;line-height:1.6;margin-top:16px}</style></head><body><div class="wrap"><div class="head"><h1>Halal Food</h1><p>একটি বিশেষ Thank-You Card — '+n+'</p></div><div class="card"><img src="data:image/svg+xml;base64,'+b64+'" alt="Halal Food Thank You Card"><div class="actions"><button class="p" onclick="png()">⬇ Download PNG</button><button class="s" onclick="svg()">⬇ Download SVG</button><button class="s" onclick="share()">↗ Share</button></div><div class="note">Order '+id+'<br>PNG download করে Facebook, Instagram বা WhatsApp-এ share করতে পারবেন।</div></div></div><script>var B="'+b64+'";function T(){var s=atob(B),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return new TextDecoder("utf-8").decode(a)}function save(n,t){var u=URL.createObjectURL(new Blob([T()],{type:t})),a=document.createElement("a");a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000)}function svg(){save("Halal-Food-Thank-You-'+id+'.svg","image/svg+xml")}function png(){var u=URL.createObjectURL(new Blob([T()],{type:"image/svg+xml"})),im=new Image();im.onload=function(){var c=document.createElement("canvas");c.width=1600;c.height=1600;c.getContext("2d").drawImage(im,0,0,1600,1600);URL.revokeObjectURL(u);c.toBlob(function(p){var x=URL.createObjectURL(p),a=document.createElement("a");a.href=x;a.download="Halal-Food-Thank-You-'+id+'.png";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(x)},1000)},"image/png")};im.src=u}function share(){if(navigator.share)navigator.share({title:"Halal Food Thank-You Card",text:"Thank you, Halal Food ❤️",url:location.href});else navigator.clipboard.writeText(location.href).then(function(){alert("Card link copied.")})}</script></body></html>';
}

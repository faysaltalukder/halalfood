/*
 * HALAL FOOD — Google Apps Script
 * Thank-You Card System v3
 *
 * One doPost + one doGet only.
 * Email card uses HTML tables + CID PNG/JPG images (no SVG attachment).
 * Customer card page uses HTML/CSS and creates PNG in the browser.
 */

const SHEET_NAME = "Orders";
const TEST_MODE = false;
const TEST_RECIPIENT_EMAIL = "halalfoodbd.official@gmail.com";

const SITE_URL = "https://faysaltalukder.github.io/halalfood/";
const RAW_GITHUB_BASE = "https://raw.githubusercontent.com/faysaltalukder/halalfood/main/";
const COMPANY_EMAIL = "halalfoodbd.official@gmail.com";
const CARD_PHONE = "01842031164";
const CARD_SYSTEM_VERSION = "v7";
const CARD_WEB_APP_URL_FALLBACK = "https://script.google.com/macros/s/AKfycbzShx69e71dZWyF8MN3ZWJSN5rTdeizgsFoN-ElkZzs2_j_gncTeGfpZiDm3YiZskGQ/exec";

const LOGO_SVG_URL = "https://raw.githubusercontent.com/faysaltalukder/halalfood/main/images/logo-favicon/halal-food-official-logo.svg";
const LOGO_PNG_URL = "https://raw.githubusercontent.com/faysaltalukder/halalfood/main/images/logo-favicon/logo.png";

const HEADERS = [
  "Timestamp","Order ID","Product","Unit Price","Line Total",
  "Name","Mobile","Email","Address","District","Upazila",
  "Quantity","Notes","Order Total","Thank You Email Status",
  "Card Token","Product Image"
];

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sh);

  let d = {};
  try {
    d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (_) {
    d = (e && e.parameter) || {};
  }

  const orderId = createShortOrderId_(sh);
  const items = normalizeItems_(d);
  const total = items.reduce((sum, x) => sum + x.lineTotal, 0);
  const email = String(d.email || d.customerEmail || "").trim();

  const m = getHeaderMap_(sh);
  const rows = items.map(function(item) {
    const row = new Array(sh.getLastColumn()).fill("");
    setCell_(row,m,"Timestamp",new Date());
    setCell_(row,m,"Order ID",orderId);
    // Write to the exact existing Orders-sheet columns, including the legacy
    // duplicate fields at the right side. Blank spacer columns are untouched.
    setCellsByHeaders_(row,m,["Product Name","Product"],item.product);
    setCell_(row,m,"Unit Price",item.price);
    setCell_(row,m,"Line Total",item.lineTotal);
    setCellsByHeaders_(row,m,["Full Name","Name"],d.name || "");
    setCellsByHeaders_(row,m,["Mobile Number","Mobile"],d.mobile || d.phone || "");
    setCellsByHeaders_(row,m,["Email"],email);
    setCellsByHeaders_(row,m,["Full Address","Address"],d.address || "");
    setCell_(row,m,"District",d.district || "");
    setCell_(row,m,"Upazila",d.upazila || "");
    setCell_(row,m,"Quantity",item.quantity);
    setCell_(row,m,"Notes",d.notes || "");
    setCell_(row,m,"Order Total",total);
    setCell_(row,m,"Thank You Email Status",email ? "Pending" : "No email provided");
    setCell_(row,m,"Product Image",item.image);
    return row;
  });

  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow,1,rows.length,sh.getLastColumn()).setValues(rows);

  let emailStatus = email ? "Pending" : "No email provided";
  let cardUrl = "";

  if (email) {
    const token = Utilities.getUuid().replace(/-/g,"");
    const cardBaseUrl = getCardWebAppUrl_();
    cardUrl = cardBaseUrl + "?card=" + encodeURIComponent(token) + "&v=" + encodeURIComponent(CARD_SYSTEM_VERSION);

    const tokenCol = getHeaderMap_(sh)["Card Token"];
    if (tokenCol !== undefined) {
      sh.getRange(startRow,tokenCol + 1,rows.length,1)
        .setValues(rows.map(function(){ return [token]; }));
    }

    try {
      const assets = fetchAssets_(items);
      const recipient = TEST_MODE ? TEST_RECIPIENT_EMAIL : email;
      const html = buildEmailCard_(d,items,orderId,total,cardUrl,TEST_MODE,assets);

      const inlineImages = {};
      if (assets.logoBlob) inlineImages.brandLogo = assets.logoBlob;
      if (assets.productBlob) inlineImages.productImage = assets.productBlob;

      MailApp.sendEmail({
        to: recipient,
        subject: (TEST_MODE ? "[TEST] " : "") + "[" + CARD_SYSTEM_VERSION + "] " +
          "Thank You, " + (d.name || "Customer") +
          " — Halal Food | " + orderId,
        htmlBody: html,
        body: buildPlainEmail_(d,items,orderId,total,cardUrl,TEST_MODE),
        inlineImages: inlineImages,
        name: "Halal Food",
        replyTo: COMPANY_EMAIL
      });

      emailStatus = TEST_MODE
        ? "TEST sent to " + TEST_RECIPIENT_EMAIL
        : "Sent to customer";
    } catch (err) {
      emailStatus = "Failed: " + String(err && err.message || err);
    }

    const statusCol = getHeaderMap_(sh)["Thank You Email Status"];
    if (statusCol !== undefined) {
      sh.getRange(startRow,statusCol + 1,rows.length,1)
        .setValues(rows.map(function(){ return [emailStatus]; }));
    }
  }

  try {
    sendAdminNotification_(d,items,orderId,total,emailStatus);
  } catch (_) {}

  return ContentService
    .createTextOutput(JSON.stringify({
      success:true,
      orderId:orderId,
      orderTotal:total,
      thankYouEmail:emailStatus,
      cardUrl:cardUrl || null
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createShortOrderId_(sh) {
  const map = getHeaderMap_(sh);
  const orderCol = map["Order ID"];
  const used = {};

  if (orderCol !== undefined && sh.getLastRow() >= 2) {
    const values = sh.getRange(2, orderCol + 1, sh.getLastRow() - 1, 1).getDisplayValues();
    values.forEach(function(row) {
      const id = String(row[0] || "").trim();
      if (/^HF-\d{4}$/.test(id)) used[id] = true;
    });
  }

  for (let i = 0; i < 200; i++) {
    const n = Math.floor(Math.random() * 9000) + 1000;
    const id = "HF-" + n;
    if (!used[id]) return id;
  }

  return "HF-" + String(Date.now()).slice(-4);
}

function getCardWebAppUrl_() {
  try {
    const url = String(ScriptApp.getService().getUrl() || "").trim();
    if (/^https:\/\/script\.google\.com\/macros\/s\//i.test(url)) return url;
  } catch (_) {}
  return CARD_WEB_APP_URL_FALLBACK;
}

function doGet(e) {
  try {
    const token = String(e && e.parameter && e.parameter.card || "");
    if (!token) return simplePage_("Halal Food","Thank-You Card link is missing.");

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh) return simplePage_("Halal Food","Order sheet not found.");

    ensureHeaders_(sh);
    const m = getHeaderMap_(sh);
    const tokenCol = m["Card Token"];

    if (tokenCol === undefined) {
      return simplePage_("Halal Food","Card Token column is missing.");
    }

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return simplePage_("Halal Food","No order found.");

    const values = sh.getRange(2,1,lastRow - 1,sh.getLastColumn()).getValues();
    const matched = values.filter(function(row) {
      return String(row[tokenCol] || "") === token;
    });

    if (!matched.length) {
      return simplePage_("Halal Food","This Thank-You Card link is invalid or expired.");
    }

    const first = matched[0];
    const customer = {
      name:String(first[m["Name"]] || "Friend")
    };

    const orderId = String(first[m["Order ID"]] || "");
    const total = Number(first[m["Order Total"]] || 0);

    const items = matched.map(function(row) {
      return {
        product:String(row[m["Product"]] || "Product"),
        quantity:Math.max(1,Number(row[m["Quantity"]] || 1)),
        price:Number(row[m["Unit Price"]] || 0),
        image:String(row[m["Product Image"]] || "")
      };
    });

    const assets = fetchAssets_(items);
    return buildCardPage_(customer,items,orderId,total,assets);

  } catch (err) {
    return simplePage_("Halal Food","Card could not be opened.");
  }
}

function normalizeItems_(d) {
  const source = Array.isArray(d.items) && d.items.length
    ? d.items
    : [{
        product:d.product || "",
        quantity:d.quantity || 1,
        price:d.price || 0,
        image:d.image || ""
      }];

  return source.map(function(x) {
    const quantity = Math.max(1,Number(x.quantity || x.qty || 1));
    const priceRaw = Number(x.price || x.unitPrice || 0);
    const price = isFinite(priceRaw) ? priceRaw : 0;

    return {
      product:String(x.product || x.name || "Product"),
      quantity:quantity,
      price:price,
      lineTotal:price * quantity,
      image:String(x.image || "")
    };
  });
}

function fetchAssets_(items) {
  const result = {
    logoBlob:null,
    logoDataUri:"",
    logoUrl:LOGO_SVG_URL,
    productBlob:null,
    productDataUri:"",
    productUrl:""
  };

  // Keep the complete official logo as SVG data for the customer card.
  // This avoids losing the emblem when Apps Script cannot rasterize SVG.
  try {
    const response = UrlFetchApp.fetch(LOGO_SVG_URL,{
      muteHttpExceptions:true,
      followRedirects:true
    });

    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      const svgBlob = response.getBlob().setName("halal-food-logo.svg");
      try {
        result.logoBlob = svgBlob.getAs(MimeType.PNG).setName("halal-food-logo.png");
      } catch (_) {
        try {
          const png = UrlFetchApp.fetch(LOGO_PNG_URL,{
            muteHttpExceptions:true,
            followRedirects:true
          });
          if (png.getResponseCode() >= 200 && png.getResponseCode() < 300) {
            result.logoBlob = png.getBlob().setName("halal-food-emblem.png");
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.log("Logo fetch failed: " + String(err && err.message || err));
  }

  const raw = String(items[0] && items[0].image || "").trim();
  if (raw) {
    const candidates = [];

    if (/^https?:\/\//i.test(raw)) {
      candidates.push(raw);
    } else {
      const path = raw.replace(/^\/+/, "");
      if (/^halalfood\//i.test(path)) {
        candidates.push("https://faysaltalukder.github.io/" + path);
      } else {
        // Product files in the repo are more reliably fetched by Apps Script
        // from raw.githubusercontent.com than through GitHub Pages.
        candidates.push(RAW_GITHUB_BASE + path);
        candidates.push(SITE_URL.replace(/\/$/,"") + "/" + path);
      }
    }

    for (let i = 0; i < candidates.length && !result.productBlob; i++) {
      try {
        const url = candidates[i];
        const response = UrlFetchApp.fetch(url,{
          muteHttpExceptions:true,
          followRedirects:true
        });

        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          result.productUrl = url;
          let blob = response.getBlob();

          try {
            blob = blob.getAs(MimeType.PNG);
          } catch (_) {}

          result.productBlob = blob.setName("halal-food-product.png");
          result.productDataUri =
            "data:" + (blob.getContentType() || "image/png") +
            ";base64," + Utilities.base64Encode(blob.getBytes());
        } else {
          console.log("Product image fetch failed (" + response.getResponseCode() + "): " + url);
        }
      } catch (err) {
        console.log("Product image fetch error: " + String(err && err.message || err));
      }
    }
  }

  return result;
}

function buildEmailCard_(d,items,orderId,total,cardUrl,isTest,assets) {
  const name = escapeHtml_(d.name || "Customer");
  const first = items[0] || {
    product:"Product",quantity:1,price:0,lineTotal:0
  };

  const logo = assets.logoBlob
    ? "<img src='cid:brandLogo' width='82' alt='Halal Food' style='display:block;width:82px;height:auto;margin:0 auto;border:0'>"
    : "";

  const productImage = assets.productBlob
    ? "<img src='cid:productImage' width='190' height='190' alt='" +
      escapeHtml_(first.product) +
      "' style='display:block;width:190px;height:190px;object-fit:contain;background:#F7F2E8;border-radius:18px;border:0'>"
    : "<div style='width:190px;height:190px;background:#F7F2E8;border-radius:18px;line-height:190px;text-align:center;color:#8A8490'>Product</div>";

  const testNotice = isTest
    ? "<tr><td style='padding:10px 20px 0'><div style='background:#FFF4D6;border:1px solid #E2C56A;border-radius:10px;padding:9px 12px;color:#6A5310;font:13px Arial,sans-serif'><b>TEST MODE • " + CARD_SYSTEM_VERSION + "</b> — এই emailটি পরীক্ষার জন্য পাঠানো হয়েছে।</div></td></tr>"
    : "";

  const productRows = items.map(function(x) {
    return "<tr>" +
      "<td style='padding:8px 0;border-bottom:1px solid #E7DDCA;font:14px Arial,sans-serif;color:#34303A'>" +
      escapeHtml_(x.product) + " × " + x.quantity +
      "</td>" +
      "<td align='right' style='padding:8px 0;border-bottom:1px solid #E7DDCA;font:700 14px Arial,sans-serif;color:#17233C'>" +
      "৳ " + money_(x.lineTotal) +
      "</td></tr>";
  }).join("");

  return "<!doctype html><html><body style='margin:0;padding:0;background:#F4EBD8'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#F4EBD8'>" +
    "<tr><td align='center' style='padding:14px 6px'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:700px;background:#FFFDF7;border:1px solid #E4D8BF;border-radius:20px;overflow:hidden;font-family:Arial,sans-serif;color:#17233C'>" +

    "<tr><td align='center' style='background:#17233C;padding:20px 16px 18px'>" +
    logo +
    "<div style='font-size:28px;line-height:1.2;font-weight:800;color:#FFFFFF;margin-top:8px'>Halal Food</div>" +
    "<div style='font-size:10px;letter-spacing:3px;color:#E8D39A;margin-top:5px'>PREMIUM PRODUCTS</div>" +
    "</td></tr>" +

    testNotice +

    "<tr><td align='center' style='padding:25px 20px 8px'>" +
    "<div style='font:italic 48px Georgia,serif;font-weight:700;color:#17233C'>Thank You</div>" +
    "<div style='font-size:11px;letter-spacing:4px;font-weight:700;color:#756F7B;margin-top:5px'>FOR YOUR ORDER</div>" +
    "<div style='width:70px;height:3px;background:#C99220;margin:16px auto'></div>" +
    "<div style='font-size:21px;font-weight:700'>প্রিয় " + name + "</div>" +
    "<div style='font-size:14px;line-height:1.8;color:#5D5964;max-width:560px;margin:10px auto'>" +
    "আপনার আস্থা ও ভালোবাসার জন্য আন্তরিক ধন্যবাদ। আপনার প্রতিটি অর্ডার আমাদের জন্য অত্যন্ত মূল্যবান।" +
    "</div>" +
    "</td></tr>" +

    "<tr><td style='padding:10px 20px 0'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#F8F1E2;border:1px solid #E4D8BF;border-radius:18px'>" +
    "<tr>" +
    "<td width='45%' align='center' valign='middle' style='padding:15px'>" + productImage + "</td>" +
    "<td width='55%' valign='middle' style='padding:15px 15px 15px 0'>" +
    "<div style='font-size:10px;letter-spacing:2px;color:#7B7480;font-weight:700'>ORDER ID</div>" +
    "<div style='font-size:22px;font-weight:800;margin:4px 0 14px'>" + escapeHtml_(orderId) + "</div>" +
    "<div style='font-size:10px;letter-spacing:2px;color:#7B7480;font-weight:700'>PRODUCT</div>" +
    "<div style='font-size:17px;font-weight:700;margin-top:4px'>" + escapeHtml_(first.product) + "</div>" +
    "<div style='font-size:13px;color:#6D6875;margin-top:4px'>Quantity: " + first.quantity + "</div>" +
    "<div style='font-size:25px;color:#C99220;font-weight:800;margin-top:10px'>৳ " + money_(first.price) + "</div>" +
    "</td></tr></table>" +
    "</td></tr>" +

    "<tr><td style='padding:18px 25px 0'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>" +
    productRows +
    "<tr><td style='padding:14px 0 4px;font:700 16px Arial,sans-serif'>Order Total</td>" +
    "<td align='right' style='padding:14px 0 4px;font:800 20px Arial,sans-serif;color:#C99220'>৳ " + money_(total) + "</td></tr>" +
    "</table></td></tr>" +

    "<tr><td align='center' style='padding:20px'>" +
    "<a href='" + escapeHtml_(cardUrl) + "' style='display:inline-block;background:#17233C;color:#FFFFFF;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:14px'>Open &amp; Download Your Card</a>" +
    "<div style='font-size:12px;color:#7B7480;line-height:1.6;margin-top:10px'>Cardটি খুলে PNG হিসেবে download বা social media-তে share করতে পারবেন।</div>" +
    "<div style='font-size:12px;color:#7B7480;margin-top:10px'>Halal Food • " + CARD_PHONE + " • faysaltalukder.github.io/halalfood/</div>" +
    "</td></tr>" +

    "</table></td></tr></table></body></html>";
}

function buildCardPage_(customer,items,orderId,total,assets) {
  const first = items[0] || {
    product:"Product",quantity:1,price:0
  };

  const payload = {
    name:customer.name || "Customer",
    orderId:orderId,
    total:Math.round(total || 0),
    product:first.product || "Product",
    quantity:first.quantity || 1,
    price:Math.round(first.price || 0),
    logo:assets.logoUrl || LOGO_SVG_URL,
    image:assets.productUrl || "",
    site:"faysaltalukder.github.io/halalfood/",
    email:COMPANY_EMAIL,
    phone:CARD_PHONE
  };

  const json = JSON.stringify(payload)
    .replace(/</g,"\\u003c")
    .replace(/>/g,"\\u003e")
    .replace(/&/g,"\\u0026");

  const html = "<!doctype html><html><head>" +
    "<meta charset='UTF-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1'>" +
    "<title>Thank You — Halal Food</title>" +
    "<style>" +
    "body{margin:0;background:#F4EBD8;color:#17233C;font-family:Arial,'Noto Sans Bengali',sans-serif}" +
    ".wrap{max-width:780px;margin:auto;padding:14px}" +
    ".card{background:#FFFDF7;border:1px solid #E4D8BF;border-radius:26px;overflow:hidden;box-shadow:0 15px 45px rgba(23,35,60,.12)}" +
    ".hero{background:#17233C;text-align:center;padding:22px 16px}" +
    ".logo{display:block;width:180px;height:145px;object-fit:contain;background:#FFFDF7;border-radius:14px;margin:auto}" +
    ".brand{font-size:29px;font-weight:800;color:#fff;margin-top:9px}.sub{font-size:10px;letter-spacing:3px;color:#E8D39A;margin-top:5px}" +
    ".body{text-align:center;padding:28px 18px}.thank{font:italic 55px Georgia,serif;font-weight:700}.for{font-size:12px;letter-spacing:4px;font-weight:700;color:#6D6875;margin-top:5px}.gold{width:75px;height:3px;background:#C99220;margin:17px auto}.dear{font-size:22px;font-weight:700}.intro{max-width:590px;margin:10px auto 22px;color:#5D5964;line-height:1.8;font-size:15px}" +
    ".details{max-width:610px;margin:auto;background:#F8F1E2;border:1px solid #E4D8BF;border-radius:19px;padding:18px;display:grid;grid-template-columns:200px 1fr;gap:22px;text-align:left;box-sizing:border-box}.photo{width:200px;height:200px;object-fit:contain;background:#F7F2E8;border-radius:17px}.lab{font-size:10px;letter-spacing:2px;color:#7B7480;font-weight:700}.oid{font-size:22px;font-weight:800;margin:5px 0 17px;word-break:break-word}.prod{font-size:19px;font-weight:700;line-height:1.35}.qty{font-size:14px;color:#6D6875;margin-top:5px}.price{font-size:29px;color:#C99220;font-weight:800;margin-top:13px}.total{max-width:610px;margin:16px auto;font-size:20px;font-weight:800;text-align:right}.message{max-width:610px;margin:20px auto;color:#6D6875;line-height:1.8;font-size:14px}.footer{color:#7B7480;font-size:12px;line-height:1.7}.actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:18px}.actions button{border:0;border-radius:999px;padding:13px 19px;font-size:15px;font-weight:700;cursor:pointer}.primary{background:#17233C;color:#fff}.secondary{background:#fff;color:#17233C;border:1px solid #D8D0C1!important}@media(max-width:600px){.wrap{padding:7px}.hero{padding:16px 10px}.logo{width:155px;height:125px}.body{padding:24px 12px}.thank{font-size:45px}.details{grid-template-columns:1fr;text-align:center;padding:15px}.photo{width:180px;height:180px;margin:auto}.total{text-align:center;font-size:18px}.prod{font-size:17px}.actions{padding:15px 5px}}" +
    "</style></head><body>" +
    "<div class='wrap'><div class='card'>" +
    "<div class='hero'><img id='logo' class='logo' alt='Halal Food'><div class='brand'>Halal Food</div><div class='sub'>PREMIUM PRODUCTS</div></div>" +
    "<div class='body'>" +
    "<div class='thank'>Thank You</div><div class='for'>FOR YOUR ORDER</div><div class='gold'></div>" +
    "<div class='dear'>প্রিয় <span id='name'></span></div>" +
    "<div class='intro'>আপনার আস্থা ও ভালোবাসার জন্য আন্তরিক ধন্যবাদ। আপনার প্রতিটি অর্ডার আমাদের জন্য অত্যন্ত মূল্যবান।</div>" +
    "<div class='details'><img id='img' class='photo' alt='Product image'><div>" +
    "<div class='lab'>ORDER ID</div><div class='oid' id='id'></div>" +
    "<div class='lab'>PRODUCT</div><div class='prod' id='product'></div>" +
    "<div class='qty'>Quantity: <span id='q'></span></div>" +
    "<div class='price'>৳ <span id='price'></span></div></div></div>" +
    "<div class='total'>Order Total: ৳ <span id='total'></span></div>" +
    "<div class='message'>এই কার্ডটি আপনার জন্য আমাদের কৃতজ্ঞতার একটি ছোট্ট স্মারক।<br>আপনার ভালোবাসাই আমাদের এগিয়ে যাওয়ার অনুপ্রেরণা।</div>" +
    "<div class='footer'>Halal Food • <span id='phone'></span><br><span id='site'></span> • <span id='email'></span></div>" +
    "</div>" +
    "<div class='actions'><button class='primary' onclick='downloadPNG()'>⬇ Download PNG</button><button class='secondary' onclick='shareCard()'>↗ Share</button></div>" +
    "</div></div>" +
    "<script>" +
    "const D=" + json + ";" +
    "document.getElementById('name').textContent=D.name;" +
    "document.getElementById('id').textContent=D.orderId;" +
    "document.getElementById('product').textContent=D.product;" +
    "document.getElementById('q').textContent=D.quantity;" +
    "document.getElementById('price').textContent=Number(D.price).toLocaleString('en-BD');" +
    "document.getElementById('total').textContent=Number(D.total).toLocaleString('en-BD');" +
    "document.getElementById('phone').textContent=D.phone;" +
    "document.getElementById('site').textContent=D.site;" +
    "document.getElementById('email').textContent=D.email;" +
    "if(D.logo)document.getElementById('logo').src=D.logo;else document.getElementById('logo').style.display='none';" +
    "if(D.image)document.getElementById('img').src=D.image;else document.getElementById('img').style.display='none';" +

    "function loadImage(src){return new Promise(function(resolve){if(!src){resolve(null);return}var im=new Image();im.crossOrigin='anonymous';im.onload=function(){resolve(im)};im.onerror=function(){resolve(null)};im.src=src})}" +
    "function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}" +

    "async function renderPNG(){"+
      "var c=document.createElement('canvas');c.width=1600;c.height=1600;var x=c.getContext('2d');"+
      "x.fillStyle='#F4EBD8';x.fillRect(0,0,1600,1600);"+
      "x.fillStyle='#FFFDF7';roundRect(x,45,45,1510,1510,46);x.fill();"+
      "x.save();roundRect(x,45,45,1510,315,46);x.clip();x.fillStyle='#17233C';x.fillRect(45,45,1510,315);x.restore();"+
      "var logo=await loadImage(D.logo);if(logo){x.drawImage(logo,560,70,480,220);}else{x.fillStyle='#FFFFFF';x.font='800 54px Arial';x.fillText('Halal Food',800,175);x.fillStyle='#E8D39A';x.font='700 18px Arial';x.fillText('PREMIUM PRODUCTS',800,215);}"+
      "x.textAlign='center';x.fillStyle='#17233C';x.font='italic 104px Georgia,serif';x.fillText('Thank You',800,505);"+
      "x.font='700 30px Arial';x.fillStyle='#6D6875';x.fillText('FOR YOUR ORDER',800,558);"+
      "x.fillStyle='#C99220';x.fillRect(750,588,100,4);"+
      "x.fillStyle='#17233C';x.font='700 42px Arial';x.fillText('প্রিয় '+D.name,800,665);"+
      "x.fillStyle='#5D5964';x.font='25px Arial';x.fillText('আপনার আস্থা ও ভালোবাসার জন্য আন্তরিক ধন্যবাদ।',800,715);"+
      "x.fillStyle='#F8F1E2';roundRect(x,135,785,1330,370,32);x.fill();"+
      "var img=await loadImage(D.image);if(img){x.drawImage(img,185,835,270,270);}else{x.fillStyle='#EEE5D4';roundRect(x,185,835,270,270,24);x.fill();x.fillStyle='#7B7480';x.font='700 20px Arial';x.textAlign='center';x.fillText('Product Image',320,975);}"+
      "x.textAlign='left';x.fillStyle='#7B7480';x.font='700 20px Arial';x.fillText('ORDER ID',540,845);"+
      "x.fillStyle='#17233C';x.font='800 34px Arial';x.fillText(D.orderId,540,895);"+
      "x.fillStyle='#7B7480';x.font='700 20px Arial';x.fillText('PRODUCT',540,955);"+
      "x.fillStyle='#17233C';x.font='700 29px Arial';x.fillText(D.product,540,995);"+
      "x.fillStyle='#6D6875';x.font='22px Arial';x.fillText('Quantity: '+D.quantity,540,1035);"+
      "x.fillStyle='#C99220';x.font='800 40px Arial';x.fillText('৳ '+Number(D.price).toLocaleString('en-BD'),540,1090);"+
      "x.textAlign='center';x.fillStyle='#17233C';x.font='800 27px Arial';x.fillText('ORDER TOTAL  ৳ '+Number(D.total).toLocaleString('en-BD'),800,1220);"+
      "x.fillStyle='#6D6875';x.font='22px Arial';x.fillText('এই কার্ডটি আপনার জন্য আমাদের কৃতজ্ঞতার একটি ছোট্ট স্মারক।',800,1300);"+
      "x.font='19px Arial';x.fillText(D.site+' • '+D.email+' • '+D.phone,800,1435);"+
      "return c"+
    "}" +

    "async function downloadPNG(){try{var c=await renderPNG();c.toBlob(function(blob){if(!blob){alert('PNG তৈরি করা যায়নি।');return}var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='Halal-Food-Thank-You-'+D.orderId+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500)},'image/png')}catch(e){alert('PNG তৈরি করা যায়নি। আবার চেষ্টা করুন।')}}" +

    "async function shareCard(){try{var c=await renderPNG();c.toBlob(async function(blob){if(!blob)return;var file=new File([blob],'Halal-Food-Thank-You-'+D.orderId+'.png',{type:'image/png'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Halal Food Thank-You Card',files:[file]});}else if(navigator.share){await navigator.share({title:'Halal Food Thank-You Card',url:location.href});}else{await navigator.clipboard.writeText(location.href);alert('Card link copied.');}},'image/png')}catch(e){if(e.name!=='AbortError')alert('Share করা যায়নি।')}}" +
    "</script></body></html>";

  return HtmlService.createHtmlOutput(html)
    .setTitle("Thank You — Halal Food")
    .addMetaTag("viewport","width=device-width,initial-scale=1");
}

function sendAdminNotification_(d,items,orderId,total,status) {
  const body =
    "New Halal Food Order\n\n" +
    "Order ID: " + orderId + "\n" +
    "Name: " + (d.name || "") + "\n" +
    "Mobile: " + (d.mobile || d.phone || "") + "\n" +
    "Email: " + (d.email || "") + "\n" +
    "Address: " + (d.address || "") + "\n\n" +
    items.map(function(x){
      return x.product + " × " + x.quantity + " — ৳ " + money_(x.lineTotal);
    }).join("\n") +
    "\n\nOrder Total: ৳ " + money_(total) +
    "\nThank-You Email: " + status;

  MailApp.sendEmail({
    to:COMPANY_EMAIL,
    subject:"New Halal Food Order — " + orderId,
    body:body
  });
}

function ensureHeaders_(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return;
  }

  const lastCol = sh.getLastColumn();
  const existing = sh.getRange(1,1,1,lastCol).getValues()[0].map(String);
  const missing = HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });

  if (missing.length) {
    sh.getRange(1,lastCol + 1,1,missing.length).setValues([missing]);
  }
}

function getHeaderMap_(sh) {
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const map = {};
  headers.forEach(function(h,i){ if(h) map[h] = i; });
  return map;
}

function setCell_(row,map,header,value) {
  if (map[header] !== undefined) row[map[header]] = value;
}

// Write one incoming value to every matching header. This is intentional:
// the current sheet contains both the original customer columns (B-H) and
// legacy duplicate columns (T-Y), and both sets should remain synchronized.
function setCellsByHeaders_(row,map,headers,value) {
  headers.forEach(function(header){
    if (map[header] !== undefined) row[map[header]] = value;
  });
}

function money_(value) {
  return Math.round(Number(value) || 0).toLocaleString("en-BD");
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g,function(c){
    return {
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c];
  });
}

function buildPlainEmail_(d,items,orderId,total,cardUrl,isTest) {
  return (isTest ? "[TEST MODE]\n\n" : "") +
    "Thank you, " + (d.name || "Customer") + "!\n\n" +
    "Order ID: " + orderId + "\n" +
    items.map(function(x){
      return "- " + x.product + " × " + x.quantity;
    }).join("\n") +
    "\n\nOrder Total: ৳ " + money_(total) +
    "\n\nThank-You Card: " + cardUrl;
}

function simplePage_(title,message) {
  return HtmlService.createHtmlOutput(
    "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>" +
    "<body style='margin:0;background:#F4EBD8;color:#17233C;font-family:Arial,sans-serif;text-align:center;padding:70px 20px'>" +
    "<h2>" + escapeHtml_(title) + "</h2><p>" + escapeHtml_(message) + "</p></body></html>"
  );
}

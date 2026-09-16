# Halal Food — Delivery Notes

## Google Apps Script redeployment required

This repository now supports both the existing single-product order flow and guest shopping-cart orders.

Cart orders send an `orderId` plus an `items` array, so every product line from one cart checkout is stored under the same Order ID. The existing single-product payload remains supported. The updated `google-apps-script.gs` also stores **District** and **Upazila**.

**Important:** changing `google-apps-script.gs` in this GitHub repository does **not** automatically update the live Google Apps Script Web App.

After uploading this site update, manually:

1. Open the Google Apps Script project connected to the `Orders` sheet.
2. Replace the deployed script code with the updated `google-apps-script.gs` code.
3. Choose **Deploy → Manage deployments**.
4. Edit the existing Web App deployment.
5. Create/select a new version and deploy it.
6. Keep the same Web App URL so the existing `GOOGLE_APPS_SCRIPT_URL` in `js/main.js` remains unchanged.

Historical rows already stored in the Google Sheet are not modified by this update.

## Hero images

The redesign introduces these new image paths. They are placeholders and can be replaced later without changing filenames:

- `images/hero/founder-banner.jpg`
- `images/hero/organic-banner.jpg`
- `images/hero/oil-banner.jpg`
- `images/hero/honey-banner-desktop.jpg`

The founder banner currently contains an explicit TODO because the founder's personal website URL was not supplied.

## Existing resources

Existing image filenames and paths were preserved. The existing Google Apps Script URL, WhatsApp number, telephone link, canonical site URL, price-list PDF, robots.txt, and sitemap base URL were not changed except for adding the new category/product URLs required by the specification.

## Shopping cart

- Cart is guest-only and stored in the browser using `localStorage`.
- `cart.html` is the full cart page; product pages also provide a cart drawer and header cart count.
- `order.html?cart=1` is the multi-product checkout path. The existing `order.html?product=...` single-product path remains unchanged.
- No account/login/sign-up system is included.
- After updating the `.gs` file, redeploy the Apps Script Web App while keeping the existing Web App URL.

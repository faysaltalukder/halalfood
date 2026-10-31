import { readFileSync } from "node:fs";

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => {
  try { return readFileSync(path, "utf8"); }
  catch { failures.push("Missing file: " + path); return ""; }
};

const shared = read("admin/shared.js");
const app = read("admin/app.js");
const allProducts = read("admin/products.html");
const addProduct = read("admin/products-add.html");
const barcodePage = read("admin/products-barcode.html");
const barcodeLogic = read("admin/products-barcode.js");
const reviewsPage = read("admin/products-reviews.html");
const reviewsLogic = read("admin/products-reviews.js");
const ordersPage = read("admin/orders.html");
const publicLookup = read("product-lookup.html");
const lookupLogic = read("js/product-lookup.js");
const publicReviews = read("js/product-reviews.js");
const main = read("js/main.js");
const skuMigration = read("supabase/migrations/20261031061456_add_product_catalog_sku_and_reviews.sql");
const reviewModerationMigration = read("supabase/migrations/20261031062432_allow_admin_moderation_of_customer_reviews.sql");
const reviewUnlinkedMigration = read("supabase/migrations/20261031063731_allow_unlinked_customer_review_submissions.sql");

for (const route of ["products-add", "products-barcode", "products-reviews"]) {
  check(shared.includes(route), "Products navigation is missing " + route + ".");
  check(app.includes('"' + route + '"'), "Admin route dispatcher is missing " + route + ".");
}
for (const label of ["Add Product", "All Products", "Barcode Generation", "Product Reviews"]) {
  check(shared.includes(label), "Products submenu is missing " + label + ".");
}
check(shared.includes('sku,category,category_slug'), "Shared product loader must fetch permanent SKU.");
check(!allProducts.includes('id="addProductBtn"'), "All Products must not expose the Add Product form button.");
check(allProducts.includes("SKU / Barcode"), "All Products must display the SKU / Barcode column.");
check(app.includes("data.sku"), "Product create flow must return and show the database-generated SKU.");
check(addProduct.includes('data-save-state="draft"') && addProduct.includes('data-save-state="published"'), "Add Product must offer Save Draft and Save & Publish.");

check(skuMigration.includes("CREATE SEQUENCE IF NOT EXISTS public.product_sku_seq"), "SKU migration must create a database sequence.");
check(skuMigration.includes("CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx"), "SKU migration must enforce a unique SKU.");
check(skuMigration.includes("NEW.sku IS DISTINCT FROM OLD.sku"), "SKU migration must protect existing product codes from being changed.");
check(skuMigration.includes("CREATE TABLE IF NOT EXISTS public.product_reviews"), "SKU migration must create product_reviews.");
check(skuMigration.includes("Customers can submit pending product reviews"), "Review RLS must restrict customer submissions to Pending.");
check(skuMigration.includes("Admin MFA can manage product reviews"), "Review RLS must require the MFA admin for moderation.");
check(reviewModerationMigration.includes("DROP CONSTRAINT IF EXISTS product_reviews_source_customer_guard"), "Review moderation migration must allow admin approval of customer submissions.");
check(reviewUnlinkedMigration.includes("customer_id IS NULL"), "Customer review form must allow public or signed-in users without mandatory account linkage.");
check(reviewUnlinkedMigration.includes("customer_id = (SELECT auth.uid())"), "An authenticated reviewer must not be able to attach another user's Auth ID.");
check(reviewUnlinkedMigration.includes("status = 'pending'"), "Both anonymous and signed-in customer review submissions must remain Pending.");

check(barcodePage.includes("jsbarcode@3.12.3"), "Barcode page must load the pinned Code 128 library.");
check(barcodePage.includes("qrcodejs@1.0.0"), "Barcode page must load the QR generator.");
check(barcodePage.includes("html5-qrcode@2.3.8"), "Barcode page must load camera scanning support.");
check(barcodeLogic.includes('format:"CODE128"'), "Barcode page must render Code 128 product barcodes.");
check(barcodeLogic.includes("product-lookup.html?sku="), "Customer QR must resolve to the public product lookup page.");
check(barcodeLogic.includes("window.Html5Qrcode"), "Barcode page must support camera scanning.");
check(barcodeLogic.includes("barcodeScanInput"), "Barcode page must support scanner/keyboard SKU input.");
check(barcodeLogic.includes("selected.name") && barcodeLogic.includes("selected.price"), "Barcode labels must show product identity and price.");
check(publicLookup.includes('id="productLookup"') && lookupLogic.includes("price,display_price"), "Public QR lookup must show live product price and details.");
check(lookupLogic.includes('is_active:"eq.true"'), "Public QR lookup must hide unpublished products.");
check(!lookupLogic.includes("stock_quantity:product.stock_quantity"), "Public QR page must not expose exact inventory quantity.");

check(ordersPage.includes("jsbarcode@3.12.3") && ordersPage.includes("qrcodejs@1.0.0"), "Order printing page must load barcode and QR libraries.");
check(app.includes("loadOrderProductCodes"), "Order printing must load permanent SKU values for order items.");
check(app.includes("order-product-code-qr"), "Order print output must include customer QR images.");
check(app.includes("order-product-code-bars"), "Order print output must include 1D Code 128 barcodes.");
check(app.includes("function printPackingSlip(order)"), "Single-order print path must be updated.");
check(app.includes("function printSelectedOrders(kind)"), "Selected invoice/packing-slip print path must be updated.");

check(reviewsPage.includes("reviewStatusFilter") && reviewsPage.includes("reviewAddManual"), "Review page must offer moderation filters and manual review entry.");
check(reviewsLogic.includes("data-review-publish") && reviewsLogic.includes("data-review-hide"), "Review manager must publish and hide submissions.");
check(reviewsLogic.includes("data-review-edit") && reviewsLogic.includes("data-review-delete"), "Review manager must edit and delete submissions.");
check(reviewsLogic.includes('source:"admin"') && reviewsLogic.includes("verified_purchase:false"), "Admin-created reviews must be clearly attributed and not falsely verified.");
check(publicReviews.includes('source:"customer",status:"pending"'), "Customer review form must only submit Pending reviews.");
check(publicReviews.includes('status:"eq.published"'), "Public product page must show only approved/published reviews.");
check(main.includes("product-reviews.js") && main.includes('path.includes("/products/")'), "Public review script must load on GitHub Pages product routes.");

if (failures.length) {
  for (const failure of failures) console.error("FAIL: " + failure);
  process.exitCode = 1;
} else {
  console.log("Product tools contract checks passed: menu, SKU, Barcode/QR, order printing and moderated reviews.");
}

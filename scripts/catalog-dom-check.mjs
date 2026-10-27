import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const SITE_ROOT = "https://faysaltalukder.github.io/halalfood/";
const liveCatalogSource = readFileSync("js/live-catalog.js", "utf8");
const searchSource = readFileSync("js/products-index.js", "utf8");

const categories = [
  { id: "cat-ghee", name: "Ghee Premium", slug: "ghee", description: "Ghee products", image_url: "https://cdn.example/ghee.jpg", is_active: true, cms_created: false, cms_managed: true, sort_order: 90 },
  { id: "cat-new", name: "New Pantry", slug: "new-category", description: "New items", image_url: "https://cdn.example/new-category.jpg", is_active: true, cms_created: true, cms_managed: true, sort_order: 100 },
  { id: "cat-hidden", name: "Hidden Category", slug: "hidden", description: "", image_url: "", is_active: false, cms_created: true, cms_managed: true, sort_order: 110 }
];
const products = [
  { id: "p-featured", name: "Featured Ghee", slug: "featured-ghee", category: "Ghee Premium", category_slug: "ghee", price: 500, unit_type: "jar", display_price: "৳ 500 / jar", image_url: "https://cdn.example/featured.jpg", short_description: "Featured short description", full_description: "Featured full description\nSecond paragraph", is_active: true, is_featured: true, cms_created: false, cms_managed: true, sort_order: 20, created_at: "2026-10-26T09:00:00Z" },
  { id: "p-regular", name: "Regular Ghee", slug: "regular-ghee", category: "Ghee Premium", category_slug: "ghee", price: 300, unit_type: "jar", display_price: "৳ 300 / jar", image_url: "https://cdn.example/regular.jpg", short_description: "Regular short description", full_description: "Regular full description", is_active: true, is_featured: false, cms_created: false, cms_managed: true, sort_order: 10, created_at: "2026-10-25T09:00:00Z" },
  { id: "p-new", name: "New Pantry Item", slug: "new-pantry-item", category: "New Pantry", category_slug: "new-category", price: 200, unit_type: "bag", display_price: "৳ 200 / bag", image_url: "https://cdn.example/new-item.jpg", short_description: "New category product", full_description: "New product detail", is_active: true, is_featured: false, cms_created: true, cms_managed: true, sort_order: 1, created_at: "2026-10-27T09:00:00Z" },
  { id: "p-hidden", name: "Hidden Category Product", slug: "hidden-product", category: "Hidden Category", category_slug: "hidden", price: 100, unit_type: "piece", display_price: "৳ 100 / piece", image_url: "https://cdn.example/hidden.jpg", short_description: "Hidden", full_description: "Hidden", is_active: true, is_featured: true, cms_created: true, cms_managed: true, sort_order: 2, created_at: "2026-10-27T08:00:00Z" },
  { id: "p-inactive", name: "Inactive Product", slug: "inactive-product", category: "Ghee Premium", category_slug: "ghee", price: 50, unit_type: "piece", display_price: "৳ 50 / piece", image_url: "", short_description: "", full_description: "", is_active: false, is_featured: true, cms_created: true, cms_managed: true, sort_order: 0, created_at: "2026-10-27T07:00:00Z" }
];

function shell(mainContent) {
  return '<!doctype html><html lang="en"><head><title>Catalog test</title>' +
    '<meta name="description" content="Existing description">' +
    '<link rel="canonical" href="' + SITE_ROOT + '">' +
    '</head><body>' +
    '<header><nav><div class="mega-menu"><a href="categories/ghee.html">Ghee</a><a href="categories/hidden.html">Hidden Category</a></div>' +
    '<div class="mega-menu"><a href="categories/ghee.html">Ghee</a><a href="categories/hidden.html">Hidden Category</a></div></nav></header>' +
    '<aside><div class="mobile-category-links"><a href="categories/ghee.html">Ghee</a><a href="categories/hidden.html">Hidden Category</a></div></aside>' +
    '<main>' + mainContent + '</main>' +
    '<footer><div class="footer-grid"><div><h4>Categories</h4><ul><li><a href="categories/ghee.html">Ghee</a></li><li><a href="categories/hidden.html">Hidden Category</a></li></ul></div></div></footer>' +
    '</body></html>';
}

function makeStaticCard(slug, name, className) {
  return '<article class="' + className + '">' +
    '<a class="product-image-link" href="products/' + slug + '.html"><div class="product-image"><img src="https://cdn.example/static.jpg" alt="' + name + '"></div></a>' +
    '<div class="product-body"><span class="tag">Old Category</span><a class="product-name-link" href="products/' + slug + '.html"><h3>' + name + '</h3></a>' +
    '<p>Old description</p><div class="product-foot"><span class="price">৳ 999</span>' +
    '<button class="cart-add-btn" data-add-to-cart data-slug="' + slug + '" data-name="' + name + '" data-price="999" data-display-price="৳ 999" data-image="https://cdn.example/static.jpg" data-category="Old Category">Add</button>' +
    '<a class="order-btn category-order-btn" href="order.html?product=' + slug + '">Order Now</a></div></div></article>';
}

const homeMain =
  '<section id="categories"><div data-category-rail>' +
  '<a class="cat-card" href="categories/ghee.html"><span class="cat-card-img"><img src="https://cdn.example/ghee.jpg" alt=""></span><h3>Ghee</h3></a>' +
  '<a class="cat-card" href="category.html?slug=hidden"><span class="cat-card-img"><img src="" alt=""></span><h3>Hidden Category</h3></a>' +
  '</div></section>' +
  '<section id="products"><div class="product-grid">' + makeStaticCard("stale-featured", "Old Featured", "product-card") + '</div></section>' +
  '<section id="just-for-you"><div class="jfy-grid">' + makeStaticCard("stale-jfy", "Old Just For You", "jfy-card") + '</div>' +
  '<template data-jfy-hidden>' + makeStaticCard("stale-hidden", "Old Load More", "jfy-card") + '</template>' +
  '<button data-jfy-load-more type="button">Load More</button></section>' +
  '<section id="ghee-rail"><a class="merch-view-all" href="categories/ghee.html">View All</a>' +
  '<div class="mrow-wrap" data-mrow><div class="mrow-track" data-mrow-track>' +
  '<article class="mrow-card"><a class="mrow-name-link" href="products/stale.html"><h3>Old Rail Item</h3></a><span class="mrow-price">৳ 999</span>' +
  '<button class="mrow-cart-btn" data-add-to-cart data-slug="stale" data-name="Old Rail Item" data-price="999" data-display-price="৳ 999" data-image="" data-category="">Add</button></article>' +
  '</div><div data-mrow-dots></div></div></section>';

const categoryMain =
  '<section class="category-page-heading"><div class="wrap"><h1 id="live-category-title">Loading category…</h1></div></section>' +
  '<section class="section category-page-products"><div class="wrap"><div class="product-grid"><p class="muted">Loading products…</p></div></div></section>';

const productMain =
  '<div class="wrap breadcrumb" id="product-breadcrumb">Home &gt; Category &gt; Product</div>' +
  '<article class="product-detail"><div class="product-detail-grid">' +
  '<div class="product-detail-image-wrap"><button class="product-detail-image" type="button"><img src="https://cdn.example/old.jpg" alt="Old Product"></button></div>' +
  '<div class="product-detail-info"><span class="tag">Old Category</span><h1>Old Product</h1><p class="product-detail-price">৳ 999</p>' +
  '<div class="product-detail-actions"><a class="btn-primary order-btn" href="order.html?product=old">Order Now</a>' +
  '<button class="cart-detail-add" data-add-to-cart data-slug="featured-ghee" data-name="Old Product" data-price="999" data-display-price="৳ 999" data-image="" data-category="Old Category">Add</button>' +
  '<a href="https://wa.me/8801842031164">WhatsApp</a></div></div></div>' +
  '<section class="product-description-section"><div class="product-description-inner"><h2>Description</h2><p>Old description</p></div></section></article>' +
  '<section id="related-section" style="display:none"><div id="related-grid"></div></section>';

function activeApiRows(table, url) {
  if (table === "products") {
    return products.filter(item => item.is_active && url.searchParams.get("is_active") === "eq.true");
  }
  if (table === "categories") {
    return categories.filter(item => item.is_active && url.searchParams.get("is_active") === "eq.true");
  }
  throw new Error("Unexpected catalog table: " + table);
}

async function renderPage(path, mainContent) {
  const parsed = parseHTML(shell(mainContent));
  const window = parsed.window;
  const document = parsed.document;
  const pageLocation = new URL(path, SITE_ROOT);
  try { Object.defineProperty(window, "location", { value: pageLocation, configurable: true, writable: true }); }
  catch (_) { window.location = pageLocation; }
  const CustomEventImpl = window.CustomEvent || class extends window.Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  };
  window.HALAL_CART_API = { read: () => [] };
  window.PRODUCTS_DATA = [];
  const apiFetch = async (input) => {
    const url = new URL(String(input));
    const table = url.pathname.endsWith("/products") ? "products" : url.pathname.endsWith("/categories") ? "categories" : "";
    const rows = activeApiRows(table, url);
    return { ok: true, status: 200, json: async () => rows.map(item => ({ ...item })) };
  };
  const context = {
    window, document, location: pageLocation, URL, URLSearchParams,
    CustomEvent: CustomEventImpl, fetch: apiFetch, console,
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  context.PRODUCTS_INDEX = [["Old Static Item", new URL("products/old-static.html", SITE_ROOT).href]];
  const finished = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Live catalog did not finish rendering " + path)), 4000);
    window.addEventListener("halalcatalog:rendered", event => {
      clearTimeout(timeout);
      resolve(event.detail);
    }, { once: true });
  });
  vm.runInNewContext(liveCatalogSource, context, { filename: "js/live-catalog.js" });
  if (document.readyState === "loading") document.dispatchEvent(new window.Event("DOMContentLoaded"));
  const detail = await finished;
  return { window, document, detail };
}

function cardSlugs(grid, selector) {
  return Array.from(grid.querySelectorAll(selector)).map(card => card.querySelector("[data-add-to-cart][data-slug]")?.dataset.slug || "");
}

const home = await renderPage("index.html", homeMain);
const homeDocument = home.document;
const featuredGrid = homeDocument.querySelector("#products .product-grid");
assert.deepEqual(cardSlugs(featuredGrid, ".product-card"), ["featured-ghee"], "Featured grid must contain only explicitly featured active products.");
assert.ok(!featuredGrid.textContent.includes("Regular Ghee"), "Non-featured products must not be backfilled into Featured Products.");
const jfyGrid = homeDocument.querySelector("#just-for-you .jfy-grid");
assert.equal(cardSlugs(jfyGrid, ".jfy-card").length, 3, "Just For You must render the live active catalog rather than the static scaffold.");
assert.ok(jfyGrid.textContent.includes("New Pantry Item"), "Just For You should include a new active CMS-created product.");
const hiddenTemplate = homeDocument.querySelector("[data-jfy-hidden]");
assert.equal(hiddenTemplate.content.querySelectorAll(".jfy-card").length, 0, "Load More template must replace stale static template cards.");
assert.equal(hiddenTemplate.content.querySelectorAll("[data-add-to-cart][data-slug]").length, 0, "The hidden Load More template must not retain old Product IDs.");
const railTrack = homeDocument.querySelector("[data-mrow-track]");
assert.deepEqual(cardSlugs(railTrack, ".mrow-card"), ["featured-ghee", "regular-ghee"], "Category rails must not be limited to the original static card count.");
const categoryRail = homeDocument.querySelector("[data-category-rail]");
assert.equal(categoryRail.querySelectorAll(".cat-card").length, 2, "Home category rail must contain every active category and remove hidden categories.");
assert.ok(Array.from(categoryRail.querySelectorAll(".cat-card")).some(card => card.textContent.includes("New Pantry") && card.href.includes("category.html?slug=new-category")), "CMS-created categories must link to the dynamic category route.");
assert.ok(!categoryRail.textContent.includes("Hidden Category"), "Hidden categories must disappear from the home category rail.");
assert.equal(homeDocument.querySelectorAll(".mega-menu").length, 2, "Fixture contains both desktop category menus.");
for (const menu of homeDocument.querySelectorAll(".mega-menu")) {
  assert.ok(Array.from(menu.querySelectorAll("a")).some(link => link.textContent === "New Pantry"), "Every desktop mega menu must include the new active category.");
  assert.ok(!menu.textContent.includes("Hidden Category"), "Hidden categories must be removed from desktop menus.");
}
const mobileLinks = homeDocument.querySelector(".mobile-category-links");
assert.ok(Array.from(mobileLinks.querySelectorAll("a")).some(link => link.textContent === "New Pantry" && link.href.includes("category.html?slug=new-category")), "Mobile category navigation must include dynamic categories.");
assert.ok(!mobileLinks.textContent.includes("Hidden Category"), "Hidden categories must be removed from mobile navigation.");
const footerCategoryList = homeDocument.querySelector("footer .footer-grid > div ul");
assert.equal(footerCategoryList.querySelectorAll("li").length, 2, "Footer category navigation must contain only active categories.");

const category = await renderPage("categories/ghee.html", categoryMain);
const categoryGrid = category.document.querySelector(".category-page-products .product-grid");
assert.deepEqual(cardSlugs(categoryGrid, ".product-card").sort(), ["featured-ghee", "regular-ghee"].sort(), "Category grid must contain every active product assigned to the canonical category slug with no duplicate cards.");
assert.ok(!categoryGrid.textContent.includes("Hidden Category Product"), "Products under a hidden category must not be listed.");
assert.equal(category.document.querySelector("#live-category-title").textContent, "Ghee Premium", "Managed Category display name must match the live category record.");
assert.ok(Array.from(categoryGrid.querySelectorAll(".product-card")).every(card => card.querySelector(".category-order-btn")?.href.includes("order.html?product=")), "Category product Order Now controls must point to a product-specific checkout URL.");
const emptyCategory = await renderPage("category.html?slug=no-such-category", categoryMain);
assert.ok(emptyCategory.document.querySelector(".category-page-products .product-grid").textContent.includes("Category unavailable"), "Unknown or hidden categories must show an unavailable state.");

const product = await renderPage("products/featured-ghee.html", productMain);
const productDocument = product.document;
assert.equal(productDocument.querySelector(".product-detail-info h1").textContent, "Featured Ghee", "Product detail title must use the live Product record.");
assert.equal(productDocument.querySelector(".product-detail-price").textContent, "৳ 500 / jar", "Product detail price must use the live Product record.");
assert.ok(productDocument.querySelector(".product-description-section .product-description-inner").textContent.includes("Featured full description"), "Managed Product descriptions must refresh from Supabase.");
assert.ok(productDocument.querySelector(".product-detail-actions .order-btn").href.includes("order.html?product=featured-ghee"), "Product detail Order Now must use the canonical product slug.");
assert.ok(productDocument.querySelector("#related-grid").textContent.includes("Regular Ghee"), "Related Products must come from the same live category.");
assert.ok(!productDocument.querySelector("#related-grid").textContent.includes("New Pantry Item"), "Related Products must not leak from another category.");

const { window: searchWindow, document: searchDocument } = parseHTML('<!doctype html><html><body><input id="product-search"><ul id="search-results"></ul></body></html>');
const searchLocation = new URL("index.html", SITE_ROOT);
try { Object.defineProperty(searchWindow, "location", { value: searchLocation, configurable: true, writable: true }); }
catch (_) { searchWindow.location = searchLocation; }
searchWindow.PRODUCTS_DATA = [];
searchWindow.HALAL_LIVE_CATALOG_READY = false;
const searchContext = {
  window: searchWindow, document: searchDocument, URL, URLSearchParams,
  CustomEvent: searchWindow.CustomEvent || class extends searchWindow.Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  },
  console,
  PRODUCTS_INDEX: [["Old Static Item", new URL("products/old-static.html", SITE_ROOT).href]]
};
vm.runInNewContext(searchSource, searchContext, { filename: "js/products-index.js" });
if (searchDocument.readyState === "loading") searchDocument.dispatchEvent(new searchWindow.Event("DOMContentLoaded"));
const searchInput = searchDocument.querySelector("#product-search");
const searchResults = searchDocument.querySelector("#search-results");
searchInput.value = "new pantry";
searchInput.dispatchEvent(new searchWindow.Event("input", { bubbles: true }));
assert.ok(searchResults.textContent.includes("No matching products found"), "Pre-fetch fallback should not invent a match for a new live product.");
searchWindow.PRODUCTS_DATA = products.filter(item => item.is_active).map(item => ({
  slug: item.slug, name: item.name, category: item.category, price: item.display_price,
  image: item.image_url, cmsCreated: item.cms_created, cmsManaged: item.cms_managed
})).filter(item => item.category !== "Hidden Category");
searchWindow.HALAL_LIVE_CATALOG_READY = true;
searchWindow.dispatchEvent(new searchContext.CustomEvent("halalcatalog:updated", { detail: { products: searchWindow.PRODUCTS_DATA, categories } }));
assert.ok(searchResults.textContent.includes("New Pantry Item"), "Open Search Suggestions must refresh after the live catalog arrives.");
assert.ok(searchResults.textContent.includes("New Pantry"), "Search Suggestions must match the current Category as well as the Product Name.");
assert.ok(Array.from(searchResults.querySelectorAll("a")).some(link => link.href.includes("cms-product.html?slug=new-pantry-item")), "CMS-created Search Results must open the dynamic Product Detail route.");

console.log("Storefront Catalog DOM checks passed: Featured-only products, dynamic Just For You and Load More, uncapped category rails, dynamic header/mobile/footer categories, category hide/empty states, canonical product listing, live Product Detail fields, same-category related products, slug-based Order Now, and refreshed Category-aware Search Suggestions.");

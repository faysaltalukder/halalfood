/*
 * Store deployment configuration.
 *
 * For a new website, copy this file and change only the values below.
 * Never put a Supabase secret/service_role key in this public file.
 */
window.HALAL_STORE_CONFIG = Object.freeze({
  configVersion: 1,
  storeId: "halal-food",
  storeName: "Halal Food",
  siteRoot: "https://faysaltalukder.github.io/halalfood/",
  adminEmail: "halalfoodbd.official@gmail.com",
  supabase: Object.freeze({
    url: "https://qfwvrcfkrsydycbfjsxf.supabase.co",
    publishableKey: "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL"
  }),
  catalog: Object.freeze({
    categoriesTable: "categories",
    productsTable: "products",
    categoryPage: "category.html?slug={slug}",
    legacyCategoryPage: "categories/{slug}.html",
    maxCategories: 5000,
    maxProducts: 10000
  }),
  storage: Object.freeze({
    publicContentBucket: "store-content"
  })
});

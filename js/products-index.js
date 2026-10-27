const PRODUCTS_INDEX = [
  ["Premium Ajwa Dates", "https://faysaltalukder.github.io/halalfood/products/ajwa-dates.html"],
  ["Medjool Dates", "https://faysaltalukder.github.io/halalfood/products/medjool-dates.html"],
  ["Safawi Dates", "https://faysaltalukder.github.io/halalfood/products/safawi-dates.html"],
  ["Date Syrup", "https://faysaltalukder.github.io/halalfood/products/date-syrup.html"],
  ["Basmati Rice", "https://faysaltalukder.github.io/halalfood/products/basmati-rice.html"],
  ["Chickpeas", "https://faysaltalukder.github.io/halalfood/products/chickpeas.html"],
  ["Red Lentils", "https://faysaltalukder.github.io/halalfood/products/red-lentils.html"],
  ["Roasted Chana", "https://faysaltalukder.github.io/halalfood/products/roasted-chana.html"],
  ["Fresh Beef Cuts", "https://faysaltalukder.github.io/halalfood/products/beef-cuts.html"],
  ["Beef Boneless", "https://faysaltalukder.github.io/halalfood/products/beef-boneless.html"],
  ["Beef Curry Cut", "https://faysaltalukder.github.io/halalfood/products/beef-curry-cut.html"],
  ["Fresh Mutton", "https://faysaltalukder.github.io/halalfood/products/fresh-mutton.html"],
  ["Wild Forest Honey", "https://faysaltalukder.github.io/halalfood/products/wild-forest-honey.html"],
  ["Black Seed Honey", "https://faysaltalukder.github.io/halalfood/products/black-seed-honey.html"],
  ["Litchi Honey", "https://faysaltalukder.github.io/halalfood/products/litchi-honey.html"],
  ["Mustard Flower Honey", "https://faysaltalukder.github.io/halalfood/products/mustard-flower-honey.html"],
  ["Garlic & Honey Mix", "https://faysaltalukder.github.io/halalfood/products/garlic-honey-mix.html"],
  ["Honey Nut Mix", "https://faysaltalukder.github.io/halalfood/products/honey-nut-mix.html"],
  ["Date & Nut Mix", "https://faysaltalukder.github.io/halalfood/products/date-nut-mix.html"],
  ["Dry Fruit Mix", "https://faysaltalukder.github.io/halalfood/products/dry-fruit-mix.html"],
  ["Mixed Roasted Nuts", "https://faysaltalukder.github.io/halalfood/products/mixed-roasted-nuts.html"],
  ["Almonds", "https://faysaltalukder.github.io/halalfood/products/almonds.html"],
  ["Cashews", "https://faysaltalukder.github.io/halalfood/products/cashews.html"],
  ["Pumpkin Seeds", "https://faysaltalukder.github.io/halalfood/products/pumpkin-seeds.html"],
  ["House Biryani Masala", "https://faysaltalukder.github.io/halalfood/products/house-biryani-masala.html"],
  ["Beef Masala", "https://faysaltalukder.github.io/halalfood/products/beef-masala.html"],
  ["Chicken Masala", "https://faysaltalukder.github.io/halalfood/products/chicken-masala.html"],
  ["Fish Masala", "https://faysaltalukder.github.io/halalfood/products/fish-masala.html"],
  ["Classic Black Tea", "https://faysaltalukder.github.io/halalfood/products/classic-black-tea.html"],
  ["Green Tea", "https://faysaltalukder.github.io/halalfood/products/green-tea.html"],
  ["Ginger Tea", "https://faysaltalukder.github.io/halalfood/products/ginger-tea.html"],
  ["Herbal Tea", "https://faysaltalukder.github.io/halalfood/products/herbal-tea.html"],
  ["Kalmi Dates", "https://faysaltalukder.github.io/halalfood/products/kalmi-dates.html"],
  ["Sukkari Dates", "https://faysaltalukder.github.io/halalfood/products/sukkari-dates.html"],
  ["Brown Lentils (Whole Masoor)", "https://faysaltalukder.github.io/halalfood/products/brown-lentils.html"],
  ["Toor Dal (Arhar Dal)", "https://faysaltalukder.github.io/halalfood/products/toor-dal.html"],
  ["Sundarban Honey", "https://faysaltalukder.github.io/halalfood/products/sundarban-honey.html"],
  ["Kashmiri Sidr Honey", "https://faysaltalukder.github.io/halalfood/products/kashmiri-sidr-honey.html"],
  ["Nuts & Seeds Mix", "https://faysaltalukder.github.io/halalfood/products/nuts-seeds-mix.html"],
  ["Trail Mix (Dried Fruit & Nut)", "https://faysaltalukder.github.io/halalfood/products/trail-mix.html"],
  ["Walnuts", "https://faysaltalukder.github.io/halalfood/products/walnuts.html"],
  ["Pistachios", "https://faysaltalukder.github.io/halalfood/products/pistachios.html"],
  ["Mutton Masala", "https://faysaltalukder.github.io/halalfood/products/mutton-masala.html"],
  ["Korma Masala", "https://faysaltalukder.github.io/halalfood/products/korma-masala.html"],
  ["Lemon Tea", "https://faysaltalukder.github.io/halalfood/products/lemon-tea.html"],
  ["Masala Chai Mix", "https://faysaltalukder.github.io/halalfood/products/masala-tea.html"],
  ["Fresh Chicken (Broiler)", "https://faysaltalukder.github.io/halalfood/products/fresh-chicken.html"],
  ["Beef Bone-In Cuts", "https://faysaltalukder.github.io/halalfood/products/beef-bone-in.html"],
  ["Pure Mustard Oil (Sorisha Tel)", "https://faysaltalukder.github.io/halalfood/products/mustard-oil.html"],
  ["Extra Virgin Olive Oil", "https://faysaltalukder.github.io/halalfood/products/olive-oil.html"],
  ["Virgin Coconut Oil", "https://faysaltalukder.github.io/halalfood/products/coconut-oil.html"],
  ["Sunflower Oil", "https://faysaltalukder.github.io/halalfood/products/sunflower-oil.html"],
  ["Sesame Oil (Til Tel)", "https://faysaltalukder.github.io/halalfood/products/sesame-oil.html"],
  ["Soybean Oil", "https://faysaltalukder.github.io/halalfood/products/soybean-oil.html"],
  ["Pure Cow Ghee", "https://faysaltalukder.github.io/halalfood/products/cow-ghee.html"],
  ["Buffalo Ghee", "https://faysaltalukder.github.io/halalfood/products/buffalo-ghee.html"],
  ["Organic A2 Ghee", "https://faysaltalukder.github.io/halalfood/products/organic-a2-ghee.html"],
  ["Traditional Desi Ghee", "https://faysaltalukder.github.io/halalfood/products/desi-ghee.html"],
  ["White Butter Ghee", "https://faysaltalukder.github.io/halalfood/products/white-butter-ghee.html"],
  ["Premium Ghee Tin", "https://faysaltalukder.github.io/halalfood/products/premium-ghee-tin.html"],
];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#product-search");
  const results = document.querySelector("#search-results");
  if (!input || !results) return;

  const siteRoot = "https://faysaltalukder.github.io/halalfood/";
  const recordsForSearch = () => {
    if (window.HALAL_LIVE_CATALOG_READY === true && Array.isArray(window.PRODUCTS_DATA)) {
      return window.PRODUCTS_DATA.filter(item => item && item.slug).map(item => ({
        name: String(item.name || item.slug),
        slug: String(item.slug),
        category: String(item.category || ""),
        price: String(item.price || ""),
        href: item.cmsCreated
          ? new URL("cms-product.html?slug=" + encodeURIComponent(item.slug), siteRoot).href
          : new URL("products/" + encodeURIComponent(item.slug) + ".html", siteRoot).href
      }));
    }
    // A lightweight fallback is retained until Supabase returns the live catalog.
    return PRODUCTS_INDEX.map(([name, href, category = "", slug = ""]) => ({
      name: String(name || slug || "Product"),
      slug: String(slug || ""),
      category: String(category || ""),
      price: "",
      href: String(href || "")
    }));
  };

  const renderResults = () => {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!query) return;

    const matches = recordsForSearch().filter(item =>
      [item.name, item.category, item.slug].some(value =>
        String(value || "").toLocaleLowerCase().includes(query)
      )
    ).slice(0, 8);

    matches.forEach(item => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.category ? item.name + " · " + item.category : item.name;
      if (item.price) link.setAttribute("aria-label", item.name + ", " + item.category + ", " + item.price);
      li.appendChild(link);
      results.appendChild(li);
    });

    if (!matches.length) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No matching products found";
      results.appendChild(li);
    }
  };

  input.addEventListener("input", renderResults);
  // If the customer started searching before the asynchronous catalog finished,
  // refresh suggestions automatically without synthesizing an extra input event.
  window.addEventListener("halalcatalog:updated", () => {
    if (input.value.trim()) renderResults();
  });
});
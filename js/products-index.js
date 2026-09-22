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

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!q) return;

    PRODUCTS_INDEX.filter(([name]) => name.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach(([name, url]) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = url;
        a.textContent = name;
        li.appendChild(a);
        results.appendChild(li);
      });
  });
});

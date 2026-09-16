document.addEventListener("DOMContentLoaded", () => {
  const detailBox = document.querySelector("#product-detail");
  if (!detailBox) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const product = Array.isArray(PRODUCTS_DATA)
    ? PRODUCTS_DATA.find((item) => item.slug === slug)
    : null;

  if (!product) {
    detailBox.innerHTML = `
      <div class="product-not-found">
        <h1>Product not found</h1>
        <p>Sorry, we couldn't find that product.</p>
        <a class="btn-secondary" href="index.html">Back to Home</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} — Halal Food`;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = product.shortDescription;

  const breadcrumb = document.querySelector("#product-breadcrumb");
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="index.html">Home</a> &gt;
      <a href="index.html#categories">Categories</a> &gt;
      <a href="categories/${product.categorySlug}.html">${product.category}</a> &gt;
      ${product.name}
    `;
  }

  const orderUrl = `order.html?product=${encodeURIComponent(product.name)}`;
  const message = encodeURIComponent(`আমি ${product.name} অর্ডার করতে চাই`);
  const whatsappUrl = `https://wa.me/8801842031164?text=${message}`;

  detailBox.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-image-wrap">
        <button class="product-detail-image" type="button" aria-label="View ${product.name} image in full screen">
          <img src="${product.image}" alt="${product.name}">
          <span class="image-zoom-hint">Click image to enlarge</span>
        </button>
      </div>

      <div class="product-detail-info">
        <span class="tag">${product.category}</span>
        <h1>${product.name}</h1>
        <p class="product-detail-price">${product.price}</p>

        <div class="product-detail-actions">
          <a class="btn-primary" href="${orderUrl}">Order Now</a>
          <button type="button" class="btn-secondary cart-detail-add" data-add-to-cart data-slug="${product.slug}" data-name="${product.name}" data-price="${String(product.price).replace(/[^0-9.]/g, "")}" data-display-price="${product.price}" data-image="${product.image}" data-category="${product.category}">Add to Cart</button>
          <a class="btn-secondary" href="${whatsappUrl}" target="_blank" rel="noopener">Message Us</a>
          <a class="btn-secondary" href="tel:+8801842031164">Call Us</a>
        </div>

        <div class="product-short-note">
          <strong>Product:</strong> ${product.name}<br>
          <strong>Category:</strong> ${product.category}
        </div>
      </div>
    </div>

    <section class="product-description-section" aria-labelledby="product-description-title">
      <div class="product-description-inner">
        <span class="section-eyebrow">Product Details</span>
        <h2 id="product-description-title">Description</h2>
        <p>${product.fullDescription}</p>
      </div>
    </section>
  `;

  // Full-screen product image viewer: dark backdrop + image only.
  const imageButton = detailBox.querySelector(".product-detail-image");
  if (imageButton) {
    imageButton.addEventListener("click", () => {
      const modal = document.createElement("div");
      modal.className = "product-image-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", `${product.name} image viewer`);
      modal.innerHTML = `
        <button class="product-image-modal-close" type="button" aria-label="Close image viewer">&times;</button>
        <img src="${product.image}" alt="${product.name}">
      `;
      document.body.appendChild(modal);
      document.body.classList.add("image-modal-open");

      const closeModal = () => {
        modal.remove();
        document.body.classList.remove("image-modal-open");
        document.removeEventListener("keydown", onKeyDown);
      };
      const onKeyDown = (event) => {
        if (event.key === "Escape") closeModal();
      };

      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
      modal.querySelector(".product-image-modal-close").addEventListener("click", closeModal);
      document.addEventListener("keydown", onKeyDown);
    });
  }

  const related = PRODUCTS_DATA
    .filter((item) => item.categorySlug === product.categorySlug && item.slug !== product.slug)
    .slice(0, 3);

  const relatedSection = document.querySelector("#related-section");
  const relatedGrid = document.querySelector("#related-grid");

  if (related.length && relatedSection && relatedGrid) {
    relatedGrid.innerHTML = related.map((item) => {
      const url = `products/${encodeURIComponent(item.slug)}.html`;
      const order = `order.html?product=${encodeURIComponent(item.name)}`;
      return `
        <article class="product-card">
          <a href="${url}" class="product-image-link">
            <div class="product-image"><img src="${item.image}" alt="${item.name}"></div>
          </a>
          <div class="product-body">
            <span class="tag">${item.category}</span>
            <a href="${url}" class="product-name-link"><h3>${item.name}</h3></a>
            <p>${item.shortDescription}</p>
            <div class="product-foot">
              <span class="price">${item.price}</span>
              <button type="button" class="cart-add-btn" data-add-to-cart data-slug="${item.slug}" data-name="${item.name}" data-price="${String(item.price).replace(/[^0-9.]/g, "")}" data-display-price="${item.price}" data-image="${item.image}" data-category="${item.category}">Add to Cart</button>
              <a class="order-btn" href="${order}">Order Now</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
    relatedSection.style.display = "block";
  }
});

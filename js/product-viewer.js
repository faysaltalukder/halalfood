document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".product-detail-image").forEach((button) => {
    button.addEventListener("click", () => {
      const img = button.querySelector("img");
      if (!img) return;
      const modal = document.createElement("div");
      modal.className = "product-image-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", `${img.alt || "Product"} image viewer`);
      modal.innerHTML = `<button class="product-image-modal-close" type="button" aria-label="Close image viewer">&times;</button><img src="${img.currentSrc || img.src}" alt="${img.alt || "Product"}">`;
      document.body.appendChild(modal);
      document.body.classList.add("image-modal-open");
      const closeModal = () => { modal.remove(); document.body.classList.remove("image-modal-open"); document.removeEventListener("keydown", onKeyDown); };
      const onKeyDown = (event) => { if (event.key === "Escape") closeModal(); };
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
      modal.querySelector(".product-image-modal-close").addEventListener("click", closeModal);
      document.addEventListener("keydown", onKeyDown);
    });
  });
});

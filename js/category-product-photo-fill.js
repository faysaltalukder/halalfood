/* HALAL FOOD — fill the 4:3 catalog frame with a soft extension of each product photo.
   The original image remains on top with object-fit: contain, so no product is cropped. */
(function () {
  "use strict";

  if (!document.body || !document.body.classList.contains("category-products-page")) return;

  var seen = new WeakSet();
  var selector = ".category-page-products .product-card .product-image img";

  function setPhotoFill(img) {
    if (!img || seen.has(img)) return;
    var frame = img.closest(".product-image");
    if (!frame) return;
    seen.add(img);

    function syncSource() {
      var source = img.currentSrc || img.src || img.getAttribute("src");
      if (!source) return;
      frame.style.setProperty("--product-photo-fill", 'url("' + source + '")');
    }

    syncSource();
    img.addEventListener("load", syncSource, { passive: true });
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 1 && root.matches && root.matches(selector)) setPhotoFill(root);
    if (root.querySelectorAll) root.querySelectorAll(selector).forEach(setPhotoFill);
  }

  scan(document);
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) scan(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

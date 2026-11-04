/* Accessible, opt-in See More / See Less controls for product detail pages. */
(function(){
  function initProductMore(){
    document.querySelectorAll('[data-product-more-toggle]').forEach(function(button){
      if(button.dataset.moreReady==='1') return;
      var panel=document.getElementById(button.getAttribute('aria-controls')||'');
      if(!panel) return;
      button.dataset.moreReady='1';
      button.addEventListener('click',function(){
        var expanded=button.getAttribute('aria-expanded')==='true';
        button.setAttribute('aria-expanded',String(!expanded));
        panel.hidden=expanded;
        button.textContent=expanded?'See More':'See Less';
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initProductMore);
  else initProductMore();
})();


/* Product-card image backdrop: use each image's own source without replacing,
   cropping, or mutating the original foreground asset. */
(function(){
  function setProductImageBackdrops(root){
    (root||document).querySelectorAll('.product-card .product-image img').forEach(function(img){
      var frame=img.closest('.product-image');
      if(!frame || frame.dataset.backdropReady==='1') return;
      var source=img.currentSrc || img.src || img.getAttribute('src');
      if(!source) return;
      frame.style.setProperty('--product-image-backdrop','url("'+String(source).replace(/["\\\\]/g,'\\\\$&')+'")');
      frame.dataset.backdropReady='1';
    });
  }
  function init(){
    setProductImageBackdrops(document);
    if(!window.MutationObserver) return;
    var observer=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType===1){
            if(node.matches && node.matches('.product-card')) setProductImageBackdrops(node.parentNode||document);
            else setProductImageBackdrops(node);
          }
        });
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

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

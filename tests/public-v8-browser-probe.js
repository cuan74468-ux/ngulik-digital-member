/* CI-only V8 visual and image reliability probe; not deployed to users. */
(function(){
  'use strict';
  window.addEventListener('load',function(){
    setTimeout(function(){
      var imgs=Array.prototype.slice.call(document.querySelectorAll('.market-product-grid img.market-product-image'));
      var broken=imgs.filter(function(i){return !i.complete||i.naturalWidth<=0;}).length;
      var cards=Array.prototype.slice.call(document.querySelectorAll('.market-product-card'));
      var archived=cards.some(function(c){return /^\[ARCHIVED\]/i.test(c.textContent||'');});
      var intro=document.querySelector('.partner-public-intro');
      var bg=intro?getComputedStyle(intro).backgroundImage:'';
      var affiliateCohesive=!!intro&&bg.includes('ngd-v6-hero.webp')&&
        getComputedStyle(intro).borderRadius!=='0px';
      var helpCount=document.querySelectorAll('.ngd-help-question').length;
      var el=document.createElement('output');
      el.id='qa-public-v8';
      el.setAttribute('data-v8-image-count',String(imgs.length));
      el.setAttribute('data-v8-broken-images',String(broken));
      el.setAttribute('data-v8-archived-visible',String(archived));
      el.setAttribute('data-v8-affiliate-cohesive',String(affiliateCohesive));
      el.setAttribute('data-v8-help-faq',String(helpCount));
      document.body.appendChild(el);
    },1250);
  },{once:true});
})();

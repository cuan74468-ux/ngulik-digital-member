// CI-only geometry probe for the text-first public landing page.
(function(){
  'use strict';
  window.addEventListener('load',function(){
    setTimeout(function(){
      var hero=document.querySelector('.ngd-home-quiet-hero');
      if(!hero)return;
      var copy=hero.querySelector('.ngd-shop-hero-content');
      if(!copy)return;
      var c=copy.getBoundingClientRect(),h=hero.getBoundingClientRect();
      var desktop=window.innerWidth>920;
      var viewportWidth=document.documentElement.clientWidth||window.innerWidth;
      var nav=document.querySelector('.topbar');
      var n=nav?nav.getBoundingClientRect():null;
      var headerClear=!n||n.bottom<=h.top+8;
      var headerAnchored=!!n&&n.left>=-1&&n.right<=viewportWidth+1&&n.width>=viewportWidth-3;
      var heroWide=h.width>=Math.min(980,viewportWidth-(desktop?48:24));
      var copyReadable=c.width>=(desktop?300:250)&&c.left>=-1&&c.right<=viewportWidth+1;
      var noArt=!hero.querySelector('img,.ngd-shop-hero-art');
      var noProducts=!document.querySelector('.ngd-home-quiet .market-product-card,.ngd-home-quiet .ngd-shop-featured');
      var output=document.createElement('output');
      output.id='qa-home-geometry';
      output.setAttribute('data-home-columns-clear',String(copyReadable));
      output.setAttribute('data-home-order',String(copyReadable));
      output.setAttribute('data-home-header-clear',String(headerClear));
      output.setAttribute('data-home-art-absent',String(noArt));
      output.setAttribute('data-home-no-products',String(noProducts));
      output.setAttribute('data-home-header-anchored',String(headerAnchored));
      output.setAttribute('data-home-hero-wide',String(heroWide));
      output.textContent=JSON.stringify({
        viewport:window.innerWidth,copy:{left:Math.round(c.left),right:Math.round(c.right),
          width:Math.round(c.width)},hero:{left:Math.round(h.left),
          right:Math.round(h.right),width:Math.round(h.width)},
        copyReadable:copyReadable,headerClear:headerClear,headerAnchored:headerAnchored,
        heroWide:heroWide,noArt:noArt,noProducts:noProducts
      });
      document.body.appendChild(output);
    },900);
  },{once:true});
})();

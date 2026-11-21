// CI-only rendered geometry for the digital marketplace (never shipped to production).
(function(){
  'use strict';
  window.addEventListener('load',function(){
    setTimeout(function(){
      var hero=document.querySelector('.ngd-shop-hero');
      if(!hero)return;
      var copy=hero.querySelector('.ngd-shop-hero-content');
      var art=hero.querySelector('.ngd-shop-hero-art');
      var image=art&&art.querySelector('img');
      if(!copy||!art)return;
      var c=copy.getBoundingClientRect(),a=art.getBoundingClientRect();
      var desktop=window.innerWidth>920;
      var columnsClear=desktop?
        c.width>=250&&a.width>=230&&c.right<=a.left+6:
        (c.width>280&&a.width>280);
      var mobileOrder=desktop?true:c.bottom<=a.top+6;
      var nav=document.querySelector('.topbar');
      var n=nav?nav.getBoundingClientRect():null;
      var banner=hero.getBoundingClientRect();
      var headerClear=!n||n.bottom<=banner.top+8;
      var artLoaded=!!image&&image.complete&&image.naturalWidth>0;
      var output=document.createElement('output');
      output.id='qa-home-geometry';
      output.setAttribute('data-home-columns-clear',String(columnsClear));
      output.setAttribute('data-home-order',String(mobileOrder));
      output.setAttribute('data-home-header-clear',String(headerClear));
      output.setAttribute('data-home-art-loaded',String(artLoaded));
      output.textContent=JSON.stringify({
        viewport:window.innerWidth,copy:{left:Math.round(c.left),right:Math.round(c.right),
          top:Math.round(c.top),bottom:Math.round(c.bottom),width:Math.round(c.width)},
        illustration:{left:Math.round(a.left),right:Math.round(a.right),
          top:Math.round(a.top),bottom:Math.round(a.bottom),width:Math.round(a.width)},
        header:n?{bottom:Math.round(n.bottom)}:null,
        heroTop:Math.round(banner.top),columnsClear:columnsClear,
        mobileOrder:mobileOrder,headerClear:headerClear,artLoaded:artLoaded
      });
      document.body.appendChild(output);
    },900);
  },{once:true});
})();

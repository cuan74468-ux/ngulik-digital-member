// CI-only measurement of actual rendered landing page geometry.
(function(){
  'use strict';
  window.addEventListener('load',function(){
    setTimeout(function(){
      var hero=document.querySelector('.pf-home-minimal');
      if(!hero)return;
      var copy=hero.querySelector('.public-hero-copy');
      var art=hero.querySelector('.ngd-journey-stage');
      if(!copy||!art)return;
      var a=art.getBoundingClientRect(),b=copy.getBoundingClientRect();
      var desktop=window.innerWidth>900;
      var columnsClear=desktop?
        b.right<=a.left-6 && b.width>=275 && a.width>=240 :
        true;
      var mobileOrder=!desktop?a.bottom<=b.top+8:true;
      var nav=document.querySelector('.topbar');
      var n=nav?nav.getBoundingClientRect():null;
      var headerClear=!n||n.bottom<=Math.min(a.top,b.top)+6;
      var animated=getComputedStyle(art.querySelector('.ngd-journey-ball')).animationName==='ngdBallAscend';
      var output=document.createElement('output');
      output.id='qa-home-geometry';
      output.setAttribute('data-home-columns-clear',String(columnsClear));
      output.setAttribute('data-home-order',String(mobileOrder));
      output.setAttribute('data-home-header-clear',String(headerClear));
      output.setAttribute('data-home-animated',String(animated));
      output.textContent=JSON.stringify({viewport:window.innerWidth,copy:{
        left:Math.round(b.left),right:Math.round(b.right),top:Math.round(b.top),
        width:Math.round(b.width)
      },illustration:{left:Math.round(a.left),right:Math.round(a.right),
        top:Math.round(a.top),bottom:Math.round(a.bottom),width:Math.round(a.width)
      },columnsClear:columnsClear,mobileOrder:mobileOrder,headerClear:headerClear,
      animated:animated});
      document.body.appendChild(output);
    },900);
  },{once:true});
})();

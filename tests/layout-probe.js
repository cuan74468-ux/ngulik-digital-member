// Loaded only in the temporary CI copy of index.html, never in production.
(function () {
  'use strict';
  window.addEventListener('load', function () {
    setTimeout(function () {
      var output=document.createElement('output');
      output.id='qa-layout';
      var nav=document.getElementById('mobile-nav');
      var buys=Array.prototype.slice.call(document.querySelectorAll('[data-buy]'));
      var visible=nav?getComputedStyle(nav).display!=='none':false;
      var overflow=document.documentElement.scrollWidth>window.innerWidth+2;
      var memberTheme=document.body.classList.contains('member-experience');
      var primaryColor=getComputedStyle(document.body)
        .getPropertyValue('--green').trim();
      var memberViolet=memberTheme&&
        (primaryColor==='#6047ef'||primaryColor==='#6047EF');
      output.setAttribute('data-overflow',String(overflow));
      output.setAttribute('data-member-theme',String(memberTheme));
      output.setAttribute('data-member-violet',String(memberViolet));
      output.setAttribute('data-mobile-nav',String(visible));
      output.setAttribute('data-buy-buttons',String(buys.length));
      output.setAttribute('data-buys-disabled',String(buys.every(function(b){return b.disabled;})));
      output.textContent='LAYOUT_CHECK '+JSON.stringify({
        viewportWidth:window.innerWidth,
        scrollWidth:document.documentElement.scrollWidth,
        overflow:overflow,memberTheme:memberTheme,memberViolet:memberViolet,
        mobileNavigationVisible:visible,
        disabledBuyButtons:buys.length
      });
      document.body.appendChild(output);
    },700);
  },{once:true});
})();

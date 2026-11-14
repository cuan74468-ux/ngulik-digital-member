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
      // Must match on desktop, mobile, public/member and ADMIN.
      var bg=getComputedStyle(document.body).getPropertyValue('--bg').trim().toLowerCase();
      var sharedTheme=bg==='#cdeef9'&&primaryColor.toLowerCase()==='#0f2c45';
      var themeLinked=!!document.querySelector('link[href*="unified-theme.css"]');
      var main=document.getElementById('screen');
      var navRect=nav?nav.getBoundingClientRect():null;
      var floatingNav=window.innerWidth<=760&&visible&&navRect&&
        navRect.left>=10&&navRect.right<=window.innerWidth-10&&
        navRect.width<=window.innerWidth-35;
      var activeNav=document.querySelector(
        window.innerWidth<=760?'.mobile-nav .nav-item[aria-current="page"]':
          '.sidebar .nav-item[aria-current="page"]');
      var inkNav=!!activeNav&&
        getComputedStyle(activeNav).backgroundColor==='rgb(15, 44, 69)';
      var activeSurface=main?main.querySelector('.surface,.metric-card,.member-focus'):null;
      var surfaceReady=!!activeSurface&&
        getComputedStyle(activeSurface).backgroundColor!=='rgba(0, 0, 0, 0)';
      var safeTheme=sharedTheme&&themeLinked;
      output.setAttribute('data-overflow',String(overflow));
      output.setAttribute('data-member-theme',String(memberTheme));
      output.setAttribute('data-unified-theme',String(safeTheme));
      output.setAttribute('data-ink-navigation',String(inkNav));
      output.setAttribute('data-floating-nav',String(Boolean(floatingNav)));
      output.setAttribute('data-surface-ready',String(surfaceReady));
      output.setAttribute('data-mobile-nav',String(visible));
      output.setAttribute('data-buy-buttons',String(buys.length));
      output.setAttribute('data-buys-disabled',String(buys.every(function(b){return b.disabled;})));
      output.textContent='LAYOUT_CHECK '+JSON.stringify({
        viewportWidth:window.innerWidth,
        scrollWidth:document.documentElement.scrollWidth,
        overflow:overflow,memberTheme:memberTheme,sharedTheme:safeTheme,inkNavigation:inkNav,
        mobileNavigationVisible:visible,floatingNavigation:Boolean(floatingNav),
        disabledBuyButtons:buys.length
      });
      document.body.appendChild(output);
    },700);
  },{once:true});
})();

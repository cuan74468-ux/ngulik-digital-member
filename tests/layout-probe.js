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
      var sharedTheme=bg==='#fafafc'&&primaryColor.toLowerCase()==='#1db86a';
      var themeLinked=!!document.querySelector('link[href*="unified-theme.css"]')&&
        !!document.querySelector('link[href*="learning-studio.css"]')&&
        !!document.querySelector('link[href*="styles.css"]')&&
        !!document.querySelector('link[href*="portfolio-adaptation.css"]');
      var main=document.getElementById('screen');
      var navRect=nav?nav.getBoundingClientRect():null;
      var floatingNav=window.innerWidth<=760&&visible&&navRect&&
        navRect.left>=10&&navRect.right<=window.innerWidth-10&&
        navRect.width<=window.innerWidth-18;
      var activeNav=document.querySelector(
        window.innerWidth<=760?'.mobile-nav .nav-item[aria-current="page"]':
          '.sidebar .nav-item[aria-current="page"]');
      var inkNav=!!activeNav&&
        ['rgb(239, 243, 255)','rgb(237, 243, 255)','rgb(237, 242, 250)']
          .includes(getComputedStyle(activeNav).backgroundColor)&&
        ['rgb(36, 84, 207)','rgb(36, 89, 219)','rgb(37, 61, 96)']
          .includes(getComputedStyle(activeNav).color);
      var guest=document.body.getAttribute('data-app-role')==='guest';
      // Public top navigation replaces all selected sidebar/bottom nav states.
      if(guest)inkNav=!visible&&getComputedStyle(document.querySelector('.sidebar')).display==='none'
        &&getComputedStyle(document.querySelector('.guest-nav')).display!=='none';
      var activeSurface=main?main.querySelector('.surface,.metric-card,.member-focus'):null;
      var surfaceReady=!!activeSurface&&
        getComputedStyle(activeSurface).backgroundColor!=='rgba(0, 0, 0, 0)';
      var safeTheme=sharedTheme&&themeLinked;
      var sharedExperience=!!document.querySelector('link[href*="assets/experience.css"]') &&
        document.body.classList.contains('ngd-public-app') &&
        getComputedStyle(document.body).getPropertyValue('--ngd-blue').trim().toLowerCase()==='#2f6bff';
      // Real browser acceptance for the new mobile menu: all features are
      // browseable, essential explanatory copy must remain visible.
      var headingHelp=main?main.querySelector('.section-head p:not(.eyebrow)'):null;
      var guidanceVisible=!headingHelp ||
        (getComputedStyle(headingHelp).display!=='none' &&
          headingHelp.getBoundingClientRect().height>0);
      var allMenuCount=main?main.querySelectorAll('.ngd-menu-tile').length:0;
      output.setAttribute('data-guidance-visible',String(guidanceVisible));
      output.setAttribute('data-menu-items',String(allMenuCount));
      // Effective computed styles, not only presence of a linked stylesheet.
      // On 375px legacy main-content used 12px, V2 prescribes 16px.
      var chip=document.getElementById('account-button');
      var content=document.getElementById('main');
      var gutter=parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--ngd-gutter'));
      var effectiveGutter=content?parseFloat(getComputedStyle(content).paddingLeft):NaN;
      var cascadeCorrect=!!chip &&
        (guest || (window.innerWidth>760 || effectiveGutter>=16)) &&
        (guest || getComputedStyle(chip).borderRadius!=='0px');
      output.setAttribute('data-v2-cascade',String(cascadeCorrect));
      output.setAttribute('data-experience-v2',String(sharedExperience));
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

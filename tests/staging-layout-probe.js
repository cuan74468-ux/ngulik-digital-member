/* Headless Chrome visual-smoke probe. Injected only by GitHub Actions.
   This script does not make network requests or write application data. */
(function(){
  window.addEventListener('load',function(){
    var checks=[];
    function check(name,condition){checks.push({name:name,pass:!!condition});}
    var page=document.getElementById('workspace-main');
    var heading=document.getElementById('page-title');
    var access=document.getElementById('access-layout');
    var setup=document.getElementById('setup-section');
    var aside=document.querySelector('.access-aside');
    var menu=document.getElementById('menu');
    check('page-visible',!!page && page.getBoundingClientRect().width>=280);
    check('heading-visible',!!heading && heading.getBoundingClientRect().height>20);
    check('connection-visible',!!setup && !setup.hidden && setup.getBoundingClientRect().height>100);
    check('editorial-aside-contextual',!!aside && (window.innerWidth<=760?
      getComputedStyle(aside).display==='none':aside.getBoundingClientRect().width>200));
    check('navigation-state',!!menu && (window.innerWidth<=760 && menu.classList.contains('is-locked')?
      getComputedStyle(menu).display==='none':getComputedStyle(menu).display!=='none'));
    check('login-not-public',document.getElementById('login-section').hidden===true);
    check('workspace-not-public',document.getElementById('workspace-section').hidden===true);
    check('no-document-overflow',document.documentElement.scrollWidth<=window.innerWidth+4);
    check('access-layout-visible',!!access && access.getBoundingClientRect().height>200);
    check('valid-viewport',window.innerWidth>=300);
    check('shared-experience-v2',
      !!document.querySelector('link[href*="../assets/experience.css"]') &&
      document.body.classList.contains('ngd-ops-app') &&
      getComputedStyle(document.body).getPropertyValue('--ngd-blue').trim()==='#20684e');
    var ok=checks.every(function(x){return x.pass;});
    document.body.setAttribute('data-staging-visual-check',ok?'pass':'fail');
    document.body.setAttribute('data-staging-visual-count',String(checks.length));
    document.body.setAttribute('data-staging-check-details',checks.map(function(x){
      return x.name+':'+(x.pass?'PASS':'FAIL');
    }).join(' | '));
  },{once:true});
})();

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),css=read('assets/member-native-dashboard-v1.css');
test('member desktop has five primary destinations and four overflow destinations',()=>{
  assert.match(app,/const memberDesktopNav=\['beranda','katalog','ai','jasa','belajar'\]/);
  assert.match(app,/const memberDesktopExtraRoutes=memberNav.filter/);
  assert.match(app,/const navRoutes=isAdmin\(\)\?\[\]:logged\(\)\?memberDesktopNav:guestNav/);
  assert.match(app,/const routes=isAdmin\(\)\?adminNav:logged\(\)\?memberNav:guestNav/);
});
test('desktop hides hamburger graphic, redundant order and status, and duplicated drawer routes',()=>{
  assert.match(css,/@media\(min-width:981px\)/);
  assert.match(css,/#top-nav-trigger svg\{display:none!important\}/);
  assert.match(css,/#top-nav-trigger \.ngdm-desktop-more-text\{display:inline!important\}/);
  assert.match(css,/\.topbar :is\(#mode-indicator,#header-order\)\{\s*display:none!important/);
  for(const route of ['beranda','katalog','ai','jasa','belajar'])
    assert.ok(css.includes('#top-nav-drawer nav [data-route="'+route+'"]'),route);
  for(const file of ['index.html','staging/member.html']){
    const html=read(file);
    assert.match(html,/ngdm-desktop-more-text" aria-hidden="true">Lainnya/);
    assert.match(html,/member-native-dashboard-v1\.css\?v=20261122-qris-contract-safe-v4/);
    assert.match(html,/app\.js\?v=\d{8}-[a-z0-9-]+/); // cache-busted, versioned entrypoint
  }
});
test('phone dock and existing More drawer keep every member destination reachable',()=>{
  assert.match(app,/const memberDockRoutes=\['beranda','katalog','ai','pesanan'\]/);
  assert.match(app,/const memberExtraRoutes=\['jasa','belajar','affiliate','dukungan','akun'\]/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/#member-mobile-nav:not\(\[hidden\]\)/);
  for(const route of ['beranda','katalog','ai','pesanan'])
    assert.ok(css.includes('#top-nav-drawer nav [data-route="'+route+'"]'),route);
});
test('dashboard reuses header profile control, not a second avatar; balance is genuine',()=>{
  assert.doesNotMatch(app,/class="ngdm-avatar"/);
  assert.match(app,/by\('account-avatar'\)\.textContent=logged\(\)/);
  assert.match(app,/const balanceValue=Number\(d\.saldo_kredit\?\?state\.me\?\.saldo_kredit\)/);
  assert.match(app,/memberTokenTrend_\(state\.creditHistory,balance\)/);
});

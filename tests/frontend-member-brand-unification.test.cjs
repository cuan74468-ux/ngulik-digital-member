'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('assets/member-native-dashboard-v1.css'),app=read('js/app.js');
const brand=read('assets/brand-experience-v10.css');
test('member design uses the existing public Ngulik Digital brand tokens',()=>{
  assert.match(brand,/--ngd-brand-primary:#5b28d6/);
  assert.match(brand,/--ngd-brand-deep:#21134f/);
  assert.match(brand,/--ngd-brand-highlight:#ffe34d/);
  assert.match(css,/--ngdm-primary:var\(--ngd-brand-primary,#5b28d6\)/);
  assert.match(css,/--ngdm-gold:var\(--ngd-brand-highlight,#ffe34d\)/);
  assert.match(css,/--ngdm-deep:var\(--ngd-brand-deep,#21134f\)/);
  assert.match(css,/\.ngdm-wallet-cta\{background:var\(--ngdm-primary\)!important/);
  assert.doesNotMatch(css,/#(?:137b60|15765e|eaf7ef|f7faf8)/i);
});
test('the member phone dock says Dashboard but retains the original beranda route',()=>{
  assert.match(app,/const memberDockRoutes=\['beranda','katalog','ai','pesanan'\]/);
  assert.match(app,/route==='beranda'\?'Dashboard':route==='ai'\?'Studio AI'/);
  assert.match(app,/beranda:\['Beranda','home'\]/);
  assert.match(app,/const guestNav=\['beranda','katalog','jasa','dukungan'\]/);
});
test('published entrypoints share one version of the unified member stylesheet',()=>{
  for(const file of ['index.html','staging/member.html']){
    assert.match(read(file),/member-native-dashboard-v1\.css\?v=20261122-unified-brand-member-v3/);
    assert.match(read(file),/app\.js\?v=20261122-private-gates-v5/);
  }
});

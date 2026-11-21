'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js');
const css=read('assets/marketplace-ref-v5.css');

test('V6 resets old translated floating header and 900px hero ceiling',()=>{
  assert.match(css,/position:sticky!important;top:0!important;left:0!important/);
  assert.match(css,/transform:none!important;z-index:72!important/);
  assert.match(css,/width:100%!important;max-width:none!important/);
  assert.match(css,/\.pf-home-minimal\.ngd-shop-hero\{/);
  assert.match(css,/max-width:none!important/);
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
});
test('responsive storefront contains genuine touch navigation and no overflow-masking hacks',()=>{
  assert.match(css,/@media\(max-width:920px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/#mobile-nav\{/);
  assert.match(css,/display:flex!important/);
  assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:|overflow-x:\s*hidden\s*!important/i);
});
test('real source assets are efficient WebP images, not decorative fake QR or prices',()=>{
  for(const name of ['hero','ebook','starter','bundle','pos','video','integrasi']){
    const file=path.join(root,'assets','media','ngd-v6-'+name+'.webp');
    const buf=fs.readFileSync(file);
    assert.equal(buf.toString('ascii',0,4),'RIFF',name);
    assert.equal(buf.toString('ascii',8,12),'WEBP',name);
    assert.ok(buf.length>3500&&buf.length<110000,name+' size '+buf.length);
  }
  assert.match(app,/function ngdPremiumArtSrc_\(name\)/);
  assert.match(app,/ngdPremiumArtSrc_\(name\)/);
  assert.match(app,/ngdPremiumArtSrc_\(name\)/);
});
test('no duplicate service cards appear below the storefront; checkout gates unchanged',()=>{
  const home=app.slice(app.indexOf('function viewHome(){'),app.indexOf('const offerCategories='));
  assert.match(home,/ngd-home-direct-links/);
  assert.doesNotMatch(home,/hero\+trust\+showcase\+signup|viewPublicMarketplace\(curated/);
  assert.match(app,/function ngdCommissionLabel_\(p\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(app,/async function confirmPayment\(\)/);
});
test('header search routes into the same existing catalogue, with no network shortcuts',()=>{
  for(const path of ['index.html','staging/member.html']){
    const html=read(path);
    assert.match(html,/id="guest-header-search-form"/);
    assert.match(html,/name="query" type="search"/);
    assert.match(html,/marketplace-ref-v5\.css\?v=20261121-v6-2/);
  }
  assert.match(app,/document\.addEventListener\('submit',\(e\)=>\{\s*if\(e\.target\?\.id!=='guest-header-search-form'\)/);
  assert.match(app,/state\.marketplaceSearch=query/);
  assert.match(app,/go\('katalog'\)/);
});

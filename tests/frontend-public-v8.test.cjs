'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),css=read('assets/public-experience-v8.css');
test('V8 contains 12 compact local WebP cover scenes for the full catalog',()=>{
 for(const name of ['ai-small','ai-pack','ai-large','templates','canva','code',
   'class','youtube','supabase','pos','video','gas']){
   const b=fs.readFileSync(path.join(root,'assets/media/ngd-v8-'+name+'.webp'));
   assert.equal(b.toString('ascii',0,4),'RIFF',name);
   assert.equal(b.toString('ascii',8,12),'WEBP',name);
   assert.ok(b.length>3000&&b.length<65000,name);
 }
 assert.match(app,/function ngdProductArtId_\(p,kind\)/);
 assert.match(app,/assets\/media\/ngd-v8-/);
});
test('archived QA entries stay in DB but never appear in public listing',()=>{
 assert.match(app,/const isPublicQaOffer_=p=>/);
 assert.match(app,/ARCHIVED\|ARSIP\|QA/);
 assert.match(app,/filter\(p=>!isPublicQaOffer_\(p\)\)/);
 assert.match(app,/function openProductCheckout_\(id\)/);
});
test('published CMS cover and reliable local fallback are both present',()=>{
 assert.match(app,/window\.NGD_CONTENT_UI\?\.media\(state\.siteContent,'PRODUCT_IMAGE',p\.product_id/);
 assert.match(app,/data-market-fallback/);
 assert.match(app,/document\.addEventListener\('error'/);
 assert.doesNotMatch(app,/onerror="/);
});
test('guest Affiliate, Help, Login and Katalog share violet marketplace system',()=>{
 assert.match(app,/class="ngd-public-help"/);
 assert.match(app,/ngd-help-question/);
 assert.match(css,/\.partner-public-intro/);
 assert.match(css,/\.ngd-help-faq/);
 assert.match(css,/\.ngd-public-services-hero/);
 assert.match(css,/\.ai-catalog-intro/);
 assert.match(css,/\.login-shell/);
 assert.match(css,/\.market-product-media/);
 for(const page of ['index.html','staging/member.html']){
   const html=read(page);
   assert.match(html,/public-experience-v8\.css\?v=20261121-public-v8-2/);
   assert.match(html,/app\.js\?v=20261121-qris-checkout-v4-market-v9/);
 }
});

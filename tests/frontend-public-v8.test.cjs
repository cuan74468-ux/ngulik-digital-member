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
test('public Help uses a readable purchase guide while member routes remain private',()=>{
 const sales=read('assets/guest-sales-trust-v1.css');
 assert.match(app,/class="ngd-buyer-help"/);
 assert.match(app,/class="ngdb-questions"/);
 assert.match(app,/data-route="login"/);
 assert.match(sales,/\.ngdb-help-intro/);
 assert.match(sales,/-webkit-text-fill-color:#241d38!important/);
 assert.match(css,/\.partner-public-intro/);
 assert.match(css,/\.ai-catalog-intro/);
 assert.match(css,/\.login-shell/);
 assert.match(css,/\.market-product-media/);
 const html=read('index.html');
 assert.match(html,/guest-sales-trust-v1\.css\?v=20261121-sales-trust-v1/);
 assert.match(html,/js\/app\.js\?v=20261122-private-gates-v5/);
 assert.match(html,/assets\/product-detail-v1\.css\?v=20261121-detail-1/);
});

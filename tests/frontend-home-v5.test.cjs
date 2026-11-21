'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/home-v5.css'),'utf8');
const floating=fs.readFileSync(path.join(root,'assets/learning-journey.css'),'utf8');
const publicHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const stagingHtml=fs.readFileSync(path.join(root,'staging/member.html'),'utf8');
test('public and STAGING share the same latest calm floating-brand layer',()=>{
  for(const html of [publicHtml,stagingHtml]){
    assert.ok(html.indexOf('learning-journey.css')>html.indexOf('home-v5.css'));
    assert.match(html,/learning-journey\.css\?v=20261120-home-services-v1/);
    assert.match(html,/family=Inter/);
  }
});
test('quiet public hero uses text first, with accessible links and no decorative product collage',()=>{
  assert.match(app,/class="ngdl-hero"/);
  assert.match(app,/class="ngdl-hero"|ngdl-hero/);
  assert.doesNotMatch(app.slice(app.indexOf('  \/\/ Public front door:'),app.indexOf('const offerCategories=')),/ngd-home-artwork|ngd-floating-shadow|market-product-card/);
  assert.doesNotMatch(app,/ngd-journey-step|ngd-climb-step|ngd-journey-stairs|ngd-journey-art/);
  assert.match(floating,/@keyframes ngdQuietFloat/);
  assert.match(floating,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(floating,/@keyframes ngdBallAscend|@keyframes ngdStairLight|ngdPixelDrift/);
});
test('homepage routes to the live catalog and member registration without fake commerce',()=>{
  assert.match(app,/class="ngd-landing-v1"/);
  assert.match(app,/class="ngdl-hero"|ngdl-hero/);
  assert.match(app,/ngdl-actions/);
  assert.doesNotMatch(app.slice(app.indexOf('  \/\/ Public front door:'),app.indexOf('const offerCategories=')),/ngd-shop-featured|ngd-shop-signup/);
  assert.match(app,/data-route="katalog"/);
  assert.match(app,/data-route="daftar"/);
  assert.doesNotMatch(app,/class="nh-grid"|class="nh-rail"|class="ngd-token-market"/);
});
test('desktop columns, mobile logo-first, and warm typography are retained',()=>{
  assert.match(floating,/\.nh-home\.nh-home-minimal > \.public-editorial-hero/);
  assert.match(floating,/flex-direction:column;/);
  assert.match(floating,/\.pf-home-minimal > \.ngd-journey-stage/);
  assert.match(floating,/order:0;/);
  assert.match(floating,/@media\(max-width:900px\)/);
  assert.match(css,/--ngd-canvas:#faf8f3/);
  assert.match(css,/--pf-heading:"Inter"/);
});
test('homepage-only CSS preserves payment and account logic',()=>{
  assert.match(app,/async function confirmPayment\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.doesNotMatch(floating,/#2F6BFF|#4361ee|#0e1320/i);
});

test('both entrypoints load current homepage copy rather than cached 16 November module',()=>{
  assert.match(app,/Bikin konten jualan, coba AI, atau rapikan usaha/);
  assert.match(publicHtml,/js\/app\.js\?v=20261121-guest-asset-fix-1/);
  assert.match(stagingHtml,/js\/app\.js\?v=20261121-guest-asset-fix-1/);
});

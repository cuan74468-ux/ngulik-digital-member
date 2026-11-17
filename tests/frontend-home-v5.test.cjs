'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/home-v5.css'),'utf8');
const publicHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const stagingHtml=fs.readFileSync(path.join(root,'staging/member.html'),'utf8');
test('public and STAGING load identical final warm design stylesheet after old layers',()=>{
  for(const html of [publicHtml,stagingHtml]){
    const old=html.indexOf('portfolio-adaptation.css');
    const refreshed=html.indexOf('home-v5.css');
    assert.ok(old>=0&&refreshed>old,'last stylesheet must override legacy blue styles');
    assert.match(html,/fonts\.googleapis\.com\/css2\?family=Inter/);
  }
});
test('homepage uses a CSS 3D ring stage and no illustrated 2D mascots',()=>{
  assert.match(app,/class="pf-ring-stage pf-logo-stage"/);
  assert.match(app,/class="pf-ring pf-ring-outer"/);
  assert.match(app,/class="pf-ring pf-ring-mid"/);
  assert.match(app,/class="pf-ring pf-ring-inner"/);
  assert.match(app,/pf-logo-stage/);
  assert.match(app,/class="nh-home nh-home-minimal"/);
  assert.match(app,/data-route="katalog"/);
  assert.doesNotMatch(app,/class="pf-product-orbit"/);
  assert.doesNotMatch(app,/class="nh-grid"/);
  assert.doesNotMatch(app,/class="nh-rail"/);
  assert.doesNotMatch(app,/class="ngd-token-market"/);
  assert.match(css,/rotateX\(67deg\)/);
  assert.match(css,/@keyframes ngdRingOrbitOuter/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('new color tokens are warm neutral and not ink-blue',()=>{
  assert.match(css,/--ngd-canvas:#faf8f3/);
  assert.match(css,/--pf-blue:#b65c39/);
  assert.match(css,/--pf-heading:"Inter"/);
  assert.doesNotMatch(css,/#2F6BFF|#4361ee|#0e1320/i);
});
test('design remains presentation-only and does not replace payment or auth handlers',()=>{
  assert.match(app,/async function confirmPayment\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
  assert.match(app,/function viewHome\(\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.doesNotMatch(css,/display:none!important/);
});

test('responsive homepage keeps logo first on phones and split columns on desktop',()=>{
  assert.match(css,/@media\s*\(min-width:\s*901px\)/);
  assert.match(css,/grid-template-areas:"copy logo"/);
  assert.match(css,/> \.public-hero-copy\{\s*grid-area:copy/);
  assert.match(css,/> \.pf-logo-stage\{\s*grid-area:logo/);
  assert.match(css,/@media\s*\(max-width:\s*900px\)/);
  assert.match(css,/> \.pf-logo-stage\{[\s\S]*?order:-1/);
  assert.match(css,/> \.public-hero-copy\{[\s\S]*?order:1/);
  assert.match(publicHtml,/home-v5\.css\?v=20261117-desktop-grid-v8/);
  assert.match(stagingHtml,/home-v5\.css\?v=20261117-desktop-grid-v8/);
});

test('desktop grid specifically overrides legacy home flex cascade and constrains rings',()=>{
  assert.match(css,/\.nh-home\.nh-home-minimal > \.public-editorial-hero\.pf-portfolio-hero\.pf-home-minimal\{\s*display:grid/);
  assert.match(css,/grid-template-columns:minmax\(0, 1fr\) minmax\(0, \.88fr\)/);
  assert.match(css,/grid-template-areas:"copy logo"/);
  assert.match(css,/column-gap:clamp\(32px,4\.5vw,76px\)/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/\.nh-home\.nh-home-minimal > \.pf-home-minimal > \.pf-logo-stage\{\s*grid-area:logo/);
});

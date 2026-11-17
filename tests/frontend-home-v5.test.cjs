'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/home-v5.css'),'utf8');
const journey=fs.readFileSync(path.join(root,'assets/learning-journey.css'),'utf8');
const publicHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const stagingHtml=fs.readFileSync(path.join(root,'staging/member.html'),'utf8');

test('public and STAGING load matching design and isometric motion after old CSS layers',()=>{
  for(const html of [publicHtml,stagingHtml]){
    assert.ok(html.indexOf('home-v5.css')>html.indexOf('portfolio-adaptation.css'));
    assert.ok(html.indexOf('learning-journey.css')>html.indexOf('home-v5.css'));
    assert.match(html,/family=Inter/);
    assert.match(html,/learning-journey\.css\?v=20261117-isometric-v2/);
  }
});
test('homepage has semantic isometric 3D stair illustration and real animated ball',()=>{
  assert.match(app,/class="ngd-journey-stage"/);
  assert.match(app,/class="ngd-journey-art"/);
  assert.match(app,/class="ngd-journey-stairs"/);
  assert.match(app,/class="ngd-journey-ball"/);
  assert.match(app,/Array\.from\(\{length:5\}/);
  assert.match(app,/radialGradient id="ngd-ball-shade"/);
  assert.match(app,/linearGradient id="ngd-step-front"/);
  assert.match(app,/class="ngd-journey-front"/);
  assert.match(app,/class="ngd-journey-side"/);
  assert.match(app,/class="ngd-journey-top"/);
  assert.match(journey,/@keyframes ngdBallAscend/);
  assert.match(journey,/@keyframes ngdStairLight/);
  assert.match(journey,/animation:ngdBallAscend/);
  assert.match(journey,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(app,/class="ngd-climb-stage"|class="pf-ring-stage"/);
});
test('no merchandising clutter on public homepage; catalog and login stay accessible',()=>{
  assert.match(app,/class="nh-home nh-home-minimal"/);
  assert.match(app,/data-route="katalog"/);
  assert.match(app,/data-route="daftar"/);
  assert.doesNotMatch(app,/class="nh-grid"|class="nh-rail"|class="ngd-token-market"/);
});
test('responsive desktop split respects legacy specificity and phone illustration first',()=>{
  assert.match(journey,/@media\(min-width:901px\)/);
  assert.match(journey,/\.nh-home\.nh-home-minimal > \.public-editorial-hero\.pf-portfolio-hero\.pf-home-minimal\{\s*display:grid/);
  assert.match(journey,/grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,\.95fr\)/);
  assert.match(journey,/grid-template-areas:"copy logo"/);
  assert.match(journey,/> \.ngd-journey-stage\{\s*grid-area:logo/);
  assert.match(journey,/@media\(max-width:900px\)/);
  assert.match(journey,/> \.ngd-journey-stage\{\s*order:-1/);
  assert.match(journey,/\.public-hero-copy h1\{[\s\S]*?max-width:16ch/);
});
test('presentation-only changes preserve payment, authentication and warm typography',()=>{
  assert.match(app,/async function confirmPayment\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(css,/--ngd-canvas:#faf8f3/);
  assert.match(css,/--pf-heading:"Inter"/);
  assert.doesNotMatch(journey,/#2F6BFF|#4361ee|#0e1320/i);
});

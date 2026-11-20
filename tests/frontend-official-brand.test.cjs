'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=pathInRepo=>fs.readFileSync(path.join(root,pathInRepo),'utf8');
const logo=read('assets/ngulik-digital-brand.svg');
const css=read('assets/brand-official.css');
const app=read('js/app.js');
const publicHtml=read('index.html');
const stagingHtml=read('staging/member.html');

test('official identity preserves owner logo colors and three distinct elements',()=>{
  assert.match(logo,/viewBox="215 225 625 625"/);
  assert.match(logo,/#0f4d5c/i);
  assert.match(logo,/#fff9ed/i);
  assert.match(logo,/#ffb727/i);
  assert.match(logo,/kaca pembesar/i);
  assert.equal((logo.match(/<path /g)||[]).length,2);
});
test('public and STAGING use identical branded favicon and correct relative source paths',()=>{
  assert.match(publicHtml,/href="\.\/assets\/ngulik-digital-brand\.svg\?v=20261117-official-logo-v1"/);
  assert.match(stagingHtml,/href="\.\.\/assets\/ngulik-digital-brand\.svg\?v=20261117-official-logo-v1"/);
  for(const html of [publicHtml,stagingHtml]){
    assert.match(html,/id="brand-mark"[^>]*><img class="ngd-brand-image"/);
    assert.match(html,/guest-brand-icon"[^>]*><img class="ngd-brand-image"/);
    assert.match(html,/assets\/brand-official\.css\?v=20261117-logo-v1/);
    assert.match(html,/js\/app\.js\?v=20261120-ui-copy-v1/);
    assert.ok(html.indexOf('brand-official.css')>html.indexOf('affiliate-partner.css'));
    assert.doesNotMatch(html,/guest-brand-icon"[^>]*>n\./);
  }
});
test('all dynamic brand placements use same canonical official image',()=>{
  assert.match(app,/const defaultBrandLogoSrc=document\.querySelector\?\.\('link\[rel="icon"\]'\)\?\.href\|\|''/);
  assert.match(app,/by\('brand-mark'\)/);
  assert.match(app,/class="ngd-floating-logo"[^>]*><img class="ngd-brand-image"/);
  assert.match(app,/class="partner-art-mark"><img class="ngd-brand-image"/);
  assert.match(app,/class="market-hero-symbol"[^>]*><img class="ngd-brand-image"/);
  assert.doesNotMatch(app,/class="ngd-floating-logo"[^>]*><span>n\./);
});
test('brand remains readable and responsive without disturbing membership',()=>{
  assert.match(css,/\.brand-mark\{/);
  assert.match(css,/\.guest-brand-icon\{/);
  assert.match(css,/\.ngd-floating-logo\{/);
  assert.match(css,/\.partner-hero-art \.partner-art-mark\{/);
  assert.match(css,/\.market-hero-symbol\{/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
});

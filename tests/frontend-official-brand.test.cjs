'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=pathInRepo=>fs.readFileSync(path.join(root,pathInRepo),'utf8');
const logo=read('assets/ngulik-digital-brand.svg');
const css=read('assets/brand-experience-v10.css');
const app=read('js/app.js');
const publicHtml=read('index.html');
const stagingHtml=read('staging/member.html');

test('owner icon is now a compact transparent gradient asset in three resolutions',()=>{
  for(const size of [64,192,512]){
    const bytes=fs.readFileSync(path.join(root,'assets/ngd-icon-v10-'+size+'.png'));
    assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',String(size));
    assert.ok(bytes.length>2500&&bytes.length<150000,String(size));
  }
  assert.match(css,/background:transparent!important/);
  assert.match(css,/\.guest-brand strong/);
  // Keep the original owner-provided SVG as historical reference, not as active branding.
  assert.match(logo,/kaca pembesar/i);
});
test('public and STAGING use identical branded favicon and correct relative source paths',()=>{
  assert.match(publicHtml,/href="\.\/assets\/ngd-icon-v10-64\.png\?v=20261121-v10-1"/);
  assert.match(stagingHtml,/href="\.\.\/assets\/ngd-icon-v10-64\.png\?v=20261121-v10-1"/);
  for(const html of [publicHtml,stagingHtml]){
    assert.match(html,/id="brand-mark"[^>]*><img class="ngd-brand-image"/);
    assert.match(html,/guest-brand-icon"[^>]*><img class="ngd-brand-image"/);
    assert.match(html,/assets\/brand-experience-v10\.css\?v=20261121-quiet-home-v14-1/);
    // The STAGING app cache key advances separately for Scalev checks.
    assert.ok(html.indexOf('brand-official.css')>html.indexOf('affiliate-partner.css'));
    assert.doesNotMatch(html,/guest-brand-icon"[^>]*>n\./);
  }
  assert.match(publicHtml,/js\/app\.js\?v=20261121-member-portal39-1/);
  assert.match(stagingHtml,/js\/app\.js\?v=20261121-member-portal39-1/);
});
test('all dynamic brand placements use same canonical official image',()=>{
  assert.match(app,/const defaultBrandLogoSrc=document\.querySelector\?\.\('\.guest-brand-icon \.ngd-brand-image'\)/);
  assert.match(app,/by\('brand-mark'\)/);
  assert.match(app,/class="ngdl-hero"|ngdl-hero/);
  assert.doesNotMatch(app.slice(app.indexOf('  \/\/ Public front door:'),app.indexOf('const offerCategories=')),/ngd-floating-logo|ngd-home-artwork/);
  // The compact commission page intentionally removed its decorative logo art.
  assert.match(app,/function viewAffiliate\(\)/);
  assert.doesNotMatch(app.slice(app.indexOf('function viewAffiliate(){'),app.indexOf('function viewNotificationCenter(){')),/partner-art-mark/);
  // Katalog intentionally uses dedicated art instead of a duplicate official logo overlay.
  assert.match(app,/ngd-catalog-campaign/);
  assert.doesNotMatch(app,/class="ngd-floating-logo"[^>]*><span>n\./);
});
test('brand remains readable and responsive without disturbing membership',()=>{
  assert.match(css,/\.brand-mark\{/);
  assert.match(css,/\.guest-brand-icon\{/);
  assert.match(css,/\.ngd-floating-logo\{/);
  assert.match(css,/\.ngd-auth-brand/);
  assert.match(css,/background:transparent!important/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
});

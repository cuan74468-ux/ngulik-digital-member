'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const app=read('js/app.js'),cms=read('js/content-ui.js'),css=read('assets/marketplace-public.css');
const publicHtml=read('index.html'),stagingHtml=read('staging/member.html');

test('guest marketplace uses existing catalog, not fictitious product prices or ratings',()=>{
  assert.match(app,/function viewPublicMarketplace\(list\)/);
  assert.match(app,/if\(!logged\(\)\)return viewPublicMarketplace\(list\);/);
  assert.match(app,/window\.NGD_CONTENT_UI\?\.media\(state\.siteContent,'PRODUCT_IMAGE',p\.product_id/);
  assert.match(app,/rupiah\(p\.harga\)/);
  assert.match(app,/esc\(p\.nama\)/);
  assert.match(app,/supportedSaleTypes\.has\(String\(p\.tipe\)\)/);
  assert.match(app,/config\.paymentsEnabled===true/);
  assert.match(app,/consultationUrl\(p\)/);
  assert.doesNotMatch(app.slice(app.indexOf('function viewPublicMarketplace'),app.indexOf('function viewCatalog')),/4\.9|terjual|50% OFF|diskon palsu/i);
});
test('CMS published banner is scoped to catalog and can be configured by admin',()=>{
  assert.match(app,/hero\(state\.siteContent,'catalog'\)/);
  assert.match(cms,/function hero\(contents,placement='home'\)/);
  assert.match(cms,/published\(contents,'HERO',target\)/);
  assert.match(cms,/\['HERO','catalog','Banner promosi marketplace publik'\]/);
  assert.match(cms,/mediaPath\(x\.image_path\)/);
});
test('public marketplace search, category, sorting and reset are actually wired',()=>{
  for(const id of ['market-search','market-sort','data-market-reset','data-catalog-filter']){
    assert.ok(app.includes(id),id+' control is required');
  }
  assert.match(app,/state\.marketplaceSearch=e\.target\.value/);
  assert.match(app,/state\.marketplaceSort=selected;render\(\)/);
  assert.match(app,/state\.catalogFilter='semua';state\.marketplaceSort='default'/);
  assert.match(app,/sort==='price-asc'/);
  assert.match(app,/sort==='price-desc'/);
});
test('mobile-first two-column grid and desktop five-column cards are isolated to guests',()=>{
  assert.match(css,/body\.ngd-public-app\[data-app-role=guest\]/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/aspect-ratio:1\/1/);
  assert.match(css,/\.market-product-action:disabled/);
});
test('both public and staging invalidate cache for new marketplace sources',()=>{
  for(const html of [publicHtml,stagingHtml]){
    assert.match(html,/marketplace-public\.css\?v=20261120-marketplace-retail-v2/);
    assert.match(html,/content-ui\.js\?v=20261120-marketplace-retail-v3/);
    // STAGING-only checkout must not require changing public script cache keys.
    assert.ok(html.indexOf('marketplace-public.css')>html.indexOf('portfolio-adaptation.css'));
  }
  assert.match(publicHtml,/app\.js\?v=20261120-marketplace-retail-v5/);
  assert.match(stagingHtml,/app\.js\?v=20261120-scalev-hosted-v1/);
});
test('existing member route and real commerce backend remain in place',()=>{
  assert.match(app,/function viewCatalog\(\)/);
  assert.match(app,/async function confirmPayment\(\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
});

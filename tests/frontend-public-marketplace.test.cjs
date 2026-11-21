'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const app=read('js/app.js'),cms=read('js/content-ui.js'),css=read('assets/marketplace-public.css');
const publicHtml=read('index.html'),stagingHtml=read('staging/member.html');

test('guest and member use the same truthful product data and internal checkout',()=>{
  assert.match(app,/function viewPublicMarketplace\(list\)/);
  assert.match(app,/const storefront=viewPublicMarketplace\(list,\{showCampaign:!logged\(\)&&!isAdmin\(\),memberMode:logged\(\)&&!isAdmin\(\)\}\)/);
  assert.match(app,/window\.NGD_CONTENT_UI\?\.media\(state\.siteContent,'PRODUCT_IMAGE',p\.product_id/);
  assert.match(app,/rupiah\(p\.harga\)/);
  assert.match(app,/esc\(offerUiTitle_\(p\)\)/);
  assert.match(app,/data-checkout-product/);
  assert.match(app,/supportedSaleTypes\.has\(String\(p\.tipe\)\)/);
  assert.match(app,/config\.qrisOwnerImageApproved===true/);
  assert.doesNotMatch(app.slice(app.indexOf('function viewPublicMarketplace'),app.indexOf('function viewCatalog')),/4\.9|terjual|50% OFF|diskon palsu|Tanya via WhatsApp/i);
});
test('CMS published banner is scoped to catalog and can be configured by admin',()=>{
  assert.match(app,/catalogBanner\(state\.siteContent\)/);
  assert.match(cms,/function catalogBanner\(contents\)/);
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
test('mobile-first two-column cards and restrained desktop grid apply to guest and member',()=>{
  const newer=read('assets/catalog-experience-v3.css');
  assert.match(newer,/\.market-product-grid/);
  assert.match(newer,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(newer,/@media \(max-width:640px\)/);
  assert.match(newer,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(newer,/\.market-product-action:disabled/);
  assert.match(newer,/prefers-reduced-motion/);
  assert.match(css,/\.market-product-grid/);
});
test('published entrypoints both load current marketplace and checkout sources in safe order',()=>{
  for(const html of [publicHtml,stagingHtml]){
    assert.match(html,/marketplace-public\.css\?v=20261120-marketplace-retail-v2/);
    assert.match(html,/content-ui\.js\?v=20261121-catalog-v9-2/);
    assert.match(html,/catalog-experience-v3\.css/);
    assert.match(html,/checkout-qris-unified\.css/);
    assert.match(html,/app\.js\?v=20261121-proportions-v13-1/);
    assert.ok(html.indexOf('checkout-qris-unified.css')>html.indexOf('catalog-experience-v3.css'));
  }
});
test('existing member route and real commerce backend remain in place',()=>{
  assert.match(app,/function viewCatalog\(\)/);
  assert.match(app,/async function confirmPayment\(\)/);
  assert.match(app,/function viewCheckout\(\)/);
  assert.match(app,/function viewAdminOrders\(\)/);
});

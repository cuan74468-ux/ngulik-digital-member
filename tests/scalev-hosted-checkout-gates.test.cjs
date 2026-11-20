'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const window={};
vm.runInNewContext(read('js/scalev-bridge.js'),{window,URL},{timeout:1500});
const bridge=window.NGD_SCALEV_BRIDGE;
const sku='P-VIDEO-AI';
const product={product_id:sku,harga:'Rp50.000',tipe:'JASA_SEKALI',aktif:true};
const entry={checkout_url:'https://merchant.scalev.id/p/jasa-video',
  verified_host:'merchant.scalev.id',price:50000,status:'READY',
  source:'SCALEV_DASHBOARD_VERIFIED',commission_owner:'NGD',
  scalev_affiliate:'OFF',plan:'FREE',merchant_name:'Linggau AI Studio',
  e_payment_status:'ACTIVE',owner_release:'STAGING_APPROVED'};
test('all four owner draft SKU/amount/type contracts are enumerated without paid activation',()=>{
  assert.deepEqual(Object.keys(bridge.products),['P-VIDEO-AI','P-3IN1','P-POS','P-INTEGRASI-GAS']);
  assert.equal(bridge.products['P-3IN1'].price,99000);
  assert.equal(bridge.products['P-POS'].price,149000);
  assert.equal(bridge.products['P-INTEGRASI-GAS'].price,400000);
  assert.ok(read('staging/scalev-checkout-map.js').includes('Object.freeze({})'));
});
test('a verified, exact-amount merchant checkout is eligible for STAGING UI routing',()=>{
  const result=bridge.checkout(product,{[sku]:entry});
  assert.equal(result.url,entry.checkout_url);
  assert.equal(result.commission_owner,'NGD');
});
test('no link or unofficial/unknown SKU always fails closed',()=>{
  assert.equal(bridge.checkout(product,{}),null);
  assert.equal(bridge.checkout({...product,product_id:'P-TOKEN-10'}, {[sku]:entry}),null);
});
test('wrong price, inactive product and mismatched type reject before checkout',()=>{
  for(const variant of [
    {...product,harga:50001},{...product,harga:'Rp50.500'},
    {...product,aktif:false},{...product,tipe:'LISENSI_SEKALI'}])
    assert.equal(bridge.checkout(variant,{[sku]:entry}),null);
  assert.equal(bridge.checkout(product,{[sku]:{...entry,price:50001}}),null);
});
test('no unreviewed or invalid merchant link can become a checkout',()=>{
  for(const override of [
    {status:'PENDING'},{source:'UNVERIFIED'},{checkout_url:''},
    {e_payment_status:'PENDING'},{owner_release:'UNAPPROVED'},
    {merchant_name:'Other Store'},
    {checkout_url:'http://merchant.scalev.id/p/jasa-video'},
    {checkout_url:'https://merchant.scalev.id.evil.example/p/jasa-video'},
    {checkout_url:'https://username@merchant.scalev.id/p/jasa-video'},
    {checkout_url:'https://merchant.scalev.id:8443/p/jasa-video'},
    {checkout_url:'https://merchant.scalev.id/dashboard'},
    {checkout_url:'https://other.scalev.id/p/jasa-video'},
    {checkout_url:'https://merchant.scalev.id/p/jasa-video#paid'},
    {verified_host:'merchant.evil.example'}
  ])assert.equal(bridge.checkout(product,{[sku]:{...entry,...override}}),null,
    JSON.stringify(override));
});
test('anti-double-booking: Scalev affiliate and NGD commission cannot both be enabled',()=>{
  for(const override of [
    {scalev_affiliate:'ON'},{commission_owner:'SCALEV'},
    {plan:'BASIC'}
  ])assert.equal(bridge.checkout(product,{[sku]:{...entry,...override}}),null);
});
test('provider payment evidence is always only a manual reconciliation candidate',()=>{
  const evidence={sku,scalev_order_id:'SVL-TEST-123',gross_amount:50000,
    status:'PAID',commission_owner:'NGD'};
  const review=bridge.previewEvidence(evidence,product,[]);
  assert.equal(review.state,'MANUAL_RECONCILIATION_REQUIRED');
  assert.deepEqual([...review.issues],[]);
});
test('fake success, duplicate order and wrong money stay HOLD without posting',()=>{
  const evidence={sku,scalev_order_id:'SVL-TEST-123',gross_amount:50000,
    status:'PAID',commission_owner:'NGD'};
  for(const e of [
    {...evidence,status:'PENDING'},
    {...evidence,gross_amount:49999},
    {...evidence,commission_owner:'SCALEV'},
    {...evidence,scalev_order_id:''}
  ])assert.equal(bridge.previewEvidence(e,product,[]).state,'HOLD');
  const dup=bridge.previewEvidence(evidence,product,['SVL-TEST-123']);
  assert.ok(dup.issues.includes('DUPLICATE_ORDER'));
});
test('staging-only checkout wiring cannot silently leak to production storefront',()=>{
  const staging=read('staging/member.html'),publicPage=read('index.html'),app=read('js/app.js');
  assert.match(staging,/\.\.\/js\/scalev-bridge\.js/);
  assert.match(staging,/\.\/scalev-checkout-map\.js/);
  assert.doesNotMatch(publicPage,/scalev-bridge\.js|scalev-checkout-map\.js/);
  assert.match(app,/config\.apiUrl!==window\.NGD_STAGING_CONFIG\.apiUrl/);
  assert.match(app,/scalevCheckoutFor_\(p\)/);
  assert.match(app,/Bayar via Scalev/);
});

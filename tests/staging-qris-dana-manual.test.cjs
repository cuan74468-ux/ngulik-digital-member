'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=source('js/app.js'),gas=source('apps-script/Code.gs');
const stage=source('staging/member-config.js'),publicConfig=source('config.js');
const stagingHtml=source('staging/member.html');

test('owner-approved QRIS configuration points to dedicated image, but fail-closed until asset verified',()=>{
  for(const cfg of [stage,publicConfig]){
    assert.match(cfg,/qris-linggau-ai-studio\.jpg/);
    assert.match(cfg,/qrisMerchant:\s*['"]Linggau AI Studio['"]/);
    assert.match(cfg,/qrisOwnerImageApproved:\s*false/);
  }
  // Do NOT mark this image payment-ready if a GitHub upload has not been verified.
});

test('Mayar and Scalev catalog/checkout are parked',()=>{
  assert.match(app,/function mayarCheckoutEligible_\(\)\{[\s\S]*?return false;/);
  assert.match(app,/function scalevCheckoutFor_\(\)\{return null;/);
  assert.doesNotMatch(stagingHtml,/<script[^>]+scalev-bridge/);
  assert.doesNotMatch(stagingHtml,/<script[^>]+scalev-checkout-map/);
});

test('checkout amount uniqueness, three digits and real-funds review remain backend authoritative',()=>{
  assert.match(gas,/min>=100&&max<=999/);
  assert.match(gas,/taken\[price\+n\]/);
  assert.match(gas,/status:'PENDING',metode:'QRIS_STATIS'/);
  assert.match(gas,/p\.dana_diterima===true/);
  assert.match(gas,/received===exact/);
  assert.match(gas,/TRANSFER_EWALLET/);
  assert.match(gas,/referensi_pembayaran/);
});

test('QRIS checkout provides download/zoom and blocks unverified image',()=>{
  assert.match(app,/Simpan gambar QRIS/);
  assert.match(app,/Perbesar QRIS/);
  assert.match(app,/qrisOwnerImageApproved!==true/);
  assert.match(app,/QRIS resmi belum diverifikasi/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&\(officialQr\|\|!!paymentLink\)/);
});

test('manual payment confirmation and admin approval do not equate buyer claims with paid status',()=>{
  assert.match(app,/api\('confirmPayment'/);
  assert.match(app,/data-payment-open/);
  assert.match(app,/api\('adminVerifyOrder'/);
  assert.match(app,/Gunakan formulir Periksa dana/);
  assert.match(gas,/to='MENUNGGU_VERIFIKASI'/);
  assert.match(gas,/to='PAID'/);
  assert.match(gas,/onPaid_\(o,m\)/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),gas=read('apps-script/Code.gs');
const staging=read('staging/member.html'),publicHtml=read('index.html');
test('Mayar buyer checkout is retired; only QRIS STATIS internal orders are created',()=>{
  const buyer=app.slice(app.indexOf('async function buy(productId)'),app.indexOf('async function openOrderDetail_'));
  assert.match(buyer,/api\('createOrder',\{product_id:productId\}/);
  assert.doesNotMatch(buyer,/createMayarOrder|scalev-bridge|wa\.me/);
  assert.match(gas,/MAYAR_PAYOUT_CONFIRMED/); // historical source-only guard
  assert.doesNotMatch(staging,/js\/scalev-bridge\.js/);
});
test('Mayar financial actions are gated in GAS and never auto-enabled by public UI',()=>{
  assert.match(gas,/case 'createMayarOrder':return createMayarOrder_/);
  assert.match(gas,/\['createOrder','createMayarOrder','confirmPayment'/);
  assert.match(gas,/MAYAR_PAYOUT_CONFIRMED/);
  assert.match(gas,/mayar_checkout_ready:mutationsEnabled_\(\)&&financeEnabled_\(\)/);
  assert.match(gas,/function ngdStagingWorkspaceInfo_\(/);
});
test('public checkout does not expose Mayar secrets or invoke external invoices',()=>{
  assert.doesNotMatch(publicHtml,/MAYAR_API_KEY|createMayarOrder|MAYAR_WEBHOOK_SECRET/);
  assert.doesNotMatch(staging,/MAYAR_API_KEY|MAYAR_WEBHOOK_SECRET/);
  assert.doesNotMatch(app,/sk_live_|MAYAR_API_KEY|MAYAR_WEBHOOK_SECRET/);
  assert.match(app,/const order=await api\('createOrder'/);
});
test('only the approved QRIS image is displayed and browser claim cannot set paid',()=>{
  const checkout=app.slice(app.indexOf('function viewCheckout(){'),app.indexOf('function viewAdminRuntime(){'));
  assert.match(checkout,/const officialQr=/);
  assert.match(checkout,/config\.qrisOwnerImageApproved===true/);
  assert.doesNotMatch(checkout,/Buka pembayaran resmi|gateway_payment_url|wa\.me/);
  assert.match(app,/api\('confirmPayment'/);
  assert.match(gas,/var o=\{\};fields\.forEach/);
  assert.match(gas,/function requireFinanceEnabled_\(\)/);
});

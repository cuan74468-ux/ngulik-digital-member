'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),gas=read('apps-script/Code.gs');
const staging=read('staging/member.html'),publicHtml=read('index.html');
test('Mayar buyer checkout is retired; source-only backend route remains gated',()=>{
  assert.match(app,/function mayarCheckoutEligible_\(\)\{[\s\S]*?return false;/);
  assert.match(app,/mayar\?'createMayarOrder':'createOrder'/);
  assert.match(gas,/MAYAR_PAYOUT_CONFIRMED/);
  assert.doesNotMatch(staging,/js\/scalev-bridge\.js/);
});
test('Mayar financial actions are gated in GAS and never auto-enabled by public UI',()=>{
  assert.match(gas,/case 'createMayarOrder':return createMayarOrder_/);
  assert.match(gas,/\['createOrder','createMayarOrder','confirmPayment'/);
  assert.match(gas,/MAYAR_PAYOUT_CONFIRMED/);
  assert.match(gas,/mayar_checkout_ready:mutationsEnabled_\(\)&&financeEnabled_\(\)/);
  assert.match(gas,/function ngdStagingWorkspaceInfo_\(/);
});
test('Mayar checkout invoice never changes public HTML or embeds provider secrets',()=>{
  assert.doesNotMatch(publicHtml,/MAYAR_API_KEY|createMayarOrder|MAYAR_WEBHOOK_SECRET/);
  assert.doesNotMatch(staging,/MAYAR_API_KEY|MAYAR_WEBHOOK_SECRET/);
  assert.doesNotMatch(app,/sk_live_|MAYAR_API_KEY|MAYAR_WEBHOOK_SECRET/);
  assert.match(app,/const order=await api\(mayar\?'createMayarOrder':'createOrder'/);
});
test('checkout already displays safe backend payment URL and does not infer paid on redirect',()=>{
  assert.match(app,/const paymentLink=/);
  assert.match(app,/o\.gateway_payment_url/);
  assert.match(app,/Buka pembayaran resmi/);
  assert.match(gas,/var o=\{\};fields\.forEach/);
  assert.match(gas,/o\.gateway_payment_url=ngdMayarInvoiceUrl_\(order\.gateway_payment_url\)/);
});

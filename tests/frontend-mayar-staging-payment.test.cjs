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
  assert.match(gas,/mayar_checkout_ready:false/);
  assert.doesNotMatch(staging,/js\/scalev-bridge\.js/);
});
test('Mayar financial actions are gated in GAS and never auto-enabled by public UI',()=>{
  assert.match(gas,/case 'createMayarOrder':throw ngdError_\('NOT_AVAILABLE'/);
  assert.match(gas,/\['createOrder','createMayarOrder','confirmPayment'/);
  assert.match(gas,/WEBHOOK_RETIRED/);
  assert.match(gas,/mayar_checkout_ready:false/);
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

test('cancelled provider webhook is rejected before properties, sheet or external API access',()=>{
  const vm=require('node:vm');
  let touched=0;
  const forbidden=new Proxy({}, {get(){touched++;throw Error('UNEXPECTED_BACKEND_IO');}});
  const c=vm.createContext({console:{error(){}},PropertiesService:forbidden,
    SpreadsheetApp:forbidden,UrlFetchApp:forbidden,LockService:forbidden,
    ContentService:{MimeType:{JSON:'json'},createTextOutput(value){
      return {getContent(){return value;},setMimeType(){return this;}};
    }}});
  vm.runInContext(gas,c,{timeout:10000});
  const answer=JSON.parse(c.doPost({parameter:{source:'mayar'},
    postData:{contents:'INVALID_DO_NOT_PARSE'}}).getContent());
  assert.equal(answer.ok,false);
  assert.equal(answer.error.code,'WEBHOOK_RETIRED');
  assert.equal(touched,0);
});
test('historical Mayar order display remains supported without new checkout',()=>{
  assert.match(gas,/function orderView_\(/);
  assert.match(gas,/ngdMayarInvoiceUrl_\(order\.gateway_payment_url\)/);
  assert.match(gas,/mayar_checkout_ready:false/);
});

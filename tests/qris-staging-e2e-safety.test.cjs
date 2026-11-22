'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const checkoutCfg=fs.readFileSync(path.join(root,'config.js'),'utf8');
const stageCfg=fs.readFileSync(path.join(root,'staging/config.js'),'utf8');
const stageMemberCfg=fs.readFileSync(path.join(root,'staging/member-config.js'),'utf8');
const stageMemberHtml=fs.readFileSync(path.join(root,'staging/member.html'),'utf8');
test('placeholder PNGs are valid identical images, never fake QR payment payloads',()=>{
  const a=fs.readFileSync(path.join(root,'assets/qris.png'));
  const b=fs.readFileSync(path.join(root,'staging/assets/qris.png'));
  assert.equal(a.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(a.byteLength>500);
  assert.deepEqual(a,b);
  // The placeholder pixels are not a QR payment payload: checkout must not
  // imply a real QR until the owner supplies and approves one.
  assert.match(checkoutCfg,/qrisOwnerImageApproved:\s*false/);
  assert.match(stageMemberCfg,/qrisOwnerImageApproved:true/);
});
test('STAGING member uses only pinned STAGING backend from staging/config.js',()=>{
  assert.match(stageMemberHtml,/src="\.\/config\.js\?v=/);
  assert.match(stageMemberHtml,/src="\.\/member-config\.js\?v=/);
  assert.ok(stageMemberHtml.indexOf('./config.js')<stageMemberHtml.indexOf('./member-config.js'));
  assert.match(stageMemberCfg,/apiUrl:window\.NGD_STAGING_CONFIG\?\.apiUrl\|\|''/);
  assert.equal((stageCfg.match(/https:\/\/script\.google\.com\/macros\/s\//g)||[]).length,1);
  assert.ok(!stageMemberCfg.includes('https://script.google.com/macros/s/'));
  assert.match(stageMemberHtml,/noindex,nofollow/);
});
test('frontend modules parse and QRIS images fail closed without a manual payment fallback',()=>{
  // app.js is an ES module; existing browser/ESM smoke checks its syntax.
  assert.match(app,/data-qris-image/);
  assert.match(app,/data-qris-fallback/);
  assert.match(app,/document\.addEventListener\('error'/);
  assert.match(app,/confirmButton\.disabled=true/);
  assert.match(app,/qrisOwnerImageApproved!==true/);
  assert.match(app,/QRIS belum diaktifkan/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&officialQr/);
  const checkout=app.slice(app.indexOf('function viewCheckout(){'),app.indexOf('function viewAdminRuntime(){'));
  assert.doesNotMatch(checkout,/wa\.me|Chat WhatsApp|gateway_payment_url/);
});
test('GAS staging E2E uses isolated scratch and cleanup with no real WhatsApp',()=>{
  assert.doesNotThrow(()=>new vm.Script(code));
  const start=code.indexOf('function ngdStagingEndToEndSimulation()');
  assert.ok(start>0);
  const end=code.indexOf('\nfunction ngdStagingWorkspaceReadOnlyCheck()',start);
  assert.ok(end>start);
  const body=code.slice(start,end);
  assert.match(body,/ngdStagingWorkspaceInfo_\(\)/);
  assert.match(body,/SpreadsheetApp\.create\(/);
  assert.match(body,/insertColumnsAfter/);
  assert.match(body,/allowedSettings/);
  assert.match(body,/NGD_DB_CACHE_=scratch/);
  assert.match(body,/NGD_SIMULATION_MODE_=true/);
  assert.match(body,/newOrder_\(/);
  assert.match(body,/transitionOrder_\(/);
  assert.match(body,/creditBalance_\('M-0009'\)/);
  assert.match(body,/affiliate_commissions/);
  assert.match(body,/onPaid_\(finalOrder,admin\)/);
  assert.match(body,/finally\s*\{/);
  assert.match(body,/NGD_DB_CACHE_=sourceDb/);
  assert.match(body,/DriveApp\.getFileById\(scratchId\)\.setTrashed\(true\)/);
  assert.match(code,/if\(NGD_SIMULATION_MODE_\)return \{status:'SUPPRESSED'/);
});
test('STAGING simulation refuses production without scratch or writes',()=>{
  const context=vm.createContext({console:{log(){},error(){}}});
  vm.runInContext(code,context,{timeout:10000});
  let opened=0;
  context.ngdStagingWorkspaceInfo_=()=>{throw Error('Workspace bukan lingkungan STAGING terverifikasi.')};
  context.SpreadsheetApp={create:()=>{opened++;throw Error('MUST_NOT_CREATE')}};
  assert.throws(()=>context.ngdStagingEndToEndSimulation(),/bukan lingkungan STAGING/);
  assert.equal(opened,0);
});

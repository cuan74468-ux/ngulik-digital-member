'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const staging=fs.readFileSync(path.join(__dirname,'../staging/member-config.js'),'utf8');
function fixture(options={}){
  const telemetry={acquired:0,released:0,sheetMutations:0,httpCalls:0,logs:[]};
  const props={
    getProperty(key){if(key==='NGD_MUTATIONS_ENABLED'||key==='NGD_FINANCE_ENABLED')return 'false';
      return '';},
  };
  const ctx={
    PropertiesService:{getScriptProperties:()=>props},
    LockService:{getScriptLock:()=>({
      waitLock(ms){assert.equal(ms,30000);telemetry.acquired++;},
      releaseLock(){telemetry.released++;}
    })},
    SpreadsheetApp:{openById:()=>{throw new Error('Unexpected sheet access');}},
    UrlFetchApp:{fetch:()=>{telemetry.httpCalls++;throw new Error('HTTP prohibited');}},
    console:{log:(...args)=>telemetry.logs.push(args.join(' ')),error:()=>{}}
  };
  vm.createContext(ctx);
  vm.runInContext(code,ctx,{filename:'Code.gs'});
  ctx.ngdStagingWorkspaceInfo_=()=>({environment:options.environment||'STAGING'});
  ctx.byId_=()=>options.monitorMissing?null:{member_id:'M-0009'};
  ctx.creditBalance_=()=>options.monitorBalance??25;
  ctx.appendRow_=()=>{telemetry.sheetMutations++;throw new Error('Unexpected sheet insert');};
  ctx.updateRow_=()=>{telemetry.sheetMutations++;throw new Error('Unexpected sheet update');};
  ctx.grantCredits_=()=>{telemetry.sheetMutations++;throw new Error('Unexpected actual credit posting');};
  ctx.logAudit_=()=>{telemetry.sheetMutations++;throw new Error('Unexpected audit write');};
  return {ctx,telemetry};
}
test('synthetic tester passes using actual script lock and shared idempotency rules without writes/providers',()=>{
  const {ctx,telemetry}=fixture();
  const result=ctx.ngdTestCreditLedgerAndIdempotency();
  assert.equal(result.status,'PASS');
  assert.equal(result.environment,'STAGING');
  assert.equal(result.monitor_member_found,true);
  assert.equal(result.monitor_balance_unchanged,true);
  assert.ok(result.checks>=11);
  assert.equal(result.provider_calls,0);
  assert.equal(result.sheet_rows_written,0);
  assert.equal(result.sheet_rows_deleted,0);
  assert.equal(telemetry.acquired,1);
  assert.equal(telemetry.released,1);
  assert.equal(telemetry.sheetMutations,0);
  assert.equal(telemetry.httpCalls,0);
  assert.match(telemetry.logs.join('\n'),/NGD_SYNTHETIC_LEDGER_IDEMPOTENCY_OK/);
});
test('synthetic tester refuses anything outside STAGING before lock or mutation',()=>{
  const {ctx,telemetry}=fixture({environment:'PRODUCTION'});
  assert.throws(()=>ctx.ngdTestCreditLedgerAndIdempotency(),/STAGING/);
  assert.equal(telemetry.acquired,0);
  assert.equal(telemetry.sheetMutations,0);
});
test('missing monitoring member stays untouched and full synthetic QRIS readiness never writes',()=>{
  const {ctx,telemetry}=fixture({monitorMissing:true});
  const result=ctx.ngdTestCreditLedgerAndIdempotency();
  assert.equal(result.monitor_member_found,false);
  assert.equal(result.monitor_balance_unchanged,true);
  ctx.settings_=()=>({payment_gateway_mode:'QRIS_STATIS'});
  const readiness=ctx.ngdVerifyFullStagingReadiness();
  assert.equal(readiness.status,'PASS_SYNTHETIC_ONLY');
  assert.equal(readiness.live_ready,false);
  assert.equal(readiness.real_sheet_mutations,0);
  assert.equal(readiness.provider_calls,0);
  assert.ok(readiness.checks>=10);
  assert.equal(telemetry.sheetMutations,0);
  assert.equal(telemetry.httpCalls,0);
});
test('direct AI reservations and runs are fail-closed when mutation/finance flags OFF',()=>{
  const {ctx,telemetry}=fixture();
  assert.throws(()=>ctx.aiReserve_({role:'MEMBER'}, {},'SYNTHETIC_REQUEST_001'),/Perubahan data belum diaktifkan/);
  assert.throws(()=>ctx.runAiTool_({role:'MEMBER'}, {},'SYNTHETIC_REQUEST_001'),/Perubahan data belum diaktifkan/);
  assert.equal(telemetry.acquired,0);
  assert.equal(telemetry.httpCalls,0);
  assert.equal(telemetry.sheetMutations,0);
});
test('STAGING exposes QA UI controls but backend retains independent finance and mutation gates',()=>{
  for(const key of ['memberWritesEnabled','registrationOtpEnabled','paymentsEnabled',
    'contentEnabled','catalogEnabled','serviceEnabled','supportEnabled',
    'notificationsEnabled','lmsEnabled']){
      assert.match(staging,new RegExp(key+':true'));
  }
  assert.match(staging,/adminLoginEnabled:true/);
  assert.match(code,/requireMutationsEnabled_\(\);\s*requireActionFeatureEnabled_\(action\);/);
  assert.match(code,/function requireActionFeatureEnabled_\(action\)/);
  assert.match(code,/requireFinanceEnabled_\(\);/);
});

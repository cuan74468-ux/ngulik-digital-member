'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');

function boot(options={}){
  const props={NGD_ENVIRONMENT:'STAGING',NGD_DB_ID:'STAGING_ONLY_ID',
    NGD_ADMIN_LOGIN_DB_ID:'STAGING_ONLY_ID',NGD_ADMIN_LOGIN_ENABLED:'true',...options};
  const sandbox={
    console:{log(){},warn(){},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||null;}}}},
    SpreadsheetApp:new Proxy({}, {get(){throw Error('SHEET_ACCESS_NOT_ALLOWED_IN_TEST');}})
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{timeout:2000});
  // Override database access without granting Google IO.
  sandbox.db_=()=>({getId(){return 'STAGING_ONLY_ID';}});
  return sandbox;
}
test('staging identity endpoint is explicitly listed as a READ action',()=>{
  const app=boot();
  assert.ok(app.apiReadActions_().includes('getStagingWorkspaceInfo'));
  assert.ok(!app.apiReadActions_().includes('adminLogin'));
});
test('verified STAGING returns environmental identity but no database id',()=>{
  const app=boot();
  const identity=app.ngdStagingWorkspaceInfo_();
  assert.equal(identity.environment,'STAGING');
  assert.equal(identity.workspace,'NGD_STAGING');
  assert.equal(identity.admin_login_enabled,true);
  assert.equal(identity.finance_enabled,false);
  assert.equal(identity.registration_enabled,false);
  assert.equal(identity.external_providers_enabled,false);
  assert.equal(JSON.stringify(identity).includes('STAGING_ONLY_ID'),false);
});
test('production fails closed even with active admin login',()=>{
  assert.throws(()=>boot({NGD_ENVIRONMENT:'PRODUCTION'}).ngdStagingWorkspaceInfo_(),
    /STAGING terverifikasi/);
});
test('wrong admin login database fails closed',()=>{
  assert.throws(()=>boot({NGD_ADMIN_LOGIN_DB_ID:'SOME_OTHER_DB'}).ngdStagingWorkspaceInfo_(),
    /STAGING terverifikasi/);
});
test('unknown database id in runtime fails closed',()=>{
  const app=boot();
  app.db_=()=>({getId(){return 'WRONG_DB';}});
  assert.throws(()=>app.ngdStagingWorkspaceInfo_(),/Database STAGING/);
});
test('staging OTP database mismatch fails closed',()=>{
  assert.throws(()=>boot({NGD_OTP_STAGING_DB_ID:'OTHER_DB'}).ngdStagingWorkspaceInfo_(),
    /STAGING terverifikasi/);
});

test('STAGING read-only workspace preflight refuses external-provider activation',()=>{
  const app=boot({NGD_EXTERNAL_PROVIDERS_ENABLED:'true'});
  assert.equal(app.ngdStagingWorkspaceInfo_().external_providers_enabled,true);
  assert.throws(()=>app.ngdStagingWorkspaceReadOnlyCheck(),/Pengaman write STAGING harus tetap OFF/);
});

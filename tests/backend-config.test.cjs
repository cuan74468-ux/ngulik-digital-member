'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function make(storedId=null,active=null){
  const calls=[];
  const ctx=vm.createContext({
    console:{log(){},warn(){},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){
      if(k==='NGD_DB_ID')return storedId;
      if(k==='NGD_ADMIN_WA')return null;
      return null;
    }};}},
    SpreadsheetApp:{
      openById(id){calls.push(['openById',id]);return {kind:'configured',id};},
      getActiveSpreadsheet(){calls.push(['getActiveSpreadsheet']);return active;}
    }
  });
  vm.runInContext(backend,ctx,{timeout:10000});
  return {ctx,calls};
}
test('Web App uses explicit NGD_DB_ID property if present',()=>{
  const h=make('STAGING-ID', {kind:'other'});
  const r=vm.runInContext('db_()',h.ctx);
  assert.equal(r.id,'STAGING-ID');
  assert.deepEqual(h.calls,[['openById','STAGING-ID']]);
});
test('bound Apps Script can use its active spreadsheet when ID absent',()=>{
  const bound={kind:'bound'};
  const h=make(null,bound);
  const r=vm.runInContext('db_()',h.ctx);
  assert.equal(r.kind,'bound');
  assert.deepEqual(h.calls,[['getActiveSpreadsheet']]);
});
test('unbound Web App fails closed when ID is not configured',()=>{
  const h=make(null,null);
  assert.throws(()=>vm.runInContext('db_()',h.ctx),/NGD_DB_ID belum diisi/);
});
test('backend source has no hardcoded operational sheet ID or admin WA',()=>{
  assert.doesNotMatch(backend,/DB_ID:\s*'[A-Za-z0-9_-]{20,}'/);
  assert.match(backend,/getProperty\('NGD_ADMIN_WA'\)/);
  assert.match(backend,/getProperty\('NGD_DB_ID'\)/);
});

test('server-side runtime assessment is read-only and never exposes database ID or keys',()=>{
  const h=make('STAGING-PRIVATE-ID');
  const headers=vm.runInContext('NGD.HEADERS',h.ctx);
  let reads=0;
  h.ctx.db_=()=>({getSheetByName(name){
    if(name==='service_requests')return null;
    return {
      getLastColumn(){return headers[name].split(',').length;},
      getRange(){reads++;return {getValues(){return [name==='notifications'?
        ['unexpected_header']:headers[name].split(',')];}};}
    };
  }});
  const status=vm.runInContext('adminRuntimeStatus_()',h.ctx);
  assert.equal(status.schema.expected,26);
  assert.equal(status.schema.ready,24);
  assert.deepEqual(Array.from(status.schema.missing),['service_requests']);
  assert.deepEqual(Array.from(status.schema.mismatched),['notifications']);
  assert.equal(status.checks_read_only,true);
  assert.equal(status.feature_flags.finance,false);
  assert.equal(status.feature_flags.mutations,false);
  assert.ok(reads>0);
  assert.doesNotMatch(JSON.stringify(status),/STAGING-PRIVATE-ID|NGD_DB_ID|password|secret/i);
});

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

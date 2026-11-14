'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(balance=0,hasGrant=false){
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(src,ctx,{timeout:10000});
  const ledger=[],audits=[];
  ctx.findRows_=()=>hasGrant?[{member_id:'M-1',tipe:'GRANT'}]:ledger.filter(x=>x.tipe==='GRANT');
  ctx.creditBalance_=()=>balance+ledger.reduce((sum,x)=>sum+x.jumlah,0);
  ctx.appendRow_=(tab,record)=>{assert.equal(tab,'credits_ledger');ledger.push(record);};
  ctx.logAudit_=(...args)=>audits.push(args);
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.recordId_=()=> 'ENTRY-1';
  const grant=amount=>vm.runInContext('grantInitialCredit_("M-1",'+amount+')',ctx);
  return {grant,ledger,audits};
}
test('welcome grant uses accurate current balance',()=>{
  const h=fixture(20);
  const result=h.grant(10);
  assert.equal(result.balance,30);
  assert.equal(h.ledger[0].saldo_setelah,30);
  assert.equal(h.ledger[0].jumlah,10);
});
test('zero welcome grant is respected and never posted',()=>{
  const h=fixture(0);
  const result=h.grant(0);
  assert.equal(result.granted,false);
  assert.equal(h.ledger.length,0);
});
test('repeated welcome grant does not duplicate credits',()=>{
  const h=fixture(0);
  assert.equal(h.grant(10).granted,true);
  assert.equal(h.grant(10).granted,false);
  assert.equal(h.ledger.length,1);
});
test('invalid amounts are rejected before any row writes',()=>{
  for(const invalid of ['-1','1.5','1001','"NaN"']){
    const h=fixture(0);
    assert.throws(()=>h.grant(invalid),/Kredit sambutan/);
    assert.equal(h.ledger.length,0);
  }
});
test('registration validates initial credit setting before inserting member',()=>{
  const start=src.indexOf('function authRegister_(');
  const end=src.indexOf('\nfunction ',start+10);
  assert.ok(start>=0);
  const fn=src.slice(start,end);
  assert.ok(fn.indexOf('Pengaturan kredit awal tidak valid.')<
    fn.indexOf("appendRow_('members',m)"));
});

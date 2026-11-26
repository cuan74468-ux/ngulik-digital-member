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
  const check=fn.indexOf('ngdInitialCreditPolicy_()');
  assert.ok(check>=0&&check<fn.indexOf("appendRow_('members',m)"));
});

function policyFixture(rows){
 const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
 vm.runInContext(src,ctx,{timeout:10000});
 ctx.readAll_=name=>{assert.equal(name,'pengaturan_sistem');return rows;};
 return ctx;
}
const policyRow=(value,tipe='NUMBER')=>({key:'kredit_awal',value,tipe});
test('raw initial credit policy distinguishes zero, explicit legacy amount, and malformed cells',()=>{
 for(const value of [0,'0',10,'10',1000])assert.equal(policyFixture([policyRow(value)]).ngdInitialCreditPolicy_(),Number(value));
 for(const value of [null,undefined,'',' ',true,false,-1,1.5,'bad','1e1','0x10',1001,NaN,Infinity])
  assert.throws(()=>policyFixture([policyRow(value)]).ngdInitialCreditPolicy_(),/kredit awal/);
 assert.throws(()=>policyFixture([policyRow(0,'BOOL')]).ngdInitialCreditPolicy_(),/kredit awal/);
 assert.throws(()=>policyFixture([]).ngdInitialCreditPolicy_(),/Kebijakan kredit awal belum siap/);
 assert.throws(()=>policyFixture([policyRow(0),policyRow(10)]).ngdInitialCreditPolicy_(),/Kebijakan kredit awal belum siap/);
});
function promotionFixture(rows){
 const ctx=policyFixture(rows),events=[];
 const members=[{member_id:'M-2',role:'MEMBER',status:'WAITING_LIST',joined_at:new Date('2026-11-20T00:00:00Z'),_row:2}];
 ctx.readAll_=name=>name==='members'?members:rows;
 ctx.setting_=(key,fallback)=>key==='kuota_gelombang'?50:fallback;
 ctx.withLock_=fn=>fn();
 ctx.grantInitialCredit_=(id,amount)=>events.push(['grant',id,amount]);
 ctx.updateRow_=(name,row,patch)=>events.push(['update',name,row,patch.status]);
 ctx.updateSetting_=()=>events.push(['setting']);
 ctx.logAudit_=()=>events.push(['audit']);
 return {ctx,events,promote:()=>ctx.adminPromoteWaitlist_({member_id:'ADMIN-TEST'},{member_id:'M-2'})};
}
test('waitlist promotion with explicit zero posts no grant and retains admission path',()=>{
 const h=promotionFixture([policyRow(0)]);
 assert.equal(h.promote().initial_credit_ensured,false);
 assert.deepEqual(h.events,[['update','members',2,'AKTIF'],['audit']]);
});
test('waitlist promotion cannot silently mint credits or mutate on missing duplicate or invalid policy',()=>{
 for(const rows of [[],[policyRow('bad')],[policyRow(0),policyRow(10)],[policyRow('')],[policyRow(true)]]){
  const h=promotionFixture(rows);
  assert.throws(()=>h.promote(),/kredit awal/);
  assert.deepEqual(h.events,[]);
 }
});
test('explicit legacy amount remains supported until separate policy/config approval',()=>{
 const h=promotionFixture([policyRow(10)]);
 assert.equal(h.promote().initial_credit_ensured,true);
 assert.deepEqual(h.events,[['grant','M-2',10],['update','members',2,'AKTIF'],['audit']]);
});
test('fresh seed uses zero but never overwrites existing policy',()=>{
 const s=src.slice(src.indexOf('function seedSettings_()'),src.indexOf('function seedCatalog_()'));
 assert.match(s,/\['kredit_awal',0,'NUMBER'\]/);
 assert.match(s,/if \(!existing\[row\[0\]\]\)/);
});

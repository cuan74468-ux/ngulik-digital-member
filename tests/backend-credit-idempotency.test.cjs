'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(){
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  const ledger=[],audits=[];
  ctx.findRows_=(table,predicate)=>{
    assert.equal(table,'credits_ledger');
    return ledger.filter(predicate);
  };
  ctx.creditBalance_=(id)=>ledger.filter(x=>x.member_id===id)
    .reduce((sum,x)=>sum+x.jumlah,0);
  ctx.appendRow_=(table,value)=>{
    assert.equal(table,'credits_ledger');
    ledger.push(value);
  };
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.recordId_=()=> 'ENTRY-'+(ledger.length+1);
  ctx.logAudit_=(...args)=>audits.push(args);
  const grant=(id,amount,ref,kind)=>vm.runInContext(
    'grantCredits_('+[id,amount,ref,kind].map(v=>JSON.stringify(v)).join(',')+')',
    ctx,{timeout:1000});
  return {grant,ledger,audits};
}
test('replayed topup with same reference is not posted twice',()=>{
  const h=fixture();
  assert.equal(h.grant('M-1',50,'ORDER-1','TOPUP').alreadyApplied,false);
  assert.equal(h.grant('M-1',50,'ORDER-1','TOPUP').alreadyApplied,true);
  assert.equal(h.ledger.length,1);
  assert.equal(h.ledger[0].saldo_setelah,50);
});
test('replayed refund adjustment with same reference is not duplicated',()=>{
  const h=fixture();
  h.grant('M-1',50,'ORDER-1','TOPUP');
  h.grant('M-1',-50,'ORDER-1','ADJUST_REFUND');
  const r=h.grant('M-1',-50,'ORDER-1','ADJUST_REFUND');
  assert.equal(r.alreadyApplied,true);
  assert.equal(r.balance,0);
  assert.equal(h.ledger.length,2);
});
test('admin adjustment with same request reference is idempotent',()=>{
  const h=fixture();
  h.grant('M-1',10,'ADMIN_ADJUST:REQ-000000000000001','ADJUST');
  assert.equal(h.grant('M-1',10,'ADMIN_ADJUST:REQ-000000000000001','ADJUST').alreadyApplied,true);
  assert.equal(h.ledger.length,1);
});
test('conflicting replay amount or member is rejected',()=>{
  const h=fixture();
  h.grant('M-1',10,'ORDER-1','TOPUP');
  assert.throws(()=>h.grant('M-1',20,'ORDER-1','TOPUP'),/Referensi kredit/);
  assert.throws(()=>h.grant('M-2',10,'ORDER-1','TOPUP'),/Referensi kredit/);
  assert.equal(h.ledger.length,1);
});
test('credit postings reject fractional and zero amounts',()=>{
  const h=fixture();
  assert.throws(()=>h.grant('M-1',1.5,'REF-1','ADJUST'),/Jumlah kredit/);
  assert.throws(()=>h.grant('M-1',0,'REF-2','ADJUST'),/Jumlah kredit/);
  assert.equal(h.ledger.length,0);
});

test('negative admin debit replay succeeds after balance has fallen',()=>{
  const h=fixture();
  h.grant('M-1',50,'ORDER-1','TOPUP');
  h.grant('M-1',-40,'ADMIN_ADJUST:REQ-000000000000001','ADJUST');
  const r=h.grant('M-1',-40,'ADMIN_ADJUST:REQ-000000000000001','ADJUST');
  assert.equal(r.alreadyApplied,true);
  assert.equal(r.balance,10);
  assert.equal(h.ledger.length,2);
});
test('a new debit larger than available balance is rejected',()=>{
  const h=fixture();
  h.grant('M-1',10,'ORDER-1','TOPUP');
  assert.throws(()=>h.grant('M-1',-20,'ADMIN_ADJUST:REQ-000000000000002','ADJUST'),/saldo negatif/);
  assert.equal(h.ledger.length,1);
});

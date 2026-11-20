'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(orderStatus='FULFILLED',minimum=50000){
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  const order=orderStatus?{order_id:'ORDER-1',status:orderStatus}:null;
  const commission={_row:5,komisi_id:'K-1',referrer_id:'M-1',
    order_id:'ORDER-1',nominal:65000,status:'APPROVED',payout_requested_at:''};
  const rows={affiliate_commissions:[commission],orders:order?[order]:[]};
  const writes=[],audits=[];
  ctx.withLock_=fn=>fn();
  ctx.findRows_=(table,predicate)=>(rows[table]||[]).filter(predicate);
  ctx.byId_=(table,field,id)=>(rows[table]||[]).find(x=>String(x[field])===String(id))||null;
  ctx.setting_=()=>minimum;
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.updateRow_=(table,row,patch)=>{
    writes.push({table,row,patch});
    Object.assign(commission,patch);
  };
  ctx.logAudit_=(...args)=>audits.push(args);
  function payout(role='MEMBER'){
    return vm.runInContext('requestPayout_({member_id:"M-1",role:'+JSON.stringify(role)+'},{nomor_dana:"081234567890"})',ctx,{timeout:2000});
  }
  return {payout,commission,writes,audits};
}
test('valid paid/fulfilled order permits one payout request',()=>{
  const h=fixture('FULFILLED');
  const r=h.payout();
  assert.equal(r.total,65000);
  assert.equal(r.jumlah_komisi,1);
  assert.equal(h.writes.length,1);
  assert.ok(h.commission.payout_requested_at);
  assert.throws(()=>h.payout(),/Tidak ada komisi siap dicairkan/);
});
test('refunded or cancelled orders block payout before writes',()=>{
  for(const status of ['REFUNDED','CANCELLED','EXPIRED','PENDING']){
    const h=fixture(status);
    assert.throws(()=>h.payout(),/belum valid/);
    assert.equal(h.writes.length,0);
  }
});
test('missing source order blocks orphaned commission payouts',()=>{
  const h=fixture(null);
  assert.throws(()=>h.payout(),/belum valid/);
  assert.equal(h.writes.length,0);
});
test('admin account cannot request a member payout',()=>{
  const h=fixture('PAID');
  assert.throws(()=>h.payout('ADMIN'),/Hanya member/);
  assert.equal(h.writes.length,0);
});
test('minimum payout threshold is enforced before writes',()=>{
  const h=fixture('FULFILLED',100000);
  assert.throws(()=>h.payout(),/minimum pencairan/);
  assert.equal(h.writes.length,0);
});

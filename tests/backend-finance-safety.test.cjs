'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function runtime(){
  const context=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(backend,context,{timeout:10000});
  return context;
}
function decision(ctx,order,product,entries=[],commissions=[]){
  return vm.runInContext(
    'refundDecision_('+[order,product,entries,commissions].map(v=>JSON.stringify(v)).join(',')+')',
    ctx,{timeout:2000});
}
const order=(status='FULFILLED')=>({order_id:'ORDER-1',member_id:'MEMBER-1',product_id:'CREDIT',status});
const product={product_id:'CREDIT',tipe:'TOPUP_KREDIT',kredit_diberikan:5000};
const topup={entry_id:'L-1',member_id:'MEMBER-1',ref_id:'ORDER-1',tipe:'TOPUP',jumlah:50};
const reverse={entry_id:'L-2',member_id:'MEMBER-1',ref_id:'ORDER-1',tipe:'ADJUST_REFUND',jumlah:-50};
test('topup refund uses booked amount, not mutable catalog amount',()=>{
  const c=runtime(),r=decision(c,order(),product,[topup]);
  assert.equal(r.allowed,true);
  assert.equal(r.creditAdjustment,-50); // product says 5000; original ledger says 50
});
test('spent credits cannot be clawed back automatically',()=>{
  const r=decision(runtime(),order(),product,[topup,{tipe:'AI_USE',jumlah:-5,member_id:'MEMBER-1'}]);
  assert.equal(r.allowed,false);
  assert.equal(r.reason,'INSUFFICIENT_UNSPENT_CREDITS');
});
test('other available credits can cover the exact refund reversal',()=>{
  const r=decision(runtime(),order(),product,[topup,{tipe:'GRANT',jumlah:30,member_id:'MEMBER-1'}]);
  assert.equal(r.allowed,true);
  assert.equal(r.creditAdjustment,-50);
});
test('duplicate topup and previous refund adjustments block automation',()=>{
  const c=runtime();
  assert.equal(decision(c,order(),product,[topup,topup]).reason,'TOPUP_LEDGER_COUNT_INVALID');
  assert.equal(decision(c,order(),product,[topup,reverse]).reason,'REFUND_ADJUST_ALREADY_EXISTS');
});
test('non-topup products always require manual reconciliation',()=>{
  const c=runtime();
  for(const tipe of ['LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H']){
    assert.equal(decision(c,order('PAID'),{tipe}).reason,'MANUAL_RECONCILIATION_REQUIRED');
    assert.equal(decision(c,order('FULFILLED'),{tipe}).reason,'MANUAL_RECONCILIATION_REQUIRED');
  }
});
test('paid commissions block automated refunds',()=>{
  const r=decision(runtime(),order(),product,[topup],
    [{order_id:'ORDER-1',status:'PAID'}]);
  assert.equal(r.allowed,false);
  assert.equal(r.reason,'COMMISSION_ALREADY_PAID');
});
test('unfulfilled topup without posted credits can be marked refunded',()=>{
  const c=runtime();
  assert.equal(decision(c,order('PAID'),product,[]).creditAdjustment,0);
  assert.equal(decision(c,order('PAID'),product,[topup]).reason,'TOPUP_POSTED_WITH_PAID_STATUS');
});
test('unsupported order status is rejected',()=>{
  const r=decision(runtime(),order('EXPIRED'),product,[topup]);
  assert.equal(r.reason,'ORDER_STATUS_INVALID');
});
test('member order view excludes internal payment and referral fields',()=>{
  const c=runtime();
  const raw={...order(),nama_produk:'Top-up',total_bayar:20000,
    catatan_admin:'private note',verified_by:'ADMIN',ref_member_id:'M-OTHER',
    request_id:'private-request',_row:9};
  const view=vm.runInContext('orderView_('+JSON.stringify(raw)+',{role:"MEMBER",member_id:"MEMBER-1"})',c);
  assert.equal(view.order_id,raw.order_id);
  assert.equal(view.total_bayar,20000);
  for(const key of ['catatan_admin','verified_by','ref_member_id','request_id','_row'])
    assert.equal(Object.hasOwn(view,key),false,key);
  const admin=vm.runInContext('orderView_('+JSON.stringify(raw)+',{role:"ADMIN",member_id:"M-ADMIN"})',c);
  assert.equal(admin.catatan_admin,'private note');
  assert.equal(Object.hasOwn(admin,'_row'),false);
});
test('getOrder remains read-only even if an order is past its deadline',()=>{
  const c=runtime();
  const orig={...order('PENDING'),expires_at:'2020-01-01T00:00:00Z'};
  c.byId_=()=>orig;
  c.updateRow_=()=>{throw Error('UNEXPECTED_WRITE');};
  c.logAudit_=()=>{throw Error('UNEXPECTED_AUDIT_WRITE');};
  c.expireOrder_=()=>{throw Error('UNEXPECTED_EXPIRY_WRITE');};
  c.withLock_=()=>{throw Error('UNEXPECTED_LOCK');};
  const view=vm.runInContext('getOrder_({role:"MEMBER",member_id:"MEMBER-1"},"ORDER-1")',c);
  assert.equal(view.status,'PENDING');
  assert.equal(view.past_due,true);
  assert.equal(orig.status,'PENDING');
});
test('getOrder does not disclose another members order',()=>{
  const c=runtime();
  c.byId_=()=>order('PENDING');
  assert.throws(()=>vm.runInContext(
    'getOrder_({role:"MEMBER",member_id:"STRANGER"},"ORDER-1")',c),/Pesanan tidak ditemukan/);
});

test('finance reconciliation flags invalid PENDING expiry without writing data',()=>{
  const c=runtime();
  const rows=[{order_id:'ORDER-MALFORMED',member_id:'M-TEST',product_id:'CREDIT',
    status:'PENDING',expires_at:'not-a-date'}];
  const result=c.financeFindings_(rows,[],[],[],null,null);
  assert.equal(result.checked,1);
  assert.equal(result.needs_review,1);
  assert.equal(result.findings[0].order_id,'ORDER-MALFORMED');
  assert.ok(Array.from(result.findings[0].issues).includes('PENDING_ORDER_EXPIRY_INVALID'));
  const good=c.financeFindings_([{...rows[0],expires_at:new Date(Date.now()+60000).toISOString()}],[],[],[],null,null);
  assert.equal(good.needs_review,0);
});

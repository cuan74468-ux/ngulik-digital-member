'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(rate,price=10000,eligible=true){
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(code,ctx,{timeout:10000});
  const member={_row:2,member_id:'BUYER',referred_by:'SPONSOR',status_pos:'BELUM'},
        product={product_id:'P1',tipe:'LISENSI_SEKALI',bisa_komisi:eligible},
        order={order_id:'O1',product_id:'P1',member_id:'BUYER',harga_dasar:price,_row:4};
  const writes=[],commissions=[],audits=[];
  ctx.byId_=table=>table==='members'?member:table==='katalog_produk'?product:null;
  ctx.settings_=()=>({komisi_persen:rate,komisi_hanya_order_pertama:true,masa_tahan_hari:14});
  ctx.updateRow_=(name,row,patch)=>{writes.push({name,row,patch});};
  ctx.findRows_=(name,predicate)=>name==='affiliate_commissions'?commissions.filter(predicate):[];
  ctx.appendRow_=(name,obj)=>{assert.equal(name,'affiliate_commissions');commissions.push(obj);};
  ctx.logAudit_=(...args)=>audits.push(args);
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.recordId_=()=> 'COMMISSION-1';
  const perform=()=>vm.runInContext('onPaid_('+JSON.stringify(order)+',{member_id:"ADMIN",role:"ADMIN"})',ctx,{timeout:2000});
  return {ctx,member,product,order,writes,commissions,audits,perform};
}
test('explicit zero percent never pays the 25 percent default',()=>{
  const h=fixture(0);h.perform();
  assert.equal(h.commissions.length,0);
  assert.equal(h.writes.length,1);
  assert.equal(h.writes[0].name,'members');
});
test('valid 25 percent produces correct one-time commission',()=>{
  const h=fixture(25);h.perform();
  assert.equal(h.commissions.length,1);
  assert.equal(h.commissions[0].nominal,2500);
  assert.equal(h.commissions[0].persen,25);
  assert.equal(h.commissions[0].status,'PENDING');
});
test('undefined rate uses historical default 25 percent without blocking',()=>{
  const h=fixture(undefined);h.perform();
  assert.equal(h.commissions[0].nominal,2500);
});
test('invalid commission setting is rejected before any member or ledger writes',()=>{
  for(const rate of [-1,100,1.5,'abc']){
    const h=fixture(rate);
    assert.throws(()=>h.perform(),/Persentase komisi tidak valid/);
    assert.equal(h.writes.length,0);
    assert.equal(h.commissions.length,0);
  }
});
test('commission amount which rounds down to zero is rejected before entitlement',()=>{
  const h=fixture(1,1);
  assert.throws(()=>h.perform(),/Nominal komisi tidak valid/);
  assert.equal(h.writes.length,0);
  assert.equal(h.commissions.length,0);
});
test('ineligible product never produces commission',()=>{
  const h=fixture(25,10000,false);h.perform();
  assert.equal(h.commissions.length,0);
});
test('same order already containing commission is idempotent',()=>{
  const h=fixture(25);
  h.commissions.push({order_id:'O1',referred_member_id:'BUYER',nominal:2500});
  h.perform();
  assert.equal(h.commissions.length,1);
});

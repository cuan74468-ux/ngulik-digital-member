'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(type='LISENSI_SEKALI'){
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(src,ctx,{timeout:10000});
  const product={product_id:'P-1',nama:'Contoh produk',tipe:type,aktif:true,
    durasi_hari:30,kredit_diberikan:0,bisa_komisi:false};
  const member={member_id:'M-1',role:'MEMBER',status:'AKTIF',status_pos:'AKTIF',
    status_canva:'AKTIF_BULAN_1',referred_by:''};
  const order={order_id:'O-1',member_id:'M-1',product_id:'P-1',
    status:'PAID',request_id:'retry-123456789012'};
  const writes=[];
  ctx.withLock_=fn=>fn();
  ctx.byId_=(table,column,value)=>{
    if(table==='katalog_produk')return product;
    if(table==='members')return member;
    if(table==='orders'&&column==='request_id')return order;
    if(table==='orders'&&column==='order_id')return order;
    return null;
  };
  ctx.updateRow_=(table,row,patch)=>{writes.push({table,patch});Object.assign(member,patch);};
  ctx.orderView_=(x)=>x;
  ctx.settings_=()=>({komisi_hanya_order_pertama:true,komisi_persen:25});
  ctx.findRows_=()=>[];
  return {ctx,member,product,order,writes};
}
test('same request id remains idempotent after POS license becomes active',()=>{
  const h=fixture();
  const result=vm.runInContext(
    "newOrder_({member_id:'M-1',role:'MEMBER',status_pos:'AKTIF'}, {product_id:'P-1'}, 'retry-123456789012')",
    h.ctx,{timeout:3000});
  assert.equal(result.order_id,'O-1');
  assert.equal(h.writes.length,0);
});
test('new POS order is rejected for members with active license',()=>{
  const h=fixture();
  h.ctx.byId_=(table,column,value)=>table==='katalog_produk'?h.product:null;
  assert.throws(()=>vm.runInContext(
    "newOrder_({member_id:'M-1',role:'MEMBER',status_pos:'AKTIF'}, {product_id:'P-1'}, 'brand-new-123456789')",
    h.ctx,{timeout:3000}),/Lisensi POS sudah aktif/);
  assert.equal(h.writes.length,0);
});
test('paid Canva renewal preserves active seat until approval',()=>{
  const h=fixture('SEAT_30H');
  vm.runInContext("onPaid_({order_id:'O-1',product_id:'P-1',member_id:'M-1',status:'PAID'}, {member_id:'ADMIN',role:'ADMIN'})",h.ctx,{timeout:3000});
  assert.equal(h.member.status_canva,'AKTIF_BULAN_1');
  assert.equal(h.writes.length,0);
});
test('first Canva seat still enters submitted state for manual activation',()=>{
  const h=fixture('SEAT_30H');
  h.member.status_canva='BELUM';
  vm.runInContext("onPaid_({order_id:'O-1',product_id:'P-1',member_id:'M-1',status:'PAID'}, {member_id:'ADMIN',role:'ADMIN'})",h.ctx,{timeout:3000});
  assert.equal(h.member.status_canva,'DIAJUKAN');
  assert.equal(h.writes.length,1);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function makeHarness(){
  const writes=[],audits=[];
  const order={_row:2,order_id:'ORDER1',member_id:'M1',product_id:'P1',
    status:'MENUNGGU_VERIFIKASI',total_bayar:10123,created_at:'2026-11-14T00:00:00Z',
    expires_at:'2027-11-14T02:00:00Z'};
  const product={product_id:'P1',tipe:'TOPUP_KREDIT',kredit_diberikan:50,durasi_hari:0};
  const member={member_id:'M1',role:'MEMBER',status:'AKTIF'};
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}},Date,Number,String});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.withLock_=(fn)=>fn();
  ctx.byId_=(table,column,value)=>{
    if(table==='orders'&&value==='ORDER1')return order;
    if(table==='katalog_produk'&&value==='P1')return product;
    if(table==='members'&&value==='M1')return member;
    return null;
  };
  ctx.expireOrder_=o=>o;
  ctx.findRows_=()=>[]; // No competing settlement in the synthetic fixture.
  ctx.settings_=()=>({qris_gambar_path:'',qris_atas_nama:'STAGING',wa_admin:''});
  ctx.now_=()=>new Date('2026-11-14T01:00:00Z');
  ctx.isoWib_=(date)=>new Date(date).toISOString();
  ctx.updateRow_=(table,row,patch)=>{
    writes.push({table,row,patch});
    if(table==='orders')Object.assign(order,patch);
  };
  ctx.logAudit_=(...args)=>audits.push(args);
  ctx.onPaid_=()=>{};
  function approve(payload){
    const args=JSON.stringify(payload);
    return vm.runInContext('transitionOrder_({role:"ADMIN",member_id:"ADMIN"},"ORDER1","approve",'+args+')',ctx);
  }
  return {approve,order,writes,audits,ctx};
}
test('admin cannot mark PAID without verified funds',()=>{
  const h=makeHarness();
  assert.throws(()=>h.approve({}),/Dana harus diverifikasi/);
  assert.equal(h.order.status,'MENUNGGU_VERIFIKASI');
  assert.equal(h.writes.length,0);
});
test('admin cannot mark PAID with missing settlement reference',()=>{
  const h=makeHarness();
  assert.throws(()=>h.approve({dana_diterima:true,nominal_terverifikasi:10123,metode_diterima:'QRIS_STATIS',referensi_pembayaran:''}),/Referensi/);
  assert.equal(h.writes.length,0);
});
test('admin can mark PAID with explicit evidence, and stores evidence',()=>{
  const h=makeHarness();
  const result=h.approve({dana_diterima:true,nominal_terverifikasi:10123,metode_diterima:'QRIS_STATIS',referensi_pembayaran:'MUTASI-000123'});
  assert.equal(result.status,'PAID');
  assert.match(h.order.catatan_admin,/MUTASI-000123/);
  assert.equal(h.order.verified_by,'ADMIN');
  assert.ok(h.audits.length>=1);
});
test('reused request id cannot silently become another product order',()=>{
  const src=source;
  assert.match(src,/retry\.product_id===product\.product_id/);
});

test('admin rejects a false settlement amount before altering status',()=>{
  const h=makeHarness();
  assert.throws(()=>h.approve({dana_diterima:true,nominal_terverifikasi:10122,
    metode_diterima:'QRIS_STATIS',referensi_pembayaran:'MUTASI-000123'}),/Nominal pada mutasi/);
  assert.equal(h.order.status,'MENUNGGU_VERIFIKASI');
  assert.equal(h.writes.length,0);
});
test('admin rejects an unverified settlement channel before altering status',()=>{
  const h=makeHarness();
  assert.throws(()=>h.approve({dana_diterima:true,nominal_terverifikasi:10123,
    metode_diterima:'SCALEV_FAKE',referensi_pembayaran:'MUTASI-000123'}),/Pilih metode pembayaran/);
  assert.equal(h.order.status,'MENUNGGU_VERIFIKASI');
  assert.equal(h.writes.length,0);
});

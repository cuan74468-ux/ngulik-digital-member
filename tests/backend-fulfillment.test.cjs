'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function createFixture(type='LISENSI_SEKALI'){
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(src,ctx,{timeout:10000});
  const order={_row:2,order_id:'O-100',member_id:'M-100',product_id:'P-100',
    status:'PAID',catatan_admin:'Verified payment 12345'};
  const product={product_id:'P-100',tipe:type,durasi_hari:30};
  const member={_row:3,member_id:'M-100',status_pos:'DIAJUKAN',pos_lisensi_kode:'',
    status_canva:'DIAJUKAN',canva_berakhir:''};
  const writes=[],audit=[];
  ctx.withLock_=fn=>fn();
  ctx.byId_=(table,field,id)=>table==='orders'?order:
    table==='members'?member:table==='katalog_produk'?product:null;
  ctx.updateRow_=(table,row,patch)=>{
    writes.push({table,patch});
    Object.assign(table==='orders'?order:member,patch);
  };
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.uuid_=()=>'ABCDEF1234567890ABCDEF1234567890';
  ctx.logAudit_=(...args)=>audit.push(args);
  ctx.orderView_=(value)=>value;
  const run=(payload)=>vm.runInContext(
    'approveFulfillment_({role:"ADMIN",member_id:"ADMIN"},'+
    JSON.stringify({order_id:'O-100',...payload})+')',ctx,{timeout:3000});
  return {ctx,run,order,member,writes,audit};
}
test('license fulfillment requires explicit verified evidence before writes',()=>{
  const h=createFixture();
  assert.throws(()=>h.run({referensi_aktivasi:'TICKET-123'}),/diverifikasi/);
  assert.throws(()=>h.run({aktivasi_terverifikasi:true}),/Referensi aktivasi/);
  assert.equal(h.writes.length,0);
});
test('valid license writes durable attempt marker before member entitlement',()=>{
  const h=createFixture();
  const result=h.run({aktivasi_terverifikasi:true,referensi_aktivasi:'TICKET-123'});
  assert.equal(result.status,'FULFILLED');
  assert.deepEqual(h.writes.map(w=>w.table),['orders','members','orders']);
  assert.match(h.writes[0].patch.catatan_admin,/ADMIN_FULFILLMENT_ATTEMPT/);
  assert.match(h.member.pos_lisensi_kode,/^POS-/);
});
test('pre-existing active license cannot be silently overwritten',()=>{
  const h=createFixture();
  h.member.status_pos='AKTIF';
  h.member.pos_lisensi_kode='EXISTING-CODE';
  assert.throws(()=>h.run({aktivasi_terverifikasi:true,referensi_aktivasi:'TICKET-123'}),/Lisensi sudah aktif/);
  assert.equal(h.writes.length,0);
});
test('crash after member update is not retried automatically',()=>{
  const h=createFixture();
  const original=h.ctx.updateRow_;
  let crash=true;
  h.ctx.updateRow_=(table,row,patch)=>{
    original(table,row,patch);
    if(table==='members'&&crash){crash=false;throw new Error('SIMULATED_CRASH_AFTER_ENTITLEMENT');}
  };
  const p={aktivasi_terverifikasi:true,referensi_aktivasi:'TICKET-123'};
  assert.throws(()=>h.run(p),/SIMULATED_CRASH/);
  assert.equal(h.order.status,'PAID');
  assert.match(h.order.catatan_admin,/ADMIN_FULFILLMENT_ATTEMPT/);
  const writesBefore=h.writes.length;
  assert.throws(()=>h.run(p),/Aktivasi pernah dicoba/);
  assert.equal(h.writes.length,writesBefore);
});
test('Canva seat validates email and duration before the attempt marker',()=>{
  const h=createFixture('SEAT_30H');
  assert.throws(()=>h.run({aktivasi_terverifikasi:true,referensi_aktivasi:'TICKET-123',
    canva_email:'invalid email'}),/Email undangan/);
  assert.equal(h.writes.length,0);
  const out=h.run({aktivasi_terverifikasi:true,referensi_aktivasi:'TICKET-123',
    canva_email:'member@example.com'});
  assert.equal(out.status,'FULFILLED');
  assert.equal(h.writes[0].table,'orders');
  assert.equal(h.member.canva_email,'member@example.com');
});

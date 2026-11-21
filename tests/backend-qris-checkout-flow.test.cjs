'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function setup(){
  const members=[
    {member_id:'M-A',role:'MEMBER',nama:'Member A',wa:'6281111111111',referred_by:'M-REF'},
    {member_id:'M-B',role:'MEMBER',nama:'Member B',wa:'6282222222222',referred_by:'M-REF'}
  ];
  const product={product_id:'P-TOKEN-10',nama:'10 Token',tipe:'TOPUP_TOKEN',
    aktif:true,harga:'Rp10.000',kredit_diberikan:10,bisa_komisi:true,komisi_persen:10};
  const orders=[],notices=[],audits=[],paid=[];
  const ctx=vm.createContext({console:{error(){},log(){}},Date,Number,JSON});
  vm.runInContext(code,ctx,{timeout:10000});
  const cfg={payment_gateway_mode:'QRIS_STATIS',kode_unik_min:100,kode_unik_max:999,
    order_expiry_menit:60,followup_member_otomatis:true,notif_admin_wa_aktif:true,
    wa_admin:'6289999999999',qris_gambar_path:'https://example.org/qris.png',
    qris_atas_nama:'Owner'};
  let id=0;
  ctx.withLock_=fn=>fn();
  ctx.settings_=()=>cfg;
  ctx.now_=()=>new Date();
  ctx.uuid_=()=>('TESTID'+(++id)).padEnd(12,'X');
  ctx.Utilities={formatDate(date,tz,fmt){if(fmt==='yyMMdd')return '261117';return new Date(date).toISOString().slice(0,19);}};
  ctx.readAll_=table=>table==='orders'?orders:table==='wa_notifications'?notices:[];
  ctx.findRows_=(table,predicate)=>ctx.readAll_(table).filter(predicate);
  ctx.byId_=(table,key,val)=>{
    const data=table==='katalog_produk'?[product]:table==='members'?members:table==='orders'?orders:[];
    return data.find(r=>String(r[key])===String(val))||null;
  };
  ctx.appendRow_=(table,row)=>{
    if(table==='orders')orders.push({...row,_row:orders.length+2});
    else throw Error('UNEXPECTED_APPEND_'+table);
  };
  ctx.updateRow_=(table,row,patch)=>{
    if(table!=='orders')throw Error('UNEXPECTED_UPDATE_'+table);
    Object.assign(orders[row-2],patch);
  };
  ctx.logAudit_=(...a)=>audits.push(a);
  ctx.sendFonnteWa_=(wa,text,role,template,ref)=>{
    if(!notices.some(x=>x.template===template&&x.ref===ref)){
      notices.push({wa,text,role,template,ref});
    }
    return {status:'ACCEPTED'};
  };
  ctx.onPaid_=(o,m)=>paid.push({order:o.order_id,actor:m.member_id});
  return {ctx,members,orders,notices,audits,paid,product};
}
test('QRIS: two equal-price checkouts receive collision-free amount and invoice once',()=>{
  const h=setup();
  const a=h.ctx.newOrder_(h.members[0],{product_id:'P-TOKEN-10'},'REQUEST_A');
  const retry=h.ctx.newOrder_(h.members[0],{product_id:'P-TOKEN-10'},'REQUEST_A');
  const b=h.ctx.newOrder_(h.members[1],{product_id:'P-TOKEN-10'},'REQUEST_B');
  assert.equal(a.status,'PENDING');
  assert.equal(a.order_id,retry.order_id);
  assert.equal(h.orders.length,2);
  assert.notEqual(a.total_bayar,b.total_bayar);
  assert.ok(a.kode_unik>=100&&a.kode_unik<=999);
  assert.equal(a.total_bayar,10000-a.kode_unik);
  assert.equal(h.notices.filter(n=>n.template==='ORDER_INVOICE_MEMBER').length,2);
  assert.equal(a.qris_atas_nama,'Owner');
});
test('QRIS: member confirms once and admin receives exact amount notification',()=>{
  const h=setup();
  const order=h.ctx.newOrder_(h.members[0],{product_id:'P-TOKEN-10'},'REQUEST_1');
  const confirmed=h.ctx.transitionOrder_(h.members[0],order.order_id,'confirm',{});
  assert.equal(confirmed.status,'MENUNGGU_VERIFIKASI');
  assert.ok(h.orders[0].konfirmasi_bayar_at);
  h.ctx.transitionOrder_(h.members[0],order.order_id,'confirm',{});
  const admins=h.notices.filter(n=>n.template==='ORDER_CONFIRM_ADMIN');
  assert.equal(admins.length,1);
  assert.match(admins[0].text,new RegExp(String(order.total_bayar).replace(/\B(?=(\d{3})+(?!\d))/g,'.')));
});
test('QRIS: admin approval cannot proceed without confirmed funds and reference',()=>{
  const h=setup();
  const order=h.ctx.newOrder_(h.members[0],{product_id:'P-TOKEN-10'},'REQUEST_2');
  h.ctx.transitionOrder_(h.members[0],order.order_id,'confirm',{});
  const admin={role:'ADMIN',member_id:'ADM-1'};
  assert.throws(()=>h.ctx.transitionOrder_(admin,order.order_id,'approve',{}),/Dana harus diverifikasi/);
  assert.throws(()=>h.ctx.transitionOrder_(admin,order.order_id,'approve',{dana_diterima:true,nominal_terverifikasi:order.total_bayar,metode_diterima:'QRIS_STATIS'}),/Referensi mutasi/);
  assert.throws(()=>h.ctx.transitionOrder_(admin,order.order_id,'approve',{
    dana_diterima:true,nominal_terverifikasi:order.total_bayar-1,
    metode_diterima:'QRIS_STATIS',referensi_pembayaran:'DANA-MUTASI-12345'
  }),/Nominal pada mutasi/);
  assert.equal(h.orders[0].status,'MENUNGGU_VERIFIKASI');
  assert.equal(h.paid.length,0);
  const result=h.ctx.transitionOrder_(admin,order.order_id,'approve',{
    dana_diterima:true,nominal_terverifikasi:order.total_bayar,metode_diterima:'QRIS_STATIS',referensi_pembayaran:'DANA-MUTASI-12345'
  });
  assert.equal(result.status,'PAID');
  assert.equal(h.paid.length,1);
  assert.throws(()=>h.ctx.transitionOrder_(admin,order.order_id,'approve',{
    dana_diterima:true,nominal_terverifikasi:order.total_bayar,metode_diterima:'QRIS_STATIS',referensi_pembayaran:'DANA-MUTASI-12345'
  }),/Status pesanan/);
  assert.equal(h.paid.length,1);
});

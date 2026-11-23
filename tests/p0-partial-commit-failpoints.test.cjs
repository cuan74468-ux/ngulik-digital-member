'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');

// Isolated, in-memory Google Sheets harness. No GAS deployment, provider, or network.
function fixture(initial='MENUNGGU_VERIFIKASI'){
  const order={_row:2,order_id:'SYNTHETIC-ORDER',member_id:'BUYER',product_id:'TOPUP',
    harga_dasar:15000,kode_unik:123,total_bayar:15123,metode:'TRANSFER_BANK',
    created_at:new Date('2026-11-23T01:00:00Z'),expires_at:new Date('2027-11-23T01:00:00Z'),
    status:initial,ref_member_id:'SPONSOR'};
  const buyer={_row:2,member_id:'BUYER',role:'MEMBER',status:'AKTIF',referred_by:'SPONSOR',saldo_kredit:0};
  const sponsor={_row:3,member_id:'SPONSOR',role:'MEMBER',status:'AKTIF'};
  const product={product_id:'TOPUP',tipe:'TOPUP_KREDIT',kredit_diberikan:10,komisi_persen:25,bisa_komisi:true};
  const db={orders:[order],members:[buyer,sponsor],katalog_produk:[product],
    credits_ledger:[],affiliate_commissions:[],audit_logs:[]};
  const events=[],fail={at:null,used:false};
  const ctx=vm.createContext({console:{error(){},log(){},warn(){}},Date,Number,String});
  vm.runInContext(source,ctx,{filename:'Code.gs'});
  let locked=false,serial=0;
  ctx.withLock_=fn=>{
    assert.equal(locked,false,'Nested or overlapping transaction without shared lock');
    locked=true;serial++;
    try{return fn();}finally{locked=false;}
  };
  ctx.now_=()=>new Date('2026-11-23T02:00:00Z');
  ctx.settings_=()=>({komisi_persen:25,masa_tahan_hari:14,notif_admin_wa_aktif:true,wa_admin:'6281234500000'});
  ctx.byId_=(table,column,value)=>db[table].find(r=>String(r[column])===String(value))||null;
  ctx.findRows_=(table,pred)=>db[table].filter(pred);
  ctx.readAll_=table=>db[table].slice();
  ctx.recordId_=prefix=>prefix+'-SYNTHETIC-'+(db.credits_ledger.length+db.affiliate_commissions.length+1);
  function trip(point){
    if(fail.at===point&&!fail.used){fail.used=true;throw new Error('INJECTED_FAILURE_'+point);}
  }
  ctx.appendRow_=(table,data)=>{
    trip('append:'+table);
    const r={...data,_row:db[table].length+2};
    db[table].push(r);events.push('append:'+table);
    return r._row;
  };
  ctx.updateRow_=(table,row,patch)=>{
    trip('update:'+table+':'+(patch.status||'other'));
    const target=db[table].find(x=>x._row===row);
    assert.ok(target,'missing mock row '+table+'/'+row);
    Object.assign(target,patch);events.push('update:'+table+':'+(patch.status||'other'));
  };
  ctx.tbl_=name=>{
    assert.equal(name,'members');
    return {headers:['saldo_kredit'],sheet:{getRange:()=>({
      getFormula:()=>'',setValue:value=>{trip('member:saldo');buyer.saldo_kredit=value;events.push('member:saldo');}
    })}};
  };
  ctx.logAudit_=(...args)=>{
    trip('audit:'+args[2]);
    db.audit_logs.push({action:args[2],entity_id:args[4],_row:db.audit_logs.length+2});
  };
  ctx.notifyPaidOrder_=()=>{};
  ctx.ngdStarterUnlocked_=()=>true;
  ctx.orderView_=o=>({order_id:o.order_id,status:o.status});
  ctx.sendFonnteWa_=()=>({status:'ACCEPTED'});
  const admin={member_id:'ADMIN',role:'ADMIN'};
  const pay={dana_diterima:true,nominal_terverifikasi:15123,referensi_pembayaran:'BANK-SETTLEMENT-ONE',metode_diterima:'TRANSFER_BANK'};
  function approve(){return ctx.transitionOrder_(admin,order.order_id,'approve',pay);}
  function refund(){return ctx.refundOrder_(admin,{order_id:order.order_id,alasan:'Pengembalian disetujui',referensi_refund:'BANK-REFUND-ONE',dana_sudah_dikembalikan:true});}
  function reconcile(){return ctx.financeFindings_(db.orders,db.credits_ledger,db.affiliate_commissions,db.katalog_produk,
    {komisi_persen:25},db.members);}
  return {db,order,buyer,product,approve,refund,reconcile,ctx,events,fail,admin,get locks(){return serial;}};
}
function count(db,table,kind){return db[table].filter(x=>x.tipe===kind).length;}
test('approval replay after successful settlement cannot double post credits or commission',()=>{
  const h=fixture();
  assert.equal(h.approve().status,'FULFILLED');
  assert.equal(h.approve().status,'FULFILLED');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),1);
  assert.equal(h.db.affiliate_commissions.length,1);
  assert.equal(h.buyer.saldo_kredit,10);
  assert.equal(h.locks,2);
});
test('partial: crash after PAID before ledger leaves review flag; replay never posts unverified credits',()=>{
  const h=fixture();h.fail.at='append:credits_ledger';
  const first=h.approve();
  assert.equal(first.needs_review,true);
  assert.equal(h.order.status,'PAID');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),0);
  assert.equal(h.approve().status,'PAID');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),0);
  assert.ok(h.reconcile().findings[0].issues.includes('TOPUP_PAID_LEDGER_COUNT_0'));
});
test('partial: ledger committed then member snapshot write fails; no second topup on approval replay',()=>{
  const h=fixture();h.fail.at='member:saldo';
  assert.equal(h.approve().needs_review,true);
  assert.equal(h.order.status,'PAID');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),1);
  assert.equal(h.approve().status,'PAID');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),1);
  assert.ok(h.reconcile().findings[0].issues.includes('TOPUP_PAID_LEDGER_POSTED_STATUS_REVIEW'));
});
test('partial: order fulfilled then commission append fails; reconciliation catches missing commission',()=>{
  const h=fixture();h.fail.at='append:affiliate_commissions';
  assert.equal(h.approve().needs_review,true);
  assert.equal(h.order.status,'FULFILLED');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),1);
  assert.equal(h.db.affiliate_commissions.length,0);
  assert.equal(h.approve().status,'FULFILLED');
  assert.equal(h.db.affiliate_commissions.length,0);
  assert.ok(h.reconcile().findings[0].issues.includes('COMMISSION_MISSING'));
});
test('refund partial: commission reversed then ledger write fails; retry safely finishes without double reversal',()=>{
  const h=fixture();h.approve();
  h.fail.at='append:credits_ledger';
  assert.throws(()=>h.refund(),/INJECTED_FAILURE/);
  assert.equal(h.order.status,'FULFILLED');
  assert.equal(h.db.affiliate_commissions[0].status,'REVERSED');
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),0);
  assert.ok(h.reconcile().findings[0].issues.includes('COMMISSION_REVERSED_BEFORE_REFUND'));
  h.refund();
  assert.equal(h.order.status,'REFUNDED');
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),1);
  assert.equal(h.db.affiliate_commissions.length,1);
  assert.equal(h.buyer.saldo_kredit,0); // Non-formula snapshot is refreshed after refund reversal.
  assert.equal(h.ctx.creditBalance_('BUYER'),0);
});
test('refund partial: credit reversal posted then status write fails; automatic retry blocked, no second debit',()=>{
  const h=fixture();h.approve();
  h.fail.at='update:orders:REFUNDED';
  assert.throws(()=>h.refund(),/Jangan ulangi refund/);
  assert.equal(h.order.status,'FULFILLED');
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),1);
  assert.equal(h.ctx.creditBalance_('BUYER'),0);
  assert.throws(()=>h.refund(),/REFUND_ADJUST_ALREADY_EXISTS/);
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),1);
  assert.ok(h.reconcile().findings[0].issues.includes('REFUND_ADJUST_WITHOUT_REFUNDED_STATUS'));
});
test('refund snapshot write failure keeps order reviewable and blocks a second credit reversal',()=>{
  const h=fixture();h.approve();
  h.fail.at='member:saldo';
  assert.throws(()=>h.refund(),/saldo tampilan belum sinkron/);
  assert.equal(h.order.status,'FULFILLED');
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),1);
  assert.equal(h.buyer.saldo_kredit,10);
  assert.throws(()=>h.refund(),/REFUND_ADJUST_ALREADY_EXISTS/);
  assert.ok(h.reconcile().findings[0].issues.includes('REFUND_ADJUST_WITHOUT_REFUNDED_STATUS'));
});
test('non-posted refund adjustment blocks replay before any commission or order writes',()=>{
  const h=fixture();h.approve();
  h.db.credits_ledger.push({_row:3,member_id:'BUYER',ref_id:h.order.order_id,tipe:'ADJUST_REFUND',jumlah:-10,status:'PENDING'});
  const n=h.events.length;
  assert.throws(()=>h.refund(),/Ledger order memuat posting belum final/);
  assert.equal(h.events.length,n);
});
test('duplicate refunded order is rejected and does not reverse credit twice',()=>{
  const h=fixture();h.approve();h.refund();
  assert.throws(()=>h.refund(),/Pesanan tidak dapat direfund/);
  assert.equal(count(h.db,'credits_ledger','ADJUST_REFUND'),1);
});
test('expired order cannot directly receive admin paid approval',()=>{
  const h=fixture('PENDING');
  h.order.expires_at='2020-01-01T00:00:00Z';
  assert.throws(()=>h.approve(),/kedaluwarsa/);
  assert.equal(h.order.status,'EXPIRED');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),0);
});
test('WhatsApp confirm is not proof of funds and never marks order PAID',()=>{
  const h=fixture('PENDING');
  const out=h.ctx.transitionOrder_({member_id:'BUYER',role:'MEMBER'},h.order.order_id,'confirm',{});
  assert.equal(out.status,'MENUNGGU_VERIFIKASI');
  assert.equal(h.order.status,'MENUNGGU_VERIFIKASI');
  assert.equal(count(h.db,'credits_ledger','TOPUP'),0);
  assert.equal(h.db.affiliate_commissions.length,0);
});

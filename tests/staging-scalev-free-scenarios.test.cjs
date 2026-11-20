'use strict';
/**
 * STAGING-ONLY scenario audit for the four Scalev Free launch SKUs.
 * Uses actual GAS business functions inside a Node VM with synthetic rows.
 * NO Google Sheet, Scalev, payment gateway, e-mail or WhatsApp requests.
 *
 * These tests describe CURRENT source behavior. They do not assert that
 * hosted Scalev checkout or a reconciliation bridge has been implemented.
 * Unmet target behavior is explicitly recorded as TODO acceptance gates.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const launch=[
  {id:'P-VIDEO-AI',type:'JASA_SEKALI',price:50000,rate:20,bonus:0,duration:0},
  {id:'P-3IN1',type:'LANGGANAN_30H',price:99000,rate:25,bonus:0,duration:30},
  {id:'P-POS',type:'LISENSI_SEKALI',price:149000,rate:25,bonus:0,duration:0},
  {id:'P-INTEGRASI-GAS',type:'JASA_SEKALI',price:400000,rate:20,bonus:25,duration:0}
];
function sandbox(sku,options={}){
  const messages=[],audits=[],writes=[],outbound=[];
  const member={_row:2,member_id:'M-BUYER',role:'MEMBER',status:'AKTIF',
    status_pos:'BELUM',referred_by:options.referrer===undefined?'M-AFF':options.referrer,
    akses_3in1_sampai:'',saldo_kredit:0};
  const product={_row:2,product_id:sku.id,tipe:sku.type,aktif:true,nama:sku.id,
    harga:sku.price,komisi_persen:sku.rate,bisa_komisi:true,
    kredit_diberikan:sku.bonus,durasi_hari:sku.duration};
  const order={_row:2,order_id:'STG-SCALEV-SYNTHETIC-01',member_id:member.member_id,
    product_id:sku.id,nama_produk:sku.id,status:'PAID',harga_dasar:sku.price,
    total_bayar:sku.price,ref_member_id:member.referred_by,
    catatan_admin:'',metode:'SCALEV_SYNTHETIC_ONLY'};
  const rows={members:[member],katalog_produk:[product],orders:[order],
    affiliate_commissions:[],credits_ledger:[],audit_logs:[]};
  const ctx=vm.createContext({console:{log:()=>{},warn:()=>{},error:()=>{}},Date,Number,JSON});
  vm.runInContext(code,ctx,{timeout:10000});
  ctx.settings_=()=>({komisi_persen:25,masa_tahan_hari:14,
    komisi_hanya_order_pertama:false});
  ctx.now_=()=>new Date('2026-11-20T03:00:00.000Z');
  ctx.recordId_=kind=>kind+'-SYNTH-'+(rows.affiliate_commissions.length+1);
  ctx.byId_=(table,key,value)=>(rows[table]||[]).find(x=>String(x[key])===String(value))||null;
  ctx.findRows_=(table,pred)=>(rows[table]||[]).filter(pred);
  ctx.readAll_=table=>rows[table]||[];
  ctx.updateRow_=(table,row,patch)=>{
    assert.ok(rows[table]&&rows[table][row-2],'Unknown synthetic row');
    Object.assign(rows[table][row-2],patch);
    writes.push({table,keys:Object.keys(patch)});
  };
  ctx.appendRow_=(table,row)=>{
    assert.ok(rows[table],'Write escaped synthetic harness: '+table);
    rows[table].push({...row,_row:rows[table].length+2});
    writes.push({table,kind:'append'});
  };
  ctx.logAudit_=(actor,role,action,entity,entityId,before,after,details)=>{
    audits.push({actor,role,action,entity,entityId,before,after,details});
    rows.audit_logs.push({action,entity_id:entityId,_row:rows.audit_logs.length+2});
  };
  ctx.notifyPaidOrder_=()=>outbound.push('suppressed_notify');
  ctx.sendFonnteWa_=()=>{throw Error('REAL_WHATSAPP_NOT_ALLOWED');};
  ctx.UrlFetchApp={fetch:()=>{throw Error('REAL_NETWORK_NOT_ALLOWED');}};
  ctx.grantCredits_=()=>{throw Error('UNEXPECTED_TOKEN_CREDIT_IN_THIS_LAUNCH_SKU');};
  const paid=()=>ctx.onPaid_(order,{role:'ADMIN',member_id:'TEST-ADMIN'});
  return {ctx,member,product,order,rows,writes,audits,outbound,paid};
}
test('STAGING SKU price, duration and referral scenario matrix is explicit',()=>{
  assert.deepEqual(launch.map(s=>[s.id,s.price,s.rate,s.duration]),[
    ['P-VIDEO-AI',50000,20,0],['P-3IN1',99000,25,30],
    ['P-POS',149000,25,0],['P-INTEGRASI-GAS',400000,20,0]]);
  // These are fixture snapshots, not assertions about a live Scalev catalog.
  assert.ok(launch.every(s=>s.price>0&&s.rate>=0&&s.rate<=50));
});
for(const sku of launch){
  test('STAGING current onPaid_ semantics: '+sku.id,()=>{
    const h=sandbox(sku);
    h.paid();
    assert.equal(h.rows.affiliate_commissions.length,1);
    const commission=h.rows.affiliate_commissions[0];
    assert.equal(commission.status,'PENDING');
    assert.equal(commission.nominal,Math.floor(sku.price*sku.rate/100));
    assert.equal(commission.referrer_id,'M-AFF');
    assert.equal(commission.order_id,h.order.order_id);
    assert.equal(h.rows.credits_ledger.length,0);
    h.paid(); // duplicated fulfillment callback must not create another commission
    assert.equal(h.rows.affiliate_commissions.length,1);
    assert.equal(h.rows.credits_ledger.length,0);
    assert.equal(h.outbound.every(x=>x==='suppressed_notify'),true);
    if(sku.type==='JASA_SEKALI'){
      assert.equal(h.order.status,'PAID');
      assert.match(h.order.catatan_admin,/JASA_SIAP_DIPROSES_ADMIN/);
      assert.equal(h.rows.credits_ledger.length,0);
    }else if(sku.id==='P-POS'){
      assert.equal(h.member.status_pos,'DIAJUKAN');
      assert.equal(h.order.status,'PAID');
    }else if(sku.id==='P-3IN1'){
      // CURRENT implementation grants 30 days at payment, not handover.
      assert.equal(h.order.status,'FULFILLED');
      assert.ok(new Date(h.member.akses_3in1_sampai).getTime()>Date.now()+29*86400000);
    }
  });
}

test('STAGING regression: same fulfilled 3-in-1 order may be retried, but never adds another 30 days',()=>{
  const h=sandbox(launch.find(x=>x.id==='P-3IN1'));
  const stale={...h.order}; // Simulate delayed callback carrying old PAID snapshot.
  h.paid();
  const first=new Date(h.member.akses_3in1_sampai).getTime();
  assert.equal(h.order.status,'FULFILLED');
  assert.ok(h.order.fulfilled_at);
  const firstFulfilled=h.writes.filter(x=>x.table==='orders'&&x.keys?.includes('fulfilled_at')).length;
  h.paid(); // Retried same object.
  h.ctx.onPaid_(stale,{role:'ADMIN',member_id:'TEST-ADMIN'}); // Retried stale snapshot.
  assert.equal(new Date(h.member.akses_3in1_sampai).getTime(),first);
  assert.equal(h.writes.filter(x=>x.table==='orders'&&x.keys?.includes('fulfilled_at')).length,firstFulfilled);
  assert.equal(h.rows.affiliate_commissions.length,1);
});
test('STAGING regression: a genuinely new 3-in-1 paid order still extends the prior entitlement',()=>{
  const h=sandbox(launch.find(x=>x.id==='P-3IN1'));
  h.paid();
  const first=new Date(h.member.akses_3in1_sampai).getTime();
  const renewal={...h.order,_row:3,order_id:'STG-SCALEV-SYNTHETIC-RENEWAL',status:'PAID',fulfilled_at:''};
  h.rows.orders.push(renewal);
  h.ctx.onPaid_(renewal,{role:'ADMIN',member_id:'TEST-ADMIN'});
  assert.ok(new Date(h.member.akses_3in1_sampai).getTime()-first>=29*86400000);
  assert.equal(h.rows.affiliate_commissions.length,2);
});
test('STAGING regression: partial subscription failure after entitlement update cannot double-grant',()=>{
  const h=sandbox(launch.find(x=>x.id==='P-3IN1'));
  const normalUpdate=h.ctx.updateRow_;
  h.ctx.updateRow_=(table,row,patch)=>{
    if(table==='orders'&&patch.status==='FULFILLED')throw Error('SIMULATED_ORDER_WRITE_FAILURE');
    return normalUpdate(table,row,patch);
  };
  assert.throws(()=>h.paid(),/SIMULATED_ORDER_WRITE_FAILURE/);
  const granted=new Date(h.member.akses_3in1_sampai).getTime();
  assert.ok(granted>Date.now());
  assert.equal(h.order.status,'PAID');
  assert.equal(h.audits.filter(x=>x.action==='SUBSCRIPTION_ENTITLEMENT_CLAIMED').length,1);
  assert.throws(()=>h.paid(),/pernah diproses/i);
  assert.equal(new Date(h.member.akses_3in1_sampai).getTime(),granted);
  assert.equal(h.audits.filter(x=>x.action==='SUBSCRIPTION_ENTITLEMENT_CLAIMED').length,1);
});
test('STAGING regression: a failed member update leaves entitlement untouched and retry needs review',()=>{
  const h=sandbox(launch.find(x=>x.id==='P-3IN1'));
  const normalUpdate=h.ctx.updateRow_;
  h.ctx.updateRow_=(table,row,patch)=>{
    if(table==='members')throw Error('SIMULATED_MEMBER_WRITE_FAILURE');
    return normalUpdate(table,row,patch);
  };
  assert.throws(()=>h.paid(),/SIMULATED_MEMBER_WRITE_FAILURE/);
  assert.equal(h.member.akses_3in1_sampai,'');
  assert.equal(h.audits.filter(x=>x.action==='SUBSCRIPTION_ENTITLEMENT_CLAIMED').length,1);
  assert.throws(()=>h.paid(),/pernah diproses/i);
  assert.equal(h.member.akses_3in1_sampai,'');
});
test('STAGING regression: self-referral blocks the commission and audits the decision once',()=>{
  const h=sandbox(launch[0],{referrer:'M-BUYER'});
  h.paid(); h.paid();
  assert.equal(h.rows.affiliate_commissions.length,0);
  assert.equal(h.audits.filter(x=>x.action==='COMMISSION_SELF_REFERRAL_BLOCKED').length,1);
  // A paid service must still enter processing; rejected referral cannot block purchase.
  assert.match(h.order.catatan_admin,/JASA_SIAP_DIPROSES_ADMIN/);
});
test('STAGING regression: padded/mixed-case member self-referral is blocked',()=>{
  const h=sandbox(launch[0],{referrer:' m-buyer '});
  h.paid();
  assert.equal(h.rows.affiliate_commissions.length,0);
  assert.equal(h.audits.filter(x=>x.action==='COMMISSION_SELF_REFERRAL_BLOCKED').length,1);
});
test('STAGING no referred member means no commission',()=>{
  const h=sandbox(launch[0],{referrer:''});h.paid();
  assert.equal(h.rows.affiliate_commissions.length,0);
});
test('STAGING current contract requires a linked member referral, not order claim alone',()=>{
  const h=sandbox(launch[0],{referrer:''});
  h.order.ref_member_id='M-AFF';h.paid();
  assert.equal(h.rows.affiliate_commissions.length,0);
});
test('STAGING a payout source must exist, and must be a valid PAID/fulfilled order',()=>{
  // This is a source-code gate, distinct from Scalev Free reconciliation.
  assert.match(code,/function requestPayout_\(m,p\)/);
  assert.match(code,/\['PAID','FULFILLED'\]\.indexOf\(order\.status\)/);
});
test('STAGING payments need verified amount, settlement reference and actual channel',()=>{
  const required=code.slice(code.indexOf('function transitionOrder_('),code.indexOf('function ngdCreditReferenceCheck_('));
  assert.match(required,/nominal_terverifikasi/);
  assert.match(required,/received===exact/);
  assert.match(required,/referensi_pembayaran/);
  assert.match(required,/metode_diterima/);
  assert.match(required,/alreadyUsed/);
});
test('STAGING business flow and public payment remain isolated from Scalev',()=>{
  assert.doesNotMatch(code,/https:\/\/app\.scalev\.com\/api\//);
  assert.ok(!launch.some(x=>x.id==='P-TOKEN-10'));
  assert.ok(launch.every(x=>x.id!=='P-EBOOK'&&x.id!=='P-CLASS-CH1'));
});
/**
 * Pending release gates, deliberately TODO rather than falsely counted PASS.
 * Must be implemented and tested through the REAL reconciliation adapter.
 */
test.todo('P0: authenticated Scalev paid confirmation is mapped idempotently to NGD orders without API/webhook on Free');
test.todo('P0: Scalev order ID uniqueness, refund/reversal and amount mismatch prevent ledger/commission duplication');
test.todo('P0: partner attribution survives cross-domain redirect and rejects self-referral, spoofing and late claims');
test.todo('P0: P-3IN1 entitlement begins at confirmed handover, and renewals extend from the later valid date');
test.todo('P0: service briefs link to verified paid orders and create exactly one work item without WhatsApp');
test.todo('P0: P-POS activation uses actual compatible license and never promises unsupported Sheets integration');
test.todo('P0: 25-token benefit on P-INTEGRASI-GAS is decided and reconciled only once');
test.todo('P0: failed/duplicate exports, retries, refunds and 31-day provider history expiry preserve audit trail');
test.todo('P0: any real Scalev checkout stays disabled until owner KYC, terms and payment release approval');

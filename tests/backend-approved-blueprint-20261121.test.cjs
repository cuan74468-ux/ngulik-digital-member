'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function sandbox(environment='STAGING',change={}){
  const calls={write:0,network:0},logs=[];
  const ctx=vm.createContext({Date,Number,Math,JSON,console:{log:x=>logs.push(x),warn(){}}});
  vm.runInContext(code,ctx,{timeout:10000});
  const id='SYNTHETIC_STAGING_DATABASE';
  const props={NGD_ENVIRONMENT:environment,NGD_DB_ID:id,
    NGD_ADMIN_LOGIN_DB_ID:id,NGD_ADMIN_LOGIN_ENABLED:'true',
    NGD_MUTATIONS_ENABLED:'false',NGD_FINANCE_ENABLED:'false'};
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]??''})};
  ctx.db_=()=>({getId:()=>id});
  const expected=[
    ['P-STARTER-15',15000,'PRODUK_DIGITAL',15,5000,0],
    ['P-TOKEN-10',7000,'TOPUP_KREDIT',10,0,10],
    ['P-TOKEN-35',20000,'TOPUP_KREDIT',35,0,10],
    ['P-TOKEN-100',50000,'TOPUP_KREDIT',100,0,10],
    ['P-3IN1',99000,'LANGGANAN_30H',0,0,25],
    ['P-POS',149000,'LISENSI_SEKALI',0,0,25],
    ['P-VIDEO-AI',50000,'JASA_SEKALI',0,0,20],
    ['P-INTEGRASI-GAS',400000,'JASA_SEKALI',0,0,20]
  ];
  const rows=expected.map(([product_id,harga,tipe,kredit_diberikan,komisi_nominal_tetap,komisi_persen])=>
    ({product_id,harga,tipe,kredit_diberikan,komisi_nominal_tetap,komisi_persen,aktif:true}));
  Object.assign(rows.find(x=>x.product_id==='P-TOKEN-10'),change);
  let orders=[];
  ctx.byId_=(table,key,val)=>table==='katalog_produk'?
    rows.find(x=>String(x[key])===String(val))||null:null;
  ctx.readAll_=table=>table==='orders'?orders:[];
  ctx.findRows_=(table,pred)=>ctx.readAll_(table).filter(pred);
  ctx.appendRow_=ctx.updateRow_=()=>{calls.write++;throw Error('ILLEGAL_WRITE');};
  ctx.sendFonnteWa_=()=>{calls.network++;throw Error('ILLEGAL_WA');};
  ctx.UrlFetchApp={fetch:()=>{calls.network++;throw Error('ILLEGAL_NETWORK');}};
  return {ctx,rows,logs,calls,orders,setOrders:xs=>{orders=xs;}};
}
test('owner decision: QRIS invoice must subtract three-digit code, and reject code >= price',()=>{
  assert.match(code,/taken\[price+n\]/);
  assert.match(code,/total_bayar:price\+code/);
  assert.match(code,/require_\(price>max/);
  assert.doesNotMatch(code,/total_bayar:price-code,status:'PENDING'/);
});
test('Starter Rp15.000 fixed Rp5.000 and token Blueprint prices are reviewable without DB writes',()=>{
  const x=sandbox();
  const r=x.ctx.ngdApprovedBlueprintAuditReadOnly();
  assert.equal(r.environment,'STAGING');
  assert.equal(r.verdict,'BLUEPRINT_SOURCE_DATA_PARITY_OK');
  assert.equal(r.catalogue.length,8);
  assert.equal(r.database_writes,0);
  assert.equal(r.finance_activated,false);
  assert.equal(x.calls.write,0);assert.equal(x.calls.network,0);
  assert.match(x.logs.join(' '),/NGD_APPROVED_BLUEPRINT_STAGING_AUDIT/);
});
test('STAGING reports mismatched SKU and outstanding legacy orders, never silently repairs',()=>{
  const x=sandbox('STAGING',{harga:10000});
  x.setOrders([{status:'PENDING',product_id:'P-TOKEN-10'}]);
  const r=x.ctx.ngdApprovedBlueprintAuditReadOnly();
  assert.equal(r.verdict,'RECONCILIATION_REQUIRED');
  assert.equal(r.open_orders_count,1);
  assert.deepEqual(Array.from(r.catalogue.find(y=>y.sku==='P-TOKEN-10').issues),['PRICE_MISMATCH']);
  assert.equal(x.calls.write,0);
});
test('auditor refuses Production before catalog read, write or provider call',()=>{
  const x=sandbox('PRODUCTION');
  x.ctx.byId_=()=>{throw Error('DATA_LEAK');};
  assert.throws(()=>x.ctx.ngdApprovedBlueprintAuditReadOnly(),/Workspace bukan lingkungan STAGING/);
  assert.equal(x.calls.write,0);assert.equal(x.calls.network,0);
});
test('referral unlock is server-derived only after verified paid Starter; refund blocks link',()=>{
  const x=sandbox();
  x.setOrders([{member_id:'M-SPONSOR',product_id:'P-STARTER-15',status:'PENDING'}]);
  assert.equal(x.ctx.ngdStarterUnlocked_('M-SPONSOR'),false);
  x.setOrders([{member_id:'M-SPONSOR',product_id:'P-STARTER-15',status:'REFUNDED'}]);
  assert.equal(x.ctx.ngdStarterUnlocked_('M-SPONSOR'),false);
  x.setOrders([{member_id:'M-SPONSOR',product_id:'P-STARTER-15',status:'FULFILLED'}]);
  assert.equal(x.ctx.ngdStarterUnlocked_('M-SPONSOR'),true);
  assert.equal(x.ctx.ngdStarterUnlocked_('OTHER'),false);
});
test('only Starter and token credits approve commissions immediately, other paid work waits',()=>{
  const x=sandbox();
  for(const id of ['P-STARTER-15','P-TOKEN-10','P-TOKEN-35','P-TOKEN-100'])
    assert.equal(x.ctx.ngdCommissionTiming_({product_id:id,tipe:id==='P-STARTER-15'?'PRODUK_DIGITAL':'TOPUP_KREDIT'}),'INSTANT_ON_PAID');
  for(const type of ['JASA_SEKALI','LISENSI_SEKALI','LANGGANAN_30H'])
    assert.equal(x.ctx.ngdCommissionTiming_({product_id:'P-OTHER',tipe:type}),'HOLD_14_DAYS');
});

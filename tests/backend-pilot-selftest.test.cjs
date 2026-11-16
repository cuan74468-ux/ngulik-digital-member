'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const validSettings={
  payment_gateway_mode:'QRIS_STATIS',kode_unik_min:100,kode_unik_max:999,
  order_expiry_menit:60,cart_abandonment_menit:15,
  followup_member_otomatis:true,notif_admin_wa_aktif:true,
  wa_admin:'6289509016792',qris_atas_nama:'Ngulik Digital',
  qris_gambar_path:'https://example.com/qris.png'
};
function pilot(overrides={}){
  const messages=[],writes=[],calls=[];
  const state={
    config:{...validSettings,...(overrides.config||{})},
    environment:overrides.environment||'STAGING',
    orders:overrides.orders||[],
    product:overrides.product||{
      product_id:'P-TOKEN-10',tipe:'TOPUP_TOKEN',harga:'Rp10.000',kredit_diberikan:10
    }
  };
  const ctx=vm.createContext({console:{log:m=>messages.push(m),error:()=>{}},Date,Number,JSON});
  vm.runInContext(source,ctx,{timeout:10000});
  const id='TEST_STAGING_DATABASE';
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>({
    NGD_ENVIRONMENT:state.environment,NGD_DB_ID:id,NGD_ADMIN_LOGIN_DB_ID:id,
    NGD_ADMIN_LOGIN_ENABLED:'true',FONNTE_API_TOKEN:'FAKE_TEST_TOKEN',
    NGD_FINANCE_ENABLED:'false',NGD_MUTATIONS_ENABLED:'false'
  })[k]||''})};
  ctx.db_=()=>({getId:()=>id});
  ctx.settings_=()=>state.config;
  ctx.tbl_=name=>({headers:String(ctx.NGD.HEADERS[name]||'').split(',')});
  ctx.byId_=(table,key,value)=>table==='katalog_produk'&&value==='P-TOKEN-10'?state.product:null;
  ctx.readAll_=table=>table==='orders'?state.orders:[];
  for(const fn of ['appendRow_','updateRow_','sendFonnteWa_','onPaid_','grantCredits_']){
    ctx[fn]=()=>{writes.push(fn);throw Error('UNEXPECTED_SIDE_EFFECT_'+fn);};
  }
  ctx.UrlFetchApp={fetch:()=>{calls.push('network');throw Error('UNEXPECTED_NETWORK');}};
  return {ctx,state,messages,writes,calls};
}
test('STAGING pilot self-test checks schema, payment mode, QRIS setup and Fonnte without writes',()=>{
  const x=pilot();
  const result=x.ctx.ngdPilotSelfTestReadOnly();
  assert.equal(result.verdict,'READ_ONLY_CHECKS_PASS');
  assert.equal(result.failed,0);
  assert.equal(result.read_only,true);
  assert.ok(result.total>=15);
  assert.deepEqual(x.writes,[]);
  assert.deepEqual(x.calls,[]);
  assert.match(x.messages.join(' '),/NGD_PILOT_READONLY_QA/);
});
test('pilot refuses production before inspecting settings or creating a side effect',()=>{
  const x=pilot({environment:'PRODUCTION'});
  assert.throws(()=>x.ctx.ngdPilotSelfTestReadOnly(),/Workspace bukan lingkungan STAGING/);
  assert.equal(x.writes.length,0);
  assert.equal(x.calls.length,0);
});
test('pilot reports missing QRIS name and invalid status without sending WA',()=>{
  const x=pilot({config:{qris_atas_nama:'',payment_gateway_mode:'MAYAR_QRIS_OTOMATIS'}});
  const result=x.ctx.ngdPilotSelfTestReadOnly();
  assert.equal(result.verdict,'NEEDS_CONFIGURATION');
  assert.ok(result.checks.some(v=>v.name==='payment_mode'&&!v.ok));
  assert.ok(result.checks.some(v=>v.name==='qris_owner_name'&&!v.ok));
  assert.equal(x.writes.length,0);
});
test('pilot detects collision of active transfer totals',()=>{
  const x=pilot({orders:[
    {status:'PENDING',total_bayar:10123},
    {status:'MENUNGGU_VERIFIKASI',total_bayar:10123}
  ]});
  const result=x.ctx.ngdPilotSelfTestReadOnly();
  assert.ok(result.checks.some(v=>v.name==='active_amount_uniqueness'&&!v.ok));
});
test('pilot preserves exact top-up catalog amount and rejects malformed price',()=>{
  const x=pilot({product:{product_id:'P-TOKEN-10',tipe:'TOPUP_TOKEN',harga:'Rp10.000,50',kredit_diberikan:10}});
  const result=x.ctx.ngdPilotSelfTestReadOnly();
  assert.ok(result.checks.some(v=>v.name==='token10_product'&&!v.ok));
});
test('runtime payment controls require admin evidence and disallow unverified approval',()=>{
  assert.match(source,/require_\(p\.dana_diterima===true,'RECONCILIATION_REQUIRED'/);
  assert.match(source,/referensi_pembayaran/);
  assert.match(source,/withLock_\(function\(\)\{/);
  assert.match(source,/case 'adminVerifyOrder'/);
  assert.match(source,/case 'confirmPayment'/);
});

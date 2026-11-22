'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function harness(options={}){
  const product={_row:2,product_id:'P-VIDEO-AI',nama:'Jasa Video Iklan AI',
    aktif:true,tipe:'JASA_SEKALI',harga:50000,bisa_komisi:true,komisi_persen:20};
  const member={_row:2,member_id:'M-BUYER',nama:'Pembeli Contoh',role:'MEMBER',
    wa:'6281234567890',wa_verified:true,referred_by:'M-REF',status:'AKTIF'};
  const rows={orders:[],audit_logs:[],katalog_produk:[product],members:[member],
    affiliate_commissions:[]};
  const calls=[],audits=[];
  const ctx=vm.createContext({console:{error:()=>{}},URL,Date,Number,JSON,Math});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.ngdStagingWorkspaceInfo_=()=>({environment:'STAGING',external_providers_enabled:true,mayar_checkout_ready:true});
  ctx.requireMutationsEnabled_=()=>{};
  ctx.requireFinanceEnabled_=()=>{};
  ctx.settings_=()=>({payment_gateway_mode:options.mode||'MAYAR'});
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>({
    MAYAR_API_KEY:'test_key_1234567890123456789012',
    MAYAR_WEBHOOK_SECRET:'test_webhook_secret_abcdefghijklmnopqrstuvwxyz'
  })[key]||''})};
  ctx.withLock_=fn=>fn();
  ctx.byId_=(table,key,value)=>(rows[table]||[]).find(x=>String(x[key])===String(value))||null;
  ctx.findRows_=(table,fn)=>(rows[table]||[]).filter(fn);
  ctx.safeText_=(s,max)=>{const v=String(s||'').trim();assert.ok(v.length<=max);return v;};
  ctx.ngdPriceRupiah_=v=>Number(v);
  ctx.now_=()=>new Date('2026-11-20T06:00:00.000Z');
  ctx.Utilities={formatDate:()=> '261120'};
  ctx.uuid_=()=>String('aabbccddeeff0011223344556677');
  ctx.NGD={TZ:'Asia/Jakarta'};
  ctx.appendRow_=(table,row)=>{const list=rows[table];assert.ok(list,table);
    list.push({...row,_row:list.length+2});return list.length+1;};
  ctx.updateRow_=(table,n,patch)=>{if(options.failOrderUpdate&&table==='orders')
    throw Error('SYNTHETIC_SHEETS_TIMEOUT');
    Object.assign(rows[table][n-2],patch);};
  ctx.logAudit_=(actor,role,action,table,id,from,to,data)=>{
    audits.push({action,id}); rows.audit_logs.push({action,entity_id:id});};
  ctx.UrlFetchApp={fetch:(url,params)=>{
    calls.push({url,params});
    if(options.providerFailure)return {getResponseCode:()=>502,getContentText:()=>''};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
      data:{id:'inv_1234567890',transactionId:'txn_1234567890',
        link:'https://ngulik.myr.id/invoices/inv_1234567890'}})};
  }};
  const requestId='req_123456789012345678901';
  const create=(p={product_id:'P-VIDEO-AI',email:'contoh@example.com'},id=requestId)=>
    ctx.createMayarOrder_(member,p,id);
  return {ctx,rows,calls,audits,member,product,create,requestId};
}
test('mayar staging invoice: one exact-price invoice is bound to one NGD order',()=>{
  const h=harness(),o=h.create();
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].url,/\/hl\/v2\/invoices\/create$/);
  const request=JSON.parse(h.calls[0].params.payload);
  assert.equal(request.items[0].rate,50000);
  assert.equal(request.extraData.ngd_member_id,h.member.member_id);
  assert.equal(request.extraData.ngd_sku,'P-VIDEO-AI');
  assert.equal(request.extraData.ngd_order_id,o.order_id);
  assert.equal(o.metode,'MAYAR');
  assert.equal(o.status,'PENDING');
  assert.equal(o.kode_unik,0);
  assert.equal(o.total_bayar,50000);
  assert.equal(o.gateway_payment_url,'https://ngulik.myr.id/invoices/inv_1234567890');
  assert.equal(h.rows.affiliate_commissions.length,0);
  assert.deepEqual(h.audits.map(x=>x.action),['MAYAR_INVOICE_CLAIMED','MAYAR_INVOICE_LINKED']);
});
test('mayar retry returns same invoice, no duplicate HTTP charges or rows',()=>{
  const h=harness();const a=h.create(),b=h.create();
  assert.equal(a.order_id,b.order_id);
  assert.equal(h.rows.orders.length,1);
  assert.equal(h.calls.length,1);
});
test('mayar invoice response ambiguity leaves claimed order and blocks retry',()=>{
  const h=harness({providerFailure:true});
  assert.throws(()=>h.create(),/tidak mengonfirmasi/);
  assert.equal(h.rows.orders.length,1);
  assert.equal(h.calls.length,1);
  assert.throws(()=>h.create(),/perlu ditinjau/i);
  assert.equal(h.calls.length,1);
});
test('mayar Sheets failure after provider issued invoice never reissues on retry',()=>{
  const h=harness({failOrderUpdate:true});
  assert.throws(()=>h.create(),/SYNTHETIC_SHEETS_TIMEOUT/);
  assert.equal(h.rows.orders.length,1);
  assert.equal(h.calls.length,1);
  assert.throws(()=>h.create(),/perlu ditinjau/i);
  assert.equal(h.calls.length,1);
});
test('mayar mismatched SKU, altered price and QRIS-static mode reject without provider request',()=>{
  for(const change of ['unknown','price','mode']){
    const h=harness(change==='mode'?{mode:'QRIS_STATIS'}:{});
    if(change==='price')h.product.harga=50001;
    const fn=()=>h.create(change==='unknown'?
      {product_id:'P-TOKEN-10',email:'contoh@example.com'}:undefined);
    assert.throws(fn);
    assert.equal(h.calls.length,0);
    assert.equal(h.rows.orders.length,0);
  }
});
test('mayar unverified member phone, invalid email, weak request ID reject without charges',()=>{
  const h=harness();h.member.wa_verified=false;
  assert.throws(()=>h.create());
  assert.equal(h.calls.length,0);
  h.member.wa_verified=true;
  assert.throws(()=>h.create({product_id:'P-VIDEO-AI',email:'not-email'}));
  assert.throws(()=>h.create(undefined,'short'));
  assert.equal(h.calls.length,0);
});
test('mayar purchase cannot spoof server referral with client payload',()=>{
  const h=harness();h.create({product_id:'P-VIDEO-AI',email:'contoh@example.com',referred_by:'FAKE'});
  assert.equal(h.rows.orders[0].ref_member_id,'M-REF');
  assert.equal(h.rows.affiliate_commissions.length,0);
});
test('mayar member response reveals verified link but not gateway ref or internal audit',()=>{
  const h=harness(),v=h.create();assert.ok(v.gateway_payment_url);
  assert.equal(Object.hasOwn(v,'gateway_ref_id'),false);
  assert.equal(Object.hasOwn(v,'request_id'),false);
  assert.equal(Object.hasOwn(v,'ref_member_id'),false);
});
test('Mayar webhook source uses authoritative transactions v2 not deprecated payment detail',()=>{
  assert.match(source,/https:\/\/api\.mayar\.id\/hl\/v2\/transactions\//);
  assert.doesNotMatch(source,/https:\/\/api\.mayar\.id\/hl\/v2\/payment\//);
  assert.match(source,/case 'createMayarOrder':throw ngdError_\('NOT_AVAILABLE'/);
  assert.match(source,/requireFinanceEnabled_\(\)/);
  assert.match(source,/SUBSCRIPTION_ENTITLEMENT_CLAIMED/);
  assert.match(source,/COMMISSION_SELF_REFERRAL_BLOCKED/);
});

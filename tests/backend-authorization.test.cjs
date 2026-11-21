'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(){
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(src,ctx,{timeout:10000});
  const members=[
    {member_id:'ADMIN',role:'ADMIN',status:'AKTIF',nama:'Administrator',wa:'6281100000000',
      pin_hash:'SECRET_HASH_ADMIN',pin_salt:'SECRET_SALT_ADMIN',kode_referral:'ADM000'},
    {member_id:'M-1',role:'MEMBER',status:'AKTIF',nama:'Member Satu',wa:'6281100000001',
      pin_hash:'SECRET_HASH_MEMBER',pin_salt:'SECRET_SALT_MEMBER',kode_referral:'REF123'},
    {member_id:'M-2',role:'MEMBER',status:'AKTIF',nama:'Member Dua',wa:'6281100000002',
      kode_referral:'REF456'},
    {member_id:'M-3',role:'MEMBER',status:'SUSPENDED',nama:'Nonaktif',
      wa:'6281100000003',kode_referral:'REF789'}
  ];
  const orders=[
    {order_id:'ORDER-1',member_id:'M-1',nama_produk:'Test',status:'PENDING',
      total_bayar:25000,catatan_admin:'SECRET_ADMIN_NOTE',request_id:'SECRET_REQUEST'},
    {order_id:'ORDER-2',member_id:'M-2',nama_produk:'Test Dua',status:'FULFILLED',
      total_bayar:35000,catatan_admin:'ANOTHER_SECRET'}
  ];
  const database={
    members,orders,credits_ledger:[],katalog_produk:[],ai_tools:[],
    modul_belajar:[],affiliate_commissions:[],klik_log:[],
    pengaturan_sistem:[],ringkasan:[]
  };
  const tokens={'admin-token':members[0],'member-token':members[1],
    'second-token':members[2],'suspended-token':members[3]};
  ctx.member_=(token)=>{
    if(!Object.prototype.hasOwnProperty.call(tokens,token))throw new Error('Sesi tidak valid.');
    return tokens[token];
  };
  ctx.readAll_=table=>database[table]||[];
  ctx.findRows_=(table,predicate)=>(database[table]||[]).filter(predicate);
  ctx.byId_=(table,column,id)=>(database[table]||[])
    .find(row=>String(row[column])===String(id))||null;
  ctx.creditBalance_=()=>0;
  ctx.settings_=()=>({nama_brand:'Ngulik Digital',wa_admin:'',kuota_gelombang:50,
    mode_pendaftaran:'TERTUTUP',teks_disclosure_affiliate:'Disclosure'});
  ctx.isoWib_=d=>new Date(d).toISOString();
  const action=(name,token='',payload={})=>
    vm.runInContext('apiRouter_('+[name,token,payload,'REQUEST_ID_TEST_123456'].map(v=>JSON.stringify(v)).join(',')+')',
      ctx,{timeout:2000});
  return {ctx,action,members,orders};
}
test('member profile never includes PIN hashes, salts or internal row IDs',()=>{
  const h=fixture(),response=h.action('getMe','member-token');
  assert.equal(response.member_id,'M-1');
  for(const key of ['pin_hash','pin_salt','_row','request_id','verified_by'])
    assert.equal(Object.hasOwn(response,key),false,key);
});
test('unauthenticated callers cannot read member tools or private orders',()=>{
  const h=fixture();
  for(const action of ['getMe','getTools','listMyOrders','adminListOrders','adminListMembers'])
    assert.throws(()=>h.action(action,'UNAUTHORIZED'),/Sesi tidak valid/);
});
test('ordinary member cannot read ADMIN routes',()=>{
  const h=fixture();
  for(const action of ['adminListMembers','adminListWaitingList','adminListOrders',
    'adminGetReconciliation','adminListCommissions','adminGetSettings']){
    assert.throws(()=>h.action(action,'member-token'),/Akses tidak diizinkan/);
  }
});
test('suspended member cannot read private routes',()=>{
  const h=fixture();
  for(const action of ['getMe','getTools','listMyOrders','getAffiliateDashboard']){
    assert.throws(()=>h.action(action,'suspended-token'),/Akun belum aktif/);
  }
});
test('member sees own orders and cannot access another member order',()=>{
  const h=fixture(),mine=h.action('listMyOrders','member-token');
  assert.equal(mine.length,1);
  assert.equal(mine[0].order_id,'ORDER-1');
  assert.equal(Object.hasOwn(mine[0],'catatan_admin'),false);
  assert.equal(Object.hasOwn(mine[0],'request_id'),false);
  assert.throws(()=>h.action('getOrder','member-token',{order_id:'ORDER-2'}),/Pesanan tidak ditemukan/);
});
test('ADMIN can list orders but member PIN hash remains hidden in member list',()=>{
  const h=fixture();
  const orders=h.action('adminListOrders','admin-token');
  assert.equal(orders.length,2);
  assert.equal(orders[0].catatan_admin,'ANOTHER_SECRET');
  const members=h.action('adminListMembers','admin-token');
  assert.equal(members.length,3);
  for(const m of members){
    assert.equal(Object.hasOwn(m,'pin_hash'),false);
    assert.equal(Object.hasOwn(m,'pin_salt'),false);
  }
});
test('public referral does not reveal referred member full WhatsApp or PIN',()=>{
  const h=fixture();
  h.orders.push({order_id:'PAID-STARTER-M1',member_id:'M-1',
    product_id:'P-STARTER-15',status:'FULFILLED'});
  const result=h.action('getPublicInfo','',{ref:'REF123'});
  assert.equal(result.referrer,'Member');
  assert.equal(result.mode,'TERTUTUP');
  assert.equal(Object.hasOwn(result,'pin_hash'),false);
  assert.equal(JSON.stringify(result).includes('6281100000001'),false);
});

test('admin-only runtime status is not available to members or visitors',()=>{
  const h=fixture();
  h.ctx.adminRuntimeStatus_=()=>({schema:{expected:26,ready:26},feature_flags:{finance:false}});
  assert.equal(h.action('adminGetRuntimeStatus','admin-token').schema.ready,26);
  assert.throws(()=>h.action('adminGetRuntimeStatus','member-token'),/Akses tidak diizinkan/);
  assert.throws(()=>h.action('adminGetRuntimeStatus','UNAUTHORIZED'),/Sesi tidak valid/);
  assert.ok(vm.runInContext('apiReadActions_()',h.ctx).includes('adminGetRuntimeStatus'));
});

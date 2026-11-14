'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const read=(f)=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const backend=read('apps-script/Code.gs'),catalog=read('apps-script/Catalog.gs');
const sample=(type='PRODUK_DIGITAL')=>({
  nama:'Ebook Bisnis UMKM',deskripsi:'Panduan bisnis digital praktis untuk UMKM.',
  tipe:type,harga:49000,kredit_diberikan:0,durasi_hari:0,
  perlu_approval_admin:false,bisa_komisi:true,urut:1
});
function fixture(){
  const rows=[];const audit=[];let writes=0;
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  vm.runInContext(catalog,ctx,{timeout:10000});
  ctx.sha256_=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
  ctx.withLock_=fn=>fn();
  ctx.byId_=(t,k,v)=>t==='katalog_produk'?rows.find(r=>r[k]===v)||null:null;
  ctx.readAll_=t=>t==='katalog_produk'?rows.map(x=>({...x})):[];
  ctx.appendRow_=(t,row)=>{
    assert.equal(t,'katalog_produk');writes++;
    rows.push({...row,_row:rows.length+2});
  };
  ctx.updateRow_=(t,row,patch)=>{
    assert.equal(t,'katalog_produk');writes++;
    Object.assign(rows[row-2],patch);
  };
  ctx.logAudit_=(...args)=>audit.push(args);
  const admin={member_id:'ADMIN',role:'ADMIN'};
  const create=(p=sample(),id='CREATE_ID_00000123456')=>
    ctx.catalogCreate_(admin,p,id);
  const update=(p)=>ctx.catalogUpdate_(admin,p);
  const setActive=(p)=>ctx.catalogSetActive_(admin,p);
  return {ctx,rows,audit,create,update,setActive,
    get writes(){return writes;}};
}
test('new admin offer is inactive by default and can be found by readable catalog',()=>{
  const h=fixture(),out=h.create();
  assert.equal(out.already_created,false);
  assert.match(out.item.product_id,/^P-[0-9A-F]{12}$/);
  assert.equal(out.item.aktif,false);
  assert.equal(out.item.checkout_supported,false);
  assert.equal(h.rows.length,1);
  assert.equal(h.writes,1);
  assert.equal(h.audit.length,1);
  assert.equal(h.audit[0][2],'CATALOG_CREATED');
  assert.equal(h.ctx.catalogAdminList_()[0].nama,'Ebook Bisnis UMKM');
});
test('idempotent create returns same product; replay with changed payload conflicts',()=>{
  const h=fixture(),first=h.create(),again=h.create();
  assert.equal(first.item.product_id,again.item.product_id);
  assert.equal(again.already_created,true);
  assert.equal(h.rows.length,1);
  assert.equal(h.writes,1);
  assert.throws(()=>h.create({...sample(),harga:99000}),/isi yang berbeda/);
  assert.equal(h.writes,1);
});
test('update requires current revision and preserves immutable product type',()=>{
  const h=fixture(),item=h.create().item;
  const payload={...sample(),product_id:item.product_id,revision:item.revision,harga:59000};
  const first=h.update(payload);
  assert.equal(first.updated,true);
  assert.equal(first.item.harga,59000);
  assert.notEqual(first.item.revision,item.revision);
  assert.equal(h.rows[0].harga,59000);
  assert.throws(()=>h.update({...payload,nama:'New text'}) ,/Produk telah berubah/);
  assert.throws(()=>h.update({...payload,revision:first.item.revision,tipe:'JASA_SEKALI',
    perlu_approval_admin:true}),/Tipe produk tidak dapat diubah/);
  assert.equal(h.writes,2);
});
test('soft-hide and restore product without removing original rows or touching orders',()=>{
  const h=fixture(),created=h.create().item;
  const opened=h.setActive({product_id:created.product_id,
    aktif:true,revision:created.revision});
  assert.equal(opened.item.aktif,true);
  const again=h.setActive({product_id:created.product_id,
    aktif:true,revision:created.revision});
  assert.equal(again.updated,false);
  const hidden=h.setActive({product_id:created.product_id,
    aktif:false,revision:opened.item.revision});
  assert.equal(hidden.item.aktif,false);
  assert.equal(h.rows.length,1);
  assert.equal(h.writes,3);
  assert.equal(h.audit.filter(a=>a[2]==='CATALOG_STATUS').length,2);
  assert.equal(h.ctx.catalogAdminList_()[0].aktif,false);
});
test('invalid price, duration, booleans and injected fields reject before writes',()=>{
  const h=fixture();
  const invalid=[
    {...sample(),harga:'-9'},
    {...sample(),harga:'Rp49.000'},
    {...sample(),durasi_hari:31},
    {...sample(),bisa_komisi:'true'},
    {...sample(),role:'ADMIN'},
    {...sample(),nama:'X'},
    {...sample(),harga:50000001},
    {...sample('TOPUP_KREDIT'),kredit_diberikan:0},
    {...sample('JASA_SEKALI'),perlu_approval_admin:false},
  ];
  for(const v of invalid)assert.throws(()=>h.create(v),/(tidak valid|tidak diizinkan|terlalu pendek|memerlukan persetujuan|tanpa durasi|belum lengkap|kredit positif)/);
  assert.equal(h.rows.length,0);
  assert.equal(h.writes,0);
});
test('catalogue modification requires independent server-side staging gate',()=>{
  assert.match(backend,/NGD_CATALOG_ENABLED/);
  for(const action of ['adminCreateCatalogItem','adminUpdateCatalogItem','adminSetCatalogActive']){
    assert.match(backend,new RegExp("case '"+action+"'"));
  }
  assert.match(backend,/case 'adminListCatalog':return catalogAdminList_/);
  assert.match(backend,/'adminListCatalog'/);
  const config=read('config.js');
  assert.match(config,/catalogEnabled:\s*false/);
  assert.match(config,/demoMode:\s*true/);
  assert.match(config,/paymentsEnabled:\s*false/);
  assert.doesNotMatch(catalog,/\bMailApp\b|\bUrlFetchApp\b|\bGmailApp\b/);
});
test('an ordinary member is denied catalogue admin read and mutation routes',()=>{
  const h=fixture();
  h.ctx.activeMember_=()=>({role:'MEMBER',member_id:'M1'});
  h.ctx.admin_=()=>{throw h.ctx.ngdError_('FORBIDDEN','Akses tidak diizinkan.');};
  assert.throws(()=>h.ctx.apiRouter_('adminListCatalog','MEMBER',{},''),/Akses tidak diizinkan/);
  assert.throws(()=>h.ctx.apiRouter_('adminSetCatalogActive','MEMBER',
    {product_id:'P-X',aktif:true},'1234567890123456'),/Akses tidak diizinkan/);
  assert.equal(h.writes,0);
});

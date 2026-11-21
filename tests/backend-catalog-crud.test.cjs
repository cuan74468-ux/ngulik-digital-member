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
  ctx.tbl_=()=>({headers:vm.runInContext('NGD.HEADERS.katalog_produk',ctx).split(',')});
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
  assert.equal(out.item.checkout_supported,true);
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
  for(const v of invalid)assert.throws(()=>h.create(v),/(tidak valid|tidak diizinkan|terlalu pendek|memerlukan persetujuan|tanpa durasi|tidak memiliki durasi|belum lengkap|kredit positif)/);
  assert.equal(h.rows.length,0);
  assert.equal(h.writes,0);
});
test('catalogue modification uses master server-side mutation gate',()=>{
  assert.match(backend,/function requireMutationsEnabled_/);
  for(const action of ['adminCreateCatalogItem','adminUpdateCatalogItem','adminSetCatalogActive']){
    assert.match(backend,new RegExp("case '"+action+"'"));
  }
  assert.match(backend,/case 'adminListCatalog':return catalogAdminList_/);
  assert.match(backend,/'adminListCatalog'/);
  const config=read('config.js');
  assert.match(config,/catalogEnabled:\s*true/);
  assert.match(config,/memberWritesEnabled:\s*false/);
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

test('new install seeds nine documented commercial offers, including 10-token topup',()=>{
  const ids=[...backend.matchAll(/\['(P-(?:3IN1|POS|CANVA|TOKEN-10|KREDIT-50|KREDIT-150|KREDIT-400|VIDEO-AI|EBOOK))','/g)]
    .map(m=>m[1]);
  assert.equal(ids.length,9);
  assert.equal(new Set(ids).size,9);
  assert.match(backend,/function publicCatalog_\(\) \{return readAll_\('katalog_produk'\)[\s\S]*?\.sort\(/);
  const diagnostics=read('apps-script/Diagnostics.gs');
  assert.match(diagnostics,/katalog\.data\.length === readAll_\('katalog_produk'\)/);
  assert.doesNotMatch(diagnostics,/katalog\.data\.length === 6/);
});
test('Apps Script manifest requests only scopes actually exercised by current code',()=>{
  const manifest=JSON.parse(read('apps-script/appsscript.json'));
  assert.equal(manifest.webapp.executeAs,'USER_DEPLOYING');
  assert.equal(manifest.webapp.access,'ANYONE_ANONYMOUS');
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.external_request'),true);
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.send_mail'),false);
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'),true);
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.scriptapp'),true);
});


test('free digital catalogue items remain editable without enabling zero-price checkout',()=>{
  const h=fixture();
  const created=h.create({...sample(),harga:0},'FREE_DIGITAL_OFFER_1234').item;
  assert.equal(created.harga,0);
  const updated=h.update({...sample(),harga:0,nama:'Ebook Gratis untuk UMKM',
    product_id:created.product_id,revision:created.revision});
  assert.equal(updated.updated,true);
  assert.equal(updated.item.harga,0);
  assert.match(backend,/require_\(Number\.isInteger\(price\)&&price>0/);
  assert.throws(()=>h.create({...sample('JASA_SEKALI'),harga:0,perlu_approval_admin:true},
    'FREE_JASA_OFFER_123456'),/harga tidak valid|harga/i);
});

test('existing TOPUP_TOKEN is supported in Admin CRUD with positive credit validation',()=>{
  const h=fixture();
  const offer={...sample('TOPUP_TOKEN'),harga:10000,kredit_diberikan:10};
  const created=h.create(offer,'TOKEN_PRODUCT_CREATE_123456').item;
  assert.equal(created.tipe,'TOPUP_TOKEN');
  assert.equal(created.checkout_supported,true);
  assert.throws(()=>h.create({...offer,kredit_diberikan:0},
    'TOKEN_PRODUCT_BAD_12345678'),/kredit positif/);
  assert.equal(h.rows.length,1);
});

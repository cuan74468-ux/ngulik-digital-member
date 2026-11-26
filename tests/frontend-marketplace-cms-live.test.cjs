'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('js/app.js').replace(/^import .*?;\s*$/gm,'');
const cms=read('js/content-ui.js');
const css=read('assets/marketplace-public.css');
function preview(){
  const nodes={},listeners={};
  const el=id=>nodes[id]||(nodes[id]={
    innerHTML:'',textContent:'',append(){},addEventListener(type,fn){listeners[type]=fn;},
    querySelector(){return {disabled:false}}
  });
  const document={body:{classList:{toggle(){}},setAttribute(){}},
    getElementById:el,addEventListener(type,fn){listeners[type]=fn;},title:'',hidden:false};
  const window={NGD_CONFIG:{apiUrl:'',paymentsEnabled:false,memberWritesEnabled:false},
    addEventListener(){},scrollTo(){}};
  const ctx=vm.createContext({window,document,
    location:{href:'https://example.invalid/',origin:'https://example.invalid',hash:'',search:''},
    sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},
    history:{replaceState(){}},URL,URLSearchParams,Intl,Date,Number,Map,
    api(){throw Error('TEST MUST BE READ ONLY')},
    isConnected:()=>false,isWriteEnabled:()=>false,
    ApiError:class ApiError extends Error{},
    setTimeout,clearTimeout});
  vm.runInContext(cms,ctx,{timeout:3000});
  vm.runInContext(app,ctx,{timeout:5000});
  return {ctx,nodes};
}
test('storefront renders the actual Admin-managed name, description, price and image',()=>{
  const h=preview();
  vm.runInContext("state.catalog=[{product_id:'P-TEST',nama:'Katalog Warung Sederhana',deskripsi:'Pelanggan bisa lihat menu usaha.',tipe:'JASA_SEKALI',harga:'Rp99.000',durasi_hari:0,kredit_diberikan:0,aktif:true}];"+
    "state.info={wa_admin:'081234567890'};"+
    "state.siteContent=[{kind:'PRODUCT_IMAGE',placement:'P-TEST',title:'Foto Produk',image_path:'assets/media/foto-warung.webp'}];"+
    "state.route='katalog';render()",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/Katalog Warung Sederhana/);
  assert.match(html,/Pelanggan bisa lihat menu usaha/);
  assert.match(html,/Rp(?:\s|\u00a0|&#160;)*99\.000/);
  assert.match(html,/foto-warung\.webp/);
  assert.match(html,/market-product-image/);
  assert.match(app,/esc\(badge\)/);
  assert.doesNotMatch(html,/\b4\.9\b|Terjual \d+|Diskon \d+%/i);
});
test('truthful badges only reflect price and product terms; no invented ratings',()=>{
  const h=preview();
  vm.runInContext("state.catalog=["+
    "{product_id:'P-EBOOK',nama:'Buku Panduan',deskripsi:'Baca langsung',tipe:'PRODUK_DIGITAL',harga:0,aktif:true},"+
    "{product_id:'P-FREE-EXAMPLE',nama:'Contoh Gratis',deskripsi:'Produk bebas tanpa fasilitas portal',tipe:'PRODUK_DIGITAL',harga:0,aktif:true},"+
    "{product_id:'P-3IN1',nama:'Website',deskripsi:'Katalog digital',tipe:'LANGGANAN_30H',harga:'Rp99.000',durasi_hari:30,aktif:true},"+
    "{product_id:'P-POS',nama:'Kasir',deskripsi:'POS sederhana',tipe:'LISENSI_SEKALI',harga:149000,aktif:true}"+
    "];state.info={wa_admin:'081234567890'};state.route='katalog';render()",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/market-product-badge[^>]*>Gratis/);
  assert.match(html,/market-product-badge[^>]*>30 hari/);
  assert.match(html,/market-product-badge[^>]*>Sekali bayar/);
  assert.doesNotMatch(html,/data-checkout-product="P-EBOOK"|Buku Panduan/);
  assert.match(html,/data-checkout-product="P-FREE-EXAMPLE"/);
  assert.match(html,/data-checkout-product="P-3IN1"/);
  assert.doesNotMatch(html,/wa\.me\/|Tanya via WhatsApp|Chat WhatsApp/);
  assert.doesNotMatch(html,/data-buy="P-3IN1"/);
  assert.doesNotMatch(html,/rating|terjual|diskon palsu/i);
});
test('Admin product-photo shortcut reuses the existing authorized CMS',()=>{
  const h=preview();
  vm.runInContext("state.me={role:'ADMIN',member_id:'A',nama:'Admin'};"+
    "state.adminCatalog=[{product_id:'P-POS',nama:'Kasir',deskripsi:'Kasir sederhana',tipe:'LISENSI_SEKALI',harga:149000,aktif:false,urut:1,revision:'test'}];"+
    "state.route='produk';render()",h.ctx);
  assert.match(h.nodes.screen.innerHTML,/data-catalog-image="P-POS"/);
  assert.match(app,/\[data-catalog-image\],\[data-catalog-active\]/);
  const html=h.ctx.window.NGD_CONTENT_UI.admin({
    authorized:true,items:[],products:[{product_id:'P-POS',nama:'Kasir'}],
    defaultPlacement:'P-POS',enabled:false
  });
  assert.match(html,/name="kind" id="content-kind"/);
  assert.match(html,/<option value="PRODUCT_IMAGE" selected/);
  assert.match(html,/id="content-placement" name="placement"/);
  assert.match(html,/<option value="P-POS" data-content-kind="PRODUCT_IMAGE" selected/);
  assert.match(html,/disabled/);
  assert.match(html,/Badge produk \(opsional, maks 24 karakter\)/);
});
test('marketplace refresh only reads catalog and published CMS data',()=>{
  const section=app.slice(app.indexOf('async function refreshMarketplaceData_()'),app.indexOf('function syncMarketplacePolling_()'));
  assert.match(section,/api\('getKatalog'\)/);
  assert.match(section,/api\('getPublicContent'\)/);
  assert.doesNotMatch(section,/write:true|createOrder|adminUpdateCatalogItem|setItem/);
  assert.match(app,/90000/);
  assert.match(app,/document\.hidden/);
  assert.match(css,/market-product-badge/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

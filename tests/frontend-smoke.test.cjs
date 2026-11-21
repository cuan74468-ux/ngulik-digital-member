'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(base,'js/app.js'),'utf8');
const api=fs.readFileSync(path.join(base,'js/api.js'),'utf8');
const config=fs.readFileSync(path.join(base,'config.js'),'utf8');
const QA_CATALOG=require('./fixtures/catalog.cjs');
function stripModule(text){
  return text.replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'');
}
function renderPreview(search=''){
  const nodes=Object.create(null);
  function el(id){return nodes[id]||(nodes[id]={
    innerHTML:'',textContent:'',append(){},addEventListener(){},
    querySelector(){return {disabled:false}}
  });}
  const document={getElementById:el,addEventListener(){},title:''};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',paymentsEnabled:false,
    qrisImageUrl:'',qrisMerchant:''},addEventListener(){},scrollTo(){}};
  const location={href:'https://example.invalid/',origin:'https://example.invalid',hash:'',search};
  const sessionStorage={getItem(){return null;},setItem(){},removeItem(){}};
  const context=vm.createContext({
    window,document,location,sessionStorage,history:{replaceState(){}},
    api(){throw new Error('API must not be called in offline preview');},
    ApiError:class ApiError extends Error{},
    isConnected:()=>false,isWriteEnabled:()=>false,
    setTimeout,clearTimeout,Intl,URL,URLSearchParams,Date,Number,Object,String
  });
  vm.runInContext(stripModule(app),context,{filename:'app.js',timeout:3000});
  vm.runInContext('state.catalog='+JSON.stringify(QA_CATALOG)+';render()',context,{timeout:2000});
  return {nodes,context,document};
}
test('frontend modules parse without build tools',()=>{
  assert.doesNotThrow(()=>new vm.Script(stripModule(app),{filename:'app.js'}));
  assert.doesNotThrow(()=>new vm.Script(stripModule(api),{filename:'api.js'}));
});
test('public config exposes owner-enabled features while secrets stay server-side',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(config,sandbox,{timeout:1000});
  assert.match(sandbox.window.NGD_CONFIG.apiUrl,/^https:\/\/script\.google\.com\/macros\/s\//);
  assert.equal(sandbox.window.NGD_CONFIG.memberWritesEnabled,false);
  assert.equal(sandbox.window.NGD_CONFIG.registrationOtpEnabled,false);
  assert.equal(sandbox.window.NGD_CONFIG.paymentsEnabled,false);
  assert.equal(sandbox.window.NGD_CONFIG.qrisImageUrl,'assets/qris-linggau-ai-studio.svg');
  assert.equal(sandbox.window.NGD_CONFIG.qrisOwnerImageApproved,false);
});
test('guest homepage renders the guest-only visual landing',()=>{
  const {nodes,document}=renderPreview();
  assert.match(nodes.screen.innerHTML,/ngd-landing-v1/);
  assert.match(nodes.screen.innerHTML,/Punya usaha\?/);
  assert.match(nodes.screen.innerHTML,/ngdl-hero-copy/);
  assert.doesNotMatch(nodes.screen.innerHTML,/ngdl-hero-art|ngdl-art-main|ngdl-art-caption/);
  assert.equal((nodes.screen.innerHTML.match(/class="ngdl-offer"/g)||[]).length,4);
  assert.match(nodes.screen.innerHTML,/data-route="daftar"/);
  assert.match(nodes.screen.innerHTML,/Baca eBook Gratis/);
  assert.doesNotMatch(nodes.screen.innerHTML,/market-product-card|ngd-home-artwork/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.match(nodes['desktop-nav'].innerHTML,/Katalog/);
  assert.equal(document.title,'Beranda — Ngulik Digital');
});
test('guest hero image is a layered background, not a small inline artwork card',()=>{
  const source=fs.readFileSync(path.join(base,'assets/landing-guest-v1.css'),'utf8');
  const markup=renderPreview().nodes.screen.innerHTML;
  assert.match(source,/url\("\.\/media\/ngd-catalog-v9-wide\.webp"\)/);
  assert.match(source,/\.ngdl-hero::after/);
  assert.match(source,/linear-gradient/);
  assert.match(source,/@media\(max-width:600px\)/);
  assert.doesNotMatch(markup,/ngdl-hero-art|ngdl-art-caption/);
});
test('mobile hero reveals background art and closing CTA is compact',()=>{
  const source=fs.readFileSync(path.join(base,'assets/landing-guest-v1.css'),'utf8');
  const markup=renderPreview().nodes.screen.innerHTML;
  assert.match(source,/\.ngdl-hero::before\{inset:auto 0 0 0;height:178px;/);
  assert.match(source,/background-position:center 54%;background-size:cover;opacity:1/);
  assert.match(source,/\.ngdl-end\{grid-template-columns:minmax\(0,1fr\);row-gap:10px;margin-top:28px/);
  assert.match(source,/\.ngdl-end \.ngdl-actions\{grid-column:1;grid-row:auto;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(markup,/Mau mulai ngulik\?/);
  assert.doesNotMatch(markup,/MAU MULAI\?/);
});
test('guest drawer exposes four public routes and a single member entrance',()=>{
  const {nodes,context}=renderPreview();
  const drawer=nodes['top-nav-drawer'].innerHTML;
  const routes=[...drawer.matchAll(/data-route="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(routes,['beranda','katalog','jasa','dukungan','login']);
  for(const privateRoute of ['ai','affiliate','belajar','pesanan','checkout']){
    vm.runInContext('go('+JSON.stringify(privateRoute)+')',context,{timeout:2000});
    assert.equal(vm.runInContext('state.route',context),'login');
  }
});
test('guest product selection preserves intent but cannot open checkout',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("go('katalog');openProductCheckout_('P-3IN1')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.pendingPurchaseId',context),'P-3IN1');
  assert.equal(vm.runInContext('state.route',context),'login');
  assert.match(nodes.screen.innerHTML,/Masuk atau daftar gratis pakai WhatsApp/);
});
test('local member preview renders native-like dashboard without login',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  assert.match(nodes.screen.innerHTML,/RUANG MEMBER \/ AKTIVITAS SAYA/);
  assert.match(nodes.screen.innerHTML,/ngd-member-activity/);
  assert.match(nodes.screen.innerHTML,/Komisi Siap Tarik/);
  assert.match(nodes.screen.innerHTML,/Saldo Token/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.equal(vm.runInContext('isWriteEnabled()',context),false);
});
test('preview catalog uses sample products with internal checkout previews',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  vm.runInContext("go('katalog')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/Paket 3-in-1/);
  assert.match(nodes.screen.innerHTML,/Top-up 400 Kredit AI/);
  assert.match(nodes.screen.innerHTML,/Jasa Video Iklan/);
  assert.match(nodes.screen.innerHTML,/Bundel Ebook Vibe Coder/);
  assert.match(nodes.screen.innerHTML,/data-catalog-filter="aplikasi"/);
  assert.match(nodes.screen.innerHTML,/data-catalog-filter="jasa"/);
  assert.match(nodes.screen.innerHTML,/data-checkout-product=/);
  assert.doesNotMatch(nodes.screen.innerHTML,/Tanya via WhatsApp|Chat WhatsApp|data-buy=/);
  vm.runInContext("state.checkoutProductId='P-3IN1';state.lastOrder=null;go('checkout')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/Rincian Checkout/);
  assert.match(nodes.screen.innerHTML,/Pembayaran belum dibuka/);
  assert.doesNotMatch(nodes.screen.innerHTML,/data-qris-image|data-checkout-create/);
});
test('catalog escapes untrusted product names, and external URLs are restricted',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("state.catalog=[{product_id:'P-SAFE',nama:'<img src=x onerror=alert(1)>',deskripsi:'Unsafe <script>',harga:1,tipe:'TOPUP_KREDIT'}];go('katalog')",
    context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(nodes.screen.innerHTML,/<img src=x onerror/);
  assert.equal(vm.runInContext("urlSafe('javascript:alert(1)')",context),'');
  assert.equal(vm.runInContext("urlSafe('https://example.org/')",context),'https://example.org/');
});

test('learning links require official HTTPS Google Classroom host',()=>{
  const {context}=renderPreview('?preview=member');
  const call=url=>vm.runInContext('classroomUrlSafe('+JSON.stringify(url)+')',context);
  assert.equal(call('https://classroom.google.com/c/123'),'https://classroom.google.com/c/123');
  for(const candidate of [
    'https://classroom.google.com.evil.test/c/123',
    'https://evil.test/classroom.google.com/',
    'http://classroom.google.com/c/123',
    'javascript:alert(1)',
    'https://user:pass@classroom.google.com/c/123'
  ])assert.equal(call(candidate),'');
});

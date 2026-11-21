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
  assert.doesNotMatch(nodes.screen.innerHTML,/Baca eBook Gratis|Ikut Kelas Gratis|ngdl-free/);
  assert.doesNotMatch(nodes.screen.innerHTML,/market-product-card|ngd-home-artwork/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.match(nodes['desktop-nav'].innerHTML,/Katalog/);
  assert.equal(document.title,'Beranda — Ngulik Digital');
});
test('free ebook and classroom links only render in authenticated member learning',()=>{
  const guest=renderPreview();
  assert.doesNotMatch(guest.nodes.screen.innerHTML,/buku-pintar-vibe-coder|classroom\.google\.com|ngdl-free/);
  vm.runInContext("go('dukungan')",guest.context,{timeout:2000});
  assert.doesNotMatch(guest.nodes.screen.innerHTML,/buku-pintar-vibe-coder|classroom\.google\.com|ngdb-help-free/);
  assert.doesNotMatch(app,/function routeFreeDoor_\(|viewHeroFreeLinks_\(|free=ebook|free=kelas/);
  const member=renderPreview('?preview=member');
  vm.runInContext("go('belajar')",member.context,{timeout:2000});
  assert.match(member.nodes.screen.innerHTML,/ngd-member-learning-links/);
  assert.match(member.nodes.screen.innerHTML,/Baca eBook Gratis/);
  assert.match(member.nodes.screen.innerHTML,/Buka Kelas Gratis/);
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
  assert.match(source,/\.ngdl-hero::before\{inset:0;height:auto;background-position:98% 49%;background-size:cover;opacity:1/);
  assert.match(source,/\.ngdl-story\{display:grid;grid-template-columns:1fr;padding:23px 2% 20px;gap:8px/);
  assert.match(source,/-webkit-text-fill-color:#241d38!important/);
  assert.match(markup,/Urusan digital, nggak harus bikin repot/);
  assert.match(markup,/Cari yang pas buat Anda/);
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
test('catalog product detail opens its own page instead of expanding card',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("go('katalog')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/data-product-detail="P-3IN1"/);
  assert.match(nodes.screen.innerHTML,/href="#detail-produk\/P-3IN1"/);
  assert.match(nodes.screen.innerHTML,/data-market-product="P-3IN1"/);
  assert.doesNotMatch(nodes.screen.innerHTML,/<details class="ngd-card-public-detail"/);
  vm.runInContext("openProductDetail_('P-3IN1')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.route',context),'detail-produk');
  assert.equal(vm.runInContext('state.productDetailId',context),'P-3IN1');
  assert.match(nodes.screen.innerHTML,/ngdp-shell/);
  assert.match(nodes.screen.innerHTML,/Paket 3-in-1/);
  assert.match(nodes.screen.innerHTML,/Rp(?:\s|\u00a0)*25\.000/);
  assert.match(nodes.screen.innerHTML,/Tentang produk ini/);
  assert.match(nodes.screen.innerHTML,/data-checkout-product="P-3IN1"/);
  assert.doesNotMatch(nodes.screen.innerHTML,/checkout-dialog|data-checkout-create/);
});
test('product detail URL deep link restores exact SKU and rejects malformed IDs',()=>{
  const {context,nodes}=renderPreview();
  context.location.hash='#detail-produk/P-POS';
  assert.equal(vm.runInContext('aiRouteFromHash_()',context,{timeout:2000}),'detail-produk');
  assert.equal(vm.runInContext('state.productDetailId',context),'P-POS');
  vm.runInContext("state.route='detail-produk';render()",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/POS Kasir Sederhana/);
  context.location.hash='#detail-produk/%3Cscript%3E';
  assert.equal(vm.runInContext('aiRouteFromHash_()',context,{timeout:2000}),'katalog');
  context.location.hash='#detail-produk/%XX';
  assert.equal(vm.runInContext('aiRouteFromHash_()',context,{timeout:2000}),'katalog');
});
test('guest purchase from a product page still requires login and remembers product',()=>{
  const {context,nodes}=renderPreview();
  vm.runInContext("openProductDetail_('P-POS');openProductCheckout_('P-POS')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.route',context),'login');
  assert.equal(vm.runInContext('state.pendingPurchaseId',context),'P-POS');
  assert.equal(vm.runInContext('state.checkoutReturnRoute',context),'detail-produk');
  assert.doesNotMatch(nodes.screen.innerHTML,/data-checkout-create|checkout-dialog/);
});
test('member product detail proceeds to existing checkout without new order writes',()=>{
  const {context,nodes}=renderPreview('?preview=member');
  vm.runInContext("go('katalog');openProductDetail_('P-3IN1');openProductCheckout_('P-3IN1')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.route',context),'checkout');
  assert.equal(vm.runInContext('state.checkoutReturnRoute',context),'detail-produk');
  assert.match(nodes.screen.innerHTML,/Rincian Checkout/);
  assert.match(nodes.screen.innerHTML,/Pembayaran belum dibuka/);
  assert.doesNotMatch(nodes.screen.innerHTML,/data-checkout-create/);
});
test('product mini landing escapes untrusted catalog text and uses responsive contained art',()=>{
  const {context,nodes}=renderPreview();
  vm.runInContext("state.catalog=[{product_id:'P-SAFE',nama:'<img src=x onerror=evil()>',deskripsi:'<script>alert(1)</script>',tipe:'LISENSI_SEKALI',harga:10000}];openProductDetail_('P-SAFE')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/&lt;img src=x onerror=evil\(\)&gt;/);
  assert.match(nodes.screen.innerHTML,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(nodes.screen.innerHTML,/<script>alert\(1\)<\/script>|<img src=x onerror/);
  const css=fs.readFileSync(path.join(base,'assets/product-detail-v1.css'),'utf8');
  assert.match(css,/\.ngdp-artwork img/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/@media\(max-width:600px\)/);
});
test('guest product selection preserves intent but cannot open checkout',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("go('katalog');openProductCheckout_('P-3IN1')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.pendingPurchaseId',context),'P-3IN1');
  assert.equal(vm.runInContext('state.route',context),'login');
  assert.match(nodes.screen.innerHTML,/Login member belum tersedia di halaman publik/);
  assert.match(nodes.screen.innerHTML,/Produk yang dipilih belum dipesan atau ditagihkan/);
  assert.doesNotMatch(nodes.screen.innerHTML,/id="auth-form"|Kode OTP WhatsApp/);
});
test('public login is fail-closed while member preview and staging source keep separate gates',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("go('login')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/Login member belum tersedia/);
  assert.doesNotMatch(nodes.screen.innerHTML,/id="auth-form"/);
  assert.match(app,/location\.pathname\.includes\('\/staging\/'\)/);
  const page=fs.readFileSync(path.join(base,'staging/member.html'),'utf8');
  assert.match(page,/app\.js\?v=20261121-staging-login-fallback-1/);
});
test('guest Jasa shows actual backend-catalog prices and gates checkout behind login',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("state.catalog=[{product_id:'P-SERVICE',nama:'Video & Promosi',deskripsi:'Video promo singkat',tipe:'JASA_SEKALI',harga:50000},{product_id:'P-APP',nama:'Kasir',tipe:'LISENSI_SEKALI',harga:25000}];go('jasa')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/ngd-buyer-services/);
  assert.match(nodes.screen.innerHTML,/Paket yang dapat dipilih/);
  assert.match(nodes.screen.innerHTML,/Video &amp; Promosi/);
  assert.match(nodes.screen.innerHTML,/Rp(?:\s|\u00a0)*50\.000/);
  assert.match(nodes.screen.innerHTML,/data-checkout-product="P-SERVICE"/);
  assert.doesNotMatch(nodes.screen.innerHTML,/data-checkout-product="P-APP"/);
  assert.doesNotMatch(nodes.screen.innerHTML,/id="service-brief-form"/);
  vm.runInContext("openProductCheckout_('P-SERVICE')",context,{timeout:2000});
  assert.equal(vm.runInContext('state.route',context),'login');
  assert.equal(vm.runInContext('state.pendingPurchaseId',context),'P-SERVICE');
});
test('guest help is a readable purchase FAQ and never exposes private tickets',()=>{
  const {nodes,context}=renderPreview();
  vm.runInContext("go('dukungan')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/ngd-buyer-help/);
  assert.match(nodes.screen.innerHTML,/Harus daftar dulu untuk membeli/);
  assert.match(nodes.screen.innerHTML,/Bagaimana cara membayar/);
  assert.doesNotMatch(nodes.screen.innerHTML,/support-create-form|service-quote-form/);
});
test('public buyer pages have isolated responsive styling and no invented prices',()=>{
  const css=fs.readFileSync(path.join(base,'assets/guest-sales-trust-v1.css'),'utf8');
  assert.match(css,/\.ngd-buyer-services/);
  assert.match(css,/\.ngd-buyer-help/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(app,/String\(p\.tipe\)==='JASA_SEKALI'/);
  assert.match(app,/rupiah\(price\)/);
});
test('local member preview renders premium native-like dashboard without login',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  assert.match(nodes.screen.innerHTML,/ngdm-dashboard/);
  assert.match(nodes.screen.innerHTML,/DOMPET TOKEN/);
  assert.match(nodes.screen.innerHTML,/ngdm-wallet-chart/);
  assert.match(nodes.screen.innerHTML,/Status pesanan/);
  assert.match(nodes.screen.innerHTML,/ngdm-recent/);
  assert.match(nodes.screen.innerHTML,/ngdm-shortcut/);
  assert.match(nodes['member-mobile-nav'].innerHTML,/member-more-toggle/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.equal(vm.runInContext('isWriteEnabled()',context),false);
});
test('member dashboard draws graph only from real ledger samples and never fabricates missing data',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  vm.runInContext("state.creditHistory=[];state.memberDashboardReads={balance:true,orders:true,affiliate:true,products:true,credits:true,classes:true};render()",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/setidaknya dua aktivitas token/);
  assert.doesNotMatch(nodes.screen.innerHTML,/ngdm-chart-plot/);
  vm.runInContext("state.creditHistory=[{created_at:'2026-11-14T00:00:00Z',saldo_setelah:25,jumlah:5},{created_at:'2026-11-15T00:00:00Z',saldo_setelah:30,jumlah:5}];state.home.saldo_kredit=30;render()",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/ngdm-chart-plot/);
  assert.match(nodes.screen.innerHTML,/dari 25 menjadi 30 token/);
  assert.match(nodes.screen.innerHTML,/30<\/strong><span>token/);
});
test('mobile member dock is native, complementary, and does not appear for guests',()=>{
  const member=renderPreview('?preview=member');
  const dock=member.nodes['member-mobile-nav'].innerHTML;
  const more=member.nodes['top-nav-drawer'].innerHTML;
  assert.deepEqual([...dock.matchAll(/data-route="([^"]+)"/g)].map(m=>m[1]),
    ['beranda','katalog','ai','pesanan']);
  assert.deepEqual([...more.matchAll(/data-route="([^"]+)"/g)].map(m=>m[1]),
    ['beranda','katalog','ai','jasa','belajar','pesanan','affiliate','dukungan','akun']);
  assert.match(dock,/member-more-toggle/);
  const guest=renderPreview();
  assert.equal(guest.nodes['member-mobile-nav'].hidden,true);
  const style=fs.readFileSync(path.join(base,'assets/member-native-dashboard-v1.css'),'utf8');
  assert.match(style,/#member-mobile-nav/);
  assert.match(style,/#top-nav-trigger/);
  assert.match(style,/#guest-nav/);
  assert.match(style,/@media\(max-width:760px\)/);
  const stage=fs.readFileSync(path.join(base,'staging/member.html'),'utf8');
  assert.match(stage,/member-native-dashboard-v1\.css/);
  assert.match(stage,/id="member-mobile-nav"/);
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

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const QA_CATALOG=require('./fixtures/catalog.cjs');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8')
  .replace(/^import .*?;\s*$/gm,'');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function preview(query=''){
  const nodes={},listeners={},apiCalls=[];
  const el=id=>nodes[id]||(nodes[id]={
    innerHTML:'',textContent:'',append(){},
    querySelector(){return {disabled:false}},
    addEventListener(type,fn){listeners[id+':'+type]=fn;}
  });
  const doc={body:{classList:{toggle(){}},setAttribute(){}},
    getElementById:el,addEventListener(type,fn){listeners[type]=fn;},title:''};
  const win={NGD_CONFIG:{demoMode:true,apiUrl:'',siteUrl:'https://example.invalid/',
    paymentsEnabled:false,supportEnabled:false,notificationsEnabled:false,
    lmsEnabled:false,qrisMerchant:'',qrisImageUrl:''},
    addEventListener(){},scrollTo(){}};
  const ctx=vm.createContext({window:win,document:doc,
    location:{href:'https://example.invalid/',origin:'https://example.invalid',hash:'',search:query},
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    history:{replaceState(){}},URL,URLSearchParams,Intl,Date,Number,Map,
    api(...args){apiCalls.push(args);throw Error('PREVIEW MUST NOT CALL API');},
    isConnected:()=>false,isWriteEnabled:()=>false,
    ApiError:class ApiError extends Error{},
    setTimeout,clearTimeout
  });
  vm.runInContext(app,ctx,{timeout:5000});
  vm.runInContext('state.catalog='+JSON.stringify(QA_CATALOG)+';render()',ctx,{timeout:3000});
  return {ctx,nodes,listeners,apiCalls,go:r=>vm.runInContext('go('+JSON.stringify(r)+')',ctx)};
}
test('public hub is a calm mobile-first entry with accessible product navigation',()=>{
  const h=preview(),html=h.nodes.screen.innerHTML;
  for(const key of ['nh-home-minimal','ngd-journey-stage','public-hero-copy','ngd-shop-featured','ngd-shop-signup','eBook Gratis','Kelas Gratis'])
    assert.ok(html.includes(key),key);
  assert.match(html,/Jasa Web, Aplikasi &amp; Video UMKM/);
  assert.doesNotMatch(html,/class="ngd-home-services"/); // No duplicate tall service cards.
  assert.doesNotMatch(html,/class="nh-grid"|class="nh-rail"/);
  assert.equal(h.apiCalls.length,0);
});
test('guest learning page explains Chapter 1 while leaving real LMS locked',()=>{
  const h=preview();h.go('belajar');
  assert.match(h.nodes.screen.innerHTML,/eBook Gratis/);
  assert.match(h.nodes.screen.innerHTML,/Kelas Gratis/);
  assert.match(h.nodes.screen.innerHTML,/ozzbygx3/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/Masuk untuk membuka/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/data-lms-action="complete"/);
  assert.equal(h.apiCalls.length,0);
});
test('guest marketplace displays all eight official QA fixtures without pretending payment is available',()=>{
  const h=preview();h.go('katalog');const html=h.nodes.screen.innerHTML;
  assert.equal((html.match(/class="market-product-card" data-market-kind=/g)||[]).length,8);
  assert.match(html,/8 dari 8 produk/);
  assert.match(html,/market-search/);
  assert.match(html,/market-sort/);
  assert.match(html,/Jasa Video Iklan/);
  assert.match(html,/Bundel Ebook Vibe Coder/);
  assert.doesNotMatch(html,/data-buy="/);
  assert.match(html,/data-checkout-product=/);
  assert.doesNotMatch(html,/Tanya via WhatsApp|Chat WhatsApp/);
  assert.equal(h.apiCalls.length,0);
});
test('guest marketplace routes every owned offer internally and keeps QRIS OFF',()=>{
  const h=preview();h.go('katalog');
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/data-checkout-product=/);
  assert.doesNotMatch(html,/wa\.me|Tanya via WhatsApp|Chat WhatsApp/);
  vm.runInContext("state.checkoutProductId='P-VIDEO-AI';state.lastOrder=null;go('checkout')",h.ctx);
  const detail=h.nodes.screen.innerHTML;
  assert.match(detail,/Rincian Checkout/);
  assert.match(detail,/Pembayaran belum dibuka/);
  assert.doesNotMatch(detail,/data-qris-image|data-checkout-create/);
  assert.equal(h.apiCalls.length,0);
});
test('guest category controls filter services without creating fake checkout',()=>{
  const h=preview();
  vm.runInContext("state.catalogFilter='jasa';go('katalog')",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/Jasa Video Iklan/);
  assert.doesNotMatch(html,/Top-up 150 Kredit AI/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/2 dari 8 produk/);
  assert.doesNotMatch(html,/data-buy="/);
  vm.runInContext("state.catalogFilter='belajar';render()",h.ctx);
  assert.match(h.nodes.screen.innerHTML,/Bundel Ebook Vibe Coder/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/Jasa Video Iklan/);
});
test('money formatting handles Indonesian Sheets format without inventing Rp0',()=>{
  const h=preview();
  const money=x=>vm.runInContext('rupiah('+JSON.stringify(x)+')',h.ctx)
    .replace(/[\u00a0\u202f]/g,''); // Intl IDR uses a non-breaking space after Rp.
  assert.equal(money('Rp99.000'),'Rp99.000');
  assert.equal(money('49.000'),'Rp49.000');
  assert.equal(money(149000),'Rp149.000');
  assert.equal(money('bad'),'Harga belum tersedia');
});
test('untrusted guest catalogue labels remain HTML-escaped after filtering',()=>{
  const h=preview();
  vm.runInContext("state.catalog=[{product_id:'P-ERR',nama:'<img src=x onerror=alert(1)>',deskripsi:'<script>unsafe</script>',harga:'Rp25.000',tipe:'JASA_SEKALI'}];state.catalogFilter='jasa';go('katalog')",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<img src=x onerror/);
  assert.doesNotMatch(html,/data-buy="/);
});
test('digital and service checkout paths reach server order validation',()=>{
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  let writes=0,checks=0;
  ctx.withLock_=fn=>fn();
  ctx.byId_=(table,column,id)=>table==='katalog_produk'
    ?{product_id:id,aktif:true,tipe:id==='P-VIDEO-AI'?'JASA_SEKALI':'PRODUK_DIGITAL',
      nama:'Offer',harga:50000}:null;
  ctx.appendRow_=()=>{writes++};
  ctx.findRows_=()=>{checks++;throw Error('ORDER_CHECK_REACHED')};
  for(const id of ['P-VIDEO-AI','P-EBOOK']){
    assert.throws(()=>vm.runInContext("newOrder_({role:'MEMBER',member_id:'M1'}, {product_id:'"+id+"'}, 'fresh-request')",ctx,{timeout:3000}),
      /ORDER_CHECK_REACHED/);
  }
  assert.equal(checks,2);
  assert.equal(writes,0);
});

test('archived and QA products are excluded from public listing and checkout',()=>{
  const h=preview();
  vm.runInContext("state.catalog=[{product_id:'P-TEST-OLD',nama:'[ARCHIVED] Produk Uji QA',tipe:'PRODUK_DIGITAL',harga:15000},{product_id:'P-ACTIVE',nama:'Produk Aktif',tipe:'PRODUK_DIGITAL',harga:15000}];state.catalogFilter='semua';go('katalog')",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/Produk Aktif/);
  assert.doesNotMatch(html,/\[ARCHIVED\] Produk Uji QA/);
  assert.match(html,/1 dari 1 produk/);
  assert.doesNotMatch(html,/data-checkout-product="P-TEST-OLD"/);
  assert.equal(h.apiCalls.length,0);
});
test('broken published artwork falls back to curated local WebP once',()=>{
  const h=preview(),onError=h.listeners.error;
  assert.equal(typeof onError,'function');
  const img={tagName:'IMG',dataset:{marketFallback:'./assets/media/ngd-v8-video.webp'},
    src:'https://cdn.invalid/missing.webp',classList:{contains:n=>n==='market-product-image',add(){}}};
  onError({target:img});
  assert.equal(img.dataset.marketFallbackUsed,'1');
  assert.equal(img.src,'./assets/media/ngd-v8-video.webp');
  onError({target:img});
  assert.equal(img.src,'./assets/media/ngd-v8-video.webp');
});

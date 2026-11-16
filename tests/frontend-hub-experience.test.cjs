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
test('public hub is a native-style home: hero, search bar, feature grid',()=>{
  const h=preview();
  const html=h.nodes.screen.innerHTML;
  for(const cls of ['nh-hero','nh-search','nh-grid','nh-rail']){
    assert.ok(html.includes(cls),cls);
  }
  for(const label of ['Belajar','Aplikasi','Studio AI','Jasa','Katalog']){
    assert.ok(html.includes('>'+label+'<'),label);
  }
  assert.doesNotMatch(html,/hub-journey|hub-lead|class="eyebrow"/);
  assert.doesNotMatch(html,/Daftar member/);
  assert.equal(h.apiCalls.length,0);
});
test('guest learning page explains Chapter 1 while leaving real LMS locked',()=>{
  const h=preview();h.go('belajar');
  assert.match(h.nodes.screen.innerHTML,/Google Profil Bisnis/);
  assert.match(h.nodes.screen.innerHTML,/WhatsApp Business/);
  assert.match(h.nodes.screen.innerHTML,/Lanjutkan perjalanan di ruang member/);
  assert.match(h.nodes.screen.innerHTML,/data-route="login"/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/data-lms-action="complete"/);
  assert.equal(h.apiCalls.length,0);
});
test('local QA catalog renders eight test-only records with payment disabled',()=>{
  const h=preview();h.go('katalog');
  const html=h.nodes.screen.innerHTML;
  const IDs=['P-3IN1','P-POS','P-CANVA','P-KREDIT-50','P-KREDIT-150',
    'P-KREDIT-400','P-VIDEO-AI','P-EBOOK'];
  assert.equal((html.match(/class="catalog-card"/g)||[]).length,8);
  // A storefront must not expose fake checkout while payment is gated.
  assert.doesNotMatch(html,/data-buy="/);
  for(const id of IDs)assert.ok(QA_CATALOG.some(p=>p.product_id===id),id);
  assert.match(html,/8<\/strong><span>penawaran tercatat/);
  assert.match(html,/Jasa Video Iklan AI/);
  assert.match(html,/Bundel Ebook Vibe Coder/);
  assert.match(html,/disabled title="Pembayaran belum diaktifkan"/);
  assert.doesNotMatch(html,/data-buy="P-VIDEO-AI"[^>]*>Pilih produk/);
  assert.doesNotMatch(html,/data-buy="P-EBOOK"[^>]*>Pilih produk/);
  assert.equal(h.apiCalls.length,0);
});
test('public catalog offers WhatsApp consultation only for a valid official contact',()=>{
  const h=preview();
  vm.runInContext("state.info={wa_admin:'081234567890'};go('katalog')",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/href="https:\/\/wa\.me\/6281234567890\?text=/);
  assert.match(html,/Tanya pemesanan/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/data-buy="/);
  vm.runInContext("state.info={wa_admin:'https://evil.example'};render()",h.ctx);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/href="https:\/\/wa\.me\//);
  assert.match(h.nodes.screen.innerHTML,/disabled title="Pembayaran belum diaktifkan"/);
});
test('category filtering isolates services and does not invent sale actions',()=>{
  const h=preview();
  vm.runInContext("state.catalogFilter='jasa';go('katalog')",h.ctx);
  assert.match(h.nodes.screen.innerHTML,/Jasa Video Iklan AI/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/Top-up 150 Kredit AI/);
  assert.match(h.nodes.screen.innerHTML,/aria-pressed="true"/);
  assert.match(h.nodes.screen.innerHTML,/Menampilkan 1 dari 8 penawaran/);
  vm.runInContext("state.catalogFilter='belajar';render()",h.ctx);
  assert.match(h.nodes.screen.innerHTML,/Bundel Ebook Vibe Coder/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/Jasa Video Iklan AI/);
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
test('untrusted catalog labels are escaped even inside category-filtered views',()=>{
  const h=preview();
  vm.runInContext("state.catalog=[{product_id:'P-ERR',nama:'<img src=x onerror=alert(1)>',deskripsi:'<script>unsafe</script>',harga:'Rp25.000',tipe:'JASA_SEKALI'}];state.catalogFilter='jasa';go('katalog')",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<img src=x onerror/);
  assert.match(html,/disabled title="Pembayaran belum diaktifkan"/);
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

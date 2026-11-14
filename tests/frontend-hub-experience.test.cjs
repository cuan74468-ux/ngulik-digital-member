'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
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
  return {ctx,nodes,listeners,apiCalls,go:r=>vm.runInContext('go('+JSON.stringify(r)+')',ctx)};
}
test('public hub explains four real pillars without fabricated dashboards',()=>{
  const h=preview();
  const html=h.nodes.screen.innerHTML;
  for(const phrase of ['LINGGAU AI STUDIO','Belajar & praktik','Aplikasi usaha',
    'Studio AI & kredit','Jasa kreatif']){
    assert.ok(html.includes(phrase),phrase);
  }
  assert.match(html,/hub-journey/);
  assert.match(html,/maksimal 50 peserta/);
  assert.doesNotMatch(html,/Daftar member/);
  assert.doesNotMatch(html,/Netflix|Spotify|Subscription/);
  assert.equal(h.apiCalls.length,0);
});
test('guest learning page explains Chapter 1 while leaving real LMS locked',()=>{
  const h=preview();h.go('belajar');
  assert.match(h.nodes.screen.innerHTML,/Google Profil Bisnis/);
  assert.match(h.nodes.screen.innerHTML,/WhatsApp Business/);
  assert.match(h.nodes.screen.innerHTML,/Ruang member belum dibuka/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/data-lms-action="complete"/);
  assert.equal(h.apiCalls.length,0);
});
test('catalogue preview mirrors 8 current Drive product identities and hides payment',()=>{
  const h=preview();h.go('katalog');
  const html=h.nodes.screen.innerHTML;
  const IDs=['P-3IN1','P-POS','P-CANVA','P-KREDIT-50','P-KREDIT-150',
    'P-KREDIT-400','P-VIDEO-AI','P-EBOOK'];
  assert.equal((html.match(/data-buy="/g)||[]).length,8);
  for(const id of IDs)assert.ok(html.includes('data-buy="'+id+'"'),id);
  assert.match(html,/8<\/strong><span>penawaran tercatat/);
  assert.match(html,/Jasa Video Iklan AI/);
  assert.match(html,/Bundel Ebook Vibe Coder/);
  assert.match(html,/Belum tersedia untuk pemesanan/);
  assert.doesNotMatch(html,/data-buy="P-VIDEO-AI"[^>]*>Pilih produk/);
  assert.doesNotMatch(html,/data-buy="P-EBOOK"[^>]*>Pilih produk/);
  assert.equal(h.apiCalls.length,0);
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
  assert.match(html,/Belum tersedia untuk pemesanan/);
});
test('unsupported offer types are rejected server-side before any new order or ledger write',()=>{
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  let writes=0;
  ctx.withLock_=fn=>fn();
  ctx.byId_=(table,column,id)=>table==='katalog_produk'?
    {product_id:id,aktif:true,tipe:id==='P-VIDEO-AI'?'JASA_SEKALI':'PRODUK_DIGITAL',
      nama:'Unfulfilled offer',harga:50000}:null;
  ctx.appendRow_=()=>{writes++;};
  ctx.findRows_=()=>{throw Error('Should reject before inspecting orders');};
  for(const id of ['P-VIDEO-AI','P-EBOOK']){
    assert.throws(()=>vm.runInContext("newOrder_({role:'MEMBER',member_id:'M1'}, {product_id:'"+id+"'}, 'fresh-request')",ctx,{timeout:3000}),
      /Produk ini belum dapat dipesan/);
  }
  assert.equal(writes,0);
});

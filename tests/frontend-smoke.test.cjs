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
  assert.equal(sandbox.window.NGD_CONFIG.memberWritesEnabled,true);
  assert.equal(sandbox.window.NGD_CONFIG.paymentsEnabled,true);
  assert.equal(sandbox.window.NGD_CONFIG.qrisImageUrl,'');
});
test('guest homepage renders and shows offline preview warning',()=>{
  const {nodes,document}=renderPreview();
  assert.match(nodes.screen.innerHTML,/nh-hero/);
  assert.match(nodes.screen.innerHTML,/nh-search/);
  assert.match(nodes.screen.innerHTML,/nh-grid/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.match(nodes['desktop-nav'].innerHTML,/Toko &amp; Lisensi/);
  assert.equal(document.title,'Meja Kerja — Ngulik Digital');
});
test('local member preview renders native-like dashboard without login',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  assert.match(nodes.screen.innerHTML,/DASHBOARD \/ MEJA KERJA/);
  assert.match(nodes.screen.innerHTML,/member-focus-ring/);
  assert.match(nodes.screen.innerHTML,/Token tersedia/);
  assert.equal(nodes['notice-slot'].innerHTML,'');
  assert.equal(vm.runInContext('isWriteEnabled()',context),false);
});
test('preview catalog uses sample products with disabled buy buttons',()=>{
  const {nodes,context}=renderPreview('?preview=member');
  vm.runInContext("go('katalog')",context,{timeout:2000});
  assert.match(nodes.screen.innerHTML,/Paket 3-in-1/);
  assert.match(nodes.screen.innerHTML,/Top-up 400 Kredit AI/);
  assert.match(nodes.screen.innerHTML,/Jasa Video Iklan AI/);
  assert.match(nodes.screen.innerHTML,/Bundel Ebook Vibe Coder/);
  assert.match(nodes.screen.innerHTML,/data-catalog-filter="aplikasi"/);
  assert.match(nodes.screen.innerHTML,/data-catalog-filter="jasa"/);
  assert.match(nodes.screen.innerHTML,/disabled title="Checkout belum tersedia pada konfigurasi saat ini"/);
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

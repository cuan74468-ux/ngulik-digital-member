'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8')
  .replace(/^import .*?\n/gm,'');
function preview(mode='',route='beranda'){
  const nodes={};
  function by(id){return nodes[id]||(nodes[id]={innerHTML:'',textContent:'',
    addEventListener(){},append(){},querySelector(){return {disabled:false}}});}
  const document={getElementById:by,addEventListener(){},title:''};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',supportEnabled:false,
    paymentsEnabled:false,qrisImageUrl:'',qrisMerchant:''},
    addEventListener(){},scrollTo(){}};
  const location={search:mode?'?preview='+mode:'',hash:'#'+route,
    href:'https://example.invalid/',origin:'https://example.invalid'};
  const context=vm.createContext({
    window,document,location,sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    history:{replaceState(){}},URL,URLSearchParams,Intl,Date,Number,
    api(){throw Error('DEMO_MUST_NOT_CALL_BACKEND');},
    ApiError:class ApiError extends Error{},
    isConnected:()=>false,isWriteEnabled:()=>false,
    setTimeout,clearTimeout
  });
  vm.runInContext(app,context,{filename:'app.js',timeout:5000});
  const go=page=>vm.runInContext('go('+JSON.stringify(page)+')',context,{timeout:3000});
  return {nodes,context,go,document};
}
test('support pages parse with no build step',()=>{
  assert.doesNotThrow(()=>new vm.Script(app));
});
test('guest cannot access member ticket form or admin data',()=>{
  const h=preview();
  h.go('dukungan');
  assert.match(h.nodes.screen.innerHTML,/Masuk untuk membuka/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/id="support-create-form"/);
  h.go('member360');
  assert.doesNotMatch(h.nodes.screen.innerHTML,/MEMBER 360° · PREVIEW/);
});
test('member preview renders ticket form and locks all write actions',()=>{
  const h=preview('member','dukungan');
  assert.match(h.nodes.screen.innerHTML,/Bantuan &amp; Dukungan/);
  assert.match(h.nodes.screen.innerHTML,/id="support-create-form"/);
  assert.match(h.nodes.screen.innerHTML,/Cetak struk gagal pada Android/);
  assert.match(h.nodes.screen.innerHTML,/disabled title="Fitur support belum diaktifkan"/);
  assert.equal(vm.runInContext('supportWriteEnabled()',h.context),false);
  assert.match(h.nodes['desktop-nav'].innerHTML,/Jasa/);
  assert.match(h.nodes['desktop-nav'].innerHTML,/Bantuan/);
});
test('member can inspect synthetic ticket history and update list',()=>{
  const h=preview('member');
  h.go('tiket');
  assert.match(h.nodes.screen.innerHTML,/Aktivitas tiket/);
  assert.match(h.nodes.screen.innerHTML,/Laporan dibuat/);
  h.go('rilis');
  assert.match(h.nodes.screen.innerHTML,/Perbaikan stabilitas cetak/);
});
test('admin preview displays support queue and Member 360 search',()=>{
  const h=preview('admin','dukungan');
  assert.match(h.nodes.screen.innerHTML,/Laporan Masuk/);
  assert.match(h.nodes.screen.innerHTML,/id="support-filter-form"/);
  assert.match(h.nodes.screen.innerHTML,/Cetak struk gagal pada Android/);
  h.go('member');
  assert.match(h.nodes.screen.innerHTML,/id="member-search-form"/);
  assert.match(h.nodes.screen.innerHTML,/id="member-access-status"/);
  assert.match(h.nodes.screen.innerHTML,/Lihat profil/);
  h.go('member360');
  assert.match(h.nodes.screen.innerHTML,/Akses Produk/);
  assert.match(h.nodes.screen.innerHTML,/POS Kasir Sederhana/);
});
test('admin release form is disabled while support gate is off',()=>{
  const h=preview('admin','rilis');
  assert.match(h.nodes.screen.innerHTML,/id="release-create-form"/);
  assert.match(h.nodes.screen.innerHTML,/data-impact-action="check"/);
  assert.match(h.nodes.screen.innerHTML,/disabled/);
  assert.equal(vm.runInContext('supportWriteEnabled()',h.context),false);
});
test('untrusted ticket text is escaped rather than interpreted as HTML',()=>{
  const h=preview('member');
  vm.runInContext("state.supportTickets=[{ticket_id:'SUP-1',kategori:'BUG',judul:'<img src=x onerror=alert(1)>',product_id:'P-POS',status:'OPEN',created_at:'2026-11-14'}];go('dukungan')",h.context);
  assert.match(h.nodes.screen.innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/<img src=x onerror/);
});
test('admin member search filters are rendered with safe labels',()=>{
  const h=preview('admin');
  vm.runInContext("state.memberSearch={total:1,items:[{member_id:'M1',nama:'<script>alert(1)</script>',nama_usaha:'Toko',status:'AKTIF',wa_akhir:'9999',produk:[]}]};go('member')",h.context);
  assert.match(h.nodes.screen.innerHTML,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/<script>alert\(1\)<\/script>/);
});

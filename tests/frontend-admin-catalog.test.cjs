'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const QA_CATALOG=require('./fixtures/catalog.cjs');
const script=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8')
  .replace(/^import .*?;\s*$/gm,'');
const style=fs.readFileSync(path.join(__dirname,'../assets/unified-theme.css'),'utf8');
function makePreview(mode='admin',route='produk'){
  const nodes={},listeners={},apiCalls=[];
  const el=id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',append(){},
    addEventListener(type,fn){listeners[id+':'+type]=fn;},querySelector(){return {disabled:false}}});
  const doc={body:{classList:{toggle(){}},setAttribute(){}},title:'',
    getElementById:el,addEventListener(type,fn){listeners[type]=fn;}};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',paymentsEnabled:false,
    catalogEnabled:false,notificationsEnabled:false,lmsEnabled:false,
    supportEnabled:false},addEventListener(){},scrollTo(){}};
  const ctx=vm.createContext({window,document:doc,
    location:{href:'https://example.invalid/',hash:'#'+route,search:'?preview='+mode,
      origin:'https://example.invalid'},
    history:{replaceState(){}},
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    api(...args){apiCalls.push(args);throw Error('Preview API call');},
    isConnected:()=>false,isWriteEnabled:()=>false,
    ApiError:class ApiError extends Error{},setTimeout,clearTimeout,
    URL,URLSearchParams,Intl,Date,Map,Number});
  vm.runInContext(script,ctx,{timeout:5000});
  vm.runInContext('state.catalog='+JSON.stringify(QA_CATALOG)+';render()',ctx,{timeout:3000});
  return {nodes,ctx,apiCalls};
}
test('local QA admin catalogue renders eight isolated test records',()=>{
  const h=makePreview();
  assert.match(h.nodes.screen.innerHTML,/Katalog & penawaran/);
  assert.match(h.nodes.screen.innerHTML,/Jasa Video Iklan AI/);
  assert.match(h.nodes.screen.innerHTML,/Bundel Ebook/);
  assert.match(h.nodes.screen.innerHTML,/8 produk tercatat/);
  assert.match(h.nodes.screen.innerHTML,/id="admin-catalog-form"/);
  assert.match(h.nodes.screen.innerHTML,/TIDAK DAPAT DIEDIT/);
  assert.match(h.nodes.screen.innerHTML,/disabled title="Pengelolaan katalog belum diaktifkan"/);
  assert.equal(h.apiCalls.length,0);
});
test('member has no admin catalog and cannot open the editor',()=>{
  const h=makePreview('member','produk');
  assert.match(h.nodes.screen.innerHTML,/Masuk untuk membuka katalog admin/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/id="admin-catalog-form"/);
  assert.doesNotMatch(h.nodes['mobile-nav'].innerHTML,/data-route="produk"/);
});
test('catalogue editor has whitelisted fields, immutable type when editing',()=>{
  const h=makePreview();
  vm.runInContext("state.catalogEditId='P-EBOOK';render()",h.ctx);
  const html=h.nodes.screen.innerHTML;
  for(const name of ['nama','harga','urut','deskripsi','kredit_diberikan',
    'durasi_hari','bisa_komisi','perlu_approval_admin']){
    assert.ok(html.includes('name="'+name+'"'),name);
  }
  assert.match(html,/<select class="input" id="cat-tipe" name="tipe" disabled>/);
  assert.match(html,/Buat baru/);
  assert.equal(h.apiCalls.length,0);
});
test('catalogue UX is responsive and follows global Slate & Ink design',()=>{
  assert.match(style,/\.catalog-admin-layout/);
  assert.match(style,/\.catalog-admin-row/);
  assert.match(style,/\.catalog-admin-form/);
  assert.match(style,/@media\(max-width:760px\)[\s\S]*?\.catalog-admin-layout\{grid-template-columns:1fr/);
  assert.match(style,/@media\(max-width:360px\)[\s\S]*?\.catalog-form-grid\{grid-template-columns:1fr/);
});

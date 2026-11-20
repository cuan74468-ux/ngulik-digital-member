'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(base,'js/app.js'),'utf8').replace(/^import .*?\n/gm,'');
const lms=fs.readFileSync(path.join(base,'js/lms-ui.js'),'utf8');
const css=fs.readFileSync(path.join(base,'assets/member-mobile.css'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
function preview(mode='member',route='beranda'){
  const nodes={},classes=new Set(),attributes={},listeners={};
  let apiCalls=0;
  function el(id){return nodes[id]||(nodes[id]={innerHTML:'',textContent:'',
    addEventListener(type,fn){listeners[id+':'+type]=fn;},
    append(){},querySelector(){return {disabled:false}}});}
  const document={body:{
    classList:{toggle(name,value){if(value)classes.add(name);else classes.delete(name);}},
    setAttribute(name,value){attributes[name]=value;}
  },getElementById:el,addEventListener(){},title:''};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',supportEnabled:false,lmsEnabled:false,
    paymentsEnabled:false,qrisImageUrl:'',qrisMerchant:''},
    addEventListener(){},scrollTo(){}};
  const location={href:'https://example.invalid/',origin:'https://example.invalid',
    search:mode?'?preview='+mode:'',hash:'#'+route};
  const ctx=vm.createContext({window,document,location,
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    history:{replaceState(){}},URL,URLSearchParams,Intl,Date,Number,Map,
    api(){apiCalls++;throw Error('PREVIEW_MUST_NOT_CALL_API')},
    isConnected:()=>false,isWriteEnabled:()=>false,
    ApiError:class ApiError extends Error{},
    setTimeout,clearTimeout
  });
  vm.runInContext(lms,ctx,{timeout:3000});
  vm.runInContext(js,ctx,{timeout:5000});
  const go=route=>vm.runInContext('go('+JSON.stringify(route)+')',ctx,{timeout:2000});
  return {ctx,document,nodes,classes,attributes,listeners,go,apiCalls:()=>apiCalls};
}
test('mobile member stylesheet is loaded after main theme',()=>{
  assert.ok(html.indexOf('assets/member-mobile.css')>html.indexOf('assets/app.css'));
  assert.match(html,/id="mobile-back"/);
  assert.match(css,/body\.member-experience/);
  assert.match(css,/@media\(max-width:760px\)/);
});
test('member-only theme is active for member and onboarding but not admin',()=>{
  const member=preview('member');
  assert.equal(member.classes.has('member-experience'),true);
  const guest=preview('','login');
  assert.equal(guest.classes.has('member-experience'),true);
  const admin=preview('admin');
  assert.equal(admin.classes.has('member-experience'),false);
});
test('redesigned member dashboard shows a bounded real progress ring and navigation',()=>{
  const h=preview('member');
  assert.match(h.nodes.screen.innerHTML,/member-focus-ring/);
  assert.match(h.nodes.screen.innerHTML,/33 persen progres modul/);
  assert.match(h.nodes.screen.innerHTML,/Lanjutkan kelas/);
  assert.match(h.nodes.screen.innerHTML,/data-lms-action="open-course"/);
  assert.match(h.nodes['mobile-nav'].innerHTML,/data-route="ai"/);
  assert.match(h.nodes['mobile-nav'].innerHTML,/data-route="katalog"/);
  assert.match(h.nodes.screen.innerHTML,/wallet-hero/);
  assert.match(h.nodes['mobile-nav'].innerHTML,/aria-current="page"/);
  assert.equal(h.attributes['data-member-route'],'beranda');
});
test('mobile uses exactly four transactional destinations while class routes remain accessible',()=>{
  const h=preview('member','lms-course');
  const nav=h.nodes['mobile-nav'].innerHTML;
  for(const route of ['beranda','ai','katalog','affiliate'])
    assert.match(nav,new RegExp('data-route="'+route+'"'));
  assert.doesNotMatch(nav,/data-route="belajar"|data-route="menu"/);
  h.go('lms-complete');
  assert.equal(h.attributes['data-member-route'],'lms-complete');
  h.go('menu');
  assert.match(h.nodes.screen.innerHTML,/data-route="belajar"/);
});
test('success screen is explicitly labeled preview, not a real stored completion',()=>{
  const h=preview('member','lms-complete'),display=h.nodes.screen.innerHTML;
  assert.match(display,/Pelajaran Selesai!/);
  assert.match(display,/progres belajar belum tercatat/i);
  assert.match(display,/BELUM TERCATAT/);
  assert.match(display,/Buka kelas lagi/);
  assert.match(display,/Lihat kelas lain/);
  assert.equal(h.apiCalls(),0);
});
test('success route without confirmed completion shows empty state',()=>{
  const h=preview('member','lms-complete');
  vm.runInContext('state.lmsCompletion=null;render()',h.ctx);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/Pelajaran Selesai!/);
  assert.match(h.nodes.screen.innerHTML,/Belum Ada Pelajaran/);
});
test('success receipt safely escapes malicious lesson names',()=>{
  const h=preview('member','lms-complete');
  vm.runInContext('state.lmsCompletion.title="<img src=x onerror=alert(1)>";render()',h.ctx);
  assert.match(h.nodes.screen.innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/<img src=x onerror/);
});
test('admin cannot see member success receipts and retains admin styling',()=>{
  const h=preview('admin','lms-complete');
  assert.equal(h.classes.has('member-experience'),false);
  assert.doesNotMatch(h.nodes.screen.innerHTML,/member-success-receipt/);
  h.go('lms');
  assert.match(h.nodes.screen.innerHTML,/id="lms-course-form"/);
});
test('read-only preview locks writes even when visual calls to action exist',()=>{
  const h=preview('member','lms-course');
  assert.equal(vm.runInContext('lmsWriteEnabled()',h.ctx),false);
  assert.equal(vm.runInContext('supportWriteEnabled()',h.ctx),false);
  assert.match(h.nodes.screen.innerHTML,/disabled title="Edit materi belum tersedia"/);
  assert.equal(h.apiCalls(),0);
});

test('admin mobile workspace exposes every operational module with a consistent active route',()=>{
  const h=preview('admin','lms-editor');
  assert.equal(h.attributes['data-app-role'],'admin');
  const bar=h.nodes['notice-slot'].innerHTML;
  assert.match(bar,/aria-label="Navigasi seluruh modul admin"/);
  for(const route of ['admin','produk','layanan','lms','pesanan','member','dukungan','rilis','antrean','akun'])
    assert.ok(bar.includes('data-route="'+route+'"'),'Admin route missing: '+route);
  assert.match(bar,/data-route="lms" aria-current="page"/);
  for(const route of ['admin','produk','pesanan','lms','menu'])
    assert.ok(h.nodes['mobile-nav'].innerHTML.includes('data-route="'+route+'"'),route);
  h.go('member360');
  assert.match(h.nodes['notice-slot'].innerHTML,/data-route="member" aria-current="page"/);
  const guest=preview('','beranda');
  assert.equal(guest.nodes['notice-slot'].innerHTML,'');
});

test('administrator account has operational controls without member-only affiliate profile',()=>{
  const h=preview('admin','akun');
  const screen=h.nodes.screen.innerHTML;
  assert.match(screen,/Akun administrator/);
  assert.match(screen,/IDENTITAS ADMIN/);
  assert.match(screen,/Buka dasbor operasional/);
  assert.match(screen,/Kelola kelas dan materi/);
  assert.match(screen,/data-action="logout"/);
  assert.doesNotMatch(screen,/Lihat referral saya|Simpan perubahan profil/);
});

test('mobile all-menu route exposes member services and admin modules without API',()=>{
  const member=preview('member','menu');
  assert.doesNotMatch(member.nodes['mobile-nav'].innerHTML,/data-route="menu"/);
  for(const route of ['ai','affiliate','dukungan','akun'])
    assert.match(member.nodes.screen.innerHTML,new RegExp('data-route="'+route+'"'));
  member.go('affiliate');
  assert.match(member.nodes['mobile-nav'].innerHTML,/data-route="affiliate" aria-current="page"/);
  const admin=preview('admin','menu');
  for(const route of ['konten','layanan','member','rilis','antrean','pengaturan','akun'])
    assert.match(admin.nodes.screen.innerHTML,new RegExp('data-route="'+route+'"'));
  assert.equal(member.apiCalls(),0);
  assert.equal(admin.apiCalls(),0);
});
test('guest all-menu offers sign-in links without bypassing access flags',()=>{
  const guest=preview('','menu');
  assert.match(guest.nodes.screen.innerHTML,/data-route="login"/);
  // The administrator entry is intentionally private; use the direct URL.
  assert.doesNotMatch(guest.nodes.screen.innerHTML,/data-route="admin-login"/);
  assert.doesNotMatch(guest.nodes.screen.innerHTML,/PRIVATE_TEST_TOKEN|FONNTE_API_KEY/);
  assert.equal(guest.apiCalls(),0);
});

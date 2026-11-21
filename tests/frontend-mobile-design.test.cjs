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
test('member native dashboard shows real-only wallet, charts, orders and shortcuts',()=>{
  const h=preview('member');
  const page=h.nodes.screen.innerHTML;
  for(const landmark of ['ngdm-dashboard','ngdm-wallet','ngdm-wallet-chart','ngdm-progress','ngdm-metrics','ngdm-shortcuts','ngdm-recent']){
    assert.match(page,new RegExp(landmark));
  }
  assert.match(page,/DOMPET TOKEN/);
  assert.match(page,/Status pesanan/);
  assert.match(page,/Aktivitas Anda/);
  assert.match(page,/data-route="ai"/);
  assert.match(page,/data-route="pesanan"/);
  assert.doesNotMatch(page,/ngd-member-hero-art|member-focus-ring|data-route="menu"/);
  assert.equal(h.attributes['data-member-route'],'beranda');
  assert.equal(h.apiCalls(),0);
});

test('member has four primary mobile tabs and a complementary More menu with no duplicates',()=>{
  const h=preview('member','lms-course');
  const dock=h.nodes['member-mobile-nav'].innerHTML;
  const sheet=h.nodes['top-nav-drawer'].innerHTML;
  assert.deepEqual([...dock.matchAll(/data-route="([^"]+)"/g)].map(m=>m[1]),
    ['beranda','katalog','ai','pesanan']);
  assert.match(dock,/data-route="beranda"[^>]*>[\s\S]*?<span>Dashboard<\/span>/);
  assert.deepEqual([...sheet.matchAll(/data-route="([^"]+)"/g)].map(m=>m[1]),
    ['beranda','katalog','ai','jasa','belajar','pesanan','affiliate','dukungan','akun']);
  assert.match(dock,/id="member-more-toggle"/);
  assert.match(dock,/aria-controls="top-nav-drawer"/);
  assert.match(sheet,/data-action="logout"/);
  // The same drawer serves desktop and mobile; phone-only CSS removes dock routes.
  const css=fs.readFileSync(path.join(base,'assets/member-native-dashboard-v1.css'),'utf8');
  for(const route of ['beranda','pesanan','katalog','ai'])
    assert.ok(css.includes('#top-nav-drawer nav [data-route="'+route+'"]'));
  assert.match(css,/@media\(max-width:760px\)/);
  h.go('menu');
  assert.equal(h.attributes['data-member-route'],'beranda');
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

test('admin top drawer and operational commandbar cover all modules',()=>{
  const h=preview('admin','lms-editor');
  assert.equal(h.attributes['data-app-role'],'admin');
  const bar=h.nodes['notice-slot'].innerHTML;
  assert.match(bar,/aria-label="Navigasi seluruh modul admin"/);
  for(const route of ['admin','produk','layanan','lms','pesanan','member','dukungan','rilis','antrean','akun'])
    assert.ok(bar.includes('data-route="'+route+'"'),'Admin route missing: '+route);
  assert.match(bar,/data-route="lms" aria-current="page"/);
  for(const route of ['admin','produk','pesanan','lms','pengaturan'])
    assert.ok(h.nodes['top-nav-drawer'].innerHTML.includes('data-route="'+route+'"'),route);
  h.go('member360');
  assert.match(h.nodes['notice-slot'].innerHTML,/data-route="member" aria-current="page"/);
  const guest=preview('','beranda');
  assert.equal(guest.nodes['notice-slot'].innerHTML,'');
});

test('administrator account has operational controls without member-only affiliate profile',()=>{
  const h=preview('admin','akun');
  const screen=h.nodes.screen.innerHTML;
  assert.match(screen,/Akun Admin/);
  assert.match(screen,/IDENTITAS ADMIN/);
  assert.match(screen,/Buka dasbor operasional/);
  assert.match(screen,/Kelola kelas dan materi/);
  assert.match(screen,/data-action="logout"/);
  assert.doesNotMatch(screen,/Lihat referral saya|Simpan perubahan profil/);
});

test('member bottom navigation never leaks into guest or admin contexts',()=>{
  const member=preview('member','beranda');
  assert.equal(member.nodes['member-mobile-nav'].hidden,false);
  assert.match(member.nodes['member-mobile-nav'].innerHTML,/data-route="beranda"/);
  member.go('menu');
  assert.equal(member.attributes['data-member-route'],'beranda');
  const guest=preview('','beranda');
  assert.equal(guest.nodes['member-mobile-nav'].hidden,true);
  assert.equal(guest.nodes['member-mobile-nav'].innerHTML,'');
  const admin=preview('admin','beranda');
  assert.equal(admin.nodes['member-mobile-nav'].hidden,true);
  for(const route of ['konten','layanan','member','rilis','antrean','pengaturan','akun'])
    assert.match(admin.nodes['top-nav-drawer'].innerHTML,new RegExp('data-route="'+route+'"'));
  assert.equal(member.apiCalls(),0);
  assert.equal(admin.apiCalls(),0);
});

test('guest drawer offers sign-in without exposing private admin login',()=>{
  const guest=preview('','beranda');
  assert.match(guest.nodes['top-nav-drawer'].innerHTML,/data-route="login"/);
  assert.doesNotMatch(guest.nodes['top-nav-drawer'].innerHTML,/data-route="admin-login"/);
  assert.doesNotMatch(guest.nodes['top-nav-drawer'].innerHTML,/PRIVATE_TEST_TOKEN|FONNTE_API_KEY/);
  assert.equal(guest.apiCalls(),0);
});

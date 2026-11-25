'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('js/app.js').replace(/^import .*?;\s*$/gm,'');
const api=read('js/api.js').replace(/^export /gm,'');
function preview(route='admin-login'){
 const elements={},events={};
 const el=id=>elements[id]||(elements[id]={innerHTML:'',textContent:'',append(){},
   querySelector(){return {disabled:false};},addEventListener(key,fn){events[id+':'+key]=fn;}});
 const doc={body:{classList:{toggle(){}},setAttribute(){}},getElementById:el,
   addEventListener(event,callback){events[event]=callback;},title:''};
 const window={NGD_CONFIG:{apiUrl:'',adminLoginEnabled:false,memberWritesEnabled:false},
   addEventListener(){},scrollTo(){}};
 const ctx=vm.createContext({window,document:doc,
   location:{href:'https://example.invalid/',origin:'https://example.invalid',search:'',hash:'#'+route},
   history:{replaceState(){}},sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
   api(){throw Error('NO_REAL_API');},ApiError:class ApiError extends Error{},
   isConnected:()=>false,isWriteEnabled:()=>false,
   URL,URLSearchParams,Date,Number,Intl,setTimeout,clearTimeout});
 vm.runInContext(app,ctx,{timeout:5000});
 return {ctx,elements,events};
}
test('administrator route is explicit and does not suggest creating a second owner account',()=>{
 const p=preview('admin-login'),html=p.elements.screen.innerHTML;
 assert.match(html,/Masuk sebagai Admin/);
 assert.match(html,/data-mode="admin"/);
 assert.match(html,/Masuk dengan nomor WhatsApp Admin/);
 assert.match(html,/autocomplete="current-password"/);
 assert.match(html,/name="pin"[^>]*pattern="\[0-9\]\{6\}"/);
 assert.match(html,/Akses administrator belum diaktifkan pada backend/);
 assert.match(html,/type="submit" disabled/);
 assert.doesNotMatch(html,/name="setuju_kebijakan"/);
 assert.match(html,/href="\.\/staging\/member\.html#admin-login"/);
});
test('unauthenticated public admin route never advertises administrator entry',()=>{
 const p=preview('admin');
 const html=p.elements.screen.innerHTML;
 assert.doesNotMatch(html,/data-route="admin-login"/);
 assert.doesNotMatch(html,/data-route="daftar"/);
 assert.match(html,/data-route="beranda"/);
});
test('member login stays independent and fails closed when public OTP is off',()=>{
 const p=preview('login'),html=p.elements.screen.innerHTML;
 assert.match(html,/ngd-member-login-closed/);
 assert.match(html,/Login member belum tersedia di halaman publik/);
 assert.doesNotMatch(html,/data-route="admin-login"/);
 assert.doesNotMatch(html,/id="login-otp"|id="pin"|id="auth-form"/);
 assert.match(html,/data-route="katalog"/);
 assert.match(html,/data-route="dukungan"/);
 // Staging OTP login remains a separately configured member experience.
 assert.match(read('staging/member-config.js'),/memberOtpLoginEnabled:true/);
});
test('administrator PIN change verifies confirmation locally before making a request',()=>{
 const app=read('js/app.js');
 assert.match(app,/name="pin_konfirmasi"/);
 assert.match(app,/newPin!==confirmation/);
 assert.match(app,/adminChangePin/);
 assert.match(app,/login_required/);
});
test('client transport only permits auth channel for three exact administrator actions',async()=>{
 const calls=[];
 const win={NGD_CONFIG:{
   apiUrl:'https://script.google.com/macros/s/FAKE_KEY_TEST_ONLY/exec',
   memberWritesEnabled:false,adminLoginEnabled:true
 }};
 const ctx=vm.createContext({
   window:win,fetch:async(_url,opts)=>{
     calls.push(JSON.parse(opts.body));
     return {ok:true,json:async()=>({ok:true,data:{ok:true}})};
   },
   AbortController,clearTimeout,setTimeout,URL,Date,Math,Intl
 });
 vm.runInContext(api,ctx,{timeout:3000});
 assert.equal(await ctx.isWriteEnabled(),false);
 await ctx.api('adminLogin',{wa:'6280000000000',pin:'000001'},'',{write:true,adminAuth:true});
 assert.equal(calls.length,1);
 assert.equal(calls[0].action,'adminLogin');
 for(const action of ['register','createOrder','adminRefundOrder','adminAdjustCredit',
     'adminCreateContent','adminVerifyOrder']){
   await assert.rejects(ctx.api(action,{},'',{write:true,adminAuth:true}),/tidak diizinkan/);
 }
 await assert.rejects(ctx.api('register',{},'',{write:true}),/tidak tersedia/);
 assert.equal(calls.length,1);
});

test('signed-in Admin dashboard prioritizes editable modules, not repeated disabled-state notices',()=>{
 const p=preview('admin');
 vm.runInContext("state.token='TEST_ONLY_TOKEN';state.me={role:'ADMIN',member_id:'TEST',nama:'Owner'};render()",p.ctx,{timeout:3000});
 const html=p.elements.screen.innerHTML;
 for(const route of ['konten','produk','lms','layanan'])
   assert.match(html,new RegExp('data-route="'+route+'"'));
 assert.match(html,/Pintasan pengelolaan/);
 assert.match(html,/<h2>Operasional<\/h2>/);
 assert.doesNotMatch(html,/Kesiapan operasional backend|Mode baca-saja|Perubahan data.*Nonaktif/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('apps-script/Code.gs'),admin=read('apps-script/AdminAccess.gs');
function fixture(enabled=false){
 const props={
   NGD_ENVIRONMENT:'PRODUCTION',NGD_DB_ID:'EXAMPLE-DB',
   NGD_ADMIN_LOGIN_ENABLED:enabled?'true':'false',
   NGD_ADMIN_LOGIN_DB_ID:'EXAMPLE-DB',
   NGD_ADMIN_LOGIN_ACCOUNT_ID:'M-0001',
   NGD_MUTATIONS_ENABLED:'false'
 };
 const ctx=vm.createContext({
   console:{log(){},warn(){},error(){}},
   PropertiesService:{getScriptProperties(){return {
     getProperty:k=>props[k]||'',
     setProperty(k,v){props[k]=v;},
     deleteProperty(k){delete props[k];}
   };}},
   ContentService:{
     MimeType:{JSON:'json'},
     createTextOutput(content){return {
       setMimeType(){return this;},getContent(){return content;}
     };}
   },
   Utilities:{formatDate(){return '2026-11-14T18:00:00';}}
 });
 vm.runInContext(code,ctx,{timeout:10000});
 vm.runInContext(admin,ctx,{timeout:10000});
 return {ctx,props,request(action,payload={},token='') {
   const body=JSON.stringify({action,payload,token,request_id:'ADMIN_REQUEST_ID_123456789'});
   return JSON.parse(ctx.doPost({postData:{contents:body}}).getContent());
 }};
}
test('admin auth is fail closed and cannot unlock registration, orders or money flows',()=>{
 const h=fixture(false);
 assert.equal(h.request('adminLogin').error.code,'MAINTENANCE');
 h.props.NGD_ADMIN_LOGIN_ENABLED='true';
 h.props.NGD_ADMIN_LOGIN_DB_ID='OTHER-DB';
 assert.equal(h.request('adminLogin').error.code,'MAINTENANCE');
 h.props.NGD_ADMIN_LOGIN_DB_ID='EXAMPLE-DB';
 assert.equal(h.ctx.adminPortalEnabled_(),true);
 for(const action of ['register','login','createOrder','adminRefundOrder','adminAdjustCredit',
   'adminCreateCatalogItem','adminCreateContent','adminPublishLMSCourse']){
   assert.equal(h.request(action).error.code,'MAINTENANCE',action);
 }
 h.props.NGD_ADMIN_LOGIN_ACCOUNT_ID='';
 assert.equal(h.request('adminLogin').error.code,'MAINTENANCE');
});
test('isolated login actually dispatches with global mutations disabled and never authenticates members',()=>{
 const h=fixture(true);
 let called=0;
 h.ctx.authLogin_=(p,only,expected)=>{
   called++;
   assert.equal(only,true);
   assert.equal(expected,'M-0001');
   if(p.role!=='ADMIN')throw h.ctx.ngdError_('UNAUTHORIZED','Nomor WhatsApp atau PIN salah.');
   return {token:'FAKE_ONLY_TEST',profil:{role:'ADMIN'}};
 };
 const bad=h.request('adminLogin',{role:'MEMBER'});
 assert.equal(bad.error.code,'UNAUTHORIZED');
 const yes=h.request('adminLogin',{role:'ADMIN'});
 assert.equal(yes.ok,true);
 assert.equal(yes.data.profil.role,'ADMIN');
 assert.equal(called,2);
 assert.equal(h.ctx.mutationsEnabled_(),false);
});
test('normal member credentials never acquire admin session, even with correct PIN',()=>{
 const h=fixture(true),pin='482951',salt='secure-test-salt',wa='6281234567890';
 h.ctx.sha256_=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
 const rows=[
   {member_id:'M-0001',role:'ADMIN',status:'AKTIF',wa:'628000111222',
     pin_salt:salt,pin_hash:h.ctx.pinHash_(pin,salt)},
   {member_id:'M-0002',role:'MEMBER',status:'AKTIF',wa,
     pin_salt:salt,pin_hash:h.ctx.pinHash_(pin,salt)}
 ];
 let issued=0,failures=0;
 h.ctx.withLock_=fn=>fn();
 h.ctx.loginGuard_=()=>({attempts:0});
 h.ctx.byId_=(table,col,val)=>rows.find(x=>x[col]===val)||null;
 h.ctx.findRows_=(table,predicate)=>table==='members'?rows.filter(predicate):[];
 h.ctx.noteLoginFailure_=()=>{failures++;};
 h.ctx.extendAdminLock_=()=>{};
 h.ctx.clearLoginFailures_=()=>{};
 h.ctx.updateActivity_=()=>{};
 h.ctx.newSessionMember_=m=>{issued++;return {token:'TEST',profil:{role:m.role}};};
 assert.throws(()=>h.ctx.adminPortalLogin_({wa,pin}),/Nomor WhatsApp atau PIN salah/);
 assert.equal(issued,0);
 assert.equal(failures,1);
 const ok=h.ctx.adminPortalLogin_({wa:'628000111222',pin});
 assert.equal(ok.profil.role,'ADMIN');
 assert.equal(issued,1);
 // Public member login must never issue a session for an administrator,
 // even when the administrator supplies the correct WhatsApp and PIN.
 assert.throws(()=>h.ctx.authLogin_({wa:'628000111222',pin}),/Nomor WhatsApp atau PIN salah/);
 assert.equal(issued,1);
 // Ordinary members can still authenticate through the member-only route.
 const member=h.ctx.authLogin_({wa,pin});
 assert.equal(member.profil.role,'MEMBER');
 assert.equal(issued,2);
});
test('admin logout and PIN update require valid admin session; member requests denied',()=>{
 const h=fixture(true);
 h.ctx.admin_=()=>{throw h.ctx.ngdError_('FORBIDDEN','Akses ditolak');};
 h.ctx.activeMember_=()=>({role:'MEMBER'});
 assert.equal(h.request('adminLogout',{},'member-token').error.code,'FORBIDDEN');
 assert.equal(h.request('adminChangePin',{pin_lama:'283951',pin_baru:'927315'},'member-token').error.code,'FORBIDDEN');
});
test('owner recovery never touches Sheets without preflight approval and matching operator',()=>{
 const h=fixture(true);
 let reads=0;
 h.ctx.Session={getEffectiveUser(){return {getEmail(){return 'owner@example.com';}}}};
 h.ctx.SpreadsheetApp=new Proxy({}, {get(){reads++;throw Error('NO_GOOGLE_IO');}});
 h.props.NGD_ADMIN_RECOVERY_ENABLED='true';
 h.props.NGD_ADMIN_RECOVERY_DB_ID='WRONG-DB';
 h.props.NGD_ADMIN_RECOVERY_ACCOUNT_ID='M-0001';
 h.props.NGD_ADMIN_RECOVERY_OPERATOR_EMAIL='owner@example.com';
 assert.throws(()=>h.ctx.recoverAdminPinOwnerOnly(),/Konfigurasi atau kewenangan pemulihan PIN tidak valid/);
 assert.equal(reads,0);
 h.props.NGD_ADMIN_RECOVERY_DB_ID='EXAMPLE-DB';
 assert.throws(()=>h.ctx.recoverAdminPinOwnerOnly(),/NO_GOOGLE_IO/);
 assert.equal(reads,1);
 h.props.NGD_ENVIRONMENT='PRODUCTION';
 h.props.NGD_STAGING_BOOTSTRAP_ENABLED='true';
 h.props.NGD_STAGING_BOOTSTRAP_DB_ID='EXAMPLE-DB';
 assert.throws(()=>h.ctx.bootstrapStagingAdminOwnerOnly(),/hanya diizinkan di staging/);
});
test('frontend admin login is independent while registrations and payments stay blocked',()=>{
 const conf=read('config.js'),client=read('js/api.js'),app=read('js/app.js');
 assert.match(conf,/adminLoginEnabled:\s*true/);
 assert.match(conf,/memberWritesEnabled:\s*false/);
 assert.match(conf,/registrationOtpEnabled:\s*false/);
 assert.match(conf,/paymentsEnabled:\s*false/);
 assert.match(client,/adminAuth = false/);
 assert.match(client,/adminLogin','adminLogout','adminChangePin/);
 assert.match(app,/data-mode/);
 assert.match(app,/adminMode\?'admin':register/);
 assert.match(app,/adminMode\?'adminLogin'/);
 assert.match(app,/adminLoginEnabled\(\)/);
 assert.match(app,/adminChangePin/);
 assert.match(app,/adminLogout/);
});

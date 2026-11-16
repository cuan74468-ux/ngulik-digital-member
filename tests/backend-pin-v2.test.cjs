'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const access=fs.readFileSync(path.join(root,'apps-script/AdminAccess.gs'),'utf8');
const pepper='FAKE_ONLY_NON_PRODUCTION_LONG_SERVER_SECRET_1234567890';
const pin='485192',salt='FAKE_MEMBER_SALT';

function boot(override={}) {
  const props={NGD_PIN_HASH_V2_ENABLED:'false',...override},calls={mac:0,logs:[]};
  const ctx=vm.createContext({
    console:{log(v){calls.logs.push(String(v));},warn(){},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty:k=>props[k]??null};}},
    Utilities:{Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature(value,key,charset){
      assert.equal(charset,'UTF-8');calls.mac++;
      return [...crypto.createHmac('sha256',key).update(value,'utf8').digest()];
    }}
  });
  vm.runInContext(source,ctx,{timeout:10000});
  vm.runInContext(access,ctx,{timeout:10000});
  ctx.sha256_=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
  return {ctx,props,calls};
}
test('legacy PIN hashes remain byte-for-byte identical by default',()=>{
  const h=boot(),legacy=crypto.createHash('sha256').update(salt+pin).digest('hex');
  assert.equal(h.ctx.pinHashForWrite_(pin,salt),legacy);
  assert.equal(h.ctx.pinMatches_(pin,salt,legacy),true);
  assert.equal(h.ctx.pinMatches_('000000',salt,legacy),false);
  assert.equal(h.calls.mac,0);
});
test('V2 write mode requires a server-side pepper before hashing',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true'});
  assert.throws(()=>h.ctx.pinHashForWrite_(pin,salt),/Keamanan PIN belum dikonfigurasi/);
  h.props.NGD_PIN_HASH_PEPPER='short';
  assert.throws(()=>h.ctx.pinHashForWrite_(pin,salt),/Keamanan PIN belum dikonfigurasi/);
  assert.equal(h.calls.mac,0);
});
test('V2 is domain-separated HMAC SHA256 with salt and secret',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true',NGD_PIN_HASH_PEPPER:pepper});
  const hash=h.ctx.pinHashForWrite_(pin,salt);
  const expected=crypto.createHmac('sha256',pepper).update('NGD|PIN|V2|'+salt+'|'+pin).digest('hex');
  assert.equal(hash,'v2$'+expected);
  assert.match(hash,/^v2\$[a-f0-9]{64}$/);
  assert.equal(h.ctx.pinMatches_(pin,salt,hash),true);
  assert.equal(h.ctx.pinMatches_('485193',salt,hash),false);
  assert.notEqual(h.ctx.pinHashForWrite_(pin,'DIFFERENT'),hash);
});
test('V1 account still authenticates when V2 writing is enabled',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true',NGD_PIN_HASH_PEPPER:pepper});
  const legacy=h.ctx.pinHash_(pin,salt);
  assert.equal(h.ctx.pinMatches_(pin,salt,legacy),true);
  assert.match(h.ctx.pinHashForWrite_(pin,salt),/^v2\$/);
});
test('disabling V2 writes does not invalidate V2 accounts while pepper is retained',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true',NGD_PIN_HASH_PEPPER:pepper});
  const stored=h.ctx.pinHashForWrite_(pin,salt);
  h.props.NGD_PIN_HASH_V2_ENABLED='false';
  assert.equal(h.ctx.pinMatches_(pin,salt,stored),true);
  assert.equal(h.ctx.pinMatches_(pin,salt,h.ctx.pinHashForWrite_(pin,salt)),true);
});
test('missing pepper rejects a V2 account instead of falling back to V1',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true',NGD_PIN_HASH_PEPPER:pepper});
  const stored=h.ctx.pinHashForWrite_(pin,salt);
  delete h.props.NGD_PIN_HASH_PEPPER;
  assert.throws(()=>h.ctx.pinMatches_(pin,salt,stored),/Keamanan PIN belum dikonfigurasi/);
});
test('unrecognized and malformed hash formats always fail closed',()=>{
  const h=boot({NGD_PIN_HASH_PEPPER:pepper});
  for(const stored of ['', 'v2$', 'v2$'+ 'g'.repeat(64),
      'v3$'+'a'.repeat(64),'f'.repeat(63), 'unknown'])
    assert.equal(h.ctx.pinMatches_(pin,salt,stored),false);
});
test('login does not silently migrate legacy hashes; explicit change can write V2',()=>{
  const h=boot({NGD_PIN_HASH_V2_ENABLED:'true',NGD_PIN_HASH_PEPPER:pepper});
  const m={_row:3,member_id:'M-T',wa:'6281234567890',role:'MEMBER',status:'AKTIF',
    pin_salt:salt,pin_hash:h.ctx.pinHash_(pin,salt)};
  h.ctx.withLock_=fn=>fn();
  h.ctx.loginGuard_=()=>({attempts:0});
  h.ctx.byId_=(tab,col,id)=>tab==='members'&&m[col]===id?m:null;
  h.ctx.noteLoginFailure_=()=>{};h.ctx.clearLoginFailures_=()=>{};
  h.ctx.updateActivity_=()=>{};
  let issueCount=0;
  h.ctx.newSessionMember_=()=>{issueCount++;return {token:'FAKE'};};
  assert.equal(h.ctx.authLogin_({wa:'081234567890',pin},false).token,'FAKE');
  assert.equal(m.pin_hash,h.ctx.pinHash_(pin,salt));
  h.ctx.checkNewPin_=()=>{};h.ctx.newSalt_=()=> 'SALT2';
  h.ctx.updateRow_=(tab,row,patch)=>Object.assign(m,patch);
  h.ctx.findRows_=()=>[];h.ctx.logAudit_=()=>{};
  assert.equal(h.ctx.authChangePin_(m,{pin_lama:pin,pin_baru:'582741'}).login_required,true);
  assert.match(m.pin_hash,/^v2\$/);
  assert.equal(h.ctx.pinMatches_('582741','SALT2',m.pin_hash),true);
  assert.equal(issueCount,1);
  assert.equal(h.calls.logs.some(s=>s.includes('582741')),false);
});
test('administrator recovery and bootstrap also use version-aware writers',()=>{
  assert.match(access,/!pinMatches_\(newPin, admin\.pin_salt, admin\.pin_hash\)/);
  assert.match(access,/pin_hash: pinHashForWrite_\(newPin, salt\)/);
  assert.match(access,/pin_hash:pinHashForWrite_\(pin,salt\)/);
  assert.match(source,/pin_hash:pinHashForWrite_\(p\.pin_baru,salt\)/);
  assert.match(source,/pin_hash:pinHashForWrite_\(pin,salt\)/);
});
test('the backend still has exactly one registration and one authentication handler',()=>{
  for(const f of ['authRegister_','authLogin_','authChangePin_','pinHash_','pinHashV2_'])
    assert.equal(source.split('function '+f+'(').length-1,1,f);
});

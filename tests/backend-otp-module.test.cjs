'use strict';
// STAGING OTP module security checks. No Google services or network are called.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const otp=fs.readFileSync(path.join(__dirname,'../apps-script/OtpAuth.gs'),'utf8');

function boot(override) {
  const properties=Object.assign({
    NGD_DB_ID:'staging-test-db',
    NGD_OTP_STAGING_DB_ID:'staging-test-db',
    NGD_ENVIRONMENT:'STAGING',
    NGD_OTP_REGISTRATION_ENABLED:'true',
    NGD_REGISTRATION_ENABLED:'true',
    NGD_MUTATIONS_ENABLED:'true',
    NGD_EXTERNAL_PROVIDERS_ENABLED:'true',
    NGD_OTP_HASH_PEPPER:'123456789abcdef0123456789abcdef01234567890'
  },override||{});
  const sandbox={
    console:{log(){},error(){},warn(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(name){return properties[name]||null;}}}},
    Utilities:{computeDigest(){throw Error('USE_HASH_STUB');}},
    SpreadsheetApp:new Proxy({}, {get(){throw Error('SPREADSHEET_IO_FORBIDDEN');}}),
    UrlFetchApp:new Proxy({}, {get(){throw Error('NETWORK_FORBIDDEN');}})
  };
  vm.createContext(sandbox);
  vm.runInContext(code+'\n'+otp,sandbox,{timeout:2000});
  sandbox.sha256_ = s => 'hash-'+s;
  return sandbox;
}

test('registration OTP is restricted to STAGING',()=>{
  const x=boot({NGD_ENVIRONMENT:'PRODUCTION'});
  assert.throws(()=>x.ngdOtpProperties_(),/STAGING belum diaktifkan/);
});
test('staging database ID mismatch is rejected',()=>{
  const x=boot({NGD_OTP_STAGING_DB_ID:'other'});
  assert.throws(()=>x.ngdOtpProperties_(),/STAGING belum diaktifkan/);
});
test('missing OTP pepper is rejected',()=>{
  const x=boot({NGD_OTP_HASH_PEPPER:'short'});
  assert.throws(()=>x.ngdOtpProperties_(),/Secret OTP STAGING belum siap/);
});
test('missing Fonnte token fails before DB access or network send',()=>{
  const x=boot();
  assert.throws(()=>x.ngdOtpRequest_({wa:'081234567890'}),/Gateway OTP belum dikonfigurasi/);
});
test('request OTP requires explicit WhatsApp consent',()=>{
  const x=boot({FONNTE_API_TOKEN:'PLACEHOLDER_TEST_TOKEN'});
  assert.throws(()=>x.ngdOtpRequest_({wa:'081234567890'}),/Persetujuan pengiriman kode WhatsApp/);
});
test('malformed OTP cannot trigger a database read',()=>{
  const x=boot();
  assert.throws(()=>x.ngdOtpVerify_({wa:'081234567890',otp:'bad'}),/enam angka/);
});
test('verified OTP is consumable exactly once',()=>{
  const x=boot();
  const number='6281234567890';
  const row={
    _row:2,otp_id:'OTP-T',wa:number,
    tujuan:'REGISTRATION',status:'VERIFIED',attempts:0,
    expires_at:new Date(Date.now()+180000),
    kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',number,'285947')
  };
  x.ngdOtpRead_=()=>[row];
  x.ngdOtpPatch_=(id,patch)=>{assert.equal(id,2);Object.assign(row,patch);};
  const p={wa:'081234567890',otp:'285947'};
  assert.equal(x.ngdConsumeVerifiedRegistrationOtp_(p),true);
  assert.equal(row.status,'USED');
  assert.throws(()=>x.ngdConsumeVerifiedRegistrationOtp_(p),/belum selesai/);
});
test('wrong OTP increases attempts and then locks the record',()=>{
  const x=boot();
  const number='6281234567890';
  const row={
    _row:2,wa:number,tujuan:'REGISTRATION',status:'VERIFIED',attempts:0,
    expires_at:new Date(Date.now()+180000),
    kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',number,'285947')
  };
  x.ngdOtpRead_=()=>[row];
  x.ngdOtpPatch_=(id,patch)=>{Object.assign(row,patch);};
  for(let n=1;n<=3;n++){
    assert.throws(()=>x.ngdConsumeVerifiedRegistrationOtp_({wa:'081234567890',otp:'111111'}),/Kode OTP salah/);
    assert.equal(row.attempts,n);
  }
  assert.equal(row.status,'LOCKED');
  assert.throws(()=>x.ngdConsumeVerifiedRegistrationOtp_({wa:'081234567890',otp:'285947'}),/belum selesai/);
});

test('OTP request refuses a broken member evidence schema before sending WhatsApp',()=>{
  const x=boot({FONNTE_API_TOKEN:'PLACEHOLDER_TEST_TOKEN'});
  x.tbl_=()=>({headers:['member_id','wa','pin_hash','pin_salt']});
  assert.throws(()=>x.ngdOtpRequest_({wa:'081234567890',setuju_kebijakan:true}),
    /Kolom bukti verifikasi WA/);
});

test('global provider kill switch blocks OTP even when all individual registration gates are ON',()=>{
  const x=boot({NGD_EXTERNAL_PROVIDERS_ENABLED:'false',FONNTE_API_TOKEN:'TEST_ONLY'});
  assert.throws(()=>x.ngdOtpRequest_({wa:'081234567890',setuju_kebijakan:true}),
    /Registrasi OTP STAGING belum diaktifkan/);
  assert.throws(()=>x.ngdOtpProperties_(),/Registrasi OTP STAGING belum diaktifkan/);
});


function registrationHarness(options={}) {
  const x=boot();
  const number='6281234567890';
  const members=[],credits=[],audits=[],sessions=[];
  const row={
    _row:2,otp_id:'OTP-TEST-001',wa:number,tujuan:'REGISTRATION',
    status:'VERIFIED',attempts:0,expires_at:new Date(Date.now()+180000),
    kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',
      number,'285947')
  };
  let failInsert=Boolean(options.failInsert),failConsume=Boolean(options.failConsume),
    failAudit=Boolean(options.failAudit),failGrant=Boolean(options.failGrant),
    failSession=Boolean(options.failSession);
  const rowPatches=[];
  x.withLock_=fn=>fn();
  x.ngdOtpRead_=()=>[row];
  x.ngdOtpPatch_=(r,p)=>{
    if(failConsume && p.status==='USED') {
      failConsume=false;throw Error('SIMULATED_OTP_COMMIT_FAILURE');
    }
    assert.equal(r,2);Object.assign(row,p);rowPatches.push(p);
  };
  x.tbl_=()=>({headers:['member_id','wa','pin_hash','pin_salt',
    'wa_verified','wa_verified_at']});
  x.checkNewPin_=()=>{};
  x.safeText_=v=>String(v||'');
  x.byId_=(name,key,value)=>{
    if(name==='members'&&key==='wa')
      return members.find(m=>m.wa===value)||null;
    return null;
  };
  x.settings_=()=>({mode_pendaftaran:'TERBUKA',kuota_gelombang:50,kredit_awal:10});
  const originalReadAll=x.readAll_;
  x.readAll_=name=>name==='pengaturan_sistem'?[{key:'kredit_awal',value:10,tipe:'NUMBER'}]:originalReadAll(name);
  x.memberCount_=()=>members.length;
  x.memberWaitlist_=()=>[];
  x.newSalt_=()=> 'TEST_SALT_NOT_REAL';
  x.nextMemberId_=()=> 'M-0002';
  x.now_=()=>new Date('2026-11-16T00:00:00Z');
  x.pinHash_=()=> 'TEST_PIN_HASH_NOT_REAL';
  x.newReferralCode_=()=> 'TEST_REF';
  x.appendRow_=(table,data)=>{
    if(table==='members'){
      if(failInsert){failInsert=false;throw Error('SIMULATED_MEMBER_INSERT_FAILURE');}
      members.push(data);return;
    }
    if(table==='credits_ledger'){credits.push(data);return;}
    throw Error('UNEXPECTED_WRITE_'+table);
  };
  x.logAudit_=(...args)=>{
    if(failAudit){failAudit=false;throw Error('SIMULATED_AUDIT_APPEND_FAILURE');}
    audits.push(args);
  };
  x.grantInitialCredit_=(id,amount)=>{
    if(failGrant){failGrant=false;throw Error('SIMULATED_CREDIT_GRANT_FAILURE');}
    credits.push({id,amount});return {granted:true};
  };
  x.newSessionMember_=m=>{
    if(failSession){failSession=false;throw Error('SIMULATED_SESSION_ISSUE_FAILURE');}
    sessions.push(m.member_id);return {token:'TEST_SESSION'};
  };
  const data={wa:'081234567890',otp:'285947',pin:'285947',
    nama:'Anggota Pengujian',nama_usaha:'Usaha Pengujian',setuju_kebijakan:true};
  return {x,data,row,members,credits,audits,sessions,rowPatches,
    register:()=>x.authRegister_(data)};
}

test('partial member INSERT failure leaves valid OTP unconsumed, allowing a safe retry',()=>{
  const h=registrationHarness({failInsert:true});
  assert.throws(()=>h.register(),/SIMULATED_MEMBER_INSERT_FAILURE/);
  assert.equal(h.row.status,'VERIFIED');
  assert.equal(h.members.length,0);
  assert.equal(h.credits.length,0);
  assert.equal(h.sessions.length,0);
  const success=h.register();
  assert.equal(success.status,'AKTIF');
  assert.equal(h.row.status,'USED');
  assert.equal(h.members.length,1);
  assert.equal(h.credits.length,1);
  assert.equal(h.sessions.length,1);
  assert.throws(()=>h.register(),/sudah terdaftar/);
  assert.equal(h.members.length,1);
  assert.equal(h.credits.length,1);
});
test('OTP commit failure after account write cannot mint second account or starter grant',()=>{
  const h=registrationHarness({failConsume:true});
  assert.throws(()=>h.register(),/SIMULATED_OTP_COMMIT_FAILURE/);
  assert.equal(h.members.length,1);
  assert.equal(h.row.status,'VERIFIED');
  assert.equal(h.credits.length,0);
  assert.equal(h.sessions.length,0);
  assert.throws(()=>h.register(),/sudah terdaftar/);
  assert.equal(h.members.length,1);
  assert.equal(h.row.status,'VERIFIED');
  assert.equal(h.credits.length,0);
});
test('invalid OTP never inserts member; wrong code increases attempts',()=>{
  const h=registrationHarness();
  h.data.otp='111111';
  assert.throws(()=>h.register(),/Kode OTP salah/);
  assert.equal(h.row.attempts,1);
  assert.equal(h.members.length,0);
  assert.equal(h.credits.length,0);
  assert.equal(h.row.status,'VERIFIED');
});
test('OTP validation only returns server-side evidence; consumption requires matching code',()=>{
  const h=registrationHarness();
  const id=h.x.ngdValidateVerifiedRegistrationOtp_(h.data);
  assert.equal(id,'OTP-TEST-001');
  assert.equal(h.row.status,'VERIFIED');
  assert.throws(()=>h.x.ngdConsumeVerifiedRegistrationOtp_({...h.data,otp:'123456'},id),/Kode OTP salah/);
  assert.equal(h.row.status,'VERIFIED');
  assert.equal(h.x.ngdConsumeVerifiedRegistrationOtp_(h.data,id),true);
  assert.equal(h.row.status,'USED');
});

test('audit-log outage after OTP commitment leaves account registered, but no grant/session',()=>{
  const h=registrationHarness({failAudit:true});
  assert.throws(()=>h.register(),/SIMULATED_AUDIT_APPEND_FAILURE/);
  assert.equal(h.members.length,1);
  assert.equal(h.row.status,'USED');
  assert.equal(h.credits.length,0);
  assert.equal(h.sessions.length,0);
  assert.throws(()=>h.register(),/sudah terdaftar/);
  assert.equal(h.members.length,1);
  assert.equal(h.credits.length,0);
});
test('credit grant outage after registration prevents session but cannot duplicate accounts',()=>{
  const h=registrationHarness({failGrant:true});
  assert.throws(()=>h.register(),/SIMULATED_CREDIT_GRANT_FAILURE/);
  assert.equal(h.members.length,1);
  assert.equal(h.row.status,'USED');
  assert.equal(h.audits.length,1);
  assert.equal(h.credits.length,0);
  assert.equal(h.sessions.length,0);
  assert.throws(()=>h.register(),/sudah terdaftar/);
  assert.equal(h.members.length,1);
});
test('session issuance outage after successful grant never creates duplicate starter grants',()=>{
  const h=registrationHarness({failSession:true});
  assert.throws(()=>h.register(),/SIMULATED_SESSION_ISSUE_FAILURE/);
  assert.equal(h.members.length,1);
  assert.equal(h.row.status,'USED');
  assert.equal(h.credits.length,1);
  assert.equal(h.sessions.length,0);
  assert.throws(()=>h.register(),/sudah terdaftar/);
  assert.equal(h.credits.length,1);
});

test('missing starter-credit policy fails closed before OTP or account mutations',()=>{
  const h=registrationHarness();
  h.x.readAll_=()=>[];
  assert.throws(()=>h.register(),/Kebijakan kredit awal belum siap/);
  assert.equal(h.members.length,0);
  assert.equal(h.credits.length,0);
  assert.equal(h.row.status,'VERIFIED');
});
test('blank starter-credit policy fails closed instead of defaulting to 10',()=>{
  const h=registrationHarness();
  h.x.readAll_=()=>[{key:'kredit_awal',value:'',tipe:'NUMBER'}];
  assert.throws(()=>h.register(),/Kebijakan kredit awal belum siap/);
  assert.equal(h.members.length,0);
  assert.equal(h.row.status,'VERIFIED');
});

test('corrupt expiry fails closed at verify endpoint with no verified state',()=>{
 const x=boot(),wa='6281234567890';
 const row={_row:2,otp_id:'OTP-BADDATE',wa,tujuan:'REGISTRATION',
  status:'PENDING',attempts:0,expires_at:'not-a-date',
  kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',wa,'285947')};
 x.withLock_=fn=>fn();x.ngdOtpRead_=()=>[row];
 x.ngdOtpPatch_=(n,patch)=>Object.assign(row,patch);
 assert.throws(()=>x.ngdOtpVerify_({wa:'081234567890',otp:'285947'}),/kedaluwarsa/);
 assert.equal(row.status,'EXPIRED');
});
test('corrupt expiry fails closed before member-registration OTP consumption',()=>{
 const x=boot(),wa='6281234567890';
 const row={_row:2,otp_id:'OTP-BADDATE',wa,tujuan:'REGISTRATION',
  status:'VERIFIED',attempts:0,expires_at:'',
  kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',wa,'285947')};
 x.ngdOtpRead_=()=>[row];x.ngdOtpPatch_=(n,patch)=>Object.assign(row,patch);
 assert.throws(()=>x.ngdValidateVerifiedRegistrationOtp_({wa:'081234567890',otp:'285947'}),/kedaluwarsa/);
 assert.equal(row.status,'EXPIRED');
});
test('malformed or missing attempts cannot be reset to zero and cannot validate OTP',()=>{
 const x=boot(),wa='6281234567890';
 const row={_row:2,otp_id:'OTP-BAD-ATTEMPTS',wa,tujuan:'REGISTRATION',
  status:'VERIFIED',attempts:'broken',expires_at:new Date(Date.now()+180000),
  kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',wa,'285947')};
 x.ngdOtpRead_=()=>[row];let writes=0;x.ngdOtpPatch_=()=>writes++;
 const p={wa:'081234567890',otp:'285947'};
 for(const attempts of ['broken','',null,-1,3,2.5]){
  row.attempts=attempts;
  assert.throws(()=>x.ngdValidateVerifiedRegistrationOtp_(p),/Batas percobaan/);
 }
 assert.equal(writes,0);
});
test('PENDING OTP verification rejects corrupt attempt count without status writes',()=>{
 const x=boot(),wa='6281234567890';
 const row={_row:2,otp_id:'OTP-BAD-ATTEMPTS',wa,tujuan:'REGISTRATION',
  status:'PENDING',attempts:'broken',expires_at:new Date(Date.now()+180000),
  kode_hash:x.ngdOtpHash_('123456789abcdef0123456789abcdef01234567890',wa,'285947')};
 x.withLock_=fn=>fn();x.ngdOtpRead_=()=>[row];
 let writes=0;x.ngdOtpPatch_=()=>writes++;
 assert.throws(()=>x.ngdOtpVerify_({wa:'081234567890',otp:'285947'}),/Batas percobaan/);
 assert.equal(writes,0);
});

test('free registration with explicit zero policy does not post welcome credit',()=>{
 const h=registrationHarness();
 h.x.readAll_=name=>{assert.equal(name,'pengaturan_sistem');return [{key:'kredit_awal',value:0,tipe:'NUMBER'}];};
 const result=h.register();
 assert.equal(result.status,'AKTIF');
 assert.equal(h.members.length,1);
 assert.equal(h.row.status,'USED');
 assert.equal(h.credits.length,0);
 assert.equal(h.sessions.length,1);
});
test('duplicate or malformed raw credit policy blocks registration before writes',()=>{
 for(const rows of [[{key:'kredit_awal',value:0,tipe:'NUMBER'},{key:'kredit_awal',value:10,tipe:'NUMBER'}],[{key:'kredit_awal',value:'broken',tipe:'NUMBER'}]]){
  const h=registrationHarness();
  h.x.readAll_=()=>rows;
  assert.throws(()=>h.register(),/kredit awal/);
  assert.equal(h.members.length,0);
  assert.equal(h.credits.length,0);
  assert.equal(h.row.status,'VERIFIED');
 }
});

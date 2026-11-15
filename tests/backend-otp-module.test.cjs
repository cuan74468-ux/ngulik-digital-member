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

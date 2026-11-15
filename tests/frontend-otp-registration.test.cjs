'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'../config.js'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const otpBackend=fs.readFileSync(path.join(__dirname,'../apps-script/OtpAuth.gs'),'utf8');

test('public registration OTP release gate remains OFF',()=>{
  assert.match(config,/registrationOtpEnabled:\s*false/);
  assert.match(config,/memberWritesEnabled:\s*false/);
  assert.match(config,/paymentsEnabled:\s*false/);
});
test('member registration UI requests WhatsApp OTP and verifies it before submit',()=>{
  assert.match(app,/data-action="otp-request"/);
  assert.match(app,/data-action="otp-verify"/);
  assert.match(app,/api\('requestRegistrationOtp',\{wa,setuju_kebijakan:agreed\}/);
  assert.match(app,/api\('verifyRegistrationOtp',\{wa,otp\}/);
  assert.match(app,/state\.registrationOtpVerifiedWa!==payload\.wa/);
  assert.match(app,/payload\.otp=String\(fd\.get\('otp'\)/);
});
test('admin login does not inherit member registration OTP gate',()=>{
  assert.match(app,/adminMode\?adminLoginEnabled\(\):register\?registrationOtpEnabled\(\)/);
  assert.match(app,/adminMode\?'adminLogin':register\?'register':'login'/);
});
test('backend registration consumes verified one-time OTP server-side',()=>{
  assert.match(backend,/ngdConsumeVerifiedRegistrationOtp_\(p\)/);
  assert.match(otpBackend,/status:'USED'/);
  assert.match(otpBackend,/status:'LOCKED'/);
});
test('frontend OTP flow has no staging endpoint or gateway credentials',()=>{
  assert.doesNotMatch(app,/FONNTE_API_TOKEN|NGD_OTP_HASH_PEPPER/);
  assert.doesNotMatch(config,/FONNTE_API_TOKEN|NGD_OTP_HASH_PEPPER/);
});

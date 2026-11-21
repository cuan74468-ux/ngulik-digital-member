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
test('STAGING signup readiness requires verified backend flags, not just UI opt-in',()=>{
  const staging=fs.readFileSync(path.join(__dirname,'../staging/member-config.js'),'utf8');
  const stagePage=fs.readFileSync(path.join(__dirname,'../staging/member.html'),'utf8');
  assert.match(staging,/registrationOtpEnabled:\s*true/);
  assert.match(staging,/paymentsEnabled:\s*true/); // Frontend prepared, backend finance still authoritative.
  assert.match(staging,/qrisOwnerImageApproved:\s*false/);
  assert.match(app,/state\.workspaceInfo\?\.workspace==='NGD_STAGING'/);
  for(const flag of ['mutations_enabled','registration_enabled','otp_enabled','external_providers_enabled'])
    assert.match(app,new RegExp('state\\.workspaceInfo\\?\\.'+flag+'===true'));
  assert.match(app,/api\('getStagingWorkspaceInfo'\)/);
  assert.match(app,/const readinessLoad=refreshStagingReadiness_\(\)/);
  assert.match(stagePage,/member-config\.js\?v=20261121-signup-readiness-v1/);
  assert.match(stagePage,/app\.js\?v=20261121-member-portal39-1/);
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
  assert.match(app,/adminMode\?'adminLogin':register\?'register':otpLogin\?'verifyMemberLoginOtp':'login'/);
});
test('backend validates OTP, commits account and then consumes one-time proof',()=>{
  const block=backend.slice(backend.indexOf('function authRegister_('),
    backend.indexOf('function authLogin_('));
  const validate=block.indexOf('ngdValidateVerifiedRegistrationOtp_(p)');
  const insert=block.indexOf("appendRow_('members',m)");
  const consume=block.indexOf('ngdConsumeVerifiedRegistrationOtp_(p,verifiedOtpId)');
  assert.ok(validate>=0&&insert>validate&&consume>insert);
  assert.match(otpBackend,/function ngdValidateVerifiedRegistrationOtp_\(p\)/);
  assert.match(otpBackend,/status:'USED'/);
  assert.match(otpBackend,/next>=3\?'LOCKED'/);
});
test('frontend OTP flow has no staging endpoint or gateway credentials',()=>{
  assert.doesNotMatch(app,/FONNTE_API_TOKEN|NGD_OTP_HASH_PEPPER/);
  assert.doesNotMatch(config,/FONNTE_API_TOKEN|NGD_OTP_HASH_PEPPER/);
});

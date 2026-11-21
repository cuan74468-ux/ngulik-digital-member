'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),otp=read('apps-script/OtpAuth.gs');
test('STAGING member PIN fallback calls existing server-side authentication, never a fake session',()=>{
  assert.match(app,/data-staging-auth-method="pin"/);
  assert.match(app,/data-staging-auth-method="otp"/);
  assert.match(app,/state\.stagingPinLogin=method==='pin'/);
  assert.match(app,/pinLogin=memberStaging&&state\.stagingPinLogin===true/);
  assert.match(app,/pinLogin\?'pin':'login'/);
  assert.match(app,/pinLogin\?isWriteEnabled\(\):memberOtpLoginEnabled\(\)/);
  assert.match(app,/otpLogin\?'verifyMemberLoginOtp':'login'/);
  assert.match(app,/if\(!result\?\.token\|\|!result\?\.profil\)/);
  const server=read('apps-script/Code.gs');
  assert.match(server,/function authLogin_\(p,adminOnly,expectedAdminId\)/);
  assert.match(server,/loginGuard_\(wa\)/);
  assert.match(server,/pinMatches_\(pin,m\.pin_salt,m\.pin_hash\)/);
});
test('production stays OTP-gated, PIN choice is only offered for STAGING',()=>{
  assert.match(app,/String\(location\.pathname\|\|''\)\.includes\('\/staging\/'\)/);
  assert.match(app,/memberStaging\?'<div class="ngd-auth-mode-switch"/);
  assert.match(read('config.js'),/memberWritesEnabled:\s*false/);
  assert.match(read('staging/member-config.js'),/memberWritesEnabled:true/);
});
test('STAGING OTP daily cap is suited for QA but leaves global, cooldown and retry controls',()=>{
  assert.match(otp,/byWa\.length<12/);
  assert.match(otp,/sentToday<cap/);
  assert.match(otp,/now-new Date\(last\.created_at\)\.getTime\(\)<60000/);
  assert.match(otp,/ngdOtpAttemptCount_\(row\)/);
  assert.match(otp,/function ngdMemberOtpLoginGuard_\(\)/);
  assert.match(otp,/ngdOtpRecordAttempt_\(row\)/);
  assert.match(otp,/sameDay\.length<5/); // Registration cap intentionally unchanged.
});
test('STAGING PIN login CSS is mobile safe and loaded after base styles',()=>{
  const stage=read('staging/member.html');
  assert.match(stage,/staging-native-mobile\.css\?v=20261121-staging-pin-fallback-v1/);
  assert.match(stage,/app\.js\?v=20261121-staging-login-fallback-1/);
  assert.match(read('assets/staging-native-mobile.css'),/\.ngd-auth-mode-switch button\[aria-pressed="true"\]/);
});

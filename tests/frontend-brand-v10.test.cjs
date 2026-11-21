'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js'),styling=read('assets/brand-experience-v10.css');
test('icon is transparent PNG with real alpha and resolutions for favicon and header',()=>{
  for(const n of [64,192,512]){
    const bytes=fs.readFileSync(path.join(root,'assets/ngd-icon-v10-'+n+'.png'));
    assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
    const dims=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
    assert.deepEqual(dims,[n,n]);
    assert.ok(bytes.length<130000,n);
  }
  assert.match(styling,/background:transparent!important/);
});
test('both real pages use larger accessible Ngulik Digital wordmark consistently',()=>{
  for(const file of ['index.html','staging/member.html']){
    const html=read(file);
    assert.match(html,/ngd-icon-v10-64\.png\?v=20261121-v10-1/);
    assert.match(html,/ngd-icon-v10-192\.png\?v=20261121-v10-1/);
    assert.match(html,/brand-experience-v10\.css\?v=20261121-roles-v12-1/);
    assert.match(html,/Plus\+Jakarta\+Sans/);
    assert.match(html,/data-route="ai">Studio AI<\/button>/);
    assert.match(html,/20261121-roles-v12-1/);
  }
  assert.match(styling,/\.guest-brand strong/);
  assert.match(styling,/font-size:clamp\(19px,1\.46vw,23px\)/);
});
test('member uses WhatsApp OTP login; PIN stays reserved for Admin',()=>{
  assert.match(app,/const memberOtp=!adminMode&&!register;/);
  assert.match(app,/memberOtpLoginEnabled\(\)/);
  assert.match(app,/Login OTP member belum diaktifkan/);
  assert.match(app,/Masukkan nomor WhatsApp dan kode OTP\. Member tidak perlu membuat PIN/);
  assert.match(app,/PIN Admin 6 angka/);
  assert.match(app,/api\(adminMode\?'adminLogin':register\?'register':otpLogin\?'verifyMemberLoginOtp':'login'/);
  assert.match(read('config.js'),/memberWritesEnabled:\s*false/);
  assert.match(read('staging/member-config.js'),/memberOtpLoginEnabled:\s*true/);
});
test('Studio AI preserved in public and member UI, with five-tab guest mobile native menu',()=>{
  assert.match(app,/function viewAI\(\)/);
  assert.match(app,/function viewAITool\(\)/);
  assert.match(app,/getTools/);
  assert.match(app,/\['beranda','katalog','ai','jasa','menu'\]/);
  assert.match(app,/\['beranda','katalog','ai','pesanan','menu'\]/);
  assert.match(app,/\['beranda','katalog','ai','jasa','affiliate','belajar','dukungan'\]/);
  assert.match(app,/const guestNav=\['beranda','katalog','ai','jasa','affiliate','belajar','dukungan'\]/);
});

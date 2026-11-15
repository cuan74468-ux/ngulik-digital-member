'use strict';
// Architectural guard for late-bound providers: no HTTP, credentials or billing.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'contracts/provider-readiness.json'),'utf8'));
const publicConfig=fs.readFileSync(path.join(root,'config.js'),'utf8');
test('provider registry is explicitly non-executable and foundation-only',()=>{
  assert.equal(data.schemaVersion,1);
  assert.equal(data.documentType,'NON_EXECUTABLE_PROVIDER_READINESS_CONTRACT');
  assert.equal(data.releaseState,'INTERNAL_FOUNDATION_ONLY');
  assert.equal(data.externalTrafficAuthorized,false);
});
test('every external provider stays DEFERRED and has validation gates',()=>{
  assert.deepEqual(data.integrations.map(v=>v.id),[
    'registration_whatsapp','merchant_payment','ai_generation','external_notifications'
  ]);
  for(const item of data.integrations){
    assert.equal(item.status,'DEFERRED',item.id);
    assert.ok(item.mustProve.length>=6,item.id);
    assert.ok(item.candidate.includes('later')||item.candidate.includes('not selected'),item.id);
  }
});
test('no provider credentials or payout values are present in registry',()=>{
  const text=JSON.stringify(data);
  assert.doesNotMatch(text,/sk-[A-Za-z0-9]{10,}/i);
  assert.doesNotMatch(text,/Bearer\s+[A-Za-z0-9_-]{10,}/i);
  assert.doesNotMatch(text,/"apiKey"\s*:\s*"[^"]+"/i);
  assert.doesNotMatch(text,/"secretValue"\s*:/i);
  assert.ok(data.integrations.every(p=>p.secretPropertyNames.every(x=>/^[A-Z][A-Z0-9_]+$/.test(x))));
});
test('commercial and registration release switches remain OFF in public frontend',()=>{
  for(const p of ['memberWritesEnabled','registrationOtpEnabled','paymentsEnabled']){
    assert.match(publicConfig,new RegExp(p+':\\s*false'));
  }
  assert.ok(Object.values(data.releaseGates).every(value=>value===false));
});

test('global external-provider kill switch is required before any OTP integration can execute',()=>{
  const otp=fs.readFileSync(path.join(root,'apps-script/OtpAuth.gs'),'utf8');
  const infra=fs.readFileSync(path.join(root,'apps-script/InfrastructurePreflight.gs'),'utf8');
  assert.match(otp,/getProperty\('NGD_EXTERNAL_PROVIDERS_ENABLED'\)\s*===\s*'true'/);
  assert.match(infra,/'NGD_EXTERNAL_PROVIDERS_ENABLED'/);
  assert.equal(data.releaseGates.externalProviders,false);
});

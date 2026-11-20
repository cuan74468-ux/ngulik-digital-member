'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'contracts/provider-readiness.json'),'utf8'));
const publicConfig=fs.readFileSync(path.join(root,'config.js'),'utf8');
test('registry reflects explicit owner permission to implement provider features',()=>{
  assert.equal(data.schemaVersion,1);
  assert.equal(data.documentType,'NON_EXECUTABLE_PROVIDER_READINESS_CONTRACT');
  assert.equal(data.releaseState,'OWNER_AUTHORIZED_FEATURE_IMPLEMENTATION');
  assert.equal(data.externalTrafficAuthorized,true);
});
test('provider declarations retain required integrity and privacy conditions',()=>{
  assert.deepEqual(data.integrations.map(v=>v.id),[
    'registration_whatsapp','merchant_payment','ai_generation','external_notifications'
  ]);
  for(const item of data.integrations){
    assert.notEqual(item.status,'DEFERRED',item.id);
    assert.ok(item.mustProve.length>=6,item.id);
    assert.ok(Array.isArray(item.secretPropertyNames));
  }
});
test('registry never embeds live API keys, bearer tokens or private credentials',()=>{
  const txt=JSON.stringify(data);
  assert.doesNotMatch(txt,/sk-[A-Za-z0-9]{10,}/i);
  assert.doesNotMatch(txt,/Bearer\s+[A-Za-z0-9_-]{10,}/i);
  assert.doesNotMatch(txt,/"apiKey"\s*:\s*"[^"]+"/i);
  assert.doesNotMatch(txt,/"secretValue"\s*:/i);
  assert.ok(data.integrations.every(p=>p.secretPropertyNames.every(x=>/^[A-Z][A-Z0-9_]+$/.test(x))));
});
test('public frontend is enabled by owner but credentials remain server-side',()=>{
  for(const name of ['memberWritesEnabled','registrationOtpEnabled'])
    assert.match(publicConfig,new RegExp(name+':\\s*true'));
  assert.match(publicConfig,/paymentsEnabled:\s*false/); // Payment release is gated
  assert.ok(Object.values(data.releaseGates).every(Boolean));
  assert.doesNotMatch(publicConfig,/FONNTE_API_TOKEN\s*:/);
  assert.doesNotMatch(publicConfig,/SOBATAGENT_API_KEY\s*:/);
});
test('OTP provider access remains checked by server-side authorization',()=>{
  const otp=fs.readFileSync(path.join(root,'apps-script/OtpAuth.gs'),'utf8');
  assert.match(otp,/getProperty\('NGD_EXTERNAL_PROVIDERS_ENABLED'\)\s*===\s*'true'/);
  assert.equal(data.releaseGates.externalProviders,true);
});

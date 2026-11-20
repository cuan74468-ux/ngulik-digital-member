'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const txt=p=>fs.readFileSync(path.join(root,p),'utf8');
const owner=JSON.parse(txt('contracts/owner-decisions-stage1.json'));
const provider=JSON.parse(txt('contracts/provider-readiness.json'));
const frontend=txt('config.js'),admin=txt('staging/config.js');
const backend=txt('apps-script/Code.gs');
test('owner authorizes functional source implementation without silently changing live deployment',()=>{
  assert.equal(owner.documentType,'NON_EXECUTABLE_OWNER_DECISION_REGISTRY');
  assert.equal(owner.release.status,'OWNER_EXECUTION_AUTHORIZED');
  assert.equal(owner.release.stages2Through6,'IMPLEMENTATION_AUTHORIZED');
  assert.equal(owner.environment.productionAndStagingMustRemainSeparated,true);
  assert.equal(owner.environment.sourceIsNotRuntime,true);
  assert.equal(owner.ownerApprovalRequiredFor.includes('production_code_deployment'),true);
});
test('main public UI exposes enabled controls while staging endpoint remains distinct',()=>{
  for(const flag of ['memberWritesEnabled','registrationOtpEnabled',
    'lmsEnabled','supportEnabled','catalogEnabled','contentEnabled','serviceEnabled'])
    assert.match(frontend,new RegExp(flag+':\\s*true'),flag);
  assert.match(frontend,/paymentsEnabled:\s*false/); // Official QRIS still unpublished
  const endpoint=x=>x.match(/apiUrl:\s*'([^']+)'/)?.[1];
  assert.ok(endpoint(frontend)&&endpoint(admin)&&endpoint(frontend)!==endpoint(admin));
  assert.equal(owner.environment.stagingSchemaObservedTabs,29);
  assert.equal(owner.environment.productionSchemaObservedTabs,16);
});
test('Chapter 01 remains free and is not auto-imported to commercial membership',()=>{
  assert.equal(owner.programBoundary.chapter01,'FREE_100_PERCENT_NO_FORCED_PURCHASE');
  assert.equal(owner.programBoundary.communityParticipantsMustNotBeAutoImported,true);
  assert.equal(owner.programBoundary.commercial,'REAL_PAID_MEMBERSHIP_AND_DIGITAL_PRODUCTS');
});
test('owner-authorized provider implementations are not claims of provider readiness',()=>{
  assert.equal(provider.releaseState,'OWNER_AUTHORIZED_FEATURE_IMPLEMENTATION');
  assert.equal(provider.externalTrafficAuthorized,true);
  assert.ok(provider.integrations.every(x=>x.status!=='DEFERRED'));
  assert.ok(Object.values(provider.releaseGates).every(Boolean));
  assert.ok(provider.integrations.every(x=>Array.isArray(x.mustProve)&&x.mustProve.length>=6));
});
test('PIN v2 remains backwards compatible and starter credit cannot silently change',()=>{
  assert.match(backend,/getProperty\('NGD_PIN_HASH_V2_ENABLED'\)==='true'/);
  assert.match(backend,/function pinMatches_\(/);
  assert.equal(owner.starterCredit.productionAmountMutationAuthorized,false);
  assert.equal(owner.starterCredit.operatorRecoveryAutoGrantAllowed,false);
});

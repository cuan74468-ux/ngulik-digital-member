'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const txt=p=>fs.readFileSync(path.join(root,p),'utf8');
const c=JSON.parse(txt('contracts/owner-decisions-stage1.json'));
const p=JSON.parse(txt('contracts/provider-readiness.json'));
const frontend=txt('config.js'),admin=txt('staging/config.js');
const backend=txt('apps-script/Code.gs'),pepperTest=txt('tests/backend-pin-v2.test.cjs');

test('owner decision registry cannot change business rules or authorize mutation',()=>{
 assert.equal(c.documentType,'NON_EXECUTABLE_OWNER_DECISION_REGISTRY');
 assert.equal(c.release.status,'PROCESS_NO_GO');
 assert.equal(c.release.stage,1);
 assert.equal(c.ownerApprovalRequiredFor.length,6);
 for(const field of ['publicRegistration','otpDispatch','payments','finance','aiBilling'])
  assert.equal(c.release[field],false,field);
 assert.equal(c.release.providerActivation,'DEFERRED');
 assert.equal(c.environment.productionAndStagingMustRemainSeparated,true);
 assert.equal(c.environment.sourceIsNotRuntime,true);
});
test('live public frontend stays write-locked and separate from STAGING',()=>{
 for(const flag of ['memberWritesEnabled','registrationOtpEnabled','paymentsEnabled',
   'lmsEnabled','supportEnabled','catalogEnabled','contentEnabled','serviceEnabled'])
   assert.match(frontend,new RegExp(flag+':\\s*false'),flag);
 const get=x=>x.match(/apiUrl:\s*'([^']+)'/)?.[1];
 assert.ok(get(frontend)&&get(admin)&&get(frontend)!==get(admin));
 assert.equal(c.environment.stagingSchemaObservedTabs,29);
 assert.equal(c.environment.productionSchemaObservedTabs,16);
});
test('Chapter 01 community access cannot be replaced by commercial entitlement',()=>{
 assert.equal(c.programBoundary.chapter01,'FREE_100_PERCENT_NO_FORCED_PURCHASE');
 assert.equal(c.programBoundary.communityParticipantsMustNotBeAutoImported,true);
 assert.equal(c.programBoundary.internalLmsEntitlementAuthority,'UNDECIDED_PER_PRODUCT');
 const agent=txt('AGENTS.md');
 assert.match(agent,/100% gratis/);
});
test('provider registry and owner stage gate are consistently deferred',()=>{
 assert.equal(p.releaseState,'INTERNAL_FOUNDATION_ONLY');
 assert.equal(p.externalTrafficAuthorized,false);
 assert.ok(p.integrations.every(x=>x.status==='DEFERRED'));
 assert.ok(Object.values(p.releaseGates).every(v=>v===false));
});
test('PIN hash migration is opt-in, but legacy credentials remain supported',()=>{
 assert.match(backend,/getProperty\('NGD_PIN_HASH_V2_ENABLED'\)==='true'/);
 assert.match(backend,/function pinMatches_\(/);
 assert.match(backend,/function pinHashV2_\(/);
 assert.match(pepperTest,/legacy PIN hashes remain byte-for-byte identical/);
 assert.equal(c.pendingBusinessDecisions.includes('PIN_v2_activation_and_key_backup'),true);
});
test('missing credit policy cannot be silently converted into a grant',()=>{
 assert.match(backend,/Kebijakan kredit awal belum siap/);
 assert.equal(c.starterCredit.productionAmountMutationAuthorized,false);
 assert.equal(c.starterCredit.operatorRecoveryAutoGrantAllowed,false);
 const rootCheckpoint=txt('docs/CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md');
 assert.match(rootCheckpoint,/NO-GO/);
});

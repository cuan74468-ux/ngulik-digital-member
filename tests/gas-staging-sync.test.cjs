'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=require('../scripts/gas-staging-package.cjs');
test('explicit inventory matches repository, 13 Visual modules only',()=>{
 const actual=p.readDir(path.join(p.root,'apps-script'));
 a.deepEqual(p.names(actual),[...Object.keys(p.policy.managed),'appsscript.json'].sort());
 a.equal(p.policy.visual.length,13);a.equal(p.policy.preserve.length,10);
 a.equal(Object.keys(p.policy.managed).length,29);
 a.equal(p.policy.managed['Code.gs'],'Kode.js');
 a.ok(!Object.values(p.policy.managed).includes(p.policy.legacyBundle));
 a.notEqual(p.endpoint().id,'');
});
test('digest detects any changed, missing or extra source; order independent',()=>{
 const m=new Map([['a.js','x'],['b.js','y']]);
 a.equal(p.digest(m),p.digest(new Map([...m].reverse())));
 for(const n of [new Map([['a.js','z'],['b.js','y']]),new Map([['a.js','x']]),new Map([...m,['c.js','']])])a.notEqual(p.digest(m),p.digest(n));
});
test('pending approval and changed fingerprints fail closed',()=>{
 const r={baselineDigest:'a'.repeat(64),candidateDigest:'b'.repeat(64),after:new Map([['report','Report.js']])};
 a.throws(()=>p.authorize(r,34,{approval:{status:'PENDING'}}),/PENDING/);
 const approved={approval:{status:'APPROVED',reviewReference:'review',baselineVersion:34,baselineDigest:r.baselineDigest,candidateDigest:r.candidateDigest,triggerHandlers:['report'],triggerAuditComplete:true,sideEffectsReviewed:true}};
 a.doesNotThrow(()=>p.authorize(r,34,approved));
 a.throws(()=>p.authorize(r,34,{approval:{...approved.approval,triggerAuditComplete:false}}),/REVIEW_PENDING/);
 a.throws(()=>p.authorize(r,34,{approval:{...approved.approval,sideEffectsReviewed:false}}),/REVIEW_PENDING/);
 a.throws(()=>p.authorize(r,35,approved),/MISMATCH/);
 a.throws(()=>p.authorize({...r,candidateDigest:'x'},34,approved),/MISMATCH/);
 a.throws(()=>p.authorize(r,34,{approval:{...approved.approval,triggerHandlers:['missing']}}),/TRIGGER/);
});

const runner=require('../scripts/gas-staging-run.cjs');
test('CI gate binds main and all three successful workflow runs to exact commit',async()=>{
 const sha='1'.repeat(40),env={GITHUB_REPOSITORY:'cuan74468-ux/ngulik-digital-member',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_SHA:sha,GITHUB_TOKEN:'fixture'};
 const ok={head_sha:sha,head_branch:'main',event:'push',status:'completed',conclusion:'success',created_at:'2026-11-25T00:00:00Z',id:1};
 const api=async route=>route.includes('/git/ref/')?{object:{sha}}:{workflow_runs:[ok]};
 await runner.ciGate(env,api);
 await a.rejects(runner.ciGate({...env,GITHUB_REF:'refs/heads/topic'},api),/UNTRUSTED/);
 await a.rejects(runner.ciGate(env,async route=>route.includes('/git/ref/')?{object:{sha:'2'.repeat(40)}}:{workflow_runs:[ok]}),/MAIN_MOVED/);
 for(const conclusion of ['failure','cancelled','skipped',null]){
  await a.rejects(runner.ciGate(env,async route=>route.includes('/git/ref/')?{object:{sha}}:{workflow_runs:[{...ok,conclusion}]}),/CI_NOT_GREEN/);
 }
 await a.rejects(runner.ciGate(env,async route=>route.includes('/git/ref/')?{object:{sha}}:{workflow_runs:[{...ok,head_sha:'2'.repeat(40)}]}),/CI_NOT_GREEN/);
});

function recoveryFixture(version=35,digest='candidate'){
 const calls=[];
 const g={
  deployment:()=>({versionNumber:version}),
  clone:()=>({digest}),
  redeploy:(dir,v,description)=>{calls.push(['redeploy',dir,v,description]);version=v;},
  push:dir=>{calls.push(['push',dir]);digest='baseline';}
 };
 const state={head:{dir:'head',digest:'baseline'},live:{versionNumber:34,description:'prior'},r:{candidateDigest:'candidate'},newVersion:35,restoreDir:'private-backup'};
 return {g,state,calls};
}
test('rollback restores existing deployment version AND editor independently; verifies read-only health',async()=>{
 const {g,state,calls}=recoveryFixture();
 const result=await runner.recover(g,state,async()=>true);
 a.deepEqual(result,{versionRestored:true,sourceRestored:true,healthRestored:true});
 a.deepEqual(calls,[['redeploy','private-backup',34,'prior'],['push','private-backup']]);
});
test('rollback refuses unknown deployment or unknown manual source; does not blindly retry',async()=>{
 const unexpected=recoveryFixture(36);
 a.deepEqual(await runner.recover(unexpected.g,unexpected.state,async()=>true),{versionRestored:false,sourceRestored:false,healthRestored:false});
 a.deepEqual(unexpected.calls,[]);
 const edited=recoveryFixture(34,'manual-edit');
 a.deepEqual(await runner.recover(edited.g,edited.state,async()=>true),{versionRestored:true,sourceRestored:false,healthRestored:false});
 a.deepEqual(edited.calls,[]);
});
test('rollback when only HEAD changed does not redeploy an already restored live version',async()=>{
 const x=recoveryFixture(34);
 a.deepEqual(await runner.recover(x.g,x.state,async()=>false),{versionRestored:true,sourceRestored:true,healthRestored:false});
 a.deepEqual(x.calls,[['push','private-backup']]);
});

test('protected final audit gate binds exact SHA, successful audit mode and freshness',async()=>{
 const now=Date.parse('2026-11-26T15:00:00Z'),sha='1'.repeat(40),env={GITHUB_SHA:sha,GITHUB_RUN_ID:'999',GAS_FINAL_AUDIT_RUN_ID:'123'};
 const run={id:123,path:'.github/workflows/gas-staging-sync.yml',head_sha:sha,head_branch:'main',event:'workflow_dispatch',status:'completed',conclusion:'success',updated_at:new Date(now-60000).toISOString()};
 const job={name:'staging',status:'completed',conclusion:'success',steps:[{name:'STAGING audit (protected)',status:'completed',conclusion:'success'}]};
 const api=(r=run,j=job)=>async route=>route.includes('/jobs?')?{jobs:[j]}:r;
 await runner.auditGate(env,api(),now);
 await a.rejects(runner.auditGate({...env,GAS_FINAL_AUDIT_RUN_ID:''},api(),now),/RUN_ID_REQUIRED/);
 await a.rejects(runner.auditGate({...env,GAS_FINAL_AUDIT_RUN_ID:'999'},api(),now),/RUN_ID_REQUIRED/);
 for(const patch of [{head_sha:'2'.repeat(40)},{head_branch:'other'},{path:'.github/workflows/other.yml'},{conclusion:'failure'},{status:'in_progress'},{event:'push'}])await a.rejects(runner.auditGate(env,api({...run,...patch}),now),/RUN_UNVERIFIED/);
 await a.rejects(runner.auditGate(env,api({...run,updated_at:new Date(now-86400001).toISOString()}),now),/STALE/);
 await a.rejects(runner.auditGate(env,api(run,{...job,steps:[{name:'STAGING deploy (protected)',status:'completed',conclusion:'success'}]}),now),/MODE_UNVERIFIED/);
 await a.rejects(runner.auditGate(env,api(run,{...job,steps:[{name:'STAGING audit (protected)',status:'completed',conclusion:'failure'}]}),now),/MODE_UNVERIFIED/);
});
test('actual approved license policy binds owner-reviewed minimal fingerprint, not full migration',()=>{
 const q=p.policy;
 if(q.approval.status==='PENDING')return;
 a.equal(q.releaseProfile.mode,'studio-license-only-v34');
 a.equal(q.approval.baselineDigest,q.releaseProfile.baselineDigest);
 a.equal(q.approval.baselineVersion,34);
 a.deepEqual(q.approval.triggerHandlers,['ngdDailyExecutiveReportTask']);
 const r={baselineDigest:q.approval.baselineDigest,candidateDigest:q.approval.candidateDigest,after:new Map([['ngdDailyExecutiveReportTask','DailyExecutiveReport.js']])};
 a.doesNotThrow(()=>p.authorize(r,34,q));
 a.throws(()=>p.authorize({...r,candidateDigest:'ed9fabc9bc24c72f524897beaed31857b2d076f17520fe9b450d96431e1b157d'},34,q),/MISMATCH/);
});

test('clasp failure classification never echoes sensitive error content',()=>{
 const cases=[['insufficient authentication scopes','OAUTH_SCOPE'],['invalid_grant','AUTH_EXPIRED'],['The caller does not have permission','PERMISSION_DENIED'],['Syntax error: PRIVATE_SOURCE','SOURCE_SYNTAX'],['Conflicting files found','FILE_CONFLICT'],['rate limit exceeded','QUOTA'],['unknown option --bad','CLI_ARGUMENT'],['unrecognized PRIVATE_TOKEN','UNCLASSIFIED']];
 for(const [message,category] of cases)a.equal(runner.classifyClaspFailure({status:1,stderr:message+' PRIVATE_CREDENTIAL'}),category);
 a.equal(runner.classifyClaspFailure({error:{code:'ETIMEDOUT'}}),'TIMEOUT');
});
test('clasp tracked inventory rejects missing extra duplicate and malformed paths',()=>{
 const files=new Map([['Kode.js','x'],['appsscript.json','{}']]);
 a.equal(runner.verifyTrackedInventory({filesToPush:['appsscript.json','Kode.js'],untrackedFiles:['.clasp.json']},files),2);
 for(const bad of [null,{}, {filesToPush:['Kode.js']},{filesToPush:['Kode.js','appsscript.json','private.js']},{filesToPush:['Kode.js','Kode.js']},{filesToPush:['./Kode.js','appsscript.json']}])a.throws(()=>runner.verifyTrackedInventory(bad,files),/CLASP_STATUS_INVALID|CLASP_TRACKED_INVENTORY_MISMATCH/);
});

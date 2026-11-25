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
 a.throws(()=>p.authorize(r,34),/PENDING/);
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

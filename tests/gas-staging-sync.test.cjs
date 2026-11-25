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
 const r={baselineDigest:'a',candidateDigest:'b',after:new Map([['report','Report.js']])};
 a.throws(()=>p.authorize(r,34),/PENDING/);
 const approved={approval:{status:'APPROVED',reviewReference:'review',baselineVersion:34,baselineDigest:'a',candidateDigest:'b',triggerHandlers:['report']}};
 a.doesNotThrow(()=>p.authorize(r,34,approved));
 a.throws(()=>p.authorize(r,35,approved),/MISMATCH/);
 a.throws(()=>p.authorize({...r,candidateDigest:'x'},34,approved),/MISMATCH/);
 a.throws(()=>p.authorize(r,34,{approval:{...approved.approval,triggerHandlers:['missing']}}),/TRIGGER/);
});

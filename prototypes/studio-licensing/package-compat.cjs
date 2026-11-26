'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const p=require('../../scripts/gas-staging-package.cjs'),parse=require('acorn').parse;
const base='3dabc17e8c2db1d439bf47b1f6d73425c36b7ccc';
function original(file){return cp.execFileSync('git',['show',base+':'+file],{cwd:p.root,encoding:'utf8',maxBuffer:8*1024*1024});}
test('legacy modularization plus Studio candidate packages against exact pre-license Git source and synthetic preserve files',()=>{
 const repo=p.readDir(path.join(p.root,'apps-script')),remote=new Map([['appsscript.json',original('apps-script/appsscript.json')]]);
 for(const [from,to] of Object.entries(p.policy.managed))if(!p.policy.visual.includes(from))remote.set(to,original('apps-script/'+from));
 remote.set(p.policy.legacyBundle,original('handoff/VisualStudioBundle.gs'));
 for(const [i,n] of p.policy.preserve.entries())remote.set(n,'// Synthetic preserve placeholder, not editor source\nfunction fixtureStudioPreserve'+i+'(){}');
 const result=p.build(repo,remote,parse);
 a.equal(result.candidate.size,40);a.deepEqual(result.removed,[p.policy.legacyBundle]);
 a.equal(result.candidate.get('Kode.js'),repo.get('Code.gs'));
 a.ok(!result.candidate.has('StudioLicense.gs')&&!result.candidate.has('StudioLicense.js'));
 const added=[...result.after.keys()].filter(n=>!result.before.has(n));
 a.ok(added.length>=10&&added.every(n=>n.startsWith('ngdStudio')));
 for(const n of added)a.equal(result.after.get(n),'Kode.js');
 for(const n of p.policy.preserve)a.equal(result.candidate.get(n),remote.get(n));
 a.throws(()=>p.authorize(result,34,{approval:{status:'PENDING'}}),/PENDING/);
 if(p.policy.approval.status==='APPROVED')a.throws(()=>p.authorize(result,34),/MISMATCH/);
 console.log('NGD_STUDIO_SYNTHETIC_PACKAGE_PASS files='+result.candidate.size+' addedStudioGlobals='+added.length+' releaseGate=PENDING');
});

test('one-time license-only profile preserves all 27 other legacy files and refuses drift',()=>{
 const repo=p.readDir(path.join(p.root,'apps-script')),remote=new Map([['appsscript.json',original('apps-script/appsscript.json')]]);
 for(const [from,to] of Object.entries(p.policy.managed))if(!p.policy.visual.includes(from))remote.set(to,original('apps-script/'+from));
 remote.set(p.policy.legacyBundle,original('handoff/VisualStudioBundle.gs'));
 for(const [i,n] of p.policy.preserve.entries())remote.set(n,'// Synthetic preserve placeholder\nfunction fixtureStudioPreserve'+i+'(){}');
 const policy={...p.policy,approval:{status:'PENDING'},releaseProfile:{mode:'studio-license-only-v34',baselineDigest:p.digest(remote)}};
 const result=p.buildRelease(repo,remote,parse,policy);
 a.equal(result.candidate.size,28);a.deepEqual(result.changed,['Kode.js']);a.deepEqual(result.removed,[]);
 a.equal(result.after.size-result.before.size,14);
 for(const [name,value] of remote)if(name!=='Kode.js')a.equal(result.candidate.get(name),value);
 a.equal(result.candidate.get('Kode.js'),repo.get('Code.gs'));
 a.throws(()=>p.authorize(result,34,policy),/PENDING/);
 const drift=new Map(remote);drift.set('Catalog.js',drift.get('Catalog.js')+'\n// drift');
 a.throws(()=>p.buildRelease(repo,drift,parse,policy),/BASELINE_DRIFT/);
 const bad=new Map(repo);bad.set('Code.gs',repo.get('Code.gs').replace("SESSION_DAYS: 7","SESSION_DAYS: 8").replace("function ngdStudioGuard_","function ngdStudioGuard_"));
 // Independently test an unreviewed existing function change (not a global rename).
 const src=repo.get('Code.gs'),needle="function authLogout_(token) {";
 a.ok(src.includes(needle));bad.set('Code.gs',src.replace(needle,needle+'\n  throw new Error("fixture");'));
 a.throws(()=>p.buildRelease(bad,remote,parse,policy),/UNRELATED_CODE_CHANGE/);
 console.log('NGD_STUDIO_LICENSE_ONLY_SYNTHETIC_PASS files=28 changed=Kode.js preserved=27 added=14');
});

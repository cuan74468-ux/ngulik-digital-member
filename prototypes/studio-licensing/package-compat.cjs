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
 a.throws(()=>p.authorize(result,34),/PENDING/);
 console.log('NGD_STUDIO_SYNTHETIC_PACKAGE_PASS files='+result.candidate.size+' addedStudioGlobals='+added.length+' releaseGate=PENDING');
});

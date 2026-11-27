'use strict';
// Real Acorn tests run with pinned test-only dependency installed outside repo.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=require('./gas-staging-package.cjs'),parse=require('acorn').parse;
const repo=p.readDir(path.join(p.root,'apps-script'));
function fixture(){
 const remote=new Map([['appsscript.json',repo.get('appsscript.json')]]);
 for(const [from,to] of Object.entries(p.policy.managed))if(!p.policy.visual.includes(from))remote.set(to,repo.get(from));
 remote.set(p.policy.legacyBundle,fs.readFileSync(path.join(p.root,'handoff/VisualStudioBundle.gs'),'utf8'));
 for(const [i,n] of p.policy.preserve.entries())remote.set(n,'// Synthetic fixture, not private GAS source\nfunction fixtureStagingOnly'+i+'(){}');
 return remote;
}
test('actual main code and handoff produce exact modular candidate; private fixtures preserved',()=>{
 const r=p.build(repo,fixture(),parse);
 a.equal(r.candidate.size,40);
 a.deepEqual(r.removed,[p.policy.legacyBundle]);
 a.equal(r.candidate.get('Kode.js'),repo.get('Code.gs'));
 for(const name of p.policy.preserve)a.equal(r.candidate.get(name),fixture().get(name));
 for(const name of p.policy.visual)a.equal(r.candidate.get(p.policy.managed[name]),repo.get(name));
 a.equal(r.before.size,r.after.size);
});
test('unknown/missing/mixed files or changed manifest fail closed',()=>{
 for(const mutate of [
  r=>r.set('Unmapped.js','function stray(){}'),
  r=>r.delete('DailyExecutiveReport.js'),
  r=>r.set('VisualApi.js',repo.get('VisualApi.gs')),
  r=>r.set('appsscript.json','{}'),
  r=>r.set('appsscript.json','{')
 ]){
  const r=fixture();mutate(r);
  a.throws(()=>p.build(repo,r,parse),/INVENTORY_DRIFT|MANIFEST_/);
 }
});
test('duplicate program-scope bindings are blocked, nested local functions ignored',()=>{
 const g=new Map([['a.js','function outer(){function check(){}}'],['b.js','function other(){function check(){}}']]);
 a.equal(p.globals(g,parse).size,2);
 a.throws(()=>p.globals(new Map([['a.js','if(true){var same=1;}'],['b.js','var same=2;']]),parse),/DUPLICATE_GLOBAL/);
 a.throws(()=>p.globals(new Map([['a.js','const {x}=obj;'],['b.js','function x(){}']]),parse),/DUPLICATE_GLOBAL/);
});
test('unmapped or reassigned managed globals fail even when names are unique',()=>{
 const remote=fixture();
 remote.set('Catalog.js',remote.get('Catalog.js')+'\nfunction unexplainedLegacyFunction(){}');
 a.throws(()=>p.build(repo,remote,parse),/UNMAPPED_GLOBAL/);
 const moved=fixture();
 moved.set('Catalog.js',moved.get('Catalog.js')+'\nfunction extraFixture(){}');
 const changed=new Map(repo);
 changed.set('LMS.gs',changed.get('LMS.gs')+'\nfunction extraFixture(){}');
 a.throws(()=>p.build(changed,moved,parse),/UNMAPPED_GLOBAL_OWNER/);
});
test('pending release gate cannot authorize real-package fingerprints',()=>{
 const r=p.build(repo,fixture(),parse);
 a.throws(()=>p.authorize(r,34,{approval:{status:'PENDING'}}),/PENDING/);
});

const runner=require('./gas-staging-run.cjs');
test('owner format equivalence is restricted to Kode.js and preserves actual approved program AST',()=>{
 const c=fixture(),source=repo.get('Code.gs');c.set('Kode.js',source);
 const expected={candidate:c,candidateDigest:p.digest(c)};
 const baseline={digest:p.policy.approval.baselineDigest};
 const snapshot=files=>({files,digest:p.digest(files)});
 const vary=s=>new Map(c).set('Kode.js',s);
 for(const variant of [source.replace(/\n+$/,''),source+'\n','\uFEFF'+source]){
  const observed=vary(variant);
  a.ok(runner.ownerFormatEquivalent(observed,c,parse));
  a.equal(runner.ownerAttestation(snapshot(observed),{versionNumber:34},baseline,expected,baseline,parse),'OWNER_EDITOR_VERIFIED');
  a.equal(runner.ownerAttestation(snapshot(observed),{versionNumber:35},baseline,expected,snapshot(observed),parse),'OWNER_DEPLOY_VERIFIED');
  a.throws(()=>runner.ownerAttestation(snapshot(observed),{versionNumber:35},baseline,expected,snapshot(c),parse),/LIVE_FINGERPRINT/);
 }
 const changed=vary(source+'\n');changed.set('appsscript.json','{}');
 const missing=vary(source+'\n');missing.delete('appsscript.json');
 const extra=vary(source+'\n');extra.set('extra.js','');
 for(const bad of [changed,missing,extra,vary(source+'// different'),vary(' '+source),vary(source+'\r')]){
  a.equal(runner.ownerFormatEquivalent(bad,c,parse),false);
  a.throws(()=>runner.ownerAttestation(snapshot(bad),{versionNumber:34},baseline,expected,baseline,parse),/EDITOR_FINGERPRINT/);
 }
});
test('owner format AST comparison permits CRLF but rejects raw literal drift and parse failures',()=>{
 const c=new Map([['Kode.js','const a=1;\nconst b=2n;\n']]);
 const observed=new Map(c).set('Kode.js','const a=1;\r\nconst b=2n;\r\n');
 a.ok(runner.ownerFormatEquivalent(observed,c,parse));
 a.deepEqual(runner.ownerFormatEvidence(observed,c),{diagnostic:'OWNER_FORMAT_EVIDENCE',observed:{bom:false,crlf:2,terminal_newlines:1},approved:{bom:false,crlf:0,terminal_newlines:1}});
 const literal=new Map([['Kode.js',"const a='x\\\ny';\n"]]);
 const changed=new Map(literal).set('Kode.js',literal.get('Kode.js').replace(/\n/g,'\r\n'));
 a.equal(runner.ownerFormatEquivalent(changed,literal,parse),false);
 const invalid=new Map([['Kode.js','const =;\n']]);
 a.equal(runner.ownerFormatEquivalent(new Map(invalid).set('Kode.js','const =;'),invalid,parse),false);
});

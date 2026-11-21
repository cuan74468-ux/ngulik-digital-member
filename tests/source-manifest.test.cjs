'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,
 'contracts/gas-runtime-source-manifest-2026-11-16.json'),'utf8'));
test('runtime manifest records exact SHA1 blobs of all GitHub GAS source files',()=>{
 const dir=path.join(root,'apps-script');
 const files=fs.readdirSync(dir).filter(x=>x.endsWith('.gs')).sort();
 const names=manifest.modules.map(x=>x.file).sort();
 assert.deepEqual(names,files);
 assert.match(manifest.source_snapshot_commit,/^[a-f0-9]{40}$/);
 assert.equal(files.length,15);
 for(const module of manifest.modules){
   const body=fs.readFileSync(path.join(dir,module.file));
   const header=Buffer.from('blob '+body.length+'\0');
   const digest=crypto.createHash('sha1').update(header).update(body).digest('hex');
   assert.equal(module.github_blob_sha,digest,module.file);
   assert.equal(module.bytes,body.length,module.file);
 }
});
test('source hashes and operator logs are distinct from deployed GAS source attestation',()=>{
  assert.match(manifest.unverified,/Apps Script editor sync/);
  assert.match(manifest.unverified,/NOT yet verified by operator execution/);
  assert.equal(manifest.release_gate,'OWNER_EXECUTION_AUTHORIZED');
  assert.equal(manifest.external_providers,'CONFIGURATION_PENDING');
  const names=manifest.verified_editor_functions.map(x=>x.name);
  for(const required of [
    'ngdInfrastructurePreflightReadOnly','ngdDataIntegrityPreflightReadOnly',
    'diagnosticFinanceScenarios','diagnosticApiPublic','diagnosticReconciliationReadOnly'
  ])assert.ok(names.includes(required),'Missing operator-observed function '+required);
  assert.match(manifest.verified_editor_functions.find(x=>x.name==='diagnosticFinanceScenarios').result,/29_OF_29_MEMORY_ONLY/);
  assert.match(manifest.verified_editor_functions.find(x=>x.name==='diagnosticReconciliationReadOnly').result,/REQUIRES_REVIEW/);
  for(const file of ['DataIntegrityPreflight.gs','InfrastructurePreflight.gs']){
    assert.match(manifest.modules.find(x=>x.file===file).runtime_evidence,
      /^OPERATOR_EXECUTION_OBSERVED_2026_11_21_BLOB_NOT_PROVEN$/);
  }
});

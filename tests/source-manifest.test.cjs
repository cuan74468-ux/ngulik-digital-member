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
test('a source hash alone never claims that the GAS editor is synchronized',()=>{
 assert.match(manifest.unverified,/Actual contents and version/);
 assert.equal(manifest.release_gate,'STAGE1_NO_GO');
 assert.equal(manifest.external_providers,'DEFERRED');
 assert.deepEqual(manifest.verified_editor_functions.map(x=>x.name),[
   'ngdInfrastructurePreflightReadOnly','ngdDataIntegrityPreflightReadOnly'
 ]);
 assert.equal(manifest.modules.filter(x=>x.runtime_evidence.startsWith('OPERATOR_')).length,2);
});

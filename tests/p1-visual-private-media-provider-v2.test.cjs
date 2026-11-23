'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=['VisualSkills.gs','VisualCompiler.gs','VisualAdapterContract.gs','VisualMedia.gs','VisualProvider.gs','VisualJobs.gs'].map(f=>fs.readFileSync(path.join(__dirname,'../apps-script',f),'utf8')).join('\n');
const c=vm.createContext({console});
vm.runInContext(source,c);
const parse=e=>JSON.parse(vm.runInContext('JSON.stringify('+e+')',c));
const now=1795400000000;
const auth={role:'MEMBER',status:'AKTIF',member_id:'M-0009'};
const media={asset_id:'asset_bakso_001',owner_member_id:'M-0009',mime_type:'image/jpeg',bytes:1624324,width:1080,height:1350,sha256:'a'.repeat(64),kind:'SOURCE_REFERENCE',privacy:'PRIVATE',verified_binary:true,expires_at_ms:now+6*86400000};
const caps={provider_id:'native_image_editor',model_version:'img-edit-v1',mode:'NATIVE_IMAGE_TO_IMAGE',supports_reference_image:true,supports_scene_reconstruction:true,supports_relighting:true,supports_async_jobs:true,returns_private_asset:true,supports_text_to_image_fallback:false,quality_tiers:['standard','hd_commercial'],max_input_bytes:8*1024*1024,max_output_pixels:16000000};
const compiled={contract_version:'visual-img2img-v2',image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',release_authorized:false,request_id:'request_bakso_20261123_01',compiled_prompt:'Private structured commercial reconstruction instruction with verified preservation.',negative_prompt:'No distortion, no changed label, no additional products.',option_ids:{quality_tier:'standard'},media_contract:{reference_asset_id:'asset_bakso_001',requires_image_conditioning:true,no_text_to_image_fallback:true},overlay_specification:{enabled:false,canvas:{width:1080,height:1350}}};
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(overrides={}){
 c.trustedAuth=clone(overrides.auth||auth);c.storedRecord=clone(overrides.media||media);
 c.providerCaps=clone(overrides.caps||caps);c.compiledInput=clone(overrides.compiled||compiled);c.nowMs=now;
 vm.runInContext("var a=JSON.parse(JSON.stringify(trustedAuth));var m=JSON.parse(JSON.stringify(storedRecord));var p=JSON.parse(JSON.stringify(providerCaps));var compiled=JSON.parse(JSON.stringify(compiledInput));var port={inspectVerifiedPrivateObject:function(){return m;}};var provider={describeNativeEditor:function(){return p;}};",c);
}
test('P1 stage3 upload intent is scoped to private member and never itself grants access',()=>{
 setup();
 const v=parse("ngdVisualMediaUploadIntentSpec_(a,{mime_type:'image/jpeg',bytes:120034},nowMs)");
 assert.equal(v.owner_member_id,'M-0009');
 assert.equal(v.expires_at_ms-v.issued_at_ms,300000);
 assert.equal(v.grants_access,false);assert.equal(v.public_url,null);
 assert.equal(v.requires_one_time_server_signed_grant,true);
 for(const x of ["{mime_type:'image/svg+xml',bytes:100}","{mime_type:'image/jpeg',bytes:99999999}","{mime_type:'image/png',bytes:100,url:'https://evil.example'}"]){
  assert.throws(()=>parse('ngdVisualMediaUploadIntentSpec_(a,'+x+',nowMs)'),/VISUAL_PRIVATE_MEDIA_/);
 }
});
test('P1 stage3 source asset must be private owner-bound binary verified and unexpired',()=>{
 setup();const v=parse("ngdVisualResolvePrivateReference_(a,'asset_bakso_001',port,nowMs)");
 assert.equal(v.capability,'SERVER_SIDE_REFERENCE_ONLY');
 assert.equal(v.storage_privacy,'PRIVATE');
 assert.equal(v.asset_id,'asset_bakso_001');
 for(const edit of ["m.owner_member_id='M-9999'","m.privacy='PUBLIC'","m.verified_binary=false","m.expires_at_ms=nowMs","m.asset_id='asset_other_1234'","m.mime_type='image/svg+xml'","m.bytes=9000000","m.sha256='xyz'","m.width=10000","m.external_url='https://evil.example'"]){
  setup();vm.runInContext(edit,c);
  assert.throws(()=>parse("ngdVisualResolvePrivateReference_(a,'asset_bakso_001',port,nowMs)"),/VISUAL_/,edit);
 }
});
test('P1 stage3 provider native image editing requires validated reference and async privacy',()=>{
 setup();const v=parse('ngdVisualProviderPrepareV2_(compiled,a,port,provider,nowMs)');
 assert.equal(v.provider_mode,'NATIVE_IMAGE_TO_IMAGE');
 assert.equal(v.reference_asset_id,'asset_bakso_001');
 assert.equal(v.reference_sha256,media.sha256);
 assert.equal(v.native_image_conditioning_required,true);
 assert.equal(v.output_policy.storage,'PRIVATE_ONLY');
 assert.equal(v.queue_policy.execution,'ASYNC_ONLY');
 assert.equal(v.dispatch_authorized,false);assert.equal(v.provider_called,false);
 assert.ok(!JSON.stringify(v).includes('https://'));
});
test('P1 stage3 provider denies text-to-image, sync, unverified output and unconditioned references',()=>{
 for(const edit of ["p.mode='TEXT_TO_IMAGE'","p.supports_reference_image=false","p.supports_scene_reconstruction=false","p.supports_relighting=false","p.supports_async_jobs=false","p.returns_private_asset=false","p.supports_text_to_image_fallback=true","p.quality_tiers=['economy']","p.max_input_bytes=1000","compiled.media_contract.reference_asset_id=''","compiled.media_contract.no_text_to_image_fallback=false","compiled.image_generation_mode='TEXT_TO_IMAGE'","compiled.release_authorized=true"]){
  setup();vm.runInContext(edit,c);
  assert.throws(()=>parse('ngdVisualProviderPrepareV2_(compiled,a,port,provider,nowMs)'),/VISUAL_(?:V2_|PRIVATE_MEDIA_)/,edit);
 }
});
test('P1 stage3 durable async job plan and owner-only redacted public status',()=>{
 setup();
 c.planIn=parse('ngdVisualProviderPrepareV2_(compiled,a,port,provider,nowMs)');
 vm.runInContext('var providerRequest=JSON.parse(JSON.stringify(planIn));',c);
 const job=parse('ngdVisualAsyncJobPlanV2_(providerRequest,a,nowMs)');
 assert.equal(job.execution_enabled,false);
 assert.equal(job.initial_state,'CREATED');
 assert.equal(job.changes_p0_finance,false);
 assert.equal(job.requires_idempotent_reservation,true);
 assert.equal(job.requires_atomic_dispatch_claim,true);
 assert.equal(job.requires_visual_quality_gate,true);
 c.jobRow={job_id:job.job_id,owner_member_id:'M-0009',status:'PROCESSING',prompt:'PRIVATE PROMPT',provider_secret:'PRIVATE KEY'};
 vm.runInContext('var trustedRow=JSON.parse(JSON.stringify(jobRow));',c);
 const status=parse('ngdVisualAsyncPublicStatusV2_(trustedRow,a)');
 assert.deepEqual(status,{job_id:job.job_id,status:'PROCESSING'});
 assert.ok(!JSON.stringify(status).includes('PRIVATE'));
 vm.runInContext("trustedRow.status='SETTLED';trustedRow.result_asset_id='asset_output_123456';",c);
 assert.throws(()=>parse('ngdVisualAsyncPublicStatusV2_(trustedRow,a)'),/VISUAL_V2_JOB_QUALITY_NOT_PASSED/);
 vm.runInContext('trustedRow.quality_gate_passed=true;',c);
 assert.equal(parse('ngdVisualAsyncPublicStatusV2_(trustedRow,a)').result_asset_id,'asset_output_123456');
 vm.runInContext("trustedRow.owner_member_id='M-9999';",c);
 assert.throws(()=>parse('ngdVisualAsyncPublicStatusV2_(trustedRow,a)'),/VISUAL_V2_JOB_READ_DENIED/);
});
test('P1 stage3 dispatch stays disabled even when synthetic gates are all true',()=>{
 setup();
 c.planIn=parse('ngdVisualProviderPrepareV2_(compiled,a,port,provider,nowMs)');
 vm.runInContext('var providerRequest=JSON.parse(JSON.stringify(planIn));',c);
 c.jobPlan=parse('ngdVisualAsyncJobPlanV2_(providerRequest,a,nowMs)');
 c.gates={mutations_enabled:false,finance_enabled:false,provider_enabled:false,budget_cap_authorized:false,private_media_ready:false,queue_ready:false,durable_reservation_verified:false,atomic_dispatch_claim_available:false};
 vm.runInContext('var j=JSON.parse(JSON.stringify(jobPlan));var flags=JSON.parse(JSON.stringify(gates));',c);
 const v=parse('ngdVisualDispatchPreflightV2_(j,flags)');
 assert.equal(v.ready_for_operator_review,false);
 assert.equal(v.missing_gates.length,8);
 assert.equal(v.dispatch_authorized,false);
 vm.runInContext('Object.keys(flags).forEach(function(k){flags[k]=true})',c);
 const ready=parse('ngdVisualDispatchPreflightV2_(j,flags)');
 assert.equal(ready.ready_for_operator_review,true);
 assert.equal(ready.dispatch_executed,false);
 assert.equal(ready.dispatch_authorized,false);
});
test('P1 stage3 cleanup only suggests deletion of expired unleased private assets',()=>{
 setup();
 c.inventory=[
 {asset_id:'asset_refold_0001',kind:'SOURCE_REFERENCE',privacy:'PRIVATE',created_at_ms:now-8*86400000,has_active_job_lease:false,trusted_inventory:true},
 {asset_id:'asset_output_0001',kind:'GENERATED_OUTPUT',privacy:'PRIVATE',created_at_ms:now-29*86400000,has_active_job_lease:false,trusted_inventory:true},
 {asset_id:'asset_lease_00001',kind:'SOURCE_REFERENCE',privacy:'PRIVATE',created_at_ms:now-20*86400000,has_active_job_lease:true,trusted_inventory:true}
 ];
 vm.runInContext('var records=JSON.parse(JSON.stringify(inventory));',c);
 const p=parse('ngdVisualPrivateCleanupPlan_(records,nowMs)');
 assert.deepEqual(p.candidates_to_delete,['asset_refold_0001']);
 assert.equal(p.skipped.length,2);
 assert.equal(p.delete_executed,false);
 assert.equal(p.requires_server_side_lease_recheck,true);
 vm.runInContext("records[0].privacy='PUBLIC';",c);
 assert.throws(()=>parse('ngdVisualPrivateCleanupPlan_(records,nowMs)'),/VISUAL_PRIVATE_MEDIA_CLEANUP_UNTRUSTED/);
});
test('P1 stage3 provider cannot settle credits from unverified image or uncertain status',()=>{
 setup();
 c.outcome={request_id:'request_bakso_20261123_01',provider_status:'READY',private_output_asset_id:'asset_image_final_001',private_output_verified:true};
 vm.runInContext('var o=JSON.parse(JSON.stringify(outcome));',c);
 const r=parse('ngdVisualProviderPollResultV2_(o)');
 assert.equal(r.status,'READY_FOR_QUALITY_GATE');
 assert.equal(r.settled,false);
 vm.runInContext('o.private_output_verified=false',c);
 assert.throws(()=>parse('ngdVisualProviderPollResultV2_(o)'),/VISUAL_V2_RESULT_ASSET_NOT_VERIFIED/);
 vm.runInContext("o.provider_status='MYSTERY';",c);
 const unknown=parse('ngdVisualProviderPollResultV2_(o)');
 assert.equal(unknown.status,'RECONCILE_REQUIRED');
 assert.equal(unknown.auto_retry_allowed,false);
});
test('P1 stage3 contracts have no network, database, financial calls or public GAS endpoint',()=>{
 assert.doesNotMatch(source,/UrlFetchApp\.fetch|DriveApp\.|SpreadsheetApp\.|LockService\.|function\s+doPost\s*\(|function\s+doGet\s*\(/);
 assert.doesNotMatch(source,/sk_live_|AIza[0-9A-Za-z_-]{24}/);
 assert.match(source,/PRIVATE_MEDIA_ADAPTER/);
 assert.match(source,/ASYNC_ONLY/);
 assert.match(source,/RECONCILE_REQUIRED/);
});

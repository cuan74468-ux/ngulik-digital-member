'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sources=['VisualSkills.gs','VisualCompiler.gs','VisualAdapterContract.gs']
  .map(f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8')).join('\n');
const context=vm.createContext({console});
vm.runInContext(sources,context);
const run=expr=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));
const payload={
  template_id:'food_promo',category_id:'culinary',mood_id:'warm_appetite',
  lighting_id:'soft_window',ratio_id:'4:5',quality_tier:'standard',
  product_name:'Bakso Len',promo_text:'Diskon Hari Ini',price:15000,
  cta:'Pesan Sekarang',reference_image:'asset_bakso_001',
  request_id:'job_test_media_12345678'
};
const skills={
  version:'fixture-v1',
  preservation:{food:'Preserve original identity geometry and package color.'},
  templates:{food_promo:{category_id:'culinary',preservation_id:'food',
    art_direction:'Commercial food hero on warm artisan tabletop.',
    safe_zone_rule:'Keep top thirty percent negative space.',
    negative_lock:'No floating or altered food shapes.',
    overlay_preset:'food_promo_clean'}},
  moods:{warm_appetite:{visual_skill:'Warm realistic surfaces and props.'}},
  lighting:{soft_window:{lighting_skill:'Diffused soft window lighting.'}},
  ratios:{'4:5':{width:1080,height:1350,framing_rule:'Portrait 4:5 hero framing.',
    safe_zone:{x:0.06,y:0.05,width:0.88,height:0.30}}},
  qualities:{standard:{positive_skill:'Balanced commercial quality.',adapter_profile:'image_standard'}},
  guardrails:{positive:'Realistic commercial photography without model text.',
    negative:'No text, watermark or surreal deformities.'}
};
const auth={member_id:'M-0009',role:'MEMBER',status:'AKTIF'};
const media={asset_id:'asset_bakso_001',owner_member_id:'M-0009',
  mime_type:'image/jpeg',bytes:245103,width:1080,height:1350,sha256:'a'.repeat(64)};
function setUp(){
 context.payload=JSON.parse(JSON.stringify(payload));
 context.skills=JSON.parse(JSON.stringify(skills));
 context.auth=JSON.parse(JSON.stringify(auth));
 context.media=JSON.parse(JSON.stringify(media));
 vm.runInContext('var p=JSON.parse(JSON.stringify(payload)),s=JSON.parse(JSON.stringify(skills)),a=JSON.parse(JSON.stringify(auth)),m=JSON.parse(JSON.stringify(media));',context);
}
test('P1 Stage 3 private job plan requires member, opaque asset and trusted-looking manifest shape',()=>{
 setUp();
 const result=run('ngdVisualJobPlan_(ngdVisualCompilePrompt_(p,s),a,m)');
 assert.equal(result.initial_status,'CREATED');
 assert.equal(result.execution_enabled,false);
 assert.equal(result.must_reserve_credit_before_dispatch,true);
 assert.equal(result.requires_persistent_idempotency,true);
 assert.equal(result.needs_queue_adapter,true);
 assert.equal(result.media.sha256,'a'.repeat(64));
 assert.equal(result.private_provider_request.job_mode,'ASYNC_MEDIA_REFERENCE');
 assert.equal(result.private_provider_request.provider_input.reference_asset_id,payload.reference_image);
 assert.equal(result.overlay_specification.product_name,payload.product_name);
});
test('P1 Stage 3 manifest rejects ownership bypass, URL/SSRF payload, MIME, byte and pixel abuse',()=>{
 setUp();
 for(const entry of [
  "m.owner_member_id='M-9999'",
  "m.asset_id='https://attacker.test/evil'",
  "m.mime_type='image/svg+xml'",
  "m.bytes=9*1024*1024",
  "m.width=9000",
  "m.height=0",
  "m.width=8192;m.height=8192",
  "m.sha256='not-a-digest'",
  "m.url='https://attacker.test/private'",
  "a.status='DITOLAK'",
  "a.role='ADMIN'",
  "p.reference_image='asset_different_handle'"
 ]) {
  setUp();vm.runInContext(entry,context);
  assert.throws(()=>run('ngdVisualJobPlan_(ngdVisualCompilePrompt_(p,s),a,m)'),/VISUAL_/,entry);
 }
});
test('P1 Stage 3 missing reference skips media entirely but never accepts unrequested attachment',()=>{
 setUp();vm.runInContext("p.reference_image=''",context);
 const plan=run('ngdVisualJobPlan_(ngdVisualCompilePrompt_(p,s),a,null)');
 assert.equal(plan.media,null);
 assert.equal(plan.private_provider_request.provider_input.reference_asset_id,'');
 assert.throws(()=>run('ngdVisualJobPlan_(ngdVisualCompilePrompt_(p,s),a,m)'),/VISUAL_MEDIA_UNEXPECTED/);
});
test('P1 Stage 3 redacted public projection never leaks skill text, prompt, private media or token data',()=>{
 setUp();
 const plan=run('ngdVisualJobPlan_(ngdVisualCompilePrompt_(p,s),a,m)');
 context.plan=plan;
 for(const status of ['CREATED','RESERVED','PROCESSING','RECONCILE_REQUIRED','REFUNDED','SETTLED']){
   context.status=status;
   const publicStatus=run("ngdVisualPublicJob_({request_id:plan.request_id,status:status,private_provider_request:plan.private_provider_request,media:plan.media,provider_api_key:'TEST_LEAK',compiled_prompt:'TEST_LEAK',result_asset_id:'asset_output_123456'})");
   assert.equal(publicStatus.request_id,plan.request_id);
   assert.equal(publicStatus.status,status);
   const serialized=JSON.stringify(publicStatus);
   for(const needle of ['TEST_LEAK','prompt','provider','sha256','member_id','overlay_specification','private_provider_request']){
     assert.ok(!serialized.includes(needle),'redaction failed: '+needle);
   }
   if(status==='SETTLED')assert.equal(publicStatus.result_asset_id,'asset_output_123456');
   else assert.equal(publicStatus.result_asset_id,undefined);
 }
 assert.throws(()=>run("ngdVisualPublicJob_({status:'SETTLED',request_id:plan.request_id,result_asset_id:'https://evil.example'})"),/VISUAL_PUBLIC_RESULT_ASSET_INVALID/);
});
test('P1 Stage 3 fail closed on uncertain outcomes: no automatic second debit or dispatch',()=>{
 setUp();
 const scenarios=[
  ['CREATED','NOT_DISPATCHED','RESERVE_FIRST'],
  ['RESERVED','NOT_DISPATCHED','DISPATCH_ONCE_WITH_IDEMPOTENCY'],
  ['PROCESSING','UNKNOWN','RECONCILE_PROVIDER_STATUS'],
  ['PROCESSING','CONFIRMED_FAILED','REFUND_AFTER_LEDGER_CHECK'],
  ['SETTLED','SUCCESS','NO_AUTOMATIC_RETRY'],
  ['REFUNDED','CONFIRMED_FAILED','NO_AUTOMATIC_RETRY']
 ];
 for(const [state,outcome,next] of scenarios){
  const v=run("ngdVisualRetryAssessment_('"+state+"','"+outcome+"')");
  assert.equal(v.retry_allowed,false);
  assert.equal(v.next_action,next);
 }
 assert.throws(()=>run("ngdVisualRetryAssessment_('HACKED','UNKNOWN')"),/VISUAL_RETRY_STATE_INVALID/);
 assert.doesNotMatch(sources,/UrlFetchApp\.fetch|SpreadsheetApp|grantCredits_\s*\(|\bdoPost\s*\(/);
});

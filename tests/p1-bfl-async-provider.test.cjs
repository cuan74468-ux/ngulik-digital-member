'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=['VisualSkills.gs','VisualCompiler.gs','VisualAdapterContract.gs','VisualBflAdapter.gs']
  .map(f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8')).join('\n');
const ctx=vm.createContext({console});
vm.runInContext(source,ctx);
const evalJson=expression=>JSON.parse(vm.runInContext('JSON.stringify('+expression+')',ctx));
const compiled={
  compiler_version:'visual-compiler-v1',
  skill_version:'fixture-v1',
  request_id:'request_visual_1234567890',
  compiled_prompt:'High fidelity commercial food photography with precise light and composition.',
  negative_prompt:'No altered product, no text, no watermark.',
  media_contract:{reference_asset_id:'',storage_backend:'PRIVATE_MEDIA_ADAPTER'},
  overlay_specification:{canvas:{width:1080,height:1350}},
  provider_adapter_profile:'image_standard'
};
function fixture(data=compiled){
 ctx.fixture=JSON.parse(JSON.stringify(data));
 vm.runInContext('var compiledFixture=JSON.parse(JSON.stringify(fixture));',ctx);
}
test('P1 BFL official async submit payload uses fixed host and model-safe pixel dimensions',()=>{
 fixture();
 const x=evalJson('ngdVisualBflPlan_(compiledFixture)');
 assert.equal(x.provider,'BFL');
 assert.equal(x.model,'flux-2-pro');
 assert.equal(x.endpoint,'https://api.bfl.ai/v1/flux-2-pro');
 assert.equal(x.payload.width,1088);
 assert.equal(x.payload.height,1344);
 assert.equal(x.target_canvas.width,1080);
 assert.equal(x.target_canvas.height,1350);
 assert.match(x.payload.prompt,/Strict exclusions/);
 assert.equal(x.requires_durable_reservation,true);
 assert.equal(x.requires_atomic_dispatch_claim,true);
 assert.equal(x.execution_enabled,false);
});
test('P1 BFL adapter refuses reference images until actual image conditioning is integrated',()=>{
 const altered={...compiled,media_contract:{reference_asset_id:'asset_bakso_001',storage_backend:'PRIVATE_MEDIA_ADAPTER'}};
 fixture(altered);
 assert.throws(()=>evalJson('ngdVisualBflPlan_(compiledFixture)'),/VISUAL_BFL_IMAGE_REFERENCE_UNSUPPORTED/);
});
test('P1 BFL returned polling URL is allowlisted and cannot cause SSRF',()=>{
 const valid='https://api.bfl.ai/v1/get_result?id=a1b2c3';
 for(const url of [
  'http://api.bfl.ai/v1/get_result?id=x',
  'https://evil.example/v1/get_result?id=x',
  'https://api.bfl.ai.evil.example/v1/get_result?id=x',
  'https://api.bfl.ai@evil.example/v1/get_result?id=x',
  'https://api.bfl.ai/v1/get_result?id=x#fragment',
  'https://api.bfl.ai/v1/flux-2-pro?id=x',
  'https://api.bfl.ai/v1/get_result?next=https://evil.example'
 ]){
  ctx.probe=url;
  assert.throws(()=>evalJson('ngdVisualBflCheckPollUrl_(probe)'),/VISUAL_BFL_POLL_URL_UNTRUSTED/,url);
 }
 ctx.probe=valid;
 assert.equal(evalJson('ngdVisualBflCheckPollUrl_(probe)'),valid);
});
test('P1 BFL parse status: Ready private URL, error terminal, unknown reconciling',()=>{
 ctx.pollData={status:'Ready',result:{sample:'https://example.cdn.com/private-signed.png'}};
 let r=evalJson('ngdVisualBflParsePoll_(JSON.parse(JSON.stringify(pollData)))');
 assert.equal(r.provider_status,'READY');
 assert.equal(r.must_copy_to_private_storage,true);
 assert.equal(r.private_result_url,'https://example.cdn.com/private-signed.png');
 for(const status of ['Failed','Error','Request Moderated','Content Moderated']){
   ctx.pollData={status};
   r=evalJson('ngdVisualBflParsePoll_(JSON.parse(JSON.stringify(pollData)))');
   assert.equal(r.provider_status,'FAILED');
 }
 ctx.pollData={status:'unexpected_provider_state'};
 assert.equal(evalJson('ngdVisualBflParsePoll_(JSON.parse(JSON.stringify(pollData)))').provider_status,'RECONCILE_REQUIRED');
 ctx.pollData={status:'Ready',result:{sample:'http://evil.example/s.png'}};
 assert.throws(()=>evalJson('ngdVisualBflParsePoll_(JSON.parse(JSON.stringify(pollData)))'),/VISUAL_BFL_RESULT_REFERENCE_INVALID/);
});
test('P1 BFL fails closed before ANY network call when production switches are OFF',()=>{
 fixture();
 const calls=[];
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:name=>({
  NGD_MUTATIONS_ENABLED:'false',NGD_FINANCE_ENABLED:'false',BFL_API_KEY:'fake_fake_fake_fake'
 })[name]})};
 ctx.UrlFetchApp={fetch:(...args)=>{calls.push(args);throw Error('not allowed');}};
 ctx.auth={member_id:'M-0009',role:'MEMBER',status:'AKTIF'};
 vm.runInContext('var trustedAuth=JSON.parse(JSON.stringify(auth));',ctx);
 ctx.ledger={claimForDispatch(){throw Error('should not reserve')},
  recordSubmitted(){throw Error('unexpected')},recordUncertain(){throw Error('unexpected')}};
 assert.throws(()=>evalJson('ngdVisualBflSubmit_(compiledFixture,trustedAuth,ledger)'),/VISUAL_BFL_SYSTEM_GATE_CLOSED/);
 assert.equal(calls.length,0);
});
test('P1 BFL requires durable dispatch claim; claim false never contacts provider',()=>{
 fixture();
 let requests=0,claims=0;
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:name=>({
  NGD_MUTATIONS_ENABLED:'true',NGD_FINANCE_ENABLED:'true',BFL_API_KEY:'fake_fake_fake_fake'
 })[name]})};
 ctx.UrlFetchApp={fetch:()=>{requests++;throw Error('not expected');}};
 ctx.auth={member_id:'M-0009',role:'MEMBER',status:'AKTIF'};
 vm.runInContext('var trustedAuth=JSON.parse(JSON.stringify(auth));',ctx);
 ctx.ledger={claimForDispatch:()=>{claims++;return false;},
  recordSubmitted:()=>{},recordUncertain:()=>{}};
 assert.throws(()=>evalJson('ngdVisualBflSubmit_(compiledFixture,trustedAuth,ledger)'),/VISUAL_BFL_DISPATCH_NOT_CLAIMED/);
 assert.equal(claims,1);assert.equal(requests,0);
});
test('P1 BFL synthetic trusted dispatch records first request, preserves key secrecy',()=>{
 fixture();
 const requests=[],events=[];
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:name=>({
  NGD_MUTATIONS_ENABLED:'true',NGD_FINANCE_ENABLED:'true',BFL_API_KEY:'fake_fake_fake_fake'
 })[name]})};
 ctx.UrlFetchApp={fetch:(url,opts)=>{
  requests.push({url,opts});
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
   polling_url:'https://api.bfl.ai/v1/get_result?id=job123'
  })};
 }};
 ctx.auth={member_id:'M-0009',role:'MEMBER',status:'AKTIF'};
 vm.runInContext('var trustedAuth=JSON.parse(JSON.stringify(auth));',ctx);
 ctx.ledger={claimForDispatch:spec=>{events.push('claim');return spec.expected_state==='RESERVED';},
  recordSubmitted:(id,url)=>{events.push('submitted');assert.equal(url,'https://api.bfl.ai/v1/get_result?id=job123');},
  recordUncertain:()=>{events.push('uncertain');}};
 const result=evalJson('ngdVisualBflSubmit_(compiledFixture,trustedAuth,ledger)');
 assert.equal(result.status,'PROCESSING');
 assert.deepEqual(events,['claim','submitted']);
 assert.equal(requests.length,1);
 assert.equal(requests[0].url,'https://api.bfl.ai/v1/flux-2-pro');
 assert.equal(requests[0].opts.headers['x-key'],'fake_fake_fake_fake');
 assert.equal(requests[0].opts.followRedirects,false);
 assert.ok(!JSON.stringify(result).includes('fake_fake_fake_fake'));
 assert.ok(!JSON.stringify(result).includes('polling_url'));
});
test('P1 BFL uncertain provider outcome does not trigger second dispatch or false settlement',()=>{
 fixture();
 let requests=0;
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:name=>({
  NGD_MUTATIONS_ENABLED:'true',NGD_FINANCE_ENABLED:'true',BFL_API_KEY:'fake_fake_fake_fake'
 })[name]})};
 ctx.UrlFetchApp={fetch:()=>{requests++;throw Error('timeout');}};
 ctx.auth={member_id:'M-0009',role:'MEMBER',status:'AKTIF'};
 vm.runInContext('var trustedAuth=JSON.parse(JSON.stringify(auth));',ctx);
 const events=[];
 ctx.ledger={claimForDispatch:()=>true,recordSubmitted:()=>events.push('submitted'),
  recordUncertain:()=>events.push('uncertain')};
 const result=evalJson('ngdVisualBflSubmit_(compiledFixture,trustedAuth,ledger)');
 assert.equal(result.status,'RECONCILE_REQUIRED');
 assert.deepEqual(events,['uncertain']);
 assert.equal(requests,1);
});
test('P1 BFL adapter source is not registered as public GAS API, and tests are synthetic only',()=>{
 assert.doesNotMatch(source,/function\s+doGet\s*\(|function\s+doPost\s*\(/);
 assert.match(source,/NGD_MUTATIONS_ENABLED/);
 assert.match(source,/NGD_FINANCE_ENABLED/);
 assert.match(source,/claimForDispatch/);
 assert.doesNotMatch(source,/sk_live_[A-Za-z0-9]+|AIza[A-Za-z0-9_-]{25}/);
});

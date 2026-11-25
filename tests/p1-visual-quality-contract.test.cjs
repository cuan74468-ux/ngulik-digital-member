'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const client=read('js/ai-studio.js');
const skills=read('apps-script/VisualSkills.gs');
const compiler=read('apps-script/VisualCompiler.gs');
const quality=read('apps-script/VisualQuality.gs');
const c=vm.createContext({console});
vm.runInContext([skills,compiler,quality].join('\n'),c);
const evalJson=(context,expr)=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));
const makeReview=()=>({
 commercial_appeal:4.8,product_fidelity:4.9,prompt_adherence:4.8,
 marketing_readiness:4.7,confidence:0.97,identity_changed:false,
 watermark_present:false,gibberish_text:false,unsafe_content:false,
 overlay_collision:false,reference_verified:true
});
const policy={source:'TRUSTED_BACKEND_EVALUATOR',mode:'REFERENCE_PRODUCT',
 job_id:'job_quality_123456789',evaluator_version:'visual-evaluator-v1'};
function reviewCase(changes={},policyChanges={}){
 c.rev=Object.assign(makeReview(),changes);
 c.pol=Object.assign({},policy,policyChanges);
 vm.runInContext('var testReview=JSON.parse(JSON.stringify(rev));var testPolicy=JSON.parse(JSON.stringify(pol))',c);
 return evalJson(c,'ngdVisualQualityGate_(testReview,testPolicy)');
}
test('P1 premium image quality gate passes eligible references but never authorizes live release',()=>{
 const result=reviewCase();
 assert.equal(result.decision,'CANDIDATE_APPROVED');
 assert.equal(result.critical_failure,false);
 assert.equal(result.release_authorized,false);
 assert.equal(result.quality_version,'visual-quality-v1');
 assert.deepEqual(result.below_threshold,[]);
});
test('P1 fatal image problems cause reject even when numerical averages are high',()=>{
 for(const flag of ['identity_changed','watermark_present','gibberish_text','unsafe_content','overlay_collision']){
  const result=reviewCase({[flag]:true});
  assert.equal(result.decision,'REJECT',flag);
  assert.equal(result.critical_failure,true,flag);
 }
});
test('P1 scores below threshold, unverified reference or low confidence demand review',()=>{
 for(const [key,value] of [
  ['commercial_appeal',4.29],['product_fidelity',4.69],
  ['prompt_adherence',4.39],['marketing_readiness',4.49],
  ['confidence',0.84],['reference_verified',false]
 ]){
  const result=reviewCase({[key]:value});
  assert.equal(result.decision,'NEEDS_REVIEW',key);
 }
});
test('P1 rejects fake evaluator state, unknown fields, invalid numbers and non-boolean flags',()=>{
 for(const [bad,p] of [
  [{commercial_appeal:NaN},{}],[{commercial_appeal:6},{}],
  [{identity_changed:'false'},{}],[{unknown_status:'APPROVE'},{}],
  [{},{source:'BROWSER'}],[{},{evaluator_version:'x'}],
  [{},{job_id:'https://attacker.test'}]
 ]){
  const expected=Object.assign(makeReview(),bad);
  c.rev=expected;c.pol=Object.assign({},policy,p);
  vm.runInContext('var testReview=JSON.parse(JSON.stringify(rev));var testPolicy=JSON.parse(JSON.stringify(pol))',c);
  assert.throws(()=>evalJson(c,'ngdVisualQualityGate_(testReview,testPolicy)'),/VISUAL_QUALITY_/);
 }
});
test('P1 conceptual generation does not claim to preserve an absent user reference',()=>{
 const result=reviewCase({product_fidelity:0,reference_verified:false,identity_changed:true},{mode:'CREATIVE_CONCEPT'});
 assert.equal(result.decision,'CANDIDATE_APPROVED');
 assert.equal(result.release_authorized,false);
});
test('P1 all six existing UI presets map onto allowlisted backend template/category IDs',()=>{
 const browser={};
 vm.runInNewContext(client,{window:browser,console});
 assert.equal(browser.NGD_STUDIO.adapterMode,'SIMULATION');
 const presets=browser.NGD_STUDIO.presetContracts();
 assert.equal(presets.length,6);
 assert.equal(new Set(presets.map(p=>p.id)).size,6);
 const backend=vm.runInContext('NGD_VISUAL_ALLOWED_OPTIONS_',c);
 for(const item of presets){
   assert.ok(backend.template_id.includes(item.template_id),item.id);
   assert.ok(backend.category_id.includes(item.category_id),item.id);
 }
 const draft=browser.NGD_STUDIO.requestDraft();
 assert.equal(draft.mode,'CONTRACT_PREVIEW_ONLY');
 assert.equal(draft.upload_required,true);
 assert.equal(draft.payload.reference_image,'');
 assert.equal(draft.payload.template_id,'catalog_clean');
 assert.equal(draft.payload.category_id,'product');
 assert.equal(draft.payload.quality_tier,'standard');
 assert.equal(draft.payload.mood_id,'clean_neutral');
 assert.equal(draft.payload.lighting_id,'softbox');
 assert.equal(draft.payload.price,null);
 assert.equal(JSON.stringify(draft).includes('images.unsplash.com'),false);
});
test('P1 simulated Studio does not fetch, charge or disclose production prompt in public mapping',()=>{
 assert.doesNotMatch(client,/NGD_VISUAL_SKILL_REGISTRY_V1|compiled_prompt|negative_prompt|UrlFetchApp/);
 assert.match(client,/CONTRACT_PREVIEW_ONLY/);
 assert.match(client,/upload_required:true/);
 assert.match(client,/mode:'SIMULATION'/);
 assert.doesNotMatch(quality,/UrlFetchApp|SpreadsheetApp|doPost|PropertiesService/);
});


test('P1 benchmark is exactly 240 unexecuted blind scenarios, never fabricated model quality results',()=>{
 const b=JSON.parse(read('contracts/visual-quality-benchmark-v1.json'));
 assert.equal(b.status,'UNEXECUTED_TEST_DESIGN');
 assert.equal(b.products.length,20);
 assert.equal(new Set(b.products).size,20);
 assert.equal(b.visual_styles.length,4);
 assert.equal(b.ratios.length,3);
 assert.equal(b.products.length*b.visual_styles.length*b.ratios.length,240);
 assert.equal(b.cases_per_model,240);
 assert.equal(b.blind_review.required_reviewers,3);
 assert.equal(b.blind_review.require_real_output_files,true);
 assert.equal(b.blind_review.same_brief_input_for_each_model,true);
 for(const k of ['commercial_appeal','product_fidelity','prompt_adherence','marketing_readiness']){
  assert.ok(b.minimum_average[k]>=4);
 }
 assert.doesNotMatch(JSON.stringify(b),/provider_winner|actual_score|midjourney_parity_passed/i);
});

test('output geometry uses binary headers and rejects wrong ratio, size and unknown format',()=>{
 const png=(w,h)=>{const a=Array(33).fill(0);a.splice(0,16,137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82);for(let i=0;i<4;i++){a[16+i]=(w>>>(24-8*i))&255;a[20+i]=(h>>>(24-8*i))&255;}return a;};
 assert.equal(c.ngdVisualOutputGeometry_(png(1080,1350),'image/png','4:5').ok,true);
 assert.equal(c.ngdVisualOutputGeometry_(png(1080,1080),'image/png','4:5').reason,'OUTPUT_RATIO_MISMATCH');
 assert.equal(c.ngdVisualOutputGeometry_(png(400,500),'image/png','4:5').reason,'OUTPUT_SIZE_INVALID');
 assert.equal(c.ngdVisualOutputGeometry_(png(1080,1350),'image/png','2:3').ok,false);
 assert.equal(c.ngdVisualOutputGeometry_(Array(33).fill(0),'image/png','4:5').ok,false);
 const jpeg=[255,216,255,192,0,17,8,5,70,4,56,3,1,17,0,2,17,0,3,17,0,255,217,0];
 assert.equal(c.ngdVisualOutputGeometry_(jpeg,'image/jpeg','4:5').ok,true);
 const webp=Array(30).fill(0);webp.splice(0,20,82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0);
 webp[24]=55;webp[25]=4;webp[27]=69;webp[28]=5;
 assert.equal(c.ngdVisualOutputGeometry_(webp,'image/webp','4:5').ok,true);
 assert.equal(c.ngdVisualOutputGeometry_(webp,'image/webp','4:5').semantic_quality_verified,false);
});

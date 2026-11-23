'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'js/ai-studio.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/ai-studio.css'),'utf8');
const getStudio=()=>{const win={};vm.runInNewContext(js,{window:win,console});return win.NGD_STUDIO};
test('V2 mobile studio first view is photo editor and overlay defaults OFF',()=>{
 const api=getStudio();
 assert.equal(api.adapterMode,'SIMULATION');
 assert.match(js,/view:'editor'/);
 assert.match(js,/photo:'',photoChosen:false/);
 assert.match(js,/overlay:false/);
 assert.match(js,/Unggah foto produk mentah/);
 assert.match(js,/Pilih foto dari HP/);
 assert.match(js,/Opsional: teks, harga & CTA/);
 assert.match(js,/id="ns-v2-overlay"/);
 assert.match(js,/Unggah Foto Dahulu/);
 assert.match(js,/Foto asli tidak dikirim ke server/);
 assert.doesNotMatch(js,/function\s+fetch\s*\(|\bXMLHttpRequest\b|script\.google\.com/);
});
test('V2 exactly matches seven backend option groups and enumerated values',()=>{
 const skills=fs.readFileSync(path.join(root,'apps-script/VisualSkills.gs'),'utf8');
 const c=vm.createContext({console});
 vm.runInContext(skills,c);
 const options=JSON.parse(vm.runInContext('JSON.stringify(NGD_VISUAL_V2_OPTIONS_)',c));
 const api=getStudio();
 const ui=api.optionContracts();
 assert.deepEqual(Object.keys(ui).sort(),Object.keys(options).sort());
 for(const key of Object.keys(options)){
  assert.deepEqual(Array.from(ui[key],x=>String(x[0])),Array.from(options[key],x=>String(x)),key);
  assert.ok(ui[key].every(x=>typeof x[1]==='string'&&x[1].trim().length>0));
 }
});
test('V2 client never emits an untrusted private asset handle or private prompt',()=>{
 const api=getStudio();
 const p=api.img2imgDraft();
 assert.equal(p.contract_version,'visual-img2img-v2');
 assert.equal(p.mode,'CONTRACT_PREVIEW_ONLY');
 assert.equal(p.upload_required,true);
 assert.equal(p.image_source_selected,false);
 assert.equal(p.reference_asset_pending_private_upload,true);
 assert.equal(p.payload.reference_image,'');
 assert.equal(p.payload.request_id,'');
 assert.equal(p.payload.overlay_enabled,false);
 for(const k of ['product_category','visual_style','use_case','camera_angle','lighting_mood','aspect_ratio','quality_tier']){
  assert.ok(typeof p.payload[k]==='string');
 }
 for(const forbidden of ['compiled_prompt','negative_prompt','NGD_VISUAL_SKILL_REGISTRY_V2','provider_key']){
  assert.equal(JSON.stringify(p).includes(forbidden),false);
 }
});
test('V2 incompatible styles are disabled and state reconciles on category/use-case change',()=>{
 const api=getStudio();
 assert.equal(api.selectOption('visual_style','dark_action_drop'),false);
 assert.equal(api.selectOption('use_case','social_feed'),true);
 assert.equal(api.selectOption('product_category','food_culinary'),true);
 assert.equal(api.selectOption('visual_style','dark_action_drop'),true);
 assert.equal(api.img2imgDraft().payload.visual_style,'dark_action_drop');
 assert.equal(api.selectOption('product_category','fashion_craft'),true);
 assert.equal(api.img2imgDraft().payload.visual_style,'studio_clean');
 assert.equal(api.selectOption('use_case','story_reels_wa'),true);
 assert.equal(api.img2imgDraft().payload.aspect_ratio,'9:16');
 assert.equal(api.selectOption('aspect_ratio','1:1'),false);
 assert.equal(api.selectOption('use_case','marketplace_main'),true);
 assert.equal(api.img2imgDraft().payload.visual_style,'studio_clean');
 assert.equal(api.selectOption('quality_tier','hd_commercial'),true);
 assert.equal(api.img2imgDraft().payload.quality_tier,'hd_commercial');
 assert.equal(api.selectOption('quality_tier','premium'),false);
});
test('V2 selectors use semantic accessible controls, scoped CSS and min 48px touch targets',()=>{
 assert.match(js,/data-v2-field/);
 assert.match(js,/data-v2-value/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/aria-disabled="true"/);
 assert.match(js,/if\(target\.dataset\.v2Field\)/);
 assert.match(css,/\.ngd-studio \.ns-v2-choice\{/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.doesNotMatch(js,/\p{Extended_Pictographic}/u);
});

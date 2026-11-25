'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'js/ai-studio.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/ai-studio.css'),'utf8');
function studio(){const window={};vm.runInNewContext(js,{window,console});return window.NGD_STUDIO;}

test('12 Visual scenarios have distinct reference images and plain-language help',()=>{
 const scenes=studio().studioTemplateCatalog();
 assert.equal(scenes.length,12);
 assert.equal(new Set(scenes.map(x=>x.id)).size,12);
 assert.equal(new Set(scenes.map(x=>x.image)).size,12,'one reference per scene, not one per category');
 for(const scene of scenes){
  assert.match(scene.image,/^assets\/visual-studio\/[a-z_]+\.webp$/);
  assert.ok(scene.name.length>=10);
  assert.ok(scene.description.length>=20);
  assert.ok(scene.useFor.length>=8);
  assert.ok(scene.purpose.length>=8);
 }
 assert.doesNotMatch(js,/image:SCENE_VISUALS\[category\]/);
});

test('beginner gallery explains use cases and avoids a distracting empty preset block',()=>{
 assert.match(js,/Cocok untuk:/);
 assert.match(js,/Kenapa memilih gaya ini/);
 assert.match(js,/saved\.length>0\|\|templateFilter==='saved'/);
 assert.match(js,/Foto inspirasi · bukan hasil AI dari produk Anda/);
 assert.match(js,/Foto contoh bukan hasil AI dari produk Anda/);
});

test('Visual never markets a preview as an AI result or a real Member credit charge',()=>{
 const api=studio();
 assert.equal(api.adapterMode,'SIMULATION');
 assert.match(js,/Coba Pratinjau Tanpa AI/);
 assert.match(js,/Kredit latihan — bukan saldo Member/);
 assert.match(js,/Latihan tanpa AI/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|sendBeacon/);
});

test('single direct editor exposes real contract controls without duplicate technical form',()=>{
 const editor=js.slice(js.indexOf('function editor(){'),js.indexOf('function advancedEditor(){'));
 assert.match(editor,/Deskripsi produk/);assert.match(editor,/id="ns-food-notes"/);
 assert.match(editor,/data-context-category/);assert.match(editor,/data-context-scenario/);
 assert.match(editor,/foodChoices\('format'\)/);assert.match(editor,/foodChoices\('count'\)/);
 assert.doesNotMatch(editor,/ns-simple-advanced|Pengaturan Lanjutan/);
 assert.equal((editor.match(/id="ns-file"/g)||[]).length,1);
 assert.match(js,/syncQuickAction\(\)/);
 assert.match(css,/\.ns-direct-layout\{/);
 assert.match(js,/Satu pratinjau lokal tersimpan/);
});
test('owned WebP image files are present, valid and match signed manifest',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/visual-studio/manifest.json'),'utf8'));
 const scenes=studio().studioTemplateCatalog();
 assert.equal(manifest.items.length,12);
 assert.equal(scenes.length,manifest.items.length);
 for(const image of manifest.items){
  const scene=scenes.find(s=>s.scenario===image.id);
  assert.ok(scene,'missing scene '+image.id);
  assert.equal(scene.image,'assets/visual-studio/'+image.file);
  const file=path.join(root,'assets/visual-studio',image.file);
  assert.ok(fs.existsSync(file),'asset must be uploaded first: '+image.file);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),image.sha256);
 }
});
test('owned asset URL handles public and /staging/ entrypoints',()=>{
 const scripts=['https://cuan74468-ux.github.io/ngulik-digital-member/js/ai-studio.js',
  'https://cuan74468-ux.github.io/ngulik-digital-member/js/ai-studio.js?v=local'];
 for(const src of scripts){
  const window={document:{currentScript:{src}}};
  vm.runInNewContext(js,{window,URL,console});
  const refs=window.NGD_STUDIO.studioTemplateCatalog().map(s=>s.image);
  assert.ok(refs.every(x=>x.startsWith('https://cuan74468-ux.github.io/ngulik-digital-member/assets/visual-studio/')));
 }
});

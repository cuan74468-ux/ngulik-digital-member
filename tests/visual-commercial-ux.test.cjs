'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
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
  assert.match(scene.image,/^https:\/\/images\.unsplash\.com\/photo-[0-9A-Za-z-]+\?/);
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
 assert.match(js,/Contoh suasana · bukan hasil AI produk Anda/);
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

test('advanced settings contain beginner help and duplicate photo upload stays visually hidden',()=>{
 assert.match(js,/OPTION_HELP=Object\.freeze/);
 assert.match(js,/FOOD_FIELD_HELP=Object\.freeze/);
 assert.match(js,/ns-v2-option-copy/);
 assert.match(js,/ns-field-guide/);
 assert.match(css,/\.ns-simple-advanced \.ns-v2-editor \.ns-form>\.ns-block:first-child\{display:none\}/);
 assert.match(css,/@media\(max-width:420px\)/);
});

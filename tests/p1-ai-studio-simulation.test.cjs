'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('assets/ai-studio.css'),js=read('js/ai-studio.js'),app=read('js/app.js');
test('Studio simulation compiles and exposes local-only adapter; no GAS/provider/financial API',()=>{
  const win={};vm.runInNewContext(js,{window:win,console});
  assert.equal(win.NGD_STUDIO.adapterMode,'SIMULATION');
  assert.deepEqual({...win.NGD_STUDIO.debugSnapshot()},{mode:'SIMULATION',creditsSimulated:25,renders:0,history:0});
  assert.doesNotMatch(js,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(|\bapi\s*\(|PropertiesService|LockService|script\.google\.com/);
});
test('scope CSS and precise visual tokens; no global selectors or emoji',()=>{
  for(const hex of ['#F6F5F0','#ECEAE3','#FFFFFF','#141418','#5B3DF5','#CCF349'])assert.ok(css.includes(hex),hex);
  assert.match(css,/\.ngd-studio\{/);
  assert.match(css,/box-shadow:3px 3px 0 var\(--ns-ink\)/);
  assert.match(css,/border:1\.5px solid var\(--ns-ink\)/);
  assert.ok(css.split('\n').filter(x=>x.includes('{')&&!x.startsWith('/*')&&!x.startsWith('@')).every(x=>x.trim().startsWith('.ngd-studio')||x.trim().startsWith('}')),'CSS selector must be scoped');
  assert.doesNotMatch(js,/\p{Extended_Pictographic}/u);
});
test('existing member shell and tool routes remain, with gated image visual route',()=>{
  assert.match(app,/function viewAI\(\)/);
  assert.match(app,/function viewAITool\(\)/);
  assert.match(app,/selectedAiToolId==='ngulik-visual'&&logged\(\)&&!isAdmin\(\)/);
  assert.match(app,/window\.NGD_STUDIO\?\.mount/);
  assert.match(app,/data-ai-open="ngulik-visual"/);
  for(const html of ['index.html','staging/member.html']){
    const source=read(html);
    assert.match(source,/ai-studio\.css/);
    assert.match(source,/ai-studio\.js/);
    assert.match(source,/js\/app\.js/);
    assert.match(source,/JetBrains\+Mono/);
  }
});
test('gallery/editor/session features and true Canvas raster export are present',()=>{
  for(const name of ['gallery','editor','history'])assert.ok(js.includes(name));
  assert.equal((js.match(/id:'(?:katalog-minimalis|kuliner-hangat|poster-flash-sale|skincare-podium|dark-luxury|story-vertikal)'/g)||[]).length,6);
  for(const fragment of ['getContext(\'2d\')','toDataURL(\'image/png\')','FileReader','data-history-download','data-sample','ns-compare','ns-toggle','adapter.settle','adapter.release'])assert.ok(js.includes(fragment),fragment);
  assert.match(js,/state\.history\.length>8/);
});

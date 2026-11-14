'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('HTML entry uses versioned local files and language metadata',()=>{
  const html=read('index.html');
  assert.match(html,/<html lang="id">/);
  assert.match(html,/name="viewport"/);
  assert.match(html,/src="\.\/config\.js"/);
  assert.match(html,/type="module" src="\.\/js\/app\.js\?v=20261114-admin4"/);
  assert.match(html,/href="\.\/assets\/app\.css"/);
  assert.match(html,/Content-Security-Policy/);
  for(const file of ['config.js','js/app.js','js/api.js','assets/app.css','assets/favicon.svg']){
    assert.equal(fs.existsSync(path.join(root,file)),true,file);
  }
});
test('do not embed secrets or open financial features in config',()=>{
  const config=read('config.js');
  // Endpoint publik read-only boleh ada (bukan rahasia); kunci/token/PIN tidak boleh.
  assert.match(config,/apiUrl:\s*'https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec'/);
  assert.match(config,/memberWritesEnabled:\s*false/);
  assert.match(config,/paymentsEnabled:\s*false/);
  assert.doesNotMatch(config,/sk-[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(config,/BEGIN PRIVATE KEY/);
});
test('public UI strips unsafe HTML and restricts payments',()=>{
  const app=read('js/app.js');
  assert.match(app,/const esc\s*=/);
  assert.match(app,/const paymentEnabled\s*=/);
  assert.match(app,/data-buy=/);
  assert.match(app,/PUBLIC_CATALOG/);
  const api=read('js/api.js');
  assert.match(api,/credentials:\s*'omit'/);
  assert.doesNotMatch(api,/mode:\s*'no-cors'/);
});
test('browser probe permits only credential-free public reads',()=>{
  const probe=read('tests/transport-probe.js');
  assert.match(probe,/perform\('GET'\)/);
  assert.match(probe,/perform\('POST'\)/);
  assert.match(probe,/action:'getPublicInfo'/);
  assert.match(probe,/token:''/);
  assert.match(probe,/credentials:'omit'/);
  assert.doesNotMatch(probe,/action:'register'/);
  assert.doesNotMatch(probe,/action:'login'/);
});

test('every literal frontend API action is handled by Apps Script router',()=>{
  const frontend=read('js/app.js'),backend=read('apps-script/Code.gs');
  const actions=[...frontend.matchAll(/\bapi\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
  const handled=new Set([...backend.matchAll(/\bcase\s+['"]([^'"]+)['"]\s*:/g)].map(m=>m[1]));
  assert.ok(actions.length>=10);
  for(const action of actions)assert.equal(handled.has(action),true,'Missing backend action: '+action);
});

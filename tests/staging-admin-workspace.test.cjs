'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../staging/admin.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../staging/index.html'),'utf8');
const url='https://script.google.com/macros/s/STAGING_TEST_DEPLOYMENT_123456789/exec';
const verified={
  workspace:'NGD_STAGING',environment:'STAGING',admin_login_enabled:true,
  mutations_enabled:false,registration_enabled:false,otp_enabled:false,
  finance_enabled:false
};
function domNode(id='') {
  const callbacks={};
  return {
    id,hidden:false,disabled:false,textContent:'',value:'',className:'',
    dataset:{},attributes:{},children:[],
    elements:{wa:{value:'081234567890'},pin:{value:'394852'}},
    classList:{add(){},remove(){},toggle(){}},
    callbacks,
    append(...nodes){this.children.push(...nodes);},
    replaceChildren(...nodes){this.children=nodes;},
    addEventListener(type,fn){callbacks[type]=fn;},
    setAttribute(key,value){this.attributes[key]=value;},
    removeAttribute(key){delete this.attributes[key];},
    querySelectorAll(){return [];},
    focus(){},requestSubmit(){},
    reset(){this.elements.pin.value='';this.elements.wa.value='';}
  };
}
function boot(identity=verified,pinnedUrl='') {
  const nodes={},requests=[];
  const document={
    getElementById(id){return nodes[id]||(nodes[id]=domNode(id));},
    querySelector(){return null;},
    createElement:domNode
  };
  async function fetchStub(endpoint,options){
    const body=JSON.parse(options.body);
    requests.push({action:body.action,endpoint,payload:body.payload,token:body.token});
    if(body.action==='getStagingWorkspaceInfo' && identity==='MAINTENANCE')
      return {ok:true,json:async()=>({ok:false,error:{code:'MAINTENANCE',message:'Perubahan data belum diaktifkan.'}})};
    const data=body.action==='getStagingWorkspaceInfo'?identity:
      body.action==='adminLogin'?{token:'PRIVATE_TEST_TOKEN',profil:{role:'ADMIN',member_id:'M-0001'}}:
      body.action==='adminGetDashboard'?{ringkasan:[{metrik:'anggota',nilai:0}]}:[];
    return {ok:true,json:async()=>({ok:true,data})};
  }
  const sandbox={document,fetch:fetchStub,URL,AbortController,crypto:webcrypto,
    NGD_STAGING_CONFIG:pinnedUrl?{apiUrl:pinnedUrl}:undefined,
    setTimeout,clearTimeout,console};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{timeout:3000});
  function field(id){return document.getElementById(id);}
  async function submit(id){await field(id).callbacks.submit({preventDefault(){},target:field(id)});}
  return {field,submit,requests};
}

test('staging page uses strict CSP and never embeds a production backend',()=>{
  assert.match(html,/default-src 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.doesNotMatch(html,/AKfycbyQlhsRDfo/);
  assert.match(html,/noindex,nofollow/);
});
test('production attestation rejected before admin PIN transmission',async()=>{
  const env=boot({...verified,environment:'PRODUCTION'});
  env.field('endpoint').value=url;
  await env.submit('setup-form');
  assert.equal(env.field('login-section').hidden,true);
  assert.deepEqual(env.requests.map(x=>x.action),['getStagingWorkspaceInfo']);
});
test('invalid endpoint rejected before network calls',async()=>{
  const env=boot();
  env.field('endpoint').value='https://attacker.invalid/exec';
  await env.submit('setup-form');
  assert.equal(env.requests.length,0);
  assert.equal(env.field('login-section').hidden,true);
});
test('verified admin session loads live dashboard after login',async()=>{
  const env=boot();
  env.field('endpoint').value=url;
  await env.submit('setup-form');
  assert.equal(env.field('login-section').hidden,false);
  await env.submit('login-form');
  assert.deepEqual(env.requests.map(x=>x.action),[
    'getStagingWorkspaceInfo','getStagingWorkspaceInfo','adminLogin','adminGetDashboard'
  ]);
  assert.equal(env.field('workspace-section').hidden,false);
  assert.equal(env.field('view-data').children.length,1);
  assert.equal(env.requests[2].payload.pin,'394852');
  assert.equal(env.requests[3].token,'PRIVATE_TEST_TOKEN');
  assert.ok(env.requests.every(r=>!r.endpoint.includes('PRIVATE_TEST_TOKEN')));
});
test('workspace has no password or token storage and no finance write actions',()=>{
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)\(/);
  assert.doesNotMatch(source,/\b(?:adminRefundOrder|adminVerifyOrder|adminAdjustCredit|adminMarkCommissionPaid)\b/);
  assert.match(source,/credentials:'omit'/);
  assert.match(source,/referrerPolicy:'no-referrer'/);
});

test('identity attestation rejects STAGING with any core safety flag enabled',async()=>{
  for(const field of ['mutations_enabled','registration_enabled','otp_enabled','finance_enabled']){
    const env=boot({...verified,[field]:true});
    env.field('endpoint').value=url;
    await env.submit('setup-form');
    assert.equal(env.field('login-section').hidden,true,field);
    assert.deepEqual(env.requests.map(x=>x.action),['getStagingWorkspaceInfo'],field);
  }
});
test('an older deployed Web App reports a specific recovery path without sending a PIN',async()=>{
  const env=boot('MAINTENANCE');
  env.field('endpoint').value=url;
  await env.submit('setup-form');
  assert.match(env.field('alert').textContent,/versi deployment kemungkinan belum/);
  assert.equal(env.field('login-section').hidden,true);
  assert.deepEqual(env.requests.map(x=>x.action),['getStagingWorkspaceInfo']);
});

test('approved STAGING endpoint is pinned and cannot be replaced by another valid GAS URL',async()=>{
  const env=boot(verified,url);
  assert.equal(env.field('endpoint').readOnly,true);
  env.field('endpoint').value='https://script.google.com/macros/s/ANOTHER_VALID_DEPLOYMENT_1234567890/exec';
  await env.submit('setup-form');
  assert.equal(env.requests.length,0);
  assert.equal(env.field('login-section').hidden,true);
  assert.match(env.field('alert').textContent,/tidak cocok dengan endpoint STAGING resmi/);
});
test('approved STAGING endpoint remains allowed after pinning',async()=>{
  const env=boot(verified,url);
  assert.equal(env.field('endpoint').value,url);
  await env.submit('setup-form');
  assert.equal(env.requests[0].endpoint,url);
  assert.equal(env.field('login-section').hidden,false);
});

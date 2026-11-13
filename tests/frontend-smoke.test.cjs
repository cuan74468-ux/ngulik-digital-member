'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(base,'js/app.js'),'utf8');
const api=fs.readFileSync(path.join(base,'js/api.js'),'utf8');
const config=fs.readFileSync(path.join(base,'config.js'),'utf8');
function stripModule(text) {
  return text.replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'');
}

test('frontend modules parse without build tools',()=>{
  assert.doesNotThrow(()=>new vm.Script(stripModule(app),{filename:'app.js'}));
  assert.doesNotThrow(()=>new vm.Script(stripModule(api),{filename:'api.js'}));
});
test('public config disables mutation/payment by default',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(config,sandbox,{timeout:1000});
  assert.equal(sandbox.window.NGD_CONFIG.apiUrl,'');
  assert.equal(sandbox.window.NGD_CONFIG.demoMode,true);
  assert.equal(sandbox.window.NGD_CONFIG.paymentsEnabled,false);
  assert.equal(sandbox.window.NGD_CONFIG.qrisImageUrl,'');
});
test('guest homepage renders and shows preview warning offline',()=>{
  const nodes=Object.create(null);
  function el(id){return nodes[id]||(nodes[id]={
    innerHTML:'',textContent:'',append(){},addEventListener(){},
    querySelector(){return {disabled:false}}
  });}
  const document={getElementById:el,addEventListener(){},title:''};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',paymentsEnabled:false,qrisImageUrl:'',qrisMerchant:''},addEventListener(){},scrollTo(){}};
  const location={href:'https://example.invalid/',origin:'https://example.invalid',hash:'',search:''};
  const sessionStorage={getItem(){return null;},setItem(){},removeItem(){}};
  const context=vm.createContext({
    window,document,location,sessionStorage,history:{replaceState(){}},
    api(){throw new Error('API must not be called in preview mode');},
    ApiError:class ApiError extends Error{},
    isConnected:()=>false,isWriteEnabled:()=>false,
    setTimeout,clearTimeout,Intl,URL,URLSearchParams,Date,Number,Object,String
  });
  vm.runInContext(stripModule(app),context,{filename:'app.js',timeout:3000});
  assert.match(nodes.screen.innerHTML,/bertumbuh nyata/);
  assert.match(nodes['notice-slot'].innerHTML,/Mode pratinjau/);
  assert.match(nodes['desktop-nav'].innerHTML,/Katalog/);
  assert.equal(document.title,'Beranda — Ngulik Digital');
});

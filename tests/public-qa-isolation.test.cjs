'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8')
  .replace(/^import .*?;\s*$/gm,'');
function publicHost(query){
  const nodes={},calls=[];
  const el=id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',
    append(){},addEventListener(){},querySelector(){return {disabled:false}}});
  const document={body:{classList:{toggle(){}},setAttribute(){}},
    getElementById:el,addEventListener(){},title:''};
  const location={href:'https://cuan74468-ux.github.io/ngulik-digital-member/'+query,
    origin:'https://cuan74468-ux.github.io',search:query.split('#')[0],hash:'#admin'};
  const window={NGD_CONFIG:{memberWritesEnabled:false,apiUrl:'https://script.google.com/macros/s/VERIFY/exec'},
    addEventListener(){},scrollTo(){}};
  const ctx=vm.createContext({window,document,location,history:{replaceState(){}},
    sessionStorage:{getItem(){return null;},setItem(){throw Error('Unexpected fake login');},removeItem(){}},
    api(action){calls.push(action);return Promise.resolve(action==='getKatalog'?[]:
      {nama_brand:'Ngulik Digital',kuota:50,sisa:50});},
    isConnected:()=>true,isWriteEnabled:()=>false,
    ApiError:class ApiError extends Error{},URL,URLSearchParams,Intl,Date,Map,
    setTimeout,clearTimeout,Number});
  vm.runInContext(app,ctx,{timeout:5000});
  return {ctx,nodes,calls};
}
test('public host refuses synthetic admin session even when ?preview=admin is supplied',()=>{
  const x=publicHost('?preview=admin#admin');
  assert.equal(vm.runInContext('state.qa',x.ctx),false);
  assert.equal(vm.runInContext('state.me',x.ctx),null);
  assert.equal(vm.runInContext('state.token',x.ctx),'');
  assert.equal(vm.runInContext('isAdmin()',x.ctx),false);
  assert.doesNotMatch(x.nodes.screen.innerHTML,/id="admin-catalog-form"/);
  assert.doesNotMatch(x.nodes['desktop-nav'].innerHTML,/data-route="member"/);
  assert.equal(x.nodes['notice-slot'].innerHTML,'');
});
test('public host refuses synthetic member session even with preview URL',()=>{
  const x=publicHost('?preview=member#admin');
  assert.equal(vm.runInContext('state.qa',x.ctx),false);
  assert.equal(vm.runInContext('logged()',x.ctx),false);
  assert.doesNotMatch(x.nodes.screen.innerHTML,/Kredit AI tersisa/);
});
test('public frontend controls expose owner-authorized features',()=>{
  const cfg=fs.readFileSync(path.join(__dirname,'../config.js'),'utf8');
  assert.match(cfg,/memberWritesEnabled:\s*false/);
  assert.match(cfg,/paymentsEnabled:\s*false/);
  assert.match(cfg,/apiUrl:\s*'https:\/\/script\.google\.com\/macros\/s\//);
  assert.doesNotMatch(cfg,/demoMode/);
});

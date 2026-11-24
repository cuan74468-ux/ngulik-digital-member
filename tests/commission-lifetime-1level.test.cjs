'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const gas=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const section=(source,a,b)=>{
  const start=source.indexOf(a),end=source.indexOf(b,start);
  assert.ok(start>=0&&end>start,'missing function section '+a);
  return source.slice(start,end);
};
const invite=section(app,"const firstInviterKey=", "// Production catalogue");

test('30-day first click retained across reload and second inviter cannot overwrite',()=>{
  let now=Date.UTC(2026,10,20),url='?ref=ABC123';
  const store=new Map(),storage={
    getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),
    removeItem:k=>store.delete(k)
  };
  const ctx=vm.createContext({localStorage:storage,location:{get search(){return url;}},
    Date:{now:()=>now},URLSearchParams,JSON,Number,String});
  vm.runInContext(invite,ctx);
  assert.equal(vm.runInContext('captureFirstInviter_()',ctx),'ABC123');
  url='?ref=OTHER9';now+=29*86400000;
  assert.equal(vm.runInContext('captureFirstInviter_()',ctx),'ABC123');
  now+=86400001;
  assert.equal(vm.runInContext('firstInviter_()',ctx),'');
  assert.equal(vm.runInContext('captureFirstInviter_()',ctx),'OTHER9');
  url='?ref=<script>';assert.equal(vm.runInContext('captureFirstInviter_()',ctx),'OTHER9');
});
test('first inviter captured in registration payload, never URL-only at submit',()=>{
  assert.match(app,/const existingInviter=captureFirstInviter_\(\);/);
  assert.match(app,/const r=existingInviter\|\|entered;/);
  assert.match(app,/if\(\/\^\[A-Z0-9_-\]\{3,80\}\$\/.test\(r\)\)payload.ref=r;/);
  assert.match(app,/async function init\(\)\{\s*captureFirstInviter_\(\);/);
});
test('member first-inviter field is immutable after first assignment',()=>{
  const body=section(gas,'function updateRow_(name, rowNumber, patch) {','function findRows_');
  let stored='M-001',written=0;
  const sheet={
    getLastRow:()=>3,
    getRange:(row,col,len=1,width=1)=>({
      getValue:()=>stored,
      getValues:()=>[col===2?[stored]:['M-002',stored].slice(col-1,col-1+width)],
      getFormulas:()=>[new Array(width).fill('')],
      setValues:()=>{written++}
    })
  };
  const ctx=vm.createContext({tbl_:()=>({sheet,headers:['member_id','referred_by']}),
    require_:(ok,code)=>{if(!ok)throw Error(code)},
    sheetLiteral_:v=>v,Number,Math,Object,String});
  vm.runInContext(body,ctx);
  assert.throws(()=>vm.runInContext("updateRow_('members',2,{referred_by:'M-999'})",ctx),/FORBIDDEN/);
  assert.equal(written,0);
  vm.runInContext("updateRow_('members',2,{referred_by:'M-001'})",ctx);
  assert.equal(written,1);
  stored='';
  vm.runInContext("updateRow_('members',2,{referred_by:'M-555'})",ctx);
  assert.equal(written,2);
});
test('one-level lifetime commissions are order-scoped, not first-purchase-only',()=>{
  const part=section(gas,'function onPaid_(o,actor) {','var NGD_SIMULATION_MODE_');
  assert.match(part,/var referrer=String\(member\.referred_by\|\|''\)/);
  assert.match(part,/selfReferral/);
  assert.match(part,/BUYER_EQUALS_REFERRER/);
  assert.match(part,/return c\.order_id===o\.order_id;/);
  assert.doesNotMatch(part,/komisi_hanya_order_pertama|member\.referrer\.referred_by/);
  assert.match(gas,/approve_after:when/);
  assert.match(gas,/masa_tahan_hari\|\|14/);
});
test('DANA destination required and no automatic payout or bank requirement',()=>{
  const code=section(gas,'function ngdDanaDestination_(raw){','function purgeExpiredSessions_');
  const ctx=vm.createContext({require_:(ok,code)=>{if(!ok)throw Error(code)},String});
  vm.runInContext(code,ctx);
  assert.equal(vm.runInContext("ngdDanaDestination_('081234567890')",ctx),'6281234567890');
  assert.equal(vm.runInContext("ngdDanaDestination_('6281234567890')",ctx),'6281234567890');
  assert.throws(()=>vm.runInContext("ngdDanaDestination_('1234')",ctx),/VALIDATION/);
  assert.match(code,/payout_note:'DANA:'\+dana/);
  assert.match(code,/min_payout/);
  assert.match(gas,/nomor_dana\)===destination\.split/);
  assert.match(app,/Ajukan pencairan/);
});
test('public and member use Komisi / Ajak Teman without public free-resource doors',()=>{
  assert.match(app,/Dalam masa tahan/);
  assert.match(app,/Siap diajukan/);
  assert.doesNotMatch(app,/Salin tautan eBook|Salin tautan kelas|routeFreeDoor_/);
  assert.match(app,/function viewMemberFreeResources_\(\)/);
  assert.match(app,/firstInviterTtlMs=30\*24\*60\*60\*1000/);
  assert.doesNotMatch(app,/free=ebook|free=kelas/);
});

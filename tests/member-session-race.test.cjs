'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','js/app.js'),'utf8');
function harness(){
  let pending=[],mode='deferred',rendered=0,toasts=[];
  const state={token:'TOKEN-A',me:{role:'MEMBER',status:'AKTIF'},qa:false,
    route:'beranda',home:null,orders:[],affiliates:null,memberProducts:[],
    creditHistory:[],lmsEnrollments:[],memberDashboardReads:null};
  const ctx={state,location:{pathname:'/staging/member.html'},config:{brand:'STAGING'},
    isConnected:()=>true,logged:()=>!!state.me,isAdmin:()=>state.me?.role==='ADMIN',
    screens:{beranda:['Dashboard']},render:()=>{rendered++;},
    toast:x=>toasts.push(x),
    api:(action,payload,token)=>{
      if(mode==='immediate')return Promise.resolve(
        action==='getBeranda'?{saldo_kredit:42}:
        action==='listMyOrders'?[{member_id:'B',order_id:'B-ORDER'}]:
        action==='getAffiliateDashboard'?{kode_referral:'B'}:
        action==='getMyProducts'?[{product_id:'B-PRODUCT'}]:
        action==='getKreditRiwayat'?{riwayat:[]}:
        action==='getMyLMSEnrollments'?[]:{});
      return new Promise(resolve=>pending.push({action,token,resolve}));
    }};
  vm.createContext(ctx);
  const a=app.indexOf('async function loadRoute(route){');
  const b=app.indexOf('async function handleRegistrationOtp_',a);
  assert.ok(a>0&&b>a);
  vm.runInContext(app.slice(a,b),ctx);
  return {ctx,state,pending,toasts,renderCount:()=>rendered,immediate:()=>{mode='immediate';}};
}
test('late API batch from logged-out member cannot overwrite a new account',async()=>{
  const h=harness();
  const readA=vm.runInContext("loadRoute('beranda')",h.ctx);
  assert.equal(h.pending.length,6);
  assert.ok(h.pending.every(p=>p.token==='TOKEN-A'));
  h.state.token='TOKEN-B';
  h.state.me={member_id:'B',role:'MEMBER',status:'AKTIF'};
  h.state.home={saldo_kredit:42};
  h.state.orders=[{order_id:'B-ORDER'}];
  h.pending.forEach(p=>p.resolve(p.action==='getBeranda'?{saldo_kredit:999}:
    p.action==='listMyOrders'?[{order_id:'A-ORDER'}]:[]));
  await readA;
  assert.equal(h.state.home.saldo_kredit,42);
  assert.equal(h.state.orders[0].order_id,'B-ORDER');
  assert.equal(h.renderCount(),0);
  assert.equal(h.toasts.length,0);
  h.immediate();
  await vm.runInContext("loadRoute('beranda')",h.ctx);
  assert.equal(h.state.home.saldo_kredit,42);
  assert.equal(h.renderCount(),7); // six progressively resolved sources plus final reconciliation render
});
test('stale getMe response cannot restore a previous identity or revoke the current token',async()=>{
  const a=app.indexOf('async function restoreSession(){');
  const b=app.indexOf('async function loadRoute(route){',a);
  assert.ok(a>=0&&b>a);
  let resolve;
  const tokenKey='TOKEN_KEY';
  const state={token:'TOKEN-A',me:null,qa:false};
  const ctx={state,tokenKey,isConnected:()=>true,render:()=>{},
    toast:()=>{throw Error('Unexpected stale response toast');},
    sessionStorage:{removeItem:()=>{throw Error('New token revoked');}},
    clearPrivateCommandCenter_:()=>{throw Error('New member data cleared');},
    api:()=>new Promise(r=>{resolve=r;})};
  vm.createContext(ctx);
  vm.runInContext(app.slice(a,b),ctx);
  const old=vm.runInContext('restoreSession()',ctx);
  state.token='TOKEN-B';state.me={member_id:'B'};
  resolve({member_id:'A'});
  await old;
  assert.equal(state.me.member_id,'B');
  assert.equal(state.token,'TOKEN-B');
});

test('dashboard paints fast data before an unrelated GAS request completes',async()=>{
  const h=harness();
  const pending=vm.runInContext("loadRoute('beranda')",h.ctx);
  assert.equal(h.pending.length,6);
  const balance=h.pending.find(p=>p.action==='getBeranda');
  balance.resolve({saldo_kredit:55});
  // Each source is painted independently; no need to resolve slow affiliate.
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.state.home?.saldo_kredit,55);
  assert.ok(h.renderCount()>=1);
  h.pending.filter(p=>p!==balance).forEach(p=>p.resolve([]));
  await pending;
  assert.equal(h.toasts.length,0);
});
test('portal read does not unnecessarily wait for LMS catalog and enrollments',async()=>{
  const h=harness();
  h.state.route='portal';
  const pending=vm.runInContext("loadRoute('portal')",h.ctx);
  assert.equal(h.pending.length,1);
  assert.equal(h.pending[0].action,'getModulBelajar');
  h.pending[0].resolve([{modul_id:'MOD-01',judul:'Panduan UMKM'}]);
  await pending;
  assert.equal(h.state.modules[0].modul_id,'MOD-01');
  assert.ok(h.renderCount()>=1);
});

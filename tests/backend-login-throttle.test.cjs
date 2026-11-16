'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function fixture(){
  let now=Date.parse('2026-11-14T08:00:00Z');
  const cached=new Map(),props=new Map();
  class Time extends Date{static now(){return now;}}
  const cache={get:k=>cached.get(k)||null,put:(k,v)=>cached.set(k,v),remove:k=>cached.delete(k)};
  const settings={getProperty:k=>props.get(k)||null,
    setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)};
  const ctx=vm.createContext({Date:Time,console:{log(){},error(){}},
    CacheService:{getScriptCache(){return cache;}},
    PropertiesService:{getScriptProperties(){return settings;}}});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.sha256_=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
  return {ctx,cached,props,setTime:n=>{now=n;},advance:ms=>{now+=ms;}};
}
test('registered account PIN throttle survives complete cache eviction',()=>{
  const h=fixture(),wa='6281234000000';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(wa,true);
  assert.equal(h.props.size,1);
  h.cached.clear();
  assert.throws(()=>h.ctx.loginGuard_(wa),/Terlalu banyak percobaan/);
  assert.equal(h.ctx.loginFailureStoreKey_(wa).includes(wa),false);
});
test('temporary durable lock clears on window expiry',()=>{
  const h=fixture(),wa='6281234000001';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(wa,true);
  h.cached.clear();
  h.advance(16*60000);
  const next=h.ctx.loginGuard_(wa);
  assert.equal(next.attempts,0);
  assert.equal(h.props.size,0);
});
test('successful login can clear both ephemeral and durable counters',()=>{
  const h=fixture(),wa='6281234000002';
  h.ctx.noteLoginFailure_(wa,true);
  assert.equal(h.props.size,1);
  h.ctx.clearLoginFailures_(wa);
  assert.equal(h.props.size,0);
  assert.equal(h.cached.size,0);
  assert.equal(h.ctx.loginGuard_(wa).attempts,0);
});
test('unknown WA requests never populate persistent Script Properties',()=>{
  const h=fixture(),wa='6281234000003';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(wa,false);
  assert.equal(h.props.size,0);
  assert.throws(()=>h.ctx.loginGuard_(wa),/Terlalu banyak percobaan/);
  h.cached.clear();
  assert.equal(h.ctx.loginGuard_(wa).attempts,0);
});
test('throttle is isolated by normalized number and persists only for known users',()=>{
  const h=fixture(),a='6281234000004',b='6281234000005';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(a,true);
  assert.throws(()=>h.ctx.loginGuard_(a),/Terlalu banyak percobaan/);
  assert.equal(h.ctx.loginGuard_(b).attempts,0);
  assert.match(source,/noteLoginFailure_\(wa,Boolean\(m\)\)/);
});

test('duplicate WhatsApp identity fails closed and never checks PIN or issues session',()=>{
 const h=fixture(),ctx=h.ctx,wa='6281234567890';
 const members=[
 {member_id:'M-1',wa,role:'MEMBER',status:'AKTIF'},
 {member_id:'M-2',wa,role:'ADMIN',status:'AKTIF'}];
 let issued=0,checked=0,failed=0;
 ctx.normalizeWa_=()=>wa;ctx.checkPin_=()=>{};
 ctx.withLock_=fn=>fn();ctx.loginGuard_=()=>({attempts:0});
 ctx.findRows_=(tab,predicate)=>tab==='members'?members.filter(predicate):[];
 ctx.pinMatches_=()=>{checked++;return true;};
 ctx.noteLoginFailure_=(number,persist)=>{assert.equal(number,wa);assert.equal(persist,true);failed++;};
 ctx.extendAdminLock_=()=>{};
 ctx.newSessionMember_=()=>{issued++;return {token:'FORBIDDEN'};};
 assert.throws(()=>ctx.authLogin_({wa,pin:'285947'},false),/Nomor WhatsApp atau PIN salah/);
 assert.equal(checked,0);assert.equal(issued,0);assert.equal(failed,1);
});
test('one matching WhatsApp with a valid PIN still produces exactly one session',()=>{
 const h=fixture(),ctx=h.ctx,wa='6281234567890';
 const member={member_id:'M-1',wa,role:'MEMBER',status:'AKTIF'};
 let issued=0;
 ctx.normalizeWa_=()=>wa;ctx.checkPin_=()=>{};
 ctx.withLock_=fn=>fn();ctx.loginGuard_=()=>({attempts:0});
 ctx.findRows_=(tab,predicate)=>tab==='members'?[member].filter(predicate):[];
 ctx.pinMatches_=()=>true;ctx.clearLoginFailures_=()=>{};
 ctx.updateActivity_=()=>{};
 ctx.newSessionMember_=(m)=>{assert.equal(m,member);issued++;return {token:'TEST-ONLY'};};
 assert.equal(ctx.authLogin_({wa,pin:'285947'},false).token,'TEST-ONLY');
 assert.equal(issued,1);
});

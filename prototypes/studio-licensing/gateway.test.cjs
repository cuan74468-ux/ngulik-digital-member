'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../apps-script/Code.gs'),'utf8');
const moduleSource=fs.readFileSync(path.join(__dirname,'StudioLicense.gs'),'utf8');
function fixture(){
 const calls=[],errors=[];
 const ctx=vm.createContext({console:{error:x=>errors.push(x),log(){},warn(){}}});
 vm.runInContext(source,ctx);
 ctx.apiOutput_=v=>v;ctx.isoWib_=()=> 'fixture';ctx.now_=()=>new Date();
 ctx.ngdStudioRoute_=(...args)=>{calls.push(args);return {active:true};};
 ctx.apiRouter_=(...args)=>{calls.push(['legacy',...args]);return {legacy:true};};
 ctx.requireMutationsEnabled_=()=>{throw Object.assign(Error('writes off'),{publicCode:'MAINTENANCE'});};
 const send=(action,token='',payload={},request_id='fixture-request-123')=>ctx.doPost({postData:{contents:JSON.stringify({action,token,payload,request_id})}});
 return {ctx,calls,errors,send};
}
test('candidate installed source equals the separately tested module',()=>assert.ok(source.endsWith(moduleSource)));
test('exact Studio actions routed before generic auth with credential scope and strict body',()=>{const f=fixture(),t='a'.repeat(64);for(const action of ['studioIssueGrant','studioValidateSession','studioLogout','studioAdminList'])assert.equal(f.send(action,t).ok,true);assert.equal(f.send('studioExchangeGrant','',{code:t}).ok,true);assert.deepEqual(f.calls.map(x=>x[0]),['studioIssueGrant','studioValidateSession','studioLogout','studioAdminList','studioExchangeGrant']);for(const input of [['studioExchangeGrant',t,{code:t}],['studioExchangeGrant','',{code:t,extra:1}],['studioIssueGrant',t,{member_id:'M-0001'}],['studioValidateSession',''],['studioLogout',t,{},'short'],['studioAdminGrant',t],['StudioIssueGrant',t]])assert.equal(f.send(...input).ok,false);assert.equal(f.calls.length,5);});
test('Studio errors redact internal messages and do not log credentials',()=>{const f=fixture(),t='a'.repeat(64);f.ctx.ngdStudioRoute_=()=>{throw Error(t);};const r=f.send('studioValidateSession',t);assert.equal(r.error.code,'INTERNAL');assert.ok(!JSON.stringify(r).includes(t));assert.equal(f.errors.length,0);f.ctx.ngdStudioRoute_=()=>{throw Object.assign(Error(t),{publicCode:'FORBIDDEN'});};assert.equal(f.send('studioValidateSession',t).error.message,'Akses Studio belum aktif.');});
test('normal read route and payment write gate unchanged; retired callback rejected',()=>{const f=fixture();assert.equal(f.send('getMe','a'.repeat(64)).data.legacy,true);assert.equal(f.send('createOrder','a'.repeat(64),{product_id:'P-1'}).error.code,'MAINTENANCE');assert.equal(f.ctx.doPost({parameter:{source:'mayar'}}).error.code,'WEBHOOK_RETIRED');assert.equal(f.calls.length,1);});
test('Studio token cannot authenticate to actual ordinary member route',()=>{const ctx=vm.createContext({console:{error(){},log(){},warn(){}}});vm.runInContext(source,ctx);ctx.apiOutput_=v=>v;ctx.isoWib_=()=> 'fixture';ctx.sha256_=x=>x;ctx.findRows_=()=>[];const r=ctx.doPost({postData:{contents:JSON.stringify({action:'getMe',token:'b'.repeat(64),payload:{},request_id:'fixture-request-123'})}});assert.equal(r.error.code,'UNAUTHORIZED');});

test('admin set payload restricted to explicit id, boolean intent and expected state',()=>{const f=fixture(),t='a'.repeat(64),p={member_id:'M-0009',enabled:true,expected_enabled:false};assert.equal(f.send('studioAdminSet',t,p).ok,true);assert.equal(f.send('studioAdminSet',t,{...p,extra:1}).ok,false);assert.equal(f.send('studioAdminSet',t,{...p,enabled:'true'}).ok,false);assert.equal(f.calls.length,1);});

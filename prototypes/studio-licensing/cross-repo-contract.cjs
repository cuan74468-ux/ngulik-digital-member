'use strict';
// Actual source-to-source protocol integration. No remote GAS or provider.
// The only external operation in the CI step is fetching an immutable public Git source.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
const endpoint='https://script.google.com/macros/s/FIXTURE_ONLY/exec';
const memberToken='A'.repeat(64),adminToken='C'.repeat(64),memberId='M-9001',adminId='M-9002';
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function fixture(){
 let now=1700000000000,sequence=0,locked=false;
 const props={NGD_ENVIRONMENT:'STAGING',NGD_DB_ID:'fixture',NGD_STUDIO_PILOT_DB_ID:'fixture',NGD_STUDIO_PILOT_ENABLED:'true',NGD_STUDIO_TOKEN_SECRET:'a'.repeat(64),NGD_STUDIO_PILOT_EPOCH:'1'.repeat(32),NGD_STUDIO_PILOT_MEMBER_IDS:'',NGD_MUTATIONS_ENABLED:'true',NGD_ADMIN_LOGIN_ENABLED:'true',NGD_ADMIN_LOGIN_DB_ID:'fixture',NGD_ADMIN_LOGIN_ACCOUNT_ID:adminId};
 const members=[{member_id:memberId,role:'MEMBER',status:'AKTIF'},{member_id:adminId,role:'ADMIN',status:'AKTIF'}];
 const sessions=members.map((m,i)=>({member_id:m.member_id,role:m.role,token_hash:sha(i?adminToken:memberToken),expires_at:new Date(now+7200000)}));
 const map=new Map(),requests=[],audits=[];
 class Clock extends Date{static now(){return now;}}
 const ctx=vm.createContext({Date:Clock,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{assert.ok(locked);props[k]=v;}})},CacheService:{getScriptCache:()=>({get(k){const r=map.get(k);return r&&r.expires>now?r.v:null;},put(k,v,ttl){assert.ok(locked);map.set(k,{v,expires:now+ttl*1000});},remove(k){assert.ok(locked);map.delete(k);}})},Utilities:{Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature:(v,k)=>crypto.createHmac('sha256',k).update(v).digest()},console:{error(){throw Error('UNEXPECTED_BACKEND_LOG');},log(){},warn(){}}});
 for(const file of ['Code.gs','AdminAccess.gs'])vm.runInContext(fs.readFileSync(path.join(root,'apps-script',file),'utf8'),ctx);
 Object.assign(ctx,{db_:()=>({getId:()=> 'fixture'}),findRows_:(name,fn)=>{assert.ok(['members','sessions'].includes(name),'no finance/table access');return (name==='members'?members:sessions).filter(fn);},sha256_:sha,uuid_:()=>String(++sequence).padStart(32,'0'),hex_:b=>Buffer.from(b).toString('hex'),withLock_:fn=>{assert.equal(locked,false);locked=true;try{return fn();}finally{locked=false;}},logAudit_:(...args)=>{assert.ok(locked);audits.push(args);},apiOutput_:v=>v,isoWib_:()=> 'fixture',now_:()=>new Clock()});
 const fetcher=async(url,opt)=>{
  assert.equal(url,endpoint);assert.equal(opt.method,'POST');assert.equal(opt.credentials,'omit');assert.equal(opt.redirect,'follow');assert.equal(opt.headers['Content-Type'],'text/plain;charset=utf-8');
  const envelope=JSON.parse(opt.body);assert.match(envelope.request_id,/^[A-Za-z0-9_-]{16,80}$/);
  assert.ok(['studioIssueGrant','studioExchangeGrant','studioValidateSession','studioLogout','studioAdminList','studioAdminSet','getMe','getStagingWorkspaceInfo'].includes(envelope.action));
  requests.push(envelope.action);
  const result=JSON.stringify(ctx.doPost({postData:{contents:opt.body}}));
  return {ok:true,url,text:async()=>result,json:async()=>JSON.parse(result)};
 };
 return {props,members,sessions,requests,audits,fetcher,now:()=>now,advance:ms=>{now+=ms;}};
}
test('actual portal API -> actual GAS doPost + admin/session guards -> pinned wrapper client: grant, replay, replacement, revoke, regrant, epoch, parent loss',async()=>{
 const file=process.env.STUDIO_CROSS_CLIENT;assert.ok(file,'exact client source required');
 const {createStudioLicenseClient}=await import(pathToFileURL(file).href);
 const f=fixture(),oldFetch=globalThis.fetch,oldWindow=globalThis.window;
 try{
  globalThis.window={NGD_CONFIG:{apiUrl:endpoint,memberWritesEnabled:true}};
  globalThis.fetch=f.fetcher;
  const apiSource=fs.readFileSync(path.join(root,'js/api.js'),'utf8');
  const {api}=await import('data:text/javascript;base64,'+Buffer.from(apiSource).toString('base64'));
  const send=(a,p={},t=memberToken,write=false)=>api(a,p,t,{write,requestId:'fixture-request-123'});
  const create=()=>createStudioLicenseClient({apiUrl:endpoint,fetcher:f.fetcher,now:f.now,requestId:()=> 'fixture-request-456'});
  const issue=()=>send('studioIssueGrant',{},memberToken,true);
  const set=(enabled,expected_enabled)=>send('studioAdminSet',{member_id:memberId,enabled,expected_enabled},adminToken,true);
  await assert.rejects(issue,e=>e.code==='FORBIDDEN');
  await assert.rejects(()=>send('studioAdminList'),e=>e.code==='FORBIDDEN');
  assert.deepEqual((await send('studioAdminList',{},adminToken)).member_ids,[]);
  assert.equal((await set(true,false)).changed,true);
  assert.deepEqual((await send('studioAdminList',{},adminToken)).member_ids,[memberId]);
  let grant=await issue();assert.equal(grant.expires_in,180);
  const c1=create(),first=await c1.signIn(grant.code);
  assert.deepEqual(first,{active:true,member_id:memberId,expires_at:f.now()+1800000});
  assert.equal(first.token,undefined);
  await assert.rejects(()=>create().signIn(grant.code),/UNAUTHORIZED/);
  f.advance(31000);grant=await issue();const c2=create();await c2.signIn(grant.code);
  await assert.rejects(()=>c1.validate(),/UNAUTHORIZED/);
  assert.equal((await c2.validate()).active,true);
  await set(false,true);await set(true,false);await assert.rejects(()=>c2.validate(),/UNAUTHORIZED/);
  f.advance(31000);const c3=create();await c3.signIn((await issue()).code);
  f.props.NGD_STUDIO_PILOT_ENABLED='false';await assert.rejects(()=>c3.validate(),/MAINTENANCE/);
  f.props.NGD_STUDIO_PILOT_EPOCH='2'.repeat(32);f.props.NGD_STUDIO_PILOT_ENABLED='true';
  f.advance(31000);const c4=create();await c4.signIn((await issue()).code);
  f.sessions.splice(f.sessions.findIndex(x=>x.member_id===memberId),1);
  await assert.rejects(()=>c4.validate(),/UNAUTHORIZED/);assert.equal(c4.active(),false);
  assert.equal(f.audits.length,3);assert.ok(f.requests.includes('studioAdminSet')&&f.requests.includes('studioExchangeGrant'));
  f.props.NGD_STUDIO_PILOT_ENABLED='false';
  const {verifyStudioDisabled}=require('../../scripts/gas-staging-run.cjs');
  const source=new Map([['Kode.js',fs.readFileSync(path.join(root,'apps-script','Code.gs'),'utf8')]]);
  // Same endpoint identity helper used by the existing STAGING health check.
  const identity=await send('getStagingWorkspaceInfo',{},'');
  assert.equal(identity.studio_pilot_enabled,false);
  await verifyStudioDisabled(source,identity,async opt=>(await f.fetcher(endpoint,{...opt,credentials:'omit',redirect:'follow'})).json());
  console.log('NGD_STUDIO_CROSS_REPO_CONTRACT_PASS actual portal + actual doPost + actual admin/session guards + pinned client; no external runtime');
 }finally{globalThis.fetch=oldFetch;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

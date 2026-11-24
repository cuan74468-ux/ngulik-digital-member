'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');

function snapshotApi(env){
  const begin=app.indexOf('// ---- public snapshot begin');
  const end=app.indexOf('// ---- public snapshot end');
  assert.ok(begin>0&&end>begin,'snapshot block markers must exist');
  const block=app.slice(begin,end);
  const store=env.store||new Map();
  const localStorage={
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>{if(env.throwOnSet)throw new Error('quota');store.set(k,v);},
    removeItem:k=>store.delete(k)
  };
  const state=env.state||{qa:false,siteContent:[],publicSettings:{},catalog:[],publicTools:[],
    cmsLoaded:false,catalogLoaded:false,publicToolsLoaded:false};
  const window={NGD_CONFIG:{apiUrl:env.apiUrl||'https://script.google.com/macros/s/AAA/exec'},NGD_PUBLIC_SEED:env.seed};
  const location={pathname:env.pathname||'/ngulik-digital-member/'};
  const fn=new Function('state','window','location','localStorage','isConnected','Date',
    block+';return {publicSnapKey_,publicSnapRead_,publicSnapWrite_,publicSnapClear_,applyPublicSnap_};');
  const api=fn(state,window,location,localStorage,()=>env.connected!==false,env.Date||Date);
  return {api,store,state};
}
const hero={content_id:'CNT-HERO-MAIN',kind:'HERO',placement:'home',title:'Hero'};

test('snapshot round-trips public data and paints cmsLoaded state',()=>{
  const a=snapshotApi({});
  a.state.siteContent=[hero];a.state.catalog=[{product_id:'P-1'}];
  assert.equal(a.api.publicSnapWrite_(),true);
  const b=snapshotApi({store:a.store});
  assert.equal(b.api.applyPublicSnap_(),true);
  assert.equal(b.state.cmsLoaded,true);
  assert.equal(b.state.siteContent[0].content_id,'CNT-HERO-MAIN');
  assert.equal(b.state.catalog.length,1);
});

test('snapshot is isolated per endpoint and per STAGING/PRODUCTION path',()=>{
  const prod=snapshotApi({apiUrl:'https://script.google.com/macros/s/PROD/exec'});
  const stg=snapshotApi({apiUrl:'https://script.google.com/macros/s/STG/exec',pathname:'/ngulik-digital-member/staging/'});
  const prodStg=snapshotApi({apiUrl:'https://script.google.com/macros/s/PROD/exec',pathname:'/x/staging/'});
  assert.notEqual(prod.api.publicSnapKey_(),stg.api.publicSnapKey_());
  assert.notEqual(prod.api.publicSnapKey_(),prodStg.api.publicSnapKey_());
  prod.state.siteContent=[hero];prod.api.publicSnapWrite_();
  const shared=snapshotApi({store:prod.store,apiUrl:'https://script.google.com/macros/s/STG/exec'});
  assert.equal(shared.api.applyPublicSnap_(),false);
});

test('snapshot rejects expired, malformed, hero-less and draft-only data',()=>{
  const a=snapshotApi({});a.state.siteContent=[hero];a.api.publicSnapWrite_();
  const key=a.api.publicSnapKey_();
  const good=JSON.parse(a.store.get(key));
  const put=o=>{a.store.set(key,JSON.stringify(o));return a.api.publicSnapRead_();};
  assert.ok(put(good));
  assert.equal(put({...good,savedAt:Date.now()-25*60*60*1000}),null);
  assert.equal(put({...good,savedAt:Date.now()+60000}),null);
  assert.equal(put({...good,v:99}),null);
  assert.equal(put({...good,siteContent:[{...hero,content_id:'CNT-OTHER'}]}),null);
  assert.equal(put({...good,siteContent:[{...hero,status:'DRAFT'}]}),null);
  a.store.set(key,'{not json');
  assert.equal(a.api.publicSnapRead_(),null);
});

test('snapshot is not written without a hero, survives storage errors, and can be cleared',()=>{
  const a=snapshotApi({});a.state.siteContent=[{content_id:'X',kind:'HERO',placement:'home'}];
  assert.equal(a.api.publicSnapWrite_(),false);
  const q=snapshotApi({throwOnSet:true});q.state.siteContent=[hero];
  assert.equal(q.api.publicSnapWrite_(),false);
  const c=snapshotApi({});c.state.siteContent=[hero];c.api.publicSnapWrite_();
  c.api.publicSnapClear_();
  assert.equal(c.api.publicSnapRead_(),null);
});

test('snapshot is never applied in QA preview or without a configured endpoint',()=>{
  const a=snapshotApi({});a.state.siteContent=[hero];a.api.publicSnapWrite_();
  const off=snapshotApi({store:a.store,connected:false});
  assert.equal(off.api.applyPublicSnap_(),false);
  const qa=snapshotApi({store:a.store,state:{qa:true,siteContent:[],publicSettings:{},catalog:[],publicTools:[]}});
  assert.equal(qa.api.applyPublicSnap_(),false);
});

test('snapshot persists no member, session, admin or info payload',()=>{
  const block=app.slice(app.indexOf('// ---- public snapshot begin'),app.indexOf('// ---- public snapshot end'));
  assert.doesNotMatch(block,/state\.(token|me|info|orders|members|adminContent|adminOrders)\b/);
  assert.doesNotMatch(block,/tokenKey/);
});

test('refreshPublic loads progressively with one in-flight load and a single network retry',()=>{
  const sec=app.slice(app.indexOf('async function refreshPublic(){'),app.indexOf('// Near-real-time sync'));
  assert.doesNotMatch(sec,/Promise\.allSettled/);
  for(const a of ['getPublicContent','getPublicSettings','getPublicInfo','getKatalog','getPublicTools'])
    assert.match(sec,new RegExp("publicRead_\\('"+a+"'\\)"));
  assert.match(sec,/if\(publicLoading_\)return publicLoading_/);
  assert.match(sec,/first\?\.code!=='NETWORK_ERROR'/);
  assert.doesNotMatch(sec,/write:\s*true|createOrder|adminUpdate/);
  // Hero paints on content arrival, before slower reads finish.
  assert.ok(sec.indexOf('homeNow(changed);')<sec.indexOf('await Promise.all'));
});

test('init paints the validated snapshot before the first render',()=>{
  const init=app.slice(app.indexOf('async function init(){'));
  assert.ok(init.indexOf('applyPublicSnap_()')>0);
  assert.ok(init.indexOf('applyPublicSnap_()')<init.indexOf('render();'));
});

test('home polling is read-only, pauses on hidden tabs and keeps its timer across renders',()=>{
  const sec=app.slice(app.indexOf('const homePollMs_'),app.indexOf('async function restoreSession(){'));
  assert.match(sec,/homePollMs_=60000/);
  assert.match(sec,/api\('getPublicContent'\)/);
  assert.doesNotMatch(sec,/write:\s*true|createOrder|adminUpdate|getMe|token/);
  assert.match(sec,/document\.hidden/);
  assert.match(sec,/JSON\.stringify\(content\)!==JSON\.stringify\(state\.siteContent\)/);
  assert.match(sec,/mode===pollMode_/);
  assert.match(sec,/visibilitychange/);
});

test('index.html cache-busts app.js for this change',()=>{
  assert.match(indexHtml,/js\/app\.js\?v=[^"]*snap1-seed2-unified2-role1-hero3"/);
});

test('editorial publication invalidates older snapshots',()=>{
 const a=snapshotApi({});a.state.siteContent=[hero];a.api.publicSnapWrite_();
 const b=snapshotApi({store:a.store,seed:{generatedAt:new Date(Date.now()+1000).toISOString()}});
 assert.equal(b.api.publicSnapRead_(),null);
});

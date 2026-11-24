'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const verifier=path.join(root,'scripts/preflight-gas-staging-sync.cjs');
function mockGas(){
 const kv=new Map([
  ['NGD_ENVIRONMENT','STAGING'],['NGD_MUTATIONS_ENABLED','false'],
  ['NGD_FINANCE_ENABLED','false'],
  ['NGD_VISUAL_PRIVATE_FOLDER_ID','private_folder_id_12345678901234567890']
 ]);
 const calls={wallet:0,registry:0};
 const properties={
  getProperty:k=>kv.has(k)?kv.get(k):null,
  setProperty:(k,v)=>{kv.set(k,String(v));return properties},
  deleteProperty:k=>{kv.delete(k);return properties},
  setProperties:(v)=>{Object.entries(v).forEach(([k,x])=>kv.set(k,String(x)));return properties}
 };
 let credit=null;
 const ctx=vm.createContext({
  PropertiesService:{getScriptProperties:()=>properties},
  Utilities:{getUuid:()=> 'a5b4f4f2-9159-4b00-89d1-785405c902cc'},
  ngdVmDriveFolder_:()=>({getId:()=>kv.get('NGD_VISUAL_PRIVATE_FOLDER_ID')}),
  byId_:(_,field,id)=>id==='M-0009'&&field==='member_id'?{member_id:id,status:'AKTIF'}:null,
  ngdVisualStoreDrive_:()=>({ledger:{balance:()=>credit}}),
  ngdVisualPreparePrivateRegistryStaging:()=>{
   assert.equal(kv.get('NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED'),'I_APPROVE_STAGING_RECIPE_INSTALL_ONLY');
   calls.registry++;kv.set('NGD_VISUAL_FOOD_MAGAZINE_V2','{"version":"valid"}');
   return {ready:true};
  },
  ngdVisualProvisionPilotWalletStaging:()=>{
   assert.equal(kv.get('NGD_VISUAL_UAT_SEED_APPROVED'),'I_APPROVE_STAGING_VISUAL_TEST_CREDITS_ONLY');
   calls.wallet++;credit={member_id:'M-0009',available:12,held:0};return credit;
  },
  ngdVisualPilotWalletStatusStaging:()=>credit,
  NGD_FOOD_MAGAZINE_REGISTRY_KEY_:'NGD_VISUAL_FOOD_MAGAZINE_V2'
 });
 vm.runInContext(read('apps-script/VisualRuntime.gs'),ctx);
 return {ctx,kv,calls};
}
test('quick bootstrap requires only two private properties; leaves all P0 and paid switches OFF',()=>{
 const h=mockGas();h.kv.delete('NGD_VISUAL_PRIVATE_FOLDER_ID');
 assert.throws(()=>h.ctx.ngdQuickBootstrapVisualStaging(),/ENTER_PRIVATE_FOLDER_ID/);
 assert.equal(h.calls.wallet,0);assert.equal(h.calls.registry,0);
});
test('quick bootstrap installs defaults and 12 Visual-only credits ONCE without provider calls or hardcoded secrets',()=>{
 const h=mockGas();
 const a=h.ctx.ngdQuickBootstrapVisualStaging();
 assert.equal(a.p0_finance,false);assert.equal(a.p0_mutations,false);
 assert.equal(a.visual_live,false);assert.equal(a.deployed,false);
 assert.equal(a.google_key_present,false);
 assert.equal(h.kv.get('NGD_VISUAL_LIVE_ENABLED'),'false');
 assert.equal(h.kv.get('NGD_VISUAL_DAILY_BUDGET_CAP'),'0');
 assert.equal(h.kv.get('NGD_VISUAL_TEMPLATES_ENABLED'),'false');
 assert.equal(h.kv.get('NGD_MUTATIONS_ENABLED'),'false');
 assert.equal(h.kv.get('NGD_FINANCE_ENABLED'),'false');
 assert.equal(h.kv.get('NGD_VISUAL_WORKER_SECRET').length,64);
 assert.equal(h.calls.wallet,1);assert.equal(h.calls.registry,1);
 assert.equal(h.kv.has('NGD_VISUAL_UAT_SEED_APPROVED'),false);
 assert.equal(h.kv.has('NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED'),false);
 const b=h.ctx.ngdQuickBootstrapVisualStaging();
 assert.equal(b.visual_test_wallet.available,12);
 assert.equal(h.calls.wallet,1,'idempotent wallet must not be credited twice');
 assert.equal(h.kv.get('NGD_VISUAL_DAILY_BUDGET_CAP'),'0');
});
test('quick bootstrap refuses non-STAGING / active P0 switches without side effects',()=>{
 for(const [k,v] of [['NGD_ENVIRONMENT','PRODUCTION'],['NGD_FINANCE_ENABLED','true'],
  ['NGD_MUTATIONS_ENABLED','true'],['NGD_VISUAL_LIVE_ENABLED','true']]){
  const h=mockGas();h.kv.set(k,v);
  assert.throws(()=>h.ctx.ngdQuickBootstrapVisualStaging());
  assert.equal(h.calls.wallet,0);assert.equal(h.calls.registry,0);
  assert.equal(h.kv.has('NGD_VISUAL_WORKER_SECRET'),false);
 }
});
function runAudit(change){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ngd-gas-preflight-'));
 const target=path.join(dir,'repo'),remote=path.join(dir,'remote');
 fs.mkdirSync(target);fs.mkdirSync(remote);
 const names=fs.readdirSync(path.join(root,'apps-script')).filter(f=>/\.gs$/.test(f)||f==='appsscript.json');
 for(const file of names){
  fs.copyFileSync(path.join(root,'apps-script',file),path.join(target,file));
  if(!file.startsWith('Visual')){
   let value=read('apps-script/'+file);
   if(file==='Code.gs'){
    const needle="    visual_staging_ready:typeof ngdVisualPublicMode_==='function'&&ngdVisualPublicMode_(),\n";
    const start=value.indexOf("    // Narrow, independently guarded P1 STAGING Visual API.");
    const end=value.indexOf("    var reads=apiReadActions_();",start);
    assert.ok(start>=0&&end>start,'Code.gs Visual router anchors');
    value=value.replace(needle,'');
    const start2=value.indexOf("    // Narrow, independently guarded P1 STAGING Visual API.");
    const end2=value.indexOf("    var reads=apiReadActions_();",start2);
    value=value.slice(0,start2)+value.slice(end2);
   }
   if(file==='appsscript.json'){
    const o=JSON.parse(value);o.oauthScopes=o.oauthScopes.filter(x=>x!=='https://www.googleapis.com/auth/drive');value=JSON.stringify(o,null,2);
   }
   fs.writeFileSync(path.join(remote,file),value);
  }
 }
 if(change)change(remote);
 const result=cp.spawnSync(process.execPath,[verifier,target,remote],{encoding:'utf8'});
 fs.rmSync(dir,{recursive:true,force:true});
 return result;
}
test('remote-v28 baseline passes, no Visual source present yet',()=>{
 const r=runAudit();assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
 assert.match(r.stdout,/GAS_STAGING_PREFLIGHT_PASS/);
});
test('preflight blocks unknown legacy and unreviewed Code.gs or manifest drift',()=>{
 const diffs=[
  dir=>fs.writeFileSync(path.join(dir,'ExtraCustom.gs'),'function extra(){}'),
  dir=>fs.appendFileSync(path.join(dir,'Code.gs'),'\nfunction unknownP0Mutation(){}'),
  dir=>fs.appendFileSync(path.join(dir,'Diagnostics.gs'),'\n// drift'),
  dir=>fs.writeFileSync(path.join(dir,'appsscript.json'),'{}')
 ];
 for(const change of diffs){
  const r=runAudit(change);assert.notEqual(r.status,0,r.stdout);
  assert.match(r.stdout,/errors/);
  assert.match(r.stderr,/STOP/);
 }
});
test('workflow has only manual trigger and cannot deploy or run without typed confirmation',()=>{
 const y=read('.github/workflows/sync-gas-staging.yml');
 assert.match(y,/workflow_dispatch/);
 assert.doesNotMatch(y,/\n\s+push:\s*\n\s+branches:/);
 assert.match(y,/I_BACKED_UP_GAS_STAGING_V28_NO_PRODUCTION/);
 assert.match(y,/preflight-gas-staging-sync/);
 assert.match(y,/clasp pull/);
 assert.match(y,/clasp push --force/);
 assert.doesNotMatch(y,/clasp (re)?deploy/);
});

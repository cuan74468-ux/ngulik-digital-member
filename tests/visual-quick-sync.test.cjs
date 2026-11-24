'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
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

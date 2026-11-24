'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=p=>fs.readFileSync(path.join(root,'apps-script',p),'utf8');
function context(){
 const props={NGD_ENVIRONMENT:'STAGING'};
 const store={seeded:null};
 const ctx=vm.createContext({console,
  PropertiesService:{getScriptProperties:()=>({
   getProperty:k=>Object.prototype.hasOwnProperty.call(props,k)?props[k]:null,
   setProperty:(k,v)=>{props[k]=v}
  })},
  byId_:(_,field,id)=>field==='member_id'&&id==='M-0009'?{member_id:'M-0009',status:'AKTIF'}:null,
  ngdVisualStoreDrive_:()=>({ledger:{
    provisionPilotOnce:(id,value)=>{if(store.seeded)throw Error('ALREADY_PROVISIONED');return store.seeded={id,value}},
    balance:id=>store.seeded?.id===id?{available:store.seeded.value,held:0}:null
  }}),
  ngdVmDriveFolder_:()=>{if(props.NGD_VISUAL_PRIVATE_FOLDER_ID!=='trusted_private_folder_1234567890')throw Error('FOLDER_NOT_PRIVATE');return {}},
  ngdVisualProviderPrivateQuote_:(id,count)=>{if(!props.NGD_VISUAL_PROVIDER_COST_ESTIMATES_IDR)throw Error('NO_PRICE');return 500*count},
  ngdVisualChunkUpload_:()=>({}),
  ngdVisualRuntime_:()=>({workerInternals:()=>({jobs:{expire:()=>[],cleanup:()=>({purged:0})}})}),
  ngdVisualUploadPurgeExpired_:()=>({purged:0})
 });
 for(const name of ['VisualSkills.gs','VisualJobs.gs','VisualApi.gs'])vm.runInContext(code(name),ctx,{filename:name});
 return {ctx,props,store};
}
test('STAGING must have private key, authorized engine, caps, registry and folder before LIVE',()=>{
 const {ctx:c,props:p}=context();
 assert.equal(c.ngdVisualPublicMode_(),false);
 p.NGD_VISUAL_LIVE_ENABLED='true';p.NGD_VISUAL_CREDITS_ENABLED='true';
 p.NGD_VISUAL_MEDIA_READY='true';p.NGD_VISUAL_WORKER_READY='true';
 p.NGD_VISUAL_DAILY_BUDGET_CAP='5000';p.NGD_VISUAL_WORKER_SECRET='x'.repeat(40);
 p.NGD_VISUAL_ALLOWED_MACHINES='gemini_flash_image';p.NGD_KEY_GOOGLE_AI='g'.repeat(25);
 p.NGD_VISUAL_PRIVATE_FOLDER_ID='trusted_private_folder_1234567890';
 p.NGD_VISUAL_PROVIDER_COST_ESTIMATES_IDR='{"gemini_flash_image":500}';
 assert.equal(c.ngdVisualPublicMode_(),false,'registry must be provisioned first');
 p.NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED='I_APPROVE_STAGING_RECIPE_INSTALL_ONLY';
 p.NGD_VISUAL_LIVE_ENABLED='false';
 assert.equal(c.ngdVisualPreparePrivateRegistryStaging().ready,true);
 p.NGD_VISUAL_LIVE_ENABLED='true';
 assert.equal(c.ngdVisualPublicMode_(),true);
 assert.equal(Array.from(c.ngdVisualActiveMachineIds_()).join(','),'gemini_flash_image');
 p.NGD_VISUAL_ALLOWED_MACHINES='gemini_flash_image,flux_kontext_pro';
 assert.equal(c.ngdVisualPublicMode_(),false,'do not offer Flux without paid aggregator key');
 p.NGD_VISUAL_ALLOWED_MACHINES='gemini_flash_image';p.NGD_VISUAL_DAILY_BUDGET_CAP='0';
 assert.equal(c.ngdVisualPublicMode_(),false,'no budget cap means no generation');
 p.NGD_VISUAL_DAILY_BUDGET_CAP='5000';p.NGD_KEY_GOOGLE_AI='';
 assert.equal(c.ngdVisualPublicMode_(),false,'no key means no generation');
});
test('operator-only recipe bootstrap never overwrites validated private registry',()=>{
 const {ctx:c,props:p}=context();
 assert.throws(()=>c.ngdVisualPreparePrivateRegistryStaging(),/APPROVAL_REQUIRED/);
 p.NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED='I_APPROVE_STAGING_RECIPE_INSTALL_ONLY';
 const result=c.ngdVisualPreparePrivateRegistryStaging();
 assert.equal(result.ready,true);assert.equal(result.already_configured,false);
 const raw=p.NGD_VISUAL_FOOD_MAGAZINE_V2;
 assert.ok(raw.length>250&&raw.length<=9000);
 assert.equal(Object.keys(JSON.parse(raw).lighting).length,6);
 assert.equal(c.ngdVisualPreparePrivateRegistryStaging().already_configured,true);
 assert.equal(p.NGD_VISUAL_FOOD_MAGAZINE_V2,raw);
});
test('pilot wallet funding is one-time and cannot occur without explicit operator approval or while LIVE',()=>{
 const {ctx:c,props:p}=context();
 p.NGD_VISUAL_UAT_MEMBER_ID='M-0009';
 assert.throws(()=>c.ngdVisualProvisionPilotWalletStaging(),/APPROVAL_REQUIRED/);
 p.NGD_VISUAL_UAT_SEED_APPROVED='I_APPROVE_STAGING_VISUAL_TEST_CREDITS_ONLY';
 p.NGD_VISUAL_LIVE_ENABLED='true';
 assert.throws(()=>c.ngdVisualProvisionPilotWalletStaging(),/PILOT_MUST_BE_OFF/);
 p.NGD_VISUAL_LIVE_ENABLED='false';
 const seeded=c.ngdVisualProvisionPilotWalletStaging();
 assert.equal(seeded.value,12);
 assert.equal(c.ngdVisualPilotWalletStatusStaging().available,12);
 assert.throws(()=>c.ngdVisualProvisionPilotWalletStaging(),/ALREADY_PROVISIONED/);
});
test('cleanup refunds expired jobs regardless of visual LIVE flag',()=>{
 const {ctx:c,props:p}=context(),events=[];
 p.NGD_VISUAL_WORKER_SECRET='k'.repeat(40);
 c.ngdVisualRuntime_=()=>({workerInternals:()=>({jobs:{
  expire:()=>{events.push('expire');return [{}]},
  cleanup:()=>{events.push('media');return {purged:0}}
 }})});
 c.ngdVisualUploadPurgeExpired_=()=>{events.push('chunks');return {purged:0}};
 const result=c.ngdVisualWorkerCleanupStaging();
 assert.equal(result.expired_jobs,1);
 assert.deepEqual(events,['expire','media','chunks']);
 assert.equal(p.NGD_VISUAL_LIVE_ENABLED,undefined);
});

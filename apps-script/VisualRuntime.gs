/**
 * Source-only GAS composition root. No public router, trigger or deployment
 * is registered here. The caller must supply an independently audited
 * authenticated member-session verifier (never client-selected member_id).
 *
 * Visual credit wallets and Drive state are distinct from financial P0.
 * This entire interface fails closed until all Visual-only gates + provider
 * cost controls + private Drive bucket and dedicated Visual wallet are set.
 */
function ngdVisualRuntimeConfig_(){
 ngdVjAssert_(typeof PropertiesService!=='undefined','GAS_REQUIRED');
 var props=PropertiesService.getScriptProperties();
 var flag=function(k){return props.getProperty(k)==='true';};
 var numeric=function(k){
  var value=props.getProperty(k);
  return typeof value==='string'&&/^[1-9]\d{0,8}$/.test(value)?
   Number(value):0;
 };
 return {
  NGD_VISUAL_LIVE_ENABLED:flag('NGD_VISUAL_LIVE_ENABLED'),
  NGD_VISUAL_CREDITS_ENABLED:flag('NGD_VISUAL_CREDITS_ENABLED'),
  NGD_VISUAL_MEDIA_READY:flag('NGD_VISUAL_MEDIA_READY'),
  NGD_VISUAL_WORKER_READY:flag('NGD_VISUAL_WORKER_READY'),
  NGD_VISUAL_DAILY_BUDGET_CAP:numeric('NGD_VISUAL_DAILY_BUDGET_CAP'),
  NGD_VISUAL_RATE_LIMIT:numeric('NGD_VISUAL_RATE_LIMIT')||6
 };
}
function ngdVisualProviderPrivateQuote_(machineId,count){
 ngdVisualQuote_(machineId,count); // machine + count authoritative allowlist
 var raw=PropertiesService.getScriptProperties().getProperty(
  'NGD_VISUAL_PROVIDER_COST_ESTIMATES_IDR');
 ngdVjAssert_(typeof raw==='string'&&raw.length>2&&raw.length<500,
  'PRIVATE_PROVIDER_ESTIMATES_REQUIRED');
 var prices;
 try{prices=JSON.parse(raw);}catch(_){throw Error('VISUAL_JOB_PRIVATE_PRICE_JSON_INVALID');}
 ngdVjAssert_(prices&&typeof prices==='object'&&
  Object.prototype.hasOwnProperty.call(prices,machineId),'PRIVATE_MACHINE_COST_MISSING');
 var unit=prices[machineId];
 ngdVjAssert_(Number.isSafeInteger(unit)&&unit>0&&unit<=200000,
  'PRIVATE_COST_ESTIMATE_INVALID');
 return unit*count; // only internal budget, never returned to member
}
function ngdVisualCryptoFingerprint_(value){
 ngdVjAssert_(typeof Utilities!=='undefined','GAS_CRYPTO_REQUIRED');
 return ngdVmSha256_(Utilities.newBlob(JSON.stringify(value)).getBytes());
}
function ngdVisualRuntime_(auth){
 ngdVjAssert_(auth&&typeof auth.requireMember==='function'&&
  typeof auth.requireWorker==='function','AUTH_ADAPTER_REQUIRED');
 var config=ngdVisualRuntimeConfig_();
 var clock={now:function(){return Date.now();}};
 var store=ngdVisualStoreDrive_(clock);
 var media=ngdVisualMediaDrive_({auth:auth,now:clock.now});
 var jobs=ngdVisualJobs_({
  config:config,auth:auth,media:media,jobs:store.jobs,ledger:store.ledger,
  budget:store.budget,rate:store.rate,queue:store.queue,slots:store.slots,clock:clock,
  hashBytes:ngdVmSha256_,fingerprint:ngdVisualCryptoFingerprint_,
  quote:ngdVisualProviderPrivateQuote_,
  compile:function(payload){return ngdFoodMagazineCompile_(payload);}
 });
 function member(session){return ngdVjSession_(auth,session);}
 return {
  publicCatalog:function(){return ngdVisualPublicCatalog_();},
  publicQuote:function(session,request){
   member(session);
   ngdVjAssert_(request&&typeof request==='object','QUOTE_REQUEST_INVALID');
   return ngdVisualQuote_(request.machine_id,request.count);
  },
  uploadPrivate:function(session,request){
   ngdVjAssert_(config.NGD_VISUAL_LIVE_ENABLED&&config.NGD_VISUAL_MEDIA_READY&&
    config.NGD_VISUAL_CREDITS_ENABLED&&config.NGD_VISUAL_WORKER_READY,
    'VISUAL_GATES_OFF');
   return media.upload(session,request);
  },
  createJob:function(session,request){return jobs.create(session,request);},
  pollJob:function(session,jobId){return jobs.poll(session,jobId);},
  downloadPrivateResult:function(session,jobId,assetId){
   var snapshot=jobs.poll(session,jobId);
   ngdVjAssert_(snapshot.status==='SETTLED'&&
    snapshot.result_asset_ids.indexOf(assetId)>=0,'RESULT_NOT_SETTLED_OR_OWNED');
   return media.download(session,assetId,jobId);
  },
  workerInternals:function(worker){
   ngdVjAssert_(auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
   return {jobs:jobs,media:media,store:store,clock:clock,config:config};
  }
 };
}


/**
 * NGULIK VISUAL STAGING: safe one-run bootstrap from GAS editor.
 *
 * Before Run, enter ONLY these two Script Properties in the STAGING editor:
 *  NGD_VISUAL_PRIVATE_FOLDER_ID = existing PRIVATE folder ID
 *  NGD_KEY_GOOGLE_AI = private Google AI Studio key (optional at setup).
 *
 * DO NOT paste an API key into any .gs source or a public GitHub commit.
 * No real image provider call, no trigger, no GAS deployment, and no P0 write.
 * An existing ACTIVE STAGING M-0009 account receives 12 Visual-only test
 * credits once, never top-ups. Change member id via standalone Script Property
 * NGD_VISUAL_UAT_MEMBER_ID if that test account is not available.
 *
 * This is intentionally fail-closed and NOT a production installer.
 */
function ngdQuickBootstrapVisualStaging(){
 var props=PropertiesService.getScriptProperties();
 function need(ok,code){if(!ok)throw Error('NGD_VISUAL_QUICK_BOOTSTRAP_'+code);}
 need(props.getProperty('NGD_ENVIRONMENT')==='STAGING','NOT_STAGING');
 need(props.getProperty('NGD_MUTATIONS_ENABLED')==='false'&&
  props.getProperty('NGD_FINANCE_ENABLED')==='false','P0_SWITCHES_NOT_OFF');
 var flags=['NGD_VISUAL_LIVE_ENABLED','NGD_VISUAL_CREDITS_ENABLED',
  'NGD_VISUAL_MEDIA_READY','NGD_VISUAL_WORKER_READY',
  'NGD_VISUAL_TEMPLATES_ENABLED'];
 flags.forEach(function(key){
  need(props.getProperty(key)!=='true','STOP_ALREADY_ACTIVE_'+key);
 });
 var folderId=props.getProperty('NGD_VISUAL_PRIVATE_FOLDER_ID');
 need(typeof folderId==='string'&&/^[A-Za-z0-9_-]{20,110}$/.test(folderId),
  'ENTER_PRIVATE_FOLDER_ID_IN_SCRIPT_PROPERTIES');
 // Check folder ownership/privacy BEFORE writing any properties or credits.
 var folder=ngdVmDriveFolder_();
 need(folder&&folder.getId()===folderId,'PRIVATE_DRIVE_FOLDER_MISMATCH');
 var key=props.getProperty('NGD_KEY_GOOGLE_AI');
 // Key is optional for source/preflight setup; it never enables generation.
 if(key!==null&&key!==undefined&&key!=='')
  need(typeof key==='string'&&key.length>=16&&key.length<=250,
   'GOOGLE_KEY_FORMAT_INVALID');
 var memberId=props.getProperty('NGD_VISUAL_UAT_MEMBER_ID')||'M-0009';
 need(/^[A-Za-z0-9_-]{3,80}$/.test(memberId),'UAT_MEMBER_ID_INVALID');
 var member=byId_('members','member_id',memberId);
 need(member&&member.member_id===memberId&&member.status==='AKTIF',
  'UAT_MEMBER_NOT_ACTIVE');
 var already=ngdVisualStoreDrive_().ledger.balance(memberId);
 need(!already||(Number.isSafeInteger(already.available)&&
  Number.isSafeInteger(already.held)&&already.available>=0&&already.held>=0),
  'WALLET_CORRUPT');
 // Never overwrite provider unit-price estimates or an active quota.
 // Missing cap means LIVE remains OFF, even if an API key was entered.
 var defaults={
  NGD_VISUAL_LIVE_ENABLED:'false',
  NGD_VISUAL_CREDITS_ENABLED:'false',
  NGD_VISUAL_MEDIA_READY:'false',
  NGD_VISUAL_WORKER_READY:'false',
  NGD_VISUAL_TEMPLATES_ENABLED:'false',
  NGD_VISUAL_DAILY_BUDGET_CAP:'0',
  NGD_VISUAL_RATE_LIMIT:'1',
  NGD_VISUAL_ALLOWED_MACHINES:'gemini_flash_image',
  NGD_VISUAL_FLUX_AGGREGATOR:'kie',
  NGD_VISUAL_UAT_MEMBER_ID:memberId
 };
 var oldSecret=props.getProperty('NGD_VISUAL_WORKER_SECRET');
 need(!oldSecret||(typeof oldSecret==='string'&&oldSecret.length>=32),
  'EXISTING_WORKER_SECRET_INVALID');
 if(!oldSecret)defaults.NGD_VISUAL_WORKER_SECRET=
  Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
 props.setProperties(defaults,false);
 var hadRecipe=!!props.getProperty(NGD_FOOD_MAGAZINE_REGISTRY_KEY_);
 var tempKey='NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED';
 var tempSeed='NGD_VISUAL_UAT_SEED_APPROVED';
 need(!props.getProperty(tempKey)&&!props.getProperty(tempSeed),
  'STALE_OPERATOR_APPROVAL_FLAGS');
 var recipe,wallet;
 try{
  props.setProperty(tempKey,'I_APPROVE_STAGING_RECIPE_INSTALL_ONLY');
  recipe=ngdVisualPreparePrivateRegistryStaging();
 }finally{props.deleteProperty(tempKey);}
 if(!already){
  try{
   props.setProperty(tempSeed,'I_APPROVE_STAGING_VISUAL_TEST_CREDITS_ONLY');
   wallet=ngdVisualProvisionPilotWalletStaging();
  }finally{props.deleteProperty(tempSeed);}
 }else wallet=ngdVisualPilotWalletStatusStaging();
 need(wallet&&wallet.available>=0,'PILOT_WALLET_MISSING');
 // Return only safe operational metadata, NEVER the key or worker secret.
 return {
  environment:'STAGING',p0_mutations:false,p0_finance:false,
  visual_live:false,templates_cloud:false,
  private_folder_verified:true,recipe_ready:recipe.ready,
  registry_preexisting:hadRecipe,
  pilot_member:memberId,visual_test_wallet:wallet,
  google_key_present:!!key,
  provider_cost_estimates_verified:false,
  trigger_installed:false,deployed:false,
  message:'READY_FOR_OFFLINE_UAT_ONLY; LIVE AI remains blocked'
 };
}

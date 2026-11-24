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

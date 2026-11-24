/**
 * P1 Visual-only STAGING gateway. Called by explicit visual* action branch in
 * Code.gs doPost. NEVER bypasses member session verification or P0 guards for
 * other API actions. No provider secrets or cost estimates in responses.
 *
 * Install as source only; do NOT change deployed GAS STAGING v28 until reviewed.
 */
var NGD_VISUAL_API_ACTIONS_=Object.freeze([
 'visualHealth','visualCatalog','visualQuote',
 'visualUploadStart','visualUploadChunk','visualUploadFinish',
 'visualCreateJob','visualPollJob','visualResult',
 'visualTemplateList','visualTemplateSave','visualTemplateDelete'
]);
function ngdVisualStagingGuard_(){
 var p=PropertiesService.getScriptProperties();
 ngdVjAssert_(p.getProperty('NGD_ENVIRONMENT')==='STAGING',
  'STAGING_ONLY');
}
function ngdVisualServerAuth_(){
 return {
  requireMember:function(token){
   // Code.gs session_ checks SHA256 token against sessions and members Sheets.
   // It must never trust a client-supplied member ID.
   return session_(token);
  },
  requireWorker:function(secret){
   var stored=PropertiesService.getScriptProperties().getProperty(
    'NGD_VISUAL_WORKER_SECRET');
   return typeof stored==='string'&&stored.length>=32&&
    typeof secret==='string'&&secret.length===stored.length&&
    ngdVisualConstantTimeEqual_(stored,secret);
  }
 };
}
function ngdVisualConstantTimeEqual_(a,b){
 var mismatch=0;
 for(var i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
 return mismatch===0;
}
function ngdVisualPublicMode_(){
 // Public health returns only boolean; no credentials, balances or prices.
 var props=PropertiesService.getScriptProperties();
 return props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
  ['NGD_VISUAL_LIVE_ENABLED','NGD_VISUAL_CREDITS_ENABLED',
   'NGD_VISUAL_MEDIA_READY','NGD_VISUAL_WORKER_READY'].every(function(k){
    return props.getProperty(k)==='true';
   });
}
function ngdVisualApiRoute_(action,token,payload,requestId){
 ngdVisualStagingGuard_();
 ngdVjAssert_(NGD_VISUAL_API_ACTIONS_.indexOf(action)>=0,'UNKNOWN_ACTION');
 ngdVjId_(requestId,'REQUEST');
 var auth=ngdVisualServerAuth_(),m=ngdVjSession_(auth,token);
 // Check auth before any media access or property-dependent runtime.
 var input=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
 if(action==='visualHealth')return {live:ngdVisualPublicMode_(),
  templates_enabled:PropertiesService.getScriptProperties().getProperty('NGD_VISUAL_TEMPLATES_ENABLED')==='true',
  adapter:ngdVisualPublicMode_()?'PRIVATE_VISUAL_QUEUE':'SIMULATION'};
 if(action==='visualCatalog')return {machines:ngdVisualPublicCatalog_(),
  matrix:ngdVisualContextPublicMatrix_()};
 if(['visualTemplateList','visualTemplateSave','visualTemplateDelete'].indexOf(action)>=0){
  // Template drafts are nonfinancial, but require their own isolated
  // provisioning flag and verified private Drive storage.
  var props=PropertiesService.getScriptProperties();
  ngdVjAssert_(props.getProperty('NGD_VISUAL_TEMPLATES_ENABLED')==='true',
   'VISUAL_TEMPLATES_DISABLED');
  var saved=ngdVisualMemberTemplates_(auth,ngdVisualStoreDrive_());
  if(action==='visualTemplateList')return {templates:saved.list(token)};
  if(action==='visualTemplateSave')return {template:saved.save(token,input)};
  return saved.remove(token,input.id);
 }
 var runtime=ngdVisualRuntime_(auth);
 if(action==='visualQuote')return runtime.publicQuote(token,{
  machine_id:input.machine_id,count:input.count});
 // All further API actions MUST be gated with dedicated Visual-only controls.
 ngdVjAssert_(ngdVisualPublicMode_(),'VISUAL_LIVE_DISABLED');
 if(action==='visualUploadStart')return ngdVisualChunkUpload_(auth).start(token,input);
 if(action==='visualUploadChunk')return ngdVisualChunkUpload_(auth).chunk(token,input);
 if(action==='visualUploadFinish')return ngdVisualChunkUpload_(auth).finish(token,input);
 if(action==='visualCreateJob'){
  ngdVjAssert_(requestId===input.idempotency_key,'IDEMPOTENCY_REQUEST_MISMATCH');
  return runtime.createJob(token,input);
 }
 if(action==='visualPollJob')return runtime.pollJob(token,input.job_id);
 if(action==='visualResult')return runtime.downloadPrivateResult(token,
  input.job_id,input.asset_id);
 throw Error('VISUAL_JOB_ACTION_NOT_IMPLEMENTED');
}
/**
 * Only the script editor/authorized time trigger may invoke this function.
 * A public doPost request has no route to the worker.
 */
async function ngdVisualWorkerTickStaging(){
 ngdVisualStagingGuard_();
 ngdVjAssert_(ngdVisualPublicMode_(),'VISUAL_LIVE_DISABLED');
 var key=PropertiesService.getScriptProperties().getProperty('NGD_VISUAL_WORKER_SECRET');
 ngdVjAssert_(typeof key==='string'&&key.length>=32,'WORKER_KEY_MISSING');
 return await ngdVisualWorker_(ngdVisualServerAuth_(),key).tick();
}
function ngdVisualWorkerCleanupStaging(){
 ngdVisualStagingGuard_();
 var key=PropertiesService.getScriptProperties().getProperty('NGD_VISUAL_WORKER_SECRET');
 ngdVjAssert_(typeof key==='string'&&key.length>=32&&
  ngdVisualServerAuth_().requireWorker(key)===true,'WORKER_KEY_MISSING');
 // Cleanup remains available even when LIVE is switched OFF, to prevent
 // private media/uploads from accumulating after an emergency stop.
 var auth=ngdVisualServerAuth_();
 var files=ngdVisualMediaDrive_({auth:auth}).purgeExpired(Date.now(),100);
 var chunks=ngdVisualUploadPurgeExpired_();
 return {media:files,uploads:chunks};
}

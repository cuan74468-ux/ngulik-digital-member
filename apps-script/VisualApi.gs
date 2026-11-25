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
function ngdVisualActiveMachineIds_(){
 var props=PropertiesService.getScriptProperties();
 var raw=props.getProperty('NGD_VISUAL_ALLOWED_MACHINES')||'';
 if(!/^[a-z0-9_,]{1,160}$/.test(raw))return [];
 var values=raw.split(','),seen={};
 if(values.some(function(id){
  if(!Object.prototype.hasOwnProperty.call(NGD_VISUAL_MACHINE_CATALOG_,id)||
   seen[id])return true;
  seen[id]=true;
  var key=id==='gemini_flash_image'?'NGD_KEY_GOOGLE_AI':
   props.getProperty('NGD_VISUAL_FLUX_AGGREGATOR')==='fal'?
   'NGD_KEY_FAL_AI':'NGD_KEY_KIE_AI';
  var secret=props.getProperty(key);
  return typeof secret!=='string'||secret.length<16;
 }))return [];
 return values;
}
function ngdVisualPublicMode_(){
 // Health reports true only after validating every private dependency,
 // never solely because a browser-visible switch was set to 'true'.
 var props=PropertiesService.getScriptProperties();
 var allowed=ngdVisualActiveMachineIds_();
 var ready=props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&allowed.length>0&&
  /^[1-9]\d{0,8}$/.test(props.getProperty('NGD_VISUAL_DAILY_BUDGET_CAP')||'')&&
  typeof props.getProperty('NGD_VISUAL_WORKER_SECRET')==='string'&&
  props.getProperty('NGD_VISUAL_WORKER_SECRET').length>=32&&
  ['NGD_VISUAL_LIVE_ENABLED','NGD_VISUAL_CREDITS_ENABLED',
   'NGD_VISUAL_MEDIA_READY','NGD_VISUAL_WORKER_READY'].every(function(k){
    return props.getProperty(k)==='true';
   });
 if(!ready)return false;
 try{
  ngdVmDriveFolder_(); // owned private Drive folder with OAuth
  ngdFoodMagazinePrivateRegistryLoad_(); // schema-validated private recipes
  allowed.forEach(function(id){ngdVisualProviderPrivateQuote_(id,1);});
  return true;
 }catch(_){return false;}
}
function ngdVisualApiRoute_(action,token,payload,requestId){
 ngdVisualStagingGuard_();
 ngdVjAssert_(NGD_VISUAL_API_ACTIONS_.indexOf(action)>=0,'UNKNOWN_ACTION');
 ngdVjId_(requestId,'REQUEST');
 var auth=ngdVisualServerAuth_(),m=ngdVjSession_(auth,token);
 // Check auth before any media access or property-dependent runtime.
 var input=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
 if(action==='visualHealth')return {live:ngdVisualPublicMode_(),
  allowed_machines:ngdVisualPublicMode_()?ngdVisualActiveMachineIds_():[],
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
 if(action==='visualQuote'){
  if(ngdVisualPublicMode_())ngdVjAssert_(
   ngdVisualActiveMachineIds_().indexOf(input.machine_id)>=0,'MACHINE_NOT_ENABLED');
  return runtime.publicQuote(token,{machine_id:input.machine_id,count:input.count});
 }
 // All further API actions MUST be gated with dedicated Visual-only controls.
 ngdVjAssert_(ngdVisualPublicMode_(),'VISUAL_LIVE_DISABLED');
 if(action==='visualUploadStart')return ngdVisualChunkUpload_(auth).start(token,input);
 if(action==='visualUploadChunk')return ngdVisualChunkUpload_(auth).chunk(token,input);
 if(action==='visualUploadFinish')return ngdVisualChunkUpload_(auth).finish(token,input);
 if(action==='visualCreateJob'){
  ngdVjAssert_(ngdVisualActiveMachineIds_().indexOf(input.machine_id)>=0,
   'MACHINE_NOT_ENABLED');
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
 var runtime=ngdVisualRuntime_(auth).workerInternals(key);
 // Reconcile timeouts/refunds BEFORE deleting expired source images. A
 // disabled provider must not prevent pre-existing credits being returned.
 var jobs=runtime.jobs.expire(key);
 var files=runtime.jobs.cleanup(key);
 var chunks=ngdVisualUploadPurgeExpired_();
 return {expired_jobs:jobs.length,media:files,uploads:chunks};
}

/**
 * MANUAL OPERATOR ACTION. Run only from an authorized GAS STAGING editor,
 * never from doPost, after setting the exact one-time operator approval and
 * an existing ACTIVE member ID. Does not add real P0 tokens.
 */
function ngdVisualProvisionPilotWalletStaging(){
 ngdVisualStagingGuard_();
 var props=PropertiesService.getScriptProperties();
 ngdVjAssert_(props.getProperty('NGD_VISUAL_UAT_SEED_APPROVED')===
  'I_APPROVE_STAGING_VISUAL_TEST_CREDITS_ONLY','PILOT_APPROVAL_REQUIRED');
 // Pilot provisioning is only allowed before the Visual provider goes LIVE.
 ngdVjAssert_(props.getProperty('NGD_VISUAL_LIVE_ENABLED')!=='true'&&
  props.getProperty('NGD_VISUAL_CREDITS_ENABLED')!=='true','PILOT_MUST_BE_OFF');
 var id=props.getProperty('NGD_VISUAL_UAT_MEMBER_ID');
 ngdVjAssert_(typeof id==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(id),
  'PILOT_MEMBER_PROPERTY_REQUIRED');
 var user=byId_('members','member_id',id);
 ngdVjAssert_(user&&user.member_id===id&&user.status==='AKTIF',
  'PILOT_MEMBER_NOT_ACTIVE');
 // Fixed 12 demonstration credits: one 4-result Kontext job or test retries.
 // This does not use, alter or mirror the member token balance.
 return ngdVisualStoreDrive_().ledger.provisionPilotOnce(id,12);
}
function ngdVisualPilotWalletStatusStaging(){
 ngdVisualStagingGuard_();
 var props=PropertiesService.getScriptProperties();
 var id=props.getProperty('NGD_VISUAL_UAT_MEMBER_ID');
 ngdVjAssert_(typeof id==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(id),
  'PILOT_MEMBER_PROPERTY_REQUIRED');
 return ngdVisualStoreDrive_().ledger.balance(id);
}

/**
 * Optional explicit operator-only private-recipe bootstrap for STAGING.
 * Never invoked by doPost or by the webapp. Refuses to overwrite existing
 * private registry. Core category optics remain locked in VisualSkills.gs.
 */
function ngdVisualPreparePrivateRegistryStaging(){
 ngdVisualStagingGuard_();
 var props=PropertiesService.getScriptProperties();
 ngdVjAssert_(props.getProperty('NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED')===
  'I_APPROVE_STAGING_RECIPE_INSTALL_ONLY','REGISTRY_OPERATOR_APPROVAL_REQUIRED');
 ngdVjAssert_(props.getProperty('NGD_VISUAL_LIVE_ENABLED')!=='true',
  'REGISTRY_LIVE_MUST_BE_OFF');
 var key=NGD_FOOD_MAGAZINE_REGISTRY_KEY_;
 var existing=props.getProperty(key);
 if(existing){
  ngdFoodMagazinePrivateRegistryLoad_();
  return {ready:true,already_configured:true,overwritten:false};
 }
 var registry={
  version:'food-magazine-v2.2',
  role:'Commercial photographic retouch of the UPLOADED real product photo only.',
  preservation:'Preserve genuine product geometry, original ingredients, packaging, logo, and printed label; never invent items or words.',
  quality:'Plausible optics, texture, gravity, contact shadows, accurate real glass and liquid refraction.',
  negative:'No invented product, fake garnish, hallucinated characters, artificial labels, watermark or floating badges.'
 };
 var neutral={
  food_type:'Preserve the reference product type',
  cover_concept:'Optional composition preference only',
  camera_angle:'Optional camera angle subordinate to context physics',
  lighting:'Optional lighting mood subordinate to context physics',
  surface:'Optional supporting surface subordinate to context physics',
  grade:'Optional color grading without recoloring products',
  styling:'Only existing material and props, no fabricated items',
  lens:'Optional lens preference subordinate to context optics',
  format:'Frame composition to specified aspect ratio without distortion',
  similarity:'Preserve original product identity and proportions'
 };
 Object.keys(NGD_FOOD_MAGAZINE_IDS_).forEach(function(group){
  registry[group]={};
  NGD_FOOD_MAGAZINE_IDS_[group].forEach(function(id){
   registry[group][id]=ngdFoodPhotoLockedSkill_(group,id);
  });
 });
 var json=JSON.stringify(registry);
 ngdVjAssert_(json.length<=9000,'REGISTRY_TOO_LARGE');
 ngdFoodMagazinePrivateRegistry_(registry);
 props.setProperty(key,json);
 return {ready:true,already_configured:false,overwritten:false,
  registry_version:registry.version};
}

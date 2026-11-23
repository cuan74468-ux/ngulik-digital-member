/**
 * P1 Tool #1 — provider/media/job *contract only*.
 * No network, storage, payment, wallet or database side effects in this file.
 * Real adapters and credit transitions MUST be added only after P0 gate and
 * service-specific tests/reconciliation. A returned state is not persisted.
 */
var NGD_VISUAL_JOB_STATES_ = Object.freeze({
  CREATED:['RESERVED'],
  RESERVED:['PROCESSING','REFUNDED','RECONCILE_REQUIRED'],
  PROCESSING:['SETTLED','REFUNDED','RECONCILE_REQUIRED'],
  SETTLED:[],
  REFUNDED:[],
  RECONCILE_REQUIRED:[]
});
function ngdVisualTransitionAllowed_(current,next) {
  return Object.prototype.hasOwnProperty.call(NGD_VISUAL_JOB_STATES_,current)&&
    NGD_VISUAL_JOB_STATES_[current].indexOf(next)>=0;
}
function ngdVisualTransitionSpec_(job,next,externalReference) {
  ngdVisualRequire_(ngdVisualIsPlain_(job),'JOB_INVALID');
  ngdVisualRequire_(typeof job.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(job.request_id),'JOB_REQUEST_ID_INVALID');
  ngdVisualRequire_(ngdVisualTransitionAllowed_(job.status,next),'JOB_TRANSITION_FORBIDDEN');
  ngdVisualRequire_(typeof externalReference==='string'&&
    /^[A-Za-z0-9_-]{8,120}$/.test(externalReference),'JOB_EXTERNAL_REFERENCE_INVALID');
  // Immutable *transition proposal*. No ledger writes or side effects.
  return {request_id:job.request_id,from:job.status,to:next,
    external_reference:externalReference,requires_atomic_commit:true};
}
function ngdVisualProviderRequestSpec_(compiled,jobId) {
  ngdVisualRequire_(ngdVisualIsPlain_(compiled),'COMPILED_INVALID');
  ngdVisualRequire_(compiled.compiler_version===NGD_VISUAL_COMPILER_VERSION_,'COMPILED_VERSION_INVALID');
  ngdVisualRequire_(typeof jobId==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(jobId),'JOB_ID_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.media_contract)&&
    compiled.media_contract.storage_backend==='PRIVATE_MEDIA_ADAPTER',
    'MEDIA_CONTRACT_INVALID');
  return {
    job_id:jobId,
    job_mode:'ASYNC_MEDIA_REFERENCE',
    // Private backend must not serialize this object into a browser response.
    provider_input:{
      prompt:compiled.compiled_prompt,
      negative_lock:compiled.negative_prompt,
      adapter_profile:compiled.provider_adapter_profile,
      reference_asset_id:compiled.media_contract.reference_asset_id,
      target_dimensions:compiled.overlay_specification.canvas
    },
    provider_output_contract:{
      asset_handle:'opaque_private_reference',
      status:'PENDING_OR_COMPLETED',
      binary_in_google_sheets:false,
      frontend_receives_prompt:false
    }
  };
}


/**
 * P1 Stage 3: pure preflight for a PRIVATE media storage adapter.
 * The descriptor is obtained and authenticated server-side after upload;
 * NEVER use a raw descriptor from a browser as proof of asset ownership.
 * No direct URL, data URI, file bytes, external host or provider secret.
 */
function ngdVisualMediaManifest_(asset,memberId) {
  ngdVisualRequire_(typeof memberId==='string'&&
    /^M-[A-Za-z0-9_-]{3,64}$/.test(memberId),'MEMBER_ID_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(asset),'MEDIA_MANIFEST_MISSING');
  var required=['asset_id','owner_member_id','mime_type','bytes','width','height','sha256'];
  Object.keys(asset).forEach(function(k){
    ngdVisualRequire_(required.indexOf(k)>=0,'MEDIA_UNKNOWN_FIELD');
  });
  ngdVisualRequire_(typeof asset.asset_id==='string'&&
    /^asset_[A-Za-z0-9_-]{6,80}$/.test(asset.asset_id),'MEDIA_ASSET_ID_INVALID');
  ngdVisualRequire_(asset.owner_member_id===memberId,'MEDIA_OWNER_MISMATCH');
  ngdVisualRequire_(['image/jpeg','image/png','image/webp'].indexOf(asset.mime_type)>=0,
    'MEDIA_TYPE_INVALID');
  ngdVisualRequire_(Number.isSafeInteger(asset.bytes)&&asset.bytes>0&&
    asset.bytes<=8*1024*1024,'MEDIA_SIZE_INVALID');
  ngdVisualRequire_(Number.isSafeInteger(asset.width)&&asset.width>=256&&
    asset.width<=8192,'MEDIA_WIDTH_INVALID');
  ngdVisualRequire_(Number.isSafeInteger(asset.height)&&asset.height>=256&&
    asset.height<=8192,'MEDIA_HEIGHT_INVALID');
  ngdVisualRequire_(asset.width*asset.height<=20000000,'MEDIA_PIXELS_INVALID');
  ngdVisualRequire_(typeof asset.sha256==='string'&&
    /^[a-f0-9]{64}$/.test(asset.sha256),'MEDIA_HASH_INVALID');
  return {
    asset_id:asset.asset_id,owner_member_id:memberId,
    mime_type:asset.mime_type,bytes:asset.bytes,
    width:asset.width,height:asset.height,sha256:asset.sha256
  };
}

/**
 * PRIVATE job plan, not a browser response or persistent queue implementation.
 * The trusted auth context and server-verified media manifest are prerequisites.
 * A storage adapter must enforce member ownership and actual MIME/hash matching.
 */
function ngdVisualJobPlan_(compiled,authContext,mediaManifest) {
  ngdVisualRequire_(ngdVisualIsPlain_(compiled),'COMPILED_INVALID');
  ngdVisualRequire_(compiled.compiler_version===NGD_VISUAL_COMPILER_VERSION_,
    'COMPILED_VERSION_INVALID');
  ngdVisualRequire_(typeof compiled.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(compiled.request_id),
    'REQUEST_ID_REQUIRED');
  ngdVisualRequire_(ngdVisualIsPlain_(authContext),'AUTH_CONTEXT_REQUIRED');
  ngdVisualRequire_(authContext.role==='MEMBER'&&authContext.status==='AKTIF',
    'AUTH_MEMBER_REQUIRED');
  var memberId=authContext.member_id;
  ngdVisualRequire_(typeof memberId==='string'&&
    /^M-[A-Za-z0-9_-]{3,64}$/.test(memberId),'AUTH_MEMBER_ID_INVALID');
  var handle=compiled.media_contract&&compiled.media_contract.reference_asset_id;
  var media=null;
  if(handle){
    media=ngdVisualMediaManifest_(mediaManifest,memberId);
    ngdVisualRequire_(handle===media.asset_id,'MEDIA_HANDLE_MISMATCH');
  }else{
    ngdVisualRequire_(mediaManifest==null,'MEDIA_UNEXPECTED');
  }
  var provider=ngdVisualProviderRequestSpec_(compiled,compiled.request_id);
  return {
    request_id:compiled.request_id,
    member_id:memberId,
    initial_status:'CREATED',
    skill_version:compiled.skill_version,
    compiler_version:compiled.compiler_version,
    // Never persist raw photo bytes, or return private payload to browser.
    media:media,
    private_provider_request:provider,
    overlay_specification:compiled.overlay_specification,
    must_reserve_credit_before_dispatch:true,
    requires_persistent_idempotency:true,
    needs_storage_adapter:true,
    needs_queue_adapter:true,
    execution_enabled:false
  };
}

/**
 * Explicit client-safe projection. Never copy an untrusted full job object.
 * No prompt, negative prompt, raw media manifest, auth context, model/key,
 * provider arguments, or internal error details may reach this payload.
 */
function ngdVisualPublicJob_(job) {
  ngdVisualRequire_(ngdVisualIsPlain_(job),'PUBLIC_JOB_INVALID');
  var states=Object.keys(NGD_VISUAL_JOB_STATES_);
  ngdVisualRequire_(states.indexOf(job.status)>=0,'PUBLIC_JOB_STATUS_INVALID');
  ngdVisualRequire_(typeof job.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(job.request_id),
    'PUBLIC_JOB_REQUEST_ID_INVALID');
  var output={request_id:job.request_id,status:job.status};
  if(job.status==='SETTLED'){
    ngdVisualRequire_(typeof job.result_asset_id==='string'&&
      /^asset_[A-Za-z0-9_-]{6,80}$/.test(job.result_asset_id),
      'PUBLIC_RESULT_ASSET_INVALID');
    output.result_asset_id=job.result_asset_id;
  }
  if(job.status==='REFUNDED')output.message='Gagal diproses; saldo dikembalikan setelah verifikasi.';
  if(job.status==='RECONCILE_REQUIRED')output.message='Perlu pemeriksaan admin; jangan ulangi permintaan.';
  return output;
}

/** Forbidden blind retries after reservation / uncertain provider callbacks. */
function ngdVisualRetryAssessment_(jobStatus,providerOutcome) {
  ngdVisualRequire_(Object.prototype.hasOwnProperty.call(NGD_VISUAL_JOB_STATES_,jobStatus),
    'RETRY_STATE_INVALID');
  ngdVisualRequire_(['NOT_DISPATCHED','CONFIRMED_FAILED','UNKNOWN','SUCCESS'].indexOf(providerOutcome)>=0,
    'RETRY_OUTCOME_INVALID');
  if(jobStatus==='CREATED'&&providerOutcome==='NOT_DISPATCHED')
    return {retry_allowed:false,next_action:'RESERVE_FIRST'};
  if(jobStatus==='RESERVED'&&providerOutcome==='NOT_DISPATCHED')
    return {retry_allowed:false,next_action:'DISPATCH_ONCE_WITH_IDEMPOTENCY'};
  if(jobStatus==='PROCESSING'&&providerOutcome==='UNKNOWN')
    return {retry_allowed:false,next_action:'RECONCILE_PROVIDER_STATUS'};
  if((jobStatus==='RESERVED'||jobStatus==='PROCESSING')&&providerOutcome==='CONFIRMED_FAILED')
    return {retry_allowed:false,next_action:'REFUND_AFTER_LEDGER_CHECK'};
  return {retry_allowed:false,next_action:'NO_AUTOMATIC_RETRY'};
}

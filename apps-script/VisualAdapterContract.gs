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

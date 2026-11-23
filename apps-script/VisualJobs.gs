/**
 * P1 Tool #1 — asynchronous job envelope (pure, no side effects).
 * A future worker/queue must persist all state transitions atomically under
 * an idempotency key and re-check owner, budgets, reference validity, provider
 * and release gates before dispatch. No provider, Sheets or ledger APIs here.
 */
var NGD_VISUAL_JOB_CONTRACT_V2_='visual-async-job-v2';
function ngdVisualAsyncJobPlanV2_(privateRequest,auth,nowMs){
  var memberId=ngdVisualMediaMember_(auth);
  ngdVisualMediaTime_(nowMs);
  ngdVisualRequire_(ngdVisualIsPlain_(privateRequest)&&
    privateRequest.contract_version===NGD_VISUAL_PROVIDER_CONTRACT_V2_&&
    privateRequest.provider_mode==='NATIVE_IMAGE_TO_IMAGE'&&
    privateRequest.dispatch_authorized===false&&
    privateRequest.no_text_to_image_fallback===true,
    'V2_JOB_PROVIDER_CONTRACT_INVALID');
  ngdVisualRequire_(privateRequest.verified_owner_member_id===memberId,
    'V2_JOB_OWNER_MISMATCH');
  ngdVisualRequire_(typeof privateRequest.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(privateRequest.request_id),
    'V2_JOB_ID_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(privateRequest.queue_policy)&&
    privateRequest.queue_policy.durable_idempotency_required===true&&
    privateRequest.queue_policy.execution==='ASYNC_ONLY'&&
    privateRequest.queue_policy.never_blindly_retry===true,
    'V2_JOB_QUEUE_POLICY_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(privateRequest.output_policy)&&
    privateRequest.output_policy.storage==='PRIVATE_ONLY'&&
    privateRequest.output_policy.require_image_qa_before_release===true,
    'V2_JOB_OUTPUT_POLICY_INVALID');
  var mediaId=ngdVisualMediaAssetId_(privateRequest.reference_asset_id);
  return {
    contract_version:NGD_VISUAL_JOB_CONTRACT_V2_,
    job_id:privateRequest.request_id,
    member_id:memberId,
    reference_asset_id:mediaId,
    created_at_ms:nowMs,
    initial_state:'CREATED',
    estimated_cost_id:null, // pricing must be resolved by trusted backend
    needs_server_price_quote:true,
    requires_atomic_durable_queue:true,
    requires_idempotent_reservation:true,
    requires_atomic_dispatch_claim:true,
    requires_private_result_storage:true,
    requires_visual_quality_gate:true,
    requires_member_owner_check_on_every_read:true,
    provider_status_on_unknown:'RECONCILE_REQUIRED',
    retry_policy:'NEVER_BLINDLY_REDISPATCH',
    execution_enabled:false,
    changes_p0_finance:false
  };
}
/**
 * PUBLIC projection from a *trusted durable job row*, not from the browser.
 * Caller must verify member ownership server-side on every read.
 * Never expose prompt, secrets, provider IDs, raw input/output URLs,
 * storage hashes, amount or internal error details.
 */
function ngdVisualAsyncPublicStatusV2_(trustedJob,auth){
  var memberId=ngdVisualMediaMember_(auth);
  ngdVisualRequire_(ngdVisualIsPlain_(trustedJob)&&
    trustedJob.owner_member_id===memberId,'V2_JOB_READ_DENIED');
  var id=trustedJob.job_id;
  ngdVisualRequire_(typeof id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(id),'V2_JOB_READ_ID_INVALID');
  var allowed=['CREATED','RESERVED','PROCESSING','SETTLED',
    'REFUNDED','RECONCILE_REQUIRED'];
  ngdVisualRequire_(allowed.indexOf(trustedJob.status)>=0,
    'V2_JOB_READ_STATUS_INVALID');
  var response={job_id:id,status:trustedJob.status};
  if(trustedJob.status==='SETTLED'){
    ngdVisualRequire_(trustedJob.quality_gate_passed===true,
      'V2_JOB_QUALITY_NOT_PASSED');
    response.result_asset_id=ngdVisualMediaAssetId_(trustedJob.result_asset_id);
  }
  if(trustedJob.status==='RECONCILE_REQUIRED')
    response.message='Pekerjaan memerlukan pemeriksaan. Jangan ulangi pembayaran.';
  if(trustedJob.status==='REFUNDED')
    response.message='Pekerjaan gagal; pengembalian kredit terverifikasi.';
  return response;
}
/**
 * Server-only async worker preconditions; always returns a plan, not
 * permission to dispatch. The real implementation must use a durable
 * compare-and-swap dispatch claim and verify actual ledger reservation.
 */
function ngdVisualDispatchPreflightV2_(job,flags){
  ngdVisualRequire_(ngdVisualIsPlain_(job)&&
    job.contract_version===NGD_VISUAL_JOB_CONTRACT_V2_,
    'V2_DISPATCH_JOB_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(flags),'V2_DISPATCH_FLAGS_INVALID');
  var gates=['mutations_enabled','finance_enabled','provider_enabled',
    'budget_cap_authorized','private_media_ready','queue_ready',
    'durable_reservation_verified','atomic_dispatch_claim_available'];
  gates.forEach(function(k){
    ngdVisualRequire_(typeof flags[k]==='boolean','V2_DISPATCH_GATE_'+k.toUpperCase()+'_INVALID');
  });
  var missing=gates.filter(function(k){return flags[k]!==true;});
  return {
    job_id:job.job_id,ready_for_operator_review:missing.length===0,
    missing_gates:missing,
    // Never allow P1 contracts to bypass actual P0 authorization.
    dispatch_executed:false,
    dispatch_authorized:false
  };
}

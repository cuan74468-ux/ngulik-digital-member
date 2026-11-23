/**
 * P1 Tool #1 — Private media storage / retention contract.
 *
 * IMPORTANT: This module is a PURE contract. It does not create a bucket,
 * upload bytes or grant public access. The later private storage worker must:
 *  - authenticate owner using trusted server auth (not client-provided member ID)
 *  - mint one-time short-lived upload grants scoped to one asset/owner/type/size
 *  - verify REAL binary MIME/magic, bytes, dimensions and SHA-256 server-side
 *  - keep objects private, encrypted at rest, no public ACL/listing
 *  - maintain immutable owned metadata and idempotent retention/cleanup
 *  - resolve opaque IDs from backend only; never download user-supplied URLs
 *
 * GitHub Pages cannot privately store files. Google Sheets must NOT hold binary.
 * No doGet/doPost/DriveApp/UrlFetchApp/Script Properties/database mutations here.
 */
var NGD_VISUAL_MEDIA_POLICY_V1_=Object.freeze({
  contract_version:'visual-private-media-v1',
  max_source_bytes:8*1024*1024,
  max_source_pixels:20000000,
  min_dimension:256,
  max_dimension:8192,
  allowed_mime:['image/jpeg','image/png','image/webp'],
  upload_intent_ttl_seconds:300,
  source_retention_days:7,
  output_retention_days:30,
  cleanup_batch_max:100,
  backend_only:true
});
function ngdVisualMediaMember_(auth){
  ngdVisualRequire_(ngdVisualIsPlain_(auth)&&
    auth.role==='MEMBER'&&auth.status==='AKTIF'&&
    typeof auth.member_id==='string'&&
    /^M-[A-Za-z0-9_-]{3,64}$/.test(auth.member_id),
    'PRIVATE_MEDIA_AUTH_REQUIRED');
  return auth.member_id;
}
function ngdVisualMediaAssetId_(id){
  ngdVisualRequire_(typeof id==='string'&&
    /^asset_[A-Za-z0-9_-]{6,80}$/.test(id),
    'PRIVATE_MEDIA_ASSET_ID_INVALID');
  return id;
}
function ngdVisualMediaTime_(ms){
  ngdVisualRequire_(typeof ms==='number'&&Number.isSafeInteger(ms)&&
    ms>=1600000000000&&ms<=4102444800000,'PRIVATE_MEDIA_TIME_INVALID');
  return ms;
}
/**
 * Preflight for upload intent. Declared metadata is NOT verified bytes.
 * The future storagePort must generate the opaque ID + token itself and
 * atomically enforce size/identity on receipt. This function grants nothing.
 */
function ngdVisualMediaUploadIntentSpec_(auth,declared,nowMs){
  var memberId=ngdVisualMediaMember_(auth);
  ngdVisualMediaTime_(nowMs);
  ngdVisualRequire_(ngdVisualIsPlain_(declared),'PRIVATE_MEDIA_DECLARED_INVALID');
  ngdVisualRequire_(Object.keys(declared).every(function(k){
    return ['mime_type','bytes'].indexOf(k)>=0;
  }),'PRIVATE_MEDIA_DECLARED_UNKNOWN_FIELD');
  ngdVisualRequire_(NGD_VISUAL_MEDIA_POLICY_V1_.allowed_mime.indexOf(declared.mime_type)>=0,
    'PRIVATE_MEDIA_DECLARED_TYPE_INVALID');
  ngdVisualRequire_(Number.isSafeInteger(declared.bytes)&&declared.bytes>0&&
    declared.bytes<=NGD_VISUAL_MEDIA_POLICY_V1_.max_source_bytes,
    'PRIVATE_MEDIA_DECLARED_SIZE_INVALID');
  return {
    contract_version:NGD_VISUAL_MEDIA_POLICY_V1_.contract_version,
    owner_member_id:memberId,
    media_kind:'SOURCE_REFERENCE',
    mime_type:declared.mime_type,
    maximum_bytes:declared.bytes,
    issued_at_ms:nowMs,
    expires_at_ms:nowMs+NGD_VISUAL_MEDIA_POLICY_V1_.upload_intent_ttl_seconds*1000,
    requires_one_time_server_signed_grant:true,
    requires_atomic_commit:true,
    // A private upload endpoint must be bound to member/session/object scope.
    public_url:null,
    grants_access:false
  };
}
/**
 * Resolves object ONLY via a private media adapter. Storage worker must
 * attest binary hash, MIME magic and dimensions before returning metadata;
 * generic browser-uploaded manifests can NEVER serve as trusted data.
 */
function ngdVisualResolvePrivateReference_(auth,assetId,mediaPort,nowMs){
  var memberId=ngdVisualMediaMember_(auth);
  ngdVisualMediaAssetId_(assetId);
  ngdVisualMediaTime_(nowMs);
  ngdVisualRequire_(mediaPort&&
    typeof mediaPort.inspectVerifiedPrivateObject==='function',
    'PRIVATE_MEDIA_ADAPTER_MISSING');
  var record=mediaPort.inspectVerifiedPrivateObject({
    asset_id:assetId,member_id:memberId,require_kind:'SOURCE_REFERENCE'
  });
  ngdVisualRequire_(ngdVisualIsPlain_(record),'PRIVATE_MEDIA_RECORD_INVALID');
  var mandatory=['asset_id','owner_member_id','mime_type','bytes','width',
    'height','sha256','kind','privacy','verified_binary','expires_at_ms'];
  Object.keys(record).forEach(function(k){
    ngdVisualRequire_(mandatory.indexOf(k)>=0,'PRIVATE_MEDIA_RECORD_EXTRA_FIELD');
  });
  ngdVisualRequire_(record.kind==='SOURCE_REFERENCE'&&
    record.privacy==='PRIVATE'&&record.verified_binary===true,
    'PRIVATE_MEDIA_BINARY_NOT_VERIFIED');
  ngdVisualRequire_(record.asset_id===assetId&&
    record.owner_member_id===memberId,'PRIVATE_MEDIA_ACCESS_DENIED');
  ngdVisualMediaTime_(record.expires_at_ms);
  ngdVisualRequire_(record.expires_at_ms>nowMs,'PRIVATE_MEDIA_REFERENCE_EXPIRED');
  // Reuse existing structural validator after PRIVATE source attestation.
  var manifest=ngdVisualMediaManifest_(record,memberId);
  return {
    contract_version:NGD_VISUAL_MEDIA_POLICY_V1_.contract_version,
    asset_id:manifest.asset_id,
    owner_member_id:manifest.owner_member_id,
    sha256:manifest.sha256,
    mime_type:manifest.mime_type,
    bytes:manifest.bytes,
    width:manifest.width,
    height:manifest.height,
    expires_at_ms:record.expires_at_ms,
    storage_privacy:'PRIVATE',
    verified_binary:true,
    capability:'SERVER_SIDE_REFERENCE_ONLY'
  };
}
/**
 * Idempotent batch cleanup *plan*, for a trusted worker-owned inventory.
 * Worker must query current durable active job leases before DELETE; never
 * accept the browser's list of "active" IDs as authority.
 */
function ngdVisualPrivateCleanupPlan_(inventory,nowMs){
  ngdVisualMediaTime_(nowMs);
  ngdVisualRequire_(Array.isArray(inventory)&&
    inventory.length<=NGD_VISUAL_MEDIA_POLICY_V1_.cleanup_batch_max,
    'PRIVATE_MEDIA_CLEANUP_BATCH_INVALID');
  var seen={},deleteIds=[],skipped=[];
  inventory.forEach(function(item){
    ngdVisualRequire_(ngdVisualIsPlain_(item),'PRIVATE_MEDIA_CLEANUP_RECORD_INVALID');
    var id=ngdVisualMediaAssetId_(item.asset_id);
    ngdVisualRequire_(!seen[id],'PRIVATE_MEDIA_CLEANUP_DUPLICATE');
    seen[id]=true;
    ngdVisualRequire_(['SOURCE_REFERENCE','GENERATED_OUTPUT'].indexOf(item.kind)>=0&&
      item.privacy==='PRIVATE'&&typeof item.has_active_job_lease==='boolean'&&
      item.trusted_inventory===true,'PRIVATE_MEDIA_CLEANUP_UNTRUSTED');
    var created=ngdVisualMediaTime_(item.created_at_ms);
    ngdVisualRequire_(created<=nowMs,'PRIVATE_MEDIA_CLEANUP_FUTURE');
    var days=item.kind==='SOURCE_REFERENCE'?
      NGD_VISUAL_MEDIA_POLICY_V1_.source_retention_days:
      NGD_VISUAL_MEDIA_POLICY_V1_.output_retention_days;
    var expired=created+days*86400000<=nowMs;
    if(expired&&!item.has_active_job_lease)deleteIds.push(id);
    else skipped.push({asset_id:id,reason:item.has_active_job_lease?
      'ACTIVE_JOB_LEASE':'RETENTION_NOT_EXPIRED'});
  });
  return {policy_version:NGD_VISUAL_MEDIA_POLICY_V1_.contract_version,
    candidates_to_delete:deleteIds,skipped:skipped,
    requires_server_side_lease_recheck:true,
    requires_idempotent_delete:true,
    delete_executed:false};
}

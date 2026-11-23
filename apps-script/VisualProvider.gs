/**
 * P1 Tool #1 — Native Img2Img / multimodal image-editing provider contract.
 * No API is contacted, keys are never read, and no job is executed here.
 * This module MUST NOT be exposed to a browser-facing GAS function.
 *
 * Provider integration must accept a SERVER-RESOLVED private reference image,
 * respect identity/labels, support genuine reconstruction + relighting,
 * use async submit/poll/webhook and store outputs to private object storage.
 * If not supported, FAIL CLOSED. No text-to-image fallback for Tool #1.
 */
var NGD_VISUAL_PROVIDER_CONTRACT_V2_='visual-native-img2img-provider-v2';
function ngdVisualProviderCapabilitiesV2_(providerPort,qualityTier){
  ngdVisualRequire_(providerPort&&
    typeof providerPort.describeNativeEditor==='function',
    'V2_PROVIDER_ADAPTER_MISSING');
  var c=providerPort.describeNativeEditor();
  ngdVisualRequire_(ngdVisualIsPlain_(c),'V2_PROVIDER_CAPABILITIES_INVALID');
  ngdVisualRequire_(typeof c.provider_id==='string'&&
    /^[a-z][a-z0-9_-]{1,48}$/.test(c.provider_id),
    'V2_PROVIDER_ID_INVALID');
  ngdVisualRequire_(typeof c.model_version==='string'&&
    /^[A-Za-z0-9._-]{3,100}$/.test(c.model_version),
    'V2_PROVIDER_MODEL_INVALID');
  ngdVisualRequire_(c.mode==='NATIVE_IMAGE_TO_IMAGE'&&
    c.supports_reference_image===true&&
    c.supports_scene_reconstruction===true&&
    c.supports_relighting===true&&
    c.supports_async_jobs===true&&
    c.returns_private_asset===true&&
    c.supports_text_to_image_fallback===false,
    'V2_PROVIDER_NATIVE_CAPABILITIES_MISSING');
  ngdVisualRequire_(Array.isArray(c.quality_tiers)&&
    c.quality_tiers.indexOf(qualityTier)>=0,
    'V2_PROVIDER_QUALITY_UNSUPPORTED');
  ngdVisualRequire_(Number.isSafeInteger(c.max_input_bytes)&&
    c.max_input_bytes>0&&c.max_input_bytes<=8*1024*1024,
    'V2_PROVIDER_INPUT_LIMIT_INVALID');
  ngdVisualRequire_(Number.isSafeInteger(c.max_output_pixels)&&
    c.max_output_pixels>=256*256&&c.max_output_pixels<=64000000,
    'V2_PROVIDER_OUTPUT_LIMIT_INVALID');
  return {
    provider_id:c.provider_id,model_version:c.model_version,
    max_input_bytes:c.max_input_bytes,max_output_pixels:c.max_output_pixels,
    supported_quality_tier:qualityTier,mode:'NATIVE_IMAGE_TO_IMAGE',
    asynchronous:true
  };
}
/**
 * Builds a BACKEND-ONLY provider envelope from compiled V2 skill and
 * independently verified private media reference. Never accepts user URL.
 * Storage worker will exchange the opaque handle for provider-compatible
 * binary/reference through a dedicated time-limited backend capability.
 * Do not return this object as a public API response.
 */
function ngdVisualProviderPrepareV2_(compiled,auth,mediaPort,providerPort,nowMs){
  ngdVisualRequire_(ngdVisualIsPlain_(compiled)&&
    compiled.contract_version==='visual-img2img-v2'&&
    compiled.image_generation_mode==='IMAGE_TO_IMAGE_REQUIRED'&&
    compiled.release_authorized===false,
    'V2_COMPILED_CONTRACT_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.option_ids)&&
    NGD_VISUAL_V2_OPTIONS_.quality_tier.indexOf(
      compiled.option_ids.quality_tier)>=0,
    'V2_OPTIONS_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.media_contract)&&
    compiled.media_contract.requires_image_conditioning===true&&
    compiled.media_contract.no_text_to_image_fallback===true,
    'V2_IMAGE_REFERENCE_REQUIRED');
  ngdVisualRequire_(typeof compiled.compiled_prompt==='string'&&
    compiled.compiled_prompt.length>=10&&compiled.compiled_prompt.length<=16000,
    'V2_PROMPT_INVALID');
  ngdVisualRequire_(typeof compiled.negative_prompt==='string'&&
    compiled.negative_prompt.length>=3&&compiled.negative_prompt.length<=8000,
    'V2_NEGATIVE_LOCK_INVALID');
  ngdVisualRequire_(typeof compiled.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(compiled.request_id),
    'V2_JOB_REQUEST_ID_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.overlay_specification)&&
    ngdVisualIsPlain_(compiled.overlay_specification.canvas),
    'V2_OUTPUT_CANVAS_INVALID');
  var dims=compiled.overlay_specification.canvas;
  ngdVisualRequire_(Number.isSafeInteger(dims.width)&&dims.width>=256&&
    Number.isSafeInteger(dims.height)&&dims.height>=256&&
    dims.width*dims.height<=64000000,
    'V2_OUTPUT_DIMENSIONS_INVALID');
  var handle=ngdVisualMediaAssetId_(compiled.media_contract.reference_asset_id);
  var media=ngdVisualResolvePrivateReference_(auth,handle,mediaPort,nowMs);
  var caps=ngdVisualProviderCapabilitiesV2_(providerPort,compiled.option_ids.quality_tier);
  ngdVisualRequire_(media.bytes<=caps.max_input_bytes&&
    dims.width*dims.height<=caps.max_output_pixels,
    'V2_PROVIDER_MEDIA_LIMIT_EXCEEDED');
  return {
    contract_version:NGD_VISUAL_PROVIDER_CONTRACT_V2_,
    request_id:compiled.request_id,
    reference_asset_id:media.asset_id,
    reference_sha256:media.sha256,
    verified_owner_member_id:media.owner_member_id,
    provider_id:caps.provider_id,model_version:caps.model_version,
    provider_mode:'NATIVE_IMAGE_TO_IMAGE',
    native_image_conditioning_required:true,
    no_text_to_image_fallback:true,
    prompt:compiled.compiled_prompt,
    negative_lock:compiled.negative_prompt,
    target_dimensions:{width:dims.width,height:dims.height},
    quality_tier:compiled.option_ids.quality_tier,
    output_policy:{storage:'PRIVATE_ONLY',
      result_reference:'OPAQUE_ASSET_ID',
      require_image_qa_before_release:true,
      source_retention_days:NGD_VISUAL_MEDIA_POLICY_V1_.source_retention_days,
      result_retention_days:NGD_VISUAL_MEDIA_POLICY_V1_.output_retention_days},
    queue_policy:{execution:'ASYNC_ONLY',
      no_inline_gas_wait:true,
      durable_idempotency_required:true,
      provider_unknown_outcome:'RECONCILE_REQUIRED',
      never_blindly_retry:true},
    dispatch_authorized:false,
    provider_called:false
  };
}
function ngdVisualProviderPollResultV2_(result){
  ngdVisualRequire_(ngdVisualIsPlain_(result),
    'V2_RESULT_INVALID');
  ngdVisualRequire_(typeof result.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(result.request_id),
    'V2_RESULT_JOB_INVALID');
  ngdVisualRequire_(typeof result.provider_status==='string',
    'V2_RESULT_STATUS_INVALID');
  if(result.provider_status==='READY'){
    ngdVisualRequire_(typeof result.private_output_asset_id==='string'&&
      /^asset_[A-Za-z0-9_-]{6,80}$/.test(result.private_output_asset_id)&&
      result.private_output_verified===true,
      'V2_RESULT_ASSET_NOT_VERIFIED');
    return {request_id:result.request_id,status:'READY_FOR_QUALITY_GATE',
      private_output_asset_id:result.private_output_asset_id,
      requires_quality_gate:true,settled:false};
  }
  if(result.provider_status==='CONFIRMED_FAILED'){
    return {request_id:result.request_id,status:'CONFIRMED_FAILED',
      requires_ledger_check_before_refund:true,settled:false};
  }
  if(result.provider_status==='PENDING'){
    return {request_id:result.request_id,status:'PENDING',
      requires_polling:true,settled:false};
  }
  // Malformed, unknown or partial responses cannot be treated as success.
  return {request_id:result.request_id,status:'RECONCILE_REQUIRED',
    auto_retry_allowed:false,settled:false};
}

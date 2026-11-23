/**
 * P1 Tool #1 — BFL FLUX.2 Pro pilot adapter (not exposed as a GAS API action).
 * Official protocol: POST https://api.bfl.ai/v1/flux-2-pro -> polling_url,
 * then GET returned /v1/get_result URL until Ready or terminal failure.
 *
 * No deployment or provider calls are made by committing this source.
 * Network execution requires: both EXISTING system switches ON, authenticated
 * trusted caller, completed durable reservation, and an atomic dispatch claim.
 * No unverified reference photos: image-to-image MUST use a separately
 * validated provider/media adapter. This pilot is text-to-image only.
 */
var NGD_VISUAL_BFL_ENDPOINT_='https://api.bfl.ai/v1/flux-2-pro';
function ngdVisualBflCheckPollUrl_(url) {
  ngdVisualRequire_(typeof url==='string'&&url.length<1024,
    'BFL_POLL_URL_INVALID');
  // No redirects, injected credentials, fragments or alternate hosts.
  ngdVisualRequire_(/^https:\/\/api\.bfl\.ai\/v1\/get_result\?[A-Za-z0-9_=&%-]+$/.test(url),
    'BFL_POLL_URL_UNTRUSTED');
  return url;
}
function ngdVisualBflPlan_(compiled) {
  ngdVisualRequire_(ngdVisualIsPlain_(compiled),'BFL_COMPILED_INVALID');
  ngdVisualRequire_(compiled.compiler_version===NGD_VISUAL_COMPILER_VERSION_,
    'BFL_COMPILER_VERSION_INVALID');
  ngdVisualRequire_(typeof compiled.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(compiled.request_id),
    'BFL_REQUEST_ID_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.media_contract)&&
    compiled.media_contract.reference_asset_id==='',
    'BFL_IMAGE_REFERENCE_UNSUPPORTED');
  ngdVisualRequire_(ngdVisualIsPlain_(compiled.overlay_specification)&&
    ngdVisualIsPlain_(compiled.overlay_specification.canvas),'BFL_CANVAS_INVALID');
  var dims=compiled.overlay_specification.canvas;
  ngdVisualRequire_(Number.isSafeInteger(dims.width)&&dims.width>=256&&dims.width<=2048&&
    Number.isSafeInteger(dims.height)&&dims.height>=256&&dims.height<=2048,
    'BFL_DIMENSIONS_UNSUPPORTED');
  ngdVisualRequire_(typeof compiled.compiled_prompt==='string'&&
    compiled.compiled_prompt.length>=10&&compiled.compiled_prompt.length<=12000,
    'BFL_PROMPT_INVALID');
  ngdVisualRequire_(typeof compiled.negative_prompt==='string'&&
    compiled.negative_prompt.length<=6000,'BFL_NEGATIVE_INVALID');
  // BFL model uses positive prompt; negative lock is appended as explicit
  // constraints because this endpoint does not expose a separate negative field
  // in the official quickstart protocol.
  var prompt=compiled.compiled_prompt+
    '\n\nStrict exclusions: '+compiled.negative_prompt;
  // Dimensions rounded to model-safe multiples of 16; final compositor will
  // resample/crop using original canvas dimensions after quality evaluation.
  var width=Math.round(dims.width/16)*16;
  var height=Math.round(dims.height/16)*16;
  return {
    provider:'BFL',model:'flux-2-pro',request_id:compiled.request_id,
    endpoint:NGD_VISUAL_BFL_ENDPOINT_,
    payload:{prompt:prompt,width:width,height:height},
    target_canvas:{width:dims.width,height:dims.height},
    requires_durable_reservation:true,
    requires_atomic_dispatch_claim:true,
    execution_enabled:false
  };
}
function ngdVisualBflParseSubmit_(response) {
  ngdVisualRequire_(ngdVisualIsPlain_(response),'BFL_SUBMIT_RESPONSE_INVALID');
  var url=ngdVisualBflCheckPollUrl_(response.polling_url);
  return {provider_status:'PENDING',polling_url:url};
}
function ngdVisualBflParsePoll_(response) {
  ngdVisualRequire_(ngdVisualIsPlain_(response),'BFL_POLL_RESPONSE_INVALID');
  var status=response.status;
  if(status==='Ready'){
    ngdVisualRequire_(ngdVisualIsPlain_(response.result)&&
      typeof response.result.sample==='string'&&
      /^https:\/\//.test(response.result.sample)&&
      response.result.sample.length<=4096,'BFL_RESULT_REFERENCE_INVALID');
    // Signed URL is PRIVATE and short-lived. Never send it to the browser.
    return {provider_status:'READY',private_result_url:response.result.sample,
      must_copy_to_private_storage:true};
  }
  if(['Error','Failed','Request Moderated','Content Moderated'].indexOf(status)>=0)
    return {provider_status:'FAILED',failure_code:'PROVIDER_'+String(status).replace(/[^A-Za-z]/g,'_').toUpperCase()};
  if(['Pending','Processing','Queued','Running','Task not found'].indexOf(status)>=0)
    return {provider_status:'PENDING'};
  return {provider_status:'RECONCILE_REQUIRED'};
}
function ngdVisualBflRealExecutionAllowed_() {
  ngdVisualRequire_(typeof PropertiesService!=='undefined',
    'BFL_PRIVATE_PROPERTIES_REQUIRED');
  var properties=PropertiesService.getScriptProperties();
  ngdVisualRequire_(properties.getProperty('NGD_MUTATIONS_ENABLED')==='true'&&
    properties.getProperty('NGD_FINANCE_ENABLED')==='true',
    'BFL_SYSTEM_GATE_CLOSED');
  return properties;
}
function ngdVisualBflHttp_(method,url,payload,key) {
  ngdVisualRequire_(typeof UrlFetchApp!=='undefined','BFL_HTTP_UNAVAILABLE');
  ngdVisualRequire_(method==='POST'||method==='GET','BFL_METHOD_INVALID');
  if(method==='POST')ngdVisualRequire_(url===NGD_VISUAL_BFL_ENDPOINT_,
    'BFL_ENDPOINT_NOT_ALLOWED');
  else ngdVisualBflCheckPollUrl_(url);
  ngdVisualRequire_(typeof key==='string'&&key.length>=12&&key.length<=512,
    'BFL_KEY_NOT_CONFIGURED');
  var options={method:method.toLowerCase(),muteHttpExceptions:true,
    followRedirects:false,headers:{accept:'application/json','x-key':key}};
  if(method==='POST'){
    options.contentType='application/json';
    options.payload=JSON.stringify(payload);
  }
  var response=UrlFetchApp.fetch(url,options);
  var code=response.getResponseCode();
  ngdVisualRequire_(code>=200&&code<300,'BFL_HTTP_FAILED');
  var body=response.getContentText();
  ngdVisualRequire_(body.length<120000,'BFL_RESPONSE_TOO_LARGE');
  try {return JSON.parse(body);}catch(_) {
    throw new Error('VISUAL_BFL_JSON_INVALID');
  }
}
/**
 * Trusted backend-internal dispatch ONLY. ledgerPort must implement durable,
 * atomic claimForDispatch and recordSubmitted/recordUncertain actions. A
 * claim is consumed BEFORE network to prevent duplicate spending on retry.
 *
 * This does not run under the current app because no authenticated endpoint,
 * ledger port, or live key is wired to it.
 */
function ngdVisualBflSubmit_(compiled,auth,ledgerPort) {
  var plan=ngdVisualBflPlan_(compiled);
  ngdVisualRequire_(ngdVisualIsPlain_(auth)&&auth.role==='MEMBER'&&
    auth.status==='AKTIF'&&typeof auth.member_id==='string',
    'BFL_MEMBER_AUTH_REQUIRED');
  ngdVisualRequire_(ledgerPort&&typeof ledgerPort.claimForDispatch==='function'&&
    typeof ledgerPort.recordSubmitted==='function'&&
    typeof ledgerPort.recordUncertain==='function',
    'BFL_DURABLE_LEDGER_REQUIRED');
  var props=ngdVisualBflRealExecutionAllowed_();
  var key=props.getProperty('BFL_API_KEY');
  ngdVisualRequire_(typeof key==='string'&&key.length>=12,'BFL_KEY_NOT_CONFIGURED');
  var claim=ledgerPort.claimForDispatch({
    request_id:plan.request_id,member_id:auth.member_id,provider:'BFL',
    expected_state:'RESERVED',maximum_dispatches:1
  });
  ngdVisualRequire_(claim===true,'BFL_DISPATCH_NOT_CLAIMED');
  try {
    var submitted=ngdVisualBflParseSubmit_(
      ngdVisualBflHttp_('POST',plan.endpoint,plan.payload,key));
    ledgerPort.recordSubmitted(plan.request_id,submitted.polling_url);
    return {request_id:plan.request_id,status:'PROCESSING'};
  } catch(_) {
    // A network timeout may have charged the provider: never auto-retry.
    ledgerPort.recordUncertain(plan.request_id,'BFL_SUBMIT_UNCERTAIN');
    return {request_id:plan.request_id,status:'RECONCILE_REQUIRED'};
  }
}
/** Poll requires a previously stored trusted provider URL; never user input. */
function ngdVisualBflPoll_(url) {
  var props=ngdVisualBflRealExecutionAllowed_();
  ngdVisualBflCheckPollUrl_(url);
  var key=props.getProperty('BFL_API_KEY');
  return ngdVisualBflParsePoll_(ngdVisualBflHttp_('GET',url,null,key));
}

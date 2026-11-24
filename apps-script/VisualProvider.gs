/**
 * P1 Stage 4 provider boundary. No API keys, HTTP calls, webhooks or
 * production dispatch in this file. An authorized isolated worker supplies
 * transport and secrets. Reference bytes come ONLY from owned private media.
 *
 * BFL endpoints: https://github.com/black-forest-labs/skills/blob/master/skills/bfl-api/references/endpoints.md
 * Google Gemini: https://ai.google.dev/gemini-api/docs/image-generation
 */
var NGD_VISUAL_PROVIDER_ROUTES_=Object.freeze({
 standard:['flux_kontext_pro','gemini_flash_image'],
 hd:['flux2_pro']
});
var NGD_VISUAL_PROVIDER_ENDPOINTS_=Object.freeze({
 flux_kontext_pro:'https://api.bfl.ai/v1/flux-kontext',
 flux2_pro:'https://api.bfl.ai/v1/flux-2-pro',
 gemini_flash_image:'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent'
});
function ngdVpRequire_(ok,code){if(!ok)throw Error('VISUAL_PROVIDER_'+code);}
function ngdVpAllowed_(provider,tier){
 return Object.prototype.hasOwnProperty.call(NGD_VISUAL_PROVIDER_ENDPOINTS_,provider)&&
  NGD_VISUAL_PROVIDER_ROUTES_[tier]&&NGD_VISUAL_PROVIDER_ROUTES_[tier].indexOf(provider)>=0;
}
function ngdVpPrepare_(input){
 ngdVpRequire_(input&&ngdVpAllowed_(input.provider,input.tier),'TIER_PROVIDER_MISMATCH');
 var compiled=input.compiled;
 ngdVpRequire_(compiled&&compiled.image_generation_mode==='IMAGE_TO_IMAGE_REQUIRED'&&
  compiled.contract_version==='visual-food-magazine-img2img-v2'&&
  compiled.layer_trace&&compiled.layer_trace.length===12,'COMPILER_REQUIRED');
 ngdVpRequire_(compiled.compiled_prompt.indexOf('Do NOT render any text, letters, numbers')>=0,
  'TYPOGRAPHY_GUARD');
 ngdVpRequire_(typeof input.image_base64==='string'&&
  input.image_base64.length>100&&/^[A-Za-z0-9+/]+={0,2}$/.test(input.image_base64),
  'PRIVATE_REFERENCE_REQUIRED');
 ngdVpRequire_(['image/png','image/jpeg','image/webp'].indexOf(input.mime)>=0,'IMAGE_MIME_INVALID');
 var prompt=compiled.compiled_prompt+'\n\nExclusions: '+compiled.negative_prompt;
 if(input.provider==='gemini_flash_image'){
  return {provider:input.provider,url:NGD_VISUAL_PROVIDER_ENDPOINTS_.gemini_flash_image,
   method:'POST',auth_scheme:'x-goog-api-key',
   body:{contents:[{role:'user',parts:[{text:prompt},
    {inlineData:{mimeType:input.mime,data:input.image_base64}}]}],
    generationConfig:{responseModalities:['IMAGE']}},
   asynchronous:false};
 }
 return {provider:input.provider,url:NGD_VISUAL_PROVIDER_ENDPOINTS_[input.provider],
  method:'POST',auth_scheme:'x-key',
  body:{prompt:prompt,input_image:input.image_base64,output_format:'png'},
  asynchronous:true};
}
function ngdVpAdapter_(dependencies){
 var d=dependencies||{};
 ngdVpRequire_(d.transport&&d.secrets&&d.config&&d.store,'DEPENDENCIES_REQUIRED');
 function enabled(){
  ngdVpRequire_(d.config.NGD_VISUAL_LIVE_ENABLED===true,'LIVE_DISABLED');
  ngdVpRequire_(d.config.NGD_VISUAL_CREDITS_ENABLED===true&&
   d.config.NGD_VISUAL_MEDIA_READY===true&&
   d.config.NGD_VISUAL_WORKER_READY===true,'VISUAL_INFRA_NOT_AUTHORIZED');
 }
 function submit(context){
  enabled();
  // Called by private queue worker, never by browser or synchronous GAS route.
  ngdVpRequire_(context&&context.job&&context.job.status==='PROCESSING','WORKER_JOB_REQUIRED');
  ngdVpRequire_(context.job.owner===context.member,'MEMBER_MISMATCH');
  ngdVpRequire_(context.asset&&context.asset.private===true&&
   context.asset.owner===context.member,'OWNED_ASSET_REQUIRED');
  ngdVpRequire_(context.asset.bytes_base64&&context.asset.mime,'IMAGE_BYTES_REQUIRED');
  var spec=ngdVpPrepare_({tier:context.job.tier,provider:context.provider,
   compiled:context.compiled,image_base64:context.asset.bytes_base64,mime:context.asset.mime});
  var key=d.secrets.get(context.provider);
  ngdVpRequire_(typeof key==='string'&&key.length>=16,'PROVIDER_KEY_MISSING');
  return d.transport.post(spec.url,
   {'Content-Type':'application/json',
    [spec.auth_scheme]:key},spec.body).then(function(result){
     ngdVpRequire_(result&&result.status>=200&&result.status<300,'UPSTREAM_REJECTED');
     if(spec.asynchronous){
      // BFL returns generation ID; never trust its arbitrary polling_url.
      ngdVpRequire_(result.body&&typeof result.body.id==='string'&&
       /^[A-Za-z0-9_-]{3,100}$/.test(result.body.id),'BFL_GENERATION_ID');
      d.store.saveSubmissionOnce(context.job.id,context.provider,result.body.id);
      return {status:'PENDING',generation_id:result.body.id,provider:context.provider};
     }
     // Google can return inline image bytes. Store privately before completion.
     var candidates=result.body&&result.body.candidates;
     var parts=candidates&&candidates[0]&&candidates[0].content&&candidates[0].content.parts;
     var image=Array.isArray(parts)&&parts.find(function(x){return x.inlineData&&x.inlineData.data;});
     ngdVpRequire_(image&&typeof image.inlineData.data==='string','GEMINI_NO_IMAGE');
     ngdVpRequire_(['image/png','image/jpeg','image/webp'].indexOf(image.inlineData.mimeType)>=0,
      'GEMINI_IMAGE_MIME');
     return {status:'READY',bytes_base64:image.inlineData.data,
      mime:image.inlineData.mimeType,provider:context.provider};
   });
 }
 function pollBfl(job,provider,generationId){
  enabled();
  ngdVpRequire_(provider==='flux_kontext_pro'||provider==='flux2_pro','NOT_BFL');
  ngdVpRequire_(job&&job.status==='PROCESSING'&&
   d.store.ownsSubmission(job.id,provider,generationId),'POLL_OWNERSHIP');
  // URL is formed from trusted base + validated provider ID only.
  ngdVpRequire_(typeof generationId==='string'&&/^[A-Za-z0-9_-]{3,100}$/.test(generationId),
   'POLL_ID');
  var key=d.secrets.get(provider);
  ngdVpRequire_(typeof key==='string'&&key.length>=16,'PROVIDER_KEY_MISSING');
  return d.transport.get('https://api.bfl.ai/v1/get_result?id='+encodeURIComponent(generationId),
   {'x-key':key}).then(function(response){
    ngdVpRequire_(response&&response.status===200,'POLL_UPSTREAM_REJECTED');
    var payload=response.body||{};
    if(payload.status==='Pending'||payload.status==='Queued')return {status:'PENDING'};
    if(payload.status==='Error'||payload.status==='Failed')return {status:'FAILED',error_code:'PROVIDER_FAILED'};
    ngdVpRequire_(payload.status==='Ready'&&payload.result&&
     typeof payload.result.sample==='string','POLL_INVALID_RESULT');
    // Result URL is not a user-facing asset. Worker must fetch with strict
    // hostname allowlist, content-type/size limits and save private bytes.
    ngdVpRequire_(/^https:\/\/bfldeliveryprod\.blob\.core\.windows\.net\/results\/[A-Za-z0-9_./%?=&-]+$/.test(payload.result.sample),
     'UNTRUSTED_RESULT_HOST');
    return {status:'READY_PRIVATE_IMPORT_REQUIRED',provider_url:payload.result.sample};
  });
 }
 function recoverableFailure(code){
  // Fallback ONLY before any paid upstream submission is acknowledged.
  return ['UPSTREAM_BUSY','UPSTREAM_RATE_LIMITED','UPSTREAM_UNAVAILABLE'].indexOf(code)>=0;
 }
 function options(tier){return (NGD_VISUAL_PROVIDER_ROUTES_[tier]||[]).slice();}
 return {enabled:enabled,prepare:ngdVpPrepare_,submit:submit,pollBfl:pollBfl,
  options:options,recoverableFailure:recoverableFailure};
}

/**
 * Ngulik Visual Provider routing. The only authoritative machine IDs are
 * NGD_VISUAL_MACHINE_CATALOG_ in VisualSkills.gs.
 * DO NOT expose transport bodies, credentials, raw provider errors or costing.
 * Source is inert until an authenticated isolated worker explicitly calls it.
 */
var NGD_VISUAL_PROVIDER_ENDPOINTS_=Object.freeze({
 gemini_flash_image:Object.freeze({origin:'https://generativelanguage.googleapis.com',
  path:'/v1beta/models/gemini-3.1-flash-image:generateContent'}),
 flux_kontext_pro:Object.freeze({fal:'fal-ai/flux-pro/kontext',
  kie:'flux1-kontext'}),
 flux_2_pro:Object.freeze({fal:'fal-ai/flux-2-pro/edit',
  kie:'flux-2/pro-image-to-image'})
});
function ngdVpRequire_(condition,code){if(!condition)throw Error('VISUAL_PROVIDER_'+code);}
function ngdVpMachine_(id){
 ngdVpRequire_(Object.prototype.hasOwnProperty.call(
  NGD_VISUAL_PROVIDER_ENDPOINTS_,id),'MACHINE_INVALID');
 return NGD_VISUAL_PROVIDER_ENDPOINTS_[id];
}
function ngdVpCompileCheck_(compiled){
 ngdVpRequire_(compiled&&compiled.contract_version==='visual-food-magazine-img2img-v2'&&
  compiled.image_generation_mode==='IMAGE_TO_IMAGE_REQUIRED'&&
  Array.isArray(compiled.layer_trace)&&compiled.layer_trace.length===12,
  'COMPILER_REQUIRED');
 ngdVpRequire_(typeof compiled.compiled_prompt==='string'&&
  compiled.compiled_prompt.indexOf('[08_NO_MODEL_TYPOGRAPHY]')>=0&&
  compiled.compiled_prompt.indexOf('Do NOT render any text, letters, numbers')>=0,
  'TYPOGRAPHY_GUARD');
 return compiled.compiled_prompt+'\n\nNegative: '+compiled.negative_prompt;
}
function ngdVpReference_(ref){
 ngdVpRequire_(ref&&ref.private===true&&
  typeof ref.owner==='string'&&
  ['image/png','image/jpeg','image/webp'].indexOf(ref.mime)>=0,'OWNED_REFERENCE_REQUIRED');
 ngdVpRequire_(typeof ref.base64==='string'&&ref.base64.length>40&&
  /^[A-Za-z0-9+/]+={0,2}$/.test(ref.base64),'BINARY_REFERENCE_REQUIRED');
 return ref;
}
function ngdVpPrivateUrl_(url){
 // Provider-side temporary upload only, with a tight lifetime and no logging.
 // Arbitrary public URLs and consumer-supplied links are never accepted.
 ngdVpRequire_(typeof url==='string'&&url.length<1600&&
  /^https:\/\/[a-z0-9.-]+\/[A-Za-z0-9_./?=&%+-]+$/i.test(url),
  'EPHEMERAL_URL_INVALID');
 var host=url.split('/')[2].toLowerCase();
 ngdVpRequire_(host==='fal.media'||host==='v3.fal.media'||
  host==='storage.googleapis.com'||host==='file.aiquickdraw.com'||host==='tempfile.redpandaai.co',
  'EPHEMERAL_HOST_INVALID');
 return url;
}
function ngdVpRemoteResultUrl_(url,source){
 ngdVpRequire_(source==='fal'||source==='kie','RESULT_SOURCE_INVALID');
 ngdVpRequire_(typeof url==='string'&&url.length<1800&&
  /^https:\/\/[a-z0-9.-]+\/[a-z0-9_./?=&%+-]+$/i.test(url),
  'REMOTE_RESULT_URL_INVALID');
 var host=url.split('/')[2].toLowerCase();
 var safe=source==='fal'?
  (host==='fal.media'||host==='v3.fal.media'||host==='storage.googleapis.com'):
  (host==='file.aiquickdraw.com'||host==='storage.googleapis.com'||host==='v3.fal.media'||host==='tempfile.redpandaai.co');
 ngdVpRequire_(safe,'REMOTE_RESULT_HOST_DENIED');
 return url;
}
function ngdVpPrepare_(request){
 ngdVpRequire_(request&&request.machine_id,'REQUEST_INVALID');
 var machine=ngdVpMachine_(request.machine_id);
 var prompt=ngdVpCompileCheck_(request.compiled);
 var ref=ngdVpReference_(request.reference);
 var transport=request.transport||(
  request.machine_id==='gemini_flash_image'?'google':'fal');
 if(request.machine_id==='gemini_flash_image'){
  ngdVpRequire_(transport==='google','TRANSPORT_INCOMPATIBLE');
  return {machine_id:request.machine_id,transport:'google',method:'POST',
   url:machine.origin+machine.path,secret_property:'NGD_KEY_GOOGLE_AI',
   auth_header:'x-goog-api-key',
   body:{contents:[{role:'user',parts:[
    {text:prompt},{inlineData:{mimeType:ref.mime,data:ref.base64}}
   ]}],generationConfig:{responseModalities:['IMAGE']}},
   async:false};
 }
 ngdVpRequire_(transport==='fal'||transport==='kie','TRANSPORT_INCOMPATIBLE');
 // Both FLUX aggregators expect an uploaded reference URL. The worker owns
 // temporary media delivery; a browser-supplied public URL is never accepted.
 var uploaded=transport==='kie'?ngdVpPrivateUrl_(request.provider_upload_url):
  (request.provider_upload_url?ngdVpPrivateUrl_(request.provider_upload_url):
   'data:'+ref.mime+';base64,'+ref.base64);
 if(transport==='fal'){ 
  var path=machine.fal;
  return {machine_id:request.machine_id,transport:'fal',method:'POST',
   url:'https://queue.fal.run/'+path,
   secret_property:'NGD_KEY_FAL_AI',auth_header:'Authorization',
   body:request.machine_id==='flux_2_pro'?
    {prompt:prompt,image_urls:[uploaded],output_format:'png'}:
    {prompt:prompt,image_url:uploaded,output_format:'png'},
   async:true,provider_route:path};
 }
 return {machine_id:request.machine_id,transport:'kie',method:'POST',
  url:'https://api.kie.ai/api/v1/jobs/createTask',
  secret_property:'NGD_KEY_KIE_AI',auth_header:'Authorization',
  body:{model:machine.kie,input:request.machine_id==='flux_2_pro'?
    {prompt:prompt,input_urls:[uploaded]}:
    {model:'flux-kontext-pro',prompt:prompt,input_image:uploaded}},
  async:true};
}
function ngdVpSafeProviderId_(value){
 ngdVpRequire_(typeof value==='string'&&/^[a-zA-Z0-9_-]{3,110}$/.test(value),
  'TASK_ID_INVALID');
 return value;
}
function ngdVisualProvider_(dependencies){
 var d=dependencies||{};
 ngdVpRequire_(d.config&&d.transport&&d.secrets&&d.uploadReference&&
  d.submissions&&d.privateImport,'WORKER_DEPENDENCIES_REQUIRED');
 function enabled(){
  ngdVpRequire_(d.config.NGD_VISUAL_LIVE_ENABLED===true,'LIVE_DISABLED');
  ngdVpRequire_(d.config.NGD_VISUAL_CREDITS_ENABLED===true&&
   d.config.NGD_VISUAL_MEDIA_READY===true&&
   d.config.NGD_VISUAL_WORKER_READY===true,'INFRA_NOT_READY');
 }
 function secret(property){
  ngdVpRequire_(['NGD_KEY_GOOGLE_AI','NGD_KEY_KIE_AI','NGD_KEY_FAL_AI'].indexOf(property)>=0,
   'SECRET_PROPERTY_INVALID');
  var value=d.secrets.get(property);
  ngdVpRequire_(typeof value==='string'&&value.length>=16,'KEY_NOT_CONFIGURED');
  return value;
 }
 function headers(spec){
  var auth=secret(spec.secret_property);
  return {'Content-Type':'application/json',
   [spec.auth_header]:spec.auth_header==='Authorization'?'Bearer '+auth:auth};
 }
 function submit(job,reference,compiled,backend,slot){
  enabled();
  ngdVpRequire_(job&&job.status==='PROCESSING'&&job.owner===reference.owner&&
   Number.isInteger(slot)&&slot>=0&&slot<job.count,'WORKER_JOB_REQUIRED');
  var machine=ngdVpMachine_(job.machine_id);
  ngdVpReference_(reference);
  // Reference is not uploaded at all until authorization and owned job checks.
  var transport=job.machine_id==='gemini_flash_image'?'google':backend||'fal';
  // fal supports a server-generated Base64 data URI for Img2Img; no
  // public Drive sharing and no separate media host are required.
  var needsUpload=transport==='kie';
  return Promise.resolve(needsUpload?d.uploadReference(reference,transport):null)
  .then(function(upload){
   var spec=ngdVpPrepare_({machine_id:job.machine_id,transport:transport,
    compiled:compiled,reference:reference,
    provider_upload_url:upload&&upload.url});
   return d.transport.post(spec.url,headers(spec),spec.body).then(function(answer){
    ngdVpRequire_(answer&&answer.status>=200&&answer.status<300,'PROVIDER_UNAVAILABLE');
    if(!spec.async){
     var candidates=answer.body&&answer.body.candidates;
     var parts=candidates&&candidates[0]&&candidates[0].content&&candidates[0].content.parts;
     var image=Array.isArray(parts)&&parts.find(function(v){return v.inlineData&&v.inlineData.data});
     ngdVpRequire_(image&&image.inlineData&&
      ['image/jpeg','image/png','image/webp'].indexOf(image.inlineData.mimeType)>=0,
      'NO_VALID_IMAGE');
     return d.privateImport.inline(job,image.inlineData.mimeType,image.inlineData.data);
    }
    var providerId=spec.transport==='kie'?
     answer.body&&answer.body.data&&answer.body.data.taskId:
     answer.body&&answer.body.request_id;
    ngdVpSafeProviderId_(providerId);
    d.submissions.saveOnce(job.id+'_'+slot,{transport:spec.transport,machine_id:job.machine_id,
     provider_id:providerId});
    return {state:'QUEUED',provider_id:providerId};
   });
  });
 }
 function poll(job,slot){
  enabled();
  ngdVpRequire_(job&&job.status==='PROCESSING'&&
   Number.isInteger(slot)&&slot>=0&&slot<job.count,'POLL_JOB_INVALID');
  var saved=d.submissions.get(job.id+'_'+slot);
  ngdVpRequire_(saved&&saved.machine_id===job.machine_id,'POLL_OWNERSHIP');
  ngdVpSafeProviderId_(saved.provider_id);
  var url,authProperty,header;
  if(saved.transport==='kie'){
   url='https://api.kie.ai/api/v1/jobs/recordInfo?taskId='+
    encodeURIComponent(saved.provider_id);
   authProperty='NGD_KEY_KIE_AI';header='Authorization';
  }else{
   ngdVpRequire_(saved.transport==='fal','POLL_TRANSPORT');
   var route=ngdVpMachine_(saved.machine_id).fal;
   url='https://queue.fal.run/'+route+'/requests/'+
    encodeURIComponent(saved.provider_id)+'/status';
   authProperty='NGD_KEY_FAL_AI';header='Authorization';
  }
  var key=secret(authProperty);
  return d.transport.get(url,{[header]:'Bearer '+key})
  .then(function(response){
   ngdVpRequire_(response&&response.status===200,'POLL_PROVIDER_BUSY');
   var body=response.body||{};
   if(saved.transport==='kie'){
    var data=body.data||{};
    if(['waiting','queuing','generating','PENDING','RUNNING'].indexOf(data.state)>=0)
     return {state:'PROCESSING'};
    if(data.state==='fail')return {state:'FAILED',reason:'PROVIDER_FAILED'};
    ngdVpRequire_(data.state==='success','PROVIDER_STATUS_UNKNOWN');
    // Kie resultJson contains remote URLs; never expose them to browser.
    var result;
    try{result=typeof data.resultJson==='string'?JSON.parse(data.resultJson):data.resultJson;}
    catch(_){throw Error('VISUAL_PROVIDER_RESULT_INVALID');}
    var urls=result&&result.resultUrls;
    ngdVpRequire_(Array.isArray(urls)&&urls.length>0,'PROVIDER_NO_RESULT');
    return d.privateImport.remote(job,ngdVpRemoteResultUrl_(urls[0],'kie'),'kie');
   }
   if(body.status==='IN_QUEUE'||body.status==='IN_PROGRESS')
    return {state:'PROCESSING'};
   if(body.status==='FAILED')return {state:'FAILED',reason:'PROVIDER_FAILED'};
   ngdVpRequire_(body.status==='COMPLETED','PROVIDER_STATUS_UNKNOWN');
   return d.transport.get('https://queue.fal.run/'+
    ngdVpMachine_(saved.machine_id).fal+'/requests/'+
    encodeURIComponent(saved.provider_id),
    {'Authorization':'Bearer '+key}).then(function(responseResult){
      ngdVpRequire_(responseResult&&responseResult.status===200,'RESULT_NOT_READY');
      var images=responseResult.body&&responseResult.body.images;
      ngdVpRequire_(Array.isArray(images)&&images[0]&&
       typeof images[0].url==='string','RESULT_IMAGE_MISSING');
      return d.privateImport.remote(job,ngdVpRemoteResultUrl_(images[0].url,'fal'),'fal');
    });
  });
 }
 return {enabled:enabled,submit:submit,poll:poll,prepare:ngdVpPrepare_};
}
/**
 * GAS worker helper. This function is never invoked by web source alone.
 * Cloud permissions, network/API costs and actual keys remain owner controlled.
 */
/**
 * Kie temporary media upload. The reference stays private to the user and
 * backend; provider receives a short-lived copy only after authorization.
 * Kie documentation states the temporary upload is deleted after 24h.
 */
function ngdVisualKieUploadReference_(reference){
 ngdVpReference_(reference);
 ngdVpRequire_(typeof UrlFetchApp!=='undefined','GAS_NETWORK_NOT_AVAILABLE');
 var key=ngdVisualProviderGasSecrets_().get('NGD_KEY_KIE_AI');
 ngdVpRequire_(typeof key==='string'&&key.length>=16,'KEY_NOT_CONFIGURED');
 var body={base64Data:'data:'+reference.mime+';base64,'+reference.base64,
  uploadPath:'ngulik-visual/private-ephemeral',
  fileName:'reference-'+Utilities.getUuid().replace(/-/g,'')+
   (reference.mime==='image/jpeg'?'.jpg':reference.mime==='image/webp'?'.webp':'.png')};
 var response=UrlFetchApp.fetch('https://kieai.redpandaai.co/api/file-base64-upload',{
  method:'post',contentType:'application/json',
  headers:{Authorization:'Bearer '+key},payload:JSON.stringify(body),
  followRedirects:false,muteHttpExceptions:true});
 ngdVpRequire_(response.getResponseCode()===200,'UPLOAD_UNAVAILABLE');
 var parsed;
 try{parsed=JSON.parse(response.getContentText());}
 catch(_){throw Error('VISUAL_PROVIDER_UPLOAD_JSON_INVALID');}
 ngdVpRequire_(parsed&&parsed.code===200&&parsed.success===true&&
  parsed.data&&typeof parsed.data.downloadUrl==='string','UPLOAD_REJECTED');
 return {url:ngdVpPrivateUrl_(parsed.data.downloadUrl)};
}
function ngdVisualProviderGasSecrets_(){
 return {get:function(property){
  ngdVpRequire_(typeof PropertiesService!=='undefined','GAS_REQUIRED');
  return PropertiesService.getScriptProperties().getProperty(property);
 }};
}

/* Restricted GAS outbound HTTP transport; never follows redirects or logs
 * response bodies. Credentials stay in request headers server-side. */
function ngdVisualProviderGasTransport_(){
 function invoke(method,url,headers,body){
  ngdVpRequire_(typeof UrlFetchApp!=='undefined','GAS_NETWORK_NOT_AVAILABLE');
  ngdVpRequire_(typeof url==='string'&&/^https:\/\//.test(url),'HTTPS_REQUIRED');
  var host=url.split('/')[2];
  ngdVpRequire_(['api.kie.ai','queue.fal.run',
   'generativelanguage.googleapis.com'].indexOf(host)>=0,'UPSTREAM_HOST_DENIED');
  var options={method:method,headers:headers||{},
   muteHttpExceptions:true,followRedirects:false};
  if(method==='post')options.payload=JSON.stringify(body);
  var res=UrlFetchApp.fetch(url,options);
  var status=res.getResponseCode();
  ngdVpRequire_(status>=200&&status<300,'PROVIDER_UNAVAILABLE');
  var parsed;
  try{parsed=JSON.parse(res.getContentText());}
  catch(_){throw Error('VISUAL_PROVIDER_BAD_RESPONSE');}
  return Promise.resolve({status:status,body:parsed});
 }
 return {post:function(url,h,b){return invoke('post',url,h,b);},
  get:function(url,h){return invoke('get',url,h);}};
}

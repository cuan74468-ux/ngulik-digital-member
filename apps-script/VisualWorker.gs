/**
 * Bounded worker unit for a time-driven GAS trigger (not installed here).
 * Each invocation advances at most one image slot; it never blocks on an
 * upstream async generation and never blindly re-sends an uncertain task.
 * Runs only when all Visual-only gates, separate credit wallet, private media,
 * and member authentication have been reviewed and enabled.
 */
function ngdVisualWorker_(auth,worker){
 var runtime=ngdVisualRuntime_(auth).workerInternals(worker);
 var jobs=runtime.jobs,media=runtime.media,store=runtime.store;
 var config=runtime.config,clock=runtime.clock;
 var aggregator=PropertiesService.getScriptProperties().getProperty('NGD_VISUAL_FLUX_AGGREGATOR')||'kie';
 ngdVpRequire_(['kie','fal'].indexOf(aggregator)>=0,'AGGREGATOR_NOT_ALLOWED');
 var secret=ngdVisualProviderGasSecrets_();
 function storeImage(job,mime,base64){
  ngdVpRequire_(['image/jpeg','image/png','image/webp'].indexOf(mime)>=0,'RESULT_MIME');
  var bytes=ngdVmBytes_(base64,mime);
  var uploaded=media.putPrivate({owner:job.owner,job_id:job.id,
   media_kind:'output',mime:mime,bytes:bytes});
  return {state:'READY',asset_id:uploaded.asset_id};
 }
 function importRemote(job,url){
  // ngdVisualProvider_ validates an explicit provider-host allowlist first.
  ngdVpRequire_(typeof UrlFetchApp!=='undefined','NETWORK_NOT_AVAILABLE');
  var res=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,
   followRedirects:false});
  ngdVpRequire_(res.getResponseCode()===200,'RESULT_NOT_AVAILABLE');
  var blob=res.getBlob(),mime=String(blob.getContentType()).split(';')[0];
  ngdVpRequire_(['image/jpeg','image/png','image/webp'].indexOf(mime)>=0,'RESULT_MIME');
  var bytes=blob.getBytes();
  ngdVpRequire_(bytes.length>0&&bytes.length<=NGD_VISUAL_MEDIA_MAX_BYTES_&&
   ngdVjSignature_(bytes,mime),'RESULT_TOO_LARGE_OR_INVALID');
  return storeImage(job,mime,Utilities.base64Encode(bytes));
 }
 var provider=ngdVisualProvider_({
  config:config,secrets:secret,transport:ngdVisualProviderGasTransport_(),
  submissions:store.submissions,
  uploadReference:function(reference,transport){
   if(transport==='kie')return ngdVisualKieUploadReference_(reference);
   // fal media uploader must be provisioned separately; do NOT turn private
   // Drive objects into public links. Kie is the fail-closed default.
   throw Error('VISUAL_PROVIDER_FAL_UPLOAD_NOT_CONFIGURED');
  },
  privateImport:{
   inline:storeImage,
   remote:function(job,url){return importRemote(job,url);}
  }
 });
 async function tick(){
  provider.enabled();
  // Refund any expired jobs before attempting further provider dispatch.
  jobs.expire(worker);
  var ids=store.queue.next(1);
  if(!ids.length)return {state:'IDLE'};
  var id=ids[0],job=store.jobs.get(id);
  if(!job||['REFUNDED','SETTLED'].indexOf(job.status)>=0)return {state:'IDLE'};
  if(job.status==='RESERVED')jobs.process(id,worker);
  job=store.jobs.get(id);
  store.slots.initialize(id,job.count);
  if(clock.now()>job.expires_at){
   jobs.expire(worker);
   return {state:'EXPIRED',job_id:id};
  }
  // Prefer existing provider tasks; only submit NEW slots once.
  var task=store.slots.findPolling(id,job.count);
  var mode=task?'POLL':'SUBMIT';
  if(!task)task=store.slots.claimNew(id,job.count);
  if(task){
   try{
    var result;
    if(mode==='POLL'){
     result=await provider.poll(job,task.index);
    }else{
     var data=media.getPrivateBytes(job.input_asset_id,job.owner);
     var reference={owner:job.owner,private:true,mime:data.mime,
      base64:Utilities.base64Encode(data.bytes)};
     result=await provider.submit(job,reference,job.compiled_recipe,aggregator,task.index);
    }
    if(result&&result.state==='QUEUED'&&mode==='SUBMIT'){
     store.slots.mark(id,task.index,'SUBMITTING','QUEUED',null,null);
    }else if(result&&result.state==='READY'&&
     /^asset_[A-Za-z0-9_-]{6,110}$/.test(result.asset_id||'')){
     store.slots.mark(id,task.index,mode==='POLL'?'QUEUED':'SUBMITTING',
      'SUCCEEDED',result.asset_id,null);
    }else if(result&&result.state==='FAILED'){
     store.slots.mark(id,task.index,mode==='POLL'?'QUEUED':'SUBMITTING',
      'FAILED',null,'PROVIDER_FAILED');
    }else if(!result||result.state!=='PROCESSING'){
     throw Error('VISUAL_WORKER_RESULT_INVALID');
    }
   }catch(err){
    // An unknown state after a network submission MUST NOT be resubmitted.
    // The conservative budget stays occupied for the day; pending task
    // expires safely and member credits are refunded on timeout.
    if(mode==='POLL'){
     // Poll failure is non-terminal, next tick can query same provider ID.
     return {state:'RETRY_POLL_LATER',job_id:id};
    }
    return {state:'SUBMISSION_UNCERTAIN',job_id:id};
   }
  }
  var summary=store.slots.summary(id,job.count);
  if(summary.all_terminal){
   if(summary.succeeded.length){
    return jobs.complete(id,worker,{asset_ids:summary.succeeded});
   }
   return jobs.fail(id,worker,'PROVIDER_FAILED');
  }
  return {state:'PROCESSING',job_id:id,
   succeeded_count:summary.succeeded.length,failed_count:summary.failed};
 }
 function clean(){
  ngdVjAssert_(auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  var expired=jobs.expire(worker);
  var files=jobs.cleanup(worker);
  return {expired_jobs:expired.length,media:files};
 }
 return {tick:tick,cleanup:clean};
}

/**
 * P1 Stage 4: secure contract for private media and async visual jobs.
 * NO doGet/doPost, triggers, Script Properties, financial Code.gs, or live I/O.
 *
 * Durable adapters MUST provide atomic idempotency, CAS and reservation ledger.
 * There is deliberately no in-memory fallback for production calls. Tests supply
 * fake adapters and never touch member balances.
 */
var NGD_VISUAL_PIPELINE_DEFAULTS_=Object.freeze({
 live_enabled:false, visual_credits_enabled:false,media_ready:false,worker_ready:false,
 daily_budget_cap_idr:0, rate_limit_per_hour:6,
 max_upload_bytes:4*1024*1024, max_asset_age_ms:24*60*60*1000,
 processing_timeout_ms:10*60*1000
});
function ngdVjAssert_(ok,code){if(!ok)throw Error('VISUAL_JOB_'+code);}
function ngdVjId_(value,label){
 ngdVjAssert_(typeof value==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(value),label+'_INVALID');
 return value;
}
function ngdVjSession_(auth,session){
 var user=auth.requireMember(session);
 ngdVjAssert_(user&&typeof user.member_id==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(user.member_id),'SESSION_REQUIRED');
 return user.member_id;
}
function ngdVjPolicy_(config){
 var c=config||{};
 return {
  live:c.NGD_VISUAL_LIVE_ENABLED===true,
  credits_enabled:c.NGD_VISUAL_CREDITS_ENABLED===true,
  media_ready:c.NGD_VISUAL_MEDIA_READY===true,
  worker_ready:c.NGD_VISUAL_WORKER_READY===true,
  max_daily_idr:Number.isSafeInteger(c.NGD_VISUAL_DAILY_BUDGET_CAP)&&c.NGD_VISUAL_DAILY_BUDGET_CAP>0?c.NGD_VISUAL_DAILY_BUDGET_CAP:0,
  rate_per_hour:Number.isSafeInteger(c.NGD_VISUAL_RATE_LIMIT)&&c.NGD_VISUAL_RATE_LIMIT>0&&c.NGD_VISUAL_RATE_LIMIT<=60?c.NGD_VISUAL_RATE_LIMIT:6
 };
}
function ngdVjHex_(v){return typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);}
function ngdVjSignature_(bytes,mime){
 if(!bytes||bytes.length<12)return false;
 if(mime==='image/png')return bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13;
 if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/webp')return String.fromCharCode.apply(null,Array.prototype.slice.call(bytes,0,4))==='RIFF'&&
  String.fromCharCode.apply(null,Array.prototype.slice.call(bytes,8,12))==='WEBP';
 return false;
}
function ngdVisualJobs_(dependencies){
 var d=dependencies||{},p=ngdVjPolicy_(d.config);
 ngdVjAssert_(d.auth&&d.media&&d.jobs&&d.ledger&&d.clock&&d.budget&&d.queue&&d.rate,'DEPENDENCIES_REQUIRED');
 function now(){return d.clock.now();}
 function mustLive(){
  ngdVjAssert_(p.live,'LIVE_DISABLED');
  ngdVjAssert_(p.credits_enabled&&p.media_ready&&p.worker_ready,'VISUAL_INFRA_NOT_AUTHORIZED');
  ngdVjAssert_(p.max_daily_idr>0,'BUDGET_CAP_REQUIRED');
 }
 function asset(session,details){
  mustLive();
  var member=ngdVjSession_(d.auth,session);
  ngdVjAssert_(details&&['image/jpeg','image/png','image/webp'].indexOf(details.mime)>=0,'MIME');
  ngdVjAssert_(Number.isSafeInteger(details.size)&&details.size>0&&
   details.size<=NGD_VISUAL_PIPELINE_DEFAULTS_.max_upload_bytes,'SIZE');
  ngdVjAssert_(ngdVjHex_(details.sha256),'HASH_REQUIRED');
  ngdVjAssert_(Array.isArray(details.bytes)&&details.bytes.length===details.size&&
   ngdVjSignature_(details.bytes,details.mime),'SIGNATURE_MISMATCH');
  ngdVjAssert_(typeof d.hashBytes==='function'&&
   d.hashBytes(details.bytes)===details.sha256.toLowerCase(),'CHECKSUM_MISMATCH');
  // Private store implementation MUST enforce server-side object ACL, encrypted
  // at rest, ownership and TTL; never use a browser-supplied bucket or URL.
  return d.media.putPrivate({
   owner:member,mime:details.mime,bytes:details.bytes,sha256:details.sha256,
   created_at:now(),expires_at:now()+NGD_VISUAL_PIPELINE_DEFAULTS_.max_asset_age_ms
  });
 }
 function create(session,request){
  mustLive();
  var member=ngdVjSession_(d.auth,session);
  ngdVjAssert_(request&&typeof request==='object'&&!Array.isArray(request),'REQUEST');
  var key=ngdVjId_(request.idempotency_key,'IDEMPOTENCY');
  ngdVjAssert_(typeof ngdVisualQuote_==='function','CATALOG_REQUIRED');
  var quoteCredits=ngdVisualQuote_(request.machine_id,request.payload&&request.payload.count);
  ngdVjAssert_(request.payload&&typeof request.payload==='object','PAYLOAD');
  // Compiler always revalidates option IDs and reference handle server-side.
  ngdVjAssert_(typeof d.compile==='function','COMPILER_REQUIRED');
  var compiled=d.compile(request.payload);
  ngdVjAssert_(compiled&&compiled.contract_version==='visual-food-magazine-img2img-v2'&&
   compiled.image_generation_mode==='IMAGE_TO_IMAGE_REQUIRED'&&compiled.release_authorized===false,
   'COMPILER_CONTRACT');
  var count=compiled.image_count;
  ngdVjAssert_(count===1||count===2||count===4,'COUNT');
  var cost=quoteCredits.total_credits;
  ngdVjAssert_(quoteCredits.count===count,'SERVER_QUOTE_MISMATCH');
  var reference=d.media.getOwned(compiled.media_contract.reference_asset_id,member,now());
  ngdVjAssert_(reference&&reference.owner===member&&reference.expires_at>now()&&
   reference.private===true,'MEDIA_OWNERSHIP_OR_EXPIRY');
  // A SHA256 of canonical server-validated IDs/handles is calculated by an
  // injected cryptographic implementation, NOT a client-provided fingerprint.
  ngdVjAssert_(typeof d.fingerprint==='function','FINGERPRINT_REQUIRED');
  var digest=d.fingerprint({member:member,machine_id:request.machine_id,
   option_ids:compiled.option_ids,count:count,
   asset_id:compiled.media_contract.reference_asset_id,
   compiled_prompt:compiled.compiled_prompt,negative_prompt:compiled.negative_prompt,
   overlay:compiled.overlay_specification});
  ngdVjAssert_(ngdVjHex_(digest),'FINGERPRINT_INVALID');
  var scope=member+':'+key;
  // Atomic transaction provided by backing store: createUnique(scope,digest,...)
  // must reject different digest for a reused key and return original for same.
  var result=d.jobs.createUnique(scope,digest,function(){
   var job_id=d.jobs.newId();
   var item={id:job_id,owner:member,scope:scope,fingerprint:digest,
    status:'CREATED',machine_id:request.machine_id,unit_credits:quoteCredits.unit_credits,
    credit_cost:cost,settled_credits:0,refunded_credits:0,
    count:count,provider:null,created_at:now(),updated_at:now(),
    expires_at:now()+NGD_VISUAL_PIPELINE_DEFAULTS_.processing_timeout_ms,
    input_asset_id:compiled.media_contract.reference_asset_id,
    compiled_recipe:compiled,
    result_asset_ids:[],error_code:null};
   // Budget must reserve atomically against parallel jobs and per-day cap;
   // quote comes from trusted server price configuration, not client.
   ngdVjAssert_(typeof d.quote==='function','QUOTE_REQUIRED');
   var quote=d.quote(request.machine_id,count);
   ngdVjAssert_(Number.isSafeInteger(quote)&&quote>0,'QUOTE_INVALID');
   d.rate.consumeOnce(job_id,member,p.rate_per_hour,now());
   try{d.budget.reserveDaily(job_id,quote,p.max_daily_idr,now());}
   catch(err){d.rate.releaseOnce(job_id);throw err;}
   try{
    d.ledger.reserveOnce(job_id,member,cost);
    item.status='RESERVED';
    // Must enqueue durably in same transaction or via transactional outbox.
    d.queue.enqueueOnce(job_id);
    return item;
   }catch(err){
    d.ledger.releaseOnce(job_id);
    d.budget.releaseOnce(job_id);
    d.rate.releaseOnce(job_id);
    throw err;
   }
  });
  ngdVjAssert_(result&&result.owner===member&&result.fingerprint===digest,
   'IDEMPOTENCY_CONFLICT');
  return publicStatus(result);
 }
 function publicStatus(item){
  return {job_id:item.id,status:item.status,machine_id:item.machine_id,
   unit_credits:item.unit_credits,credit_cost:item.credit_cost,
   settled_credits:item.settled_credits||0,refunded_credits:item.refunded_credits||0,
   count:item.count,succeeded_count:item.result_asset_ids.length,
   result_asset_ids:item.status==='SETTLED'?item.result_asset_ids:[],
   error_code:item.error_code||null};
 }
 function poll(session,id){
  var member=ngdVjSession_(d.auth,session);
  var job=d.jobs.get(ngdVjId_(id,'JOB'));
  ngdVjAssert_(job&&job.owner===member,'JOB_NOT_FOUND');
  return publicStatus(job);
 }
 function process(id,worker){
  mustLive();
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  var job=d.jobs.get(ngdVjId_(id,'JOB'));
  ngdVjAssert_(job,'JOB_NOT_FOUND');
  if(['SETTLED','REFUNDED'].indexOf(job.status)>=0)return publicStatus(job);
  if(job.status==='PROCESSING')return publicStatus(job); // no duplicate provider call
  ngdVjAssert_(job.status==='RESERVED','NOT_RESERVED');
  var locked=d.jobs.compareAndSwap(id,'RESERVED','PROCESSING',{updated_at:now()});
  ngdVjAssert_(locked,'CONCURRENT_WORKER');
  return publicStatus(d.jobs.get(id));
 }
 function complete(id,worker,result){
  // A trusted worker must finish an already-reserved job even after an
  // emergency LIVE OFF. Disabling generation must not strand held credits.
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  var job=d.jobs.get(ngdVjId_(id,'JOB'));
  ngdVjAssert_(job&&job.status==='PROCESSING','NOT_PROCESSING');
  // A timed-out job may still settle already-verified private images;
  // missing outputs are automatically refunded in the same ledger operation.
  ngdVjAssert_(result&&Array.isArray(result.asset_ids)&&
    result.asset_ids.length>0&&result.asset_ids.length<=job.count,'RESULT_COUNT');
  ngdVjAssert_(new Set(result.asset_ids).size===result.asset_ids.length,
   'DUPLICATE_RESULT_ASSET');
  result.asset_ids.forEach(function(x){
   ngdVjAssert_(typeof x==='string'&&/^asset_[A-Za-z0-9_-]{6,80}$/.test(x),'RESULT_ASSET');
   var media=d.media.getOwned(x,job.owner,now());
   ngdVjAssert_(media&&media.private===true&&media.job_id===id&&
    media.media_kind==='output','RESULT_NOT_PRIVATE');
  });
  var phase=result.asset_ids.length===job.count?'SUCCEEDED':'PARTIAL_SUCCEEDED';
  ngdVjAssert_(d.jobs.compareAndSwap(id,'PROCESSING',phase,{
   result_asset_ids:result.asset_ids,updated_at:now()}),'CONCURRENT_COMPLETION');
  // Settlement is idempotent; a retry from SUCCEEDED is handled by settle().
  return settle(id,worker);
 }
 function settle(id,worker){
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  var job=d.jobs.get(id);
  ngdVjAssert_(job&&['SUCCEEDED','PARTIAL_SUCCEEDED','SETTLED'].indexOf(job.status)>=0,'SETTLE_STATUS');
  if(job.status==='SETTLED')return publicStatus(job);
  var succeeded=job.result_asset_ids.length;
  ngdVjAssert_(succeeded>0&&succeeded<=job.count,'SETTLE_IMAGE_COUNT');
  var charged=succeeded*job.unit_credits,refunded=job.credit_cost-charged;
  // Ledger must atomically settle partial and return the rest exactly once.
  // Budget charges consumed provider capacity, not public credit price.
  d.ledger.settleOnce(id,charged,refunded);
  d.budget.settleOnce(id,succeeded,job.count);
  ngdVjAssert_(d.jobs.compareAndSwap(id,job.status,'SETTLED',{
   settled_credits:charged,refunded_credits:refunded,updated_at:now()}),'SETTLE_CAS');
  return publicStatus(d.jobs.get(id));
 }
 function fail(id,worker,error_code){
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  var job=d.jobs.get(ngdVjId_(id,'JOB'));
  ngdVjAssert_(job,'JOB_NOT_FOUND');
  if(['SETTLED','REFUNDED'].indexOf(job.status)>=0)return publicStatus(job);
  ngdVjAssert_(['RESERVED','PROCESSING','FAILED'].indexOf(job.status)>=0,'FAIL_STATUS');
  ngdVjAssert_(typeof error_code==='string'&&/^[A-Z_]{3,40}$/.test(error_code),'ERROR_CODE');
  if(job.status!=='FAILED')ngdVjAssert_(
   d.jobs.compareAndSwap(id,job.status,'FAILED',{error_code:error_code,updated_at:now()}),'FAIL_CAS');
  d.ledger.releaseOnce(id);
  d.budget.releaseOnce(id);
  ngdVjAssert_(d.jobs.compareAndSwap(id,'FAILED','REFUNDED',{
   settled_credits:0,refunded_credits:job.credit_cost,
   updated_at:now()}),'REFUND_CAS');
  return publicStatus(d.jobs.get(id));
 }
 function expire(worker){
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  // External scheduler invokes this bounded cleanup, no GAS trigger installed.
  var affected=d.jobs.listExpired(now(),100);
  return affected.map(function(job){
   if(['SUCCEEDED','PARTIAL_SUCCEEDED'].indexOf(job.status)>=0)return settle(job.id,worker);
   if(job.status==='FAILED')return fail(job.id,worker,job.error_code||'PROVIDER_FAILED');
   if(d.slots&&typeof d.slots.expireUncertain==='function'){
    d.slots.expireUncertain(job.id,job.count);
    var partial=d.slots.summary(job.id,job.count);
    if(partial.succeeded.length){
     return complete(job.id,worker,{asset_ids:partial.succeeded});
    }
   }
   return fail(job.id,worker,'JOB_TIMEOUT');
  });
 }
 function cleanup(worker){
  ngdVjAssert_(d.auth.requireWorker(worker)===true,'WORKER_AUTH_REQUIRED');
  return d.media.purgeExpired(now(),100);
 }
 return {upload:asset,create:create,poll:poll,process:process,complete:complete,
  settle:settle,fail:fail,expire:expire,cleanup:cleanup,policy:p};
}

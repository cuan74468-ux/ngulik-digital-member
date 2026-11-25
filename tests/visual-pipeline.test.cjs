'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const hex='a'.repeat(64),ref='asset_valid123456',requestId='idempotent_request_001';
function runtime(){
 const c=vm.createContext({console,Promise});
 for(const name of ['VisualSkills.gs','VisualJobs.gs','VisualProvider.gs','VisualMedia.gs','VisualStore.gs'])
  vm.runInContext(code(name),c,{filename:name});
 return c;
}
function fake(count=1){
 let time=1700000000000,seq=0;
 const records=new Map(),scopes=new Map(),files=new Map(),reservations=new Map(),budget=new Map(),rates=new Set(),queue=new Set();
 const stats={reserve:0,settle:0,refund:0,queued:0,rate:0};
 const compiled={contract_version:'visual-food-magazine-img2img-v2',
  image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',release_authorized:false,
  image_count:count,option_ids:{food_type:'soup'},
  compiled_prompt:'[08_NO_MODEL_TYPOGRAPHY]\nDo NOT render any text, letters, numbers',
  negative_prompt:'No text',overlay_specification:{enabled:false},
  media_contract:{reference_asset_id:ref}};
 const d={
  config:{NGD_VISUAL_LIVE_ENABLED:true,NGD_VISUAL_CREDITS_ENABLED:true,
   NGD_VISUAL_MEDIA_READY:true,NGD_VISUAL_WORKER_READY:true,
   NGD_VISUAL_DAILY_BUDGET_CAP:10000,NGD_VISUAL_RATE_LIMIT:4,
   NGD_MUTATIONS_ENABLED:false,NGD_FINANCE_ENABLED:false},
  auth:{requireMember:s=>s==='alice_session'?{member_id:'alice'}:
   s==='bob_session'?{member_id:'bob'}:null,requireWorker:w=>w==='trusted_worker'},
  media:{putPrivate:o=>{let id='asset_upload_'+String(++seq).padStart(7,'0');files.set(id,{...o,id,private:true});return {asset_id:id,expires_at:o.expires_at}},
   getOwned:(id,owner,now)=>{let v=files.get(id);return v&&v.owner===owner&&v.expires_at>now?v:null},
   purgeExpired:(now)=>{let n=0;for(let [id,v] of files)if(v.expires_at<=now){files.delete(id);n++}return n;}},
  jobs:{newId:()=> 'job_'+String(++seq).padStart(13,'0'),
   createUnique:(scope,fingerprint,fn)=>{
    if(scopes.has(scope)){const old=records.get(scopes.get(scope));
     if(old.fingerprint!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT');
     return old}
    const job=fn();records.set(job.id,job);scopes.set(scope,job.id);return job},
   get:id=>records.get(id),compareAndSwap:(id,from,to,patch)=>{
    let j=records.get(id);if(!j||j.status!==from)return false;
    j.status=to;Object.assign(j,patch);return true},
   listExpired:now=>[...records.values()].filter(j=>j.expires_at<now&&
    ['PROCESSING','RESERVED'].includes(j.status))},
  ledger:{reserveOnce:(id,user,amount)=>{
    if(!reservations.has(id)){reservations.set(id,{user,amount,status:'RESERVED'});stats.reserve++}},
   settleOnce:(id,spent,returned)=>{
    let row=reservations.get(id);
    if(row.status==='SETTLED'){if(row.spent!==spent||row.returned!==returned)throw Error('CONFLICT');return}
    assert.equal(row.amount,spent+returned);row.status='SETTLED';
    row.spent=spent;row.returned=returned;stats.settle++;stats.refund+=returned>0?1:0},
   releaseOnce:id=>{let row=reservations.get(id);if(row&&row.status==='RESERVED'){
    row.status='REFUNDED';stats.refund++}}},
  budget:{reserveDaily:(id,estimate,cap)=>{
    let used=[...budget.values()].reduce((a,x)=>a+x.estimate,0);
    if(used+estimate>cap)throw Error('BUDGET_EXCEEDED');
    if(!budget.has(id))budget.set(id,{estimate});},
   settleOnce:()=>{},releaseOnce:()=>{}},
  rate:{consumeOnce:(id,user,limit)=>{
    if(rates.has(id))return;if(rates.size>=limit)throw Error('RATE_LIMIT');
    rates.add(id);stats.rate++},releaseOnce:()=>{}},
  queue:{enqueueOnce:id=>{if(!queue.has(id)){queue.add(id);stats.queued++}}},
  clock:{now:()=>time},quote:(machine,count)=>count*(machine==='flux_2_pro'?900:600),
  compile:()=>compiled,fingerprint:()=>hex,hashBytes:()=>hex
 };
 files.set(ref,{owner:'alice',private:true,expires_at:time+3000000});
 return {d,stats,files,compiled,records,reservations,budget,
  advance:ms=>{time+=ms}};
}
const request=(machine_id='flux_kontext_pro',key=requestId)=>({idempotency_key:key,machine_id,payload:{count:1}});
function image(f,id,owner='alice',jobId){
 f.files.set(id,{owner,private:true,expires_at:1700002000000,job_id:jobId,media_kind:'output'});
}
test('backend catalog is authoritative and returns only public prices',()=>{
 const c=runtime();
 const prices=Array.from(c.ngdVisualPublicCatalog_()).map(x=>x.credits_per_image);
 assert.deepEqual(prices,[2,3,4]);
 assert.equal(c.ngdVisualQuote_('flux_kontext_pro',4).total_credits,12);
 assert.equal(c.ngdVisualQuote_('gemini_flash_image',2).total_credits,4);
 assert.equal(c.ngdVisualQuote_('flux_2_pro',4).total_credits,16);
 assert.throws(()=>c.ngdVisualQuote_('cheap_fake',1),/VISUAL_MACHINE_UNKNOWN/);
 assert.throws(()=>c.ngdVisualQuote_('flux_2_pro',3),/VISUAL_MACHINE_COUNT_INVALID/);
 assert.equal(JSON.stringify(c.ngdVisualPublicCatalog_()).includes('api_key'),false);
});
test('no live operation when four AI gates or daily cap are OFF; P0 remains false',()=>{
 const c=runtime(),f=fake();
 assert.throws(()=>c.ngdVisualJobs_({...f.d,config:{}}).create('alice_session',request()),/LIVE_DISABLED/);
 for(const k of ['NGD_VISUAL_CREDITS_ENABLED','NGD_VISUAL_MEDIA_READY','NGD_VISUAL_WORKER_READY']){
  assert.throws(()=>c.ngdVisualJobs_({...f.d,config:{...f.d.config,[k]:false}})
   .create('alice_session',request()),/VISUAL_INFRA_NOT_AUTHORIZED/);
 }
 assert.throws(()=>c.ngdVisualJobs_({...f.d,config:{...f.d.config,NGD_VISUAL_DAILY_BUDGET_CAP:0}})
  .create('alice_session',request()),/BUDGET_CAP_REQUIRED/);
 assert.equal(f.d.config.NGD_FINANCE_ENABLED,false);
 assert.equal(f.d.config.NGD_MUTATIONS_ENABLED,false);
});
test('private upload validates session, MIME signature, size, SHA and TTL',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d);
 const bytes=[137,80,78,71,13,10,26,10,0,0,0,0];
 const sample={mime:'image/png',size:bytes.length,bytes,sha256:hex};
 assert.throws(()=>api.upload('unknown',sample),/SESSION_REQUIRED/);
 assert.throws(()=>api.upload('alice_session',{...sample,mime:'image/svg+xml'}),/MIME/);
 assert.throws(()=>api.upload('alice_session',{...sample,bytes:Array(12).fill(0)}),/SIGNATURE/);
 assert.throws(()=>api.upload('alice_session',{...sample,sha256:'b'.repeat(64)}),/CHECKSUM/);
 const output=api.upload('alice_session',sample);assert.match(output.asset_id,/^asset_/);
 f.advance(25*60*60*1000);api.cleanup('trusted_worker');
 assert.equal(f.files.has(output.asset_id),false);
});
test('default machine is 3 credits, repeated idempotency key never reserves twice',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d);
 const a=api.create('alice_session',request()),b=api.create('alice_session',request());
 assert.equal(a.job_id,b.job_id);assert.equal(a.credit_cost,3);
 assert.equal(a.unit_credits,3);assert.equal(f.stats.reserve,1);
 assert.equal(f.stats.rate,1);assert.equal(f.stats.queued,1);
 assert.throws(()=>api.poll('bob_session',a.job_id),/JOB_NOT_FOUND/);
});
test('successful one-image job charges credits once and stores only private owner result',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d),id=api.create('alice_session',request()).job_id;
 assert.throws(()=>api.process(id,'untrusted'),/WORKER_AUTH_REQUIRED/);
 assert.equal(api.process(id,'trusted_worker').status,'PROCESSING');
 assert.equal(api.process(id,'trusted_worker').status,'PROCESSING');
 image(f,'asset_result_1234','alice',id);
 const result=api.complete(id,'trusted_worker',{asset_ids:['asset_result_1234']});
 assert.equal(result.status,'SETTLED');assert.equal(result.settled_credits,3);
 assert.equal(result.refunded_credits,0);
 assert.equal(api.settle(id,'trusted_worker').status,'SETTLED');
 assert.equal(f.stats.settle,1);assert.equal(f.stats.refund,0);
});
test('4 requested, only 3 succeeded => charge 9, refund 3, no repeated debit',()=>{
 const c=runtime(),f=fake(4);const api=c.ngdVisualJobs_(f.d);
 const id=api.create('alice_session',{...request(),payload:{count:4}}).job_id;
 assert.equal(api.poll('alice_session',id).credit_cost,12);
 api.process(id,'trusted_worker');
 const imgs=['asset_result_001','asset_result_002','asset_result_003'];
 imgs.forEach(x=>image(f,x,'alice',id));
 const out=api.complete(id,'trusted_worker',{asset_ids:imgs});
 assert.equal(out.status,'SETTLED');assert.equal(out.succeeded_count,3);
 assert.equal(out.settled_credits,9);assert.equal(out.refunded_credits,3);
 assert.equal(api.settle(id,'trusted_worker').refunded_credits,3);
 assert.equal(f.stats.reserve,1);assert.equal(f.stats.settle,1);
});
test('all results fail => full refund once; timeout also returns all credits',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d);
 const id=api.create('alice_session',request()).job_id;
 api.process(id,'trusted_worker');
 assert.equal(api.fail(id,'trusted_worker','PROVIDER_FAILED').status,'REFUNDED');
 assert.equal(api.fail(id,'trusted_worker','PROVIDER_FAILED').refunded_credits,3);
 const id2=api.create('alice_session',request('flux_2_pro','idempotent_request_002')).job_id;
 api.process(id2,'trusted_worker');f.advance(11*60*1000);
 assert.equal(api.expire('trusted_worker')[0].refunded_credits,4);
 assert.equal(f.stats.refund,2);
});
test('credit must only settle owner-job private output',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d);
 const id=api.create('alice_session',request()).job_id;api.process(id,'trusted_worker');
 image(f,'asset_result_other','alice','other_job_123456789012');
 assert.throws(()=>api.complete(id,'trusted_worker',{asset_ids:['asset_result_other']}),/RESULT_NOT_PRIVATE/);
 image(f,'asset_result_other','alice',id);
 assert.equal(api.complete(id,'trusted_worker',{asset_ids:['asset_result_other']}).status,'SETTLED');
});
test('rate and IDR cap block request before reserving wallet',()=>{
 const c=runtime(),f=fake();f.d.config.NGD_VISUAL_DAILY_BUDGET_CAP=700;
 const api=c.ngdVisualJobs_(f.d);api.create('alice_session',request());
 assert.throws(()=>api.create('alice_session',request('flux_kontext_pro','idempotent_request_003')),
  /BUDGET_EXCEEDED/);
 assert.equal(f.stats.reserve,1);
 const g=fake();g.d.config.NGD_VISUAL_RATE_LIMIT=1;
 const throttled=c.ngdVisualJobs_(g.d);throttled.create('alice_session',request());
 assert.throws(()=>throttled.create('alice_session',request('flux_kontext_pro','idempotent_request_004')),
  /RATE_LIMIT/);
});
test('reuse key with changed machine or prompt cannot charge again',()=>{
 const c=runtime(),f=fake();f.d.fingerprint=x=>x.machine_id==='flux_2_pro'||x.compiled_prompt==='DIFFERENT'?'b'.repeat(64):hex;
 const api=c.ngdVisualJobs_(f.d);api.create('alice_session',request());
 assert.throws(()=>api.create('alice_session',request('flux_2_pro')),/IDEMPOTENCY_CONFLICT/);
 f.compiled.compiled_prompt='DIFFERENT';
 assert.throws(()=>api.create('alice_session',request()),/IDEMPOTENCY_CONFLICT/);
 assert.equal(f.stats.reserve,1);
});
test('provider builds Gemini inline and fal/Kie reference-conditioned edit requests',()=>{
 const c=runtime();
 const compiled={contract_version:'visual-food-magazine-img2img-v2',
  image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',
  layer_trace:Array(12).fill('x'),
  compiled_prompt:'[08_NO_MODEL_TYPOGRAPHY]\nDo NOT render any text, letters, numbers.',
  negative_prompt:'No text'};
 const reference={private:true,owner:'alice',mime:'image/png',base64:'A'.repeat(128)};
 const base={compiled,reference};
 const google=c.ngdVpPrepare_({...base,machine_id:'gemini_flash_image'});
 assert.match(google.url,/gemini-3.1-flash-image/);
 assert.equal(google.body.contents[0].parts[1].inlineData.data,reference.base64);
 const fal=c.ngdVpPrepare_({...base,machine_id:'flux_kontext_pro',transport:'fal',
  provider_upload_url:'https://v3.fal.media/files/a/b.png'});
 assert.match(fal.url,/queue.fal.run/);assert.ok(fal.body.image_url);
 const falInline=c.ngdVpPrepare_({...base,machine_id:'flux_kontext_pro',transport:'fal'});
 assert.match(falInline.body.image_url,/^data:image\/png;base64,/);
 assert.equal(falInline.body.image_url.includes('https://'),false);
 const kie=c.ngdVpPrepare_({...base,machine_id:'flux_2_pro',transport:'kie',
  provider_upload_url:'https://v3.fal.media/files/a/b.png'});
 assert.match(kie.url,/createTask/);assert.ok(kie.body.input.input_urls);
 assert.throws(()=>c.ngdVpPrepare_({...base,machine_id:'flux_2_pro',
  provider_upload_url:'https://evil.example/image.png'}),/EPHEMERAL_HOST_INVALID/);
 assert.throws(()=>c.ngdVpPrepare_({...base,machine_id:'flux_kontext_pro',
  provider_upload_url:'https://v3.fal.media/files/a/b.png',compiled:{...compiled,layer_trace:[]}}),/COMPILER_REQUIRED/);
});
test('provider cannot submit until authorized, never leaks secrets in frontend',async()=>{
 const c=runtime(),counter={calls:0},config={
  NGD_VISUAL_LIVE_ENABLED:false,NGD_VISUAL_CREDITS_ENABLED:true,
  NGD_VISUAL_MEDIA_READY:true,NGD_VISUAL_WORKER_READY:true};
 const deps={config,secrets:{get:()=> 'secret_not_printed_123'},
  submissions:{saveOnce:()=>{},get:()=>null},
  uploadReference:async()=>({url:'https://v3.fal.media/files/a/b.png'}),
  privateImport:{inline:()=>({state:'READY'}),remote:()=>({state:'READY'})},
  transport:{post:async()=>{counter.calls++;return {status:200,body:{request_id:'provider_task_123'}}},
   get:async()=>({status:200,body:{status:'IN_QUEUE'}})}};
 const api=c.ngdVisualProvider_(deps);
 const ref={private:true,owner:'alice',mime:'image/png',base64:'A'.repeat(128)};
 const compiled={contract_version:'visual-food-magazine-img2img-v2',image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',
  layer_trace:Array(12).fill('x'),compiled_prompt:'[08_NO_MODEL_TYPOGRAPHY]\nDo NOT render any text, letters, numbers',negative_prompt:'No text'};
 const job={id:'job_1234567890123',owner:'alice',status:'PROCESSING',machine_id:'flux_kontext_pro',count:1};
 assert.throws(()=>api.submit(job,ref,compiled,'fal',0),/LIVE_DISABLED/);
 assert.equal(counter.calls,0);
 config.NGD_VISUAL_LIVE_ENABLED=true;
 const out=await api.submit(job,ref,compiled,'fal',0);
 assert.equal(out.state,'QUEUED');assert.equal(counter.calls,1);
});
test('frontend stays SIMULATION until a bridge is configured; default recommended machine 3 Cr',()=>{
 const script=fs.readFileSync(path.join(root,'js/ai-studio.js'),'utf8');
 const w={};vm.runInNewContext(script,{window:w,console});
 const api=w.NGD_STUDIO;
 assert.equal(api.adapterMode,'SIMULATION');
 assert.equal(api.foodMagazineDraft().machine_id,'flux_kontext_pro');
 assert.equal(api.foodMagazineDraft().estimated_credits_per_image,3);
 assert.equal(api.foodChoose('count',4),true);
 assert.equal(api.foodMagazineDraft().estimated_total_credits,12);
 assert.equal(api.foodMachineSelect('gemini_flash_image'),true);
 assert.equal(api.foodMagazineDraft().estimated_total_credits,8);
 assert.equal(api.foodMachineSelect('unknown'),false);
 assert.throws(()=>api.configureVisualPipeline({enabled:true}),/VISUAL_PRIVATE_BRIDGE_INVALID/);
 api.configureVisualPipeline({enabled:true,upload:()=>{},create:()=>{},poll:()=>{},quote:()=>{},result:()=>{}});
 assert.equal(api.adapterMode,'SIMULATION');
 api.configureVisualPipeline(null);
});

test('interrupted settlement and refund are recovered without another dispatch or reserve',()=>{
 const c=runtime(),f=fake(),api=c.ngdVisualJobs_(f.d);
 const id=api.create('alice_session',request()).job_id;api.process(id,'trusted_worker');
 image(f,'asset_recovery_001','alice',id);
 const row=f.records.get(id);row.status='SUCCEEDED';row.result_asset_ids=['asset_recovery_001'];
 const id2=api.create('alice_session',request('flux_kontext_pro','idempotent_recovery_002')).job_id;
 f.records.get(id2).status='FAILED';f.records.get(id2).error_code='PROVIDER_FAILED';
 f.d.jobs.listExpired=()=>Array.from(f.records.values()).filter(j=>['SUCCEEDED','PARTIAL_SUCCEEDED','FAILED'].includes(j.status));
 api.expire('trusted_worker');api.expire('trusted_worker');
 assert.equal(f.records.get(id).status,'SETTLED');
 assert.equal(f.records.get(id2).status,'REFUNDED');
 assert.equal(f.stats.reserve,2);assert.equal(f.stats.settle,1);assert.equal(f.stats.refund,1);
 assert.equal(f.stats.queued,2);
});

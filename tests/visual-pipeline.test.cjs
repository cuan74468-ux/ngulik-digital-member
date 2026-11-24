'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const script=name=>fs.readFileSync(path.join(base,'apps-script',name),'utf8');
function runtime(){
 const context=vm.createContext({console,Promise});
 for(const file of ['VisualJobs.gs','VisualProvider.gs'])vm.runInContext(script(file),context,{filename:file});
 return context;
}
const hex='a'.repeat(64),ref='asset_valid123456',idempotency='idempotent_request_001';
function fake(){
 let time=1700000000000,sequence=0;
 const items=new Map(),byScope=new Map(),files=new Map(),ledger=new Map(),heldBudget=new Map(),queues=new Set();
 const counter={reserve:0,settle:0,refund:0,budget:0,queued:0,upstream:0};
 const compiled={
  contract_version:'visual-food-magazine-img2img-v2',
  image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',release_authorized:false,
  image_count:1,option_ids:{food_type:'soup'},
  overlay_specification:{enabled:false},
  compiled_prompt:'x',media_contract:{reference_asset_id:ref}
 };
 const deps={
  config:{NGD_VISUAL_LIVE_ENABLED:true,NGD_MUTATIONS_ENABLED:true,NGD_FINANCE_ENABLED:true,daily_budget_cap_idr:10000},
  auth:{requireMember:s=>s==='alice_session'?{member_id:'alice'}:s==='bob_session'?{member_id:'bob'}:null,requireWorker:w=>w==='trusted_worker'},
  media:{putPrivate:o=>{const id='asset_upload_'+String(++sequence).padStart(7,'0');const item={id,owner:o.owner,private:true,mime:o.mime,bytes:o.bytes,expires_at:o.expires_at};files.set(id,item);return {asset_id:id,expires_at:item.expires_at}},
   getOwned:(id,member,now)=>{const f=files.get(id);return f&&f.owner===member&&f.expires_at>now?f:null;},purgeExpired:now=>{let count=0;for(const [id,v] of files)if(v.expires_at<=now){files.delete(id);count++}return count}},
  jobs:{newId:()=> 'job_'+String(++sequence).padStart(13,'0'),
   createUnique:(scope,digest,fn)=>{
    const old=byScope.get(scope);
    if(old)return old;
    const job=fn();items.set(job.id,job);byScope.set(scope,job);return job;
   },get:id=>items.get(id),
   compareAndSwap:(id,from,to,patch)=>{const job=items.get(id);if(!job||job.status!==from)return false;job.status=to;Object.assign(job,patch);return true},
   listExpired:(now,limit)=>[...items.values()].filter(j=>j.expires_at<now&&['PROCESSING','RESERVED'].includes(j.status)).slice(0,limit)},
  ledger:{reserveOnce:(id,user,credits)=>{if(!ledger.has(id)){ledger.set(id,'reserved');counter.reserve++}},
   settleOnce:id=>{if(ledger.get(id)==='reserved'){ledger.set(id,'settled');counter.settle++}else if(ledger.get(id)!=='settled')throw Error('LEDGER_NOT_RESERVED')},
   releaseOnce:id=>{if(ledger.get(id)==='reserved'){ledger.set(id,'released');counter.refund++}}},
  budget:{reserveDaily:(id,amount,cap)=>{
   if(!heldBudget.has(id)){const total=[...heldBudget.values()].reduce((sum,v)=>sum+v.amount,0);
    if(total+amount>cap)throw Error('BUDGET_EXCEEDED');heldBudget.set(id,{amount,status:'reserved'});counter.budget++;}},
   settleOnce:id=>{if(heldBudget.has(id))heldBudget.get(id).status='settled';},
   releaseOnce:id=>{if(heldBudget.has(id)){heldBudget.delete(id);}}},
  queue:{enqueueOnce:id=>{if(!queues.has(id)){queues.add(id);counter.queued++}}},
  clock:{now:()=>time},quote:(tier,count)=>count*(tier==='hd'?900:600),
  compile:()=>compiled,fingerprint:()=>hex,hashBytes:()=>hex
 };
 files.set(ref,{id:ref,owner:'alice',private:true,expires_at:time+1000000});
 return {deps,counter,compiled,files,items,ledger,queues,advance:ms=>{time+=ms}};
}
function createRequest(){return {idempotency_key:idempotency,tier:'standard',payload:{}}}
test('default config fails closed for live, global P0 gates and daily cap',()=>{
 const r=runtime(),f=fake(),engine=r.ngdVisualJobs_({...f.deps,config:{}});
 assert.equal(engine.policy.live,false);
 assert.throws(()=>engine.create('alice_session',createRequest()),/LIVE_DISABLED/);
 for(const key of ['NGD_MUTATIONS_ENABLED','NGD_FINANCE_ENABLED']){
  const config={...f.deps.config,[key]:false};
  assert.throws(()=>r.ngdVisualJobs_({...f.deps,config}).create('alice_session',createRequest()),/P0_GUARD_OFF/);
 }
 const config={...f.deps.config,daily_budget_cap_idr:0};
 assert.throws(()=>r.ngdVisualJobs_({...f.deps,config}).create('alice_session',createRequest()),/BUDGET_CAP_REQUIRED/);
});
test('private upload validates membership, MIME, size, signature and TTL',()=>{
 const r=runtime(),f=fake(),api=r.ngdVisualJobs_(f.deps);
 const bytes=[137,80,78,71,13,10,26,10,0,0,0,0];
 const sample={mime:'image/png',bytes,size:bytes.length,sha256:hex};
 assert.throws(()=>api.upload('bob_invalid',sample),/SESSION_REQUIRED/);
 assert.throws(()=>api.upload('alice_session',{...sample,mime:'image/svg+xml'}),/MIME/);
 assert.throws(()=>api.upload('alice_session',{...sample,size:1}),/SIGNATURE_MISMATCH/);
 assert.throws(()=>api.upload('alice_session',{...sample,bytes:new Array(12).fill(0)}),/SIGNATURE_MISMATCH/);
 assert.throws(()=>api.upload('alice_session',{...sample,sha256:'b'.repeat(64)}),/CHECKSUM_MISMATCH/);
 const u=api.upload('alice_session',sample);assert.match(u.asset_id,/^asset_/);
 assert.ok(f.files.has(u.asset_id));
 f.advance(25*60*60*1000);api.cleanup('trusted_worker');assert.equal(f.files.has(u.asset_id),false);
});
test('atomic idempotency prevents double reservation and duplicate queue',()=>{
 const r=runtime(),f=fake(),api=r.ngdVisualJobs_(f.deps);
 const one=api.create('alice_session',createRequest()),two=api.create('alice_session',createRequest());
 assert.equal(one.job_id,two.job_id);assert.equal(one.status,'RESERVED');
 assert.equal(one.credit_cost,2);
 assert.equal(f.counter.reserve,1);assert.equal(f.counter.budget,1);assert.equal(f.counter.queued,1);
 assert.throws(()=>api.poll('bob_session',one.job_id),/JOB_NOT_FOUND/);
 assert.throws(()=>api.create('bob_session',createRequest()),/MEDIA_OWNERSHIP_OR_EXPIRY/);
});
test('happy path CREATED/RESERVED/PROCESSING/SUCCEEDED/SETTLED is idempotent',()=>{
 const r=runtime(),f=fake(),api=r.ngdVisualJobs_(f.deps);
 const created=api.create('alice_session',createRequest()),id=created.job_id;
 assert.throws(()=>api.process(id,'invalid_worker'),/WORKER_AUTH_REQUIRED/);
 assert.equal(api.process(id,'trusted_worker').status,'PROCESSING');
 assert.equal(api.process(id,'trusted_worker').status,'PROCESSING');
 f.files.set('asset_result_1234',{owner:'alice',private:true,expires_at:1700001000000});
 const done=api.complete(id,'trusted_worker',{asset_ids:['asset_result_1234']});
 assert.equal(done.status,'SETTLED');assert.deepEqual(Array.from(done.result_asset_ids),['asset_result_1234']);
 assert.equal(api.settle(id,'trusted_worker').status,'SETTLED');
 assert.equal(f.counter.settle,1);
 assert.equal(api.fail(id,'trusted_worker','PROVIDER_FAILED').status,'SETTLED');
 assert.equal(f.counter.refund,0);
});
test('provider failure and timeout refund exactly once, no double settlement',()=>{
 const r=runtime(),f=fake(),api=r.ngdVisualJobs_(f.deps);
 const id=api.create('alice_session',createRequest()).job_id;
 api.process(id,'trusted_worker');
 assert.equal(api.fail(id,'trusted_worker','PROVIDER_FAILED').status,'REFUNDED');
 assert.equal(api.fail(id,'trusted_worker','PROVIDER_FAILED').status,'REFUNDED');
 assert.equal(f.counter.refund,1);assert.equal(f.counter.settle,0);
 const id2=api.create('alice_session',{...createRequest(),idempotency_key:'idempotent_request_002'}).job_id;
 api.process(id2,'trusted_worker');
 f.advance(11*60*1000);
 const expired=api.expire('trusted_worker');assert.equal(expired.length,1);
 assert.equal(expired[0].status,'REFUNDED');assert.equal(f.counter.refund,2);
});
test('budget cap blocks expensive concurrent generation and never reserves credits',()=>{
 const r=runtime(),f=fake();f.deps.config.daily_budget_cap_idr=700;
 const api=r.ngdVisualJobs_(f.deps);
 api.create('alice_session',createRequest());
 assert.throws(()=>api.create('alice_session',{...createRequest(),idempotency_key:'idempotent_request_003'}),/BUDGET_EXCEEDED/);
 assert.equal(f.counter.reserve,1);
});
test('provider mapping requires image reference, tier, 12 layers and forbids typography',()=>{
 const r=runtime(),compiled={contract_version:'visual-food-magazine-img2img-v2',
  image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',layer_trace:Array(12).fill('layer'),
  compiled_prompt:'Do NOT render any text, letters, numbers. Retouch food photograph.',
  negative_prompt:'No letters'};
 const good={tier:'standard',provider:'flux_kontext_pro',compiled,image_base64:'A'.repeat(120),mime:'image/png'};
 const spec=r.ngdVpPrepare_(good);
 assert.equal(spec.body.input_image,good.image_base64);
 assert.equal(spec.auth_scheme,'x-key');
 assert.equal(spec.asynchronous,true);
 assert.throws(()=>r.ngdVpPrepare_({...good,image_base64:''}),/PRIVATE_REFERENCE_REQUIRED/);
 assert.throws(()=>r.ngdVpPrepare_({...good,provider:'flux2_pro'}),/TIER_PROVIDER_MISMATCH/);
 assert.throws(()=>r.ngdVpPrepare_({...good,compiled:{...compiled,layer_trace:[]}}),/COMPILER_REQUIRED/);
 assert.throws(()=>r.ngdVpPrepare_({...good,compiled:{...compiled,compiled_prompt:'hello'}}),/TYPOGRAPHY_GUARD/);
 const hd=r.ngdVpPrepare_({...good,tier:'hd',provider:'flux2_pro'});assert.match(hd.url,/flux-2-pro/);
 const gem=r.ngdVpPrepare_({...good,provider:'gemini_flash_image'});
 assert.equal(gem.body.contents[0].parts[1].inlineData.data,good.image_base64);
 assert.equal(gem.auth_scheme,'x-goog-api-key');
});
test('provider stays inactive until flags and owner-bound private asset',async()=>{
 const r=runtime(),counter={calls:0},id='job_1234567890123';
 const context={job:{id,status:'PROCESSING',tier:'standard',owner:'alice'},member:'alice',
  asset:{private:true,owner:'alice',mime:'image/jpeg',bytes_base64:'A'.repeat(120)},
  compiled:{contract_version:'visual-food-magazine-img2img-v2',image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',
   layer_trace:Array(12).fill('x'),compiled_prompt:'Do NOT render any text, letters, numbers.',negative_prompt:'No text'},
  provider:'flux_kontext_pro'};
 const deps={config:{NGD_VISUAL_LIVE_ENABLED:false,NGD_MUTATIONS_ENABLED:true,NGD_FINANCE_ENABLED:true},
  secrets:{get:()=> 'secret_abcdefghijkl'},store:{saveSubmissionOnce:()=>{},ownsSubmission:()=>true},
  transport:{post:async()=>{counter.calls++;return {status:200,body:{id:'provider_id_123'}}},
   get:async()=>({status:200,body:{status:'Pending'}})}};
 const api=r.ngdVpAdapter_(deps);
 assert.throws(()=>api.submit(context),/LIVE_DISABLED/);
 assert.equal(counter.calls,0);
 deps.config.NGD_VISUAL_LIVE_ENABLED=true;
 await api.submit(context);assert.equal(counter.calls,1);
 assert.equal(api.options('hd')[0],'flux2_pro');
 assert.equal(api.recoverableFailure('UPSTREAM_BUSY'),true);
 assert.equal(api.recoverableFailure('UNKNOWN_BILLING'),false);
});


test('reusing an idempotency key with different private recipe is rejected',()=>{
 const r=runtime(),f=fake();
 f.deps.fingerprint=details=>details.compiled_prompt==='OTHER'?'b'.repeat(64):hex;
 const api=r.ngdVisualJobs_(f.deps);
 api.create('alice_session',createRequest());
 f.compiled.compiled_prompt='OTHER';
 assert.throws(()=>api.create('alice_session',createRequest()),/IDEMPOTENCY_CONFLICT/);
 assert.equal(f.counter.reserve,1);
});
test('BFL result URL cannot redirect worker to arbitrary host',async()=>{
 const r=runtime(),job={id:'job_1234567890123',status:'PROCESSING'};
 let upstream='https://attacker.invalid/results/evil.png';
 const deps={config:{NGD_VISUAL_LIVE_ENABLED:true,NGD_MUTATIONS_ENABLED:true,NGD_FINANCE_ENABLED:true},
  secrets:{get:()=> 'secret_abcdefghijkl'},
  store:{saveSubmissionOnce:()=>{},ownsSubmission:()=>true},
  transport:{post:async()=>({status:200,body:{id:'provider_id_123'}}),
   get:async()=>({status:200,body:{status:'Ready',result:{sample:upstream}}})}};
 const api=r.ngdVpAdapter_(deps);
 await assert.rejects(api.pollBfl(job,'flux_kontext_pro','provider_id_123'),/UNTRUSTED_RESULT_HOST/);
 upstream='https://bfldeliveryprod.blob.core.windows.net/results/approved.png';
 const result=await api.pollBfl(job,'flux_kontext_pro','provider_id_123');
 assert.equal(result.status,'READY_PRIVATE_IMPORT_REQUIRED');
});
test('front-end private bridge is optional and simulated mode remains default',()=>{
 const source=fs.readFileSync(path.join(base,'js/ai-studio.js'),'utf8');
 const w={};vm.runInNewContext(source,{window:w,console});
 const api=w.NGD_STUDIO;
 assert.equal(api.adapterMode,'SIMULATION');
 assert.equal(api.foodMagazineDraft().estimated_credits_per_image,2);
 assert.throws(()=>api.configureVisualPipeline({enabled:true}),/VISUAL_PRIVATE_BRIDGE_INVALID/);
 api.configureVisualPipeline({enabled:true,upload:()=>{},create:()=>{},poll:()=>{}});
 assert.equal(api.adapterMode,'SIMULATION');
 api.configureVisualPipeline(null);
 assert.equal(api.foodChoose('count',4),true);
 assert.equal(api.foodMagazineDraft().estimated_total_credits,8);
});

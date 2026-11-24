'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const fileContent=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
function harness(){
 let now=1700000000000,serial=1;
 const files=new Map(),folderId='1a2B3c4D5e6F7g8H9i0J1k2L';
 const folder={getId:()=>folderId,getSharingAccess:()=> 'PRIVATE',
  createFile(...args){
   let name,buf,mime;
   if(args.length===1){buf=Buffer.from(args[0].getBytes());mime=args[0].mime||'image/png';name='ngd-visual-image'}
   else{name=args[0];buf=Buffer.from(args[1]);mime=args[2]}
   const id='drive_file_id_'+String(++serial).padStart(20,'0');
   let description='',trashed=false;
   const obj={getId:()=>id,getName:()=>name,getSharingAccess:()=> 'PRIVATE',
    getDescription:()=>description,setDescription:v=>{description=v},
    isTrashed:()=>trashed,setTrashed:v=>{trashed=v},
    getParents:()=>iterator([folder]),
    getBlob:()=>({getBytes:()=>Array.from(buf),getDataAsString:()=>buf.toString('utf8')}),
    setContent:data=>{buf=Buffer.from(data)},getMimeType:()=>mime};
   files.set(id,obj);return obj;
  },getFilesByName:name=>iterator([...files.values()].filter(x=>x.getName()===name&&!x.isTrashed())),
  getFiles:()=>iterator([...files.values()].filter(x=>!x.isTrashed()))};
 const iterator=values=>{let at=0;return {hasNext:()=>at<values.length,next:()=>values[at++]};};
 const props={'NGD_VISUAL_PRIVATE_FOLDER_ID':folderId};
 const ctx=vm.createContext({
  console,Date,Uint8Array,Array,JSON,MimeType:{PLAIN_TEXT:'text/plain'},
  DriveApp:{Access:{PRIVATE:'PRIVATE'},getFolderById:id=>{if(id!==folderId)throw Error('NOT_FOUND');return folder;},
   getFileById:id=>{const v=files.get(id);if(!v)throw Error('NOT_FOUND');return v;}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]||null})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  Utilities:{getUuid:()=>crypto.randomUUID(),
   computeDigest:(_,bytes)=>Array.from(crypto.createHash('sha256').update(Buffer.from(bytes)).digest()),
   DigestAlgorithm:{SHA_256:'SHA_256'},
   base64Decode:s=>Array.from(Buffer.from(s,'base64')),
   base64Encode:bytes=>Buffer.from(bytes).toString('base64'),
   newBlob:(bytes,mime)=>({mime,getBytes:()=>Array.from(bytes)})}
 });
 for(const name of ['VisualSkills.gs','VisualJobs.gs','VisualMedia.gs','VisualStore.gs','VisualRuntime.gs','VisualTemplates.gs'])
  vm.runInContext(fileContent(name),ctx,{filename:name});
 const auth={requireMember:s=>s==='alice_token'?{member_id:'alice'}:
  s==='bob_token'?{member_id:'bob'}:null,
  requireWorker:s=>s==='worker'};
 return {ctx,auth,folder,files,props,now:()=>now,advance:ms=>{now+=ms}};
}
test('GAS private media retains opaque handle and enforces session, parent and expiry',()=>{
 const h=harness();
 const bytes=[137,80,78,71,13,10,26,10,0,0,0,0];
 const base64=Buffer.from(bytes).toString('base64');
 const media=h.ctx.ngdVisualMediaDrive_({auth:h.auth,now:h.now});
 assert.throws(()=>media.upload('unknown',{mime:'image/png',base64}),/SESSION_REQUIRED/);
 assert.throws(()=>media.upload('alice_token',{mime:'image/svg+xml',base64}),/MIME_INVALID/);
 const result=media.upload('alice_token',{mime:'image/png',base64});
 assert.match(result.asset_id,/^asset_/);
 const own=media.getOwned(result.asset_id,'alice',h.now());
 assert.equal(own.private,true);
 assert.equal(media.getOwned(result.asset_id,'bob',h.now()),null);
 assert.throws(()=>media.download('bob_token',result.asset_id,'job_1234567890123456'));
 h.advance(25*60*60*1000);
 assert.equal(media.getOwned(result.asset_id,'alice',h.now()),null);
 const clean=media.purgeExpired(h.now(),100);
 assert.equal(clean.purged,1);
});
test('Drive store safely reserves, settles partial and refunds only the remainder',()=>{
 const h=harness(),store=h.ctx.ngdVisualStoreDrive_({now:h.now});
 // Separate pilot-only wallet is explicitly funded by an out-of-band
 // owner-controlled operation. This is an in-memory fixture, not P0 data.
 store.snapshot();
 const initial=h.files.values().next().value;
 const state=JSON.parse(initial.getBlob().getDataAsString());
 state.wallets.alice={available:20,held:0};
 initial.setContent(JSON.stringify(state));
 const job='job_1234567890123';
 store.jobs.createUnique('alice:idempotency_A','a'.repeat(64),()=>{
  store.rate.consumeOnce(job,'alice',3,h.now());
  store.budget.reserveDaily(job,1000,5000,h.now());
  store.ledger.reserveOnce(job,'alice',12);
  store.queue.enqueueOnce(job);
  return {id:job,owner:'alice',fingerprint:'a'.repeat(64),status:'RESERVED',
   count:4,credit_cost:12,created_at:h.now()};
 });
 assert.equal(store.ledger.balance('alice').available,8);
 assert.equal(store.ledger.balance('alice').held,12);
 assert.equal(store.jobs.createUnique('alice:idempotency_A','a'.repeat(64),()=>{throw Error('double')} ).id,job);
 assert.throws(()=>store.jobs.createUnique('alice:idempotency_A','b'.repeat(64),()=>{}),/IDEMPOTENCY_CONFLICT/);
 store.ledger.settleOnce(job,9,3);store.ledger.settleOnce(job,9,3);
 assert.equal(store.ledger.balance('alice').available,11);
 assert.equal(store.ledger.balance('alice').held,0);
 assert.throws(()=>store.ledger.releaseOnce(job),/REFUND_AFTER_SETTLEMENT/);
 assert.throws(()=>store.ledger.settleOnce(job,8,4),/LEDGER_REPLAY_CONFLICT/);
});
test('Drive store preserves conservative daily budget and per-member throttle',()=>{
 const h=harness(),st=h.ctx.ngdVisualStoreDrive_({now:h.now});
 st.rate.consumeOnce('job_1111111111111111','alice',1,h.now());
 assert.throws(()=>st.rate.consumeOnce('job_2222222222222222','alice',1,h.now()),
  /RATE_LIMIT_EXCEEDED/);
 st.budget.reserveDaily('job_1111111111111111',900,1000,h.now());
 st.budget.releaseOnce('job_1111111111111111');
 assert.throws(()=>st.budget.reserveDaily('job_2222222222222222',200,1000,h.now()),
  /DAILY_BUDGET_EXCEEDED/);
});
test('slot transitions cannot duplicate an upstream submission',()=>{
 const h=harness(),st=h.ctx.ngdVisualStoreDrive_({now:h.now});
 st.slots.initialize('job_1234567890123',4);
 const a=st.slots.claimNew('job_1234567890123',4);
 const b=st.slots.claimNew('job_1234567890123',4);
 assert.equal(a.index,0);assert.equal(b.index,1);
 assert.throws(()=>st.slots.mark('job_1234567890123',0,'NEW','QUEUED'),
  /SLOT_CONCURRENT/);
 st.slots.mark('job_1234567890123',0,'SUBMITTING','QUEUED');
 st.slots.mark('job_1234567890123',0,'QUEUED','SUCCEEDED','asset_result_12345');
 st.slots.mark('job_1234567890123',1,'SUBMITTING','FAILED',null,'PROVIDER_FAILED');
 st.slots.expireUncertain('job_1234567890123',4);
 const summary=st.slots.summary('job_1234567890123',4);
 assert.equal(summary.all_terminal,true);
 assert.equal(summary.succeeded.length,1);
 assert.equal(summary.failed,3);
});


test('member-owned reusable templates survive new store instance and reject cross-member edits',()=>{
 const h=harness();
 const store=h.ctx.ngdVisualStoreDrive_({now:h.now});
 const payload={name:'Madu Ku 4:5',product_category:'bottled_liquid',
  studio_scenario:'obsidian_mirror_splash',restoration_mode:'full_phone_restoration',
  format:'4:5',machine_id:'flux_kontext_pro',count:1,overlay_enabled:false};
 const clean=h.ctx.ngdVisualTemplateValidate_(
  vm.runInContext('('+JSON.stringify(payload)+')',h.ctx));
 const created=store.templates.save('alice',null,clean);
 assert.match(created.id,/^vt_[A-Za-z0-9_-]{12,50}$/);
 assert.equal(store.templates.list('alice').length,1);
 assert.equal(store.templates.list('bob').length,0);
 assert.throws(()=>store.templates.save('bob',created.id,clean),/TEMPLATE_NOT_OWNED/);
 assert.throws(()=>store.templates.remove('bob',created.id),/TEMPLATE_NOT_OWNED/);
 const reopened=h.ctx.ngdVisualStoreDrive_({now:h.now});
 assert.equal(reopened.templates.list('alice')[0].studio_scenario,'obsidian_mirror_splash');
 reopened.templates.save('alice',created.id,{...clean,name:'Madu Ku Edit'});
 assert.equal(reopened.templates.list('alice').length,1);
 assert.equal(reopened.templates.list('alice')[0].name,'Madu Ku Edit');
 for(let i=1;i<20;i++)reopened.templates.save('alice',null,{...clean,name:'Preset '+i});
 assert.equal(reopened.templates.list('alice').length,20);
 assert.throws(()=>reopened.templates.save('alice',null,clean),/TEMPLATE_QUOTA_EXCEEDED/);
 assert.deepEqual(reopened.ledger.balance('alice'),null);
 reopened.templates.remove('alice',created.id);
 assert.equal(reopened.templates.list('alice').length,19);
});

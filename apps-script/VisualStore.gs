/**
 * Visual-only GAS persistent state adapter, stored as a private JSON object
 * inside the configured Visual Drive folder. Never reads or writes member
 * payment tables or the P0 token ledger.
 *
 * This low-volume adapter is intended for a controlled pilot. LockService
 * guards all read-modify-write transactions; production at scale should
 * migrate to a transactional database before raising rate or budget limits.
 */
var NGD_VISUAL_STATE_FILENAME_='NGD_VISUAL_STATE_V1.json';
function ngdVsRequire_(ok,code){if(!ok)throw Error('VISUAL_STORE_'+code);}
function ngdVsBlank_(){
 return {version:1,jobs:{},scope:{},wallets:{},ledger:{},
  budget:{},rate:{},queue:{},submissions:{},slots:{},templates:{}};
}
function ngdVsFile_(){
 var folder=ngdVmDriveFolder_();
 var list=folder.getFilesByName(NGD_VISUAL_STATE_FILENAME_);
 if(list.hasNext()){
  var file=list.next();
  ngdVsRequire_(!list.hasNext()&&
   file.getSharingAccess()===DriveApp.Access.PRIVATE,'STATE_NOT_PRIVATE');
  return file;
 }
 var created=folder.createFile(NGD_VISUAL_STATE_FILENAME_,
  JSON.stringify(ngdVsBlank_()),MimeType.PLAIN_TEXT);
 ngdVsRequire_(created.getSharingAccess()===DriveApp.Access.PRIVATE,
  'CREATED_STATE_NOT_PRIVATE');
 return created;
}
function ngdVsRead_(file){
 var state;
 try{state=JSON.parse(file.getBlob().getDataAsString('UTF-8'));}
 catch(_){throw Error('VISUAL_STORE_JSON_CORRUPT');}
 ngdVsRequire_(state&&state.version===1&&state.jobs&&state.scope&&
  state.wallets&&state.ledger&&state.budget&&state.rate&&state.queue&&state.slots,
  'SCHEMA_CORRUPT');
 return state;
}
function ngdVisualStoreDrive_(clock){
 ngdVsRequire_(typeof LockService!=='undefined'&&typeof Utilities!=='undefined',
  'GAS_REQUIRED');
 var active=null;
 function now(){return clock?clock.now():Date.now();}
 function txn(fn){
  // Nested adapter calls mutate the same in-memory transaction. The only
  // entrypoint to this scope is the locked transaction itself.
  if(active)return fn(active);
  var lock=LockService.getScriptLock();
  ngdVsRequire_(lock.tryLock(15000),'LOCK_BUSY');
  try{
   var file=ngdVsFile_(),state=ngdVsRead_(file);
   active=state;
   var value=fn(state);
   // Save after success only; an exception never persists a partial
   // credit or budget reservation.
   var data=JSON.stringify(state);
   ngdVsRequire_(data.length<=8*1024*1024,'PILOT_STORE_TOO_LARGE');
   file.setContent(data);
   return value;
  }finally{active=null;lock.releaseLock();}
 }
 function read(fn){
  if(active)return fn(active);
  // Read from a durable snapshot, never mutate it.
  return fn(ngdVsRead_(ngdVsFile_()));
 }
 function id(){return 'job_'+Utilities.getUuid().replace(/-/g,'');}
 var jobs={
  newId:id,
  createUnique:function(scope,digest,create){
   return txn(function(state){
    var existing=state.scope[scope];
    if(existing){
     var found=state.jobs[existing];
     ngdVsRequire_(found&&found.fingerprint===digest,'IDEMPOTENCY_CONFLICT');
     return found;
    }
    var item=create();
    ngdVsRequire_(!state.jobs[item.id],'JOB_ID_COLLISION');
    state.jobs[item.id]=item;
    state.scope[scope]=item.id;
    return item;
   });
  },
  get:function(jobId){return read(function(s){return s.jobs[jobId]||null;});},
  compareAndSwap:function(id,expected,next,update){
   return txn(function(s){
    var job=s.jobs[id];
    if(!job||job.status!==expected)return false;
    job.status=next;
    Object.assign(job,update||{});
    return true;
   });
  },
  listExpired:function(time,cap){
   return read(function(s){return Object.keys(s.jobs).map(function(k){return s.jobs[k];})
    .filter(function(j){return ['SUCCEEDED','PARTIAL_SUCCEEDED','FAILED'].indexOf(j.status)>=0||
      (['RESERVED','PROCESSING'].indexOf(j.status)>=0&&j.expires_at<time);}).slice(0,Math.min(cap||50,100));});
  }
 };
 var ledger={
  reserveOnce:function(jobId,member,credits){
   txn(function(s){
    ngdVsRequire_(Number.isSafeInteger(credits)&&credits>0,'CREDITS_INVALID');
    if(s.ledger[jobId]){
     ngdVsRequire_(s.ledger[jobId].member===member&&
      s.ledger[jobId].reserved===credits,'LEDGER_CONFLICT');return;
    }
    // Visual wallet is separate; never debit actual P0 balances.
    var wallet=s.wallets[member];
    ngdVsRequire_(wallet&&Number.isSafeInteger(wallet.available)&&
     wallet.available>=credits,'INSUFFICIENT_VISUAL_CREDITS');
    wallet.available-=credits;wallet.held=(wallet.held||0)+credits;
    s.ledger[jobId]={member:member,reserved:credits,settled:0,refunded:0,state:'RESERVED'};
   });
  },
  settleOnce:function(jobId,charged,refunded){
   txn(function(s){
    var row=s.ledger[jobId];
    ngdVsRequire_(row&&charged>=0&&refunded>=0&&
     row.reserved===charged+refunded,'LEDGER_SETTLEMENT_INVALID');
    if(row.state==='SETTLED'){
     ngdVsRequire_(row.settled===charged&&row.refunded===refunded,
      'LEDGER_REPLAY_CONFLICT');return;
    }
    ngdVsRequire_(row.state==='RESERVED','LEDGER_NOT_RESERVED');
    var wallet=s.wallets[row.member];
    ngdVsRequire_(wallet&&wallet.held>=row.reserved,'WALLET_HELD_CORRUPT');
    wallet.held-=row.reserved;wallet.available+=refunded;
    row.settled=charged;row.refunded=refunded;row.state='SETTLED';
   });
  },
  releaseOnce:function(jobId){
   txn(function(s){
    var row=s.ledger[jobId];
    if(!row||row.state==='REFUNDED')return;
    ngdVsRequire_(row.state==='RESERVED','REFUND_AFTER_SETTLEMENT');
    var wallet=s.wallets[row.member];
    ngdVsRequire_(wallet&&wallet.held>=row.reserved,'WALLET_HELD_CORRUPT');
    wallet.held-=row.reserved;wallet.available+=row.reserved;
    row.refunded=row.reserved;row.state='REFUNDED';
   });
  },
  // Operator-only dedicated STAGING Visual wallet; never accepts an API action.
  // Idempotent one-time provision. No P0 token/financial Sheet interaction.
  provisionPilotOnce:function(member,credits){
   return txn(function(s){
    ngdVsRequire_(typeof member==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(member),
      'PILOT_MEMBER_INVALID');
    ngdVsRequire_(Number.isSafeInteger(credits)&&credits>=1&&credits<=20,
      'PILOT_CREDIT_LIMIT');
    ngdVsRequire_(!s.wallets[member]&&
      !Object.values(s.ledger).some(function(row){return row.member===member;}),
      'PILOT_WALLET_ALREADY_EXISTS');
    s.wallets[member]={available:credits,held:0};
    return {member_id:member,available:credits,held:0,
      funding_source:'STAGING_VISUAL_TEST_ONLY'};
   });
  },
  balance:function(member){
   return read(function(s){
    var w=s.wallets[member];
    return w?{available:w.available,held:w.held||0}:null;
   });
  }
 };
 var budget={
  reserveDaily:function(id,estimate,cap,time){
   txn(function(s){
    var key=new Date(time).toISOString().slice(0,10);
    ngdVsRequire_(Number.isSafeInteger(estimate)&&estimate>0&&
     Number.isSafeInteger(cap)&&cap>0,'BUDGET_CONFIGURATION');
    var total=Object.keys(s.budget).reduce(function(n,k){
     var b=s.budget[k];return n+(b.day===key?b.estimate:0);},0);
    if(s.budget[id])return;
    ngdVsRequire_(total+estimate<=cap,'DAILY_BUDGET_EXCEEDED');
    s.budget[id]={day:key,estimate:estimate,state:'HELD'};
   });
  },
  // Conservative guard: keep committed provider budget occupied all day
  // even if output fails, because upstream calls may still be billed.
  settleOnce:function(id,success,count){
   txn(function(s){if(s.budget[id])s.budget[id].state='COMMITTED';});
  },
  releaseOnce:function(id){
   txn(function(s){if(s.budget[id])s.budget[id].state='CONSERVATIVE_COMMITTED';});
  }
 };
 var rate={
  consumeOnce:function(jobId,member,limit,time){
   txn(function(s){
    if(s.rate[jobId])return;
    var hour=Math.floor(time/(60*60*1000));
    var n=Object.keys(s.rate).filter(function(k){
     return s.rate[k].member===member&&s.rate[k].hour===hour;
    }).length;
    ngdVsRequire_(n<limit,'RATE_LIMIT_EXCEEDED');
    s.rate[jobId]={member:member,hour:hour};
   });
  },
  releaseOnce:function(jobId){
   // A rejected job still counts against an abuse throttle.
   txn(function(s){if(s.rate[jobId])s.rate[jobId].rejected=true;});
  }
 };
 var queue={
  enqueueOnce:function(id){
   txn(function(s){if(!s.queue[id])s.queue[id]={enqueued_at:now(),attempts:0};});
  },
  next:function(limit){
   return read(function(s){return Object.keys(s.queue).filter(function(id){
     var j=s.jobs[id];return j&&['RESERVED','PROCESSING','SUCCEEDED','PARTIAL_SUCCEEDED','FAILED'].indexOf(j.status)>=0;
   }).slice(0,Math.min(limit||2,10));});
  }
 };
 var submissions={
  saveOnce:function(jobId,record){
   txn(function(s){
    if(s.submissions[jobId]){
     ngdVsRequire_(JSON.stringify(s.submissions[jobId])===JSON.stringify(record),
      'UPSTREAM_TASK_CONFLICT');return;
    }
    s.submissions[jobId]=record;
   });
  },
  get:function(jobId){return read(function(s){return s.submissions[jobId]||null;});}
 };

 var slots={
  initialize:function(jobId,count){
   txn(function(s){
    ngdVsRequire_(Number.isInteger(count)&&[1,2,4].indexOf(count)>=0,'SLOT_COUNT');
    for(var n=0;n<count;n++){
     var id=jobId+'_'+n;
     if(!s.slots[id])s.slots[id]={job_id:jobId,index:n,state:'NEW',asset_id:null,error_code:null};
    }
   });
  },
  claimNew:function(jobId,count){
   return txn(function(s){
    for(var n=0;n<count;n++){
     var slot=s.slots[jobId+'_'+n];
     if(slot&&slot.state==='NEW'){
      slot.state='SUBMITTING';slot.updated_at=now();
      return {index:n,state:'SUBMITTING'};
     }
    }
    return null;
   });
  },
  findPolling:function(jobId,count){
   return read(function(s){
    for(var n=0;n<count;n++){
     var slot=s.slots[jobId+'_'+n];
     if(slot&&slot.state==='QUEUED')return {index:n,state:'QUEUED'};
    }
    return null;
   });
  },
  mark:function(jobId,index,from,to,assetId,errorCode){
   return txn(function(s){
    ngdVsRequire_(Number.isInteger(index)&&index>=0&&index<4,'SLOT_INDEX');
    var slot=s.slots[jobId+'_'+index];
    ngdVsRequire_(slot&&slot.state===from,'SLOT_CONCURRENT');
    ngdVsRequire_(['QUEUED','SUCCEEDED','FAILED'].indexOf(to)>=0,'SLOT_TRANSITION');
    slot.state=to;slot.asset_id=assetId||null;
    slot.error_code=errorCode||null;slot.updated_at=now();
    return true;
   });
  },
  summary:function(jobId,count){
   return read(function(s){
    var outcomes=[];
    for(var i=0;i<count;i++){
     var entry=s.slots[jobId+'_'+i];
     if(entry)outcomes.push({...entry});
    }
    return {all_terminal:outcomes.length===count&&outcomes.every(function(x){
     return ['SUCCEEDED','FAILED'].indexOf(x.state)>=0;}),
     succeeded:outcomes.filter(function(x){return x.state==='SUCCEEDED';})
      .map(function(x){return x.asset_id;}),
     failed:outcomes.filter(function(x){return x.state==='FAILED';}).length,
     pending:outcomes.filter(function(x){return x.state==='SUBMITTING'||x.state==='QUEUED';}).length,
     total:outcomes.length};
   });
  },
  expireUncertain:function(jobId,count){
   return txn(function(s){
    var affected=0;
    for(var n=0;n<count;n++){
     var slot=s.slots[jobId+'_'+n];
     if(slot&&['NEW','SUBMITTING','QUEUED'].indexOf(slot.state)>=0){
      slot.state='FAILED';slot.error_code='JOB_TIMEOUT';affected++;
     }
    }
    return affected;
   });
  }
 };

 var templates={
  list:function(member){
   ngdVsRequire_(typeof member==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(member),
    'TEMPLATE_MEMBER_INVALID');
   return read(function(state){
    var own=state.templates&&state.templates[member]||{};
    return Object.keys(own).map(function(id){return Object.assign({id:id},own[id]);})
     .sort(function(a,b){return b.updated_at-a.updated_at;})
     .slice(0,NGD_VISUAL_TEMPLATE_MAX_PER_MEMBER_);
   });
  },
  save:function(member,id,clean){
   ngdVsRequire_(typeof member==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(member),
    'TEMPLATE_MEMBER_INVALID');
   ngdVsRequire_(clean&&typeof clean==='object'&&!Array.isArray(clean),
    'TEMPLATE_INVALID');
   return txn(function(state){
    state.templates=state.templates||{};
    var own=state.templates[member]||(state.templates[member]={});
    if(id)ngdVsRequire_(Object.prototype.hasOwnProperty.call(own,id),
     'TEMPLATE_NOT_OWNED');
    if(!id){
     ngdVsRequire_(Object.keys(own).length<NGD_VISUAL_TEMPLATE_MAX_PER_MEMBER_,
      'TEMPLATE_QUOTA_EXCEEDED');
     id='vt_'+Utilities.getUuid().replace(/-/g,'');
    }
    var created=own[id]&&own[id].created_at||now();
    own[id]=Object.assign({},clean,{created_at:created,updated_at:now()});
    return Object.assign({id:id},own[id]);
   });
  },
  remove:function(member,id){
   ngdVsRequire_(typeof member==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(member),
    'TEMPLATE_MEMBER_INVALID');
   ngdVsRequire_(typeof id==='string'&&/^vt_[A-Za-z0-9_-]{12,50}$/.test(id),
    'TEMPLATE_ID_INVALID');
   return txn(function(state){
    state.templates=state.templates||{};
    var own=state.templates[member]||{};
    ngdVsRequire_(Object.prototype.hasOwnProperty.call(own,id),'TEMPLATE_NOT_OWNED');
    delete own[id];return {removed:true,id:id};
   });
  }
 };
 return {jobs:jobs,ledger:ledger,budget:budget,rate:rate,
  queue:queue,submissions:submissions,slots:slots,templates:templates,
  snapshot:function(){return read(function(s){return {
   jobs:Object.keys(s.jobs).length,
   reservations:Object.keys(s.ledger).length,
   wallets:Object.keys(s.wallets).length};});}};
}

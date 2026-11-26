/**
 * STAGING pilot source candidate. NOT installed in Apps Script runtime. No database writes, payments or provider calls. All functions
 * end in underscore to avoid exposing editor methods as public RPC.
 * Cache eviction denies access, never grants it.
 */
function ngdStudioGuard_(){
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
    props.getProperty('NGD_STUDIO_PILOT_ENABLED')==='true'&&!!dbId&&
    dbId===String(props.getProperty('NGD_STUDIO_PILOT_DB_ID')||'').trim(),
    'MAINTENANCE','Akses Studio belum tersedia.');
  require_(String(db_().getId())===dbId,'MAINTENANCE','Workspace Studio belum sesuai.');
  var secret=String(props.getProperty('NGD_STUDIO_TOKEN_SECRET')||'');
  require_(/^[a-fA-F0-9]{64}$/.test(secret),'MAINTENANCE','Akses Studio belum siap.');
  // Unique non-secret generation required on every activation or secret rotation.
  // Bind cached credentials to both the generation and the current HMAC key.
  var epoch=String(props.getProperty('NGD_STUDIO_PILOT_EPOCH')||'');
  require_(/^[a-f0-9]{32}$/.test(epoch),'MAINTENANCE','Generasi akses Studio belum siap.');
  var binding=hex_(Utilities.computeHmacSha256Signature('NGD_STUDIO_V1|epoch|'+epoch,secret,Utilities.Charset.UTF_8));
  var raw=String(props.getProperty('NGD_STUDIO_PILOT_MEMBER_IDS')||'').trim();
  var ids=raw?raw.split(',').map(function(s){return s.trim();}):[];
  require_(ids.length<=50&&ids.every(function(id){return /^M-[0-9]{1,12}$/.test(id);})&&
    new Set(ids).size===ids.length,'MAINTENANCE','Daftar akses Studio belum sesuai.');
  return {secret:secret,binding:binding,ids:ids,props:props,cache:CacheService.getScriptCache()};
}
function ngdStudioAllowed_(conf,m){
  return !!m&&m.role==='MEMBER'&&m.status==='AKTIF'&&conf.ids.indexOf(String(m.member_id))>=0;
}
function ngdStudioToken_(conf,purpose){
  return hex_(Utilities.computeHmacSha256Signature('NGD_STUDIO_V1|'+purpose+'|'+uuid_()+'|'+uuid_()+'|'+Date.now(),conf.secret,Utilities.Charset.UTF_8));
}
function ngdStudioKey_(kind,id){return 'NGD_STUDIO_V1:'+kind+':'+id;}
function ngdStudioHash_(token){
  require_(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'UNAUTHORIZED','Akses Studio tidak valid.');
  return sha256_(token);
}
function ngdStudioRead_(cache,key){
  var raw=cache.get(key);
  if(typeof raw!=='string'||raw.length>2048)return null;
  try{return JSON.parse(raw);}catch(ignore){return null;}
}
function ngdStudioParent_(conf,record){
  require_(record&&record.binding===conf.binding&&typeof record.member_id==='string'&&typeof record.parent_hash==='string'&&
    /^[a-f0-9]{64}$/i.test(record.parent_hash)&&Number.isFinite(record.expires_at)&&record.expires_at>Date.now(),
    'UNAUTHORIZED','Akses Studio berakhir.');
  var sessions=findRows_('sessions',function(s){return String(s.token_hash)===record.parent_hash;});
  require_(sessions.length===1&&sessions[0].member_id===record.member_id&&sessions[0].role==='MEMBER'&&
    Number.isFinite(new Date(sessions[0].expires_at).getTime())&&new Date(sessions[0].expires_at).getTime()>Date.now(),
    'UNAUTHORIZED','Sesi akun berakhir.');
  var members=findRows_('members',function(m){return m.member_id===record.member_id;});
  require_(members.length===1&&ngdStudioAllowed_(conf,members[0]),'FORBIDDEN','Akses Studio tidak aktif.');
  return members[0];
}
function ngdStudioIssue_(portalToken){
  return withLock_(function(){
    var conf=ngdStudioGuard_();requireMutationsEnabled_();
    var m=activeMember_(portalToken);
    require_(ngdStudioAllowed_(conf,m),'FORBIDDEN','Akses Studio belum aktif.');
    var id=String(m.member_id),pending=ngdStudioKey_('pending',id),cool=ngdStudioKey_('cool',id);
    require_(!conf.cache.get(cool),'RATE_LIMITED','Coba kembali dalam 30 detik.');
    var code=ngdStudioToken_(conf,'grant'),hash=ngdStudioHash_(code);
    var previous=conf.cache.get(pending);if(previous)conf.cache.remove(ngdStudioKey_('grant',previous));
    var record={member_id:id,parent_hash:sha256_(portalToken),binding:conf.binding,expires_at:Date.now()+180000};
    ngdStudioParent_(conf,record);
    conf.cache.put(ngdStudioKey_('grant',hash),JSON.stringify(record),180);
    conf.cache.put(pending,hash,180);
    conf.cache.put(cool,'1',30);
    return {code:code,expires_in:180};
  });
}
function ngdStudioExchange_(code){
  var hash=ngdStudioHash_(code);
  return withLock_(function(){
    var conf=ngdStudioGuard_();requireMutationsEnabled_();
    var key=ngdStudioKey_('grant',hash),record=ngdStudioRead_(conf.cache,key);
    var m=ngdStudioParent_(conf,record),id=String(m.member_id),pending=ngdStudioKey_('pending',id);
    require_(conf.cache.get(pending)===hash,'UNAUTHORIZED','Kode akses tidak berlaku.');
    // Consume grant before creating the session. A failed write requires reissue.
    conf.cache.remove(key);conf.cache.remove(pending);
    var slot=ngdStudioKey_('active',id),previous=conf.cache.get(slot);
    if(previous)conf.cache.remove(ngdStudioKey_('session',previous));
    var token=ngdStudioToken_(conf,'session'),sessionHash=ngdStudioHash_(token);
    var expires=Date.now()+1800000;
    conf.cache.put(ngdStudioKey_('session',sessionHash),JSON.stringify({member_id:id,parent_hash:record.parent_hash,binding:conf.binding,expires_at:expires}),1800);
    conf.cache.put(slot,sessionHash,1800);
    return {token:token,expires_at:expires};
  });
}
function ngdStudioValidate_(token){
  var hash=ngdStudioHash_(token);
  return withLock_(function(){
    var conf=ngdStudioGuard_();
    var record=ngdStudioRead_(conf.cache,ngdStudioKey_('session',hash)),m=ngdStudioParent_(conf,record);
    require_(conf.cache.get(ngdStudioKey_('active',m.member_id))===hash,'UNAUTHORIZED','Sesi Studio berakhir.');
    return {active:true,member_id:String(m.member_id),expires_at:record.expires_at};
  });
}
function ngdStudioLogout_(token){
  var hash=ngdStudioHash_(token);
  return withLock_(function(){
    var conf=ngdStudioGuard_();
    var key=ngdStudioKey_('session',hash),record=ngdStudioRead_(conf.cache,key);
    if(record&&record.member_id){
      var slot=ngdStudioKey_('active',record.member_id);
      if(conf.cache.get(slot)===hash)conf.cache.remove(slot);
    }
    conf.cache.remove(key);
    return {success:true};
  });
}
// Admin operations use only existing portal ADMIN authentication, not Studio tokens.
function ngdStudioAdminList_(token){
  return withLock_(function(){
    requireAdminPortalEnabled_();
    admin_(token);var conf=ngdStudioGuard_();
    return {member_ids:conf.ids.slice().sort(),limit:50};
  });
}
function ngdStudioAdminSet_(token,p){
  require_(p&&typeof p.member_id==='string'&&/^M-[0-9]{1,12}$/.test(p.member_id)&&
    typeof p.enabled==='boolean'&&typeof p.expected_enabled==='boolean',
    'VALIDATION','Permintaan Studio tidak valid.');
  return withLock_(function(){
    requireAdminPortalEnabled_();requireMutationsEnabled_();
    var actor=admin_(token),conf=ngdStudioGuard_(),id=p.member_id;
    var enabled=conf.ids.indexOf(id)>=0;
    require_(enabled===p.expected_enabled,'CONFLICT','Daftar akses berubah.');
    if(enabled===p.enabled)return {member_id:id,enabled:enabled,changed:false};
    if(p.enabled){
      var members=findRows_('members',function(m){return m.member_id===id;});
      require_(members.length===1&&members[0].role==='MEMBER'&&members[0].status==='AKTIF',
        'FORBIDDEN','Member tidak memenuhi syarat.');
      require_(conf.ids.length<50,'CONFLICT','Kuota pilot penuh.');
    }
    // Remove authoritative slot pointers first. Even if stale records survive
    // eviction, validation/exchange require these slots to match.
    var pending=ngdStudioKey_('pending',id),active=ngdStudioKey_('active',id);
    var grantHash=conf.cache.get(pending),sessionHash=conf.cache.get(active);
    conf.cache.remove(pending);conf.cache.remove(active);
    if(grantHash)conf.cache.remove(ngdStudioKey_('grant',grantHash));
    if(sessionHash)conf.cache.remove(ngdStudioKey_('session',sessionHash));
    var ids=conf.ids.filter(function(x){return x!==id;});
    if(p.enabled)ids.push(id);
    // Record requested intent before writing the pilot list. This is not
    // an atomic transaction; failed property updates require reconciliation.
    logAudit_(actor.member_id,'ADMIN','STUDIO_PILOT_ACCESS_REQUESTED','studio_pilot',id,
      enabled?'ENABLED':'DISABLED',p.enabled?'ENABLED':'DISABLED',{});
    conf.props.setProperty('NGD_STUDIO_PILOT_MEMBER_IDS',ids.sort().join(','));
    return {member_id:id,enabled:p.enabled,changed:true};
  });
}
// Candidate doPost routes these explicitly BEFORE standard activeMember_.
// No broad token acceptance.
function ngdStudioRoute_(action,token,p){
  p=p||{};
  switch(action){
    case 'studioIssueGrant':return ngdStudioIssue_(token);
    case 'studioExchangeGrant':return ngdStudioExchange_(p.code);
    case 'studioValidateSession':return ngdStudioValidate_(token);
    case 'studioLogout':return ngdStudioLogout_(token);
    case 'studioAdminList':return ngdStudioAdminList_(token);
    case 'studioAdminSet':return ngdStudioAdminSet_(token,p);
    default:throw ngdError_('BAD_REQUEST','Aksi tidak dikenal.');
  }
}

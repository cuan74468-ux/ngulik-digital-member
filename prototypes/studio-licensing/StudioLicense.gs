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
  var raw=String(props.getProperty('NGD_STUDIO_PILOT_MEMBER_IDS')||'').trim();
  var ids=raw?raw.split(',').map(function(s){return s.trim();}):[];
  require_(ids.length<=50&&ids.every(function(id){return /^M-[0-9]{1,12}$/.test(id);})&&
    new Set(ids).size===ids.length,'MAINTENANCE','Daftar akses Studio belum sesuai.');
  return {secret:secret,ids:ids,cache:CacheService.getScriptCache()};
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
  require_(record&&typeof record.member_id==='string'&&typeof record.parent_hash==='string'&&
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
  var conf=ngdStudioGuard_();requireMutationsEnabled_();
  return withLock_(function(){
    var m=activeMember_(portalToken);
    require_(ngdStudioAllowed_(conf,m),'FORBIDDEN','Akses Studio belum aktif.');
    var id=String(m.member_id),pending=ngdStudioKey_('pending',id),cool=ngdStudioKey_('cool',id);
    require_(!conf.cache.get(cool),'RATE_LIMITED','Coba kembali dalam 30 detik.');
    var code=ngdStudioToken_(conf,'grant'),hash=ngdStudioHash_(code);
    var previous=conf.cache.get(pending);if(previous)conf.cache.remove(ngdStudioKey_('grant',previous));
    var record={member_id:id,parent_hash:sha256_(portalToken),expires_at:Date.now()+180000};
    ngdStudioParent_(conf,record);
    conf.cache.put(ngdStudioKey_('grant',hash),JSON.stringify(record),180);
    conf.cache.put(pending,hash,180);
    conf.cache.put(cool,'1',30);
    return {code:code,expires_in:180};
  });
}
function ngdStudioExchange_(code){
  var conf=ngdStudioGuard_();requireMutationsEnabled_();
  var hash=ngdStudioHash_(code);
  return withLock_(function(){
    var key=ngdStudioKey_('grant',hash),record=ngdStudioRead_(conf.cache,key);
    var m=ngdStudioParent_(conf,record),id=String(m.member_id),pending=ngdStudioKey_('pending',id);
    require_(conf.cache.get(pending)===hash,'UNAUTHORIZED','Kode akses tidak berlaku.');
    // Consume grant before creating the session. A failed write requires reissue.
    conf.cache.remove(key);conf.cache.remove(pending);
    var slot=ngdStudioKey_('active',id),previous=conf.cache.get(slot);
    if(previous)conf.cache.remove(ngdStudioKey_('session',previous));
    var token=ngdStudioToken_(conf,'session'),sessionHash=ngdStudioHash_(token);
    var expires=Date.now()+1800000;
    conf.cache.put(ngdStudioKey_('session',sessionHash),JSON.stringify({member_id:id,parent_hash:record.parent_hash,expires_at:expires}),1800);
    conf.cache.put(slot,sessionHash,1800);
    return {token:token,expires_at:expires};
  });
}
function ngdStudioValidate_(token){
  var conf=ngdStudioGuard_(),hash=ngdStudioHash_(token);
  return withLock_(function(){
    var record=ngdStudioRead_(conf.cache,ngdStudioKey_('session',hash)),m=ngdStudioParent_(conf,record);
    require_(conf.cache.get(ngdStudioKey_('active',m.member_id))===hash,'UNAUTHORIZED','Sesi Studio berakhir.');
    return {active:true,member_id:String(m.member_id),expires_at:record.expires_at};
  });
}
function ngdStudioLogout_(token){
  var conf=ngdStudioGuard_(),hash=ngdStudioHash_(token);
  return withLock_(function(){
    var key=ngdStudioKey_('session',hash),record=ngdStudioRead_(conf.cache,key);
    if(record&&record.member_id){
      var slot=ngdStudioKey_('active',record.member_id);
      if(conf.cache.get(slot)===hash)conf.cache.remove(slot);
    }
    conf.cache.remove(key);
    return {success:true};
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
    default:throw ngdError_('BAD_REQUEST','Aksi tidak dikenal.');
  }
}

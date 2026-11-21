/**
 * Ngulik Digital — STAGING ONLY registration OTP (pilot P0).
 *
 * NOT ACTIVE by default. Do not copy to production until the owner approves
 * the registration policy, an integration test passes, and backend release
 * gates are reviewed. No token, OTP, or raw response is logged.
 *
 * Requires existing STAGING tabs: otp_verifications, wa_notifications.
 * Runtime flags: NGD_ENVIRONMENT=STAGING, NGD_DB_ID,
 * NGD_OTP_STAGING_DB_ID=NGD_DB_ID, NGD_OTP_REGISTRATION_ENABLED=true,
 * NGD_REGISTRATION_ENABLED=true, NGD_MUTATIONS_ENABLED=true,
 * NGD_EXTERNAL_PROVIDERS_ENABLED=true (global activation approved LAST).
 * Secrets: NGD_OTP_HASH_PEPPER (random >=32 chars), FONNTE_API_TOKEN.
 */

var NGD_OTP_COLUMNS_ = [
  'otp_id','wa','kode_hash','tujuan','status','attempts',
  'created_at','expires_at','verified_at','ip_or_device'
];
var NGD_OTP_NOTIFICATION_COLUMNS_ = [
  'notif_id','tujuan_wa','tipe_penerima','template_kode','ref_id',
  'pesan','status','retry_count','created_at','sent_at','gateway_response'
];

function ngdOtpProperties_() {
  var p = PropertiesService.getScriptProperties();
  var dbId = String(p.getProperty('NGD_DB_ID') || '').trim();
  var confirmed = String(p.getProperty('NGD_OTP_STAGING_DB_ID') || '').trim();
  require_(p.getProperty('NGD_ENVIRONMENT') === 'STAGING' &&
    !!dbId && dbId === confirmed &&
    p.getProperty('NGD_OTP_REGISTRATION_ENABLED') === 'true' &&
    p.getProperty('NGD_REGISTRATION_ENABLED') === 'true' &&
    p.getProperty('NGD_MUTATIONS_ENABLED') === 'true' &&
    p.getProperty('NGD_EXTERNAL_PROVIDERS_ENABLED') === 'true',
    'MAINTENANCE','Registrasi OTP STAGING belum diaktifkan.');
  var pepper = String(p.getProperty('NGD_OTP_HASH_PEPPER') || '');
  require_(pepper.length >= 32, 'MAINTENANCE',
    'Secret OTP STAGING belum siap.');
  return {props:p, pepper:pepper};
}

function ngdOtpSheet_(name, required) {
  var ss=db_(),props=PropertiesService.getScriptProperties();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING' &&
    String(ss.getId())===String(props.getProperty('NGD_OTP_STAGING_DB_ID')||''),
    'MAINTENANCE','Database OTP STAGING tidak cocok.');
  var sheet = ss.getSheetByName(name);
  require_(!!sheet,'MAINTENANCE','Tabel OTP belum tersedia.');
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]
    .map(function(h){return String(h).trim();});
  var found = {};
  headers.forEach(function(h) {
    require_(!!h && !found[h], 'MAINTENANCE','Kolom OTP tidak valid.');
    found[h] = true;
  });
  required.forEach(function(h) {
    require_(found[h] === true,'MAINTENANCE','Skema OTP belum lengkap.');
  });
  return {sheet:sheet, headers:headers};
}

function ngdOtpRead_() {
  var t=ngdOtpSheet_('otp_verifications',NGD_OTP_COLUMNS_);
  var count=t.sheet.getLastRow()-1;
  if(count<=0)return [];
  return t.sheet.getRange(2,1,count,t.headers.length).getValues()
    .reduce(function(out,row,i) {
      if(!row.some(function(v){return v!=='' && v!==null && v!==undefined;}))return out;
      var item={_row:i+2};
      t.headers.forEach(function(h,j){item[h]=row[j];});
      out.push(item);
      return out;
    },[]);
}

function ngdOtpAppend_(name, required, values) {
  var t=ngdOtpSheet_(name,required);
  t.sheet.appendRow(t.headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(values,h) ? sheetLiteral_(values[h]) : '';
  }));
}

function ngdOtpPatch_(row, patch) {
  var t=ngdOtpSheet_('otp_verifications',NGD_OTP_COLUMNS_);
  require_(Number.isInteger(row) && row>=2 && row<=t.sheet.getLastRow(),
    'CONFLICT','Baris verifikasi tidak valid.');
  var range=t.sheet.getRange(row,1,1,t.headers.length),values=range.getValues()[0];
  Object.keys(patch).forEach(function(h) {
    var index=t.headers.indexOf(h);
    require_(index>=0,'MAINTENANCE','Kolom OTP tidak dikenal.');
    values[index]=sheetLiteral_(patch[h]);
  });
  range.setValues([values]);
}

function ngdOtpHash_(pepper,wa,otp) {
  return sha256_(pepper+'|REGISTRATION|'+wa+'|'+otp);
}

function ngdOtpEqual_(a,b) {
  var x=String(a||''),y=String(b||''),v=x.length ^ y.length;
  var length=Math.max(x.length,y.length);
  for(var i=0;i<length;i++)v|=(x.charCodeAt(i)||0)^(y.charCodeAt(i)||0);
  return v===0;
}

function ngdOtpLatest_(rows,wa) {
  for(var i=rows.length-1;i>=0;i--) {
    if(String(rows[i].wa)===wa && String(rows[i].tujuan)==='REGISTRATION')
      return rows[i];
  }
  return null;
}

// Never reset a corrupt or missing counter to zero: only explicit 0
// on a fresh record can start the maximum-three-attempt window.
function ngdOtpAttemptCount_(row) {
  var raw=row&&row.attempts,value=Number(raw);
  require_(raw!==null&&raw!==undefined&&String(raw).trim()!==''&&
    Number.isInteger(value)&&value>=0&&value<3,
    'RATE_LIMITED','Batas percobaan OTP tercapai.');
  return value;
}
function ngdOtpRecordAttempt_(row) {
  var next=ngdOtpAttemptCount_(row)+1;
  ngdOtpPatch_(row._row,{attempts:next,status:next>=3?'LOCKED':String(row.status)});
}

function ngdOtpRequest_(p) {
  p=p||{};
  var conf=ngdOtpProperties_();
  var wa=normalizeWa_(p.wa);
  var token=String(conf.props.getProperty('FONNTE_API_TOKEN')||'').trim();
  require_(!!token,'MAINTENANCE','Gateway OTP belum dikonfigurasi.');
  require_(p.setuju_kebijakan===true,'VALIDATION',
    'Persetujuan pengiriman kode WhatsApp diperlukan.');
  // Do not incur WhatsApp gateway cost if registration cannot persist proof.
  // Read-only guard. Repeat it immediately before consuming the OTP at signup.
  requireRegistrationWaEvidenceColumns_();

  // A generic accepted response for an existing number avoids enumeration.
  // No OTP is sent and no record is written in that case.
  var prepared=withLock_(function(){
    var existing=byId_('members','wa',wa);
    if(existing)return {skip:true};
    var now=Date.now(),rows=ngdOtpRead_();
    var sameDay=rows.filter(function(r){
      return String(r.wa)===wa && new Date(r.created_at).getTime()>now-86400000;
    });
    require_(sameDay.length<5,'RATE_LIMITED','Batas OTP harian tercapai.');
    var last=ngdOtpLatest_(rows,wa);
    if(last && now-new Date(last.created_at).getTime()<60000)
      return {skip:true};
    var today=Utilities.formatDate(new Date(now),'Asia/Jakarta','yyyy-MM-dd');
    var sentToday=rows.filter(function(r){
      return Utilities.formatDate(new Date(r.created_at),'Asia/Jakarta','yyyy-MM-dd')===today;
    }).length;
    var dailyMax=Math.max(1,Math.min(100,
      Number(conf.props.getProperty('NGD_OTP_DAILY_SEND_CAP'))||50));
    require_(sentToday<dailyMax,'RATE_LIMITED','Kuota OTP sementara penuh.');
    var code=randomPin_(),id=recordId_('OTP');
    ngdOtpAppend_('otp_verifications',NGD_OTP_COLUMNS_,{
      otp_id:id,wa:wa,kode_hash:ngdOtpHash_(conf.pepper,wa,code),
      tujuan:'REGISTRATION',status:'SENDING',attempts:0,
      created_at:new Date(now),expires_at:new Date(now+300000)
    });
    return {skip:false,id:id,otp:code};
  });
  if(prepared.skip)return {accepted:true};

  var accepted=false;
  try {
    var response=UrlFetchApp.fetch('https://api.fonnte.com/send',{
      method:'post',
      headers:{Authorization:token},
      payload:{
        target:wa,
        message:'Kode verifikasi Ngulik Digital: '+prepared.otp+
          '. Berlaku 5 menit. Jangan berikan kode ini kepada siapa pun.',
        countryCode:'0'
      },
      muteHttpExceptions:true
    });
    var data={};
    try{data=JSON.parse(response.getContentText());}catch(ignore){}
    accepted=response.getResponseCode()>=200 &&
      response.getResponseCode()<300 && data.status===true;
  }catch(ignore){
    accepted=false;
  }finally{
    // Never persist or expose the plaintext OTP beyond this operation.
    prepared.otp=null;
  }

  withLock_(function(){
    var record=ngdOtpRead_().filter(function(r){return r.otp_id===prepared.id;})[0];
    require_(!!record && record.status==='SENDING','CONFLICT','Status OTP berubah.');
    ngdOtpPatch_(record._row,{status:accepted?'PENDING':'FAILED'});
    ngdOtpAppend_('wa_notifications',NGD_OTP_NOTIFICATION_COLUMNS_,{
      notif_id:recordId_('WA'),tujuan_wa:wa,tipe_penerima:'CALON_MEMBER',
      template_kode:'REGISTRATION_OTP',ref_id:prepared.id,
      pesan:'[OTP tidak disimpan]',status:accepted?'API_ACCEPTED':'API_FAILED',
      retry_count:0,created_at:now_(),sent_at:accepted?now_():'',
      gateway_response:''
    });
  });
  require_(accepted,'MAINTENANCE','Pengiriman OTP belum berhasil. Coba lagi nanti.');
  return {accepted:true};
}

function ngdOtpVerify_(p) {
  p=p||{};
  var conf=ngdOtpProperties_();
  var wa=normalizeWa_(p.wa);
  var otp=String(p.otp||'');
  require_(/^\d{6}$/.test(otp),'VALIDATION','Kode OTP harus enam angka.');
  return withLock_(function(){
    var row=ngdOtpLatest_(ngdOtpRead_(),wa);
    require_(!!row &&
      ['PENDING','VERIFIED'].indexOf(String(row.status))>=0,
      'UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    var expires=new Date(row.expires_at).getTime();
    // NaN <= now is false: reject malformed timestamps explicitly.
    if(!Number.isFinite(expires)||expires<=Date.now()){
      ngdOtpPatch_(row._row,{status:'EXPIRED'});
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    ngdOtpAttemptCount_(row);
    if(!ngdOtpEqual_(row.kode_hash,ngdOtpHash_(conf.pepper,wa,otp))){
      ngdOtpRecordAttempt_(row);
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    ngdOtpPatch_(row._row,{status:'VERIFIED',verified_at:now_()});
    return {verified:true};
  });
}

/**
 * Verify a valid, still-single-use registration OTP INSIDE the registration
 * lock, without consuming it on success. Invalid/expired OTPs preserve the
 * existing failed-attempt/expiration behavior. The returned ID stays server
 * side; it must never be sent to a browser or used as an authorization token.
 */
function ngdValidateVerifiedRegistrationOtp_(p) {
  p=p||{};
  var conf=ngdOtpProperties_();
  var wa=normalizeWa_(p.wa),otp=String(p.otp||'');
  require_(/^\d{6}$/.test(otp),'VALIDATION','Kode OTP harus enam angka.');
  var row=ngdOtpLatest_(ngdOtpRead_(),wa);
  require_(!!row&&row.status==='VERIFIED','UNAUTHORIZED',
    'Verifikasi WhatsApp belum selesai.');
  var expires=new Date(row.expires_at).getTime();
    // NaN <= now is false: reject malformed timestamps explicitly.
    if(!Number.isFinite(expires)||expires<=Date.now()){
    ngdOtpPatch_(row._row,{status:'EXPIRED'});
    throw ngdError_('UNAUTHORIZED','Kode OTP telah kedaluwarsa.');
  }
  ngdOtpAttemptCount_(row);
  if(!ngdOtpEqual_(row.kode_hash,ngdOtpHash_(conf.pepper,wa,otp))){
    ngdOtpRecordAttempt_(row);
    throw ngdError_('UNAUTHORIZED','Kode OTP salah.');
  }
  return String(row.otp_id);
}

/**
 * Called INSIDE authRegister_'s LockService region, AFTER the member append.
 * The optional validated ID is a server-only evidence pointer obtained earlier
 * in the same locked request. Direct callers still undergo full validation.
 *
 * If this status write fails after an account is saved, a future registration
 * must not proceed: authRegister_ rejects the existing WhatsApp account.
 * Such partial commits need explicit reconciliation, never auto-reset OTP.
 */
function ngdConsumeVerifiedRegistrationOtp_(p, validatedOtpId) {
  p=p||{};
  var id=validatedOtpId===undefined
    ?ngdValidateVerifiedRegistrationOtp_(p)
    :String(validatedOtpId||'');
  require_(!!id,'UNAUTHORIZED','Verifikasi WhatsApp belum selesai.');
  var conf=ngdOtpProperties_(),wa=normalizeWa_(p.wa),otp=String(p.otp||'');
  require_(/^\d{6}$/.test(otp),'VALIDATION','Kode OTP harus enam angka.');
  var row=ngdOtpLatest_(ngdOtpRead_(),wa);
  require_(!!row&&row.status==='VERIFIED'&&String(row.otp_id)===id,
    'UNAUTHORIZED','Verifikasi WhatsApp belum selesai.');
  // A trusted server-side ID is not a substitute for the OTP itself.
  require_(ngdOtpEqual_(row.kode_hash,ngdOtpHash_(conf.pepper,wa,otp)),
    'UNAUTHORIZED','Kode OTP salah.');
  ngdOtpPatch_(row._row,{status:'USED'});
  return true;
}


/**
 * PILOT P1 — OTP LOGIN MEMBER, STAGING ONLY.
 * Completely separate from registration OTP and Admin PIN authentication.
 * Does not enable general mutations, registration, finance, or AI providers.
 */
function ngdMemberOtpLoginGuard_() {
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING' &&
    !!dbId &&
    dbId===String(props.getProperty('NGD_OTP_STAGING_DB_ID')||'').trim() &&
    dbId===String(props.getProperty('NGD_MEMBER_OTP_LOGIN_DB_ID')||'').trim() &&
    props.getProperty('NGD_MEMBER_OTP_LOGIN_ENABLED')==='true',
    'MAINTENANCE','Login OTP Member STAGING belum diaktifkan.');
  var pepper=String(props.getProperty('NGD_OTP_HASH_PEPPER')||'');
  require_(pepper.length>=32,'MAINTENANCE','Secret OTP belum siap.');
  require_(String(db_().getId())===dbId,'MAINTENANCE','Database login OTP tidak sesuai.');
  return {props:props,pepper:pepper};
}

function ngdMemberOtpLoginHash_(pepper,wa,otp) {
  // Domain separation: registration codes cannot authenticate a login.
  return sha256_(pepper+'|MEMBER_LOGIN|'+wa+'|'+otp);
}

function ngdMemberOtpLoginLatest_(rows,wa) {
  for(var i=rows.length-1;i>=0;i--)
    if(String(rows[i].wa)===wa && String(rows[i].tujuan)==='MEMBER_LOGIN')
      return rows[i];
  return null;
}

function ngdMemberOtpLoginRequest_(p) {
  p=p||{};
  var conf=ngdMemberOtpLoginGuard_();
  var wa=normalizeWa_(p.wa);
  require_(p.setuju_pengiriman===true,'VALIDATION','Setujui pengiriman OTP WhatsApp.');
  var token=String(conf.props.getProperty('FONNTE_API_TOKEN')||'').trim();
  require_(!!token,'MAINTENANCE','Gateway WhatsApp belum siap.');
  // Generic success for unknown, duplicate or admin numbers prevents account probing.
  var prepared=withLock_(function(){
    var matches=findRows_('members',function(m){return String(m.wa)===wa;});
    if(matches.length!==1 || matches[0].role!=='MEMBER' ||
      matches[0].status!=='AKTIF') return {skip:true};
    var now=Date.now(),rows=ngdOtpRead_();
    var today=Utilities.formatDate(new Date(now),'Asia/Jakarta','yyyy-MM-dd');
    var byWa=rows.filter(function(row){
      return String(row.wa)===wa && String(row.tujuan)==='MEMBER_LOGIN' &&
        Number.isFinite(new Date(row.created_at).getTime()) &&
        new Date(row.created_at).getTime()>now-86400000;
    });
    // STAGING QA: up to 12 confirmed requests per WhatsApp in a rolling 24h.
    // Global cap, 60-second cooldown, six-digit proof and 3 attempts remain.
    require_(byWa.length<12,'RATE_LIMITED','Batas permintaan OTP harian tercapai (12 per 24 jam).');
    var last=ngdMemberOtpLoginLatest_(rows,wa);
    if(last && Number.isFinite(new Date(last.created_at).getTime()) &&
      now-new Date(last.created_at).getTime()<60000) return {skip:true};
    var sentToday=rows.filter(function(row){
      var d=new Date(row.created_at);
      return !isNaN(d.getTime()) &&
        Utilities.formatDate(d,'Asia/Jakarta','yyyy-MM-dd')===today;
    }).length;
    var cap=Number(conf.props.getProperty('NGD_OTP_DAILY_SEND_CAP'));
    if(!Number.isInteger(cap)||cap<1||cap>100)cap=50;
    require_(sentToday<cap,'RATE_LIMITED','Kuota pengiriman OTP penuh.');
    var code=randomPin_(),id=recordId_('OTP');
    ngdOtpAppend_('otp_verifications',NGD_OTP_COLUMNS_,{
      otp_id:id,wa:wa,kode_hash:ngdMemberOtpLoginHash_(conf.pepper,wa,code),
      tujuan:'MEMBER_LOGIN',status:'SENDING',attempts:0,
      created_at:new Date(now),expires_at:new Date(now+300000)
    });
    return {skip:false,id:id,otp:code};
  });
  if(prepared.skip)return {accepted:true};
  var accepted=false;
  try {
    var response=UrlFetchApp.fetch('https://api.fonnte.com/send',{
      method:'post',
      headers:{Authorization:token},
      payload:{
        target:wa,
        message:'Kode MASUK Ngulik Digital: '+prepared.otp+
          '. Berlaku 5 menit. Jangan bagikan kepada siapa pun.',
        countryCode:'0'
      },
      muteHttpExceptions:true
    });
    var data={};
    try{data=JSON.parse(response.getContentText());}catch(ignore){}
    accepted=response.getResponseCode()>=200 &&
      response.getResponseCode()<300 && data.status===true;
  }catch(ignore){accepted=false;}
  finally{prepared.otp=null;}
  withLock_(function(){
    var row=ngdOtpRead_().filter(function(item){
      return String(item.otp_id)===prepared.id;
    })[0];
    require_(!!row && row.status==='SENDING','CONFLICT','Status OTP berubah.');
    ngdOtpPatch_(row._row,{status:accepted?'PENDING':'FAILED'});
    ngdOtpAppend_('wa_notifications',NGD_OTP_NOTIFICATION_COLUMNS_,{
      notif_id:recordId_('WA'),tujuan_wa:wa,tipe_penerima:'MEMBER',
      template_kode:'MEMBER_LOGIN_OTP',ref_id:prepared.id,
      pesan:'[OTP tidak disimpan]',status:accepted?'API_ACCEPTED':'API_FAILED',
      retry_count:0,created_at:now_(),sent_at:accepted?now_():'',
      gateway_response:''
    });
  });
  require_(accepted,'MAINTENANCE','Pengiriman OTP belum berhasil.');
  return {accepted:true};
}

function ngdMemberOtpLoginVerify_(p) {
  p=p||{};
  var conf=ngdMemberOtpLoginGuard_();
  var wa=normalizeWa_(p.wa),otp=String(p.otp||'');
  require_(/^\d{6}$/.test(otp),'VALIDATION','Kode OTP harus enam angka.');
  return withLock_(function(){
    // Match current member identity before creating a session. Reject ADMIN.
    var matches=findRows_('members',function(m){return String(m.wa)===wa;});
    require_(matches.length===1 && matches[0].role==='MEMBER' &&
      matches[0].status==='AKTIF','UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    var row=ngdMemberOtpLoginLatest_(ngdOtpRead_(),wa);
    require_(!!row && row.status==='PENDING',
      'UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    var expiry=new Date(row.expires_at).getTime();
    if(!Number.isFinite(expiry)||expiry<=Date.now()){
      ngdOtpPatch_(row._row,{status:'EXPIRED'});
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    ngdOtpAttemptCount_(row);
    if(!ngdOtpEqual_(row.kode_hash,ngdMemberOtpLoginHash_(conf.pepper,wa,otp))){
      ngdOtpRecordAttempt_(row);
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    // Mark USED before issuing a session. If session storage fails, fail closed;
    // request a new OTP rather than risk reusable authentication proof.
    ngdOtpPatch_(row._row,{status:'USED',verified_at:now_()});
    updateActivity_(matches[0]);
    return newSessionMember_(matches[0]);
  });
}

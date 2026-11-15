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
 * NGD_REGISTRATION_ENABLED=true, NGD_MUTATIONS_ENABLED=true.
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
    p.getProperty('NGD_MUTATIONS_ENABLED') === 'true',
    'MAINTENANCE','Registrasi OTP STAGING belum diaktifkan.');
  var pepper = String(p.getProperty('NGD_OTP_HASH_PEPPER') || '');
  require_(pepper.length >= 32, 'MAINTENANCE',
    'Secret OTP STAGING belum siap.');
  return {props:p, pepper:pepper};
}

function ngdOtpSheet_(name, required) {
  var sheet = db_().getSheetByName(name);
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

function ngdOtpRecordAttempt_(row) {
  var next=(Number(row.attempts)||0)+1;
  ngdOtpPatch_(row._row,{attempts:next,status:next>=3?'LOCKED':String(row.status)});
}

function ngdOtpRequest_(p) {
  p=p||{};
  var conf=ngdOtpProperties_();
  var wa=normalizeWa_(p.wa);
  var token=String(conf.props.getProperty('FONNTE_API_TOKEN')||'').trim();
  require_(!!token,'MAINTENANCE','Gateway OTP belum dikonfigurasi.');

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
    if(new Date(row.expires_at).getTime()<=Date.now()){
      ngdOtpPatch_(row._row,{status:'EXPIRED'});
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    if(Number(row.attempts)>=3)throw ngdError_('RATE_LIMITED','Batas percobaan OTP tercapai.');
    if(!ngdOtpEqual_(row.kode_hash,ngdOtpHash_(conf.pepper,wa,otp))){
      ngdOtpRecordAttempt_(row);
      throw ngdError_('UNAUTHORIZED','Kode OTP salah atau kedaluwarsa.');
    }
    ngdOtpPatch_(row._row,{status:'VERIFIED',verified_at:now_()});
    return {verified:true};
  });
}

/**
 * Called INSIDE authRegister_'s LockService region.
 * Consumes exactly one already-verified OTP before creating any member.
 */
function ngdConsumeVerifiedRegistrationOtp_(p) {
  p=p||{};
  var conf=ngdOtpProperties_();
  var wa=normalizeWa_(p.wa),otp=String(p.otp||'');
  require_(/^\d{6}$/.test(otp),'VALIDATION','Kode OTP harus enam angka.');
  var row=ngdOtpLatest_(ngdOtpRead_(),wa);
  require_(!!row && row.status==='VERIFIED','UNAUTHORIZED',
    'Verifikasi WhatsApp belum selesai.');
  if(new Date(row.expires_at).getTime()<=Date.now()){
    ngdOtpPatch_(row._row,{status:'EXPIRED'});
    throw ngdError_('UNAUTHORIZED','Kode OTP telah kedaluwarsa.');
  }
  if(Number(row.attempts)>=3)throw ngdError_('RATE_LIMITED','Batas percobaan OTP tercapai.');
  if(!ngdOtpEqual_(row.kode_hash,ngdOtpHash_(conf.pepper,wa,otp))){
    ngdOtpRecordAttempt_(row);
    throw ngdError_('UNAUTHORIZED','Kode OTP salah.');
  }
  ngdOtpPatch_(row._row,{status:'USED'});
  return true;
}

/**
 * Ngulik Digital — OTP STAGING read-only preflight.
 * No token, API request, OTP send, session, or data mutation.
 * Requires Diagnostics.gs V9's diagnosticBackendDbGuard_ to be installed.
 * Not a substitute for live end-to-end WhatsApp verification.
 */
function ngdOtpStagingPreflight() {
  var started=Date.now();
  if(typeof diagnosticBackendDbGuard_!=='function')
    throw new Error('DIAGNOSTICS_STAGING_GUARD_MISSING');

  // The existing validated diagnostic guard checks the exact staging DB ID.
  diagnosticBackendDbGuard_();

  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('NGD_ENVIRONMENT')!=='STAGING')
    throw new Error('OTP_PREFLIGHT_NOT_STAGING');

  var forbidden=[
    'NGD_MUTATIONS_ENABLED',
    'NGD_REGISTRATION_ENABLED',
    'NGD_OTP_REGISTRATION_ENABLED',
    'NGD_FINANCE_ENABLED',
    'NGD_EXTERNAL_PROVIDERS_ENABLED'
  ];
  var enabled=forbidden.filter(function(k){
    return props.getProperty(k)==='true';
  });
  if(enabled.length)
    throw new Error('OTP_PREFLIGHT_FLAGS_MUST_BE_OFF: '+enabled.join(','));

  var ss=db_(),required={
    otp_verifications:[
      'otp_id','wa','kode_hash','tujuan','status','attempts',
      'created_at','expires_at','verified_at','ip_or_device'
    ],
    wa_notifications:[
      'notif_id','tujuan_wa','tipe_penerima','template_kode','ref_id',
      'pesan','status','retry_count','created_at','sent_at','gateway_response'
    ],
    members:['member_id','wa','wa_verified','wa_verified_at','pin_hash','pin_salt']
  };
  var counts={};
  Object.keys(required).forEach(function(name){
    var sheet=ss.getSheetByName(name);
    if(!sheet)throw new Error('OTP_PREFLIGHT_TAB_MISSING: '+name);
    if(sheet.getLastColumn()<1)throw new Error('OTP_PREFLIGHT_HEADER_EMPTY: '+name);
    var headers=sheet.getRange(1,1,1,sheet.getLastColumn())
      .getValues()[0].map(function(h){return String(h).trim()});
    var missing=required[name].filter(function(h){
      return headers.indexOf(h)<0;
    });
    if(missing.length)throw new Error('OTP_PREFLIGHT_COLUMNS_MISSING: '+name+
      ':'+missing.join(','));
    if(headers.some(function(h,i){return !h||headers.indexOf(h)!==i;}))
      throw new Error('OTP_PREFLIGHT_HEADER_INVALID: '+name);
    counts[name]=Math.max(0,sheet.getLastRow()-1);
  });

  var available=typeof ngdOtpRequest_==='function' &&
    typeof ngdOtpVerify_==='function' &&
    typeof ngdConsumeVerifiedRegistrationOtp_==='function';

  console.log('OTP_STAGING_SCHEMA_SUMMARY '+JSON.stringify({
    tables_checked:3,
    otp_record_rows:counts.otp_verifications,
    notification_record_rows:counts.wa_notifications,
    member_physical_rows:counts.members,
    otp_source_installed:available,
    mutations_enabled:false,
    registration_enabled:false,
    finance_enabled:false
  }));
  if(!available)
    console.warn('OTP_SOURCE_NOT_INSTALLED_IN_STAGING — masih tahap persiapan.');
  console.log('OTP_STAGING_SCHEMA_PREFLIGHT_OK | duration_ms='+
    (Date.now()-started));
  return 'OTP_STAGING_SCHEMA_PREFLIGHT_OK';
}

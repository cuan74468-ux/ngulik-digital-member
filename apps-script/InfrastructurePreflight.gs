/**
 * NGD STAGING infrastructure foundation preflight. READ ONLY, editor-only.
 * No provider accounts, secrets, writes, outbound requests, or API routes.
 */
function ngdInfrastructurePreflightReadOnly() {
  var props=PropertiesService.getScriptProperties();
  if(String(props.getProperty('NGD_ENVIRONMENT')||'')!=='STAGING')
    throw new Error('INFRA_NOT_STAGING');
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var adminDb=String(props.getProperty('NGD_ADMIN_LOGIN_DB_ID')||'').trim();
  var otpDb=String(props.getProperty('NGD_OTP_STAGING_DB_ID')||'').trim();
  // Match the verified ngdStagingWorkspaceInfo_ contract: the OTP database
  // property is optional until the provider-last registration phase. If set,
  // it must point to the exact same STAGING spreadsheet. The OTP runtime
  // independently rejects an absent property when actual OTP is enabled.
  if(!dbId)
    throw new Error('INFRA_DB_ID_MISSING');
  if(adminDb!==dbId)
    throw new Error('INFRA_ADMIN_DB_MISMATCH');
  if(otpDb && otpDb!==dbId)
    throw new Error('INFRA_OTP_DB_MISMATCH');

  // Safe for the current isolated ADMIN login, never for feature mutations.
  var flags=[
    'NGD_MUTATIONS_ENABLED','NGD_REGISTRATION_ENABLED',
    'NGD_OTP_REGISTRATION_ENABLED','NGD_FINANCE_ENABLED',
    'NGD_CATALOG_ENABLED','NGD_CONTENT_ENABLED',
    'NGD_SERVICE_ENABLED','NGD_SUPPORT_ENABLED',
    'NGD_NOTIFICATIONS_ENABLED','NGD_LMS_ENABLED',
    'NGD_CLICK_TRACKING_ENABLED','NGD_SCHEMA_UPGRADE_ENABLED',
    'NGD_ADMIN_RECOVERY_ENABLED',
    'NGD_EXTERNAL_PROVIDERS_ENABLED'
  ];
  flags.forEach(function(key) {
    var value=String(props.getProperty(key)||'').trim();
    if(value!==''&&value!=='false')
      throw new Error('INFRA_FLAG_NOT_DISABLED: '+key);
  });
  if(typeof NGD==='undefined'||!NGD.HEADERS)
    throw new Error('INFRA_SOURCE_CONTRACT_MISSING');

  // Explicit openById: never fall back to a bound production spreadsheet.
  var ss=SpreadsheetApp.openById(dbId);
  if(!ss||String(ss.getId())!==dbId)
    throw new Error('INFRA_DB_IDENTITY_MISMATCH');

  var contracts={};
  Object.keys(NGD.HEADERS).forEach(function(name) {
    contracts[name]=NGD.HEADERS[name].split(',');
  });
  // OTP/WA tables are now part of NGD.HEADERS; older runtime builds
  // may still omit them. Both forms must agree on the same columns.
  var otpColumns=[
    'otp_id','wa','kode_hash','tujuan','status','attempts',
    'created_at','expires_at','verified_at','ip_or_device'
  ];
  var waColumns=[
    'notif_id','tujuan_wa','tipe_penerima','template_kode','ref_id',
    'pesan','status','retry_count','created_at','sent_at','gateway_response'
  ];
  if(contracts.otp_verifications&&contracts.otp_verifications.join(',')!==otpColumns.join(','))
    throw new Error('INFRA_OTP_CONTRACT_MISMATCH');
  if(contracts.wa_notifications&&contracts.wa_notifications.join(',')!==waColumns.join(','))
    throw new Error('INFRA_WA_CONTRACT_MISMATCH');
  contracts.otp_verifications=otpColumns;
  contracts.wa_notifications=waColumns;
  // Real members table extends the base schema with verification evidence.
  ['wa_verified','wa_verified_at'].forEach(function(name) {
    if(contracts.members.indexOf(name)===-1)contracts.members.push(name);
  });

  var tableNames=Object.keys(contracts);
  tableNames.forEach(function(name) {
    var sh=ss.getSheetByName(name);
    if(!sh)throw new Error('INFRA_TAB_MISSING: '+name);
    var width=sh.getLastColumn();
    if(width<1)throw new Error('INFRA_HEADER_EMPTY: '+name);
    var row=sh.getRange(1,1,1,width).getValues()[0];
    var headers=row.map(function(value){return String(value||'').trim();});
    if(headers.some(function(h,i){return !h||headers.indexOf(h)!==i;}))
      throw new Error('INFRA_HEADER_INVALID: '+name);
    if(contracts[name].some(function(h){return headers.indexOf(h)===-1;}))
      throw new Error('INFRA_COLUMNS_MISSING: '+name);
  });

  // Inspect headers only. Never inspect row values, tokens, numbers or balances.
  var report={
    environment:'STAGING',tables_checked:tableNames.length,
    schema_ready:true,feature_writes_enabled:false,
    external_providers:'DEFERRED',mutation_performed:false
  };
  console.log('NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables='+
    tableNames.length+' | environment=STAGING | writes=false | providers=DEFERRED');
  return report;
}

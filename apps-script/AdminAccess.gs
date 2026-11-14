/**
 * Ngulik Digital — isolated admin authentication and operator recovery.
 *
 * These endpoints NEVER enable registration, checkout, payments, credit edits,
 * catalogue writes, or any other mutation gate. Auth uses the existing
 * members/sessions/audit_logs tables, regardless of the LMS/content schema.
 */
function adminPortalEnabled_(){
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var target=String(props.getProperty('NGD_ADMIN_LOGIN_DB_ID')||'').trim();
  var owner=String(props.getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID')||'').trim();
  return props.getProperty('NGD_ADMIN_LOGIN_ENABLED')==='true'&&
    (props.getProperty('NGD_ENVIRONMENT')==='STAGING'||
      props.getProperty('NGD_ENVIRONMENT')==='PRODUCTION')&&
    !!dbId&&target===dbId&&/^M-\d{4,12}$/.test(owner);
}
function requireAdminPortalEnabled_(){
  require_(adminPortalEnabled_(),'MAINTENANCE','Akses administrator belum diaktifkan.');
}
function adminPortalLogin_(p){
  requireAdminPortalEnabled_();
  var expected=PropertiesService.getScriptProperties().getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID');
  return authLogin_(p,true,expected);
}
function adminPortalLogout_(token){
  requireAdminPortalEnabled_();
  admin_(token);
  return authLogout_(token);
}
function adminPortalChangePin_(token,p){
  requireAdminPortalEnabled_();
  var actor=admin_(token);
  require_(actor.member_id===PropertiesService.getScriptProperties()
    .getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID'),'FORBIDDEN','Akses administrator ditolak.');
  return authChangePin_(actor,p);
}
/**
 * Recovery is an editor-invoked, owner-only procedure, never a web API.
 * NO PIN is logged, returned to web clients or written in plaintext to Sheets.
 * Refuse to mutate unless a bound spreadsheet UI is available to display the
 * new PIN exactly once after it is generated.
 */
function recoverAdminPinOwnerOnly(){
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var targetDb=String(props.getProperty('NGD_ADMIN_RECOVERY_DB_ID')||'').trim();
  var accountId=String(props.getProperty('NGD_ADMIN_RECOVERY_ACCOUNT_ID')||'').trim();
  var operator=String(props.getProperty('NGD_ADMIN_RECOVERY_OPERATOR_EMAIL')||'').trim().toLowerCase();
  var actor=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  require_(props.getProperty('NGD_ADMIN_RECOVERY_ENABLED')==='true'&&
    !!dbId&&targetDb===dbId&&
    /^M-\d{4,12}$/.test(accountId)&&
    !!operator&&actor===operator,
    'MAINTENANCE','Pemulihan PIN tidak diizinkan untuk operator ini.');
  // Preflight UI BEFORE touching credentials: standalone GAS cannot safely
  // reveal a one-time PIN with SpreadsheetApp.getUi().
  var ui;
  try{ui=SpreadsheetApp.getUi();}
  catch(e){throw ngdError_('MAINTENANCE',
    'Pemulihan PIN harus dijalankan dari editor Apps Script yang terikat ke Google Sheets.');}
  var result=withLock_(function(){
    var matches=findRows_('members',function(row){return row.role==='ADMIN';});
    require_(matches.length===1&&String(matches[0].member_id)===accountId,
      'CONFLICT','Identitas akun admin tidak sesuai. Tidak ada perubahan.');
    var admin=matches[0];
    require_(admin.status==='AKTIF','FORBIDDEN','Akun admin tidak aktif.');
    var pin=randomStrongPin_(),salt=newSalt_();
    // Existing sessions are revoked. No login token is created.
    updateRow_('members',admin._row,{pin_hash:pinHash_(pin,salt),pin_salt:salt});
    var revoked=findRows_('sessions',function(r){return r.member_id===admin.member_id;});
    revoked.reverse().forEach(function(r){tbl_('sessions').sheet.deleteRow(r._row);});
    clearLoginFailures_(String(admin.wa));
    logAudit_(admin.member_id,'ADMIN','ADMIN_PIN_RECOVERED_OWNER','members',
      admin.member_id,'','',{revoked_sessions:revoked.length});
    return {pin:pin,account_id:accountId};
  });
  ui.alert('PIN admin baru (hanya tampil sekali): '+result.pin+
    '\nCatat secara privat. Semua sesi lama telah dicabut.');
  // Return no plaintext PIN into the execution record.
  return {success:true,account_id:result.account_id};
}
/**
 * Non-destructive STAGING-only bootstrap. Production already has an admin:
 * this helper refuses to write on PRODUCTION or if an admin exists.
 */
function bootstrapStagingAdminOwnerOnly(){
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var target=String(props.getProperty('NGD_STAGING_BOOTSTRAP_DB_ID')||'').trim();
  var operator=String(props.getProperty('NGD_ADMIN_RECOVERY_OPERATOR_EMAIL')||'').trim().toLowerCase();
  var actor=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
    props.getProperty('NGD_STAGING_BOOTSTRAP_ENABLED')==='true'&&
    !!dbId&&target===dbId&&!!operator&&actor===operator,
    'MAINTENANCE','Pembuatan admin hanya diizinkan di staging yang terkonfirmasi.');
  var ui;
  try{ui=SpreadsheetApp.getUi();}
  catch(e){throw ngdError_('MAINTENANCE',
    'Pembuatan admin harus dari editor Apps Script yang terikat ke Google Sheets.');}
  var wa=normalizeWa_(props.getProperty('NGD_ADMIN_WA'));
  var result=withLock_(function(){
    require_(!findRows_('members',function(m){return m.role==='ADMIN';}).length,
      'CONFLICT','Akun administrator sudah ada. Jangan membuat akun ganda.');
    require_(!findRows_('members',function(m){return m.member_id==='M-0001'||m.wa===wa;}).length,
      'CONFLICT','Identitas admin sudah digunakan.');
    var id='M-0001',pin=randomStrongPin_(),salt=newSalt_();
    appendRow_('members',{member_id:id,role:'ADMIN',nama:'Admin Ngulik Digital',
      wa:wa,nama_usaha:'Ngulik Digital',pin_hash:pinHash_(pin,salt),pin_salt:salt,
      kode_referral:'R'+uuid_().slice(0,7),status:'AKTIF',joined_at:now_()});
    logAudit_(id,'ADMIN','STAGING_ADMIN_CREATED','members',id,'','AKTIF',{});
    return {id:id,pin:pin};
  });
  ui.alert('Akun ADMIN staging dibuat. PIN sekali tampil: '+result.pin+
    '\nJangan gunakan PIN staging di layanan produksi.');
  return {created:true,account_id:result.id};
}

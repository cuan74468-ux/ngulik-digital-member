/**
 * NGULIK DIGITAL — akses administrator dan pemulihan PIN operator.
 *
 * File ini digunakan bersama Kode.gs, bukan sebagai penggantinya.
 * Pemulihan berjalan lewat dialog Google Sheets, BUKAN deployment publik.
 * PIN pilihan pemilik tidak dicatat di log dan tidak dikirim ke klien lain.
 * Jangan aktifkan login, mutasi umum, atau keuangan selama validasi.
 */
function adminPortalEnabled_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = String(props.getProperty('NGD_DB_ID') || '').trim();
  var target = String(props.getProperty('NGD_ADMIN_LOGIN_DB_ID') || '').trim();
  var owner = String(props.getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID') || '').trim();
  return props.getProperty('NGD_ADMIN_LOGIN_ENABLED') === 'true' &&
    (props.getProperty('NGD_ENVIRONMENT') === 'STAGING' ||
      props.getProperty('NGD_ENVIRONMENT') === 'PRODUCTION') &&
    !!dbId && target === dbId && /^M-\d{4,12}$/.test(owner);
}
function requireAdminPortalEnabled_() {
  require_(adminPortalEnabled_(), 'MAINTENANCE', 'Akses administrator belum diaktifkan.');
}
function adminPortalLogin_(p) {
  requireAdminPortalEnabled_();
  var expected = PropertiesService.getScriptProperties().getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID');
  return authLogin_(p, true, expected);
}
function adminPortalLogout_(token) {
  requireAdminPortalEnabled_();
  admin_(token);
  return authLogout_(token);
}
function adminPortalChangePin_(token, p) {
  requireAdminPortalEnabled_();
  var actor = admin_(token);
  require_(actor.member_id === PropertiesService.getScriptProperties()
    .getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID'), 'FORBIDDEN', 'Akses administrator ditolak.');
  return authChangePin_(actor, p);
}

/**
 * Verify operator, database, and existing ADMIN. Read-only when allowDisabled=true.
 * This guard MUST also be called by the server-side PIN update function.
 */
function adminRecoveryPreflight_(allowDisabled) {
  var props = PropertiesService.getScriptProperties();
  var dbId = String(props.getProperty('NGD_DB_ID') || '').trim();
  var targetDb = String(props.getProperty('NGD_ADMIN_RECOVERY_DB_ID') || '').trim();
  var targetAccount = String(props.getProperty('NGD_ADMIN_RECOVERY_ACCOUNT_ID') || '').trim();
  var loginAccount = String(props.getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID') || '').trim();
  var operator = String(props.getProperty('NGD_ADMIN_RECOVERY_OPERATOR_EMAIL') || '').trim().toLowerCase();
  var actor = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  var enabled = props.getProperty('NGD_ADMIN_RECOVERY_ENABLED') === 'true';
  require_((allowDisabled === true || enabled) &&
    ['STAGING', 'PRODUCTION'].indexOf(props.getProperty('NGD_ENVIRONMENT')) >= 0 &&
    !!dbId && targetDb === dbId &&
    /^M-\d{4,12}$/.test(targetAccount) && targetAccount === loginAccount &&
    !!operator && actor === operator,
    'MAINTENANCE', 'Konfigurasi atau kewenangan pemulihan PIN tidak valid.');
  var matches = findRows_('members', function (row) { return row.role === 'ADMIN'; });
  require_(matches.length === 1 && String(matches[0].member_id) === targetAccount &&
    matches[0].status === 'AKTIF' && !!matches[0].pin_hash && !!matches[0].pin_salt,
    'CONFLICT', 'Akun admin produksi tidak cocok atau tidak aktif.');
  return {accountId: targetAccount, enabled: enabled};
}

/**
 * Menu existing in Kode.gs calls this function.
 * Opening the form NEVER changes PIN or member data.
 * When NGD_ADMIN_RECOVERY_ENABLED=false, this is preview-only.
 */
function recoverAdminPinOwnerOnly() {
  var check = adminRecoveryPreflight_(true);
  var html = `<!doctype html>
<html><head><base target="_top"><meta charset="utf-8">
<style>
  body{font:14px Arial,sans-serif;color:#27313c;margin:0;padding:22px;background:#fff}
  h2{font-size:19px;margin:0 0 10px} p{line-height:1.55;color:#596573}
  label{display:block;font-weight:600;margin:16px 0 6px}
  input{box-sizing:border-box;width:100%;font-size:18px;padding:12px;border:1px solid #cbd3dc;border-radius:8px}
  button{margin-top:18px;background:#21446a;color:white;border:0;padding:12px 18px;border-radius:8px;font-size:14px;cursor:pointer}
  button:disabled{opacity:.5;cursor:not-allowed}
  #status{margin-top:14px;line-height:1.6;white-space:pre-wrap}
  .note{padding:12px;background:#f4f6f8;border-radius:8px;color:#394858}
</style></head><body>
<h2>Pemulihan PIN Administrator</h2>
<p>Anda menentukan PIN baru sendiri. PIN tidak akan ditampilkan ulang atau dicatat ke log.</p>
<div class="note" id="note"></div>
<form id="form" autocomplete="off">
<label for="pin">PIN baru (6 angka)</label>
<input id="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required>
<label for="confirm">Ulangi PIN baru</label>
<input id="confirm" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required>
<button id="submit" type="submit">Simpan PIN baru</button>
</form><div id="status" role="status" aria-live="polite"></div>
<script>
  const enabled = ${check.enabled ? 'true' : 'false'};
  const button = document.getElementById('submit');
  const status = document.getElementById('status');
  const note = document.getElementById('note');
  note.textContent = enabled
    ? 'Pemulihan diizinkan untuk satu kali penggunaan. Semua sesi admin lama akan dicabut.'
    : 'MODE PEMERIKSAAN: pemulihan masih NONAKTIF. Tidak ada PIN yang akan diubah.';
  if (!enabled) button.disabled = true;
  document.getElementById('form').addEventListener('submit', function(e){
    e.preventDefault();
    if (!enabled) return;
    const one = document.getElementById('pin').value;
    const two = document.getElementById('confirm').value;
    if (!/^[0-9]{6}$/.test(one) || one !== two) {
      status.textContent = 'Kedua PIN harus sama dan berisi enam angka.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Menyimpan PIN...';
    google.script.run
      .withSuccessHandler(function(response){
        document.getElementById('pin').value = '';
        document.getElementById('confirm').value = '';
        if (response && response.success === true) {
          status.textContent = 'BERHASIL. PIN baru telah disimpan. Catat PIN pilihan Anda secara pribadi. Semua sesi admin lama dicabut.';
        } else {
          status.textContent = 'Status tidak dapat dipastikan. Jangan mengulang pemulihan sebelum pemeriksaan.';
        }
      })
      .withFailureHandler(function(err){
        document.getElementById('pin').value = '';
        document.getElementById('confirm').value = '';
        status.textContent = 'GAGAL atau status belum dapat dipastikan: ' +
          (err && err.message ? err.message : 'Kesalahan tidak diketahui') +
          '. Jangan mengulang pemulihan sebelum pemeriksaan.';
      })
      .submitAdminPinRecoveryOwnerOnly(one, two);
  });
</script></body></html>`;
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(470).setHeight(520),
    'Ngulik Digital — Pemulihan PIN');
  return {formOpened: true, recoveryEnabled: check.enabled, dataChanged: false};
}

/**
 * Server-only form callback. Requires owner email + matching production DB,
 * a single active admin, two identical strong PINs, and enabled one-time gate.
 * This method is intentionally NOT exposed by the public doPost API router.
 */
function submitAdminPinRecoveryOwnerOnly(newPin, repeatedPin) {
  var check = adminRecoveryPreflight_(false);
  require_(typeof newPin === 'string' && newPin === repeatedPin,
    'VALIDATION', 'PIN konfirmasi tidak cocok.');
  var result = withLock_(function () {
    // Re-verify target after obtaining the lock.
    var state = adminRecoveryPreflight_(false);
    require_(state.accountId === check.accountId, 'CONFLICT', 'Akun administrator berubah.');
    var admin = findRows_('members', function (row) {return row.role === 'ADMIN';})[0];
    checkNewPin_(newPin, admin.wa);
    require_(pinHash_(newPin, admin.pin_salt) !== admin.pin_hash,
      'VALIDATION', 'PIN baru harus berbeda dengan PIN yang lama.');
    var salt = newSalt_();
    updateRow_('members', admin._row, {
      pin_salt: salt,
      pin_hash: pinHash_(newPin, salt)
    });
    var revoked = findRows_('sessions', function (s) {return s.member_id === admin.member_id;});
    revoked.reverse().forEach(function (s) {tbl_('sessions').sheet.deleteRow(s._row);});
    clearLoginFailures_(String(admin.wa));
    // Only status and the revoked-session COUNT are logged; never log newPin.
    logAudit_(admin.member_id, 'ADMIN', 'ADMIN_PIN_RECOVERED_OWNER',
      'members', admin.member_id, '', '', {revoked_sessions: revoked.length});
    PropertiesService.getScriptProperties().setProperty('NGD_ADMIN_RECOVERY_ENABLED', 'false');
    return {success: true, login_required: true};
  });
  return result;
}

/**
 * STAGING-only bootstrap preserved for backward compatibility.
 * It is NOT used for existing production admin account.
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
  var confirmation=ui.alert('Konfirmasi admin staging',
    'Buat satu akun admin khusus STAGING? Ini tidak mengubah database produksi.',
    ui.ButtonSet.YES_NO);
  require_(confirmation===ui.Button.YES,'CANCELLED','Bootstrap staging dibatalkan.');
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
  props.setProperty('NGD_STAGING_BOOTSTRAP_ENABLED','false');
  ui.alert('Akun ADMIN staging dibuat. PIN sekali tampil: '+result.pin+
    '\nJangan gunakan PIN staging di layanan produksi.');
  return {created:true,account_id:result.id};
}

/** Read-only operator preflight. */
function inspectAdminAccessOwnerOnly(){
  var props=PropertiesService.getScriptProperties();
  var expectedId=String(props.getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID')||'');
  var adminRecords=findRows_('members',function(row){return row.role==='ADMIN';});
  var expected=adminRecords.filter(function(row){return row.member_id===expectedId;});
  var checkHeaders=function(name,columns){
    var t=tbl_(name);
    return columns.every(function(column){return t.headers.indexOf(column)>=0;});
  };
  return {
    admin_count:adminRecords.length,
    expected_admin_present:expected.length===1,
    expected_admin_active:expected.length===1&&expected[0].status==='AKTIF',
    admin_pin_hash_present:expected.length===1&&!!expected[0].pin_hash&&!!expected[0].pin_salt,
    member_auth_columns:checkHeaders('members',
      ['member_id','role','wa','pin_hash','pin_salt','status','last_active_at']),
    session_columns:checkHeaders('sessions',
      ['token_hash','member_id','role','created_at','expires_at','last_seen_at']),
    audit_columns:checkHeaders('audit_logs',
      ['log_id','timestamp','actor_id','actor_role','action','entity','entity_id','detail_json']),
    isolated_auth_gate_ready:adminPortalEnabled_(),
    global_mutations_enabled:mutationsEnabled_(),
    finance_enabled:financeEnabled_(),
    needs_full_schema_migration:false
  };
}
function showAdminAccessStatus(){
  var props=PropertiesService.getScriptProperties();
  var operator=String(props.getProperty('NGD_ADMIN_RECOVERY_OPERATOR_EMAIL')||'').trim().toLowerCase();
  var actor=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  require_(!!operator&&actor===operator,'FORBIDDEN',
    'Pemeriksaan admin hanya untuk operator yang terverifikasi.');
  var state=inspectAdminAccessOwnerOnly();
  SpreadsheetApp.getUi().alert(
    'PEMERIKSAAN AKUN ADMIN NGULIK DIGITAL\n'+
    'Jumlah akun admin: '+state.admin_count+'\n'+
    'Akun yang dituju ditemukan: '+(state.expected_admin_present?'YA':'TIDAK')+'\n'+
    'Akun aktif: '+(state.expected_admin_active?'YA':'TIDAK')+'\n'+
    'Hash & salt PIN tersedia: '+(state.admin_pin_hash_present?'YA':'TIDAK')+'\n'+
    'Kolom autentikasi lengkap: '+(state.member_auth_columns&&state.session_columns&&state.audit_columns?'YA':'TIDAK')+'\n'+
    'Gerbang login khusus admin siap: '+(state.isolated_auth_gate_ready?'YA':'TIDAK')+'\n'+
    'Mutasi umum aktif: '+(state.global_mutations_enabled?'YA':'TIDAK')+'\n'+
    'Keuangan aktif: '+(state.finance_enabled?'YA':'TIDAK')+'\n\n'+
    'Tidak ada perubahan data selama pemeriksaan ini.');
  return {checked:true};
}
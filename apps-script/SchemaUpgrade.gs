/**
 * Ngulik Digital — additive schema upgrade, owner-only.
 *
 * This is NOT invoked by doPost, doGet, setupDatabase or onOpen.
 * It never changes existing headers, rows, member records, credentials,
 * orders, financial ledgers, or feature switches.
 *
 * INSTALL: Copy to bound Apps Script project after code review. First run
 * ngdSchemaUpgradePreviewOwnerOnly (read-only).
 *
 * APPLY: Requires a NEW full spreadsheet backup, explicit Script Properties,
 * a verified operator, disabled global mutation/finance gates, UI confirmation
 * and a script lock. Missing tabs only; no historical data is rewritten.
 */
function ngdSchemaUpgradeOperator_() {
  var props=PropertiesService.getScriptProperties();
  var operator=String(props.getProperty('NGD_ADMIN_RECOVERY_OPERATOR_EMAIL')||'')
    .trim().toLowerCase();
  var actor=String(Session.getEffectiveUser().getEmail()||'')
    .trim().toLowerCase();
  require_(!!operator&&actor===operator,'FORBIDDEN',
    'Audit dan migrasi skema hanya untuk pemilik yang terverifikasi.');
  return props;
}
function ngdSchemaSnapshot_(spreadsheetId) {
  var ss=SpreadsheetApp.openById(spreadsheetId);
  var expected=Object.keys(NGD.HEADERS);
  var missing=[],compatible=[],issues=[],extensions={};
  expected.forEach(function(name){
    var sh=ss.getSheetByName(name);
    if(!sh){missing.push(name);return;}
    var width=sh.getLastColumn();
    var actual=width>0?sh.getRange(1,1,1,width).getValues()[0].map(String):[];
    var required=NGD.HEADERS[name].split(',');
    var absent=required.filter(function(h){return actual.indexOf(h)<0;});
    var seen={},duplicates=[];
    actual.forEach(function(h){
      if(!h)return;
      if(seen[h])duplicates.push(h);
      else seen[h]=true;
    });
    if(absent.length||duplicates.length)issues.push({
      table:name,missing_columns:absent,duplicate_columns:duplicates
    });
    else compatible.push(name);
    var extra=actual.filter(function(h){return !!h&&required.indexOf(h)<0;});
    if(extra.length)extensions[name]=extra;
  });
  return {
    expected:expected.length,existing_compatible:compatible.length,
    missing:missing,issues:issues,extended_tables:Object.keys(extensions),
    additional_tabs:ss.getSheets().map(function(sh){return sh.getName();})
      .filter(function(name){return expected.indexOf(name)<0;}),
    ready:missing.length===0&&issues.length===0
  };
}
/** Returns metadata only. No phone number, member row, hash or token. */
function ngdSchemaUpgradePreviewOwnerOnly() {
  var props=ngdSchemaUpgradeOperator_();
  var id=String(props.getProperty('NGD_DB_ID')||'').trim();
  require_(!!id,'MAINTENANCE','NGD_DB_ID belum dikonfigurasi.');
  var state=ngdSchemaSnapshot_(id);
  console.log('NGD_SCHEMA_PREVIEW '+JSON.stringify(state));
  return state;
}
function ngdSchemaUpgradeBackupCheck_(targetId,backupId) {
  require_(!!backupId&&backupId!==targetId,'MAINTENANCE',
    'ID backup independen wajib diisi sebelum migrasi.');
  var backup=SpreadsheetApp.openById(backupId);
  var live=SpreadsheetApp.openById(targetId);
  var original=live.getSheetByName('members'),copy=backup.getSheetByName('members');
  require_(!!original&&!!copy,'SCHEMA_MISMATCH',
    'Backup tidak memuat tab members.');
  var liveWidth=original.getLastColumn(),backupWidth=copy.getLastColumn();
  var origHeaders=original.getRange(1,1,1,liveWidth).getValues()[0].map(String);
  var copyHeaders=copy.getRange(1,1,1,backupWidth).getValues()[0].map(String);
  require_(origHeaders.join('|')===copyHeaders.join('|')&&
    original.getLastRow()===copy.getLastRow(),'SCHEMA_MISMATCH',
    'Backup tidak cocok dengan jumlah baris dan header member saat ini.');
  // These checks establish structural consistency, not freshness. The owner
  // must create and verify a new backup immediately before applying.
  return {verified:true};
}
/**
 * Irreversible schema addition is intentionally separate from the preview.
 * Enabling this switch does not itself run the migration.
 */
function ngdSchemaUpgradeMissingTabsOwnerOnly() {
  var props=ngdSchemaUpgradeOperator_();
  var targetId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var permitId=String(props.getProperty('NGD_SCHEMA_UPGRADE_TARGET_DB_ID')||'').trim();
  var backupId=String(props.getProperty('NGD_SCHEMA_UPGRADE_BACKUP_DB_ID')||'').trim();
  require_(props.getProperty('NGD_SCHEMA_UPGRADE_ENABLED')==='true'&&
    ['STAGING','PRODUCTION'].indexOf(props.getProperty('NGD_ENVIRONMENT'))>=0&&
    !!targetId&&permitId===targetId,
    'MAINTENANCE','Migrasi skema belum diizinkan untuk database ini.');
  require_(!mutationsEnabled_()&&!financeEnabled_(),'MAINTENANCE',
    'Matikan mutasi umum dan keuangan sebelum mengubah struktur.');
  ngdSchemaUpgradeBackupCheck_(targetId,backupId);
  var preflight=ngdSchemaSnapshot_(targetId);
  require_(preflight.issues.length===0,'SCHEMA_MISMATCH',
    'Header existing bermasalah; audit manual diperlukan.');
  if(!preflight.missing.length){
    props.setProperty('NGD_SCHEMA_UPGRADE_ENABLED','false');
    return {created:[],already_complete:true};
  }
  var ui;
  try{ui=SpreadsheetApp.getUi();}
  catch(e){throw ngdError_('MAINTENANCE',
    'Jalankan dari menu proyek Apps Script yang terikat ke Google Sheets.');}
  var answer=ui.alert('Tambah '+preflight.missing.length+' tab modul Ngulik Digital',
    'Hanya tab yang belum ada akan dibuat. Tidak ada data lama yang dihapus. '+
    'Pastikan backup baru sudah diperiksa. Lanjutkan?',
    ui.ButtonSet.YES_NO);
  require_(answer===ui.Button.YES,'CANCELLED','Migrasi dibatalkan.');
  var changed=withLock_(function(){
    var state=ngdSchemaSnapshot_(targetId);
    require_(state.issues.length===0,'SCHEMA_MISMATCH',
      'Struktur berubah selama persiapan; hentikan migrasi.');
    var ss=SpreadsheetApp.openById(targetId),created=[];
    state.missing.forEach(function(name){
      // Recheck before every creation to remain idempotent after a timeout.
      if(ss.getSheetByName(name))return;
      var header=NGD.HEADERS[name].split(',');
      var sh=ss.insertSheet(name);
      if(sh.getMaxColumns()<header.length){
        sh.insertColumnsAfter(sh.getMaxColumns(),header.length-sh.getMaxColumns());
      }
      sh.getRange(1,1,1,header.length).setValues([header]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,header.length)
        .setBackground('#e8eef2').setFontWeight('bold');
      created.push(name);
    });
    SpreadsheetApp.flush();
    if(created.length)logAudit_(
      String(props.getProperty('NGD_ADMIN_LOGIN_ACCOUNT_ID')||'SYSTEM'),
      'ADMIN','SCHEMA_ADDITIVE_UPGRADE','schema','', '', '',
      {created:created,count:created.length});
    return created;
  });
  props.setProperty('NGD_SCHEMA_UPGRADE_ENABLED','false');
  var after=ngdSchemaSnapshot_(targetId);
  return {created:changed,verified:after.ready,remaining:after.missing,
    issues:after.issues};
}

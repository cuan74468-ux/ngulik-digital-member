/**
 * NGULIK DIGITAL — member and ledger integrity audit (STAGING, owner-run).
 *
 * No mutation, outbound requests, member identifiers, PINs or session hashes
 * are logged. Checks only configured STAGING database after the strict
 * 29-table infrastructure preflight has succeeded.
 *
 * Execute from the STAGING Apps Script editor, never expose via doPost.
 */
var NGD_INTEGRITY_TABLES_ = {
  members:['member_id','wa','role','wa_verified'],
  sessions:['token_hash','member_id','expires_at'],
  credits_ledger:['entry_id','member_id','tipe','status'],
  orders:['order_id','member_id'],
  lms_courses:['course_id'],
  lms_lessons:['lesson_id','course_id'],
  lms_enrollments:['enrollment_id','member_id','course_id'],
  otp_verifications:['otp_id','status']
};
var NGD_INTEGRITY_ROW_LIMIT_ = 2000;

function ngdIntegrityReadRows_(ss,name,columns) {
  var sh=ss.getSheetByName(name);
  if(!sh)throw new Error('INTEGRITY_TAB_MISSING: '+name);
  var count=Math.max(0,sh.getLastRow()-1);
  if(count>NGD_INTEGRITY_ROW_LIMIT_)
    throw new Error('INTEGRITY_SCAN_LIMIT: '+name);
  if(!count)return [];
  var width=sh.getLastColumn();
  var header=sh.getRange(1,1,1,width).getValues()[0].map(function(x){
    return String(x||'').trim();
  });
  var data={};
  columns.forEach(function(col) {
    var index=header.indexOf(col);
    if(index<0||header.lastIndexOf(col)!==index)
      throw new Error('INTEGRITY_HEADER_INVALID: '+name);
    data[col]=sh.getRange(2,index+1,count,1).getValues().map(function(row){
      return row[0];
    });
  });
  return Array.from({length:count},function(_,i) {
    var obj={};
    columns.forEach(function(k){obj[k]=data[k][i];});
    return obj;
  });
}

function ngdIntegrityEvaluate_(t) {
  var issues={
    missing_member_identifier:0,duplicate_member_identifier:0,
    missing_whatsapp:0,duplicate_whatsapp:0,unverified_member:0,
    orphan_session:0,duplicate_session_hash:0,
    orphan_credit_entry:0,duplicate_credit_entry:0,
    duplicate_starter_grant:0,orphan_order:0,duplicate_order:0,
    duplicate_lms_course:0,duplicate_lms_lesson:0,
    orphan_lms_lesson:0,orphan_lms_enrollment:0,
    duplicate_otp:0
  };
  var seenMembers={},seenWa={},seenSessions={},seenCredits={},
    seenGrants={},seenOrders={},seenCourses={},seenLessons={},seenOtp={};
  function string_(x){return String(x==null?'':x).trim();}
  function checkDuplicate_(map,key,issue) {
    if(!key)return;
    if(map[key])issues[issue]++;
    map[key]=true;
  }
  function waKey_(raw) {
    var str=string_(raw).replace(/[\s()+-]/g,'');
    return str.charAt(0)==='0'?'62'+str.slice(1):str;
  }
  t.members.forEach(function(row) {
    var id=string_(row.member_id),wa=waKey_(row.wa);
    if(!id)issues.missing_member_identifier++;
    else checkDuplicate_(seenMembers,id,'duplicate_member_identifier');
    if(!wa)issues.missing_whatsapp++;
    else checkDuplicate_(seenWa,wa,'duplicate_whatsapp');
    if(string_(row.role)==='MEMBER' &&
       row.wa_verified!==true && string_(row.wa_verified).toLowerCase()!=='true')
      issues.unverified_member++;
  });
  t.sessions.forEach(function(row) {
    var id=string_(row.member_id),hash=string_(row.token_hash);
    if(!id||!seenMembers[id])issues.orphan_session++;
    checkDuplicate_(seenSessions,hash,'duplicate_session_hash');
  });
  t.credits_ledger.forEach(function(row) {
    var id=string_(row.member_id);
    if(!id||!seenMembers[id])issues.orphan_credit_entry++;
    checkDuplicate_(seenCredits,string_(row.entry_id),'duplicate_credit_entry');
    if(string_(row.tipe)==='GRANT'&&string_(row.status)==='POSTED')
      checkDuplicate_(seenGrants,id,'duplicate_starter_grant');
  });
  t.orders.forEach(function(row) {
    var id=string_(row.member_id);
    if(!id||!seenMembers[id])issues.orphan_order++;
    checkDuplicate_(seenOrders,string_(row.order_id),'duplicate_order');
  });
  t.lms_courses.forEach(function(row) {
    checkDuplicate_(seenCourses,string_(row.course_id),'duplicate_lms_course');
  });
  t.lms_lessons.forEach(function(row) {
    var id=string_(row.course_id);
    if(!id||!seenCourses[id])issues.orphan_lms_lesson++;
    checkDuplicate_(seenLessons,string_(row.lesson_id),'duplicate_lms_lesson');
  });
  t.lms_enrollments.forEach(function(row) {
    if(!seenCourses[string_(row.course_id)]||
       !seenMembers[string_(row.member_id)])
      issues.orphan_lms_enrollment++;
  });
  t.otp_verifications.forEach(function(row) {
    checkDuplicate_(seenOtp,string_(row.otp_id),'duplicate_otp');
  });
  var names=Object.keys(issues);
  return {
    ready:names.every(function(k){return issues[k]===0;}),
    issue_counts:issues,
    // Numbers only: never expose member identity or raw data.
    scanned_rows:Object.keys(NGD_INTEGRITY_TABLES_).reduce(function(out,name){
      out[name]=t[name].length;return out;
    },{})
  };
}
function ngdDataIntegrityPreflightReadOnly() {
  var props=PropertiesService.getScriptProperties();
  if(String(props.getProperty('NGD_ENVIRONMENT')||'')!=='STAGING')
    throw new Error('INTEGRITY_NOT_STAGING');
  if(typeof ngdInfrastructurePreflightReadOnly!=='function')
    throw new Error('INTEGRITY_INFRASTRUCTURE_PREFLIGHT_REQUIRED');
  var infra=ngdInfrastructurePreflightReadOnly();
  if(!infra||infra.schema_ready!==true||infra.tables_checked!==29)
    throw new Error('INTEGRITY_INFRASTRUCTURE_NOT_READY');
  var id=String(props.getProperty('NGD_DB_ID')||'').trim();
  if(!id)throw new Error('INTEGRITY_DB_NOT_CONFIGURED');
  var ss=SpreadsheetApp.openById(id);
  if(String(ss.getId())!==id)
    throw new Error('INTEGRITY_DB_IDENTITY_MISMATCH');
  var tables={};
  Object.keys(NGD_INTEGRITY_TABLES_).forEach(function(name){
    tables[name]=ngdIntegrityReadRows_(ss,name,NGD_INTEGRITY_TABLES_[name]);
  });
  var result=ngdIntegrityEvaluate_(tables);
  result.environment='STAGING';
  result.mutations_performed=false;
  console.log('NGD_DATA_INTEGRITY_'+(result.ready?'OK':'REVIEW_REQUIRED')+
    ' | tables='+Object.keys(tables).length+
    ' | issues='+Object.keys(result.issue_counts).filter(function(k){
      return result.issue_counts[k]>0;
    }).map(function(k){return k+':'+result.issue_counts[k];}).join(',')+
    ' | writes=false');
  return result;
}

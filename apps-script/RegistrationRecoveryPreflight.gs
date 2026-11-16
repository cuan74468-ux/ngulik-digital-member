/**
 * NGULIK DIGITAL — Stage 1 registration recovery preflight.
 * STAGING, owner/editor-only, strictly READ-ONLY.
 *
 * Identifies partial registration commits across members, otp_verifications
 * and credits_ledger. Does not issue credits, change OTP, create sessions,
 * send messages or log member identifiers/contact details. No HTTP route.
 * Read-only diagnostics are not a substitute for an approved repair runbook.
 */

var NGD_RECOVERY_TABLES_ = {
  members:['member_id','wa','role','status','wa_verified'],
  otp_verifications:['otp_id','wa','tujuan','status'],
  credits_ledger:['entry_id','member_id','tipe','status','jumlah'],
  pengaturan_sistem:['key','value']
};

function ngdRegistrationRecoveryEvaluate_(tables) {
  var issues={
    used_otp_without_member:0,
    member_with_verified_unconsumed_otp:0,
    verified_active_member_missing_starter_grant:0,
    waiting_member_with_starter_grant:0,
    verified_member_without_used_otp:0,
    duplicate_credit_policy_key:0,
    orphan_starter_grant:0,
    unposted_starter_grant:0,
    duplicate_starter_grant:0,
    unexpected_starter_grant_amount:0
  };
  function text_(v){return String(v==null?'':v).trim();}
  function normalize_(raw){
    var value=text_(raw).replace(/[\s()+-]/g,'');
    return value.charAt(0)==='0'?'62'+value.slice(1):value;
  }
  var settings=Object.create(null),policyKeys=Object.create(null);
  tables.pengaturan_sistem.forEach(function(row){
    var key=text_(row.key);
    if(!key)return;
    if(key==='kredit_awal'){
      policyKeys[key]=(policyKeys[key]||0)+1;
      if(policyKeys[key]>1)issues.duplicate_credit_policy_key++;
    }
    settings[key]=row.value;
  });
  // Do not infer a default from old blueprints: no policy change and no
  // diagnosis of "missing" starter credit without an explicit setting.
  var creditRaw=settings.kredit_awal;
  var creditConfigured=creditRaw!==undefined&&creditRaw!==null&&
    String(creditRaw).trim()!=='';
  var creditAmount=creditConfigured?Number(creditRaw):NaN;
  var creditPolicyKnown=creditConfigured&&Number.isInteger(creditAmount)&&
    creditAmount>=0&&creditAmount<=1000&&
    (policyKeys.kredit_awal||0)===1;
  var membersByWa=Object.create(null),membersById=Object.create(null);
  tables.members.forEach(function(row){
    var id=text_(row.member_id),wa=normalize_(row.wa);
    if(text_(row.role)==='MEMBER'&&id&&wa){
      membersById[id]=row;
      membersByWa[wa]=row;
    }
  });
  var usedByWa=Object.create(null),verifiedByWa=Object.create(null),
    grantByMember=Object.create(null),allGrantsByMember=Object.create(null);
  tables.otp_verifications.forEach(function(row){
    if(text_(row.tujuan)!=='REGISTRATION')return;
    var wa=normalize_(row.wa),status=text_(row.status);
    if(!wa)return;
    if(status==='USED'){
      usedByWa[wa]=(usedByWa[wa]||0)+1;
      if(!membersByWa[wa])issues.used_otp_without_member++;
    }
    if(status==='VERIFIED'){
      verifiedByWa[wa]=(verifiedByWa[wa]||0)+1;
      if(membersByWa[wa])issues.member_with_verified_unconsumed_otp++;
    }
  });
  tables.credits_ledger.forEach(function(row){
    if(text_(row.tipe)!=='GRANT')return;
    var id=text_(row.member_id),status=text_(row.status);
    if(!id||!membersById[id])issues.orphan_starter_grant++;
    if(id)allGrantsByMember[id]=(allGrantsByMember[id]||0)+1;
    if(status!=='POSTED')issues.unposted_starter_grant++;
    else if(id)grantByMember[id]=(grantByMember[id]||0)+1;
    // The configured starter amount may have been changed historically.
    // A mismatch is always "review required", never an authorization
    // to rewrite past financial evidence.
    var amount=Number(row.jumlah);
    var valid=String(row.jumlah==null?'':row.jumlah).trim()!==''&&
      Number.isSafeInteger(amount)&&amount>0;
    if(!valid||(creditPolicyKnown&&amount!==creditAmount))
      issues.unexpected_starter_grant_amount++;
  });
  Object.keys(allGrantsByMember).forEach(function(id){
    if(allGrantsByMember[id]>1)
      issues.duplicate_starter_grant+=allGrantsByMember[id]-1;
  });
  Object.keys(membersById).forEach(function(id){
    var member=membersById[id],wa=normalize_(member.wa);
    var verified=member.wa_verified===true||
      text_(member.wa_verified).toLowerCase()==='true';
    var granted=!!grantByMember[id],status=text_(member.status);
    if(status==='WAITING_LIST'&&granted)
      issues.waiting_member_with_starter_grant++;
    if(!verified)return;
    if(!usedByWa[wa]&&!verifiedByWa[wa])
      issues.verified_member_without_used_otp++;
    if(creditPolicyKnown&&creditAmount>0&&status==='AKTIF'&&!granted)
      issues.verified_active_member_missing_starter_grant++;
  });
  var count=Object.keys(issues).reduce(function(n,key){
    return n+issues[key];
  },0);
  return {
    ready:count===0&&creditPolicyKnown,
    review_required:count!==0||!creditPolicyKnown,
    issue_counts:issues,
    starter_policy_configured:creditPolicyKnown,
    // Counts only, never print or expose IDs, OTP status row references or WA.
    scanned_rows:Object.keys(NGD_RECOVERY_TABLES_).reduce(function(out,key){
      out[key]=tables[key].length;return out;
    },{})
  };
}

function ngdRegistrationRecoveryPreflightReadOnly(){
  var p=PropertiesService.getScriptProperties();
  if(String(p.getProperty('NGD_ENVIRONMENT')||'')!=='STAGING')
    throw new Error('RECOVERY_NOT_STAGING');
  if(typeof ngdInfrastructurePreflightReadOnly!=='function')
    throw new Error('RECOVERY_INFRASTRUCTURE_PREFLIGHT_REQUIRED');
  if(typeof ngdIntegrityReadRows_!=='function')
    throw new Error('RECOVERY_INTEGRITY_READER_REQUIRED');
  var infra=ngdInfrastructurePreflightReadOnly();
  if(!infra||infra.schema_ready!==true||infra.tables_checked!==29)
    throw new Error('RECOVERY_INFRASTRUCTURE_NOT_READY');
  var id=String(p.getProperty('NGD_DB_ID')||'').trim();
  if(!id)throw new Error('RECOVERY_DB_NOT_CONFIGURED');
  var ss=SpreadsheetApp.openById(id);
  if(!ss||String(ss.getId())!==id)
    throw new Error('RECOVERY_DB_IDENTITY_MISMATCH');
  var tables={};
  Object.keys(NGD_RECOVERY_TABLES_).forEach(function(name){
    tables[name]=ngdIntegrityReadRows_(ss,name,NGD_RECOVERY_TABLES_[name]);
  });
  var report=ngdRegistrationRecoveryEvaluate_(tables);
  report.environment='STAGING';
  report.mutations_performed=false;
  console.log('NGD_REGISTRATION_RECOVERY_'+
    (report.ready?'OK':'REVIEW_REQUIRED')+
    ' | tables=4 | issues='+Object.keys(report.issue_counts).filter(function(k){
      return report.issue_counts[k]>0;
    }).map(function(k){return k+':'+report.issue_counts[k];}).join(',')+
    ' | starter_policy='+
    (report.starter_policy_configured?'CONFIGURED':'REVIEW_REQUIRED')+
    ' | writes=false');
  return report;
}

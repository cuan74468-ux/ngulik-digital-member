'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,
  '../apps-script/RegistrationRecoveryPreflight.gs'),'utf8');
function fixture(tables={},opts={}){
  const data={
    members:[],otp_verifications:[],credits_ledger:[],
    pengaturan_sistem:[{key:'kredit_awal',value:10}],...tables
  };
  const metrics={opens:0,reads:0,writes:0,network:0};
  const logs=[];
  const props={NGD_ENVIRONMENT:'STAGING',NGD_DB_ID:'TEST-STAGE-ONLY',...opts.props};
  const ctx={
    console:{log(v){logs.push(String(v));}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||null;}}}},
    SpreadsheetApp:{openById(id){
      metrics.opens++;assert.equal(id,'TEST-STAGE-ONLY');
      return {getId(){return opts.actualId||'TEST-STAGE-ONLY';}};
    }},
    UrlFetchApp:new Proxy({}, {get(){metrics.network++;throw Error('NO_NETWORK');}})
  };
  vm.createContext(ctx);
  vm.runInContext(source,ctx,{timeout:2000});
  if(!opts.missingInfra)ctx.ngdInfrastructurePreflightReadOnly=()=>{
    if(opts.infraBad)return {schema_ready:false,tables_checked:28};
    return {schema_ready:true,tables_checked:29};
  };
  ctx.ngdIntegrityReadRows_=(ss,name,columns)=>{
    metrics.reads++;
    assert.ok(data[name],name);
    return data[name].map(row=>Object.fromEntries(columns.map(c=>[c,row[c]??''])));
  };
  return {ctx,data,metrics,logs,run:()=>ctx.ngdRegistrationRecoveryPreflightReadOnly()};
}
const member=(id,wa,status='AKTIF')=>({member_id:id,wa,role:'MEMBER',
  status,wa_verified:true});
const otp=(wa,status)=>({otp_id:'OTP-1',wa,tujuan:'REGISTRATION',status});
const grant=(id,jumlah=10,status='POSTED')=>({entry_id:'L-1',member_id:id,tipe:'GRANT',status,jumlah});
test('empty STAGING is safe and requires no database writes',()=>{
  const h=fixture();
  const result=h.run();
  assert.equal(result.ready,true);
  assert.equal(result.mutations_performed,false);
  assert.deepEqual(h.metrics,{opens:1,reads:4,writes:0,network:0});
  assert.match(h.logs[0],/NGD_REGISTRATION_RECOVERY_OK/);
});
test('healthy verified member with used OTP and posted grant passes',()=>{
  const h=fixture({members:[member('M-1','081231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-1')]});
  const result=h.run();
  assert.equal(result.ready,true);
  assert.ok(Object.values(result.issue_counts).every(v=>v===0));
  assert.doesNotMatch(h.logs[0],/628123|M-1|OTP-1|L-1/);
});
test('USED OTP without registered member is reported (old consume-first failure)',()=>{
  const h=fixture({otp_verifications:[otp('6281231231231','USED')]});
  const result=h.run();
  assert.equal(result.ready,false);
  assert.equal(result.issue_counts.used_otp_without_member,1);
});
test('member saved but OTP consumption failed is reported',()=>{
  const h=fixture({members:[member('M-2','6281231231231')],
    otp_verifications:[otp('6281231231231','VERIFIED')]});
  const result=h.run();
  assert.equal(result.issue_counts.member_with_verified_unconsumed_otp,1);
  assert.equal(result.issue_counts.verified_active_member_missing_starter_grant,1);
});
test('member saved and OTP consumed but grant failed is reported',()=>{
  const h=fixture({members:[member('M-3','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')]});
  const r=h.run();
  assert.equal(r.issue_counts.verified_active_member_missing_starter_grant,1);
  assert.equal(r.issue_counts.member_with_verified_unconsumed_otp,0);
});
test('waiting list member should not be granted before promotion',()=>{
  const h=fixture({members:[member('M-4','6281231231231','WAITING_LIST')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-4')]});
  const r=h.run();
  assert.equal(r.issue_counts.waiting_member_with_starter_grant,1);
  assert.equal(r.issue_counts.verified_active_member_missing_starter_grant,0);
});
test('zero-credit policy never infers missing grants',()=>{
  const h=fixture({
    members:[member('M-1','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    pengaturan_sistem:[{key:'kredit_awal',value:0}]
  });
  assert.equal(h.run().ready,true);
});
test('missing credit policy blocks OK but never guesses default values',()=>{
  const h=fixture({pengaturan_sistem:[]});
  const r=h.run();assert.equal(r.ready,false);
  assert.equal(r.starter_policy_configured,false);
  assert.equal(h.metrics.writes,0);
});
test('old verified member without any USED OTP is review required, not auto-repaired',()=>{
  const h=fixture({members:[member('M-1','6281231231231')],
    credits_ledger:[grant('M-1')]});
  const r=h.run();
  assert.equal(r.issue_counts.verified_member_without_used_otp,1);
});
test('ADMIN accounts do not require a registration OTP or starter grant',()=>{
  const h=fixture({members:[{member_id:'A-1',wa:'6281231231231',
    role:'ADMIN',status:'AKTIF',wa_verified:false}]});
  const r=h.run();assert.equal(r.ready,true);
});
test('posted GRANT with an unexpected amount cannot pass as healthy',()=>{
  const h=fixture({members:[member('M-1','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-1',3)]});
  const r=h.run();
  assert.equal(r.ready,false);
  assert.equal(r.issue_counts.unexpected_starter_grant_amount,1);
  assert.equal(r.issue_counts.verified_active_member_missing_starter_grant,0);
  assert.equal(h.metrics.writes,0);
});
test('two posted starter grants are reported without deducting balances',()=>{
  const h=fixture({members:[member('M-1','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-1'),{...grant('M-1'),entry_id:'L-2'}]});
  const r=h.run();
  assert.equal(r.issue_counts.duplicate_starter_grant,1);
  assert.equal(r.issue_counts.unexpected_starter_grant_amount,0);
  assert.equal(h.metrics.writes,0);
});
test('non-posted grant does not make missing POSTED starter grant disappear',()=>{
  const h=fixture({members:[member('M-1','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-1',10,'PENDING')]});
  const r=h.run();
  assert.equal(r.issue_counts.unposted_starter_grant,1);
  assert.equal(r.issue_counts.verified_active_member_missing_starter_grant,1);
});
test('orphan starter GRANT always requires operator review',()=>{
  const h=fixture({credits_ledger:[grant('M-DELETED')]});
  const r=h.run();
  assert.equal(r.issue_counts.orphan_starter_grant,1);
  assert.equal(r.ready,false);
  assert.doesNotMatch(h.logs[0],/M-DELETED/);
});
test('invalid, blank or fractional grant amounts are rejected as evidence',()=>{
  for(const amount of ['',-10,1.25,'not-a-number']){
    const h=fixture({members:[member('M-1','6281231231231')],
      otp_verifications:[otp('6281231231231','USED')],
      credits_ledger:[grant('M-1',amount)]});
    const r=h.run();
    assert.equal(r.issue_counts.unexpected_starter_grant_amount,1);
  }
});
test('duplicate credit policy rows block readiness before any policy repair',()=>{
  const h=fixture({pengaturan_sistem:[
    {key:'kredit_awal',value:10},{key:'kredit_awal',value:0}
  ]});
  const r=h.run();
  assert.equal(r.ready,false);
  assert.equal(r.starter_policy_configured,false);
  assert.equal(r.issue_counts.duplicate_credit_policy_key,1);
});
test('zero-credit policy with non-zero starter GRANT is flagged for historical review',()=>{
  const h=fixture({members:[member('M-1','6281231231231')],
    otp_verifications:[otp('6281231231231','USED')],
    credits_ledger:[grant('M-1',10)],
    pengaturan_sistem:[{key:'kredit_awal',value:0}]});
  const r=h.run();
  assert.equal(r.ready,false);
  assert.equal(r.issue_counts.unexpected_starter_grant_amount,1);
});
test('production is rejected without opening Sheets',()=>{
  const h=fixture({}, {props:{NGD_ENVIRONMENT:'PRODUCTION'}});
  assert.throws(()=>h.run(),/RECOVERY_NOT_STAGING/);
  assert.equal(h.metrics.opens,0);
});
test('infrastructure gate is mandatory and fails closed',()=>{
  const h=fixture({}, {missingInfra:true});
  assert.throws(()=>h.run(),/RECOVERY_INFRASTRUCTURE_PREFLIGHT_REQUIRED/);
  assert.equal(h.metrics.opens,0);
  const bad=fixture({}, {infraBad:true});
  assert.throws(()=>bad.run(),/RECOVERY_INFRASTRUCTURE_NOT_READY/);
  assert.equal(bad.metrics.opens,0);
});
test('spreadsheet identity mismatch fails before table rows are read',()=>{
  const h=fixture({}, {actualId:'WRONG-DB'});
  assert.throws(()=>h.run(),/RECOVERY_DB_IDENTITY_MISMATCH/);
  assert.equal(h.metrics.reads,0);
});
test('read-only editor function is never dispatched through the API router',()=>{
  const backend=fs.readFileSync(path.resolve(__dirname,'../apps-script/Code.gs'),'utf8');
  assert.doesNotMatch(backend,/case\s+['"]ngdRegistrationRecoveryPreflightReadOnly['"]/);
  assert.doesNotMatch(source,/setValues\(|appendRow\(|deleteRow\(|UrlFetchApp\.fetch\(/);
});

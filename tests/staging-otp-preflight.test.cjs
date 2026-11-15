'use strict';
// Offline regression for the owner-run OTP schema preflight. No real Sheets,
// WhatsApp, login, external requests, tokens or session mutations.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const source=fs.readFileSync(path.join(root,'apps-script/StagingOtpDiagnostics.gs'),'utf8');
function boot(overrides={}){
  const props=Object.assign({NGD_ENVIRONMENT:'STAGING'},overrides.props||{});
  const calls={guard:0,read:0,write:0,network:0},logs=[];
  const context=vm.createContext({
    console:{log(t){logs.push(String(t));},warn(t){logs.push(String(t));},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||null;}}}},
    SpreadsheetApp:new Proxy({}, {get(){throw Error('SPREADSHEET_API_FORBIDDEN');}}),
    UrlFetchApp:new Proxy({}, {get(){calls.network++;throw Error('NETWORK_FORBIDDEN');}})
  });
  vm.runInContext(core+'\n'+source,context,{timeout:5000});
  context.diagnosticBackendDbGuard_=()=>{calls.guard++;};
  context.db_=()=>({getSheetByName(name){
    if(name===overrides.missing)return null;
    let headers;
    if(name==='otp_verifications')
      headers='otp_id,wa,kode_hash,tujuan,status,attempts,created_at,expires_at,verified_at,ip_or_device'.split(',');
    else if(name==='wa_notifications')
      headers='notif_id,tujuan_wa,tipe_penerima,template_kode,ref_id,pesan,status,retry_count,created_at,sent_at,gateway_response'.split(',');
    else if(name==='members')
      headers='member_id,wa,wa_verified,wa_verified_at,pin_hash,pin_salt'.split(',');
    else throw Error('UNEXPECTED_TABLE');
    if(overrides.changeHeader===name)headers=overrides.newHeaders;
    return {getLastColumn(){return headers.length;},
      getLastRow(){return name==='members'?2:1;},
      getRange(){return {getValues(){calls.read++;return [headers];}};},
      setValues(){calls.write++;throw Error('WRITE_FORBIDDEN');},
      appendRow(){calls.write++;throw Error('WRITE_FORBIDDEN');}};
  }});
  return {context,calls,logs};
}
test('OTP schema preflight succeeds with 3 valid headers, no vendor setup',()=>{
  const x=boot();
  assert.equal(x.context.ngdOtpStagingPreflight(),'OTP_STAGING_SCHEMA_PREFLIGHT_OK');
  assert.equal(x.calls.guard,1);
  assert.equal(x.calls.read,3);
  assert.equal(x.calls.network,0);
  assert.equal(x.calls.write,0);
  assert.ok(x.logs.some(t=>t.includes('OTP_STAGING_SCHEMA_PREFLIGHT_OK')));
});
test('global external-provider switch must remain OFF in foundation phase',()=>{
  const x=boot({props:{NGD_EXTERNAL_PROVIDERS_ENABLED:'true'}});
  assert.throws(()=>x.context.ngdOtpStagingPreflight(),/OTP_PREFLIGHT_FLAGS_MUST_BE_OFF/);
  assert.equal(x.calls.read,0);
  assert.equal(x.calls.network,0);
});
test('STAGING OTP preflight refuses production before reading table headers',()=>{
  const x=boot({props:{NGD_ENVIRONMENT:'PRODUCTION'}});
  assert.throws(()=>x.context.ngdOtpStagingPreflight(),/OTP_PREFLIGHT_NOT_STAGING/);
  assert.equal(x.calls.read,0);
});
test('missing OTP tab cannot pass preflight or be automatically created',()=>{
  const x=boot({missing:'otp_verifications'});
  assert.throws(()=>x.context.ngdOtpStagingPreflight(),/OTP_PREFLIGHT_TAB_MISSING/);
  assert.equal(x.calls.write,0);
});
test('incomplete OTP columns cannot pass preflight',()=>{
  const x=boot({changeHeader:'wa_notifications',newHeaders:['notif_id','tujuan_wa']});
  assert.throws(()=>x.context.ngdOtpStagingPreflight(),/OTP_PREFLIGHT_COLUMNS_MISSING/);
});

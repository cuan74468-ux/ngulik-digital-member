'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const source=fs.readFileSync(path.join(root,'apps-script/InfrastructurePreflight.gs'),'utf8');
const DB='staging-test-only';
function boot(options={}){
  const calls={open:0,read:0,write:0,network:0},logs=[];
  const props=Object.assign({
    NGD_ENVIRONMENT:'STAGING',NGD_DB_ID:DB,NGD_ADMIN_LOGIN_DB_ID:DB,
    NGD_OTP_STAGING_DB_ID:DB,NGD_ADMIN_LOGIN_ENABLED:'true'
  },options.props||{});
  let context;
  const sandbox={
    console:{log(x){logs.push(String(x));},error(){},warn(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||null;}}}},
    SpreadsheetApp:{openById(id){
      calls.open++;assert.equal(id,DB);
      return {getId(){return options.wrongDb?'WRONG':DB;},
        getSheetByName(name){
          if(name===options.missing)return null;
          let h;
          if(name==='otp_verifications')
            h='otp_id,wa,kode_hash,tujuan,status,attempts,created_at,expires_at,verified_at,ip_or_device'.split(',');
          else if(name==='wa_notifications')
            h='notif_id,tujuan_wa,tipe_penerima,template_kode,ref_id,pesan,status,retry_count,created_at,sent_at,gateway_response'.split(',');
          else {
            const contract=vm.runInContext('NGD.HEADERS',context)[name];
            if(!contract)return null;
            h=contract.split(',');
            if(name==='members')for(const col of ['wa_verified','wa_verified_at'])if(!h.includes(col))h.push(col);
          }
          if(name===options.changeHeader)h=options.newHeader;
          if(name===options.extraColumn)h.push('safe_future_column');
          return {getLastColumn(){return h.length;},
            getRange(r,c,rows,width){
              assert.deepEqual([r,c,rows,width],[1,1,1,h.length]);
              return {getValues(){calls.read++;return [h];}};
            },
            appendRow(){calls.write++;throw Error('WRITE_FORBIDDEN');},
            setValues(){calls.write++;throw Error('WRITE_FORBIDDEN');}
          };
        }};
    }},
    UrlFetchApp:new Proxy({}, {get(){calls.network++;throw Error('NETWORK_FORBIDDEN');}})
  };
  context=vm.createContext(sandbox);
  vm.runInContext(core+'\n'+source,context,{timeout:5000});
  return {context,calls,logs};
}
test('29 STAGING tables pass with no provider accounts, writes or network',()=>{
  const x=boot(),result=x.context.ngdInfrastructurePreflightReadOnly();
  assert.equal(result.tables_checked,29);
  assert.equal(result.schema_ready,true);
  assert.equal(result.external_providers,'FLAG_OFF');
  assert.equal(x.calls.read,29);
  assert.equal(x.calls.write,0);assert.equal(x.calls.network,0);
  assert.match(x.logs.join('\n'),/NGD_INFRASTRUCTURE_PREFLIGHT_OK/);
  assert.equal(x.logs.join('').includes(DB),false);
});
test('PRODUCTION rejected before opening any spreadsheet',()=>{
  const x=boot({props:{NGD_ENVIRONMENT:'PRODUCTION'}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_NOT_STAGING/);
  assert.equal(x.calls.open,0);
});
test('OTP database attestation may be unset during provider-last preparation',()=>{
  const x=boot({props:{NGD_OTP_STAGING_DB_ID:''}});
  assert.equal(x.context.ngdInfrastructurePreflightReadOnly().tables_checked,29);
  assert.equal(x.calls.read,29);
  assert.equal(x.calls.write,0);
  assert.equal(x.calls.network,0);
});
test('configured but mismatched OTP DB still fails before opening any spreadsheet',()=>{
  const x=boot({props:{NGD_OTP_STAGING_DB_ID:'OTHER'}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_OTP_DB_MISMATCH/);
  assert.equal(x.calls.open,0);
});
test('admin login DB mismatch fails before opening any spreadsheet',()=>{
  const x=boot({props:{NGD_ADMIN_LOGIN_DB_ID:'OTHER'}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_ADMIN_DB_MISMATCH/);
  assert.equal(x.calls.open,0);
});
test('missing DB ID fails before opening any spreadsheet',()=>{
  const x=boot({props:{NGD_DB_ID:''}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_DB_ID_MISSING/);
  assert.equal(x.calls.open,0);
});
test('owner-activated STAGING release flags do not cause preflight mutations or network',()=>{
  const x=boot({props:{
    NGD_MUTATIONS_ENABLED:'true',NGD_REGISTRATION_ENABLED:'true',
    NGD_OTP_REGISTRATION_ENABLED:'true',NGD_FINANCE_ENABLED:'true',
    NGD_CATALOG_ENABLED:'true',NGD_CONTENT_ENABLED:'true',
    NGD_SERVICE_ENABLED:'true',NGD_SUPPORT_ENABLED:'true',
    NGD_NOTIFICATIONS_ENABLED:'true',NGD_LMS_ENABLED:'true',
    NGD_EXTERNAL_PROVIDERS_ENABLED:'true'
  }});
  const report=x.context.ngdInfrastructurePreflightReadOnly();
  assert.equal(report.tables_checked,29);
  assert.equal(report.feature_writes_enabled,true);
  assert.equal(report.registration_enabled,true);
  assert.equal(report.otp_enabled,true);
  assert.equal(report.finance_enabled,true);
  assert.equal(report.external_providers,'FLAG_ON');
  assert.equal(report.mutation_performed,false);
  assert.equal(x.calls.read,29);
  assert.equal(x.calls.write,0);
  assert.equal(x.calls.network,0);
  assert.match(x.logs.join('\n'),/preflight_writes=false/);
  assert.equal(x.logs.join('').includes(DB),false);
});
test('recovery and legacy schema upgrade remain disarmed for routine checks',()=>{
  for(const name of ['NGD_SCHEMA_UPGRADE_ENABLED','NGD_ADMIN_RECOVERY_ENABLED']){
    const x=boot({props:{[name]:'true'}});
    assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),
      new RegExp('INFRA_DANGEROUS_FLAG_ENABLED: '+name));
    assert.equal(x.calls.open,0);
  }
});
test('enabled OTP requires STAGING database attestation before Sheets read',()=>{
  const x=boot({props:{NGD_OTP_REGISTRATION_ENABLED:'true',NGD_OTP_STAGING_DB_ID:''}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),
    /INFRA_OTP_DB_ATTESTATION_REQUIRED/);
  assert.equal(x.calls.open,0);
});
test('mis-typed release flag is not silently treated as safe',()=>{
  const x=boot({props:{NGD_FINANCE_ENABLED:'TRUE'}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_FLAG_INVALID/);
});
test('missing OTP notification table fails without modifying anything',()=>{
  const x=boot({missing:'wa_notifications'});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_TAB_MISSING/);
  assert.equal(x.calls.write,0);
});
test('missing WA verification evidence fails closed',()=>{
  const x=boot({changeHeader:'members',
    newHeader:'member_id,role,nama,wa,nama_usaha,pin_hash,pin_salt,kode_referral,referred_by,status,joined_at,jenis_usaha,kota,deskripsi_usaha,instagram,onboarding_at,trial_mulai,trial_berakhir,akses_3in1_sampai,sumber_akses_3in1,url_halaman_bisnis,status_pos,pos_lisensi_kode,status_canva,canva_email,canva_mulai,canva_berakhir,last_active_at,d14_active,d30_active,saldo_kredit,retensi_14,retensi_30'.split(',')});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_COLUMNS_MISSING: members/);
});
test('duplicate OTP header is rejected',()=>{
  const x=boot({changeHeader:'otp_verifications',newHeader:['otp_id','wa','wa','status']});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_HEADER_INVALID/);
});
test('extra legitimate columns are preserved without migration',()=>{
  const x=boot({extraColumn:'members'});
  assert.equal(x.context.ngdInfrastructurePreflightReadOnly().schema_ready,true);
  assert.equal(x.calls.write,0);
});
test('infrastructure preflight is not a public API and cannot call external providers',()=>{
  const x=boot();
  assert.equal(x.context.apiReadActions_().includes('ngdInfrastructurePreflightReadOnly'),false);
  assert.doesNotMatch(core,/case 'ngdInfrastructurePreflightReadOnly'/);
  assert.doesNotMatch(source,/UrlFetchApp|setValues|appendRow|insertSheet/);
});

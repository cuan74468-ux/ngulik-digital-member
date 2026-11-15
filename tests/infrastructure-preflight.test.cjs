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
            if(name==='members')h.push('wa_verified','wa_verified_at');
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
  assert.equal(result.external_providers,'DEFERRED');
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
test('missing or mismatched OTP database attestation is rejected',()=>{
  for(const value of ['', 'OTHER']){
    const x=boot({props:{NGD_OTP_STAGING_DB_ID:value}});
    assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_DB_ATTESTATION_REQUIRED/);
    assert.equal(x.calls.open,0);
  }
});
test('feature mutations, recovery and schema upgrades are forbidden',()=>{
  for(const name of ['NGD_MUTATIONS_ENABLED','NGD_REGISTRATION_ENABLED',
    'NGD_OTP_REGISTRATION_ENABLED','NGD_FINANCE_ENABLED','NGD_LMS_ENABLED',
    'NGD_SCHEMA_UPGRADE_ENABLED','NGD_ADMIN_RECOVERY_ENABLED','NGD_EXTERNAL_PROVIDERS_ENABLED']){
    const x=boot({props:{[name]:'true'}});
    assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),
      new RegExp('INFRA_FLAG_NOT_DISABLED: '+name));
    assert.equal(x.calls.open,0);
  }
});
test('mis-typed release flag is not silently treated as safe',()=>{
  const x=boot({props:{NGD_FINANCE_ENABLED:'TRUE'}});
  assert.throws(()=>x.context.ngdInfrastructurePreflightReadOnly(),/INFRA_FLAG_NOT_DISABLED/);
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

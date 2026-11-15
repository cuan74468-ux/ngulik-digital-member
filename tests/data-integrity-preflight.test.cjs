'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../apps-script/DataIntegrityPreflight.gs'),'utf8');
function fixture(tables={},opts={}){
  const data={
    members:[],sessions:[],credits_ledger:[],orders:[],
    lms_courses:[],lms_lessons:[],lms_enrollments:[],otp_verifications:[],
    ...tables
  };
  let calls={reads:0,writes:0,opens:0,infra:0},logs=[];
  const props={NGD_ENVIRONMENT:'STAGING',NGD_DB_ID:'STAGE_ONLY',...opts.props};
  const ctx={
    console:{log(x){logs.push(x);},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||null;}}}},
    SpreadsheetApp:{openById(id){
      assert.equal(id,'STAGE_ONLY');calls.opens++;
      return {
        getId(){return opts.actualId||'STAGE_ONLY';},
        getSheetByName(name){
          if(opts.missing===name)return null;
          const rows=data[name];
          if(!rows)throw new Error('UNKNOWN_TABLE');
          const cols=Object.keys(ctx.NGD_INTEGRITY_TABLES_[name]);
          const headers=opts.headers?.[name]||ctx.NGD_INTEGRITY_TABLES_[name];
          return {
            getLastRow(){return rows.length+1;},
            getLastColumn(){return headers.length;},
            getRange(r,col,count,width){
              assert.ok(width===1||r===1);
              return {getValues(){
                calls.reads++;
                if(r===1)return [headers];
                const field=headers[col-1];
                return rows.slice(0,count).map(row=>[row[field]]);
              }};
            },
            appendRow(){calls.writes++;throw Error('WRITE_FORBIDDEN');},
            setValues(){calls.writes++;throw Error('WRITE_FORBIDDEN');}
          };
        }
      };
    }},
    UrlFetchApp:new Proxy({}, {get(){throw Error('NETWORK_FORBIDDEN');}})
  };
  vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:3000});
  ctx.ngdInfrastructurePreflightReadOnly=()=>{calls.infra++;if(opts.infraBad)return {schema_ready:false,tables_checked:28};return {schema_ready:true,tables_checked:29};};
  return {ctx,calls,logs};
}
const member=(id,wa='6281200000000')=>({member_id:id,wa,role:'MEMBER',wa_verified:true});
const session=(id,hash)=>({member_id:id,token_hash:hash,expires_at:'2026-11-16T00:00:00Z'});
test('empty STAGING and proper members/relations pass without any writes',()=>{
  const x=fixture({members:[member('M-001')],sessions:[session('M-001','abc')],
    credits_ledger:[{entry_id:'C1',member_id:'M-001',tipe:'GRANT',status:'POSTED'}],
    orders:[{order_id:'O1',member_id:'M-001'}],
    lms_courses:[{course_id:'L1'}],lms_lessons:[{lesson_id:'S1',course_id:'L1'}],
    lms_enrollments:[{enrollment_id:'E1',member_id:'M-001',course_id:'L1'}]});
  const r=x.ctx.ngdDataIntegrityPreflightReadOnly();
  assert.equal(r.ready,true);assert.equal(r.mutations_performed,false);
  assert.equal(x.calls.writes,0);assert.equal(x.calls.infra,1);
  assert.match(x.logs[0],/NGD_DATA_INTEGRITY_OK/);
  assert.doesNotMatch(x.logs[0],/M-001|62812/);
});
test('duplicate member WA normalizes 08 and 62 and detects unverified member',()=>{
  const x=fixture({members:[member('M-1','081200000000'),
    {member_id:'M-2',wa:'628120000000',role:'MEMBER',wa_verified:false}]});
  const r=x.ctx.ngdDataIntegrityPreflightReadOnly();
  assert.equal(r.ready,false);
  assert.equal(r.issue_counts.duplicate_whatsapp,1);
  assert.equal(r.issue_counts.unverified_member,1);
  assert.doesNotMatch(x.logs[0],/081200000000|M-1/);
});
test('duplicate starter grants, orphan sessions and orders are reported only in counts',()=>{
  const x=fixture({members:[member('M-1')],
    sessions:[session('M-deleted','hash')],
    orders:[{order_id:'O1',member_id:'M-deleted'}],
    credits_ledger:[
      {entry_id:'C1',member_id:'M-1',status:'POSTED',tipe:'GRANT'},
      {entry_id:'C2',member_id:'M-1',status:'POSTED',tipe:'GRANT'}
    ]});
  const r=x.ctx.ngdDataIntegrityPreflightReadOnly();
  assert.equal(r.issue_counts.orphan_session,1);
  assert.equal(r.issue_counts.orphan_order,1);
  assert.equal(r.issue_counts.duplicate_starter_grant,1);
  assert.equal(x.calls.writes,0);
});
test('orphan LMS lesson and enrollment trigger BLOCKED',()=>{
  const x=fixture({members:[member('M-1')],lms_lessons:[{lesson_id:'S1',course_id:'missing'}],
    lms_enrollments:[{enrollment_id:'E1',member_id:'M-1',course_id:'missing'}]});
  const r=x.ctx.ngdDataIntegrityPreflightReadOnly();
  assert.equal(r.ready,false);
  assert.equal(r.issue_counts.orphan_lms_lesson,1);
  assert.equal(r.issue_counts.orphan_lms_enrollment,1);
});
test('production is rejected before opening database',()=>{
  const x=fixture({}, {props:{NGD_ENVIRONMENT:'PRODUCTION'}});
  assert.throws(()=>x.ctx.ngdDataIntegrityPreflightReadOnly(),/INTEGRITY_NOT_STAGING/);
  assert.equal(x.calls.opens,0);assert.equal(x.calls.infra,0);
});
test('infrastructure preflight is mandatory and cannot be skipped',()=>{
  const x=fixture({}, {infraBad:true});
  assert.throws(()=>x.ctx.ngdDataIntegrityPreflightReadOnly(),/INTEGRITY_INFRASTRUCTURE_NOT_READY/);
  assert.equal(x.calls.opens,0);
});
test('database identity mismatch fails closed',()=>{
  const x=fixture({}, {actualId:'UNEXPECTED'});
  assert.throws(()=>x.ctx.ngdDataIntegrityPreflightReadOnly(),/INTEGRITY_DB_IDENTITY_MISMATCH/);
});
test('a missing table is never created or silently skipped',()=>{
  const x=fixture({}, {missing:'credits_ledger'});
  assert.throws(()=>x.ctx.ngdDataIntegrityPreflightReadOnly(),/INTEGRITY_TAB_MISSING/);
  assert.equal(x.calls.writes,0);
});
test('an invalid header fails without fixing or moving it',()=>{
  const x=fixture({members:[member('M-1')]},{headers:{members:['member_id','member_id','role','wa_verified']}});
  assert.throws(()=>x.ctx.ngdDataIntegrityPreflightReadOnly(),/INTEGRITY_HEADER_INVALID/);
  assert.equal(x.calls.writes,0);
});
test('read-only data audit is never bound as an HTTP API route',()=>{
  const core=fs.readFileSync(path.resolve(__dirname,'../apps-script/Code.gs'),'utf8');
  assert.doesNotMatch(core,/case 'ngdDataIntegrityPreflightReadOnly'/);
  assert.doesNotMatch(source,/UrlFetchApp\.fetch|\.appendRow\(|\.setValues\(|\.deleteRow\(/);
});

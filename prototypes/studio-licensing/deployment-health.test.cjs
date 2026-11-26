'use strict';
const test=require('node:test'),a=require('node:assert/strict'),{verifyStudioDisabled}=require('../../scripts/gas-staging-run.cjs');
const legacy=new Map([['Kode.js','function old(){}']]),studio=new Map([['Kode.js','function ngdStudioGuard_(){}']]);
test('old immutable runtime retains health contract; new runtime requires explicit OFF before any probe',async()=>{
 let calls=0;const request=async()=>{calls++;return {ok:false,error:{code:'MAINTENANCE'}};};
 await verifyStudioDisabled(legacy,{},request);a.equal(calls,0);
 for(const identity of [{},{studio_pilot_enabled:true},{studio_pilot_enabled:'false'}])await a.rejects(verifyStudioDisabled(studio,identity,request),/MUST_REMAIN_OFF/);
 a.equal(calls,0);
 await verifyStudioDisabled(studio,{studio_pilot_enabled:false},async opt=>{
  calls++;a.equal(opt.method,'POST');a.equal(opt.headers['Content-Type'],'text/plain;charset=utf-8');
  const q=JSON.parse(opt.body);a.equal(q.action,'studioValidateSession');a.deepEqual(q.payload,{});a.match(q.token,/^[a-f0-9]{64}$/);a.match(q.request_id,/^[a-zA-Z0-9_-]{16,80}$/);
  return {ok:false,error:{code:'MAINTENANCE'}};
 });a.equal(calls,1);
 for(const response of [{ok:true,data:{active:true}},{ok:false,error:{code:'UNAUTHORIZED'}},{ok:false,error:{code:'INTERNAL'}},null])await a.rejects(verifyStudioDisabled(studio,{studio_pilot_enabled:false},async()=>response),/DEFAULT_OFF_UNVERIFIED/);
});

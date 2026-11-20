'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const apiSource=fs.readFileSync(path.join(__dirname,'../js/api.js'),'utf8')
  .replace(/^export /gm,'');
const appSource=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const supportStart=appSource.indexOf('const pendingSupportRequests = new Map();');
const supportEnd=appSource.indexOf('\nasync function submitTicketCreate(',supportStart);
assert.ok(supportStart>=0&&supportEnd>supportStart);
const submitSource=appSource.slice(supportStart,supportEnd);
function apiHarness(){
  const sent=[];
  const ctx=vm.createContext({
    window:{NGD_CONFIG:{apiUrl:'https://script.google.com/macros/s/QA/exec',memberWritesEnabled:true}},
    crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},
    AbortController,setTimeout,clearTimeout,
    fetch:async(_url,opts)=>{
      sent.push(JSON.parse(opts.body));
      return {ok:true,json:async()=>({ok:true,data:{ticket_id:'SUP-1'}})};
    }
  });
  vm.runInContext(apiSource,ctx);
  return {ctx,sent,call:(action,payload,opts)=>vm.runInContext(
    'api('+JSON.stringify(action)+','+JSON.stringify(payload)+',"token",'+JSON.stringify(opts)+')',ctx)};
}
function uiHarness(){
  let count=0;
  const sent=[],toasts=[],button={disabled:false};
  let response=async()=>({ticket_id:'SUP-1'});
  const ctx=vm.createContext({
    Map,JSON,createRequestId:()=> 'RETRY_ID_'+String(++count).padStart(20,'0'),
    supportWriteEnabled:()=>true,
    api:async(action,payload,token,opts)=>{
      sent.push({action,payload,token,...opts});
      return response();
    },
    toast:(message,error)=>toasts.push({message,error}),
    state:{token:'QA_TOKEN'},
    form:{querySelector:()=>button},payload:{kategori:'BUG',product_id:'P-POS',
      judul:'Struk gagal',deskripsi:'Struk tidak keluar saat offline di Android'}
  });
  vm.runInContext(submitSource,ctx);
  return {ctx,sent,toasts,button,setResponse:f=>response=f,
    run:()=>vm.runInContext("submitSupportAction(form,'createTicket',payload)",ctx)};
}
test('API honors a supplied stable idempotency key',async()=>{
  const h=apiHarness();
  await h.call('createTicket',{judul:'Tes'},{write:true,requestId:'RETRY_ID_12345678901234567890'});
  assert.equal(h.sent.length,1);
  assert.equal(h.sent[0].request_id,'RETRY_ID_12345678901234567890');
});
test('API rejects invalid supplied request_id before network access',async()=>{
  const h=apiHarness();
  await assert.rejects(h.call('createTicket',{}, {write:true,requestId:'short'}),
    /ID permintaan tidak valid/);
  assert.equal(h.sent.length,0);
});
test('unknown network outcome reuses same request ID on identical retry',async()=>{
  const h=uiHarness();
  h.setResponse(async()=>{const err=new Error('Timeout');err.code='NETWORK_ERROR';throw err;});
  await h.run();
  assert.equal(h.button.disabled,false);
  assert.equal(h.sent.length,1);
  h.setResponse(async()=>({ticket_id:'SUP-1'}));
  await h.run();
  assert.equal(h.sent.length,2);
  assert.equal(h.sent[0].requestId,h.sent[1].requestId);
  await h.run();
  assert.notEqual(h.sent[1].requestId,h.sent[2].requestId);
});
test('explicit validation error does not preserve retry key',async()=>{
  const h=uiHarness();
  h.setResponse(async()=>{const err=new Error('Invalid');err.code='VALIDATION';throw err;});
  await h.run();
  h.setResponse(async()=>({ticket_id:'SUP-1'}));
  await h.run();
  assert.notEqual(h.sent[0].requestId,h.sent[1].requestId);
});
test('changing report content produces new request ID even after uncertain write',async()=>{
  const h=uiHarness();
  h.setResponse(async()=>{const err=new Error('Timeout');err.code='NETWORK_ERROR';throw err;});
  await h.run();
  h.ctx.payload={...h.ctx.payload,judul:'Kendala cetak berbeda'};
  await h.run();
  assert.notEqual(h.sent[0].requestId,h.sent[1].requestId);
});
test('confirmed server write is not reported failed if UI refresh fails',async()=>{
  const h=uiHarness();
  await vm.runInContext("submitSupportAction(form,'createTicket',payload,async()=>{throw Error('Refresh failed')})",h.ctx);
  assert.equal(h.sent.length,1);
  assert.ok(h.toasts.some(t=>t.message.includes('berhasil dikirim')));
  assert.ok(h.toasts.some(t=>t.message.includes('Muat ulang untuk melihatnya')));
  await h.run();
  assert.notEqual(h.sent[0].requestId,h.sent[1].requestId);
});
test('preview gate prevents support mutation request entirely',async()=>{
  const h=uiHarness();
  h.ctx.supportWriteEnabled=()=>false;
  await h.run();
  assert.equal(h.sent.length,0);
});

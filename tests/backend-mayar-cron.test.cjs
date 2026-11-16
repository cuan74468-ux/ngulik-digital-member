'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const token='T'.repeat(48);
function setup(){
  const order={_row:2,order_id:'ORDER-1',member_id:'M-2',product_id:'P-TOKEN-10',
    gateway_ref_id:'pay_123456789012',status:'PENDING',total_bayar:10100,
    created_at:new Date(Date.now()-20*60000).toISOString(),abandonment_reminded_at:''};
  const member={_row:3,member_id:'M-2',nama:'Member',wa:'628123456789'};
  const product={product_id:'P-TOKEN-10',tipe:'TOPUP_TOKEN',kredit_diberikan:10};
  const mutations=[],queue=[],audit=[];
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}},Date,Number,JSON});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>({
    MAYAR_WEBHOOK_SECRET:token,MAYAR_API_KEY:'test-key-not-real',
    NGD_MUTATIONS_ENABLED:'true',NGD_FINANCE_ENABLED:'true'
  })[key]||''})};
  ctx.UrlFetchApp={fetch:(url,opts)=>{
    assert.equal(url,'https://api.mayar.id/hl/v2/payment/pay_123456789012');
    assert.match(opts.headers.Authorization,/^Bearer /);
    return {getResponseCode:()=>200,
      getContentText:()=>JSON.stringify({data:{id:'pay_123456789012',status:'paid',amount:10100}})};
  }};
  ctx.withLock_=fn=>fn();
  ctx.findRows_=(table,predicate)=>table==='orders'?[order].filter(predicate):
    table==='wa_notifications'?queue.filter(predicate):[];
  ctx.byId_=(table,field,id)=>table==='orders'?order:
    table==='members'?member:table==='katalog_produk'?product:null;
  ctx.updateRow_=(table,row,patch)=>{
    mutations.push({table,patch});
    if(table==='orders')Object.assign(order,patch);
  };
  ctx.appendRow_=(table,data)=>{if(table==='wa_notifications')queue.push(data);};
  ctx.logAudit_=(...a)=>audit.push(a);
  ctx.onPaid_=()=>{};
  ctx.settings_=()=>({order_expiry_menit:60});
  ctx.now_=()=>new Date();
  ctx.recordId_=()=>('REC-'+(queue.length+1));
  ctx.normalizeWa_=x=>x;
  const webhook=(secret=token)=>vm.runInContext(
    'mayarWebhook_('+JSON.stringify({parameter:{source:'mayar',webhook_token:secret},
    postData:{contents:JSON.stringify({event:'payment.received',data:{id:'pay_123456789012'}})}})+')',ctx);
  return {ctx,order,mutations,queue,audit,webhook};
}
test('Mayar: reject wrong secret before API or payment writes',()=>{
  const x=setup();
  assert.throws(()=>x.webhook('invalid'),/Webhook tidak diizinkan/);
  assert.equal(x.mutations.length,0);
});
test('Mayar: server verified linked payment transitions once',()=>{
  const x=setup();
  const first=x.webhook();
  assert.equal(first.accepted,true);
  assert.equal(first.duplicate,false);
  assert.equal(x.order.status,'PAID');
  const second=x.webhook();
  assert.equal(second.duplicate,true);
  assert.equal(x.mutations.length,1);
});
test('Mayar: reject paid amount mismatch',()=>{
  const x=setup();x.order.total_bayar=9000;
  assert.throws(()=>x.webhook(),/Jumlah pembayaran berbeda/);
  assert.equal(x.order.status,'PENDING');
});
test('cron: queues one reminder and marks the order',()=>{
  const x=setup();
  const a=vm.runInContext('runScheduledAutomations()',x.ctx);
  assert.equal(a.reminders_queued,1);
  assert.equal(x.queue.length,1);
  assert.equal(x.queue[0].status,'QUEUED');
  const b=vm.runInContext('runScheduledAutomations()',x.ctx);
  assert.equal(b.reminders_queued,0);
});
test('cron: expires old pending order without reminder',()=>{
  const x=setup();x.order.created_at=new Date(Date.now()-61*60000).toISOString();
  const a=vm.runInContext('runScheduledAutomations()',x.ctx);
  assert.equal(a.expired,1);
  assert.equal(x.order.status,'EXPIRED');
  assert.equal(x.queue.length,0);
});
test('both token types remain supported in checkout and fulfillment',()=>{
  assert.match(source,/NGD_CHECKOUT_TYPES_=\['TOPUP_TOKEN','TOPUP_KREDIT'/);
  assert.match(source,/\['TOPUP_TOKEN','TOPUP_KREDIT'\]\.indexOf\(product\.tipe\)/);
});

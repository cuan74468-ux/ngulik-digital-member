'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function harness(options={}){
  const token='S'.repeat(48),id='txn_123456789012';
  const m={_row:2,member_id:'M-BUYER',role:'MEMBER',nama:'Contoh',
    referred_by:options.selfReferral?'M-BUYER':'M-AFF',wa:'6281111111111',status:'AKTIF'};
  const p={_row:2,product_id:'P-VIDEO-AI',tipe:'JASA_SEKALI',nama:'Video AI',
    aktif:true,harga:50000,komisi_persen:20,bisa_komisi:true,durasi_hari:0};
  const order={_row:2,order_id:'NGD-TEST-MAYAR-001',member_id:m.member_id,
    product_id:p.product_id,harga_dasar:50000,total_bayar:50000,
    status:'PENDING',metode:'MAYAR',gateway_ref_id:id,
    catatan_admin:'',ref_member_id:m.referred_by};
  const inviter={_row:3,member_id:'M-AFF',role:'MEMBER',status:'AKTIF',referred_by:''};
  const sponsorStarter={_row:3,order_id:'SPONSOR-STARTER',member_id:'M-AFF',
    product_id:'P-STARTER-15',status:'FULFILLED'};
  const rows={orders:[order,sponsorStarter],members:[m,inviter],katalog_produk:[p],
    affiliate_commissions:[],audit_logs:[],credits_ledger:[]};
  const writes=[],audits=[],calls=[];
  const ctx=vm.createContext({Date,Number,JSON,Math,console:{error:()=>{},log:()=>{}}});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.settings_=()=>({payment_gateway_mode:'MAYAR',masa_tahan_hari:14,komisi_hanya_order_pertama:false});
  ctx.ngdStagingWorkspaceInfo_=()=>({environment:'STAGING',mayar_checkout_ready:true});
  ctx.requireMutationsEnabled_=()=>{};
  ctx.requireFinanceEnabled_=()=>{};
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>key==='MAYAR_WEBHOOK_SECRET'?
    token:key==='MAYAR_API_KEY'?'mayar_test_key_01234567890123456789':''})};
  ctx.withLock_=fn=>fn();
  ctx.now_=()=>new Date('2026-11-20T05:00:00Z');
  ctx.recordId_=()=> 'COMMISSION-SYNTH-01';
  ctx.byId_=(name,key,value)=>(rows[name]||[]).find(x=>String(x[key])===String(value))||null;
  ctx.findRows_=(name,fn)=>(rows[name]||[]).filter(fn);
  ctx.readAll_=name=>rows[name]||[];
  ctx.updateRow_=(name,n,patch)=>{
    assert.ok(rows[name]&&rows[name][n-2]); Object.assign(rows[name][n-2],patch);
    writes.push({name,patch});
  };
  ctx.appendRow_=(name,row)=>{
    assert.ok(rows[name]); rows[name].push({...row,_row:rows[name].length+2});
    writes.push({name,row});
  };
  ctx.logAudit_=(actor,role,action,entity,entityId,from,to,detail)=>{
    audits.push({action,entity,entityId});
    rows.audit_logs.push({action,entity_id:entityId,_row:rows.audit_logs.length+2});
  };
  ctx.notifyPaidOrder_=()=>{};
  ctx.UrlFetchApp={fetch:(url,opts)=>{
    calls.push({url,opts});
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
      data:{id:id,status:options.status||'paid',amount:options.amount||50000}
    })};
  }};
  const webhook=()=>ctx.mayarWebhook_({
    parameter:{source:'mayar',webhook_token:token},
    parameters:{source:['mayar'],webhook_token:[token]},
    postData:{contents:JSON.stringify({event:'payment.received',data:{id:id}})}
  });
  return {ctx,webhook,rows,writes,audits,calls,order,m};
}
test('Mayar paid payment: verified provider status creates exactly one NGD commission',()=>{
  const h=harness(),r=h.webhook();
  assert.equal(r.accepted,true);
  assert.equal(h.order.status,'PAID');
  assert.equal(h.rows.affiliate_commissions.length,1);
  assert.equal(h.rows.affiliate_commissions[0].nominal,10000);
  assert.equal(h.rows.affiliate_commissions[0].status,'PENDING');
  assert.equal(h.rows.affiliate_commissions[0].referrer_id,'M-AFF');
  assert.equal(h.calls[0].url,'https://api.mayar.id/hl/v2/transactions/txn_123456789012');
  assert.equal(h.rows.credits_ledger.length,0);
  assert.ok(h.audits.some(x=>x.action==='MAYAR_PAYMENT_VERIFIED'));
});
test('Mayar duplicate webhook cannot award affiliate commission twice',()=>{
  const h=harness(),a=h.webhook(),b=h.webhook();
  assert.equal(a.duplicate,false);
  assert.equal(b.duplicate,true);
  assert.equal(h.rows.affiliate_commissions.length,1);
  assert.equal(h.audits.filter(x=>x.action==='COMMISSION_CREATED').length,1);
});
test('Mayar self-referral is rejected in onPaid_ even with provider paid',()=>{
  const h=harness({selfReferral:true}),r=h.webhook();
  assert.equal(r.accepted,true);
  assert.equal(h.rows.affiliate_commissions.length,0);
  assert.equal(h.audits.filter(x=>x.action==='COMMISSION_SELF_REFERRAL_BLOCKED').length,1);
});
test('Mayar unpaid event or wrong amount cannot mutate NGD order/commission',()=>{
  for(const o of [{status:'pending'},{amount:49999}]){
    const h=harness(o);assert.throws(()=>h.webhook());
    assert.equal(h.order.status,'PENDING');
    assert.equal(h.rows.affiliate_commissions.length,0);
  }
});
test('Mayar wrong order mapping and expired order are held for reconciliation',()=>{
  const a=harness();a.order.gateway_ref_id='other_txn';
  assert.throws(()=>a.webhook(),/belum terhubung/);
  const b=harness();b.order.status='EXPIRED';
  assert.throws(()=>b.webhook(),/Status order perlu peninjauan/);
  assert.equal(b.rows.affiliate_commissions.length,0);
});

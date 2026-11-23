'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const diagnostics=fs.readFileSync(path.join(root,'apps-script/Diagnostics.gs'),'utf8');
function runtime(){
  const context=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(code,context,{filename:'Code.gs'});
  vm.runInContext(diagnostics,context,{filename:'Diagnostics.gs'});
  return context;
}
test('expiry classifier separates invalid, open and expired invoices without writing',()=>{
  const ctx=runtime(),at=Date.parse('2026-11-23T12:00:00+07:00');
  assert.equal(ctx.ngdOrderExpiryState_({expires_at:''},at),'INVALID');
  assert.equal(ctx.ngdOrderExpiryState_({expires_at:'not-a-date'},at),'INVALID');
  assert.equal(ctx.ngdOrderExpiryState_({expires_at:'2026-11-23T13:00:00+07:00'},at),'OPEN');
  assert.equal(ctx.ngdOrderExpiryState_({expires_at:'2026-11-23T11:00:00+07:00'},at),'EXPIRED');
  assert.equal(ctx.ngdOrderExpiryState_({expires_at:'2026-11-23T12:00:00+07:00'},at),'EXPIRED');
});
test('expireOrder does not modify an invalid historic pending invoice',()=>{
  const ctx=runtime(),writes=[];
  ctx.updateRow_=(...args)=>writes.push(args);
  ctx.logAudit_=()=>{throw Error('audit must not be reached');};
  const bad={status:'PENDING',expires_at:'',order_id:'HISTORIC-READ-ONLY',_row:2};
  assert.equal(ctx.expireOrder_(bad).status,'PENDING');
  assert.equal(writes.length,0);
});
function financeAuditFor(order){
  const ctx=runtime(),fixtures={
    orders:[order],credits_ledger:[],affiliate_commissions:[],
    katalog_produk:[{product_id:'P-TEST'}],members:[{member_id:'M-TEST'}]
  };
  ctx.diagnosticDb_=()=>({});
  ctx.readAll_=name=>fixtures[name]||[];
  return ctx.diagnosticFinanceReadOnly();
}
function invoice(mods={}){
  return {order_id:'TEST-ONE',member_id:'M-TEST',product_id:'P-TEST',request_id:'REQUEST-ONE',
    harga_dasar:15000,kode_unik:123,total_bayar:15123,status:'PENDING',
    created_at:'2026-11-23T08:00:00+07:00',...mods};
}
test('current invoice uses addition as the only accepted payment formula',()=>{
  assert.equal(financeAuditFor(invoice()),'FINANCE_AUDIT_OK');
  assert.equal(financeAuditFor(invoice({total_bayar:14877})),'FINANCE_AUDIT_FAILED');
});
test('historical subtraction is reported for review, never silently passed',()=>{
  assert.equal(financeAuditFor(invoice({
    created_at:'2026-11-20T10:00:00+07:00',status:'FULFILLED',total_bayar:14877
  })),'FINANCE_AUDIT_WARN');
  assert.equal(financeAuditFor(invoice({
    created_at:'2026-11-20T10:00:00+07:00',status:'PENDING',total_bayar:14877
  })),'FINANCE_AUDIT_FAILED');
});
test('invalid payment data or missing date cannot become a legacy exception',()=>{
  assert.equal(financeAuditFor(invoice({created_at:'',status:'FULFILLED',total_bayar:14877})),'FINANCE_AUDIT_FAILED');
  assert.equal(financeAuditFor(invoice({kode_unik:99,total_bayar:15099})),'FINANCE_AUDIT_FAILED');
});
test('finance diagnostics identify exact anomalous order but do not change its classification or data',()=>{
  const events=[],ctx=runtime(),bad=invoice({
    order_id:'SYNTHETIC-EXPIRED',created_at:'2026-11-22T10:00:00+07:00',
    status:'EXPIRED',kode_unik:100,total_bayar:14900
  });
  const fixtures={
    orders:[bad],credits_ledger:[],affiliate_commissions:[],
    katalog_produk:[{product_id:'P-TEST'}],members:[{member_id:'M-TEST'}]
  };
  ctx.console={log(){},warn(...args){events.push(args.join(' '));},error(){}};
  ctx.diagnosticDb_=()=>({});
  ctx.readAll_=name=>fixtures[name]||[];
  ctx.appendRow_=()=>{throw Error('read-only diagnostics must never append');};
  ctx.updateRow_=()=>{throw Error('read-only diagnostics must never update');};
  assert.equal(ctx.diagnosticFinanceReadOnly(),'FINANCE_AUDIT_FAILED');
  const evidence=events.find(line=>line.startsWith('FINANCE_ORDER_AMOUNT_REVIEW '));
  assert.ok(evidence);
  assert.deepEqual(JSON.parse(evidence.slice('FINANCE_ORDER_AMOUNT_REVIEW '.length)),{
    order_id:'SYNTHETIC-EXPIRED',status:'EXPIRED',reason:'ORDER_TOTAL_INVALID',
    formula:'SUBTRACT',actual_total:14900,expected_total:15100
  });
  assert.equal(bad.total_bayar,14900);
});
test('legacy before cutoff stays WARN and creates no write',()=>{
  const events=[],ctx=runtime(),legacy=invoice({
    order_id:'SYNTHETIC-OLD',created_at:'2026-11-21T10:00:00+07:00',
    status:'EXPIRED',kode_unik:100,total_bayar:14900
  });
  const fixtures={orders:[legacy],credits_ledger:[],affiliate_commissions:[],
    katalog_produk:[{product_id:'P-TEST'}],members:[{member_id:'M-TEST'}]};
  ctx.console={log(){},warn(...args){events.push(args.join(' '));},error(){}};
  ctx.diagnosticDb_=()=>({});
  ctx.readAll_=name=>fixtures[name]||[];
  ctx.updateRow_=ctx.appendRow_=()=>{throw Error('unexpected write');};
  assert.equal(ctx.diagnosticFinanceReadOnly(),'FINANCE_AUDIT_WARN');
  assert.match(events.join(' '),/LEGACY_SUBTRACTIVE_AMOUNT_REVIEW/);
  assert.equal(legacy.total_bayar,14900);
});
test('source defends against reuse of already refunded bank reference',()=>{
  assert.match(code,/\['PAID','FULFILLED','REFUNDED'\]\.indexOf\(String\(row\.status\)\)/);
  assert.match(code,/x\.member_id===m\.member_id&&ngdCreditPosted_\(x\)/);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const gas=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');

test('logout or expired auth clears prior account checkout and private snapshots',()=>{
  const start=app.indexOf('function clearPrivateCommandCenter_(){');
  const end=app.indexOf('async function logout(){',start);
  assert.ok(start>=0&&end>start);
  const state={
    home:{saldo_kredit:999},orders:[{member_id:'A'}],lastOrder:{order_id:'A-ORDER'},
    checkoutProductId:'A-PRODUCT',checkoutRequestId:'REQ-A',orderDetailLoading:true,
    affiliates:{kode_referral:'A'},memberProducts:[{product_id:'PRIVATE'}],
    memberDashboardReads:{balance:true},notifications:{items:[{private:true}]},
    creditHistory:[{saldo:999}],lmsCourseDetail:{lessons:['PRIVATE']},
    supportTickets:[{id:'TICKET-A'}],ticketDetail:{private:true},
    adminOrders:[{private:true}],adminRuntime:{private:true},adminSettings:{private:true},
    catalog:[{public:true}],pendingPurchaseId:'B-PRODUCT',
    workspaceInfo:{environment:'STAGING'}
  };
  vm.runInNewContext(app.slice(start,end)+';clearPrivateCommandCenter_();',{state});
  for(const key of ['home','lastOrder','affiliates','lmsCourseDetail','ticketDetail','adminRuntime','adminSettings'])
    assert.equal(state[key],null,key);
  for(const key of ['orders','memberProducts','creditHistory','supportTickets','adminOrders'])
    assert.equal(state[key].length,0,key);
  assert.equal(state.checkoutProductId,'');
  assert.equal(state.checkoutRequestId,null);
  assert.equal(state.orderDetailLoading,false);
  assert.equal(state.notifications.items.length,0);
  assert.equal(state.catalog.length,1,'public catalog must remain');
  assert.equal(state.pendingPurchaseId,'B-PRODUCT','login intent remains');
  assert.equal(state.workspaceInfo.environment,'STAGING');
  assert.match(app,/clearPrivateCommandCenter_\(\);\s*state.token=result.token/);
  assert.match(app,/state.token='';state.me=null;sessionStorage.removeItem\(tokenKey\);\s*clearPrivateCommandCenter_\(\)/);
});

function partnerHarness(){
  const ctx=vm.createContext({console:{log(){},error(){}}});
  vm.runInContext(gas,ctx,{timeout:10000});
  const logged=[],rows=[
    {item_id:'GOOD',aktif:true,link_affiliate:'https://partner.example/course?ref=ABC123',judul:'Partner valid'},
    {item_id:'RAW',aktif:true,link_affiliate:'https://partner.example/',judul:'Raw vendor URL'},
    {item_id:'OFF',aktif:false,link_affiliate:'https://partner.example/?ref=ABC123',judul:'Inactive'},
    {item_id:'HTTP',aktif:true,link_affiliate:'http://partner.example/?ref=ABC123',judul:'No HTTPS'}
  ];
  ctx.requirePublicTrackingEnabled_=()=>{};
  ctx.withLock_=fn=>fn();
  ctx.safeText_=(v,max)=>String(v||'').slice(0,max);
  ctx.byId_=(table,k,val)=>(table==='etalase_affiliate_luar'?rows:[]).find(x=>x[k]===val)||null;
  ctx.findRows_=(table,pred)=>(table==='klik_log'?logged:[]).filter(pred);
  ctx.readAll_=table=>table==='etalase_affiliate_luar'?rows:[];
  ctx.appendRow_=(table,row)=>{assert.equal(table,'klik_log');logged.push(row);};
  ctx.now_=()=>new Date();
  let serial=0;ctx.recordId_=()=> 'CL-'+(++serial);
  ctx.activeMember_=()=>({member_id:'M-1',role:'MEMBER',status:'AKTIF'});
  return {
    ctx,rows,logged,
    click:(itemId,visitorId)=>vm.runInContext(
      'apiRouter_("trackClick","",'+JSON.stringify({
        tipe:'ETALASE_LUAR',item_id:itemId,visitor_id:visitorId
      })+',"REQ")',ctx,{timeout:2000})
  };
}
test('partner catalog returns only active HTTPS affiliate links, not raw vendor URLs',()=>{
  const f=partnerHarness();
  const list=vm.runInContext('apiRouter_("getEtalase","TOKEN",{},"REQ")',f.ctx);
  assert.deepEqual(Array.from(list,x=>x.item_id),['GOOD']);
  assert.equal(f.rows.length,4,'existing partner rows are not deleted');
});
test('unknown, disabled and non-affiliate outbound clicks cannot pollute click_log',()=>{
  const f=partnerHarness();
  for(const item of ['MISSING','RAW','OFF','HTTP'])
    assert.throws(()=>f.click(item,'visitor-first-123456'),/Tautan partner tidak tersedia/);
  assert.equal(f.logged.length,0);
  assert.equal(f.click('GOOD','visitor-first-123456').recorded,true);
  assert.equal(f.click('GOOD','visitor-first-123456').recorded,false);
  assert.equal(f.logged.length,1);
});

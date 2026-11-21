'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('js/app.js');
const backend=read('apps-script/Code.gs');
const stage=read('staging/member-config.js');
const publicConfig=read('config.js');
const html=[read('index.html'),read('staging/member.html')];
const css=read('assets/checkout-qris-unified.css');
const catalogStart=app.indexOf('function viewPublicMarketplace(list)');
const catalogEnd=app.indexOf('function viewPartnerShelf_()',catalogStart);
const catalog=app.slice(catalogStart,catalogEnd);
const checkoutStart=app.indexOf('function checkoutFreeUrl_');
const checkoutEnd=app.indexOf('function viewCheckout(){',checkoutStart);
const draft=app.slice(checkoutStart,checkoutEnd);
function harness({id='P-SERVICE',price=50000,payments=false,logged=true}={}){
  const p={product_id:id,nama:'Jasa Website',deskripsi:'Deskripsi',harga:price,tipe:'JASA_SEKALI'};
  const state={catalog:[p],checkoutProductId:id};
  const make=new Function('state','config','moneyValue','paymentEnabled','qrisUrl',
    'isAdmin','logged','supportedSaleTypes','offerUiTitle_','offerUiDescription_',
    'offerCategoryLabel','esc','idSafe','rupiah','icon','NGD_FREE_EBOOK_URL',
    'NGD_FREE_CLASSROOM_URL','isPublicQaOffer_','toast','go',
    draft+'\nreturn {viewCheckoutDraft_,openProductCheckout_};');
  const routes=[];
  return {routes,ui:make(state,
    {qrisMerchant:'Linggau AI Studio',qrisOwnerImageApproved:payments},
    Number,()=>payments,()=>payments?'https://example.invalid/qris.svg':'',
    ()=>false,()=>logged,new Set(['JASA_SEKALI']),
    p=>p.nama,p=>p.deskripsi,()=>'Jasa Digital',
    String,String,n=>'Rp'+n,()=>'', 'https://example.invalid/ebook',
    'https://example.invalid/kelas',()=>false,()=>{},route=>routes.push(route))};
}
test('all owned marketplace cards and three public home offers route internally, no WhatsApp CTA',()=>{
  assert.match(catalog,/data-checkout-product/);
  assert.doesNotMatch(catalog,/data-buy=/);
  assert.doesNotMatch(catalog,/wa\.me|Tanya via WhatsApp|Chat WhatsApp|Hubungi admin/);
  assert.match(app,/data-service-product/);
  const home=app.slice(app.indexOf('function viewHomeServices_'),app.indexOf('function viewHome(){'));
  assert.match(home,/data-checkout-product/);
  assert.doesNotMatch(home,/wa\.me|Tanya via WhatsApp|WhatsApp belum tersedia/);
});
test('every card opens a safe checkout preview without creating an order',()=>{
  const h=harness();
  h.ui.openProductCheckout_('P-SERVICE');
  assert.deepEqual(h.routes,['checkout']);
  const markup=h.ui.viewCheckoutDraft_();
  assert.match(markup,/Jasa Website/);
  assert.match(markup,/QRIS Statis · DANA Bisnis/);
  assert.match(markup,/Pembayaran belum dibuka/);
  assert.doesNotMatch(markup,/data-checkout-create=|data-qris-image|wa\.me/);
});
test('free products enter the same preview but never demand QRIS payment',()=>{
  const h=harness({id:'P-EBOOK',price:0});
  const markup=h.ui.viewCheckoutDraft_();
  assert.match(markup,/Buka akses gratis/);
  assert.match(markup,/tidak memerlukan pembayaran QRIS/);
  assert.doesNotMatch(markup,/data-checkout-create=/);
});
test('verified release UI creates only internal QRIS orders, never external invoices',()=>{
  const h=harness({payments:true});
  assert.match(h.ui.viewCheckoutDraft_(),/data-checkout-create="P-SERVICE"/);
  const buy=app.slice(app.indexOf('async function buy(productId)'),app.indexOf('async function openOrderDetail_'));
  assert.match(buy,/api\('createOrder',\{product_id:productId\}/);
  assert.match(buy,/state.checkoutRequestId\|\|createRequestId\(\)/);
  assert.doesNotMatch(buy,/createMayarOrder|scalevCheckoutFor_|wa\.me/);
  assert.match(backend,/function newOrder_\(m,p,requestId\)/);
  assert.match(backend,/metode:'QRIS_STATIS'/);
});
test('financial gate is independently closed in public, staging and backend',()=>{
  assert.match(stage,/paymentsEnabled:false/);
  assert.match(stage,/qrisOwnerImageApproved:false/);
  assert.match(publicConfig,/paymentsEnabled:\s*false/);
  assert.match(publicConfig,/qrisOwnerImageApproved:\s*false/);
  assert.match(backend,/function requireFinanceEnabled_\(\)/);
  assert.match(backend,/function requireActionFeatureEnabled_\(action\)/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&officialQr;/);
  assert.match(app,/config\.qrisOwnerImageApproved===true/);
});
test('public and staging load the same checkout UI and new JS while keeping old styles',()=>{
  for(const page of html){
    assert.match(page,/checkout-qris-unified\.css\?v=20261121-qris-checkout-v1/);
    assert.match(page,/app\.js\?v=20261121-qris-checkout-v2/);
    assert.ok(page.indexOf('checkout-qris-unified.css')>page.indexOf('commission-experience-v2.css'));
  }
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});

test('checkout deep link keeps the validated product ID on refresh',()=>{
  assert.match(app,/if\(hash\.startsWith\('checkout\/'\)\)/);
  assert.match(app,/state\.checkoutProductId=id;state\.lastOrder=null/);
  assert.match(app,/checkout\/'\+encodeURIComponent\(state\.checkoutProductId\)/);
  assert.match(app,/return 'katalog';/);
});

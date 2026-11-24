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
  const state={catalog:[p],checkoutProductId:id,workspaceInfo:{workspace:'NGD_STAGING',environment:'STAGING',finance_enabled:payments,mutations_enabled:true}};
  const make=new Function('state','config','moneyValue','paymentEnabled','qrisUrl',
    'isAdmin','logged','supportedSaleTypes','offerUiTitle_','offerUiDescription_',
    'offerCategoryLabel','esc','idSafe','rupiah','icon','NGD_FREE_EBOOK_URL',
    'NGD_FREE_CLASSROOM_URL','isPublicQaOffer_','toast','go',
    draft+'\nreturn {viewCheckoutDraft_,openProductCheckout_};');
  const routes=[];
  return {routes,ui:make(state,
    {qrisMerchant:'Linggau AI Studio',qrisOwnerImageApproved:payments,qrisImageUrl:payments?'https://example.invalid/qris.svg':''},
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
test('STAGING client opt-in never bypasses backend finance or unverified QRIS',()=>{
  assert.match(stage,/paymentsEnabled:true/);
  assert.match(stage,/qrisOwnerImageApproved:true/);
  assert.match(publicConfig,/paymentsEnabled:\s*false/);
  assert.match(publicConfig,/qrisOwnerImageApproved:\s*false/);
  assert.match(backend,/function requireFinanceEnabled_\(\)/);
  assert.match(backend,/function requireActionFeatureEnabled_\(action\)/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&officialQr;/);
  assert.ok(app.includes('config.qrisOwnerImageApproved===true'));
  const begin=app.indexOf('const paymentEnabled=()=>');
  const stop=app.indexOf(';',begin);
  assert.ok(begin>=0&&stop>begin, 'backend-attested payment release required');
  const definition=app.slice(begin,stop+1);
  const finance=new Function('isWriteEnabled','config','state','location',
    definition+'return paymentEnabled();');
  const stageInfo={workspace:'NGD_STAGING',environment:'STAGING',mutations_enabled:true,finance_enabled:false};
  const location={pathname:'/ngulik-digital-member/staging/member.html'};
  assert.equal(finance(()=>true,{paymentsEnabled:true},{workspaceInfo:stageInfo},location),false,
    'client opt-in cannot bypass server finance=false');
  assert.equal(finance(()=>true,{paymentsEnabled:true},{workspaceInfo:{...stageInfo,finance_enabled:true}},location),true,
    'approved STAGING backend can activate finance');
  assert.equal(finance(()=>true,{paymentsEnabled:true},{workspaceInfo:{...stageInfo,finance_enabled:true}},{pathname:'/ngulik-digital-member/'}),false,
    'production path remains isolated');
  assert.equal(finance(()=>true,{paymentsEnabled:true},{workspaceInfo:null},location),false,
    'unverified or unreachable API fails closed');
  assert.equal(finance(()=>false,{paymentsEnabled:true},{workspaceInfo:{...stageInfo,finance_enabled:true}},location),false,
    'write permission must remain active');
});
test('public and staging load the same checkout UI and new JS while keeping old styles',()=>{
  for(const page of html){
    assert.match(page,/checkout-qris-unified\.css\?v=20261121-qris-checkout-v4/);
    assert.match(page,/app\.js\?v=20261122-private-gates-v5/);
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

test('Back and Forward apply product-specific routes once without duplicate loads',()=>{
  const begin=app.indexOf('let lastRouteHash_=location.hash;');
  const end=app.indexOf('async function refreshPublic(){',begin);
  const syncBegin=app.indexOf('function syncBrowserRoute_(){');
  const syncEnd=app.indexOf('// Called synchronously during initial script evaluation',syncBegin);
  assert.ok(begin>=0&&end>begin&&syncBegin>=0&&syncEnd>syncBegin);
  const location={hash:'#katalog'},state={route:'katalog',lastOrder:null,checkoutProductId:'P-TEST'};
  const screens={beranda:1,katalog:1,checkout:1};
  const handlers={},renders=[],loads=[];
  const history={
    pushState(_a,_b,target){location.hash=target;},
    replaceState(_a,_b,target){location.hash=target;}
  };
  const window={
    scrollTo(){},
    addEventListener(type,fn){handlers[type]=fn;}
  };
  const routes=new Function('state','screens','location','history','window',
    'render','loadRoute','aiToolRoute_','aiRouteFromHash_','logged','isAdmin',
    app.slice(begin,end)+'\n'+app.slice(syncBegin,syncEnd)+
    '\nreturn {go,syncBrowserRoute_};'
  )(state,screens,location,history,window,
    ()=>renders.push(state.route),route=>loads.push(route),
    id=>'ai-tool/'+id,()=>{
      const slug=location.hash.slice(1);
      return slug.startsWith('checkout/')?'checkout':slug;
    },()=>true,()=>false);
  routes.go('checkout');
  assert.equal(location.hash,'#checkout/P-TEST');
  assert.equal(state.route,'checkout');
  location.hash='#katalog';
  handlers.popstate();handlers.hashchange();
  assert.equal(state.route,'katalog');
  assert.deepEqual(loads,['checkout','katalog']);
  assert.equal(renders.length,2);
});
test('homepage services use live catalog names and never link unpublished offers to checkout',()=>{
  const begin=app.indexOf('function viewHomeServices_(){');
  const end=app.indexOf('const safeBadge=',begin);
  assert.ok(begin>=0&&end>begin);
  const state={catalog:[]};
  const create=new Function('state','esc','idSafe','icon','isPublicQaOffer_',
    'offerUiTitle_','offerUiDescription_',
    app.slice(begin,end)+'\nreturn viewHomeServices_();');
  const html=()=>create(state,String,String,()=>'',()=>false,p=>p.nama,p=>p.deskripsi);
  assert.doesNotMatch(html(),/data-checkout-product=/);
  assert.match(html(),/data-route="katalog"/);
  state.catalog=[{product_id:'P-3IN1',nama:'Paket Baru',deskripsi:'Sesuai katalog'}];
  assert.match(html(),/data-checkout-product="P-3IN1"/);
  assert.match(html(),/Paket Baru/);
  assert.match(html(),/Sesuai katalog/);
  assert.match(backend,/function publicCatalog_\(\)/);
  assert.match(backend,/\.filter\(function\(r\)\{return r\.aktif===true;/);
  assert.doesNotMatch(html(),/data-checkout-product="P-VIDEO-AI"/);
});

test('checkout invoice matches the backend surcharge contract and never offers a malformed QRIS amount',()=>{
  assert.match(app,/dueAmount===baseAmount\+uniqueCode/);
  assert.match(app,/uniqueCode>=100&&uniqueCode<=999/);
  assert.match(app,/String\(o\.metode\)==='QRIS_STATIS'&&qrAmountMatchesOrder/);
  assert.match(app,/Nominal perlu verifikasi/);
  assert.match(app,/open&&qrAmountMatchesOrder&&officialQr\?'<button/);
  assert.doesNotMatch(app,/\(open\?'<button type="button" class="btn btn-secondary btn-sm" data-copy=/);
  assert.match(app,/Kode unik pembayaran/);
  assert.match(app,/harga produk \+ kode unik 3 digit/);
  assert.doesNotMatch(app,/Kode unik pesanan lama/);
});

test('guest cannot read member-only free resource URL from a direct checkout render',()=>{
  const visitor=harness({id:'P-EBOOK',price:0,logged:false}).ui.viewCheckoutDraft_();
  assert.match(visitor,/Akses khusus member/);
  assert.match(visitor,/data-route="login"/);
  assert.doesNotMatch(visitor,/buku-pintar-vibe-coder|Buka akses gratis|data-checkout-create/);
  const member=harness({id:'P-EBOOK',price:0,logged:true}).ui.viewCheckoutDraft_();
  assert.match(member,/Buka akses gratis/);
  assert.match(app,/if\(!logged\(\)\|\|isAdmin\(\)\)return viewCheckoutDraft_\(\)/);
});

test('server rejects subtractive QRIS amounts before persistence and financial approval',()=>{
  const fnStart=backend.indexOf('function ngdRequireQrOrderAmount_(o)');
  const fnEnd=backend.indexOf('var NGD_CHECKOUT_TYPES_',fnStart);
  assert.ok(fnStart>=0&&fnEnd>fnStart);
  const guard=new Function('require_',backend.slice(fnStart,fnEnd)+
    '\nreturn ngdRequireQrOrderAmount_;')((condition,code,message)=>{
      if(!condition)throw new Error(code+': '+message);
    });
  assert.equal(guard({metode:'QRIS_STATIS',harga_dasar:15000,kode_unik:100,total_bayar:15100}),15100);
  assert.throws(()=>guard({metode:'QRIS_STATIS',harga_dasar:15000,kode_unik:100,total_bayar:14900}),/RECONCILIATION_REQUIRED/);
  assert.throws(()=>guard({metode:'QRIS_STATIS',harga_dasar:15000,kode_unik:99,total_bayar:15099}),/RECONCILIATION_REQUIRED/);
  const checkout=backend.slice(backend.indexOf('function newOrder_'),backend.indexOf('function ngdMayarInvoiceUrl_'));
  assert.ok(checkout.indexOf('ngdRequireQrOrderAmount_(o);')<checkout.indexOf("appendRow_('orders',o);"));
  assert.match(checkout,/var persisted=byId_\('orders','order_id',id\)/);
  assert.match(checkout,/ngdRequireQrOrderAmount_\(persisted\)/);
  assert.match(checkout,/Number\(persisted\.total_bayar\)\.toLocaleString\('id-ID'\)/);
  assert.match(checkout,/return orderView_\(persisted,m\)/);
  const transition=backend.slice(backend.indexOf('function transitionOrder_'),backend.indexOf('// Shared pure reference checks.'));
  assert.match(transition,/if\(String\(o\.metode\|\|''\)==='QRIS_STATIS'\)ngdRequireQrOrderAmount_\(o\)/);
});

test('only a validated additive QRIS invoice permits CMS-owned WhatsApp proof',()=>{
  const begin=app.indexOf('function ngdPaymentProofWaUrl_(order,rawAdminWa)');
  const finish=app.indexOf('function viewCheckout(){',begin);
  assert.ok(begin>=0&&finish>begin);
  const window={};
  require('node:vm').runInNewContext(read('js/cms-surfaces.js'),{window});
  const state={siteContent:[{content_id:'CNT-CHECKOUT-WA-TEMPLATE',
    kind:'WA_TEMPLATE',placement:'checkout',status:'PUBLISHED',
    description:[
      'Halo Admin Ngulik Digital, saya sudah transfer untuk pesanan:',
      '• ID Pesanan: {{order_id}}','• Paket: {{nama_produk}}',
      '• Nominal Transfer: {{total_bayar}}',
      'Mohon dicek dan diaktifkan ya. Terima kasih.'
    ].join(String.fromCharCode(10))}]};
  const make=new Function('rupiah','window','state',app.slice(begin,finish)+
    String.fromCharCode(10)+'return ngdPaymentProofWaUrl_;')(
      n=>'Rp'+Number(n).toLocaleString('id-ID'),window,state);
  const order={order_id:'NGD-261122-ABCDEF123456',nama_produk:'Starter Pack',
    harga_dasar:15000,kode_unik:100,total_bayar:15100,metode:'QRIS_STATIS'};
  const url=make(order,'081234567890');
  assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
  const body=decodeURIComponent(url.split('?text=')[1]);
  assert.ok(body.includes('NGD-261122-ABCDEF123456'));
  assert.ok(body.includes('Rp15.100'));
  assert.ok(body.includes('Mohon dicek dan diaktifkan'));
  assert.equal(make({...order,total_bayar:14900},'081234567890'),'');
  assert.equal(make(order,'nomor-tidak-valid'),'');
  state.siteContent=[];
  assert.equal(make(order,'081234567890'),'','missing CMS must fail closed');
  const view=app.slice(app.indexOf('function viewCheckout(){'),app.indexOf('function viewAdminRuntime(){'));
  assert.ok(view.includes('data-payment-proof-wa'));
  assert.ok(view.includes('NGD_CMS_SURFACES?.checkoutButton'));
  assert.ok(view.includes('NGD_CMS_SURFACES?.checkoutGuide'));
  assert.equal(view.includes('data-action="confirm-payment"'),false);
  assert.ok(view.includes('proofWaUrl=canConfirm?ngdPaymentProofWaUrl_'));
  const checkout=app.slice(app.indexOf('async function buy(productId)'),app.indexOf('async function openOrderDetail_'));
  assert.ok(checkout.includes("api('createOrder'"));
  assert.equal(checkout.includes('wa.me'),false);
});

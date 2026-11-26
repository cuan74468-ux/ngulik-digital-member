'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/commission-experience-v2.css'),'utf8');
const publicHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const stagingHtml=fs.readFileSync(path.join(root,'staging/member.html'),'utf8');
const api=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');

test('affiliate landing separates public and authenticated member experience',()=>{
  const begin=app.indexOf('function viewAffiliate(){');
  const end=app.indexOf('function viewNotificationCenter(){',begin);
  const section=app.slice(begin,end);
  assert.ok(begin>=0&&end>begin);
  assert.match(section,/if\(!logged\(\)\)return '<div class="partner-public"/);
  assert.match(section,/class="partner-member/);
  assert.match(section,/NGD_CMS_SURFACES\?\.affiliateInfo\(state\.siteContent\)/);
  assert.match(section,/data-route="katalog"/);
  assert.doesNotMatch(section,/Gratis bergabung|Tidak ada jaminan penghasilan|class="partner-steps-compact"|class="partner-faq-item"/);
});
test('member dashboard uses real backend data and distinguishes requested from approved balances',()=>{
  assert.match(app,/state\.affiliates/);
  assert.match(app,/Array\.isArray\(a\.komisi\)/);
  assert.match(app,/x\.status==='APPROVED'&&!!x\.payout_requested_at/);
  assert.match(app,/x\.status==='APPROVED'&&!x\.payout_requested_at/);
  assert.match(app,/Number\(totals\.PENDING\)/);
  assert.match(app,/Number\(totals\.PAID\)/);
  assert.match(app,/a\.klik\?\?0/);
  assert.match(app,/a\.pendaftar\?\?0/);
  assert.match(app,/all\.length/);
  assert.match(app,/friendlyDate\(x\.created_at\)/);
  assert.doesNotMatch(app.slice(app.indexOf('function viewAffiliate(){'),app.indexOf('function viewNotificationCenter(){')),/konversi.*Pembelian terverifikasi/);
});
test('referral sharing validates backend link and keeps STAGING invites isolated',()=>{
  assert.match(app,/const referralBase='https:\/\/cuan74468-ux\.github\.io\/ngulik-digital-member\/'/);
  assert.match(app,/\/\^\[A-Za-z0-9_-\]\{3,80\}\$\//);
  assert.match(app,/encodeURIComponent\(code\)/);
  assert.match(app,/https:\/\/wa\.me\/\?text=/);
  assert.match(app,/rel="noopener noreferrer"/);
  assert.match(app,/data-copy=/);
});
test('payout action is explicit, guarded, and server-authoritative',()=>{
  assert.match(app,/if\(affiliatePayoutSubmitting_\|\|!paymentEnabled\(\)\)return/);
  assert.match(app,/if\(!confirm\('Ajukan komisi /);
  assert.match(app,/api\('requestPayout',\{nomor_dana:nomorDana\},state\.token,\{write:true\}\)/);
  assert.match(app,/api\('getAffiliateDashboard',\{\},state\.token\)/);
  assert.match(api,/function requestPayout_\(m,p\)/);
  assert.match(api,/require_\(total>=Number\(setting_\('min_payout',50000\)\)/);
  assert.match(api,/\['PAID','FULFILLED'\]/);
});
test('responsive, light commission CSS loads last for public and staging',()=>{
  assert.match(css,/\.partner-public/);
  assert.match(css,/\.partner-member/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css,/#2F6BFF|#4361ee/i);
  for(const html of [publicHtml,stagingHtml]){
    assert.match(html,/commission-experience-v2\.css\?v=20261121-member-public-v2/);
    assert.ok(html.indexOf('commission-experience-v2.css')>html.indexOf('affiliate-partner.css'));
    assert.ok(html.indexOf('commission-experience-v2.css')>html.indexOf('catalog-experience-v3.css'));
    assert.match(html,/app\.js\?v=20261122-private-gates-v5/);
  }
});
test('affiliate dashboard prioritizes verified referral link and hides payout while finance is OFF',()=>{
  const begin=app.indexOf('function viewAffiliate(){');
  const end=app.indexOf('function viewNotificationCenter(){',begin);
  const section=app.slice(begin,end);
  assert.match(section,/const url=verifiedCommissionLink_\(a\)/);
  assert.match(section,/data-copy=/);
  assert.match(section,/partner-link-panel/);
  assert.match(section,/partner-metric-grid/);
  assert.ok(section.indexOf('partner-link-panel')<section.indexOf('partner-metric-grid'));
  assert.match(section,/const canRequest=eligible>0&&paymentEnabled\(\)/);
  assert.match(section,/canRequest\?'<div class="partner-payout-form">/);
  assert.match(section,/Pencairan belum dibuka/);
  assert.doesNotMatch(section,/partner-free-links|ebookInvite|classInvite/); // Material links are member-learning only.
});

test('product share links require backend-authorized active partner and valid commission product',()=>{
 const vm=require('node:vm');const code=app.slice(app.indexOf('function catalogSaleHold_'),app.indexOf('function checkoutQrReady_'))+app.slice(app.indexOf('function verifiedCommissionLink_'),app.indexOf('function viewProductDetail(){'));
 const base='https://cuan74468-ux.github.io/ngulik-digital-member/';
 const state={qa:false,affiliates:{mitra_aktif:true,kode_referral:'ABC123',link:base+'?ref=ABC123'}};
 const location={pathname:'/ngulik-digital-member/staging/member.html'};
 let authenticated=true,admin=false;const ctx=vm.createContext({state,location,logged:()=>authenticated,isAdmin:()=>admin,isPublicQaOffer_:p=>p.product_id.startsWith('P-QA')});
 vm.runInContext(code,ctx);const share=p=>ctx.productCommissionLink_(p);
 const p={product_id:'P-POS',bisa_komisi:true,harga:149000};
 assert.equal(share(p),base+'staging/member.html?ref=ABC123#detail-produk/P-POS');
 location.pathname='/ngulik-digital-member/';assert.equal(share(p),base+'?ref=ABC123#detail-produk/P-POS');
 for(const bad of [{...p,bisa_komisi:false},{...p,harga:0},{...p,product_id:'P-QA-1'},{...p,product_id:'<script>'},{...p,product_id:'P-TOKEN-10'},{...p,product_id:'P-CANVA-30'},{...p,product_id:'P-EBOOK'}])assert.equal(share(bad),'');
 admin=true;assert.equal(share(p),'');admin=false;authenticated=false;assert.equal(share(p),'');authenticated=true;
 state.qa=true;assert.equal(share(p),'');state.qa=false;state.affiliates.mitra_aktif=false;assert.equal(share(p),'');
 state.affiliates.mitra_aktif=true;state.affiliates.link='https://evil.example/?ref=ABC123';assert.equal(share(p),'');
});

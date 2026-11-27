'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const renderer=read('js/public-cms-home.js');
const app=read('js/app.js');
const back=read('apps-script/Content.gs');
const gateway=read('apps-script/Code.gs');
const html=[read('index.html'),read('staging/member.html')];

function cms(){
 const window={NGD_CONTENT_UI:{mediaPath(s){
   return /^assets\/[a-z0-9_./-]+\.webp$/.test(String(s||''))?'./'+s:'';
 }}};
 vm.runInNewContext(renderer,{window});
 return window.NGD_PUBLIC_CMS;
}
function row(id,kind,title,desc='',placement='home',order=1,extra={}){
 return {content_id:id,kind,title,description:desc,placement,sort_order:order,
   image_path:'',cta_label:'',cta_route:'',status:'PUBLISHED',...extra};
}
test('public home renders only CMS-provided copy and safe route actions',()=>{
 const cmsUi=cms();
 const content=[
   row('CNT-HERO-MAIN','HERO','Judul dari Admin','Deskripsi dari Admin','home',1,
      {cta_label:'Mulai Sekarang — Rp15.000',cta_route:'daftar'}),
   row('CNT-HERO-SECONDARY','CTA_BUTTON','','','home',1,{cta_label:'Masuk Member',cta_route:'masuk'}),
   row('CNT-PILL-01','HIGHLIGHT_PILL','Pakai dari HP biasa'),
   row('CNT-SECTION-USECASES','SECTION_HEADING','Pilih yang Lagi Kamu Butuhkan:'),
   row('CNT-USECASE-01','USECASE_CARD','Buntu bikin kata promosi?','Ketik nama daganganmu'),
   row('CNT-STARTER-MAIN','FEATURE_CARD','Masuk Sekali Rp15.000','Pesan ringkas'),
   row('CNT-STARTER-BULLET-01','FEATURE_BULLET','Kumpulan Template Siap Edit','Tinggal ganti'),
   row('CNT-HONESTY-BOX','NOTICE_BOX','Catatan Apa Adanya:','Bukan sulap'),
   row('CNT-SECTION-SERVICES','SECTION_HEADING','Layanan tambahan','', 'home',10),
   row('CNT-NEXT-01','SERVICE_CARD','Katalog Order WA','Ringkas','home',11),
   row('CNT-MEMBER-BENEFIT','BENEFIT_LIST','Kenapa Enak Jadi Member?'),
   row('CNT-BENEFIT-01','BENEFIT_BULLET','Bantuan lewat chat WA','Aksesibel')
 ];
 const result=cmsUi.home(content,{tagline_brand:'ALAT BANTU UMKM • CUKUP DARI HP',
   footer_identitas:'Identitas dari pengaturan',footer_aksesibilitas:'Aksesibilitas dari pengaturan'});
 for(const line of ['Judul dari Admin','Deskripsi dari Admin','Pakai dari HP biasa',
  'Kumpulan Template Siap Edit','Catatan Apa Adanya:','Layanan tambahan',
  'Identitas dari pengaturan','Aksesibilitas dari pengaturan'])
   assert.ok(result.includes(line),line);
 assert.match(result,/data-route="daftar"/);
 assert.match(result,/data-route="login"/);
 assert.doesNotMatch(result,/Punya usaha\?|WARUNG TOOLS|ngd-v6-bundle/);
});
test('missing published HERO is neutral and never fabricates promotional fallback',()=>{
 const cmsUi=cms();
 assert.match(cmsUi.home([],{}),/data-route="katalog"/);
 assert.match(cmsUi.home([],{}),/data-route="dukungan"/);
 assert.doesNotMatch(cmsUi.home([],{}),/Sedang memuat informasi/);
 assert.doesNotMatch(cmsUi.home([],{}),/Rp15\.000|komisi|QRIS/);
});
test('untrusted admin strings and routes cannot inject markup or navigation',()=>{
 const ui=cms(),evil='<img src=x onerror=alert(1)>';
 const html=ui.home([row('CNT-HERO-MAIN','HERO',evil,evil,'home',1,
   {cta_route:'javascript:alert(1)',cta_label:'Klik'})],{footer_identitas:evil});
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x onerror=/);
 assert.doesNotMatch(html,/data-route="javascript:/);
});
test('guest code delegates to CMS only; no marketing copy in source-level guest branch',()=>{
 const start=app.indexOf('// Guest-only landing;');
 const end=app.indexOf('const offerCategories=',start);
 assert.ok(start>0&&end>start);
 const block=app.slice(start,end);
 assert.match(block,/NGD_PUBLIC_CMS\?\.home\(state\.siteContent,state\.publicSettings\)/);
 assert.doesNotMatch(block,/Punya usaha|Urusan digital|Bikin konten jualan|Lihat Produk/);
 for(const page of html)assert.match(page,/js\/public-cms-home\.js\?v=20261124-cms-draft-v1/);
});
test('backend exposes only allowlisted public settings; release gates are unchanged',()=>{
 assert.match(gateway,/case 'getPublicSettings':return ngdPublicSettings_\(\)/);
 assert.match(back,/var NGD_PUBLIC_SETTINGS_KEYS_/);
 assert.doesNotMatch(back.slice(back.indexOf('function ngdPublicSettings_')),/getProperties\(\)|getScriptProperties\(\)/);
 for(const kind of ['HIGHLIGHT_PILL','USECASE_CARD','FEATURE_CARD','BENEFIT_LIST',
  'AUTH_COPY','CHECKOUT_GUIDE','WA_TEMPLATE','PORTAL_NOTICE','AFFILIATE_INFO'])
   assert.ok(back.includes("'"+kind+"'"),kind);
 assert.match(gateway,/function requireMutationsEnabled_\(/);
 assert.match(gateway,/function requireFinanceEnabled_\(/);
});

test('home displays three CMS portfolio example cards with safe external links',()=>{const c=cms(),url='https://cuan74468-ux.github.io/bakso-len-1-menu/';const rows=[row('CNT-HERO-MAIN','HERO','Hero'),...['PORTFOLIO_CARD','SERVICE_CARD','PROMO'].map((kind,i)=>row('BL-'+i,kind,'Example '+i,'CMS copy','home',i+2,{cta_label:'Lihat Contoh',cta_route:url})),row('bad','PORTFOLIO_CARD','Unsafe','bad','home',7,{cta_label:'Unsafe link',cta_route:'https://evil.example/'})];const html=c.home(rows,{});assert.equal((html.match(/href="https:\/\/cuan74468-ux\.github\.io\/bakso-len-1-menu\/" target="_blank" rel="noopener noreferrer"/g)||[]).length,3);assert.doesNotMatch(html,/href="https:\/\/evil/);assert.match(html,/Example 0/);assert.match(html,/Example 1/);assert.match(html,/Example 2/);});

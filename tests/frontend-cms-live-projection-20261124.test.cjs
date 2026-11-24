'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('js/app.js').replace(/^import .*?;\s*$/gm,'');
function preview(){
 const nodes={};
 const el=id=>nodes[id]||(nodes[id]={
  innerHTML:'',textContent:'',append(){},querySelector(){return {disabled:false}},
  addEventListener(){}
 });
 const document={body:{classList:{toggle(){}},setAttribute(){}},
  getElementById:el,addEventListener(){},title:'',currentScript:null};
 const window={NGD_CONFIG:{demoMode:true,apiUrl:'',siteUrl:'https://example.invalid/',
   paymentsEnabled:false,supportEnabled:false,notificationsEnabled:false,
   lmsEnabled:false,qrisMerchant:'',qrisImageUrl:''},
   NGD_CONTENT_UI:{media(){return '';},published(){return [];},catalogBanner(){return '';},cover(){return '';},
   mediaPath(raw){
    return /^assets\/[A-Za-z0-9_./-]+\.webp$/.test(String(raw||''))?'./'+raw:'';
   }},addEventListener(){},scrollTo(){}};
 const ctx=vm.createContext({window,document,
  location:{href:'https://example.invalid/',origin:'https://example.invalid',pathname:'/',hash:'#beranda',search:''},
  sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  history:{replaceState(){}},api(){throw Error('Network is forbidden in pure frontend regression')},
  isConnected:()=>false,isWriteEnabled:()=>false,
  ApiError:class ApiError extends Error{},URL,URLSearchParams,Intl,Date,Number,Map,
  setTimeout,clearTimeout});
 vm.runInContext(read('js/public-cms-home.js'),ctx,{timeout:3500});
 vm.runInContext(app,ctx,{timeout:4500});
 return {ctx,nodes};
}
test('real getPublicContent projection has no status; guest page still shows published hero',()=>{
 const {ctx,nodes}=preview();
 const payload=[
   {content_id:'CNT-HERO-MAIN',kind:'HERO',placement:'home',title:'Judul CMS Terbit',
    description:'Terbit dari Sheet',image_path:'assets/media/ngd-v6-starter.webp',
    cta_label:'Mulai',cta_route:'daftar',sort_order:1},
   {content_id:'CNT-PILL-01',kind:'HIGHLIGHT_PILL',placement:'home',title:'Mulai dari HP',
    description:'',image_path:'',cta_label:'',cta_route:'',sort_order:2}
 ];
 vm.runInContext('state.siteContent='+JSON.stringify(payload)+
  ';state.cmsLoaded=true;state.publicSettings={tagline_brand:"ALAT BANTU UMKM"};render()',ctx);
 const html=nodes.screen.innerHTML;
 assert.match(html,/Judul CMS Terbit/);
 assert.match(html,/Terbit dari Sheet/);
 assert.match(html,/ngd-cms-hero-art/);
 assert.doesNotMatch(html,/Konten STAGING belum terbaca|Beranda publik sedang disiapkan/);
});
test('no published hero after completed fetch still shows meaningful service state',()=>{
 const {ctx,nodes}=preview();
 vm.runInContext('state.siteContent=[];state.cmsLoaded=true;render()',ctx);
 assert.match(nodes.screen.innerHTML,/Beranda publik sedang disiapkan/);
 assert.match(nodes.screen.innerHTML,/Coba muat ulang konten/);
});
test('backend public CMS projection intentionally excludes status while filtering published rows',()=>{
 const backend=read('apps-script/Content.gs'),app=read('js/app.js');
 const a=backend.slice(backend.indexOf('function contentPublicList_()'),
    backend.indexOf('function contentCreate_',backend.indexOf('function contentPublicList_()')));
 assert.match(a,/row\.status==='PUBLISHED'/);
 assert.doesNotMatch(a,/item\.status=/);
 const home=app.slice(app.indexOf('const editorHtml=window.NGD_PUBLIC_CMS'),app.indexOf('const offerCategories=',app.indexOf('const editorHtml=window.NGD_PUBLIC_CMS')));
 assert.doesNotMatch(home,/row\?\.status==='PUBLISHED'/);
});

test('new CMS hero preserves a real CMS image slot and overrides the legacy purple theme',()=>{
 const html=read('js/public-cms-home.js');
 const css=read('assets/ngulik-design-system.css');
 assert.match(html,/class="ngd-cms-hero-art"/);
 assert.match(html,/const heroImage=photo\(hero\.image_path\)/);
 const index=css.indexOf('/* PUBLIC — editorial hero */');
 const end=css.indexOf('html body.ngd-public-app[data-app-role="guest"]:not(#ngd) #screen .ngdl-btn{',index);
 const rule=css.slice(index,end);
 assert.ok(index>=0&&end>index);
 assert.match(rule,/background:#f7f7f1!important/);
 assert.match(rule,/color:#141418!important/);
 assert.doesNotMatch(rule,/background:#5B3DF5!important/);
 assert.match(read('assets/landing-guest-v1.css'),/\.ngd-cms-hero-art\{/);
});

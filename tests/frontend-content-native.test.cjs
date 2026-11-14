'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('js/content-ui.js');
function make(){
  const window={};const context=vm.createContext({window});
  vm.runInContext(source,context,{timeout:3000});
  return window.NGD_CONTENT_UI;
}
const hero=(p={})=>({kind:'HERO',placement:'home',image_path:'assets/media/banner-promo.webp',
  title:'Promo Tahun Baru',description:'Produk digital berkualitas',cta_label:'Jelajahi',
  cta_route:'katalog',sort_order:1,...p});
test('image URLs accept only same-origin uploaded assets, no SVG or data injection',()=>{
  const ui=make();
  for(const p of [
    'https://example.com/img.png','//cdn.com/img.png','assets/media/icon.svg',
    'assets/media/x.png?javascript:alert(1)','assets/media/../secret.webp',
    'assets/media/dir//pic.jpg','data:image/png;base64,AAAA'])
    assert.equal(ui.mediaPath(p),'',p);
  assert.equal(ui.mediaPath('assets/media/november/promo-1.webp'),'./assets/media/november/promo-1.webp');
});
test('carousel renders unlimited published marketing banners as real images with accessible controls',()=>{
  const ui=make();
  const imgs=Array.from({length:8},(_,i)=>hero({title:'Promo '+i,sort_order:i+1}));
  const html=ui.hero(imgs);
  assert.equal((html.match(/class="nh-hero nh-hero-slide"/g)||[]).length,8);
  assert.equal((html.match(/data-hero-index=/g)||[]).length,8);
  assert.match(html,/data-hero-pause/);
  assert.match(html,/data-hero-step="-1"/);
  assert.match(html,/data-hero-step="1"/);
  assert.match(html,/loading="eager"/);
  assert.match(html,/data-route="katalog"/);
  assert.doesNotMatch(html,/<svg/);
});
test('hero, page covers, logos and product images escape untrusted text',()=>{
  const ui=make(),evil='<img src=x onerror=alert(1)>';
  const s=ui.hero([hero({title:evil,description:evil,cta_route:'javascript:alert(1)'})]);
  assert.match(s,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(s,/<img src=x onerror=/);
  assert.doesNotMatch(s,/data-route="javascript/);
  assert.equal(ui.media([hero({kind:'PRODUCT_IMAGE',placement:'P-ONE',title:evil})],
    'PRODUCT_IMAGE','P-ONE','media'),'<'+'img class="media" src="./assets/media/banner-promo.webp" alt="'+
    '&lt;img src=x onerror=alert(1)&gt;" loading="lazy" decoding="async">');
  assert.match(ui.cover([hero({kind:'PAGE_COVER',placement:'katalog'})],'katalog'),/native-page-cover/);
});
test('admin content editor supports draft, schedule, sorting, edit and soft archival without network',()=>{
  const ui=make(),draft=hero({kind:'HERO',content_id:'C-ABC',status:'DRAFT',revision:'abc',
    start_date:'2026-11-20',end_date:'2026-12-31'});
  const html=ui.admin({authorized:true,items:[draft],enabled:false,selectedId:'C-ABC',products:[]});
  for(const field of ['kind','placement','image_path','title','description','cta_label','cta_route',
    'sort_order','start_date','end_date'])assert.ok(html.includes('name="'+field+'"'),field);
  assert.match(html,/id="content-editor-form"/);
  assert.match(html,/data-content-edit="C-ABC"/);
  assert.match(html,/data-content-status="PUBLISHED"/);
  assert.match(html,/data-content-status="ARCHIVED"/);
  assert.match(html,/2026-11-20/);
  assert.match(html,/assets\/media\//);
  assert.match(html,/disabled/);
  assert.doesNotMatch(ui.admin({authorized:false,items:[draft],enabled:true}),/content-editor-form/);
});
test('mobile native and custom media theme is scoped to same shared design stylesheet',()=>{
  const css=read('assets/unified-theme.css'),html=read('index.html');
  for(const key of ['.nh-carousel','.nh-hero-slide','.native-page-cover',
    '.content-admin-layout','.nh-feature-image','.catalog-product-image',
    '.brand-custom-image','.nav-custom-icon']){
    assert.ok(css.includes(key),key);
  }
  assert.match(css,/@media\(max-width:760px\)/);
  assert.ok(html.includes('src="./js/content-ui.js?v=20261114-content1"'));
  assert.ok(html.indexOf('content-ui.js')<html.indexOf('js/app.js'));
  assert.ok(html.includes('id="brand-mark"'));
});

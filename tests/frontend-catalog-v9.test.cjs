'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cms=read('js/content-ui.js'),app=read('js/app.js'),css=read('assets/catalog-campaign-v9.css');
const banner=p=>({kind:'HERO',placement:'catalog',title:'Banner Baru',
  description:'Solusi digital untuk usaha Anda.',image_path:'assets/media/ngd-catalog-v9-wide.webp',
  cta_label:'Lihat produk',cta_route:'katalog',sort_order:1,...p});
function ui(){const window={};const ctx=vm.createContext({window,URL});
  vm.runInContext(cms,ctx,{timeout:3000});return window.NGD_CONTENT_UI;}
test('catalog has a single branded fallback image without hardcoded discount or commission',()=>{
  const html=ui().catalogBanner([]);
  assert.match(html,/data-catalog-banner-source="default"/);
  assert.match(html,/ngd-catalog-v9-wide\.webp/);
  assert.match(html,/ngd-catalog-v9-mobile\.webp/);
  assert.match(html,/data-market-browse/);
  assert.equal((html.match(/class="ngd-catalog-campaign-slide"/g)||[]).length,1);
  assert.doesNotMatch(html,/50%|diskon|Rp99\.000|Tanya via WhatsApp/i);
});
test('admin HERO/catalog owns title, CTA, image, and carousel order without HTML injection',()=>{
  const content=ui(),evil='<img src=x onerror=alert(1)>';
  const html=content.catalogBanner([
    banner({title:evil,description:evil,cta_route:'javascript:alert(1)'}),
    banner({title:'Banner Dua',sort_order:2,cta_route:'jasa',
      image_path:'https://cdn.example.com/other.webp'})
  ]);
  assert.match(html,/data-catalog-banner-source="admin"/);
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img src=x onerror=/);
  assert.doesNotMatch(html,/data-route="javascript/);
  assert.match(html,/data-route="jasa"/);
  assert.match(html,/data-hero-index="1"/);
  assert.match(html,/data-hero-pause/);
  assert.equal((html.match(/data-hero-panel=/g)||[]).length,2);
  assert.doesNotMatch(html,/ngd-catalog-v9-mobile/);
});
test('Admin CMS has catalog status, CMS image references, source validation and draft first',()=>{
  const html=ui().admin({authorized:true,items:[banner({content_id:'CNT-CUSTOM',status:'PUBLISHED',image_path:'assets/media/custom-catalog.webp'})],enabled:true,products:[],
    defaultPlacement:'catalog'});
  assert.match(html,/data-content-create="catalog"/);
  assert.match(html,/data-content-asset="assets\/media\/custom-catalog.webp"/);
  assert.doesNotMatch(html,/data-content-asset="assets\/media\/ngd-catalog-v9-wide.webp"/);
  assert.match(html,/name="placement"/);
  assert.match(html,/id="content-placement"/);
  assert.match(html,/value="catalog" data-content-kind="HERO" selected/);
  assert.match(html,/ngd-cms-preview-desktop/);
  assert.match(html,/ngd-cms-preview-mobile/);
  assert.match(app,/old\.status==='PUBLISHED'/);
  assert.match(app,/updateContentPreview_\(\)/);
});
test('historical BANNER cannot be re-created but can be found for archival',()=>{
  const html=ui().admin({authorized:true,enabled:true,
    selectedId:'CNT-BANNER-01',items:[{
      kind:'BANNER',placement:'home',status:'PUBLISHED',content_id:'CNT-BANNER-01',
      title:'Promo Lama',image_path:'assets/media/ngd-v6-hero.webp',revision:'abc'
    }],products:[]});
  assert.match(html,/Konten lama tipe/);
});
test('both page entrypoints load the campaign CSS after all older marketing styles',()=>{
  for(const path of ['index.html','staging/member.html']){
    const html=read(path);
    assert.match(html,/catalog-campaign-v9\.css\?v=20261121-catalog-v9-2/);
    const idx=html.indexOf('catalog-campaign-v9.css');
    assert.ok(idx>html.indexOf('public-experience-v8.css'));
    assert.match(html,/content-ui\.js\?v=20261121-proportions-v13-1/);
  }
  assert.match(css,/\.ngd-catalog-campaign-copy/);
  assert.match(css,/@media\(max-width:700px\)/);
  for(const name of ['wide','mobile']){
    const b=fs.readFileSync(path.join(root,'assets/media/ngd-catalog-v9-'+name+'.webp'));
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.ok(b.length<120000);
  }
});

test('public page artwork remains contextual while quiet home does not repeat CMS hero art',()=>{
  assert.doesNotMatch(app.slice(app.indexOf('  // Public front door:'),app.indexOf('const offerCategories=')),/published\(state\.siteContent,'HERO','home'\)/);
  assert.match(app,/NGD_CMS_SURFACES\?\.affiliateInfo\(state\.siteContent\)/);
  assert.match(app,/function viewServiceRequests\(\)/);
  assert.match(app,/cmsPageArt_\('ai'\)/);
  assert.match(app,/function viewSupport\(\)/); // Help is text-first, no decorative cover dependency.
  assert.match(app,/function viewLearn\(\)/); // Member-only learning uses its own layout.
  assert.doesNotMatch(app,/by\('screen'\)\.innerHTML=\(!logged\(\)&&state\.route==='belajar'/);
  const css=read('assets/catalog-campaign-v9.css');
  assert.match(css,/\.ngd-cms-affiliate-art/);
  assert.match(css,/\.ngd-ai-hero-art/);
});

test('V13 public banner maintains proportional desktop layout and content-driven mobile art',()=>{
  const ui=read('assets/brand-experience-v10.css');
  const app=read('js/app.js');
  const content=read('js/content-ui.js');
  assert.match(ui,/\.ngd-catalog-campaign-slide\{[\s\S]*?min-height:clamp\(300px,28vw,410px\)/);
  assert.match(ui,/@media\(max-width:700px\)[\s\S]*?\.ngd-catalog-campaign-slide\{[\s\S]*?min-height:0!important/);
  assert.match(ui,/\.ngd-catalog-campaign-picture\{[\s\S]*?height:clamp\(145px,38vw,235px\)/);
  assert.match(ui,/\.ngd-catalog-campaign-picture img\{[\s\S]*?object-fit:contain!important/);
  assert.match(ui,/\.market-product-media\{[\s\S]*?aspect-ratio:6\/5/);
  assert.match(ui,/\.ngd-cms-preview-desktop \.ngd-cms-preview-image\{[\s\S]*?aspect-ratio:8\/3/);
  assert.match(ui,/\.ngd-cms-preview-mobile \.ngd-cms-preview-image\{[\s\S]*?aspect-ratio:4\/5/);
  assert.match(app,/NGD_PUBLIC_CMS\?\.home\(state\.siteContent,state\.publicSettings\)/);
  assert.match(content,/CMS saat ini menggunakan satu gambar per penempatan/);
});

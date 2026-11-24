/* Ngulik AI Studio P1. DOM-only simulation: never calls GAS, payment, or AI providers. */
(function(global){
'use strict';
const RATIOS={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080],'3:4':[1080,1440]};
const TIERS={hemat:2,standar:4,premium:6};
const V2_TIERS={standard:2,hd_commercial:3}; // legacy V2 only
const FOOD_MACHINES=Object.freeze([
 {id:'gemini_flash_image',name:'Hemat & Cepat',model:'Gemini 3.1 Flash Image',use:'Eksplorasi konsep kuliner',credits:2},
 {id:'flux_kontext_pro',name:'Presisi Label & Kemasan',model:'FLUX.1 Kontext Pro',use:'Rekomendasi · menjaga bentuk produk',credits:3},
 {id:'flux_2_pro',name:'Komersial Ultra HD',model:'FLUX.2 Pro',use:'Detail tekstur materi iklan utama',credits:4}
]);
const MOODS={terang:'Terang Bersih',hangat:'Hangat Kafe',kontras:'Kontras Promo',gelap:'Mewah Gelap'};
const TEMPLATES=[
{id:'katalog-minimalis',name:'Katalog Studio Minimalis',category:'Katalog Studio',ratio:'1:1',mood:'terang',tier:'hemat',layout:'catalog',product:'Jam Tangan Minimalis Series',headline:'Desain Presisi untuk Aktivitas Harian',promo:'Rp149.000',img:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1080&q=85'},
{id:'kuliner-hangat',name:'Kuliner Hangat & Menggoda',category:'Kuliner & F&B',ratio:'4:5',mood:'hangat',tier:'hemat',layout:'culinary',product:'Mie Kuah Kaldu Spesial',headline:'Hangat & Gurih, Bikin Nagih di Suapan Pertama',promo:'Rp22.000',img:'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1080&q=85'},
{id:'poster-flash-sale',name:'Poster Flash Sale Kontras',category:'Promo & Diskon',ratio:'4:5',mood:'kontras',tier:'standar',layout:'flashsale',product:'Soft Baked Choco Cookies',headline:'Promo Akhir Pekan Khusus Order Hari Ini',promo:'DISKON 30%',img:'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1080&q=85'},
{id:'skincare-podium',name:'Skincare Podium Elegan',category:'Beauty & Skincare',ratio:'4:5',mood:'terang',tier:'standar',layout:'skincare',product:'Botanical Glow Serum',headline:'Niacinamide & Ekstrak Alami untuk Kulit Cerah',promo:'Rp89.000',img:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1080&q=85'},
{id:'dark-luxury',name:'Dark Luxury Spotlight',category:'Katalog Studio',ratio:'1:1',mood:'gelap',tier:'standar',layout:'darkluxury',product:'Noir Extrait De Parfum',headline:'Aroma Kayu & Rempah yang Tahan Seharian',promo:'EDISI TERBATAS',img:'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1080&q=85'},
{id:'story-vertikal',name:'Story & Reels Promo Vertikal',category:'Story 9:16',ratio:'9:16',mood:'hangat',tier:'standar',layout:'story',product:'Es Kopi Susu Gula Aren',headline:'Ngopi Hemat Bareng Teman Kerja Hari Ini',promo:'BELI 2 Rp30.000',img:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1080&q=85'}
];

/* Public option IDs only. No master skill instructions, API keys, or network calls.
   This mapping is a future live-pipeline contract; SIMULATION stays default. */
const VISUAL_PRESET_IDS=Object.freeze({
  'katalog-minimalis':Object.freeze({template_id:'catalog_clean',category_id:'product'}),
  'kuliner-hangat':Object.freeze({template_id:'food_promo',category_id:'culinary'}),
  'poster-flash-sale':Object.freeze({template_id:'poster_promo',category_id:'promotion'}),
  'skincare-podium':Object.freeze({template_id:'skincare_podium',category_id:'product'}),
  'dark-luxury':Object.freeze({template_id:'dark_luxury',category_id:'product'}),
  'story-vertikal':Object.freeze({template_id:'story_vertical',category_id:'culinary'})
});
const VISUAL_MOOD_IDS=Object.freeze({
  terang:Object.freeze({mood_id:'clean_neutral',lighting_id:'softbox'}),
  hangat:Object.freeze({mood_id:'warm_appetite',lighting_id:'soft_window'}),
  kontras:Object.freeze({mood_id:'editorial',lighting_id:'daylight'}),
  gelap:Object.freeze({mood_id:'dramatic',lighting_id:'studio_rim'})
});
const VISUAL_QUALITY_IDS=Object.freeze({hemat:'economy',standar:'standard',premium:'premium'});
function buildVisualRequestDraft(){
  const preset=VISUAL_PRESET_IDS[state.template?.id];
  const mood=VISUAL_MOOD_IDS[state.mood];
  const quality=VISUAL_QUALITY_IDS[state.tier];
  if(!preset||!mood||!quality||!RATIOS[state.ratio])throw Error('VISUAL_OPTION_MAP_INVALID');
  // The current UI has no authenticated/private upload adapter.
  // NEVER turn a local data: URL or remote sample image into a trusted asset ID.
  const badge=String(state.promo||'');
  const priceMatch=/^Rp\s*([0-9][0-9.]*)$/i.exec(badge.trim());
  const price=priceMatch?Number(priceMatch[1].replace(/\./g,'')):null;
  return {
    mode:'CONTRACT_PREVIEW_ONLY',
    upload_required:true,
    payload:{
      template_id:preset.template_id,
      category_id:preset.category_id,
      mood_id:mood.mood_id,
      lighting_id:mood.lighting_id,
      ratio_id:state.ratio,
      quality_tier:quality,
      product_name:String(state.product||state.template.product||'').slice(0,100),
      promo_text:String(state.headline||'').slice(0,160),
      badge_text:priceMatch?'':badge.slice(0,60),
      price:Number.isSafeInteger(price)&&price>=0&&price<=100000000?price:null,
      cta:'Pesan Sekarang',
      reference_image:''
    }
  };
}

/* Public V2 identifiers and compatibility hints only; no private skill prompt text. */
const V2_OPTIONS=Object.freeze({
 product_category:[['food_culinary','Makanan & Kuliner'],['beverage_bottle','Minuman & Botol'],['skincare_cosmetic','Skincare & Kosmetik'],['fashion_craft','Fashion & Kerajinan'],['general_retail','Produk Kemasan']],
 visual_style:[['studio_clean','Studio Bersih'],['splash_levitation','Melayang & Splash'],['dark_mirror_splash','Dark Mirror'],['dark_action_drop','Dark Food Action'],['bright_lifestyle_table','Meja Lifestyle'],['moody_nature_wood','Alam & Kayu']],
 use_case:[['marketplace_main','Foto Utama Marketplace'],['social_feed','Feed Instagram / Facebook'],['story_reels_wa','Story, Reels & WA'],['promo_banner','Banner Promosi']],
 camera_angle:[['eye_level','Sejajar Produk'],['hero_45','Sudut Hero 45°'],['macro_closeup','Detail Macro'],['flatlay_top','Tampak Atas']],
 lighting_mood:[['soft_daylight','Cahaya Pagi'],['warm_appetizing','Hangat Natural'],['dramatic_rim','Rim Light Dramatis'],['crisp_commercial','Studio Tajam']],
 aspect_ratio:[['1:1','1:1'],['4:5','4:5'],['9:16','9:16'],['16:9','16:9']],
 quality_tier:[['standard','Standar'],['hd_commercial','HD Komersial']]
});
/* Deliberately conservative PUBLIC UI-only compatibility until versioned
   compatibility rules are supplied by an authorized backend registry. */
const V2_STYLE_ALLOWED=Object.freeze({
 studio_clean:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
 splash_levitation:['food_culinary','beverage_bottle','skincare_cosmetic','general_retail'],
 dark_mirror_splash:['beverage_bottle','skincare_cosmetic','general_retail'],
 dark_action_drop:['food_culinary'],
 bright_lifestyle_table:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
 moody_nature_wood:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail']
});
const V2_ANGLE_ALLOWED=Object.freeze({
 eye_level:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
 hero_45:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
 macro_closeup:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
 flatlay_top:['food_culinary','fashion_craft','general_retail']
});
function reconcileV2(){
 for(const [field,allowed] of [['visual_style',V2_STYLE_ALLOWED],['camera_angle',V2_ANGLE_ALLOWED]]){
  if(!allowed[state.v2[field]]?.includes(state.v2.product_category)){
   state.v2[field]=field==='visual_style'?'studio_clean':'hero_45';
  }
 }
 /* Marketplace image standard favors studio clarity, not visual gimmicks. */
 if(state.v2.use_case==='marketplace_main'&&state.v2.visual_style!=='studio_clean')
  state.v2.visual_style='studio_clean';
 if(state.v2.use_case==='story_reels_wa')state.v2.aspect_ratio='9:16';
 if(state.v2.use_case==='promo_banner'&&state.v2.aspect_ratio==='9:16')
  state.v2.aspect_ratio='16:9';
 state.ratio=state.v2.aspect_ratio;
 state.tier=state.v2.quality_tier==='hd_commercial'?'premium':'standar';
}
function optionAllowed(field,id){
 if(field==='visual_style'){
  if(state.v2.use_case==='marketplace_main'&&id!=='studio_clean')return false;
  return V2_STYLE_ALLOWED[id]?.includes(state.v2.product_category)===true;
 }
 if(field==='camera_angle')return V2_ANGLE_ALLOWED[id]?.includes(state.v2.product_category)===true;
 if(field==='aspect_ratio'&&state.v2.use_case==='story_reels_wa')return id==='9:16';
 return true;
}
function selectV2(field,id){
 if(!Object.prototype.hasOwnProperty.call(V2_OPTIONS,field))return false;
 if(!V2_OPTIONS[field].some(([value])=>value===id)||!optionAllowed(field,id))return false;
 state.v2[field]=id;
 reconcileV2();state.rendered=false;
 return true;
}
function buildImg2ImgV2Draft(){
 reconcileV2();
 return {
  mode:'CONTRACT_PREVIEW_ONLY',
  contract_version:'visual-img2img-v2',
  upload_required:true,
  image_source_selected:!!state.photo,
  reference_asset_pending_private_upload:true,
  /* No client-selected sample URL/data URI is a trusted backend media handle. */
  payload:{...state.v2,reference_image:'',request_id:'',
   overlay_enabled:state.overlay,
   product_name:state.overlay?String(state.product||'').slice(0,100):'',
   promo_text:state.overlay?String(state.headline||'').slice(0,160):'',
   badge_text:state.overlay?String(state.promo||'').slice(0,60):'',
   price:null,cta:state.overlay?'Pesan Sekarang':''}
 };
}
const SAMPLES=[
{name:'Kopi Susu',img:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1080&q=85',product:'Kopi Susu Gula Aren',headline:'Racikan Espresso Asli, Creamy Setiap Tegukan',promo:'Rp18.000'},
{name:'Kuliner Mie',img:'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1080&q=85',product:'Mie Kuah Kaldu Spesial',headline:'Kuah Gurih Hangat, Siap Antar Cepat',promo:'DISKON 20%'},
{name:'Serum Botol',img:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1080&q=85',product:'Botanical Glow Serum',headline:'Formula Ringan untuk Kulit Cerah Alami',promo:'Rp89.000'},
{name:'Kue & Snack',img:'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1080&q=85',product:'Soft Baked Choco Cookies',headline:'Renyah di Luar, Lumer Cokelat di Dalam',promo:'BELI 2 HEMAT 15%'}
];
const htmlEscape=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=(kind)=>{const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',edit:'<path d="m4 20 4-1 12-12-3-3L5 16l-1 4z"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5-9 11"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',compare:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',bolt:'<path d="m13 2-9 12h8l-1 8 9-12h-8z"/>',spark:'<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[kind]||paths.spark)+'</svg>'};
const state={view:'editor',cat:'Semua',filterRatio:'Semua',q:'',credits:25,history:[],template:TEMPLATES[0],photo:'',photoChosen:false,img:null,product:'',headline:'',promo:'',mood:'terang',ratio:'1:1',tier:'standar',overlay:false,compare:false,v2:{product_category:'general_retail',visual_style:'studio_clean',use_case:'marketplace_main',camera_angle:'hero_45',lighting_mood:'soft_daylight',aspect_ratio:'1:1',quality_tier:'standard'},renderNo:0,busy:false,rendered:false,loadedUrl:''};
let root=null,epoch=0;const adapter=Object.freeze({mode:'SIMULATION',reserve(cost){if(!Number.isInteger(cost)||cost<1||state.credits<cost)return {ok:false,reason:'INSUFFICIENT_SIM_CREDITS'};return {ok:true,reservation:{cost,id:'SIM-'+(state.renderNo+1)}}},settle(r){state.credits-=r.cost;return {ok:true}},release(){return {ok:true}}});
function getCost(){return foodMode?selectedMachine().credits*food.count:TIERS[state.tier]||4}
function selectedMachine(){return FOOD_MACHINES.find(m=>m.id===foodMachine)||FOOD_MACHINES[1]}
function active(){return !!(root&&root.isConnected)}
function node(id){return root&&root.querySelector('#'+id)}
function announce(message){const n=node('ns-toast');if(n){n.textContent=message;n.hidden=false;clearTimeout(announce.timer);announce.timer=setTimeout(()=>{if(n)n.hidden=true},3800)}}
function tabbar(){return '<div class="ns-tabs" role="tablist" aria-label="Navigasi Studio">'+[['editor','Buat Foto', 'edit'],['gallery','Inspirasi', 'grid'],['history','Riwayat','history']].map(([id,label,ic])=>'<button type="button" role="tab" data-view="'+id+'" aria-selected="'+(state.view===id)+'">'+ico(ic)+' '+label+(id==='history'&&state.history.length?' ('+state.history.length+')':'')+'</button>').join('')+'</div>'}
function shell(){if(!active())return;root.innerHTML='<header class="ns-head"><div class="ns-brand"><span class="ns-logo">'+ico('image')+'</span><span>NGULIK STUDIO</span><span class="ns-sim">SIMULASI</span></div>'+tabbar()+'<span class="ns-credit">'+ico('bolt')+' <span id="ns-balance">'+state.credits+' Cr</span></span></header><div class="ns-tab-mobile">'+tabbar()+'</div><div id="ns-toast" class="ns-toast" role="status" hidden></div><div id="ns-content"></div>';content()}
function content(){const host=node('ns-content');if(!host)return;host.innerHTML=state.view==='gallery'?gallery():state.view==='editor'?editor():historyView();if(state.view==='editor'){draw();if(state.photo)loadImg(state.photo);}}
function gallery(){
 const query=templateQuery.trim().toLocaleLowerCase('id-ID');
 const cats=templateCategoryChoices();
 const scenes=scenarioTemplates().filter(t=>
  (templateFilter==='Semua'||templateFilter===t.category)&&
  (!query||[t.name,t.description,CONTEXT_SCENARIOS[t.category].label]
   .some(v=>v.toLocaleLowerCase('id-ID').includes(query))));
 const saved=customTemplates.filter(t=>
  (templateFilter==='Semua'||templateFilter==='saved'||templateFilter===t.product_category)&&
  (!query||[t.name,CONTEXT_SCENARIOS[t.product_category].label]
   .some(v=>v.toLocaleLowerCase('id-ID').includes(query))));
 const showScene=templateFilter!=='saved'&&templateFilter!=='classic';
 const showSaved=templateFilter==='saved'||templateFilter==='Semua';
 const legacy=TEMPLATES.filter(t=>
  (templateFilter==='Semua'||templateFilter==='classic')&&
  (!query||[t.name,t.category,t.product].some(v=>v.toLocaleLowerCase('id-ID').includes(query))));
 const card=t=>{
  const expanded=templateDetail===t.id;
  return '<article class="ns-inspire-card" data-scene-card="'+t.id+'">'+
   '<div class="ns-inspire-visual"><img src="'+htmlEscape(t.image)+'" alt="Contoh suasana '+htmlEscape(t.name)+'" loading="lazy">'+
   '<span class="ns-inspire-ratio">'+t.ratio+'</span>'+
   '<span class="ns-inspire-caption">Referensi suasana · bukan hasil AI Anda</span></div>'+
   '<div class="ns-inspire-body"><small>'+htmlEscape(CONTEXT_SCENARIOS[t.category].label)+'</small>'+
   '<strong>'+htmlEscape(t.name)+'</strong>'+
   '<p>'+htmlEscape(t.description)+'</p>'+
   (expanded?'<div class="ns-inspire-detail"><strong>Resep yang diterapkan</strong><span>Scene '+htmlEscape(t.scenario)+' · Pemulihan foto HP aktif · Label asli dijaga · Rasio dapat diubah · Foto asli Anda wajib diunggah.</span></div>':'')+
   '<div class="ns-inspire-actions"><button type="button" data-scene-template="'+t.id+'" class="ns-cta ns-dark">'+ico('edit')+' Gunakan</button>'+
   '<button type="button" data-template-detail="'+t.id+'" class="ns-cta" aria-expanded="'+expanded+'">'+(expanded?'Tutup':'Detail')+'</button></div>'+
   '</div></article>';
 };
 const own=t=>{
  return '<article class="ns-inspire-saved"><span class="ns-inspire-saved-icon">'+ico('grid')+'</span>'+
   '<div class="ns-inspire-saved-copy"><strong>'+htmlEscape(t.name)+'</strong>'+
   '<small>'+htmlEscape(CONTEXT_SCENARIOS[t.product_category].label)+' · '+t.format+' · '+t.count+' hasil</small>'+
   '<div class="ns-inspire-actions"><button type="button" class="ns-cta ns-dark" data-saved-template="'+t.id+'">Gunakan</button>'+
   '<button type="button" class="ns-cta" data-saved-delete="'+t.id+'">Hapus</button></div></div></article>';
 };
 return '<section class="ns-pane ns-inspire-gallery"><div class="ns-inspire-intro">'+
  '<span class="ns-inspire-eyebrow">PUSTAKA STUDIO</span><h2>Temukan gaya. Gunakan untuk produk Anda.</h2>'+
  '<p>Pilih skenario yang cocok, ganti foto dengan produk asli, lalu sesuaikan. Template menyimpan komposisi dan resep—bukan foto contoh, teks merek lain, atau biaya API.</p>'+
  '</div><div class="ns-inspire-toolbar"><div class="ns-inspire-filters" role="group" aria-label="Filter peruntukan">'+
  cats.map(([id,label])=>'<button type="button" class="ns-chip" data-template-filter="'+id+'" aria-pressed="'+(templateFilter===id)+'">'+htmlEscape(label)+'</button>').join('')+
  '</div><label class="ns-inspire-search">'+ico('grid')+
  '<input id="ns-template-query" type="search" class="ns-control" placeholder="Cari gaya studio..." aria-label="Cari template" value="'+htmlEscape(templateQuery)+'"></label></div>'+
  (showSaved?'<div class="ns-sectiontitle"><h2>Preset Saya</h2><span class="ns-pill">'+saved.length+' tersimpan</span></div>'+
   (saved.length?'<div class="ns-inspire-saved-list">'+saved.map(own).join('')+'</div>':
   '<p class="ns-inspire-empty">Belum ada preset. Buka template, sesuaikan, lalu pilih Simpan Preset. Pengaturan tetap tersedia pada perangkat ini.</p>'):'')+
  (showScene?'<div class="ns-sectiontitle"><h2>Inspirasi fotografi produk</h2><span class="ns-pill">'+scenes.length+' skenario</span></div>'+
   (scenes.length?'<div class="ns-inspire-grid">'+scenes.map(card).join('')+'</div>':
   '<p class="ns-inspire-empty">Tidak ada skenario yang cocok. Coba kategori atau pencarian lain.</p>'):'')+
  (legacy.length?'<div class="ns-sectiontitle"><h2>Desain Cepat · Canvas</h2><span class="ns-pill">'+legacy.length+' desain</span></div>'+
   '<p class="ns-hint">Template Canvas klasik dapat diedit dan dipratinjau tanpa AI.</p>'+
   '<div class="ns-grid">'+legacy.map(t=>'<button type="button" class="ns-template ns-frame" data-template="'+t.id+'">'+
    '<div class="ns-preview"><img src="'+t.img+'" alt="Referensi '+htmlEscape(t.name)+'" loading="lazy"><span>'+t.ratio+'</span></div>'+
    '<div class="ns-copy"><span><strong>'+htmlEscape(t.name)+'</strong><small>'+htmlEscape(t.category)+'</small></span><span class="ns-pill">Gunakan</span></div></button>').join('')+'</div>':'')+
  '</section>';
}
function choices(items,current,attr,columns){return '<div class="'+(columns===3?'ns-three':'ns-two')+'">'+items.map(([value,title])=>'<button type="button" class="ns-choice" data-'+attr+'="'+htmlEscape(value)+'" aria-pressed="'+(value===current)+'">'+htmlEscape(title)+'</button>').join('')+'</div>'}

function v2Choices(field){
 const items=V2_OPTIONS[field];
 return '<div class="ns-v2-choice-grid" role="group" aria-label="'+htmlEscape(field)+'">'+items.map(([id,title])=>{
 const ok=optionAllowed(field,id);
 return '<button type="button" class="ns-v2-choice" data-v2-field="'+field+'" data-v2-value="'+id+'" aria-pressed="'+(state.v2[field]===id)+'" '+(ok?'':'disabled aria-disabled="true" title="Tidak cocok dengan pilihan sebelumnya"')+'>'+htmlEscape(title)+'</button>';
 }).join('')+'</div>';
}
function v2Field(field,label,description){
 return '<div class="ns-v2-field"><div class="ns-v2-field-header"><strong>'+htmlEscape(label)+'</strong><small>'+htmlEscape(description)+'</small></div>'+v2Choices(field)+'</div>';
}

const FOOD_GROUPS=Object.freeze({
 food_type:[['soup','Berkuah · bakso/soto'],['rice','Nasi & lauk'],['bakery','Kue & roti'],['snack','Gorengan & camilan'],['drink','Minuman'],['dessert','Dessert']],
 cover_concept:[['classic','Kuliner Klasik'],['minimal','Editorial Minimalis'],['hero','Hero Close-up'],['flatlay','Meja Penuh · Flat lay'],['dramatic','Gelap Dramatis'],['bright','Segar Cerah'],['warung','Warung Nusantara Modern'],['fine_dining','Premium Fine Dining']],
 camera_angle:[['top90','Atas 90°'],['angle45','45°'],['eye','Sejajar mata'],['macro','Macro'],['diagonal','Diagonal berkedalaman'],['low','Rendah · megah']],
 lighting:[['window','Jendela lembut'],['golden','Golden hour'],['side','Samping dramatis'],['softbox','Softbox studio'],['backlight','Backlight · uap'],['candle','Lilin hangat']],
 surface:[['dark_wood','Kayu gelap'],['white_marble','Marmer putih'],['concrete','Beton'],['bamboo','Anyaman/daun pisang'],['linen','Kain linen'],['plain_white','Polos putih terang']],
 grade:[['warm','Hangat'],['cool','Dingin'],['earthy','Earthy'],['vivid','Vivid pop'],['matte','Matte lembut'],['brand','Warna brand (hex)']],
 styling:[['minimal','Minimal'],['ingredients','Rempah & bahan segar'],['steam','Uap/asap'],['sauce','Tetesan saus'],['sprinkle','Taburan'],['hand','Tangan memegang']],
 lens:[['mm35','35 mm · luas'],['mm50','50 mm · natural'],['mm85','85 mm · bokeh'],['macro100','100 mm · macro']],
 format:[['4:5','4:5 · feed'],['1:1','1:1 · persegi'],['9:16','9:16 · story'],['3:4','3:4 · cover majalah']],
 similarity:[['exact','Persis seperti asli'],['enhanced','Boleh dipercantik']],
 count:[[1,'1 hasil'],[2,'2 hasil'],[4,'4 hasil']]
});

const CONTEXT_SCENARIOS=Object.freeze({
 hot_soupy_food:{label:'Makanan Berkuah & Panas',options:[['steam_broth_hero','Steam & Broth Hero'],['warung_nusantara_modern','Warung Nusantara Modern'],['editorial_dark_bowl','Editorial Dark Bowl']]},
 bottled_liquid:{label:'Minuman, Madu & Botol/Jar',options:[['liquid_vortex_splash','360° Liquid Vortex Splash'],['obsidian_mirror_splash','Obsidian Mirror Crown Splash'],['chilled_condensation_studio','Chilled Condensation Studio']]},
 bakery_snack:{label:'Roti, Kue & Camilan',options:[['high_speed_topping_rain','High-Speed Topping Rain'],['macro_crumb_texture','Macro Crumb Texture (100mm)'],['sunlit_cafe_marble','Sunlit Café Marble']]},
 packaging_cosmetic:{label:'Kemasan, Herbal & Skincare',options:[['clean_marketplace_cyclorama','Clean Marketplace Cyclorama'],['podium_light_caustics','Podium & Light Caustics'],['volumetric_forest_pedestal','Volumetric Forest Pedestal']]}
});
let contextCategory='hot_soupy_food',contextScenario='steam_broth_hero',restorationMode='full_phone_restoration';
function contextOptions(){return CONTEXT_SCENARIOS[contextCategory].options}
function contextSelectCategory(id){
 if(!Object.prototype.hasOwnProperty.call(CONTEXT_SCENARIOS,id))return false;
 contextCategory=id;contextScenario=contextOptions()[0][0];
 food.food_type=id==='hot_soupy_food'?'soup':id==='bottled_liquid'?'drink':
  id==='bakery_snack'?'bakery':'drink';
 // Reset optional legacy fields to neutral settings. Studio physics always
 // overrides advanced generic suggestions in the backend compiler.
 food.cover_concept='minimal';food.camera_angle='angle45';
 food.lighting='softbox';food.surface='concrete';food.grade='warm';
 food.styling='minimal';food.lens='mm85';resetVisualLiveRequest();rememberWorkspace();return true;
}
function contextSelectScenario(id){
 if(!contextOptions().some(item=>item[0]===id))return false;
 contextScenario=id;resetVisualLiveRequest();rememberWorkspace();return true;
}
function contextSelectRestoration(id){
 if(!['full_phone_restoration','preserve_source'].includes(id))return false;
 restorationMode=id;resetVisualLiveRequest();rememberWorkspace();return true;
}
/* Templates are editable recipe configurations, never copied product images.
 * The six legacy Canvas templates remain available as separate quick designs.
 * No template may contain an API key, arbitrary prompt or a user's photo. */
const SCENE_VISUALS=Object.freeze({
 hot_soupy_food:'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1080&q=85',
 bottled_liquid:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1080&q=85',
 bakery_snack:'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1080&q=85',
 packaging_cosmetic:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1080&q=85'
});
const SCENE_DESCRIPTIONS=Object.freeze({
 steam_broth_hero:'Uap rim-light 135° dan kilau kuah alami',
 warung_nusantara_modern:'Jendela hangat, tekstur kaldu, nuansa warung',
 editorial_dark_bowl:'Mangkuk dramatis, strip light dan kontras terarah',
 liquid_vortex_splash:'Cairan beku 1/4000s di belakang botol',
 obsidian_mirror_splash:'Crown splash emas dan refleksi akrilik hitam',
 chilled_condensation_studio:'Embun dingin, sorotan kontainer transparan',
 high_speed_topping_rain:'Taburan vertikal beku, detail remah',
 macro_crumb_texture:'Makro 100mm, detail lembut dan renyah',
 sunlit_cafe_marble:'Cahaya jendela hangat dan marmer kafe',
 clean_marketplace_cyclorama:'Latar putih, kemasan lurus, label utuh',
 podium_light_caustics:'Podium mineral dan caustics terkontrol',
 volumetric_forest_pedestal:'Podium batu, sinar volumetrik halus'
});
const LOCAL_TEMPLATE_KEY='ngd_visual_member_templates_v1';
const WORKSPACE_KEY='ngd_visual_editor_workspace_v1';
const CONTEXT_RATIOS=['4:5','1:1','9:16','3:4'];
let templateFilter='Semua',templateQuery='',templateDetail='',templateStorage=null;
let customTemplates=[],selectedSavedId='',presetName='',templateNotice='',memberScope='';
function configureMemberScope(id){
 const safe=typeof id==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(id)?id:'';
 if(memberScope===safe)return;
 memberScope=safe;selectedSavedId='';presetName='';templateStorage=null;
 // Never carry photo bytes, generated assets, private job handles, or drafts
 // from a previous account into the next member's studio session.
 state.photo='';state.photoChosen=false;state.img=null;state.loadedUrl='';
 state.history=[];state.rendered=false;selectedLocalFile=null;
 livePolling=false;resetVisualLiveRequest();
 foodQuality={status:'not_checked',message:'Pilih foto baru dari HP untuk memulai.'};
 customTemplates=readSavedTemplates();
}
function scopedKey(key){return memberScope?key+':'+memberScope:null;}
function safeStorageGet(key){
 try{const scoped=scopedKey(key);return scoped?global.localStorage?.getItem(scoped)||'':''}catch(_){return ''}
}
function safeStorageSet(key,value){
 try{const scoped=scopedKey(key);if(!scoped||!global.localStorage)return false;
  global.localStorage.setItem(scoped,value);return true}catch(_){return false}
}
function templateCategoryChoices(){
 return [['Semua','Semua'],...Object.entries(CONTEXT_SCENARIOS).map(([id,v])=>[id,v.label]),['saved','Preset Saya'],['classic','Desain Cepat']];
}
function scenarioTemplates(){
 return Object.entries(CONTEXT_SCENARIOS).flatMap(([category,group])=>
  group.options.map(([scenario,title])=>({
   id:'scene__'+category+'__'+scenario,category,scenario,
   name:title,description:SCENE_DESCRIPTIONS[scenario],
   image:SCENE_VISUALS[category],ratio:'4:5'
  })));
}
function scrubPreset(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const category=String(value.product_category||'');
 if(!Object.prototype.hasOwnProperty.call(CONTEXT_SCENARIOS,category))return null;
 const scenario=String(value.studio_scenario||'');
 if(!CONTEXT_SCENARIOS[category].options.some(([id])=>id===scenario))return null;
 const machine=String(value.machine_id||'');
 if(!FOOD_MACHINES.some(v=>v.id===machine))return null;
 if(!CONTEXT_RATIOS.includes(value.format)||![1,2,4].includes(value.count))return null;
 if(!['full_phone_restoration','preserve_source'].includes(value.restoration_mode))return null;
 const text=(v,max)=>String(v||'').slice(0,max).replace(/[<>]/g,'').trim();
 const id=String(value.id||'');
 if(id&&!/^vt_[A-Za-z0-9_-]{12,50}$/.test(id))return null;
 return {id,name:text(value.name,56),product_category:category,studio_scenario:scenario,
  restoration_mode:value.restoration_mode,format:value.format,machine_id:machine,count:value.count,
  overlay_enabled:value.overlay_enabled===true,
  brand_name:text(value.brand_name,70),headline:text(value.headline,100),
  tagline:text(value.tagline,100),price_label:text(value.price_label,30),
  brand_hex:/^#[a-fA-F0-9]{6}$/.test(value.brand_hex||'')?value.brand_hex:''};
}
function readSavedTemplates(){
 try{
  const saved=JSON.parse(safeStorageGet(LOCAL_TEMPLATE_KEY)||'[]');
  return Array.isArray(saved)?saved.slice(0,20).map(scrubPreset).filter(x=>x&&x.name.length>=3):[];
 }catch(_){return []}
}
function rememberWorkspace(){
 const snapshot={category:contextCategory,scenario:contextScenario,
  restoration:restorationMode,machine:foodMachine,ratio:food.format,count:food.count,
  overlay:state.overlay};
 safeStorageSet(WORKSPACE_KEY,JSON.stringify(snapshot));
}
function restoreWorkspace(){
 try{
  const d=JSON.parse(safeStorageGet(WORKSPACE_KEY)||'null');
  if(!d||typeof d!=='object')return;
  if(!contextSelectCategory(d.category))return;
  if(d.scenario)contextSelectScenario(d.scenario);
  if(d.restoration)contextSelectRestoration(d.restoration);
  if(d.machine)chooseMachine(d.machine);
  if(CONTEXT_RATIOS.includes(d.ratio))food.format=d.ratio;
  if([1,2,4].includes(d.count))food.count=d.count;
  state.overlay=d.overlay===true;
 }catch(_){}
}
function currentPreset(){
 return scrubPreset({id:selectedSavedId||undefined,name:presetName||
  CONTEXT_SCENARIOS[contextCategory].options.find(([id])=>id===contextScenario)?.[1]||'Preset Studio',
  product_category:contextCategory,studio_scenario:contextScenario,
  restoration_mode:restorationMode,format:food.format,machine_id:foodMachine,
  count:food.count,overlay_enabled:state.overlay,
  brand_name:state.overlay?state.product:'',headline:state.overlay?state.headline:'',
  tagline:state.overlay?state.promo:'',price_label:state.overlay?foodPrice:'',
  brand_hex:foodHex});
}
function applyPreset(saved){
 const p=scrubPreset(saved);if(!p)return false;
 contextSelectCategory(p.product_category);
 contextSelectScenario(p.studio_scenario);
 contextSelectRestoration(p.restoration_mode);
 chooseMachine(p.machine_id);food.format=p.format;food.count=p.count;
 state.ratio=p.format;state.overlay=p.overlay_enabled;
 state.product=p.brand_name;state.headline=p.headline;state.promo=p.tagline;
 foodPrice=p.price_label;foodHex=p.brand_hex||foodHex;
 selectedSavedId=p.id||'';presetName=p.name;foodMode=true;
 state.view='editor';state.rendered=false;
 // A sample thumbnail is NEVER a product reference. Keep a genuine
 // local user-selected photo, or demand a fresh private upload.
 if(!selectedLocalFile){state.photo='';state.img=null;state.loadedUrl='';state.photoChosen=false;
  foodQuality={status:'not_checked',message:'Unggah foto asli Anda untuk memakai template.'};}
 rememberWorkspace();if(active())shell();return true;
}
function useScenarioTemplate(id){
 const match=scenarioTemplates().find(t=>t.id===id);
 if(!match)return false;
 const name=match.name;
 const applied=applyPreset({name,product_category:match.category,studio_scenario:match.scenario,
  restoration_mode:'full_phone_restoration',format:match.ratio,
  machine_id:'flux_kontext_pro',count:1,overlay_enabled:false});
 if(applied){selectedSavedId='';presetName=name;}
 return applied;
}
function localSavePreset(){
 const draft=currentPreset();if(!draft||draft.name.length<3)return null;
 const items=readSavedTemplates();
 let id=draft.id;
 if(id&&!items.some(t=>t.id===id))id='';
 if(!id){
  if(items.length>=20)return null;
  id='vt_local_'+(global.crypto?.randomUUID?.().replace(/-/g,'')||
   (Math.random().toString(36).slice(2)+Date.now().toString(36)));
 }
 const saved={...draft,id};customTemplates=[saved,...items.filter(x=>x.id!==id)].slice(0,20);
 if(!safeStorageSet(LOCAL_TEMPLATE_KEY,JSON.stringify(customTemplates)))return null;
 selectedSavedId=id;return saved;
}
async function saveCurrentPreset(){
 if(!foodMode||!memberScope)return;
 const ownerAtStart=memberScope;
 const local=localSavePreset();
 if(!local){announce('Tidak dapat menyimpan preset. Maksimal 20 preset atau penyimpanan browser tidak tersedia.');return;}
 templateNotice='Disimpan di perangkat ini';
 if(templateStorage&&typeof templateStorage.save==='function'){
  try{
   const remote=await templateStorage.save({...local,id:local.id.startsWith('vt_local_')?undefined:local.id});
   if(ownerAtStart!==memberScope)return;
   if(remote?.id){
    selectedSavedId=remote.id;
    const cleaned=scrubPreset(remote);
    if(cleaned){
     customTemplates=[cleaned,...customTemplates.filter(x=>x.id!==local.id&&x.id!==cleaned.id)];
     safeStorageSet(LOCAL_TEMPLATE_KEY,JSON.stringify(customTemplates));
    }
    templateNotice='Tersimpan di akun STAGING dan perangkat ini';
   }
  }catch(_){templateNotice='Tersimpan di perangkat ini (sinkronisasi belum tersedia)';}
 }
 announce(templateNotice);if(active())content();
}
async function removeSavedPreset(id){
 const ownerAtStart=memberScope;
 if(!/^vt_[A-Za-z0-9_-]{12,50}$/.test(id))return;
 const found=customTemplates.find(x=>x.id===id);if(!found)return;
 if(templateStorage&&typeof templateStorage.remove==='function'&&!id.startsWith('vt_local_')){
  try{await templateStorage.remove(id);if(ownerAtStart!==memberScope)return;}
  catch(_){announce('Penghapusan akun gagal. Coba lagi.');return;}
 }
 customTemplates=customTemplates.filter(x=>x.id!==id);
 safeStorageSet(LOCAL_TEMPLATE_KEY,JSON.stringify(customTemplates));
 if(selectedSavedId===id)selectedSavedId='';
 if(active())content();
}
async function configureTemplateStorage(adapter){
 if(adapter!==null&&(!adapter||['list','save','remove'].some(k=>typeof adapter[k]!=='function')))
  throw Error('VISUAL_TEMPLATE_STORAGE_INVALID');
 templateStorage=adapter;
 const ownerAtStart=memberScope;
 if(!adapter||!ownerAtStart)return;
 try{
  const remote=await adapter.list();
  if(!Array.isArray(remote))return;
  if(ownerAtStart!==memberScope||templateStorage!==adapter)return;
  const cleaned=remote.slice(0,20).map(scrubPreset).filter(Boolean);
  const local=readSavedTemplates().filter(p=>p.id.startsWith('vt_local_'));
  customTemplates=[...cleaned,...local].slice(0,20);
  safeStorageSet(LOCAL_TEMPLATE_KEY,JSON.stringify(customTemplates));
  if(active()&&state.view==='gallery')content();
 }catch(_){/* Retain local presets without disclosing auth/session errors. */}
}

const FOOD_LABELS={food_type:'01 Jenis makanan',cover_concept:'02 Konsep cover',camera_angle:'03 Sudut kamera',lighting:'04 Lighting',surface:'05 Permukaan/latar',grade:'06 Warna',styling:'07 Styling/properti',lens:'08 Lensa',format:'09 Format',similarity:'11 Tingkat kemiripan',count:'12 Jumlah hasil'};
const FOOD_PRESETS={
 classic:{lighting:'golden',surface:'dark_wood',grade:'warm'},
 minimal:{lighting:'softbox',surface:'white_marble',grade:'matte'},
 hero:{lighting:'side',surface:'concrete',grade:'vivid'},
 flatlay:{lighting:'window',surface:'linen',grade:'earthy'},
 dramatic:{lighting:'side',surface:'dark_wood',grade:'earthy'},
 bright:{lighting:'window',surface:'white_marble',grade:'vivid'},
 warung:{lighting:'window',surface:'bamboo',grade:'warm'},
 fine_dining:{lighting:'softbox',surface:'concrete',grade:'cool'}
};
const FOOD_DEFAULT=Object.freeze({food_type:'soup',cover_concept:'warung',camera_angle:'angle45',lighting:'window',surface:'bamboo',grade:'warm',styling:'minimal',lens:'mm50',format:'4:5',similarity:'exact',count:1});
let foodMachine='flux_kontext_pro',liveQuote=null,liveStatus='';
let foodMode=false,food={...FOOD_DEFAULT},foodHex='#B9481B',foodNotes='',foodPrice='',foodQuality={status:'not_checked',message:'Pilih foto untuk memeriksa kualitas dasar.'};
function foodCompatible(v){
 return !(v.cover_concept==='dramatic'&&v.surface==='plain_white')&&
 !(v.cover_concept==='bright'&&v.lighting==='candle')&&
 !(v.camera_angle==='top90'&&v.styling==='steam');
}
function chooseFood(field,value){
 if(!Object.prototype.hasOwnProperty.call(FOOD_GROUPS,field)||!FOOD_GROUPS[field].some(x=>x[0]===value))return false;
 const next={...food,[field]:value};
 if(field==='cover_concept')Object.assign(next,FOOD_PRESETS[value]);
 if(!foodCompatible(next))return false;
 food=next;resetVisualLiveRequest();rememberWorkspace();
 if(field==='format'){state.ratio=food.format;}
 state.rendered=false;
 return true;
}

/* Explicitly wired only by a later authorized private API bridge. No public
 * GitHub Pages secret, request, payment or provider endpoint is configured. */
let visualPipelineBridge=null,selectedLocalFile=null,liveRequestKey='',liveJobId='',liveInputAsset='',livePolling=false;
function liveBridgeReady(){
 return !!(visualPipelineBridge&&visualPipelineBridge.enabled===true&&
  ['upload','create','poll','quote','result'].every(k=>typeof visualPipelineBridge[k]==='function'));
}
function resetVisualLiveRequest(){liveRequestKey='';liveJobId='';liveInputAsset='';liveQuote=null;liveStatus='';}
function chooseMachine(id){if(!FOOD_MACHINES.some(m=>m.id===id)||
 (liveBridgeReady()&&Array.isArray(visualPipelineBridge.allowedMachines)&&
 !visualPipelineBridge.allowedMachines.includes(id)))return false;
 foodMachine=id;resetVisualLiveRequest();rememberWorkspace();return true}
async function runVisualLive(){
 if(!foodMode||!liveBridgeReady()||livePolling||!selectedLocalFile){
  announce('AI nyata belum aktif. Pilih foto lokal dan tunggu aktivasi layanan.');return;
 }
 if(foodQuality.status!=='pass'){announce('Foto belum lolos pemeriksaan kualitas.');return;}
 const button=node('ns-food-live-generate');
 if(button)button.disabled=true;
 livePolling=true;
 const token=epoch;
 try{
  if(!liveRequestKey){
   if(!global.crypto?.randomUUID)throw Error('Browser tidak mendukung ID aman');
   liveRequestKey=global.crypto.randomUUID().replace(/-/g,'');
  }
  if(!liveJobId){
   const q=await visualPipelineBridge.quote({machine_id:foodMachine,count:food.count});
   if(!q||q.machine_id!==foodMachine||q.count!==food.count||
    !Number.isSafeInteger(q.unit_credits)||q.unit_credits<1||
    !Number.isSafeInteger(q.total_credits)||q.total_credits!==q.unit_credits*q.count||
    q.server_authoritative!==true)throw Error('VISUAL_QUOTE_UNAVAILABLE');
   liveQuote=q;liveStatus='Tarif terkonfirmasi server. Mengunggah foto privat…';
   updateLiveStatus();
   if(!liveInputAsset){
    const handle=await visualPipelineBridge.upload(selectedLocalFile,{idempotency_key:liveRequestKey});
    if(!handle||!/^asset_[A-Za-z0-9_-]{6,110}$/.test(handle.asset_id))
     throw Error('Upload privat tidak dikonfirmasi');
    liveInputAsset=handle.asset_id;
   }
   const request=foodDraft();
   request.payload.reference_image=liveInputAsset;
   request.payload.request_id=liveRequestKey;
   const created=await visualPipelineBridge.create({
    idempotency_key:liveRequestKey,machine_id:foodMachine,payload:request.payload
   });
   if(!created||!/^[A-Za-z0-9_-]{16,80}$/.test(created.job_id))
    throw Error('Antrean tidak memberi ID job yang sah');
   liveJobId=created.job_id;
  }
  for(let i=0;i<60;i++){
   if(!active()||token!==epoch)break;
   const status=await visualPipelineBridge.poll(liveJobId);
   liveStatus='Proses: '+String(status?.status||'MEMERIKSA').replace(/_/g,' ')+
    ' · '+(Number.isInteger(status?.succeeded_count)?status.succeeded_count:0)+
    ' dari '+food.count+' gambar';
   updateLiveStatus();
   if(!status||status.job_id!==liveJobId)throw Error('Respons job tidak sah');
   if(status.status==='SETTLED'){
    const assets=Array.isArray(status.result_asset_ids)?status.result_asset_ids:[];
    if(assets.length){
     const picture=await visualPipelineBridge.result(liveJobId,assets[0]);
     if(!picture||!['image/png','image/jpeg','image/webp'].includes(picture.mime)||
      typeof picture.base64!=='string'||picture.base64.length<24)
      throw Error('PRIVATE_RESULT_INVALID');
     const source='data:'+picture.mime+';base64,'+picture.base64;
     state.history.unshift({image:source,product:state.product||'Hasil AI',ratio:food.format,cost:status.settled_credits/assets.length,realAI:true});
     state.photo=source;state.photoChosen=true;selectedLocalFile=null;
     state.img=null;state.loadedUrl='';state.ratio=food.format;
     if(state.history.length>8)state.history.length=8;
     content();
    }
    liveStatus='Selesai: '+status.settled_credits+' kredit dipakai, '+status.refunded_credits+' dikembalikan.';
    updateLiveStatus();
    announce(liveStatus);resetVisualLiveRequest();return;
   }
   if(['REFUNDED','FAILED'].includes(status.status)){
    announce('Provider gagal; reservasi kredit dikembalikan. Coba lagi setelah layanan pulih.');
    resetVisualLiveRequest();return;
   }
   if(['CREATED','RESERVED','PROCESSING','SUCCEEDED'].indexOf(status.status)<0)
    throw Error('Status antrean tidak dikenal');
   await new Promise(resolve=>setTimeout(resolve,3000));
  }
  announce('Job masih diproses. Cek status dari akun sebelum mengirim permintaan baru.');
 }catch(err){
  const reason=String(err?.code||'');
  liveStatus='Layanan AI belum tersedia atau job perlu dicek ulang.';updateLiveStatus();
  announce(['UPSTREAM_BUSY','UPSTREAM_RATE_LIMITED','UPSTREAM_UNAVAILABLE'].includes(reason)?
   'Provider AI sedang sibuk. Permintaan belum dapat diselesaikan; cek status job sebelum mencoba ulang.':
   'Layanan AI belum tersedia atau akses belum diaktifkan. Tidak ada pembayaran nyata yang diproses.');
 }finally{
  livePolling=false;
  const current=node('ns-food-live-generate');if(current)current.disabled=false;
 }
}
function configureVisualPipeline(bridge){
 if(bridge!==null&&(!bridge||bridge.enabled!==true||
  ['upload','create','poll','quote','result'].some(k=>typeof bridge[k]!=='function')))
  throw Error('VISUAL_PRIVATE_BRIDGE_INVALID');
 if(bridge&&Array.isArray(bridge.allowedMachines)){
  const allowed=bridge.allowedMachines;
  if(!allowed.length||allowed.some(id=>!FOOD_MACHINES.some(m=>m.id===id)))
   throw Error('VISUAL_MACHINE_ALLOWLIST_INVALID');
  if(!allowed.includes(foodMachine))foodMachine=allowed[0];
 }
 visualPipelineBridge=bridge;resetVisualLiveRequest();
 if(active()&&state.view==='editor')content();
}
function updateLiveStatus(){const el=node('ns-food-job-progress');if(el)el.textContent=liveStatus}
function foodDraft(){
 return {mode:'CONTRACT_PREVIEW_ONLY',contract_version:'visual-food-magazine-img2img-v2',
  adapter_mode:'SIMULATION',image_source_selected:!!state.photo,
  reference_asset_pending_private_upload:true,
  machine_id:foodMachine,estimated_credits_per_image:selectedMachine().credits,
  estimated_total_credits:selectedMachine().credits*food.count,
  payload:{...food,product_category:contextCategory,studio_scenario:contextScenario,
   restoration_mode:restorationMode,overlay_enabled:state.overlay,
   brand_name:state.overlay?state.product.slice(0,70):'',
   headline:state.overlay?state.headline.slice(0,100):'',
   tagline:state.overlay?state.promo.slice(0,100):'',
   price_label:state.overlay?foodPrice.slice(0,30):'',brand_hex:food.grade==='brand'?foodHex:'',
   user_notes:foodNotes.slice(0,240),reference_image:'',request_id:''}};
}
function foodChoices(field){
 return '<div class="ns-food-options" role="group" aria-label="'+FOOD_LABELS[field]+'">'+
 FOOD_GROUPS[field].map(([value,label])=>{
  const disabled=!foodCompatible({...food,[field]:value});
  return '<button type="button" class="ns-v2-choice" data-food-field="'+field+'" data-food-value="'+value+
   '" aria-pressed="'+(food[field]===value)+'" '+(disabled?'disabled title="Tidak cocok dengan pilihan saat ini"':'')+'>'+
   htmlEscape(label)+'</button>';
 }).join('')+'</div>';
}
function foodFields(){
 const fields=['cover_concept','camera_angle','lighting','surface','grade','styling','lens','format'];
 const context='<div class="ns-v2-field"><strong>Peruntukan Produk</strong><div class="ns-food-options" role="group" aria-label="Peruntukan Produk">'+
  Object.entries(CONTEXT_SCENARIOS).map(([id,item])=>'<button type="button" class="ns-v2-choice" data-context-category="'+id+'" aria-pressed="'+(contextCategory===id)+'">'+htmlEscape(item.label)+'</button>').join('')+'</div></div>'+
  '<div class="ns-v2-field"><strong>Skenario Studio · khusus '+htmlEscape(CONTEXT_SCENARIOS[contextCategory].label)+'</strong><div class="ns-food-options" role="group" aria-label="Skenario Studio">'+
  contextOptions().map(([id,label])=>'<button type="button" class="ns-v2-choice" data-context-scenario="'+id+'" aria-pressed="'+(contextScenario===id)+'">'+htmlEscape(label)+'</button>').join('')+'</div></div>'+
  '<div class="ns-v2-field"><strong>Pemulihan Foto HP</strong><label class="ns-v2-overlay-toggle"><input type="checkbox" id="ns-context-restoration" '+(restorationMode==='full_phone_restoration'?'checked':'')+'><span>Perbaiki Total Foto HP · denoise, sharpen & full studio relighting (default ON)</span></label></div>';
 const detail='<div class="ns-food-fields">'+context+
  '<details class="ns-v2-advanced"><summary>Pengaturan fotografi lanjutan · opsional</summary>'+fields.map((key,i)=>
  '<div class="ns-v2-field"><strong>'+FOOD_LABELS[key]+'</strong>'+foodChoices(key)+
  (key==='grade'&&food.grade==='brand'?'<label class="ns-label">Kode warna brand<input class="ns-control" id="ns-food-hex" type="color" value="'+foodHex+'"></label>':'')+'</div>').join('')+'</details>'+
  '<div class="ns-v2-field"><strong>10 Elemen cover · opsional</strong>'+
  '<label class="ns-v2-overlay-toggle"><input type="checkbox" id="ns-v2-overlay" '+(state.overlay?'checked':'')+'><span>Tambahkan teks melalui Canvas (OFF default)</span></label>'+
  (state.overlay?'<div class="ns-v2-overlay-fields">'+[['ns-product','Nama brand',state.product,70],['ns-headline','Headline',state.headline,100],['ns-promo','Tagline',state.promo,100]].map(([id,label,value,max])=>'<label class="ns-label">'+label+'<input id="'+id+'" class="ns-control" maxlength="'+max+'" value="'+htmlEscape(value)+'"></label>').join('')+'<label class="ns-label">Harga<input id="ns-food-price" class="ns-control" maxlength="30" value="'+htmlEscape(foodPrice)+'"></label></div>':'')+
  '</div><div class="ns-v2-field"><strong>'+FOOD_LABELS.similarity+'</strong>'+foodChoices('similarity')+'</div>'+
  '<div class="ns-v2-field"><strong>'+FOOD_LABELS.count+'</strong>'+foodChoices('count')+'</div>'+ '<div class="ns-v2-field"><strong>Mesin AI · tarif per gambar</strong><div class="ns-food-engines" role="radiogroup" aria-label="Mesin AI">'+FOOD_MACHINES.map(m=>'<button type="button" role="radio" class="ns-food-engine" data-food-machine="'+m.id+'" aria-checked="'+(m.id===foodMachine)+'" '+(liveBridgeReady()&&Array.isArray(visualPipelineBridge.allowedMachines)&&!visualPipelineBridge.allowedMachines.includes(m.id)?'disabled aria-label="'+htmlEscape(m.name)+' belum aktif"':'')+'><span class="ns-food-engine-top"><strong>'+htmlEscape(m.name)+'</strong><b>'+m.credits+' kredit</b></span><small>'+htmlEscape(m.model)+'</small><small>'+htmlEscape(m.use)+'</small></button>').join('')+'</div></div>'+
  '<label class="ns-label">Catatan kreatif (opsional, maks. 240 karakter)<textarea id="ns-food-notes" maxlength="240" rows="2" class="ns-control">'+htmlEscape(foodNotes)+'</textarea></label>'+ 
  '<div class="ns-inspire-preset-editor"><label class="ns-label" for="ns-preset-name">Simpan pengaturan sebagai preset pribadi<input id="ns-preset-name" class="ns-control" type="text" maxlength="56" value="'+htmlEscape(presetName||CONTEXT_SCENARIOS[contextCategory].options.find(([id])=>id===contextScenario)?.[1]||'Preset Studio')+'" aria-label="Nama preset pribadi"></label><button type="button" class="ns-cta ns-dark" id="ns-save-preset">'+ico('grid')+' Simpan Preset</button><small>Disimpan: resep & pengaturan, bukan foto produk atau API key.</small></div></div>';
 return '<section class="ns-block ns-v2-step ns-food-magazine"><h2><span class="ns-count">02</span> Foto Makanan Gaya Majalah</h2>'+
 '<p class="ns-hint">12 pilihan terpandu. Konsep mengatur cahaya, permukaan dan warna; Anda bisa menyesuaikannya lagi.</p>'+
 detail+'</section>';
}
function foodPreflightMarkup(){
 return foodMode?'<div id="ns-food-quality" class="ns-food-quality" role="status" aria-live="polite">'+
 htmlEscape(foodQuality.message)+'</div>':'';
}
function evaluateFoodPhoto(image){
 if(!foodMode||!image||!image.naturalWidth)return;
 try{
  const c=document.createElement('canvas');c.width=64;c.height=64;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,64,64);
  const p=x.getImageData(0,0,64,64).data;
  let total=0,edge=0,prev=new Float32Array(4096);
  for(let i=0;i<4096;i++){const j=i*4;const v=.2126*p[j]+.7152*p[j+1]+.0722*p[j+2];prev[i]=v;total+=v;}
  for(let y=1;y<63;y++)for(let x=1;x<63;x++){const i=y*64+x;edge+=Math.abs(4*prev[i]-prev[i-1]-prev[i+1]-prev[i-64]-prev[i+64]);}
  const mean=total/4096,sharpness=edge/(62*62);
  const issues=[];
  if(mean<40)issues.push('terlalu gelap: tambah cahaya jendela');
  if(sharpness<9)issues.push('sangat buram: bersihkan lensa, fokus ulang dan stabilkan HP');
  foodQuality={status:issues.length?'warning':'pass',message:issues.length?
   'Peringatan foto: '+issues.join('; ')+'. Pilih foto lain sebelum Generate.':
   'Foto lolos pemeriksaan kecerahan dan ketajaman dasar (bukan jaminan hasil AI).'};
 }catch(_){foodQuality={status:'unavailable',message:'Analisis tidak tersedia untuk gambar eksternal. Gunakan unggahan lokal untuk pemeriksaan kualitas.'};}
 const n=node('ns-food-quality');if(n)n.textContent=foodQuality.message;
 const b=node('ns-generate');if(b)b.disabled=foodQuality.status!=='pass'||state.busy;
}


const QUICK_STYLES=Object.freeze([
 {id:'catalog',name:'Katalog Bersih',subtitle:'Latar rapi, produk menonjol',category:'packaging_cosmetic',scenario:'clean_marketplace_cyclorama'},
 {id:'culinary',name:'Kuliner Hangat',subtitle:'Kuah dan tekstur menggoda',category:'hot_soupy_food',scenario:'steam_broth_hero'},
 {id:'splash',name:'Percikan Dinamis',subtitle:'Cairan dan gerak dramatis',category:'bottled_liquid',scenario:'liquid_vortex_splash'},
 {id:'luxury',name:'Hitam Mewah',subtitle:'Kontras dan refleksi premium',category:'bottled_liquid',scenario:'obsidian_mirror_splash'}
]);
let quickStyle='catalog';
function chooseQuickStyle(id){
 const style=QUICK_STYLES.find(item=>item.id===id);
 if(!style)return false;
 foodMode=true;
 contextSelectCategory(style.category);
 contextSelectScenario(style.scenario);
 contextSelectRestoration('full_phone_restoration');
 quickStyle=id;
 state.ratio=food.format;
 state.overlay=false;
 food.count=1;
 state.rendered=false;
 if(state.img)evaluateFoodPhoto(state.img);
 if(active())content();
 return true;
}
function editor(){
 const current=QUICK_STYLES.find(item=>item.id===quickStyle)||QUICK_STYLES[0];
 const sample=SAMPLES[1].img;
 const photo=state.photo||sample;
 const latest=state.history.find(item=>item.realAI===true);
 const after=latest?.image||photo;
 const real=!!latest;
 const uploaded=!!selectedLocalFile;
 const ready=uploaded&&foodQuality.status==='pass'&&!state.busy&&!livePolling;
 return '<section class="ns-simple" aria-label="Buat Foto Produk dalam Tiga Langkah">'+
  '<div class="ns-simple-hero"><div class="ns-simple-intro"><span class="ns-simple-kicker">NGULIK VISUAL STUDIO</span>'+
  '<h1>Ubah Foto HP Biasa Jadi Foto Produk Kelas Studio</h1>'+
  '<p>Upload foto jualan, pilih gaya, lalu buat. Tidak perlu paham kamera atau desain.</p></div>'+
  '<div class="ns-simple-compare" aria-label="Gambaran foto sebelum dan sesudah">'+
   '<figure class="ns-simple-before"><img src="'+htmlEscape(photo)+'" alt="Contoh foto produk sebelum penataan studio"><figcaption>BEFORE <small>'+(state.photo?'Foto HP Anda':'Contoh foto')+'</small></figcaption></figure>'+
   '<span class="ns-simple-arrow" aria-hidden="true">→</span>'+
   '<figure class="ns-simple-after"><img src="'+htmlEscape(after)+'" alt="'+(real?'Foto hasil AI studio':'Ilustrasi tampilan studio, belum hasil AI')+'"><figcaption>AFTER <small>'+(real?'Hasil AI Anda':'Ilustrasi gaya')+'</small></figcaption></figure>'+
  '</div><small class="ns-simple-disclaimer">'+(real?'Hasil AI dari sesi ini.':'Perbandingan ilustratif, bukan hasil AI sungguhan.')+'</small></div>'+
  '<div class="ns-simple-flow">'+
   '<section class="ns-simple-step"><h2><span>1</span> Upload Foto Produk</h2>'+
    '<button type="button" id="ns-quick-upload" class="ns-simple-upload">'+ico('upload')+
    '<strong>'+(uploaded?'Foto terpilih · Ganti foto':'Ketuk untuk pilih foto dari HP')+'</strong>'+
    '<small>JPG, PNG, WebP · maksimal 4 MB</small></button>'+
    (uploaded?'<p class="ns-simple-selected">'+htmlEscape(foodQuality.message)+'</p>':'')+
   '</section>'+
   '<section class="ns-simple-step"><h2><span>2</span> Pilih Gaya Studio</h2>'+
    '<div class="ns-simple-styles" role="group" aria-label="Gaya studio">'+
     QUICK_STYLES.map(item=>'<button type="button" data-quick-style="'+item.id+'" class="ns-simple-style" aria-pressed="'+(item.id===current.id)+'"><strong>'+htmlEscape(item.name)+'</strong><small>'+htmlEscape(item.subtitle)+'</small></button>').join('')+
    '</div></section>'+
   '<section class="ns-simple-step ns-simple-create"><h2><span>3</span> Buat Foto</h2>'+
    '<button type="button" id="ns-quick-generate" class="ns-cta ns-primary ns-simple-primary" '+(!ready?'disabled':'')+'>'+ico('spark')+' Buat Foto Sekarang</button>'+
    '<p class="ns-simple-mode">'+(liveBridgeReady()?'AI aktif sesuai izin STAGING · biaya mengikuti konfirmasi server.':'Mode simulasi · belum menghasilkan foto AI nyata.')+'</p>'+
   '</section></div>'+
  '<details class="ns-simple-advanced"><summary>Pengaturan Lanjutan (Opsional)</summary>'+advancedEditor()+'</details>'+
 '</section>';
}
function advancedEditor(){
 const dims=RATIOS[foodMode?food.format:state.v2.aspect_ratio];
 const selected=!!state.photo;
 return '<section class="ns-editor ns-v2-editor" aria-label="Studio Foto Produk">'+
 '<aside class="ns-side">'+
 '<div class="ns-side-header"><div><small>NGULIK VISUAL STUDIO</small><strong>Foto produk profesional</strong></div><span class="ns-status">SIMULASI</span></div>'+
 '<div class="ns-form">'+
 '<section class="ns-block ns-v2-step"><h2><span class="ns-count">01</span> Unggah foto produk mentah</h2>'+
 '<p class="ns-hint">Pakai foto dari kamera HP. Hasil simulasi ini belum memperbaiki foto dengan AI.</p>'+
 '<input id="ns-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+
 '<button class="ns-drop ns-v2-upload" id="ns-upload" type="button">'+(selected?'<img id="ns-thumb" src="'+htmlEscape(state.photo)+'" alt="Foto sumber yang dipilih">':'<span class="ns-upload-empty">'+ico('upload')+'</span>')+
 '<span><strong>'+(selected?'Ganti foto produk':'Pilih foto dari HP')+'</strong><small>JPG, PNG atau WebP · maks. 4 MB</small></span>'+ico('upload')+'</button>'+
 '<small class="ns-hint">Atau gunakan foto sampel untuk menguji alur:</small>'+
 '<div class="ns-samples">'+SAMPLES.map((v,i)=>'<button type="button" class="ns-sample" data-sample="'+i+'" aria-label="Pakai contoh '+htmlEscape(v.name)+'" aria-pressed="'+(state.photo===v.img)+'"><img src="'+v.img+'" alt="'+htmlEscape(v.name)+'" loading="lazy"></button>').join('')+'</div>'+
 '</section>'+
 '<div class="ns-food-mode-switch"><button type="button" data-food-mode="food" aria-pressed="'+foodMode+'">Foto Makanan Gaya Majalah</button><button type="button" data-food-mode="general" aria-pressed="'+(!foodMode)+'">Studio Produk Umum</button></div>'+
 (foodMode?foodFields():(
  '<section class="ns-block ns-v2-step"><h2><span class="ns-count">02</span> Pilih hasil yang diinginkan</h2>'+
  v2Field('product_category','Jenis Produk','Bahan, warna dan tekstur asli dijaga')+
  v2Field('use_case','Untuk Apa?','Kebutuhan menentukan framing dan gaya')+
  v2Field('visual_style','Gaya Foto','Enam panggung fotografi komersial')+
  '<details class="ns-v2-advanced"><summary>Atur lebih lanjut · sudut & cahaya</summary>'+
  v2Field('camera_angle','Sudut Kamera','Atur fokus pada produk')+
  v2Field('lighting_mood','Suasana Cahaya','Pencahayaan studio sesuai karakter produk')+
  '</details>'+
  v2Field('aspect_ratio','Rasio Gambar','Proporsi untuk tempat penggunaan')+
  v2Field('quality_tier','Kualitas','Biaya saat ini hanya kredit simulasi')+
  '</section>'+
  '<section class="ns-block ns-v2-optional"><label class="ns-v2-overlay-toggle"><input id="ns-v2-overlay" type="checkbox" '+(state.overlay?'checked':'')+'><span><strong>Opsional: teks, harga & CTA</strong><small>OFF secara default · hasil utama foto tanpa tulisan</small></span></label>'+
  (state.overlay?'<div class="ns-v2-overlay-fields">'+[['ns-product','Nama Produk / Brand',state.product,40],['ns-headline','Headline Promo',state.headline,54],['ns-promo','Harga / Badge',state.promo,28]].map(([id,l,v,max])=>'<label class="ns-label" for="'+id+'">'+l+'<input id="'+id+'" class="ns-control" maxlength="'+max+'" value="'+htmlEscape(v)+'"></label>').join('')+'</div>':'')+
  '</section>'
 ))+
 '</div><div class="ns-cost"><div class="ns-cost-row"><strong>Kredit simulasi</strong><span class="ns-status ns-mono">'+getCost()+' Cr</span></div>'+
 foodPreflightMarkup()+'<div class="ns-hint">'+(foodMode?food.count+' × '+selectedMachine().credits+' Cr / hasil · estimasi simulasi':'1 hasil · simulasi')+'</div>'+ '<button type="button" id="ns-generate" class="ns-cta ns-primary" '+(!selected||state.busy||(foodMode&&foodQuality.status!=='pass')?'disabled':'')+'>'+ico('spark')+(selected?' Buat Pratinjau Simulasi':' Unggah Foto Dahulu')+'</button>'+
 (foodMode?'<div id="ns-food-pricing" class="ns-food-pricing" role="status"><strong>Ringkasan Kredit</strong><span>'+htmlEscape(selectedMachine().name)+'</span><b>'+selectedMachine().credits+' kredit × '+food.count+' hasil = '+getCost()+' kredit</b><small>Tarif final dikunci server sebelum Generate. Gagal total: 100% kredit kembali; jika gagal sebagian, hanya hasil sukses ditagih.</small></div><div id="ns-food-job-progress" class="ns-food-job-progress" role="status" aria-live="polite">'+htmlEscape(liveStatus)+'</div>':'')+
 (foodMode&&liveBridgeReady()?'<button type="button" id="ns-food-live-generate" class="ns-cta ns-dark" '+(!selected||!selectedLocalFile||foodQuality.status!=='pass'||livePolling?'disabled':'')+'>Generate AI melalui antrean privat</button>':'')+ '<small class="ns-hint">'+(liveBridgeReady()?'AI memakai antrean privat jika disetujui oleh backend.':'AI nyata masih nonaktif. Foto asli tidak dikirim ke server.')+'</small></div></aside>'+
 '<div class="ns-board-panel"><div class="ns-window-titlebar"><span class="ns-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><strong>Pratinjau Foto Produk</strong></div>'+
 '<div class="ns-board-toolbar"><span class="ns-pill">'+dims[0]+' × '+dims[1]+' px</span><div class="ns-board-actions">'+
 '<button type="button" class="ns-cta" id="ns-compare" aria-pressed="'+state.compare+'">'+ico('compare')+' '+(state.compare?'Lihat Pratinjau':'Bandingkan Sumber')+'</button>'+
 '<button type="button" class="ns-cta ns-dark" id="ns-download" '+(!selected?'disabled':'')+'>'+ico('download')+' Unduh PNG Simulasi</button></div></div>'+
 '<div class="ns-artboard"><div class="ns-canvas-wrap"><canvas id="ns-canvas" width="'+dims[0]+'" height="'+dims[1]+'" aria-label="Pratinjau komposisi foto; bukan hasil rekonstruksi AI"></canvas></div></div>'+
 '</div></section>';
}
function historyView(){return '<section class="ns-pane"><div class="ns-sectiontitle"><h2>Riwayat Aset Sesi Ini</h2><span class="ns-pill">'+state.history.length+' aset</span></div>'+(state.history.length?'<div class="ns-grid">'+state.history.map((h,i)=>'<div class="ns-history-card ns-frame"><img src="'+h.image+'" alt="Hasil simulasi '+(i+1)+'"><div><strong>'+htmlEscape(h.product)+'</strong><span class="ns-hint">'+h.ratio+' · '+h.cost+' Cr · Simulasi</span><div style="display:flex;gap:8px;margin-top:10px"><button class="ns-cta" data-preview="'+i+'">Pratinjau</button><button class="ns-cta ns-dark" data-history-download="'+i+'">'+ico('download')+' PNG</button></div></div></div>').join('')+'</div>':'<div class="ns-hist-empty ns-frame"><h2>Belum ada aset tersimpan</h2><p class="ns-hint">Buka galeri, pilih template, lalu generate visual simulasi.</p><button type="button" class="ns-cta ns-primary" data-view="gallery">Buka Galeri</button></div>')+'</section>'}
function setTemplate(t){
 const p={
  'katalog-minimalis':['general_retail','marketplace_main','studio_clean'],
  'kuliner-hangat':['food_culinary','social_feed','bright_lifestyle_table'],
  'poster-flash-sale':['food_culinary','promo_banner','splash_levitation'],
  'skincare-podium':['skincare_cosmetic','social_feed','studio_clean'],
  'dark-luxury':['skincare_cosmetic','social_feed','dark_mirror_splash'],
  'story-vertikal':['beverage_bottle','story_reels_wa','bright_lifestyle_table']
 }[t.id];
 if(p){state.v2.product_category=p[0];state.v2.use_case=p[1];state.v2.visual_style=p[2];}
 state.v2.aspect_ratio=t.ratio;
 reconcileV2();
 resetVisualLiveRequest();state.template=t;
 // A template image is inspiration, NEVER an input product photo. Keep only
 // a genuine locally selected product image; do not copy sample brand text.
 if(!selectedLocalFile){state.photo='';state.photoChosen=false;state.img=null;state.loadedUrl='';}
 state.product=state.product||'';state.headline=state.headline||'';state.promo=state.promo||'';
 state.mood=t.mood;state.img=null;state.loadedUrl='';state.compare=false;
 state.rendered=false;state.view='editor';shell();
}
function loadImg(url){if(!active()||state.loadedUrl===url)return;state.loadedUrl=url;const image=new Image();if(!url.startsWith('data:'))image.crossOrigin='anonymous';image.onload=()=>{if(!active()||state.photo!==url)return;state.img=image;draw();evaluateFoodPhoto(image)};image.onerror=()=>{if(state.photo===url){state.img=null;draw()}};image.src=url}
function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function wrap(ctx,text,maxWidth,maxLines){const words=String(text).split(/\s+/),lines=[];let line='';for(const w of words){const next=line?line+' '+w:w;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=w;if(lines.length>=maxLines)break}else line=next}if(lines.length<maxLines&&line)lines.push(line);return lines}
function draw(){const canvas=node('ns-canvas');if(!canvas)return;const dims=RATIOS[state.ratio]||RATIOS['1:1'];canvas.width=dims[0];canvas.height=dims[1];const W=dims[0],H=dims[1],ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle=state.mood==='gelap'?'#141418':state.mood==='kontras'?'#CCF349':state.mood==='hangat'?'#E8D6C4':'#ECEAE3';ctx.fillRect(0,0,W,H);
const image=state.img;if(image&&image.complete&&image.naturalWidth){const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;ctx.drawImage(image,(W-iw)/2,(H-ih)/2,iw,ih)}else{ctx.fillStyle='#DDD9CE';ctx.fillRect(W*.14,H*.13,W*.72,H*.64);ctx.strokeStyle='#141418';ctx.lineWidth=7;ctx.strokeRect(W*.14,H*.13,W*.72,H*.64);ctx.font='700 40px "Plus Jakarta Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#141418';ctx.fillText('FOTO PRODUK',W/2,H/2)}
if(state.compare)return;if(!state.overlay)return;ctx.textAlign='left';
const boxH=Math.min(H*.38,420),top=H-boxH;ctx.fillStyle=state.mood==='gelap'?'rgba(20,20,24,.9)':'rgba(246,245,240,.96)';ctx.fillRect(0,top,W,boxH);const dark=state.mood==='gelap';ctx.fillStyle=dark?'#CCF349':'#141418';ctx.font='800 54px "Plus Jakarta Sans",sans-serif';const pad=65;ctx.fillText(state.product||'Produk UMKM',pad,top+85,W-pad*2);ctx.font='700 43px "Plus Jakarta Sans",sans-serif';const lines=wrap(ctx,state.headline||'Visual promosi produk',W-pad*2,3);lines.forEach((line,i)=>ctx.fillText(line,pad,top+155+i*55,W-pad*2));ctx.fillStyle=dark?'#CCF349':'#5B3DF5';roundRect(ctx,pad,H-102,Math.min(W-2*pad,Math.max(260,(state.promo||'PROMO').length*28+55)),61,13,dark?'#CCF349':'#5B3DF5');ctx.fillStyle=dark?'#141418':'#fff';ctx.font='800 30px "Plus Jakarta Sans",sans-serif';ctx.fillText(state.promo||'PROMO',pad+20,H-63,W-pad*2-24);if(foodMode&&foodPrice){ctx.textAlign='right';ctx.fillStyle=dark?'#CCF349':'#141418';ctx.font='800 31px "Plus Jakarta Sans",sans-serif';ctx.fillText(foodPrice,W-pad,top+84,W*.36)}}
function recipe(){return ['Commercial product visual simulation','Template: '+state.template.name,'Style: '+MOODS[state.mood],'Canvas: '+state.ratio,'Produk: '+state.product,'Headline: '+state.headline,'Promo: '+state.promo,'Mode: local-only (no AI provider request)'].join('\n')}
function download(data,filename){const a=document.createElement('a');a.href=data;a.download=filename;document.body.append(a);a.click();a.remove()}
function selectView(v){if(!['gallery','editor','history'].includes(v))return;state.view=v;shell()}
function maybeEdit(input){if(input.id==='ns-preset-name'){presetName=String(input.value||'').slice(0,56);return}if(input.id==='ns-template-query'){templateQuery=String(input.value||'').slice(0,90);const pos=input.selectionStart;content();const next=node('ns-template-query');if(next){next.focus();if(pos!==null)next.setSelectionRange(pos,pos)}return}if(input.id==='ns-food-price'){resetVisualLiveRequest();foodPrice=input.value.slice(0,30);return}if(input.id==='ns-food-notes'){resetVisualLiveRequest();foodNotes=input.value.slice(0,240);return}if(input.id==='ns-food-hex'){resetVisualLiveRequest();foodHex=input.value;return}const keys={'ns-product':'product','ns-headline':'headline','ns-promo':'promo'};if(keys[input.id]){resetVisualLiveRequest();state[keys[input.id]]=input.value;draw();const rec=node('ns-recipe');if(rec)rec.textContent=recipe()}if(input.id==='ns-search'){state.q=input.value;const selectionStart=input.selectionStart;content();const fresh=node('ns-search');if(fresh){fresh.focus();fresh.setSelectionRange(selectionStart,selectionStart)}}}
async function simulate(){if(state.busy)return;if(!state.photo){announce('Pilih foto produk lebih dulu.');return;}if(foodMode&&foodQuality.status!=='pass'){announce('Pastikan foto sudah diperiksa dan layak. Gunakan unggahan lokal yang terang dan tajam.');return;}const reservation=adapter.reserve(getCost());if(!reservation.ok){announce('Saldo simulasi tidak cukup. Refresh halaman untuk mengulang sesi.');return}state.busy=true;const token=++epoch;const gen=node('ns-generate');if(gen){gen.disabled=true;gen.textContent='Memproses simulasi…'}try{draw();const cv=node('ns-canvas');if(!cv)throw Error('Canvas tidak tersedia');const image=cv.toDataURL('image/png');await Promise.resolve();if(!active()||token!==epoch)return;const settled=adapter.settle(reservation.reservation);if(!settled.ok)throw Error('Simulasi gagal');state.renderNo++;state.rendered=true;const count=foodMode?food.count:1;for(let n=0;n<count;n++)state.history.unshift({image,product:state.product,ratio:state.ratio,cost:reservation.reservation.cost/count});if(state.history.length>8)state.history.length=8;shell();announce(count+' aset simulasi tersimpan di riwayat sesi (tanpa AI).')}catch(e){adapter.release(reservation.reservation);state.busy=false;announce('Gagal membuat pratinjau. Gunakan foto lokal atau coba lagi.');}finally{state.busy=false;if(active()&&state.view==='editor'){const btn=node('ns-generate');if(btn){btn.disabled=foodMode&&foodQuality.status!=='pass';btn.innerHTML=ico('spark')+' Generate Visual'}}}}
function handleClick(event){const target=event.target.closest('button');if(!target||!root.contains(target))return;if(target.id==='ns-quick-upload'){node('ns-file')?.click();return}
if(target.dataset.quickStyle){chooseQuickStyle(target.dataset.quickStyle);return}
if(target.id==='ns-quick-generate'){
 if(!selectedLocalFile){announce('Unggah foto produk dari HP terlebih dahulu.');return}
 if(foodQuality.status!=='pass'){announce('Foto belum lolos pemeriksaan dasar. Coba foto yang lebih terang dan fokus.');return}
 if(liveBridgeReady()){void runVisualLive();return}
 void simulate();return
}
if(target.dataset.view){selectView(target.dataset.view);return}if(target.dataset.cat){state.cat=target.dataset.cat;content();return}if(target.dataset.templateFilter){templateFilter=target.dataset.templateFilter;content();return}if(target.dataset.sceneTemplate){useScenarioTemplate(target.dataset.sceneTemplate);return}if(target.dataset.templateDetail){templateDetail=templateDetail===target.dataset.templateDetail?'':target.dataset.templateDetail;content();return}if(target.dataset.savedTemplate){const p=customTemplates.find(x=>x.id===target.dataset.savedTemplate);if(p)applyPreset(p);return}if(target.dataset.savedDelete){void removeSavedPreset(target.dataset.savedDelete);return}if(target.id==='ns-save-preset'){void saveCurrentPreset();return}if(target.dataset.template){const t=TEMPLATES.find(x=>x.id===target.dataset.template);if(t)setTemplate(t);return}if(target.dataset.sample!==undefined){const i=Number(target.dataset.sample);const s=SAMPLES[i];if(s){selectedLocalFile=null;resetVisualLiveRequest();state.photo=s.img;state.photoChosen=true;state.product=s.product;state.headline=s.headline;state.promo=s.promo;state.v2.product_category=['beverage_bottle','food_culinary','skincare_cosmetic','food_culinary'][i];reconcileV2();state.img=null;state.loadedUrl='';content()}return}
if(target.dataset.foodMode){foodMode=target.dataset.foodMode==='food';if(foodMode){state.ratio=food.format;state.overlay=false;foodQuality={status:'not_checked',message:'Memeriksa foto sumber…'};if(state.img)evaluateFoodPhoto(state.img)}else{state.ratio=state.v2.aspect_ratio;}content();return}if(target.dataset.contextCategory){if(contextSelectCategory(target.dataset.contextCategory))content();return}if(target.dataset.contextScenario){if(contextSelectScenario(target.dataset.contextScenario))content();return}if(target.dataset.foodMachine){if(chooseMachine(target.dataset.foodMachine))content();return}if(target.dataset.foodField){if(chooseFood(target.dataset.foodField,target.dataset.foodField==='count'?Number(target.dataset.foodValue):target.dataset.foodValue))content();return}if(target.dataset.v2Field){if(selectV2(target.dataset.v2Field,target.dataset.v2Value))content();return}if(target.dataset.mood){state.mood=target.dataset.mood;content();return}if(target.dataset.ratio){state.ratio=target.dataset.ratio;content();return}if(target.dataset.tier){state.tier=target.dataset.tier;content();return}
if(target.id==='ns-food-live-generate'){void runVisualLive();return}if(target.id==='ns-upload'){node('ns-file')?.click();return}if(target.id==='ns-toggle'){state.overlay=!state.overlay;content();return}if(target.id==='ns-compare'){state.compare=!state.compare;content();return}if(target.id==='ns-generate'){void simulate();return}if(target.id==='ns-download'){const cv=node('ns-canvas');if(cv)try{download(cv.toDataURL('image/png'),'ngulik-studio-simulasi-'+state.ratio.replace(':','x')+'.png')}catch(_){announce('Tidak bisa mengunduh gambar eksternal ini. Unggah foto lokal untuk ekspor HD.')}return}if(target.dataset.preview!==undefined){const item=state.history[Number(target.dataset.preview)];if(item){state.photo=item.image;state.photoChosen=true;state.img=null;state.loadedUrl='';state.ratio=item.ratio;state.product=item.product;state.compare=true;state.view='editor';shell()}return}if(target.dataset.historyDownload!==undefined){const item=state.history[Number(target.dataset.historyDownload)];if(item)download(item.image,'ngulik-studio-aset-'+(Number(target.dataset.historyDownload)+1)+'.png');return}}
function handleChange(event){const t=event.target;if(t.id==='ns-context-restoration'){contextSelectRestoration(t.checked?'full_phone_restoration':'preserve_source');content();return}if(t.id==='ns-v2-overlay'){resetVisualLiveRequest();state.overlay=t.checked;content();return}if(t.id==='ns-ratio-filter'){state.filterRatio=t.value;content()}if(t.id==='ns-file'){const file=t.files?.[0];if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>4*1024*1024){announce('File harus JPG/PNG/WebP maksimal 4 MB.');return}const reader=new FileReader();reader.onload=()=>{if(!active())return;state.photo=String(reader.result||'');selectedLocalFile=file;resetVisualLiveRequest();state.photoChosen=true;state.img=null;state.loadedUrl='';foodQuality={status:'not_checked',message:'Sedang memeriksa foto baru…'};content()};reader.readAsDataURL(file)}}
function mount(el){if(!el)return;customTemplates=readSavedTemplates();restoreWorkspace();root=el;root.classList.add('ngd-studio');root.addEventListener('click',handleClick);root.addEventListener('input',e=>maybeEdit(e.target));root.addEventListener('change',handleChange);shell()}
function unmount(){rememberWorkspace();epoch++;livePolling=false;selectedLocalFile=null;if(root){root.replaceChildren();root=null}}
global.NGD_STUDIO={mount,unmount,adapterMode:adapter.mode,configureVisualPipeline,configureTemplateStorage,configureMemberScope,saveTemplatePreset:saveCurrentPreset,deleteTemplatePreset:removeSavedPreset,setPresetName:name=>{presetName=String(name||'').slice(0,56)},studioTemplateCatalog:()=>scenarioTemplates().map(t=>({...t})),useScenarioTemplate,applySavedTemplate:applyPreset,savedTemplates:()=>customTemplates.map(t=>({...t})),setTemplateFilter:id=>{if(!templateCategoryChoices().some(x=>x[0]===id))return false;templateFilter=id;return true},quickStyleSelect:chooseQuickStyle,quickStyles:()=>QUICK_STYLES.map(v=>({...v})),contextCategorySelect:contextSelectCategory,contextScenarioSelect:contextSelectScenario,contextRestorationSelect:contextSelectRestoration,contextMatrix:()=>JSON.parse(JSON.stringify(CONTEXT_SCENARIOS)),foodMachineSelect:chooseMachine,publicMachineCatalog:()=>FOOD_MACHINES.map(m=>({...m})),debugSnapshot:()=>({mode:adapter.mode,creditsSimulated:state.credits,renders:state.renderNo,history:state.history.length}),requestDraft:buildVisualRequestDraft,img2imgDraft:buildImg2ImgV2Draft,foodMagazineDraft:foodDraft,foodChoose:chooseFood,foodContracts:()=>FOOD_GROUPS,selectOption:selectV2,optionContracts:()=>Object.keys(V2_OPTIONS).reduce((a,k)=>(a[k]=V2_OPTIONS[k].map(x=>[...x]),a),{}),presetContracts:()=>Object.keys(VISUAL_PRESET_IDS).map(id=>({id,...VISUAL_PRESET_IDS[id]}))};
})(window);

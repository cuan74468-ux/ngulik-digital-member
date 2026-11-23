/* Ngulik AI Studio P1. DOM-only simulation: never calls GAS, payment, or AI providers. */
(function(global){
'use strict';
const RATIOS={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080]};
const TIERS={hemat:2,standar:4,premium:6};
const V2_TIERS={standard:4,hd_commercial:6};
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
function getCost(){return TIERS[state.tier]||4}
function active(){return !!(root&&root.isConnected)}
function node(id){return root&&root.querySelector('#'+id)}
function announce(message){const n=node('ns-toast');if(n){n.textContent=message;n.hidden=false;clearTimeout(announce.timer);announce.timer=setTimeout(()=>{if(n)n.hidden=true},3800)}}
function tabbar(){return '<div class="ns-tabs" role="tablist" aria-label="Navigasi Studio">'+[['editor','Buat Foto', 'edit'],['gallery','Inspirasi', 'grid'],['history','Riwayat','history']].map(([id,label,ic])=>'<button type="button" role="tab" data-view="'+id+'" aria-selected="'+(state.view===id)+'">'+ico(ic)+' '+label+(id==='history'&&state.history.length?' ('+state.history.length+')':'')+'</button>').join('')+'</div>'}
function shell(){if(!active())return;root.innerHTML='<header class="ns-head"><div class="ns-brand"><span class="ns-logo">'+ico('image')+'</span><span>NGULIK STUDIO</span><span class="ns-sim">SIMULASI</span></div>'+tabbar()+'<span class="ns-credit">'+ico('bolt')+' <span id="ns-balance">'+state.credits+' Cr</span></span></header><div class="ns-tab-mobile">'+tabbar()+'</div><div id="ns-toast" class="ns-toast" role="status" hidden></div><div id="ns-content"></div>';content()}
function content(){const host=node('ns-content');if(!host)return;host.innerHTML=state.view==='gallery'?gallery():state.view==='editor'?editor():historyView();if(state.view==='editor'){draw();if(state.photo)loadImg(state.photo);}}
function gallery(){const cats=['Semua','Kuliner & F&B','Katalog Studio','Promo & Diskon','Beauty & Skincare','Story 9:16'];const filtered=TEMPLATES.filter(t=>(state.cat==='Semua'||t.category===state.cat)&&(state.filterRatio==='Semua'||t.ratio===state.filterRatio)&&(!state.q||[t.name,t.category,t.product].some(v=>v.toLocaleLowerCase('id-ID').includes(state.q.toLocaleLowerCase('id-ID')))));return '<section class="ns-pane"><div class="ns-toolbar ns-frame"><div class="ns-chips">'+cats.map(c=>'<button class="ns-chip" data-cat="'+htmlEscape(c)+'" aria-pressed="'+(state.cat===c)+'">'+htmlEscape(c)+'</button>').join('')+'</div><div class="ns-filters"><select class="ns-control" id="ns-ratio-filter" aria-label="Filter rasio">'+['Semua','1:1','4:5','9:16'].map(r=>'<option '+(r===state.filterRatio?'selected':'')+'>'+r+'</option>').join('')+'</select><input class="ns-control" id="ns-search" type="search" value="'+htmlEscape(state.q)+'" placeholder="Cari template..." aria-label="Cari template"></div></div><div class="ns-sectiontitle"><h2>Katalog Template Iklan</h2><span class="ns-pill">'+filtered.length+' template</span></div><div class="ns-grid">'+(filtered.length?filtered.map(t=>'<button type="button" class="ns-template ns-frame" data-template="'+t.id+'"><div class="ns-preview"><img src="'+t.img+'" alt="" loading="lazy"><span>'+t.ratio+'</span></div><div class="ns-copy"><span><strong>'+htmlEscape(t.name)+'</strong><small>'+htmlEscape(t.category)+'</small></span><span class="ns-pill">'+TIERS[t.tier]+' Cr</span></div></button>').join(''):'<div class="ns-frame ns-hist-empty">Template tidak ditemukan. Ubah filter atau kata kunci.</div>')+'</div></section>'}
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
function editor(){
 const dims=RATIOS[state.v2.aspect_ratio];
 const selected=!!state.photo;
 return '<section class="ns-editor ns-v2-editor" aria-label="Studio Foto Produk">'+
 '<aside class="ns-side">'+
 '<div class="ns-side-header"><div><small>NGULIK VISUAL STUDIO</small><strong>Foto produk profesional</strong></div><span class="ns-status">SIMULASI</span></div>'+
 '<div class="ns-form">'+
 '<section class="ns-block ns-v2-step"><h2><span class="ns-count">01</span> Unggah foto produk mentah</h2>'+
 '<p class="ns-hint">Pakai foto dari kamera HP. Hasil simulasi ini belum memperbaiki foto dengan AI.</p>'+
 '<input id="ns-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+
 '<button class="ns-drop ns-v2-upload" id="ns-upload" type="button">'+(selected?'<img id="ns-thumb" src="'+htmlEscape(state.photo)+'" alt="Foto sumber yang dipilih">':'<span class="ns-upload-empty">'+ico('upload')+'</span>')+
 '<span><strong>'+(selected?'Ganti foto produk':'Pilih foto dari HP')+'</strong><small>JPG, PNG atau WebP · maks. 8 MB</small></span>'+ico('upload')+'</button>'+
 '<small class="ns-hint">Atau gunakan foto sampel untuk menguji alur:</small>'+
 '<div class="ns-samples">'+SAMPLES.map((v,i)=>'<button type="button" class="ns-sample" data-sample="'+i+'" aria-label="Pakai contoh '+htmlEscape(v.name)+'" aria-pressed="'+(state.photo===v.img)+'"><img src="'+v.img+'" alt="'+htmlEscape(v.name)+'" loading="lazy"></button>').join('')+'</div>'+
 '</section>'+
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
 '</section>'+
 '</div><div class="ns-cost"><div class="ns-cost-row"><strong>Kredit simulasi</strong><span class="ns-status ns-mono">'+getCost()+' Cr</span></div>'+
 '<button type="button" id="ns-generate" class="ns-cta ns-primary" '+(!selected||state.busy?'disabled':'')+'>'+ico('spark')+(selected?' Buat Pratinjau Simulasi':' Unggah Foto Dahulu')+'</button>'+
 '<small class="ns-hint">Generasi AI sungguhan belum terhubung. Foto asli tidak dikirim ke server.</small></div></aside>'+
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
 state.template=t;state.photo=state.photo||t.img;state.photoChosen=true;
 state.product=t.product;state.headline=t.headline;state.promo=t.promo;
 state.mood=t.mood;state.img=null;state.loadedUrl='';state.compare=false;
 state.rendered=false;state.view='editor';shell();
}
function loadImg(url){if(!active()||state.loadedUrl===url)return;state.loadedUrl=url;const image=new Image();if(!url.startsWith('data:'))image.crossOrigin='anonymous';image.onload=()=>{if(!active()||state.photo!==url)return;state.img=image;draw()};image.onerror=()=>{if(state.photo===url){state.img=null;draw()}};image.src=url}
function roundRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function wrap(ctx,text,maxWidth,maxLines){const words=String(text).split(/\s+/),lines=[];let line='';for(const w of words){const next=line?line+' '+w:w;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=w;if(lines.length>=maxLines)break}else line=next}if(lines.length<maxLines&&line)lines.push(line);return lines}
function draw(){const canvas=node('ns-canvas');if(!canvas)return;const dims=RATIOS[state.ratio]||RATIOS['1:1'];canvas.width=dims[0];canvas.height=dims[1];const W=dims[0],H=dims[1],ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle=state.mood==='gelap'?'#141418':state.mood==='kontras'?'#CCF349':state.mood==='hangat'?'#E8D6C4':'#ECEAE3';ctx.fillRect(0,0,W,H);
const image=state.img;if(image&&image.complete&&image.naturalWidth){const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;ctx.drawImage(image,(W-iw)/2,(H-ih)/2,iw,ih)}else{ctx.fillStyle='#DDD9CE';ctx.fillRect(W*.14,H*.13,W*.72,H*.64);ctx.strokeStyle='#141418';ctx.lineWidth=7;ctx.strokeRect(W*.14,H*.13,W*.72,H*.64);ctx.font='700 40px "Plus Jakarta Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#141418';ctx.fillText('FOTO PRODUK',W/2,H/2)}
if(state.compare)return;if(!state.overlay)return;ctx.textAlign='left';
const boxH=Math.min(H*.38,420),top=H-boxH;ctx.fillStyle=state.mood==='gelap'?'rgba(20,20,24,.9)':'rgba(246,245,240,.96)';ctx.fillRect(0,top,W,boxH);const dark=state.mood==='gelap';ctx.fillStyle=dark?'#CCF349':'#141418';ctx.font='800 54px "Plus Jakarta Sans",sans-serif';const pad=65;ctx.fillText(state.product||'Produk UMKM',pad,top+85,W-pad*2);ctx.font='700 43px "Plus Jakarta Sans",sans-serif';const lines=wrap(ctx,state.headline||'Visual promosi produk',W-pad*2,3);lines.forEach((line,i)=>ctx.fillText(line,pad,top+155+i*55,W-pad*2));ctx.fillStyle=dark?'#CCF349':'#5B3DF5';roundRect(ctx,pad,H-102,Math.min(W-2*pad,Math.max(260,(state.promo||'PROMO').length*28+55)),61,13,dark?'#CCF349':'#5B3DF5');ctx.fillStyle=dark?'#141418':'#fff';ctx.font='800 30px "Plus Jakarta Sans",sans-serif';ctx.fillText(state.promo||'PROMO',pad+20,H-63,W-pad*2-24)}
function recipe(){return ['Commercial product visual simulation','Template: '+state.template.name,'Style: '+MOODS[state.mood],'Canvas: '+state.ratio,'Produk: '+state.product,'Headline: '+state.headline,'Promo: '+state.promo,'Mode: local-only (no AI provider request)'].join('\n')}
function download(data,filename){const a=document.createElement('a');a.href=data;a.download=filename;document.body.append(a);a.click();a.remove()}
function selectView(v){if(!['gallery','editor','history'].includes(v))return;state.view=v;shell()}
function maybeEdit(input){const keys={'ns-product':'product','ns-headline':'headline','ns-promo':'promo'};if(keys[input.id]){state[keys[input.id]]=input.value;draw();const rec=node('ns-recipe');if(rec)rec.textContent=recipe()}if(input.id==='ns-search'){state.q=input.value;const selectionStart=input.selectionStart;content();const fresh=node('ns-search');if(fresh){fresh.focus();fresh.setSelectionRange(selectionStart,selectionStart)}}}
async function simulate(){if(state.busy)return;if(!state.photo){announce('Pilih foto produk lebih dulu.');return;}const reservation=adapter.reserve(getCost());if(!reservation.ok){announce('Saldo simulasi tidak cukup. Refresh halaman untuk mengulang sesi.');return}state.busy=true;const token=++epoch;const gen=node('ns-generate');if(gen){gen.disabled=true;gen.textContent='Memproses simulasi…'}try{draw();const cv=node('ns-canvas');if(!cv)throw Error('Canvas tidak tersedia');const image=cv.toDataURL('image/png');await Promise.resolve();if(!active()||token!==epoch)return;const settled=adapter.settle(reservation.reservation);if(!settled.ok)throw Error('Simulasi gagal');state.renderNo++;state.rendered=true;state.history.unshift({image,product:state.product,ratio:state.ratio,cost:reservation.reservation.cost});if(state.history.length>8)state.history.pop();shell();announce('Visual simulasi tersimpan di riwayat sesi.')}catch(e){adapter.release(reservation.reservation);state.busy=false;announce('Gagal membuat pratinjau. Gunakan foto lokal atau coba lagi.');}finally{state.busy=false;if(active()&&state.view==='editor'){const btn=node('ns-generate');if(btn){btn.disabled=false;btn.innerHTML=ico('spark')+' Generate Visual'}}}}
function handleClick(event){const target=event.target.closest('button');if(!target||!root.contains(target))return;if(target.dataset.view){selectView(target.dataset.view);return}if(target.dataset.cat){state.cat=target.dataset.cat;content();return}if(target.dataset.template){const t=TEMPLATES.find(x=>x.id===target.dataset.template);if(t)setTemplate(t);return}if(target.dataset.sample!==undefined){const i=Number(target.dataset.sample);const s=SAMPLES[i];if(s){state.photo=s.img;state.photoChosen=true;state.product=s.product;state.headline=s.headline;state.promo=s.promo;state.v2.product_category=['beverage_bottle','food_culinary','skincare_cosmetic','food_culinary'][i];reconcileV2();state.img=null;state.loadedUrl='';content()}return}
if(target.dataset.v2Field){if(selectV2(target.dataset.v2Field,target.dataset.v2Value))content();return}if(target.dataset.mood){state.mood=target.dataset.mood;content();return}if(target.dataset.ratio){state.ratio=target.dataset.ratio;content();return}if(target.dataset.tier){state.tier=target.dataset.tier;content();return}
if(target.id==='ns-upload'){node('ns-file')?.click();return}if(target.id==='ns-toggle'){state.overlay=!state.overlay;content();return}if(target.id==='ns-compare'){state.compare=!state.compare;content();return}if(target.id==='ns-generate'){void simulate();return}if(target.id==='ns-download'){const cv=node('ns-canvas');if(cv)try{download(cv.toDataURL('image/png'),'ngulik-studio-simulasi-'+state.ratio.replace(':','x')+'.png')}catch(_){announce('Tidak bisa mengunduh gambar eksternal ini. Unggah foto lokal untuk ekspor HD.')}return}if(target.dataset.preview!==undefined){const item=state.history[Number(target.dataset.preview)];if(item){state.photo=item.image;state.photoChosen=true;state.img=null;state.loadedUrl='';state.ratio=item.ratio;state.product=item.product;state.compare=true;state.view='editor';shell()}return}if(target.dataset.historyDownload!==undefined){const item=state.history[Number(target.dataset.historyDownload)];if(item)download(item.image,'ngulik-studio-aset-'+(Number(target.dataset.historyDownload)+1)+'.png');return}}
function handleChange(event){const t=event.target;if(t.id==='ns-v2-overlay'){state.overlay=t.checked;content();return}if(t.id==='ns-ratio-filter'){state.filterRatio=t.value;content()}if(t.id==='ns-file'){const file=t.files?.[0];if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024){announce('File harus JPG/PNG/WebP maksimal 8 MB.');return}const reader=new FileReader();reader.onload=()=>{if(!active())return;state.photo=String(reader.result||'');state.photoChosen=true;state.img=null;state.loadedUrl='';content()};reader.readAsDataURL(file)}}
function mount(el){if(!el)return;root=el;root.classList.add('ngd-studio');root.addEventListener('click',handleClick);root.addEventListener('input',e=>maybeEdit(e.target));root.addEventListener('change',handleChange);shell()}
function unmount(){epoch++;if(root){root.replaceChildren();root=null}}
global.NGD_STUDIO={mount,unmount,adapterMode:adapter.mode,debugSnapshot:()=>({mode:adapter.mode,creditsSimulated:state.credits,renders:state.renderNo,history:state.history.length}),requestDraft:buildVisualRequestDraft,img2imgDraft:buildImg2ImgV2Draft,selectOption:selectV2,optionContracts:()=>Object.keys(V2_OPTIONS).reduce((a,k)=>(a[k]=V2_OPTIONS[k].map(x=>[...x]),a),{}),presetContracts:()=>Object.keys(VISUAL_PRESET_IDS).map(id=>({id,...VISUAL_PRESET_IDS[id]}))};
})(window);

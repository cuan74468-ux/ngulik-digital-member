/* Ngulik Digital — media-first editorial UI (no frameworks or external CDN).
 * Content originates in an authenticated Google Sheets CMS. All asset paths
 * may use local assets, HTTPS URLs or raster data URIs; no inline SVG campaigns.
 */
(function(){
  'use strict';
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const routes=['beranda','belajar','katalog','jasa','ai','affiliate','dukungan','login','akun','daftar','masuk','auth','checkout','member','portal','portal-belajar','ajak-teman'];
  const kinds=['HERO','FEATURE_ICON','PRODUCT_IMAGE','PAGE_COVER','NAV_ICON','BRAND_LOGO','PROMO','ANNOUNCEMENT',
    'HIGHLIGHT_PILL','USECASE_CARD','FEATURE_CARD','FEATURE_BULLET','NOTICE_BOX','SERVICE_CARD',
    'BENEFIT_LIST','BENEFIT_BULLET','SECTION_HEADING','CTA_BUTTON','AUTH_COPY','AUTH_FIELD',
    'CHECKOUT_GUIDE','CHECKOUT_STEP','WA_TEMPLATE','MEMBER_COPY','MEMBER_CARD','PORTAL_NOTICE','AFFILIATE_INFO',
    'HERO_ACTION','SECTION_HEADER','FEATURE_ITEM','CHECKOUT_COPY','MEMBER_GREETING','DISCLAIMER','PAGE_COPY','FAQ_ITEM','PORTFOLIO_IMAGE','PORTFOLIO_VIDEO'];
  const textKinds=new Set(kinds.slice(8).filter(k=>!['PORTFOLIO_IMAGE','PORTFOLIO_VIDEO'].includes(k)));
  // Resolve assets against the shared project root, never the current page folder.
  // Works identically for /index.html and /staging/member.html.
  const projectRoot=typeof URL==='function'&&typeof location!=='undefined' ?
    new URL('../',document.currentScript?.src||new URL('js/content-ui.js',location.href)) : null;
  function mediaPath(raw){
    const path=String(raw||'').trim();
    if(!path)return '';
    if(path.length<=500&&/^assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[A-Za-z0-9_=&%-]+)?$/i.test(path)&&
      !path.includes('..')&&!path.includes('//'))return projectRoot?new URL(path,projectRoot).href:'./'+path;
    if(path.length<=2048&&/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{2,5})?(?:\/[A-Za-z0-9!$&'()*+,;=:@%_./~-]*)?(?:\?[A-Za-z0-9!$&'()*+,;=:@%_./?~-]*)?(?:#[A-Za-z0-9_.-]*)?$/i.test(path))return path;
    if(path.length<=45000&&/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(path))return path;
    return '';
  }
  function videoPath(raw){
    const p=String(raw||'').trim();
    if(p.length>500||p.includes('..')||p.replace(/^https:\/\//,'').includes('//')||!/^(?:https:\/\/cuan74468-ux\.github\.io\/(?:ngulik-digital-member\/)?)?assets\/[A-Za-z0-9_./-]+\.(?:mp4|webm)$/i.test(p))return '';
    return p.startsWith('https://')?p:projectRoot?new URL(p,projectRoot).href:'./'+p;
  }
  function editorialRows(contents,kind,placement){
    return (Array.isArray(contents)?contents:[]).filter(x=>x&&x.kind===kind&&x.placement===placement&&(x.status===undefined||x.status==='PUBLISHED')).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  }
  function pageCopy(contents,placement,id){
    return editorialRows(contents,'PAGE_COPY',placement).find(r=>r.content_id===id)||null;
  }
  function portfolio(contents){
    return [...editorialRows(contents,'PORTFOLIO_IMAGE','jasa'),...editorialRows(contents,'PORTFOLIO_VIDEO','jasa')]
      .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)).map(r=>{
      const video=r.kind==='PORTFOLIO_VIDEO',src=video?videoPath(r.image_path):mediaPath(r.image_path);
      if(!src)return '';
      return '<article class="ngdb-package"><div class="ngdb-package-media ngdb-portfolio-image">'+
        (video?'<video controls playsinline preload="none" style="width:100%;max-height:420px" aria-label="'+h(r.title||'Video portofolio')+'" src="'+h(src)+'"></video>':'<img src="'+h(src)+'" alt="'+h(r.title||'Portofolio')+'" loading="lazy" decoding="async">')+
        '</div><div class="ngdb-package-main"><h3>'+h(r.title||'')+'</h3><p>'+h(r.description||'')+'</p></div></article>';
    }).join('');
  }
  function published(contents,kind,placement){
    return (Array.isArray(contents)?contents:[]).filter(x=>x&&x.kind===kind&&
      x.placement===placement&&!!mediaPath(x.image_path));
  }
  function media(contents,kind,placement,cssClass,alt=''){
    const item=published(contents,kind,placement)[0];
    if(!item)return '';
    return '<img class="'+h(cssClass||'content-img')+'" src="'+h(mediaPath(item.image_path))+
      '" alt="'+h(alt||item.title||'')+'" loading="lazy" decoding="async">';
  }
  function hero(contents,placement='home'){
    const target=['catalog','member_home'].includes(placement)?placement:'home';
    const items=published(contents,'HERO',target);
    if(!items.length)return '';
    return '<section class="nh-carousel" aria-label="'+(target==='catalog'?'Banner katalog':'Info Ngulik Digital')+'" data-hero-carousel>'+
      '<div class="nh-carousel-viewport">'+items.map((x,i)=>{
        const route=routes.includes(x.cta_route)?x.cta_route:'';
        return '<article class="nh-hero nh-hero-slide" data-hero-panel="'+i+'" '+
          (i?'hidden aria-hidden="true"':'aria-hidden="false"')+'>'+
          '<img class="nh-hero-image" src="'+h(mediaPath(x.image_path))+'" alt="'+h(x.title||'')+
          '" loading="'+(i?'lazy':'eager')+'" decoding="async">'+
          '<div class="nh-hero-overlay"></div>'+
          (x.title||x.description||x.cta_label?
            '<div class="nh-hero-copy">'+
            (x.title?'<h1>'+h(x.title)+'</h1>':'')+
            (x.description?'<p class="nh-hero-lead">'+h(x.description)+'</p>':'')+
            (route&&x.cta_label?'<button type="button" class="nh-hero-cta" data-route="'+h(route)+'">'+h(x.cta_label)+'</button>':'')+
            '</div>':'')+
          '</article>';
      }).join('')+'</div>'+
      (items.length>1?
        '<div class="nh-carousel-controls" aria-label="Kontrol banner">'+
        '<button type="button" class="nh-carousel-arrow" data-hero-step="-1" aria-label="Banner sebelumnya">‹</button>'+
        '<div class="nh-carousel-dots" role="group" aria-label="Pilih banner">'+
        items.map((x,i)=>'<button type="button" class="nh-carousel-dot" data-hero-index="'+i+
          '" aria-label="Banner '+(i+1)+' dari '+items.length+'" aria-current="'+(i===0?'true':'false')+'"></button>').join('')+
        '</div>'+
        '<button type="button" class="nh-carousel-arrow" data-hero-step="1" aria-label="Banner berikutnya">›</button>'+
        '<button type="button" class="nh-carousel-toggle" data-hero-pause aria-pressed="false">Jeda</button></div>':'')+
      '</section>';
  }
  /* A single catalog campaign renderer shared by public + member storefronts.
   * Admin HERO/catalog rows override this shipped fallback only after publication.
   * No prices, discounts, or commissions are fabricated by the presentation.
   */
  function catalogBanner(contents){
    const rows=published(contents,'HERO','catalog').slice(0,4);
    const defaults=!rows.length;
    const slides=defaults?[{
      title:'Produk digital untuk belajar, berkarya, dan bertumbuh.',
      description:'Jelajahi eBook, template, tools AI, aplikasi kasir, dan layanan untuk kebutuhan usaha Anda.',
      image_path:'assets/media/ngd-catalog-v9-wide.webp',
      cta_label:'Jelajahi Produk',cta_route:'',default_art:true
    }]:rows;
    const html=slides.map((item,i)=>{
      const route=routes.includes(item.cta_route)?item.cta_route:'';
      const picture=item.default_art?
        '<picture class="ngd-catalog-campaign-picture" aria-hidden="true">'+
          '<source media="(max-width:700px)" srcset="'+h(mediaPath('assets/media/ngd-catalog-v9-mobile.webp'))+'">'+
          '<img src="'+h(mediaPath(item.image_path))+'" alt="" loading="'+(i?'lazy':'eager')+'" decoding="async">'+
        '</picture>':
        '<div class="ngd-catalog-campaign-picture" aria-hidden="true"><img src="'+
          h(mediaPath(item.image_path))+'" alt="" loading="'+(i?'lazy':'eager')+
          '" decoding="async"></div>';
      const headline=String(item.title||'Temukan Produk Digital Pilihan');
      const detail=String(item.description||'eBook, tools AI, sistem, dan layanan untuk UMKM.');
      const button=route?
        '<button type="button" class="ngd-catalog-campaign-cta" data-route="'+h(route)+'">'+
          h(item.cta_label||'Lihat Produk')+' <span aria-hidden="true">→</span></button>':
        item.default_art?
        '<button type="button" class="ngd-catalog-campaign-cta" data-market-browse>'+
          h(item.cta_label)+' <span aria-hidden="true">→</span></button>':'';
      return '<article class="ngd-catalog-campaign-slide" data-hero-panel="'+i+'"'+
        (i?' hidden aria-hidden="true"':' aria-hidden="false"')+'>'+
        picture+
        '<div class="ngd-catalog-campaign-copy">'+
          '<p class="ngd-catalog-campaign-kicker">NGULIK DIGITAL · MARKETPLACE PRODUK DIGITAL</p>'+
          '<h2>'+h(headline)+'</h2>'+
          '<p class="ngd-catalog-campaign-description">'+h(detail)+'</p>'+
          '<div class="ngd-catalog-campaign-actions">'+button+
            '<span class="ngd-catalog-campaign-benefit">Produk & layanan untuk UMKM</span>'+
          '</div>'+
        '</div>'+
      '</article>';
    }).join('');
    const controls=slides.length>1?
      '<div class="ngd-catalog-campaign-controls" aria-label="Kontrol banner katalog">'+
        '<button type="button" data-hero-step="-1" aria-label="Banner sebelumnya">‹</button>'+
        '<div class="ngd-catalog-campaign-dots">'+slides.map((_,i)=>
          '<button type="button" data-hero-index="'+i+'" aria-label="Banner '+(i+1)+
          ' dari '+slides.length+'" aria-current="'+(i===0?'true':'false')+'"></button>'
        ).join('')+'</div>'+
        '<button type="button" data-hero-step="1" aria-label="Banner berikutnya">›</button>'+
        '<button type="button" data-hero-pause aria-pressed="false">Jeda</button>'+
      '</div>':'';
    return '<section class="ngd-catalog-campaign" data-hero-carousel aria-label="Penawaran katalog Ngulik Digital"'+
      (defaults?' data-catalog-banner-source="default"':' data-catalog-banner-source="admin"')+'>'+
      '<div class="ngd-catalog-campaign-viewport">'+html+'</div>'+controls+'</section>';
  }
  function promotion(contents,placement='member_home'){
    const items=(Array.isArray(contents)?contents:[]).filter(x=>x&&
      ['PROMO','ANNOUNCEMENT'].includes(String(x.kind||''))&&
      x.placement===placement);
    if(!items.length)return '';
    return '<section class="ngd-promo-strip" aria-label="Info terbaru">'+items.map(x=>{
      const kind=x.kind==='ANNOUNCEMENT'?'PENGUMUMAN':'PROMO PILIHAN';
      const route=String(x.cta_route||'').replace(/^#/,'');
      const dest=routes.includes(route)?route:'';
      const image=mediaPath(x.image_path);
      return '<article class="ngd-promo-item">'+
        (image?'<img class="ngd-promo-image" src="'+h(image)+'" loading="lazy" alt="'+h(x.title||'')+'">':'')+
        '<div class="ngd-promo-copy"><span class="eyebrow">'+kind+'</span>'+
        (x.title?'<h2>'+h(x.title)+'</h2>':'')+
        (x.description?'<p>'+h(x.description)+'</p>':'')+
        (dest?'<button type="button" class="btn btn-secondary btn-sm" data-route="'+h(dest)+'">'+
          h(x.cta_label||'Lihat selengkapnya')+' ↗</button>':'')+'</div></article>';
    }).join('')+'</section>';
  }
  function cover(contents,route){
    const item=published(contents,'PAGE_COVER',route)[0];
    if(!item)return '';
    return '<section class="native-page-cover" aria-label="'+h(item.title||'Gambar halaman')+'">'+
      '<img src="'+h(mediaPath(item.image_path))+'" alt="'+h(item.title||'')+'" loading="lazy" decoding="async">'+
      ((item.title||item.description)?'<div class="native-page-cover-caption">'+
        (item.title?'<h2>'+h(item.title)+'</h2>':'')+
        (item.description?'<p>'+h(item.description)+'</p>':'')+'</div>':'')+
      '</section>';
  }
  const names={HERO:'Banner hero',FEATURE_ICON:'Ikon fitur',PRODUCT_IMAGE:'Gambar produk',
    PAGE_COVER:'Sampul halaman',NAV_ICON:'Ikon navigasi',BRAND_LOGO:'Logo',
    PROMO:'Promosi',ANNOUNCEMENT:'Pengumuman',
    HIGHLIGHT_PILL:'Poin keunggulan',USECASE_CARD:'Kartu kegunaan',
    FEATURE_CARD:'Kartu Starter Pack',FEATURE_BULLET:'Manfaat Starter Pack',
    NOTICE_BOX:'Catatan kejujuran',SERVICE_CARD:'Layanan tambahan',
    BENEFIT_LIST:'Judul keuntungan member',BENEFIT_BULLET:'Keuntungan member',
    SECTION_HEADING:'Judul bagian',CTA_BUTTON:'Tombol tambahan',
    AUTH_COPY:'Teks masuk / daftar',AUTH_FIELD:'Label formulir',
    CHECKOUT_GUIDE:'Panduan pembayaran',CHECKOUT_STEP:'Langkah QRIS',
    WA_TEMPLATE:'Pesan WhatsApp',MEMBER_COPY:'Sapaan member',MEMBER_CARD:'Menu member',
    PORTAL_NOTICE:'Disclaimer portal',AFFILIATE_INFO:'Informasi ajak teman',
     HERO_ACTION:'Tombol beranda',SECTION_HEADER:'Judul seksi',FEATURE_ITEM:'Rincian paket',
     CHECKOUT_COPY:'Instruksi QRIS',MEMBER_GREETING:'Sapaan member',DISCLAIMER:'Disclaimer resmi',PAGE_COPY:'Narasi halaman',FAQ_ITEM:'Pertanyaan & jawaban',PORTFOLIO_IMAGE:'Portofolio foto',PORTFOLIO_VIDEO:'Portofolio video'};
  const places=[
    ['HERO','home','Beranda publik'],['HERO','catalog','Banner promosi marketplace publik'],['HERO','member_home','Beranda member'],
    ...['belajar','aplikasi','ai','jasa','katalog','affiliate','dukungan','login']
      .map(x=>['FEATURE_ICON',x,'Ikon fitur '+x]),
    ...routes.map(x=>['NAV_ICON',x,'Navigasi '+x]),
    ...['belajar','katalog','jasa','ai','affiliate','dukungan']
      .map(x=>['PAGE_COVER',x,'Sampul '+x]),
    ...['home','catalog','member_home','ai','belajar'].flatMap(p=>[['PROMO',p,'Promosi '+p],['ANNOUNCEMENT',p,'Pengumuman '+p]]),
    ...['jasa','dukungan','ai'].map(p=>['PAGE_COPY',p,'Narasi '+p]),
    ['FAQ_ITEM','dukungan','FAQ Bantuan'],
    ['PORTFOLIO_IMAGE','jasa','Foto portofolio Jasa'],['PORTFOLIO_VIDEO','jasa','Video portofolio Jasa'],
    ['BRAND_LOGO','brand','Logo Ngulik Digital'],
    ...[...textKinds].filter(k=>!['PAGE_COPY','FAQ_ITEM'].includes(k)).flatMap(kind=>['home','auth','checkout','member_home',
      'member_portal','member_affiliate'].map(place=>[kind,place,'Konten '+place]))
  ];
  function admin(ctx){
    if(!ctx.authorized)return '<div class="empty"><h3>Khusus Admin</h3></div>';
    const rows=Array.isArray(ctx.items)?ctx.items:[];
    const selected=rows.find(x=>x.content_id===ctx.selectedId)||null;
    // Admin "Foto produk" shortcut pre-fills this existing CMS editor.
    const product=String(ctx.defaultPlacement||'');
    const productValid=/^P-[A-Za-z0-9-]{2,60}$/.test(product)&&
      (Array.isArray(ctx.products)?ctx.products:[]).some(p=>p.product_id===product);
    const preferred=['home','catalog','member_home'].includes(product)?product:'catalog';
    const draft=selected||{kind:productValid?'PRODUCT_IMAGE':'HERO',
      placement:productValid?product:preferred,title:'',description:'',
      image_path:productValid?'':preferred==='catalog'?
        'assets/media/ngd-catalog-v9-wide.webp':'assets/media/ngd-v6-hero.webp',
      cta_label:'',cta_route:'',sort_order:rows.length+1,start_date:'',end_date:''};
    const legacy=!!selected&&!kinds.includes(selected.kind);
    const catalogRows=rows.filter(x=>x.kind==='HERO'&&x.placement==='catalog');
    const publishedCatalog=catalogRows.filter(x=>x.status==='PUBLISHED');
    const coverState=publishedCatalog.length?
      'Terdapat '+publishedCatalog.length+' banner PUBLISHED (jadwal tayang tetap diperiksa runtime).':
      'Belum ada HERO katalog terbit. Website memakai banner bawaan yang konsisten.';
    const presets=[
      ['Banner Katalog V9','assets/media/ngd-catalog-v9-wide.webp','HERO'],
      ['Showcase Produk','assets/media/ngd-v6-hero.webp','HERO'],
      ['eBook','assets/media/ngd-v6-ebook.webp','PRODUCT_IMAGE'],
      ['Starter Pack','assets/media/ngd-v6-starter.webp','PRODUCT_IMAGE'],
      ['Paket 3-in-1','assets/media/ngd-v6-bundle.webp','PRODUCT_IMAGE'],
      ['Sistem POS','assets/media/ngd-v8-pos.webp','PRODUCT_IMAGE'],
      ['Video AI','assets/media/ngd-v8-video.webp','PRODUCT_IMAGE'],
      ['Integrasi GAS','assets/media/ngd-v8-gas.webp','PRODUCT_IMAGE'],
      ['Kredit AI','assets/media/ngd-v8-ai-small.webp','PRODUCT_IMAGE'],
      ['Template','assets/media/ngd-v8-templates.webp','PRODUCT_IMAGE']
    ];
    const allowedPlaces=places.slice();
    if(Array.isArray(ctx.products))
      ctx.products.forEach(p=>{
        if(/^P-[A-Za-z0-9-]{2,60}$/.test(String(p.product_id||'')))
          allowedPlaces.push(['PRODUCT_IMAGE',p.product_id,p.nama]);
      });
    if(!allowedPlaces.some(p=>p[0]===draft.kind&&p[1]===draft.placement))
      allowedPlaces.push([draft.kind,draft.placement,draft.placement]);
    const locked=ctx.enabled!==true;
    const form='<section class="surface content-editor" aria-label="Editor konten visual">'+
      '<div class="content-editor-heading"><div><p class="eyebrow">EDIT KONTEN</p><h2>'+
      (selected?'Ubah konten':'Tambah konten')+'</h2></div>'+
      (selected?'<button type="button" class="btn btn-secondary btn-sm" data-content-new>Tambah baru</button>':'')+'</div>'+
      '<div class="ngd-media-help"><div><strong>Panduan gambar menurut fungsi halaman</strong><p>Hero Beranda: artwork lanskap 1600 × 900 px, subjek di kanan dan ruang teks di kiri. Banner Katalog: 1600 × 640 px; gambar memenuhi latar, teks di atas overlay. Periksa crop pada HP. Produk: 1200 × 1000 px, fokus produk di tengah. Sampul halaman: ilustrasi relevan, bukan salinan banner Beranda. Jangan masukkan harga, testimoni, atau tombol palsu ke gambar.</p><p>CMS saat ini menggunakan satu gambar per penempatan untuk HP dan desktop. Periksa keduanya pada pratinjau sebelum terbit.</p></div>'+ 
      '<a class="btn btn-secondary btn-sm" href="https://github.com/cuan74468-ux/ngulik-digital-member/upload/main/assets/media" target="_blank" rel="noopener noreferrer">Unggah gambar ↗</a></div>'+
      '<form id="content-editor-form" data-content-id="'+h(selected?.content_id||'')+'" data-content-revision="'+h(selected?.revision||'')+'" class="content-form">'+
      '<div class="field"><label for="content-id">ID konten (opsional; tetap setelah dibuat)</label>'+
      '<input class="input" id="content-id" name="content_id" maxlength="64" '+
      (selected?'readonly ':'placeholder="CNT-HERO-MAIN" ')+
      'value="'+h(selected?.content_id||'')+'"></div>'+
      '<div class="grid-2"><div class="field"><label for="content-kind">Jenis konten</label>'+
      (selected?'<input class="input" value="'+h(names[draft.kind]||draft.kind)+'" disabled>'+
        '<input type="hidden" name="kind" value="'+h(draft.kind)+'">':
        '<select class="input" name="kind" id="content-kind">'+
        kinds.map(k=>'<option value="'+k+'" '+(draft.kind===k?'selected':'')+'>'+names[k]+'</option>').join('')+'</select>')+
      '</div><div class="field"><label for="content-placement">Tampil di</label>'+
      '<select class="input" id="content-placement" name="placement" required aria-label="Pilih lokasi tayang">'+
        allowedPlaces.map(p=>'<option value="'+h(p[1])+'" data-content-kind="'+h(p[0])+'" '+
          (p[0]!==draft.kind?'hidden disabled ':'')+
          (draft.kind===p[0]&&draft.placement===p[1]?'selected':'')+'>'+h(p[2])+'</option>').join('')+
      '</select></div></div>'+
      '<div class="field"><label for="content-image">Alamat media (gambar atau MP4/WebM milik studio)</label>'+
      '<input class="input" id="content-image" name="image_path" maxlength="45000" placeholder="assets/media/ngd-catalog-v9-wide.webp" value="'+h(draft.image_path||'')+'">'+
      '<p class="form-hint">Admin menyimpan alamat media, bukan file biner. Video memakai jenis Portofolio video, file MP4/WebM di GitHub Pages milik studio. Periksa akses publik sebelum tayang.</p></div>'+
      '<div class="ngd-cms-art-presets" aria-label="Pilihan artwork siap pakai">'+
        '<strong>Artwork resmi Ngulik Digital</strong>'+
        '<div class="ngd-cms-art-grid">'+presets.map(p=>
          '<button type="button" class="ngd-cms-preset" data-content-asset="'+h(p[1])+'" '+
            (locked||legacy?'disabled':'')+'><img src="'+h(mediaPath(p[1]))+
            '" alt="" loading="lazy"><span>'+h(p[0])+'</span></button>'
        ).join('')+'</div></div>'+
      '<div class="field"><label for="content-title">Judul / teks gambar</label>'+
      '<input class="input" id="content-title" name="title" maxlength="'+(textKinds.has(draft.kind)?'1600':'120')+'" value="'+h(draft.title||'')+'"></div>'+
      '<div class="field"><label for="content-description">'+
      (draft.kind==='PRODUCT_IMAGE'?'Badge produk (opsional, maks 24 karakter)':'Deskripsi (opsional)')+'</label>'+
      '<textarea class="input" id="content-description" name="description" maxlength="'+
      (draft.kind==='PRODUCT_IMAGE'?'24':textKinds.has(draft.kind)?'1600':'400')+'" rows="3">'+h(draft.description||'')+'</textarea></div>'+
      '<div class="grid-2"><div class="field"><label for="content-cta">Label tombol</label>'+
      '<input class="input" id="content-cta" name="cta_label" maxlength="48" value="'+h(draft.cta_label||'')+'"></div>'+
      '<div class="field"><label for="content-route">Halaman tujuan</label>'+
      '<select class="input" id="content-route" name="cta_route"><option value="">Tanpa tombol</option>'+
      routes.map(k=>'<option value="'+k+'" '+(String(draft.cta_route||'').replace(/^#/,'')===k?'selected':'')+'>'+k+'</option>').join('')+
      '</select></div></div>'+
      '<div class="grid-2"><div class="field"><label for="content-order">Urutan</label>'+
      '<input class="input" type="number" min="1" max="10000" step="1" name="sort_order" id="content-order" required value="'+h(draft.sort_order??1)+'"></div>'+
      '<div class="field"><label for="content-start">Mulai tayang</label>'+
      '<input class="input" type="date" name="start_date" id="content-start" value="'+h(draft.start_date||'')+'"></div></div>'+
      '<div class="field"><label for="content-end">Akhir tayang</label>'+
      '<input class="input" type="date" name="end_date" id="content-end" value="'+h(draft.end_date||'')+'"></div>'+
      '<div class="ngd-cms-live-preview" aria-label="Pratinjau artwork sebelum terbit">'+
        '<strong>Pratinjau banner: desktop dan HP</strong>'+
        '<div class="ngd-cms-preview-grid">'+['desktop','mobile'].map(device=>
          '<figure class="ngd-cms-preview-'+device+'">'+
            '<div class="ngd-cms-preview-image"><img data-content-preview-image src="'+
              h(draft.kind==='PORTFOLIO_VIDEO'?'':mediaPath(draft.image_path)||mediaPath('assets/media/ngd-catalog-v9-wide.webp'))+
              '" alt="" loading="lazy" '+(draft.kind==='PORTFOLIO_VIDEO'?'hidden':'')+'>'+ 
              '<span data-content-preview-title>'+h(draft.title||'Judul banner Anda')+'</span>'+
            '</div><figcaption>'+h(device==='desktop'?'Tampilan PC':'Tampilan HP')+'</figcaption></figure>'
        ).join('')+'</div>'+
        '<div><video data-content-preview-video controls playsinline preload="none" style="max-width:100%;max-height:320px" '+(draft.kind==='PORTFOLIO_VIDEO'&&videoPath(draft.image_path)?'src="'+h(videoPath(draft.image_path))+'"':'hidden')+'></video></div>'+
        '<p class="form-hint">Desktop dan HP menggunakan latar penuh untuk banner. Pratinjau ini bukan simulasi semua halaman. Periksa subjek, kontras, panjang judul, dan tombol sebelum terbit. Jangan menerbitkan gambar yang belum teruji.</p>'+
      '</div>'+
      (selected?.status==='PUBLISHED'?'<p class="ngd-cms-published-warning">Konten sedang tayang. Pilih Tarik tayang pada daftar, kemudian edit draf dan terbitkan ulang setelah pratinjau.</p>':'')+
      (legacy?'<p class="ngd-cms-legacy-warning">Konten lama tipe '+h(selected.kind)+' tidak mendukung penyuntingan. Tarik/arsipkan lalu buat banner HERO baru.</p>':'')+
      '<button class="btn btn-primary" type="submit" '+(locked||legacy||['PUBLISHED','ARCHIVED'].includes(selected?.status)?'disabled':'')+'>'+(selected?'Simpan perubahan':'Simpan draf')+'</button>'+
      (locked?'<p class="form-hint">Mode baca-saja. Penyimpanan memerlukan STAGING terverifikasi dan izin mutasi backend; tidak ada perubahan yang dikirim.</p>':'')+
      '</form></section>';
    const rowsHtml='<section class="content-admin-list" aria-label="Daftar gambar dan banner">'+
      (rows.length?rows.map(x=>{
        const url=x.kind==='PORTFOLIO_VIDEO'?'':mediaPath(x.image_path),status=String(x.status||'DRAFT');
        const action=status==='PUBLISHED'?'DRAFT':status==='ARCHIVED'?'DRAFT':'PUBLISHED';
        const caption=status==='PUBLISHED'?'Tarik tayang':status==='ARCHIVED'?'Pulihkan draft':'Terbitkan';
        return '<article class="content-admin-item">'+
          (url?'<img src="'+h(url)+'" alt="'+h(x.title||'')+'" loading="lazy">':'')+
          '<div class="content-admin-copy"><span class="chip">'+h(names[x.kind]||x.kind)+' · '+h(status)+'</span>'+
          '<strong>'+h(x.title||x.placement||'Belum ada judul')+'</strong>'+
          '<small>Lokasi: '+h(x.placement)+' · Urutan '+h(x.sort_order||'')+
          ((x.start_date||x.end_date)?' · '+h(x.start_date||'—')+' s.d. '+h(x.end_date||'—'):'')+'</small>'+
          '<div class="content-admin-actions">'+
          '<button type="button" class="btn btn-secondary btn-sm" data-content-edit="'+h(x.content_id)+'">Edit</button>'+
          '<button type="button" class="btn btn-secondary btn-sm" data-content-id="'+h(x.content_id)+
          '" data-content-status="'+action+'" '+(locked?'disabled':'')+'>'+caption+'</button>'+
          (status!=='ARCHIVED'?'<button type="button" class="btn btn-ghost btn-sm" data-content-id="'+
            h(x.content_id)+'" data-content-status="ARCHIVED" '+(locked?'disabled':'')+'>Arsipkan</button>':'')+
          '</div></div></article>';
      }).join(''):'<div class="empty"><h3>Belum Ada Gambar</h3><p>Gambar dan banner yang Anda tambah akan muncul di sini.</p></div>')+
      '</section>';
    return '<section class="content-admin-heading"><p class="eyebrow">ADMIN / KONTEN</p>'+
      '<h1>Kelola Konten & Media</h1><p>Atur narasi, gambar, video portofolio, tombol, dan jadwal tayang.</p>'+
      '<span class="chip">'+rows.length+' konten tersimpan</span></section>'+
      '<section class="ngd-cms-campaign-status" aria-label="Status kampanye katalog">'+
        '<div><p class="eyebrow">BANNER KATALOG</p><strong>'+h(coverState)+'</strong>'+
        '<p>HERO · katalog · maksimal 4 banner aktif; urutan dan jadwal diatur pada form.</p>'+
        (rows.some(x=>x.kind==='BANNER')?'<small>Ada banner format lama (BANNER) yang tidak lagi didukung sebagai HERO. Anda dapat mengarsipkannya.</small>':'')+
        '</div><button type="button" class="btn btn-primary" data-content-create="catalog" '+(locked?'disabled':'')+'>Buat Banner Katalog</button>'+
      '</section>'+
      '<details class="surface"><summary>Panduan slot narasi dan portofolio</summary><p>Jenis Narasi halaman: isi ID CNT-JASA-HERO, CNT-JASA-PORTFOLIO, CNT-JASA-PACKAGES, CNT-JASA-PROCESS, CNT-JASA-STEP-01 hingga 03, CNT-JASA-FINAL (lokasi jasa); CNT-HELP-HERO, CNT-HELP-STEPS, CNT-HELP-STEP-01 hingga 03, CNT-HELP-FAQ, CNT-HELP-FINAL (dukungan); CNT-AI-INTRO (ai). FAQ Bantuan dan portofolio foto/video memakai ID unik, urutan, dan tanggal tayang. Untuk video asli gunakan ID VID-PORT-01, VID-PORT-02 atau VID-PORT-03, jenis Video portofolio Jasa, lokasi jasa, judul/deskripsi sesuai karya, dan path MP4/WebM milik studio di assets/media/. Isi path hanya setelah file tersedia; urutkan 10, 20, 30. Periksa pratinjau; gunakan DRAFT lalu Terbitkan setelah gerbang CMS diizinkan. Video diputar atas tindakan pengunjung, tanpa autoplay. Jangan memasukkan tautan Drive/YouTube atau menerbitkan slot kosong. Slot kosong memakai teks standar; pengaman akun dan pembayaran tidak dapat diubah lewat CMS.</p></details>'+
      '<div class="content-admin-layout">'+rowsHtml+form+'</div>';
  }
  window.NGD_CONTENT_UI=Object.freeze({mediaPath,videoPath,editorialRows,pageCopy,portfolio,published,media,hero,catalogBanner,promotion,cover,admin});
})();
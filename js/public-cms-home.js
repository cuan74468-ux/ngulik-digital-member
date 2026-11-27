/* Ngulik Digital public home: published CMS data only, no sales fallback text.
 * Rendering is pure, protects against HTML injection, and never creates orders.
 */
(function(global){
  'use strict';
  const escape=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed=new Set(['beranda','katalog','jasa','ai','dukungan','belajar',
    'affiliate','login','daftar','masuk']);
  const photo=raw=>global.NGD_CONTENT_UI?.mediaPath(raw)||'';
  function route(row){
    const id=String(row?.cta_route||'').replace(/^#/,'').trim().toLowerCase();
    return allowed.has(id)?id==='masuk'?'login':id:'';
  }
  // The published STAGING rows predate this renderer. Recognize their declared
  // editorial kind aliases without mutating Sheet IDs or content.
  const kindAliases=Object.freeze({
    CTA_BUTTON:['HERO_ACTION'],SECTION_HEADING:['SECTION_HEADER'],
    FEATURE_BULLET:['FEATURE_ITEM']
  });
  const idAliases=Object.freeze({
    'CNT-SECTION-USECASES':'CNT-USECASE-HEADER',
    'CNT-SECTION-SERVICES':'CNT-NEXT-HEADER'
  });
  function list(items,kind,placement){
    return (Array.isArray(items)?items:[])
      .filter(x=>x&&(x.kind===kind||(kindAliases[kind]||[]).includes(x.kind))&&x.placement===placement&&
        (x.status===undefined||x.status==='PUBLISHED'))
      .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  }
  function entry(items,id,kind,place){
    return list(items,kind,place).find(x=>x.content_id===id||x.content_id===idAliases[id]);
  }
  function button(row,css){
    const to=route(row),label=String(row?.cta_label||'').trim();
    if(!to||!label)return '';
    return '<button type="button" class="'+css+'" data-route="'+
      escape(to)+'">'+escape(label)+'</button>';
  }
  function card(item,css){
    const url=photo(item.image_path),to=route(item);
    return '<article class="'+css+'">'+
      (url?'<div class="ngdl-offer-image"><img src="'+escape(url)+
        '" alt="'+escape(item.title)+'" loading="lazy" decoding="async"></div>':'')+
      '<div class="ngdl-offer-body"><h3>'+escape(item.title||'')+'</h3>'+
      (item.description?'<p>'+escape(item.description)+'</p>':'')+
      (to&&item.cta_label?button(item,'ngdl-offer-link'):'')+
      '</div></article>';
  }
  // Compatibility correction for the exact published legacy home copy.
  // Keep unrelated or subsequently edited CMS content intact; no data mutation.
  function clarifyEntry(row){
    if(!row)return row;
    if(row.content_id==="CNT-STARTER-ITEM-01"&&row.description==="Saldo awal untuk langsung mencoba pembuatan materi promosi dan visual usaha.")
      return {...row,description:"15 Kredit AI dicatat setelah Starter Pack lunas. Penggunaan kredit Premium menunggu aktivasi; Wrapper sementara tidak memotong kredit."};
    if(row.content_id==="CNT-NEXT-01"&&row.description==="Isi ulang saldo kredit sesuai kebutuhan produksi konten Anda tanpa ikatan langganan bulanan.")
      return {...row,description:"Top-up Kredit AI disiapkan untuk Studio AI Premium. Pembelian belum dibuka sampai layanan dan tarif siap.",title:row.title==="Top-Up Kredit Tools AI — Mulai Rp10.000"?"Top-Up Kredit AI — Belum Dibuka":row.title};
    if(row.content_id==="CNT-USECASE-01"&&row.description==="Bikin foto produk lebih menarik tanpa studio mahal. Gunakan tools AI mandiri atau serahkan ke jasa foto produk komersil kami.")
      return {...row,description:"Buat visual promosi melalui Wrapper AI yang tersedia saat uji coba, atau pilih jasa kreatif sesuai kebutuhan."};
    if(row.content_id==="CNT-USECASE-02"&&row.description==="Susun caption media sosial, deskripsi marketplace, dan skrip promosi dalam hitungan detik langsung dari HP.")
      return {...row,description:"Siapkan caption, deskripsi produk dan materi promosi dari HP. Gunakan alat yang tersedia sesuai kuota dan ketentuan penyedia.",title:row.title==="Konten Jualan & Balasan Chat Otomatis"?"Konten Jualan & Materi Promosi":row.title};
    if(row.content_id==='CNT-STARTER-ITEM-04'&&row.title==='Komisi Ajak Teman'&&row.description==="Rp5.000 untuk Starter Pack lunas dari teman yang Anda ajak, ditambah komisi pembelian berikutnya sesuai tarif produk dan syarat program.")
      return {...row,title:"Komisi Penjualan",description:"Komisi Rp5.000 dari Starter Pack dan komisi pembelian berikutnya sesuai tarif produk serta ketentuan program."};
    if(row.content_id==='CNT-STARTER-ITEM-04'&&row.description==="Komisi Rp5.000 untuk setiap rekan usaha yang bergabung melalui tautan rujukan Anda.")
      return {...row,description:"Dapatkan Rp5.000 dari setiap Starter Pack lunas pelanggan yang Anda ajak, serta komisi transaksi berikutnya sesuai tarif produk."};
    if(row.content_id==='CNT-HERO-MAIN'&&row.cta_label==='Mulai Tiket Masuk — Rp15.000'&&route(row)==='daftar')
      return {...row,cta_label:'Daftar Akun Gratis',description:row.description==="Gunakan tools AI, template siap pakai, dan akses belajar terarah di Ngulik Digital untuk merapikan promosi dan operasional usaha Anda."?"Gunakan tools AI, template siap pakai, dan akses belajar terarah di Ngulik Digital untuk merapikan promosi dan operasional usaha Anda. Daftar akun gratis. Starter Pack Rp15.000 dibeli terpisah setelah masuk.":row.description};
    if(row.content_id==='CNT-HERO-SECONDARY'&&row.cta_label==='Masuk Member'&&route(row)==='login'&&row.description==='Sudah terdaftar? Masuk dengan nomor WhatsApp Anda.')
      return {...row,cta_label:'Sudah Punya Akun? Masuk'};
    if(row.content_id==='CNT-STARTER-MAIN'&&row.cta_label==='Ambil Tiket Masuk — Rp15.000'&&route(row)==='daftar')
      return {...row,title:row.title==='Tiket Masuk Awal: Starter Pack Rp15.000'?'Starter Pack — Rp15.000':row.title,
        description:row.description==="Langkah pertama masuk ke ekosistem Ngulik Digital dengan fasilitas awal untuk mulai praktik."?"Pendaftaran akun gratis. Starter Pack merupakan paket berbayar terpisah untuk memperoleh manfaat paket setelah pembayaran terverifikasi.":row.description,
        cta_label:'Lihat Starter Pack',cta_route:'#katalog'};
    return row;
  }
  function home(items,settings){
    const hero=clarifyEntry(entry(items,'CNT-HERO-MAIN','HERO','home'));
    if(!hero)return '<div class="ngd-landing-v1" aria-live="polite">'+
      '<h1>Ngulik Digital</h1><p>Konten belum tersedia.</p>'+
      '<button type="button" data-route="katalog">Buka Katalog</button>'+
      '<button type="button" data-route="dukungan">Bantuan</button></div>';
    const pills=list(items,'HIGHLIGHT_PILL','home');
    const cases=list(items,'USECASE_CARD','home').map(clarifyEntry);
    const starter=clarifyEntry(entry(items,'CNT-STARTER-MAIN','FEATURE_CARD','home'));
    const bullets=list(items,'FEATURE_BULLET','home').map(clarifyEntry);
    const honesty=entry(items,'CNT-HONESTY-BOX','NOTICE_BOX','home');
    const services=list(items,'SERVICE_CARD','home').map(clarifyEntry);
    const benefit=entry(items,'CNT-MEMBER-BENEFIT','BENEFIT_LIST','home');
    const benefits=list(items,'BENEFIT_BULLET','home');
    // Doc06 STAGING also permits four items packed into the section's
    // description separated by " | ". Derive each item from stored text only.
    const benefitItems=benefits.length?benefits:
      String(benefit?.description||'').split(/\s*\|\s*/).map(segment=>{
        const clean=segment.replace(/^\d+\.\s*/,'').trim();
        const cut=clean.indexOf(' — ');
        return cut<0?{title:clean,description:''}:
          {title:clean.slice(0,cut),description:clean.slice(cut+3)};
      }).filter(x=>x.title);
    const second=clarifyEntry(entry(items,'CNT-HERO-SECONDARY','CTA_BUTTON','home'));
    const useHeading=entry(items,'CNT-SECTION-USECASES','SECTION_HEADING','home');
    const svcHeading=entry(items,'CNT-SECTION-SERVICES','SECTION_HEADING','home');
    const title=t=>t?'<h2>'+escape(t.title||'')+'</h2>':'';
    const heroImage=photo(hero.image_path);
    const heading=String(settings?.tagline_brand||'');
    const footerA=String(settings?.footer_identitas||'');
    const footerB=String(settings?.footer_aksesibilitas||'');
    return '<div class="ngd-landing-v1 ngd-cms-landing">'+
      '<section class="ngdl-hero" aria-labelledby="ngdl-title">'+
        '<div class="ngdl-hero-copy">'+
          (heading?'<p class="ngdl-eyebrow">'+escape(heading)+'</p>':'')+
          '<h1 id="ngdl-title">'+escape(hero.title||'')+'</h1>'+
          (hero.description?'<p class="ngdl-hero-lead">'+escape(hero.description)+'</p>':'')+
          '<div class="ngdl-actions">'+button(hero,'ngdl-btn ngdl-btn-gold')+
            button(second,'ngdl-btn ngdl-btn-ghost')+'</div>'+
        '</div>'+
        (heroImage?'<img src="'+escape(heroImage)+'" alt="" class="ngd-cms-hero-art" loading="eager" fetchpriority="high" width="1200" height="800">':'')+
      '</section>'+
      (pills.length?'<div class="ngdl-trust" aria-label="Informasi layanan">'+
        pills.map(x=>'<span>'+escape(x.title||'')+'</span>').join('')+'</div>':'')+
      (cases.length?'<section class="ngdl-offers" aria-labelledby="ngd-cms-use-title">'+
        '<div class="ngdl-section-top"><h2 id="ngd-cms-use-title">'+
        escape(useHeading?.title||'')+'</h2></div>'+
        '<div class="ngdl-grid">'+cases.map(x=>card(x,'ngdl-offer')).join('')+'</div>'+
      '</section>':'')+
      (starter?'<section class="ngdl-story" aria-label="'+escape(starter.title||'')+'">'+
        '<div class="ngdl-story-intro">'+title(starter)+(starter.description?'<p>'+escape(starter.description)+'</p>':'')+
        button(starter,'ngdl-btn ngdl-btn-gold')+'</div>'+
        (bullets.length?'<ul>'+bullets.map(x=>
          '<li><strong>'+escape(x.title||'')+'</strong>'+(x.description?'<span>'+escape(x.description)+'</span>':'')+'</li>').join('')+
        '</ul>':'')+'</section>':'')+
      (honesty?'<section class="ngdl-benefits" aria-label="'+escape(honesty.title||'')+'">'+
        title(honesty)+'<p>'+escape(honesty.description||'')+'</p></section>':'')+
      (services.length?'<section class="ngdl-offers" aria-labelledby="ngd-cms-svc-title">'+
        '<div class="ngdl-section-top"><h2 id="ngd-cms-svc-title">'+
        escape(svcHeading?.title||'')+'</h2></div>'+
        '<div class="ngdl-grid">'+services.map(x=>card(x,'ngdl-offer')).join('')+'</div>'+
      '</section>':'')+
      (benefit?'<section class="ngdl-benefits">'+title(benefit)+
        '<ul>'+benefitItems.map(x=>'<li><strong>'+escape(x.title||'')+
        '</strong>'+(x.description?'<span>'+escape(x.description)+'</span>':'')+'</li>').join('')+'</ul></section>':'')+
      ((footerA||footerB)?'<footer class="ngdl-end">'+
        (footerA?'<strong>'+escape(footerA)+'</strong>':'')+
        (footerB?'<p>'+escape(footerB)+'</p>':'')+'</footer>':'')+
      '</div>';
  }
  global.NGD_PUBLIC_CMS=Object.freeze({home,list,route});
})(window);

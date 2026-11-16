/* Ngulik Digital — media-first editorial UI (no frameworks or external CDN).
 * Content originates in an authenticated Google Sheets CMS. All asset paths
 * may use local assets, HTTPS URLs or raster data URIs; no inline SVG campaigns.
 */
(function(){
  'use strict';
  const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const routes=['beranda','belajar','katalog','jasa','ai','affiliate','dukungan','login','akun'];
  const kinds=['HERO','FEATURE_ICON','PRODUCT_IMAGE','PAGE_COVER','NAV_ICON','BRAND_LOGO'];
  function mediaPath(raw){
    const path=String(raw||'').trim();
    if(!path)return '';
    if(path.length<=500&&/^assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[A-Za-z0-9_=&%-]+)?$/i.test(path)&&
      !path.includes('..')&&!path.includes('//'))return './'+path;
    if(path.length<=2048&&/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{2,5})?(?:\/[A-Za-z0-9!$&'()*+,;=:@%_./~-]*)?(?:\?[A-Za-z0-9!$&'()*+,;=:@%_./?~-]*)?(?:#[A-Za-z0-9_.-]*)?$/i.test(path))return path;
    if(path.length<=45000&&/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(path))return path;
    return '';
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
  function hero(contents){
    const items=published(contents,'HERO','home');
    if(!items.length)return '';
    return '<section class="nh-carousel" aria-label="Promosi Ngulik Digital" data-hero-carousel>'+
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
  function cover(contents,route){
    const item=published(contents,'PAGE_COVER',route)[0];
    if(!item)return '';
    return '<section class="native-page-cover" aria-label="'+h(item.title||'Ilustrasi halaman')+'">'+
      '<img src="'+h(mediaPath(item.image_path))+'" alt="'+h(item.title||'')+'" loading="lazy" decoding="async">'+
      ((item.title||item.description)?'<div class="native-page-cover-caption">'+
        (item.title?'<h2>'+h(item.title)+'</h2>':'')+
        (item.description?'<p>'+h(item.description)+'</p>':'')+'</div>':'')+
      '</section>';
  }
  const names={HERO:'Banner hero',FEATURE_ICON:'Ikon fitur',PRODUCT_IMAGE:'Gambar produk',
    PAGE_COVER:'Sampul halaman',NAV_ICON:'Ikon navigasi',BRAND_LOGO:'Logo'};
  const places=[
    ['HERO','home','Beranda publik'],['HERO','member_home','Beranda member'],
    ...['belajar','aplikasi','ai','jasa','katalog','affiliate','dukungan','login']
      .map(x=>['FEATURE_ICON',x,'Ikon fitur '+x]),
    ...routes.map(x=>['NAV_ICON',x,'Navigasi '+x]),
    ...['belajar','katalog','jasa','ai','affiliate','dukungan']
      .map(x=>['PAGE_COVER',x,'Sampul '+x]),
    ['BRAND_LOGO','brand','Logo Ngulik Digital']
  ];
  function admin(ctx){
    if(!ctx.authorized)return '<div class="empty"><h3>Khusus administrator</h3></div>';
    const rows=Array.isArray(ctx.items)?ctx.items:[];
    const selected=rows.find(x=>x.content_id===ctx.selectedId)||null;
    const draft=selected||{kind:'HERO',placement:'home',title:'',description:'',image_path:'',
      cta_label:'',cta_route:'',sort_order:rows.length+1,start_date:'',end_date:''};
    const locked=ctx.enabled!==true;
    const form='<section class="surface content-editor" aria-label="Editor konten visual">'+
      '<div class="content-editor-heading"><div><p class="eyebrow">EDITOR VISUAL</p><h2>'+
      (selected?'Ubah konten':'Tambah konten')+'</h2></div>'+
      (selected?'<button type="button" class="btn btn-secondary btn-sm" data-content-new>Buat baru</button>':'')+'</div>'+
      '<p class="form-hint">Tempel URL gambar HTTPS, data URI, atau path <code>assets/...</code>. '+
      'Contoh: https://cdn.example.com/banner.webp atau assets/media/banner-promo.webp.</p>'+
      '<form id="content-editor-form" data-content-id="'+h(selected?.content_id||'')+'" class="content-form">'+
      '<div class="grid-2"><div class="field"><label for="content-kind">Jenis visual</label>'+
      (selected?'<input class="input" value="'+h(names[draft.kind]||draft.kind)+'" disabled>'+
        '<input type="hidden" name="kind" value="'+h(draft.kind)+'">':
        '<select class="input" name="kind" id="content-kind">'+
        kinds.map(k=>'<option value="'+k+'" '+(draft.kind===k?'selected':'')+'>'+names[k]+'</option>').join('')+'</select>')+
      '</div><div class="field"><label for="content-placement">Lokasi tampilan</label>'+
      '<input class="input" id="content-placement" name="placement" list="content-places" maxlength="70" value="'+h(draft.placement||'')+'" required>'+
      '<datalist id="content-places">'+places.map(p=>'<option value="'+h(p[1])+'" label="'+h(p[2])+'"></option>').join('')+
      (Array.isArray(ctx.products)?ctx.products.map(p=>'<option value="'+h(p.product_id)+'" label="'+h(p.nama)+'"></option>').join(''):'')+
      '</datalist></div></div>'+
      '<div class="field"><label for="content-image">URL gambar HTTPS atau path assets/</label>'+
      '<input class="input" id="content-image" name="image_path" required maxlength="45000" placeholder="https://contoh.com/banner.webp" value="'+h(draft.image_path||'')+'">'+
      (mediaPath(draft.image_path)?'<img class="content-editor-preview" src="'+h(mediaPath(draft.image_path))+'" alt="Pratinjau file gambar" loading="lazy">':'')+
      '</div>'+
      '<div class="field"><label for="content-title">Judul atau alt text</label>'+
      '<input class="input" id="content-title" name="title" maxlength="120" value="'+h(draft.title||'')+'"></div>'+
      '<div class="field"><label for="content-description">Deskripsi (opsional)</label>'+
      '<textarea class="input" id="content-description" name="description" maxlength="400" rows="3">'+h(draft.description||'')+'</textarea></div>'+
      '<div class="grid-2"><div class="field"><label for="content-cta">Label tombol</label>'+
      '<input class="input" id="content-cta" name="cta_label" maxlength="48" value="'+h(draft.cta_label||'')+'"></div>'+
      '<div class="field"><label for="content-route">Tujuan tombol</label>'+
      '<select class="input" id="content-route" name="cta_route"><option value="">Tanpa tombol</option>'+
      routes.map(k=>'<option value="'+k+'" '+(draft.cta_route===k?'selected':'')+'>'+k+'</option>').join('')+
      '</select></div></div>'+
      '<div class="grid-2"><div class="field"><label for="content-order">Urutan</label>'+
      '<input class="input" type="number" min="1" max="10000" step="1" name="sort_order" id="content-order" required value="'+h(draft.sort_order??1)+'"></div>'+
      '<div class="field"><label for="content-start">Tayang mulai (opsional)</label>'+
      '<input class="input" type="date" name="start_date" id="content-start" value="'+h(draft.start_date||'')+'"></div></div>'+
      '<div class="field"><label for="content-end">Tayang sampai (opsional)</label>'+
      '<input class="input" type="date" name="end_date" id="content-end" value="'+h(draft.end_date||'')+'"></div>'+
      '<button class="btn btn-primary" type="submit" '+(locked?'disabled':'')+'>'+(selected?'Simpan perubahan':'Simpan draft')+'</button>'+
      (locked?'<p class="form-hint">Penyuntingan konten belum aktif pada deployment saat ini.</p>':'')+
      '</form></section>';
    const rowsHtml='<section class="content-admin-list" aria-label="Daftar aset dan banner">'+
      (rows.length?rows.map(x=>{
        const url=mediaPath(x.image_path),status=String(x.status||'DRAFT');
        const action=status==='PUBLISHED'?'DRAFT':status==='ARCHIVED'?'DRAFT':'PUBLISHED';
        const caption=status==='PUBLISHED'?'Tarik tayang':status==='ARCHIVED'?'Pulihkan draft':'Terbitkan';
        return '<article class="content-admin-item">'+
          (url?'<img src="'+h(url)+'" alt="'+h(x.title||'')+'" loading="lazy">':'')+
          '<div class="content-admin-copy"><span class="chip">'+h(names[x.kind]||x.kind)+' · '+h(status)+'</span>'+
          '<strong>'+h(x.title||x.placement||'Visual tanpa judul')+'</strong>'+
          '<small>Lokasi: '+h(x.placement)+' · Urutan '+h(x.sort_order||'')+
          ((x.start_date||x.end_date)?' · '+h(x.start_date||'—')+' s.d. '+h(x.end_date||'—'):'')+'</small>'+
          '<div class="content-admin-actions">'+
          '<button type="button" class="btn btn-secondary btn-sm" data-content-edit="'+h(x.content_id)+'">Edit</button>'+
          '<button type="button" class="btn btn-secondary btn-sm" data-content-id="'+h(x.content_id)+
          '" data-content-status="'+action+'" '+(locked?'disabled':'')+'>'+caption+'</button>'+
          (status!=='ARCHIVED'?'<button type="button" class="btn btn-ghost btn-sm" data-content-id="'+
            h(x.content_id)+'" data-content-status="ARCHIVED" '+(locked?'disabled':'')+'>Arsipkan</button>':'')+
          '</div></div></article>';
      }).join(''):'<div class="empty"><h3>Konten visual belum tersedia</h3><p>Banner dan aset baru akan dikelola di sini.</p></div>')+
      '</section>';
    return '<section class="content-admin-heading"><p class="eyebrow">ADMIN / KONTEN PUBLIK</p>'+
      '<h1>Konten, gambar & banner</h1><p>Kelola urutan kampanye, jadwal tayang, gambar produk, ikon fitur dan sampul halaman tanpa mengubah template.</p>'+
      '<span class="chip">'+rows.length+' aset tercatat</span></section>'+
      '<div class="content-admin-layout">'+rowsHtml+form+'</div>';
  }
  window.NGD_CONTENT_UI=Object.freeze({mediaPath,published,media,hero,cover,admin});
})();
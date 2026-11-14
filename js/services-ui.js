/* Ngulik Digital — genuine member service request + admin quotation interface.
 * Safe HTML output; never treats quotes as payments or fulfilled orders.
 */
(function(){
  'use strict';
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const cash=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',
    maximumFractionDigits:0}).format(Number(n)||0);
  const kinds={
    VIDEO_AI:'Video Iklan AI',WEBSITE_CUSTOM:'Website & Landing Page',
    APLIKASI_CUSTOM:'Aplikasi / Sistem Custom',KONSULTASI:'Konsultasi Digital'
  };
  const statuses={
    BARU:'Baru',DITINJAU:'Ditinjau',PENAWARAN:'Penawaran tersedia',
    DITOLAK:'Ditutup',SELESAI:'Pekerjaan selesai'
  };
  function member(ctx){
    if(!ctx.logged)return '<section class="surface"><h2>Ajukan kebutuhan jasa</h2>'+
      '<p>Masuk sebagai member untuk mengirim brief dan melihat penawaran pribadi.</p>'+
      '<button class="btn btn-primary" data-route="login">Masuk ke akun</button></section>';
    const items=Array.isArray(ctx.items)?ctx.items:[];
    const form='<section class="surface service-form-shell"><p class="card-kicker">PERMINTAAN JASA</p>'+
      '<h2>Ceritakan kebutuhan usaha</h2><p class="card-desc">Brief ditinjau admin sebelum ada penawaran. Pengisian formulir tidak memotong saldo atau membuat transaksi.</p>'+
      '<form id="service-brief-form" class="stack">'+
      '<div class="field"><label for="srv-kind">Jenis layanan</label><select id="srv-kind" class="input" name="jenis_layanan">'+
      Object.keys(kinds).map(k=>'<option value="'+k+'" '+(ctx.kind===k?'selected':'')+'>'+h(kinds[k])+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label for="srv-title">Nama proyek</label><input id="srv-title" class="input" name="judul" required minlength="8" maxlength="120" placeholder="Contoh: Video iklan produk kuliner"></div>'+
      '<div class="field"><label for="srv-brief">Detail kebutuhan dan target hasil</label><textarea id="srv-brief" class="input" name="brief" required minlength="30" maxlength="2000" rows="5" placeholder="Ceritakan usaha, target pelanggan, tujuan, hasil yang diinginkan, dan tenggat."></textarea></div>'+
      '<div class="grid-2"><div class="field"><label for="srv-reference">Tautan referensi (opsional)</label><input id="srv-reference" class="input" type="url" name="referensi_url" maxlength="300" pattern="https://.*" placeholder="https://..."></div>'+
      '<div class="field"><label for="srv-budget">Perkiraan anggaran (Rp)</label><input id="srv-budget" class="input" type="number" name="anggaran" min="0" max="50000000" step="1" value="0" required></div></div>'+
      '<button type="submit" class="btn btn-primary" '+(!ctx.enabled?'disabled':'')+'>Kirim brief untuk ditinjau</button>'+
      (!ctx.enabled?'<p class="form-hint">Pengiriman permintaan jasa saat ini belum tersedia.</p>':'')+
      '</form></section>';
    const history='<section class="service-history"><h2>Riwayat permintaan</h2>'+
      (items.length?items.map(x=>'<article class="service-entry"><div class="service-entry-top">'+
        '<strong>'+h(x.judul)+'</strong><span class="chip">'+h(statuses[x.status]||x.status)+'</span></div>'+
        '<p>'+h(kinds[x.jenis_layanan]||x.jenis_layanan)+'</p>'+
        (Number(x.penawaran_harga)>0?'<p><strong>Penawaran: '+cash(x.penawaran_harga)+'</strong></p>':'')+
        (x.penawaran_pesan?'<p>'+h(x.penawaran_pesan)+'</p>':'')+'</article>').join(''):
        '<div class="empty"><h3>Belum ada permintaan</h3><p>Brief Anda akan tersimpan di sini setelah berhasil dikirim.</p></div>')+
      '</section>';
    return '<header class="service-heading"><p class="eyebrow">LINGGAU AI STUDIO / LAYANAN</p>'+
      '<h1>Wujudkan kebutuhan digital usaha Anda.</h1>'+
      '<p>Kirim brief → admin meninjau → terima penawaran → pembayaran resmi setelah disepakati.</p></header>'+
      '<div class="service-columns">'+form+history+'</div>';
  }
  function admin(ctx){
    if(!ctx.authorized)return '<div class="empty"><h3>Hanya admin</h3><p>Akses ini membutuhkan akun administrator.</p></div>';
    const items=Array.isArray(ctx.items)?ctx.items:[];
    const active=items.find(x=>x.service_id===ctx.selectedId)||items[0];
    const list='<section class="service-admin-list">'+
      (items.length?items.map(x=>'<button type="button" class="service-admin-item" data-service-id="'+h(x.service_id)+'" '+
        (active&&active.service_id===x.service_id?'aria-current="true"':'')+'>'+
        '<span class="chip">'+h(statuses[x.status]||x.status)+'</span>'+
        '<strong>'+h(x.judul)+'</strong><small>'+h(kinds[x.jenis_layanan]||x.jenis_layanan)+'</small></button>').join(''):
        '<div class="empty"><h3>Antrean kosong</h3><p>Brief dari member akan tercatat di sini.</p></div>')+
      '</section>';
    const detail=!active?'<section class="surface"><p>Pilih permintaan untuk memeriksa penawaran.</p></section>':
      '<section class="surface service-admin-detail"><p class="card-kicker">BRIEF MEMBER</p>'+
      '<h2>'+h(active.judul)+'</h2><p>'+h(active.brief)+'</p>'+
      (active.referensi_url?'<p class="form-hint">Referensi: '+h(active.referensi_url)+'</p>':'')+
      '<p class="form-hint">Member ID: '+h(active.member_id)+' · Perkiraan anggaran: '+cash(active.anggaran)+'</p>'+
      '<form id="service-quote-form" class="stack" data-service-id="'+h(active.service_id)+'">'+
      '<div class="field"><label>Status</label><select class="input" name="status">'+
      ['DITINJAU','PENAWARAN','DITOLAK','SELESAI'].map(k=>'<option value="'+k+'" '+
        (active.status===k?'selected':'')+'>'+h(statuses[k])+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label>Harga penawaran (Rp)</label><input class="input" type="number" name="penawaran_harga" min="0" max="50000000" step="1" value="'+h(active.penawaran_harga||0)+'" required></div>'+
      '<div class="field"><label>Rincian penawaran untuk member</label><textarea class="input" name="penawaran_pesan" maxlength="1000" rows="4">'+h(active.penawaran_pesan||'')+'</textarea></div>'+
      '<div class="field"><label>Catatan internal (tidak terlihat member)</label><textarea class="input" name="catatan_internal" maxlength="1000" rows="3">'+h(active.catatan_internal||'')+'</textarea></div>'+
      '<button type="submit" class="btn btn-primary" '+
        (!ctx.enabled||['DITOLAK','SELESAI'].includes(active.status)?'disabled':'')+'>Simpan penawaran</button>'+
      '</form><p class="form-hint">Mengubah penawaran tidak menerima uang dan tidak menerbitkan invoice.</p></section>';
    return '<header class="service-heading"><p class="eyebrow">OPERASIONAL / LINGGAU AI STUDIO</p>'+
      '<h1>Permintaan jasa dan penawaran.</h1>'+
      '<p>Proses brief member dan simpan penawaran tanpa menggandakan transaksi.</p></header>'+
      '<div class="service-columns">'+list+detail+'</div>';
  }
  window.NGD_SERVICES_UI=Object.freeze({member,admin});
})();

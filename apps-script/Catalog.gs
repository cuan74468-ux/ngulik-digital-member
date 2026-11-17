/**
 * Ngulik Digital — ADMIN catalog management (opt-in staging).
 * Product rows are soft-archived, never deleted. Type and product ID are
 * immutable after creation, because orders and fulfillment depend on them.
 *
 * Writes require NGD_MUTATIONS_ENABLED=true,
 * and a valid ADMIN session. Default server state: OFF.
 * No payments, balance changes, fulfillment, emails or external API calls.
 */
var NGD_CATALOG_TYPES_=[
  'LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H','TOPUP_KREDIT',
  'JASA_SEKALI','PRODUK_DIGITAL'
];
var NGD_CATALOG_EDIT_FIELDS_=[
  'nama','deskripsi','tipe','harga','kredit_diberikan','durasi_hari',
  'perlu_approval_admin','bisa_komisi','urut','komisi_persen','sumber_produk'
];
function catalogRevision_(row) {
  var values=NGD_CATALOG_EDIT_FIELDS_.map(function(k){return row[k];});
  values.push(row.aktif===true);
  return sha256_(JSON.stringify(values));
}
function catalogAdminView_(row) {
  var out={product_id:row.product_id,revision:catalogRevision_(row)};
  NGD_CATALOG_EDIT_FIELDS_.forEach(function(k){out[k]=row[k];});
  out.aktif=row.aktif===true;
  out.komisi_persen=row.komisi_persen===undefined||row.komisi_persen===null||row.komisi_persen===''?null:Number(row.komisi_persen);
  out.sumber_produk=String(row.sumber_produk||'INTERNAL');
  out.checkout_supported=['LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H','TOPUP_KREDIT',
    'PRODUK_DIGITAL','JASA_SEKALI'].indexOf(row.tipe)>=0;
  return out;
}
function catalogAdminList_() {
  return readAll_('katalog_produk').sort(function(a,b){
    return Number(a.urut||0)-Number(b.urut||0);
  }).map(catalogAdminView_);
}
function catalogInt_(p,name,min,max) {
  var value=p[name];
  // Admin form accepts whole-rupiah digits only; do not silently reinterpret
  // formatted currency, fractions, or grouping punctuation as new prices.
  if(name==='harga')require_(typeof value==='number'||/^\d+$/.test(String(value)),
    'VALIDATION','Harga tidak valid: gunakan rupiah bulat tanpa simbol atau pemisah.');
  var n=name==='harga'?ngdPriceRupiah_(value):Number(value);
  require_(value!==undefined&&value!==null&&String(value).trim()!==''&&
    Number.isSafeInteger(n)&&n>=min&&n<=max,
    'VALIDATION','Nilai '+name+' tidak valid.');
  return n;
}
function catalogPayload_(p,existing) {
  require_(p&&typeof p==='object'&&!Array.isArray(p),
    'VALIDATION','Isi produk tidak valid.');
  var keys=NGD_CATALOG_EDIT_FIELDS_.concat(existing?['product_id','revision']:[]);
  require_(Object.keys(p).every(function(k){return keys.indexOf(k)>=0;}),
    'VALIDATION','Kolom katalog tidak diizinkan.');
  require_(NGD_CATALOG_EDIT_FIELDS_.filter(function(k){return ['komisi_persen','sumber_produk'].indexOf(k)<0;}).every(function(k){
    return Object.prototype.hasOwnProperty.call(p,k);
  }),'VALIDATION','Formulir produk belum lengkap.');
  require_(typeof p.nama==='string'&&typeof p.deskripsi==='string',
    'VALIDATION','Nama dan deskripsi harus teks.');
  var patch={
    nama:safeText_(p.nama,120),
    deskripsi:safeText_(p.deskripsi,350),
    tipe:String(p.tipe||''),
    harga:catalogInt_(p,'harga',1,50000000),
    kredit_diberikan:catalogInt_(p,'kredit_diberikan',0,100000),
    durasi_hari:catalogInt_(p,'durasi_hari',0,365),
    urut:catalogInt_(p,'urut',1,10000)
  };
  require_(patch.nama.length>=3&&patch.deskripsi.length>=10,
    'VALIDATION','Nama atau deskripsi terlalu pendek.');
  require_(NGD_CATALOG_TYPES_.indexOf(patch.tipe)>=0,
    'VALIDATION','Tipe katalog tidak tersedia.');
  ['perlu_approval_admin','bisa_komisi'].forEach(function(k){
    require_(typeof p[k]==='boolean','VALIDATION','Pilihan '+k+' tidak valid.');
    patch[k]=p[k];
  });
  // Optional per-product rate. Blank = system default; 0 = no commission.
  var rawRate=Object.prototype.hasOwnProperty.call(p,'komisi_persen')
    ?p.komisi_persen:(existing?existing.komisi_persen:'');
  if(rawRate===undefined||rawRate===null||String(rawRate).trim()===''){
    patch.komisi_persen='';
  }else{
    var rate=Number(rawRate);
    require_(Number.isInteger(rate)&&rate>=0&&rate<=50,
      'VALIDATION','Komisi produk harus 0–50 persen atau kosong.');
    patch.komisi_persen=rate;
  }
  var source=Object.prototype.hasOwnProperty.call(p,'sumber_produk')
    ?String(p.sumber_produk||'').trim()
    :String(existing&&existing.sumber_produk||'INTERNAL').trim();
  require_(/^[A-Za-z0-9_-]{2,60}$/.test(source),
    'VALIDATION','Sumber produk harus kode 2–60 karakter.');
  patch.sumber_produk=source;
  if(existing)
    require_(patch.tipe===existing.tipe,
      'CONFLICT','Tipe produk tidak dapat diubah setelah dibuat.');
  if(patch.tipe==='TOPUP_KREDIT')
    require_(patch.kredit_diberikan>0&&patch.durasi_hari===0,
      'VALIDATION','Produk top-up memerlukan kredit positif tanpa durasi.');
  if(['LANGGANAN_30H','SEAT_30H'].indexOf(patch.tipe)>=0)
    require_(patch.durasi_hari===30,
      'VALIDATION','Produk langganan atau seat harus berdurasi 30 hari.');
  if(['LISENSI_SEKALI','PRODUK_DIGITAL'].indexOf(patch.tipe)>=0)
    require_(patch.durasi_hari===0,'VALIDATION','Jenis produk ini tidak memiliki durasi.');
  if(patch.tipe==='JASA_SEKALI'||patch.tipe==='LISENSI_SEKALI'||patch.tipe==='SEAT_30H')
    require_(patch.perlu_approval_admin===true,
      'VALIDATION','Produk ini memerlukan persetujuan admin.');
  return patch;
}
function catalogSame_(a,b) {
  return NGD_CATALOG_EDIT_FIELDS_.every(function(k){
    return String(a[k]===undefined||a[k]===null?'':a[k])===
      String(b[k]===undefined||b[k]===null?'':b[k]);
  });
}
function catalogCreate_(admin,p,requestId) {
  require_(/^[A-Za-z0-9_-]{16,80}$/.test(String(requestId||'')),
    'VALIDATION','ID permintaan tidak valid.');
  var patch=catalogPayload_(p,null);
  // Stable synthetic product ID makes a network-unknown create retry safe.
  var id='P-'+sha256_(admin.member_id+':CATALOG:'+requestId)
    .slice(0,12).toUpperCase();
  return withLock_(function(){
    var existing=byId_('katalog_produk','product_id',id);
    if(existing){
      require_(catalogSame_(existing,patch),
        'CONFLICT','Permintaan pembuatan produk digunakan untuk isi yang berbeda.');
      return {item:catalogAdminView_(existing),already_created:true};
    }
    var record={product_id:id,aktif:false};
    NGD_CATALOG_EDIT_FIELDS_.forEach(function(k){record[k]=patch[k];});
    var header=tbl_('katalog_produk').headers;
    require_(header.indexOf('komisi_persen')>=0&&header.indexOf('sumber_produk')>=0,
      'SCHEMA_MISMATCH','Kolom komisi_persen dan sumber_produk harus tersedia pada katalog_produk.');
    appendRow_('katalog_produk',record);
    logAudit_(admin.member_id,'ADMIN','CATALOG_CREATED','katalog_produk',
      id,'','INACTIVE',{product_id:id,tipe:patch.tipe});
    return {item:catalogAdminView_(record),already_created:false};
  });
}
function catalogUpdate_(admin,p) {
  return withLock_(function(){
    var id=String(p.product_id||'');
    require_(/^P-[A-Za-z0-9-]{3,60}$/.test(id),
      'VALIDATION','ID produk tidak valid.');
    var old=byId_('katalog_produk','product_id',id);
    require_(old,'NOT_FOUND','Produk tidak ditemukan.');
    var patch=catalogPayload_(p,old);
    if(catalogSame_(old,patch))
      return {item:catalogAdminView_(old),updated:false};
    require_(String(p.revision||'')===catalogRevision_(old),
      'CONFLICT','Produk telah berubah. Muat ulang sebelum menyimpan.');
    // Existing orders retain their snapshot amounts. Price changes affect
    // only new orders and require a separate audit event.
    var headers=tbl_('katalog_produk').headers;
    require_(headers.indexOf('komisi_persen')>=0&&headers.indexOf('sumber_produk')>=0,
      'SCHEMA_MISMATCH','Kolom komisi_persen dan sumber_produk harus tersedia.');
    updateRow_('katalog_produk',old._row,patch);
    logAudit_(admin.member_id,'ADMIN','CATALOG_UPDATED','katalog_produk',
      id,'','UPDATED',{fields:NGD_CATALOG_EDIT_FIELDS_.filter(function(k){
        return String(old[k])!==String(patch[k]);
      })});
    NGD_CATALOG_EDIT_FIELDS_.forEach(function(k){old[k]=patch[k];});
    return {item:catalogAdminView_(old),updated:true};
  });
}
function catalogSetActive_(admin,p) {
  return withLock_(function(){
    var id=String(p.product_id||'');
    require_(/^P-[A-Za-z0-9-]{3,60}$/.test(id),
      'VALIDATION','ID produk tidak valid.');
    require_(typeof p.aktif==='boolean','VALIDATION','Status produk tidak valid.');
    require_(Object.keys(p||{}).every(function(k){
      return ['product_id','aktif','revision'].indexOf(k)>=0;
    }),'VALIDATION','Kolom status katalog tidak diizinkan.');
    var old=byId_('katalog_produk','product_id',id);
    require_(old,'NOT_FOUND','Produk tidak ditemukan.');
    if((old.aktif===true)===p.aktif)
      return {item:catalogAdminView_(old),updated:false};
    require_(String(p.revision||'')===catalogRevision_(old),
      'CONFLICT','Produk telah berubah. Muat ulang sebelum mengubah status.');
    updateRow_('katalog_produk',old._row,{aktif:p.aktif});
    logAudit_(admin.member_id,'ADMIN','CATALOG_STATUS','katalog_produk',
      id,old.aktif===true?'ACTIVE':'INACTIVE',p.aktif?'ACTIVE':'INACTIVE',{});
    old.aktif=p.aktif;
    return {item:catalogAdminView_(old),updated:true};
  });
}

/**
 * STAGING schema alignment: append missing product columns only.
 * Does not rewrite, delete, or reseed existing catalogue rows.
 */
function syncCatalogColumnsStaging() {
  var props=PropertiesService.getScriptProperties();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
    String(props.getProperty('NGD_DB_ID')||'')===String(db_().getId()),
    'FORBIDDEN','Sinkronisasi kolom hanya untuk database STAGING yang benar.');
  return withLock_(function(){
    var sheet=db_().getSheetByName('katalog_produk');
    require_(!!sheet,'SCHEMA_MISMATCH','Tabel katalog_produk tidak ditemukan.');
    var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
    var added=[];
    ['komisi_persen','sumber_produk'].forEach(function(key){
      if(headers.indexOf(key)<0){
        var col=sheet.getLastColumn()+1;
        sheet.getRange(1,col).setValue(key);
        added.push(key);
      }
    });
    return {added:added,columns_now:sheet.getLastColumn(),rows_unchanged:true};
  });
}

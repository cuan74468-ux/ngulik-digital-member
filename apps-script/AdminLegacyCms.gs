/**
 * Editorial legacy tables — STAGING-only Admin CRUD.
 * No production writes, provider calls, or financial ledger mutations.
 * Historical clicks are always read-only; archive is a soft active=false.
 */
var NGD_EDITOR_LEGACY_SCHEMAS_={
  ai_tools:{
    id:'tool_id',fields:['tool_id','nama','deskripsi','placeholder_input','prompt_template','kredit_biaya','aktif','urut'],
    writable:['nama','deskripsi','placeholder_input','prompt_template','kredit_biaya','aktif','urut'],
    texts:{nama:120,deskripsi:800,placeholder_input:250,prompt_template:5000},
    numbers:{kredit_biaya:[0,1000],urut:[1,10000]}
  },
  modul_belajar:{
    id:'modul_id',fields:['modul_id','urut','judul','deskripsi','url_classroom','aktif'],
    writable:['urut','judul','deskripsi','url_classroom','aktif'],
    texts:{judul:180,deskripsi:1500},
    urls:['url_classroom'],numbers:{urut:[1,10000]}
  },
  etalase_affiliate_luar:{
    id:'item_id',fields:['item_id','judul','kategori','deskripsi_singkat','alasan_rekomendasi',
      'harga_info','link_affiliate','gambar_url','urut','aktif','klik_total','catatan_admin'],
    writable:['judul','kategori','deskripsi_singkat','alasan_rekomendasi','harga_info',
      'link_affiliate','gambar_url','urut','aktif','catatan_admin'],
    texts:{judul:180,kategori:90,deskripsi_singkat:1200,alasan_rekomendasi:1200,
      harga_info:150,catatan_admin:1200},urls:['link_affiliate','gambar_url'],
    numbers:{urut:[1,10000]}
  }
};
function ngdLegacyCmsGuard_(){
  var p=PropertiesService.getScriptProperties();
  require_(p.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
    p.getProperty('NGD_ADMIN_LOGIN_DB_ID')===p.getProperty('NGD_DB_ID')&&
    String(p.getProperty('NGD_DB_ID')||'').length>=10,
    'FORBIDDEN','Editor ini hanya tersedia pada STAGING terverifikasi.');
}
function ngdLegacyCmsSpec_(table){
  var spec=NGD_EDITOR_LEGACY_SCHEMAS_[String(table||'')];
  require_(!!spec,'VALIDATION','Tabel CMS tidak diizinkan.');
  return spec;
}
function ngdLegacyCmsRevision_(row,spec){
  return sha256_(JSON.stringify(spec.fields.map(function(k){return row[k];})));
}
function ngdLegacyCmsView_(row,spec){
  var out={revision:ngdLegacyCmsRevision_(row,spec)};
  spec.fields.forEach(function(k){out[k]=row[k];});
  return out;
}
function ngdLegacyCmsList_(p){
  ngdLegacyCmsGuard_();
  var table=String(p&&p.table||'');
  var spec=ngdLegacyCmsSpec_(table);
  return readAll_(table).slice(0,500).map(function(r){return ngdLegacyCmsView_(r,spec);});
}
function ngdLegacyCmsHttps_(value){
  var s=String(value||'').trim();
  require_(s.length<=1800&&(!s||
    /^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{2,5})?(?:[\/?#][^\\\s<>"']*)?$/.test(s)),
    'VALIDATION','Gunakan URL HTTPS tanpa kredensial.');
  return s;
}
function ngdLegacyCmsPayload_(p,spec){
  var v=p&&p.values;
  require_(v&&typeof v==='object'&&!Array.isArray(v)&&
    Object.keys(v).every(function(k){return spec.writable.indexOf(k)>=0;})&&
    spec.writable.every(function(k){return Object.prototype.hasOwnProperty.call(v,k);}),
    'VALIDATION','Form CMS tidak lengkap atau berisi kolom terlarang.');
  var patch={};
  spec.writable.forEach(function(key){
    if(key==='aktif'){
      require_(typeof v[key]==='boolean','VALIDATION','Status harus boolean.');
      patch[key]=v[key];return;
    }
    if(spec.numbers&&Object.prototype.hasOwnProperty.call(spec.numbers,key)){
      var n=Number(v[key]),range=spec.numbers[key];
      require_(v[key]!==''&&v[key]!==null&&Number.isSafeInteger(n)&&
        n>=range[0]&&n<=range[1],'VALIDATION','Nilai angka tidak sesuai batas.');
      patch[key]=n;return;
    }
    if(spec.urls&&spec.urls.indexOf(key)>=0){
      patch[key]=ngdLegacyCmsHttps_(v[key]);return;
    }
    var limit=(spec.texts&&spec.texts[key])||500;
    require_(typeof v[key]==='string'&&v[key].length<=limit,
      'VALIDATION','Teks terlalu panjang atau tidak valid.');
    patch[key]=safeText_(v[key],limit);
  });
  if(spec.id==='tool_id'&&/\b(?:image|foto|gambar|visual)\b/i.test(
      patch.nama+' '+String(p.id||''))){
    // Visual/image tools are not a paid provider connection in this CMS.
    // Keep them unpublished until an independently verified real adapter exists.
    require_(patch.aktif===false,'MAINTENANCE',
      'MODE SIMULASI: alat gambar tidak boleh diaktifkan sebagai generator nyata.');
  }
  return patch;
}
function ngdLegacyCmsSave_(admin,p,requestId){
  ngdLegacyCmsGuard_();
  requireMutationsEnabled_();
  require_(admin&&admin.role==='ADMIN','FORBIDDEN','Hanya Admin.');
  var table=String(p&&p.table||''),spec=ngdLegacyCmsSpec_(table);
  var id=String(p&&p.id||'').trim();
  require_(/^[A-Za-z0-9_-]{3,80}$/.test(id),'VALIDATION','ID tidak valid.');
  var patch=ngdLegacyCmsPayload_(p,spec);
  var editing=p&&p.is_new!==true;
  return withLock_(function(){
    var existing=byId_(table,spec.id,id);
    if(editing){
      require_(!!existing,'NOT_FOUND','Data CMS tidak ditemukan.');
      require_(String(p.revision||'')===ngdLegacyCmsRevision_(existing,spec),
        'CONFLICT','Data berubah dari perangkat lain. Muat ulang.');
      var changed=spec.writable.filter(function(k){
        return String(existing[k]===undefined?'':existing[k])!==String(patch[k]);
      });
      if(!changed.length)return {item:ngdLegacyCmsView_(existing,spec),updated:false};
      updateRow_(table,existing._row,patch);
      logAudit_(admin.member_id,'ADMIN','LEGACY_CMS_UPDATED',table,id,'','UPDATED',
        {fields:changed});
      spec.writable.forEach(function(k){existing[k]=patch[k];});
      return {item:ngdLegacyCmsView_(existing,spec),updated:true};
    }
    require_(/^[A-Za-z0-9_-]{16,80}$/.test(String(requestId||'')),
      'VALIDATION','ID permintaan tidak valid.');
    require_(!existing,'CONFLICT','ID sudah digunakan. Pilih ID lain.');
    // Never allow a new row to be published by its initial save.
    patch.aktif=false;
    var record={};record[spec.id]=id;
    spec.writable.forEach(function(k){record[k]=patch[k];});
    if(table==='etalase_affiliate_luar')record.klik_total=0;
    appendRow_(table,record);
    logAudit_(admin.member_id,'ADMIN','LEGACY_CMS_CREATED',table,id,'','NONACTIVE',{});
    return {item:ngdLegacyCmsView_(record,spec),created:true};
  });
}

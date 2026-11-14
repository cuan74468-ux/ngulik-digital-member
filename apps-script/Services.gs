/**
 * NGULIK DIGITAL — commercial service request pipeline.
 * Member brief -> admin review -> quotation -> service follow-up.
 * This is NOT payment processing or proof of payment.
 * Only authenticated members can submit; all mutations require
 * NGD_MUTATIONS_ENABLED=true AND NGD_SERVICE_ENABLED=true.
 */
function serviceStatus_(){return ['BARU','DITINJAU','PENAWARAN','DITOLAK','SELESAI'];}
function serviceKinds_(){return ['VIDEO_AI','WEBSITE_CUSTOM','APLIKASI_CUSTOM','KONSULTASI'];}
function serviceDate_(v){return v instanceof Date?isoWib_(v):String(v||'');}
function serviceView_(r,admin){
  var out={
    service_id:r.service_id,product_id:r.product_id,jenis_layanan:r.jenis_layanan,
    judul:r.judul,brief:r.brief,referensi_url:r.referensi_url,anggaran:r.anggaran,
    status:r.status,penawaran_harga:r.penawaran_harga,
    penawaran_pesan:r.penawaran_pesan,
    created_at:serviceDate_(r.created_at),updated_at:serviceDate_(r.updated_at),
    closed_at:serviceDate_(r.closed_at)
  };
  if(admin){out.member_id=r.member_id;out.catatan_internal=r.catatan_internal;}
  return out;
}
function serviceInput_(p){
  require_(p&&typeof p==='object'&&!Array.isArray(p),'VALIDATION','Brief tidak valid.');
  var allowed=['product_id','jenis_layanan','judul','brief','referensi_url','anggaran'];
  require_(Object.keys(p).every(function(k){return allowed.indexOf(k)>=0;}),
    'VALIDATION','Kolom brief tidak diizinkan.');
  var kind=String(p.jenis_layanan||'');
  require_(serviceKinds_().indexOf(kind)>=0,'VALIDATION','Jenis layanan tidak dikenal.');
  var id=safeText_(p.product_id,80);
  if(kind==='VIDEO_AI'){
    require_(id==='P-VIDEO-AI','VALIDATION','Produk video AI tidak sesuai.');
    var product=byId_('katalog_produk','product_id',id);
    require_(product&&product.aktif===true&&product.tipe==='JASA_SEKALI',
      'NOT_FOUND','Layanan video AI belum tersedia.');
  }else require_(!id,'VALIDATION','Produk ini tidak cocok dengan jenis layanan.');
  var title=safeText_(p.judul,120),brief=safeText_(p.brief,2000);
  require_(title.length>=8&&brief.length>=30,
    'VALIDATION','Judul minimal 8 karakter dan brief minimal 30 karakter.');
  var link=safeText_(p.referensi_url,300);
  require_(!link||/^https:\/\/[^\s<>"']+$/i.test(link),
    'VALIDATION','Gunakan tautan referensi HTTPS yang valid.');
  var budget=Number(p.anggaran);
  require_(p.anggaran!==''&&p.anggaran!=null&&Number.isSafeInteger(budget)&&
    budget>=0&&budget<=50000000,'VALIDATION','Anggaran tidak valid.');
  return {product_id:id,jenis_layanan:kind,judul:title,brief:brief,
    referensi_url:link,anggaran:budget};
}
function serviceSubmit_(member,p,requestId){
  require_(member.role==='MEMBER','FORBIDDEN','Hanya member dapat mengirim brief.');
  require_(/^[a-zA-Z0-9_-]{16,80}$/.test(String(requestId||'')),
    'VALIDATION','ID permintaan layanan tidak valid.');
  var data=serviceInput_(p);
  return withLock_(function(){
    var previous=findRows_('service_requests',function(r){return r.request_id===requestId;});
    require_(previous.length<=1,'RECONCILIATION_REQUIRED','ID permintaan layanan ganda.');
    if(previous.length){
      var old=previous[0];
      require_(old.member_id===member.member_id&&
        ['product_id','jenis_layanan','judul','brief','referensi_url','anggaran']
          .every(function(k){return String(old[k])===String(data[k]);}),
        'CONFLICT','ID permintaan dipakai untuk brief berbeda.');
      return {item:serviceView_(old,false),already_submitted:true};
    }
    var now=now_(),recent=findRows_('service_requests',function(r){
      return r.member_id===member.member_id&&
        new Date(r.created_at).getTime()>now.getTime()-86400000;
    });
    var duplicate=recent.filter(function(r){
      return new Date(r.created_at).getTime()>now.getTime()-15*60000&&
        ['product_id','jenis_layanan','judul','brief','referensi_url','anggaran']
          .every(function(k){return String(r[k])===String(data[k]);});
    })[0];
    if(duplicate)return {item:serviceView_(duplicate,false),already_submitted:true};
    require_(recent.length<5,'RATE_LIMIT','Maksimal lima permintaan jasa per 24 jam.');
    var record={
      service_id:recordId_('SRV'),member_id:member.member_id,
      product_id:data.product_id,jenis_layanan:data.jenis_layanan,
      judul:data.judul,brief:data.brief,referensi_url:data.referensi_url,
      anggaran:data.anggaran,status:'BARU',penawaran_harga:0,
      penawaran_pesan:'',catatan_internal:'',
      created_at:now,updated_at:now,closed_at:'',request_id:requestId
    };
    appendRow_('service_requests',record);
    // Request_id enables replay after a partial failure in audit logging.
    logAudit_(member.member_id,'MEMBER','SERVICE_BRIEF_CREATED','service_requests',
      record.service_id,'','BARU',{jenis_layanan:record.jenis_layanan});
    return {item:serviceView_(record,false),already_submitted:false};
  });
}
function serviceListMine_(member){
  return findRows_('service_requests',function(r){return r.member_id===member.member_id;})
    .slice(-50).reverse().map(function(r){return serviceView_(r,false);});
}
function serviceListAdmin_(p){
  var status=String((p||{}).status||'');
  require_(!status||serviceStatus_().indexOf(status)>=0,
    'VALIDATION','Filter status layanan tidak valid.');
  return readAll_('service_requests').filter(function(r){return !status||r.status===status;})
    .slice(-100).reverse().map(function(r){return serviceView_(r,true);});
}
function serviceQuote_(admin,p){
  require_(admin.role==='ADMIN','FORBIDDEN','Hanya admin dapat memproses penawaran.');
  p=p||{};
  require_(Object.keys(p).every(function(k){return [
    'service_id','status','penawaran_harga','penawaran_pesan',
    'catatan_internal','expected_updated_at'
  ].indexOf(k)>=0;}),'VALIDATION','Kolom penawaran tidak diizinkan.');
  var id=String(p.service_id||''),status=String(p.status||'');
  require_(/^SRV-[a-zA-Z0-9]{12}$/.test(id),'VALIDATION','ID layanan tidak valid.');
  require_(['DITINJAU','PENAWARAN','DITOLAK','SELESAI'].indexOf(status)>=0,
    'VALIDATION','Status layanan tidak valid.');
  var price=Number(p.penawaran_harga);
  require_(p.penawaran_harga!=null&&Number.isSafeInteger(price)&&price>=0&&price<=50000000,
    'VALIDATION','Harga penawaran tidak valid.');
  var message=safeText_(p.penawaran_pesan,1000);
  var internal=safeText_(p.catatan_internal,1000);
  if(status==='PENAWARAN')require_(price>0&&message.length>=12,
    'VALIDATION','Harga dan rincian penawaran diperlukan.');
  return withLock_(function(){
    var current=byId_('service_requests','service_id',id);
    require_(current,'NOT_FOUND','Brief jasa tidak ditemukan.');
    var before=serviceDate_(current.updated_at);
    require_(String(p.expected_updated_at||'')===before,'CONFLICT',
      'Permintaan telah diubah admin lain. Muat ulang.');
    if(current.status==='DITOLAK'||current.status==='SELESAI')
      throw ngdError_('CONFLICT','Permintaan yang sudah ditutup tidak dapat diubah.');
    var patch={status:status,penawaran_harga:price,
      penawaran_pesan:message,catatan_internal:internal};
    var same=Object.keys(patch).every(function(k){return String(current[k]||'')===String(patch[k]||'');});
    if(same)return {item:serviceView_(current,true),updated:false};
    patch.updated_at=now_();
    if(status==='DITOLAK'||status==='SELESAI')patch.closed_at=patch.updated_at;
    updateRow_('service_requests',current._row,patch);
    logAudit_(admin.member_id,'ADMIN','SERVICE_BRIEF_UPDATED','service_requests',
      id,current.status,status,{quoted:status==='PENAWARAN'});
    Object.keys(patch).forEach(function(k){current[k]=patch[k];});
    return {item:serviceView_(current,true),updated:true};
  });
}

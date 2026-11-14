/**
 * Ngulik Digital — editorial content for GitHub Pages, backed by Google Sheets.
 * Public reads expose published assets only. All mutations require an ADMIN
 * session, NGD_MUTATIONS_ENABLED and NGD_CONTENT_ENABLED. No binary uploads.
 * An image path must be a same-origin asset committed under assets/media/.
 */
var NGD_CONTENT_KINDS_=['HERO','FEATURE_ICON','PRODUCT_IMAGE','PAGE_COVER','NAV_ICON','BRAND_LOGO'];
var NGD_CONTENT_ROUTES_=['beranda','belajar','katalog','jasa','ai','affiliate','dukungan','login','akun'];
var NGD_CONTENT_FIELDS_=[
  'kind','placement','title','description','image_path','cta_label','cta_route',
  'sort_order','start_date','end_date'
];
function contentImagePath_(value) {
  var path=String(value==null?'':value).trim();
  require_(path.length<=180 && /^assets\/media\/[A-Za-z0-9][A-Za-z0-9_/-]*\.(?:png|jpe?g|webp|avif)$/i.test(path) &&
    path.indexOf('..')<0 && path.indexOf('//')<0,
    'VALIDATION','Gambar wajib memakai path lokal assets/media/ dengan format PNG, JPG, WebP atau AVIF.');
  return path;
}
function contentDate_(value,label) {
  var date=String(value==null?'':value).trim();
  if(!date)return '';
  require_(/^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0,10)===date,
    'VALIDATION','Tanggal '+label+' tidak valid.');
  return date;
}
function contentPlacement_(kind,value) {
  var place=String(value||'').trim();
  var valid=false;
  if(kind==='HERO')valid=['home','member_home'].indexOf(place)>=0;
  if(kind==='FEATURE_ICON')valid=['belajar','aplikasi','ai','jasa','katalog',
    'affiliate','dukungan','login'].indexOf(place)>=0;
  if(kind==='NAV_ICON')valid=NGD_CONTENT_ROUTES_.indexOf(place)>=0;
  if(kind==='PAGE_COVER')valid=['belajar','katalog','jasa','ai',
    'affiliate','dukungan'].indexOf(place)>=0;
  if(kind==='PRODUCT_IMAGE')valid=/^P-[A-Za-z0-9-]{2,60}$/.test(place);
  if(kind==='BRAND_LOGO')valid=place==='brand';
  require_(valid,'VALIDATION','Lokasi gambar tidak dikenali untuk jenis konten ini.');
  return place;
}
function contentPayload_(p,existing) {
  require_(p&&typeof p==='object'&&!Array.isArray(p),
    'VALIDATION','Konten tidak valid.');
  var allowed=NGD_CONTENT_FIELDS_.concat(existing?['content_id','revision']:[]);
  require_(Object.keys(p).every(function(key){return allowed.indexOf(key)>=0;}),
    'VALIDATION','Kolom konten tidak diizinkan.');
  require_(NGD_CONTENT_FIELDS_.every(function(key){
    return Object.prototype.hasOwnProperty.call(p,key);
  }),'VALIDATION','Formulir konten belum lengkap.');
  require_(typeof p.kind==='string'&&NGD_CONTENT_KINDS_.indexOf(p.kind)>=0,
    'VALIDATION','Jenis konten tidak dikenal.');
  require_(typeof p.title==='string'&&typeof p.description==='string'&&
    typeof p.cta_label==='string'&&typeof p.cta_route==='string',
    'VALIDATION','Judul, keterangan, dan tombol harus berupa teks.');
  var draft={
    kind:p.kind,placement:contentPlacement_(p.kind,p.placement),
    title:safeText_(p.title,120),description:safeText_(p.description,400),
    image_path:contentImagePath_(p.image_path),
    cta_label:safeText_(p.cta_label,48),cta_route:String(p.cta_route||'').trim(),
    sort_order:Number(p.sort_order),
    start_date:contentDate_(p.start_date,'mulai'),
    end_date:contentDate_(p.end_date,'akhir')
  };
  require_(Number.isSafeInteger(draft.sort_order)&&draft.sort_order>=1&&draft.sort_order<=10000,
    'VALIDATION','Urutan tampilan tidak valid.');
  require_(!draft.cta_route||NGD_CONTENT_ROUTES_.indexOf(draft.cta_route)>=0,
    'VALIDATION','Tujuan tombol tidak diizinkan.');
  require_(!draft.cta_label||!!draft.cta_route,
    'VALIDATION','Tombol harus memiliki tujuan.');
  require_(!draft.end_date||!draft.start_date||draft.end_date>=draft.start_date,
    'VALIDATION','Tanggal akhir tidak boleh sebelum tanggal mulai.');
  if(existing)require_(draft.kind===existing.kind,
    'CONFLICT','Jenis konten tidak dapat diubah setelah dibuat.');
  return draft;
}
function contentRevision_(row) {
  return sha256_(JSON.stringify(NGD_CONTENT_FIELDS_.map(function(k){return row[k];}).concat([
    row.status
  ])));
}
function contentAdminView_(row) {
  var out={content_id:row.content_id,status:row.status,revision:contentRevision_(row)};
  NGD_CONTENT_FIELDS_.forEach(function(key){out[key]=row[key];});
  return out;
}
function contentAdminList_() {
  return readAll_('site_content').sort(function(a,b){
    return Number(a.sort_order||0)-Number(b.sort_order||0);
  }).map(contentAdminView_);
}
function contentSame_(row,patch) {
  return NGD_CONTENT_FIELDS_.every(function(key){
    return String(row[key]||'')===String(patch[key]||'');
  });
}
function contentPublicList_() {
  var nowWib=Utilities.formatDate(now_(),NGD.TZ,'yyyy-MM-dd');
  return readAll_('site_content').filter(function(row){
    return row.status==='PUBLISHED'&&
      (!row.start_date||String(row.start_date)<=nowWib)&&
      (!row.end_date||String(row.end_date)>=nowWib);
  }).sort(function(a,b){
    return Number(a.sort_order||0)-Number(b.sort_order||0);
  }).slice(0,300).map(function(row){
    var item={};
    NGD_CONTENT_FIELDS_.forEach(function(key){item[key]=row[key];});
    item.content_id=row.content_id;
    return item;
  });
}
function contentCreate_(admin,p,requestId) {
  require_(/^[A-Za-z0-9_-]{16,80}$/.test(String(requestId||'')),
    'VALIDATION','ID permintaan tidak valid.');
  var patch=contentPayload_(p,null);
  var id='C-'+sha256_(admin.member_id+':CONTENT:'+requestId).slice(0,14).toUpperCase();
  return withLock_(function(){
    var old=byId_('site_content','content_id',id);
    if(old){
      require_(contentSame_(old,patch),'CONFLICT',
        'ID permintaan sudah pernah digunakan untuk konten lain.');
      return {item:contentAdminView_(old),already_created:true};
    }
    var record={content_id:id,status:'DRAFT',created_at:now_(),
      updated_at:now_(),created_by:admin.member_id,request_id:requestId};
    NGD_CONTENT_FIELDS_.forEach(function(key){record[key]=patch[key];});
    appendRow_('site_content',record);
    logAudit_(admin.member_id,'ADMIN','CONTENT_CREATED','site_content',id,
      '','DRAFT',{kind:patch.kind,placement:patch.placement});
    return {item:contentAdminView_(record),already_created:false};
  });
}
function contentUpdate_(admin,p) {
  return withLock_(function(){
    var id=String(p.content_id||'');
    require_(/^C-[A-F0-9]{14}$/.test(id),'VALIDATION','ID konten tidak valid.');
    var old=byId_('site_content','content_id',id);
    require_(old,'NOT_FOUND','Konten tidak ditemukan.');
    require_(old.status!=='ARCHIVED','CONFLICT','Pulihkan arsip sebelum menyunting.');
    var patch=contentPayload_(p,old);
    if(contentSame_(old,patch))return {item:contentAdminView_(old),updated:false};
    require_(String(p.revision||'')===contentRevision_(old),
      'CONFLICT','Konten sudah diubah dari perangkat lain. Muat ulang.');
    updateRow_('site_content',old._row,Object.assign({updated_at:now_()},patch));
    logAudit_(admin.member_id,'ADMIN','CONTENT_UPDATED','site_content',id,
      '','UPDATED',{kind:patch.kind,placement:patch.placement});
    NGD_CONTENT_FIELDS_.forEach(function(key){old[key]=patch[key];});
    return {item:contentAdminView_(old),updated:true};
  });
}
function contentSetStatus_(admin,p) {
  require_(p&&typeof p==='object'&&!Array.isArray(p)&&
    Object.keys(p).every(function(k){
      return ['content_id','status','revision'].indexOf(k)>=0;
    }),'VALIDATION','Isi perubahan status tidak valid.');
  return withLock_(function(){
    var id=String(p.content_id||'');
    require_(/^C-[A-F0-9]{14}$/.test(id),'VALIDATION','ID konten tidak valid.');
    require_(['DRAFT','PUBLISHED','ARCHIVED'].indexOf(p.status)>=0,
      'VALIDATION','Status konten tidak dikenali.');
    var old=byId_('site_content','content_id',id);
    require_(old,'NOT_FOUND','Konten tidak ditemukan.');
    if(old.status===p.status)return {item:contentAdminView_(old),updated:false};
    require_(String(p.revision||'')===contentRevision_(old),
      'CONFLICT','Status konten sudah berubah. Muat ulang.');
    require_(old.status!=='ARCHIVED'||p.status==='DRAFT',
      'CONFLICT','Pulihkan arsip sebagai draft sebelum menerbitkan.');
    updateRow_('site_content',old._row,{status:p.status,updated_at:now_()});
    logAudit_(admin.member_id,'ADMIN','CONTENT_STATUS','site_content',id,
      old.status,p.status,{kind:old.kind,placement:old.placement});
    old.status=p.status;
    return {item:contentAdminView_(old),updated:true};
  });
}

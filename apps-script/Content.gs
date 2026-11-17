/**
 * Ngulik Digital — editorial content for GitHub Pages, backed by Google Sheets.
 * Public reads expose published assets only. All mutations require an ADMIN
 * session and NGD_MUTATIONS_ENABLED. No binary uploads.
 * Image paths may use assets/, external HTTPS, or small raster data URIs.
 */
var NGD_CONTENT_KINDS_=['HERO','FEATURE_ICON','PRODUCT_IMAGE','PAGE_COVER','NAV_ICON','BRAND_LOGO','PROMO','ANNOUNCEMENT'];
var NGD_CONTENT_ROUTES_=['beranda','belajar','katalog','jasa','ai','affiliate','dukungan','login','akun'];
var NGD_CONTENT_FIELDS_=[
  'kind','placement','title','description','image_path','cta_label','cta_route',
  'sort_order','start_date','end_date'
];
function contentImagePath_(value,optional) {
  var path=String(value==null?'':value).trim();
  // Allow safe repository assets, HTTPS image links, and raster data URIs.
  var local=path.length<=500&&/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[A-Za-z0-9_=&%-]+)?$/i.test(path)&&
    path.indexOf('..')<0&&path.indexOf('//')<0;
  var external=path.length<=2048&&
    /^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]{2,5})?(?:\/[a-zA-Z0-9!$&'()*+,;=:@%_./~-]*)?(?:\?[a-zA-Z0-9!$&'()*+,;=:@%_./?~-]*)?(?:#[a-zA-Z0-9_.-]*)?$/i.test(path);
  var inline=path.length<=45000&&
    /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(path);
  require_((optional&&!path)||!!path&&(local||external||inline),'VALIDATION',
    'Gunakan path assets/..., gambar HTTPS, atau data URI gambar.');
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
  if(kind==='HERO')valid=['home','catalog','member_home'].indexOf(place)>=0;
  if(kind==='FEATURE_ICON')valid=['belajar','aplikasi','ai','jasa','katalog',
    'affiliate','dukungan','login'].indexOf(place)>=0;
  if(kind==='NAV_ICON')valid=NGD_CONTENT_ROUTES_.indexOf(place)>=0;
  if(kind==='PAGE_COVER')valid=['belajar','katalog','jasa','ai',
    'affiliate','dukungan'].indexOf(place)>=0;
  if(kind==='PRODUCT_IMAGE')valid=/^P-[A-Za-z0-9-]{2,60}$/.test(place);
  if(kind==='BRAND_LOGO')valid=place==='brand';
  if(kind==='PROMO'||kind==='ANNOUNCEMENT')
    valid=['home','catalog','member_home','ai','belajar'].indexOf(place)>=0;
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
    image_path:contentImagePath_(p.image_path,p.kind==='PROMO'||p.kind==='ANNOUNCEMENT'),
    cta_label:safeText_(p.cta_label,48),cta_route:String(p.cta_route||'').trim().replace(/^#/,'').toLowerCase(),
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
    require_(/^(?:C-[A-F0-9]{14}|CNT-[A-Za-z0-9_-]{2,60})$/.test(id),'VALIDATION','ID konten tidak valid.');
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
    require_(/^(?:C-[A-F0-9]{14}|CNT-[A-Za-z0-9_-]{2,60})$/.test(id),'VALIDATION','ID konten tidak valid.');
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

/**
 * Forward-only content schema migration (manual staging task).
 * Never called by a public request or setupDatabase().
 * Requires all 26 existing tables to be correct, environment=STAGING and
 * exact target-ID acknowledgment. Adds only the new content table.
 */
function installContentSchemaStaging() {
  var props=PropertiesService.getScriptProperties();
  var id=String(props.getProperty('NGD_DB_ID')||'').trim();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING'&&
    props.getProperty('NGD_CONTENT_MIGRATION_ENABLED')==='true'&&
    id&&id===String(props.getProperty('NGD_CONTENT_MIGRATION_TARGET_ID')||''),
    'MAINTENANCE','Migrasi konten dibatasi ke staging yang dikonfirmasi eksplisit.');
  return withLock_(function(){
    // Never use SpreadsheetApp.getActiveSpreadsheet() for schema migration.
    var ss=SpreadsheetApp.openById(id);
    Object.keys(NGD.HEADERS).filter(function(n){return n!=='site_content';})
      .forEach(function(name){
        var sheet=ss.getSheetByName(name);
        require_(!!sheet,'SCHEMA_MISMATCH','Tab dasar hilang: '+name);
        var expected=NGD.HEADERS[name].split(',');
        var colCount=sheet.getLastColumn();
        var actual=colCount>0?sheet.getRange(1,1,1,colCount).getValues()[0].map(String):[];
        require_(actual.join('|')===expected.join('|'),
          'SCHEMA_MISMATCH','Header dasar berbeda: '+name);
      });
    var expected=NGD.HEADERS.site_content.split(',');
    var existing=ss.getSheetByName('site_content');
    if(existing){
      var last=existing.getLastColumn();
      var actual=last>0?existing.getRange(1,1,1,last).getValues()[0].map(String):[];
      require_(actual.join('|')===expected.join('|'),
        'SCHEMA_MISMATCH','Header site_content berbeda. Tidak ada perubahan.');
      return {created:false,tabs_checked:Object.keys(NGD.HEADERS).length,
        message:'Tab site_content sudah sesuai. Tidak ada perubahan.'};
    }
    var sheet=ss.insertSheet('site_content');
    if(sheet.getMaxColumns()<expected.length)
      sheet.insertColumnsAfter(sheet.getMaxColumns(),expected.length-sheet.getMaxColumns());
    sheet.getRange(1,1,1,expected.length).setValues([expected]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    console.log('CONTENT_SCHEMA_STAGING_OK (new table only)');
    return {created:true,tabs_checked:Object.keys(NGD.HEADERS).length,
      message:'Tab site_content ditambahkan tanpa mengubah tabel lain.'};
  });
}

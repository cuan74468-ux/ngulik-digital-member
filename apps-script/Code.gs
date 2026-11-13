/**
 * Ngulik Digital Member — Backend BATCH 1.
 * Fondasi DB, pengaturan, autentikasi, dan instalasi.
 * BATCH 2 akan menambahkan action bisnis serta doPost/doGet.
 * Jangan deploy sebagai layanan publik sebelum seluruh batch dan QA selesai.
 */

// ===== KONSTANTA =====
const NGD = Object.freeze({
  VERSION: '1.0.0',
  DB_ID: '19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8',
  TZ: 'Asia/Jakarta',
  SESSION_DAYS: 7,
  LOCK_MINUTES: 15,
  MAX_LOGIN_FAILURES: 5,
  HEADERS: {
    members: 'member_id,role,nama,wa,nama_usaha,pin_hash,pin_salt,kode_referral,referred_by,status,joined_at,jenis_usaha,kota,deskripsi_usaha,instagram,onboarding_at,trial_mulai,trial_berakhir,akses_3in1_sampai,sumber_akses_3in1,url_halaman_bisnis,status_pos,pos_lisensi_kode,status_canva,canva_email,canva_mulai,canva_berakhir,last_active_at,d14_active,d30_active,saldo_kredit,retensi_14,retensi_30',
    katalog_produk: 'product_id,nama,deskripsi,tipe,harga,kredit_diberikan,durasi_hari,perlu_approval_admin,bisa_komisi,aktif,urut',
    etalase_affiliate_luar: 'item_id,judul,kategori,deskripsi_singkat,alasan_rekomendasi,harga_info,link_affiliate,gambar_url,urut,aktif,klik_total,catatan_admin',
    orders: 'order_id,member_id,product_id,nama_produk,harga_dasar,kode_unik,total_bayar,status,metode,created_at,expires_at,konfirmasi_bayar_at,paid_at,verified_by,fulfilled_at,cancelled_at,refunded_at,ref_member_id,catatan_admin,request_id',
    credits_ledger: 'entry_id,member_id,created_at,tipe,jumlah,status,ref_id,tool_id,keterangan,saldo_setelah',
    affiliate_commissions: 'komisi_id,referrer_id,referred_member_id,order_id,dasar_komisi,persen,nominal,status,created_at,approve_after,approved_at,payout_requested_at,paid_at,payout_note,reversed_at,reversed_reason',
    audit_logs: 'log_id,timestamp,actor_id,actor_role,action,entity,entity_id,dari_status,ke_status,detail_json',
    pengaturan_sistem: 'key,value,tipe,deskripsi',
    sessions: 'token_hash,member_id,role,created_at,expires_at,last_seen_at',
    klik_log: 'click_id,timestamp,tipe,kode_referral,referrer_id,item_id,visitor_id,member_id',
    ai_tools: 'tool_id,nama,deskripsi,placeholder_input,prompt_template,kredit_biaya,aktif,urut',
    modul_belajar: 'modul_id,urut,judul,deskripsi,url_classroom,aktif',
    progress_member: 'member_id,modul_id,selesai_at',
    ringkasan: 'metrik,nilai'
  }
});

// ===== UTIL =====
var NGD_DB_CACHE_ = null;
function db_() { return NGD_DB_CACHE_ || (NGD_DB_CACHE_ = SpreadsheetApp.openById(NGD.DB_ID)); }
function now_() { return new Date(); }
function uuid_() { return Utilities.getUuid().replace(/-/g, '').toUpperCase(); }
function hex_(bytes) { return bytes.map(function(n) { return ('0' + ((n + 256) % 256).toString(16)).slice(-2); }).join(''); }
function sha256_(value) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)); }
function newSalt_() { return uuid_() + uuid_(); }
function pinHash_(pin, salt) { return sha256_(salt + String(pin)); }
function randomPin_() {
  // Enam angka, tanpa memakai PIN statis dari kode.
  var parts = uuid_().match(/.{1,4}/g);
  var value = parts.reduce(function(a, b) { return (a * 65536 + parseInt(b, 16)) % 1000000; }, 0);
  return ('000000' + value).slice(-6);
}
function normalizeWa_(raw) {
  var w = String(raw || '').replace(/[\s()-]/g, '');
  if (w.slice(0, 1) === '+') w = w.slice(1);
  if (w.slice(0, 1) === '0') w = '62' + w.slice(1);
  if (!/^62\d{8,13}$/.test(w)) throw new Error('Nomor WhatsApp tidak valid.');
  return w;
}
function checkPin_(pin) {
  if (!/^\d{6}$/.test(String(pin || ''))) throw new Error('PIN harus enam angka.');
}
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function recordId_(prefix) { return prefix + '-' + uuid_().slice(0, 12); }
function isoWib_(date) {
  return Utilities.formatDate(new Date(date), NGD.TZ, "yyyy-MM-dd'T'HH:mm:ss") + '+07:00';
}
function safeText_(s, max) {
  var text = String(s == null ? '' : s).trim();
  if (text.length > max) throw new Error('Teks terlalu panjang.');
  return text;
}
function num_(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : fallback;
}

// ===== DB: Semua kolom berdasarkan nama header =====
function tbl_(name) {
  if (!Object.prototype.hasOwnProperty.call(NGD.HEADERS, name)) throw new Error('Tabel tidak diizinkan.');
  var sheet = db_().getSheetByName(name);
  if (!sheet) throw new Error('Tabel belum ada: ' + name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  return {sheet: sheet, headers: headers};
}
function readAll_(name) {
  var t = tbl_(name), count = t.sheet.getLastRow() - 1;
  if (count <= 0) return [];
  return t.sheet.getRange(2, 1, count, t.headers.length).getValues().map(function(row, i) {
    var item = {_row: i + 2};
    t.headers.forEach(function(h, j) { item[h] = row[j]; });
    return item;
  });
}
function appendRow_(name, obj) {
  var t = tbl_(name), row = t.headers.map(function(h) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''; });
  t.sheet.appendRow(row);
  return t.sheet.getLastRow();
}
function updateRow_(name, rowNumber, patch) {
  var t = tbl_(name);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > t.sheet.getLastRow()) throw new Error('Baris tidak valid.');
  Object.keys(patch).forEach(function(key) {
    var col = t.headers.indexOf(key) + 1;
    if (!col) throw new Error('Kolom tidak dikenal: ' + key);
    t.sheet.getRange(rowNumber, col).setValue(patch[key]);
  });
}
function findRows_(name, predicate) { return readAll_(name).filter(predicate); }
function colLetter_(name, header) {
  var i = tbl_(name).headers.indexOf(header) + 1;
  if (!i) throw new Error('Kolom tidak dikenal: ' + name + '.' + header);
  var text = '';
  while (i) { i--; text = String.fromCharCode(65 + i % 26) + text; i = Math.floor(i / 26); }
  return text;
}
function colRef_(name, header) {
  var letter = colLetter_(name, header);
  return "'" + name + "'!$" + letter + ":$" + letter;
}
function refCell_(name, header, row) { return colLetter_(name, header) + row; }
function logAudit_(actor, role, action, entity, entityId, before, after, details) {
  appendRow_('audit_logs', {
    log_id: recordId_('LOG'), timestamp: now_(), actor_id: actor || 'SYSTEM',
    actor_role: role || 'SYSTEM', action: action, entity: entity,
    entity_id: entityId, dari_status: before || '', ke_status: after || '',
    detail_json: JSON.stringify(details || {})
  });
}

// ===== SETTINGS =====
function settings_() {
  var out = {};
  readAll_('pengaturan_sistem').forEach(function(r) {
    var v = r.value;
    if (r.tipe === 'NUMBER') v = num_(v, 0);
    if (r.tipe === 'BOOL') v = v === true || String(v).toUpperCase() === 'TRUE';
    out[r.key] = v;
  });
  return out;
}
function setting_(key, fallback) {
  var v = settings_()[key];
  return v === undefined || v === '' ? fallback : v;
}
function seedIfEmpty_(name, entries) {
  var t = tbl_(name);
  if (t.sheet.getLastRow() > 1) return 0;
  if (!entries.length) return 0;
  var values = entries.map(function(r) { return t.headers.map(function(h) { return r[h] === undefined ? '' : r[h]; }); });
  t.sheet.getRange(2, 1, values.length, t.headers.length).setValues(values);
  return values.length;
}

// ===== AUTH: helper siap dihubungkan ke handler pada BATCH 2 =====
function issueSession_(member) {
  var token = uuid_() + uuid_();
  appendRow_('sessions', {
    token_hash: sha256_(token), member_id: member.member_id, role: member.role,
    created_at: now_(), expires_at: new Date(Date.now() + NGD.SESSION_DAYS * 86400000),
    last_seen_at: now_()
  });
  return token;
}
function session_(token) {
  if (!/^[A-Fa-f0-9]{64}$/.test(String(token || ''))) throw new Error('Sesi tidak valid.');
  var hash = sha256_(token);
  var rows = findRows_('sessions', function(r) { return r.token_hash === hash; });
  if (!rows.length || new Date(rows[0].expires_at).getTime() <= Date.now()) throw new Error('Sesi berakhir. Masuk kembali.');
  var members = findRows_('members', function(r) { return r.member_id === rows[0].member_id; });
  if (!members.length || members[0].status !== 'AKTIF') throw new Error('Akun tidak aktif.');
  return members[0];
}
function requireAdmin_(token) {
  var member = session_(token);
  if (member.role !== 'ADMIN') throw new Error('Akses ditolak.');
  return member;
}
function loginGuard_(wa) {
  var c = CacheService.getScriptCache(), raw = c.get('ngd_login_' + sha256_(wa));
  var state = raw ? JSON.parse(raw) : {attempts:0};
  if (state.attempts >= NGD.MAX_LOGIN_FAILURES) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  return state;
}
function noteLoginFailure_(wa) {
  var cache = CacheService.getScriptCache(), key = 'ngd_login_' + sha256_(wa);
  var state = loginGuard_(wa);
  state.attempts++;
  cache.put(key, JSON.stringify(state), NGD.LOCK_MINUTES * 60);
}
function clearLoginFailures_(wa) { CacheService.getScriptCache().remove('ngd_login_' + sha256_(wa)); }
function updateActivity_(member) {
  var elapsed = Date.now() - new Date(member.joined_at).getTime();
  var patch = {last_active_at: now_()};
  if (elapsed >= 14 * 86400000) patch.d14_active = true;
  if (elapsed >= 30 * 86400000) patch.d30_active = true;
  updateRow_('members', member._row, patch);
}
function grantInitialCredit_(memberId, amount) {
  var existing = findRows_('credits_ledger', function(r) { return r.member_id === memberId && r.tipe === 'GRANT'; });
  if (existing.length) return;
  appendRow_('credits_ledger', {entry_id:recordId_('L'),member_id:memberId,created_at:now_(),tipe:'GRANT',jumlah:amount,status:'POSTED',ref_id:'',tool_id:'',keterangan:'Kredit sambutan member',saldo_setelah:amount});
  logAudit_(memberId, 'MEMBER', 'CREDIT_GRANT', 'credits_ledger', memberId, '', 'POSTED', {amount:amount});
}

// ===== SEED =====
function seedSettings_() {
  var entries = [
    ['nama_brand','Ngulik Digital','TEXT'], ['gelombang_aktif',1,'NUMBER'],
    ['kuota_gelombang',50,'NUMBER'], ['mode_pendaftaran','TERBUKA','TEXT'],
    ['wa_admin','6289509016792','TEXT'], ['email_admin',Session.getEffectiveUser().getEmail(),'TEXT'],
    ['link_classroom','https://classroom.google.com','TEXT'],
    ['qris_gambar_path','assets/qris.png','TEXT'], ['qris_atas_nama','','TEXT'],
    ['order_expiry_menit',15,'NUMBER'], ['kode_unik_min',100,'NUMBER'], ['kode_unik_max',999,'NUMBER'],
    ['trial_hari',30,'NUMBER'], ['kredit_awal',10,'NUMBER'], ['kredit_peringatan_persen',20,'NUMBER'],
    ['komisi_persen',25,'NUMBER'], ['komisi_hanya_order_pertama',true,'BOOL'],
    ['masa_tahan_hari',14,'NUMBER'], ['min_payout',50000,'NUMBER'],
    ['ref_cookie_hari',30,'NUMBER'], ['ai_base_url','https://app.sobatagent.com/','TEXT'],
    ['ai_endpoint_path','','TEXT'], ['ai_model','','TEXT'],
    ['ai_rate_limit_per_menit',5,'NUMBER'], ['ai_max_input_char',1500,'NUMBER'],
    ['teks_disclosure_affiliate','Beberapa link di halaman ini adalah link affiliate. Kami bisa mendapat komisi tanpa biaya tambahan untukmu.','TEXT'],
    ['versi_skema',1,'NUMBER']
  ];
  // Jaga pengaturan lama; isi key yang belum ada, bukan menimpa.
  var existing = {};
  readAll_('pengaturan_sistem').forEach(function(r) { existing[r.key] = true; });
  var count = 0;
  entries.forEach(function(row) {
    if (!existing[row[0]]) {
      appendRow_('pengaturan_sistem', {key:row[0],value:row[1],tipe:row[2],deskripsi:''});
      count++;
    }
  });
  // Isi email admin lama yang masih kosong; jangan timpa alamat yang sudah disetel.
  var emailRow = findRows_('pengaturan_sistem', function(r) { return r.key === 'email_admin'; })[0];
  var email = Session.getEffectiveUser().getEmail();
  if (emailRow && !emailRow.value && email) updateRow_('pengaturan_sistem', emailRow._row, {value: email});
  return count;
}
function seedCatalog_() {
  var rows = [
    ['P-3IN1','Paket 3-in-1: Bio Link + Profil Bisnis + Katalog Checkout Kurir','Akses Bio Link, profil usaha, dan katalog selama 30 hari.','LANGGANAN_30H',99000,0,30,false,true,true,1],
    ['P-POS','Aplikasi POS Kasir Sederhana (lisensi sekali bayar)','Lisensi sekali bayar; aktivasi diverifikasi admin.','LISENSI_SEKALI',149000,0,0,true,true,true,2],
    ['P-CANVA','Seat Canva Pro (30 hari)','Undangan seat 30 hari diproses admin.','SEAT_30H',35000,0,30,true,true,true,3],
    ['P-KREDIT-50','Top-Up 50 Kredit AI','Tambahan 50 kredit AI.','TOPUP_KREDIT',25000,50,0,false,false,true,4],
    ['P-KREDIT-150','Top-Up 150 Kredit AI','Tambahan 150 kredit AI.','TOPUP_KREDIT',60000,150,0,false,false,true,5],
    ['P-KREDIT-400','Top-Up 400 Kredit AI','Tambahan 400 kredit AI.','TOPUP_KREDIT',140000,400,0,false,false,true,6]
  ];
  return seedIfEmpty_('katalog_produk', rows.map(function(r) {
    var names = NGD.HEADERS.katalog_produk.split(','), o={};
    names.forEach(function(k,i){o[k]=r[i];});return o;
  }));
}
function seedAiTools_() {
  var entries = [
    ['T-CAPTION','Caption Instagram Produk','Buat caption menarik','Tuliskan produk dan keunggulannya','Buat 3 pilihan caption Instagram untuk usaha {{nama_usaha}} tentang: {{input}}. Bahasa Indonesia santai, sertakan ajakan beli dan 5 hashtag relevan.',1,true,1],
    ['T-DESKRIPSI','Deskripsi Produk Marketplace','Tulis deskripsi marketplace','Tuliskan detail produk','Tulis deskripsi produk menarik dan jujur untuk usaha {{nama_usaha}}: {{input}}. Format: judul, 3 keunggulan, spesifikasi singkat, ajakan membeli.',1,true,2],
    ['T-BALASAN','Balasan Chat Pelanggan','Balas pesan pelanggan','Tempel pesan pelanggan','Buat balasan WhatsApp yang ramah dan singkat dari usaha {{nama_usaha}} untuk pesan pelanggan ini: {{input}}.',1,true,3],
    ['T-KONTEN7','Ide Konten 7 Hari','Rencana konten seminggu','Tuliskan topik konten','Susun rencana konten media sosial 7 hari untuk usaha {{nama_usaha}} dengan topik: {{input}}. Berikan ide, format (foto/video/story), dan ajakan bertindak per hari.',2,true,4]
  ];
  return seedIfEmpty_('ai_tools', entries.map(function(r) {var o={}; NGD.HEADERS.ai_tools.split(',').forEach(function(h,i){o[h]=r[i];});return o;}));
}
function seedModules_() {
  var titles = [
    ['Orientasi dan Setup Akun','Kenali alur program dan siapkan akun.'],
    ['Bio Link dan Profil Bisnis','Bangun profil usaha yang siap dibagikan.'],
    ['Katalog dan Checkout Kurir','Siapkan katalog serta alur pemesanan.'],
    ['Konten Cepat dengan Studio AI','Gunakan AI untuk konten pemasaran.'],
    ['Kasir POS Sederhana','Pelajari dasar operasi kasir.'],
    ['Strategi Referral dan Etalase Rekomendasi','Pahami promosi referral dan rekomendasi.']
  ];
  return seedIfEmpty_('modul_belajar', titles.map(function(r,i) {return {modul_id:'MOD-'+('0'+(i+1)).slice(-2),urut:i+1,judul:r[0],deskripsi:r[1],url_classroom:'',aktif:true};}));
}

// ===== SETUP: aman dijalankan ulang, tidak menghapus data =====
function ensureSheets_() {
  var ss=db_();
  Object.keys(NGD.HEADERS).forEach(function(name) {
    var required=NGD.HEADERS[name].split(',');
    var sh=ss.getSheetByName(name);
    if (!sh) sh=ss.insertSheet(name);
    if (sh.getMaxColumns()<required.length) sh.insertColumnsAfter(sh.getMaxColumns(),required.length-sh.getMaxColumns());
    var current=sh.getLastRow()?sh.getRange(1,1,1,Math.max(sh.getLastColumn(),required.length)).getValues()[0].slice(0,required.length):[];
    if (!current.some(function(x){return x!=='';})) sh.getRange(1,1,1,required.length).setValues([required]);
    else if (current.join('|')!==required.join('|')) throw new Error('Header berbeda pada tab '+name+'. Periksa sebelum mengubah.');
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,required.length).setBackground('#e8eef2').setFontWeight('bold');
  });
}
function installFormula_(name, header, startRow, builder) {
  var sheet=tbl_(name).sheet, col=tbl_(name).headers.indexOf(header)+1;
  var target=sheet.getRange(startRow,col);
  if (!target.getFormula() && target.getValue()==='') target.setFormula(builder(startRow));
}
function ensureFormulas_() {
  installFormula_('members','saldo_kredit',2,function(r) {
    return '=IF('+refCell_('members','member_id',r)+'="";"";SUMIF('+colRef_('credits_ledger','member_id')+';'+refCell_('members','member_id',r)+';'+colRef_('credits_ledger','jumlah')+'))';
  });
  [[14,'retensi_14','d14_active'],[30,'retensi_30','d30_active']].forEach(function(spec){
    installFormula_('members',spec[1],2,function(r){
      return '=IF('+refCell_('members','member_id',r)+'="";"";IF('+refCell_('members',spec[2],r)+'=TRUE;"RETAINED";IF(TODAY()-'+refCell_('members','joined_at',r)+'<'+spec[0]+';"BELUM_WAKTUNYA";"CHURN")))';
    });
  });
  installFormula_('etalase_affiliate_luar','klik_total',2,function(r){
    return '=IF('+refCell_('etalase_affiliate_luar','item_id',r)+'="";"";COUNTIFS('+colRef_('klik_log','tipe')+';"ETALASE_LUAR";'+colRef_('klik_log','item_id')+';'+refCell_('etalase_affiliate_luar','item_id',r)+'))';
  });
}
function ensureAdmin_() {
  var existing=findRows_('members',function(r){return r.role==='ADMIN';});
  if (existing.length) return {created:false,pin:null,wa:null};
  var wa=normalizeWa_(setting_('wa_admin',''));
  if (findRows_('members',function(r){return r.wa===wa;}).length) throw new Error('Nomor WA admin sudah dipakai member.');
  var pin=randomPin_(), salt=newSalt_();
  var adminId='M-0001';
  if (findRows_('members',function(r){return r.member_id===adminId;}).length) throw new Error('ID admin sudah digunakan.');
  appendRow_('members',{member_id:adminId,role:'ADMIN',nama:'Admin Ngulik Digital',wa:wa,nama_usaha:'Ngulik Digital',pin_hash:pinHash_(pin,salt),pin_salt:salt,kode_referral:uuid_().slice(0,8),referred_by:'',status:'AKTIF',joined_at:now_(),last_active_at:now_(),d14_active:false,d30_active:false,status_pos:'BELUM',status_canva:'BELUM'});
  logAudit_(adminId,'ADMIN','ADMIN_CREATED','members',adminId,'','AKTIF',{});
  // Dialog harus di luar lock; jangan pernah mencatat PIN di Logger.
  return {created:true,pin:pin,wa:wa};
}
function setupDatabase() {
  // Jangan letakkan UI alert di callback lock: alert menangguhkan eksekusi Apps Script.
  var result=withLock_(function(){
    ensureSheets_();
    var counts={pengaturan_sistem:seedSettings_(),katalog_produk:seedCatalog_(),ai_tools:seedAiTools_(),modul_belajar:seedModules_()};
    ensureFormulas_();
    var admin=ensureAdmin_();
    ['members','sessions','audit_logs','credits_ledger'].forEach(function(name) {
      var sh=tbl_(name).sheet;
      if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).some(function(p){return p.getDescription()==='Ngulik Digital: data sensitif';})) {
        sh.protect().setDescription('Ngulik Digital: data sensitif').setWarningOnly(true);
      }
    });
    SpreadsheetApp.flush();
    return {tabs:Object.keys(NGD.HEADERS).length,seed:counts,admin:admin};
  });
  var message='Setup selesai.\nTab: '+result.tabs+
    '\nSeed baru: '+JSON.stringify(result.seed)+
    '\nAdmin baru: '+(result.admin.created?'ya':'tidak')+
    '\nJangan deploy sebelum BATCH 2 dan pengujian selesai.';
  if(result.admin.created) {
    message+='\n\nPIN ADMIN AWAL (catat secara privat): '+result.admin.pin+
      '\nWA: '+result.admin.wa+'\nPIN hanya ditampilkan sekali.';
  } else {
    message+='\nAkun ADMIN sudah ada. Bila PIN awal belum tercatat, jalankan resetAdminPin satu kali.';
  }
  SpreadsheetApp.getUi().alert(message);
  return {tabs:result.tabs,seed:result.seed,adminCreated:result.admin.created};
}
function resetAdminPin() {
  // PIN hanya dibawa di memori hingga dialog tampil; jangan dikirim ke log.
  var result=withLock_(function(){
    var admin=findRows_('members',function(r){return r.role==='ADMIN';})[0];
    if(!admin) throw new Error('Jalankan setupDatabase lebih dahulu.');
    var pin=randomPin_(),salt=newSalt_();
    updateRow_('members',admin._row,{pin_salt:salt,pin_hash:pinHash_(pin,salt)});
    findRows_('sessions',function(r){return r.member_id===admin.member_id;}).reverse().forEach(function(r){tbl_('sessions').sheet.deleteRow(r._row);});
    logAudit_(admin.member_id,'ADMIN','ADMIN_PIN_RESET','members',admin.member_id,'','',{});
    SpreadsheetApp.flush();
    return {pin:pin};
  });
  SpreadsheetApp.getUi().alert('PIN admin baru: '+result.pin+'\nCatat sekarang. PIN hanya ditampilkan sekali.');
  return {success:true};
}
function healthCheck() {
  var report=[];
  Object.keys(NGD.HEADERS).forEach(function(name){
    try {var actual=tbl_(name).headers.join(',');report.push((actual===NGD.HEADERS[name]?'OK ':'GAGAL ')+name);}
    catch(e){report.push('GAGAL '+name);}
  });
  report.push((PropertiesService.getScriptProperties().getProperty('AI_API_KEY')?'OK ':'BELUM ')+'AI_API_KEY');
  report.push((ScriptApp.getProjectTriggers().length?'OK ':'BELUM ')+'Triggers (BATCH 2)');
  report.push((setting_('wa_admin','')?'OK ':'GAGAL ')+'WA Admin');
  SpreadsheetApp.getUi().alert(report.join('\n'));
  return report;
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ngulik Digital')
    .addItem('Setup database','setupDatabase')
    .addItem('Pasang trigger','installTriggers')
    .addItem('Reset PIN admin','resetAdminPin')
    .addItem('Health check','healthCheck')
    .addToUi();
}

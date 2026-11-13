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
function inspectDatabaseSetup() {
  // Baca-saja: tidak memasang format, proteksi, rumus, atau dialog.
  var ss=db_(),checks=[],ready=true;
  Object.keys(NGD.HEADERS).forEach(function(name){
    var sh=ss.getSheetByName(name),expected=NGD.HEADERS[name].split(',');
    if(!sh){checks.push(name+':MISSING');ready=false;return;}
    var actual=sh.getRange(1,1,1,expected.length).getValues()[0].map(String);
    if(actual.join('|')!==expected.join('|')){checks.push(name+':MISMATCH');ready=false;}
    else checks.push(name+':OK');
  });
  var admins=[];
  if(ready)admins=findRows_('members',function(r){return r.role==='ADMIN';});
  var result={schemaOk:ready,tabsChecked:checks.length,adminExists:admins.length>0,adminCount:admins.length,details:checks};
  console.log('SETUP_INSPECTION '+JSON.stringify(result));
  return result;
}
function setupDatabase() {
  // Bila database sudah disiapkan, hentikan lebih awal tanpa kunci dan tanpa UI alert.
  // Jalur pertama kali dipertahankan hanya untuk database yang belum diinisialisasi.
  var inspection=inspectDatabaseSetup();
  if(inspection.schemaOk&&inspection.adminExists){
    console.log('SETUP_ALREADY_COMPLETE — instalasi tidak diulang; tidak ada perubahan data.');
    return {alreadyInitialized:true,tabs:inspection.tabsChecked,adminCount:inspection.adminCount};
  }
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
    .addItem('Periksa database (baca-saja)','inspectDatabaseSetup')
    .addItem('Pasang trigger','installTriggers')
    .addItem('Reset PIN admin','resetAdminPin')
    .addItem('Health check','healthCheck')
    .addToUi();
}


// ===== BATCH 2: API, ORDER, KREDIT, AFFILIATE, ADMIN =====
// Semua aksi mutasi harus lewat server; antarmuka tidak dipercaya.
function ngdError_(code, message) { var e = new Error(message); e.publicCode = code; return e; }
function require_(condition, code, message) { if (!condition) throw ngdError_(code,message); }
function publicMember_(m) {
  var keys=['member_id','role','nama','wa','nama_usaha','kode_referral','status','joined_at','jenis_usaha','kota','deskripsi_usaha','instagram','trial_mulai','trial_berakhir','akses_3in1_sampai','sumber_akses_3in1','url_halaman_bisnis','status_pos','pos_lisensi_kode','status_canva','canva_email','canva_mulai','canva_berakhir'];
  var o={};keys.forEach(function(k){o[k]=m[k] instanceof Date ? isoWib_(m[k]) : m[k];});o.saldo_kredit=creditBalance_(m.member_id);return o;
}
function member_(token) {
  try {return session_(token);} catch(e) {throw ngdError_('UNAUTHORIZED','Silakan masuk kembali.');}
}
function activeMember_(token) {
  var m=member_(token);
  require_(m.status==='AKTIF','FORBIDDEN','Akun belum aktif.');
  return m;
}
function admin_(token) {
  var m=activeMember_(token);
  require_(m.role==='ADMIN','FORBIDDEN','Akses tidak diizinkan.');
  return m;
}
function byId_(name,field,id) {
  return findRows_(name,function(r){return String(r[field])===String(id);})[0]||null;
}
function auditStatus_(actor,entity,row,from,to) {
  logAudit_(actor.member_id,actor.role,entity+'_STATUS',entity,row.order_id||row.member_id||row.komisi_id,from,to,{});
}
function creditBalance_(id) {return readAll_('credits_ledger').filter(function(r){return r.member_id===id;}).reduce(function(s,r){return s+Number(r.jumlah||0);},0);}
function creditHistory_(id) {return readAll_('credits_ledger').filter(function(r){return r.member_id===id;}).slice(-20).reverse();}
function nextMemberId_() {
  var max=readAll_('members').reduce(function(n,r){var match=/^M-(\d+)$/.exec(String(r.member_id));return match?Math.max(n,Number(match[1])):n;},0);
  return 'M-'+String(max+1).padStart(4,'0');
}
function newReferralCode_() {
  var used={};readAll_('members').forEach(function(m){used[m.kode_referral]=true;});
  for(var i=0;i<50;i++){var v=uuid_().slice(0,8);if(!used[v])return v;}
  throw ngdError_('CONFLICT','Kode referral belum bisa dibuat. Coba lagi.');
}
function memberCount_() {return findRows_('members',function(r){return r.role==='MEMBER'&&r.status==='AKTIF';}).length;}
function updateSetting_(key,value) {
  var r=byId_('pengaturan_sistem','key',key);require_(r,'NOT_FOUND','Pengaturan tidak ditemukan.');
  updateRow_('pengaturan_sistem',r._row,{value:value});
}
function newSessionMember_(m) {return {token:issueSession_(m),profil:publicMember_(m)};}
function authRegister_(p) {
  return withLock_(function(){
    var wa=normalizeWa_(p.wa), pin=String(p.pin||'');checkPin_(pin);
    require_(safeText_(p.nama,80).length>=2,'VALIDATION','Nama minimal dua karakter.');
    require_(safeText_(p.nama_usaha,100).length>=2,'VALIDATION','Nama usaha minimal dua karakter.');
    require_(p.setuju_kebijakan===true,'VALIDATION','Persetujuan kebijakan diperlukan.');
    require_(!byId_('members','wa',wa),'CONFLICT','Nomor WhatsApp sudah terdaftar.');
    var s=settings_(),mode=String(s.mode_pendaftaran||'TERBUKA');
    require_(mode!=='TERTUTUP','QUOTA_FULL','Pendaftaran sementara ditutup.');
    var active=memberCount_(),wait=mode==='WAITING_LIST'||active>=Number(s.kuota_gelombang||50);
    var ref=String(p.ref||'').toUpperCase(),referrer=ref?byId_('members','kode_referral',ref):null;
    if(referrer&&referrer.wa===wa)referrer=null;
    if(referrer&&(referrer.status!=='AKTIF'||referrer.role!=='MEMBER'))referrer=null;
    var salt=newSalt_(),id=nextMemberId_(),joined=now_(),status=wait?'WAITING_LIST':'AKTIF';
    var m={member_id:id,role:'MEMBER',nama:safeText_(p.nama,80),wa:wa,nama_usaha:safeText_(p.nama_usaha,100),pin_hash:pinHash_(pin,salt),pin_salt:salt,kode_referral:newReferralCode_(),referred_by:referrer?referrer.member_id:'',status:status,joined_at:joined,last_active_at:joined,status_pos:'BELUM',status_canva:'BELUM',d14_active:false,d30_active:false};
    appendRow_('members',m);logAudit_(id,'MEMBER','REGISTER','members',id,'',status,{});
    if(wait){return {status:status,posisi:findRows_('members',function(r){return r.status==='WAITING_LIST';}).length};}
    grantInitialCredit_(id,Number(s.kredit_awal||10));
    if(active+1>=Number(s.kuota_gelombang||50)){updateSetting_('mode_pendaftaran','WAITING_LIST');logAudit_('SYSTEM','SYSTEM','REGISTRATION_FULL','pengaturan_sistem','mode_pendaftaran','TERBUKA','WAITING_LIST',{});}
    return {status:status,sesi:newSessionMember_(m)};
  });
}
function authLogin_(p) {
  var wa=normalizeWa_(p.wa),pin=String(p.pin||'');checkPin_(pin);
  loginGuard_(wa);
  var m=byId_('members','wa',wa);
  if(!m || pinHash_(pin,m.pin_salt)!==m.pin_hash){
    noteLoginFailure_(wa);throw ngdError_('UNAUTHORIZED','Nomor WhatsApp atau PIN salah.');
  }
  require_(m.status==='AKTIF','FORBIDDEN','Akun belum aktif.');
  clearLoginFailures_(wa);updateActivity_(m);
  return newSessionMember_(m);
}
function authLogout_(token) {
  var hash=sha256_(token),rows=findRows_('sessions',function(r){return r.token_hash===hash;});
  rows.reverse().forEach(function(r){tbl_('sessions').sheet.deleteRow(r._row);});
  return {success:true};
}
function authChangePin_(m,p) {
  checkPin_(p.pin_lama);checkPin_(p.pin_baru);
  require_(pinHash_(p.pin_lama,m.pin_salt)===m.pin_hash,'UNAUTHORIZED','PIN lama salah.');
  var salt=newSalt_();updateRow_('members',m._row,{pin_salt:salt,pin_hash:pinHash_(p.pin_baru,salt)});
  logAudit_(m.member_id,m.role,'PIN_CHANGED','members',m.member_id,'','',{});
  return {success:true};
}
function publicInfo_(p) {
  var s=settings_(),quota=Number(s.kuota_gelombang||50),used=memberCount_();
  var ref=String(p.ref||'').toUpperCase(),referer=ref?byId_('members','kode_referral',ref):null;
  return {nama_brand:s.nama_brand,wa_admin:s.wa_admin,kuota:quota,terpakai:used,sisa:Math.max(0,quota-used),mode:used>=quota?'WAITING_LIST':s.mode_pendaftaran,disclosure:s.teks_disclosure_affiliate,referrer:referer&&referer.status==='AKTIF'?String(referer.nama).split(' ')[0]:null};
}
function modules_() {return readAll_('modul_belajar').filter(function(r){return r.aktif===true;}).sort(function(a,b){return a.urut-b.urut;});}
function creditWarning_(id) {
  var rows=readAll_('credits_ledger').filter(function(r){return r.member_id===id;});
  var total=rows.filter(function(r){return ['GRANT','TOPUP'].indexOf(r.tipe)>=0||(r.tipe==='ADJUST'&&Number(r.jumlah)>0);}).reduce(function(s,r){return s+Number(r.jumlah||0);},0);
  return total>0&&creditBalance_(id)<=total*Number(setting_('kredit_peringatan_persen',20))/100;
}
function orderView_(order,m) {
  require_(m.role==='ADMIN'||order.member_id===m.member_id,'FORBIDDEN','Pesanan tidak ditemukan.');
  var o={};Object.keys(order).forEach(function(k){if(k!=='_row')o[k]=order[k] instanceof Date?isoWib_(order[k]):order[k];});return o;
}
function expireOrder_(o) {
  if(o.status==='PENDING'&&new Date(o.expires_at).getTime()<=Date.now()) {
    updateRow_('orders',o._row,{status:'EXPIRED'});
    logAudit_('SYSTEM','SYSTEM','ORDER_EXPIRED','orders',o.order_id,'PENDING','EXPIRED',{});
    o.status='EXPIRED';
  }
  return o;
}
function newOrder_(m,p,requestId) {
  return withLock_(function(){
    require_(m.role==='MEMBER','FORBIDDEN','Hanya member dapat membeli.');
    var product=byId_('katalog_produk','product_id',String(p.product_id||''));
    require_(product&&product.aktif===true,'NOT_FOUND','Produk tidak tersedia.');
    var retry=byId_('orders','request_id',requestId);
    if(retry){require_(retry.member_id===m.member_id,'CONFLICT','ID permintaan sudah dipakai.');return orderView_(retry,m);}
    var mine=findRows_('orders',function(o){return o.member_id===m.member_id&&o.product_id===product.product_id&&['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0;});
    if(mine.length){var existing=expireOrder_(mine[0]);if(existing.status!=='EXPIRED')return orderView_(existing,m);}
    var s=settings_(),min=Number(s.kode_unik_min||100),max=Number(s.kode_unik_max||999),price=Number(product.harga);
    require_(Number.isInteger(price)&&price>=0,'VALIDATION','Harga produk belum valid.');
    var open=readAll_('orders').filter(function(o){return ['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0;});
    var taken={};open.forEach(function(o){taken[Number(o.total_bayar)]=true;});
    var code=null;for(var k=0;k<25;k++){var n=min+Math.floor(Math.random()*(max-min+1));if(!taken[price+n]){code=n;break;}}
    require_(code!==null,'CONFLICT','Sistem sedang ramai. Coba lagi.');
    var created=now_(),id='NGD-'+Utilities.formatDate(created,NGD.TZ,'yyMMdd')+'-'+uuid_().slice(0,4);
    var o={order_id:id,member_id:m.member_id,product_id:product.product_id,nama_produk:product.nama,harga_dasar:price,kode_unik:code,total_bayar:price+code,status:'PENDING',metode:'QRIS_STATIS',created_at:created,expires_at:new Date(created.getTime()+Number(s.order_expiry_menit||15)*60000),ref_member_id:m.referred_by||'',request_id:requestId};
    appendRow_('orders',o);logAudit_(m.member_id,m.role,'ORDER_CREATED','orders',id,'','PENDING',{product_id:product.product_id});
    return orderView_(o,m);
  });
}
function getOrder_(m,id) {
  return withLock_(function(){
    var o=byId_('orders','order_id',id);require_(o,'NOT_FOUND','Pesanan tidak ditemukan.');
    require_(m.role==='ADMIN'||o.member_id===m.member_id,'FORBIDDEN','Pesanan tidak ditemukan.');
    return orderView_(expireOrder_(o),m);
  });
}
function transitionOrder_(m,id,type,p) {
  return withLock_(function(){
    var o=byId_('orders','order_id',id);require_(o,'NOT_FOUND','Pesanan tidak ditemukan.');
    var admin=m.role==='ADMIN';
    require_(admin||o.member_id===m.member_id,'FORBIDDEN','Pesanan tidak ditemukan.');
    expireOrder_(o);
    if(type==='confirm'&&!admin&&o.status==='MENUNGGU_VERIFIKASI')return orderView_(o,m);
    if(type==='cancel'&&!admin&&o.status==='CANCELLED')return orderView_(o,m);
    var from=o.status,to='',patch={};
    if(type==='confirm'&&!admin&&from==='PENDING'){to='MENUNGGU_VERIFIKASI';patch.konfirmasi_bayar_at=now_();}
    else if(type==='cancel'&&!admin&&from==='PENDING'){to='CANCELLED';patch.cancelled_at=now_();}
    else if(type==='approve'&&admin&&['MENUNGGU_VERIFIKASI','EXPIRED'].indexOf(from)>=0){
      if(from==='EXPIRED')require_(safeText_(p.alasan,300).length>=5,'VALIDATION','Alasan pembayaran terlambat wajib diisi.');
      to='PAID';patch.paid_at=now_();patch.verified_by=m.member_id;patch.catatan_admin=String(p.alasan||'');
    } else if(type==='reject'&&admin&&['PENDING','MENUNGGU_VERIFIKASI'].indexOf(from)>=0){
      require_(safeText_(p.alasan,300).length>=5,'VALIDATION','Alasan penolakan diperlukan.');to='CANCELLED';patch.cancelled_at=now_();patch.catatan_admin=p.alasan;
    } else throw ngdError_('CONFLICT','Status pesanan tidak mengizinkan tindakan ini.');
    patch.status=to;updateRow_('orders',o._row,patch);
    logAudit_(m.member_id,m.role,'ORDER_'+type.toUpperCase(),'orders',id,from,to,{alasan:patch.catatan_admin||''});
    if(to==='PAID')onPaid_(o,m);
    return orderView_(byId_('orders','order_id',id),m);
  });
}
function grantCredits_(id,amount,ref,kind) {
  var balance=creditBalance_(id),final=balance+amount;
  appendRow_('credits_ledger',{entry_id:recordId_('L'),member_id:id,created_at:now_(),tipe:kind||'ADJUST',jumlah:amount,status:'POSTED',ref_id:ref||'',keterangan:'Transaksi '+(ref||''),saldo_setelah:final});
  logAudit_('SYSTEM','SYSTEM','CREDIT_'+(kind||'ADJUST'),'credits_ledger',ref||id,'','POSTED',{jumlah:amount});
}
function onPaid_(o,actor) {
  var product=byId_('katalog_produk','product_id',o.product_id),member=byId_('members','member_id',o.member_id);
  require_(product&&member,'CONFLICT','Data produk atau member tidak tersedia.');
  var patch={},fulfilled=false,days=Number(product.durasi_hari||0),end;
  if(product.tipe==='TOPUP_KREDIT'){
    grantCredits_(member.member_id,Number(product.kredit_diberikan),o.order_id,'TOPUP');fulfilled=true;
  } else if(product.tipe==='LANGGANAN_30H'){
    var old=member.akses_3in1_sampai?new Date(member.akses_3in1_sampai).getTime():0;
    end=new Date(Math.max(Date.now(),old)+days*86400000);
    updateRow_('members',member._row,{akses_3in1_sampai:end,sumber_akses_3in1:'BERBAYAR'});fulfilled=true;
  }else if(product.tipe==='LISENSI_SEKALI')updateRow_('members',member._row,{status_pos:'DIAJUKAN'});
  else if(product.tipe==='SEAT_30H')updateRow_('members',member._row,{status_canva:'DIAJUKAN'});
  if(fulfilled){updateRow_('orders',o._row,{status:'FULFILLED',fulfilled_at:now_()});logAudit_(actor.member_id,actor.role,'ORDER_FULFILLED','orders',o.order_id,'PAID','FULFILLED',{});}
  var s=settings_();
  if(member.referred_by&&product.bisa_komisi===true) {
    var any=findRows_('affiliate_commissions',function(c){return c.referred_member_id===member.member_id;});
    if(!s.komisi_hanya_order_pertama||!any.length){
      var value=Math.floor(Number(o.harga_dasar)*Number(s.komisi_persen||25)/100);
      var when=new Date(Date.now()+Number(s.masa_tahan_hari||14)*86400000);
      var cid=recordId_('K');
      appendRow_('affiliate_commissions',{komisi_id:cid,referrer_id:member.referred_by,referred_member_id:member.member_id,order_id:o.order_id,dasar_komisi:o.harga_dasar,persen:s.komisi_persen,nominal:value,status:'PENDING',created_at:now_(),approve_after:when});
      logAudit_('SYSTEM','SYSTEM','COMMISSION_CREATED','affiliate_commissions',cid,'','PENDING',{amount:value});
    }
  }
}
function approveFulfillment_(admin,p) {
  return withLock_(function(){
    var o=byId_('orders','order_id',p.order_id);require_(o&&o.status==='PAID','CONFLICT','Pesanan belum siap dipenuhi.');
    var product=byId_('katalog_produk','product_id',o.product_id),m=byId_('members','member_id',o.member_id);
    var now=now_();
    if(product.tipe==='LISENSI_SEKALI')updateRow_('members',m._row,{status_pos:'AKTIF',pos_lisensi_kode:'POS-'+uuid_().slice(0,4)+'-'+uuid_().slice(0,4)});
    else if(product.tipe==='SEAT_30H'){
      var mail=String(p.canva_email||'').trim();
      require_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail),'VALIDATION','Email undangan Canva tidak valid.');
      var past=m.canva_berakhir?new Date(m.canva_berakhir).getTime():0;
      var wasActive=['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(m.status_canva)>=0;
      updateRow_('members',m._row,{status_canva:wasActive?'AKTIF_BULAN_2':'AKTIF_BULAN_1',canva_email:mail,canva_mulai:now,canva_berakhir:new Date(Math.max(now.getTime(),past)+Number(product.durasi_hari||30)*86400000)});
    }else throw ngdError_('CONFLICT','Produk tidak memerlukan persetujuan.');
    updateRow_('orders',o._row,{status:'FULFILLED',fulfilled_at:now});
    logAudit_(admin.member_id,'ADMIN','ORDER_FULFILLED','orders',o.order_id,'PAID','FULFILLED',{});
    return orderView_(byId_('orders','order_id',o.order_id),admin);
  });
}
function refundOrder_(admin,p) {
  return withLock_(function(){
    var o=byId_('orders','order_id',p.order_id);
    require_(o&&['PAID','FULFILLED'].indexOf(o.status)>=0,'CONFLICT','Pesanan tidak dapat direfund.');
    require_(safeText_(p.alasan,300).length>=5,'VALIDATION','Alasan refund wajib diisi.');
    var m=byId_('members','member_id',o.member_id),product=byId_('katalog_produk','product_id',o.product_id),prev=o.status;
    updateRow_('orders',o._row,{status:'REFUNDED',refunded_at:now_(),catatan_admin:p.alasan});
    if(product.tipe==='TOPUP_KREDIT'&&prev==='FULFILLED')grantCredits_(m.member_id,-Number(product.kredit_diberikan),o.order_id,'ADJUST');
    if(product.tipe==='LANGGANAN_30H'&&prev==='FULFILLED'){
      var old=m.akses_3in1_sampai?new Date(m.akses_3in1_sampai).getTime():Date.now();
      updateRow_('members',m._row,{akses_3in1_sampai:new Date(old-Number(product.durasi_hari||30)*86400000)});
    }
    if(product.tipe==='LISENSI_SEKALI')updateRow_('members',m._row,{status_pos:'DITOLAK',pos_lisensi_kode:''});
    if(product.tipe==='SEAT_30H')updateRow_('members',m._row,{status_canva:'BERAKHIR'});
    findRows_('affiliate_commissions',function(c){return c.order_id===o.order_id;}).forEach(function(c){
      if(c.status!=='PAID'){updateRow_('affiliate_commissions',c._row,{status:'REVERSED',reversed_at:now_(),reversed_reason:p.alasan});logAudit_(admin.member_id,'ADMIN','COMMISSION_REVERSED','affiliate_commissions',c.komisi_id,c.status,'REVERSED',{});}
      else logAudit_(admin.member_id,'ADMIN','COMMISSION_RECOVERY_REQUIRED','affiliate_commissions',c.komisi_id,'PAID','PAID',{});
    });
    logAudit_(admin.member_id,'ADMIN','ORDER_REFUNDED','orders',o.order_id,prev,'REFUNDED',{alasan:p.alasan});
    return orderView_(byId_('orders','order_id',o.order_id),admin);
  });
}
function advanceTrial_(m,p) {
  return withLock_(function(){
    var fresh=byId_('members','member_id',m.member_id);
    require_(!fresh.onboarding_at,'CONFLICT','Aktivasi gratis hanya sekali.');
    var now=now_(),days=Number(setting_('trial_hari',30));
    updateRow_('members',fresh._row,{jenis_usaha:safeText_(p.jenis_usaha,80),kota:safeText_(p.kota,80),deskripsi_usaha:safeText_(p.deskripsi_usaha,500),instagram:safeText_(p.instagram,80),onboarding_at:now,trial_mulai:now,trial_berakhir:new Date(now.getTime()+days*86400000),akses_3in1_sampai:new Date(now.getTime()+days*86400000),sumber_akses_3in1:'TRIAL'});
    logAudit_(m.member_id,m.role,'TRIAL_ACTIVATED','members',m.member_id,'','TRIAL',{days:days});
    return {trial_berakhir:isoWib_(new Date(now.getTime()+days*86400000))};
  });
}
function publicCatalog_() {return readAll_('katalog_produk').filter(function(r){return r.aktif===true;}).map(function(r){return {product_id:r.product_id,nama:r.nama,deskripsi:r.deskripsi,tipe:r.tipe,harga:r.harga,kredit_diberikan:r.kredit_diberikan,durasi_hari:r.durasi_hari};});}
function dashboard_(m) {
  var modules=modules_(),done=findRows_('progress_member',function(r){return r.member_id===m.member_id;});
  var next=modules.filter(function(x){return !done.some(function(y){return x.modul_id===y.modul_id;});})[0]||null;
  var orders=findRows_('orders',function(o){return o.member_id===m.member_id&&['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0;});
  return {profil:publicMember_(m),saldo_kredit:creditBalance_(m.member_id),peringatan_kredit:creditWarning_(m.member_id),modul_berikutnya:next,modul_selesai:done.length,total_modul:modules.length,order_aktif:orders.map(function(o){return orderView_(o,m);})};
}
function affiliateDashboard_(m) {
  var all=readAll_('affiliate_commissions').filter(function(r){return r.referrer_id===m.member_id;});
  var sums={PENDING:0,APPROVED:0,PAID:0,REVERSED:0};all.forEach(function(c){sums[c.status]=(sums[c.status]||0)+Number(c.nominal||0);});
  return {kode_referral:m.kode_referral,link:'https://cuan74468-ux.github.io/ngulik-digital-member/?ref='+m.kode_referral,klik:findRows_('klik_log',function(r){return r.referrer_id===m.member_id&&r.tipe==='REFERRAL';}).length,pendaftar:findRows_('members',function(r){return r.referred_by===m.member_id;}).length,konversi:all.length,saldo:sums,komisi:all};
}
function requestPayout_(m) {
  return withLock_(function(){
    var all=findRows_('affiliate_commissions',function(r){return r.referrer_id===m.member_id&&r.status==='APPROVED'&&!r.payout_requested_at;});
    var total=all.reduce(function(s,r){return s+Number(r.nominal||0);},0);
    require_(total>=Number(setting_('min_payout',50000)),'CONFLICT','Komisi belum mencapai minimum pencairan.');
    all.forEach(function(r){updateRow_('affiliate_commissions',r._row,{payout_requested_at:now_()});});
    logAudit_(m.member_id,m.role,'PAYOUT_REQUEST','affiliate_commissions',m.member_id,'','REQUESTED',{amount:total});
    return {total:total,jumlah_komisi:all.length};
  });
}
function maintenance_() {
  return withLock_(function(){
    var now=Date.now(),changed={expired:0,commissions:0,credits:0,canva:0,sessions:0};
    readAll_('orders').forEach(function(o){if(o.status==='PENDING'&&new Date(o.expires_at).getTime()<=now){expireOrder_(o);changed.expired++;}});
    readAll_('affiliate_commissions').forEach(function(c){
      if(c.status==='PENDING'&&new Date(c.approve_after).getTime()<=now){
        var o=byId_('orders','order_id',c.order_id);
        if(o&&o.status!=='REFUNDED'){updateRow_('affiliate_commissions',c._row,{status:'APPROVED',approved_at:now_()});logAudit_('SYSTEM','SYSTEM','COMMISSION_APPROVED','affiliate_commissions',c.komisi_id,'PENDING','APPROVED',{});changed.commissions++;}
      }
    });
    readAll_('members').forEach(function(m){
      if(['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(m.status_canva)>=0&&m.canva_berakhir&&new Date(m.canva_berakhir).getTime()<now){
        updateRow_('members',m._row,{status_canva:'BERAKHIR'});logAudit_('SYSTEM','SYSTEM','CANVA_EXPIRED','members',m.member_id,m.status_canva,'BERAKHIR',{});changed.canva++;
      }
    });
    var sessions=findRows_('sessions',function(s){return new Date(s.expires_at).getTime()<=now;});
    sessions.reverse().forEach(function(s){tbl_('sessions').sheet.deleteRow(s._row);changed.sessions++;});
    return changed;
  });
}
function expireOrders() {return withLock_(function(){var count=0;readAll_('orders').forEach(function(o){if(o.status==='PENDING'&&new Date(o.expires_at).getTime()<=Date.now()){expireOrder_(o);count++;}});return count;});}
function dailyMaintenance() {return maintenance_();}
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t){if(['expireOrders','dailyMaintenance'].indexOf(t.getHandlerFunction())>=0)ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('expireOrders').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(1).create();
  console.log('TRIGGERS_OK');
  return 'TRIGGERS_OK';
}
function apiRouter_(action,token,p,requestId) {
  var m=null, admin=null;
  switch(action) {
    case 'getPublicInfo':return publicInfo_(p);
    case 'getKatalog':return publicCatalog_();
    case 'register':return authRegister_(p);
    case 'login':return authLogin_(p);
    case 'trackClick':
      return withLock_(function(){
        var type=p.tipe==='ETALASE_LUAR'?'ETALASE_LUAR':'REFERRAL',visitor=safeText_(p.visitor_id,120);
        require_(visitor.length>=8,'VALIDATION','Pengunjung tidak valid.');
        var ref=String(p.ref||'').toUpperCase(),r=ref?byId_('members','kode_referral',ref):null;
        var prior=findRows_('klik_log',function(x){return x.visitor_id===visitor&&x.tipe===type&&(type==='REFERRAL'?x.kode_referral===ref:x.item_id===p.item_id)&&new Date(x.timestamp).getTime()>Date.now()-86400000;});
        if(prior.length)return {recorded:false};
        appendRow_('klik_log',{click_id:recordId_('LOG'),timestamp:now_(),tipe:type,kode_referral:ref,referrer_id:r?r.member_id:'',item_id:String(p.item_id||''),visitor_id:visitor,member_id:''});
        return {recorded:true};
      });
  }
  m=activeMember_(token);
  switch(action) {
    case 'getMe':return publicMember_(m);
    case 'logout':return authLogout_(token);
    case 'changePin':return authChangePin_(m,p);
    case 'getBeranda':return dashboard_(m);
    case 'getTools':return {tools:readAll_('ai_tools').filter(function(r){return r.aktif===true;}).map(function(r){return {tool_id:r.tool_id,nama:r.nama,deskripsi:r.deskripsi,placeholder_input:r.placeholder_input,kredit_biaya:r.kredit_biaya};}),saldo:creditBalance_(m.member_id)};
    case 'getKreditRiwayat':return {saldo:creditBalance_(m.member_id),riwayat:creditHistory_(m.member_id),peringatan:creditWarning_(m.member_id)};
    case 'getOrder':return getOrder_(m,p.order_id);
    case 'listMyOrders':return findRows_('orders',function(o){return o.member_id===m.member_id;}).slice(-50).reverse().map(function(o){return orderView_(o,m);});
    case 'createOrder':return newOrder_(m,p,requestId);
    case 'confirmPayment':return transitionOrder_(m,p.order_id,'confirm',p);
    case 'cancelOrder':return transitionOrder_(m,p.order_id,'cancel',p);
    case 'submitOnboarding3in1':return advanceTrial_(m,p);
    case 'markModulSelesai':
      return withLock_(function(){var module=byId_('modul_belajar','modul_id',p.modul_id);require_(module&&module.aktif===true,'NOT_FOUND','Modul tidak tersedia.');if(!findRows_('progress_member',function(r){return r.member_id===m.member_id&&r.modul_id===p.modul_id;}).length)appendRow_('progress_member',{member_id:m.member_id,modul_id:p.modul_id,selesai_at:now_()});return {success:true};});
    case 'getEtalase':return readAll_('etalase_affiliate_luar').filter(function(r){return r.aktif===true;}).map(function(r){return {item_id:r.item_id,judul:r.judul,kategori:r.kategori,deskripsi_singkat:r.deskripsi_singkat,alasan_rekomendasi:r.alasan_rekomendasi,harga_info:r.harga_info,link_affiliate:r.link_affiliate,gambar_url:r.gambar_url};});
    case 'trackOutbound':return apiRouter_('trackClick',token,{tipe:'ETALASE_LUAR',visitor_id:p.visitor_id,item_id:p.item_id},requestId);
    case 'getAffiliateDashboard':return affiliateDashboard_(m);
    case 'requestPayout':return requestPayout_(m);
    case 'generateAI':throw ngdError_('AI_FAILED','Layanan AI belum diaktifkan admin. Kredit tidak dipotong.');
  }
  admin=admin_(token);
  switch(action){
    case 'adminGetDashboard':return {ringkasan:readAll_('ringkasan').map(function(r){return {metrik:r.metrik,nilai:r.nilai};}),followup:[]};
    case 'adminListOrders':return readAll_('orders').filter(function(r){return !p.status||r.status===p.status;}).slice(-100).reverse().map(function(r){return orderView_(r,admin);});
    case 'adminVerifyOrder':require_(['approve','reject'].indexOf(p.keputusan)>=0,'VALIDATION','Keputusan tidak dikenal.');return transitionOrder_(admin,p.order_id,p.keputusan,p);
    case 'adminFulfillOrder':return approveFulfillment_(admin,p);
    case 'adminRefundOrder':return refundOrder_(admin,p);
    case 'adminListMembers':return readAll_('members').filter(function(r){return r.role==='MEMBER';}).map(publicMember_);
    case 'adminListCommissions':return readAll_('affiliate_commissions');
    case 'adminGetSettings':return settings_();
    case 'adminUpdateSetting':
      return withLock_(function(){var allow=['link_classroom','mode_pendaftaran','komisi_persen','masa_tahan_hari','min_payout','kuota_gelombang'];require_(allow.indexOf(p.key)>=0,'FORBIDDEN','Pengaturan tidak dapat diubah.');var before=setting_(p.key,'');updateSetting_(p.key,p.value);logAudit_(admin.member_id,'ADMIN','SETTING_CHANGED','pengaturan_sistem',p.key,String(before),String(p.value),{});return {success:true};});
    case 'adminAdjustCredit':
      return withLock_(function(){var member=byId_('members','member_id',p.member_id);require_(member,'NOT_FOUND','Member tidak ditemukan.');var amount=Number(p.jumlah);require_(Number.isFinite(amount)&&amount!==0&&Math.abs(amount)<=100000,'VALIDATION','Nilai koreksi tidak valid.');require_(safeText_(p.alasan,300).length>=5,'VALIDATION','Alasan wajib diisi.');grantCredits_(member.member_id,amount,'ADMIN:'+admin.member_id,'ADJUST');return {saldo:creditBalance_(member.member_id)};});
    case 'adminMarkCommissionPaid':
      return withLock_(function(){var c=byId_('affiliate_commissions','komisi_id',p.komisi_id);require_(c&&c.status==='APPROVED'&&c.payout_requested_at,'CONFLICT','Komisi belum diajukan atau disetujui.');require_(safeText_(p.catatan,300).length>=5,'VALIDATION','Catatan pencairan diperlukan.');updateRow_('affiliate_commissions',c._row,{status:'PAID',paid_at:now_(),payout_note:p.catatan});logAudit_(admin.member_id,'ADMIN','COMMISSION_PAID','affiliate_commissions',c.komisi_id,'APPROVED','PAID',{});return {success:true};});
  }
  throw ngdError_('BAD_REQUEST','Aksi tidak dikenal.');
}
function apiOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value,function(k,v){return v instanceof Date?isoWib_(v):v;})).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  return apiOutput_({ok:true,data:{app:'Ngulik Digital API',version:NGD.VERSION,time:isoWib_(now_())},server_time:isoWib_(now_())});
}
function doPost(e) {
  try {
    var raw=e&&e.postData&&e.postData.contents;
    require_(typeof raw==='string'&&raw.length<16000,'BAD_REQUEST','Permintaan tidak valid.');
    var body=JSON.parse(raw),action=String(body.action||'').trim(),payload=body.payload||{};
    require_(/^[A-Za-z][A-Za-z0-9]{1,45}$/.test(action),'BAD_REQUEST','Nama aksi tidak valid.');
    require_(payload&&typeof payload==='object'&&!Array.isArray(payload),'BAD_REQUEST','Payload tidak valid.');
    // Pembatasan payload dan request_id sebelum mengambil kunci mutasi.
    var id=String(body.request_id||'');
    var reads=['getPublicInfo','getMe','getBeranda','getKatalog','getOrder','listMyOrders','getTools','getKreditRiwayat','getEtalase','getAffiliateDashboard','adminGetDashboard','adminListOrders','adminListMembers','adminListCommissions','adminGetSettings'];
    if(reads.indexOf(action)<0)require_(/^[a-zA-Z0-9_-]{16,80}$/.test(id),'VALIDATION','ID permintaan tidak valid.');
    var result=apiRouter_(action,String(body.token||''),payload,id);
    return apiOutput_({ok:true,data:result,server_time:isoWib_(now_())});
  }catch(err){
    var known=err&&err.publicCode;
    if(!known)console.error('NGD_ERROR '+(err&&err.stack?err.stack:String(err)));
    return apiOutput_({ok:false,error:{code:known||'INTERNAL',message:known?err.message:'Terjadi gangguan sistem. Silakan coba lagi.'},server_time:isoWib_(now_())});
  }
}

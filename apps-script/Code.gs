/**
 * Ngulik Digital Member — Apps Script backend (development).
 * Skema 27 tab (14 inti + 3 support + 7 LMS + 1 notifikasi + 1 jasa + 1 konten), autentikasi, API member/admin, pembayaran manual, kredit,
 * waiting list, dan rekonsiliasi. Belum lolos QA end-to-end.
 * Jangan deploy sebagai layanan publik atau mengaktifkan transaksi nyata.
 */

// ===== KONSTANTA =====
const NGD = Object.freeze({
  VERSION: '1.0.3',
  // Spreadsheet ID is read from Script Properties, not committed in source.
  DB_ID: '',
  TZ: 'Asia/Jakarta',
  SESSION_DAYS: 7,
  LOCK_MINUTES: 15,
  ADMIN_LOCK_MINUTES: 60, // akun ADMIN dikunci lebih lama: nomornya tampil di getPublicInfo
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
    ringkasan: 'metrik,nilai',
    support_tickets: 'ticket_id,member_id,product_id,order_id,kategori,judul,deskripsi,platform,versi_aplikasi,status,prioritas,assigned_to,created_at,updated_at,resolved_at,closed_at,request_id',
    ticket_activities: 'activity_id,ticket_id,actor_id,actor_role,jenis,dari_status,ke_status,pesan,created_at,request_id',
    product_releases: 'release_id,product_id,versi,judul,ringkasan,tipe_rilis,status,created_at,published_at,created_by,request_id',
    lms_courses: 'course_id,workspace_id,title,summary,published_title,published_summary,published_category,published_level,published_access_type,published_product_id,published_sort_order,category,level,access_type,product_id,sort_order,status,version,created_at,updated_at,published_at,archived_at,created_by,request_id',
    lms_lessons: 'lesson_id,course_id,title,body,media_url,published_title,published_body,published_media_url,published_kind,published_sort_order,published_duration_minutes,kind,sort_order,duration_minutes,status,version,created_at,updated_at,published_at,created_by,request_id,published_version',
    lms_enrollments: 'enrollment_id,member_id,course_id,status,enrolled_at,last_access_at,completed_at,request_id',
    lms_progress: 'progress_id,member_id,course_id,lesson_id,status,started_at,completed_at,request_id,lesson_version',
    lms_workspaces: 'workspace_id,course_id,name,workspace_status,created_at,updated_at,created_by,auto_created,request_id',
    lms_ai_jobs: 'job_id,workspace_id,course_id,lesson_id,task_type,brief,prompt,result_draft,status,created_at,updated_at,requested_by,reviewed_by,request_id',
    lms_revisions: 'revision_id,entity,entity_id,version,title,body,media_url,metadata_json,published_at,actor_id,request_id',
    notifications: 'notification_id,member_id,source,source_id,jenis,judul,pesan,status,created_at,read_at,request_id',
    service_requests: 'service_id,member_id,product_id,jenis_layanan,judul,brief,referensi_url,anggaran,status,penawaran_harga,penawaran_pesan,catatan_internal,created_at,updated_at,closed_at,request_id,revision',
    site_content: 'content_id,kind,placement,title,description,image_path,cta_label,cta_route,sort_order,start_date,end_date,status,created_at,updated_at,created_by,revision,request_id'
  }
});

// ===== UTIL =====
var NGD_DB_CACHE_ = null;
function db_() {
  if(NGD_DB_CACHE_)return NGD_DB_CACHE_;
  var id=String(PropertiesService.getScriptProperties().getProperty('NGD_DB_ID')||'').trim();
  if(id){
    NGD_DB_CACHE_=SpreadsheetApp.openById(id);
    return NGD_DB_CACHE_;
  }
  // Bound editor/menu calls may resolve their containing spreadsheet.
  var active=SpreadsheetApp.getActiveSpreadsheet();
  if(active){NGD_DB_CACHE_=active;return active;}
  throw new Error('NGD_DB_ID belum diisi pada Script Properties untuk konteks ini.');
}
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
  if (!/^62\d{8,13}$/.test(w)) throw ngdError_('VALIDATION','Nomor WhatsApp tidak valid.');
  return w;
}
function checkPin_(pin) {
  if (!/^\d{6}$/.test(String(pin || ''))) throw ngdError_('VALIDATION','PIN harus enam angka.');
}
// PIN baru (daftar / ganti PIN) tidak boleh mudah ditebak. Login lama tetap memakai
// checkPin_ saja, supaya akun dengan PIN lama masih bisa masuk lalu menggantinya.
function isWeakPin_(pin,wa) {
  var p=String(pin||'');
  if(!/^\d{6}$/.test(p))return true;
  if(/^(\d)\1{5}$/.test(p))return true;                       // 000000, 111111
  if(/^(\d\d)\1\1$/.test(p)||/^(\d{3})\1$/.test(p))return true;   // 121212, 123123
  if(/^(\d)\1(\d)\2(\d)\3$/.test(p))return true;              // 112233
  if('01234567890123456789'.indexOf(p)>=0)return true;          // 123456, 456789
  if('98765432109876543210'.indexOf(p)>=0)return true;          // 654321
  if(p.slice(3)===p.slice(0,3).split('').reverse().join(''))return true; // 123321
  if(['102030','123654','159753','147258','258369','789456','456123','520520','131313','696969','121314','123789','111222','000111','010203'].indexOf(p)>=0)return true;
  if(wa&&String(wa).slice(-6)===p)return true;                  // 6 digit terakhir nomor WA
  return false;
}
function checkNewPin_(pin,wa) {
  checkPin_(pin);
  if(isWeakPin_(pin,wa))throw ngdError_('VALIDATION',
    'PIN terlalu mudah ditebak. Hindari angka berurutan atau berulang dan 6 digit terakhir nomor WA.');
}
function randomStrongPin_() {
  for(var i=0;i<50;i++){var pin=randomPin_();if(!isWeakPin_(pin))return pin;}
  return randomPin_();
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
  if (text.length > max) throw ngdError_('VALIDATION','Teks terlalu panjang.');
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
  // Skip fully empty physical rows but preserve the real sheet row number.
  // Numeric zero and boolean false are legitimate values, not empty cells.
  return t.sheet.getRange(2, 1, count, t.headers.length).getValues()
    .reduce(function(items, row, i) {
      var populated = row.some(function(value) {
        return value !== '' && value !== null && value !== undefined;
      });
      if (!populated) return items;
      var item = {_row: i + 2};
      t.headers.forEach(function(h, j) { item[h] = row[j]; });
      items.push(item);
      return items;
    }, []);
}
// Treat external text as literal spreadsheet data, never an executable formula.
// Central protection applies to registration, notes, payouts and audit events.
function sheetLiteral_(value) {
  if(typeof value==='string'&&/^\s*[=+\-@]/.test(value))
    return "'"+value;
  return value;
}
function appendRow_(name, obj) {
  var t = tbl_(name), row = t.headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(obj,h)?sheetLiteral_(obj[h]):'';
  });
  t.sheet.appendRow(row);
  return t.sheet.getLastRow();
}
function updateRow_(name, rowNumber, patch) {
  var t=tbl_(name);
  if(!Number.isInteger(rowNumber)||rowNumber<2||rowNumber>t.sheet.getLastRow())
    throw new Error('Baris tidak valid.');
  var keys=Object.keys(patch||{});
  if(!keys.length)return;
  // Validate all columns before the first write. Single range write minimizes
  // partial status/evidence updates; it does not provide multi-sheet ACID.
  var cols=keys.map(function(key){
    var col=t.headers.indexOf(key)+1;
    if(!col)throw new Error('Kolom tidak dikenal: '+key);
    return col;
  });
  var first=Math.min.apply(null,cols),last=Math.max.apply(null,cols);
  var range=t.sheet.getRange(rowNumber,first,1,last-first+1);
  var current=range.getValues()[0],formulas=range.getFormulas()[0];
  // Preserve formulas within the span (e.g., member saldo/retensi cells).
  var values=current.map(function(v,i){return formulas[i]||v;});
  keys.forEach(function(key,i){values[cols[i]-first]=sheetLiteral_(patch[key]);});
  range.setValues([values]);
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
// A cache eviction must not reset the PIN throttle of a registered account.
// Registered-account counters are also stored in private Script Properties;
// arbitrary unknown numbers are kept in cache only to prevent storage flooding.
function loginFailureKey_(wa) {return 'ngd_login_' + sha256_(wa);}
function loginFailureStoreKey_(wa) {return 'NGD_LOGIN_GUARD_' + sha256_(wa);}
function loginGuard_(wa) {
  var now=Date.now(),until=now+NGD.LOCK_MINUTES*60000;
  var cache=CacheService.getScriptCache(),key=loginFailureKey_(wa);
  var raw=cache.get(key),cached={attempts:0};
  try {if(raw)cached=JSON.parse(raw)||cached;}catch(e){cached={attempts:0};}
  var props=PropertiesService.getScriptProperties(),storeKey=loginFailureStoreKey_(wa);
  var stored={attempts:0},saved=props.getProperty(storeKey);
  try {if(saved)stored=JSON.parse(saved)||stored;}catch(e){stored={attempts:0};}
  if(stored.expires_at&&Number(stored.expires_at)<=now){
    props.deleteProperty(storeKey);stored={attempts:0};
  }
  if(cached.expires_at&&Number(cached.expires_at)<=now)cached={attempts:0};
  var state={attempts:Math.max(Number(cached.attempts)||0,Number(stored.attempts)||0),
    expires_at:Math.max(Number(stored.expires_at)||0,Number(cached.expires_at)||0)};
  if(!state.expires_at||state.expires_at<=now)state.expires_at=until;
  if(state.attempts>=NGD.MAX_LOGIN_FAILURES)
    throw ngdError_('RATE_LIMITED','Terlalu banyak percobaan. Coba lagi dalam '+
      Math.max(1,Math.ceil((state.expires_at-now)/60000))+' menit.');
  return state;
}
function noteLoginFailure_(wa,persist) {
  var cache=CacheService.getScriptCache(),key=loginFailureKey_(wa);
  var state=loginGuard_(wa),now=Date.now();
  state.attempts++;
  state.expires_at=Math.max(now+1000,Number(state.expires_at)||now+NGD.LOCK_MINUTES*60000);
  var ttl=Math.max(1,Math.min(21600,Math.ceil((state.expires_at-now)/1000)));
  cache.put(key,JSON.stringify(state),ttl);
  if(persist===true)
    PropertiesService.getScriptProperties().setProperty(loginFailureStoreKey_(wa),JSON.stringify(state));
}
// Nomor WA admin tampil di getPublicInfo, jadi setelah gagal berulang akun ADMIN
// dikunci lebih lama daripada member (mengurangi peluang tebak PIN per hari).
function extendAdminLock_(wa) {
  var now=Date.now(),cache=CacheService.getScriptCache(),key=loginFailureKey_(wa),state=null;
  try {var raw=cache.get(key);if(raw)state=JSON.parse(raw);} catch(e) {state=null;}
  if(!state||Number(state.attempts)<NGD.MAX_LOGIN_FAILURES)return false;
  var until=now+NGD.ADMIN_LOCK_MINUTES*60000;
  if(Number(state.expires_at)>=until)return false;
  state.expires_at=until;
  cache.put(key,JSON.stringify(state),Math.min(21600,NGD.ADMIN_LOCK_MINUTES*60));
  PropertiesService.getScriptProperties().setProperty(loginFailureStoreKey_(wa),JSON.stringify(state));
  return true;
}
function clearLoginFailures_(wa) {
  CacheService.getScriptCache().remove(loginFailureKey_(wa));
  PropertiesService.getScriptProperties().deleteProperty(loginFailureStoreKey_(wa));
}
function updateActivity_(member) {
  var elapsed = Date.now() - new Date(member.joined_at).getTime();
  var patch = {last_active_at: now_()};
  if (elapsed >= 14 * 86400000) patch.d14_active = true;
  if (elapsed >= 30 * 86400000) patch.d30_active = true;
  updateRow_('members', member._row, patch);
}
function grantInitialCredit_(memberId, amount) {
  amount=Number(amount);
  require_(Number.isInteger(amount)&&amount>=0&&amount<=1000,'VALIDATION',
    'Kredit sambutan tidak valid.');
  if(amount===0)return {granted:false,balance:creditBalance_(memberId)};
  var existing=findRows_('credits_ledger',function(r){
    return r.member_id===memberId&&r.tipe==='GRANT';
  });
  if(existing.length)return {granted:false,balance:creditBalance_(memberId)};
  var balance=creditBalance_(memberId)+amount;
  appendRow_('credits_ledger',{
    entry_id:recordId_('L'),member_id:memberId,created_at:now_(),tipe:'GRANT',
    jumlah:amount,status:'POSTED',ref_id:'',tool_id:'',
    keterangan:'Kredit sambutan member',saldo_setelah:balance
  });
  logAudit_(memberId,'MEMBER','CREDIT_GRANT','credits_ledger',
    memberId,'','POSTED',{amount:amount});
  return {granted:true,balance:balance};
}

// ===== SEED =====
function seedSettings_() {
  var entries = [
    ['nama_brand','Ngulik Digital','TEXT'], ['gelombang_aktif',1,'NUMBER'],
    ['kuota_gelombang',50,'NUMBER'], ['mode_pendaftaran','TERBUKA','TEXT'],
    ['wa_admin',PropertiesService.getScriptProperties().getProperty('NGD_ADMIN_WA')||'','TEXT'], ['email_admin',Session.getEffectiveUser().getEmail(),'TEXT'],
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
    ['P-POS','Aplikasi POS Kasir Sederhana / Linggau POS Lite','Lisensi sekali bayar; aktivasi diverifikasi admin.','LISENSI_SEKALI',149000,0,0,true,true,true,2],
    ['P-CANVA','Seat Canva Pro 30 Hari','Undangan seat 30 hari diproses admin.','SEAT_30H',35000,0,30,true,true,true,3],
    ['P-KREDIT-50','Top-Up 50 Kredit AI','Tambahan 50 kredit AI.','TOPUP_KREDIT',25000,50,0,false,false,true,4],
    ['P-KREDIT-150','Top-Up 150 Kredit AI','Tambahan 150 kredit AI.','TOPUP_KREDIT',60000,150,0,false,false,true,5],
    ['P-KREDIT-400','Top-Up 400 Kredit AI','Tambahan 400 kredit AI.','TOPUP_KREDIT',140000,400,0,false,false,true,6],
    ['P-VIDEO-AI','Jasa Video Iklan AI - Paket Hemat','Jasa pembuatan video iklan/promosi AI untuk produk & usaha; aktivasi diproses admin.','JASA_SEKALI',50000,0,0,true,true,true,7],
    ['P-EBOOK','Bundel Ebook Vibe Coder & Template Siap Pakai','Ebook panduan praktis Vibe Coder, bundel template siap pakai, dan bonus 10 kredit AI.','PRODUK_DIGITAL',49000,10,0,false,true,true,8]
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
  var pin=randomStrongPin_(), salt=newSalt_();
  var adminId='M-0001';
  if (findRows_('members',function(r){return r.member_id===adminId;}).length) throw new Error('ID admin sudah digunakan.');
  appendRow_('members',{member_id:adminId,role:'ADMIN',nama:'Admin Ngulik Digital',wa:wa,nama_usaha:'Ngulik Digital',pin_hash:pinHash_(pin,salt),pin_salt:salt,kode_referral:'R'+uuid_().slice(0,7),referred_by:'',status:'AKTIF',joined_at:now_(),last_active_at:now_(),d14_active:false,d30_active:false,status_pos:'BELUM',status_canva:'BELUM'});
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
    // The live database has legitimate extension columns. Verify required
    // names and uniqueness instead of demanding identical column positions.
    var width=sh.getLastColumn();
    var actual=width>0?sh.getRange(1,1,1,width).getValues()[0].map(String):[];
    var missingRequired=expected.filter(function(h){return actual.indexOf(h)<0;});
    var seen={},duplicate=[];
    actual.forEach(function(h){
      if(!h)return;
      if(seen[h])duplicate.push(h);
      else seen[h]=true;
    });
    if(missingRequired.length||duplicate.length){
      checks.push(name+':MISMATCH');ready=false;
    }else{
      var extended=actual.some(function(h){return !!h&&expected.indexOf(h)<0;});
      checks.push(name+(extended?':OK_EXTENDED':':OK'));
    }
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
  if(!inspection.schemaOk || inspection.adminCount>1){
    throw new Error('SETUP_BLOCKED: Struktur tidak lengkap/berbeda atau akun ADMIN ganda. Jangan ulangi setup; audit manual diperlukan.');
  }
  // First-time setup is a mutation and requires explicit QA release.
  requireMutationsEnabled_();
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
  requireMutationsEnabled_();
  // PIN hanya dibawa di memori hingga dialog tampil; jangan dikirim ke log.
  var result=withLock_(function(){
    var admin=findRows_('members',function(r){return r.role==='ADMIN';})[0];
    if(!admin) throw new Error('Jalankan setupDatabase lebih dahulu.');
    var pin=randomStrongPin_(),salt=newSalt_();
    updateRow_('members',admin._row,{pin_salt:salt,pin_hash:pinHash_(pin,salt)});
    clearLoginFailures_(String(admin.wa)); // buka kunci login admin yang sedang berjalan
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
  report.push((ScriptApp.getProjectTriggers().length?'OK ':'BELUM ')+'Triggers');
  report.push((setting_('wa_admin','')?'OK ':'GAGAL ')+'WA Admin');
  SpreadsheetApp.getUi().alert(report.join('\n'));
  return report;
}
function onOpen() {
  // Safe operator menu: no setup, reset, triggers, or blocking alert.
  SpreadsheetApp.getUi().createMenu('Ngulik Digital')
    .addItem('Periksa database (baca-saja)','inspectDatabaseSetup')
    .addItem('Periksa akses admin (baca-saja)','showAdminAccessStatus')
    .addSeparator()
    .addItem('Pulihkan PIN admin (izin pemilik)','recoverAdminPinOwnerOnly')
    .addItem('Buat admin staging (izin pemilik)','bootstrapStagingAdminOwnerOnly')
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
  for(var i=0;i<50;i++){var v='R'+uuid_().slice(0,7);if(!used[v])return v;}
  throw ngdError_('CONFLICT','Kode referral belum bisa dibuat. Coba lagi.');
}
function memberCount_() {return findRows_('members',function(r){return r.role==='MEMBER'&&r.status==='AKTIF';}).length;}
// Aturan antrean murni: tidak mengakses Sheets dan bisa diuji dengan data simulasi.
function memberQueue_(members) {
  return members.filter(function(m){return m.role==='MEMBER'&&m.status==='WAITING_LIST';})
    .sort(function(a,b){
      var at=new Date(a.joined_at).getTime(),bt=new Date(b.joined_at).getTime();
      at=Number.isFinite(at)?at:0;bt=Number.isFinite(bt)?bt:0;
      return at-bt||(Number(a._row||0)-Number(b._row||0));
    });
}
function memberAdmissionDecision_(members,quota,memberId) {
  var active=members.filter(function(m){return m.role==='MEMBER'&&m.status==='AKTIF';}).length;
  var queue=memberQueue_(members),target=members.filter(function(m){return m.member_id===memberId;})[0];
  var reason=!Number.isInteger(quota)||quota<1?'INVALID_QUOTA':
    !target||target.role!=='MEMBER'?'MEMBER_NOT_FOUND':
    target.status!=='WAITING_LIST'?'NOT_WAITING_LIST':
    active>=quota?'QUOTA_FULL':
    !queue.length||queue[0].member_id!==memberId?'QUEUE_ORDER':'OK';
  return {eligible:reason==='OK',reason:reason,active:active,quota:quota,
    position:queue.findIndex(function(m){return m.member_id===memberId;})+1,
    head:queue.length?queue[0].member_id:null,waiting:queue.length};
}
function memberWaitlist_() {
  return memberQueue_(readAll_('members')).map(function(m,i){
    return {member_id:m.member_id,nama:m.nama,wa:m.wa,nama_usaha:m.nama_usaha,
      joined_at:m.joined_at instanceof Date?isoWib_(m.joined_at):m.joined_at,posisi:i+1};
  });
}
// Promosi dilakukan satu per satu oleh ADMIN; tidak membuat sesi atau mengirim PIN.
function adminPromoteWaitlist_(admin,p) {
  return withLock_(function(){
    var memberId=String(p.member_id||''),members=readAll_('members');
    var quota=Number(setting_('kuota_gelombang',50));
    var result=memberAdmissionDecision_(members,quota,memberId);
    require_(result.eligible,'CONFLICT','Promosi ditolak: '+result.reason);
    var target=members.filter(function(m){return m.member_id===memberId;})[0];
    // Kredit didahulukan dan idempoten: jika gagal sebelum status berubah,
    // retry tidak menambah grant kedua.
    var initial=Number(setting_('kredit_awal',10));
    require_(Number.isInteger(initial)&&initial>=0&&initial<=1000,'VALIDATION','Kredit awal tidak valid.');
    if(initial>0)grantInitialCredit_(memberId,initial);
    updateRow_('members',target._row,{status:'AKTIF'});
    var full=result.active+1>=quota;
    if(full&&setting_('mode_pendaftaran','TERBUKA')==='TERBUKA')
      updateSetting_('mode_pendaftaran','WAITING_LIST');
    logAudit_(admin.member_id,'ADMIN','WAITLIST_PROMOTED','members',memberId,'WAITING_LIST','AKTIF',{posisi_sebelumnya:result.position});
    return {member_id:memberId,status:'AKTIF',active:result.active+1,quota:quota,
      initial_credit_ensured:initial>0};
  });
}
// Penangguhan menonaktifkan sesi, tetapi tidak menghapus transaksi dan saldo.
function adminSuspendMember_(admin,p) {
  return withLock_(function(){
    var target=byId_('members','member_id',String(p.member_id||''));
    require_(target&&target.role==='MEMBER','NOT_FOUND','Member tidak ditemukan.');
    require_(target.status==='AKTIF','CONFLICT','Hanya member aktif dapat ditangguhkan.');
    var reason=safeText_(p.alasan,300);
    require_(reason.length>=5,'VALIDATION','Alasan penangguhan wajib diisi.');
    updateRow_('members',target._row,{status:'SUSPENDED'});
    var sessions=findRows_('sessions',function(s){return s.member_id===target.member_id;});
    sessions.reverse().forEach(function(s){tbl_('sessions').sheet.deleteRow(s._row);});
    logAudit_(admin.member_id,'ADMIN','MEMBER_SUSPENDED','members',target.member_id,'AKTIF','SUSPENDED',
      {reason:reason,sessions_revoked:sessions.length});
    return {member_id:target.member_id,status:'SUSPENDED',sessions_revoked:sessions.length};
  });
}
// Aktivasi ulang tidak boleh menyelak antrean atau melewati kuota.
function adminReactivateMember_(admin,p) {
  return withLock_(function(){
    var members=readAll_('members');
    var target=members.filter(function(m){return m.member_id===String(p.member_id||'');})[0];
    require_(target&&target.role==='MEMBER','NOT_FOUND','Member tidak ditemukan.');
    require_(target.status==='SUSPENDED','CONFLICT','Hanya member ditangguhkan yang dapat diaktifkan ulang.');
    var quota=Number(setting_('kuota_gelombang',50));
    var active=members.filter(function(m){return m.role==='MEMBER'&&m.status==='AKTIF';}).length;
    require_(active<quota,'QUOTA_FULL','Kuota penuh; aktivasi ulang ditolak.');
    require_(memberQueue_(members).length===0,'CONFLICT','Masih ada waiting list; proses antrean dahulu.');
    var reason=safeText_(p.alasan,300);
    require_(reason.length>=5,'VALIDATION','Alasan aktivasi ulang wajib diisi.');
    // Pastikan token yang belum sempat terhapus ketika suspend tidak hidup lagi.
    var staleSessions=findRows_('sessions',function(s){return s.member_id===target.member_id;});
    staleSessions.reverse().forEach(function(s){tbl_('sessions').sheet.deleteRow(s._row);});
    updateRow_('members',target._row,{status:'AKTIF'});
    logAudit_(admin.member_id,'ADMIN','MEMBER_REACTIVATED','members',target.member_id,'SUSPENDED','AKTIF',{reason:reason});
    return {member_id:target.member_id,status:'AKTIF',active:active+1,quota:quota,sessions_revoked:staleSessions.length};
  });
}

// Pure validator: accepts only safe, documented system-setting values.
function validatedAdminSetting_(key,value) {
  var enums={mode_pendaftaran:['TERBUKA','WAITING_LIST','TERTUTUP']};
  var ints={komisi_persen:[0,50],masa_tahan_hari:[1,90],min_payout:[1000,10000000],kuota_gelombang:[1,1000]};
  if(Object.prototype.hasOwnProperty.call(enums,key)){
    require_(typeof value==='string'&&enums[key].indexOf(value)>=0,
      'VALIDATION','Pilihan pengaturan tidak valid.');
    return value;
  }
  if(Object.prototype.hasOwnProperty.call(ints,key)){
    var n=Number(value),bounds=ints[key];
    require_(value!==null&&value!==''&&Number.isInteger(n)&&n>=bounds[0]&&n<=bounds[1],
      'VALIDATION','Nilai pengaturan di luar batas.');
    return n;
  }
  if(key==='link_classroom'){
    require_(typeof value==='string'&&value.length<=500&&/^https:\/\/classroom\.google\.com\//i.test(value),
      'VALIDATION','Tautan Google Classroom harus HTTPS resmi.');
    return value;
  }
  throw ngdError_('FORBIDDEN','Pengaturan tidak dapat diubah.');
}
function updateSetting_(key,value) {
  var r=byId_('pengaturan_sistem','key',key);require_(r,'NOT_FOUND','Pengaturan tidak ditemukan.');
  updateRow_('pengaturan_sistem',r._row,{value:value});
}
function newSessionMember_(m) {return {token:issueSession_(m),profil:publicMember_(m)};}
// Reusable member-profile update. Identity, roles, entitlements and financial
// balances are not editable through this endpoint.
function updateMyProfile_(member,p) {
  require_(member.role==='MEMBER','FORBIDDEN','Hanya member dapat mengubah profil.');
  p=p||{};
  var allowed=['nama','nama_usaha','jenis_usaha','kota','deskripsi_usaha','instagram'];
  require_(Object.keys(p).every(function(k){return allowed.indexOf(k)>=0;}),
    'VALIDATION','Kolom profil tidak diizinkan.');
  require_(allowed.every(function(k){return Object.prototype.hasOwnProperty.call(p,k);}),
    'VALIDATION','Formulir profil belum lengkap.');
  var patch={
    nama:safeText_(p.nama,80),nama_usaha:safeText_(p.nama_usaha,100),
    jenis_usaha:safeText_(p.jenis_usaha,80),kota:safeText_(p.kota,80),
    deskripsi_usaha:safeText_(p.deskripsi_usaha,500),
    instagram:safeText_(p.instagram,80)
  };
  require_(patch.nama.length>=2&&patch.nama_usaha.length>=2,
    'VALIDATION','Nama dan nama usaha minimal dua karakter.');
  return withLock_(function(){
    var current=byId_('members','member_id',member.member_id);
    require_(current&&current.role==='MEMBER'&&current.status==='AKTIF',
      'FORBIDDEN','Akun tidak dapat memperbarui profil.');
    var changed=allowed.filter(function(k){return String(current[k]||'')!==patch[k];});
    if(!changed.length)return {profil:publicMember_(current),updated:false};
    updateRow_('members',current._row,patch);
    // Audit names of modified fields only, avoiding duplication of member PII.
    logAudit_(member.member_id,'MEMBER','PROFILE_UPDATED','members',
      member.member_id,'','UPDATED',{fields:changed});
    return {profil:publicMember_(byId_('members','member_id',member.member_id)),updated:true};
  });
}
// Tahap 1 P0: reject registration if the real members Sheet cannot record
// WhatsApp ownership evidence. appendRow_ silently maps only existing headers.
function requireRegistrationWaEvidenceColumns_() {
  var headers=tbl_('members').headers;
  ['member_id','wa','pin_hash','pin_salt','wa_verified','wa_verified_at']
    .forEach(function(name){
      require_(headers.filter(function(h){return h===name;}).length===1,
        'MAINTENANCE','Kolom bukti verifikasi WA pada members belum siap.');
    });
}

function authRegister_(p) {
  // P0: a settings toggle is NEVER proof of WhatsApp ownership.
  // Registration remains closed until a dedicated OTP module is installed,
  // its runtime flag is enabled, and its single-use verifier is invoked.
  var otpReady = PropertiesService.getScriptProperties()
    .getProperty('NGD_OTP_REGISTRATION_ENABLED') === 'true' &&
    typeof ngdConsumeVerifiedRegistrationOtp_ === 'function';
  require_(otpReady, 'MAINTENANCE',
    'Pendaftaran menunggu verifikasi OTP WhatsApp yang aman.');
  return withLock_(function(){
    var wa=normalizeWa_(p.wa), pin=String(p.pin||'');checkNewPin_(pin,wa);
    require_(safeText_(p.nama,80).length>=2,'VALIDATION','Nama minimal dua karakter.');
    require_(safeText_(p.nama_usaha,100).length>=2,'VALIDATION','Nama usaha minimal dua karakter.');
    require_(p.setuju_kebijakan===true,'VALIDATION','Persetujuan kebijakan diperlukan.');
    require_(!byId_('members','wa',wa),'CONFLICT','Nomor WhatsApp sudah terdaftar.');
    // Must validate and consume a server-issued one-time OTP proof under the lock.
    // Do not implement this as a client-side flag, OTP echo, or unverified boolean.
    var s=settings_(),mode=String(s.mode_pendaftaran||'TERBUKA');
    require_(mode!=='TERTUTUP','QUOTA_FULL','Pendaftaran sementara ditutup.');
    var active=memberCount_(),wait=mode==='WAITING_LIST'||active>=Number(s.kuota_gelombang||50)||memberWaitlist_().length>0;
    var initial=Number(s.kredit_awal===undefined||s.kredit_awal===''?10:s.kredit_awal);
    require_(Number.isInteger(initial)&&initial>=0&&initial<=1000,'VALIDATION',
      'Pengaturan kredit awal tidak valid.');
    var ref=String(p.ref||'').toUpperCase(),referrer=ref?byId_('members','kode_referral',ref):null;
    if(referrer&&referrer.wa===wa)referrer=null;
    if(referrer&&(referrer.status!=='AKTIF'||referrer.role!=='MEMBER'))referrer=null;
    var salt=newSalt_(),id=nextMemberId_(),joined=now_(),status=wait?'WAITING_LIST':'AKTIF';
    var m={member_id:id,role:'MEMBER',nama:safeText_(p.nama,80),wa:wa,nama_usaha:safeText_(p.nama_usaha,100),wa_verified:true,wa_verified_at:joined,pin_hash:pinHash_(pin,salt),pin_salt:salt,kode_referral:newReferralCode_(),referred_by:referrer?referrer.member_id:'',status:status,joined_at:joined,last_active_at:joined,status_pos:'BELUM',status_canva:'BELUM',d14_active:false,d30_active:false};
    // Verify an OTP under the lock without marking it USED yet. Sheets has
    // no cross-tab transaction: if the member insert fails, the same valid
    // OTP must remain available for a safe retry within its original TTL.
    requireRegistrationWaEvidenceColumns_();
    require_(typeof ngdValidateVerifiedRegistrationOtp_==='function',
      'MAINTENANCE','Pemeriksaan OTP registrasi belum siap.');
    var verifiedOtpId=ngdValidateVerifiedRegistrationOtp_(p);
    appendRow_('members',m);
    // Commit the one-time proof only AFTER the account row was persisted.
    // If this status write fails, a duplicate-WA guard prevents replay:
    // reconciliation is required, not an unsafe second member insert.
    ngdConsumeVerifiedRegistrationOtp_(p,verifiedOtpId);
    logAudit_(id,'MEMBER','REGISTER','members',id,'',status,{});
    if(wait){return {status:status,posisi:findRows_('members',function(r){return r.status==='WAITING_LIST';}).length};}
    if(initial>0)grantInitialCredit_(id,initial);
    if(active+1>=Number(s.kuota_gelombang||50)){updateSetting_('mode_pendaftaran','WAITING_LIST');logAudit_('SYSTEM','SYSTEM','REGISTRATION_FULL','pengaturan_sistem','mode_pendaftaran','TERBUKA','WAITING_LIST',{});}
    return {status:status,sesi:newSessionMember_(m)};
  });
}
function authLogin_(p,adminOnly,expectedAdminId) {
  var wa=normalizeWa_(p.wa),pin=String(p.pin||'');checkPin_(pin);
  // Guard + counter + session issuance must be serialized to prevent
  // parallel wrong-PIN requests bypassing the per-account throttle.
  return withLock_(function(){
    loginGuard_(wa);
    var m=byId_('members','wa',wa);
    // Admin-only entry must reject ordinary member credentials BEFORE issuing
    // any session; keep the same generic error to prevent account enumeration.
    if(!m || (adminOnly===true&&(m.role!=='ADMIN'||
        String(m.member_id)!==String(expectedAdminId||''))) ||
        pinHash_(pin,m.pin_salt)!==m.pin_hash){
      noteLoginFailure_(wa,Boolean(m));
      if(m&&m.role==='ADMIN')extendAdminLock_(wa);
      throw ngdError_('UNAUTHORIZED','Nomor WhatsApp atau PIN salah.');
    }
    require_(m.status==='AKTIF','FORBIDDEN','Akun belum aktif.');
    clearLoginFailures_(wa);
    updateActivity_(m);
    return newSessionMember_(m);
  });
}
function authLogout_(token) {
  var hash=sha256_(token),rows=findRows_('sessions',function(r){return r.token_hash===hash;});
  rows.reverse().forEach(function(r){tbl_('sessions').sheet.deleteRow(r._row);});
  return {success:true};
}
function authChangePin_(m,p) {
  checkPin_(p.pin_lama);checkNewPin_(p.pin_baru,m.wa);
  require_(String(p.pin_lama)!==String(p.pin_baru),'VALIDATION','PIN baru harus berbeda.');
  return withLock_(function(){
    // Baca ulang agar perubahan PIN dari sesi lain tidak menimpa PIN terbaru.
    var fresh=byId_('members','member_id',m.member_id);
    require_(fresh&&fresh.status==='AKTIF','FORBIDDEN','Akun tidak aktif.');
    require_(pinHash_(p.pin_lama,fresh.pin_salt)===fresh.pin_hash,'UNAUTHORIZED','PIN lama salah.');
    var salt=newSalt_();
    updateRow_('members',fresh._row,{pin_salt:salt,pin_hash:pinHash_(p.pin_baru,salt)});
    var sessions=findRows_('sessions',function(r){return r.member_id===fresh.member_id;});
    sessions.reverse().forEach(function(r){tbl_('sessions').sheet.deleteRow(r._row);});
    logAudit_(fresh.member_id,fresh.role,'PIN_CHANGED_SESSIONS_REVOKED','members',fresh.member_id,'','',{sessions_revoked:sessions.length});
    return {success:true,login_required:true};
  });
}
function publicInfo_(p) {
  var s=settings_(),quota=Number(s.kuota_gelombang||50),used=memberCount_();
  var ref=String(p.ref||'').toUpperCase(),referer=ref?byId_('members','kode_referral',ref):null;
  return {nama_brand:s.nama_brand,wa_admin:s.wa_admin,kuota:quota,terpakai:used,sisa:Math.max(0,quota-used),mode:s.mode_pendaftaran==='TERTUTUP'?'TERTUTUP':(used>=quota||memberWaitlist_().length>0)?'WAITING_LIST':s.mode_pendaftaran,disclosure:s.teks_disclosure_affiliate,referrer:referer&&referer.status==='AKTIF'?String(referer.nama).split(' ')[0]:null};
}
function modules_() {return readAll_('modul_belajar').filter(function(r){return r.aktif===true;}).sort(function(a,b){return a.urut-b.urut;});}
function creditWarning_(id) {
  var rows=readAll_('credits_ledger').filter(function(r){return r.member_id===id;});
  var total=rows.filter(function(r){return ['GRANT','TOPUP'].indexOf(r.tipe)>=0||(r.tipe==='ADJUST'&&Number(r.jumlah)>0);}).reduce(function(s,r){return s+Number(r.jumlah||0);},0);
  return total>0&&creditBalance_(id)<=total*Number(setting_('kredit_peringatan_persen',20))/100;
}
function orderView_(order,m) {
  require_(m.role==='ADMIN'||order.member_id===m.member_id,'FORBIDDEN','Pesanan tidak ditemukan.');
  // Member must never receive admin notes, payment request_id, verification
  // actor, referral identifiers or internal row metadata.
  var fields=m.role==='ADMIN'
    ? ['order_id','member_id','product_id','nama_produk','harga_dasar','kode_unik',
       'total_bayar','status','metode','created_at','expires_at',
       'konfirmasi_bayar_at','paid_at','verified_by','fulfilled_at','cancelled_at',
       'refunded_at','ref_member_id','catatan_admin','request_id']
    : ['order_id','member_id','product_id','nama_produk','harga_dasar','kode_unik',
       'total_bayar','status','metode','created_at','expires_at',
       'konfirmasi_bayar_at','paid_at','fulfilled_at','cancelled_at','refunded_at'];
  var o={};fields.forEach(function(k){
    o[k]=order[k] instanceof Date?isoWib_(order[k]):order[k];
  });return o;
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
    if(retry){
      require_(retry.member_id===m.member_id&&retry.product_id===product.product_id,
        'CONFLICT','ID permintaan sudah dipakai untuk pesanan lain.');
      return orderView_(retry,m);
    }
    // The public catalog can display exploratory offers, but the legacy
    // QRIS order + fulfillment flow supports only these four product types.
    // Service/ebook offers must never produce an unfulfillable order.
    require_(['TOPUP_KREDIT','LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H'].indexOf(product.tipe)>=0,
      'NOT_AVAILABLE','Produk ini belum dapat dipesan melalui checkout saat ini.');
    if(product.tipe==='LISENSI_SEKALI')
      require_(['AKTIF','DIAJUKAN'].indexOf(m.status_pos)<0,
        'CONFLICT','Lisensi POS sudah aktif atau sedang menunggu aktivasi.');
    var mine=findRows_('orders',function(o){return o.member_id===m.member_id&&o.product_id===product.product_id&&['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0;});
    if(mine.length){var existing=expireOrder_(mine[0]);if(existing.status!=='EXPIRED')return orderView_(existing,m);}
    var s=settings_(),min=Number(s.kode_unik_min||100),max=Number(s.kode_unik_max||999),price=Number(product.harga);
    require_(Number.isInteger(price)&&price>0,'VALIDATION','Harga produk belum valid.');
    require_(Number.isInteger(min)&&Number.isInteger(max)&&min>=100&&max<=999&&min<=max,'VALIDATION','Rentang kode unik tidak valid.');
    var open=readAll_('orders').filter(function(o){return ['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0;});
    var taken={};open.forEach(function(o){taken[Number(o.total_bayar)]=true;});
    // Scan the entire unique-code range from a random starting point.
    // Unlike 25 random trials, this only fails when every amount is occupied.
    var range=max-min+1,start=Math.floor(Math.random()*range),code=null;
    for(var k=0;k<range;k++){var n=min+(start+k)%range;if(!taken[price+n]){code=n;break;}}
    require_(code!==null,'CONFLICT','Kode pembayaran sedang penuh. Coba lagi nanti.');
    var created=now_(),id='NGD-'+Utilities.formatDate(created,NGD.TZ,'yyMMdd')+'-'+uuid_().slice(0,12);
    var o={order_id:id,member_id:m.member_id,product_id:product.product_id,nama_produk:product.nama,harga_dasar:price,kode_unik:code,total_bayar:price+code,status:'PENDING',metode:'QRIS_STATIS',created_at:created,expires_at:new Date(created.getTime()+Number(s.order_expiry_menit||15)*60000),ref_member_id:m.referred_by||'',request_id:requestId};
    appendRow_('orders',o);logAudit_(m.member_id,m.role,'ORDER_CREATED','orders',id,'','PENDING',{product_id:product.product_id});
    return orderView_(o,m);
  });
}
function getOrder_(m,id) {
  // Strictly read-only. Expiration writes belong to maintenance/transition
  // actions, which require the server mutation release gate.
  var o=byId_('orders','order_id',id);
  require_(o,'NOT_FOUND','Pesanan tidak ditemukan.');
  require_(m.role==='ADMIN'||o.member_id===m.member_id,'FORBIDDEN','Pesanan tidak ditemukan.');
  var view=orderView_(o,m);
  view.past_due=o.status==='PENDING'&&new Date(o.expires_at).getTime()<=Date.now();
  return view;
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
      require_(p.dana_diterima===true,'RECONCILIATION_REQUIRED',
        'Dana harus diverifikasi benar-benar masuk sebelum order dibayar.');
      var proof=safeText_(p.referensi_pembayaran,120);
      require_(proof.length>=5,'VALIDATION','Referensi mutasi/settlement pembayaran wajib diisi.');
      var note=safeText_(p.alasan,300);
      if(from==='EXPIRED')require_(note.length>=5,'VALIDATION',
        'Alasan pembayaran terlambat wajib diisi.');
      to='PAID';patch.paid_at=now_();patch.verified_by=m.member_id;
      patch.catatan_admin='Pembayaran ref: '+proof+(note?' | '+note:'');
    } else if(type==='reject'&&admin&&['PENDING','MENUNGGU_VERIFIKASI'].indexOf(from)>=0){
      require_(safeText_(p.alasan,300).length>=5,'VALIDATION','Alasan penolakan diperlukan.');to='CANCELLED';patch.cancelled_at=now_();patch.catatan_admin=p.alasan;
    } else throw ngdError_('CONFLICT','Status pesanan tidak mengizinkan tindakan ini.');
    // Validasi data fulfillment sebelum menandai pembayaran sebagai PAID.
    if(to==='PAID'){
      var linkedProduct=byId_('katalog_produk','product_id',o.product_id);
      var linkedMember=byId_('members','member_id',o.member_id);
      require_(linkedProduct&&linkedMember,'CONFLICT','Produk atau member tidak ditemukan.');
      require_(['TOPUP_KREDIT','LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H'].indexOf(linkedProduct.tipe)>=0,
        'CONFLICT','Tipe produk belum mendukung fulfillment.');
      if(linkedProduct.tipe==='LISENSI_SEKALI')
        require_(['AKTIF','DIAJUKAN'].indexOf(linkedMember.status_pos)<0,
          'RECONCILIATION_REQUIRED','Lisensi POS sudah dipenuhi atau menunggu aktivasi lain.');
      if(linkedProduct.tipe==='TOPUP_KREDIT')
        require_(Number.isInteger(Number(linkedProduct.kredit_diberikan))&&Number(linkedProduct.kredit_diberikan)>0,
          'CONFLICT','Jumlah kredit produk belum valid.');
      if(linkedProduct.tipe==='LANGGANAN_30H')
        require_(Number.isInteger(Number(linkedProduct.durasi_hari))&&Number(linkedProduct.durasi_hari)>0,
          'CONFLICT','Durasi produk belum valid.');
    }
    patch.status=to;updateRow_('orders',o._row,patch);
    logAudit_(m.member_id,m.role,'ORDER_'+type.toUpperCase(),'orders',id,from,to,
      {note:patch.catatan_admin||'',payment_received:to==='PAID'});
    if(to==='PAID'){
      try{
        onPaid_(o,m);
      }catch(err){
        // Status PAID sengaja dipertahankan: pembayaran telah dikonfirmasi
        // tetapi penyerahan produk harus diperiksa admin, bukan diulang diam-diam.
        console.error('FULFILLMENT_NEEDS_REVIEW order_id='+id+' reason='+(err&&err.message||'unknown'));
        try{
          logAudit_(m.member_id,m.role,'FULFILLMENT_NEEDS_REVIEW','orders',id,'PAID','PAID',{reason:String(err&&err.message||'unknown').slice(0,180)});
        }catch(logErr){console.error('FULFILLMENT_AUDIT_FAILED order_id='+id);}
        var current=byId_('orders','order_id',id);
        return {order_id:id,status:current?current.status:'PAID',
          needs_review:true,message:'Pembayaran dicatat; pemenuhan produk dan komisi memerlukan pemeriksaan admin.'};
      }
    }
    return orderView_(byId_('orders','order_id',id),m);
  });
}
function grantCredits_(id,amount,ref,kind) {
  amount=Number(amount);
  require_(Number.isFinite(amount)&&Number.isInteger(amount)&&amount!==0,'VALIDATION','Jumlah kredit tidak valid.');
  // Every order/admin reference identifies exactly one posting.
  // Cross-member or different-amount replay must be rejected, not duplicated.
  if(ref&&['TOPUP','ADJUST_REFUND','ADJUST'].indexOf(kind)>=0){
    var prior=findRows_('credits_ledger',function(r){return r.ref_id===ref&&r.tipe===kind;});
    if(prior.length){
      require_(prior.length===1&&prior[0].member_id===id&&Number(prior[0].jumlah)===amount,
        'CONFLICT','Referensi kredit sudah digunakan untuk posting berbeda.');
      return {alreadyApplied:true,balance:creditBalance_(id)};
    }
  }
  var balance=creditBalance_(id),final=balance+amount;
  require_(Number.isFinite(final)&&Number.isInteger(final)&&final>=0,
    'CONFLICT','Posting kredit tidak boleh menyebabkan saldo negatif atau tidak valid.');
  appendRow_('credits_ledger',{entry_id:recordId_('L'),member_id:id,created_at:now_(),tipe:kind||'ADJUST',jumlah:amount,status:'POSTED',ref_id:ref||'',keterangan:'Transaksi '+(ref||''),saldo_setelah:final});
  logAudit_('SYSTEM','SYSTEM','CREDIT_'+(kind||'ADJUST'),'credits_ledger',ref||id,'','POSTED',{jumlah:amount});
  return {alreadyApplied:false,balance:final};
}
function commissionRate_(settings) {
  var raw=settings&&settings.komisi_persen;
  var value=raw===undefined||raw===null||raw===''?25:Number(raw);
  require_(Number.isInteger(value)&&value>=0&&value<=50,
    'CONFLICT','Persentase komisi tidak valid.');
  return value;
}
function onPaid_(o,actor) {
  var product=byId_('katalog_produk','product_id',o.product_id),member=byId_('members','member_id',o.member_id);
  require_(product&&member,'CONFLICT','Data produk atau member tidak tersedia.');
  // Read and validate finance settings BEFORE any entitlement or ledger write.
  var s=settings_(),percent=commissionRate_(s);
  var commissionEligible=Boolean(member.referred_by&&product.bisa_komisi===true&&percent>0);
  var commissionValue=commissionEligible?Math.floor(Number(o.harga_dasar)*percent/100):0;
  if(commissionEligible)
    require_(Number.isSafeInteger(commissionValue)&&commissionValue>0,'CONFLICT',
      'Nominal komisi tidak valid.');
  var patch={},fulfilled=false,days=Number(product.durasi_hari||0),end;
  if(product.tipe==='TOPUP_KREDIT'){
    grantCredits_(member.member_id,Number(product.kredit_diberikan),o.order_id,'TOPUP');fulfilled=true;
  } else if(product.tipe==='LANGGANAN_30H'){
    var old=member.akses_3in1_sampai?new Date(member.akses_3in1_sampai).getTime():0;
    end=new Date(Math.max(Date.now(),old)+days*86400000);
    updateRow_('members',member._row,{akses_3in1_sampai:end,sumber_akses_3in1:'BERBAYAR'});fulfilled=true;
  }else if(product.tipe==='LISENSI_SEKALI')updateRow_('members',member._row,{status_pos:'DIAJUKAN'});
  else if(product.tipe==='SEAT_30H'){
    // A renewal must not interrupt an already active Canva seat.
    if(['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(member.status_canva)<0)
      updateRow_('members',member._row,{status_canva:'DIAJUKAN'});
  }
  if(fulfilled){updateRow_('orders',o._row,{status:'FULFILLED',fulfilled_at:now_()});logAudit_(actor.member_id,actor.role,'ORDER_FULFILLED','orders',o.order_id,'PAID','FULFILLED',{});}
  if(commissionEligible) {
    // Komisi harus idempoten per order, termasuk setelah retry dari kegagalan parsial.
    var existingCommission=findRows_('affiliate_commissions',function(c){return c.order_id===o.order_id;});
    if(existingCommission.length)return;
    var any=findRows_('affiliate_commissions',function(c){return c.referred_member_id===member.member_id;});
    if(!s.komisi_hanya_order_pertama||!any.length){
      var value=commissionValue;
      var when=new Date(Date.now()+Number(s.masa_tahan_hari||14)*86400000);
      var cid=recordId_('K');
      appendRow_('affiliate_commissions',{komisi_id:cid,referrer_id:member.referred_by,referred_member_id:member.member_id,order_id:o.order_id,dasar_komisi:o.harga_dasar,persen:percent,nominal:value,status:'PENDING',created_at:now_(),approve_after:when});
      logAudit_('SYSTEM','SYSTEM','COMMISSION_CREATED','affiliate_commissions',cid,'','PENDING',{amount:value});
    }
  }
}
function approveFulfillment_(admin,p) {
  return withLock_(function(){
    var o=byId_('orders','order_id',p.order_id);
    require_(o&&o.status==='PAID','CONFLICT','Pesanan belum siap dipenuhi.');
    // A persisted attempt marker prevents blind retries when a prior call
    // updated member access but failed before finalizing the order.
    var marker='[ADMIN_FULFILLMENT_ATTEMPT]';
    require_(String(o.catatan_admin||'').indexOf(marker)<0,'RECONCILIATION_REQUIRED',
      'Aktivasi pernah dicoba. Periksa akses member sebelum mengulang.');
    var product=byId_('katalog_produk','product_id',o.product_id);
    var m=byId_('members','member_id',o.member_id);
    require_(product&&m,'CONFLICT','Data produk atau member tidak tersedia.');
    require_(['LISENSI_SEKALI','SEAT_30H'].indexOf(product.tipe)>=0,
      'CONFLICT','Produk tidak memerlukan aktivasi admin.');
    require_(p.aktivasi_terverifikasi===true,'RECONCILIATION_REQUIRED',
      'Aktivasi/undangan harus diverifikasi oleh admin.');
    var proof=safeText_(p.referensi_aktivasi,120);
    require_(proof.length>=5,'VALIDATION','Referensi aktivasi wajib diisi.');
    var mail='',past=0,wasActive=false,days=0,now=now_();
    if(product.tipe==='LISENSI_SEKALI'){
      require_(m.status_pos!=='AKTIF'&&!m.pos_lisensi_kode,'RECONCILIATION_REQUIRED',
        'Lisensi sudah aktif. Periksa riwayat sebelum menerbitkan lagi.');
    } else {
      mail=String(p.canva_email||'').trim();
      require_(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail),
        'VALIDATION','Email undangan Canva tidak valid.');
      days=Number(product.durasi_hari);
      require_(Number.isInteger(days)&&days>=1&&days<=365,
        'VALIDATION','Durasi seat tidak valid.');
      past=m.canva_berakhir?new Date(m.canva_berakhir).getTime():0;
      require_(Number.isFinite(past),'CONFLICT','Tanggal masa aktif Canva tidak valid.');
      wasActive=['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(m.status_canva)>=0;
    }
    // This write happens BEFORE member entitlements; if a later write fails,
    // a retry must go through explicit manual reconciliation.
    updateRow_('orders',o._row,{
      catatan_admin:marker+' | '+proof+' | '+safeText_(o.catatan_admin,400)
    });
    if(product.tipe==='LISENSI_SEKALI'){
      updateRow_('members',m._row,{
        status_pos:'AKTIF',
        pos_lisensi_kode:'POS-'+uuid_().slice(0,8)+'-'+uuid_().slice(0,8)
      });
    } else {
      updateRow_('members',m._row,{
        status_canva:wasActive?'AKTIF_BULAN_2':'AKTIF_BULAN_1',
        canva_email:mail,canva_mulai:now,
        canva_berakhir:new Date(Math.max(now.getTime(),past)+days*86400000)
      });
    }
    updateRow_('orders',o._row,{status:'FULFILLED',fulfilled_at:now});
    logAudit_(admin.member_id,'ADMIN','ORDER_FULFILLED','orders',o.order_id,
      'PAID','FULFILLED',{fulfillment_reference:proof});
    return orderView_(byId_('orders','order_id',o.order_id),admin);
  });
}
function refundDecision_(order,product,memberLedger,commissions) {
  if(!order||['PAID','FULFILLED'].indexOf(order.status)<0)
    return {allowed:false,reason:'ORDER_STATUS_INVALID'};
  if(!product||product.tipe!=='TOPUP_KREDIT')
    return {allowed:false,reason:'MANUAL_RECONCILIATION_REQUIRED'};
  if(commissions.some(function(k){return k.order_id===order.order_id&&k.status==='PAID';}))
    return {allowed:false,reason:'COMMISSION_ALREADY_PAID'};
  var topups=memberLedger.filter(function(x){return x.ref_id===order.order_id&&x.tipe==='TOPUP';});
  var reversals=memberLedger.filter(function(x){return x.ref_id===order.order_id&&x.tipe==='ADJUST_REFUND';});
  if(reversals.length>0)return {allowed:false,reason:'REFUND_ADJUST_ALREADY_EXISTS'};
  if(order.status==='PAID'){
    // PAID without fulfillment is only safe when no credit was posted.
    return topups.length===0?{allowed:true,creditAdjustment:0}:
      {allowed:false,reason:'TOPUP_POSTED_WITH_PAID_STATUS'};
  }
  if(topups.length!==1)return {allowed:false,reason:'TOPUP_LEDGER_COUNT_INVALID'};
  var original=Number(topups[0].jumlah);
  if(!Number.isInteger(original)||original<=0)
    return {allowed:false,reason:'TOPUP_LEDGER_AMOUNT_INVALID'};
  var balance=memberLedger.reduce(function(v,x){return v+Number(x.jumlah||0);},0);
  if(!Number.isFinite(balance)||balance<original)
    return {allowed:false,reason:'INSUFFICIENT_UNSPENT_CREDITS'};
  return {allowed:true,creditAdjustment:-original};
}
function refundOrder_(admin,p) {
  return withLock_(function(){
    var o=byId_('orders','order_id',p.order_id);
    require_(o&&['PAID','FULFILLED'].indexOf(o.status)>=0,'CONFLICT',
      'Pesanan tidak dapat direfund.');
    var reason=safeText_(p.alasan,300),reference=safeText_(p.referensi_refund,120);
    require_(reason.length>=5,'VALIDATION','Alasan refund wajib diisi.');
    require_(p.dana_sudah_dikembalikan===true,'RECONCILIATION_REQUIRED',
      'Konfirmasi pengembalian dana secara nyata diperlukan.');
    require_(reference.length>=5,'VALIDATION','Referensi atau bukti refund diperlukan.');
    var m=byId_('members','member_id',o.member_id);
    var product=byId_('katalog_produk','product_id',o.product_id);
    require_(m&&product,'CONFLICT','Member atau produk tidak tersedia.');
    var memberLedger=findRows_('credits_ledger',function(x){return x.member_id===m.member_id;});
    var commissions=findRows_('affiliate_commissions',function(x){return x.order_id===o.order_id;});
    var decision=refundDecision_(o,product,memberLedger,commissions);
    require_(decision.allowed,'RECONCILIATION_REQUIRED',
      'Refund otomatis tidak aman: '+decision.reason+'. Lakukan rekonsiliasi manual.');
    // The original TOPUP ledger amount is authoritative, not the mutable
    // product catalog value. There is no automatic external money transfer.
    var before=o.status;
    // Urutan sengaja: langkah yang idempoten dulu (balik komisi, tarik kredit), status order TERAKHIR.
    // Bila gagal di tengah, order tetap PAID/FULFILLED sehingga muncul di rekonsiliasi, bukan
    // berstatus REFUNDED padahal kredit member belum ditarik.
    commissions.forEach(function(k){
      if(k.status==='REVERSED')return;
      updateRow_('affiliate_commissions',k._row,{status:'REVERSED',
        reversed_at:now_(),reversed_reason:reason});
      logAudit_(admin.member_id,'ADMIN','COMMISSION_REVERSED','affiliate_commissions',
        k.komisi_id,k.status,'REVERSED',{});
    });
    if(decision.creditAdjustment!==0)
      grantCredits_(m.member_id,decision.creditAdjustment,o.order_id,'ADJUST_REFUND');
    try{
      updateRow_('orders',o._row,{status:'REFUNDED',refunded_at:now_(),
        catatan_admin:reason+' | Refund ref: '+reference});
    }catch(err){
      try{logAudit_(admin.member_id,'ADMIN','REFUND_NEEDS_REVIEW','orders',o.order_id,before,before,
        {reason:String(err&&err.message||'unknown').slice(0,180)});}catch(logErr){}
      throw ngdError_('RECONCILIATION_REQUIRED',
        'Kredit sudah ditarik tetapi status order belum tersimpan. Jangan ulangi refund; perbarui status order secara manual.');
    }
    logAudit_(admin.member_id,'ADMIN','ORDER_REFUNDED','orders',o.order_id,before,
      'REFUNDED',{reason:reason,refund_reference:reference,real_funds_returned:true});
    return orderView_(byId_('orders','order_id',o.order_id),admin);
  });
}
function advanceTrial_(m,p) {
  return withLock_(function(){
    var fresh=byId_('members','member_id',m.member_id);
    require_(fresh&&fresh.role==='MEMBER'&&fresh.status==='AKTIF','FORBIDDEN','Akun tidak dapat mengaktifkan trial.');
    require_(!fresh.onboarding_at,'CONFLICT','Aktivasi gratis hanya sekali.');
    var now=now_(),days=Number(setting_('trial_hari',30));
    require_(Number.isInteger(days)&&days>=1&&days<=90,'VALIDATION','Durasi trial tidak valid.');
    var trialEnd=new Date(now.getTime()+days*86400000);
    var existingEnd=fresh.akses_3in1_sampai?new Date(fresh.akses_3in1_sampai).getTime():0;
    var paidActive=fresh.sumber_akses_3in1==='BERBAYAR'&&existingEnd>now.getTime();
    var patch={jenis_usaha:safeText_(p.jenis_usaha,80),kota:safeText_(p.kota,80),deskripsi_usaha:safeText_(p.deskripsi_usaha,500),instagram:safeText_(p.instagram,80),onboarding_at:now,trial_mulai:now,trial_berakhir:trialEnd};
    if(!paidActive){patch.akses_3in1_sampai=trialEnd;patch.sumber_akses_3in1='TRIAL';}
    updateRow_('members',fresh._row,patch);
    logAudit_(m.member_id,m.role,'TRIAL_ACTIVATED','members',m.member_id,'','TRIAL',{days:days,paid_preserved:paidActive});
    return {trial_berakhir:isoWib_(trialEnd),paid_access_preserved:paidActive};
  });
}
function publicCatalog_() {return readAll_('katalog_produk').filter(function(r){return r.aktif===true;}).sort(function(a,b){return Number(a.urut||0)-Number(b.urut||0);}).map(function(r){return {product_id:r.product_id,nama:r.nama,deskripsi:r.deskripsi,tipe:r.tipe,harga:r.harga,kredit_diberikan:r.kredit_diberikan,durasi_hari:r.durasi_hari};});}
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
    require_(m.role==='MEMBER','FORBIDDEN','Hanya member dapat mengajukan komisi.');
    var all=findRows_('affiliate_commissions',function(r){
      return r.referrer_id===m.member_id&&r.status==='APPROVED'&&!r.payout_requested_at;
    });
    require_(all.length>0,'CONFLICT','Tidak ada komisi siap dicairkan.');
    all.forEach(function(r){
      var order=byId_('orders','order_id',r.order_id);
      require_(order&&['PAID','FULFILLED'].indexOf(order.status)>=0,
        'RECONCILIATION_REQUIRED','Ada komisi untuk order yang belum valid. Hubungi admin.');
    });
    var total=all.reduce(function(s,r){return s+Number(r.nominal||0);},0);
    require_(Number.isInteger(total)&&total>0,'CONFLICT','Nominal komisi tidak valid.');
    require_(total>=Number(setting_('min_payout',50000)),'CONFLICT',
      'Komisi belum mencapai minimum pencairan.');
    all.forEach(function(r){updateRow_('affiliate_commissions',r._row,{payout_requested_at:now_()});});
    logAudit_(m.member_id,m.role,'PAYOUT_REQUEST','affiliate_commissions',
      m.member_id,'','REQUESTED',{amount:total,count:all.length});
    return {total:total,jumlah_komisi:all.length};
  });
}
function purgeExpiredSessions_() {
  var now=Date.now(),count=0;
  // Hapus dari baris paling bawah agar nomor baris yang tersisa tetap benar.
  findRows_('sessions',function(s){return new Date(s.expires_at).getTime()<=now;})
    .reverse().forEach(function(s){tbl_('sessions').sheet.deleteRow(s._row);count++;});
  return count;
}
// Bisa dipakai tanpa saklar keuangan (mis. pilot belajar saja). Tidak terpanggil dari API.
function cleanupExpiredSessions() {
  requireMutationsEnabled_();
  return withLock_(function(){return {sessions:purgeExpiredSessions_()};});
}
function installSessionCleanupTrigger() {
  requireMutationsEnabled_();
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='cleanupExpiredSessions')ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupExpiredSessions').timeBased().everyDays(1).atHour(2).create();
  console.log('SESSION_CLEANUP_TRIGGER_OK');
  return 'SESSION_CLEANUP_TRIGGER_OK';
}
// Baca-saja: tandai kode referral lama yang berisiko diubah Sheets menjadi angka.
function auditReferralCodes() {
  var risky=readAll_('members').filter(function(m){
    return typeof m.kode_referral!=='string'||!/^[A-Za-z]/.test(m.kode_referral);
  }).map(function(m){return m.member_id;});
  console.log('REFERRAL_AUDIT risky='+JSON.stringify(risky));
  return {risky:risky};
}
function maintenance_() {
  return withLock_(function(){
    var now=Date.now(),changed={expired:0,commissions:0,credits:0,canva:0,sessions:0};
    readAll_('orders').forEach(function(o){if(o.status==='PENDING'&&new Date(o.expires_at).getTime()<=now){expireOrder_(o);changed.expired++;}});
    readAll_('affiliate_commissions').forEach(function(c){
      if(c.status==='PENDING'&&new Date(c.approve_after).getTime()<=now){
        var o=byId_('orders','order_id',c.order_id);
        if(o&&['PAID','FULFILLED'].indexOf(o.status)>=0){updateRow_('affiliate_commissions',c._row,{status:'APPROVED',approved_at:now_()});logAudit_('SYSTEM','SYSTEM','COMMISSION_APPROVED','affiliate_commissions',c.komisi_id,'PENDING','APPROVED',{});changed.commissions++;}
      }
    });
    readAll_('members').forEach(function(m){
      if(['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(m.status_canva)>=0&&m.canva_berakhir&&new Date(m.canva_berakhir).getTime()<now){
        updateRow_('members',m._row,{status_canva:'BERAKHIR'});logAudit_('SYSTEM','SYSTEM','CANVA_EXPIRED','members',m.member_id,m.status_canva,'BERAKHIR',{});changed.canva++;
      }
    });
    changed.sessions=purgeExpiredSessions_();
    return changed;
  });
}
function expireOrders() {requireMutationsEnabled_();requireFinanceEnabled_();return withLock_(function(){var count=0;readAll_('orders').forEach(function(o){if(o.status==='PENDING'&&new Date(o.expires_at).getTime()<=Date.now()){expireOrder_(o);count++;}});return count;});}
function dailyMaintenance() {requireMutationsEnabled_();requireFinanceEnabled_();return maintenance_();}
function installTriggers() {
  requireMutationsEnabled_();
  requireFinanceEnabled_();
  ScriptApp.getProjectTriggers().forEach(function(t){if(['expireOrders','dailyMaintenance'].indexOf(t.getHandlerFunction())>=0)ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('expireOrders').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(1).create();
  console.log('TRIGGERS_OK');
  return 'TRIGGERS_OK';
}
// Pemeriksaan baca-saja untuk transaksi membutuhkan rekonsiliasi.
// Tidak menjalankan ulang pembayaran, fulfillment, atau mutasi ledger.
// Engine rekonsiliasi murni. Bisa diuji menggunakan data simulasi
// tanpa SpreadsheetApp, tanpa akses akun, dan tanpa mutasi database.
function financeFindings_(orders,ledger,commissions,products,policy) {
  var findings=[],types={},catalog={};
  products.forEach(function(p){types[String(p.product_id)]=p.tipe;catalog[String(p.product_id)]=p;});
  orders.forEach(function(o){
    var reasons=[],entries=ledger.filter(function(l){return l.ref_id===o.order_id&&l.tipe==='TOPUP';});
    var reversals=ledger.filter(function(l){return l.ref_id===o.order_id&&l.tipe==='ADJUST_REFUND';});
    var isTopup=types[String(o.product_id)]==='TOPUP_KREDIT';
    if(o.status==='PAID'){
      // A persisted fulfillment attempt means some entitlement writes may
      // already have happened; surface this immediately, not after 48h.
      if(String(o.catatan_admin||'').indexOf('[ADMIN_FULFILLMENT_ATTEMPT]')>=0)
        reasons.push('MANUAL_FULFILLMENT_INCOMPLETE');
      var type=types[String(o.product_id)];
      if(['LISENSI_SEKALI','SEAT_30H'].indexOf(type)>=0){
        // Manual fulfillment is expected; only flag when overdue >48 hours.
        var paidAt=new Date(o.paid_at||o.created_at).getTime();
        if(!Number.isFinite(paidAt)||Date.now()-paidAt>48*3600000)
          reasons.push('ADMIN_FULFILLMENT_OVERDUE');
      }else reasons.push('PAID_PENDING_FULFILLMENT_REVIEW');
    }
    if(isTopup&&['FULFILLED','REFUNDED'].indexOf(o.status)>=0&&entries.length!==1)
      reasons.push('TOPUP_LEDGER_COUNT_'+entries.length);
    if(isTopup&&o.status==='REFUNDED'&&reversals.length!==1)
      reasons.push('TOPUP_REFUND_ADJUST_COUNT_'+reversals.length);
    if(isTopup&&o.status!=='REFUNDED'&&reversals.length>0)
      reasons.push('REFUND_ADJUST_WITHOUT_REFUNDED_STATUS');
    var orderCommissions=commissions.filter(function(k){return k.order_id===o.order_id;});
    if(orderCommissions.length>1)reasons.push('COMMISSION_DUPLICATE');
    // Only the admin's configured audit checks commission expectations.
    // Previous commissions (including reversed) consume the once-only grant.
    if(policy&&policy.komisi_persen>0&&['PAID','FULFILLED'].indexOf(o.status)>=0
        &&String(o.ref_member_id||'')!==''
        &&catalog[String(o.product_id)]&&catalog[String(o.product_id)].bisa_komisi===true
        &&orderCommissions.length===0){
      var prior=commissions.some(function(k){
        return k.referred_member_id===o.member_id&&k.order_id!==o.order_id;
      });
      if(!policy.komisi_hanya_order_pertama||!prior)reasons.push('COMMISSION_MISSING');
    }
    if(o.status==='REFUNDED'&&commissions.some(function(k){
      return k.order_id===o.order_id&&k.status==='PAID';
    }))reasons.push('PAID_COMMISSION_ON_REFUNDED_ORDER');
    if(reasons.length)findings.push({order_id:o.order_id,status:o.status,issues:reasons});
  });
  return {checked:orders.length,findings:findings,needs_review:findings.length};
}
function adminReconciliation_(admin) {
  require_(admin&&admin.role==='ADMIN','FORBIDDEN','Akses ditolak.');
  var s=settings_();
  return financeFindings_(readAll_('orders'),readAll_('credits_ledger'),
    readAll_('affiliate_commissions'),readAll_('katalog_produk'),
    {komisi_hanya_order_pertama:s.komisi_hanya_order_pertama===true,
     komisi_persen:Number(s.komisi_persen||0)});
}
// Admin-only operational visibility. Read-only: never exposes DB IDs, keys,
 // credentials, member records or the values of Script Properties.
function adminRuntimeStatus_() {
  var props=PropertiesService.getScriptProperties(),ss=db_();
  var missing=[],mismatched=[],expected=Object.keys(NGD.HEADERS);
  var missingColumns={},duplicateColumns={},extraColumns={};
  expected.forEach(function(name){
    var sheet=ss.getSheetByName(name);
    if(!sheet){missing.push(name);return;}
    var width=sheet.getLastColumn();
    var actual=width>0?sheet.getRange(1,1,1,width).getValues()[0].map(String):[];
    var required=NGD.HEADERS[name].split(',');
    // All application queries use named columns. Preserve pre-existing
    // additional columns such as WA verification or gateway metadata.
    var absent=required.filter(function(h){return actual.indexOf(h)<0;});
    var seen={},duplicates=[];
    actual.forEach(function(h){
      if(!h)return;
      if(seen[h])duplicates.push(h);
      else seen[h]=true;
    });
    var extras=actual.filter(function(h){return !!h&&required.indexOf(h)<0;});
    if(absent.length)missingColumns[name]=absent;
    if(duplicates.length)duplicateColumns[name]=duplicates;
    if(extras.length)extraColumns[name]=extras;
    if(absent.length||duplicates.length)mismatched.push(name);
  });
  var enabled=function(key){return props.getProperty(key)==='true';};
  return {
    version:NGD.VERSION,
    schema:{expected:expected.length,ready:expected.length-missing.length-mismatched.length,
      missing:missing,mismatched:mismatched,
      missing_columns:missingColumns,duplicate_columns:duplicateColumns,
      extra_columns:extraColumns},
    feature_flags:{
      mutations:mutationsEnabled_(),
      registration:enabled('NGD_REGISTRATION_ENABLED'),
      finance:financeEnabled_(),
      catalog:enabled('NGD_CATALOG_ENABLED'),
      content:enabled('NGD_CONTENT_ENABLED'),
      services:enabled('NGD_SERVICE_ENABLED'),
      support:enabled('NGD_SUPPORT_ENABLED'),
      lms:enabled('NGD_LMS_ENABLED'),
      notifications:enabled('NGD_NOTIFICATIONS_ENABLED')
    },
    // This field deliberately does not say that payments, privacy or auth are GO.
    checks_read_only:true
  };
}

// Only the deliberately separate STAGING workspace may consume this endpoint.
// This is a server-side attestation, not a client-supplied environment label.
function ngdStagingWorkspaceInfo_() {
  var props=PropertiesService.getScriptProperties();
  var dbId=String(props.getProperty('NGD_DB_ID')||'').trim();
  var adminDb=String(props.getProperty('NGD_ADMIN_LOGIN_DB_ID')||'').trim();
  var otpDb=String(props.getProperty('NGD_OTP_STAGING_DB_ID')||'').trim();
  require_(props.getProperty('NGD_ENVIRONMENT')==='STAGING' &&
    !!dbId && adminDb===dbId &&
    (!otpDb || otpDb===dbId) &&
    props.getProperty('NGD_ADMIN_LOGIN_ENABLED')==='true',
    'FORBIDDEN','Workspace bukan lingkungan STAGING terverifikasi.');
  require_(String(db_().getId())===dbId,'FORBIDDEN',
    'Database STAGING tidak sesuai konfigurasi.');
  return {
    workspace:'NGD_STAGING',environment:'STAGING',
    admin_login_enabled:true,
    mutations_enabled:mutationsEnabled_(),
    registration_enabled:props.getProperty('NGD_REGISTRATION_ENABLED')==='true',
    otp_enabled:props.getProperty('NGD_OTP_REGISTRATION_ENABLED')==='true',
    external_providers_enabled:props.getProperty('NGD_EXTERNAL_PROVIDERS_ENABLED')==='true',
    finance_enabled:financeEnabled_(),
    catalog_enabled:props.getProperty('NGD_CATALOG_ENABLED')==='true',
    content_enabled:props.getProperty('NGD_CONTENT_ENABLED')==='true',
    lms_enabled:props.getProperty('NGD_LMS_ENABLED')==='true'
  };
}

function ngdStagingWorkspaceReadOnlyCheck() {
  var info=ngdStagingWorkspaceInfo_();
  require_(!info.mutations_enabled&&!info.registration_enabled&&
    !info.otp_enabled&&!info.external_providers_enabled&&!info.finance_enabled,
    'MAINTENANCE','Pengaman write STAGING harus tetap OFF untuk preflight.');
  console.log('NGD_STAGING_WORKSPACE_READONLY_OK | environment=STAGING | writes=false');
  return 'NGD_STAGING_WORKSPACE_READONLY_OK';
}

function apiRouter_(action,token,p,requestId) {
  var m=null, admin=null;
  switch(action) {
    case 'getStagingWorkspaceInfo':return ngdStagingWorkspaceInfo_();
    case 'getPublicInfo':return publicInfo_(p);
    case 'getKatalog':return publicCatalog_();
    case 'getPublicContent':return contentPublicList_();
    // Both OTP actions are write-gated by doPost and STAGING-only guard.
    case 'requestRegistrationOtp':return ngdOtpRequest_(p);
    case 'verifyRegistrationOtp':return ngdOtpVerify_(p);
    case 'register':return authRegister_(p);
    case 'login':return authLogin_(p);
    case 'adminLogin':return adminPortalLogin_(p);
    case 'trackClick':
      requirePublicTrackingEnabled_();
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
    case 'adminLogout':return adminPortalLogout_(token);
    case 'adminChangePin':return adminPortalChangePin_(token,p);
    case 'updateMyProfile':return updateMyProfile_(m,p);
    case 'getMyNotifications':return notificationInbox_(m);
    case 'getMyServiceRequests':return serviceListMine_(m);
    case 'submitServiceBrief':return serviceSubmit_(m,p,requestId);
    case 'markNotificationRead':return notificationMarkRead_(m,p);
    case 'getLMSCatalog':return lmsPublishedCatalog_(m);
    case 'getLMSCourse':return lmsMemberDetail_(m,p);
    case 'getMyLMSEnrollments':return lmsMyEnrollments_(m);
    case 'enrollLMSCourse':return lmsEnroll_(m,p,requestId);
    case 'completeLMSLesson':return lmsComplete_(m,p,requestId);
    case 'getMyProducts':return supportMemberProducts_(m,readAll_('orders'),readAll_('katalog_produk'));
    case 'getMyTickets':return supportListMine_(m);
    case 'getTicket':return supportGetTicket_(m,p.ticket_id);
    case 'getMyProductReleases':return supportReleasesForMember_(m,p);
    case 'createTicket':return supportOpenTicket_(m,p,requestId);
    case 'replyTicket':return supportReply_(m,p,requestId);
    case 'logout':return authLogout_(token);
    case 'changePin':return authChangePin_(m,p);
    case 'getBeranda':return dashboard_(m);
    case 'getModulBelajar':return modules_().map(function(x){return {modul_id:x.modul_id,urut:x.urut,judul:x.judul,deskripsi:x.deskripsi,url_classroom:x.url_classroom};});
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
    case 'trackOutbound':return apiRouter_('trackClick',token,{tipe:'ETALASE_LUAR',
      visitor_id:p.visitor_id,item_id:p.item_id},requestId);
    case 'getAffiliateDashboard':return affiliateDashboard_(m);
    case 'requestPayout':return requestPayout_(m);
    case 'generateAI':throw ngdError_('AI_FAILED','Layanan AI belum diaktifkan admin. Kredit tidak dipotong.');
  }
  admin=admin_(token);
  switch(action){
    case 'adminListContent':return contentAdminList_();
    case 'adminCreateContent':return contentCreate_(admin,p,requestId);
    case 'adminUpdateContent':return contentUpdate_(admin,p);
    case 'adminSetContentStatus':return contentSetStatus_(admin,p);
    case 'adminListCatalog':return catalogAdminList_();
    case 'adminListServiceRequests':return serviceListAdmin_(p);
    case 'adminUpdateServiceQuote':return serviceQuote_(admin,p);
    case 'adminCreateCatalogItem':return catalogCreate_(admin,p,requestId);
    case 'adminUpdateCatalogItem':return catalogUpdate_(admin,p);
    case 'adminSetCatalogActive':return catalogSetActive_(admin,p);
    case 'adminListLMSCourses':return lmsAdminCatalog_(p);
    case 'adminGetLMSCourse':return lmsAdminLessons_(p);
    case 'adminListLMSRevisions':return lmsAdminRevisions_(p);
    case 'adminListLMSAIJobs':return lmsListAIJobs_(p);
    case 'adminCreateLMSCourse':return lmsCreateCourse_(admin,p,requestId);
    case 'adminUpdateLMSCourse':return lmsUpdateCourse_(admin,p);
    case 'adminArchiveLMSCourse':return lmsArchive_(admin,p,'COURSE');
    case 'adminRestoreLMSCourse':return lmsRestore_(admin,p,'COURSE');
    case 'adminPublishLMSCourse':return lmsPublishCourse_(admin,p,requestId);
    case 'adminCreateLMSLesson':return lmsCreateLesson_(admin,p,requestId);
    case 'adminUpdateLMSLesson':return lmsUpdateLesson_(admin,p);
    case 'adminArchiveLMSLesson':return lmsArchive_(admin,p,'LESSON');
    case 'adminRestoreLMSLesson':return lmsRestore_(admin,p,'LESSON');
    case 'adminPublishLMSLesson':return lmsPublishLesson_(admin,p,requestId);
    case 'adminPrepareLMSAIJob':return lmsPrepareAIJob_(admin,p,requestId);
    case 'adminImportLMSAIResult':return lmsImportAIResult_(admin,p);
    case 'adminReviewLMSAIJob':return lmsCloseAIJob_(admin,p);
    case 'adminSearchMembers':return supportSearchMembers_(p);
    case 'adminGetMember360':return supportGetMember360_(p.member_id);
    case 'adminGetProductImpact':return supportProductImpact_(p);
    case 'adminGetSupportOverview':return supportOverview_();
    case 'adminListTickets':return supportListAdmin_(p);
    case 'adminGetTicket':return supportGetTicket_(admin,p.ticket_id);
    case 'adminChangeTicketStatus':return supportChangeStatus_(admin,p,requestId);
    case 'adminSetTicketPriority':return supportSetPriority_(admin,p,requestId);
    case 'adminReplyTicket':return supportReply_(admin,p,requestId);
    case 'adminListProductReleases':return supportAdminReleases_();
    case 'adminCreateProductRelease':return supportCreateRelease_(admin,p,requestId);
    case 'adminPublishProductRelease':return supportPublishRelease_(admin,p);
    case 'adminGetRuntimeStatus':return adminRuntimeStatus_();
    case 'adminGetDashboard':return {ringkasan:readAll_('ringkasan').map(function(r){return {metrik:r.metrik,nilai:r.nilai};}),followup:[]};
    case 'adminListOrders':return readAll_('orders').filter(function(r){return !p.status||r.status===p.status;}).slice(-100).reverse().map(function(r){return orderView_(r,admin);});
    case 'adminGetReconciliation':return adminReconciliation_(admin);
    case 'adminVerifyOrder':require_(['approve','reject'].indexOf(p.keputusan)>=0,'VALIDATION','Keputusan tidak dikenal.');return transitionOrder_(admin,p.order_id,p.keputusan,p);
    case 'adminFulfillOrder':return approveFulfillment_(admin,p);
    case 'adminRefundOrder':return refundOrder_(admin,p);
    case 'adminListMembers':return readAll_('members').filter(function(r){return r.role==='MEMBER';}).map(publicMember_);
    case 'adminListWaitingList':return memberWaitlist_();
    case 'adminPromoteWaitlist':return adminPromoteWaitlist_(admin,p);
    case 'adminSuspendMember':return adminSuspendMember_(admin,p);
    case 'adminReactivateMember':return adminReactivateMember_(admin,p);
    case 'adminListCommissions':return readAll_('affiliate_commissions');
    case 'adminGetSettings':return settings_();
    case 'adminUpdateSetting':
      return withLock_(function(){
        var value=validatedAdminSetting_(p.key,p.value);
        if(p.key==='kuota_gelombang')require_(value>=memberCount_(),'CONFLICT','Kuota tidak boleh kurang dari jumlah member aktif.');
        var before=setting_(p.key,'');
        updateSetting_(p.key,value);
        logAudit_(admin.member_id,'ADMIN','SETTING_CHANGED','pengaturan_sistem',p.key,String(before),String(value),{});
        return {success:true};
      });
    case 'adminAdjustCredit':
      return withLock_(function(){
        var member=byId_('members','member_id',p.member_id);
        require_(member&&member.role==='MEMBER','NOT_FOUND','Member tidak ditemukan.');
        var amount=Number(p.jumlah);
        require_(Number.isInteger(amount)&&amount!==0&&Math.abs(amount)<=100000,
          'VALIDATION','Koreksi kredit harus bilangan bulat dalam batas yang diizinkan.');
        var reason=safeText_(p.alasan,300);
        require_(reason.length>=5,'VALIDATION','Alasan koreksi wajib diisi.');
        require_(/^[A-Za-z0-9_-]{16,80}$/.test(String(requestId||'')),
          'VALIDATION','ID permintaan koreksi tidak valid.');
        var reference='ADMIN_ADJUST:'+requestId;
        var posting=grantCredits_(member.member_id,amount,reference,'ADJUST');
        if(!posting.alreadyApplied)
          logAudit_(admin.member_id,'ADMIN','CREDIT_ADMIN_ADJUST','credits_ledger',reference,
            '','POSTED',{member_id:member.member_id,amount:amount,reason:reason});
        return {saldo:posting.balance,already_applied:posting.alreadyApplied};
      });
    case 'adminMarkCommissionPaid':
      return withLock_(function(){
        var c=byId_('affiliate_commissions','komisi_id',p.komisi_id);
        require_(c&&c.status==='APPROVED'&&c.payout_requested_at,
          'CONFLICT','Komisi belum diajukan atau disetujui.');
        var linkedOrder=byId_('orders','order_id',c.order_id);
        require_(linkedOrder&&['PAID','FULFILLED'].indexOf(linkedOrder.status)>=0,
          'RECONCILIATION_REQUIRED','Order asal komisi belum valid untuk pencairan.');
        require_(p.dana_sudah_ditransfer===true&&p.penerima_terverifikasi===true,
          'RECONCILIATION_REQUIRED','Transfer dan penerima harus diverifikasi sebelum dicatat lunas.');
        var reference=safeText_(p.referensi_transfer,120),note=safeText_(p.catatan,300);
        require_(reference.length>=5,'VALIDATION','Bukti atau referensi transfer diperlukan.');
        require_(note.length>=5,'VALIDATION','Catatan pencairan diperlukan.');
        updateRow_('affiliate_commissions',c._row,{status:'PAID',paid_at:now_(),
          payout_note:'Ref: '+reference+' | '+note});
        logAudit_(admin.member_id,'ADMIN','COMMISSION_PAID','affiliate_commissions',c.komisi_id,
          'APPROVED','PAID',{reference:reference,recipient_verified:true});
        return {success:true,komisi_id:c.komisi_id};
      });
  }
  throw ngdError_('BAD_REQUEST','Aksi tidak dikenal.');
}
function apiOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value,function(k,v){return v instanceof Date?isoWib_(v):v;})).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  return apiOutput_({ok:true,data:{app:'Ngulik Digital API',version:NGD.VERSION,
    writes_enabled:mutationsEnabled_(),payments_enabled:financeEnabled_(),
    time:isoWib_(now_())},server_time:isoWib_(now_())});
}
// Hard fail-closed release gate. Frontend demoMode is NOT a security boundary.
// Enable only after QA, by setting NGD_MUTATIONS_ENABLED=true in Script Properties.
function mutationsEnabled_() {
  return PropertiesService.getScriptProperties().getProperty('NGD_MUTATIONS_ENABLED')==='true';
}
function requireMutationsEnabled_() {
  require_(mutationsEnabled_(),'MAINTENANCE',
    'Perubahan data belum diaktifkan. Sistem masih dalam pengujian.');
}
// Independent server-side release switches: testing login must not silently
// enable public registration, checkout, refunds, payouts or settlement.
function financeEnabled_() {
  return PropertiesService.getScriptProperties().getProperty('NGD_FINANCE_ENABLED')==='true';
}
function requireFinanceEnabled_() {
  require_(financeEnabled_(),'MAINTENANCE',
    'Transaksi, kredit berbayar, dan pencairan belum diaktifkan.');
}
function requireActionFeatureEnabled_(action) {
  var settings=PropertiesService.getScriptProperties();
  if(action==='register')
    require_(settings.getProperty('NGD_REGISTRATION_ENABLED')==='true',
      'MAINTENANCE','Pendaftaran belum dibuka.');
  if(['enrollLMSCourse','completeLMSLesson','adminCreateLMSCourse',
      'adminUpdateLMSCourse','adminArchiveLMSCourse','adminRestoreLMSCourse',
      'adminPublishLMSCourse',
      'adminCreateLMSLesson','adminUpdateLMSLesson','adminArchiveLMSLesson',
      'adminRestoreLMSLesson',
      'adminPublishLMSLesson','adminPrepareLMSAIJob','adminImportLMSAIResult',
      'adminReviewLMSAIJob'].indexOf(action)>=0)
    require_(settings.getProperty('NGD_LMS_ENABLED')==='true',
      'MAINTENANCE','Pengelolaan LMS masih dalam tahap pengujian.');
  if(['adminCreateContent','adminUpdateContent','adminSetContentStatus'].indexOf(action)>=0)
    require_(settings.getProperty('NGD_CONTENT_ENABLED')==='true',
      'MAINTENANCE','Pengelolaan konten belum diaktifkan pada backend.');
  if(['adminCreateCatalogItem','adminUpdateCatalogItem','adminSetCatalogActive'].indexOf(action)>=0)
    require_(settings.getProperty('NGD_CATALOG_ENABLED')==='true',
      'MAINTENANCE','Perubahan katalog masih dalam tahap staging.');
  if(['submitServiceBrief','adminUpdateServiceQuote'].indexOf(action)>=0)
    require_(settings.getProperty('NGD_SERVICE_ENABLED')==='true',
      'MAINTENANCE','Pemesanan jasa belum diaktifkan pada backend ini.');
  if(action==='markNotificationRead')
    require_(settings.getProperty('NGD_NOTIFICATIONS_ENABLED')==='true',
      'MAINTENANCE','Pusat notifikasi belum diaktifkan.');
  if(['createTicket','replyTicket','adminChangeTicketStatus','adminSetTicketPriority','adminReplyTicket',
      'adminCreateProductRelease','adminPublishProductRelease'].indexOf(action)>=0)
    require_(settings.getProperty('NGD_SUPPORT_ENABLED')==='true',
      'MAINTENANCE','Layanan tiket dan rilis masih dalam tahap pengujian.');
  if(['createOrder','confirmPayment','cancelOrder','adminVerifyOrder',
      'adminFulfillOrder','adminRefundOrder','adminAdjustCredit',
      'adminMarkCommissionPaid','requestPayout','generateAI'].indexOf(action)>=0)
    requireFinanceEnabled_();
}
// Public visitor click logging is independently disabled until abuse controls
// and an explicit privacy/retention policy have been approved.
function requirePublicTrackingEnabled_() {
  require_(PropertiesService.getScriptProperties().getProperty('NGD_CLICK_TRACKING_ENABLED')==='true',
    'MAINTENANCE','Pencatatan klik belum diaktifkan.');
}
function apiReadActions_() {
  return ['getStagingWorkspaceInfo','getPublicInfo','getPublicContent','getMe','getBeranda','getModulBelajar','getKatalog',
    'getOrder','listMyOrders','getTools','getKreditRiwayat','getEtalase',
    'getAffiliateDashboard','getMyNotifications','getMyServiceRequests',
    'adminListServiceRequests','adminGetDashboard','adminGetRuntimeStatus','adminListOrders','adminListMembers',
    'adminListWaitingList','adminListCommissions','adminGetSettings','adminListCatalog','adminListContent',
    'adminGetReconciliation',
    'getMyProducts','getMyTickets','getTicket','getMyProductReleases',
    'adminSearchMembers','adminGetMember360','adminGetProductImpact','adminGetSupportOverview',
    'adminListTickets','adminGetTicket','adminListProductReleases',
    'getLMSCatalog','getLMSCourse','getMyLMSEnrollments',
    'adminListLMSCourses','adminGetLMSCourse','adminListLMSRevisions',
    'adminListLMSAIJobs'];
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
    var reads=apiReadActions_();
    var isolatedAdmin=['adminLogin','adminLogout','adminChangePin'];
    if(isolatedAdmin.indexOf(action)>=0){
      // Authentication is released independently of registration, payments,
      // refunds, catalogue and content writes. Never add generic admin
      // mutation actions to this list.
      requireAdminPortalEnabled_();
      require_(/^[a-zA-Z0-9_-]{16,80}$/.test(id),'VALIDATION','ID permintaan tidak valid.');
    }else if(reads.indexOf(action)<0){
      requireMutationsEnabled_();
      requireActionFeatureEnabled_(action);
      require_(/^[a-zA-Z0-9_-]{16,80}$/.test(id),'VALIDATION','ID permintaan tidak valid.');
    }
    var result=apiRouter_(action,String(body.token||''),payload,id);
    return apiOutput_({ok:true,data:result,server_time:isoWib_(now_())});
  }catch(err){
    var known=err&&err.publicCode;
    if(!known)console.error('NGD_ERROR '+(err&&err.stack?err.stack:String(err)));
    return apiOutput_({ok:false,error:{code:known||'INTERNAL',message:known?err.message:'Terjadi gangguan sistem. Silakan coba lagi.'},server_time:isoWib_(now_())});
  }
}

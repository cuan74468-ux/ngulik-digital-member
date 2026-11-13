/**
 * NGULIK DIGITAL MEMBER — DIAGNOSTICS V3
 * Read-only: tidak menulis ke Sheets, membuat sesi, atau mengubah transaksi.
 * Jalankan diagnosticApiPublic untuk menguji API.
 */
const DIAG_DB_ID = '19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8';

function diagnosticPing() {
  console.log('PING_OK');
  return 'PING_OK';
}

function diagnosticDatabase() {
  var started = Date.now();
  var ss = SpreadsheetApp.openById(DIAG_DB_ID);
  console.log('DB_OK | Nama: ' + ss.getName() +
    ' | Tab: ' + ss.getSheets().length +
    ' | Durasi: ' + (Date.now() - started) + ' ms');
  return 'DB_OK';
}

function diagnosticSchema() {
  var started = Date.now();
  var names = [
    'members','katalog_produk','etalase_affiliate_luar','orders',
    'credits_ledger','affiliate_commissions','audit_logs',
    'pengaturan_sistem','sessions','klik_log','ai_tools',
    'modul_belajar','progress_member','ringkasan'
  ];
  var ss = SpreadsheetApp.openById(DIAG_DB_ID);
  names.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) throw new Error('MISSING_TAB: ' + name);
    var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    console.log('OK: ' + name + ' | ' + headers.length + ' kolom');
  });
  console.log('SCHEMA_OK | Tab: ' + names.length +
    ' | Durasi: ' + (Date.now() - started) + ' ms');
  return 'SCHEMA_OK';
}

function diagnosticBackend() {
  var started = Date.now();
  Object.keys(NGD.HEADERS).forEach(function(name) {
    var expected = NGD.HEADERS[name].split(',');
    var actual = tbl_(name).headers;
    if (expected.join('|') !== actual.join('|')) {
      throw new Error('MISMATCH: ' + name);
    }
    console.log('OK: ' + name);
  });
  console.log('BACKEND_SCHEMA_OK | Tab: ' +
    Object.keys(NGD.HEADERS).length +
    ' | Durasi: ' + (Date.now() - started) + ' ms');
  return 'BACKEND_SCHEMA_OK';
}

// Tes API menggunakan doPost lokal: tidak membutuhkan deployment Web App.
function diagnosticCallApi_(action, payload, token) {
  var request = {
    action: action,
    token: token || '',
    payload: payload || {}
  };
  var response = doPost({
    postData: {contents: JSON.stringify(request)}
  });
  return JSON.parse(response.getContent());
}

function diagnosticAssert_(passed, label) {
  if (!passed) {
    console.error('FAIL: ' + label);
    throw new Error('API_TEST_FAILED: ' + label);
  }
  console.log('PASS: ' + label);
}

function diagnosticApiPublic() {
  var started = Date.now();
  console.log('Mulai pengujian API baca-saja.');

  // 1. Endpoint informasi publik.
  var info = diagnosticCallApi_('getPublicInfo');
  diagnosticAssert_(info.ok === true, 'getPublicInfo berhasil');
  diagnosticAssert_(
    info.data && info.data.nama_brand === 'Ngulik Digital',
    'Nama brand sesuai'
  );
  diagnosticAssert_(
    typeof info.data.kuota === 'number' &&
    typeof info.data.terpakai === 'number' &&
    typeof info.data.sisa === 'number',
    'Data kuota valid'
  );
  diagnosticAssert_(
    !Object.prototype.hasOwnProperty.call(info.data, 'pin_hash') &&
    !Object.prototype.hasOwnProperty.call(info.data, 'pin_salt'),
    'Informasi publik tidak memuat hash atau salt PIN'
  );

  // 2. Katalog publik.
  var katalog = diagnosticCallApi_('getKatalog');
  diagnosticAssert_(katalog.ok === true, 'getKatalog berhasil');
  diagnosticAssert_(
    Array.isArray(katalog.data) && katalog.data.length === 6,
    'Katalog memiliki 6 produk awal'
  );
  diagnosticAssert_(
    katalog.data.every(function(item) {
      return typeof item.product_id === 'string' &&
        typeof item.harga === 'number';
    }),
    'ID dan harga produk terbaca'
  );

  // 3. Akses admin tanpa login harus ditolak server.
  var admin = diagnosticCallApi_('adminGetDashboard');
  diagnosticAssert_(
    admin.ok === false &&
    admin.error &&
    admin.error.code === 'UNAUTHORIZED',
    'Admin tanpa sesi ditolak'
  );

  // 4. Profil member tanpa login harus ditolak server.
  var me = diagnosticCallApi_('getMe');
  diagnosticAssert_(
    me.ok === false &&
    me.error &&
    me.error.code === 'UNAUTHORIZED',
    'Profil tanpa sesi ditolak'
  );

  console.log('API_PUBLIC_OK');
  console.log('Durasi: ' + (Date.now() - started) + ' ms');
  console.log('Tidak ada penulisan database atau transaksi uji.');
  return 'API_PUBLIC_OK';
}


// =====================================
// TEST 5 — AUTENTIKASI (TANPA MUTASI)
// =====================================
// Tidak menguji login nyata atau membuat sesi. Tidak pernah mencetak PIN/token.
function diagnosticAuthReadOnly() {
  var start=Date.now(), passed=0;
  function check(ok,name) {
    if (!ok) throw new Error('AUTH_TEST_FAILED: '+name);
    passed++;console.log('PASS: '+name);
  }
  function fails(fn) {
    try {fn();return false;} catch(e){return true;}
  }
  console.log('Mulai pemeriksaan autentikasi baca-saja.');

  check(normalizeWa_('081234567890')==='6281234567890',
    'Normalisasi WA 08 ke 62');
  check(normalizeWa_('+6281234567890')==='6281234567890',
    'Normalisasi WA +62');
  check(fails(function(){normalizeWa_('abc');}),
    'Nomor WA tidak valid ditolak');
  check(fails(function(){normalizeWa_('0812');}),
    'Nomor WA terlalu pendek ditolak');

  checkPin_('123456');
  check(true,'Format PIN 6 digit diterima');
  check(fails(function(){checkPin_('12345');}),
    'PIN 5 digit ditolak');
  check(fails(function(){checkPin_('1234567');}),
    'PIN 7 digit ditolak');
  check(fails(function(){checkPin_('abcdef');}),
    'PIN nonangka ditolak');

  var salt='DIAGNOSTIC-SALT-ONLY';
  var hash=pinHash_('123456',salt);
  check(/^[a-f0-9]{64}$/.test(hash),'Hash SHA-256 64 karakter');
  check(hash!==pinHash_('123457',salt),
    'PIN berbeda menghasilkan hash berbeda');
  check(hash!==pinHash_('123456','OTHER-DIAGNOSTIC-SALT'),
    'Salt berbeda menghasilkan hash berbeda');

  var fake='A'.repeat(64);
  check(fails(function(){session_(fake);}),
    'Token sesi palsu ditolak');
  check(fails(function(){session_('token-invalid');}),
    'Format token tidak valid ditolak');

  var admin=diagnosticCallApi_('adminGetDashboard',{},fake);
  check(admin.ok===false&&admin.error&&admin.error.code==='UNAUTHORIZED',
    'API admin menolak token palsu');

  var account=diagnosticCallApi_('getMe',{},fake);
  check(account.ok===false&&account.error&&account.error.code==='UNAUTHORIZED',
    'API profil menolak token palsu');

  var settings=diagnosticCallApi_('adminGetSettings',{},'');
  check(settings.ok===false&&settings.error&&settings.error.code==='UNAUTHORIZED',
    'Pengaturan admin menolak tanpa sesi');

  console.log('AUTH_READONLY_OK');
  console.log('Jumlah pemeriksaan: '+passed);
  console.log('Durasi: '+(Date.now()-start)+' ms');
  console.log('READ_ONLY: Tidak membuat sesi, akun, PIN, atau transaksi.');
  return 'AUTH_READONLY_OK';
}


// =====================================
// TEST 6 — AUDIT KEUANGAN BACA-SAJA
// =====================================
function diagnosticFinanceReadOnly() {
  var started=Date.now(),errors=[],warnings=[];
  console.log('FINANCE_AUDIT_STARTED');
  var orders=readAll_('orders');
  var ledger=readAll_('credits_ledger');
  var commissions=readAll_('affiliate_commissions');
  var products=readAll_('katalog_produk');
  var members=readAll_('members');
  var pids={};products.forEach(function(x){pids[String(x.product_id)]=true;});
  var mids={};members.forEach(function(x){mids[String(x.member_id)]=true;});
  var orderIds={},requestIds={},money={};
  orders.forEach(function(o){
    var id=String(o.order_id||'');
    if(!id||orderIds[id])errors.push('ORDER_ID_DUPLICATE_OR_EMPTY');
    orderIds[id]=true;
    if(o.request_id){
      var req=String(o.request_id);
      if(requestIds[req])errors.push('REQUEST_ID_DUPLICATE');
      requestIds[req]=true;
    }
    if(!mids[String(o.member_id)])errors.push('ORDER_MEMBER_MISSING');
    if(!pids[String(o.product_id)])errors.push('ORDER_PRODUCT_MISSING');
    var price=Number(o.harga_dasar),code=Number(o.kode_unik),total=Number(o.total_bayar);
    if(!Number.isFinite(price)||!Number.isFinite(code)||!Number.isFinite(total)||
       price+code!==total)errors.push('ORDER_TOTAL_INVALID');
    if(['PENDING','MENUNGGU_VERIFIKASI'].indexOf(o.status)>=0){
      if(money[total])errors.push('ACTIVE_PAYMENT_AMOUNT_DUPLICATE');
      money[total]=true;
    }
  });
  var ledgerIds={},topups={},reversals={};
  ledger.forEach(function(l){
    if(!l.entry_id||ledgerIds[l.entry_id])errors.push('LEDGER_ID_DUPLICATE_OR_EMPTY');
    ledgerIds[l.entry_id]=true;
    if(!mids[String(l.member_id)])errors.push('LEDGER_MEMBER_MISSING');
    var amount=Number(l.jumlah);
    if(!Number.isFinite(amount))errors.push('LEDGER_AMOUNT_INVALID');
    if(l.tipe==='TOPUP'){
      var key=l.member_id+'|'+l.ref_id;
      if(!l.ref_id||topups[key])errors.push('TOPUP_DUPLICATE_OR_NO_REF');
      topups[key]=true;
    }
    if(l.tipe==='ADJUST_REFUND'){
      var key2=l.member_id+'|'+l.ref_id;
      if(!l.ref_id||reversals[key2])errors.push('REFUND_ADJUST_DUPLICATE_OR_NO_REF');
      reversals[key2]=true;
    }
  });
  var commissionIds={},commissionOrders={};
  commissions.forEach(function(k){
    if(!k.komisi_id||commissionIds[k.komisi_id])errors.push('COMMISSION_ID_DUPLICATE_OR_EMPTY');
    commissionIds[k.komisi_id]=true;
    if(!orderIds[String(k.order_id)])warnings.push('COMMISSION_ORDER_MISSING');
    var key=k.order_id;
    if(commissionOrders[key])warnings.push('MULTIPLE_COMMISSION_SAME_ORDER');
    commissionOrders[key]=true;
  });
  var summary={orders:orders.length,ledger:ledger.length,commissions:commissions.length,
    members:members.length,products:products.length,
    errors:errors.length,warnings:warnings.length,durationMs:Date.now()-started};
  console.log('FINANCE_SUMMARY '+JSON.stringify(summary));
  if(errors.length||warnings.length){
    var counts={};errors.concat(warnings).forEach(function(e){counts[e]=(counts[e]||0)+1;});
    console.warn('FINANCE_FINDINGS '+JSON.stringify(counts));
  }
  if(errors.length){console.error('FINANCE_AUDIT_FAILED');return 'FINANCE_AUDIT_FAILED';}
  if(warnings.length){console.warn('FINANCE_AUDIT_WARN');return 'FINANCE_AUDIT_WARN';}
  console.log('FINANCE_AUDIT_OK — tidak ada anomali yang terdeteksi pemeriksaan ini');
  return 'FINANCE_AUDIT_OK';
}

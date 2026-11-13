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

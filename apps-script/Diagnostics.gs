/**
 * Diagnostik aman. Tidak menulis ke database, tidak memakai lock,
 * tidak membuka dialog, dan tidak mengubah konfigurasi.
 * Jalankan diagnosticPing terlebih dahulu.
 */
function diagnosticPing() {
  var started = new Date();
  console.log('PING_OK ' + started.toISOString());
  return 'PING_OK';
}

function diagnosticDatabase() {
  var start = Date.now();
  try {
    var spreadsheet = SpreadsheetApp.openById('19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8');
    console.log('DB_OK ' + JSON.stringify({
      title: spreadsheet.getName(),
      sheet_count: spreadsheet.getSheets().length,
      elapsed_ms: Date.now() - start
    }));
    return 'DB_OK';
  } catch (err) {
    console.error('DB_ERROR ' + (err && err.message ? err.message : String(err)));
    throw err;
  }
}

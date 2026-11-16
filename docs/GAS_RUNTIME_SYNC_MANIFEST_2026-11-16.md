# Manifest Sinkronisasi Source GitHub ↔ Apps Script STAGING — 16 November 2026

**Tujuan:** mencegah penimpaan `Code.gs`/modul terpasang tanpa verifikasi. Berkas pasangan mesin: [`contracts/gas-runtime-source-manifest-2026-11-16.json`](../contracts/gas-runtime-source-manifest-2026-11-16.json).

## Status yang diketahui
- GitHub `main` memiliki **15 file Apps Script `.gs`**; SHA blob dan ukuran setiap file dicatat dalam manifest pada source snapshot `a4e20065...`.
- Hanya dua fungsi diagnostik pada editor Apps Script STAGING yang **diketahui pernah berjalan** dari log owner: `ngdInfrastructurePreflightReadOnly` (29/29) dan `ngdDataIntegrityPreflightReadOnly` (8/8). Ini membuktikan fungsi berjalan, **bukan** bahwa seluruh isi file editor identik dengan commit GitHub.
- Konten editor GAS `Code.gs`, `OtpAuth.gs`, `AdminAccess.gs`, `LMS.gs`, dan semua modul lain **belum diverifikasi dari konektor**; Google Drive tidak menyediakan pembacaan script yang terotorisasi saat dicoba.
- Script baru `RegistrationRecoveryPreflight.gs` masih **SOURCE GitHub** dalam catatan verifikasi; belum ada log owner yang memastikan pemasangan atau eksekusinya.
- Keadaan produksi tidak ditelusuri atau dimodifikasi pada proses ini. Script Properties dan database tidak disentuh.

## Langkah membandingkan saat operator siap
1. Buka editor [Apps Script STAGING](https://script.google.com/u/0/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit); pastikan proyek tersebut memang STAGING dan simpan cadangan seluruh kode sebelum perubahan apa pun.
2. Cocokkan daftar file di panel **Files** dengan semua nama pada manifest. Tandai **ADA / TIDAK ADA / BELUM DIPASTIKAN**, jangan menghapus file yang dianggap ekstra.
3. Bandingkan file paling penting satu per satu: `Code.gs` (fungsi `authRegister_`, `authLogout_`), `OtpAuth.gs` (fungsi `ngdValidateVerifiedRegistrationOtp_`, `ngdConsumeVerifiedRegistrationOtp_`), `AdminAccess.gs`, `LMS.gs`, dan preflight baru. Jangan menganggap SHA GitHub sama dengan checksum editor.
4. Bila berbeda, buat **rencana patch minimum per fungsi**. Jangan menimpa `Code.gs` secara keseluruhan, mengaktifkan flags, atau mengganti URL Web App. Backup/rollback GAS perlu dicatat dulu.
5. Untuk fungsi editor-only `ngdRegistrationRecoveryPreflightReadOnly`, pastikan kedua preflight terdahulu telah ada dan tidak berubah, buat file baru hanya setelah backing up editor source, lalu jalankan tanpa membuka pendaftaran, provider, atau mutasi.
6. Catat hasil audit sebagai jumlah dan kode status saja. **Jangan kirim PIN, token sesi, nomor WhatsApp, hash OTP, API key, spreadsheet ID, atau source yang mengandung kredensial** melalui chat.

## Prioritas source-only berikut
Tutup risiko starter grant/OTP failure recovery, audit idempotensi, serta prosedur bantuan operator; baru kemudian uji sinkronisasi STAGING. **Tahap 1 tetap PROSES/NO-GO.**

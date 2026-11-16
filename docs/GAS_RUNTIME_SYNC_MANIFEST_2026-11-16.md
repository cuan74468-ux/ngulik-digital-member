# Manifest Sinkronisasi Source GitHub ↔ Apps Script STAGING — 16 November 2026

**Tujuan:** mencegah penimpaan `Code.gs`/modul terpasang tanpa verifikasi. Berkas pasangan mesin: [`contracts/gas-runtime-source-manifest-2026-11-16.json`](../contracts/gas-runtime-source-manifest-2026-11-16.json).

## Status yang diketahui
- GitHub `main` memiliki **15 file Apps Script `.gs`**; SHA blob dan ukuran setiap file dicatat dalam manifest pada source snapshot `67470ffd05b9aff9f7f52d1b320b59a072286d93`.
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

## Update manifest source — 16 November 2026

Daftar 15 modul dan Git blob SHA telah disegarkan terhadap snapshot source GitHub `67470ffd05b9aff9f7f52d1b320b59a072286d93` (sesudah hardening PIN V2 opt-in, sebelum commit dokumentasi ini). `tests/source-manifest.test.cjs` memverifikasi SHA1 blob Git terhadap bytes `apps-script/*.gs`; perubahan modul GAS berikutnya **harus** memperbarui manifest agar CI lulus. Kesesuaian sumber GitHub dengan isi file GAS editor aktif tetap **belum teruji**; jangan menyimpulkan 15 modul sudah terpasang.

## Handoff patch P0 terbaru — 16 November 2026

Rincian fungsi dan urutan pengamanan tersedia pada [Handoff Patch P0 Autentikasi](STAGE1_AUTH_PATCH_HANDOFF_2026-11-16.md). Snapshot source `1cd335e47cd5ff61ec1482e3e6976b83b8501177`; 443/443 test lulus dan Chrome sukses. Kode editor GAS tetap belum dibandingkan atau dideploy, jadi **jangan** menyimpulkan parity dari SHA GitHub.

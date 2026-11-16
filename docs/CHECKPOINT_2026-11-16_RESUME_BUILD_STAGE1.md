# Checkpoint terbaru — 16 November 2026 · Ngulik Digital Member

**Sumber:** checkpoint 15 November 2026 pukul 22.24 WIB (infrastruktur STAGING 29/29, integritas 8/8, nol temuan), audit lintas dokumen 16 November, dan UI/UX Shared Experience V2.  
**Tahap bisnis:** **Tahap 1 PROSES / NO-GO**. Platform adalah membership komersial nyata, bukan demo. Fonnte, Mayar, dan provider AI disiapkan **terakhir** setelah fondasi internal siap.

## Bukti yang sudah ada
- Owner menjalankan `ngdInfrastructurePreflightReadOnly`: `NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables=29 | environment=STAGING | writes=false | providers=DEFERRED`.
- Owner menjalankan `ngdDataIntegrityPreflightReadOnly`: `NGD_DATA_INTEGRITY_OK | tables=8 | issues= | writes=false`.
- STAGING dan PRODUCTION terpisah, masing-masing 29 dan 16 tab. Snapshot privat STAGING dengan 29 tab sudah dibuat dan dicocokkan jumlah record tabel penting; **restore belum diuji**.
- UI/UX Mobile-first V2 lulus CI **372/372** dan Chrome browser smoke; GitHub Pages deployment `a1a8ca6a1781f61aa6f685d4bb04bb13de661752` SUCCESS. Ini baseline visual yang **cukup untuk melanjutkan pengembangan backend**, bukan sign-off UI Android fisik.
- Source GitHub tidak otomatis tersinkron ke Apps Script; hanya dua pemeriksaan editor-only pada log owner yang terbukti terpasang. Jangan mengasumsikan source terbaru siap di runtime.

## Pekerjaan lanjutan — P0 registrasi OTP dan kegagalan parsial

**Analisis source terkonfirmasi:** `authRegister_` dahulu menjalankan `ngdConsumeVerifiedRegistrationOtp_` (menandai OTP `USED`) lalu `appendRow_('members',m)`. Bila penulisan member gagal setelah OTP dibakar, OTP tidak bisa digunakan untuk mencoba kembali.

**Perbaikan kandidat source-only, 16 November:**
- `ngdValidateVerifiedRegistrationOtp_` memverifikasi OTP tanpa mengubah status menjadi `USED` ketika kode valid, tetap di bawah lock; OTP salah/expired tetap menambah hitungan kesalahan atau memperbarui status.
- `authRegister_` memvalidasi OTP dan prasyarat schema, **menyimpan akun dahulu**, lalu mengonsumsi OTP berdasarkan ID bukti yang sudah diverifikasi server. Jika append akun gagal, OTP yang masih berlaku belum dipakai dan dapat dicoba ulang.
- Jika penyimpanan akun berhasil tetapi update OTP `USED` gagal, nomor WA yang sudah tercatat **tetap memblokir registrasi ulang**. Kasus ini memerlukan rekonsiliasi manual yang terkontrol, bukan membuka pendaftaran ulang, mengubah status OTP otomatis, atau menerbitkan starter grant kedua.
- Tes fault injection disiapkan: kegagalan append, kegagalan commit OTP, OTP salah, replay, dan verifikasi kode saat finalisasi.

**Batas perubahan:** Perubahan dibuat hanya pada source di GitHub + pengujian offline dan dokumen; tidak ada pengubahan/aktivasi Apps Script STAGING/PRODUCTION, Sheets, pelanggan, sistem kredit, pengiriman WA, atau pembayaran. Semua sakelar tetap OFF.

## Pekerjaan yang masih harus dilakukan
1. Periksa hasil CI commit terbaru: Node regression tests, browser Chrome, dan identitas STAGING read-only. Jika gagal, perbaiki source sebelum meneruskan; jangan menyatakan GO.
2. Lanjut audit registrasi dengan kasus crash sesudah append akun, crash saat grant kredit, OTP expired/used/replay, lock concurrency, dan prosedur rekonsiliasi operator. Perbaikan kandidat ini **mengurangi risiko OTP terbakar**, tidak membuat Google Sheets menjadi transaksi ACID.
3. Audit logout, session revocation, PIN throttle, expiry, dan perubahan PIN; tambahkan regresi berbasis clock serta failure injection sebelum runtime sinkronisasi.
4. Petakan manifest isi source `Code.gs`, `OtpAuth.gs`, `AdminAccess.gs`, `LMS.gs` vs versi editor Apps Script STAGING (tanpa menimpa source live).
5. Uji **restore terisolasi** dari snapshot privat STAGING, bukan pada database aktif.
6. Rekonsiliasi kebijakan komisi dan hak akses LMS mengikuti keputusan owner sebelum fitur monetisasi diaktifkan.
7. Kelola consent/privacy, retensi OTP dan WA, kuota permintaan, backup/rollback, serta QA perangkat Android/Windows.
8. Setelah fondasi siap dan disetujui, owner dapat menyiapkan akun Fonnte/Mayar/AI provider sebagai fase terakhir.

## Rujukan
- [Checkpoint 15 Nov](CHECKPOINT_2026-11-15_STAGING_INFRA_AND_INTEGRITY_OK.md)
- [Audit dokumen 16 Nov](AUDIT_DOKUMEN_LINTAS_SUMBER_2026-11-16.md)
- [Baseline UI V2](SHARED_EXPERIENCE_UIUX_V2_2026-11-16.md)
- [Runbook fondasi internal](INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md)
- [AGENTS.md](../AGENTS.md)

**Semua perubahan produksi, mutation flag, registration, OTP send, finance/refund/settlement, dan provider activation memerlukan persetujuan spesifik owner serta bukti QA.**

## P0 lanjutan — operasi sesi dan penggantian PIN (source only)

Audit `authLogout_` menemukan pembacaan dan `deleteRow` terhadap tab sesi berjalan tanpa `LockService`, sedangkan login dan penggantian PIN sudah memakai lock bersama. Karena `deleteRow` mengubah nomor baris fisik, logout bersamaan dengan pembuatan/pencabutan sesi lain memiliki risiko race dan target baris keliru. Source `Code.gs` dibenahi untuk membaca dan menghapus sesi **di dalam** `withLock_`, mengurutkan nomor baris fisik menurun sebelum penghapusan. Tes sintetis `tests/backend-session-lifecycle.test.cjs` memeriksa logout, retry idempoten, sesi kedaluwarsa, PIN rotation yang mencabut semua sesi anggota tanpa menyentuh sesi admin lain, serta PIN salah tanpa mutasi.

Perubahan ini hanya source di GitHub, bukan penghapusan sesi nyata. Belum ada tes pada browser autentikasi riil, belum ada deploy Apps Script, dan tidak ada perubahan fitur finansial. Operator harus membandingkan source STAGING yang aktif sebelum menjalankan patch backend yang lebih luas.

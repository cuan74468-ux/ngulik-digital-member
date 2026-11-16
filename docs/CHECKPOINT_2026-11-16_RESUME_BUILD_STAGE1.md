# Checkpoint terbaru — 16 November 2026 · Ngulik Digital Member
**Checkpoint teknis terbaru (16 November 2026):** Source audit rekonsiliasi registrasi STAGING baca-saja dan uji gangguan log/kredit/sesi sudah ditambahkan. [CI 398/398 PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43785751207), [Pages PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43785751269), commit source `78160154a4279aba1e5c8fd09ae64acec5d54bdb`. Seluruh perubahan backend adalah **GitHub source-only**, belum terpasang ke Apps Script STAGING; Tahap 1 tetap NO-GO.



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
1. **TERVERIFIKASI untuk source commit `bdacfa37cfd3432559831008eedb74ad9b4dfd2b`:** GitHub Actions `43783011719` lulus 381/381 Node tests, Chrome visual/mobile, public API readonly; Pages `43783011286` SUCCESS. Pemeriksaan identitas STAGING editor yang lebih awal sudah lulus, tetapi **kesetaraan seluruh runtime GAS dengan source terbaru belum dibuktikan**.
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

## Konfirmasi lintas-stack 16 November 2026

Commit source `bdacfa37cfd3432559831008eedb74ad9b4dfd2b` lulus [CI regression 381/381](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43783011719). Chrome guest/member/admin/LMS/operations dan POST baca-saja lolos; [GitHub Pages deployment](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43783011286) SUCCESS. Pengaman registrasi OTP dan logout masih **SOURCE-ONLY** pada GitHub. Pemilik belum diminta mengganti `Code.gs` pada editor; lakukan manifest/diff dan backup runtime terlebih dahulu sebelum mengubah Apps Script. Belum ada OTP send atau transaksi, dan belum ada izin membuka pendaftaran.

## 16 November — audit rekonsiliasi source-only dan fault injection (lanjutan)

Source baru `apps-script/RegistrationRecoveryPreflight.gs` dan tes `tests/backend-registration-recovery.test.cjs` ditambahkan untuk **audit baca-saja** pada `members`, `otp_verifications`, `credits_ledger`, dan `pengaturan_sistem`; hasil hanya menghitung kategori masalah, tidak mencantumkan nomor WhatsApp, member_id, PIN/OTP, atau data transaksi. Semua flag STAGING tetap OFF. Fungsi ini **belum terpasang di editor GAS** dan belum dijalankan pada spreadsheet asli.

Kasus yang ditangani: OTP USED tanpa member; akun sudah ada sementara OTP masih VERIFIED; akun MEMBER aktif terverifikasi kehilangan GRANT POSTED ketika `kredit_awal` benar-benar dikonfigurasi lebih dari nol; grant diberikan saat WAITING_LIST; akun verified tanpa bukti USED/VERIFIED (perlu meninjau kemungkinan data historis). Tidak ada perbaikan otomatis atau penyesuaian saldo.

Pengujian kegagalan parsial `tests/backend-otp-module.test.cjs` diperluas untuk mensimulasikan: INSERT member gagal, update OTP `USED` gagal, append `audit_logs` gagal, grant kredit gagal, dan penerbitan sesi gagal. Skenario-skenario setelah akun disimpan memang **belum menjamin pemulihan otomatis**: retry registrasi akan ditolak oleh guard WA agar tidak membuat member/kredit ganda. Kasus tersebut harus didiagnosis dan dipulihkan melalui prosedur aman yang belum mengizinkan mutasi.

**Manifes dan batas sinkronisasi runtime:**
- Source GitHub `Code.gs`, `OtpAuth.gs`, `AdminAccess.gs`, `RegistrationRecoveryPreflight.gs` serta modul lain perlu dibedakan dari file yang benar-benar ada pada editor Google Apps Script STAGING. Koneksi Google Drive tidak berhasil membuka identitas proyek Apps Script melalui metadata file; sehingga **belum ada diff runtime otomatis dan jangan mengklaim kesetaraan source**.
- Pada editor GAS STAGING, kedua preflight sebelumnya (`InfrastructurePreflight.gs`, `DataIntegrityPreflight.gs`) sudah terbukti aktif dari log owner. Namun semua file selain kedua preflight itu perlu pemeriksaan versi/presensi yang terpisah.
- Operator nantinya boleh menambahkan file audit baru saja setelah memastikan editor STAGING benar dan menyimpan salinan source lokal; tidak perlu menyalin `Code.gs` atau mengganti deployment untuk menjalankan fungsi editor-only. **Jangan** memasang modul/ubah registrasi langsung tanpa perbandingan diff menyeluruh.

**Batas bukti:** semua pengujian dengan akun, OTP, kredit, dan sesi sintetis. Tidak ada akun/OTP/ledger STAGING maupun produksi yang dimodifikasi atau dibuat; tidak ada Fonnte/Mayar, pembayaran, mutasi, atau deployment GAS. **Tahap 1 tetap NO-GO**.

## 16 November — rekonsiliasi ledger diperketat

Audit lintas sumber atas `RegistrationRecoveryPreflight.gs` menunjukkan verifikasi GRANT awal belum mencakup nominal/status/duplikasi. Source-only audit ditingkatkan untuk menandai nilai GRANT yang berbeda dari kebijakan kini, unposted, orphan, duplikasi GRANT dan duplikasi kunci `kredit_awal`. Keputusan perbaikan tetap manual setelah review riwayat; **audit tidak mengubah saldo**. Dokumen rinci: [Registration Recovery Preflight](REGISTRATION_RECOVERY_PREFLIGHT_2026-11-16.md). Data sumber yang dibaca langsung bersifat terbatas, bukan seluruh rekonsiliasi runtime; Script Properties, akun dan ledger tidak disentuh.

## 16 November — pemulihan backup dan manifest runtime

- **Restore rehearsal file-level PASS:** salinan terisolasi dari backup STAGING 15 November berhasil dibuat di folder privat yang sama; akses owner-only, shared=false; 29/29 nama tab dan header identik, 9/9 jumlah record operasional cocok, dan formula sel `members!AG2:AI3` identik. **Bukan** uji restore aplikasi end-to-end; tidak ada perubahan database aktif. [Detail](RESTORE_REHEARSAL_2026-11-16.md).
- **Source inventory:** 15 file `.gs` ada dalam repository. Manifest blob SHA tersedia di `contracts/gas-runtime-source-manifest-2026-11-16.json` dan [runbook](GAS_RUNTIME_SYNC_MANIFEST_2026-11-16.md). Tidak ada bukti seluruh modul GAS di editor sama dengan GitHub; hanya dua fungsi preflight lama yang sudah pernah dijalankan oleh owner.
- **Regression terbaru:** [405/405 sukses](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43787152837) pada source commit `a4e20065ab9f385c2a90a3c41e5d3492fb893c71`. Workflow GitHub Pages sempat menerima HTTP 502 (server GitHub, bukan build), lalu **rerun deploy sukses** pada [run 43787152151](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43787152151).
- Yang tersisa: auth/GAS runtime diff, rekonsiliasi kredit yang bisa diaudit, uji session end-to-end serta recovery aplikasi penuh. Semua sakelar provider, registration, finance tetap OFF.

## 16 November — validasi sesi gagal-tertutup (source-only)

Audit `session_` menemukan kondisi kode lama yang keliru: `new Date(expires_at).getTime() <= Date.now()` bernilai **false** untuk tanggal rusak (NaN), sehingga sesi yang tidak memiliki expiry valid berpotensi diterima; `findRows_[0]` juga menerima hash sesi duplikat; dan perubahan peran anggota tidak dibandingkan dengan peran pada sesi yang diterbitkan. `Code.gs` diperkuat agar:
- jumlah baris untuk hash token **tepat satu**;
- `expires_at` harus menjadi timestamp valid dan belum kedaluwarsa;
- identitas member harus unik, status `AKTIF`, dan `role` pada sesi sama dengan peran akun saat ini;
- jika tidak memenuhi syarat, akses ditolak dan pengguna diminta login ulang, tanpa membocorkan token.
Pengujian regresi sintetis ditambahkan untuk expiry kosong/rusak, hash duplikat, perubahan peran, dan ID anggota ganda. Ini hanya pengamanan **source GitHub** dan belum mengubah atau mencabut sesi apa pun pada Apps Script/database aktif. Sebelum menyalin `Code.gs` ke editor, wajib backup/diff, review kompatibilitas sesi lama, dan uji STAGING.

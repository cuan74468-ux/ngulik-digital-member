# Gerbang Operasional — Rekonsiliasi Source GitHub dan Apps Script STAGING
**Tanggal:** 16 November 2026 (WIB)  
**Proyek:** Ngulik Digital Member · **Tahap:** 1 / PROSES / NO-GO  
**Jenis:** bukti audit dan langkah operator; **tidak mengeksekusi mutasi**.

## 1. Fakta yang diverifikasi dari connector pada 16 November
- Branch `main` saat pemeriksaan menunjuk ke `2d6aceec8152a9a43822fc8c82f63478b6823cd9` (commit dokumentasi). Baseline patch autentikasi yang diuji: `1cd335e47cd5ff61ec1482e3e6976b83b8501177`.
- GitHub Actions [run 43797282501](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43797282501): job `tests` menyelesaikan langkah regresi Node dan Chrome dengan `conclusion=success`; laporan tes baseline menyatakan **443/443**.
- Source repository menyimpan 15 modul `.gs`, `apps-script/appsscript.json`, dan manifest `contracts/gas-runtime-source-manifest-2026-11-16.json`. Manifest berlaku **hanya bagi GitHub source**.
- Google Sheets STAGING yang teridentifikasi: [STAGING Ngulik Digital - Migrasi 27 Tab - 15 November 2026](https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit), berisi **29 tab** menurut spreadsheet metadata. Nama file mengandung sejarah migrasi 27 tab; tidak menandakan skema saat ini hanya 27 tab.
- Peta kendali Drive menunjukkan spreadsheet STAGING aktif tersimpan di dalam folder `99_STAGING_BACKUP_DAN_HAPUS`; **nama folder bukan izin hapus/pindah**.
- Mandat produksi menegaskan platform komersial nyata; pengujian STAGING bukan izin mengaktifkan pendaftaran, pembayaran, kredit, provider atau fitur komersial.
- **Belum terbukti:** kesetaraan file sumber dengan editor Apps Script STAGING, `NGD_DB_ID` runtime, isi Script Properties, deployment GAS yang melayani publik, dan hasil `ngdRegistrationRecoveryPreflightReadOnly` pada STAGING.

## 2. Daftar modul GitHub untuk inventaris editor (15)
`AdminAccess.gs`, `Catalog.gs`, `Code.gs`, `Content.gs`, `DataIntegrityPreflight.gs`, `Diagnostics.gs`, `InfrastructurePreflight.gs`, `LMS.gs`, `Notifications.gs`, `OtpAuth.gs`, `RegistrationRecoveryPreflight.gs`, `SchemaUpgrade.gs`, `Services.gs`, `StagingOtpDiagnostics.gs`, `Support.gs`.

Untuk setiap modul: tandai **ada / tidak ada / versi berbeda / belum diverifikasi**. Bandingkan isi, deklarasi fungsi dan dependensi pada *runtime* editor; jangan menyamakan Git blob SHA dengan Apps Script revision. `appsscript.json` juga perlu dibaca terpisah.

## 3. Langkah operator pra-patch (hanya baca dan backup)
1. Buka [editor GAS STAGING](https://script.google.com/u/0/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit). Verifikasi judul dan identitas proyek. **Jangan membuka editor PRODUCTION untuk patch**.
2. Ekspor/salin **semua** source saat ini dan `appsscript.json` sebagai backup privat, serta catat versi deployment yang sedang aktif. Jangan menaruh Script Properties, token, PIN, OTP, atau data anggota dalam GitHub atau laporan publik.
3. Di Script Properties, verifikasi secara visual `NGD_ENVIRONMENT=STAGING` dan bahwa `NGD_DB_ID` menunjuk ke spreadsheet STAGING yang benar. Jangan menyalin nilai ID/secret ke log publik; cukup laporkan `identity_match=true/false`.
4. Bandingkan `Code.gs`, `OtpAuth.gs`, `AdminAccess.gs`, `RegistrationRecoveryPreflight.gs` serta modul lainnya dengan [manifest](../contracts/gas-runtime-source-manifest-2026-11-16.json) dan [handoff patch](STAGE1_AUTH_PATCH_HANDOFF_2026-11-16.md). Catat perbedaan per fungsi. **STOP** bila file runtime belum dapat dicadangkan atau diff belum jelas.
5. Pertahankan flag `NGD_PIN_HASH_V2_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, `NGD_MUTATIONS_ENABLED`, `NGD_FINANCE_ENABLED` dan `NGD_EXTERNAL_PROVIDERS_ENABLED` tetap OFF. Jangan menjalankan tes mutasi yang mensyaratkan mengaktifkan flag pada STAGING aktif.

## 4. Gerbang patch minimum
- **G1 — Identitas dan pemulihan:** backup source editor lengkap, target STAGING cocok, versi rollback tercatat.
- **G2 — Diff:** 15 modul telah diinventaris, seluruh perubahan runtime diketahui; patch per fungsi direview; tidak ada overwrite `Code.gs` secara utuh tanpa diff.
- **G3 — Pengujian terisolasi:** di clone/editor QA tanpa pengguna nyata, uji OTP expiry invalid/expired, attempts invalid, identitas WA duplikat, sesi invalid/expired/duplikat, logout, rotasi PIN, append fail, OTP commit fail, GRANT fail dan sesi fail. Verifikasi login legacy V1 tetap kompatibel; V2 tetap OFF.
- **G4 — Audit baca-saja:** hanya setelah persyaratan fungsi editor tersedia, jalankan `ngdRegistrationRecoveryPreflightReadOnly` di STAGING; bagikan **hanya** ringkasan kategori/jumlah, `writes=false`, identitas lingkungan dan `starter_policy`, tanpa identitas anggota. Temuan bukan izin memperbaiki data.
- **G5 — Persetujuan rilis:** patch STAGING/deployment dan aktivasi apa pun tetap memerlukan persetujuan khusus pemilik setelah bukti G1–G4 tersedia. Jika gagal, rollback **kode** ke source editor yang dibackup, tidak merekayasa saldo/OTP.

## 5. Template laporan hasil (tanpa data sensitif)
```text
NGD_STAGE1_RUNTIME_ALIGNMENT
environment=STAGING
gas_project_identity_verified=[true|false]
spreadsheet_identity_match=[true|false]
editor_source_backup_verified=[true|false]
deployment_rollback_recorded=[true|false]
modules_present=[0..15]
modules_compared=[0..15]
modules_different=[count]
runtime_patch_applied=false
isolated_auth_qa=[NOT_RUN|PASS|FAIL]
registration_recovery_preflight=[NOT_RUN|REVIEW_REQUIRED|PASS]
registration_enabled=false
finance_enabled=false
external_providers_enabled=false
go_live=NO_GO
```

## 6. Batas bukti
Pembacaan connector Google Drive atas struktur Sheets tidak membuktikan `getValues()`, Script Properties, atau fungsi di editor GAS. Tes sumber dan Chrome tidak memvalidasi alur WhatsApp sungguhan, sinkronisasi GAS, aplikasi Android fisik, maupun transaksi riil. Setelah bukti runtime tersedia, lanjutkan checkpoint [Tahap 1](CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md) tanpa mengubah keputusan harga, starter kredit, kebijakan komisi, atau ledger.

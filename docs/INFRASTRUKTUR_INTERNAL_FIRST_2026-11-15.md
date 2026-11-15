# NGULIK DIGITAL — FONDASI INTERNAL DULU, INTEGRASI EKSTERNAL TERAKHIR

Keputusan Owner: 15 November 2026. Status: rencana kesiapan teknis dan hasil implementasi source, BUKAN persetujuan rilis.

## Prinsip dan batasan

Produk ini membership komersial nyata. Owner memutuskan akun Fonnte dan penyedia lain dibuat pada tahap akhir, setelah infrastruktur internal siap. Ini mengubah urutan persiapan teknis, tetapi TIDAK memindahkan milestone bisnis Tahap 2–6 lebih awal. Master Index dan Mandat Produksi tetap mengendalikan keputusan fitur dan rilis.

Frontend publik GitHub Pages terpisah dari admin STAGING. Database STAGING 29 tab terpisah dari DB utama. Tidak ada reset, hapus baris, migrasi database produksi, perubahan harga, aktivasi pendaftaran, atau pengiriman provider selama persiapan.

## Urutan kerja infrastruktur

1. Pemeriksaan fondasi: repo, database 29 tab, identitas server STAGING, endpoint, pengamanan flags, backup, CI, tata kelola keputusan.
2. Logika internal: autentikasi PIN/sesi, OTP hash dan bukti kepemilikan, LMS, kurikulum dan workspace, katalog, ledger kredit, rekonsiliasi, order, dukungan, notifikasi internal dan audit. Siapkan source, bukan transaksi aktif.
3. QA tanpa provider: unit/VM tests, error handling, replay, double submission, rate limiting, simulasi timeout dan rollback di fixture terisolasi, Chrome desktop/mobile, pembacaan data STAGING tanpa mutasi.
4. Operasional: inventaris data dan persetujuan privasi, kebijakan retensi, backup/restore drill terisolasi, migration checklist, alarm yang bebas biaya, runbook insiden, audit log dan akses operator.
5. Last-mile provider: owner membuat dan memilih akun, menyetujui biaya dan data, mengisi secret langsung dalam Script Properties, uji STAGING berizin, review release gate per layanan, baru keputusan GO/NO-GO.

## Pemeriksaan terpadu read-only

File baru apps-script/InfrastructurePreflight.gs berisi fungsi ngdInfrastructurePreflightReadOnly(). Hanya dijalankan oleh owner dari editor Google Apps Script STAGING; tidak ditambahkan ke endpoint publik.

Fungsi mengecek environment STAGING, identitas database terkonfirmasi di 3 Script Properties, sakelar mutasi/recovery/migrasi tetap OFF, serta header 27 tabel inti ditambah 2 tabel OTP dan WA. Kolom tambahan dipertahankan. Bukti verifikasi pada members (wa_verified dan wa_verified_at) diwajibkan. Tidak membaca data anggota, hash sesi, saldo, PIN, atau API key; tidak membuat tab atau memanggil vendor.

Pesan sukses yang diharapkan: NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables=29 | environment=STAGING | writes=false | providers=DEFERRED.

Kegagalan preflight bukan izin mereset data. Baca kode kesalahan dan cocokkan source STAGING dengan kode GitHub yang diaudit. Source GitHub tidak otomatis men-deploy GAS; perubahan ini masih SOURCE-ONLY sampai editor STAGING diselaraskan dengan backup dan versioning.

## Kontrak integrasi akhir (tanpa akun sekarang)

Registry contracts/provider-readiness.json adalah dokumen JSON non-eksekutabel. Ia merinci tanggung jawab dan pembuktian yang diperlukan ketika owner nanti membuat akun provider. Tidak ada endpoint provider, API key, token, atau kredensial dalam registry.

| Layanan | Kondisi sekarang | Bukti wajib saat integrasi |
|---|---|---|
| WhatsApp OTP (calon Fonnte) | Deferred | Consent, hash OTP, TTL 5 menit, 3 kali salah, batas biaya, anti-replay, verifikasi penerimaan dan single starter grant |
| Payment (calon Mayar/alternatif) | Deferred | Akun merchant, verifikasi event resmi, idempotensi webhook, satu sumber wallet, reconciliation, refund/timeout, approval pemilik |
| Provider AI | Deferred | API key server-only, harga dan limit biaya, debit ledger server-side, replay, timeout dan kompensasi |
| Notifikasi eksternal | Deferred | Consent, template, deduplication, delivery proof, retry ceiling, privasi dan opsi nonaktif |

Jangan membuat webhook pembayaran berdasarkan contoh usang hanya dengan token pada URL. Mekanisme validasi event nyata harus dipastikan dari dokumentasi resmi provider setelah akun dipilih; jangan mengarang header/payload atau menganggap accepted sebagai delivered.

## Kondisi LMS dan membership

Enam modul komunitas Chapter 01 sudah ada di Google Docs dan program dasar gratis via Classroom, tidak sama dengan kursus native LMS berbayar yang masih kosong. Jangan impor tracker komunitas atau mengubah akses tanpa izin. Kredit awal 10 berdasarkan mandat membutuhkan satu bukti WhatsApp terverifikasi dan pencatatan ledger tunggal agar tak bisa digandakan.

## Gate internal sebelum akun pihak ketiga

- [ ] Fungsi read-only 29/29 lulus pada Apps Script STAGING setelah source dan deployment dibandingkan.
- [ ] Login/logout/revoke sesi admin dan member diuji, termasuk dua perangkat; jangan kirim PIN/OTP di chat.
- [ ] Pengamanan registrasi OTP berjalan tanpa membutuhkan nomor sungguhan pada fixture, plus batas percobaan dan anti-replay.
- [ ] Audit idempotensi dan pemulihan parsial untuk ledger/fulfillment ditinjau (belum menjamin transaksi multi-sheet ACID).
- [ ] CI pada SHA final lulus, GitHub Pages berhasil dan Chrome mobile/desktop tidak overflow.
- [ ] Privasi, retensi, backup, restore drill dan batas biaya vendor disepakati.
- [ ] Persetujuan bisnis untuk entitlement LMS dan pemisahan Chapter 01 gratis dari layanan berbayar dicatat.
- [ ] Pemilihan provider terakhir dan aktivasi dilakukan satu per satu hanya setelah approval eksplisit Owner.

## Rollback

Revert commit source frontend jika terjadi regresi. Untuk GAS, gunakan deployment STAGING versi lama yang sudah dicatat; jangan mengganti seluruh Code.gs sembarangan. Tidak ada perubahan database dalam pekerjaan ini; jika perlu pemulihan, gunakan cadangan terverifikasi dan audit sebelum tindakan.

Status: fondasi mulai dipersiapkan; layanan eksternal belum dihubungkan. Tahap 1 masih PROSES dan monetisasi publik NO-GO.

## Pengaman tambahan setelah checkpoint pertama

- Source OtpAuth.gs kini membutuhkan NGD_EXTERNAL_PROVIDERS_ENABLED=true sebagai sakelar terpisah untuk setiap pemanggilan provider OTP. Selama fase persiapan sakelar tersebut tetap false atau tidak disetel.
- Source ngdStagingWorkspaceReadOnlyCheck dan ngdOtpStagingPreflight menolak aktivasi provider global; ini pengamanan source-only dan tidak berarti versi GAS aktif otomatis sudah sama.
- Tests/backend-otp-module, tests/infrastructure-preflight, tests/backend-staging-attestation dan tests/staging-otp-preflight mencakup penolakan provider sebelum biaya jaringan/penulisan.
- Dashboard admin STAGING lama tetap bisa digunakan untuk fungsi yang telah diverifikasi, karena sakelar provider tidak disyaratkan untuk login admin terisolasi.

## Panduan operator browser-first tanpa akun vendor

1. Buka repository GitHub dan periksa commit serta GitHub Actions terakhir; jangan menyimpulkan source berhasil diterapkan ke Apps Script sebelum melihat versi runtime.
2. Masuk editor Google Apps Script STAGING yang telah terhubung, bukan editor produksi. Simpan cadangan kode Apps Script terlebih dahulu (minimal salin file sebelum perubahan); jangan menimpa berkas yang sedang aktif secara membabi buta.
3. Cocokkan Code.gs, Diagnostics.gs dan StagingOtpDiagnostics.gs dengan source GitHub. Tambahkan file baru bernama InfrastructurePreflight.gs hanya setelah membandingkan source dan memastikan tidak ada nama fungsi duplikat. Jangan mengganti seluruh proyek secara otomatis.
4. Pastikan NGD_ENVIRONMENT=STAGING; NGD_DB_ID dan NGD_ADMIN_LOGIN_DB_ID menunjuk database STAGING yang sama. NGD_OTP_STAGING_DB_ID boleh belum diisi selama provider-last dan seluruh sakelar OTP/registrasi/provider OFF; bila diisi, nilainya wajib sama dengan database STAGING. Jangan kirim nilai properti melalui chat. Ini bukan izin untuk mengubah Script Properties tanpa pemeriksaan.
5. Jalankan ngdInfrastructurePreflightReadOnly dari editor. Bila muncul NGD_INFRASTRUCTURE_PREFLIGHT_OK dengan tables=29 dan providers=DEFERRED, pemeriksaan sumber dan skema lulus. Jika gagal, hentikan dan laporkan hanya kode error (bukan data PII).
6. Sebelum menerbitkan New version deployment STAGING, uji dokumentasi rollback dan verifikasi semua fungsi login/read-only tidak terganggu. Jangan aktifkan operator recover, schema migration, OTP send atau finance.
7. Lanjutkan tes mekanisme internal dan QA Android/Windows. Provider eksternal terakhir ketika semua gate siap dan owner memberi persetujuan eksplisit.

### Arti kesalahan preflight umum

| Kode | Penanganan aman |
|---|---|
| INFRA_NOT_STAGING | Anda berada pada proyek/Script Properties yang salah; jangan menjalankan lagi di produksi. |
| INFRA_DB_ID_MISSING / INFRA_ADMIN_DB_MISMATCH | Database utama wajib terisi dan sama dengan penanda admin STAGING; jangan mengubah Script Properties tanpa memastikan proyek dan sheet yang benar. |
| INFRA_OTP_DB_MISMATCH | Bila properti OTP sudah disetel, nilainya harus sama dengan database STAGING. Bila belum disetel, tetap aman selama seluruh sakelar OTP/registrasi/provider OFF. |
| INFRA_FLAG_NOT_DISABLED | Ada sakelar aktif/tidak valid; hentikan dan audit sebelum pemeriksaan berikut. |
| INFRA_TAB_MISSING | Jangan menciptakan tab mendadak. Periksa salinan database dan mandat skema. |
| INFRA_COLUMNS_MISSING / INFRA_HEADER_INVALID | Jangan mengganti header yang sudah terisi; audit dampak dahulu. |

### Status yang masih perlu dibuktikan

- Pemulihan sesi dan revoke login pada perangkat nyata, bukan sekadar render browser.
- Pengujian restore cadangan pada spreadsheet salinan terisolasi.
- Idempotensi multi-sheet credit/fulfillment pada kondisi gagal parsial.
- Perangkat Android/Windows nyata dan aturan persetujuan data pribadi.
- Integrasi Fonnte, payment, AI, serta notifikasi (semuanya menunggu akun provider saat tahap akhir).

## Checkpoint verifikasi langsung — 15 November 2026

Setelah penambahan pengaman global, audit STAGING melalui Google Sheets dilakukan secara READ ONLY terhadap semua tab. Seluruh 29 tab terverifikasi memiliki semua kolom wajib menurut NGD.HEADERS dan dua kontrak OTP; tidak ditemukan nama kolom duplikat. Kolom tambahan pada orders dan katalog_produk dipertahankan, bukan dikategorikan sebagai error.

GitHub Actions final untuk source code pada commit 4600eb5692b06707e05d5c59b708580384d05fe1: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43719240002 — hasil success, 343 dari 343 tes Node lulus, Chrome UI desktop/mobile lulus dan browser read-only POST ke GAS lulus. GitHub Pages deploy pada commit yang sama juga success: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43719239761 .

Catatan penting: 29/29 header cocok melalui konektor Sheets dan 343/343 tes source tidak sama dengan telah menjalankan fungsi baru pada Apps Script STAGING. Rilis source sekarang belum mengaktifkan akun vendor. Jangan melanjutkan ke provider sampai checklist internal yang tersisa terbukti.


## Audit integritas data internal — source tambahan

Source `apps-script/DataIntegrityPreflight.gs` sekarang memiliki fungsi **`ngdDataIntegrityPreflightReadOnly()`**. Ini hanya untuk editor Apps Script STAGING, memerlukan lulus `ngdInfrastructurePreflightReadOnly()` dahulu, dan tidak terdaftar sebagai rute API publik.

Cakupan awal (8 tabel prioritas): `members`, `sessions`, `credits_ledger`, `orders`, `lms_courses`, `lms_lessons`, `lms_enrollments`, `otp_verifications`. Audit memeriksa duplikasi ID dan nomor WA (menganggap 08 dan 62 ekuivalen), sesi/pesanan/kredit tanpa pemilik, satu kali grant awal, keanggotaan yang belum diverifikasi, serta relasi kursus/pelajaran/enrollment yang tidak valid. Semua hasil berupa **jumlah temuan**; tidak memuat data anggota, PIN, nilai hash sesi atau OTP. Audit menolak lingkungan produksi serta menolak pemindaian tabel berisi lebih dari 2.000 baris, bukan melakukan perubahan massal.

Fungsi ini tidak berusaha memperbaiki data dan tidak menulis baris. Pengujian ada pada `tests/data-integrity-preflight.test.cjs`; mock memakai data sintetis secara offline. **Integritas isi data nyata belum dinyatakan lulus sebelum fungsi dijalankan pada runtime STAGING yang sudah dicadangkan dan diverifikasi.**

Urutan eksekusi yang aman saat operator tersedia:
1. Buka [editor Apps Script STAGING](https://script.google.com/u/0/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit), dan cadangkan semua source GAS sebelum memasang perubahan. Pastikan bukan proyek produksi.
2. Bandingkan file yang sudah ada, jangan menimpa `Code.gs` atau file lain secara menyeluruh. Tambahkan satu file baru `InfrastructurePreflight.gs` dari GitHub jika belum tersedia, kemudian `DataIntegrityPreflight.gs`. Jika salah satu sudah ada, cocokkan diff lebih dulu.
3. Biarkan semua flag mutasi, finansial, registrasi, LMS, OTP, dan `NGD_EXTERNAL_PROVIDERS_ENABLED` OFF. Jangan masukkan API key atau credentials provider.
4. Jalankan `ngdInfrastructurePreflightReadOnly`. Sukses: `NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables=29 | environment=STAGING | writes=false | providers=DEFERRED`.
5. Jalankan `ngdDataIntegrityPreflightReadOnly`. Hasil: `NGD_DATA_INTEGRITY_OK` atau `NGD_DATA_INTEGRITY_REVIEW_REQUIRED` dengan **kategori + jumlah masalah saja**.
6. Jika error: hentikan, simpan kode error dan tangani lewat audit terpisah. **Jangan** mengaktifkan sakelar, menghapus sesi, memperbaiki ledger, atau menyunting tab secara manual.
7. Fungsi owner-only ini tidak perlu dipublikasikan lewat `doPost`; menjalankannya dari editor tidak mengharuskan mengganti URL /exec. Perubahan kode Web App tetap membutuhkan proses versi dan rollback terpisah.

Keputusan operasional: jangan menganggap angka 29/29 pada pemeriksaan header sama dengan audit relasi data. Kedua bukti harus dicatat terpisah sebelum membuka registrasi.

 
## Snapshot privat STAGING dan audit isi data — 15 November 2026

Owner telah memperoleh **salinan baru STAGING** bernama `BACKUP STAGING NGD 29 TAB - 15 November 2026 - Sebelum Audit Integritas` melalui Google Drive Copy. Salinan ditempatkan di folder yang sama dengan database STAGING aktif, `99_STAGING_BACKUP_DAN_HAPUS`. Identitas file salinan **sengaja tidak dicantumkan di repo GitHub publik**. Metadata hasil pemeriksaan: permission hanya `owner`, `shared=false`, 29 tab lengkap. Sembilan tabel operasional (`members`, `sessions`, `credits_ledger`, `orders`, `otp_verifications`, `wa_notifications`, `lms_courses`, `audit_logs`, `katalog_produk`) memiliki jumlah record yang cocok antara asal dan copy. Operasi ini **tidak mengubah spreadsheet aktif**.

Audit baca-saja tambahan langsung melalui konektor Google Sheets pada delapan tab prioritas (`members`, `sessions`, `credits_ledger`, `orders`, `lms_courses`, `lms_lessons`, `lms_enrollments`, `otp_verifications`) hanya memeriksa baris dengan kolom A terisi sampai baris 500, dan menemukan **0 dari 14 kategori masalah**: duplikasi identitas/WA/token, member yang belum terverifikasi, sesi/pesanan/kredit tanpa anggota, double starter grant, serta relasi LMS/OTP yang tidak valid. Saat audit ada 1 akun ADMIN, 1 sesi, dan nol record pada enam tab lain yang dipilih.

**Keterbatasan:** ini adalah verifikasi snapshot dan baca relasi data subset, **bukan** pembuktian restore file, bukan uji keamanan token admin live, bukan verifikasi 50 peserta, bukan database transaction consistency, bukan QA provider. Backup belum direstorasi di lingkungan terisolasi. Kriteria GO tetap tertahan.

File `apps-script/DataIntegrityPreflight.gs` memiliki pemeriksaan editor-only yang dapat dijalankan ulang setelah source runtime GAS STAGING disejajarkan; tidak perlu membuat akun Fonnte, Mayar, atau provider AI untuk melakukannya. **Jangan menempel kredensial maupun nomor WA ke chat.**


### Koreksi preflight — 15 November 2026, log pukul 21.27 WIB

Operator melaporkan `INFRA_DB_ATTESTATION_REQUIRED` saat menjalankan `ngdDataIntegrityPreflightReadOnly` yang memanggil `ngdInfrastructurePreflightReadOnly`. Source pemeriksaan infrastruktur sebelumnya lebih ketat daripada `ngdStagingWorkspaceInfo_` yang sudah lulus attestation: `NGD_OTP_STAGING_DB_ID` yang kosong ditolak, padahal akun Fonnte dan OTP memang ditunda.

Perbaikan source: penanda DB utama dan admin **tetap wajib cocok**, sementara penanda OTP **boleh kosong** selama integrasi belum aktif; bila diisi harus cocok. Kesalahan sekarang dibedakan menjadi `INFRA_DB_ID_MISSING`, `INFRA_ADMIN_DB_MISMATCH`, dan `INFRA_OTP_DB_MISMATCH` tanpa membocorkan ID. `NGD_EXTERNAL_PROVIDERS_ENABLED` dan semua write flags tetap wajib OFF. Tes regresi mencakup keempat kasus beserta jaminan nol mutasi. Source berubah **hanya di GitHub**; operator perlu mengganti isi `InfrastructurePreflight.gs` STAGING dengan versi terbaru setelah memeriksa bahwa file tersebut merupakan salinan patch lama. Tidak perlu mengubah `Code.gs`, `DataIntegrityPreflight.gs`, Script Properties, maupun deployment Web App untuk mengeksekusi fungsi owner-only editor ini.


### Koreksi audit integritas — 15 November 2026, pukul 21.34 WIB

Fungsi `ngdDataIntegrityPreflightReadOnly()` awal melaporkan `missing_member_identifier:1,missing_whatsapp:1`. Pembacaan langsung **baca-saja** terhadap rentang `members!A1:AI10` pada STAGING aktif **dan snapshot privat** menunjukkan baris 2 tanpa nilai sel di seluruh kolom, sedangkan baris 3 mengandung satu akun ADMIN dengan pengenal dan WA yang terisi. Ini adalah indikasi kuat **false positive akibat baris sela kosong**, bukan bukti anggota hilang.

Source `DataIntegrityPreflight.gs` diperbaiki agar sebelum melewati kandidat kosong, ia memeriksa semua kolom fisik beserta rumus (getValues + getFormulas); hanya baris yang benar-benar kosong yang diabaikan. Baris parsial dengan nama/nilai di kolom lain atau formula tetap diaudit dan tetap memunculkan laporan kehilangan identitas. Pembacaan baris kosong yang berurutan dibatch, tanpa menghapus baris atau menulis spreadsheet. Tes regresi mencakup baris sela kosong, baris parsial, formula-only, dan beberapa baris sela berurutan.

Tindakan operator: setelah hasil GitHub Actions lulus, perbarui **hanya file** `DataIntegrityPreflight.gs` pada editor Apps Script STAGING dengan versi terbaru setelah menyimpan salinan file lama. **Jangan hapus baris 2, jangan ubah Script Properties, `Code.gs`, `InfrastructurePreflight.gs`, atau deployment Web App.** Jalankan ulang `ngdDataIntegrityPreflightReadOnly`; keberhasilan harus diambil dari log runtime, bukan hanya dari tes offline.

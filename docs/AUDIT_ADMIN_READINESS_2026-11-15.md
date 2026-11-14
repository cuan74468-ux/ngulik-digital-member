# Ngulik Digital — Audit Admin & Rencana Pemulihan Modul
Tanggal: 15 November 2026 (WIB)
Lingkup: repository `main`, konfigurasi frontend, skema Google Sheets produksi (baca-saja), dan API yang diverifikasi pengguna.

## Status terbukti
- Operator berhasil masuk ke panel admin; sesi ADMIN M-0001 terlihat di Sheets.
- API publik /exec mengembalikan `version: 1.0.2`, `writes_enabled:false`, `payments_enabled:false` pada pemeriksaan terakhir.
- Backend GitHub di `apps-script/Code.gs` berlabel `1.0.3` dan skema 27 tabel. **Bukan bukti** bahwa versi itu sudah diterapkan pada Apps Script.
- `config.js`: `adminLoginEnabled:true`. `memberWritesEnabled`, `paymentsEnabled`, `contentEnabled`, `catalogEnabled`, `serviceEnabled`, `supportEnabled`, `notificationsEnabled`, dan `lmsEnabled` masih false.
- Database produksi memiliki 16 tab. Sebanyak 14 adalah bagian skema aplikasi; dua tambahan bernama `otp_verifications` dan `wa_notifications`. Jangan hapus tab tambahan ini.

## Ketidaklengkapan skema versi 1.0.3
13 tabel yang **belum ada** dalam database produksi:

| Modul | Tabel yang hilang | Dampak |
| --- | --- | --- |
| Support/Member 360 | `support_tickets`, `ticket_activities`, `product_releases` | Tiket, aktivitas dan rilis belum bisa dibaca/disimpan secara normal |
| LMS | `lms_courses`, `lms_lessons`, `lms_enrollments`, `lms_progress`, `lms_workspaces`, `lms_ai_jobs`, `lms_revisions` | CRUD kursus/pelajaran, workspace otomatis, progres, dan antrean AI belum siap |
| Notifikasi | `notifications` | Kotak masuk/notifikasi belum siap |
| Jasa | `service_requests` | Brief dan penawaran jasa belum siap |
| Konten | `site_content` | Banner, media, CTA, penjadwalan konten belum siap |

Existing tables `members`, `katalog_produk`, dan `orders` memiliki ekstensi kolom sah.
Ke-14 tabel aplikasi yang sudah ada memiliki semua kolom wajib, tanpa duplikasi nama kolom yang teramati.
**Jangan** menimpa baris header agar sama persis dengan template: itu bisa merusak pemetaan WA/verifikasi dan gateway.

## Penghambat alur operasional
| Area admin | Backend | Frontend | Status |
| --- | --- | --- | --- |
| Login admin | Autentikasi terisolasi, aktif | Aktif | Terverifikasi berhasil oleh operator |
| Pengaturan sistem | `adminGetSettings` tersedia di source | Viewer baca-saja ditambahkan | Pembacaan situs perlu diuji; `adminUpdateSetting` masih terhalang mutasi umum |
| Produk | `adminListCatalog` tersedia, editor membutuhkan gerbang mutasi + katalog | Editor terkunci | Belum diaktifkan |
| Konten visual | Perlu `site_content` dan `Content.gs` | Editor terkunci | Diblokir tabel + feature gates |
| LMS | Perlu 7 tabel LMS dan `LMS.gs` | Editor terkunci | Diblokir tabel + feature gates |
| Bantuan/member 360 | Perlu 3 tabel support dan `Support.gs` | Form terkunci / pembacaan bisa gagal | Diblokir tabel + feature gates |
| Jasa | Perlu `service_requests` dan `Services.gs` | Form terkunci | Diblokir tabel + feature gates |
| Notifikasi | Perlu `notifications`, `Notifications.gs` | Terkunci | Diblokir tabel + feature gates |
| Pesanan/keuangan | Skema `orders` ada | Pembayaran terkunci, QRIS belum dikonfigurasi | Sengaja ditahan sampai verifikasi bukti, settlement, refund, idempotensi |
| Member baru | Gerbang registrasi dan mutasi umum masih off | Pendaftaran belum aktif | Jangan aktifkan sebelum QA keamanan |

## Perubahan kode yang sudah diterapkan di GitHub main
1. `js/app.js`: halaman `#pengaturan` untuk membaca nilai pengaturan yang aman dan status kesiapan tanpa memodifikasi data.
2. `js/app.js`: katalog publik hanya bersumber dari API aktif. Fallback produk/harga contoh dihapus untuk mencegah informasi salah.
3. `apps-script/Code.gs`: `inspectDatabaseSetup` dan `adminRuntimeStatus_` membaca kolom wajib berdasarkan nama; kolom ekstra tidak dianggap kerusakan.
4. `apps-script/Diagnostics.gs`: pemeriksaan kolom wajib dan duplikat, tanpa asumsi posisi kolom identik.
5. `apps-script/AdminAccess.gs`: diselaraskan dengan versi pemulihan PIN modal v2 yang sebelumnya berhasil digunakan operator, tanpa PIN dalam log.
6. `apps-script/SchemaUpgrade.gs`: `ngdSchemaUpgradePreviewOwnerOnly` (baca-saja) serta `ngdSchemaUpgradeMissingTabsOwnerOnly` (migrasi opt-in, idempotent, dengan gerbang pemilik, backup, target DB, UI, dan lock). **Tidak dijalankan ke database produksi**.
7. `index.html`: cache-busting untuk script frontend terbaru.

## Aturan release (harus dipatuhi)
1. Buat **backup produksi baru setelah pemulihan PIN**, dan simpan salinan source Apps Script aktual. Backup 14 November bukan snapshot terbaru.
2. Cocokkan satu per satu seluruh file Apps Script yang terpasang saat ini dengan source GitHub: `Code.gs`, `AdminAccess.gs`, `Diagnostics.gs`, `LMS.gs`, `Support.gs`, `Content.gs`, `Catalog.gs`, `Services.gs`, `Notifications.gs` serta file migrasi. Google Apps Script menggabungkan fungsi lintas .gs; modul yang belum diinstal menyebabkan `ReferenceError` pada endpoint terkait.
3. Jalankan **hanya** `ngdSchemaUpgradePreviewOwnerOnly` terlebih dahulu. Jangan menjalankan `setupDatabase`, `resetAdminPin`, atau migrasi produksi sebelum salinan backup diperiksa dan disetujui.
4. Lakukan perbaikan skema di staging/salinan terisolasi, verifikasi 27 tabel kompatibel, tidak membuat admin kedua, tidak mengubah baris eksisting.
5. Uji alur admin read-only (settings, daftar produk, dashboard, pencarian member, runtime status). Kemudian uji CRUD dengan data uji di staging: katalog, konten, kursus+workspace otomatis, pelajaran, publish, tiket, jasa, notifikasi; termasuk validasi, konflik versi, idempotensi, audit log, pengarsipan dan rollback.
6. Setelah hasil QA hijau dan persetujuan eksplisit, pasang kode backend pada Apps Script produksi, rilis versi deployment baru, cek endpoint /exec, lalu aktifkan feature flags **per modul**. `NGD_MUTATIONS_ENABLED` adalah gerbang umum; jangan diubah tanpa QA menyeluruh.
7. Pertahankan `NGD_FINANCE_ENABLED=false`, `paymentsEnabled=false`, registrasi publik off sampai verifikasi pembayaran, privasi, anti-penyalahgunaan dan proses operasional selesai.
8. Cek situs Android dan desktop, ulangi login, dan periksa tidak ada regresi.

## Pengujian yang sudah dilakukan
- Membandingkan metadata header 16 tab produksi secara baca-saja dengan `NGD.HEADERS` GitHub 1.0.3.
- Memeriksa sintaks 12 file kode JS/GAS; semua terurai sebagai JavaScript valid.
- Memeriksa ulang konfigurasi GitHub dan komit frontend.
- **Belum** menguji API modul terautentikasi end-to-end, CRUD produksi/staging, atau deployment Apps Script 1.0.3.

## Prioritas dan stop conditions
- P0: akses admin, backup baru, drift kode GAS, penyelarasan skema sebelum CRUD, menjaga gerbang finansial.
- P1: pengaturan operasional, katalog dan konten, LMS lengkap, jasa dan support, fitur admin yang benar-benar bekerja.
- P2: notifikasi, integrasi LLM API, penyempurnaan UI dan laporan.
- **STOP** jika target database berbeda, backup tidak cocok, admin ganda, hash PIN berubah tak terduga, header wajib hilang/duplikat, atau error tidak diketahui. Jangan reset database atau mengulang operasi tidak-idempotent.

## Infrastruktur terverifikasi
- Repo: https://github.com/cuan74468-ux/ngulik-digital-member
- Situs: https://cuan74468-ux.github.io/ngulik-digital-member/
- Database: https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit
- GAS API: https://script.google.com/macros/s/AKfycbyQlhsRDfoHLIHaalBsBos5jJhvPmG3J8B0Al9XrqvUwBQkcnr8uzYRlpcjGlgC_-Xr/exec

Dokumen ini adalah hasil audit source dan skema, bukan sertifikasi siap produksi.

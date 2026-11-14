# Ngulik Digital — Userbase Core: Implementation & Release Runbook

**Tanggal:** 14 November 2026  
**Repository:** cuan74468-ux/ngulik-digital-member, branch `main`  
**Status:** CODE + SCHEMA STAGING, **BUKAN PRODUKSI**. Tidak ada sinkronisasi GAS runtime, pengiriman pesan, penerimaan dana, maupun aktivasi pengguna nyata pada checkpoint ini.

## 1. Tujuan

Membangun fondasi membership reusable, dengan satu sumber kebenaran untuk identitas akun, profil usaha, akses LMS, progres, bantuan, notifikasi internal, dan administrasi. Target teknis tetap **GitHub Pages tanpa build + Google Apps Script + Google Sheets**. Platform transaksi maupun AI tidak boleh dianggap aktif sebelum pengujian integrasi.

### Komponen yang sudah ada dari checkpoint sebelumnya

- Registrasi, login 6-digit PIN, sesi, akun ADMIN/MEMBER, waiting list, suspend/reactivate, kredit dan order di backend.
- Dashboard member/admin, katalog, LMS V1 course/lesson CRUD, workspace otomatis, enrollment, progress berbasis published lesson, draft AI melalui antrean tanpa provider.
- Tiket dukungan, Member 360°, rilis produk dan analisis dampak.
- Release gates terpisah untuk mutasi, pendaftaran, finance, LMS, support serta konfigurasi demo publik.

**Semua di atas belum otomatis terbukti berfungsi dalam Apps Script dan browser produksi** hanya karena source/tes murninya lulus.

## 2. Perubahan yang diterapkan pada checkpoint ini

| Area | Hasil terverifikasi di source/staging | Batasan |
| --- | --- | --- |
| Isolasi database diagnostik | `Diagnostics.gs` mengharuskan Script Property `NGD_DB_ID`; tidak lagi menyimpan ID sumber hardcoded. `diagnosticSchema` membandingkan setiap header 25 tabel. | Tidak dapat memverifikasi Script Properties deployment GAS yang belum dihubungkan. |
| Skema LMS | Tambah `published_version` pada `lms_lessons` dan `lesson_version` pada `lms_progress` di staging privat. | Tidak memindahkan/mengubah data transaksi. |
| Skema Userbase | Tambah tab staging `notifications` dengan 11 header; seluruh 25 tabel cocok dengan `NGD.HEADERS`. | Database utama tetap 14 tab. |
| Notifikasi dalam aplikasi | `Notifications.gs`: inbox terisolasi per member, tandai dibaca, proyeksi aktivitas admin support idempoten dan aman diulang. UI akun membaca inbox bila diaktifkan. | Default OFF; tidak mengirim email/WA. |
| Profil member | `updateMyProfile` mengubah hanya `nama, nama_usaha, jenis_usaha, kota, deskripsi_usaha, instagram` pada member sendiri. Cek role/status, lock, validasi server, audit nama kolom. | Tidak ada perubahan WA login, PIN, role, status, ledger, saldo, hak akses, atau transaksi. |
| QA regresi | Tes tambahan untuk database isolation, notifikasi, profile whitelist. | Node/Chrome CI bukan uji GAS end-to-end. |

### Kontrak notifikasi internal

Tabel `notifications`:  
`notification_id,member_id,source,source_id,jenis,judul,pesan,status,created_at,read_at,request_id`

- Member hanya membaca miliknya sendiri via `getMyNotifications`, maksimal 50 item baru-baru ini.
- `markNotificationRead` menolak notifikasi member lain, replay idempotent.
- `buildSupportNotifications()` adalah fungsi pemroses **manual oleh pemilik script**. Fungsi ini memilih aktivitas admin pada tiket, menyimpan maksimal 25 notifikasi per eksekusi, menghindari duplikasi berdasarkan event ID, dan dapat diulang setelah interupsi.
- Pembaruan tiket **tidak menggantungkan keberhasilannya** pada pengiriman notifikasi. Materi pesannya tidak mencantumkan isi percakapan privat; penerima diarahkan membuka tiket saat login.
- Seluruh fungsi materialisasi menuntut dua flag server: `NGD_MUTATIONS_ENABLED=true` **dan** `NGD_NOTIFICATIONS_ENABLED=true`.
- API penandaan dibaca memerlukan flag sama. Endpoint inbox dibaca tetapi mengembalikan data kosong ketika feature flag OFF.
- **Tidak ada** `MailApp`, `GmailApp`, `UrlFetchApp`, token, webhook, atau panggilan WhatsApp di `Notifications.gs`. Jangan mengatakan email/WA otomatis sudah selesai.

### Batasan profil member

Endpoint `updateMyProfile` mengharuskan token sah dan akun MEMBER berstatus AKTIF; `doPost` juga harus lolos `NGD_MUTATIONS_ENABLED=true`. Backend menolak atribut di luar enam nama kolom di atas. Form profil selalu terkunci saat `demoMode:true` atau API belum terhubung. Perubahan no-op tidak membuat audit berulang. Tetap perlu QA Apps Script untuk konflik multi-perangkat dan kemungkinan kegagalan audit setelah write, karena dua tabel Sheets tidak bersifat atomik.

## 3. Konfigurasi saat ini — jangan ubah sembarangan

| Lokasi | Flag | Keadaan aman |
| --- | --- | --- |
| `config.js` | `apiUrl` | Kosong |
| `config.js` | `demoMode` | `true` |
| `config.js` | `paymentsEnabled` | `false` |
| `config.js` | `supportEnabled` | `false` |
| `config.js` | `lmsEnabled` | `false` |
| `config.js` | `notificationsEnabled` | `false` |
| GAS Script Properties | `NGD_MUTATIONS_ENABLED` | Absent/`false` |
| GAS Script Properties | `NGD_REGISTRATION_ENABLED` | Absent/`false` |
| GAS Script Properties | `NGD_FINANCE_ENABLED` | Absent/`false` |
| GAS Script Properties | `NGD_LMS_ENABLED` | Absent/`false` |
| GAS Script Properties | `NGD_SUPPORT_ENABLED` | Absent/`false` |
| GAS Script Properties | `NGD_NOTIFICATIONS_ENABLED` | Absent/`false` |

`NGD_DB_ID` **wajib** diatur secara privat pada proyek GAS staging sebelum menjalankan diagnostik baru. Jangan pernah commit nilai ini, PIN, token sesi, email privat, atau API key ke repositori publik. Jangan menyalin ulang `Code.gs` ke Apps Script yang terikat database utama.

## 4. Urutan QA pada staging (belum dieksekusi)

1. Verifikasi database staging **berbeda** dari database utama; ambil backup dan pastikan tidak ada data asli/izin berbagi publik. Periksa 25/25 header. Jangan jalankan `setupDatabase()` pada database utama.
2. Buat proyek GAS **terpisah khusus staging** yang memuat `Code.gs`, `Diagnostics.gs`, `LMS.gs`, `Support.gs`, `Notifications.gs`, beserta manifest yang konsisten.
3. Di Script Properties proyek staging, tetapkan `NGD_DB_ID` ke staging **tanpa memasukkannya ke GitHub**. Semua flag tetap OFF. Jalankan `diagnosticDatabase`, `diagnosticSchema`, `diagnosticBackend` (read-only) dan pastikan targetnya staging.
4. Deploy hanya endpoint QA staging dengan kontrol akses yang sesuai; jalankan probe GET/POST publik tanpa token terlebih dahulu. **Jangan** menggunakan login, PIN atau transaksi sebelum transport lintas-origin terbukti. Hapus/isolasi probe sesudah tes.
5. Untuk QA mutasi, gunakan user simulasi dan ubah flag satu per satu **hanya di staging**. Uji registrasi/login/perubahan PIN/logout, profil, isolasi sesi, suspend, LMS draft/publish/enroll/progress/retry, support, proyeksi notifikasi, dan penandaan dibaca.
6. Inject kegagalan setelah penulisan lintas tab, periksa idempotensi dan rekonsiliasi. Catat hasil dengan bukti dan pastikan tidak ada penggandaan kredit/komisi/akses.
7. Uji tampilan pada Android fisik dan Windows desktop, aksesibilitas, XSS, ukuran 375/390/1280 px, serta performa Apps Script dan Google Sheets.
8. Hanya setelah P0 ditutup dan mendapat persetujuan rilis terpisah, putuskan apakah akan mengaktifkan fitur publik dengan rencana rollback dan SOP operator.

## 5. Pengiriman email dan WhatsApp — fase terpisah

Fungsi pengiriman otomatis **belum dibuat dan belum diaktifkan**. Fondasi notifikasi in-app menjadi sumber event yang dapat diproses oleh adaptor eksternal nanti. Persyaratan sebelum implementasi:

- Email: formulir pengumpulan alamat yang diverifikasi, persetujuan komunikasi, preferensi notifikasi dan mekanisme berhenti berlangganan. Skema member sekarang belum memiliki email personal yang terverifikasi.
- Email via Apps Script `MailApp` dibatasi kuota akun; pantau `MailApp.getRemainingDailyQuota()`, batasi batch dan retry. Gunakan antrean serta status `PENDING/SENDING/SENT/FAILED` dengan kunci idempoten, bukan kirim langsung di operasi pembayaran.
- WhatsApp: integrasi resmi/penyedia berizin, template pesan yang disetujui, consent penerima, pembatasan laju, kontrol biaya, serta pencatatan status webhook; jangan memakai script otomasi WhatsApp tidak resmi.
- Jangan menyertakan PIN, token sesi, identitas pribadi sensitif, atau isi tiket lengkap di pesan keluar. Pesan eksternal cukup berisi pemberitahuan netral dan tautan HTTPS yang aman setelah login.

## 6. Blokir menuju produksi

**P0:** bukti nyata GET/POST GitHub Pages–GAS; keamanan PIN 6 digit dan recovery akun; sinkronisasi GAS staging; uji error dan konsistensi transaksi Sheets tanpa ACID; verifikasi dana QRIS/refund/komisi; kontrol privasi dan kebijakan data; performa dan QA perangkat nyata.

**P1:** UX admin operasi dan laporan, pengaturan email/WA resmi dan biaya, jadwal pemrosesan notifikasi, tool provider AI yang terdokumentasi, QA layanan operasional, panduan nonteknis.

**Lingkup tidak dikerjakan pada checkpoint ini:** aktivasi pembayaran, registrasi publik, pengiriman WA/email, AI API live, deployment GAS, perubahan backend production, perubahan Google Sheets utama, maupun perubahan data member asli.

## 7. Verifikasi dan rollback

- Jalankan `node --test tests/*.test.cjs` pada GitHub Actions; periksa run yang berstatus **success** setelah commit terakhir. Jangan menyamakan tes murni dengan layanan live.
- Audit staging header menggunakan `NGD.HEADERS` dan bandingkan nama+urutan header, bukan hanya jumlah tab.
- Bila ada kerusakan preview statis, revert commit aplikasi terakhir pada `main` dan biarkan `config.js` kembali ke flag OFF.
- Bila staging GAS gagal, hentikan deployment staging dan seluruh flag tulis; gunakan backup spreadsheet staging. Jangan menyalin data staging ke database utama.
- Simpan checkpoint QA baru dengan: commit SHA, tautan Actions success, daftar hasil uji browser dan runtime GAS, serta konfirmasi tidak ada tindakan finansial.

## 8. Keputusan rilis

**NO-GO produksi sampai seluruh P0 telah ditutup.** Readiness dapat meningkat secara bertahap tanpa membuka pembayaran ataupun layanan publik prematur.

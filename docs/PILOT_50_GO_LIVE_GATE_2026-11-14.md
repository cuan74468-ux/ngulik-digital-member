# Ngulik Digital — Pilot 50: Go-Live Gate & Operational Runbook

**Tanggal checkpoint:** 14 November 2026  
**Status:** `NO-GO` untuk pendaftaran publik dan pembayaran nyata sampai P0 terbukti.  
**Repo:** `cuan74468-ux/ngulik-digital-member` branch `main`  
**Rencana bisnis sumber:** *Blueprint Monetisasi Terpadu: Linggau AI Studio & Ngulik Digital* dan panduan Mayar/Chapter 1 pada Google Drive.

> Dokumen ini panduan pengujian dan persetujuan pemilik, **bukan bukti bahwa backend sudah dideploy**.

## 1. Konfigurasi release yang sudah diterapkan

| Lapisan | Status terverifikasi di source | Makna |
| --- | --- | --- |
| GitHub Pages | Publikasi website demo melalui branch `main` | Membuktikan frontend statis dapat dipublikasikan, bukan backend hidup |
| `config.js` | `apiUrl:''`, `demoMode:true` | Browser tidak dapat menulis data |
| `config.js` | `paymentsEnabled:false` | QRIS tidak bisa menerima order |
| `config.js` | `catalogEnabled:false` | CRUD katalog admin terkunci |
| `config.js` | `lmsEnabled:false`, `supportEnabled:false`, `notificationsEnabled:false` | Fitur tulis operasional tidak aktif |
| GAS source | `NGD_MUTATIONS_ENABLED` default OFF | Pengaman utama semua aksi tulis |
| GAS source | `NGD_CATALOG_ENABLED` default OFF | Kunci terpisah untuk membuat/mengubah/soft-archive produk |
| GAS source | `NGD_REGISTRATION_ENABLED` default OFF | Pendaftaran belum diaktifkan |
| GAS source | `NGD_FINANCE_ENABLED` default OFF | Order, kredit berbayar, komisi dan refund tetap terblokir |
| GAS source | `NGD_LMS_ENABLED`, `NGD_SUPPORT_ENABLED`, `NGD_NOTIFICATIONS_ENABLED` default OFF | Pengaman tiap modul |
| Google Sheets | Staging 25 tab, termasuk 8 produk pada `katalog_produk` | Struktur staging sudah disiapkan, belum diuji runtime GAS terbaru |
| Authentication | Login WA+PIN 6 digit, sesi tersimpan dan throttling cache | Membutuhkan audit autentikasi serta rencana pemulihan akun sebelum publik |

## 2. Pemasangan staging yang aman — aksi pemilik di browser

**Jangan bekerja pada Apps Script/database sumber 14 tab. Jangan menyalin nomor, PIN, API key atau token ke GitHub.**

1. Buka [Google Apps Script](https://script.google.com/home), buat proyek baru dengan nama `NGD-STAGING-QA`. Ini proyek **terpisah**, bukan Apps Script yang sudah terikat database sumber.
2. Masukkan source terbaru dari folder GitHub `apps-script/`: `Code.gs`, `Catalog.gs`, `LMS.gs`, `Support.gs`, `Notifications.gs`, `Diagnostics.gs`, serta `appsscript.json`. Jangan menyimpan dua salinan fungsi yang sama.
3. Project Settings → Script Properties: masukkan `NGD_DB_ID` yang mengacu **hanya** pada spreadsheet staging 25-tab. Nilainya privat dan tidak perlu diberikan dalam chat. Biarkan seluruh flag mutasi, pendaftaran, keuangan, katalog, support, LMS dan notifikasi **absent/OFF**.
4. Jalankan fungsi read-only `diagnosticPing`, `diagnosticDatabase`, `diagnosticSchema`, `diagnosticBackend`, `diagnosticApiPublic` satu per satu; simpan hasil `PING_OK`, `DB_OK`, `SCHEMA_OK` dan API checks. `diagnosticApiPublic` kini membandingkan jumlah katalog publik terhadap produk aktif, tidak lagi mengasumsikan enam baris.
5. Bila hasil tepat, gunakan Deploy → New deployment → Web app. Jalankan hanya **staging**; catat identitas pemilik, scope OAuth dan izin URL secara eksplisit. Manifest saat ini menargetkan `USER_DEPLOYING` dan `ANYONE_ANONYMOUS`: endpoint berarti internet-accessible, sehingga backend harus melindungi semua aksi privat melalui sesi/role/gates. **Jangan menyalakan semua switch untuk mencoba-coba.**
6. Uji transport GET **dan** POST `getPublicInfo` dari browser origin GitHub Pages. ContentService melakukan redirect ke domain layanan Google; perlakuan CORS dan sesi browser tidak dapat diasumsikan dari tes lokal. Uji dengan data non-rahasia.
7. Untuk uji katalog tulis, siapkan ADMIN **sintetis** di staging (bukan akun nyata sumber), aktifkan hanya `NGD_MUTATIONS_ENABLED=true` dan `NGD_CATALOG_ENABLED=true` pada **script staging**. Biarkan finance/registration/LMS/notifications OFF. Gunakan UI staging yang terpisah dari situs demo publik atau pengujian lokal terisolasi, kemudian:
   - Buka `adminListCatalog` sebagai ADMIN, pastikan member biasa ditolak.
   - Buat produk dummy; pastikan status awal nonaktif, refresh halaman dan replay create tidak membuat duplikat.
   - Ubah harga, verifikasi daftar terurut, dan cek audit log.
   - Uji edit dari dua tab admin; update dengan revision stale wajib gagal.
   - Aktifkan dan nonaktifkan; produk tidak boleh terhapus dari histori.
   - Pastikan `JASA_SEKALI` dan `PRODUK_DIGITAL` tidak dapat menghasilkan order walaupun katalog aktif.
8. Kembalikan kedua flag yang dinyalakan untuk QA ke OFF. Simpan snapshot staging, log dan hasil pengujian. Jangan memindahkan hasil uji ke database utama.

**Batas konektor saat checkpoint:** GitHub dan Google Drive/Sheets dapat dibaca/ditulis sesuai hak akses, tetapi tidak ada aksi langsung yang tersedia untuk membuat atau mendeploy proyek Apps Script pada sesi ini. Langkah UI Apps Script di atas masih memerlukan pemilik atau Work/Cloud Browser yang memiliki akses yang tepat.

## 3. Gate sebelum pilot 50 orang

| P0 | Bukti yang wajib ada | Status pada checkpoint |
| --- | --- | --- |
| Backend GAS terpasang pada staging terisolasi | `SCHEMA_OK`, GET/POST, role authorization, QA menyeluruh | **Belum** |
| Pengamanan identitas | Throttle PIN, proteksi brute force, kebijakan pemulihan/rotasi PIN, sesi revoked pada logout/change PIN, uji pencurian sesi | **Belum tervalidasi end-to-end** |
| Data pengguna & privasi | Kebijakan privasi, persetujuan pengumpulan WA, penetapan akses operator, retensi & backup | **Belum** |
| Catalog CRUD | Create/retry, edit/version conflict, archive, validasi harga & tipe, audit di runtime GAS staging | **Node/Chrome CI lulus; GAS nyata belum diuji** |
| LMS utama | Pilih Classroom, LMS internal atau Mayar sebagai otoritas akses kelas untuk fase tertentu; hindari status ganda | **Keputusan belum final** |
| Pembayaran nyata | Merchant QRIS resmi, validasi bukti dana, webhook tervalidasi, idempotensi pembayaran dan refund | **Belum** |
| Akses produk | Fulfillment POS/3-in-1/seat, jasa/ebook terpisah, komisi serta kredit tidak diduplikasi | **Belum** |
| Batas biaya | Hitung biaya transaksi Mayar + biaya API AI + biaya operasional pengiriman WhatsApp/email; tetapkan limit bulanan | **Belum** |
| Perangkat nyata | Android PWA, Chrome/Edge Windows, layar 360/390/1280 px, slow network, logout dan relogin | **Belum** |
| Backup, pemulihan dan rollback | Cadangan staging & utama, restore drill, siapa pemilik rilis, cara matikan setiap flag | **Belum** |

**Pilot boleh dibuka untuk orang nyata hanya setelah seluruh P0 terkait alur yang akan dijalankan sudah lulus dan ada persetujuan rilis eksplisit.** Boleh melakukan *pilot terbatas tanpa uang* lebih dahulu setelah gate data/autentikasi dan privasi lulus, dengan transaksi finansial tetap mati.

## 4. Prioritas arsitektur

- **Satu otoritas uang:** jangan mendebit ledger internal bersamaan dengan Mayar Credit Wallet tanpa model rekonsiliasi yang disepakati. Mayar belum diintegrasikan.
- **Satu otoritas akses LMS per produk:** Chapter 1 dapat berjalan melalui Google Classroom, sementara LMS internal dijaga sebagai staging sampai kebijakan sinkronisasi ditetapkan. Dokumen Mayar adalah usulan, bukan keputusan live.
- **Produk statis vs dinamis:** katalog pelanggan dibaca dari API saat backend terhubung; preview lokal bukan bukti produk nyata. Harga order disimpan sebagai snapshot.
- **Tipe produk:** backend order saat ini mengizinkan hanya `LANGGANAN_30H`, `LISENSI_SEKALI`, `SEAT_30H`, `TOPUP_KREDIT`; jasa dan eBook **read-only offering** sampai alur fulfillment disetujui.
- **Khusus Google Apps Script:** jangan merencanakan beban produksi tanpa pengujian batas kuota dan latensi. Kuota serta jumlah eksekusi dapat berubah menurut akun.

## 5. Langkah QA otomatis dari GitHub

- CI: `node --test tests/*.test.cjs` pada workflow `validate.yml`.
- Browser smoke: Chrome headless desktop/mobile memeriksa beranda, member, admin, LMS, support, katalog, editor katalog, kontrol demo, overflow, serta isolasi tamu.
- Test katalog: `tests/backend-catalog-crud.test.cjs` + `tests/frontend-admin-catalog.test.cjs`.
- Nilai CI harus dibuktikan terhadap **commit SHA yang sama dengan main**, bukan hanya screenshot dari commit lama.
- GitHub Pages deployment berhasil **tidak** berarti transaksi dan database GAS aktif.

## 6. Operasi produksi dan rollback

1. Aktifkan flag server **per modul**, bukan sekaligus. Paket rilis tanpa finance: API staging → auth private → catalog CRUD → support → LMS. Finance dan Mayar memiliki persetujuan terpisah.
2. Saat insiden: matikan `NGD_MUTATIONS_ENABLED`, `NGD_FINANCE_ENABLED` dan flag modul; jangan reset database langsung.
3. Untuk insiden dana nyata, gunakan ledger rekonsiliasi; jangan mengubah status pembayaran manual tanpa mutasi rekening/settlement.
4. Simpan versi source, data backup, hasil smoke, dan pemilik yang dapat melakukan rollback. Pastikan Apps Script deployment lama bisa dipulihkan.
5. Jangan mengumumkan fitur siap digunakan jika belum dapat menyelesaikan alur dari Android/Windows hingga data tersimpan dan dapat dipulihkan.

## 7. Bukti sumber resmi

- Google Apps Script Web apps: https://developers.google.com/apps-script/guides/web
- Google Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- ContentService redirect: https://developers.google.com/apps-script/reference/content/content-service

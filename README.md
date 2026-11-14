# Ngulik Digital Member

Platform membership, pembelajaran UMKM, katalog digital, kredit AI, dan affiliate.
**Arsitektur:** GitHub Pages (HTML/CSS/ES Modules tanpa build) → Google Apps Script Web App → Google Sheets (14 tab sumber; 25 tab staging privat: 14 inti + 3 support + 7 LMS + 1 notifikasi).

## Penguatan autentikasi — 14 November 2026

Untuk akun yang sudah terdaftar, penghitung kegagalan login PIN sekarang dicatat bukan hanya di `CacheService` tetapi juga di `ScriptProperties` dengan kunci hash nomor WA dan masa berlaku 15 menit. Ini mencegah hilangnya cache membatalkan lockout sementara. Nomor WA acak yang tidak terdaftar tidak disimpan ke Script Properties untuk mencegah penyalahgunaan kapasitas. Saat PIN benar, kedua penghitung dibersihkan. **Mekanisme tersebut belum menggantikan kebutuhan uji autentikasi end-to-end, pemulihan akun, persetujuan privasi, dan penerapan keamanan produksi.**

## Staging admin katalog & release gate — 14 November 2026

- Panel **Kelola Katalog** `?preview=admin#produk` sudah ada pada UI, dengan daftar 8 produk dan form editor yang terkunci di demo publik. Member biasa tidak dapat membuka editor katalog.
- `apps-script/Catalog.gs` menyediakan ADMIN CRUD terbatas: create nonaktif secara default, update dengan revision token, soft archive/reactivate, audit log, dan idempoten pada retry create. **Tidak ada hard delete** untuk produk/riwayat order.
- Endpoint `adminListCatalog` (ADMIN read-only), `adminCreateCatalogItem`, `adminUpdateCatalogItem`, `adminSetCatalogActive` (ADMIN write). Mutasi mensyaratkan `NGD_MUTATIONS_ENABLED=true` **dan** `NGD_CATALOG_ENABLED=true` pada GAS staging; `config.catalogEnabled:false` di GitHub Pages.
- Seed instalasi baru sekarang 8 produk; urutan katalog publik mengikuti kolom `urut`; diagnostik tidak lagi mengasumsikan 6 produk. Izin manifest Apps Script untuk mengirim email dan permintaan eksternal yang belum digunakan telah dihapus.
- **Panduan operasi pilot dan syarat rilis:** [Pilot 50 — Go-Live Gate & Runbook](docs/PILOT_50_GO_LIVE_GATE_2026-11-14.md). Backend GAS aktual belum disinkronkan/dideploy; belum siap menerima pendaftaran atau pembayaran nyata.

## Ngulik Digital Hub — pembaruan UI/UX & katalog 14 November 2026

Beranda publik kini menampilkan empat kebutuhan UMKM: belajar & praktik, aplikasi usaha, Studio AI & kredit, serta jasa kreatif. Katalog memiliki filter interaktif enam kategori, dan pratinjau delapan produk mengikuti pembaruan database Google Drive. Tab `katalog_produk` **STAGING QA** juga sudah diselaraskan ke delapan produk tanpa mengubah database utama. Tipe jasa dan eBook belum mendukung checkout: ditampilkan sebagai informasi tetapi ditolak oleh backend sebelum order dibuat. UI baru memakai identitas Ngulik Digital Hub dengan gaya Slate & Ink yang konsisten di mobile/desktop. **Semua mode pembayaran, pendaftaran, API, LMS live, support live, dan notifikasi live tetap dinonaktifkan.**

Bukti: [Ngulik Hub UX & Katalog Checkpoint](docs/NGULIK_HUB_UX_CATALOG_CHECKPOINT_2026-11-14.md) — CI **206/206 tes Node.js lulus dan smoke Chrome berhasil** pada [run GitHub Actions](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43572668843). Pengujian ini belum membuktikan Apps Script nyata atau kesiapan transaksi.

## Status aktual — 14 November 2026

**Status: DALAM PENGEMBANGAN — belum siap dipakai publik atau transaksi nyata.**

**Checkpoint QA mobile sebelumnya:** GitHub Actions run #193 **178/178 tes Node.js lulus**. Chrome headless menguji dashboard, kelas dan layar selesai, formulir bantuan pada ukuran 375–390 px, serta memastikan styling member violet aktif tanpa mengubah panel admin. Bukti: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43550180541

**Bukti dan rinciannya:** [QA Evidence & Staging Checkpoint](docs/QA_EVIDENCE_2026-11-14.md).

**UI/UX unified — Slate & Ink (pembaruan):** beranda publik, desktop, mobile, member, LMS, akun, serta seluruh panel admin menggunakan satu desain biru-abu muda + kartu putih + tombol/nav aktif charcoal + aksen progres biru. `assets/unified-theme.css` dimuat paling akhir di seluruh tampilan. Isi LMS dan aturan bisnis tidak berubah. Tema ungu mobile pada checkpoint sebelumnya kini hanya legacy CSS dan ditimpa sistem global. Lihat [panduan sistem visual baru](docs/UNIFIED_DESIGN_SYSTEM_2026-11-14.md) dan [arsip handoff mobile](docs/MOBILE_MEMBER_DESIGN_2026-11-14.md).

**LMS V1 dalam tahap staging:** `apps-script/LMS.gs` menangani kursus, pelajaran, published snapshot, enrollment, progres, workspace otomatis, revisi, dan antrian AI draft. Staging privat memiliki **25 tab** (7 LMS dan 1 notifikasi setelah 17 tab sebelumnya). Dua header versi LMS (`lms_lessons.published_version`, `lms_progress.lesson_version`) telah diperbaiki dan dicocokkan terhadap 25 kontrak backend. `NGD_LMS_ENABLED` dan `config.lmsEnabled` tetap OFF; API key LLM, pembayaran, notifikasi WhatsApp/email, dan update produksi belum diaktifkan.



**Audit lanjutan:** pengiriman ulang tiket kini mempertahankan `request_id` setelah kegagalan jaringan, dan backend mencegah laporan identik dalam 15 menit meski browser dimuat ulang. Pencarian admin membedakan status akun dengan status langganan; halaman rilis memiliki analisis dampak produk (jumlah pembeli aktif/berakhir/menunggu, serta bug terbuka) yang hanya dapat dibaca admin.

**Member 360° & Support Ticketing telah dibangun dalam source:** pencarian member menurut nama/WA/produk, tiket bug/fitur/pertanyaan, penanganan status dan prioritas P0–P3, riwayat aktivitas, serta draft/publikasi changelog. Tiga tab support ditambahkan hanya ke staging privat (17/17 header sesuai). Semua penulisan support tetap **OFF** melalui `NGD_SUPPORT_ENABLED` dan `config.supportEnabled:false`. Lihat [handoff Member 360 & Support](docs/MEMBER360_SUPPORT_HANDOFF_2026-11-14.md).


**Database staging privat:** salinan Google Sheet memiliki ID berbeda dari sumber, dimulai dengan 14 tab inti, bertambah 3 tab support, lalu 7 tab LMS dan 1 tab notifikasi (**25 tab**, tanpa data nyata baru). Database sumber tetap 14 tab. Verifikasi ulang semua header terhadap source terbaru menunjukkan **25/25 cocok** pada 14 November; tetap audit ulang sebelum uji Apps Script. Backend GAS staging dan pengujian integrasi belum terverifikasi.

**Perbaikan P0 baru:** pengaturan komisi `0%` sekarang benar-benar menghasilkan nol komisi (tidak jatuh ke default `25%`). Nilai komisi divalidasi sebelum hak akses produk diberikan. Autentikasi/otorisasi kini punya tes tambahan untuk isolasi member/admin, akun ditangguhkan, dan data pesanan pribadi.

Perubahan checkpoint 14 November (termasuk hardening lanjutan):

- `getOrder` hanya baca; data internal order tidak lagi terlihat oleh member.
- Persetujuan pembayaran wajib bukti penerimaan dana. Refund top-up berdasarkan saldo ledger; refund layanan lain butuh rekonsiliasi manual.
- Komisi tidak dapat dicairkan bila order asal dibatalkan/direfund.
- Aktivasi lisensi/seat memakai penanda anti-retry setelah upaya fulfillment.
- Click tracking publik memiliki saklar tambahan yang default nonaktif.
- Pengujian aturan bisnis murni 45/45; keseluruhan CI Node.js 133/133 serta browser smoke test sudah terverifikasi pada run #152. Ini bukan pengujian Apps Script nyata.

Perubahan checkpoint 14 November:
- Semua mutasi tetap memerlukan `NGD_MUTATIONS_ENABLED=true`. Pendaftaran memerlukan **saklar kedua** `NGD_REGISTRATION_ENABLED=true`; pembayaran/refund/payout/koreksi kredit memerlukan **saklar ketiga** `NGD_FINANCE_ENABLED=true`. Semua default **OFF**; pengujian login tidak otomatis membuka transaksi.
- Setiap input teks yang ditulis ke Sheets melewati pelindung karakter formula, dan pembaruan multi-kolom per baris memakai satu `setValues` sambil mempertahankan rumus yang ada.
- Koreksi kredit admin menggunakan `request_id` yang idempoten. Retry berulang tidak menambah saldo, penggunaan ulang ID dengan nominal/member berbeda ditolak, dan debit baru tidak bisa membuat saldo negatif.
- Pembelian ulang lisensi POS ditahan, tetapi retry order yang sama tetap idempoten. Perpanjangan seat Canva tidak menurunkan status layanan aktif menjadi `DIAJUKAN`.
- Laporan rekonsiliasi juga mendeteksi komisi referral yang hilang setelah kegagalan fulfillment. Tautan modul hanya boleh dibuka jika domainnya `classroom.google.com` melalui HTTPS.
- Login diserialkan di dalam lock untuk mengurangi bypass throttle PIN akibat request paralel.
- Komisi `PAID` memerlukan bukti transfer dan verifikasi penerima; koreksi kredit admin harus integer, tidak boleh membuat saldo negatif.
- Beranda member menjadi dashboard tugas/aktivitas, disertai katalog dan opsi `?preview=member` untuk **data contoh lokal** tanpa login/transaksi.
- CSP statis, uji keamanan backend, uji XSS/HTML frontend, dan uji kontrak berkas ditambahkan.
- Tes browser GET baca-saja di `tests/transport-probe.html` disediakan untuk pengujian staging nanti.
- Panduan P0, CORS, staging, dan rollback ada di [Release Gates](docs/RELEASE_GATES_2026-11-14.md).

| Komponen | Status |
|---|---|
| Database Google Sheets 14 tab + satu akun ADMIN | Terverifikasi dari log Apps Script |
| `inspectDatabaseSetup` | Lulus; 14 header sesuai |
| `diagnosticApiPublic` | Lulus; informasi umum & 6 produk |
| `diagnosticAuthReadOnly` | Lulus 16/16 pemeriksaan dasar |
| `diagnosticFinanceReadOnly` | Lulus dengan **0 order / 0 ledger / 0 komisi** |
| `diagnosticReconciliationReadOnly` | Lulus dengan **0 order** |
| Skenario murni antrean, keuangan, pengaturan admin | 45/45 assertions lulus di V8 terisolasi |
| Frontend awal (SPA tanpa build) | **Source dibuat**; guest/member preview telah diuji pada mock browser; belum diuji di browser sungguhan |
| Login nyata, pembayaran, refund, affiliate, AI | **Belum lulus uji integrasi/keamanan** |
| Google Apps Script terbaru vs GitHub | **Belum disinkronkan sejak perubahan lanjutan** |
| GitHub Pages & Apps Script publik | **Jangan aktifkan dulu** |

Checkpoint terbaru: [14 November 2026 — hasil dan pekerjaan tersisa](docs/CHECKPOINT_2026-11-14.md).  
Arsip progres sebelumnya: [13 November 2026](docs/CHECKPOINT_HISTORY_2026-11-13.md).

## Checkpoint tambahan — Userbase Core, 14 November 2026

**Sudah di source GitHub dan staging, belum di-deploy ke Apps Script aktual:**

- Diagnostik tidak lagi menggunakan ID Google Sheet yang ditulis permanen; semua pembacaan diagnostik berdata mewajibkan Script Property `NGD_DB_ID` yang eksplisit.
- Database staging 25 tab diverifikasi cocok dengan `NGD.HEADERS`; sumber 14 tab **tidak disentuh**.
- `apps-script/Notifications.gs` memberi inbox notifikasi internal personal, status dibaca, dan materialisasi idempoten dari aktivitas support oleh admin. Ini bukan sistem pengiriman WhatsApp/email. Materializer `buildSupportNotifications()` harus dipicu secara eksplisit pada runtime staging, bukan pada database utama.
- API member `getMyNotifications`, `markNotificationRead`, serta `updateMyProfile` ditambahkan; update profil hanya mengizinkan enam kolom informasi usaha, bukan WA login, peran, membership atau saldo.
- `config.notificationsEnabled:false` dan server `NGD_NOTIFICATIONS_ENABLED` default OFF; kontrol publik lain tetap OFF. Tidak ada pengiriman eksternal, perubahan Script Properties, atau aktivasi finansial.
- Tes baru: `tests/backend-diagnostics-isolation.test.cjs`, `tests/backend-notifications.test.cjs`, `tests/backend-member-profile.test.cjs`.

Rincian implementasi, batasan, dan urutan QA: [Userbase Core Runbook](docs/USERBASE_CORE_IMPLEMENTATION_2026-11-14.md).

## UI responsif terpadu — 14 November 2026

- Referensi visual: mockup SubPilot yang diberikan pengguna, **gaya visual saja** (tanpa fitur subscription atau aset merek lain).
- Satu palet untuk **desktop, mobile, admin, member, tamu, LMS, katalog, support, dan formulir**; tidak ada pemisahan hijau-desktop vs ungu-mobile.
- CSS: `assets/app.css` (basis), `assets/member-mobile.css` (komponen lama), `assets/unified-theme.css` (skin final global).
- GitHub Actions menguji computed token tema, navigasi gelap aktif, bilah navigasi mengambang di mobile, serta tidak ada horizontal overflow pada browser emulasi.
- Detail, batasan, dan rollback: [Unified Design System](docs/UNIFIED_DESIGN_SYSTEM_2026-11-14.md).

## Struktur

```text
index.html                   # Shell responsif Android dan desktop
config.js                    # Konfigurasi PUBLIK saja, default aman
assets/app.css               # Desain mobile-first
assets/favicon.svg
js/api.js                    # Transport API Apps Script (text/plain)
js/app.js                    # SPA beranda, login, katalog, belajar, AI, affiliate, admin
apps-script/Code.gs          # Backend + action router (25-tab staging schema)
apps-script/Support.gs       # Member360, tiket dan rilis produk
apps-script/Diagnostics.gs   # Diagnostik read-only dan simulasi memori
apps-script/appsscript.json  # Manifest; JANGAN deploy dahulu
tests/backend-pure.test.cjs
tests/frontend-smoke.test.cjs
tests/backend-support.test.cjs
tests/frontend-support.test.cjs
.github/workflows/validate.yml
```

## Pagar keamanan sementara

- `config.js` berisi `apiUrl: ''`, `demoMode: true`, `paymentsEnabled: false`, dan `supportEnabled:false`. **Jangan ubah** sebelum audit dan konfirmasi deployment.
- Tombol registrasi, login, dan transaksi yang menulis data dinonaktifkan ketika mode pratinjau. Checkout juga membutuhkan QRIS serta nama merchant yang diverifikasi.
- QRIS asli tidak ada di repo. Jangan memakai kode QR atau rekening contoh untuk transaksi nyata.
- Fitur `generateAI` belum diaktifkan; tidak ada pemotongan kredit sebelum API SobatAgent terverifikasi.
- PIN, token sesi, API key, dan data sensitif **tidak boleh** masuk GitHub maupun `config.js`.
- `setupDatabase()` **tidak perlu dijalankan lagi**; struktur dan ADMIN sudah terdeteksi. Gunakan pemeriksaan read-only untuk inspeksi.
- Jangan menyalin kode terbaru ke editor Apps Script berkali-kali selagi source masih dikerjakan di GitHub.

## Pengujian otomatis (tanpa build dan paket npm)

Saat bekerja dalam repository yang memiliki Node.js 20+, jalankan:

```bash
node --test tests/*.test.cjs
```

Workflow `validate.yml` juga menjalankan perintah itu pada push/PR, **tidak melakukan deployment**. Hasil workflow harus diperiksa sebelum menyatakan CI lulus. Pengujian murni tidak menggantikan uji nyata Apps Script, browser, pembayaran, atau concurrency.

## Daftar pekerjaan sebelum peluncuran

1. Audit login nyata dan throttling percobaan PIN, sesi, perubahan PIN, serta hak akses ADMIN/member.
2. Uji proses pendaftaran, waiting list, promosi, suspend/reactivate dalam database **staging terisolasi**.
3. Uji idempotensi order, konfirmasi QRIS manual, top-up, fulfillment, refund dengan bukti, ledger, dan pencairan komisi.
4. Selesaikan strategi pemulihan dari **partial failure** akibat operasi lintas banyak sheet tanpa transaksi atomik.
5. Validasi dokumentasi API SobatAgent yang benar; jangan menebak endpoint.
6. Uji UI Android/Windows, aksesibilitas, kompatibilitas browser, dan komunikasi Apps Script lintas origin.
7. Verifikasi identitas pemilik QRIS, syarat program, kebijakan privasi, dan kesiapan operasional sebelum membuka pendaftaran/pembayaran publik.

## Akses referensi

- Ngulik Digital DB (Google Sheets): buka langsung dari Google Drive akun pemilik; tautan privat tidak dicantumkan di repository.
- [Apps Script backend](apps-script/Code.gs)
- [Frontend utama](js/app.js)

**Prinsip kerja:** audit source di GitHub → uji tanpa database produksi → sinkronisasi Apps Script setelah checkpoint final → uji integrasi → persetujuan terpisah untuk aktivasi publik.

## Pratinjau aman dan langkah sesudah checkpoint

- Pratinjau beranda tamu: buka URL GitHub Pages **setelah hosting staging mendapat persetujuan**. Beranda member contoh: tambahkan `?preview=member` pada URL halaman. Mode ini **tidak pernah membuat sesi atau transaksi nyata**.
- Pratinjau GitHub Pages telah dipakai pengguna; publikasi perubahan terakhir mengikuti proses deployment GitHub Pages. Untuk melihat contoh desain baru: `?preview=member#belajar` dan `?preview=member#lms-complete`.
- Jangan mengganti `Code.gs` di Google Apps Script yang saat ini terikat database aktif; backend masih terus dikembangkan.
- Untuk QA sebelum rilis, buka [Release Gates & QA](docs/RELEASE_GATES_2026-11-14.md). Jangan menyalakan `NGD_MUTATIONS_ENABLED` tanpa pengujian staging dan persetujuan terpisah.

## Mode pratinjau Support

Untuk uji tampilan lokal tanpa backend (belum publik): `?preview=member#dukungan`, `?preview=member#tiket`, `?preview=admin#member`, `?preview=admin#dukungan`, dan `?preview=admin#rilis`. Semua data adalah contoh; form tiket, perubahan prioritas, dan publikasi tetap terkunci.

Catatan: kode di GitHub belum disinkronkan ke Apps Script staging atau produksi. Jangan menjalankan `setupDatabase` pada sumber 14-tab. Lihat [handoff modul support](docs/MEMBER360_SUPPORT_HANDOFF_2026-11-14.md).

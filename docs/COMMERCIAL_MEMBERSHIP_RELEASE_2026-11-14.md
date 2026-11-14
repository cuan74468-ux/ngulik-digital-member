# NGULIK DIGITAL — Membership Komersial Terpadu
**Status implementasi:** production-directed engineering; **NO-GO aktivasi uang nyata** sampai bukti GAS & Mayar.  
**Sumber otoritatif:** Google Drive *Blueprint Monetisasi Terpadu: Linggau AI Studio & Ngulik Digital*, *Panduan Mayar LMS & Checkout*, *Master Blueprint Ekosistem Digital*, *Panduan Chapter 1*.  
**Tanggal:** 14 November 2026. **Branch kerja:** `main`, GitHub `cuan74468-ux/ngulik-digital-member`.

## 1. Keputusan produk: BUKAN aplikasi demo

Ngulik Digital merupakan **portal membership komersial Linggau AI Studio** yang menjual aplikasi usaha, produk digital, akses edukasi, paket kredit AI, dan jasa kreatif/custom, dengan target gelombang awal **maksimal 50 member**.  
`?preview=member` / `?preview=admin` adalah **alat QA internal**; bukan fitur atau produk yang ditawarkan kepada pelanggan. Situs publik saat ini masih dalam mode nontransaksional **karena backend live belum lolos validasi**, bukan karena visi produknya demo.

### Value ladder yang dituju
| Tingkat | Lini penawaran | Aturan pemenuhan |
|---|---|---|
| Gratis | Chapter 1, pengantar materi, katalog edukasi | Materi dasar, dapat melalui Classroom yang sudah ada |
| Mikro | Kredit AI dan aplikasi UMKM (POS Lite/3-in-1) | Pembayaran terverifikasi; ledger kredit atau lisensi hanya lewat backend |
| Digital Pro | eBook, kelas berbayar, video iklan AI | Lisensi atau order jasa dengan proses yang bisa diaudit |
| Custom | Website, landing page, aplikasi dan sistem bisnis | Brief → tinjau → penawaran tertulis → pembayaran resmi → penyerahan |

Harga di katalog utama/Sheets adalah penawaran yang ada saat ini, bukan bukti checkout aktif. Penambahan paket Pro/video atau web custom tidak boleh dipalsukan sebagai SKU siap checkout bila harga dan fulfillment belum diputuskan.

## 2. Perubahan yang benar-benar dikerjakan

### Backend dan data
- `apps-script/Services.gs` menambahkan pengiriman brief member terautentikasi, riwayat personal, antrean admin, dan penawaran tertulis. Kategori: `VIDEO_AI`, `WEBSITE_CUSTOM`, `APLIKASI_CUSTOM`, `KONSULTASI`.
- Identitas member diambil dari sesi, bukan ID yang diserahkan browser. Catatan internal admin tidak dikirim kepada member.
- Submission punya replay idempoten berdasarkan `request_id`, pemeriksaan duplikat 15 menit dan batas 5 brief/24 jam. Penawaran memakai `revision` numerik sehingga update usang ditolak.
- Mutasi harus lolos **`NGD_MUTATIONS_ENABLED=true` DAN `NGD_SERVICE_ENABLED=true`**; default kedua flag OFF. Tidak ada otomatisasi transfer, debit kredit, invoice, email atau WhatsApp dalam modul ini.
- Staging Sheets **26 tab**, dengan tab baru `service_requests` (17 kolom, header tetap, belum berisi pelanggan). Database utama 14 tab **tidak diubah**.
- Katalog admin CRUD yang telah dibangun sebelumnya tetap berjalan dari source; 8 penawaran dasar tersedia dalam staging.

### UI/UX
- `js/services-ui.js`: form member untuk jenis jasa, judul, brief, referensi HTTPS, dan perkiraan anggaran; riwayat status/penawaran yang hanya terlihat oleh pemilik.
- Admin: antrean, status `BARU → DITINJAU → PENAWARAN` atau `DITOLAK/SELESAI`, harga, pesan pelanggan, dan catatan internal.
- Katalog Video AI menyediakan aksi “Ajukan brief jasa”, bukan checkout yang belum terverifikasi. Jasa custom dapat dimulai dari halaman Jasa.
- Responsif Android/desktop memakai desain Slate & Ink; bug overflow katalog desktop tiga kolom sudah ditutup.
- Formulir komersial tidak terbuka untuk guest; QA preview tetap baca-saja.

### Pengujian
- Unit/integration-mock: `tests/backend-services.test.cjs`, `tests/frontend-services.test.cjs`; seluruh suite Node/Chrome GitHub Actions.
- Belum ada klaim browser Android fisik, GAS nyata, provider AI, webhook Mayar, OTP, invoice, refund atau settlement.
- Jangan menerapkan kode baru pada database utama sebelum menguji staging Apps Script dengan versi source yang sama.

## 3. Arsitektur final yang diusulkan dari sumber Drive (masih memerlukan verifikasi operasional)

| Domain | Pemegang data otoritatif |
|---|---|
| Member, profil, saldo internal, entitlements produk, aktivitas/order | GAS + Sheets, dengan backend-verified sessions/roles |
| Katalog pemasaran statis | GitHub/Cloudflare static assets boleh cache; harga/aktif untuk checkout selalu verifikasi lagi pada server |
| Chapter 1 gratis | Google Classroom sebagai program yang telah berjalan, dengan tautan akses aman di portal |
| Kelas/membership berbayar | Pilih satu LMS utama per produk: Mayar atau LMS internal, jangan menerbitkan hak akses ganda |
| Invoice/QRIS | Mayar sebagai kandidat payment provider (perlu akun merchant, API sandbox, biaya dan verifikasi webhook) |
| Jasa custom | Brief di `service_requests`, quote admin, invoice Mayar sesudah approval, fulfillment dan serah terima |
| Tool AI | Proxy GAS, API key di Script Properties, ledger biaya/pemakaian single-source-of-truth |
| Hosting | Repo/private deployment untuk komersial (Cloudflare Pages sesuai Master Blueprint); GitHub Pages publik sementara untuk website statis/QA |

**Pantangan:** Jangan memakai dua ledger kredit sekaligus (wallet Mayar dan Sheets) tanpa sinkronisasi yang terbukti, jangan menjadikan `paid` dari input browser sebagai bukti transfer, jangan menyalurkan webhook ke fungsi publik tanpa verifikasi autentisitas event dan idempotensi.

## 4. Tantangan backend Web App yang dikirim pengguna

URL Web App yang dikirim pengguna adalah bentuk `script.google.com/macros/s/.../exec`. **Belum ada bukti** URL itu menggunakan kode `Code.gs` terbaru atau terhubung ke staging 26-tab; jangan mengasumsikan environment-nya. Pemeriksaan langsung dari lingkungan pengembangan tidak dapat mengonfirmasi HTTP response atau target DB.

Kebutuhan untuk menyiapkan kode GAS staging:
1. Masukkan versi **terbaru** `Code.gs`, `Catalog.gs`, `Services.gs`, `LMS.gs`, `Support.gs`, `Notifications.gs`, `Diagnostics.gs`, dan manifest (jangan tinggalkan salinan fungsi duplikat).
2. Atur `NGD_DB_ID` di Script Properties **hanya** ke spreadsheet staging (bukan commit GitHub).
3. Biarkan seluruh flag tulis/keuangan/pendaftaran tetap OFF; jalankan read-only `diagnosticDatabase` dan `diagnosticSchema`; pastikan **26 dari 26 header**.
4. Uji `doGet` dan `doPost` baca-saja lintas origin; cek CORS Google ContentService dan timeout. Data privat dan PIN jangan ditaruh di query string.
5. Uji pada akun sintetis di staging: login, sesi, role, update profil, CRUD katalog, brief member, tawaran admin, isolasi member, replay, failover, dan batas kuota; matikan kembali switch setelah uji.
6. Baru setelah bukti QA tersebut, putuskan pengaktifan fitur operasional bertahap di domain **komersial privat**. Jangan meluncurkan ke 50 pelanggan atau menagih uang sebelum P0 lulus dan pemilik memberi persetujuan.

## 5. Gate monetisasi yang wajib lulus sebelum **GO-LIVE**

| P0 | Kriteria lulus |
|---|---|
| Account & data | Auth nyata, backup/restore, keamanan PIN dan recovery, privacy notice/consent, role & row isolation, rate limit |
| GAS transport | Script staging sesuai GitHub, 26/26 header, GET/POST berhasil dari domain frontend dan Android/Windows |
| Katalog/CRUD | Harga aktif tervalidasi server, audit, idempotensi dan no hard delete |
| Jasa | Member brief, owner-only history, revisi penawaran, status dan serah terima diuji |
| Pembayaran Mayar | Merchant aktif, biaya disetujui, API sandbox, signed webhook/verification via dokumentasi resmi, event replay aman, rekonsiliasi settle/refund |
| AI | Provider valid, API key server-only, kuota/budget/rollback dan satu ledger kredit |
| Fulfillment | Lisensi/aktivasi POS, 3-in-1/seat, eBook deliverable, kelas berbayar dan order jasa tanpa duplikasi |
| Rilis | Backup dan rollback, CI SHA final lulus, perangkat nyata, domain dan repository komersial, persetujuan GO |

**Kesimpulan:** pekerjaan yang telah dibuat adalah **bagian nyata menuju portal membership komersial**. Namun **belum layak menerima pembayaran atau member publik** sampai runtime GAS dan layanan pembayaran terverifikasi. Menghapus label demo tanpa memastikan backend aktif akan menyesatkan pelanggan.

## 6. Aksi prioritas tertunda yang harus dilakukan di luar GitHub/Sheets

- Pemilik/verifikator GAS: pastikan proyek Apps Script endpoint menggunakan staging dan kode source terbaru; jalankan diagnostik.
- Pemilik akun merchant: siapkan akun Mayar & sandbox/produk, lihat dokumentasi resmi autentikasi webhook dan tarif, tanpa berbagi API key ke chat.
- Setelah runtime terbukti, barulah sambungkan `config.js apiUrl`, sesuaikan `demoMode=false` **hanya pada target komersial**, aktifkan server-side write gates satu per satu (bukan sekaligus).

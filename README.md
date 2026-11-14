# Ngulik Digital Member

Platform membership, pembelajaran UMKM, katalog digital, kredit AI, dan affiliate.
**Arsitektur:** GitHub Pages (HTML/CSS/ES Modules tanpa build) → Google Apps Script Web App → Google Sheets (14 tab).

## Status aktual — 14 November 2026

**Status: DALAM PENGEMBANGAN — belum siap dipakai publik atau transaksi nyata.**

Perubahan checkpoint 14 November (termasuk hardening lanjutan):

- `getOrder` hanya baca; data internal order tidak lagi terlihat oleh member.
- Persetujuan pembayaran wajib bukti penerimaan dana. Refund top-up berdasarkan saldo ledger; refund layanan lain butuh rekonsiliasi manual.
- Komisi tidak dapat dicairkan bila order asal dibatalkan/direfund.
- Aktivasi lisensi/seat memakai penanda anti-retry setelah upaya fulfillment.
- Click tracking publik memiliki saklar tambahan yang default nonaktif.
- Pengujian aturan bisnis terisolasi sekarang 39/39; test finance, payout, fulfillment, privacy, dan payment evidence masuk workflow, tetapi hasil GitHub Actions masih perlu diverifikasi.

Perubahan checkpoint 14 November:
- Backend mutasi sekarang memerlukan Script Property `NGD_MUTATIONS_ENABLED=true`. Properti ini **belum disetel**; bawaan menolak login/registrasi/order/aksi tulis dengan `MAINTENANCE`.
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
| Skenario murni antrean, keuangan, pengaturan admin | 39/39 assertions lulus di V8 terisolasi |
| Frontend awal (SPA tanpa build) | **Source dibuat**; guest/member preview telah diuji pada mock browser; belum diuji di browser sungguhan |
| Login nyata, pembayaran, refund, affiliate, AI | **Belum lulus uji integrasi/keamanan** |
| Google Apps Script terbaru vs GitHub | **Belum disinkronkan sejak perubahan lanjutan** |
| GitHub Pages & Apps Script publik | **Jangan aktifkan dulu** |

Checkpoint terbaru: [14 November 2026 — hasil dan pekerjaan tersisa](docs/CHECKPOINT_2026-11-14.md).  
Arsip progres sebelumnya: [13 November 2026](docs/CHECKPOINT_HISTORY_2026-11-13.md).

## Struktur

```text
index.html                   # Shell responsif Android dan desktop
config.js                    # Konfigurasi PUBLIK saja, default aman
assets/app.css               # Desain mobile-first
assets/favicon.svg
js/api.js                    # Transport API Apps Script (text/plain)
js/app.js                    # SPA beranda, login, katalog, belajar, AI, affiliate, admin
apps-script/Code.gs          # Backend + action router
apps-script/Diagnostics.gs   # Diagnostik read-only dan simulasi memori
apps-script/appsscript.json  # Manifest; JANGAN deploy dahulu
tests/backend-pure.test.cjs
tests/frontend-smoke.test.cjs
.github/workflows/validate.yml
```

## Pagar keamanan sementara

- `config.js` berisi `apiUrl: ''`, `demoMode: true`, dan `paymentsEnabled: false`. **Jangan ubah** sebelum audit dan konfirmasi deployment.
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
- Jika hanya melihat source GitHub, `index.html` bukan preview aplikasi interaktif; modul ES memerlukan server HTTPS. GitHub Pages belum dinyalakan melalui pekerjaan ini.
- Jangan mengganti `Code.gs` di Google Apps Script yang saat ini terikat database aktif; backend masih terus dikembangkan.
- Untuk QA sebelum rilis, buka [Release Gates & QA](docs/RELEASE_GATES_2026-11-14.md). Jangan menyalakan `NGD_MUTATIONS_ENABLED` tanpa pengujian staging dan persetujuan terpisah.

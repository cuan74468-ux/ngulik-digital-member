# Ngulik Digital

Membership digital dan ekosistem solusi UMKM dari **Linggau AI Studio**: belajar keterampilan digital, menemukan aplikasi usaha, memakai alat bantu AI, membeli produk digital, mengikuti program komunitas, dan mengajukan jasa kreatif dalam satu layanan.

**Website:** https://cuan74468-ux.github.io/ngulik-digital-member/

## Status (sumber: kondisi yang terverifikasi 21 November 2026)

**Rilis komersial dan registrasi publik: NO-GO.** Ini platform komersial sungguhan; saklar OFF adalah pengaman rilis, bukan mode demo.

| Lingkungan | Versi API | Kondisi |
| --- | --- | --- |
| Publik (produksi) | 1.0.2 | `writes_enabled=false`, `payments_enabled=false`. Database 16 tab. |
| STAGING | 1.0.3 | `mutations_enabled=true`; `registration_enabled=false`, `otp_enabled=false`, `finance_enabled=false`. Database 29 tab. |

- **Pembayaran:** QRIS Statis DANA Bisnis milik Linggau AI Studio, keputusan pemilik 20 November 2026. Mayar dan Scalev **dibatalkan** sebagai jalur checkout. Sisa kode adaptor lama di repo bukan jalur pembayaran yang disetujui dan tidak boleh diaktifkan. Pemindaian QRIS oleh aplikasi pembayaran independen dan penerimaan dana riil **belum dibuktikan**.
- **Data keuangan historis STAGING:** satu order `PAID` perlu ditinjau (status dan kelayakan penerima komisi); satu order `PENDING` melewati batas waktu. Jangan kredit ulang atau bayar komisi tanpa rekonsiliasi.
- **Sumber bukan runtime:** commit ke `main` dan GitHub Pages tidak otomatis memperbarui Apps Script yang sedang dideploy. Kecocokan kode GAS di editor dengan repo **belum terbukti** (lihat `contracts/gas-runtime-source-manifest-2026-11-16.json`, snapshot historis).
- **Tes otomatis** (Node + Chrome headless di CI) tidak menggantikan uji transaksi riil, pemeriksaan hak akses, dan persetujuan go-live. Jumlah tes yang lulus dibaca dari hasil CI terbaru, bukan dari README ini.

Syarat go-live lengkap: [docs/GO_LIVE_GATE_2026-11-21.md](docs/GO_LIVE_GATE_2026-11-21.md).

## Yang ditawarkan

- **Belajar:** kurikulum praktis, Chapter 01, digital marketing, pengembangan usaha.
- **Aplikasi:** POS kasir, bio link, profil bisnis, katalog online.
- **Studio AI:** alat bantu konten dan pemasaran, paket kredit/token AI.
- **Produk digital:** eBook, template, panduan.
- **Jasa digital:** video iklan AI, website, landing page, aplikasi custom, konsultasi (lewat WhatsApp resmi, bukan checkout otomatis).
- **Membership dan affiliate:** akun pribadi, riwayat layanan, progres belajar, rujukan anggota 1 level sesuai kebijakan program.

**Chapter 01** (enam modul praktik: alat digital UMKM, Google Maps, Gemini AI, Canva, WhatsApp Business, kalender promosi) **gratis 100% dan tidak mewajibkan pembelian**. Dikelola lewat Google Classroom dan kanal komunitas, terpisah dari kursus berbayar di LMS internal.

## Arsitektur

- **Frontend:** HTML, CSS, JavaScript modular tanpa build, disajikan GitHub Pages (`index.html`, `js/`, `assets/`).
- **Backend:** Google Apps Script (`apps-script/`), satu web app dengan `doGet` (identitas, hanya baca) dan `doPost` (aksi bernama + `request_id` idempoten).
- **Database:** Google Sheets (produksi dan STAGING dipisah ketat).
- **Panel STAGING:** `staging/` (noindex), terkunci ke deployment GAS STAGING yang disetujui di `staging/config.js`.
- **Autentikasi:** OTP WhatsApp (Fonnte) untuk member, PIN terpisah untuk Admin, sesi disimpan sebagai hash.
- **Rahasia:** kunci API, token, pepper, dan PIN hanya di Script Properties Apps Script. Jangan pernah ke repo atau HTML publik.

## Saklar rilis (Script Properties, sisi server)

`NGD_MUTATIONS_ENABLED`, `NGD_FINANCE_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, `NGD_EXTERNAL_PROVIDERS_ENABLED`, `NGD_PIN_HASH_V2_ENABLED`.

Semuanya fail-closed. Frontend (`config.js`) hanya mencerminkan, bukan menjadi batas keamanan. Mengubah saklar produksi memerlukan persetujuan pemilik tertulis.

## Menjalankan tes

Perlu Node.js 22 atau lebih baru. Tanpa dependensi dan tanpa `npm install`.

```
npm test
# atau
node --test tests/*.test.cjs
```

`tests/repo-integrity.test.cjs` menjaga hal mendasar: sintaks semua file `.gs`, tidak ada nama fungsi ganda lintas file GAS (di Apps Script semua file berbagi satu namespace global), semua aset yang dirujuk HTML ada, tidak ada rahasia di repo, dan konfigurasi publik konsisten.

## Deploy backend (manual)

1. Salin file `apps-script/*.gs` yang berubah ke proyek GAS yang benar (STAGING dahulu), tanpa menimpa modul khusus STAGING.
2. Simpan, jalankan fungsi diagnostik read-only, lalu perbarui deployment web app yang **sama**.
3. Pastikan identitas endpoint lewat `doGet` sebelum menganggap sinkron.

## Dokumen

- **Aktif:** [PROJECT_CONTROL.md](PROJECT_CONTROL.md) (satu-satunya berkas kendali operasional), [AGENTS.md](AGENTS.md), [docs/GO_LIVE_GATE_2026-11-21.md](docs/GO_LIVE_GATE_2026-11-21.md).
- **Keputusan:** [Master Index](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit) dan [Keputusan Final QRIS DANA Bisnis](https://docs.google.com/document/d/1ovN2xl7UB1R0NN1_O3rJArJRolvZC1ar3yPxrFTpX8U/edit) di Google Drive adalah otoritas kebijakan. Draf Mayar/Scalev yang telah diarsipkan tidak boleh dipakai.
- **Historis:** semua berkas lain di `docs/` bertanggal lebih lama adalah rekam jejak, bukan izin untuk mengaktifkan fitur.

## Catatan publikasi

GitHub Pages menyajikan seluruh isi repo, termasuk `docs/`, `tests/`, dan `apps-script/`. `robots.txt` hanya imbauan untuk mesin pencari, bukan pembatas akses. Karena itu tidak ada rahasia yang boleh disimpan di repo.

© 2026 Ngulik Digital / Linggau AI Studio.

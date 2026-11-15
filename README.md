# Ngulik Digital

**Membership digital dan ekosistem solusi UMKM dari Linggau AI Studio.**

Belajar keterampilan digital, menemukan aplikasi usaha, mengakses alat bantu AI, membeli produk digital, mengikuti program komunitas, dan mengajukan jasa kreatif dalam satu layanan.

**Website:** https://cuan74468-ux.github.io/ngulik-digital-member/

## Apa yang ditawarkan

- **Belajar:** kurikulum praktis, Chapter 1, materi digital marketing, serta pengembangan usaha.
- **Aplikasi:** POS kasir, bio link, profil bisnis, katalog online, dan solusi operasional UMKM.
- **Studio AI:** perangkat bantu konten, pemasaran, dan paket kredit AI.
- **Produk digital:** eBook, template, panduan dan materi pendukung.
- **Jasa digital:** video iklan AI, website, landing page, aplikasi custom dan konsultasi.
- **Membership & affiliate:** akun pribadi, riwayat layanan, aktivitas pembelajaran, serta rujukan anggota sesuai kebijakan program.

## Belajar bersama melalui Chapter 01

Program komunitas **Ngulik Digital Chapter 01** mempunyai enam modul praktik yang telah disusun dalam [materi pembelajaran resmi](https://docs.google.com/document/d/1s3Dki-UQVG2OUOpCBNPxyeCTkIvnZTpqtPOn2SpXkk4/edit). Materinya mencakup penggunaan alat digital untuk UMKM, Google Maps, Gemini AI, Canva, WhatsApp Business, dan kalender promosi. Sesuai [SOP komunitas](https://docs.google.com/document/d/1PGKFnPfSKVQ0SRFclgT5aN8_x2iipnW8ng6g2H24xVg/edit), **materi dan pendampingan dasar Chapter 01 tidak dikenakan biaya dan tidak mewajibkan pembelian**. Program ini dikelola melalui Google Classroom dan kanal komunitas; tidak sama dengan kursus berbayar yang kelak dibuka di LMS internal.

## Pengalaman anggota

1. Jelajahi katalog dan pilih produk atau kelas yang sesuai kebutuhan.
2. Daftar atau masuk ke akun pribadi ketika keanggotaan dibuka.
3. Akses materi, produk, dan layanan yang sudah menjadi hak anggota.
4. Ajukan brief untuk jasa custom, lalu tinjau penawaran resmi sebelum membayar.
5. Pantau pesanan, progres kelas, referral, dan bantuan melalui dashboard.

## Operasional dan kepercayaan

Informasi publik dan katalog dibaca dari API resmi Ngulik Digital. Hak akses pribadi, harga transaksi, kredit AI, serta pembayaran harus diverifikasi pada sisi server.

**Status layanan saat ini:** katalog publik telah terhubung dan diperiksa. Pendaftaran baru, penyimpanan data anggota, penagihan online, serta transaksi kredit AI belum dibuka sampai pemeriksaan operasional dan pembayaran diselesaikan. Hal ini tidak mengubah tujuan platform sebagai membership komersial.

Kode akses, token sesi, PIN, dan API key tidak disimpan di repositori atau disematkan ke HTML publik.

## Status operasional terverifikasi — 15 November 2026

**Tahap aktif: Tahap 1 — Auth WhatsApp, PIN dan sesi. Status PROSES / NO-GO untuk pendaftaran publik, OTP live, pembayaran, AI berbayar dan komisi.** Ini platform membership komersial sungguhan; sakelar keselamatan tidak boleh disalahartikan sebagai mode demo.

- [Panel administrator STAGING](https://cuan74468-ux.github.io/ngulik-digital-member/staging/) sudah terhubung ke deployment GAS yang membuktikan identitas `NGD_STAGING` secara baca-saja.
- [Pengujian identitas dan Chrome](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43716789442) lulus. Panel mengunci URL ke deployment yang telah disetujui; PIN tidak pernah dikirim ke endpoint lain.
- Database STAGING memakai 29 tab (27 kontrak backend + dua tabel OTP/WA); satu sesi ADMIN tercatat. Belum ada record OTP maupun transaksi.
- Source OTP di GitHub diberi guard agar bukti `wa_verified` tersimpan; **perubahan kode GitHub tidak otomatis memperbarui Apps Script yang sedang dideploy**.

Untuk konteks paling mutakhir baca [Audit Terpadu Tahap 1](docs/AUDIT_TERPADU_TAHAP_1_2026-11-15.md) dan [Aturan Kerja Agen](AGENTS.md). Dokumen Master Index dan Mandat Produksi di Google Drive tetap merupakan otoritas kebijakan. Dokumen checkpoint bertanggal lebih lama adalah rekam historis, bukan persetujuan untuk menjalankan tahap selanjutnya.

## Informasi pengembang dan operasional

- **Frontend:** HTML, CSS, JavaScript modular, GitHub Pages.
- **Layanan data:** Google Apps Script dan Google Sheets.
- **Manajemen kelas & konten:** modul Ngulik Digital, Google Classroom, dan integrasi pembelajaran bertahap.
- **Pembayaran terencana:** Mayar.id / QRIS resmi, dengan verifikasi dan rekonsiliasi sebelum aktivasi hak akses.

**Keputusan persiapan:** akun Fonnte, gateway pembayaran, model AI dan layanan eksternal baru dibuat di tahap integrasi akhir. Seluruh provider tetap nonaktif; pemeriksaan 29 tab dan kontrol QA dapat disiapkan tanpa vendor.

Dokumen kerja:
- [Fondasi internal — provider terakhir](docs/INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md)
- [Audit kesiapan 29 tab STAGING](docs/AUDIT_TERPADU_TAHAP_1_2026-11-15.md)
- [Arsitektur membership komersial](docs/COMMERCIAL_MEMBERSHIP_RELEASE_2026-11-14.md)
- [Prosedur keamanan dan pemeriksaan operasional](docs/PILOT_50_GO_LIVE_GATE_2026-11-14.md)
- [Checkpoint pengembangan](docs/CHECKPOINT_2026-11-14.md)
- [Arsip catatan teknis terdahulu](docs/ARCHIVE_README_BEFORE_MEMBERSHIP_2026-11-14.md)

© 2026 Ngulik Digital / Linggau AI Studio.

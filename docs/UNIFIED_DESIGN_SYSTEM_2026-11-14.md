# Ngulik Digital — Unified Visual System (Slate & Ink)

**Tanggal:** 14 November 2026  
**Target:** GitHub Pages (HTML, CSS, native JavaScript tanpa build)  
**Cakupan:** beranda publik, katalog, belajar/LMS, Studio AI, affiliate, bantuan, akun, panel admin, workspace materi, modal dan formulir. Desktop, tablet, mobile menggunakan satu sistem visual.

## Arah dan batasan referensi

Referensi yang diberikan pengguna adalah mockup mobile dengan **kanvas biru-abu muda, panel putih yang ringan, tipografi hitam, kontrol berbentuk pil, navigasi aktif hitam, grafik beraksen biru, ruang kosong proporsional, dan tombol sederhana**. Ini dipakai **sebagai referensi visual semata**. Nama SubPilot, daftar langganan, logo Spotify/Netflix/Adobe, mata uang USD, data grafik, serta fitur pengelolaan subscription **tidak ditambahkan ke Ngulik Digital**.

Tidak ada perubahan pada database, API, otorisasi, produk, harga, pembayaran, logika LMS, atau data pengguna. Tema adalah lapisan presentasi.

## Design tokens

| Token | Nilai | Tujuan |
| --- | --- | --- |
| Canvas | `#F2F4F8` | Seluruh ruang aplikasi, mobile dan desktop |
| Surface | `rgba(255,255,255,.88)` | Kartu, panel, formulir, LMS, admin |
| Ink | `#0E1320` | Tipografi utama, tombol primer, navigasi aktif |
| Muted | `#6B7385` | Penjelasan, label sekunder |
| Blue | `#4361EE` | Progres, state informatif dan visualisasi |
| Blue soft | `#E8ECFF` | Ikon dan pendamping data |
| Red | `#E2505E` | Indikator peringatan/aksen kecil |
| Line | `#E4E8F0` | Pemisah ringan dan form outlines |
| Radius | `24px` | Kartu utama |
| Font | `DM Sans` + `Plus Jakarta Sans` | Body dan heading |

Tombol tindakan utama dan navigasi terpilih **charcoal hitam**, bukan hijau atau ungu. Biru digunakan sebagai aksen data/progres, bukan mengubah makna data dari backend.

## Implementasi sumber

- `assets/app.css`: stylesheet dasar/fungsi dan layout asli. Tidak dihapus untuk menjaga kompatibilitas fitur lama.
- `assets/member-mobile.css`: perilaku/komponen LMS member mobile yang sudah ada. Tetap dimuat untuk kompatibilitas rute khusus.
- **`assets/unified-theme.css`**: lapisan tema global yang dimuat **terakhir** dalam `index.html` agar semua layar (termasuk ADMIN) menggunakan token yang sama.
- `js/app.js`: menambahkan atribut `aria-label` pada navigasi mobile ikon saja, tanpa mengubah mapping rute atau hak akses.
- `tests/layout-probe.js`: memeriksa variabel tema aktual yang dihitung browser, navigasi aktif, viewport, overflow horizontal, serta disabled purchase.
- `.github/workflows/validate.yml`: menambah pengujian Chrome headless untuk publik/member/admin pada desktop dan mobile.

## Aturan responsif

- **Desktop > 760px:** sidebar tetap terlihat; tombol menu aktif charcoal, workarea biru-abu muda, panel putih dengan spacing konsisten, topbar translucent.
- **Tablet 761–1120px:** sidebar lebih ringkas, panel workspace dapat menjadi satu kolom bila tidak cukup tempat.
- **Mobile ≤760px:** sidebar digantikan bilah navigasi ikon **mengambang di bagian bawah** dengan label aksesibilitas; topbar dan konten memakai palet identik dengan desktop.
- **Layar kecil ≤385px:** margin dan ring progres diperkecil seperlunya, tidak boleh memicu horizontal overflow.
- **Reduced motion:** transisi/animasi dinonaktifkan saat preferensi sistem meminta.

## Komponen yang wajib konsisten

1. Brand/header/sidebar dan mobile bottom navigation.
2. Hero, sambutan, metrik/dashboard, ring progres, insight.
3. Kartu produk, tombol checkout disabled, status, empty state.
4. Kartu course, workspace LMS, editor pelajaran, AI draft, layar selesai.
5. Input, select, textarea, tab/filter, tabel, daftar.
6. Admin member, order, waiting list, ticket/release management.
7. Modal, toast, banner demo, account/profile, halaman login.

## Kriteria penerimaan / QA

- Tidak ada lagi kombinasi tema **hijau desktop + ungu mobile**.
- CSS terakhir termuat di seluruh rute; browser membaca `--bg=#f2f4f8`, `--green=#0e1320` (token kompatibilitas lama kini mengacu ke charcoal).
- Item navigasi aktif computed `rgb(14,19,32)` pada desktop dan mobile.
- Mobile navigation tetap berada di dalam layar dengan ruang tepi cukup; menu memiliki accessible name.
- Tidak ada horizontal overflow pada 375px, 390px dan desktop 1280px.
- Demo/preview: login, pendaftaran, pembayaran, mutasi LMS, notifikasi tetap tidak aktif; tidak ada pemanggilan backend dalam mode offline preview.
- Test Node `node --test tests/*.test.cjs`; smoke Chrome headless di workflow `validate.yml`. **CI lulus bukan bukti visual QA pada perangkat Android/Windows fisik.**

## Release / rollback

- Perubahan tema berada di `main` sesuai instruksi pemilik; default demo dan server action gates tidak berubah.
- Jika warna lama terlihat setelah update GitHub Pages, lakukan refresh paksa agar `unified-theme.css?v=20261114` termuat.
- Rollback visual: cabut link stylesheet `assets/unified-theme.css` dari `index.html` dan pulihkan metadata theme-color; tidak perlu rollback database.
- Kode dan style dapat dianggap **selesai pada source** setelah CI SHA terbaru sukses, tetapi status publikasi GitHub Pages dan pengujian perangkat nyata tetap harus dicek terpisah.


## Pembaruan 14 Nov 2026 (rapikan konsistensi)

- `assets/unified-theme.css` ditulis ulang: satu palet, satu pola kepala halaman, satu rupa kartu/tombol. Tambalan "native-app" lama (palet indigo/ungu kedua, `display:none` pada teks deskripsi, batas lebar desktop 760px) dihapus.
- `assets/member-mobile.css` kini hanya struktural (tanpa warna) sehingga tidak lagi menimpa tema dengan ungu.
- Kelas yang dipakai JS tetapi sebelumnya tanpa gaya kini ditata: `catalog-admin-*`, `catalog-check(s)`, `service-*`, `service-cta`.
- Desktop memakai lebar konten hingga 1240px; katalog `auto-fill`; beranda tamu dua kolom di ≥900px.
- Judul sidebar dinamis (Panel admin / Ruang belajar / Menu); ikon navigasi admin dibedakan; logo "n." diperbaiki.
- Tes `static-contract` disesuaikan dengan endpoint publik read-only yang memang ada di `config.js`.

## Audit lanjutan: konsistensi panel admin dan pemeriksaan backend (14 November 2026)

Implementasi pada branch `main`:

- Navigasi admin mobile memiliki akses langsung ke dasbor, katalog, pesanan, LMS, dan akun; command bar horizontal menampilkan **seluruh** modul, termasuk permintaan jasa, member, support, rilis, dan waiting list. Rute detail tetap menandai induk menu aktif.
- Dashboard admin, katalog, jasa, akun administrator, dan komponen bantuan memakai aturan kartu, form, tombol, tabel, jarak, dan warna Slate & Ink yang sama. Akun admin tidak lagi menampilkan tindakan affiliate member.
- `refreshPublic()` menerapkan hasil metadata dan katalog secara independen; kegagalan satu endpoint tidak membuang data valid endpoint lain.
- `restoreSession()` hanya menghapus sesi lokal ketika server menolak akses (UNAUTHORIZED/FORBIDDEN), bukan karena gangguan jaringan sementara.
- Source Apps Script `NGD.VERSION=1.0.1` menambahkan `adminGetRuntimeStatus` (admin-only, read-only). Ringkasannya memeriksa 26 tab terhadap header yang diwajibkan dan status feature gates tanpa mengirim DB ID, secret, PIN, data member, atau token.
- Dashboard hanya menampilkan hasil pemeriksaan bila deployment Apps Script mendukungnya; versi backend lama dilaporkan sebagai belum tersedia, **tidak** dianggap GO-LIVE.
- `index.html` memakai query versi aset `20261114-admin4` untuk mencegah cache UI lama.
- CI pada akhir penyempurnaan source: **261 tes Node lulus, 0 gagal**; smoke Chrome dan browser POST baca-saja berhasil. Verifikasi harus dilakukan ulang setelah setiap commit berikutnya.

**Batas operasional:** Source Apps Script pada GitHub bukan deployment Web App yang aktif. Google Sheets produksi masih 14 tab dan staging telah diperiksa 26/26 header pada audit terkait; jangan mengaktifkan penulisan, pembayaran, atau migrasi produksi hanya berdasarkan hasil CI frontend. Deployment backend, pemeriksaan target `NGD_DB_ID`, migrasi forward-only dengan backup, pengujian login/CRUD sesungguhnya, dan verifikasi Mayar masih dibutuhkan.

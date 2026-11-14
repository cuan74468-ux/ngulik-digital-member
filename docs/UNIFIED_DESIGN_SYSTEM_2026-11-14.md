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
| Canvas | `#E6ECF4` | Seluruh ruang aplikasi, mobile dan desktop |
| Surface | `rgba(255,255,255,.88)` | Kartu, panel, formulir, LMS, admin |
| Ink | `#171B22` | Tipografi utama, tombol primer, navigasi aktif |
| Muted | `#626E7E` | Penjelasan, label sekunder |
| Blue | `#2D5EAA` | Progres, state informatif dan visualisasi |
| Blue soft | `#DCE8FA` | Ikon dan pendamping data |
| Red | `#E2505E` | Indikator peringatan/aksen kecil |
| Line | `#DCE4ED` | Pemisah ringan dan form outlines |
| Radius | `22px` | Kartu utama |
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
- CSS terakhir termuat di seluruh rute; browser membaca `--bg=#e6ecf4`, `--green=#171b22` (token kompatibilitas lama kini mengacu ke charcoal).
- Item navigasi aktif computed `rgb(23,27,34)` pada desktop dan mobile.
- Mobile navigation tetap berada di dalam layar dengan ruang tepi cukup; menu memiliki accessible name.
- Tidak ada horizontal overflow pada 375px, 390px dan desktop 1280px.
- Demo/preview: login, pendaftaran, pembayaran, mutasi LMS, notifikasi tetap tidak aktif; tidak ada pemanggilan backend dalam mode offline preview.
- Test Node `node --test tests/*.test.cjs`; smoke Chrome headless di workflow `validate.yml`. **CI lulus bukan bukti visual QA pada perangkat Android/Windows fisik.**

## Release / rollback

- Perubahan tema berada di `main` sesuai instruksi pemilik; default demo dan server action gates tidak berubah.
- Jika warna lama terlihat setelah update GitHub Pages, lakukan refresh paksa agar `unified-theme.css?v=20261114` termuat.
- Rollback visual: cabut link stylesheet `assets/unified-theme.css` dari `index.html` dan pulihkan metadata theme-color; tidak perlu rollback database.
- Kode dan style dapat dianggap **selesai pada source** setelah CI SHA terbaru sukses, tetapi status publikasi GitHub Pages dan pengujian perangkat nyata tetap harus dicek terpisah.

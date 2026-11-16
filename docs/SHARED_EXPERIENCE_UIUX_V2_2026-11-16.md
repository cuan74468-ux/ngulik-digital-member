# UI/UX Mobile-first v2 — Ngulik Digital Member
**16 November 2026** · Status: implemented as a visual-only GitHub Pages layer.

## Arah produk
Satu identitas Clean · Human · Alive dari Linggau Design System. Gaya utama: Calm Product UI, latar slate terang #F2F4F8, surface putih, teks/CTA charcoal #0E1320, aksen informasional #4361EE, font UI DM Sans, judul Plus Jakarta Sans. Komponen memakai radius 11/16/20px, jarak 4/8/12/16/24/32/48px dan target interaksi 44–48px.

## Source dan cakupan
- assets/experience.css: shared stylesheet final yang mencakup publik, katalog, login, profil, member, LMS, jasa, affiliate, bantuan, admin CMS dan operations STAGING.
- index.html: body ngd-public-app dan shared stylesheet setelah unified-theme.css.
- staging/index.html: body ngd-ops-app dan stylesheet yang sama setelah admin.css. ID auth, form, tombol, pinning endpoint dan menu tetap sama.
- tests/frontend-mobile-first-v2.test.cjs: regresi source visual, keamanan config, responsive dan aksesibilitas.
- tests/layout-probe.js, tests/staging-layout-probe.js dan CI Chrome: verifikasi computed theme, overflow, navigasi dan visibilitas login di viewport mobile/desktop.

## Komponen dan anatomi
Public: header ringkas, area konten lega, carousel/hero, kategori dan katalog konsisten. Member: welcome, progres, ringkasan aktivitas, card akses, jalur belajar. LMS: daftar modul dan workspace editorial, form dan state tindakan. Admin utama: menu, data-table dengan scroll lokal, konten CMS, katalog, forms dan modal. Admin STAGING: koneksi+login, ringkasan, tab pekerjaan, metrik, data-table dengan bahasa visual yang sama.

Mobile 320–760px: padding 16–20px, grid menjadi satu kolom sesuai kebutuhan, touch controls ≥44px, nav bawah tetap mengambang dan tidak menutup konten, tabel horizontal-scrolling hanya dalam container. Tablet dan desktop: konten maksimum 1260px, sidebar yang sudah ada tetap tersedia. Semua role menggunakan warna/tipe font dasar yang sama; panel admin tetap fungsional.

## Keamanan dan kebijakan
Tidak mengubah js/app.js, admin.js, Code.gs, Apps Script, Sheets, auth/OTP, session, feature flags, harga, saldo/ledger, entitlements, endpoint ataupun penyedia luar. Tidak memasang paket/runtime build, remote image atau key baru. UI publik tidak diberi placeholder transaksi yang menyesatkan.

## QA dan rollback
Node tests dan GitHub Actions Chrome smoke pada checkout SHA final wajib lulus, disusul review Android fisik, tablet, desktop, fokus keyboard, modal dan empty/error states. CI browser tidak sama dengan signoff pengguna nyata.
Rollback visual: revert commit UI atau hapus dua link experience.css dan body class; database tidak perlu dipulihkan. CSS lama sengaja tidak dihapus agar halaman dan class yang digunakan JS tetap kompatibel. Consolidate legacy overrides pada iterasi visual berikut setelah QA, bukan dengan penghapusan serentak.

**Release tetap Tahap 1 PROSES/NO-GO.** Keputusan foundation-first/providers-last tetap berlaku.

## Iterasi penyempurnaan navigasi dan keterbacaan — 16 November 2026

Pemeriksaan kode menemukan penyebab UX nyata: beberapa kalimat pengantar, label halaman dan jumlah hasil katalog disembunyikan oleh rules mobile legacy; dan banyak menu member/admin tidak terlihat di lima tab bawah. Karena pemakai harus dapat menemukan fitur, source diperbaiki dengan **rute Menu** (daftar seluruh modul sesuai role) sebagai tab kelima. Profil tetap bisa dibuka dari tombol akun topbar dan dari menu. Modul admin yang tidak muat di tab bawah tampil dalam daftar menu, tidak ada otorisasi baru ataupun bypass login.

Form admin STAGING diprioritaskan pada mobile: navigasi yang masih terkunci dan panel ilustrasi disembunyikan secara presentasi, nav operasional muncul setelah sesi aktif. Deskripsi yang membantu orientasi kembali ditampilkan. Input memiliki font minimal 16px agar tidak memicu zoom otomatis iOS. Regresi VM menegaskan menu member/admin/guest tersedia tanpa memanggil API pada preview; Chrome menguji layout lintas role. Tidak ada perubahan schema, Script Properties, atau provider.

## Cache dan pengujian visual navigasi pada versi 2

CSS publik, CSS operations dan JavaScript SPA memperoleh query version baru agar ponsel yang pernah membuka situs tidak terus memakai kode lama dari cache. Unit test dan browser Chrome menjalankan rute #menu pada 390 px, menguji 8 tautan member, 12 modul admin, visibilitas teks bantuan di heading serta bebas overflow horizontal. Browser juga menguji penyembunyian panel dekorasi dan nav terkunci pada halaman STAGING sebelum login, tanpa mematikan navigasi setelah autentikasi.

# Handoff CMS Visual & Mobile Native — Ngulik Digital

**Tanggal:** 14 November 2026  
**Basis:** GitHub Pages frontend + Google Apps Script + Google Sheets.  
**Status:** Source implementasi di `main`; integrasi GAS dan migrasi staging harus dikonfirmasi sebelum CRUD aktif.

## Hasil audit kebutuhan admin

| Ranah | Sumber data / fitur kode | Admin UI aktual | Gap untuk operasi nyata |
| --- | --- | --- | --- |
| Katalog harga dan status produk | `katalog_produk` | List, create, update, aktif/nonaktif | Akses edit belum diaktifkan di backend live; gambar terpisah melalui CMS |
| Kursus dan materi LMS | Tabel `lms_*` | Course, lesson, workspace, draft AI, publish/archive | Deployment/QA dan izin mutasi LMS belum aktif |
| Permintaan jasa | `service_requests` | Lihat brief, edit penawaran, status | Belum lengkap workflow invoice, persetujuan, pengiriman akhir |
| Support | `support_tickets`, `ticket_activities` | Tiket, status, prioritas, balasan | Integrasi live/QA dan notifikasi eksternal |
| Rilis produk | `product_releases` | Draft, dampak, publikasi | Verifikasi penerima dan operasional |
| Member dan antrean | `members`, `sessions` | Cari/lihat, beberapa tindakan status di backend | Manajemen role/undangan/izin granular belum lengkap di UI |
| Pesanan & affiliate | `orders`, `affiliate_commissions` | Daftar dan peninjauan | Checkout otomatis Mayar, settlement, refund, payout dan rekonsiliasi nyata |
| Pengaturan sistem | `pengaturan_sistem` | Sebagian aksi backend, UI terbatas | Panel CRUD konfigurasi penuh belum tersedia |
| **Banner, gambar, logo, ikon, cover** | **`site_content` (baru)** | **CMS visual baru: draft, edit, tayang, tarik, arsip, jadwal** | **Memerlukan deploy Apps Script, 27-tab schema, saklar aman, dan unggah gambar GitHub manual** |
| Teks halaman / FAQ / artikel / testimoni / legal | Sebagian teks masih hardcode | Belum CRUD lengkap | Perlu CMS editorial lanjutan dengan draft/revisi/publikasi |
| Media library upload | `assets/media/` | Input path gambar aman | Belum ada uploader biner terintegrasi |

**Kesimpulan:** Admin panel **belum** mencakup seluruh konfigurasi dan CRUD komersial. CMS visual merupakan tahap yang telah dibangun; bukan klaim bahwa seluruh kebutuhan admin sudah lengkap.

## Konten visual yang didukung

Jenis `HERO` untuk banner utama publik dan slot beranda member, `FEATURE_ICON` untuk ikon fitur, `PRODUCT_IMAGE` untuk gambar produk berdasarkan ID, `PAGE_COVER` untuk sampul publik (belajar, katalog, jasa, AI, affiliate, bantuan), `NAV_ICON` untuk ikon navigasi, dan `BRAND_LOGO` untuk logo. Gambar harus berasal dari path seperti `assets/media/banner-1.webp`. Ekstensi PNG/JPG/WebP/AVIF diizinkan; URL eksternal, path traversal, query string dan SVG diblokir pada CMS. File CSS dan dekorasi SVG internal lama tidak otomatis berubah menjadi aset pemilik; ketika gambar khusus tersedia, ia akan menggantikan ikon yang sesuai.

### Hero slide

- Semua `HERO/home` berstatus `PUBLISHED` yang sedang berada dalam tanggal tayang diambil secara berurutan dari server.
- Setiap slide dapat berisi gambar saja, atau gambar + judul + deskripsi + tombol internal yang tervalidasi.
- Perpindahan otomatis setiap sekitar 6,5 detik bila lebih dari satu banner; tersedia sebelumnya/berikutnya, dot, dan tombol jeda.
- Rotasi dihentikan ketika pengguna fokus pada slider, memilih jeda, halaman tidak aktif, atau sistem mengaktifkan pengurangan animasi.
- Gambar pertama dimuat segera; sisanya lazy-load; jika backend CMS belum tersedia, hero editorial tanpa gambar milik pemilik tetap menjadi fallback (bukan banner palsu).

## Langkah pengaktifan aman melalui browser

1. **Backup staging** terlebih dahulu; catat ID spreadsheet dan deployment GAS yang benar. Staging sebelumnya telah memiliki 26 tab dengan header sesuai, tetapi setiap migrasi harus memeriksa ulang saat dijalankan.
2. Buka **Google Apps Script** yang terhubung ke staging, sinkronkan **seluruh** file `apps-script/*.gs` dari commit terbaru (khususnya `Code.gs` dan `Content.gs`). Mengubah GitHub saja **tidak** memperbarui deployment GAS.
3. Di **Project Settings → Script Properties** staging, tetapkan:
   - `NGD_DB_ID` = ID spreadsheet **staging** yang akan dipakai;
   - `NGD_ENVIRONMENT` = `STAGING`;
   - `NGD_CONTENT_MIGRATION_ENABLED` = `true` sementara;
   - `NGD_CONTENT_MIGRATION_TARGET_ID` = ID spreadsheet staging yang sama persis.
4. Jalankan **`installContentSchemaStaging`** satu kali dari editor Apps Script. Fungsi itu memeriksa ke-26 tab lama dan menambahkan hanya tab `site_content`; jika struktur dasar berbeda, ia berhenti tanpa menulis. Jalankan ulang hanya untuk validasi idempoten.
5. Setel `NGD_CONTENT_MIGRATION_ENABLED` kembali `false`, dan simpan checkpoint struktur 27 tab.
6. Uji `getPublicContent` dan `adminListContent` pada **deployment staging**, serta validasi bahwa member biasa tidak dapat membuat/mengedit/publikasikan.
7. Setelah sesi admin, database, audit log dan rollback terverifikasi, aktifkan `NGD_MUTATIONS_ENABLED=true` dan `NGD_CONTENT_ENABLED=true` **hanya di staging**. Keputusan melepas release gate produksi adalah aktivitas terpisah karena saklar global membuka kelas mutasi lainnya.
8. Di frontend staging, `memberWritesEnabled` dan `contentEnabled` dapat disetel `true` untuk pengujian setelah server aman. Jangan melakukannya di website publik secara otomatis.
9. Upload gambar milik pemilik ke folder `assets/media/` melalui GitHub Web, pastikan URL 200, baru terbitkan kontennya.
10. Setelah tes end-to-end lulus, putuskan migrasi produksi forward-only dengan backup, deployment revisi GAS yang dapat dibatalkan, serta pemeriksaan saldo dan pembayaran. **Jangan** menjalankan installer staging terhadap spreadsheet produksi.

## Peringatan keamanan dan batas kapasitas

- Tidak ada API key, PIN, token, ataupun kredensial di file publik GitHub Pages.
- Konten admin wajib melalui sesi admin dan saklar mutasi khusus konten. Perubahan status diverifikasi menggunakan revisi dan audit log.
- Delete adalah **soft archive** sehingga banner lama dapat dipulihkan dan riwayat perubahan tidak hilang.
- Tanggal tayang dihitung pada zona waktu `Asia/Jakarta`.
- CMS mengelola **path aset**, bukan upload file biner. Untuk banyak kampanye jangka panjang, unggah gambar manual ke GitHub tetap ada biaya operasional waktu; penyimpanan media khusus dapat dipertimbangkan jika volume membesar.
- CI frontend dan tes Node tidak membuktikan integrasi login, pembayaran, atau CRUD nyata. Verifikasi pada staging wajib.

## URL penting

- Website: https://cuan74468-ux.github.io/ngulik-digital-member/
- Repository: https://github.com/cuan74468-ux/ngulik-digital-member
- Folder media: https://github.com/cuan74468-ux/ngulik-digital-member/tree/main/assets/media

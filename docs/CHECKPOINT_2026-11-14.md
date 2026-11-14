# Checkpoint Teknik — Ngulik Digital Member

**Tanggal:** 14 November 2026  
**Branch:** `main` · **Deployment:** tidak dilakukan · **Google Sheets:** tidak dimutasi · **Status:** pengembangan, bukan produksi.

## Ringkasan pembangunan

Berdasarkan checkpoint Apps Script 13 November: 14 tab/header tervalidasi, satu akun ADMIN ditemukan; `diagnosticApiPublic`, `diagnosticAuthReadOnly`, `diagnosticFinanceReadOnly`, dan `diagnosticReconciliationReadOnly` lulus pada data keuangan kosong. Pengujian itu tidak membuktikan transaksi end-to-end.

Pengerjaan GitHub 14 November menghasilkan:
1. **Backend**: flag server `NGD_MUTATIONS_ENABLED` default OFF untuk semua aksi tulis API dan trigger pemeliharaan; penguncian login untuk mengurangi balapan throttle PIN; menu Apps Script hanya inspeksi database baca-saja.
2. **Kredit dan affiliate**: koreksi kredit admin wajib integer, tidak boleh membuat saldo negatif, harus beralasan; pencairan komisi wajib bukti transfer dan verifikasi penerima. Status terkini saat kegagalan fulfillment sebagian harus dilaporkan sesuai yang tersimpan.
3. **Frontend**: dashboard member fokus aktivitas, katalog produk seed mode pratinjau, status kredit dan progres, akses belajar/AI/affiliate, navigasi mobile. `?preview=member` hanya menampilkan data lokal tiruan; tidak bisa bertransaksi. Penyalinan tautan referral tiruan dinonaktifkan.
4. **Security browser**: Content Security Policy di `index.html`, pembatasan URL, escape data untuk HTML, token hanya di tab browser dan tak masuk URL.
5. **Test**: `tests/backend-security.test.cjs` (fail closed), `tests/frontend-smoke.test.cjs` (render, pratinjau, XSS), `tests/static-contract.test.cjs` (file referensi, konfigurasi dan probe). `tests/transport-probe.html` menguji GET/POST **baca-saja** saat URL staging tersedia.
6. **CI**: `.github/workflows/validate.yml` meliputi empat file test `node --test`, dengan pembatalan run yang redundan; tidak melakukan deploy.

## Bukti pengujian saat ini

| QA | Hasil | Batasan |
|---|---|---|
| Sintaks file JS yang diverifikasi | Lulus 9/9 pada V8 | Bukan browser riil |
| Aturan bisnis murni | Lulus 37/37 assertions pada V8 | Tidak akses Apps Script |
| Server mutation gate | 11/11 jenis aksi mutasi ditolak; 0 pemanggilan Google Sheets pada mock | Belum dijalankan di Apps Script staging |
| Frontend guest + preview member | Render berhasil di simulasi browser | Belum visual QA Android/Windows |
| GitHub Actions | Workflow tersimpan | **Run/hasil CI belum terverifikasi** |
| Google Sheets aktif | Tidak diubah | DB eksisting berada di akun Google pemilik |

## Release blockers

**P0:** CORS browser dari GitHub Pages ke GAS `ContentService` redirect Googleusercontent; autentikasi nyata; pemulihan transaksi multi-sheet yang tidak atomik; bukti penerimaan/refund dana; uji komisi dan payout; peninjauan keamanan PIN 6 digit; audit data pribadi; pengujian staging.

**P1:** UI admin untuk operasi terotorisasi, konten modul asli, AI API SobatAgent yang terdokumentasi, peringatan/pemberitahuan, penerbitan legal/ketentuan/kebijakan privasi, QA visual dan aksesibilitas Android/Windows.

**Belum siap rilis** sampai seluruh syarat di [RELEASE_GATES_2026-11-14.md](RELEASE_GATES_2026-11-14.md) terpenuhi.

## Perintah QA yang sudah disimpan

```bash
node --test tests/backend-pure.test.cjs tests/backend-security.test.cjs tests/frontend-smoke.test.cjs tests/static-contract.test.cjs
```

Node.js hanya untuk menjalankan tes di CI, bukan untuk membangun frontend. Jangan set `NGD_MUTATIONS_ENABLED=true` di Apps Script aktif sekarang.

## Langkah teknis berikut

1. Periksa GitHub Actions run terbaru, identifikasi test gagal bila ada, perbaiki di repo.
2. Tuntaskan ketidakpastian transport GitHub Pages–Apps Script pada staging dengan probe GET/POST tanpa kredensial.
3. Siapkan database dan deployment staging terisolasi, backup, lalu uji siklus anggota–order–kredit–komisi–refund dengan gangguan simulasi.
4. Perbaiki backend dari temuan staging, tanpa mengubah database aktif.
5. Selesaikan operasional admin, UX mobile, keamanan PIN, dan dokumentasi kebijakan.
6. Hanya setelah itu ajukan persetujuan rilis dan satu kali sinkronisasi final Apps Script.

**Keputusan permanen checkpoint:** tidak reset database aktif, tidak mengaktifkan pembayaran, tidak menyalin ulang `Code.gs` berkali-kali selama sumber masih dikembangkan.

## Addendum — hardening transaksi & hak akses (14 November 2026)

Perubahan kode yang **disimpan di GitHub**, bukan pada Apps Script aktif:

- `getOrder` diubah menjadi baca-saja sepenuhnya. Order lewat tenggat menampilkan `past_due` virtual, sedangkan perpindahan status kedaluwarsa dijalankan lewat jalur mutasi yang dibatasi saklar server.
- Respons order milik member menggunakan daftar kolom aman; `request_id`, `verified_by`, `ref_member_id`, `catatan_admin`, dan `_row` tidak ikut dikirim.
- ID order baru menggunakan 12 karakter acak dari UUID, bukan empat. Kode unik pembayaran kini memeriksa seluruh rentang, bukan hanya 25 percobaan random. Retry request tidak dapat memilih produk berbeda menggunakan ID permintaan sama.
- Admin tidak bisa menandai `PAID` tanpa `dana_diterima:true` dan `referensi_pembayaran` yang valid. Ini **bukan** integrasi otomatis bank; operator tetap wajib memeriksa penerimaan dana.
- Refund otomatis **dibatasi hanya untuk TOPUP_KREDIT** setelah pembayaran benar-benar dikembalikan secara eksternal dan kredit awal masih tersedia untuk dibalik. Debit berdasarkan jumlah kredit di ledger original, bukan katalog yang dapat berubah. Refund layanan lain membutuhkan rekonsiliasi manual.
- Pengajuan dan pencairan komisi memeriksa status order asal (`PAID` atau `FULFILLED`); komisi orphan, dibatalkan, atau direfund ditolak.
- Pencatatan klik pengunjung anonim membutuhkan saklar terpisah `NGD_CLICK_TRACKING_ENABLED=true`; default **OFF** sampai kebijakan privasi dan anti-abuse disetujui.
- Aktivasi lisensi POS dan seat Canva membutuhkan bukti admin serta penanda `[ADMIN_FULFILLMENT_ATTEMPT]` yang ditulis **sebelum** hak akses member diubah. Jika terjadi kegagalan sesudahnya, retry diblokir untuk rekonsiliasi manual.
- Rekonsiliasi tidak lagi menganggap semua pesanan `PAID` untuk layanan manual sebagai kegagalan: aktivasi POS/Canva baru ditandai terlambat setelah 48 jam.

**Bukti pengujian V8 terisolasi pada sesi ini:** 39 dari 39 pemeriksaan aturan bisnis murni (12 antrean, 12 keuangan, 15 pengaturan); 9 skenario dasar refund/privasi; 3 skenario verifikasi penerimaan dana; 7 skenario pengajuan komisi; 5 skenario penanda aktivasi/penolakan retry. Pengujian ini **bukan** bukti eksekusi Node.js CI atau Apps Script staging. Skrip Node test sudah ditambah dan workflow mengikutsertakannya, tetapi status run CI belum diverifikasi.

**Risiko tetap terbuka:** tidak ada rollback atomik lintas tab Sheets, pemulihan manual dari partial failure membutuhkan SOP dan bukti transaksi, keamanan PIN harus ditinjau, belum ada pengujian koneksi CORS/lintas-origin nyata, UI admin belum sepenuhnya operasional, dan pengujian Android/Windows belum selesai.

## Addendum final — verifikasi hardening dan privasi source

**Pekerjaan baru di repository `main`**:
- `orderView_` member menyaring catatan admin, ID permintaan, identitas verifikator, dan data referral internal.
- `getOrder_` read-only; kedaluwarsa hanya disajikan sebagai `past_due` sampai diproses jalur mutasi yang sah.
- Persetujuan pembayaran perlu konfirmasi dana diterima dan bukti settlement.
- Refund otomatis ditahan untuk layanan non-topup; topup menggunakan jumlah ledger original, dengan pemeriksaan saldo belum terpakai.
- Komisi affiliate diperiksa terhadap status order asal sebelum payout.
- Aktivasi lisensi POS/seat Canva menulis penanda percobaan lebih dulu, lalu mengubah akses; retry pascakegagalan diblokir untuk rekonsiliasi manual.
- Pelacakan klik publik menggunakan saklar kedua default mati.
- Fungsi reset PIN admin dan setup awal dilindungi saklar mutasi.
- ID spreadsheet dan nomor admin tidak lagi di-hardcode dalam source terkini; `db_()` memakai Script Property `NGD_DB_ID` atau spreadsheet terikat bila tersedia. Seed WA admin menggunakan `NGD_ADMIN_WA`. Nilai lama masih mungkin tercantum dalam riwayat commit, sehingga pengaturan sharing Google Sheets tetap penting.

**Pengujian yang dieksekusi pada sesi ini:** sintaks 14 file JS/GS/CJS berhasil diparse; aturan bisnis murni 39/39; 11 jenis aksi mutasi ditolak oleh simulasi server saat saklar mati (nol akses database); reset PIN admin juga ditolak; simulasi pengamanan refund, verifikasi dana, payout, dan kegagalan aktivasi menunjukkan hasil yang diharapkan.

**Pengujian yang belum terbukti:** GitHub Actions/Node test suite lengkap (API status commit belum memberikan hasil check), Apps Script staging, CORS browser nyata, pembayaran riil/QRIS, QA visual Android/Windows. Tes Node dan workflow sudah disimpan di repo, tetapi **jangan menyebut semua tes otomatis lulus** tanpa bukti run.

**Tidak dilakukan:** pembaruan Google Sheets, penggantian kode di Apps Script terikat, pengubahan Script Properties aktif, deployment GitHub Pages, transaksi nyata, perubahan QRIS, maupun reset database.

**Langkah wajib sebelum sinkronisasi Apps Script:** pilih spreadsheet staging, set `NGD_DB_ID` melalui Project Settings untuk konteks Web App, biarkan mutasi tetap OFF, validasi browser POST/GET tanpa kredensial, baru lakukan uji integrasi secara bertahap. Jangan otomatis mengaktifkan flag sebagai respons atas tes gagal.

## Addendum pengembangan — pengujian dan integritas data lanjutan

**Tanggal:** 14 November 2026. **Lingkungan:** repository GitHub `main`, bukan Apps Script aktif.

### Perubahan kode

1. **Input ke Google Sheets aman dari formula injection**: `sheetLiteral_` mengubah teks berawalan karakter formula menjadi nilai literal pada `appendRow_` dan `updateRow_`.
2. **Pembaharuan beberapa kolom dalam satu baris**: `updateRow_` memvalidasi seluruh nama kolom lebih dahulu, lalu menulis satu rentang dengan `setValues` sambil mempertahankan rumus dalam rentang yang tidak diubah. Ini mengurangi kegagalan parsial per baris, tetapi tidak memberikan transaksi atomik antar-tab.
3. **Kredit sambutan**: pengaturan awal 0 diakui sebagai 0, bukan kembali menjadi 10; validasi dilakukan sebelum menambah member; `saldo_setelah` dihitung dari saldo ledger sebenarnya.
4. **Ledger idempoten**: topup, refund kredit, dan `adminAdjustCredit` menggunakan referensi yang diperiksa terhadap member, jumlah, dan jenis posting. Admin menggunakan `request_id` stabil. Retry negatif yang identik tidak mendebit ulang; debit baru tidak boleh membuat saldo negatif.
5. **Aktivasi produk**: pembelian lisensi POS sekali bayar yang sudah aktif/menunggu ditolak, tetapi retry order yang sama tetap diperbolehkan. Pembelian perpanjangan Canva tidak merubah status layanan yang sudah aktif menjadi `DIAJUKAN`.
6. **Rekonsiliasi affiliate**: komisi yang diharapkan tetapi tidak tercatat akibat kegagalan parsial ditandai `COMMISSION_MISSING`, sambil menghormati aturan satu komisi pertama dan produk yang eligible.
7. **Keamanan frontend**: URL materi harus `https://classroom.google.com`, tidak menerima domain tiruan, HTTP, atau URL berisi kredensial.
8. **Saklar rilis terpisah**: `NGD_MUTATIONS_ENABLED` untuk mutasi dasar, `NGD_REGISTRATION_ENABLED` untuk pendaftaran, dan `NGD_FINANCE_ENABLED` untuk pembayaran, refund, payout, dan koreksi kredit. `NGD_CLICK_TRACKING_ENABLED` tetap saklar tersendiri. Semuanya default OFF di source.

### Verifikasi yang benar-benar telah dieksekusi

- 44/44 pemeriksaan bisnis murni lulus: antrean 12, rekonsiliasi keuangan 17, pengaturan admin 15.
- Simulasi replay ledger: topup identik, penyesuaian negatif identik, nominal konflik, member konflik, serta debit melebihi saldo menghasilkan hasil yang diharapkan.
- Simulasi `updateRow_`: satu tulis rentang dan rumus yang tidak diubah tetap dipertahankan.
- Simulasi saklar rilis: ketika mutasi dasar aktif sementara registrasi dan keuangan tidak, 11 aksi terlarang tetap menghasilkan `MAINTENANCE` dan tidak memanggil Google Sheets.
- Pemeriksaan source: 18 file JS/GS/CJS lolos parser; seluruh 16 nama action frontend literal terdaftar dalam router backend; 13 file tes Node tercantum di workflow CI.
- **Bukan hasil CI Node sebenarnya.** GitHub Actions tidak berhasil diverifikasi lewat akses yang tersedia.

### Risiko tersisa dan syarat rilis

- Sinkronisasi kode terbaru ke Apps Script **belum dilakukan**. Jangan menimpa source GAS terikat database aktif.
- Pengujian browser di GitHub Pages terhadap Apps Script GET/POST + redirect ContentService dan CORS masih belum terbukti. Jangan mengirim PIN/token sampai transport aman dan tervalidasi.
- Database staging harus terisolasi sebelum uji registrasi/login, member 50 orang, order, komisi, refund dan failure injection.
- Keamanan PIN enam digit dan kepemilikan nomor WA, batas kuota pendaftaran anonim, SOP verifikasi QRIS, privasi, legal, dan akses admin harus ditinjau.
- Fulfillment dan refund lintas banyak tab belum memiliki rollback atomik. Penanda anti-retry serta rekonsiliasi mengurangi risiko tetapi tetap memerlukan SOP operator.
- Integrasi AI SobatAgent belum boleh diaktifkan tanpa dokumentasi endpoint yang valid. UI admin dan QA visual Android/Windows masih belum selesai.

**Keputusan:** jangan menjalankan `setupDatabase`, mengaktifkan pembayaran, membuka Google Sheets publik, atau mengaktifkan Script Properties pada database aktif tanpa pengujian staging dan persetujuan produksi terpisah.

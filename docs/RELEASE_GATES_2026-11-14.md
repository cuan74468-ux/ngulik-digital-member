# Ngulik Digital Member — Release Gates & QA Runbook

**Tanggal checkpoint:** 14 November 2026  
**Status:** Source dalam pengembangan, **BELUM boleh produksi/penjualan nyata**.  
**Target:** GitHub Pages statis tanpa build + Google Apps Script + Google Sheets.  
**Prinsip:** Semua pengujian mutasi dilakukan pada **salinan staging** yang tidak berisi transaksi asli.

## 1. Hasil yang benar-benar telah diverifikasi

- Hasil manual Apps Script sebelumnya: `inspectDatabaseSetup` 14/14 schema cocok, 1 ADMIN. `diagnosticApiPublic`, `diagnosticAuthReadOnly`, `diagnosticFinanceReadOnly`, dan `diagnosticReconciliationReadOnly` lulus pada dataset awal kosong.
- Backend dan frontend: JS parse check berhasil. Aturan murni: 37 dari 37 assertions lulus pada V8 terisolasi; bukan simulasi layanan Google.
- Pengamanan server terbaru: 11 jenis aksi mutasi ditolak dengan `MAINTENANCE` dalam V8 dengan Script Properties kosong, tanpa Google Sheets diakses. **Belum diuji pada Apps Script aktif**.
- Pratinjau UI: simulasi halaman tamu dan `?preview=member` berhasil dirender tanpa memanggil API, checkout tetap terkunci.
- Repo telah memiliki tes Node bawaan: `node --test tests/*.test.cjs`; GitHub Actions workflow `validate.yml` dibuat. **Jangan klaim CI PASS sampai workflow run diverifikasi di tab Actions.**
- Database aktif **tidak dimutasi** pada checkpoint ini. Semua perubahan berada di GitHub.

## 2. Empat saklar keamanan

| Mekanisme | Lokasi | Nilai aman bawaan |
|---|---|---|
| Backend mutasi umum | Script Properties: `NGD_MUTATIONS_ENABLED` | **Tidak ada / false** |
| Pendaftaran publik | Script Properties: `NGD_REGISTRATION_ENABLED` | **Tidak ada / false** |
| Support & rilis produk | Script Properties: `NGD_SUPPORT_ENABLED` | **Tidak ada / false** |
| Order, kredit berbayar, refund, komisi & payout | Script Properties: `NGD_FINANCE_ENABLED` | **Tidak ada / false** |
| Mode UI | `config.js`: `demoMode` | `true` |
| Tombol bayar | `config.js`: `paymentsEnabled` | `false` |
| QRIS resmi | `config.js`: `qrisImageUrl`, `qrisMerchant` | Kosong |

**Jangan mengubah semua saklar sekaligus.** Validasi lapisan server, transport browser, dan transaksi staging secara berurutan. `NGD_MUTATIONS_ENABLED=true` membuka mutasi dasar seperti login/PIN/progres, **bukan** pendaftaran atau transaksi. Untuk keduanya diperlukan saklar tambahan secara terpisah. Setiap saklar hanya diubah pada staging setelah pengujian dan persetujuan.

## 3. Masalah P0 yang masih terbuka

1. **Transport lintas-origin:** Google Apps Script ContentService mengalihkan JSON ke `script.googleusercontent.com`; belum ada bukti POST/GET `fetch` dari domain GitHub Pages berhasil dalam browser nyata. Dokumen resmi: https://developers.google.com/apps-script/reference/content/content-service . Uji GET **dan POST baca-saja** tanpa data sensitif melalui `tests/transport-probe.html` setelah URL staging tersedia. Jangan mengakali CORS dengan `no-cors`, JSONP login, atau mengekspos token di URL. Jika salah satu jenis request gagal, pertimbangkan arsitektur transport lain (misalnya hosting HTMLService atau gateway tepercaya) sebagai keputusan proyek tersendiri, bukan patch rahasia di frontend.
2. **Transaksi multi-sheet bukan atomik:** status order, kredit, fulfillment, referral dan audit terpisah. Bila satu tulis gagal, rekonsiliasi diperlukan. Jangan auto-retry fulfillment langganan tanpa penanda idempoten persisten.
3. **Login PIN 6 digit:** masih memakai salted SHA-256 serta throttle CacheService yang perlu audit brute-force, kebocoran hash, konkurensi, dan rotasi PIN pada staging. Pertimbangkan penguatan KDF yang migrasi-kompatibel sebelum produksi.
4. **Dana & komisi:** QRIS statis tidak mengonfirmasi penerimaan dana otomatis. Verifikasi bank/merchant dan bukti transfer harus manual; pengembalian uang tidak terjadi otomatis dari aplikasi. Jangan nyalakan penandaan PAID/REFUNDED tanpa SOP.
5. **Hak akses:** perlu tes login nyata, 50 member, antrian FIFO, suspend/reactivate, admin, dan penghapusan sesi di staging.

## 4. QA sebelum Apps Script aktif disinkronkan

1. Buka GitHub repo → Actions → workflow **Validate backend and frontend (no deploy)**; konfirmasi run terakhir lulus.
2. Periksa `tests/backend-pure.test.cjs`, `tests/backend-security.test.cjs`, `tests/frontend-smoke.test.cjs`, `tests/static-contract.test.cjs`.
3. Tinjau diff terhadap versi Apps Script yang masih terikat spreadsheet sebelum menyalin kode, agar perbaikan lokal tidak terhapus.
4. Ambil backup salinan spreadsheet. **Jangan reset `Ngulik Digital DB` aktif.**
5. Salin backend terbaru ke proyek Apps Script **staging**, bukan mengubah deployment publik.
6. Jalankan `inspectDatabaseSetup`, `diagnosticMutationGateReadOnly`, dan pemeriksaan read-only lain. Kunci mutasi harus `MUTATION_GATE_OK`.
7. Uji seluruh action dan status dalam staging dengan akun dan order palsu. Pisahkan hasil uji dari log dan ledger asli.

## 5. QA Browser dan UX

- Android dan Windows: layout login, bottom navigation, scroll horizontal, keyboard, target sentuh, status loading dan error.
- Preview offline: `?preview=member` menampilkan contoh lokal, tanpa autentikasi atau transaksi.
- Cek keyboard-only, zoom 200%, fokus, label form, error yang mudah dipahami, dan `prefers-reduced-motion`.
- Uji transport GET dan POST baca-saja melalui GitHub Pages staging; pastikan respons JSON bisa dibaca tanpa CORS error, redirect 404, atau timeout. Keberhasilan GET **tidak otomatis** berarti POST berhasil. Jangan mengirim PIN, token, atau data pribadi selama uji awal.
- Pastikan QRIS merchant, syarat program, kebijakan privasi, dan tautan belajar sungguhan disetujui pemilik.

## 6. Rollback dan respons insiden

- Untuk menghentikan aksi tulis dengan segera: hapus / set selain `true` pada Script Property `NGD_MUTATIONS_ENABLED`. Ini mencegah request mutasi berikutnya melalui `doPost`, **tidak** membatalkan pekerjaan yang sudah dilakukan atau request yang sedang berjalan.
- Nonaktifkan deployment Web App yang terbuka bila perlu. Pastikan tidak ada kredensial/rahasia tersimpan di GitHub.
- Audit `orders`, `credits_ledger`, `affiliate_commissions`, `audit_logs`, `sessions` sebelum koreksi apa pun.
- Jangan otomatis mengulang konfirmasi pembayaran, top-up, refund, atau payout yang statusnya tidak pasti; cocokkan bukti bank dan log terlebih dahulu.
- Untuk memulihkan data, gunakan snapshot/backup staging terverifikasi, bukan menghapus sheet aktif.

## 7. Approval produksi

Rilis memerlukan bukti tertulis bahwa: CI lulus; Apps Script staging lulus; transport browser lulus; pengamanan data pribadi dan PIN ditinjau; uji transaksi/idempotensi lulus; QA UI Android/Windows lulus; QRIS/legal/operasional disetujui. **Tanpa seluruh bukti tersebut, mode demo tetap aktif.**

## Pengaman baru pada backend development

- `NGD_CLICK_TRACKING_ENABLED` tetap tidak disetel/false: jangan membuka tracking publik sebelum ada rate-limit dan kebijakan retensi yang disetujui.
- Approval pembayaran kini membutuhkan `dana_diterima:true` dan `referensi_pembayaran`; kedua nilai bukan pengganti pemeriksaan bank secara manual.
- Refund top-up otomatis hanya diizinkan bila ledger original tersedia, saldo kredit masih cukup, belum pernah dibalik, dan belum ada komisi PAID. Refund langganan/seat/lisensi diarahkan ke prosedur manual.
- Admin fulfillment membutuhkan `aktivasi_terverifikasi:true`, `referensi_aktivasi`, dan email untuk Canva. Penanda percobaan pada order melindungi dari retry ganda setelah kegagalan.
- Daftar anomali rekonsiliasi membedakan produk yang memang menunggu aktivasi manual dari kasus yang melewati 48 jam.
- Semua perubahan ini belum disinkronkan ke Apps Script aktif; lakukan uji staging terlebih dahulu.

## Konfigurasi database dan admin yang tidak masuk GitHub

Source terbaru tidak lagi memuat ID Google Sheets ataupun nomor WhatsApp admin dalam nilai bawaan. Sebelum menjalankan backend di Apps Script **staging** (bukan backend aktif), di **Project Settings → Script Properties**:

- Isi `NGD_DB_ID` dengan ID spreadsheet **staging** yang benar. Untuk pemanggilan Web App tanpa spreadsheet aktif, properti ini wajib ada.
- Untuk setup database staging baru, isi `NGD_ADMIN_WA` dengan nomor WhatsApp admin staging yang sah. Nilai seed ini hanya dipakai saat key pengaturan belum ada; pengaturan database aktif tidak ditimpa.
- Biarkan `NGD_MUTATIONS_ENABLED` kosong / false dan `NGD_CLICK_TRACKING_ENABLED` kosong / false sampai tahap QA yang disetujui.
- Jangan menambahkan ID spreadsheet, WA pribadi, PIN, API key, atau token ke `config.js` frontend dan GitHub.

Sumber lama dan riwayat commit GitHub masih mungkin menyimpan identifier yang pernah ditulis dalam source. Redaksi pada file `main` **tidak menghapus riwayat Git**; pastikan spreadsheet bersifat privat melalui sharing Google Drive. Jangan melakukan rewrite riwayat Git tanpa rencana backup/koordinasi.

## Pengamanan terperinci yang sudah ditulis di GitHub (belum uji Apps Script nyata)

- Nilai dari pengguna yang terlihat seperti formula (`=`, `+`, `-`, `@`) ditulis ke Sheets sebagai **literal**, bukan rumus. Rumus resmi di sel lain tetap dipertahankan saat update kolom.
- Pembaruan beberapa kolom pada baris yang sama menggunakan satu `setValues`; ini mengurangi kegagalan parsial **dalam satu baris**, bukan transaksi atomik lintas-tab.
- `request_id` koreksi kredit admin disimpan sebagai referensi unik idempoten; retry identik aman. Referensi sama dengan nominal/member berbeda ditolak.
- Transaksi baru memeriksa saldo akhir kredit nonnegatif. Pembelian lisensi POS sekali bayar tidak menggandakan lisensi; perpanjangan Canva mempertahankan status aktif hingga dipenuhi admin.
- `adminGetReconciliation` memeriksa komisi yang seharusnya dibuat tetapi tidak tercatat, sesuai aturan komisi hanya untuk produk layak dan member referral.
- `NGD_REGISTRATION_ENABLED` hanya membuka registrasi jika mutasi umum aktif; `NGD_FINANCE_ENABLED` mengendalikan pembayaran, refund, payout, koreksi kredit, dan pemeliharaan transaksi.
- Seluruh kontrol rilis **default OFF** pada kode sumber baru. Jangan mengasumsikan Script Properties di proyek Apps Script aktif telah disetel atau sinkron dengan GitHub.

**Catatan penting:** HTTP GET/POST berbasis `ContentService` tetap memiliki risiko CORS lintas-origin dari GitHub Pages; jangan menambahkan `no-cors` atau proxy tidak tepercaya untuk PIN/token.

## Modul Member 360° dan Support Ticketing

**Staging privat sekarang 17 tab.** Tiga tab tambahan adalah `support_tickets`, `ticket_activities`, dan `product_releases`. Database sumber tetap 14 tab; jangan menambahkan tab pada sumber tanpa migrasi produksi yang sudah disetujui.

- Backend support terpisah pada `apps-script/Support.gs`. File ini harus tersedia bersama `Code.gs` saat penyelarasan ke Apps Script staging.
- `NGD_SUPPORT_ENABLED` default **OFF**. Penulisan tiket/rilis memerlukan flag ini sekaligus `NGD_MUTATIONS_ENABLED`; tes login tidak otomatis membuka support.
- Laporan BUG/FITUR mensyaratkan riwayat order PAID/FULFILLED untuk produk terkait. Permintaan bantuan umum tidak wajib membeli produk.
- Admin dapat mencari status member, menetapkan prioritas P0–P3, menangani tiket, dan mempublikasikan changelog.
- Belum ada lampiran, notifikasi WhatsApp otomatis, ataupun instalasi update POS dari tombol rilis.
- Jangan meminta PIN, token sesi, data bank, atau rahasia lain dalam formulir tiket.
- Data tiket dan riwayat aktivitas adalah data pribadi. Tetapkan retensi dan batas akses petugas sebelum membuka support secara publik.
- Uji nyata di Apps Script staging masih wajib, terutama simulasi gangguan setelah aktivitas berhasil ditulis.

Rujukan: [Member 360° Support Handoff](MEMBER360_SUPPORT_HANDOFF_2026-11-14.md).

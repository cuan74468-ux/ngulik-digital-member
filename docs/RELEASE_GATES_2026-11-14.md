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
| Backend mutasi | Apps Script Script Properties: `NGD_MUTATIONS_ENABLED` | **Tidak ada / false** |
| Mode UI | `config.js`: `demoMode` | `true` |
| Tombol bayar | `config.js`: `paymentsEnabled` | `false` |
| QRIS resmi | `config.js`: `qrisImageUrl`, `qrisMerchant` | Kosong |

**Jangan mengubah semua saklar sekaligus.** Validasi lapisan server, transport browser, dan transaksi staging secara berurutan. `NGD_MUTATIONS_ENABLED=true` mengizinkan semua aksi tulis API, termasuk pendaftaran, PIN, kredit dan verifikasi order: hanya set setelah persetujuan rilis yang terpisah.

## 3. Masalah P0 yang masih terbuka

1. **Transport lintas-origin:** Google Apps Script ContentService mengalihkan JSON ke `script.googleusercontent.com`; belum ada bukti POST/GET `fetch` dari domain GitHub Pages berhasil dalam browser nyata. Dokumen resmi: https://developers.google.com/apps-script/reference/content/content-service . Uji tanpa data sensitif via `tests/transport-probe.html` setelah URL staging tersedia. Jangan mengakali CORS dengan `no-cors`, JSONP login, atau mengekspos token di URL.
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
- Uji transport GET dan POST baca-saja melalui GitHub Pages staging; pastikan respons JSON bisa dibaca tanpa CORS error, redirect 404, atau timeout. Keberhasilan GET **tidak otomatis** berarti POST berhasil.
- Pastikan QRIS merchant, syarat program, kebijakan privasi, dan tautan belajar sungguhan disetujui pemilik.

## 6. Rollback dan respons insiden

- Untuk menghentikan aksi tulis dengan segera: hapus / set selain `true` pada Script Property `NGD_MUTATIONS_ENABLED`. Ini mencegah request mutasi berikutnya melalui `doPost`, **tidak** membatalkan pekerjaan yang sudah dilakukan atau request yang sedang berjalan.
- Nonaktifkan deployment Web App yang terbuka bila perlu. Pastikan tidak ada kredensial/rahasia tersimpan di GitHub.
- Audit `orders`, `credits_ledger`, `affiliate_commissions`, `audit_logs`, `sessions` sebelum koreksi apa pun.
- Jangan otomatis mengulang konfirmasi pembayaran, top-up, refund, atau payout yang statusnya tidak pasti; cocokkan bukti bank dan log terlebih dahulu.
- Untuk memulihkan data, gunakan snapshot/backup staging terverifikasi, bukan menghapus sheet aktif.

## 7. Approval produksi

Rilis memerlukan bukti tertulis bahwa: CI lulus; Apps Script staging lulus; transport browser lulus; pengamanan data pribadi dan PIN ditinjau; uji transaksi/idempotensi lulus; QA UI Android/Windows lulus; QRIS/legal/operasional disetujui. **Tanpa seluruh bukti tersebut, mode demo tetap aktif.**

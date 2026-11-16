# Restore Rehearsal Terisolasi — STAGING — 16 November 2026

**Status:** UJI PEMULIHAN FILE LEVEL BERHASIL; uji aplikasi dan disaster recovery end-to-end **BELUM** dilakukan.

## Lingkungan dan batas keamanan
- Sumber: backup privat STAGING 15 November 2026, bukan spreadsheet aktif.
- Target: file baru di folder privat `99_STAGING_BACKUP_DAN_HAPUS`, dengan nama `RESTORE_REHEARSAL_ISOLATED_NGD_29TABS_2026-11-16_DO_NOT_CONNECT`.
- Target **berbeda** dari file backup dan file STAGING aktif. Metadata setelah penyalinan menunjukkan **shared=false**, pemilik tunggal (`owner`), folder parent sama, dan format native Google Sheets.
- **Jangan menghubungkan** file uji ini ke Script Properties, Web App, endpoint, registrasi, atau pembayaran. Jangan gunakan sebagai database produksi. ID target sengaja tidak ditulis dalam repository publik.

## Bukti pemeriksaan
1. File uji berhasil dibuat menggunakan operasi Google Drive Copy terhadap **backup**, bukan terhadap file aktif.
2. Metadata sumber dan salinan membuktikan **29/29 tab dengan urutan dan nama identik**.
3. Header row dibandingkan menggunakan metadata sel dan berhasil **29/29 tab identik**, tanpa perbedaan nama/urutan kolom.
4. Jumlah ID/record nonkosong pada kolom A cocok pada **9/9 tab operasional**: `members` (1), `sessions` (1), `credits_ledger` (0), `orders` (0), `otp_verifications` (0), `wa_notifications` (0), `lms_courses` (0), `audit_logs` (3), `katalog_produk` (9).
5. Formula turunan `members!AG2:AI3` dibandingkan dalam mode FORMULA dan **identik**.
6. Tidak ada read/write pada spreadsheet produksi atau perubahan data STAGING aktif; file backup asal tidak diubah. Data pelanggan, PIN, dan token tidak dicantumkan di log ataupun dokumen ini.

## Belum dianggap terbukti
- Kesesuaian seluruh nilai semua sel, format, gambar, formula seluruh sheet di luar rentang di atas, kontrol akses detail/trigger/GAS app permissions.
- Skenario mengubah Script Properties `NGD_DB_ID` ke clone, login, checkout, OTP, penyelesaian transaksi, lalu rollback (sengaja **tidak dilakukan**).
- Recovery Point Objective/Recovery Time Objective maupun SLA; lama pelaksanaan dan ukuran data pada saat insiden lebih besar dapat berbeda.
- Tidak ada restore transaksi yang dilakukan. Tidak ada izin pembukaan registrasi publik/finance karena hasil ini.

## Kriteria drill tahap berikut
Untuk uji pemulihan aplikasi penuh, owner perlu menyetujui environment terpisah, backup source GAS, konfigurasi salinan DB yang tidak dipakai publik, dan rollback langkah demi langkah. Jangan menjalankan simulasi destruktif pada database aktif. Provider tetap LAST.

**Keputusan:** checkpoint file-level restore = PASS; application-level restore = PENDING.

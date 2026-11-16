# Tahap 1 — Rencana Pengamanan Autentikasi & Rekonsiliasi

**Tanggal:** 16 November 2026 (WIB)  
**Status:** desain keamanan dan kesiapan migrasi **SOURCE-ONLY**, belum mengubah runtime Apps Script STAGING/PRODUCTION.  
**Gerbang rilis:** **NO-GO** untuk registrasi, OTP Fonnte, pembayaran dan finance.

## 1. Masalah yang sudah diperbaiki di source

- **OTP dan registrasi tidak atomik:** source sekarang memvalidasi OTP, menyimpan anggota, lalu mengonsumsi OTP. Jika simpan anggota gagal, bukti tidak dibakar. Bila penulisan akun berhasil lalu commit OTP/log/grant gagal, retry pendaftaran tetap ditolak oleh pengecekan WA; tidak ada auto-kredit atau perbaikan status tanpa persetujuan.
- **Logout berlomba dengan login/sesi lain:** penghapusan baris fisik sesi sekarang memakai `withLock_` dan urutan baris menurun.
- **Sesi yang tanggal kedaluwarsanya tidak valid:** kode lama membandingkan `NaN <= Date.now()` dan dapat mengizinkan token tanpa batas. Source baru menolak `expires_at` yang tidak dapat dibaca atau sudah habis.
- **Duplikasi hash sesi, duplikasi ID member, dan role drift:** setiap sesi harus sesuai dengan tepat satu record sesi, tepat satu anggota `AKTIF`, dan peran yang sama seperti pada saat token diterbitkan. Admin promotion tidak boleh otomatis menaikkan privilese sesi lama.

Tes sintetis dan Chrome CI untuk source commit `9d893c117918ad5c26431ee52c859124faa1b7f3` berhasil **410/410** pada [GitHub Actions](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43788485412). Publikasi GitHub Pages pada [run ini](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43788485670) juga berhasil; itu **bukan** deployment GAS.

## 2. Masalah terbuka yang harus diselesaikan sebelum go-live

### P0 — PIN dan ketahanan kebocoran database

Saat ini `pinHash_(pin,salt)` adalah SHA-256 satu kali terhadap `salt + PIN`. Salt per akun sudah ada dan throttle login saat online juga ada, tetapi **PIN 6 digit memiliki ruang pencarian kecil**; pencurian tabel `members` berpotensi memungkinkan penebakan hash secara offline. Rate limit online tidak melindungi kasus hash dicuri.

**Rencana aman, belum diimplementasikan:**

1. Putuskan secara terukur metode derivasi PIN yang membutuhkan waktu/kerja lebih besar atau desain server-side pepper di Script Properties (jangan simpan pepper di Sheets, frontend, dokumentasi, atau git).
2. Catat versi hash baru secara eksplisit dalam format tersimpan atau mekanisme versi lain, tanpa menambah kolom produksi diam-diam. Tentukan cara verifikasi PIN lama, migrasi setelah login sukses, perubahan PIN, reset pemulihan akun, dan fallback rollback.
3. Gunakan fixture sintetis untuk memastikan akun lama tetap bisa login hingga migrasi selesai, login gagal tidak membuka informasi akun, salah PIN di-throttle, dan kredensial admin tidak terungkap.
4. Ukur performa dan kuota GAS pada STAGING terisolasi, termasuk lonjakan permintaan dan timeout, sebelum mengaktifkan algoritme yang lebih berat.
5. Baru ajukan persetujuan owner untuk migrasi/aktivasi. **Jangan** mengganti hasher produksi sekarang karena dapat mengunci akun lama.

### P0 — Recovery audit registrasi

`RegistrationRecoveryPreflight.gs` (read-only, source GitHub) mendeteksi indikasi partial commit: OTP USED tanpa member; member + OTP VERIFIED belum dikonsumsi; member AKTIF tanpa GRANT POSTED; GRANT ganda, salah nilai, unposted, orphan; kebijakan `kredit_awal` tidak tersedia/duplikat.

**Aturan ketika menemukan temuan:** hentikan aktivasi registrasi; backup snapshot; cocokkan `members`, `otp_verifications`, `credits_ledger`, `audit_logs`, dan sesi terkait secara terbatas dan privat; klasifikasikan operasi yang terhenti; tidak mengubah atau menambahkan nilai ledger atas dasar hitungan audit saja. Catat siapa menyetujui, bukti, transaksi korektif yang direncanakan, serta verifikasi independen sebelum eksekusi. Jangan menghapus bukti asli.

### P0 — Otorisasi/sesi

- Source code `session_` sudah diperketat, tetapi isinya belum dibuktikan sama dengan editor GAS aktif.
- Jika `session_` baru ditempatkan di GAS, pengguna dengan data sesi lama yang cacat/tidak konsisten mungkin diminta login ulang. Ini adalah **perubahan fail-closed yang disengaja**, memerlukan komunikasi dan pengujian.
- Kunci `withLock_` mengurangi race antar operasi yang menggunakan lock yang sama; tidak menjadikan Google Sheets transaksi ACID.
- Harus ada pengujian browser nyata dan token revoke, logout, sesi kedaluwarsa, suspend, promosi role serta ganti PIN setelah backup dan diff.

### P1 — Batas ledger dan LMS

`creditBalance_` saat ini menjumlahkan entri ledger untuk anggota tanpa menguji `status='POSTED'`; kontrak saldo/adjustment perlu diuji sebelum finance aktif. Ini **temuan source yang belum diperbaiki** karena keputusan status historis/rekonsiliasi harus disahkan bersama kebijakan ledger. LMS internal dan layanan Classroom gratis harus tetap terpisah sampai otoritas entitlement definitif.

## 3. Apa yang bisa dipastikan dari database STAGING saat ini

- Infrastruktur 29 tab dan audit integritas 8 tabel **pernah lulus** di editor GAS menurut log owner 15 November pukul 22.24.
- Pembacaan terbatas pada tab `sessions` menunjukkan satu baris sesi dengan kolom hash/member/role terisi. Sel `expires_at` pada metadata native Google Sheets bertipe **DATE_TIME** dengan nilai numerik serial; ini format tanggal Sheets normal. **Jangan** menganggap string tanggal versi tampilan dari connector sebagai bukti sesi rusak — Apps Script `getValues()` dapat menghasilkan Date. Keabsahan login nyata dan kesetaraan seluruh kode editor **belum diuji**.
- File backup terisolasi dan manifest source sudah disiapkan pada checkpoint sebelumnya; restore aplikasi penuh belum dilakukan.

## 4. Urutan aktivasi yang boleh dipertimbangkan setelah verifikasi

1. Backup source runtime GAS STAGING, cocokkan seluruh file dengan manifest, terutama `Code.gs`, `OtpAuth.gs`, `AdminAccess.gs`, lalu review diff per fungsi.
2. Jalankan pemeriksaan audit **editor-only** `ngdRegistrationRecoveryPreflightReadOnly` jika/ketika benar-benar telah dipasang; kirim *hanya* log hitungan tanpa data pribadi. Hasilnya belum dilaporkan oleh operator pada checkpoint ini.
3. Finalisasi penanganan P0 hash PIN dan sesi; tes offline, uji STAGING terisolasi, strategi migrasi dan rollback.
4. Uji restore aplikasi pada salinan yang **tidak terhubung ke pengguna publik** dengan persetujuan khusus. Jangan mengubah `NGD_DB_ID` pada Web App aktif untuk drill.
5. Melanjutkan LMS dan entitlement internal, CRUD serta QA Android/desktop, kemudian kontrak finansial dan kebijakan margin/komisi.
6. Provider eksternal **terakhir** sesuai mandat owner; tidak ada izin aktivasi saat ini.

## 5. Guardrails

Tidak ada PIN/token/nomor WhatsApp/API key dicatat. Tidak ada mutasi Sheets, Script Properties, deployment GAS, pembayaran, atau pengiriman WA sebagai bagian penyusunan ini. **Source CI PASS tidak sama dengan GO-LIVE.**

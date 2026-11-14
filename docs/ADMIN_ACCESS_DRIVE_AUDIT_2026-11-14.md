# Checkpoint Akses Administrator dan Audit Google Drive
Tanggal: 14 November 2026
Proyek: Ngulik Digital Member — produk komersial nyata.

## Fakta yang diperiksa, tanpa mengubah data

| Aspek | Database utama | Database staging |
| --- | --- | --- |
| Jumlah tab | 16 | 26 |
| ADMIN | Satu akun M-0001, berstatus AKTIF | Belum ada admin |
| Keamanan PIN | Hash 64 karakter dan salt tersimpan, bukan plaintext | Tidak berlaku |
| Verifikasi WA admin | TRUE | Tidak berlaku |
| Sesi | Tidak ada pada rentang sesi A2:A12 saat pemeriksaan | Tidak diperiksa |
| Katalog | Delapan penawaran, semuanya aktif | Delapan identitas penawaran yang sama |
| Kuota gelombang | 50 | 50 |
| Mode pendaftaran | TERBUKA | TERTUTUP |
| Trial | 30 hari | 30 hari |
| Kredit awal | 10 | 10 |
| Komisi default | 25% | 25% |

Audit log produksi mencatat ADMIN_CREATED untuk M-0001 pada 13 November 2026 pukul 19.29 WIB. Jangan membuat akun ADMIN kedua. PIN awal tidak dapat diketahui dari hash: gunakan prosedur pemulihan yang terotorisasi.

### Perbedaan struktur yang tidak boleh dibuang

- Produksi memiliki tab otp_verifications dan wa_notifications. Keduanya belum ada di staging.
- Produksi memiliki kolom wa_verified dan wa_verified_at dalam members, serta komisi_persen dan sumber_produk dalam katalog_produk. Staging tidak memiliki kolom tersebut.
- Source GitHub mengharapkan 27 tab termasuk CMS site_content, sedangkan produksi mempunyai 16 tab dan staging 26 tab. Jangan jalankan setupDatabase terhadap produksi.
- Pengelolaan login admin dapat dipisahkan dari penambahan 11 tab konten, LMS, dan bantuan: autentikasi hanya butuh members, sessions, dan audit_logs dengan struktur kolom penting yang sudah tersedia.
- Materi komunitas Chapter 1, blueprint, dan mandat produksi di Google Drive adalah rujukan asli untuk konten pembelajaran dan bisnis. Jangan memakai konten dummy untuk operasi nyata.

## Implementasi source GitHub

File apps-script/AdminAccess.gs menyediakan:
- adminLogin: identitas diverifikasi sebagai ADMIN dengan ID admin yang telah dikunci di Script Properties sebelum token sesi diterbitkan.
- adminLogout: pencabutan sesi admin melalui autentikasi server.
- adminChangePin: memvalidasi PIN lama, PIN baru, mencabut semua sesi, dan mencatat audit.
- inspectAdminAccessOwnerOnly: pemeriksaan hanya baca untuk operator, tanpa membocorkan nomor WA, ID database, hash, salt, ataupun PIN.
- recoverAdminPinOwnerOnly: reset PIN satu kali melalui dialog Apps Script terikat Sheet, memerlukan verifikasi operator, lingkungan, ID database, ID akun, dan konfirmasi eksplisit.
- bootstrapStagingAdminOwnerOnly: pembuatan admin pertama khusus staging, dengan pengaman anti-akun ganda.
- showAdminAccessStatus: dialog status admin baca-saja dari menu Google Sheets.

Code.gs mengizinkan HANYA tiga aksi autentikasi di atas melalui saklar NGD_ADMIN_LOGIN_ENABLED independen dari gerbang mutasi umum. Registrasi, checkout, kredit, CMS, dan pembayaran tidak menjadi aktif karenanya.

Frontend menyediakan rute https://cuan74468-ux.github.io/ngulik-digital-member/#admin-login, tautan khusus dari login biasa, dan formulir ganti PIN pada akun admin. Saklar config.js adminLoginEnabled tetap FALSE sampai backend teruji dan sinkron.

## Prosedur browser untuk pemilik

### 1. Backup dan bandingkan backend

1. Buka Google Sheets dan pilih Ekstensi > Apps Script untuk proyek yang benar.
2. Cadangkan sumber GAS saat ini beserta deployment aktif. Backend produksi mungkin mempunyai modul OTP/WA yang tidak identik dengan source GitHub.
3. Merge SELEKTIF perubahan autentikasi dari Code.gs dan tambahkan AdminAccess.gs. Jangan mengganti backend live secara membabi buta.
4. Pastikan tidak ada kode yang menghapus atau menamai ulang kolom dan tab lama.

### 2. Pengujian staging

1. Arahkan NGD_DB_ID di Script Properties staging ke spreadsheet staging, dan tetapkan NGD_ENVIRONMENT=STAGING.
2. Tetapkan NGD_STAGING_BOOTSTRAP_DB_ID sama dengan NGD_DB_ID, NGD_STAGING_BOOTSTRAP_ENABLED=true, NGD_ADMIN_RECOVERY_OPERATOR_EMAIL sebagai email editor pemilik, dan NGD_ADMIN_WA sebagai nomor owner di Script Properties (jangan di GitHub).
3. Jalankan bootstrapStagingAdminOwnerOnly pada proyek GAS yang terikat Google Sheets. Konfirmasikan dialog; simpan PIN staging secara privat. Gate bootstrap otomatis menjadi false setelah berhasil.
4. Tetapkan NGD_ADMIN_LOGIN_ACCOUNT_ID=M-0001, NGD_ADMIN_LOGIN_DB_ID sama dengan NGD_DB_ID staging, dan NGD_ADMIN_LOGIN_ENABLED=true.
5. Jalankan inspectAdminAccessOwnerOnly: cek hanya satu akun admin, aktif, hash/salt lengkap, tabel auth lengkap, gate login siap.
6. Deploy staging terpisah dan uji adminLogin/adminLogout/adminChangePin secara nyata. Uji penolakan member biasa, PIN salah, dan penguncian setelah percobaan gagal. Pastikan register, createOrder, adminAdjustCredit, adminCreateContent, dan pembayaran tetap ditolak.

### 3. Pemulihan PIN utama bila lupa

1. Setelah backup dan verifikasi Script yang benar, tetapkan Script Properties produksi: NGD_ENVIRONMENT=PRODUCTION, NGD_ADMIN_RECOVERY_DB_ID sama persis dengan NGD_DB_ID produksi, NGD_ADMIN_RECOVERY_ACCOUNT_ID=M-0001, NGD_ADMIN_RECOVERY_OPERATOR_EMAIL adalah email Google yang menjalankan prosedur, dan NGD_ADMIN_RECOVERY_ENABLED=true.
2. Pilih fungsi recoverAdminPinOwnerOnly di editor Apps Script yang TERIKAT spreadsheet atau melalui menu Ngulik Digital. Fungsi menolak eksekusi tanpa dialog Sheets.
3. Baca konfirmasi dengan teliti; PIN baru ditampilkan satu kali saja. Simpan secara privat. Semua sesi admin sebelumnya dicabut, audit dicatat, dan saklar recovery otomatis kembali false.
4. Jangan menulis PIN ke Google Sheet, chat, repo, email publik atau Apps Script Logger. Jangan memodifikasi hash/salt langsung.

### 4. Peluncuran login admin saja

1. Setelah staging aman, sinkronkan patch autentikasi yang telah direview ke backend produksi dan deploy versi baru dengan versi lama sebagai rollback.
2. Atur NGD_ENVIRONMENT=PRODUCTION, NGD_ADMIN_LOGIN_DB_ID sama dengan NGD_DB_ID produksi, NGD_ADMIN_LOGIN_ACCOUNT_ID=M-0001, dan NGD_ADMIN_LOGIN_ENABLED=true.
3. Verifikasi ulang inspectAdminAccessOwnerOnly dan uji login/logout/ganti PIN dan penolakan non-admin pada endpoint nyata.
4. Setelah itu saja, ganti config.js frontend menjadi adminLoginEnabled:true dan deploy GitHub Pages.
5. Tetap jaga NGD_MUTATIONS_ENABLED=false, NGD_FINANCE_ENABLED=false, memberWritesEnabled:false, paymentsEnabled:false. Login admin terpisah tidak mengizinkan transaksi.

## Pekerjaan lanjutan yang belum rilis

Panel baca admin dapat digunakan setelah autentikasi siap dan tabel terkait tersedia. Namun CRUD katalog, LMS, layanan, tiket, CMS banner, pengaturan bisnis, pembayaran, Mayar, gateway WhatsApp dan pemrosesan produk tetap membutuhkan verifikasi schema 16 versus 27 tab, migrasi forward-only tanpa menimpa kolom OTP/komisi, serta pelepasan gate per modul. Nama komersial dan penawaran aktual mengikuti dokumen mandat produksi dan delapan item katalog Google Drive.

Status: Source GitHub disiapkan dan diuji otomatis. Spreadsheet utama/staging hanya dibaca; tidak ada perubahan data, reset PIN, pembuatan admin, atau deployment Google Apps Script produksi yang dijalankan di sesi ini.

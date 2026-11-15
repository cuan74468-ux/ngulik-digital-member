# Ngulik Digital Member — STAGING workspace dan autentikasi P0

**Tanggal:** 15 November 2026  
**Dokumen pengarah:** Master Index dan Mandat Produksi Ngulik Digital di Google Drive.  
**Tujuan:** Portal membership komersial nyata, pilot awal 50 anggota. BUKAN produk demo.  
**Tahap aktif:** Tahap 1 — Registrasi OTP WhatsApp, PIN dan sesi.  
**Go-live:** NO-GO. Tidak ada izin pembayaran, penulisan data produksi, atau pengaktifan registrasi publik.

## Hasil aktual dari GAS STAGING (owner-provided logs)

- OTP STAGING preflight: `OTP_STAGING_SCHEMA_PREFLIGHT_OK`, dengan `otp_source_installed=true`, tab OTP/WA masing-masing 0 record.
- Integrasi Code.gs: `OTP_CODE_INTEGRATION_READONLY_OK`, 3 aksi terlindungi; seluruh mutasi OFF.
- Struktur backend: `BACKEND_SCHEMA_OK`, 27/27 tabel.
- API publik: `API_PUBLIC_OK`, sembilan pemeriksaan.
- Autentikasi baca-saja: `AUTH_READONLY_OK`, 16 pemeriksaan.
- Penolakan tiga endpoint OTP: `OTP_NEGATIVE_GATE_OK`.
- Penolakan tiga fungsi OTP internal: `OTP_INTERNAL_GUARD_OK`.
- Logika hashing OTP: `OTP_PURE_LOGIC_OK`, 9 pemeriksaan.
- **Catatan:** log tersebut bukan bukti OTP Fonnte terkirim, CORS browser berhasil, pendaftaran member berhasil, atau panel admin lewat browser sudah diuji.

## Yang dibuat langsung di GitHub

1. `apps-script/Code.gs`: aksi baca-saja `getStagingWorkspaceInfo` yang memeriksa identitas STAGING, kesamaan DB dengan konfigurasi ADMIN, dan koneksi DB aktual. Tidak mengirim ID database atau rahasia. Tambahan fungsi `ngdStagingWorkspaceReadOnlyCheck`.
2. `staging/index.html`, `staging/admin.css`, `staging/admin.js`: workspace admin terpisah, tanpa data palsu. Mendukung login admin sesudah verifikasi server, dashboard, anggota, katalog, pesanan, antrean, komisi, dan pengaturan secara **baca-saja**.
3. `config.js`: flag `registrationOtpEnabled:false` pada frontend publik.
4. `js/app.js`: UI meminta OTP, verifikasi OTP, dan memasukkan kode saat register; semua dinonaktifkan pada frontend publik sampai owner menyetujui rilis dan QA selesai.
5. `index.html`: cache busting frontend terbaru.
6. `tests/staging-admin-workspace.test.cjs`, `tests/backend-staging-attestation.test.cjs`, `tests/frontend-otp-registration.test.cjs`: kontrak keamanan yang masuk suite GitHub Actions.

Tidak ada perubahan Sheets atau Apps Script runtime/deployment otomatis. Tidak ada API Fonnte dipanggil. Tidak ada rahasia disimpan di GitHub.

## Tahap pemasangan sekali oleh operator — hanya STAGING

1. **Backup** file `Code.gs` yang saat ini terpasang di Apps Script STAGING. Jangan mengubah source produksi.
2. Salin Code.gs STAGING terpadu yang diberikan bersama checkpoint ini (atau bandingkan source GitHub; versi bundle diturunkan dari source STAGING terakhir yang pernah berhasil).
3. Ganti hanya `Code.gs` STAGING. Pertahankan `OtpAuth.gs`, `AdminAccess.gs`, `Diagnostics.gs` dan modul lain yang sudah ada; jangan membuat fungsi duplikat.
4. Simpan, lalu jalankan fungsi read-only `ngdStagingWorkspaceReadOnlyCheck` di editor Apps Script. Hasil wajib: `NGD_STAGING_WORKSPACE_READONLY_OK | environment=STAGING | writes=false`. Jika gagal, berhenti dan audit, jangan mengaktifkan flag.
5. Setelah lulus, **Deploy → Manage deployments → Edit deployment Web App STAGING → New version → Deploy**. Pastikan Anda sedang di proyek STAGING. Jangan mengedit deployment produksi.
6. Salin URL `/exec` dari deployment STAGING. Buka halaman `https://cuan74468-ux.github.io/ngulik-digital-member/staging/` setelah GitHub Pages mempublikasikan file tersebut.
7. Tempel URL deployment STAGING ke kotak koneksi. Halaman akan memanggil `getStagingWorkspaceInfo`. Jika STAGING tidak terbukti, PIN tidak akan diminta/dikirim.
8. Login menggunakan akun ADMIN STAGING yang sudah ada. Periksa data langsung dari 7 bagian workspace lalu logout.
9. Jika browser menolak respons (CORS/redirect `ContentService`), periksa akses deployment/Web App dan transport. **Jangan** menonaktifkan pemeriksaan identitas atau mengizinkan URL produksi sebagai jalan pintas.

## Pengaturan yang wajib tetap OFF

- `NGD_MUTATIONS_ENABLED` absent/OFF
- `NGD_REGISTRATION_ENABLED` absent/OFF
- `NGD_OTP_REGISTRATION_ENABLED` absent/OFF
- `NGD_FINANCE_ENABLED` absent/OFF
- Frontend publik `memberWritesEnabled:false`, `registrationOtpEnabled:false`, `paymentsEnabled:false`

Jangan menyebarkan PIN, token sesi, Fonnte API token atau kode OTP ke chat ataupun GitHub.

## Batasan yang belum dibuktikan

- Runtime Code.gs STAGING tidak bisa diperbarui/deploy langsung dari konektor GitHub/Drive yang tersedia. Owner harus melakukan instalasi browser atau menyiapkan akses editor GAS yang mendukung operasi tersebut.
- URL deployment GAS STAGING belum terkonfirmasi, sehingga frontend baru tidak bisa menjalani verifikasi end-to-end dengan backend milik owner dari sesi ini.
- Seluruh suite GitHub Actions pada commit final dan Chrome Android/Windows masih harus dicek. Pemeriksaan sintaks dan simulasi lokal tidak boleh disebut sebagai pengujian dunia nyata.
- CRUD, pembayaran, AI, affiliate tetap tidak dibuka selama Tahap 1 berlangsung; pengaktifan per domain membutuhkan gate dan izin khusus.
- Kebijakan kredit awal `kredit_awal` perlu keputusan bisnis final karena Mandat Produksi menyebut Zero-Freebie tetapi Brief mencantumkan kredit sambutan.

## Kriteria lulus Tahap 1 (bukan checklist sekadar kode)

Pendaftaran nomor WA baru menghasilkan OTP 6 digit dari gateway Fonnte ke nomor uji yang disetujui; tiga kegagalan kode ditolak; TTL 5 menit terbukti; replay tidak dapat membuat akun/bonus ganda; PIN tersimpan dengan salt/hash; sesi terbit, bertahan, lalu dicabut pada logout/ganti PIN; admin dan member terisolasi; akses portal dipastikan menggunakan deployment yang benar; kebijakan privasi dan biaya notifikasi disepakati.

**Status akhir sesi ini:** source dan UI terintegrasi di GitHub; onboarding runtime STAGING, Fonnte, QA perangkat dan release gate belum diselesaikan. Tidak mengklaim production-ready.


## Koreksi UI/UX 15 November — Linggau Design System

**Masalah ditemukan:** halaman `/staging/` sebelumnya sekadar formulir pengisian endpoint, sementara menu admin disembunyikan. Itu bukan pengalaman aplikasi operasional yang memadai. Pemilik menyampaikan tampilan belum layak.

**Perbaikan source langsung di GitHub:**
- Redesign `staging/index.html` + `staging/admin.css` dengan layout editorial, font Plus Jakarta Sans/DM Sans/Instrument Serif, warna admin `#384e82`, white space, fokus akses, mobile dan desktop.
- Navigasi administrasi tetap tampak, **disabled sebelum login** dan aktif setelah sesi ADMIN terverifikasi. Tidak ada data dummy atau tombol yang memicu transaksi tanpa izin.
- Koneksi backend kini dapat disimpan **sekali di `staging/config.js`** (alamat /exec saja, tanpa secret) setelah deployment STAGING terkonfirmasi; UI melakukan verifikasi server otomatis. Jika kosong, form koneksi ditampilkan. Tidak ada fallback ke endpoint produksi.
- Integrasi belum melampaui Tahap 1; dashboard data tetap baca-saja, mutasi/keuangan/registrasi publik OFF.
- `tests/staging-layout-probe.js` dan workflow `validate.yml` menambahkan smoke test Chrome desktop/mobile; uji UI dan kontrol login tetap pada suite Node.
- Perubahan belum diverifikasi secara visual di website publik yang telah terbit. GitHub Actions harus dilihat sebelum menganggap browser QA lulus.

**Pekerjaan operator berikutnya:** dapatkan URL Web App **STAGING** yang berakhir `/exec` setelah versi Code.gs yang mengandung `getStagingWorkspaceInfo` diterbitkan. Berikan URL itu tanpa PIN/token/Script Properties. Set `staging/config.js` melalui GitHub agar login langsung tersedia dari `/staging/` tanpa langkah pengisian ulang.

**Penting:** Jangan menyebut source repository sebagai layanan berhasil hanya karena JS parsing lulus; otentikasi browser dan transport GAS masih perlu dibuktikan.

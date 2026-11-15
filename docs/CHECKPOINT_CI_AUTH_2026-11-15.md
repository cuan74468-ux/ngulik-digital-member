# Ngulik Digital Member — Checkpoint lintas sesi (15 November 2026, WIB)

## Status resmi
Produk komersial nyata, bukan demo. **Tahap 1 — autentikasi WhatsApp, PIN, dan sesi: PROSES / NO-GO untuk pendaftaran publik.** Tahap 2–6 tidak diaktifkan sebelum gerbang tahap pertama terpenuhi.

## Aset terverifikasi
- GitHub: https://github.com/cuan74468-ux/ngulik-digital-member, branch `main`.
- Commit kontrol QA: `8f17aacba34cbb4ef33aa3591742037c3778cc42`.
- GitHub Actions validasi: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43711740902 — **success**, 313/313 Node tests, Chrome desktop+mobile static smoke **success**, `STAGING_VISUAL_SMOKE_OK`, `BROWSER_UI_OK`.
- GitHub Pages deployment: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43711740215 — **success**.
- Chrome read-only POST ke API publik: `BROWSER_API_TRANSPORT_OK`. **Bukan** bukti login STAGING atau OTP nyata.
- Master Index: https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit
- Mandat Produksi: https://docs.google.com/document/d/19KIklWdph7JSO0fiGWdpwsAe_QfqxK4mOxa5ghAJP0w/edit
- Brief teknis: https://docs.google.com/document/d/1o_Pea9x7A6l2U0xdxFuQNTM2BkoZ6FXI2p68JyMUnbk/edit
- Linggau Design System: https://docs.google.com/document/d/1mKuw7ztdgixwH71shkifZxM8D_2SWTgf2WSpNiBykz8/edit
- STAGING database: https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit (29 tab, termasuk OTP/WA).
- Database produksi: https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit (16 tab).
- Backup sebelum migrasi: https://docs.google.com/spreadsheets/d/1YA0KQ13h4lUVipedZ091OhE1bRrdFNtrX0YGO0AQA74/edit

## Perubahan sesi lanjutan
Perubahan langsung pada `main` **hanya di tes dan workflow CI**, tanpa modifikasi database, Script Properties, source runtime produksi, autentikasi nyata, dan harga. Commit:
- `49d88e4`: perbarui 14 tes lama agar mengikuti source terbaru, jadikan fixture katalog eksklusif untuk tes (`tests/fixtures/catalog.cjs`), ubah Chrome smoke agar tidak bergantung data/harga contoh.
- `8f17aac`: perbaiki dua ekspektasi tes terakhir yang masih tidak cocok dengan guard preflight dan stylesheet.
- Hasil akhir: 313/313 tes Node hijau, pemeriksaan shell frontend Chrome desktop/mobile hijau.

Tidak ada pengiriman pesan WhatsApp, pembuatan akun, transaksi, atau penulisan Google Sheets dalam perubahan ini.

## Penghambat P0 yang belum selesai
1. `staging/config.js` berisi `apiUrl:''`. **URL Web App GAS STAGING `/exec` belum terkonfirmasi.** Jangan menyalin URL Web App PRODUKSI ke konfigurasi ini.
2. Harus dibuktikan Apps Script STAGING runtime sudah memiliki `getStagingWorkspaceInfo` dan seluruh source OTP/akses yang konsisten; konektor GitHub+Drive tidak memasang kode/deployment GAS otomatis.
3. Login admin dari browser `/staging/`, data baca-saja terautentikasi, logout/revokasi sesi, serta WA OTP Fonnte end-to-end **belum terverifikasi**.
4. Kebijakan kredit awal perlu keputusan bisnis owner: mandat `Zero-Freebie`, tetapi konfigurasi STAGING `kredit_awal=10`; jangan ubah otomatis.
5. Pengujian terkontrol harus mencakup TTL OTP 5 menit, maksimal tiga kesalahan, nomor terdaftar, 1x konsumsi, sesi, PII dan perlindungan biaya Fonnte.

## Satu langkah berikut untuk owner
Buka **proyek Apps Script STAGING**, bukan produksi. Di `Deploy → Manage deployments`, salin URL Web App bertipe `/exec` dari deployment STAGING yang **sudah ada**. Jika belum ada, cukup katakan “deployment STAGING belum ada.” Jangan kirim PIN, OTP, token sesi, atau API key.

Setelah URL terkonfirmasi, verifikasi identitas `getStagingWorkspaceInfo` sebelum mengisi `staging/config.js` atau melakukan login, kemudian jalankan browser QA autentikasi baca-saja. Seluruh gerbang mutasi, registrasi, OTP, dan keuangan tetap OFF sampai audit dan izin eksplisit owner.

## Larangan
- Jangan menghapus tab/record/file atau migrasi skema produksi tanpa persetujuan eksplisit.
- Jangan mengaktifkan `NGD_MUTATIONS_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, `NGD_FINANCE_ENABLED` sekaligus atau tanpa QA.
- Jangan menyebut hasil Chrome smoke statis sebagai hasil screenshot QA manual, ataupun keberhasilan POST publik sebagai bukti sesi admin STAGING.
- Jangan menyuntikkan data dummy ke jalur produksi, mengganti nilai `kredit_awal`, harga atau komisi sepihak.

Sumber sejarah terdahulu: `docs/STAGING_WORKSPACE_HANDOFF_2026-11-15.md` dan `docs/STAGE1_AUTH_OTP_P0_CHECKPOINT_2026-11-15.md`.

## Pengujian kandidat URL STAGING — 15 November 2026, lanjutan

Owner memberikan URL kandidat Web App STAGING pada sesi lanjutan. Pengujian dari GitHub-hosted runner dilakukan menggunakan workflow `.github/workflows/verify-staging-identity.yml` **tanpa PIN dan tanpa aksi tulis**:
- **GET /exec berhasil**: API `Ngulik Digital API`, `version=1.0.3`, `writes_enabled=false`, `payments_enabled=false`.
- **POST `getStagingWorkspaceInfo` ditolak `MAINTENANCE`**, bukan identitas `NGD_STAGING`. Lihat workflow GitHub Actions run `43713266430`.
- Source GitHub versi sekarang menempatkan aksi tersebut di daftar READ dan meminta identitas STAGING; `MAINTENANCE` konsisten dengan kemungkinan versi deployment lama yang belum memuat aksi ini. **Belum dapat dikatakan pasti** tanpa membandingkan kode Apps Script runtime.
- URL **BELUM** dipasang ke `staging/config.js`; verifikasi wajib berhasil terlebih dahulu.
- Pengaman frontend staging diperkuat: identitas harus juga melaporkan `mutations_enabled=false`, `registration_enabled=false`, `otp_enabled=false`, `finance_enabled=false` sebelum login dapat ditampilkan.
- Ketika server mengembalikan `MAINTENANCE`, frontend menyarankan pemeriksaan versi deployment STAGING, bukan meminta PIN.

**Tindakan operator minimum:** Di Google Apps Script **STAGING**, periksa bahwa `Code.gs` editor berisi `getStagingWorkspaceInfo` di `apiReadActions_` dan `case 'getStagingWorkspaceInfo'` pada `apiRouter_`. Jika sudah ada, perbarui **deployment STAGING yang sama** lewat `Deploy → Manage deployments → Edit (ikon pensil) → Version: New version → Deploy`. Jika belum ada, jangan mengaktifkan flag apa pun; backup/bandingkan source Code.gs dengan GitHub sebelum memasang revisi. Setelah deployment, GitHub workflow baca-saja dapat diuji ulang untuk memvalidasi STAGING sebelum menyetel frontend.

Produksi tidak disentuh. Tidak ada klaim login browser, OTP WA nyata, CRUD, maupun siap go-live.

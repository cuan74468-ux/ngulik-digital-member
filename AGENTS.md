# AGENTS.md — Ngulik Digital Member
**Checkpoint operasional terbaru (16 November 2026):** [CI 410/410 PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43788485412), [Pages source PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43788485670) pada commit backend `9d893c117918ad5c26431ee52c859124faa1b7f3`. Source registrasi/OTP, penguncian logout, validasi sesi gagal-tertutup dan audit rekonsiliasi sudah diperkuat; backup file-level STAGING telah diuji dan manifest 15 modul GAS tersedia. **Semua perbaikan backend masih GitHub source-only**, belum terbukti terpasang pada editor Apps Script STAGING. Audit rekonsiliasi editor-only belum ada log keberhasilan dari owner. **Tahap 1 tetap PROSES/NO-GO**; provider, pendaftaran dan finance tetap OFF. [Checkpoint rinci](docs/CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md).



- [Audit dokumen dan penerapan lintas sumber 16 Nov](docs/AUDIT_DOKUMEN_DAN_IMPLEMENTASI_2026-11-16.md). Kontrak keputusan [non-eksekutabel](contracts/owner-decisions-stage1.json), PIN v2 opt-in OFF, dan manifest 15 modul harus dipatuhi sebelum sinkronisasi GAS.

## Status kerja terbaru — 16 November 2026 (baca sebelum tugas baru)

- [Checkpoint pembangunan 16 November](docs/CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md) menggantikan checkpoint 15 November sebagai **titik lanjut teknis**, bukan mandat bisnis baru.
- Dua pemeriksaan owner-only pada **editor Apps Script STAGING** sudah terbukti melalui log operator 15 November pukul 22.24: `NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables=29` dan `NGD_DATA_INTEGRITY_OK | tables=8`. **Jangan** mengulang diagnosis baris kosong kecuali ada perubahan skema/data.
- UI/UX Mobile-first V2 menjadi baseline sementara; CI Chrome telah lulus. QA Android fisik dan persetujuan desain akhir belum dilaksanakan.
- Kandidat keamanan Tahap 1 terbaru di `Code.gs`/`OtpAuth.gs`: verifikasi OTP sebelum insert, konsumsi setelah insert, dan logout menggunakan lock agar baris `sessions` tidak terhapus keliru. Perubahan ini **hanya source GitHub**, belum disinkronkan/dideploy ke editor Apps Script STAGING.
- [GitHub Actions 16 November](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43783011719) **SUCCESS: 381/381 tes**, Chrome lintas tampilan dan API readonly PASS; GitHub Pages [SUCCESS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43783011286). Commit source terakhir `bdacfa37cfd3432559831008eedb74ad9b4dfd2b`.
- Tahap 1 tetap **PROSES/NO-GO**; semua provider/kredit/pendaftaran/pembayaran tetap OFF. Tidak boleh menganggap tes offline sudah membuktikan runtime GAS setara.
- Restore rehearsal file-level dari **backup privat** telah diuji (29/29 header, 9/9 hitungan operasional, formula anggota identik), tetapi aplikasi/Apps Script belum dipulihkan atau dihubungkan ke clone. [Bukti](docs/RESTORE_REHEARSAL_2026-11-16.md).
- Manifest 15 source Apps Script GitHub dan status runtime yang belum terbukti: [GAS Runtime Sync](docs/GAS_RUNTIME_SYNC_MANIFEST_2026-11-16.md). Jangan melakukan `Code.gs` overwrite otomatis.
- [Audit keamanan Tahap 1 dan migrasi PIN](docs/SECURITY_DECISION_STAGE1_2026-11-16.md): sesi fail-closed sudah diuji di source GitHub, tetapi PIN SHA-256 tunggal dan saldo ledger tanpa filter POSTED tetap P0 yang **belum** boleh otomatis diubah. 410/410 pengujian lulus; GAS runtime belum tersinkron.

- Audit rekonsiliasi registrasi hanya-baca tersedia pada `apps-script/RegistrationRecoveryPreflight.gs` dan [runbook-nya](docs/REGISTRATION_RECOVERY_PREFLIGHT_2026-11-16.md), **source-only**: belum terpasang di Apps Script STAGING. Bergantung pada dua preflight yang sudah terverifikasi. Kode audit tidak memperbaiki data atau menerbitkan kredit.



## Wajib dibaca sebelum coding atau otomasi

Proyek ini **produk membership komersial nyata**, bukan proyek demo. Sumber kebijakan tertinggi adalah:
1. [Master Index — Dokumen Induk](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit).
2. [Mandat Produksi & Roadmap](https://docs.google.com/document/d/19KIklWdph7JSO0fiGWdpwsAe_QfqxK4mOxa5ghAJP0w/edit).
3. [Brief Eksekusi Teknis](https://docs.google.com/document/d/1o_Pea9x7A6l2U0xdxFuQNTM2BkoZ6FXI2p68JyMUnbk/edit) dengan addendum aktual.
4. [Linggau Design System](https://docs.google.com/document/d/1mKuw7ztdgixwH71shkifZxM8D_2SWTgf2WSpNiBykz8/edit).
5. [Audit Terpadu STAGING — 15 Nov 2026](docs/AUDIT_TERPADU_TAHAP_1_2026-11-15.md) sebagai **checkpoint bukti teknis**, bukan mandat bisnis baru.

Prioritas bila dokumen bertentangan: keputusan tertulis Owner dan Master/Mandat lebih tinggi daripada proposal atau source historis; kode yang sudah ada **bukan** izin menyimpang dari kebijakan. Bedakan fakta saat audit, implementasi source, runtime terdeploy, serta rencana.

## Lingkungan dan arsitektur

- Fase 1: GitHub Pages (HTML/CSS/JS tanpa build) → Google Apps Script → Google Sheets. Frontend publik pada `index.html`, `js/`, `assets/`, `config.js`. Source backend pada `apps-script/*.gs`.
- **STAGING** terisolasi: Google Sheets [STAGING 29 tab](https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit); UI [`/staging/`](https://cuan74468-ux.github.io/ngulik-digital-member/staging/); endpoint hanya dari `staging/config.js` yang telah diverifikasi melalui workflow identity.
- **PRODUCTION**: Sheets terpisah [Ngulik Digital DB](https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit). Jangan mencampurkan database/endpoints, menyalin data pelanggan, memodifikasi skema produksi atau memindahkan backend utama tanpa approval.
- Source GitHub **tidak otomatis dideploy ke Apps Script**. Selalu bandingkan proyek GAS yang benar, backup source runtime, lakukan uji STAGING, dan redeploy hanya dengan persetujuan dan catatan versi.

## Batas komunitas gratis dan membership komersial

- Enam modul lengkap Chapter 01 sudah tersusun dalam [Kumpulan Modul Chapter 1](https://docs.google.com/document/d/1s3Dki-UQVG2OUOpCBNPxyeCTkIvnZTpqtPOn2SpXkk4/edit). [SOP Chapter 01](https://docs.google.com/document/d/1PGKFnPfSKVQ0SRFclgT5aN8_x2iipnW8ng6g2H24xVg/edit) menetapkan kelas dan pendampingan dasar **100% gratis** dan tidak boleh dipaksa membeli produk.
- Data komunitas Chapter 01 ada di spreadsheet tracking sendiri; jangan otomatis impor peserta ke `members` atau menerbitkan konten sebagai kursus berbayar.
- `modul_belajar` memiliki enam entri seed yang judulnya berbeda dari dokumen komunitas; `lms_courses` masih kosong. Keduanya tidak otomatis mencerminkan program Classroom yang berjalan.
- Zero-Freebie berlaku pada nilai karya/aset dan layanan **komersial**; jangan gunakan kebijakan ini untuk membatalkan kelas dasar gratis yang sudah disepakati. Starter 10 Token tetap perlu OTP dan pembuktian anti-duplikasi sebelum aktivasi.

## Keputusan Owner 15 November 2026: Infrastruktur dahulu, provider terakhir

- Semua akun Fonnte, payment gateway, AI provider dan pengiriman pesan pihak ketiga akan dibuat atau diaktifkan oleh owner hanya setelah fondasi internal dan preflight lulus. Tidak perlu meminta API key, nomor tujuan uji, atau biaya provider sekarang.
- Ini adalah **urutan kerja persiapan**. Milestone komersial 2-6 tidak boleh diaktifkan sebelum Master Index mengizinkan. Tahap 1 tetap PROSES / NO-GO.
- Pakai [Runbook Foundation First](docs/INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md) dan [Provider Readiness Contract](contracts/provider-readiness.json) sebagai kontrak non-eksekutabel; keduanya bukan otorisasi pembayaran/WA.
- Secara kode, NGD_EXTERNAL_PROVIDERS_ENABLED harus absent/false. OtpAuth.gs membutuhkan persetujuan sakelar tersebut **selain** pengaman STAGING, OTP, registrasi, mutasi dan secret. Pemeriksaan STAGING juga menolak sakelar itu aktif. Jangan nyalakan untuk mempermudah uji.
- `InfrastructurePreflight.gs` dan `DataIntegrityPreflight.gs` sudah terbukti berjalan melalui eksekusi operator di editor STAGING (15 Nov 22.24 WIB). Namun pemasangan file lainnya seperti `StagingOtpDiagnostics.gs` **tidak dapat diasumsikan**, dan source GitHub `Code.gs`/`OtpAuth.gs` terbaru belum otomatis tersinkron. Tetap wajib backup, diff dan pengujian terkendali.

## Tahap aktif dan gerbang keselamatan

- Aktif: **Tahap 1 — OTP WhatsApp Fonnte, login PIN, sesi dan pengamanan registrasi**. Belum lulus end-to-end. Tahap 2–6 **tidak boleh diaktifkan** tanpa mandat owner.
- Default server flags `NGD_MUTATIONS_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, `NGD_FINANCE_ENABLED` = OFF; frontend `memberWritesEnabled`, `registrationOtpEnabled`, `paymentsEnabled` = false.
- Login admin STAGING dipisahkan dari mutasi member/finance; jangan mengaktifkan fitur hanya agar pengujian/login terlihat berhasil.
- OTP: 6 digit, 5 menit, maksimal 3 kesalahan, 1 nomor WA = 1 jatah starter **setelah** verifikasi, anti-replay dan anti-duplikasi ledger. Provider API menerima pesan bukan bukti terkirim. Jangan kirim WA atau berikan token/bonus nyata tanpa izin dan batas biaya.
- Starter 10 kredit adalah kebijakan yang disebut Mandat Produksi; prinsip Zero-Freebie tetap berlaku pada aset/akses komersial. Jangan mengganti `kredit_awal`, harga, nilai token, komisi, atau rate limit biaya secara diam-diam.
- Mayar, AI berbayar, fulfillment dan LMS berbayar adalah tahap berikut, bukan bagian rilis aktif. Tentukan satu ledger saldo dan satu otoritas entitlement sebelum aktivasi.

## Larangan mutasi tanpa approval eksplisit

Jangan menghapus file/branch/tab/baris/akun; jangan reset Sheets; jangan menulis skema/Script Properties/database produksi; jangan mengaktifkan pendaftaran/uang/refund/payout; jangan menerbitkan rilis publik/gelombang pilot; jangan mengirim WA ke pelanggan tanpa persetujuan. Dilarang memasukkan PIN, token, API key, secret, nomor pelanggan atau token sesi di source frontend, log CI, chat, maupun dokumentasi publik.

Jangan menanam data dummy pada jalur publik. Fixture QA boleh di `tests/` saja; parameter `?preview=` hanya aktif di localhost/lokasi QA, tidak boleh memberi login palsu pada GitHub Pages nyata.

## Pola kerja dan pengujian wajib

1. Baca dokumen acuan dan `AGENTS.md`; tentukan tahap aktif, sumber database, target endpoint, risiko P0, serta dampak perubahan.
2. Audit source/repository dan skema nyata, bukan asumsi dari dokumen lama (misalnya tabel `users` vs `members`).
3. Buat patch terkecil yang aman. Pisahkan refactor UI dari perubahan auth/finance. **Jangan menghapus fitur yang ada**. Tambahkan tes regresi untuk kegagalan, validasi, replay, race condition, session revocation.
4. Jalankan `node --test tests/*.test.cjs`, lalu GitHub Actions `Validate backend and frontend (no deploy)` dan workflow identitas STAGING yang sesuai. Tidak ada Node build untuk GitHub Pages; Node hanya digunakan oleh tes di CI.
5. Sebutkan SHA commit, hasil tes, status Pages, apa yang belum diuji, rollback, dan langkah operator berikut. Chrome smoke otomatis tidak sama dengan tes Android fisik atau uji OTP Fonnte nyata.
6. Tuliskan status sebenarnya pada checkpoint teknis; **jangan mengubah milestone ke SELESAI** atau mengklaim produksi siap jika bukti tidak lengkap. Tunggu izin eksplisit untuk langkah berisiko.

## Desain

Gunakan Linggau Design System: Clean • Human • Alive, white space, tipografi yang selaras, mobile-first, kontras/fokus terlihat, loading/error/empty state, aksesibilitas keyboard, tampilan nyata. Hindari dekorasi yang merusak efisiensi alur admin. Untuk perubahan desain, jaga isolasi data dan komponen bisnis.

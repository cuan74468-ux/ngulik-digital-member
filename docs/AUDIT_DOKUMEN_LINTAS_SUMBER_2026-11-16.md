# Audit Dokumen Lintas Sumber — Ngulik Digital Member
**Tanggal audit:** 16 November 2026 (WIB)  
**Jenis:** review dokumen, inventaris, dan verifikasi fakta non-destruktif  
**Status rilis:** **TAHAP 1 PROSES / NO-GO** untuk pendaftaran publik, transaksi, OTP provider, AI berbayar dan pilot.  
**Perubahan izin:** TIDAK ADA. Audit ini bukan mandat bisnis atau izin mutasi.

## 1. Kesimpulan eksekutif

1. **Dokumen kebijakan tetap jelas:** produk adalah membership komersial nyata; bukan demo. Pemilik memegang veto atas perubahan produksi, keuangan, arsitektur, data/destruksi, dan peluncuran.
2. **Source of truth teknis bukan blueprint historis:** metadata Google Sheets pada 16 November 2026 menunjukkan **PRODUCTION 16 tab** dan **STAGING 29 tab**, terpisah. Source GitHub mempunyai 27 kontrak dasar dengan 2 tabel OTP/WA tambahan. Jangan menyamakan persiapan STAGING dengan persetujuan migrasi PRODUCTION.
3. **Checkpoint kemarin terbukti:** operator menjalankan `ngdInfrastructurePreflightReadOnly` (29/29, writes=false, providers=DEFERRED) dan `ngdDataIntegrityPreflightReadOnly` (8 tabel, issue kosong, writes=false) pada Apps Script STAGING pukul 22.24 WIB, 15 November 2026. GitHub Actions pada SHA `a854f059a21ed8c9de6d5d0d04ef4d6e87f3e570` lulus **364/364** tes dan Chrome/browser smoke. Ini **tidak membuktikan** modul lain pada editor GAS sudah identik dengan GitHub, keamanan sesi end-to-end, restorasi backup, OTP nyata, atau transaksi.
4. **Urutan persiapan telah berubah dengan sah** menjadi foundation-first/providers-last berdasarkan keputusan owner 15 November; **milestone Tahap 1–6 tidak berubah** dan tidak dapat dilompati.
5. Terdapat **drift dokumen** (status lama, schema 14/17/25/26, contoh integrasi gateway, kebijakan affiliate) yang perlu diberi batas sejarah/penggunaan. Tidak ada alasan menghapus arsip atau menimpa mandat.

## 2. Hirarki dan register dokumen Google Drive

**Normatif, wajib dibaca terlebih dahulu:**
- [Master Index & Peta Kendali](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit) — mandat, persetujuan owner, tahap 1–6, status owner; addendum 15 November adalah sumber keputusan provider-last.
- [Mandat Produksi & Roadmap](https://docs.google.com/document/d/19KIklWdph7JSO0fiGWdpwsAe_QfqxK4mOxa5ghAJP0w/edit) — model bisnis, pilot 50, fase 1/2, pengamanan, ledger, prinsip komersial.
- [Brief Eksekusi ChatGPT](https://docs.google.com/document/d/1o_Pea9x7A6l2U0xdxFuQNTM2BkoZ6FXI2p68JyMUnbk/edit) — kontrak teknis/monetisasi historis + addendum kenyataan 29 tab dan provider-last; **jangan** mengikuti bagian 16 tab atau instruksi credential lama secara buta.
- [Linggau Design System V1.2](https://docs.google.com/document/d/1mKuw7ztdgixwH71shkifZxM8D_2SWTgf2WSpNiBykz8/edit) — Clean / Human / Alive, white space, tipografi, semantik komponen, aksesibilitas, QA; variasi sesuai konteks produk.

**Penjelas strategi, alternatif dan risiko (bukan bukti fitur aktif):**
- [Arsitektur Mesin Uang & Tim AI Otonom](https://docs.google.com/document/d/1yo9NnbXALwQwXtNpho94475Z2Tjb1mVYB3spqQ71NVI/edit) — aspirasi otomasi, unit economics, affiliate, AI roles; tidak berarti agent/job nyata telah terpasang.
- [Latar Belakang dan Analisis Risiko](https://docs.google.com/document/d/1z-6RwDuyct0NqFTpnEpLSCgdXxhq9aPY5Sls-XNepko/edit) — konsekuensi biaya, kuota GAS, lisensi, privasi, cashflow.
- [Panduan LMS/Mayar/AI Agent](https://docs.google.com/document/d/1nafI8Co1HvQBaom-huZM-w4ag8LTIGnifDQC6S1QWeo/edit) — desain alternatif Mayar sebagai LMS/checkout/affiliate; **bukan** keputusan otomatis untuk memindahkan seluruh LMS dari GAS maupun petunjuk webhook aman final.

**Program komunitas terpisah:**
- [Kumpulan Modul Chapter 1](https://docs.google.com/document/d/1s3Dki-UQVG2OUOpCBNPxyeCTkIvnZTpqtPOn2SpXkk4/edit) — enam modul ajar yang ada di Google Docs.
- [SOP Chapter 01](https://docs.google.com/document/d/1PGKFnPfSKVQ0SRFclgT5aN8_x2iipnW8ng6g2H24xVg/edit) — pendampingan dasar **100% gratis** tanpa kewajiban membeli; data peserta terpisah.
- [Panduan Ringkas & Log Keputusan](https://docs.google.com/document/d/1bQPR8YD4EzD3DWuow7L1QmoVxBVn0lhFacRqCV03NXE/edit) — operasional Chapter 01 menggunakan Google Forms/Sheets/Classroom.
- [Peta Kendali Utama Drive](https://docs.google.com/document/d/15LYvAyOBkSO2ROLr09sZuWZV83MNOI1NLe9U3t6L8GM/edit) — isolasi proyek, klasifikasi folder, kontrol dokumen.

Dokumen berlabel **[ARSIP_SUPERSIDED]** tetap arsip dan **tidak boleh** mengalahkan Master/Mandat atau mengganti nama schema aktif.

## 3. Inventaris dokumentasi GitHub (22 berkas sebelum audit ini)

**Aturan dan kondisi aktual:**
- `AGENTS.md`, `README.md`
- `docs/CHECKPOINT_2026-11-15_STAGING_INFRA_AND_INTEGRITY_OK.md`
- `docs/AUDIT_TERPADU_TAHAP_1_2026-11-15.md`
- `docs/INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md`
- `contracts/provider-readiness.json` — registry perencanaan **non-eksekutabel**, semua provider DEFERRED.

**Audit autentikasi, rilis dan operator:**
- `docs/STAGE1_AUTH_OTP_P0_CHECKPOINT_2026-11-15.md`
- `docs/CHECKPOINT_CI_AUTH_2026-11-15.md`
- `docs/STAGING_WORKSPACE_HANDOFF_2026-11-15.md`
- `docs/AUDIT_ADMIN_READINESS_2026-11-15.md`
- `docs/RELEASE_GATES_2026-11-14.md`
- `docs/PILOT_50_GO_LIVE_GATE_2026-11-14.md`
- `docs/QA_EVIDENCE_2026-11-14.md`
- `docs/ADMIN_ACCESS_DRIVE_AUDIT_2026-11-14.md`

**Handoff domain dan UX (rujukan historis/implementasi source-only):**
- `docs/COMMERCIAL_MEMBERSHIP_RELEASE_2026-11-14.md`
- `docs/USERBASE_CORE_IMPLEMENTATION_2026-11-14.md`
- `docs/MEMBER360_SUPPORT_HANDOFF_2026-11-14.md`
- `docs/CMS_NATIVE_HANDOFF_2026-11-14.md`
- `docs/MOBILE_MEMBER_DESIGN_2026-11-14.md`
- `docs/UNIFIED_DESIGN_SYSTEM_2026-11-14.md`
- `docs/NGULIK_HUB_UX_CATALOG_CHECKPOINT_2026-11-14.md`
- `docs/PATCH_AUDIT_2026-11-14.md`
- `docs/CHECKPOINT_2026-11-14.md`
- `docs/CHECKPOINT_HISTORY_2026-11-13.md`
- `docs/ARCHIVE_README_BEFORE_MEMBERSHIP_2026-11-14.md`

Semua berkas relevan di atas **ditinjau sebagai sumber riwayat**, bukan dicentang GO hanya karena halaman dokumentasinya tersedia. Banyak berkas mencerminkan keadaan benar pada **13–14 Nov**, tetapi tidak boleh dipakai sebagai instruksi operasional terkini tanpa delta terhadap 15–16 Nov.

## 4. Matriks temuan dan rekonsiliasi

| Prioritas | Temuan | Bukti/konflik | Perlakuan aman |
|---|---|---|---|
| **P0** | **Rilis Tahap 1 belum lulus** | Master status PROSES; preflight 29/8 lulus tetapi OTP Fonnte, pendaftaran, PIN/sesi member, anti-replay, restore dan transaksi belum lulus end-to-end | Tetap NO-GO; semua flags mutasi, finance, registration, OTP, LMS, provider OFF |
| **P0 sebelum finance** | **Komisi affiliate tidak punya satu konfigurasi final lintas dokumen/source** | Mandat mengutip kisaran 10–50%; Master Index 10–40%; Brief Eksekusi menetapkan **persentase per produk dan komisi berulang** dengan `komisi_hanya_order_pertama=FALSE`. Seed `Code.gs` saat audit justru `komisi_hanya_order_pertama=true` dan persentase default 25%. | **Jangan** mengubah persentase/aturan sekarang. Owner harus mengesahkan matriks produk, margin, repeat order, dan transaksi yang eligible sebelum gateway/affiliate diaktifkan |
| **P0 sebelum finance** | **Contoh autentikasi webhook dalam panduan alternatif belum layak dijadikan kontrak keamanan** | Dokumen Mayar/LMS historis memberi contoh `?token=SECRET_TOKEN` di URL. | Jangan menaruh secret di URL publik atau menyalin contoh sebagai sistem final; nanti konfirmasi event auth/signature resmi provider, replay/idempotency, timeout, refund, rekonsiliasi dan batas biaya |
| **P0 sebelum registrasi** | **Kegagalan parsial OTP → akun → starter** | Source `authRegister_` mengonsumsi bukti OTP sebelum `appendRow_('members',m)`, lalu memberikan starter grant. Multi-sheet GAS/Sheets bukan transaksi ACID. | Audit recovery/idempotensi dengan tes offline dan STAGING terisolasi sebelum live send dan mutasi |
| **P1** | **Schema dan status historis berbeda** | Brief/PRODUCTION 16 tab; dokumen lama menyebut STAGING 14/17/25/26; metadata STAGING aktual 29 dan production 16. | Pakai 29 untuk audit STAGING, 16 untuk fakta produksi; tandai angka lama sebagai sejarah. Dilarang migrasi otomatis/rename/hapus tabel |
| **P1** | **Tracker dokumen belum memuat checkpoint 22.24 WIB** | Master masih berisi frasa tahap 1 'SIAP DIEKSEKUSI' dan addendum ketika preflight disebut source-only; log operator 15 Nov membuktikan dua fungsi sudah benar-benar berjalan di editor STAGING. | Usulkan addendum status fakta (bukan centang 'Tahap 1 SELESAI'); pertahankan urutan fase owner |
| **P1** | **Otoritas LMS/entitlement ambigu** | Chapter 01 gratis di Classroom; internal `lms_courses` masih kosong; panduan alternatif menempatkan LMS di Mayar, sementara repo sudah menyediakan model LMS GAS. | Petakan **per produk/program** sumber kursus, bukti pembelian, entitlement, akses gratis/berbayar, serta kewajiban sinkronisasi; tidak boleh membuat dua sumber hak akses |
| **P1** | **Klasifikasi folder Drive bertentangan dengan lokasi aktif** | Peta Kendali Drive menyebut folder `99_STAGING_BACKUP_DAN_HAPUS` sebagai zona karantina/arsip; metadata Drive STAGING aktif menunjukkan folder induk tersebut. | **Jangan hapus atau pindah sekarang.** Usulkan koreksi peta atau pemisahan folder aktif secara terkendali setelah mempertimbangkan dependensi GAS |
| **P1** | **Runbook 14 Nov berpotensi disalahgunakan** | Beberapa handoff lama menyuruh mengganti `Code.gs`, menyalakan flags QA atau memasang deployment dari keadaan 25-tab; sementara runtime sebagian telah diperbarui dan snapshot 29-tab lulus. | Untuk operator sekarang, gunakan checkpoint 15 Nov + runbook terbaru + verifikasi diff. Arsip jangan dijadikan SOP aktual |
| **P1** | **Source/runtime belum attested untuk semua modul** | Dua preflight GAS baru terbukti melalui log; hal ini tidak memverifikasi seluruh modul `Code.gs`, `OtpAuth.gs`, `LMS.gs`, `AdminAccess.gs`, dan skrip lainnya cocok dengan commit GitHub. | Audit manifest source vs editor GAS sebelum perubahan/auth QA, jangan copy menimpa semuanya |
| **P2** | **Syarat regulasi/operasional customer-data belum lengkap** | Release gates masih meminta consent, kebijakan privasi, retensi OTP/notif, akses operator, dukungan, pelaporan insiden dan backup/restore. | Susun checklist operasional serta artefak owner approval sebelum pilot |
| **P2** | **Zero-freebie dan kelas gratis sebenarnya telah direkonsiliasi** | Mandat/Brief: nilai aset komersial; SOP Chapter 01: belajar dasar gratis. Addendum 15 Nov menjelaskan perbedaan ini. | Jangan menagih kelas gratis, menyalin PII peserta, atau otomatis menjadikannya paket berbayar. Starter 10 Token adalah aturan terpisah yang wajib diikat ke OTP valid |
| **P2** | **Keselarasan UI/UX belum sama dengan sign-off pengguna** | Linggau Design System V1.2 dan dokumen desain repo menuntut whitespace, konsistensi login/admin/member, fokus dan error state; CI Chrome bukan QA fisik Android. | Audit visual terarah setelah autentikasi aman; jangan menganggap docs/tema sudah membuktikan pengalaman siap dipakai |
| **P2** | **Janji zero-fixed-cost adalah target strategi, bukan jaminan tanpa biaya** | Dokumen bisnis sendiri mengakui batas quota GAS/Sheets serta ongkos WA, payment, provider AI dan layanan lain. | Persiapkan budget cap dan observability sebelum integrasi terakhir |

## 5. Bukti teknis yang diverifikasi, dan yang tidak

**Terbukti pada pemeriksaan ini:**
- Google Sheets **PRODUCTION memiliki 16 tab**, STAGING **29 tab** melalui metadata terpisah, tanpa menulis data.
- STAGING aktif masih terletak di folder `99_STAGING_BACKUP_DAN_HAPUS` yang berizin privat.
- Log operator 15 Nov pukul 22.24: `NGD_INFRASTRUCTURE_PREFLIGHT_OK` dan `NGD_DATA_INTEGRITY_OK`.
- GitHub Actions code commit `a854f059a21ed8c9de6d5d0d04ef4d6e87f3e570` **364/364** sukses dan Chrome/browser smoke sukses. Commit checkpoint docs `e1b57beab84e9c1062f75101867ebc7eb49ff007` berhasil di GitHub Pages.
- Registry provider dan server gate secara desain masih DEFERRED/OFF.

**Tidak terbukti / jangan disimpulkan:**
- Pemulihan backup penuh, restore drill atau rollback GAS runtime.
- Kesesuaian semua file GAS editor dengan source GitHub, serta perilaku PIN/OTP/member end-to-end.
- Keamanan gateway/event resmi, pengiriman WhatsApp, penerimaan dana, settlement, AI provider, affiliate payout.
- Kesiapan semua layar pada perangkat Android dan Windows fisik; semua admin CRUD/CMS dapat digunakan nyata.
- Ketersediaan biaya gratis tanpa batas/komitmen provider.

## 6. Keputusan yang masih membutuhkan persetujuan owner (jangan diimplementasikan diam-diam)

1. **Matriks komisi/promo per produk**, berulang atau order pertama, dan aturan biaya/margin.
2. **LMS authority per produk**: Classroom gratis, GAS internal atau Mayar, serta migrasi/entitlement.
3. **Retensi WA/OTP/PII, syarat penggunaan, consent**, dan kebijakan pemulihan akun/insiden.
4. **Kebijakan callback, refund, wallet/ledger**, rekonsiliasi dan otorisasi admin.
5. **Perubahan organisasi folder STAGING aktif** (jika perlu), setelah review link/dependensi GAS.
6. Persetujuan tes Fonnte, Mayar, provider AI dan peluncuran publik **nanti**, bukan sekarang.

## 7. Rekomendasi prioritas sesi berikut

1. Buat **manifest baseline source GAS vs runtime STAGING** (baca dan bandingkan tanpa mengubah setting), terutama modul autentikasi, sessions, AdminAccess, OtpAuth, LMS dan finance.
2. Audit login/logout, PIN brute-force, sesi invalidation, change PIN dan token expiry pada source+tes offline; perlakukan register yang memakan OTP sebelum insert sebagai risiko recoverability.
3. Rancang **restore rehearsal** pada clone backup privat/lingkungan terisolasi yang tidak terhubung endpoint aktif. Snapshot bukan bukti pemulihan yang berhasil.
4. Matriks entitlement & CRUD LMS dan rekomendasi tata kelola konten gratis/komersial sebagai dokumen untuk owner review.
5. Sinkronkan **fakta** pada Master Index, Brief, README, AGENTS dan runbook hanya dengan addendum terbatas serta review hirarki; jangan mengganti keputusan bisnis.
6. Provider accounts dan biaya transaksi tetap fase integrasi terakhir sesuai keputusan pemilik.

## 8. Batas perubahan audit

Review ini **tidak mengubah Google Drive Docs, spreadsheet produksi/STAGING, data anggota, PIN, Script Properties, endpoint GAS, konfigurasi release, atau layanan eksternal**. Dokumen audit baru ini bersifat pengamatan/temuan dan rencana lanjut; tidak mengotorisasi eksekusi P0/finance/production.

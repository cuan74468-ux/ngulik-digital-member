# Audit Ulang Seluruh Dokumen dan Implementasi — Ngulik Digital Member
**Tanggal:** 16 November 2026 (WIB)  
**Ruang lingkup:** Master Index, Mandat Produksi, Brief Teknis, Linggau Design System, dokumen strategi/risk/Mayar/LMS, SOP dan materi Chapter 01, Peta Kendali Drive, seluruh dokumentasi GitHub, konfigurasi frontend, 15 source modul GAS, kontrak release, dan test suite.
**Status:** REVIEW + IMPLEMENTASI SOURCE-ONLY, **tidak** mengubah kebijakan bisnis atau runtime.

## 1. Hierarki keputusan yang berlaku
1. Keputusan owner tertulis dan [Master Index](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit) + [Mandat Produksi](https://docs.google.com/document/d/19KIklWdph7JSO0fiGWdpwsAe_QfqxK4mOxa5ghAJP0w/edit).
2. Bukti deployment/backend STAGING dan observasi database yang terverifikasi.
3. Source GitHub + tes yang benar-benar lulus pada commit tersebut.
4. Brief lama, proposal AI, blueprint Mayar dan checkpoint historis untuk konteks; **bukan** bukti rilis.

**Tegas:** Tahap 1 registrasi WA/OTP, PIN dan sesi tetap PROSES/NO-GO. Tahap 2–6 tidak diaktifkan. Produk riil komersial, bukan demo. Prioritas owner: internal foundation-first, providers-last.

## 2. Fakta terkini yang tidak boleh dicampur
- Database **STAGING 29 tab**, PRODUCTION **16 tab**. Jumlah 14/17/25/26 di dokumen historis bukan kondisi terkini. Belum ada izin migrasi skema produksi.
- Pada GAS editor STAGING, owner sudah membuktikan `ngdInfrastructurePreflightReadOnly` (29/29) dan `ngdDataIntegrityPreflightReadOnly` (8 tabel) lulus 15 Nov 22.24 WIB, keduanya read-only. Itu tidak membuktikan seluruh file GAS editor identik dengan GitHub.
- File backup STAGING privat telah dicoba disalin ke lokasi uji yang terisolasi; 29 tab, 29 header, 9 hitungan operasional dan sampel rumus cocok. **Bukan** application-level restore.
- UI/UX Mobile-first V2, login shell, katalog dan admin lulus QA otomatis Chrome; **bukan** QA Android fisik maupun operasi komersial.
- Chapter 01 (6 modul) **100% gratis** melalui program komunitas/Google Classroom, terpisah dari LMS komersial `lms_*` dan peserta tidak diimpor tanpa keputusan owner.
- Starter **10 Token per WA terverifikasi** adalah kebijakan yang didokumentasikan. Ini berbeda dari akses komersial Zero-Freebie. Tidak mengubah nominal maupun kurs token.

## 3. Audit konflik yang masih memblokir aktivasi
| Prioritas | Konflik / risiko | Tindak lanjut yang aman |
|---|---|---|
| P0 | Source GitHub tidak identik secara terbukti dengan GAS editor STAGING | Bandingkan manifest 15 file dan source runtime sebelum patch/deployment |
| P0 | Hash PIN lama SHA-256+salt mudah ditebak bila Sheets bocor | Format HMAC server-pepper **V2 opt-in OFF** tersedia di source, tes kompatibilitas; aktivasi hanya sesudah review owner/backup secret/QA |
| P0 | OTP/member/GRANT/session lintas Sheets tidak ACID; partial commit | Unit/fault tests + preflight recovery read-only tersedia; belum ada log runtime audit baru |
| P0 | Ledger `creditBalance_` menjumlahkan seluruh jumlah tanpa filter status `POSTED` | Tidak mengubah nominal/ledger tanpa keputusan kontrak transaksi dan migration QA |
| P0 | Komisi: Mandat memiliki rentang per kategori; Brief mengatur recurring (`komisi_hanya_order_pertama=FALSE`), seed source masih TRUE dan 25% | **Tidak** mengubah skema komisi/seed sebelum matriks final disahkan owner |
| P0 | Kredensial, consent, privacy/retensi, rollback, autentikasi runtime, provider test belum disahkan | Semua gate bisnis tetap OFF; catat bukti sebelum pilot |
| P1 | Contoh Mayar lama memakai secret parameter URL | Tidak digunakan sebagai implementasi final; butuh verifikasi auth event resmi, replay, idempotensi |
| P1 | Dua kemungkinan otoritas LMS (Classroom, native GAS, Mayar) | Pilih otoritas hak akses per produk sebelum sinkronisasi komersial |
| P1 | Folder `99_STAGING_BACKUP_DAN_HAPUS` berisi STAGING aktif serta backup | Jangan menghapus atau memindahkan tanpa review dampak dan otorisasi |

## 4. Perubahan yang benar-benar diterapkan pada source
1. **PIN V2 opt-in**: `Code.gs` & `AdminAccess.gs` dapat menulis `v2$HMAC` hanya ketika `NGD_PIN_HASH_V2_ENABLED=true` dan pepper rahasia sudah ada. Flag belum diatur; default tetap V1, akun lama tidak dimigrasikan. Verifikasi login V1/V2 mendukung rollback flag tulis bila secret dipertahankan.
2. **Kebijakan starter eksplisit**: `authRegister_` tidak lagi diam-diam mengasumsikan kredit awal 10 saat key `kredit_awal` hilang/kosong. Nominal yang dikonfigurasi **tidak diubah**, tetapi registrasi ditolak sampai kebijakan valid.
3. **Governance regression**: `contracts/owner-decisions-stage1.json` non-eksekutabel dan `tests/owner-decision-gates.test.cjs` menguji pemisahan lingkungan, stage NO-GO, fitur finansial nonaktif dan batas komunitas.
4. **Manifest aktual**: `contracts/gas-runtime-source-manifest-2026-11-16.json` menyimpan SHA Git blob 15 file saat snapshot source; tes `tests/source-manifest.test.cjs` akan gagal bila modul GAS berubah tanpa memperbarui manifest. SHA Git bukan checksum kode yang terpasang di GAS.
5. Test HMAC sintetis menggunakan API `Utilities.computeHmacSha256Signature` yang didokumentasikan oleh Google; test bukan pembuktian provider/GAS live.

**Penting:** Ini implementasi teruji pada source GitHub; tidak ada mutasi DB, perubahan `Script Properties`, pengiriman OTP, perubahan harga/kredit/komisi, deploy GAS, atau aktivasi komersial.

## 5. Matriks langkah selanjutnya
| Urutan | Fokus | Syarat selesai |
|---|---|---|
| 1 | Manifest GAS editor vs GitHub dan source backup | Ketahuan file/versi yang benar; patch function-level dengan rollback, tanpa overwrite buta |
| 2 | Jalankan `ngdRegistrationRecoveryPreflightReadOnly` dari editor STAGING setelah sumbernya cocok | Log count-only dan penanganan REVIEW_REQUIRED tanpa kredensial |
| 3 | Keamanan PIN V2 dan sesi | Uji admin/member lama & baru, throttle, expired/revoke, secret backup dan recovery pada STAGING terisolasi |
| 4 | Recovery transaksional | Rekonsiliasi OTP/member/GRANT/log; tidak ada kredit otomatis dari audit |
| 5 | LMS CRUD/entitlement internal | Hak admin/member dan publikasi konten sesuai keputusan owner; komunitas gratis terpisah |
| 6 | Kontrak ledger/komisi dan operasional | Keputusan produk, status transaksi dan persetujuan finance owner |
| 7 | Last-mile Fonnte/Mayar/AI provider | Akun disiapkan owner terakhir, QA STAGING, biaya, consent dan go-live tersendiri |

## 6. Pengaman dokumentasi
- [Checkpoint kerja aktif](CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md)
- [Rencana keamanan sesi & PIN](SECURITY_DECISION_STAGE1_2026-11-16.md)
- [Preflight recovery registrasi](REGISTRATION_RECOVERY_PREFLIGHT_2026-11-16.md)
- [Manifest GAS runtime](GAS_RUNTIME_SYNC_MANIFEST_2026-11-16.md)
- [Restore terisolasi](RESTORE_REHEARSAL_2026-11-16.md)
- [Keputusan stage machine-readable](../contracts/owner-decisions-stage1.json)
- [Manifest source 15 modul](../contracts/gas-runtime-source-manifest-2026-11-16.json)

**Status GO-LIVE: NO-GO.** Audit tidak memberi izin migrasi produksi maupun tindakan finansial.

## 7. Sinkronisasi dokumen kendali Google Drive (faktual, tidak mengubah mandat)

Pada 16 November, addendum status faktual disisipkan dan dibaca ulang di:
- [Master Index](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit): status Tahap 1, bukti runtime 29/8, PIN V2 default OFF, kebijakan provider-last, bukan izin aktivasi.
- [Brief Eksekusi Teknis](https://docs.google.com/document/d/1o_Pea9x7A6l2U0xdxFuQNTM2BkoZ6FXI2p68JyMUnbk/edit): delta source/runtime, explicit kredit awal, checksum GAS, risiko ledger & komisi tanpa mengubah nilai.
- [Peta Kendali Drive](https://docs.google.com/document/d/15LYvAyOBkSO2ROLr09sZuWZV83MNOI1NLe9U3t6L8GM/edit): peringatan bahwa folder bernama `99_STAGING_BACKUP_DAN_HAPUS` masih menampung database STAGING aktif. **Dilarang penghapusan/pemindahan berdasarkan nama folder.**

Dokumen normatif Mandat Produksi dan SOP komunitas **tidak diedit**, karena ketentuannya tetap berlaku. Addendum ini tidak mengganti tahap, izin, harga, komisi, atau struktur database. [CI source 430/430 PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43791863410) dan [Pages PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43791863012). Pembacaan source bukan bukti GAS aktif telah dimigrasikan.

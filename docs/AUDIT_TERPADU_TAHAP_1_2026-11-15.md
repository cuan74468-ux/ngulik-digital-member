# AUDIT TERPADU & SINKRONISASI MANDAT — NGULIK DIGITAL MEMBER

**Tanggal:** 15 November 2026 WIB  
**Cakupan:** dokumen kendali Google Drive, data Google Sheets STAGING, GitHub `main`, Apps Script Web App STAGING, GitHub Actions dan GitHub Pages.  
**Tahap resmi:** **Tahap 1 PROSES / NO-GO** untuk registrasi member publik, pengiriman OTP nyata, pembayaran dan transaksi finansial.  
**Metode:** pembacaan metadata/header/range STAGING tanpa menulis baris; verifikasi API hanya `getStagingWorkspaceInfo` dan `doGet`; pengujian GitHub Actions; tidak mengirim PIN/OTP/WA.

## 1. Rujukan dan urutan otoritas

| Dokumen aktif | Kedudukan |
|---|---|
| [Master Index — 00](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit) | Master tahapan dan hak veto Owner. Diberi addendum status faktual 15 November. |
| [Mandat Produksi](https://docs.google.com/document/d/19KIklWdph7JSO0fiGWdpwsAe_QfqxK4mOxa5ghAJP0w/edit) | Keputusan arsitektur Fase 1, pilot 50, komersial nyata, pengamanan, nilai token dan starter. Tidak diubah oleh sesi ini. |
| [Brief Teknis ChatGPT](https://docs.google.com/document/d/1o_Pea9x7A6l2U0xdxFuQNTM2BkoZ6FXI2p68JyMUnbk/edit) | Spesifikasi awal dan addendum kontrak STAGING aktif. Diberi addendum tanggal 15 November. |
| [Arsitektur Mesin Uang & 5 AI Agent](https://docs.google.com/document/d/1yo9NnbXALwQwXtNpho94475Z2Tjb1mVYB3spqQ71NVI/edit) | Rancangan bisnis/target tahap lanjut, **bukan** klaim implementasi Mayar/AI aktif. |
| [Latar Belakang & Risiko](https://docs.google.com/document/d/1z-6RwDuyct0NqFTpnEpLSCgdXxhq9aPY5Sls-XNepko/edit) | Rasionalisasi bisnis, perlindungan biaya dan risiko. |
| [Integrasi Mayar & LMS](https://docs.google.com/document/d/1nafI8Co1HvQBaom-huZM-w4ag8LTIGnifDQC6S1QWeo/edit) | Rancangan alternatif LMS/checkout masa depan; **jangan** menyalin skema `users` dan webhook percobaan ke backend aktif. |
| [Linggau Design System](https://docs.google.com/document/d/1mKuw7ztdgixwH71shkifZxM8D_2SWTgf2WSpNiBykz8/edit) | Arah visual, aksesibilitas, responsif dan QA. |
| Dokumen `[ARSIP_SUPERSIDED]` | Riwayat saja, bukan panduan mutasi data. |

Fakta teknis mengikuti runtime/Sheets yang diverifikasi, tetapi **tidak** dapat mengubah kebijakan bisnis yang memerlukan keputusan Owner.

## 2. Infrastruktur dan autentikasi yang terverifikasi

- GitHub: `cuan74468-ux/ngulik-digital-member`, branch `main`; situs publik `https://cuan74468-ux.github.io/ngulik-digital-member/`.
- STAGING admin: `https://cuan74468-ux.github.io/ngulik-digital-member/staging/`.
- STAGING GAS Web App: `https://script.google.com/macros/s/AKfycbyQYrRKN0mvIuoYFyWwQVNaA6Vc9hYYj4ycQSy3B1NXPJ4PbvbRIfZo7YVT4NL4IIlh/exec`.
- Bukti independen [GitHub Actions](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43715144083): GET merespons API v1.0.3 dan writes/payments disabled; POST mengembalikan identitas `NGD_STAGING`; empat flags mutasi/registrasi/OTP/finance OFF; Chrome berhasil auto-connect hingga form login tanpa PIN.
- Endpoint STAGING terpisah dari endpoint produksi; STAGING panel kini di-pin terhadap URL resmi pada `staging/config.js`, bukan input bebas URL arbitrary.
- Database STAGING [29 tab](https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit). Production [Ngulik Digital DB](https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit) tetap terpisah. [Backup sebelum migrasi](https://docs.google.com/spreadsheets/d/1YA0KQ13h4lUVipedZ091OhE1bRrdFNtrX0YGO0AQA74/edit) tersedia; tidak diuji restore.
- STAGING `sessions` memiliki satu record berperan `ADMIN`, tercatat tanpa membaca token hash; ini mendukung bukti penerbitan sesi, **bukan** pengujian penuh logout/revokasi di semua perangkat.
- Status member OTP Fonnte end-to-end, pendaftaran, grant starter, dan seluruh transaksi: **BELUM LULUS**.

## 3. Inventaris seluruh 29 tabel STAGING

Snapshot jumlah baris dengan nilai kolom A yang tidak kosong pada 15 November 2026 (bukan jumlah akhir masa depan). Pembacaan header A1:AP1 dilakukan untuk semua tab; tabel tetap dipertahankan beserta kolom ekstensi.

| Tab | Record | Tab | Record |
|---|---:|---|---:|
| members | 1 | sessions | 1 |
| otp_verifications | 0 | wa_notifications | 0 |
| pengaturan_sistem | 37 | credits_ledger | 0 |
| audit_logs | 3 | orders | 0 |
| affiliate_commissions | 0 | katalog_produk | 9 |
| etalase_affiliate_luar | 0 | klik_log | 0 |
| ai_tools | 4 | modul_belajar | 6 |
| progress_member | 0 | ringkasan | 13 |
| support_tickets | 0 | ticket_activities | 0 |
| product_releases | 0 | lms_courses | 0 |
| lms_lessons | 0 | lms_enrollments | 0 |
| lms_progress | 0 | lms_workspaces | 0 |
| lms_ai_jobs | 0 | lms_revisions | 0 |
| notifications | 0 | service_requests | 0 |
| site_content | 0 | | |

**Bukan anomali:** schema backend `NGD.HEADERS` berisi 27 tabel, sedangkan `otp_verifications` dan `wa_notifications` dikelola modul OTP terpisah. Header `members` telah memiliki `wa_verified` + `wa_verified_at` sebagai ekstensi; `orders` memiliki enam kolom gateway/follow-up ekstra; `katalog_produk` memiliki `komisi_persen` dan `sumber_produk`. Jangan mengganti header dengan daftar legacy atau menjalankan ulang setup penuh pada DB yang telah terisi.

**Pengaturan bisnis yang teramati:** `kredit_awal=10`; `mode_pendaftaran=TERBUKA` di data. Yang kedua **tidak** berarti registrasi Web App sudah dibuka: flags backend dan frontend tetap OFF. Jangan otomatis mengubah dua nilai ini.

## 4. Temuan keselarasan (keputusan, bukan asumsi)

| Bidang | Dokumen/target | Fakta runtime/source | Keputusan/larangan |
|---|---|---|---|
| Tahap 1 | OTP+PIN+sesi+starter | STAGING attestation lulus; record OTP nol; jalur member belum QA nyata | Tetap PROSES, NO-GO; jangan melompat tahap |
| Struktur data | 16 tab base lama, proposal `users/products` | 29 tab STAGING, kode memakai `members/katalog_produk` | Jangan migrasi/rename/hapus; perbaiki referensi dokumen |
| Starter | Zero-Freebie + starter 10 token terikat WA | `kredit_awal=10`, ledger kosong | **Kompatibel bila starter terkontrol**, tetapi butuh bukti anti-abuse dan persetujuan biaya |
| Payments | Mayar/QRIS/auto-settlement direncanakan | Tidak ada order/ledger transaksi | Gerbang finance tetap OFF, belum terintegrasi |
| Affiliate | 10–50% menurut produk/tier pada konsep | Record komisi nol; schema bersifat umum | Jangan hardcode rate atau payout tanpa policy owner |
| LMS | Classroom vs LMS internal vs Mayar | 6 modul belajar awal; kursus internal masih 0 | Tentukan otoritas entitlement per produk; jangan buat kelas dummy |
| AI | 4 tools seed, provider murah, kredit potong server | 4 tools ada, pemakaian belum diuji | API key di GAS, limit biaya, tahap 2 belum dimulai |
| UI | Produk komersial, Clean/Human/Alive | UI GitHub Pages + STAGING admin berjalan; QA preview localhost-only | Tidak ada tombol bypass login publik; lanjut QA Android nyata |
| API | Backend dengan guards | Source `Code.gs` di GitHub bukan otomatis runtime GAS | Review diff & deploy STAGING manual setelah QA |

## 5. Perbaikan kode sumber aman dalam audit ini

1. **Registrasi OTP fail-closed:** `requireRegistrationWaEvidenceColumns_` memverifikasi bahwa header `members` punya tepat satu kolom untuk identitas, PIN hash/salt, `wa_verified` dan `wa_verified_at`. `OtpAuth.gs` menolak permintaan sebelum biaya pengiriman Fonnte bila bukti tidak dapat disimpan, dan `Code.gs` memeriksa ulang sebelum mengonsumsi OTP/register. Ada tes untuk header hilang, duplikat, dan valid. **Source-only, belum disalin ke Apps Script STAGING runtime.**
2. **Endpoint admin di-pin:** `staging/admin.js` menolak endpoint selain URL yang telah diverifikasi pada `staging/config.js` sebelum mengirim PIN. Browser auto-connect tetap digunakan. Tes skenario endpoint palsu dan URL benar ditambahkan.
3. Pengujian Node/Chrome dan GitHub Pages dijalankan melalui workflows; hasil terbaru harus dihubungkan ke SHA commit yang sama. Ketika ada perubahan source-only, **jangan** mengklaim OTP live sudah terpasang.
4. Addendum fakta teknis ditambahkan ke Master Index dan Brief Eksekusi di Google Drive; Mandat Produksi, database, harga, ledger serta Script Properties tidak diubah.

## 6. Klarifikasi materi Chapter 01 versus LMS komersial internal

**Sumber terbaru yang diperiksa langsung**:
- [Kumpulan Lengkap Modul Chapter 1](https://docs.google.com/document/d/1s3Dki-UQVG2OUOpCBNPxyeCTkIvnZTpqtPOn2SpXkk4/edit): enam modul nyata dan lengkap, berisi tujuan, langkah praktik dan tugas; materinya meliputi alat digital UMKM, Google Maps/Profil Bisnis, Gemini AI, poster Canva, WhatsApp Business, serta kalender promosi tujuh hari.
- [Modul 01 — Sambutan & Cara Belajar](https://docs.google.com/document/d/1GTaci6pMSM5-oJdE5CEMpJOdj1X07dwXwRiHCwPiYwU/edit): materi pengantar yang lebih rinci.
- [SOP Pertemuan 1 & Aturan Kelas](https://docs.google.com/document/d/1PGKFnPfSKVQ0SRFclgT5aN8_x2iipnW8ng6g2H24xVg/edit): **materi dan pendampingan dasar Chapter 01 gratis 100%, tanpa kewajiban membeli**; jaga kerahasiaan PIN/OTP, gunakan Classroom dan Grup WA dengan aturan pendampingan.
- [Panduan Ringkas & Log Keputusan Chapter 01](https://docs.google.com/document/d/1bQPR8YD4EzD3DWuow7L1QmoVxBVn0lhFacRqCV03NXE/edit): keputusan 9 Nov 2026 memakai Google Classroom, Google Forms, Google Sheets serta Grup WhatsApp untuk komunitas.
- [Data Peserta & Tracking Chapter 01](https://docs.google.com/spreadsheets/d/1W7PRj1BiKgLbw5bFkcKHogno8SMelbhjCC5OYH6hrzI/edit): workbook terpisah dengan tab `Form Responses 1` dan `Tracking Peserta`; hanya metadata diperiksa, **tidak menyalin PII peserta ke membership**.

**Pembedaan tiga jenis isi**:
1. **Kurikulum komunitas Chapter 01**: enam modul Google Docs **sudah ada**, jalur belajar Google Classroom dan grup WA disiapkan, kebijakan pendampingan dasar **gratis**. Tidak otomatis harus memungut saldo kredit dan tidak boleh dipaksakan menjadi konten membership berbayar.
2. **Daftar belajar legacy dalam `modul_belajar`**: enam baris seed pada STAGING, namanya **tidak identik** dengan enam judul modul Chapter 01 di Google Docs; perlu pemetaan editorial sebelum ditautkan, jangan melakukan update massal ke Sheets atau mengklaim sudah tersinkron.
3. **LMS native/internal dalam `lms_courses/lms_lessons`**: masih **nol** record STAGING. Ini infrastruktur kursus baru untuk tahap lebih lanjut, bukan bukti Chapter 01 belum punya materi.

**Rekonsiliasi prinsip komersial**: `Zero-Freebie` pada Mandat Produksi menghargai aset digital/proses AI dan hak akses komersial yang dijual. Itu **tidak menghapus keputusan Chapter 01** untuk edukasi dasar dan pendampingan komunitas tanpa biaya. Mandat juga eksplisit menyebut starter 10 Token untuk satu nomor WA terverifikasi; belum ada grant riil dan seluruh pengaman tetap OFF. Jangan mengubah harga, entitlement, saldo, status peserta, atau memindahkan data komunitas tanpa mandat owner.

**Belum boleh dilakukan otomatis**: menerbitkan isi Google Docs sebagai kursus publik tanpa penetapan izin akses dan kurasi; menyatukan tracker komunitas dan database membership; memberi akses LMS berbayar dari kelas komunitas gratis; membuat kursus dummy; mengaktifkan `NGD_LMS_ENABLED` demi memperlihatkan modul.

## 7. Gate prioritas dan langkah operator

**P0 A — Masih harus dibuktikan:** perbedaan source vs runtime GAS, semua file modul OTP terpasang; jalankan `ngdOtpStagingPreflight` dalam editor Apps Script STAGING dengan seluruh flags OFF. Log aman yang diharapkan `OTP_STAGING_SCHEMA_PREFLIGHT_OK` (jika kode diagnostik memang terpasang).

**P0 B — Setelah P0 A:** periksa login admin ke dashboard, membaca data nyata, logout, pencabutan sesi, relogin, Android/Windows manual. Jangan mengirim PIN/token dalam percakapan.

**P0 C — Memerlukan izin tambahan:** uji pengiriman OTP Fonnte dengan nomor WhatsApp uji yang jelas kepemilikannya dan batas biaya harian. Uji salah 3x, TTL 5 menit, replay, no-double-grant, penguncian PIN, idempotensi dan kondisi gagal provider. Kembalikan flags OFF sesudahnya.

**P1:** kebijakan retensi/privasi WA, throttle abuse, anggaran Fonnte, prosedur backup/restore drill; konfirmasi kebijakan Chapter 1 gratis vs Zero-Freebie komersial; putuskan otoritas LMS dan pembayaran di tahap masing-masing.

**P2:** pengisian kursus internal nyata, eBook/PLR dengan lisensi sah, dashboard marketing, otomatisasi afiliasi dan konten — hanya setelah milestone terkait diizinkan.

## 8. Rollback dan transparansi

- Frontend: revert commit GitHub yang relevan; verifikasi ulang Actions dan Pages, tanpa menghapus histori.
- Source backend: sebelum memasang ke Apps Script, buat salinan file editor STAGING dan catat versi deployment. Jika harus revert, pilih versi deployment STAGING sebelumnya, tanpa menyentuh produksi.
- Gerbang: biarkan `NGD_MUTATIONS_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, `NGD_FINANCE_ENABLED` OFF. Jangan menyalakan semua secara bersamaan.
- Data: tidak ada reset, update, delete atau perubahan schema Sheets dalam audit ini. Audit READ bukan uji restore, bukan jaminan ACID, dan bukan persetujuan menerima uang.

**Penutup:** STAGING terkoneksi dan skema tersedia; autentikasi member/OTP Fonnte serta operasi komersial belum GO. Kriteria `SELESAI` hanya boleh dinaikkan berdasarkan bukti QA & keputusan owner, bukan keberhasilan render UI semata.

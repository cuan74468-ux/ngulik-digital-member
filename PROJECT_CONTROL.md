# PROJECT CONTROL — NGULIK DIGITAL MEMBER

Satu-satunya berkas kendali operasional proyek. Gunakan tautan berikut; jangan membuat daftar registry, dokumen kontrol, atau backup baru untuk pengujian rutin.

## Empat tautan utama

| Komponen | Tautan |
| --- | --- |
| GitHub — source code (`main`) | https://github.com/cuan74468-ux/ngulik-digital-member |
| Editor Apps Script STAGING (dikonfirmasi operator) | https://script.google.com/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit |
| Google Sheets STAGING — 29 tab (nama file lama masih menyebut 27 tab) | https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit |
| Google Sheets PRODUKSI — 16 tab | https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit |

## Log perubahan

| Tanggal (WIB) | Versi GAS | Perubahan | Status |
| --- | --- | --- | --- |
| 2026-11-19 | Belum dicocokkan ke versi deployment GAS | P1 login OTP Member akun Member QA dan P2-A checkout Rp10.284 | LULUS pada pengujian HP/Sheets STAGING yang dikonfirmasi operator |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Tampilan nominal checkout menggunakan `total_bayar` utuh + CSS mobile + cache busting | Source `main` diperbarui; tampilan HP menunggu verifikasi |
| 2026-11-19 | Belum disinkronkan/diuji pada GAS | Simulasi read-only `ngdVerifyFullStagingReadiness()` diperkuat di `apps-script/Code.gs` | SOURCE UPDATED — belum dinyatakan runtime PASS |
| 2026-11-19 | Tidak berubah | Menetapkan satu file kendali dan kebijakan anti-duplikasi | Tersimpan di GitHub `main` |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Riwayat pesanan: buka detail read-only, penanganan kedaluwarsa, navigasi kembali, dan cache busting | SOURCE UPDATED — menunggu uji HP |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Pengaman detail pembayaran: tanggal kedaluwarsa tidak valid, status non-PENDING, dan QRIS pada order tertutup | SOURCE UPDATED; parse JS PASS; uji HP masih diperlukan |
| 2026-11-19 | Source GAS invoice diperbarui; runtime GAS belum disinkronkan | Alur manual via WA, kartu pesanan aktif, konfirmasi Member, pemeriksaan dana Admin di HP dan fulfillment yang sudah ada | Frontend SOURCE UPDATED; 6 skenario tampilan PASS; uji HP/approval nyata belum dilakukan |
| 2026-11-19 | GAS source diperbarui; belum diverifikasi di editor/deployment | Checkout manual via WA, kartu pesanan dapat diketuk, konfirmasi Member, verifikasi dana Admin dari HP, metode transfer aktual, auto-fulfillment dan WA | Source GitHub tersimpan; 6 skenario UI + simulasi pembayaran GAS PASS; runtime/end-to-end belum diuji |
| 2026-11-19 | GAS New Version (nomor versi belum dilaporkan) | `ngdVerifyFullStagingReadiness()` pada GAS STAGING: 17 checks PASS; ledger idempotency 13 checks PASS | RUNTIME SYNTHETIC TESTED — mutations=0, provider_calls=0; pembayaran nyata belum diuji |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Form Admin: pernyataan dana wajib dicentang sendiri setelah formulir dibuka; tombol Lunas baru aktif saat seluruh bukti cocok | SOURCE UPDATED; 6 skenario validasi PASS; runtime HP belum diuji |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Pesanan tanpa sesi menawarkan login Admin PIN atau Member OTP; login Member diberi jalur Admin PIN | SOURCE UPDATED; uji jalur PIN/OTP PASS |
| 2026-11-19 | GAS tidak berubah | Optimasi frontend: hapus pembacaan rekonsiliasi tak terpakai di Pesanan Admin, mulai pemuatan halaman tanpa menunggu data publik, paralelkan Studio AI, dan tampilkan detail pesanan sementara secara aman | SOURCE UPDATED; sintaks dan pemeriksaan preview PASS; latensi nyata HP belum diukur ulang |
| 2026-11-19 | GAS tidak berubah | Audit onboarding dan transaksi: simulasi registrasi aktif/waitlist/OTP salah/nomor duplikat PASS; konfirmasi waiting list persisten; data STAGING menunjukkan order lewat tenggat masih PENDING | FRONTEND SOURCE UPDATED; trigger expireOrders belum terverifikasi; uji registrasi nyata masih dibutuhkan |
| 2026-11-19 | GAS STAGING: versi baru diterapkan owner, nomor versi belum tercatat | Review ulang dokumen Drive dan sumber aktif: Fase 1 pilot 50 user, QRIS statis/manual, token/affiliate, LMS Chapter 01, keamanan, dan QA | CHECKPOINT: OTP login + checkout invoice PASS; sintetik GAS 17 checks PASS; registrasi baru, uang nyata→fulfillment/komisi/WA, expired trigger, AI provider, LMS dan publikasi produksi BELUM LULUS |

| 2026-11-19 | GAS tidak berubah | Gap hasil pembacaan Drive/Sheet: QA item aktif; banner pilot sudah publish; eBook STAGING Rp0 vs produksi Rp49.000; label etalase gratis tidak konsisten; 4 LMS course + 8 lessons publish | READ-ONLY FINDINGS — tidak ada harga, konten, status order, atau data produksi yang diubah |

| 2026-11-19 | GAS STAGING tidak diubah pada sesi dokumentasi | Empat Google Docs disinkronkan: Blueprint Workspace V1.2, Master Index, Brief Teknis, Command Center. Ngulik Tools Studio diputuskan sebagai arsitektur proyek terpisah; MVP Visual → Musik → Video, Pages/Workers/D1, Queues/R2 tidak wajib di awal, SSO sekali pakai, reserve/settle/release | DOKUMEN DIPERBARUI DAN DIBACA BALIK; Tools Studio belum dibangun; aplikasi/DB/deployment tidak diubah |
| 2026-11-20 | GAS dan database tidak berubah | LANGKAH 1: eBook Vibe Coder & Classroom Chapter 1 ditautkan langsung dari Beranda dan halaman Belajar publik, tanpa login Member. UI responsif di CSS bersama; cache CSS/JS diperbarui di halaman publik dan STAGING | SOURCE UPDATED di GitHub `main`; JS syntax PASS; simulasi tamu Beranda/CMS dan #belajar PASS; akses riil Google Classroom/GitHub Pages dari HP masih perlu verifikasi |

| 2026-11-20 | GAS dan database tidak berubah | Koreksi UI Langkah 1: hilangkan tombol eBook/Classroom ganda di hero, dua kartu besar, dan daftar belajar tamu yang menumpuk; ganti satu baris tautan ringan pada Beranda serta halaman Belajar | SOURCE UPDATED di `main`; syntax JS dan simulasi Beranda CMS/guest PASS; verifikasi visual HP masih diperlukan |

| 2026-11-20 | GAS, Sheet, dan pembayaran tidak diubah | Koreksi final akses gratis: tepat dua link teks (eBook Gratis, Kelas Gratis) ditempatkan di bawah logo header publik pada PC dan HP; hapus navigasi akses gratis tambahan di hero/Belajar; berlaku walaupun CMS HERO home aktif | SOURCE UPDATED di GitHub `main`; JS parse dan pemeriksaan DOM statis PC/HP PASS; verifikasi visual browser pengguna belum dilakukan |

| 2026-11-20 | GAS/Sheet/deployment finansial tidak diubah | Koreksi penempatan akses gratis: DUA link teks dipindahkan dari header navigasi ke BAWAH LOGO HERO utama; layout hero desktop disamakan dengan HP (vertikal); banner CMS Home tidak menggantikan hero ini; konten CMS tetap disimpan | SOURCE UPDATED di `main`; mock render guest, urutan DOM, 2 URL, sintaks JS, CSS dan cache version PASS; pengujian visual browser HP/PC belum terverifikasi |

| 2026-11-20 | GAS/database/ledger tidak diubah | P0 bisnis: tiga jasa inti (P-3IN1, P-INTEGRASI-GAS, P-VIDEO-AI) diarahkan ke konsultasi WA resmi, bukan auto-checkout, pada katalog publik & Member; sembunyikan P-B36AA0054926 / sumber QA_STAGING_TEST dari katalog pelanggan | SOURCE UPDATED `main`; mock render tamu+member PASS; nomor WA admin dikonfigurasi di STAGING/PROD; live HP belum diuji |
| 2026-11-20 | Pemeriksaan STAGING read-only | `orders` berisi NGD-261119-61ED29966DF7 (P-TOKEN-10) total Rp10.284, melewati tenggat 19 Nov 11:59 WIB, status masih PENDING; source `expireOrders` memerlukan izin mutasi & keuangan dan trigger | DATA TERAMATI; trigger dan log runtime belum diverifikasi; tidak ada mutasi/pembayaran yang dilakukan |

| 2026-11-22 | GAS tidak berubah | PR-1 fondasi CI dan tata kelola: SHA pin actions terverifikasi, CodeQL baca-saja, CODEOWNERS, templat PR, SECURITY, serta tes integritas workflow. PR menggunakan branch terpisah sebagai deviasi yang disengaja dari AGENTS.md untuk melindungi main / Pages; perlu persetujuan Owner sebelum merge. | SOURCE UPDATED (BRANCH PR) — belum merge; tidak ada GAS/runtime/data yang diubah; hasil CI PR menunggu verifikasi |\n\n| 2026-11-22 | GAS Code.gs SOURCE UPDATED di branch PR-2, runtime GAS belum disinkronkan | Penguatan autentikasi terarah: migrasi hash PIN V1→V2 hanya setelah login PIN valid, ketika sakelar NGD_PIN_HASH_V2_ENABLED sudah aktif, di dalam lock yang ada; V2 dan akun salah PIN tidak diubah. Pengujian tambahan untuk replay, switch OFF, dan pepper tidak tersedia. Tidak ada Script Properties / database / sesi live yang diubah. | SOURCE UPDATED (PR), NO-GO deploy tanpa pemeriksaan manual Owner; tes CI harus lulus |\n\n## Checkpoint penutupan hari — Kamis, 19 November 2026

**Keputusan status:** jeda kerja sampai sesi berikutnya pada Jumat, 20 November 2026. Tidak ada perubahan database/Apps Script/deployment produksi atau STAGING pada sesi terakhir; hanya Google Docs dan berkas kontrol ini yang diperbarui. Tidak membuat repository, database, ataupun deployment Ngulik Tools Studio.

### Hasil terverifikasi hari ini

- Member M-0009: login OTP WhatsApp dan checkout/invoice Rp10.284 lulus uji sebelumnya di STAGING, tetapi bukan bukti penerimaan dana riil. Admin tetap masuk memakai PIN terpisah.
- GAS STAGING: `ngdVerifyFullStagingReadiness()` 17 checks PASS dan ledger idempotency 13 checks PASS; pengujian sintetis tidak mengubah saldo nyata dan tidak memanggil provider.
- Frontend GitHub `main`: alur pemilihan login PIN/OTP, pengaman form persetujuan dana, preview detail pesanan yang menunggu verifikasi server, optimasi pemuatan Pesanan/Studio AI, dan konfirmasi waiting list telah diperbarui. Uji regresi aktual HP terhadap versi terbaru belum lengkap.
- Pembacaan STAGING: 29 tab; ada order Rp10.284 melewati tenggat namun masih PENDING, produk QA yang masih aktif, publikasi banner pilot yang terlalu dini, dan perbedaan harga eBook STAGING vs produksi. Belum ada perubahan harga, status order, atau konten publik.
- Empat dokumen Drive aktif sudah diselaraskan pada 19 Nov: Blueprint Bisnis & Ekosistem Workspace **V1.2**, Dokumen Induk, Brief Eksekusi Teknis, dan Command Center. Bagian yang sudah tergantikan diberi konteks legacy/historis; tabel dan struktur dokumen lama tetap dipertahankan.
- Keputusan arsitektur **Ngulik Tools Studio (belum dibangun)**: mesin AI terpisah dan integrasi plug-and-play; Ngulik Digital tetap memiliki Member, identitas, kredit, pembayaran dan bagi hasil. Stack MVP Pages + Workers + D1; tanpa Queues atau R2 wajib pada MVP Visual. Urutan MVP Visual/Flyer → Musik → Video. Harga/modal API baru HIPOTESIS, harus diverifikasi.

### Belum terbukti dan tidak boleh diklaim selesai

- Versi source `apps-script/Code.gs` belum direkonsiliasi lengkap dengan deployment GAS yang sedang aktif.
- Trigger kedaluwarsa `expireOrders` belum diperiksa pada menu Triggers; order overdue tidak boleh diubah menjadi PAID tanpa bukti dana.
- Hasil jadwal laporan otomatis Pilar 3 pukul 21.00 WIB pada 19 Nov **belum diterima/terverifikasi dalam sesi ini**; jangan menyimpulkan job sukses hanya dari jadwal.
- Registrasi baru OTP → akun aktif → kredit awal, pembayaran nyata → verifikasi dana → saldo token → komisi yang memenuhi syarat → WA, serta AI provider, LMS, jasa, dan hak akses masih perlu QA end-to-end.
- Penerapan kode unik **pengurang** (harga dasar dikurangi kode unik), paket kredit Pemula/Reguler/Hemat, dan tarif bakar output belum sesuai runtime terverifikasi; **jangan mengubah order historis** atau menjual harga baru tanpa audit modal dan persetujuan Owner.
- Pilot 50 Member, produksi, perpindahan stack, dan Ngulik Tools Studio tidak dinyatakan live.

### Urutan kerja berikutnya — Jumat, 20 November 2026

1. **P0 — Rekonsiliasi kondisi aktual (read-only):** buka Apps Script STAGING → Executions dan Triggers, periksa eksekusi Pilar 3 19 Nov pukul 21.00 WIB, keberadaan/jadwal `expireOrders`, versi deployment GAS, dan error terkait. Baca Sheet orders tanpa memodifikasi data.
2. **P0 — Tutup risiko pesanan:** analisis mengapa order yang lewat tenggat masih PENDING; rancang perbaikan idempoten untuk expiry dan uji pengaruhnya terhadap pembayaran terlambat. Hanya eksekusi mutasi setelah risiko dan instruksi spesifik jelas.
3. **P0 — Rekonsiliasi kebijakan pembayaran:** cocokkan rumus kode unik lama (+) dengan keputusan baru (−), nominal checkout dan referensi bank; rancang perubahan hanya untuk order baru, uji benturan nilai dan komisi; minta persetujuan Owner untuk aktivasi harga/keuangan.
4. **P0 — Uji HP satu Member baru:** pendaftaran OTP, kredit awal, sesi, dan riwayat; jangan gunakan data pribadi/test yang tidak disetujui.
5. **P0 — Uji satu transaksi nyata nominal kecil setelah tujuan pembayaran resmi tersedia:** cek mutasi dana secara independen; Admin menyetujui manual; cocokkan ledger, saldo, status FULFILLED, notifikasi, serta komisi hanya jika ada referensi pengajak yang sah.
6. **P1 — Bersihkan tampilan penawaran sebelum pilot:** produk QA aktif, banner 'pilot dibuka', eBook gratis vs harga produksi, etalase partner; keputusan harga dan publikasi oleh Owner.
7. **P1 — QA fungsi pendukung:** AI provider/debit/refund terukur, LMS, jasa, affiliate, dan latensi Android; tidak membuat fitur baru sebelum jalur utama PASS.
8. **SETELAH P0 STABIL:** audit harga/lisensi provider Visual lalu, dengan persetujuan Owner, mulai proyek baru `ngulik-tools-studio` terpisah sesuai Blueprint V1.2. Belum membuat stack/repo ini sebelumnya.

**Gerbang mutlak:** produksi dan tindakan finansial tidak diubah tanpa persetujuan Owner; tanggal/harga/komisi yang masih usulan tidak boleh diberlakukan otomatis. Fokus utama besok adalah penyelesaian transaksi dan QA STAGING, bukan membangun Tools Studio paralel.

## Aturan tetap untuk AI dan operator

- **Tidak membuat/menyarankan backup, database, project, atau deployment baru** untuk tes rutin, perubahan UI, atau troubleshooting biasa.
- Backup baru **hanya** sebelum perubahan struktur besar atau sebelum go-live produksi, setelah mengecek kelayakan backup yang sudah ada.
- Jangan menghapus atau memindah database/backup lama tanpa audit referensi dan persetujuan eksplisit.
- Source GitHub, runtime Apps Script, dan deployment tidak otomatis identik; tulis status secara jujur: **SOURCE UPDATED**, **RUNTIME DEPLOYED**, atau **TESTED**.
- Semua perubahan menyebutkan lingkungan; **produksi tidak disentuh** tanpa persetujuan.
- Setelah kontrol ini dibuat, fokus pekerjaan kembali ke aplikasi dan hasil QA; cukup perbarui tabel log di sini saat memang ada perubahan.


## Rekonsiliasi lintas stack — 21 November 2026 (baca-saja)

**Bukti terverifikasi langsung lewat konektor (21 Nov 2026):**
- GitHub `main` sebelum catatan ini: `b8016ae727c58036f73fa8d6d34996b737409afc`. GitHub Pages run [44869653532](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/44869653532) telah `completed/success` untuk commit tersebut; laporan lama `waiting` telah superseded. CI/source check commit sebelumnya selesai sukses; keberhasilan deploy HTML tidak menyatakan GAS runtime baru.
- Google Sheets PRODUCTION `Ngulik Digital DB` diverifikasi **16 tab**; STAGING `STAGING Ngulik Digital - Migrasi 27 Tab - 15 November 2026` diverifikasi **29 tab** (judul STAGING historis menyebut 27). Backup STAGING 19 Nov berisi 29 tab. Tidak ada migrasi atau penulisan database dalam audit ini.
- Katalog PRODUCTION: `P-EBOOK` **Rp49.000**; STAGING: `P-EBOOK` **Rp0**. Pemisahan ini belum diadjudikasi untuk rilis. Tidak mengubah harga.
- STAGING `P-STARTER-15` **Rp15.000 dengan komisi_persen=50**, sedangkan keputusan bisnis Drive 20 Nov menyebut komisi tetap **Rp5.000** (~33,33%). STAGING `P-3IN1` **30%** versus keputusan **25%**, `P-POS` **30%** versus **25%**, `P-VIDEO-AI` **25%** versus **20%**. Semua selisih wajib keputusan tertulis Owner sebelum order baru/komisi nyata.
- **Kontrak pembayaran produksi BELUM SELARAS di database:** `pengaturan_sistem.payment_gateway_mode=MAYAR_QRIS_OTOMATIS` dan `qris_atas_nama=Bakso Len 1 / Ngulik Digital`, bertentangan dengan keputusan akhir Drive untuk QRIS Statis DANA Bisnis Linggau AI Studio. STAGING sudah mencatat `QRIS_STATIS` dan `Linggau AI Studio`. Frontend produksi tetap `paymentsEnabled=false` dan `memberWritesEnabled=false`; STAGING tetap `paymentsEnabled=false`, `registrationOtpEnabled=false`. **Jangan mengubah nilai DB produksi sebelum rencana rollback, bukti penerima QRIS, uji transaksi terkontrol, dan persetujuan Owner.**
- STAGING `orders`: `ORD-STG-0001` masih `PAID` dan `NGD-261119-61ED29966DF7` masih `PENDING`. `affiliate_commissions` mempunyai `KOM-STG-0001` sebesar Rp1.000 `PENDING` ke `M-0001` (ADMIN menurut checkpoint rekonsiliasi sebelumnya). Perlu review status, eligibility dan idempotensi, **tanpa mengubah transaksi historis**.
- Kontrak `contracts/provider-readiness.json` menyatakan izin **implementasi source**, bukan izin mengaktifkan flag pembayaran. Rilis komersial transaksi **NO-GO** sampai pemeriksaan Apps Script editor/deployment, verifikasi penerima QRIS via aplikasi pembayaran independen, histori order, siklus pembayaran aktual, refund/komisi/payout lulus.
- Konektor Supabase & Vercel yang tersedia **hanya** mencakup `pos-sederhana-bakso-len`; tidak terkait backend NGD (Google Sheets + GAS). Supabase POS ini memiliki 16 RPC `SECURITY DEFINER` `authenticated` callable dan 27 foreign key tak terindeks menurut advisors 21 Nov. Tidak ada SQL atau privilege yang diubah. Repositori lainnya tidak boleh disatukan arsitektur/data hanya karena memakai akun GitHub yang sama.

**Sumber keputusan final:** [Master Index Drive](https://docs.google.com/document/d/1Vy2OPrhhk1nOMNQ_nrz5pcNmklpMQvd0hZ9k83RGh1Q/edit), [Keputusan QRIS 20 Nov](https://docs.google.com/document/d/1ovN2xl7UB1R0NN1_O3rJArJRolvZC1ar3yPxrFTpX8U/edit), dan [GO_LIVE_GATE_2026-11-21](docs/GO_LIVE_GATE_2026-11-21.md).

**Langkah lanjutan prioritas:** (1) inspeksi runtime GAS STAGING dan bukti parity source; (2) penyelesaian konflik merchant/mode QRIS dan harga/komisi; (3) rekonsiliasi order historis; (4) uji pembayaran kecil dengan verifikasi mutasi independen dan kontrol idempoten; (5) review go-live. Tidak membuat project, backup, atau database baru untuk audit rutin.

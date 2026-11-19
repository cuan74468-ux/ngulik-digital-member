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

## Checkpoint penutupan hari — Kamis, 19 November 2026

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

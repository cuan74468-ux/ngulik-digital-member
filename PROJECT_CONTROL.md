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

## Aturan tetap untuk AI dan operator

- **Tidak membuat/menyarankan backup, database, project, atau deployment baru** untuk tes rutin, perubahan UI, atau troubleshooting biasa.
- Backup baru **hanya** sebelum perubahan struktur besar atau sebelum go-live produksi, setelah mengecek kelayakan backup yang sudah ada.
- Jangan menghapus atau memindah database/backup lama tanpa audit referensi dan persetujuan eksplisit.
- Source GitHub, runtime Apps Script, dan deployment tidak otomatis identik; tulis status secara jujur: **SOURCE UPDATED**, **RUNTIME DEPLOYED**, atau **TESTED**.
- Semua perubahan menyebutkan lingkungan; **produksi tidak disentuh** tanpa persetujuan.
- Setelah kontrol ini dibuat, fokus pekerjaan kembali ke aplikasi dan hasil QA; cukup perbarui tabel log di sini saat memang ada perubahan.

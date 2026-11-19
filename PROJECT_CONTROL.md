# PROJECT CONTROL — NGULIK DIGITAL MEMBER

Satu-satunya berkas kendali operasional proyek. Gunakan tautan berikut; jangan membuat daftar registry, dokumen kontrol, atau backup baru untuk pengujian rutin.

## Empat tautan utama

| Komponen | Tautan |
| --- | --- |
| GitHub — source code (`main`) | https://github.com/cuan74468-ux/ngulik-digital-member |
| Editor Apps Script STAGING (dikonfirmasi operator) | https://script.google.com/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit |
| Google Sheets STAGING — 29 tab | https://docs.google.com/spreadsheets/d/1ByEd2hSyvSGTy_FjuRfCLoKrrZ3T1RpmUNSC1EMQuTE/edit |
| Google Sheets PRODUKSI — 16 tab | https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit |

## Log perubahan

| Tanggal (WIB) | Versi GAS | Perubahan | Status |
| --- | --- | --- | --- |
| 2026-11-19 | Belum dicocokkan ke versi deployment GAS | P1 login OTP Member M-0009 dan P2-A checkout Rp10.284 | LULUS pada pengujian HP/Sheets STAGING yang dikonfirmasi operator |
| 2026-11-19 | Tidak berubah (frontend GitHub) | Tampilan nominal checkout menggunakan `total_bayar` utuh + CSS mobile + cache busting | Source `main` diperbarui; tampilan HP menunggu verifikasi |
| 2026-11-19 | Belum disinkronkan/diuji pada GAS | Simulasi read-only `ngdVerifyFullStagingReadiness()` diperkuat di `apps-script/Code.gs` | SOURCE UPDATED — belum dinyatakan runtime PASS |
| 2026-11-19 | Tidak berubah | Menetapkan satu file kendali dan kebijakan anti-duplikasi | Tersimpan di GitHub `main` |

| 2026-11-19 | Tidak berubah (frontend GitHub) | Riwayat pesanan: buka detail read-only, penanganan kedaluwarsa, navigasi kembali, dan cache busting | SOURCE UPDATED — menunggu uji HP | 

| 2026-11-19 | Tidak berubah (frontend GitHub) | Pengaman detail pembayaran: tanggal kedaluwarsa tidak valid, status non-PENDING, dan QRIS pada order tertutup | SOURCE UPDATED; parse JS PASS; uji HP masih diperlukan |

## Aturan tetap untuk AI dan operator

- **Tidak membuat/menyarankan backup, database, project, atau deployment baru** untuk tes rutin, perubahan UI, atau troubleshooting biasa.
- Backup baru **hanya** sebelum perubahan struktur besar atau sebelum go-live produksi, setelah mengecek kelayakan backup yang sudah ada.
- Jangan menghapus atau memindah database/backup lama tanpa audit referensi dan persetujuan eksplisit.
- Source GitHub, runtime Apps Script, dan deployment tidak otomatis identik; tulis status secara jujur: **SOURCE UPDATED**, **RUNTIME DEPLOYED**, atau **TESTED**.
- Semua perubahan menyebutkan lingkungan; **produksi tidak disentuh** tanpa persetujuan.
- Setelah kontrol ini dibuat, fokus pekerjaan kembali ke aplikasi dan hasil QA; cukup perbarui tabel log di sini saat memang ada perubahan.

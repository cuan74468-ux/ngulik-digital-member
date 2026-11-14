# Patch Audit — 14 November 2026

Status: **sudah lolos tes Node lokal (239/239). Belum diuji di Apps Script nyata.**
Jangan menempelkan ke database sumber 14 tab. Pasang hanya di proyek staging `NGD-STAGING-QA`.

## Yang diperbaiki

| # | Masalah | Perbaikan | File |
|---|---|---|---|
| 1 | PIN lemah (123456, 111111, dst.) diterima; admin dikunci hanya 15 menit padahal nomornya tampil di `getPublicInfo` | PIN baru (daftar dan ganti PIN) ditolak bila berpola; kunci akun ADMIN 60 menit; PIN acak admin tidak pernah lemah; `resetAdminPin` membuka kunci login admin | `Code.gs` |
| 3 | Salah ketik WA/PIN dan akun terkunci tampil "Terjadi gangguan sistem" | Error validasi berkode `VALIDATION` / `RATE_LIMITED`; durasi kunci dihitung sebenarnya | `Code.gs` |
| 4 | Refund mengubah order ke REFUNDED sebelum kredit ditarik | Urutan baru: balik komisi, tarik kredit, status order terakhir; kegagalan terakhir memberi pesan rekonsiliasi yang jelas | `Code.gs` |
| 5 | Sesi kedaluwarsa tidak dibersihkan bila saklar keuangan OFF | `cleanupExpiredSessions` dan `installSessionCleanupTrigger` hanya butuh saklar mutasi | `Code.gs` |
| 9 | Kode referral 8 hex bisa diubah Sheets menjadi angka | Kode baru berformat `R` + 7 hex; `auditReferralCodes` (baca-saja) menandai kode lama yang berisiko | `Code.gs` |
| - | Komentar header menyebut 17 tab | Diperbarui menjadi 25 tab | `Code.gs` |

Tes baru: `tests/backend-hardening.test.cjs` (15 tes). 224 tes lama tidak diubah dan tetap lulus.

## Langkah operator di staging (urut)

1. Salin `Code.gs` baru ke proyek `NGD-STAGING-QA`.
2. Jalankan `auditReferralCodes` dan lihat log `REFERRAL_AUDIT`. Member yang tercantum perlu kode referral diganti manual (awali huruf `R`).
3. Bila ingin pembersihan sesi otomatis: nyalakan `NGD_MUTATIONS_ENABLED` hanya untuk uji, jalankan `installSessionCleanupTrigger` sekali. Trigger hanya berjalan selama saklar mutasi menyala.
4. Uji nyata: daftar dengan PIN `123456` harus ditolak; login dengan WA salah harus menampilkan "Nomor WhatsApp tidak valid".

## Belum dikerjakan (perlu keputusan atau uji nyata)

- Admin masih login dengan WA yang tampil publik + PIN. Perbaikan tuntas butuh keputusan: nomor WA admin terpisah dari nomor kontak publik, atau faktor kedua. Kunci 60 menit juga berarti penyerang bisa mengunci admin lebih lama; `resetAdminPin` dari editor membuka kunci itu.
- Jalur lupa PIN member belum ada (keputusan: OTP WA atau reset oleh admin).
- Verifikasi pendaftaran (bot bisa menghabiskan kuota 50).
- Akses modul Classroom lama dan akses trial ke kursus berbasis produk.
- Performa pada data besar (baca ledger berulang) dan satu kunci global untuk endpoint publik.
- Angka tes pada README dan dokumen checkpoint lama (206/178/133) adalah catatan historis; jumlah sekarang 239.

# Audit rekonsiliasi registrasi — STAGING (baca-saja)

**Tanggal:** 16 November 2026  
**Status:** siap sebagai SOURCE GitHub; belum dipasang pada editor GAS STAGING, belum dijalankan pada database aktif.  
**Tujuan:** menemukan kasus partial commit tanpa memperbaiki otomatis akun, kredit, atau status OTP.

## Konteks yang dibuktikan
Source sebelum patch P0 dapat mengonsumsi OTP sebelum append akun. Patch source terbaru membalik urutannya menjadi validasi OTP → append anggota → konsumsi OTP. Risiko lain masih ada: append sukses tetapi pembaruan OTP gagal, atau log audit/grant/session gagal setelah anggota dibuat. Karena SpreadsheetApp tidak memiliki transaksi lintas tabel, kondisi itu harus direkonsiliasi secara eksplisit.

## Script yang disiapkan
`apps-script/RegistrationRecoveryPreflight.gs` menyediakan satu fungsi editor-only: `ngdRegistrationRecoveryPreflightReadOnly()`.

Syarat: `InfrastructurePreflight.gs` dan `DataIntegrityPreflight.gs` sudah terpasang di editor STAGING, semua release flag OFF; harus ada `ngdInfrastructurePreflightReadOnly` dan `ngdIntegrityReadRows_`.

Prosedur: verifikasi STAGING serta 29 kontrak header, cek identitas spreadsheet eksplisit, lalu pindai hanya kolom bernama di `members`, `otp_verifications`, `credits_ledger`, `pengaturan_sistem` melalui pembaca yang membatasi maksimum 2.000 baris fisik per tab. Data baris digunakan dalam memori saja, bukan disalin ke log. Output hanya hitungan:
- `used_otp_without_member`: OTP USED tanpa akun (dapat mengindikasikan consume-first crash).
- `member_with_verified_unconsumed_otp`: akun sudah ada tetapi OTP masih VERIFIED.
- `verified_active_member_missing_starter_grant`: akun MEMBER aktif dan terverifikasi belum memiliki GRANT POSTED saat `kredit_awal` eksplisit lebih dari nol.
- `waiting_member_with_starter_grant`: anggota WAITING_LIST sudah mendapat GRANT.
- `verified_member_without_used_otp`: akun terverifikasi tanpa bukti OTP USED/VERIFIED pada tab saat ini (dapat menjadi data historis; butuh review).

Hasil `REVIEW_REQUIRED` **bukan alasan untuk langsung mengubah saldo**, menghapus anggota atau status OTP. Nilai `kredit_awal` yang hilang/tidak valid tidak diasumsikan 10 — report tetap REVIEW_REQUIRED agar kebijakan diperiksa. Angka nol issues pada STAGING kosong bukan bukti bahwa re-registration/restore/replay di lingkungan live sudah aman.

**Saat ini jangan minta pemilik menyalin file di editor**, sampai pemeriksaan source, regresi CI dan manifest versi sudah beres. Akun provider WA/finance tetap terakhir, jangan menyalakan feature flags.

## QA
Tes di `tests/backend-registration-recovery.test.cjs` menggunakan VM dan data sintetis: kasus sehat, OTP used tanpa member, otp verified pasca-append, missing grant, waiting list, policy nol/tidak ada, akun admin, produksi ditolak, identitas database salah, serta larangan mutasi dan network.

Batas: tidak memvalidasi log audit REGISTER atau kebenaran isi transaksi, tidak menguji keberhasilan restore, tidak memindahkan kode otomatis ke runtime GAS. Semua kasus flagged memerlukan prosedur admin yang dapat diaudit dan persetujuan kebijakan per kasus.

## Penguatan validasi ledger GRANT (16 November 2026)

Pemeriksaan awal hanya melihat keberadaan GRANT POSTED dan berisiko menerima GRANT bernilai salah sebagai bukti kredit sambutan. Versi diperkuat sekarang juga membaca kolom `jumlah` yang **telah diverifikasi ada** di STAGING. Ia melaporkan: `orphan_starter_grant`, `unposted_starter_grant`, `duplicate_starter_grant`, `unexpected_starter_grant_amount` dan `duplicate_credit_policy_key`. Pemeriksaan nilai mencocokkan nominal terhadap `kredit_awal` eksplisit; jika kebijakan berubah setelah transaksi historis, mismatch adalah **indikator review, bukan bukti saldo salah**. Tidak boleh mengubah ledger atau menghitung ulang nilai transaksi tanpa bukti historis dan persetujuan owner.

Skema nyata STAGING yang telah dikonfirmasi dengan range baca-saja: `members` mempunyai kolom `wa_verified`; `otp_verifications` mempunyai `tujuan,status`; `credits_ledger` mempunyai `entry_id,member_id,tipe,status,jumlah`; `pengaturan_sistem` mempunyai `key,value`. Seluruhnya masih **29 tab**. Pada pembacaan terbatas hari ini ditemukan 1 akun ADMIN dan nol baris transaksi/OTP, sedangkan `kredit_awal=10`. Pembacaan terbatas **bukan** lulus runtime preflight dan tidak membuktikan konsistensi semua data di masa depan.

Fungsi tetap hanya untuk Apps Script editor STAGING. Tidak ada remediasi otomatis atau jalur API publik. Tunda pemasangan source ke GAS sampai manifest runtime dan checkpoint diverifikasi.

## Deteksi identitas ambigu — 16 November 2026

Pemeriksaan tambahan mendeteksi ID anggota duplikat, WhatsApp duplikat, data anggota dengan ID/WhatsApp kosong, dan ID OTP registrasi duplikat. Sebelumnya peta korelasi dapat menimpa baris sebelumnya. Kini seluruh hasil ambigu menghasilkan `REVIEW_REQUIRED`; kode tetap baca-saja, tidak menghapus atau menggabungkan data.

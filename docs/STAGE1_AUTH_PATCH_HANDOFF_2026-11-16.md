# Handoff Patch P0 Autentikasi Tahap 1 — Source GitHub → GAS STAGING

**Tanggal:** 16 November 2026 · **Scope:** keamanan OTP, identitas login, dan masa hidup sesi.  
**Snapshot source yang diuji:** `1cd335e47cd5ff61ec1482e3e6976b83b8501177`  
**Unit & regression:** [443/443 PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43797282501) · **Chrome:** PASS · **Pages:** [PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43797282176)  
**Runtime GAS:** belum diterapkan/dibandingkan; tidak ada perubahan pada database, Script Properties, session aktif atau provider.

## Cakupan source yang berubah

| File | Fungsi | Tujuan | Keterbatasan |
|---|---|---|---|
| `OtpAuth.gs` | `ngdOtpAttemptCount_`, `ngdOtpRecordAttempt_`, `ngdOtpVerify_`, `ngdValidateVerifiedRegistrationOtp_` | Menolak expiry invalid/expired dan attempt counter noninteger/tidak ada; tidak reset ke 0 | Harus dibandingkan dengan file editor aktif; jangan buka fitur OTP |
| `Code.gs` | `authLogin_` | Memerlukan tepat satu record `members` untuk WA, error generik jika ambigu | Akun duplikat memerlukan rekonsiliasi yang disetujui |
| `Code.gs` | `purgeExpiredSessions_` | Memeriksa expiry invalid/expired dan menghapus baris dari bawah ketika tugas maintenance berjalan dalam lock | Jangan menjalankan maintenance pada database aktif tanpa backup/persetujuan |
| `Code.gs`, `OtpAuth.gs` | Implementasi P0 sebelumnya | PIN V2 opt-in OFF; OTP validasi sebelum insert, konsumsi setelah append; logout locked; sesi fail-closed | Belum terbukti sama dengan editor GAS |

## Gerbang pra-sinkronisasi

1. Pastikan Anda berada pada **proyek Google Apps Script STAGING**, bukan PRODUCTION: [editor STAGING](https://script.google.com/u/0/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit). Jangan mengubah `NGD_DB_ID`, URL Web App atau flag.
2. Simpan cadangan *semua* file editor GAS saat ini (bukan hanya `Code.gs`) dan catat versi/deployment yang dapat dikembalikan.
3. Bandingkan file editor satu per satu dengan [manifest 15 modul](../contracts/gas-runtime-source-manifest-2026-11-16.json). Hash manifest adalah **Git blob**, bukan checksum otomatis kode di editor. Modul yang tidak dapat dilihat/dibandingkan tandai **BELUM DIVERIFIKASI**.
4. Susun patch **minimum per fungsi** sesuai tabel, lalu uji lintas modul agar tidak menghapus fungsi editor yang mungkin sudah berubah. Jangan *overwrite* seluruh `Code.gs` secara buta.
5. Uji pada lingkungan yang benar-benar terisolasi: akun/OTP sintetis, auth member/admin unik dan duplikat, counter dan expiry OTP invalid, token masa lalu/masa depan, logout, penggantian PIN, kegagalan append member/OTP/GRANT/session.
6. Pastikan PIN V2, registrasi, mutasi, finance, pengiriman WhatsApp dan provider tetap OFF. Jika hasil tidak cocok, **rollback kode GAS** ke backup; jangan memutasi data sebagai kompensasi.
7. `ngdRegistrationRecoveryPreflightReadOnly` boleh dipertimbangkan pada editor STAGING **hanya setelah** prasyarat dua preflight, snapshot source, dan identitas spreadsheet sudah cocok; log hanya kategori/jumlah temuan tanpa WA/member ID/kredensial. Sampai ada bukti eksekusi, statusnya **BELUM DIJALANKAN**.

## QA dan risiko terbuka

- **Source ✅:** 443/443 tests, browser public/member/admin, mobile layout, staging shell, transport API read-only.
- **Editor GAS ❓:** belum ada diff actual source vs editor yang terverifikasi, belum ada penerapan patch, belum ada hasil audit recovery versi terbaru.
- **Database ✅ terbatas:** 29/29 tab dan 8/8 pemeriksaan integritas dari log owner 15 November, backup file-level restore terisolasi lulus; ini bukan transaksi registrasi end-to-end.
- **Aktivasi ❌:** belum ada persetujuan untuk provider eksternal, pendaftaran publik, kredit/ledger, komisi, LMS komersial, ataupun perubahan produksi.
- **P0 tersisa:** otoritas status ledger, rekonsiliasi partial commit, backup pepper PIN, retensi dan persetujuan data pribadi, restore aplikasi end-to-end; jangan membuat kebijakan baru tanpa keputusan owner.

**Keputusan:** Tahap 1 masih **PROSES / NO-GO**. Handoff ini adalah rencana operasional, **bukan instruksi melakukan deploy GAS otomatis**.

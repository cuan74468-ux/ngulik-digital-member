# CHECKPOINT — Ngulik Digital Member — 15 November 2026 (22.24 WIB)

**Status:** BERHENTI TERENCANA / LANJUT BESOK.  
**Tahap:** Fondasi internal STAGING (preflight skema & integritas), **bukan** izin rilis produksi.  
**Keputusan owner:** Infrastruktur internal disiapkan terlebih dahulu. Akun/layanan pihak ketiga (Fonnte, pembayaran, AI provider) dikerjakan **terakhir**. Jangan meminta API key sekarang.

## Bukti terakhir dari eksekusi owner di editor Apps Script STAGING

Log yang disampaikan owner pada 15 November 2026 pukul **22.24 WIB**:

```text
22.24.11  Eksekusi dimulai
22.24.18  NGD_INFRASTRUCTURE_PREFLIGHT_OK | tables=29 | environment=STAGING | writes=false | providers=DEFERRED
22.24.19  NGD_DATA_INTEGRITY_OK | tables=8 | issues= | writes=false
22.24.19  Eksekusi selesai
```

**Interpretasi yang dibenarkan:** Pemeriksaan struktur terhadap 29 tabel STAGING dan pemeriksaan relasi data pada 8 tabel lulus pada runtime Apps Script yang dipakai owner. Kedua fungsi merupakan pemeriksaan baca-saja. **Jangan** menyimpulkan semua fitur telah siap produksi atau bahwa token, pembayaran, vendor, restore, dan pengalaman pengguna sudah teruji menyeluruh.

## Ringkasan pekerjaan dan insiden preflight

1. Source `apps-script/InfrastructurePreflight.gs` dan `apps-script/DataIntegrityPreflight.gs` ditambahkan untuk audit editor-only; tidak ditambahkan sebagai route API publik.
2. `INFRA_DB_ATTESTATION_REQUIRED` teridentifikasi sebagai ketidakselarasan syarat properti OTP: `NGD_OTP_STAGING_DB_ID` boleh belum diisi selama vendor-last, tetapi bila diisi harus cocok dengan database STAGING. Validasi database admin serta semua release flags tetap ketat.
3. Audit sempat memberi `missing_member_identifier:1,missing_whatsapp:1`. Verifikasi langsung Google Sheets mendeteksi baris 2 di `members` memiliki **rumus turunan** `saldo_kredit`, `retensi_14`, `retensi_30` dengan guard `IF(A2="";"";...)`, yang menghasilkan nilai kosong. Akun admin sebenarnya berada pada baris 3.
4. Source audit disempurnakan untuk membedakan baris hasil formula turunan yang kosong dari data parsial yang benar-benar bermasalah, tanpa menghapus baris/rumus.
5. Commit perbaikan terakhir source: `a854f059a21ed8c9de6d5d0d04ef4d6e87f3e570`. CI [Validate backend and frontend (no deploy)](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43728525740) **SUCCESS**, **364/364 tes**, smoke browser desktop/mobile & API baca-saja berhasil. [GitHub Pages](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43728525199) **SUCCESS**.
6. Spreadsheet backup STAGING baru sudah disalin ke folder Google Drive privat `99_STAGING_BACKUP_DAN_HAPUS`, berisi 29 tab dan hanya izin owner; 9 tabel penting dicocokkan jumlah record-nya. **Backup copy terverifikasi ≠ restore teruji**. Jangan hapus folder tersebut: ia juga memuat spreadsheet STAGING aktif.
7. Tidak ada operasi write ke STAGING Sheets dalam tahap audit ini, tidak ada update produksi, tidak ada pengaktifan OTP/pendaftaran/pembayaran/provider, tidak ada Fonnte send, tidak ada deployment baru Apps Script.

## Lingkungan / rujukan

- Repository: [cuan74468-ux/ngulik-digital-member](https://github.com/cuan74468-ux/ngulik-digital-member), branch `main`.
- UI STAGING: https://cuan74468-ux.github.io/ngulik-digital-member/staging/
- Editor GAS STAGING: https://script.google.com/u/0/home/projects/1hyfzUBrTJOYATVAbBzX_-p1YGCOIN1W8Ty0A2-JB-7THzq2GF1XVKQNz/edit
- Runbook utama: [INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md](INFRASTRUKTUR_INTERNAL_FIRST_2026-11-15.md).
- [AGENTS.md](../AGENTS.md) dan dokumen Master Index/Mandat tetap prioritas kebijakan.
- Source GitHub bukan bukti semua source sama dengan editor GAS runtime; dua preflight di editor **terbukti melalui log owner**. Source lainnya tidak di-asumsikan sudah sinkron.

## Prioritas sesi selanjutnya (tetap OFF sampai dinyatakan layak)

1. **Audit sesi & autentikasi STAGING:** login/logout, kedaluwarsa sesi, token revocation, pembatasan percobaan PIN, pergantian PIN; lakukan pengujian awal offline/source dahulu. Jangan menggunakan atau meminta PIN/token nyata pada chat.
2. **Audit failure/retry & idempotensi registrasi serta starter grant:** urutan consume OTP → insert member → kredit awal saat terjadi kegagalan parsial; rumuskan rencana pemulihan aman sebelum menyalakan pendaftaran atau Fonnte.
3. **Uji restore terisolasi** terhadap snapshot privat dan periksa relasi utama tanpa menulis ke database aktif.
4. **Penguatan kesiapan LMS internal**: izin admin/anggota, CRUD, publish/unpublish, workspace, revisi, ledger/entitlement; tes offline dan staging tanpa membuka milestone bisnis berikut.
5. UI/UX QA nyata desktop, Android, accessibility, loading/error/empty states; jangan anggap smoke browser sama dengan QA perangkat fisik.
6. Baru setelah checklist fondasi disetujui owner, susun urutan aktivasi provider terakhir (tanpa membuka layanan berbayar atau fitur komersial prematur).

## Aturan melanjutkan

- Owner telah meminta **checkpoint dan istirahat**: tidak perlu tindakan lagi malam ini. Mulai sesi besok dari dokumen ini, tanpa mengulang preflight yang sudah lulus kecuali source/runtime berubah.
- Tetap STAGING, read-only bila memeriksa runtime. Semua sakelar mutation, registration, OTP, finance, LMS, provider, schema upgrades tetap OFF.
- Jangan mengubah produksi, menghapus data, atau membuat deploy yang berisiko tanpa persetujuan eksplisit yang spesifik.
- Bedakan hasil terverifikasi, potensi risiko, source-only changes, dan pekerjaan yang masih perlu pengujian.

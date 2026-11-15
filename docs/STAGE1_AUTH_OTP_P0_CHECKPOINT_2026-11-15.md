# Ngulik Digital — Tahap 1 / P0: Autentikasi WhatsApp dan registrasi aman

**Tanggal:** 15 November 2026  
**Repo:** `cuan74468-ux/ngulik-digital-member` (`main`)  
**Status rilis:** **NO-GO** untuk pendaftaran member publik, OTP WA nyata, pembayaran, AI berbayar, dan monetisasi.  
**Batas perubahan sesi:** kode sumber GitHub dan pengujian regresi; **bukan** perubahan Apps Script live, database, harga, atau Script Properties.

## Dasar keputusan

Rujukan utama yang dibaca di Google Drive:
1. *00 — Dokumen Induk & Peta Kendali Ekosistem* (Tahap 1 Auth WA masih PROSES; tidak melompat tahap).
2. *Mandat Produksi & Roadmap Skalabilitas* (produk komersial sungguhan, 50 member fase awal; semua P0 wajib lulus).
3. *Brief Eksekusi ChatGPT — Spesifikasi Teknis* (OTP Fonnte, PIN, tabel OTP, kredit).
4. *Arsitektur Mesin Uang & Tim AI Otonom* (backend server-side, human-in-the-loop).
5. *Latar Belakang & Analisis Risiko* (pengendalian biaya dan abuse).

**Prioritas P0:** WhatsApp aktif terverifikasi sebelum aktivasi akun, PIN hash/salt, sesi yang bisa dicabut, anti-bruteforce, pencegahan bonus token ganda, privasi dan log.

## Bukti aktual STAGING (dari pemeriksaan pemilik)

- STAGING spreadsheet: ID berakhiran `...UNSC1EMQuTE`; 29 tab total.
- 27 tab dipakai oleh backend `NGD.HEADERS` saat checkpoint.
- **Dua tab tambahan yang sudah ada**: `otp_verifications` dan `wa_notifications`. Header keduanya telah diperiksa; jangan membuat tabel baru atau menghapusnya.
- Kolom `members.wa_verified` dan `members.wa_verified_at` juga sudah ada.
- Administrasi: admin `M-0001`, login/logout berhasil di STAGING; 6 endpoint baca admin lulus. Data katalog 9 produk, member 0, order 0.
- Pemulihan PIN admin STAGING telah dipisahkan dari salinan produksi; sakelar pemulihan sudah OFF.
- Mutasi umum, pendaftaran dan keuangan **belum diaktifkan**. Jangan menyalakan secara serempak.

## Source GitHub yang diperbarui — bukan runtime terpasang

### `apps-script/Code.gs`
- `readAll_` mengabaikan baris sepenuhnya kosong, mempertahankan nomor baris fisik `_row`, dan tetap menerima nilai `0` maupun `false`.
- `authRegister_` memerlukan `NGD_OTP_REGISTRATION_ENABLED=true` serta fungsi server-side `ngdConsumeVerifiedRegistrationOtp_`. Jika salah satu tidak ada, registrasi ditolak **sebelum** masuk jalur tulis.
- Setelah implementasi OTP ada, `authRegister_` memanggil konsumsi bukti OTP **di bawah `LockService`**, sebelum menambahkan akun.
- Akun yang benar-benar lolos bukti OTP ditandai `wa_verified=true` dan `wa_verified_at`.
- API baru: `requestRegistrationOtp` dan `verifyRegistrationOtp`; keduanya mengikuti gerbang mutasi umum `doPost`, plus pengaman internal OTP.
- Perlu QA ulang terhadap source terbaru sebelum menyalin ke STAGING.

### `apps-script/OtpAuth.gs`
**Source saja — belum dipasang, belum diuji mengirim WA, dan belum dijalankan terhadap database.**
- Terbatas pada `NGD_ENVIRONMENT=STAGING` dan kecocokan `NGD_OTP_STAGING_DB_ID === NGD_DB_ID`.
- Menggunakan kolom eksisting `otp_verifications` dan `wa_notifications`, tanpa menambah/menghapus tab.
- Hash OTP menggabungkan secret server-side (pepper), nomor WA terstandardisasi, konteks registrasi dan OTP.
- Masa berlaku 5 menit; batas 3 salah; batas per WA 5 permintaan per hari dan jeda minimal 60 detik; batas global OTP harian.
- OTP tidak ditulis sebagai teks biasa ke Sheets, GitHub, ataupun log; respons provider tidak disalin mentah.
- WhatsApp dikirim via **POST** Fonnte dari backend setelah melewati gerbang konfigurasi; status API diterima bukan bukti pesan telah sampai.
- `verifyRegistrationOtp` menandai OTP terverifikasi. `authRegister_` kemudian **memerlukan kode OTP yang sama untuk konsumsi satu kali**.
- Permintaan terhadap nomor WA yang sudah ada memberi respons generik tanpa mengirim kode.
- Implementasi saat ini adalah kandidat STAGING; perlu audit penyalahgunaan, kondisi balapan, retensi data dan beban GAS sebelum rilis.

### Pengujian di repo
- `tests/backend-otp-release-gate.test.cjs`: 5 skenario.
- `tests/backend-otp-module.test.cjs`: 7 skenario.
- Kompilasi sintaks dasar dan 3 pemeriksaan perilaku untuk `Code.gs` dilakukan terhadap source sesudah pengamanan awal.
- **Belum ada klaim seluruh GitHub Actions lulus**: periksa workflow `validate.yml` pada SHA terbaru.
- Tidak ada pengujian provider Fonnte nyata atau end-to-end client/GAS pada perubahan OTP baru.

## Kunci kontrol keamanan

Jangan mengaktifkan `NGD_MUTATIONS_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_OTP_REGISTRATION_ENABLED`, atau menyimpan `FONNTE_API_TOKEN` pada produksi sebelum QA dan keputusan pemilik.

Persiapan uji **STAGING saja** (setelah code review dan backup):
- `NGD_ENVIRONMENT=STAGING`
- `NGD_DB_ID`: ID database STAGING yang diverifikasi (jangan commit nilai ini ke source).
- `NGD_OTP_STAGING_DB_ID`: sama dengan `NGD_DB_ID`.
- `NGD_OTP_HASH_PEPPER`: rahasia acak setidaknya 32 karakter, **berbeda dari produksi**, hanya pada Script Properties.
- `FONNTE_API_TOKEN`: token gateway khusus percobaan, tidak pernah dibagikan lewat chat/commit.
- `NGD_OTP_DAILY_SEND_CAP`: optional, batasi agar tidak ada tagihan/kuota tak terkendali.
- Sakelar pengaktifan hanya saat pengujian terpandu; kembali OFF setelah itu.

## Preflight tambahan — siap dipasang STAGING (tanpa pengiriman OTP)

- File `apps-script/StagingOtpDiagnostics.gs` menyediakan fungsi `ngdOtpStagingPreflight`.
- Ini **baca-saja** dan mensyaratkan `Diagnostics.gs` STAGING V9 sudah terpasang.
- Memeriksa identitas database melalui guard existing, header `members`, `otp_verifications`, `wa_notifications`, serta memastikan semua sakelar registrasi/mutasi/keuangan OFF.
- Jika `OtpAuth.gs` belum dipasang, hanya memberi peringatan `OTP_SOURCE_NOT_INSTALLED_IN_STAGING`, bukan menjalankan pengiriman.
- Jalankan sebelum mencoba sinkronisasi `OtpAuth.gs` atau perubahan registrasi; sertakan log sebagai bukti QA.

## Urutan QA berikutnya

1. Pastikan source yang tersimpan di GitHub dan kode runtime STAGING dapat dibandingkan tanpa menimpa file manual yang sudah lulus.
2. Jalankan pengujian regresi GitHub Actions pada commit final (Node tests dan smoke). Tangani kegagalan tanpa membuka flag.
3. Audit kode OTP terhadap schema, rate-limit, privilege, expiry, replay, delivery-failure, request concurrency, header data dan risiko provider.
4. Pasang source ke Apps Script **STAGING saja** setelah pemeriksaan integrasi dan backup; jangan menyentuh deployment produksi.
5. Uji request OTP dengan nomor WA uji yang disetujui dan pembatasan pengiriman ketat; hindari pengiriman ke pengguna tidak mengharapkannya.
6. Uji kode OTP salah, 3 kali salah, kadaluwarsa 5 menit, replay, nomor terdaftar, nomor baru, refresh, login/logout dan pembatalan sesi.
7. Uji saldo awal berdasarkan keputusan bisnis **yang disepakati**; pastikan `credits_ledger` tidak dobel dan tidak dapat diperoleh berulang.
8. Uji frontend Android/Windows + transport GET/POST dari origin GitHub Pages; jangan samakan uji Apps Script lokal dengan bukti CORS browser.
9. QA retensi OTP dan data kontak; persetujuan penggunaan WhatsApp, kebijakan privasi, biaya provider serta rollback.

## Keputusan bisnis yang masih perlu disejajarkan

Beberapa dokumen menyebut `Zero-Freebie` sedangkan brief sekaligus mengatur 10 token kredit awal; angka konversi token juga tidak selalu sama antar blueprint. **Jangan mengubah harga atau `kredit_awal` secara sepihak.** Pilih satu ketetapan pemilik sebelum aktivasi registrasi dan transaksi.

## Kesimpulan checkpoint

Bukti login ADMIN dan API baca STAGING sudah nyata, tetapi **registrasi OTP member belum dijalankan end-to-end**. Source rilis diberi gerbang gagal-tertutup untuk mencegah registrasi nonverifikasi jika sakelar biasa dinyalakan. Fase 1 tetap **IN PROGRESS / NO-GO**.

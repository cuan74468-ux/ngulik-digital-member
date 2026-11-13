# Ngulik Digital Member

Platform membership & LMS UMKM — Google Sheets + Google Apps Script + GitHub Pages.

## Status pembangunan (13 November 2026)

**BATCH 1 + implementasi awal BATCH 2 tersimpan di `main`.** API order, login, pendaftaran, kredit, affiliate, dan beberapa handler admin sudah ditambahkan tetapi **belum lulus pengujian eksekusi maupun keamanan**. Sejumlah action dalam master prompt masih belum lengkap; frontend belum dibuat. **DILARANG deploy publik atau menggunakan transaksi nyata** sebelum audit dan checklist lulus.


## Checkpoint diagnostik yang sudah terverifikasi

- `diagnosticPing` berhasil.
- `diagnosticDatabase` berhasil: 14 tab, waktu akses 335 ms.
- `diagnosticSchema` berhasil: 14 tab terbaca, durasi 5934 ms.
- Akun ADMIN telah tercatat pada `members` dan log `ADMIN_CREATED`, tetapi PIN awal belum diketahui pemilik.
- `setupDatabase` sebelumnya terhenti; **jangan jalankan ulang** saat ini.

## Langkah operator setelah pembaruan BATCH 2

1. Buka Apps Script yang terikat ke spreadsheet Ngulik Digital DB.
2. Ganti **seluruh isi** `Code.gs` dengan berkas terbaru dari repo; simpan.
3. Jangan jalankan `setupDatabase`, `installTriggers`, atau `resetAdminPin` dahulu.
4. Jalankan diagnostik baca-saja `diagnosticPing`, `diagnosticDatabase`, dan `diagnosticSchema` dari file `Diagnostics.gs` yang sudah dipasang.
5. Jangan deploy Web App sebelum pemeriksaan sintaks dan QA penuh selesai.

## Belum lengkap / belum diuji

- Idempotensi persisten lintas seluruh aksi tulis (baru sebagian diperbaiki di order).
- Action admin: manajemen member/waiting list/etalase, follow-up, dan beberapa alur payout.
- Kredit AI RESERVE–CONFIRM–REFUND, validasi endpoint SobatAgent, dan audit AI.
- Notifikasi email, fungsi orphan-credit cleanup, serta pengujian race condition dan rollback transaksi.
- Pengujian end-to-end setiap status order/komisi/refund dan integrasi frontend.
- Validasi autentikasi dan kebijakan privasi sebelum produksi.

## Database resmi proyek

[Ngulik Digital DB](https://docs.google.com/spreadsheets/d/19lJS-Re7TLfINjoo-wKoDkG_ikeEWNgGe9yf5Rywvm8/edit)

Spreadsheet tersebut memuat 14 tab, 27 pengaturan, 6 produk, 4 AI tools, 6 modul, dan dashboard awal. Jangan menyalin data member produksi ke database pengembangan.

## Memasang BATCH 1 di Google Apps Script

1. Buka **Ngulik Digital DB** dari tautan di atas dengan akun Google pemilik.
2. Pilih **Extensions → Apps Script** agar proyek terikat ke Spreadsheet tersebut.
3. Di editor Apps Script, salin **isi lengkap** [apps-script/Code.gs](apps-script/Code.gs) ke file `Code.gs` dan simpan.
4. Di **Project Settings**, aktifkan **Show appsscript.json manifest file in editor**; salin isi [apps-script/appsscript.json](apps-script/appsscript.json) ke manifest proyek dan simpan.
5. Kembali ke editor dan pilih fungsi `setupDatabase`; tekan **Run** serta beri izin yang dibutuhkan.
6. Simpan PIN admin yang tampil pada dialog **satu kali** di tempat privat. Jangan simpan dalam repository atau lembar publik.
7. Jalankan `healthCheck` untuk melihat status struktur dan komponen yang belum tersedia.

**Penting:** `installTriggers` sudah ditambahkan tetapi belum teruji; jangan jalankan dahulu. Jangan deploy Web App atau aktifkan GitHub Pages hingga seluruh batch selesai dan checklist keamanan lolos.

## Struktur target

```text
index.html
config.js
assets/qris.png              (akan disediakan pemilik, tidak disertakan di repo)
js/app.js
js/api.js
js/ui.js
js/screens/auth.js
js/screens/beranda.js
js/screens/tools.js
js/screens/checkout.js
js/screens/order.js
js/screens/rekomendasi.js
js/screens/akun.js
js/screens/admin.js
apps-script/Code.gs
apps-script/appsscript.json
README.md
```

## Keamanan

- Jangan menyimpan PIN admin, `AI_API_KEY`, QRIS pribadi dengan informasi sensitif, atau token sesi di GitHub.
- `AI_API_KEY` nantinya hanya di **Apps Script → Project Settings → Script Properties**.
- Seluruh perubahan data member, pembelian, dan komisi harus divalidasi oleh backend; tampilan web bukan kontrol keamanan.
- API proxy SobatAgent belum diverifikasi, sehingga endpoint/model belum diisi.

## Sumber spesifikasi

Dokumen pengguna `MASTER_PROMPT_Ngulik_Digital_Member.md` adalah acuan fitur dan checklist penerimaan. Implementasi berjalan melalui BATCH 1–6; keputusan keamanan bisa diperketat bila ditemukan risiko nyata.

## Perbaikan pencegahan setup macet — 13 November 2026

- Fungsi `inspectDatabaseSetup()` adalah **read-only**: mengecek seluruh header dan keberadaan akun ADMIN; tidak membuat atau mengubah data.
- `setupDatabase()` kini **tidak mengulang instalasi** apabila 14 tab/header cocok dan akun ADMIN sudah tersedia. Kondisi tersebut menghasilkan log `SETUP_ALREADY_COMPLETE` tanpa dialog.
- Jika skema tidak cocok atau ada lebih dari satu ADMIN, setup berhenti dengan `SETUP_BLOCKED` agar tidak memperbaiki/mengubah data secara otomatis.
- Menu Spreadsheet kini menampilkan `Periksa database (baca-saja)` menggantikan `Setup database` untuk menghindari klik tidak sengaja.
- **Perubahan ini baru di GitHub.** Apps Script terikat Spreadsheet tidak akan ikut berubah sampai `Code.gs` disalin ulang secara manual; jangan jalankan setup pada versi lama.
- Perubahan belum diuji langsung pada runtime Apps Script; status bukan production-ready.

## Audit keuangan baca-saja — 13 November 2026

- Commit backend `df1878c`: validasi awal fulfillment sebelum status pembayaran diubah, serta pengaman agar posting topup/refund dengan referensi order yang sama tidak berulang.
- Commit diagnostik `5221cbf`: fungsi `diagnosticFinanceReadOnly()` memeriksa order, ledger kredit, dan komisi tanpa menulis data atau mencetak PIN/nomor WA.
- Untuk menjalankannya, pemilik harus menyalin file `Code.gs` **dan** `Diagnostics.gs` terbaru ke project Apps Script terikat, lalu jalankan **hanya** `diagnosticFinanceReadOnly`.
- Hasil yang diharapkan `FINANCE_AUDIT_OK`; `WARN` dan `FAILED` harus ditinjau sebelum transaksi diaktifkan.
- Pengujian runtime atas perbaikan ini belum dilakukan. **Jangan melakukan transaksi atau deploy publik.**

## Checkpoint rekonsiliasi keuangan — 13 November 2026

Perbaikan di branch `main` (belum disalin atau diuji pada runtime Apps Script):

- Bila fulfillment gagal setelah pembayaran terverifikasi, API mengembalikan `needs_review:true`, mencatat log kesalahan dan mengusahakan audit `FULFILLMENT_NEEDS_REVIEW`; status pembayaran tidak otomatis dibatalkan.
- Membatasi pembuatan komisi menjadi satu record per order agar retry parsial tidak membuat komisi ganda.
- Refund QRIS manual hanya bisa dicatat setelah `dana_sudah_dikembalikan:true` dan `referensi_refund` diisi, disertai audit. Sistem **tidak** melakukan transfer dana.
- Refund dengan komisi sudah dibayar atau langganan lain yang sudah terpenuhi diblokir untuk rekonsiliasi manual.
- Endpoint admin baca-saja `adminGetReconciliation` dan diagnostik `diagnosticReconciliationReadOnly` memberi daftar order yang butuh peninjauan.
- `FINANCE_AUDIT_OK` sebelumnya menunjukkan 0 orders / 0 ledger / 0 commissions dan **bukan** validasi alur transaksi end-to-end.

**Keterbatasan penting:** Google Sheets tidak memberikan transaksi SQL/rollback otomatis. Mekanisme order/fulfillment/refund masih membutuhkan uji gangguan di staging, jaminan idempotensi lintas langkah, dan verifikasi operasi manual sebelum produksi. Jangan menjalankan fungsi mutasi di basis data aktif hanya untuk testing.

**Sinkronisasi:** GitHub dan proyek Apps Script tidak otomatis tersinkron. Jangan menimpa file Apps Script saat pengerjaan backend masih berlangsung. Tidak perlu menjalankan `setupDatabase` ulang.

## Checkpoint — pengujian simulasi dan keamanan PIN (13 Nov 2026)

- `financeFindings_(orders,ledger,commissions,products)` adalah fungsi murni untuk mendeteksi anomali rekonsiliasi tanpa Sheets. Endpoint `adminGetReconciliation` menggunakan engine ini.
- `diagnosticFinanceScenarios()` memuat **10 skenario sintetik** di memori: topup normal, ledger hilang/ganda, refund normal/reversal hilang/ganda, reversal tanpa refund, pembayaran belum terpenuhi, komisi ganda, dan komisi dibayar pada refund.
- `authChangePin_` kini membacakan ulang akun dalam lock, mensyaratkan PIN baru berbeda dan mencabut seluruh sesi lama setelah PIN berhasil diganti. Pengguna perlu login ulang.
- **Status kode:** ditulis dan di-commit, namun skenario **belum dijalankan pada Apps Script**; jangan menyebutnya QA lulus sebelum ada log `FINANCE_SCENARIOS_OK`.
- Selama pengerjaan, **jangan mengganti Code.gs pada editor Apps Script**. Sinkronisasi hanya dilakukan setelah checkpoint pengembangan disepakati.
- **Masih terbuka:** rollback multi-sheet tidak atomik, pemberian komisi setelah fulfillment dapat gagal parsial, pembayaran QRIS harus diverifikasi manual, keamanan pin 6 digit/rate-limit perlu audit, pengujian akses admin dan onboarding end-to-end serta UI frontend belum selesai.

# Checkpoint Teknik — Ngulik Digital Member

**Tanggal:** 14 November 2026  
**Branch:** `main` · **Deployment:** tidak dilakukan · **Google Sheets:** tidak dimutasi · **Status:** pengembangan, bukan produksi.

## Ringkasan pembangunan

Berdasarkan checkpoint Apps Script 13 November: 14 tab/header tervalidasi, satu akun ADMIN ditemukan; `diagnosticApiPublic`, `diagnosticAuthReadOnly`, `diagnosticFinanceReadOnly`, dan `diagnosticReconciliationReadOnly` lulus pada data keuangan kosong. Pengujian itu tidak membuktikan transaksi end-to-end.

Pengerjaan GitHub 14 November menghasilkan:
1. **Backend**: flag server `NGD_MUTATIONS_ENABLED` default OFF untuk semua aksi tulis API dan trigger pemeliharaan; penguncian login untuk mengurangi balapan throttle PIN; menu Apps Script hanya inspeksi database baca-saja.
2. **Kredit dan affiliate**: koreksi kredit admin wajib integer, tidak boleh membuat saldo negatif, harus beralasan; pencairan komisi wajib bukti transfer dan verifikasi penerima. Status terkini saat kegagalan fulfillment sebagian harus dilaporkan sesuai yang tersimpan.
3. **Frontend**: dashboard member fokus aktivitas, katalog produk seed mode pratinjau, status kredit dan progres, akses belajar/AI/affiliate, navigasi mobile. `?preview=member` hanya menampilkan data lokal tiruan; tidak bisa bertransaksi. Penyalinan tautan referral tiruan dinonaktifkan.
4. **Security browser**: Content Security Policy di `index.html`, pembatasan URL, escape data untuk HTML, token hanya di tab browser dan tak masuk URL.
5. **Test**: `tests/backend-security.test.cjs` (fail closed), `tests/frontend-smoke.test.cjs` (render, pratinjau, XSS), `tests/static-contract.test.cjs` (file referensi, konfigurasi dan probe). `tests/transport-probe.html` menguji GET/POST **baca-saja** saat URL staging tersedia.
6. **CI**: `.github/workflows/validate.yml` meliputi empat file test `node --test`, dengan pembatalan run yang redundan; tidak melakukan deploy.

## Bukti pengujian saat ini

| QA | Hasil | Batasan |
|---|---|---|
| Sintaks file JS yang diverifikasi | Lulus 9/9 pada V8 | Bukan browser riil |
| Aturan bisnis murni | Lulus 37/37 assertions pada V8 | Tidak akses Apps Script |
| Server mutation gate | 11/11 jenis aksi mutasi ditolak; 0 pemanggilan Google Sheets pada mock | Belum dijalankan di Apps Script staging |
| Frontend guest + preview member | Render berhasil di simulasi browser | Belum visual QA Android/Windows |
| GitHub Actions | Workflow tersimpan | **Run/hasil CI belum terverifikasi** |
| Google Sheets aktif | Tidak diubah | DB eksisting berada di akun Google pemilik |

## Release blockers

**P0:** CORS browser dari GitHub Pages ke GAS `ContentService` redirect Googleusercontent; autentikasi nyata; pemulihan transaksi multi-sheet yang tidak atomik; bukti penerimaan/refund dana; uji komisi dan payout; peninjauan keamanan PIN 6 digit; audit data pribadi; pengujian staging.

**P1:** UI admin untuk operasi terotorisasi, konten modul asli, AI API SobatAgent yang terdokumentasi, peringatan/pemberitahuan, penerbitan legal/ketentuan/kebijakan privasi, QA visual dan aksesibilitas Android/Windows.

**Belum siap rilis** sampai seluruh syarat di [RELEASE_GATES_2026-11-14.md](RELEASE_GATES_2026-11-14.md) terpenuhi.

## Perintah QA yang sudah disimpan

```bash
node --test tests/backend-pure.test.cjs tests/backend-security.test.cjs tests/frontend-smoke.test.cjs tests/static-contract.test.cjs
```

Node.js hanya untuk menjalankan tes di CI, bukan untuk membangun frontend. Jangan set `NGD_MUTATIONS_ENABLED=true` di Apps Script aktif sekarang.

## Langkah teknis berikut

1. Periksa GitHub Actions run terbaru, identifikasi test gagal bila ada, perbaiki di repo.
2. Tuntaskan ketidakpastian transport GitHub Pages–Apps Script pada staging dengan probe GET/POST tanpa kredensial.
3. Siapkan database dan deployment staging terisolasi, backup, lalu uji siklus anggota–order–kredit–komisi–refund dengan gangguan simulasi.
4. Perbaiki backend dari temuan staging, tanpa mengubah database aktif.
5. Selesaikan operasional admin, UX mobile, keamanan PIN, dan dokumentasi kebijakan.
6. Hanya setelah itu ajukan persetujuan rilis dan satu kali sinkronisasi final Apps Script.

**Keputusan permanen checkpoint:** tidak reset database aktif, tidak mengaktifkan pembayaran, tidak menyalin ulang `Code.gs` berkali-kali selama sumber masih dikembangkan.

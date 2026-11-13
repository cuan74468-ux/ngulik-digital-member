# Ngulik Digital Member

Platform membership & LMS UMKM — Google Sheets + Google Apps Script + GitHub Pages.

## Status pembangunan (13 November 2026)

**BATCH 1 sudah tersimpan di branch `main`.** Backend ini masih dalam pembangunan, **belum aman untuk deploy publik**. Belum tersedia endpoint transaksi, handler API, trigger, dan frontend; semuanya merupakan tahapan berikutnya.

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

**Penting:** `installTriggers` belum tersedia sampai BATCH 2. Jangan deploy Web App atau aktifkan GitHub Pages hingga seluruh batch selesai dan checklist keamanan lolos.

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

# QA Evidence & Staging Checkpoint — Ngulik Digital Member

**Tanggal:** 14 November 2026  
**Branch:** `main`  
**Status rilis:** **BELUM SIAP PRODUKSI**. Seluruh fitur yang mengubah data nyata tetap dinonaktifkan.

## 1. Bukti GitHub Actions yang berhasil dijalankan

| Run | Hasil | Cakupan |
|---|---|---|
| [#91](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43537937775) | **75/75 PASS** | Aturan bisnis, keamanan backend, frontend smoke dan kontrak statis |
| [#97](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43539241907) | **82/82 PASS** | Ditambah pengujian persentase komisi 0%/25%, invalid rate dan preflight |
| [#98](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43539426119) | **89/89 PASS** | Ditambah akses ADMIN/member, akun suspended, perlindungan profil/privasi order |
| [#101](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43539577480) | **89/89 PASS** | Rekonsiliasi percobaan aktivasi yang gagal di tengah jalan |
| [#102](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43539730560) | **89/89 PASS** | Chromium headless: guest, member preview mobile, catalog desktop |
| [#106](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43540518931) | **89/89 PASS** | Browser viewport QA: tidak overflow horizontal, navigasi mobile terlihat, checkout terkunci |

Catatan: smoke test Chrome sungguhan membuktikan halaman dirender dan konten penting tampil. Itu **bukan** audit visual interaktif Android/Windows ataupun tes pengiriman POST Apps Script lintas-origin.

Workflow terkini memakai `actions/checkout@v7`, `actions/setup-node@v7`, Node.js 24, pengujian `node --test tests/*.test.cjs` dan Chromium headless. Tidak ada deploy atau npm install eksternal pada proyek.

## 2. Database staging hasil isolasi

File Google Sheets privat bernama **Ngulik Digital DB - STAGING QA - 2026-11-14** telah dibuat **sebagai salinan**, bukan pengubahan data sumber. Tautan dan ID disimpan hanya di ruang kerja privat, tidak dimasukkan ke repository publik.

| Pemeriksaan | Hasil |
|---|---|
| File sumber yang sah | Ngulik Digital DB, 14 tab |
| ID file staging berbeda dari sumber | PASS |
| Hak akses staging | Privat; permission hanya owner |
| Kecocokan nama tab backend | 14/14 |
| Kecocokan header backend | 149/149 pada 14 tab |
| Identitas member di staging | Dikosongkan (kolom A:AD mulai baris 2) |
| Order, ledger, komisi, audit, sesi, klik, progress | Konten baris data dikosongkan |
| Kontak admin, email, Classroom dan QRIS staging | Dikosongkan |
| Mode pendaftaran staging | `TERTUTUP` |
| Rumus penting setelah pembersihan | Tetap ada; pemeriksaan terbatas tidak menemukan error |
| Database sumber | Tetap memiliki header, rumus dan baris asal; tidak dimodifikasi |

Staging ini adalah **database saja**. Belum terhubung secara terverifikasi ke backend Apps Script staging dan belum dijalankan skenario integrasi yang melakukan mutasi.

**Rumus setelah sanitasi:** tiga rumus di `members`, satu rumus klik etalase, dan tiga belas rumus pada `ringkasan` terdeteksi tetap ada. Pembacaan rentang tersebut tidak melaporkan error formula. Ini bukan audit seluruh 1.000 baris kosong.

**Penting:** Jika salinan Google Sheets menyertakan Apps Script terikat, kode, Script Properties, dan target spreadsheet pada salinan **belum diverifikasi**. Jangan menjalankan setup, diagnostik mutasi, atau trigger pada salinan sampai target `NGD_DB_ID` dipastikan menunjuk staging, bukan database sumber.

## 3. Temuan P0 yang ditutup pada source GitHub

- Komisi `komisi_persen=0` tidak boleh menjadi 25% karena fallback `|| 25`; sudah diperbaiki dan diuji dalam CI.
- Perhitungan komisi tidak valid dihentikan sebelum pemberian akses produk, agar tidak menyebabkan partial fulfillment.
- Isolasi akses member/admin, akun SUSPENDED dan privasi hash/salt PIN telah diuji.
- Percobaan manual fulfillment yang terputus terdeteksi segera lewat `MANUAL_FULFILLMENT_INCOMPLETE`.
- API tulis tetap dibatasi oleh saklar terpisah untuk mutasi dasar, registrasi, dan finance.
- GitHub Actions tidak lagi meminta runtime Node20 yang sudah usang.

## 4. Pemblokir rilis yang masih aktif

1. **Transport** — GET dan POST `ContentService` dari origin GitHub Pages harus diuji nyata pada staging tanpa PIN/token dulu. `GET` lulus tidak membuktikan `POST` lulus.
2. **Backend Apps Script staging** — perlu salinan deployment script terpisah dengan Script Property `NGD_DB_ID` yang diverifikasi, kemudian pemeriksaan read-only, QA autentikasi, dan simulasi transaksi.
3. **Keamanan PIN dan privasi** — kebijakan percobaan login, pemilihan PIN, penghapusan sesi, data pribadi serta informasi legal harus diuji pada runtime sesungguhnya.
4. **Ledger multi-tab** — Google Sheets tidak menyediakan transaksi/rollback atomik. Perlu failure-injection di staging dan SOP rekonsiliasi.
5. **Operasional & UX** — antarmuka admin transaksi, verifikasi QRIS, flow refund/komisi, pengujian Android nyata, dan integrasi AI yang terdokumentasi masih belum selesai.

## 5. Keputusan pengamanan

- **Jangan mengubah** Google Sheets sumber, Apps Script bound yang aktif, Script Properties, atau deployment publik saat pekerjaan pengembangan ini.
- Semua sumber kredit dan penjualan di staging harus menggunakan identitas dan nominal tes, bukan uang nyata.
- Jangan aktifkan `NGD_MUTATIONS_ENABLED`, `NGD_REGISTRATION_ENABLED`, `NGD_FINANCE_ENABLED`, atau `NGD_CLICK_TRACKING_ENABLED` pada backend aktif.
- Jangan memberi tautan staging sebagai aplikasi publik; file QA privat bukan produk siap digunakan.

**Checkpoint operasional:** kode terus dikembangkan dan diuji di GitHub; spreadsheet staging privat telah siap untuk integrasi lebih lanjut, tetapi backend GAS staging belum disinkronkan atau dieksekusi.

## 6. QA tampilan responsif yang baru

CI browser menambahkan `tests/layout-probe.js` **hanya pada salinan index.html di runner**, sehingga source frontend untuk pengguna tidak menambahkan script QA. Hasil dari [run #106](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43540518931):

- Pratinjau member `390 × 844`: tidak ditemukan overflow horizontal, navigasi mobile tampil.
- Katalog `1280 × 800`: tidak ditemukan overflow horizontal dan semua tombol pembelian dalam mode demo berstatus `disabled`.
- Beranda tamu, dashboard, dan katalog masih dapat dirender; **89/89 tes Node.js PASS**.

Batas cakupan: ukuran emulasi browser headless bukan bukti touchscreen fisik Android/Windows dan tidak menguji endpoint Apps Script. Kontrol release, privasi, dan integritas data tetap berlaku.

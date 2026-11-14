# Ngulik Digital Hub — UI/UX & Katalog Checkpoint

**Tanggal:** 14 November 2026  
**Scope:** Aplikasi GitHub Pages `cuan74468-ux/ngulik-digital-member`, database Google Sheets **STAGING QA**.  
**Branch:** `main` (pengguna memilih implementasi langsung tanpa tumpukan branch).  
**Status:** UI dan source backend diperbarui, katalog staging sinkron; **belum production-ready**.

## 1. Arah dari dokumen Google Drive

Dua dokumen menjadi dasar kerja:
- *Blueprint Ekosistem & Layanan Ngulik Digital Member* (14 Nov) — portal monetisasi terpadu Linggau AI Studio, empat tingkatan layanan, pilot maksimal 50 anggota.
- *Panduan Lengkap Integrasi AI Agent: LMS, QRIS, Affiliate dengan Mayar.id* (13 Nov) — opsi Mayar untuk edukasi/checkout/affiliate; **belum diputuskan sebagai arsitektur tunggal atau diintegrasikan**.
- *Panduan Ringkas & Log Keputusan Ngulik Digital* (10 Nov) — operasi Chapter 1 menggunakan Google Classroom/Forms/Sheets, WhatsApp Group, dan materi gratis.

Arah desain: gunakan referensi visual yang diberikan pengguna (kanvas biru-abu, kartu putih lembut, navigasi charcoal, aksen biru, whitespace lega), **tanpa mengambil fitur subscription, nominal USD, atau identitas SubPilot**.

## 2. Perubahan kode dan UI (sudah commit ke main)

### Beranda publik
- Hero dengan kebutuhan nyata UMKM, bukan angka KPI fiktif.
- Jalur tiga langkah: belajar, memilih alat, dan pemasaran.
- Empat pilar: edukasi/praktik, aplikasi usaha, Studio AI/kredit, jasa kreatif.
- Tiga penawaran pilihan berasal dari katalog, bukan harga yang ditulis ganda di bagian hero.
- Pilot **direncanakan** maksimal 50 peserta; tidak diklaim bahwa masih tersedia kuota nyata.
- Tombol publik diarahkan ke informasi/katalog, bukan pendaftaran semu.

### Katalog
- Kategori dinamis: Semua, Aplikasi usaha, Kredit AI, Jasa kreatif, Materi & aset, Fasilitas.
- Filter benar-benar merender pilihan yang cocok dan memiliki `aria-pressed`.
- Harga menerima angka maupun string lokal seperti `Rp99.000`; nilai invalid tidak dipalsukan menjadi `Rp0`.
- Nama/deskripsi diproses dengan fungsi escape HTML.
- Pembayaran tetap OFF. Tipe `JASA_SEKALI` / `PRODUK_DIGITAL` diberi status **belum dapat dipesan**, bahkan jika saklar pembayaran suatu saat dibuka tanpa dukungan fulfillment.
- Tidak ada integrasi Mayar, pembayaran nyata, email/WA otomatis, dan klaim layanan sudah hidup.

### Pembelajaran & admin
- Pengunjung melihat pengenalan kurikulum Chapter 1 (Google Profil Bisnis, konten dengan AI/Canva, WA Business, kalender promosi), dengan penjelasan batas akses.
- Member yang login tetap memakai dashboard progres dan LMS sebelumnya; perhitungan serta data member tidak diubah.
- Admin diberi konteks operasional pilot yang lebih jelas tanpa perubahan CRUD/izin.
- CSS responsif tambahan diterapkan pada `assets/unified-theme.css`, bukan mengganti backend.
- `index.html` menggunakan identitas **Ngulik Digital — Belajar & Solusi Digital untuk UMKM** dan URL aset berversi untuk menghindari cache lama.

## 3. Sinkronisasi Google Drive (STAGING SAJA)

Sumber utama **14 tab** dan staging **25 tab**. Tab `katalog_produk` staging kini memiliki **8 data produk**, diselaraskan dengan sumber:
1. Paket 3-in-1, Rp99.000.
2. Linggau POS Lite, Rp149.000.
3. Seat Canva 30 Hari, Rp35.000.
4. Top-Up 50 Kredit AI, Rp25.000.
5. Top-Up 150 Kredit AI, Rp60.000.
6. Top-Up 400 Kredit AI, Rp140.000.
7. Jasa Video Iklan AI Paket Hemat, Rp50.000.
8. Bundel Ebook Vibe Coder & Template, Rp49.000.

**Dua baris baru:** `P-VIDEO-AI`, `P-EBOOK`; dua nama yang diselaraskan: `P-POS`, `P-CANVA`. Seluruh 8 baris staging cocok dengan produk sumber ketika diverifikasi ulang. **Tidak ada perubahan di database utama, member, orders, kredit, komisi, PIN, dan transaksi.**

Pengaman finansial `apps-script/Code.gs`: sebelum pembuatan order baru, backend hanya mengizinkan empat tipe yang sudah memiliki alur pemenuhan: `LANGGANAN_30H`, `LISENSI_SEKALI`, `SEAT_30H`, dan `TOPUP_KREDIT`. Jenis jasa serta eBook memerlukan mekanisme fulfillment dan kebijakan refund yang baru dan diuji terpisah.

**Catatan:** Meski 8 produk memiliki `aktif=true` sebagai informasi katalog staging, **flag transaksi tetap OFF**. `aktif` bukan bukti checkout siap produksi.

## 4. Pemeriksaan teknis

- GitHub Actions: `node --test tests/*.test.cjs` **206/206 sukses**, 0 gagal.
- Browser Chrome headless: halaman publik, dashboard member, katalog, support, LMS, admin, mobile & desktop diuji; tiada horizontal overflow pada viewport yang diuji; tombol beli terkunci di demo.
- Tes baru: `tests/frontend-hub-experience.test.cjs` (fitur publik, data delapan produk, filtering, harga lokal, XSS, ketidaktersediaan pembayaran dan backend guard).
- CI run: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43572668843 .
- **Tidak** termasuk pengujian visual perangkat fisik Android/Windows atau integrasi Google Apps Script nyata.

## 5. Sisa pekerjaan sebelum operasional

**P0:** Peta otoritatif membership / LMS / pembayaran (memilih satu sumber hak akses dan satu ledger); security audit autentikasi; transport GET + POST staging GAS; transaksi idempotent lintas-tab; validasi penerimaan dana dan refund; QRIS resmi; kebijakan privasi; QA perangkat fisik.

**P1:** Konversi katalog jasa/eBook menjadi alur pemenuhan yang dapat dibuktikan; checkout provider bila diputuskan; operasional materi, upload aset dan entitlements; notifikasi berizin; integrasi provider AI beserta estimasi COGS dan kuota.

**Tetap OFF:** `config.js` dengan `demoMode:true`, `apiUrl:''`, `paymentsEnabled:false`, `supportEnabled:false`, `lmsEnabled:false`, dan `notificationsEnabled:false`.

## 6. Rollback / batas tindakan

- UI: revert perubahan `js/app.js`, `assets/unified-theme.css`, dan tautan cache bust pada `index.html` tanpa menyentuh database.
- Staging katalog: restore salinan dari snapshot sebelum perubahan bila diperlukan; sumber 14-tab tidak diubah.
- Jangan menjalankan setup, impor data asli, membuat token/API key, mengaktifkan kasir/Mayar, atau melakukan refund real dari pratinjau.
- **NO-GO untuk transaksi nyata** sampai seluruh P0 dan persetujuan rilis tertulis terpenuhi.

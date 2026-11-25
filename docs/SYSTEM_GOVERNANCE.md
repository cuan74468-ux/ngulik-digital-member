# SYSTEM GOVERNANCE — Ngulik Digital Member

Standar permanen Linggau AI Studio. PROJECT_CONTROL.md mencatat status operasional; Dokumen 00 dan Dokumen 06 yang disahkan Owner mengatur keputusan bisnis dan editorial. Dokumen ini tidak memberi izin aktivasi atau perubahan finansial.

## Lingkungan dan data
- STAGING (29 tab terverifikasi) dan PRODUCTION (16 tab terverifikasi) wajib terpisah. ID, akses editor, kredensial dan backup berada pada registry privat Owner.
- Produksi NO-GO hingga UAT Starter Pack, backup terverifikasi, migrasi non-destruktif 16 → 29, rekonsiliasi, dan persetujuan eksplisit Owner. Jumlah tab bukan bukti kesetaraan skema.
- Soft-archive: status ARCHIVED atau aktif FALSE melalui admin berizin; transaksi, saldo, komisi dan bukti historis tidak dihapus atau ditimpa. Koreksi finansial melalui rekonsiliasi tercatat.
- Mutasi katalog, konfigurasi dan finansial wajib memiliki audit_logs: aktor, waktu, target, aksi, request_id dan perubahan aman tanpa rahasia. Jangan mencatat PIN, OTP, token atau API key.
- Rekonsiliasi members, credits_ledger, orders, affiliate_commissions dan ringkasan sebelum setiap batch pilot. Periksa ID unik, relasi, status, saldo, idempotensi, expiry, dan nominal. Jangan memperbaiki riwayat otomatis.
- Total order baru berasal dari server: harga_dasar + kode_unik (Rp100–999). QRIS diverifikasi terhadap mutasi aktual; klik WhatsApp bukan bukti PAID. Starter Pack Rp15.000 merupakan tiket masuk awal, 15 kredit dan fasilitas yang disahkan; komisi Rp5.000 hanya untuk transaksi eligible yang lunas.

## Stack dan kapasitas
- Fase 1: pilot maksimal 50 anggota, GitHub Pages + GAS + Sheets, Fonnte dan QRIS statis. Target biaya tetap minimal; biaya API, WA, transaksi, penyimpanan dan kuota tetap diperhitungkan.
- Frontend statis tanpa build/dependensi baru. Seed editorial terproyeksi mempercepat first paint; GAS tetap otoritas data dinamis dan transaksi. Regenerasi seed setelah publikasi CMS, periksa tanggal WIB, allowlist, QA, privasi dan versi cache; jangan ekspor data anggota.
- Fase 2: evaluasi Next.js + PostgreSQL atau Cloudflare Workers ketika penggunaan, kuota dan ekonomi membenarkan migrasi. Tidak ada janji skala tak terbatas secara literal. Pertahankan ID stabil, kontrak API, ekspor standar, ledger dan rekonsiliasi; uji backup/restore, migrasi dan rollback.

## AI dan ekonomi
- API key hanya di server Script Properties atau vault; tidak di browser, seed, GitHub, log atau dokumen publik. Provider adapter modular, otorisasi server, media privat, limit biaya/rate, idempotensi request_id, dispatch claim dan audit.
- Siklus reserve → settle → release; timeout tak pasti masuk rekonsiliasi, bukan retry/refund buta. Jangan memotong saldo dua kali atau mengklaim output generatif dari simulasi. MODE SIMULASI harus jelas sampai provider nyata teruji dan disetujui.
- Harga target API/jasa: Modal × 3 (1/3 modal, 1/3 operasional & komisi, 1/3 target laba). Validasi HPP aktual, biaya pembayaran, refund, komisi dan margin tiap SKU. Rumus bukan izin otomatis mengubah harga; Starter Pack mengikuti kontrak khusus Owner.

### Gerbang foto produk AI
- Server mengunci kategori, tema, rasio, kamera, cahaya, permukaan, grading, styling, lensa dan kesamaan produk. Deskripsi pengguna hanya data yang tidak tepercaya; prompt lock membantu tetapi tidak menjamin kepatuhan model. Registry privat operator tidak ditimpa otomatis.
- Hasil wajib diperiksa terhadap foto sumber: identitas/label, komposisi, rasio, detail, warna, cacat visual. Rubrik visual yang ada bukan evaluator piksel. Sebelum aktivasi komersial, wajib memasang evaluator tepercaya atau QA operator serta menguji setiap tema dan engine yang akan dijual. Tidak menjanjikan Ultra HD atau label sempurna sebelum pengukuran.
- Wallet Visual terpisah dari token member. Pilot 12 kredit bukan top-up komersial. Jangan menjual atau mencampur saldo hingga jalur fulfillment QRIS resmi, ledger idempoten, HPP aktual, refund, rekonsiliasi, dan UAT disetujui. Kredit gagal dikembalikan sesuai hasil, biaya upstream tetap dihitung. Status settlement/refund antara harus dipulihkan tanpa dispatch ulang.

## Zero-patchwork dan kualitas
- Token desain utama: assets/ngulik-design-system.css; Studio memakai token yang sama. Canvas #FAF9F5, paper #FFFFFF, ink #111827, slate #374151, lime #C8F135/ink, indigo #4338CA/white. Border 2px, shadow 4px, radius 12px, hierarki dan padding responsif. Perbaiki aturan yang sudah ada sebelum menambah selector. Jangan menyembunyikan overflow sebagai pengganti perbaikan layout.
- Copywriting berasal dari CMS/Sheet, seed bukan sumber kedua. Tidak menambah promosi hardcoded. Harga seed display-only; validasi transaksi server.
- Satu perubahan logis per PR; test node penuh, browser mobile 360px dan desktop 1366px, screenshot dan pemeriksaan aksesibilitas; CI read-only, actions pin SHA, nol rahasia. Merge hanya setelah seluruh checks sukses, lalu verifikasi Pages dan URL live. Bedakan source, deploy, dan UAT.
- Audit dependensi termasuk referensi dinamis Sheet/CMS, GAS namespace global, kontrak, dokumentasi, dan tes sebelum penghapusan file. Tanpa bukti lengkap, pertahankan. Jangan hapus branch closed-unmerged yang memiliki kontrak unik; branch merged boleh dibersihkan setelah tip diverifikasi. Aktifkan penghapusan head branch otomatis via Settings.
- Tidak membuat checkpoint/dokumen duplikat, schema atau deployment rutin tambahan. Owner menyetujui perubahan destruktif, produksi, harga, payout, provider berbayar dan rilis. Pertahankan audit trail dan rollback commit sebelumnya.

## Checklist operasi
1. Baca PROJECT_CONTROL dan keputusan Owner aktif. Verifikasi main, CI, Pages, identity GAS.
2. Cocokkan source GAS dan runtime; jalankan diagnostik read-only. Jangan mengaktifkan sakelar untuk sekadar audit.
3. Uji satu siklus STAGING atas persetujuan Owner: order, bayar, bukti WA, cek mutasi, approval idempoten, ledger, hak akses dan komisi.
4. Setelah pilot siap, selaraskan produksi secara non-destruktif dan minta izin go-live. Pantau kualitas, biaya, kuota, dan rekonsiliasi.

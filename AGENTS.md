# AGENTS.md — Ngulik Digital Member

**Mode Eksekusi Produksi Aktif: Fokus 100% pada penyelesaian fitur fungsional di `apps-script/Code.gs`, `apps-script/OtpAuth.gs`, `apps-script/Catalog.gs`, dan `js/app.js` tanpa menambah file dokumentasi di `docs/`.**

- Owner telah mengizinkan implementasi fitur Tahap 1–6, checkout enam tipe, komisi per produk, AI, dan Fonnte; larangan tahapan NO-GO/DEFERRED sebelumnya tidak menghalangi pengerjaan source.
- Kerjakan dan commit kode inti serta regresi unit test langsung di `main`; jangan buat `docs/*.md`, `*Preflight.gs`, `*Diagnostics.gs`, atau feature flag baru.
- Pertahankan saldo, harga, komisi yang sudah tersimpan, akun, dan data pelanggan; jangan menghapus data atau memodifikasi DB production tanpa perintah tersendiri. Kredensial provider harus tetap di Apps Script Script Properties.
- Bedakan **source GitHub siap** dari **Apps Script tersalin, terdeploy, dan lolos uji transaksi nyata**. Persetujuan implementasi bukan bukti bahwa runtime sudah siap.
- Utamakan idempotensi pembayaran, pencatatan ledger, kompensasi kegagalan AI, dan notifikasi yang tidak menggagalkan transaksi utama. Gunakan tes otomatis yang relevan.

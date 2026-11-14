# Handoff teknis — Member 360° & Customer Support

**Tanggal checkpoint:** 14 November 2026  
**Repository:** \`cuan74468-ux/ngulik-digital-member\` · branch \`main\`  
**Target:** GitHub Pages murni (tanpa build) + Google Apps Script + Google Sheets  
**Status:** Source, skema staging, dan QA otomatis berhasil; **belum diaktifkan di runtime GAS atau produksi**.

## 1. Ruang lingkup yang sudah dibangun

- **Member 360° (khusus ADMIN)**: mencari member berdasarkan ID, WhatsApp, nama, nama usaha, filter status akun dan produk yang sudah dibayar. Hasil pencarian memasker WA (empat digit akhir). Profil detail terbatas kepada ADMIN dan menggabungkan status akun, hak akses produk, 25 pesanan terbaru, 25 tiket terbaru.
- **Hak akses produk**: dihitung dari \`members\`, \`orders\`, dan \`katalog_produk\`. Order hanya dihitung sebagai bukti pembelian bila \`PAID\` atau \`FULFILLED\`. Tidak dibuat saldo/ledger atau tabel entitlement pengganti.
- **Laporan member**: kategori \`BUG\`, \`FITUR\`, dan \`PERTANYAAN\`; produk dan order terverifikasi wajib untuk BUG/FITUR; bantuan umum diperbolehkan tanpa produk. Judul 8–120 karakter, deskripsi 20–2000 karakter, platform ANDROID/WINDOWS/WEB/LAINNYA, versi aplikasi opsional.
- **Riwayat tiket**: semua balasan, perubahan status, dan prioritas memiliki baris aktivitas dan identitas aktor. Member hanya dapat membaca/membalas tiket sendiri, tidak dapat mengubah status atau prioritas. Tiket CLOSED tidak bisa dibalas.
- **Workflow admin**: OPEN → TRIAGE → IN_PROGRESS ↔ WAITING_MEMBER → RESOLVED → CLOSED; admin dapat membuka kembali CLOSED ke OPEN. Balasan member pada RESOLVED otomatis membuka kembali OPEN.
- **Prioritas admin**: P0 kritis, P1 tinggi, P2 normal, P3 rendah. Default laporan baru P3, perubahan prioritas butuh alasan dan tercatat dalam aktivitas.
- **Rilis produk**: admin membuat DRAFT versi/changelog untuk produk tertentu; publikasi eksplisit mengubah status ke PUBLISHED. Member hanya dapat membaca rilis PUBLISHED dari produk yang pernah dibayar.

## 2. Kontrak penyimpanan dan sumber kebenaran

Database utama lama berisi 14 tab. Staging privat baru memiliki **17 tab** (14 lama + 3 berikut). Semua header telah dicocokkan dengan \`NGD.HEADERS\` di \`apps-script/Code.gs\`: **17/17 tab, 187/187 kolom**.

| Tab tambahan | Header persis dari backend |
|---|---|
| \`support_tickets\` | \`ticket_id,member_id,product_id,order_id,kategori,judul,deskripsi,platform,versi_aplikasi,status,prioritas,assigned_to,created_at,updated_at,resolved_at,closed_at,request_id\` |
| \`ticket_activities\` | \`activity_id,ticket_id,actor_id,actor_role,jenis,dari_status,ke_status,pesan,created_at,request_id\` |
| \`product_releases\` | \`release_id,product_id,versi,judul,ringkasan,tipe_rilis,status,created_at,published_at,created_by,request_id\` |

**Tidak dibuat \`member_product_access\`** karena status akses harus merujuk data \`orders\` dan \`members\` yang sudah menjadi sumber kebenaran, bukan salinan terpisah berpotensi berbeda.

Pembuatan tab dilakukan **hanya** pada Google Sheets staging privat yang sudah terisolasi, bukan \`Ngulik Digital DB\` sumber. Tidak ada member, tiket, atau transaksi sungguhan yang ditambahkan ke staging.

## 3. Kontrak API dan otorisasi

| Operasi | Action backend | ADMIN | MEMBER |
|---|---|---|---|
| Produk yang dibeli | \`getMyProducts\` | Profil diri | Profil diri |
| Daftar tiket saya | \`getMyTickets\` | Akun sendiri | Akun sendiri |
| Detail tiket pribadi | \`getTicket\` | Pemilik | Pemilik |
| Buat tiket | \`createTicket\` | Sesuai akun | Sendiri |
| Balas tiket | \`replyTicket\` | Sesuai akun | Tiket sendiri |
| Rilis produk saya | \`getMyProductReleases\` | Sesuai akun | Hanya pembelian terverifikasi |
| Cari Member 360° | \`adminSearchMembers\` | Ya | Ditolak |
| Detail Member 360° | \`adminGetMember360\` | Ya | Ditolak |
| Ringkasan tiket | \`adminGetSupportOverview\` | Ya | Ditolak |
| Daftar tiket admin | \`adminListTickets\` | Ya | Ditolak |
| Detail tiket admin | \`adminGetTicket\` | Ya | Ditolak |
| Ubah status tiket | \`adminChangeTicketStatus\` | Ya | Ditolak |
| Ubah prioritas tiket | \`adminSetTicketPriority\` | Ya | Ditolak |
| Balas tiket admin | \`adminReplyTicket\` | Ya | Ditolak |
| Daftar seluruh rilis | \`adminListProductReleases\` | Ya | Ditolak |
| Buat draft rilis | \`adminCreateProductRelease\` | Ya | Ditolak |
| Publikasikan rilis | \`adminPublishProductRelease\` | Ya | Ditolak |

Semua operasi baca privat tetap memerlukan sesi aktif. Semua penulisan support memerlukan **dua pengaman server**:

1. \`NGD_MUTATIONS_ENABLED=true\` — saklar mutasi dasar;
2. \`NGD_SUPPORT_ENABLED=true\` — saklar tambahan khusus tiket dan product release.

Di frontend, \`config.js\` memuat \`supportEnabled:false\` (default). UI tersebut hanya pengaman tampilan, bukan keamanan backend. Jangan aktifkan di production sebelum seluruh QA selesai.

Pengaturan pendaftaran \`NGD_REGISTRATION_ENABLED\` dan keuangan \`NGD_FINANCE_ENABLED\` **tidak berubah**. Mengaktifkan support tidak otomatis membuka checkout atau pembayaran.

## 4. Integritas data, kontrol penyalahgunaan, dan privasi

- Operasi mutasi menggunakan \`LockService\` melalui \`withLock_\` serta \`request_id\` untuk mendeteksi pengiriman ulang.
- Pengulangan pembuatan tiket dengan request sama hanya mengembalikan tiket lama; bila aktivitas pembukaan belum tersimpan, boleh dilengkapi pada retry yang identik.
- Event status dan prioritas ditulis sebelum status tiket diperbarui. Bila update baris gagal, retry identik dapat melanjutkan tanpa membuat event kedua.
- Balasan setelah RESOLVED dapat membuka kembali tiket. Jika update status terputus, retry identik dipakai untuk pemulihan.
- \`adminGetSupportOverview\` mendeteksi \`MISSING_ACTIVITY\`, \`STATUS_ACTIVITY_DIVERGENCE\`, dan tiket OPEN yang belum ditriase lebih dari 48 jam.
- Untuk mencegah spam: maksimal **5 tiket baru per member per 24 jam** dan **10 tiket belum CLOSED**. Retry request yang sama tidak menghabiskan kuota kedua.
- Pencarian member hanya tersedia bagi ADMIN; hasil pencarian memasker nomor WhatsApp. Profil detail admin berisi WA untuk keperluan dukungan. PIN, PIN hash, PIN salt, dan token tidak dimasukkan.
- Semua tulisan di Sheets melewati \`sheetLiteral_\`, dan semua teks yang tampil di UI melewati \`esc\`. Screenshot/file lampiran belum didukung (hindari link file publik dan upload tanpa kontrol).
- Riwayat aktivitas dan tiket memuat data pribadi. Sebelum publikasi, tetapkan kebijakan retensi, penanganan penghapusan, siapa yang boleh mengakses, dan SOP laporan sensitif.

**Batasan teknis**: Google Sheets tidak menyediakan rollback atomik lintas-tab. Pengujian mock dan pengaman idempotensi mengurangi risiko, tetapi belum menggantikan pengujian gangguan runtime Apps Script di staging.

## 5. Operasional layanan support

Contoh penanganan bug POS P0:

1. Member membuka **Bantuan** → **Bug** → memilih POS yang pernah dibeli → mengisi versi/OS dan langkah reproduksi. PIN/password tidak boleh diminta.
2. Tiket dibuat OPEN, nomor tiket dan waktu ditampilkan.
3. Admin membuka **Bantuan** → meninjau tiket → menetapkan P0/P1/P2/P3 dengan alasan → memindahkan OPEN ke TRIAGE/IN_PROGRESS.
4. Jika bug berdampak pada semua pembeli produk, admin membuka **Member 360°** dan memfilter berdasarkan product_id POS untuk menemukan pembeli yang terverifikasi.
5. Tim produk mengerjakan perbaikan di repository aplikasi POS **yang terpisah**; tidak mengubah database membership secara langsung.
6. Admin mencatat versi dan changelog pada **Rilis Produk**, lalu mempublikasikan draft.
7. Member pemilik produk melihat rilis PUBLISHED di menu **Bantuan/Rilis**; tiket ditutup hanya setelah resolusi terkonfirmasi. Jika member membalas tiket RESOLVED, status kembali OPEN.

**Catatan penting:** publikasi changelog tidak melakukan pembaruan binary/PWA/POS, tidak menjamin versi aplikasi member terkini, dan tidak mengirim WhatsApp otomatis. Integrasi telemetri versi aplikasi, notifikasi, lampiran, installer dan rollout adalah tahap terpisah.

## 6. Pratinjau dan bukti pengujian

Mode pratinjau lokal hanya menampilkan data contoh, bukan akun atau transaksi nyata:
- \`?preview=member#dukungan\` — form tiket, daftar laporan, changelog;
- \`?preview=member#tiket\` — detail percakapan sintetis;
- \`?preview=admin#member\` — pencarian Member 360° sintetis;
- \`?preview=admin#dukungan\` — antrean support dan metrik;
- \`?preview=admin#rilis\` — formulir draft rilis (disabled).

GitHub Actions Node.js menguji aturan API/otorisasi, idempotensi, pendaftaran tiket, pemulihan penulisan, anti-spam, status dan prioritas, pembeli rilis, dan HTML escaping. Chrome headless memeriksa render mobile support dan desktop Member 360° tanpa overflow. Bukti terakhir yang diverifikasi saat penyusunan dokumen:
[run #131 — 115/115 PASS](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43543129765).

Tes tersebut menggunakan database tiruan dan pratinjau lokal; **belum ada tes end-to-end pada GAS staging**.

## 7. Langkah berikut dan syarat sinkronisasi

- Spreadsheet staging sudah berisi 17 header, **tanpa data pribadi** dan tanpa setupDatabase ulang.
- Siapkan proyek Apps Script **staging terpisah**. Sinkronkan ketiga file \`apps-script/Code.gs\`, \`apps-script/Support.gs\`, dan \`apps-script/Diagnostics.gs\` sebagai satu paket, bukan menyalin Code.gs saja.
- Periksa Script Property \`NGD_DB_ID\` yang mengarah **hanya ke ID staging**, bukan ID sumber. Biarkan \`NGD_SUPPORT_ENABLED\`, \`NGD_MUTATIONS_ENABLED\`, \`NGD_REGISTRATION_ENABLED\`, dan \`NGD_FINANCE_ENABLED\` tidak diaktifkan saat inspeksi awal.
- Jalankan diagnostik schema read-only: harapannya 17/17 header cocok. \`adminExists:false\` di staging yang telah disanitasi **bukan** alasan untuk menjalankan setup pada database sumber.
- Ketika environment aman dan identitas dummy siap, uji integrasi member, tiket, balasan, prioritas, publish rilis, retry request, dan exception setelah append sebelum update.
- Bukti GET dan POST browser ke \`ContentService\` dari origin aplikasi masih diperlukan; jangan memasukkan PIN/token ke URL atau memakai \`no-cors\` untuk mengabaikan error.
- Baru setelah QA browser, data privacy, dan persetujuan aktivasi tercapai, pembukaan support di lingkungan produksi dapat dipertimbangkan.

**Keputusan tetap**: database Google Sheets sumber, Apps Script terpasang, dan deployment publik tidak diubah pada pengembangan modul support ini.

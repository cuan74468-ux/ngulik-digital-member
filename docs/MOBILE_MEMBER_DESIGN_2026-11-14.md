# Desain Mobile Member — Ngulik Digital

**Checkpoint:** 14 November 2026  
**Status:** Diimplementasikan di GitHub \`main\`; pengujian UI dan browser lulus. Backend LMS belum diaktifkan pada Apps Script nyata.  
**Basis desain:** tangkapan layar referensi pengguna berisi tiga layar aplikasi mobile: pembuatan post, pemilihan tujuan berbagi, dan konfirmasi berhasil. **Referensi ini diterjemahkan menjadi alur LMS/member, bukan disalin sebagai fitur berbagi media sosial.**

## 1. Arah visual

- **Canvas:** putih bersih dengan teks near-black, bukan tema gelap.
- **Aksen:** violet \`#6047ef\` (aksi primer, ikon aktif, ring progres), \`#efedff\` (permukaan sekunder).
- **Kartu:** putih atau lavender-gray \`#f9f9fd\`, sudut radius sekitar 16–24 px, border sangat halus dan bayangan minimal.
- **Tipografi:** DM Sans dan Plus Jakarta Sans yang sudah digunakan proyek; hierarki jelas, nyaman dibaca tanpa teks terlalu kecil.
- **Navigasi:** header putih dengan judul di tengah, tombol kembali pada layar detail, bottom navigation lima tujuan dengan ikon dan state aktif.
- **Aksi:** tombol primer kontras dengan tinggi sentuh sekitar 48–54 px.
- **Hasil aksi:** layar keberhasilan mandiri dengan ikon centang di lingkaran ungu, dekorasi abstrak halus, ringkasan pelajaran, dan dua CTA. Tidak menyatakan berhasil sebelum backend mengonfirmasi transaksi progres.
- **Mobile-only:** aturan di \`assets/member-mobile.css\` berlaku di bawah/equal 760 px dan hanya untuk kelas \`body.member-experience\`; admin tidak mendapat kelas ini.
- **Tanpa asset tambahan:** tidak ada font lokal, ikon berhak cipta, atau script eksternal baru.

## 2. Adaptasi referensi ke alur aplikasi

| Referensi visual | Ngulik Digital Member |
|---|---|
| Create Post | Beranda pribadi / halaman laporan bantuan dengan form terang dan jelas |
| Share To | Daftar kursus, kartu pilihan kelas, daftar pelajaran, dan tindakan pembelajaran |
| Shared Successfully | Layar \`#lms-complete\` setelah progres pelajaran disimpan oleh backend |

Penggunaan analogi hanya soal **desain dan kenyamanan interaksi**. Ngulik Digital tidak tiba-tiba memiliki modul publikasi Facebook, Instagram, TikTok, atau WhatsApp dari implementasi visual ini.

## 3. Implementasi source

- \`index.html\`: berkas CSS scoped baru, tombol kembali mobile yang dapat dipakai dari layar detail.
- \`assets/member-mobile.css\`: seluruh tema member mobile, palet, kartu, form, ring progres, navigasi bawah, layar sukses, responsive 375/390 px.
- \`js/app.js\`: klasifikasi tampilan member vs admin, state navigasi aktif di halaman turunan, panel fokus belajar, route \`lms-complete\`, penanganan penyelesaian pelajaran yang terkonfirmasi.
- \`js/lms-ui.js\`: layar konfirmasi member dengan detail progres, CTA lanjut kelas, dan label **contoh** pada mode pratinjau.
- \`tests/frontend-mobile-design.test.cjs\`: isolasi role, state navigasi, keamanan XSS, simulasi pratinjau, dan label sukses.
- \`tests/layout-probe.js\` serta \`.github/workflows/validate.yml\`: pemeriksaan style terkomputasi di browser, tema ungu aktif, overflow horizontal, dan keterbacaan alur mobile.

## 4. Pratinjau visual

Jika GitHub Pages sudah aktif untuk branch \`main\`, buka tautan berikut pada ponsel. Semua URL ini mengandung **data contoh lokal**, bukan data member/transaksi nyata:

- Beranda: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#beranda\`
- Katalog kelas: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#belajar\`
- Detail kelas: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#lms-course\`
- Layar berhasil: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#lms-complete\`
- Form bantuan: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#dukungan\`
- Akun: \`https://cuan74468-ux.github.io/ngulik-digital-member/?preview=member#akun\`

Satu demo pencapaian sengaja memiliki tulisan bahwa data **tidak disimpan**. Tombol-tombol penulisan, pembayaran, dan dukungan tetap nonaktif selama release gates belum dibuka.

## 5. QA dan batasan yang diverifikasi

- [GitHub Actions run #193](https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/43550180541): **178/178** tes Node.js lulus.
- Chrome headless memeriksa viewport mobile **375 × 812** dan **390 × 844**, termasuk halaman bantuan dan pembelajaran; tidak ada horizontal overflow pada rute yang diuji.
- Browser juga memeriksa tampilan \`#lms-complete\`, memastikan state preview eksplisit, member theme memiliki aksen violet terhitung, dan halaman admin tidak memakai kelas theme member.
- Tes unit memastikan aksi tulis LMS dan support tetap terkunci pada mode pratinjau.

**Belum termasuk:** pengujian sentuhan fisik pada Android asli, pengukuran aksesibilitas menyeluruh (screen reader), upload lampiran, notifikasi otomatis WhatsApp/email, API key LLM, ataupun sinkronisasi Apps Script staging/produksi. Tidak boleh mengklaim item tersebut selesai hanya dari pratinjau.

## 6. Handoff untuk pekerjaan LLM berikutnya

- Perlakukan \`apps-script/LMS.gs\` sebagai kontrak domain LMS, jangan menambahkan token atau API key pada \`config.js\`, HTML, JS GitHub Pages, URL, atau Google Sheets yang dapat diakses browser.
- Antrean draft \`lms_ai_jobs\` adalah persiapan editorial; tidak ada pemanggilan model pada versi ini.
- LLM eksternal nantinya boleh membantu menyusun teks, outline, atau draft kuis **dalam workspace**, tetapi hasil wajib ditinjau manusia sebelum disalin/diterbitkan.
- Jangan mencampur data peserta, status pembayaran, dan hasil LLM tanpa kontrol hak akses.
- Gunakan staging terisolasi, audit ketepatan skema, pengujian Apps Script end-to-end, dan persetujuan eksplisit sebelum mengaktifkan penulisan.
- Kembangkan visual melalui komponen dan kelas yang sudah ada, bukan menambah framework, dependensi berbayar, atau layanan eksternal yang tidak diperlukan.

**Keputusan desain:** pertahankan identitas produk Ngulik Digital. Referensi dipakai sebagai standar kualitas desain mobile, bukan sebagai alasan memasang fitur sosial atau langganan baru tanpa arahan produk.

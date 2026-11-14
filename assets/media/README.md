# Media Ngulik Digital — milik pengelola

Folder ini untuk gambar asli yang diunggah sendiri oleh pemilik melalui GitHub Web. **Jangan unggah PIN, API key, KTP, data anggota, bukti transfer atau data rahasia.** Semua file di folder ini akan bersifat **publik** setelah GitHub Pages dideploy.

## Format dan ukuran yang disarankan

- Banner hero: WebP/JPG, lebar sekitar 1600 px, rasio 2.4–2.8:1. Simpan teks penting di bagian tengah agar aman saat layar ponsel memangkas sisi.
- Sampul halaman: WebP/JPG, lebar sekitar 1200 px, rasio 2:1.
- Foto/gambar produk: WebP/JPG, persegi 600–900 px.
- Ikon fitur/menu: PNG/WebP transparan, 128–256 px.
- Logo: PNG/WebP transparan, bentuk horizontal atau persegi sesuai slot.
- Optimalkan file sekitar 100–400 KB jika visual memungkinkan; gunakan nama file huruf/angka, tanda hubung, atau garis bawah.

## Cara unggah lewat browser

1. Buka folder `assets/media` pada repository GitHub.
2. Pilih **Add file → Upload files**, unggah gambar, dan **Commit changes**.
3. Setelah GitHub Pages berhasil deploy, pastikan URL gambar terbuka, misalnya `https://cuan74468-ux.github.io/ngulik-digital-member/assets/media/banner-november.webp`.
4. Di panel Admin → **Konten Visual**, isi `assets/media/banner-november.webp` sebagai **Path gambar**. Buat draft, tinjau, lalu terbitkan.
5. Banner dapat memiliki urutan dan tanggal mulai/akhir. Berkas tetap di GitHub meskipun konten disembunyikan atau diarsipkan.

**Catatan penting:** Versi CMS pada GitHub harus lebih dahulu disinkronkan ke Google Apps Script, tabel `site_content` harus disiapkan di database yang benar, dan izin mutasi konten harus diuji. Form admin ini belum melakukan upload biner langsung.

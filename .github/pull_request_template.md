## Ringkasan / alasan
<!-- Apa yang berubah dan mengapa? -->

## Berkas dan dampak
<!-- Sebutkan file; frontend / backend Apps Script / data / keuangan -->

## Bukti pengujian
- [ ] `node --test tests/*.test.cjs` lulus
- [ ] Validate backend and frontend (no deploy) lulus
- [ ] Staging Source Check lulus bila terpicu
- [ ] CodeQL ditinjau jika tersedia

## Belum terbukti
<!-- Contoh: deploy GAS manual, Android nyata, penerimaan dana -->

## Batas keamanan
- [ ] Sakelar rilis `config.js` / `staging/config.js` / `staging/member-config.js` tidak diubah
- [ ] Tidak ada kredensial atau data pribadi pada diff/log
- [ ] Tidak mengubah schema/data STAGING atau produksi
- [ ] Jika GAS diubah, daftar file + diagnostik read-only + langkah rollback tersedia

## Tindakan / keputusan pemilik
<!-- Jelaskan tindakan manual, risiko, dan persetujuan sebelum merge -->

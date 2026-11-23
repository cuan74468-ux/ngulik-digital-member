# P0-E — Runbook uji transaksi Starter Pack STAGING (NO-GO sampai izin terpisah)
Tanggal persiapan: 2026-11-23 · Pemilik keputusan: Owner Ngulik Digital
Sumber kode: `apps-script/Code.gs` dan `apps-script/Diagnostics.gs` di `main` setelah PR #13 (`291cf77a67cb12b0de545da22dda8bb7ee9acea7`).
**Dokumen ini adalah rencana. Tidak mengizinkan pengaktifan pembayaran, eksekusi GAS, perubahan Script Properties, deploy, atau perubahan data.**

## 0. Batas dan fakta yang sudah diverifikasi
- Target **hanya** spreadsheet STAGING `STAGING Ngulik Digital - Migrasi 27 Tab - 15 November 2026` (29 tab); database produksi `Ngulik Digital DB` dilarang diakses untuk penulisan.
- `NGD_MUTATIONS_ENABLED=false` dan `NGD_FINANCE_ENABLED=false` hingga izin pemilik proyek **baru dan spesifik untuk P0-E**. Jangan menyalakan hanya berdasarkan dokumen ini.
- Diagnostik P0-D: ping/DB/schema/mutation gate PASS; finance `FAILED` satu invoice historis dan rekonsiliasi `WARN` satu order lain; klasifikasi **tidak boleh disembunyikan**.
- Data historis yang tidak boleh diedit/replay: `NGD-261122-C7EDBFB8F63F` (`EXPIRED`, nominal 14900 untuk dasar 15000 + kode 100, seharusnya 15100) dan `ORD-STG-0001` (`PAID`, kredit 10 sudah posted, komisi historis ke ADMIN belum eligible).
- Produk aktif **aktual pada STAGING**: `P-STARTER-15K`, jenis `PRODUK_DIGITAL`, harga Rp15.000, kredit 15, `bisa_komisi=true`, `komisi_nominal_tetap=5000`. `P-STARTER-15` ada dalam seed/kode, tetapi **jangan berasumsi tersedia sebagai SKU aktif STAGING**.
- Kode membedakan konfirmasi member dari penerimaan uang: `confirmPayment` memindah `PENDING -> MENUNGGU_VERIFIKASI` dan *tidak* `PAID`. Pembukaan tautan WA saja harus tidak memanggil mutasi API; audit UI perlu memastikannya.
- `onPaid_` untuk `PRODUK_DIGITAL` memanggil `grantCredits_(...,15,order_id,'DIGITAL_BONUS')`; bonus kredit **bukan** tipe `TOPUP`. Inspeksi ledger gunakan `ref_id=order_id`, bukan hanya tipe TOPUP.
- Komisi Rp5.000 hanya bila pembeli MEMBER, inviter MEMBER aktif yang berbeda, `referred_by` cocok, **dan** inviter memiliki Starter `PAID`/`FULFILLED`. Komisi Starter eligible bertiming `INSTANT_ON_PAID`, tercatat `APPROVED` (bukan otomatis dibayar keluar).
- GAS/Sheets tidak menjamin transaksi atomik antartabel. `PAID` + `needs_review` atau saldo/ledger tidak cocok = **STOP, rekonsiliasi manusia, jangan ulang approve**.

## 1. Gate pra-otorisasi (read-only, wajib dicatat)
| Bukti | Kriteria |
|---|---|
| GitHub + GAS | File `Code.gs`, `Diagnostics.gs`, dan modul pendamping sesuai revisi disetujui; periksa target Web App/deployment STAGING tersendiri sebelum go-live. Menyimpan kode editor **bukan** bukti deployment `/exec` mutakhir. |
| CI | Tes main terbaru lulus; pekerjaan TODO dicatat, tidak disamarkan. |
| Identitas DB | `diagnosticDatabase` menunjukkan nama STAGING dan 29 tab; `diagnosticSchema` = `SCHEMA_OK`. |
| Pengaman | `diagnosticMutationGateReadOnly` = `MUTATION_GATE_OK`, flags masih false; `diagnosticFinanceReadOnly` dan `diagnosticReconciliationReadOnly` mengeluarkan **temuan yang sama**, tanpa temuan baru. |
| Data awal | Catat timestamp WIB, 4 order historis, hitungan ledger/komisi, saldo awal *member uji baru*, versi produk dan setting QRIS, snapshot bukti read-only (tanpa PIN/token/kunci). |
| Media bayar | QRIS resmi merchant/nomor penerima & bukti mutasi/settlement di luar sistem tervalidasi, bukan placeholder QR visual. Jangan gunakan rekening pribadi secara tidak sengaja. |
| Akun uji | Gunakan MEMBER baru yang khusus uji, bukan M-0009 atau akun historis; pastikan tidak ada order aktif SKU sama, saldo awal, referral chain jelas. |
| Izin | Owner memberi persetujuan **terpisah**, spesifik nominal, akun/produk, jadwal, batas scope, dan penanggung jawab verifikasi dana. Tanpa ini: NO-GO. |

## 2. Rencana satu siklus saat diizinkan (BUKAN instruksi untuk dieksekusi sekarang)
1. **Pra-uji**: catat saldo akun uji S0 dari ledger posted, order aktif, komisi; pastikan tidak ada entri untuk `request_id` yang akan dipakai. Simpan bukti pratransaksi.
2. **Checkout**: akun MEMBER membuat **satu** order `P-STARTER-15K`; simpan `order_id`, `request_id`, `created_at`, `expires_at`, harga dasar, kode unik. PASS iff harga dasar = 15000, kode unik bilangan bulat 100–999, total = 15000 + kode unik, status awal `PENDING`.
3. **Refresh/retry**: refresh melihat order sama; retry dengan **`request_id` identik** mengembalikan order sama, tidak membuat baris kedua. Request ID baru sementara order aktif harus tidak menambah order aktif kedua untuk member+produk. Jika expired/invalid, STOP dan tinjau, jangan paksakan.
4. **WhatsApp / klaim bayar**: hanya membuka link WA tidak boleh mengubah `orders`. Jika aksi `confirmPayment` benar-benar dipanggil, transisi yang boleh adalah `PENDING -> MENUNGGU_VERIFIKASI`, bukan `PAID`. Ulang konfirmasi tidak menghasilkan transaksi finansial. Bandingkan order sebelum/sesudah.
5. **Pembayaran nyata**: hanya bila Owner mengizinkan dan QRIS terbukti resmi, lakukan **satu** pembayaran sebesar `total_bayar` persis; verifikasi *settlement* mandiri (mutasi merchant) dan referensi pembayaran unik. Screenshot/WA/klaim member bukan bukti penerimaan dana.
6. **Approval administratif tunggal**: admin mengisi penerimaan dana nyata, `nominal_terverifikasi=total_bayar`, referensi settlement yang belum digunakan, dan `metode_diterima` sesuai mutasi. Server memakai `LockService`; pemeriksaan final harus tidak mengizinkan selisih Rp1, referensi dipakai ulang, atau order `EXPIRED`.
7. **Fulfillment**: satu ledger `DIGITAL_BONUS` untuk `ref_id=order_id`, jumlah +15, status posted, dan saldo ledger posted setelah = S0+15; bila member memiliki saldo snapshot nonformula, saldo member harus selaras. Status order menjadi `FULFILLED`; akses Starter aktif hanya karena order Starter terverifikasi.
8. **Komisi**: skenario pembelian **tanpa pengajak eligible** -> tidak ada komisi. Pada **uji terpisah yang telah disetujui dan dibiayai tersendiri**, pembeli yang direferensikan oleh MEMBER aktif dengan Starter terverifikasi -> satu komisi Rp5.000 bertipe `APPROVED`, tidak otomatis `PAID`/dicairkan. Pengajak ADMIN, diri sendiri, atau belum Starter -> tidak ada komisi baru. Jangan menambah transaksi hanya untuk mengejar seluruh variasi ini pada satu izin.
9. **Anti-duplikasi**: panggilan approve/retry yang aman untuk order `FULFILLED` harus mengembalikan order tanpa ledger atau komisi tambahan. **Jangan klik ulang secara buta** jika status `PAID` + `needs_review` / pemenuhan parsial — STOP untuk audit.
10. **Penutupan**: segera kembalikan flags ke false setelah scope uji diselesaikan; uji `diagnosticMutationGateReadOnly` = `MUTATION_GATE_OK`; catat seluruh order/ledger/commission baru dan laporan, tetapi pertahankan seluruh histori.

## 3. Tes negatif/failure injection (hanya offline/sintetis dahulu)
| Kasus | Lulus jika |
|---|---|
| Salah nominal, kode unik di luar rentang | Ditolak sebelum approval; tidak ada kredit/komisi. |
| Request ID sama dan refresh | Tidak ada order duplikat; idempotent untuk member+produk yang sama. |
| Settlement reference dipakai dua order | Approval kedua ditolak sebelum posting. |
| Order `EXPIRED` atau expiry invalid | Tidak boleh approve langsung; dana masuk terlambat diproses rekonsiliasi manual, tanpa mengubah order lama. |
| Pembayaran diklaim via WA tanpa mutasi uang | Tidak ada status `PAID`/posting ledger. |
| Crash setelah kredit ditulis atau setelah order `PAID` | Tidak ada second credit pada replay; `needs_review` atau status audit tetap terlihat. Tanpa perbaikan manual terotorisasi, STOP. |
| Gagal komisi setelah fulfillment | Kredit tidak diulang; rekonsiliasi komisi berbasis order_id/ledger; jangan otomatis bayar ulang. |
| Dana tidak diketahui / refund parsial | Tidak ada refund/penyesuaian otomatis dari skenario uji; seluruhnya ke review admin terdokumentasi. |

Jangan sengaja memicu kegagalan finansial dalam transaksi nyata pertama. Gunakan pengujian synthetic/in-memory di CI untuk kasus partial commit, concurrency, refund, expiry, dan idempotensi. Tidak memerlukan pembayaran atau flag true untuk simulasi.

## 4. Matriks bukti pasca-uji dan keputusan
| Entitas | Bukti minimal | PASS |
|---|---|---|
| Order | order_id, request_id, product_id, nominal, status, timestamps | Satu order dengan harga+kode sesuai, status `FULFILLED`, tanpa mutasi historis |
| Ledger | entry_id, member_id, tipe, jumlah, ref_id, status, saldo | Tepat satu kredit `DIGITAL_BONUS` +15 untuk order uji; S1=S0+15 |
| Member | role/status, saldo sebelum-sesudah, akses | Akses Starter sesuai order PAID/FULFILLED, bukan sekadar flag browser |
| Komisi | id, referrer_id, order_id, nominal, status | Nol atau tepat satu sesuai kelayakan; Rp5.000 bila eligible; belum dicairkan |
| Audit | ORDER_CREATED, approval, fulfillment, commission events, errors | Tidak ada event hilang/kegagalan tidak ditinjau |
| Pengaman | Script Properties + mutation-gate pasca-uji | Keduanya kembali false, gate PASS |
| Baseline | historic orders, ledger/commissions lama | Tetap identik untuk order yang dilindungi |
| Lingkungan | Script Project, deployment version, spreadsheet ID | STAGING saja; tidak menyentuh produksi |

**PASS P0-E** hanya jika verifikasi mutasi dana, saldo, komisi, audit, dan penutupan pengaman semuanya cocok serta tidak ada `needs_review` baru. Jika ada satu kegagalan → **STOP/NO-GO**, jangan auto-retry uang, dokumentasikan dan eskalasi owner.

## 5. Template persetujuan eksplisit (DIISI NANTI, tidak berlaku dengan sendirinya)
- Izin Owner untuk **satu** transaksi nyata: **BELUM DIBERIKAN**
- ID akun/member uji baru: ______
- Produk: `P-STARTER-15K`
- Nominal maksimum: Rp15.999 (Rp15.000 + kode unik maksimal Rp999), sesuai nominal invoice sesungguhnya
- Referensi QRIS merchant terverifikasi: ______
- Window waktu STAGING: ______ WIB
- Petugas verifikasi mutasi: ______
- Batas toleransi: **nol** untuk selisih, duplikat, penyimpangan order, atau saldo
- Persetujuan terpisah untuk uji komisi eligible kedua: **BELUM DIBERIKAN**
- Otorisasi perubahan flags dan deployment STAGING: **BELUM DIBERIKAN**
- Kapan flags dikembalikan false: segera setelah satu siklus selesai / bila STOP

## 6. Status checkpoint
- P0-C: source GAS STAGING disalin, tetapi kecocokan versi Web App yang sedang dideploy perlu dibuktikan sebelum live.
- P0-D: pelaksanaan diagnostik selesai; hasil keuangan historis tetap `FAILED` / `WARN`, bukan semua PASS.
- P0-E: **RUNBOOK READY FOR REVIEW; REAL TRANSACTION NO-GO**.
- Jangan menjalankan `setupDatabase`, `syncCommercialSchemaStaging`, `installTriggers`, `financeAutomationTick`, `expireOrders`, atau tindakan admin finansial tanpa izin tertulis/spesifik.

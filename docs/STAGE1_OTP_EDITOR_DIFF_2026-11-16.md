# Tahap 1 — Perbandingan kode OTP editor STAGING vs GitHub (bukti operator)

**Tanggal:** 16 November 2026 (WIB)  
**Status:** DIFF PARTIAL DIBUKTIKAN / GAS STAGING BELUM DIPATCH / NO-GO  
**Asal sampel editor:** teks `OtpAuth.gs` disalin langsung oleh operator dari editor Apps Script STAGING dalam percakapan pada tanggal di atas; belum ada API readback langsung atas revisi editor.  
**Sumber pembanding:** `apps-script/OtpAuth.gs` pada GitHub `main`, Git blob `02058fa443151f359e6dd45fcb09bb35392c622a`. Baseline regresi: source commit `1cd335e47cd5ff61ec1482e3e6976b83b8501177`, GitHub Actions `43797282501` (443 tes).  
**Catatan:** diff ini terbatas pada isi OTP yang disalin operator, *bukan* attestasi semua 18 file editor atau deployment Web App.

## Perbedaan yang terbukti
1. `ngdOtpProperties_`: editor tidak memiliki pemeriksaan flag tambahan `NGD_EXTERNAL_PROVIDERS_ENABLED === 'true'`; source GitHub mewajibkannya.
2. `ngdOtpRequest_`: editor belum memanggil `requireRegistrationWaEvidenceColumns_()` sebelum permintaan OTP; source GitHub memeriksa keberadaan kolom bukti WA.
3. `ngdOtpRecordAttempt_`: editor memakai `(Number(row.attempts)||0)+1`; counter kosong/rusak dapat ditafsirkan sebagai nol. Source GitHub menambah `ngdOtpAttemptCount_` (bilangan bulat >=0 dan <3) dan menolak data invalid.
4. `ngdOtpVerify_`: editor hanya memeriksa `new Date(expires_at).getTime()<=Date.now()`, yang tidak menolak `NaN`; source GitHub menolak timestamp non-finite serta menggunakan helper counter.
5. `ngdValidateVerifiedRegistrationOtp_`: fungsi ini **belum muncul** dalam source editor yang disalin. GitHub menambah validasi OTP tanpa mengonsumsi, untuk dipakai **sebelum** append member dalam lock.
6. `ngdConsumeVerifiedRegistrationOtp_`: editor memvalidasi sekaligus menandai OTP `USED` sebelum akun dibuat; di GitHub fungsi menerima ID bukti internal dan dipakai sesudah append member, serta membandingkan kode OTP ulang.

## Perbedaan terkait dari `Kode.gs` yang sebelumnya disalin operator
Sampel `Kode.gs` editor sebelumnya menunjukkan `authRegister_` mengonsumsi OTP sebelum `appendRow_('members',...)`, `authLogin_` memilih satu record WA melalui `byId_`, dan `session_` memakai pengecekan expiry yang tidak menolak `NaN`. Source `apps-script/Code.gs` GitHub sekarang mengubah kontrak fungsi tersebut. **Jangan memasang satu file secara terpisah:** `Code.gs` dan `OtpAuth.gs` harus diaudit sebagai satu unit kompatibilitas.

## Status operasional yang dilaporkan operator
- Backup source editor dibuat menurut konfirmasi operator; **belum diverifikasi melalui readback salinan**.
- `NGD_ENVIRONMENT=STAGING` dan `NGD_DB_ID` cocok menurut daftar Script Properties yang dikirim operator.
- Enam flags registrasi/OTP/mutasi/finance/provider/PIN V2 tidak muncul pada daftar yang dikirim; jangan menyimpulkan seluruh kondisi runtime dari potongan pengaturan jika daftar belum dikonfirmasi lengkap. `NGD_ADMIN_LOGIN_ENABLED=true` adalah gerbang login admin khusus; jangan ubah untuk mengaktifkan OTP.
- Tidak ada patch, deploy GAS, perubahan Script Properties, OTP nyata, sesi, anggota, maupun ledger yang dilakukan dalam audit ini.

## Gerbang operasional berikutnya
1. Inventaris dependensi dan nama fungsi pada file pengujian STAGING khusus yang **tidak ada** dalam source module GitHub (`StagingOtpGateTest.gs`, `StagingOtpInternalTest.gs`, `StagingOtpLogicTest.gs.gs`, dan lainnya). Pertahankan semua file tambahan sampai tujuan serta dependensinya dipahami.
2. Verifikasi backup source editor (daftar file dan isi file yang dicadangkan), identitas project dan versi deployment/rollback.
3. Siapkan diff `Kode.gs` dan `OtpAuth.gs` sebagai patch **per fungsi**, dan jalankan regresi terisolasi tanpa provider/akun nyata.
4. Setelah pengujian dan izin owner yang spesifik, pertimbangkan patch STAGING; jangan membuka registrasi, provider, finance, atau PIN V2.
5. Laksanakan audit `ngdRegistrationRecoveryPreflightReadOnly` hanya ketika fungsi editor dan seluruh dependensinya sudah diverifikasi; tidak ada hasil audit runtime hingga saat ini.

**Rujukan:** [Handoff autentikasi](STAGE1_AUTH_PATCH_HANDOFF_2026-11-16.md) · [Checklist sinkronisasi](STAGE1_RUNTIME_ALIGNMENT_OPERATOR_CHECKLIST_2026-11-16.md) · [Checkpoint](CHECKPOINT_2026-11-16_RESUME_BUILD_STAGE1.md)

'use strict';
// Tes perbaikan hasil audit 14 Nov 2026. Tanpa Google API, tanpa jaringan.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');

function boot(opts={}){
  let now=Date.parse('2026-11-14T08:00:00Z'),touched=0;
  class Time extends Date{static now(){return now;}}
  const cached=new Map(),props=new Map();
  const forbidden=new Proxy({}, {get(){touched++;throw new Error('UNEXPECTED_GOOGLE_IO');}});
  const cache={get:k=>cached.get(k)||null,put:(k,v)=>cached.set(k,v),remove:k=>cached.delete(k)};
  const store={getProperty:k=>{
      if(k in (opts.flags||{}))return opts.flags[k];
      return props.get(k)||null;},
    setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)};
  const errors=[];
  const ctx=vm.createContext({Date:Time,
    console:{log(){},warn(){},error(m){errors.push(String(m));}},
    CacheService:{getScriptCache(){return cache;}},
    PropertiesService:{getScriptProperties(){return store;}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput(c){return {getContent(){return c;},setMimeType(){return this;}};}},
    Utilities:{formatDate(d){return new Date(d).toISOString().slice(0,19);},getUuid(){return crypto.randomUUID();}},
    LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}};}},
    SpreadsheetApp:forbidden,ScriptApp:forbidden});
  vm.runInContext(source,ctx,{timeout:10000});
  ctx.sha256_=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
  const request=(action,payload={},token='',id='hardening_req_1234567890')=>JSON.parse(
    vm.runInContext('doPost('+JSON.stringify({postData:{contents:JSON.stringify({action,payload,token,request_id:id})}})+').getContent()',ctx));
  return {ctx,cached,props,errors,request,advance:ms=>{now+=ms;},touched:()=>touched};
}
const on={flags:{NGD_MUTATIONS_ENABLED:'true',NGD_REGISTRATION_ENABLED:'true'}};

test('kesalahan input tampil sebagai VALIDATION, bukan gangguan sistem',()=>{
  const h=boot(on);
  const cases=[
    ['login',{wa:'abc',pin:'123456'},/Nomor WhatsApp tidak valid/],
    ['login',{wa:'081234567890',pin:'12'},/PIN harus enam angka/]
  ];
  for(const [action,payload,msg] of cases){
    const r=h.request(action,payload);
    assert.equal(r.ok,false);
    assert.equal(r.error.code,'VALIDATION',action);
    assert.match(r.error.message,msg);
  }
  const reg=h.request('register',{wa:'12',pin:'493827',nama:'A',nama_usaha:'B'});
  assert.equal(reg.error.code,'MAINTENANCE','registrasi memerlukan aktivasi OTP terpisah');
  assert.equal(h.errors.length,0,'validasi tidak boleh dicatat sebagai NGD_ERROR');
  assert.equal(h.touched(),0);
});
test('akun terkunci mendapat kode RATE_LIMITED dengan durasi sebenarnya',()=>{
  const h=boot(),wa='6281234000100';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(wa,true);
  let err;try{h.ctx.loginGuard_(wa);}catch(e){err=e;}
  assert.equal(err.publicCode,'RATE_LIMITED');
  assert.match(err.message,/dalam 15 menit/);
});
test('PIN lemah ditolak untuk PIN baru, PIN kuat diterima',()=>{
  const h=boot();
  for(const weak of ['123456','000000','111111','654321','121212','123123','112233','123321','159753','456789','789012','081234'])
    assert.equal(h.ctx.isWeakPin_(weak,'6281234081234'),true,weak);
  for(const strong of ['493827','815260','370914','629481'])
    assert.equal(h.ctx.isWeakPin_(strong,'6281234081234'),false,strong);
  assert.throws(()=>h.ctx.checkNewPin_('123456','6281200000000'),/terlalu mudah ditebak/);
  assert.throws(()=>h.ctx.checkNewPin_('12345','6281200000000'),/enam angka/);
  assert.doesNotThrow(()=>h.ctx.checkNewPin_('493827','6281200000000'));
  // Login lama tetap memakai checkPin_ saja, jadi PIN lama yang lemah masih bisa masuk.
  assert.doesNotThrow(()=>h.ctx.checkPin_('123456'));
});
test('register dan ganti PIN memakai aturan PIN baru; login tidak',()=>{
  assert.match(source,/checkNewPin_\(pin,wa\)/);
  assert.match(source,/checkNewPin_\(p\.pin_baru,m\.wa\)/);
  const login=source.slice(source.indexOf('function authLogin_('),source.indexOf('function authLogout_('));
  assert.doesNotMatch(login,/checkNewPin_/);
  const h=boot(on);
  const r=h.request('register',{wa:'081234567890',pin:'123456',nama:'Ari',nama_usaha:'Warung',setuju_kebijakan:true});
  assert.equal(r.error.code,'MAINTENANCE');
  assert.throws(()=>h.ctx.checkNewPin_('123456','6281234567890'),/terlalu mudah ditebak/);
});
test('PIN acak admin tidak pernah lemah',()=>{
  const h=boot();
  for(let i=0;i<200;i++)assert.equal(h.ctx.isWeakPin_(h.ctx.randomStrongPin_()),false);
});
test('akun ADMIN dikunci 60 menit, member tetap 15 menit',()=>{
  const h=boot(),admin='6281234000101',member='6281234000102';
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(admin,true);
  assert.equal(h.ctx.extendAdminLock_(admin),true);
  for(let i=0;i<5;i++)h.ctx.noteLoginFailure_(member,true);
  h.advance(16*60000);
  h.cached.clear();h.props.delete(h.ctx.loginFailureStoreKey_(member));
  assert.equal(h.ctx.loginGuard_(member).attempts,0);
  // Admin: cache hilang, kunci tetap hidup lewat Script Properties.
  h.cached.clear();
  assert.throws(()=>h.ctx.loginGuard_(admin),/Terlalu banyak percobaan/);
  h.advance(45*60000);
  assert.equal(h.ctx.loginGuard_(admin).attempts,0);
});
test('perpanjangan kunci admin tidak aktif sebelum batas gagal tercapai',()=>{
  const h=boot(),wa='6281234000103';
  for(let i=0;i<4;i++)h.ctx.noteLoginFailure_(wa,true);
  assert.equal(h.ctx.extendAdminLock_(wa),false);
});
test('authLogin_ memanggil perpanjangan hanya untuk ADMIN dan resetAdminPin membuka kunci',()=>{
  assert.match(source,/if\(m&&m\.role==='ADMIN'\)extendAdminLock_\(wa\)/);
  const reset=source.slice(source.indexOf('function resetAdminPin('),source.indexOf('function healthCheck('));
  assert.match(reset,/clearLoginFailures_\(String\(admin\.wa\)\)/);
});
test('kode referral baru selalu diawali huruf dan unik',()=>{
  const h=boot();
  h.ctx.readAll_=()=>[];
  for(let i=0;i<300;i++)assert.match(h.ctx.newReferralCode_(),/^R[0-9A-F]{7}$/);
  h.ctx.uuid_=()=>'ABCDEF1234567890';
  h.ctx.readAll_=()=>[{kode_referral:'RABCDEF1'}];
  assert.throws(()=>h.ctx.newReferralCode_(),/Kode referral belum bisa dibuat/);
});
test('auditReferralCodes menandai kode angka atau berawalan digit',()=>{
  const h=boot();
  h.ctx.readAll_=()=>[{member_id:'M-1',kode_referral:'ABCDEF12'},{member_id:'M-2',kode_referral:12345678},
    {member_id:'M-3',kode_referral:'00123456'},{member_id:'M-4',kode_referral:'RA1B2C3D'}];
  assert.deepEqual(Array.from(h.ctx.auditReferralCodes().risky),['M-2','M-3']);
});

function refundFixture({failOrderUpdate=false}={}){
  const h=boot(),calls=[];
  const order={order_id:'NGD-1',member_id:'M-1',product_id:'P-K',status:'FULFILLED',_row:5};
  const ledger=[{member_id:'M-1',ref_id:'NGD-1',tipe:'TOPUP',jumlah:50,status:'POSTED'},
    {member_id:'M-1',tipe:'GRANT',jumlah:30,status:'POSTED'}];
  const commissions=[{komisi_id:'K-1',order_id:'NGD-1',status:'PENDING',_row:7}];
  h.ctx.withLock_=fn=>fn();
  h.ctx.now_=()=>new Date('2026-11-14T08:00:00Z');
  h.ctx.byId_=(name)=>name==='orders'?order:name==='members'?{member_id:'M-1'}:{tipe:'TOPUP_KREDIT'};
  h.ctx.findRows_=(name,predicate)=>(name==='credits_ledger'?ledger:
    name==='affiliate_commissions'?commissions:[]).filter(predicate);
  h.ctx.logAudit_=()=>{};
  h.ctx.grantCredits_=(id,amount,ref,kind)=>{calls.push('credit:'+amount+':'+kind);};
  h.ctx.updateRow_=(name,row,patch)=>{
    if(name==='orders'&&failOrderUpdate)throw new Error('Sheets gagal');
    calls.push(name+':'+patch.status);};
  const run=()=>h.ctx.refundOrder_({member_id:'ADM',role:'ADMIN'},{order_id:'NGD-1',alasan:'Dana dikembalikan',
    dana_sudah_dikembalikan:true,referensi_refund:'TRF-12345'});
  return {run,calls};
}
test('refund: komisi dibalik, kredit ditarik, status order terakhir',()=>{
  const f=refundFixture();
  f.run();
  assert.deepEqual(Array.from(f.calls),['affiliate_commissions:REVERSED','credit:-50:ADJUST_REFUND','orders:REFUNDED']);
});
test('refund: bila status order gagal tersimpan, error jelas dan tidak ada status REFUNDED palsu',()=>{
  const f=refundFixture({failOrderUpdate:true});
  assert.throws(()=>f.run(),e=>e.publicCode==='RECONCILIATION_REQUIRED'&&/Jangan ulangi refund/.test(e.message));
  assert.ok(f.calls.includes('credit:-50:ADJUST_REFUND'));
  assert.equal(f.calls.includes('orders:REFUNDED'),false);
});

test('pembersihan sesi menghapus dari baris bawah dan tidak butuh saklar keuangan',()=>{
  const h=boot({flags:{NGD_MUTATIONS_ENABLED:'true'}}),deleted=[];
  const past=new Date('2026-11-01T00:00:00Z'),future=new Date('2026-12-01T00:00:00Z');
  h.ctx.withLock_=fn=>fn();
  h.ctx.findRows_=(name,pred)=>[{_row:2,expires_at:past},{_row:3,expires_at:future},{_row:4,expires_at:past},{_row:6,expires_at:past}].filter(pred);
  h.ctx.tbl_=()=>({sheet:{deleteRow:r=>deleted.push(r)}});
  assert.equal(h.ctx.financeEnabled_(),false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.ctx.cleanupExpiredSessions())),{sessions:3});
  assert.deepEqual(deleted,[6,4,2]);
});
test('cleanupExpiredSessions dan installer trigger tetap tertutup saat mutasi OFF',()=>{
  const h=boot();
  assert.throws(()=>h.ctx.cleanupExpiredSessions(),/Perubahan data belum diaktifkan/);
  assert.throws(()=>h.ctx.installSessionCleanupTrigger(),/Perubahan data belum diaktifkan/);
  assert.equal(h.touched(),0);
});
test('fungsi pemeliharaan tidak terbuka lewat API',()=>{
  const h=boot(on);
  for(const action of ['cleanupExpiredSessions','installSessionCleanupTrigger','auditReferralCodes']){
    const r=h.request(action);
    assert.equal(r.ok,false,action);
  }
});

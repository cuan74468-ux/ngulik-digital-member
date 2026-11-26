'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const row=(content_id,kind,placement,title='',description='',extra={})=>({
 content_id,kind,placement,title,description,status:'PUBLISHED',sort_order:1,
 image_path:'',cta_label:'',cta_route:'',...extra
});
function front(){
 const window={NGD_CONTENT_UI:{mediaPath:()=>''}};
 vm.runInNewContext(read('js/public-cms-home.js'),{window},{timeout:3000});
 vm.runInNewContext(read('js/cms-surfaces.js'),{window},{timeout:3000});
 return window;
}
test('published STAGING kind aliases are included in public GAS projection',()=>{
 const c={NGD:{TZ:'Asia/Jakarta'},now_:()=>new Date('2026-11-24T10:00:00Z'),
 Utilities:{formatDate:()=>'2026-11-24'}};
 const rows=['HERO_ACTION','SECTION_HEADER','FEATURE_ITEM','CHECKOUT_COPY',
   'MEMBER_GREETING','DISCLAIMER'].map((kind,i)=>row('CNT-SHEET-'+i,kind,
     i===3?'checkout':i===4?'member_home':i===5?'member_portal':'home','Konten'));
 c.readAll_=name=>name==='site_content'?rows:[];
 vm.runInNewContext(read('apps-script/Content.gs'),c,{timeout:3000});
 const list=c.contentPublicList_();
 assert.equal(list.length,6);
 assert.deepEqual([...list.map(x=>x.kind)],rows.map(x=>x.kind));
});
test('actual 27-row STAGING shape displays secondary CTA, headings, four Starter items and benefit list',()=>{
 const w=front();
 const data=[
  row('CNT-HERO-MAIN','HERO','home','Contoh utama','Isi utama',
   {cta_label:'Daftar',cta_route:'#daftar'}),
  row('CNT-HERO-SECONDARY','HERO_ACTION','home','Masuk Member','',
   {cta_label:'Masuk Member',cta_route:'#masuk'}),
  row('CNT-USECASE-HEADER','SECTION_HEADER','home','Pilih kebutuhan'),
  row('CNT-USECASE-01','USECASE_CARD','home','Kasir HP','Bantu catatan'),
  row('CNT-STARTER-MAIN','FEATURE_CARD','home','Starter Pack','Manfaat nyata'),
  ...[1,2,3,4].map(i=>row('CNT-STARTER-ITEM-0'+i,'FEATURE_ITEM','home',
    'Manfaat nomor '+i,'Penjelasan '+i)),
  row('CNT-NEXT-HEADER','SECTION_HEADER','home','Kebutuhan lanjut'),
  row('CNT-NEXT-01','SERVICE_CARD','home','Jasa tambahan','Bantuan'),
  row('CNT-MEMBER-BENEFIT','BENEFIT_LIST','home','Manfaat',
    '1. Pertama — Isi pertama | 2. Kedua — Isi kedua | 3. Ketiga — Isi ketiga | 4. Keempat — Isi keempat')
 ];
 const html=w.NGD_PUBLIC_CMS.home(data,{});
 for(const t of ['Contoh utama','Masuk Member','Pilih kebutuhan','Kebutuhan lanjut',
    'Manfaat nomor 4','Keempat','Isi keempat'])assert.ok(html.includes(t),t);
 assert.match(html,/data-route="login"/);
 assert.equal((html.match(/Penjelasan \d/g)||[]).length,4);
 assert.doesNotMatch(html,/CNT-MEMBER-BENEFIT/);
});
test('actual STAGING combined rows are rendered safely without inventing missing four member cards',()=>{
 const w=front(),r=[
  row('CNT-AUTH-INTRO','AUTH_COPY','auth','Masuk pakai WA','Kode dikirim WA',
    {cta_label:'Kirim Kode ke WA',cta_route:'#auth'}),
  row('CNT-CHECKOUT-GUIDE','CHECKOUT_COPY','checkout','Panduan bayar',
    '1. Scan QRIS | 2. Transfer tepat | 3. Chat admin',{cta_label:'Kirim Bukti ke WA Admin'}),
  row('CNT-CHECKOUT-WA-TEMPLATE','WA_TEMPLATE','checkout','',
    'Order: {{order_id}} Paket: {{nama_produk}} Tagihan: {{total_bayar}}'),
  row('CNT-MEMBER-WELCOME','MEMBER_GREETING','member_home','Halo, {{nama}}!'),
  row('CNT-PORTAL-DISCLAIMER','DISCLAIMER','member_portal','Resmi','Ketentuan penyedia'),
  row('CNT-AJAK-TEMAN-INFO','NOTICE_BOX','member_affiliate','Ajak Teman','Komisi 1-level')
 ];
 const cms=w.NGD_CMS_SURFACES;
 assert.equal(cms.auth(r).send,'Kirim Kode ke WA');
 const guide=cms.checkoutGuide(r);
 for(const v of ['Scan QRIS','Transfer tepat','Chat admin'])assert.ok(guide.includes(v),v);
 assert.equal((guide.match(/<li>/g)||[]).length,3);
 const msg=cms.paymentMessage(r,{order_id:'NGD-TEST-123',nama_produk:'Paket'},'Rp15.100');
 assert.ok(msg.includes('NGD-TEST-123'));assert.ok(msg.includes('Rp15.100'));
 assert.equal(cms.portalText(r),'Ketentuan penyedia');
 assert.match(cms.affiliateInfo(r),/Komisi 1-level/);
 const member=cms.memberHome(r,{name:'Pengguna',balanceKnown:true,balance:25});
 assert.ok(member.includes('Halo, Pengguna!'));
 assert.equal((member.match(/class="ngdm-shortcut"/g)||[]).length,4);
 assert.equal((member.match(/Sedang memuat informasi\.\.\./g)||[]).length,8);
 const unsafe=cms.checkoutGuide([row('CNT-CHECKOUT-GUIDE','CHECKOUT_COPY','checkout',
   '<script>alert(1)</script>','1. <img src=x onerror=1> | 2. Aman')]);
 assert.ok(!unsafe.includes('<script>')&&!unsafe.includes('<img src=x'));
});

test('member card CTA destinations come from safe published rows, not arbitrary HTML',()=>{
 const w=front();
 const rows=[
  row('CNT-MEMBER-WELCOME','MEMBER_GREETING','member_home','Halo, {{nama}}!'),
  row('CNT-MEMBER-CARD-01','MEMBER_CARD','member_home','Tulis Promosi','Buat tulisan',{cta_route:'#belajar'}),
  row('CNT-MEMBER-CARD-02','MEMBER_CARD','member_home','Portal UMKM','Buka panduan',{cta_route:'portal'}),
  row('CNT-MEMBER-CARD-03','MEMBER_CARD','member_home','Katalog','Lihat barang',{cta_route:'javascript:alert(1)'}),
  row('CNT-MEMBER-CARD-04','MEMBER_CARD','member_home','Ajak Teman','Salin tautan',{cta_route:'affiliate'})
 ];
 const html=w.NGD_CMS_SURFACES.memberHome(rows,{name:'Pelanggan',balanceKnown:true,balance:10});
 assert.ok(html.includes('data-route="belajar"'));
 assert.ok(html.includes('data-route="portal"'));
 assert.ok(html.includes('data-route="katalog"'));
 assert.ok(html.includes('data-route="affiliate"'));
 assert.ok(!html.includes('javascript:alert(1)'));
 assert.equal((html.match(/class="ngdm-shortcut"/g)||[]).length,4);
 const back=read('apps-script/Content.gs');
 assert.match(back,/'portal','portal-belajar'/);
});

test('legacy paid-sounding signup copy is corrected without changing future CMS copy or account gates',()=>{
 const w=front();const input=[
 row('CNT-HERO-MAIN','HERO','home','Hero',"Gunakan tools AI, template siap pakai, dan akses belajar terarah di Ngulik Digital untuk merapikan promosi dan operasional usaha Anda.",{cta_label:'Mulai Tiket Masuk — Rp15.000',cta_route:'#daftar'}),
 row('CNT-HERO-SECONDARY','HERO_ACTION','home','Masuk Member','Sudah terdaftar? Masuk dengan nomor WhatsApp Anda.',{cta_label:'Masuk Member',cta_route:'#masuk'}),
 row('CNT-STARTER-MAIN','FEATURE_CARD','home','Tiket Masuk Awal: Starter Pack Rp15.000',"Langkah pertama masuk ke ekosistem Ngulik Digital dengan fasilitas awal untuk mulai praktik.",{cta_label:'Ambil Tiket Masuk — Rp15.000',cta_route:'#daftar'})];
 const html=w.NGD_PUBLIC_CMS.home(input,{});
 assert.match(html,/data-route="daftar">Daftar Akun Gratis/);
 assert.match(html,/data-route="login">Sudah Punya Akun\? Masuk/);
 assert.match(html,/data-route="katalog">Lihat Starter Pack/);
 assert.match(html,/Starter Pack Rp15.000 dibeli terpisah setelah masuk/);
 assert.doesNotMatch(html,/Mulai Tiket Masuk|Ambil Tiket Masuk/);
 assert.equal(input[0].cta_label,'Mulai Tiket Masuk — Rp15.000');
 assert.match(w.NGD_PUBLIC_CMS.home([{...input[0],cta_label:'CTA Admin Baru'}],{}),/CTA Admin Baru/);
});

test('commission copy separates paid Starter Pack and lifetime direct-customer sales',()=>{
 const w=front();const data=[row('CNT-HERO-MAIN','HERO','home','Hero'),row('CNT-STARTER-MAIN','FEATURE_CARD','home','Starter'),row('CNT-STARTER-ITEM-04','FEATURE_ITEM','home','Ajak Teman',"Komisi Rp5.000 untuk setiap rekan usaha yang bergabung melalui tautan rujukan Anda."),row('CNT-MEMBER-CARD-04','MEMBER_CARD','member_home','Ajak Teman',"Bagikan tautan rujukan Anda dan pantau perolehan komisi Rp5.000 per member aktif."),row('CNT-AJAK-TEMAN-INFO','NOTICE_BOX','member_affiliate','Program Ajak Teman',"Bagikan tautan rujukan pribadi Anda kepada rekan pelaku usaha. Setiap pendaftaran Starter Pack yang terverifikasi lunas menghasilkan komisi Rp5.000, ditambah komisi lanjutan pada transaksi berikutnya.")];
 assert.match(w.NGD_PUBLIC_CMS.home(data,{}),/komisi transaksi berikutnya sesuai tarif produk/);
 assert.match(w.NGD_CMS_SURFACES.memberHome(data,{}),/transaksi lanjutan pelanggan/);
 assert.match(w.NGD_CMS_SURFACES.affiliateInfo(data),/Ajak Teman, Dapatkan Komisi Berulang/);
 assert.match(w.NGD_CMS_SURFACES.affiliateInfo(data),/bukan komisi dari pendaftaran akun gratis/);
 assert.equal(data[2].description,"Komisi Rp5.000 untuk setiap rekan usaha yang bergabung melalui tautan rujukan Anda.");
});

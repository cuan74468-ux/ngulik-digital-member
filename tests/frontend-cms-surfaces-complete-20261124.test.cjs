'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const window={};
vm.runInNewContext(read('js/cms-surfaces.js'),{window},{timeout:3000});
const cms=window.NGD_CMS_SURFACES;
const row=(id,kind,placement,title='',description='',cta_label='')=>({
 content_id:id,kind,placement,title,description,cta_label,status:'PUBLISHED'
});
test('auth labels, heading and WhatsApp actions come from CMS, no sales fallback',()=>{
 const items=[
  row('CNT-AUTH-INTRO','AUTH_COPY','auth','Masuk Pakai Nomor WhatsApp','Nggak perlu hafal password. Kami kirim kode 6 angka ke WhatsApp-mu.'),
  row('CNT-AUTH-FIELD-01','AUTH_FIELD','auth','Nomor WhatsApp Aktif (contoh: 0812xxxx)'),
  row('CNT-AUTH-FIELD-02','AUTH_FIELD','auth','Nama Kamu / Nama Usaha'),
  row('CNT-AUTH-FIELD-03','AUTH_FIELD','auth','Kode Ajak Teman (kalau ada)'),
  row('CNT-AUTH-OTP-BUTTON','CTA_BUTTON','auth','','','Kirim Kode ke WA'),
  row('CNT-AUTH-LOGIN-BUTTON','CTA_BUTTON','auth','','','Masuk Sekarang')
 ];
 const a=cms.auth(items);
 assert.equal(a.title,'Masuk Pakai Nomor WhatsApp');
 assert.equal(a.label(3),'Kode Ajak Teman (kalau ada)');
 assert.equal(a.send,'Kirim Kode ke WA');
 assert.equal(a.submit,'Masuk Sekarang');
 assert.equal(cms.auth([]).title,'Sedang memuat informasi...');
});
test('member welcome and four cards substitute only the member-specific placeholders',()=>{
 const rows=[row('CNT-MEMBER-WELCOME','MEMBER_COPY','member_home',
  'Halo, {{nama}}! Mau kerjakan apa hari ini?')];
 for(let i=1;i<=4;i++)rows.push(row('CNT-MEMBER-CARD-'+String(i).padStart(2,'0'),
 'MEMBER_CARD','member_home',['Buat Kata Promosi (Studio AI)',
  'Ambil Template & 39 Panduan Resmi','Tambah Alat Usaha (Katalog)',
  'Ajak Teman & Cek Komisi'][i-1],i===1?'Sisa saldo: {{saldo_kredit}} kredit.':'Buka sekarang'));
 const html=cms.memberHome(rows,{name:'Ferry <img src=x onerror=1>',balanceKnown:true,balance:25});
 assert.ok(html.includes('Halo, Ferry &lt;img src=x onerror=1&gt;!'));
 assert.ok(html.includes('Sisa saldo: 25 kredit.'));
 assert.equal((html.match(/class="ngdm-shortcut"/g)||[]).length,4);
 for(const dest of ['ai','portal','katalog','affiliate'])assert.ok(html.includes('data-route="'+dest+'"'));
 assert.ok(!html.includes('<img src=x onerror=1>'));
});
test('portal legal disclaimer and affiliate 1-level copy are content owned',()=>{
 const items=[
  row('CNT-PORTAL-DISCLAIMER','PORTAL_NOTICE','member_portal','',
    'Seluruh program kelas online gratis, pelatihan, dan portal layanan publik di bawah ini merupakan fasilitas resmi milik masing-masing penyedia layanan.'),
  row('CNT-AJAK-TEMAN-INFO','AFFILIATE_INFO','member_affiliate',
    'Ajak Teman Ngulik, Dapat Penghasilan Tambahan',
    'Ini bagi hasil 1-level murni dari transaksi nyata, bukan MLM berjenjang.')
 ];
 assert.ok(cms.portalText(items).includes('fasilitas resmi milik masing-masing penyedia'));
 const a=cms.affiliateInfo(items);
 assert.ok(a.includes('Ajak Teman Ngulik'));
 assert.ok(a.includes('1-level'));
 assert.equal(cms.portalText([]),'Sedang memuat informasi...');
 assert.ok(cms.affiliateInfo([]).includes('Sedang memuat informasi...'));
});
test('QRIS guide comes from CMS and WhatsApp template must have required dynamic slots',()=>{
 const items=[
  row('CNT-CHECKOUT-GUIDE','CHECKOUT_GUIDE','checkout',
    'Tinggal Scan QRIS, Lalu Konfirmasi ke WA Admin','','Kirim Bukti ke WA Admin'),
  ...Array.from({length:3},(_,i)=>row('CNT-CHECKOUT-STEP-'+String(i+1).padStart(2,'0'),
    'CHECKOUT_STEP','checkout','Langkah '+String(i+1))),
  row('CNT-CHECKOUT-WA-TEMPLATE','WA_TEMPLATE','checkout','',
    'Halo Admin Ngulik Digital, saya sudah transfer untuk pesanan: {{order_id}} / {{nama_produk}} / {{total_bayar}}')
 ];
 const guide=cms.checkoutGuide(items);
 assert.ok(guide.includes('Tinggal Scan QRIS'));
 assert.equal((guide.match(/<li>/g)||[]).length,3);
 assert.equal(cms.checkoutButton(items),'Kirim Bukti ke WA Admin');
 const message=cms.paymentMessage(items,{order_id:'NGD-TEST-123',nama_produk:'Paket'},'Rp15.100');
 assert.ok(message.includes('NGD-TEST-123'));
 assert.ok(message.includes('Rp15.100'));
 assert.equal(cms.paymentMessage([],{order_id:'x'},'Rp1'),'');
 items.at(-1).description='Not a template';
 assert.equal(cms.paymentMessage(items,{order_id:'x'},'Rp1'),'');
});
test('real frontend and backend link all page sections without hardcoded marketing default',()=>{
 const app=read('js/app.js'),lms=read('js/lms-ui.js'),gateway=read('apps-script/Code.gs');
 const content=read('apps-script/Content.gs');
 for(const v of [
  'NGD_CMS_SURFACES?.memberHome(state.siteContent',
  'NGD_CMS_SURFACES?.affiliateInfo(state.siteContent)',
  'NGD_CMS_SURFACES?.portalText(state.siteContent)',
  'NGD_CMS_SURFACES?.checkoutGuide(state.siteContent)',
  'NGD_CMS_SURFACES?.paymentMessage(state.siteContent',
  'NGD_CMS_SURFACES?.auth(state.siteContent)',
  "case 'adminListLegacyCms':return ngdLegacyCmsList_(p)",
  "case 'adminSaveLegacyCms':return ngdLegacyCmsSave_(admin,p,requestId)"
 ])assert.ok(app.includes(v)||gateway.includes(v),v);
 assert.ok(lms.includes('editorialDisclaimer'));
 assert.ok(content.includes("'WA_TEMPLATE'"));
 assert.ok(!app.includes('Halo Admin Ngulik Digital, saya ingin mengirim bukti pembayaran QRIS.'));
 for(const file of ['index.html','staging/member.html']){
  const html=read(file);
  assert.ok(html.includes('cms-surfaces.js'));
  assert.ok(html.includes('admin-legacy-cms.js'));
 }
});

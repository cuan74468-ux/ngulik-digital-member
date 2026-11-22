'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function renderModules(modules){
  const window={};
  vm.runInNewContext(read('js/lms-ui.js'),{window,URL},{timeout:3000});
  return window.NGD_LMS_UI.memberPortal(modules);
}
test('all 39 STAGING portal entries render in four distinct groups without checkout',()=>{
  const modules=[
    ...Array.from({length:6},(_,i)=>({modul_id:'MOD-'+String(i+1).padStart(2,'0'),judul:'Modul internal '+i,deskripsi:'Belajar',url_classroom:'https://classroom.google.com/c/x'})),
    ...[1,2,3].flatMap((kind)=>Array.from({length:kind===3?13:10},(_,i)=>({
      modul_id:'KUR-A'+kind+'-'+String(i+1).padStart(2,'0'),
      judul:'['+({1:'AI & Digital Marketing',2:'Bisnis & Keuangan UMKM',3:'Fasilitas Resmi UMKM'})[kind]+'] Contoh '+i,
      deskripsi:'Portal penyedia',
      url_classroom:kind===3?'https://oss.go.id/id':'https://learn.microsoft.com/id-id/training/'
    })))
  ];
  assert.equal(modules.length,39);
  const html=renderModules(modules);
  for(const heading of ['Portal Belajar & Fasilitas UMKM','Materi Internal Ngulik Digital',
    'AI &amp; Digital Marketing','Bisnis &amp; Keuangan UMKM','Fasilitas Resmi UMKM','39 materi dan tautan kurasi']){
    assert.ok(html.includes(heading),heading);
  }
  assert.equal((html.match(/class="learning-legacy-row"/g)||[]).length,39);
  assert.equal((html.match(/Buka Situs Resmi ↗/g)||[]).length,39);
  assert.match(html,/Ngulik Digital hanya berperan sebagai kurator/);
  assert.match(html,/Seluruh syarat, jadwal, kuota, dan ketentuan sertifikat/);
  assert.doesNotMatch(html,/data-checkout-product|data-checkout-create|data-partner-out/);
});
test('Portal allows external HTTPS providers but rejects unsafe links and escapes text',()=>{
  const html=renderModules([
    {modul_id:'KUR-A3-01',judul:'[Fasilitas Resmi UMKM] OSS',deskripsi:'<img src=x onerror=1>',url_classroom:'https://oss.go.id/id'},
    {modul_id:'KUR-A3-02',judul:'Jangan klik',deskripsi:'X',url_classroom:'javascript:alert(1)'}
  ]);
  assert.match(html,/href="https:\/\/oss\.go\.id\/id"/);
  assert.doesNotMatch(html,/<img src=x|href="javascript:/);
  assert.match(html,/&lt;img src=x/);
  assert.match(html,/Tautan tidak tersedia/);
});
test('public navigation and partner shelf separate member facilities',()=>{
  const app=read('js/app.js');
  assert.match(app,/const guestNav=\['beranda','katalog','jasa','dukungan'\]/);
  assert.match(app,/guestPrivateRoutes_=new Set\(\['ai'/);
  assert.match(app,/data-checkout-product="P-STARTER-15K"/);
  assert.match(app,/WARUNG TOOLS AI & BENGKEL KREATIF/);
  assert.match(app,/partnerAffiliateUrl_\(x\)/);
  assert.match(app,/api\('trackOutbound'/);
  const begin=app.indexOf('const partnerAffiliateUrl_=');
  const end=app.indexOf('function partnerVisitorId_()',begin);
  const urlSafe=raw=>{try{const u=new URL(raw);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const eligible=new Function('urlSafe',app.slice(begin,end)+'\nreturn partnerAffiliateUrl_;')(urlSafe);
  assert.equal(eligible({link_affiliate:'https://fonnte.com/'}),'');
  assert.equal(eligible({link_affiliate:'https://shopee.co.id/search?keyword=printer'}),'');
  assert.match(eligible({link_affiliate:'https://member.pusatecourse.com/aff/1740/1424/'}),/\/aff\/1740\/1424\//);
});

test('member learning catalog separates internal LMS courses from the free provider portal',()=>{
  const window={};
  vm.runInNewContext(read('js/lms-ui.js'),{window,URL},{timeout:3000});
  const courses=window.NGD_LMS_UI.memberCatalog([],[],[{modul_id:'KUR-A3-01',judul:'[Fasilitas Resmi UMKM] OSS',url_classroom:'https://oss.go.id/id'}]);
  assert.match(courses,/Kelas Belum Tersedia/);
  assert.match(courses,/Buka Portal Gratis/);
  assert.doesNotMatch(courses,/href="https:\/\/oss\.go\.id/);
  const app=read('js/app.js');
  assert.match(app,/portal:\['Portal Gratis','book'\]/);
  assert.match(app,/function viewPortalGratis_\(\)/);
  assert.match(app,/route==='belajar'\|\|route==='portal'/);
  assert.match(app,/guestPrivateRoutes_=new Set\(\['ai','ai-tool','belajar','portal'/);
  assert.match(app,/function filterMemberPortal_\(\)/);
  assert.match(app,/if\(e\.target\.id==='learning-portal-search'\)filterMemberPortal_\(\)/);
});

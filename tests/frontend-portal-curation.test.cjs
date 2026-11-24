'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function renderModules(modules){
  const window={};
  vm.runInNewContext(read('js/lms-ui.js'),{window,URL},{timeout:3000});
  return window.NGD_LMS_UI.memberPortal(modules,'Ngulik Digital hanya berperan sebagai kurator. Seluruh syarat, jadwal, kuota, dan ketentuan sertifikat mengikuti kebijakan penyedia layanan terkait.');
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
  assert.match(app,/NGD_CMS_SURFACES\?\.affiliateInfo\(state\.siteContent\)/);
  assert.doesNotMatch(app,/WARUNG TOOLS AI & BENGKEL KREATIF/);
  assert.match(app,/NGD_PUBLIC_CMS/);
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
  assert.match(courses,/Belum ada kelas yang diterbitkan/);
  assert.match(courses,/Buka Portal Gratis/);
  assert.doesNotMatch(courses,/href="https:\/\/oss\.go\.id/);
  const app=read('js/app.js');
  assert.match(app,/portal:\['Portal Gratis','book'\]/);
  assert.match(app,/function viewPortalGratis_\(\)/);
  assert.match(app,/route==='belajar'\|\|route==='portal'/);
  assert.match(app,/guestPrivateRoutes_=new Set\(\['ai','ai-tool','belajar','portal'/);
  assert.match(app,/function filterMemberPortal_\(\)/);
  assert.match(app,/e\.target\.id==='portal-category'/);
  assert.match(app,/if\(e\.target\.id==='learning-portal-search'\)filterMemberPortal_\(\)/);
});

test('external curated links reject credentials, non-HTTPS and local network destinations',()=>{
  const invalid=[
    'javascript:alert(1)','data:text/html,hello','http://oss.go.id/',
    'https://user:secret@oss.go.id/', 'https://localhost/example',
    'https://app.local/path','https://127.0.0.1/', 'https://[::1]/',
    'https://oss.go.id:8443/path', 'https://example.invalid/'.padEnd(2050,'a')
  ];
  const rows=invalid.map((url,i)=>({
    modul_id:'KUR-A3-'+String(i+1).padStart(2,'0'),
    judul:'Uji tautan '+i,url_classroom:url
  }));
  const html=renderModules(rows);
  assert.equal((html.match(/Tautan tidak tersedia/g)||[]).length,rows.length);
  assert.doesNotMatch(html,/href="(?:javascript:|data:|http:|https:\/\/user:)/i);
  const ok=renderModules([{modul_id:'KUR-A3-90',judul:'Portal pemerintah',url_classroom:'https://oss.go.id/id'}]);
  assert.match(ok,/href="https:\/\/oss\.go\.id\/id"/);
});
test('outbound affiliate URL validator uses HTTPS DNS and never accepts local targets',()=>{
  const app=read('js/app.js');
  const begin=app.indexOf('const urlSafe =');
  const end=app.indexOf('function partnerVisitorId_()',begin);
  assert.ok(begin>=0&&end>begin);
  const safe=new Function(app.slice(begin,end)+'\nreturn {urlSafe,partnerAffiliateUrl_};')();
  assert.equal(safe.urlSafe('https://partner.example.com/ref?id=123'),'https://partner.example.com/ref?id=123');
  for(const url of ['javascript:alert(1)','http://partner.example.com/',
    'https://user:secret@partner.example.com/', 'https://127.0.0.1/',
    'https://service.local/path','https://partner.example.com:8443/path'])
    assert.equal(safe.urlSafe(url),'',url);
  assert.equal(safe.partnerAffiliateUrl_({link_affiliate:'https://service.local/?ref=ABC123'}),'');
});
test('public and staging pages enforce safe cross-origin referrer defaults',()=>{
  for(const page of ['index.html','staging/member.html']){
    const html=read(page);
    assert.match(html,/<meta name="referrer" content="strict-origin-when-cross-origin">/);
    assert.match(html,/content="default-src 'self'; script-src 'self';/);
  }
});

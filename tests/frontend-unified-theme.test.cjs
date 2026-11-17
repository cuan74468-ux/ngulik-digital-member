'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),css=read('assets/styles.css'),app=read('js/app.js');
test('Linggau V1.2 stylesheet is the final layer on public and STAGING membership',()=>{
  for(const file of ['index.html','staging/member.html']){
    const src=read(file);
    assert.ok(src.indexOf('learning-studio.css')>=0);
    assert.ok(src.indexOf('styles.css')>src.indexOf('learning-studio.css'));
    assert.match(src,/family=Inter/);
    assert.match(src,/assets\/styles\.css/);
    assert.match(src,/assets\/experience\.css/);
    assert.match(src,/img-src 'self' data: https:;/);
  }
  assert.match(html,/name="theme-color" content="#faf8f3"/);
});
test('palette and typography match the Linggau master exactly',()=>{
  for(const token of ['--lds-bg:#FAFAFC','--lds-surface:#FFFFFF',
    '--lds-text:#15161C','--lds-muted:#4A4D5A','--lds-blue:#2F6BFF',
    '--lds-success:#1DB86A','--lds-danger:#E11D48',
    "--lds-font-ui:'Geist'","--lds-font-heading:'Plus Jakarta Sans'",
    "--lds-font-editorial:'Instrument Serif'"])
    assert.ok(css.includes(token),token);
  assert.ok(css.includes("font-variant-numeric:tabular-nums"));
  assert.ok(css.includes("focus-visible"));
});
test('guest has no sidebar or mobile dock; logged members have four destinations',()=>{
  assert.match(html,/data-app-role="guest"/);
  assert.match(css,/data-app-role=guest\]:not\(#ngd\) \.sidebar\{display:none!important\}/);
  assert.match(css,/data-app-role=guest\]:not\(#ngd\) \.mobile-nav\{display:none!important\}/);
  assert.match(html,/id="guest-nav"/);
  assert.match(html,/Katalog Alat/);
  assert.match(html,/Masuk \/ Daftar WA/);
  assert.match(app,/\['beranda','ai','katalog','affiliate'\]/);
  assert.match(html,/data-route="menu"/);
  assert.doesNotMatch(html,/Bertumbuh dimulai|Belajar • Berkarya • Bertumbuh|Ruang belajar/i);
});
test('full commercial routes and API modules are preserved',()=>{
  const config=read('config.js'),code=read('js/api.js');
  for(const flag of ['memberWritesEnabled: true','paymentsEnabled: true',
    'supportEnabled: true','lmsEnabled: true','notificationsEnabled: true'])
    assert.ok(config.includes(flag),flag);
  for(const route of ["admin:['Admin'","lms:['Studio LMS'",
    "beranda:['Meja Kerja'","belajar:['Kelas'","katalog:['Toko & Lisensi'",
    "ai:['Studio AI'"]){assert.ok(app.includes(route),route);}
  for(const action of ['getKatalog','generateAI','createOrder','confirmPayment',
    'adminCreateContent','adminUpdateContent','adminListCatalog'])
    assert.ok(app.includes(action),action);
  assert.match(code,/headers:\s*\{\s*'Content-Type':\s*'text\/plain;charset=utf-8'\s*\}/);
});
test('financial interfaces are static and reduced motion is honored',()=>{
  assert.match(css,/\.checkout-dialog :is\(\.btn,button\)/);
  assert.match(css,/transition:none!important;transform:none!important;animation:none!important/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/max-width:760px/);
  assert.ok(css.includes('min-height:44px'));
  assert.doesNotMatch(css,/@import|<script|UrlFetchApp|SOBATAGENT_API_KEY|FONNTE_API_TOKEN/i);
});

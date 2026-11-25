'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('assets/ngulik-design-system.css'),studio=read('assets/ai-studio.css'),app=read('js/app.js');
const allRoutes=['beranda','belajar','portal','menu','lms','lms-editor','lms-lesson','lms-course','lms-ai','lms-complete','katalog','detail-produk','ai','ai-tool','affiliate','akun','produk','jasa','layanan','admin','konten','pesanan','member','antrean','dukungan','tiket','member360','rilis','pengaturan','login','admin-login','daftar','checkout'];
test('all 33 existing screen routes remain defined and design system uses same shell',()=>{
  const declaration=app.slice(app.indexOf('const screens='),app.indexOf('const guestNav='));
  for(const route of allRoutes)assert.ok(declaration.includes(route+':')||declaration.includes("['"+route+"']:"),'missing route '+route);
  assert.match(app,/renderNav\(\)/);
  assert.match(app,/by\('screen'\)\.innerHTML=screen/);
  assert.match(app,/window\.NGD_STUDIO\?\.mount/);
});
test('both existing entrypoints enable master design system last and keep routing',()=>{
  for(const file of ['index.html','staging/member.html']){
    const html=read(file);
    assert.match(html,/<body class="[^"]*ngd-public-app/);
    const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
    assert.ok(links.at(-1).includes('ngulik-design-system.css'),file+' main theme not last');
    assert.ok(links.some(x=>x.includes('ai-studio.css')));
    assert.match(html,/js\/ai-studio\.js/);
    assert.match(html,/js\/app\.js/);
  }
});
test('Doc 06 tokens shared with Studio, 2px borders and crisp shadows',()=>{
  const tokens=['#FAF9F5','#ECEAE3','#FFFFFF','#111827','#4338CA','#C8F135'];
  for(const token of tokens){assert.ok(css.includes(token),'master missing '+token);assert.ok(studio.includes(token),'Studio missing '+token)}
  assert.match(css,/--ngds-line:2px solid #111827/);
  assert.match(css,/--ngds-shadow:4px 4px 0 #111827/);
  assert.match(css,/body\.ngd-public-app/);
  assert.match(css,/\.ngdm-wallet/);
  assert.match(css,/\.ai-product-card/);
  assert.match(css,/\.lms-course-card/);
  assert.match(css,/\.commission-card/);
  assert.match(css,/\.admin-card/);
  assert.match(css,/\.checkout-card/);
  assert.match(css,/\.topbar/);
  assert.match(css,/\.sidebar/);
  assert.match(css,/\.footer/);
});
test('master design system is CSS-only and does not hijack Studio, security, payments or auth',()=>{
  assert.doesNotMatch(css,/\bfetch\s*\(|localStorage|NGD_FINANCE_ENABLED|NGD_MUTATIONS_ENABLED/);
  assert.doesNotMatch(css,/(?:html\s*\{|^\s*body\s*\{)/m);
  assert.ok(css.includes(':not(.ngd-studio *)'),'Studio scope exclusion missing');
  assert.doesNotMatch(css,/\p{Extended_Pictographic}/u);
});

test('pro composition shares tokens for checkout, login, product detail and studio without changing payment states',()=>{
 const checkout=read('assets/checkout-qris-unified.css'),auth=read('assets/brand-experience-v10.css'),detail=read('assets/product-detail-v1.css');
 assert.match(checkout,/\.checkout-total\{[^}]*background:var\(--ngds-tint\)/s);
 assert.match(checkout,/\.btn-primary:disabled\{[^}]*cursor:not-allowed/s);
 assert.match(auth,/\.ngd-auth-brand\{[^}]*background:var\(--ngds-tint\)/s);
 assert.match(detail,/\.ngdp-pitch\{[^}]*box-shadow:var\(--ngds-shadow\)/s);
 assert.match(studio,/\.ns-block\{[^}]*background:var\(--ns-white\)/s);
});

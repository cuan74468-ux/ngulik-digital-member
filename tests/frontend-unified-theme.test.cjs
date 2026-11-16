'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const css=read('assets/unified-theme.css');
const app=read('js/app.js');
test('one shared stylesheet is loaded last for guests members and admins',()=>{
  const main=html.indexOf('href="./assets/app.css"');
  const mobile=html.indexOf('href="./assets/member-mobile.css');
  const unified=html.indexOf('href="./assets/unified-theme.css');
  assert.ok(main>=0&&mobile>main&&unified>mobile);
  assert.match(html,/name="theme-color" content="#f2f4f8"/);
  assert.ok(css.includes(':root,\nbody,\nbody.member-experience{'));
  assert.ok(css.includes('@media(max-width:760px)'));
});
test('desktop and mobile share identical slate canvas and charcoal control tokens',()=>{
  for(const token of ['--bg:#f2f4f8','--ink:#0e1320','--green:#0e1320',
    '--brand-blue:#4361ee','--radius:24px']){
    assert.ok(css.includes(token),token);
  }
  assert.match(css,/\.sidebar \.nav-item\[aria-current=page\]\{\s*background:#0e1320/);
  assert.match(css,/\.mobile-nav \.nav-item\[aria-current=page\][\s\S]*?background:#0e1320/);
  assert.ok(css.includes('body.member-experience .surface'));
  assert.ok(css.includes('body.member-experience .mobile-nav'));
});
test('mobile uses accessible floating five-icon navigation rather than a full-width dock',()=>{
  assert.match(css,/left:50%;right:auto;bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/width:min\(350px,calc\(100vw - 56px\)\)/);
  assert.ok(css.includes('clip:rect(0,0,0,0)'));
  assert.ok(app.includes("aria-label=\"'+esc(screens[route][0])+'\""));
  assert.ok(app.includes('aria-current="page"'));
});
test('all business screens and financial flags remain untouched by the skin',()=>{
  const config=read('config.js');
  for(const flag of ['memberWritesEnabled: true','paymentsEnabled: true','supportEnabled: true',
     'lmsEnabled: true','notificationsEnabled: true',"apiUrl: 'https://script.google.com/macros/s/"])assert.ok(config.includes(flag));
  for(const route of ["admin:['Admin'","lms:['Studio LMS'","beranda:['Beranda'",
    "belajar:['Belajar'","katalog:['Katalog'","ai:['Studio AI'"]){
    assert.ok(app.includes(route),route);
  }
  assert.doesNotMatch(css,/@import\s|url\(\s*['"]?https?:/i);
});
test('color is not selected by role or desktop-only breakpoints',()=>{
  assert.ok(css.includes('body,'));
  assert.ok(css.includes('body.member-experience'));
  assert.ok(css.includes('.support-ticket'));
  assert.ok(css.includes('.lms-course-tile'));
  assert.ok(css.includes('.login-shell'));
  assert.ok(css.includes('.modal'));
  assert.ok(css.includes('.table-wrap'));
  assert.ok(css.includes('.member-success'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('operational admin uses one mobile and desktop design system',()=>{
  for(const selector of ['.admin-commandbar','.admin-module-card','.admin-runtime-summary',
    '.admin-runtime-flags','.admin-runtime-flag']){
    assert.ok(css.includes(selector),selector);
  }
  assert.ok(css.includes('body[data-app-role="admin"]'));
  assert.ok(app.includes("data-app-role',isAdmin()?'admin'"));
  assert.ok(app.includes('viewAdminRuntime()'));
});

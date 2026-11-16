'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const publicHTML=read('index.html');
const opsHTML=read('staging/index.html');
const css=read('assets/experience.css');

test('public and operations HTML load the same mobile-first stylesheet after legacy CSS',()=>{
  assert.match(publicHTML,/<body class="ngd-public-app">/);
  assert.match(opsHTML,/<body class="ngd-ops-app">/);
  assert.match(publicHTML,/href="\.\/assets\/experience\.css\?v=20261116-v2"/);
  assert.match(opsHTML,/href="\.\.\/assets\/experience\.css\?v=20261116-v2"/);
  assert.ok(publicHTML.indexOf('unified-theme.css')<publicHTML.indexOf('experience.css'));
  assert.ok(opsHTML.indexOf('admin.css')<opsHTML.indexOf('experience.css'));
});
test('semantic colors fonts radius and mobile spacing are shared',()=>{
  for(const token of ['--ngd-canvas:#f2f4f8','--ngd-ink:#0e1320',
    '--ngd-blue:#4361ee','--ngd-font-ui:', '--ngd-font-heading:',
    '--ngd-touch:48px','--ngd-radius-md:16px','--ngd-gutter:20px']){
    assert.ok(css.includes(token),token);
  }
  assert.ok(css.includes('body.ngd-public-app'));
  assert.ok(css.includes('body.ngd-ops-app'));
  assert.match(css,/body\.ngd-ops-app\s*\{[\s\S]*?--accent:var\(--ngd-blue\)/);
  assert.match(css,/body\.ngd-public-app\s*\{[\s\S]*?--brand-blue:var\(--ngd-blue\)/);
});
test('presentation-only change cannot bypass server release flags',()=>{
  assert.doesNotMatch(css,/@import|@font-face|url\(\s*['"]?https?:|<script|UrlFetchApp|apiUrl|FONNTE_API_TOKEN/i);
  const publicConfig=read('config.js');
  for(const flag of ['memberWritesEnabled: false','registrationOtpEnabled: false',
    'paymentsEnabled: false','lmsEnabled: false']){
    assert.ok(publicConfig.includes(flag),flag);
  }
  assert.match(opsHTML,/name="robots" content="noindex,nofollow/);
  assert.doesNotMatch(opsHTML,/AKfycbyQlhsRDfo/);
});
test('all major screen families share mobile responsive behavior and focus styles',()=>{
  for(const selector of ['.catalog-card','.lms-course-tile','.member-welcome','.mobile-nav',
    '.modal','.nh-carousel','.content-admin-heading','.auth-panel','.access-layout',
    '.data-panel','.table-wrap','.nav-link']){
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/body\.ngd-public-app\s+:where\(button,a,input,select,textarea\):focus-visible/);
  assert.match(css,/body\.ngd-ops-app\s+:where\(button,a,input,select,textarea\):focus-visible/);
  for(const bp of ['@media(max-width:760px)','@media(max-width:420px)',
    '@media(min-width:761px)','prefers-reduced-motion:reduce'])assert.ok(css.includes(bp),bp);
});

test('mobile retains essential help text and exposes all routes',()=>{
 const unified=read('assets/unified-theme.css');
 assert.doesNotMatch(unified,/\.section-head p\{display:none\}/);
 assert.doesNotMatch(unified,/\.catalog-result-count\{display:none\}/);
 assert.doesNotMatch(unified,/:is\(\.eyebrow,\.card-kicker,p\)\{display:none\}/);
 const app=read('js/app.js');
 assert.match(app,/menu:\['Menu','grid'\]/);
 assert.ok(app.includes('function viewMore()'));
 assert.ok(app.includes('menu:viewMore'));
 assert.ok(css.includes('.ngd-menu-grid'));
 assert.ok(css.includes('.ngd-menu-tile'));
 assert.ok(css.includes('body.ngd-ops-app .nav.is-locked{display:none}'));
 assert.ok(css.includes('body.ngd-ops-app .access-aside{display:none}'));
});

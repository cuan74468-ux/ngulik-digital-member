'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'assets/ngulik-design-system.css'),'utf8');
test('brand and navigation use actual DOM selectors rather than generic non-matching nav classes',()=>{
 for(const selector of ['.topbar .guest-brand-icon','.topbar .guest-brand strong','.topbar .guest-brand small','.topbar #guest-nav button','.topbar #guest-nav button[aria-current="page"]','#top-nav-drawer','#member-mobile-nav','#mobile-nav']){
  assert.ok(css.includes(selector),'missing canonical actual element: '+selector);
 }
 assert.match(css,/--ngds-header:#141418/);
 assert.match(css,/--ngds-select:#CCF349/);
});
test('master CSS V3 identity remains present with current cache version in both entrypoints',()=>{
 for(const file of ['index.html','staging/member.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/ngulik-design-system\.css\?v=20261123-(?:identity-v3|framed-v4)/);
  assert.match(html,/class="guest-brand"/);
  assert.match(html,/id="guest-nav"/);
  assert.match(html,/id="top-nav-trigger"/);
 }
});
test('all old role shells keep the exact Studio design tokens and role-specific status controls',()=>{
 for(const val of ['#F6F5F0','#ECEAE3','#FFFFFF','#141418','#5B3DF5','#CCF349'])assert.ok(css.includes(val));
 assert.match(css,/\.ngdm-wallet\{/);
 assert.match(css,/\.ngdl-hero\{/);
 assert.doesNotMatch(css,/\bfetch\s*\(|\bXMLHttpRequest\b/);
});

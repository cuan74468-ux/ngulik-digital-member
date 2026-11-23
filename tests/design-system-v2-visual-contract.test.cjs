'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'assets/ngulik-design-system.css'),'utf8');
const studio=fs.readFileSync(path.join(root,'assets/ai-studio.css'),'utf8');
const htmls=['index.html','staging/member.html'].map(p=>fs.readFileSync(path.join(root,p),'utf8'));
test('vivid Neubrutalism v2 targets guest member catalog learning affiliate support and admin',()=>{
 for(const name of ['ngdl-hero','ngdl-story','ngdl-offer','ngdl-benefits','ngdm-wallet','ngdm-wallet-chart','ngdm-metric','ngdm-shortcut','ngdm-orders','ai-catalog-intro','market-product-card','partner-hero','partner-metric','learning-intro','learning-portal-hero','lms-course-tile','ngd-help-hero','admin-operations-intro','checkout-summary']){
  assert.ok(css.includes('.'+name),'component missing '+name);
 }
 assert.match(css,/\.ngdm-wallet\{[^}]*background:var\(--ngds-violet\)!important/s);
 assert.match(css,/\.ngdm-wallet-chart\{[^}]*background:var\(--ngds-lime\)!important/s);
 assert.match(css,/\.ngdm-metric:first-child\{[^}]*background:var\(--ngds-lime\)!important/s);
 assert.match(css,/\.ngdm-metric:last-child\{[^}]*background:var\(--ngds-ink\)!important/s);
 assert.match(css,/\.ngdl-hero\{[^}]*background:#5B3DF5!important/s);
});
test('new design system is single last-loaded css and does not change Studio',()=>{
 for(const html of htmls){
  const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.at(-1).includes('ngulik-design-system.css'),'master CSS must be last');
 }
 assert.ok(studio.startsWith('/* P1 Ngulik Studio'));
 assert.doesNotMatch(css,/\bfetch\s*\(|\bXMLHttpRequest\b|NGD_FINANCE_ENABLED\s*=|NGD_MUTATIONS_ENABLED\s*=/);
});
test('mobile breakpoints keep route content bounded and readable',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/\.ngdm-metrics\{\s*grid-template-columns:1fr!important/s);
 assert.match(css,/\.ngdl-trust\{\s*grid-template-columns:1fr!important/s);
});

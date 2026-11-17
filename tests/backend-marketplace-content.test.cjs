'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps-script/Content.gs'),'utf8');
test('Apps Script CMS accepts isolated catalog HERO placement and retains strict other types',()=>{
  const ctx={require_:(ok,code,message)=>{if(!ok)throw new Error(code+': '+message);}};
  vm.runInNewContext(source,ctx,{filename:'Content.gs'});
  assert.equal(ctx.contentPlacement_('HERO','home'),'home');
  assert.equal(ctx.contentPlacement_('HERO','catalog'),'catalog');
  assert.equal(ctx.contentPlacement_('HERO','member_home'),'member_home');
  assert.throws(()=>ctx.contentPlacement_('HERO','random-page'),/VALIDATION/);
  assert.throws(()=>ctx.contentPlacement_('BRAND_LOGO','catalog'),/VALIDATION/);
  assert.throws(()=>ctx.contentPlacement_('PRODUCT_IMAGE','catalog'),/VALIDATION/);
});
test('public banner reads remain publication and scheduling gated',()=>{
  assert.match(source,/row\.status==='PUBLISHED'/);
  assert.match(source,/row\.start_date/);
  assert.match(source,/row\.end_date/);
});

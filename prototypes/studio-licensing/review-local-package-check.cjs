'use strict';
const test=require('node:test'),a=require('node:assert/strict'),parse=require('acorn').parse;
const {summarize,inventory}=require('./review-local-package.cjs');
test('format differences are equivalent; literal and reordered nodes are not',()=>{
 a.equal(summarize('function a(){return 1}', '// comment\nfunction a() { return 1; }',parse).ast_order_equal,true);
 a.deepEqual(summarize('function a(){return 1}','function a(){return 2}',parse).added_or_changed,['a']);
 const r=summarize('function a(){} function b(){}','function b(){} function a(){}',parse);a.equal(r.ast_order_equal,false);a.equal(r.ast_multiset_equal,true);
});
test('effect inventory contains only allowlisted names and identifies immediate call sites',()=>{
 a.deepEqual(inventory('x.setProperty("PRIVATE","VALUE"); function f(){ UrlFetchApp.fetch("PRIVATE_URL"); }',parse),{effect_names:['fetch','setProperty'],top_level_effect_names:['setProperty']});
});

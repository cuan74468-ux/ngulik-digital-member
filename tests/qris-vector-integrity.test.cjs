'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.join(__dirname,'..');
const text=p=>fs.readFileSync(path.join(base,p),'utf8');
const svg=text('assets/qris-linggau-ai-studio.svg');
const pub=text('config.js'),stage=text('staging/member-config.js');
test('official owner QRIS payload is represented by the verified immutable vector modules',()=>{
  const match=svg.match(/<path fill="#000" d="([^"]+)"/);
  assert.ok(match,'QR matrix is absent');
  const pathData=match[1];
  assert.equal((pathData.match(/M\d+ \d+h1v1h-1z/g)||[]).length,1381);
  assert.equal(crypto.createHash('sha256').update(pathData).digest('hex'),
    'ba24f2b9b595d9b3291e886fe9cf0da91d5efa8faaef67be17d93cd02ccb900c');
  assert.match(svg,/QRIS DANA Bisnis/);
  assert.match(svg,/Linggau AI Studio/);
  assert.match(svg,/ID1026643785599/);
  assert.doesNotMatch(svg,/<script|<foreignObject|href=|onload=|onerror=/i);
});
test('public and staging reference the vector asset while merchant approval remains closed',()=>{
  for(const cfg of [pub,stage]){
    assert.match(cfg,/qris-linggau-ai-studio\.svg/);
    assert.match(cfg,/qrisOwnerImageApproved:\s*false/);
  }
  assert.match(pub,/paymentsEnabled:\s*false/);
  assert.match(stage,/paymentsEnabled:\s*true/); // Browser is pre-armed; QRIS remains unapproved and backend is authoritative.
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
test('three-dot titlebar is scoped to selected frames and Studio editor',()=>{
 const master=read('assets/ngulik-design-system.css');
 const studio=read('assets/ai-studio.css');
 const source=read('js/ai-studio.js');
 assert.match(source,/ns-window-titlebar/);
 assert.match(source,/ns-window-dots/);
 assert.match(studio,/\.ngd-studio \.ns-window-dots i:nth-child\(3\)/);
 assert.match(master,/\.ngd-window-frame>\.ngd-window-titlebar/);
 for(const c of ['#141418','#F676B7','#FFD965','#EAE5FF'])assert.ok(master.includes(c)&&studio.includes(c),c);
 assert.doesNotMatch(master,/\.checkout-dialog::before|\.checkout-summary::before/);
 assert.doesNotMatch(master,/\.ngdm-orders,\.ngdm-recent,\.ngdm-owned,\.ngdl-story\)::before/);
 const app=read('js/app.js');
 for(const name of ['ngdm-orders','ngdm-recent','ngdm-owned','ngdl-story'])assert.ok(app.includes(name+' ngd-window-frame'),name);
});
test('browser cache versions synchronize both entrypoints without new auth or APIs',()=>{
 for(const name of ['index.html','staging/member.html']){
  const html=read(name);
  for(const id of ['ngulik-design-system.css','ai-studio.css','ai-studio.js'])assert.ok(html.includes(id+'?v=20261123-frame-v5'),name+' '+id);
 }
 assert.doesNotMatch(read('js/ai-studio.js'),/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
});

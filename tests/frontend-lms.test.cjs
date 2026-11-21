'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../js/lms-ui.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8')
  .replace(/^import .*?\n/gm,'');
function preview(mode='member',route='belajar'){
  const nodes={};let requests=0;
  function node(id){return nodes[id]||(nodes[id]={innerHTML:'',textContent:'',
    addEventListener(){},append(){},querySelector(){return {disabled:false}}});}
  const document={getElementById:node,addEventListener(){},title:''};
  const window={NGD_CONFIG:{demoMode:true,apiUrl:'',paymentsEnabled:false,
    supportEnabled:false,lmsEnabled:false,qrisImageUrl:'',qrisMerchant:''},
    addEventListener(){},scrollTo(){}};
  const location={href:'https://example.invalid/',origin:'https://example.invalid',
    search:'?preview='+mode,hash:'#'+route};
  const ctx=vm.createContext({
    document,window,location,sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    history:{replaceState(){}},Intl,Date,URL,URLSearchParams,Number,Map,
    api(){requests++;throw Error('PREVIEW_MUST_NOT_CALL_API');},
    ApiError:class ApiError extends Error{},
    isConnected:()=>false,isWriteEnabled:()=>false,
    setTimeout,clearTimeout
  });
  vm.runInContext(ui,ctx,{timeout:3000});
  vm.runInContext(app,ctx,{timeout:5000});
  return {ctx,nodes,go:route=>vm.runInContext('go('+JSON.stringify(route)+')',ctx),
    requests:()=>requests};
}
test('LMS view script parses without a bundler or external dependencies',()=>{
  assert.doesNotThrow(()=>new vm.Script(ui));
  assert.doesNotThrow(()=>new vm.Script(app));
});
test('admin preview shows curriculum and automatic workspace create form',()=>{
  const h=preview('admin','lms');
  assert.match(h.nodes.screen.innerHTML,/Kelola Kelas & Materi/);
  assert.match(h.nodes.screen.innerHTML,/Buat kursus &amp; workspace/);
  assert.match(h.nodes.screen.innerHTML,/id="lms-course-form"/);
  assert.match(h.nodes.screen.innerHTML,/disabled title="Edit kelas belum tersedia"/);
  assert.equal(vm.runInContext('lmsWriteEnabled()',h.ctx),false);
});
test('admin workspace displays draft editing, lessons and AI queue',()=>{
  const h=preview('admin','lms-editor'),html=h.nodes.screen.innerHTML;
  assert.match(html,/WORKSPACE/);
  assert.match(html,/Ruang Materi/);
  assert.match(html,/id="lms-lesson-form"/);
  assert.match(html,/id="lms-ai-form"/);
  assert.match(html,/COURSE_OUTLINE/);
  assert.match(html,/Ruang Materi/);
  assert.equal(h.requests(),0);
});
test('admin lesson draft editor and AI review are read-only in demo',()=>{
  const h=preview('admin','lms-lesson');
  assert.match(h.nodes.screen.innerHTML,/id="lms-lesson-form"/);
  assert.match(h.nodes.screen.innerHTML,/disabled/);
  h.go('lms-ai');
  assert.match(h.nodes.screen.innerHTML,/id="lms-ai-result-form"/);
  assert.match(h.nodes.screen.innerHTML,/Simpan hasil untuk review/);
  assert.equal(h.requests(),0);
});
test('member preview shows published class and allows reading without AI or payment',()=>{
  const h=preview('member','belajar');
  assert.match(h.nodes.screen.innerHTML,/Kelas yang Anda ikuti/);
  assert.match(h.nodes.screen.innerHTML,/Fondasi Digital untuk UMKM/);
  assert.match(h.nodes.screen.innerHTML,/Materi Pengantar/);
  h.go('lms-course');
  assert.match(h.nodes.screen.innerHTML,/Menyiapkan Profil Usaha/);
  assert.match(h.nodes.screen.innerHTML,/Tujuan pembelajaran/);
  assert.match(h.nodes.screen.innerHTML,/Tandai selesai/);
});
test('member cannot open admin editor routes',()=>{
  const h=preview('member','lms');
  assert.doesNotMatch(h.nodes.screen.innerHTML,/id="lms-course-form"/);
  h.go('lms-editor');
  assert.doesNotMatch(h.nodes.screen.innerHTML,/id="lms-ai-form"/);
});
test('locked private course never renders lesson content in member view',()=>{
  const h=preview('member','lms-course');
  vm.runInContext("state.lmsCourseDetail.access_granted=false;render()",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/Kelas Ini Belum Bisa Dibuka/);
  assert.doesNotMatch(html,/Tujuan pembelajaran/);
});
test('malicious titles, lesson content and links are escaped or rejected',()=>{
  const h=preview('member','lms-course');
  vm.runInContext("state.lmsCourseDetail.lessons[0].title='<img src=x onerror=alert(1)>';" +
    "state.lmsCourseDetail.lessons[0].body='<script>alert(1)</script>';" +
    "state.lmsCourseDetail.lessons[0].media_url='https://classroom.google.com.evil.test/';render();",h.ctx);
  const html=h.nodes.screen.innerHTML;
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html,/classroom\.google\.com\.evil\.test/);
});
test('admin preview also escapes malicious course names',()=>{
  const h=preview('admin','lms');
  vm.runInContext("state.lmsAdminCourses[0].title='<svg onload=alert(1)>';render()",h.ctx);
  assert.match(h.nodes.screen.innerHTML,/&lt;svg onload=alert\(1\)&gt;/);
});
test('offline preview never issues network requests, even while changing LMS pages',()=>{
  const h=preview('admin','lms');
  for(const route of ['lms','lms-editor','lms-lesson','lms-ai','beranda'])h.go(route);
  assert.equal(h.requests(),0);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function lms(){
  const window={};vm.runInNewContext(read('js/lms-ui.js'),{window,URL}, {timeout:3000});
  return window.NGD_LMS_UI;
}
const course={
  course_id:'CRS-1',title:'Fondasi Digital UMKM',
  summary:'Materi bisnis dan pemasaran yang relevan.',category:'UMKM',
  level:'PEMULA',status:'PUBLISHED',access_granted:true
};
test('Learning Studio loads on public, staging-member and operations after legacy CSS',()=>{
  for(const file of ['index.html','staging/member.html','staging/monitor.html']){
    const src=read(file),legacy=src.indexOf('experience.css'),studio=src.indexOf('learning-studio.css');
    assert.ok(legacy>=0&&studio>legacy,file);
  }
  const css=read('assets/learning-studio.css');
  for(const selector of ['.learning-dashboard','.learning-course-grid',
    '.learning-reader-layout','.learning-lesson-sidebar','.learning-lesson-panel',
    '.member-focus','.admin-module-card'])
    assert.ok(css.includes(selector),selector);
  assert.doesNotMatch(css,/@import|<script|apiUrl|SOBATAGENT_API_KEY|UrlFetchApp/i);
});
test('member LMS catalog is discovery-first and shows truthful enrolled status',()=>{
  const ui=lms();
  const html=ui.memberCatalog([course],[{course_id:'CRS-1',status:'ACTIVE'}],[]);
  for(const token of ['RUANG MEMBER / KELAS SAYA','data-lms-filter="all"',
    'data-lms-filter="active"','id="learning-course-search"',
    'data-course-state="active"','Lanjutkan kelas','data-course-id="CRS-1"'])
    assert.ok(html.includes(token),token);
  assert.doesNotMatch(html,/class="learning-filter-empty"[^>]*>([^<]*0 kelas cocok)/);
});
test('LMS course reader makes first unfinished lesson active, preserves progress and permissions',()=>{
  const ui=lms();
  const detail={course,access_granted:true,completed:1,total:2,lessons:[
    {lesson_id:'LESSON-1',title:'Pembukaan',body:'Selesai',
      duration_minutes:10,completed:true},
    {lesson_id:'LESSON-2',title:'Langkah berikutnya',body:'Praktikkan di usaha.',
      duration_minutes:15,completed:false}
  ]};
  const html=ui.memberCourse(detail,[{course_id:'CRS-1',status:'ACTIVE'}],true);
  assert.match(html,/data-lms-lesson-open="1" aria-current="step"/);
  assert.match(html,/role="progressbar" aria-valuenow="50"/);
  assert.match(html,/data-lms-panel="0" hidden/);
  assert.match(html,/data-lms-panel="1"/);
  assert.match(html,/data-lms-action="complete"/);
  assert.match(html,/data-lesson-id="LESSON-2"/);
  assert.ok(html.includes('Praktikkan di usaha.'));
});
test('locked course does not leak lesson content',()=>{
  const ui=lms();
  const html=ui.memberCourse({course,access_granted:false,completed:0,total:1,
    lessons:[{title:'Rahasia',body:'PRIVATE_LESSON_CONTENT',completed:false}]},[],false);
  assert.match(html,/Kelas Ini Belum Bisa Dibuka/);
  assert.doesNotMatch(html,/PRIVATE_LESSON_CONTENT|data-lms-panel=/);
});
test('course names and lesson bodies remain escaped even within new card and reader',()=>{
  const ui=lms(),unsafe='<img src=x onerror=alert(1)>';
  const html=ui.memberCatalog([{...course,title:unsafe}],[],[]);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;img/);
  const lesson=ui.memberCourse({course,access_granted:true,completed:0,total:1,
    lessons:[{lesson_id:'L1',title:unsafe,body:'<script>attack</script>'}]},[],true);
  assert.doesNotMatch(lesson,/<script>attack/);
  assert.match(lesson,/&lt;script&gt;attack/);
});
test('learning filters and lesson navigation are delegated without changing API or finance routes',()=>{
  const app=read('js/app.js');
  for(const token of ['function filterLearningCards_()','function selectLearningLesson_(index)',
    "hasAttribute('data-lms-filter')","hasAttribute('data-lms-lesson-open')",
    "hasAttribute('data-lms-next')",'data-lms-action="open-course"'])
    assert.ok(app.includes(token),token);
  assert.match(app,/api\('getMyLMSEnrollments'/);
  assert.match(app,/if\(isAdmin\(\)\)return viewAdmin\(\)/);
});

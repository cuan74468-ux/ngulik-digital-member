'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const lms=fs.readFileSync(path.join(__dirname,'../apps-script/LMS.gs'),'utf8');
function fixture(){
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(core,ctx,{timeout:10000});
  vm.runInContext(lms,ctx,{timeout:10000});
  const members=[
    {member_id:'A1',role:'ADMIN',status:'AKTIF',nama:'Admin'},
    {member_id:'M1',role:'MEMBER',status:'AKTIF',nama:'Peserta',
      akses_3in1_sampai:'2030-01-01T00:00:00Z',status_pos:'BELUM'},
    {member_id:'M2',role:'MEMBER',status:'AKTIF',nama:'Member Dua',
      akses_3in1_sampai:'',status_pos:'BELUM'},
    {member_id:'M3',role:'MEMBER',status:'SUSPENDED',nama:'Nonaktif'}
  ];
  const products=[{product_id:'P1',tipe:'LANGGANAN_30H',nama:'3-in-1'}];
  const orders=[{order_id:'O1',member_id:'M1',product_id:'P1',status:'FULFILLED'}];
  const tables={members,katalog_produk:products,orders,
    lms_courses:[],lms_lessons:[],lms_enrollments:[],lms_progress:[],
    lms_workspaces:[],lms_ai_jobs:[],lms_revisions:[]};
  const calls=[],audits=[];
  let n=0,failWorkspace=false,failLessonPublish=false;
  ctx.withLock_=(f)=>f();
  ctx.now_=()=>new Date('2026-11-14T10:00:00Z');
  ctx.recordId_=prefix=>prefix+'-'+String(++n).padStart(8,'0');
  ctx.logAudit_=(...a)=>audits.push(a);
  ctx.readAll_=(t)=>tables[t]||[];
  ctx.findRows_=(t,p)=> (tables[t]||[]).filter(p);
  ctx.byId_=(t,field,value)=>(tables[t]||[]).find(x=>String(x[field])===String(value))||null;
  ctx.appendRow_=(t,v)=>{
    if(failWorkspace&&t==='lms_workspaces'){failWorkspace=false;throw Error('CRASH_BEFORE_WORKSPACE');}
    const row={...v,_row:tables[t].length+2};
    tables[t].push(row);calls.push({type:'append',table:t,row});
    return row._row;
  };
  ctx.updateRow_=(t,rowNum,patch)=>{
    if(failLessonPublish&&t==='lms_lessons'){failLessonPublish=false;throw Error('CRASH_BEFORE_PUBLISH');}
    let row=tables[t].find(x=>x._row===rowNum);
    if(!row)throw Error('ROW_MISSING '+t);
    Object.assign(row,patch);calls.push({type:'update',table:t,patch});
  };
  const session={admin:members[0],member:members[1],other:members[2],suspended:members[3]};
  ctx.activeMember_=token=>{
    const m=session[token];
    if(!m)throw Error('Sesi tidak sah.');
    if(m.status!=='AKTIF')throw Error('Akun tidak aktif.');
    return m;
  };
  ctx.admin_=token=>{
    const m=ctx.activeMember_(token);
    if(m.role!=='ADMIN')throw Error('Akses tidak diizinkan.');
    return m;
  };
  let reqId=0;
  function act(action,token,payload={},requestId){
    const id=requestId||'LMS_REQUEST_'+String(++reqId).padStart(18,'0');
    return vm.runInContext('apiRouter_('+[action,token,payload,id].map(v=>JSON.stringify(v)).join(',')+')',
      ctx,{timeout:3000});
  }
  function course(p={},requestId){
    return act('adminCreateLMSCourse','admin',{
      title:'Pengenalan Operasional UMKM',summary:'Materi praktis untuk memulai dan mengelola usaha secara aman.',
      category:'Operasional',level:'PEMULA',access_type:'MEMBER',
      sort_order:1,...p},requestId);
  }
  function lesson(courseId,p={},requestId){
    return act('adminCreateLMSLesson','admin',{
      course_id:courseId,title:'Mulai dari Kasir',body:'Panduan memulai transaksi kasir dari persiapan hingga tutup shift.',
      kind:'ARTICLE',sort_order:1,duration_minutes:15,...p},requestId);
  }
  return {ctx,tables,calls,audits,act,course,lesson,members,
    failWorkspace:()=>{failWorkspace=true},
    failPublish:()=>{failLessonPublish=true}};
}
test('admin creates course plus exactly one automatic author workspace',()=>{
  const f=fixture(),c=f.course();
  assert.equal(c.status,'DRAFT');assert.ok(c.workspace_id);
  assert.equal(f.tables.lms_courses.length,1);
  assert.equal(f.tables.lms_workspaces.length,1);
  assert.equal(f.tables.lms_workspaces[0].workspace_id,c.workspace_id);
  assert.equal(f.tables.lms_workspaces[0].auto_created,true);
  assert.equal(f.act('getLMSCatalog','member').length,0);
});
test('identical course replay is idempotent, conflicts rejected',()=>{
  const f=fixture(),id='LMS_CREATE_REPLAY_1234567';
  const c=f.course({},id),again=f.course({},id);
  assert.equal(c.course_id,again.course_id);
  assert.equal(f.tables.lms_courses.length,1);assert.equal(f.tables.lms_workspaces.length,1);
  assert.throws(()=>f.course({title:'Judul yang sama sekali berbeda'},id),/ID permintaan/);
});
test('workspace missing after partial failure is repaired on identical retry',()=>{
  const f=fixture();f.failWorkspace();
  const id='LMS_CREATE_CRASH_12345678';
  assert.throws(()=>f.course({},id),/CRASH_BEFORE_WORKSPACE/);
  assert.equal(f.tables.lms_courses.length,1);
  assert.equal(f.tables.lms_workspaces.length,0);
  const c=f.course({},id);
  assert.equal(f.tables.lms_workspaces.length,1);
  assert.equal(f.tables.lms_workspaces[0].course_id,c.course_id);
});
test('member cannot access ADMIN LMS CRUD, drafts or AI queue',()=>{
  const f=fixture(),c=f.course();
  for(const action of ['adminListLMSCourses','adminGetLMSCourse',
    'adminCreateLMSCourse','adminPublishLMSCourse','adminListLMSAIJobs']){
    assert.throws(()=>f.act(action,'member',{course_id:c.course_id}),/Akses tidak diizinkan/);
  }
  assert.equal(f.act('getLMSCatalog','member').length,0);
});
test('course update enforces optimistic version control',()=>{
  const f=fixture(),c=f.course();
  const p={course_id:c.course_id,expected_version:1,
    title:'Panduan Usaha yang Diperbarui',summary:'Materi pembelajaran dan praktik usaha yang terstruktur untuk pemula.',
    category:'Operasional',level:'PEMULA',access_type:'MEMBER',sort_order:2};
  const result=f.act('adminUpdateLMSCourse','admin',p);
  assert.equal(result.version,2);
  assert.throws(()=>f.act('adminUpdateLMSCourse','admin',p),/Kursus telah berubah/);
});
test('lesson CRUD validates URL, title, duration and version',()=>{
  const f=fixture(),c=f.course();
  assert.throws(()=>f.lesson(c.course_id,{kind:'VIDEO',media_url:'javascript:alert(1)'}),/HTTPS/);
  assert.throws(()=>f.lesson(c.course_id,{duration_minutes:0}),/Durasi/);
  assert.throws(()=>f.lesson(c.course_id,{media_url:'https://evil.google.com/path'}),/Domain materi/);
  const l=f.lesson(c.course_id,{kind:'VIDEO',media_url:'https://www.youtube.com/watch?v=abc'});
  assert.equal(l.status,'DRAFT');
  const edited=f.act('adminUpdateLMSLesson','admin',{
    lesson_id:l.lesson_id,expected_version:1,title:'Cetak struk dan kasir',
    body:'Panduan pelaksanaan transaksi dan cetak struk dengan cara yang tepat.',
    kind:'VIDEO',media_url:'https://youtu.be/abc',sort_order:1,duration_minutes:20});
  assert.equal(edited.version,2);
});
test('cannot publish course without published lesson',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  assert.throws(()=>f.act('adminPublishLMSCourse','admin',{course_id:c.course_id}),
    /minimal satu pelajaran/);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  assert.equal(f.act('adminPublishLMSCourse','admin',{course_id:c.course_id}).status,'PUBLISHED');
  assert.equal(f.act('getLMSCatalog','member').length,1);
});
test('member sees published snapshots, not unreviewed edits',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  f.act('adminUpdateLMSLesson','admin',{
    lesson_id:l.lesson_id,expected_version:1,title:'Draft: Materi belum disetujui',
    body:'Perubahan materi ini masih berupa draft dan belum diterbitkan untuk semua peserta.',
    kind:'ARTICLE',sort_order:1,duration_minutes:15});
  f.act('adminUpdateLMSCourse','admin',{
    course_id:c.course_id,expected_version:1,title:'Kursus perubahan draft',
    summary:'Perubahan ini hanya untuk admin sampai dipublikasi ulang.',
    category:'Operasional',level:'PEMULA',access_type:'MEMBER',sort_order:1});
  const visible=f.act('getLMSCourse','member',{course_id:c.course_id});
  assert.equal(visible.course.title,'Pengenalan Operasional UMKM');
  assert.equal(visible.lessons[0].title,'Mulai dari Kasir');
  assert.doesNotMatch(visible.lessons[0].body,/masih berupa draft/);
  const admin=f.act('adminGetLMSCourse','admin',{course_id:c.course_id});
  assert.equal(admin.course.title,'Kursus perubahan draft');
  assert.equal(admin.lessons[0].unpublished_changes,true);
});
test('published lesson retry is safe after failing at the final row update',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  const id='LMS_PUBLISH_RETRY_123456';
  f.failPublish();
  assert.throws(()=>f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id},id),
    /CRASH_BEFORE_PUBLISH/);
  assert.equal(f.tables.lms_revisions.length,1);
  const success=f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id},id);
  assert.equal(success.status,'PUBLISHED');assert.equal(f.tables.lms_revisions.length,1);
});
test('lesson publication is repeatable and revisions are not duplicated',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  assert.equal(f.tables.lms_revisions.length,1);
});
test('paid course is inaccessible to non-subscribers',()=>{
  const f=fixture(),c=f.course({access_type:'PRODUCT',product_id:'P1'});
  const l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  assert.equal(f.act('getLMSCourse','member',{course_id:c.course_id}).access_granted,true);
  const locked=f.act('getLMSCourse','other',{course_id:c.course_id});
  assert.equal(locked.access_granted,false);
  assert.equal(locked.lessons.length,0);
  assert.throws(()=>f.act('enrollLMSCourse','other',{course_id:c.course_id}),/belum tersedia/);
});
test('free member enrollment and lesson completion are idempotent',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  const first=f.act('enrollLMSCourse','member',{course_id:c.course_id});
  const second=f.act('enrollLMSCourse','member',{course_id:c.course_id});
  assert.equal(first.already_enrolled,false);
  assert.equal(second.already_enrolled,true);
  assert.equal(f.tables.lms_enrollments.length,1);
  const a=f.act('completeLMSLesson','member',{lesson_id:l.lesson_id});
  const b=f.act('completeLMSLesson','member',{lesson_id:l.lesson_id});
  assert.equal(a.already_completed,false);assert.equal(b.already_completed,true);
  assert.equal(f.tables.lms_progress.length,1);
  const detail=f.act('getLMSCourse','member',{course_id:c.course_id});
  assert.equal(detail.completed,1);assert.equal(detail.lessons[0].completed,true);
});
test('cannot complete lesson without enrolling',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  assert.throws(()=>f.act('completeLMSLesson','member',{lesson_id:l.lesson_id}),
    /Ikuti kursus/);
  assert.equal(f.tables.lms_progress.length,0);
});
test('member cannot complete draft lesson or a course without published status',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  assert.throws(()=>f.act('completeLMSLesson','member',{lesson_id:l.lesson_id}),/tidak tersedia/);
  assert.equal(f.tables.lms_progress.length,0);
});
test('soft archive is intentional and keeps history, hiding course from new learners',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  assert.throws(()=>f.act('adminArchiveLMSCourse','admin',{course_id:c.course_id}),
    /Konfirmasi/);
  f.act('adminArchiveLMSCourse','admin',{course_id:c.course_id,confirm_archive:true});
  assert.equal(f.tables.lms_courses.length,1);
  assert.equal(f.act('getLMSCatalog','member').length,0);
  assert.throws(()=>f.act('enrollLMSCourse','member',{course_id:c.course_id}),/belum tersedia/);
});
test('preparing AI job creates human-readable prompt without calling provider',()=>{
  const f=fixture(),c=f.course();
  const p={course_id:c.course_id,task_type:'COURSE_OUTLINE',
    brief:'Buat kerangka pembelajaran kasir dan pengelolaan toko dalam enam sesi praktis.'};
  const job=f.act('adminPrepareLMSAIJob','admin',p,'LMS_AI_REQUEST_12345678');
  assert.equal(job.status,'READY_FOR_LLM');
  assert.match(job.prompt,/Jangan sertakan API key/);
  assert.equal(f.tables.lms_ai_jobs.length,1);
  assert.equal(job.workspace_id,c.workspace_id);
  const retry=f.act('adminPrepareLMSAIJob','admin',p,'LMS_AI_REQUEST_12345678');
  assert.equal(retry.job_id,job.job_id);
});
test('imported AI content stays review-only; approval never publishes courses',()=>{
  const f=fixture(),c=f.course();
  const job=f.act('adminPrepareLMSAIJob','admin',{
    course_id:c.course_id,task_type:'LESSON_DRAFT',
    brief:'Tuliskan materi pengenalan pemasaran digital untuk pelaku usaha pemula.'});
  const draft='## Pendahuluan\nMateri contoh yang harus diverifikasi dan diedit admin. '+
    'Tidak boleh secara otomatis diterbitkan ke peserta.';
  assert.equal(f.act('adminImportLMSAIResult','admin',
    {job_id:job.job_id,result_draft:draft}).status,'FOR_REVIEW');
  assert.equal(f.act('adminReviewLMSAIJob','admin',
    {job_id:job.job_id,decision:'APPROVED'}).status,'APPROVED');
  assert.equal(f.tables.lms_courses[0].status,'DRAFT');
  assert.equal(f.tables.lms_lessons.length,0);
  assert.equal(f.act('getLMSCatalog','member').length,0);
});
test('AI request cannot contain unknown task, and member cannot access queue',()=>{
  const f=fixture(),c=f.course();
  assert.throws(()=>f.act('adminPrepareLMSAIJob','admin',{
    course_id:c.course_id,task_type:'EXECUTE_API',
    brief:'Please run paid model now and save data in live production.'}),/Jenis pekerjaan AI/);
  assert.throws(()=>f.act('adminListLMSAIJobs','member',{course_id:c.course_id}),
    /Akses tidak diizinkan/);
});
test('LMS read models omit internal request IDs and actor secrets',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  const visible=f.act('getLMSCourse','member',{course_id:c.course_id});
  assert.equal(Object.hasOwn(visible.course,'request_id'),false);
  assert.equal(Object.hasOwn(visible.lessons[0],'created_by'),false);
  assert.equal(Object.hasOwn(visible.lessons[0],'published_body'),false);
});

test('draft metadata never changes published paid entitlement before republish',()=>{
  const f=fixture(),course=f.course(),lesson=f.lesson(course.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:lesson.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:course.course_id});
  assert.equal(f.act('getLMSCourse','other',{course_id:course.course_id}).access_granted,true);
  f.act('adminUpdateLMSCourse','admin',{
    course_id:course.course_id,expected_version:1,
    title:'Kursus Berbayar, Masih Draft',summary:'Perubahan model akses masih draft dan belum disetujui untuk diterbitkan.',
    category:'Premium',level:'LANJUTAN',access_type:'PRODUCT',product_id:'P1',sort_order:50
  });
  const live=f.act('getLMSCourse','other',{course_id:course.course_id});
  assert.equal(live.access_granted,true);
  assert.equal(live.course.access_type,'MEMBER');
  assert.equal(live.course.category,'Operasional');
  assert.equal(live.course.level,'PEMULA');
  assert.equal(live.course.sort_order,1);
  f.act('adminPublishLMSCourse','admin',{course_id:course.course_id});
  const after=f.act('getLMSCourse','other',{course_id:course.course_id});
  assert.equal(after.access_granted,false);
  assert.equal(after.lessons.length,0);
  assert.equal(after.course.access_type,'PRODUCT');
});
test('draft lesson media, kind and duration remain unchanged for members until publication',()=>{
  const f=fixture(),course=f.course(),lesson=f.lesson(course.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:lesson.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:course.course_id});
  f.act('adminUpdateLMSLesson','admin',{
    lesson_id:lesson.lesson_id,expected_version:1,
    title:'Tutorial Penggunaan Printer',body:'Pelajaran video baru mengenai penggunaan printer untuk usaha.',
    media_url:'https://youtu.be/video123',kind:'VIDEO',sort_order:80,duration_minutes:60
  });
  const before=f.act('getLMSCourse','member',{course_id:course.course_id}).lessons[0];
  assert.equal(before.kind,'ARTICLE');
  assert.equal(before.media_url,'');
  assert.equal(before.duration_minutes,15);
  assert.equal(before.sort_order,1);
  f.act('adminPublishLMSLesson','admin',{lesson_id:lesson.lesson_id});
  const after=f.act('getLMSCourse','member',{course_id:course.course_id}).lessons[0];
  assert.equal(after.kind,'VIDEO');
  assert.equal(after.duration_minutes,60);
  assert.equal(after.sort_order,80);
  assert.equal(after.media_url,'https://youtu.be/video123');
});
test('revision history retains metadata needed for later manual rollback planning',()=>{
  const f=fixture(),c=f.course(),l=f.lesson(c.course_id);
  f.act('adminPublishLMSLesson','admin',{lesson_id:l.lesson_id});
  f.act('adminPublishLMSCourse','admin',{course_id:c.course_id});
  const a=f.act('adminListLMSRevisions','admin',{entity:'LESSON',entity_id:l.lesson_id});
  const b=f.act('adminListLMSRevisions','admin',{entity:'COURSE',entity_id:c.course_id});
  assert.equal(a.length,1);assert.equal(b.length,1);
  assert.equal(JSON.parse(a[0].metadata_json).duration_minutes,15);
  assert.equal(JSON.parse(b[0].metadata_json).access_type,'MEMBER');
  assert.throws(()=>f.act('adminListLMSRevisions','member',
    {entity:'LESSON',entity_id:l.lesson_id}),/Akses tidak diizinkan/);
});

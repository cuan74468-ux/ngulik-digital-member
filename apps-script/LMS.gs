/**
 * LMS V1 — course/lesson CRUD, durable editorial workspaces, enrollment,
 * progress and optional AI drafting queue. NO model/network calls, NO keys.
 * All writes are gated in Code.gs by NGD_MUTATIONS_ENABLED + NGD_LMS_ENABLED.
 * Preserve modul_belajar/progress_member legacy tables, never overwrite.
 */
function lmsText_(v,max,min,label){
  var x=safeText_(v,max);
  require_(x.length>=(min||0),'VALIDATION',(label||'Teks')+' terlalu pendek.');
  return x;
}
function lmsId_(v){return lmsText_(v,100,2,'ID');}
function lmsInteger_(v,min,max,label){
  var n=Number(v);
  require_(v!==''&&v!==null&&v!==undefined&&Number.isInteger(n)&&n>=min&&n<=max,
    'VALIDATION',(label||'Angka')+' tidak valid.');
  return n;
}
function lmsUrl_(v){
  var raw=lmsText_(v,600,0,'Tautan');
  if(!raw)return '';
  require_(/^https:\/\//i.test(raw),'VALIDATION','Tautan wajib HTTPS.');
  var match=raw.match(/^https:\/\/([^/?#]+)/i),host=match&&match[1].toLowerCase();
  require_(host&&host.indexOf('@')<0&&
    ['classroom.google.com','youtube.com','www.youtube.com','youtu.be',
     'drive.google.com','docs.google.com'].indexOf(host)>=0,
    'VALIDATION','Domain materi tidak diizinkan.');
  return raw;
}
function lmsCoursePayload_(p){
  var x=p||{},title=lmsText_(x.title,140,6,'Judul kursus'),
    summary=lmsText_(x.summary,1200,20,'Ringkasan'),
    category=lmsText_(x.category||'UMKM',60,2,'Kategori'),
    level=String(x.level||'PEMULA').toUpperCase(),
    access=String(x.access_type||'MEMBER').toUpperCase(),
    product=lmsText_(x.product_id,100,0,'Produk');
  require_(['PEMULA','MENENGAH','LANJUTAN'].indexOf(level)>=0,
    'VALIDATION','Level kursus tidak valid.');
  require_(['MEMBER','PRODUCT'].indexOf(access)>=0,
    'VALIDATION','Jenis akses tidak valid.');
  require_(access!=='PRODUCT'||product,'VALIDATION',
    'Kursus berbayar wajib dikaitkan dengan produk.');
  require_(access==='PRODUCT'||!product,'VALIDATION',
    'Kursus member umum tidak memerlukan produk.');
  return {title:title,summary:summary,category:category,level:level,
    access_type:access,product_id:product,
    sort_order:lmsInteger_(x.sort_order===undefined?100:x.sort_order,1,9999,'Urutan')};
}
function lmsLessonPayload_(p){
  var x=p||{},kind=String(x.kind||'ARTICLE').toUpperCase();
  require_(['ARTICLE','VIDEO','CLASSROOM','PRACTICE'].indexOf(kind)>=0,
    'VALIDATION','Jenis materi tidak valid.');
  var body=lmsText_(x.body,7500,20,'Konten pelajaran'),url=lmsUrl_(x.media_url);
  require_(kind!=='VIDEO'&&kind!=='CLASSROOM'||url,'VALIDATION',
    'Materi video/Classroom harus memiliki tautan resmi.');
  return {title:lmsText_(x.title,140,6,'Judul pelajaran'),
    body:body,kind:kind,media_url:url,
    sort_order:lmsInteger_(x.sort_order===undefined?100:x.sort_order,1,9999,'Urutan'),
    duration_minutes:lmsInteger_(x.duration_minutes===undefined?10:x.duration_minutes,1,360,'Durasi')};
}
function lmsViewCourse_(row,admin){
  var o={course_id:row.course_id,workspace_id:row.workspace_id,
    title:admin?row.title:row.published_title,
    summary:admin?row.summary:row.published_summary,
    category:row.category,level:row.level,access_type:row.access_type,
    product_id:row.product_id,sort_order:Number(row.sort_order)||100,
    status:row.status,version:Number(row.version)||1,
    published_at:row.published_at||''};
  if(admin){
    o.draft_title=row.title;o.draft_summary=row.summary;
    o.published_title=row.published_title||'';o.published_summary=row.published_summary||'';
    o.updated_at=row.updated_at||'';
    o.unpublished_changes=row.title!==row.published_title||
      row.summary!==row.published_summary;
  }
  return o;
}
function lmsViewLesson_(r,admin){
  var result={lesson_id:r.lesson_id,course_id:r.course_id,
    title:admin?r.title:r.published_title,
    body:admin?r.body:r.published_body,
    media_url:admin?r.media_url:r.published_media_url,
    kind:r.kind,sort_order:Number(r.sort_order)||100,
    duration_minutes:Number(r.duration_minutes)||10,
    status:r.status,version:Number(r.version)||1,
    published_at:r.published_at||''};
  if(admin){
    result.draft_title=r.title;result.draft_body=r.body;
    result.unpublished_changes=r.title!==r.published_title||
      r.body!==r.published_body||r.media_url!==r.published_media_url;
  }
  return result;
}
function lmsOrder_(a,b){
  return Number(a.sort_order||100)-Number(b.sort_order||100)||
    String(a.created_at||'').localeCompare(String(b.created_at||''));
}
function lmsCourse_(id){
  var r=byId_('lms_courses','course_id',lmsId_(id));
  require_(r,'NOT_FOUND','Kursus tidak ditemukan.');
  return r;
}
function lmsLesson_(id){
  var r=byId_('lms_lessons','lesson_id',lmsId_(id));
  require_(r,'NOT_FOUND','Pelajaran tidak ditemukan.');
  return r;
}
function lmsAdminCatalog_(p){
  var q=lmsText_((p||{}).query,100,0,'Pencarian').toLowerCase();
  var status=String((p||{}).status||'').toUpperCase();
  require_(!status||['DRAFT','PUBLISHED','ARCHIVED'].indexOf(status)>=0,
    'VALIDATION','Status tidak valid.');
  return readAll_('lms_courses').filter(function(r){
    return (!status||r.status===status)&&(!q||
      [r.title,r.summary,r.course_id].join(' ').toLowerCase().indexOf(q)>=0);
  }).sort(lmsOrder_).slice(0,100).map(function(r){return lmsViewCourse_(r,true);});
}
function lmsPublishedCatalog_(member){
  return readAll_('lms_courses').filter(function(r){return r.status==='PUBLISHED';})
    .sort(lmsOrder_).map(function(r){
      var v=lmsViewCourse_(r,false);
      v.access_granted=lmsCanAccess_(member,r);
      return v;
    });
}
function lmsCanAccess_(member,course){
  if(member.role==='ADMIN')return true;
  if(course.access_type==='MEMBER')return true;
  var p=byId_('katalog_produk','product_id',course.product_id);
  if(!p)return false;
  var related=findRows_('orders',function(o){
    return o.member_id===member.member_id&&o.product_id===course.product_id&&
      ['PAID','FULFILLED'].indexOf(o.status)>=0;
  });
  if(!related.length)return false;
  var now=Date.now();
  if(p.tipe==='LANGGANAN_30H')
    return member.akses_3in1_sampai&&
      new Date(member.akses_3in1_sampai).getTime()>now;
  if(p.tipe==='SEAT_30H')
    return ['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(member.status_canva)>=0&&
      member.canva_berakhir&&new Date(member.canva_berakhir).getTime()>now;
  if(p.tipe==='LISENSI_SEKALI')return member.status_pos==='AKTIF';
  return p.tipe==='TOPUP_KREDIT'&&related.some(function(o){return o.status==='FULFILLED';});
}
function lmsEnsureWorkspace_(course,admin,requestId){
  var all=findRows_('lms_workspaces',function(w){return w.course_id===course.course_id;});
  require_(all.length<=1,'RECONCILIATION_REQUIRED','Workspace kursus duplikat.');
  if(all.length){
    require_(all[0].workspace_id===course.workspace_id,
      'RECONCILIATION_REQUIRED','Workspace kursus tidak sesuai.');
    return all[0];
  }
  var workspace={workspace_id:course.workspace_id,course_id:course.course_id,
    name:'Ruang Materi — '+course.title,workspace_status:'ACTIVE',
    created_at:now_(),updated_at:now_(),created_by:admin.member_id,
    auto_created:true,request_id:requestId};
  appendRow_('lms_workspaces',workspace);
  return workspace;
}
function lmsCreateCourse_(admin,p,requestId){
  return withLock_(function(){
    var input=lmsCoursePayload_(p);
    if(input.access_type==='PRODUCT')
      require_(byId_('katalog_produk','product_id',input.product_id),
        'NOT_FOUND','Produk akses tidak ditemukan.');
    var prior=findRows_('lms_courses',function(r){return r.request_id===requestId;});
    require_(prior.length<=1,'RECONCILIATION_REQUIRED','ID kursus ganda.');
    if(prior.length){
      var old=prior[0];
      require_(old.created_by===admin.member_id&&
        old.title===input.title&&old.summary===input.summary&&
        old.category===input.category&&old.level===input.level&&
        old.access_type===input.access_type&&old.product_id===input.product_id&&
        Number(old.sort_order)===input.sort_order,
        'CONFLICT','ID permintaan digunakan untuk kursus berbeda.');
      lmsEnsureWorkspace_(old,admin,requestId);
      return lmsViewCourse_(old,true);
    }
    var t=now_(),course={course_id:recordId_('CRS'),
      workspace_id:recordId_('WS'),title:input.title,summary:input.summary,
      published_title:'',published_summary:'',category:input.category,
      level:input.level,access_type:input.access_type,product_id:input.product_id,
      sort_order:input.sort_order,status:'DRAFT',version:1,
      created_at:t,updated_at:t,published_at:'',archived_at:'',
      created_by:admin.member_id,request_id:requestId};
    appendRow_('lms_courses',course);
    lmsEnsureWorkspace_(course,admin,requestId);
    logAudit_(admin.member_id,'ADMIN','LMS_COURSE_CREATED','lms_courses',
      course.course_id,'','DRAFT',{workspace_id:course.workspace_id});
    return lmsViewCourse_(course,true);
  });
}
function lmsUpdateCourse_(admin,p){
  return withLock_(function(){
    var r=lmsCourse_(p.course_id),input=lmsCoursePayload_(p);
    require_(r.status!=='ARCHIVED','CONFLICT','Kursus diarsipkan.');
    require_(Number(r.version)===lmsInteger_(p.expected_version,1,999999,'Versi'),
      'CONFLICT','Kursus telah berubah. Muat ulang sebelum menyimpan.');
    if(input.access_type==='PRODUCT')
      require_(byId_('katalog_produk','product_id',input.product_id),
        'NOT_FOUND','Produk tidak ditemukan.');
    updateRow_('lms_courses',r._row,{
      title:input.title,summary:input.summary,category:input.category,
      level:input.level,access_type:input.access_type,product_id:input.product_id,
      sort_order:input.sort_order,version:Number(r.version)+1,updated_at:now_()
    });
    logAudit_(admin.member_id,'ADMIN','LMS_COURSE_DRAFT_EDIT','lms_courses',
      r.course_id,String(r.version),String(Number(r.version)+1),{});
    return lmsViewCourse_(byId_('lms_courses','course_id',r.course_id),true);
  });
}
function lmsCreateLesson_(admin,p,requestId){
  return withLock_(function(){
    var course=lmsCourse_(p.course_id),input=lmsLessonPayload_(p);
    require_(course.status!=='ARCHIVED','CONFLICT','Kursus diarsipkan.');
    var prior=findRows_('lms_lessons',function(r){return r.request_id===requestId;});
    require_(prior.length<=1,'RECONCILIATION_REQUIRED','ID pelajaran ganda.');
    if(prior.length){
      var old=prior[0];
      require_(old.created_by===admin.member_id&&old.course_id===course.course_id&&
        old.title===input.title&&old.body===input.body&&old.kind===input.kind&&
        old.media_url===input.media_url&&Number(old.sort_order)===input.sort_order&&
        Number(old.duration_minutes)===input.duration_minutes,
        'CONFLICT','ID permintaan digunakan untuk pelajaran berbeda.');
      return lmsViewLesson_(old,true);
    }
    var t=now_(),lesson={lesson_id:recordId_('LES'),course_id:course.course_id,
      title:input.title,body:input.body,media_url:input.media_url,
      published_title:'',published_body:'',published_media_url:'',
      kind:input.kind,sort_order:input.sort_order,
      duration_minutes:input.duration_minutes,status:'DRAFT',version:1,
      created_at:t,updated_at:t,published_at:'',created_by:admin.member_id,
      request_id:requestId};
    appendRow_('lms_lessons',lesson);
    logAudit_(admin.member_id,'ADMIN','LMS_LESSON_CREATED','lms_lessons',
      lesson.lesson_id,'','DRAFT',{course_id:course.course_id});
    return lmsViewLesson_(lesson,true);
  });
}
function lmsUpdateLesson_(admin,p){
  return withLock_(function(){
    var r=lmsLesson_(p.lesson_id),input=lmsLessonPayload_(p);
    require_(r.status!=='ARCHIVED','CONFLICT','Pelajaran diarsipkan.');
    require_(Number(r.version)===lmsInteger_(p.expected_version,1,999999,'Versi'),
      'CONFLICT','Materi telah berubah. Muat ulang sebelum menyimpan.');
    var course=lmsCourse_(r.course_id);
    require_(course.status!=='ARCHIVED','CONFLICT','Kursus diarsipkan.');
    updateRow_('lms_lessons',r._row,{
      title:input.title,body:input.body,kind:input.kind,
      media_url:input.media_url,sort_order:input.sort_order,
      duration_minutes:input.duration_minutes,
      version:Number(r.version)+1,updated_at:now_()});
    logAudit_(admin.member_id,'ADMIN','LMS_LESSON_DRAFT_EDIT','lms_lessons',
      r.lesson_id,String(r.version),String(Number(r.version)+1),{});
    return lmsViewLesson_(byId_('lms_lessons','lesson_id',r.lesson_id),true);
  });
}
function lmsRevision_(entity,row,admin,requestId){
  var original=findRows_('lms_revisions',function(r){
    return r.entity===entity&&r.entity_id===
      (entity==='COURSE'?row.course_id:row.lesson_id)&&
      Number(r.version)===Number(row.version);
  });
  require_(original.length<=1,'RECONCILIATION_REQUIRED','Versi rilis ganda.');
  if(original.length)return original[0];
  var record={revision_id:recordId_('REV'),entity:entity,
    entity_id:entity==='COURSE'?row.course_id:row.lesson_id,
    version:Number(row.version),title:row.title,
    body:entity==='COURSE'?row.summary:row.body,
    media_url:entity==='LESSON'?row.media_url:'',
    published_at:now_(),actor_id:admin.member_id,request_id:requestId};
  appendRow_('lms_revisions',record);
  return record;
}
function lmsPublishLesson_(admin,p,requestId){
  return withLock_(function(){
    var r=lmsLesson_(p.lesson_id),course=lmsCourse_(r.course_id);
    require_(course.status!=='ARCHIVED'&&r.status!=='ARCHIVED',
      'CONFLICT','Materi diarsipkan.');
    var isCurrent=r.status==='PUBLISHED'&&
      r.title===r.published_title&&r.body===r.published_body&&
      r.media_url===r.published_media_url;
    if(isCurrent)return lmsViewLesson_(r,true);
    lmsRevision_('LESSON',r,admin,requestId);
    updateRow_('lms_lessons',r._row,{
      status:'PUBLISHED',published_title:r.title,published_body:r.body,
      published_media_url:r.media_url,published_at:now_(),
      updated_at:now_()
    });
    logAudit_(admin.member_id,'ADMIN','LMS_LESSON_PUBLISHED','lms_lessons',
      r.lesson_id,r.status,'PUBLISHED',{version:r.version});
    return lmsViewLesson_(byId_('lms_lessons','lesson_id',r.lesson_id),true);
  });
}
function lmsPublishCourse_(admin,p,requestId){
  return withLock_(function(){
    var r=lmsCourse_(p.course_id);
    require_(r.status!=='ARCHIVED','CONFLICT','Kursus diarsipkan.');
    var lessons=findRows_('lms_lessons',function(x){
      return x.course_id===r.course_id&&x.status==='PUBLISHED';
    });
    require_(lessons.length>0,'CONFLICT',
      'Terbitkan minimal satu pelajaran sebelum kursus.');
    if(r.status==='PUBLISHED'&&r.title===r.published_title&&
       r.summary===r.published_summary)return lmsViewCourse_(r,true);
    lmsRevision_('COURSE',r,admin,requestId);
    updateRow_('lms_courses',r._row,{
      status:'PUBLISHED',published_title:r.title,published_summary:r.summary,
      published_at:now_(),updated_at:now_()});
    logAudit_(admin.member_id,'ADMIN','LMS_COURSE_PUBLISHED','lms_courses',
      r.course_id,r.status,'PUBLISHED',{version:r.version,lessons:lessons.length});
    return lmsViewCourse_(byId_('lms_courses','course_id',r.course_id),true);
  });
}
function lmsArchive_(admin,p,kind){
  return withLock_(function(){
    require_(p.confirm_archive===true,'VALIDATION',
      'Konfirmasi pengarsipan diperlukan.');
    var t=kind==='COURSE'?'lms_courses':'lms_lessons',
        row=kind==='COURSE'?lmsCourse_(p.course_id):lmsLesson_(p.lesson_id),
        id=kind==='COURSE'?row.course_id:row.lesson_id;
    if(row.status==='ARCHIVED')return {success:true,already_archived:true,id:id};
    updateRow_(t,row._row,{status:'ARCHIVED',updated_at:now_()});
    logAudit_(admin.member_id,'ADMIN','LMS_'+kind+'_ARCHIVED',t,id,
      row.status,'ARCHIVED',{non_destructive:true});
    return {success:true,id:id};
  });
}
function lmsAdminLessons_(p){
  var course=lmsCourse_(p.course_id);
  return {course:lmsViewCourse_(course,true),
    workspace:lmsFindWorkspace_(course),
    lessons:findRows_('lms_lessons',function(r){return r.course_id===course.course_id;})
      .sort(lmsOrder_).map(function(r){return lmsViewLesson_(r,true);})};
}
function lmsFindWorkspace_(course){
  var w=findRows_('lms_workspaces',function(r){return r.course_id===course.course_id;});
  require_(w.length===1&&w[0].workspace_id===course.workspace_id,
    'RECONCILIATION_REQUIRED','Workspace kursus belum konsisten.');
  return {workspace_id:w[0].workspace_id,course_id:course.course_id,
    name:w[0].name,workspace_status:w[0].workspace_status,
    auto_created:w[0].auto_created===true};
}
function lmsAdminRevisions_(p){
  var entity=String(p.entity||'').toUpperCase(),id=lmsId_(p.entity_id);
  require_(['COURSE','LESSON'].indexOf(entity)>=0,'VALIDATION',
    'Jenis versi tidak valid.');
  return readAll_('lms_revisions').filter(function(r){
    return r.entity===entity&&r.entity_id===id;
  }).slice(-30).reverse().map(function(r){
    return {revision_id:r.revision_id,entity:r.entity,entity_id:r.entity_id,
      version:Number(r.version),title:r.title,body:r.body,media_url:r.media_url,
      published_at:r.published_at,actor_id:r.actor_id};
  });
}
function lmsMemberDetail_(member,p){
  var course=lmsCourse_(p.course_id);
  require_(course.status==='PUBLISHED','NOT_FOUND','Kursus belum tersedia.');
  var access=lmsCanAccess_(member,course),lessons=findRows_('lms_lessons',function(r){
    return r.course_id===course.course_id&&r.status==='PUBLISHED';
  }).sort(lmsOrder_);
  var progress=findRows_('lms_progress',function(r){
    return r.member_id===member.member_id&&r.course_id===course.course_id;
  });
  return {course:lmsViewCourse_(course,false),access_granted:Boolean(access),
    lessons:access?lessons.map(function(r){
      var v=lmsViewLesson_(r,false);
      v.completed=progress.some(function(pr){
        return pr.lesson_id===r.lesson_id&&pr.status==='COMPLETED';
      });
      return v;
    }):[],completed:access?progress.filter(function(pr){
      return pr.status==='COMPLETED'&&lessons.some(function(l){return l.lesson_id===pr.lesson_id;});
    }).length:0,total:lessons.length};
}
function lmsEnroll_(member,p,requestId){
  return withLock_(function(){
    require_(member.role==='MEMBER','FORBIDDEN','Hanya member dapat mengikuti kursus.');
    var c=lmsCourse_(p.course_id);
    require_(c.status==='PUBLISHED'&&lmsCanAccess_(member,c),
      'FORBIDDEN','Kursus belum tersedia untuk akun ini.');
    var old=findRows_('lms_enrollments',function(r){
      return r.member_id===member.member_id&&r.course_id===c.course_id;
    });
    require_(old.length<=1,'RECONCILIATION_REQUIRED','Pendaftaran kursus duplikat.');
    if(old.length){
      require_(old[0].status==='ACTIVE','CONFLICT','Pendaftaran belum aktif.');
      return {enrollment_id:old[0].enrollment_id,course_id:c.course_id,
        status:'ACTIVE',already_enrolled:true};
    }
    var row={enrollment_id:recordId_('ENR'),member_id:member.member_id,
      course_id:c.course_id,status:'ACTIVE',enrolled_at:now_(),
      last_access_at:now_(),completed_at:'',request_id:requestId};
    appendRow_('lms_enrollments',row);
    return {enrollment_id:row.enrollment_id,course_id:c.course_id,
      status:'ACTIVE',already_enrolled:false};
  });
}
function lmsComplete_(member,p,requestId){
  return withLock_(function(){
    require_(member.role==='MEMBER','FORBIDDEN','Hanya member dapat menyelesaikan materi.');
    var l=lmsLesson_(p.lesson_id),c=lmsCourse_(l.course_id);
    require_(c.status==='PUBLISHED'&&l.status==='PUBLISHED'&&
      lmsCanAccess_(member,c),'FORBIDDEN','Materi tidak tersedia untuk akun ini.');
    var enroll=findRows_('lms_enrollments',function(r){
      return r.member_id===member.member_id&&r.course_id===c.course_id&&
        r.status==='ACTIVE';
    });
    require_(enroll.length===1,'CONFLICT','Ikuti kursus terlebih dahulu.');
    var old=findRows_('lms_progress',function(r){
      return r.member_id===member.member_id&&r.lesson_id===l.lesson_id;
    });
    require_(old.length<=1,'RECONCILIATION_REQUIRED','Progres duplikat.');
    if(old.length)return {lesson_id:l.lesson_id,status:'COMPLETED',already_completed:true};
    appendRow_('lms_progress',{
      progress_id:recordId_('PRG'),member_id:member.member_id,
      course_id:c.course_id,lesson_id:l.lesson_id,status:'COMPLETED',
      started_at:now_(),completed_at:now_(),request_id:requestId
    });
    return {lesson_id:l.lesson_id,status:'COMPLETED',already_completed:false};
  });
}
function lmsMyEnrollments_(member){
  return readAll_('lms_enrollments').filter(function(r){
    return r.member_id===member.member_id;
  }).slice(-50).map(function(r){
    return {enrollment_id:r.enrollment_id,course_id:r.course_id,
      status:r.status,enrolled_at:r.enrolled_at,completed_at:r.completed_at};
  });
}
function lmsAiPrompt_(task,brief,course,lesson){
  var context='Kursus: '+course.title+'; Kategori: '+course.category+
    '; Level: '+course.level+'.';
  if(lesson)context+=' Pelajaran: '+lesson.title+'.';
  return 'Anda adalah asisten penyusun LMS UMKM. Buat DRAFT yang akurat dan '+
    'praktis dalam Bahasa Indonesia. Jangan membuat klaim seolah materi sudah '+
    'diterbitkan. Tugas: '+task+'. Konteks: '+context+' Kebutuhan: '+brief+
    '. Hasil berupa Markdown teks biasa. Jangan sertakan API key, token, '+
    'PIN, data pribadi member, atau janji hasil bisnis. '+
    'Admin wajib meninjau hasil sebelum dimasukkan ke materi.';
}
function lmsPrepareAIJob_(admin,p,requestId){
  return withLock_(function(){
    var c=lmsCourse_(p.course_id),workspace=lmsFindWorkspace_(c),
      task=String(p.task_type||'').toUpperCase(),
      brief=lmsText_(p.brief,1500,30,'Brief');
    require_(c.status!=='ARCHIVED','CONFLICT','Kursus diarsipkan.');
    require_(['COURSE_OUTLINE','LESSON_DRAFT','QUIZ_DRAFT'].indexOf(task)>=0,
      'VALIDATION','Jenis pekerjaan AI tidak dikenal.');
    var lesson=null;
    if(p.lesson_id){
      lesson=lmsLesson_(p.lesson_id);
      require_(lesson.course_id===c.course_id,'CONFLICT','Pelajaran bukan bagian kursus.');
    }
    var old=findRows_('lms_ai_jobs',function(r){return r.request_id===requestId;});
    require_(old.length<=1,'RECONCILIATION_REQUIRED','Job AI ganda.');
    if(old.length){
      require_(old[0].requested_by===admin.member_id&&
        old[0].course_id===c.course_id&&old[0].brief===brief&&
        old[0].task_type===task&&old[0].lesson_id===(lesson?lesson.lesson_id:''),
        'CONFLICT','ID permintaan digunakan untuk pekerjaan berbeda.');
      return lmsViewAIJob_(old[0]);
    }
    var row={job_id:recordId_('AIJ'),workspace_id:workspace.workspace_id,
      course_id:c.course_id,lesson_id:lesson?lesson.lesson_id:'',
      task_type:task,brief:brief,
      prompt:lmsAiPrompt_(task,brief,c,lesson),result_draft:'',
      status:'READY_FOR_LLM',created_at:now_(),updated_at:now_(),
      requested_by:admin.member_id,reviewed_by:'',request_id:requestId};
    appendRow_('lms_ai_jobs',row);
    return lmsViewAIJob_(row);
  });
}
function lmsViewAIJob_(r){
  return {job_id:r.job_id,workspace_id:r.workspace_id,
    course_id:r.course_id,lesson_id:r.lesson_id,task_type:r.task_type,
    brief:r.brief,prompt:r.prompt,status:r.status,result_draft:r.result_draft,
    created_at:r.created_at,updated_at:r.updated_at};
}
function lmsListAIJobs_(p){
  var id=lmsId_(p.course_id);
  return findRows_('lms_ai_jobs',function(r){return r.course_id===id;})
    .slice(-40).reverse().map(lmsViewAIJob_);
}
function lmsImportAIResult_(admin,p){
  return withLock_(function(){
    var r=byId_('lms_ai_jobs','job_id',lmsId_(p.job_id));
    require_(r,'NOT_FOUND','Pekerjaan AI tidak ditemukan.');
    var result=lmsText_(p.result_draft,12000,50,'Hasil AI');
    require_(r.status==='READY_FOR_LLM'||r.status==='FOR_REVIEW',
      'CONFLICT','Pekerjaan tidak menerima hasil baru.');
    updateRow_('lms_ai_jobs',r._row,{
      result_draft:result,status:'FOR_REVIEW',updated_at:now_(),
      reviewed_by:admin.member_id
    });
    return lmsViewAIJob_(byId_('lms_ai_jobs','job_id',r.job_id));
  });
}
function lmsCloseAIJob_(admin,p){
  return withLock_(function(){
    var r=byId_('lms_ai_jobs','job_id',lmsId_(p.job_id));
    require_(r,'NOT_FOUND','Pekerjaan AI tidak ditemukan.');
    var decision=String(p.decision||'').toUpperCase();
    require_(['APPROVED','REJECTED'].indexOf(decision)>=0,
      'VALIDATION','Keputusan tidak dikenal.');
    require_(r.status==='FOR_REVIEW','CONFLICT','Hasil belum tersedia untuk direview.');
    updateRow_('lms_ai_jobs',r._row,{
      status:decision,reviewed_by:admin.member_id,updated_at:now_()
    });
    // Approval flags the draft for MANUAL copying/editing, never publishes it.
    return lmsViewAIJob_(byId_('lms_ai_jobs','job_id',r.job_id));
  });
}

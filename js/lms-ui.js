/* LMS view layer — plain browser JavaScript, no build step, no API keys.
 * All text is escaped. Controller and permission checks live in app.js / GAS.
 */
(function(root){
'use strict';
function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
});}
function text(v){return e(v).replace(/\n/g,'<span class="lms-line-break"></span>');}
function label(v){return e(v||'-');}
function tag(v){return '<span class="chip">'+label(v)+'</span>';}
function btn(action,labelText,disabled,attr,cls){
  return '<button type="button" class="btn '+(cls||'btn-secondary')+
    ' btn-sm" data-lms-action="'+e(action)+'" '+(attr||'')+
    (disabled?' disabled title="LMS masih dalam mode pratinjau"':'')+
    '>'+e(labelText)+'</button>';
}
function field(name,title,value,type,extra){
  var val=e(value==null?'':value),id='lms-field-'+e(name);
  return '<div class="field"><label for="'+id+'">'+e(title)+'</label>'+
    (type==='textarea'?'<textarea class="input" id="'+id+'" name="'+e(name)+'" rows="'+(extra||4)+'">'+val+'</textarea>':
    '<input class="input" id="'+id+'" name="'+e(name)+'" type="'+(type||'text')+'" value="'+val+'" '+(extra||'')+'>')+'</div>';
}
function select(name,title,items,value){
  return '<div class="field"><label for="lms-field-'+e(name)+'">'+e(title)+'</label>'+
    '<select class="input" id="lms-field-'+e(name)+'" name="'+e(name)+'">'+
    items.map(function(item){return '<option value="'+e(item[0])+'"'+
      (String(item[0])===String(value)?' selected':'')+'>'+e(item[1])+'</option>';}).join('')+
    '</select></div>';
}
function fmt(v){if(!v)return '-';var d=new Date(v);return Number.isNaN(d.getTime())?'-':
  new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'Asia/Jakarta'}).format(d);}
function link(v){
  try{var u=new URL(String(v||''));
    var hosts=['classroom.google.com','youtube.com','www.youtube.com',
      'youtu.be','drive.google.com','docs.google.com'];
    return u.protocol==='https:'&&!u.username&&!u.password&&hosts.indexOf(u.hostname)>=0?u.href:'';
  }catch(_){return '';}
}
function courseTile(course,admin){
  return '<article class="surface lms-course-tile"><div class="lms-course-top">'+
    tag(course.category)+' '+tag(course.level)+' '+tag(course.status||'')+
    (course.access_granted===false?'<span class="chip">Akses terbatas</span>':'')+
    '</div><h3>'+e(course.title)+'</h3><p class="card-desc">'+e(course.summary)+'</p>'+
    '<div class="lms-meta"><span>'+e(course.access_type==='PRODUCT'?'Khusus pembeli':'Semua member')+'</span>'+
    (course.unpublished_changes?'<span>Draft belum diterbitkan</span>':'')+'</div>'+
    btn('open-course',admin?'Kelola kursus':'Buka kursus',false,
      ' data-course-id="'+e(course.course_id)+'"','btn-secondary')+'</article>';
}
function memberCatalog(courses,enrollments,legacy){
  var list=Array.isArray(courses)?courses:[],old=Array.isArray(legacy)?legacy:[];
  return '<section class="lms-heading"><p class="eyebrow">NGULIK DIGITAL / LMS</p>'+
    '<h2>Kelas dan perjalanan belajar</h2>'+
    '<p class="lead">Belajar dengan kurikulum bertahap, progress per pelajaran dan ruang belajar pribadi.</p></section>'+
    '<div class="lms-stats"><div class="surface"><strong>'+list.length+'</strong><small>Kursus diterbitkan</small></div>'+
    '<div class="surface"><strong>'+(enrollments||[]).length+'</strong><small>Kelas yang diikuti</small></div></div>'+
    (list.length?'<div class="lms-course-grid">'+list.map(function(c){return courseTile(c,false);}).join('')+'</div>':
      '<div class="surface lms-empty"><h3>Kursus LMS belum diterbitkan</h3>'+
      '<p>Admin sedang menyiapkan kurikulum baru. Modul pengantar lama tetap tersedia di bawah.</p></div>')+
    (old.length?'<section class="section-gap"><h3>Modul pengantar</h3><p class="card-desc">Materi lama dari Google Classroom dipertahankan selama transisi.</p>'+
      '<div class="stack">'+old.map(function(m,i){
        var target=link(m.url_classroom);
        return '<article class="surface lms-legacy-row"><div><strong>'+e(m.judul)+'</strong><p class="card-desc">'+e(m.deskripsi)+'</p></div>'+
          (target?'<a class="btn btn-secondary btn-sm" href="'+e(target)+'" rel="noopener noreferrer" target="_blank">Buka materi</a>':
          '<span class="chip">Materi menyusul</span>')+'</article>';}).join('')+'</div></section>':'');
}
function memberCourse(detail,enrollments,canWrite){
  if(!detail)return '<div class="surface lms-empty"><h3>Memuat kelas…</h3><p>Pilih kursus dari halaman Belajar.</p></div>';
  var c=detail.course||{},access=detail.access_granted!==false;
  var enrolled=(enrollments||[]).some(function(x){return x.course_id===c.course_id&&x.status==='ACTIVE';});
  var lessons=detail.lessons||[];
  return '<button type="button" class="btn btn-ghost btn-sm lms-back-link" data-route="belajar">Kembali ke daftar kelas</button>'+
    '<section class="lms-heading"><p class="eyebrow">RUANG BELAJAR MEMBER</p><h2>'+e(c.title)+'</h2>'+
    '<p class="lead">'+e(c.summary)+'</p><div class="lms-course-top">'+tag(c.level)+' '+tag(c.category)+'</div></section>'+
    (!access?'<section class="surface lms-empty"><h3>Materi memerlukan akses produk</h3>'+
      '<p>Hubungi admin atau periksa status pembelian dan masa aktif produk yang terkait dengan kursus.</p></section>':
      '<div class="lms-stats"><div class="surface"><strong>'+Number(detail.completed||0)+'/'+Number(detail.total||0)+'</strong><small>Pelajaran selesai</small></div>'+
      '<div class="surface"><strong>'+(enrolled?'Aktif':'Belum')+'</strong><small>Pendaftaran belajar</small></div></div>'+
      (!enrolled?'<div class="surface lms-callout"><h3>Mulai kursus ini</h3>'+
        '<p>Pendaftaran kelas membuat ruang progres Anda secara otomatis. Tidak ada biaya tambahan dari proses ini.</p>'+
        btn('enroll','Ikuti kursus',!canWrite,' data-course-id="'+e(c.course_id)+'"','btn-primary')+'</div>':'')+
      '<div class="lms-lessons">'+lessons.map(function(l,i){
        var url=link(l.media_url);
        return '<article class="surface lms-lesson-card"><div class="lms-lesson-head"><span class="lms-step">'+(i+1)+'</span>'+
          '<div><h3>'+e(l.title)+'</h3><p class="small muted">'+e(l.kind||'ARTICLE')+
            ' · '+e(l.duration_minutes||10)+' menit</p></div>'+
          '<span class="chip">'+(l.completed?'Selesai':'Belum selesai')+'</span></div>'+
          '<div class="lms-body">'+text(l.body||'')+'</div>'+
          (url?'<a class="btn btn-secondary btn-sm" href="'+e(url)+'" target="_blank" rel="noopener noreferrer">Buka referensi resmi</a>':'')+
          (!l.completed?btn('complete','Tandai selesai',!canWrite||!enrolled,
            ' data-lesson-id="'+e(l.lesson_id)+'"','btn-primary'):'')+'</article>';
      }).join('')+'</div>');
}
function memberSuccess(record){
  if(!record)return '<section class="surface lms-empty"><h3>Belum ada pelajaran yang baru diselesaikan</h3>'+
    '<p>Mulai dari kelas yang tersedia untuk melihat perjalanan belajar Anda.</p>'+
    '<button type="button" class="btn btn-primary" data-route="belajar">Lihat semua kelas</button></section>';
  var completed=Math.max(0,Number(record.completed)||0),
    total=Math.max(0,Number(record.total)||0);
  return '<section class="member-success" aria-labelledby="success-title">'+
    '<div class="member-success-art" aria-hidden="true">'+
      '<span class="success-spark success-spark-a">✦</span>'+
      '<span class="success-spark success-spark-b">✳</span>'+
      '<span class="success-spark success-spark-c">✦</span>'+
      '<span class="success-spark success-spark-d">✷</span>'+
      '<div class="member-success-mark"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg></div>'+
    '</div>'+
    '<p class="eyebrow">SATU LANGKAH BERHASIL</p>'+
    '<h2 id="success-title">Pelajaran selesai!</h2>'+
    '<p class="member-success-lead">'+
      (record.preview?'Ini contoh layar konfirmasi; progres tidak disimpan.':
        'Progres belajar kamu sudah tercatat. Teruskan langkah baik ini!')+
    '</p>'+
    '<div class="member-success-receipt"><div class="member-success-receipt-head">'+
      '<span>AKTIVITAS BELAJAR</span>'+tag(record.preview?'CONTOH':'TERCATAT')+'</div>'+
      '<strong>'+e(record.title)+'</strong>'+
      '<div class="member-success-result"><span>Pelajaran selesai</span><strong>'+
        e(completed)+' / '+e(total)+'</strong></div></div>'+
    '<div class="member-success-actions">'+
      '<button type="button" class="btn btn-primary" data-route="lms-course">Kembali ke kelas <span aria-hidden="true">↗</span></button>'+
      '<button type="button" class="btn btn-secondary" data-route="belajar">Jelajahi kelas lain</button>'+
    '</div></section>';
}
function adminCatalog(courses,canWrite,products){
  var list=Array.isArray(courses)?courses:[];
  return '<section class="lms-heading"><p class="eyebrow">ADMIN / LMS STUDIO</p>'+
    '<h2>Kelola kursus dan kurikulum</h2><p class="lead">Buat struktur kelas, draft materi, tinjau hasil AI, lalu publikasikan secara terkendali.</p></section>'+
    '<div class="lms-stats"><div class="surface"><strong>'+list.length+'</strong><small>Kursus tercatat</small></div>'+
    '<div class="surface"><strong>'+list.filter(function(x){return x.status==='PUBLISHED';}).length+
      '</strong><small>Sudah diterbitkan</small></div>'+
    '<div class="surface"><strong>'+list.filter(function(x){return x.status==='DRAFT';}).length+
      '</strong><small>Masih draft</small></div></div>'+
    '<section class="surface lms-editor-section"><h3>Buat kursus baru</h3>'+
      '<p class="card-desc">Workspace penulisan otomatis dibuat saat kursus disimpan. Tidak perlu membuat folder atau tabel terpisah untuk setiap kursus.</p>'+
      courseForm(null,canWrite,products)+'</section>'+
    '<section class="section-gap"><h3>Daftar kursus</h3>'+
      (list.length?'<div class="lms-course-grid">'+list.map(function(c){return courseTile(c,true);}).join('')+'</div>':
      '<div class="surface lms-empty">Belum ada kursus. Formulir di atas siap dipakai ketika backend LMS staging diaktifkan.</div>')+'</section>';
}
function courseForm(c,canWrite,products){
  var r=c||{},items=[['','Tidak memakai produk']].concat((products||[]).map(function(p){
    return [p.product_id,p.nama];}));
  return '<form id="lms-course-form" class="lms-form" data-edit-mode="'+(c?'edit':'create')+'">'+
    field('title','Judul kursus',r.title||'','text','required minlength="6" maxlength="140"')+
    field('summary','Deskripsi dan tujuan belajar',r.summary||'','textarea','4')+
    '<div class="lms-form-grid">'+field('category','Kategori',r.category||'UMKM','text','required maxlength="60"')+
    select('level','Tingkat',[['PEMULA','Pemula'],['MENENGAH','Menengah'],['LANJUTAN','Lanjutan']],r.level||'PEMULA')+
    select('access_type','Jenis akses',[['MEMBER','Semua member'],['PRODUCT','Pemilik produk']],r.access_type||'MEMBER')+
    select('product_id','Produk terkait',items,r.product_id||'')+
    field('sort_order','Urutan',r.sort_order||100,'number','min="1" max="9999" required')+'</div>'+
    '<button class="btn btn-primary" type="submit" '+(!canWrite?'disabled title="CRUD LMS belum diaktifkan"':'')+'>'+
      (c?'Simpan perubahan draft':'Buat kursus &amp; workspace')+'</button></form>';
}
function lessonForm(lesson,canWrite,courseId){
  var l=lesson||{};
  return '<form id="lms-lesson-form" class="lms-form" data-edit-mode="'+(lesson?'edit':'create')+'">'+
    field('title','Judul pelajaran',l.title||'','text','required minlength="6" maxlength="140"')+
    field('body','Isi materi (teks atau Markdown sebagai teks biasa)',l.body||'','textarea','9')+
    '<div class="lms-form-grid">'+
    select('kind','Jenis materi',[['ARTICLE','Artikel'],['VIDEO','Video'],['CLASSROOM','Classroom'],['PRACTICE','Praktik']],l.kind||'ARTICLE')+
    field('media_url','Tautan referensi HTTPS (opsional)',l.media_url||'','url','maxlength="600"')+
    field('duration_minutes','Durasi (menit)',l.duration_minutes||10,'number','min="1" max="360" required')+
    field('sort_order','Urutan',l.sort_order||100,'number','min="1" max="9999" required')+'</div>'+
    '<p class="small muted">Perubahan tersimpan sebagai draft. Materi yang sudah terbit tidak berubah sampai Anda mempublikasikannya lagi.</p>'+
    '<button type="submit" class="btn btn-primary" '+(!canWrite?'disabled':'')+'>'+
      (lesson?'Simpan revisi draft':'Tambah pelajaran')+'</button></form>';
}
function adminEditor(detail,jobs,canWrite,products){
  if(!detail)return '<div class="surface lms-empty"><h3>Memuat ruang kursus…</h3></div>';
  var c=detail.course||{},w=detail.workspace||{},lessons=detail.lessons||[];
  return '<button class="btn btn-ghost btn-sm" data-route="lms">Kembali ke seluruh kursus</button>'+
    '<section class="lms-heading"><p class="eyebrow">WORKSPACE / '+e(w.workspace_id||'')+'</p>'+
      '<h2>'+e(c.title)+'</h2><p class="lead">'+e(c.summary)+'</p>'+
      '<div class="lms-course-top">'+tag(c.status)+' '+tag('Versi '+c.version)+
      (c.unpublished_changes?tag('Ada draft baru'):'')+'</div></section>'+
    '<div class="lms-workspace-layout"><div class="lms-main-column">'+
    '<section class="surface lms-editor-section"><div class="lms-section-heading"><h3>Pengaturan kursus</h3>'+
      '<div class="lms-actions">'+btn('publish-course','Terbitkan kursus',!canWrite||c.status==='ARCHIVED','','btn-secondary')+
      (c.status==='ARCHIVED'?btn('restore-course','Pulihkan draft',!canWrite):
        btn('archive-course','Arsipkan',!canWrite))+'</div></div>'+
      courseForm(c,canWrite&&c.status!=='ARCHIVED',products)+'</section>'+
    '<section class="surface lms-editor-section"><div class="lms-section-heading"><h3>Pelajaran & urutan</h3>'+
      '<p class="small muted">'+lessons.length+' pelajaran</p></div>'+
      '<div class="lms-items">'+lessons.map(function(l,i){
        return '<div class="lms-item"><div class="lms-step">'+(i+1)+'</div><div class="lms-item-copy"><strong>'+e(l.title)+'</strong>'+
        '<small>'+e(l.kind)+' · '+e(l.duration_minutes)+' menit · '+e(l.status)+
        (l.unpublished_changes?' · draft berubah':'')+'</small></div>'+
        btn('edit-lesson','Edit',false,' data-lesson-id="'+e(l.lesson_id)+'"')+
        btn('publish-lesson','Terbitkan',!canWrite||l.status==='ARCHIVED',
          ' data-lesson-id="'+e(l.lesson_id)+'"')+
        (l.status==='ARCHIVED'?btn('restore-lesson','Pulihkan',!canWrite,
          ' data-lesson-id="'+e(l.lesson_id)+'"'):
          btn('archive-lesson','Arsip',!canWrite,
          ' data-lesson-id="'+e(l.lesson_id)+'"'))+'</div>';
      }).join('')+'</div>'+
      '<h4>Tambah pelajaran baru</h4>'+lessonForm(null,canWrite&&c.status!=='ARCHIVED',c.course_id)+'</section></div>'+
    '<aside class="lms-aside-column"><section class="surface lms-editor-section">'+
      '<p class="card-kicker">WORKSPACE OTOMATIS</p><h3>'+e(w.name||'Ruang penulisan')+'</h3>'+
      '<p class="card-desc">Dibuat bersama kursus, mengelola revisi dan pekerjaan AI. Tidak ada panggilan model berbayar.</p>'+
      '<div class="lms-meta">'+tag(w.workspace_status||'ACTIVE')+tag('Tanpa API key')+'</div></section>'+
    '<section class="surface lms-editor-section"><p class="card-kicker">ANTRIAN AI (BELUM DIEKSEKUSI)</p>'+
      '<h3>Brief untuk LLM</h3>'+
      '<p class="card-desc">Siapkan instruksi untuk model AI masa depan. Hasilnya wajib ditinjau, tidak langsung masuk pelajaran.</p>'+
      '<form id="lms-ai-form" class="lms-form">'+
      select('task_type','Jenis pekerjaan',[['COURSE_OUTLINE','Kerangka kursus'],
        ['LESSON_DRAFT','Draft pelajaran'],['QUIZ_DRAFT','Draft kuis']], 'COURSE_OUTLINE')+
      field('brief','Brief atau target materi','','textarea','5')+
      '<button class="btn btn-secondary" type="submit" '+(!canWrite?'disabled':'')+'>Simpan pekerjaan AI</button></form>'+
      '<div class="lms-items">'+(jobs||[]).map(function(j){
        return '<article class="lms-ai-job"><strong>'+e(j.task_type)+'</strong> '+tag(j.status)+
          '<p class="small muted">'+e(j.brief)+'</p>'+
          btn('open-job','Lihat prompt & hasil',false,' data-job-id="'+e(j.job_id)+'"')+'</article>';
      }).join('')+'</div></section></aside></div>';
}
function lessonEditor(lesson,canWrite){
  return '<button class="btn btn-ghost btn-sm" data-route="lms-editor">Kembali ke workspace</button>'+
    '<section class="lms-heading"><p class="eyebrow">EDITOR / PELAJARAN</p><h2>'+
      e(lesson?lesson.title:'Pelajaran baru')+'</h2>'+
      '<p>Materi draft dan versi yang terlihat oleh member dipisahkan agar pembaruan tidak memotong proses belajar.</p></section>'+
    '<section class="surface lms-editor-section">'+lessonForm(lesson,canWrite,'')+'</section>';
}
function aiJob(job,canWrite){
  if(!job)return '<div class="surface lms-empty">Pilih antrean AI dari workspace kursus.</div>';
  return '<button class="btn btn-ghost btn-sm" data-route="lms-editor">Kembali ke workspace</button>'+
    '<section class="lms-heading"><p class="eyebrow">KONTEN AI / REVIEW MANUAL</p><h2>'+e(job.task_type)+'</h2>'+
    '<p>Hasil AI tidak ditampilkan ke peserta dan tidak diterbitkan otomatis.</p></section>'+
    '<section class="surface lms-editor-section"><h3>Prompt yang disiapkan</h3>'+
      '<div class="lms-body">'+text(job.prompt)+'</div>'+
      btn('copy-ai-prompt','Salin prompt',false,'','btn-secondary')+'</section>'+
    '<section class="surface lms-editor-section"><h3>Masukkan hasil LLM untuk ditinjau</h3>'+
      '<form id="lms-ai-result-form" class="lms-form">'+
      field('result_draft','Draft teks AI',job.result_draft||'','textarea','10')+
      '<button class="btn btn-primary" type="submit" '+(!canWrite||!['READY_FOR_LLM','FOR_REVIEW'].includes(job.status)?'disabled':'')+
      '>Simpan hasil untuk review</button></form>'+
      '<div class="lms-actions">'+btn('approve-ai','Setujui draft',!canWrite||job.status!=='FOR_REVIEW')+
      btn('reject-ai','Tolak draft',!canWrite||job.status!=='FOR_REVIEW')+'</div>'+
      '<p class="small muted">Disetujui hanya berarti siap disalin/diedit manusia; tidak ada perubahan otomatis ke pelajaran atau rilis.</p></section>';
}
root.NGD_LMS_UI=Object.freeze({
  memberCatalog:memberCatalog,memberCourse:memberCourse,memberSuccess:memberSuccess,
  adminCatalog:adminCatalog,adminEditor:adminEditor,
  lessonEditor:lessonEditor,aiJob:aiJob
});
})(window);

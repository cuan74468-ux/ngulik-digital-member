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
    (disabled?' disabled title="Edit materi belum tersedia"':'')+
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
// LMS lesson references retain their original trusted-host allowlist.
function link(v){
  try{var u=new URL(String(v||''));
    var hosts=['classroom.google.com','youtube.com','www.youtube.com',
      'youtu.be','drive.google.com','docs.google.com'];
    return u.protocol==='https:'&&!u.username&&!u.password&&hosts.indexOf(u.hostname)>=0?u.href:'';
  }catch(_){return '';}
}
// Member Portal is curated by the owner in modul_belajar; external official
// government and training sites require a wider HTTPS validator than LMS lessons.
function portalLink_(v){
  try{var u=new URL(String(v||''));
    return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.indexOf('.')>0&&
      !/^(?:localhost|\d+\.\d+\.\d+\.\d+)$/i.test(u.hostname)?u.href:'';
  }catch(_){return '';}
}

function courseTile(course,admin,enrolled){
  var title=e(course.title||'Kursus'),status=String(course.status||'').toUpperCase();
  var active=Boolean(enrolled),locked=course.access_granted===false;
  var labelText=admin?(status==='PUBLISHED'?'Terbit':'Draft'):
    locked?'Akses khusus':active?'Sedang diikuti':'Siap dimulai';
  var actionText=admin?'Kelola kelas':active?'Lanjutkan kelas':locked?'Lihat detail':'Lihat kurikulum';
  return '<article class="surface lms-course-tile" data-course-state="'+(active?'active':'available')+
    '" data-course-search="'+e((String(course.title||'')+' '+String(course.category||'')+' '+String(course.summary||'')).toLocaleLowerCase('id-ID'))+'">'+
    '<div class="learning-course-art" aria-hidden="true"><div class="learning-course-symbol">'+
    '<span></span><span></span><span></span></div><span class="learning-art-index">NGULIK / KELAS</span></div>'+
    '<div class="learning-course-copy"><div class="lms-course-top">'+
    '<span class="learning-course-category">'+e(course.category||'Kelas praktis')+'</span>'+
    '<span class="learning-status'+(active?' is-active':'')+'">'+e(labelText)+'</span></div>'+
    '<h3>'+title+'</h3><p class="card-desc">'+e(course.summary||'Materi singkat yang bisa langsung Anda praktikkan.')+'</p>'+
    '<div class="learning-course-footer"><span class="learning-course-level">'+
    e(course.level||'Semua tingkat')+'</span>'+
    btn('open-course',actionText,false,' data-course-id="'+e(course.course_id)+'"','btn-secondary')+
    '</div></div></article>';
}
// Member Portal is informational, never an affiliate shop or checkout.
function portalGroup_(m){
  var id=String(m.modul_id||''),name=String(m.judul||'');
  if(/^KUR-A1-/.test(id)||/^\[AI & Digital Marketing\]/i.test(name))return 'ai';
  if(/^KUR-A2-/.test(id)||/^\[Bisnis & Keuangan UMKM\]/i.test(name))return 'bisnis';
  if(/^KUR-A3-/.test(id)||/^\[Fasilitas Resmi UMKM\]/i.test(name))return 'fasilitas';
  return 'internal';
}
function memberPortal_(old){
  var resources=Array.isArray(old)?old:[];
  var disclosure='Ngulik Digital hanya berperan sebagai kurator dan penghubung informasi. Semua kelas, layanan, akun, jadwal, biaya tambahan bila ada, serta sertifikat berada di bawah ketentuan masing-masing penyedia. Anda akan membuka situs penyedia di tab baru; tidak ada checkout atau komisi affiliate dari halaman ini.';
  var groups=[
    {id:'internal',title:'Materi Internal Ngulik Digital',hint:'Panduan pengantar dan materi dari tim Ngulik Digital.'},
    {id:'ai',title:'AI & Digital Marketing',hint:'Belajar membuat konten dan mempromosikan usaha.'},
    {id:'bisnis',title:'Bisnis & Keuangan UMKM',hint:'Mengelola usaha, keuangan, dan pengembangan bisnis.'},
    {id:'fasilitas',title:'Fasilitas Resmi UMKM',hint:'Informasi dan layanan pemerintah atau penyedia resmi.'}
  ];
  var count=resources.length;
  return '<section class="learning-portal-page" aria-labelledby="member-portal-heading">'+
    '<header class="learning-portal-hero">'+
      '<div><p class="eyebrow">FASILITAS GRATIS / KHUSUS MEMBER</p>'+
      '<h2 id="member-portal-heading">Portal Belajar & Fasilitas UMKM</h2>'+
      '<p>Temukan panduan, kelas, dan layanan yang bisa membantu usaha Anda. Pilih topik, lalu buka situs penyedianya. Tanpa checkout Ngulik Digital.</p>'+
      '<div class="learning-portal-hero-actions"><button type="button" class="btn btn-secondary" data-route="belajar">← Kembali ke Kelas Saya</button>'+
      '<span class="learning-portal-total">'+count+' materi dan tautan kurasi</span></div></div>'+
    '</header>'+
    '<div class="learning-portal-disclaimer" role="note" aria-label="Disclaimer resmi">'+
      '<strong>Informasi penting sebelum membuka tautan</strong><p>'+e(disclosure)+
      ' Seluruh syarat, jadwal, kuota, dan ketentuan sertifikat mengikuti kebijakan penyedia layanan terkait.</p>'+
    '</div>'+
    (count?
      '<div class="learning-portal-tools">'+
        '<label class="learning-portal-search"><span>Cari materi atau layanan</span><input id="learning-portal-search" type="search" autocomplete="off" placeholder="Contoh: AI, pemasaran, KUR, NIB…" aria-label="Cari materi dan layanan gratis"></label>'+
        '<div class="learning-portal-filters" role="group" aria-label="Filter kategori portal">'+
          '<button type="button" data-portal-filter="all" aria-pressed="true">Semua</button>'+
          groups.map(function(g){return '<button type="button" data-portal-filter="'+g.id+'" aria-pressed="false">'+e(g.title)+'</button>';}).join('')+
        '</div><p class="learning-portal-result" role="status" aria-live="polite">Menampilkan '+count+' materi dan tautan</p>'+
      '</div>'+
      '<div class="learning-portal-groups">'+groups.map(function(group){
        var items=resources.filter(function(m){return portalGroup_(m)===group.id;});
        if(!items.length)return '';
        return '<section class="learning-portal-group" data-portal-group="'+group.id+'" aria-label="'+e(group.title)+'">'+
          '<div class="learning-portal-group-head"><div><h3>'+e(group.title)+'</h3><p>'+e(group.hint)+'</p></div><span>'+items.length+' pilihan</span></div>'+
          '<div class="learning-legacy-list">'+items.map(function(m,i){
            var target=portalLink_(m.url_classroom);
            var cleanName=String(m.judul||'').replace(/^\[(?:AI & Digital Marketing|Bisnis & Keuangan UMKM|Fasilitas Resmi UMKM)\]\s*/,'');
            var searchText=(cleanName+' '+String(m.deskripsi||'')).toLocaleLowerCase('id-ID');
            return '<article class="learning-legacy-row" data-portal-item data-portal-category="'+group.id+'" data-portal-search="'+e(searchText)+'">'+
              '<span class="learning-legacy-no">'+String(i+1).padStart(2,'0')+'</span>'+
              '<div class="learning-legacy-copy"><h4>'+e(cleanName)+'</h4><p>'+e(m.deskripsi||'')+'</p></div>'+
              (target?'<a class="btn btn-secondary btn-sm" href="'+e(target)+'" rel="noopener noreferrer external" target="_blank" aria-label="Buka situs resmi penyedia '+e(cleanName)+'">Buka Situs Resmi ↗</a>':
                '<span class="chip">Tautan tidak tersedia</span>')+'</article>';
          }).join('')+'</div></section>';
      }).join('')+'</div><p class="learning-portal-empty" hidden role="status">Tidak ada materi sesuai pencarian. Coba kategori atau kata lain.</p>':
      '<section class="learning-portal-empty-state"><h3>Belum ada materi yang ditampilkan</h3><p>Materi portal akan muncul di sini setelah diterbitkan oleh pengelola.</p></section>')+
  '</section>';
}
function memberCatalog(courses,enrollments,legacy){
  var list=Array.isArray(courses)?courses:[],joined=Array.isArray(enrollments)?enrollments:[],
    old=Array.isArray(legacy)?legacy:[];
  var activeCourseIds=joined.filter(function(x){return x&&x.status==='ACTIVE';})
    .map(function(x){return x.course_id;});
  var active=list.filter(function(x){return activeCourseIds.indexOf(x.course_id)>=0;});
  var next=active[0]||null;
  return '<div class="learning-dashboard">'+
    '<section class="learning-intro"><div class="learning-intro-copy">'+
    '<span class="learning-overline"><span class="learning-overline-dot"></span> RUANG MEMBER / KELAS SAYA</span>'+
    '<h2>'+(next?'Lanjutkan pembelajaran Anda.':'Bangun keterampilan, satu kelas demi satu.')+'</h2>'+
    '<p>'+(next?'Anda sudah mengikuti kelas. Lanjutkan dari materi berikutnya dan simpan progres belajar.':'Temukan materi yang berguna bagi usaha Anda, mulai belajar, lalu praktikkan secara bertahap.')+'</p>'+
    '<div class="learning-intro-actions">'+
    (next?btn('open-course','Lanjutkan kelas',false,' data-course-id="'+e(next.course_id)+'"','btn-primary')+
      '<span class="learning-next-hint">'+e(next.title)+'</span>':
      '<span class="learning-next-hint">Pilih kelas untuk mulai belajar.</span>')+
    '</div></div>'+
    '<div class="learning-intro-aside" aria-label="Ringkasan kelas Anda">'+
    '<span class="learning-aside-label">KELAS SAYA</span>'+
    '<div class="learning-aside-value">'+active.length+'<span> / '+list.length+'</span></div>'+
    '<p>Kelas yang Anda ikuti</p>'+
    '<div class="learning-intro-rule" aria-hidden="true"><span></span><span></span><span></span></div>'+
    '</div></section>'+
    '<div class="learning-section-head"><div><p class="eyebrow">PILIHAN KELAS</p>'+
    '<h3>Cari Kelas yang Cocok</h3><p>Mulai dari topik yang paling Anda butuhkan.</p></div>'+
    '<span class="learning-course-count">'+list.length+' kelas tersedia</span></div>'+
    (list.length?
      '<div class="learning-toolbar" aria-label="Filter kelas">'+
      '<div class="learning-filter-group" role="group" aria-label="Status kelas">'+
      '<button type="button" class="learning-filter" data-lms-filter="all" aria-pressed="true">Semua kelas</button>'+
      '<button type="button" class="learning-filter" data-lms-filter="active" aria-pressed="false">Sedang diikuti</button>'+
      '<button type="button" class="learning-filter" data-lms-filter="available" aria-pressed="false">Kelas lainnya</button></div>'+
      '<label class="learning-search"><span aria-hidden="true">⌕</span>'+
      '<input id="learning-course-search" type="search" autocomplete="off" placeholder="Cari kelas atau topik" aria-label="Cari kelas"></label></div>'+
      '<div class="lms-course-grid learning-course-grid">'+list.map(function(c){
        return courseTile(c,false,activeCourseIds.indexOf(c.course_id)>=0);
      }).join('')+'</div>'+
      '<p class="learning-filter-empty" hidden role="status">Kelas tidak ditemukan. Coba kata lain.</p>':
      '<div class="surface lms-empty learning-empty">'+
      '<h3>Kelas Belum Tersedia</h3>'+
      '<p>Kelas baru akan muncul di sini.</p></div>')+
    '<section class="learning-portal-promo" aria-label="Portal belajar gratis">'+
      '<div><p class="eyebrow">SUMBER BELAJAR TAMBAHAN</p><h3>Butuh referensi gratis dari luar kelas?</h3><p>Jelajahi Materi Pengantar dan layanan resmi UMKM. Ini portal tautan, bukan kelas dengan progres, dan tidak memerlukan checkout.</p></div>'+
      '<button type="button" class="btn btn-secondary" data-route="portal">Buka Portal Gratis ↗</button></section>'+
    '</div>';
}
function memberCourse(detail,enrollments,canWrite){
  if(!detail)return '<div class="surface lms-empty"><h3>Memuat kelas…</h3><p>Pilih kelas dari halaman Belajar.</p></div>';
  var c=detail.course||{},access=detail.access_granted!==false,
    enrolled=(enrollments||[]).some(function(x){return x.course_id===c.course_id&&x.status==='ACTIVE';}),
    lessons=Array.isArray(detail.lessons)?detail.lessons:[],
    total=Math.max(lessons.length,Number(detail.total)||0),
    done=Math.max(0,Math.min(total,Number(detail.completed)||0)),
    percent=total?Math.round(done/total*100):0;
  var nextIndex=lessons.findIndex(function(l){return l.completed!==true;});
  if(nextIndex<0)nextIndex=0;
  return '<div class="learning-reader">'+
    '<button type="button" class="learning-reader-back" data-route="belajar">← Semua kelas</button>'+
    '<header class="learning-reader-header"><div>'+
    '<p class="eyebrow">KELAS / '+e(c.category||'KURSUS')+'</p>'+
    '<h2>'+e(c.title)+'</h2><p>'+e(c.summary||'')+'</p>'+
    '</div><div class="learning-reader-progress" aria-label="'+percent+' persen pelajaran selesai">'+
    '<strong>'+percent+'%</strong><span>'+done+' dari '+total+' pelajaran</span>'+
    '<div class="progress-track" role="progressbar" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100" aria-label="Progres kelas">'+
    '<span style="width:'+percent+'%"></span></div></div></header>'+
    (!access?'<section class="surface lms-empty"><h3>Kelas Ini Belum Bisa Dibuka</h3>'+
      '<p>Cek akses kelas Anda atau hubungi Admin.</p>'+
      '<button type="button" class="btn btn-secondary" data-route="katalog">Lihat katalog</button></section>':
      (!enrolled?'<section class="learning-enroll-callout"><div>'+
        '<span class="eyebrow">MULAI BELAJAR</span><h3>Mulai Belajar di Kelas Ini</h3>'+
        '<p>Gabung kelas untuk menyimpan progres belajar.</p></div>'+
        btn('enroll','Mulai kelas',!canWrite,' data-course-id="'+e(c.course_id)+'"','btn-primary')+'</section>':'')+
      '<div class="learning-reader-layout">'+
      '<aside class="learning-lesson-sidebar" aria-label="Daftar pelajaran">'+
        '<div class="learning-lesson-sidebar-heading"><span class="eyebrow">ISI KELAS</span>'+
        '<strong>'+lessons.length+' pelajaran</strong></div>'+
        (lessons.length?'<nav class="learning-lesson-nav" aria-label="Pilih pelajaran">'+
          lessons.map(function(l,i){return '<button type="button" class="learning-lesson-nav-item'+
            (i===nextIndex?' is-current':'')+(l.completed?' is-complete':'')+
            '" data-lms-lesson-open="'+i+'" aria-current="'+(i===nextIndex?'step':'false')+'">'+
            '<span class="learning-lesson-index">'+(l.completed?'✓':String(i+1).padStart(2,'0'))+'</span>'+
            '<span class="learning-lesson-label"><strong>'+e(l.title||'Pelajaran '+(i+1))+'</strong>'+
            '<small>'+e(l.kind||'ARTICLE')+' · '+e(l.duration_minutes||10)+' menit</small></span>'+
            '</button>';}).join('')+'</nav>':
          '<p class="learning-empty-note">Materi pelajaran belum tersedia.</p>')+
        '</aside><div class="learning-lesson-stage">'+
        (lessons.length?lessons.map(function(l,i){
          var url=link(l.media_url);
          return '<article class="learning-lesson-panel" data-lms-panel="'+i+'"'+
            (i===nextIndex?'':' hidden')+'>'+
            '<div class="learning-lesson-overline">PELAJARAN '+String(i+1).padStart(2,'0')+
            ' / '+String(lessons.length).padStart(2,'0')+
            (l.completed?' · SELESAI':' · DALAM PROSES')+'</div>'+
            '<h3>'+e(l.title||'Pelajaran')+'</h3>'+
            '<p class="learning-lesson-duration">'+e(l.kind||'ARTICLE')+' · '+e(l.duration_minutes||10)+' menit membaca</p>'+
            '<div class="lms-body learning-lesson-body">'+text(l.body||'Konten materi akan tersedia setelah diterbitkan.')+'</div>'+
            (url?'<a class="learning-resource-link" href="'+e(url)+'" target="_blank" rel="noopener noreferrer">Lihat referensi pelajaran ↗</a>':'')+
            '<div class="learning-lesson-actions">'+
            (l.completed?'<span class="learning-complete-label">✓ Pelajaran selesai</span>':
              btn('complete','Tandai selesai',!canWrite||!enrolled,
                ' data-lesson-id="'+e(l.lesson_id)+'"','btn-primary'))+
            (i<lessons.length-1?'<button class="btn btn-secondary" type="button" data-lms-next="'+(i+1)+'">Berikutnya →</button>':'')+
            '</div></article>';
        }).join(''):
          '<div class="learning-empty-note">Belum ada materi yang bisa dibaca.</div>')+
        '</div></div>')+
    '</div>';
}
function memberSuccess(record){
  if(!record)return '<section class="surface lms-empty"><h3>Belum Ada Pelajaran Selesai</h3>'+
    '<p>Pilih kelas dan mulai belajar.</p>'+
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
    '<p class="eyebrow">KERJA BAGUS!</p>'+
    '<h2 id="success-title">Pelajaran Selesai!</h2>'+
    '<p class="member-success-lead">'+
      (record.preview?'Progres belajar belum tercatat.':
        'Progres belajar kamu sudah tercatat. Teruskan langkah baik ini!')+
    '</p>'+
    '<div class="member-success-receipt"><div class="member-success-receipt-head">'+
      '<span>AKTIVITAS BELAJAR</span>'+tag(record.preview?'BELUM TERCATAT':'TERCATAT')+'</div>'+
      '<strong>'+e(record.title)+'</strong>'+
      '<div class="member-success-result"><span>Pelajaran selesai</span><strong>'+
        e(completed)+' / '+e(total)+'</strong></div></div>'+
    '<div class="member-success-actions">'+
      '<button type="button" class="btn btn-primary" data-route="lms-course">Buka kelas lagi <span aria-hidden="true">↗</span></button>'+
      '<button type="button" class="btn btn-secondary" data-route="belajar">Lihat kelas lain</button>'+
    '</div></section>';
}
function adminCatalog(courses,canWrite,products){
  var list=Array.isArray(courses)?courses:[];
  return '<section class="lms-heading"><p class="eyebrow">ADMIN / KELAS</p>'+
    '<h2>Kelola Kelas & Materi</h2><p class="lead">Buat kelas, tulis materi, lalu terbitkan saat siap.</p></section>'+
    '<div class="lms-stats"><div class="surface"><strong>'+list.length+'</strong><small>Kursus tercatat</small></div>'+
    '<div class="surface"><strong>'+list.filter(function(x){return x.status==='PUBLISHED';}).length+
      '</strong><small>Sudah diterbitkan</small></div>'+
    '<div class="surface"><strong>'+list.filter(function(x){return x.status==='DRAFT';}).length+
      '</strong><small>Masih draft</small></div></div>'+
    '<section class="surface lms-editor-section"><h3>Buat Kelas Baru</h3>'+
      '<p class="card-desc">Ruang edit tersedia setelah kelas disimpan.</p>'+
      courseForm(null,canWrite,products)+'</section>'+
    '<section class="section-gap"><h3>Daftar Kelas</h3>'+
      (list.length?'<div class="lms-course-grid">'+list.map(function(c){return courseTile(c,true);}).join('')+'</div>':
      '<div class="surface lms-empty">Belum ada kelas.</div>')+'</section>';
}
function courseForm(c,canWrite,products){
  var r=c||{},items=[['','Tidak memakai produk']].concat((products||[]).map(function(p){
    return [p.product_id,p.nama];}));
  return '<form id="lms-course-form" class="lms-form" data-edit-mode="'+(c?'edit':'create')+'">'+
    field('title','Judul kursus',r.title||'','text','required minlength="6" maxlength="140"')+
    field('summary','Deskripsi dan tujuan belajar',r.summary||'','textarea','4')+
    '<div class="lms-form-grid">'+field('category','Kategori',r.category||'UMKM','text','required maxlength="60"')+
    select('level','Tingkat',[['PEMULA','Pemula'],['MENENGAH','Menengah'],['LANJUTAN','Lanjutan']],r.level||'PEMULA')+
    select('access_type','Jenis akses',[['MEMBER','Semua member'],['FREE','Gratis untuk member'],['PRODUCT','Pemilik produk']],r.access_type||'MEMBER')+
    select('product_id','Produk terkait',items,r.product_id||'')+
    field('sort_order','Urutan',r.sort_order||100,'number','min="1" max="9999" required')+'</div>'+
    '<button class="btn btn-primary" type="submit" '+(!canWrite?'disabled title="Edit kelas belum tersedia"':'')+'>'+
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
    '<p class="small muted">Perubahan tersimpan sebagai draf. Terbitkan saat sudah siap.</p>'+
    '<button type="submit" class="btn btn-primary" '+(!canWrite?'disabled':'')+'>'+
      (lesson?'Simpan revisi draft':'Tambah pelajaran')+'</button></form>';
}
function adminEditor(detail,jobs,canWrite,products){
  if(!detail)return '<div class="surface lms-empty"><h3>Memuat kelas…</h3></div>';
  var c=detail.course||{},w=detail.workspace||{},lessons=detail.lessons||[];
  return '<button class="btn btn-ghost btn-sm" data-route="lms">Semua kelas</button>'+
    '<section class="lms-heading"><p class="eyebrow">WORKSPACE / '+e(w.workspace_id||'')+'</p>'+
      '<h2>'+e(c.title)+'</h2><p class="lead">'+e(c.summary)+'</p>'+
      '<div class="lms-course-top">'+tag(c.status)+' '+tag('Versi '+c.version)+
      (c.unpublished_changes?tag('Ada draf baru'):'')+'</div></section>'+
    '<div class="lms-workspace-layout"><div class="lms-main-column">'+
    '<section class="surface lms-editor-section"><div class="lms-section-heading"><h3>Pengaturan Kelas</h3>'+
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
      '<h4>Tambah Pelajaran</h4>'+lessonForm(null,canWrite&&c.status!=='ARCHIVED',c.course_id)+'</section></div>'+
    '<aside class="lms-aside-column"><section class="surface lms-editor-section">'+
      '<p class="card-kicker">RUANG EDIT</p><h3>'+e(w.name||'Ruang Materi')+'</h3>'+
      '<p class="card-desc">Simpan dan periksa materi kelas di sini.</p>'+
      '<div class="lms-meta">'+tag(w.workspace_status||'ACTIVE')+tag('Ruang materi')+'</div></section>'+
    '<section class="surface lms-editor-section"><p class="card-kicker">DRAF BANTUAN AI</p>'+
      '<h3>Instruksi untuk AI</h3>'+
      '<p class="card-desc">Siapkan instruksi lalu periksa hasil sebelum digunakan.</p>'+
      '<form id="lms-ai-form" class="lms-form">'+
      select('task_type','Jenis pekerjaan',[['COURSE_OUTLINE','Kerangka kursus'],
        ['LESSON_DRAFT','Draft pelajaran'],['QUIZ_DRAFT','Draft kuis']], 'COURSE_OUTLINE')+
      field('brief','Brief atau target materi','','textarea','5')+
      '<button class="btn btn-secondary" type="submit" '+(!canWrite?'disabled':'')+'>Simpan instruksi</button></form>'+
      '<div class="lms-items">'+(jobs||[]).map(function(j){
        return '<article class="lms-ai-job"><strong>'+e(j.task_type)+'</strong> '+tag(j.status)+
          '<p class="small muted">'+e(j.brief)+'</p>'+
          btn('open-job','Lihat prompt & hasil',false,' data-job-id="'+e(j.job_id)+'"')+'</article>';
      }).join('')+'</div></section></aside></div>';
}
function lessonEditor(lesson,canWrite){
  return '<button class="btn btn-ghost btn-sm" data-route="lms-editor">Kembali ke kelas</button>'+
    '<section class="lms-heading"><p class="eyebrow">EDITOR / PELAJARAN</p><h2>'+
      e(lesson?lesson.title:'Pelajaran baru')+'</h2>'+
      '<p>Perubahan baru tampil setelah Anda terbitkan.</p></section>'+
    '<section class="surface lms-editor-section">'+lessonForm(lesson,canWrite,'')+'</section>';
}
function aiJob(job,canWrite){
  if(!job)return '<div class="surface lms-empty">Pilih draf AI dari ruang edit kelas.</div>';
  return '<button class="btn btn-ghost btn-sm" data-route="lms-editor">Kembali ke kelas</button>'+
    '<section class="lms-heading"><p class="eyebrow">PERIKSA HASIL AI</p><h2>'+e(job.task_type)+'</h2>'+
    '<p>Hasil ini belum terlihat oleh peserta.</p></section>'+
    '<section class="surface lms-editor-section"><h3>Instruksi yang disiapkan</h3>'+
      '<div class="lms-body">'+text(job.prompt)+'</div>'+
      btn('copy-ai-prompt','Salin prompt',false,'','btn-secondary')+'</section>'+
    '<section class="surface lms-editor-section"><h3>Tempel Hasil AI</h3>'+
      '<form id="lms-ai-result-form" class="lms-form">'+
      field('result_draft','Draft teks AI',job.result_draft||'','textarea','10')+
      '<button class="btn btn-primary" type="submit" '+(!canWrite||!['READY_FOR_LLM','FOR_REVIEW'].includes(job.status)?'disabled':'')+
      '>Simpan hasil untuk review</button></form>'+
      '<div class="lms-actions">'+btn('approve-ai','Setujui draft',!canWrite||job.status!=='FOR_REVIEW')+
      btn('reject-ai','Tolak draft',!canWrite||job.status!=='FOR_REVIEW')+'</div>'+
      '<p class="small muted">Periksa dan edit hasil sebelum menerbitkannya.</p></section>';
}
root.NGD_LMS_UI=Object.freeze({
  memberCatalog:memberCatalog,memberPortal:memberPortal_,memberCourse:memberCourse,memberSuccess:memberSuccess,
  adminCatalog:adminCatalog,adminEditor:adminEditor,
  lessonEditor:lessonEditor,aiJob:aiJob
});
})(window);

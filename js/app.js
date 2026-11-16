import {api, ApiError, isConnected, isWriteEnabled, createRequestId} from './api.js?v=20261114-adminauth1';

const config = window.NGD_CONFIG || {};
const by = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,
  (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const idSafe = (v) => esc(String(v == null ? '' : v));
// Data provider may return a number, "99000", or "Rp99.000".
const moneyValue=(v)=>{
  if(typeof v==='number')return Number.isFinite(v)&&v>=0?v:null;
  const raw=String(v??'').trim().replace(/^Rp\s*/i,'').replace(/\s/g,'');
  if(/^\d+$/.test(raw))return Number(raw);
  if(/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw))
    return Number(raw.replace(/\./g,'').replace(',','.'));
  return null;
};
const rupiah=(v)=>{
  const amount=moneyValue(v);
  return amount===null?'Harga belum tersedia':
    new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amount);
};
const friendlyDate = (v) => {
  const d=new Date(v);return Number.isNaN(d.getTime())?'-':
    new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'Asia/Jakarta'}).format(d);
};
const urlSafe = (raw) => {
  try {
    const u=new URL(String(raw||''));
    return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';
  }catch{return '';}
};
// Public business contact enables consultation, never an unverified payment.
const consultationUrl = (product) => {
  let number=String(state.info?.wa_admin||'').replace(/\D/g,'');
  if(number.startsWith('0'))number='62'+number.slice(1);
  if(!/^62\d{8,13}$/.test(number))return '';
  const name=String(product?.nama||'layanan digital').slice(0,140);
  return 'https://wa.me/'+number+'?text='+encodeURIComponent(
    'Halo Ngulik Digital, saya ingin berkonsultasi tentang '+name+'. Mohon informasi ketersediaan dan cara pemesanan resmi.'
  );
};
const classroomUrlSafe = (raw) => {
  const normalized=urlSafe(raw);
  if(!normalized)return '';
  const u=new URL(normalized);
  return u.hostname==='classroom.google.com'?normalized:'';
};
const icons = {
  home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  spark:'<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z"/><path d="m19 19 1 2m-4-1 2-1"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  store:'<path d="M3 10h18v11H3zM2 10l2-7h16l2 7"/><path d="M9 21v-8h6v8"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 15h6"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
  wallet:'<rect x="2" y="5" width="20" height="16" rx="3"/><path d="M18 13h4M6 5V3h13"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18"/><path d="M12 9S5 9 5 6a3 3 0 0 1 6 0l1 3Zm0 0s7 0 7-3a3 3 0 0 0-6 0l-1 3Z"/>',
  alert:'<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>'
};
const icon=(name)=>'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.grid)+'</svg>';
const screens={
  beranda:['Meja Kerja','home'],belajar:['Kelas','book'],menu:['Menu','grid'],
  lms:['Studio LMS','book'],['lms-editor']:['Workspace Materi','book'],
  ['lms-lesson']:['Editor Pelajaran','book'],['lms-course']:['Ruang Kelas','book'],
  ['lms-ai']:['Review Draft AI','spark'],
  ['lms-complete']:['Pelajaran Selesai','check'],katalog:['Toko & Lisensi','store'],
  ai:['Studio AI','spark'],affiliate:['Komisi Affiliate','link'],akun:['Akun','user'],
  produk:['Kelola Katalog','store'],jasa:['Pesan Jasa','gift'],layanan:['Permintaan Jasa','gift'],
  admin:['Admin','grid'],konten:['Konten Visual','grid'],pesanan:['Pesanan','clipboard'],member:['Member','users'],
  antrean:['Antrean','clock'],dukungan:['Bantuan','shield'],
  tiket:['Detail tiket','shield'],member360:['Member 360°','users'],
  rilis:['Rilis Produk','check'],pengaturan:['Pengaturan','shield'],login:['Masuk','user'],['admin-login']:['Masuk Admin','shield'],daftar:['Daftar','users'],checkout:['Pembayaran','wallet']
};
const memberNav=['beranda','ai','katalog','affiliate','belajar','jasa','dukungan','akun'];
const adminNav=['admin','konten','produk','layanan','lms','pesanan','member','dukungan','rilis','antrean','pengaturan','akun'];
const adminContextRoute=(route)=>({
  'lms-editor':'lms','lms-lesson':'lms','lms-ai':'lms',
  'member360':'member',tiket:'dukungan'
})[route]||route;
const tokenKey='ngd_member_session';
// Production catalogue must come from getKatalog; never invent product prices
// when the API is temporarily unavailable.
const PREVIEW_MODULES=[
  'Orientasi dan Setup Akun','Bio Link dan Profil Bisnis','Katalog dan Checkout Kurir',
  'Konten Cepat dengan Studio AI','Kasir POS Sederhana','Strategi Referral'
].map((judul,i)=>({modul_id:'MOD-0'+(i+1),urut:i+1,judul,deskripsi:'Contoh modul pratinjau — tautan materi belum tersedia.',url_classroom:''}));
function activatePreview(){
  const params=new URLSearchParams(location.search),mode=params.get('preview');
  // Internal QA fixtures are intentionally inaccessible on public domains.
  const host=(()=>{try{return new URL(location.href).hostname;}catch{return '';}})();
  if(!['localhost','127.0.0.1','example.invalid'].includes(host)||
     !['member','admin'].includes(mode))return;
  state.token='PREVIEW_ONLY_NOT_A_REAL_SESSION';
  const admin=mode==='admin';
  state.me={
    member_id:admin?'PREVIEW-ADMIN':'PREVIEW',role:admin?'ADMIN':'MEMBER',
    nama:admin?'Admin Contoh':'Member Demo',nama_usaha:'Usaha Contoh',
    status:'AKTIF',kode_referral:'CONTOH',saldo_kredit:10,wa:'—'
  };
  state.home={saldo_kredit:10,modul_selesai:2,total_modul:6,modul_berikutnya:PREVIEW_MODULES[2],
    order_aktif:[],peringatan_kredit:false};
  state.modules=PREVIEW_MODULES;
  state.tools=[
    {tool_id:'T-CAPTION',nama:'Caption Instagram Produk',deskripsi:'Contoh alat bantu konten',kredit_biaya:1},
    {tool_id:'T-DESKRIPSI',nama:'Deskripsi Produk Marketplace',deskripsi:'Contoh deskripsi produk',kredit_biaya:1}
  ];
  state.affiliates={kode_referral:'CONTOH',pendaftar:0,konversi:0,saldo:{APPROVED:0}};
  const example={
    ticket_id:'SUP-CONTOH-001',member_id:'PREVIEW',product_id:'P-POS',
    kategori:'BUG',judul:'Cetak struk gagal pada Android',
    deskripsi:'Contoh laporan: printer tidak merespons saat transaksi dalam kondisi offline.',
    platform:'ANDROID',versi_aplikasi:'1.2.0',status:'IN_PROGRESS',prioritas:'P2',
    created_at:'2026-11-14T01:00:00Z'
  };
  state.memberProducts=[{product_id:'P-POS',nama:'POS Kasir Sederhana',
    tipe:'LISENSI_SEKALI',akses_status:'AKTIF',order_id:'ORDER-CONTOH'}];
  state.supportTickets=[example];
  state.adminSupportTickets=[{...example,nama_member:'Member Demo'}];
  state.supportOverview={total:1,by_status:{IN_PROGRESS:1},needs_review:0,findings:[]};
  state.supportReleases=[{
    release_id:'REL-CONTOH',product_id:'P-POS',versi:'1.2.1',
    judul:'Perbaikan stabilitas cetak',ringkasan:'Contoh changelog untuk tampilan pratinjau.',
    tipe_rilis:'PATCH',status:'PUBLISHED',published_at:'2026-11-14T02:00:00Z'
  }];
  state.memberSearch={total:1,items:[{
    member_id:'PREVIEW',nama:'Member Demo',nama_usaha:'Usaha Contoh',
    status:'AKTIF',wa_akhir:'0000',produk:['P-POS']
  }]};
  state.member360={
    profil:{member_id:'PREVIEW',nama:'Member Demo',nama_usaha:'Usaha Contoh',
      wa:'Nomor contoh',status:'AKTIF',status_pos:'AKTIF',kota:'Contoh'},
    produk:state.memberProducts,
    pesanan:[{order_id:'ORDER-CONTOH',product_id:'P-POS',nama_produk:'POS Kasir Sederhana',
      status:'FULFILLED'}],tiket:[example]
  };
  state.selectedMemberId='PREVIEW';
  state.ticketDetail={ticket:example,activities:[
    {activity_id:'EV-CONTOH',jenis:'DIBUAT',actor_role:'MEMBER',
      pesan:'Laporan dibuat.',created_at:'2026-11-14T01:00:00Z'}
  ]};
  state.selectedTicketId=example.ticket_id;
  // Synthetic LMS fixture: no credentials, no runtime writes, no real member data.
  const previewCourse={
    course_id:'CRS-DEMO',workspace_id:'WS-DEMO',
    title:'Fondasi Digital untuk UMKM',summary:'Kursus praktis tentang profil bisnis, pemasaran, dan operasional.',
    category:'UMKM',level:'PEMULA',access_type:'MEMBER',
    product_id:'',sort_order:1,status:'PUBLISHED',version:1,
    published_title:'Fondasi Digital untuk UMKM',
    published_summary:'Kursus praktis tentang profil bisnis, pemasaran, dan operasional.',
    access_granted:true
  };
  const previewLesson={
    lesson_id:'LES-DEMO',course_id:'CRS-DEMO',
    title:'Menyiapkan Profil Usaha',body:'Tujuan pembelajaran:\n1. Mengidentifikasi pelanggan.\n2. Menulis deskripsi usaha.\n3. Menyiapkan profil digital.',
    kind:'ARTICLE',media_url:'',sort_order:1,duration_minutes:15,
    status:'PUBLISHED',version:1,completed:false
  };
  state.lmsCourses=[previewCourse];
  state.lmsEnrollments=[{enrollment_id:'ENR-DEMO',course_id:'CRS-DEMO',status:'ACTIVE'}];
  state.lmsCourseDetail={course:previewCourse,lessons:[previewLesson],
    access_granted:true,completed:0,total:1};
  state.lmsAdminCourses=[{...previewCourse,unpublished_changes:false}];
  state.lmsAdminCourse={course:{...previewCourse,unpublished_changes:false},
    lessons:[previewLesson],workspace:{workspace_id:'WS-DEMO',course_id:'CRS-DEMO',
      name:'Ruang Materi — Fondasi Digital untuk UMKM',
      workspace_status:'ACTIVE',auto_created:true}};
  state.lmsJobs=[{job_id:'AIJ-DEMO',workspace_id:'WS-DEMO',
    course_id:'CRS-DEMO',lesson_id:'',task_type:'COURSE_OUTLINE',
    brief:'Susun kerangka belajar digital praktis untuk UMKM.',
    prompt:'Contoh prompt untuk penyusunan materi. Tidak dikirim ke model.',
    status:'READY_FOR_LLM',result_draft:''}];
  state.lmsSelectedCourseId='CRS-DEMO';
  state.lmsSelectedLessonId='LES-DEMO';
  state.lmsSelectedAIJobId='AIJ-DEMO';
  state.lmsCompletion={title:'Menyiapkan Profil Usaha',completed:1,total:1,preview:true};
  state.qa=true;
  return true;
}

const state={
  route:'beranda',token:sessionStorage.getItem(tokenKey)||'',me:null,qa:false,
  info:null,catalog:[],siteContent:[],adminContent:[],contentEditId:'',contentRequestId:null,heroIndex:0,heroPaused:false,home:null,modules:[],tools:[],orders:[],
  affiliates:null,waitlist:[],members:[],adminOrders:[],adminSummary:null,
  reconciliation:null,selectedProduct:null,lastOrder:null,loading:false,
  memberProducts:[],supportTickets:[],supportReleases:[],supportOverview:null,
  adminSupportTickets:[],ticketDetail:null,selectedTicketId:null,
  memberSearch:null,member360:null,selectedMemberId:null,
  lmsCourses:[],lmsEnrollments:[],lmsAdminCourses:[],
  lmsCourseDetail:null,lmsAdminCourse:null,lmsSelectedCourseId:null,
  lmsSelectedLessonId:null,lmsJobs:[],lmsSelectedAIJobId:null,
  lmsCompletion:null,notifications:{enabled:false,items:[],unread:0},catalogFilter:'semua',
  adminCatalog:[],catalogEditId:'',catalogRequestId:null,
  adminRuntime:null,adminRuntimeError:'',adminSettings:null,adminSettingsError:'',
  services:[],selectedServiceId:'',serviceKind:'VIDEO_AI',serviceRequestId:null,
  registrationOtpVerifiedWa:'',publicStep:0,selectedAiToolId:'',pendingPurchaseId:''
};
const isAdmin=()=>state.me?.role==='ADMIN';
const adminLoginEnabled=()=>isConnected()&&config.adminLoginEnabled===true;
const registrationOtpEnabled=()=>isWriteEnabled()&&config.registrationOtpEnabled===true;
const paymentEnabled=()=>isWriteEnabled()&&config.paymentsEnabled===true;
const qrisUrl=()=>{try{const u=new URL(String(config.qrisImageUrl||''),location.href);return u.origin===location.origin&&u.protocol==='https:'?u.href:'';}catch{return '';}};
const logged=()=>Boolean(state.me&&state.token);
const title=(heading,eyebrow,detail)=>'<div class="section-head"><div><p class="eyebrow">'+esc(eyebrow)+'</p><h2>'+esc(heading)+'</h2>'+(detail?'<p>'+esc(detail)+'</p>':'')+'</div></div>';
function toast(message,error=false){
  const root=by('toast-root');const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;
  root.append(el);setTimeout(()=>el.remove(),5000);
}
function notice(){
  if(!isAdmin())return '';
  const current=adminContextRoute(state.route);
  return '<nav class="admin-commandbar" aria-label="Navigasi seluruh modul admin">'+
    adminNav.map(route=>'<button type="button" class="admin-command" data-route="'+route+
      '" '+(current===route?'aria-current="page"':'')+'>'+
      (window.NGD_CONTENT_UI?.media(state.siteContent,'NAV_ICON',route,'nav-custom-icon','')||icon(screens[route][1]))+
      '<span>'+esc(screens[route][0])+'</span></button>').join('')+
    '</nav>';
}
const mobileNavRoute=(route)=>({
  'lms-course':'belajar','lms-complete':'belajar',
  tiket:'dukungan',checkout:'katalog',
  'lms-editor':'lms','lms-lesson':'lms','lms-ai':'lms',
  member360:'member'
})[route]||route;
function renderNav(){
  const items=isAdmin()?adminNav:memberNav;
  const navIcon=(route)=>window.NGD_CONTENT_UI?.media(state.siteContent,'NAV_ICON',route,'nav-custom-icon','')||icon(screens[route][1]);
  const button=(route)=>'<button type="button" class="nav-item" data-route="'+route+'" '+(state.route===route?'aria-current="page"':'')+'>'+navIcon(route)+'<span>'+esc(screens[route][0])+'</span></button>';
  by('desktop-nav').innerHTML=items.map(button).join('');
  // Four high-frequency destinations + a full, discoverable menu. The topbar
  // account button stays available on every viewport, including mobile.
  const mobileItems=isAdmin()?['admin','produk','pesanan','lms','menu']:['beranda','ai','katalog','affiliate'];
  const context=mobileNavRoute(state.route);
  const selectedMobile=mobileItems.includes(context)?context:'menu';
  by('mobile-nav').innerHTML=mobileItems.map(route=>
    '<button type="button" class="nav-item" data-route="'+route+'" '+
    (route===selectedMobile?'aria-current="page"':'')+' aria-label="'+esc(screens[route][0])+'">'+
    navIcon(route)+'<span>'+esc(({produk:'Katalog',layanan:'Jasa',konten:'Konten'})[route]||screens[route][0])+'</span></button>').join('');
  by('page-label').textContent=screens[state.route]?.[0]||'Beranda';
  by('account-avatar').textContent=logged()?
    String(state.me.nama||'M').split(' ').map(v=>v[0]).join('').slice(0,2).toUpperCase():'ND';
  by('mode-indicator').textContent=isAdmin()?'ADMIN':logged()?'MEMBER':'NGULIK DIGITAL';
  const mark=by('brand-mark');
  if(mark)mark.innerHTML=window.NGD_CONTENT_UI?.media(state.siteContent,'BRAND_LOGO','brand','brand-custom-image','')||'n<span>.</span>';
  const caption=by('sidebar-caption');
  if(caption)caption.textContent=isAdmin()?'Panel admin':logged()?'Menu member':'Menu';
  // The same portfolio-style navigation highlights the active public destination.
  const publicLinks=typeof document.querySelectorAll==='function'
    ?document.querySelectorAll('#guest-nav [data-route]'):[];
  publicLinks.forEach(btn=>{
    if(btn.dataset?.route===state.route)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
}
const empty=(heading,message,action='',label='Masuk')=>
  '<div class="empty"><span class="symbol">◌</span><h3>'+esc(heading)+'</h3><p>'+esc(message)+'</p>'+
  (action?'<button class="btn btn-primary" data-route="'+action+'">'+esc(label)+' '+icon('arrow')+'</button>':'')+'</div>';
const needLogin=(feature)=>
  empty('Masuk untuk membuka '+feature,'Aktivitas member dan data pribadi hanya tersedia setelah login.','login','Masuk sekarang');
// Browseable on mobile instead of hiding most routes behind a desktop-only sidebar.
// This is a presentation route: existing auth checks still guard every action.
function viewMore(){
  const routes=isAdmin()?adminNav:memberNav;
  const descriptions={
    beranda:'Aktivitas dan rekomendasi',belajar:'Materi dan progres',katalog:'Produk dan lisensi',
    jasa:'Permintaan layanan',ai:'Asisten kreativitas',affiliate:'Program referensi',
    dukungan:'Pertanyaan dan tiket',akun:'Profil dan keamanan',admin:'Ringkasan operasional',
    konten:'Halaman dan media',produk:'Produk dan harga',layanan:'Permintaan pelanggan',
    lms:'Kursus dan materi',pesanan:'Status transaksi',member:'Data keanggotaan',
    rilis:'Pembaruan produk',antrean:'Daftar menunggu',pengaturan:'Pengaturan layanan'
  };
  return '<section class="ngd-menu-page" aria-label="Semua menu">'+
    title(isAdmin()?'Modul pengelolaan':'Jelajahi Ngulik Digital','SEMUA MENU',
      'Pilih tujuan untuk melanjutkan. Setiap fitur mengikuti izin dan status layanan.')+
    '<nav class="ngd-menu-grid" aria-label="Daftar seluruh fitur">'+routes.map(route=>
      '<button type="button" class="ngd-menu-tile" data-route="'+route+'">'+
      '<span class="ngd-menu-icon" aria-hidden="true">'+icon(screens[route][1])+'</span>'+
      '<span class="ngd-menu-copy"><strong>'+esc(screens[route][0])+'</strong><small>'+
      esc(descriptions[route]||'Buka fitur')+'</small></span>'+icon('arrow')+'</button>'
    ).join('')+'</nav>'+
    (!logged()?'<div class="ngd-menu-access"><p>Sudah menjadi anggota?</p>'+
      '<button class="btn btn-primary" type="button" data-route="login">Masuk member</button>'+
      '<button class="btn btn-secondary" type="button" data-route="admin-login">Akses administrator</button></div>':'')+
    '</section>';
}
const safeBadge=(s)=>'<span class="chip '+(['AKTIF','FULFILLED','PAID','APPROVED'].includes(String(s))?'green':'orange')+'">'+esc(s||'-')+'</span>';
function viewHome(){
  if(isAdmin())return viewAdmin();
  if(logged()){
    const first=String(state.me.nama||'Member').split(' ')[0];
    const d=state.home||{},done=Number(d.modul_selesai)||0,total=Number(d.total_modul)||0;
    const progress=total?Math.max(0,Math.min(100,Math.round(done/total*100))):0;
    const orderCount=Array.isArray(d.order_aktif)?d.order_aktif.length:0;
    const next=d.modul_berikutnya;
    const currentCourse=(state.lmsCourses||[]).find(c=>(state.lmsEnrollments||[])
      .some(e=>e.course_id===c.course_id&&e.status==='ACTIVE'))||null;
    const learningCTA=currentCourse?
      '<button type="button" class="btn btn-primary" data-lms-action="open-course" data-course-id="'+
      esc(currentCourse.course_id)+'">Lanjutkan kelas '+icon('arrow')+'</button>':
      '<button type="button" class="btn btn-primary" data-route="belajar">Jelajahi kelas '+icon('arrow')+'</button>';
    const wallet=Number(d.saldo_kredit??state.me.saldo_kredit??0);
    const serviceBadges=[
      ['POS Kasir',String(state.me.status_pos||'BELUM AKTIF')],
      ['Paket 3-in-1',state.me.akses_3in1_sampai&&new Date(state.me.akses_3in1_sampai).getTime()>Date.now()?'AKTIF':'BELUM AKTIF'],
      ['Canva',String(state.me.status_canva||'BELUM AKTIF')]
    ];
    return '<section class="member-welcome"><div><p class="eyebrow">DASHBOARD / MEJA KERJA</p>'+
      '<h1>Selamat datang, <span class="accent">'+esc(first)+'.</span></h1>'+
      '<p class="lead">Token, alat AI, lisensi, dan aktivitas usaha dalam satu meja kerja.</p></div>'+
      '<span class="chip green">'+esc(state.me.status||'AKTIF')+'</span></section>'+
      '<section class="wallet-hero" aria-label="Dompet Token Universal">'+
      '<div class="wallet-top"><span>DOMPET TOKEN UNIVERSAL</span><span class="wallet-state">● Saldo akun</span></div>'+
      '<div class="wallet-value"><strong>'+esc(wallet.toLocaleString('id-ID'))+'</strong><span>Token</span></div>'+
      '<p>1 Token = Rp1.000 · Saldo diambil dari akun Anda</p>'+
      '<div class="wallet-commands"><button type="button" class="btn btn-primary" data-catalog-go="ai">+ Isi Token (QRIS) '+icon('arrow')+'</button>'+
      '<button type="button" class="btn btn-secondary" data-route="ai">Buka Studio AI</button></div>'+
      '<div class="wallet-service-list">'+serviceBadges.map(function(x){return '<span class="wallet-service"><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></span>';}).join('')+'</div></section>'+
      '<section class="member-focus" aria-label="Ringkasan perjalanan belajar">'+
        '<div class="member-focus-content"><span class="member-focus-kicker">AKTIVITAS & PRODUKTIVITAS</span>'+
        '<h2>'+(currentCourse?'Lanjutkan aktivitas terakhir.':'Kelola kebutuhan digital Anda.')+'</h2>'+
        '<p>'+(currentCourse?esc(currentCourse.title)+' siap Anda lanjutkan.':
          'Buka Studio AI, pilih produk, atau mulai kelas yang tersedia.')+'</p>'+
        learningCTA+'</div>'+
        '<div class="member-focus-ring" style="--member-progress:'+progress+'%" role="img" aria-label="'+progress+' persen progres modul">'+
        '<div class="member-focus-ring-core"><strong>'+progress+'%</strong><small>progres</small></div></div></section>'+
      '<div class="metric-grid">'+[
        [icon('spark'),esc(d.saldo_kredit??state.me.saldo_kredit??0),'Token tersedia','ai'],
        [icon('book'),esc(done)+' / '+esc(total),'Modul selesai','belajar'],
        [icon('clipboard'),esc(orderCount),'Pesanan aktif','pesanan']
      ].map(x=>'<button class="metric-card" data-route="'+x[3]+'"><span class="metric-icon">'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></button>').join('')+'</div>'+
      '<div class="two-col section-gap"><section class="surface"><p class="card-kicker">LANJUTKAN BELAJAR</p>'+
      (next?'<h2>'+esc(next.judul||'Modul berikutnya')+'</h2><p class="card-desc">Lanjutkan pembelajaran dari modul yang belum selesai.</p>':
      '<h2>'+(total?'Seluruh modul selesai':'Materi sedang disiapkan')+'</h2><p class="card-desc">'+
      (total?'Pertahankan progres dan jelajahi materi tambahan.':'Modul akan muncul ketika diterbitkan oleh admin.')+'</p>')+
      '<div class="progress-wrap"><div class="progress-track" role="progressbar" aria-valuenow="'+progress+'" aria-valuemin="0" aria-valuemax="100" aria-label="Progres belajar"><span style="width:'+progress+'%"></span></div>'+
      '<span class="tiny muted">'+progress+'% selesai</span></div><button class="btn btn-primary" data-route="belajar">Buka pembelajaran '+icon('arrow')+'</button></section>'+
      '<section class="surface"><p class="card-kicker">AKSI CEPAT</p><div class="quick-actions">'+[
        ['spark','Buka Studio AI','ai'],['store','Toko & lisensi','katalog'],
        ['link','Komisi affiliate','affiliate'],['user','Kelola akun','akun']
      ].map(x=>'<button class="quick-action" data-route="'+x[2]+'">'+icon(x[0])+'<span>'+x[1]+'</span>'+icon('arrow')+'</button>').join('')+
      '</div></section></div>'+
      (d.peringatan_kredit?'<div class="banner warning section-gap"><div><h3>Saldo kredit menipis</h3><p>Periksa penggunaan kredit sebelum memakai tools AI.</p></div><button class="btn btn-secondary" data-route="ai">Lihat saldo</button></div>':'');
  }
  // Native-app style home: hero banner, search bar, feature grid, product rail. Labels only.
  const features=[
    ['book','Belajar','belajar'],['store','Aplikasi','aplikasi'],['spark','Studio AI','ai'],
    ['clipboard','Jasa','jasa'],['grid','Katalog','katalog'],['link','Affiliate','affiliate'],
    ['shield','Bantuan','dukungan'],['user','Masuk','login']
  ];
  const goAttr=(r)=>['aplikasi','jasa'].includes(r)?'data-catalog-go="'+r+'"':'data-route="'+r+'"';
  const processLabels=[
    ['01','Pilih alat'],['02','Tulis brief'],['03','Gunakan hasil']
  ];
  const processExplanations=[
    'Jelajahi asisten AI yang tersedia untuk konten, deskripsi, atau pekerjaan usaha Anda.',
    'Ceritakan produk dan kebutuhan Anda. Biaya Token ditampilkan sebelum dijalankan.',
    'Salin hasil yang dibuat, lalu gunakan untuk promosi atau komunikasi pelanggan.'
  ];
  // Cards are populated exclusively by getKatalog; nothing is invented for the showcase.
  const featuredProducts=(Array.isArray(state.catalog)?state.catalog:[])
    .filter(p=>p&&p.aktif!==false)
    .slice(0,5).map((p,i)=>{
      const image=window.NGD_CONTENT_UI?.media(state.siteContent,'PRODUCT_IMAGE',
        p.product_id,'pf-product-cover','')||'<span class="pf-product-monogram" aria-hidden="true">'+
        esc(String(p.nama||'N').slice(0,1).toUpperCase())+'</span>';
      return '<button type="button" class="pf-product-card pf-tone-'+(i%5+1)+
        '" data-route="katalog" aria-label="Lihat '+esc(p.nama)+' di katalog">'+
        '<span class="pf-product-art">'+image+'</span>'+
        '<span class="pf-product-info"><strong>'+esc(p.nama)+'</strong><small>'+
        rupiah(p.harga)+'</small></span></button>';
    }).join('');
  const hero='<section class="nh-hero public-editorial-hero pf-portfolio-hero" aria-label="Bengkel kerja digital untuk UMKM">'+
    '<span class="pf-hero-spark pf-spark-one" aria-hidden="true">✦</span>'+
    '<span class="pf-hero-spark pf-spark-two" aria-hidden="true">✧</span>'+
    '<span class="pf-hero-spark pf-spark-three" aria-hidden="true">✦</span>'+
    '<div class="public-hero-copy">'+
      '<p class="pf-hello"><span class="pf-hello-dot" aria-hidden="true"></span> Ngulik Digital <span aria-hidden="true">/</span> Alat & AI untuk UMKM</p>'+
      '<h1>Usaha jalan. <em>Teknologi membantu.</em></h1>'+
      '<p class="public-hero-lead">Bengkel kerja digital untuk membuat konten, mengelola usaha, dan mendapatkan alat AI siap pakai. Mulai Rp10.000, bayar sesuai kebutuhan.</p>'+
      '<div class="public-hero-buttons">'+
        '<button type="button" class="btn btn-primary pf-button-dark" data-route="katalog">Jelajahi Katalog '+icon('arrow')+'</button>'+
        '<button type="button" class="btn btn-secondary pf-button-light" data-route="daftar">Masuk / Daftar WhatsApp</button>'+
      '</div>'+
      '<p class="public-hero-note">Aplikasi bisnis · Token AI · Jasa kreatif · Ebook</p>'+
    '</div>'+
    '<div class="pf-showcase" aria-label="Produk digital dan cara kerja Studio AI">'+
      '<div class="pf-showcase-glow" aria-hidden="true"></div>'+
      (featuredProducts?'<div class="pf-product-orbit" aria-label="Produk katalog yang tersedia">'+featuredProducts+'</div>':'')+
      '<div class="public-workflow">'+
        '<div class="public-workflow-top"><span>STUDIO AI / ALUR PENGGUNAAN</span><span>01—03</span></div>'+
        '<h2>Dari ide usaha menjadi <span>hasil siap pakai.</span></h2>'+
        '<div class="public-workflow-steps">'+processLabels.map((x,k)=>'<button type="button" class="public-workflow-step'+
          (state.publicStep===k?' is-selected':'')+'" data-public-step="'+k+'" aria-pressed="'+(state.publicStep===k?'true':'false')+
          '"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></button>').join('')+'</div>'+
        '<p class="public-workflow-explain">'+esc(processExplanations[state.publicStep||0])+'</p>'+
        '<button type="button" class="public-workflow-link" data-route="ai">Kenali Studio AI '+icon('arrow')+'</button>'+
      '</div>'+
    '</div>'+
  '</section>'+(window.NGD_CONTENT_UI?.hero(state.siteContent)||'');
  const search='<label class="nh-search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'+
    '<input id="home-search" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Cari" aria-label="Cari fitur atau produk"></label>';
  const grid='<section class="nh-grid" aria-label="Fitur">'+features.map(f=>
    '<button type="button" class="nh-tile" data-search="'+esc(f[1].toLowerCase())+'" '+goAttr(f[2])+'>'+
    '<span class="nh-tile-icon nh-c'+(features.indexOf(f)%4+1)+'">'+
    (window.NGD_CONTENT_UI?.media(state.siteContent,'FEATURE_ICON',f[2],'nh-feature-image','')||
      '<span class="nh-feature-letter" aria-hidden="true">'+esc(f[1].slice(0,1))+'</span>')+
    '</span><span>'+esc(f[1])+'</span></button>').join('')+'</section>';
  const rail=state.catalog.length?'<section class="nh-rail" aria-label="Produk">'+state.catalog.map(p=>
    '<button type="button" class="nh-card" data-route="katalog" data-search="'+esc(String(p.nama||'').toLowerCase())+'">'+
    '<span class="nh-card-icon">'+(window.NGD_CONTENT_UI?.media(state.siteContent,'PRODUCT_IMAGE',p.product_id,'nh-product-image','')||
      '<span class="nh-product-letter" aria-hidden="true">'+esc(String(p.nama||'P').slice(0,1))+'</span>')+'</span>'+
    '<strong>'+esc(p.nama)+'</strong><em>'+rupiah(p.harga)+'</em></button>').join('')+'</section>':'';
  return '<div class="nh-home">'+hero+'<section class="public-discovery"><div class="public-discovery-head"><p class="eyebrow">PILIH SESUAI KEBUTUHAN</p><h2>Alat digital untuk pekerjaan nyata.</h2></div>'+search+grid+rail+'</section><p id="nh-empty" class="nh-empty" hidden>Tidak ada hasil</p></div>';
}
const offerCategories=[
  ['semua','Semua'],['ai','Token AI'],['aplikasi','Aplikasi Bisnis'],
  ['jasa','Jasa & Seat'],['belajar','Bundel & Ebook']
];
const supportedSaleTypes=new Set(['LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H','TOPUP_KREDIT','PRODUK_DIGITAL','JASA_SEKALI']);
function offerCategory(p){
  switch(String(p.tipe||'')){
    case 'LANGGANAN_30H':case 'LISENSI_SEKALI':return 'aplikasi';
    case 'TOPUP_KREDIT':return 'ai';
    case 'JASA_SEKALI':case 'SEAT_30H':return 'jasa';
    case 'PRODUK_DIGITAL':return 'belajar';
    default:return 'lainnya';
  }
}
const offerCategoryLabel=p=>{
  const category=offerCategory(p);
  return offerCategories.find(x=>x[0]===category)?.[1]||'Produk digital';
};
function viewCatalog(){
  const list=Array.isArray(state.catalog)?state.catalog:[];
  if(!list.length)return title('Katalog produk & layanan','SOLUSI UNTUK UMKM',
    'Penawaran digital dikelompokkan sesuai kebutuhan usaha.')+
    empty('Katalog belum tersedia',isConnected()?
      'Belum ada produk yang tersedia dalam katalog.':
      'Silakan kunjungi kembali untuk melihat pilihan terbaru.');
  const current=state.catalogFilter||'semua';
  const shown=current==='semua'?list:list.filter(p=>offerCategory(p)===current);
  const filters='<div class="catalog-filters" role="group" aria-label="Filter jenis penawaran">'+
    offerCategories.map(([id,label])=>'<button class="catalog-filter" type="button" data-catalog-filter="'+id+
      '" aria-pressed="'+(id===current?'true':'false')+'">'+label+'</button>').join('')+'</div>';
  const header='<div class="catalog-intro"><div><p class="eyebrow">NGULIK DIGITAL / TOKO & LISENSI</p>'+
    '<h1>'+ (logged()?'Toko & Lisensi Anda.':'Alat digital yang relevan untuk usaha.')+'</h1>'+
    '<p>Token AI, aplikasi kasir, akses digital, ebook, dan jasa kreatif. Harga diambil langsung dari katalog resmi.</p></div>'+
    '<div class="catalog-summary"><strong>'+list.length+'</strong><span>penawaran tercatat'+
    ''+'</span></div></div>';
  const cards=shown.length?'<div class="catalog-grid">'+shown.map(p=>{
    const kind=offerCategory(p),safeSale=supportedSaleTypes.has(String(p.tipe))&&moneyValue(p.harga)!==null&&moneyValue(p.harga)>0;
    const allowed=safeSale&&config.paymentsEnabled===true;
    const consult=allowed?'':consultationUrl(p);
    const label=allowed?'Beli Sekarang':safeSale?'Checkout sedang tidak tersedia':'Produk belum tersedia';
    const tooltip=safeSale?'Checkout belum tersedia pada konfigurasi saat ini':'Periksa ketersediaan produk';
    const action=allowed?
      '<button class="btn btn-primary" type="button" data-buy="'+idSafe(p.product_id)+'">Beli Sekarang '+icon('arrow')+'</button>':
      consult?
        '<a class="btn btn-primary" href="'+esc(consult)+'" target="_blank" rel="noopener noreferrer" aria-label="Konsultasi pemesanan '+esc(p.nama)+' melalui WhatsApp">Tanya pemesanan '+icon('arrow')+'</a>':
        '<button class="btn btn-primary" type="button" disabled title="'+esc(tooltip)+'">'+label+' '+icon('arrow')+'</button>';
    return '<article class="catalog-card"><div class="catalog-card-top">'+
      '<span class="catalog-card-icon">'+(window.NGD_CONTENT_UI?.media(state.siteContent,'PRODUCT_IMAGE',p.product_id,'catalog-product-image','')||
      '<span class="catalog-product-letter" aria-hidden="true">'+esc(String(p.nama||'P').slice(0,1))+'</span>')+'</span>'+
      '<span class="catalog-card-type">'+esc(offerCategoryLabel(p))+'</span></div>'+
      '<div class="catalog-card-copy"><h3>'+esc(p.nama)+'</h3><p>'+esc(p.deskripsi||'')+'</p>'+
      '<div class="product-benefits">'+
      (Number(p.kredit_diberikan)>0?'<span class="chip green">+'+esc(Number(p.kredit_diberikan))+' Token</span>':'')+
      (Number(p.durasi_hari)>0?'<span class="chip">'+esc(Number(p.durasi_hari))+' hari</span>':'')+
      '</div></div>'+
      '<div class="catalog-card-bottom"><div><small>Harga penawaran</small><strong>'+rupiah(p.harga)+'</strong></div>'+
      action+'</div>'+
      (kind==='jasa'?'<button type="button" class="service-cta" data-service-go>Ajukan brief jasa '+icon('arrow')+'</button>':'')+
      '</article>';
  }).join('')+'</div>':
    '<div class="catalog-empty">'+empty('Belum ada penawaran di kategori ini','Pilih kategori lain untuk melihat pilihan tersedia.')+'</div>';
  const licenses=logged()&&!isAdmin()?
    '<div class="catalog-license-strip" aria-label="Status akses layanan">'+[
      ['POS Kasir',state.me?.status_pos||'Belum aktif'],
      ['Paket 3-in-1',state.me?.akses_3in1_sampai&&new Date(state.me.akses_3in1_sampai).getTime()>Date.now()?'Aktif':'Belum aktif'],
      ['Canva',state.me?.status_canva||'Belum aktif']
    ].map(([name,status])=>'<span><strong>'+esc(name)+'</strong><small>'+esc(status)+'</small></span>').join('')+'</div>':'';
  return header+licenses+filters+'<p class="catalog-result-count" aria-live="polite">Menampilkan '+shown.length+
    ' dari '+list.length+' penawaran</p>'+cards+
    '<section class="catalog-guidance section-gap"><div><span class="card-kicker">CATATAN</span>'+
    '<h3>Butuh layanan khusus?</h3><p>Ajukan brief melalui ruang member atau konsultasikan kebutuhan melalui tautan pada produk. Konfirmasi pemesanan dan pembayaran hanya melalui kanal resmi.</p></div>'+
    '<button type="button" class="btn btn-secondary" data-route="jasa">Ajukan brief</button></section>';
}
function viewLearn(){
  if(window.NGD_LMS_UI&&logged())
    return window.NGD_LMS_UI.memberCatalog(state.lmsCourses,state.lmsEnrollments,state.modules);
  if(!logged())return title('Belajar lebih terarah','CHAPTER 1 / PENGANTAR GRATIS',
    'Materi pengantar praktis untuk pelaku UMKM. Jelajahi jalur belajar, lalu masuk untuk melanjutkan kelas.')+
    '<section class="learn-guest-intro"><div><p class="card-kicker">JALUR PENGENALAN</p>'+
    '<h3>Pelajari satu hal, praktikkan di usaha sendiri.</h3>'+
    '<p>Chapter 1 mengenalkan Google Profil Bisnis, Gemini, Canva, WhatsApp Business, dan pencatatan promosi sederhana. Pelajaran lanjutan tersedia melalui akses kelas member yang sesuai.</p></div>'+
    '<span class="chip">KELAS PENGANTAR</span></section>'+
    '<div class="learn-path-list">'+[
      ['01','Siapkan identitas digital','Kenali profil usaha dan titik lokasi di Google.'],
      ['02','Buat konten promosi','Gunakan AI dan Canva untuk kegiatan pemasaran.'],
      ['03','Atur komunikasi pelanggan','Rapikan katalog dan balasan cepat WhatsApp Business.'],
      ['04','Catat dan evaluasi','Mulai kalender promosi serta tracking sederhana.']
    ].map(x=>'<article class="learn-path-item"><span>'+x[0]+'</span><div><h3>'+x[1]+'</h3><p>'+x[2]+'</p></div></article>').join('')+'</div>'+
    '<div class="learn-guest-note"><strong>Lanjutkan perjalanan di ruang member.</strong>'+
    '<p>Masuk dengan akun Anda untuk membuka kelas yang tersedia dan menyimpan progres belajar.</p>'+'<button type="button" class="btn btn-primary btn-sm" data-route="login">Masuk ke kelas</button></div>';
  const modules=state.modules;
  return title('Perjalanan belajar Anda','KURIKULUM PRAKTIS','Modul tersedia sesuai program dan akses akun.')+
    (modules.length?'<div class="stack">'+modules.map((m,i)=>'<article class="surface list-row"><div class="left" style="display:flex;gap:15px;align-items:center"><span class="step-no">'+esc(m.urut||i+1)+'</span><div><strong>'+esc(m.judul)+'</strong><small>'+esc(m.deskripsi||'')+'</small></div></div>'+
    (classroomUrlSafe(m.url_classroom)?'<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer" href="'+esc(classroomUrlSafe(m.url_classroom))+'">Buka modul '+icon('arrow')+'</a>':
    '<span class="chip">Materi menyusul</span>')+'</article>').join('')+'</div>':
    empty('Materi belum tersedia','Materi tersedia setelah pengelola menerbitkannya.'));
}
function viewAI(){
  if(!logged())return '<section class="ai-public"><p class="eyebrow">STUDIO AI</p>'+
    '<h1>AI yang bekerja untuk usaha Anda.</h1>'+
    '<p>Gunakan Token sesuai kebutuhan untuk membuat caption, deskripsi produk, dan materi pemasaran. Masuk untuk melihat alat dan biaya langsung dari akun.</p>'+
    '<div class="actions"><button type="button" class="btn btn-primary" data-route="daftar">Daftar via WhatsApp</button>'+
    '<button type="button" class="btn btn-secondary" data-route="katalog">Lihat Token AI</button></div></section>';
  const tools=Array.isArray(state.tools)?state.tools:[];
  const selected=tools.find(x=>x.tool_id===state.selectedAiToolId)||tools[0]||null;
  const cost=selected?Number(selected.kredit_biaya)||0:0;
  const balance=Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0);
  const can=isWriteEnabled();
  return '<section class="ai-studio"><div class="ai-studio-head"><div><p class="eyebrow">STUDIO AI / WORKSPACE</p>'+
    '<h1>Hasilkan konten dengan lebih cepat.</h1>'+
    '<p>Pilih alat, masukkan brief, lalu gunakan hasil. Biaya dihitung per eksekusi.</p></div>'+
    '<div class="ai-wallet-mini"><small>SALDO TOKEN</small><strong id="ai-balance">'+esc(balance)+' Token</strong>'+
    '<button type="button" data-catalog-go="ai">+ Isi Token</button></div></div>'+
    '<div class="ai-wizard-progress" aria-label="Tahapan penggunaan alat AI">'+
    '<span class="is-current">01 · Pilih Alat</span><span>02 · Isi Brief</span><span>03 · Gunakan Hasil</span></div>'+
    (tools.length?'<div class="ai-wizard-layout"><section class="ai-tool-selector" aria-label="Pilih alat AI">'+
      '<h2>Pilih alat</h2><p>Alat tersedia sesuai katalog yang diaktifkan.</p>'+
      tools.map(function(t){return '<button type="button" class="ai-tool-option'+(selected?.tool_id===t.tool_id?' is-current':'')+
        '" data-ai-select="'+idSafe(t.tool_id)+'" aria-pressed="'+(selected?.tool_id===t.tool_id?'true':'false')+'">'+
        '<span class="ai-tool-icon">'+icon('spark')+'</span><span><strong>'+esc(t.nama)+'</strong>'+
        '<small>'+esc(t.deskripsi||'Alat AI untuk kebutuhan usaha')+'</small></span>'+
        '<em>'+esc(Number(t.kredit_biaya)||0)+' Token</em></button>';}).join('')+'</section>'+
      '<article class="surface ai-tool"><div class="ai-editor-head"><p class="eyebrow">LANGKAH 02 / BRIEF</p>'+
      '<h2>'+esc(selected.nama)+'</h2><p>'+esc(selected.deskripsi||'Jelaskan kebutuhan Anda secara ringkas.')+'</p></div>'+
      '<form class="ai-form" data-tool-id="'+idSafe(selected.tool_id)+'" data-cost="'+esc(cost)+'" novalidate>'+
      '<div class="field"><label class="ai-label" for="ai-business-name">Nama usaha</label>'+
      '<input class="input" id="ai-business-name" name="nama_usaha" maxlength="100" autocomplete="organization" value="'+
      esc(state.me?.nama_usaha||'')+'" placeholder="Nama usaha Anda"></div>'+
      '<div class="field"><label class="ai-label" for="ai-in-'+idSafe(selected.tool_id)+'">Produk atau kebutuhan Anda</label>'+
      '<textarea class="input ai-input" id="ai-in-'+idSafe(selected.tool_id)+'" name="input" rows="6" maxlength="1400" required placeholder="'+
      esc(selected.placeholder_input||'Jelaskan produk, audiens, gaya bahasa, dan tujuan konten')+'"'+(can?'':' disabled')+'></textarea>'+
      '<small class="form-hint">Maksimal 1.500 karakter total. Jangan memasukkan data rahasia pelanggan.</small></div>'+
      '<div class="ai-foot"><span class="ai-cost"><strong>'+esc(cost)+' Token</strong> / eksekusi</span>'+
      '<button class="btn btn-primary" type="submit"'+(can?'':' disabled')+'>Proses dengan AI '+icon('arrow')+'</button></div>'+
      '<div class="ai-result" role="status" aria-live="polite" hidden></div></form></article></div>':
      empty('Belum ada alat AI aktif','Daftar alat akan tersedia setelah Admin mengaktifkannya.'))+
    '</section>';
}
async function submitAITool(form){
  const btn=form.querySelector('[type=submit]'),box=form.querySelector('.ai-result'),area=form.querySelector('textarea');
  const detail=area.value.trim();
  const business=String(form.elements?.nama_usaha?.value||'').trim();
  const input=(business?'Nama usaha: '+business+'\n':'')+'Detail kebutuhan: '+detail;
  if(!detail){area.focus();return toast('Isi permintaan terlebih dahulu.',true);}
  if(input.length>1500)return toast('Brief terlalu panjang. Batasi total 1.500 karakter.',true);
  const cost=Number(form.dataset.cost)||0,saldo=Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0);
  if(saldo<cost)return toast('Kredit tidak cukup. Silakan top-up kredit di Katalog.',true);
  btn.disabled=true;area.disabled=true;box.hidden=false;box.className='ai-result is-loading';box.textContent='AI sedang menyusun hasil…';
  const signature=JSON.stringify([form.dataset.toolId,input]);
  if(state.aiPending?.signature!==signature)
    state.aiPending={signature,requestId:createRequestId()};
  try{
    const r=await api('generateAI',{tool_id:form.dataset.toolId,input},state.token,
      {write:true,requestId:state.aiPending.requestId});
    state.aiPending=null;
    if(state.home)state.home.saldo_kredit=r.saldo;if(state.me)state.me.saldo_kredit=r.saldo;
    const bal=document.getElementById('ai-balance');if(bal)bal.textContent=r.saldo+' kredit';
    box.className='ai-result';box.innerHTML='<p class="card-kicker">HASIL · '+esc(r.kredit_terpakai)+' KREDIT TERPAKAI</p><div class="ai-text">'+esc(r.hasil)+'</div>'+
      '<div class="ai-result-actions"><button type="button" class="btn btn-secondary btn-sm" data-copy="'+esc(r.hasil)+'">Salin teks '+icon('link')+'</button>'+
      '<a class="btn btn-secondary btn-sm" href="https://wa.me/?text='+encodeURIComponent(String(r.hasil||''))+'" target="_blank" rel="noopener noreferrer">Kirim ke WA ↗</a></div>';
    box.scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(e){
    if(!['NETWORK_ERROR','INTERNAL','RECONCILIATION_REQUIRED'].includes(e.code))
      state.aiPending=null;
    box.className='ai-result is-error';box.textContent=e.message||'AI gagal. Coba lagi.';
    if(e.code==='AI_FAILED')toast('Kredit Anda sudah dikembalikan.');
    try{const d=await api('getBeranda',{},state.token);state.home=d;const bal=document.getElementById('ai-balance');if(bal)bal.textContent=(d.saldo_kredit??0)+' kredit';}catch{}
  }finally{btn.disabled=false;area.disabled=false;}
}
function viewAffiliate(){
  if(!logged())return '<section class="affiliate-public"><p class="eyebrow">PROGRAM AFFILIATE</p>'+
    '<h1>Bagikan produk yang relevan. Dapatkan komisi.</h1>'+
    '<p>Tautan referral pribadi tersedia setelah Anda masuk sebagai member. Komisi mengikuti pembelian dan verifikasi pesanan yang tercatat.</p>'+
    '<button class="btn btn-primary" type="button" data-route="login">Masuk untuk melihat affiliate</button></section>';
  const a=state.affiliates||{},code=a.kode_referral||state.me?.kode_referral||'';
  const site=String(config.siteUrl||location.href.split('#')[0]);
  const url=code?site+(site.includes('?')?'&':'?')+'ref='+encodeURIComponent(code):'';
  const stats=a.saldo||{};
  return '<section class="affiliate-workspace"><header class="affiliate-header"><div><p class="eyebrow">WORKSPACE / AFFILIATE</p>'+
    '<h1>Komisi Affiliate</h1><p>Bagikan tautan Anda. Pantau pendaftar, transaksi, dan komisi yang telah disetujui.</p></div></header>'+
    '<div class="affiliate-summary-grid">'+[
      ['Komisi tertahan',rupiah(stats.PENDING??0),'Dalam masa tahan'],
      ['Siap cair',rupiah(stats.APPROVED??0),'Setelah disetujui'],
      ['Pendaftar',esc(a.pendaftar??0),'Melalui tautan Anda'],
      ['Konversi',esc(a.konversi??0),'Pembelian terverifikasi']
    ].map(function(x){return '<article class="affiliate-summary"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></article>';}).join('')+'</div>'+
    '<section class="affiliate-referral"><div><p class="eyebrow">TAUTAN REFERRAL ANDA</p><h2>'+esc(code||'Belum tersedia')+'</h2>'+
    '<p>Komisi berulang mengikuti persentase masing-masing produk. Masa tahan 14 hari; minimum pengajuan pencairan Rp50.000.</p>'+
    (url?'<div class="affiliate-referral-url">'+esc(url)+'</div>':'')+'</div>'+
    '<button type="button" class="btn btn-primary" data-copy="'+esc(url)+'"'+(!url?' disabled':'')+'>Salin tautan '+icon('link')+'</button></section>'+
    '<section class="affiliate-terms"><h3>Transparansi komisi</h3><p>'+esc(state.info?.disclosure||
      'Komisi referral dihitung atas transaksi yang memenuhi syarat dan mengikuti pemeriksaan status pembayaran.')+'</p></section></section>';
}
function viewNotificationCenter(){
  if(!logged()||isAdmin())return '';
  const enabled=config.notificationsEnabled===true&&isConnected();
  const inbox=state.notifications||{items:[],unread:0};
  const items=Array.isArray(inbox.items)?inbox.items:[];
  const body=!enabled?
    '<p class="card-desc">Belum ada pembaruan akun untuk ditampilkan.</p>':
    !items.length?'<p class="card-desc">Belum ada pembaruan untuk akun Anda.</p>':
    '<div class="list-rows">'+items.map(n=>'<div class="list-row"><div class="left">'+
      '<small>'+esc(friendlyDate(n.created_at))+'</small><strong>'+esc(n.judul||'Pembaruan')+'</strong>'+
      '<p class="card-desc">'+esc(n.pesan||'')+'</p></div>'+
      (n.status==='UNREAD'&&isWriteEnabled()?
        '<button type="button" class="btn btn-ghost btn-sm" data-action="notification-read" data-notification-id="'+
        esc(n.notification_id)+'">Tandai dibaca</button>':'')+'</div>').join('')+'</div>';
  return '<section class="surface section-gap" aria-label="Pusat notifikasi member">'+
    '<p class="card-kicker">AKTIVITAS MEMBER</p><h3>Notifikasi'+
    (enabled?' · '+esc(inbox.unread||0)+' baru':'')+'</h3>'+body+'</section>';
}
function viewProfileEditor(){
  if(!logged()||isAdmin())return '';
  const m=state.me;
  const fields=[
    ['Nama lengkap','nama',80],['Nama usaha','nama_usaha',100],
    ['Jenis usaha','jenis_usaha',80],['Kota','kota',80],
    ['Instagram','instagram',80]
  ];
  return '<form id="profile-form" class="surface section-gap">'+
    '<p class="card-kicker">PROFIL USAHA</p><h3>Perbarui informasi</h3>'+
    '<p class="card-desc">Nomor WhatsApp login, peran, saldo kredit, dan status membership tidak dapat diubah di sini.</p>'+
    '<div class="grid-2">'+fields.map(([label,name,max])=>
      '<div class="field"><label for="profile-'+name+'">'+esc(label)+'</label>'+
      '<input class="input" id="profile-'+name+'" name="'+name+'" value="'+esc(m[name]||'')+
      '" maxlength="'+max+'" '+(['nama','nama_usaha'].includes(name)?'required minlength="2"':'')+'></div>').join('')+
    '</div><div class="field"><label for="profile-deskripsi">Deskripsi usaha</label>'+
    '<textarea class="input" id="profile-deskripsi" name="deskripsi_usaha" maxlength="500" rows="3">'+
    esc(m.deskripsi_usaha||'')+'</textarea></div>'+
    '<button type="submit" class="btn btn-primary" '+(!isWriteEnabled()?'disabled':'')+
    '>Simpan perubahan</button>'+
    (!isWriteEnabled()?'<p class="form-hint">Penyimpanan perubahan profil saat ini belum tersedia.</p>':'')+'</form>';
}
function viewAccount(){
  if(!logged())return title('Akun member','PROFIL & KEAMANAN','Kelola akses ke akun Anda.')+
    '<div class="grid-2"><div class="surface"><h3>Sudah punya akun?</h3><p class="card-desc">Masuk dengan nomor WhatsApp dan PIN Anda.</p><div class="actions" style="margin-top:20px"><button class="btn btn-primary" data-route="login">Masuk member</button><button class="btn btn-secondary" data-route="admin-login">Masuk admin</button></div></div><div class="surface"><h3>Keamanan akun</h3><p class="card-desc">Jangan membagikan PIN, tautan sesi, atau kode pribadi kepada siapa pun.</p></div></div>';
  if(isAdmin()){
    const m=state.me;
    return title('Akun administrator','PENGATURAN AKSES','Informasi pengelola dan jalur operasional akun.')+
      '<div class="grid-2"><section class="surface"><p class="card-kicker">IDENTITAS ADMIN</p>'+
      '<div class="list-rows">'+[
        ['Nama',m.nama],['WhatsApp login',m.wa],['Peran','Administrator'],
        ['Status',m.status],['Bergabung',friendlyDate(m.joined_at)]
      ].map(([label,value])=>'<div class="list-row"><div class="left"><small>'+esc(label)+'</small>'+
        '<strong>'+esc(value||'-')+'</strong></div></div>').join('')+'</div></section>'+
      '<section class="surface"><p class="card-kicker">KEAMANAN & OPERASIONAL</p>'+
      '<h3>Akses panel pengelola</h3><p class="card-desc">Jangan bagikan PIN atau token sesi. Perubahan sistem, saldo, dan pembayaran tetap diverifikasi dari backend.</p>'+
      '<div class="admin-account-actions">'+[
        ['admin','Buka dasbor operasional'],['lms','Kelola kelas dan materi'],
        ['pesanan','Tinjau pesanan'],['dukungan','Buka layanan bantuan']
      ].map(([route,label])=>'<button type="button" class="quick-action" data-route="'+route+'">'+
        '<span>'+esc(label)+'</span>'+icon('arrow')+'</button>').join('')+'</div>'+
      '<button type="button" class="btn btn-secondary" data-action="logout">'+icon('logout')+
      ' Keluar dari akun</button></section>'+
      '<section class="surface admin-password-panel"><p class="card-kicker">GANTI PIN ADMIN</p>'+
      '<h3>Perbarui PIN keamanan</h3><p class="card-desc">PIN baru akan mengakhiri semua sesi admin termasuk perangkat ini.</p>'+
      '<form id="admin-pin-form" class="stack">'+
      '<div class="field"><label for="admin-pin-old">PIN saat ini</label><input class="input" type="password" id="admin-pin-old" name="pin_lama" pattern="[0-9]{6}" inputmode="numeric" autocomplete="current-password" maxlength="6" required></div>'+
      '<div class="field"><label for="admin-pin-new">PIN baru</label><input class="input" type="password" id="admin-pin-new" name="pin_baru" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" maxlength="6" required></div>'+
      '<div class="field"><label for="admin-pin-confirm">Ulangi PIN baru</label><input class="input" type="password" id="admin-pin-confirm" name="pin_konfirmasi" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" maxlength="6" required></div>'+
      '<button type="submit" class="btn btn-primary" '+(!adminLoginEnabled()?'disabled':'')+'>Ganti PIN</button></form></section></div>';
  }
  const m=state.me;return title('Akun Anda','PROFIL MEMBER','Data akun berasal dari server.')+
    '<div class="grid-2"><div class="surface"><p class="card-kicker">INFORMASI AKUN</p>'+
    '<div class="list-rows">'+[
      ['Nama',m.nama],['Nama usaha',m.nama_usaha],['WhatsApp',m.wa],['Status',m.status],['Kode referral',m.kode_referral],['Bergabung',friendlyDate(m.joined_at)]
    ].map(([k,v])=>'<div class="list-row"><div class="left"><small>'+esc(k)+'</small><strong>'+esc(v||'-')+'</strong></div></div>').join('')+'</div></div>'+
    '<div class="surface"><p class="card-kicker">AKSES & KEAMANAN</p><h3>Keamanan akun</h3><p class="card-desc">Sesi disimpan hanya di tab browser ini. Keluar untuk mengakhiri akses lokal.</p><div class="actions" style="margin-top:24px"><button class="btn btn-secondary" data-action="logout">'+icon('logout')+' Keluar dari akun</button></div>'+
    '<div class="divider"></div><h3>Pesanan saya</h3><button class="btn btn-ghost" data-route="pesanan">Lihat riwayat pesanan '+icon('arrow')+'</button><div class="divider"></div><h3>Program affiliate</h3><button class="btn btn-ghost" data-route="affiliate">Lihat referral saya '+icon('arrow')+'</button>'+
    '<div class="divider"></div><h3>Bantuan & dukungan</h3><button class="btn btn-ghost" data-route="dukungan">Laporkan bug atau usulkan fitur '+icon('arrow')+'</button></div></div>'+viewNotificationCenter()+viewProfileEditor();
}
function viewLogin(register=false,adminMode=false){
  const enabled=adminMode?adminLoginEnabled():register?registrationOtpEnabled():isWriteEnabled();
  return '<div class="login-shell"><p class="eyebrow">'+
    (adminMode?'AKSES PENGELOLA':register?'BERGABUNG':'SELAMAT DATANG KEMBALI')+'</p>'+
    '<h1 style="font-size:2.25rem">'+
    (adminMode?'Masuk panel administrator.':register?'Buat akun member.':'Masuk ke ruang Anda.')+'</h1>'+
    '<p class="lead">'+
    (adminMode?'Gunakan nomor WhatsApp administrator yang sudah terdaftar dan PIN enam angka. Tidak perlu membuat akun baru.':register?'Buat akun melalui WhatsApp untuk menggunakan alat dan layanan Ngulik Digital.':'Gunakan nomor WhatsApp dan PIN enam angka yang terdaftar.')+'</p>'+
    '<form id="auth-form" class="surface" data-mode="'+(adminMode?'admin':register?'register':'login')+'">'+
    (register?'<div class="field"><label for="nama">Nama lengkap</label><input class="input" id="nama" name="nama" autocomplete="name" required minlength="2" maxlength="80"></div>'+
      '<div class="field"><label for="usaha">Nama usaha</label><input class="input" id="usaha" name="nama_usaha" required minlength="2" maxlength="100"></div>':'')+
    '<div class="field"><label for="wa">Nomor WhatsApp</label><input class="input" id="wa" name="wa" required inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx"></div>'+
    '<div class="field"><label for="pin">PIN 6 angka</label><input class="input" id="pin" name="pin" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" type="password" autocomplete="'+(register?'new-password':'current-password')+'" placeholder="••••••"></div>'+
    (register?'<div class="field"><label for="otp">Kode OTP WhatsApp</label><input class="input" id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" type="text" required placeholder="6 digit kode verifikasi"></div>'+
      '<div class="actions" style="margin-bottom:13px"><button type="button" class="btn btn-secondary" data-action="otp-request" '+(!enabled?'disabled':'')+'>Kirim kode OTP</button>'+
      '<button type="button" class="btn btn-ghost" data-action="otp-verify" '+(!enabled?'disabled':'')+'>Verifikasi kode</button></div>':'')+
    (register?'<div class="field"><label><input type="checkbox" name="setuju_kebijakan" required> Saya menyetujui ketentuan program dan kebijakan privasi.</label></div>':'')+
    '<button class="btn btn-primary btn-wide" type="submit" '+(!enabled?'disabled':'')+'>'+
    (adminMode?'Masuk admin':register?'Buat akun':'Masuk')+' '+icon('arrow')+'</button>'+
    '<p class="form-hint" style="margin:13px 0 0">'+
    (enabled?'Jaga kerahasiaan PIN Anda.':adminMode?'Akses administrator belum diaktifkan pada backend. Akun yang sudah ada tetap aman.':'Pendaftaran dan akses member sedang dipersiapkan.')+'</p></form>'+
    '<p class="small login-other-route">'+
    (adminMode?'<button class="btn btn-ghost btn-sm" data-route="login">Kembali ke login member</button>':
      register?'Sudah punya akun? <button class="btn btn-ghost btn-sm" data-route="login">Masuk</button>':
      'Pengelola Ngulik Digital? <button class="btn btn-ghost btn-sm" data-route="admin-login">Masuk sebagai admin</button>')+
    '</p>'+
    (adminMode&&!String(config.brand||'').includes('STAGING')?
      '<section class="admin-env-notice"><strong>Database STAGING menggunakan Admin Studio terpisah.</strong>'+
      '<p>Website ini memakai deployment Apps Script yang berbeda. Untuk input banner, katalog, LMS dan jasa pada STAGING yang sudah aktif, gunakan editor berikut.</p>'+
      '<a class="btn btn-primary" href="./staging/member.html#admin-login">Buka Admin Studio STAGING '+icon('arrow')+'</a></section>':'')+
    '</div>';
}
function viewMyOrders(){
  if(!logged())return title('Pesanan saya','RIWAYAT TRANSAKSI','Akses data pesanan pribadi.')+needLogin('pesanan');
  return title('Pesanan saya','RIWAYAT TRANSAKSI','Perubahan status diperbarui oleh admin setelah verifikasi.')+
    (!state.orders.length?empty('Belum ada pesanan','Produk yang Anda pesan nantinya muncul di sini.','katalog','Lihat katalog'):
    '<div class="stack">'+state.orders.map(o=>'<article class="surface list-row"><div class="left"><strong>'+esc(o.nama_produk)+'</strong><small>'+esc(o.order_id)+' · '+friendlyDate(o.created_at)+'</small></div><div class="right">'+safeBadge(o.status)+'<div class="product-meta" style="margin-top:7px">'+rupiah(o.total_bayar)+'</div></div></article>').join('')+'</div>');
}
function viewCheckout(){
  const o=state.lastOrder;
  if(!o)return title('Pembayaran','PESANAN ANDA','')+
    empty('Pesanan belum dipilih','Pilih produk terlebih dahulu.','katalog','Buka katalog');
  const fallbackQr=Boolean(qrisUrl()&&config.qrisMerchant);
  const paymentLink=(()=>{
    try{
      const url=new URL(String(o.gateway_payment_url||''));
      return url.protocol==='https:'&&url.username===''&&url.password===''?url.href:'';
    }catch{return '';}
  })();
  const ms=new Date(o.expires_at).getTime()-Date.now();
  const seconds=Number.isFinite(ms)?Math.max(0,Math.ceil(ms/1000)):0;
  const timer=Number.isFinite(ms)?
    String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'—';
  const qrSource=fallbackQr?qrisUrl():'';
  const manual=String(o.metode||'').includes('STATIS');
  const pending=['PENDING','MENUNGGU_VERIFIKASI'].includes(String(o.status||''));
  return '<div class="checkout-backdrop"><section class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">'+
    '<header class="checkout-heading"><div><p class="eyebrow">NGULIK DIGITAL / CHECKOUT</p>'+
    '<h1 id="checkout-title">Konfirmasi pesanan</h1><p>Nomor order: '+esc(o.order_id)+'</p></div>'+
    '<button type="button" class="checkout-close" data-route="katalog" aria-label="Tutup checkout">×</button></header>'+
    '<div class="checkout-summary"><section><h2>Rincian pembelian</h2>'+
    '<div class="price-line"><span>Produk</span><strong>'+esc(o.nama_produk||'—')+'</strong></div>'+
    '<div class="price-line"><span>Harga</span><strong>'+rupiah(o.harga_dasar)+'</strong></div>'+
    '<div class="price-line"><span>Kode unik</span><strong>'+rupiah(o.kode_unik)+'</strong></div>'+
    '<div class="checkout-total"><small>Total tagihan</small><strong>'+rupiah(o.total_bayar)+'</strong></div>'+
    '<p class="checkout-countdown" id="checkout-countdown" data-expiry="'+esc(o.expires_at||'')+'">Batas pembayaran: '+timer+'</p>'+
    '<p class="checkout-note">Status: '+esc(o.status||'PENDING')+
    '. Pembayaran dianggap berhasil setelah terverifikasi oleh backend.</p></section>'+
    '<section><h2>Metode pembayaran</h2>'+
    (paymentLink?
      '<div class="checkout-qr"><strong>Pembayaran QRIS</strong>'+
      '<p class="checkout-note">Tautan pembayaran resmi tersedia dari server.</p>'+
      '<a class="btn btn-primary" href="'+esc(paymentLink)+'" target="_blank" rel="noopener noreferrer">Buka pembayaran aman ↗</a></div>':
      qrSource?
      '<div class="checkout-qr"><img src="'+esc(qrSource)+'" alt="QRIS merchant '+esc(config.qrisMerchant)+'" width="220" height="220">'+
      '<strong>'+esc(config.qrisMerchant)+'</strong><p class="checkout-note">Bayar sesuai jumlah termasuk kode unik.</p></div>':
      '<div class="checkout-qr"><strong>Informasi pembayaran</strong>'+
      '<p class="checkout-note">QRIS belum tersedia pada respons pesanan. Jangan mentransfer sebelum QRIS atau tautan resmi ditampilkan.</p></div>')+
    (manual&&qrSource&&pending?
      '<button class="btn btn-primary btn-wide" type="button" data-action="confirm-payment">Saya sudah membayar</button>':'')+
    '<p class="checkout-note">Simpan nomor pesanan untuk memantau status pada menu Pesanan.</p></section></div>'+
    '</section></div>';
}
function viewAdminRuntime(){
  const data=state.adminRuntime, schema=data?.schema;
  const flags=data?.feature_flags;
  const names=[
    ['mutations','Perubahan data'],['registration','Pendaftaran'],
    ['finance','Keuangan'],['catalog','Katalog'],['content','Konten visual'],['services','Pemesanan jasa'],
    ['support','Bantuan'],['lms','Studio LMS'],['notifications','Notifikasi']
  ];
  return '<section class="admin-runtime section-gap" aria-label="Kondisi sistem backend">'+
    '<div class="section-head"><div><p class="eyebrow">STATUS TEKNIS / SERVER</p>'+
    '<h2>Kesiapan operasional backend</h2>'+
    '<p>Indikator berasal dari Apps Script dan tidak menggantikan audit pembayaran atau persetujuan go-live.</p></div></div>'+
    (schema?'<div class="admin-runtime-summary"><div><small>Skema data terverifikasi</small>'+
      '<strong>'+esc(schema.ready)+' / '+esc(schema.expected)+' tab</strong></div>'+
      '<span class="chip '+(schema.ready===schema.expected?'green':'orange')+'">'+
      (schema.ready===schema.expected?'STRUKTUR SESUAI':'PERLU PENYESUAIAN')+'</span></div>'+
      ((schema.missing?.length||schema.mismatched?.length)?
        '<p class="admin-runtime-note">Tab tidak tersedia: '+esc((schema.missing||[]).join(', ')||'—')+
        '. Header berbeda: '+esc((schema.mismatched||[]).join(', ')||'—')+'.</p>':'')+
      '<div class="admin-runtime-flags">'+names.map(([key,label])=>
        '<div class="admin-runtime-flag"><span>'+esc(label)+'</span>'+
        '<strong>'+((flags||{})[key]===true?'Aktif':(flags||{})[key]===false?'Nonaktif':'Belum diketahui')+'</strong></div>').join('')+'</div>':
      '<div class="surface"><p class="card-desc">'+
      esc(state.adminRuntimeError||'Pemeriksaan backend belum dimuat. Data status belum dapat dinyatakan siap.')+
      '</p></div>')+'</section>';
}
function viewAdmin(){
  if(!isAdmin())return empty('Akses administrator','Gunakan akun administrator terdaftar untuk membuka pengelolaan Ngulik Digital.','admin-login','Masuk admin');
  const details=state.adminSummary?.ringkasan||[];
  return '<section class="admin-operations-intro"><p class="eyebrow">ADMIN STUDIO / NGULIK DIGITAL</p><h1>Siap mengelola bisnis Anda.</h1><p>Mulai isi konten, produk, kelas, dan layanan. Semua tombol penyimpanan tetap diperiksa oleh backend sesuai hak akses Admin.</p>'+
    (config.brand?.includes('STAGING')?'<span class="chip">DATA STAGING — bukan website produksi</span>':'<span class="chip">Data sesuai layanan terhubung</span>')+'</section>'+
    '<section class="admin-start-actions" aria-label="Mulai mengelola bisnis">'+
    '<div><p class="eyebrow">MULAI DARI SINI</p><h2>Apa yang ingin Anda isi hari ini?</h2></div>'+
    '<div class="admin-start-grid">'+[
      ['konten','Pasang banner','Atur gambar, judul dan tombol promosi.'],
      ['produk','Tambah produk','Masukkan nama, harga dan katalog.'],
      ['lms','Buat kelas LMS','Susun kurikulum dan pelajaran.'],
      ['layanan','Kelola jasa','Tinjau brief dan penawaran pelanggan.']
    ].map(([route,heading,detail])=>'<button type="button" class="admin-start-item" data-route="'+route+'">'+
      '<strong>'+heading+' '+icon('arrow')+'</strong><small>'+detail+'</small></button>').join('')+
    '</div></section>'+
    '<div class="admin-module-grid">'+[
      ['grid','Konten visual','Atur banner otomatis, gambar produk, ikon dan jadwal terbit.','konten'],
      ['clipboard','Pesanan','Periksa pembayaran manual dan status fulfillment.','pesanan'],
      ['users','Kelola member','Lihat data member dan status keanggotaan.','member'],
      ['store','Katalog produk','Periksa harga, ketersediaan dan penawaran yang tampil di publik.','produk'],
      ['clipboard','Permintaan jasa','Tinjau brief pelanggan dan siapkan penawaran.','layanan'],
      ['clock','Waiting list','Tinjau antrean dan kuota gelombang.','antrean'],
      ['shield','Pengaturan sistem','Lihat konfigurasi resmi dan kesiapan fitur backend.','pengaturan'],
      ['book','Studio LMS','Kelola kurikulum, pelajaran, workspace otomatis dan draft AI.','lms'],
      ['clipboard','Tiket support','Kelola bug, pertanyaan, dan permintaan fitur.','dukungan'],
      ['grid','Product releases','Catat versi, perbaikan, dan pembaruan produk.','rilis']
    ].map(x=>'<article class="surface admin-module-card"><div class="surface-icon">'+icon(x[0])+'</div><h3>'+x[1]+'</h3><p class="card-desc">'+x[2]+'</p><button class="btn btn-ghost btn-sm" data-route="'+x[3]+'">Buka modul '+icon('arrow')+'</button></article>').join('')+'</div>'+
    '<section class="section-gap">'+title('Ringkasan data','METRIK SISTEM','Nilai berasal dari rumus Google Sheets.')+
    (details.length?'<div class="grid-3">'+details.slice(0,12).map(x=>'<div class="stat"><div class="stat-value">'+esc(x.nilai)+'</div><div class="stat-label">'+esc(x.metrik)+'</div></div>').join('')+'</div>':
    empty('Ringkasan belum dimuat','Periksa koneksi dan hak akses admin.'))+'</section>';
}
// Read-only configuration viewer: never enables mutations and never reveals
// operator emails, private WhatsApp numbers or Script Properties.
function viewAdminSettings(){
  if(!isAdmin())return needLogin('pengaturan administrator');
  const settings=state.adminSettings;
  const groups=[
    ['Identitas dan keanggotaan',[
      ['nama_brand','Nama brand'],['mode_pendaftaran','Mode pendaftaran'],
      ['gelombang_aktif','Gelombang aktif'],['kuota_gelombang','Kuota member'],
      ['trial_hari','Durasi trial (hari)'],['link_classroom','Link Classroom']]],
    ['Program dan komisi',[
      ['kredit_awal','Kredit awal'],['kredit_peringatan_persen','Ambang peringatan kredit (%)'],
      ['komisi_persen','Komisi afiliasi (%)'],
      ['masa_tahan_hari','Masa tahan komisi (hari)'],
      ['min_payout','Minimum pencairan (Rp)']]],
    ['Informasi publik',[
      ['teks_disclosure_affiliate','Keterangan afiliasi']]]
  ];
  const cell=(key,label)=>{
    const value=settings?.[key];
    const printable=value===true?'Ya':value===false?'Tidak':
      value===undefined||value===null||value===''?'Belum diatur':String(value);
    return '<div class="surface"><p class="card-kicker">'+esc(label)+'</p>'+
      '<p class="card-desc" style="overflow-wrap:anywhere;margin-top:8px">'+esc(printable)+'</p></div>';
  };
  const body=settings?
    groups.map(([heading,fields])=>
      '<section class="section-gap">'+title(heading,'KONFIGURASI TERCATAT','Data dibaca dari pengaturan_sistem.')+
      '<div class="grid-3">'+fields.map(([key,label])=>cell(key,label)).join('')+'</div></section>').join(''):
    empty('Pengaturan belum terbaca',state.adminSettingsError||
      'Sesi atau koneksi ke backend belum selesai dimuat.');
  const status='Pengaturan global ditampilkan untuk referensi. Untuk input banner, katalog, dan kelas, gunakan modul Admin terkait. Status izin backend ditampilkan terpisah di bawah.';
  return '<section class="section-head"><div><p class="eyebrow">ADMIN / PENGATURAN SISTEM</p>'+
    '<h2>Konfigurasi Ngulik Digital</h2><p>Periksa nilai resmi, bukan contoh. Hanya data konfigurasi nonrahasia yang ditampilkan.</p></div></section>'+
    '<div class="banner"><div><h3>Pengaturan dan data operasional</h3><p>'+esc(status)+'</p></div></div>'+
    body+viewAdminRuntime();
}

const catalogWriteEnabled=()=>isWriteEnabled()&&config.catalogEnabled===true;
function adminCatalogItems(){
  if(state.adminCatalog.length||(isConnected()&&!state.qa))return state.adminCatalog;
  return state.catalog.map((p,i)=>({
    ...p,perlu_approval_admin:['LISENSI_SEKALI','SEAT_30H','JASA_SEKALI'].includes(p.tipe),
    bisa_komisi:p.tipe!=='TOPUP_KREDIT',aktif:true,urut:i+1,
    kredit_diberikan:p.kredit_diberikan??0,
    durasi_hari:p.durasi_hari??(['LANGGANAN_30H','SEAT_30H'].includes(p.tipe)?30:0),
    revision:''
  }));
}
function viewAdminCatalog(){
  if(!isAdmin())return needLogin('katalog admin');
  const items=adminCatalogItems(),canWrite=catalogWriteEnabled();
  const selected=items.find(p=>p.product_id===state.catalogEditId)||null;
  const types=[
    ['LANGGANAN_30H','Langganan 30 hari'],['LISENSI_SEKALI','Lisensi sekali bayar'],
    ['SEAT_30H','Seat 30 hari'],['TOPUP_KREDIT','Top-up kredit'],
    ['JASA_SEKALI','Jasa (manual)'],['PRODUK_DIGITAL','Produk digital']
  ];
  const draft=selected||{
    nama:'',deskripsi:'',tipe:'PRODUK_DIGITAL',harga:'',
    kredit_diberikan:0,durasi_hari:0,urut:items.length+1,
    perlu_approval_admin:false,bisa_komisi:false,sumber_produk:'INTERNAL',komisi_persen:''
  };
  const input=(name,label,type,max)=>
    '<div class="field"><label for="cat-'+name+'">'+label+'</label>'+
    '<input class="input" id="cat-'+name+'" name="'+name+'" type="'+type+
    '" '+(type==='number'?'min="'+(name==='harga'||name==='urut'?'1':'0')+'" step="1"':'maxlength="'+max+'"')+
    ' value="'+esc(draft[name]??'')+'" required></div>';
  const bool=(name,label)=>
    '<label class="catalog-check"><input type="checkbox" name="'+name+'" '+
    (draft[name]===true?'checked':'')+'/><span>'+label+'</span></label>';
  const intro='<div class="catalog-admin-intro"><div><p class="eyebrow">ADMIN / OPERASIONAL PRODUK</p>'+
    '<h1>Katalog & penawaran</h1><p>Atur penawaran yang terlihat di publik tanpa mengubah riwayat order yang sudah ada.</p></div>'+
    '<span class="chip">'+items.length+' produk tercatat</span></div>'+
    '<div class="banner warning"><div><h3>Perubahan katalog dikendalikan secara terpisah</h3>'+
    '<p>Semua jenis penawaran dapat dipesan. Top-up dan eBook bonus kredit diproses otomatis; jasa, lisensi, dan seat diselesaikan admin setelah pembayaran terverifikasi.</p></div>'+
    '<span class="chip orange">'+(canWrite?'EDITOR PRODUK':'TIDAK DAPAT DIEDIT')+'</span></div>';
  const entries='<section class="catalog-admin-list" aria-label="Daftar penawaran">'+
    items.map(p=>'<article class="catalog-admin-row">'+
      '<div class="catalog-admin-badge">'+icon(p.tipe==='TOPUP_KREDIT'?'spark':'store')+'</div>'+
      '<div class="catalog-admin-row-info"><h3>'+esc(p.nama)+'</h3>'+
      '<p>'+esc(offerCategoryLabel(p))+' · '+rupiah(p.harga)+' · '+
      (p.aktif?'Tampil di publik':'Disembunyikan')+
      (supportedSaleTypes.has(p.tipe)?'':' · Checkout belum didukung')+'</p></div>'+
      '<div class="catalog-admin-controls"><button class="btn btn-secondary btn-sm" type="button" '+
      'data-catalog-edit="'+esc(p.product_id)+'">Edit</button>'+
      '<button class="btn btn-ghost btn-sm" type="button" data-catalog-active="'+esc(p.product_id)+'" '+
      'aria-label="'+(p.aktif?'Nonaktifkan':'Aktifkan')+' '+esc(p.nama)+'" '+
      (!canWrite?'disabled title="Pengelolaan katalog belum diaktifkan"':'')+'>'+
      (p.aktif?'Nonaktifkan':'Aktifkan')+'</button></div></article>').join('')+
    (!items.length?'<div class="empty"><h3>Belum ada produk</h3><p>Produk akan muncul ketika ditambahkan oleh admin.</p></div>':'')+
    '</section>';
  const form='<section class="catalog-admin-editor" aria-label="Editor katalog">'+
    '<div class="catalog-admin-editor-head"><div><p class="card-kicker">EDITOR PRODUK</p><h2>'+
    (selected?'Edit penawaran':'Tambah penawaran')+'</h2>'+
    '<p class="card-desc">Produk baru selalu dibuat nonaktif. Aktifkan setelah meninjau isi dan harga.</p></div>'+
    (selected?'<button type="button" class="btn btn-secondary btn-sm" data-action="catalog-new">Buat baru</button>':'')+'</div>'+
    '<form id="admin-catalog-form" class="catalog-admin-form" data-product-id="'+esc(selected?.product_id||'')+'">'+
    '<div class="catalog-form-grid">'+
    input('nama','Nama produk','text',120)+input('harga','Harga (Rp)','number',0)+
    '<div class="field"><label for="cat-tipe">Jenis penawaran</label>'+
    '<select class="input" id="cat-tipe" name="tipe" '+(selected?'disabled':'')+'>'+
    types.map(x=>'<option value="'+x[0]+'" '+(draft.tipe===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+
    '</select></div>'+
    input('urut','Urutan tampilan','number',0)+
    input('kredit_diberikan','Kredit diberikan','number',0)+
    input('durasi_hari','Durasi hari (0 atau 30)','number',0)+
    '<div class="field"><label for="cat-komisi">Komisi produk (%) — kosong = default</label>'+
    '<input class="input" id="cat-komisi" name="komisi_persen" type="number" min="0" max="50" step="1" placeholder="Default" value="'+
    esc(draft.komisi_persen??'')+'"></div>'+
    '<div class="field"><label for="cat-sumber">Sumber produk</label>'+
    '<input class="input" id="cat-sumber" name="sumber_produk" maxlength="60" required '+
    'pattern="[A-Za-z0-9_-]{2,60}" value="'+esc(draft.sumber_produk||'INTERNAL')+'"></div></div>'+
    '<div class="field"><label for="cat-deskripsi">Deskripsi (minimal 10 karakter)</label>'+
    '<textarea class="input" id="cat-deskripsi" name="deskripsi" maxlength="350" minlength="10" rows="4" required>'+
    esc(draft.deskripsi)+'</textarea></div>'+
    '<div class="catalog-checks">'+bool('perlu_approval_admin','Memerlukan persetujuan admin')+
    bool('bisa_komisi','Memenuhi syarat komisi affiliate')+'</div>'+
    '<div class="catalog-admin-form-actions">'+
    '<button class="btn btn-primary" type="submit" '+(!canWrite?'disabled title="Pengelolaan katalog belum diaktifkan"':'')+'>'+
    (selected?'Simpan perubahan':'Buat produk (nonaktif)')+' '+icon('arrow')+'</button>'+
    (!canWrite?'<span class="form-hint">Penyuntingan produk belum dapat dilakukan saat ini.</span>':'')+
    '</div></form></section>';
  return intro+'<div class="catalog-admin-layout"><div>'+entries+'</div>'+form+'</div>';
}
const contentWriteEnabled=()=>isWriteEnabled()&&config.contentEnabled===true;
function viewAdminContent(){
  return window.NGD_CONTENT_UI?
    window.NGD_CONTENT_UI.admin({authorized:isAdmin(),items:state.adminContent,
      selectedId:state.contentEditId,products:state.catalog,enabled:contentWriteEnabled()}):
    empty('Editor belum tersedia','Komponen pengelolaan konten belum termuat.');
}
const serviceWriteEnabled=()=>isWriteEnabled()&&config.serviceEnabled===true;
function viewServiceRequests(){
  return window.NGD_SERVICES_UI?
    window.NGD_SERVICES_UI.member({logged:logged()&&!isAdmin(),
      items:state.services,enabled:serviceWriteEnabled(),kind:state.serviceKind}):
    empty('Layanan belum tersedia','Halaman layanan tidak dapat ditampilkan saat ini.');
}
function viewAdminServices(){
  return window.NGD_SERVICES_UI?
    window.NGD_SERVICES_UI.admin({authorized:isAdmin(),items:state.services,
      enabled:serviceWriteEnabled(),selectedId:state.selectedServiceId}):
    empty('Layanan belum tersedia','Daftar permintaan jasa tidak dapat ditampilkan saat ini.');
}
function viewAdminOrders(){
  if(!isAdmin())return needLogin('pesanan admin');
  const rows=state.adminOrders;
  const reconciliation=state.reconciliation?.needs_review||0;
  return title('Verifikasi & rekonsiliasi','PESANAN ADMIN','Pembayaran QRIS harus diperiksa melalui bukti dan penerimaan dana yang nyata.')+
    (reconciliation?'<div class="banner warning"><div><h3>'+reconciliation+' pesanan perlu peninjauan</h3><p>Jangan memberikan akses produk dua kali. Lihat catatan rekonsiliasi.</p></div></div>':'')+
    (!rows.length?empty('Belum ada order','Order dari member akan tercatat di sini.'):
    '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Produk</th><th>Total</th><th>Status</th></tr></thead><tbody>'+
    rows.map(o=>'<tr><td>'+esc(o.order_id)+'</td><td>'+esc(o.nama_produk)+'</td><td>'+rupiah(o.total_bayar)+'</td><td>'+safeBadge(o.status)+'</td></tr>').join('')+'</tbody></table></div>')+
    '<p class="small muted" style="margin-top:14px">Pengembalian dana hanya diproses setelah verifikasi tim administrasi.</p>';
}
function viewMembers(waiting=false){
  if(!isAdmin())return needLogin('data member admin');
  if(waiting){
    const rows=state.waitlist||[];
    return title('Waiting List','ADMIN MEMBER','Member dalam antrean pendaftaran.')+
      (rows.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Posisi</th><th>Nama & usaha</th><th>Tanggal</th></tr></thead><tbody>'+
      rows.map((m,i)=>'<tr><td>'+esc(m.posisi||i+1)+'</td><td>'+esc(m.nama)+'<span class="sub">'+esc(m.nama_usaha)+'</span></td><td>'+friendlyDate(m.joined_at)+'</td></tr>').join('')+
      '</tbody></table></div>':empty('Antrean kosong','Belum ada member dalam waiting list.'));
  }
  const results=state.memberSearch,rows=results?.items||[];
  return title('Cari Member','MEMBER 360°','Temukan member berdasarkan ID, WhatsApp, nama usaha, status, atau produk yang dibeli.')+
    '<form id="member-search-form" class="surface"><div class="support-search-grid member-search-grid">'+
    '<div class="field"><label for="member-search-text">Kata kunci</label><input id="member-search-text" class="input" name="query" maxlength="100" placeholder="Nama, WA, atau ID"></div>'+
    '<div class="field"><label for="member-search-product">Produk</label><select id="member-search-product" class="input" name="product_id"><option value="">Semua produk</option>'+
      state.catalog.map(p=>'<option value="'+esc(p.product_id)+'">'+esc(p.nama)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label for="member-search-status">Status akun</label><select id="member-search-status" class="input" name="status"><option value="">Semua</option><option value="AKTIF">Aktif</option><option value="WAITING_LIST">Waiting list</option><option value="SUSPENDED">Ditangguhkan</option></select></div>'+
    '<div class="field"><label for="member-access-status">Status layanan</label><select id="member-access-status" class="input" name="akses_status"><option value="">Semua status akses</option>'+
    '<option value="AKTIF">Aktif</option><option value="BERAKHIR">Berakhir</option><option value="MENUNGGU_AKTIVASI">Menunggu aktivasi</option><option value="MENUNGGU_PEMENUHAN">Menunggu pemenuhan</option><option value="PERLU_REKONSILIASI">Perlu rekonsiliasi</option><option value="KREDIT_TERCATAT">Kredit tercatat</option><option value="TERVERIFIKASI">Terverifikasi</option></select></div>'+
    '<button class="btn btn-primary" type="submit">Cari member '+icon('arrow')+'</button></div></form>'+
    '<div class="section-gap">'+title('Hasil pencarian','PROFIL MEMBER',
      results?'Menampilkan hingga 50 hasil dari '+results.total+' kecocokan.':'Masukkan kata kunci minimal dua karakter atau gunakan filter.')+
    (rows.length?'<div class="stack">'+rows.map(m=>'<article class="surface support-member-row">'+
      '<div><h3>'+esc(m.nama)+'</h3><p class="card-desc">'+esc(m.nama_usaha||'-')+' · '+esc(m.member_id)+' · WA •••'+esc(m.wa_akhir)+'</p>'+
      '<p class="tiny muted">'+esc((m.produk||[]).join(', ')||'Belum ada pembelian terverifikasi')+
      (m.akses_status?' · '+esc(m.akses_status):'')+'</p></div>'+
      '<div class="support-ticket-head">'+safeBadge(m.status)+
      '<button class="btn btn-secondary btn-sm" data-member-id="'+esc(m.member_id)+'">Buka Member 360° '+icon('arrow')+'</button></div></article>').join('')+'</div>':
      empty(results?'Tidak ditemukan':'Belum ada pencarian',
        results?'Coba kata kunci lain atau ganti filter.':'Data hanya tampil setelah admin melakukan pencarian.'))+'</div>';
}
function supportStatusLabel(status){
  return ({OPEN:'Baru',TRIAGE:'Ditinjau',IN_PROGRESS:'Ditangani',
    WAITING_MEMBER:'Menunggu member',RESOLVED:'Selesai',CLOSED:'Ditutup'})[status]||status||'-';
}
const supportWriteEnabled=()=>isWriteEnabled()&&config.supportEnabled===true;
function supportProductChoices(withEmpty=true){
  return (withEmpty?'<option value="">Pertanyaan umum / tanpa produk</option>':'')+
    state.memberProducts.map(p=>'<option value="'+esc(p.product_id)+'">'+esc(p.nama)+' — '+esc(p.akses_status)+'</option>').join('');
}
function supportTicketCard(t){
  return '<article class="surface support-ticket"><div class="support-ticket-head"><span class="chip">'+esc(t.kategori||'BANTUAN')+'</span>'+safeBadge(t.status)+'</div>'+
    '<h3>'+esc(t.judul)+'</h3><p class="card-desc">'+esc(t.ticket_id)+' · '+esc(t.product_id||'Akun umum')+
    ' · '+friendlyDate(t.created_at)+'</p>'+
    '<button type="button" class="btn btn-secondary btn-sm" style="margin-top:15px" data-ticket-id="'+esc(t.ticket_id)+'">Buka tiket '+icon('arrow')+'</button></article>';
}
function viewSupport(){
  if(!logged())return title('Bantuan & Dukungan','PUSAT LAYANAN',
    'Laporan bug, permintaan fitur, dan bantuan produk.')+needLogin('layanan dukungan');
  if(isAdmin()){
    const overview=state.supportOverview||{},stats=overview.by_status||{},tickets=state.adminSupportTickets||[];
    return title('Pusat Layanan','ADMIN / SUPPORT','Tangani keluhan dan permintaan fitur berdasarkan data member.')+
      '<div class="metric-grid">'+[
        ['Tiket keseluruhan',overview.total??0],
        ['Perlu triase',stats.OPEN??0],
        ['Prioritas tinggi',overview.urgent??0]
      ].map(([k,v])=>'<div class="metric-card static"><strong>'+esc(v)+'</strong><small>'+k+'</small></div>').join('')+'</div>'+
      '<div class="section-gap">'+title('Antrean tiket','TIKET MASUK',
        'Filter menurut status, jenis laporan dan produk terkait.')+
      '<form id="support-filter-form" class="surface" style="margin-bottom:18px"><div class="support-search-grid">'+
      '<div class="field"><label for="support-filter-status">Status tiket</label><select id="support-filter-status" class="input" name="status"><option value="">Semua status</option>'+
      ['OPEN','TRIAGE','IN_PROGRESS','WAITING_MEMBER','RESOLVED','CLOSED'].map(s=>'<option value="'+s+'">'+esc(supportStatusLabel(s))+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="support-filter-category">Kategori</label><select id="support-filter-category" class="input" name="kategori"><option value="">Semua kategori</option><option>BUG</option><option>FITUR</option><option>PERTANYAAN</option></select></div>'+
      '<div class="field"><label for="support-filter-product">Produk</label><select id="support-filter-product" class="input" name="product_id"><option value="">Semua produk</option>'+
      state.catalog.map(p=>'<option value="'+esc(p.product_id)+'">'+esc(p.nama)+'</option>').join('')+'</select></div>'+
      '<button type="submit" class="btn btn-primary">Terapkan filter</button></div></form>'+
      (tickets.length?'<div class="grid-2">'+tickets.map(t=>
        supportTicketCard(t).replace('<h3>','<p class="tiny muted">'+esc(t.nama_member||'')+'</p><h3>')).join('')+'</div>':
        empty('Belum ada tiket','Belum ada laporan dukungan.'))+'</div>'+
      (overview.findings?.length?'<div class="banner warning section-gap"><div><h3>Kasus perlu pemeriksaan</h3><p>'+
        esc(overview.findings.length)+' potensi masalah riwayat/triase terdeteksi.</p></div></div>':'');
  }
  const list=state.supportTickets||[],releases=state.supportReleases||[];
  return title('Bantuan & Dukungan','RUANG MEMBER',
    'Laporkan kendala produk, usulkan fitur baru, dan pantau progres penanganan.')+
    '<div class="grid-2"><section class="surface"><p class="card-kicker">BUAT LAPORAN</p>'+
    '<form id="support-create-form" class="stack" autocomplete="off">'+
    '<div class="field"><label for="ticket-category">Jenis laporan</label><select id="ticket-category" class="input" name="kategori" required>'+
    '<option value="PERTANYAAN">Pertanyaan / bantuan akun</option><option value="BUG">Laporan bug</option><option value="FITUR">Permintaan fitur</option></select></div>'+
    '<div class="field"><label for="ticket-product">Produk terkait</label><select id="ticket-product" name="product_id" class="input">'+supportProductChoices()+'</select></div>'+
    '<div class="field"><label for="ticket-title">Judul</label><input id="ticket-title" class="input" name="judul" required minlength="8" maxlength="120" placeholder="Contoh: Struk tidak tercetak"></div>'+
    '<div class="field"><label for="ticket-detail">Penjelasan kejadian / kebutuhan</label><textarea id="ticket-detail" class="input" name="deskripsi" rows="5" required minlength="20" maxlength="2000" placeholder="Ceritakan apa yang terjadi, langkah reproduksi, dan hasil yang diharapkan. Jangan memasukkan PIN atau kata sandi."></textarea></div>'+
    '<div class="grid-2"><div class="field"><label for="ticket-platform">Perangkat</label><select class="input" name="platform" id="ticket-platform"><option value="ANDROID">Android</option><option value="WINDOWS">Windows</option><option value="WEB">Browser web</option><option value="LAINNYA">Lainnya</option></select></div>'+
    '<div class="field"><label for="ticket-version">Versi aplikasi (opsional)</label><input class="input" id="ticket-version" name="versi_aplikasi" placeholder="1.2.0" maxlength="32"></div></div>'+
    '<button type="submit" class="btn btn-primary btn-wide" '+(!supportWriteEnabled()?'disabled title="Fitur support belum diaktifkan"':'')+'>Kirim laporan '+icon('arrow')+'</button>'+
    '<p class="form-hint">Hanya data teks yang dikirim. Jangan sertakan PIN, token, atau informasi pembayaran rahasia.</p></form></section>'+
    '<section><div class="surface"><p class="card-kicker">RIWAYAT LAPORAN SAYA</p>'+
    (list.length?'<div class="stack">'+list.slice(0,8).map(supportTicketCard).join('')+'</div>':
      empty('Belum ada laporan','Tiket yang Anda buat akan tampil di sini.'))+'</div>'+
    '<div class="surface section-gap"><p class="card-kicker">UPDATE PRODUK SAYA</p>'+
    (releases.length?'<div class="stack">'+releases.slice(0,5).map(item=>'<div class="step"><span class="step-no">'+icon('check')+'</span><div class="step-body"><h3>'+
      esc(item.judul)+' · '+esc(item.versi)+'</h3><p>'+esc(item.ringkasan)+'</p><small class="muted">'+friendlyDate(item.published_at)+'</small></div></div>').join('')+'</div>':
      '<p class="card-desc">Pembaruan yang diterbitkan untuk produk yang Anda miliki akan muncul di sini.</p>')+
    '</div></section></div>';
}
function viewTicketDetail(){
  if(!logged())return needLogin('detail tiket');
  const d=state.ticketDetail;
  if(!d||d.ticket?.ticket_id!==state.selectedTicketId)
    return title('Detail tiket','SUPPORT','Riwayat percakapan dan penanganan.')+
      empty('Pilih tiket dari daftar','Buka menu Bantuan dan pilih tiket yang ingin ditinjau.','dukungan','Lihat tiket');
  const t=d.ticket,activities=d.activities||[];
  const options={
    OPEN:['TRIAGE','IN_PROGRESS'],TRIAGE:['IN_PROGRESS','WAITING_MEMBER'],
    IN_PROGRESS:['WAITING_MEMBER','RESOLVED'],WAITING_MEMBER:['IN_PROGRESS','RESOLVED'],
    RESOLVED:['CLOSED','IN_PROGRESS'],CLOSED:['OPEN']
  }[t.status]||[];
  return '<div class="section-head"><div><p class="eyebrow">TIKET '+esc(t.ticket_id)+'</p><h2>'+esc(t.judul)+'</h2>'+
    '<p>'+esc(t.product_id||'Bantuan umum')+' · '+friendlyDate(t.created_at)+'</p></div>'+safeBadge(t.status)+'</div>'+
    '<div class="two-col"><section class="surface"><p class="card-kicker">LAPORAN AWAL</p><p>'+esc(t.deskripsi)+'</p>'+
    '<p class="small muted">Perangkat: '+esc(t.platform)+' · Versi: '+esc(t.versi_aplikasi||'Tidak diketahui')+
    ' · Prioritas '+esc(t.prioritas)+'</p><div class="divider"></div><h3>Aktivitas tiket</h3>'+
    '<div class="support-timeline">'+activities.map(a=>'<div class="step"><span class="step-no">'+icon(a.jenis==='BALASAN'?'user':'clock')+'</span>'+
    '<div class="step-body"><h3>'+esc(a.actor_role==='ADMIN'?'Tim dukungan':'Member')+' · '+
      esc(a.jenis)+'</h3><p>'+esc(a.pesan||supportStatusLabel(a.ke_status))+'</p>'+
      '<small class="muted">'+friendlyDate(a.created_at)+'</small></div></div>').join('')+'</div>'+
    (t.status!=='CLOSED'?'<div class="divider"></div><form id="ticket-reply-form" class="stack">'+
      '<div class="field"><label for="ticket-reply">Balas tiket</label><textarea class="input" id="ticket-reply" name="pesan" rows="3" maxlength="1500" minlength="2" required placeholder="Tulis informasi terbaru atau tanggapan Anda."></textarea></div>'+
      '<button class="btn btn-primary" type="submit" '+(!supportWriteEnabled()?'disabled':'')+'>Kirim balasan</button></form>':'<p class="muted small">Tiket telah ditutup. Buat tiket baru jika terjadi masalah lain.</p>')+
    '</section><aside class="surface"><p class="card-kicker">STATUS PENANGANAN</p><h3>'+esc(supportStatusLabel(t.status))+'</h3>'+
    '<p class="card-desc">Setiap perubahan disimpan sebagai aktivitas terpisah agar dapat ditelusuri.</p>'+
    (isAdmin()?'<div class="divider"></div><form id="ticket-status-form" class="stack">'+
      '<div class="field"><label for="ticket-next">Ubah status</label><select id="ticket-next" class="input" name="status" required>'+options.map(s=>'<option value="'+s+'">'+esc(supportStatusLabel(s))+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="ticket-note">Catatan penanganan</label><textarea id="ticket-note" name="catatan" class="input" minlength="8" maxlength="1000" rows="3" required></textarea></div>'+
      '<button class="btn btn-secondary" type="submit" '+(!supportWriteEnabled()||options.length===0?'disabled':'')+'>Simpan status</button></form>'+
      '<div class="divider"></div><form id="ticket-priority-form" class="stack">'+
      '<div class="field"><label for="ticket-priority">Prioritas bug / layanan</label><select id="ticket-priority" class="input" name="prioritas" required>'+
      ['P0','P1','P2','P3'].filter(p=>p!==t.prioritas).map(p=>'<option value="'+p+'">'+p+' — '+
        ({P0:'Kritis',P1:'Tinggi',P2:'Normal',P3:'Rendah'})[p]+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="priority-note">Alasan prioritas</label><textarea class="input" name="catatan" id="priority-note" minlength="8" maxlength="1000" rows="2" required></textarea></div>'+
      '<button class="btn btn-secondary" type="submit" '+(!supportWriteEnabled()||t.status==='CLOSED'?'disabled':'')+'>Simpan prioritas</button></form>':'')+
    '<button class="btn btn-ghost" data-route="dukungan" style="margin-top:20px">Kembali ke bantuan</button></aside></div>';
}
function viewMember360(){
  if(!isAdmin())return needLogin('profil layanan member');
  const d=state.member360;
  if(!d||d.profil?.member_id!==state.selectedMemberId)
    return title('Member 360°','PUSAT LAYANAN','Riwayat produk dan laporan member.')+
      empty('Belum ada profil dipilih','Cari member pada menu Member untuk membuka profil 360°.','member','Cari member');
  const m=d.profil,p=d.produk||[],orders=d.pesanan||[],tickets=d.tiket||[];
  return '<div class="section-head"><div><p class="eyebrow">MEMBER 360° · '+esc(m.member_id)+'</p><h2>'+esc(m.nama)+'</h2>'+
    '<p>'+esc(m.nama_usaha||'-')+' · '+esc(m.kota||'')+' · '+esc(m.wa||'')+'</p></div>'+safeBadge(m.status)+'</div>'+
    '<div class="metric-grid">'+[
      ['Produk terverifikasi',p.length],['Pesanan terbaru',orders.length],
      ['Tiket layanan',tickets.length]
    ].map(([label,value])=>'<div class="metric-card static"><strong>'+value+'</strong><small>'+label+'</small></div>').join('')+'</div>'+
    '<div class="section-gap">'+title('Hak akses produk','PRODUK MEMBER','Dihitung dari order PAID/FULFILLED dan status layanan; bukan salinan ledger baru.')+
    (p.length?'<div class="grid-2">'+p.map(x=>'<article class="surface"><p class="card-kicker">'+esc(x.tipe)+'</p><h3>'+esc(x.nama)+'</h3>'+
      safeBadge(x.akses_status)+'<p class="card-desc" style="margin-top:14px">Order: '+esc(x.order_id)+
      (x.berakhir_at?' · Berakhir '+friendlyDate(x.berakhir_at):'')+'</p></article>').join('')+'</div>':
      empty('Belum ada pembelian terverifikasi','Member belum memiliki pembelian yang berstatus PAID atau FULFILLED.'))+'</div>'+
    '<div class="grid-2 section-gap"><section>'+title('Riwayat tiket','CUSTOMER SUPPORT','')+
    (tickets.length?'<div class="stack">'+tickets.map(supportTicketCard).join('')+'</div>':empty('Belum ada tiket','Tidak ada laporan dari member ini.'))+'</section>'+
    '<section>'+title('Riwayat pesanan','PEMBELIAN','')+
    (orders.length?'<div class="surface list-rows">'+orders.map(o=>'<div class="list-row"><div><strong>'+esc(o.nama_produk||o.product_id)+'</strong>'+
      '<small>'+esc(o.order_id)+'</small></div>'+safeBadge(o.status)+'</div>').join('')+'</div>':
    empty('Belum ada pesanan','Member belum memiliki catatan order.'))+'</section></div>';
}
function viewReleases(){
  if(!logged())return needLogin('rilis produk');
  const data=state.supportReleases||[];
  return title('Riwayat Pembaruan Produk','PRODUCT RELEASES',
    isAdmin()?'Catat versi dan perubahan; publikasi hanya untuk member yang memiliki produk.':'Pembaruan resmi untuk produk yang Anda miliki.')+
    (isAdmin()?'<section class="surface" style="max-width:720px"><p class="card-kicker">CATAT RILIS</p>'+
      '<form id="release-create-form" class="stack"><div class="grid-2">'+
      '<div class="field"><label for="release-product">Produk</label><select class="input" name="product_id" id="release-product" required>'+state.catalog.map(p=>'<option value="'+esc(p.product_id)+'">'+esc(p.nama)+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="release-version">Versi baru</label><input class="input" name="versi" id="release-version" placeholder="1.2.1" pattern="v?[0-9]+\\.[0-9]+(\\.[0-9]+)?" required></div></div>'+
      '<div class="field"><label for="release-title">Judul rilis</label><input id="release-title" class="input" name="judul" required minlength="8" maxlength="120"></div>'+
      '<div class="field"><label for="release-summary">Changelog</label><textarea id="release-summary" class="input" name="ringkasan" required minlength="20" maxlength="1500" rows="4"></textarea></div>'+
      '<div class="field"><label for="release-type">Jenis pembaruan</label><select id="release-type" class="input" name="tipe_rilis"><option>PATCH</option><option>MINOR</option><option>MAJOR</option><option>NOTICE</option></select></div>'+
      '<button class="btn btn-primary" type="submit" '+(!supportWriteEnabled()?'disabled':'')+'>Simpan draft rilis</button></form>'+
      '<div class="divider"></div><p class="card-kicker">ANALISIS DAMPAK PRODUK</p>'+
      '<p class="card-desc">Hitung pembeli dan status layanan sebelum mempublikasikan changelog. Analisis ini tidak mengirim pesan.</p>'+
      '<button type="button" class="btn btn-secondary" data-impact-action="check" '+(!isConnected()?'disabled title="Fitur ini belum tersedia"':'')+'>Periksa member terdampak</button>'+
      '<div id="release-impact-slot" style="margin-top:16px" aria-live="polite"></div>'+
      '<p class="form-hint">Draft tidak terlihat oleh member sampai admin mempublikasikannya. Publikasi tidak otomatis memperbarui aplikasi POS yang terpasang.</p></section>':'')+
    '<div class="section-gap">'+title('Daftar versi','CHANGELOG','')+
    (data.length?'<div class="stack">'+data.map(item=>'<article class="surface support-release"><div class="support-ticket-head"><span class="chip">'+esc(item.tipe_rilis)+'</span>'+safeBadge(item.status)+'</div>'+
      '<h3>'+esc(item.judul)+' <span class="muted">'+esc(item.versi)+'</span></h3>'+
      '<p class="card-desc">'+esc(item.ringkasan)+'</p><p class="tiny muted">'+esc(item.product_id)+' · '+friendlyDate(item.published_at||item.created_at)+'</p>'+
      (isAdmin()&&item.status==='DRAFT'?'<button class="btn btn-secondary btn-sm" data-publish-release="'+esc(item.release_id)+'" '+(!supportWriteEnabled()?'disabled':'')+'>Publikasikan rilis</button>':'')+
      '</article>').join('')+'</div>':
      empty('Belum ada rilis','Pembaruan produk akan tampil di sini setelah diterbitkan.'))+'</div>';
}

const lmsWriteEnabled=()=>isWriteEnabled()&&config.lmsEnabled===true;
function lmsSelectedLesson_(){
  return state.lmsAdminCourse?.lessons?.find(x=>x.lesson_id===state.lmsSelectedLessonId)||null;
}
function lmsSelectedAIJob_(){
  return state.lmsJobs.find(x=>x.job_id===state.lmsSelectedAIJobId)||null;
}
let heroTimer_=null;
let heroFocused_=false;
function showHeroSlide_(index){
  if(typeof document.querySelector!=='function')return;
  const root=document.querySelector('[data-hero-carousel]');
  if(!root)return;
  const panels=Array.from(root.querySelectorAll('[data-hero-panel]'));
  if(!panels.length)return;
  const next=((Number(index)||0)%panels.length+panels.length)%panels.length;
  state.heroIndex=next;
  panels.forEach((panel,i)=>{
    panel.hidden=i!==next;
    panel.setAttribute('aria-hidden',String(i!==next));
  });
  root.querySelectorAll('[data-hero-index]').forEach((button,i)=>{
    button.setAttribute('aria-current',String(i===next));
  });
}
function syncHeroRotation_(){
  if(heroTimer_!==null){clearTimeout(heroTimer_);heroTimer_=null;}
  if(typeof document.querySelector!=='function')return;
  showHeroSlide_(state.heroIndex);
  if(state.qa||state.route!=='beranda'||isAdmin()||state.heroPaused||
     heroFocused_||document.hidden||typeof setTimeout!=='function')return;
  const root=document.querySelector('[data-hero-carousel]');
  if(!root||root.querySelectorAll('[data-hero-panel]').length<2)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  heroTimer_=setTimeout(()=>{
    heroTimer_=null;
    if(state.route==='beranda'&&!state.heroPaused&&!heroFocused_&&!document.hidden){
      showHeroSlide_(state.heroIndex+1);
    }
    syncHeroRotation_();
  },6500);
}
async function submitContentForm_(form){
  if(!isAdmin()||!contentWriteEnabled())return toast('Editor konten belum diaktifkan.',true);
  const fd=new FormData(form),id=String(form.dataset.contentId||'');
  const payload={};
  for(const key of ['kind','placement','title','description','image_path',
    'cta_label','cta_route','sort_order','start_date','end_date']){
    payload[key]=String(fd.get(key)||'').trim();
  }
  payload.sort_order=Number(payload.sort_order);
  const old=id?state.adminContent.find(x=>x.content_id===id):null;
  if(id&&!old)return toast('Konten telah berubah. Muat ulang terlebih dahulu.',true);
  if(old){payload.content_id=id;payload.revision=old.revision;}
  if(!window.NGD_CONTENT_UI?.mediaPath(payload.image_path))
    return toast('Gunakan URL HTTPS gambar atau path assets/ (PNG, JPG, WebP, AVIF).',true);
  const btn=form.querySelector('[type=submit]');
  if(btn?.disabled)return;
  if(btn)btn.disabled=true;
  const requestId=state.contentRequestId||createRequestId();
  state.contentRequestId=requestId;
  try{
    const result=await api(id?'adminUpdateContent':'adminCreateContent',payload,state.token,{write:true,requestId});
    state.contentRequestId=null;
    if(result?.item?.content_id)state.contentEditId=result.item.content_id;
    state.adminContent=await api('adminListContent',{},state.token);
    render();toast('Konten tersimpan. Publikasikan setelah file gambar tersedia.');
  }catch(e){
    toast(e.message,true);
    // Unknown network outcome: keep request ID for safe create replay.
    if(e.code!=='NETWORK_ERROR'&&e.code!=='INTERNAL')state.contentRequestId=null;
    if(btn)btn.disabled=false;
  }
}
async function changeContentStatus_(id,nextStatus){
  if(!isAdmin()||!contentWriteEnabled())return;
  const old=state.adminContent.find(x=>x.content_id===id);
  if(!old)return toast('Konten tidak ditemukan.',true);
  if(nextStatus==='PUBLISHED'&&!confirm('Pastikan gambar telah diunggah dan link gambarnya terbuka. Terbitkan konten ini?'))return;
  try{
    await api('adminSetContentStatus',{
      content_id:id,status:nextStatus,revision:old.revision
    },state.token,{write:true});
    state.adminContent=await api('adminListContent',{},state.token);
    render();toast(nextStatus==='PUBLISHED'?'Konten telah diterbitkan.':'Status konten diperbarui.');
  }catch(e){toast(e.message,true);}
}

let checkoutTimer_=null;
function syncCheckoutClock_(){
  if(checkoutTimer_!==null&&typeof clearInterval==='function'){
    clearInterval(checkoutTimer_);checkoutTimer_=null;
  }
  if(state.route!=='checkout'||typeof setInterval!=='function')return;
  const label=by('checkout-countdown');
  if(!label)return;
  const expiry=label.dataset?.expiry;
  if(!expiry)return;
  const update=()=>{
    const remaining=new Date(expiry).getTime()-Date.now();
    if(!Number.isFinite(remaining)){label.textContent='Periksa batas waktu pesanan';return;}
    const sec=Math.max(0,Math.ceil(remaining/1000));
    label.textContent='Batas pembayaran: '+String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
    if(sec===0&&checkoutTimer_!==null&&typeof clearInterval==='function'){
      clearInterval(checkoutTimer_);checkoutTimer_=null;
    }
  };
  update();checkoutTimer_=setInterval(update,1000);
}
function render(){
  // Scoped mobile visual system: preserve the admin desktop appearance.
  document.body?.classList?.toggle('member-experience',!isAdmin());
  document.body?.setAttribute?.('data-member-route',state.route);
  document.body?.setAttribute?.('data-app-role',isAdmin()?'admin':logged()?'member':'guest');
  renderNav();
  by('notice-slot').innerHTML=notice();
  const routes={
    beranda:viewHome,belajar:viewLearn,katalog:viewCatalog,ai:viewAI,affiliate:viewAffiliate,menu:viewMore,
    lms:()=>isAdmin()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.adminCatalog(state.lmsAdminCourses,lmsWriteEnabled(),state.catalog):
      needLogin('studio LMS'),
    'lms-editor':()=>isAdmin()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.adminEditor(state.lmsAdminCourse,state.lmsJobs,lmsWriteEnabled(),state.catalog):
      needLogin('workspace materi'),
    'lms-lesson':()=>isAdmin()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.lessonEditor(lmsSelectedLesson_(),lmsWriteEnabled()):
      needLogin('editor pelajaran'),
    'lms-ai':()=>isAdmin()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.aiJob(lmsSelectedAIJob_(),lmsWriteEnabled()):
      needLogin('draft AI'),
    'lms-course':()=>logged()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.memberCourse(state.lmsCourseDetail,state.lmsEnrollments,lmsWriteEnabled()):
      needLogin('ruang kelas'),
    'lms-complete':()=>logged()&&!isAdmin()&&window.NGD_LMS_UI?
      window.NGD_LMS_UI.memberSuccess(state.lmsCompletion):
      needLogin('hasil pembelajaran'),
    akun:viewAccount,login:()=>viewLogin(false),['admin-login']:()=>viewLogin(false,true),daftar:()=>viewLogin(true),
    pesanan:()=>isAdmin()?viewAdminOrders():viewMyOrders(),
    checkout:viewCheckout,admin:viewAdmin,konten:viewAdminContent,produk:viewAdminCatalog,jasa:viewServiceRequests,layanan:viewAdminServices,member:()=>viewMembers(false),antrean:()=>viewMembers(true),
    dukungan:viewSupport,tiket:viewTicketDetail,member360:viewMember360,rilis:viewReleases,pengaturan:viewAdminSettings
  };
  const screen=(routes[state.route]||viewHome)();
  by('screen').innerHTML=(!logged()&&['belajar','katalog','jasa','ai','affiliate','dukungan'].includes(state.route)?
    (window.NGD_CONTENT_UI?.cover(state.siteContent,state.route)||''):'')+screen;
  syncCheckoutClock_();
  syncHeroRotation_();
  document.title=(screens[state.route]?.[0]||'Beranda')+' — Ngulik Digital';
}
function go(route){
  if(!screens[route])route='beranda';
  state.route=route;
  if(location.hash.slice(1)!==route)history.replaceState(null,'','#'+route);
  render();window.scrollTo({top:0,behavior:'auto'});loadRoute(route);
}
async function refreshPublic(){
  if(state.qa||!isConnected())return;
  // Independent public reads must not discard a valid catalogue when the
  // metadata service is briefly unavailable (or vice versa).
  const [info,catalog,content]=await Promise.allSettled([
    api('getPublicInfo'),api('getKatalog'),api('getPublicContent')]);
  if(info.status==='fulfilled'&&info.value&&typeof info.value==='object')state.info=info.value;
  if(catalog.status==='fulfilled'&&Array.isArray(catalog.value))state.catalog=catalog.value;
  if(content.status==='fulfilled'&&Array.isArray(content.value))state.siteContent=content.value;
  render();
  if(info.status==='rejected'&&catalog.status==='rejected')
    toast('Informasi terbaru belum dapat dimuat. Coba muat ulang halaman.',true);
}
async function restoreSession(){
  if(state.qa||!isConnected()||!state.token)return;
  try{
    state.me=await api('getMe',{},state.token);
    render();
  }catch(e){
    // Network errors are not evidence that the server revoked the session.
    if(e?.code==='UNAUTHORIZED'||e?.code==='FORBIDDEN'){
      state.token='';state.me=null;sessionStorage.removeItem(tokenKey);
    }
    render();
    if(e?.code!=='UNAUTHORIZED'&&e?.code!=='FORBIDDEN')
      toast('Sesi belum dapat diperiksa. Periksa koneksi lalu muat ulang.',true);
  }
}
async function loadRoute(route){
  if(state.qa||!isConnected()||!logged())return;
  const token=state.token;
  try{
    if(route==='beranda'||route==='ai'){
      state.home=await api('getBeranda',{},token);
      if(route==='ai'){
        const data=await api('getTools',{},token);
        state.tools=data.tools||[];
      }
    }
    if(route==='belajar'){
      // Legacy modules remain usable while the new GAS LMS backend is staged.
      const responses=await Promise.allSettled([
        api('getModulBelajar',{},token),api('getLMSCatalog',{},token),
        api('getMyLMSEnrollments',{},token)
      ]);
      if(responses[0].status==='fulfilled')state.modules=responses[0].value||[];
      if(responses[1].status==='fulfilled')state.lmsCourses=responses[1].value||[];
      if(responses[2].status==='fulfilled')state.lmsEnrollments=responses[2].value||[];
    }
    if(route==='konten'&&isAdmin())state.adminContent=await api('adminListContent',{},token);
    if(route==='produk'&&isAdmin())state.adminCatalog=await api('adminListCatalog',{},token);
    if(route==='jasa'&&!isAdmin())state.services=await api('getMyServiceRequests',{},token);
    if(route==='layanan'&&isAdmin())state.services=await api('adminListServiceRequests',{},token);
    if(route==='lms'&&isAdmin())
      state.lmsAdminCourses=await api('adminListLMSCourses',{},token);
    if(route==='lms-editor'&&isAdmin()&&state.lmsSelectedCourseId){
      const [detail,jobs]=await Promise.all([
        api('adminGetLMSCourse',{course_id:state.lmsSelectedCourseId},token),
        api('adminListLMSAIJobs',{course_id:state.lmsSelectedCourseId},token)
      ]);
      state.lmsAdminCourse=detail;
      state.lmsJobs=jobs||[];
    }
    if(route==='lms-course'&&state.lmsSelectedCourseId)
      state.lmsCourseDetail=await api('getLMSCourse',
        {course_id:state.lmsSelectedCourseId},token);
    if(route==='akun'&&!isAdmin()&&config.notificationsEnabled===true)
      state.notifications=await api('getMyNotifications',{},token);
    if(route==='affiliate')state.affiliates=await api('getAffiliateDashboard',{},token);
    if(route==='pesanan'){
      if(isAdmin()){
        const [orders,review]=await Promise.all([
          api('adminListOrders',{},token),api('adminGetReconciliation',{},token)]);
        state.adminOrders=orders||[];
        state.reconciliation=review;
      }else state.orders=await api('listMyOrders',{},token);
    }
    if(route==='admin'&&isAdmin()){
      // These three independent views should never hide each other's data.
      const [dashboard,overview,runtime]=await Promise.allSettled([
        api('adminGetDashboard',{},token),api('adminGetSupportOverview',{},token),
        api('adminGetRuntimeStatus',{},token)]);
      if(dashboard.status==='fulfilled')state.adminSummary=dashboard.value;
      if(overview.status==='fulfilled')state.supportOverview=overview.value;
      if(runtime.status==='fulfilled'){
        state.adminRuntime=runtime.value;state.adminRuntimeError='';
      }else{
        state.adminRuntime=null;
        state.adminRuntimeError='Status backend tidak tersedia pada deployment Apps Script yang sedang terhubung.';
      }
      // Failed summary widgets must not prevent Admin from entering CMS,
      // catalog, LMS and service modules. Individual API write errors remain visible.
      if(dashboard.status==='rejected'&&overview.status==='rejected')
        state.adminSummary=null;
    }
    if(route==='pengaturan'&&isAdmin()){
      const [settings,runtime]=await Promise.allSettled([
        api('adminGetSettings',{},token),
        api('adminGetRuntimeStatus',{},token)
      ]);
      state.adminSettings=settings.status==='fulfilled'?settings.value:null;
      state.adminSettingsError=settings.status==='rejected'?
        (settings.reason?.message||'Pengaturan belum bisa dibaca.'):'';
      state.adminRuntime=runtime.status==='fulfilled'?runtime.value:null;
      state.adminRuntimeError=runtime.status==='rejected'?
        'Status teknis belum dapat dimuat dari deployment yang terhubung. Cek versi deployment Apps Script.':'';
    }
    if(route==='member'&&isAdmin())state.members=await api('adminListMembers',{},token);
    if(route==='antrean'&&isAdmin())state.waitlist=await api('adminListWaitingList',{},token);
    if(route==='dukungan'){
      if(isAdmin()){
        const [tickets,overview]=await Promise.all([
          api('adminListTickets',{},token),api('adminGetSupportOverview',{},token)]);
        state.adminSupportTickets=tickets||[];
        state.supportOverview=overview;
      }else{
        const [tickets,products,releases]=await Promise.all([
          api('getMyTickets',{},token),
          api('getMyProducts',{},token),
          api('getMyProductReleases',{},token)
        ]);
        state.supportTickets=tickets||[];
        state.memberProducts=products||[];
        state.supportReleases=releases||[];
      }
    }
    if(route==='tiket'&&state.selectedTicketId)
      state.ticketDetail=await api(isAdmin()?'adminGetTicket':'getTicket',
        {ticket_id:state.selectedTicketId},token);
    if(route==='member360'&&isAdmin()&&state.selectedMemberId)
      state.member360=await api('adminGetMember360',
        {member_id:state.selectedMemberId},token);
    if(route==='rilis')
      state.supportReleases=await api(isAdmin()?'adminListProductReleases':
        'getMyProductReleases',{},token);
    if(route===state.route)render();
  }catch(e){
    const label=screens[route]?.[0]||'halaman';
    const detail=e?.code==='INTERNAL'?
      'Server Apps Script mengalami kesalahan internal. Periksa menu Eksekusi pada project GAS yang sedang dipakai.':
      (e?.message||'Gagal memuat data.');
    toast('Gagal memuat '+label+': '+detail,true);
  }
}
async function handleRegistrationOtp_(action){
  const form=document.getElementById('auth-form');
  if(!form||form.dataset.mode!=='register'||!registrationOtpEnabled())
    return toast('Pendaftaran WhatsApp belum diaktifkan.',true);
  const fd=new FormData(form);
  const wa=String(fd.get('wa')||'').trim();
  const otp=String(fd.get('otp')||'').trim();
  const agreed=fd.get('setuju_kebijakan')==='on';
  const normalizedWa=wa.replace(/[ ()-]/g,'');
  if(!/^(?:0|[+]?62)[0-9]{8,13}$/.test(normalizedWa))
    return toast('Masukkan nomor WhatsApp yang valid.',true);
  if(action==='otp-request'&&!agreed)
    return toast('Persetujuan kebijakan dan pengiriman OTP diperlukan.',true);
  if(action==='otp-verify'&&!/^[0-9]{6}$/.test(otp))
    return toast('Masukkan kode OTP enam angka.',true);
  const button=form.querySelector('[data-action="'+action+'"]');
  if(button)button.disabled=true;
  try{
    if(action==='otp-request'){
      state.registrationOtpVerifiedWa='';
      await api('requestRegistrationOtp',{wa,setuju_kebijakan:agreed},'',{write:true});
      toast('Permintaan kode diterima. Periksa WhatsApp Anda.');
    }else if(action==='otp-verify'){
      const result=await api('verifyRegistrationOtp',{wa,otp},'',{write:true});
      if(result?.verified!==true)
        throw new ApiError('Verifikasi OTP belum dikonfirmasi backend.');
      state.registrationOtpVerifiedWa=wa;
      toast('Nomor WhatsApp terverifikasi. Anda dapat menyelesaikan pendaftaran.');
    }
  }catch(error){toast(error.message,true);}
  finally{if(button)button.disabled=false;}
}
async function processLogin(form,register){
  const adminMode=form.dataset.mode==='admin';
  if(!(adminMode?adminLoginEnabled():isWriteEnabled()))
    return toast(adminMode?'Login administrator belum diaktifkan.':'Layanan akun sedang tidak tersedia.',true);
  const fd=new FormData(form);
  const payload={wa:String(fd.get('wa')||''),pin:String(fd.get('pin')||'')};
  if(register){
    payload.nama=String(fd.get('nama')||'');
    payload.nama_usaha=String(fd.get('nama_usaha')||'');
    payload.setuju_kebijakan=fd.get('setuju_kebijakan')==='on';
    payload.otp=String(fd.get('otp')||'').trim();
    if(!registrationOtpEnabled())return toast('Registrasi OTP belum diaktifkan.',true);
    if(!/^[0-9]{6}$/.test(payload.otp)||state.registrationOtpVerifiedWa!==payload.wa)
      return toast('Verifikasi kode OTP WhatsApp terlebih dahulu.',true);
    const r=new URLSearchParams(location.search).get('ref');
    if(r)payload.ref=r;
  }
  const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{
    const response=await api(adminMode?'adminLogin':register?'register':'login',
      payload,'',{write:true,adminAuth:adminMode});
    const result=register?response.sesi:response;
    if(adminMode&&result?.profil?.role!=='ADMIN')
      throw new ApiError('Akses administrator ditolak.','FORBIDDEN');
    if(register&&response.status==='WAITING_LIST'){
      toast('Pendaftaran tercatat dalam waiting list.');go('beranda');return;
    }
    if(!result?.token||!result?.profil)throw new ApiError('Respons login belum lengkap.');
    state.token=result.token;state.me=result.profil;
    sessionStorage.setItem(tokenKey,result.token);
    toast('Selamat datang di Ngulik Digital.');
    const resume=(!isAdmin()&&state.pendingPurchaseId)?state.pendingPurchaseId:'';
    state.pendingPurchaseId='';
    go(isAdmin()?'admin':resume?'katalog':'beranda');
    if(resume)await buy(resume);
  }catch(e){toast(e.message,true);}finally{btn.disabled=false;}
}
async function logout(){
  const token=state.token,wasAdmin=isAdmin();
  state.token='';state.me=null;sessionStorage.removeItem(tokenKey);
  go('beranda');
  if(token&&isConnected()){
    try{await api(wasAdmin?'adminLogout':'logout',{},token,
      {write:true,adminAuth:wasAdmin});}catch{}
  }
  toast('Anda telah keluar.');
}
async function changeAdminPin_(form){
  if(!isAdmin()||!adminLoginEnabled())return toast('Perubahan PIN belum tersedia.',true);
  const fd=new FormData(form);
  const oldPin=String(fd.get('pin_lama')||''),newPin=String(fd.get('pin_baru')||'');
  const confirmation=String(fd.get('pin_konfirmasi')||'');
  if(!/^\d{6}$/.test(oldPin)||!/^\d{6}$/.test(newPin)||oldPin===newPin)
    return toast('Masukkan PIN lama dan PIN baru enam angka yang berbeda.',true);
  if(newPin!==confirmation)
    return toast('Konfirmasi PIN baru tidak sama.',true);
  const button=form.querySelector('[type=submit]');
  if(button)button.disabled=true;
  try{
    const response=await api('adminChangePin',{pin_lama:oldPin,pin_baru:newPin},
      state.token,{write:true,adminAuth:true});
    if(!response?.success||!response?.login_required)
      throw new ApiError('Konfirmasi perubahan PIN belum lengkap.');
    // Backend revokes every session on PIN change, including this device.
    state.token='';state.me=null;sessionStorage.removeItem(tokenKey);
    go('admin-login');
    toast('PIN telah diganti. Masuk lagi menggunakan PIN baru.');
  }catch(error){toast(error.message,true);if(button)button.disabled=false;}
}
async function buy(productId){
  if(!logged()){
    state.pendingPurchaseId=productId;
    go('login');toast('Masuk dengan WhatsApp terlebih dahulu untuk membeli.');return;
  }
  if(!paymentEnabled()){toast('Checkout belum aktif pada layanan yang terhubung.',true);return;}
  const product=state.catalog.find(p=>p.product_id===productId);
  if(!product)return toast('Produk tidak ditemukan.',true);
  if(!confirm('Buat pesanan '+product.nama+' seharga '+rupiah(product.harga)+'?'))return;
  try{
    const order=await api('createOrder',{product_id:productId},state.token,{write:true});
    state.lastOrder=order;go('checkout');toast('Pesanan berhasil dibuat.');
  }catch(e){toast(e.message,true);}
}
async function confirmPayment(){
  if(!state.lastOrder||!paymentEnabled()||!qrisUrl()||!config.qrisMerchant)return toast('QRIS untuk konfirmasi manual belum tersedia.',true);
  if(!confirm('Anda yakin pembayaran telah dikirim ke QRIS resmi? Konfirmasi ini bukan bukti pembayaran berhasil.'))return;
  try{
    const r=await api('confirmPayment',{order_id:state.lastOrder.order_id},state.token,{write:true});
    state.lastOrder=r;toast('Konfirmasi diterima. Menunggu pemeriksaan admin.');go('pesanan');
  }catch(e){toast(e.message,true);}
}
// A write may succeed on Apps Script even when its response is lost.
// Keep the same opaque request ID for an identical retry until confirmed.
const pendingSupportRequests = new Map();
async function submitSupportAction(form,action,payload,after){
  if(!supportWriteEnabled()){
    toast('Layanan bantuan sementara belum tersedia.',true);return;
  }
  const button=form.querySelector('[type="submit"]');
  if(button?.disabled)return;
  if(button)button.disabled=true;
  const key=JSON.stringify([action,payload]);
  const requestId=pendingSupportRequests.get(key)||createRequestId();
  pendingSupportRequests.set(key,requestId);
  let result;
  try{
    result=await api(action,payload,state.token,{write:true,requestId});
    pendingSupportRequests.delete(key);
  }catch(e){
    toast(e.message,true);
    if(e.code==='NETWORK_ERROR'||e.code==='INTERNAL'){
      toast('Hasil permintaan belum dapat dipastikan. Periksa riwayat sebelum mengirim ulang.',true);
    }else{
      pendingSupportRequests.delete(key);
    }
    return;
  }finally{
    if(button)button.disabled=false;
  }
  toast('Permintaan berhasil dicatat.');
  if(after){
    try{await after(result);}
    catch(e){toast('Data tersimpan tetapi tampilan belum dapat diperbarui.',true);}
  }
}
async function submitTicketCreate(form){
  const data=new FormData(form),payload={
    kategori:String(data.get('kategori')||''),
    product_id:String(data.get('product_id')||''),
    judul:String(data.get('judul')||''),
    deskripsi:String(data.get('deskripsi')||''),
    platform:String(data.get('platform')||''),
    versi_aplikasi:String(data.get('versi_aplikasi')||'')
  };
  await submitSupportAction(form,'createTicket',payload,async result=>{
    state.selectedTicketId=result.ticket_id;
    state.ticketDetail=null;
    go('tiket');
  });
}
async function submitTicketReply(form){
  if(!state.selectedTicketId)return;
  const data=new FormData(form);
  await submitSupportAction(form,isAdmin()?'adminReplyTicket':'replyTicket',
    {ticket_id:state.selectedTicketId,pesan:String(data.get('pesan')||'')},
    async()=>{await loadRoute('tiket');});
}
async function submitTicketStatus(form){
  if(!isAdmin()||!state.selectedTicketId)return;
  const data=new FormData(form);
  await submitSupportAction(form,'adminChangeTicketStatus',{
    ticket_id:state.selectedTicketId,
    status:String(data.get('status')||''),
    catatan:String(data.get('catatan')||'')
  },async()=>{await loadRoute('tiket');});
}
async function submitTicketPriority(form){
  if(!isAdmin()||!state.selectedTicketId)return;
  const data=new FormData(form);
  await submitSupportAction(form,'adminSetTicketPriority',{
    ticket_id:state.selectedTicketId,
    prioritas:String(data.get('prioritas')||''),
    catatan:String(data.get('catatan')||'')
  },async()=>{await loadRoute('tiket');});
}
async function submitReleaseCreate(form){
  if(!isAdmin())return;
  const data=new FormData(form);
  const payload={
    product_id:String(data.get('product_id')||''),
    versi:String(data.get('versi')||''),
    judul:String(data.get('judul')||''),
    ringkasan:String(data.get('ringkasan')||''),
    tipe_rilis:String(data.get('tipe_rilis')||'')
  };
  await submitSupportAction(form,'adminCreateProductRelease',payload,async()=>{
    form.reset();await loadRoute('rilis');
  });
}
async function submitSupportFilter(form){
  if(!isAdmin()||!isConnected()){
    toast('Penyaringan data belum tersedia.',true);return;
  }
  const data=new FormData(form),payload={
    status:String(data.get('status')||''),
    kategori:String(data.get('kategori')||''),
    product_id:String(data.get('product_id')||'')
  };
  const button=form.querySelector('[type="submit"]');
  if(button)button.disabled=true;
  try{
    state.adminSupportTickets=await api('adminListTickets',payload,state.token);
    if(state.route==='dukungan')render();
  }catch(e){toast(e.message,true);}
  finally{if(button)button.disabled=false;}
}
async function submitMemberSearch(form){
  if(!isAdmin())return;
  const data=new FormData(form),p={
    query:String(data.get('query')||'').trim(),
    product_id:String(data.get('product_id')||''),
    status:String(data.get('status')||''),
    akses_status:String(data.get('akses_status')||'')
  };
  if(!p.query&&!p.product_id&&!p.status){
    toast('Isi pencarian atau pilih salah satu filter.',true);return;
  }
  if(p.akses_status&&!p.product_id){
    toast('Pilih produk untuk menggunakan filter status layanan.',true);return;
  }
  if(!isConnected()){
    toast('Pencarian data belum tersedia.',true);
    return;
  }
  const button=form.querySelector('[type="submit"]');
  if(button)button.disabled=true;
  try{
    state.memberSearch=await api('adminSearchMembers',p,state.token);
    if(state.route==='member')render();
  }catch(e){toast(e.message,true);}
  finally{if(button)button.disabled=false;}
}
async function checkProductImpact(){
  if(!isAdmin()||!isConnected())return;
  const productId=by('release-product')?.value||'';
  const target=by('release-impact-slot');
  if(!productId||!target)return toast('Pilih produk terlebih dahulu.',true);
  target.textContent='Menghitung data pembeli dan tiket...';
  try{
    const result=await api('adminGetProductImpact',{product_id:productId},state.token);
    const status=Object.entries(result.berdasarkan_status||{});
    target.innerHTML='<div class="support-impact-summary"><h3>'+esc(result.nama)+'</h3>'+
      '<div class="support-impact-grid">'+[
        ['Pembeli terverifikasi',result.total_pembeli],
        ['Tiket belum selesai',result.tiket_terbuka],
        ['Bug terbuka',result.bug_terbuka],
        ['Prioritas P0/P1',result.prioritas_tinggi]
      ].map(([title,value])=>'<div class="stat"><strong>'+esc(value)+'</strong><small>'+esc(title)+'</small></div>').join('')+
      '</div><p class="small muted">Status layanan: '+(status.length?status.map(([key,count])=>
        esc(key)+' ('+esc(count)+')').join(' · '):'Belum ada pembeli terverifikasi')+'</p>'+
      '<p class="small muted">Data berasal dari order dan status member pada saat pemeriksaan, bukan hitungan instalasi aplikasi aktual.</p></div>';
  }catch(e){target.textContent='Analisis gagal: '+e.message;}
}
async function publishRelease(id){
  if(!isAdmin()||!supportWriteEnabled())
    return toast('Publikasi rilis belum diaktifkan.',true);
  if(!confirm('Publikasikan changelog ini kepada member pemilik produk terkait?'))return;
  try{
    await api('adminPublishProductRelease',{release_id:id},state.token,{write:true});
    toast('Rilis dipublikasikan.');
    await loadRoute('rilis');
  }catch(e){toast(e.message,true);}
}

async function submitLMSWrite(action,payload,after,form){
  if(!lmsWriteEnabled())return toast('Perubahan materi belum dapat disimpan.',true);
  const button=form?.querySelector('[type="submit"]');
  if(button?.disabled)return;
  if(button)button.disabled=true;
  const key=JSON.stringify([action,payload]);
  const requestId=pendingSupportRequests.get(key)||createRequestId();
  pendingSupportRequests.set(key,requestId);
  let result;
  try{
    result=await api(action,payload,state.token,{write:true,requestId});
    pendingSupportRequests.delete(key);
  }catch(err){
    toast(err.message,true);
    if(err.code!=='NETWORK_ERROR'&&err.code!=='INTERNAL')
      pendingSupportRequests.delete(key);
    else toast('Status penyimpanan belum pasti. Coba ulang dengan isi yang sama atau periksa data dahulu.',true);
    if(button)button.disabled=false;
    return;
  }
  if(button)button.disabled=false;
  toast('Perubahan LMS tersimpan.');
  if(after)try{await after(result);}catch(err){toast('Perubahan tersimpan, tetapi tampilan perlu dimuat ulang.',true);}
}
function lmsFormData(form){
  const d=new FormData(form);
  return Object.fromEntries([...d.entries()].map(([k,v])=>[k,String(v)]));
}
async function submitLMSCourseForm(form){
  if(!isAdmin())return;
  const isEdit=form.dataset.editMode==='edit';
  const data=lmsFormData(form),course=state.lmsAdminCourse?.course;
  const payload={...data};
  if(isEdit){
    if(!course)return toast('Muat ulang workspace sebelum menyunting.',true);
    payload.course_id=course.course_id;
    payload.expected_version=course.version;
  }
  await submitLMSWrite(isEdit?'adminUpdateLMSCourse':'adminCreateLMSCourse',payload,
    async r=>{
      if(!isEdit)state.lmsSelectedCourseId=r.course_id;
      state.lmsAdminCourse=null;
      go('lms-editor');
    },form);
}
async function submitLMSLessonForm(form){
  if(!isAdmin())return;
  const isEdit=form.dataset.editMode==='edit';
  const data=lmsFormData(form),current=lmsSelectedLesson_();
  const payload={...data};
  if(isEdit){
    if(!current)return toast('Pilih pelajaran yang akan disunting.',true);
    payload.lesson_id=current.lesson_id;
    payload.expected_version=current.version;
  }else payload.course_id=state.lmsSelectedCourseId;
  await submitLMSWrite(isEdit?'adminUpdateLMSLesson':'adminCreateLMSLesson',
    payload,async()=>{
      state.lmsSelectedLessonId=null;
      go('lms-editor');
    },form);
}
async function submitLMSAIForm(form){
  if(!isAdmin()||!state.lmsSelectedCourseId)return;
  await submitLMSWrite('adminPrepareLMSAIJob',{
    ...lmsFormData(form),course_id:state.lmsSelectedCourseId
  },async()=>{form.reset();await loadRoute('lms-editor');},form);
}
async function submitLMSAIResult(form){
  if(!isAdmin()||!state.lmsSelectedAIJobId)return;
  const data=lmsFormData(form);
  await submitLMSWrite('adminImportLMSAIResult',{
    job_id:state.lmsSelectedAIJobId,result_draft:data.result_draft
  },async()=>{await loadRoute('lms-editor');go('lms-ai');},form);
}
async function lmsButtonAction(button){
  const action=button.dataset.lmsAction;
  const courseId=button.dataset.courseId||state.lmsSelectedCourseId;
  const lessonId=button.dataset.lessonId||state.lmsSelectedLessonId;
  if(action==='open-course'){
    state.lmsSelectedCourseId=courseId;
    if(isAdmin()){
      if(isConnected())state.lmsAdminCourse=null;
      go('lms-editor');
    }else{
      if(isConnected())state.lmsCourseDetail=null;
      go('lms-course');
    }
    return;
  }
  if(action==='edit-lesson'){
    if(!isAdmin())return;
    state.lmsSelectedLessonId=lessonId;
    go('lms-lesson');return;
  }
  if(action==='open-job'){
    if(!isAdmin())return;
    state.lmsSelectedAIJobId=button.dataset.jobId;
    go('lms-ai');return;
  }
  if(action==='copy-ai-prompt'){
    const prompt=lmsSelectedAIJob_()?.prompt||'';
    if(!prompt)return;
    try{await navigator.clipboard.writeText(prompt);toast('Prompt tersalin. Jangan sertakan data pribadi saat digunakan.');}
    catch{toast('Gagal menyalin. Periksa izin clipboard browser.',true);}
    return;
  }
  if(!lmsWriteEnabled())return toast('Fitur LMS belum aktif untuk penulisan.',true);
  const map={
    'publish-course':['adminPublishLMSCourse',{course_id:courseId}],
    'archive-course':['adminArchiveLMSCourse',{course_id:courseId,confirm_archive:true}],
    'restore-course':['adminRestoreLMSCourse',{course_id:courseId,confirm_restore:true}],
    'publish-lesson':['adminPublishLMSLesson',{lesson_id:lessonId}],
    'archive-lesson':['adminArchiveLMSLesson',{lesson_id:lessonId,confirm_archive:true}],
    'restore-lesson':['adminRestoreLMSLesson',{lesson_id:lessonId,confirm_restore:true}],
    'enroll':['enrollLMSCourse',{course_id:courseId}],
    'complete':['completeLMSLesson',{lesson_id:lessonId}],
    'approve-ai':['adminReviewLMSAIJob',{job_id:state.lmsSelectedAIJobId,decision:'APPROVED'}],
    'reject-ai':['adminReviewLMSAIJob',{job_id:state.lmsSelectedAIJobId,decision:'REJECTED'}]
  };
  const x=map[action];
  if(!x)return;
  if(['archive-course','archive-lesson','restore-course','restore-lesson',
      'publish-course'].includes(action)&&
     !confirm('Lanjutkan tindakan '+action+'? Riwayat peserta tidak dihapus.'))return;
  await submitLMSWrite(x[0],x[1],async()=>{
    if(action==='enroll'){
      state.lmsEnrollments=await api('getMyLMSEnrollments',{},state.token);
      await loadRoute('lms-course');
    }else if(action==='complete'){
      const lesson=state.lmsCourseDetail?.lessons?.find(l=>l.lesson_id===lessonId);
      await loadRoute('lms-course');
      state.lmsCompletion={
        title:lesson?.title||'Pelajaran',
        completed:state.lmsCourseDetail?.completed??0,
        total:state.lmsCourseDetail?.total??0,
        preview:false
      };
      go('lms-complete');
    }else if(action==='approve-ai'||action==='reject-ai'){
      await loadRoute('lms-editor');go('lms-ai');
    }else await loadRoute('lms-editor');
  });
}

async function submitCatalogForm(form){
  if(!isAdmin()||!catalogWriteEnabled())return toast('Perubahan katalog belum diaktifkan.',true);
  const current=adminCatalogItems().find(x=>x.product_id===form.dataset.productId)||null;
  if(form.dataset.productId&&!current)return toast('Produk telah berubah. Muat ulang katalog.',true);
  const fd=new FormData(form);
  const payload={
    nama:String(fd.get('nama')||''),
    deskripsi:String(fd.get('deskripsi')||''),
    tipe:current?current.tipe:String(fd.get('tipe')||''),
    harga:Number(fd.get('harga')),
    kredit_diberikan:Number(fd.get('kredit_diberikan')),
    durasi_hari:Number(fd.get('durasi_hari')),
    urut:Number(fd.get('urut')),
    perlu_approval_admin:fd.has('perlu_approval_admin'),
    bisa_komisi:fd.has('bisa_komisi'),
    komisi_persen:fd.get('komisi_persen')===''?'':Number(fd.get('komisi_persen')),
    sumber_produk:String(fd.get('sumber_produk')||'INTERNAL').trim()
  };
  if(current){payload.product_id=current.product_id;payload.revision=current.revision;}
  const requestId=current?createRequestId():(state.catalogRequestId||createRequestId());
  if(!current)state.catalogRequestId=requestId;
  const btn=form.querySelector('[type=submit]');
  btn.disabled=true;
  let saved;
  try{
    saved=await api(current?'adminUpdateCatalogItem':'adminCreateCatalogItem',
      payload,state.token,{write:true,requestId});
    if(!saved?.item?.product_id)throw new ApiError('Respons katalog tidak lengkap.');
  }catch(error){
    btn.disabled=false;toast(error.message,true);return;
  }
  // A committed write must not be reported as failed just because refresh failed.
  state.catalogRequestId=null;
  state.catalogEditId=saved.item.product_id;
  toast(current?'Penawaran diperbarui.':'Produk dibuat nonaktif. Periksa sebelum mengaktifkan.');
  try{
    state.adminCatalog=await api('adminListCatalog',{},state.token);
    const catalog=await api('getKatalog');
    state.catalog=catalog||[];
  }catch(error){toast('Perubahan tersimpan, tetapi data terbaru belum termuat. Muat ulang halaman.',true);}
  render();
}
async function toggleCatalogItem(id){
  if(!isAdmin()||!catalogWriteEnabled())return;
  const current=adminCatalogItems().find(x=>x.product_id===id);
  if(!current)return toast('Produk tidak ditemukan.',true);
  const next=!current.aktif;
  if(typeof window.confirm==='function'&&!window.confirm(
    (next?'Tampilkan ':'Sembunyikan ')+current.nama+' dalam katalog publik?'))return;
  try{
    const saved=await api('adminSetCatalogActive',{
      product_id:current.product_id,aktif:next,revision:current.revision
    },state.token,{write:true});
    if(!saved?.item)throw new ApiError('Respons katalog tidak lengkap.');
    toast(next?'Produk ditampilkan di katalog.':'Produk disembunyikan dari katalog.');
    try{
      state.adminCatalog=await api('adminListCatalog',{},state.token);
      state.catalog=await api('getKatalog');
    }catch(error){toast('Status tersimpan, tetapi pembaruan layar gagal. Muat ulang halaman.',true);}
    render();
  }catch(error){toast(error.message,true);}
}
async function submitServiceBrief(form){
  if(!logged()||isAdmin()||!serviceWriteEnabled())
    return toast('Penerimaan brief belum diaktifkan.',true);
  const fd=new FormData(form);
  const kind=String(fd.get('jenis_layanan')||'');
  const payload={
    jenis_layanan:kind,
    product_id:kind==='VIDEO_AI'?'P-VIDEO-AI':'',
    judul:String(fd.get('judul')||''),
    brief:String(fd.get('brief')||''),
    referensi_url:String(fd.get('referensi_url')||''),
    anggaran:Number(fd.get('anggaran'))
  };
  if(!Number.isSafeInteger(payload.anggaran)||payload.anggaran<0)
    return toast('Anggaran harus berupa bilangan bulat positif atau 0.',true);
  const requestId=state.serviceRequestId||createRequestId();
  state.serviceRequestId=requestId;
  const button=form.querySelector('[type=submit]');
  button.disabled=true;
  let saved;
  try{
    saved=await api('submitServiceBrief',payload,state.token,{write:true,requestId});
    if(!saved?.item?.service_id)throw new ApiError('Respons layanan tidak lengkap.');
  }catch(error){button.disabled=false;toast(error.message,true);return;}
  state.serviceRequestId=null;
  toast(saved.already_submitted?'Permintaan sudah tercatat.':'Brief berhasil dikirim untuk ditinjau.');
  try{state.services=await api('getMyServiceRequests',{},state.token);}
  catch(error){toast('Brief tersimpan, tetapi riwayat belum dapat dimuat.',true);}
  render();
}
async function submitServiceQuote(form){
  if(!isAdmin()||!serviceWriteEnabled())return toast('Penawaran belum diaktifkan.',true);
  const current=state.services.find(x=>x.service_id===form.dataset.serviceId);
  if(!current)return toast('Permintaan tidak ditemukan. Muat ulang halaman.',true);
  const fd=new FormData(form);
  const payload={
    service_id:current.service_id,
    expected_revision:current.revision,
    status:String(fd.get('status')||''),
    penawaran_harga:Number(fd.get('penawaran_harga')),
    penawaran_pesan:String(fd.get('penawaran_pesan')||''),
    catatan_internal:String(fd.get('catatan_internal')||'')
  };
  const button=form.querySelector('[type=submit]');
  button.disabled=true;
  let response;
  try{
    response=await api('adminUpdateServiceQuote',payload,state.token,{write:true});
    if(!response?.item?.service_id)throw new ApiError('Respons penawaran tidak lengkap.');
  }catch(error){button.disabled=false;toast(error.message,true);return;}
  toast(response.updated?'Penawaran berhasil disimpan.':'Tidak ada perubahan.');
  try{state.services=await api('adminListServiceRequests',{},state.token);}
  catch(error){toast('Perubahan tersimpan, tetapi antrean gagal dimuat.',true);}
  render();
}
document.addEventListener('input',(e)=>{
  if(!e.target||e.target.id!=='home-search')return;
  const q=e.target.value.trim().toLowerCase();let shown=0;
  document.querySelectorAll('.nh-home [data-search]').forEach(el=>{
    const hit=!q||el.getAttribute('data-search').includes(q);el.hidden=!hit;if(hit)shown++;
  });
  const none=by('nh-empty');if(none)none.hidden=shown>0;
});
document.addEventListener('visibilitychange',syncHeroRotation_);
document.addEventListener('focusin',e=>{
  if(e.target.closest?.('[data-hero-carousel]')){heroFocused_=true;syncHeroRotation_();}
});
document.addEventListener('focusout',e=>{
  if(e.target.closest?.('[data-hero-carousel]')){heroFocused_=false;syncHeroRotation_();}
});
function filterLearningCards_(){
  const root=document.querySelector('.learning-dashboard');
  if(!root)return;
  const selected=root.querySelector('[data-lms-filter][aria-pressed="true"]')?.dataset.lmsFilter||'all';
  const query=(root.querySelector('#learning-course-search')?.value||'').trim().toLocaleLowerCase('id-ID');
  let count=0;
  root.querySelectorAll('.learning-course-grid .lms-course-tile').forEach(card=>{
    const matches=(selected==='all'||card.dataset.courseState===selected)&&
      (!query||(card.dataset.courseSearch||'').includes(query));
    card.hidden=!matches;if(matches)count++;
  });
  const notice=root.querySelector('.learning-filter-empty');
  if(notice)notice.hidden=count>0;
}
function selectLearningLesson_(index){
  const root=document.querySelector('.learning-reader-layout');
  if(!root||!Number.isSafeInteger(index)||index<0)return;
  const panel=root.querySelector('[data-lms-panel="'+index+'"]');
  if(!panel)return;
  root.querySelectorAll('[data-lms-panel]').forEach(el=>{el.hidden=el!==panel;});
  root.querySelectorAll('[data-lms-lesson-open]').forEach(btn=>{
    const active=Number(btn.dataset.lmsLessonOpen)===index;
    btn.classList.toggle('is-current',active);
    if(active)btn.setAttribute('aria-current','step');
    else btn.removeAttribute('aria-current');
  });
  const title=panel.querySelector('h3');
  if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
}
document.addEventListener('input',e=>{
  if(e.target.id==='learning-course-search')filterLearningCards_();
});
document.addEventListener('click',async(e)=>{
  const target=e.target.closest('[data-public-step],[data-ai-select],[data-hero-step],[data-hero-index],[data-hero-pause],[data-content-new],[data-content-edit],[data-content-status],[data-service-id],[data-service-go],[data-catalog-edit],[data-catalog-active],[data-route],[data-buy],[data-catalog-filter],[data-catalog-go],[data-action],[data-copy],[data-ticket-id],[data-member-id],[data-publish-release],[data-impact-action],[data-lms-action],[data-lms-filter],[data-lms-lesson-open],[data-lms-next]');
  if(!target)return;
  if(target.hasAttribute('data-public-step')){
    const step=Number(target.dataset.publicStep);
    if(Number.isInteger(step)&&step>=0&&step<3){state.publicStep=step;render();}
  }
  else if(target.hasAttribute('data-ai-select')){
    if(!logged()||isAdmin())return;
    const tool=state.tools.find(x=>x.tool_id===target.dataset.aiSelect);
    if(tool){state.selectedAiToolId=tool.tool_id;render();}
  }
  else if(target.hasAttribute('data-hero-step')){
    showHeroSlide_(state.heroIndex+Number(target.dataset.heroStep||1));syncHeroRotation_();
  }else if(target.hasAttribute('data-hero-index')){
    showHeroSlide_(Number(target.dataset.heroIndex));syncHeroRotation_();
  }else if(target.hasAttribute('data-hero-pause')){
    state.heroPaused=!state.heroPaused;
    target.setAttribute('aria-pressed',String(state.heroPaused));
    target.textContent=state.heroPaused?'Lanjutkan':'Jeda';syncHeroRotation_();
  }else if(target.hasAttribute('data-content-new')){
    if(!isAdmin())return;
    state.contentEditId='';state.contentRequestId=null;render();
  }else if(target.hasAttribute('data-content-edit')){
    if(!isAdmin())return;
    state.contentEditId=target.dataset.contentEdit;state.contentRequestId=null;render();
    document.getElementById('content-editor-form')?.scrollIntoView?.({block:'nearest'});
  }else if(target.hasAttribute('data-content-status')){
    await changeContentStatus_(target.dataset.contentId,target.dataset.contentStatus);
  }else if(target.hasAttribute('data-service-id')){
    if(!isAdmin())return;
    state.selectedServiceId=target.dataset.serviceId;
    render();
  }
  else if(target.hasAttribute('data-service-go')){
    state.serviceKind='VIDEO_AI';
    go('jasa');
  }
  else if(target.hasAttribute('data-catalog-edit')){
    if(!isAdmin())return;
    state.catalogEditId=target.dataset.catalogEdit;
    state.catalogRequestId=null;
    render();
    document.getElementById('admin-catalog-form')?.scrollIntoView({block:'nearest'});
  }
  else if(target.hasAttribute('data-catalog-active'))await toggleCatalogItem(target.dataset.catalogActive);
  else if(target.dataset.action==='catalog-new'){
    if(!isAdmin())return;
    state.catalogEditId='';state.catalogRequestId=null;render();
  }
  else if(target.hasAttribute('data-lms-filter')){
    const group=target.closest('.learning-filter-group');
    if(group){
      group.querySelectorAll('[data-lms-filter]').forEach(btn=>
        btn.setAttribute('aria-pressed',String(btn===target)));
      filterLearningCards_();
    }
  }
  else if(target.hasAttribute('data-lms-lesson-open'))
    selectLearningLesson_(Number(target.dataset.lmsLessonOpen));
  else if(target.hasAttribute('data-lms-next'))
    selectLearningLesson_(Number(target.dataset.lmsNext));
  else if(target.hasAttribute('data-lms-action'))await lmsButtonAction(target);
  else if(target.hasAttribute('data-catalog-go')){
    state.catalogFilter=target.dataset.catalogGo;
    go('katalog');
  }
  else if(target.hasAttribute('data-catalog-filter')){
    if(!offerCategories.some(([id])=>id===target.dataset.catalogFilter))return;
    state.catalogFilter=target.dataset.catalogFilter;
    if(state.route!=='katalog')go('katalog');else render();
  }
  else if(target.hasAttribute('data-route'))go(target.dataset.route);
  else if(target.hasAttribute('data-ticket-id')){
    state.selectedTicketId=target.dataset.ticketId;
    if(isConnected())state.ticketDetail=null;
    go('tiket');
  }else if(target.hasAttribute('data-member-id')){
    if(!isAdmin())return;
    state.selectedMemberId=target.dataset.memberId;
    if(isConnected())state.member360=null;
    go('member360');
  }else if(target.hasAttribute('data-publish-release')){
    await publishRelease(target.dataset.publishRelease);
  }else if(target.hasAttribute('data-impact-action')){
    await checkProductImpact();
  }else if(target.hasAttribute('data-buy'))await buy(target.dataset.buy);
  else if(target.dataset.action==='notification-read'){
    if(!logged()||isAdmin()||config.notificationsEnabled!==true||!isWriteEnabled())return;
    target.disabled=true;
    try{
      await api('markNotificationRead',{notification_id:target.dataset.notificationId},state.token,{write:true});
      state.notifications=await api('getMyNotifications',{},state.token);
      render();
    }catch(error){toast(error.message,true);target.disabled=false;}
  }
  else if(target.dataset.action==='otp-request'||target.dataset.action==='otp-verify')
    await handleRegistrationOtp_(target.dataset.action);
  else if(target.dataset.action==='logout')await logout();
  else if(target.dataset.action==='confirm-payment')await confirmPayment();
  else if(target.dataset.copy){
    try{await navigator.clipboard.writeText(target.dataset.copy);toast('Tersalin.');}
    catch{toast('Gagal menyalin. Silakan gunakan browser HTTPS.',true);}
  }
});
async function submitProfileForm(form){
  if(!logged()||isAdmin()||!isWriteEnabled())return toast('Perubahan profil belum diaktifkan.',true);
  const fd=new FormData(form),payload={};
  ['nama','nama_usaha','jenis_usaha','kota','deskripsi_usaha','instagram'].forEach(k=>{
    payload[k]=String(fd.get(k)||'');
  });
  const btn=form.querySelector('[type=submit]');
  btn.disabled=true;
  try{
    const response=await api('updateMyProfile',payload,state.token,{write:true});
    if(!response||!response.profil)throw new ApiError('Respons profil tidak lengkap.');
    state.me=response.profil;
    render();
    toast(response.updated?'Profil berhasil diperbarui.':'Tidak ada perubahan profil.');
  }catch(error){btn.disabled=false;toast(error.message,true);}
}
document.addEventListener('submit',(e)=>{
  const id=e.target.id||(e.target.classList?.contains('ai-form')?'ai-run-form':'');
  if(!['admin-pin-form','content-editor-form','service-brief-form','service-quote-form','admin-catalog-form','profile-form','auth-form','support-create-form','ticket-reply-form',
    'ticket-status-form','ticket-priority-form','release-create-form','member-search-form','support-filter-form',
    'lms-course-form','lms-lesson-form','lms-ai-form','lms-ai-result-form','ai-run-form'].includes(id))return;
  e.preventDefault();
  if(id==='admin-pin-form')changeAdminPin_(e.target);
  if(id==='content-editor-form')submitContentForm_(e.target);
  if(id==='service-brief-form')submitServiceBrief(e.target);
  if(id==='service-quote-form')submitServiceQuote(e.target);
  if(id==='admin-catalog-form')submitCatalogForm(e.target);
  if(id==='profile-form')submitProfileForm(e.target);
  if(id==='auth-form')processLogin(e.target,e.target.dataset.mode==='register');
  if(id==='support-create-form')submitTicketCreate(e.target);
  if(id==='ticket-reply-form')submitTicketReply(e.target);
  if(id==='ticket-status-form')submitTicketStatus(e.target);
  if(id==='ticket-priority-form')submitTicketPriority(e.target);
  if(id==='release-create-form')submitReleaseCreate(e.target);
  if(id==='member-search-form')submitMemberSearch(e.target);
  if(id==='support-filter-form')submitSupportFilter(e.target);
  if(id==='lms-course-form')submitLMSCourseForm(e.target);
  if(id==='lms-lesson-form')submitLMSLessonForm(e.target);
  if(id==='lms-ai-form')submitLMSAIForm(e.target);
  if(id==='lms-ai-result-form')submitLMSAIResult(e.target);
  if(id==='ai-run-form')submitAITool(e.target);
});
by('mobile-back').addEventListener('click',()=>{
  const back={
    'lms-course':'belajar','lms-complete':'lms-course',
    tiket:'dukungan',checkout:'katalog',
    'lms-editor':'lms','lms-lesson':'lms-editor','lms-ai':'lms-editor',
    member360:'member'
  };
  go(back[state.route]||'beranda');
});
by('account-button').addEventListener('click',()=>go('akun'));
window.addEventListener('hashchange',()=>go(location.hash.slice(1)||'beranda'));
async function init(){
  state.route=screens[location.hash.slice(1)]?location.hash.slice(1):'beranda';
  state.catalog=[];
  if(!activatePreview()){
    state.info=null;
    render();
    await Promise.all([refreshPublic(),restoreSession()]);
    loadRoute(state.route);
  }else render();
}
init();
